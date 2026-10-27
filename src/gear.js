// The officer's equipment beyond baton and shield.
//  Police barriers (B): a see-through preview in front of the officer (green where it
//  fits), placed with B again or a click, cancelled with the shield or G. They are
//  real obstacles (world.addObstacle), so the crowd's steering walks round them.
//  Four carried per run; B beside one of your barriers picks it back up. None in a
//  boss arena: barriers already there are collected when the fight starts.
//  Tear-gas grenades (G): thrown where the camera looks, further the higher it aims.
//  They land as the same gas cloud the CRS volleys make (events.gasCloud), so the
//  crowd reacts the same way. Supply is per phase (Level 1) or section (Level 2) and
//  refills when the next one starts. Never during a boss fight: the arena must hold
//  nothing the fairness rules don't cover.
import * as THREE from 'three';

export const GAS = {
  perPhase: 3,
  minRange: 4, maxRange: 15, // metres; the camera pitch picks a range between them
  windup: 0.22,              // arm back before the release
  dur: 0.5,                  // whole throw
};

export const BARRIER = {
  carried: 4,
  w: 2.0, d: 0.35, h: 1.1, // footprint and height (the metal crowd barrier of the police line)
  ahead: 2.4,              // preview distance in front of the officer
  clearance: 0.3,          // space it needs from anyone standing there
  pickup: 1.4,             // reach to pick one back up
};
const OK = 0x50c878, BAD = 0xff5050;

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Gear {
  constructor(game, player) {
    this.game = game;
    this.player = player;
    this.barrierGeo = game.world.barrierGeometry();
    this.ghost = new THREE.Mesh(this.barrierGeo, new THREE.MeshBasicMaterial({ color: OK, transparent: true, opacity: 0.38, depthWrite: false }));
    this.ghost.renderOrder = 2;
    game.scene.add(this.ghost);
    try { game.renderer.compile(this.ghost, game.camera); } catch (e) { /* compiled on first sight instead */ }
    this.ghost.visible = false;
    this.barriers = [];
    this.reset();
  }

  reset() {
    for (const b of this.barriers) this._removeBarrier(b);
    this.barriers = [];
    this.barrierHand = BARRIER.carried;
    this.placing = false;
    this.ghost.visible = false;
    this.ateClick = false;  // the click that placed a barrier is not also a baton strike
    this.gas = GAS.perPhase;
    this.gasPhase = null;  // phase / section the current supply belongs to
    this.throwT = 0;       // > 0 while the throw animation runs
    this.pending = null;   // landing point, released at the end of the wind-up
    this.thrown = [];      // {t, pos} for every grenade that landed
  }

  // Level 1 counts phases, Level 2 sections
  _phaseKey() {
    const m = this.game.missions;
    if (!m) return null;
    return m.section !== undefined ? m.section : m.phase;
  }

  // landing point: along the camera's heading, range from its pitch, short of any wall
  aimPoint(yaw, pitch) {
    const p = this.player.pos, w = this.game.world;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const want = Math.max(GAS.minRange, Math.min(GAS.maxRange, 10 + (pitch + 0.12) * 12));
    let reach = 0.8;
    for (let s = 0.8; s <= want; s += 0.4) {
      if (w.blocked(p.x + fx * s, p.z + fz * s, 0.25, 2)) break; // lobbed over placed barriers
      reach = s;
    }
    return V(p.x + fx * reach, 0.1, p.z + fz * reach);
  }

  tryGas() {
    const g = this.game, p = this.player;
    if (p.dead) return false;
    if (g.crowd.arena) { g.hud.alert('No gas in this fight', 'warn', 1.5, 'gas'); return false; }
    if (this.gas <= 0) { g.hud.alert('No gas grenades left this phase', 'warn', 1.5, 'gas'); return false; }
    if (this.throwT > 0 || p.attack || p.dodgeT > 0 || p.staggerT > 0 || p.blocking) return false;
    const rig = g.cameraRig;
    this.pending = this.aimPoint(rig.yaw, rig.pitch);
    this.gas--;
    this.throwT = GAS.dur;
    p.heading = Math.atan2(this.pending.x - p.pos.x, this.pending.z - p.pos.z);
    g.hud.alert(`Gas out · ${this.gas} left`, 'info', 1.4, 'gas');
    return true;
  }

  _release() {
    const g = this.game, p = this.player, to = this.pending;
    this.pending = null;
    const f = p.forward();
    const from = V(p.pos.x + f.x * 0.3, p.pos.y + 1.9, p.pos.z + f.z * 0.3);
    g.audio.swing(p.pos);
    g.effects.throwProjectile(from, to, 'canister', (pos) => {
      const c = g.events.gasCloud(pos, 'officer');
      this.thrown.push({ t: g.time, pos: c.pos });
      const m = g.missions;
      if (m && m.stats.gas !== undefined) m.stats.gas++;
    });
  }

  // ------------------------------------------------------------- barriers
  // in front of the officer, across the camera's view
  _ghostPose() {
    const p = this.player.pos, yaw = this.game.cameraRig.yaw;
    return { x: p.x - Math.sin(yaw) * BARRIER.ahead, z: p.z - Math.cos(yaw) * BARRIER.ahead, ry: yaw };
  }

  // null when the barrier fits at (x, z, ry), otherwise the reason it does not
  placeProblem(x, z, ry) {
    const g = this.game, w = g.world, hw = BARRIER.w / 2, hd = BARRIER.d / 2;
    if (g.crowd.arena) return 'No barriers in this fight';
    const c = Math.cos(ry), s = Math.sin(ry);
    for (let k = -1; k <= 1; k += 0.25) if (w.blocked(x + c * hw * k, z - s * hw * k, hd)) return 'No room for a barrier there';
    const inside = (o, r) => {
      const dx = o.x - x, dz = o.z - z;
      return Math.abs(c * dx - s * dz) < hw + r && Math.abs(s * dx + c * dz) < hd + r;
    };
    for (const n of g.crowd.query(x, z, hw + 1.5, [])) if (n.state !== 'gone' && inside(n.pos, (n.radius || 0.3) + BARRIER.clearance)) return 'Someone is in the way';
    if (inside(this.player.pos, 0.36)) return 'Step back to place it';
    return null;
  }

  // nearest of your barriers within reach of the officer
  nearBarrier() {
    const p = this.player.pos;
    let best = null, bd = Infinity;
    for (const b of this.barriers) {
      const o = b.col.obb, dx = p.x - o.cx, dz = p.z - o.cz;
      const lx = Math.abs(o.c * dx - o.s * dz) - o.hw, lz = Math.abs(o.s * dx + o.c * dz) - o.hd;
      const d = Math.hypot(Math.max(0, lx), Math.max(0, lz));
      if (d < BARRIER.pickup && d < bd) { bd = d; best = b; }
    }
    return best;
  }

  placeBarrier(x, z, ry) {
    const g = this.game;
    const why = this.placeProblem(x, z, ry);
    if (why) { g.hud.alert(why, 'warn', 1.4, 'barrier'); return null; }
    const y = g.world.groundHeight(x, z);
    const mesh = new THREE.Mesh(this.barrierGeo, g.world.mat('metal'));
    mesh.position.set(x, y, z); mesh.rotation.y = ry;
    mesh.castShadow = true; mesh.receiveShadow = true;
    g.scene.add(mesh);
    const b = { mesh, col: g.world.addObstacle(x, z, BARRIER.w, BARRIER.d, ry, BARRIER.h), placedAt: g.time };
    this.barriers.push(b);
    this.barrierHand--;
    this.placing = false; this.ghost.visible = false;
    g.audio.impact(V(x, 0.5, z), false, false, 'metal');
    g.hud.alert(`Barrier placed · ${this.barrierHand} left`, 'info', 1.4, 'barrier');
    return b;
  }

  _removeBarrier(b) {
    this.game.scene.remove(b.mesh);
    this.game.world.removeCollider(b.col);
  }

  pickUp(b) {
    const g = this.game;
    this._removeBarrier(b);
    this.barriers.splice(this.barriers.indexOf(b), 1);
    this.barrierHand++;
    g.audio.impact(b.mesh.position, false, false, 'metal');
    g.hud.alert(`Barrier picked up · ${this.barrierHand} carried`, 'info', 1.4, 'barrier');
  }

  _updateBarriers(input) {
    const g = this.game, p = this.player;
    this.ateClick = false;
    // a boss fight starting: its arena is cleared of barriers, which go back to the officer
    const A = g.crowd.arena;
    if (A) {
      let n = 0;
      for (const b of this.barriers.slice()) {
        const o = b.col.obb;
        if (Math.hypot(o.cx - A.x, o.cz - A.z) < A.r + BARRIER.w) { this._removeBarrier(b); this.barriers.splice(this.barriers.indexOf(b), 1); this.barrierHand++; n++; }
      }
      if (n) g.hud.alert(`Barriers cleared from the arena · ${this.barrierHand} carried`, 'info', 2, 'barrier');
    }
    const pressB = input.pressed('KeyB');
    if (this.placing) {
      if (p.dead || A) { this.placing = false; this.ghost.visible = false; return; }
      const gp = this._ghostPose();
      const ok = !this.placeProblem(gp.x, gp.z, gp.ry);
      this.ghost.position.set(gp.x, g.world.groundHeight(gp.x, gp.z) + 0.01, gp.z);
      this.ghost.rotation.y = gp.ry;
      this.ghost.material.color.setHex(ok ? OK : BAD);
      this.ghost.visible = true;
      if (pressB || input.pressed('Mouse0')) { this.ateClick = input.pressed('Mouse0'); this.placeBarrier(gp.x, gp.z, gp.ry); }
      else if (input.pressed('Mouse2') || input.pressed('KeyG')) { this.placing = false; this.ghost.visible = false; }
      return;
    }
    const near = this.nearBarrier();
    if (near && !g.input.touch) g.hud.prompt('B', 'Pick up barrier');
    if (!pressB || p.dead) return;
    if (near) this.pickUp(near);
    else if (A) g.hud.alert('No barriers in this fight', 'warn', 1.4, 'barrier');
    else if (this.barrierHand <= 0) g.hud.alert('No barriers left. Press B beside one to pick it up', 'warn', 1.8, 'barrier');
    else this.placing = true;
  }

  update(dt, input) {
    this._updateBarriers(input);
    const key = this._phaseKey();
    if (key !== this.gasPhase) {
      if (this.gasPhase !== null && this.gas < GAS.perPhase) {
        this.gas = GAS.perPhase;
        this.game.hud.alert(`Gas resupplied · ${GAS.perPhase} grenades`, 'good', 2, 'gas');
      }
      this.gasPhase = key;
    }
    if (this.throwT > 0) {
      this.throwT = Math.max(0, this.throwT - dt);
      // a hit during the wind-up cancels the throw and keeps the grenade
      if (this.pending && (this.player.dead || this.player.staggerT > 0)) { this.pending = null; this.throwT = 0; this.gas++; }
      else if (this.pending && GAS.dur - this.throwT >= GAS.windup) this._release();
    }
    if (input.pressed('KeyG')) this.tryGas();
  }
}
