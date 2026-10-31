// Level 3 · the transfer van carrying le Patron to the gendarmerie.
//
// A scripted prop that follows a fixed path at walking pace, with one moving oriented
// collider (World.moveObstacle). It has no physics and never pushes anyone: it only moves
// into ground its swept box has checked is clear. It waits for the officer, stops when the
// crews come near it, and holds at the points the mission sets (limitS).
//
// Integrity starts at 100 and only the designated hostile attacks reduce it, each through
// hit() with a fixed amount (VAN.dmg): a crew strike on its side, a stone or bottle that
// physically strikes its body, a crew petrol bomb bursting beside it, a completed breach of
// its rear doors, a hazard explosion it is caught in. Peaceful people, ambient incidents and
// background fires have no path to it. A token bucket caps the damage per second from strikes
// and stones (the telegraphed attacks are not capped), and nothing lands during a short grace
// after a (re)start or while a cinematic plays. The mission fails the run at 0.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { vanParts } from './vehicles.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// attacks with a long tell (a 6 s breach, a bomber's lighting, a hazard's ring) are not capped
const TELEGRAPHED = new Set(['breach', 'petrol', 'explosion']);

export const VAN = {
  max: 100, W: 2.3, L: 6.0, H: 2.6,
  cruise: 3.0, slow: 1.8, accel: 1.2, brake: 3.0,
  follow: 20,      // it advances only while the officer is this close (m)
  threatR: 8,      // and no active attacker is this close to it
  sweep: 8,        // and the box this far ahead of its nose holds nobody and nothing
  hazardLook: 15,  // and no telegraphed hazard lies on its next 15 m
  dmg: { melee: 3, bash: 4, projectile: 2, petrol: 12, pool: 3, breach: 30, explosion: 25 },
  far: 35, farMul: 1.5, // officer this far from it: damage x1.5 (Control warns at 25 m)
  cap: 8,          // damage per second at most from strikes and stones (token bucket)
  grace: 4,        // seconds without damage after a section starts or restarts
  breachS: 6,      // a crew breacher needs this long at the doors
  breachDecay: 0.1,
  restoreMin: 60,  // a retry never starts below this
};

// a polyline smoothed by corner cutting, with arc lengths; holds are named points on it
export class VanPath {
  constructor(points, slowZones = []) {
    let pts = points.map((p) => [p[0], p[1]]);
    for (let it = 0; it < 3; it++) {
      const out = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        if (i > 0) out.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25]);
        if (i < pts.length - 2) out.push([ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]);
      }
      out.push(pts[pts.length - 1]);
      pts = out;
    }
    this.pts = pts;
    this.len = [0];
    for (let i = 1; i < pts.length; i++) this.len.push(this.len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.total = this.len[this.len.length - 1];
    this.holds = {};
    for (const p of points) if (p[2]) this.holds[p[2]] = this.nearestS(p[0], p[1]);
    this.slowZones = slowZones; // [x0, z0, x1, z1]: the narrow Passage
  }

  at(s, out = V3()) {
    s = Math.max(0, Math.min(this.total, s));
    let lo = 0, hi = this.len.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.len[m] <= s) lo = m; else hi = m; }
    const k = (s - this.len[lo]) / ((this.len[hi] - this.len[lo]) || 1);
    return out.set(this.pts[lo][0] + (this.pts[hi][0] - this.pts[lo][0]) * k, 0, this.pts[lo][1] + (this.pts[hi][1] - this.pts[lo][1]) * k);
  }

  nearestS(x, z) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < this.pts.length; i++) { const d = (this.pts[i][0] - x) ** 2 + (this.pts[i][1] - z) ** 2; if (d < bd) { bd = d; best = this.len[i]; } }
    return best;
  }

  cruise(p) {
    for (const [x0, z0, x1, z1] of this.slowZones) if (p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1) return VAN.slow;
    return VAN.cruise;
  }
}

export class TransferVan {
  constructor(game) {
    this.game = game;
    this.group = this._build();
    this.group.visible = false;
    game.scene.add(this.group);
    this.pos = V3(); this.heading = 0; this.speed = 0;
    this.bar = V3();            // the roof light bar (World.lightBars while active)
    this.col = null;
    this.targets = new Map();   // npc -> its point on the van's side
    this.tmp = V3(); this.tmp2 = V3();
    this.reset();
  }

  // geometry: the parked police vans' parts (World._van), merged per material, one group
  _build() {
    const w = this.game.world, P = vanParts('service', 'vanBody'), byKey = new Map();
    const add = (k, g) => {
      if (g.index) g = g.toNonIndexed();
      for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(g);
    };
    const B = (k, w0, h, d, ox, oy, oz) => { const g = new THREE.BoxGeometry(w0, h, d); g.translate(ox, oy, oz); add(k, g); };
    for (const [m, g] of P.parts) add(m, g);
    for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(3.3, 1.24); g.rotateY(s * Math.PI / 2); g.translate(s * (P.W / 2 + 0.008), 1.5, -1.0); add('vanSide', g); }
    B('vanBlue', P.W + 0.02, 0.3, 1.0, 0, 0.62, P.f - 0.5);
    B('darkMetal', 1.9, 0.4, 0.3, 0, 0.72, P.f + 0.16);
    const group = new THREE.Group(); group.name = 'transferVan';
    for (const [k, list] of byKey) {
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, w.mat(k));
      mesh.castShadow = true; mesh.receiveShadow = true;
      group.add(mesh);
    }
    for (const [i, sgn] of [[0, -1], [1, 1]]) {
      const g = new THREE.BoxGeometry(0.75, 0.16, 0.3); g.translate(sgn * 0.42, P.H + 0.1, 0.55);
      group.add(new THREE.Mesh(g, i ? w.materials.lightB : w.materials.lightA));
    }
    this.halfL = P.L / 2;
    return group;
  }

  reset() {
    this.integrity = VAN.max;
    this.incidents = 0;      // damaging events (a petrol pool counts once)
    this.lost = 0;           // integrity lost, summed
    this.log = [];           // [t, kind, amount] for the tests and the results
    this.tokens = VAN.cap;
    this.graceT = VAN.grace;
    this.t = 0; this.lastHitT = -99; this.lastHitPos = null;
    this.s = 0; this.limitS = 0; this.speed = 0;
    this.reason = 'hold'; this.blockedT = 0; this.hornT = 0; this.disturbT = 0;
    this.breacher = null; this.breach = 0; this.bangT = 0;
    this.pools = [];
    this.parked = false;     // boss section: stands, crews ignore it
    this.invulnerable = false;
    this.targets.clear();
    this.sparkT = 0;
  }

  // ---------------------------------------------------------------- level wiring
  show(on) {
    const w = this.game.world;
    this.group.visible = on;
    const i = w.lightBars.indexOf(this.bar);
    if (on && i < 0) w.lightBars.push(this.bar);
    if (!on && i >= 0) w.lightBars.splice(i, 1);
    if (on && !this.col) this.col = w.addObstacle(this.pos.x, this.pos.z, VAN.W, VAN.L, this.heading, VAN.H, 'vehicle');
    if (!on && this.col) { w.removeCollider(this.col); this.col = null; }
  }

  setPath(path, s = this.s) { this.path = path; this.s = s; this.limitS = Math.max(this.limitS, s); this._place(); }
  holdAt(name) { this.limitS = this.path.holds[name] ?? this.limitS; }
  atHold() { return this.s >= this.limitS - 0.3 && this.speed < 0.05; }
  // restart at a checkpoint: position on the path, integrity restored to at least restoreMin
  restore(path, s, integrity) {
    this.reset();
    this.integrity = Math.max(VAN.restoreMin, Math.min(VAN.max, integrity ?? VAN.max));
    this.setPath(path, s); this.limitS = s;
  }

  // ---------------------------------------------------------------- geometry queries
  fwd(out = this.tmp2) { return out.set(Math.sin(this.heading), 0, Math.cos(this.heading)); }
  // into the van's frame: lx across (+ right side seen from behind), lz along (+ nose)
  _local(x, z) {
    const dx = x - this.pos.x, dz = z - this.pos.z, c = Math.cos(this.heading), s = Math.sin(this.heading);
    return [c * dx - s * dz, s * dx + c * dz];
  }
  // distance from a point to the van's body (0 inside)
  distTo(p) {
    const [lx, lz] = this._local(p.x, p.z);
    const ex = Math.max(0, Math.abs(lx) - VAN.W / 2), ez = Math.max(0, Math.abs(lz) - VAN.L / 2);
    return Math.hypot(ex, ez);
  }
  doorPoint(out = V3()) { const f = this.fwd(); return out.set(this.pos.x - f.x * (VAN.L / 2 + 0.9), 0, this.pos.z - f.z * (VAN.L / 2 + 0.9)); }
  front(out = V3()) { const f = this.fwd(); return out.set(this.pos.x + f.x * (VAN.L / 2), 0, this.pos.z + f.z * (VAN.L / 2)); }

  // crews may go for it (not while it is parked in the boss section or hidden)
  targetable() { return this.group.visible && !this.parked && !this.invulnerable; }
  vulnerable() { const g = this.game; return this.targetable() && this.graceT <= 0 && !g.cinematic && !g.missions.ended && this.integrity > 0; }
  underAttack() { return this.t - this.lastHitT < 3 || !!this.breacher; }

  // a crew member's point beside the van's nearest side (0.45 m out), kept per person
  targetFor(n) {
    let ref = this.targets.get(n);
    if (!ref) { ref = { pos: V3(), isPlayer: false, vehicle: this }; this.targets.set(n, ref); }
    const [lx, lz] = this._local(n.pos.x, n.pos.z);
    const hw = VAN.W / 2 + 0.45, hl = VAN.L / 2 + 0.45;
    let px = Math.max(-hw, Math.min(hw, lx)), pz = Math.max(-hl, Math.min(hl, lz));
    // from inside the outline, out through the nearest side (outside, the clamp is already on it)
    if (Math.abs(lx) < hw && Math.abs(lz) < hl) { if (hw - Math.abs(lx) < hl - Math.abs(lz)) px = Math.sign(lx || 1) * hw; else pz = Math.sign(lz || 1) * hl; }
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    ref.pos.set(this.pos.x + c * px + s * pz, 0, this.pos.z - s * px + c * pz);
    return ref;
  }

  // ---------------------------------------------------------------- damage
  // kind: melee | bash | projectile | petrol | pool | breach | explosion
  hit(kind, from, amount = VAN.dmg[kind]) {
    if (!this.vulnerable() || !(amount > 0)) return 0;
    const g = this.game;
    let a = amount * (g.player.pos.distanceTo(this.pos) > VAN.far ? VAN.farMul : 1);
    if (!TELEGRAPHED.has(kind)) { a = Math.min(a, this.tokens); this.tokens -= a; }
    if (a <= 0.001) return 0;
    a = Math.min(a, this.integrity);
    this.integrity -= a;
    this.lost += a;
    if (kind !== 'pool' || this.t - (this._poolT || -99) > 1.5) { this.incidents++; this.log.push([+this.t.toFixed(2), kind, +a.toFixed(2)]); }
    if (kind === 'pool') this._poolT = this.t;
    this.lastHitT = this.t;
    const at = from ? this._surfacePoint(from) : this.pos.clone().setY(1.4);
    this.lastHitPos = at;
    if (kind !== 'pool') {
      g.effects.impact(at);
      g.audio.vanHit(at, kind === 'breach' || kind === 'petrol' || kind === 'explosion');
      if (g.player.pos.distanceTo(this.pos) < 14) g.cameraRig.shake(kind === 'breach' ? 0.2 : 0.05);
    }
    if (this.onDamage) this.onDamage(a, kind);
    return a;
  }

  _surfacePoint(from) {
    const [lx, lz] = this._local(from.x, from.z);
    const px = Math.max(-VAN.W / 2, Math.min(VAN.W / 2, lx)), pz = Math.max(-VAN.L / 2, Math.min(VAN.L / 2, lz));
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    return V3(this.pos.x + c * px + s * pz, Math.min(2.2, Math.max(0.6, from.y || 1.3)), this.pos.z - s * px + c * pz);
  }

  // a thrown stone or bottle came down here: damage only if it struck the body itself
  projectileImpact(pos) {
    if (pos.y > VAN.H + 0.2 || this.distTo(pos) > 0.35) return 0;
    return this.hit('projectile', pos);
  }

  // a crew petrol bomb burst at `ground`: 12 within 3 m of the body, then 3/s while its pool overlaps the van
  petrolBurst(ground) {
    const d = this.distTo(ground);
    if (d < 3) this.hit('petrol', ground);
    const fl = this.game.effects.flames;
    if (fl.length) this.pools.push(fl[fl.length - 1]);
  }

  // a hazard explosion: falls to 0 at radius
  blast(pos, radius = 7, max = VAN.dmg.explosion) {
    const d = this.distTo(pos);
    return d < radius ? this.hit('explosion', pos, max * (1 - d / radius)) : 0;
  }

  // a breacher at the doors (called every frame by its script): true once the doors give
  breachTick(n, dt, secs = VAN.breachS) {
    if (this.breacher && this.breacher !== n) return false;
    this.breacher = n;
    if (this.speed > 0.4 || !this.vulnerable()) return false;
    this.breach = Math.min(1, this.breach + dt / secs);
    this.bangT -= dt;
    if (this.bangT <= 0) { this.bangT = 0.5; this.game.audio.impact(this.doorPoint(this.tmp).setY(1.2), true, true, 'shield'); }
    if (this.breach >= 1) { this.breach = 0; this.breacher = null; this.hit('breach', this.doorPoint(V3()).setY(1.3)); return true; }
    return false;
  }
  releaseBreach(n) { if (this.breacher === n) this.breacher = null; }

  // ---------------------------------------------------------------- update
  // hazards: [{ x, z, r }] the van must not drive into (telegraphed or burning)
  update(dt, hazards = []) {
    const g = this.game;
    if (!this.group.visible || !this.path) return;
    this.t += dt;
    this.graceT = Math.max(0, this.graceT - dt);
    this.tokens = Math.min(VAN.cap, this.tokens + VAN.cap * dt);
    if (!this.breacher) this.breach = Math.max(0, this.breach - VAN.breachDecay * dt);
    else if (this.breacher.neutralized || this.breacher.arrested || this.breacher.state === 'gone') this.breacher = null;
    // crew petrol pools burning under it
    this.pools = this.pools.filter((f) => f.t < f.life && g.effects.flames.includes(f));
    for (const f of this.pools) if (this.distTo(f.pos) < f.radius * (1 - (f.t / f.life) * 0.4)) this.hit('pool', f.pos, VAN.dmg.pool * dt);

    const reason = this.parked ? 'parked' : this._stopReason(hazards);
    this.reason = reason || (this.s >= this.limitS - 0.3 ? 'hold' : null);
    const remaining = this.limitS - this.s;
    let want = reason ? 0 : this.path.cruise(this.pos);
    want = Math.min(want, Math.sqrt(2 * VAN.brake * Math.max(0, remaining - 0.05)));
    if (this.speed < want) this.speed = Math.min(want, this.speed + VAN.accel * dt);
    else this.speed = Math.max(want, this.speed - VAN.brake * dt);
    if (remaining <= 0.05) this.speed = 0;
    this.s = Math.min(this.limitS, this.s + this.speed * dt);
    this._place();
    // people in the way: the horn, then they are asked to make room
    if (reason === 'blocked') {
      this.blockedT += dt; this.hornT -= dt; this.disturbT -= dt;
      if (this.blockedT > 2 && this.hornT <= 0) { this.hornT = 2; g.audio.horn(this.front(this.tmp)); }
      if (this.blockedT > 2 && this.disturbT <= 0) { this.disturbT = 1; g.crowd.disturb(this.front(V3()), 6, 0.3, 'charge'); this._makeWay(); }
    } else this.blockedT = 0;
    // damage shows: smoke from the bonnet below 50, sparks below 25
    if (this.integrity < 50 && Math.random() < dt * (this.integrity < 25 ? 9 : 4)) {
      const f = this.front(this.tmp).setY(1.25);
      g.effects.smoke.spawn({ pos: f.clone(), vel: V3((Math.random() - 0.5) * 0.4, 1.0, (Math.random() - 0.5) * 0.4), size: 0.4, grow: 2.5, life: 2.2, alpha: 0.3, color: new THREE.Color(0.18, 0.18, 0.18), drag: 0.8, buoy: 0.3 });
    }
    if (this.integrity < 25) { this.sparkT -= dt; if (this.sparkT <= 0) { this.sparkT = 0.2; g.effects.impact(this.front(V3()).setY(0.9)); } }
  }

  // Everyone standing in the swept box is given a spot beside the road, clear of the path, and
  // walks there; a suspect already cuffed there is led away by colleagues. Nobody is pushed.
  _makeWay() {
    const g = this.game, crowd = g.crowd, q = V3(), q2 = V3(), seen = new Set();
    for (let k = 0.5; k <= VAN.sweep + 1; k += 1) {
      this.path.at(this.s + VAN.L / 2 + k, q); this.path.at(this.s + VAN.L / 2 + k + 1, q2);
      const fl = Math.hypot(q2.x - q.x, q2.z - q.z) || 1, fx = (q2.x - q.x) / fl, fz = (q2.z - q.z) / fl;
      for (const n of crowd.query(q.x, q.z, VAN.W / 2 + 0.8, [])) {
        if (seen.has(n) || n.id === undefined || n.state === 'gone' || n.special) continue;
        seen.add(n);
        if (n.state === 'arrested') { crowd.retire(n); continue; } // (cuffed suspects keep their hostile tag and any script)
        if (n.script || n.temperament === 'hostile' || !['act', 'walk', 'calm'].includes(n.state)) continue; // down, getting up, fleeing: they move on their own
        const side = fz * (n.pos.x - q.x) - fx * (n.pos.z - q.z) >= 0 ? 1 : -1;
        // a spot measured from the van's line, on their side first, then across it
        for (const off of [side * 3.6, side * 2.8, -side * 3.6, -side * 2.8]) {
          const x = n.pos.x + (q.x - n.pos.x) + fz * off, z = n.pos.z + (q.z - n.pos.z) - fx * off;
          if (g.world.blocked(x, z, 0.5)) continue;
          n.anchor.set(x, 0, z); n.target.set(x, 0, z); n.march = null;
          crowd.setState(n, 'walk'); n.dur = 6;
          break;
        }
      }
    }
  }

  // why it is not moving (null: free to go)
  _stopReason(hazards) {
    const g = this.game, p = g.player.pos;
    if (this.s >= this.limitS - 0.05) return null; // holding: the limit stops it, not a reason
    if (p.distanceTo(this.pos) > VAN.follow) return 'officer';
    const crowd = g.crowd;
    for (const n of crowd.npcs) if (n.state !== 'gone' && crowd.isThreat(n) && this.distTo(n.pos) < VAN.threatR) return 'threat';
    // the swept strip ahead of the nose, along the path itself (it curves round parked cars)
    const crowdQ = this._q || (this._q = []), q = this.tmp, hw = VAN.W / 2;
    for (let k = 0.5; k <= VAN.sweep; k += 1) {
      this.path.at(this.s + VAN.L / 2 + k, q);
      if (Math.hypot(p.x - q.x, p.z - q.z) < hw + 0.3) return 'officerAhead';
      for (const n of crowd.query(q.x, q.z, hw + 0.3, crowdQ)) if (n.id !== undefined && n.state !== 'gone') return 'blocked';
      for (const c of g.world.near(q.x, q.z, hw + 1)) {
        if (c === this.col || c.off) continue;
        const r = hw - 0.15;
        const hit = c.obb ? (() => { const o = c.obb, dx = q.x - o.cx, dz = q.z - o.cz; return Math.abs(o.c * dx - o.s * dz) < o.hw + r && Math.abs(o.s * dx + o.c * dz) < o.hd + r; })()
          : q.x + r > c.minX && q.x - r < c.maxX && q.z + r > c.minZ && q.z - r < c.maxZ;
        if (hit) return c.tag === 'placed' ? 'barrier' : 'road';
      }
    }
    // telegraphed or burning hazards on the next stretch of its path
    if (hazards.length) {
      for (let k = 0; k <= VAN.hazardLook; k += 1.5) {
        const q = this.path.at(this.s + VAN.L / 2 + k, this.tmp);
        for (const h of hazards) if ((!h.near || k <= 2) && Math.hypot(q.x - h.x, q.z - h.z) < h.r + VAN.W / 2) return 'hazard';
      }
    }
    return null;
  }

  _place() {
    const P = this.path, w = this.game.world;
    if (!P) return;
    const a = P.at(this.s - 1.6, this.tmp), b = P.at(this.s + 1.6, V3());
    if (Math.hypot(b.x - a.x, b.z - a.z) > 0.01) this.heading = Math.atan2(b.x - a.x, b.z - a.z);
    P.at(this.s, this.pos);
    const y = w.groundHeight(this.pos.x, this.pos.z);
    this.group.position.set(this.pos.x, y, this.pos.z);
    this.group.rotation.y = this.heading;
    this.bar.set(this.pos.x + Math.sin(this.heading) * 0.55, y + 2.8, this.pos.z + Math.cos(this.heading) * 0.55);
    if (this.col) w.moveObstacle(this.col, this.pos.x, this.pos.z, this.heading);
  }

  // checkpoint data
  info() { return { integrity: Math.round(this.integrity), s: +this.s.toFixed(2), limit: +this.limitS.toFixed(2), speed: +this.speed.toFixed(2), reason: this.reason, breach: +this.breach.toFixed(2), incidents: this.incidents }; }
}

// A crew breacher: runs for the rear doors and works them; while another has the doors it
// strikes the van's side instead. Striking it interrupts the breach; a completed breach
// costs the van 30, then it backs off and comes again. Never targets the officer.
export function breacherScript(game, van, n, onBreach) {
  const crowd = game.crowd;
  const busy = new Set(['stagger', 'down', 'recover', 'arrested', 'surrender']);
  const sc = {
    active: true, marked: true, amber: false, phase: 'approach', t: 0, door: V3(), side: null, retreatT: 0,
    tick(m, player, dt) {
      sc.t += dt;
      if (m.neutralized || m.arrested || m.temperament !== 'hostile') {
        if (sc.phase === 'breach' && m.neutralized && van.breach > 0.1 && sc.onStopped) sc.onStopped(van.breach);
        van.releaseBreach(m); sc.active = sc.marked = sc.amber = false; m.script = null; return;
      }
      m.lastAggro = crowd.time; // a wanted attacker: ringed, on the minimap
      if (busy.has(m.state)) { if (van.breacher === m) van.releaseBreach(m); sc.amber = false; if (sc.phase === 'breach') sc.phase = 'approach'; return; }
      van.doorPoint(sc.door);
      if (sc.phase === 'retreat') { sc.retreatT -= dt; if (sc.retreatT <= 0) { sc.phase = 'approach'; crowd.setState(m, 'pursue'); } return; }
      if (m.state === 'flee' || m.state === 'calm' || m.state === 'act' || m.state === 'walk') crowd.setState(m, 'pursue');
      if (!van.targetable()) return;
      const atDoor = Math.hypot(m.pos.x - sc.door.x, m.pos.z - sc.door.z) < 1.0;
      if (sc.phase === 'approach' && atDoor && (!van.breacher || van.breacher === m)) { sc.phase = 'breach'; crowd.setState(m, 'loot_smash', 99); }
      else if (sc.phase === 'approach' && van.breacher && van.breacher !== m && van.distTo(m.pos) < 3) sc.phase = 'bash';
      if (sc.phase === 'breach') {
        if (!atDoor) { van.releaseBreach(m); sc.phase = 'approach'; crowd.setState(m, 'pursue'); sc.amber = false; return; }
        sc.amber = true;
        m.focus.copy(van.pos);
        if (m.state !== 'loot_smash') crowd.setState(m, 'loot_smash', 99);
        if (van.breachTick(m, dt)) { sc.amber = false; sc.phase = 'retreat'; sc.retreatT = 3; m.fleeFrom = van.pos.clone(); crowd.setState(m, 'flee', 3); if (onBreach) onBreach(m); }
      } else if (sc.phase === 'bash') {
        if (!van.breacher) { sc.phase = 'approach'; return; }
        const tg = van.targetFor(m);
        if (Math.hypot(m.pos.x - tg.pos.x, m.pos.z - tg.pos.z) < 1.2 && m.cool <= 0 && (m.state === 'pursue' || m.state === 'circle')) {
          m.targetRef = tg; m.attackKind = 'punch'; crowd.setState(m, 'atk_wind', 0.55);
        }
      }
    },
    move(m) {
      if (busy.has(m.state) || m.state.startsWith('atk')) return null;
      if (sc.phase === 'retreat') return { speed: 3.2, dest: null };
      if (sc.phase === 'breach') return { speed: 0 };
      if (sc.phase === 'bash') { const tg = van.targetFor(m); m.targetRef = tg; return { speed: 3.6 * m.speedMul, dest: tg.pos }; }
      return { speed: 4.0 * m.speedMul, dest: sc.door };
    },
  };
  n.script = sc;
  return sc;
}
