// Level 5 · "The Quays".
// 04h05, Canal Saint-Martin. The last violent groups have left the boulevards and work the
// canal in small fast bands: out of a side street, over a footbridge, a car alight, gone. The
// officer now leads four others, and there are more places to be than officers to put there.
//
//  Beat 1 FIRST BRIDGE     the new verb, order: 1 posts an officer where you stand (hold),
//                          2 calls one back (follow; held: everyone). Post two on the first
//                          footbridge and take two across; a band finds it held and turns
//  Beat 2 TWO QUAYS        bands of 5-8 cross where no one stands. 3 sends an officer to where
//                          you look (advance). A car left burning with nobody near sets the
//                          next one alight
//  Beat 3 THE FIRE ENGINE  a pompiers crew needs its time on a burning shop. Bands go for the
//                          crew as well as the cars: the engine and the bridges cannot all be covered
//  Beat 4 THE LOCK         the last of them at the lock, the water behind them. Cornered they
//                          fight hard; left a way out they scatter and the night ends without it
//
// People first: there is no boss. A band is nobody until it acts (appearance says nothing), so
// the high-skill route is to be standing where they meant to go. The squad are four of the
// crowd's own CRS officers (crowd.js `police`, role squad): this script moves their posts and
// the existing officer behaviour (_copCombat) does the fighting. Bands read which bridges are
// held when they choose a way. Shares the Missions interface with the other levels.
import * as THREE from 'three';
import { Missions } from './missions.js';
import { buildQuays, QUAYS, quaysArea, route, bankOf, patchTexture } from './quays.js';
import { randomOutfit, clearItem, giveItem, newPose, crouch } from './characters.js';
import { mulberry } from './textures.js';
import { quietly } from './world.js';
import { orbit } from './cinematic.js';

export const L5_PHASES = ['FIRST BRIDGE', 'TWO QUAYS', 'THE FIRE ENGINE', 'THE LOCK'];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const R = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const Q = QUAYS;
const HOOK = 'Control: "Place de la République. A few hundred still round the monument, none of them armed. The order is to clear it by 05h40."';
const NAMES = ['VEGA', 'ORION', 'LYNX', 'MISTRAL'];
const BUILDS = [[1, 1], [1.07, 0.98], [0.95, 1.035], [1.1, 1.03]]; // width, height: four different silhouettes
const RING = { follow: 0x4f8dff, hold: 0x34d070, advance: 0xffb02e, down: 0xff4a3a };

// where the crowd stands before the level places it (the title screen behind the menu)
export const L5_CROWD = {
  gatherPoints: [V(9, 0, -820), V(-9, 0, -800), V(9, 0, -770), V(-9, 0, -740), V(9, 0, -700), V(-9, 0, -670), V(9, 0, -640), V(-9, 0, -610)],
  marchPaths: [],
  noCrews: true,
  bystanderZ: -1,
  focus: { lineZ: 1e9, frontZ: -700, behindZ: -700 },
};
// the rest of the city's unrest is out of sight: nothing the scheduler does lands on the quays
export const L5_EVENTS = {
  zones: [{ name: 'République', crowd: V(-70, 0, -900), police: V(-60, 0, -890) }, { name: 'Magenta', crowd: V(80, 0, -910), police: V(70, 0, -895) }],
  hazardZ: [1e9, 1e9], carFireZ: [1e9, 1e9],
  gas: { fromZ: 0, toZ: [0, 0], minPlayerZ: 1e9 },
};

// ------------------------------------------------------------------ tuning
export const L5 = {
  squad: { hp: 4, run: 5.7, walk: 2.4, tired: 3.5, drain: 3.6, regen: 8, holdR: 11, followR: 7, reviveHp: 2 },
  heldR: 7,                 // an officer (or you) this close to a bridge holds it
  guardR: 14,               // ... and this close to a car, a band will not come for it
  band: { jog: 3.5, run: 5.2, spot: 10, size: [5, 8], bottle: [5, 9], hp: 2, bottleDmg: 8 },
  waves: { first: 10, every: [46, 60], max: 2 },
  beat0: { band: 75, maxT: 170 },
  beat1: { T: 320 },
  engine: { drive: 9, work: 200, maxT: 400, retreat: 14, every: [36, 48] },
  fire: { spread: 22, guard: 14, douse: 2.4, squadDouse: 4, fail: 14 },
  lock: { size: 10, near: 15, sight: 26, maxT: 210 },
};

const LINES = {
  start: ['CONTROL', 'They have left the boulevards for the canal. Small bands, fast: a car alight and gone over the footbridges. You have four officers.'],
  hold: ['CONTROL', 'Press 1 to post an officer where you stand. Put two on that first footbridge.'],
  follow: ['CONTROL', 'Good. Press 2 to call one back to you, hold it to call them all. Take the other two across.'],
  tutBand: ['VEGA', 'Movement in Rue des Vinaigriers. A band, coming for the bridge.'],
  turned: ['CONTROL', 'They saw the bridge held and turned. That is the job: be standing where they meant to go.'],
  rule: ['CONTROL', 'Nobody is a suspect for walking along a canal. Once they light something, they are yours.'],
  wave: ['CONTROL', 'More of them, both banks. Press 3 to send an officer where you are looking. Every bridge you hold shrinks their options.'],
  spread: ['CONTROL', 'A car left burning with nobody near sets the next one alight. Get an officer to it, or put it out yourself.'],
  down: ['CONTROL', 'Officer down. Get to them.'],
  engine: ['CONTROL', 'A shop is alight on Quai de Valmy, flats above it. Pompiers are coming in along the quay. They need a few minutes on that hose.'],
  engineHint: ['POMPIERS', 'We work if nobody is throwing things at us. Keep them off the engine.'],
  crewHit: ['POMPIERS', 'We are being hit! Pulling back behind the engine.'],
  crewBack: ['POMPIERS', 'Back on the hose.'],
  saved: ['POMPIERS', 'Fire is out. Everyone upstairs is fine. Thank you.'],
  lost: ['CONTROL', 'The shop is gone. The crew is pulling the families out the back.'],
  lock: ['CONTROL', 'What is left of them is at the lock, east side. Water behind them and one way out, the Passage de l\'Écluse.'],
  lockHint: ['CONTROL', 'Close that passage and they will fight you for it. Leave it open and they will run. Your call.'],
  cornered: ['CONTROL', 'You have shut them in. They are coming at you.'],
  scatter: ['CONTROL', 'They are running, through the passage. Let them go. The canal is quiet.'],
  done: ['CONTROL', 'The lock is yours. The canal is quiet.'],
};

export class Level5 extends Missions {
  constructor(game) {
    super(game);
    const w = game.world, c = game.crowd;
    if (!w.hasDistrict('l5')) w.registerDistrict('l5', buildQuays(w, game.scene, game.renderer, game.camera));
    this.D = w.districts.l5;
    this.POMP = { active: false, tick: (n) => this._pompTick(n), move: (n) => this._pompMove(n), pose: (n, P, dt, t) => this._pompPose(n, P, t) };
    quietly(() => {
      if (!c.l5cast) { const rng = mulberry(5505); c.l5cast = { pompiers: [0, 1, 2].map(() => c.spawnSpecial(pompierOutfit(rng))) }; }
      this.pompiers = c.l5cast.pompiers;
      // the squad: four of the crowd's officers; the other two of that role stay out of this level
      const cops = c.police.filter((p) => p.role === 'squad' || p.l5);
      this.spare = cops.slice(4);
      this.squad = cops.slice(0, 4).map((p, i) => {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.54, 28), new THREE.MeshBasicMaterial({ color: RING.follow, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide, fog: false }));
        ring.rotation.x = -Math.PI / 2; ring.renderOrder = 2; game.scene.add(ring);
        const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: patchTexture(NAMES[i]), color: 0xb4b8bc }));
        patch.position.set(0, 0.16, -0.26); patch.rotation.y = Math.PI;
        if (p.rig.spine) p.rig.spine.add(patch);
        const s0 = p.rig.root.scale.clone();
        p.rig.root.scale.set(s0.x * BUILDS[i][0], s0.y * BUILDS[i][1], s0.z * BUILDS[i][0]);
        p.l5 = true;
        const o = { p, i, name: NAMES[i], ring, patch, orig: { pos: p.pos.clone(), heading: p.heading, scale: s0 } };
        o.adapter = { pos: p.pos, isPlayer: false, vehicle: { hit: (kind, from) => this._officerHit(o, 0.5, from, false) } };
        p.pose = (P, dt, t) => this._copPose(o, P, t);
        return o;
      });
      // where an officer sent forward is going
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5, 12, 1, true), new THREE.MeshBasicMaterial({ color: RING.advance, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      beam.position.y = 2.5;
      this.advMark = new THREE.Group(); this.advMark.add(beam); this.advMark.visible = false;
      game.scene.add(this.advMark);
    });
    this._v = V(0, 0, 0);
    this.built = true;
    this.reset();
  }

  dispose() {
    const g = this.game, c = g.crowd;
    g.scene.remove(this.advMark);
    for (const o of this.squad) {
      const p = o.p;
      g.scene.remove(o.ring);
      if (o.patch.parent) o.patch.parent.remove(o.patch);
      p.rig.root.scale.copy(o.orig.scale);
      p.pos.copy(o.orig.pos); p.heading = o.orig.heading; p.role = 'squad'; p.l5 = false;
      if (p.home) p.home.copy(p.pos);
      p.lx = p.pos.x; p.lz = p.pos.z;
      p.pose = null; p.face = undefined; p.effort = 0; p.atk = null;
      if (p.rig.shield) p.rig.shield.visible = true;
    }
    for (const p of this.spare) { p.off = false; p.rig.root.visible = true; }
    for (const n of this.pompiers) c.retire(n);
    for (const n of c.npcs) { if (n.rn) { n.rn = null; n.script = null; } n.l5 = null; }
    this._clearBlaze();
    this.D.setEngine(Q.engine.from, false); this.D.hose.visible = false;
    super.dispose();
  }

  reset() {
    super.reset();
    this.completed = L5_PHASES.map(() => false);
    this.phaseTimes = L5_PHASES.map(() => 0);
    this.section = 0; this.cp = null;
    Object.assign(this.stats, { squad: 4, officersDown: 0, revived: 0, fires: 0, firesOut: 0, burnt: 0, spread: 0, bands: 0, turned: 0, escaped: 0, squadArrests: 0, orders: 0, arsonStopped: 0, crewStruck: 0, building: 0, lockFight: 0, lockScattered: 0 });
    this.radioQ = []; this.radioGap = 0; this.radioSaid = {}; this.radioLog = [];
    this.promptE = false; this.busy = null; this.musicTier = 0;
    if (!this.built) return; // first call, from the Missions constructor
    const D = this.D, s = Q.start;
    this._clearBlaze();
    D.setEngine(Q.engine.from, false); D.hose.visible = false;
    this.bands = []; this.bandN = 0; this.waveT = 1e9; this.waveEvery = L5.waves.every;
    this.lit = new Map();
    this.eng = { s: 'none', t: 0, work: 0, retreatT: 0, lost: false };
    this.lockBand = null; this.lockS = 'none';
    this.tut = { posted: false, band: null, bandT: L5.beat0.band, crossed: false };
    this.followHeld = 0; this.followAll = false; this.advT = 0; this.botT = 0;
    this.squad.forEach((o, i) => {
      const p = o.p;
      Object.assign(o, { order: 'follow', post: V(0, 0, 0), dest: null, hp: L5.squad.hp, stam: 100, down: false, ackT: 0, job: null, jobT: 0, think: i * 0.1, faceHold: 0, moved: 0, kneel: false });
      p.role = 'squad'; p.atk = null; p.cool = 0; p.flinch = 0;
      if (p.rig.shield) p.rig.shield.visible = true;
    });
    this._squadTo(s.x, s.z);
    this._populate();
  }

  // ------------------------------------------------------------- the cast
  // Everyone in the crowd waits off stage; a few late walkers are put on the quays and the
  // bands are drawn from the rest as they come.
  _populate() {
    const c = this.game.crowd;
    this.pool = [];
    for (const n of c.npcs) {
      if (n.special || n.kind) continue;
      clearItem(n.rig);
      c.retire(n);
      n.l5 = 'pool'; n.rn = null; n.march = null;
      this.pool.push(n);
    }
    for (const n of this.pompiers) c.retire(n);
    const spots = [[8.4, -812], [-8.6, -786], [8.3, -760], [-8.4, -741], [18.4, -745], [8.5, -716], [-18.4, -708], [8.4, -684], [-8.5, -660], [18.3, -640], [8.6, -622], [-8.4, -612]];
    spots.forEach(([x, z], i) => {
      const n = this.pool.pop(); if (!n) return;
      n.pos.set(x, 0, z); n.anchor.copy(n.pos); n.target.copy(n.pos); n.vel.set(0, 0, 0); n.knock.set(0, 0, 0);
      n.temperament = 'peaceful'; n.attackStyle = null; n.script = null; n.untargetable = false; n.neutralized = false; n.arrested = false;
      n.hp = 2; n.hitCount = 0; n.fear = 0; n.stimuli.length = 0; n.surge = null; n.role = i % 3 === 0 ? 'film' : 'watch';
      n.heading = Math.random() * 6.28; n.rig.root.visible = true; n.rig.pose = newPose(); n.l5 = 'walker';
      if (n.role === 'film') giveItem(n.rig, 'phone');
      c.setState(n, 'act'); n.dur = 4 + Math.random() * 8;
    });
    this.sentinel = this.pool[0];
  }
  // the crowd was reset under us (a level switch resets it after the script is built)
  _ensure() {
    for (const p of this.spare) if (!p.off) { p.off = true; p.rig.root.visible = false; }
    const s = this.sentinel;
    if (s && s.l5 && (s.state === 'gone' || s.rn)) return;
    const stage = this.stage, t = this.t, stageT = this.stageT;
    this.reset(); this.stage = stage; this.t = t; this.stageT = stageT;
  }
  _take() { return this.pool.pop() || null; }

  _place(n, x, z, script, state = 'act', heading = 0) {
    const c = this.game.crowd;
    n.pos.set(x, 0, z); n.anchor.copy(n.pos); n.target.copy(n.pos); n.vel.set(0, 0, 0); n.knock.set(0, 0, 0);
    n.heading = heading; n.focus.set(x + Math.sin(heading) * 20, 0, z + Math.cos(heading) * 20);
    n.temperament = 'scripted'; n.script = script; n.untargetable = true; n.neutralized = false; n.arrested = false;
    n.fear = 0; n.stimuli.length = 0; n.hp = 2; n.hitCount = 0; n.role = 'watch'; n.lookT = 0;
    n.rig.root.visible = true; n.rig.pose = newPose();
    c.setState(n, state, 1e9);
  }

  // ------------------------------------------------------------- who is where
  _standing() { return this.squad.filter((o) => !o.down); }
  // an officer or the player within r of a point
  _guarded(x, z, r) {
    const p = this.game.player.pos;
    if (dist(p.x, p.z, x, z) < r) return true;
    for (const o of this.squad) if (!o.down && dist(o.p.pos.x, o.p.pos.z, x, z) < r) return true;
    return false;
  }
  _nearestOfficer(x, z, r) {
    let best = null, bd = r;
    const p = this.game.player.pos, d0 = dist(p.x, p.z, x, z);
    if (d0 < bd) { bd = d0; best = { pos: p, player: true }; }
    for (const o of this.squad) { if (o.down) continue; const d = dist(o.p.pos.x, o.p.pos.z, x, z); if (d < bd) { bd = d; best = { pos: o.p.pos, o }; } }
    return best;
  }
  // a bridge is held while someone of ours stands on it or at either end
  _held(br) {
    const near = (x, z) => Math.hypot(Math.max(0, Math.abs(x) - 9), z - br.z) < L5.heldR;
    const p = this.game.player.pos;
    if (near(p.x, p.z)) return true;
    return this.squad.some((o) => !o.down && near(o.p.pos.x, o.p.pos.z));
  }
  _mouthAt(m) { return [m.side * 21.5, m.z]; }

  // ------------------------------------------------------------- the squad
  _squadTo(x, z) {
    const s = bankOf(x);
    this.squad.forEach((o, i) => {
      const p = o.p;
      p.pos.set(clamp(x + s * (1.5 + (i % 2) * 1.4), -19, 19), 0, z - 1.6 - Math.floor(i / 2) * 1.5);
      p.pos.y = this.game.world.groundHeight(p.pos.x, p.pos.z);
      (p.home || (p.home = p.pos.clone())).copy(p.pos);
      p.lx = p.pos.x; p.lz = p.pos.z; p.heading = 0; p.face = 0; p.pace = 0;
      o.order = 'follow'; o.job = null;
    });
  }

  // the three orders. hold: the nearest officer with you stays here. follow: the nearest one
  // posted comes back (all: everyone). advance: one goes to where the camera looks and holds there.
  order(kind) {
    const g = this.game, pl = g.player.pos, up = this._standing();
    const by = (list, x, z) => list.slice().sort((a, b) => dist(a.p.pos.x, a.p.pos.z, x, z) - dist(b.p.pos.x, b.p.pos.z, x, z))[0];
    const say = (o, text) => { o.ackT = 0.9; g.hud.alert(`${o.name}: "${text}"`, 'info', 1.8, 'ack'); g.audio.ui('click'); this.stats.orders++; };
    if (!up.length) { g.hud.alert('No officer standing', 'warn', 1.6, 'ord'); return null; }
    if (kind === 'hold') {
      const o = by(up.filter((q) => q.order === 'follow'), pl.x, pl.z);
      if (!o) { g.hud.alert('Nobody is with you — 2 calls one back', 'warn', 1.8, 'ord'); return null; }
      // beside anyone already posted here, not on top of them
      let x = pl.x, z = pl.z;
      const taken = this.squad.filter((q) => q !== o && q.order !== 'follow' && dist(q.post.x, q.post.z, x, z) < 1.3).length;
      if (taken) { const yaw = g.cameraRig.yaw; x += Math.cos(yaw) * 1.3 * taken; z -= Math.sin(yaw) * 1.3 * taken; }
      if (g.world.blocked(x, z, 0.36)) { x = pl.x; z = pl.z; }
      o.order = 'hold'; o.post.set(x, 0, z); o.dest = null; o.job = null;
      o.faceHold = Math.atan2(-Math.sin(g.cameraRig.yaw), -Math.cos(g.cameraRig.yaw));
      say(o, 'Holding here.');
      return o;
    }
    if (kind === 'follow' || kind === 'followAll') {
      const away = up.filter((q) => q.order !== 'follow');
      if (!away.length) { if (kind === 'follow') g.hud.alert('Everyone is with you', 'info', 1.4, 'ord'); return null; }
      const list = kind === 'followAll' ? away : [by(away, pl.x, pl.z)];
      for (const o of list) { o.order = 'follow'; o.dest = null; o.job = null; }
      if (kind === 'followAll') { g.hud.alert('Squad: "On you."', 'info', 1.8, 'ack'); g.audio.ui('click'); this.stats.orders++; list.forEach((o) => { o.ackT = 0.9; }); } else say(list[0], 'On you.');
      return list[0];
    }
    // advance
    const at = this._aim();
    const free = up.filter((q) => q.order === 'follow');
    const o = by(free.length ? free : up, at.x, at.z);
    o.order = 'advance'; o.dest = at; o.post.copy(at); o.job = null;
    this.advMark.position.set(at.x, g.world.groundHeight(at.x, at.z), at.z); this.advMark.visible = true; this.advT = 6;
    say(o, 'Moving up.');
    return o;
  }

  // where the camera looks, on ground an officer can stand on (looking up: further away)
  _aim() {
    const g = this.game, w = g.world, p = g.player.pos, rig = g.cameraRig;
    const fx = -Math.sin(rig.yaw), fz = -Math.cos(rig.yaw);
    const want = clamp(10 + (rig.pitch + 0.25) * 90, 5, 75);
    let reach = 2;
    for (let s = 2; s <= want; s += 0.5) { if (w.blocked(p.x + fx * s, p.z + fz * s, 0.3, 2)) break; reach = s; }
    let x = p.x + fx * reach, z = p.z + fz * reach;
    // over the water: the near end of a bridge if one is there, otherwise the quay's edge
    if (Math.abs(x) < Q.water + 0.4 && !Q.bridges.some((b) => Math.abs(z - b.z) < b.half - 0.2)) x = (x >= 0 ? 1 : -1) * Q.end;
    for (let k = 0; k < 10 && w.blocked(x, z, 0.4); k++) { x += (Q.lane * bankOf(x) - x) * 0.3; z += R(-0.6, 0.6); }
    return V(x, 0, z);
  }

  _orders(dt) {
    const g = this.game, I = g.input;
    if (g.cinematic || g.player.dead || this.stage === 'intro') return;
    if (I.pressed('Digit1')) this.order('hold');
    if (I.pressed('Digit3')) this.order('advance');
    if (I.pressed('Digit2')) { this.order('follow'); this.followHeld = 0; this.followAll = false; }
    if (I.down('Digit2')) { this.followHeld += dt; if (this.followHeld > 0.55 && !this.followAll) { this.followAll = true; this.order('followAll'); } } else this.followHeld = 0;
    if (this.advT > 0) { this.advT -= dt; if (this.advT <= 0) this.advMark.visible = false; }
  }

  // one step towards (tx, tz), round whatever stands in the way. True on arrival.
  _step(o, tx, tz, speed, dt, stop = 0.3) {
    const w = this.game.world, p = o.p.pos, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    if (d <= stop) return true;
    let ux = dx / d, uz = dz / d;
    if (w.blocked(p.x + ux * 1.1, p.z + uz * 1.1, 0.32)) {
      for (const a of [0.7, -0.7, 1.4, -1.4, 2.1, -2.1]) {
        const c = Math.cos(a), s = Math.sin(a), rx = ux * c - uz * s, rz = ux * s + uz * c;
        if (!w.blocked(p.x + rx * 1.1, p.z + rz * 1.1, 0.32)) { ux = rx; uz = rz; break; }
      }
    }
    const st = Math.min(speed * dt, d - stop + 0.02);
    p.x += ux * st; p.z += uz * st;
    w.resolveCircle(p, 0.36);
    o.moved = speed; o.hx = ux; o.hz = uz;
    return false;
  }
  // ... by the quay and the bridges when it is on the other bank or a long way off
  _go(o, x, z, speed, dt, stop = 0.3) {
    const p = o.p.pos, r = route(p, { x, z });
    if (!r) return this._step(o, x, z, speed, dt, stop);
    let i = 0;
    // (a point already passed is skipped: nearer the next one than that point itself is)
    while (i < r.length - 1 && (dist(p.x, p.z, r[i][0], r[i][1]) < 1.1 || dist(p.x, p.z, r[i + 1][0], r[i + 1][1]) < dist(r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]))) i++;
    const last = i === r.length - 1;
    return this._step(o, r[i][0], r[i][1], speed, dt, last ? stop : 0.2) && last;
  }

  _squadUpdate(dt) {
    const g = this.game, c = g.crowd, pl = g.player, S = L5.squad;
    const followers = this.squad.filter((o) => !o.down && o.order === 'follow');
    for (const o of this.squad) {
      const p = o.p;
      o.moved = 0; o.kneel = false;
      o.ackT = Math.max(0, o.ackT - dt);
      o.ring.position.set(p.pos.x, p.pos.y + 0.05, p.pos.z);
      o.ring.material.color.setHex(RING[o.down ? 'down' : o.order]);
      if (o.down) { p.effort = 0.8; continue; }
      const speed = o.stam < 22 ? S.tired : S.run;
      // what needs doing within reach: an arrest, someone to stop, a fire
      o.think -= dt;
      if (o.think <= 0) { o.think = 0.3; this._pickJob(o); }
      const j = o.job;
      if (p.atk) { /* mid-swing: the crowd's officer code has him */ }
      else if (j && j.kind === 'arrest') {
        const n = j.n;
        if (n.arrested || !n.neutralized || n.state === 'gone') o.job = null;
        else if (this._go(o, n.pos.x, n.pos.z, speed, dt, 1.3)) {
          o.kneel = true; o.jobT += dt;
          if (o.jobT > 2.2) { c.arrest(n); this.onArrest(n, o); o.job = null; }
        } else o.jobT = 0;
      } else if (j && j.kind === 'chase') {
        const n = j.n;
        if (n.state === 'gone' || n.neutralized || !n.rn || n.script !== n.rn.band.live || (o.order !== 'follow' && dist(n.pos.x, n.pos.z, o.post.x, o.post.z) > S.holdR + 3)) o.job = null;
        else this._go(o, n.pos.x, n.pos.z, speed, dt, 1.5);
      } else if (j && j.kind === 'douse') {
        const v = j.v, b = g.burn.burning.get(v.id);
        if (!b || b.stage === 'smoulder') o.job = null;
        else if (this._go(o, v.x - bankOf(v.x) * 2.3, v.z, speed, dt, 0.5)) {
          o.jobT += dt; o.spray = true; this._spray(V(p.pos.x, 1.2, p.pos.z), V(v.x, 0.9, v.z), dt);
          if (o.jobT > L5.fire.squadDouse) { this._douse(v, o); o.job = null; }
        } else o.jobT = 0;
      } else if (o.order === 'follow') {
        const k = followers.indexOf(o), h = pl.heading, lat = (k % 2 ? 1 : -1) * (1.1 + Math.floor(k / 2) * 0.9), back = 1.7 + Math.floor(k / 2) * 1.3;
        let sx = pl.pos.x + Math.cos(h) * lat - Math.sin(h) * back, sz = pl.pos.z - Math.sin(h) * lat - Math.cos(h) * back;
        if (g.world.blocked(sx, sz, 0.4)) { sx = pl.pos.x; sz = pl.pos.z; }
        const d = dist(p.pos.x, p.pos.z, sx, sz);
        this._go(o, sx, sz, d > 4.5 ? speed : Math.min(speed, Math.max(S.walk, pl.speed + 0.4)), dt, sx === pl.pos.x ? 1.7 : 0.5);
      } else if (o.order === 'advance') {
        if (this._go(o, o.dest.x, o.dest.z, speed, dt, 0.5)) {
          o.order = 'hold'; o.post.copy(p.pos); o.ackT = 0.7;
          const br = Q.bridges.find((b) => Math.abs(b.z - p.pos.z) < 8);
          o.faceHold = br ? Math.atan2(-p.pos.x, br.z - p.pos.z) : Math.atan2(-p.pos.x, 0);
          g.hud.alert(`${o.name}: "In position."`, 'info', 1.6, 'ack');
        }
      } else if (dist(p.pos.x, p.pos.z, o.post.x, o.post.z) > 0.6) this._go(o, o.post.x, o.post.z, S.walk + 1, dt, 0.4);
      // tiring and recovering: a spent officer drops to a jog and breathes hard
      o.stam = clamp(o.stam + (o.moved > 4.4 ? -S.drain : o.moved > 0 ? S.regen * 0.4 : S.regen) * dt, 0, 100);
      p.effort = clamp(1 - o.stam / 75, 0, 1);
      p.pos.y = g.world.groundHeight(p.pos.x, p.pos.z);
      p.home.copy(p.pos); // the post moves with the order: the officer code never walks him back
      p.face = o.moved ? Math.atan2(o.hx, o.hz) : o.order === 'follow' ? pl.heading : o.faceHold;
    }
    // officers do not stand inside each other
    for (let i = 0; i < 4; i++) for (let k = i + 1; k < 4; k++) {
      const a = this.squad[i].p.pos, b = this.squad[k].p.pos, dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
      if (d2 < 0.64 && d2 > 1e-6 && !this.squad[i].down && !this.squad[k].down) { const d = Math.sqrt(d2), s = (0.8 - d) / d * 0.5; a.x -= dx * s; a.z -= dz * s; b.x += dx * s; b.z += dz * s; }
    }
    this.stats.squad = this._standing().length;
  }

  _pickJob(o) {
    const g = this.game, p = o.p.pos, S = L5.squad, pl = g.player.pos;
    if (o.job && (o.job.kind === 'arrest' || o.job.kind === 'douse')) return;
    const taken = (n) => this.squad.some((q) => q !== o && q.job && q.job.n === n);
    let best = null, bd = 7;
    for (const b of this.bands) for (const n of b.members) {
      if (n.rn && n.neutralized && !n.arrested && (n.state === 'down' || n.state === 'recover' || n.state === 'surrender') && !taken(n)) { const d = dist(p.x, p.z, n.pos.x, n.pos.z); if (d < bd) { bd = d; best = n; } }
    }
    if (best) { o.job = { kind: 'arrest', n: best }; o.jobT = 0; return; }
    // someone running with a band that has shown what it is
    const posted = o.order !== 'follow';
    if (o.order !== 'advance') {
      bd = posted ? S.holdR : S.followR;
      for (const b of this.bands) for (const n of b.members) {
        if (!n.rn || n.script !== b.live || n.neutralized || n.state === 'down' || n.state === 'gone') continue;
        const d = posted ? dist(o.post.x, o.post.z, n.pos.x, n.pos.z) : dist(p.x, p.z, n.pos.x, n.pos.z);
        if (d < bd && (posted || dist(pl.x, pl.z, n.pos.x, n.pos.z) < 16)) { bd = d; best = n; }
      }
      if (best) { o.job = { kind: 'chase', n: best }; return; }
    }
    if (o.job && o.job.kind === 'chase') o.job = null;
    if (o.order === 'hold') {
      for (const [v] of this.lit) { const b = g.burn.burning.get(v.id); if (b && b.stage !== 'smoulder' && dist(o.post.x, o.post.z, v.x, v.z) < 13 && !this.squad.some((q) => q !== o && q.job && q.job.v === v)) { o.job = { kind: 'douse', v }; o.jobT = 0; return; } }
    }
  }

  // crowd.js asks this for every officer it draws: the level's layer over the standing pose
  _copPose(o, P, t) {
    if (o.down) return;
    if (o.ackT > 0) { const k = Math.min(1, o.ackT / 0.25); P.shRX += (-2.7 - P.shRX) * k; P.elR += (-0.5 - P.elR) * k; P.shRZ = -0.15 * k; } // arm up: understood
    if (o.kneel) { P.y -= 0.42; P.hpLX = -1.4; P.knL = 1.5; P.hpRX = -0.2; P.knR = 1.6; P.spX += 0.35; P.shRX = -0.9; P.elR = -0.9; }
    if (o.job && o.job.kind === 'douse' && o.jobT > 0) { P.shRX = -1.2; P.elR = -0.4; P.shLX = -1.0; P.elL = -0.7; P.spX += 0.1; }
    const tired = clamp(1 - o.stam / 40, 0, 1);
    if (tired > 0 && !o.moved) { P.spX += 0.22 * tired; P.hdX += 0.18 * tired; P.shLX += 0.1 * tired; P.y -= 0.03 * tired + Math.sin(t * 3.2 + o.i) * 0.012 * tired; } // hands towards the knees
  }

  // a bottle or a blow reaches an officer
  _officerHit(o, dmg, from, projectile) {
    const g = this.game, p = o.p;
    if (o.down) return;
    const fx = Math.sin(p.heading), fz = Math.cos(p.heading), dx = from.x - p.pos.x, dz = from.z - p.pos.z, d = Math.hypot(dx, dz) || 1;
    if ((fx * dx + fz * dz) / d > 0.3 && Math.random() < (projectile ? 0.55 : 0.4)) { g.audio.impact(p.pos, false, true); p.flinch = 0.25; return; } // on the shield
    o.hp -= dmg; p.flinch = 0.45;
    g.audio.impact(p.pos, dmg >= 1);
    g.effects.impact(p.pos.clone().setY(1.3));
    if (o.hp > 0) return;
    o.down = true; o.job = null; p.atk = null; p.role = 'injured';
    this.stats.officersDown++;
    this.addScore(-200, 'Officer down');
    g.hud.alert(`${o.name} is down — get to them`, 'bad', 3.5);
    g.audio.ui('bad'); g.audio.hurt(false);
    this.say('down', 2, 30);
  }
  _revive(o) {
    const p = o.p;
    o.down = false; o.hp = L5.squad.reviveHp; o.order = 'follow'; o.stam = 50;
    p.role = 'squad'; if (p.rig.shield) p.rig.shield.visible = true;
    this.stats.revived++;
    this.addScore(100, 'Officer back on their feet');
    this.game.hud.alert(`${o.name}: "I am all right. With you."`, 'good', 2.4);
  }
  // crowd.js: who a cornered fighter goes for (the nearest officer of the squad, else the player)
  squadTargetFor(n) {
    let best = null, bd = 9;
    for (const o of this.squad) { if (o.down) continue; const d = dist(o.p.pos.x, o.p.pos.z, n.pos.x, n.pos.z); if (d < bd) { bd = d; best = o; } }
    return best && bd < n.distToPlayer ? best.adapter : null;
  }

  // ------------------------------------------------------------- bands
  _script(band, live) {
    return { active: live, marked: live, amber: false, band, tick: (n, p, dt) => this._runTick(n, band, dt), move: (n) => this._runMove(n), pose: (n, P, dt, t) => this._runPose(n, P, t), onHit: (n) => this._runStruck(n, band) };
  }
  _alive(band) { return band.members.filter((n) => n.rn && n.rn.band === band && n.state !== 'gone' && !n.arrested && !n.neutralized); }

  // a side street nobody of ours is standing at, away from the officer
  _pickMouth(filter = null) {
    const pl = this.game.player.pos;
    const c = Q.mouths.filter((m) => !m.lock && (!filter || filter(m)) && !this._guarded(m.side * 20, m.z, 16) && dist(pl.x, pl.z, m.side * 20, m.z) > 30 && !this.bands.some((b) => b.mouth === m && b.s === 'in'));
    return c.length ? c[Math.floor(Math.random() * c.length)] : null;
  }

  _spawnBand(opts = {}) {
    const g = this.game, mouth = opts.mouth || this._pickMouth();
    if (!mouth) return null;
    const size = opts.size || Math.round(R(L5.band.size[0], L5.band.size[1]));
    const band = { id: ++this.bandN, members: [], mouth, s: 'in', t: 0, think: 0.2, goal: null, wp: null, via: null, kind: opts.kind || 'car', only: opts.only || null, acted: false, turned: false, lit: 0 };
    band.calm = this._script(band, false); band.live = this._script(band, true);
    for (let j = 0; j < size; j++) {
      const n = this._take(); if (!n) break;
      this._enterRunner(n, band, mouth.side * (24.6 - (j % 3) * 0.9), mouth.z + ((j % 4) - 1.5) * 1.1, j);
    }
    if (!band.members.length) return null;
    this.bands.push(band); this.stats.bands++;
    if (!this._plan(band)) this._turn(band, false);
    if (!opts.quiet) { g.hud.alert(`A band out of ${mouth.name} · ${mouth.side < 0 ? 'west' : 'east'} bank`, 'warn', 3, 'band'); g.audio.ui('alert'); }
    return band;
  }

  _enterRunner(n, band, x, z, j) {
    const c = this.game.crowd;
    n.pos.set(x, 0, z); n.anchor.copy(n.pos); n.target.copy(n.pos); n.vel.set(0, 0, 0); n.knock.set(0, 0, 0);
    n.temperament = 'scripted'; n.attackStyle = null; n.script = band.calm; n.untargetable = false;
    n.neutralized = false; n.arrested = false; n.surrendered = false; n.hp = L5.band.hp; n.hitCount = 0; n.copHits = 0;
    n.fear = 0; n.stimuli.length = 0; n.surge = null; n.gasT = 0; n.role = 'watch'; n.speedMul = 0.95 + Math.random() * 0.12;
    n.heading = band.mouth.side > 0 ? -Math.PI / 2 : Math.PI / 2; n.rig.root.visible = true; n.rig.pose = newPose(); n.l5 = 'runner';
    n.rn = { band, j, s: 'run', wp: null, wi: 0, ox: R(-1.1, 1.1), oz: R(-1.3, 1.3), cool: R(...L5.band.bottle), at: null, t: 0, reT: 0, throwT: 0, exit: null, tgt: null };
    clearItem(n.rig);
    c.setState(n, 'walk'); n.dur = 1e9;
    band.members.push(n);
    return n;
  }

  // choose what the band goes for and the way there: a car nobody stands by, across a bridge
  // nobody holds (the far bank first), or the pompiers at their hose
  _plan(band) {
    const g = this.game, lead = this._alive(band)[0];
    if (!lead) return false;
    // (a band that knows only one way over finds out at the bridge whether it is held)
    const ok = (br) => (band.only ? br.id === band.only && !band.seen : !this._held(br));
    const len = (r) => { let d = 0, x = lead.pos.x, z = lead.pos.z; for (const [a, b] of r) { d += dist(x, z, a, b); x = a; z = b; } return d; };
    let best = null, bc = 1e9;
    if (band.kind === 'crew') {
      const at = [Q.crew[0][0] + 2.2, Q.crew[0][1] - 1.4];
      if (this.eng.s === 'work' && !this._guarded(at[0], at[1], 9)) { const r = route(lead.pos, { x: at[0], z: at[1] }, ok); if (r) best = { goal: { kind: 'crew', at }, r, via: route.via }; }
      if (!best) band.kind = 'car';
    }
    if (!best) for (const v of this.D.cars) {
      if (!g.burn.canIgnite(v) || this._guarded(v.x, v.z, L5.guardR)) continue;
      if (band.only && bankOf(v.x) === band.mouth.side) continue;
      if (this.bands.some((b) => b !== band && b.goal && b.goal.v === v)) continue;
      const at = [bankOf(v.x) * (Q.carX - 2.1), v.z], r = route(lead.pos, { x: at[0], z: at[1] }, ok);
      if (!r) continue;
      const c = len(r) * (bankOf(v.x) !== band.mouth.side ? 0.55 : 1) + R(0, 30);
      if (c < bc) { bc = c; best = { goal: { kind: 'car', v, at }, r, via: route.via }; }
    }
    if (!best) return false;
    band.goal = best.goal; band.wp = best.r; band.via = best.via;
    for (const n of this._alive(band)) if (n.rn.s === 'run') { n.rn.wp = band.wp; n.rn.wi = 0; }
    return true;
  }

  // they give it up and leave. score: they had not acted and it was our standing there that did it
  _turn(band, score = true) {
    if (band.s === 'out' || band.s === 'gone') return;
    const first = !band.acted && !band.turned;
    band.s = 'out'; band.turned = true; band.t = 0;
    for (const n of this._alive(band)) this._sendOut(n);
    if (first && score) {
      this.stats.turned++;
      this.addScore(100, 'Band turned back');
      this.game.hud.alert('They found it held and turned back', 'good', 2.4, 'turn');
      if (this.section >= 1) this.say('rule', 1);
    }
  }

  // shown for what it is: from here its members are suspects (red ring, officers go for them)
  _goLive(band) {
    if (band.acted) return;
    band.acted = true;
    for (const n of this._alive(band)) { n.script = band.live; n.temperament = 'hostile'; n.lastAggro = this.game.crowd.time; }
  }

  // the way out: the nearest side street nobody is standing at, by bridges nobody holds
  _sendOut(n) {
    const rn = n.rn, band = rn.band;
    let best = null, bc = 1e9;
    for (const m of Q.mouths) {
      if (band.forceExit && m !== band.forceExit) continue;
      const [mx, mz] = this._mouthAt(m);
      const r = route(n.pos, { x: mx, z: mz }, (br) => !this._held(br));
      if (!r) continue;
      let c = 0, x = n.pos.x, z = n.pos.z;
      for (const [a, b] of r) { c += dist(x, z, a, b); x = a; z = b; }
      if (this._guarded(m.side * 20, m.z, 9)) c += 70;
      if (c < bc) { bc = c; best = { m, r }; }
    }
    if (!best) { const m = Q.mouths.filter((o) => o.side === bankOf(n.pos.x)).sort((a, b) => Math.abs(a.z - n.pos.z) - Math.abs(b.z - n.pos.z))[0]; best = { m, r: [[m.side * Q.lane, m.z], this._mouthAt(m)] }; }
    best.r.push([best.m.side * 25.2, best.m.z]);
    rn.s = 'out'; rn.wp = best.r; rn.wi = 0; rn.exit = best.m; rn.reT = 2.5; rn.at = null;
    if (n.state.startsWith('arson')) { clearItem(n.rig); this.game.crowd.setState(n, 'walk'); n.dur = 1e9; }
  }
  _gone(n) {
    const band = n.rn.band;
    if (n.script === band.live) this.stats.escaped++;
    this.game.crowd.retire(n);
    n.rn = null; n.l5 = 'pool';
    this.pool.unshift(n);
  }

  _runMove(n) {
    const st = n.state, rn = n.rn;
    if (!rn || st === 'stagger' || st === 'down' || st === 'recover' || st === 'surrender' || st === 'arrested' || st.startsWith('arson')) return null;
    const live = n.script === rn.band.live;
    if (rn.s === 'wait' || rn.s === 'guard') {
      if (!rn.at || dist(n.pos.x, n.pos.z, rn.at[0], rn.at[1]) < 0.7) return { speed: 0 };
      return { speed: 2.4, dest: this._v.set(rn.at[0], 0, rn.at[1]) };
    }
    if (rn.s === 'arson') return rn.at ? { speed: L5.band.jog, dest: this._v.set(rn.at[0], 0, rn.at[1]) } : { speed: 0 };
    if (rn.s === 'harass' && rn.tgt) return { speed: L5.band.run, dest: this._v.copy(rn.tgt.pos) };
    const wp = rn.wp && rn.wp[rn.wi];
    if (!wp) return { speed: 0 };
    const k = Math.abs(wp[0]) < 9.6 || Math.abs(wp[0]) > Q.carX - 1 ? 0.2 : 1; // close up on a bridge and between the cars
    const sp = (rn.s === 'out' && (live || rn.band.turned) ? L5.band.run : L5.band.jog) * n.speedMul;
    return { speed: sp, dest: this._v.set(wp[0] + rn.ox * k, 0, wp[1] + rn.oz * k) };
  }

  _runTick(n, band, dt) {
    const g = this.game, c = g.crowd, rn = n.rn;
    if (!rn) return;
    n.stimuli.length = 0; n.fear = 0;
    const st = n.state;
    if (st === 'arrested') return;
    if (n.neutralized) {
      if (n.script === band.live) { n.script = band.calm; rn.was = true; } // on the ground: no longer anyone's target
      if (st === 'down' || st === 'recover' || st === 'surrender') return;
      // let up without being arrested: he has had enough, and walks off
      n.neutralized = false; n.surrendered = false; n.script = band.calm; n.temperament = 'scripted';
      c.setState(n, 'walk'); n.dur = 1e9;
      this._sendOut(n);
      return;
    }
    if (st === 'stagger' || st === 'down' || st === 'recover') {
      // an officer's baton: the second blow puts a runner on the ground
      if (st === 'stagger' && (n.copHits || 0) >= 2 && n.script === band.live) {
        n.copHits = 0; n.fallDir = -1; n.neutralized = true;
        c.setState(n, 'down', 7);
        this.stats.neutralized++; this.addScore(50, 'Officer assist');
      }
      return;
    }
    const live = n.script === band.live;
    if (live) { n.temperament = 'hostile'; n.lastAggro = c.time; }
    if (!st.startsWith('arson') && st !== 'walk' && !(st === 'act' && (rn.s === 'wait' || rn.s === 'guard'))) { c.setState(n, 'walk'); n.dur = 1e9; }
    rn.t += dt; rn.throwT = Math.max(0, rn.throwT - dt);
    // gas shifts anyone standing in it
    if (rn.s !== 'out' && g.events.gasClouds.some((k) => dist(k.pos.x, k.pos.z, n.pos.x, n.pos.z) < 6)) { if (band.s === 'in' || band.s === 'act') this._turn(band, false); else if (band === this.lockBand) this._lockScatter(false); }
    // bottles at whoever of ours is in range, once the band has shown itself
    if (live && (rn.s === 'guard' || rn.s === 'out' || rn.s === 'wait')) {
      rn.cool -= dt;
      if (rn.cool <= 0) { rn.cool = R(...L5.band.bottle) * (rn.s === 'wait' ? 1.3 : 1); const tg = this._nearestOfficer(n.pos.x, n.pos.z, 15); if (tg && dist(tg.pos.x, tg.pos.z, n.pos.x, n.pos.z) > 4.5) this._throwAt(n, tg); }
    }
    if (rn.s === 'run' || rn.s === 'out') {
      const wp = rn.wp && rn.wp[rn.wi];
      if (wp && dist(n.pos.x, n.pos.z, wp[0], wp[1]) < (rn.wi === rn.wp.length - 1 ? 1.3 : 2.4)) rn.wi++;
      if (rn.s === 'out') {
        if (Math.abs(n.pos.x) > 23.6 || !rn.wp[rn.wi]) { this._gone(n); return; }
        rn.reT -= dt;
        if (rn.reT <= 0 && Math.abs(n.pos.x) < 19) { const wi = rn.wi, ex = rn.exit; this._sendOut(n); if (rn.exit === ex) rn.wi = Math.min(wi, rn.wp.length - 1); }
      }
    } else if (rn.s === 'arson') this._arson(n, band, dt);
    else if (rn.s === 'harass') {
      const p = rn.tgt;
      if (!p || band.s !== 'act') this._sendOut(n);
      else if (dist(n.pos.x, n.pos.z, p.pos.x, p.pos.z) < 1.5) { g.audio.impact(p.pos, false); this._crewHit(); this._sendOut(n); }
    } else if ((rn.s === 'wait' || rn.s === 'guard') && rn.at && dist(n.pos.x, n.pos.z, rn.at[0], rn.at[1]) < 0.8 && st === 'walk') {
      c.setState(n, 'act', 1e9);
      const tg = this._nearestOfficer(n.pos.x, n.pos.z, 40); if (tg) n.focus.copy(tg.pos);
    }
  }

  // at the car: the lighter, the bottle, and it goes through the window
  _arson(n, band, dt) {
    const g = this.game, c = g.crowd, rn = n.rn, v = band.goal.v;
    if (!n.state.startsWith('arson')) {
      if (dist(n.pos.x, n.pos.z, rn.at[0], rn.at[1]) > 1.0) return;
      giveItem(n.rig, 'bottle'); n.focus.set(v.x, 0, v.z);
      c.setState(n, 'arson_light', 1e9); rn.t = 0;
      g.audio.lighter(n.pos);
      return;
    }
    if (n.state === 'arson_light' && rn.t > 1.9) { c.setState(n, 'arson_wind', 1e9); rn.t = 0; }
    else if (n.state === 'arson_wind' && rn.t > 0.55) {
      clearItem(n.rig);
      c.setState(n, 'walk'); n.dur = 1e9;
      g.audio.swing(n.pos, true);
      g.effects.throwProjectile(n.pos.clone().setY(1.9), V(v.x, 0.9, v.z), 'petrol', () => { if (g.burn.ignite(v)) this._onLit(v, false); g.audio.glass(V(v.x, 1, v.z), 0.8); g.crowd.disturb(V(v.x, 0, v.z), 14, 0.8, 'explosion'); }, 0.45);
      band.lit++;
      this._sendOut(n);
    }
  }
  _runStruck(n, band) {
    const rn = n.rn;
    if (!rn) return;
    if (n.state.startsWith('arson')) {
      clearItem(n.rig);
      this.stats.arsonStopped++;
      this.addScore(200, 'Arson stopped');
      this.game.hud.alert('Bottle dropped — the car is safe', 'good', 2.4);
    }
    if (n.script === band.calm && !band.turned) this._turn(band, false); // struck for nothing: the rest run
    else if (rn.s !== 'out' && band !== this.lockBand) this._sendOut(n);
  }
  _runPose(n, P, t) {
    const rn = n.rn;
    if (!rn) return 0;
    if (rn.throwT > 0) { const k = rn.throwT / 0.5; P.shRX = -2.6 * k - 0.4 * (1 - k); P.elR = -1.2 * k; P.spY = -0.4 * k + 0.3 * (1 - k); return 22; }
    if (rn.s === 'out' && n.speed > 3) {
      // running, and looking back over the shoulder for whoever is behind
      P.spX += 0.1;
      const tg = this._nearestOfficer(n.pos.x, n.pos.z, 16);
      if (tg && Math.sin(t * 2.1 + n.id) > 0.1) {
        let rel = Math.atan2(tg.pos.x - n.pos.x, tg.pos.z - n.pos.z) - n.heading;
        while (rel > Math.PI) rel -= Math.PI * 2; while (rel < -Math.PI) rel += Math.PI * 2;
        if (Math.abs(rel) > 1.7) { const s = Math.sign(rel); P.hdY += s * 1.15; P.spY += s * 0.35; P.brow = -0.6; P.mouth = 0.5; }
      }
    }
    return 0;
  }

  _throwAt(n, tg) {
    const g = this.game, from = n.pos.clone().setY(n.pos.y + 1.9);
    const aim = V(tg.pos.x + R(-1.2, 1.2), 1.2, tg.pos.z + R(-1.2, 1.2));
    n.rn.throwT = 0.5;
    const proj = g.effects.throwProjectile(from, aim, 'bottle', (pos, p, hitPlayer) => {
      if (hitPlayer) g.player.takeDamage(L5.band.bottleDmg, from, null, true);
      g.audio.glass(pos, 0.7); g.effects.dust(pos, 4);
      for (const o of this.squad) if (!o.down && dist(pos.x, pos.z, o.p.pos.x, o.p.pos.z) < 1.0) this._officerHit(o, 1, from, true);
      if (this.eng.s === 'work' && this.pompiers.some((q) => q.state !== 'gone' && dist(pos.x, pos.z, q.pos.x, q.pos.z) < 2.2)) this._crewHit();
    });
    proj.check = (pos) => g.player.hitTest(pos);
    g.audio.swing(n.pos);
  }

  _bandUpdate(band, dt) {
    const alive = this._alive(band);
    band.t += dt;
    if (!band.members.some((n) => n.rn && n.rn.band === band && n.state !== 'gone' && !n.arrested)) { band.s = 'gone'; return; }
    if (band === this.lockBand) return;
    band.think -= dt;
    if (band.think > 0 || !alive.length) return;
    band.think = 0.35;
    const lead = alive[0], G = band.goal;
    if (band.s === 'in') {
      // someone of ours in the way: no point going on
      if (!band.acted && this._nearestOfficer(lead.pos.x, lead.pos.z, L5.band.spot)) { this._turn(band); return; }
      const crossed = bankOf(lead.pos.x) === bankOf(G.at[0]) && Math.abs(lead.pos.x) > Q.water + 0.5;
      // a held bridge is seen from its approach, not from the far end of the quay
      const sees = !crossed && band.via && this._held(band.via) && dist(lead.pos.x, lead.pos.z, bankOf(lead.pos.x) * 9, band.via.z) < 22;
      if (sees) band.seen = true;
      const lost = sees || (G.kind === 'car' ? (!this.game.burn.canIgnite(G.v) || this._guarded(G.v.x, G.v.z, L5.guardR - 3)) : this._guarded(G.at[0], G.at[1], 8));
      if (lost && !this._plan(band)) { this._turn(band); return; }
      if (dist(lead.pos.x, lead.pos.z, G.at[0], G.at[1]) < 4.5) {
        band.s = 'act'; band.t = 0;
        this._goLive(band);
        const near = alive.slice().sort((a, b) => dist(a.pos.x, a.pos.z, G.at[0], G.at[1]) - dist(b.pos.x, b.pos.z, G.at[0], G.at[1]));
        near.forEach((n, i) => {
          const rn = n.rn;
          if (G.kind === 'car') {
            if (i < 2) { rn.s = 'arson'; rn.at = [G.v.x - bankOf(G.v.x) * 1.9, G.v.z + (i ? 1.1 : -1.1)]; }
            else { rn.s = 'guard'; rn.at = [G.at[0] - bankOf(G.at[0]) * R(0.5, 2.5), G.at[1] + R(-4, 4)]; rn.cool = R(1, 4); }
          } else { rn.s = 'harass'; rn.tgt = this.pompiers[i % 2]; }
        });
        this.game.hud.alert(G.kind === 'car' ? 'They are lighting a car!' : 'They are going for the fire crew!', 'bad', 2.6, 'act');
        this.game.audio.ui('alert');
      }
    } else if (band.s === 'act') {
      const busy = alive.some((n) => n.rn.s === 'arson' || n.rn.s === 'harass');
      if (!busy || band.t > 10) { band.s = 'out'; for (const n of alive) if (n.rn.s !== 'out') this._sendOut(n); }
    }
  }

  // ------------------------------------------------------------- fires
  _onLit(v, spread) {
    this.lit.set(v, { spreadT: L5.fire.spread, lost: false, spread: false });
    this.stats.fires++;
    if (spread) { this.stats.spread++; this.addScore(-50, 'Fire spread'); this.game.hud.alert('The fire has spread to the next car', 'bad', 2.6, 'spread'); }
    this.say('spread', 1, 150);
  }
  _douse(v, o) {
    const g = this.game;
    if (!g.burn.extinguish(v)) return;
    this.lit.delete(v);
    this.stats.firesOut++;
    this.addScore(150, 'Fire put out');
    g.effects.dust(V(v.x, 1.2, v.z), 14, 0xd8dde0);
    g.audio.hiss(V(v.x, 1, v.z), 1.2);
    g.hud.alert(o ? `${o.name}: "Fire is out."` : 'Fire out', 'good', 2);
  }
  // extinguisher powder, or the hose's water
  _spray(from, to, dt, water = false) {
    const fx = this.game.effects, d = to.clone().sub(from), len = d.length() || 1;
    d.multiplyScalar(1 / len);
    const n = water ? 3 : 1;
    for (let i = 0; i < n; i++) if (Math.random() < dt * 60 * (water ? 0.9 : 0.5)) {
      const sp = water ? Math.max(9, len * 1.5) : 5;
      fx.smoke.spawn({ pos: from.clone(), vel: V(d.x * sp + R(-0.6, 0.6), d.y * sp + (water ? 3.2 : 0.6) + R(-0.4, 0.4), d.z * sp + R(-0.6, 0.6)), size: water ? 0.22 : 0.3, grow: water ? 2.2 : 3, life: water ? len / sp + 0.15 : 0.8, alpha: water ? 0.5 : 0.4, color: water ? new THREE.Color(0.72, 0.82, 0.92) : new THREE.Color(0.88, 0.88, 0.86), drag: water ? 0.2 : 2, grav: water ? 6 : 0, windK: 0.2 });
    }
  }
  _fires(dt) {
    const g = this.game, F = L5.fire;
    for (const b of g.burn.burning.values()) b.spreadT = 99; // this level's own rule decides what spreads
    for (const [v, f] of this.lit) {
      const b = g.burn.burning.get(v.id);
      if (!b) { if (!f.lost) { f.lost = true; this.stats.burnt++; } this.lit.delete(v); continue; }
      if (b.stage === 'smoulder' && !f.lost) {
        f.lost = true; this.stats.burnt++;
        this.addScore(-100, 'Car burnt out');
        g.hud.alert('A car has burnt out', 'bad', 2.2, 'burnt');
      }
      if (b.stage !== 'blaze' || f.spread) continue; // (each car passes it on once)
      if (this._guarded(v.x, v.z, F.guard)) { f.spreadT = F.spread; continue; }
      f.spreadT -= dt;
      if (f.spreadT > 0) continue;
      f.spreadT = F.spread;
      const o = this.D.cars.filter((q) => q !== v && g.burn.canIgnite(q) && Math.abs(q.x - v.x) < 3 && Math.abs(q.z - v.z) < (v.L + q.L) / 2 + 3.4).sort((a, b2) => Math.abs(a.z - v.z) - Math.abs(b2.z - v.z))[0];
      if (o && g.burn.ignite(o)) { f.spread = true; this._onLit(o, true); }
    }
    if (this.stats.burnt >= F.fail && !this.ended) this.fail('The quays burned: fourteen cars were lost.');
  }

  // ------------------------------------------------------------- the fire engine (Beat 3)
  _clearBlaze() {
    if (this.blaze) for (const f of this.blaze) this.game.effects.removeFire(f);
    this.blaze = null;
  }
  _engineStart(parked = false) {
    const g = this.game, B = Q.blaze, E = this.eng;
    this._clearBlaze();
    this.blaze = [[2.6, 1.9, 0], [5.8, 1.5, 2.6], [8.9, 1.2, -2.2]].map(([y, s, dz]) => { const f = g.effects.addFire(V(B.x + 0.5, y, B.z + dz), s, 2.6, { own: true }); f.base = s; return f; });
    g.effects.explosion(V(B.x + 1, 2, B.z), 0.9);
    g.audio.glass(V(B.x, 2, B.z), 1); g.audio.molotov(V(B.x, 2, B.z), 1.2);
    g.crowd.disturb(V(B.x, 0, B.z), 22, 0.9, 'explosion');
    Object.assign(E, { s: parked ? 'deploy' : 'drive', t: 0, work: 0, retreatT: 0, lost: false, wasBack: false });
    this.D.setEngine(parked ? Q.engine.at : Q.engine.from, true);
    if (!parked) g.audio.horn(V(Q.engine.x, 2, Q.engine.from));
    if (parked) this._deploy();
  }
  _deploy() {
    this.pompiers.forEach((n, i) => {
      this._place(n, Q.engine.x - 1.7, Q.engine.at - 1 + i * 1.3, this.POMP, 'walk', -Math.PI / 2);
      n.pm = { i, post: Q.crew[i], shelter: Q.shelter[i] };
    });
  }
  _atPost(n) { return n.pm && this.eng.retreatT <= 0 && dist(n.pos.x, n.pos.z, n.pm.post[0], n.pm.post[1]) < 0.9; }
  _pompTick(n) {
    const c = this.game.crowd, B = Q.blaze;
    n.stimuli.length = 0; n.fear = 0;
    if (!n.pm) return;
    const at = this.eng.retreatT > 0 ? n.pm.shelter : n.pm.post, d = dist(n.pos.x, n.pos.z, at[0], at[1]);
    if (d > 0.6 && n.state !== 'walk') { c.setState(n, 'walk'); n.dur = 1e9; }
    else if (d <= 0.6 && n.state !== 'act') { c.setState(n, 'act', 1e9); }
    if (n.pm.i < 2) n.focus.set(B.x, 0, B.z); else n.focus.set(Q.engine.x, 0, Q.engine.at - 1.9);
  }
  _pompMove(n) {
    if (!n.pm) return { speed: 0 };
    const at = this.eng.retreatT > 0 ? n.pm.shelter : n.pm.post;
    return { speed: this.eng.retreatT > 0 ? 4.4 : 2.6, dest: this._v.set(at[0], 0, at[1]) };
  }
  _pompPose(n, P, t) {
    if (!n.pm || n.state !== 'act') return 0;
    if (this.eng.retreatT > 0) { crouch(P, 0.9); P.shLX = P.shRX = -2.2; P.elL = P.elR = -1.9; P.hdX += 0.3; return 10; }
    if (this.eng.s !== 'work') return 0;
    if (n.pm.i < 2) {
      // the two on the hose: braced against it, the branch held low at the hip
      const k = n.pm.i ? 0.8 : 1, sway = Math.sin(t * 1.3 + n.pm.i) * 0.04;
      P.shRX = -0.95 * k; P.elR = -0.9; P.shLX = -1.25 * k; P.elL = -0.5; P.shLZ = 0.25; P.shRZ = -0.15;
      P.spX += 0.18 + sway; P.spY += n.pm.i ? 0.25 : -0.15; P.hpLX = -0.35; P.knL = 0.35; P.hpRX = 0.25; P.knR = 0.2; P.y -= 0.06; P.hdX -= 0.15;
    } else { P.shRX = -1.3; P.elR = -0.5; P.spX += 0.08; P.hdY += Math.sin(t * 0.5) * 0.5; } // at the pump, watching the street
    return 0;
  }
  _crewHit() {
    const E = this.eng;
    if (E.s !== 'work' || E.retreatT > 0) return;
    E.retreatT = L5.engine.retreat; E.wasBack = true;
    this.stats.crewStruck++;
    this.addScore(-100, 'Fire crew hit');
    this.game.hud.alert('The fire crew has been hit — they are pulling back', 'bad', 3);
    this.say('crewHit', 2, 20);
  }
  _engineUpdate(dt) {
    const g = this.game, E = this.eng, D = this.D, K = L5.engine;
    if (E.s === 'none' || E.s === 'done') return;
    E.t += dt;
    if (E.s === 'drive') {
      const u = Math.min(1, E.t / K.drive), e = u * u * (3 - 2 * u);
      D.setEngine(Q.engine.from + (Q.engine.at - Q.engine.from) * e, true);
      if (u >= 1) { E.s = 'deploy'; E.t = 0; this._deploy(); g.audio.hiss(V(Q.engine.x, 1, Q.engine.at), 0.8); this.say('engineHint'); }
      return;
    }
    if (E.retreatT > 0) { E.retreatT -= dt; if (E.retreatT <= 0) this.say('crewBack', 1, 10); }
    const on = this.pompiers.filter((n) => this._atPost(n)).length;
    if (E.s === 'deploy' && on >= 2) { E.s = 'work'; E.t = 0; }
    D.hose.visible = E.s === 'work' && this._atPost(this.pompiers[0]);
    if (E.s !== 'work') return;
    if (on >= 2 && D.hose.visible) {
      E.work += dt;
      const f = this.blaze[Math.floor(g.time * 0.4) % this.blaze.length];
      this._spray(D.nozzle, f.pos, dt, true);
    }
    const k = clamp(E.work / K.work, 0, 1);
    for (const f of this.blaze) { f.scale = f.base * (1 - 0.8 * k); f.smoke.rate = 2.6 - 1.4 * k; }
    if (E.work >= K.work) {
      E.s = 'done'; this._clearBlaze(); D.hose.visible = false;
      this.stats.building = 1;
      this.addScore(500, 'Building saved');
      this.say('saved', 2);
      g.effects.dust(V(Q.blaze.x + 1, 3, Q.blaze.z), 20, 0xd8dde0);
    } else if (this.stageT > K.maxT && this.section === 2) { E.s = 'done'; E.lost = true; D.hose.visible = false; this.addScore(-300, 'The shop burnt out'); this.say('lost', 2); }
  }

  // ------------------------------------------------------------- the lock (Beat 4)
  _lockStart() {
    const lk = Q.lock, [yx, yz] = lk.yard;
    const band = { id: ++this.bandN, members: [], mouth: Q.mouths.find((m) => m.lock), s: 'wait', t: 0, think: 0, goal: null, kind: 'lock', acted: true, turned: false, lit: 0 };
    band.calm = this._script(band, false); band.live = this._script(band, true);
    band.forceExit = band.mouth;
    for (let j = 0; j < L5.lock.size; j++) {
      const n = this._take(); if (!n) break;
      const a = (j / L5.lock.size) * Math.PI * 2, r = 2.6 + (j % 3) * 0.9;
      this._enterRunner(n, band, clamp(yx + Math.cos(a) * r, 8.6, 15.4), clamp(yz + Math.sin(a) * r, lk.z0 + 2, -560.5), j);
      n.script = band.live; n.temperament = 'hostile'; n.rn.s = 'wait'; n.rn.at = [n.pos.x, n.pos.z]; n.rn.cool = R(4, 12);
    }
    this.bands.push(band); this.stats.bands++;
    this.lockBand = band; this.lockS = 'wait';
  }
  // the way out is shut while an officer is posted at its mouth, or the player stands in it
  _passageHeld() {
    const m = this.lockBand.mouth, p = this.game.player.pos;
    if (p.x > 17 && Math.abs(p.z - m.z) < 5) return true;
    return this.squad.some((o) => !o.down && o.order === 'hold' && dist(o.p.pos.x, o.p.pos.z, m.side * 20, m.z) < 8.5);
  }
  _lockScatter(clean) {
    const band = this.lockBand;
    if (!band || this.lockS !== 'wait') return;
    this.lockS = 'out'; band.s = 'out'; band.t = 0;
    for (const n of this._alive(band)) this._sendOut(n);
    this.stats.lockScattered = 1;
    if (clean) this.addScore(600, 'They scattered — no fight');
    this.say('scatter', 2);
  }
  _lockUpdate(dt) {
    const g = this.game, band = this.lockBand;
    if (!band || this.lockS === 'done') return;
    const lk = Q.lock, alive = this._alive(band);
    if (this.lockS === 'wait') {
      // they run when someone of ours walks up and the passage is open; with it shut and the
      // officer in sight there is nowhere to run to
      const pl = g.player.pos, pd = pl.x > Q.water ? dist(pl.x, pl.z, lk.yard[0], lk.yard[1]) : 1e9, held = this._passageHeld();
      const close = pd < L5.lock.near || this.squad.some((o) => !o.down && dist(o.p.pos.x, o.p.pos.z, lk.yard[0], lk.yard[1]) < 8);
      if (this.stageT > L5.lock.maxT) this._lockScatter(false);
      else if (close || (held && pd < L5.lock.sight)) {
        if (!held) this._lockScatter(true);
        else {
          // nowhere to go: every one of them turns and fights
          this.lockS = 'fight'; band.s = 'fight';
          this.stats.lockFight = 1;
          this.say('cornered', 2);
          g.hud.alert('CORNERED — they are fighting', 'bad', 3);
          alive.forEach((n, j) => { n.rn = null; n.script = null; n.l5 = 'fighter'; clearItem(n.rig); g.crowd.makeHostile(n, j % 5 === 4 ? 'thrower' : 'melee', 'squad'); n.hp = 3; });
          this.fighters = alive;
        }
      }
    } else if (this.lockS === 'fight') {
      const left = this.fighters.filter((n) => !n.neutralized && !n.arrested && n.temperament === 'hostile' && n.state !== 'gone');
      // the way out opens again: those still on their feet take it
      if (left.length && !this._passageHeld() && (this.lockOpenT = (this.lockOpenT || 0) + dt) > 3) {
        for (const n of left) { if (n.state === 'down' || n.state === 'stagger' || n.state === 'recover') continue; n.rn = { band, j: 0, s: 'out', wp: null, wi: 0, ox: 0, oz: 0, cool: 9, at: null, t: 0, reT: 0, throwT: 0 }; n.script = band.live; g.crowd.setState(n, 'walk'); n.dur = 1e9; this._sendOut(n); }
      } else if (this._passageHeld()) this.lockOpenT = 0;
      if (!left.length && !this.fighters.some((n) => n.rn)) this._lockDone();
    } else if (this.lockS === 'out' && (band.s === 'gone' || !alive.length || band.t > 25)) this._lockDone();
  }
  _lockDone() {
    if (this.lockS === 'done') return;
    this.lockS = 'done'; this.stage = 'victory';
    for (const b of this.bands) for (const n of b.members) if (n.rn && n.rn.s !== 'out' && !n.neutralized && !n.arrested) this._sendOut(n);
    this.say('done', 2);
    const g = this.game, mid = () => V(6, 0, Q.lock.z0 + 6);
    g.playCinematic({
      id: 'quaysEnd', title: 'THE CANAL IS QUIET', sub: 'Écluses du Temple · 04h21', titleAt: [0.5, 4.0], sting: 'victory',
      lines: [[this.stats.lockFight ? 'They were cornered, and they fought.' : 'They were left a way out, and they took it.', 0.6, 2.6], [`${this.stats.squad} of four officers on their feet.`, 2.7, 4.4]],
      shots: [{ dur: 4.6, a: orbit(mid, 16, 4, 3.6, 50, 1.2), b: orbit(mid, 19, 6, 2.9, 54, 1.2) }],
      onDone: () => this.complete(),
    });
  }

  // ------------------------------------------------------------- beats
  _startBeat(i, jumped = false) {
    const g = this.game;
    this.section = i; this.phase = i; this.stage = 'b' + i; this.stageT = 0; this.musicTier = i;
    g.hud.titleCard(i === 0 ? 'THE QUAYS' : L5_PHASES[i], `Canal Saint-Martin · ${['04h05', '04h08', '04h14', '04h18'][i]}`, i === 0 && !jumped ? 3.5 : 2.6);
    if (jumped) for (let k = 0; k < i; k++) this.completed[k] = true;
    if (i === 0) {
      this.say('start'); this.say('hold');
      if (!jumped) this._introCinematic();
    } else if (i === 1) {
      this.waveT = L5.waves.first; this.waveEvery = L5.waves.every;
      this.say('wave');
    } else if (i === 2) {
      this.waveT = 22; this.waveEvery = L5.engine.every;
      this._engineStart(false);
      this.say('engine', 2);
    } else if (i === 3) {
      this.waveT = 1e9;
      for (const b of this.bands) if (b.s === 'in') this._turn(b, false);
      this._lockStart();
      this.say('lock', 2); this.say('lockHint');
    }
  }
  _beatDone(i, bonus, text) { if (!this.completed[i]) this._phaseDone(i, bonus, text); }

  // Beat 1: two posted on the first footbridge, the officer across, and the band that finds it held
  _b0(dt) {
    const T = this.tut, A = Q.bridges[0], p = this.game.player.pos;
    const posted = this.squad.filter((o) => !o.down && o.order !== 'follow' && Math.hypot(Math.max(0, Math.abs(o.post.x) - 9), o.post.z - A.z) < L5.heldR).length;
    if (!T.posted && posted >= 2) { T.posted = true; T.bandT = Math.min(T.bandT, 5); this.say('follow'); this.addScore(100, 'Bridge held'); }
    if (p.x < -Q.water) T.crossed = true;
    T.bandT -= dt;
    if (!T.band && T.bandT <= 0) {
      T.band = this._spawnBand({ mouth: Q.mouths[0], size: 5, only: 'A', quiet: true }) || 'none';
      if (T.band !== 'none') this.say('tutBand', 2);
    }
    const gone = T.band && (T.band === 'none' || T.band.s === 'gone' || (T.band.s === 'out' && T.band.t > 5));
    if (gone && T.band !== 'none' && T.band.turned && !T.band.acted) this.say('turned');
    if ((gone && (T.crossed || this.stageT > 110)) || this.stageT > L5.beat0.maxT) {
      this._beatDone(0, 400, T.posted ? 'First bridge held' : 'On to the quays');
      this._startBeat(1);
    }
  }
  _b1() {
    if (this.stageT > L5.beat1.T) { this._beatDone(1, 600, 'Both quays held through the worst of it'); this._startBeat(2); }
  }
  _b2() {
    if (this.eng.s !== 'done') return;
    this._beatDone(2, 600, this.eng.lost ? 'The fire crew is done here' : 'The fire is out');
    this._startBeat(3);
  }
  _b3() { /* the lock runs itself (_lockUpdate) */ }

  _waves(dt) {
    this.waveT -= dt;
    if (this.waveT > 0) return;
    const active = this.bands.filter((b) => b.s === 'in' || b.s === 'act').length;
    if (active >= L5.waves.max) { this.waveT = 6; return; }
    const kind = this.section === 2 && this.eng.s === 'work' && Math.random() < 0.6 ? 'crew' : 'car';
    const b = this._spawnBand({ kind });
    this.waveT = b ? R(...this.waveEvery) : 5;
  }

  resume(cp) { this.jumpTo(cp.section || 0); }
  // ?dev&level=5&stage=N and __jump(N)
  jumpTo(i) {
    i = clamp(i | 0, 0, L5_PHASES.length - 1);
    const g = this.game;
    this.reset();
    const at = [[12, -835], [12, -792], [-12, -716], [12, -648]][i];
    g.player.pos.set(at[0], 0, at[1]); g.player.heading = 0; g.cameraRig.reset(g.player);
    this.lastHealth = g.player.health;
    this._squadTo(at[0], at[1]);
    if (i === 3) { this.D.setEngine(Q.engine.at, true); this.eng.s = 'done'; }
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
      this._squadUpdate(dt);
      this._updateMarker(dt);
      return;
    }
    this._orders(dt);
    this._squadUpdate(dt);
    for (const b of this.bands) this._bandUpdate(b, dt);
    this.bands = this.bands.filter((b) => b.s !== 'gone' || b === this.lockBand);
    this._fires(dt);
    this._engineUpdate(dt);
    if (this.stage !== 'victory' && this.stage !== 'done') {
      this._waves(dt);
      this[`_b${this.section}`](dt);
      this._lockUpdate(dt);
      this._interactions();
      if (!this._standing().length && !this.ended) this.fail('All four of your officers are down.');
    }
    this._marker();
    this.warning = false;
    this._updateMarker(dt);
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
    let key = null;
    const down = this.squad.find((o) => o.down && dist(p.x, p.z, o.p.pos.x, o.p.pos.z) < 2.4);
    const a = !down && g.crowd.arrestable(p);
    let car = null;
    if (!down && !a) for (const [v] of this.lit) { const b = g.burn.burning.get(v.id); if (b && b.stage !== 'smoulder' && dist(p.x, p.z, v.x, v.z) < 4.3) { car = v; break; } }
    if (down) { key = 'up' + down.i; this._hold(key, `Help ${down.name} up`, 1.8, () => this._revive(down)); }
    else if (a) { g.hud.prompt('E', 'Arrest suspect'); this.promptE = true; if (g.input.pressed('KeyE')) { g.crowd.arrest(a); this.onArrest(a); } }
    else if (car) {
      key = 'douse' + car.id;
      if (this._hold(key, 'Put the fire out', L5.fire.douse, () => this._douse(car, null))) this._spray(V(p.x, 1.3, p.z), V(car.x, 0.9, car.z), this.dt);
    }
    if (this.busy && this.busy.key !== key) this.busy = null;
  }

  // where the beam leads: an officer down, a fire that can still be put out, a band that has
  // shown itself, otherwise the beat's own place
  _marker() {
    const g = this.game, p = g.player.pos;
    this.markerPos = null;
    if (this.stage === 'victory' || this.stage === 'done') return;
    const down = this.squad.find((o) => o.down);
    if (down) { this.markerPos = down.p.pos; return; }
    let best = null, bd = 90;
    for (const [v] of this.lit) { const b = g.burn.burning.get(v.id); if (!b || b.stage === 'smoulder' || this.squad.some((o) => o.job && o.job.v === v)) continue; const d = dist(p.x, p.z, v.x, v.z); if (d < bd) { bd = d; best = v; } }
    if (best) { this.markerPos = V(best.x - bankOf(best.x) * 2.6, 0, best.z); return; }
    bd = 80;
    let run = null;
    for (const b of this.bands) { if (b === this.lockBand || !b.acted) continue; for (const n of this._alive(b)) { const d = dist(p.x, p.z, n.pos.x, n.pos.z); if (d < bd) { bd = d; run = n; } } }
    if (run) { this.markerPos = run.pos; return; }
    if (this.section === 0) { const A = Q.bridges[0]; this.markerPos = this.tut.posted ? V(-Q.end - 1, 0, A.z) : V(Q.end, 0, A.z); }
    else if (this.section === 2 && this.eng.s !== 'done') this.markerPos = V(Q.crew[0][0] + 3, 0, Q.crew[0][1] - 4);
    else if (this.section === 3) this.markerPos = V(Q.lock.yard[0], 0, Q.lock.z0 + 4);
  }

  // ------------------------------------------------------------- callbacks
  onArrest(n, officer = null) {
    if (!officer) return super.onArrest(n);
    this.stats.arrests++; this.stats.squadArrests++;
    this.addScore(100, 'Squad arrest');
    this.tension.onArrest();
    this.game.hud.alert(`${officer.name}: "One in custody."`, 'good', 2);
  }
  onPeacefulStruck(n) {
    this.stats.peaceful++;
    this.addScore(-150, 'Excessive force');
    this.tension.onPeacefulStruck();
    this.game.hud.alert(n.rn ? 'EXCESSIVE FORCE — they had done nothing yet' : 'EXCESSIVE FORCE — that person was no threat', 'bad', 3);
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
    const canal = () => V(0, 0, -812), sq = () => V(g.player.pos.x, 0, g.player.pos.z - 1);
    g.playCinematic({
      id: 'quaysIntro', title: 'THE QUAYS', sub: 'Canal Saint-Martin · 04h05', titleAt: [0.4, 3.4],
      lines: [['CONTROL: "They are on the canal now. In and out, over the footbridges."', 0.5, 2.8], ['CONTROL: "You have four officers and five bridges."', 2.9, 5.2]],
      shots: [{ dur: 2.8, a: orbit(canal, 34, 9, 3.3, 54, 2), b: orbit(canal, 28, 6, 3.0, 52, 2) },
        { dur: 1.8, a: orbit(sq, 7.5, 2.0, 0.5, 44, 1.2), b: orbit(sq, 6.5, 1.8, 0.1, 44, 1.2) },
        { dur: 0.9, a: orbit(sq, 6.5, 1.8, 0.1, 44, 1.2), b: 'rig' }],
    });
  }

  complete() {
    if (this.ended) return;
    this.ended = true;
    this.stage = 'done';
    this.markerPos = null; this.advMark.visible = false;
    const s = this.stats;
    this._beatDone(3, 1000, s.lockFight ? 'The lock is cleared' : 'The canal is quiet');
    s.squad = this._standing().length;
    if (s.squad) this.addScore(200 * s.squad, 'Officers standing');
    if (s.peaceful === 0 && !s.downed) this.addScore(500, 'Proportionate force');
    this.game.endGame(true);
  }
  fail(reason) { this.stats.squad = this._standing().length; super.fail(reason); }

  // the dev bot (dev.js) plays with the normal controls: where to walk, and which orders to give
  botGoal() {
    const A = Q.bridges[0];
    const p = this.game.player.pos, to = this.section === 0 && !this.tut.posted ? V(Q.end + 0.6, 0, A.z) : this.markerPos;
    if (!to) return null;
    // by the bridges, like anyone else: the next point of the way there
    const r = route(p, to);
    let i = 0;
    while (i < r.length - 1 && (dist(p.x, p.z, r[i][0], r[i][1]) < 1.6 || dist(p.x, p.z, r[i + 1][0], r[i + 1][1]) < dist(r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]))) i++;
    return i === r.length - 1 ? to : V(r[i][0], 0, r[i][1]);
  }
  botInput(I) {
    const g = this.game, p = g.player.pos, A = Q.bridges[0];
    if (g.cinematic) return false;
    this.botT -= 0.1;
    if (this.botT > 0) return false;
    if (this.section === 0 && !this.tut.posted && dist(p.x, p.z, Q.end + 0.6, A.z) < 3) { I.edges.add('Digit1'); this.botT = 1; }
    else if (this.section >= 1) {
      // one officer left on each of the two middle bridges as the bot passes, the rest kept with it
      const here = Q.bridges.find((b) => b.id !== 'A' && Math.abs(b.z - p.z) < 3 && Math.abs(p.x) < 11);
      const with_ = this.squad.filter((o) => !o.down && o.order === 'follow').length;
      if (here && with_ > 2 && !this._standing().some((o) => o.order !== 'follow' && Math.abs(o.post.z - here.z) < 6)) { I.edges.add('Digit1'); this.botT = 2; }
    }
    return false;
  }

  mapExtras(ctx, tr) {
    const g = this.game;
    const line = (x0, z0, x1, z1, col, w = 3) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(...tr(x0, z0)); ctx.lineTo(...tr(x1, z1)); ctx.stroke(); };
    // the water, then the bridges: green while one of ours holds it
    ctx.fillStyle = 'rgba(40,80,110,0.9)';
    for (const b of this.D.blocks) if (b.water) { ctx.beginPath(); const a = tr(b.x0, b.z0), c = tr(b.x1, b.z0), d = tr(b.x1, b.z1), e = tr(b.x0, b.z1); ctx.moveTo(...a); ctx.lineTo(...c); ctx.lineTo(...d); ctx.lineTo(...e); ctx.closePath(); ctx.fill(); }
    for (const b of Q.bridges) line(-Q.water, b.z, Q.water, b.z, this._held(b) ? '#34d070' : '#b9b2a4', b.road ? 6 : 4);
    for (const [v] of this.lit) { const [x, y] = tr(v.x, v.z); ctx.fillStyle = '#ff7a20'; ctx.fillRect(x - 3, y - 3, 6, 6); }
    if (this.D.engine.on) { const [x, y] = tr(Q.engine.x, this.D.engine.z); ctx.fillStyle = '#c8201c'; ctx.fillRect(x - 3, y - 5, 6, 10); }
    ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const o of this.squad) {
      const [x, y] = tr(o.p.pos.x, o.p.pos.z);
      ctx.fillStyle = '#' + RING[o.down ? 'down' : o.order].toString(16).padStart(6, '0');
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b0d10'; ctx.fillText(o.name[0], x, y + 0.5);
    }
    void g;
  }

  hudInfo() {
    const i = Math.min(this.section, L5_PHASES.length - 1), s = this.stats;
    const info = { label: 'BEAT', index: i, phaseName: L5_PHASES[i], text: '', status: 'active', chip: 'PATROL', detail: '', bar: null, completed: this.completed };
    if (this.stage === 'intro') return Object.assign(info, { text: 'Quai de Jemmapes', chip: 'STANDBY', status: 'calm', detail: 'Radio traffic incoming…' });
    if (this.stage === 'victory' || this.stage === 'done') return Object.assign(info, { text: 'The canal is quiet', chip: 'DONE', status: 'done', detail: `${s.squad} of 4 officers standing` });
    const up = this._standing(), withYou = up.filter((o) => o.order === 'follow').length, held = Q.bridges.filter((b) => this._held(b)).length;
    const burning = [...this.lit.values()].filter((f) => !f.lost).length;
    const base = `Squad ${withYou} with you · ${up.length - withYou} posted${up.length < 4 ? ` · ${4 - up.length} down` : ''} · bridges held ${held}/5${burning ? ` · ${burning} burning` : ''}`;
    if (up.length < 4 && this.squad.some((o) => o.down)) return Object.assign(info, { text: `${this.squad.find((o) => o.down).name} is down — help them up`, chip: 'OFFICER DOWN', status: 'danger', detail: base });
    if (burning) Object.assign(info, { chip: 'FIRE', status: 'danger' });
    if (i === 0) return Object.assign(info, { text: this.tut.posted ? 'Take the other two across the footbridge' : 'Post two officers on the first footbridge', chip: 'ORDER', detail: '1 hold here · 2 follow (hold: all) · 3 advance to where you look' });
    if (i === 1) return Object.assign(info, { text: burning ? 'A car is burning — get someone to it before it spreads' : 'Hold the bridges: be where the bands mean to go', detail: base, bar: clamp(1 - this.stageT / L5.beat1.T, 0, 1) });
    if (i === 2) {
      const E = this.eng, left = Math.max(0, Math.ceil(L5.engine.work - E.work));
      if (E.s === 'drive') return Object.assign(info, { text: 'The fire engine is coming in along Quai de Valmy', detail: base });
      if (E.retreatT > 0) return Object.assign(info, { text: 'The fire crew has pulled back — clear the engine', chip: 'DANGER', status: 'danger', detail: `${base} · hose ${left}s to go`, bar: E.work / L5.engine.work });
      return Object.assign(info, { text: 'Keep the bands off the fire crew', chip: burning ? 'FIRE' : 'PROTECT', detail: `${base} · hose ${left}s to go`, bar: E.work / L5.engine.work });
    }
    if (this.lockS === 'fight') return Object.assign(info, { text: 'They are cornered and fighting', chip: 'ENGAGED', status: 'danger', detail: base });
    if (this.lockS === 'out') return Object.assign(info, { text: 'They are running through the passage', detail: base });
    return Object.assign(info, { text: 'The lock: leave them the passage, or close it', chip: 'YOUR CALL', detail: `${base} · passage ${this.lockBand && this._passageHeld() ? 'CLOSED' : 'open'}` });
  }

  endInfo(win, reason) {
    const s = this.stats, fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    return {
      title: win ? 'LEVEL 5 COMPLETE' : 'MISSION FAILED',
      sub: win ? `The canal is quiet · ${s.squad} of 4 officers standing · ${s.lockFight ? 'the lock was fought for' : 'the last of them ran'}` : reason || '',
      rows: [
        ['Beats completed', `${this.completed.filter(Boolean).length} / ${L5_PHASES.length}`],
        ['Squad officers standing', `${s.squad} / 4`, s.squad < 4],
        ['Officers down · helped up', `${s.officersDown} · ${s.revived}`, s.officersDown > 0],
        ['Bands · turned back', `${s.bands} · ${s.turned}`],
        ['Arrests · by the squad', `${s.arrests} · ${s.squadArrests}`],
        ['Cars set alight · by spread', `${s.fires} · ${s.spread}`, s.spread > 0],
        ['Fires put out', s.firesOut],
        ['Cars burnt out', s.burnt, s.burnt > 0],
        ['The burning shop', this.eng.s === 'none' ? '—' : s.building ? `saved · crew hit ${s.crewStruck}` : this.eng.lost ? 'lost' : '—', this.eng.lost],
        ['The lock', this.lockS === 'none' ? '—' : s.lockFight ? 'cornered: a fight' : 'they scattered'],
        ['People struck who had done nothing', s.peaceful, s.peaceful > 0],
        ['Orders given', s.orders],
        ['Damage received', Math.round(s.damageTaken)],
        ['Mission time', fmt(this.t)],
      ],
      hook: win ? HOOK : '',
      rank: 'Restart to try again',
    };
  }
}

// ------------------------------------------------------------------ the level's own people
// Pompiers: dark blue fire kit with yellow and silver bands, a silver helmet.
function pompierOutfit(rng) {
  const o = randomOutfit(rng);
  Object.assign(o, { top: 'jacket', smart: false, garment: 'coat', shellColor: 0x141b2e, topColor: 0x141b2e, topBase: 0x141b2e, longSleeve: true, keepTop: false, keepBottom: false, keepShoes: false,
    vest: true, shellPattern: 7, pa: 0xe8d21a, pb: 0xc8ccd0, mask: 'none', scarf: 'none', hood: false, backpack: false, headscarf: undefined, pants: 0x141b2e, shoes: 0x111111, hat: 'beanie', hatColor: 0xc8ccd0, beard: false });
  if (o.base === 'rb_male_a' || o.base === 'rb_female') o.hat = 'none';
  return o;
}

export { quaysArea };
