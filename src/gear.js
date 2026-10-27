// The officer's equipment beyond baton and shield.
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

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Gear {
  constructor(game, player) {
    this.game = game;
    this.player = player;
    this.reset();
  }

  reset() {
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
      if (w.blocked(p.x + fx * s, p.z + fz * s, 0.25)) break;
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

  update(dt, input) {
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
