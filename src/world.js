// Procedural Parisian street environment: Haussmann blocks, boulevard, side
// streets, cafés, parked cars, CRS vans, barricades, debris and colliders.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as T from './textures.js';
import { carParts, carTypeAt, vanParts } from './vehicles.js';

export const LAYOUT = {
  roadHalf: 9,
  blvdHalf: 15,
  crossStreets: [
    { z: -110, half: 7, name: 'RUE OBERKAMPF' },
    { z: -20, half: 6, name: 'RUE DE MALTE' },
    { z: 70, half: 7, name: 'RUE JEAN-PIERRE TIMBAUD' },
  ],
  extentX: 140,
  extentZ: 230,
  bounds: { minX: -58, maxX: 58, minZ: -166, maxZ: 182 },
};

const rnd = T.mulberry(1234);
const R = (a, b) => a + (b - a) * rnd();
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// push a circle out of an oriented box (see World.addObstacle)
function resolveObb(p, r, o) {
  const dx = p.x - o.cx, dz = p.z - o.cz;
  const lx = o.c * dx - o.s * dz, lz = o.s * dx + o.c * dz; // into the box's frame
  const cx = Math.max(-o.hw, Math.min(lx, o.hw)), cz = Math.max(-o.hd, Math.min(lz, o.hd));
  let ex = lx - cx, ez = lz - cz;
  const d2 = ex * ex + ez * ez;
  if (d2 >= r * r) return false;
  let nx, nz;
  if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; nx = lx + ex * k; nz = lz + ez * k; }
  else {
    // centre inside: out along the shallowest side
    const px = o.hw - Math.abs(lx), pz = o.hd - Math.abs(lz);
    if (px < pz) { nx = Math.sign(lx || 1) * (o.hw + r); nz = lz; } else { nx = lx; nz = Math.sign(lz || 1) * (o.hd + r); }
  }
  p.x = o.cx + o.c * nx + o.s * nz; p.z = o.cz - o.s * nx + o.c * nz; // back to world
  return true;
}

export class World {
  constructor(scene, renderer) {
    this.scene = scene;
    this.colliders = [];
    this.grid = new Map();
    this.cell = 8;
    this.buckets = new Map();
    this.materials = {};
    this.fires = [];        // persistent fire emitters {pos, scale}
    this.smokes = [];       // persistent smoke emitters
    this.roads = [];        // rects for minimap
    this.sidewalks = [];    // raised rects
    this.blocks = [];       // building footprints for minimap
    this.flags = [];        // static waving flags (cloth meshes)
    this.lightBars = [];
    this.gatherPoints = []; // crowd anchors
    T.setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
    this._initMaterials();
    this._buildSky();
    this._buildGround();
    this._buildBlocks();
    this._buildStreetFurniture();
    this._buildVehicles();
    this._buildBarricades();
    this._buildImpostorCrowds();
    this._flush();
  }

  // ---------------------------------------------------------------- materials
  _initMaterials() {
    const m = this.materials;
    const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
    m.facade = [0, 1, 2, 3].map((i) => std({ map: T.facadeTexture(i), roughness: 0.92 }));
    m.shop = Array.from({ length: T.SHOP_COUNT }, (_, i) => std({ map: T.shopTexture(i), roughness: 0.7 }));
    m.stone = std({ map: T.stoneTexture(), color: 0xe6dccb, side: THREE.DoubleSide });
    m.stoneDark = std({ color: 0x8c8371 });
    m.roof = std({ map: T.roofTexture(), roughness: 0.6, metalness: 0.3 });
    m.roofTop = std({ color: 0x4a5056, roughness: 0.7, metalness: 0.2 });
    m.chimney = std({ color: 0x9a5b3e });
    m.railing = std({ map: T.railingTexture(), transparent: false, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 });
    m.road = std({ map: T.asphaltTexture(true), roughness: 0.95 });
    m.roadPlain = std({ map: T.asphaltTexture(false), roughness: 0.95 });
    m.paving = std({ map: T.pavingTexture(), roughness: 0.92 });
    m.cobble = std({ map: T.cobbleTexture(), roughness: 0.9 });
    m.curb = std({ color: 0x9b978d });
    m.white = std({ color: 0xdedbd2, roughness: 0.8 });
    m.black = std({ color: 0x18191b, roughness: 0.6, metalness: 0.4 });
    m.metal = std({ color: 0x8a8f94, roughness: 0.45, metalness: 0.7 });
    m.darkMetal = std({ color: 0x2b2f33, roughness: 0.5, metalness: 0.6 });
    m.bark = std({ color: 0x6b6152 });
    m.leaves = std({ color: 0x4a5a32, roughness: 1 });
    m.leaves2 = std({ color: 0x5d6b3a, roughness: 1 });
    m.parisGreen = std({ color: 0x2f4a3a, roughness: 0.6, metalness: 0.3 });
    m.glass = std({ color: 0x1a2128, roughness: 0.15, metalness: 0.8 });
    m.tyre = std({ color: 0x141414, roughness: 0.9 });
    m.charred = std({ color: 0x1c1a19, roughness: 1 });
    m.rust = std({ color: 0x4a3426, roughness: 1 });
    m.wood = std({ color: 0x8a6a45 });
    m.cardboard = std({ color: 0xa88a5e });
    m.trash = std({ color: 0x2a2d2b, roughness: 0.6 });
    m.paper = std({ color: 0xd9d6cc, side: THREE.DoubleSide });
    m.binGreen = std({ color: 0x2d5a3a, roughness: 0.6 });
    m.vanSide = std({ map: T.vanTexture(), roughness: 0.5 });
    m.vanBody = std({ color: 0xe9ecef, roughness: 0.5 });
    m.vanBlue = std({ color: 0x16337a, roughness: 0.5 });
    m.headlight = std({ color: 0xd8dde2, emissive: 0xfff2d0, emissiveIntensity: 0.12, roughness: 0.2, metalness: 0.3 }); // parked: lamps off, glass catches the light
    m.taillight = std({ color: 0x550000, emissive: 0xff1010, emissiveIntensity: 0.5 });
    m.amber = std({ color: 0x7a4a00, emissive: 0xff9a20, emissiveIntensity: 0.25 });
    m.plastic = std({ color: 0x1c1d20, roughness: 0.75 });
    m.rim = std({ color: 0xa9adb3, roughness: 0.3, metalness: 0.85 });
    m.plate = std({ map: T.plateTexture(), roughness: 0.5 });
    m.burntGlass = std({ color: 0x0b0a09, roughness: 1 });
    m.lightA = new THREE.MeshStandardMaterial({ color: 0x0a1a66, emissive: 0x2a5cff, emissiveIntensity: 0 });
    m.lightB = new THREE.MeshStandardMaterial({ color: 0x0a1a66, emissive: 0x2a5cff, emissiveIntensity: 0 });
    m.lamp = std({ color: 0xfff1cc, emissive: 0xffd9a0, emissiveIntensity: 0.4 });
    m.awnings = [0x7a1d1d, 0x1d4a2d, 0x1b2a4a, 0x6a4a1e].map((c) => std({ color: c, side: THREE.DoubleSide, roughness: 0.85 }));
    m.cars = [0x8b8f94, 0x1d1f22, 0xe2e2df, 0x3a4a5e, 0x6e1a1a, 0x2f3b33, 0xb5a98e, 0x50555c].map((c) => std({ color: c, roughness: 0.35, metalness: 0.55 }));
    m.scooter = std({ color: 0x3a8a5a, roughness: 0.4, metalness: 0.4 });
    m.morris = std({ color: 0x2c4a3c, roughness: 0.5, metalness: 0.2 });
    m.poster = std({ map: T.placardTexture('CONCERT\nOLYMPIA', '#e9c46a', '#1d3557') });
    m.metroSign = std({ map: T.placardTexture('M', '#f2c230', '#1a1a1a'), emissive: 0x332200, emissiveIntensity: 0.2 });
    m.ground = std({ color: 0x2b2a28 });
    m.fireRed = std({ color: 0x8e1414, roughness: 0.4, metalness: 0.3 });
    m.samuStripe = std({ color: 0xe86a12, roughness: 0.5 });
    m.soot = new THREE.MeshStandardMaterial({ map: T.sootTexture(), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });

    // Waving cloth shader shared by all flags/banners.
    this.clothUniforms = { uTime: { value: 0 } };
    this.makeCloth = (map, amp = 0.12) => {
      const mat = new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.9 });
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = this.clothUniforms.uTime;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uTime;')
          .replace('#include <begin_vertex>', `
            #include <begin_vertex>
            #ifdef USE_INSTANCING
              vec3 _wp = instanceMatrix[3].xyz;
            #else
              vec3 _wp = modelMatrix[3].xyz;
            #endif
            float _ph = _wp.x * 0.7 + _wp.z * 1.3;
            float _u = uv.x;
            transformed.z += sin(_u * 7.0 - uTime * 5.5 + _ph) * ${amp.toFixed(3)} * _u
                           + sin(_u * 13.0 - uTime * 8.0 + _ph * 1.7) * ${(amp * 0.35).toFixed(3)} * _u;
          `);
      };
      return mat;
    };
    m.palFlag = this.makeCloth(T.palestineFlagTexture(), 0.14);
    m.palFlagBig = this.makeCloth(T.palestineFlagTexture(), 0.25);
    m.frFlag = this.makeCloth(T.franceFlagTexture(), 0.12);
    m.palFlagStatic = new THREE.MeshStandardMaterial({ map: T.palestineFlagTexture(), side: THREE.DoubleSide, roughness: 0.9 });
    m.algFlag = this.makeCloth(T.algeriaFlagTexture(), 0.14);
    m.algFlagBig = this.makeCloth(T.algeriaFlagTexture(), 0.25);
    m.algFlagStatic = new THREE.MeshStandardMaterial({ map: T.algeriaFlagTexture(), side: THREE.DoubleSide, roughness: 0.9 });
    m.frFlagBig = this.makeCloth(T.franceFlagTexture(), 0.25);
    m.frFlagStatic = new THREE.MeshStandardMaterial({ map: T.franceFlagTexture(), side: THREE.DoubleSide, roughness: 0.9 });
    // red union strike flags
    m.uniFlag = this.makeCloth(T.unionFlagTexture('GRÈVE'), 0.14);
    m.uniFlagBig = this.makeCloth(T.unionFlagTexture('GRÈVE\nGÉNÉRALE'), 0.25);
    m.uniFlagStatic = new THREE.MeshStandardMaterial({ map: T.unionFlagTexture('TOUS\nENSEMBLE'), side: THREE.DoubleSide, roughness: 0.9 });
    m.binLid = std({ color: 0xe8c21a, roughness: 0.55 });
  }

  // ---------------------------------------------------------------- helpers
  add(matKey, geo) {
    if (!this.buckets.has(matKey)) this.buckets.set(matKey, []);
    // normalise attribute sets so merging works
    if (!geo.index) geo = geo; // all our primitives are indexed
    for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
    this.buckets.get(matKey).push(geo);
  }

  mat(key) {
    const parts = key.split(':');
    let m = this.materials[parts[0]];
    if (parts.length > 1) m = m[+parts[1]];
    return m;
  }

  box(matKey, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0, uvScale) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (uvScale) scaleUV(g, uvScale[0], uvScale[1]);
    const e = new THREE.Euler(rx, ry, rz, 'YXZ');
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(e));
    g.translate(x, y, z);
    this.add(matKey, g);
    return g;
  }

  cyl(matKey, rt, rb, h, x, y, z, seg = 10, rx = 0, rz = 0, ry = 0) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')));
    g.translate(x, y, z);
    this.add(matKey, g);
  }

  // Plane with given basis; origin = bottom-left corner.
  quad(matKey, origin, uDir, vDir, w, h, u1 = 1, v1 = 1, u0 = 0, v0 = 0) {
    const g = new THREE.PlaneGeometry(1, 1);
    const pos = g.attributes.position, uv = g.attributes.uv;
    // PlaneGeometry vertices: (-.5,.5) (.5,.5) (-.5,-.5) (.5,-.5)
    for (let i = 0; i < 4; i++) {
      const px = pos.getX(i) + 0.5, py = pos.getY(i) + 0.5;
      const p = origin.clone().addScaledVector(uDir, px * w).addScaledVector(vDir, py * h);
      pos.setXYZ(i, p.x, p.y, p.z);
      uv.setXY(i, u0 + px * (u1 - u0), v0 + py * (v1 - v0));
    }
    g.computeVertexNormals();
    this.add(matKey, g);
    return g;
  }

  addCollider(minX, minZ, maxX, maxZ, h = 30, tag = 'static') {
    const c = { minX, minZ, maxX, maxZ, h, tag };
    this.colliders.push(c);
    const cs = this.cell;
    for (let gx = Math.floor(minX / cs); gx <= Math.floor(maxX / cs); gx++)
      for (let gz = Math.floor(minZ / cs); gz <= Math.floor(maxZ / cs); gz++) {
        const k = gx * 10007 + gz;
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(c);
      }
    return c;
  }

  // Removable oriented box (police barriers placed by the officer). The grid holds its
  // bounding box; collision and blocking tests use the rotated rectangle itself.
  addObstacle(cx, cz, w, d, ry, h, tag = 'placed') {
    const c = Math.cos(ry), s = Math.sin(ry), hw = w / 2, hd = d / 2;
    const ex = Math.abs(hw * c) + Math.abs(hd * s), ez = Math.abs(hw * s) + Math.abs(hd * c);
    const col = this.addCollider(cx - ex, cz - ez, cx + ex, cz + ez, h, tag);
    col.obb = { cx, cz, hw, hd, c, s };
    return col;
  }

  removeCollider(col) {
    const i = this.colliders.indexOf(col);
    if (i < 0) return;
    this.colliders.splice(i, 1);
    const cs = this.cell;
    for (let gx = Math.floor(col.minX / cs); gx <= Math.floor(col.maxX / cs); gx++)
      for (let gz = Math.floor(col.minZ / cs); gz <= Math.floor(col.maxZ / cs); gz++) {
        const l = this.grid.get(gx * 10007 + gz);
        if (l) { const j = l.indexOf(col); if (j >= 0) l.splice(j, 1); }
      }
  }

  // a 2 m metal crowd barrier as one geometry at the origin (same parts as _vauban)
  barrierGeometry() {
    const parts = [];
    const B = (w, h, d, ox, oy) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(ox, oy, 0); parts.push(g); };
    B(2.0, 0.05, 0.05, 0, 1.08); B(2.0, 0.05, 0.05, 0, 0.25);
    for (let k = -0.95; k <= 0.96; k += 0.16) B(0.025, 0.85, 0.025, k, 0.66);
    B(0.06, 1.1, 0.06, -1.0, 0.55); B(0.06, 1.1, 0.06, 1.0, 0.55);
    B(0.06, 0.04, 0.7, -0.9, 0.02); B(0.06, 0.04, 0.7, 0.9, 0.02);
    const g = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    return g;
  }

  addColliderRotated(cx, cz, w, d, ry, h) {
    // AABB of a rotated rectangle (good enough for props)
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
    return this.addCollider(cx - hw, cz - hd, cx + hw, cz + hd, h);
  }

  _flush() {
    for (const [key, geos] of this.buckets) {
      const merged = mergeGeometries(geos, false);
      if (!merged) { console.warn('merge failed', key); continue; }
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, this.mat(key));
      const noShadow = ['road', 'roadPlain', 'paving', 'cobble', 'ground', 'paper', 'soot'];
      mesh.castShadow = !noShadow.includes(key) && !key.startsWith('shop') && !key.startsWith('facade');
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
      geos.forEach((g) => g.dispose());
    }
    this.buckets.clear();
  }

  // ---------------------------------------------------------------- sky
  _buildSky() {
    const geo = new THREE.SphereGeometry(900, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      // colours are uniforms so a lighting preset can change them without a recompile
      uniforms: {
        uHorizon: { value: new THREE.Vector3(0.62, 0.56, 0.50) },
        uLow: { value: new THREE.Vector3(0.50, 0.47, 0.45) },
        uTop: { value: new THREE.Vector3(0.24, 0.27, 0.31) },
        uGlow: { value: new THREE.Vector3(0.9, 0.55, 0.28) },
        uGlowK: { value: 0.45 },
        uHaze: { value: new THREE.Vector3(0.38, 0.33, 0.30) },
      },
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `varying vec3 vP;
        uniform vec3 uHorizon, uLow, uTop, uGlow, uHaze; uniform float uGlowK;
        void main(){
          float h = vP.y;
          vec3 c = mix(uHorizon, uLow, smoothstep(0.0, 0.12, h));
          c = mix(c, uTop, smoothstep(0.12, 0.7, h));
          // sun glow behind the clouds (west); a fire-lit glow at night
          vec3 sd = normalize(vec3(-0.6, 0.18, -0.55));
          float s = max(dot(vP, sd), 0.0);
          c += uGlow * pow(s, 10.0) * uGlowK;
          // smoke-stained haze near the horizon
          c = mix(c, uHaze, smoothstep(0.25, 0.0, abs(h-0.02)) * 0.25);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const sky = new THREE.Mesh(geo, mat);
    sky.renderOrder = -1;
    this.sky = sky;
    this.scene.add(sky);
  }

  setSky(s) {
    const u = this.sky.material.uniforms;
    u.uHorizon.value.set(...s.horizon); u.uLow.value.set(...s.low); u.uTop.value.set(...s.top);
    u.uGlow.value.set(...s.glow); u.uGlowK.value = s.glowK; u.uHaze.value.set(...s.haze);
  }

  // ---------------------------------------------------------------- ground
  _buildGround() {
    const L = LAYOUT, E = L.extentZ, X = L.extentX;
    // base ground (under everything)
    this.quad('ground', new THREE.Vector3(-X - 50, -0.05, E + 50), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), 2 * X + 100, 2 * E + 100);
    // boulevard road
    this.quad('road', new THREE.Vector3(-L.roadHalf, 0, E), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), 2 * L.roadHalf, 2 * E, 1, (2 * E) / 18);
    this.roads.push({ x0: -L.blvdHalf, z0: -E, x1: L.blvdHalf, z1: E });
    // cross streets
    for (const s of L.crossStreets) {
      const rh = s.half - 2.5;
      for (const side of [-1, 1]) {
        const x0 = side > 0 ? L.roadHalf : -X, x1 = side > 0 ? X : -L.roadHalf;
        this.quad('roadPlain', new THREE.Vector3(x0, 0.002, s.z + rh), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), x1 - x0, 2 * rh, (x1 - x0) / 14, (2 * rh) / 14);
        // cross street sidewalks
        for (const zs of [-1, 1]) {
          const zc = s.z + zs * (s.half - 1.25);
          this._sidewalk(side > 0 ? L.blvdHalf : -X, zc - 1.25, side > 0 ? X : -L.blvdHalf, zc + 1.25);
        }
      }
      this.roads.push({ x0: -X, z0: s.z - s.half, x1: X, z1: s.z + s.half });
      // crosswalks across the boulevard
      for (const zs of [-1, 1]) {
        const zc = s.z + zs * (s.half + 2.2);
        for (let x = -L.roadHalf + 0.8; x < L.roadHalf - 0.5; x += 1.2)
          this.box('white', 0.6, 0.012, 3.2, x + 0.3, 0.006, zc);
      }
      for (const xs of [-1, 1]) {
        const xc = xs * (L.roadHalf + 1.5);
        for (let z = s.z - rh + 0.6; z < s.z + rh - 0.4; z += 1.2) this.box('white', 3.0, 0.012, 0.6, xc, 0.006, z + 0.3);
      }
    }
    // boulevard sidewalks, split by cross streets
    const zs = [-E, ...L.crossStreets.flatMap((s) => [s.z - s.half, s.z + s.half]), E];
    for (let i = 0; i < zs.length; i += 2) {
      for (const side of [-1, 1]) {
        const x0 = side > 0 ? L.roadHalf : -L.blvdHalf, x1 = side > 0 ? L.blvdHalf : -L.roadHalf;
        this._sidewalk(x0, zs[i], x1, zs[i + 1]);
      }
    }
  }

  _sidewalk(x0, z0, x1, z1) {
    const h = 0.14, w = x1 - x0, d = z1 - z0;
    const g = new THREE.BoxGeometry(w, h, d);
    // top-face UVs in metres / 4
    const uv = g.attributes.uv, pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + x0 + w / 2) / 4, (pos.getZ(i) + z0 + d / 2) / 4);
    g.translate(x0 + w / 2, h / 2, z0 + d / 2);
    this.add('paving', g);
    this.sidewalks.push({ x0, z0, x1, z1 });
  }

  groundHeight(x, z) {
    for (const s of this.sidewalks) if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1) return 0.14;
    return 0;
  }

  // ---------------------------------------------------------------- buildings
  _buildBlocks() {
    const L = LAYOUT, E = L.extentZ, X = L.extentX;
    const edges = [-E];
    for (const s of L.crossStreets) edges.push(s.z - s.half, s.z + s.half);
    edges.push(E);
    let shopIdx = 0;
    for (let i = 0; i < edges.length; i += 2) {
      const za = edges[i], zb = edges[i + 1];
      for (const side of [-1, 1]) {
        const xFront = side * L.blvdHalf;
        const depth = 14;
        // Boulevard frontage, facing the road (normal = -side on x)
        const n = new THREE.Vector3(-side, 0, 0);
        const dir = new THREE.Vector3(0, 0, side); // walking along frontage so that n x dir points up correctly
        this._frontage(new THREE.Vector3(xFront, 0, side > 0 ? za : zb), dir, n, zb - za, depth, () => shopIdx++);
        const blkX0 = side > 0 ? L.blvdHalf : -X, blkX1 = side > 0 ? X : -L.blvdHalf;
        this.blocks.push({ x0: blkX0, z0: za, x1: blkX1, z1: zb });
        // cross-street frontages (only where the edge borders a street)
        const xStart = side * (L.blvdHalf + depth), len = X - (L.blvdHalf + depth);
        if (i > 0) { // north edge borders street at za, facing -z
          const nn = new THREE.Vector3(0, 0, -1);
          const d = new THREE.Vector3(side > 0 ? 1 : -1, 0, 0);
          // choose origin so that facade faces nn: dir x up must equal nn
          const o = side > 0 ? new THREE.Vector3(xStart, 0, za) : new THREE.Vector3(xStart, 0, za);
          this._frontage(o, d, nn, len, depth, () => shopIdx++);
        }
        if (i < edges.length - 2) {
          const nn = new THREE.Vector3(0, 0, 1);
          const d = new THREE.Vector3(side > 0 ? 1 : -1, 0, 0);
          this._frontage(new THREE.Vector3(xStart, 0, zb), d, nn, len, depth, () => shopIdx++);
        }
        // interior filler (keeps the roofscape solid from distance)
        const fx0 = side > 0 ? L.blvdHalf + depth - 0.5 : -X, fx1 = side > 0 ? X : -(L.blvdHalf + depth - 0.5);
        const fz0 = za + (i > 0 ? depth - 0.5 : 0), fz1 = zb - (i < edges.length - 2 ? depth - 0.5 : 0);
        if (fz1 > fz0) this.box('roofTop', fx1 - fx0, 20, fz1 - fz0, (fx0 + fx1) / 2, 10, (fz0 + fz1) / 2);
        this.addCollider(Math.min(blkX0, blkX1), za, Math.max(blkX0, blkX1), zb, 40, 'building');
      }
    }
  }

  // Builds a run of Haussmann buildings along a frontage line.
  _frontage(origin, dir, normal, length, depth, nextShop) {
    const up = new THREE.Vector3(0, 1, 0);
    // ensure facade faces `normal`: plane normal = uDir x vDir
    const testN = new THREE.Vector3().crossVectors(dir, up);
    let o = origin.clone(), d = dir.clone();
    if (testN.dot(normal) < 0) { o.addScaledVector(d, length); d.negate(); }
    const inward = normal.clone().negate();
    let t = 0;
    while (t < length - 0.1) {
      let w = pick([12, 18, 18, 24]);
      if (length - t < w + 6) w = length - t;
      const floors = rnd() < 0.35 ? 4 : 5;
      const style = Math.floor(rnd() * 4);
      const shop = nextShop() % T.SHOP_COUNT;
      this._building(o.clone().addScaledVector(d, t), d, inward, normal, w, depth, floors, style, shop);
      t += w;
    }
  }

  _building(p0, d, inward, n, w, depth, floors, style, shop) {
    const up = new THREE.Vector3(0, 1, 0);
    const GH = 4.5, FH = 3.1;
    const H = GH + floors * FH;
    const bays = w / 6;
    const out = (v, k) => v.clone().addScaledVector(n, k);
    // ground floor shops
    this.quad(`shop:${shop}`, out(p0, 0.02), d, up, w, GH, bays, 1);
    // upper façade
    this.quad(`facade:${style}`, out(p0.clone().setY(GH), 0.0), d, up, w, floors * FH, bays, floors / 5);
    // cornices
    const mid = p0.clone().addScaledVector(d, w / 2);
    const ang = Math.atan2(d.x, d.z) + Math.PI / 2;
    const cornice = (y, depthOut, hgt) => {
      const g = new THREE.BoxGeometry(w, hgt, depthOut);
      g.rotateY(ang);
      const c = out(mid, depthOut / 2 - 0.05); g.translate(c.x, y, c.z);
      this.add('stone', g);
    };
    cornice(GH, 0.35, 0.3);
    cornice(H - 0.15, 0.6, 0.35);
    // continuous balconies on 2nd and 5th floor
    for (const f of [1, 4]) {
      if (f >= floors) continue;
      const y = GH + f * FH + 0.02;
      cornice(y, 0.85, 0.14);
      const railO = out(p0.clone().setY(y + 0.07), 0.8);
      this.quad('railing', railO, d, up, w, 1.0, w / 3, 1);
    }
    // awning over shops that are open
    if (shop !== 5 && shop !== 7 && rnd() < 0.8) {
      const aw = new THREE.PlaneGeometry(w - 1.2, 1.8);
      aw.rotateX(-Math.PI / 2 - 0.45);
      aw.rotateY(ang);
      const c = out(mid, 0.85); aw.translate(c.x, GH - 0.55, c.z);
      this.add(`awnings:${Math.floor(rnd() * 4)}`, aw);
    }
    // mansard roof (sloped zinc with dormers) + flat top
    const slope = new THREE.Vector3().addScaledVector(up, 3.4).addScaledVector(inward, 2.0);
    const sl = slope.length(); slope.normalize();
    this.quad('roof', p0.clone().setY(H), d, slope, w, sl, bays, 1);
    const topW = depth - 2.0;
    const tg = new THREE.BoxGeometry(w, 0.3, topW);
    tg.rotateY(ang);
    const tc = mid.clone().addScaledVector(inward, 2.0 + topW / 2); tg.translate(tc.x, H + 3.4 - 0.15, tc.z);
    this.add('roofTop', tg);
    // side walls
    for (const end of [0, w]) {
      const s0 = p0.clone().addScaledVector(d, end);
      this.quad('stone', s0, inward, up, depth, H, depth / 4, H / 4);
    }
    // chimneys
    const nc = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < nc; k++) {
      const c = p0.clone().addScaledVector(d, R(1.5, w - 1.5)).addScaledVector(inward, R(4, depth - 2));
      this.box('chimney', R(0.8, 1.8), R(1.2, 2.2), 0.7, c.x, H + 3.6, c.z, ang);
    }
    // occasional hanging flags / banners from balconies
    const r = rnd();
    if (floors > 1 && r < 0.12) {
      const f = rnd();
      this._hangingFlag(out(p0.clone().addScaledVector(d, R(2, w - 2)).setY(GH + FH + 1.0), 0.9), n, f < 0.35 ? 'palFlagStatic' : f < 0.55 ? 'algFlagStatic' : f < 0.85 ? 'frFlagStatic' : 'uniFlagStatic');
    }
  }

  _hangingFlag(pos, n, matKey) {
    const g = new THREE.PlaneGeometry(1.4, 0.9);
    g.translate(0, -0.45, 0);
    const m = new THREE.Mesh(g, this.mat(matKey));
    m.position.copy(pos);
    m.rotation.y = Math.atan2(n.x, n.z);
    m.rotation.x = 0.08;
    this.scene.add(m);
  }

  // ---------------------------------------------------------------- props
  _buildStreetFurniture() {
    const L = LAYOUT;
    const nearCross = (z, pad = 9) => L.crossStreets.some((s) => Math.abs(z - s.z) < s.half + pad);
    // trees & lamps along boulevard
    for (let z = -220; z <= 220; z += 14) {
      for (const side of [-1, 1]) {
        if (nearCross(z)) continue;
        const x = side * 12.2;
        this._tree(x, z + (side > 0 ? 0 : 7));
        if (Math.abs(z) % 28 === 0) this._lamp(side * 9.6, z + 3, side);
      }
    }
    // café terraces + benches + bins on the sidewalks of the playable area
    for (let z = -160; z <= 175; z += 9) {
      for (const side of [-1, 1]) {
        if (nearCross(z, 4)) continue;
        const r = rnd();
        const x = side * 13.6;
        if (r < 0.22) this._terrace(x, z, side);
        else if (r < 0.32) this._bin(side * 10.0, z + 2, rnd() < 0.5);
        else if (r < 0.4) this._bench(side * 10.4, z + 4, side);
        else if (r < 0.5) this._scooter(side * 10.3, z + 1, rnd() < 0.5);
      }
    }
    // Morris column, Métro sign, kiosk at Rue de Malte intersection
    this._morris(12.0, -32);
    this._metro(-12.0, -8.5);
    this._morris(-12.0, 84);
    // street signs at corners
    for (const s of L.crossStreets) {
      for (const xs of [-1, 1]) for (const zs of [-1, 1]) {
        const x = xs * (L.blvdHalf - 0.02), z = s.z + zs * (s.half + 0.8);
        const tex = zs < 0 ? T.streetSignTexture('11e Arr.', 'BD DE LA RÉPUBLIQUE') : T.streetSignTexture('11e Arr.', s.name);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.38), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }));
        m.position.set(x, 3.4, z);
        m.rotation.y = xs > 0 ? -Math.PI / 2 : Math.PI / 2;
        this.scene.add(m);
      }
    }
    // debris field
    for (let i = 0; i < 260; i++) {
      const x = R(-14, 14), z = R(-165, 165);
      const k = rnd(), gy = this.groundHeight(x, z) - 0.14;
      if (k < 0.35) this.box('paper', R(0.2, 0.4), 0.005, R(0.25, 0.35), x, gy + 0.15 + 0.01, z, rnd() * 6);
      else if (k < 0.55) this.box('stoneDark', R(0.12, 0.24), 0.1, R(0.08, 0.14), x, gy + 0.19, z, rnd() * 6); // cobbles / bricks
      else if (k < 0.7) this.cyl('glass', 0.035, 0.035, 0.26, x, gy + 0.18, z, 6, Math.PI / 2, 0, rnd() * 6); // bottles
      else if (k < 0.82) this.box('cardboard', R(0.4, 0.7), R(0.05, 0.3), R(0.3, 0.6), x, gy + 0.22, z, rnd() * 6, 0, R(-0.2, 0.2));
      else if (k < 0.9) this.box('trash', R(0.4, 0.6), 0.35, 0.4, x, gy + 0.32, z, rnd() * 6); // rubbish bags
      else this.box('metal', 0.9, 0.03, 0.04, x, gy + 0.17, z, rnd() * 6); // bent barrier pieces
    }
    // overturned dumpsters & burning bins as small fires
    const fireSpots = [[-4, 62], [5.5, 18], [-6, -58], [3, -95], [-2.5, -138], [7, 104]];
    for (const [x, z] of fireSpots) {
      this._wheelieBin(x, z, true);
      this.fires.push({ pos: new THREE.Vector3(x, 0.6, z), scale: 0.8 });
      this.smokes.push({ pos: new THREE.Vector3(x, 1.2, z), rate: 0.9 });
    }
    for (let i = 0; i < 14; i++) this._wheelieBin(R(-8, 8), R(-160, 165), rnd() < 0.6);
    // burning rubbish heaps and scooters on the pavements
    const heaps = [[-11.6, 118], [12.2, 52], [-12.0, -40], [11.4, -72], [-6, 8], [3.5, -150], [9.5, 92], [-10.5, 30]];
    for (const [x, z] of heaps) {
      for (let k = 0; k < 6; k++) this.box(rnd() < 0.5 ? 'trash' : 'cardboard', R(0.4, 0.8), R(0.25, 0.5), R(0.4, 0.7), x + R(-0.7, 0.7), this.groundHeight(x, z) + 0.15, z + R(-0.7, 0.7), rnd() * 6, R(-0.2, 0.2));
      this.box('charred', 1.8, 0.04, 1.8, x, this.groundHeight(x, z) + 0.02, z);
      this.addCollider(x - 0.8, z - 0.8, x + 0.8, z + 0.8, 0.8);
      this.fires.push({ pos: new THREE.Vector3(x, this.groundHeight(x, z) + 0.3, z), scale: 0.75 + rnd() * 0.4 });
      this.smokes.push({ pos: new THREE.Vector3(x, 1.2, z), rate: 1.0, scale: 1 });
    }
    // fires further away: down the side streets and the far end of the boulevard
    const far = [[80, 70, 1.6], [-92, 72, 1.3], [74, -19, 1.8], [-70, -22, 1.5], [96, -110, 1.4], [-82, -108, 1.7], [-6, -198, 2.0], [9, -214, 1.6], [0, 205, 1.2]];
    for (const [x, z, sc] of far) {
      if (Math.abs(x) > 20) this._car(x, z, rnd() * 3, 1, 'burnt');
      this.fires.push({ pos: new THREE.Vector3(x, 1.0, z), scale: sc });
      this.smokes.push({ pos: new THREE.Vector3(x, 2.0, z), rate: 2.4, scale: 1.6 });
    }
    // smoke stains on façades above the nearest fires
    for (const [x, z] of [[-11.6, 118], [12.2, 52], [-12.0, -40], [11.4, -72], [-10.5, 30], [9.5, 92]]) {
      const sx = x > 0 ? 14.95 : -14.95;
      const g = new THREE.PlaneGeometry(4.5, 7);
      g.rotateY(x > 0 ? -Math.PI / 2 : Math.PI / 2);
      g.translate(sx, 4.6, z);
      this.add('soot', g);
    }
    // gather points for the crowd
    this.gatherPoints.push(
      new THREE.Vector3(0, 0, 95), new THREE.Vector3(-4, 0, 82), new THREE.Vector3(5, 0, 110),
      new THREE.Vector3(0, 0, 50), new THREE.Vector3(-5, 0, 28), new THREE.Vector3(6, 0, -5),
      new THREE.Vector3(-2, 0, -20), new THREE.Vector3(0, 0, -45), new THREE.Vector3(3, 0, -75),
      new THREE.Vector3(-30, 0, 70), new THREE.Vector3(32, 0, -20), new THREE.Vector3(-34, 0, -110),
      new THREE.Vector3(40, 0, 70), new THREE.Vector3(-42, 0, -20), new THREE.Vector3(44, 0, -110), new THREE.Vector3(24, 0, 71),
    );
  }

  _tree(x, z) {
    const h = R(4.5, 5.5);
    this.cyl('bark', 0.16, 0.24, h, x, h / 2, z, 7);
    // grille
    this.box('darkMetal', 1.6, 0.03, 1.6, x, 0.155, z);
    for (let k = 0; k < 4; k++) {
      const g = new THREE.IcosahedronGeometry(R(1.6, 2.3), 1);
      g.scale(1, 0.75, 1);
      g.translate(x + R(-1.2, 1.2), h + R(0.3, 1.8), z + R(-1.2, 1.2));
      g.deleteAttribute('uv'); const uvs = new Float32Array(g.attributes.position.count * 2); g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      this.add(rnd() < 0.5 ? 'leaves' : 'leaves2', g.index ? g : toIndexed(g));
    }
    this.addCollider(x - 0.3, z - 0.3, x + 0.3, z + 0.3, h);
  }

  _lamp(x, z, side) {
    this.cyl('black', 0.06, 0.1, 5.5, x, 2.75, z, 8);
    this.box('black', 0.08, 0.08, 1.2, x - side * 0.5, 5.4, z, Math.PI / 2);
    this.box('lamp', 0.32, 0.4, 0.32, x - side * 1.0, 5.15, z);
    this.addCollider(x - 0.15, z - 0.15, x + 0.15, z + 0.15, 5);
  }

  _terrace(x, z, side) {
    for (let k = 0; k < 2; k++) {
      const tz = z + k * 2.2, tx = x - side * R(0, 0.6);
      const over = rnd() < 0.3;
      if (over) {
        this.cyl('metal', 0.35, 0.35, 0.03, tx, 0.35, tz, 12, Math.PI / 2 - 0.2, 0, rnd() * 6);
      } else {
        this.cyl('metal', 0.35, 0.35, 0.03, tx, 0.86, tz, 12);
        this.cyl('darkMetal', 0.03, 0.03, 0.72, tx, 0.5, tz, 6);
      }
      for (const cz of [-0.6, 0.6]) {
        const fallen = rnd() < 0.3;
        this.box('wood', 0.42, 0.04, 0.42, tx + R(-0.4, 0.4), fallen ? 0.24 : 0.6, tz + cz, rnd() * 3, fallen ? 1.3 : 0);
        if (!fallen) this.box('wood', 0.42, 0.45, 0.04, tx, 0.85, tz + cz * 1.35);
      }
      this.addCollider(tx - 0.45, tz - 0.45, tx + 0.45, tz + 0.45, 0.9);
    }
  }

  _bin(x, z, toppled) {
    // Paris "Vigipirate" hoop bin
    if (toppled) {
      this.cyl('binGreen', 0.22, 0.22, 0.6, x + 0.4, 0.22, z, 10, 0, Math.PI / 2);
    } else {
      this.cyl('darkMetal', 0.03, 0.03, 1.0, x, 0.5, z, 6);
      this.cyl('binGreen', 0.24, 0.22, 0.62, x, 0.6, z, 10);
    }
    this.addCollider(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 1);
  }

  _wheelieBin(x, z, toppled) {
    const ry = rnd() * 6;
    if (toppled) {
      this.box('binGreen', 0.7, 1.05, 0.8, x, 0.38, z, ry, 0, Math.PI / 2);
    } else {
      this.box('binGreen', 0.7, 1.05, 0.8, x, 0.55, z, ry);
      this.box(rnd() < 0.5 ? 'binLid' : 'binGreen', 0.74, 0.06, 0.85, x, 1.1, z, ry); // yellow lid = recycling bin
    }
    this.addColliderRotated(x, z, 1.0, 0.8, ry, 1.1);
  }

  _bench(x, z, side) {
    this.box('parisGreen', 0.5, 0.06, 1.8, x, 0.45, z);
    this.box('parisGreen', 0.06, 0.5, 1.8, x + side * 0.24, 0.72, z);
    for (const dz of [-0.75, 0.75]) this.box('darkMetal', 0.45, 0.45, 0.06, x, 0.22, z + dz);
    this.addCollider(x - 0.3, z - 0.95, x + 0.3, z + 0.95, 0.9);
  }

  _scooter(x, z, fallen) {
    const ry = R(-0.4, 0.4);
    const g = (w, h, d, oy, oz, m = 'scooter') => this.box(m, w, h, d, x, oy, z + oz, ry, 0, fallen ? 1.4 : 0);
    if (fallen) { this.box('scooter', 0.12, 0.08, 1.0, x + 0.15, 0.08, z, ry); this.box('darkMetal', 0.03, 1.0, 0.03, x + 0.5, 0.06, z + 0.45, ry, 0, Math.PI / 2); }
    else { g(0.14, 0.08, 1.0, 0.12, 0); g(0.04, 1.05, 0.04, 0.6, 0.45, 'darkMetal'); g(0.45, 0.03, 0.03, 1.12, 0.45, 'darkMetal'); }
    this.addCollider(x - 0.3, z - 0.55, x + 0.3, z + 0.55, 1.0);
  }

  _morris(x, z) {
    this.cyl('morris', 0.75, 0.75, 0.4, x, 0.2, z, 18);
    this.cyl('poster', 0.68, 0.68, 2.6, x, 1.7, z, 18);
    this.cyl('morris', 0.78, 0.7, 0.25, x, 3.1, z, 18);
    const dome = new THREE.SphereGeometry(0.72, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.translate(x, 3.2, z); this.add('morris', dome);
    this.cyl('morris', 0.04, 0.12, 0.5, x, 3.95, z, 8);
    this.addCollider(x - 0.8, z - 0.8, x + 0.8, z + 0.8, 4);
  }

  _metro(x, z) {
    this.cyl('darkMetal', 0.07, 0.07, 3.6, x, 1.8, z, 8);
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), this.materials.metroSign);
    m.position.set(x + 0.08, 3.4, z); m.rotation.y = Math.PI / 2;
    this.scene.add(m);
    const m2 = m.clone(); m2.position.x = x - 0.08; m2.rotation.y = -Math.PI / 2; this.scene.add(m2);
    // stair railings
    this.box('darkMetal', 0.05, 0.9, 4.0, x + 1.2, 0.6, z + 3);
    this.box('darkMetal', 0.05, 0.9, 4.0, x - 1.2, 0.6, z + 3);
    this.box('darkMetal', 2.4, 0.9, 0.05, x, 0.6, z + 5);
    this.addCollider(x - 1.3, z - 0.2, x + 1.3, z + 5.1, 1);
  }

  // ---------------------------------------------------------------- vehicles
  _car(x, z, ry, color, state = 'ok') {
    const { parts, W, L, H } = carParts(carTypeAt(x, z), { body: `cars:${color}`, burnt: state === 'burnt' });
    const rz = state === 'flipped' ? Math.PI : state === 'side' ? Math.PI / 2 : 0;
    const lift = state === 'flipped' ? H : state === 'side' ? W / 2 + 0.08 : 0;
    const M = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, ry, rz, 'YXZ'));
    for (const [m, g] of parts) { g.applyMatrix4(M); g.translate(x, lift, z); this.add(m, g); }
    this.addColliderRotated(x, z, state === 'side' ? 1.6 : W + 0.12, L + 0.1, ry, 1.6);
  }

  _van(x, z, ry, police, variant = police ? 'police' : 'civ') {
    const B = (m, w, h, d, ox, oy, oz) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(ox, oy, oz);
      g.rotateY(ry); g.translate(x, 0, z);
      this.add(m, g);
      return g;
    };
    const body = variant === 'fire' ? 'fireRed' : variant === 'samu' ? 'vanBody' : police ? 'vanBody' : `cars:${Math.floor(rnd() * 8)}`;
    if (variant === 'fire' || variant === 'samu') police = false;
    const V = vanParts(police || variant === 'fire' || variant === 'samu' ? 'service' : 'civ', body);
    for (const [m, g] of V.parts) { g.rotateY(ry); g.translate(x, 0, z); this.add(m, g); }
    const barZ = 0.55; // roof light bar, just behind the windscreen
    if (police) {
      // side livery panels over the load area
      for (const s of [-1, 1]) {
        const g = new THREE.PlaneGeometry(3.3, 1.24);
        g.rotateY(s * Math.PI / 2); g.translate(s * (V.W / 2 + 0.008), 1.5, -1.0);
        g.rotateY(ry); g.translate(x, 0, z);
        this.add('vanSide', g);
      }
      B('vanBlue', V.W + 0.02, 0.3, 1.0, 0, 0.62, V.f - 0.5);
      B('darkMetal', 1.9, 0.4, 0.3, 0, 0.72, V.f + 0.16); // bull bar
    }
    if (variant === 'samu') { B('samuStripe', V.W + 0.03, 0.28, 5.3, 0, 1.0, -0.05); B('samuStripe', V.W + 0.03, 0.12, 4.2, 0, 1.6, -0.6); }
    else if (variant === 'fire') { B('white', V.W + 0.03, 0.1, 5.3, 0, 1.1, -0.05); B('darkMetal', 1.6, 0.12, 4.0, 0, 2.58, -0.8); }
    if (police || variant === 'fire' || variant === 'samu') {
      // roof light bar: two halves that alternate
      for (const [i, sgn] of [[0, -1], [1, 1]]) {
        const g = new THREE.BoxGeometry(0.75, 0.16, 0.3);
        g.translate(sgn * 0.42, V.H + 0.1, barZ); g.rotateY(ry); g.translate(x, 0, z);
        this.scene.add(new THREE.Mesh(g, i ? this.materials.lightB : this.materials.lightA));
      }
      this.lightBars.push(new THREE.Vector3(x, V.H + 0.3, z).add(new THREE.Vector3(0, 0, barZ).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry)));
    }
    this.addColliderRotated(x, z + Math.cos(ry) * 0.1, 2.2, 6.6, ry, 2.6);
  }

  _buildVehicles() {
    const L = LAYOUT;
    // parked cars along the boulevard curbs
    for (let z = -200; z <= 200; z += R(5.5, 9)) {
      for (const side of [-1, 1]) {
        if (L.crossStreets.some((s) => Math.abs(z - s.z) < s.half + 5)) continue;
        if (z > 118 && z < 182) continue; // police zone
        if (rnd() < 0.35) continue;
        const r = rnd();
        const state = r < 0.08 ? 'burnt' : r < 0.12 ? 'side' : 'ok';
        if (rnd() < 0.12) this._van(side * 7.6, z, side > 0 ? 0 : Math.PI, false);
        else this._car(side * 7.7, z, (side > 0 ? 0 : Math.PI) + R(-0.05, 0.05), Math.floor(rnd() * 8), state);
      }
    }
    // cross street parking
    for (const s of L.crossStreets) {
      for (let x = 20; x < 130; x += R(5.5, 8)) {
        for (const xs of [-1, 1]) {
          if (rnd() < 0.4) continue;
          this._car(xs * x, s.z + (rnd() < 0.5 ? -1 : 1) * (s.half - 3.6), Math.PI / 2 + (rnd() < 0.5 ? 0 : Math.PI), Math.floor(rnd() * 8), rnd() < 0.1 ? 'burnt' : 'ok');
        }
      }
    }
    // abandoned cars in the middle of the boulevard
    this._car(-2.5, 40, 0.7, 2, 'burnt');
    this.fires.push({ pos: new THREE.Vector3(-2.5, 1.2, 40), scale: 1.4 });
    this.smokes.push({ pos: new THREE.Vector3(-2.5, 2.0, 40), rate: 2.2 });
    this._car(3.5, -60, -0.4, 4, 'side');
    this._car(-1, -125, 1.2, 1, 'flipped');
    this._car(4, -128, -0.2, 0, 'burnt');
    this.fires.push({ pos: new THREE.Vector3(4, 1.2, -128), scale: 1.2 });
    this.smokes.push({ pos: new THREE.Vector3(4, 2.0, -128), rate: 2.0 });
    // CRS vans forming the police position at the south end
    this._van(-6.2, 150, 0.15, true);
    this._van(6.0, 151, -0.2, true);
    this._van(-2.0, 166, 1.45, true);
    this._van(5.5, 168, 1.6, true);
    this._van(-9.5, 175, 0.1, true);
    // emergency services standing by at the junctions
    this._van(-46, 74.5, Math.PI / 2 - 0.1, false, 'fire');
    this._van(44, -16, -Math.PI / 2 + 0.15, false, 'samu');
    this._van(47, -114.5, Math.PI / 2, true);
    this._van(-44, -24, Math.PI / 2 + 0.2, true);
    this._van(7.4, 139, 0.05, false, 'samu');
    // police cars blocking side streets at the bounds
    for (const s of L.crossStreets) for (const xs of [-1, 1]) this._van(xs * 60, s.z, 0, rnd() < 0.5);
  }

  // ---------------------------------------------------------------- barricades
  _vauban(x, z, ry, { mat = 'metal', tilt = 0, roll = 0, y = 0, collide = true } = {}) {
    // metal crowd-control barrier, 2 m wide (tilt / roll lean it onto a pile)
    const B = (w, h, d, ox, oy) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(ox, oy, 0); g.rotateZ(roll); g.rotateX(tilt); g.rotateY(ry); g.translate(x, y, z);
      this.add(mat, g);
    };
    B(2.0, 0.05, 0.05, 0, 1.08); B(2.0, 0.05, 0.05, 0, 0.25);
    for (let k = -0.95; k <= 0.96; k += 0.16) B(0.025, 0.85, 0.025, k, 0.66);
    B(0.06, 1.1, 0.06, -1.0, 0.55); B(0.06, 1.1, 0.06, 1.0, 0.55);
    B(0.06, 0.04, 0.7, -0.9, 0.02); B(0.06, 0.04, 0.7, 0.9, 0.02);
    if (collide) this.addColliderRotated(x, z, 2.0, 0.35, ry, 1.1);
  }

  _binPyre(cx, cz, scale = 1) {
    // bins dragged into the road, crowd barriers thrown on top, set alight
    const gy = this.groundHeight(cx, cz);
    this.box('charred', 2.6, 0.03, 2.4, cx, gy + 0.02, cz, rnd() * 6);
    const nb = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * Math.PI * 2 + R(-0.4, 0.4), d = R(0.3, 0.6);
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, ry = rnd() * 6;
      const burnt = rnd() < 0.5;
      if (rnd() < 0.5) {
        this.box(burnt ? 'charred' : 'binGreen', 0.7, 1.05, 0.8, x, 0.38, z, ry, 0, Math.PI / 2);
      } else {
        this.box(burnt ? 'charred' : 'binGreen', 0.7, 1.05, 0.8, x, 0.55, z, ry);
        if (!burnt) this.box('binLid', 0.74, 0.06, 0.85, x, 1.1, z, ry, R(-0.5, 0));
      }
    }
    for (let k = 0; k < 2; k++) {
      this._vauban(cx + R(-0.4, 0.4), cz + R(-0.4, 0.4), rnd() * 6, { mat: rnd() < 0.5 ? 'rust' : 'metal', tilt: R(0.6, 1.1) * (rnd() < 0.5 ? 1 : -1), roll: R(-0.3, 0.3), y: 0.3 + k * 0.25, collide: false });
    }
    for (let k = 0; k < 4; k++) this.box(rnd() < 0.5 ? 'cardboard' : 'trash', R(0.4, 0.7), R(0.2, 0.4), R(0.4, 0.6), cx + R(-0.9, 0.9), gy + 0.15, cz + R(-0.9, 0.9), rnd() * 6, R(-0.2, 0.2));
    this.addCollider(cx - 1.1, cz - 1.1, cx + 1.1, cz + 1.1, 1.2);
    this.fires.push({ pos: new THREE.Vector3(cx, 1.0, cz), scale: 1.7 * scale });
    this.fires.push({ pos: new THREE.Vector3(cx + R(-0.6, 0.6), 0.6, cz + R(-0.6, 0.6)), scale: 1.0 * scale });
    this.smokes.push({ pos: new THREE.Vector3(cx, 1.6, cz), rate: 2.2 * scale, scale: 1.4 });
  }

  _barricade(cx, cz, width, burning) {
    // improvised barricade: pallets, bins, fences, tyres
    for (let x = cx - width / 2; x < cx + width / 2; x += R(0.9, 1.5)) {
      const r = rnd(), z = cz + R(-0.8, 0.8), ry = R(-0.6, 0.6);
      if (r < 0.3) for (let k = 0; k < 2 + Math.floor(rnd() * 3); k++) this.box('wood', 1.2, 0.14, 0.8, x, 0.07 + k * 0.15, z, ry + R(-0.3, 0.3), R(-0.15, 0.15));
      else if (r < 0.5) this.box('binGreen', 0.7, 1.0, 0.8, x, 0.4, z, ry, 0, Math.PI / 2 * (rnd() < 0.5 ? 1 : 0));
      else if (r < 0.7) { this.cyl('tyre', 0.38, 0.38, 0.24, x, 0.12, z, 12); this.cyl('tyre', 0.38, 0.38, 0.24, x + 0.1, 0.36, z + 0.1, 12); }
      else if (r < 0.85) this.box('darkMetal', 2.2, 1.9, 0.05, x, 0.95, z, ry, R(-0.3, 0.3)); // construction fence
      else this.box('cardboard', 0.8, 0.6, 0.6, x, 0.3, z, ry);
    }
    this.addCollider(cx - width / 2, cz - 1.1, cx + width / 2, cz + 1.1, 1.6, 'barricade');
    if (burning) {
      for (let x = cx - width / 2 + 1; x < cx + width / 2; x += 3) {
        this.fires.push({ pos: new THREE.Vector3(x, 0.6, cz), scale: 1.1 });
        this.smokes.push({ pos: new THREE.Vector3(x, 1.4, cz), rate: 1.2 });
      }
    }
  }

  _buildBarricades() {
    // police line Vauban barriers (with gaps)
    for (let x = -13; x <= 13; x += 2.1) {
      if (Math.abs(x - 0.4) < 2.2) continue;
      this._vauban(x, 128, 0);
    }
    // overturned barriers in the crowd
    for (let i = 0; i < 16; i++) this._vauban(R(-8, 8), R(-150, 115), R(0, 3.14));
    // burning piles of bins and barriers in the road
    for (const [x, z, s] of [[6.5, 98, 1], [-7, 44, 1.1], [7.2, 4, 0.9], [-6.8, -72, 1.2], [6.8, -126, 1], [-2, -150, 1.3]]) this._binPyre(x, z, s);
    // improvised barricades
    this._barricade(-5, 22, 7, false);
    this._barricade(5, -88, 6, true);
    this._barricade(0, -168, 26, true);   // northern limit
    this._barricade(-3.5, 60, 4, false);
    // rear police cordon (southern limit)
    for (let x = -14; x <= 14; x += 2.05) this._vauban(x, 181, 0);
    // banners on barricades
    const banner = (text, x, z, ry, bg, fg) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.9), new THREE.MeshStandardMaterial({ map: T.bannerTexture(text, bg, fg), side: THREE.DoubleSide, roughness: 0.9 }));
      m.position.set(x, 1.5, z); m.rotation.y = ry; m.castShadow = true;
      this.scene.add(m);
    };
    banner('RÉSISTANCE', -5, 22.9, 0, '#f2efe8', '#b31b1b');
    banner('PALESTINE LIBRE', 5, -87.1, 0, '#111', '#f2f2f2');
    banner('PARIS EST À NOUS', 0, -166.8, 0, '#1b2a4a', '#ffffff');
    // big banner hung across facades over the boulevard
    const big = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), this.makeCloth(T.bannerTexture('ICI C\'EST PARIS', '#132447', '#ffffff'), 0.05));
    big.position.set(-14.6, 9, 4); big.rotation.y = Math.PI / 2; this.scene.add(big);
    const big2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), this.makeCloth(T.bannerTexture('JUSTICE · LIBERTÉ', '#f2efe8', '#111'), 0.05));
    big2.position.set(14.6, 10, -52); big2.rotation.y = -Math.PI / 2; this.scene.add(big2);
    const big3 = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), this.makeCloth(T.bannerTexture('LYCÉENS EN COLÈRE', '#f2efe8', '#111'), 0.05));
    big3.position.set(-14.6, 8.5, -74); big3.rotation.y = Math.PI / 2; this.scene.add(big3);
    const big4 = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), this.makeCloth(T.bannerTexture('LA VIE CHÈRE ÇA SUFFIT', '#c8161d', '#ffffff'), 0.05));
    big4.position.set(14.6, 9.5, 100); big4.rotation.y = -Math.PI / 2; this.scene.add(big4);
  }

  // ---------------------------------------------------------------- distant crowds
  _buildImpostorCrowds() {
    const L = LAYOUT;
    const spots = [];
    for (const s of L.crossStreets) for (const xs of [-1, 1]) for (let i = 0; i < 55; i++) spots.push([xs * R(66, 125), s.z + R(-s.half + 1, s.half - 1)]);
    for (let i = 0; i < 160; i++) spots.push([R(-13, 13), R(-215, -172)]);
    const body = new THREE.CapsuleGeometry(0.22, 1.0, 2, 6); body.translate(0, 0.75, 0);
    const head = new THREE.SphereGeometry(0.12, 6, 4); head.translate(0, 1.58, 0);
    const legs = new THREE.BoxGeometry(0.34, 0.5, 0.2); legs.translate(0, 0.25, 0);
    [body, head, legs].forEach((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
    const geo = mergeGeometries([toIndexed(body), toIndexed(head), toIndexed(legs)]);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const inst = new THREE.InstancedMesh(geo, mat, spots.length);
    const cols = [0x111111, 0x1a1a1a, 0x132447, 0x132447, 0x2a2a2a, 0x3a3f46, 0x5a4a3a, 0x7a1d1d, 0x22324a, 0xd8d4c8];
    const m = new THREE.Matrix4(), c = new THREE.Color();
    this.impostors = { mesh: inst, base: [] };
    spots.forEach(([x, z], i) => {
      const s = R(0.9, 1.08);
      m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6), new THREE.Vector3(s, s, s));
      inst.setMatrixAt(i, m);
      inst.setColorAt(i, c.setHex(pick(cols)));
      this.impostors.base.push({ x, z, s, ph: rnd() * 6, ry: rnd() * 6 });
    });
    inst.castShadow = false; inst.receiveShadow = false;
    this.scene.add(inst);
    // distant flags above the impostor crowds
    const fg = new THREE.PlaneGeometry(1.6, 1.0, 8, 1); fg.translate(0.8, 0, 0);
    const pole = new THREE.CylinderGeometry(0.02, 0.02, 3.2, 4); pole.translate(0, -1.0, 0);
    // distant flags over the crowds: Palestinian, Algerian, French and red union flags
    const fm = this.materials;
    for (const [mat, n] of [[fm.palFlagBig, 30], [fm.algFlagBig, 18], [fm.frFlagBig, 24], [fm.uniFlagBig, 22]]) {
      const flags = new THREE.InstancedMesh(fg, mat, n);
      const poles = new THREE.InstancedMesh(pole, this.materials.darkMetal, n);
      for (let i = 0; i < n; i++) {
        const [x, z] = spots[Math.floor(rnd() * spots.length)];
        m.compose(new THREE.Vector3(x, 3.4 + R(-0.3, 0.6), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), R(-1, 1) + (Math.abs(x) > 40 ? Math.PI / 2 : 0)), new THREE.Vector3(1, 1, 1));
        flags.setMatrixAt(i, m); poles.setMatrixAt(i, m);
      }
      this.scene.add(flags, poles);
    }
  }

  updateImpostors(t) {
    const { mesh, base } = this.impostors;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      const bob = Math.max(0, Math.sin(t * 3.2 + b.ph)) * 0.12;
      p.set(b.x, bob, b.z);
      q.setFromAxisAngle(up, b.ry + Math.sin(t * 0.7 + b.ph) * 0.3);
      s.set(b.s, b.s, b.s);
      m.compose(p, q, s); mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // Glossy rain puddles on the road and pavements (reflect the sky / fires)
  addPuddles(envMap) {
    const geos = [];
    for (let i = 0; i < 70; i++) {
      const x = R(-13, 13), z = R(-165, 175);
      const g = new THREE.CircleGeometry(1, 14);
      const pos = g.attributes.position;
      for (let k = 1; k < pos.count; k++) { const f = 0.7 + rnd() * 0.5; pos.setX(k, pos.getX(k) * f); pos.setY(k, pos.getY(k) * f); }
      g.scale(R(0.6, 2.4), R(0.4, 1.4), 1);
      g.rotateX(-Math.PI / 2); g.rotateY(rnd() * 3);
      g.translate(x, this.groundHeight(x, z) + 0.012, z);
      geos.push(g);
    }
    const mat = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.04, metalness: 0.6, envMap, envMapIntensity: 1.1, transparent: true, opacity: 0.82, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    this.scene.add(mesh);
  }

  // ---------------------------------------------------------------- queries
  near(x, z, r) {
    const cs = this.cell, out = new Set();
    for (let gx = Math.floor((x - r) / cs); gx <= Math.floor((x + r) / cs); gx++)
      for (let gz = Math.floor((z - r) / cs); gz <= Math.floor((z + r) / cs); gz++) {
        const l = this.grid.get(gx * 10007 + gz);
        if (l) for (const c of l) out.add(c);
      }
    return out;
  }

  // Push a circle out of static colliders. Returns true if it collided.
  resolveCircle(p, r) {
    let hit = false;
    for (const c of this.near(p.x, p.z, r + 1)) {
      if (c.obb) { if (resolveObb(p, r, c.obb)) hit = true; continue; }
      const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
      let dx = p.x - cx, dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        hit = true;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2), k = (r - d) / d;
          p.x += dx * k; p.z += dz * k;
        } else {
          // centre inside the box: push out along the shallowest axis
          const l = p.x - c.minX, rr = c.maxX - p.x, t = p.z - c.minZ, b = c.maxZ - p.z;
          const m = Math.min(l, rr, t, b);
          if (m === l) p.x = c.minX - r; else if (m === rr) p.x = c.maxX + r; else if (m === t) p.z = c.minZ - r; else p.z = c.maxZ + r;
        }
      }
    }
    const B = LAYOUT.bounds;
    p.x = Math.max(B.minX, Math.min(B.maxX, p.x));
    p.z = Math.max(B.minZ, Math.min(B.maxZ, p.z));
    return hit;
  }

  // y: the height being tested (a projectile in flight); placed barriers lower than it
  // do not block it
  blocked(x, z, r, y) {
    for (const c of this.near(x, z, r + 1)) {
      if (c.obb) {
        if (y !== undefined && y > c.h) continue;
        const o = c.obb, dx = x - o.cx, dz = z - o.cz;
        if (Math.abs(o.c * dx - o.s * dz) < o.hw + r && Math.abs(o.s * dx + o.c * dz) < o.hd + r) return true;
        continue;
      }
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
    }
    const B = LAYOUT.bounds;
    return x < B.minX || x > B.maxX || z < B.minZ || z > B.maxZ;
  }

  // 3D ray vs collider boxes (slab test). Returns distance or maxDist.
  raycast(o, d, maxDist) {
    let best = maxDist;
    const steps = Math.ceil(maxDist / this.cell) + 1;
    const seen = new Set();
    for (let i = 0; i <= steps; i++) {
      const t = Math.min(maxDist, i * this.cell);
      for (const c of this.near(o.x + d.x * t, o.z + d.z * t, this.cell)) {
        if (seen.has(c)) continue; seen.add(c);
        const hit = rayBox(o, d, c.minX - 0.15, -1, c.minZ - 0.15, c.maxX + 0.15, c.h + 0.15, c.maxZ + 0.15);
        if (hit !== null && hit < best) best = hit;
      }
    }
    return best;
  }

  update(dt, t) {
    this.clothUniforms.uTime.value = t;
    const on = Math.floor(t * 4) % 2 === 0;
    this.materials.lightA.emissiveIntensity = on ? 6 : 0.2;
    this.materials.lightB.emissiveIntensity = on ? 0.2 : 6;
    if (this.impostors.mesh.visible) this.updateImpostors(t);
  }
}

function rayBox(o, d, x0, y0, z0, x1, y1, z1) {
  let tmin = 0, tmax = Infinity;
  for (const [oo, dd, a, b] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]]) {
    if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) return null; continue; }
    let t1 = (a - oo) / dd, t2 = (b - oo) / dd;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

function scaleUV(g, su, sv) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
}

function toIndexed(g) {
  if (g.index) return g;
  const n = g.attributes.position.count;
  const idx = []; for (let i = 0; i < n; i++) idx.push(i);
  g.setIndex(idx);
  return g;
}
