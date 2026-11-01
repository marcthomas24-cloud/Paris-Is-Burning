// Developer helpers, loaded only with ?dev in the URL. Lets automated tests
// step the simulation deterministically when the tab is not animating.
//  ?dev&level=2         start in Level 2 (ignores the unlock)
//  ?dev&level=2&stage=3 start Level 2 at section 3
//  ?dev&level=3         start in Level 3 (&stage=0-3 picks the act, &stage=fixer the Fixer's fight;
//                       &route=A|B the route the bot takes)
//  ?seed=N              seeded run: __start({ audio: false }) then __step / __botRun replay exactly
import { LEVELS, Progress } from './levels.js';
import { randomOutfit } from './characters.js';
import { mulberry } from './textures.js';
import { reseed, SEED } from './seed.js';
import { lintBoss, ENFORCER, LEADER, FIXER } from './boss.js';
import { installTests } from './devtests.js';
import { installTests3 } from './devtests3.js';
import { installTests5 } from './devtests5.js';
import { installTests6 } from './devtests6.js';
import * as THREE from 'three';
import { areaAt as DISTRICT_AREA, DISTRICT } from './district.js';

export function installDev(game) {
  installTests(game); // regression and fairness checks (devtests.js)
  installTests3(game); // Level 3: the van, hazards, radio, checkpoints, both routes (devtests3.js)
  installTests5(game); // quality gate: van QA, progression, leaks between levels, shortcuts, performance (devtests5.js)
  installTests6(game); // fire budget and vehicle fires (devtests6.js)
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
      // the bot starts every seeded run as on a fresh page (its route and watch choice are kept)
      if (window.__bot) Object.assign(window.__bot, { log: [], stuckT: 0, side: 1, last: null, strafeT: 0, prog: null, lastDodged: null, detourRun: 0 });
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
  // 'enforcer' | 'leader' (Level 2) | 'fixer' (Level 3: the van parked in the arena, the fight starting)
  window.__boss = (name = 'enforcer') => (name === 'fixer' ? window.__level(3, 'fixer') : window.__level(2, name === 'leader' ? 4 : 2));
  window.__bossDefs = { enforcer: ENFORCER, leader: LEADER, fixer: FIXER };
  window.__bossHit = (from = 'back') => {
    const b = game.missions.boss; if (!b) return 'no boss';
    const n = b.n, f = from === 'back' ? -1.6 : 1.6;
    const pos = n.pos.clone().add({ x: Math.sin(n.heading) * f, y: 0, z: Math.cos(n.heading) * f });
    const dir = n.pos.clone().sub(pos).setY(0).normalize();
    return { result: game.crowd.onBatonHit(n, dir, pos), hp: b.hp, phase: b.phaseIdx + 1, state: b.s };
  };
  window.__lintBosses = () => ({ enforcer: lintBoss(ENFORCER), leader: lintBoss(LEADER), fixer: lintBoss(FIXER) });
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
  window.__bot = { log: [], stuckT: 0, side: 1, last: null, route: (new URLSearchParams(location.search).get('route') || 'A').toUpperCase() };
  window.__route = (r = 'A') => { window.__bot.route = r.toUpperCase(); return window.__bot.route; }; // Level 3: the route the bot takes
  window.__botTick = () => {
    const g = game, I = g.input, m = g.missions, B = window.__bot, p = g.player.pos;
    // the page pauses itself on blur / visibility / pointer-lock loss; the bot carries on
    if (g.state === 'paused') { g._screen(null); g.state = 'playing'; g.audio.setPaused(false); B.pauses = (B.pauses || 0) + 1; }
    I.keys.clear(); I.buttons.clear();
    // cinematics: skipped with a key press (set __bot.watch = true to let them play)
    if (g.cinematic && !B.watch) { I.edges.add('Enter'); window.__step(0.1); return; }
    const threat = g.crowd.nearest(p, (n) => g.crowd.isThreat(n) || (n.script && n.script.active), m.stage === 'p3' ? 12 : 30);
    let goal = null, fight = false;
    // Level 3 gives the bot a place to walk (the chosen route's mouth, an interaction, behind the van)
    if (threat) { goal = threat.pos; fight = true; } else if (m.botGoal) goal = m.botGoal(B.route || 'A'); else if (m.markerPos) goal = m.markerPos;
    if (g.crowd.arrestable(p) && !threat) I.edges.add('KeyE');
    if (m.promptE && !threat) I.edges.add('KeyE'); // Level 3 interactions (barricade, scooter, handover)
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
      // Level 3 only (Levels 1-2 keep the bot their baselines were recorded with): jittering in
      // place against parked cars counts as moving above, so also detour when no progress is made
      // towards the goal for 3 s (a person would walk round the car)
      if (g.level.id === 3 && !(fight && d < 1.8) && !(bs && bs.active)) {
        // (repeated detours grow longer and change side only every other time: a long barricade needs
        // a long walk to one end)
        if (!B.prog || B.prog.goal.distanceTo(goal) > 2 || d < B.prog.best - 0.4) { if (B.prog && d < B.prog.best - 0.4) B.detourRun = 0; B.prog = { goal: goal.clone(), best: d, t: 0 }; }
        else if ((B.prog.t += 0.1) > 3) {
          B.prog = null; B.detourRun = (B.detourRun || 0) + 1;
          if (B.detourRun % 2 === 1) B.side *= -1;
          B.strafeT = 2.4 * Math.min(3, Math.ceil(B.detourRun / 2)); B.detours = (B.detours || 0) + 1;
        }
      }
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
    const names = ['explosion', 'molotov', 'glass', 'impact', 'swing', 'shout', 'chant', 'whistle', 'roar', 'crash', 'shutter', 'firework', 'distantBang', 'footstep', 'hurt', 'thump', 'adhan', 'alarm'];
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
  // World inspection (any level; the Level 3 district has its own landmarks and walk areas).
  //  __acts()                      the current level's acts / sections (jump with __jump(i))
  //  __pos()                       where the officer is: position, heading, area, camera
  //  __posHud(on)                  the same, live, in a small panel at the top of the screen
  //  __goto(x, z, deg) / __view(n) put the officer somewhere (deg: facing, 0 = +z) / at a named view
  //  __colliders(on, radius)       draw collider boxes near the officer and the level bounds
  //  __navMap({ show })            flood fill from the start: reachable ground, leaks, pockets
  //  __walkRoute(route)            walk a route with the normal controls; stuck and camera checks
  //  __npcNav(n, seconds)          send crowd agents across the level; arrivals and stuck agents
  //  __worldPerf({ frames })       frame cost, draw calls and triangles at fixed viewpoints
  const deg = (r) => Math.round(((r * 180) / Math.PI + 360) % 360);
  const district = () => game.world.district;
  const areaName = (x, z) => (game.level.district ? DISTRICT_AREA(x, z) : z < -110 ? 'Oberkampf' : z < -20 ? 'Oberkampf to Malte' : z < 70 ? 'Malte to Timbaud' : 'Timbaud to the staging area');
  window.__acts = () => (game.level.phases || []).map((name, i) => ({ i, name, jump: `__jump(${i})`, url: `?dev&level=${game.level.id}&stage=${i}` }));
  window.__pos = () => {
    const p = game.player.pos, c = game.camera.position;
    return { level: game.level.id, x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2), heading: deg(game.player.heading), area: areaName(p.x, p.z), act: game.missions.section ?? game.missions.phase, camera: { x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2), dist: +game.cameraRig.curDist.toFixed(2) }, blocked: game.world.blocked(p.x, p.z, 0.36) };
  };
  window.__posHud = (on = true) => {
    let el = document.getElementById('dev-pos');
    clearInterval(window.__posHudT);
    if (!on) { if (el) el.remove(); return 'off'; }
    if (!el) { el = document.createElement('div'); el.id = 'dev-pos'; el.style.cssText = 'position:fixed;top:44px;left:50%;transform:translateX(-50%);z-index:50;font:12px Consolas,monospace;color:#fff;background:rgba(0,0,0,.65);padding:4px 8px;border-radius:4px;pointer-events:none'; document.body.appendChild(el); }
    window.__posHudT = setInterval(() => { const s = window.__pos(); el.textContent = `x ${s.x} z ${s.z} · ${s.heading}° · ${s.area} · act ${s.act} · cam ${s.camera.dist} m`; }, 100);
    return 'on';
  };
  window.__goto = (x, z, facing = 0) => {
    const p = game.player; p.pos.set(x, 0, z); p.vel.set(0, 0, 0); p.heading = (facing * Math.PI) / 180;
    game.cameraRig.reset(p); game.cameraRig.pitch = -0.1;
    window.__step(0.4);
    return window.__pos();
  };
  const VIEWS = {
    1: { start: [0.5, 141, 180], centre: [0, 60, 180], malte: [0, -20, 180], oberkampf: [0, -100, 180] },
    2: { start: [-1.5, -100, 0], malte: [0, -30, 0], centre: [0, 30, 0], timbaud: [0, 62, 0] },
    3: {
      staging: [3, 152, 0], gate: [2, 176, 0], boulevardSouth: [0, 200, 0], junction: [0, 236, 0], avenue: [0, 262, 0], roadblock: [4, 278, 0],
      passage: [40, 252, 0], scaffold: [40, 280, 0], squareNorth: [0, 352, 0], squareWide: [40, 440, 225], monument: [-20, 380, 60],
      metro: [27, 386, 180], rally: [-15, 400, 270], arena: [0, 412, 0], exitStreet: [0, 450, 0], extraction: [0, 472, 0],
    },
  };
  window.__view = (name) => { const v = (VIEWS[game.level.id] || {})[name]; return v ? window.__goto(...v) : `views: ${Object.keys(VIEWS[game.level.id] || {}).join(', ')}`; };
  window.__colliders = (on = true, radius = 60) => {
    if (window.__colMesh) { game.scene.remove(window.__colMesh); window.__colMesh.geometry.dispose(); window.__colMesh = null; }
    if (!on) return 'off';
    const w = game.world, p = game.player.pos, pts = [];
    const rect = (corners, h) => {
      for (let i = 0; i < 4; i++) {
        const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4];
        pts.push(ax, 0.05, az, bx, 0.05, bz, ax, h, az, bx, h, bz, ax, 0.05, az, ax, h, az);
      }
    };
    let n = 0;
    for (const c of w.colliders) {
      if (c.off) continue;
      const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
      if (Math.hypot(cx - p.x, cz - p.z) > radius + Math.max(c.maxX - c.minX, c.maxZ - c.minZ) / 2) continue;
      const h = Math.min(c.h, 6);
      if (c.obb) { const o = c.obb, C = (sx, sz) => [o.cx + o.c * sx * o.hw + o.s * sz * o.hd, o.cz - o.s * sx * o.hw + o.c * sz * o.hd]; rect([C(-1, -1), C(1, -1), C(1, 1), C(-1, 1)], h); }
      else rect([[c.minX, c.minZ], [c.maxX, c.minZ], [c.maxX, c.maxZ], [c.minX, c.maxZ]], h);
      n++;
    }
    const B = w.bounds; rect([[B.minX, B.minZ], [B.maxX, B.minZ], [B.maxX, B.maxZ], [B.minX, B.maxZ]], 12);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    window.__colMesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x00ffaa, depthTest: false, transparent: true, opacity: 0.85 }));
    window.__colMesh.renderOrder = 10; game.scene.add(window.__colMesh);
    window.__step(0.02);
    return { drawn: n, bounds: B };
  };
  // Flood fill on a 1 m grid from the level start, with the officer's radius. Reports ground the
  // officer can reach outside the level's walk areas (a collision hole into a building), walk-area
  // ground that is free but cannot be reached (a closed-off pocket), and which landmarks are reached.
  window.__navMap = ({ cell = 1, radius = 0.36, show = false } = {}) => {
    const w = game.world, B = w.bounds, s = game.level.start, D = game.level.district ? DISTRICT : null;
    const nx = Math.floor((B.maxX - B.minX) / cell) + 1, nz = Math.floor((B.maxZ - B.minZ) / cell) + 1;
    const X = (i) => B.minX + i * cell, Z = (j) => B.minZ + j * cell;
    const state = new Uint8Array(nx * nz); // 0 unknown, 1 blocked, 2 reached
    const free = (i, j) => !w.blocked(X(i), Z(j), radius);
    const q = [[Math.round((s.x - B.minX) / cell), Math.round((s.z - B.minZ) / cell)]];
    state[q[0][1] * nx + q[0][0]] = 2;
    let reached = 0;
    while (q.length) {
      const [i, j] = q.pop(); reached++;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
        const k = b * nx + a; if (state[k]) continue;
        if (free(a, b)) { state[k] = 2; q.push([a, b]); } else state[k] = 1;
      }
    }
    const inWalk = (x, z) => !D || D.walkRects.some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);
    const leaks = [], pockets = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = X(i), z = Z(j), k = j * nx + i;
      if (state[k] === 2 && !inWalk(x, z)) leaks.push([x, z]);
      else if (state[k] === 0 && inWalk(x, z) && free(i, j)) pockets.push([x, z]);
    }
    const lm = D ? Object.fromEntries(Object.entries(D.landmarks).map(([n, [x, z]]) => {
      // the nearest reached cell within 4 m of the landmark
      let ok = false; for (let r = 0; r <= 4 && !ok; r++) for (let dx = -r; dx <= r && !ok; dx++) for (let dz = -r; dz <= r && !ok; dz++) { const i = Math.round((x + dx - B.minX) / cell), j = Math.round((z + dz - B.minZ) / cell); ok = state[j * nx + i] === 2; }
      return [n, ok];
    })) : null;
    const out = { level: game.level.id, cell, reachedCells: reached, reachedM2: reached * cell * cell, leaks: leaks.length, leakSamples: leaks.slice(0, 12), pockets: pockets.length, pocketSamples: pockets.slice(0, 12), landmarksReached: lm };
    if (show) {
      const S = 2, cv = document.createElement('canvas'); cv.width = nx * S; cv.height = nz * S;
      const ctx = cv.getContext('2d');
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const v = state[j * nx + i]; ctx.fillStyle = v === 2 ? (inWalk(X(i), Z(j)) ? '#3a7' : '#f33') : v === 1 ? '#555' : inWalk(X(i), Z(j)) && free(i, j) ? '#fc3' : '#111'; ctx.fillRect(i * S, j * S, S, S); }
      let el = document.getElementById('dev-nav'); if (!el) { el = document.createElement('img'); el.id = 'dev-nav'; el.style.cssText = 'position:fixed;right:8px;top:8px;z-index:60;max-height:95vh;border:1px solid #fff;image-rendering:pixelated'; document.body.appendChild(el); el.onclick = () => el.remove(); }
      el.src = cv.toDataURL();
      out.shown = 'top right (click to close): green reached, red reached outside the walk areas, yellow unreachable walk area, grey blocked';
    }
    return out;
  };
  const ROUTES = {
    3: {
      A: [[10, 168], [3, 180], [0, 200], [0, 238], [0, 276], [12.3, 286], [12.3, 297], [0, 312], [0, 350], [27, 377], [0, 412], [0, 476]],
      B: [[10, 168], [3, 180], [0, 200], [0, 238], [40, 241], [40, 318], [37.7, 324], [40, 334], [33, 356], [30, 362], [29.7, 374], [27, 377], [0, 412], [0, 476]],
      // round the square's ring road, into both side streets and back past the monument
      square: [[0, 352], [-30, 352], [-36, 365], [-36, 425], [-28, 432], [0, 437], [25, 434], [38, 420], [38, 370], [33, 355], [0, 352], [-20, 384], [-53.5, 395], [-20, 386], [20, 386], [53.5, 395], [20, 405], [0, 412]],
    },
    2: { main: [[0, -60], [0, 0], [0, 60]] },
    1: { main: [[0, 100], [0, 0], [0, -105]] },
  };
  window.__walkRoute = async (route = 'A', { timeout = 240 } = {}) => {
    const pts = (ROUTES[game.level.id] || {})[route]; if (!pts) return `routes: ${Object.keys(ROUTES[game.level.id] || {}).join(', ')}`;
    const g = game, I = g.input, p = g.player.pos, w = g.world;
    const wasSkip = g.skipCinematics; g.skipCinematics = true;
    let t = 0, idx = 0, stuck = 0, stuckEvents = [], side = 1, strafe = 0, minCam = 99, clip = [], trappedT = 0, trapped = [];
    const camInside = () => { const c = g.camera.position; for (const col of w.near(c.x, c.z, 0.5)) { if (col.obb) { if (w.blockedBy(c.x, c.z, 0.02, c.y) === col) return col.tag; continue; } if (c.x > col.minX && c.x < col.maxX && c.z > col.minZ && c.z < col.maxZ && c.y < col.h) return col.tag; } return null; };
    while (idx < pts.length && t < timeout) {
      I.keys.clear(); I.buttons.clear();
      const [gx, gz] = pts[idx], dx = gx - p.x, dz = gz - p.z, d = Math.hypot(dx, dz);
      if (d < 1.2) { idx++; continue; }
      g.cameraRig.yaw = Math.atan2(-dx, -dz) + (strafe > 0 ? side * 0.9 : 0);
      I.keys.add('KeyW'); if (d > 4) I.keys.add('ShiftLeft');
      const before = p.clone();
      window.__step(0.1); t += 0.1; strafe -= 0.1;
      if (p.distanceTo(before) < 0.05) { stuck += 0.1; if (stuck > 1.0) { stuckEvents.push([+p.x.toFixed(1), +p.z.toFixed(1)]); stuck = 0; side *= -1; strafe = 1.2; } } else stuck = Math.max(0, stuck - 0.05);
      minCam = Math.min(minCam, g.cameraRig.curDist);
      const inside = camInside(); if (inside) clip.push([+p.x.toFixed(1), +p.z.toFixed(1), inside]);
      if (g.cameraRig.curDist < 0.8) { trappedT += 0.1; if (trappedT > 1.5) { trapped.push([+p.x.toFixed(1), +p.z.toFixed(1)]); trappedT = 0; } } else trappedT = 0;
      if (Math.round(t * 10) % 50 === 0) await new Promise((r) => setTimeout(r, 1));
    }
    I.keys.clear(); g.skipCinematics = wasSkip;
    return { level: g.level.id, route, finished: idx >= pts.length, waypoints: `${idx} / ${pts.length}`, seconds: +t.toFixed(1), end: [+p.x.toFixed(1), +p.z.toFixed(1)], stuckEvents, minCameraDist: +minCam.toFixed(2), cameraInsideCollider: clip.slice(0, 10), cameraInsideCount: clip.length, cameraTrapped: trapped };
  };
  // Crowd agents sent to far points of the level: who gets there, who sticks, who ends up in a wall.
  window.__npcNav = async (count = 24, seconds = 90, { minD = 30, maxD = 80 } = {}) => {
    const g = game, crowd = g.crowd, w = g.world, D = g.level.district ? DISTRICT : null;
    const rects = D ? D.walkRects : [[-14, -150, 14, 160]];
    const R = (a, b) => a + Math.random() * (b - a);
    const pickPoint = () => { for (let k = 0; k < 50; k++) { const [x0, z0, x1, z1] = rects[Math.floor(Math.random() * rects.length)]; const x = R(x0 + 1, x1 - 1), z = R(z0 + 1, z1 - 1); if (!w.blocked(x, z, 0.5)) return new THREE.Vector3(x, 0, z); } return null; };
    const agents = crowd.npcs.filter((n) => n.temperament === 'peaceful' && n.state !== 'gone' && !n.march).slice(0, count);
    const jobs = [];
    for (const n of agents) {
      let to = null; for (let k = 0; k < 60 && !to; k++) { const c = pickPoint(); if (c && c.distanceTo(n.pos) > minD && c.distanceTo(n.pos) < maxD) to = c; }
      if (!to) continue;
      n.anchor.copy(to); n.target.copy(to); n.role = 'wander'; crowd.setState(n, 'walk'); n.fear = 0; n.stimuli.length = 0;
      jobs.push({ n, to, from: n.pos.clone(), best: n.pos.distanceTo(to), last: n.pos.clone(), still: 0, stuckAt: null });
    }
    for (let s = 0; s < seconds * 10; s++) {
      for (const j of jobs) { if (j.n.state === 'act' || j.n.state === 'calm') { j.n.target.copy(j.to); crowd.setState(j.n, 'walk'); } }
      window.__step(0.1);
      for (const j of jobs) {
        j.best = Math.min(j.best, j.n.pos.distanceTo(j.to));
        if (j.n.pos.distanceTo(j.last) < 0.3) { j.still += 0.1; if (j.still > 15 && !j.stuckAt && j.best > 4) j.stuckAt = [+j.n.pos.x.toFixed(1), +j.n.pos.z.toFixed(1)]; } else { j.still = 0; j.last.copy(j.n.pos); }
      }
      if (s % 50 === 0) await new Promise((r) => setTimeout(r, 1));
    }
    const inWall = crowd.npcs.filter((n) => n.state !== 'gone' && w.blocked(n.pos.x, n.pos.z, 0.05)).map((n) => [n.id, +n.pos.x.toFixed(1), +n.pos.z.toFixed(1)]);
    const outOfBounds = crowd.npcs.filter((n) => n.state !== 'gone' && (n.pos.x < w.bounds.minX - 0.01 || n.pos.x > w.bounds.maxX + 0.01 || n.pos.z < w.bounds.minZ - 0.01 || n.pos.z > w.bounds.maxZ + 0.01)).length;
    const prog = jobs.map((j) => 1 - j.best / Math.max(1, j.from.distanceTo(j.to)));
    return { level: g.level.id, sent: jobs.length, arrived: jobs.filter((j) => j.best < 4).length, meanProgress: +(prog.reduce((a, b) => a + b, 0) / Math.max(1, prog.length)).toFixed(2), under50pct: jobs.filter((j, i) => prog[i] < 0.5).map((j) => ({ from: [+j.from.x.toFixed(0), +j.from.z.toFixed(0)], to: [+j.to.x.toFixed(0), +j.to.z.toFixed(0)], now: [+j.n.pos.x.toFixed(0), +j.n.pos.z.toFixed(0)], state: j.n.state })), stuck: jobs.filter((j) => j.stuckAt).map((j) => ({ from: [+j.from.x.toFixed(0), +j.from.z.toFixed(0)], to: [+j.to.x.toFixed(0), +j.to.z.toFixed(0)], at: j.stuckAt })), meanClosest: +(jobs.reduce((a, j) => a + j.best, 0) / Math.max(1, jobs.length)).toFixed(1), agentsInsideColliders: inWall, agentsOutOfBounds: outOfBounds };
  };
  window.__worldPerf = async ({ frames = 60 } = {}) => {
    const views = VIEWS[game.level.id] || {}, rows = [];
    for (const name of Object.keys(views)) {
      window.__goto(...views[name]); window.__step(0.5);
      const r = window.__perf(frames);
      rows.push({ view: name, ms: r.msPerFrame, update: r.updateMs, render: r.renderMs, calls: r.calls, tris: r.tris });
      await new Promise((res) => setTimeout(res, 1));
    }
    const avg = (k) => +(rows.reduce((a, r) => a + r[k], 0) / Math.max(1, rows.length)).toFixed(2);
    return { level: game.level.id, frames, programs: game.renderer.info.programs.length, mean: { ms: avg('ms'), update: avg('update'), render: avg('render'), calls: Math.round(avg('calls')), tris: Math.round(avg('tris')) }, rows };
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

  // tension: hold crowd tension at this value (e.g. 100) so the extra attackers it causes are
  // selected too, through the same code
  window.__auditAppearance = async ({ seeds = 20, selfTestMarker = 'keffiyeh', level = 1, tension = null } = {}) => {
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
        m.tension.lock(tension);
        if (level === 1) {
          m.stage = 'audit';
          step(1.0);
          m._startP1(); m.stage = 'audit'; step(0.5);
          m._startP2(); m.stage = 'audit'; step(0.5);
          m._startP3(); step(0.3);
          g.player.pos.set(0, 0, -10); m.stage = 'p3'; step(0.2); // real ambush trigger
          m.stage = 'audit';
          for (let k = 0; k < 3; k++) { m.ambient = null; m.ambients = []; m._ambientThreat(); if (tension !== null) m._ambientThreat(); step(0.3); }
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
      m.tension.lock(null);
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
      level, seeds, tension, selections: events.length, familywiseAlpha: 0.05, zCritical: real.zCrit,
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
