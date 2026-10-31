// Level 3 · "The Breakout" — environment build (Phase 2).
// The transfer route south of the CRS staging area to Place du Chateau-d'Eau and the
// gendarmerie's extraction point (district.js). This script walks the four acts so the
// district can be played through and checked: each act has its goal, its title card and a
// marker leading on; reaching the extraction point and pressing E ends the run. Encounters,
// the transfer van, hazards and the Fixer come in later stages (see the Level 3 design).
//
// Shares the Missions interface (reset / update / hudInfo / endInfo / jumpTo) with the
// other levels, so the game loop, HUD, end screen and developer shortcuts treat it the same.
import * as THREE from 'three';
import { Missions } from './missions.js';
import { buildDistrict, DISTRICT, areaAt } from './district.js';

export const L3_PHASES = DISTRICT.acts.map((a) => a.name);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Where the crowd lives here (crowd.js BOULEVARD_LAYOUT has the keys). Crew sites: a shop door,
// the crew's rally point on the pavement in front, and the way into the shop front.
export const L3_CROWD = {
  gatherPoints: [
    // the rally on the west side of the square (the first three take the big near-line groups)
    V(-24, 0, 392), V(-22, 0, 404), V(-25, 0, 380),
    V(-10, 0, 372), V(10, 0, 372), V(-12, 0, 418), V(28, 0, 420), V(18, 0, 395), V(-38, 0, 415), V(38, 0, 395),
    V(0, 0, 360), V(-30, 0, 240), V(30, 0, 241), V(0, 0, 262), V(40, 0, 300), V(-30, 0, 436),
  ],
  marchPaths: [
    [[-28, 360], [-28, 426], [26, 426], [26, 380]],
    [[-40, 352], [40, 352], [40, 438], [-40, 438]],
  ],
  crewSites: [
    { door: [-12.5, 262], rally: [-10.3, 263], face: [-1, 0] },
    { door: [12.5, 270], rally: [10.3, 271], face: [1, 0] },
    { door: [-12.5, 318], rally: [-10.3, 317], face: [-1, 0] },
    { door: [12.5, 330], rally: [10.3, 329], face: [1, 0] },
    { door: [35.5, 280], rally: [37.6, 281], face: [-1, 0] },
    { door: [44.5, 312], rally: [42.4, 311], face: [1, 0] },
    { door: [40, 233.5], rally: [40, 236.6], face: [0, -1] },
    { door: [-40, 246.5], rally: [-40, 243.4], face: [0, 1] },
    { door: [-47.5, 380], rally: [-44.2, 380], face: [-1, 0] },
    { door: [47.5, 415], rally: [44.2, 415], face: [1, 0] },
    { door: [-30, 444.5], rally: [-30, 441.2], face: [0, 1] },
    { door: [25, 345.5], rally: [25, 348.8], face: [0, -1] },
  ],
  bystanderZ: -1,                                    // nobody is moved onto a boulevard pavement
  focus: { lineZ: 1e9, frontZ: 395, behindZ: 395 },  // idle people face the monument
  bgExclude: [{ x0: -16, z0: 181, x1: 16, z1: 240 }], // background figures stood where the route now runs
};

// unrest round the district (events.js keys)
export const L3_EVENTS = {
  zones: [
    { name: 'Ateliers east', crowd: V(80, 0, 240), police: V(58, 0, 240) },
    { name: 'Ateliers west', crowd: V(-80, 0, 240), police: V(-58, 0, 240) },
    { name: 'Rue des Douanes', crowd: V(86, 0, 395), police: V(56, 0, 395) },
    { name: 'Rue de la Fontaine', crowd: V(-86, 0, 395), police: V(-56, 0, 395) },
    { name: 'South rooftops', crowd: V(0, 0, 525), police: V(0, 0, 500) },
    { name: 'Avenue roadblock', crowd: V(-2, 0, 302), police: V(0, 0, 284), inside: true },
  ],
  hazardZ: [186, 470],
  carFireZ: [186, 335],
  gas: { fromZ: 125, toZ: [86, 108], minPlayerZ: 1e9 }, // the CRS line's volleys stay on the boulevard
};

// what each act asks: a list of waypoints (the marker leads to the first not yet reached)
const ACT_GOALS = [
  { text: 'Through the cordon gate to Rue des Ateliers', way: [[2, 181, 4], [0, 240, 7]] },
  { text: 'Reach the square: the Avenue is blocked, the Passage is open', way: [[0, 349, 0]] },
  { text: 'Cross the square: the metro, then the monument', way: [[27, 376, 6], [0, 412, 7]] },
  { text: 'Reach the gendarmerie at the extraction point', way: [[0, 478, 3]], handover: true },
];
const TIMES = ['02h20', '02h23', '02h26', '02h29'];

export class Level3 extends Missions {
  constructor(game) {
    super(game);
    game.crowd.addReserveCrews(); // 12 crews in all, placed at the district's shop fronts
    if (!game.world.hasDistrict('l3')) game.world.registerDistrict('l3', buildDistrict(game.world, game.scene, game.renderer, game.camera));
    this.reset();
  }

  reset() {
    super.reset();
    this.completed = DISTRICT.acts.map(() => false);
    this.act = 0; this.section = 0; this.way = 0; this.cp = null;
  }

  _startAct(i) {
    const g = this.game;
    this.act = this.section = i; this.way = 0; this.stage = 'route'; this.stageT = 0;
    g.hud.titleCard(L3_PHASES[i], `${areaAt(...DISTRICT.acts[i].at)} · ${TIMES[i]}`);
    this.cp = { section: i, score: this.score, stats: { ...this.stats }, t: this.t };
  }

  // Restart at an act: RETRY SECTION and the developer shortcuts (?dev&level=3&stage=N, __jump)
  resume(cp) {
    const g = this.game, a = DISTRICT.acts[cp.section];
    for (let k = 0; k < cp.section; k++) this.completed[k] = true;
    this.score = cp.score || 0; this.t = cp.t || 0;
    g.player.pos.set(a.at[0], 0, a.at[1]); g.player.heading = a.heading;
    g.cameraRig.reset(g.player);
    this._startAct(cp.section);
  }
  jumpTo(i) { this.resume({ section: Math.max(0, Math.min(DISTRICT.acts.length - 1, i | 0)) }); }

  update(dt) {
    const g = this.game, p = g.player.pos;
    this.t += dt; this.stageT += dt;
    this.tension.update(dt);
    if (this.stage === 'intro') { if (this.stageT > 1.2) this._startAct(0); this._updateMarker(dt); return; }
    if (this.stage !== 'route') { this._updateMarker(dt); return; }
    const goal = ACT_GOALS[this.act], w = goal.way[this.way];
    this.markerPos = V(w[0], 0, w[1]);
    // r = 0: a line to cross (z), otherwise a circle to reach
    const reached = w[2] === 0 ? p.z > w[1] : Math.hypot(p.x - w[0], p.z - w[1]) < w[2];
    if (reached && this.way < goal.way.length - 1) this.way++;
    else if (reached && goal.handover) {
      g.hud.prompt('E', 'Hand over the prisoner');
      if (g.input.pressed('KeyE')) { this._phaseDone(this.act, 500, 'Transfer route complete'); this.complete(); }
    } else if (reached) {
      this._phaseDone(this.act, 200, `${L3_PHASES[this.act]} · route walked`);
      this._startAct(this.act + 1);
    }
    this._updateMarker(dt);
  }

  complete() {
    if (this.ended) return;
    this.ended = true;
    this.stage = 'done'; this.markerPos = null;
    this.game.endGame(true);
  }

  hudInfo() {
    const i = Math.min(this.act, L3_PHASES.length - 1), p = this.game.player.pos;
    const info = { index: i, phaseName: L3_PHASES[i], text: ACT_GOALS[i].text, status: 'calm', chip: 'PREVIEW', detail: '', bar: null, completed: this.completed };
    if (this.stage === 'intro') return Object.assign(info, { text: 'CRS staging area', chip: 'STANDBY', detail: 'Radio traffic incoming…' });
    const d = this.markerPos ? Math.round(Math.hypot(p.x - this.markerPos.x, p.z - this.markerPos.z)) : 0;
    return Object.assign(info, { detail: `${d} m · ${areaAt(p.x, p.z)}` });
  }

  endInfo(win, reason) {
    const fmt = (v) => `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}`;
    return {
      title: win ? 'LEVEL 3 · ROUTE WALKED' : 'MISSION FAILED',
      sub: win ? 'Environment preview: the transfer route from the staging area to the gendarmerie' : reason || '',
      rows: [['Acts walked', `${this.completed.filter(Boolean).length} / ${L3_PHASES.length}`], ['Time', fmt(this.t)]],
      hook: '',
      rank: win ? 'Encounters, the transfer van and the Fixer arrive in the next stages' : 'Restart to try again',
    };
  }
}
