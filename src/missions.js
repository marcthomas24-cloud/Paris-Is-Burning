// Mission flow: three event-driven phases, scoring, objectives, hazards.
//  Phase 1 · Street entry   — aggressors attack the CRS line in front of the crowd
//  Phase 2 · Escalation     — crowd surge with aggressors + a petrol-bomb suspect
//  Phase 3 · Main incident  — reach the officers cut off at Rue Oberkampf through
//                             hazards, repel the final assault, extract them.
// Phases advance on gameplay events (threats resolved, objective reached), never
// on a fixed timer; the world keeps running in between.
import * as THREE from 'three';
import { giveItem, clearItem } from './characters.js';
import { beamTexture } from './textures.js';

const OBJECTIVE_POS = new THREE.Vector3(-3, 0, -112);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const PHASES = ['STREET ENTRY', 'ESCALATION', 'MAIN INCIDENT'];

export class Missions {
  constructor(game) {
    this.game = game;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 40, 16, 1, true), new THREE.MeshBasicMaterial({ map: beamTexture(), color: 0xffb02e, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, opacity: 0.6 }));
    beam.position.y = 20;
    const chevron = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0xffb02e, fog: false }));
    chevron.rotation.x = Math.PI;
    this.marker = new THREE.Group();
    this.marker.add(beam, chevron);
    this.chevron = chevron;
    this.marker.visible = false;
    game.scene.add(this.marker);
    this.reset();
  }

  reset() {
    this.stage = 'intro';
    this.phase = 0;
    this.t = 0;
    this.stageT = 0;
    this.score = 0;
    this.stats = { neutralized: 0, arrests: 0, peaceful: 0, bombsStopped: 0, bombsThrown: 0, damage: 0 };
    this.line = 100;
    this.officers = 100;
    this.hostiles1 = [];
    this.hostiles2 = [];
    this.finalWave = [];
    this.bomber = null;
    this.bomber2 = null;
    this.bomberDone = false;
    this.timer = 0;
    this.completed = [false, false, false];
    this.ambientT = 35;
    this.ambient = null;
    this.markerPos = null;
    this.warning = false;
    this.ended = false;
    this.finalStarted = false;
    this.ambushed = false;
    this.ambush = [];
    this.extractReady = false;
    this.phaseTimes = [0, 0, 0];
  }

  addScore(v, reason) {
    this.score = Math.max(0, this.score + v);
    this.game.hud.scorePop(v, reason);
  }

  // ------------------------------------------------------------- callbacks
  onThreatNeutralized(n) {
    this.stats.neutralized++;
    this.addScore(100, 'Threat neutralised');
    this.game.hud.alert('Aggressor down — press E nearby to arrest', 'good', 2.5, 'down');
  }
  onPeacefulStruck(n) {
    this.stats.peaceful++;
    this.addScore(-150, 'Excessive force');
    this.game.hud.alert('EXCESSIVE FORCE — that demonstrator was not a threat', 'bad', 3);
    this.game.audio.ui('bad');
  }
  onPoliceLineHit(dmg, cop) {
    if (cop && cop.role !== 'line') {
      if (this.stage !== 'final') return;
      this.officers = Math.max(0, this.officers - dmg * 1.6);
      if (this.officers <= 0) this.fail('The cut-off officers were overrun.');
      return;
    }
    if (this.stage !== 'p1' && this.stage !== 'p2') return;
    this.line = Math.max(0, this.line - dmg);
    if (this.line <= 0 && !this.ended) this.fail('The police line was overrun.');
  }
  onArrest(n) {
    this.stats.arrests++;
    this.addScore(150, 'Arrest');
    this.game.hud.alert('Suspect arrested', 'good', 2);
    this.game.audio.ui('good');
  }

  radio(text) { this.game.hud.alert('📻 ' + text, 'radio', 5); this.game.audio.ui('radio'); }

  _pickFromCrowd(filter, n) {
    const pool = this.game.crowd.npcs.filter((o) => o.temperament === 'peaceful' && !o.script && !o.arrested && !o.surge && o.state !== 'down' && filter(o));
    pool.sort(() => Math.random() - 0.5);
    return pool.slice(0, n);
  }

  _phaseDone(i, bonus, text) {
    this.completed[i] = true;
    this.phaseTimes[i] = this.t;
    this.addScore(bonus, 'Phase complete');
    this.game.hud.alert(text, 'good', 3);
    this.game.audio.ui('good');
  }

  // ------------------------------------------------------------- phase 1
  _startP1() {
    const g = this.game, crowd = g.crowd;
    this.stage = 'p1'; this.phase = 0; this.stageT = 0;
    // appearance plays no part in who turns violent: random individuals near the line
    this.hostiles1 = this._pickFromCrowd((n) => n.pos.z > 92 && n.pos.z < 121, 3);
    const styles = Math.random() < 0.5 ? ['melee', 'melee', 'thrower'] : ['melee', 'thrower', 'melee'];
    this.hostiles1.forEach((n, i) => crowd.makeHostile(n, styles[i], 'auto'));
    crowd.disturb(V(0, 0, 112), 14, 0.35, 'charge');
    this.radio('Aggressors are attacking the CRS line. Neutralise them — the marchers around them are peaceful.');
    g.events.schedule('teargas', 5 + Math.random() * 4);
  }

  // ------------------------------------------------------------- phase 2
  _startP2() {
    const g = this.game, crowd = g.crowd;
    this.stage = 'p2'; this.phase = 1; this.stageT = 0;
    this.radio('Situation escalating — a crowd surge is heading for the line. Reports of a petrol bomb up the boulevard!');
    // distant explosion: a car goes up further along the boulevard
    g.events.scripted('carFire', V(pick([-7.7, 7.7]), 1.0, 52 + Math.random() * 20));
    g.events.schedule('mortar', 6 + Math.random() * 5);
    // surge towards the police line, with aggressors hidden inside it
    const surge = this._pickFromCrowd((n) => n.pos.z < 95 && n.pos.z > -40, 18);
    const z0 = 66 + Math.random() * 8;
    surge.forEach((n) => {
      let x = 0, z = 0;
      for (let k = 0; k < 8; k++) { x = -9 + Math.random() * 18; z = z0 - Math.random() * 8; if (!g.world.blocked(x, z, 0.4)) break; }
      n.pos.set(x, 0, z); n.vel.set(0, 0, 0);
      n.surge = { dir: V(0, 0, 1), speed: 1.6 + Math.random() * 0.5, laneX: x, endZ: 117 };
      crowd.setState(n, 'surge');
    });
    this.hostiles2 = surge.slice(0, 2);
    this.hostiles2.forEach((n) => { n.surge = null; crowd.makeHostile(n, 'melee', 'auto'); });
    crowd.disturb(V(0, 0, z0), 10, 0.25, 'charge');
    // petrol-bomb suspect at a varied location ahead
    const spot = pick([V(-5.5, 0, 76), V(6.5, 0, 62), V(-2, 0, 50), V(11.5, 0, 70)]);
    const n = crowd.nearest(spot, (o) => o.temperament === 'peaceful' && !o.arrested && !o.script && !o.surge && o.state !== 'down');
    this.bomber = n; this.bomberDone = false;
    this.bomberSpot = spot;
    this._setupBomber(n, spot, 30, (prevented) => {
      this.bomberDone = true;
      g.hud.alert(prevented ? 'Petrol bomb attack prevented' : 'Bomber dealt with', 'good', 2.5);
    });
  }

  // ------------------------------------------------------------- phase 3
  _startP3() {
    const g = this.game, crowd = g.crowd;
    this.stage = 'p3'; this.phase = 2; this.stageT = 0;
    this.timer = 160;
    this.markerPos = OBJECTIVE_POS.clone();
    this.radio('Officers cut off at Rue Oberkampf and under attack! Get through to them — expect resistance on the boulevard.');
    // a surge rolling down the boulevard towards the officer
    const pz = g.player.pos.z;
    const z0 = Math.max(-80, Math.min(pz - 45, 20));
    const surge = this._pickFromCrowd((n) => n.distToPlayer > 40, 22);
    surge.forEach((n) => {
      let x = 0, z = 0;
      for (let k = 0; k < 8; k++) { x = -10 + Math.random() * 20; z = z0 - Math.random() * 10; if (!g.world.blocked(x, z, 0.4)) break; }
      n.pos.set(x, 0, z); n.vel.set(0, 0, 0);
      n.surge = { dir: V(0, 0, 1), speed: 1.7 + Math.random() * 0.4, laneX: x, endZ: Math.min(170, pz + 40) };
      crowd.setState(n, 'surge');
    });
    surge.slice(0, 2).forEach((n) => { n.surge = null; crowd.makeHostile(n, Math.random() < 0.5 ? 'melee' : 'thrower', 'player'); });
    // second device on the way, at one of the barricades
    const spot = pick([V(7.5, 0, -82), V(-6, 0, -60), V(4.5, 0, -30)]);
    const b = crowd.nearest(spot, (o) => o.temperament === 'peaceful' && !o.arrested && !o.script && !o.surge && o.state !== 'down' && o.distToPlayer > 25);
    if (b) { this.bomber2 = b; this._setupBomber(b, spot, 26, (prevented) => { this.addScore(prevented ? 200 : 0, 'Second device'); }); }
    g.events.setHazards(true);
  }

  _startFinal() {
    const g = this.game, crowd = g.crowd;
    this.stage = 'final'; this.stageT = 0;
    this.radio('Aggressors closing in on the officers — protect them!');
    // assailants come from the north side of the junction
    const n = 3 + (Math.random() < 0.4 ? 1 : 0);
    const wave = this._pickFromCrowd((o) => o.distToPlayer > 30, n);
    const side = Math.random() < 0.5 ? -1 : 1;
    wave.forEach((o, i) => {
      const x = side * (19 + Math.random() * 7), z = -112 + (Math.random() - 0.5) * 6;
      o.pos.set(x, 0, z); o.vel.set(0, 0, 0);
      crowd.makeHostile(o, i === 0 && n > 3 ? 'thrower' : 'melee', 'officers');
    });
    this.finalWave = wave;
    g.events.scripted('molotovAt', V(2 + Math.random() * 4, 0, -122));
  }

  // ------------------------------------------------------------- petrol bombs
  _setupBomber(n, spot, triggerDist, onDone) {
    const g = this.game, crowd = g.crowd;
    n.pos.copy(spot); n.anchor.copy(spot); n.vel.set(0, 0, 0); n.march = null;
    n.temperament = 'hostile'; n.attackStyle = 'bomber'; n.hp = 1; n.neutralized = false; n.lastAggro = -99;
    n.role = 'shout';
    clearItem(n.rig);
    crowd.setState(n, 'act'); n.dur = 99;
    const self = this;
    const sc = {
      active: false, phase: 'wait', marked: false, amber: false, t: 0, escapeT: 0,
      tick(n, player, dt) {
        sc.t += dt;
        const d = n.distToPlayer;
        if (sc.phase === 'wait') {
          n.targetRef = { pos: player.pos, isPlayer: true };
          if (d < triggerDist) {
            sc.phase = 'retrieve'; sc.active = true; sc.marked = true; sc.amber = true;
            crowd.setState(n, 'bomb_retrieve', 2.4);
            g.hud.alert('Suspect reaching into a bag!', 'warn', 2.5);
            g.audio.ui('alert');
          }
        } else if (sc.phase === 'retrieve' && n.state === 'bomb_retrieve' && n.st > n.dur) {
          sc.phase = 'light'; sc.amber = false; n.lastAggro = crowd.time;
          giveItem(n.rig, 'bottle');
          crowd.setState(n, 'bomb_light', 2.2);
          g.audio.lighter(n.pos);
        } else if (sc.phase === 'light' && n.state === 'bomb_light' && n.st > n.dur) {
          sc.phase = 'wind'; n.lastAggro = crowd.time;
          crowd.setState(n, 'bomb_wind', 2.7);
          self.warning = true;
        } else if (sc.phase === 'wind' && n.state === 'bomb_wind' && n.st > n.dur) {
          sc.phase = 'throw'; self.warning = false;
          crowd.setState(n, 'bomb_throw', 0.5);
          clearItem(n.rig);
          self._throwPetrol(n, player);
        } else if (sc.phase === 'throw' && n.state === 'bomb_throw' && n.st > n.dur) {
          sc.phase = 'flee'; sc.escapeT = 0;
          n.fleeFrom = player.pos.clone();
          crowd.setState(n, 'flee', 30);
        } else if (sc.phase === 'flee') {
          sc.escapeT += dt;
          n.lastAggro = crowd.time; // still a wanted suspect
          if (n.state === 'flee') n.fleeFrom.copy(player.pos);
          if (sc.escapeT > 22 && !n.neutralized) { sc.phase = 'escaped'; sc.active = false; sc.marked = false; n.temperament = 'peaceful'; g.hud.alert('Suspect escaped into the crowd', 'bad', 3); onDone(false); }
        }
        if ((sc.phase === 'light' && n.st > 0.6) || sc.phase === 'wind') {
          if (n.rig.wick) {
            const p = new THREE.Vector3(); n.rig.wick.getWorldPosition(p);
            if (Math.random() < 0.7) g.effects.fire.spawn({ pos: p, vel: V(0, 0.8, 0), size: 0.16 + Math.random() * 0.1, life: 0.25, alpha: 1, color: new THREE.Color(1, 0.75, 0.3), color2: new THREE.Color(0.9, 0.2, 0), drag: 1 });
            if (Math.random() < 0.05) g.effects.flash(p, 0xff9a40, 3, 0.2, 6);
          }
        }
        if (n.neutralized && sc.phase !== 'done' && sc.phase !== 'escaped') {
          const before = sc.phase;
          sc.phase = 'done'; sc.active = false; sc.marked = false; self.warning = false;
          onDone(before === 'retrieve' || before === 'light' || before === 'wind');
        }
      },
      onHit(n) {
        if (sc.phase === 'retrieve' || sc.phase === 'light' || sc.phase === 'wind') {
          clearItem(n.rig);
          self.warning = false;
          self.stats.bombsStopped++;
          self.addScore(400, 'Petrol bomb prevented');
          g.hud.alert('Device dropped — attack prevented!', 'good', 3);
        }
      },
      move() { return sc.phase === 'wait' ? { speed: 0 } : null; },
    };
    n.script = sc;
    return sc;
  }

  _throwPetrol(n, player) {
    const g = this.game;
    this.stats.bombsThrown++;
    const from = n.pos.clone().setY(n.pos.y + 2.0);
    const d = n.distToPlayer;
    let aim;
    if (d < 30) aim = player.pos.clone().addScaledVector(player.vel, 0.5).setY(0.1);
    else aim = V(n.pos.x + Math.sin(n.heading) * 14, 0.1, n.pos.z + Math.cos(n.heading) * 14);
    aim.x += (Math.random() - 0.5) * 1.2; aim.z += (Math.random() - 0.5) * 1.2;
    const proj = g.effects.throwProjectile(from, aim, 'petrol', (pos) => {
      const ground = pos.clone().setY(g.world.groundHeight(pos.x, pos.z));
      g.effects.ignite(ground, 3.3, 6);
      g.audio.molotov(ground, 1.2);
      g.crowd.disturb(ground, 20, 1.0, 'explosion');
      const pd = g.player.pos.distanceTo(ground);
      g.cameraRig.shake(Math.max(0, 0.6 - pd * 0.03));
      if (pd < 4.2) g.player.takeDamage(26 * (1 - pd / 5), ground, V(g.player.pos.x - ground.x, 0, g.player.pos.z - ground.z).normalize().multiplyScalar(3));
    }, Math.max(0.8, Math.min(1.5, d / 14)));
    proj.check = (pos) => g.player.hitTest(pos);
    g.audio.swing(n.pos, true);
    g.hud.alert('PETROL BOMB THROWN!', 'bad', 2.5);
  }

  _ambientThreat() {
    const g = this.game, crowd = g.crowd;
    if (this.ambient && crowd.isThreat(this.ambient)) return;
    const cands = crowd.npcs.filter((n) => n.temperament === 'peaceful' && !n.script && !n.surge && !n.arrested && n.state === 'act' && n.distToPlayer > 12 && n.distToPlayer < 28);
    if (!cands.length) return;
    const n = pick(cands);
    crowd.makeHostile(n, Math.random() < 0.6 ? 'thrower' : 'melee', 'player');
    this.ambient = n;
    g.hud.alert('An individual has turned violent nearby', 'warn', 2.5);
  }

  fail(reason) {
    if (this.ended) return;
    this.ended = true;
    this.game.endGame(false, reason);
  }

  complete() {
    if (this.ended) return;
    this.ended = true;
    this._phaseDone(2, 1000, 'Officers extracted');
    const bonus = Math.round(Math.max(0, this.timer) * 4);
    if (bonus > 0) this.addScore(bonus, 'Time bonus');
    if (this.stats.peaceful === 0) this.addScore(500, 'Proportionate force');
    this.game.events.setHazards(false);
    this.game.endGame(true);
  }

  // ------------------------------------------------------------- update
  update(dt) {
    const g = this.game;
    this.t += dt; this.stageT += dt;
    const crowd = g.crowd;
    const alive = (list) => list.filter((n) => !n.neutralized && !n.arrested && n.temperament === 'hostile').length;
    switch (this.stage) {
      case 'intro':
        if (this.stageT > 1.2) this._startP1();
        break;
      case 'p1': {
        const left = alive(this.hostiles1);
        const nearest = crowd.nearest(g.player.pos, (n) => this.hostiles1.includes(n) && !n.neutralized);
        this.markerPos = nearest ? nearest.pos : null;
        if (left === 0) { this._phaseDone(0, 500 + Math.round(this.line * 2), 'Police line secured'); this.stage = 'gap1'; this.stageT = 0; this.markerPos = null; }
        break;
      }
      case 'gap1':
        if (this.stageT > 3) this._startP2();
        break;
      case 'p2': {
        const left = alive(this.hostiles2);
        const b = this.bomber && this.bomber.script;
        if (!this.bomberDone) this.markerPos = b && b.active ? this.bomber.pos : this.bomberSpot;
        else { const h = crowd.nearest(g.player.pos, (n) => this.hostiles2.includes(n) && !n.neutralized); this.markerPos = h ? h.pos : null; }
        if (this.bomberDone && left === 0) { this._phaseDone(1, 600, 'Escalation contained'); this.stage = 'gap2'; this.stageT = 0; this.markerPos = null; }
        break;
      }
      case 'gap2':
        if (this.stageT > 3) this._startP3();
        break;
      case 'p3': {
        this.timer -= dt;
        // ambush from Rue de Malte as the officer passes the junction
        if (!this.ambushed && g.player.pos.z < -8) {
          this.ambushed = true;
          const side = Math.random() < 0.5 ? -1 : 1;
          const am = this._pickFromCrowd((o) => o.distToPlayer > 30, 2 + (Math.random() < 0.5 ? 1 : 0));
          am.forEach((o, i) => { o.pos.set(side * (20 + i * 1.5), 0, -20 + (i - 1) * 1.6); o.vel.set(0, 0, 0); crowd.makeHostile(o, i === 2 ? 'thrower' : 'melee', 'player'); });
          this.ambush = am;
          g.hud.alert(`Ambush from Rue de Malte — ${side < 0 ? 'left' : 'right'}!`, 'warn', 2.5);
          g.events.scripted('mortar');
        }
        if (g.player.pos.distanceTo(OBJECTIVE_POS) < 22) this._startFinal();
        if (this.timer <= 0) this.fail('The cut-off officers were not reached in time.');
        break;
      }
      case 'final': {
        this.timer -= dt;
        const left = alive(this.finalWave);
        const near = crowd.nearest(g.player.pos, (n) => this.finalWave.includes(n) && !n.neutralized);
        this.markerPos = near ? near.pos : OBJECTIVE_POS;
        if (left === 0) {
          if (!this.extractReady) { this.extractReady = true; g.hud.alert('Area secure — extract the officers', 'good', 3); }
          this.markerPos = OBJECTIVE_POS;
          if (g.player.pos.distanceTo(OBJECTIVE_POS) < 4.5) {
            g.hud.prompt('E', 'Extract the officers');
            if (g.input.pressed('KeyE')) this.complete();
          }
        }
        if (this.timer <= 0) this.fail('The cut-off officers were not reached in time.');
        break;
      }
    }
    if (this.stage !== 'intro' && this.stage !== 'p1' && this.stage !== 'final') {
      this.ambientT -= dt;
      if (this.ambientT <= 0) { this.ambientT = 30 + Math.random() * 25; this._ambientThreat(); }
    }
    const a = crowd.arrestable(g.player.pos);
    if (a && !(this.extractReady && g.player.pos.distanceTo(OBJECTIVE_POS) < 4.5)) {
      g.hud.prompt('E', 'Arrest suspect');
      if (g.input.pressed('KeyE')) { crowd.arrest(a); this.onArrest(a); }
    }
    const md = this.markerPos ? Math.hypot(this.markerPos.x - g.player.pos.x, this.markerPos.z - g.player.pos.z) : 0;
    if (this.markerPos && md > 9) {
      this.marker.visible = true;
      this.marker.children[0].material.opacity = Math.min(0.6, (md - 9) / 15);
      this.marker.position.set(this.markerPos.x, 0, this.markerPos.z);
      this.chevron.position.y = 2.6 + Math.sin(this.t * 3) * 0.15;
      this.chevron.rotation.y += dt * 2;
    } else this.marker.visible = false;
  }

  // ------------------------------------------------------------- HUD data
  hudInfo() {
    const info = { index: this.phase, phaseName: PHASES[this.phase], text: '', status: 'calm', chip: 'CALM', detail: '', bar: null };
    const left = (l) => l.filter((n) => !n.neutralized && !n.arrested && n.temperament === 'hostile').length;
    switch (this.stage) {
      case 'intro':
        Object.assign(info, { text: 'Hold position with the CRS line', chip: 'STANDBY', detail: 'Radio traffic incoming…' }); break;
      case 'p1': {
        const n = this.hostiles1.length;
        Object.assign(info, { text: 'Repel the aggressors attacking the police line', status: 'active', chip: 'ACTIVE', detail: `Aggressors ${n - left(this.hostiles1)} / ${n} · Line ${Math.round(this.line)}%`, bar: this.line / 100 });
        break;
      }
      case 'gap1':
        Object.assign(info, { index: 1, phaseName: PHASES[1], text: 'Stand by — radio traffic', chip: 'CALM' }); break;
      case 'p2': {
        const sc = this.bomber && this.bomber.script;
        const ph = this.bomberDone ? 'done' : sc ? sc.phase : 'wait';
        const ag = `Surge aggressors ${2 - left(this.hostiles2)} / 2`;
        const map = {
          wait: ['Find the petrol-bomb suspect before he acts', 'ACTIVE', 'active', `Suspect not yet located · ${ag}`],
          retrieve: ['Stop him — he is retrieving a device!', 'DANGER', 'danger', 'Device being retrieved'],
          light: ['Stop him before he throws it!', 'DANGER', 'danger', 'Device being lit'],
          wind: ['STOP HIM NOW!', 'DANGER', 'danger', 'About to throw'],
          throw: ['Take cover!', 'DANGER', 'danger', 'Device thrown'],
          flee: ['Catch the fleeing suspect', 'ACTIVE', 'active', `Suspect fleeing · ${Math.max(0, Math.ceil(22 - (sc ? sc.escapeT : 0)))}s`],
          done: ['Neutralise the aggressors in the surge', 'ACTIVE', 'active', ag],
        };
        const m = map[ph] || map.wait;
        Object.assign(info, { text: m[0], chip: m[1], status: m[2], detail: m[3], bar: this.line / 100 });
        break;
      }
      case 'gap2':
        Object.assign(info, { index: 2, phaseName: PHASES[2], text: 'Regroup', chip: 'CALM', detail: 'Radio traffic incoming…' }); break;
      case 'p3': {
        const sc = this.bomber2 && this.bomber2.script;
        const danger = sc && sc.active;
        Object.assign(info, { text: 'Reach the officers cut off at Rue Oberkampf', status: danger ? 'danger' : 'active', chip: danger ? 'DANGER' : 'ACTIVE', detail: `${Math.round(this.game.player.pos.distanceTo(OBJECTIVE_POS))} m · ${Math.max(0, Math.ceil(this.timer))}s${danger ? ' · INCENDIARY DEVICE' : ''}`, bar: Math.max(0, this.timer / 160) });
        break;
      }
      case 'final': {
        const n = this.finalWave.length, l = left(this.finalWave);
        Object.assign(info, l > 0
          ? { text: 'Protect the cut-off officers', status: 'danger', chip: 'DANGER', detail: `Assailants ${n - l} / ${n} · Officers ${Math.round(this.officers)}%`, bar: this.officers / 100 }
          : { text: 'Extract the officers — press E beside them', status: 'active', chip: 'SECURE', detail: `${Math.round(this.game.player.pos.distanceTo(OBJECTIVE_POS))} m`, bar: null });
        break;
      }
    }
    info.completed = this.completed;
    return info;
  }
}
