// Regression and fairness checks (developer builds only: loaded by dev.js with ?dev).
// Each returns a Promise with plain data so results can be saved; none changes gameplay.
// Typical use, in the browser console on a page opened with ?dev&seed=N:
//   await __runToEnd()                      full level with the bot, cinematics skipped
//   await __runToEnd({ watch: true })       same, cinematics played through
//   await __testTransitions(10)             boss phase-change trials
//   await __testFeints(400)                 feint fairness with feints forced on
//   await __testCheckpoint('leader')        die mid-fight, retry, check the reset
//   await __testChargeWindow()              Enforcer charge reaction window
//   await __testWallStun()                  charge into an obstacle
//   await __probeMemory(8)                  heap / GPU objects across retries
//   await __frameTimes('leader', 300)       per-frame cost during a fight
//   __hudLayout()                           overlapping HUD panels at this viewport
//   await __testGas()                       officer's tear-gas grenade: cloud, crowd reaction, supply, boss lock-out
//   await __testBarriers()                  police barriers: preview and placing, refusals, crowd walks round, pick-up, arenas
import { ENFORCER, LEADER } from './boss.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function installTests(game) {
  // The page pauses itself on blur / visibility / pointer-lock loss (common when the browser
  // window is in the background); a paused game does not advance, so every step resumes it.
  const resume = () => { if (game.state === 'paused') { game._screen(null); game.state = 'playing'; game.audio.setPaused(false); } };
  const step = (s) => { resume(); window.__step(s); };
  const errors = [];
  addEventListener('error', (e) => errors.push('uncaught: ' + e.message));
  addEventListener('unhandledrejection', (e) => errors.push('rejection: ' + (e.reason && e.reason.message || e.reason)));
  window.__errors = errors;

  // Bot plays the current level to its results screen.
  window.__runToEnd = async ({ watch = false, slice = 10, maxWallMs = 600000, audio = false, seed } = {}) => {
    window.__bot.watch = watch;
    game.resize();
    window.__start({ audio, seed });
    const m0 = game.missions, out = { cines: [], sections: [], minHp: 100 };
    let lastC = null, lastSec = -1;
    const t0 = performance.now();
    while (!game.missions.ended && performance.now() - t0 < maxWallMs) {
      for (let k = 0; k < slice && !game.missions.ended; k++) {
        window.__botTick();
        const m = game.missions, c = game.cinematic && game.cinematic.id;
        if (c && c !== lastC) out.cines.push([c, +m.t.toFixed(1)]);
        lastC = c;
        out.minHp = Math.min(out.minHp, game.player.health);
        if (m.section !== undefined && m.section !== lastSec) { out.sections.push([m.section, +m.t.toFixed(1)]); lastSec = m.section; }
        if (game.state !== 'playing') break;
      }
      if (game.state !== 'playing' && !game.missions.ended) break; // died: reported below
      await sleep(5);
    }
    step(3);
    const m = game.missions, c = game.crowd.npcs;
    return {
      level: game.level.id, ended: m.ended, state: game.state, t: +m.t.toFixed(2), score: m.score, stats: { ...m.stats },
      title: document.getElementById('end-title').textContent,
      continueShown: !document.getElementById('btn-continue').classList.contains('hidden'),
      hook: !!document.querySelector('#end-stats .hook'),
      bossTimes: m.bossTimes ? Object.fromEntries(Object.entries(m.bossTimes).map(([k, v]) => [k, +v.toFixed(1)])) : undefined,
      shortfall: m.enc ? m.enc.shortfall : undefined,
      cines: out.cines, sections: out.sections, minHp: Math.round(out.minHp),
      crowdSum: [c.reduce((a, n) => a + n.pos.x, 0).toFixed(3), c.reduce((a, n) => a + n.pos.z, 0).toFixed(3)],
      wallMs: Math.round(performance.now() - t0), errors: errors.slice(), started: m0 === m,
    };
  };

  // __runToEnd with checks: duplicate spawns, encounters active too long (softlock or
  // unreachable members), boss damage during a phase change or after defeat, single hits
  // above 25 health, and a score that must equal the sum of every awarded score event.
  window.__auditRun = async (opts = {}) => {
    const g = game, issues = [], m = g.missions;
    let scoreSum = 0, maxHit = 0, maxHitFrom = '', encounters = 0;
    const origAdd = m.addScore.bind(m);
    m.addScore = (v, reason) => { const before = m.score; origAdd(v, reason); scoreSum += m.score - before; };
    const p = g.player, origDmg = p.takeDamage.bind(p);
    p.takeDamage = (amount, from, push, proj) => {
      const b = m.boss, dealt = origDmg(amount, from, push, proj);
      if (dealt > maxHit) { maxHit = dealt; maxHitFrom = b && from === null ? 'boss unblockable' : proj ? 'projectile' : 'melee/other'; }
      if (dealt > 25) issues.push(`hit of ${dealt.toFixed(1)} > 25 at t=${m.t.toFixed(1)}`);
      if (b && dealt > 0 && (b.s === 'transition' || b.s === 'defeated' || b.s === 'off') && (from === null || (from && from.distanceTo && from.distanceTo(b.n.pos) < 0.01))) issues.push(`boss damage while ${b.s} at t=${m.t.toFixed(1)}`);
      return dealt;
    };
    let origStart = null;
    if (m.enc) {
      origStart = m.enc.start.bind(m.enc);
      m.enc.start = (e) => {
        encounters++;
        origStart(e);
        const mine = m.enc.state[e.id].members;
        for (const [id, st] of Object.entries(m.enc.state)) if (id !== e.id && st.status === 'active') for (const n of mine) if (st.members.includes(n) && !n.neutralized && !n.arrested) issues.push(`npc ${n.id} in both ${id} and ${e.id}`);
      };
    }
    const longActive = setInterval(() => { if (!m.enc) return; for (const [id, st] of Object.entries(m.enc.state)) if (st.status === 'active' && st.t > 90 && !st.flagged) { st.flagged = true; issues.push(`encounter ${id} active for ${st.t.toFixed(0)} s`); } }, 500);
    let r;
    try { r = await window.__runToEnd(opts); } finally {
      clearInterval(longActive);
      m.addScore = origAdd; p.takeDamage = origDmg; if (origStart) m.enc.start = origStart;
    }
    if (game.missions !== m) issues.push('mission object replaced during the run');
    if (Math.round(scoreSum) !== Math.round(m.score)) issues.push(`score ${m.score} != sum of awarded events ${scoreSum}`);
    if (!r.ended) issues.push(`run did not finish (state ${r.state})`);
    return { ...r, encountersStarted: encounters, maxHit: +maxHit.toFixed(1), maxHitFrom, scoreSum, issues };
  };

  // Phase changes: bring le Patron to threshold+1 during a wind-up, land the crossing hit and
  // more hits straight after. Expect: health clamped, attack cancelled, extra hits blocked,
  // no damage to the officer, exactly one phase gained, boss back to idle.
  window.__testTransitions = async (trials = 10) => {
    game.skipCinematics = true;
    const rows = [];
    for (const threshold of LEADER.phases.slice(1).map((p) => p.from)) for (let i = 0; i < trials; i++) {
      window.__boss('leader'); step(0.2);
      const b = game.missions.boss, p = game.player;
      p.pos.set(b.n.pos.x + 2.2, 0, b.n.pos.z - 1.5); b.s = 'idle'; b.t = 0;
      while (b.hp > threshold + 1) { window.__bossHit('back'); if (b.s === 'transition') step(2.4); }
      b.cool = 0; let guard = 0;
      while (b.s !== 'wind' && guard++ < 300) { p.pos.set(b.n.pos.x + Math.sin(b.n.heading) * 2, 0, b.n.pos.z + Math.cos(b.n.heading) * 2); step(1 / 60); }
      step(0.1 + i * 0.03);
      const kind = b.cur && b.cur.kind, was = b.s, hp0 = p.health, log0 = b.log.length, phase0 = b.phaseIdx;
      const cross = window.__bossHit('back');
      const extra = [window.__bossHit('back'), window.__bossHit('front'), window.__bossHit('back')].map((e) => e.result);
      const atCross = { hp: b.hp, s: b.s, cancelled: b.cur === null && b.queue.length === 0 };
      step(2.5);
      const r = { threshold, trial: i, hitDuring: was, kind, crossing: cross.result, hpAfter: atCross.hp, state: atCross.s, cancelled: atCross.cancelled, extra: extra.join(','), resolvedDuring: b.log.length - log0, officerHpLost: +(hp0 - p.health).toFixed(1), phaseGain: b.phaseIdx - phase0, after: b.s };
      r.pass = r.hpAfter === threshold && r.state === 'transition' && r.cancelled && r.extra === 'blocked,blocked,blocked' && r.resolvedDuring === 0 && r.officerHpLost === 0 && r.phaseGain === 1 && r.after !== 'transition';
      rows.push(r);
      await sleep(2);
    }
    game.skipCinematics = false;
    return { trials: rows.length, passed: rows.filter((r) => r.pass).length, failures: rows.filter((r) => !r.pass) };
  };

  // Feints forced on in phase 3: the bot dodges every heavy wind-up in good faith (it cannot
  // tell a feint), and must still be safe from the real chop that follows.
  window.__testFeints = async (ticks = 400) => {
    game.skipCinematics = true;
    window.__boss('leader'); step(0.3);
    const b = game.missions.boss, ph3 = b.def.phases[2], saved = ph3.feint;
    ph3.feint = 1;
    game.player.pos.set(b.n.pos.x + 3, 0, b.n.pos.z - 3);
    while (b.phaseIdx < 2) { window.__bossHit('back'); if (b.s === 'transition') step(2.4); }
    const after = []; let prev = b.s, pending = false, feints = 0;
    try {
      for (let i = 0; i < ticks; i++) {
        window.__botTick();
        if (b.s === 'feint' && prev !== 'feint') { feints++; pending = true; }
        if (pending && b.s === 'strike' && prev !== 'strike') { const e = b.log[b.log.length - 1]; after.push({ kind: e.kind, inRange: e.inRange, invuln: e.invuln, dealt: e.dealt }); pending = false; }
        prev = b.s;
        if (b.hp < 3) b.hp = 4; // keep the fight going
        if (game.player.health < 40) game.player.health = 100;
        if (i % 20 === 19) await sleep(2);
      }
    } finally { ph3.feint = saved; game.skipCinematics = false; }
    const chops = b.log.filter((e) => e.kind === 'chop');
    return { feints, realAttacksAfterFeint: after.length, safeAfterFeint: after.filter((e) => e.dealt === 0).length, chops: chops.length, chopHitsTaken: chops.filter((e) => e.dealt > 0).length, after };
  };

  // Die mid-fight, RETRY SECTION, check the fight resets cleanly.
  window.__testCheckpoint = async (name = 'leader') => {
    game.skipCinematics = true;
    window.__boss(name); step(0.3);
    const m = game.missions; m.addScore(777, 'carried in'); m.cp.score = m.score;
    const cpScore = m.score, fires0 = game.world.fires.length;
    const b = m.boss; game.player.pos.set(b.n.pos.x + 3, 0, b.n.pos.z - 3);
    for (let i = 0; i < (name === 'leader' ? 7 : 4); i++) { window.__bossHit('back'); if (b.s === 'transition') step(2.4); }
    const mid = { hp: b.hp, phase: b.phaseIdx + 1, score: m.score };
    game.player.takeDamage(1000, null, null); step(3);
    const failed = { state: game.state, retryShown: !document.getElementById('btn-retry').classList.contains('hidden') };
    document.getElementById('btn-retry').click(); step(0.5);
    const b2 = m.boss, rig = b2.n.rig;
    const r = { name, mid, failed, after: { state: game.state, section: m.section, boss: b2.s, hp: b2.hp, max: b2.def.hp, phase: b2.phaseIdx + 1, score: m.score, scoreRestored: m.score === cpScore, arena: !!game.crowd.arena, newFight: b2 !== b, axes: rig.handR.children.filter((c) => c === rig.axe).length, worldFires: [fires0, game.world.fires.length], playerHp: game.player.health, endedOverlay: document.getElementById('app').classList.contains('ended') } };
    r.pass = failed.retryShown && r.after.state === 'playing' && r.after.hp === r.after.max && r.after.phase === 1 && r.after.scoreRestored && r.after.arena && r.after.newFight && r.after.axes === (name === 'leader' ? 1 : 0) && r.after.worldFires[0] === r.after.worldFires[1] && r.after.playerHp === 100 && !r.after.endedOverlay;
    game.skipCinematics = false;
    return r;
  };

  // Time from the Enforcer's launch to contact with an officer standing still at D metres.
  window.__testChargeWindow = async () => {
    game.skipCinematics = true;
    const out = [];
    for (const D of [4.5, 5.5, 6.2, 7, 9]) {
      window.__boss('enforcer'); step(0.1);
      const b = game.missions.boss, p = game.player, n = b.n;
      game.crowd.clearArena();
      n.pos.set(0, 0, -16); n.heading = 0; p.pos.set(0, 0, -16 + D); p.health = 100; p.invuln = 0;
      b.s = 'idle'; b.cool = 99; b._wind(b.def.attacks.charge);
      let t = 0, launch = -1, contact = -1;
      for (let i = 0; i < 300; i++) { p.pos.set(0, 0, -16 + D); step(1 / 60); t += 1 / 60; if (b.s === 'charge' && launch < 0) launch = t; if (launch >= 0 && contact < 0 && p.health < 100) { contact = t; break; } if (launch >= 0 && b.s !== 'charge') break; }
      out.push({ distance: D, windup: ENFORCER.attacks.charge.wind, launchToContact: contact > 0 ? +(contact - launch).toFixed(2) : null });
    }
    game.skipCinematics = false;
    return out;
  };

  // A charge into an obstacle must stun him, not hurt the officer, and leave his front open.
  window.__testWallStun = async () => {
    game.skipCinematics = true;
    window.__boss('enforcer'); step(0.3);
    const w = game.world, b = game.missions.boss, n = b.n, p = game.player;
    let f = null;
    outer: for (let r = 3; r <= 15; r += 0.5) for (let a = 0; a < 6.28; a += 0.2) {
      const ox = Math.sin(a) * r, oz = -16 + Math.cos(a) * r;
      if (!w.blocked(ox, oz, 0.4)) continue;
      for (let d = 0; d < 6.28; d += 0.3) { const dx = Math.sin(d), dz = Math.cos(d); let ok = true; for (let s = 1.8; s <= 5.5; s += 0.4) if (w.blocked(ox - dx * s, oz - dz * s, 0.5)) { ok = false; break; } if (ok) { f = { ox, oz, dx, dz }; break outer; } }
    }
    if (!f) { game.skipCinematics = false; return { pass: false, reason: 'no obstacle found' }; }
    game.crowd.clearArena();
    n.pos.set(f.ox - f.dx * 5.5, 0, f.oz - f.dz * 5.5); n.heading = Math.atan2(f.dx, f.dz);
    const pp = { x: f.ox + f.dx * 2, z: f.oz + f.dz * 2 }; p.pos.set(pp.x, 0, pp.z); p.health = 100;
    b.s = 'idle'; b.cool = 99; b._wind(b.def.attacks.charge);
    const states = []; let prev = '';
    for (let i = 0; i < 240; i++) { p.pos.set(pp.x, 0, pp.z); step(1 / 60); if (b.s !== prev) { states.push(b.s); prev = b.s; } if (prev === 'stun' && b.t > 0.2) break; }
    const stunned = b.s === 'stun', dur = b.dur, hp0 = b.hp;
    const front = stunned ? window.__bossHit('front').result : 'n/a';
    game.skipCinematics = false;
    return { states, stunned, stunDuration: dur, officerHp: p.health, frontHitDuringStun: front, bossHp: [hp0, b.hp], pass: stunned && p.health === 100 && front === 'hit' };
  };

  // Fuzz a boss: random hits from random sides at random moments, the officer moved around
  // at random (and kept alive). The boss must never stay in one state beyond its design bound,
  // never stay invulnerable (transition) longer than one phase change, and health may only fall.
  window.__fuzzBoss = async (name = 'leader', seconds = 120, hitRate = 0.12) => {
    game.skipCinematics = true;
    window.__boss(name); step(0.2);
    const b = game.missions.boss, p = game.player;
    // longest legitimate stay per state (s); intro ends 0.8 s after the cinematic (skipped here)
    const bound = { intro: 1.5, idle: 12, wind: 1.1, feint: 0.5, strike: 0.2, rec: 1.5, stun: 2.5, charge: 2.6, backoff: 2.1, transition: 2.3, defeated: Infinity };
    const issues = [], visits = {};
    let st = b.s, since0 = game.crowd.time, lastHp = b.hp, t = 0, hits = 0, flagged = false;
    const steps = Math.round(seconds * 10);
    for (let i = 0; i < steps && b.s !== 'defeated'; i++) {
      if (Math.random() < 0.15) { const a = Math.random() * 6.28, r = 1.2 + Math.random() * 5; p.pos.set(b.n.pos.x + Math.sin(a) * r, 0, b.n.pos.z + Math.cos(a) * r); }
      if (Math.random() < hitRate) { window.__bossHit(Math.random() < 0.5 ? 'back' : 'front'); hits++; }
      p.health = 100; p.invuln = 0;
      step(0.1); t += 0.1;
      if (b.hp > lastHp) issues.push(`health rose ${lastHp} -> ${b.hp} at t=${t.toFixed(1)}`);
      lastHp = b.hp;
      // durations in game time (crowd clock), so pauses or slow frames cannot inflate them
      if (b.s !== st) { visits[st] = (visits[st] || 0) + 1; st = b.s; since0 = game.crowd.time; flagged = false; }
      const since = game.crowd.time - since0;
      if (!flagged && since > (bound[st] ?? 5) + 0.12) { issues.push(`${st} for ${since.toFixed(2)} s at t=${t.toFixed(1)}`); flagged = true; }
      if (i % 50 === 49) await sleep(1);
    }
    game.skipCinematics = false;
    return { name, simulated: +t.toFixed(1), hitsAttempted: hits, finalState: b.s, hp: b.hp, phase: b.phaseIdx + 1, visits, issues, pass: issues.length === 0 };
  };

  // Heap and GPU object counts across repeated retries of a boss fight (Chrome only for heap).
  window.__probeMemory = async (retries = 8) => {
    game.skipCinematics = true;
    const snap = () => ({ heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, geometries: game.renderer.info.memory.geometries, textures: game.renderer.info.memory.textures, programs: game.renderer.info.programs.length, sceneObjects: game.scene.children.length, npcs: game.crowd.npcs.length, worldFires: game.world.fires.length });
    const rows = [snap()];
    for (let i = 0; i < retries; i++) {
      window.__boss(i % 2 ? 'leader' : 'enforcer'); step(0.3);
      for (let k = 0; k < 40; k++) window.__botTick();
      game.player.takeDamage(1000, null, null); step(3);
      document.getElementById('btn-retry').click(); step(1);
      game.render();
      rows.push(snap());
      await sleep(50);
    }
    game.skipCinematics = false;
    return rows;
  };

  // Per-frame simulation and render cost while the bot fights (max and percentiles).
  window.__frameTimes = async (scenario = 'leader', frames = 300) => {
    if (scenario === 'enforcer' || scenario === 'leader') { game.skipCinematics = true; window.__boss(scenario); step(0.3); game.skipCinematics = false; }
    const gl = game.renderer.getContext(), up = [], rd = [];
    for (let i = 0; i < frames; i++) {
      game.player.health = 100; // keep the fight running (the officer stands still; the boss attacks)
      const t0 = performance.now(); game.update(1 / 60); const t1 = performance.now(); game.render(); gl.finish(); const t2 = performance.now();
      up.push(t1 - t0); rd.push(t2 - t1);
      if (i % 30 === 29) await sleep(1);
    }
    const stat = (a) => { const s = [...a].sort((x, y) => x - y); const q = (p) => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2); return { p50: q(0.5), p95: q(0.95), max: q(1) }; };
    return { scenario, frames, update: stat(up), render: stat(rd), total: stat(up.map((u, i) => u + rd[i])), programs: game.renderer.info.programs.length };
  };

  // HUD panels that overlap each other at the current viewport (only visible ones).
  // Officer's tear gas: a grenade aimed at a peaceful group lands near it as an officer cloud,
  // the group reacts, supply runs out at GAS.perPhase, refills on the next section, and a
  // boss fight refuses it without spending a grenade.
  window.__testGas = async ({ seed = 7 } = {}) => {
    const out = {};
    game.skipCinematics = true;
    window.__level(1); window.__start({ audio: false, seed }); step(3);
    const p = game.player, gear = p.gear, rig = game.cameraRig, crowd = game.crowd;
    const target = crowd.npcs.find((n) => n.temperament === 'peaceful' && n.state === 'act' && !n.script && Math.abs(n.pos.x) < 9);
    const D = 9;
    p.pos.set(target.pos.x, 0, target.pos.z + D); p.vel.set(0, 0, 0);
    rig.yaw = 0; rig.pitch = (D - 10) / 12 - 0.12; // looking north (-z), range D
    const gas0 = gear.gas, fear0 = target.fear || 0, aim = target.pos.clone(); // the target runs, so measure from where it stood
    out.thrown = gear.tryGas();
    step(2.5);
    const c = game.events.gasClouds.find((k) => k.source === 'officer');
    out.cloud = !!c;
    out.landedFromTarget = c ? +Math.hypot(c.pos.x - aim.x, c.pos.z - aim.z).toFixed(2) : null;
    out.spent = gas0 - gear.gas; out.statGas = game.missions.stats.gas;
    out.targetReacted = target.state === 'flee' || (target.fear || 0) > fear0;
    out.fledNearby = crowd.npcs.filter((n) => n.state === 'flee' && c && Math.hypot(n.pos.x - c.pos.x, n.pos.z - c.pos.z) < 14).length;
    for (let k = 0; k < 12 && gear.gas > 0; k++) { p.health = 100; p.staggerT = 0; gear.tryGas(); step(0.6); }
    out.emptyRefused = gear.tryGas() === false;
    // supply refills when the next section starts (Level 2)
    window.__level(2); step(1.5); gear.gas = 0; window.__jump(1); step(0.1);
    out.refilled = gear.gas;
    // no gas in a boss fight, and none is spent
    window.__boss('enforcer'); step(0.3);
    const before = gear.gas, clouds = game.events.gasClouds.length;
    out.bossRefused = gear.tryGas() === false && gear.gas === before;
    step(1); out.bossNoCloud = game.events.gasClouds.length <= clouds;
    game.skipCinematics = false;
    out.pass = out.thrown && out.cloud && out.landedFromTarget < 2.5 && out.spent === 1 && out.statGas >= 1 && out.targetReacted && out.emptyRefused && out.refilled === 3 && out.bossRefused && out.bossNoCloud;
    return out;
  };

  // Police barriers: the B preview places with B or a click (and the click is no baton
  // strike), bad spots are refused, someone walking through its line goes round it without
  // ever entering it, B beside it picks it up, and a boss fight clears barriers from its arena.
  window.__testBarriers = async ({ seed = 7 } = {}) => {
    const out = {};
    game.skipCinematics = true;
    window.__level(2); window.__start({ audio: false, seed }); step(1.5);
    const p = game.player, gear = p.gear, w = game.world, crowd = game.crowd, rig = game.cameraRig, inp = game.input;
    const press = (code) => { inp.setButton(code, true); step(1 / 60); inp.setButton(code, false); step(1 / 60); };
    const cols0 = w.colliders.length;
    // an open stretch of road: room for the barrier and for a walk through its line
    let spot = null;
    for (let z = -96; z < -60 && !spot; z += 1) for (let x = -6; x <= 6 && !spot; x += 1) {
      if (gear.placeProblem(x, z, 0)) continue;
      let clear = true;
      for (let dz = -4; dz <= 4 && clear; dz += 1) for (let dx = -3; dx <= 3; dx += 1) if (w.blocked(x + dx, z + dz, 0.4) && Math.abs(dz) > 0.5) { clear = false; break; }
      if (clear) spot = { x, z };
    }
    out.spot = spot;
    // preview, then place with a click: no baton strike from that click
    p.pos.set(spot.x, 0, spot.z + 2.4); p.vel.set(0, 0, 0); rig.yaw = 0;
    for (const n of crowd.query(spot.x, spot.z, 4, [])) if (n.id !== undefined) n.pos.set(n.pos.x + 9, 0, n.pos.z);
    step(0.1);
    press('KeyB'); out.previewShown = gear.placing && gear.ghost.visible;
    out.previewGreen = gear.ghost.material.color.getHex() === 0x50c878;
    inp.setButton('Mouse0', true); step(1 / 60); inp.setButton('Mouse0', false);
    out.placedByClick = gear.barriers.length === 1 && !gear.placing && !gear.ghost.visible;
    out.clickNoStrike = !p.attack;
    step(0.3);
    const b = gear.barriers[0], o = b && b.col.obb;
    out.blocksCentre = !!b && w.blocked(o.cx, o.cz, 0.1);
    out.projectileOver = !!b && !w.blocked(o.cx, o.cz, 0.05, 1.6);
    // refusals: inside a building, on top of someone
    out.refuseWall = !!gear.placeProblem(-30, spot.z, 0);
    const someone = crowd.npcs.find((n) => n.temperament === 'peaceful' && n.state !== 'gone');
    out.refusePerson = !!gear.placeProblem(someone.pos.x, someone.pos.z, 0);
    // someone walks straight through the barrier's line: they go round, never into it
    const walker = crowd.npcs.find((n) => n.temperament === 'peaceful' && !n.script && n.state !== 'gone' && n !== someone);
    const dest = { x: o.cx, y: 0, z: o.cz - 3.5 };
    walker.pos.set(o.cx + 0.2, 0, o.cz + 3.5); walker.vel.set(0, 0, 0); walker.march = null; walker.surge = null;
    crowd.setState(walker, 'walk');
    walker.script = { move: () => ({ speed: 1.6, dest }) };
    let inside = 0, reached = -1;
    for (let i = 0; i < 60 * 10 && reached < 0; i++) {
      p.pos.set(spot.x + 6, 0, spot.z); // out of the way
      step(1 / 60);
      const dx = walker.pos.x - o.cx, dz = walker.pos.z - o.cz;
      if (Math.abs(o.c * dx - o.s * dz) < o.hw && Math.abs(o.s * dx + o.c * dz) < o.hd) inside++;
      if (Math.hypot(walker.pos.x - dest.x, walker.pos.z - dest.z) < 1.0) reached = +(i / 60).toFixed(1);
    }
    walker.script = null;
    out.walkerReachedS = reached; out.walkerInsideFrames = inside;
    // pick it up again with B beside it
    p.pos.set(o.cx, 0, o.cz + 1.0); step(0.1);
    out.nearFound = !!gear.nearBarrier();
    press('KeyB');
    out.pickedUp = gear.barriers.length === 0 && gear.barrierHand === 4 && !w.blocked(o.cx, o.cz, 0.1) && w.colliders.length === cols0;
    // carried limit
    for (let k = 0; k < 4; k++) gear.barriers.length < 4 && gear.placeBarrier(spot.x - 4.5 + k * 2.6, spot.z - 6, 0);
    out.limit = gear.barrierHand === 0 && gear.barriers.length === 4;
    press('KeyB'); p.pos.set(spot.x + 6, 0, spot.z + 4); step(0.1); press('KeyB');
    out.emptyRefused = !gear.placing;
    // boss fight: barriers inside the arena go back to the officer, and none can be placed
    window.__level(2); step(0.5);
    const placed = gear.placeBarrier(-4, -12, 0);
    window.__jump(2); step(0.5);
    out.arenaCleared = !!placed && gear.barriers.length === 0 && gear.barrierHand === 4;
    out.arenaRefused = gear.placeProblem(0, -20, 0) === 'No barriers in this fight';
    // a restart removes everything
    window.__level(1); step(0.2);
    out.resetClean = gear.barriers.length === 0 && gear.barrierHand === 4 && !w.colliders.some((c) => c.tag === 'placed');
    game.skipCinematics = false;
    out.pass = !!spot && out.previewShown && out.previewGreen && out.placedByClick && out.clickNoStrike && out.blocksCentre && out.projectileOver && out.refuseWall && out.refusePerson
      && out.walkerReachedS > 0 && out.walkerInsideFrames === 0 && out.nearFound && out.pickedUp && out.limit && out.emptyRefused && out.arenaCleared && out.arenaRefused && out.resetClean;
    return out;
  };

  window.__hudLayout = () => {
    const ids = ['objective', 'compass', 'score-panel', 'bottom-left', 'minimap', 'boss-bar', 'controls-hint', 'hud-buttons', 'touch-buttons', 'stick-base', 'alerts'];
    const rects = ids.map((id) => { const el = document.getElementById(id); if (!el) return null; const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || r.height === 0 || el.closest('.hidden') ? null : { id, l: r.left, t: r.top, r: r.right, b: r.bottom }; }).filter(Boolean);
    const overlaps = [];
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (a.id === 'minimap' && b.id === 'bottom-left' || b.id === 'minimap' && a.id === 'bottom-left') continue; // minimap lives inside bottom-left
      const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (w > 2 && h > 2) overlaps.push([a.id, b.id, Math.round(w), Math.round(h)]);
    }
    const offscreen = rects.filter((r) => r.l < -1 || r.t < -1 || r.r > innerWidth + 1 || r.b > innerHeight + 1).map((r) => r.id);
    return { viewport: [innerWidth, innerHeight], visible: rects.map((r) => r.id), overlaps, offscreen };
  };
}
