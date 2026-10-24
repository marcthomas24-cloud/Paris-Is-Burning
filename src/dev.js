// Developer helpers, loaded only with ?dev in the URL. Lets automated tests
// step the simulation deterministically when the tab is not animating.
//  ?dev&level=2         start in Level 2 (ignores the unlock)
//  ?dev&level=2&stage=3 start Level 2 at section 3
//  ?seed=N              seeded run: __start({ audio: false }) then __step / __botRun replay exactly
import { LEVELS, Progress } from './levels.js';
import { randomOutfit } from './characters.js';
import { mulberry } from './textures.js';
import { reseed, SEED } from './seed.js';
import { lintBoss, ENFORCER, LEADER } from './boss.js';
import { installTests } from './devtests.js';

export function installDev(game) {
  installTests(game); // regression and fairness checks (devtests.js)
  // Fixed-step simulation. The first call hands the simulation to the harness:
  // the real-time loop then only renders (see Game.frame), so runs are reproducible.
  window.__step = (sec, fn) => {
    game.manualStep = true;
    const n = Math.round(sec * 60);
    for (let i = 0; i < n; i++) { if (fn) fn(i); if (game.state === 'playing') game.update(1 / 60); game.input.endFrame(); }
    game.renderer.shadowMap.needsUpdate = true;
    game.render();
  };
  // __start({ audio, seed }). With a seed (or ?seed=N) the run is reproducible: the menu's
  // background simulation has already consumed random numbers and moved people for a
  // variable number of frames, so every random stream and the simulation are reset here.
  window.__start = (opts = {}) => {
    if (opts.audio !== false) game.audio.init();
    game.play(); game._dismissOnboarding();
    const seed = opts.seed ?? SEED;
    if (seed !== null && seed !== undefined) {
      game.manualStep = true;
      reseed(seed);
      game.crowd.rng = mulberry(seed + 4242);
      game.time = 0;
      game.crowd.maxSkinned = 20;
      game.effects.emitAcc = 0; game.effects.smoke.clear();
      game.restart();
    }
  };
  window.__live = () => { game.manualStep = false; }; // give the simulation back to the real-time loop
  // levels and progression
  window.__level = (id, stage = null) => { if (!LEVELS[id]) return 'no such level'; game.devStage = stage; game.setLevel(id); game.restart(); return { level: id, stage }; };
  window.__jump = (i) => { if (!game.missions.jumpTo) return 'this level has no sections'; game.missions.jumpTo(i); return game.missions.section; };
  window.__unlock = (id = 2) => { Progress.unlock(id); game._syncLevelMenu(); return Progress.unlocked(id); };
  window.__resetProgress = () => { Progress.reset(); game._syncLevelMenu(); return Progress.unlocked(2); };
  // bosses: jump to a fight, land a hit through the real hit path, check the fairness rules
  window.__boss = (name = 'enforcer') => window.__level(2, name === 'leader' ? 4 : 2);
  window.__bossHit = (from = 'back') => {
    const b = game.missions.boss; if (!b) return 'no boss';
    const n = b.n, f = from === 'back' ? -1.6 : 1.6;
    const pos = n.pos.clone().add({ x: Math.sin(n.heading) * f, y: 0, z: Math.cos(n.heading) * f });
    const dir = n.pos.clone().sub(pos).setY(0).normalize();
    return { result: game.crowd.onBatonHit(n, dir, pos), hp: b.hp, phase: b.phaseIdx + 1, state: b.s };
  };
  window.__lintBosses = () => ({ enforcer: lintBoss(ENFORCER), leader: lintBoss(LEADER) });
  // line up a few agents in front of the camera for inspection
  window.__studio = (filter, z = 156, n = 4) => {
    const list = game.crowd.npcs.filter(filter).slice(0, n);
    list.forEach((a, i) => { a.pos.set(-3 + i * 2, 0, z); a.anchor.copy(a.pos); a.state = 'act'; a.st = 0; a.dur = 99; a.lookT = 99; a.focus.set(0, 0, 175); });
    game.player.pos.set(0.6, 0, z + 4); game.player.heading = Math.PI; game.cameraRig.yaw = 0; game.cameraRig.pitch = -0.06;
    return list.map((a) => [a.id, a.rig.kind, a.role]);
  };
  // A simple test bot that plays with normal controls only (no teleporting):
  // chases the nearest active threat, otherwise follows the objective marker,
  // arrests downed aggressors and extracts the officers at the end.
  window.__bot = { log: [], stuckT: 0, side: 1, last: null };
  window.__botTick = () => {
    const g = game, I = g.input, m = g.missions, B = window.__bot, p = g.player.pos;
    // the page pauses itself on blur / visibility / pointer-lock loss; the bot carries on
    if (g.state === 'paused') { g._screen(null); g.state = 'playing'; g.audio.setPaused(false); B.pauses = (B.pauses || 0) + 1; }
    I.keys.clear(); I.buttons.clear();
    // cinematics: skipped with a key press (set __bot.watch = true to let them play)
    if (g.cinematic && !B.watch) { I.edges.add('Enter'); window.__step(0.1); return; }
    const threat = g.crowd.nearest(p, (n) => g.crowd.isThreat(n) || (n.script && n.script.active), m.stage === 'p3' ? 12 : 30);
    let goal = null, fight = false;
    if (threat) { goal = threat.pos; fight = true; } else if (m.markerPos) goal = m.markerPos;
    if (g.crowd.arrestable(p) && !threat) I.edges.add('KeyE');
    if (m.boss && m.boss.s === 'defeated') { goal = m.boss.n.pos; fight = false; if (p.distanceTo(goal) < 2.4) I.edges.add('KeyE'); }
    if (m.stage === 'final' && m.extractReady && Math.hypot(p.x + 3, p.z + 112) < 4) I.edges.add('KeyE');
    if (goal) {
      const dx = goal.x - p.x, dz = goal.z - p.z, d = Math.hypot(dx, dz);
      g.cameraRig.yaw = Math.atan2(-dx, -dz) + (B.stuckT > 0.6 ? B.side * 0.9 : 0);
      // bosses: react to what can be seen (wind-up pose and ring, charge, opening), never to
      // whether a wind-up is a feint; block blockable attacks, dodge sideways out of heavy ones
      const bs = fight && threat.boss;
      // shields: raise the shield, close in and wait for the bash; strike once it is lowered
      const guarded = fight && threat.attackStyle === 'shield' && g.crowd.guards(threat, p);
      if (bs && bs.active) {
        const a = bs.cur, s = bs.s, side = B.side > 0 ? 'KeyD' : 'KeyA';
        const dodge = () => { if (B.lastDodged !== a) { B.lastDodged = a; I.keys.add(side); I.edges.add('Space'); B.side *= -1; B.dodges = (B.dodges || 0) + 1; } };
        if (s === 'rec' || s === 'stun') { if (d < 1.9) I.edges.add('Mouse0'); else { I.keys.add('KeyW'); if (d > 3) I.keys.add('ShiftLeft'); } }
        else if (s === 'wind' && a) {
          if (a.blockable) { I.buttons.add(2); if (d > 2.0) I.keys.add('KeyW'); }
          else if (a.kind === 'charge') I.buttons.add(2); // wait for the launch: the charge aims as the wind-up ends
          else if (d < a.range + 0.7 && bs.t > a.wind - 0.25) dodge();
          else I.buttons.add(2);
        }
        else if (s === 'charge') { if (d < 4.2) dodge(); }
        else if (s === 'transition') I.keys.add('KeyS');
        else { I.buttons.add(2); if (d > 2.3) I.keys.add('KeyW'); }
      }
      else if (guarded && d < 3.5) { I.buttons.add(2); if (d > 1.7) I.keys.add('KeyW'); }
      else if (fight && d < 1.8) I.edges.add('Mouse0'); else { I.keys.add('KeyW'); if (d > 6) I.keys.add('ShiftLeft'); if (B.strafeT > 0) { B.strafeT -= 0.1; I.keys.add(B.side > 0 ? 'KeyD' : 'KeyA'); I.keys.delete('KeyW'); } }
      const before = p.clone();
      window.__step(0.1);
      if (p.distanceTo(before) < 0.05 && !(fight && d < 1.8)) { B.stuckT += 0.1; if (B.stuckT > 1.2) { B.stuckT = 0; B.side *= -1; B.strafeT = 1.6; } } else B.stuckT = Math.max(0, B.stuckT - 0.05);
    } else window.__step(0.1);
    if (B.last !== m.stage) { B.log.push([m.stage, +m.t.toFixed(1)]); B.last = m.stage; }
  };
  window.__botRun = (ms = 20000) => {
    const t0 = performance.now(); let i = 0;
    while (performance.now() - t0 < ms && !game.missions.ended) { window.__botTick(); i++; }
    const m = game.missions;
    return { ticks: i, log: window.__bot.log, t: +m.t.toFixed(1), stage: m.stage, hp: +game.player.health.toFixed(0), score: m.score, ended: m.ended, state: game.state };
  };

  // Audio probe: taps the mix before and after the limiter and reports, per second,
  // RMS and peak level (dBFS), clipped samples and the voices playing.
  window.__audioProbe = (seconds = 10) => new Promise((resolve) => {
    const a = game.audio, c = a.ctx;
    if (!c) return resolve({ error: 'audio not initialised' });
    const tap = (node) => {
      const sp = c.createScriptProcessor(4096, 2, 1), acc = { sum: 0, n: 0, peak: 0, clip: 0 };
      sp.onaudioprocess = (e) => {
        for (let ch = 0; ch < e.inputBuffer.numberOfChannels; ch++) {
          const d = e.inputBuffer.getChannelData(ch);
          for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); acc.sum += v * v; acc.n++; if (v > acc.peak) acc.peak = v; if (v >= 0.999) acc.clip++; }
        }
      };
      const mute = c.createGain(); mute.gain.value = 0;
      node.connect(sp); sp.connect(mute).connect(c.destination);
      return { sp, acc };
    };
    const pre = tap(a.makeup), post = tap(a.limiter);
    const dB = (v) => (v > 0 ? +(20 * Math.log10(v)).toFixed(1) : -120);
    const rows = [];
    let k = 0;
    const iv = setInterval(() => {
      const row = { s: ++k, rms: dB(Math.sqrt(post.acc.sum / Math.max(1, post.acc.n))), peak: dB(post.acc.peak), clip: post.acc.clip, prePeak: dB(pre.acc.peak), voices: a.stats().cats, sirens: a.vehicles.length };
      rows.push(row);
      for (const t of [pre, post]) Object.assign(t.acc, { sum: 0, n: 0, peak: 0, clip: 0 });
      if (k >= seconds) { clearInterval(iv); for (const t of [pre, post]) t.sp.disconnect(); resolve(rows); }
    }, 1000);
  });

  // count how often each sound is requested and how often the voice limiter admits it
  window.__audioEvents = (seconds = 30) => new Promise((resolve) => {
    const a = game.audio, counts = {}, admitted = {};
    const names = ['explosion', 'molotov', 'glass', 'impact', 'swing', 'shout', 'chant', 'whistle', 'roar', 'crash', 'shutter', 'firework', 'distantBang', 'footstep', 'hurt', 'thump', 'adhan', 'alarm', 'scream'];
    const orig = {};
    for (const n of names) { orig[n] = a[n]; a[n] = function (...args) { counts[n] = (counts[n] || 0) + 1; return orig[n].apply(this, args); }; }
    const admit = a._admit;
    a._admit = function (cat, level) { const v = admit.call(this, cat, level); if (v) admitted[cat] = (admitted[cat] || 0) + 1; return v; };
    setTimeout(() => { for (const n of names) a[n] = orig[n]; a._admit = admit; resolve({ seconds, requested: counts, admitted }); }, seconds * 1000);
  });

  // Frame cost split into simulation and rendering. renderer.info is accumulated over
  // all post-processing passes (the composer resets it per pass), and gl.finish() makes
  // the GPU time count. `programs` is the number of compiled shader programs.
  window.__perf = (frames = 60) => {
    const info = game.renderer.info, gl = game.renderer.getContext();
    let up = 0, rd = 0, calls = 0, tris = 0;
    for (let i = 0; i < frames; i++) {
      const t0 = performance.now();
      game.update(1 / 60);
      const t1 = performance.now();
      info.autoReset = false; info.reset();
      game.render(); gl.finish();
      info.autoReset = true;
      rd += performance.now() - t1; up += t1 - t0;
      calls += info.render.calls; tris += info.render.triangles;
    }
    return { msPerFrame: +((up + rd) / frames).toFixed(2), updateMs: +(up / frames).toFixed(2), renderMs: +(rd / frames).toFixed(2), calls: Math.round(calls / frames), tris: Math.round(tris / frames), programs: info.programs.length };
  };

  // ------------------------------------------------------------------------
  // Appearance audit: do the people the game turns hostile look different from
  // the people it could have picked?
  //
  // For each seed the whole crowd gets freshly generated appearances from the real
  // generator (randomOutfit), Math.random is seeded, the level is restarted and the
  // real Level 1 selection code runs: _startP1/_startP2/_startP3 (aggressors, surges,
  // bombers), the Rue de Malte ambush (triggered by moving the officer), ambient
  // threats and the final wave. Every makeHostile / bomber call is recorded together
  // with the pool it was drawn from (peaceful demonstrators at that moment, plus the
  // chosen person). Seed 0 audits the crowd exactly as it was built, without swapping.
  //
  // Per marker it compares the observed count among selected characters with the
  // count expected from their pools: z = (O - E) / sqrt(sum p(1-p)), two-sided, with
  // a Bonferroni correction over all markers (familywise alpha 0.05).
  // What a pass means: no skew larger than the reported minimum detectable difference
  // was found in these samples. It is a screening check, not a proof of independence.
  // A self-test re-runs the statistic on a deliberately biased selector (2x weight on
  // one marker) over the same recorded pools, to show the check can detect skew.
  //
  // The appearance data are swapped on the NPC records only; their 3D rigs are not
  // rebuilt (the selection code reads neither). Everything is restored afterwards.
  const MARKERS = {
    keffiyeh: (n) => n.outfit.scarf === 'keffiyeh' || n.outfit.mask === 'keffiyeh',
    algeriaShirt: (n) => n.outfit.shellPattern === 6,
    psg: (n) => n.outfit.top === 'psg' || n.outfit.scarf === 'psg',
    headscarf: (n) => !!n.outfit.headscarf,
    faceCovered: (n) => n.outfit.mask !== 'none',
    balaclava: (n) => n.outfit.mask === 'balaclava',
    hiVis: (n) => !!n.outfit.vest,
    smartClothes: (n) => !!n.outfit.smart,
    female: (n) => n.outfit.gender === 'f',
    complexionEu: (n) => n.outfit.ethnicity === 'eu',
    complexionNa: (n) => n.outfit.ethnicity === 'na',
    complexionAf: (n) => n.outfit.ethnicity === 'af',
    palestinianFlag: (n) => (n.rig.itemType === 'flag' || n.rig.itemType === 'bigflag') && n.rig.itemVariant === 'pal',
    algerianFlag: (n) => (n.rig.itemType === 'flag' || n.rig.itemType === 'bigflag') && n.rig.itemVariant === 'alg',
    frenchFlag: (n) => n.rig.itemVariant === 'fr',
  };
  const KEYS = Object.keys(MARKERS);
  const maskOf = (n) => KEYS.reduce((m, k, i) => (MARKERS[k](n) ? m | (1 << i) : m), 0);
  // inverse standard normal CDF (Acklam's rational approximation)
  const probit = (p) => {
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
    const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
    const q = Math.min(p, 1 - p);
    let x;
    if (q < 0.02425) { const t = Math.sqrt(-2 * Math.log(q)); x = (((((c[0] * t + c[1]) * t + c[2]) * t + c[3]) * t + c[4]) * t + c[5]) / ((((d[0] * t + d[1]) * t + d[2]) * t + d[3]) * t + 1); }
    else { const t = q - 0.5, r = t * t; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * t / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    return p < 0.5 ? x : -x;
  };

  const score = (events, pickIdx) => {
    // events: [{ pool: [mask...], chosen: index into pool }]
    const zCrit = probit(1 - 0.025 / KEYS.length);
    const rows = {};
    KEYS.forEach((k, i) => {
      const bit = 1 << i;
      let O = 0, E = 0, V = 0;
      for (const ev of events) {
        const p = ev.pool.filter((m) => m & bit).length / ev.pool.length;
        const chosen = pickIdx ? pickIdx(ev) : ev.chosen;
        if (ev.pool[chosen] & bit) O++;
        E += p; V += p * (1 - p);
      }
      const N = events.length;
      if (V < 5) { rows[k] = { selected: O, expected: +E.toFixed(1), verdict: 'too rare to assess' }; return; }
      const z = (O - E) / Math.sqrt(V);
      rows[k] = {
        selectedPct: +(100 * O / N).toFixed(1), poolPct: +(100 * E / N).toFixed(1),
        z: +z.toFixed(2), minDetectablePts: +(100 * zCrit * Math.sqrt(V) / N).toFixed(1),
        verdict: Math.abs(z) > zCrit ? 'SKEW DETECTED' : 'ok',
      };
    });
    return { zCrit: +zCrit.toFixed(2), rows };
  };

  window.__auditAppearance = async ({ seeds = 20, selfTestMarker = 'keffiyeh', level = 1 } = {}) => {
    const g = game, crowd = g.crowd, prevLevel = g.level.id;
    g.setLevel(level);
    const m = g.missions;
    const saved = crowd.npcs.map((n) => n.outfit);
    const savedSeedRandom = Math.random;
    const events = [];
    const roleCounts = { demonstrator: {}, looter: {}, civilian: {} };
    const roleN = { demonstrator: 0, looter: 0, civilian: 0 };
    let outfitChanged = 0, flagCarriersSelected = 0, flagsKeptAfter = 0;
    const origMake = crowd.makeHostile.bind(crowd), origBomber = m._setupBomber.bind(m);
    // Level 1 draws from peaceful demonstrators; Level 2's encounter runner draws from
    // its own eligible pool (looting crews first, then anyone free), recorded at the pick
    const record = (n) => {
      const pool = crowd.npcs.filter((o) => o === n || (o.temperament === 'peaceful' && !o.script && !o.arrested && o.state !== 'down' && o.state !== 'gone'));
      events.push({ pool: pool.map(maskOf), chosen: pool.indexOf(n) });
    };
    let origPick = null;
    if (m.enc) {
      origPick = m.enc._pick.bind(m.enc);
      m.enc._pick = (count) => {
        const pool = crowd.npcs.filter((o) => m.enc.eligible(o));
        const chosen = origPick(count);
        for (const c of chosen) events.push({ pool: pool.map(maskOf), chosen: pool.indexOf(c) });
        return chosen;
      };
    }
    crowd.makeHostile = (n, style, mode) => {
      if (!m.enc) record(n);
      const before = JSON.stringify(n.outfit), flag = n.rig.itemType === 'flag' || n.rig.itemType === 'frflag';
      origMake(n, style, mode);
      if (JSON.stringify(n.outfit) !== before) outfitChanged++;
      if (flag && style === 'melee') { flagCarriersSelected++; if (n.rig.itemType === 'flag' || n.rig.itemType === 'frflag') flagsKeptAfter++; }
    };
    m._setupBomber = (n, ...rest) => { if (n && !m.enc) record(n); return origBomber(n, ...rest); };
    const step = (s) => window.__step(s);
    const wasAudio = g.audio.enabled;
    try {
      for (let s = 0; s < seeds; s++) {
        reseed(1000 + s);
        if (s > 0) { const rng = mulberry(7919 * s + 17); for (const n of crowd.npcs) if (!n.special) n.outfit = randomOutfit(rng); }
        for (const n of crowd.npcs) {
          if (n.special) continue;
          const role = n.kind === 'looter' ? 'looter' : n.kind === 'civilian' ? 'civilian' : 'demonstrator';
          roleN[role]++;
          for (const k of KEYS.slice(0, 12)) if (MARKERS[k](n)) roleCounts[role][k] = (roleCounts[role][k] || 0) + 1;
        }
        g.restart();
        if (level === 1) {
          m.stage = 'audit';
          step(1.0);
          m._startP1(); m.stage = 'audit'; step(0.5);
          m._startP2(); m.stage = 'audit'; step(0.5);
          m._startP3(); step(0.3);
          g.player.pos.set(0, 0, -10); m.stage = 'p3'; step(0.2); // real ambush trigger
          m.stage = 'audit';
          for (let k = 0; k < 3; k++) { m.ambient = null; m._ambientThreat(); step(0.3); }
          m._startFinal(); m.stage = 'audit';
        } else {
          // every street encounter of Level 2, section by section, through the real runner
          step(0.5);
          for (const i of [0, 1, 3]) {
            m.resume({ section: i }); step(0.3);
            for (const e of m.enc.list) if (m.enc.state[e.id].status === 'waiting') { m.enc.start(e); step(0.3); }
          }
        }
        await new Promise((r) => setTimeout(r, 0)); // keep the page responsive
      }
    } finally {
      crowd.makeHostile = origMake; m._setupBomber = origBomber;
      if (origPick) m.enc._pick = origPick;
      crowd.npcs.forEach((n, i) => { n.outfit = saved[i]; });
      Math.random = savedSeedRandom;
      g.setLevel(prevLevel);
      g.restart();
    }
    // role comparison: demonstrators vs everyone else (looters + civilians)
    const roles = {};
    for (const k of KEYS.slice(0, 12)) {
      const a = roleCounts.demonstrator[k] || 0, na = roleN.demonstrator;
      const b = (roleCounts.looter[k] || 0) + (roleCounts.civilian[k] || 0), nb = roleN.looter + roleN.civilian;
      const p = (a + b) / (na + nb), se = Math.sqrt(p * (1 - p) * (1 / na + 1 / nb));
      roles[k] = { demonstratorPct: +(100 * a / na).toFixed(1), looterPct: +(100 * (roleCounts.looter[k] || 0) / roleN.looter).toFixed(1), civilianPct: +(100 * (roleCounts.civilian[k] || 0) / roleN.civilian).toFixed(1), z: se ? +((a / na - b / nb) / se).toFixed(2) : 0 };
    }
    // self-test: same pools, a selector that gives the marker double weight
    const bit = 1 << KEYS.indexOf(selfTestMarker);
    const srng = mulberry(4242);
    const biased = (ev) => {
      const w = ev.pool.map((m) => (m & bit ? 2 : 1));
      let r = srng() * w.reduce((x, y) => x + y, 0);
      for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
      return w.length - 1;
    };
    const real = score(events);
    const st = score(events, biased).rows[selfTestMarker];
    // Appearance (clothing, complexion, gender) decides the verdict. Carried flags are props of
    // the demonstrating activity, not of the person: a selector that prefers a role (Level 2
    // sends the looting crews, who carry no flags) shows up here and is reported separately.
    const PROPS = ['palestinianFlag', 'algerianFlag', 'frenchFlag'];
    const skewed = Object.entries(real.rows).filter(([, r]) => r.verdict === 'SKEW DETECTED').map(([k]) => k);
    const flagged = skewed.filter((k) => !PROPS.includes(k));
    const propSkew = skewed.filter((k) => PROPS.includes(k));
    const result = {
      level, seeds, selections: events.length, familywiseAlpha: 0.05, zCritical: real.zCrit,
      verdict: flagged.length ? `appearance skew detected in: ${flagged.join(', ')}` : 'no material appearance skew detected (screening check; see minDetectablePts)',
      carriedProps: propSkew.length ? `role-linked: ${propSkew.map((k) => `${k} ${real.rows[k].selectedPct}% selected vs ${real.rows[k].poolPct}% in pool`).join('; ')}` : 'no skew',
      markers: real.rows,
      roles: { note: 'marker rates by role across all generated populations; z compares demonstrators with looters + civilians', n: roleN, rows: roles },
      hostility: { outfitsChangedByMakeHostile: outfitChanged, meleeFlagCarriersSelected: flagCarriersSelected, flagsKept: flagsKeptAfter },
      selfTest: { marker: selfTestMarker, weight: 2, ...st, detected: st.verdict === 'SKEW DETECTED' },
      audioWasOn: wasAudio,
    };
    window.__auditResult = result;
    return result;
  };
}
