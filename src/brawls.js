// Street violence set pieces (background chaos, both levels): rioters kicking a
// CRS officer who has gone down, officers beating a rioter on the ground, and
// rioters smashing shop windows. Each scene has its own characters, separate from
// the crowd AI, so encounters, attacker counts and the crowd's behaviour are not
// affected. Rioters scatter when the player comes close; a scene starts again once
// the player is well away from it. Characters come from the shared outfit pool.
import * as THREE from 'three';
import { buildCharacter, randomOutfit, policeOutfit, addPoliceGear, updateShield, giveItem, clearItem, newPose, baseLayer, applyPose, lying } from './characters.js';
import { mulberry } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const GLASS = new THREE.Color(0.7, 1, 0.8);
const ACTIVE_DIST = 62;   // scenes animate (and are drawn) within this distance of the officer
const SCATTER_DIST = 8;   // rioters run when the officer comes this close
const RESET_DIST = 75;    // a finished scene starts over once the officer is this far away

// [type, x, z, facing side for shop windows (-1 west, +1 east)]
const SCENES = [
  ['stomp', -11.6, 60], ['beat', 11.4, 99], ['smash', -13.4, 6, -1], ['stomp', 12.2, -92],
  ['beat', -11.8, -44], ['smash', 13.4, 41, 1], ['stomp', -11.8, 101], ['smash', -13.4, -70, -1],
  ['beat', 11.8, 22], ['smash', 13.4, -118, 1],
];

const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

export class Brawls {
  constructor(game) {
    this.game = game;
    this.rng = mulberry(5150); // own stream: the crowd's random sequence is untouched
    this.scenes = SCENES.map(([type, x, z, side], i) => this._build(type, x, z, side || 0, i));
    // the crowd walks round the fights rather than through them
    for (const sc of this.scenes) game.crowd.keepOut.push(sc.type === 'smash' ? { x: sc.x - sc.side * 0.3, z: sc.z, r: 2.0 } : { x: sc.x, z: sc.z, r: 1.9 });
    game.crowd.reset();
    this.reset();
  }

  _actor(outfit, police) {
    const rig = buildCharacter(this.game.world, outfit, police ? 'police' : 'civ');
    if (police) addPoliceGear(rig);
    this.game.scene.add(rig.root);
    rig.root.visible = false;
    rig.pose = newPose();
    return { rig, pos: V(0, 0, 0), heading: 0, home: V(0, 0, 0), homeH: 0, ph: this.rng() * 2, hitCyc: -1, flee: null, police };
  }

  _build(type, x, z, side, id) {
    const sc = { id, type, x, z, side, centre: V(x, 0, z), actors: [], victim: null, state: 'active', t: 0, idleT: 0 };
    const R = (a, b) => a + (b - a) * this.rng();
    if (type === 'stomp' || type === 'beat') {
      // the person on the ground, and two or three standing over them
      sc.victim = this._actor(type === 'stomp' ? policeOutfit(this.rng) : randomOutfit(this.rng), type === 'stomp');
      sc.victim.home.set(x, 0, z); sc.victim.homeH = R(0, Math.PI * 2);
      const n = type === 'stomp' ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const a = sc.victim.homeH + 0.6 + (k / n) * Math.PI * 1.6 + R(-0.2, 0.2);
        const act = this._actor(type === 'stomp' ? randomOutfit(this.rng) : policeOutfit(this.rng), type === 'beat');
        act.home.set(x + Math.sin(a) * 0.95, 0, z + Math.cos(a) * 0.95);
        act.homeH = Math.atan2(x - act.home.x, z - act.home.z);
        act.style = type === 'beat' ? 'baton' : k % 2 ? 'stomp' : 'kick';
        sc.actors.push(act);
      }
    } else {
      // two or three at a shop front: kicks and blows at the glass, one with a bar or a bottle
      const n = 2 + (id % 2);
      for (let k = 0; k < n; k++) {
        const act = this._actor(randomOutfit(this.rng), false);
        act.home.set(x - side * R(0, 0.5), 0, z + (k - (n - 1) / 2) * 1.2 + R(-0.2, 0.2));
        act.homeH = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        act.style = k === 0 ? 'kick' : 'blow';
        if (k === 1) giveItem(act.rig, this.rng() < 0.5 ? 'stone' : 'bottle', this.rng);
        sc.actors.push(act);
      }
      sc.glassAt = V(x + side * 1.2, 1.1, z);
    }
    return sc;
  }

  reset() {
    for (const sc of this.scenes) this._restart(sc);
  }

  _restart(sc) {
    sc.state = 'active'; sc.t = 0; sc.idleT = 0; sc.hits = 0;
    for (const a of [...sc.actors, sc.victim].filter(Boolean)) {
      a.pos.copy(a.home); a.heading = a.homeH; a.flee = null; a.hitCyc = -1; a.flinch = 0;
      a.rig.root.visible = false; a.rig.pose = newPose();
    }
  }

  update(dt, t) {
    const g = this.game, pp = g.player.pos;
    for (const sc of this.scenes) {
      const d = Math.hypot(pp.x - sc.x, pp.z - sc.z);
      sc.t += dt;
      if (sc.state === 'scattered') {
        sc.idleT += dt;
        if (d > RESET_DIST && sc.idleT > 20) this._restart(sc);
      } else if (d < SCATTER_DIST && sc.type !== 'beat') this._scatter(sc);
      const on = d < ACTIVE_DIST;
      for (const a of [...sc.actors, sc.victim].filter(Boolean)) a.rig.root.visible = on && !a.gone;
      if (!on) { sc.acc = 0; continue; }
      // further off, the scene animates at a reduced rate (as crowd agents do)
      sc.acc = (sc.acc || 0) + dt;
      if (d > 22 && sc.acc < 0.05) continue;
      const step = sc.acc; sc.acc = 0;
      if (sc.type === 'smash') this._smash(sc, step, t);
      else this._fight(sc, step, t);
    }
  }

  _scatter(sc) {
    const g = this.game, pp = g.player.pos;
    sc.state = 'scattered'; sc.idleT = 0;
    for (const a of sc.actors) {
      if (a.police) continue;
      const dir = V(a.pos.x - pp.x, 0, a.pos.z - pp.z);
      if (dir.lengthSq() < 0.01) dir.set(this.rng() - 0.5, 0, this.rng() - 0.5);
      dir.normalize();
      // run off along the street, away from the officer
      if (Math.abs(dir.z) < 0.5) dir.z = (dir.z >= 0 ? 1 : -1) * 0.6;
      a.flee = dir.normalize(); a.fleeT = 0;
      if (a.rig.itemType !== 'none') clearItem(a.rig);
    }
    if (this.rng() < 0.7) g.audio.shout(sc.centre);
  }

  // shared actor movement: running off when scattered, otherwise holding the spot
  _moveActor(a, dt) {
    if (a.flee) {
      a.fleeT += dt;
      const sp = Math.min(5, 1 + a.fleeT * 6);
      a.pos.addScaledVector(a.flee, sp * dt);
      this.game.world.resolveCircle(a.pos, 0.3);
      a.heading = Math.atan2(a.flee.x, a.flee.z);
      if (a.fleeT > 5) a.gone = true;
      return sp;
    }
    a.gone = false;
    return 0;
  }

  _fight(sc, dt, t) {
    const g = this.game, v = sc.victim;
    // the person on the ground: curled up, jolted by each blow; a rescued officer sits up
    {
      const P = newPose();
      baseLayer(P, v.rig, 0, t, dt);
      if (sc.state === 'scattered' && sc.type === 'stomp') {
        P.hpLX = P.hpRX = -1.5; P.knL = 0.2; P.knR = 1.2; P.y = -0.62; P.spX = -0.3; P.shLX = -0.4; P.shLZ = 0.4; P.hdX = 0.2;
      } else {
        lying(P, -1, 1, t);
        v.flinch = Math.max(0, (v.flinch || 0) - dt);
        const k = Math.min(1, 0.55 + v.flinch * 2), j = Math.sin(v.flinch * 40) * 0.1 * Math.min(1, v.flinch * 3);
        P.knL = P.knR = 1.25 * k; P.hpLX = P.hpRX = -1.0 * k; P.shLX = P.shRX = -2.3 * k; P.elL = P.elR = -2.0 * k;
        P.shLZ = 0.3 * k; P.shRZ = -0.3 * k; P.spX = 0.3 * k + j; P.hdX = 0.4 * k;
        P.mouth = 0.4 + v.flinch; P.brow = -1;
      }
      if (v.police) { updateShield(v.rig, 0); if (v.rig.shield) v.rig.shield.visible = false; }
      applyPose(v.rig, P, dt, 16);
      v.rig.root.position.set(v.pos.x, 0.1, v.pos.z);
      v.rig.root.rotation.y = v.heading;
    }
    for (const a of sc.actors) {
      const sp = this._moveActor(a, dt);
      const P = newPose();
      baseLayer(P, a.rig, sp, t, dt);
      if (!a.flee) {
        // a blow every ~0.9 s, each attacker on their own rhythm
        const rate = a.style === 'baton' ? 1.2 : 1.05;
        const cyc = (sc.t * rate + a.ph) % 1.6, ph = cyc / 1.6;
        const wind = ph < 0.45, k = wind ? ph / 0.45 : ph < 0.6 ? 1 - (ph - 0.45) / 0.15 : 0;
        if (a.style === 'baton') {
          if (wind) { P.shRX = -2.6 * k; P.shRZ = -0.45 * k; P.elR = -1.35 * k; P.spY = -0.4 * k; }
          else if (ph < 0.6) { P.shRX = -0.4; P.shRZ = 0.3; P.elR = -0.15; P.spY = 0.45; P.spX = 0.45; P.hpLX = -0.4; P.knL = 0.35; }
          else { P.shRX = -0.5; P.elR = -0.6; P.spX = 0.2; }
          P.shLX = -1.1; P.elL = -0.6; // shield arm held out
          updateShield(a.rig, 0.6);
        } else if (a.style === 'stomp') {
          if (wind) { P.hpRX = -1.25 * k; P.knR = 1.5 * k; P.spX = -0.1; }
          else if (ph < 0.6) { P.hpRX = -0.3; P.knR = 0.1; P.spX = 0.25; P.y = -0.03; }
          P.shLX = -0.5; P.shRX = -0.3; P.elL = P.elR = -1.1; P.shLZ = -0.3; P.shRZ = 0.3;
        } else {
          if (wind) { P.hpRX = 0.55 * k; P.knR = 0.9 * k; P.spX = 0.08; }
          else if (ph < 0.6) { P.hpRX = -0.85; P.knR = 0.15; P.spX = -0.15; }
          P.shLX = -0.4; P.shRX = -0.6; P.elL = P.elR = -1.2;
        }
        P.mouth = 0.4 + 0.4 * Math.sin(t * 9 + a.ph * 5); P.brow = 1;
        const hc = Math.floor((sc.t * rate + a.ph) / 1.6); // one blow lands per cycle, just after the wind-up
        if (hc !== a.hitCyc && ph > 0.47) {
          a.hitCyc = hc;
          sc.victim.flinch = 0.45;
          if (sc.centre.distanceTo(g.player.pos) < 40) {
            g.audio.impact(sc.centre, false);
            if (this.rng() < 0.18) g.audio.shout(sc.centre, true);
          }
        }
      }
      applyPose(a.rig, P, dt, 18);
      a.rig.root.position.set(a.pos.x, 0, a.pos.z);
      a.rig.root.rotation.y = a.heading;
    }
  }

  _smash(sc, dt, t) {
    const g = this.game;
    for (const a of sc.actors) {
      const sp = this._moveActor(a, dt);
      const P = newPose();
      baseLayer(P, a.rig, sp, t, dt);
      if (!a.flee) {
        const cyc = (sc.t * 1.5 + a.ph) % 1, k = Math.sin(cyc * Math.PI * 2);
        if (a.style === 'kick') {
          const kk = Math.max(0, k);
          P.hpRX = -1.3 * kk; P.knR = 0.9 * (1 - kk) + 0.2; P.spX = -0.15 * kk; P.shLX = -0.6; P.shRX = -0.4; P.elL = P.elR = -1.2;
        } else {
          P.shRX = -1.9 - k * 0.9; P.elR = -0.6 - Math.max(0, k) * 0.8; P.spY = -0.25 * k; P.spX = 0.1 + 0.15 * Math.max(0, -k); P.shLX = -0.9; P.elL = -1.2;
        }
        P.mouth = 0.35 + 0.4 * Math.max(0, Math.sin(t * 7 + a.ph * 3)); P.brow = 1;
        const hc = Math.floor(sc.t * 1.5 + a.ph - 0.25);
        if (hc !== a.hitCyc) {
          a.hitCyc = hc;
          sc.hits++;
          const at = sc.glassAt.clone(); at.z += (a.pos.z - sc.z) * 0.8;
          const near = sc.centre.distanceTo(g.player.pos) < 45;
          if (sc.hits % 7 === 0) {
            // a pane gives way: shards across the pavement
            if (near) g.audio.glass(at, 0.9);
            for (let i = 0; i < 14; i++) g.effects.fire.spawn({ pos: at.clone(), vel: V(-sc.side * (1 + this.rng() * 3), this.rng() * 2.5, (this.rng() - 0.5) * 4), size: 0.045, life: 0.6, alpha: 1, color: GLASS, grav: 12, drag: 0.4, frame: 3 });
            g.effects.dust(at, 4);
          } else if (near && this.rng() < 0.5) g.audio.glass(at, 0.35);
          else if (near) g.audio.shutter(at);
        }
      }
      applyPose(a.rig, P, dt, 16);
      a.rig.root.position.set(a.pos.x, 0, a.pos.z);
      a.rig.root.rotation.y = a.heading;
    }
  }
}
