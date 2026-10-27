// Billboard particle systems (instanced quads), fire lights, embers, debris,
// projectiles, explosions and firework mortars.
import * as THREE from 'three';

// ---------------------------------------------------------------- textures
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

// 2x2 atlas of cloudy smoke puffs built from many soft blobs (layered density)
function smokeAtlas() {
  const S = 256, H = 128;
  const [c, ctx] = canvas(S, S);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * H, oy = Math.floor(k / 2) * H;
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, H, H); ctx.clip();
    for (let i = 0; i < 70; i++) {
      const a = rnd() * 6.28, r = Math.pow(rnd(), 0.7) * 34;
      const x = ox + 64 + Math.cos(a) * r, y = oy + 64 + Math.sin(a) * r * 0.9;
      const rad = 10 + rnd() * 26 * (1 - r / 50);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const al = 0.1 + rnd() * 0.14;
      g.addColorStop(0, `rgba(255,255,255,${al})`); g.addColorStop(0.6, `rgba(255,255,255,${al * 0.5})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // soften the outer edge
    const fade = ctx.createRadialGradient(ox + 64, oy + 64, 30, ox + 64, oy + 64, 64);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = fade; ctx.fillRect(ox, oy, H, H);
    ctx.restore(); ctx.globalCompositeOperation = 'source-over';
  }
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}

function fireAtlas() {
  const S = 256, H = 128;
  const [c, ctx] = canvas(S, S);
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * H, oy = Math.floor(k / 2) * H;
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, H, H); ctx.clip();
    if (k === 3) {
      // round glow (sparks / flash)
      const g = ctx.createRadialGradient(ox + 64, oy + 64, 0, ox + 64, oy + 64, 62);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(ox, oy, H, H);
    } else {
      // flame tongue: tall teardrop of blobs
      for (let i = 0; i < 40; i++) {
        const tY = rnd();
        const x = ox + 64 + (rnd() - 0.5) * 40 * (1 - tY * 0.7), y = oy + 110 - tY * 90;
        const rad = (22 - tY * 16) * (0.6 + rnd() * 0.6);
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
    ctx.restore();
  }
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}

// ---------------------------------------------------------------- particles
class ParticleSystem {
  constructor(scene, max, additive, tex) {
    this.max = max;
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    this.off = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.sz = new Float32Array(max * 3); // size, rotation, frame
    geo.setAttribute('iOff', new THREE.InstancedBufferAttribute(this.off, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('iCol', new THREE.InstancedBufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('iSz', new THREE.InstancedBufferAttribute(this.sz, 3).setUsage(THREE.DynamicDrawUsage));
    geo.instanceCount = 0;
    this.geo = geo;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 }, sunDir: { value: new THREE.Vector3(-0.4, 0.8, -0.4) }, uTint: { value: new THREE.Color(1, 1, 1) } },
      vertexShader: `
        attribute vec3 iOff; attribute vec4 iCol; attribute vec3 iSz;
        varying vec2 vUv; varying vec4 vCol; varying float vFog; varying float vNear;
        uniform float fogDensity;
        void main(){
          float f = iSz.z;
          vUv = uv * 0.5 + vec2(mod(f, 2.0), floor(f / 2.0)) * 0.5;
          vCol = iCol;
          vec4 mv = modelViewMatrix * vec4(iOff, 1.0);
          float c = cos(iSz.y), s = sin(iSz.y);
          vec2 p = vec2(position.x*c - position.y*s, position.x*s + position.y*c) * iSz.x;
          mv.xy += p;
          float d = -mv.z;
          vFog = 1.0 - exp(-fogDensity*fogDensity*d*d);
          // fade billboards that are about to fill the screen (overdraw + clipping)
          vNear = smoothstep(0.6, 2.5 + iSz.x * 0.25, d);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map; uniform vec3 fogColor; uniform vec3 uTint;
        varying vec2 vUv; varying vec4 vCol; varying float vFog; varying float vNear;
        void main(){
          vec4 t = texture2D(map, vUv);
          ${additive
    ? `vec4 c = vec4(vCol.rgb, vCol.a * t.a * vNear);
          c.rgb *= c.a * 1.6; c.rgb *= (1.0 - vFog * 0.7);`
    : `// fake self-shadowing: puffs are lit from above, darker underneath
          float lit = mix(0.72, 1.12, fract(vUv.y * 2.0));
          vec4 c = vec4(vCol.rgb * lit * uTint, vCol.a * t.a * vNear); // uTint: ambient level of the lighting preset
          c.rgb = mix(c.rgb, fogColor, vFog * 0.6);`}
          if (c.a < 0.003) discard;
          gl_FragColor = c;
        }`,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mat = mat;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 6 : 5;
    scene.add(this.mesh);
    this.p = [];
  }
  spawn(o) {
    if (this.p.length >= this.max) this.p.splice(0, 1 + Math.floor(this.max * 0.02));
    const q = { age: 0, rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.8, drag: 0.5, grow: 1, frame: o.frame ?? Math.floor(Math.random() * 3.99), ...o, pos: o.pos.clone(), vel: o.vel ? o.vel.clone() : new THREE.Vector3() };
    this.p.push(q);
    return q;
  }
  update(dt, wind, fog, glowFn) {
    this.mat.uniforms.fogColor.value.copy(fog.color);
    this.mat.uniforms.fogDensity.value = fog.density;
    let n = 0;
    let w = 0;
    for (let i = 0; i < this.p.length; i++) { const q = this.p[i]; q.age += dt; if (q.age < q.life) this.p[w++] = q; }
    this.p.length = w;
    const tc = new THREE.Color();
    for (const q of this.p) {
      const k = q.age / q.life;
      q.vel.y += (q.buoy || 0) * dt - (q.grav || 0) * dt;
      q.vel.multiplyScalar(Math.exp(-q.drag * dt));
      q.pos.addScaledVector(q.vel, dt);
      if (wind) q.pos.addScaledVector(wind, dt * (q.windK ?? 1) * Math.min(1, 0.3 + q.pos.y * 0.12));
      if (q.grav && q.pos.y < 0.03) { q.pos.y = 0.03; q.vel.y *= -0.3; q.vel.x *= 0.5; q.vel.z *= 0.5; }
      q.rot += q.spin * dt;
      const size = q.size * (1 + (q.grow - 1) * (1 - (1 - k) * (1 - k)));
      const fadeIn = Math.min(1, q.age / (q.fadeIn || 0.08));
      const a = q.alpha * fadeIn * (q.fadeCurve === 'late' ? 1 - k * k : 1 - k);
      tc.copy(q.color); if (q.color2) tc.lerp(q.color2, Math.min(1, k * (q.colorK || 1)));
      if (q.glow) { const gl = q.glow * Math.max(0, 1 - q.age / (q.glowT || 1.5)); tc.r += gl * 0.55; tc.g += gl * 0.22; tc.b += gl * 0.05; }
      this.off[n * 3] = q.pos.x; this.off[n * 3 + 1] = q.pos.y; this.off[n * 3 + 2] = q.pos.z;
      this.col[n * 4] = tc.r; this.col[n * 4 + 1] = tc.g; this.col[n * 4 + 2] = tc.b; this.col[n * 4 + 3] = a;
      this.sz[n * 3] = size; this.sz[n * 3 + 1] = q.rot; this.sz[n * 3 + 2] = q.frame;
      n++;
    }
    this.geo.instanceCount = n;
    for (const k of ['iOff', 'iCol', 'iSz']) { const at = this.geo.attributes[k]; at.needsUpdate = true; at.updateRanges && (at.clearUpdateRanges(), at.addUpdateRange(0, n * at.itemSize)); }
  }
  clear() { this.p.length = 0; }
}

const C = (r, g, b) => new THREE.Color(r, g, b);
const R = (a, b) => a + Math.random() * (b - a);

export class Effects {
  constructor(scene, world, audio) {
    this.scene = scene; this.world = world; this.audio = audio;
    this.smoke = new ParticleSystem(scene, 2000, false, smokeAtlas());
    this.fire = new ParticleSystem(scene, 1300, true, fireAtlas());
    this.wind = new THREE.Vector3(0.9, 0, -0.5); // steady wind blowing smoke north-east
    this.emitAcc = 0;
    this.lights = [];
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xff8a3a, 0, 14, 1.6);
      scene.add(l);
      this.lights.push({ light: l, t: 0, life: 0, intensity: 0, flicker: true });
    }
    this.fireLights = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xff7a30, 0, 20, 1.5); scene.add(l); return l; });
    this.flames = [];       // temporary area fires {pos, radius, t, life}
    this.projectiles = [];
    this.tracers = [];      // firework mortars
    this.debris = [];
    const dg = new THREE.BoxGeometry(0.07, 0.04, 0.05);
    this.debrisMesh = new THREE.InstancedMesh(dg, new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 1 }), 160);
    this.debrisMesh.count = 0; this.debrisMesh.frustumCulled = false;
    scene.add(this.debrisMesh);
    this.tmpM = new THREE.Matrix4();
    this.smokiness = 0;
    this.dynamicFires = [];
  }

  reset() {
    this.flames.length = 0;
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles.length = 0;
    this.tracers.length = 0;
    this.debris.length = 0;
    this.fire.clear();
    for (const f of this.dynamicFires) { const i = this.world.fires.indexOf(f.fire); if (i >= 0) this.world.fires.splice(i, 1); const j = this.world.smokes.indexOf(f.smoke); if (j >= 0) this.world.smokes.splice(j, 1); }
    this.dynamicFires.length = 0;
    for (const l of this.lights) { l.life = 0; l.light.intensity = 0; }
  }

  flash(pos, color, intensity, life, dist = 16) {
    let slot = this.lights.find((l) => l.life <= l.t) || this.lights.reduce((a, b) => (a.life - a.t < b.life - b.t ? a : b));
    slot.t = 0; slot.life = life; slot.intensity = intensity;
    slot.light.color.set(color); slot.light.position.copy(pos); slot.light.distance = dist;
  }

  dust(pos, n = 8, color = 0x9a9080) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      this.smoke.spawn({ pos: pos.clone().add(new THREE.Vector3(R(-0.2, 0.2), R(0, 0.3), R(-0.2, 0.2))), vel: new THREE.Vector3(R(-1, 1), R(0, 1.2), R(-1, 1)), size: R(0.35, 0.65), grow: 3, life: R(0.9, 1.5), alpha: 0.35, color: c, drag: 2.5, windK: 0.3 });
    }
  }

  impact(pos) {
    for (let i = 0; i < 8; i++) this.fire.spawn({ pos, vel: new THREE.Vector3(R(-1.5, 1.5), R(0, 2.5), R(-1.5, 1.5)), size: 0.06, life: R(0.18, 0.3), alpha: 0.9, color: C(1, 0.9, 0.7), grav: 9, drag: 1, frame: 3 });
    this.dust(pos, 4, 0xbab0a0);
  }

  spawnDebris(pos, n = 10, speed = 4) {
    for (let i = 0; i < n; i++) {
      if (this.debris.length > 150) this.debris.shift();
      this.debris.push({ pos: pos.clone(), vel: new THREE.Vector3(R(-0.5, 0.5) * speed, Math.random() * speed, R(-0.5, 0.5) * speed), rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), spin: Math.random() * 10, life: R(5, 9), age: 0 });
    }
  }

  // Explosion burst (flash, fireball, sparks, expanding smoke, dust ring, debris)
  explosion(pos, s = 1, opts = {}) {
    const p = pos.clone();
    // brief flash
    this.fire.spawn({ pos: p.clone().setY(p.y + 0.8), size: 7 * s, grow: 1.4, life: 0.14, alpha: 1, color: C(1, 0.92, 0.75), frame: 3, drag: 0, fadeIn: 0.01 });
    this.flash(p.clone().setY(p.y + 1.5), 0xffb060, 55 * s, 0.45, 30 * s);
    // fireball
    for (let i = 0; i < 46 * s; i++) {
      const a = Math.random() * 6.28, el = R(0.1, 1.2), sp = R(2, 6) * s;
      this.fire.spawn({ pos: p.clone().add(new THREE.Vector3(0, 0.3, 0)), vel: new THREE.Vector3(Math.cos(a) * Math.cos(el) * sp, Math.sin(el) * sp * 0.9 + 1.5, Math.sin(a) * Math.cos(el) * sp), size: R(0.8, 1.7) * s, grow: 1.8, life: R(0.45, 0.95), alpha: 1, color: C(1, 0.8, 0.45), color2: C(0.75, 0.16, 0.02), drag: 3, buoy: 4, frame: Math.floor(Math.random() * 3) });
    }
    // sparks
    for (let i = 0; i < 40 * s; i++) {
      this.fire.spawn({ pos: p.clone().setY(p.y + 0.3), vel: new THREE.Vector3(R(-7, 7), R(2, 9), R(-7, 7)).multiplyScalar(s), size: R(0.05, 0.1), life: R(0.5, 1.4), alpha: 1, color: C(1, 0.82, 0.45), color2: C(1, 0.35, 0.05), grav: 9.8, drag: 0.6, frame: 3 });
    }
    // expanding smoke cloud
    for (let i = 0; i < 26 * s; i++) {
      const a = Math.random() * 6.28, sp = R(1.5, 5) * s;
      this.smoke.spawn({ pos: p.clone().add(new THREE.Vector3(R(-0.5, 0.5), R(0.4, 1.6), R(-0.5, 0.5))), vel: new THREE.Vector3(Math.cos(a) * sp, R(1, 3.5), Math.sin(a) * sp), size: R(1.2, 2.2) * s, grow: 4, life: R(4, 7), alpha: 0.62, color: C(0.07, 0.065, 0.06), color2: C(0.3, 0.29, 0.28), drag: 1.4, buoy: 0.25, windK: 1, glow: 1.2, glowT: 0.9, fadeCurve: 'late' });
    }
    // dust ring
    for (let i = 0; i < 18 * s; i++) {
      const a = (i / (18 * s)) * 6.28;
      this.smoke.spawn({ pos: p.clone().setY(0.25), vel: new THREE.Vector3(Math.cos(a) * 6 * s, 0.3, Math.sin(a) * 6 * s), size: 0.8 * s, grow: 4, life: R(1.5, 2.5), alpha: 0.35, color: C(0.45, 0.42, 0.38), drag: 3, windK: 0.4 });
    }
    if (!opts.noDebris) this.spawnDebris(p.clone().setY(0.3), Math.round(12 * s), 5 * s);
  }

  // Short-lived pool of fire from a petrol bomb.
  ignite(pos, radius = 3.2, life = 6) {
    this.flames.push({ pos: pos.clone().setY(0.05), radius, t: 0, life });
    this.explosion(pos, radius / 3.2);
    this.flash(pos.clone().setY(0.8), 0xff7a20, 14, life, 18);
    for (let i = 0; i < 18; i++) this.fire.spawn({ pos: pos.clone().setY(0.2), vel: new THREE.Vector3(R(-6, 6), R(0, 3), R(-6, 6)), size: 0.05, life: 0.4, alpha: 1, color: C(0.7, 1, 0.8), grav: 12, drag: 0.5, frame: 3 }); // glass
  }

  // A new persistent fire (car / bin catching fire). Returns handle.
  addFire(pos, scale = 1, smokeRate = 1.5) {
    const fire = { pos: pos.clone(), scale, dynamic: true };
    const smoke = { pos: pos.clone().setY(pos.y + 1), rate: smokeRate, scale: 1 + scale * 0.4 };
    this.world.fires.push(fire); this.world.smokes.push(smoke);
    this.dynamicFires.push({ fire, smoke });
    if (this.dynamicFires.length > 9) {
      const old = this.dynamicFires.shift();
      this.world.fires.splice(this.world.fires.indexOf(old.fire), 1);
      this.world.smokes.splice(this.world.smokes.indexOf(old.smoke), 1);
    }
    return fire;
  }

  // Firework mortar: a rising tracer that bursts in the air.
  mortar(from, to, onBurst) {
    const T = R(0.9, 1.3);
    const vel = new THREE.Vector3((to.x - from.x) / T, (to.y - from.y + 4.9 * T * T) / T, (to.z - from.z) / T);
    this.tracers.push({ pos: from.clone(), vel, t: 0, T, onBurst, color: [C(1, 0.3, 0.25), C(0.4, 1, 0.5), C(1, 1, 0.9), C(1, 0.8, 0.3)][Math.floor(Math.random() * 4)] });
  }

  throwProjectile(from, to, type, onImpact, flightTime) {
    const dist = from.distanceTo(to);
    const T = flightTime || Math.max(0.55, Math.min(1.4, dist / 13));
    const g = 9.8;
    const vel = new THREE.Vector3((to.x - from.x) / T, (to.y - from.y + 0.5 * g * T * T) / T, (to.z - from.z) / T);
    let mesh;
    if (type === 'petrol') mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0x2f6a3a, roughness: 0.2, transparent: true, opacity: 0.85 }));
    else if (type === 'canister') mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0x3c4a3a, roughness: 0.5, metalness: 0.4 }));
    else if (type === 'bottle') mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0x4a3a1a, roughness: 0.2 }));
    else mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07), new THREE.MeshStandardMaterial({ color: 0x6a6660 }));
    mesh.castShadow = true;
    mesh.position.copy(from);
    this.scene.add(mesh);
    const p = { mesh, vel, type, onImpact, age: 0, spin: new THREE.Vector3(8 + Math.random() * 6, Math.random() * 4, 0), alive: true };
    this.projectiles.push(p);
    return p;
  }

  update(dt, t, camPos) {
    const fogObj = this.scene.fog;
    this.emitAcc += dt;
    const step = 1 / 30;
    const near = (p, r) => (p.x - camPos.x) ** 2 + (p.z - camPos.z) ** 2 < r * r;
    while (this.emitAcc > step) {
      this.emitAcc -= step;
      for (const f of this.world.fires) {
        if (!near(f.pos, 170)) continue;
        const sc = f.scale * (f.boost || 1);
        // flame tongues
        const n = sc > 1.6 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          if (Math.random() < 0.9) this.fire.spawn({ pos: f.pos.clone().add(new THREE.Vector3(R(-0.4, 0.4) * sc, R(-0.1, 0.2), R(-0.4, 0.4) * sc)), vel: new THREE.Vector3(R(-0.2, 0.2), R(1.2, 2.6), R(-0.2, 0.2)), size: R(0.6, 1.1) * sc, grow: 0.5, life: R(0.4, 0.8), alpha: 0.85, color: C(1, 0.72, 0.32), color2: C(0.8, 0.14, 0.02), drag: 1, windK: 0.5, frame: Math.floor(Math.random() * 3), spin: R(-0.3, 0.3) });
        }
        // embers
        if (Math.random() < 0.35 * sc) this.fire.spawn({ pos: f.pos.clone().add(new THREE.Vector3(R(-0.5, 0.5), 0.6, R(-0.5, 0.5))), vel: new THREE.Vector3(R(-0.8, 0.8), R(1.5, 3.5), R(-0.8, 0.8)), size: R(0.04, 0.08), life: R(1.5, 3.2), alpha: 1, color: C(1, 0.6, 0.2), color2: C(0.6, 0.1, 0), drag: 0.6, windK: 1.4, frame: 3, buoy: 0.2 });
      }
      for (const s of this.world.smokes) {
        if (!near(s.pos, 230)) continue;
        const dfar = !near(s.pos, 80);
        const sc = (s.scale || 1) * (dfar ? 1.5 : 1);
        // tall dark column: dense near the source, expanding and greying as it rises
        if (Math.random() < 0.15 * s.rate * (dfar ? 0.6 : 1)) this.smoke.spawn({ pos: s.pos.clone().add(new THREE.Vector3(R(-0.5, 0.5), 0, R(-0.5, 0.5))), vel: new THREE.Vector3(R(-0.3, 0.3), R(2.2, 3.2), R(-0.3, 0.3)), size: R(2.0, 2.8) * sc, grow: 6, life: R(11, 16), alpha: 0.82, color: C(0.035, 0.032, 0.03), color2: C(0.2, 0.19, 0.185), colorK: 1.1, drag: 0.12, buoy: 0.05, windK: 1.5, glow: 1.4, glowT: 1.6, fadeIn: 0.6, fadeCurve: 'late' });
        // low haze rolling downwind through the street
        if (!dfar && near(s.pos, 55) && Math.random() < 0.03 * s.rate) this.smoke.spawn({ pos: s.pos.clone().add(new THREE.Vector3(R(-2, 2), R(-0.6, 0.6), R(-2, 2))), vel: new THREE.Vector3(R(-0.3, 0.3), 0.05, R(-0.3, 0.3)), size: R(5, 8), grow: 1.6, life: R(12, 16), alpha: 0.11, color: C(0.24, 0.23, 0.22), drag: 0.1, windK: 1.0, fadeIn: 3 });
      }
      // ambient drifting street haze (tear gas remnants) around the camera
      if (Math.random() < 0.14) {
        const a = Math.random() * 6.28, r = 8 + Math.random() * 34;
        const p = new THREE.Vector3(camPos.x + Math.cos(a) * r, 0.5 + Math.random() * 1.8, camPos.z + Math.sin(a) * r);
        p.x = Math.max(-14, Math.min(14, p.x));
        this.smoke.spawn({ pos: p, vel: new THREE.Vector3(0, 0.05, 0), size: R(3.5, 7), grow: 1.6, life: 10, alpha: 0.06, color: C(0.55, 0.53, 0.5), drag: 0.1, windK: 0.8, fadeIn: 3 });
      }
      // temporary petrol fires
      for (const f of this.flames) {
        const k = 1 - f.t / f.life;
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * f.radius * (0.55 + 0.45 * k);
          this.fire.spawn({ pos: f.pos.clone().add(new THREE.Vector3(Math.cos(a) * r, 0.1, Math.sin(a) * r)), vel: new THREE.Vector3(0, R(1.5, 3.2), 0), size: R(0.6, 1.2) * (0.5 + k), grow: 0.4, life: R(0.4, 0.8), alpha: 0.95, color: C(1, 0.75, 0.35), color2: C(0.85, 0.16, 0.02), drag: 1, frame: Math.floor(Math.random() * 3) });
        }
        if (Math.random() < 0.35) this.smoke.spawn({ pos: f.pos.clone().add(new THREE.Vector3(R(-0.5, 0.5) * f.radius, 1.4, R(-0.5, 0.5) * f.radius)), vel: new THREE.Vector3(0, 2, 0), size: 1.4, grow: 5, life: R(5, 8), alpha: 0.5, color: C(0.06, 0.055, 0.05), color2: C(0.3, 0.29, 0.28), drag: 0.25, windK: 1.3, glow: 1.2, fadeCurve: 'late' });
        if (Math.random() < 0.3) this.fire.spawn({ pos: f.pos.clone().setY(0.4), vel: new THREE.Vector3(R(-1, 1), R(2, 4), R(-1, 1)), size: 0.06, life: R(1, 2), alpha: 1, color: C(1, 0.6, 0.2), drag: 0.6, windK: 1.2, frame: 3 });
      }
    }
    for (let i = this.flames.length - 1; i >= 0; i--) { this.flames[i].t += dt; if (this.flames[i].t > this.flames[i].life) this.flames.splice(i, 1); }
    for (const f of this.world.fires) if (f.boost) { f.boostT -= dt; if (f.boostT <= 0) f.boost = 0; }

    // flickering light on the nearest persistent fires
    const list = this.world.fires.map((f) => [f, f.pos.distanceToSquared(camPos)]).sort((a, b) => a[1] - b[1]);
    this.fireLights.forEach((light, i) => {
      const e = list[i];
      if (!e || e[1] > 70 * 70) { light.intensity = 0; return; }
      const f = e[0];
      light.position.copy(f.pos).setY(f.pos.y + 1.0);
      light.intensity = (7 + Math.sin(t * 17 + i) * 1.8 + Math.sin(t * 29 + i * 2) * 1.4) * f.scale * (f.boost || 1) * (this.fireLightMul || 1);
    });
    // smokiness around the camera (drives fog/haze in main)
    let sm = 0;
    for (const s of this.world.smokes) { const d = Math.sqrt((s.pos.x - camPos.x) ** 2 + (s.pos.z - camPos.z) ** 2); sm += (s.rate || 1) * Math.exp(-d / 22); }
    this.smokiness += (Math.min(1.5, sm) - this.smokiness) * Math.min(1, dt * 0.8);

    for (const l of this.lights) {
      if (l.t < l.life) { l.t += dt; const k = 1 - l.t / l.life; l.light.intensity = l.intensity * k * (l.flicker ? 0.8 + Math.random() * 0.4 : 1); }
      else l.light.intensity = 0;
    }

    // mortars
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const m = this.tracers[i];
      m.t += dt; m.vel.y -= 9.8 * dt; m.pos.addScaledVector(m.vel, dt);
      this.fire.spawn({ pos: m.pos, size: 0.18, life: 0.35, alpha: 1, color: C(1, 0.85, 0.6), drag: 0, frame: 3 });
      if (m.t >= m.T * 0.82) {
        this.tracers.splice(i, 1);
        for (let k = 0; k < 70; k++) {
          const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(R(5, 9));
          this.fire.spawn({ pos: m.pos, vel: v, size: R(0.1, 0.18), life: R(0.8, 1.5), alpha: 1, color: m.color, color2: C(0.6, 0.15, 0.05), grav: 3, drag: 1.4, frame: 3 });
        }
        this.fire.spawn({ pos: m.pos, size: 6, life: 0.15, alpha: 1, color: m.color, frame: 3, drag: 0 });
        this.flash(m.pos, m.color.getHex(), 30, 0.35, 34);
        for (let k = 0; k < 6; k++) this.smoke.spawn({ pos: m.pos.clone().add(new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1))), size: 2, grow: 3, life: 5, alpha: 0.25, color: C(0.5, 0.48, 0.46), drag: 0.5, windK: 1.4 });
        if (m.onBurst) m.onBurst(m.pos.clone());
      }
    }

    // projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;
      p.vel.y -= 9.8 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin.x * dt; p.mesh.rotation.y += p.spin.y * dt;
      if (p.type === 'petrol') {
        this.fire.spawn({ pos: p.mesh.position, vel: new THREE.Vector3(0, 0.6, 0), size: 0.32, life: 0.28, alpha: 1, color: C(1, 0.7, 0.3), color2: C(0.9, 0.2, 0), drag: 1, frame: 0 });
        if (Math.random() < 0.5) this.smoke.spawn({ pos: p.mesh.position, vel: new THREE.Vector3(0, 0.4, 0), size: 0.3, grow: 4, life: 1.6, alpha: 0.45, color: C(0.12, 0.11, 0.1), drag: 1 });
      }
      // a gas canister already fuming in flight
      if (p.type === 'canister' && Math.random() < 0.6) this.smoke.spawn({ pos: p.mesh.position, vel: new THREE.Vector3(0, 0.3, 0), size: 0.25, grow: 3, life: 1.4, alpha: 0.3, color: C(0.7, 0.72, 0.7), drag: 1 });
      const pos = p.mesh.position;
      const hitGround = pos.y <= this.world.groundHeight(pos.x, pos.z) + 0.05;
      const hitWall = this.world.blocked(pos.x, pos.z, 0.05, pos.y) && pos.y < 3;
      const hitCustom = p.alive && p.check ? p.check(pos) : false;
      if (hitGround || hitWall || hitCustom || p.age > 5) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose(); p.mesh.material.dispose();
        this.projectiles.splice(i, 1);
        if (p.onImpact) p.onImpact(pos.clone(), p, hitCustom);
      }
    }

    // debris
    let n = 0;
    for (let i = this.debris.length - 1; i >= 0; i--) { const d = this.debris[i]; d.age += dt; if (d.age > d.life) this.debris.splice(i, 1); }
    for (const d of this.debris) {
      if (d.pos.y > 0.03 || Math.abs(d.vel.y) > 0.1) {
        d.vel.y -= 9.8 * dt; d.pos.addScaledVector(d.vel, dt);
        d.rot.x += d.spin * dt;
        if (d.pos.y < 0.03) { d.pos.y = 0.03; d.vel.multiplyScalar(0.4); d.vel.y = Math.abs(d.vel.y) * 0.3; d.spin *= 0.5; }
      }
      this.tmpM.makeRotationFromEuler(d.rot).setPosition(d.pos);
      this.debrisMesh.setMatrixAt(n++, this.tmpM);
    }
    this.debrisMesh.count = n;
    this.debrisMesh.instanceMatrix.needsUpdate = true;

    this.smoke.update(dt, this.wind, fogObj);
    this.fire.update(dt, this.wind, fogObj);
  }

  // remove a fire added with addFire (boss arenas take theirs down when the fight ends)
  removeFire(fire) {
    const k = this.dynamicFires.findIndex((f) => f.fire === fire);
    if (k < 0) return;
    const f = this.dynamicFires.splice(k, 1)[0];
    const i = this.world.fires.indexOf(f.fire); if (i >= 0) this.world.fires.splice(i, 1);
    const j = this.world.smokes.indexOf(f.smoke); if (j >= 0) this.world.smokes.splice(j, 1);
  }

  inFire(pos) {
    for (const f of this.flames) {
      const r = f.radius * (1 - (f.t / f.life) * 0.4);
      if ((pos.x - f.pos.x) ** 2 + (pos.z - f.pos.z) ** 2 < r * r) return true;
    }
    return false;
  }
}
