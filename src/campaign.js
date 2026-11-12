// Campaign: the levels as one night, 18h47 to dawn. One table (CAMPAIGN) feeds the menu,
// the campaign screen, the results and the finale; the level scripts know nothing of it.
// Medals are a record of how a mission was played, never a currency: completion is required,
// then four citations decide it: score, arrests, damage received and no peaceful person struck;
// the station (Level 4) cites people home and nobody trampled instead of arrests and force,
// the quays (Level 5) officers still standing and cars burnt out instead of damage and force.
// Records are kept by Progress (levels.js) in the same storage key as the unlocks.
import { Progress } from './levels.js';

export const CAMPAIGN = [
  {
    id: 1, time: '18h47', title: 'BOULEVARD DE LA RÉPUBLIQUE', card: 'RÉPUBLIQUE', place: 'Boulevard de la République',
    opening: 'You are a CRS officer on Boulevard de la République.',
    briefing: 'The march has filled the boulevard and most of it is peaceful. A few people in it are not: hold the line, stop the petrol bombers and reach the officers cut off at Rue Oberkampf.',
    objectives: ['Hold the police line', 'Stop the petrol-bomb suspects', 'Extract the officers at Rue Oberkampf'],
    targets: { score: 4500, arrests: 6, damage: 120 },
  },
  {
    id: 2, time: '01h12', title: 'NUIT', card: 'NUIT', place: 'Boulevard de la République',
    opening: 'You are a CRS officer on Boulevard de la République, after midnight.',
    briefing: 'The looting crews of the man they call le Patron hold the boulevard. Push back down it from Rue Oberkampf to the staging area, through his lieutenant and then the man himself.',
    objectives: ['Clear the crews from Oberkampf to the staging area', 'Defeat and arrest the Enforcer', 'Arrest le Patron'],
    targets: { score: 9000, arrests: 10, damage: 180 },
  },
  {
    id: 3, time: '02h20', title: 'THE BREAKOUT', card: 'THE BREAKOUT', place: 'Place du Château-d\'Eau',
    opening: 'You are a CRS officer escorting a prisoner transfer through Place du Château-d\'Eau.',
    briefing: 'Le Patron is in a CRS transfer van. Escort it south to the gendarmerie while what is left of his crews, organised by a man the radio calls the Fixer, try to stop it.',
    objectives: ['Escort the transfer van to the gendarmerie', 'Choose the Avenue or the Passage', 'Stop and arrest the Fixer'],
    targets: { score: 12000, arrests: 8, damage: 150 },
  },
  {
    id: 4, time: '03h10', title: 'LAST TRAIN', card: 'LAST TRAIN', place: 'Gare de l\'Est',
    opening: 'You are a CRS officer in the forecourt of Gare de l\'Est.',
    briefing: 'The Métro has closed and the last night trains leave from here. Hundreds of people are coming through three entrances and two gate lines. Keep them moving and breathing: the danger is a crush, not a fight.',
    objectives: ['Direct people: hold F to point and call', 'Keep the density under the red line', 'Deal with the crew without a stampede', 'Get the last people onto the last train'],
    targets: { score: 7200, home: 200, damage: 60 }, cite: 'station',
  },
  {
    id: 5, time: '04h05', title: 'THE QUAYS', card: 'THE QUAYS', place: 'Canal Saint-Martin',
    opening: 'You are a CRS officer on Quai de Jemmapes, with four officers under your orders.',
    briefing: 'The last violent groups have left the boulevards for the canal: small fast bands that light a car and vanish over the footbridges. You lead a squad of four along two quays and five bridges. There are more places to be than officers to put there.',
    objectives: ['Order the squad: 1 hold, 2 follow, 3 advance', 'Hold the bridges and turn the bands back', 'Protect the fire crew at the burning shop', 'End it at the lock'],
    targets: { score: 6500, arrests: 4, squad: 3, burnt: 5 }, cite: 'quays',
  },
];
export const mission = (id) => CAMPAIGN.find((c) => c.id === id) || CAMPAIGN[0];

// medal ids are ordered: a higher id is a better medal
export const MEDALS = [
  { key: 'none', name: 'NO MEDAL', rank: 'UNDER REVIEW' },
  { key: 'bronze', name: 'BRONZE', rank: 'ADEQUATE' },
  { key: 'silver', name: 'SILVER', rank: 'PROFESSIONAL' },
  { key: 'gold', name: 'GOLD', rank: 'COMMENDATION' },
];

export const fmtScore = (v) => Math.round(v).toLocaleString('fr-FR');
export const fmtTime = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// What a finished run is judged on (the same fields in every level).
export function summarize(m, win) {
  const s = m.stats;
  return { win: !!win, score: m.score, arrests: s.arrests, damage: Math.round(s.damageTaken || 0), peaceful: s.peaceful, home: s.home, trampled: s.trampled, squad: s.squad, burnt: s.burnt, time: m.t, assisted: !!s.assisted };
}

// The four citations and the medal they add up to. No medal without completion.
export function assess(id, run) {
  const c = mission(id), t = c.targets, station = c.cite === 'station';
  const citations = c.cite === 'quays' ? [
    { key: 'score', label: `Score ${fmtScore(t.score)} or more`, value: fmtScore(run.score), ok: run.score >= t.score },
    { key: 'arrests', label: `${t.arrests} arrests or more`, value: run.arrests, ok: run.arrests >= t.arrests },
    { key: 'squad', label: `${t.squad} of 4 squad officers standing or more`, value: run.squad ?? '—', ok: run.squad >= t.squad },
    { key: 'burnt', label: `${t.burnt} cars burnt out or fewer`, value: run.burnt ?? '—', ok: run.burnt >= 0 && run.burnt <= t.burnt },
  ] : [
    { key: 'score', label: `Score ${fmtScore(t.score)} or more`, value: fmtScore(run.score), ok: run.score >= t.score },
    station ? { key: 'home', label: `${t.home} people home or more`, value: run.home ?? '—', ok: run.home >= t.home }
      : { key: 'arrests', label: `${t.arrests} arrests or more`, value: run.arrests, ok: run.arrests >= t.arrests },
    { key: 'damage', label: `Damage received ${t.damage} or less`, value: Math.round(run.damage), ok: run.damage <= t.damage },
    station ? { key: 'trampled', label: 'Nobody trampled', value: run.trampled ?? '—', ok: run.trampled === 0 }
      : { key: 'civilians', label: 'No peaceful person struck', value: run.peaceful, ok: run.peaceful === 0 },
  ];
  const n = citations.filter((c) => c.ok).length;
  const medal = !run.win ? 0 : n === 4 ? 3 : n === 3 ? 2 : n >= 1 ? 1 : 0;
  return { citations, count: n, medal, assisted: !!run.assisted };
}

export const medalDisc = (medal, extra = '') => `<span class="medal ${MEDALS[Math.max(0, medal)].key}${extra}" aria-label="${MEDALS[Math.max(0, medal)].name}"></span>`;

// the mission the campaign leads to: the furthest unlocked one not yet completed, or (all done)
// the one played last
export function nextMission() {
  for (let i = CAMPAIGN.length - 1; i >= 0; i--) {
    const id = CAMPAIGN[i].id;
    if (Progress.unlocked(id) && !Progress.completed(id)) return id;
  }
  return Progress.lastPlayed() || CAMPAIGN[0].id;
}
export const campaignDone = () => CAMPAIGN.every((c) => Progress.completed(c.id));
export const completedCount = () => CAMPAIGN.filter((c) => Progress.completed(c.id)).length;

// ------------------------------------------------------------------ results-screen pieces
// The medal block after a win: disc, rating, the four citations, new bests.
export function medalBlock(a, flags, rec) {
  const m = MEDALS[a.medal];
  const tags = [];
  if (flags.firstWin) tags.push('FIRST COMPLETION');
  else {
    if (flags.medal) tags.push('NEW BEST MEDAL');
    if (flags.score) tags.push('NEW BEST SCORE');
    if (flags.time) tags.push('NEW BEST TIME');
  }
  if (a.assisted) tags.push('ASSISTED');
  const best = rec && rec.wins && !flags.firstWin && !flags.score
    ? `<div class="best-line">Best ${fmtScore(rec.bestScore)} · ${MEDALS[Math.max(0, rec.bestMedal)].name}${rec.bestTime ? ' · ' + fmtTime(rec.bestTime) : ''}</div>` : '';
  return `<div class="medal-block">${medalDisc(a.medal, ' big')}<div class="medal-info">`
    + `<div class="rank">${a.medal ? m.name + ' · ' : ''}${m.rank}</div>`
    + `<ul class="citations">${a.citations.map((c) => `<li class="${c.ok ? 'ok' : 'no'}"><span>${esc(c.label)}</span><b>${esc(c.value)}</b></li>`).join('')}</ul>`
    + `</div></div>`
    + (tags.length ? `<div class="best-tags">${tags.map((t) => `<span${t === 'ASSISTED' ? ' class="aid"' : ''}>${t}</span>`).join('')}</div>` : '') + best;
}

// "what comes next" under the results: the next level's first objective, or the campaign's end
export function nextCard(id) {
  const n = CAMPAIGN.find((c) => c.id === id + 1);
  if (!n) return `<div class="next-card final"><span class="k">CAMPAIGN</span><b>THE NIGHT IS OVER</b><span>All ${CAMPAIGN.length} levels complete</span></div>`;
  return `<div class="next-card"><span class="k">NEXT · LEVEL ${n.id} · ${n.time}</span><b>${esc(n.title)}</b><span>${esc(n.objectives[0])}</span></div>`;
}

// ------------------------------------------------------------------ screens
export class CampaignUI {
  constructor(game) {
    this.game = game;
    this.sel = null;
    this.from = 'menu';
    const $ = (id) => document.getElementById(id);
    this.el = { track: $('cmp-track'), detail: $('cmp-detail'), start: $('cmp-start'), finale: $('cmp-finale'), tag: $('cmp-tag') };
    // one button per level, built once; render() fills them in
    this.el.track.innerHTML = CAMPAIGN.map((c) => `<li><button class="cmp-stop" data-mission="${c.id}" aria-label="Level ${c.id}: ${esc(c.title)}">`
      + `<span class="cmp-node"></span><span class="cmp-time">${c.time}</span><span class="cmp-name">${esc(c.title)}</span><span class="cmp-state"></span></button></li>`).join('');
    this.el.track.addEventListener('click', (e) => {
      const b = e.target.closest('[data-mission]');
      if (!b) return;
      game.audio.init(); game.audio.ui('click');
      this.sel = +b.dataset.mission; this.render();
    });
  }

  // a level can be started when it is unlocked, or always in a developer build
  canStart(id) { return Progress.unlocked(id) || !!this.game.dev; }

  open(from) {
    this.from = from || 'menu';
    const g = this.game;
    // first the level the campaign leads to (in a developer run, the level loaded)
    if (this.sel === null || !this.canStart(this.sel)) this.sel = g.dev && g.level ? g.level.id : nextMission();
    this.render();
    g._screen('campaign-screen');
  }

  render() {
    const sel = this.sel, done = completedCount();
    this.el.tag.textContent = done ? `One night in Paris · ${done} / ${CAMPAIGN.length} complete` : 'One night in Paris · 18h47 to dawn';
    const next = nextMission();
    // the line between the stops fills up to the furthest level reached
    const reach = CAMPAIGN.reduce((a, c, i) => (Progress.unlocked(c.id) ? i : a), 0);
    this.el.track.style.setProperty('--reach', String(reach / (CAMPAIGN.length - 1)));
    for (const b of this.el.track.querySelectorAll('[data-mission]')) {
      const id = +b.dataset.mission, rec = Progress.record(id), open = Progress.unlocked(id), comp = Progress.completed(id);
      const state = comp ? 'COMPLETE' : open ? (id === next ? 'NEXT' : 'OPEN') : this.game.dev ? 'LOCKED · DEV' : 'LOCKED';
      b.querySelector('.cmp-node').innerHTML = comp && rec && rec.bestMedal > 0 ? medalDisc(rec.bestMedal) : `<span class="num">${open || this.game.dev ? id : '🔒'}</span>`;
      b.querySelector('.cmp-state').textContent = state + (rec && rec.wins ? ` · ${fmtScore(rec.bestScore)}` : '');
      b.classList.toggle('locked', !open); b.classList.toggle('done', comp); b.classList.toggle('next', id === next && !comp);
      b.classList.toggle('sel', id === sel); b.setAttribute('aria-pressed', String(id === sel));
    }
    const c = mission(sel), rec = Progress.record(sel), open = Progress.unlocked(sel), comp = Progress.completed(sel);
    const best = rec && rec.bestRun;
    const cites = best ? assess(sel, best).citations : assess(sel, { win: false, score: -1, arrests: -1, damage: Infinity, peaceful: -1, home: -1, trampled: -1, squad: -1, burnt: -1 }).citations;
    const chip = comp ? '<span class="chip done">COMPLETE</span>' : open ? (sel === next ? '<span class="chip">NEXT</span>' : '<span class="chip calm">OPEN</span>') : '<span class="chip calm">LOCKED</span>';
    this.el.detail.innerHTML = `<div class="cmp-head">${chip}<span>LEVEL ${c.id} · ${c.time} · ${esc(c.place)}</span></div>`
      + `<h3>${esc(c.title)}</h3><p>${esc(c.briefing)}</p>`
      + `<div class="cmp-cols"><div><div class="lbl">OBJECTIVES</div><ul class="objectives">${c.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>`
      + `<div><div class="lbl">MEDAL CITATIONS${best ? ' · BEST RUN' : ''}</div><ul class="citations">${cites.map((x) => `<li class="${best && x.ok ? 'ok' : 'no'}"><span>${esc(x.label)}</span></li>`).join('')}</ul></div></div>`
      + (rec && rec.wins ? `<div class="cmp-best">${medalDisc(rec.bestMedal)}<span>BEST ${fmtScore(rec.bestScore)} · ${MEDALS[Math.max(0, rec.bestMedal)].rank}${rec.bestTime ? ' · ' + fmtTime(rec.bestTime) : ''} · ${rec.wins} ${rec.wins === 1 ? 'completion' : 'completions'}${best && best.assisted ? ' · assisted' : ''}</span></div>`
        : !open ? `<div class="cmp-best dim">Complete Level ${c.id - 1} to unlock${this.game.dev ? ' · developer build: START plays it anyway' : ''}</div>` : '');
    this.el.start.textContent = comp ? `REPLAY · LEVEL ${sel}` : `START · LEVEL ${sel}`;
    this.el.start.disabled = !this.canStart(sel);
    this.el.finale.classList.toggle('hidden', !campaignDone());
  }

  start() {
    const g = this.game, id = this.sel;
    if (!this.canStart(id)) return;
    if (g.level && id !== g.level.id) g.devStage = null; // a dev stage belongs to the level it was given for
    g.startLevel(id, { force: !!g.dev });
  }

  back() { this.game._screen(this.from); }

  // ------------------------------------------------------------------ the end of the night
  showFinale(from) {
    const g = this.game, $ = (id) => document.getElementById(id);
    this.finaleFrom = from || 'campaign-screen';
    Progress.setFinaleSeen();
    const recs = CAMPAIGN.map((c) => ({ c, r: Progress.record(c.id) }));
    const medals = recs.map(({ r }) => (r ? Math.max(0, r.bestMedal) : 0));
    const rating = Math.min(...medals);
    const total = recs.reduce((a, { r }) => a + (r ? r.bestScore : 0), 0);
    const clean = recs.every(({ r }) => r && r.bestRun && r.bestRun.peaceful === 0);
    $('fin-text').innerHTML = '<p>The boulevard is quiet. Le Patron is with the gendarmerie, the Fixer is in the cell beside him and their crews have scattered. The last train has left Gare de l\'Est and the canal is quiet.</p>'
      + `<p>${clean ? 'Nobody who came out to march tonight was struck by your baton.' : 'Most of the people on the street tonight came to demonstrate, and went home.'}</p>`;
    $('fin-stats').innerHTML = recs.map(({ c, r }) => `<div class="row"><span>${medalDisc(r ? r.bestMedal : 0)} Level ${c.id} · ${esc(c.card)}</span><span>${r && r.wins ? fmtScore(r.bestScore) + (r.bestTime ? ' · ' + fmtTime(r.bestTime) : '') : '—'}</span></div>`).join('')
      + `<div class="row total"><span>CAMPAIGN SCORE</span><span>${fmtScore(total)}</span></div>`
      + `<div class="rank">CAMPAIGN RATING · ${rating ? MEDALS[rating].name + ' · ' : ''}${MEDALS[rating].rank}</div>`
      + '<div class="dim small fin-note">Best result of each level. Replay any of them from the campaign screen.</div>';
    g.input.unlock();
    g._screen('finale-screen');
  }
}
