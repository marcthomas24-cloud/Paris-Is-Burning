// Level 6 · "Dawn".
// 05h10, Place de la République. A few hundred people are still round the monument: exhausted,
// some hurt, some angry, none armed. The order is to clear the square by 05h40. On the other side
// is the organiser who had the megaphone on the boulevard at 18h47.
//
//  Beat 1 THE WALK IN         no threats on the HUD. The officer crosses the square from the CRS
//                             line and every head turns. Shield down, baton still. A street medic
//                             calls him over: the new verb, talk (E with the baton down)
//  Beat 2 THREE CONVERSATIONS the medic wants a corridor through the line for the injured, the
//                             students want their arrested friend found, the organiser wants the
//                             line pulled back 20 m (which means arguing with the captain). Each
//                             request agreed lowers the tension and thins the crowd
//  Beat 3 THE PROVOCATION     one bottle from the back and the line surges. Stop your own side
//                             with direct (F) and the orders (1 halt, 2 fall back, 3 send one), and
//                             find the thrower without striking anyone near him
//  Beat 4 FIRST LIGHT         tension low: the organiser calls it and the square empties past the
//                             officer, some nodding, some not. Otherwise the line charges and the
//                             level becomes a rescue
//
// People first: there is no fight to win. The square remembers the night: the latest completed
// run of each of Levels 1-5 (Progress records[id].last) changes who trusts the officer, how tense
// the square starts and how hard the captain is to move. The crowd's people are the crowd's own
// (crowd.js npcs) under one script that seats them, wraps them up, turns their heads and walks
// them home; the medics, the students and the organiser are the level's own; the CRS line is the
// crowd's officers moved by this script. Shares the Missions interface with the other levels.
import * as THREE from 'three';
import { Missions } from './missions.js';
import { Tension } from './tension.js';
import { buildRepublique, REP, repArea, exitPoints, crossTexture, captainTexture } from './republique.js';
import { randomOutfit, clearItem, giveItem, newPose, lying } from './characters.js';
import { life, seated, hugSelf, leanOn, weary, treating, nod, supported, talk, hash } from './lifelike.js';
import { mulberry } from './textures.js';
import { quietly } from './world.js';
import { orbit } from './cinematic.js';
import { Dialogue } from './dialogue.js';
import { Progress, mixLighting } from './levels.js';

export const L6_PHASES = ['THE WALK IN', 'THREE CONVERSATIONS', 'THE PROVOCATION', 'FIRST LIGHT'];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const R = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const M = REP.monument;
const LINE_X = [-19.6, -16.6, -13.6, -10.6, -7.6, -4.6, -1.6, 1.6, 4.6, 7.6, 10.6, 13.6, 16.6, 19.6]; // the line's places, a gap in the middle
const GROUP = (x) => (x < -6 ? 0 : x > 6 ? 2 : 1);                    // left, centre, right
const FACE_N = Math.PI;                                               // heading that looks north, at the monument
const HOOK = 'Control: "Place de la République is clear. All units, stand down. It is morning."';
const WHO = { MEDIC: '#ff8a80', STUDENT: '#ffd36b', ORGANISER: '#ffb02e', CAPITAINE: '#8fb4ff', YOU: '#9fd0ff' };

// where the crowd stands before the level places it (the title screen behind the menu)
export const L6_CROWD = {
  gatherPoints: [V(-12, 0, -1000), V(12, 0, -1004), V(-10, 0, -1022), V(10, 0, -1024), V(0, 0, -996), V(-20, 0, -1012), V(20, 0, -1012), V(0, 0, -1028)],
  marchPaths: [],
  noCrews: true,
  bystanderZ: -1,
  focus: { lineZ: 1e9, frontZ: -982, behindZ: -982 },
};
// the rest of the city is out of sight: nothing the scheduler does lands on the square
export const L6_EVENTS = {
  zones: [{ name: 'Oberkampf', crowd: V(-80, 0, -1120), police: V(-70, 0, -1110) }, { name: 'Magenta', crowd: V(90, 0, -1130), police: V(80, 0, -1115) }],
  hazardZ: [1e9, 1e9], carFireZ: [1e9, 1e9],
  gas: { fromZ: 0, toZ: [0, 0], minPlayerZ: 1e9 },
};

// ------------------------------------------------------------------ tuning
export const L6 = {
  span: 780,                       // seconds of play from 05h10 to 05h40 (the beats' limits add up to it)
  people: 140,                     // the crowd still on the square
  walk: { maxT: 120, call: -990 }, // the medic calls once the officer is past this line (or after 25 s)
  talk: { r: 2.8, still: 2.0 },    // reach for a conversation; seconds since a swing before anyone will talk
  talks: { maxT: 360 },
  prov: { maxT: 180, every: [24, 32], bottles: 3, cone: 0.86, see: 16, close: 6, take: 1.0, slip: 5, slipSpeed: 2.2 },
  surge: { walk: 1.35, contact: 1.45, voice: 20, direct: 8, back: 2.2 },
  light: { maxT: 120, calm: 35 },
  charge: { run: 3.0, flee: 3.6, trip: 0.18, help: 1.0 },
  t: { start: 40, agree: -11, refuse: 6, later: 2, shield: 1.4, swing: 5, blow: 16, line: 12, bottle: 4, surge: 3, escape: 6, threat: 5, sent: 4, call: 100 },
  thin: { medic: 6, students: 12, organiser: 16 },
};

const LINES = {
  start: ['CONTROL', 'Place de la République. A few hundred still round the monument. None of them armed. The order is to clear it by 05h40.'],
  walk: ['CONTROL', 'Walk in. Shield down, baton still. They are watching you.'],
  shield: ['CONTROL', 'Your shield is up. From where they sit, that is a charge coming.'],
  medic: ['CONTROL', 'A street medic is waving at you. Go and talk: E, with the baton down.'],
  talks: ['CONTROL', 'Three people speak for that square: the medic, the students and the organiser. Hear what they want.'],
  captain: ['CAPITAINE', 'Twenty past five. We go at 05h40, with them or without them.'],
  captain2: ['CAPITAINE', 'Five more minutes and I am taking this square.'],
  corridor: ['CONTROL', 'Corridor open on the west end of the line. SAMU is waiting on Boulevard du Temple.'],
  checking: ['CONTROL', 'Checking the name. Stand by.'],
  found: ['CONTROL', 'Benali, Yanis. In custody at the commissariat of the 10th. No charge yet. Out by noon if there is nothing on him.'],
  back: ['CAPITAINE', 'Line! Twenty metres back. Walk it.'],
  bottle: ['CAPITAINE', 'Bottle! Line, forward!'],
  stop: ['CONTROL', 'Your line is moving on the square. Stop them: F to call them back, 1 to halt one, 2 to fall back (hold it for everyone in earshot).'],
  find: ['CONTROL', 'The bottle came from the back. One man. Find him without touching anyone near him. 3 sends an officer where you look.'],
  pointed: ['STUDENT', 'Him! Grey top, at the back, by the trees. He is not with us.'],
  pointedO: ['ORGANISER', 'That one is not ours. North side. Take him, not us.'],
  taken: ['CONTROL', 'Thrower in custody. Nobody else touched. Well done.'],
  slipped: ['CONTROL', 'He is gone up Boulevard de Magenta. Let him go.'],
  call: ['ORGANISER', 'It is over! We have been heard. We go home now, together. Get up. Help each other.'],
  calm: ['CONTROL', 'They are leaving. Let them pass. Nobody touches anyone.'],
  charge: ['CAPITAINE', 'That is enough. Line, CHARGE!'],
  rescue: ['CONTROL', 'The line has charged. Get people out: E beside anyone down, F to send them clear.'],
  done: ['CONTROL', 'The square is empty. Stand down.'],
};

// the square's memory: the latest completed run of each earlier level (decision 3 of the brief)
export function squareMemory() {
  const last = (i) => { const r = Progress.record(i); return r && r.last ? r.last : null; };
  const m = { notes: [], tension: 0, cold: 0, warm: 0, organiser: 'none', students: false, medic: false, captain: false, played: 0 };
  const l1 = last(1), l2 = last(2), l3 = last(3), l4 = last(4), l5 = last(5);
  for (const r of [l1, l2, l3, l4, l5]) if (r) m.played++;
  if (l1) {
    if (l1.peaceful > 0) { m.organiser = 'struck'; m.tension += 6; m.cold += 0.08; m.notes.push('Boulevard de la République, 18h47: people who were marching were struck'); }
    else { m.organiser = 'clean'; m.tension -= 4; m.warm += 0.06; m.notes.push('Boulevard de la République, 18h47: the line held without striking the march'); }
  }
  if (l2 && l2.peaceful > 0) { m.tension += 5; m.cold += 0.06; m.notes.push('The boulevard at 01h12: people who were no threat were struck'); }
  if (l3) {
    if (l3.peaceful > 0) { m.students = true; m.tension += 5; m.cold += 0.06; m.notes.push('Château-d\'Eau at 02h20: people who were doing nothing were struck'); }
  }
  if (l4) {
    if (l4.trampled > 0) { m.medic = true; m.tension += 4; m.cold += 0.05; m.notes.push('Gare de l\'Est at 03h10: people were trampled in the hall'); }
    if (l4.home >= 200) { m.tension -= 6; m.warm += 0.08; m.notes.push('Gare de l\'Est at 03h10: hundreds got the last trains home'); }
  }
  if (l5 && l5.squad < 3) { m.captain = true; m.notes.push('The canal at 04h05: officers went down'); }
  return m;
}

// The square's tension: nothing drains it but what happens on the square.
class DawnTension extends Tension {
  update() {}
  onPeacefulStruck() { this.lastPeaceful = this.game.missions.t; }
  onDownedStruck() {}
  onArrest() {}
  onThreatNeutralized() {}
}

export class Level6 extends Missions {
  constructor(game) {
    super(game);
    const w = game.world, c = game.crowd;
    if (!w.hasDistrict('l6')) w.registerDistrict('l6', buildRepublique(w, game.scene, game.renderer, game.camera));
    this.D = w.districts.l6;
    this.SQ = { active: false, tick: (n, p, dt) => this._sqTick(n, dt), move: (n) => this._sqMove(n), pose: (n, P, dt, t) => this._sqPose(n, P, dt, t), onHit: (n) => this._sqHit(n) };
    this.CAST = { active: false, tick: (n, p, dt) => this._castTick(n, dt), move: (n) => this._castMove(n), pose: (n, P, dt, t) => this._castPose(n, P, dt, t) };
    this.PROV = { active: false, marked: false, amber: false, tick: (n, p, dt) => this._sqTick(n, dt), move: (n) => this._sqMove(n), pose: (n, P, dt, t) => this._sqPose(n, P, dt, t), onHit: (n) => this._sqHit(n) };
    quietly(() => {
      if (!c.l6cast) {
        const rng = mulberry(6606);
        c.l6cast = {
          organiser: c.spawnSpecial(organiserOutfit(rng)),
          medics: [0, 1, 2].map(() => c.spawnSpecial(medicOutfit(rng))),
          students: [0, 1, 2, 3].map(() => c.spawnSpecial(studentOutfit(rng))),
        };
        const cross = new THREE.MeshBasicMaterial({ map: crossTexture(), color: 0xc8c8c4 });
        for (const n of c.l6cast.medics) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), cross); pl.position.set(0, 0.18, -0.25); pl.rotation.y = Math.PI; if (n.rig.spine) n.rig.spine.add(pl); }
      }
      Object.assign(this, c.l6cast);
      this.cast = [this.organiser, ...this.medics, ...this.students];
      // the line: fourteen of the crowd's officers, and one more without a shield who commands it
      const cops = c.police.slice();
      this.crs = cops.slice(0, LINE_X.length).map((p, i) => ({ p, i, orig: { pos: p.pos.clone(), heading: p.heading, role: p.role } }));
      const cap = cops[LINE_X.length];
      this.captain = { p: cap, orig: { pos: cap.pos.clone(), heading: cap.heading, role: cap.role } };
      this.capPatch = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: captainTexture(), color: 0xb4b8bc }));
      this.capPatch.position.set(0, 0.16, -0.26); this.capPatch.rotation.y = Math.PI;
      this.spare = cops.slice(LINE_X.length + 1);
      // speech marks over whoever has something to say, and the reach of a call (as Level 4's)
      const mk = new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.9, depthWrite: false, fog: false });
      this.marks = [0, 1, 2, 3].map(() => { const g = new THREE.Group(); const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), mk); d.scale.y = 1.4; g.add(d); g.visible = false; game.scene.add(g); return g; });
      const ring = new THREE.Mesh(new THREE.RingGeometry(L6.surge.direct - 0.12, L6.surge.direct, 72), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.renderOrder = 2; ring.visible = false;
      this.ring = ring; game.scene.add(ring);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      beam.position.y = 2.5; this.sendMark = new THREE.Group(); this.sendMark.add(beam); this.sendMark.visible = false;
      game.scene.add(this.sendMark);
    });
    this.dialogue = new Dialogue(game, WHO);
    this._v = V(0, 0, 0);
    this.built = true;
    this.reset();
  }

  dispose() {
    const g = this.game, c = g.crowd;
    if (this.dialogue.open) this.dialogue.close(true);
    this.talking = false; g.faceFill = null;
    for (const m of this.marks) g.scene.remove(m);
    g.scene.remove(this.ring); g.scene.remove(this.sendMark);
    if (this.capPatch.parent) this.capPatch.parent.remove(this.capPatch);
    for (const o of [...this.crs, this.captain]) {
      const p = o.p;
      p.pos.copy(o.orig.pos); p.heading = o.orig.heading; p.role = o.orig.role;
      if (p.home) p.home.copy(p.pos);
      p.lx = p.pos.x; p.lz = p.pos.z;
      p.pose = null; p.face = undefined; p.effort = 0; p.atk = null; p.l6 = false;
      if (p.rig.shield) p.rig.shield.visible = true;
    }
    for (const p of this.spare) { p.off = false; p.rig.root.visible = true; }
    for (const n of this.cast) { clearItem(n.rig); c.retire(n); n.cs = null; }
    for (const n of c.npcs) { if (n.sq) { n.sq = null; if (n.script === this.SQ || n.script === this.PROV) n.script = null; } n.farDy = 0; }
    super.dispose();
  }

  reset() {
    if (!(this.tension instanceof DawnTension)) this.tension = new DawnTension(this.game);
    super.reset();
    this.completed = L6_PHASES.map(() => false);
    this.phaseTimes = L6_PHASES.map(() => 0);
    this.section = 0; this.cp = null;
    Object.assign(this.stats, { agreed: 0, refused: 0, blows: 0, playerBlows: 0, lineBlows: 0, bottleHits: 0, cleared: 0, left: 0, injuredOut: 0, surged: 0, recalled: 0, bottles: 0, thrower: 'none', helped: 0, fallen: 0, charge: 0, talks: 0, shieldT: 0, nodded: 0, people: 0 });
    this.radioQ = []; this.radioGap = 0; this.radioSaid = {}; this.radioLog = [];
    this.promptE = false; this.busy = null; this.talking = false; this.musicTier = 0;
    if (!this.built) return; // first call, from the Missions constructor
    const g = this.game;
    if (this.dialogue.open) this.dialogue.close(true);
    g.faceFill = null;
    this.mem = squareMemory();
    this.tension.value = clamp(L6.t.start + this.mem.tension, 15, 70); this.tension.peak = this.tension.value;
    this.req = { medic: null, students: null, organiser: null, captain: null };
    this.lineZ = REP.line.z; this.lineBack = false;
    this.corr = { s: 'none', t: 0, list: [] };
    this.studentsT = -1;
    this.prov = null; this.provS = 'none'; this.bottleT = 1e9; this.provSeenT = 0;
    this.watch = false; this.medicCalled = false; this.shieldWarn = 0; this.swingT = 0; this.threatT = 0;
    this.outcome = null; this.lightT = 0; this.callT = -1;
    this.followHeld = 0; this.followAll = false; this.sendT = 0; this.botT = 0; this.lightAcc = 1;
    this.capT = 0; this.capSaid = 0;
    this._setLight(0);
    this._placeLine();
    this._populate();
  }

  // ------------------------------------------------------------- light and the clock
  clockMin() { return 5 * 60 + 10 + Math.min(30, (this.t / L6.span) * 30); }
  clock() { const m = Math.floor(this.clockMin()); return `${String(Math.floor(m / 60)).padStart(2, '0')}h${String(m % 60).padStart(2, '0')}`; }
  _setLight(k) { this.lightK = k; this.game.applyLighting(mixLighting('dawn0', 'dawn', k)); }

  // ------------------------------------------------------------- the line
  _placeLine() {
    for (const o of this.crs) {
      const p = o.p;
      p.role = 'line'; p.l6 = true; p.atk = null; p.cool = 0; p.flinch = 0; p.off = false; p.rig.root.visible = true;
      if (p.rig.shield) p.rig.shield.visible = true;
      Object.assign(o, { s: 'line', t: 0, ack: 0, hx: 0, hz: -1, moved: 0, tgt: null, imp: hash(o.i, 3) });
      p.pos.set(LINE_X[o.i], 0, this.lineZ); p.heading = FACE_N; p.face = FACE_N;
      (p.home || (p.home = p.pos.clone())).copy(p.pos); p.lx = p.pos.x; p.lz = p.pos.z;
      p.pose = (P, dt, t) => this._copPose(o, P, t);
    }
    const C = this.captain, p = C.p;
    p.role = 'squad'; p.l6 = true; p.atk = null; p.off = false; p.rig.root.visible = true;
    if (p.rig.shield) p.rig.shield.visible = false;
    if (p.rig.spine && this.capPatch.parent !== p.rig.spine) p.rig.spine.add(this.capPatch);
    p.pos.set(0, 0, this.lineZ + 4.5); p.heading = FACE_N; p.face = FACE_N;
    (p.home || (p.home = p.pos.clone())).copy(p.pos); p.lx = p.pos.x; p.lz = p.pos.z;
    Object.assign(C, { s: 'pace', t: 0, speak: 0, moved: 0 });
    p.pose = (P, dt, t) => this._capPose(P, t);
    for (const q of this.spare) { q.off = true; q.rig.root.visible = false; }
  }
  _slot(o) {
    let x = LINE_X[o.i];
    // the corridor: the two places either side of x -12 step aside while the injured pass
    if (this.corr.s === 'open' && Math.abs(x + 12) < 2.6) x = x < -12 ? -15.0 : -9.0;
    return [x, this.lineZ];
  }
  _surging() { return this.crs.filter((o) => o.s === 'surge' || o.s === 'charge'); }
  _offLine() { return this.crs.filter((o) => o.s !== 'line' && o.s !== 'aside'); }

  // one step towards (tx, tz), round whatever stands in the way. True on arrival.
  _step(p, tx, tz, speed, dt, stop = 0.3) {
    const w = this.game.world, dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
    if (d <= stop) return true;
    let ux = dx / d, uz = dz / d;
    if (w.blocked(p.pos.x + ux * 1.1, p.pos.z + uz * 1.1, 0.32)) {
      for (const a of [0.7, -0.7, 1.4, -1.4, 2.1, -2.1]) {
        const c = Math.cos(a), s = Math.sin(a), rx = ux * c - uz * s, rz = ux * s + uz * c;
        if (!w.blocked(p.pos.x + rx * 1.1, p.pos.z + rz * 1.1, 0.32)) { ux = rx; uz = rz; break; }
      }
    }
    const st = Math.min(speed * dt, d - stop + 0.02);
    p.pos.x += ux * st; p.pos.z += uz * st;
    w.resolveCircle(p.pos, 0.36);
    return false;
  }

  _lineUpdate(dt) {
    const g = this.game, c = g.crowd;
    for (const o of this.crs) {
      const p = o.p;
      o.t += dt; o.ack = Math.max(0, o.ack - dt);
      if (p.atk) { p.home.copy(p.pos); continue; } // mid-swing: the crowd's officer code has him
      const [sx, sz] = this._slot(o);
      let face = FACE_N;
      if (o.s === 'line' || o.s === 'aside') this._step(p, sx, sz, 1.4, dt, 0.08);
      else if (o.s === 'back') { if (this._step(p, sx, sz, L6.surge.back, dt, 0.15)) o.s = 'line'; }
      else if (o.s === 'surge') this._step(p, sx, o.tz, L6.surge.walk, dt, 0.2);
      else if (o.s === 'charge') this._step(p, sx * 0.8, -1030, L6.charge.run, dt, 0.5);
      else if (o.s === 'clear') this._step(p, o.cx, o.cz, 1.5, dt, 0.2);
      else if (o.s === 'send') {
        const n = o.tgt;
        if (!n || n.state === 'gone' || n.arrested) { o.s = 'back'; o.tgt = null; this.sendMark.visible = false; }
        else {
          face = Math.atan2(n.pos.x - p.pos.x, n.pos.z - p.pos.z);
          if (this._step(p, n.pos.x, n.pos.z, 2.6, dt, 1.1)) this._quietArrest(n, o);
        }
      } else if (o.s === 'post') { if (this._step(p, o.px, o.pz, 2.4, dt, 0.3) && o.t > 8) o.s = 'back'; }
      // contact: an officer moving on the square strikes whoever is in front of him
      if ((o.s === 'surge' || o.s === 'charge') && p.cool <= 0) {
        for (const n of c.query(p.pos.x, p.pos.z, L6.surge.contact, [])) {
          if (!n.sq || n.sq.s === 'gone' || n.state === 'gone' || n.state === 'stagger' || n.state === 'down' || n.arrested) continue;
          if (dist(n.pos.x, n.pos.z, p.pos.x, p.pos.z) > L6.surge.contact) continue;
          p.atk = { phase: 'wind', t: 0, target: n }; n.sq.lineHit = this.t;
          break;
        }
      }
      p.home.copy(p.pos); // the crowd's officer code never walks him back to an old post
      p.face = face;
    }
    // the captain paces behind the line and turns to whoever he argues with
    const C = this.captain, p = C.p;
    C.t += dt; C.speak = Math.max(0, C.speak - dt);
    const px = Math.sin(C.t * 0.18) * 3.2, pz = this.lineZ + 4.5;
    if (this.outcome === 'charge') this._step(p, 0, -1000, 1.6, dt, 1);
    else if (!(this.talkWith && this.talkWith.key === 'captain') && this.req.organiser !== 'pending') this._step(p, px, pz, 0.9, dt, 0.1);
    else this._step(p, p.pos.x, pz, 0.9, dt, 0.1); // (stands still for the argument)
    p.home.copy(p.pos);
    const pl = g.player.pos;
    p.face = this.talkWith && this.talkWith.key === 'captain' ? Math.atan2(pl.x - p.pos.x, pl.z - p.pos.z) : FACE_N;
    // people the line comes near get up and back off
    for (const o of this._surging()) {
      for (const n of c.query(o.p.pos.x, o.p.pos.z, 5.5, [])) if (n.sq && (n.sq.s === 'stay') && !n.sq.injured) this._backOff(n, o.p.pos);
    }
  }

  _surge(group) {
    const g = this.game, list = this.crs.filter((o) => (o.s === 'line' || o.s === 'back') && (group === 'all' || GROUP(LINE_X[o.i]) === group));
    for (const o of list) { o.s = 'surge'; o.t = 0; o.tz = -1004 + R(-2, 2); this.stats.surged++; }
    if (list.length) { this.tension.add(L6.t.surge, 'line surge'); g.hud.alert('The line is moving onto the square', 'bad', 2.6, 'surge'); g.audio.ui('alert'); }
  }
  // stop an officer: halt where he is, or walk him back into the line
  _recall(o, back, ackText = null) {
    if (o.s !== 'surge' && o.s !== 'held' && o.s !== 'charge' && o.s !== 'post') return false;
    const was = o.s;
    o.s = back ? 'back' : 'held'; o.ack = 0.9;
    if (was === 'surge' || was === 'charge') { this.stats.recalled++; this.addScore(60, back ? 'Officer back in line' : 'Officer halted'); }
    if (ackText) this.game.hud.alert(`CRS: "${ackText}"`, 'info', 1.6, 'ack');
    return true;
  }

  // crowd.js asks this for every officer it draws: the level's layer over the standing pose
  _copPose(o, P, t) {
    const p = o.p;
    if (o.ack > 0) { const k = Math.min(1, o.ack / 0.25); P.shRX += (-2.7 - P.shRX) * k; P.elR += (-0.5 - P.elR) * k; P.shRZ = -0.15 * k; return; }
    if (p.atk) return;
    if (o.s === 'line' && this.outcome !== 'peace') {
      // impatient: the baton tapping the shield, the weight forward. Worse as 05h40 comes
      const imp = clamp(0.3 + this.t / 500 + (this.section >= 2 ? 0.4 : 0), 0, 1);
      const tap = Math.max(0, Math.sin(t * (5.5 + o.imp * 2) + o.imp * 9)) * imp;
      if (Math.sin(t * 0.37 + o.imp * 20) > -0.2) { P.shRX = -0.95; P.shRZ = 0.32; P.elR = -1.05 - tap * 0.45; }
      P.spX += 0.08 * imp; P.y -= 0.01 * imp;
    } else if (o.s === 'surge' || o.s === 'charge') { P.shRX = -1.6; P.elR = -1.2; P.spX += 0.15; }
  }
  _capPose(P, t) {
    const C = this.captain;
    if (C.speak > 0 || (this.talkWith && this.talkWith.key === 'captain' && this.dialogue.speaker === 'CAPITAINE')) { talk(P, life(C.p.rig, 977), t, 1); P.mouth = 0.4 + Math.abs(Math.sin(t * 11)) * 0.4; P.brow = 0.6; return; }
    // hands on hips
    P.shLX = -0.2; P.shLZ = 0.5; P.elL = -1.6; P.shRX = -0.2; P.shRZ = -0.5; P.elR = -1.6;
  }

  // ------------------------------------------------------------- the cast
  _populate() {
    const g = this.game, c = g.crowd, w = g.world;
    this.pool = []; this.people = [];
    for (const n of c.npcs) {
      if (n.special || n.kind) continue;
      clearItem(n.rig); c.retire(n);
      n.sq = null; n.farDy = 0; n.march = null;
      this.pool.push(n);
    }
    for (const n of this.cast) { clearItem(n.rig); c.retire(n); n.cs = null; }
    const rng = mulberry(6611); // the layout is the same every run; behaviour draws from Math.random
    const Rg = (a, b) => a + rng() * (b - a);
    const free = (x, z, r = 0.45) => !w.blocked(x, z, r) && !this.people.some((n) => dist(n.sq.at[0], n.sq.at[1], x, z) < 0.72) && Math.abs(x) < REP.bounds.maxX - 1 && z > REP.bounds.minZ + 1;
    const put = (x, z, heading, kind, extra = {}) => {
      if (this.people.length >= L6.people || !free(x, z, kind === 'step' ? 0.3 : 0.45)) return null;
      const n = this.pool.pop(); if (!n) return null;
      const sq = { kind, s: 'stay', at: [x, z], face: heading, k: kind === 'stand' ? 0 : 1, h: kind === 'step' ? 0.24 : 0, lean: 0, hug: 0, mood: 0, notice: 0, nodT: 0, nodded: false, injured: false, ...extra };
      n.sq = sq; n.script = this.SQ;
      n.pos.set(x, 0, z); n.anchor.copy(n.pos); n.target.copy(n.pos); n.vel.set(0, 0, 0); n.knock.set(0, 0, 0);
      n.heading = heading; n.focus.set(x + Math.sin(heading) * 10, 0, z + Math.cos(heading) * 10);
      n.temperament = 'scripted'; n.attackStyle = null; n.untargetable = false; n.neutralized = false; n.arrested = false; n.surrendered = false;
      n.hp = 2; n.hitCount = 0; n.copHits = 0; n.fear = 0; n.stimuli.length = 0; n.surge = null; n.role = 'watch'; n.speedMul = 0.95 + rng() * 0.1;
      n.rig.root.visible = true; n.rig.pose = newPose(); n.lookT = 0;
      n.farDy = kind === 'lie' ? -2 : kind === 'stand' ? 0 : kind === 'step' ? -0.62 : -0.8;
      c.setState(n, 'act', 1e9);
      this.people.push(n);
      return n;
    };
    // the hurt, on foil blankets at the medics' post
    const [mx, mz] = REP.medics;
    this.injured = [];
    for (const [dx, dz, hd] of [[-1.6, -1.8, 1.2], [1.0, -2.2, -0.4], [-2.0, 1.0, 2.0], [0.6, 1.6, -2.4], [2.4, 0.2, 0.6]]) {
      const n = put(mx + dx, mz + dz, hd, dz > 0 ? 'ground' : 'lie', { injured: true });
      if (n) this.injured.push(n);
    }
    // on the monument's outer step, facing out, a gap in front of the lion for the organiser
    const N1 = 44;
    for (let k = 0; k < N1; k++) {
      const a = (k / N1) * Math.PI * 2 + Rg(-0.03, 0.03);
      if (Math.abs(wrap(a)) < 0.22) continue;
      const r = M.col + 1.1, n = put(M.x + Math.sin(a) * r, M.z + Math.cos(a) * r, a, 'step', { lean: rng() < 0.3 ? (rng() < 0.5 ? 1 : -1) : 0, hug: rng() < 0.35 ? 1 : 0 });
      if (n && rng() < 0.12) { giveItem(n.rig, 'frflag', rng); n.sq.flag = true; }
    }
    // huddles on the paving: two to four together, facing in
    for (let h = 0; h < 14; h++) {
      const a = Rg(0, Math.PI * 2), r = Rg(11, 19), cx = M.x + Math.sin(a) * r, cz = M.z + Math.cos(a) * r * 0.9;
      if (cz > -996) continue; // nobody sits between the monument and the line
      const m = 2 + Math.floor(rng() * 3);
      for (let j = 0; j < m; j++) { const b = (j / m) * Math.PI * 2 + Rg(-0.2, 0.2); put(cx + Math.sin(b) * 0.75, cz + Math.cos(b) * 0.75, b + Math.PI, 'ground', { lean: j === 1 ? 1 : 0, hug: rng() < 0.5 ? 1 : 0 }); }
    }
    // the front: standing people facing the line, flags, arms folded
    for (let k = 0; k < 22; k++) {
      const x = Rg(-17, 17), z = Rg(-1000, -995);
      const n = put(x, z, Rg(-0.25, 0.25), 'stand', { hug: rng() < 0.5 ? 1 : 0 });
      if (n && rng() < 0.3) { giveItem(n.rig, rng() < 0.6 ? 'frflag' : 'flag', rng); n.sq.flag = true; }
    }
    // standing groups everywhere else, and a few filming
    for (let h = 0; h < 18 && this.people.length < L6.people - 6; h++) {
      const x = Rg(-34, 34), z = Rg(-1033, -1000), m = 2 + Math.floor(rng() * 4);
      if (dist(x, z, M.x, M.z) < M.col + 3) continue;
      for (let j = 0; j < m; j++) {
        const b = (j / m) * Math.PI * 2;
        const n = put(x + Math.sin(b) * 0.85, z + Math.cos(b) * 0.85, b + Math.PI, 'stand', { hug: rng() < 0.4 ? 1 : 0 });
        if (n && rng() < 0.12) { giveItem(n.rig, 'phone', rng); n.role = 'film'; }
      }
    }
    this.stats.people = this.people.length;
    // the thrower: someone at the back like anyone else (appearance says nothing)
    const back = this.people.filter((n) => n.sq.kind === 'stand' && n.sq.at[1] < -1018 && Math.abs(n.sq.at[0]) < 20 && !n.sq.flag && n.role !== 'film');
    this.prov = back[Math.floor(rng() * back.length)] || null;
    if (this.prov) { this.prov.script = this.PROV; this.prov.sq.prov = true; }
    this.PROV.active = false; this.PROV.marked = false; this.PROV.amber = false;
    this.sentinel = this.people[0];
    // the level's own people
    const place = (n, x, z, heading, cs) => {
      n.pos.set(x, 0, z); n.anchor.copy(n.pos); n.target.copy(n.pos); n.vel.set(0, 0, 0); n.knock.set(0, 0, 0);
      n.heading = heading; n.temperament = 'scripted'; n.script = this.CAST; n.untargetable = true; n.neutralized = false; n.arrested = false;
      n.fear = 0; n.stimuli.length = 0; n.role = 'watch'; n.lookT = 0; n.rig.root.visible = true; n.rig.pose = newPose(); n.farDy = 0;
      n.cs = { at: [x, z], face: heading, s: 'stand', t: 0, nod: 0, ...cs };
      c.setState(n, 'act', 1e9);
    };
    place(this.organiser, M.x + 0.6, M.z + M.col + 1.6, 0.15, { role: 'organiser' });
    giveItem(this.organiser.rig, 'megaphone');
    this.medics.forEach((n, i) => { const t = this.injured[i] || this.injured[0]; const a = (i * 2.1) + 0.5; place(n, t ? t.pos.x + Math.sin(a) * 0.9 : mx, t ? t.pos.z + Math.cos(a) * 0.9 : mz, a + Math.PI, { role: 'medic', i, s: 'kneel', pt: t }); });
    const [sx, sz] = REP.students;
    this.students.forEach((n, i) => { const a = (i / 4) * Math.PI * 2 + 0.4; place(n, sx + Math.sin(a) * 1.0, sz + Math.cos(a) * 1.0, a + Math.PI, { role: 'student', i }); if (i === 2) giveItem(n.rig, 'placard'); });
    // who can be talked to
    this.talkers = [
      { key: 'medic', n: this.medics[0], name: 'the street medic', who: 'MEDIC' },
      { key: 'students', n: this.students[0], name: 'the students', who: 'STUDENT' },
      { key: 'organiser', n: this.organiser, name: 'the organiser', who: 'ORGANISER' },
      { key: 'captain', p: this.captain.p, name: 'the captain', who: 'CAPITAINE' },
    ];
    this.talkWith = null;
  }
  // the crowd was reset under us (a level switch resets it after the script is built)
  _ensure() {
    for (const p of this.spare) if (!p.off) { p.off = true; p.rig.root.visible = false; }
    const s = this.sentinel;
    if (s && s.sq && (s.state !== 'gone' || s.sq.s === 'gone')) return;
    const stage = this.stage, t = this.t, stageT = this.stageT;
    this.reset(); this.stage = stage; this.t = t; this.stageT = stageT;
  }

  // ------------------------------------------------------------- the people on the square
  _left() { return this.people.filter((n) => n.sq && n.sq.s !== 'gone'); }
  _exitFor(n, south) {
    let best = null, bd = 1e9;
    for (const e of REP.exits) {
      if (!south && e.side === 's') continue;
      const [x, z] = exitPoints(e)[0];
      // (away from a charging line: north and the sides)
      const d = dist(n.pos.x, n.pos.z, x, z) + (this.outcome === 'charge' && e.side === 's' ? 999 : 0);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  // get up and go home by the nearest street (south: also past the officer, through the line)
  _leave(n, delay = 0, south = false, via = null) {
    const sq = n.sq;
    if (!sq || sq.s === 'gone' || sq.s === 'leave' || sq.s === 'rise') return;
    const e = this._exitFor(n, south);
    sq.s = 'rise'; sq.t = -delay; sq.exit = e;
    sq.wp = [...(via ? [via] : []), ...exitPoints(e)];
    sq.wi = 0;
  }
  _backOff(n, from) {
    const sq = n.sq;
    if (sq.s !== 'stay') return;
    const dx = n.pos.x - from.x, dz = n.pos.z - from.z, d = Math.hypot(dx, dz) || 1;
    sq.s = 'rise'; sq.t = 0; sq.backTo = [n.pos.x + (dx / d) * 4, n.pos.z + (dz / d) * 4 - 1.5]; sq.wp = null;
  }
  _thin(count, near = null) {
    const list = this._left().filter((n) => n.sq.s === 'stay' && !n.sq.injured && !n.sq.prov && !n.sq.helper);
    if (near) list.sort((a, b) => dist(a.pos.x, a.pos.z, near[0], near[1]) - dist(b.pos.x, b.pos.z, near[0], near[1]));
    else list.sort(() => Math.random() - 0.5);
    list.slice(0, count).forEach((n, i) => this._leave(n, i * R(0.4, 1.1)));
  }

  _sqTick(n, dt) {
    const g = this.game, c = g.crowd, sq = n.sq;
    if (!sq) return;
    n.stimuli.length = 0; n.fear = 0;
    const st = n.state;
    if (st === 'arrested' || st === 'gone') return;
    sq.t = (sq.t || 0) + dt;
    sq.nodT = Math.max(0, sq.nodT - dt);
    if (st === 'stagger' || st === 'down' || st === 'recover') {
      // struck: a blow by the line counts once, and they do not sit back down
      if (st === 'stagger' && !sq.hitSeen) { sq.hitSeen = true; if (sq.lineHit && this.t - sq.lineHit < 2 && !(sq.byPlayer && this.t - sq.byPlayer < 1)) this._lineBlow(n); }
      sq.k = 0;
      return;
    }
    sq.hitSeen = false;
    if (sq.s === 'stay' || sq.s === 'fallen' || sq.s === 'lead') { if (st !== 'act') c.setState(n, 'act', 1e9); }
    else if (st !== 'walk') { c.setState(n, 'walk'); n.dur = 1e9; }
    if (sq.s === 'repos') {
      // (the thrower, after a throw) somewhere else at the back, standing like anyone else
      if (dist(n.pos.x, n.pos.z, sq.repos[0], sq.repos[1]) < 1.2) { sq.s = 'stay'; sq.at = [n.pos.x, n.pos.z]; sq.kind = 'stand'; sq.repos = null; c.setState(n, 'act', 1e9); }
    } else if (sq.s === 'rise') {
      if (sq.t > 0) sq.k = Math.max(0, sq.k - dt * 1.4);
      if (sq.t > 0 && sq.k <= 0) { sq.s = sq.backTo ? 'shift' : sq.wp ? 'leave' : 'stay'; sq.kind = 'stand'; n.farDy = 0; if (sq.s !== 'stay') { c.setState(n, 'walk'); n.dur = 1e9; } }
    } else if (sq.s === 'shift') {
      if (!sq.backTo || dist(n.pos.x, n.pos.z, sq.backTo[0], sq.backTo[1]) < 0.7) { sq.s = 'stay'; sq.kind = 'stand'; sq.at = [n.pos.x, n.pos.z]; sq.backTo = null; sq.face = Math.atan2(this.game.player.pos.x - n.pos.x, this.game.player.pos.z - n.pos.z); }
    } else if (sq.s === 'leave' || sq.s === 'flee' || sq.s === 'helped') {
      const wp = sq.wp && sq.wp[sq.wi];
      if (wp && dist(n.pos.x, n.pos.z, wp[0], wp[1]) < (sq.wi === sq.wp.length - 1 ? 1.6 : 1.8)) sq.wi++;
      if (!sq.wp || sq.wi >= sq.wp.length - 1 || Math.abs(n.pos.x) > REP.bounds.maxX - 1.2 || n.pos.z < REP.bounds.minZ + 1.2 || n.pos.z > REP.bounds.maxZ - 1.2) this._gone(n);
    }
    // a nod, or not, as they pass the officer on the way out
    const pl = g.player.pos, pd = dist(n.pos.x, n.pos.z, pl.x, pl.z);
    if ((sq.s === 'leave' || sq.s === 'helped') && pd < 3.6 && !sq.nodded && this.outcome !== 'charge') {
      sq.nodded = true;
      if (sq.mood > 0) { sq.nodT = 1.1; this.stats.nodded++; }
    }
    // where they look: the officer while he crosses (the walk in), whoever talks, or the line
    if (this.watch && this.t > sq.notice && pd < 40) { n.lookT = 0.4; n.focus.set(pl.x, 0, pl.z); }
    else if (sq.nodT > 0 || (pd < 5 && (sq.s === 'leave' || sq.s === 'stay'))) { n.lookT = 0.4; n.focus.set(pl.x, 0, pl.z); }
    else if (this.callT >= 0 && this.callT < 6) { n.lookT = 0.4; n.focus.copy(this.organiser.pos); }
    // the thrower's own business
    if (sq.prov) this._provTick(n, dt);
  }

  _sqMove(n) {
    const sq = n.sq, st = n.state;
    if (!sq || st === 'stagger' || st === 'down' || st === 'recover' || st === 'arrested') return null;
    if (sq.s === 'stay' || sq.s === 'rise' || sq.s === 'fallen' || sq.s === 'lead') {
      if (sq.s === 'stay' && sq.kind === 'stand' && dist(n.pos.x, n.pos.z, sq.at[0], sq.at[1]) > 0.5) return { speed: 1.0, dest: this._v.set(sq.at[0], 0, sq.at[1]) };
      return { speed: 0 };
    }
    if (sq.s === 'shift') return { speed: 1.3, dest: this._v.set(sq.backTo[0], 0, sq.backTo[1]) };
    if (sq.s === 'repos') return { speed: 1.25, dest: this._v.set(sq.repos[0], 0, sq.repos[1]) };
    if (sq.s === 'throw' || sq.caught > 0) return { speed: 0 };
    const wp = sq.wp && sq.wp[Math.min(sq.wi, sq.wp.length - 1)];
    if (!wp) return { speed: 0 };
    const sp = sq.s === 'flee' ? L6.charge.flee : sq.s === 'helped' || sq.helper ? 1.0 : sq.slip ? L6.prov.slipSpeed : (1.05 + (n.id % 5) * 0.06);
    return { speed: sp * n.speedMul, dest: this._v.set(wp[0], 0, wp[1]) };
  }

  _sqPose(n, P, dt, t) {
    const sq = n.sq;
    if (!sq) return 0;
    const L = life(n.rig, n.id), st = n.state;
    if (st === 'stagger' || st === 'down' || st === 'recover' || st === 'arrested') return 0;
    if (sq.throwT > 0) { const k = sq.throwT / 0.6; P.shRX = -2.6 * k - 0.4 * (1 - k); P.elR = -1.2 * k; P.spY = -0.4 * k + 0.3 * (1 - k); return 22; }
    if (sq.s === 'fallen' || (sq.kind === 'lie' && (sq.s === 'stay' || sq.s === 'rise'))) {
      const k = sq.s === 'rise' ? sq.k : 1;
      lying(P, -1, k, t); P.y += 0.05; P.hdY += Math.sin(t * 0.5 + L.ph) * 0.2 * k;
      if (P.mouth !== undefined) { P.brow = -0.8; P.mouth = 0.15; }
      return 6;
    }
    if (sq.s === 'helped') { supported(P, 1, t, 1); return 0; }
    if (sq.helper) { P.shLX = -0.35; P.shLZ = -1.2; P.elL = -0.9; P.spZ -= 0.08; } // an arm round the one they help
    const sitK = sq.kind === 'stand' ? 0 : sq.k;
    if (sitK > 0.01) {
      seated(P, L, sq.h, sitK);
      if (sq.hug) hugSelf(P, sitK * 0.9);
      if (sq.lean && !this.watch) leanOn(P, sq.lean, sitK);
    } else if (sq.s === 'stay' && sq.hug && !sq.flag) hugSelf(P, 0.75);
    if (sq.flag && sq.s === 'stay') { P.shRX = Math.max(P.shRX, -0.35); P.itemZ = 1.2; } // the flag held low, furled
    if (sq.s !== 'flee') weary(P, L, t, (sq.s === 'stay' ? 1 : 0.5) * (this.watch && this.t > sq.notice ? 0.2 : 1));
    if (sq.nodT > 0) nod(P, 1 - sq.nodT / 1.1);
    else if (sq.mood < 0 && (sq.s === 'leave') && dist(n.pos.x, n.pos.z, this.game.player.pos.x, this.game.player.pos.z) < 4) { P.hdY += 0.5 * (L.side); P.hdX -= 0.05; } // looks away
    return 0;
  }

  // the officer's baton landed on one of them
  _sqHit(n) {
    if (!n.sq) return;
    n.sq.byPlayer = this.t;
    this.stats.playerBlows++; this.stats.blows++;
    if (n.sq.prov) return;
    this.tension.add(L6.t.blow, 'struck');
    for (const o of this.game.crowd.query(n.pos.x, n.pos.z, 7, [])) if (o.sq && o.sq.s === 'stay') this._backOff(o, n.pos);
  }
  _lineBlow(n) {
    this.stats.lineBlows++; this.stats.blows++;
    this.addScore(-150, 'The line struck someone');
    this.tension.add(L6.t.line, 'line blow');
    this.game.hud.alert('Your line struck someone who was sitting down', 'bad', 2.6, 'lineblow');
  }

  _gone(n) {
    const sq = n.sq;
    if (!sq || sq.s === 'gone') return;
    if (sq.injured) { this.stats.injuredOut++; this.addScore(40, 'Injured out'); }
    sq.s = 'gone';
    this.stats.left++;
    this.game.crowd.retire(n);
  }

  // ------------------------------------------------------------- the level's own people
  _castTick(n, dt) {
    const c = this.game.crowd, cs = n.cs;
    n.stimuli.length = 0; n.fear = 0;
    if (!cs) return;
    cs.t += dt; cs.nod = Math.max(0, cs.nod - dt);
    const moving = cs.s === 'walk' || cs.s === 'go';
    if (moving && n.state !== 'walk') { c.setState(n, 'walk'); n.dur = 1e9; }
    else if (!moving && n.state !== 'act') c.setState(n, 'act', 1e9);
    const pl = this.game.player.pos, pd = dist(n.pos.x, n.pos.z, pl.x, pl.z);
    // who they look at: the officer when he is near or talking to them
    if (pd < 7 || (this.talkWith && this.talkWith.n === n)) { n.lookT = 0.4; n.focus.set(pl.x, 0, pl.z); }
    if (cs.s === 'go' && cs.dest && dist(n.pos.x, n.pos.z, cs.dest[0], cs.dest[1]) < 1.6) {
      if (cs.leave) { cs.s = 'gone'; c.retire(n); } else { cs.s = cs.then || 'stand'; cs.at = [n.pos.x, n.pos.z]; }
    }
    // medics go to anyone down during the charge and get them up
    if (cs.role === 'medic' && this.outcome === 'charge') {
      if (!cs.pt || cs.pt.sq.s !== 'fallen') {
        let best = null, bd = 30;
        for (const o of this.people) if (o.sq && o.sq.s === 'fallen' && !this.medics.some((m) => m !== n && m.cs && m.cs.pt === o)) { const d = dist(n.pos.x, n.pos.z, o.pos.x, o.pos.z); if (d < bd) { bd = d; best = o; } }
        cs.pt = best; cs.s = best ? 'walk' : 'stand'; cs.work = 0;
      } else if (dist(n.pos.x, n.pos.z, cs.pt.pos.x, cs.pt.pos.z) < 1.2) {
        cs.s = 'kneel'; cs.work = (cs.work || 0) + dt;
        if (cs.work > 4) { this._helpUp(cs.pt, false); cs.pt = null; }
      } else cs.s = 'walk';
    }
  }
  _castMove(n) {
    const cs = n.cs;
    if (!cs) return { speed: 0 };
    if (cs.s === 'walk' && cs.pt) return { speed: 2.6, dest: this._v.set(cs.pt.pos.x, 0, cs.pt.pos.z) };
    if (cs.s === 'go' && cs.dest) return { speed: cs.speed || 1.2, dest: this._v.set(cs.dest[0], 0, cs.dest[1]) };
    if (dist(n.pos.x, n.pos.z, cs.at[0], cs.at[1]) > 0.5) return { speed: 1.2, dest: this._v.set(cs.at[0], 0, cs.at[1]) };
    return { speed: 0 };
  }
  _castPose(n, P, dt, t) {
    const cs = n.cs;
    if (!cs) return 0;
    const L = life(n.rig, n.id), speaking = this.talkWith && this.talkWith.n === n && this.dialogue.speaker === this.talkWith.who;
    if (cs.s === 'kneel') { treating(P, L, t, 1); if (speaking) P.hdX -= 0.4; }
    if (cs.role === 'organiser') {
      if (this.callT >= 0 && this.callT < 7) { P.shRX = -1.6; P.elR = -2.35; P.shRZ = -0.15; P.hdX -= 0.12; P.mouth = 0.5 + Math.abs(Math.sin(t * 9)) * 0.4; P.brow = 0.4; return 0; } // the megaphone up
      if (!speaking) weary(P, L, t, 0.4);
    } else if (cs.role === 'student' && cs.s === 'stand' && !speaking) { if (cs.i === 3) hugSelf(P, 0.8); }
    if (cs.wave > 0) { cs.wave -= dt; const w = Math.sin(t * 9) * 0.35; P.shLX = -2.7; P.elL = -0.3 + w; P.shLZ = 0.2; } // over here
    if (speaking) { talk(P, L, t, 1); P.mouth = 0.25 + Math.abs(Math.sin(t * 10 + n.id)) * 0.5; P.brow = cs.role === 'student' ? 0.5 : 0.2; }
    if (cs.nod > 0) nod(P, 1 - cs.nod / 1.1);
    return 0;
  }
  _say(key, text, who) { this.game.hud.alert(`${who}: "${text}"`, 'info', Math.min(5, 2 + text.length / 30), key); }

  // ------------------------------------------------------------- talk (the new verb)
  _talkable(T) {
    if (this.section === 0) return T.key === 'medic' && this.medicCalled && !this.req.medic;
    if (this.section > 1 || this.outcome) return false;
    if (T.key === 'captain') return this.req.organiser === 'pending';
    if (T.key === 'organiser') return !this.req.organiser;
    return !this.req[T.key] || this.req[T.key] === 'later';
  }
  _posOf(T) { return T.n ? T.n.pos : T.p.pos; }
  // the baton lowered: no shield, no swing for a couple of seconds, no threatening call
  _calm() { const p = this.game.player; return !p.blocking && !p.attack && p.sinceSwing > L6.talk.still && p.directing !== 'threat'; }

  _talkStart(T) {
    const g = this.game;
    this.talkWith = T; this.talking = true; this.stats.talks++;
    if (T.n && T.n.cs) T.n.cs.wave = 0;
    const gen = this[`_conv_${T.key}`].bind(this);
    this.dialogue.start(gen, { onEnd: (res, cut) => { this.talking = false; this.talkWith = null; g.faceFill = null; if (!cut) this._resolve(T.key, res); } });
  }

  _resolve(key, res) {
    const g = this.game, t = this.tension;
    if (res === 'later' || res === undefined) { this.req[key] = 'later'; t.add(L6.t.later, 'put off'); return; }
    if (key === 'captain') {
      this.req.captain = res;
      if (res === 'agree') { this.req.organiser = 'agree'; this._agreed('organiser'); this._pullBack(); }
      else { this.req.organiser = 'refuse'; this._refused('organiser'); }
      return;
    }
    if (key === 'organiser' && res === 'pending') { this.req.organiser = 'pending'; g.hud.alert('Talk to the captain behind the line', 'info', 3, 'pending'); return; }
    this.req[key] = res;
    if (res === 'agree') this._agreed(key); else this._refused(key);
    if (key === 'medic' && res === 'agree') this._corridor();
    if (key === 'students' && res === 'agree') { this.studentsT = 0; this.say('checking', 2); }
  }
  _agreed(key) {
    this.stats.agreed++;
    this.addScore(500, 'Request agreed');
    this.tension.add(L6.t.agree, 'request agreed');
    this.game.hud.alert(`Request agreed · ${this.stats.agreed} of 3`, 'good', 2.4, 'req');
    this.game.audio.ui('good');
    const T = this.talkers.find((o) => o.key === key);
    if (T && T.n && T.n.cs) T.n.cs.nod = 1.1;
    if (key !== 'students') this._thin(L6.thin[key], T && T.n ? [T.n.pos.x, T.n.pos.z] : null); // (the students' friends go once they have the answer)
  }
  _refused(key) {
    this.stats.refused++;
    this.tension.add(L6.t.refuse, 'request refused');
    this.game.hud.alert('Request refused', 'warn', 2, 'req');
  }

  // the medic's corridor: the hurt walk out through a gap in the line's west end
  _corridor() {
    this.corr.s = 'open'; this.corr.t = 0;
    this.say('corridor', 2);
    const gapZ = () => this.lineZ;
    this.injured.forEach((n, i) => {
      const sq = n.sq; if (!sq || sq.s === 'gone') return;
      // a friend from nearby walks them out
      const helper = this._left().filter((o) => o.sq.s === 'stay' && !o.sq.injured && !o.sq.prov && !o.sq.helper).sort((a, b) => dist(a.pos.x, a.pos.z, n.pos.x, n.pos.z) - dist(b.pos.x, b.pos.z, n.pos.x, n.pos.z))[0];
      const path = [[-12.5 + (i % 2) * 0.8, gapZ() - 6], [-12.2 + (i % 2) * 0.8, gapZ() + 4], [-24, REP.bounds.maxZ - 5], ...exitPoints(REP.exits.find((e) => e.id === 'SW'))];
      sq.s = 'rise'; sq.t = -i * 3.2; sq.wp = path; sq.wi = 0;
      sq.then = 'helped';
      if (helper) { helper.sq.helper = n; helper.sq.s = 'rise'; helper.sq.t = -i * 3.2; helper.sq.wp = path.map(([x, z]) => [x + 0.6, z + 0.2]); helper.sq.wi = 0; }
    });
    this.corr.list = this.injured.slice();
  }
  _corridorUpdate(dt) {
    if (this.corr.s !== 'open') return;
    this.corr.t += dt;
    for (const n of this.corr.list) if (n.sq && n.sq.s === 'leave' && n.sq.then === 'helped') n.sq.s = 'helped';
    const left = this.corr.list.filter((n) => n.sq && n.sq.s !== 'gone').length;
    if (!left || this.corr.t > 90) this.corr.s = 'done';
  }
  _pullBack() {
    this.lineBack = true; this.lineZ = REP.line.z + REP.line.back;
    for (const o of this.crs) if (o.s === 'line') o.s = 'back';
    this.captain.speak = 2;
    this.say('back', 2);
  }

  // ------------------------------------------------------------- conversations (dialogue.js)
  *_conv_medic(d) {
    const m = this.mem;
    yield d.line('MEDIC', m.medic ? 'Gare de l\'Est tonight. We carried people out of that hall.' : 'Thank you for coming over without the shield.');
    yield d.line('MEDIC', 'Five people here cannot walk. The ambulances are behind your line.');
    const k = yield d.ask(['I will open a way through the line for them.', 'They can walk out the other side.', 'Wait. Not now.'], { def: 2 });
    if (k === 0) {
      if (m.medic) { yield d.line('MEDIC', 'Will your people let us through? Really?'); const k2 = yield d.ask(['They will. I will be standing there.', 'If they behave.'], { def: 1 }); if (k2 === 1) { yield d.line('MEDIC', 'Then we stay with them here.'); return 'refuse'; } }
      yield d.line('MEDIC', 'Then we go now, slowly. Tell your people.');
      return 'agree';
    }
    if (k === 1) {
      yield d.line('MEDIC', 'Two of them have head wounds. You want them carried a kilometre round?');
      const k2 = yield d.ask(['All right. Through the line.', 'That is the way out.'], { def: 1 });
      if (k2 === 0) { yield d.line('MEDIC', 'Thank you.'); return 'agree'; }
      yield d.line('MEDIC', 'Then we stay with them here.');
      return 'refuse';
    }
    yield d.line('MEDIC', 'They have been waiting since three.');
    return 'later';
  }
  *_conv_students(d) {
    const m = this.mem;
    yield d.line('STUDENT', m.students ? 'Your lot hit people sitting down at Château-d\'Eau. Why would we talk to you?' : 'They took our friend Yanis at Château-d\'Eau. Nobody will tell us where he is.');
    if (m.students) yield d.line('STUDENT', 'They took Yanis there. Nobody will tell us where he is.');
    const k = yield d.ask(['Give me his name. I will find out where he is.', 'If he was arrested, he did something.', 'Ask at the commissariat in the morning.'], { def: 2 });
    if (k === 0) { yield d.line('STUDENT', 'Yanis Benali. Twenty. Blue jacket. He was filming.'); return 'agree'; }
    if (k === 1) { yield d.line('STUDENT', 'He was filming! That is all he did.'); return 'refuse'; }
    yield d.line('STUDENT', 'Which one? There are twenty of them.');
    return 'later';
  }
  *_conv_organiser(d) {
    const m = this.mem;
    if (m.organiser === 'struck') yield d.line('ORGANISER', 'Boulevard de la République, seven o\'clock. I had the megaphone. I watched your line hit people who were walking.');
    else if (m.organiser === 'clean') yield d.line('ORGANISER', 'I had the megaphone on the boulevard at seven. Your line held without hitting us. That is why I am talking to you.');
    else yield d.line('ORGANISER', 'I organised the march. I have been on this square since seven.');
    yield d.line('ORGANISER', 'They are tired, not dangerous. Pull your line back twenty metres and I will get them home.');
    let k = yield d.ask(['Twenty metres. I will talk to the captain.', 'The line stays where it is.', 'Why twenty metres?'], { def: 1 });
    if (k === 2) {
      yield d.line('ORGANISER', 'Because now they can see the visors. Give them room and they will stand up on their own.');
      k = yield d.ask(['All right. I will talk to the captain.', 'The line stays.'], { def: 1 });
    }
    if (k !== 0) { yield d.line('ORGANISER', 'Then you will clear it the other way. Everybody here knows how that goes.'); return 'refuse'; }
    if (m.organiser === 'struck') {
      yield d.line('ORGANISER', 'Your word, then. Not the captain\'s.');
      yield d.ask(['You have my word.', 'I can only ask him.'], { def: 1 });
    }
    yield d.line('ORGANISER', 'Go on, then. I will be here.');
    return 'pending';
  }
  *_conv_captain(d) {
    const m = this.mem;
    yield d.line('CAPITAINE', 'Back? We have orders to clear this square by 05h40.');
    if (m.captain) yield d.line('CAPITAINE', 'I had men down on the canal an hour ago.');
    const k = yield d.ask(['Twenty metres. My call, my responsibility.', 'You are right. Hold the line.'], { def: 1 });
    if (k !== 0) { yield d.line('CAPITAINE', 'Good.'); return 'refuse'; }
    yield d.line('CAPITAINE', 'They have been throwing things at us all night.');
    const k2 = yield d.ask(['Not these people.', '... Hold the line, then.'], { def: 1 });
    if (k2 !== 0) { yield d.line('CAPITAINE', 'Good.'); return 'refuse'; }
    yield d.line('CAPITAINE', 'On your head, then.');
    return 'agree';
  }

  // ------------------------------------------------------------- direct and orders (Levels 4 and 5)
  // Called by the player while F is held. 'point': officers moving on the square within reach go
  // back into the line; in the charge, people within reach run the way the officer points.
  // 'threat' (the baton just swung): it frightens the people round him instead.
  onDirect(mode, dir, dt) {
    const g = this.game, p = g.player.pos;
    this.directT = 0.2;
    if (mode === 'threat') {
      this.threatT -= dt;
      if (this.threatT <= 0) {
        this.threatT = 1.3;
        this.tension.add(L6.t.threat, 'threatening call');
        for (const n of g.crowd.query(p.x, p.z, L6.surge.direct, [])) if (n.sq && n.sq.s === 'stay') this._backOff(n, p);
        g.hud.alert('Baton up: you are frightening them. Lower it, then call', 'bad', 2.6, 'threat');
      }
      return;
    }
    let k = 0;
    for (const o of this.crs) if (dist(o.p.pos.x, o.p.pos.z, p.x, p.z) < L6.surge.direct && this._recall(o, true)) k++;
    if (k) g.hud.alert(`CRS: "Back in line." · ${k}`, 'info', 1.4, 'ack');
    if (this.outcome === 'charge') {
      for (const n of g.crowd.query(p.x, p.z, L6.surge.direct, [])) {
        if (!n.sq || (n.sq.s !== 'flee' && n.sq.s !== 'stay' && n.sq.s !== 'shift')) continue;
        n.sq.s = 'flee'; n.sq.k = 0; n.sq.kind = 'stand';
        const x = clamp(n.pos.x + dir.x * 30, -REP.bounds.maxX + 2, REP.bounds.maxX - 2), z = clamp(n.pos.z + dir.z * 30, REP.bounds.minZ + 2, REP.bounds.maxZ - 2);
        n.sq.wp = [[x, z], ...exitPoints(this._exitFor({ pos: { x, z } }, false))]; n.sq.wi = 0;
      }
    }
  }

  _orders(dt) {
    const g = this.game, I = g.input, pl = g.player.pos;
    if (g.cinematic || g.player.dead || this.talking || this.stage === 'intro') return;
    const inReach = (o) => dist(o.p.pos.x, o.p.pos.z, pl.x, pl.z) < L6.surge.voice;
    const nearest = (list) => list.slice().sort((a, b) => dist(a.p.pos.x, a.p.pos.z, pl.x, pl.z) - dist(b.p.pos.x, b.p.pos.z, pl.x, pl.z))[0];
    if (I.pressed('Digit1')) {
      const o = nearest(this.crs.filter((q) => q.s === 'surge' && inReach(q)));
      if (o) this._recall(o, false, 'Halted.'); else g.hud.alert('Nobody moving in earshot', 'info', 1.4, 'ord');
    }
    if (I.pressed('Digit2')) {
      this.followHeld = 0; this.followAll = false;
      const o = nearest(this.crs.filter((q) => (q.s === 'surge' || q.s === 'held' || q.s === 'post') && inReach(q)));
      if (o) this._recall(o, true, 'Back in line.');
      else g.hud.alert('Nobody off the line in earshot', 'info', 1.4, 'ord');
    }
    if (I.down('Digit2')) {
      this.followHeld += dt;
      if (this.followHeld > 0.55 && !this.followAll) {
        this.followAll = true;
        let k = 0; for (const o of this.crs) if (inReach(o) && this._recall(o, true)) k++;
        if (k) g.hud.alert(`Line: "Back!" · ${k}`, 'info', 1.6, 'ack');
      }
    } else this.followHeld = 0;
    if (I.pressed('Digit3')) this._send();
    if (this.sendT > 0) { this.sendT -= dt; if (this.sendT <= 0 && !this.crs.some((o) => o.s === 'send')) this.sendMark.visible = false; }
  }
  // 3: one officer from the line goes to where the camera looks. At the thrower: he takes him quietly
  _send() {
    const g = this.game, at = this._aim(), P = this.prov;
    const free = this.crs.filter((o) => o.s === 'line');
    if (!free.length) { g.hud.alert('Nobody free on the line', 'warn', 1.4, 'ord'); return; }
    const o = free.sort((a, b) => dist(a.p.pos.x, a.p.pos.z, at.x, at.z) - dist(b.p.pos.x, b.p.pos.z, at.x, at.z))[0];
    o.ack = 0.9; o.t = 0;
    this.sendMark.position.set(at.x, 0, at.z); this.sendMark.visible = true; this.sendT = 5;
    if (P && this.PROV.marked && this.provS !== 'taken' && dist(P.pos.x, P.pos.z, at.x, at.z) < 4) {
      o.s = 'send'; o.tgt = P;
      g.hud.alert('CRS: "I have him."', 'info', 1.8, 'ack');
    } else {
      // an officer walking into a seated crowd for no reason does not help
      o.s = 'post'; o.px = at.x; o.pz = at.z;
      this.tension.add(L6.t.sent, 'officer sent in');
      g.hud.alert('CRS: "Moving up." (nobody there to take)', 'warn', 1.8, 'ack');
    }
  }
  _aim() {
    const g = this.game, w = g.world, p = g.player.pos, rig = g.cameraRig;
    const fx = -Math.sin(rig.yaw), fz = -Math.cos(rig.yaw);
    const want = clamp(10 + (rig.pitch + 0.25) * 90, 4, 45);
    let reach = 2;
    for (let s = 2; s <= want; s += 0.5) { if (w.blocked(p.x + fx * s, p.z + fz * s, 0.3, 2)) break; reach = s; }
    return V(p.x + fx * reach, 0, p.z + fz * reach);
  }

  // ------------------------------------------------------------- the thrower (Beat 3)
  _bottle() {
    const g = this.game, n = this.prov;
    if (!n || !n.sq || this.provS === 'taken' || this.provS === 'escaped' || n.state === 'gone') return;
    const sq = n.sq, grp = this.stats.bottles === 0 ? 1 : this.stats.bottles === 1 ? 0 : 2;
    this.stats.bottles++;
    sq.s = 'throw'; sq.k = 0; sq.kind = 'stand'; sq.throwT = 0.6; sq.t = 0;
    giveItem(n.rig, 'bottle');
    const tgts = this.crs.filter((o) => (o.s === 'line' || o.s === 'back') && GROUP(LINE_X[o.i]) === grp);
    const tg = (tgts[Math.floor(Math.random() * tgts.length)] || this.crs[7]).p;
    n.focus.copy(tg.pos); n.heading = Math.atan2(tg.pos.x - n.pos.x, tg.pos.z - n.pos.z);
    const from = n.pos.clone().setY(1.9), aim = V(tg.pos.x + R(-0.3, 0.3), 1.3, tg.pos.z - 0.6);
    this._throwLater = { t: 0.45, from, aim, grp, tg };
    this.provSeenT = 6; // a few seconds when anyone looking that way sees who it was
    g.audio.swing(n.pos);
  }
  _throwUpdate(dt) {
    const T = this._throwLater, g = this.game;
    if (!T) return;
    T.t -= dt;
    if (T.t > 0) return;
    this._throwLater = null;
    if (this.prov) clearItem(this.prov.rig);
    const proj = g.effects.throwProjectile(T.from, T.aim, 'bottle', (pos, p, hitPlayer) => {
      g.audio.glass(pos, 0.9); g.effects.dust(pos, 5);
      if (hitPlayer) { g.player.takeDamage(6, T.from, null, true); this.stats.bottleHits++; this.stats.blows++; }
      for (const o of this.crs) if (dist(pos.x, pos.z, o.p.pos.x, o.p.pos.z) < 2.2) o.p.flinch = 0.4;
      this.tension.add(L6.t.bottle, 'bottle');
      this.captain.speak = 1.6;
      this.say('bottle', 2, 5);
      this._surge(T.grp);
      if (this.stats.bottles === 1) { this.say('stop', 2); this.say('find', 1); }
      // people who agreed with you point him out
      if (!this.PROV.marked && this.req.students === 'agree') { this._identify('students'); this.say('pointed', 2, 1e9); }
      else if (!this.PROV.marked && this.req.organiser === 'agree') { this._identify('organiser'); this.say('pointedO', 2, 1e9); }
    });
    proj.check = (pos) => g.player.hitTest(pos);
    // after the throw: away through the crowd to somewhere else at the back
    const n = this.prov, sq = n.sq;
    sq.s = 'repos'; sq.repos = [R(-16, 16), R(-1028, -1018)];
  }
  _identify(by) {
    if (this.PROV.marked) return;
    this.PROV.marked = true; this.PROV.active = true;
    this.provBy = by;
    this.game.hud.alert(by === 'seen' ? 'You saw who threw it' : 'They have pointed him out', 'warn', 2.4, 'prov');
  }
  _provTick(n, dt) {
    const sq = n.sq, g = this.game, pl = g.player;
    sq.throwT = Math.max(0, (sq.throwT || 0) - dt);
    sq.caught = Math.max(0, (sq.caught || 0) - dt);
    if (sq.s === 'throw' && sq.throwT <= 0 && !this._throwLater) sq.s = 'stay';
    if (this.provS === 'none' || this.provS === 'taken' || this.provS === 'escaped') return;
    // seen: right after a throw, anyone looking his way within reach; or close up any time after
    const d = dist(n.pos.x, n.pos.z, pl.pos.x, pl.pos.z);
    if (!this.PROV.marked) {
      const fx = -Math.sin(g.cameraRig.yaw), fz = -Math.cos(g.cameraRig.yaw), dot = ((n.pos.x - pl.pos.x) * fx + (n.pos.z - pl.pos.z) * fz) / (d || 1);
      if ((this.provSeenT > 0 && d < L6.prov.see && dot > L6.prov.cone) || (this.stats.bottles > 0 && d < L6.prov.close && sq.s !== 'stay')) this._identify('seen');
    }
    // known and the officer coming: he tries to slip away north
    if (this.PROV.marked && !sq.slip && d < L6.prov.slip && sq.s !== 'throw') {
      sq.slip = true; sq.s = 'leave'; sq.repos = null; sq.k = 0; sq.kind = 'stand';
      const e = REP.exits.find((x) => x.id === (n.pos.x < 0 ? 'NW' : 'NE'));
      sq.wp = exitPoints(e); sq.wi = 0; sq.exit = e;
    }
  }
  _quietArrest(n, o = null) {
    const g = this.game;
    if (!n || n.arrested || n.state === 'gone') return;
    if (n.sq) n.sq.s = 'held';
    n.neutralized = true; this.PROV.active = false;
    g.crowd.arrest(n);
    this.provS = 'taken'; this.stats.thrower = o ? 'sent' : 'quiet';
    this.stats.arrests++;
    this.addScore(o ? 300 : 400, 'Thrower taken without a blow');
    g.hud.alert(o ? 'CRS: "One in custody. Nobody touched."' : 'Thrower in custody — nobody else touched', 'good', 2.6);
    g.audio.ui('good');
    this.say('taken', 2);
    if (o) { o.s = 'back'; o.tgt = null; this.sendMark.visible = false; }
  }

  // ------------------------------------------------------------- beats
  _startBeat(i, jumped = false) {
    const g = this.game;
    this.section = i; this.phase = i; this.stage = 'b' + i; this.stageT = 0; this.musicTier = i;
    g.hud.titleCard(i === 0 ? 'DAWN' : L6_PHASES[i], `Place de la République · ${this.clock()}`, i === 0 && !jumped ? 3.5 : 2.6);
    if (jumped) for (let k = 0; k < i; k++) this.completed[k] = true;
    if (i === 0) {
      this.watch = true;
      const pl = g.player.pos;
      for (const n of this.people) n.sq.notice = this.t + 1.2 + dist(n.pos.x, n.pos.z, pl.x, pl.z) * 0.05 + hash(n.id, 2) * 1.5;
      for (const n of this.people) n.sq.mood = this._mood(n);
      this.say('start'); this.say('walk');
      if (!jumped) this._introCinematic();
    } else if (i === 1) {
      this.watch = false;
      this.say('talks', 2);
    } else if (i === 2) {
      if (this.dialogue.open) this.dialogue.close(true);
      this.provS = 'wait'; this.bottleT = jumped ? 3 : 6;
    } else if (i === 3) {
      if (this.dialogue.open) this.dialogue.close(true);
      for (const o of this.crs) if (o.s !== 'line' && o.s !== 'aside') o.s = 'back';
      const T = this.tension.value;
      const peace = T < L6.light.calm || (this.req.organiser === 'agree' && T < 70);
      if (peace) this._call(); else this._charge();
    }
  }
  _mood(n) {
    const m = this.mem, r = hash(n.id, 9) + Math.random() * 0.2;
    const warm = 0.3 + m.warm + this.stats.agreed * 0.08, cold = 0.22 + m.cold;
    return r < warm ? 1 : r > 1.2 - cold ? -1 : 0;
  }
  _beatDone(i, bonus, text) { if (!this.completed[i]) this._phaseDone(i, bonus, text); }

  // Beat 1: across the square; the medic calls; the first conversation starts the next beat
  _b0(dt) {
    const g = this.game, p = g.player;
    if (!this.medicCalled && (p.pos.z < L6.walk.call || this.stageT > 25)) {
      this.medicCalled = true;
      this.medics[0].cs.wave = 2.4;
      this._say('mcall', 'Officer! Over here. Please.', 'MEDIC');
      this.say('medic', 2);
    }
    if (this.medicCalled && this.medics[0].cs.wave <= 0 && !this.talking && !this.req.medic && Math.floor(this.stageT) % 9 === 0) this.medics[0].cs.wave = 1.2;
    if (this.talking || this.req.medic || this.stageT > L6.walk.maxT) {
      this._beatDone(0, this.stats.shieldT < 2 ? 400 : 200, this.stats.shieldT < 2 ? 'You walked in with your hands down' : 'You are across the square');
      this._startBeat(1);
    }
  }
  _b1() {
    const r = this.req, done = (k) => r[k] === 'agree' || r[k] === 'refuse';
    // the captain's impatience, on the radio of the line
    if (this.stageT > 110 && this.capSaid < 1) { this.capSaid = 1; this.captain.speak = 2.5; this.say('captain', 1); }
    if (this.stageT > 250 && this.capSaid < 2) { this.capSaid = 2; this.captain.speak = 2.5; this.say('captain2', 2); }
    const all = done('medic') && done('students') && done('organiser');
    if ((all || this.stageT > L6.talks.maxT) && !this.talking) {
      this._beatDone(1, 200 * this.stats.agreed + 200, `${this.stats.agreed} of 3 requests agreed`);
      this._startBeat(2);
    }
  }
  _b2(dt) {
    this.bottleT -= dt;
    if (this.provSeenT > 0) this.provSeenT -= dt;
    const P = this.prov;
    if (this.bottleT <= 0 && this.stats.bottles < L6.prov.bottles && this.provS !== 'taken' && this.provS !== 'escaped') { this._bottle(); this.bottleT = R(...L6.prov.every); }
    // he got out of the square
    if (P && P.sq && P.sq.s === 'gone' && this.provS !== 'taken' && this.provS !== 'escaped') { this.provS = 'escaped'; this.stats.thrower = 'escaped'; this.tension.add(L6.t.escape, 'thrower escaped'); this.say('slipped', 1); }
    if (P && P.arrested && this.provS !== 'taken') { this.provS = 'taken'; if (this.stats.thrower === 'none') this.stats.thrower = 'struck'; }
    const over = this.provS === 'taken' || this.provS === 'escaped' || (this.stats.bottles >= L6.prov.bottles && this.bottleT < 12);
    const moving = this._surging().length > 0;
    if ((over && !moving) || this.stageT > L6.prov.maxT) {
      this._beatDone(2, this.stats.lineBlows ? 200 : 600, this.stats.lineBlows ? 'The line is stopped' : 'The line held. Nobody touched');
      this._startBeat(3);
    }
  }
  _b3(dt) {
    const g = this.game;
    this.lightT += dt;
    if (this.callT >= 0) this.callT += dt;
    if (this.outcome === 'peace') {
      // the square empties past the officer, in waves after the call
      if (this.callT > 3 && !this.waved) {
        this.waved = true;
        const pl = g.player.pos;
        const list = this._left().filter((n) => n.sq.s === 'stay' || n.sq.s === 'shift');
        list.forEach((n) => {
          const south = Math.random() < 0.55;
          const via = south ? [clamp(pl.x + R(-3, 3), -30, 30), clamp(pl.z + R(-1.5, 1.5), REP.bounds.minZ + 4, REP.bounds.maxZ - 6)] : null;
          this._leave(n, R(0, 22) + dist(n.pos.x, n.pos.z, M.x, M.z) * 0.15, south, via);
        });
        // the cast go too
        for (const n of [this.organiser, ...this.students]) if (n.cs) { n.cs.s = 'go'; n.cs.dest = exitPoints(REP.exits.find((e) => e.id === 'SE'))[1]; n.cs.leave = true; n.cs.speed = 1.1; }
        this.say('calm', 2);
      }
      const left = this._left().length;
      if ((this.waved && left <= this.people.length * 0.06) || this.lightT > L6.light.maxT) this._end();
    } else if (this.outcome === 'charge') {
      // people fall in the rush; the medics and the officer get them up
      const left = this._left().length;
      if (left === 0 || this.lightT > L6.light.maxT) this._end();
    }
  }

  // the organiser calls it from the steps
  _call() {
    const g = this.game;
    this.outcome = 'peace'; this.callT = 0; this.waved = false;
    const o = this.organiser;
    if (o.cs) { o.cs.s = 'go'; o.cs.dest = [M.x + 0.4, M.z + M.col + 1.2]; o.cs.then = 'stand'; o.cs.speed = 1.2; }
    this.say('call', 3);
    g.audio.ui('good');
    // the line stands aside to the vans
    this.crs.forEach((q, i) => { const s = LINE_X[i] < 0 ? -1 : 1, k = Math.abs(LINE_X[i]) / 3; q.s = 'clear'; q.cx = s * (8 + k * 1.6); q.cz = -958 - (i % 2) * 1.2; });
  }
  _charge() {
    const g = this.game;
    this.outcome = 'charge'; this.stats.charge = 1;
    this.captain.speak = 2;
    this.say('charge', 3); this.say('rescue', 2);
    g.hud.alert('THE LINE IS CHARGING', 'bad', 3.5);
    g.audio.ui('bad');
    for (const o of this.crs) { o.s = 'charge'; o.t = 0; }
    for (const n of this._left()) {
      const sq = n.sq;
      if (Math.random() < L6.charge.trip && sq.s === 'stay' && !sq.injured) { sq.s = 'fallen'; sq.k = 1; sq.kind = 'lie'; n.farDy = -2; this.stats.fallen++; continue; }
      sq.s = 'flee'; sq.k = 0; sq.kind = 'stand'; sq.t = 0;
      sq.wp = exitPoints(this._exitFor(n, false)); sq.wi = 0;
    }
    for (const m of this.medics) if (m.cs) m.cs.s = 'stand';
    for (const n of this.students) if (n.cs) { n.cs.s = 'go'; n.cs.dest = exitPoints(REP.exits.find((e) => e.id === 'E'))[1]; n.cs.leave = true; n.cs.speed = 3.2; }
    const o = this.organiser; if (o.cs) { o.cs.s = 'go'; o.cs.dest = exitPoints(REP.exits.find((e) => e.id === 'W'))[1]; o.cs.leave = true; o.cs.speed = 3; }
  }
  _helpUp(n, byPlayer = true) {
    const sq = n.sq;
    if (!sq || sq.s !== 'fallen') return;
    sq.s = 'flee'; sq.k = 0; sq.kind = 'stand'; n.farDy = 0;
    sq.wp = exitPoints(this._exitFor(n, false)); sq.wi = 0;
    this.stats.helped++;
    this.addScore(byPlayer ? 120 : 60, byPlayer ? 'Helped up' : 'Medics got them up');
  }

  _end() {
    if (this.stage === 'victory' || this.stage === 'done') return;
    this.stage = 'victory';
    const g = this.game, peace = this.outcome === 'peace';
    this.stats.cleared = peace && this.clockMin() <= 5 * 60 + 40.5 ? 1 : 0;
    this.say('done', 2);
    const mid = () => V(M.x, 0, M.z + 4);
    g.playCinematic({
      id: 'dawnEnd', title: peace ? 'FIRST LIGHT' : 'THE SQUARE IS CLEARED', sub: `Place de la République · ${this.clock()}`, titleAt: [0.5, 4.2], sting: peace ? 'victory' : null,
      lines: peace ? [['They stood up and walked home.', 0.6, 2.6], [this.stats.blows ? `${this.stats.blows} blows landed tonight on this square.` : 'Nobody on the square was struck.', 2.7, 4.6]]
        : [['The line charged.', 0.6, 2.4], [`${this.stats.helped} people helped up. ${this.stats.blows} blows landed.`, 2.5, 4.6]],
      shots: [{ dur: 4.8, a: orbit(mid, 22, 7, 3.0, 50, 4), b: orbit(mid, 26, 11, 2.4, 54, 6) }],
      onDone: () => this.complete(),
    });
  }

  resume(cp) { this.jumpTo(cp.section || 0); }
  // ?dev&level=6&stage=N and __jump(N)
  jumpTo(i) {
    i = clamp(i | 0, 0, L6_PHASES.length - 1);
    const g = this.game;
    this.reset();
    const at = [[REP.start.x, REP.start.z], [0.5, -998], [0.5, -990], [0.5, -990]][i];
    g.player.pos.set(at[0], 0, at[1]); g.player.heading = FACE_N; g.cameraRig.reset(g.player);
    this.lastHealth = g.player.health;
    this.t = [0, 120, 480, 660][i];
    if (i >= 1) { this.watch = false; this.medicCalled = true; for (const n of this.people) n.sq.mood = this._mood(n); }
    if (i === 3) { this.tension.value = 20; this.req.organiser = 'agree'; } // (a jump to the last beat plays the calm dawn; raise the tension first for the charge)
    this._startBeat(i, true);
  }

  // ------------------------------------------------------------- update
  update(dt) {
    const g = this.game;
    this.t += dt; this.stageT += dt; this.dt = dt;
    this._trackDamage();
    this.promptE = false;
    this._ensure();
    this._radioUpdate(dt);
    // the light comes up as the clock runs to 05h40
    this.lightAcc += dt;
    if (this.lightAcc > 0.25) { this.lightAcc = 0; this._setLight(clamp(this.t / L6.span, 0, 1)); }
    this.dialogue.update(dt);
    if (this.talking) this._faceTalk(dt);
    this._lineUpdate(dt);
    this._corridorUpdate(dt);
    this._throwUpdate(dt);
    if (this.directT > 0) this.directT -= dt;
    this.ring.visible = this.directT > 0 && g.player.directing === 'point';
    if (this.ring.visible) this.ring.position.set(g.player.pos.x, 0.06, g.player.pos.z);
    if (this.stage === 'intro') {
      if (this.stageT > 1.2) this._startBeat(0);
      this._marks();
      this._updateMarker(dt);
      return;
    }
    this._orders(dt);
    this._pressure(dt);
    // the students' answer comes back on the radio
    if (this.studentsT >= 0) {
      this.studentsT += dt;
      if (this.studentsT > 11) {
        this.studentsT = -1; this.say('found', 2);
        this._say('stud', 'Thank you. We will go and wait for him there.', 'STUDENT');
        this.students.forEach((n, i) => { if (n.cs && i > 0) { n.cs.s = 'go'; n.cs.dest = exitPoints(REP.exits.find((e) => e.id === 'E'))[1]; n.cs.leave = true; } });
        this._thin(L6.thin.students, REP.students);
      }
    }
    if (this.stage !== 'victory' && this.stage !== 'done') {
      this[`_b${this.section}`](dt);
      this._interactions();
      if (this.tension.value >= L6.t.call && this.section < 3) { this._beatDone(this.section, 0, 'The square has turned'); this._startBeat(3); }
    }
    this._marks();
    this._marker();
    this.warning = false;
    this._updateMarker(dt);
  }

  // what the officer does on the square that raises the tension before anyone speaks
  _pressure(dt) {
    const g = this.game, p = g.player, near = this._left().some((n) => dist(n.pos.x, n.pos.z, p.pos.x, p.pos.z) < 12);
    if (!near || this.outcome) return;
    if (p.blocking) {
      this.stats.shieldT += dt;
      this.tension.add(L6.t.shield * dt, 'shield up');
      if ((this.shieldWarn -= dt) <= 0) { this.shieldWarn = 20; this.say('shield', 2, 20); this._say('shout', 'Shield down! We are sitting down!', 'SOMEONE'); }
    }
    this.swingT -= dt;
    if (p.attack && p.attack.phase === 'windup' && this.swingT <= 0) { this.swingT = 1.2; this.tension.add(L6.t.swing, 'baton swung'); }
  }

  // the two people in a conversation turn to each other; a soft light on the face that speaks
  _faceTalk() {
    const g = this.game, T = this.talkWith;
    if (!T) return;
    const pos = this._posOf(T), pl = g.player;
    pl.heading = Math.atan2(pos.x - pl.pos.x, pos.z - pl.pos.z);
    if (T.n) T.n.heading = Math.atan2(pl.pos.x - pos.x, pl.pos.z - pos.z);
    const sp = this.dialogue.speaker === 'YOU' ? pl.pos : pos, other = sp === pos ? pl.pos : pos;
    const dx = other.x - sp.x, dz = other.z - sp.z, d = Math.hypot(dx, dz) || 1;
    const kneel = T.n && T.n.cs && T.n.cs.s === 'kneel';
    g.faceFill = { pos: V(sp.x + (dx / d) * 0.9, kneel && sp === pos ? 1.35 : 1.95, sp.z + (dz / d) * 0.9), i: 3.2 };
    // walked away: the conversation is over
    if (dist(pos.x, pos.z, pl.pos.x, pl.pos.z) > 6.5) this.dialogue.close(true);
  }

  // ------------------------------------------------------------- interactions (E)
  _hold(key, text, dur, done) {
    const g = this.game;
    this.promptE = true;
    if (this.busy && this.busy.key === key) {
      this.busy.t += this.dt;
      g.hud.prompt('E', `${text} · ${Math.min(100, Math.round((this.busy.t / dur) * 100))}%`);
      if (this.busy.t >= dur) { this.busy = null; done(); }
      return true;
    }
    g.hud.prompt('E', text);
    if (g.input.pressed('KeyE')) { if (dur > 0) this.busy = { key, t: 0 }; else done(); }
    return false;
  }
  _interactions() {
    const g = this.game, p = g.player.pos;
    if (this.talking || g.cinematic) return;
    let key = null;
    // someone down in the charge
    const fallen = this.outcome === 'charge' ? this.people.find((n) => n.sq && n.sq.s === 'fallen' && dist(n.pos.x, n.pos.z, p.x, p.z) < 2.2) : null;
    // the thrower, once known
    const P = this.prov, prov = P && this.PROV.marked && this.provS !== 'taken' && !P.arrested && P.state !== 'gone' && dist(P.pos.x, P.pos.z, p.x, p.z) < 1.9 ? P : null;
    const a = g.crowd.arrestable(p);
    let T = null, bd = L6.talk.r;
    for (const o of this.talkers) { if (!this._talkable(o)) continue; const q = this._posOf(o), d = dist(q.x, q.z, p.x, p.z); if (d < bd) { bd = d; T = o; } }
    if (fallen) { key = 'up' + fallen.id; this._hold(key, 'Help them up', L6.charge.help, () => this._helpUp(fallen)); }
    else if (prov) { key = 'prov'; if (this._hold(key, 'Take hold of him (no blow)', L6.prov.take, () => this._quietArrest(prov))) prov.sq.caught = 0.3; } // (a hand on him: he stops)
    else if (a) { g.hud.prompt('E', 'Arrest'); this.promptE = true; if (g.input.pressed('KeyE')) { g.crowd.arrest(a); this.onArrest(a); if (a === P) { this.provS = 'taken'; if (this.stats.thrower === 'none') this.stats.thrower = 'struck'; } } }
    else if (T) {
      if (!this._calm()) g.hud.prompt('—', g.player.blocking ? 'Lower the shield to talk' : 'Baton down: wait a moment');
      else { g.hud.prompt('E', `Talk to ${T.name}`); this.promptE = true; if (g.input.pressed('KeyE')) this._talkStart(T); }
    }
    if (this.busy && this.busy.key !== key) this.busy = null;
  }

  // speech marks over whoever can be talked to now
  _marks() {
    const t = this.t;
    this.talkers.forEach((T, i) => {
      const m = this.marks[i], on = !this.talking && this.stage !== 'intro' && this._talkable(T);
      m.visible = on;
      if (!on) return;
      const q = this._posOf(T), kneel = T.n && T.n.cs && T.n.cs.s === 'kneel';
      m.position.set(q.x, (kneel ? 1.7 : 2.25) + Math.sin(t * 2.4 + i) * 0.06, q.z);
      m.rotation.y = t * 1.6;
    });
  }

  // where the beam leads: someone to talk to, the thrower once known, someone down
  _marker() {
    const g = this.game, p = g.player.pos;
    this.markerPos = null;
    if (this.stage === 'victory' || this.stage === 'done' || this.talking) return;
    if (this.section === 0) { this.markerPos = this.medicCalled ? this.medics[0].pos : V(0, 0, -996); return; }
    if (this.section === 1) {
      let best = null, bd = 1e9;
      for (const T of this.talkers) { if (!this._talkable(T)) continue; const q = this._posOf(T), d = dist(q.x, q.z, p.x, p.z); if (d < bd) { bd = d; best = q; } }
      this.markerPos = best; return;
    }
    if (this.section === 2) {
      const mv = this._surging().sort((a, b) => dist(a.p.pos.x, a.p.pos.z, p.x, p.z) - dist(b.p.pos.x, b.p.pos.z, p.x, p.z))[0];
      if (mv) { this.markerPos = mv.p.pos; return; }
      if (this.prov && this.PROV.marked && this.provS !== 'taken') this.markerPos = this.prov.pos;
      return;
    }
    if (this.outcome === 'charge') { const f = this.people.find((n) => n.sq && n.sq.s === 'fallen'); if (f) this.markerPos = f.pos; }
  }

  // ------------------------------------------------------------- callbacks
  onPeacefulStruck(n) {
    this.stats.peaceful++;
    this.addScore(-200, 'Excessive force');
    this.tension.onPeacefulStruck();
    this.game.hud.alert('EXCESSIVE FORCE — on this square, of all places', 'bad', 3);
    this.game.audio.ui('bad');
  }
  onThreatNeutralized(n) {
    this.stats.neutralized++;
    this.addScore(50, 'Thrower down');
    this.game.hud.alert('Down — press E to arrest', 'warn', 2.4, 'down');
  }
  onArrest(n) {
    this.stats.arrests++;
    this.addScore(100, 'Arrest');
    this.game.hud.alert('Arrested', 'good', 2);
  }

  // ------------------------------------------------------------- radio (as Level 5's)
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
    const voice = q.who === 'CONTROL';
    this.game.hud.alert(voice ? `📻 ${q.who}: ${q.text}` : `${q.who}: "${q.text}"`, voice ? 'radio' : 'info', dur);
    if (voice) this.game.audio.radio(q.pri >= 2, dur);
    this.radioLog.push({ t: +this.t.toFixed(2), key: q.key });
    this.radioGap = dur + 0.8;
  }

  // ------------------------------------------------------------- presentation
  _introCinematic() {
    const g = this.game;
    const mon = () => V(M.x, 0, M.z), me = () => V(g.player.pos.x, 0, g.player.pos.z - 1);
    g.playCinematic({
      id: 'dawnIntro', title: 'DAWN', sub: 'Place de la République · 05h10', titleAt: [0.4, 3.6],
      lines: [['CONTROL: "A few hundred still round the monument. None of them armed."', 0.5, 2.9], ['CONTROL: "The order is to clear it by 05h40."', 3.0, 5.2]],
      shots: [{ dur: 3.0, a: orbit(mon, 30, 12, 0.4, 52, 6), b: orbit(mon, 24, 8, 0.1, 50, 4) },
        { dur: 1.8, a: orbit(me, 7.5, 2.0, 0.5, 44, 1.2), b: orbit(me, 6.5, 1.8, 0.1, 44, 1.2) },
        { dur: 0.9, a: orbit(me, 6.5, 1.8, 0.1, 44, 1.2), b: 'rig' }],
    });
  }

  complete() {
    if (this.ended) return;
    this.ended = true;
    this.stage = 'done';
    this.markerPos = null;
    const s = this.stats;
    this._beatDone(3, this.outcome === 'peace' ? 1000 : 400, this.outcome === 'peace' ? 'The square went home' : 'The square is cleared');
    if (this.outcome === 'peace') this.addScore(1500, 'Cleared without a charge');
    this.addScore(Math.round((100 - this.tension.value) * 8), 'A calm square');
    if (s.blows === 0) this.addScore(500, 'No blow landed');
    this.game.endGame(true);
  }

  // the dev bot (dev.js) plays with the normal controls: where to walk, what to say
  botGoal() {
    const g = this.game;
    if (this.section === 1) {
      // to the captain once the organiser asked; the medic, the students and the organiser first
      const order = ['medic', 'students', 'organiser', 'captain'];
      for (const k of order) { const T = this.talkers.find((o) => o.key === k); if (this._talkable(T)) return this._posOf(T); }
    }
    if (this.section === 2 && this.prov && this.PROV.marked && this.provS !== 'taken') return this.prov.pos;
    return this.markerPos || (this.section === 3 ? V(g.player.pos.x, 0, g.player.pos.z) : null);
  }
  botInput(I) {
    const g = this.game;
    if (g.cinematic) return false;
    if (this.dialogue.open) { if (this.dialogue.op && this.dialogue.op.kind === 'ask') I.edges.add('Digit1'); return true; }
    if (this.section === 2 && this._surging().some((o) => dist(o.p.pos.x, o.p.pos.z, g.player.pos.x, g.player.pos.z) < L6.surge.voice)) { I.keys.add('Digit2'); I.edges.add('Digit2'); }
    return false;
  }

  mapExtras(ctx, tr) {
    const [x, y] = tr(M.x, M.z), [x2] = tr(M.x + M.step2, M.z);
    ctx.strokeStyle = '#b9b2a4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, Math.abs(x2 - x), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#4f8dff';
    for (const o of this.crs) { const [a, b] = tr(o.p.pos.x, o.p.pos.z); ctx.fillRect(a - 2, b - 2, 4, 4); }
    ctx.fillStyle = '#9fd0ff';
    for (const T of this.talkers) if (this._talkable(T)) { const q = this._posOf(T), [a, b] = tr(q.x, q.z); ctx.beginPath(); ctx.arc(a, b, 4, 0, Math.PI * 2); ctx.fill(); }
    if (this.prov && this.PROV.marked && this.provS !== 'taken') { const [a, b] = tr(this.prov.pos.x, this.prov.pos.z); ctx.fillStyle = '#ff4a3a'; ctx.fillRect(a - 3, b - 3, 6, 6); }
  }

  hudInfo() {
    const i = Math.min(this.section, L6_PHASES.length - 1), s = this.stats, r = this.req;
    const info = { label: 'BEAT', index: i, phaseName: L6_PHASES[i], text: '', status: 'active', chip: this.clock(), detail: '', bar: null, completed: this.completed };
    if (this.stage === 'intro') return Object.assign(info, { text: 'Behind the CRS line', chip: '05h10', status: 'calm', detail: 'Radio traffic incoming…' });
    if (this.stage === 'victory' || this.stage === 'done') return Object.assign(info, { text: this.outcome === 'peace' ? 'The square went home' : 'The square is cleared', status: 'done', detail: `${s.agreed} of 3 requests agreed · ${s.blows} blows landed` });
    const mark = (k) => (r[k] === 'agree' ? '✓' : r[k] === 'refuse' ? '✗' : r[k] === 'pending' ? '… captain' : '—');
    if (this.talking && this.talkWith) return Object.assign(info, { text: `Talking with ${this.talkWith.name}`, status: 'calm', detail: '1 2 3 answer · E next line' });
    if (i === 0) return Object.assign(info, { text: this.medicCalled ? 'The medic is calling you over: talk (E)' : 'Walk to the monument: shield down, baton down', status: 'calm', detail: 'Nobody here is a threat. Everyone is watching you.' });
    if (i === 1) return Object.assign(info, { text: r.organiser === 'pending' ? 'Talk to the captain behind the line' : 'Hear what the square wants', detail: `Medic ${mark('medic')} · Students ${mark('students')} · Organiser ${mark('organiser')}`, bar: clamp(1 - this.stageT / L6.talks.maxT, 0, 1) });
    if (i === 2) {
      const mv = this._surging().length;
      if (mv) return Object.assign(info, { text: 'Stop your line', chip: 'SURGE', status: 'danger', detail: `${mv} moving · F call back · 1 halt · 2 fall back (hold: all) · 3 send one` });
      if (this.provS === 'taken') return Object.assign(info, { text: 'The thrower is in custody', detail: 'Hold the line' });
      return Object.assign(info, { text: this.PROV.marked ? 'Take the thrower: E beside him, or 3 at him' : 'Find who threw it', detail: `Bottles ${s.bottles} · blows landed ${s.blows}` });
    }
    if (this.outcome === 'charge') { const f = this.people.filter((n) => n.sq && n.sq.s === 'fallen').length; return Object.assign(info, { text: 'The line has charged: get people out', chip: 'CHARGE', status: 'danger', detail: `${f} down · ${s.helped} helped up · E help up · F send them clear` }); }
    return Object.assign(info, { text: 'First light: let them go home', status: 'calm', detail: `${this._left().length} still on the square` });
  }

  endInfo(win, reason) {
    const s = this.stats, fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    const said = (k) => ({ agree: 'agreed', refuse: 'refused', pending: 'not put to the captain', later: 'put off' }[this.req[k]] || 'not heard');
    return {
      title: win ? 'LEVEL 6 COMPLETE' : 'MISSION FAILED',
      sub: win ? (this.outcome === 'peace' ? `The square went home at ${this.clock()} · ${s.agreed} of 3 requests agreed · ${s.blows ? `${s.blows} blows landed` : 'no blow landed'}` : `The line charged · ${s.helped} helped up · ${s.blows} blows landed`) : reason || '',
      rows: [
        ['Beats completed', `${this.completed.filter(Boolean).length} / ${L6_PHASES.length}`],
        ['The medic: a corridor', said('medic')],
        ['The students: their friend', said('students')],
        ['The organiser: the line back 20 m', said('organiser')],
        ['Injured out through the line', s.injuredOut],
        ['The thrower', { none: '—', quiet: 'taken without a blow', sent: 'taken by an officer you sent', struck: 'struck, then arrested', escaped: 'got away' }[s.thrower] || '—', s.thrower === 'escaped' || s.thrower === 'struck'],
        ['Officers called back', `${s.recalled} of ${s.surged}`],
        ['Blows landed: yours · the line\'s', `${s.playerBlows} · ${s.lineBlows}`, s.blows > 0],
        ['How it ended', this.outcome === 'peace' ? `they went home · ${s.nodded} nodded to you` : this.outcome === 'charge' ? `a charge · ${s.helped} helped up` : '—', this.outcome === 'charge'],
        ['Tension at the end', `${Math.round(this.tension.value)} / 100`, this.tension.value >= 35],
        ['What the square remembered', this.mem.notes.length ? `${this.mem.notes.length} of the night's levels` : 'nothing yet (no earlier runs)'],
        ['Mission time', fmt(this.t)],
      ],
      hook: win ? HOOK : '',
      rank: 'Restart to try again',
    };
  }
}

// ------------------------------------------------------------------ the level's own people
// The organiser: the same coat, vest and red beanie as on the boulevard at 18h47.
function organiserOutfit(rng) {
  const o = randomOutfit(rng);
  Object.assign(o, { top: 'jacket', smart: false, garment: 'coat', shellColor: 0x2f4a3a, topColor: 0x2f4a3a, topBase: 0x2f4a3a, longSleeve: true, keepTop: false, keepBottom: false,
    vest: true, shellPattern: 7, pa: 0xd8ec1a, pb: 0xb8bec4, mask: 'none', scarf: 'red', hood: false, hat: 'beanie', hatColor: 0xd4202f, pants: 0x2a2a2e, backpack: false });
  if (o.base === 'rb_female') o.hat = 'beanie';
  return o;
}
// Street medics: white, with the cross on the back (a patch the level adds) and a backpack.
function medicOutfit(rng) {
  const o = randomOutfit(rng);
  Object.assign(o, { top: 'jacket', smart: false, garment: 'coat', shellColor: 0xe8e8e2, topColor: 0xe8e8e2, topBase: 0xe8e8e2, longSleeve: true, keepTop: false,
    vest: false, mask: 'none', scarf: 'none', hood: false, hat: 'cap', hatColor: 0xf4f4f0, backpack: true });
  if (o.base === 'rb_female') o.hat = 'beanie';
  return o;
}
function studentOutfit(rng) {
  const o = randomOutfit(rng);
  Object.assign(o, { backpack: true, mask: 'none' });
  return o;
}

export { repArea };
