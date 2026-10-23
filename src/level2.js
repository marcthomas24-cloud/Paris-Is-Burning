// Level 2 · "Nuit" — foundation only (increment 1).
// Later the same night. The officer regroups at Rue Oberkampf and pushes back
// down the boulevard towards the CRS staging area. Each section of the
// planned level is a waypoint for now; encounters, the Enforcer and the Leader
// replace these placeholders in later increments.
//
// Shares the Missions interface (reset / update / hudInfo / callbacks / scoring)
// so the game loop, HUD and end screen treat both levels the same way.
import { Missions } from './missions.js';
import * as THREE from 'three';

export const L2_PHASES = ['DEPLOYMENT', 'ESCALATION', 'THE ENFORCER', 'SECOND PUSH', 'THE LEADER'];
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// one waypoint per section; boss sections end at the junction that becomes their arena
const ROUTE = [
  { pos: V(0, 0, -70), text: 'Move up the boulevard with your unit', placeholder: 'Street deployment' },
  { pos: V(0, 0, -32), text: 'Push through towards Rue de Malte', placeholder: 'Escalation encounters' },
  { pos: V(0, 0, -20), text: 'Secure the Rue de Malte junction', placeholder: 'Mini-boss: the Enforcer' },
  { pos: V(0, 0, 55), text: 'Advance towards Rue Jean-Pierre Timbaud', placeholder: 'Second push' },
  { pos: V(0, 0, 70), text: 'Secure the Rue Jean-Pierre Timbaud junction', placeholder: 'Final boss: the Leader' },
];
const REACH = 4.5;

export class Level2 extends Missions {
  reset() {
    super.reset();
    this.completed = ROUTE.map(() => false);
    this.phaseTimes = ROUTE.map(() => 0);
    this.section = 0;
  }

  // Developer shortcut: start at a given section (used by ?stage= and __jump).
  jumpTo(i) {
    const g = this.game;
    i = Math.max(0, Math.min(ROUTE.length - 1, i | 0));
    for (let k = 0; k < i; k++) this.completed[k] = true;
    this.section = i;
    this.stage = 'route';
    const from = i > 0 ? ROUTE[i - 1].pos : V(-1.5, 0, -100);
    g.player.pos.set(from.x + 1, 0, from.z);
    g.player.heading = 0;
    g.cameraRig.reset(g.player);
  }

  update(dt) {
    const g = this.game;
    this.t += dt; this.stageT += dt;
    switch (this.stage) {
      case 'intro':
        if (this.stageT > 1.2) {
          this.stage = 'route'; this.stageT = 0;
          this.radio('Regroup complete. Push back down the boulevard and reopen the route to the staging area.');
        }
        break;
      case 'route': {
        const wp = ROUTE[this.section];
        this.markerPos = wp.pos;
        if (Math.hypot(g.player.pos.x - wp.pos.x, g.player.pos.z - wp.pos.z) < REACH) {
          this._phaseDone(this.section, 200, `${L2_PHASES[this.section]} — placeholder cleared`);
          this.section++;
          if (this.section >= ROUTE.length) this.complete();
        }
        break;
      }
    }
    // arrests still work if the ambient world produces downed suspects
    const a = g.crowd.arrestable(g.player.pos);
    if (a) {
      g.hud.prompt('E', 'Arrest suspect');
      if (g.input.pressed('KeyE')) { g.crowd.arrest(a); this.onArrest(a); }
    }
    this._updateMarker(dt);
  }

  complete() {
    if (this.ended) return;
    this.ended = true;
    this.stage = 'done'; // the world keeps updating until the results screen appears
    this.markerPos = null;
    this.game.endGame(true);
  }

  hudInfo() {
    const i = Math.min(this.section, ROUTE.length - 1);
    const info = { index: i, phaseName: L2_PHASES[i], text: '', status: 'active', chip: 'ACTIVE', detail: '', bar: null, completed: this.completed };
    if (this.stage === 'intro') Object.assign(info, { text: 'Regroup at Rue Oberkampf', chip: 'STANDBY', status: 'calm', detail: 'Radio traffic incoming…' });
    else {
      const wp = ROUTE[i];
      const d = Math.round(Math.hypot(this.game.player.pos.x - wp.pos.x, this.game.player.pos.z - wp.pos.z));
      Object.assign(info, { text: wp.text, detail: `${d} m · placeholder: ${wp.placeholder}` });
    }
    return info;
  }

  endInfo(win, reason) {
    const s = this.stats;
    const t = `${Math.floor(this.t / 60)}:${String(Math.floor(this.t % 60)).padStart(2, '0')}`;
    return {
      title: win ? 'LEVEL 2 COMPLETE' : 'MISSION FAILED',
      sub: win ? 'Foundation build · encounters and bosses are placeholders' : reason || '',
      rows: [
        ['Sections cleared', `${this.completed.filter(Boolean).length} / ${ROUTE.length}`],
        ['Arrests', s.arrests],
        ['Peaceful demonstrators struck', s.peaceful],
        ['Mission time', t],
      ],
      rank: win ? 'More of this night in the next build' : 'Restart to try again',
    };
  }
}
