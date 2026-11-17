// Campaign checks (developer builds only: loaded by dev.js with ?dev). docs/campaign-plan.md:
// the medal rule, records and bests, the campaign screen, the CONTINUE chain into the finale,
// old saves, blocked storage, RESET CAMPAIGN, the pause briefing. Each returns plain data with a
// `pass` flag. The device's own progress and settings are put back afterwards.
//   await __testCampaign()    everything above
//   await __testAids()        boss lock-on and Assisted boss fights (Options): see below
//   __campaignLayout()        the visible screen's horizontal overflow and off-screen buttons (run it
//                             at phone sizes with the campaign, results or finale showing)
import { Progress } from './levels.js';
import { assess, nextMission, mission, summarize, medalBlock } from './campaign.js';
import { LEADER, ASSIST } from './boss.js';

const KEY = 'parisBurning.progress.v1';
const KEEP = [KEY, 'parisBurning.gameplay.v1', 'parisBurning.audio.v1'];

export function installTests7(game) {
  const resume = () => { if (game.state === 'paused') { game._screen(null); game.state = 'playing'; game.audio.setPaused(false); } };
  const step = (s, fn) => { resume(); window.__step(s, fn); };
  const $ = (id) => document.getElementById(id);
  const shown = (id) => !$(id).classList.contains('hidden');
  const card = (n) => {
    game.campaign.render();
    const b = document.querySelector(`[data-mission="${n}"]`), md = b.querySelector('.medal');
    return { state: b.querySelector('.cmp-state').textContent, locked: b.classList.contains('locked'), done: b.classList.contains('done'), next: b.classList.contains('next'), medal: md ? md.classList[1] : null };
  };
  const tags = () => [...document.querySelectorAll('#end-stats .best-tags span')].map((t) => t.textContent);
  // the results of a run with these numbers (the run's own play is not what is tested here)
  const settle = (r, win = true) => {
    const m = game.missions;
    m.score = r.score; m.t = r.t ?? 120;
    Object.assign(m.stats, { arrests: r.arrests, damageTaken: r.damage, peaceful: r.peaceful, home: r.home, trampled: r.trampled, squad: r.squad, burnt: r.burnt, agreed: r.agreed, blows: r.blows, cleared: r.cleared });
    game.endGame(win, win ? undefined : 'Test failure.');
    game._showEnd();
    return { ...game.lastResult, tags: tags(), rec: Progress.record(game.level.id) };
  };
  const play = (id) => { window.__level(id); window.__start({ audio: false }); step(0.3); };
  const finish = (id, r, win) => { play(id); return settle(r, win); };

  window.__testCampaign = async () => {
    const saved = {}; for (const k of KEEP) { try { saved[k] = localStorage.getItem(k); } catch (e) { /* blocked */ } }
    const dev = game.dev, out = {};
    const proto = Storage.prototype, getItem = proto.getItem, setItem = proto.setItem;
    game.skipCinematics = true; game.recordRuns = true;
    try {
      // ---- the medal rule (Level 1 targets 4,500 / 6 / 120; Level 2 10 arrests; Level 3 12,000)
      const A = (id, r, win = true) => { const a = assess(id, { win, ...r }); return [a.medal, a.count]; };
      out.rule = {
        gold: A(1, { score: 4500, arrests: 6, damage: 120, peaceful: 0 }),
        silver: A(1, { score: 4499, arrests: 6, damage: 0, peaceful: 0 }),
        bronzeTwo: A(2, { score: 0, arrests: 10, damage: 999, peaceful: 0 }),
        bronzeOne: A(3, { score: 0, arrests: 0, damage: 999, peaceful: 0 }),
        none: A(3, { score: 0, arrests: 0, damage: 999, peaceful: 2 }),
        failed: A(1, { score: 99999, arrests: 99, damage: 0, peaceful: 0 }, false),
      };
      const ruleOk = JSON.stringify(out.rule) === JSON.stringify({ gold: [3, 4], silver: [2, 3], bronzeTwo: [1, 2], bronzeOne: [1, 1], none: [0, 0], failed: [0, 4] });

      // ---- a fresh campaign: Level 1 next, the others locked; a locked START refused (allowed in dev)
      Progress.reset(); game.campaign.sel = null; game.dev = false;
      game.campaign.open('menu');
      out.fresh = { c1: card(1), c2: card(2), c3: card(3), sel: game.campaign.sel, start: $('cmp-start').textContent, finale: shown('cmp-finale'), next: nextMission() };
      game._syncLevelMenu(); out.fresh.menuPlay = $('btn-play').textContent;
      game.campaign.sel = 3; game.campaign.render();
      out.locked = { disabled: $('cmp-start').disabled, levelBefore: game.level.id };
      game.campaign.start(); out.locked.levelAfter = game.level.id;
      game.dev = true; game.campaign.render(); out.locked.devEnabled = !$('cmp-start').disabled; out.locked.devState = card(3).state;
      game.dev = false; game.campaign.sel = null;
      const freshOk = out.fresh.c1.next && !out.fresh.c1.locked && out.fresh.c2.locked && out.fresh.c3.locked && out.fresh.sel === 1 && out.fresh.start === 'START · LEVEL 1'
        && !out.fresh.finale && out.fresh.menuPlay === 'PLAY' && out.locked.disabled && out.locked.levelAfter === out.locked.levelBefore && out.locked.devEnabled && out.locked.devState === 'LOCKED · DEV';

      // ---- a win records; a worse replay keeps the bests; a better one replaces them
      const w1 = finish(1, { score: 5000, arrests: 7, damage: 50, peaceful: 0, t: 150 });
      out.first = { medal: w1.assessment.medal, flags: w1.flags, tags: w1.tags, block: !!document.querySelector('#end-stats .medal-block'), next: (document.querySelector('#end-stats .next-card b') || {}).textContent,
        cont: shown('btn-continue'), replay: $('btn-restart').textContent, damageRow: [...document.querySelectorAll('#end-stats .row')].some((r) => r.textContent.includes('Damage received')), hook: !!document.querySelector('#end-stats .hook') };
      const w2 = finish(1, { score: 3000, arrests: 2, damage: 200, peaceful: 1, t: 100 });
      out.worse = { medal: w2.assessment.medal, flags: w2.flags, tags: w2.tags, best: w2.rec.bestScore, bestMedal: w2.rec.bestMedal, bestTime: w2.rec.bestTime, bestRun: w2.rec.bestRun.score, last: w2.rec.last.score, wins: w2.rec.wins,
        bestLine: (document.querySelector('#end-stats .best-line') || {}).textContent || null, peacefulRed: !!document.querySelector('#end-stats .row .bad') };
      const w3 = finish(1, { score: 6000, arrests: 8, damage: 10, peaceful: 0, t: 200 });
      out.better = { flags: w3.flags, tags: w3.tags, best: w3.rec.bestScore, bestRun: w3.rec.bestRun.score, bestTime: w3.rec.bestTime };
      const f1 = finish(1, { score: 9000, arrests: 9, damage: 0, peaceful: 0 }, false);
      out.failure = { plays: f1.rec.plays, wins: f1.rec.wins, best: f1.rec.bestScore, block: !!document.querySelector('#end-stats .medal-block'), rank: (document.querySelector('#end-stats .rank') || {}).textContent, finale: shown('btn-finale') };
      const recordOk = out.first.medal === 3 && out.first.flags.firstWin && out.first.tags.join() === 'FIRST COMPLETION' && out.first.block && out.first.next === 'NUIT' && out.first.cont && out.first.replay === 'REPLAY' && out.first.damageRow && out.first.hook
        && out.worse.medal === 0 && !out.worse.flags.score && !out.worse.flags.medal && out.worse.flags.time && out.worse.tags.join() === 'NEW BEST TIME' && out.worse.best === 5000 && out.worse.bestMedal === 3 && out.worse.bestTime === 100 && out.worse.bestRun === 5000 && out.worse.last === 3000 && out.worse.wins === 2 && !!out.worse.bestLine && out.worse.peacefulRed
        && out.better.flags.score && !out.better.flags.medal && out.better.tags.join() === 'NEW BEST SCORE' && out.better.best === 6000 && out.better.bestRun === 6000 && out.better.bestTime === 100
        && out.failure.plays === 4 && out.failure.wins === 3 && out.failure.best === 6000 && !out.failure.block && out.failure.rank === 'Restart to try again' && !out.failure.finale;

      // ---- the chain: CONTINUE from Level 1 to 6, CAMPAIGN COMPLETE, the finale
      finish(1, { score: 4000, arrests: 7, damage: 10, peaceful: 0 }); // silver (score short)
      $('btn-continue').click(); step(0.3);
      out.chain = { to2: game.level.id };
      settle({ score: 9500, arrests: 12, damage: 30, peaceful: 0 }); // gold
      out.chain.next3 = (document.querySelector('#end-stats .next-card b') || {}).textContent;
      $('btn-continue').click(); step(0.3);
      out.chain.to3 = game.level.id;
      const w33 = settle({ score: 12500, arrests: 9, damage: 160, peaceful: 0 }); // silver (damage)
      out.chain.l3 = { medal: w33.assessment.medal, cont: shown('btn-continue'), finale: shown('btn-finale'), final: !!document.querySelector('#end-stats .next-card.final') };
      $('btn-continue').click(); step(0.3);
      out.chain.to4 = game.level.id;
      const w44 = settle({ score: 7500, arrests: 0, damage: 20, peaceful: 0, home: 220, trampled: 0 }); // gold (the station's citations)
      out.chain.l4 = { medal: w44.assessment.medal, keys: w44.assessment.citations.map((c) => c.key).join(), cont: shown('btn-continue'), finale: shown('btn-finale'), final: !!document.querySelector('#end-stats .next-card.final') };
      $('btn-continue').click(); step(0.3);
      out.chain.to5 = game.level.id;
      const w55 = settle({ score: 7000, arrests: 5, damage: 20, peaceful: 0, squad: 4, burnt: 2 }); // gold (the quays' citations)
      out.chain.l5 = { medal: w55.assessment.medal, keys: w55.assessment.citations.map((c) => c.key).join(), cont: shown('btn-continue'), finale: shown('btn-finale'), final: !!document.querySelector('#end-stats .next-card.final') };
      $('btn-continue').click(); step(0.3);
      out.chain.to6 = game.level.id;
      const w66 = settle({ score: 7000, arrests: 1, damage: 0, peaceful: 0, agreed: 3, blows: 0, cleared: 1 }); // gold (the dawn's citations)
      out.chain.l6 = { medal: w66.assessment.medal, keys: w66.assessment.citations.map((c) => c.key).join(), cont: shown('btn-continue'), finale: shown('btn-finale'), final: !!document.querySelector('#end-stats .next-card.final') };
      $('btn-finale').click();
      out.finale = { text: $('fin-text').textContent };
      const finRows = [...document.querySelectorAll('#fin-stats .row')].map((r) => r.textContent);
      Object.assign(out.finale, { shown: shown('finale-screen'), seen: Progress.finaleSeen(), rows: finRows.length, total: finRows[6], rating: (document.querySelector('#fin-stats .rank') || {}).textContent, medals: [...document.querySelectorAll('#fin-stats .medal')].map((m) => m.classList[1]) });
      // back out to the campaign: everything complete, the finale offered again; then the title screen
      document.querySelector('#finale-screen [data-action="campaign"]').click();
      out.after = { campaign: shown('campaign-screen'), finaleBtn: shown('cmp-finale'), c3: card(3), c4: card(4), c5: card(5), c6: card(6), start: $('cmp-start').textContent };
      document.querySelector('[data-action="cmp-back"]').click(); out.after.backToFinale = shown('finale-screen');
      document.querySelector('[data-action="main-menu"]').click();
      out.after.menu = { state: game.state, shown: shown('menu'), play: $('btn-play').textContent, tag: $('menu-tag').textContent };
      $('btn-play').click(); step(0.3);
      out.after.playFromMenu = { state: game.state, level: game.level.id, stage: game.missions.stage };
      const total = 6000 + 9500 + 12500 + 7500 + 7000 + 7000;
      const chainOk = out.chain.to2 === 2 && out.chain.next3 === 'THE BREAKOUT' && out.chain.to3 === 3 && out.chain.l3.medal === 2 && out.chain.l3.cont && !out.chain.l3.finale && !out.chain.l3.final
        && out.chain.to4 === 4 && out.chain.l4.medal === 3 && out.chain.l4.keys === 'score,home,damage,trampled' && out.chain.l4.cont && !out.chain.l4.finale && !out.chain.l4.final
        && out.chain.to5 === 5 && out.chain.l5.medal === 3 && out.chain.l5.keys === 'score,arrests,squad,burnt' && out.chain.l5.cont && !out.chain.l5.finale && !out.chain.l5.final
        && out.chain.to6 === 6 && out.chain.l6.medal === 3 && out.chain.l6.keys === 'score,agreed,blows,cleared' && !out.chain.l6.cont && out.chain.l6.finale && out.chain.l6.final && out.finale.text.includes('walked home past you')
        && out.finale.shown && out.finale.seen && out.finale.rows === 7 && out.finale.total.replace(/\D/g, '') === String(total) && out.finale.rating === 'CAMPAIGN RATING · SILVER · PROFESSIONAL'
        && out.finale.medals.join() === 'gold,gold,silver,gold,gold,gold' && out.after.campaign && out.after.finaleBtn && out.after.c3.done && out.after.c3.medal === 'silver' && out.after.c4.done && out.after.c5.done && out.after.c6.done && out.after.start === 'REPLAY · LEVEL 6'
        && out.after.backToFinale && out.after.menu.state === 'menu' && out.after.menu.shown && out.after.menu.play === 'REPLAY · LEVEL 6' && out.after.playFromMenu.state === 'playing' && out.after.playFromMenu.level === 6;

      // ---- the pause briefing
      play(2); game.pause();
      out.pause = { text: $('pause-brief').textContent, objectives: document.querySelectorAll('#pause-brief .objectives li').length, campaignBtn: !!document.querySelector('#pause-screen [data-action="campaign"]') };
      game.resume();
      const pauseOk = out.pause.text.startsWith('LEVEL 2 · 01h12 · NUIT') && out.pause.objectives === 3 && out.pause.campaignBtn;

      // ---- the first-play briefing names the level's own place
      game.toMenu(); game.firstPlay = true; game.played = false; game.setLevel(3); game.play();
      out.onboarding = { text: $('ob-where').textContent, shown: shown('onboarding') };
      game._dismissOnboarding();
      const onboardOk = out.onboarding.shown && out.onboarding.text === mission(3).opening;

      // ---- a save from before the campaign: only unlocks
      setItem.call(localStorage, KEY, JSON.stringify({ unlocked: { 2: true, 3: true } }));
      game.campaign.sel = null; game.campaign.open('menu');
      out.legacy = { next: nextMission(), c1: card(1), c2: card(2), c3: card(3), rec1: Progress.record(1), sel: game.campaign.sel };
      const legacyOk = out.legacy.next === 3 && out.legacy.c1.done && out.legacy.c2.done && out.legacy.c3.next && out.legacy.rec1 === null && out.legacy.sel === 3;
      setItem.call(localStorage, KEY, 'not json'); out.legacy.garbage = { next: nextMission(), unlocked2: Progress.unlocked(2) };
      const garbageOk = out.legacy.garbage.next === 1 && !out.legacy.garbage.unlocked2;

      // ---- storage that throws: the game plays, the screens render, nothing is remembered
      proto.getItem = () => { throw new Error('blocked'); }; proto.setItem = () => { throw new Error('blocked'); };
      let err = null;
      try {
        const wb = finish(1, { score: 5000, arrests: 7, damage: 0, peaceful: 0 });
        game.campaign.sel = null; game.campaign.open('end-screen');
        out.blocked = { medal: wb.assessment.medal, block: !!document.querySelector('#end-stats .medal-block'), c2: card(2), rec: Progress.record(1), screen: shown('campaign-screen') };
      } catch (e) { err = String(e); }
      proto.getItem = getItem; proto.setItem = setItem;
      out.blocked = { ...(out.blocked || {}), err };
      const blockedOk = !err && out.blocked.medal === 3 && out.blocked.block && out.blocked.c2.locked && out.blocked.rec === null && out.blocked.screen;

      // ---- RESET CAMPAIGN: two taps, settings untouched
      finish(1, { score: 5000, arrests: 7, damage: 0, peaceful: 0 });
      const prefs0 = getItem.call(localStorage, 'parisBurning.gameplay.v1'), audio0 = getItem.call(localStorage, 'parisBurning.audio.v1');
      const rb = $('btn-reset-progress');
      rb.click(); out.reset = { armed: rb.textContent, keptAfterOne: !!Progress.record(1) };
      rb.click(); out.reset.done = rb.textContent; out.reset.stored = Progress._read();
      out.reset.prefsKept = getItem.call(localStorage, 'parisBurning.gameplay.v1') === prefs0 && getItem.call(localStorage, 'parisBurning.audio.v1') === audio0;
      const resetOk = out.reset.armed === 'TAP AGAIN TO CONFIRM' && out.reset.keptAfterOne && out.reset.done === 'CAMPAIGN RESET' && JSON.stringify(out.reset.stored) === '{}' && out.reset.prefsKept;

      // ---- harness runs leave no record unless a test asks
      game.recordRuns = false;
      finish(1, { score: 5000, arrests: 7, damage: 0, peaceful: 0 });
      out.harness = { rec: Progress.record(1) };
      const harnessOk = out.harness.rec === null;

      out.checks = { ruleOk, freshOk, recordOk, chainOk, pauseOk, onboardOk, legacyOk, garbageOk, blockedOk, resetOk, harnessOk };
      out.pass = Object.values(out.checks).every(Boolean);
    } finally {
      proto.getItem = getItem; proto.setItem = setItem;
      for (const k of KEEP) { try { if (saved[k] === null || saved[k] === undefined) localStorage.removeItem(k); else localStorage.setItem(k, saved[k]); } catch (e) { /* blocked */ } }
      game.dev = dev; game.recordRuns = false; game.skipCinematics = false; game.campaign.sel = null;
      game._syncLevelMenu();
    }
    return out;
  };

  // Horizontal overflow of the screen showing now, and any of its buttons outside the viewport.
  // Player aids. Lock-on: the officer side-on to le Patron (the camera looking away) circles him
  // with A and stays facing him, the camera turns onto him, and a strike in an opening lands on him;
  // the same strike with lock-on off goes elsewhere. Tab turns it off and on. Assisted: a wind-up,
  // a feint's real attack (scaled once), the damage and the opening; the run's results say ASSISTED.
  // Harness runs ignore the device's settings unless game.testAids is set.
  window.__testAids = async () => {
    const saved = {}; for (const k of KEEP) { try { saved[k] = localStorage.getItem(k); } catch (e) { /* blocked */ } }
    const prefs0 = { ...game.prefs }, out = {};
    const wrap = (a) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
    const fight = () => {
      game.skipCinematics = true;
      window.__level(2); window.__start({ audio: false, seed: 12 });
      game.input.keys.clear(); game.input.buttons.clear();
      window.__boss('leader');
      for (let i = 0; i < 300 && (!game.missions.boss || game.missions.boss.s === 'intro' || game.cinematic); i++) step(1 / 30);
      const b = game.missions.boss; b.s = 'idle'; b.cool = 99; b.queue = [];
      return b;
    };
    // the officer 2.4 m east of him, turned south, the camera looking south too (him off to the left)
    const place = (b) => {
      const p = game.player, n = b.n;
      p.pos.set(n.pos.x + 2.4, 0, n.pos.z); p.vel.set(0, 0, 0); p.knock.set(0, 0, 0); p.heading = 0; p.attack = null; p.health = 100;
      game.cameraRig.yaw = Math.PI; n.vel.set(0, 0, 0);
    };
    const facing = (b) => { const p = game.player, n = b.n; return +wrap(p.heading - Math.atan2(n.pos.x - p.pos.x, n.pos.z - p.pos.z)).toFixed(2); };
    const camErr = (b) => { const p = game.player, n = b.n; return +wrap(game.cameraRig.yaw - Math.atan2(-(n.pos.x - p.pos.x), -(n.pos.z - p.pos.z))).toFixed(2); };
    const strike = (b) => {
      const hits0 = b.hits; b.s = 'rec'; b.t = 0; b.dur = 9; b.openHits = 0;
      game.input.edges.add('Mouse0'); step(1 / 60);
      const target = game.player.attack && game.player.attack.target;
      step(0.6, () => { b.s = 'rec'; b.n.vel.set(0, 0, 0); });
      return { atBoss: target === b.n, landed: b.hits > hits0 };
    };
    try {
      // the harness ignores the device's settings
      game.prefs.lockOn = true; game.prefs.assisted = true; game.testAids = null;
      out.harnessOk = !game.aids().lockOn && !game.aids().assisted;

      // lock-on
      game.testAids = { lockOn: true, assisted: false };
      let b = fight(); place(b);
      const before = { facing: facing(b), camera: camErr(b) };
      const r0 = Math.hypot(game.player.pos.x - b.n.pos.x, game.player.pos.z - b.n.pos.z);
      step(1.0, () => { game.input.keys.add('KeyA'); b.n.vel.set(0, 0, 0); b.cool = 99; b.s = 'idle'; });
      game.input.keys.delete('KeyA');
      const r1 = Math.hypot(game.player.pos.x - b.n.pos.x, game.player.pos.z - b.n.pos.z);
      out.lock = { before, after: { facing: facing(b), camera: camErr(b) }, radius: [+r0.toFixed(2), +r1.toFixed(2)], marker: !$('boss-lock').classList.contains('hidden') };
      place(b); out.lock.strike = strike(b);
      out.lockOk = out.lock.after.facing < 0.25 && out.lock.after.camera < 0.35 && Math.abs(r1 - r0) < 1.2 && out.lock.marker && out.lock.strike.atBoss && out.lock.strike.landed;
      // Tab: off, then on again (the option follows)
      game.prefs.lockOn = true; game.testAids = null; game.manualStep = false;
      game.input.edges.add('Tab'); game.update(1 / 60); const afterTab = game.prefs.lockOn, box = $('opt-lockon').checked;
      game.input.edges.add('Tab'); game.update(1 / 60);
      game.manualStep = true;
      out.tab = { off: afterTab === false && box === false, on: game.prefs.lockOn === true };
      out.tabOk = out.tab.off && out.tab.on;
      // lock-on off: the same strike, him off to the side, does not go at him
      game.testAids = { lockOn: false, assisted: false };
      b = fight(); place(b); game.input.edges.add('Mouse0'); step(1 / 60);
      out.unlockedAtBoss = !!(game.player.attack && game.player.attack.target === b.n);
      out.unlockedOk = !out.unlockedAtBoss && $('boss-lock').classList.contains('hidden');

      // Assisted
      game.testAids = { lockOn: false, assisted: true };
      b = fight();
      const chop = LEADER.attacks.chop;
      b._wind({ ...chop }); const w = { wind: b.cur.wind, rec: b.cur.rec, dmg: b.cur.dmg };
      b._wind({ ...b.cur, feint: false }); // a feint's real attack comes back through _wind
      const near = (x, y) => Math.abs(x - y) < 1e-6;
      out.assist = { scaled: near(w.wind, chop.wind * ASSIST.wind) && near(w.rec, chop.rec * ASSIST.rec) && near(w.dmg, chop.dmg * ASSIST.dmg), once: near(b.cur.wind, w.wind), marked: !!game.missions.stats.assisted };
      const run = summarize(game.missions, true), a = assess(2, run);
      out.assist.tag = medalBlock(a, {}, null).includes('ASSISTED');
      // and nothing is scaled without it
      game.testAids = { lockOn: false, assisted: false };
      b = fight(); b._wind({ ...chop });
      out.assist.plain = near(b.cur.wind, chop.wind) && !game.missions.stats.assisted && !medalBlock(assess(2, summarize(game.missions, true)), {}, null).includes('ASSISTED');
      out.assistOk = Object.values(out.assist).every(Boolean);
    } finally {
      game.testAids = null; game.skipCinematics = false;
      Object.assign(game.prefs, prefs0); game._savePrefs(); // (the Options screen follows)
      game.input.keys.clear(); game.input.buttons.clear();
      for (const k of KEEP) { try { if (saved[k] == null) localStorage.removeItem(k); else localStorage.setItem(k, saved[k]); } catch (e) { /* blocked */ } }
    }
    out.pass = !!(out.harnessOk && out.lockOk && out.tabOk && out.unlockedOk && out.assistOk);
    return out;
  };

  window.__campaignLayout = () => {
    const scr = [...document.querySelectorAll('.screen')].find((s) => !s.classList.contains('hidden'));
    if (!scr) return 'no screen showing';
    const W = innerWidth, inner = scr.querySelector('.menu-inner');
    const wide = [...scr.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > W + 1 || r.left < -1); }).map((e) => e.id || e.className || e.tagName).slice(0, 8);
    const buttons = [...scr.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height), out: r.right > W + 1 || r.left < -1 }; });
    return { screen: scr.id, viewport: [W, innerHeight], scrollW: scr.scrollWidth, clientW: scr.clientWidth, innerW: inner ? Math.round(inner.getBoundingClientRect().width) : null, outside: wide, buttons, pass: scr.scrollWidth <= scr.clientWidth + 1 && !wide.length && buttons.every((b) => !b.out && b.h >= 32) };
  };
}
