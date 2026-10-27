// Crowd tension (0-100): how the street reads the police response.
//  Rises with force against people who were no threat, and with tear gas thrown into
//  a calm crowd or thrown too often. Falls with clean arrests, aggressors stopped
//  without collateral, and barriers that steer bystanders away from a fight. It
//  drains slowly on its own, down to a resting level. One mistake alone does not tip
//  a calm crowd; two in quick succession do.
//  Above TENSE and VOLATILE more of the crowd turns violent: ambient attackers appear
//  sooner and more at once (Level 1), and street encounters bring an extra crew member
//  (Level 2). Tension never decides WHO: the extra people come from the same random
//  pools through the same selection code (fairness rule; __auditAppearance({ tension })).
export const TENSION = {
  start: 20, tense: 35, volatile: 70,
  decay: 0.3,          // per second, down to the resting level
  rest: 10,            // the street is never entirely calm tonight
  peaceful: 15,        // a demonstrator who was no threat struck
  downed: 10,          // someone on the ground struck again
  gasCalm: 8,          // gas landing among peaceful people with nobody violent near
  gasOveruse: 5,       // a third grenade within OVERUSE_S
  arrest: -8,
  cleanStop: -3,       // an aggressor stopped with no peaceful person struck in CLEAN_S
  barrier: -2,         // each bystander a barrier steers away from a nearby fight
  barrierCap: 10,      // most one barrier can earn
};
export const OVERUSE_S = 20, CLEAN_S = 10;

export class Tension {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.value = TENSION.start;
    this.peak = this.value;
    this.locked = null;      // tests: hold the value
    this.lastPeaceful = -99; // mission time of the last peaceful person struck
    this.log = [];           // {t, d, reason}
  }

  band(v = this.value) { return v >= TENSION.volatile ? 'volatile' : v >= TENSION.tense ? 'tense' : 'calm'; }

  lock(v) { this.locked = v; if (v !== null) { this.value = v; this.peak = Math.max(this.peak, v); } }

  add(d, reason) {
    if (this.locked !== null || !d) return;
    const g = this.game, before = this.band();
    this.value = Math.max(0, Math.min(100, this.value + d));
    this.peak = Math.max(this.peak, this.value);
    this.log.push({ t: g.missions ? +g.missions.t.toFixed(1) : 0, d, reason });
    const after = this.band();
    if (after === before) return;
    if (after === 'volatile') g.hud.alert('The crowd is turning volatile', 'bad', 2.5, 'tension');
    else if (after === 'tense' && before === 'calm') g.hud.alert('Crowd tension rising', 'warn', 2.2, 'tension');
    else g.hud.alert('The crowd is calming', 'good', 2, 'tension');
  }

  update(dt) {
    if (this.locked !== null) { this.value = this.locked; return; }
    if (this.value > TENSION.rest) this.value = Math.max(TENSION.rest, this.value - TENSION.decay * dt);
  }

  // how much sooner ambient violence comes: 1 while calm, up to 2.2 at 100
  rate() { return 1 + Math.max(0, this.value - TENSION.tense) / (100 - TENSION.tense) * 1.2; }

  // ambient attackers allowed at once (Level 1)
  ambientCap() { return this.band() === 'volatile' ? 2 : 1; }

  // extra crew members joining a street encounter (Level 2): 0 or 1
  extraMembers() {
    const b = this.band();
    const p = b === 'volatile' ? 0.75 : b === 'tense' ? 0.35 : 0;
    return Math.random() < p ? 1 : 0;
  }

  // ------------------------------------------------------------- events
  onPeacefulStruck() { this.lastPeaceful = this.game.missions.t; this.add(TENSION.peaceful, 'peaceful struck'); }
  onDownedStruck() { this.add(TENSION.downed, 'downed struck'); }
  onArrest() { this.add(TENSION.arrest, 'arrest'); }
  onThreatNeutralized() { if (this.game.missions.t - this.lastPeaceful > CLEAN_S) this.add(TENSION.cleanStop, 'clean stop'); }

  // an officer's grenade landed: thrown into a calm crowd, or too many too fast
  onGasLanded(pos, thrown) {
    const g = this.game, crowd = g.crowd;
    let calm = 0, threat = false;
    for (const n of crowd.npcs) {
      if (n.state === 'gone') continue;
      const d = Math.hypot(n.pos.x - pos.x, n.pos.z - pos.z);
      if (d < 9 && (crowd.isThreat(n) || (n.script && n.script.marked))) threat = true;
      if (d < 7 && (n.temperament === 'peaceful' || n.temperament === 'civilian')) calm++;
    }
    if (calm >= 3 && !threat) this.add(TENSION.gasCalm, 'gas on a calm crowd');
    const recent = thrown.filter((k) => g.time - k.t < OVERUSE_S).length;
    if (recent >= 3) this.add(TENSION.gasOveruse, 'gas overuse');
  }

  // a barrier steered a bystander away while a fight is near it
  onBarrierDeflect(b) {
    const credit = b.credit || 0;
    if (credit >= TENSION.barrierCap) return;
    const o = b.col.obb, crowd = this.game.crowd;
    if (!crowd.nearest({ x: o.cx, y: 0, z: o.cz },(n) => crowd.isThreat(n), 12)) return;
    b.credit = credit - TENSION.barrier;
    this.add(TENSION.barrier, 'barrier');
  }
}
