// Data-driven street encounters (Level 2).
//
// An encounter is a small group sent at the officer when a trigger fires:
//   { id, trigger: { z } | { after: 'id' } | { now: true }, radio, alert,
//     members: [{ style: 'melee' | 'thrower' | 'shield', at: [x, z] }],
//     events: [['mortar'] | ['molotovAt', [x, z]] | ['carFire', [x, z]], ...] }
// `z` triggers when the officer's position passes that z in the level's direction
// of travel. An encounter resolves when every member is neutralised, arrested or
// no longer hostile.
//
// Who takes part is decided by role and availability only: members are drawn at
// random from the free members of the looting crews (the Leader's people). Peaceful
// people are never recruited; if too few crew members are free, the group is smaller
// (counted in `shortfall`). Appearance is never read (see __auditAppearance).
import * as THREE from 'three';

export class EncounterRunner {
  constructor(game, dir = 1) {
    this.game = game;
    this.dir = dir; // +1: the officer advances towards +z
    this.reset();
  }

  reset() {
    this.list = [];      // encounters of the current section
    this.state = {};     // id -> { status: 'waiting' | 'active' | 'resolved', members, t }
    this.shortfall = 0;  // members that could not be found
  }

  // Load a section's encounters (earlier sections' encounters are dropped).
  load(list) {
    this.list = list;
    this.state = {};
    for (const e of list) this.state[e.id] = { status: 'waiting', members: [], t: 0 };
  }

  // Someone free to be sent in: the selection pool for every encounter.
  eligible(n, minDist = 22) {
    const free = !n.script && !n.arrested && !n.neutralized && !n.special && n.state !== 'gone' && n.state !== 'down' && n.state !== 'recover' && n.distToPlayer > minDist;
    return free && n.temperament === 'looter';
  }

  _pick(count) {
    const crowd = this.game.crowd;
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const picked = shuffle(crowd.npcs.filter((n) => this.eligible(n))).slice(0, count);
    this.shortfall += count - picked.length;
    return picked;
  }

  start(e) {
    const g = this.game, crowd = g.crowd, st = this.state[e.id];
    st.status = 'active'; st.t = 0;
    if (e.bomber) {
      // a petrol-bomb suspect (Level 1's bomber script): stop him before he throws
      const [n] = this._pick(1);
      st.members = n ? [n] : [];
      if (!n) return;
      const spot = new THREE.Vector3(e.bomber[0], 0, e.bomber[1]);
      g.missions.bomber = n;
      g.missions._setupBomber(n, spot, 24, (prevented) => g.hud.alert(prevented ? 'Petrol bomb attack prevented' : 'Bomber dealt with', 'good', 2.5));
      return;
    }
    const people = this._pick(e.members.length);
    people.forEach((n, i) => {
      const m = e.members[i];
      // enter from just outside the officer's view where possible (side streets, behind barricades)
      let x = m.at[0], z = m.at[1];
      for (let k = 0; k < 8 && g.world.blocked(x, z, 0.4); k++) { x += (Math.random() - 0.5) * 2; z += (Math.random() - 0.5) * 2; }
      n.pos.set(x, 0, z); n.vel.set(0, 0, 0); n.knock.set(0, 0, 0);
      n.surge = null; n.march = null; n.stimuli.length = 0;
      n.heading = Math.atan2(g.player.pos.x - x, g.player.pos.z - z);
      crowd.makeHostile(n, m.style, 'player');
      n.cool = 0.6 + Math.random() * 1.2 + i * 0.4; // staggered: the group does not all swing at once
    });
    st.members = people;
    if (e.radio) g.missions.radio(e.radio);
    if (e.alert) g.hud.alert(e.alert, 'warn', 2.5);
    for (const [type, at] of e.events || []) {
      const pos = at ? new THREE.Vector3(at[0], type === 'carFire' ? 1.0 : 0, at[1]) : undefined;
      g.events.scripted(type, pos);
    }
    if (g.audio.enabled) g.audio.shout(people[0] ? people[0].pos : g.player.pos);
  }

  alive(id) {
    const st = this.state[id];
    return st ? st.members.filter((n) => !n.neutralized && !n.arrested && n.temperament === 'hostile').length : 0;
  }

  update(dt) {
    const p = this.game.player.pos;
    for (const e of this.list) {
      const st = this.state[e.id];
      if (st.status === 'waiting') {
        const tr = e.trigger || { now: true };
        const go = tr.now || (tr.z !== undefined && (p.z - tr.z) * this.dir >= 0) || (tr.after && this.state[tr.after] && this.state[tr.after].status === 'resolved');
        if (go) this.start(e);
      } else if (st.status === 'active') {
        st.t += dt;
        if (this.alive(e.id) === 0) st.status = 'resolved';
      }
    }
  }

  // every encounter of the section has resolved
  cleared() { return this.list.every((e) => this.state[e.id].status === 'resolved'); }

  // members still fighting, across the section
  active() {
    const out = [];
    for (const e of this.list) if (this.state[e.id].status === 'active') for (const n of this.state[e.id].members) if (!n.neutralized && !n.arrested && n.temperament === 'hostile') out.push(n);
    return out;
  }

  counts() {
    let total = 0, down = 0;
    for (const e of this.list) {
      const st = this.state[e.id];
      if (st.status === 'waiting') continue;
      total += st.members.length;
      down += st.members.length - this.alive(e.id);
    }
    return { total, down };
  }
}
