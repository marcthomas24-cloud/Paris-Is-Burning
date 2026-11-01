// Campaign checks (developer builds only: loaded by dev.js with ?dev). docs/campaign-plan.md:
// the medal rule, records and bests, the campaign screen, the CONTINUE chain into the finale,
// old saves, blocked storage, RESET CAMPAIGN, the pause briefing. Each returns plain data with a
// `pass` flag. The device's own progress and settings are put back afterwards.
//   await __testCampaign()    everything above
//   __campaignLayout()        the visible screen's horizontal overflow and off-screen buttons (run it
//                             at phone sizes with the campaign, results or finale showing)
import { Progress } from './levels.js';
import { assess, nextMission, mission } from './campaign.js';

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
    Object.assign(m.stats, { arrests: r.arrests, damageTaken: r.damage, peaceful: r.peaceful });
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

      // ---- the chain: CONTINUE from Level 1 to 3, CAMPAIGN COMPLETE, the finale
      finish(1, { score: 4000, arrests: 7, damage: 10, peaceful: 0 }); // silver (score short)
      $('btn-continue').click(); step(0.3);
      out.chain = { to2: game.level.id };
      settle({ score: 9500, arrests: 12, damage: 30, peaceful: 0 }); // gold
      out.chain.next3 = (document.querySelector('#end-stats .next-card b') || {}).textContent;
      $('btn-continue').click(); step(0.3);
      out.chain.to3 = game.level.id;
      const w33 = settle({ score: 12500, arrests: 9, damage: 160, peaceful: 0 }); // silver (damage)
      out.chain.l3 = { medal: w33.assessment.medal, cont: shown('btn-continue'), finale: shown('btn-finale'), final: !!document.querySelector('#end-stats .next-card.final') };
      $('btn-finale').click();
      const finRows = [...document.querySelectorAll('#fin-stats .row')].map((r) => r.textContent);
      out.finale = { shown: shown('finale-screen'), seen: Progress.finaleSeen(), rows: finRows.length, total: finRows[3], rating: (document.querySelector('#fin-stats .rank') || {}).textContent, medals: [...document.querySelectorAll('#fin-stats .medal')].map((m) => m.classList[1]) };
      // back out to the campaign: everything complete, the finale offered again; then the title screen
      document.querySelector('#finale-screen [data-action="campaign"]').click();
      out.after = { campaign: shown('campaign-screen'), finaleBtn: shown('cmp-finale'), c3: card(3), start: $('cmp-start').textContent };
      document.querySelector('[data-action="cmp-back"]').click(); out.after.backToFinale = shown('finale-screen');
      document.querySelector('[data-action="main-menu"]').click();
      out.after.menu = { state: game.state, shown: shown('menu'), play: $('btn-play').textContent, tag: $('menu-tag').textContent };
      $('btn-play').click(); step(0.3);
      out.after.playFromMenu = { state: game.state, level: game.level.id, stage: game.missions.stage };
      const total = 6000 + 9500 + 12500;
      const chainOk = out.chain.to2 === 2 && out.chain.next3 === 'THE BREAKOUT' && out.chain.to3 === 3 && out.chain.l3.medal === 2 && !out.chain.l3.cont && out.chain.l3.finale && out.chain.l3.final
        && out.finale.shown && out.finale.seen && out.finale.rows === 4 && out.finale.total.replace(/\D/g, '') === String(total) && out.finale.rating === 'CAMPAIGN RATING · SILVER · PROFESSIONAL'
        && out.finale.medals.join() === 'gold,gold,silver' && out.after.campaign && out.after.finaleBtn && out.after.c3.done && out.after.c3.medal === 'silver' && out.after.start === 'REPLAY · LEVEL 3'
        && out.after.backToFinale && out.after.menu.state === 'menu' && out.after.menu.shown && out.after.menu.play === 'REPLAY · LEVEL 3' && out.after.playFromMenu.state === 'playing' && out.after.playFromMenu.level === 3;

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
  window.__campaignLayout = () => {
    const scr = [...document.querySelectorAll('.screen')].find((s) => !s.classList.contains('hidden'));
    if (!scr) return 'no screen showing';
    const W = innerWidth, inner = scr.querySelector('.menu-inner');
    const wide = [...scr.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > W + 1 || r.left < -1); }).map((e) => e.id || e.className || e.tagName).slice(0, 8);
    const buttons = [...scr.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height), out: r.right > W + 1 || r.left < -1 }; });
    return { screen: scr.id, viewport: [W, innerHeight], scrollW: scr.scrollWidth, clientW: scr.clientWidth, innerW: inner ? Math.round(inner.getBoundingClientRect().width) : null, outside: wide, buttons, pass: scr.scrollWidth <= scr.clientWidth + 1 && !wide.length && buttons.every((b) => !b.out && b.h >= 32) };
  };
}
