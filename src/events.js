// Ambient incident scheduler: keeps several disturbance areas active around the
// player — petrol bombs, firework mortars, projectile volleys, fires flaring
// up and parked cars catching fire. Timing, size, direction and sound vary so
// the city never repeats the same explosion on a loop.
import * as THREE from 'three';

const R = (a, b) => a + Math.random() * (b - a);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Areas where unrest is ongoing. `crowd` is where throwers stand, `police`
// is roughly where the projectiles are aimed.
const ZONES = [
  { name: 'Timbaud east', crowd: V(78, 0, 70), police: V(61, 0, 70) },
  { name: 'Timbaud west', crowd: V(-80, 0, 69), police: V(-61, 0, 71) },
  { name: 'Malte east', crowd: V(82, 0, -20), police: V(61, 0, -20) },
  { name: 'Malte west', crowd: V(-78, 0, -21), police: V(-61, 0, -19) },
  { name: 'Oberkampf east', crowd: V(80, 0, -110), police: V(61, 0, -110) },
  { name: 'Oberkampf west', crowd: V(-84, 0, -109), police: V(-61, 0, -111) },
  { name: 'North barricade', crowd: V(0, 0, -182), police: V(R(-6, 6), 0, -160) },
  { name: 'Boulevard centre', crowd: V(-4, 0, 60), police: V(2, 0, 78), inside: true },
  { name: 'Place de Malte', crowd: V(3, 0, -30), police: V(0, 0, -12), inside: true },
  { name: 'Oberkampf junction', crowd: V(-2, 0, -96), police: V(2, 0, -78), inside: true },
];

export class IncidentScheduler {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() { this.t = 4; this.carT = 22 + Math.random() * 15; this.lastZone = null; this.queue = []; this.hazards = false; this.hazT = 4; this.gasT = 30 + Math.random() * 20; this.gasClouds = []; }

  // queue a named event after a delay (phase scripting)
  schedule(type, delay, pos) { this.queue.push({ type, t: delay, pos }); }
  scripted(type, pos) { this._run(type, pos); }
  setHazards(on) { this.hazards = on; this.hazT = 3; }

  _run(type, pos) {
    const p = this.game.player.pos;
    if (type === 'carFire') this.carFire(pos);
    else if (type === 'teargas') this.tearGas();
    else if (type === 'mortar') this.mortar(this._nearestZone(p, 25));
    else if (type === 'molotovAt') this.molotovAt(pos);
  }

  _nearestZone(p, minD) {
    const c = ZONES.filter((z) => z.crowd.distanceTo(p) > minD).sort((a, b) => a.crowd.distanceTo(p) - b.crowd.distanceTo(p));
    return c[0] || ZONES[0];
  }

  // CRS fire tear-gas canisters from the line into the crowd ahead
  tearGas() {
    const g = this.game;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        if (g.state !== 'playing') return;
        const from = V(R(-8, 8), 2.2, 125);
        const to = V(R(-9, 9), 0.1, R(86, 108));
        g.audio.thump(from);
        g.effects.throwProjectile(from, to, 'stone', (pos) => {
          const ground = pos.clone().setY(g.world.groundHeight(pos.x, pos.z) + 0.1);
          this.gasClouds.push({ pos: ground, t: 0, life: R(12, 16) });
          g.crowd.disturb(ground, 9, 0.8, 'teargas');
          g.audio.impact(ground, false, true);
        }, R(1.1, 1.5));
      }, i * R(250, 600));
    }
  }

  // a petrol bomb thrown from the crowd to land at (or near) a given point
  molotovAt(target, fromSide) {
    const g = this.game;
    const side = fromSide ?? (target.x > 0 ? 1 : -1);
    const from = V(side * R(10, 13), 1.9, target.z + R(-6, 6));
    g.effects.throwProjectile(from, target.clone().setY(0.1), 'petrol', (pos) => {
      const ground = pos.clone().setY(g.world.groundHeight(pos.x, pos.z));
      g.effects.ignite(ground, R(2.2, 3.0), R(5, 8));
      g.audio.explosion(ground, R(0.6, 0.9));
      g.crowd.disturb(ground, 16, 0.9, 'explosion');
      this._shakeFrom(ground, 0.4);
      const d = g.player.pos.distanceTo(ground);
      if (d < 3.2) g.player.takeDamage(14, ground, null);
    }, R(1.0, 1.3));
  }

  // phase-3 hazards: petrol bombs land on the boulevard ahead of the officer
  _hazard() {
    const g = this.game, p = g.player.pos;
    const sideOff = (Math.random() < 0.5 ? -1 : 1) * R(2.5, 6);
    const ahead = V(Math.max(-12, Math.min(12, p.x + sideOff)), 0, p.z - R(14, 24));
    if (ahead.z < -120 || ahead.z > 170) return;
    g.hud.alert('Incoming petrol bomb!', 'warn', 1.4, 'incoming');
    this.molotovAt(ahead);
  }

  update(dt) {
    const g = this.game;
    this.t -= dt; this.carT -= dt;
    for (let i = this.queue.length - 1; i >= 0; i--) { const q = this.queue[i]; q.t -= dt; if (q.t <= 0) { this.queue.splice(i, 1); this._run(q.type, q.pos); } }
    if (this.hazards) { this.hazT -= dt; if (this.hazT <= 0) { this.hazT = R(8, 13); this._hazard(); } }
    // police tear gas at intervals while the crowd is near the line
    this.gasT -= dt;
    if (this.gasT <= 0) { this.gasT = R(35, 60); if (g.player.pos.z > 40) this.tearGas(); }
    // lingering tear-gas clouds: thick pale smoke that keeps people away
    for (let i = this.gasClouds.length - 1; i >= 0; i--) {
      const c = this.gasClouds[i];
      c.t += dt;
      if (c.t > c.life) { this.gasClouds.splice(i, 1); continue; }
      const k = 1 - c.t / c.life;
      if (Math.random() < 0.3 * k + 0.05) g.effects.smoke.spawn({ pos: c.pos.clone().add(V(R(-0.6, 0.6), R(0.2, 0.8), R(-0.6, 0.6))), vel: V(R(-1.2, 1.2), R(0.4, 1.0), R(-1.2, 1.2)), size: R(1.0, 1.6), grow: 4, life: R(5, 8), alpha: 0.14, color: new THREE.Color(0.66, 0.68, 0.66), drag: 0.6, windK: 1.0, fadeIn: 0.4 });
      if (Math.random() < dt * 1.5) g.crowd.disturb(c.pos, 7 * k + 2, 0.5, 'teargas');
    }
    if (this.t <= 0) {
      this.t = R(3.5, 9);
      const p = g.player.pos;
      // prefer areas at a visible distance, never on top of the player
      const cands = ZONES.filter((z) => { const d = z.crowd.distanceTo(p); return d > (z.inside ? 30 : 20) && d < 170 && z !== this.lastZone; });
      if (!cands.length) return;
      const z = cands[Math.floor(Math.random() * cands.length)];
      this.lastZone = z;
      const r = Math.random();
      if (r < 0.34) this.molotov(z);
      else if (r < 0.62) this.mortar(z);
      else if (r < 0.86) this.volley(z);
      else this.flareUp(z);
    }
    if (this.carT <= 0) { this.carT = R(30, 55); this.carFire(); }
  }

  _from(z) { return z.crowd.clone().add(V(R(-4, 4), 1.9, R(-3, 3))); }
  _to(z) { return z.police.clone().add(V(R(-4, 4), 0.1, R(-4, 4))); }

  molotov(z) {
    const g = this.game;
    const from = this._from(z), to = this._to(z);
    g.effects.throwProjectile(from, to, 'petrol', (pos) => {
      const ground = pos.clone().setY(g.world.groundHeight(pos.x, pos.z));
      const s = R(0.6, 1.0);
      g.effects.ignite(ground, 2.2 + s, R(4, 7));
      g.audio.explosion(ground, s);
      g.crowd.disturb(ground, 16, 0.9, 'explosion');
      this._shakeFrom(ground, 0.35);
      if (g.player.pos.distanceTo(ground) < 3.5) g.player.takeDamage(14, ground, null);
    }, R(1.0, 1.5));
  }

  mortar(z) {
    const g = this.game;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        if (g.state !== 'playing') return;
        const from = z.crowd.clone().add(V(R(-3, 3), 0.3, R(-3, 3)));
        const to = z.police.clone().add(V(R(-6, 6), R(6, 14), R(-6, 6)));
        g.audio.thump(from);
        g.effects.mortar(from, to, (pos) => {
          g.audio.firework(pos);
          g.crowd.disturb(pos.clone().setY(0), 14, 0.6, 'explosion');
          this._shakeFrom(pos, 0.15);
        });
      }, i * R(350, 900));
    }
  }

  volley(z) {
    const g = this.game;
    const n = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        if (g.state !== 'playing') return;
        const type = Math.random() < 0.4 ? 'bottle' : 'stone';
        g.effects.throwProjectile(this._from(z), this._to(z), type, (pos) => {
          if (type === 'bottle') g.audio.glass(pos); else g.audio.impact(pos, false, Math.random() < 0.5);
          g.effects.dust(pos, 4);
          g.crowd.disturb(pos, 5, 0.3, 'projectile');
        });
      }, i * R(150, 420));
    }
    if (Math.random() < 0.6) g.audio.shout(z.crowd);
  }

  flareUp(z) {
    const g = this.game;
    // nearest persistent fire to the zone roars up for a few seconds
    let best = null, bd = Infinity;
    for (const f of g.world.fires) { const d = f.pos.distanceToSquared(z.crowd); if (d < bd) { bd = d; best = f; } }
    if (!best || bd > 60 * 60) return this.molotov(z);
    best.boost = R(1.8, 2.6); best.boostT = R(2.5, 4);
    g.effects.explosion(best.pos, 0.55, { noDebris: true });
    g.audio.explosion(best.pos, 0.45);
  }

  carFire(at) {
    const g = this.game;
    // a parked car near the player's area bursts into flames (not too close)
    const p = g.player.pos;
    const spot = at ? at.clone() : V(R(-1, 1) > 0 ? 7.7 : -7.7, 1.0, p.z + R(-60, 60) * (Math.random() < 0.5 ? 1 : -1));
    spot.z = Math.max(-150, Math.min(110, spot.z));
    if (!at && spot.distanceTo(p) < 18) return;
    g.effects.explosion(spot, 1.1);
    g.effects.addFire(spot, 1.4, 2.0);
    g.audio.explosion(spot, 1.1);
    g.crowd.disturb(spot, 22, 1.0, 'explosion');
    this._shakeFrom(spot, 0.5);
    if (spot.distanceTo(p) < 60) g.hud.alert('A vehicle has caught fire', 'warn', 2.2, 'carfire');
  }

  _shakeFrom(pos, k) {
    const d = pos.distanceTo(this.game.player.pos);
    this.game.cameraRig.shake(Math.max(0, k * (1 - d / 60)));
  }
}
