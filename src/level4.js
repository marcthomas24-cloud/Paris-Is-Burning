// Level 4 · "Last Train".
// 03h10, Gare de l'Est. The Métro has closed and the one station still running night trains is
// where everybody is going: hundreds of people, many of them the marchers of Level 1, through
// three entrances and two ticket-gate lines onto one platform. Gas drifts in from the boulevard,
// a looting crew starts on a kiosk, and the danger is not a fight but a crush.
//
//  Beat 1 THE FORECOURT  the new verb, direct (hold F): send a family round a burning bin pyre to
//                        the one open entrance
//  Beat 2 THE CONCOURSE  the crowd arrives. A density gauge replaces the tension bar; above its
//                        red line people start to fall. Entrances are opened and closed (E), the
//                        staff work the gate lines (E beside them), barriers and direct split flows
//  Beat 3 THE CREW       looters at the kiosk beside the densest queue. Any blow sends a panic
//                        wave through people nearby: move the queue first, or use gas and risk it
//  Beat 4 LAST TRAIN     three trains left, doors open 40 s at a time: hold the platform edge and
//                        get the last people on, one of whom has to be walked to the door
//
// People first: there is no boss and nothing here needs force. Every traveller runs the same
// small script (door, gate queue, gate, platform, train) on top of the crowd's own steering,
// separation, fear and panic; density is read from how many people each has within a metre.
// Children (the families' own characters) cannot be struck and never fall: in a crush the
// adult lifts them. Shares the Missions interface with the other levels.
import * as THREE from 'three';
import { Missions } from './missions.js';
import { buildStation, STATION, roomAt, stationArea } from './station.js';
import { randomOutfit, clearItem, newPose } from './characters.js';
import { mulberry } from './textures.js';
import { quietly } from './world.js';
import { pressed, handHeld, stooped, supported, life } from './lifelike.js';
import { orbit } from './cinematic.js';

export const L4_PHASES = ['THE FORECOURT', 'THE CONCOURSE', 'THE CREW', 'LAST TRAIN'];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const R = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const S = STATION;
const HOOK = 'Control: "Bands on the canal, lighting cars and gone over the footbridges. You have four officers. Go."';

// where the crowd stands before the level places it (the title screen behind the menu)
export const L4_CROWD = {
  gatherPoints: [V(-6, 0, 664), V(8, 0, 656), V(0, 0, 690), V(-14, 0, 672), V(14, 0, 672), V(-18, 0, 650), V(18, 0, 650), V(0, 0, 628), V(-20, 0, 692), V(20, 0, 692)],
  marchPaths: [],
  noCrews: true,
  bystanderZ: -1,
  focus: { lineZ: 1e9, frontZ: 760, behindZ: 760 }, // people standing about face the trains
};
// unrest stays on the boulevard, out of bounds: seen and heard from the forecourt, never on it
export const L4_EVENTS = {
  zones: [{ name: 'Boulevard', crowd: V(-6, 0, 556), police: V(-3, 0, 573) }, { name: 'Boulevard east', crowd: V(9, 0, 554), police: V(5, 0, 572) }],
  hazardZ: [1e9, 1e9], carFireZ: [1e9, 1e9],
  gas: { fromZ: 0, toZ: [0, 0], minPlayerZ: 1e9 },
};

// ------------------------------------------------------------------ tuning
export const L4 = {
  walk: 1.25, queue: 1.0, family: 0.8, old: 0.62, urgent: 1.2,
  tight: 5,              // neighbours within a metre that leave no room to move
  red: 70,               // the gauge's red line (per cent)
  cap: { door: 24, gate: 24, platform: 34 }, // pressed people that put a place on the red line
  fall: [7, 2.5],        // seconds between falls at the red line and at 100 %
  grace: 4,              // seconds over the line before the first fall
  trample: 14, panicTrample: 9, // seconds a person on the ground has
  failTrampled: 5,
  gate: { tickets: 0.22, open: 1.1, closed: 0 }, // people a second through one gate line
  platFull: 85,          // people on the platform at which the staff stop waving everyone through
  boardRate: 1.0,        // people a second through one train door
  train: { first: 16, arrive: 7, open: 40, leave: 8, away: 20, cap: 60, holdMax: 45 },
  directR: 8, directS: 4.5, holdS: 9,
  kids: 10, prefill: [30, 8],
  arrivals: [0, 150, 60, 70], rate: [0, 0.9, 0.45, 1.05], // (the rate comes in waves round this)
  beat1: { home: 70, minT: 150, maxT: 330 },
  crew: { size: 4, bottle: 70, torch: 95, maxT: 240 },
  homeTarget: 200,
};

const LINES = {
  start: ['CONTROL', 'Métro is shut. Gare de l\'Est has the only night trains left and everyone knows it. Keep them moving.'],
  family: ['CONTROL', 'A family is stuck in the forecourt, the bins are burning between them and the open entrance. Send them round.'],
  direct: ['CONTROL', 'Hold F to point and call. People near you go the way you point. Baton down when you do it.'],
  inside: ['STAFF', 'They are in. Thank you. There are a lot more behind them.'],
  wave: ['CONTROL', 'Here they come. Two entrances are still shuttered, open what you need. The staff will open the gate lines wide if you ask them.'],
  gauge: ['CONTROL', 'Watch the density. Over the red line people go down. Close an entrance, split the queue, send them to the other gate.'],
  gas: ['CONTROL', 'Gas from the boulevard is drifting into the forecourt. Nobody can wait out there for long.'],
  train: ['STAFF', 'Train coming in on voie 4. Doors for forty seconds.'],
  platFull: ['STAFF', 'The platform is full. I am putting the gates back on tickets until a train clears it.'],
  crew: ['STAFF', 'There are men smashing the kiosk, right beside the queue!'],
  crewHint: ['CONTROL', 'Any blow there and that queue runs. Clear people away from the kiosk first. Gas will shift the crew, and the queue with them.'],
  bottle: ['STAFF', 'One of them has a bottle. They are going to burn it!'],
  crewDone: ['CONTROL', 'The kiosk is quiet. Get the queue moving again.'],
  last: ['STAFF', 'Three more trains and that is the night. After the 03h44 the station closes.'],
  injured: ['STAFF', 'Someone is on the floor and cannot walk. They will need carrying to the train.'],
  hold: ['STAFF', 'We are holding the last train for the casualty. Be quick.'],
  down: ['STAFF', 'Someone has gone down in the crowd!'],
  trampled: ['CONTROL', 'A casualty in the crush. Bring that density down.'],
  away: ['CONTROL', 'Last train is away. Station is closing. Good work.'],
};

export class Level4 extends Missions {
  constructor(game) {
    super(game);
    const w = game.world;
    if (!w.hasDistrict('l4')) w.registerDistrict('l4', buildStation(w, game.scene, game.renderer, game.camera));
    this.D = w.districts.l4;
    // the three scripts every traveller, child and member of staff runs (crowd.js calls them)
    this.TRAV = { active: false, tick: (n, p, dt) => this._travTick(n, dt), move: (n, d) => this._travMove(n, d), pose: (n, P, dt, t) => this._travPose(n, P, t) };
    // (not `active`: that marks someone acting against the officer; these two shrug stimuli off in their ticks)
    this.KID = { active: false, tick: (n) => this._kidTick(n), move: (n) => this._kidMove(n), pose: (n, P, dt, t) => this._kidPose(n, P, t) };
    this.STAFF = { active: false, tick: (n) => { n.stimuli.length = 0; n.fear = 0; if (n.state !== 'act') { this.game.crowd.setState(n, 'act', 1e9); } }, move: () => ({ speed: 0 }), pose: (n, P, dt, t) => this._staffPose(n, P, t) };
    this.CREW = { active: true, marked: true, amber: true, tick: (n, p, dt) => this._crewTick(n, dt), move: (n) => this._crewMove(n), onHit: (n) => this._crewStruck(n) };
    quietly(() => {
      const c = game.crowd;
      // the level's own people, built once: children, two members of staff, the crew
      if (!c.l4cast) {
        const rng = mulberry(4404);
        const kids = [], staff = [], crew = [];
        for (let i = 0; i < L4.kids; i++) kids.push(c.spawnSpecial(childOutfit(rng)));
        for (let i = 0; i < 2; i++) staff.push(c.spawnSpecial(staffOutfit(rng)));
        for (let i = 0; i < L4.crew.size; i++) crew.push(c.spawnSpecial(randomOutfit(rng))); // anyone: appearance says nothing
        c.l4cast = { kids, staff, crew };
      }
      Object.assign(this, c.l4cast);
      // the reach of a call: a ring on the ground and an arrow the way the officer points
      const ring = new THREE.Mesh(new THREE.RingGeometry(L4.directR - 0.12, L4.directR, 72), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      const ag = new THREE.ConeGeometry(0.45, 1.3, 3); ag.rotateX(Math.PI / 2); ag.scale(1, 0.08, 1);
      const arrow = new THREE.Mesh(ag, ring.material);
      this.ring = new THREE.Group(); this.ring.add(ring, arrow); this.arrow = arrow;
      this.ring.visible = false; this.ring.renderOrder = 2;
      game.scene.add(this.ring);
    });
    this._v = V(0, 0, 0);
    this.gauge = {
      value: 0, label: 'DENSITY',
      band: () => (this.gauge.value >= L4.red ? 'volatile' : this.gauge.value >= 45 ? 'tense' : 'calm'),
      bandName: () => (this.gauge.value >= L4.red ? 'CRUSH' : this.gauge.value >= 45 ? 'TIGHT' : 'FLOWING'),
    };
    this.built = true;
    this.reset();
  }

  dispose() {
    this.game.scene.remove(this.ring);
    const c = this.game.crowd;
    for (const n of [...this.kids, ...this.staff, ...this.crew]) c.retire(n);
    for (const n of c.npcs) { if (n.tr) { n.tr = null; n.l4 = null; if (n.script === this.TRAV) n.script = null; } n.untargetable = n.special ? n.untargetable : false; }
    if (this.game.player.carrying) this.game.player.carrying = null;
    if (this.kioskFire) { this.game.effects.removeFire(this.kioskFire); this.kioskFire = null; }
    this.D.setTrain(200, 0);
    super.dispose();
  }

  reset() {
    super.reset();
    this.completed = L4_PHASES.map(() => false);
    this.phaseTimes = L4_PHASES.map(() => 0);
    this.section = 0; this.cp = null;
    Object.assign(this.stats, { home: 0, trampled: 0, falls: 0, rescued: 0, stampedes: 0, frightened: 0, directed: 0, carried: 0, left: 0, peakDensity: 0, overRed: 0, crewFled: 0, kioskBurned: 0, trains: 0 });
    this.home = 0;
    this.radioQ = []; this.radioGap = 0; this.radioSaid = {}; this.radioLog = [];
    this.promptE = false; this.busy = null;
    this.musicTier = 0;
    this.warningText = null;
    if (!this.built) return; // first call, from the Missions constructor
    const D = this.D;
    D.doors.forEach((_, i) => D.setDoor(i, i === 2)); // only the east entrance is open at the start
    D.gates.forEach((_, i) => D.setGate(i, 'tickets'));
    D.kiosks.forEach((_, i) => D.setKiosk(i, false));
    if (this.kioskFire) { this.game.effects.removeFire(this.kioskFire); this.kioskFire = null; }
    D.setTrain(200, 0);
    this.gates = D.gates.map(() => ({ acc: 0, lane: 0 }));
    this.train = { s: 'idle', t: 0, x: 200, k: 0, n: 0, res: 0, left: null, acc: S.trainDoors.map(() => 0), held: 0 };
    this.arrive = { rate: 0, acc: 0, left: 0 };
    this.urgent = false;
    this.gauge.value = 0;
    this.zones = [
      ...S.doors.map((d) => ({ id: 'door' + d.id, name: d.name, kind: 'door', x0: d.x - 7, z0: 630, x1: d.x + 7, z1: 640.9 })),
      ...S.gates.map((g) => ({ id: 'gate' + g.id, name: g.name, kind: 'gate', x0: g.x - 9.5, z0: 663, x1: g.x + 9.5, z1: 679.3 })),
      { id: 'plat', name: 'the platform edge', kind: 'platform', x0: -35, z0: 689, x1: 35, z1: 699.6 },
    ].map((z) => ({ ...z, n: 0, v: 0, fallT: L4.grace }));
    this.worst = this.zones[3];
    this.zoneT = 0; this.di = 0; this.fallCool = 0;
    this.fleeLog = []; this.waveOn = false;
    this.crewS = 'none'; this.crewT = 0; this.crewKiosk = 0; this.crewWave = 0;
    this.injured = null; this.gasT = 45; this.threatT = 0; this.directT = 0; this.directFresh = true; this.directN = 0;
    this.lastAtk = null; this.fallen = []; this.tutorial = null; this.hintT = 0;
    this.game.player.carrying = null;
    this._populate();
  }

  // ------------------------------------------------------------- the cast
  // Everyone in the crowd becomes a traveller waiting off stage; the level brings them on.
  _populate() {
    const c = this.game.crowd;
    this.pool = []; this.active = [];
    for (const n of c.npcs) {
      if (n.special || n.kind) continue;
      clearItem(n.rig);
      c.retire(n);
      n.l4 = { old: n.id % 9 === 4, child: null };
      n.tr = null; n.role = 'traveller'; n.march = null;
      this.pool.push(n);
    }
    // families: an adult from the pool with one of the level's children
    const adults = this.pool.filter((n) => !n.l4.old);
    this.kids.forEach((k, i) => {
      const a = adults[(i * 17 + 5) % adults.length];
      if (a.l4.child) return;
      a.l4.child = k; k.kidOf = a;
      c.retire(k);
    });
    for (const n of [...this.staff, ...this.crew]) c.retire(n);
    this.staffS = this.staff.map((n, i) => ({ n, gate: i, s: 'idle', t: 0, want: null }));
    this.staff.forEach((n, i) => this._place(n, S.staffPosts[i][0], S.staffPosts[i][1], this.STAFF, 'act', i ? -1.2 : 1.2));
    this.sentinel = this.pool[0];
    this.populated = c.time;
  }
  // the crowd was reset under us (a level switch resets it after the script is built)
  _ensure() {
    const s = this.sentinel;
    if (s && s.l4 && s.role === 'traveller' && (s.state === 'gone' ? !s.tr : s.script === this.TRAV)) return;
    const stage = this.stage, t = this.t, stageT = this.stageT;
    this.reset(); this.stage = stage; this.t = t; this.stageT = stageT;
  }

  // put a scripted character on stage
  _place(n, x, z, script, state = 'act', heading = 0) {
    const c = this.game.crowd;
    n.pos.set(x, 0, z); n.anchor.copy(n.pos); n.target.copy(n.pos); n.vel.set(0, 0, 0); n.knock.set(0, 0, 0);
    n.heading = heading; n.focus.set(x + Math.sin(heading) * 20, 0, z + Math.cos(heading) * 20);
    n.temperament = 'scripted'; n.script = script; n.untargetable = true; n.neutralized = false; n.arrested = false;
    n.fear = 0; n.stimuli.length = 0; n.hp = 2; n.hitCount = 0; n.role = 'traveller'; n.lookT = 0;
    n.rig.root.visible = true; n.rig.pose = newPose();
    c.setState(n, state, 1e9);
  }

  // bring a traveller on at (x, z); the child, if they have one, beside them
  _enter(n, x, z) {
    const c = this.game.crowd;
    const i = this.pool.indexOf(n); if (i >= 0) this.pool.splice(i, 1);
    n.pos.set(x, 0, z); n.anchor.copy(n.pos); n.target.copy(n.pos); n.vel.set(0, 0, 0); n.knock.set(0, 0, 0);
    n.temperament = 'peaceful'; n.attackStyle = null; n.neutralized = false; n.arrested = false; n.surrendered = false;
    n.hp = 2; n.hitCount = 0; n.fear = 0; n.stimuli.length = 0; n.surge = null; n.script = this.TRAV; n.untargetable = false;
    n.heading = 0; n.rig.root.visible = true; n.rig.pose = newPose(); n.role = 'traveller'; n.lastDeflect = null; n.gasT = 0;
    c.setState(n, 'walk'); n.dur = 1e9;
    n.tr = { s: 'toDoor', door: 0, gate: 0, td: 0, wp: [], jx: R(-1, 1), nb: 0, pk: 0, dir: null, hold: 0, waitT: 0, patience: R(9, 18), think: R(1, 3), fall: null, spot: null, back: 0, seen: null };
    this.active.push(n);
    const k = n.l4.child;
    if (k) { this._place(k, x + 0.68, z, this.KID, 'walk'); k.radius = 0.22; }
    this._replan(n);
    return n;
  }
  _leave(n) {
    const c = this.game.crowd, k = n.l4 && n.l4.child;
    const i = this.active.indexOf(n); if (i >= 0) this.active.splice(i, 1);
    if (k) c.retire(k);
    c.retire(n); n.tr = null;
  }
  _take() {
    // (the tutorial family's adult is kept for Beat 1)
    for (let k = 0; k < 6; k++) { const n = this.pool[Math.floor(Math.random() * this.pool.length)]; if (n && n !== this.tutorial) return n; }
    return this.pool.find((n) => n !== this.tutorial) || null;
  }

  // ------------------------------------------------------------- routes
  _pace(n) {
    const base = n.l4.old ? L4.old : n.l4.child ? L4.family : L4.walk * n.speedMul;
    return base * (this.urgent ? L4.urgent : 1);
  }
  _replan(n) {
    const tr = n.tr, room = roomAt(n.pos.z);
    tr.dir = null; tr.hold = 0;
    if (room === 0) this._toDoor(n, this._nearDoor(n.pos.x));
    else if (room === 1) this._toGate(n, this._pickGate(n));
    else this._toPlat(n);
  }
  _nearDoor(x, wantOpen = true) {
    let best = -1, bd = 1e9;
    this.D.doors.forEach((d, i) => { if (wantOpen && !d.open) return; const k = Math.abs(d.x - x); if (k < bd) { bd = k; best = i; } });
    if (best < 0 && wantOpen) return this._nearDoor(x, false);
    return best;
  }
  _toDoor(n, i) {
    const tr = n.tr, d = S.doors[i];
    tr.s = 'toDoor'; tr.door = i; tr.waitT = 0;
    tr.wp = [[d.x + tr.jx * 1.5, 638.2], [d.x + tr.jx * 1.2, 642.8]];
  }
  _pickGate(n) {
    let best = 0, bc = 1e9;
    this.D.gates.forEach((g, i) => { const c = Math.abs(g.x - n.pos.x) + (g.mode === 'closed' ? 60 : 0) + R(0, 5); if (c < bc) { bc = c; best = i; } });
    return best;
  }
  _toGate(n, i) {
    const tr = n.tr;
    tr.s = 'toGate'; tr.gate = i;
    tr.wp = [[S.gates[i].x + tr.jx * 3.3, 677.0]];
  }
  _toPlat(n, door = null) {
    const tr = n.tr;
    if (door === null) {
      const wait = S.trainDoors.map(() => 0);
      for (const o of this.active) if (o.tr && (o.tr.s === 'wait' || o.tr.s === 'toPlat')) wait[o.tr.td]++;
      let bc = 1e9; door = 0;
      S.trainDoors.forEach((x, i) => { const c = Math.abs(x - n.pos.x) + wait[i] * 1.3 + R(0, 3); if (c < bc) { bc = c; door = i; } });
    }
    tr.s = 'toPlat'; tr.td = door;
    const depth = this.urgent ? 2.6 : 5.5;
    tr.spot = [clamp(S.trainDoors[door] + R(-2.6, 2.6), -33.5, 33.5), 697.3 - R(0, depth) - (tr.back > 0 ? 5 : 0)];
    tr.wp = [tr.spot];
  }
  _zoneOf(n) { for (const z of this.zones) if (n.pos.x > z.x0 && n.pos.x < z.x1 && n.pos.z > z.z0 && n.pos.z < z.z1) return z; return null; }

  // ------------------------------------------------------------- the traveller's script
  _travMove(n, desired) {
    const s = n.state, tr = n.tr;
    if (!tr || s === 'flee' || s === 'calm' || s === 'stagger' || s === 'down' || s === 'recover') return null;
    if (tr.s === 'hurt' || tr.s === 'carried' || tr.s === 'stuck' || tr.s === 'rest' || tr.hold > 0) return { speed: 0 };
    if (tr.dir) {
      // the way the officer pointed; the tutorial family will not walk at the fire
      if (n === this.tutorial && this._nearFire(n.pos.x + tr.dir.x * 1.2, n.pos.z + tr.dir.z * 1.2)) { this.fireBalk = 0.3; return { speed: 0 }; }
      desired.set(tr.dir.x, 0, tr.dir.z);
      return { speed: this._pace(n) };
    }
    const k = n.l4.child;
    if (k && k.state !== 'gone' && Math.hypot(k.pos.x - n.pos.x, k.pos.z - n.pos.z) > 1.7) return { speed: 0 }; // never leaves the child behind
    const wp = tr.wp[0];
    if (!wp) return { speed: 0 };
    let sp = this._pace(n);
    if (tr.nb >= 3 && (tr.s === 'toGate' || tr.s === 'wait' || (tr.s === 'toDoor' && !this.D.doors[tr.door].open))) sp = Math.min(sp, L4.queue); // queueing, not walking
    return { speed: sp, dest: this._v.set(wp[0], 0, wp[1]) };
  }
  _nearFire(x, z) { return Math.hypot(x - S.pyre.x, z - S.pyre.z) < 4.4; }

  _travTick(n, dt) {
    const tr = n.tr, c = this.game.crowd;
    if (!tr) return;
    const st = n.state;
    if (tr.recovering) {
      if (st === 'recover' || st === 'down') return;
      tr.recovering = false; tr.fleeing = false; n.fear = 0;
      c.setState(n, 'walk'); n.dur = 1e9;
      if (tr.rescued) { tr.rescued = false; tr.s = 'toRest'; tr.wp = [[n.pos.x < 0 ? -29.6 : 29.6, clamp(n.pos.z, roomAt(n.pos.z) === 2 ? 683 : 645, roomAt(n.pos.z) === 2 ? 688 : 664)]]; if (roomAt(n.pos.z) === 0) this._replan(n); } else this._replan(n);
      return;
    }
    if (tr.s === 'hurt') { n.stimuli.length = 0; if (st !== 'down') { c.setState(n, 'down', 1e9); } return; }
    if (tr.s === 'carried') { this._carried(n); return; }
    if (tr.fall) { this._fallTick(n, dt); return; }
    if (st === 'down' || st === 'recover' || st === 'stagger') return; // struck by the officer: the crowd's own code plays it out
    if (st === 'flee') {
      if (!tr.fleeing) { tr.fleeing = true; tr.dir = null; this._onFlee(n); }
      return;
    }
    if (tr.fleeing) { if (st !== 'act' && st !== 'walk') return; tr.fleeing = false; this._replan(n); }
    if (tr.back > 0) tr.back -= dt;
    if (tr.dir) {
      tr.dir.t -= dt;
      // the family needs no more telling once the way to the open entrance is clear of the fire
      if (n === this.tutorial && tr.dir.t < L4.directS - 1 && this._tutClear(n) >= 0) tr.dir.t = 0;
      if (tr.dir.t <= 0) { const d = tr.dir; tr.dir = null; this._afterDirect(n, d); }
      return;
    }
    if (tr.hold > 0) { tr.hold -= dt; if (tr.hold <= 0) this._replan(n); return; }
    const wp = tr.wp[0], d = wp ? Math.hypot(wp[0] - n.pos.x, wp[1] - n.pos.z) : 0;
    switch (tr.s) {
      case 'toDoor': {
        if (n.pos.z > 641.7) { this._toGate(n, this._pickGate(n)); break; }
        const door = this.D.doors[tr.door];
        if (door.open) { if (tr.wp.length > 1 && (d < 1.1 || n.pos.z > 638.6)) tr.wp.shift(); break; }
        // shut: wait at it for a while, then try another entrance
        if (tr.wp.length < 2) this._toDoor(n, tr.door);
        if (n.pos.z < 640.3 && d < 7) {
          tr.waitT += dt;
          if (tr.waitT > tr.patience) { tr.waitT = 0; const o = this._nearDoor(n.pos.x); if (o !== tr.door && this.D.doors[o].open) this._toDoor(n, o); }
        }
        break;
      }
      case 'toGate': {
        if (n.pos.z > 680.7) { this._toPlat(n); break; } // swept through in a rush
        if (n.pos.z < 640.6) { this._replan(n); break; }
        tr.think -= dt;
        if (tr.think <= 0) {
          tr.think = R(2, 4);
          const o = 1 - tr.gate, G = this.D.gates;
          if (G[tr.gate].mode === 'closed' && G[o].mode !== 'closed') this._toGate(n, o);
          // turned aside by one of the officer's barriers: try the other line if it is shorter
          else if (n.lastDeflect && n.lastDeflect !== tr.seen) { tr.seen = n.lastDeflect; if (G[o].mode !== 'closed' && this.zones[3 + o].n <= this.zones[3 + tr.gate].n) { this._toGate(n, o); this.stats.directed++; } }
        }
        break;
      }
      case 'gate':
        if (tr.wp.length > 1 && (d < 0.7 || n.pos.z > wp[1])) tr.wp.shift();
        else if (n.pos.z > 681.3 || (tr.wp.length <= 1 && d < 0.7)) this._toPlat(n);
        break;
      case 'toPlat':
        if (n.pos.z < 678.8) { this._replan(n); break; }
        if (d < 0.9) tr.s = 'wait';
        break;
      case 'wait': break;
      case 'board': {
        if (this.train.s !== 'open') { tr.s = 'wait'; tr.wp = [tr.spot]; this.train.res = Math.max(0, this.train.res - 1); break; }
        if (n.pos.z > 699.0 && Math.abs(n.pos.x - S.trainDoors[tr.td]) < 1.2) this._home(n);
        break;
      }
      case 'toRest': if (d < 1.0) { tr.s = 'rest'; tr.restT = 12; } break;
      case 'rest': tr.restT -= dt; if (tr.restT <= 0) this._replan(n); break;
      default: break;
    }
  }

  _travPose(n, P, t) {
    const tr = n.tr, L = life(n.rig, n.id);
    if (!tr) return 0;
    if (tr.s === 'carried') { supported(P, 1, t, 1); return 8; }
    if (n.l4.old) stooped(P, 1);
    const k = n.l4.child;
    if (k && k.state !== 'gone' && n.state !== 'down') {
      // hand in hand; in a crush the child is lifted onto the hip
      const lift = k.lift || 0;
      handHeld(P, 1, 0, 1 - lift);
      if (lift > 0.01) { P.shLX += (-0.9 - P.shLX) * lift; P.elL += (-1.7 - P.elL) * lift; P.shLZ += (0.55 - P.shLZ) * lift; P.spZ += 0.08 * lift; }
    }
    if (tr.pk > 0.02 && n.state !== 'flee' && n.state !== 'down' && n.state !== 'recover') pressed(P, L, t, tr.pk * (k ? 0.5 : 1));
    if (tr.s === 'rest') { P.spX += 0.3; P.hdX += 0.3; P.shLX = -0.5; P.shRX = -0.5; P.elL = P.elR = -1.2; }
    if (tr.s === 'stuck') { P.spX -= 0.05; P.hdY += Math.sin(t * 1.3) * 0.4; P.brow = -0.8; }
    return 0;
  }

  _home(n) {
    const kid = n.l4.child && n.l4.child.state !== 'gone' ? 1 : 0;
    this.home += 1 + kid; this.train.n += 1 + kid;
    this.score += 10 * (1 + kid);
    this._leave(n);
  }

  // ------------------------------------------------------------- children
  _slot(a, out) {
    const h = a.heading;
    return out.set(a.pos.x + Math.cos(h) * 0.68 + Math.sin(h) * 0.05, 0, a.pos.z - Math.sin(h) * 0.68 + Math.cos(h) * 0.05);
  }
  _kidTick(n) {
    const a = n.kidOf, c = this.game.crowd;
    if (!a || a.state === 'gone' || !a.tr) { c.retire(n); return; }
    const s = this._slot(a, this._v), d = Math.hypot(s.x - n.pos.x, s.z - n.pos.z);
    if (d > 3.2) { n.pos.copy(s); n.vel.set(0, 0, 0); }
    const want = a.tr.pk > 0.55 || a.tr.s === 'carried' ? 1 : 0;
    n.lift = (n.lift || 0) + (want - (n.lift || 0)) * 0.08;
    n.stimuli.length = 0; n.fear = 0;
    if (n.state !== 'walk' && n.state !== 'act') c.setState(n, 'walk');
    n.dur = 1e9;
  }
  _kidMove(n) {
    const a = n.kidOf;
    if (!a || a.state === 'gone') return { speed: 0 };
    const s = this._slot(a, this._v), d = Math.hypot(s.x - n.pos.x, s.z - n.pos.z);
    return { speed: Math.min(4.6, Math.max(a.speed * 1.1, d * 2.6)), dest: s };
  }
  _kidPose(n, P, t) {
    const lift = n.lift || 0;
    handHeld(P, -1, 1, 1 - lift);
    if (lift > 0.01) { P.y += 0.42 * lift; P.shLX += (-1.3 - P.shLX) * lift; P.shRX += (-1.3 - P.shRX) * lift; P.elL = P.elR = -1.2 * lift; P.hpLX = P.hpRX = -0.7 * lift; P.knL = P.knR = 0.9 * lift; }
    P.hdX -= 0.12; P.hdY += Math.sin(t * 0.7 + n.id) * 0.25;
    return 0;
  }

  // ------------------------------------------------------------- density
  // how many people each traveller has within a metre (a few of them every frame)
  _density() {
    const c = this.game.crowd, A = this.active, buf = this._buf || (this._buf = []);
    const per = Math.max(1, Math.ceil(A.length / 6));
    for (let k = 0; k < per && A.length; k++) {
      this.di = (this.di + 1) % A.length;
      const n = A[this.di], tr = n.tr;
      let nb = 0;
      for (const o of c.query(n.pos.x, n.pos.z, 1.0, buf)) if (o !== n && o.id !== undefined && o.state !== 'down' && !o.kidOf) nb++;
      tr.nb = nb;
      const want = nb >= L4.tight ? 1 : nb === L4.tight - 1 ? 0.45 : 0;
      tr.pk += (want - tr.pk) * 0.35;
    }
  }

  // the places a crowd can jam: pressed people there against what the place can take
  _zones(dt) {
    this.zoneT -= dt;
    if (this.zoneT <= 0) {
      this.zoneT = 0.25;
      for (const z of this.zones) z.n = 0;
      for (const n of this.active) {
        const tr = n.tr, tight = tr.nb >= L4.tight, flee = n.state === 'flee';
        if (!tight && !flee) continue;
        const z = this._zoneOf(n);
        if (z) z.n += (tight ? 1 : 0) + (flee ? 1.5 : 0);
      }
      let worst = this.zones[0];
      for (const z of this.zones) {
        const want = Math.min(100, (z.n / L4.cap[z.kind]) * L4.red);
        z.v += (want - z.v) * (want > z.v ? 0.45 : 0.2);
        if (z.v > worst.v) worst = z;
      }
      this.worst = worst;
      this.gauge.value = worst.v;
      this.stats.peakDensity = Math.max(this.stats.peakDensity, worst.v);
    }
    this.fallCool -= dt;
    for (const z of this.zones) {
      if (z.v < L4.red) { z.fallT = Math.max(z.fallT, L4.grace * 0.6); continue; }
      this.stats.overRed += dt;
      z.fallT -= dt;
      if (z.fallT <= 0) {
        const k = clamp((z.v - L4.red) / (100 - L4.red), 0, 1);
        z.fallT = L4.fall[0] + (L4.fall[1] - L4.fall[0]) * k;
        this._fallIn(z);
      }
    }
    // a panic wave: several people breaking into a run within a few seconds
    const t = this.t;
    while (this.fleeLog.length && t - this.fleeLog[0] > 4) this.fleeLog.shift();
    if (!this.waveOn && this.fleeLog.length >= 6) {
      this.waveOn = true; this.stats.stampedes++;
      if (this.section === 2) this.crewWave++;
      this.addScore(-250, 'Panic in the crowd'); // restraint is the high-scoring route
      this.game.hud.alert('PANIC — people are running', 'bad', 3, 'panic');
      this.game.audio.ui('bad');
    } else if (this.waveOn && !this.fleeLog.length) this.waveOn = false;
  }

  _fallIn(z) {
    // the first to go down are the slowest and the most pressed; never an adult holding a child
    const c = this.active.filter((n) => n.tr.nb >= L4.tight && !n.l4.child && !n.tr.fall && (n.state === 'act' || n.state === 'walk') && n.tr.s !== 'gate' && n.tr.s !== 'board' && this._zoneOf(n) === z);
    if (!c.length) return;
    const old = c.filter((n) => n.l4.old);
    const n = old.length && Math.random() < 0.7 ? old[Math.floor(Math.random() * old.length)] : c[Math.floor(Math.random() * c.length)];
    this._fall(n, z, false);
  }
  _fall(n, zone, panic) {
    if (this.fallCool > 0) return;
    this.fallCool = 0.5;
    const g = this.game, tr = n.tr;
    n.fallDir = Math.random() < 0.6 ? 1 : -1;
    g.crowd.setState(n, 'down', 1e9);
    tr.fall = { t: 0, limit: panic ? L4.panicTrample : L4.trample, zone, panic };
    tr.dir = null;
    this.fallen.push(n);
    this.stats.falls++;
    g.audio.hurt(false);
    g.hud.alert(`Someone is down at ${zone ? zone.name : 'the station'} — pull them out`, 'warn', 3, 'fall');
    this.say('down', 2, 25);
  }
  _fallTick(n, dt) {
    const tr = n.tr, f = tr.fall, g = this.game;
    f.t += dt;
    n.stimuli.length = 0;
    if (f.t < f.limit) return;
    tr.fall = null;
    this.fallen.splice(this.fallen.indexOf(n), 1);
    if (f.panic || (f.zone && f.zone.v >= 45)) {
      // nobody reached them and the crowd is still on top of them
      tr.s = 'hurt';
      this.stats.trampled++;
      this.addScore(-300, 'Trampled');
      g.hud.alert('A person has been trampled', 'bad', 3.5);
      g.audio.ui('bad');
      this.say('trampled', 2, 30);
    } else { g.crowd.setState(n, 'recover', 1.5); tr.recovering = true; } // room again: they get up by themselves
  }
  _onFlee(n) {
    this.fleeLog.push(this.t);
    const tr = n.tr;
    if (n.l4.child || tr.nb < L4.tight - 1) return;
    if (Math.random() < (n.l4.old ? 0.5 : 0.2)) this._fall(n, this._zoneOf(n), true);
  }
  _rescue(n) {
    const tr = n.tr;
    tr.fall = null; tr.recovering = true; tr.rescued = true;
    const i = this.fallen.indexOf(n); if (i >= 0) this.fallen.splice(i, 1);
    this.game.crowd.setState(n, 'recover', 1.2);
    this.stats.rescued++;
    this.addScore(150, 'Pulled from the crush');
    this.game.hud.alert('On their feet — they will sit this one out', 'good', 2.2);
  }

  // ------------------------------------------------------------- arrivals, gates, the train
  _arrivals(dt) {
    const a = this.arrive;
    if (a.rate <= 0 || a.left <= 0 || !this.pool.length) return;
    a.acc += a.rate * dt * (1 + 0.55 * Math.sin(this.t * 0.11)); // in waves, as each closed Métro exit empties
    while (a.acc >= 1 && a.left > 0) {
      a.acc -= 1;
      const n = this._take(); if (!n) return;
      // more come from the west, where the boulevard and the closed Métro are
      const r = Math.random(), x = r < 0.5 ? R(-32, -13) : r < 0.8 ? R(-11, 11) : R(13, 32);
      this._enter(n, x, 599.4 + Math.random() * 0.8);
      a.left--;
    }
  }

  // a gate line lets people through at its rate, nearest the line first
  _gates(dt) {
    this.D.gates.forEach((G, i) => {
      const st = this.gates[i], rate = L4.gate[G.mode];
      st.acc = Math.min(1.5, st.acc + rate * dt);
      while (st.acc >= 1) {
        let best = null, bz = 675.0;
        for (const n of this.active) { const tr = n.tr; if (tr.s !== 'toGate' || tr.gate !== i || tr.dir || tr.hold > 0 || tr.fall || (n.state !== 'act' && n.state !== 'walk')) continue; if (Math.abs(n.pos.x - G.x) < 4.8 && n.pos.z > bz) { bz = n.pos.z; best = n; } }
        if (!best) break;
        st.acc -= 1;
        const lx = G.x + S.lanes[st.lane++ % S.lanes.length];
        best.tr.s = 'gate'; best.tr.wp = [[lx, 678.3], [lx, 681.8]];
      }
    });
  }

  _train(dt) {
    const T = this.train, K = L4.train, g = this.game, D = this.D;
    const ease = (u) => u * u * (3 - 2 * u);
    if (T.s === 'idle') return;
    T.t += dt;
    if (T.s === 'away') {
      if (T.left === 0) return;
      if (T.t >= 0) { T.s = 'in'; T.t = 0; this.say('train', 1, 100); g.audio.horn(V(40, 2, 700)); g.hud.alert('Train arriving · voie 4', 'info', 2.5, 'train'); }
    } else if (T.s === 'in') {
      const u = Math.min(1, T.t / K.arrive);
      T.x = 135 * (1 - ease(u)) * (1 - u * 0.0) ; T.k = 0;
      if (u >= 1) { T.s = 'open'; T.t = 0; T.n = 0; T.res = 0; T.held = 0; T.x = 0; g.audio.hiss(V(0, 1, 699), 1.2); }
    } else if (T.s === 'open') {
      T.k = Math.min(1, T.t / 0.8);
      const last = T.left === 1;
      // doors: one person a second each, the nearest waiting first, until the train is full
      S.trainDoors.forEach((dx, d) => {
        T.acc[d] = Math.min(1.2, T.acc[d] + L4.boardRate * dt);
        if (T.acc[d] < 1 || T.res >= K.cap) return;
        let best = null, bd = 9;
        for (const n of this.active) {
          const tr = n.tr; if (tr.s !== 'wait' || tr.back > 0 || tr.dir || tr.hold > 0 || (n.state !== 'act' && n.state !== 'walk')) continue;
          const k = Math.hypot(n.pos.x - dx, n.pos.z - 699.3) + (tr.td === d ? 0 : 2.5);
          if (k < bd) { bd = k; best = n; }
        }
        if (!best) return;
        T.acc[d] -= 1; T.res += 1 + (best.l4.child ? 1 : 0);
        best.tr.s = 'board'; best.tr.td = d; best.tr.wp = [[dx + R(-0.25, 0.25), 699.3]];
      });
      let stay = K.open;
      if (last) {
        // the last train waits for whoever is still coming, and for the casualty
        const coming = this.active.some((n) => n.tr.s !== 'hurt' && n.tr.s !== 'rest' && n.tr.s !== 'toRest') || (this.injured && this.injured.tr && this.injured.tr.s !== 'gone');
        if (coming && T.res < K.cap) stay = K.open + K.holdMax;
        if (T.t > K.open && coming && !this.radioSaid.hold && this.injured && this.injured.tr) this.say('hold', 2);
      }
      if (T.t > stay - 6 && T.t - dt <= stay - 6) g.hud.alert('Doors closing in a moment', 'warn', 2.5, 'doors');
      if (T.t >= stay || (last && T.t > 12 && !this.active.some((n) => n.tr.s !== 'hurt' && n.tr.s !== 'rest' && n.tr.s !== 'toRest'))) { T.s = 'out'; T.t = 0; g.audio.hiss(V(0, 1, 699), 1.0); }
    } else if (T.s === 'out') {
      T.k = Math.max(0, 1 - T.t / 0.8);
      const u = clamp((T.t - 1.2) / K.leave, 0, 1);
      T.x = -135 * u * u;
      if (u >= 1) {
        this.stats.trains++;
        if (T.n) g.hud.alert(`Train away · ${T.n} aboard · ${this.home} home`, 'good', 2.5, 'away');
        if (T.left !== null) T.left--;
        T.s = 'away'; T.t = -K.away; T.x = 200;
        if (T.left === 0) this._lastTrainGone();
      }
    }
    D.setTrain(T.x, T.k);
  }

  // ------------------------------------------------------------- direct (the new verb)
  // Called by the player while F is held. mode 'point': calm people within reach in the same
  // space go the way the officer points. mode 'threat': the baton is up, and the same call
  // frightens them instead.
  onDirect(mode, dir, dt) {
    const g = this.game, p = g.player.pos, room = roomAt(p.z);
    this.directT = 0.2;
    if (mode === 'threat') {
      this.threatT -= dt;
      if (this.threatT <= 0) {
        this.threatT = 1.3;
        g.crowd.disturb(p, L4.directR, 0.6, 'violence');
        this.stats.frightened++;
        g.hud.alert('Baton up — you are frightening them. Lower it, then call', 'bad', 2.6, 'threat');
      }
      this.directN = 0;
      return;
    }
    let count = 0;
    for (const n of this.active) {
      const tr = n.tr;
      if (tr.fall || tr.s === 'hurt' || tr.s === 'carried' || tr.s === 'gate' || tr.s === 'board' || tr.recovering) continue;
      if (n.state !== 'act' && n.state !== 'walk') continue;
      if (roomAt(n.pos.z) !== room || Math.hypot(n.pos.x - p.x, n.pos.z - p.z) > L4.directR) continue;
      if (n === this.tutorial && room === 0) {
        // a second or so of pointing, and once the way is clear of the fire they go in by themselves
        const e = this._tutClear(n);
        if (e >= 0 && (tr.s === 'toDoor' || tr.sentT > 1)) { if (tr.s !== 'toDoor') { tr.dir = null; this._toDoor(n, e); } count++; continue; }
        tr.sentT = (tr.sentT || 0) + dt;
      }
      if (!tr.dir) { this.stats.directed++; n.lookT = 0.8; n.focus.copy(p); }
      tr.dir = { x: dir.x, z: dir.z, t: L4.directS }; tr.hold = 0;
      if (tr.s === 'stuck' || tr.s === 'rest' || tr.s === 'toRest') tr.s = 'sent';
      count++;
    }
    // the staff take it as an order: pointed at their gate line they open it wide, away they close it
    if (this.directFresh) for (const st of this.staffS) {
      const n = st.n, G = S.gates[st.gate];
      if (st.s !== 'idle' || roomAt(n.pos.z) !== room || Math.hypot(n.pos.x - p.x, n.pos.z - p.z) > L4.directR) continue;
      const gx = G.x - n.pos.x, gz = S.gateZ - n.pos.z, gl = Math.hypot(gx, gz) || 1;
      this._order(st, (dir.x * gx + dir.z * gz) / gl > 0 ? 'open' : 'closed');
    }
    this.directFresh = false;
    this.directN = count;
  }

  // the open entrance the tutorial family can walk straight to without passing the fire (-1: none)
  _tutClear(n) {
    const e = this.D.doors.findIndex((o) => o.open);
    if (e < 0) return -1;
    const ax = S.doors[e].x - n.pos.x, az = 638.2 - n.pos.z, l = Math.hypot(ax, az) || 1;
    const u = clamp(((S.pyre.x - n.pos.x) * ax + (S.pyre.z - n.pos.z) * az) / (l * l), 0, 1);
    return Math.hypot(n.pos.x + ax * u - S.pyre.x, n.pos.z + az * u - S.pyre.z) > 5.5 ? e : -1;
  }

  // the pointing is over: where does that leave them?
  _afterDirect(n, d) {
    const tr = n.tr, room = roomAt(n.pos.z), D = this.D;
    const dot = (x, z) => { const ax = x - n.pos.x, az = z - n.pos.z, l = Math.hypot(ax, az) || 1; return (d.x * ax + d.z * az) / l; };
    if (n === this.tutorial && room === 0) {
      const e = this._tutClear(n);
      if (e >= 0) this._toDoor(n, e); else { tr.s = 'stuck'; tr.wp = []; }
      return;
    }
    if (room === 0) {
      let best = -1, bd = 0.25;
      D.doors.forEach((o, i) => { const k = dot(o.x, 638.2) + (o.open ? 0.3 : 0); if (k > bd) { bd = k; best = i; } });
      if (best >= 0) this._toDoor(n, best); else { tr.hold = L4.holdS; tr.s = 'toDoor'; }
    } else if (room === 1) {
      // the gate line most nearly the way the officer pointed; pointed away from both, they hold back
      let best = -1, bd = 0.1;
      D.gates.forEach((o, i) => { const k = dot(o.x, 677) - (o.mode === 'closed' ? 0.6 : 0); if (k > bd) { bd = k; best = i; } });
      if (best >= 0) this._toGate(n, best); else { tr.s = 'toGate'; tr.hold = L4.holdS; tr.wp = [[S.gates[tr.gate].x + tr.jx * 3.3, 677.0]]; }
    } else {
      if (d.z < -0.45) { tr.back = 14; this._toPlat(n, tr.td); } // back from the edge
      else {
        let best = tr.td, bd = -1;
        S.trainDoors.forEach((x, i) => { const k = dot(x, 698) - Math.abs(x - n.pos.x) * 0.02; if (k > bd) { bd = k; best = i; } });
        this._toPlat(n, best);
      }
    }
  }

  // ------------------------------------------------------------- staff
  _order(st, mode) {
    const G = this.D.gates[st.gate];
    if (st.s !== 'idle' || G.mode === mode) return;
    if (mode === 'open' && this.platIsFull) { this.game.hud.alert('Staff: "Not while the platform is full."', 'warn', 2.4, 'full'); return; }
    st.s = 'operate'; st.t = 0; st.want = mode;
    st.n.focus.set(S.gates[st.gate].x, 0, S.gateZ); st.n.lookT = 3;
    this.game.audio.ui('click');
  }
  _staffUpdate(dt) {
    // a full platform: they stop waving people through until a train has cleared it
    const full = this.platIsFull = this.active.reduce((a, n) => a + (n.pos.z > S.gateZ ? 1 : 0), 0) > L4.platFull;
    for (const st of this.staffS) {
      const n = st.n;
      if (full && st.s === 'idle' && this.D.gates[st.gate].mode === 'open') { this._order(st, 'tickets'); this.say('platFull', 1, 40); }
      if (st.s === 'operate') {
        st.t += dt;
        if (st.t > 1.3) {
          st.s = 'idle';
          this.D.setGate(st.gate, st.want);
          const G = S.gates[st.gate];
          this.game.hud.alert(`${G.name} ${st.want === 'open' ? 'open wide' : st.want === 'closed' ? 'closed' : 'back on tickets'}`, st.want === 'open' ? 'good' : 'info', 2.2);
          this.game.audio.impact(V(G.x, 1, S.gateZ), false, false, 'metal');
        }
      } else if (n.lookT <= 0) {
        // they watch their queue, and the officer when he is close
        if (n.distToPlayer < 6) n.focus.copy(this.game.player.pos); else n.focus.set(S.gates[st.gate].x, 0, 668);
      } else n.lookT -= dt;
    }
  }
  _staffPose(n, P, t) {
    const st = this.staffS.find((s) => s.n === n);
    if (st && st.s === 'operate') { P.shRX = -1.5; P.elR = -0.2; P.shRZ = 0.1; P.spX = 0.12; P.mouth = 0.5; return 12; }
    // hands clasped behind the back, rocking a little
    P.shLX = P.shRX = 0.35; P.elL = P.elR = -0.6; P.shLZ = -0.2; P.shRZ = 0.2; P.spX -= 0.03 + Math.sin(t * 0.5 + n.id) * 0.01;
    return 0;
  }

  // ------------------------------------------------------------- the crew (Beat 3)
  _crewStart() {
    const c = this.game.crowd, zA = this.zones[3], zB = this.zones[4];
    const i = zB.n > zA.n ? 1 : 0, k = S.kiosks[i];
    this.crewKiosk = i; this.crewS = 'in'; this.crewT = 0; this.crewWave = 0;
    this.crew.forEach((n, j) => {
      this._place(n, k.x + k.face * (9 + j * 0.9), 646 + j * 0.8, this.CREW, 'walk');
      n.untargetable = false; n.hp = 3; n.speedMul = 1;
      n.crewAt = [k.x + k.face * (S.kioskHalf[0] + 0.75), k.z - 2.1 + j * 1.4];
      n.crewWp = [[n.crewAt[0] + k.face * 2.5, n.crewAt[1]], n.crewAt];
      n.crewS = 'in';
      c.setState(n, 'walk'); n.dur = 1e9;
    });
    this.say('crew', 2); this.say('crewHint');
  }
  _crewMove(n) {
    if (n.crewS === 'smash') return { speed: 0 };
    const wp = n.crewWp[0];
    if (!wp) return { speed: 0 };
    return { speed: n.crewS === 'run' ? 4.6 : 2.6, dest: this._v.set(wp[0], 0, wp[1]) };
  }
  _crewTick(n, dt) {
    const g = this.game, c = g.crowd, k = S.kiosks[this.crewKiosk];
    if (n.state === 'stagger' || n.state === 'down' || n.state === 'recover') return;
    const wp = n.crewWp[0];
    if (n.crewS === 'in' || n.crewS === 'run') {
      if (n.state !== 'walk') { c.setState(n, 'walk'); n.dur = 1e9; }
      if (wp && Math.hypot(wp[0] - n.pos.x, wp[1] - n.pos.z) < 0.9) n.crewWp.shift();
      if (!n.crewWp.length) {
        if (n.crewS === 'run') { c.retire(n); return; }
        n.crewS = 'smash'; n.focus.set(k.x, 0, n.pos.z);
        c.setState(n, 'loot_smash', 1e9); n.hitCyc = 0;
      }
      return;
    }
    // at the glass: blows land with the animation's beat
    const cyc = Math.floor(n.st * 1.6 + n.id * 0.3 - 0.25);
    if (cyc !== n.hitCyc) {
      n.hitCyc = cyc;
      const at = V(n.pos.x - k.face * 0.6, 1.0, n.pos.z);
      if (Math.random() < 0.5) g.audio.shutter(at); else g.audio.glass(at, 0.5);
      g.effects.dust(at, 3);
    }
  }
  _crewStruck(n) {
    if (this.crewS === 'fight') return;
    this.crewS = 'fight';
    const c = this.game.crowd;
    // one of them is hit: the rest turn on the officer
    for (const m of this.crew) {
      if (m.state === 'gone' || m.arrested) continue;
      m.script = null;
      if (m === n) { m.temperament = 'hostile'; m.attackStyle = 'melee'; m.targetMode = 'player'; m.lastAggro = c.time; m.guardBlocks = 0; m.cool = 0.5; }
      else c.makeHostile(m, 'melee', 'player');
    }
    this.game.hud.alert('The crew are turning on you', 'warn', 2.5);
  }
  _crewFlee(why) {
    const D = this.D;
    const open = D.doors.map((d, i) => (d.open ? i : -1)).filter((i) => i >= 0);
    if (!open.length) { this._crewStruck(null); return; } // cornered: nowhere to run
    this.crewS = 'flee';
    for (const n of this.crew) {
      if (n.state === 'gone' || n.arrested || n.neutralized) continue;
      let di = open[0]; for (const i of open) if (Math.abs(S.doors[i].x - n.pos.x) < Math.abs(S.doors[di].x - n.pos.x)) di = i;
      const dx = S.doors[di].x;
      n.script = this.CREW; n.temperament = 'scripted'; n.crewS = 'run';
      n.crewWp = [[dx, 643], [dx, 637.5], [dx + R(-6, 6), 600]];
      this.game.crowd.setState(n, 'walk'); n.dur = 1e9;
      this.stats.crewFled++;
    }
    this.game.hud.alert(why, 'info', 2.5);
  }
  _torch() {
    const g = this.game, k = S.kiosks[this.crewKiosk];
    const at = V(k.x + k.face * (S.kioskHalf[0] + 0.5), 0, k.z);
    g.effects.ignite(at, 2.4, 9);
    this.kioskFire = g.effects.addFire(V(at.x - k.face * 0.3, 1.2, at.z), 1.3, 2.2, { own: true });
    g.audio.molotov(at, 1.0); g.audio.glass(at, 0.8);
    g.crowd.disturb(at, 18, 0.95, 'explosion');
    this.stats.kioskBurned = 1;
    g.hud.alert('They have set the kiosk alight!', 'bad', 3);
    this._crewFlee('The crew are running for the entrances');
  }
  _crewUpdate(dt) {
    if (this.crewS === 'none' || this.crewS === 'done') return;
    const g = this.game, k = S.kiosks[this.crewKiosk];
    this.crewT += dt;
    if (this.crewS === 'in' && this.crew.every((n) => n.crewS === 'smash' || n.state === 'gone')) this.crewS = 'smash';
    if (this.crewS === 'in' || this.crewS === 'smash') {
      if (this.crewT > 14 && !this.kioskBroken) { this.kioskBroken = true; this.D.setKiosk(this.crewKiosk, true); g.audio.glass(V(k.x, 1.2, k.z), 1.0); }
      // gas shifts them (and whoever else is standing in it)
      if (g.events.gasClouds.some((c) => Math.hypot(c.pos.x - (k.x + k.face * 3), c.pos.z - k.z) < 7.5)) this._crewFlee('The gas has shifted the crew — they are running');
      else if (this.crewT > L4.crew.torch) this._torch();
      else if (this.crewT > L4.crew.bottle) this.say('bottle', 2);
    }
    // fighters who gave up and walked off are let go through the nearest entrance
    for (const n of this.crew) {
      if (n.state === 'gone' || n.script === this.CREW) continue;
      if (n.temperament === 'peaceful') { n.script = this.CREW; n.temperament = 'scripted'; n.crewS = 'run'; n.crewWp = [[S.doors[this._nearDoor(n.pos.x)].x, 643], [S.doors[this._nearDoor(n.pos.x)].x, 637.5], [n.pos.x, 600]]; }
    }
    const left = this.crew.filter((n) => n.state !== 'gone' && !n.arrested && !n.neutralized && !(n.crewS === 'run' && n.pos.z < 640)).length;
    if (!left || this.crewT > L4.crew.maxT) {
      this.crewS = 'done';
      for (const n of this.crew) if (n.crewS === 'run' && n.state !== 'gone') g.crowd.retire(n);
    }
  }

  // ------------------------------------------------------------- the casualty (Beat 4)
  _carried(n) {
    const p = this.game.player, h = p.heading;
    n.pos.set(p.pos.x - Math.cos(h) * 0.74, p.pos.y, p.pos.z + Math.sin(h) * 0.74); // on the officer's right
    n.heading = h; n.vel.copy(p.vel); n.stimuli.length = 0; n.fear = 0;
  }
  _lift(n) {
    const g = this.game;
    n.tr.s = 'carried'; g.player.carrying = n;
    g.crowd.setState(n, 'carried', 1e9);
    g.hud.alert('You have them. Walk them to an open train door', 'info', 3);
  }
  _setDown(n, aboard) {
    const g = this.game;
    g.player.carrying = null;
    if (aboard) {
      this.stats.carried++; this.home++; this.train.n++; this.score += 10;
      this.addScore(400, 'Casualty aboard');
      if (n === this.injured) this.injured = null;
      this._leave(n);
      g.hud.alert('They are aboard — the guard has them', 'good', 3);
      g.audio.ui('good');
      return;
    }
    n.tr.s = 'hurt'; n.fallDir = -1;
    g.crowd.setState(n, 'down', 1e9);
  }
  onCarryDropped() { const n = this.game.player.carrying; if (n) this._setDown(n, false); }
  _collapse() {
    // nobody was hurt earlier: an older traveller's legs give out in the hall
    let n = this.active.find((o) => o.tr.s === 'hurt');
    if (!n) {
      n = this.active.find((o) => o.l4.old && roomAt(o.pos.z) === 1 && !o.tr.fall && o.tr.s === 'toGate') || this.active.find((o) => !o.l4.child && roomAt(o.pos.z) === 1 && !o.tr.fall && o.tr.s === 'toGate');
      if (!n) { const t = this._take(); if (!t) return; n = this._enter(t, R(-6, 6), R(656, 664)); }
      n.tr.s = 'hurt'; n.fallDir = 1; n.tr.dir = null;
      this.game.crowd.setState(n, 'down', 1e9);
    }
    this.injured = n;
    this.say('injured', 2);
  }

  // ------------------------------------------------------------- beats
  _startBeat(i, jumped = false) {
    const g = this.game, D = this.D;
    this.section = i; this.phase = i; this.stage = 'b' + i; this.stageT = 0; this.musicTier = i;
    g.hud.titleCard(i === 0 ? 'LAST TRAIN' : L4_PHASES[i], `Gare de l'Est · ${['03h10', '03h12', '03h18', '03h22'][i]}`, i === 0 && !jumped ? 3.5 : 2.6);
    if (jumped) {
      for (let k = 0; k < i; k++) this.completed[k] = true;
      this.home = [0, 0, 80, 150][i]; this.stats.trains = [0, 0, 3, 5][i];
    }
    if (i === 0 || jumped) this._prefill(jumped ? 46 : L4.prefill[0], jumped && i > 1 ? 24 : L4.prefill[1]);
    this.arrive.rate = L4.rate[i]; this.arrive.left = L4.arrivals[i]; this.arrive.acc = 0;
    if (i >= 1 && this.train.s === 'idle') { this.train.s = 'away'; this.train.t = -(jumped ? 8 : L4.train.first); }
    if (i === 0) {
      // the family in the forecourt, the pyre between them and the east entrance
      const a = this.pool.find((n) => n.l4.child) || this.pool[0];
      this.tutorial = a;
      this._enter(a, -3, 617);
      a.tr.s = 'stuck'; a.tr.wp = []; a.heading = 1.2; a.focus.set(S.pyre.x, 0, S.pyre.z); a.lookT = 1e9;
      this.say('start'); this.say('family'); this.say('direct');
      if (!jumped) this._introCinematic();
    } else if (i === 1) {
      if (this.tutorial && this.tutorial.tr && this.tutorial.tr.s === 'stuck') this._toDoor(this.tutorial, this._nearDoor(this.tutorial.pos.x));
      this.say('wave'); this.say('gauge');
      this.gasT = 40;
    } else if (i === 2) {
      this.kioskBroken = false;
      this._crewStart();
    } else if (i === 3) {
      this.urgent = true;
      this.train.left = this.train.s === 'away' ? 3 : 4; // three more after the one at the platform
      this.say('last', 2);
      this.collapseT = 10;
    }
  }
  _prefill(nHall, nPlat) {
    const g = this.game;
    for (let k = 0; k < nHall + nPlat; k++) {
      const n = this._take(); if (!n) break;
      let x = 0, z = 0;
      for (let j = 0; j < 12; j++) {
        if (k < nHall) { x = R(-28, 28); z = R(645, 676); } else { x = R(-30, 30); z = R(684, 696); }
        if (!g.world.blocked(x, z, 0.5)) break;
      }
      this._enter(n, x, z);
      if (k >= nHall) n.tr.s = 'wait';
    }
  }
  _beatDone(i, bonus, text) {
    if (this.completed[i]) return;
    this._phaseDone(i, bonus, text);
  }

  // Beat 1: done when the family is through the entrance (or, left alone long enough, the
  // crowd arrives anyway and they find their own way round)
  _b0() {
    const a = this.tutorial, g = this.game;
    if (this.fireBalk > 0) { this.fireBalk -= this.dt; g.hud.alert('They will not walk at the fire — send them round it', 'warn', 2.2, 'balk'); }
    if (a && a.tr && roomAt(a.pos.z) >= 1) { this.say('inside'); this._beatDone(0, 400, 'The family is inside'); this._startBeat(1); return; }
    if (this.stageT > 150 || !a || !a.tr) this._startBeat(1);
  }
  // Beat 2: the wave. It ends once enough people are on their way home
  _b1() {
    const B = L4.beat1;
    if ((this.home >= B.home && this.stageT > B.minT) || this.stageT > B.maxT) {
      this._beatDone(1, 600, 'The concourse is moving');
      this._startBeat(2);
    }
  }
  // Beat 3: the crew at the kiosk
  _b2() {
    if (this.crewS !== 'done') return;
    this.say('crewDone');
    this._beatDone(2, 600, this.stats.crewFled ? 'The crew are gone' : 'The crew are dealt with');
    if (!this.crewWave && !this.stats.kioskBurned) this.addScore(500, 'No panic at the kiosk');
    this._startBeat(3);
  }
  // Beat 4: the last trains. The level ends when the last one leaves (_lastTrainGone)
  _b3(dt) {
    if (this.collapseT > 0) { this.collapseT -= dt; if (this.collapseT <= 0) this._collapse(); }
  }
  _lastTrainGone() {
    if (this.ended) return;
    this.stage = 'victory';
    this.say('away', 2);
    this.arrive.rate = 0;
    const g = this.game;
    const mid = () => V(-10, 0, 694);
    g.playCinematic({
      id: 'lastTrain', title: 'LAST TRAIN AWAY', sub: 'Gare de l\'Est · 03h46', titleAt: [0.5, 4.0], sting: 'victory',
      lines: [[`${this.home} people are on their way home.`, 0.6, 2.6], [this.stats.trampled ? 'Not all of them walked onto the train.' : 'Nobody was carried out of the station.', 2.7, 4.4]],
      shots: [{ dur: 4.6, a: orbit(mid, 13, 3.2, 2.4, 50, 1.4), b: orbit(mid, 15, 4.2, 1.5, 54, 1.4) }],
      onDone: () => this.complete(),
    });
  }

  resume(cp) { this.jumpTo(cp.section || 0); }
  // ?dev&level=4&stage=N and __jump(N): start at beat N with the station already busy
  jumpTo(i) {
    i = clamp(i | 0, 0, L4_PHASES.length - 1);
    const g = this.game;
    this.reset();
    const at = [[5, 606], [10, 650], [4, 652], [0, 686]][i];
    g.player.pos.set(at[0], 0, at[1]); g.player.heading = 0; g.cameraRig.reset(g.player);
    this.lastHealth = g.player.health;
    if (i >= 1) { this.D.setDoor(0, true); this.D.setDoor(1, true); }
    this._startBeat(i, true);
  }

  // ------------------------------------------------------------- update
  update(dt) {
    const g = this.game;
    this.t += dt; this.stageT += dt; this.dt = dt;
    this.tension.update(dt);
    this._trackDamage();
    this.promptE = false;
    this._ensure();
    this._radioUpdate(dt);
    if (this.stage === 'intro') {
      if (this.stageT > 1.2) this._startBeat(0);
      this._updateMarker(dt);
      return;
    }
    this._arrivals(dt);
    this._gates(dt);
    this._train(dt);
    this._density();
    this._zones(dt);
    this._staffUpdate(dt);
    this._crewUpdate(dt);
    this._drift(dt);
    this._blows();
    if (this.stage !== 'victory' && this.stage !== 'done') {
      this[`_b${this.section}`](dt);
      this._interactions();
      if (this.stats.trampled >= L4.failTrampled && !this.ended) this.fail('Five people were trampled. The station was closed and cleared.');
    }
    this._ringUpdate(dt);
    this._marker();
    this.warning = this.gauge.value >= L4.red && this.stage !== 'victory';
    this.warningText = this.warning ? `⚠ CRUSH · ${this.worst.name.toUpperCase()}` : null;
    this._updateMarker(dt);
  }

  // gas from the boulevard drifting across the forecourt while people are still arriving
  _drift(dt) {
    if (this.section < 1 || this.stage === 'victory') return;
    this.gasT -= dt;
    if (this.gasT > 0) return;
    this.gasT = R(45, 70);
    const g = this.game, x = R(-22, 22);
    g.events.gasCloud(V(x, 0.1, R(602, 610)), 'police');
    g.events.gasCloud(V(x + R(-8, 8), 0.1, R(604, 614)), 'police');
    if (roomAt(g.player.pos.z) === 0 || this.active.some((n) => n.pos.z < 625)) this.say('gas', 1, 120);
  }

  // every blow the officer lands is seen and heard by the people round it
  _blows() {
    const g = this.game, a = g.player.attack;
    if (!a || !a.hit || a === this.lastAtk) return;
    this.lastAtk = a;
    const p = g.player, at = a.target ? a.target.pos : V(p.pos.x + Math.sin(p.heading) * 1.4, 0, p.pos.z + Math.cos(p.heading) * 1.4);
    g.crowd.disturb(at, 12, 1.0, 'violence', a.target || null);
  }

  // ------------------------------------------------------------- interactions (E)
  _hold(key, text, dur, done) {
    const g = this.game;
    this.promptE = true;
    if (this.busy && this.busy.key === key) {
      this.busy.t += this.dt;
      g.hud.prompt('E', `${text} · ${Math.min(100, Math.round((this.busy.t / dur) * 100))}%`);
      if (this.busy.t >= dur) { this.busy = null; done(); }
      return;
    }
    g.hud.prompt('E', text);
    if (g.input.pressed('KeyE')) { if (dur > 0) this.busy = { key, t: 0 }; else done(); }
  }
  _interactions() {
    const g = this.game, p = g.player.pos, D = this.D, T = this.train;
    const near = (x, z, r) => Math.hypot(p.x - x, p.z - z) < r;
    let key = null;
    const act = (k, text, dur, done) => { key = k; this._hold(k, text, dur, done); };
    const carrying = g.player.carrying;
    if (carrying) {
      // an open train door: aboard; anywhere else: set them down
      const d = T.s === 'open' && p.z > 696.2 ? S.trainDoors.find((x) => Math.abs(x - p.x) < 2.4) : undefined;
      if (d !== undefined) act('aboard', 'Help them aboard', 0.6, () => this._setDown(carrying, true));
      else { act('down', 'Set them down', 0, () => this._setDown(carrying, false)); this.promptE = false; } // (not something the dev bot should take up)
    } else {
      const f = this.fallen.find((n) => near(n.pos.x, n.pos.z, 2.4));
      const h = !f && this.active.find((n) => n.tr.s === 'hurt' && near(n.pos.x, n.pos.z, 2.2));
      const a = !f && !h && g.crowd.arrestable(p);
      const st = this.staffS.find((s) => s.s === 'idle' && near(s.n.pos.x, s.n.pos.z, 2.8));
      const di = D.doors.findIndex((d) => near(d.x, S.doorZ, 3.4));
      if (f) act('rescue' + f.id, 'Pull them clear', 0.7, () => this._rescue(f));
      else if (h) act('lift' + h.id, 'Lift them — walk them to the train', 0.9, () => this._lift(h));
      else if (a) { g.hud.prompt('E', 'Arrest suspect'); this.promptE = true; if (g.input.pressed('KeyE')) { g.crowd.arrest(a); this.onArrest(a); } }
      else if (st) {
        const G = D.gates[st.gate], open = G.mode !== 'open';
        act('staff' + st.gate, open ? `Staff: open ${G.name} wide` : `Staff: close ${G.name}`, 0, () => this._order(st, open ? 'open' : 'closed'));
        if (G.mode !== 'tickets') this.promptE = false; // (the dev bot asks for a line to be opened wide, and leaves it at that)
      } else if (di >= 0) {
        const d = D.doors[di];
        act('door' + di, `${d.open ? 'Close' : 'Open'} the ${d.name.toLowerCase()}`, 0.8, () => {
          D.setDoor(di, !d.open);
          g.audio.shutter(V(d.x, 2, S.doorZ));
          g.hud.alert(`${d.name} ${d.open ? 'open' : 'shut'}`, 'info', 2);
        });
        this.promptE = false; // (the dev bot leaves the shutters alone)
      }
    }
    if (this.busy && this.busy.key !== key) this.busy = null;
  }

  _ringUpdate(dt) {
    const g = this.game, p = g.player;
    if (this.directT > 0) this.directT -= dt; else { this.directFresh = true; this.directN = 0; }
    const on = this.directT > 0 && p.directing === 'point';
    this.ring.visible = on;
    if (on) {
      const yaw = g.cameraRig.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      this.ring.position.set(p.pos.x, p.pos.y + 0.05, p.pos.z);
      this.arrow.position.set(fx * 3.2, 0.02, fz * 3.2); this.arrow.rotation.y = Math.atan2(fx, fz);
      this.ring.children[0].material.opacity = 0.35 + 0.15 * Math.sin(this.t * 6);
      g.hud.prompt('F', this.directN ? `Directing ${this.directN} ${this.directN === 1 ? 'person' : 'people'}` : 'Nobody calm within reach');
    }
  }

  // where the beam leads: someone on the ground, the casualty (or, carrying, a door), the
  // crew, the tutorial family, otherwise the place that is jamming
  _marker() {
    const g = this.game, p = g.player.pos, T = this.train;
    this.markerPos = null;
    if (this.stage === 'victory' || this.stage === 'done') return;
    if (g.player.carrying) {
      let bx = S.trainDoors[0]; for (const x of S.trainDoors) if (Math.abs(x - p.x) < Math.abs(bx - p.x)) bx = x;
      this.markerPos = V(bx, 0, 698.6); return;
    }
    if (this.fallen.length) { let b = this.fallen[0]; for (const n of this.fallen) if (n.pos.distanceTo(p) < b.pos.distanceTo(p)) b = n; this.markerPos = b.pos; return; }
    if (this.injured && this.injured.tr) { this.markerPos = this.injured.pos; return; }
    if (this.section === 0 && this.tutorial && this.tutorial.tr) { this.markerPos = this.tutorial.pos; return; }
    if (this.section === 2 && (this.crewS === 'in' || this.crewS === 'smash' || this.crewS === 'fight')) {
      const n = g.crowd.nearest(p, (o) => this.crew.includes(o) && !o.arrested && (!o.neutralized || g.crowd.arrestable(p) === o));
      if (n) { this.markerPos = n.pos; return; }
    }
    if (this.gauge.value >= 50) {
      const z = this.worst;
      // a gate line still on tickets: the member of staff who can open it
      if (z.kind === 'gate') { const i = this.zones.indexOf(z) - 3; if (this.D.gates[i].mode === 'tickets') { this.markerPos = this.staff[i].pos; return; } }
      this.markerPos = V((z.x0 + z.x1) / 2, 0, (z.z0 + z.z1) / 2);
    }
    void T;
  }

  // ------------------------------------------------------------- callbacks
  onPeacefulStruck(n) {
    this.stats.peaceful++;
    this.addScore(-150, 'Excessive force');
    this.tension.onPeacefulStruck();
    this.game.hud.alert('EXCESSIVE FORCE — that traveller was no threat', 'bad', 3);
    this.game.audio.ui('bad');
  }

  // ------------------------------------------------------------- radio (as Level 3's)
  say(key, pri = 1, cooldown = Infinity) {
    const last = this.radioSaid[key];
    if (last !== undefined && this.t - last < cooldown) return false;
    this.radioSaid[key] = this.t;
    const [who, text] = LINES[key];
    const item = { key, who, text, pri, t: this.t };
    if (pri >= 2) { const i = this.radioQ.findIndex((q) => q.pri < 2); this.radioQ.splice(i < 0 ? this.radioQ.length : i, 0, item); } else this.radioQ.push(item);
    return true;
  }
  radio(text) { this.radioQ.push({ key: null, who: 'CONTROL', text, pri: 1, t: this.t }); }
  _radioUpdate(dt) {
    if (this.game.cinematic) return;
    this.radioGap -= dt;
    if (this.radioGap > 0 || !this.radioQ.length) return;
    const q = this.radioQ.shift();
    const dur = Math.min(6, 2.5 + q.text.length / 20);
    this.game.hud.alert(`📻 ${q.who}: ${q.text}`, 'radio', dur);
    this.game.audio.radio(q.pri >= 2, dur);
    this.radioLog.push({ t: +this.t.toFixed(2), key: q.key });
    this.radioGap = dur + 0.8;
  }

  // ------------------------------------------------------------- presentation
  _introCinematic() {
    const g = this.game;
    const front = () => V(0, 0, 632), fam = () => V(this.tutorial ? this.tutorial.pos.x : 0, 0, this.tutorial ? this.tutorial.pos.z : 620);
    g.playCinematic({
      id: 'lastTrainIntro', title: 'LAST TRAIN', sub: 'Gare de l\'Est · 03h10', titleAt: [0.4, 3.4],
      lines: [['CONTROL: "The Métro is shut. This is the only way home tonight."', 0.5, 2.8], ['CONTROL: "Nobody gets hurt in that station. That is the job."', 2.9, 5.2]],
      shots: [{ dur: 2.8, a: orbit(front, 30, 5.5, Math.PI + 0.35, 52, 5), b: orbit(front, 26, 4.2, Math.PI - 0.1, 50, 4.5) },
        { dur: 1.8, a: orbit(fam, 7.5, 2.0, Math.PI - 0.9, 44, 1.1), b: orbit(fam, 6.5, 1.8, Math.PI - 0.4, 44, 1.1) },
        { dur: 0.9, a: orbit(fam, 6.5, 1.8, Math.PI - 0.4, 44, 1.1), b: 'rig' }],
    });
  }

  complete() {
    if (this.ended) return;
    this.ended = true;
    this.stage = 'done';
    this.markerPos = null;
    this.ring.visible = false;
    const s = this.stats;
    this._beatDone(3, 1000, 'The last train is away');
    s.home = this.home;
    s.left = this.active.filter((n) => n.tr.s !== 'hurt').length;
    if (!s.trampled) this.addScore(800, 'Nobody trampled');
    if (s.peaceful === 0 && !s.downed) this.addScore(500, 'Proportionate force');
    this.game.endGame(true);
  }
  fail(reason) { this.stats.home = this.home; super.fail(reason); }

  // the dev bot (dev.js) plays with the normal controls: where to walk, and what to hold
  botGoal() {
    const a = this.tutorial;
    if (this.section === 0 && a && a.tr) return V(a.pos.x - 2.2, 0, a.pos.z - 0.6);
    return this.markerPos;
  }
  botInput(I) {
    const g = this.game, a = this.tutorial, p = g.player.pos;
    if (this.section !== 0 || !a || !a.tr || g.cinematic) return false;
    if (Math.hypot(a.pos.x - p.x, a.pos.z - p.z) > 5.5 || a.tr.s === 'toDoor') return false;
    // walk the family east past the pyre, then let them go in
    const tx = a.pos.x < 15 ? a.pos.x + 6 : 20, tz = a.pos.x < 15 ? 616 : 638;
    g.cameraRig.yaw = Math.atan2(-(tx - a.pos.x), -(tz - a.pos.z));
    I.keys.add('KeyF');
    if (Math.hypot(a.pos.x - p.x, a.pos.z - p.z) > 3) I.keys.add('KeyW');
    return true;
  }

  mapExtras(ctx, tr) {
    const D = this.D, T = this.train;
    const line = (x0, z0, x1, z1, col, w = 3) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(...tr(x0, z0)); ctx.lineTo(...tr(x1, z1)); ctx.stroke(); };
    for (const d of D.doors) line(d.x - S.doorHalf, S.doorZ, d.x + S.doorHalf, S.doorZ, d.open ? '#34d070' : '#ff4a3a');
    for (const g of D.gates) line(g.x - S.gateHalf, S.gateZ, g.x + S.gateHalf, S.gateZ, g.mode === 'open' ? '#34d070' : g.mode === 'closed' ? '#ff4a3a' : '#ffb02e');
    if (Math.abs(T.x) < 60) line(T.x - 30, 701, T.x + 30, 701, T.s === 'open' ? '#f3d9a4' : '#8a9099', 5);
    ctx.fillStyle = '#ffb02e';
    for (const n of [...this.fallen, ...this.active.filter((o) => o.tr.s === 'hurt')]) { const [x, y] = tr(n.pos.x, n.pos.z); ctx.fillRect(x - 3, y - 3, 6, 6); }
  }

  hudInfo() {
    const i = Math.min(this.section, L4_PHASES.length - 1), T = this.train, z = this.worst;
    const info = { label: 'BEAT', index: i, phaseName: L4_PHASES[i], text: '', status: 'active', chip: 'FLOW', detail: '', bar: null, completed: this.completed };
    if (this.stage === 'intro') return Object.assign(info, { text: 'Gare de l\'Est forecourt', chip: 'STANDBY', status: 'calm', detail: 'Radio traffic incoming…' });
    if (this.stage === 'victory' || this.stage === 'done') return Object.assign(info, { text: 'The last train is away', chip: 'DONE', status: 'done', detail: `${this.home} people home` });
    const tr = T.s === 'open' ? `doors open ${Math.max(0, Math.ceil(L4.train.open - T.t))}s` : T.s === 'in' ? 'train arriving' : T.s === 'away' && T.t < 0 ? `next train ${Math.ceil(-T.t)}s` : T.s === 'out' ? 'train leaving' : 'no train yet';
    const dens = `${z.name.replace(/^the /, '')} ${Math.round(z.v)}%`;
    const base = `Home ${this.home} · ${dens} · ${tr}`;
    info.bar = T.s === 'open' ? clamp(1 - T.t / L4.train.open, 0, 1) : null;
    const p = this.game.player;
    if (p.carrying) return Object.assign(info, { text: 'Walk them to an open train door', chip: 'CARRY', detail: base });
    if (this.fallen.length) return Object.assign(info, { text: 'Someone is down in the crowd — pull them clear', chip: 'DANGER', status: 'danger', detail: base });
    if (this.gauge.value >= L4.red) return Object.assign(info, { text: `Crush at ${z.name} — thin it out`, chip: 'CRUSH', status: 'danger', detail: `${base}${z.kind === 'gate' && this.D.gates[this.zones.indexOf(z) - 3].mode === 'tickets' ? ' · ask the staff to open it wide' : ''}` });
    if (i === 0) return Object.assign(info, { text: 'Send the family round the fire to the open entrance', chip: 'DIRECT', detail: 'Hold F to point and call · baton down' });
    if (i === 1) return Object.assign(info, { text: 'Keep the concourse moving and under the red line', detail: base });
    if (i === 2) {
      if (this.crewS === 'fight') return Object.assign(info, { text: 'The crew are fighting — every blow is seen', chip: 'ENGAGED', status: 'danger', detail: base });
      if (this.crewS === 'flee') return Object.assign(info, { text: 'The crew are running', detail: base });
      return Object.assign(info, { text: 'Deal with the crew at the kiosk without a stampede', chip: 'CREW', detail: `${base} · clear the queue from the kiosk first` });
    }
    const left = T.left === null ? '' : ` · ${T.left} ${T.left === 1 ? 'train' : 'trains'} left`;
    if (this.injured && this.injured.tr) return Object.assign(info, { text: 'A casualty cannot walk — carry them to the train', chip: 'ACTION', detail: base + left });
    return Object.assign(info, { text: 'Hold the platform edge and get the last people on', chip: T.left === 1 ? 'LAST' : 'FLOW', detail: base + left });
  }

  endInfo(win, reason) {
    const s = this.stats, fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    const crew = this.crewS === 'none' ? '—' : `${this.crew.filter((n) => n.arrested).length} arrested · ${s.crewFled} ran${s.kioskBurned ? ' · kiosk burnt' : ''}`;
    return {
      title: win ? 'LEVEL 4 COMPLETE' : 'MISSION FAILED',
      sub: win ? `${this.home} people on their way home from Gare de l'Est${s.trampled ? ` · ${s.trampled} hurt in the crush` : ' · nobody trampled'}` : reason || '',
      rows: [
        ['Beats completed', `${this.completed.filter(Boolean).length} / ${L4_PHASES.length}`],
        ['People home', this.home],
        ['People trampled', s.trampled, s.trampled > 0],
        ['Falls in the crowd · pulled clear', `${s.falls} · ${s.rescued}`],
        ['Density · peak', `${Math.round(s.peakDensity)}%`, s.peakDensity >= L4.red],
        ['Time over the red line', fmt(s.overRed), s.overRed > 20],
        ['Panic waves', s.stampedes, s.stampedes > 0],
        ['The crew', crew],
        ['Casualties carried to the train', s.carried],
        ['Travellers struck', s.peaceful, s.peaceful > 0],
        ['Calls with the baton raised', s.frightened, s.frightened > 0],
        ['Damage received', Math.round(s.damageTaken)],
        ['Mission time', fmt(this.t)],
      ],
      hook: win ? HOOK : '',
      rank: 'Restart to try again',
    };
  }
}

// ------------------------------------------------------------------ the level's own people
// Children: the shared generator's people at child height, a larger head for the proportions,
// bright coat, school bag. (There is no child body in the model set yet: review item B8.)
function childOutfit(rng) {
  const o = randomOutfit(rng);
  Object.assign(o, { height: 0.6 + rng() * 0.1, build: 0.92, mask: 'none', scarf: 'none', beard: false, hood: false, vest: false, smart: false, backpack: true, headscarf: undefined });
  o.hat = rng() < 0.4 ? 'beanie' : 'none'; o.hatColor = [0xd4202f, 0xf2c230, 0x2c6ef2, 0xeeeeee][Math.floor(rng() * 4)];
  if (o.base === 'rb_male_a') o.hat = 'none';
  o.garment = 'puffer'; o.shellPattern = 0; o.keepTop = false;
  o.shellColor = o.topColor = [0xc8102e, 0xf2c230, 0x2c6ef2, 0x16a34a, 0xe0601a, 0x7a3a9a, 0x2aa7a0][Math.floor(rng() * 7)];
  o.packColor = [0x2a3a5a, 0x6a1d1d, 0x3a4a3a, 0x1d1f22][Math.floor(rng() * 4)];
  o.body = { ...o.body, girth: 0.95, head: 1.24, shoulders: 0.93 };
  return o;
}
// Station staff: dark uniform under an orange hi-vis tabard, a cap where the body takes one.
function staffOutfit(rng) {
  const o = randomOutfit(rng);
  Object.assign(o, { top: 'jacket', smart: false, garment: 'shirt', shellColor: 0x1b2440, topColor: 0x1b2440, topBase: 0x1b2440, longSleeve: true, keepTop: false, keepBottom: false,
    vest: true, shellPattern: 7, pa: 0xf07a1a, pb: 0xd0d4d8, mask: 'none', scarf: 'none', hood: false, backpack: false, headscarf: undefined, pants: 0x1b2030, shoes: 0x151515, hatColor: 0x1b2440 });
  o.hat = o.gender === 'm' && o.base !== 'rb_male_a' ? 'cap' : 'none';
  return o;
}

export { stationArea };
