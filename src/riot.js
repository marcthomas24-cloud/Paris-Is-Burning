// Mobile CRS for the Revolution campaign: the same officers the State campaign plays, seen from
// the other side. Three kinds of unit, organised in squads:
//   line    · a shield wall that advances along an axis, holds, charges and bashes what is in front
//   snatch  · two or three officers who break from the line to run the protester down and grab him
//   gasser  · stands behind a line and lobs tear-gas canisters at the protester's position
// Officers take hits (projectiles, shoves, the protester's comrades), stagger, go down, get up and
// fall back ("routed"). Nobody is killed: a downed officer gets up and leaves the street.
// Built only when a Revolution level first loads, from its own random stream, so the State
// campaign's seeded runs are untouched.
import * as THREE from 'three';
import { buildCharacter, addPoliceGear, policeOutfit, newPose, baseLayer, applyPose, updateShield, lying } from './characters.js';
import { mulberry } from './textures.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const POOL = 30;          // officers built (the busiest moment of Mission 3 uses ~26)
const MAX_DRAWN = 22;     // skinned officers drawn at once (nearest first)
const R_BODY = 0.4;

export const RIOT = {
  hp: 4,
  lineSpeed: 1.25, chargeSpeed: 4.6, snatchJog: 4.6, snatchSprint: 6.1,
  bashReach: 1.75, bashDamage: 9, bashPush: 5.5,
  batonDamage: 11, grabReach: 1.05,
  blockFront: 0.35,     // projectiles from within ~70 degrees of where a shielded officer faces
  blockChance: 0.6,
  gasEvery: [8, 13], gasRange: 30,
};

function angleLerp(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}
const headingTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

export class RiotPolice {
  constructor(game) {
    this.game = game;
    this.rng = mulberry(5150);
    this.units = [];
    this.squads = [];
    for (let i = 0; i < POOL; i++) {
      const rig = buildCharacter(game.world, policeOutfit(this.rng), 'police');
      addPoliceGear(rig);
      rig.root.visible = false;
      game.scene.add(rig.root);
      this.units.push({ id: i, rig, pos: V(), vel: V(), knock: V(), heading: 0, active: false, state: 'off', st: 0 });
    }
    this.reset();
  }

  reset() {
    for (const u of this.units) this._retire(u);
    this.squads.length = 0;
    this.stats = { down: 0, routed: 0, blocked: 0, hits: 0 };
    this.time = 0;
    this.barriers = []; // {x, z, r, hp, onBreak}: barricades a line has to stop at and pull down
  }

  _retire(u) {
    u.active = false; u.state = 'off'; u.squad = null; u.grab = false;
    u.rig.root.visible = false;
    u.vel.set(0, 0, 0); u.knock.set(0, 0, 0);
  }

  active() { return this.units.filter((u) => u.active); }
  standing() { return this.units.filter((u) => u.active && u.state !== 'down' && u.state !== 'rout'); }

  _take(pos, heading, kind, squad) {
    const u = this.units.find((o) => !o.active);
    if (!u) return null;
    u.active = true; u.kind = kind; u.squad = squad;
    u.pos.copy(pos); u.vel.set(0, 0, 0); u.knock.set(0, 0, 0);
    u.heading = heading; u.hp = squad.hp || RIOT.hp; u.state = kind === 'line' ? 'form' : 'idle'; u.st = 0;
    u.atk = null; u.cool = this.rng() * 1.5; u.stun = 0; u.burnT = 0; u.paintT = 0; u.grab = false;
    u.shield = kind === 'line' ? 1 : 0.4; u.speed = 0;
    u.rig.root.visible = true; u.rig.pose = newPose();
    u.rig.root.position.copy(u.pos);
    squad.units.push(u);
    return u;
  }

  // ------------------------------------------------------------------ squads
  // A shield wall centred on (x, z), facing along `dir` (a unit vector on the ground), `n` wide.
  // It walks towards `goal` (a point on its axis) and holds there; hold() / advance() steer it.
  spawnLine({ x, z, dir = V(0, 0, -1), n = 8, spacing = 1.25, goal = null, speed = RIOT.lineSpeed, hp = RIOT.hp, name = 'line' }) {
    const d = dir.clone().setY(0).normalize();
    const lat = V(d.z, 0, -d.x);
    const sq = { kind: 'line', name, units: [], center: V(x, 0, z), dir: d, lat, spacing, goal: goal ? goal.clone() : null, speed, hp, mode: goal ? 'advance' : 'hold', chargeT: 0, st: 0, broken: false };
    const heading = Math.atan2(d.x, d.z);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * spacing;
      const u = this._take(sq.center.clone().addScaledVector(lat, off), heading, 'line', sq);
      if (u) u.slot = off;
    }
    this.squads.push(sq);
    return sq;
  }

  // Officers who run the protester down. `from` is where they break out.
  spawnSnatch({ x, z, n = 2, hp = 3, delay = 0, name = 'snatch' }) {
    const sq = { kind: 'snatch', name, units: [], hp, st: 0, delay };
    for (let i = 0; i < n; i++) {
      const u = this._take(V(x + (i - (n - 1) / 2) * 1.1, 0, z), 0, 'snatch', sq);
      if (u) { u.state = delay > 0 ? 'idle' : 'chase'; u.cool = 0; }
    }
    this.squads.push(sq);
    return sq;
  }

  spawnGasser({ x, z, name = 'gas' }) {
    const sq = { kind: 'gasser', name, units: [], hp: 3, st: 0 };
    const u = this._take(V(x, 0, z), 0, 'gasser', sq);
    if (u) { u.gasT = 3 + this.rng() * 3; }
    this.squads.push(sq);
    return sq;
  }

  hold(sq) { if (sq) sq.mode = 'hold'; }
  advance(sq, goal, speed) { if (!sq) return; if (goal) sq.goal = goal.clone(); if (speed) sq.speed = speed; sq.mode = 'advance'; }
  charge(sq, dist = 7) {
    if (!sq || sq.broken) return;
    sq.mode = 'charge'; sq.chargeT = dist / RIOT.chargeSpeed;
    this.game.audio.roar(sq.center);
    this.game.crowd.disturb(sq.center.clone().addScaledVector(sq.dir, 6), 16, 0.9, 'charge');
  }
  // squad members still on their feet
  alive(sq) { return sq ? sq.units.filter((u) => u.active && u.squad === sq && u.state !== 'down' && u.state !== 'rout').length : 0; }
  // a squad that has lost most of its officers falls back
  _checkBroken(sq) {
    if (!sq || sq.broken) return;
    const left = this.alive(sq), total = sq.units.length;
    if (left <= Math.floor(total * 0.34)) {
      sq.broken = true;
      for (const u of sq.units) if (u.active && u.state !== 'down') { u.state = 'rout'; u.st = 0; }
      if (this.onSquadBroken) this.onSquadBroken(sq);
    }
  }

  // ------------------------------------------------------------------ damage
  // projectile hit test (thrown by the protester or his comrades): the officer it struck
  hitTest(p) {
    for (const u of this.units) {
      if (!u.active || u.state === 'down') continue;
      const dx = p.x - u.pos.x, dz = p.z - u.pos.z;
      if (dx * dx + dz * dz < 0.5 * 0.5 && p.y > 0.2 && p.y < 2.0) return u;
    }
    return null;
  }

  nearest(pos, maxD = 999, filter = null) {
    let best = null, bd = maxD * maxD;
    for (const u of this.units) {
      if (!u.active || u.state === 'down' || u.state === 'rout') continue;
      if (filter && !filter(u)) continue;
      const d = (u.pos.x - pos.x) ** 2 + (u.pos.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = u; }
    }
    return best;
  }

  _blocks(u, from) {
    if (u.shield < 0.6 || u.stun > 0 || u.state === 'stagger' || u.state === 'rout') return false;
    const fx = Math.sin(u.heading), fz = Math.cos(u.heading);
    const dx = from.x - u.pos.x, dz = from.z - u.pos.z, d = Math.hypot(dx, dz) || 1;
    return (fx * dx + fz * dz) / d > RIOT.blockFront;
  }

  // A projectile reached an officer (or burst near some). type: stone | bottle | paint | firework | petrol
  // by: 'player' | 'ally'. Returns 'blocked' | 'hit' | null.
  projectileHit(u, type, from, by = 'player') {
    const g = this.game;
    if (!u || !u.active || u.state === 'down') return null;
    if (type !== 'petrol' && type !== 'firework' && this._blocks(u, from) && this.rng() < RIOT.blockChance) {
      this.stats.blocked++;
      g.audio.impact(u.pos, false, true);
      g.effects.impact(u.pos.clone().setY(1.3));
      u.flinch = 0.3;
      return 'blocked';
    }
    const dmg = { stone: 1.2, bottle: 1.2, paint: 0.4, firework: 1.6, petrol: 2.5 }[type] ?? 1;
    if (type === 'paint') { u.paintT = 3.2; u.stun = Math.max(u.stun, 2.2); }
    if (type === 'firework') u.stun = Math.max(u.stun, 1.4);
    this._damage(u, dmg, from, by);
    return 'hit';
  }

  // a blast (petrol, firework burst) hurts every officer around it
  blast(pos, radius, type, by = 'player') {
    let n = 0;
    for (const u of this.units) {
      if (!u.active || u.state === 'down') continue;
      const d = Math.hypot(u.pos.x - pos.x, u.pos.z - pos.z);
      if (d > radius) continue;
      n++;
      if (type === 'petrol') u.burnT = 2.5;
      this._damage(u, (type === 'petrol' ? 2.2 : 1.2) * (1 - d / radius * 0.5), pos, by);
    }
    return n;
  }

  // the protester's shove or punch. power: 1 punch, 1.6 shove from a sprint
  meleeHit(u, from, power = 1) {
    const g = this.game;
    if (!u || !u.active || u.state === 'down') return null;
    if (this._blocks(u, from) && power < 1.5) {
      this.stats.blocked++;
      g.audio.impact(u.pos, false, true);
      u.flinch = 0.3;
      // a raised shield shoves back
      const dir = V(from.x - u.pos.x, 0, from.z - u.pos.z).normalize();
      g.player.knock.addScaledVector(dir, 3.4);
      g.player.staggerT = Math.max(g.player.staggerT, 0.3);
      return 'blocked';
    }
    this._damage(u, power, from, 'player');
    return 'hit';
  }

  // the protester's comrades (crowd.js hostile NPCs in 'riot' target mode)
  allyHit(u, kind, from) {
    if (!u.active || u.state === 'down') return;
    if (this._blocks(u, from) && this.rng() < 0.7) { this.game.audio.impact(u.pos, false, true); u.flinch = 0.25; return; }
    this._damage(u, kind === 'melee' ? 0.6 : 0.8, from, 'ally');
  }

  _damage(u, dmg, from, by) {
    const g = this.game;
    u.hp -= dmg;
    this.stats.hits++;
    const dir = V(u.pos.x - from.x, 0, u.pos.z - from.z);
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
    dir.normalize();
    g.audio.impact(u.pos, dmg > 1.4);
    g.effects.impact(u.pos.clone().setY(1.3));
    if (u.grab) this.release(u, true);
    if (u.hp <= 0) {
      u.state = 'down'; u.st = 0; u.dur = 3.5 + this.rng() * 2; u.fallDir = this.rng() < 0.5 ? 1 : -1;
      u.knock.copy(dir).multiplyScalar(3.5);
      u.atk = null;
      this.stats.down++;
      g.effects.dust(u.pos.clone().setY(0.2), 10);
      g.crowd.disturb(u.pos, 10, 0.35, 'violence');
      if (this.onDown) this.onDown(u, by);
      this._checkBroken(u.squad);
    } else {
      u.state = u.state === 'grab' ? 'stagger' : (u.state === 'form' || u.state === 'chase' || u.state === 'idle' || u.state === 'atk' || u.state === 'gas') ? 'stagger' : u.state;
      if (u.state === 'stagger') { u.st = 0; u.dur = 0.55; u.atk = null; }
      u.knock.copy(dir).multiplyScalar(2.6);
      if (this.onHit) this.onHit(u, by);
    }
  }

  // target adapter for the protester's comrades (crowd.js `riot` target mode)
  targetFor(n) {
    const u = this.nearest(n.pos, 40);
    if (!u) return null;
    if (!u.adapter) u.adapter = { pos: u.pos, isPlayer: false, cop: null, vehicle: { hit: (kind, from) => this.allyHit(u, kind, from) } };
    return u.adapter;
  }

  // ------------------------------------------------------------------ grabbing
  grab(u) {
    const g = this.game, p = g.player;
    if (p.grabbedBy || p.dead || p.detained) return false;
    u.state = 'grab'; u.st = 0; u.grab = true;
    p.onGrabbed(u);
    g.audio.shout(u.pos);
    return true;
  }
  release(u, stagger = false) {
    const p = this.game.player;
    u.grab = false;
    if (p.grabbedBy === u) p.grabbedBy = null;
    if (stagger) { u.state = 'stagger'; u.st = 0; u.dur = 1.3; u.stun = 1.0; }
    else if (u.state === 'grab') { u.state = 'idle'; u.st = 0; }
    u.cool = 2.5;
  }

  // ------------------------------------------------------------------ update
  update(dt, player) {
    this.time += dt;
    const t = this.time, g = this.game;
    for (const sq of this.squads) this._updateSquad(sq, dt, player);
    for (const u of this.units) {
      if (!u.active) continue;
      u.st += dt;
      u.stun = Math.max(0, u.stun - dt);
      u.paintT = Math.max(0, (u.paintT || 0) - dt);
      u.flinch = Math.max(0, (u.flinch || 0) - dt);
      u.cool -= dt;
      if (u.burnT > 0) {
        u.burnT -= dt;
        if (this.rng() < 0.6) g.effects.fire.spawn({ pos: u.pos.clone().add(V((this.rng() - 0.5) * 0.4, 0.6 + this.rng() * 0.9, (this.rng() - 0.5) * 0.4)), vel: V(0, 1.6, 0), size: 0.35, life: 0.35, alpha: 0.9, color: new THREE.Color(1, 0.7, 0.3), color2: new THREE.Color(0.9, 0.2, 0), drag: 1, frame: 0 });
      }
      this._think(u, dt, player);
      this._move(u, dt, player);
    }
    this._separate(dt, player);
    this._draw(dt, t);
  }

  _updateSquad(sq, dt, player) {
    sq.st += dt;
    if (sq.kind !== 'line') return;
    const units = sq.units.filter((u) => u.active && u.squad === sq && u.state !== 'down' && u.state !== 'rout');
    if (!units.length) { sq.broken = true; return; }
    if (sq.broken) return;
    // the line's centre walks; members keep their slots across it
    let sp = 0;
    if (sq.mode === 'advance' && sq.goal) {
      const to = V(sq.goal.x - sq.center.x, 0, sq.goal.z - sq.center.z);
      const along = to.dot(sq.dir);
      if (along < 0.3) { sq.mode = 'hold'; if (this.onLineArrived) this.onLineArrived(sq); }
      else sp = sq.speed;
    } else if (sq.mode === 'charge') {
      sq.chargeT -= dt; sp = RIOT.chargeSpeed;
      if (sq.chargeT <= 0) sq.mode = sq.goal ? 'advance' : 'hold';
    }
    // a barricade across the line's path stops it: they pull it apart
    sq.blockedBy = null;
    if (sp > 0) {
      const ahead = sq.center.clone().addScaledVector(sq.dir, 2.4);
      for (const b of this.barriers) {
        if (b.hp <= 0) continue;
        const lx = (ahead.x - b.x) * sq.lat.x + (ahead.z - b.z) * sq.lat.z;
        const lz = (ahead.x - b.x) * sq.dir.x + (ahead.z - b.z) * sq.dir.z;
        if (Math.abs(lz) < b.r * 0.6 + 1 && Math.abs(lx) < b.r + sq.spacing * units.length / 2) { sq.blockedBy = b; break; }
      }
      if (sq.blockedBy) {
        sp = 0;
        const b = sq.blockedBy;
        b.hp -= dt * units.length * 0.06;
        if (b.hp <= 0 && b.onBreak) b.onBreak(b);
      }
    }
    // the line slows while its members are out of position (staggered, fighting)
    const lag = units.filter((u) => u.state !== 'form').length / units.length;
    sq.center.addScaledVector(sq.dir, sp * (1 - lag * 0.6) * dt);
    this.game.world.resolveCircle(sq.center, 0.1);
  }

  _slotPos(u) {
    const sq = u.squad;
    return sq.center.clone().addScaledVector(sq.lat, u.slot);
  }

  _think(u, dt, player) {
    const g = this.game;
    if (u.state === 'down') {
      if (u.st > u.dur) { u.state = 'rout'; u.st = 0; u.hp = 0.5; }
      return;
    }
    if (u.state === 'stagger') { if (u.st > u.dur) { u.state = u.kind === 'line' ? 'form' : u.kind === 'snatch' ? 'chase' : 'idle'; u.st = 0; } return; }
    if (u.state === 'rout') {
      // limps back the way the squad came; vanishes once out of sight or after a while
      if (u.st > 14 || (u.st > 3 && Math.hypot(u.pos.x - player.pos.x, u.pos.z - player.pos.z) > 42)) { this.stats.routed++; this._retire(u); }
      return;
    }
    if (u.state === 'grab') {
      // holds the protester; the struggle is the protester's (activist.js)
      if (player.grabbedBy !== u) this.release(u);
      return;
    }
    if (u.stun > 0) return;
    if (u.atk) {
      u.atk.t += dt;
      const a = u.atk;
      if (a.phase === 'wind' && a.t > a.wind) {
        a.phase = 'strike'; a.t = 0;
        g.audio.swing(u.pos);
        this._resolveAttack(u, a);
      } else if (a.phase === 'strike' && a.t > 0.18) { a.phase = 'rec'; a.t = 0; }
      else if (a.phase === 'rec' && a.t > 0.5) { u.atk = null; u.cool = 0.9 + this.rng() * 1.4; }
      return;
    }
    const pd = Math.hypot(player.pos.x - u.pos.x, player.pos.z - u.pos.z);
    const playerOk = !player.dead && !player.detained;
    if (u.kind === 'line') {
      // bash whoever is pressed against the shields: the protester first, else a demonstrator
      if (u.cool <= 0) {
        const fx = Math.sin(u.heading), fz = Math.cos(u.heading);
        const front = (p) => { const dx = p.x - u.pos.x, dz = p.z - u.pos.z, d = Math.hypot(dx, dz); return d < RIOT.bashReach && (dx * fx + dz * fz) / (d || 1) > 0.3; };
        if (playerOk && front(player.pos)) u.atk = { phase: 'wind', t: 0, wind: 0.42, kind: 'bash', target: player };
        else {
          const n = g.crowd.query(u.pos.x, u.pos.z, RIOT.bashReach, []).find((o) => o.id !== undefined && o.state !== 'down' && o.state !== 'gone' && o.state !== 'arrested' && front(o.pos));
          if (n && this.rng() < 0.5) u.atk = { phase: 'wind', t: 0, wind: 0.5, kind: 'bash', target: n };
          else u.cool = 0.4;
        }
      }
    } else if (u.kind === 'snatch') {
      if (u.state === 'idle') {
        if (u.squad.st > (u.squad.delay || 0)) { u.state = 'chase'; u.st = 0; }
        return;
      }
      if (u.state === 'chase' && playerOk) {
        if (pd < RIOT.grabReach && u.cool <= 0 && player.invuln <= 0 && player.dodgeT <= 0 && !player.grabbedBy) {
          if (!this.grab(u)) u.atk = { phase: 'wind', t: 0, wind: 0.32, kind: 'baton', target: player };
        } else if (pd < 1.5 && player.grabbedBy && player.grabbedBy !== u && u.cool <= 0) {
          // a partner holds him: this one keeps the comrades off
          const n = g.crowd.nearest(u.pos, (o) => o.follower && o.state !== 'down', 2.2);
          if (n) u.atk = { phase: 'wind', t: 0, wind: 0.35, kind: 'baton', target: n };
        }
      }
    } else if (u.kind === 'gasser') {
      u.gasT = (u.gasT ?? 5) - dt;
      if (u.gasT <= 0 && playerOk && pd < RIOT.gasRange) {
        u.gasT = RIOT.gasEvery[0] + this.rng() * (RIOT.gasEvery[1] - RIOT.gasEvery[0]);
        u.state = 'gas'; u.st = 0;
        const to = player.pos.clone().addScaledVector(player.vel, 0.9).add(V((this.rng() - 0.5) * 3, 0.1, (this.rng() - 0.5) * 3));
        const from = u.pos.clone().setY(2.1);
        g.audio.thump(from);
        g.effects.throwProjectile(from, to, 'canister', (pos) => g.events.gasCloud(pos, 'police'), 1.1 + this.rng() * 0.4);
        if (this.onGas) this.onGas(u);
      }
      if (u.state === 'gas' && u.st > 0.6) { u.state = 'idle'; u.st = 0; }
    }
  }

  _resolveAttack(u, a) {
    const g = this.game, tg = a.target;
    if (!tg) return;
    const dx = tg.pos.x - u.pos.x, dz = tg.pos.z - u.pos.z, d = Math.hypot(dx, dz) || 1;
    const reach = a.kind === 'bash' ? RIOT.bashReach + 0.35 : 1.9;
    if (d > reach) return;
    const dir = V(dx / d, 0, dz / d);
    if (tg === g.player) {
      const dmg = a.kind === 'bash' ? RIOT.bashDamage : RIOT.batonDamage;
      g.player.takeDamage(dmg, u.pos, dir.clone().multiplyScalar(a.kind === 'bash' ? RIOT.bashPush : 2.5));
    } else if (tg.id !== undefined) {
      g.crowd.copHit(tg, dir);
      if (this.onCrowdStruck) this.onCrowdStruck(tg, u);
    }
  }

  _move(u, dt, player) {
    const g = this.game;
    let want = null, speed = 0;
    if (u.state === 'down' || u.state === 'grab' || u.stun > 0 || u.state === 'gas' || u.atk) speed = 0;
    else if (u.state === 'rout') {
      // back the way they came: against the squad's advance, or away from the protester
      const sq = u.squad;
      const away = sq && sq.dir ? sq.dir.clone().negate() : V(u.pos.x - player.pos.x, 0, u.pos.z - player.pos.z).normalize();
      want = u.pos.clone().addScaledVector(away, 5); speed = 1.8;
    } else if (u.state === 'stagger') speed = 0;
    else if (u.kind === 'line') {
      want = this._slotPos(u);
      const d = Math.hypot(want.x - u.pos.x, want.z - u.pos.z);
      speed = Math.min(u.squad.mode === 'charge' ? RIOT.chargeSpeed + 0.6 : 3.2, d * 3);
    } else if (u.kind === 'snatch' && u.state === 'chase') {
      want = player.pos;
      const d = Math.hypot(want.x - u.pos.x, want.z - u.pos.z);
      speed = d < 11 ? RIOT.snatchSprint : RIOT.snatchJog;
      if (player.grabbedBy && player.grabbedBy !== u) speed = Math.min(speed, d > 1.4 ? 3 : 0);
      if (u.paintT > 0) speed *= 0.4; // can't see through the paint on his visor
    }
    const desired = V();
    if (want) {
      desired.set(want.x - u.pos.x, 0, want.z - u.pos.z);
      const d = desired.length();
      if (d > 0.05) desired.multiplyScalar(1 / d); else speed = 0;
      // simple avoidance: probe ahead, try rotated directions
      if (speed > 0.5) {
        const look = 1.2;
        if (g.world.blocked(u.pos.x + desired.x * look, u.pos.z + desired.z * look, 0.3)) {
          for (const a of [0.7, -0.7, 1.4, -1.4]) {
            const c = Math.cos(a), s = Math.sin(a);
            const dx = desired.x * c - desired.z * s, dz = desired.x * s + desired.z * c;
            if (!g.world.blocked(u.pos.x + dx * look, u.pos.z + dz * look, 0.3)) { desired.set(dx, 0, dz); break; }
          }
        }
      }
    }
    if (u.burnT > 0 && u.state !== 'down') { speed = Math.max(speed, 2.5); }
    const k = 1 - Math.exp(-8 * dt);
    u.vel.x += (desired.x * speed - u.vel.x) * k;
    u.vel.z += (desired.z * speed - u.vel.z) * k;
    u.pos.x += (u.vel.x + u.knock.x) * dt;
    u.pos.z += (u.vel.z + u.knock.z) * dt;
    u.knock.multiplyScalar(Math.exp(-dt * 6));
    g.world.resolveCircle(u.pos, R_BODY);
    u.pos.y += (g.world.groundHeight(u.pos.x, u.pos.z) - u.pos.y) * Math.min(1, dt * 12);
    u.speed = Math.hypot(u.vel.x, u.vel.z);
    // facing
    let h = u.heading;
    if (u.state === 'down') h = u.heading;
    else if (u.atk && u.atk.target) h = headingTo(u.pos, u.atk.target.pos);
    else if (u.state === 'grab') h = headingTo(u.pos, player.pos);
    else if (u.kind === 'line' && u.state === 'form') {
      // the wall faces down its axis, turning a little towards the protester when he is close
      h = Math.atan2(u.squad.dir.x, u.squad.dir.z);
      const pd = Math.hypot(player.pos.x - u.pos.x, player.pos.z - u.pos.z);
      if (pd < 6) h = angleLerp(h, headingTo(u.pos, player.pos), 0.5);
    } else if (u.kind === 'gasser') h = headingTo(u.pos, player.pos);
    else if (u.speed > 0.4) h = Math.atan2(u.vel.x, u.vel.z);
    u.heading = angleLerp(u.heading, h, 1 - Math.exp(-dt * 8));
    // shield: raised in the wall, lowered while running or downed
    const sh = u.state === 'down' || u.state === 'rout' ? 0 : u.kind === 'line' ? 1 : u.state === 'chase' ? 0.15 : 0.5;
    u.shield += (sh - u.shield) * Math.min(1, dt * 5);
  }

  _separate(dt, player) {
    const g = this.game;
    const list = this.units.filter((u) => u.active && u.state !== 'down');
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d2 = dx * dx + dz * dz, m = 0.8;
        if (d2 < m * m && d2 > 1e-6) { const d = Math.sqrt(d2), o = (m - d) / d * 0.5; a.pos.x -= dx * o; a.pos.z -= dz * o; b.pos.x += dx * o; b.pos.z += dz * o; }
      }
      // the protester: a shield wall is a wall; a running officer is a body
      if (!player.detained) {
        const dx = player.pos.x - a.pos.x, dz = player.pos.z - a.pos.z, d2 = dx * dx + dz * dz, m = 0.78;
        if (d2 < m * m && d2 > 1e-6) {
          const d = Math.sqrt(d2), o = (m - d) / d, pk = a.kind === 'line' ? 0.9 : 0.6;
          player.pos.x += dx * o * pk; player.pos.z += dz * o * pk; a.pos.x -= dx * o * (1 - pk); a.pos.z -= dz * o * (1 - pk);
        }
      }
      // demonstrators are pushed aside (a line walks through a crowd)
      for (const n of g.crowd.query(a.pos.x, a.pos.z, 0.9, [])) {
        if (n.id === undefined || n.state === 'gone') continue;
        const dx = n.pos.x - a.pos.x, dz = n.pos.z - a.pos.z, d2 = dx * dx + dz * dz, m = 0.78;
        if (d2 < m * m && d2 > 1e-6) { const d = Math.sqrt(d2), o = (m - d) / d; n.pos.x += dx * o; n.pos.z += dz * o; }
      }
    }
  }

  _draw(dt, t) {
    const cam = this.game.camera.position;
    const vis = this.units.filter((u) => u.active).sort((a, b) => a.pos.distanceToSquared(cam) - b.pos.distanceToSquared(cam));
    vis.forEach((u, i) => {
      const rig = u.rig;
      const far = i >= MAX_DRAWN || u.pos.distanceToSquared(cam) > 85 * 85;
      rig.root.visible = !far;
      if (far) return;
      const P = newPose();
      baseLayer(P, rig, u.state === 'down' ? 0 : u.speed, t + u.id * 0.37, dt, u.kind === 'line');
      let rate = 10;
      updateShield(rig, u.shield);
      P.shLX = -1.3 * u.shield; P.elL = -0.5 * u.shield; P.shRX = -0.3; P.elR = -0.5;
      if (u.flinch > 0) { P.spX = -0.25; P.hdX = -0.2; }
      const a = u.atk;
      if (a) {
        rate = 26;
        if (a.kind === 'bash') {
          if (a.phase === 'wind') { P.spX = -0.15; P.shLX = -1.1; P.elL = -0.9; P.spY = 0.25; }
          else if (a.phase === 'strike') { P.spX = 0.3; P.shLX = -1.5; P.elL = -0.2; P.hpLX = -0.5; P.knL = 0.35; }
        } else if (a.phase === 'wind') { P.shRX = -2.6; P.shRZ = -0.45; P.elR = -1.35; P.spY = -0.45; P.spX = -0.05; }
        else if (a.phase === 'strike') { P.shRX = -0.55; P.shRZ = 0.32; P.elR = -0.15; P.spY = 0.5; P.spX = 0.25; P.hpLX = -0.5; P.knL = 0.35; }
        else { P.shRX = -0.6; P.elR = -0.6; P.spY = 0.15; }
      }
      if (u.state === 'grab') { rate = 14; P.shRX = -1.3; P.elR = -0.7; P.shLX = -1.2; P.elL = -0.8; P.spX = 0.25; }
      if (u.state === 'gas') { rate = 22; P.shRX = -2.7; P.elR = -1.4; P.spY = -0.35; }
      if (u.state === 'stagger') { rate = 16; P.spX = -0.35; P.hdX = -0.3; P.shRZ = -0.5; P.shLZ = 0.5; }
      if (u.stun > 0 && u.state !== 'down') { P.shRX = -2.4; P.elR = -2.2; P.hdX = 0.3; P.spX = 0.3; } // rubbing at the visor
      if (u.state === 'rout') { P.spX = 0.25; P.hdX = 0.2; }
      if (u.state === 'down') { rate = 6; lying(P, u.fallDir || 1, Math.min(1, u.st * 3), t); }
      applyPose(rig, P, dt, rate);
      rig.root.position.copy(u.pos);
      if (u.state === 'down') rig.root.position.y += 0.1;
      rig.root.rotation.y = u.heading;
      // paint dripping off the visor
      if (u.paintT > 0 && Math.random() < 0.25) this.game.effects.fire.spawn({ pos: u.pos.clone().add(V(Math.sin(u.heading) * 0.2, 1.65, Math.cos(u.heading) * 0.2)), vel: V(0, -0.6, 0), size: 0.09, life: 0.5, alpha: 0.9, color: new THREE.Color(1, 0.2, 0.65), grav: 3, drag: 1, frame: 3 });
    });
  }

  // for the minimap: officers on the street
  mapDots() { return this.units.filter((u) => u.active && u.state !== 'rout').map((u) => ({ x: u.pos.x, z: u.pos.z, kind: u.kind, down: u.state === 'down' })); }
}
