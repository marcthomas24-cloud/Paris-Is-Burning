// Level 5 district: Canal Saint-Martin at 04h05.
//
//  The canal runs along z (x 0), 14 m of water between two quays: Quai de Valmy on the west
//  bank (x < 0) and Quai de Jemmapes on the east (x > 0). Each quay is a promenade under plane
//  trees beside the water, a road, a line of parked cars and a pavement under the buildings.
//  Five bridges cross (four iron footbridges and the swing bridge), eight side streets open
//  off the quays, and at the north end the lock closes the water and the canal goes under
//  the vault. 285 m from the start (z -842) to the vault (z -557).
//
// Built once, when Level 5 first loads, into its own group (World.registerDistrict /
// setDistrict show and hide it with the level), 330 m north of the boulevard's far end so
// nothing of the other levels is in view. Everything is level: the bridge decks are flat.
// Lit signs, windows and the pools of lamp light are unlit materials, so no light is added.
// Placement draws from its own random stream.
//
// The water is one low obstacle per reach between two bridges: nobody walks into the canal,
// and things thrown over it fly over it. The moving parts are the fire engine (a group and
// its collider) and its hose; the residents at the windows sway on their own clock.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry } from './textures.js';
import { quietly } from './world.js';
import { vanParts } from './vehicles.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// ------------------------------------------------------------------ layout data
const Z0 = -842, Z1 = -557;
export const QUAYS = {
  bounds: { minX: -25.5, maxX: 25.5, minZ: Z0, maxZ: Z1 },
  start: { x: 12, z: -835, heading: 0 },
  water: 7.2, lane: 12.8, end: 8.7, front: 19.5, carX: 16.5,
  bridges: [
    { id: 'A', name: 'Passerelle des Douanes', z: -800, half: 1.8 },
    { id: 'B', name: 'Passerelle Bichat', z: -752, half: 1.8 },
    { id: 'C', name: 'the swing bridge', z: -700, half: 3.4, road: true },
    { id: 'D', name: 'Passerelle Alibert', z: -650, half: 1.8 },
    { id: 'E', name: 'Passerelle Richerand', z: -606, half: 1.8 },
  ],
  // side streets: where the bands come from and go to. side -1 west (Valmy), +1 east (Jemmapes)
  mouths: [
    { id: 'W1', side: -1, z: -822, name: 'Rue des Vinaigriers' }, { id: 'W2', side: -1, z: -728, name: 'Rue de Lancry' },
    { id: 'W3', side: -1, z: -676, name: 'Rue Legouvé' }, { id: 'W4', side: -1, z: -628, name: 'Rue Dieu' },
    { id: 'E1', side: 1, z: -776, name: 'Rue de la Grange-aux-Belles' }, { id: 'E2', side: 1, z: -724, name: 'Rue Bichat' },
    { id: 'E3', side: 1, z: -664, name: 'Rue Alibert' }, { id: 'E4', side: 1, z: -580, name: 'Passage de l\'Écluse', lock: true },
  ],
  mouthHalf: 4,
  // the fire (Beat 3): a shop front on the west quay, the engine on the road in front of it
  blaze: { x: -19.4, z: -690 },
  engine: { x: -13, from: -846, at: -696 },
  crew: [[-16.6, -688.4], [-15.7, -689.6], [-11.2, -696.5]], // nozzle, second on the hose, the pump
  shelter: [[-10.6, -698.6], [-10.6, -697.2], [-10.7, -695.6]],
  // the lock yard (Beat 4): the east quay beyond the lower gates, the water on one side
  lock: { z0: -593, z1: -566, yard: [11.5, -566], pyre: [11.6, -566] },
  landmarks: { start: [12, -835], bridgeA: [9, -800], swingBridge: [9, -700], engine: [-13, -696], lock: [12.5, -574] },
  walkRects: [[-19.5, Z0, -7.2, Z1], [7.2, Z0, 19.5, Z1]],
  areas: [['Quai de Valmy', -25.5, Z0, -7.2, Z1], ['Quai de Jemmapes', 7.2, Z0, 25.5, Z1], ['On a bridge', -7.2, Z0, 7.2, Z1]],
};
for (const b of QUAYS.bridges) QUAYS.walkRects.push([-7.2, b.z - b.half, 7.2, b.z + b.half]);
for (const m of QUAYS.mouths) QUAYS.walkRects.push(m.side < 0 ? [-25.5, m.z - 4, -19.5, m.z + 4] : [19.5, m.z - 4, 25.5, m.z + 4]);

export function quaysArea(x, z) {
  if (Math.abs(x) > QUAYS.front) { const m = QUAYS.mouths.find((o) => Math.sign(x) === o.side && Math.abs(z - o.z) < 5); return m ? m.name : 'outside the quays'; }
  if (Math.abs(x) < QUAYS.water) { const b = QUAYS.bridges.find((o) => Math.abs(z - o.z) < o.half + 0.5); return b ? b.name : 'the canal'; }
  if (x > 0 && z > QUAYS.lock.z0) return 'The lock';
  return x < 0 ? 'Quai de Valmy' : 'Quai de Jemmapes';
}
export const bankOf = (x) => (x >= 0 ? 1 : -1);

// A way on foot from a to b as [x, z] points: along the quay's road, over a bridge when the
// two are on different banks. ok(bridge): may this bridge be used? Returns null when the other
// bank cannot be reached. The bridge taken is left in route.via.
export function route(a, b, ok = null) {
  const Q = QUAYS, wp = [];
  let ax = a.x, az = a.z, sa = bankOf(ax);
  const sb = bankOf(b.x);
  if (Math.abs(ax) < Q.water) { wp.push([sb * Q.end, az]); ax = sb * Q.end; sa = sb; } // already on a deck
  else if (Math.abs(ax) > Q.front - 0.5 && !(sa === sb && Math.abs(b.x) > Q.front - 0.5 && Math.abs(b.z - az) < 5)) { wp.push([sa * Q.lane, az]); ax = sa * Q.lane; } // out of a side street, between the parked cars
  route.via = null;
  if (sa !== sb) {
    let best = null, bc = 1e9;
    for (const br of Q.bridges) { if (ok && !ok(br)) continue; const c = Math.abs(az - br.z) + Math.abs(b.z - br.z); if (c < bc) { bc = c; best = br; } }
    if (!best) return null;
    route.via = best;
    // (already at the bridge's own end: no walking back to the road first)
    const near = Math.abs(az - best.z) < best.half + 1.2;
    if (!(near && Math.abs(ax) < Q.lane - 0.4)) wp.push([sa * Q.lane, best.z]);
    if (!(near && Math.abs(ax) < Q.end + 0.4)) wp.push([sa * Q.end, best.z]);
    wp.push([sb * Q.end, best.z], [sb * Q.lane, best.z]);
    az = best.z;
  }
  if ((Math.abs(b.x) > Q.carX - 1 && Math.abs(ax) < Q.carX - 1) || (Math.abs(b.z - az) > 8 && Math.abs(Math.abs(b.x) - Q.lane) > 2.5)) wp.push([sb * Q.lane, b.z]);
  wp.push([b.x, b.z]);
  return wp;
}

// ------------------------------------------------------------------ textures
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; }
function textTex(lines, { w = 512, h = 128, bg = '#111', fg = '#fff', font = 'bold 64px Arial', border = null } = {}) {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = Math.max(4, h * 0.05); ctx.strokeRect(6, 6, w - 12, h - 12); }
  ctx.fillStyle = fg; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, w / 2, (h * (i + 0.5)) / lines.length, w - 36));
  return tex(c);
}
function poolTex() {
  const [c, ctx] = canvas(128, 128), g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(0.4, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return tex(c);
}
// the back patch of a squad officer: the call sign under POLICE
export function patchTexture(name) {
  return quietly(() => textTex([name], { w: 256, h: 128, bg: '#e9ecef', fg: '#0d1117', font: 'bold 64px Arial', border: '#0d1117' }));
}

// ------------------------------------------------------------------ the builder
export function buildQuays(world, scene, renderer, camera) {
  return quietly(() => {
    const n0 = world.colliders.length;
    const D = new Builder(world, scene, renderer, camera).build();
    D.colliders = world.colliders.slice(n0); // switched off with the district (world.setDistrict)
    return D;
  });
}

class Builder {
  constructor(world, scene, renderer, camera) {
    this.w = world; this.scene = scene; this.renderer = renderer; this.camera = camera;
    this.rng = mulberry(5500);
    this.D = { group: new THREE.Group(), sidewalks: [], roads: [], blocks: [], fires: [], smokes: [], lightBars: [], suppressed: [], residents: [], cars: [] };
    this.D.group.name = 'district:l5';
  }

  R(a, b) { return a + (b - a) * this.rng(); }

  _materials() {
    const m = this.w.materials;
    const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
    const lit = (o) => new THREE.MeshBasicMaterial({ fog: true, ...o });
    m.qWater = std({ color: 0x0a1518, roughness: 0.08, metalness: 0.75, envMap: m.road.envMap || null, envMapIntensity: 1.1 });
    m.qIron = std({ color: 0x2f4a3a, roughness: 0.55, metalness: 0.35, emissive: 0x2f4a3a, emissiveIntensity: 0.12 });
    m.qGate = std({ color: 0x1e211f, roughness: 0.8, metalness: 0.2 });
    m.qLit = [0xffd9a0, 0xdfe9ff, 0x8fb4ff, 0xff8a3a].map((c) => lit({ color: c }));
    const pool = poolTex();
    const add = (c, op) => lit({ map: pool, color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
    m.qPool = [add(0xffb866, 0.42), add(0xffc884, 0.3)]; // on the ground under a lamp; its glint on the water
    const plate = (t) => textTex([t], { w: 768, h: 128, bg: '#16357e', fg: '#fff', font: 'bold 62px Arial', border: '#2f6a3a' });
    m.qSign = [
      plate('QUAI DE JEMMAPES'), plate('QUAI DE VALMY'),
      textTex(['CANAL', 'SAINT-MARTIN'], { w: 512, h: 256, bg: '#f2efe6', fg: '#1b1b1b', font: 'bold 76px Georgia, serif', border: '#1b1b1b' }),
      textTex(['ÉCLUSES DU TEMPLE'], { w: 768, h: 128, bg: '#2f4a3a', fg: '#e8d9a8', font: 'bold 64px Georgia, serif', border: '#c9a24a' }),
      plate('PASSAGE DE L\'ÉCLUSE'),
      textTex(['BAIGNADE', 'INTERDITE'], { w: 256, h: 256, bg: '#f4f4f0', fg: '#c0221d', font: 'bold 50px Arial', border: '#c0221d' }),
    ].map((t) => std({ map: t, roughness: 0.5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.25 }));
    this.resMat = std({ vertexColors: true, roughness: 0.9 });
  }

  // ------------------------------------------------------------------ primitives
  box(k, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) { return this.w.box(k, w, h, d, x, y, z, ry, rx, rz); }
  cyl(k, rt, rb, h, x, y, z, seg = 10, rx = 0, rz = 0) { this.w.cyl(k, rt, rb, h, x, y, z, seg, rx, rz); }
  floor(k, x0, z0, x1, z1, y = 0.002, us = 14) { this.w.quad(k, V(x0, y, z1), V(1, 0, 0), V(0, 0, -1), x1 - x0, z1 - z0, (x1 - x0) / us, (z1 - z0) / us); }
  wall(k, ax, az, bx, bz, y0, h, us = 4) {
    const d = V(bx - ax, 0, bz - az), len = d.length(); d.normalize();
    this.w.quad(k, V(ax, y0, az), d, UP, len, h, len / us, h / us);
  }
  pave(x0, z0, x1, z1) {
    const h = 0.14, w = x1 - x0, d = z1 - z0, g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv, pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + x0 + w / 2) / 4, (pos.getZ(i) + z0 + d / 2) / 4);
    g.translate(x0 + w / 2, h / 2, z0 + d / 2);
    this.w.add('paving', g);
    this.D.sidewalks.push({ x0, z0, x1, z1 });
  }
  plate(k, w, h, x, y, z, ry) { const g = new THREE.PlaneGeometry(w, h); g.rotateY(ry); g.translate(x, y, z); this.w.add(k, g); }
  flat(k, w, d, x, y, z) { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x, y, z); this.w.add(k, g); }
  collider(x0, z0, x1, z1, h = 12, tag = 'building') { return this.w.addCollider(x0, z0, x1, z1, h, tag); }
  solid(x0, z0, x1, z1) { this.collider(x0, z0, x1, z1, 40); this.D.blocks.push({ x0, z0, x1, z1 }); }
  nearAny(z, list, d) { return list.some((o) => Math.abs(z - o.z) < d + (o.half || 0)); }

  // ------------------------------------------------------------------ build
  build() {
    const w = this.w, D = this.D, Q = QUAYS;
    this._materials();
    D.roads = Q.walkRects.map(([x0, z0, x1, z1]) => ({ x0, z0, x1, z1 }));
    const before = new Set(this.scene.children), fires0 = w.fires.length, smokes0 = w.smokes.length, bars0 = w.lightBars.length, cars0 = w.vehicles.length;
    this._ground();
    this._canal();
    this._bridges();
    this._lock();
    this._buildings();
    this._furniture();
    this._cars();
    this._ends();
    w._flush(D.group, ['qLit', 'qPool', 'qSign', 'qWater']);
    for (const m of D.group.children) if (m.name.startsWith('qPool')) { m.renderOrder = 2; m.receiveShadow = false; }
    D.glint = D.group.children.find((m) => m.name === 'qPool:1');
    for (const o of [...this.scene.children]) if (!before.has(o)) D.group.add(o);
    D.fires = w.fires.splice(fires0); D.smokes = w.smokes.splice(smokes0); D.lightBars = w.lightBars.splice(bars0);
    D.cars = w.vehicles.slice(cars0).filter((v) => v.kind === 'car'); // the cars a band can light
    this._residents();
    this._moving();
    this.scene.add(D.group);
    try { this.renderer.compile(this.scene, this.camera); } catch (e) { /* compiled on first sight instead */ }
    D.group.visible = false;
    D.update = (dt, t) => {
      if (D.glint) D.glint.material.opacity = 0.24 + 0.08 * Math.sin(t * 1.7) + 0.04 * Math.sin(t * 4.3);
      for (const r of D.residents) { r.mesh.rotation.z = Math.sin(t * 0.6 + r.ph) * 0.05; r.mesh.position.y = r.y + Math.sin(t * 0.9 + r.ph * 2) * 0.015; }
    };
    return D;
  }

  _ground() {
    const Q = QUAYS;
    this.w.quad('ground', V(-130, -0.06, -520), V(1, 0, 0), V(0, 0, -1), 260, 360);
    for (const s of [-1, 1]) {
      const a = s < 0 ? -17.5 : 10.5, b = s < 0 ? -10.5 : 17.5;
      this.floor('roadPlain', a, Z0 - 10, b, Z1 + 2, 0.001);
      this.pave(s < 0 ? -10.5 : Q.water, Z0 - 2, s < 0 ? -Q.water : 10.5, Z1 + 1); // the promenade by the water
      // the pavement under the buildings, cut by the side streets
      let z = Z0 - 2;
      for (const m of [...Q.mouths.filter((o) => o.side === s).sort((p, q) => p.z - q.z), { z: Z1 + 5 }]) {
        this.pave(s < 0 ? -Q.front : 17.5, z, s < 0 ? -17.5 : Q.front, m.z - Q.mouthHalf);
        z = m.z + Q.mouthHalf;
      }
    }
    for (const m of Q.mouths) this.floor('roadPlain', m.side < 0 ? -46 : 17.5, m.z - Q.mouthHalf, m.side < 0 ? -17.5 : 46, m.z + Q.mouthHalf, 0.0015);
  }

  // water, the quay walls and the rail along the edge
  _canal() {
    const Q = QUAYS, W = Q.water, lk = Q.lock;
    this.flat('qWater', 2 * W, lk.z1 - (Z0 - 12), 0, -1.5, (Z0 - 12 + lk.z1) / 2);
    this.flat('qWater', 2 * W, Z1 + 6 - lk.z1, 0, -0.55, (lk.z1 + Z1 + 6) / 2); // the upper reach, behind the top gates
    for (const s of [-1, 1]) {
      this.wall('stone', s * W, Z0 - 12, s * W, Z1 + 6, -1.6, 1.74);
      this.box('stone', 0.5, 0.16, Z1 - Z0 + 18, s * (W + 0.05), 0.2, (Z0 + Z1) / 2 - 3); // coping stones
    }
    // one low obstacle per reach of open water
    const cuts = [Z0 - 2, ...Q.bridges.flatMap((b) => [b.z - b.half, b.z + b.half]), Z1 + 2];
    for (let i = 0; i < cuts.length; i += 2) {
      const a = cuts[i], b = cuts[i + 1];
      this.w.addObstacle(0, (a + b) / 2, 2 * W, b - a, 0, 1.05, 'water');
      this.D.blocks.push({ x0: -W, z0: a, x1: W, z1: b, water: true });
      for (const s of [-1, 1]) {
        this.w.quad('railing', V(s * (W + 0.05), 0.28, a), V(0, 0, 1), UP, b - a, 0.9, (b - a) / 3, 1);
        this.box('qIron', 0.07, 0.07, b - a, s * (W + 0.05), 1.2, (a + b) / 2);
        for (let z = a; z <= b + 0.01; z += 3) this.box('qIron', 0.09, 1.0, 0.09, s * (W + 0.05), 0.72, Math.min(z, b));
      }
    }
  }

  // four iron footbridges and the swing bridge. Flat decks: the arch is carried overhead
  _bridges() {
    const W = QUAYS.water;
    for (const b of QUAYS.bridges) {
      const h = b.half;
      this.box(b.road ? 'darkMetal' : 'wood', 2 * W + 0.4, 0.3, 2 * h, 0, -0.01, b.z);
      this.D.sidewalks.push({ x0: -W - 0.05, z0: b.z - h, x1: W + 0.05, z1: b.z + h });
      for (const s of [-1, 1]) {
        const z = b.z + s * h;
        this.w.quad('railing', V(-W, 0.14, z), V(1, 0, 0), UP, 2 * W, 1.0, 2 * W / 3, 1);
        this.box('qIron', 2 * W + 0.3, 0.08, 0.1, 0, 1.18, z);
        this.box('qIron', 2 * W + 0.3, 0.2, 0.14, 0, 0.06, z);
        if (b.road) continue;
        // the bow truss: a curved top chord on hangers
        const N = 12;
        for (let i = 0; i < N; i++) {
          const x0 = -W + (2 * W * i) / N, x1 = -W + (2 * W * (i + 1)) / N;
          const y = (x) => 1.2 + 2.3 * (1 - (x / W) ** 2);
          const len = Math.hypot(x1 - x0, y(x1) - y(x0));
          this.box('qIron', len + 0.02, 0.12, 0.12, (x0 + x1) / 2, (y(x0) + y(x1)) / 2, z, 0, 0, Math.atan2(y(x1) - y(x0), x1 - x0));
          if (i) this.box('qIron', 0.05, y(x0) - 1.2, 0.05, x0, (y(x0) + 1.2) / 2, z);
        }
      }
      for (let i = 1; i < 4 && !b.road; i++) this.box('qIron', 0.1, 0.1, 2 * h, -W + (2 * W * i) / 4, 1.2 + 2.3 * (1 - ((-W + (2 * W * i) / 4) / W) ** 2), b.z); // ties between the two trusses
      if (b.road) {
        // the swing bridge: its cabin and the barrier arms standing open
        this.box('qIron', 1.6, 2.4, 1.6, W + 1.3, 1.34, b.z - h - 1.4); this.box('qGate', 1.9, 0.14, 1.9, W + 1.3, 2.6, b.z - h - 1.4);
        this.plate('qLit:0', 0.8, 0.7, W + 1.3, 1.7, b.z - h - 0.58, 0);
        this.collider(W + 0.5, b.z - h - 2.2, W + 2.1, b.z - h - 0.6, 2.6, 'prop');
        for (const s of [-1, 1]) { this.cyl('white', 0.07, 0.07, 4.4, s * (W + 0.5), 2.3, b.z + s * (h - 0.2), 6, 0, 0); this.box('qLit:3', 0.12, 0.12, 0.12, s * (W + 0.5), 4.55, b.z + s * (h - 0.2)); }
      }
    }
  }

  // the lock: two pairs of mitre gates with their balance beams, the keeper's hut, a pyre in the yard
  _lock() {
    const W = QUAYS.water, lk = QUAYS.lock;
    for (const [z, y0] of [[lk.z0, -1.6], [lk.z1, -1.6]]) {
      for (const s of [-1, 1]) {
        const a = s * 0.32, len = W / Math.cos(a) + 0.1;
        this.box('qGate', len, 2.2, 0.36, s * W / 2, y0 + 1.1, z - Math.abs(Math.sin(a)) * len / 2 + 0.3, a);
        this.box('qIron', len, 0.08, 0.5, s * W / 2, y0 + 2.25, z - Math.abs(Math.sin(a)) * len / 2 + 0.3, a);
        // the balance beam, out over the quay
        this.box('qGate', 4.6, 0.3, 0.34, s * (W + 1.9), 0.95, z + 0.3, 0);
        this.box('white', 0.9, 0.31, 0.35, s * (W + 3.9), 0.95, z + 0.3, 0);
        this.collider(s < 0 ? -W - 4.4 : W - 0.2, z + 0.1, s < 0 ? -W + 0.2 : W + 4.4, z + 0.5, 1.1, 'prop');
      }
    }
    // the keeper's hut and the yard's sign
    this.box('stone', 3.2, 2.9, 4.2, 17.6, 1.59, -562.5); this.box('roof', 3.7, 0.25, 4.7, 17.6, 3.16, -562.5);
    this.plate('qLit:0', 0.9, 1.0, 15.98, 1.8, -562.5, -Math.PI / 2);
    this.collider(16, -564.6, 19.2, -560.4, 3, 'prop');
    this.plate('qSign:3', 3.2, 0.55, 15.98, 2.75, -562.5, -Math.PI / 2);
    // bins dragged together and burning: where the last of them gather
    const [px, pz] = lk.pyre;
    this.box('charred', 2.6, 0.03, 2.4, px, 0.16, pz, 0.3);
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; this.box(i ? 'charred' : 'binGreen', 0.7, 1.05, 0.8, px + Math.cos(a) * 0.55, i === 1 ? 0.52 : 0.68, pz + Math.sin(a) * 0.55, a, 0, i === 1 ? Math.PI / 2 : 0); }
    for (let k = 0; k < 4; k++) this.box('wood', 1.2, 0.14, 0.8, px + this.R(-1.6, 1.6), 0.22 + k * 0.02, pz + this.R(-1.6, 1.6), this.R(0, 3));
    this.collider(px - 1, pz - 1, px + 1, pz + 1, 1.2, 'prop');
    this.w.fires.push({ pos: V(px, 1.1, pz), scale: 1.5 }, { pos: V(px + 0.5, 0.7, pz - 0.4), scale: 0.9 });
    this.w.smokes.push({ pos: V(px, 1.8, pz), rate: 2, scale: 1.4 });
  }

  // both frontages, cut by the side streets; lit windows; the street name plates
  _buildings() {
    const Q = QUAYS, F = Q.front;
    let shop = 3;
    for (const s of [-1, 1]) {
      const ms = Q.mouths.filter((o) => o.side === s).sort((p, q) => p.z - q.z);
      let z = Z0 - 12;
      for (const m of [...ms, { z: Z1 + 12 + Q.mouthHalf }]) {
        const z1 = m.z - Q.mouthHalf, len = z1 - z;
        this.w._frontage(V(s * F, 0, z), V(0, 0, 1), V(-s, 0, 0), len, 14, () => shop++, this.rng);
        this.solid(s < 0 ? -46 : F, z, s < 0 ? -F : 46, z1);
        // lit windows over the shops
        for (let zz = z + 2; zz < z1 - 2; zz += 3) for (let f = 0; f < 4; f++) {
          if (this.rng() > 0.1) continue;
          this.plate(`qLit:${this.rng() < 0.7 ? 0 : this.rng() < 0.5 ? 1 : 2}`, 1.1, 1.7, s * (F - 0.05), 4.5 + f * 3.1 + 1.55, zz, -s * Math.PI / 2);
        }
        z = m.z + Q.mouthHalf;
      }
      // the far end of each side street: dark, one lamp deep inside it
      for (const m of ms) {
        this.box('stoneDark', 4, 16, 2 * Q.mouthHalf + 2, s * 48, 8, m.z);
        this.box('lamp', 0.3, 0.4, 0.3, s * 36, 5.2, m.z - 3.2);
        this.plate(`qSign:${m.lock ? 4 : s > 0 ? 0 : 1}`, 2.2, 0.36, s * (F - 0.04), 3.3, m.z - s * (Q.mouthHalf + 1.6), -s * Math.PI / 2);
      }
    }
    // the shop that burns (Beat 3): its front already blackened
    const B = Q.blaze;
    this.plate('soot', 7, 5, B.x + 0.06, 3.2, B.z, Math.PI / 2);
  }

  _tree(x, z) {
    const h = this.R(5.2, 6.4);
    this.cyl('bark', 0.18, 0.28, h, x, h / 2 + 0.14, z, 7);
    this.box('darkMetal', 1.5, 0.03, 1.5, x, 0.155, z);
    for (let k = 0; k < 4; k++) {
      const g = new THREE.IcosahedronGeometry(this.R(1.7, 2.5), 1);
      g.scale(1, 0.75, 1);
      g.translate(x + this.R(-1.3, 1.3), h + this.R(0.4, 2.0), z + this.R(-1.3, 1.3));
      const n = g.attributes.position.count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
      if (!g.index) g.setIndex([...Array(n).keys()]);
      this.w.add(this.rng() < 0.5 ? 'leaves' : 'leaves2', g);
    }
    this.collider(x - 0.3, z - 0.3, x + 0.3, z + 0.3, h, 'prop');
  }

  // the promenades: plane trees, lamps and their pools of light, benches facing the water
  _furniture() {
    const Q = QUAYS, w = this.w, clear = (z) => this.nearAny(z, Q.bridges, 4.5) || z > Q.lock.z0 - 3;
    for (const s of [-1, 1]) {
      for (let z = Z0 + 7 + (s > 0 ? 0 : 5); z < Z1 - 4; z += 13) if (!clear(z)) this._tree(s * 9.6, z + this.R(-1, 1));
      for (let z = Z0 + 14; z < Z1 - 2; z += 26) {
        const lz = clear(z) ? z + 6 : z;
        w._lamp(s * 10.2, lz, s);
        this.flat('qPool:0', 13, 13, s * 10, 0.19, lz);
        this.flat('qPool:1', 9, 2.6, s * 3.4, -1.47, lz); // its light lying on the water
      }
      for (let z = Z0 + 20; z < Q.lock.z0 - 6; z += 26) if (!clear(z + 6.5)) w._bench(s * 8.3, z + 6.5, s);
      for (let z = Z0 + 33; z < Z1 - 10; z += 52) if (!clear(z)) w._bin(s * 10.1, z + 1.5, this.rng() < 0.25);
    }
    // notices on the rail
    for (const z of [-776, -676]) { this.cyl('darkMetal', 0.04, 0.04, 2.2, 7.6, 1.24, z, 6); this.plate('qSign:5', 0.6, 0.6, 7.66, 2.0, z, Math.PI / 2); this.plate('qSign:5', 0.6, 0.6, 7.54, 2.0, z, -Math.PI / 2); }
    this.cyl('darkMetal', 0.05, 0.05, 3.2, 8.2, 1.74, -838.5, 6); this.plate('qSign:2', 1.6, 0.8, 8.2, 2.9, -838.44, 0); this.plate('qSign:2', 1.6, 0.8, 8.2, 2.9, -838.56, Math.PI);
    // litter the night has left
    for (let i = 0; i < 150; i++) {
      const s = this.rng() < 0.5 ? -1 : 1, x = s * this.R(7.8, 19), z = this.R(Z0 + 2, Z1 - 2), k = this.rng();
      const y = this.w.groundHeight(x, z) + (this.D.sidewalks.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) ? 0.14 : 0);
      if (k < 0.55) this.box('paper', this.R(0.2, 0.4), 0.005, this.R(0.25, 0.35), x, y + 0.012, z, this.R(0, 6));
      else if (k < 0.8) this.cyl('glass', 0.035, 0.035, 0.26, x, y + 0.04, z, 6, Math.PI / 2, this.R(0, 6));
      else this.box('cardboard', this.R(0.3, 0.6), this.R(0.04, 0.2), this.R(0.3, 0.5), x, y + 0.06, z, this.R(0, 6));
    }
  }

  // cars parked along both quays, against the building side; a CRS van where the squad got out
  _cars() {
    const Q = QUAYS, w = this.w, B = Q.blaze;
    let burnt = 0;
    for (const s of [-1, 1]) {
      for (let z = Z0 + 14; z < Z1 - 6; z += 6.4) {
        if (this.nearAny(z, Q.mouths.filter((m) => m.side === s), Q.mouthHalf + 3.2)) continue;
        if (s > 0 && z > Q.lock.z0 - 2) continue;                 // the lock yard is clear
        if (s < 0 && Math.abs(z - B.z) < 9) continue;             // room for the hose
        if (this.rng() < 0.2) continue;
        const shell = this.rng() < 0.06 && burnt < 3;
        if (shell) burnt++;
        w._car(s * Q.carX + this.R(-0.12, 0.12), z + this.R(-0.3, 0.3), (s > 0 ? 0 : Math.PI) + this.R(-0.04, 0.04), Math.floor(this.rng() * 8), shell ? 'burnt' : 'ok');
      }
    }
    w._van(16.3, -839, 0.04, true);
  }

  // the street bridge the canal comes from, and the vault it leaves under
  _ends() {
    for (const [z, d] of [[Z0 - 2.5, -1], [Z1 + 2.5, 1]]) {
      this.box('stone', 100, 6.5, 3, 0, 3.1, z);
      this.box('stoneDark', 100, 0.5, 3.6, 0, 6.5, z);
      this.collider(-50, z - 1.5, 50, z + 1.5, 12);
      const arch = new THREE.CircleGeometry(6.4, 20, 0, Math.PI); if (d > 0) arch.rotateY(Math.PI);
      arch.translate(0, -0.6, z - d * 1.52); this.w.add('black', arch);
      for (let x = -42; x <= 42; x += 14) this.box('lamp', 0.32, 0.42, 0.32, x, 8.2, z);
      this.mass(-60, z + (d > 0 ? 1.5 : -30), 60, z + (d > 0 ? 30 : -1.5), 15, z - d * 1.5, d > 0 ? Math.PI : 0);
    }
  }
  // the buildings on the street above, a few windows lit (zf: the face towards the canal)
  mass(x0, z0, x1, z1, h, zf, ry) {
    this.box('stoneDark', x1 - x0, h, z1 - z0, (x0 + x1) / 2, 6.6 + h / 2, (z0 + z1) / 2);
    for (let x = x0 + 3; x < x1 - 3; x += 4) for (let y = 9.5; y < 6.6 + h - 2; y += 3.2) {
      if (this.rng() > 0.14) continue;
      this.plate('qLit:0', 1.3, 1.8, x, y, zf + (ry ? -0.06 : 0.06), ry);
    }
  }

  // people at their windows: head and shoulders over the sill, some with a phone held out
  _residents() {
    const Q = QUAYS, F = Q.front, D = this.D, skins = [0xe8b996, 0xb47b55, 0x84553a, 0xdcb08c, 0x6a412b], tops = [0x6a1d1d, 0x22324a, 0xb8b0a2, 0x3a4a3a, 0xd9d6cc, 0x7a3a9a, 0x1d1f22];
    const paint = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    const phones = [], lits = [];
    for (let k = 0; k < 16; k++) {
      const s = k % 2 ? 1 : -1;
      let z = 0;
      for (let t = 0; t < 20; t++) { z = this.R(Z0 + 10, Z1 - 12); if (!this.nearAny(z, Q.mouths.filter((m) => m.side === s), Q.mouthHalf + 2) && !(s < 0 && Math.abs(z - Q.blaze.z) < 12) && !D.residents.some((r) => r.side === s && Math.abs(r.z - z) < 7)) break; }
      const f = this.rng() < 0.6 ? 1 : 2, y = 4.5 + f * 3.1 + 1.0, x = s * (F - 0.32), skin = skins[k % skins.length], top = tops[(k * 3) % tops.length];
      const torso = paint(new THREE.BoxGeometry(0.46, 0.5, 0.26), top); torso.translate(0, 0.1, 0);
      const head = paint(new THREE.SphereGeometry(0.115, 10, 8), skin); head.translate(0, 0.5, 0.03);
      const hair = paint(new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0x1a1410); hair.translate(0, 0.52, 0.01);
      const armL = paint(new THREE.BoxGeometry(0.1, 0.12, 0.44), top); armL.translate(-0.26, 0.02, 0.2);
      const phone = this.rng() < 0.55;
      const armR = paint(new THREE.BoxGeometry(0.1, 0.36, 0.12), top);
      if (phone) { armR.rotateX(-1.1); armR.translate(0.24, 0.3, 0.2); } else { armR.rotateX(-Math.PI / 2); armR.translate(0.26, 0.02, 0.2); }
      const g = mergeGeometries([torso, head, hair, armL, armR].map((p) => (p.index ? p.toNonIndexed() : p)), false);
      const mesh = new THREE.Mesh(g, this.resMat);
      mesh.position.set(x, y, z); mesh.rotation.y = -s * Math.PI / 2; mesh.castShadow = false;
      D.group.add(mesh);
      D.residents.push({ mesh, side: s, x, y, z, ph: this.R(0, 6), phone });
      const win = new THREE.PlaneGeometry(1.2, 1.8); win.rotateY(-s * Math.PI / 2); win.translate(s * (F - 0.045), y + 0.45, z); lits.push(win);
      if (phone) { const p = new THREE.PlaneGeometry(0.08, 0.14); p.rotateY(s * Math.PI / 2); p.translate(x - s * 0.36, y + 0.5, z - s * 0.24); phones.push(p); }
    }
    const one = (list, mat) => { if (!list.length) return; const m = new THREE.Mesh(mergeGeometries(list, false), mat); m.castShadow = false; D.group.add(m); };
    one(lits, this.w.mat('qLit:0')); one(phones, this.w.mat('qLit:1'));
  }

  // the fire engine and its hose: driven by the level script
  _moving() {
    const Q = QUAYS, D = this.D, w = this.w, E = Q.engine;
    const P = vanParts('service', 'fireRed');
    const by = new Map();
    const put = (k, g) => { if (!by.has(k)) by.set(k, []); by.get(k).push(g.index ? g.toNonIndexed() : g); };
    for (const [k, g] of P.parts) put(k, g);
    const B = (k, bw, bh, bd, x, y, z) => { const g = new THREE.BoxGeometry(bw, bh, bd); g.translate(x, y, z); put(k, g); };
    B('white', P.W + 0.03, 0.12, 5.3, 0, 1.1, -0.05);
    B('darkMetal', 0.08, 0.08, 4.2, -0.45, P.H + 0.16, -0.7); B('darkMetal', 0.08, 0.08, 4.2, 0.45, P.H + 0.16, -0.7); // the ladder
    for (let z = -2.6; z <= 1.2; z += 0.42) B('metal', 0.9, 0.05, 0.05, 0, P.H + 0.16, z);
    B('metal', P.W + 0.04, 0.9, 1.4, 0, 1.1, -1.9); // the pump locker
    const G = new THREE.Group(); G.name = 'fireEngine';
    for (const [k, list] of by) {
      for (const g of list) { for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a); g.setAttribute('vid', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1)); }
      const m = new THREE.Mesh(mergeGeometries(list, false), w.mat(k));
      m.castShadow = true; m.receiveShadow = true; G.add(m);
    }
    for (const [i, sx] of [[0, -1], [1, 1]]) { const g = new THREE.BoxGeometry(0.75, 0.16, 0.3); g.translate(sx * 0.42, P.H + 0.1, 0.55); G.add(new THREE.Mesh(g, i ? w.materials.lightB : w.materials.lightA)); }
    D.group.add(G);
    const col = w.addObstacle(E.x, E.from, 2.2, 6.4, 0, 2.6, 'vehicle');
    const bar = V(E.x, -999, E.from);
    D.lightBars.push(bar);
    D.engine = { group: G, col, bar, z: E.from, on: false };
    D.setEngine = (z, on) => {
      D.engine.z = z; D.engine.on = on;
      G.position.set(E.x, 0, z); G.visible = on;
      col.off = !on;
      if (on) w.moveObstacle(col, E.x, z, 0);
      bar.set(E.x, on ? P.H + 0.3 : -999, z + 0.55);
    };
    // the hose, from the pump locker round to the nozzle
    const n = Q.crew[0], pts = [V(E.x - 1.05, 0.9, E.at - 1.9), V(E.x - 1.7, 0.08, E.at - 1.2), V(E.x - 2.4, 0.06, E.at + 3.2), V(n[0] + 1.4, 0.06, n[1] + 2.6), V(n[0] + 0.9, 0.5, n[1] + 0.3), V(n[0] - 0.3, 1.1, n[1] + 0.25)];
    const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.045, 6), new THREE.MeshStandardMaterial({ color: 0xb8a070, roughness: 0.9 }));
    hose.castShadow = false; hose.visible = false;
    D.group.add(hose);
    D.hose = hose; D.nozzle = V(n[0] - 0.45, 1.15, n[1] + 0.25);
    D.setEngine(E.from, false);
  }
}
