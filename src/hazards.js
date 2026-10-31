// Level 3 · environmental hazards. Each runs armed -> telegraph -> active -> spent, and
// every telegraph has a ground decal, a sound and a HUD warning, and lasts at least 1 s:
//  cookoff   a burning car's tank goes up (6.5 s tell): blast falling to 0 at its radius
//  trail     a petrol trail across the Passage, lit by a crew member (2.2 s tell, strike him
//            first): a wall of fire for 8 s
//  scaffold  a scaffold over the Passage pavement gives way (1.2 s tell): debris, then rubble
//  fireworks a crew member fires mortars into the rally (1 s tell): bursts, low smoke and a
//            panicked surge across the square
// Damage to the officer never exceeds 24 in one hit and only reaches someone standing in
// the marked area when the tell ends, so it can always be avoided. Crew members caught in a
// blast or a collapse go down; peaceful people are warned off by the tell and never hurt.
// Built from the existing particle pools, pooled lights and shared materials only: no light,
// no material and no shader program is added.
import * as THREE from 'three';
import { getShared, giveItem, clearItem } from './characters.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const C = (r, g, b) => new THREE.Color(r, g, b);
export const HAZARD = { blastMax: 24, scaffoldDmg: 18, takedown: 150, lureR: 15 };

export class HazardDirector {
  constructor(game) {
    this.game = game;
    const { G, M } = getShared();
    // decals: the amber threat ring's own geometry and material, scaled per hazard
    this.decals = [0, 1, 2].map(() => { const m = new THREE.Mesh(G.ring, M.ringBlue); m.renderOrder = 2; m.visible = false; game.scene.add(m); return m; });
    // the wet sheen of a petrol trail: the puddles' material
    const wet = new THREE.PlaneGeometry(1, 1); wet.rotateX(-Math.PI / 2);
    this.sheen = new THREE.Mesh(wet, game.world.puddleMat); this.sheen.renderOrder = 1; this.sheen.visible = false; game.scene.add(this.sheen);
    // rubble left by the scaffold (merged world materials)
    this.rubble = new THREE.Group(); this.rubble.visible = false; game.scene.add(this.rubble);
    const mats = game.world.materials;
    for (let i = 0; i < 9; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(i % 3 ? 1.6 : 0.08, i % 3 ? 0.06 : 0.08, i % 3 ? 0.35 : 2.4), i % 3 ? mats.wood : mats.metal);
      b.position.set(((i * 37) % 10) / 10 - 0.5, 0.1 + (i % 4) * 0.08, (i - 4) * 0.5); b.rotation.set(0, (i * 1.7) % 3, (i % 2 ? 0.25 : -0.15));
      b.castShadow = true; this.rubble.add(b);
    }
    this.list = [];
    this.rubbleCol = null;
  }

  dispose() {
    this.reset();
    for (const m of [...this.decals, this.sheen, this.rubble]) this.game.scene.remove(m);
  }

  reset() {
    for (const h of this.list) if (h.fire) this.game.effects.removeFire(h.fire);
    this.list = [];
    for (const d of this.decals) d.visible = false;
    this.sheen.visible = false;
    this.rubble.visible = false;
    if (this.rubbleCol) { this.game.world.removeCollider(this.rubbleCol); this.rubbleCol = null; }
    this.log = []; // [t, id, state] for the tests
    this.warning = null;
  }

  // def: { id, kind, ... } (see the kinds above); returns the hazard
  add(def) {
    const h = { state: 'armed', t: 0, ...def };
    this.list.push(h);
    if (h.kind === 'trail') this._sheen(h, true);
    this._log(h);
    return h;
  }
  get(id) { return this.list.find((h) => h.id === id); }
  _log(h) { this.log.push([+this.game.missions.t.toFixed(2), h.id, h.state]); }
  _set(h, state) { h.state = state; h.t = 0; this._log(h); }

  // places the van must not drive into: telegraphs, live fire, an unlit trail (near: only its
  // next two metres are checked)
  zones() {
    const out = [];
    for (const h of this.list) {
      if (h.kind === 'cookoff' && h.state === 'telegraph') out.push({ x: h.pos[0], z: h.pos[1], r: h.r + 1 });
      // an armed car: the van never pulls up beside it (checked at its nose only, so it can still come close)
      else if (h.kind === 'cookoff' && h.state === 'armed') out.push({ x: h.pos[0], z: h.pos[1], r: h.r + 1, near: true });
      if (h.kind === 'trail' && h.state !== 'spent') out.push({ x: (h.x0 + h.x1) / 2, z: h.z, r: (h.x1 - h.x0) / 2 + 1, kind: 'trail' });
    }
    return out;
  }

  update(dt) {
    const g = this.game, p = g.player.pos;
    this.warning = null;
    let decal = 0;
    for (const h of this.list) {
      h.t += dt;
      if (h.kind === 'cookoff') this._cookoff(h, dt, p);
      else if (h.kind === 'trail') this._trail(h, dt);
      else if (h.kind === 'scaffold') this._scaffold(h, dt, p);
      else if (h.kind === 'fireworks') this._fireworks(h, dt);
      // decals for every telegraph (at most three at once)
      if (h.state === 'telegraph' && decal < this.decals.length && h.kind !== 'fireworks') {
        const d = this.decals[decal++], k = 1 + Math.sin(h.t * 9) * 0.04;
        if (h.kind === 'cookoff') { d.position.set(h.pos[0], g.world.groundHeight(h.pos[0], h.pos[1]) + 0.02, h.pos[1]); d.scale.set((h.r * 2 / 1.4) * k, 1, (h.r * 2 / 1.4) * k); }
        else if (h.kind === 'scaffold') { d.position.set((h.x0 + h.x1) / 2, 0.16, h.zc); d.scale.set(((h.x1 - h.x0) + 1) / 1.4 * k, 1, (h.len + 1) / 1.4 * k); }
        else if (h.kind === 'trail') { d.position.set((h.x0 + h.x1) / 2, 0.03, h.z); d.scale.set((h.x1 - h.x0) / 1.4 * k, 1, 3 / 1.4 * k); }
        d.visible = true;
      }
    }
    for (let i = decal; i < this.decals.length; i++) this.decals[i].visible = false;
  }

  // ---------------------------------------------------------------- the cook-off car
  _cookoff(h, dt, p) {
    const g = this.game, pos = V3(h.pos[0], 0, h.pos[1]), van = g.missions.van;
    if (h.state === 'armed') {
      const vd = van && van.group.visible ? van.pos.distanceTo(pos) : 1e9;
      if (h.go || ((!h.ready || h.ready()) && (vd < h.triggerVan || p.distanceTo(pos) < h.triggerPlayer))) {
        this._set(h, 'telegraph');
        g.audio.hiss(pos, h.telegraph);
        g.audio.hazardWarn(pos);
        g.hud.alert('That car\'s going to blow — get clear!', 'warn', 3);
        g.crowd.disturb(pos, h.r + 8, 0.9, 'explosion'); // bystanders leave before it goes
        for (const f of g.world.fires) if (f.pos.distanceTo(V3(pos.x, f.pos.y, pos.z)) < 3) { f.boost = 2.2; f.boostT = h.telegraph; }
        if (h.onTelegraph) h.onTelegraph();
      }
    } else if (h.state === 'telegraph') {
      if (p.distanceTo(pos) < h.r + 10) this.warning = '⚠ CAR ABOUT TO BLOW';
      if (Math.random() < dt * (6 + h.t * 3)) g.effects.fire.spawn({ pos: V3(pos.x + (Math.random() - 0.5), 0.9, pos.z + (Math.random() - 0.5)), vel: V3((Math.random() - 0.5) * 2, 2 + Math.random() * 2, (Math.random() - 0.5) * 2), size: 0.25 + Math.random() * 0.2, life: 0.5, alpha: 1, color: C(1, 0.8, 0.4), color2: C(0.8, 0.2, 0.02), drag: 1.2, buoy: 2 });
      if (h.t >= h.telegraph) this._blast(h, pos);
    }
  }

  _blast(h, pos) {
    const g = this.game, p = g.player.pos, at = pos.clone().setY(0.6);
    this._set(h, 'spent');
    g.effects.explosion(at, 1.1);
    g.audio.explosion(at, 1.1);
    g.crowd.disturb(pos, 24, 1.0, 'explosion');
    const pd = Math.hypot(p.x - pos.x, p.z - pos.z);
    g.cameraRig.shake(Math.max(0, 0.7 - pd * 0.03));
    if (pd < h.r) { h.dealt = g.player.takeDamage(HAZARD.blastMax * (1 - pd / h.r), pos, V3(p.x - pos.x, 0, p.z - pos.z).normalize().multiplyScalar(5)); }
    if (g.missions.van) h.vanDealt = g.missions.van.blast(pos, h.r + 0.5);
    h.takedowns = this._takedown((n) => Math.hypot(n.pos.x - pos.x, n.pos.z - pos.z) < h.r, pos, pd < HAZARD.lureR);
    h.fire = g.effects.addFire(pos.clone().setY(1.0), 1.3, 2.2);
  }

  // crew members caught by a hazard go down (neutralised); +150 each when the officer was close
  // enough to have drawn them in. Nobody else is touched.
  _takedown(inside, from, lured) {
    const g = this.game, crowd = g.crowd;
    let n0 = 0;
    for (const n of crowd.npcs) {
      if (n.state === 'gone' || n.neutralized || n.arrested || n.special || n.temperament !== 'hostile' || !inside(n)) continue;
      n.knock.set(n.pos.x - from.x, 0, n.pos.z - from.z).normalize().multiplyScalar(5);
      crowd.setState(n, 'down', 4.5 + Math.random() * 1.5);
      n.neutralized = true; n.fallDir = -1; clearItem(n.rig);
      if (n.script && n.script.onHit) n.script.onHit(n);
      g.onThreatNeutralized(n);
      if (lured) g.missions.addScore(HAZARD.takedown, 'Hazard takedown');
      if (g.missions.stats.hazardTakedowns !== undefined) g.missions.stats.hazardTakedowns++;
      n0++;
    }
    return n0;
  }

  // ---------------------------------------------------------------- the petrol trail
  _sheen(h, on) {
    const s = this.sheen;
    s.visible = on;
    if (on) { s.position.set((h.x0 + h.x1) / 2, 0.02, h.z); s.scale.set(h.x1 - h.x0, 1, 1.6); }
  }

  // the igniter's script calls light() when his tell starts and fire() if it completes
  _trail(h, dt) {
    const g = this.game;
    if (h.state === 'telegraph') {
      this.warning = '⚠ PETROL TRAIL';
      if (h.t >= h.telegraph) this._ignite(h);
    } else if (h.state === 'active') {
      if (h.t >= h.life) { this._set(h, 'spent'); this._sheen(h, false); }
    }
    void g;
  }
  lightTrail(h) { if (h.state === 'armed') { this._set(h, 'telegraph'); this.game.hud.alert('He\'s lighting the petrol — stop him!', 'warn', 2.5); } }
  // struck in time, or he was never there: the trail stays cold and is cleared
  defuseTrail(h, prevented) {
    if (h.state !== 'armed' && h.state !== 'telegraph') return;
    this._set(h, 'spent'); this._sheen(h, false); h.prevented = prevented;
    if (prevented) this.game.hud.alert('Fire trap prevented', 'good', 2.5);
  }
  _ignite(h) {
    const g = this.game, van = g.missions.van;
    this._set(h, 'active');
    for (let x = h.x0 + 0.6; x <= h.x1 - 0.5; x += (h.x1 - h.x0 - 1.1) / 4) {
      g.effects.ignite(V3(x, 0, h.z), 1.4, h.life);
      if (van) van.pools.push(g.effects.flames[g.effects.flames.length - 1]); // the crew's fire: it counts if the van is in it
    }
    g.audio.molotov(V3((h.x0 + h.x1) / 2, 0, h.z), 1.0);
    g.crowd.disturb(V3((h.x0 + h.x1) / 2, 0, h.z), 14, 0.9, 'explosion');
    g.hud.alert('The lane is on fire — wait it out or go round', 'warn', 3);
  }

  // ---------------------------------------------------------------- the scaffold
  _scaffold(h, dt, p) {
    const g = this.game, crowd = g.crowd;
    const under = (q) => q.x > h.x0 && q.x < h.x1 && q.z > h.z0 && q.z < h.z1;
    if (h.state === 'armed') {
      let at = under(p) ? p.z : null;
      h.lureT = h.lureT || 0;
      if (at === null && p.distanceTo(V3((h.x0 + h.x1) / 2, 0, (h.z0 + h.z1) / 2)) < HAZARD.lureR + 8) {
        const n = crowd.npcs.find((o) => o.state !== 'gone' && !o.neutralized && o.temperament === 'hostile' && under(o.pos));
        h.lureT = n ? h.lureT + dt : 0;
        if (n && h.lureT > 1) { at = n.pos.z; h.byCrew = true; }
      }
      if (at !== null) {
        h.zc = Math.max(h.z0 + h.len / 2, Math.min(h.z1 - h.len / 2, at));
        this._set(h, 'telegraph');
        const c = V3((h.x0 + h.x1) / 2, 3, h.zc);
        g.audio.creak(c);
        g.audio.hazardWarn(c);
        g.hud.alert('The scaffolding is giving way!', 'warn', 2.2);
        crowd.disturb(c.setY(0), 7, 0.8, 'explosion');
      }
    } else if (h.state === 'telegraph') {
      this.warning = '⚠ SCAFFOLD';
      if (Math.random() < dt * 25) g.effects.smoke.spawn({ pos: V3(h.x0 + Math.random() * (h.x1 - h.x0), 8 + Math.random() * 3, h.zc + (Math.random() - 0.5) * h.len), vel: V3(0, -3, 0), size: 0.25, grow: 2, life: 1.2, alpha: 0.35, color: C(0.6, 0.57, 0.52), drag: 0.3 });
      if (h.t >= h.telegraph) this._collapse(h, p);
    }
  }

  _collapse(h, p) {
    const g = this.game, cx = (h.x0 + h.x1) / 2, c = V3(cx, 0, h.zc);
    this._set(h, 'spent');
    const inside = (q) => q.x > h.x0 - 0.3 && q.x < h.x1 + 0.3 && Math.abs(q.z - h.zc) < h.len / 2 + 0.3;
    for (let k = 0; k < 4; k++) g.effects.spawnDebris(V3(cx, 6 + k * 1.5, h.zc + (k - 1.5) * 1.2), 6, 3);
    for (let k = 0; k < 3; k++) g.effects.dust(V3(cx, 0.3, h.zc + (k - 1) * 1.8), 12, 0x9a948a);
    g.audio.crash(c, 1.4);
    g.cameraRig.shake(Math.max(0, 0.5 - p.distanceTo(c) * 0.03));
    if (inside(p)) h.dealt = g.player.takeDamage(HAZARD.scaffoldDmg, c.clone().setY(4), null);
    // bystanders under it are only pushed clear
    for (const n of g.crowd.npcs) if (n.state !== 'gone' && n.temperament !== 'hostile' && inside(n.pos)) n.knock.set(n.pos.x < cx ? -3 : -3, 0, 0);
    h.takedowns = this._takedown((n) => inside(n.pos), c, !!h.byCrew && p.distanceTo(c) < HAZARD.lureR);
    this.rubble.position.set(cx, 0.14, h.zc); this.rubble.visible = true;
    this.rubbleCol = g.world.addCollider(h.x0, h.zc - h.len / 2, h.x1, h.zc + h.len / 2, 0.8, 'rubble');
  }

  // ---------------------------------------------------------------- fireworks into the rally
  // The firer's script calls fireworks(h) when he has knelt at his tube for the tell.
  _fireworks(h, dt) {
    const g = this.game;
    if (h.state === 'telegraph') {
      this.warning = '⚠ FIREWORKS';
      if (h.t >= h.telegraph) this._launch(h);
    } else if (h.state === 'active') {
      // low smoke drifting over the lanes: thin enough that the rings and silhouettes still read
      if (h.t < h.smokeS && Math.random() < dt * 6) g.effects.smoke.spawn({ pos: V3(h.lane[0] + Math.random() * (h.lane[2] - h.lane[0]), 0.6 + Math.random(), h.lane[1] + Math.random() * (h.lane[3] - h.lane[1])), vel: V3(0.6 + Math.random() * 0.6, 0.15, (Math.random() - 0.5) * 0.4), size: 1.4 + Math.random(), grow: 3, life: 6 + Math.random() * 3, alpha: 0.12, color: C(0.62, 0.6, 0.6), drag: 0.5, windK: 0.8, fadeIn: 0.5 });
      if (h.t >= h.smokeS) this._set(h, 'spent');
    }
  }
  primeFireworks(h) {
    if (h.state !== 'armed') return;
    this._set(h, 'telegraph');
    const at = V3(h.at[0], 0, h.at[1]);
    this.game.audio.whistle(at);
    this.game.hud.alert('Fireworks — he\'s aiming into the rally!', 'warn', 2.5);
  }
  _launch(h) {
    const g = this.game, from = V3(h.at[0], 0.3, h.at[1]);
    this._set(h, 'active');
    for (let i = 0; i < 3; i++) {
      g.events.later(i * 0.45, () => {
        const to = V3(h.over[0] + (i - 1) * 5, 9 + i * 2, h.over[1] + (i % 2 ? 4 : -3));
        g.audio.thump(from);
        g.effects.mortar(from, to, (pos) => { g.audio.firework(pos); g.crowd.disturb(pos.clone().setY(0), 26, 1.0, 'explosion'); });
      });
    }
    // the rally panics: people run east across the square (Missions' surge steering, across x)
    const crowd = g.crowd, [x0, z0, x1, z1] = h.from;
    const runners = crowd.npcs.filter((n) => n.temperament === 'peaceful' && !n.script && !n.arrested && !n.surge && n.state !== 'gone' && n.state !== 'down' && n.pos.x > x0 && n.pos.x < x1 && n.pos.z > z0 && n.pos.z < z1).slice(0, h.count);
    runners.forEach((n, i) => {
      n.march = null; n.vel.set(0, 0, 0);
      n.surge = { dir: V3(1, 0, 0), speed: 2.2 + (i % 5) * 0.15, laneZ: h.lane[1] + ((i * 7) % 10) / 10 * (h.lane[3] - h.lane[1]), endX: h.endX };
      crowd.setState(n, 'surge');
    });
    h.runners = runners;
    h.fired = true;
  }
  surgeLive(h) { return !!h.runners && h.runners.some((n) => n.surge); }
}

// The igniter: walks to the end of the trail and lights it (the bomber's lighting pose, 2.2 s).
// Struck before the flame reaches the petrol, the trail stays cold. Then he fights as a crew member.
export function igniterScript(game, dir, h, n) {
  const crowd = game.crowd, spot = V3(h.lightAt[0], 0, h.lightAt[1]);
  const sc = {
    active: true, marked: true, amber: false, phase: 'walk',
    tick(m) {
      m.lastAggro = crowd.time;
      const down = m.neutralized || m.arrested || ['stagger', 'down', 'recover'].includes(m.state);
      if (down && (sc.phase === 'walk' || sc.phase === 'wait' || sc.phase === 'light')) {
        dir.defuseTrail(h, sc.phase === 'light' || m.neutralized); clearItem(m.rig);
        sc.done(m); return;
      }
      if (sc.phase === 'walk' && Math.hypot(m.pos.x - spot.x, m.pos.z - spot.z) < 0.8) { sc.phase = 'wait'; m.focus.set(h.x1, 0, h.z); crowd.setState(m, 'act', 99); }
      // he waits at the petrol until the officer comes within reach: there is time to stop him
      if (sc.phase === 'wait' && m.distToPlayer < (h.lightWithin || 12)) {
        sc.phase = 'light'; sc.amber = true; m.focus.set(h.x1, 0, h.z);
        giveItem(m.rig, 'bottle'); crowd.setState(m, 'bomb_light', h.telegraph + 0.2);
        game.audio.lighter(m.pos); game.audio.hazardWarn(m.pos); dir.lightTrail(h);
      } else if (sc.phase === 'light') {
        if (m.rig.wick && Math.random() < 0.7) { const q = V3(); m.rig.wick.getWorldPosition(q); game.effects.fire.spawn({ pos: q, vel: V3(0, 0.8, 0), size: 0.16, life: 0.25, alpha: 1, color: C(1, 0.75, 0.3), color2: C(0.9, 0.2, 0), drag: 1 }); }
        if (h.state === 'active') { clearItem(m.rig); sc.done(m); }
      } else if (sc.phase === 'walk' && m.state !== 'pursue') crowd.setState(m, 'pursue');
    },
    done(m) { sc.active = sc.marked = sc.amber = false; sc.phase = 'done'; m.script = null; if (!m.neutralized && m.temperament === 'hostile' && !['down', 'recover', 'stagger'].includes(m.state)) crowd.setState(m, 'pursue'); },
    move(m) { return sc.phase === 'walk' && !['stagger', 'down', 'recover'].includes(m.state) ? { speed: 3.6 * m.speedMul, dest: spot } : sc.phase === 'light' || sc.phase === 'wait' ? { speed: 0 } : null; },
  };
  n.script = sc;
  return sc;
}

// The firer: runs to his mortar tube, kneels (the tell), launches three into the rally, then fights.
export function firerScript(game, dir, h, n) {
  const crowd = game.crowd, spot = V3(h.at[0], 0, h.at[1]);
  const sc = {
    active: true, marked: true, amber: false, phase: 'walk',
    tick(m) {
      m.lastAggro = crowd.time;
      const down = m.neutralized || m.arrested || ['stagger', 'down', 'recover'].includes(m.state);
      if (down && sc.phase === 'walk') { h.stopped = true; sc.done(m); return; }
      if (sc.phase === 'walk' && Math.hypot(m.pos.x - spot.x, m.pos.z - spot.z) < 0.9) {
        sc.phase = 'kneel'; sc.amber = true; m.focus.set(h.over[0], 0, h.over[1]);
        crowd.setState(m, 'throw_prep', h.telegraph + 0.3); dir.primeFireworks(h);
      } else if (sc.phase === 'kneel' && (h.state === 'active' || h.state === 'spent')) sc.done(m);
      else if (sc.phase === 'walk' && m.state !== 'pursue') crowd.setState(m, 'pursue');
    },
    done(m) { sc.active = sc.marked = sc.amber = false; sc.phase = 'done'; m.script = null; if (!m.neutralized && m.temperament === 'hostile' && !['down', 'recover', 'stagger'].includes(m.state)) crowd.setState(m, 'pursue'); },
    move(m) { return sc.phase === 'walk' && !['stagger', 'down', 'recover'].includes(m.state) ? { speed: 4.2 * m.speedMul, dest: spot } : sc.phase === 'kneel' ? { speed: 0 } : null; },
  };
  n.script = sc;
  return sc;
}
