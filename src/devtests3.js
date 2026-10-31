// Level 3 checks (developer builds only: loaded by dev.js with ?dev). Each returns plain data
// with a `pass` flag; run them on a page opened with ?dev&level=3&seed=N.
//   __vanSweep()              the van's footprint along both routes against every static collider
//   await __testVan()         stop rules, the damage table, the per-second cap, grace, who can and
//                             cannot damage it (peaceful people, ambient incidents, walls, range),
//                             failure and the retry's integrity floor
//   await __testHazards()     telegraph lengths, damage caps, escape, takedowns, lights and programs
//   await __testRadio()       the radio queue: one line at a time, urgent first, no repeats
//   await __testL3Checkpoints() fail in every section, RETRY SECTION, check what comes back
//   await __testRoutes()      the bot plays both routes to the results (cinematics skipped)
//   await __testFixer()       the Fixer: every phase's moves, the rush window and dodge, a rush into
//                             the van, no strike through an obstacle, the opening after a miss, the
//                             telegraphs, defeat, arrest and the escort going on
//   await __testL3Cinematics() each of the five sequences skipped and played through: control and
//                             camera come back, no damage, nothing attacks out of it
//   await __testL3Music()     the score's states and tiers through a full run; Level 2 unchanged
//   await __testRetryClean()  a retry leaves no banner, cinematic, sound or duck behind; volumes kept
import * as THREE from 'three';
import { VAN } from './convoy.js';
import { HAZARD } from './hazards.js';
import { getShared } from './characters.js';
import { FIXER, lintBoss } from './boss.js';
import { THEMES } from './music.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function installTests3(game) {
  const resume = () => { if (game.state === 'paused') { game._screen(null); game.state = 'playing'; game.audio.setPaused(false); } };
  const step = (s, fn) => { resume(); window.__step(s, fn); };
  const fresh = (seed = 5, section = null) => {
    if (game.level.id !== 3 || game.devStage !== null) window.__level(3); // (a dev stage left by __boss would restart into a fight)
    game.skipCinematics = true;
    window.__start({ audio: false, seed });
    step(1.4);
    if (section !== null) { game.missions.jumpToSection(section); step(0.2); }
    return game.missions;
  };
  // hold the officer at a point (and fully healed) while stepping
  const hold = (x, z) => () => { const p = game.player; p.pos.set(x, 0, z); p.vel.set(0, 0, 0); p.health = 100; };

  // ------------------------------------------------------------------ path clearance
  window.__vanSweep = () => {
    const m = game.level.id === 3 ? game.missions : fresh();
    const w = game.world, out = { pass: true };
    const rb = new Set((m.D.roadblock || []).flatMap((r) => r.cols)); // dragged clear before the van passes
    for (const r of ['A', 'B']) {
      const P = m.paths[r], hits = [];
      for (let s = 0; s <= P.total; s += 0.5) {
        const a = P.at(s - 1.6), b = P.at(s + 1.6), c = P.at(s);
        const h = Math.atan2(b.x - a.x, b.z - a.z), fx = Math.sin(h), fz = Math.cos(h), rx = fz, rz = -fx;
        let hit = null;
        for (const u of [-VAN.W / 2, 0, VAN.W / 2]) for (const v of [-VAN.L / 2, -1.5, 0, 1.5, VAN.L / 2]) {
          if (hit) break;
          const x = c.x + rx * u + fx * v, z = c.z + rz * u + fz * v, col = w.blockedBy(x, z, 0.05);
          if (col && col !== m.van.col && !rb.has(col)) hit = [+s.toFixed(1), +x.toFixed(1), +z.toFixed(1), col === true ? 'bounds' : col.tag];
        }
        if (hit) hits.push(hit);
      }
      out[r] = { length: +P.total.toFixed(1), holds: Object.fromEntries(Object.entries(P.holds).map(([k, v]) => [k, +v.toFixed(1)])), hits: hits.slice(0, 12), nHits: hits.length };
      if (hits.length) out.pass = false;
    }
    return out;
  };

  // ------------------------------------------------------------------ the van
  window.__testVan = async ({ seed = 5 } = {}) => {
    const out = {};
    let m = fresh(seed), van = m.van, crowd = game.crowd;
    const P = m.paths.A;
    m.enc.load([]); m.hz.reset(); // the van alone: no groups, no hazards
    // 1. it waits for the officer, then follows its path to the junction hold
    step(2, hold(20, 150));
    out.waitsForOfficer = { moved: +van.s.toFixed(2), reason: van.reason };
    m.rolled = true; van.limitS = P.holds.H1;
    // the officer walks 6 m behind it (one step call: each call renders a frame)
    const fw0 = V();
    step(30, () => { if (van.atHold()) return; van.fwd(fw0); game.player.pos.set(van.pos.x - fw0.x * 6, 0, van.pos.z - fw0.z * 6); game.player.health = 100; });
    out.followsToH1 = { atHold: van.atHold(), s: +van.s.toFixed(1), hold: +P.holds.H1.toFixed(1), z: +van.pos.z.toFixed(1) };
    await sleep(1);
    // 2. a person in its swept box stops it; it brakes within 1.5 m and goes on when they leave
    m = fresh(seed); van = m.van; crowd = game.crowd; m.enc.load([]); m.rolled = true; van.limitS = P.holds.H1;
    step(3, hold(-0.6, 168));
    const walker = crowd.npcs.find((n) => n.temperament === 'peaceful' && n.state !== 'gone');
    const f = van.fwd(V()), nose = van.front(V());
    walker.pos.set(nose.x + f.x * 4, 0, nose.z + f.z * 4); walker.vel.set(0, 0, 0); walker.script = { move: () => ({ speed: 0 }) };
    const s0 = van.s;
    step(3, hold(van.pos.x - f.x * 6, van.pos.z - f.z * 6));
    out.stopsForPerson = { travelledAfter: +(van.s - s0).toFixed(2), reason: van.reason, speed: +van.speed.toFixed(2), gapToPerson: +(van.distTo(walker.pos)).toFixed(2), horned: van.blockedT > 2 };
    walker.script = null; walker.pos.x += 12;
    const s1 = van.s; step(2, hold(van.pos.x - f.x * 6, van.pos.z - f.z * 6));
    out.goesOn = +(van.s - s1).toFixed(2);
    await sleep(1);
    // 3. an attacker near it stops it
    const att = crowd.npcs.find((n) => n.kind === 'looter' && n.state !== 'gone' && !n.script);
    crowd.makeHostile(att, 'melee', 'player'); att.pos.set(van.pos.x + 4, 0, van.pos.z); att.script = { move: () => ({ speed: 0 }) };
    step(0.5, () => { att.lastAggro = crowd.time; hold(van.pos.x - f.x * 6, van.pos.z - f.z * 6)(); });
    out.stopsForThreat = van.reason;
    att.script = null; att.temperament = 'peaceful'; att.attackStyle = null; att.pos.x += 40;
    await sleep(1);
    // 4. it waits when the officer is more than 20 m away
    step(1, hold(van.pos.x, van.pos.z - 30));
    out.stopsForAbsentOfficer = van.reason;

    await sleep(1);
    // 5. the damage table: fixed amounts, x1.5 with the officer far away, per-second cap, grace
    m = fresh(seed, 1); van = m.van; crowd = game.crowd; m.enc.load([]);
    step(VAN.grace + 0.2, hold(van.pos.x, van.pos.z - 7));
    const table = {};
    for (const k of ['melee', 'bash', 'projectile', 'petrol', 'breach']) {
      van.integrity = 100; van.tokens = VAN.cap;
      table[k] = +van.hit(k, van.pos.clone().add(V(2, 1, 0))).toFixed(2);
      step(1.2, hold(van.pos.x, van.pos.z - 7)); // refill the cap
    }
    out.damageTable = table;
    van.integrity = 100; van.tokens = VAN.cap;
    game.player.pos.set(van.pos.x, 0, van.pos.z - 40);
    out.farMultiplier = +van.hit('melee', van.pos).toFixed(2);
    step(1.2, hold(van.pos.x, van.pos.z - 7));
    van.integrity = 100; van.tokens = VAN.cap;
    let burst = 0; for (let i = 0; i < 12; i++) burst += van.hit('melee', van.pos);
    out.capOneFrame = +burst.toFixed(2);
    van.integrity = 100; let sec = 0;
    step(1, (i) => { hold(van.pos.x, van.pos.z - 7)(); if (i % 2 === 0) sec += van.hit('projectile', van.pos); });
    out.capPerSecond = +sec.toFixed(2);
    van.graceT = 2; out.duringGrace = van.hit('melee', van.pos); van.graceT = 0;
    van.parked = true; out.whileParked = van.hit('breach', van.pos); out.targetableParked = van.targetable(); van.parked = false;

    await sleep(1);
    // 6. who cannot damage it
    van.integrity = 100; van.tokens = VAN.cap;
    const before = van.integrity;
    // peaceful people pressed against it for 10 s
    const peace = crowd.npcs.filter((n) => n.temperament === 'peaceful' && n.state !== 'gone').slice(0, 6);
    step(10, () => { hold(van.pos.x, van.pos.z - 7)(); peace.forEach((n, i) => { const t = van.targetFor(n); n.pos.set(t.pos.x + (i % 2) * 0.2, 0, t.pos.z); }); });
    out.peacefulPressedAgainstIt = +(before - van.integrity).toFixed(2);
    // ambient incidents landing on it: a petrol bomb from a zone, a car fire beside it
    game.events.molotovAt(van.pos.clone()); game.events.carFire(van.pos.clone().add(V(3, 1, 0)));
    step(4, hold(van.pos.x, van.pos.z - 12));
    out.ambientIncidents = +(before - van.integrity).toFixed(2);
    // a stone that hits a wall (or the ground) 3 m away, and one that strikes its side
    out.stoneOnWall = van.projectileImpact(van.pos.clone().add(V(3.2, 1.2, 0)));
    out.stoneOverRoof = van.projectileImpact(van.pos.clone().add(V(0, VAN.H + 0.6, 0)));
    out.stoneOnSide = +van.projectileImpact(van.pos.clone().add(V(VAN.W / 2 + 0.1, 1.2, 0))).toFixed(2);
    // a crew strike from out of reach misses (melee range 1.75 m to its side)
    const far = crowd.npcs.find((n) => n.kind === 'looter' && n.state !== 'gone' && !n.script);
    crowd.makeHostile(far, 'melee', 'vehicle'); far.pos.set(van.pos.x + VAN.W / 2 + 3, 0, van.pos.z); far.script = { move: () => ({ speed: 0 }) };
    far.targetRef = van.targetFor(far); crowd.setState(far, 'atk_wind', 0.5);
    const iFar = van.integrity; step(1, hold(van.pos.x, van.pos.z - 7));
    out.strikeFromOutOfReach = +(iFar - van.integrity).toFixed(2);
    far.pos.set(van.pos.x + VAN.W / 2 + 0.8, 0, van.pos.z); far.targetRef = van.targetFor(far); crowd.setState(far, 'atk_wind', 0.5); van.tokens = VAN.cap;
    const iNear = van.integrity; step(0.7, hold(van.pos.x, van.pos.z - 7));
    out.strikeInReach = +(iNear - van.integrity).toFixed(2);
    far.script = null; far.temperament = 'peaceful'; far.attackStyle = null; far.pos.x += 40;

    await sleep(1);
    // 7. failure, and the retry
    van.integrity = 2; van.tokens = VAN.cap;
    van.hit('melee', van.pos);
    step(3);
    out.failure = { ended: m.ended, title: document.getElementById('end-title').textContent, retryShown: !document.getElementById('btn-retry').classList.contains('hidden'), sub: document.getElementById('end-sub').textContent };
    const cp = m.cp; game.restart(); game.missions.resume(cp); step(0.3);
    out.retry = { section: game.missions.section, integrity: Math.round(game.missions.van.integrity), atSectionStart: Math.abs(game.missions.van.s - cp.vanS) < 0.01, state: game.state };
    game.skipCinematics = false;
    const t = out.damageTable;
    out.pass = out.waitsForOfficer.moved < 0.01 && out.followsToH1.atHold && out.stopsForPerson.reason === 'blocked' && out.stopsForPerson.travelledAfter < 3 && out.stopsForPerson.gapToPerson > 0.5 && out.goesOn > 1
      && out.stopsForThreat === 'threat' && out.stopsForAbsentOfficer === 'officer'
      && t.melee === VAN.dmg.melee && t.bash === VAN.dmg.bash && t.projectile === VAN.dmg.projectile && t.petrol === VAN.dmg.petrol && t.breach === VAN.dmg.breach
      && out.farMultiplier === VAN.dmg.melee * VAN.farMul && out.capOneFrame <= VAN.cap + 0.01 && out.capPerSecond <= VAN.cap * 1.05 + 0.01 && out.duringGrace === 0 && out.whileParked === 0 && !out.targetableParked
      && out.peacefulPressedAgainstIt === 0 && out.ambientIncidents === 0 && out.stoneOnWall === 0 && out.stoneOverRoof === 0 && out.stoneOnSide === VAN.dmg.projectile
      && out.strikeFromOutOfReach === 0 && out.strikeInReach === VAN.dmg.melee
      && out.failure.ended && out.failure.retryShown && out.retry.section === 1 && out.retry.integrity >= VAN.restoreMin && out.retry.atSectionStart && out.retry.state === 'playing';
    return out;
  };

  // ------------------------------------------------------------------ hazards
  window.__testHazards = async ({ seed = 6 } = {}) => {
    const out = {};
    const lights = () => { let n = 0; game.scene.traverse((o) => { if (o.isLight) n++; }); return n; };
    let m = fresh(seed, 1);
    game.render(); const l0 = lights(), p0 = game.renderer.info.programs.length;
    const hz = m.hz, crowd = game.crowd;
    // cook-off: standing at the centre, standing on the edge, walking out during the tell
    const ck = (id, pos) => { hz.reset(); return hz.add({ id, kind: 'cookoff', pos, r: 6.5, telegraph: 6.5, triggerVan: 0, triggerPlayer: 0 }); };
    let h = ck('c1', [-10, 300]); h.go = true;
    step(7, hold(-10, 300));
    out.cookoffCentre = { telegraph: hz.log.filter((e) => e[1] === 'c1').map((e) => e[0]), dealt: +(h.dealt || 0).toFixed(1) };
    h = ck('c2', [-10, 300]); h.go = true; game.player.health = 100;
    let hp0 = 100; step(0.05, hold(-10, 300)); hp0 = game.player.health;
    // walk out at the officer's normal pace (no sprint) as soon as the tell starts
    const I = game.input; game.cameraRig.yaw = 0; // camera looks to -z: W walks north, out of the ring
    step(7, () => { I.keys.add('KeyW'); });
    I.keys.clear();
    out.cookoffWalkOut = { dealt: h.dealt || 0, hpLost: +(hp0 - game.player.health).toFixed(1), distAtBlast: +Math.hypot(game.player.pos.x + 10, game.player.pos.z - 300).toFixed(1) };
    await sleep(1);
    // crew in the ring go down (+150 each with the officer close), peaceful people are never struck
    h = ck('c3', [-6, 300]); h.go = true;
    const crew = crowd.npcs.filter((n) => n.kind === 'looter' && n.state !== 'gone' && !n.script).slice(0, 2);
    crew.forEach((n, i) => { crowd.makeHostile(n, 'melee', 'escort'); n.pos.set(-6 + i, 0, 301); n.script = { move: () => ({ speed: 0 }) }; });
    const bystander = crowd.npcs.find((n) => n.temperament === 'peaceful' && n.state !== 'gone');
    bystander.pos.set(-5, 0, 299);
    const sc0 = m.score, peace0 = m.stats.peaceful;
    step(7, () => { hold(1.5, 300)(); crew.forEach((n) => { n.lastAggro = crowd.time; }); });
    crew.forEach((n) => { n.script = null; });
    out.cookoffTakedown = { takedowns: h.takedowns, neutralised: crew.filter((n) => n.neutralized).length, score: m.score - sc0, peacefulStruck: m.stats.peaceful - peace0, bystanderState: bystander.state, bystanderDist: +Math.hypot(bystander.pos.x + 6, bystander.pos.z - 300).toFixed(1) };
    await sleep(1);
    // scaffold: standing under it, and stepping out during the tell
    m = fresh(seed, 1); m._takeRoute('B'); const hzB = m.hz;
    const sf = hzB.get('scaffold');
    step(1.4, hold(44, 292));
    out.scaffoldUnder = { states: hzB.log.filter((e) => e[1] === 'scaffold').map((e) => [e[0], e[2]]), dealt: +(sf.dealt || 0).toFixed(1), rubble: !!hzB.rubbleCol };
    m = fresh(seed, 1); m._takeRoute('B');
    const sf2 = m.hz.get('scaffold');
    step(0.05, hold(44, 292));
    step(1.4, () => { game.player.pos.set(39.5, 0, 292); game.player.health = 100; });
    out.scaffoldStepOut = { dealt: sf2.dealt || 0, state: sf2.state };
    await sleep(1);
    // petrol trail: lit if the igniter is left alone, cold if he is struck while lighting; the van holds before it
    m = fresh(seed, 1); m._takeRoute('B');
    const tr = m.hz.get('trail');
    out.trailBlocksVan = m.hz.zones().some((z) => Math.abs(z.z - 312) < 1);
    tr.state = 'telegraph'; tr.t = 0; m.hz._log(tr);
    step(2.4, hold(40, 300));
    out.trailLit = { state: tr.state, flames: game.effects.flames.length };
    step(8.2, hold(40, 300));
    out.trailBurnsOut = tr.state;
    m = fresh(seed, 1); m._takeRoute('B');
    const tr2 = m.hz.get('trail'); m.hz.lightTrail(tr2); step(1.0, hold(40, 300));
    m.hz.defuseTrail(tr2, true);
    out.trailStruckInTime = { state: tr2.state, prevented: tr2.prevented, flames: game.effects.flames.filter((f) => Math.abs(f.pos.z - 312) < 1).length };
    await sleep(1);
    // fireworks: everyone who runs is a peaceful person, and stays one
    m = fresh(seed, 3);
    const fw = m.hz.add({ id: 'fw', kind: 'fireworks', at: [-14, 399], over: [-30, 394], from: [-47, 360, -18, 426], lane: [-34, 371, 30, 385], endX: 34, count: 18, telegraph: 1.0, smokeS: 12 });
    m.hz.primeFireworks(fw); step(1.2, hold(20, 400));
    const runners = fw.runners || [];
    step(8, hold(20, 400));
    out.fireworks = { telegraphS: fw.telegraph, runners: runners.length, allPeaceful: runners.every((n) => n.temperament === 'peaceful'), madeHostile: runners.filter((n) => n.temperament === 'hostile').length };
    game.render();
    out.lights = { before: l0, after: lights() };
    // (the program count also moves as new characters come into view, as in Level 2's fights:
    // reported, while the check is that every hazard mesh uses an existing material instance)
    out.programs = { before: p0, after: game.renderer.info.programs.length };
    const W = game.world.materials, ring = getShared().M.ringBlue;
    out.materialsShared = m.hz.decals.every((d) => d.material === ring) && m.hz.sheen.material === game.world.puddleMat && m.hz.rubble.children.every((c) => c.material === W.wood || c.material === W.metal);
    out.telegraphs = { cookoff: 6.5, trail: 2.2, scaffold: 1.2, fireworks: 1.0 };
    game.skipCinematics = false;
    const span = out.cookoffCentre.telegraph;
    out.pass = span.length >= 3 && span[2] - span[1] >= 1.0 && out.cookoffCentre.dealt > 0 && out.cookoffCentre.dealt <= HAZARD.blastMax && out.cookoffWalkOut.dealt === 0
      && out.cookoffTakedown.neutralised === 2 && out.cookoffTakedown.peacefulStruck === 0 && out.cookoffTakedown.score >= 2 * HAZARD.takedown
      && out.scaffoldUnder.dealt === HAZARD.scaffoldDmg && out.scaffoldUnder.rubble && out.scaffoldStepOut.dealt === 0
      && out.trailBlocksVan && out.trailLit.state === 'active' && out.trailBurnsOut === 'spent' && out.trailStruckInTime.state === 'spent' && out.trailStruckInTime.flames === 0
      && out.fireworks.runners > 0 && out.fireworks.allPeaceful && Object.values(out.telegraphs).every((t) => t >= 1.0)
      && out.lights.before === out.lights.after && out.materialsShared;
    return out;
  };

  // ------------------------------------------------------------------ radio
  window.__testRadio = async ({ seed = 5 } = {}) => {
    const m = fresh(seed, 1); const out = {};
    m.radioQ.length = 0; m.radioLog.length = 0; m.radioSaid = {}; m.radioGap = 0;
    m.say('routeA'); m.say('barricade'); m.say('gate'); m.say('dmg50', 2); m.say('routeA'); m.say('alone', 1, 30);
    step(10);
    m.say('alone', 1, 30); // within its 30 s cooldown: dropped
    step(25);
    m.say('alone', 1, 30); // after it: played again
    step(10);
    out.order = m.radioLog.map((e) => e.key);
    const gaps = []; for (let i = 1; i < m.radioLog.length; i++) gaps.push(+(m.radioLog[i].t - (m.radioLog[i - 1].t + m.radioLog[i - 1].dur)).toFixed(2));
    out.minGap = Math.min(...gaps);
    out.pass = out.order[0] === 'dmg50' && out.order.filter((k) => k === 'routeA').length === 1 && out.order.filter((k) => k === 'alone').length === 2 && out.minGap >= 0.79 && out.order.length === 6;
    game.skipCinematics = false;
    return out;
  };

  // ------------------------------------------------------------------ checkpoints
  window.__testL3Checkpoints = async ({ seed = 5 } = {}) => {
    const rows = [];
    for (let s = 0; s < 6; s++) {
      for (const route of s >= 2 ? ['A', 'B'] : ['A']) {
        const m = fresh(seed, s);
        if (s >= 2 && route === 'B') { m.resume({ section: s, route: 'B' }); step(0.2); }
        step(VAN.grace + 0.5);
        const cp = m.cp, sBefore = m.van.s;
        m.score += 333; m.van.integrity = 15; m.flags.test = true; // things a retry must put back
        m.fail('test failure'); step(3);
        const ended = game.state === 'ended';
        game.restart(); game.missions.resume(cp); step(0.3);
        const r = game.missions;
        const enc = Object.values(r.enc.state);
        await sleep(1);
        rows.push({ section: s, route, ended, back: r.section, routeKept: r.route === cp.route, integrity: Math.round(r.van.integrity), vanAtStart: Math.abs(r.van.s - cp.vanS) < 0.5 /* it may already be rolling */, vanS: +sBefore.toFixed(1), score: r.score === cp.score, flagsCleared: !r.flags.test, encountersFresh: enc.every((e) => e.status === 'waiting' || e.status === 'active'), roadblockOpen: (r.D.roadblock || []).every((x) => x.cols.every((c) => c.off)), playing: game.state === 'playing' });
      }
    }
    game.skipCinematics = false;
    const pass = rows.every((x) => x.ended && x.back === x.section && x.routeKept && x.integrity >= VAN.restoreMin && x.vanAtStart && x.score && x.flagsCleared && x.encountersFresh && x.playing && (x.section >= 2 && x.route === 'A' ? x.roadblockOpen : x.section < 2 ? !x.roadblockOpen : true));
    return { pass, rows };
  };

  // ------------------------------------------------------------------ both routes, start to finish
  window.__testRoutes = async ({ seed = 5, routes = ['A', 'B'] } = {}) => {
    const out = { runs: {} };
    for (const r of routes) {
      window.__level(3); // from the start, whatever dev stage an earlier test left
      window.__route(r);
      const res = await window.__auditRun({ seed });
      const m = game.missions;
      out.runs[r] = {
        title: res.title, t: res.t, score: res.score, route: m.route, sections: res.sections, issues: res.issues, shortfall: res.shortfall, encountersStarted: res.encountersStarted,
        encounters: Object.fromEntries(Object.entries(m.enc.state).map(([k, v]) => [k, v.status])), van: Math.round(m.van.integrity), vanIncidents: m.van.incidents,
        radio: m.radioLog.map((e) => e.key).filter(Boolean), minHp: res.minHp, stats: res.stats, errors: res.errors,
      };
      await sleep(20);
    }
    const ok = (x) => x && x.title === 'LEVEL 3 COMPLETE' && x.issues.length === 0 && x.shortfall === 0 && x.sections.map((s) => s[0]).join() === '0,1,2,3,4,5';
    out.pass = routes.every((r) => ok(out.runs[r]) && out.runs[r].route === r);
    return out;
  };

  // ------------------------------------------------------------------ the Fixer
  // An open stretch of the arena: the boss at (6, 430) facing the officer to his west.
  const fight = (seed = 5) => {
    game.skipCinematics = true;
    window.__level(3);
    window.__start({ audio: false, seed });
    game.input.keys.clear(); game.input.buttons.clear(); // nothing left held by a bot run before
    window.__boss('fixer'); step(1.3); // past his introduction
    return game.missions.boss;
  };
  const pin = (b, bx, bz, px, pz) => () => { b.n.pos.set(bx, 0, bz); b.n.vel.set(0, 0, 0); const p = game.player; p.pos.set(px, 0, pz); p.vel.set(0, 0, 0); p.knock.set(0, 0, 0); };
  // wind one attack by hand and step until it has resolved (strike or run logged)
  const force = (b, a, hold, maxS = 3) => {
    b.s = 'idle'; b.cool = 99; b.queue = []; b.curRecScale = 1; b.backTo = null;
    const n0 = b.log.length; b._wind({ ...a });
    for (let i = 0; i < maxS * 60 && b.log.length === n0; i++) step(1 / 60, hold);
    return b.log[b.log.length - 1];
  };

  window.__testFixer = async ({ seed = 5 } = {}) => {
    const out = { lint: lintBoss(FIXER) };
    const A = FIXER.attacks;
    // 1. every phase, bot-played: which moves he uses, the largest hit, every telegraph
    out.phases = [];
    for (let ph = 0; ph < 3; ph++) {
      const b = fight(seed + ph);
      while (b.phaseIdx < ph) { window.__bossHit('back'); if (b.s === 'transition') step(2.4); }
      const visits = {}; let prev = b.s, feints = 0; const log0 = b.log.length;
      for (let i = 0; i < 400; i++) {
        window.__botTick();
        if (b.s !== prev) { visits[b.s] = (visits[b.s] || 0) + 1; if (b.s === 'feint') feints++; prev = b.s; }
        if (b.hp <= (FIXER.phases[ph + 1] ? FIXER.phases[ph + 1].from + 1 : 2)) b.hp = FIXER.phases[ph].from; // stay in this phase
        if (game.player.health < 40) game.player.health = 100;
        if (i % 40 === 39) await sleep(1);
      }
      const log = b.log.slice(log0);
      out.phases.push({ phase: ph + 1, kinds: [...new Set(log.map((e) => e.kind))], strikes: log.length, maxDealt: Math.max(0, ...log.map((e) => e.dealt)), minWind: Math.min(...log.map((e) => e.wind)), minUnblockableWind: Math.min(9, ...log.filter((e) => !e.blockable).map((e) => e.wind)), visits, feints });
    }
    await sleep(1);
    // 2. the rush: launch to contact at several distances, and a sideways dodge at the launch
    out.rush = [];
    for (const D of [5.6, 6.5, 8]) {
      const b = fight(seed), p = game.player, I = game.input;
      const hold = pin(b, 6, 430, 6 - D, 430);
      hold(); p.health = 100; p.invuln = 0;
      let t = 0, launch = -1, contact = -1;
      b.s = 'idle'; b.cool = 99; b._wind({ ...A.rush });
      for (let i = 0; i < 240; i++) { if (launch < 0) hold(); step(1 / 60); t += 1 / 60; if (b.s === 'charge' && launch < 0) launch = t; if (launch >= 0 && contact < 0 && p.health < 100) { contact = t; break; } if (launch >= 0 && b.s !== 'charge') break; }
      const row = { distance: D, launchToContact: contact > 0 ? +(contact - launch).toFixed(2) : null, dealt: 100 - p.health };
      // the same rush, dodged sideways as it launches
      const b2 = fight(seed), hold2 = pin(b2, 6, 430, 6 - D, 430);
      hold2(); p.health = 100; p.invuln = 0; game.cameraRig.yaw = -Math.PI / 2; // looking east, at him
      b2.s = 'idle'; b2.cool = 99; b2._wind({ ...A.rush });
      let dodged = false;
      for (let i = 0; i < 240; i++) {
        if (b2.s !== 'charge') hold2();
        if (b2.s === 'charge' && !dodged) { dodged = true; I.keys.add('KeyD'); I.edges.add('Space'); }
        step(1 / 60); I.keys.delete('KeyD');
        if (dodged && b2.s !== 'charge') break;
      }
      row.dodgedDealt = 100 - p.health; row.recAfterMiss = +b2.dur.toFixed(2); row.stateAfter = b2.s;
      out.rush.push(row);
      await sleep(1);
    }
    // 3. a rush into the parked van: he is stunned, the officer untouched
    {
      const b = fight(seed), p = game.player, van = game.missions.van;
      const f = van.fwd(V()), r = V(f.z, 0, -f.x); // across the van
      const hold = pin(b, van.pos.x + r.x * 6, van.pos.z + r.z * 6, van.pos.x - r.x * 3, van.pos.z - r.z * 3);
      hold(); p.health = 100;
      b.s = 'idle'; b.cool = 99; b._wind({ ...A.rush });
      for (let i = 0; i < 240 && b.s !== 'stun'; i++) { if (b.s !== 'charge') hold(); else { p.pos.set(van.pos.x - r.x * 3, 0, van.pos.z - r.z * 3); } step(1 / 60); }
      out.rushIntoVan = { state: b.s, officerHp: p.health, frontHit: b.s === 'stun' ? window.__bossHit('front').result : 'n/a', vanIntegrity: Math.round(van.integrity) };
    }
    await sleep(1);
    // 4. no strike through an obstacle: a kick with a wall between them, then the same kick without it
    {
      const b = fight(seed), p = game.player, w = game.world;
      const hold = () => { pin(b, 6, 430, 3.8, 430)(); p.health = 100; p.invuln = 0; };
      const wall = w.addObstacle(4.9, 430, 0.3, 3, 0, 2, 'test');
      const e1 = force(b, A.kick, hold);
      w.removeCollider(wall);
      step(1.5, hold);
      const e2 = force(b, A.kick, hold);
      out.throughGeometry = { withWall: { wall: !!e1.wall, dealt: e1.dealt }, without: { dealt: e2.dealt } };
    }
    await sleep(1);
    // 5. the opening after a miss: a kick from out of reach leaves a longer recovery than one that lands
    {
      const b = fight(seed);
      const far = () => { pin(b, 6, 430, 6 - 3.3, 430)(); game.player.health = 100; game.player.invuln = 0; };
      force(b, A.kick, far); step(0.13, far);
      const missDur = b.s === 'rec' ? b.dur : null;
      step(2, far);
      const near = () => { pin(b, 6, 430, 6 - 2.0, 430)(); game.player.health = 100; game.player.invuln = 0; };
      const e = force(b, A.kick, near); step(0.13, near);
      out.missOpening = { missRec: missDur && +missDur.toFixed(2), hitRec: b.s === 'rec' ? +b.dur.toFixed(2) : null, hitDealt: e.dealt };
    }
    await sleep(1);
    // 6. defeat, arrest, the escort goes on
    {
      const b = fight(seed), m = game.missions, p = game.player, I = game.input;
      const sc0 = m.score;
      for (let k = 0; k < 40 && b.s !== 'defeated'; k++) { window.__bossHit('back'); if (b.s === 'transition') step(2.4); }
      step(0.5);
      const defeated = b.s === 'defeated', hud = m.hudInfo().text;
      p.pos.set(b.n.pos.x + 1.4, 0, b.n.pos.z); step(0.1);
      I.edges.add('KeyE'); step(0.2);
      out.arrest = { defeated, hudDown: hud, arrested: b.n.arrested, section: m.section, stage: m.stage, bossCleared: !m.boss, arena: !!game.crowd.arena, vanParked: m.van.parked, time: m.bossTimes.fixer !== undefined, scoreGain: m.score - sc0 };
    }
    game.skipCinematics = false;
    const P = out.phases;
    out.pass = out.lint.length === 0
      && P.every((x) => x.maxDealt <= 25 && x.minWind >= 0.55 && x.minUnblockableWind >= 0.6)
      && P[0].kinds.includes('jab') && (P[0].visits.shift || P[0].visits.backoff) && !P[0].kinds.includes('rush')
      && P[1].kinds.includes('rush') && P[2].kinds.includes('kick')
      && out.rush.every((r) => r.launchToContact === null || r.launchToContact >= 0.45) && out.rush.every((r) => r.dodgedDealt === 0 && r.recAfterMiss > A.rush.rec)
      && out.rushIntoVan.state === 'stun' && out.rushIntoVan.officerHp === 100 && out.rushIntoVan.frontHit === 'hit'
      && out.throughGeometry.withWall.wall && out.throughGeometry.withWall.dealt === 0 && out.throughGeometry.without.dealt > 0
      && out.missOpening.missRec > out.missOpening.hitRec && out.missOpening.hitDealt > 0
      && out.arrest.defeated && out.arrest.arrested && out.arrest.section === 5 && out.arrest.stage === 'route' && out.arrest.bossCleared && !out.arrest.arena && !out.arrest.vanParked && out.arrest.time && out.arrest.scoreGain >= 1500;
    return out;
  };

  // ------------------------------------------------------------------ cinematics
  // Each sequence started through the game's own path, then skipped part-way (Space, as a player
  // would) or played through. After it: no cinematic, the letterbox gone, the HUD back, the camera
  // easing back to the follow camera's field of view, no damage taken, the mission moved on, and
  // nothing attacks out of it straight away (the Fixer holds his ground for a second).
  window.__testL3Cinematics = async ({ seed = 5 } = {}) => {
    const rows = [], I = game.input;
    const setups = {
      transfer: () => { window.__level(3); window.__start({ audio: false, seed }); step(1.3); },
      fixerGlimpse: () => { window.__level(3); window.__start({ audio: false, seed }); step(0.2); game.missions.jumpToSection(3); step(0.2); game.missions._glimpse(); },
      fixer: () => { window.__level(3); window.__start({ audio: false, seed }); window.__boss('fixer'); step(0.05); },
      custody: () => { window.__level(3); window.__start({ audio: false, seed }); game.skipCinematics = true; window.__boss('fixer'); step(1.2); const b = game.missions.boss; for (let k = 0; k < 40 && b.s !== 'defeated'; k++) { window.__bossHit('back'); if (b.s === 'transition') step(2.4); } step(0.4); game.player.pos.set(b.n.pos.x + 1.4, 0, b.n.pos.z); step(0.1); game.skipCinematics = false; I.edges.add('KeyE'); step(1 / 60); },
      victory: () => { window.__level(3); window.__start({ audio: false, seed }); step(0.2); game.missions.jumpToSection(5); step(0.3); game.missions._victory(); },
    };
    for (const [id, setup] of Object.entries(setups)) {
      for (const mode of ['skip', 'watch']) {
        game.skipCinematics = false;
        setup();
        const c = game.cinematic, m = game.missions, p = game.player;
        const row = { id, mode, started: !!c && c.id === id, total: c ? +c.total.toFixed(1) : 0 };
        if (!row.started) { rows.push(row); continue; }
        const hp0 = p.health, log0 = m.boss ? m.boss.log.length : 0;
        let dmg = 0, endT = null;
        const watchHp = () => { if (p.health < hp0) dmg = hp0 - p.health; if (endT === null && !game.cinematic) endT = m.t; };
        const at = mode === 'skip' ? 0.4 + Math.random() * Math.max(0.1, c.total - 0.8) : c.total + 1;
        step(Math.min(at, c.total + 0.5), watchHp);
        if (mode === 'skip' && game.cinematic) { I.edges.add('Space'); const d0 = p.dodgeT; step(1 / 60, watchHp); row.skipDodged = p.dodgeT > d0 + 0.01; }
        step(0.05, watchHp);
        row.ended = !game.cinematic && document.getElementById('cine').classList.contains('hidden') && !document.getElementById('app').classList.contains('cine-on');
        row.at = +at.toFixed(2);
        // the moments after: attacks (the Fixer holds his ground for a second, then needs a full wind-up)
        step(1.35, watchHp);
        if (id === 'fixer') { const b = m.boss; row.bossState = b && b.s; row.strikesSoon = b ? b.log.length - log0 : null; }
        const rig = game.cameraRig; step(0.5, watchHp);
        row.fovBack = Math.abs(game.camera.fov - (rig.lastPose ? rig.lastPose.fov : game.camera.fov)) < 2;
        row.damage = +dmg.toFixed(1);
        row.stage = m.stage; row.section = m.section;
        if (id === 'transfer') row.radioWaited = m.radioLog.length > 0 && m.radioLog.every((e) => e.t >= endT - 0.02);
        if (id === 'fixerGlimpse') row.glimpsed = !!m.flags.glimpsed;
        if (id === 'victory') { step(3); row.ended3 = m.ended && game.state === 'ended'; }
        row.pass = row.ended && row.damage === 0 && !row.skipDodged && row.fovBack
          && (id !== 'transfer' || (m.stage === 'route' && row.radioWaited)) && (id !== 'fixerGlimpse' || (m.stage === 'route' && row.glimpsed))
          && (id !== 'fixer' || (row.bossState !== 'intro' && row.strikesSoon === 0)) && (id !== 'custody' || (m.section === 5 && m.stage === 'route')) && (id !== 'victory' || row.ended3);
        rows.push(row);
        await sleep(2);
      }
    }
    game.skipCinematics = false;
    return { pass: rows.every((r) => r.pass), rows };
  };

  // ------------------------------------------------------------------ the score
  // The music's state and tier through a whole bot run (sound on: the mixer only drives the music
  // when audio is running; seeded, but the sound effects draw random numbers, so this run is not
  // the reference run): it starts restrained, builds act by act, has its boss states, ends on the
  // victory; Level 2 keeps its own theme and no tiers.
  window.__testL3Music = async ({ seed = 5 } = {}) => {
    const mu = game.audio.music, trace = [];
    game.audio.init();
    window.__level(3); // from the start, whatever dev stage an earlier test left
    mu.setTier(0);
    const origS = mu.setState.bind(mu), origT = mu.setTier.bind(mu);
    mu.setState = (s) => { if (s !== mu.state) trace.push(['state', s, game.missions.section]); return origS(s); };
    mu.setTier = (k) => { if (k !== mu.tier) trace.push(['tier', k, game.missions.section]); return origT(k); };
    const settings0 = JSON.stringify(game.audio.getSettings());
    let r;
    try { window.__route('A'); r = await window.__runToEnd({ seed, audio: true }); } finally { mu.setState = origS; mu.setTier = origT; }
    const states = trace.filter((x) => x[0] === 'state').map((x) => x[1]), tiers = trace.filter((x) => x[0] === 'tier').map((x) => x[1]);
    const out = { title: r.title, theme: mu.theme === THEMES.l3 ? 'l3' : 'other', states, tiers, firstState: states[0], lastState: states[states.length - 1], settingsKept: JSON.stringify(game.audio.getSettings()) === settings0 };
    window.__level(2); step(0.5);
    out.level2 = { theme: mu.theme === THEMES.l2 ? 'l2' : 'other', tier: mu.tier };
    window.__level(3); step(0.2);
    out.pass = out.title === 'LEVEL 3 COMPLETE' && out.theme === 'l3' && tiers.join() === '1,2,3' && states.includes('boss') && states.includes('boss3') && out.lastState === 'victory'
      && states.indexOf('boss3') > states.indexOf('boss') && out.settingsKept && out.level2.theme === 'l2' && out.level2.tier === 0;
    return out;
  };

  // ------------------------------------------------------------------ retries leave nothing behind
  // Sound on: a phase banner up, a hazard hissing, the music ducked under a radio line and a cinematic
  // playing when the officer goes down; RETRY SECTION must bring back none of it, and keep the volumes.
  window.__testRetryClean = async () => {
    const a = game.audio;
    a.init();
    const settings0 = JSON.stringify(a.getSettings());
    game.skipCinematics = true;
    window.__level(3); window.__start({ audio: true }); window.__boss('fixer'); step(1.3);
    const m = game.missions, b = m.boss;
    while (b.phaseIdx < 1) { window.__bossHit('back'); }
    const bannerUp = document.getElementById('banner').classList.contains('show');
    a.hiss(game.player.pos, 6); a.radio(true, 6); a.music.sting('phase');
    const mine = new Set(a.voices.filter((v) => v.pri >= 0)); // the sounds of the run that is about to fail
    const before = { banner: bannerUp, voices: mine.size };
    game.skipCinematics = false;
    m._fixerIntro(b.n); // a cinematic on screen as well
    const cineBefore = !!game.cinematic;
    m.fail('test failure'); step(3); // (the officer cannot be hurt while it plays: fail the run directly)
    game.skipCinematics = true; // the retry would replay his introduction: keep it out of the check
    document.getElementById('btn-retry').click(); step(0.3);
    const after = {
      banner: document.getElementById('banner').classList.contains('show'), oldVoicesStillPlaying: [...mine].filter((v) => v.pri >= 0).length,
      cinematic: game.cinematic ? game.cinematic.id : null, letterbox: !document.getElementById('cine').classList.contains('hidden'), cineOn: document.getElementById('app').classList.contains('cine-on'),
      pending: a.pending.length, state: game.state, fight: !!m.boss && m.boss.phaseIdx === 0 && m.boss.hp === FIXER.hp, settingsKept: JSON.stringify(a.getSettings()) === settings0,
    };
    game.skipCinematics = false;
    return { before: { ...before, cinematic: cineBefore }, after, ctxState: a.ctx.state, pass: before.banner && before.voices > 0 && cineBefore && !after.banner && after.oldVoicesStillPlaying === 0 && !after.cinematic && !after.letterbox && !after.cineOn && after.state === 'playing' && after.fight && after.settingsKept };
  };
}
