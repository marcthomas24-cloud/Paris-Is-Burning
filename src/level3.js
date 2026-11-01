// Level 3 · "The Breakout".
// 02h20, twenty minutes after le Patron's arrest. He is loaded into a CRS transfer van at the
// staging area; the gendarmerie will take him at an extraction point beyond Place du
// Château-d'Eau. What is left of his crews means to stop the van on the way, organised by a
// man the radio only knows as the Fixer. The officer escorts the van there (district.js).
//
//  Act 1 THE TRANSFER   S0  the van, the first crews, a breach at its doors, a car about to blow
//  Act 2 THE ROADBLOCK  S1  the route choice: the Avenue (roadblock, heavier fighting) or the
//                           Passage (narrow, a petrol trail and a scaffold, fewer attackers)
//                       S2  both routes meet the same group at the square's north edge
//  Act 3 THE SQUARE     S3  a peaceful rally; the crew's stash and phone reveal the Fixer;
//                           fireworks into the rally, a panicked surge with two attackers in it;
//                           the crew's last line at the south exit
//  Act 4 THE INTERCEPT  S4  the Fixer's final attempt: the van parks in the arena and he fights
//                           the officer himself (boss.js FIXER); arrested, his crews scatter
//                       S5  the last stand, then the handover at the extraction point
//
// The Fixer is nobody's cause: he runs le Patron's crews day to day and is breaking him out to
// keep the network, and his own place in it, together.
//
// Cinematics (all skippable; the radio waits while one plays): the transfer briefing, the
// Fixer's reveal in the square, his introduction before the fight, his arrest, the handover.
//
// Every section is a checkpoint, and so is the start of the Fixer's fight (a retry goes
// straight back into it). The van (convoy.js) holds at the end of each section until
// its gate is met; the hazards are hazards.js; the groups are EncounterRunner data, drawn
// only from the crews (never from the rally or passers-by). Shares the Missions interface
// (reset / update / hudInfo / endInfo / resume / jumpTo) with the other levels.
import * as THREE from 'three';
import { Missions } from './missions.js';
import { EncounterRunner } from './encounters.js';
import { buildDistrict, DISTRICT, areaAt } from './district.js';
import { TransferVan, VanPath, breacherScript, VAN } from './convoy.js';
import { HazardDirector, igniterScript, firerScript } from './hazards.js';
import { randomOutfit, giveItem, clearItem, attachGloves } from './characters.js';
import { vanParts } from './vehicles.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { orbit, overShoulderAt, frontOf } from './cinematic.js';
import { Boss, FIXER } from './boss.js';
import { mulberry } from './textures.js';

export const L3_PHASES = DISTRICT.acts.map((a) => a.name);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const HOOK = 'Control: "The Fixer\'s phone keeps ringing. Somebody else is paying now."';
const FAIL_VAN = 'The transfer vehicle was disabled. Le Patron is gone.';

// Where the crowd lives here (crowd.js BOULEVARD_LAYOUT has the keys). Crew sites: a shop door,
// the crew's rally point on the pavement in front, and the way into the shop front.
export const L3_CROWD = {
  gatherPoints: [
    // the rally on the west side of the square (the first three take the big near-line groups)
    V(-24, 0, 392), V(-22, 0, 404), V(-25, 0, 380),
    V(-10, 0, 372), V(21, 0, 371), V(-12, 0, 418), V(28, 0, 420), V(18, 0, 395), V(-38, 0, 415), V(38, 0, 395),
    V(-15, 0, 357), V(-30, 0, 240), V(52, 0, 240), V(-10.5, 0, 262), V(10.5, 0, 318), V(-30, 0, 436), // (none on the van's line)
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
    // (west side too: the van runs along the east pavement here, and a crew gathered there stood in its way)
    { door: [35.5, 296], rally: [37.0, 297], face: [-1, 0] },
    { door: [40, 233.5], rally: [40, 236.6], face: [0, -1] },
    { door: [-40, 246.5], rally: [-40, 243.4], face: [0, 1] },
    { door: [-47.5, 380], rally: [-44.2, 380], face: [-1, 0] },
    { door: [47.5, 415], rally: [44.2, 415], face: [1, 0] },
    { door: [-30, 444.5], rally: [-30, 441.2], face: [0, 1] },
    { door: [25, 345.5], rally: [25, 348.8], face: [0, -1] },
    // Level 3's own three crews (crowd.addDistrictCrews)
    { door: [-25, 233.5], rally: [-25, 236.6], face: [0, -1] },
    { door: [22, 444.5], rally: [22, 441.2], face: [0, 1] },
    { door: [47.5, 360], rally: [44.2, 358], face: [1, 0] },
  ],
  bystanderZ: -1,                                    // nobody is moved onto a boulevard pavement
  focus: { lineZ: 1e9, frontZ: 395, behindZ: 395 },  // idle people face the monument
  bgExclude: [{ x0: -16, z0: 181, x1: 16, z1: 240 }], // background figures stood where the route now runs
};

// unrest round the district (events.js keys); scenery only, kept off the van's route
export const L3_EVENTS = {
  zones: [
    { name: 'Ateliers east', crowd: V(80, 0, 240), police: V(58, 0, 240) },
    { name: 'Ateliers west', crowd: V(-80, 0, 240), police: V(-58, 0, 240) },
    { name: 'Rue des Douanes', crowd: V(86, 0, 395), police: V(56, 0, 395) },
    { name: 'Rue de la Fontaine', crowd: V(-86, 0, 395), police: V(-56, 0, 395) },
    { name: 'South rooftops', crowd: V(0, 0, 525), police: V(0, 0, 500) },
  ],
  hazardZ: [186, 470],
  carFireZ: [186, 335],
  gas: { fromZ: 125, toZ: [86, 108], minPlayerZ: 1e9 }, // the CRS line's volleys stay on the boulevard
};

// ------------------------------------------------------------------ the van's routes
// One polyline per route from the staging area to the extraction point; both share the
// stretch to the junction and everything from the monument on. Named points are holds.
// (the staging area's own CRS vans park across the lane north of z 170, so the van starts in it)
const COMMON = [[-0.6, 174.5, 'start'], [-0.6, 181], [-1, 190], [-1, 224], [0, 231], [0, 236.5, 'H1']];
const TAIL = [[9, 383, 'monument'], [9, 398], [5.5, 407], [3, 414, 'arena'], [3, 424], [3.6, 436], [3.6, 452], [2.6, 474, 'extract']];
const ROUTE_A = [[0, 246], [1.5, 258], [1.5, 274, 'roadblock'], [3.8, 283], [6.4, 288.5], [6.5, 296], [3, 305], [1.5, 313], [1.5, 338, 'routeEnd'], [3, 350], [8, 360], [9, 370]];
// the Passage: round the cars parked in the lane (east at z 262, west at 278 and 315: fixed by the
// district's own stream), the bin pyre at 324, and inside the lamps and the scaffold poles
const ROUTE_B_IN = [[8, 240.6], [24, 241], [33, 241.4], [37.6, 243.4], [39, 248], [38.6, 252], [38.6, 266], [41.3, 274.5], [41.3, 282], [40.6, 290], [40.6, 304], [42.05, 311], [42.05, 327], [40.5, 333]];
// out of the lane round the east end of the car parked at its mouth, north of the Morris column
const ROUTE_B_OUT = [[40, 338, 'routeEnd'], [41, 344], [43, 350], [42.5, 354.6], [37, 354.8], [28, 354.8], [19, 355.5], [12, 358.5], [9.5, 366], [9, 373]];

// ------------------------------------------------------------------ the sections
// act: index in L3_PHASES · van: the hold it starts from · hold: where it waits for the gate
// encounters: EncounterRunner data (base members; a tense crowd adds one from the same pool)
const SECTIONS = [
  {
    id: 'transfer', act: 0, van: 'start', hold: 'H1', player: [4.2, 170.5, 0],
    text: 'Escort the transfer van to Rue des Ateliers',
    encounters: [
      { id: 'gate', trigger: { vanZ: 186 }, alert: 'Crews behind the parked cars!',
        members: [{ style: 'melee', at: [-6, 214] }, { style: 'melee', at: [5, 218] }, { style: 'thrower', at: [9, 224] }] },
      { id: 'doors', trigger: { after: 'gate', vanZ: 194 }, alert: 'They are going for the van\'s rear doors!',
        members: [{ style: 'breacher', at: [-11.5, 187] }, { style: 'breacher', at: [11.5, 185] }] },
      { id: 'junction', trigger: { after: 'doors', vanZ: 222 }, alert: 'Group at the junction — shield up front',
        members: [{ style: 'shield', at: [0, 250] }, { style: 'thrower', at: [-14, 243] }, { style: 'thrower', at: [16, 238.5] }, { style: 'melee', at: [-8, 245] }] },
    ],
  },
  {
    id: 'fork', act: 1, van: 'H1', hold: 'routeEnd', player: [2, 228, 0], choice: true,
    text: 'Choose the route: the Avenue or the Passage',
    encounters: [
      { id: 'rbFront', route: 'A', trigger: { z: 262 }, alert: 'Throwers behind the roadblock!', events: [['mortar']],
        members: [{ style: 'thrower', at: [-5, 298] }, { style: 'thrower', at: [2, 300] }, { style: 'thrower', at: [7.5, 299] }, { style: 'melee', at: [-11, 283] }, { style: 'melee', at: [11, 285] }] },
      { id: 'rbFlank', route: 'A', trigger: { after: 'rbFront' }, alert: 'Shields out of the shop fronts',
        members: [{ style: 'shield', at: [-11.5, 305] }, { style: 'shield', at: [11.5, 306] }, { style: 'melee', at: [-10.5, 309] }] },
      { id: 'doorways', route: 'B', trigger: { x: 30 }, alert: 'Out of the doorways — close quarters!',
        members: [{ style: 'melee', at: [36, 264] }, { style: 'melee', at: [44, 271] }, { style: 'melee', at: [36.4, 279] }] },
      { id: 'igniter', route: 'B', trigger: { after: 'doorways', vanZ: 278 }, alert: 'Someone at the petrol in the lane!',
        members: [{ style: 'igniter', at: [36.6, 318] }] },
      { id: 'laneBomber', route: 'B', trigger: { after: 'doorways', vanZ: 282 }, bomber: [43.2, 326] },
    ],
  },
  {
    id: 'squareGate', act: 1, van: 'routeEnd', hold: 'routeEnd', player: null,
    text: 'Clear the crews at the edge of the square',
    encounters: [
      { id: 'squareGate', trigger: { now: true }, alert: 'Crews holding the north side of the square', events: [['mortar']],
        members: [{ style: 'shield', at: [2, 362] }, { style: 'melee', at: [-5, 364] }, { style: 'melee', at: [7, 360] }, { style: 'thrower', at: [-11, 369] }],
        atB: [[28, 360], [22, 364], [33, 362], [16, 370]] },
    ],
  },
  {
    id: 'square', act: 2, van: 'routeEnd', hold: 'monument', player: null,
    text: 'Secure the square',
    encounters: [
      { id: 'stash', trigger: { now: true }, alert: 'Crew guarding a scooter on the east side',
        members: [{ style: 'shield', at: [31, 386] }, { style: 'melee', at: [40, 388] }, { style: 'melee', at: [38, 398] }, { style: 'thrower', at: [41.5, 405] }] },
      { id: 'fireworks', trigger: { flag: 'stashSearched' }, members: [{ style: 'fireworks', at: [-23, 413] }] },
      { id: 'surge', trigger: { flag: 'surge' }, alert: 'Two of them using the crowd as cover — pick them out',
        members: [{ style: 'melee', at: [-20, 377] }, { style: 'melee', at: [-17, 383] }] },
      { id: 'towTruck', trigger: { flag: 'glimpsed' }, alert: 'The crew\'s last line — both sides of the exit!', events: [['carFire', [-7.7, 452]]],
        members: [{ style: 'shield', at: [-14, 441.5] }, { style: 'shield', at: [14, 442] }, { style: 'thrower', at: [-21, 440.5] }, { style: 'melee', at: [19, 441] }] },
    ],
  },
  {
    id: 'intercept', act: 3, van: 'monument', hold: 'arena', player: null, boss: 'fixer', spawn: [0, 430],
    text: 'The Fixer is going for the van',
    encounters: [],
  },
  {
    id: 'extraction', act: 3, van: 'arena', hold: 'extract', player: null,
    text: 'Get the van to the gendarmes',
    encounters: [
      { id: 'lastStand', trigger: { vanZ: 434 }, alert: 'Last push from the gap by the crew van!',
        members: [{ style: 'melee', at: [-1.5, 456] }, { style: 'melee', at: [5, 462] }, { style: 'thrower', at: [0, 470] }] },
    ],
  },
];
const ACT_FIRST = [0, 1, 3, 4];
const TIMES = ['02h20', '02h23', '02h26', '02h29'];
const ROUTE_NAME = { A: 'The Avenue', B: 'The Passage' };
const STASH = [36.5, 391.5];
const BARRICADE_PTS = [[2.75, 288.5], [6.25, 288.5]]; // on the barricade's line: reachable from either side
const ROUTE_TARGETS = { A: [0, 262], B: [36, 241] };

// the radio: who speaks, and the lines (behaviour and places only, never appearance)
const LINES = {
  start: ['CONTROL', 'The canal can wait. His crews are coming for the van tonight. Escort it to the gendarmes beyond the square.'],
  route: ['CONTROL', 'Transfer route confirmed: Rue des Ateliers, then Place du Château-d\'Eau. Stay within twenty metres of the van.'],
  roll: ['VAN 1', 'Rolling. Stay close, we can\'t stop for long.'],
  crews: ['MOTO 3', 'Crews gathering south of the cordon, behind the parked cars.'],
  doors: ['VAN 1', 'Two at the back doors!'],
  cookoff: ['MOTO 3', 'Burning car ahead, its tank is going. Hold the van back.'],
  fork: ['MOTO 3', 'Avenue is blocked: burning barricade, throwers behind it. The Passage is open but narrow, and they have been in there.'],
  routeA: ['CONTROL', 'Avenue. Clear that roadblock and the van will push through.'],
  routeB: ['CONTROL', 'Passage. Watch the scaffolding and the doorways.'],
  barricade: ['VAN 1', 'Can\'t get past that barricade. Drag it clear and we\'ll squeeze through.'],
  gate: ['MOTO 3', 'Square ahead. They are waiting for you on the north side.'],
  square: ['CONTROL', 'A rally is filling the west side of the square. Peaceful. Keep the van east of the monument.'],
  stash: ['CONTROL', 'That scooter on the east side is theirs. Clear it and search it.'],
  reveal: ['CONTROL', 'The phone has it: a van across the south exit, and a man they call the Fixer running the breakout.'],
  fixer: ['MOTO 3', 'Someone on the phone by that van at the exit, waving them in.'],
  secured: ['CONTROL', 'Square secured. Take the van to the south exit.'],
  dmg75: ['VAN 1', 'They\'re hitting the van!'],
  dmg50: ['VAN 1', 'We\'re taking a beating in here!'],
  dmg25: ['VAN 1', 'Engine\'s smoking — one more push and we\'re finished!'],
  alone: ['VAN 1', 'Where are you? We\'re alone out here!'],
  intercept: ['CONTROL', 'The Fixer is moving on the van himself.'],
  fixerFight: ['CONTROL', 'He is quick and he is patient. Let him commit, then hit him.'],
  fixerDown: ['CONTROL', 'The Fixer is in custody. His crews are breaking up. Get the van moving.'],
  extract: ['CONTROL', 'Gendarmes are at the extraction point. Bring the van in.'],
  handover: ['CONTROL', 'Transfer complete. Le Patron is in gendarmerie custody.'],
};

// The Fixer's look is fixed, and unlike either earlier boss: lean and athletic, a fitted dark
// technical jacket with signal-orange piping, black tactical gloves with orange cuffs (added in
// the constructor), orange trainers, a black cap; no scarf, no face covering, nothing in his hands
// but a phone. Complexion and build come from the shared generator.
function fixerOutfit() {
  let o = null;
  for (let s = 5150; !o || o.gender !== 'm' || o.base !== 'male'; s++) o = randomOutfit(mulberry(s));
  Object.assign(o, {
    top: 'track', smart: false, topColor: 0x1d2026, topBase: 0x1d2026, longSleeve: true, stripe: 0xd2561a,
    garment: 'hoodie', shellColor: 0x1d2026, shellPattern: 8, pa: 0xd2561a, vest: false, keepTop: false,
    scarf: 'none', mask: 'none', hat: 'cap', hatColor: 0x111111, hood: false, backpack: false,
    pants: 0x17181c, shoes: 0xc9521c, height: 1.02, build: 0.94,
  });
  o.body = { ...o.body, girth: 0.9, shoulders: 1.03 };
  return o;
}

export class Level3 extends Missions {
  constructor(game) {
    super(game);
    game.crowd.addReserveCrews();   // 12 crews at the district's shop fronts
    game.crowd.addDistrictCrews(3); // and Level 3's own three: 60 crew members in all
    if (!game.world.hasDistrict('l3')) {
      const n0 = game.world.colliders.length;
      const d = buildDistrict(game.world, game.scene, game.renderer, game.camera);
      d.colliders = game.world.colliders.slice(n0); // switched off with the district (world.setDistrict)
      game.world.registerDistrict('l3', d);
    }
    this.D = game.world.districts.l3;
    this.enc = new EncounterRunner(game, 1, 'escort');
    this.van = game.l3van || (game.l3van = new TransferVan(game));
    this.van.onDamage = (a, kind) => this._onVanDamage(a, kind);
    this.hz = new HazardDirector(game);
    this.fixer = game.crowd.fixer || (game.crowd.fixer = game.crowd.spawnSpecial(fixerOutfit()));
    attachGloves(this.fixer.rig); // once per rig: part of his look in every scene
    this.props = game.l3props || (game.l3props = this._buildProps());
    this.paths = this._paths();
    this._showProps(true);
    this.reset();
  }

  dispose() {
    if (this.boss) { this.boss.stop(); this.boss = null; } // switching level mid-fight
    this.van.show(false);
    this._showProps(false);
    this.hz.dispose();
    for (const r of this.D.roadblock || []) { r.group.visible = true; r.cols.forEach((c) => { c.off = false; }); }
    if (this.fixer) this.game.crowd.retire(this.fixer);
    super.dispose();
  }

  reset() {
    super.reset();
    this.completed = DISTRICT.acts.map(() => false);
    this.phaseTimes = DISTRICT.acts.map(() => 0);
    this.section = 0; this.act = 0;
    this.route = null; this.flags = {};
    this.cp = null;
    Object.assign(this.stats, { blocked: 0, dodges: 0, vanHits: 0, vanLost: 0, hazardTakedowns: 0, breachesStopped: 0, breachesDone: 0 });
    this.radioQ = []; this.radioGap = 0; this.radioLog = []; this.radioSaid = {};
    this.vanAtExtract = null; this.bossTimes = {}; this.fixerMet = false;
    this.busy = null; this.promptE = false; this.searched = false;
    this.cleared = [false, false];
    this.passageDamage = 0;
    this.igniter = null; this.firer = null;
    this.musicTier = 0;
    if (this.boss) { this.boss.stop(); this.boss = null; }
    if (!this.enc) return; // first call, from the Missions constructor
    this.enc.reset();
    this.hz.reset();
    for (const r of this.D.roadblock || []) { r.group.visible = true; r.cols.forEach((c) => { c.off = false; }); }
    this.van.reset();
    this.van.show(true);
    this.van.restore(this.paths.A, this.paths.A.holds.start, VAN.max);
    this.van.parked = false;
    this.game.crowd.retire(this.fixer);
  }

  // ------------------------------------------------------------- props and paths
  _buildProps() {
    const w = this.game.world, scene = this.game.scene;
    const group = (parts, x, z, ry) => {
      const byKey = new Map();
      for (const [k, g0] of parts) { let g = g0.index ? g0.toNonIndexed() : g0; for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(g); }
      const grp = new THREE.Group();
      for (const [k, list] of byKey) { const m = mergeGeometries(list, false); if (m) { const mesh = new THREE.Mesh(m, w.mat(k)); mesh.castShadow = true; mesh.receiveShadow = true; grp.add(mesh); } }
      grp.position.set(x, 0, z); grp.rotation.y = ry; grp.visible = false; scene.add(grp);
      return grp;
    };
    // the crew's van parked across the west half of the south exit
    const cv = vanParts('civ', 'cars:5');
    const crewVan = { mesh: group(cv.parts, -3.2, 449, 1.15), box: [-3.2, 449, cv.W + 0.2, cv.L + 0.2, 1.15, 2.5] };
    // the crew's scooter and holdall on the east side of the square
    const B = (k, w0, h, d, x, y, z, rz = 0) => { const g = new THREE.BoxGeometry(w0, h, d); g.rotateZ(rz); g.translate(x, y, z); return [k, g]; };
    const sc = [B('scooter', 0.5, 0.35, 1.5, 0, 0.45, 0), B('scooter', 0.42, 0.2, 0.6, 0, 0.75, -0.3), B('darkMetal', 0.05, 0.9, 0.05, 0, 0.8, 0.62), B('darkMetal', 0.6, 0.04, 0.04, 0, 1.25, 0.62), B('tyre', 0.12, 0.42, 0.42, 0, 0.21, 0.55), B('tyre', 0.12, 0.42, 0.42, 0, 0.21, -0.55), B('black', 0.7, 0.35, 0.4, 0.7, 0.18, 0.2), B('cardboard', 0.5, 0.4, 0.45, -0.75, 0.2, -0.2)];
    const scooter = { mesh: group(sc, STASH[0], STASH[1], 0.3), box: [STASH[0], STASH[1], 1.0, 1.7, 0.3, 1.1] };
    return { crewVan, scooter, cols: [] };
  }

  _showProps(on) {
    const P = this.props, w = this.game.world;
    for (const p of [P.crewVan, P.scooter]) {
      p.mesh.visible = on;
      if (on && !p.col) p.col = w.addObstacle(p.box[0], p.box[1], p.box[2], p.box[3], p.box[4], p.box[5], 'prop');
      if (!on && p.col) { w.removeCollider(p.col); p.col = null; }
    }
  }

  _paths() {
    return { A: new VanPath([...COMMON, ...ROUTE_A, ...TAIL]), B: new VanPath([...COMMON, ...ROUTE_B_IN, ...ROUTE_B_OUT, ...TAIL], [[34, 246, 46, 345]]) };
  }
  path() { return this.paths[this.route || 'A']; }

  // ------------------------------------------------------------- sections
  _startSection(i, resumed = false) {
    const g = this.game, sec = SECTIONS[i];
    const newAct = sec.act !== this.act || i === 0;
    this.section = i; this.act = sec.act; this.stage = 'route'; this.stageT = 0;
    this.busy = null; this.flags = {};
    this.musicTier = sec.act; // the score builds act by act (music.js)
    if (this.boss) { this.boss.stop(); this.boss = null; }
    this.enc.load(sec.encounters);
    this.hz.reset();
    g.events.setHazards(false);
    const P = this.path(), van = this.van;
    van.parked = false; van.invulnerable = false; van.graceT = VAN.grace;
    van.limitS = Math.max(van.s, P.holds[sec.van] ?? van.s);
    if (newAct && !resumed) g.hud.titleCard(L3_PHASES[sec.act], `${areaAt(van.pos.x, van.pos.z)} · ${TIMES[sec.act]}`);
    else if (newAct) g.hud.titleCard(L3_PHASES[sec.act], `${areaAt(van.pos.x, van.pos.z)} · ${TIMES[sec.act]}`, 2.5);
    this.rolled = i > 0;
    if (i === 0) {
      // armed once the doors are safe, so it never lands on top of the first two fights
      this.hz.add({ id: 'cookoff1', kind: 'cookoff', pos: [-6.5, 212], r: 6.5, telegraph: 6.5, triggerVan: 26, triggerPlayer: 11, onTelegraph: () => this.say('cookoff'), ready: () => this.enc.state.doors && this.enc.state.doors.status === 'resolved' });
    } else if (i === 1) {
      this.say('fork');
      if (this.route) this._takeRoute(this.route, true);
    } else if (i === 2) {
      van.limitS = P.holds.routeEnd;
      this.say('gate');
    } else if (i === 3) {
      van.limitS = P.holds.monument;
      this.say('square'); this.say('stash');
    } else if (i === 4) {
      van.limitS = P.holds.arena;
      this.say('intercept');
    } else if (i === 5) {
      van.limitS = P.holds.extract;
      this.say('extract');
    }
    // checkpoint: a retry restarts this section with the score, the route and the van as they were
    this.cp = { section: i, score: this.score, stats: { ...this.stats }, t: this.t, route: this.route, van: van.integrity, vanS: van.s, completed: [...this.completed] };
  }

  _takeRoute(r, resumed = false) {
    const g = this.game;
    this.route = r;
    this.van.setPath(this.paths[r], this.van.s);
    if (r === 'A') {
      this.van.limitS = this.paths.A.holds.roadblock;
      this.hz.add({ id: 'cookoff2', kind: 'cookoff', pos: [-9.5, 286], r: 6.5, telegraph: 6.5, triggerVan: 0, triggerPlayer: 10 });
    } else {
      this.van.limitS = this.paths.B.holds.routeEnd;
      this.hz.add({ id: 'trail', kind: 'trail', x0: 37.1, x1: 42.9, z: 312, telegraph: 2.2, life: 8, lightAt: [37.6, 314.5], lightWithin: 12 });
      this.hz.add({ id: 'scaffold', kind: 'scaffold', x0: 42.7, x1: 45.1, z0: 284, z1: 300, len: 5, telegraph: 1.2 });
    }
    if (!resumed) { this.say(r === 'A' ? 'routeA' : 'routeB'); g.hud.alert(`Route: ${ROUTE_NAME[r]}`, 'info', 2.5); }
    this.vanLostAtRoute = this.van.lost;
  }

  // Restart at a section: RETRY SECTION and the developer shortcuts. Earlier sections count as
  // done; the route defaults to the Avenue for a jump past the choice.
  resume(cp) {
    const g = this.game, sec = SECTIONS[cp.section];
    for (let k = 0; k < sec.act; k++) this.completed[k] = true;
    if (cp.completed) this.completed = [...cp.completed];
    this.score = cp.score || 0; this.t = cp.t || 0;
    if (cp.stats) Object.assign(this.stats, cp.stats);
    this.route = cp.route || (cp.section >= 2 ? 'A' : null);
    this.vanLostAtRoute = this.stats.vanLost || 0;
    this.fixerMet = cp.section >= 5;
    const P = this.path();
    if (this.route === 'A' && cp.section >= 2) for (const r of this.D.roadblock || []) { r.group.visible = false; r.cols.forEach((c) => { c.off = true; }); }
    // the fight's checkpoint (cp.fight): the van already parked in the arena
    this.van.restore(P, cp.vanS ?? P.holds[cp.fight ? sec.hold : sec.van], cp.van ?? VAN.max);
    this.van.incidents = this.stats.vanHits || 0; this.van.lost = this.stats.vanLost || 0; // the run's totals carry on
    this.van.show(true);
    // the officer stands behind the van (or at the level start)
    if (sec.player) { g.player.pos.set(sec.player[0], 0, sec.player[1]); g.player.heading = sec.player[2]; }
    else {
      const f = this.van.fwd(V());
      let x = this.van.pos.x - f.x * 7.5, z = this.van.pos.z - f.z * 7.5;
      for (let k = 0; k < 8 && g.world.blocked(x, z, 0.5); k++) { x += f.x; z += f.z; }
      g.player.pos.set(x, 0, z); g.player.heading = this.van.heading;
    }
    g.cameraRig.reset(g.player);
    this.lastHealth = g.player.health;
    this._startSection(cp.section, true);
    if (cp.fight && SECTIONS[cp.section].boss) this._startFixerFight();
  }
  // ?dev&level=3&stage=N and __jump(N): the act's first section; 'fixer' (?dev&level=3&stage=fixer,
  // __boss('fixer')): straight into the Fixer's fight
  jumpTo(i) {
    if (i === 'fixer') return this.resume({ section: SECTIONS.findIndex((s) => s.boss === 'fixer'), fight: true });
    this.resume({ section: ACT_FIRST[Math.max(0, Math.min(ACT_FIRST.length - 1, i | 0))] });
  }
  jumpToSection(i) { this.resume({ section: Math.max(0, Math.min(SECTIONS.length - 1, i | 0)) }); }

  _actDone(act, bonus, text) {
    if (this.completed[act]) return;
    this._phaseDone(act, bonus, text);
  }

  _nextSection() {
    if (this.section + 1 < SECTIONS.length) this._startSection(this.section + 1);
  }

  // ------------------------------------------------------------- update
  update(dt) {
    const g = this.game, p = g.player.pos, van = this.van;
    this.t += dt; this.stageT += dt;
    this.tension.update(dt);
    this.promptE = false; this.dt = dt;
    this._radioUpdate(dt);
    this._trackDamage();
    if (this.stage === 'intro') {
      if (this.stageT > 1.2) {
        this._startSection(0);
        this.say('start'); this.say('route');
        this._introCinematic();
      }
      van.update(dt);
      this._updateMarker(dt);
      return;
    }
    van.update(dt, this.stage === 'route' ? this.hz.zones() : []);
    this.hz.update(dt);
    if (this.stage === 'route') {
      this.enc.update(dt);
      const sec = SECTIONS[this.section];
      this[`_s_${sec.id}`](dt, sec);
      this._officerDistance();
    } else if (this.stage === 'glimpse') {
      if (!g.cinematic) { this.stage = 'route'; this.flags.glimpsed = true; this._fixerLeaves(); }
    } else if (this.stage === 'custody') {
      if (!g.cinematic) this._afterCustody(); // (its onDone normally gets there first)
    }
    // arrests (an interaction prompt takes precedence)
    if (!this.promptE && this.stage !== 'victory') {
      const a = g.crowd.arrestable(p);
      if (a) {
        g.hud.prompt('E', 'Arrest suspect');
        if (g.input.pressed('KeyE')) { g.crowd.arrest(a); this.onArrest(a); }
      }
    }
    this._marker();
    this._warnings();
    this._updateMarker(dt);
  }

  // Act 1: the van moves off after the briefing, once the officer is beside it (or after a while),
  // then holds at the junction
  _s_transfer(dt) {
    const g = this.game, van = this.van;
    if (!this.rolled) {
      van.limitS = van.s;
      if ((this.stageT > 7 && g.player.pos.distanceTo(van.pos) < 9) || this.stageT > 20) {
        this.rolled = true; van.limitS = this.path().holds.H1;
        this.say('roll'); this.say('crews');
      }
      return;
    }
    const st = this.enc.state.doors;
    if (st && st.status === 'active' && !this.radioSaid.doors) this.say('doors');
    const ck = this.hz.get('cookoff1');
    if (this.enc.cleared() && van.atHold() && (!ck || ck.state === 'spent' || ck.state === 'armed')) {
      if (ck && ck.state === 'armed') ck.state = 'spent'; // never reached: it stays a backdrop
      this._actDone(0, 500, 'The van is at Rue des Ateliers');
      this._nextSection();
    }
  }

  // Act 2: the route is chosen by walking into one of the two streets; the van follows
  _s_fork(dt) {
    const g = this.game, p = g.player.pos, van = this.van;
    if (!this.route) {
      if (Math.abs(p.x) < 12 && p.z > 250) this._takeRoute('A');
      else if (p.x > 26 && p.z > 235 && p.z < 252) this._takeRoute('B');
      return;
    }
    if (this.route === 'A') {
      const front = this.enc.state.rbFront, flank = this.enc.state.rbFlank;
      const fought = front && flank && front.status === 'resolved' && flank.status === 'resolved';
      if (fought && !this.radioSaid.barricade) this.say('barricade');
      if (fought && (!this.cleared[0] || !this.cleared[1])) {
        BARRICADE_PTS.forEach(([x, z], i) => { if (!this.cleared[i]) this._interact(V(x, 0, z), 2.4, 'Drag the barricade clear', 1.0, () => this._clearBarricade(i)); });
      }
      if (this.cleared[0] && this.cleared[1] && van.limitS < this.paths.A.holds.routeEnd) van.limitS = this.paths.A.holds.routeEnd;
    } else {
      // the trail cannot block the van for ever: with no igniter it is cleared
      const tr = this.hz.get('trail'), ig = this.enc.state.igniter;
      if (tr && ig && ig.status !== 'waiting' && !this.igniter && tr.state === 'armed') this.hz.defuseTrail(tr, false);
      if (ig && ig.status === 'resolved' && tr && (tr.state === 'armed')) this.hz.defuseTrail(tr, false);
    }
    if (this.enc.cleared() && van.atHold() && van.s >= this.path().holds.routeEnd - 0.5) {
      if (this.route === 'A') this.addScore(300, 'Roadblock cleared');
      else if (van.lost - this.vanLostAtRoute < 0.5) this.addScore(300, 'Passage: van untouched');
      this._nextSection();
    }
  }

  _clearBarricade(i) {
    const g = this.game, r = this.D.roadblock && this.D.roadblock[i];
    this.cleared[i] = true;
    if (r) { r.group.visible = false; r.cols.forEach((c) => { c.off = true; }); }
    const [x, z] = BARRICADE_PTS[i];
    g.effects.dust(V(x, 0.3, z + 1.5), 14);
    g.audio.crash(V(x, 0.5, z + 1.5), 0.6);
    g.hud.alert(this.cleared[0] && this.cleared[1] ? 'Roadblock open — the van can get through' : 'One half dragged clear', 'good', 2.5);
  }

  // Act 2: both routes meet the same group at the square's north edge
  _s_squareGate() {
    if (this.enc.cleared()) {
      this._actDone(1, 600, 'Route secured to the square');
      this._nextSection();
    }
  }

  // Act 3: the stash, the reveal, the fireworks and the surge, the Fixer, the crew's last line
  _s_square(dt) {
    const g = this.game, st = this.enc.state;
    // the stash: clear its guards, then search the scooter
    if (st.stash.status === 'resolved' && !this.searched) {
      this._interact(V(STASH[0] - 1.2, 0, STASH[1] - 0.6), 2.4, 'Search the crew\'s scooter', 1.0, () => {
        this.searched = true; this.flags.stashSearched = true;
        this.hz.add({ id: 'fireworks', kind: 'fireworks', at: [-14, 399], over: [-30, 394], from: [-47, 360, -18, 426], lane: [-34, 371, 30, 385], endX: 34, count: 18, telegraph: 1.0, smokeS: 12 });
        g.hud.alert('Phone and plans recovered', 'good', 2.5);
        this.say('reveal');
      });
    }
    // fireworks: the surge starts the hidden pair; a firer stopped in time means no surge
    const fw = this.hz.get('fireworks');
    if (fw && !this.flags.surge && (fw.fired || fw.stopped || (st.fireworks.status !== 'waiting' && !this.firer) || st.fireworks.status === 'resolved')) this.flags.surge = true;
    // the Fixer seen, once the surge group is dealt with and the surge has passed
    if (st.surge.status === 'resolved' && !this.flags.glimpseStarted && !(fw && this.hz.surgeLive(fw))) { this.flags.glimpseStarted = true; this._glimpse(); }
    if (st.towTruck.status === 'resolved' && this.enc.cleared() && this.van.atHold()) {
      this.say('secured');
      this._actDone(2, 600, 'Place du Château-d\'Eau secured');
      this._nextSection();
    }
  }

  // Act 4, first part: the Fixer's final attempt. The van rolls into the arena and parks (no
  // damage reaches it while parked); he comes out to stop it himself. The fight ends with his
  // arrest: he kneels until the officer cuffs him (E), as the Level 2 bosses do.
  _s_intercept() {
    const g = this.game, van = this.van, b = this.boss;
    if (!b) { if (van.atHold() && !van.parked) this._startFixerFight(); return; }
    if (b.s !== 'defeated') return;
    const n = b.n;
    if (Math.hypot(g.player.pos.x - n.pos.x, g.player.pos.z - n.pos.z) > 2.6) return;
    g.hud.prompt('E', 'Arrest the Fixer');
    this.promptE = true;
    if (!g.input.pressed('KeyE')) return;
    b.stop(); this.boss = null;
    g.crowd.arrest(n); n.untargetable = true;
    this.onArrest(n);
    this.bossTimes.fixer = this.t - this.bossStart;
    this.addScore(1500, 'The Fixer arrested');
    this.say('fixerDown', 2);
    this._custody(n);
  }

  // the fight: the Fixer in the arena, the van parked behind the officer
  _startFixerFight() {
    const g = this.game, sec = SECTIONS[this.section], A = DISTRICT.arena, n = this.fixer;
    this.van.parked = true;
    g.crowd.retire(n);
    this.boss = new Boss(g, n, FIXER);
    const at = V(sec.spawn[0], 0, sec.spawn[1]);
    this.boss.start(at, Math.atan2(g.player.pos.x - at.x, g.player.pos.z - at.z), { x: A.x, z: A.z, r: A.r });
    this.bossStart = this.t;
    this.fixerMet = true;
    this.say('fixerFight');
    this._fixerIntro(n);
    // a checkpoint at the fight itself: RETRY SECTION goes straight back into it
    this.cp = { ...this.cp, fight: true, vanS: this.van.s, van: this.van.integrity, score: this.score, stats: { ...this.stats }, t: this.t };
  }

  // Act 4, end: the last stand, then the handover
  _s_extraction() {
    const g = this.game, van = this.van;
    if (this.enc.cleared() && van.atHold()) {
      const at = van.doorPoint(V());
      this._interact(at, 3.0, 'Hand over the prisoner', 0, () => this._victory(), 8);
    }
  }

  // ------------------------------------------------------------- interactions
  // Press E within r of pos (refused while an attacker is within refuseR); holds of dur seconds
  // complete if the officer stays close. Uses the existing prompt (tappable on touch screens).
  _interact(pos, r, text, dur, done, refuseR = 8) {
    const g = this.game, p = g.player.pos, key = `${text}@${pos.x},${pos.z}`;
    this.interactPos = pos;
    if (Math.hypot(p.x - pos.x, p.z - pos.z) > r) { if (this.busy && this.busy.key === key) this.busy = null; return; }
    const near = g.crowd.npcs.some((n) => g.crowd.isThreat(n) && n.distToPlayer < refuseR);
    if (near) { g.hud.prompt('!', 'Deal with the attackers first'); this.promptE = true; this.promptBlocked = true; return; }
    this.promptBlocked = false;
    if (this.busy && this.busy.key === key) {
      this.busy.t += this.dt;
      g.hud.prompt('E', `${text} · ${Math.min(100, Math.round(this.busy.t / dur * 100))}%`);
      this.promptE = true;
      if (this.busy.t >= dur) { this.busy = null; done(); }
      return;
    }
    g.hud.prompt('E', text);
    this.promptE = true;
    if (g.input.pressed('KeyE')) { if (dur > 0) this.busy = { key, t: 0 }; else done(); }
  }

  // ------------------------------------------------------------- the Fixer
  _placeFixer(at, watch) {
    const g = this.game, n = this.fixer;
    n.pos.copy(at); n.anchor.copy(at); n.vel.set(0, 0, 0);
    n.heading = Math.atan2(g.player.pos.x - at.x, g.player.pos.z - at.z);
    n.rig.root.visible = true; n.untargetable = true;
    n.role = 'shout'; n.lookT = 99; n.temperament = 'scripted'; n.script = null;
    giveItem(n.rig, 'phone');
    g.crowd.setState(n, 'act', 999);
    if (watch) n.focus.copy(g.player.pos);
  }

  // The reveal in the square: a close look at him on the phone by the crew's van, then the long
  // lens from where the officer stands, so the player knows where he is (3.6 s)
  _glimpse() {
    const g = this.game, n = this.fixer, p = g.player;
    this._placeFixer(V(-5, 0, 445.5), true);
    this.say('fixer');
    this.stage = 'glimpse';
    const c = g.playCinematic({
      id: 'fixerGlimpse', title: 'THE FIXER', sub: 'runs the breakout', titleAt: [0.4, 2.8],
      lines: [['"All of them. At the exit. Now."', 0.5, 1.6]],
      shots: [{ dur: 1.6, a: frontOf(n, 5.2, 0.55, 1.9, 40), b: frontOf(n, 4.3, 0.65, 1.2, 34) },
        { dur: 1.4, a: overShoulderAt(p, n, 22), b: overShoulderAt(p, n, 19) }, { dur: 0.6, a: overShoulderAt(p, n, 19), b: 'rig' }],
    });
    if (!c) { this.stage = 'route'; this.flags.glimpsed = true; this._fixerLeaves(); }
  }

  // before the fight: he ends his call, puts the phone away and squares up (4.0 s); the boss
  // holds his ground through it (boss.js introWait)
  _fixerIntro(n) {
    const g = this.game;
    g.playCinematic({
      id: 'fixer', title: 'THE FIXER', sub: 'runs the breakout', titleAt: [0.5, 3.4], sting: 'intro',
      lines: [[FIXER.barks[0], 1.3, 3.8]],
      shots: [{ dur: 2.4, a: frontOf(n, 6.6, 0.9, 2.3, 44), b: frontOf(n, 4.6, 0.75, 1.4, 38) },
        { dur: 1.6, a: frontOf(n, 4.6, 0.75, 1.4, 38), b: 'rig' }],
    });
  }

  // his arrest: the crews still in the square break and run; a short shot of him in cuffs (3.6 s),
  // then the escort goes on
  _custody(n) {
    const g = this.game, p = g.player;
    this.stage = 'custody';
    for (const m of g.crowd.npcs) if (m.temperament === 'hostile' && !m.neutralized && !m.arrested) { m.fleeFrom = n.pos.clone(); g.crowd.setState(m, 'flee', 8); }
    const mid = () => V((p.pos.x + n.pos.x) / 2, 0, (p.pos.z + n.pos.z) / 2);
    const a0 = Math.atan2(p.pos.x - n.pos.x, p.pos.z - n.pos.z) + 1.3;
    g.playCinematic({
      id: 'custody', title: 'THE FIXER IN CUSTODY', sub: 'Place du Château-d\'Eau · 02h31', titleAt: [0.4, 3.2],
      lines: [['His phone is still ringing.', 0.6, 2.0], ['Without him, the crews have nobody to call.', 2.0, 3.5]],
      shots: [{ dur: 3.6, a: orbit(mid, 4.6, 1.6, a0, 44, 1.0), b: orbit(mid, 5.6, 2.4, a0 + 1.1, 48, 1.0) }],
      onDone: () => this._afterCustody(),
    });
  }
  _afterCustody() {
    if (this.stage !== 'custody') return;
    this.stage = 'route';
    this._nextSection();
  }

  _fixerLeaves() {
    const g = this.game, n = this.fixer;
    if (n.state === 'gone') return;
    const route = [V(-4, 0, 462), V(-3, 0, 484)];
    const sc = { leg: 0 };
    sc.tick = (m) => { if (sc.leg < route.length && Math.hypot(m.pos.x - route[sc.leg].x, m.pos.z - route[sc.leg].z) < 1.5) sc.leg++; if (sc.leg >= route.length || m.distToPlayer > 60) { clearItem(m.rig); g.crowd.retire(m); } };
    sc.move = () => (sc.leg < route.length ? { speed: 5.0, dest: route[sc.leg] } : { speed: 0 });
    g.crowd.setState(n, 'walk'); n.target.copy(route[0]);
    n.script = sc;
  }

  // the crew roles the encounter runner hands back (convoy.js, hazards.js)
  attachRole(n, style) {
    const g = this.game;
    if (style === 'breacher') {
      const sc = breacherScript(g, this.van, n, () => { this.stats.breachesDone++; this.addScore(-200, 'Breach completed'); g.hud.alert('They forced the doors — the van is hit!', 'bad', 2.5); });
      sc.onStopped = () => { this.stats.breachesStopped++; this.addScore(250, 'Breach stopped'); };
    } else if (style === 'igniter') { const h = this.hz.get('trail'); if (h) { igniterScript(g, this.hz, h, n); this.igniter = n; } }
    else if (style === 'fireworks') { const h = this.hz.get('fireworks'); if (h) { firerScript(g, this.hz, h, n); this.firer = n; } }
  }

  // ------------------------------------------------------------- the van's integrity
  _onVanDamage(a) {
    const v = this.van, s = this.stats;
    s.vanHits = v.incidents; s.vanLost = v.lost;
    for (const k of [75, 50, 25]) if (v.integrity < k && !this.radioSaid[`dmg${k}`]) this.say(`dmg${k}`, k < 75 ? 2 : 1);
    if (v.integrity <= 0 && !this.ended) this.fail(FAIL_VAN);
  }

  // Control nags when the officer leaves the van (van's crew, at most every 30 s)
  _officerDistance() {
    const v = this.van, d = this.game.player.pos.distanceTo(v.pos);
    if (d > 25 && this.rolled && !v.parked) this.say('alone', 1, 30);
  }

  // ------------------------------------------------------------- radio
  // One line at a time, a pause between lines, urgent lines first, each line once (or after
  // its cooldown). Game time, so seeded runs log the same lines at the same moments.
  say(key, pri = 1, cooldown = Infinity) {
    const last = this.radioSaid[key];
    if (last !== undefined && this.t - last < cooldown) return false;
    this.radioSaid[key] = this.t;
    const [who, text] = LINES[key];
    const item = { key, who, text, pri, t: this.t };
    if (pri >= 2) { const i = this.radioQ.findIndex((q) => q.pri < 2); this.radioQ.splice(i < 0 ? this.radioQ.length : i, 0, item); } else this.radioQ.push(item);
    return true;
  }
  radio(text) { this.radioQ.push({ key: null, who: 'CONTROL', text, pri: 1, t: this.t }); } // encounter data and shared code
  _radioUpdate(dt) {
    if (this.game.cinematic) return; // the HUD is hidden: lines wait for the picture to come back
    this.radioGap -= dt;
    if (this.radioGap > 0 || !this.radioQ.length) return;
    const q = this.radioQ.shift();
    const dur = Math.min(6, 2.5 + q.text.length / 20);
    this.game.hud.alert(`📻 ${q.who}: ${q.text}`, 'radio', dur);
    this.game.audio.radio(q.pri >= 2, dur);
    this.radioLog.push({ t: +this.t.toFixed(2), key: q.key, who: q.who, dur: +dur.toFixed(2), queued: +(this.t - q.t).toFixed(2) });
    this.radioGap = dur + 0.8;
  }

  // ------------------------------------------------------------- presentation
  // the transfer briefing: the van at the staging area, then the road south it has to take (5.4 s)
  _introCinematic() {
    const g = this.game, van = this.van;
    const a0 = van.heading + 2.4;
    const ahead = () => V(van.pos.x, 0, van.pos.z + 14);
    g.playCinematic({
      id: 'transfer', title: 'THE BREAKOUT', sub: 'Place du Château-d\'Eau · 02h20', titleAt: [0.4, 3.2],
      lines: [['VAN 1: "Le Patron is loaded. Doors shut."', 0.5, 2.4], ['CONTROL: "His crews want him back. Gendarmes are waiting beyond the square."', 2.5, 5.0]],
      shots: [{ dur: 2.6, a: orbit(() => van.pos, 7.5, 2.6, a0, 46, 1.2), b: orbit(() => van.pos, 7.0, 2.2, a0 + 1.0, 46, 1.2) },
        { dur: 1.8, a: orbit(ahead, 17, 3.2, Math.PI + 0.25, 50, 1.2), b: orbit(ahead, 16, 3.8, Math.PI - 0.15, 52, 1.6) },
        { dur: 1.0, a: orbit(ahead, 16, 3.8, Math.PI - 0.15, 52, 1.6), b: 'rig' }],
    });
  }

  // the handover: crews scatter, a short closing shot, then the results
  _victory() {
    const g = this.game, van = this.van;
    this.stage = 'victory';
    this.vanAtExtract = Math.round(van.integrity);
    this.stats.vanHits = van.incidents; this.stats.vanLost = van.lost;
    van.parked = true;
    this.say('handover', 2);
    for (const m of g.crowd.npcs) if (m.temperament === 'hostile' && !m.neutralized && !m.arrested) { m.fleeFrom = van.pos.clone(); g.crowd.setState(m, 'flee', 8); }
    const mid = () => V(van.pos.x, 0, van.pos.z + 4);
    const a0 = van.heading + 0.9;
    g.playCinematic({
      id: 'victory', title: 'TRANSFER COMPLETE', sub: 'Rue de la Caserne · 02h33', titleAt: [0.5, 4.0], sting: 'victory',
      lines: [['The gendarmes take custody of le Patron.', 0.6, 2.4], ['And of the man who tried to break him out.', 2.5, 4.4]],
      shots: [{ dur: 4.6, a: orbit(mid, 7.0, 2.4, a0, 46, 1.2), b: orbit(mid, 8.0, 3.2, a0 + 1.2, 50, 1.2) }],
      onDone: () => this.complete(),
    });
  }

  complete() {
    if (this.ended) return;
    const v = this.van;
    this.ended = true;
    this.stage = 'done';
    this.markerPos = null;
    this._actDone(3, 1000, 'Transfer complete');
    if (this.vanAtExtract === null) this.vanAtExtract = Math.round(v.integrity);
    if (this.vanAtExtract > 0) this.addScore(this.vanAtExtract * 10, 'Van condition');
    if (this.stats.peaceful === 0 && !this.stats.downed) this.addScore(500, 'Proportionate force');
    this.game.endGame(true);
  }

  // where the marker leads: the nearest attacker, an interaction, the van when it is hit
  // off-screen, otherwise the van's next hold
  _marker() {
    const g = this.game, van = this.van, sec = SECTIONS[this.section];
    this.markerPos = null;
    if (this.stage !== 'route') return;
    if (this.boss) { if (this.boss.s === 'defeated') this.markerPos = this.boss.n.pos; return; } // no beam in the fight itself
    const fighting = this.enc.active();
    const near = fighting.length ? g.crowd.nearest(g.player.pos, (n) => fighting.includes(n)) : null;
    if (near) { this.markerPos = near.pos; return; }
    if (this.interactPos && g.player.pos.distanceTo(this.interactPos) < 40 && this._wantsInteraction()) { this.markerPos = this.interactPos; return; }
    if (van.t - van.lastHitT < 3) { this.markerPos = van.pos; return; }
    const hz = this._holdingFor();
    if (hz) { this.markerPos = hz; return; }
    if (sec.choice && !this.route) return; // the choice is the player's: no beam
    const P = this.path(), hold = P.at(van.limitS, V());
    this.markerPos = van.atHold() ? hold : P.at(Math.min(van.limitS, van.s + 25), V());
  }
  // the petrol trail the van is waiting behind (the marker leads there: someone has to deal
  // with the man at it; a car about to blow is only ever waited out)
  _holdingFor() {
    if (this.van.reason !== 'hazard') return null;
    const z = this.hz.zones().find((o) => o.kind === 'trail');
    return z ? V(z.x, 0, z.z) : null;
  }

  _wantsInteraction() {
    const sec = SECTIONS[this.section];
    if (sec.id === 'fork') return this.route === 'A' && (!this.cleared[0] || !this.cleared[1]) && this.enc.state.rbFlank.status === 'resolved';
    if (sec.id === 'square') return this.enc.state.stash.status === 'resolved' && !this.searched;
    if (sec.id === 'extraction') return this.enc.cleared() && this.van.atHold();
    return false;
  }

  _warnings() {
    const v = this.van, b = this.bomber && this.bomber.script;
    this.warningText = null;
    if (v.breacher && v.breach > 0) this.warningText = `⚠ DOORS · ${Math.round(v.breach * 100)}%`;
    else if (this.hz.warning) this.warningText = this.hz.warning;
    else if (b && b.active && (b.phase === 'light' || b.phase === 'wind')) this.warningText = '⚠ PETROL BOMB';
    this.warning = !!this.warningText;
  }

  // the bot (dev.js) walks where a player would: the route's mouth, an interaction, behind the van
  botGoal(route = 'A') {
    const g = this.game, van = this.van, sec = SECTIONS[this.section];
    if (this.stage !== 'route') return this.markerPos;
    if (sec.choice && !this.route) return V(ROUTE_TARGETS[route][0], 0, ROUTE_TARGETS[route][1]);
    if (this.interactPos && this._wantsInteraction() && g.player.pos.distanceTo(this.interactPos) < 60) return this.interactPos;
    if (this.boss) return this.boss.n.pos;
    if (!this.rolled) return van.pos;
    const hz = this._holdingFor();
    if (hz) return V(hz.x, 0, hz.z - 5); // up to the trail's near side
    // behind the van, out of its way
    const f = van.fwd(V());
    return V(van.pos.x - f.x * 6, 0, van.pos.z - f.z * 6);
  }

  bossInfo() { return this.boss ? this.boss.info() : null; }

  // minimap: the van, and the two routes while the choice is open
  mapExtras(ctx, tr, scale) {
    const v = this.van;
    if (!v.group.visible) return;
    const f = v.fwd(V()), r = V(f.z, 0, -f.x);
    const pts = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => tr(v.pos.x + f.x * a * VAN.L / 2 + r.x * b * VAN.W / 2, v.pos.z + f.z * a * VAN.L / 2 + r.z * b * VAN.W / 2));
    ctx.fillStyle = v.t - v.lastHitT < 0.4 ? '#ff6a4a' : '#5aa0ff';
    ctx.beginPath(); ctx.moveTo(...pts[0]); for (const q of pts.slice(1)) ctx.lineTo(...q); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e9e6df'; ctx.lineWidth = 1; ctx.stroke();
    if (SECTIONS[this.section].choice && !this.route) {
      ctx.fillStyle = '#ffb02e';
      for (const [x, z] of Object.values(ROUTE_TARGETS)) { const [px, py] = tr(x, z); ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px + 5, py + 4); ctx.lineTo(px - 5, py + 4); ctx.closePath(); ctx.fill(); }
    }
    void scale;
  }

  hudInfo() {
    const act = Math.min(this.act, L3_PHASES.length - 1), sec = SECTIONS[this.section], v = this.van;
    const info = { label: 'ACT', index: act, phaseName: L3_PHASES[act], text: sec.text, status: 'active', chip: 'ESCORT', detail: '', bar: v.group.visible ? v.integrity / VAN.max : null, completed: this.completed };
    if (this.stage === 'intro') return Object.assign(info, { text: 'CRS staging area', chip: 'STANDBY', status: 'calm', detail: 'Radio traffic incoming…', bar: null });
    if (this.stage === 'victory' || this.stage === 'done') return Object.assign(info, { text: 'Transfer complete', chip: 'DONE', status: 'done', detail: `Van ${Math.round(v.integrity)}%` });
    const vi = `Van ${Math.round(v.integrity)}%`;
    const fighting = this.enc.active().length, { total, down } = this.enc.counts();
    const crew = total ? ` · Crew ${down} / ${total}` : '';
    if (sec.id === 'transfer' && !this.rolled) return Object.assign(info, { text: 'Join the transfer van', chip: 'STANDBY', status: 'calm', detail: 'It moves off when you are beside it' });
    if (sec.choice && !this.route) return Object.assign(info, { chip: 'CHOOSE', detail: 'Avenue: shorter, blocked, more crews · Passage: longer, narrow, hazards' });
    if (this.boss) {
      if (this.boss.s === 'defeated') return Object.assign(info, { text: 'Arrest the Fixer', chip: 'DOWN', detail: 'Press E beside him' });
      return Object.assign(info, { text: 'Stop the Fixer', status: 'danger', chip: 'BOSS', detail: 'Let him commit, then strike — or catch him off balance' });
    }
    if (this.stage === 'custody') return Object.assign(info, { text: 'The Fixer is in custody', chip: 'DONE', status: 'done', detail: vi });
    if (v.breacher && v.breach > 0) return Object.assign(info, { text: 'Stop them breaking into the van!', chip: 'DANGER', status: 'danger', detail: `Doors ${Math.round(v.breach * 100)}% · ${vi}` });
    if (this.hz.warning) return Object.assign(info, { chip: 'DANGER', status: 'danger', detail: `${this.hz.warning.replace('⚠ ', '')} · ${vi}` });
    if (fighting) return Object.assign(info, { chip: 'ENGAGED', status: 'danger', detail: `${vi}${crew} · ${fighting} still fighting` });
    if (this.promptBlocked && this.promptE) return Object.assign(info, { detail: `${vi} · attackers close` });
    if (this._wantsInteraction()) return Object.assign(info, { text: sec.id === 'fork' ? 'Drag the barricade clear for the van' : sec.id === 'square' ? 'Search the crew\'s scooter' : 'Hand over the prisoner at the van', chip: 'ACTION', detail: `${vi} · press E there` });
    const why = { officer: 'waiting for you — stay within 20 m', threat: 'stopped — attackers close', blocked: 'people in the road', officerAhead: 'step aside — it needs the road', hazard: 'holding — hazard ahead', road: 'road blocked', barrier: 'keep the route clear of barriers', hold: 'holding', parked: 'parked' }[v.reason];
    return Object.assign(info, { chip: v.reason && v.reason !== 'hold' ? 'HOLD' : 'ESCORT', detail: `${vi}${crew}${why ? ' · ' + why : ''}` });
  }

  endInfo(win, reason) {
    const s = this.stats, v = this.van;
    const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    const vanEnd = this.vanAtExtract ?? Math.round(v.integrity);
    return {
      title: win ? 'LEVEL 3 COMPLETE' : 'MISSION FAILED',
      sub: win ? 'Le Patron handed to the gendarmerie · the Fixer in custody' : reason || '',
      rows: [
        ['Acts completed', `${this.completed.filter(Boolean).length} / ${L3_PHASES.length}`],
        ['Route', this.route ? ROUTE_NAME[this.route] : '—'],
        ['Van condition at extraction', win ? `${vanEnd}%` : '—'],
        ['Van damage incidents', `${v.incidents} (${Math.round(v.lost)} integrity lost)`],
        ['Breaches stopped / completed', `${s.breachesStopped} / ${s.breachesDone}`],
        ['Crew members neutralised', s.neutralized],
        ['Arrests', s.arrests],
        ['Hazard takedowns', s.hazardTakedowns],
        ['Peaceful people struck', s.peaceful, s.peaceful > 0],
        ['Downed suspects struck', s.downed || 0, s.downed > 0],
        ['Damage received', Math.round(s.damageTaken)],
        ['The Fixer', this.bossTimes.fixer !== undefined ? fmt(this.bossTimes.fixer) : '—'],
        ['Strikes stopped by his guard / dodges', `${s.blocked} / ${s.dodges}`],
        ['Crowd tension · peak', `${Math.round(this.tension.peak)} / 100`, this.tension.peak >= 70],
        ['Mission time', fmt(this.t)],
      ],
      hook: win ? HOOK : '',
      // a win shows the campaign's medal instead (campaign.js)
      rank: this.cp ? (this.cp.fight ? 'Retry the fight with the Fixer, or restart' : 'Retry from the start of this section, or restart') : 'Restart to try again',
    };
  }
}
