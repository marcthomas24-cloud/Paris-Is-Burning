// Bosses (Level 2): the Enforcer and the Leader ("le Patron").
//
// A boss is a scripted crowd character driven by this state machine through the
// crowd's script hooks (tick / move / heading / pose / onBaton), so the player's
// existing controls apply unchanged: baton strike, shield, dodge.
//
// Every attack is data (see ENFORCER and LEADER below) and follows the same rules,
// checked by __lintBosses() in dev.js:
//  - a readable wind-up of at least 0.55 s (pose, amber ring, voice); unblockable
//    attacks also flash a warning the first few times
//  - each attack is either blockable with the shield, or dodgeable (no attack is both
//    unblockable and undodgeable); a hit never takes more than a quarter of the health
//  - the boss is only hurt from the front while its guard is down (recovery after an
//    attack, stunned after a charge into a wall); from the side or behind it can be hit
//  - an opening allows a few hits (openCap); then the boss shoves the officer clear
//    (no damage) and recovers, so each opening must be earned
//  - phase changes are invulnerable pauses that cancel the attack in progress; damage
//    never carries over a phase threshold
//  - feints: a wind-up that visibly cancels, followed by the real attack's full
//    wind-up, so a dodge spent on the feint has recovered before the real hit lands
import * as THREE from 'three';
import { SHIELD_POSE, giveItem, clearItem, attachFireAxe, removeFireAxe, crouch, setRingVisible } from './characters.js';

const V = () => new THREE.Vector3();
const tmp = V();
const DODGE_COOLDOWN = 0.75; // player.js
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

// ------------------------------------------------------------------ definitions
// kind: bash / shove (shield), chop / swing (axe), charge
// blockable: the player's raised shield stops it; otherwise it must be dodged or avoided
export const ENFORCER = {
  id: 'enforcer', name: 'THE ENFORCER', sub: "le Patron's lieutenant", hp: 10, shield: 'heavy', axe: false,
  openCap: { rec: 2, stun: 3 },
  phases: [{ from: 8, speed: 2.4, turn: 2.0, guardCos: 0.4, cooldown: 1.3 }],
  attacks: {
    bash: { kind: 'bash', wind: 0.8, range: 2.6, arcCos: 0.35, dmg: 14, push: 5.5, blockable: true, rec: 1.3 },
    charge: { kind: 'charge', wind: 1.0, speed: 9, maxDist: 14, dmg: 20, push: 7, blockable: false, rec: 1.4, stun: 2.4 },
  },
};

export const LEADER = {
  id: 'leader', name: 'LE PATRON', sub: 'runs the looting crews', hp: 15, shield: 'door', axe: true,
  openCap: { rec: 2, stun: 3 },
  phases: [
    // 1: defensive, shield up, deliberate heavy attacks
    { from: 15, speed: 2.1, turn: 3.0, guardCos: 0.35, cooldown: 1.2, strafe: false,
      moves: [['chop', 0.6], ['shove', 0.4]] },
    // 2: combinations and lateral movement
    { from: 10, speed: 2.8, turn: 3.6, guardCos: 0.35, cooldown: 0.9, strafe: true,
      moves: [['combo2', 0.45], ['combo3', 0.3], ['chop2', 0.25]] },
    // 3: pressure, shorter recoveries, occasional feints
    { from: 5, speed: 3.0, turn: 4.2, guardCos: 0.35, cooldown: 0.6, strafe: true, feint: 0.3,
      moves: [['combo2f', 0.4], ['combo3f', 0.35], ['chop3', 0.25]] },
  ],
  attacks: {
    chop: { kind: 'chop', wind: 0.9, range: 2.7, arcCos: 0.4, dmg: 20, push: 4, blockable: false, rec: 1.4 },
    shove: { kind: 'shove', wind: 0.6, range: 2.1, arcCos: 0.35, dmg: 8, push: 4.5, blockable: true, rec: 0.7 },
    chop2: { kind: 'chop', wind: 0.75, range: 2.7, arcCos: 0.4, dmg: 18, push: 4, blockable: false, rec: 1.2 },
    chop3: { kind: 'chop', wind: 0.6, range: 2.7, arcCos: 0.4, dmg: 18, push: 4, blockable: false, rec: 0.85, feintable: true },
    swing: { kind: 'swing', wind: 0.55, range: 2.4, arcCos: 0.2, dmg: 9, push: 2.5, blockable: true, rec: 0.25 },
    combo2: { seq: ['swing', 'chop2'] },
    combo3: { seq: ['swing', 'swing', 'chop2'] },
    combo2f: { seq: ['swing', 'chop3'], recScale: 0.75 },
    combo3f: { seq: ['swing', 'swing', 'chop3'], recScale: 0.75 },
  },
  feintCancel: 0.35,
  barks: [
    '"Every shop on this street pays me tonight."',
    '"You think they march for me? They are my cover."',
    '"If I leave with nothing, it all burns."',
  ],
};

// ------------------------------------------------------------------ boss
export class Boss {
  constructor(game, npc, def) {
    this.game = game; this.n = npc; this.def = def;
    this.log = []; // every resolved attack: for fairness checks and tuning
  }

  get phase() { return this.def.phases[this.phaseIdx]; }
  get active() { return this.s !== 'defeated' && this.s !== 'off'; }

  // Place and start the fight. arena: { x, z, r }
  start(pos, heading, arena) {
    const g = this.game, n = this.n, d = this.def;
    this.hp = d.hp; this.phaseIdx = 0; this.s = 'intro'; this.t = 0; this.cool = 1.0;
    this.queue = []; this.cur = null; this.chargeCool = 2.0; this.flinchT = 0; this.warned = 0; this.strafeSide = 1; this.strafeT = 0;
    this.lastFeint = false; this.hits = 0; this.blocks = 0; this.arrested = false; this.blockedBashes = 0;
    n.pos.copy(pos); n.anchor.copy(pos); n.vel.set(0, 0, 0); n.knock.set(0, 0, 0); n.heading = heading;
    n.temperament = 'hostile'; n.attackStyle = 'boss'; n.neutralized = false; n.arrested = false; n.untargetable = false;
    n.radius = 0.42; n.mass = 3; n.stimuli.length = 0; n.boss = this;
    g.crowd.setState(n, 'boss', 9999);
    n.rig.root.visible = true;
    giveItem(n.rig, 'impshield', Math.random, d.shield);
    if (d.axe) attachFireAxe(n.rig);
    n.script = {
      tick: (m, player, dt) => this.tick(dt),
      move: () => this.move(),
      heading: (m, dt) => this.heading(dt),
      pose: (m, P, dt, t) => this.pose(P, dt, t),
      onBaton: (m, dir, from) => this.onBaton(dir, from),
      amber: false, marked: true,
    };
    g.crowd.setArena(arena.x, arena.z, arena.r, n);
  }

  // Remove the boss from the fight (level reset, checkpoint retry).
  stop() {
    const n = this.n;
    this.s = 'off';
    removeFireAxe(n.rig); clearItem(n.rig);
    n.boss = null; n.script = null; n.attackStyle = null;
    this.game.crowd.clearArena();
  }

  // ------------------------------------------------------------ hits on the boss
  guarding() { return ['intro', 'idle', 'wind', 'feint', 'charge', 'backoff'].includes(this.s); }

  onBaton(dir, from) {
    const g = this.game, n = this.n;
    if (!this.active) return 'blocked';
    const fx = Math.sin(n.heading), fz = Math.cos(n.heading);
    const dx = from.x - n.pos.x, dz = from.z - n.pos.z, dd = Math.hypot(dx, dz) || 1;
    const front = (fx * dx + fz * dz) / dd > this.phase.guardCos;
    if (this.s === 'transition' || (front && this.guarding())) {
      // the guard (or a phase change) stops it: the officer recoils, no damage
      this.blocks++;
      if (g.missions.stats.blocked !== undefined) g.missions.stats.blocked++;
      g.player.knock.addScaledVector(dir, -3.4);
      g.player.staggerT = Math.max(g.player.staggerT, 0.22);
      g.audio.impact(n.pos, false, true);
      g.effects.impact(n.pos.clone().setY(n.pos.y + 1.3));
      g.cameraRig.shake(0.14);
      if (this.s !== 'transition') g.hud.alert('Blocked — wait for the opening, or get round the side', 'warn', 2, 'bossguard');
      return 'blocked';
    }
    // a hit: one point of health, never across a phase threshold
    this.hits++; this.openHits = (this.openHits || 0) + 1;
    this.flinchT = 0.22;
    n.knock.copy(dir).multiplyScalar(0.8);
    g.missions.addScore(25, 'Hit');
    const next = this.def.phases[this.phaseIdx + 1];
    this.hp = Math.max(next ? next.from : 0, this.hp - 1);
    if (this.hp <= 0) this._defeat();
    else if (next && this.hp <= next.from) this._transition();
    else if ((this.s === 'rec' || this.s === 'stun') && this.openHits >= this.def.openCap[this.s]) this._breakout();
    return 'hit';
  }

  // Enough hits for this opening: shove the officer back (no damage) and recover.
  _breakout() {
    const g = this.game, n = this.n;
    this.s = 'idle'; this.t = 0; this.cool = 0.7; this.flinchT = 0;
    const away = tmp.set(g.player.pos.x - n.pos.x, 0, g.player.pos.z - n.pos.z);
    if (away.length() < 3.5) g.player.knock.addScaledVector(away.normalize(), 4.5);
    g.audio.impact(n.pos, false, true);
    g.cameraRig.shake(0.15);
  }

  _transition() {
    const g = this.game, n = this.n;
    this.phaseIdx++;
    this.s = 'transition'; this.t = 0; this.dur = 2.2; this.queue = []; this.cur = null;
    // a non-damaging shove to reset the spacing
    const away = tmp.set(g.player.pos.x - n.pos.x, 0, g.player.pos.z - n.pos.z);
    if (away.length() < 4) g.player.knock.addScaledVector(away.normalize(), 5);
    g.cameraRig.shake(0.25);
    g.hud.alert(`PHASE ${this.phaseIdx + 1}`, 'bad', 2, 'bossphase');
    const bark = this.def.barks && this.def.barks[this.phaseIdx];
    if (bark) g.hud.alert(bark, 'info', 3.5, 'bossbark');
    g.audio.shout(n.pos);
  }

  _defeat() {
    const g = this.game, n = this.n;
    this.s = 'defeated'; this.t = 0; this.queue = []; this.cur = null;
    n.neutralized = true; n.untargetable = true;
    this.n.script.amber = false;
    setRingVisible(n.rig, false);
    if (n.rig.axe) n.rig.axe.visible = false; // dropped
    g.crowd.clearArena();
    g.onThreatNeutralized(n);
    g.cameraRig.shake(0.3);
    g.hitStop(0.12);
  }

  // ------------------------------------------------------------ behaviour
  tick(dt) {
    const g = this.game, n = this.n, p = g.player;
    if (this.s === 'off') return;
    n.stimuli.length = 0; // bosses do not panic
    n.lastAggro = g.crowd.time;
    this.t += dt; this.cool -= dt; this.chargeCool -= dt; this.flinchT -= dt; this.strafeT -= dt;
    const d = Math.hypot(p.pos.x - n.pos.x, p.pos.z - n.pos.z);
    this.dist = d;
    this.n.script.amber = this.s === 'wind' || this.s === 'feint';
    switch (this.s) {
      case 'intro':
        if (this.t > 2.5 || d < 12) { this.s = 'idle'; this.t = 0; }
        break;
      case 'idle':
        if (this.cool <= 0) this._choose(d);
        break;
      case 'wind':
        if (this.t >= this.cur.wind) {
          if (this.cur.feint) { this.s = 'feint'; this.t = 0; break; }
          if (this.cur.kind === 'charge') { this._startCharge(); break; }
          this._strike(d);
        }
        break;
      case 'feint':
        // visibly cancelled: guard back up, then the real attack winds up in full
        if (this.t >= this.def.feintCancel) { const a = { ...this.cur, feint: false }; this._wind(a); }
        break;
      case 'strike':
        if (this.t >= 0.12) {
          if (this.queue.length) this._wind(this.queue.shift());
          else { this.s = 'rec'; this.t = 0; this.dur = this.cur.rec * (this.curRecScale || 1); this.openHits = 0; }
        }
        break;
      case 'charge': this._chargeTick(dt, d); break;
      case 'backoff':
        // far enough for a fair run-up (measured: ~0.7 s from launch to contact at 6.2 m): the charge aims when its wind-up ends, so the officer
        // reacts to the launch; distance is what gives the reaction time
        if ((this.dist >= 6.2 && this.t >= 0.6) || this.t >= 2.0) { this.chargeCool = 6; this.queue = []; this.curRecScale = 1; this._wind(this.def.attacks.charge); }
        break;
      case 'rec': case 'stun':
        if (this.t >= this.dur) { this.s = 'idle'; this.t = 0; this.cool = this.phase.cooldown; }
        break;
      case 'transition':
        if (this.t >= this.dur) { this.s = 'idle'; this.t = 0; this.cool = 0.8; }
        break;
      case 'defeated': break;
    }
  }

  _choose(d) {
    const ph = this.phase, A = this.def.attacks;
    if (this.def.id === 'enforcer') {
      // pattern: after two bashes stopped by the officer's shield he backs off and charges
      if (this.blockedBashes >= 2 && this.chargeCool <= 0) { this.blockedBashes = 0; this.s = 'backoff'; this.t = 0; return; }
      if (d > 6.5 && this.chargeCool <= 0) { this.chargeCool = 6; this.queue = []; this.curRecScale = 1; return this._wind(A.charge); }
      if (d <= A.bash.range - 0.1) { this.queue = []; this.curRecScale = 1; return this._wind(A.bash); }
      return;
    }
    if (d > 3.0) return; // closing in
    let r = Math.random(), pickId = ph.moves[0][0];
    for (const [id, w] of ph.moves) { if ((r -= w) <= 0) { pickId = id; break; } }
    const m = A[pickId];
    const seq = (m.seq || [pickId]).map((id) => A[id]);
    this.curRecScale = m.recScale || 1;
    const first = seq.shift();
    this.queue = seq.map((a) => ({ ...a }));
    // phase 3: a heavy may be feinted (never twice in a row); the real attack follows in full
    const last = this.queue.length ? this.queue[this.queue.length - 1] : null;
    const heavy = last || first;
    if (ph.feint && heavy.feintable && !this.lastFeint && Math.random() < ph.feint) {
      if (last) this.queue[this.queue.length - 1] = { ...last, feint: true };
      else return this._wind({ ...first, feint: true }, true);
      this.lastFeint = true;
    } else this.lastFeint = false;
    this._wind({ ...first });
  }

  _wind(a, feinting = false) {
    const g = this.game, n = this.n;
    this.cur = a; this.s = 'wind'; this.t = 0;
    if (feinting) this.lastFeint = true;
    if (Math.random() < 0.5) g.audio.shout(n.pos);
    if (!a.blockable && this.warned < 3) {
      this.warned++;
      g.hud.alert(a.kind === 'charge' ? 'CHARGE — dodge sideways!' : 'Heavy swing — dodge or step back!', 'bad', 1.4, 'bossunblock');
    }
  }

  _strike(d) {
    const g = this.game, n = this.n, p = g.player, a = this.cur;
    this.s = 'strike'; this.t = 0;
    g.audio.swing(n.pos, a.kind === 'chop');
    const fx = Math.sin(n.heading), fz = Math.cos(n.heading);
    const dx = p.pos.x - n.pos.x, dz = p.pos.z - n.pos.z;
    const inArc = d <= a.range && (fx * dx + fz * dz) / (d || 1) >= a.arcCos;
    const entry = { t: +g.crowd.time.toFixed(2), boss: this.def.id, kind: a.kind, wind: a.wind, blockable: a.blockable, inRange: inArc, invuln: p.invuln > 0, guard: p.blockK > 0.6, dealt: 0 };
    if (inArc) {
      const push = tmp.set(dx, 0, dz).normalize().multiplyScalar(a.push).clone();
      // blockable: pass the source so the officer's shield can stop it; unblockable: no source
      entry.dealt = +p.takeDamage(a.dmg, a.blockable ? n.pos : null, push).toFixed(2);
      if (a.kind === 'bash' && entry.dealt > 0 && entry.dealt < a.dmg * 0.5) this.blockedBashes++;
      if (a.kind === 'chop') { g.cameraRig.shake(0.3); g.effects.dust(p.pos.clone().setY(0.2), 8); }
    } else if (a.kind === 'chop') g.effects.dust(n.pos.clone().add(V().set(fx * 1.6, 0.1, fz * 1.6)), 10); // axe into the road
    this.log.push(entry);
  }

  _startCharge() {
    const g = this.game, n = this.n, p = g.player;
    // direction locks when the wind-up ends: no homing, a sidestep or dodge clears it
    this.chargeDir = V().set(p.pos.x - n.pos.x, 0, p.pos.z - n.pos.z).normalize();
    n.heading = Math.atan2(this.chargeDir.x, this.chargeDir.z);
    this.chargeFrom = n.pos.clone();
    this.s = 'charge'; this.t = 0; this.chargeHit = false;
    g.audio.shout(n.pos);
  }

  _chargeTick(dt, d) {
    const g = this.game, n = this.n, p = g.player, a = this.cur;
    const ahead = 1.7;
    // into a wall, car or barricade: stunned (the big opening)
    if (g.world.blocked(n.pos.x + this.chargeDir.x * ahead, n.pos.z + this.chargeDir.z * ahead, 0.4)) {
      this.s = 'stun'; this.t = 0; this.dur = a.stun; n.vel.set(0, 0, 0); this.openHits = 0;
      n.knock.copy(this.chargeDir).multiplyScalar(-2);
      g.cameraRig.shake(0.35); g.audio.impact(n.pos, true, true); g.effects.dust(n.pos.clone().setY(0.5), 14);
      g.hud.alert('He hit the wall — now!', 'good', 1.6, 'bossstun');
      this.log.push({ t: +g.crowd.time.toFixed(2), boss: this.def.id, kind: 'charge', wind: a.wind, blockable: false, inRange: false, dealt: 0, wall: true });
      return;
    }
    if (!this.chargeHit && d < 1.25) {
      this.chargeHit = true;
      const dealt = p.takeDamage(a.dmg, null, this.chargeDir.clone().multiplyScalar(a.push));
      this.log.push({ t: +g.crowd.time.toFixed(2), boss: this.def.id, kind: 'charge', wind: a.wind, blockable: false, inRange: true, invuln: dealt === 0, dealt: +dealt.toFixed(2) });
      if (dealt > 0) { g.cameraRig.shake(0.4); this.s = 'rec'; this.t = 0; this.dur = a.rec; this.openHits = 0; return; }
    }
    if (n.pos.distanceTo(this.chargeFrom) > a.maxDist || this.t > 2.5) {
      if (!this.chargeHit) this.log.push({ t: +g.crowd.time.toFixed(2), boss: this.def.id, kind: 'charge', wind: a.wind, blockable: false, inRange: false, dealt: 0 });
      this.s = 'rec'; this.t = 0; this.dur = a.rec; this.openHits = 0;
    }
  }

  move() {
    const g = this.game, n = this.n, p = g.player.pos, ph = this.phase;
    if (this.s === 'charge') return { speed: this.cur.speed, dest: tmp.copy(n.pos).addScaledVector(this.chargeDir, 6).clone() };
    if (this.s === 'backoff') {
      const away = V().set(n.pos.x - p.x, 0, n.pos.z - p.z).normalize();
      return { speed: 3.2, dest: n.pos.clone().addScaledVector(away, 3) };
    }
    if (this.s !== 'idle') return { speed: 0 };
    const d = this.dist || 99;
    if (ph.strafe && d < 4.5) {
      // circle the officer, switching sides now and then
      if (this.strafeT <= 0) { this.strafeT = 1.5 + Math.random() * 1.5; this.strafeSide = -this.strafeSide; }
      const a = Math.atan2(n.pos.x - p.x, n.pos.z - p.z) + this.strafeSide * 0.7;
      return { speed: ph.speed, dest: V().set(p.x + Math.sin(a) * 2.5, 0, p.z + Math.cos(a) * 2.5) };
    }
    const want = this.def.id === 'enforcer' ? 2.3 : 2.4;
    if (d <= want) return { speed: 0 };
    return { speed: d > 7 && this.def.id === 'leader' ? 4.2 : ph.speed, dest: p.clone() };
  }

  heading(dt) {
    const n = this.n, p = this.game.player.pos;
    if (this.s === 'charge') return Math.atan2(this.chargeDir.x, this.chargeDir.z);
    if (this.s === 'defeated' || this.s === 'stun' || this.s === 'strike') return n.heading;
    // tracking slows during a recovery and in the last moments of a wind-up
    let rate = this.phase.turn;
    if (this.s === 'rec') rate *= 0.35;
    if (this.s === 'wind' && this.cur && this.t > this.cur.wind - 0.25) rate *= 0.4;
    const want = Math.atan2(p.x - n.pos.x, p.z - n.pos.z);
    const dh = wrap(want - n.heading);
    return n.heading + Math.max(-rate * dt, Math.min(rate * dt, dh));
  }

  // ------------------------------------------------------------ poses (grey-box)
  pose(P, dt, t) {
    const n = this.n, rig = n.rig, a = this.cur, s = this.s;
    let sp = SHIELD_POSE.guard, rate = 12, sk = 10;
    const k = this.cur && this.s === 'wind' ? Math.min(1, this.t / this.cur.wind) : 0;
    // guard stance by default: shield across the body, weapon ready
    P.shLX = -1.25; P.elL = -1.8; P.shLZ = 0.35; P.knL = P.knR = 0.25; P.y = -0.04; P.spX = 0.12;
    P.shRX = this.def.axe ? -0.7 : -0.6; P.elR = this.def.axe ? -1.0 : -1.5; P.shRZ = -0.25;
    P.brow = 1; P.mouth = 0.2;
    if (s === 'wind' && a) {
      if (a.kind === 'bash' || a.kind === 'shove') { sp = SHIELD_POSE.wind; P.shLX = -1.1; P.elL = -1.9; P.spY = 0.45 * k; P.spX = -0.12; P.knL = P.knR = 0.4; }
      else if (a.kind === 'charge') { crouch(P, 0.45 * k + 0.1); P.spX = 0.35 + 0.15 * k; P.hdX = 0.2; P.shLX = -1.1; }
      else if (a.kind === 'chop') { P.shRX = -2.9 * (0.3 + 0.7 * k); P.elR = -0.9; P.shRZ = -0.2; P.spX = -0.15 * k; P.spY = -0.2 * k; P.mouth = 0.6; }
      else if (a.kind === 'swing') { P.shRX = -1.3; P.shRZ = -1.3 * k; P.elR = -0.4; P.spY = -0.7 * k; }
    } else if (s === 'strike' && a) {
      rate = 30; sk = 30;
      if (a.kind === 'bash' || a.kind === 'shove') { sp = SHIELD_POSE.strike; P.shLX = -1.5; P.elL = -0.6; P.spY = -0.35; P.spX = 0.35; P.hpLX = -0.6; P.knL = 0.45; }
      else if (a.kind === 'chop') { P.shRX = -0.4; P.elR = -0.1; P.spX = 0.55; P.hdX = 0.2; P.knL = 0.5; P.hpLX = -0.5; P.mouth = 0.8; }
      else if (a.kind === 'swing') { P.shRX = -1.4; P.shRZ = 0.5; P.elR = -0.2; P.spY = 0.7; }
    } else if (s === 'feint') { rate = 18; P.mouth = 0.3; } // straight back to guard: the cancel is visible
    else if (s === 'charge') { P.spX = 0.5; P.hdX = 0.25; P.shLX = -1.4; }
    else if (s === 'backoff') { P.spX = 0.05; P.hdX = 0.1; }
    else if (s === 'rec') {
      rate = 8; sp = SHIELD_POSE.open; sk = 12;
      P.shLX = -0.3; P.elL = -0.4; P.spX = 0.3; P.hdX = 0.3;
      if (a && a.kind === 'chop') { P.shRX = -0.25; P.elR = -0.05; P.spX = 0.5; P.hdX = 0.35; } // axe buried in the road
    } else if (s === 'stun') {
      rate = 8; sp = SHIELD_POSE.open; sk = 12;
      P.shLX = -0.2; P.elL = -0.3; P.spX = 0.3 + Math.sin(t * 9) * 0.06; P.hdX = 0.45 + Math.sin(t * 7) * 0.15; P.hdY = Math.sin(t * 5) * 0.3; P.knL = P.knR = 0.35; P.brow = -1;
    } else if (s === 'transition') {
      rate = 10; P.shRX = -1.0; P.shRZ = -0.9; P.shLZ = 0.8; P.hdX = -0.45; P.spX = -0.2; P.mouth = 1;
    } else if (s === 'defeated') {
      rate = 5; sp = SHIELD_POSE.open; sk = 6;
      P.knL = P.knR = 1.55; P.y = -0.42; P.spX = 0.3; P.hdX = 0.4; P.shLX = 0.2; P.shRX = 0.2; P.elL = P.elR = -0.3; P.brow = -1; P.mouth = 0.3;
    }
    if (this.flinchT > 0) { P.spX -= 0.25; P.hdX -= 0.3; P.brow = -1; }
    if (rig.item) {
      const kk = 1 - Math.exp(-dt * sk);
      rig.item.position.lerp(sp[0], kk);
      rig.item.rotation.x += (sp[1].x - rig.item.rotation.x) * kk;
      rig.item.rotation.y += (sp[1].y - rig.item.rotation.y) * kk;
      rig.item.rotation.z += (sp[1].z - rig.item.rotation.z) * kk;
    }
    return rate;
  }

  // HUD
  info() {
    const marks = this.def.phases.slice(1).map((ph) => ph.from / this.def.hp);
    return { name: this.def.name, sub: this.def.sub, hp: this.hp, max: this.def.hp, marks, phase: this.phaseIdx, phases: this.def.phases.length, open: this.s === 'rec' || this.s === 'stun', state: this.s };
  }
}

// Fairness rules for every attack (used by __lintBosses).
export function lintBoss(def) {
  const out = [];
  const A = def.attacks;
  for (const [id, a] of Object.entries(A)) {
    if (a.seq) {
      const parts = a.seq.map((x) => A[x]);
      const last = parts[parts.length - 1];
      if ((last.rec * (a.recScale || 1)) < 0.6) out.push(`${id}: final recovery ${(last.rec * (a.recScale || 1)).toFixed(2)} s < 0.6 s`);
      continue;
    }
    if (a.wind < 0.55) out.push(`${id}: wind-up ${a.wind} s < 0.55 s`);
    if (a.dmg > 25) out.push(`${id}: damage ${a.dmg} > 25`);
    if (!a.blockable && a.kind !== 'charge' && !(a.range <= 3)) out.push(`${id}: unblockable with range ${a.range} m cannot be stepped out of`);
    if (!a.blockable && a.wind < 0.6) out.push(`${id}: unblockable wind-up ${a.wind} s < 0.6 s`);
    if (a.feintable && def.feintCancel + a.wind < DODGE_COOLDOWN + 0.15) out.push(`${id}: feint cancel + real wind-up ${(def.feintCancel + a.wind).toFixed(2)} s leaves no time to dodge again (cooldown ${DODGE_COOLDOWN} s)`);
  }
  for (const ph of def.phases) for (const [id] of ph.moves || []) if (!A[id]) out.push(`phase move ${id} undefined`);
  return out;
}
