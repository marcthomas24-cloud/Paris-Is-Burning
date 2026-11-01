// Bosses: the Enforcer and the Leader ("le Patron") in Level 2, the Fixer in Level 3.
//
// A boss is a scripted crowd character driven by this state machine through the
// crowd's script hooks (tick / move / heading / pose / onBaton), so the player's
// existing controls apply unchanged: baton strike, shield, dodge.
//
// Every attack is data (see ENFORCER, LEADER and FIXER below) and follows the same rules,
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
//  - no strike lands through a wall, car or barricade (the line to the officer must be clear),
//    and a charge or rush stops at the first obstacle
import * as THREE from 'three';
import { SHIELD_POSE, giveItem, clearItem, attachFireAxe, removeFireAxe, crouch, setRingVisible } from './characters.js';

const V = () => new THREE.Vector3();
const tmp = V();
const DODGE_COOLDOWN = 0.75; // player.js
export const ASSIST = { wind: 1.2, rec: 1.4, dmg: 0.6 }; // Assisted boss fights (Options)
const STRIKE_T = 0.12;       // a strike's own duration before the next attack of a combination winds up
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
// a straight-line run at the officer (the Enforcer's charge, the Fixer's rush): aimed when the
// wind-up ends, stopped by obstacles, dodged sideways
const isRun = (a) => a.kind === 'charge' || a.kind === 'rush';

// ------------------------------------------------------------------ definitions
// kind: bash / shove (shield), chop / swing (axe), charge, jab / kick / rush (the Fixer)
// blockable: the player's raised shield stops it; otherwise it must be dodged or avoided
// Behaviour flags (instead of checks on the boss's id):
//  pattern: 'shieldCharge' bashes up close, charges from range and after two blocked bashes;
//           without it the boss picks weighted moves from its phase (`moves`)
//  keepDist: how close it stands while waiting to attack (m) · closeSpeed: run speed when far
//  intro: 'slam' plays the shield slam during its introduction, 'phone' ends a call and squares
//         up (the Fixer); otherwise the axe is raised · introWait / introNear: how long after
//         the introduction it holds its ground, unless the officer comes closer than introNear
//  style: 'fighter' poses an unarmed, mobile fighter (no shield) · gloves: wears the Fixer's gloves
//  cues: plays the fighter's footwork sounds · defeatSting / climaxSting: music stings for the
//        defeat and the last phase · guardText: the hint when a strike is stopped by the guard
// Phase flags: strafe (circle the officer; strafeR its radius), shift (chance of a quick lateral
// step after a recovery), retreat (chance of backing off to make distance after a recovery),
// rush (chance of backing off and then rushing instead of a close attack), missRec (recovery
// multiplier after an attack that hit nothing: the vulnerability after a miss)
export const ENFORCER = {
  id: 'enforcer', name: 'THE ENFORCER', sub: "le Patron's lieutenant", hp: 10, shield: 'heavy', axe: false,
  pattern: 'shieldCharge', keepDist: 2.3, intro: 'slam',
  openCap: { rec: 2, stun: 3 },
  phases: [{ from: 8, speed: 2.4, turn: 2.0, guardCos: 0.4, cooldown: 1.3 }],
  attacks: {
    bash: { kind: 'bash', wind: 0.8, range: 2.6, arcCos: 0.35, dmg: 14, push: 5.5, blockable: true, rec: 1.3 },
    charge: { kind: 'charge', wind: 1.0, speed: 9, maxDist: 14, dmg: 20, push: 7, blockable: false, rec: 1.4, stun: 2.4 },
  },
};

export const LEADER = {
  id: 'leader', name: 'LE PATRON', sub: 'runs the looting crews', hp: 15, shield: 'door', axe: true,
  keepDist: 2.4, closeSpeed: 4.2,
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

// The Fixer (Level 3): no shield, no weapon; quick hands, kicks, footwork. He keeps his distance,
// moves round the officer and commits only briefly, so the openings come from making him miss.
export const FIXER = {
  id: 'fixer', name: 'THE FIXER', sub: 'runs the breakout', hp: 15, shield: null, axe: false, gloves: true,
  style: 'fighter', intro: 'phone', introWait: 1.0, introNear: 0, cues: true, defeatSting: true, climaxSting: true,
  keepDist: 2.8, closeSpeed: 5.0, backSpeed: 4.2, backDist: 5.5, backMax: 1.6,
  guardText: 'He slips it — make him commit, or get round the side',
  openCap: { rec: 2, stun: 3 },
  phases: [
    // 1: testing the officer: quick single strikes, short combinations, side-steps, a retreat now and then
    { from: 15, speed: 3.2, turn: 5.0, guardCos: 0.35, cooldown: 1.1, strafe: true, strafeR: 2.8, shift: 0.35, retreat: 0.25, missRec: 1.25,
      moves: [['jab', 0.45], ['kick', 0.25], ['combo2', 0.3]] },
    // 2: pressure: more combinations, the rush (dodge it), wider movement, longer openings after a miss
    { from: 10, speed: 3.6, turn: 5.5, guardCos: 0.35, cooldown: 0.85, strafe: true, strafeR: 3.2, shift: 0.45, retreat: 0.2, rush: 0.22, missRec: 1.5,
      moves: [['combo2', 0.3], ['combo3', 0.3], ['kick', 0.2], ['jab', 0.2]] },
    // 3: desperation: faster, mixed sequences, occasional feinted kicks; shorter (but real) openings
    { from: 5, speed: 4.0, turn: 6.0, guardCos: 0.35, cooldown: 0.6, strafe: true, strafeR: 3.2, shift: 0.5, retreat: 0.15, rush: 0.25, missRec: 1.4, feint: 0.3,
      moves: [['combo3f', 0.3], ['combo2f', 0.25], ['kickJab', 0.2], ['kickf', 0.25]] },
  ],
  attacks: {
    jab: { kind: 'jab', wind: 0.55, range: 2.3, arcCos: 0.45, dmg: 7, push: 2.2, blockable: true, rec: 0.75 },
    jab2: { kind: 'jab', wind: 0.55, range: 2.3, arcCos: 0.45, dmg: 7, push: 2.2, blockable: true, rec: 0.3 }, // inside a combination
    kick: { kind: 'kick', wind: 0.75, range: 2.6, arcCos: 0.4, dmg: 15, push: 4.5, blockable: false, rec: 1.1 },
    kickf: { kind: 'kick', wind: 0.65, range: 2.6, arcCos: 0.4, dmg: 15, push: 4.5, blockable: false, rec: 0.8, feintable: true },
    rush: { kind: 'rush', wind: 0.8, speed: 8.5, maxDist: 10, dmg: 16, push: 6, blockable: false, rec: 1.2, stun: 2.0 },
    combo2: { seq: ['jab2', 'jab'] },
    combo3: { seq: ['jab2', 'jab2', 'kick'] },
    combo2f: { seq: ['jab2', 'kickf'], recScale: 0.85 },
    combo3f: { seq: ['jab2', 'jab2', 'kickf'], recScale: 0.85 },
    kickJab: { seq: ['kickf', 'jab2', 'jab'] }, // the kick first: dodge, then block the two jabs
  },
  feintCancel: 0.4,
  barks: [
    '"Nothing personal. Without him the crews answer to nobody. They answer to me."',
    '"Every corner of this square works for me. You are standing on one."',
    '"Keep him, then. I only need you out of my way."',
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
    this.introT = 0; this.wait = 0; this.slammed = false; this.startedAt = g.crowd.time;
    this.backTo = null; this.missed = false; this.shiftDir = null; this.stepPh = 0; this.pocketed = false; this.missWarned = 0;
    n.pos.copy(pos); n.anchor.copy(pos); n.vel.set(0, 0, 0); n.knock.set(0, 0, 0); n.heading = heading;
    n.temperament = 'hostile'; n.attackStyle = 'boss'; n.neutralized = false; n.arrested = false; n.untargetable = false;
    n.radius = 0.42; n.mass = 3; n.stimuli.length = 0; n.boss = this;
    g.crowd.setState(n, 'boss', 9999);
    n.rig.root.visible = true;
    if (d.shield) giveItem(n.rig, 'impshield', Math.random, d.shield);
    else if (d.intro === 'phone') giveItem(n.rig, 'phone'); // ends the call during his introduction
    else clearItem(n.rig);
    if (d.axe) attachFireAxe(n.rig);
    this.arena = arena;
    n.script = {
      tick: (m, player, dt) => this.tick(dt),
      move: () => this.move(),
      heading: (m, dt) => this.heading(dt),
      pose: (m, P, dt, t) => this.pose(P, dt, t),
      onBaton: (m, dir, from) => this.onBaton(dir, from),
      amber: false, marked: true,
    };
    g.crowd.setArena(arena.x, arena.z, arena.r, n);
    // burning barriers just outside the arena: they frame the fight and light it (no damage)
    this.fires = [];
    for (const a of [0.8, 2.4, 3.9, 5.5]) {
      const x = arena.x + Math.sin(a) * (arena.r + 1.2), z = arena.z + Math.cos(a) * (arena.r + 1.2);
      if (!g.world.blocked(x, z, 0.6)) this.fires.push(g.effects.addFire(V().set(x, 0.3, z), 1.1, 1.2));
    }
  }

  // Remove the boss from the fight (level reset, checkpoint retry).
  stop() {
    const n = this.n;
    this.s = 'off';
    removeFireAxe(n.rig); clearItem(n.rig);
    for (const f of this.fires || []) this.game.effects.removeFire(f);
    this.fires = [];
    if (n.rig.ring) n.rig.ring.scale.setScalar(1);
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
      if (this.s !== 'transition') g.hud.alert(this.def.guardText || 'Blocked — wait for the opening, or get round the side', 'warn', 2, 'bossguard');
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
    this._afterRecovery(); // the Fixer may slip away or make distance here too
  }

  _transition() {
    const g = this.game, n = this.n;
    this.phaseIdx++;
    this.s = 'transition'; this.t = 0; this.dur = 2.2; this.queue = []; this.cur = null; this.backTo = null;
    // a non-damaging shove to reset the spacing
    const away = tmp.set(g.player.pos.x - n.pos.x, 0, g.player.pos.z - n.pos.z);
    if (away.length() < 4) g.player.knock.addScaledVector(away.normalize(), 5);
    // presentation: a banner with his line, a sting, a short slow-down and a restrained camera punch
    g.cameraRig.shake(0.25);
    g.cameraRig.kick(6);
    g.hitStop(0.18);
    const bark = this.def.barks && this.def.barks[this.phaseIdx];
    g.hud.banner(`PHASE ${this.phaseIdx + 1}`, bark || '');
    g.audio.music.sting(this.def.climaxSting && this.phaseIdx === this.def.phases.length - 1 ? 'climax' : 'phase');
    g.audio.shout(n.pos);
  }

  _defeat() {
    const g = this.game, n = this.n;
    this.s = 'defeated'; this.t = 0; this.queue = []; this.cur = null; this.backTo = null;
    if (this.def.defeatSting) g.audio.music.sting('defeat');
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
        // during his introduction he holds his ground (the cinematic shows the beats);
        // afterwards he engages after a short moment, or at once if the officer comes close
        if (g.cinematic) { this.introT += dt; this._introBeats(); break; }
        this.wait += dt;
        if (this.wait > (this.def.introWait ?? 0.8) || d < (this.def.introNear ?? 10)) { this.s = 'idle'; this.t = 0; this._endIntro(); }
        break;
      case 'idle':
        if (this.cool <= 0) this._choose(d);
        break;
      case 'wind':
        if (this.t >= this.cur.wind) {
          if (this.cur.feint) { this.s = 'feint'; this.t = 0; if (this.def.cues) g.audio.scuff(n.pos); break; }
          if (isRun(this.cur)) { this._startCharge(); break; }
          this._strike(d);
        }
        break;
      case 'feint':
        // visibly cancelled: guard back up, then the real attack winds up in full
        if (this.t >= this.def.feintCancel) { const a = { ...this.cur, feint: false }; this._wind(a); }
        break;
      case 'strike':
        if (this.t >= STRIKE_T) {
          if (this.queue.length) this._wind(this.queue.shift());
          else { this.s = 'rec'; this.t = 0; this.dur = this.cur.rec * (this.curRecScale || 1) * this._missScale(); this.openHits = 0; }
        }
        break;
      case 'charge': this._chargeTick(dt, d); break;
      case 'backoff':
        // far enough for a fair run-up (measured: ~0.7 s from launch to contact at 6.2 m): the charge aims when its wind-up ends, so the officer
        // reacts to the launch; distance is what gives the reaction time. Without a run to follow (the
        // Fixer making distance) he simply resets
        if ((this.dist >= (this.def.backDist ?? 6.2) && this.t >= 0.6) || this.t >= (this.def.backMax ?? 2.0)) {
          const run = this.def.pattern === 'shieldCharge' ? this.def.attacks.charge : this.backTo;
          this.backTo = null;
          if (run) { this.chargeCool = 6; this.queue = []; this.curRecScale = 1; this._wind(run); }
          else { this.s = 'idle'; this.t = 0; this.cool = this.phase.cooldown * 0.6; }
        }
        break;
      case 'shift':
        // a quick lateral step out of line; guarded, never long
        if (this.t >= 0.45) { this.s = 'idle'; this.t = 0; this.cool = Math.max(this.cool, 0.3); }
        break;
      case 'rec': case 'stun':
        if (this.t >= this.dur) { this.s = 'idle'; this.t = 0; this.cool = this.phase.cooldown; this._afterRecovery(); }
        break;
      case 'transition':
        if (this.t >= this.dur) { this.s = 'idle'; this.t = 0; this.cool = 0.8; }
        break;
      case 'defeated': break;
    }
  }

  // intro beats, timed to the introduction cinematic
  _introBeats() {
    const g = this.game, n = this.n;
    if (this.def.intro === 'slam' && !this.slammed && this.introT > 1.25) {
      this.slammed = true; // the steel shield slammed into the road
      g.audio.impact(n.pos, true, true); g.effects.dust(n.pos.clone().setY(0.2), 16); g.cameraRig.shake(0.2);
    }
    if (this.def.intro === 'phone' && !this.pocketed && this.introT > 1.5) this._endIntro(); // call over, phone away
  }

  // the introduction is over (played or skipped): nothing from it is left in his hands
  _endIntro() {
    if (this.def.intro !== 'phone' || this.pocketed) return;
    this.pocketed = true;
    if (this.n.rig.itemType === 'phone') clearItem(this.n.rig);
    if (this.def.cues) this.game.audio.scuff(this.n.pos);
  }

  // after a recovery: the Fixer may side-step out of line or back off to make distance
  _afterRecovery() {
    const ph = this.phase;
    if (ph.retreat && Math.random() < ph.retreat) { this.s = 'backoff'; this.t = 0; this.backTo = null; return; }
    if (ph.shift && Math.random() < ph.shift) this._startShift();
  }

  _startShift() {
    const g = this.game, n = this.n, p = g.player.pos, A = this.arena;
    const to = tmp.set(p.x - n.pos.x, 0, p.z - n.pos.z).normalize();
    for (const side of Math.random() < 0.5 ? [1, -1] : [-1, 1]) {
      const x = n.pos.x + to.z * side * 2.6, z = n.pos.z - to.x * side * 2.6;
      if (g.world.blocked(x, z, 0.5) || (A && Math.hypot(x - A.x, z - A.z) > A.r - 1)) continue;
      this.shiftDir = V().set(to.z * side, 0, -to.x * side);
      this.s = 'shift'; this.t = 0;
      if (this.def.cues) g.audio.scuff(n.pos);
      return;
    }
  }

  // the vulnerability after a miss: a longer recovery when the attack found nothing (dodged,
  // stepped out of, or out of reach)
  _missScale() { return this.missed && this.phase.missRec ? this.phase.missRec : 1; }
  _noteMiss() {
    if (!this.phase.missRec || this.missWarned >= 2) return;
    this.missWarned++;
    this.game.hud.alert('He overreached — now!', 'good', 1.4, 'bossmiss');
  }

  _choose(d) {
    const ph = this.phase, A = this.def.attacks;
    if (this.def.pattern === 'shieldCharge') {
      // pattern: after two bashes stopped by the officer's shield he backs off and charges
      if (this.blockedBashes >= 2 && this.chargeCool <= 0) { this.blockedBashes = 0; this.s = 'backoff'; this.t = 0; return; }
      if (d > 6.5 && this.chargeCool <= 0) { this.chargeCool = 6; this.queue = []; this.curRecScale = 1; return this._wind(A.charge); }
      if (d <= A.bash.range - 0.1) { this.queue = []; this.curRecScale = 1; return this._wind(A.bash); }
      return;
    }
    if (ph.rush && this.chargeCool <= 0) {
      // the rush: launched at once from mid-range, otherwise sometimes after backing off for room
      if (d > 5.5 && d < 9) { this.chargeCool = 6; this.queue = []; this.curRecScale = 1; return this._wind(A.rush); }
      if (d <= 3.0 && Math.random() < ph.rush) { this.chargeCool = 6; this.s = 'backoff'; this.t = 0; this.backTo = A.rush; return; }
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
    // Assisted (Options): slower wind-ups, longer openings, lighter hits. Scaled once per attack
    // (a feint's real attack and the parts of a combination come back through here)
    if (g.aids().assisted && !a.aided) {
      a = { ...a, aided: true, wind: a.wind * ASSIST.wind, rec: a.rec * ASSIST.rec, dmg: a.dmg * ASSIST.dmg };
      if (a.stun) a.stun *= ASSIST.rec;
      if (g.missions.stats) g.missions.stats.assisted = true; // the run is marked ASSISTED on the results
    }
    this.cur = a; this.s = 'wind'; this.t = 0;
    if (feinting) this.lastFeint = true;
    if (Math.random() < 0.5) g.audio.shout(n.pos);
    if (!a.blockable) g.audio.music.sting('warn'); // unblockable: a distinct warning sound every time
    if (!a.blockable && this.warned < 3) {
      this.warned++;
      const msg = { charge: 'CHARGE — dodge sideways!', rush: 'RUSH — dodge sideways!', kick: 'Kick — dodge or step back!' }[a.kind] || 'Heavy swing — dodge or step back!';
      g.hud.alert(msg, 'bad', 1.4, 'bossunblock');
    }
  }

  // nothing solid between the boss and the officer at chest height
  _clearLine() {
    const w = this.game.world, a = this.n.pos, b = this.game.player.pos;
    for (const k of [0.3, 0.55, 0.8]) if (w.blocked(a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k, 0.05, 1.1)) return false;
    return true;
  }

  _strike(d) {
    const g = this.game, n = this.n, p = g.player, a = this.cur;
    this.s = 'strike'; this.t = 0;
    g.audio.swing(n.pos, a.kind === 'chop' || a.kind === 'kick');
    if (this.def.cues && a.kind === 'kick') g.audio.scuff(n.pos);
    const fx = Math.sin(n.heading), fz = Math.cos(n.heading);
    const dx = p.pos.x - n.pos.x, dz = p.pos.z - n.pos.z;
    const wall = d <= a.range && !this._clearLine();
    const inArc = d <= a.range && (fx * dx + fz * dz) / (d || 1) >= a.arcCos && !wall;
    const entry = { t: +g.crowd.time.toFixed(2), boss: this.def.id, kind: a.kind, wind: a.wind, blockable: a.blockable, inRange: inArc, invuln: p.invuln > 0, guard: p.blockK > 0.6, dealt: 0 };
    if (wall) entry.wall = true;
    this.missed = !inArc || entry.invuln;
    if (this.missed && !this.queue.length) this._noteMiss();
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
    if (this.def.cues) g.audio.scuff(n.pos);
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
      this.log.push({ t: +g.crowd.time.toFixed(2), boss: this.def.id, kind: a.kind, wind: a.wind, blockable: false, inRange: false, dealt: 0, wall: true });
      return;
    }
    if (!this.chargeHit && d < 1.25) {
      this.chargeHit = true;
      const dealt = p.takeDamage(a.dmg, null, this.chargeDir.clone().multiplyScalar(a.push));
      this.log.push({ t: +g.crowd.time.toFixed(2), boss: this.def.id, kind: a.kind, wind: a.wind, blockable: false, inRange: true, invuln: dealt === 0, dealt: +dealt.toFixed(2) });
      if (dealt > 0) { g.cameraRig.shake(0.4); this.s = 'rec'; this.t = 0; this.dur = a.rec; this.openHits = 0; return; }
    }
    if (n.pos.distanceTo(this.chargeFrom) > a.maxDist || this.t > 2.5) {
      if (!this.chargeHit) this.log.push({ t: +g.crowd.time.toFixed(2), boss: this.def.id, kind: a.kind, wind: a.wind, blockable: false, inRange: false, dealt: 0 });
      // a run that found nobody (dodged or sidestepped) leaves him off balance for longer
      this.missed = true;
      if (this.phase.missRec) this._noteMiss();
      this.s = 'rec'; this.t = 0; this.dur = a.rec * this._missScale(); this.openHits = 0;
    }
  }

  move() {
    const g = this.game, n = this.n, p = g.player.pos, ph = this.phase;
    if (this.s === 'charge') return { speed: this.cur.speed, dest: tmp.copy(n.pos).addScaledVector(this.chargeDir, 6).clone() };
    if (this.s === 'backoff') {
      const away = V().set(n.pos.x - p.x, 0, n.pos.z - p.z).normalize();
      return { speed: this.def.backSpeed ?? 3.2, dest: n.pos.clone().addScaledVector(away, 3) };
    }
    if (this.s === 'shift') return { speed: 5.5 * Math.max(0.3, 1 - this.t / 0.45), dest: n.pos.clone().addScaledVector(this.shiftDir, 2) };
    if (this.s !== 'idle') return { speed: 0 };
    const d = this.dist || 99;
    if (ph.strafe && d < 4.5) {
      // circle the officer, switching sides now and then
      if (this.strafeT <= 0) { this.strafeT = 1.5 + Math.random() * 1.5; this.strafeSide = -this.strafeSide; }
      const a = Math.atan2(n.pos.x - p.x, n.pos.z - p.z) + this.strafeSide * 0.7, r = ph.strafeR ?? 2.5;
      return { speed: ph.speed, dest: V().set(p.x + Math.sin(a) * r, 0, p.z + Math.cos(a) * r) };
    }
    const want = this.def.keepDist ?? 2.4;
    if (d <= want) return { speed: 0 };
    return { speed: d > 7 && this.def.closeSpeed ? this.def.closeSpeed : ph.speed, dest: p.clone() };
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
    if (this.def.style === 'fighter') return this._poseFighter(P, dt, t);
    const n = this.n, rig = n.rig, a = this.cur, s = this.s;
    let sp = SHIELD_POSE.guard, rate = 12, sk = 10;
    const k = this.cur && this.s === 'wind' ? Math.min(1, this.t / this.cur.wind) : 0;
    // guard stance by default: shield across the body, weapon ready
    P.shLX = -1.25; P.elL = -1.8; P.shLZ = 0.35; P.knL = P.knR = 0.25; P.y = -0.04; P.spX = 0.12;
    P.shRX = this.def.axe ? -0.7 : -0.6; P.elR = this.def.axe ? -1.0 : -1.5; P.shRZ = -0.25;
    P.brow = 1; P.mouth = 0.2;
    // unblockable wind-ups: the ring pulses (blockable ones stay steady)
    if (rig.ring) rig.ring.scale.setScalar(s === 'wind' && a && !a.blockable ? 1 + 0.3 * Math.abs(Math.sin(t * 16)) : 1);
    if (s === 'intro' && this.game.cinematic) {
      const it = this.introT;
      if (this.def.intro === 'slam') {
        // shield raised high, then slammed down at 1.25 s
        if (it < 1.25) { sp = [SHIELD_POSE.wind[0].clone().setY(0.55), SHIELD_POSE.wind[1]]; P.shLX = -2.0; P.elL = -1.2; P.spX = -0.15; sk = 6; }
        else { sp = SHIELD_POSE.strike; P.shLX = -1.5; P.elL = -0.6; P.spX = 0.35; sk = 30; }
      } else if (it > 0.8 && it < 2.9) { P.shRX = -2.9; P.elR = -0.7; P.shRZ = -0.15; P.spX = -0.1; P.hdX = -0.15; P.mouth = 0.7; } // axe raised
    }
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

  // The Fixer: a bladed, bouncing guard with the fists up; wind-ups that coil clearly (the
  // fist drawn back, the knee chambered, a sprinter's crouch); hands that drop in every opening.
  // His footwork: sideways and backwards movement plays the idle clip under a procedural shuffle
  // instead of the forward walk, so a side-step never reads as walking forwards sideways.
  _poseFighter(P, dt, t) {
    const n = this.n, rig = n.rig, a = this.cur, s = this.s, ph = this.phaseIdx;
    const k = a && s === 'wind' ? Math.min(1, this.t / a.wind) : 0;
    let rate = 14;
    // footwork: split the movement into forward and sideways parts
    const fx = Math.sin(n.heading), fz = Math.cos(n.heading);
    const vF = n.vel.x * fx + n.vel.z * fz, vS = n.vel.x * fz - n.vel.z * fx, vAll = Math.hypot(vF, vS);
    const shuffle = vAll > 0.4 && (Math.abs(vS) > 0.6 || vF < -0.3) && s !== 'charge';
    if (shuffle) {
      rig.speed = 0; // the idle clip; the legs below do the stepping
      this.stepPh += dt * (6 + vAll * 2.2);
      const sw = Math.sin(this.stepPh), side = Math.sign(vS || 1);
      P.hpLZ = (0.18 + 0.16 * Math.max(0, sw)) * side; P.hpRZ = (0.18 + 0.16 * Math.max(0, -sw)) * side;
      P.knL = 0.35 + 0.3 * Math.max(0, sw); P.knR = 0.35 + 0.3 * Math.max(0, -sw);
      if (vF < -0.3) { P.hpLX = -0.35 * Math.max(0, sw); P.hpRX = -0.35 * Math.max(0, -sw); }
      P.y = -0.06 - Math.abs(Math.cos(this.stepPh)) * 0.03;
      P.spZ = -0.12 * side; // leaning into the step
    } else {
      // on the balls of the feet: a small bounce, knees soft
      const b = Math.sin(t * 6.5);
      P.knL = P.knR = 0.3 + b * 0.05; P.y = -0.05 + b * 0.012;
    }
    // the guard: bladed torso, fists by the chin, chin down, eyes on the officer
    P.spY = 0.3; P.hdY = -0.25; P.spX = 0.1; P.hdX = 0.08;
    P.shLX = -1.0 - 0.05 * Math.sin(t * 3.1); P.elL = -2.15; P.shLZ = 0.3;
    P.shRX = -0.8; P.elR = -2.25; P.shRZ = -0.3;
    P.brow = 0.6; P.mouth = 0.05;
    rig.gripL = rig.gripR = true; // fists (his phone, when he holds it, is in the right one anyway)
    // unblockable wind-ups: the ring pulses (blockable ones stay steady)
    if (rig.ring) rig.ring.scale.setScalar(s === 'wind' && a && !a.blockable ? 1 + 0.3 * Math.abs(Math.sin(t * 16)) : 1);
    if (s === 'intro' && this.game.cinematic) {
      // on the phone; the call ends, the phone goes away, a roll of the neck, the guard comes up
      const it = this.introT;
      if (it < 1.5) { P.shRX = -0.9; P.elR = -2.6; P.shRZ = -0.75; P.hdY = 0.15; P.spY = 0.05; P.mouth = 0.25 + 0.25 * Math.max(0, Math.sin(t * 9)); P.shLX = -0.15; P.elL = -0.3; P.shLZ = 0.1; }
      else if (it < 2.4) { const u = (it - 1.5) / 0.9; P.shRX = -0.2; P.elR = -0.5; P.shRZ = -0.1; P.shLX = -0.2; P.elL = -0.4; P.hdY = Math.sin(u * Math.PI * 2) * 0.35; P.hdX = -0.15; P.spY = 0.1; }
      else { P.shLX = -1.35; P.elL = -0.9 - 0.5 * Math.max(0, Math.sin(t * 7)); P.hdX = -0.05; P.mouth = 0.3; } // a beckon
      rate = 9;
    } else if (s === 'wind' && a) {
      if (a.kind === 'jab') { rate = 16; P.shRX = -0.65; P.elR = -2.45; P.shRZ = -0.15; P.spY = 0.3 - 0.75 * k; P.spX = 0.05 - 0.1 * k; P.hdY = -0.25 + 0.4 * k; P.knR = 0.45; }
      else if (a.kind === 'kick') {
        // weight back, the right knee coming up into the chamber, arms out for balance
        rate = 12; P.hpRX = -1.35 * k; P.knR = 0.4 + 1.6 * k; P.knL = 0.35; P.spX = -0.05 - 0.22 * k; P.spY = 0.15;
        P.shLX = -0.9; P.elL = -1.6; P.shLZ = 0.55; P.shRX = -0.3; P.elR = -1.6; P.shRZ = -0.6; P.hdY = -0.1; P.mouth = 0.4;
      } else if (a.kind === 'rush') {
        // a sprinter's crouch: low, the lead shoulder forward, the back arm cocked
        rate = 10; crouch(P, 0.2 + 0.25 * k); P.spX = 0.35 + 0.2 * k; P.spY = 0.35; P.hdX = -0.25; P.hdY = -0.3;
        P.shLX = -1.2; P.elL = -1.9; P.shLZ = 0.2; P.shRX = 0.45; P.elR = -1.3; P.shRZ = -0.2; P.mouth = 0.5;
      }
    } else if (s === 'strike' && a) {
      rate = 32;
      if (a.kind === 'jab') { P.shRX = -1.55; P.elR = -0.05; P.shRZ = 0.12; P.spY = -0.45; P.spX = 0.22; P.hdY = 0.15; P.hpLX = -0.35; P.knL = 0.45; P.knR = 0.2; }
      else if (a.kind === 'kick') { P.hpRX = -1.5; P.knR = 0.1; P.knL = 0.3; P.spX = -0.35; P.spY = 0.2; P.shLX = -0.7; P.elL = -1.4; P.shLZ = 0.7; P.shRX = 0.1; P.elR = -0.9; P.shRZ = -0.7; P.mouth = 0.8; }
    } else if (s === 'feint') {
      // the cancel: he snaps out of it, a shrug and a shake of the head; guard back up
      rate = 20; P.shLZ = 0.6; P.shRZ = -0.6; P.shLX = -0.55; P.shRX = -0.55; P.elL = P.elR = -1.25;
      P.spX = -0.12; P.spY = 0.1; P.hdY = Math.sin(t * 16) * 0.32; P.hdX = -0.1; P.mouth = 0.3; P.smile = 0.4;
    } else if (s === 'charge') {
      // driving in shoulder first
      rate = 16; P.spX = 0.55; P.spY = 0.4; P.hdX = -0.2; P.shLX = -1.3; P.elL = -1.9; P.shLZ = 0.15; P.shRX = 0.35; P.elR = -1.5; P.mouth = 0.7;
    } else if (s === 'backoff') {
      rate = 12; P.spX = -0.02; P.hdX = 0.0;
    } else if (s === 'shift') {
      rate = 16; P.spX = 0.18;
    } else if (s === 'rec') {
      // open: the fists come down; worse after a miss (stumbling, arms wide)
      rate = 9; const miss = this.missed, sway = miss ? Math.sin(t * 6) * 0.08 : 0;
      P.shLX = -0.25; P.elL = -0.5; P.shLZ = 0.2; P.shRX = -0.3; P.elR = -0.45; P.shRZ = -0.2; P.spX = 0.3 + sway; P.hdX = 0.3; P.spY = 0.05; P.brow = -0.5; P.mouth = 0.45;
      if (a && a.kind === 'jab') { P.shRX = -0.95; P.elR = -0.25; P.spY = -0.35; } // over-extended, the arm still out
      else if (a && a.kind === 'kick') { P.knL = P.knR = 0.65; P.y = -0.12; P.shLZ = 0.55; P.shRZ = -0.55; P.spX = 0.4 + sway; } // landed heavily
      else if (a && a.kind === 'rush') { P.knL = P.knR = 0.55; P.y = -0.1; P.spX = 0.5 + sway; P.hdX = 0.4; }
      if (miss) { P.spZ = Math.sin(t * 4.5) * 0.1; P.shLZ += 0.25; P.shRZ -= 0.25; }
    } else if (s === 'stun') {
      // dazed after running into something: hands to the head, swaying
      rate = 8; P.shLX = -2.3; P.elL = -2.4; P.shRX = -2.0; P.elR = -2.3; P.shLZ = 0.4; P.shRZ = -0.4;
      P.spX = 0.35 + Math.sin(t * 9) * 0.06; P.hdX = 0.45 + Math.sin(t * 7) * 0.15; P.hdY = Math.sin(t * 5) * 0.3; P.knL = P.knR = 0.45; P.brow = -1; P.mouth = 0.6;
    } else if (s === 'transition') {
      // a step back, a wipe of the mouth, then the beckon: he resets, and the next phase is faster
      rate = 10; const u = this.t / this.dur;
      if (u < 0.45) { P.shRX = -1.6; P.elR = -2.5; P.shRZ = -0.5; P.hdX = 0.1; P.spX = -0.05; }
      else { P.shLX = -1.4; P.elL = -0.8 - 0.5 * Math.max(0, Math.sin(t * 8)); P.hdX = -0.15; P.mouth = 0.5; P.smile = ph >= 2 ? 0 : 0.3; }
    } else if (s === 'defeated') {
      // on his knees, hands behind his head: done
      rate = 5; P.knL = P.knR = 1.55; P.y = -0.42; P.spX = 0.2; P.spY = 0; P.hdX = 0.4; P.hdY = 0;
      P.shLX = -2.75; P.elL = -2.35; P.shLZ = 0.55; P.shRX = -2.75; P.elR = -2.35; P.shRZ = -0.55; P.brow = -1; P.mouth = 0.2;
      P.hpLZ = P.hpRZ = 0; rig.speed = 0;
    }
    if (this.flinchT > 0) { P.spX -= 0.25; P.hdX -= 0.3; P.brow = -1; }
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
      if (parts.some((x) => !x)) { out.push(`${id}: sequence names an undefined attack`); continue; }
      const last = parts[parts.length - 1];
      if ((last.rec * (a.recScale || 1)) < 0.6) out.push(`${id}: final recovery ${(last.rec * (a.recScale || 1)).toFixed(2)} s < 0.6 s`);
      // a dodge spent on one unblockable must have recovered before the next one in the chain lands
      for (let i = 1; i < parts.length; i++) {
        if (!parts[i].blockable && !parts[i - 1].blockable && STRIKE_T + parts[i].wind < DODGE_COOLDOWN + 0.1) out.push(`${id}: two unblockables ${STRIKE_T + parts[i].wind} s apart leave no time to dodge again`);
      }
      if (parts.some((x) => isRun(x))) out.push(`${id}: a charge or rush cannot be part of a combination`);
      continue;
    }
    if (a.wind < 0.55) out.push(`${id}: wind-up ${a.wind} s < 0.55 s`);
    if (a.dmg > 25) out.push(`${id}: damage ${a.dmg} > 25`);
    if (!a.blockable && !isRun(a) && !(a.range <= 3)) out.push(`${id}: unblockable with range ${a.range} m cannot be stepped out of`);
    if (!a.blockable && a.wind < 0.6) out.push(`${id}: unblockable wind-up ${a.wind} s < 0.6 s`);
    if (a.feintable && def.feintCancel + a.wind < DODGE_COOLDOWN + 0.15) out.push(`${id}: feint cancel + real wind-up ${(def.feintCancel + a.wind).toFixed(2)} s leaves no time to dodge again (cooldown ${DODGE_COOLDOWN} s)`);
    if (isRun(a) && !(a.stun > 0 && a.maxDist > 0)) out.push(`${id}: a run must stop at obstacles (stun) and have a maximum length`);
    if (!(a.rec > 0)) out.push(`${id}: no recovery`);
  }
  for (const ph of def.phases) {
    for (const [id] of ph.moves || []) if (!A[id]) out.push(`phase move ${id} undefined`);
    if (ph.feint && !(ph.moves || []).some(([id]) => (A[id].seq ? A[A[id].seq[A[id].seq.length - 1]] : A[id]).feintable)) out.push(`phase from ${ph.from}: feints enabled but no move ends in a feintable attack`);
    if (ph.rush && !(A.rush && isRun(A.rush))) out.push(`phase from ${ph.from}: rush enabled without a rush attack`);
    if (ph.missRec !== undefined && ph.missRec < 1) out.push(`phase from ${ph.from}: a miss must never shorten the opening (missRec ${ph.missRec})`);
    if (!(ph.cooldown > 0)) out.push(`phase from ${ph.from}: no pause between attacks`);
  }
  // later phases start at falling health thresholds above 0: every phase can be reached
  def.phases.forEach((ph, i) => { if (i > 0 && !(ph.from > 0 && ph.from < def.hp && ph.from < def.phases[i - 1].from)) out.push(`phase ${i + 1}: threshold ${ph.from} out of order`); });
  if (!def.openCap || !(def.openCap.rec >= 1)) out.push('no opening: the boss can never be hurt from the front');
  return out;
}
