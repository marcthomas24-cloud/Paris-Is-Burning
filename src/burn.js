// Vehicle fires: parked cars and vans that really catch fire, burn out and stay burnt.
//
// The world registers every vehicle it builds (world.vehicles) and tags its vertices with the
// vehicle's id (attribute `vid` = id + 1; 0 on everything else). A one-pixel-high data texture
// holds each vehicle's burn state, R = char (paint blistering to black, glass darkening, tyres
// gone so it settles onto its rims) and G = glow (embers in the bodywork while it burns). The
// vehicle materials read it in their shaders, so setting a car alight is one texel write: no
// geometry changes, no extra draw call, and the patch compiles with the materials at load.
//
// Lifecycle: ignition at the engine bay (a small fire, the alarm) -> fully alight (the cabin,
// a big fire and a thick black column; it can spread to the next car along the kerb) ->
// smouldering (low flames, heavy smoke) -> a burnt shell with a thin wisp of smoke and a scorch
// mark on the road. A shell never turns back into a car until the level restarts.
// All of it is scenery: none of these fires does damage (see the fairness rules in the README).
import * as THREE from 'three';

export const BURN = {
  max: 1024,                                    // vehicles the burn texture can hold
  ignite: [4, 7], blaze: [25, 40], smoulder: [45, 70], // seconds per stage
  blazeScale: 1.9, spreadEvery: 3, spreadP: 0.07, spreadGap: 2.5,
  arenaMargin: 6, hazardR: 7, scorchMax: 96,
};

// the texture is made with the system (VehicleFires), inside main's quietly(): a new texture draws
// a random uuid, and seeded runs must not see that
const data = new Uint8Array(BURN.max * 4);
let burnTexture = null;
const uniforms = { burnTex: { value: null }, burnTime: { value: 0 } };

// The burn read, added to a vehicle material. Every mesh drawn with one of these materials
// carries `vid` (World._flush fills 0 where a geometry has none).
export function patchVehicleMaterial(m) {
  m.userData.vburn = true;
  m.customProgramCacheKey = () => 'vburn1';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.burnTex = uniforms.burnTex;
    sh.uniforms.burnTime = uniforms.burnTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute float vid;
uniform sampler2D burnTex;
uniform float burnTime;
varying vec2 vBurn;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vBurn = vec2(0.0);
if (vid > 0.5) {
  vec4 bt = texture2D(burnTex, vec2((vid - 0.5) / ${BURN.max}.0, 0.5));
  vBurn = bt.rg;
  transformed.y -= 0.1 * smoothstep(0.75, 1.0, bt.r); // the tyres burn away: it settles onto its rims
  // embers in patches of the bodywork, flickering: most of the car stays dark
  float patchy = sin(position.x * 9.0 + burnTime * 1.3) * sin(position.z * 7.0 - burnTime * 0.9) * sin(position.y * 11.0 + 1.7);
  vBurn.y *= smoothstep(0.05, 0.6, patchy) * (0.7 + 0.3 * sin(burnTime * 7.0 + position.x * 3.1 + position.z * 2.3));
}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec2 vBurn;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.012, 0.011, 0.010), vBurn.x);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 1.0, vBurn.x);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
metalnessFactor *= 1.0 - vBurn.x;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance = totalEmissiveRadiance * (1.0 - vBurn.x) + vec3(1.0, 0.3, 0.04) * max(vBurn.y, 0.0) * 0.9;`);
  };
}

// a soft, blotchy scorch mark for the road under a burnt-out car
function scorchTexture() {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) {
    const a = rnd() * 6.28, r = Math.pow(rnd(), 0.8) * 26, x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r * 0.75, rad = 10 + rnd() * (60 - 10 - Math.max(Math.abs(x - 64), Math.abs(y - 64))) * 0.5; // stays inside the tile: no hard edge
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(0,0,0,0.32)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}

const R = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));

export class VehicleFires {
  constructor(game) {
    this.game = game;
    burnTexture = new THREE.DataTexture(data, BURN.max, 1, THREE.RGBAFormat);
    burnTexture.magFilter = THREE.NearestFilter; burnTexture.minFilter = THREE.NearestFilter;
    uniforms.burnTex.value = burnTexture;
    this.burning = new Map(); // vehicle id -> state
    this.wisps = [];          // smoke left over burnt-out shells (world.smokes entries)
    // scorch marks: one instanced mesh for all of them (one draw call). One instance stays far
    // below the road from the start so its program compiles at load, not at the first fire.
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: scorchTexture(), color: 0x000000, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    this.scorch = new THREE.InstancedMesh(geo, mat, BURN.scorchMax);
    this.scorch.frustumCulled = false; this.scorch.renderOrder = 1;
    game.scene.add(this.scorch);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
    this.reset();
  }

  get vehicles() { return this.game.world.vehicles; }

  // every vehicle back to the state the world built it in
  reset() {
    const fx = this.game.effects, w = this.game.world;
    for (const b of this.burning.values()) if (b.fire) fx.removeFire(b.fire);
    this.burning.clear();
    for (const s of this.wisps) { const i = w.smokes.indexOf(s); if (i >= 0) w.smokes.splice(i, 1); }
    this.wisps.length = 0;
    for (const v of this.vehicles) if (v.state === 'burning' || v.state === 'shell') v.state = 'ok';
    data.fill(0); burnTexture.needsUpdate = true;
    this.scorchN = 0;
    this._m.makeScale(0.001, 0.001, 0.001).setPosition(0, -500, 0);
    this.scorch.setMatrixAt(0, this._m); this.scorch.count = 1; this.scorch.instanceMatrix.needsUpdate = true;
    this.ignited = 0; this.spread = 0;
  }

  // may this vehicle catch fire now? Never in a boss arena or beside a Level 3 hazard (those have
  // their own scripted fire and warning)
  canIgnite(v) {
    if (!v || !v.burnable || v.state !== 'ok') return false;
    const g = this.game, A = g.crowd.arena;
    if (A && Math.hypot(v.x - A.x, v.z - A.z) < A.r + BURN.arenaMargin) return false;
    const hz = g.missions && g.missions.hz;
    if (hz && hz.list && hz.list.some((h) => h.pos && Math.hypot(v.x - h.pos[0], v.z - h.pos[1]) < BURN.hazardR)) return false;
    return true;
  }

  // the burnable vehicle nearest a point, within r
  nearest(x, z, r = 6) {
    let best = null, bd = r;
    for (const v of this.vehicles) { const d = Math.hypot(v.x - x, v.z - z); if (d < bd && this.canIgnite(v)) { bd = d; best = v; } }
    return best;
  }

  _fwd(v) { return new THREE.Vector3(Math.sin(v.ry), 0, Math.cos(v.ry)); }

  // set a vehicle alight. blast: the ignition is an explosion (the scheduler's car fires);
  // otherwise it catches quietly (spreading from a neighbour)
  ignite(v, { blast = false } = {}) {
    if (!this.canIgnite(v)) return false;
    const g = this.game, fx = g.effects;
    v.state = 'burning';
    const engine = new THREE.Vector3(v.x, 0.9, v.z).addScaledVector(this._fwd(v), v.L / 2 - 0.7);
    const fire = fx.addFire(engine, 0.7, 1.0, { own: true });
    this.burning.set(v.id, { v, stage: 'ignite', t: 0, dur: R(...BURN.ignite), fire, spreadT: BURN.spreadEvery, char: 0, glow: 0 });
    if (blast) fx.explosion(engine, 0.8);
    else { fx.flash(engine.clone().setY(1.4), 0xff7a20, 10, 0.6, 12); g.audio.molotov(engine, 0.5); }
    g.audio.alarm(engine, 14 + Math.random() * 10);
    this.ignited++;
    return true;
  }

  _scorchAt(v) {
    if (this.scorchN + 1 >= BURN.scorchMax) return;
    const i = ++this.scorchN;
    this._q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), v.ry);
    this._s.set(v.W + 1.6, 1, v.L + 1.8);
    this._p.set(v.x, this.game.world.groundHeight(v.x, v.z) + 0.02, v.z);
    this._m.compose(this._p, this._q, this._s);
    this.scorch.setMatrixAt(i, this._m);
    this.scorch.count = i + 1; this.scorch.instanceMatrix.needsUpdate = true;
  }

  update(dt) {
    uniforms.burnTime.value += dt;
    if (!this.burning.size) return;
    const g = this.game, fx = g.effects, w = g.world;
    for (const [id, b] of this.burning) {
      const v = b.v, f = b.fire;
      b.t += dt;
      const k = b.t / b.dur;
      if (b.stage === 'ignite') {
        f.scale = 0.7 + 0.6 * k; f.smoke.rate = 1 + k; b.char = 0.25 * k; b.glow = 0.5 * k;
        if (k >= 1) {
          // the cabin goes up: the fire moves to the middle of the car
          b.stage = 'blaze'; b.t = 0; b.dur = R(...BURN.blaze);
          f.pos.set(v.x, 1.1, v.z); f.smoke.pos.set(v.x, 2.1, v.z); f.smoke.scale = 1.8;
          fx.flash(f.pos.clone().setY(1.6), 0xff8a30, 18, 0.5, 18);
          this._scorchAt(v);
        }
      } else if (b.stage === 'blaze') {
        f.scale = lerp(1.3, BURN.blazeScale, b.t / 3); f.smoke.rate = 2.6;
        b.char = 0.25 + 0.75 * Math.min(1, b.t / 14); b.glow = 1;
        b.spreadT -= dt;
        if (b.spreadT <= 0) { b.spreadT = BURN.spreadEvery; this._spreadFrom(v); }
        if (k >= 1) { b.stage = 'smoulder'; b.t = 0; b.dur = R(...BURN.smoulder); }
      } else if (b.stage === 'smoulder') {
        f.scale = lerp(1.4, 0.45, b.t / 8); f.smoke.rate = lerp(2.2, 1.0, k); f.smoke.scale = lerp(1.8, 1.2, k);
        b.char = 1; b.glow = lerp(0.8, 0.12, k);
        if (k >= 1) {
          // burnt out: the flames go, a thin wisp of smoke stays
          fx.removeFire(f);
          const s = { pos: new THREE.Vector3(v.x, 1.6, v.z), rate: 0.35, scale: 0.8 };
          w.smokes.push(s); this.wisps.push(s);
          v.state = 'shell'; b.glow = 0;
          this.burning.delete(id);
        }
      }
      data[v.id * 4] = Math.round(b.char * 255);
      data[v.id * 4 + 1] = Math.round(b.glow * 255);
    }
    burnTexture.needsUpdate = true;
  }

  // a car fully alight can set the next one along the kerb going
  _spreadFrom(v) {
    for (const o of this.vehicles) {
      if (o === v || Math.abs(o.x - v.x) > 12 || Math.abs(o.z - v.z) > 12) continue;
      if (Math.hypot(o.x - v.x, o.z - v.z) > (v.L + o.L) / 2 + BURN.spreadGap) continue;
      if (Math.random() < BURN.spreadP && this.ignite(o)) this.spread++;
    }
  }

  // __fireBudget / tests
  _data() { return data; }
  summary() {
    const n = { ok: 0, burning: 0, shell: 0, burnt: 0, other: 0 };
    for (const v of this.vehicles) n[v.state in n ? v.state : 'other']++;
    return { vehicles: this.vehicles.length, burnable: this.vehicles.filter((v) => v.burnable).length, ...n, ignited: this.ignited, spread: this.spread, scorch: this.scorchN };
  }
}
