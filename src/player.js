// Player CRS officer: camera-relative movement, sprint/dodge, baton combat,
// shield stance, damage & reactions.
import * as THREE from 'three';
import { buildCharacter, addPoliceGear, newPose, baseLayer, applyPose, updateShield } from './characters.js';

const WINDUP = 0.13, STRIKE = 0.12, RECOVER = 0.3;

function angleLerp(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

export class Player {
  constructor(game) {
    this.game = game;
    this.rig = buildCharacter(game.world, { skin: 0xd8b090, height: 1.02 }, 'police');
    addPoliceGear(this.rig);
    game.scene.add(this.rig.root);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.reset();
  }

  reset() {
    const s = this.start || { x: 0.5, z: 141, heading: Math.PI }; // set per level; Level 1 faces north (-z)
    this.pos.set(s.x, 0, s.z);
    this.vel.set(0, 0, 0);
    this.heading = s.heading;
    this.health = 100;
    this.stamina = 100;
    this.attack = null;      // {phase, t, target, hit}
    this.attackBuffer = 0;
    this.blocking = false;
    this.blockK = 0;
    this.dodgeT = 0; this.dodgeCool = 0; this.dodgeDir = new THREE.Vector3();
    this.staggerT = 0; this.staggerDir = new THREE.Vector3();
    this.invuln = 0;
    this.sinceDamage = 99;
    this.speed = 0;
    this.sprinting = false;
    this.dead = false;
    this.knock = new THREE.Vector3();
    this.lastStepPhase = 0;
    this.rig.pose = newPose();
    this.surgePush = 0;
    this.medkits = 3;  // first-aid kits per run (Q)
    this.healT = 0;
  }

  forward() { return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading)); }

  // projectile hit test against the officer's body
  hitTest(p) {
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
    return dx * dx + dz * dz < 0.45 * 0.45 && p.y > this.pos.y + 0.2 && p.y < this.pos.y + 1.95;
  }

  takeDamage(amount, fromPos, push, projectile = false) {
    const g = this.game;
    if (this.dead || this.invuln > 0) return 0;
    let blocked = false;
    if (fromPos && this.blockK > 0.6) {
      const to = new THREE.Vector3(fromPos.x - this.pos.x, 0, fromPos.z - this.pos.z).normalize();
      if (to.dot(this.forward()) > 0.25) blocked = true;
    }
    if (blocked) {
      amount *= 0.12;
      this.stamina = Math.max(0, this.stamina - (projectile ? 4 : 9));
      g.audio.impact(this.pos, false, true);
      g.cameraRig.shake(0.12);
      if (push) this.knock.addScaledVector(push, 0.25);
      g.hud.alert('Blocked', 'good', 0.8, 'block');
    } else {
      this.staggerT = projectile ? 0.25 : 0.38;
      if (push) { this.knock.add(push); this.staggerDir.copy(push).normalize(); }
      else if (fromPos) this.staggerDir.set(this.pos.x - fromPos.x, 0, this.pos.z - fromPos.z).normalize();
      g.audio.impact(this.pos, amount > 8);
      g.audio.hurt(true);
      g.cameraRig.shake(0.35);
      g.hud.damageFlash(Math.min(1, amount / 20));
      // a hit interrupts your own wind-up
      if (this.attack && this.attack.phase === 'windup') this.attack = null;
    }
    this.health = Math.max(0, this.health - amount);
    this.sinceDamage = 0;
    if (this.health <= 0 && !this.dead) { this.dead = true; g.onPlayerDown(); }
    return amount;
  }

  // who the baton may land on: scripted characters off-fight never; during a boss fight
  // only the boss; cuffed suspects only with the police-brutality option on
  _strikeable(n) {
    const g = this.game;
    if (n.id === undefined || n.untargetable || n.state === 'gone') return false;
    if (n.state === 'arrested' && !(g.prefs && g.prefs.brutality)) return false;
    if (g.crowd.arena && n !== g.crowd.arena.boss) return false;
    if (n.script && n.script.onBaton && this._grounded(n)) return false; // a downed boss is handled by its script
    return true;
  }
  _grounded(n) { return n.state === 'down' || n.state === 'recover' || n.state === 'surrender' || n.state === 'arrested'; }

  _findTarget(aims) {
    // soft lock: the best agent near the camera aim or the movement direction, preferring
    // active threats; an aggressor right on top of you is picked whichever way you face,
    // and people already on the ground only when nobody standing is in reach
    const crowd = this.game.crowd;
    const list = crowd.query(this.pos.x, this.pos.z, 3.6, []);
    let best = null, bs = Infinity;
    for (const n of list) {
      if (!this._strikeable(n)) continue;
      const dx = n.pos.x - this.pos.x, dz = n.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz) || 1e-3;
      let ang = Math.PI;
      for (const a of aims) ang = Math.min(ang, Math.acos(Math.max(-1, Math.min(1, (dx * a.x + dz * a.z) / d))));
      const threat = crowd.isThreat(n), grounded = this._grounded(n);
      if (grounded) { if (ang > 0.9 || d > 2.6) continue; }
      else if (ang > 1.25 && !(threat && d < 1.7 + n.radius)) continue;
      const score = d * 0.8 + ang * 1.1 - (threat ? 1.6 : 0) + (grounded ? 3 : 0);
      if (score < bs) { bs = score; best = n; }
    }
    return best;
  }

  update(dt, input, camYaw) {
    const g = this.game;
    this.sinceDamage += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.dodgeCool = Math.max(0, this.dodgeCool - dt);
    this.staggerT = Math.max(0, this.staggerT - dt);
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);

    const camF = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const camR = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    const wish = new THREE.Vector3();
    if (!this.dead) {
      if (input.down('KeyW')) wish.add(camF);
      if (input.down('KeyS')) wish.sub(camF);
      if (input.down('KeyD')) wish.add(camR);
      if (input.down('KeyA')) wish.sub(camR);
      // analog stick (touch): partial deflection walks slower
      if (input.axis.x || input.axis.y) wish.addScaledVector(camF, -input.axis.y).addScaledVector(camR, input.axis.x);
    }
    if (wish.lengthSq() > 1) wish.normalize();

    // --- stance & attacks
    this.blocking = !this.dead && input.mouse(2) && !this.attack && this.dodgeT <= 0;
    this.blockK += ((this.blocking ? 1 : 0) - this.blockK) * Math.min(1, dt * 14);
    if (input.pressed('Mouse0')) this.attackBuffer = 0.22;
    const canAttack = !this.dead && this.staggerT <= 0 && this.dodgeT <= 0 && (!this.attack || (this.attack.phase === 'recover' && this.attack.t > 0.14));
    if (this.attackBuffer > 0 && canAttack) {
      this.attackBuffer = 0;
      const aims = [camF];
      if (wish.lengthSq() > 0.04) aims.push(wish.clone().normalize());
      const target = this._findTarget(aims);
      this.attack = { phase: 'windup', t: 0, target, hit: false };
      // the whoosh peaks as the baton comes down, just before the impact
      g.audio.swing(this.pos);
      if (target) this.heading = Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
      else this.heading = Math.atan2(camF.x, camF.z);
    }
    if (this.attack) {
      const a = this.attack;
      a.t += dt;
      if (a.phase === 'windup' && a.t >= WINDUP) { a.phase = 'strike'; a.t = 0; this._resolveStrike(); }
      else if (a.phase === 'strike' && a.t >= STRIKE) { a.phase = 'recover'; a.t = 0; }
      else if (a.phase === 'recover' && a.t >= RECOVER) this.attack = null;
    }

    // --- dodge
    if (!this.dead && input.pressed('Space') && this.dodgeCool <= 0 && this.stamina > 12 && this.staggerT <= 0) {
      this.dodgeDir.copy(wish.lengthSq() > 0 ? wish : this.forward().negate()).normalize();
      this.dodgeT = 0.32; this.dodgeCool = 0.75; this.invuln = 0.28;
      if (g.missions && g.missions.stats.dodges !== undefined) g.missions.stats.dodges++;
      this.stamina -= 18;
      this.attack = null;
      g.audio.footstep(this.pos, 0.3, true);
      g.effects.dust(this.pos.clone().setY(0.1), 4);
    }

    // --- locomotion
    const shift = input.down('ShiftLeft') || input.down('ShiftRight');
    this.sprinting = shift && wish.lengthSq() > 0 && !this.blocking && !this.attack && this.stamina > 1;
    let maxSpeed = this.blocking ? 1.9 : this.sprinting ? 6.6 : 4.0;
    if (this.attack) maxSpeed = this.attack.phase === 'strike' ? 2.2 : 1.0;
    if (this.staggerT > 0) maxSpeed = 0.8;
    if (this.dead) maxSpeed = 0;
    const target = wish.clone().multiplyScalar(maxSpeed);
    if (this.attack && this.attack.phase === 'strike' && this.attack.target) {
      const tdir = new THREE.Vector3(this.attack.target.pos.x - this.pos.x, 0, this.attack.target.pos.z - this.pos.z);
      if (tdir.length() > 1.3) target.copy(tdir.normalize().multiplyScalar(3.2)); // lunge into range
    }
    const accel = wish.lengthSq() > 0 ? 16 : 12;
    const k = 1 - Math.exp(-accel * dt);
    this.vel.x += (target.x - this.vel.x) * k;
    this.vel.z += (target.z - this.vel.z) * k;
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      this.vel.copy(this.dodgeDir).multiplyScalar(8.5 * Math.max(0.3, this.dodgeT / 0.32));
    }
    this.pos.x += (this.vel.x + this.knock.x) * dt;
    this.pos.z += (this.vel.z + this.knock.z) * dt;
    this.knock.multiplyScalar(Math.exp(-dt * 6));
    g.world.resolveCircle(this.pos, 0.36);
    this.pos.y += (g.world.groundHeight(this.pos.x, this.pos.z) - this.pos.y) * Math.min(1, dt * 14);
    this.speed = Math.hypot(this.vel.x, this.vel.z);

    // stamina & health regen
    if (this.sprinting) this.stamina = Math.max(0, this.stamina - dt * 16);
    else this.stamina = Math.min(100, this.stamina + dt * (this.blocking ? 6 : 14));
    if (this.sinceDamage > 5 && !this.dead) this.health = Math.min(100, this.health + dt * 4);

    // first aid (Q): restores 40 health over 1.6 s, three kits per run
    if (!this.dead && input.pressed('KeyQ')) {
      if (this.medkits > 0 && this.health < 100 && this.healT <= 0) {
        this.medkits--; this.healT = 1.6;
        g.hud.alert(`First aid +40 · ${this.medkits} kit${this.medkits === 1 ? '' : 's'} left`, 'good', 1.8, 'medkit');
        g.audio.ui('good');
      } else if (this.medkits <= 0) g.hud.alert('No first-aid kits left', 'warn', 1.5, 'medkit');
    }
    if (this.healT > 0) {
      this.healT -= dt;
      if (!this.dead) this.health = Math.min(100, this.health + dt * 25);
    }

    // petrol fire damage (no blocking flames)
    if (!this.dead && g.effects.inFire(this.pos)) {
      this.health = Math.max(0, this.health - dt * 15);
      this.sinceDamage = 0;
      g.hud.damageFlash(0.4);
      if (this.health <= 0) { this.dead = true; g.onPlayerDown(); }
    }

    // --- facing
    let want = this.heading;
    if (this.blocking) want = Math.atan2(camF.x, camF.z);
    else if (this.attack && this.attack.target && this.attack.phase !== 'recover') {
      // keep turning onto the locked target through wind-up and strike
      const tp = this.attack.target.pos;
      want = Math.atan2(tp.x - this.pos.x, tp.z - this.pos.z);
    } else if (this.attack) want = this.heading;
    else if (this.speed > 0.3 && this.dodgeT <= 0) want = Math.atan2(this.vel.x, this.vel.z);
    const turnRate = this.attack ? 24 : this.blocking ? 14 : this.sprinting ? 9 : 13;
    this.heading = angleLerp(this.heading, want, 1 - Math.exp(-dt * turnRate));

    this._animate(dt, g.time);
  }

  _resolveStrike() {
    const g = this.game;
    const fwd = this.forward();
    const reach = (n, d) => d <= 2.15 + n.radius * 0.5;
    let best = null;
    // the locked target is hit if it is still in reach, wherever it stepped
    const t = this.attack.target;
    if (t && this._strikeable(t)) {
      const d = Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z);
      if (reach(t, d - 0.25)) best = t;
    }
    if (!best) {
      let bs = Infinity;
      for (const n of g.crowd.query(this.pos.x, this.pos.z, 2.6, [])) {
        if (!this._strikeable(n)) continue;
        const dx = n.pos.x - this.pos.x, dz = n.pos.z - this.pos.z;
        const d = Math.hypot(dx, dz);
        if (!reach(n, d)) continue;
        const cos = (dx * fwd.x + dz * fwd.z) / (d || 1);
        if (cos < 0.4) continue; // ~66 degree half-angle
        const score = d - cos * 0.8 + (this._grounded(n) ? 2 : 0);
        if (score < bs) { bs = score; best = n; }
      }
    }
    if (best) {
      const dir = new THREE.Vector3(best.pos.x - this.pos.x, 0, best.pos.z - this.pos.z).normalize();
      this.attack.hit = true;
      const low = this._grounded(best);
      if (g.crowd.onBatonHit(best, dir, this.pos) === 'blocked') return; // a shield took it; the crowd plays the block
      g.audio.impact(best.pos, false);
      g.effects.impact(best.pos.clone().setY(best.pos.y + (low ? 0.35 : 1.3)));
      g.hitStop(0.07);
      g.cameraRig.shake(0.22);
      g.hud.hitMarker();
    }
  }

  _animate(dt, t) {
    const rig = this.rig;
    const P = newPose();
    baseLayer(P, rig, this.speed, t, dt, false);
    let rate = 14;
    // footsteps from the gait phase
    if (this.speed > 0.4) {
      const stepPh = Math.floor(rig.phase / Math.PI);
      if (stepPh !== this.lastStepPhase) { this.lastStepPhase = stepPh; this.game.audio.footstep(this.pos, this.sprinting ? 0.2 : 0.13, true); }
    }
    // baton carry
    P.shRX += -0.25; P.elR = Math.min(P.elR, -0.5);
    // shield carry on left side; stance raises it
    const bk = this.blockK;
    P.shLX = P.shLX * (1 - bk) - 1.3 * bk; P.elL = P.elL * (1 - bk) - 0.5 * bk; P.shLZ = 0.1 * (1 - bk);
    if (bk > 0.5) { P.spX = 0.14; P.knL = Math.max(P.knL, 0.25); P.knR = Math.max(P.knR, 0.25); P.y -= 0.04; P.hdX = 0.05; }
    updateShield(rig, bk);
    if (this.attack) {
      const a = this.attack;
      if (a.phase === 'windup') { rate = 30; P.shRX = -2.6; P.shRZ = -0.45; P.elR = -1.35; P.spY = -0.45; P.spX = -0.05; }
      else if (a.phase === 'strike') {
        rate = 34; P.shRX = -0.55; P.shRZ = 0.32; P.elR = -0.15; P.spY = 0.5; P.spX = 0.25; P.hpLX = -0.55; P.knL = 0.35; P.hpRX = 0.3;
        if (a.target && this._grounded(a.target)) { P.spX = 0.65; P.shRX = -0.2; P.knL = P.knR = 0.45; P.y = -0.1; } // stoop to someone on the ground
      }
      else { rate = 10; P.shRX = -0.6; P.elR = -0.6; P.spY = 0.15; }
    }
    if (this.dodgeT > 0) { P.spX = 0.35; P.knL = P.knR = 0.6; P.y = -0.12; }
    if (this.staggerT > 0) {
      rate = 18;
      const f = this.forward();
      const back = this.staggerDir.dot(f) < 0; // pushed from the front
      P.spX = back ? -0.35 : 0.35; P.hdX = back ? -0.3 : 0.3; P.shRZ = -0.6; P.shLZ = 0.6;
    }
    if (this.dead) { rate = 6; P.tiltX = -1.5; P.y = 0.05; P.shLZ = 0.9; P.shRZ = -0.9; }
    applyPose(rig, P, dt, rate);
    rig.root.position.copy(this.pos);
    if (this.dead) rig.root.position.y += 0.12;
    rig.root.rotation.y = this.heading;
  }
}
