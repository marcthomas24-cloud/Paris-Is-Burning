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
import * as THREE from 'three';
import { VAN } from './convoy.js';
import { HAZARD } from './hazards.js';
import { getShared } from './characters.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function installTests3(game) {
  const resume = () => { if (game.state === 'paused') { game._screen(null); game.state = 'playing'; game.audio.setPaused(false); } };
  const step = (s, fn) => { resume(); window.__step(s, fn); };
  const fresh = (seed = 5, section = null) => {
    if (game.level.id !== 3) window.__level(3);
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
      if (game.level.id !== 3) window.__level(3);
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
}
