// Level 2 · "Nuit".
// Later the same night. The officer regroups at Rue Oberkampf and pushes back
// down the boulevard towards the CRS staging area, through the looting crews of
// the man they call "le Patron" (the Leader).
//
//  1 Deployment   standard enemies, first sight of the Leader directing his crews
//  2 Escalation   shield-carriers, groups, a petrol bomber, incoming petrol bombs
//  3 The Enforcer mini-boss at the Rue de Malte junction        (increment 3)
//  4 Second push  ambush from the shop fronts, barricades, mixed groups
//  5 The Leader   final boss at the Rue Jean-Pierre Timbaud junction (increment 3)
//
// Shares the Missions interface (reset / update / hudInfo / callbacks / scoring)
// so the game loop, HUD and end screen treat both levels the same way.
import * as THREE from 'three';
import { Missions } from './missions.js';
import { EncounterRunner } from './encounters.js';
import { randomOutfit, giveItem, clearItem, prewarmItems } from './characters.js';
import { mulberry } from './textures.js';

export const L2_PHASES = ['DEPLOYMENT', 'ESCALATION', 'THE ENFORCER', 'SECOND PUSH', 'THE LEADER'];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const REACH = 5;

const SECTIONS = [
  {
    start: [-1.5, -100], end: [0, -70], hazards: false,
    radio: 'Regroup complete. Looting crews are working the shops between here and Rue de Malte. Clear the boulevard.',
    text: 'Clear the crews off the boulevard',
    encounters: [
      { id: 'shopfront', trigger: { z: -98 }, alert: 'Two of the crew coming at you',
        members: [{ style: 'melee', at: [-12, -80] }, { style: 'melee', at: [-11.5, -77] }] },
      { id: 'barricade', trigger: { after: 'shopfront' }, alert: 'Behind the burning barricade!',
        members: [{ style: 'melee', at: [8, -78] }, { style: 'thrower', at: [9, -72] }] },
      { id: 'kiosk', trigger: { after: 'barricade' }, alert: 'Three more by the kiosk',
        members: [{ style: 'melee', at: [-10, -62] }, { style: 'melee', at: [-8, -60] }, { style: 'thrower', at: [-12, -57] }] },
    ],
    leader: { after: 'shopfront', at: [-6.5, -50] }, // clear of the over-the-shoulder camera
  },
  {
    start: [0, -72], end: [0, -32], hazards: true,
    radio: 'Some carry improvised shields. Bait the bash, strike while it is down, or get round the side.',
    text: 'Push through towards Rue de Malte',
    encounters: [
      { id: 'shieldIntro', trigger: { z: -68 }, alert: 'Shield ahead — watch for the amber ring',
        members: [{ style: 'shield', at: [1, -52] }, { style: 'thrower', at: [-4, -47] }] },
      { id: 'bomber', trigger: { after: 'shieldIntro' }, bomber: [-7, -44] },
      { id: 'sidestreet', trigger: { after: 'shieldIntro' }, alert: 'Coming out of the side street — right!', events: [['molotovAt', [4, -50]]],
        members: [{ style: 'melee', at: [13, -46] }, { style: 'melee', at: [13, -42] }, { style: 'melee', at: [12.5, -39] }] },
      { id: 'malteGroup', trigger: { z: -50 }, alert: 'Group at Place de Malte!', events: [['mortar']],
        members: [{ style: 'melee', at: [-6, -26] }, { style: 'shield', at: [2, -28] }, { style: 'thrower', at: [7, -24] }, { style: 'melee', at: [-2, -24] }] },
      { id: 'malteReinforce', trigger: { after: 'malteGroup' }, alert: 'Reinforcements from Rue de Malte — both sides!', events: [['mortar']],
        members: [{ style: 'shield', at: [-20, -20] }, { style: 'melee', at: [-22, -18] }, { style: 'melee', at: [20, -21] }, { style: 'thrower', at: [22, -19] }] },
    ],
  },
  {
    start: [0, -34], end: [0, -20], hazards: false, placeholder: true,
    radio: 'Rue de Malte junction. [Placeholder: the Enforcer fight arrives in the next build.]',
    text: 'Secure the Rue de Malte junction',
    encounters: [],
  },
  {
    start: [0, -18], end: [0, 55], hazards: true,
    radio: 'Junction secure. Keep pushing towards Rue Jean-Pierre Timbaud. Expect them in the shop fronts.',
    text: 'Advance towards Rue Jean-Pierre Timbaud',
    encounters: [
      { id: 'ambush', trigger: { z: 4 }, alert: 'Ambush from the shop fronts!',
        members: [{ style: 'melee', at: [-13, 14] }, { style: 'melee', at: [-12.5, 18] }, { style: 'shield', at: [12.5, 16] }] },
      { id: 'barricade22', trigger: { z: 14 }, alert: 'Throwers behind the barricade',
        members: [{ style: 'thrower', at: [-6, 30] }, { style: 'thrower', at: [-2.5, 32] }, { style: 'melee', at: [3, 29] }] },
      { id: 'shopRun', trigger: { after: 'barricade22' }, alert: 'They are breaking out of the shop — right!',
        members: [{ style: 'melee', at: [12.5, 30] }, { style: 'melee', at: [12.5, 33] }, { style: 'melee', at: [12, 36] }] },
      { id: 'lastPush', trigger: { z: 32 }, alert: 'They are holding the street — shields up front', events: [['carFire', [7.7, 40]], ['mortar']],
        members: [{ style: 'shield', at: [-2, 50] }, { style: 'shield', at: [3, 52] }, { style: 'thrower', at: [-6, 57] }, { style: 'melee', at: [6, 48] }] },
      { id: 'reserve', trigger: { after: 'lastPush' }, alert: 'Their reserve, from Rue Jean-Pierre Timbaud!',
        members: [{ style: 'shield', at: [-18, 68] }, { style: 'thrower', at: [18, 70] }, { style: 'thrower', at: [-20, 72] }, { style: 'melee', at: [20, 66] }] },
    ],
  },
  {
    start: [0, 53], end: [0, 70], hazards: false, placeholder: true,
    radio: 'Rue Jean-Pierre Timbaud. [Placeholder: the fight with the Leader arrives in the next build.]',
    text: 'Secure the Rue Jean-Pierre Timbaud junction',
    encounters: [],
  },
];

// The Leader's look is fixed (art-directed in later increments); complexion and
// build come from the shared generator, clothing is set here.
function leaderOutfit() {
  let o = null;
  for (let s = 1871; !o || o.gender !== 'm' || o.base !== 'male'; s++) o = randomOutfit(mulberry(s));
  Object.assign(o, {
    top: 'jacket', smart: false, topColor: 0x2f3b33, topBase: 0x2f3b33, longSleeve: true,
    garment: 'puffer', shellColor: 0x2f3b33, shellPattern: 0, vest: false, keepTop: false,
    scarf: 'keffiyeh', mask: 'none', hat: 'none', hood: false, backpack: false, beard: true,
    pants: 0x1b1b20, shoes: 0x151515, height: 1.07, build: 1.1,
  });
  o.body = { ...o.body, girth: 1.12, shoulders: 1.08 };
  return o;
}

export class Level2 extends Missions {
  constructor(game) {
    super(game);
    this.enc = new EncounterRunner(game, 1);
    // one Leader per game, kept across level switches
    this.leader = game.crowd.leader || (game.crowd.leader = game.crowd.spawnSpecial(leaderOutfit()));
    // compile the new props and the (hidden) Leader now rather than on first sight
    const lr = this.leader.rig.root;
    lr.visible = true; lr.position.copy(game.camera.position).add(game.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(4));
    prewarmItems(game.renderer, game.scene, game.camera, [['impshield', 'board'], ['impshield', 'sign'], ['impshield', 'lid'], ['flare']]);
    lr.visible = false;
    this.reset();
  }

  reset() {
    super.reset();
    this.completed = SECTIONS.map(() => false);
    this.phaseTimes = SECTIONS.map(() => 0);
    this.section = 0;
    this.stats.blocked = 0;
    this.cp = null;
    this.leaderSeen = false;
    if (this.enc) this.enc.reset();
    if (this.leader) this.game.crowd.retire(this.leader);
  }

  // ------------------------------------------------------------- sections
  _startSection(i) {
    const g = this.game, sec = SECTIONS[i];
    this.section = i; this.stage = 'route'; this.stageT = 0;
    this.enc.load(sec.encounters);
    g.events.setHazards(sec.hazards);
    if (sec.radio) this.radio(sec.radio);
    // checkpoint: retrying after a failure restarts this section with the score so far
    this.cp = { section: i, score: this.score, stats: { ...this.stats }, t: this.t };
  }

  // Restart at a section: used by RETRY SECTION and by the developer shortcuts.
  resume(cp) {
    const g = this.game;
    for (let k = 0; k < cp.section; k++) this.completed[k] = true;
    this.score = cp.score || 0; this.t = cp.t || 0;
    if (cp.stats) Object.assign(this.stats, cp.stats);
    const [x, z] = SECTIONS[cp.section].start;
    g.player.pos.set(x, 0, z); g.player.heading = 0;
    g.cameraRig.reset(g.player);
    this.leaderSeen = cp.section > 0;
    this._startSection(cp.section);
  }
  jumpTo(i) { this.resume({ section: Math.max(0, Math.min(SECTIONS.length - 1, i | 0)) }); }

  update(dt) {
    const g = this.game;
    this.t += dt; this.stageT += dt;
    switch (this.stage) {
      case 'intro':
        if (this.stageT > 1.2) this._startSection(0);
        break;
      case 'route': {
        const sec = SECTIONS[this.section];
        this.enc.update(dt);
        if (sec.leader && !this.leaderSeen && this.enc.state[sec.leader.after] && this.enc.state[sec.leader.after].status === 'resolved') this._showLeader(sec.leader.at);
        const end = V(sec.end[0], 0, sec.end[1]);
        const fighting = this.enc.active();
        const near = fighting.length ? g.crowd.nearest(g.player.pos, (n) => fighting.includes(n)) : null;
        this.markerPos = near ? near.pos : this.enc.cleared() ? end : this._nextTriggerPos(sec, end);
        if (this.enc.cleared() && Math.hypot(g.player.pos.x - end.x, g.player.pos.z - end.z) < REACH) {
          this._phaseDone(this.section, sec.placeholder ? 0 : 300, sec.placeholder ? `${L2_PHASES[this.section]} — placeholder` : `${L2_PHASES[this.section]} cleared`);
          if (this.section + 1 >= SECTIONS.length) this.complete();
          else this._startSection(this.section + 1);
        }
        break;
      }
    }
    const a = g.crowd.arrestable(g.player.pos);
    if (a) {
      g.hud.prompt('E', 'Arrest suspect');
      if (g.input.pressed('KeyE')) { g.crowd.arrest(a); this.onArrest(a); }
    }
    this._updateMarker(dt);
  }

  // where the next encounter will start (keeps the marker leading the officer on)
  _nextTriggerPos(sec, end) {
    const p = this.game.player.pos;
    for (const e of sec.encounters) {
      if (this.enc.state[e.id].status !== 'waiting' || !e.trigger || e.trigger.z === undefined) continue;
      return V(p.x * 0.5, 0, e.trigger.z + 6);
    }
    return end;
  }

  // ------------------------------------------------------------- the Leader, first sight
  // He stands on the barricade directing his crews, sees the officer, and leaves
  // into Rue de Malte. Untouchable and never part of any selection pool.
  _showLeader(at) {
    const g = this.game, n = this.leader;
    this.leaderSeen = true;
    n.pos.set(at[0], 0, at[1]); n.anchor.copy(n.pos); n.vel.set(0, 0, 0);
    n.heading = Math.atan2(g.player.pos.x - n.pos.x, g.player.pos.z - n.pos.z);
    n.rig.root.visible = true;
    n.role = 'shout'; n.lookT = 99;
    giveItem(n.rig, 'flare'); // a lit road flare held up: easy to pick out at night
    g.crowd.setState(n, 'act', 999);
    const route = [V(-10, 0, -30), V(-16, 0, -21), V(-45, 0, -20)]; // off into Rue de Malte
    const sc = { t: 0, leg: -1 };
    sc.tick = (m, player, dt) => {
      sc.t += dt; m.stimuli.length = 0; m.focus.copy(player.pos);
      if (m.rig.flareTip && m.lod < 2 && Math.random() < 0.8) {
        const tp = m.rig.flareTip.getWorldPosition(new THREE.Vector3());
        g.effects.fire.spawn({ pos: tp, vel: V((Math.random() - 0.5) * 0.6, 0.9 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6), size: 0.1 + Math.random() * 0.08, life: 0.35, alpha: 1, color: new THREE.Color(1, 0.35, 0.25), color2: new THREE.Color(0.8, 0.05, 0.02), drag: 1.5 });
        if (Math.random() < 0.15) g.effects.smoke.spawn({ pos: tp.clone().setY(tp.y + 0.2), vel: V(0, 0.8, 0), size: 0.5, grow: 3, life: 2.5, alpha: 0.35, color: new THREE.Color(0.75, 0.32, 0.3), drag: 0.6, buoy: 0.2 });
      }
      if (sc.leg < 0 && (sc.t > 7 || m.distToPlayer < 24)) { sc.leg = 0; m.role = 'watch'; }
      if (sc.leg >= 0 && sc.leg < route.length && Math.hypot(m.pos.x - route[sc.leg].x, m.pos.z - route[sc.leg].z) < 1.5) sc.leg++;
      if (sc.leg >= route.length || (sc.leg >= 0 && m.distToPlayer > 70)) { clearItem(m.rig); g.crowd.retire(m); }
    };
    sc.move = () => (sc.leg >= 0 && sc.leg < route.length ? { speed: 5.4, dest: route[sc.leg] } : { speed: 0 });
    n.script = sc;
    this.radio('Control: the man with the flare is directing them. The crews call him "le Patron". Do not chase him.');
  }

  // ------------------------------------------------------------- end
  complete() {
    if (this.ended) return;
    this.ended = true;
    this.stage = 'done'; // the world keeps updating until the results screen appears
    this.markerPos = null;
    this.game.events.setHazards(false);
    if (this.stats.peaceful === 0) this.addScore(500, 'Proportionate force');
    this.game.endGame(true);
  }

  hudInfo() {
    const i = Math.min(this.section, SECTIONS.length - 1), sec = SECTIONS[i];
    const info = { index: i, phaseName: L2_PHASES[i], text: '', status: 'active', chip: 'ACTIVE', detail: '', bar: null, completed: this.completed };
    if (this.stage === 'intro') return Object.assign(info, { text: 'Regroup at Rue Oberkampf', chip: 'STANDBY', status: 'calm', detail: 'Radio traffic incoming…' });
    const p = this.game.player.pos;
    const d = Math.round(Math.hypot(p.x - sec.end[0], p.z - sec.end[1]));
    const fighting = this.enc.active().length;
    const { total, down } = this.enc.counts();
    const b = this.bomber && this.bomber.script;
    if (b && b.active && (b.phase === 'retrieve' || b.phase === 'light' || b.phase === 'wind')) return Object.assign(info, { text: 'Stop the petrol bomber!', status: 'danger', chip: 'DANGER', detail: 'Strike him before he throws' });
    if (fighting) return Object.assign(info, { text: sec.text, status: 'danger', chip: 'ENGAGED', detail: `Crew ${down} / ${total} · ${fighting} still fighting` });
    return Object.assign(info, { text: sec.text, detail: sec.placeholder ? `${d} m · placeholder` : total ? `Crew ${down} / ${total} · ${d} m` : `${d} m` });
  }

  endInfo(win, reason) {
    const s = this.stats;
    const t = `${Math.floor(this.t / 60)}:${String(Math.floor(this.t % 60)).padStart(2, '0')}`;
    return {
      title: win ? 'LEVEL 2 COMPLETE' : 'MISSION FAILED',
      sub: win ? 'Route to the staging area reopened · bosses are placeholders in this build' : reason || '',
      rows: [
        ['Sections cleared', `${this.completed.filter(Boolean).length} / ${SECTIONS.length}`],
        ['Crew members neutralised', s.neutralized],
        ['Arrests', s.arrests],
        ['Petrol bombs prevented', `${s.bombsStopped} / ${s.bombsStopped + s.bombsThrown}`],
        ['Peaceful people struck', s.peaceful],
        ['Mission time', t],
      ],
      rank: win ? 'Next build: the Enforcer and the Leader' : this.cp ? 'Retry from the start of this section, or restart' : 'Restart to try again',
    };
  }
}
