// Level 6 district: Place de la République at 05h10.
//
//  A wide paved square, 88 m by 94 m, with the Marianne monument in its northern half on a
//  round base of two broad steps (where the people who are left sit). Plane trees in rows
//  along the edges, lamps, benches, a glass café pavilion, the night's litter. Seven streets
//  open off it; the CRS vans close the eighth, Avenue de la République, to the south, and the
//  CRS line stands across the square in front of them.
//
// Built once, when Level 6 first loads, into its own group (World.registerDistrict /
// setDistrict), 160 m north of the canal so nothing of the other levels is in view. Everything
// is level ground: the monument's steps are scenery, and its base is one octagonal obstacle.
// Lit windows, signs and lamp pools are unlit materials, so no light is added. Placement draws
// from its own random stream.
import * as THREE from 'three';
import { mulberry } from './textures.js';
import { quietly } from './world.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// ------------------------------------------------------------------ layout data
const X = 44, Z0 = -1037, Z1 = -943;
export const REP = {
  bounds: { minX: -X, maxX: X, minZ: Z0, maxZ: Z1 },
  start: { x: 0.4, z: -975.5, heading: Math.PI }, // behind the CRS line, facing the monument (north)
  monument: { x: 0, z: -1010, base: 6.6, step1: 7.4, step2: 8.2, col: 7.0 },
  line: { z: -982, back: 20 },                     // the CRS line, and how far it pulls back if asked
  vans: [[-7, -950, 0.06], [7.2, -951, -0.05], [-19, -953, 0.5], [19.5, -954, -0.45]],
  // the streets off the square: where people leave. side: the square's edge (w, e, n, s)
  exits: [
    { id: 'W', side: 'w', at: -1000, name: 'Boulevard Saint-Martin' },
    { id: 'NW', side: 'n', at: -20, name: 'Boulevard de Magenta' },
    { id: 'NE', side: 'n', at: 22, name: 'Rue Léon-Jouhaux' },
    { id: 'E', side: 'e', at: -1014, name: 'Rue du Faubourg-du-Temple' },
    { id: 'SE', side: 's', at: 28, name: 'Boulevard Voltaire' },
    { id: 'SW', side: 's', at: -28, name: 'Boulevard du Temple' },
  ],
  exitHalf: 5,
  // the night's places on the square
  medics: [-15.5, -1006],   // the street medics' post: foil blankets on the ground, a bag
  students: [13.5, -1017],  // the students, a banner laid out on the paving
  kiosk: [-27, -1027],      // the glass café pavilion
  landmarks: { start: [0.4, -975.5], monument: [0, -1000.5], medics: [-15.5, -1003], students: [13.5, -1013], north: [0, -1032], west: [-40, -1000], east: [40, -1014] },
  walkRects: [[-X, Z0, X, Z1]],
  areas: [['the monument', -10, -1020, 10, -1000], ['the north side', -X, Z0, X, -1020], ['the CRS line', -X, -990, X, Z1]],
};

export function repArea(x, z) {
  for (const [name, x0, z0, x1, z1] of REP.areas) if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return name;
  return x < 0 ? 'the west side' : 'the east side';
}
// the mouth of an exit, just inside the square, and a point down the street beyond it
export function exitPoints(e) {
  const h = 2.2;
  if (e.side === 'w') return [[-X + h, e.at], [-X - 9, e.at]];
  if (e.side === 'e') return [[X - h, e.at], [X + 9, e.at]];
  if (e.side === 'n') return [[e.at, Z0 + h], [e.at, Z0 - 9]];
  return [[e.at, Z1 - h], [e.at, Z1 + 9]];
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
// a street medic's back: a red cross on white
export function crossTexture() {
  return quietly(() => {
    const [c, ctx] = canvas(128, 128);
    ctx.fillStyle = '#f2f2ee'; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#c8161d'; ctx.fillRect(48, 16, 32, 96); ctx.fillRect(16, 48, 96, 32);
    return tex(c);
  });
}
// the captain's back patch
export function captainTexture() {
  return quietly(() => textTex(['CAPITAINE'], { w: 256, h: 128, bg: '#e9ecef', fg: '#0d1117', font: 'bold 44px Arial', border: '#0d1117' }));
}

// ------------------------------------------------------------------ the builder
export function buildRepublique(world, scene, renderer, camera) {
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
    this.rng = mulberry(6600);
    this.D = { group: new THREE.Group(), sidewalks: [], roads: [], blocks: [], fires: [], smokes: [], lightBars: [], suppressed: [] };
    this.D.group.name = 'district:l6';
  }

  R(a, b) { return a + (b - a) * this.rng(); }

  _materials() {
    const m = this.w.materials;
    const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
    const lit = (o) => new THREE.MeshBasicMaterial({ fog: true, ...o });
    m.rBronze = std({ color: 0x3c4a3e, roughness: 0.45, metalness: 0.6, emissive: 0x1a221c, emissiveIntensity: 0.25 });
    m.rStone = std({ color: 0x8f8a80, roughness: 0.85 });
    m.rStep = std({ color: 0x7e7a72, roughness: 0.9 });
    m.rFoil = std({ color: 0xd8c27a, roughness: 0.25, metalness: 0.85 });
    m.rLit = [0xffd9a0, 0xdfe9ff].map((c) => lit({ color: c }));
    const plate = (t) => textTex([t], { w: 768, h: 128, bg: '#16357e', fg: '#fff', font: 'bold 58px Arial', border: '#2f6a3a' });
    m.rSign = [
      plate('PLACE DE LA RÉPUBLIQUE'),
      textTex(['LIBÉREZ NOS', 'CAMARADES'], { w: 512, h: 256, bg: '#f4f1ea', fg: '#1b1b1b', font: 'bold 70px Arial' }),
      textTex(['CAFÉ'], { w: 256, h: 96, bg: '#1d2a22', fg: '#e8d9a8', font: 'bold 60px Georgia, serif' }),
      ...REP.exits.map((e) => plate(e.name.toUpperCase())),
    ].map((t) => std({ map: t, roughness: 0.5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.22 }));
  }

  // ------------------------------------------------------------------ primitives
  box(k, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) { return this.w.box(k, w, h, d, x, y, z, ry, rx, rz); }
  cyl(k, rt, rb, h, x, y, z, seg = 10, rx = 0, rz = 0) { this.w.cyl(k, rt, rb, h, x, y, z, seg, rx, rz); }
  floor(k, x0, z0, x1, z1, y = 0.002, us = 14) { this.w.quad(k, V(x0, y, z1), V(1, 0, 0), V(0, 0, -1), x1 - x0, z1 - z0, (x1 - x0) / us, (z1 - z0) / us); }
  plate(k, w, h, x, y, z, ry) { const g = new THREE.PlaneGeometry(w, h); g.rotateY(ry); g.translate(x, y, z); this.w.add(k, g); }
  flat(k, w, d, x, y, z, ry = 0) { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.rotateY(ry); g.translate(x, y, z); this.w.add(k, g); }
  collider(x0, z0, x1, z1, h = 12, tag = 'building') { return this.w.addCollider(x0, z0, x1, z1, h, tag); }
  solid(x0, z0, x1, z1) { this.collider(x0, z0, x1, z1, 40); this.D.blocks.push({ x0, z0, x1, z1 }); }

  // ------------------------------------------------------------------ build
  build() {
    const w = this.w, D = this.D;
    this._materials();
    D.roads = REP.walkRects.map(([x0, z0, x1, z1]) => ({ x0, z0, x1, z1 }));
    const before = new Set(this.scene.children), fires0 = w.fires.length, smokes0 = w.smokes.length, bars0 = w.lightBars.length;
    this._ground();
    this._buildings();
    this._monument();
    this._furniture();
    this._places();
    this._vans();
    w._flush(D.group, ['rLit', 'rSign']);
    for (const o of [...this.scene.children]) if (!before.has(o)) D.group.add(o);
    D.fires = w.fires.splice(fires0); D.smokes = w.smokes.splice(smokes0); D.lightBars = w.lightBars.splice(bars0);
    this.scene.add(D.group);
    try { this.renderer.compile(this.scene, this.camera); } catch (e) { /* compiled on first sight instead */ }
    D.group.visible = false;
    D.update = () => {};
    return D;
  }

  _ground() {
    this.w.quad('ground', V(-140, -0.06, -880), V(1, 0, 0), V(0, 0, -1), 280, 230);
    // the square's paving, the road round it and the streets that leave it
    this.floor('cobble', -X, Z0, X, Z1, 0.003, 6);
    this.floor('roadPlain', -X - 6, Z0 - 6, X + 6, Z1 + 6, 0.001);
    for (const e of REP.exits) {
      const h = REP.exitHalf;
      if (e.side === 'w') this.floor('roadPlain', -X - 40, e.at - h, -X, e.at + h, 0.0015);
      else if (e.side === 'e') this.floor('roadPlain', X, e.at - h, X + 40, e.at + h, 0.0015);
      else if (e.side === 'n') this.floor('roadPlain', e.at - h, Z0 - 40, e.at + h, Z0, 0.0015);
      else this.floor('roadPlain', e.at - h, Z1, e.at + h, Z1 + 40, 0.0015);
    }
    this.floor('roadPlain', -6, Z1, 6, Z1 + 40, 0.0015); // Avenue de la République, behind the vans
    // kerbs along the square's edge
    for (const s of [-1, 1]) this.box('curb', 0.25, 0.12, Z1 - Z0, s * (X + 0.4), 0.06, (Z0 + Z1) / 2);
  }

  // four frontages facing the square, cut by the streets; lit windows; the street plates
  _buildings() {
    const F = 6.5, H = REP.exitHalf;
    let shop = 11;
    const run = (cuts, lo, hi) => { const out = []; let a = lo; for (const c of cuts.sort((p, q) => p - q)) { out.push([a, c - H]); a = c + H; } out.push([a, hi]); return out; };
    const at = (side) => REP.exits.filter((e) => e.side === side).map((e) => e.at);
    // west and east: facades at x = -(X+F) and X+F, along z
    for (const s of [-1, 1]) {
      const fx = s * (X + F);
      for (const [a, b] of run(at(s < 0 ? 'w' : 'e'), Z0 - F - 10, Z1 + F + 10)) {
        if (b - a < 1) continue;
        this.w._frontage(V(fx, 0, a), V(0, 0, 1), V(-s, 0, 0), b - a, 14, () => shop++, this.rng);
        this.solid(s < 0 ? -X - 60 : fx, a, s < 0 ? fx : X + 60, b);
        this._windows(fx - s * 0.05, a, b, 'z', -s * Math.PI / 2);
      }
    }
    // north and south: facades at z = Z0-F and Z1+F, along x (the south one also cut by the avenue)
    for (const [side, fz, n] of [['n', Z0 - F, 1], ['s', Z1 + F, -1]]) {
      const cuts = at(side); if (side === 's') cuts.push(0);
      for (const [a, b] of run(cuts, -X - F, X + F)) {
        if (b - a < 1) continue;
        this.w._frontage(V(a, 0, fz), V(1, 0, 0), V(0, 0, n), b - a, 14, () => shop++, this.rng);
        this.solid(a, n > 0 ? fz - 60 : fz, b, n > 0 ? fz : fz + 60);
        this._windows(fz + n * 0.05, a, b, 'x', n > 0 ? 0 : Math.PI);
      }
    }
    // the far end of each street: a dark wall, one lamp deep inside; a name plate at the corner
    REP.exits.forEach((e, i) => {
      const [, [ox, oz]] = exitPoints(e);
      const far = (k) => (e.side === 'w' ? [-X - 36, e.at] : e.side === 'e' ? [X + 36, e.at] : e.side === 'n' ? [e.at, Z0 - 36] : [e.at, Z1 + 36])[k];
      if (e.side === 'w' || e.side === 'e') this.box('stoneDark', 3, 18, 2 * H + 2, far(0), 9, far(1)); else this.box('stoneDark', 2 * H + 2, 18, 3, far(0), 9, far(1));
      this.box('lamp', 0.3, 0.4, 0.3, (ox + far(0)) / 2, 5.2, (oz + far(1)) / 2);
      const [mx, mz] = exitPoints(e)[0];
      if (e.side === 'w' || e.side === 'e') this.plate(`rSign:${3 + i}`, 2.4, 0.36, Math.sign(mx) * (X + F - 0.05), 3.3, e.at - H - 1.3, -Math.sign(mx) * Math.PI / 2);
      else this.plate(`rSign:${3 + i}`, 2.4, 0.36, e.at - H - 1.3, 3.3, e.side === 'n' ? Z0 - F + 0.05 : Z1 + F - 0.05, e.side === 'n' ? 0 : Math.PI);
      void mz;
    });
    this.plate('rSign:0', 3.2, 0.42, -X - F + 0.05, 3.4, -1023, Math.PI / 2);
  }
  _windows(f, a, b, along, ry) {
    for (let u = a + 2; u < b - 2; u += 3) for (let k = 0; k < 4; k++) {
      if (this.rng() > 0.08) continue;
      const y = 4.5 + k * 3.1 + 1.55;
      if (along === 'z') this.plate(`rLit:${this.rng() < 0.75 ? 0 : 1}`, 1.1, 1.7, f, y, u, ry); else this.plate(`rLit:${this.rng() < 0.75 ? 0 : 1}`, 1.1, 1.7, u, y, f, ry);
    }
  }

  // Marianne on her pedestal, the three seated figures round it, the lion and the urn, on a
  // round base of two steps. One octagonal obstacle stands for the base.
  _monument() {
    const M = REP.monument, x = M.x, z = M.z;
    this.cyl('rStep', M.step2, M.step2 + 0.05, 0.24, x, 0.12, z, 48);
    this.cyl('rStep', M.step1, M.step1 + 0.04, 0.48, x, 0.24, z, 48);
    this.cyl('rStone', M.base, M.base + 0.1, 1.7, x, 0.85, z, 40);
    this.cyl('rStone', 4.6, 4.8, 0.5, x, 1.95, z, 32);
    // the pedestal: a square shaft with a cornice
    this.box('rStone', 3.6, 9.0, 3.6, x, 6.7, z); this.box('rStone', 4.3, 0.6, 4.3, x, 11.4, z); this.box('rStone', 3.2, 0.9, 3.2, x, 12.1, z);
    for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2; this.box('rBronze', 2.2, 1.6, 0.06, x + Math.sin(a) * 1.83, 4.2, z + Math.cos(a) * 1.83, a); } // the reliefs
    // Marianne: robe, torso, head in the Phrygian cap, the right arm up with the olive branch,
    // the left hand on the tablet of the rights of man
    const B = (k, ...a) => this.box(k, ...a);
    this.cyl('rBronze', 0.75, 1.15, 3.2, x, 14.15, z, 14);
    this.cyl('rBronze', 0.5, 0.72, 1.6, x, 16.5, z, 12);
    const head = new THREE.SphereGeometry(0.38, 12, 8); head.translate(x, 17.75, z); this.w.add('rBronze', head);
    const cap = new THREE.ConeGeometry(0.36, 0.7, 10); cap.rotateX(0.5); cap.translate(x, 18.15, z - 0.12); this.w.add('rBronze', cap);
    this.cyl('rBronze', 0.13, 0.16, 2.1, x + 0.62, 18.2, z, 6, 0, -0.3);
    this.cyl('rBronze', 0.06, 0.26, 1.1, x + 0.98, 19.6, z, 6, 0, -0.3);
    B('rBronze', 0.9, 1.3, 0.14, x - 0.75, 15.6, z + 0.4, 0.3);
    // the three seated figures on the base: Liberty, Equality, Fraternity
    for (let k = 0; k < 3; k++) {
      const a = Math.PI * (0.35 + k * 0.65), bx = x + Math.sin(a) * 4.0, bz = z + Math.cos(a) * 4.0;
      B('rStone', 1.6, 1.1, 1.6, bx, 2.75, bz, a);
      this.cyl('rBronze', 0.42, 0.62, 1.5, bx, 4.05, bz, 10);
      const h = new THREE.SphereGeometry(0.26, 10, 6); h.translate(bx, 5.05, bz); this.w.add('rBronze', h);
    }
    // the lion and the urn of universal suffrage, facing south (towards the CRS line)
    const lz = z + 5.4;
    B('rStone', 2.6, 0.7, 1.4, x, 2.05, lz);
    B('rBronze', 2.1, 0.8, 0.9, x, 2.75, lz); B('rBronze', 0.7, 0.9, 0.8, x - 0.95, 3.3, lz + 0.05);
    this.cyl('rBronze', 0.3, 0.22, 0.7, x + 0.8, 3.5, lz, 10);
    // the base as one octagon: four bars across it, each joining two opposite faces
    const r = M.col, half = r * Math.tan(Math.PI / 8);
    for (let k = 0; k < 4; k++) this.w.addObstacle(x, z, 2 * r, 2 * half + 0.02, (k * Math.PI) / 4, 2, 'monument');
    // what the night left on the steps: chalk, a flag, candles
    for (let k = 0; k < 10; k++) {
      const a = this.R(0, Math.PI * 2), rr = this.R(M.step1 + 0.1, M.step2 - 0.1);
      this.box(this.rng() < 0.5 ? 'paper' : 'cardboard', this.R(0.2, 0.4), 0.01, this.R(0.2, 0.3), x + Math.sin(a) * rr, 0.25, z + Math.cos(a) * rr, this.R(0, 6));
    }
    for (let k = 0; k < 14; k++) { const a = this.R(-0.9, 0.9) + Math.PI * (k % 2), rr = M.step1 - 0.3; this.cyl('white', 0.04, 0.04, 0.1, x + Math.sin(a) * rr, 0.53, z + Math.cos(a) * rr, 6); }
  }

  _tree(x, z) {
    const h = this.R(5.8, 7.2);
    this.cyl('bark', 0.2, 0.3, h, x, h / 2, z, 7);
    this.box('darkMetal', 1.6, 0.03, 1.6, x, 0.02, z);
    for (let k = 0; k < 4; k++) {
      const g = new THREE.IcosahedronGeometry(this.R(1.9, 2.7), 1);
      g.scale(1, 0.75, 1);
      g.translate(x + this.R(-1.3, 1.3), h + this.R(0.4, 2.0), z + this.R(-1.3, 1.3));
      const n = g.attributes.position.count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
      if (!g.index) g.setIndex([...Array(n).keys()]);
      this.w.add(this.rng() < 0.5 ? 'leaves' : 'leaves2', g);
    }
    this.collider(x - 0.3, z - 0.3, x + 0.3, z + 0.3, h, 'prop');
  }

  // rows of plane trees, lamps, benches under the trees, bins, the café pavilion, litter
  _furniture() {
    const w = this.w, near = (x, z, list, d) => list.some(([a, b]) => Math.hypot(x - a, z - b) < d);
    const keep = [[REP.monument.x, REP.monument.z]], wide = REP.monument.step2 + 6;
    // the rows along the north edge and the two sides
    for (let x = -38; x <= 38; x += 9.5) if (!REP.exits.some((e) => e.side === 'n' && Math.abs(e.at - x) < 7)) this._tree(x, Z0 + 4.5);
    for (const s of [-1, 1]) for (let z = Z0 + 14; z < Z1 - 12; z += 10) {
      if (REP.exits.some((e) => e.side === (s < 0 ? 'w' : 'e') && Math.abs(e.at - z) < 8)) continue;
      this._tree(s * (X - 4), z);
      if (this.rng() < 0.6) w._bench(s * (X - 6.2), z + 4.5, s);
    }
    // lamps round the square, and four tall ones round the monument
    for (let x = -32; x <= 32; x += 16) { w._lamp(x, Z0 + 8, 0); w._lamp(x, Z1 - 15, 0); }
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2; w._lamp(REP.monument.x + Math.sin(a) * 13, REP.monument.z + Math.cos(a) * 13, 0); }
    for (const [x, z] of [[-36, -980], [36, -985], [-30, -1032], [30, -1032], [-18, -966], [18, -966]]) w._bin(x, z, this.rng() < 0.3);
    // the café pavilion: glass on a dark frame, chairs stacked against it
    const [kx, kz] = REP.kiosk;
    this.box('darkMetal', 8.2, 0.25, 5.2, kx, 3.3, kz); this.box('glass', 7.8, 3.0, 4.8, kx, 1.6, kz);
    for (const [dx, dz] of [[-3.9, -2.4], [3.9, -2.4], [-3.9, 2.4], [3.9, 2.4]]) this.box('darkMetal', 0.14, 3.2, 0.14, kx + dx, 1.6, kz + dz);
    this.plate('rSign:2', 1.6, 0.6, kx, 2.9, kz + 2.62, 0);
    for (let k = 0; k < 6; k++) this.box('wood', 0.45, 0.9, 0.45, kx - 3 + k * 1.1, 0.45, kz + 3.0, this.R(-0.2, 0.2));
    this.collider(kx - 4.1, kz - 2.6, kx + 4.1, kz + 3.4, 3.4, 'prop');
    // the litter of the night: paper, bottles, cardboard placards, a flag
    for (let i = 0; i < 260; i++) {
      const x = this.R(-X + 1, X - 1), z = this.R(Z0 + 1, Z1 - 4), k = this.rng();
      if (near(x, z, keep, REP.monument.col + 0.4)) continue;
      if (k < 0.55) this.box('paper', this.R(0.2, 0.4), 0.005, this.R(0.25, 0.35), x, 0.012, z, this.R(0, 6));
      else if (k < 0.8) this.cyl('glass', 0.035, 0.035, 0.26, x, 0.04, z, 6, Math.PI / 2, this.R(0, 6));
      else if (k < 0.95) this.box('cardboard', this.R(0.4, 0.7), 0.02, this.R(0.3, 0.5), x, 0.02, z, this.R(0, 6));
      else this.box('frFlagStatic', 1.1, 0.01, 0.7, x, 0.015, z, this.R(0, 6));
    }
    void wide;
  }

  // the medics' post and the students' banner
  _places() {
    const [mx, mz] = REP.medics, [sx, sz] = REP.students;
    for (let k = 0; k < 4; k++) this.box('rFoil', 0.9, 0.02, 1.9, mx + this.R(-2.5, 2.5), 0.015, mz + this.R(-2.6, 2.6), this.R(0, 3));
    this.box('fireRed', 0.55, 0.3, 0.35, mx + 1.6, 0.16, mz - 1.4, 0.4); this.box('white', 0.08, 0.2, 0.36, mx + 1.6, 0.18, mz - 1.4, 0.4);
    this.flat('rSign:1', 3.2, 1.6, sx + 1.6, 0.02, sz - 2.2, 0.15);
    for (let k = 0; k < 3; k++) this.box('cardboard', 0.6, 0.02, 0.45, sx + this.R(-2, 2), 0.02, sz + this.R(-1, 2), this.R(0, 3));
  }

  // the CRS vans across Avenue de la République, their light bars on
  _vans() {
    for (const [x, z, ry] of REP.vans) this.w._van(x, z, ry, true);
  }
}
