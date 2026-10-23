// Crowd simulation: per-agent state machines, perception with reaction delays,
// panic contagion, steering/avoidance, spatial hashing and distance-based LOD.
import * as THREE from 'three';
import { buildCharacter, randomOutfit, policeOutfit, giveItem, clearItem, newPose, baseLayer, applyPose, crouch, lying, setRingVisible, addPoliceGear, updateShield } from './characters.js';
import { mulberry } from './textures.js';
import { LAYOUT } from './world.js';
import { Humans } from './humans.js';
import { FarCrowd, outfitColors } from './impostors.js';

const LOD_FAR = 34;   // beyond this, agents are drawn as instanced impostors
const LOD_MID = 20;   // beyond this, skeletal animation runs at a reduced rate
const MAX_SKINNED = 20; // hard cap on fully rigged agents drawn at once

const V = () => new THREE.Vector3();
const tmp = V(), tmp2 = V();
const AGGRO_STATES = new Set(['pursue', 'atk_wind', 'atk_strike', 'atk_rec', 'circle', 'throw_prep', 'throw_wind', 'throw_rel', 'bomb_retrieve', 'bomb_light', 'bomb_wind', 'bomb_throw']);
const DISABLED = new Set(['stagger', 'down', 'recover', 'arrested']);

function angleLerp(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}
function headingTo(from, to) { return Math.atan2(to.x - from.x, to.z - from.z); }

// Looting crews work shop fronts along the boulevard: [side, z]. Each crew
// breaks into a shop, carries goods off, sets it alight and moves on.
const LOOT_SITES = [[-1, 98], [1, 92], [-1, 40], [1, 12], [-1, -52], [1, -78], [-1, -138], [1, -142]];
const CREW_SIZE = 4;
const CIVILIANS = 16;
const CROSS = LAYOUT.crossStreets;

const ACTIVITIES = [
  ['chant', 0.17], ['flag', 0.19], ['bigflag', 0.09], ['placard', 0.13], ['film', 0.09], ['banner', 0.04], ['shout', 0.07], ['wander', 0.07], ['clap', 0.05], ['watch', 0.06], ['photo', 0.04],
];

export class Crowd {
  constructor(game, count = 52) {
    this.game = game;
    this.world = game.world;
    this.scene = game.scene;
    this.rng = mulberry(4242);
    this.npcs = [];
    this.police = [];
    this.grid = new Map();
    this.time = 0;
    this.count = count;
    this.maxSkinned = MAX_SKINNED;
    for (let i = 0; i < count; i++) this._spawn(randomOutfit(this.rng));
    // looting crews, and passers-by caught up in the violence
    this.crews = LOOT_SITES.map(([side, z], i) => ({ id: i, side, z0: z, home: z, door: V(), rally: V(), members: [] }));
    for (const c of this.crews) for (let k = 0; k < CREW_SIZE; k++) { const n = this._spawn(randomOutfit(this.rng)); n.kind = 'looter'; n.crew = c; c.members.push(n); }
    for (let k = 0; k < CIVILIANS; k++) this._spawn(randomOutfit(this.rng)).kind = 'civilian';
    // far-distance instanced crowd (distant agents + background population)
    if (Humans.ready) {
      this.far = new FarCrowd(this.scene, 640);
      this._buildBackground();
      if (this.world.impostors) this.world.impostors.mesh.visible = false;
    }
    // friendly CRS line + cut-off officers for incident 3
    const positions = [];
    for (let x = -9; x <= 9; x += 2.6) if (Math.abs(x - 0.4) > 1.5) positions.push([x, 125.5, 'line']);
    positions.push([-3.2, -114.5, 'injured'], [-1.6, -113.6, 'guard'], [-4.6, -113.2, 'guard'], [-6.2, -112.4, 'guard']);
    // CRS squads by the vans and along the pavement
    positions.push([-11, 132.5, 'squad'], [-12.6, 134, 'squad'], [11.2, 132.5, 'squad'], [12.6, 134.2, 'squad'], [-3.5, 139.5, 'squad'], [4.8, 140.5, 'squad']);
    for (const [x, z, role] of positions) {
      const rig = buildCharacter(this.world, policeOutfit(this.rng), 'police');
      addPoliceGear(rig);
      this.scene.add(rig.root);
      this.police.push({ rig, pos: new THREE.Vector3(x, 0, z), heading: role === 'line' ? Math.PI : 0, role, flinch: 0, hp: 1 });
    }
    this.reset();
  }

  _spawn(outfit) {
    const rig = buildCharacter(this.world, outfit, 'civ');
    this.scene.add(rig.root);
    const n = { id: this.npcs.length, rig, outfit, pos: V(), vel: V(), knock: V(), anchor: V(), target: V(), focus: V(), stimuli: [], colors: Humans.ready ? outfitColors(outfit) : null };
    this.npcs.push(n);
    return n;
  }

  pickActivity() {
    let r = this.rng(), acc = 0;
    for (const [a, w] of ACTIVITIES) { acc += w; if (r < acc) return a; }
    return 'chant';
  }

  reset() {
    this.time = 0;
    const gps = this.world.gatherPoints;
    this.lastScream = -9;
    for (const c of this.crews) { c.z0 = c.home; this._placeCrew(c); c.burns = 0; c.burnT = 8 + this.rng() * 25; }
    this.npcs.forEach((n, i) => {
      // first third clusters near the police line so the player starts with a crowd in view
      const gp = i < 34 ? gps[i % 3] : gps[3 + (i % (gps.length - 3))];
      n.anchor.set(gp.x + (this.rng() - 0.5) * (i < 34 ? 16 : 9), 0, gp.z + (this.rng() - 0.5) * (i < 34 ? 12 : 9));
      if (this.world.blocked(n.anchor.x, n.anchor.z, 0.4)) n.anchor.set(gp.x, 0, gp.z);
      n.pos.copy(n.anchor);
      n.vel.set(0, 0, 0); n.knock.set(0, 0, 0);
      n.heading = this.rng() * 6.28;
      n.group = gps.indexOf(gp);
      n.temperament = 'peaceful';
      n.attackStyle = null;
      n.role = this.pickActivity();
      n.state = 'act'; n.st = 0; n.dur = 4 + this.rng() * 8;
      n.fear = 0; n.courage = 0.45 + this.rng() * 0.5;
      n.stimuli.length = 0;
      n.hp = 2; n.threat = false; n.lastAggro = -99; n.neutralized = false; n.arrested = false; n.surrendered = false;
      n.speedMul = 0.85 + this.rng() * 0.3;
      n.thinkT = this.rng() * 0.3; n.animAcc = 0; n.cool = 0; n.targetRef = null;
      n.script = null; n.surge = null; n.hitCount = 0; n.fallDir = -1;
      n.radius = 0.32; n.mass = 1;
      if ((n.role === 'watch' || n.role === 'photo') && Math.abs(n.anchor.x) < 9.5 && Math.abs(n.anchor.z) < 170) {
        const sx = (n.anchor.x >= 0 ? 1 : -1) * (10.8 + this.rng() * 2.6);
        if (!this.world.blocked(sx, n.anchor.z, 0.4)) { n.anchor.x = sx; n.pos.copy(n.anchor); }
      }
      n.rig.root.visible = true;
      n.rig.pose = newPose();
      setRingVisible(n.rig, false);
      if (n.kind === 'looter') this._resetLooter(n);
      else if (n.kind === 'civilian') this._resetCivilian(n);
      else this.equip(n);
    });
    for (const p of this.police) { p.flinch = 0; p.hp = 1; p.rig.root.position.copy(p.pos); p.rig.root.rotation.y = p.heading; }
    this._makeMarches();
  }

  equip(n) {
    const map = { flag: 'flag', bigflag: 'bigflag', placard: 'placard', film: 'phone', banner: 'banner', photo: 'camera' };
    // flags carried in the demonstrations: Palestinian, Algerian, French and red union flags;
    // gilets jaunes mostly carry the tricolore
    const f = this.rng();
    // (weighted after the reference photos: Palestinian flags dominate, then Algerian)
    const variant = n.outfit.vest && f < 0.7 ? 'fr' : f < 0.55 ? 'pal' : f < 0.78 ? 'alg' : f < 0.9 ? 'fr' : 'uni';
    if (map[n.role]) giveItem(n.rig, map[n.role], this.rng, variant);
    else if (n.role === 'chant' && this.rng() < 0.25) { n.role = 'flag'; giveItem(n.rig, 'flag', this.rng, variant); }
    else clearItem(n.rig);
  }

  // ------------------------------------------------------------------ looters
  // Find a reachable spot in front of a shop near the crew's z, plus a rally
  // point on the pavement where the crew gathers between break-ins.
  _placeCrew(c) {
    const inStreet = (z) => CROSS.some((s) => Math.abs(z - s.z) < s.half + 3);
    c.z0 = Math.max(-150, Math.min(108, c.z0));
    for (let i = 0; i < 6 && inStreet(c.z0); i++) c.z0 += c.z0 > c.home ? 6 : -6;
    c.damage = 0; c.broken = false;
    for (let dz = 0; dz < 14; dz += 1.5) for (const sg of [1, -1]) {
      const z = c.z0 + dz * sg;
      if (inStreet(z)) continue;
      for (let x = 14.6; x > 11; x -= 0.4) {
        if (this.world.blocked(c.side * x, z, 0.35)) continue;
        c.door.set(c.side * x, 0, z);
        const rz = z + (this.rng() < 0.5 ? -3 : 3);
        c.rally.set(c.side * 11.2, 0, this.world.blocked(c.side * 11.2, rz, 0.4) ? z : rz);
        return;
      }
    }
    c.door.set(c.side * 12, 0, c.z0); c.rally.set(c.side * 10.5, 0, c.z0);
  }

  _rallySpot(n) {
    const c = n.crew;
    n.anchor.set(c.rally.x + (this.rng() - 0.5) * 2.4, 0, c.rally.z + (this.rng() - 0.5) * 3);
    if (this.world.blocked(n.anchor.x, n.anchor.z, 0.4)) n.anchor.copy(c.rally);
  }

  _resetLooter(n) {
    clearItem(n.rig);
    n.temperament = 'looter';
    n.role = this.rng() < 0.5 ? 'shout' : 'watch';
    n.courage = 0.8 + this.rng() * 0.2;
    n.speedMul = 0.95 + this.rng() * 0.2;
    this._rallySpot(n);
    n.pos.copy(n.anchor);
    n.focus.copy(n.crew.door);
    this.setState(n, 'act', 0); n.dur = this.rng() * 6;
  }

  _lootMove(n, step, speed) {
    const c = n.crew;
    n.lootStep = step; n.lootSpeed = speed;
    if (step === 'door') n.target.set(c.door.x, 0, c.door.z + (this.rng() - 0.5) * 2.4);
    else if (step === 'rally') n.target.copy(n.anchor);
    this.setState(n, 'loot_move');
  }

  _thinkLooter(n, player) {
    const s = n.state;
    if (DISABLED.has(s) || s === 'flee' || s === 'surrender' || s.startsWith('arson')) return;
    // scatter when the officer comes close, then regroup
    if (n.distToPlayer < 6.5) {
      clearItem(n.rig);
      n.fleeFrom = player.pos.clone();
      this.setState(n, 'flee', 3 + this.rng() * 3);
      if (this.rng() < 0.3) this.game.audio.shout(n.pos);
      return;
    }
    if (s === 'calm' || s === 'walk') { clearItem(n.rig); this._rallySpot(n); this._lootMove(n, 'rally', 2.2); return; }
    if (s === 'act') {
      n.focus.copy(n.crew.door);
      if (n.st > n.dur) this._lootMove(n, 'door', 2.4);
    }
  }

  _startArson(n) {
    const c = n.crew;
    giveItem(n.rig, 'bottle');
    n.target.set(c.side * 10.5, 0, c.door.z + (this.rng() - 0.5) * 4);
    if (this.world.blocked(n.target.x, n.target.z, 0.4)) n.target.copy(c.rally);
    n.lootStep = 'arson'; n.lootSpeed = 2.6;
    this.setState(n, 'loot_move');
  }

  _updateCrews(dt) {
    for (const c of this.crews) {
      c.burnT -= dt;
      if (c.burnT > 0) continue;
      c.burnT = 28 + this.rng() * 30;
      if (c.burns >= 3) continue;
      const m = c.members.find((o) => o.temperament === 'looter' && o.state === 'act');
      if (m) this._startArson(m);
    }
  }

  _looterTransitions(n, dt) {
    const c = n.crew, s = n.state, g = this.game;
    if (s === 'loot_move') {
      if (Math.hypot(n.target.x - n.pos.x, n.target.z - n.pos.z) > 0.6 && n.st < 14) return;
      if (n.lootStep === 'door') {
        n.focus.set(c.side * 30, 0, n.pos.z); // face the shop front
        if (c.broken) this.setState(n, 'loot_grab', 1.2 + this.rng() * 1.4);
        else { this.setState(n, 'loot_smash', 2.5 + this.rng() * 2.5); n.hitCyc = Math.floor(n.id * 0.3 - 0.25); }
      } else if (n.lootStep === 'stash') { clearItem(n.rig); this._lootMove(n, 'rally', 2.0); }
      else if (n.lootStep === 'arson') { n.focus.copy(c.door); this.setState(n, 'arson_light', 1.3 + this.rng() * 0.8); g.audio.lighter(n.pos); }
      else { this.setState(n, 'act', 0); n.dur = 2 + this.rng() * 7; }
    } else if (s === 'loot_smash') {
      // blows land at the peak of each kick / swing in the animation
      const cyc = Math.floor(n.st * 1.6 + n.id * 0.3 - 0.25);
      if (cyc !== n.hitCyc) {
        n.hitCyc = cyc;
        const at = n.pos.clone().setY(n.pos.y + 1.0); at.x += c.side * 0.6;
        c.damage++;
        if (!c.broken && c.damage >= 6) {
          c.broken = true;
          g.audio.glass(at, 1.0); g.audio.shutter(at);
          g.effects.dust(at, 10);
          this.disturb(at, 12, 0.6, 'violence', n);
        } else if (this.rng() < 0.55) g.audio.shutter(at);
        else g.audio.glass(at, 0.5);
        g.effects.dust(at, 3);
      }
      if (n.st > n.dur) {
        if (c.broken) this.setState(n, 'loot_grab', 1.2 + this.rng());
        else { this._rallySpot(n); this._lootMove(n, 'rally', 2.0); }
      }
    } else if (s === 'loot_grab' && n.st > n.dur) {
      giveItem(n.rig, 'loot', this.rng);
      // carry it off along the pavement
      const dir = this.rng() < 0.5 ? 1 : -1;
      n.target.set(c.side * (10.5 + this.rng() * 2), 0, c.door.z + dir * (12 + this.rng() * 8));
      if (this.world.blocked(n.target.x, n.target.z, 0.4)) n.target.copy(n.anchor);
      n.lootStep = 'stash'; n.lootSpeed = 1.9;
      this.setState(n, 'loot_move');
    } else if (s === 'arson_light' || s === 'arson_wind') {
      if (n.rig.wick && (s === 'arson_wind' || n.st > 0.5)) {
        const p = V(); n.rig.wick.getWorldPosition(p);
        if (Math.random() < 0.7) g.effects.fire.spawn({ pos: p, vel: V().set(0, 0.8, 0), size: 0.16 + Math.random() * 0.1, life: 0.25, alpha: 1, color: new THREE.Color(1, 0.75, 0.3), color2: new THREE.Color(0.9, 0.2, 0), drag: 1 });
      }
      if (n.st > n.dur) { if (s === 'arson_light') this.setState(n, 'arson_wind', 0.55); else { this.setState(n, 'arson_throw', 0.4); this._arsonThrow(n); } }
    } else if (s === 'arson_throw' && n.st > n.dur) {
      this._rallySpot(n); this._lootMove(n, 'rally', 3.8);
    }
  }

  // petrol bomb into the shop: a burst of flame at the door, then the shop
  // burns. The crew moves on to another shop further along.
  _arsonThrow(n) {
    const c = n.crew, g = this.game;
    clearItem(n.rig);
    const door = c.door.clone();
    const from = n.pos.clone().setY(n.pos.y + 1.9);
    g.audio.swing(n.pos);
    g.effects.throwProjectile(from, V().set(door.x + c.side * 0.4, 0.8, door.z), 'petrol', () => {
      const ground = door.clone().setY(this.world.groundHeight(door.x, door.z));
      g.effects.ignite(ground, 2.4, 7 + this.rng() * 4);
      g.effects.addFire(V().set(door.x + c.side * 1.1, 1.0, door.z), 1.3, 2.2);
      g.audio.molotov(ground, 0.9);
      g.audio.glass(ground, 0.7);
      this.disturb(ground, 18, 0.95, 'explosion');
      const d = g.player.pos.distanceTo(ground);
      if (d < 3.2) g.player.takeDamage(14, ground, null);
      if (d < 60) g.hud.alert('Rioters have set a shop on fire', 'warn', 2.2, 'shopfire');
    });
    c.burns++;
    c.z0 += (this.rng() < 0.5 ? -1 : 1) * (14 + this.rng() * 8);
    this._placeCrew(c);
    for (const m of c.members) if (m !== n && m.state === 'act') { this._rallySpot(m); this._lootMove(m, 'rally', 2.4); }
  }

  // ------------------------------------------------------------------ civilians
  _resetCivilian(n) {
    clearItem(n.rig);
    n.temperament = 'civilian';
    n.courage = 0.05 + this.rng() * 0.2;
    n.speedMul = 0.9 + this.rng() * 0.2;
    this._placeCivilian(n, null);
  }

  // put a passer-by near one of the looting crews, already running from it
  _placeCivilian(n, player) {
    const p = player && player.pos;
    let cands = this.crews.filter((c) => { if (!p) return true; const d = c.door.distanceTo(p); return d > 36 && d < 80; });
    if (!cands.length) cands = this.crews;
    const c = cands[Math.floor(this.rng() * cands.length)];
    n.pos.copy(c.rally);
    for (let k = 0; k < 8; k++) {
      const x = c.side * (9.8 + this.rng() * 3.5), z = c.door.z + (this.rng() < 0.5 ? -1 : 1) * (3 + this.rng() * 7);
      if (!this.world.blocked(x, z, 0.4)) { n.pos.set(x, 0, z); break; }
    }
    n.anchor.copy(n.pos); n.vel.set(0, 0, 0); n.knock.set(0, 0, 0);
    n.role = 'cower';
    n.fleeFrom = c.door.clone();
    this.setState(n, 'flee', 3 + this.rng() * 3);
  }

  // closest looter, aggressor or fire to a civilian
  _nearestDanger(n) {
    let best = null, bd = 16 * 16;
    for (const c of this.crews) for (const m of c.members) {
      if (m.temperament !== 'looter' || m.arrested) continue;
      const d = (m.pos.x - n.pos.x) ** 2 + (m.pos.z - n.pos.z) ** 2;
      if (d < bd) { bd = d; best = m.pos; }
    }
    for (const o of this.query(n.pos.x, n.pos.z, 12, [])) {
      if (o.id === undefined || !this.isThreat(o)) continue;
      const d = (o.pos.x - n.pos.x) ** 2 + (o.pos.z - n.pos.z) ** 2;
      if (d < bd) { bd = d; best = o.pos; }
    }
    for (const f of this.world.fires) {
      const d = (f.pos.x - n.pos.x) ** 2 + (f.pos.z - n.pos.z) ** 2;
      if (d < 7 * 7 && d < bd) { bd = d; best = f.pos; }
    }
    return best;
  }

  _scream(n) {
    if (this.time - this.lastScream < 0.7 || n.distToPlayer > 45) return;
    this.lastScream = this.time;
    this.game.audio.scream(n.pos, n.outfit.gender === 'f');
  }

  _thinkCivilian(n, player, dt) {
    const s = n.state;
    if (DISABLED.has(s) || s === 'surrender') return;
    const danger = this._nearestDanger(n);
    if (s === 'flee') {
      if (danger) n.fleeFrom.set(danger.x, 0, danger.z);
      if (this.rng() < dt * 0.35) this._scream(n);
      return;
    }
    if (danger) {
      n.fleeFrom = V().set(danger.x, 0, danger.z);
      this.setState(n, 'flee', 3 + this.rng() * 3);
      this._scream(n);
      return;
    }
    // well out of sight: rejoin the scene near another crew
    if (n.distToPlayer > 50 && (s === 'calm' || s === 'act')) { this._placeCivilian(n, player); return; }
    if (s === 'calm') {
      // stop and look back at what they ran from
      n.role = 'cower';
      this.setState(n, 'act', 0); n.dur = 1.5 + this.rng() * 2.5;
    }
    if (n.state === 'act') {
      if (n.fleeFrom) n.focus.copy(n.fleeFrom);
      if (n.st > n.dur) {
        // hurry on, away from the trouble
        const from = n.fleeFrom || player.pos;
        tmp.set(n.pos.x - from.x, 0, n.pos.z - from.z);
        if (tmp.lengthSq() < 0.01) tmp.set(0, 0, 1);
        tmp.normalize();
        for (let k = 0; k < 6; k++) {
          const a = (this.rng() - 0.5) * 1.4, r = 8 + this.rng() * 6;
          const x = n.pos.x + (tmp.x * Math.cos(a) - tmp.z * Math.sin(a)) * r, z = n.pos.z + (tmp.x * Math.sin(a) + tmp.z * Math.cos(a)) * r;
          if (!this.world.blocked(x, z, 0.4)) { n.target.set(x, 0, z); break; }
        }
        this.setState(n, 'walk');
      }
    }
  }

  // Groups of demonstrators that move together along the boulevard.
  _makeMarches() {
    for (const n of this.npcs) { n.march = null; }
    const paths = [
      [[-4, 108], [-5, 60], [-3, 10], [4, -40], [3, -90]],
      [[6, -95], [5, -50], [-2, 0], [-4, 50], [-6, 95]],
      [[11.5, 100], [11.5, 60], [11.8, 20], [11.5, -10], [-11.5, -10], [-11.8, 30], [-11.5, 90]],
    ];
    this.marches = paths.map((path, gi) => ({ path: path.map(([x, z]) => new THREE.Vector3(x, 0, z)), idx: 1, pos: new THREE.Vector3(path[0][0], 0, path[0][1]), dir: new THREE.Vector3(0, 0, -1), speed: 0.85 + gi * 0.12, wait: 0 }));
    const free = this.npcs.filter((n) => n.id >= 34 && n.temperament === 'peaceful');
    let k = 0;
    this.marches.forEach((g, gi) => {
      const size = gi === 2 ? 5 : 8;
      for (let i = 0; i < size && k < free.length; i++, k++) {
        const n = free[k];
        n.march = g;
        const row = Math.floor(i / 3), col = (i % 3) - 1;
        n.mOff = new THREE.Vector3(col * 1.1 + (this.rng() - 0.5) * 0.4, 0, row * 1.2 + (this.rng() - 0.5) * 0.4);
        n.pos.set(g.pos.x + n.mOff.x, 0, g.pos.z + n.mOff.z);
        n.speedMul = 1.05;
      }
    });
  }

  _updateMarches(dt) {
    for (const g of this.marches || []) {
      if (g.wait > 0) { g.wait -= dt; continue; }
      const tgt = g.path[g.idx];
      const dx = tgt.x - g.pos.x, dz = tgt.z - g.pos.z, d = Math.hypot(dx, dz);
      // groups slow down where the crowd is thick (bottlenecks at barricades)
      const dens = this.query(g.pos.x, g.pos.z, 4, []).length;
      const sp = g.speed * (dens > 14 ? 0.45 : 1);
      if (d < 0.5) {
        g.idx = (g.idx + 1) % g.path.length;
        if (g.idx === 0) g.path.reverse(), (g.idx = 1);
        g.wait = 2 + Math.random() * 5; // stop to chant
      } else {
        g.dir.set(dx / d, 0, dz / d);
        g.pos.addScaledVector(g.dir, Math.min(d, sp * dt));
      }
    }
  }

  // ------------------------------------------------------------------ hash
  _rebuildGrid() {
    this.grid.clear();
    const put = (o, x, z) => {
      const k = Math.floor(x / 2) * 1000 + Math.floor(z / 2);
      let l = this.grid.get(k); if (!l) { l = []; this.grid.set(k, l); } l.push(o);
    };
    for (const n of this.npcs) if (n.state !== 'gone') put(n, n.pos.x, n.pos.z);
    for (const p of this.police) put(p, p.pos.x, p.pos.z);
  }

  query(x, z, r, out = []) {
    out.length = 0;
    for (let gx = Math.floor((x - r) / 2); gx <= Math.floor((x + r) / 2); gx++)
      for (let gz = Math.floor((z - r) / 2); gz <= Math.floor((z + r) / 2); gz++) {
        const l = this.grid.get(gx * 1000 + gz);
        if (l) for (const o of l) if ((o.pos.x - x) ** 2 + (o.pos.z - z) ** 2 < r * r) out.push(o);
      }
    return out;
  }

  // ------------------------------------------------------------------ events
  // Emit a disturbance; nearby agents react individually after a delay.
  disturb(pos, radius, intensity, type, source = null) {
    for (const n of this.npcs) {
      if (n === source || DISABLED.has(n.state) || n.state === 'gone') continue;
      const d = Math.hypot(n.pos.x - pos.x, n.pos.z - pos.z);
      if (d > radius) continue;
      const delay = 0.08 + this.rng() * 0.6 + d * 0.035;
      n.stimuli.push({ t: delay, k: intensity * (1 - (d / radius) * 0.7), pos: pos.clone(), type });
    }
  }

  isThreat(n) {
    return !n.neutralized && !n.arrested && n.temperament === 'hostile' && (AGGRO_STATES.has(n.state) || this.time - n.lastAggro < 4);
  }

  makeHostile(n, style, targetMode = 'auto') {
    n.temperament = 'hostile';
    n.attackStyle = style;
    n.targetMode = targetMode;
    n.hp = style === 'melee' ? 2 + (this.rng() < 0.4 ? 1 : 0) : 2;
    n.neutralized = false;
    n.cool = this.rng() * 1.5;
    // Props are only dropped when the attack needs the hands: a melee aggressor keeps a
    // one-handed flag, throwers swap theirs for a stone, two-handed props are let go.
    // Clothing is never changed: becoming hostile does not alter how someone looks.
    const keep = style === 'bomber' || (style === 'melee' && (n.rig.itemType === 'flag' || n.rig.itemType === 'frflag'));
    if (n.rig.itemType !== 'none' && !keep) clearItem(n.rig);
    if (style === 'thrower') giveItem(n.rig, 'stone');
    this.setState(n, style === 'thrower' ? 'pursue' : 'pursue');
    n.lastAggro = this.time;
  }

  setState(n, s, dur = 0) {
    n.state = s; n.st = 0; n.dur = dur;
  }

  // Called by the player's baton when a strike connects with this agent.
  onBatonHit(n, dir, attackerPos) {
    const g = this.game;
    const wasThreat = this.isThreat(n) || (n.script && n.script.active) || n.temperament === 'looter';
    const fwd = tmp.set(Math.sin(n.heading), 0, Math.cos(n.heading));
    const fromBehind = fwd.dot(dir) > 0.2; // strike travelling in the same direction they face
    n.hitCount++;
    n.hp -= 1;
    const knock = n.hp <= 0 || n.state === 'stagger' || (!wasThreat && n.hitCount >= 2);
    n.fallDir = fromBehind ? 1 : -1;
    if (n.script && n.script.onHit) n.script.onHit(n);
    if (knock) {
      n.knock.copy(dir).multiplyScalar(4.2);
      this.setState(n, 'down', (n.temperament === 'hostile' ? 4.5 : 3) + this.rng() * 2);
      if (wasThreat && !n.neutralized) { n.neutralized = true; g.onThreatNeutralized(n); }
      g.effects.dust(n.pos.clone().setY(0.2), 10);
      g.audio.impact(n.pos, true);
    } else {
      n.knock.copy(dir).multiplyScalar(2.8);
      this.setState(n, 'stagger', 0.65 + this.rng() * 0.2);
      n.staggerBack = !fromBehind;
    }
    if (!wasThreat) {
      g.onPeacefulStruck(n);
      n.fear = 1.2;
      this.disturb(n.pos, 11, 1.0, 'violence', n);
    } else {
      this.disturb(n.pos, 7, 0.45, 'violence', n);
    }
    setRingVisible(n.rig, false);
    clearItem(n.rig);
    if (n.surge) n.surge = null;
  }

  // ------------------------------------------------------------------ update
  update(dt, player) {
    this.time += dt;
    const t = this.time;
    this._rebuildGrid();
    this._updateMarches(dt);
    this._updateCrews(dt);
    const ppos = player.pos;
    for (const n of this.npcs) {
      if (n.state === 'gone') continue;
      const dist = Math.hypot(n.pos.x - ppos.x, n.pos.z - ppos.z);
      n.distToPlayer = dist;
      // perception (always processed so reactions stay timely)
      for (let i = n.stimuli.length - 1; i >= 0; i--) {
        const s = n.stimuli[i];
        s.t -= dt;
        if (s.t <= 0) { n.stimuli.splice(i, 1); this._react(n, s); }
      }
      n.fear = Math.max(0, n.fear - dt * 0.12);
      // think at a reduced rate when far from the player
      n.thinkT -= dt;
      const thinkInterval = dist < 35 ? 0 : dist < 70 ? 0.2 : 0.5;
      if (n.thinkT <= 0) { this._think(n, player, Math.max(dt, thinkInterval)); n.thinkT = thinkInterval; }
      n.st += dt;
      this._timedTransitions(n, player, dt);
      this._move(n, dt, player);
    }
    this._separate(player, dt);
    // render update (pose LOD)
    const cam = this.game.camera.position;
    if (this.far) this.far.begin();
    // the closest MAX_SKINNED agents get full skeletal rigs; the rest use impostors
    const order = this.npcs.filter((n) => n.state !== 'gone').sort((a, b) => a.distToPlayer - b.distToPlayer);
    order.forEach((n, i) => (n.rank = i));
    // camera→player segment, used to hide agents that would block the view
    const sx = ppos.x - cam.x, sz = ppos.z - cam.z, sl2 = sx * sx + sz * sz || 1;
    for (const n of this.npcs) {
      if (n.state === 'gone') continue;
      const r = n.rig.root;
      r.position.set(n.pos.x, n.pos.y, n.pos.z);
      r.rotation.y = n.heading;
      const dc = cam.distanceToSquared(tmp.set(n.pos.x, n.pos.y + 1.3, n.pos.z));
      const u = ((n.pos.x - cam.x) * sx + (n.pos.z - cam.z) * sz) / sl2;
      let blocking = false;
      if (u > 0 && u < 0.82) {
        const qx = cam.x + sx * u - n.pos.x, qz = cam.z + sz * u - n.pos.z;
        blocking = qx * qx + qz * qz < 0.5 * 0.5;
      }
      const lod = !this.far ? 0 : n.distToPlayer > LOD_FAR || n.rank >= this.maxSkinned ? 2 : n.distToPlayer > LOD_MID ? 1 : 0;
      n.lod = lod;
      if (lod === 2) {
        r.visible = false;
        const lyingDown = n.state === 'down' || n.state === 'arrested';
        if (!lyingDown) this.far.add(n.rig.kind, n.speed > 0.5, { x: n.pos.x, y: n.pos.y, z: n.pos.z, heading: n.heading, scale: n.outfit.height || 1, colors: n.colors, pat: n.outfit.shellPattern === 1 });
        n.animAcc += dt;
        continue;
      }
      r.visible = dc > 1.1 * 1.1 && !blocking; // never let a body fill the camera or hide the officer
      n.animAcc += dt;
      if (lod === 0 || n.animAcc > 0.05) { this._animate(n, n.animAcc, t); n.animAcc = 0; }
      const shadow = n.distToPlayer < 14;
      if (shadow !== n.shadow) { n.shadow = shadow; for (const m of n.rig.meshes) m.castShadow = shadow && !m.userData.detail; }
      const threat = this.isThreat(n) || (n.script && n.script.marked);
      // looters caught in the act are marked amber
      const looting = n.temperament === 'looter' && (n.state === 'loot_smash' || n.state === 'loot_grab' || n.state.startsWith('arson') || n.rig.itemType === 'loot');
      setRingVisible(n.rig, (!!threat || looting) && !DISABLED.has(n.state), looting || (n.script && n.script.amber) ? 'amber' : 'red');
    }
    if (this.far) { this._drawBackground(t); this.far.end(); }
    this._updatePolice(dt, t, player);
  }

  // Background population in places the player cannot reach: side streets
  // beyond the police cordons and the far end of the boulevard.
  _buildBackground() {
    const rng = mulberry(777);
    const spots = [];
    const R = (a, b) => a + (b - a) * rng();
    for (const s of LAYOUT.crossStreets) for (const xs of [-1, 1]) {
      // groups clustered around a few centres
      for (let gI = 0; gI < 7; gI++) {
        const cx = xs * (63.5 + Math.pow(rng(), 1.7) * 52), cz = s.z + R(-s.half + 1.5, s.half - 1.5), n = 6 + Math.floor(rng() * 10);
        for (let i = 0; i < n; i++) spots.push([cx + R(-3, 3), Math.max(s.z - s.half + 0.6, Math.min(s.z + s.half - 0.6, cz + R(-2.5, 2.5)))]);
      }
    }
    // dense crowd held behind the northern barricade, and gathering just in front of it
    for (let gI = 0; gI < 5; gI++) {
      const cx = R(-11, 11), cz = R(-163, -146), n = 8 + Math.floor(rng() * 8);
      for (let i = 0; i < n; i++) spots.push([Math.max(-13, Math.min(13, cx + R(-3, 3))), cz + R(-3, 3)]);
    }
    for (let gI = 0; gI < 12; gI++) {
      const cx = R(-12, 12), cz = R(-214, -172), n = 10 + Math.floor(rng() * 12);
      for (let i = 0; i < n; i++) spots.push([Math.max(-14, Math.min(14, cx + R(-4, 4))), cz + R(-4, 4)]);
    }
    for (let i = 0; i < 14; i++) spots.push([R(-12, 12), R(186, 200)]);
    // looting gangs along the shop fronts of the side streets and at the far barricade
    const gangs = [];
    for (const s of LAYOUT.crossStreets) for (const xs of [-1, 1]) for (let gI = 0; gI < 3; gI++) {
      const sz = rng() < 0.5 ? -1 : 1, cx = xs * R(66, 112), cz = s.z + sz * (s.half - 1.4), n = 5 + Math.floor(rng() * 6);
      for (let i = 0; i < n; i++) gangs.push([cx + R(-2.5, 2.5), cz - sz * R(0, 1.6)]);
    }
    for (let gI = 0; gI < 4; gI++) {
      const cx = R(-12, 12), cz = R(-210, -175), n = 6 + Math.floor(rng() * 6);
      for (let i = 0; i < n; i++) gangs.push([Math.max(-14, Math.min(14, cx + R(-3, 3))), cz + R(-3, 3)]);
    }
    const mk = (x, z) => {
      const o = randomOutfit(rng);
      return { x, z, h: rng() * 6.28, ph: rng() * 6.28, kind: o.base || (o.gender === 'f' ? 'michelle' : 'male'), scale: o.height, colors: outfitColors(o), pat: o.shellPattern === 1, walk: rng() < 0.15 };
    };
    this.bg = spots.slice(0, 560).map(([x, z]) => mk(x, z)).concat(gangs.map(([x, z]) => mk(x, z)));
  }

  _drawBackground(t) {
    const cam = this.game.camera.position;
    for (const b of this.bg) {
      if ((b.x - cam.x) ** 2 + (b.z - cam.z) ** 2 > 180 * 180) continue;
      const bob = Math.max(0, Math.sin(t * 3.1 + b.ph)) * 0.05;
      this.far.add(b.kind, b.walk, { x: b.x, y: 0, z: b.z, heading: b.h + Math.sin(t * 0.4 + b.ph) * 0.4, scale: b.scale, bob, colors: b.colors, pat: b.pat });
    }
  }

  _react(n, s) {
    if (DISABLED.has(n.state) || n.arrested || n.state === 'surrender') return;
    if (n.temperament === 'looter') {
      // only tear gas breaks up a looting crew
      if (s.type === 'teargas' && s.k > 0.35 && !n.state.startsWith('arson') && n.state !== 'flee') {
        clearItem(n.rig); n.fleeFrom = s.pos.clone(); this.setState(n, 'flee', 4 + this.rng() * 2);
      }
      return;
    }
    if (n.temperament === 'hostile' && !n.neutralized) {
      // aggressors are hard to scare; explosions they caused don't matter to them
      if (s.type === 'explosion' && s.k > 0.9 && n.attackStyle !== 'bomber') n.fear += 0.3;
      return;
    }
    if (n.script && n.script.active) return;
    const sens = { explosion: 1.5, violence: 1.45, projectile: 0.9, panic: 0.9, charge: 0.6, teargas: 1.7 }[s.type] ?? 0.6;
    n.fear += s.k * sens * (1.15 - n.courage * 0.6);
    const threshold = n.surge ? 0.9 : 0.35 + n.courage * 0.45;
    if (n.fear > threshold) {
      const already = n.state === 'flee';
      n.fleeFrom = s.pos.clone();
      this.setState(n, 'flee', 3 + this.rng() * 3 + s.k * 2);
      if (!already && n.temperament === 'civilian') this._scream(n);
      if (n.surge) n.surge = null;
      // panic is contagious, but weakens as it spreads
      if (!already && s.k > 0.3 && this.rng() < 0.65) this.disturb(n.pos, 6, s.k * 0.55, 'panic', n);
    } else if (s.k > 0.15 && n.state === 'act') {
      // look at the commotion; some filmers will start filming it
      n.focus.copy(s.pos);
      n.lookT = 3;
    }
  }

  // Decisions made at the think rate
  _think(n, player, dt) {
    const g = this.game;
    if (n.temperament === 'looter') return this._thinkLooter(n, player);
    if (n.temperament === 'civilian') return this._thinkCivilian(n, player, dt);
    if (n.march && n.temperament === 'peaceful' && !n.surge && (n.state === 'act' || n.state === 'walk' || n.state === 'calm')) {
      // marching group: keep station around the moving group centre
      const g = n.march;
      n.target.set(g.pos.x + n.mOff.x, 0, g.pos.z + n.mOff.z);
      n.anchor.copy(n.target);
      const d = Math.hypot(n.target.x - n.pos.x, n.target.z - n.pos.z);
      if (d > 1.2 && n.state !== 'walk') this.setState(n, 'walk');
      n.focus.set(g.pos.x + g.dir.x * 20, 0, g.pos.z + g.dir.z * 20);
    } else if (n.state === 'act' || n.state === 'walk') {
      // pick a new spot near the anchor now and then
      if (n.st > n.dur) {
        const r = n.role === 'wander' ? 12 : 3.5;
        for (let k = 0; k < 4; k++) {
          tmp.set(n.anchor.x + (this.rng() - 0.5) * 2 * r, 0, n.anchor.z + (this.rng() - 0.5) * 2 * r);
          if (!this.world.blocked(tmp.x, tmp.z, 0.5)) { n.target.copy(tmp); break; }
        }
        this.setState(n, 'walk', 0);
        n.dur = 5 + this.rng() * 10;
      }
      // focus: filmers point their phones at the officer when he is close
      if (!n.lookT || n.lookT <= 0) {
        if ((n.role === 'film' || n.role === 'shout') && n.distToPlayer < 16) n.focus.copy(player.pos);
        else if (n.pos.z < 128) n.focus.set(n.pos.x * 0.5, 0, 135);
        else n.focus.set(0, 0, 100);
      } else n.lookT -= dt;
      // stay out of the officer's way when he walks through (personal space)
      if (n.distToPlayer < 1.6 && player.speed > 1.5) n.yield = 0.6;
    }
    if (n.temperament === 'hostile' && !n.neutralized && !n.script) this._thinkHostile(n, player);
    if (n.state === 'calm' && n.st > 2) {
      // return to peaceful activity at a new anchor away from the trouble
      n.anchor.copy(n.pos); n.fear = Math.min(n.fear, 0.2);
      this.setState(n, 'act', 0); n.dur = 3 + this.rng() * 6;
    }
    if (n.surge) {
      if (n.state !== 'surge' && !DISABLED.has(n.state) && n.state !== 'flee') this.setState(n, 'surge');
      if (n.pos.z > n.surge.endZ) { n.surge = null; n.anchor.copy(n.pos); this.setState(n, 'act', 0); n.dur = 2; }
    }
  }

  _pickTarget(n, player) {
    // Aggressors go for the officer if he is close; otherwise the police line (incident 1)
    const pd = n.distToPlayer;
    if (n.targetMode === 'officers' && pd > 3.5) {
      let best = null, bd = Infinity;
      for (const p of this.police) if (p.role === 'guard' || p.role === 'injured') { const d = p.pos.distanceToSquared(n.pos); if (d < bd) { bd = d; best = p; } }
      if (best) return { pos: best.pos, isPlayer: false, cop: best };
    }
    if (n.targetMode === 'player' || n.targetMode === 'officers' || pd < 10 || !this.police.some((p) => p.role === 'line')) return { pos: player.pos, isPlayer: true };
    let best = null, bd = Infinity;
    for (const p of this.police) if (p.role === 'line') { const d = p.pos.distanceToSquared(n.pos); if (d < bd) { bd = d; best = p; } }
    return { pos: best.pos, isPlayer: false, cop: best };
  }

  _thinkHostile(n, player) {
    if (DISABLED.has(n.state) || n.state === 'flee' || n.state === 'surrender') return;
    const tg = this._pickTarget(n, player);
    n.targetRef = tg;
    const d = Math.hypot(tg.pos.x - n.pos.x, tg.pos.z - n.pos.z);
    if (n.state === 'act' || n.state === 'walk' || n.state === 'calm') this.setState(n, 'pursue');
    if (n.attackStyle === 'melee') {
      if (n.state === 'pursue' && d < 1.35 && n.cool <= 0) {
        n.attackKind = this.rng() < 0.35 ? 'shove' : 'punch';
        this.setState(n, 'atk_wind', n.attackKind === 'shove' ? 0.5 : 0.55);
        if (this.rng() < 0.5) this.game.audio.shout(n.pos);
      }
    } else if (n.attackStyle === 'thrower') {
      if ((n.state === 'pursue' || n.state === 'circle') && d < 16 && d > 5 && n.cool <= 0) this.setState(n, 'throw_prep', 0.8);
    }
  }

  // State changes driven by elapsed time
  _timedTransitions(n, player, dt) {
    const g = this.game;
    const s = n.state;
    n.cool -= dt;
    if (s === 'walk' && Math.hypot(n.target.x - n.pos.x, n.target.z - n.pos.z) < 0.5) { this.setState(n, 'act'); n.dur = 4 + this.rng() * 10; }
    if (s === 'flee' && n.st > n.dur) this.setState(n, 'calm');
    if (s === 'stagger' && n.st > n.dur) {
      if (n.temperament === 'hostile' && !n.neutralized && !n.script) this.setState(n, 'pursue');
      else { n.fleeFrom = player.pos.clone(); this.setState(n, 'flee', 4); }
    }
    if (s === 'down' && n.st > n.dur) this.setState(n, 'recover', 1.5);
    if (s === 'recover' && n.st > n.dur) {
      if (n.neutralized) { this.setState(n, 'surrender', 4.5); n.surrendered = true; }
      else if (n.temperament === 'hostile' && !n.script) this.setState(n, 'pursue');
      else { n.fleeFrom = player.pos.clone(); this.setState(n, 'flee', 5); }
    }
    if (s === 'surrender' && n.st > n.dur) {
      n.temperament = 'peaceful'; n.attackStyle = null; n.fleeFrom = player.pos.clone();
      this.setState(n, 'flee', 6);
    }
    // melee attack phases
    if (s === 'atk_wind' && n.st > n.dur) {
      this.setState(n, 'atk_strike', 0.16);
      const tg = n.targetRef;
      if (tg) {
        const d = Math.hypot(tg.pos.x - n.pos.x, tg.pos.z - n.pos.z);
        if (d < 1.75) {
          const dir = tmp2.set(tg.pos.x - n.pos.x, 0, tg.pos.z - n.pos.z).normalize();
          if (tg.isPlayer) g.player.takeDamage(n.attackKind === 'shove' ? 6 : 9, n.pos, dir.clone().multiplyScalar(n.attackKind === 'shove' ? 4.5 : 2));
          else if (tg.cop) {
            tg.cop.flinch = 0.4; g.onPoliceLineHit(n.attackKind === 'shove' ? 1 : 1.3, tg.cop); g.audio.impact(tg.cop.pos, false, true);
            // the line shoves back: attackers get pushed away and must re-engage
            if (this.rng() < 0.45) { n.knock.copy(dir).multiplyScalar(-3.5); this.setState(n, 'stagger', 0.5); n.staggerBack = true; }
          }
        } else g.audio.swing(n.pos);
      }
      n.lastAggro = this.time;
    }
    if (s === 'atk_strike' && n.st > n.dur) this.setState(n, 'atk_rec', 0.45);
    if (s === 'atk_rec' && n.st > n.dur) { n.cool = 0.9 + this.rng() * 1.6; this.setState(n, 'circle', n.cool); }
    if (s === 'circle' && n.st > n.dur) this.setState(n, 'pursue');
    // throwing
    if (s === 'throw_prep' && n.st > n.dur) { this.setState(n, 'throw_wind', 0.7); giveItem(n.rig, this.rng() < 0.5 ? 'stone' : 'bottle'); }
    if (s === 'throw_wind' && n.st > n.dur) {
      this.setState(n, 'throw_rel', 0.45);
      const tg = n.targetRef || { pos: player.pos, isPlayer: true };
      const type = n.rig.itemType === 'bottle' ? 'bottle' : 'stone';
      clearItem(n.rig);
      const from = n.pos.clone().setY(n.pos.y + 1.9);
      const aim = tg.pos.clone().setY(1.2);
      if (tg.isPlayer) aim.addScaledVector(player.vel, 0.6); // lead the target
      aim.x += (this.rng() - 0.5) * 1.6; aim.z += (this.rng() - 0.5) * 1.6;
      const proj = g.effects.throwProjectile(from, aim, type, (pos, p, hitPlayer) => {
        if (hitPlayer) g.player.takeDamage(10, from, null, true);
        // a stone on the officer is voiced by the hit / block sound in takeDamage
        if (type === 'bottle') g.audio.glass(pos); else if (!hitPlayer) g.audio.impact(pos, false, false, 'stone');
        g.effects.dust(pos, 5);
        this.disturb(pos, 6, 0.4, 'projectile');
        if (!hitPlayer && tg.cop && pos.distanceTo(tg.cop.pos) < 1.8) { tg.cop.flinch = 0.4; g.onPoliceLineHit(1, tg.cop); }
      });
      proj.check = (pos) => g.player.hitTest(pos);
      g.audio.swing(n.pos);
      n.lastAggro = this.time;
    }
    if (s === 'throw_rel' && n.st > n.dur) { n.cool = 2.5 + this.rng() * 2.5; this.setState(n, 'circle', n.cool); }
    if (n.script && n.script.tick) n.script.tick(n, player, dt);
    if (n.temperament === 'looter') this._looterTransitions(n, dt);
  }

  // Steering, avoidance and integration
  _move(n, dt, player) {
    const s = n.state;
    let speed = 0, dest = null;
    const desired = tmp.set(0, 0, 0);
    if (s === 'walk') { dest = n.target; speed = (n.role === 'wander' ? 1.35 : n.temperament === 'civilian' ? 1.9 : 1.1) * n.speedMul; }
    else if (s === 'loot_move') { dest = n.target; speed = n.lootSpeed * n.speedMul; }
    else if (s === 'flee') {
      desired.set(n.pos.x - n.fleeFrom.x, 0, n.pos.z - n.fleeFrom.z);
      if (desired.lengthSq() < 0.01) desired.set(this.rng() - 0.5, 0, this.rng() - 0.5);
      desired.normalize();
      // bias flight along the street axis rather than into walls
      if (Math.abs(n.pos.x) > 9) desired.x *= 0.3;
      desired.normalize();
      speed = (4.2 + n.courage * 1.5) * n.speedMul;
    } else if (s === 'pursue' && n.targetRef) {
      dest = n.targetRef.pos; speed = 4.0 * n.speedMul;
      const d = Math.hypot(dest.x - n.pos.x, dest.z - n.pos.z);
      if (n.attackStyle === 'thrower' && d < 9) { speed = 1.6; dest = null; desired.set(n.pos.x - n.targetRef.pos.x, 0, n.pos.z - n.targetRef.pos.z).normalize(); }
      else if (n.attackStyle === 'melee' && d < 1.1) { speed = 0; dest = null; }
    } else if (s === 'circle' && n.targetRef) {
      // back off / strafe around the target
      const away = tmp2.set(n.pos.x - n.targetRef.pos.x, 0, n.pos.z - n.targetRef.pos.z);
      const d = away.length(); away.normalize();
      const side = n.id % 2 ? 1 : -1;
      desired.set(-away.z * side, 0, away.x * side).addScaledVector(away, d < 3 ? 1 : d > 6 ? -0.6 : 0).normalize();
      speed = 1.6;
    } else if (s === 'surge' && n.surge) {
      desired.set(n.surge.dir.x, 0, n.surge.dir.z);
      desired.x += (n.surge.laneX - n.pos.x) * 0.15;
      desired.normalize();
      speed = n.surge.speed * n.speedMul;
    } else if (s === 'act' && n.yield > 0) {
      // step aside
      desired.set(n.pos.x - player.pos.x, 0, n.pos.z - player.pos.z).normalize();
      speed = 1.2; n.yield -= dt;
    }
    if (n.script && n.script.move) { const r = n.script.move(n, desired); if (r) { speed = r.speed; dest = r.dest || null; } }
    if (dest) {
      desired.set(dest.x - n.pos.x, 0, dest.z - n.pos.z);
      const d = desired.length();
      if (d > 0.05) desired.multiplyScalar(1 / d); else speed = 0;
      if (d < 1.2) speed *= d / 1.2;
    }
    // stuck recovery: if an agent wants to move but isn't, detour sideways for a moment
    if (n.detourT > 0) {
      n.detourT -= dt;
      const c = Math.cos(n.detourA), sn = Math.sin(n.detourA);
      desired.set(desired.x * c - desired.z * sn, 0, desired.x * sn + desired.z * c);
    }
    // obstacle avoidance: probe ahead, try rotated directions if blocked
    if (speed > 0.1) {
      const look = Math.min(1.6, 0.6 + speed * 0.3);
      if (this.world.blocked(n.pos.x + desired.x * look, n.pos.z + desired.z * look, 0.3)) {
        let found = false;
        for (const a of [0.7, -0.7, 1.4, -1.4, 2.2, -2.2]) {
          const c = Math.cos(a), sn = Math.sin(a);
          const dx = desired.x * c - desired.z * sn, dz = desired.x * sn + desired.z * c;
          if (!this.world.blocked(n.pos.x + dx * look, n.pos.z + dz * look, 0.3)) { desired.set(dx, 0, dz); found = true; break; }
        }
        if (!found) speed *= 0.2;
      }
    }
    if (DISABLED.has(s) || s === 'surrender' || s.startsWith('atk') || s.startsWith('throw') || s.startsWith('bomb') || s === 'loot_smash' || s === 'loot_grab' || s.startsWith('arson')) speed = s === 'atk_strike' ? 1.5 : 0;
    if (s === 'atk_strike' && n.targetRef) desired.set(n.targetRef.pos.x - n.pos.x, 0, n.targetRef.pos.z - n.pos.z).normalize();
    // integrate with acceleration limits
    const accel = s === 'flee' ? 9 : 6;
    const k = 1 - Math.exp(-accel * dt);
    n.vel.x += (desired.x * speed - n.vel.x) * k;
    n.vel.z += (desired.z * speed - n.vel.z) * k;
    n.pos.x += (n.vel.x + n.knock.x) * dt;
    n.pos.z += (n.vel.z + n.knock.z) * dt;
    n.knock.multiplyScalar(Math.exp(-dt * 5));
    this.world.resolveCircle(n.pos, n.radius);
    n.pos.y += (this.world.groundHeight(n.pos.x, n.pos.z) - n.pos.y) * Math.min(1, dt * 12);
    // heading
    const sp = Math.hypot(n.vel.x, n.vel.z);
    n.speed = sp;
    if (speed > 1.2 && sp < 0.35 && !DISABLED.has(s)) { n.stuckT = (n.stuckT || 0) + dt; if (n.stuckT > 0.8) { n.stuckT = 0; n.detourT = 1.0 + this.rng(); n.detourA = (this.rng() < 0.5 ? -1 : 1) * (1.2 + this.rng() * 0.6); } }
    else n.stuckT = 0;
    let want = n.heading;
    if (s === 'down' || s === 'recover' || s === 'arrested') want = n.heading;
    else if ((s.startsWith('atk') || s.startsWith('throw') || s === 'circle' || s === 'bomb_wind' || s === 'bomb_throw') && n.targetRef) want = headingTo(n.pos, n.targetRef.pos);
    else if (sp > 0.35 && s !== 'stagger' && !(s === 'act' && n.yield > 0)) want = Math.atan2(n.vel.x, n.vel.z);
    else if (s === 'act' || s === 'surrender' || s === 'loot_smash' || s === 'loot_grab' || s.startsWith('arson')) want = headingTo(n.pos, n.focus);
    n.heading = angleLerp(n.heading, want, 1 - Math.exp(-dt * (s === 'flee' ? 10 : 5)));
  }

  // Soft agent-agent and agent-player separation using the spatial hash.
  _separate(player, dt) {
    const near = [];
    for (const n of this.npcs) {
      if (n.state === 'gone') continue;
      const lying = n.state === 'down' || n.state === 'arrested';
      this.query(n.pos.x, n.pos.z, 0.9, near);
      for (const o of near) {
        if (o === n) continue;
        if (o.id !== undefined && o.id < n.id) continue; // each NPC pair once
        const isCop = o.id === undefined;
        const dx = o.pos.x - n.pos.x, dz = o.pos.z - n.pos.z;
        const d2 = dx * dx + dz * dz, minD = lying || o.state === 'down' ? 0.5 : 0.66;
        if (d2 < minD * minD && d2 > 1e-6) {
          const d = Math.sqrt(d2), push = (minD - d) / d * 0.5;
          if (isCop) { n.pos.x -= dx * push * 2; n.pos.z -= dz * push * 2; }
          else { n.pos.x -= dx * push; n.pos.z -= dz * push; o.pos.x += dx * push; o.pos.z += dz * push; }
        }
      }
      // player (heavier; shield stance makes him a wedge)
      const dx = player.pos.x - n.pos.x, dz = player.pos.z - n.pos.z;
      const d2 = dx * dx + dz * dz, minD = lying ? 0.45 : 0.72;
      if (d2 < minD * minD && d2 > 1e-6) {
        const d = Math.sqrt(d2), overlap = (minD - d) / d;
        const pm = player.blocking ? 5 : 1.6, nm = n.surge ? 2.6 : 1;
        const pk = nm / (pm + nm), nk = pm / (pm + nm);
        player.pos.x += dx * overlap * pk; player.pos.z += dz * overlap * pk;
        n.pos.x -= dx * overlap * nk; n.pos.z -= dz * overlap * nk;
        if (n.surge) { player.surgePush = (player.surgePush || 0) + dt; }
      }
    }
    // police are static obstacles for the player too
    for (const p of this.police) {
      const dx = player.pos.x - p.pos.x, dz = player.pos.z - p.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 0.7 * 0.7 && d2 > 1e-6) { const d = Math.sqrt(d2), o = (0.7 - d) / d; player.pos.x += dx * o; player.pos.z += dz * o; }
    }
  }

  // ------------------------------------------------------------------ animation
  _animate(n, dt, t) {
    const rig = n.rig;
    const P = newPose();
    const s = n.state;
    const k01 = (x) => Math.max(0, Math.min(1, x));
    let rate = 12;
    baseLayer(P, rig, n.speed, t, dt, s === 'pursue' || s === 'circle');
    const ph = t * 1.0 + n.id * 0.37;
    const act = s === 'act' || s === 'walk' || s === 'surge' || s === 'calm';
    if (act) {
      const role = n.role;
      if (role === 'chant' || (s === 'surge' && n.id % 3 === 0)) {
        const beat = Math.sin(t * 5.2 + (n.group || 0)) ;
        P.shRX = -2.4 + beat * 0.35; P.elR = -0.5 - beat * 0.3; P.shRZ = -0.15;
        P.hdX = -0.15; P.y += Math.max(0, beat) * 0.03;
      } else if (role === 'flag') {
        P.shRX = -2.5; P.elR = -0.25; P.shRZ = -0.1 + Math.sin(t * 4 + n.id) * 0.45;
        P.itemZ = Math.sin(t * 4 + n.id) * 0.25;
      } else if (role === 'bigflag') {
        const sw = Math.sin(t * 1.6 + n.id);
        P.shRX = -2.85; P.elR = -0.2; P.shLX = -2.6; P.elL = -0.6; P.shLZ = -0.2;
        P.spZ = sw * 0.12; P.itemZ = sw * 0.45; P.spX = -0.05;
      } else if (role === 'placard') {
        const b = Math.sin(t * 3 + n.id);
        P.shRX = -2.75 + b * 0.1; P.elR = -0.15; P.shLX = -2.4; P.elL = -0.9; P.shLZ = -0.35; P.y += b * 0.01;
      } else if (role === 'film') {
        P.shRX = -1.45; P.elR = -0.85; P.shRZ = 0.12; P.hdX = 0.05;
      } else if (role === 'banner') {
        P.shRX = P.shLX = -1.0; P.elR = P.elL = -0.6; P.shLZ = 0.2; P.shRZ = -0.2;
      } else if (role === 'shout') {
        const b = Math.sin(t * 6 + n.id);
        P.shRX = -1.6 + b * 0.25; P.elR = -0.15; P.spX += 0.12; P.hdX = -0.2;
      } else if (role === 'watch') {
        // bystander: arms folded, weight on one leg, head turning
        P.shLX = P.shRX = -0.55; P.elL = P.elR = -2.0; P.shLZ = -0.42; P.shRZ = 0.42; P.hdY = Math.sin(t * 0.4 + n.id) * 0.5;
      } else if (role === 'photo') {
        // photographer: camera held up to the face, both hands
        P.shRX = -1.25; P.elR = -1.75; P.shRZ = 0.32; P.shLX = -1.25; P.elL = -1.75; P.shLZ = -0.32; P.hdX = 0.05;
      } else if (role === 'cower') {
        // frightened passer-by: hands to the face or head, hunched, glancing about
        const v = n.id % 3;
        if (v === 0) { P.shRX = P.shLX = -1.35; P.elR = P.elL = -2.3; P.shRZ = 0.35; P.shLZ = -0.35; }
        else if (v === 1) { P.shRX = P.shLX = -2.4; P.elR = P.elL = -2.0; P.shRZ = 0.25; P.shLZ = -0.25; }
        else { P.shRX = -1.3; P.elR = -2.3; P.shRZ = 0.35; P.shLX = -0.5; P.elL = -1.6; P.shLZ = -0.5; }
        P.spX += 0.12; P.hdY = Math.sin(t * 2.2 + n.id) * 0.45;
      } else if (role === 'clap') {
        const b = Math.sin(t * 9 + n.id);
        P.shRX = P.shLX = -1.1; P.elR = P.elL = -1.0; P.shLZ = -0.35 + b * 0.2; P.shRZ = 0.35 - b * 0.2;
      }
    } else if (s === 'flee') {
      if (n.temperament === 'civilian') {
        if (n.id % 2) { P.shLX = P.shRX = -2.5; P.elL = P.elR = -2.2; } // both hands over the head
        P.hdY = Math.sin(t * 2.6 + n.id) * 0.5; // looking back over the shoulder
      } else if (n.id % 4 === 0) { P.shLX = -2.6; P.elL = -2.2; } // arm shielding head
      P.spX = 0.3;
      if (n.rig.itemType === 'bigflag' || n.rig.itemType === 'banner') { P.shRX = -1.2; }
    } else if (s === 'pursue' || s === 'circle') {
      P.elR = P.elL = -1.6; P.shRX = P.shLX = -0.5; P.shLZ = 0.2; P.shRZ = -0.2;
      if (n.attackStyle === 'thrower' && rig.itemType !== 'none') { P.shRX = -0.2; P.elR = -0.4; }
    } else if (s === 'atk_wind') {
      rate = 16;
      if (n.attackKind === 'shove') { P.shRX = P.shLX = -0.8; P.elR = P.elL = -1.9; P.spX = -0.1; P.shLZ = -0.2; P.shRZ = 0.2; }
      else { P.shRX = 0.5; P.shRZ = -0.5; P.elR = -2.2; P.spY = -0.55; P.shLX = -1.1; P.elL = -1.4; }
      P.knL = P.knR = 0.3; P.y = -0.05;
    } else if (s === 'atk_strike' || s === 'atk_rec') {
      rate = s === 'atk_strike' ? 30 : 8;
      if (n.attackKind === 'shove') { P.shRX = P.shLX = -1.5; P.elR = P.elL = -0.1; P.spX = 0.35; P.shLZ = -0.12; P.shRZ = 0.12; }
      else { P.shRX = -1.55; P.shRZ = 0.15; P.elR = -0.05; P.spY = 0.5; P.spX = 0.2; P.shLX = -0.4; P.elL = -1.5; }
      P.hpLX = -0.5; P.knL = 0.4; P.hpRX = 0.3;
    } else if (s === 'throw_prep') {
      crouch(P, k01(n.st / 0.35)); P.shRX = -0.9; P.elR = -0.2;
    } else if (s === 'throw_wind') {
      rate = 14;
      P.shRX = -2.7; P.shRZ = -0.35; P.elR = -1.7; P.spY = -0.6; P.spX = -0.15; P.shLX = -1.4; P.shLZ = 0.1;
      P.hpLX = -0.4; P.knL = 0.2; P.hpRX = 0.25;
    } else if (s === 'throw_rel') {
      rate = 26;
      P.shRX = -0.6; P.shRZ = 0.25; P.elR = -0.1; P.spY = 0.55; P.spX = 0.4; P.shLX = -0.2;
      P.hpLX = -0.6; P.knL = 0.5; P.hpRX = 0.35;
    } else if (s === 'stagger') {
      rate = 18;
      const b = n.staggerBack ? -1 : 1;
      P.spX = 0.4 * b; P.hdX = 0.4 * b; P.shLZ = 0.9; P.shRZ = -0.9; P.shLX = -0.6; P.shRX = -0.4;
      P.elL = P.elR = -0.6; P.knL = 0.3 + Math.sin(n.st * 18) * 0.2; P.knR = 0.3 - Math.sin(n.st * 18) * 0.2;
      P.hpLX = Math.sin(n.st * 14) * 0.4; P.hpRX = -P.hpLX;
    } else if (s === 'down') {
      rate = n.st < 0.5 ? 9 : 4;
      lying(P, n.fallDir, 1, t);
    } else if (s === 'recover') {
      rate = 10;
      const k = n.st / n.dur;
      if (k < 0.5) { lying(P, n.fallDir, 1 - k * 2, t); crouch(P, k * 2); P.tiltX = n.fallDir * 1.5 * (1 - k * 2); P.shLX = -1.0; P.shRX = -1.0; }
      else { crouch(P, (1 - k) * 2); P.shLX = -0.4; P.shRX = -0.4; }
    } else if (s === 'surrender') {
      P.shRX = P.shLX = -2.9; P.elR = P.elL = -0.5; P.shLZ = 0.25; P.shRZ = -0.25; P.hdX = 0.25;
    } else if (s === 'arrested') {
      rate = 6;
      P.hpLX = P.hpRX = 0.0; P.knL = P.knR = 1.55; P.y = -0.42;
      P.shLX = P.shRX = 0.55; P.elL = P.elR = -1.2; P.shLZ = -0.15; P.shRZ = 0.15; P.hdX = 0.35; P.spX = 0.15;
    } else if (s === 'loot_move') {
      if (rig.itemType === 'loot') { P.shRX = P.shLX = -0.75; P.elR = P.elL = -1.25; P.shLZ = -0.25; P.shRZ = 0.25; }
      else if (rig.itemType === 'bottle') { P.shRX = -0.3; P.elR = -0.8; }
    } else if (s === 'loot_smash') {
      rate = 16;
      const ph2 = (n.st * 1.6 + n.id * 0.3) % 1, k = Math.sin(ph2 * Math.PI * 2);
      if (n.id % 2 === 0) {
        // front kicks at the shutter
        const kk = Math.max(0, k);
        P.hpRX = -1.3 * kk; P.knR = 0.9 * (1 - kk) + 0.2; P.spX = -0.15 * kk; P.shLX = -0.6; P.shRX = -0.4; P.elL = P.elR = -1.2;
      } else {
        // overhand blows at the glass
        P.shRX = -1.9 - k * 0.9; P.elR = -0.6 - Math.max(0, k) * 0.8; P.spY = -0.25 * k; P.spX = 0.1 + 0.15 * Math.max(0, -k); P.shLX = -0.9; P.elL = -1.2;
      }
    } else if (s === 'loot_grab') {
      crouch(P, 0.75); P.shRX = P.shLX = -1.1; P.elR = P.elL = -0.4; P.hdX = 0.3;
    } else if (s === 'arson_light') {
      P.shRX = -0.9; P.elR = -1.5; P.shLX = -0.95; P.elL = -1.5; P.shLZ = -0.35; P.shRZ = 0.35; P.hdX = 0.35;
    } else if (s === 'arson_wind') {
      rate = 10;
      P.shRX = -2.8; P.shRZ = -0.3; P.elR = -1.8; P.spY = -0.65; P.spX = -0.2; P.shLX = -1.35; P.shLZ = 0.1; P.elL = -0.2;
      P.hpLX = -0.45; P.knL = 0.25; P.hpRX = 0.3;
    } else if (s === 'arson_throw') {
      rate = 26;
      P.shRX = -0.5; P.shRZ = 0.25; P.elR = -0.05; P.spY = 0.6; P.spX = 0.45; P.shLX = -0.2;
      P.hpLX = -0.6; P.knL = 0.5; P.hpRX = 0.35;
    } else if (s === 'bomb_retrieve') {
      crouch(P, k01(n.st / 0.4) * 0.9); P.shRX = -0.8; P.elR = -0.4; P.shLX = -0.7; P.elL = -0.6; P.hdX = 0.4;
    } else if (s === 'bomb_light') {
      P.shRX = -0.9; P.elR = -1.5; P.shLX = -0.95; P.elL = -1.5; P.shLZ = -0.35; P.shRZ = 0.35; P.hdX = 0.35;
      P.y += Math.sin(t * 20) * 0.003;
    } else if (s === 'bomb_wind') {
      rate = 10;
      const tr = Math.sin(t * 30) * 0.03;
      P.shRX = -2.8 + tr; P.shRZ = -0.3; P.elR = -1.8; P.spY = -0.65; P.spX = -0.2; P.shLX = -1.35; P.shLZ = 0.1; P.elL = -0.2;
      P.hpLX = -0.45; P.knL = 0.25; P.hpRX = 0.3;
    } else if (s === 'bomb_throw') {
      rate = 26;
      P.shRX = -0.5; P.shRZ = 0.25; P.elR = -0.05; P.spY = 0.6; P.spX = 0.45; P.shLX = -0.2;
      P.hpLX = -0.6; P.knL = 0.5; P.hpRX = 0.35;
    }
    // face: mouth and smile follow what the person is doing
    {
      const beat = Math.max(0, Math.sin(t * 5.2 + (n.group || 0)));
      const jit = 0.5 + 0.5 * Math.sin(t * 13 + n.id * 1.7) * Math.sin(t * 7.3 + n.id);
      if (s === 'act' || s === 'walk' || s === 'surge' || s === 'calm') {
        const r = n.role;
        if (r === 'cower') { P.mouth = 0.3 + jit * 0.45; P.brow = -1; P.smile = 0; }
        else if (r === 'chant' || r === 'flag' || r === 'bigflag' || r === 'placard' || r === 'banner' || s === 'surge') { P.mouth = beat * 0.85; P.smile = n.temperament === 'peaceful' ? 0.25 : 0; P.brow = n.temperament === 'peaceful' ? 0 : 0.4; }
        else if (r === 'shout') { P.mouth = 0.45 + jit * 0.5; P.brow = 0.7; }
        else if (r === 'clap') { P.mouth = beat * 0.5; P.smile = 0.6; }
        else { P.mouth = jit > 0.75 ? (jit - 0.75) * 1.6 : 0; P.smile = (n.id % 3 === 0) ? 0.35 : 0.1; } // chatting
      } else if (s === 'flee') { P.mouth = n.temperament === 'civilian' ? 0.6 + jit * 0.4 : 0.45 + jit * 0.35; P.brow = -1; }
      else if (s === 'pursue' || s === 'circle' || s.startsWith('atk') || s.startsWith('throw') || s.startsWith('bomb') || s === 'loot_smash' || s.startsWith('arson')) { P.mouth = 0.35 + jit * 0.6; P.brow = 1; }
      else if (s === 'stagger') { P.mouth = 0.85; P.brow = -1; }
      else if (s === 'down' || s === 'recover') { P.mouth = 0.3 + jit * 0.2; P.brow = -0.8; }
      else if (s === 'surrender') { P.mouth = 0.15; P.brow = -0.6; }
    }
    applyPose(rig, P, dt, rate);
    // lying bodies sit slightly above ground
    rig.root.position.y = n.pos.y + (s === 'down' ? 0.12 : s === 'recover' ? 0.12 * Math.max(0, 1 - n.st / (n.dur * 0.5)) : 0);
  }

  _updatePolice(dt, t, player) {
    const hostileNear = this.npcs.some((n) => this.isThreat(n) && n.pos.z > 115);
    for (const p of this.police) {
      const rig = p.rig;
      const P = newPose();
      baseLayer(P, rig, 0, t + p.pos.x, dt, true);
      if (p.role !== 'injured') this._copCombat(p, P, dt);
      if (p.role === 'line' || p.role === 'squad') {
        const k = hostileNear ? 1 : 0.5;
        rig.shieldBlend += (k - rig.shieldBlend) * Math.min(1, dt * 4);
        updateShield(rig, rig.shieldBlend);
        P.shLX = -1.3 * rig.shieldBlend; P.elL = -0.5 * rig.shieldBlend; P.shRX = -0.3; P.elR = -0.5;
        if (p.flinch > 0) { p.flinch -= dt; P.spX = -0.25; P.hdX = -0.2; }
        // look toward nearest threat
        let best = null, bd = 400;
        for (const n of this.npcs) if (this.isThreat(n)) { const d = n.pos.distanceToSquared(p.pos); if (d < bd) { bd = d; best = n; } }
        const want = best ? headingTo(p.pos, best.pos) : Math.PI;
        if (!p.atk) p.heading = angleLerp(p.heading, want, 1 - Math.exp(-dt * 3));
      } else if (p.role === 'injured') {
        P.hpLX = P.hpRX = -1.5; P.knL = 0.2; P.knR = 1.2; P.y = -0.62; P.spX = -0.3; P.shLX = -0.4; P.shLZ = 0.4; P.hdX = 0.2;
        updateShield(rig, 0);
        if (rig.shield) rig.shield.visible = false;
      } else {
        updateShield(rig, 1);
        P.shLX = -1.3; P.elL = -0.5;
        if (!p.atk) p.heading = angleLerp(p.heading, headingTo(p.pos, player.pos), 1 - Math.exp(-dt * 1.5));
      }
      if (p.atk) this._copPose(p, P);
      const pd = p.pos.distanceTo(player.pos);
      rig.root.visible = pd < 70;
      const sh = pd < 16;
      if (sh !== p.shadow) { p.shadow = sh; for (const m of rig.meshes) m.castShadow = sh; }
      if (!rig.root.visible) continue;
      applyPose(rig, P, dt, p.atk ? 26 : 8);
      rig.root.position.copy(p.pos);
      rig.root.rotation.y = p.heading;
    }
  }

  // Officers defend themselves: step out towards an aggressor that comes close,
  // wind up and strike with the baton, then fall back to their post.
  _copCombat(p, P, dt) {
    if (!p.home) p.home = p.pos.clone();
    p.cool = Math.max(0, (p.cool || 0) - dt);
    let target = null, bd = 4.2 * 4.2;
    for (const n of this.query(p.pos.x, p.pos.z, 4.5, [])) {
      if (n.id === undefined || !this.isThreat(n) || n.state === 'down' || n.state === 'stagger') continue;
      const d = n.pos.distanceToSquared(p.pos); if (d < bd) { bd = d; target = n; }
    }
    if (p.atk) {
      p.atk.t += dt;
      const tg = p.atk.target;
      p.heading = angleLerp(p.heading, headingTo(p.pos, tg.pos), 1 - Math.exp(-dt * 10));
      if (p.atk.phase === 'wind' && p.atk.t > 0.28) {
        p.atk.phase = 'strike'; p.atk.t = 0;
        this.game.audio.swing(p.pos);
        const dx = tg.pos.x - p.pos.x, dz = tg.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d < 2.2 && tg.state !== 'down') {
          const dir = new THREE.Vector3(dx / d, 0, dz / d);
          this.copHit(tg, dir);
        }
      } else if (p.atk.phase === 'strike' && p.atk.t > 0.16) { p.atk.phase = 'rec'; p.atk.t = 0; }
      else if (p.atk.phase === 'rec' && p.atk.t > 0.35) { p.atk = null; p.cool = 0.9 + this.rng() * 1.2; }
      return;
    }
    if (target && p.cool <= 0) {
      const d = Math.sqrt(bd);
      if (d > 1.9) {
        // step towards the aggressor, but don't leave the post by more than ~2.5 m
        const step = Math.min(dt * 2.2, d - 1.6);
        const nx = p.pos.x + (target.pos.x - p.pos.x) / d * step, nz = p.pos.z + (target.pos.z - p.pos.z) / d * step;
        if (Math.hypot(nx - p.home.x, nz - p.home.z) < 2.5 && !this.world.blocked(nx, nz, 0.3)) { p.pos.x = nx; p.pos.z = nz; P.knL = 0.3; P.knR = 0.15; }
      } else p.atk = { phase: 'wind', t: 0, target };
    } else if (!target) {
      // drift back to the post
      const dx = p.home.x - p.pos.x, dz = p.home.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.05) { const st = Math.min(d, dt * 1.2); p.pos.x += dx / d * st; p.pos.z += dz / d * st; }
    }
  }

  _copPose(p, P) {
    const a = p.atk;
    if (a.phase === 'wind') { P.shRX = -2.6; P.shRZ = -0.45; P.elR = -1.35; P.spY = -0.45; P.spX = -0.05; }
    else if (a.phase === 'strike') { P.shRX = -0.55; P.shRZ = 0.32; P.elR = -0.15; P.spY = 0.5; P.spX = 0.25; P.hpLX = -0.5; P.knL = 0.35; }
    else { P.shRX = -0.6; P.elR = -0.6; P.spY = 0.15; }
  }

  // a police baton strike: staggers the aggressor and drives them back; repeated
  // hits can put them down (counts as neutralised, with a smaller assist score)
  copHit(n, dir) {
    const g = this.game;
    g.audio.impact(n.pos, false);
    g.effects.impact(n.pos.clone().setY(n.pos.y + 1.3));
    n.knock.copy(dir).multiplyScalar(3.6);
    n.copHits = (n.copHits || 0) + 1;
    if (n.copHits >= 4 && this.rng() < 0.35 && !n.script) {
      n.fallDir = -1;
      this.setState(n, 'down', 4 + this.rng() * 2);
      if (!n.neutralized) { n.neutralized = true; g.missions.stats.neutralized++; g.missions.addScore(50, 'Officer assist'); }
    } else {
      this.setState(n, 'stagger', 0.6);
      n.staggerBack = true;
    }
    this.disturb(n.pos, 6, 0.35, 'violence', n);
  }

  // Helpers used by missions --------------------------------------------------
  nearest(pos, filter, maxD = 999) {
    let best = null, bd = maxD * maxD;
    for (const n of this.npcs) {
      if (n.state === 'gone' || !filter(n)) continue;
      const d = n.pos.distanceToSquared(pos);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  threats() { return this.npcs.filter((n) => this.isThreat(n)); }

  arrestable(pos) {
    return this.nearest(pos, (n) => n.neutralized && !n.arrested && (n.state === 'down' || n.state === 'recover' || n.state === 'surrender'), 2.3);
  }

  arrest(n) {
    n.arrested = true;
    clearItem(n.rig);
    this.setState(n, 'arrested');
    n.vel.set(0, 0, 0);
  }

  randomCrowdPos() {
    const n = this.npcs[Math.floor(Math.random() * this.npcs.length)];
    return n.pos;
  }
}
