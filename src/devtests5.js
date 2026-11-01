// Quality-gate checks (developer builds only: loaded by dev.js with ?dev). Cross-level integration
// and the measurements behind the release report. Each returns plain data, with a `pass` flag
// where a pass or fail applies.
//   await __testVanQA()        the van: full condition, one attacker, six at once, the officer moving
//                              round it, a cinematic, one petrol bomb, the HUD bar, failure and retry
//   await __testProgression()  unlocks (1 -> 2 -> 3), the campaign screen's levels, CONTINUE, storage, locked refusal
//   await __testLeaks()        nothing of Level 3 (van, props, Fixer, crews, district, music) in Levels 1-2
//   await __testShortcuts()    the ?dev helpers: __level, __jump, __boss for every boss, stage names
//   await __perfL3()           frame cost at Level 3's heaviest moments, and memory across retries
//   await __traceObjectives(fn) objective text and marker sampled through every bot tick of fn()
import * as THREE from 'three';
import { VAN } from './convoy.js';
import { Progress } from './levels.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function installTests5(game) {
  const resume = () => { if (game.state === 'paused') { game._screen(null); game.state = 'playing'; game.audio.setPaused(false); } };
  const step = (s, fn) => { resume(); window.__step(s, fn); };
  const level3 = (seed, section) => {
    window.__level(3); game.skipCinematics = true; game.input.keys.clear(); game.input.buttons.clear();
    window.__start({ audio: false, seed }); step(1.4);
    if (section !== undefined) { game.missions.jumpToSection(section); step(0.2); }
    return game.missions;
  };
  const crew = (n = 1, not = []) => game.crowd.npcs.filter((x) => x.kind === 'looter' && x.state !== 'gone' && !x.script && !not.includes(x)).slice(0, n);
  const bar = () => { const el = document.querySelector('#incident-bar div'); return { width: el.style.width, red: el.style.background.includes('red') }; };

  // ------------------------------------------------------------------ the van
  window.__testVanQA = async ({ seed = 5 } = {}) => {
    const out = {};
    let m = level3(seed, 1), van = m.van;
    m.enc.load([]); m.hz.reset();
    const away = (d) => () => { const f = van.fwd(V()); game.player.pos.set(van.pos.x - f.x * d, 0, van.pos.z - f.z * d); game.player.vel.set(0, 0, 0); game.player.health = 100; };
    step(VAN.grace + 0.3, away(15));
    out.full = { integrity: van.integrity, bar: bar(), hud: m.hudInfo().detail };
    // one attacker beside it for 6 s, the officer 15 m off (crews go for the van past 12 m)
    const strike = (list, secs, hold) => {
      const log0 = van.log.length, i0 = van.integrity, f = van.fwd(V()), r = V(f.z, 0, -f.x);
      list.forEach((n, k) => { game.crowd.makeHostile(n, 'melee', 'vehicle'); const side = k % 2 ? 1 : -1; n.pos.set(van.pos.x + r.x * side * 3 + f.x * (k - 2), 0, van.pos.z + r.z * side * 3 + f.z * (k - 2)); n.vel.set(0, 0, 0); });
      const perSec = []; let acc = 0, last = van.integrity;
      step(secs, (i) => { hold(i); for (const n of list) n.lastAggro = game.crowd.time; if (i % 60 === 59) { perSec.push(+(last - van.integrity).toFixed(2)); last = van.integrity; } });
      acc = i0 - van.integrity;
      const entries = van.log.slice(log0);
      for (const n of list) { n.temperament = 'peaceful'; n.attackStyle = null; n.pos.x += 60; game.crowd.setState(n, 'calm'); }
      return { lost: +acc.toFixed(2), entries: entries.length, kinds: [...new Set(entries.map((e) => e[1]))], maxEntry: Math.max(0, ...entries.map((e) => e[2])), maxPerSec: Math.max(0, ...perSec) };
    };
    out.single = strike(crew(1), 6, away(15));
    van.integrity = VAN.max; van.tokens = VAN.cap; step(1.2, away(15));
    out.six = strike(crew(6), 5, away(15));
    van.integrity = VAN.max; van.tokens = VAN.cap; step(1.2, away(15));
    // the officer moving round the back of the van at 15 m while three attack it: same fixed amounts,
    // no far multiplier (kept south of the junction: walking into a street there chooses the route)
    let ang = 0;
    out.moving = strike(crew(3), 5, () => { ang += 0.012; const f = van.fwd(V()), r = V(f.z, 0, -f.x), s = Math.sin(ang), c = -Math.abs(Math.cos(ang)); game.player.pos.set(van.pos.x + r.x * s * 15 + f.x * c * 15, 0, van.pos.z + r.z * s * 15 + f.z * c * 15); game.player.health = 100; });
    van.integrity = VAN.max; van.tokens = VAN.cap; step(1.2, away(15));
    // during a cinematic: nothing lands
    game.skipCinematics = false;
    game.playCinematic({ id: 'qa', shots: [{ dur: 3.5, a: 'rig', b: 'rig' }] });
    out.cinematic = strike(crew(4), 3, away(15));
    if (game.cinematic) game.cinematic.finish(true, true);
    game.skipCinematics = true;
    step(0.5, away(15));
    // one petrol bomb beside it: one 12 burst, the pool after it, no repeat of the burst
    van.integrity = VAN.max; van.tokens = VAN.cap; step(1.2, away(15));
    {
      const f = van.fwd(V()), r = V(f.z, 0, -f.x), ground = V(van.pos.x + r.x * (VAN.W / 2 + 1.2), 0, van.pos.z + r.z * (VAN.W / 2 + 1.2));
      const log0 = van.log.length, inc0 = van.incidents;
      game.effects.ignite(ground, 2.6, 5); van.petrolBurst(ground);
      step(6, away(15));
      const e = van.log.slice(log0);
      out.petrol = { entries: e.map((x) => x[1] + ' ' + x[2]), bursts: e.filter((x) => x[1] === 'petrol').length, incidents: van.incidents - inc0, lost: +(VAN.max - van.integrity).toFixed(2) };
    }
    // the bar follows the integrity, red below 30 %
    van.integrity = 62; step(0.2, away(15)); out.bar62 = bar();
    van.integrity = 21; step(0.2, away(15)); out.bar21 = { ...bar(), hudText: m.hudInfo().detail };
    // failure and the checkpoint's floor
    van.integrity = 2; van.tokens = VAN.cap; van.hit('melee', van.pos); step(3);
    out.failure = { ended: m.ended, title: document.getElementById('end-title').textContent, retryShown: !document.getElementById('btn-retry').classList.contains('hidden') };
    document.getElementById('btn-retry').click(); step(0.3);
    m = game.missions; van = m.van;
    out.retry = { section: m.section, integrity: Math.round(van.integrity), state: game.state, bar: bar() };
    const S = out;
    // the budget refills at VAN.cap a second and holds VAN.cap: over T seconds at most cap * T + cap
    const within = (x, secs) => x.maxPerSec <= 2 * VAN.cap + 0.01 && x.lost <= VAN.cap * secs + VAN.cap + 0.01;
    out.pass = S.full.integrity === VAN.max && S.full.bar.width === '100%'
      && S.single.entries > 0 && S.single.maxEntry <= VAN.dmg.melee && within(S.single, 6)
      && S.six.entries > 0 && S.six.maxEntry <= VAN.dmg.melee && within(S.six, 5)
      && S.moving.entries > 0 && S.moving.maxEntry <= VAN.dmg.melee && within(S.moving, 5)
      && S.cinematic.lost === 0 && S.cinematic.entries === 0
      && S.petrol.bursts === 1 && S.petrol.incidents <= 2
      && S.bar62.width === '62%' && !S.bar62.red && S.bar21.width === '21%' && S.bar21.red
      && S.failure.ended && S.failure.retryShown && S.retry.section === 1 && S.retry.integrity >= VAN.restoreMin && S.retry.state === 'playing';
    return out;
  };

  // ------------------------------------------------------------------ progression
  window.__testProgression = async () => {
    const KEY = 'parisBurning.progress.v1';
    let saved = null; try { saved = localStorage.getItem(KEY); } catch (e) { /* blocked */ }
    const out = {};
    // a level is open on the campaign screen (which replaced the menu's level buttons)
    const btn = (n) => { game.campaign.render(); const b = document.querySelector(`[data-mission="${n}"]`); return !!b && !b.classList.contains('locked'); };
    const cont = () => { const b = document.getElementById('btn-continue'); return b.classList.contains('hidden') ? null : b.textContent; };
    game.skipCinematics = true;
    try {
      Progress.reset(); game._syncLevelMenu();
      out.fresh = { menu2: btn(2), menu3: btn(3), unlocked2: Progress.unlocked(2), unlocked3: Progress.unlocked(3) };
      window.__level(1); window.__start({ audio: false }); step(0.5);
      game.startLevel(3); out.lockedRefused = game.level.id === 1;
      // Level 1 won: Level 2 unlocked, CONTINUE offered
      game.endGame(true); step(2);
      out.afterL1 = { unlocked2: Progress.unlocked(2), unlocked3: Progress.unlocked(3), continue: cont(), menu2: btn(2), menu3: btn(3) };
      // CONTINUE goes to Level 2; winning it unlocks Level 3
      document.getElementById('btn-continue').click(); step(1.5);
      out.continueTo = game.level.id;
      game.missions.complete(); step(2);
      out.afterL2 = { unlocked3: Progress.unlocked(3), continue: cont(), menu3: btn(3), state: game.state };
      document.getElementById('btn-continue').click(); step(1.5);
      out.continueTo3 = { level: game.level.id, state: game.state, stage: game.missions.stage };
      // the last level: no CONTINUE, no error
      game.missions.complete(); step(2);
      out.afterL3 = { continue: cont(), title: document.getElementById('end-title').textContent, state: game.state };
      // stored on the device
      let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) { /* blocked */ }
      out.stored = raw;
      out.menuButton3 = (() => { const b = document.querySelector('[data-mission="3"] .cmp-name'); return b ? b.textContent : null; })();
    } finally {
      try { if (saved === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, saved); } catch (e) { /* blocked */ }
      game._syncLevelMenu(); game.skipCinematics = false;
    }
    const st = (() => { try { return JSON.parse(out.stored || '{}').unlocked || {}; } catch (e) { return {}; } })();
    out.pass = !out.fresh.menu2 && !out.fresh.menu3 && !out.fresh.unlocked3 && out.lockedRefused
      && out.afterL1.unlocked2 && !out.afterL1.unlocked3 && out.afterL1.continue === 'CONTINUE · LEVEL 2' && out.continueTo === 2
      && out.afterL2.unlocked3 && out.afterL2.continue === 'CONTINUE · LEVEL 3' && out.afterL2.menu3 && out.continueTo3.level === 3 && out.continueTo3.state === 'playing'
      && out.afterL3.continue === null && out.afterL3.title === 'LEVEL 3 COMPLETE' && st[2] && st[3];
    return out;
  };

  // ------------------------------------------------------------------ leaks between levels
  // Level 1 and 2 measured before and after a visit to Level 3 (with a fight in progress when it is
  // left), same seed and moment: the active colliders (by place and kind), the world's fire, smoke
  // and beacon lists, the people in play, theme and lighting must match, and none of Level 3's own
  // things (district, van, props, Fixer, its crews, an arena) may remain. The visible-mesh count is
  // reported only: crowd props are re-created on every restart, so it moves by a few either way.
  window.__testLeaks = async () => {
    const snap = () => {
      let meshes = 0; game.scene.traverseVisible((o) => { if (o.isMesh) meshes++; });
      const npcs = game.crowd.npcs.filter((n) => n.rig.root.visible).length;
      const active = game.crowd.npcs.filter((n) => n.state !== 'gone').length;
      const colliders = game.world.colliders.filter((c) => !c.off).map((c) => `${c.tag}|${c.minX.toFixed(2)}|${c.minZ.toFixed(2)}|${c.maxX.toFixed(2)}|${c.maxZ.toFixed(2)}`).sort().join(';');
      const W = game.world, D = W.districts && W.districts.l3;
      const m = game.missions, van = game.l3van, P = game.l3props, fx = game.crowd.fixer;
      return {
        meshes, npcs, active, colliders, worldLists: [W.fires.length, W.smokes.length, W.lightBars.length].join(), district: W.district ? 'set' : null, districtVisible: !!(D && D.group.visible), theme: game.audio.music.theme.chords[0].join(),
        van: !!(van && van.group.visible), vanCollider: !!(van && van.col), props: !!(P && (P.crewVan.mesh.visible || P.scooter.mesh.visible || P.crewVan.col || P.scooter.col)),
        fixer: !!(fx && (fx.rig.root.visible || fx.state !== 'gone')), extraCrewActive: game.crowd.npcs.filter((n) => n.crew && n.crew.extra && n.state !== 'gone').length,
        arena: !!game.crowd.arena, boss: !!m.boss, lighting: game.renderer.toneMappingExposure,
      };
    };
    const at = (lv, seed) => { window.__level(lv); game.skipCinematics = true; window.__start({ audio: false, seed }); step(2); return snap(); };
    const before = { l1: at(1, 3), l2: at(2, 12) };
    const m3 = level3(5, 4); step(1); const inL3 = snap(); void m3;
    window.__boss('fixer'); step(1.5); // a fight in progress when the level is switched
    const after = { l1: at(1, 3), l2: at(2, 12) };
    const same = (a, b) => ['npcs', 'active', 'colliders', 'worldLists', 'district', 'districtVisible', 'theme', 'van', 'vanCollider', 'props', 'fixer', 'extraCrewActive', 'arena', 'boss', 'lighting'].filter((k) => a[k] !== b[k]);
    const brief = (s) => ({ ...s, colliders: s.colliders.split(';').length });
    const colDiff = (a, b) => { const A = a.colliders.split(';'), B = b.colliders.split(';'); return { onlyBefore: A.filter((k) => !B.includes(k)).slice(0, 8), onlyAfter: B.filter((k) => !A.includes(k)).slice(0, 8) }; };
    const out = { before: { l1: brief(before.l1), l2: brief(before.l2) }, inL3: { van: inL3.van, extraCrewActive: inL3.extraCrewActive, district: inL3.district, districtVisible: inL3.districtVisible }, after: { l1: brief(after.l1), l2: brief(after.l2) }, diffL1: same(before.l1, after.l1), diffL2: same(before.l2, after.l2), colDiffL1: colDiff(before.l1, after.l1), colDiffL2: colDiff(before.l2, after.l2) };
    out.pass = out.diffL1.length === 0 && out.diffL2.length === 0 && inL3.van && inL3.districtVisible
      && [after.l1, after.l2].every((s) => !s.van && !s.vanCollider && !s.props && !s.fixer && s.extraCrewActive === 0 && !s.district && !s.districtVisible && !s.arena && !s.boss);
    game.skipCinematics = false;
    return out;
  };

  // ------------------------------------------------------------------ developer shortcuts
  window.__testShortcuts = async () => {
    const out = {};
    game.skipCinematics = true;
    const lv = (id, stage) => { const r = window.__level(id, stage); step(1.4); return { r, level: game.level.id, section: game.missions.section ?? game.missions.phase, boss: game.missions.boss ? game.missions.boss.def.id : null }; };
    out.level1 = lv(1); out.level2 = lv(2); out.level3 = lv(3);
    out.jumpL2 = [0, 1, 2, 3, 4].map((i) => { window.__level(2); window.__jump(i); step(0.3); return game.missions.section; });
    out.jumpL3 = [0, 1, 2, 3].map((i) => { window.__level(3); window.__jump(i); step(0.3); return game.missions.section; });
    out.bosses = ['enforcer', 'leader', 'fixer'].map((n) => { window.__boss(n); step(1.4); const b = game.missions.boss; return [n, b && b.def.id, b && b.s]; });
    out.stageNames = ['enforcer', 'leader'].map((n) => { const r = lv(2, n); return [n, r.boss]; }).concat([['fixer', lv(3, 'fixer').boss]]);
    out.acts = window.__acts().length;
    out.view = window.__view('arena').area;
    out.lint = window.__lintBosses();
    window.__level(3); step(0.2);
    game.skipCinematics = false;
    out.pass = out.level1.level === 1 && out.level2.level === 2 && out.level3.level === 3 && out.jumpL2.join() === '0,1,2,3,4' && out.jumpL3.join() === '0,1,3,4'
      && out.bosses.every(([n, id]) => n === id) && out.stageNames.every(([n, id]) => n === id) && out.acts === 4 && Object.values(out.lint).every((l) => l.length === 0);
    return out;
  };

  // ------------------------------------------------------------------ performance
  // Frame cost (simulation and render, GPU flushed) at Level 3's heaviest moments, the officer
  // kept alive; then memory across repeated section retries. Desktop browser figures only.
  window.__perfL3 = async ({ frames = 240 } = {}) => {
    const gl = game.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const hw = { gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'n/a', cores: navigator.hardwareConcurrency, memoryGB: navigator.deviceMemory ?? 'n/a', ua: navigator.userAgent, viewport: [innerWidth, innerHeight], devicePixelRatio, renderPixelRatio: game.pr, maxSkinned: game.crowd.maxSkinned };
    const stat = (a) => { const s = [...a].sort((x, y) => x - y); const q = (p) => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2); return { p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1) }; };
    const measure = async (name, each) => {
      const up = [], rd = []; game.renderer.info.autoReset = true;
      let calls = 0, tris = 0;
      for (let i = 0; i < frames; i++) {
        if (each) each(i);
        game.player.health = 100;
        const t0 = performance.now(); game.update(1 / 60); const t1 = performance.now();
        game.renderer.info.autoReset = false; game.renderer.info.reset();
        game.render(); gl.finish(); const t2 = performance.now();
        game.renderer.info.autoReset = true;
        calls += game.renderer.info.render.calls; tris += game.renderer.info.render.triangles;
        up.push(t1 - t0); rd.push(t2 - t1);
        if (i % 30 === 29) await sleep(1);
      }
      const total = up.map((u, i) => u + rd[i]);
      return { scenario: name, frames, update: stat(up), render: stat(rd), total: stat(total), over33ms: total.filter((t) => t > 33.3).length, calls: Math.round(calls / frames), tris: Math.round(tris / frames), npcsActive: game.crowd.npcs.filter((n) => n.state !== 'gone').length, npcsNear40: game.crowd.npcs.filter((n) => n.state !== 'gone' && n.distToPlayer < 40).length, flames: game.effects.flames.length, fires: game.world.fires.length };
    };
    const look = (x, z, tx, tz) => { const p = game.player; p.pos.set(x, 0, z); p.vel.set(0, 0, 0); game.cameraRig.yaw = Math.atan2(-(tx - x), -(tz - z)); game.cameraRig.pitch = -0.08; };
    const rows = [];
    // 1. the square at its fullest: the rally, the fireworks panic and the surge pair inside it
    { const m = level3(7, 3); const fw = m.hz.add({ id: 'fireworks', kind: 'fireworks', at: [-14, 399], over: [-30, 394], from: [-47, 360, -18, 426], lane: [-34, 371, 30, 385], endX: 34, count: 18, telegraph: 1.0, smokeS: 12 }); m.hz.primeFireworks(fw); m.flags.surge = true; step(2, () => look(8, 385, -20, 395)); rows.push(await measure('squareSurge', () => look(8, 385, -20, 395))); }
    // 2. fire and smoke: the cook-off going up beside two car fires and two petrol pools
    { const m = level3(7, 1); m.enc.load([]); const h = m.hz.add({ id: 'ck', kind: 'cookoff', pos: [-6, 262], r: 6.5, telegraph: 1, triggerVan: 0, triggerPlayer: 0 }); h.go = true; game.events.carFire(V(6, 1, 268)); game.events.carFire(V(-7, 1, 276)); game.effects.ignite(V(3, 0, 258), 2.6, 8); game.effects.ignite(V(-3, 0, 266), 2.6, 8); step(1.5, () => look(0, 248, 0, 268)); rows.push(await measure('fireAndSmoke', () => look(0, 248, 0, 268))); }
    // 3. the van under attack by six, the officer close
    { const m = level3(7, 1); m.enc.load([]); m.hz.reset(); step(VAN.grace + 0.2); const van = m.van, list = crew(6); list.forEach((n, k) => { game.crowd.makeHostile(n, 'melee', 'vehicle'); n.pos.set(van.pos.x + (k % 2 ? 3 : -3), 0, van.pos.z + k - 3); }); van.integrity = VAN.max; rows.push(await measure('vanUnderAttack', () => { look(van.pos.x, van.pos.z - 14, van.pos.x, van.pos.z); van.integrity = Math.max(van.integrity, 50); for (const n of list) n.lastAggro = game.crowd.time; })); }
    // 4. the square's first encounter (four crew, the rally beyond)
    { const m = level3(7, 3); step(1.5, () => look(25, 375, 36, 392)); rows.push(await measure('squareEncounter', () => look(25, 375, 36, 392))); void m; }
    // 5. the Fixer in his last phase
    { level3(7); window.__boss('fixer'); step(1.4); const b = game.missions.boss; while (b.phaseIdx < 2) { window.__bossHit('back'); if (b.s === 'transition') step(2.4); } rows.push(await measure('fixerPhase3', () => { if (b.hp < 2) b.hp = 4; })); }
    // 6. cinematics: the briefing and the Fixer's introduction
    { window.__level(3); game.skipCinematics = false; window.__start({ audio: false, seed: 7 }); step(1.3); rows.push(await measure('cinematicBriefing')); }
    { game.skipCinematics = false; window.__boss('fixer'); step(0.05); rows.push(await measure('cinematicFixerIntro')); }
    game.skipCinematics = true;
    // 7. memory across repeated checkpoint retries (section 3, then the fight)
    const mem = [];
    const snapM = () => ({ heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, geometries: game.renderer.info.memory.geometries, textures: game.renderer.info.memory.textures, programs: game.renderer.info.programs.length, sceneObjects: game.scene.children.length, npcs: game.crowd.npcs.length, flames: game.effects.flames.length, worldFires: game.world.fires.length, voices: game.audio.voices.length });
    level3(7, 3); step(2); mem.push(['start', snapM()]);
    for (let i = 0; i < 10; i++) {
      const m = game.missions;
      if (i === 5) { window.__boss('fixer'); step(1.4); }
      for (let k = 0; k < 30; k++) window.__botTick();
      m.fail('qa retry'); step(3);
      document.getElementById('btn-retry').click(); step(1);
      game.render();
      mem.push([i < 5 ? 'section3' : 'fixer', snapM()]);
      await sleep(30);
    }
    game.skipCinematics = false;
    return { hardware: hw, note: 'desktop browser in the Claude app Browser pane; GPU flushed with gl.finish(); not a phone', rows, memory: mem };
  };

  // ------------------------------------------------------------------ objective and marker trace
  // Wraps the bot tick: after each one, outside cinematics, the objective panel must say something
  // and a marker must lead somewhere unless the choice is the player's (the route), a boss fight is
  // on (the boss is in plain sight), or the results are coming.
  window.__traceObjectives = async (fn) => {
    const orig = window.__botTick, tr = { ticks: 0, cinematic: 0, noText: 0, noMarker: 0, gaps: [], texts: new Set() };
    let gap = null;
    window.__botTick = () => {
      orig();
      const m = game.missions; tr.ticks++;
      if (game.cinematic || game.state !== 'playing') { tr.cinematic++; return; }
      const info = m.hudInfo(); tr.texts.add(`${info.phaseName} · ${info.text}`);
      if (!info.text) tr.noText++;
      const allowed = m.stage !== 'route' || (m.route === null && m.section === 1) || (m.boss && m.boss.s !== 'defeated') || m.ended;
      if (!m.markerPos && !allowed) {
        tr.noMarker++;
        if (!gap) gap = { t: +m.t.toFixed(1), section: m.section, text: info.text, detail: info.detail, n: 0 };
        gap.n++;
      } else if (gap) { tr.gaps.push(gap); gap = null; }
    };
    let r;
    try { r = await fn(); } finally { window.__botTick = orig; }
    if (gap) tr.gaps.push(gap);
    tr.texts = [...tr.texts];
    tr.longGaps = tr.gaps.filter((x) => x.n > 20); // more than 2 s without a marker
    return { result: r, trace: tr };
  };
}
