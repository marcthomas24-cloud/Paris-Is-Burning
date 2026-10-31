// Level 3 district: the transfer route south of the CRS staging area.
//
//  staging area (existing, z 135-181) -> cordon gate (z 181) -> boulevard south (existing
//  road, z 181-233) -> Rue des Ateliers (cross street, z 233-247) -> two routes, the Avenue
//  (x +-13, blocked by a burnt-out bus at z 292) and the Passage (x 35-45) -> Place du
//  Chateau-d'Eau (x +-48, z 345-445: monument, metro, rally) -> Rue de la Caserne (exit
//  street, x +-10) -> the extraction point (z 478) in front of the gendarmerie vans.
//
// Built once, when Level 3 first loads, into its own group (World.registerDistrict /
// setDistrict show and hide it with the level). Its buildings are its own: five facade styles
// (brick, ochre render with shutters, pale limestone, glass offices, art deco) on several roof
// types, with their own shop fronts and signs, so the district reads differently from the
// boulevard. Everything uses the renderer's existing material types; lit signs, lit windows
// and the pools of street light are unlit (MeshBasicMaterial), so no light is added and the
// light count never changes. Placement draws from its own random stream.
import * as THREE from 'three';
import { mulberry, streetSignTexture, bannerTexture } from './textures.js';
import { quietly } from './world.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// ------------------------------------------------------------------ layout data
// Everything the level, the crowd and the developer tools need to know about the district.
export const DISTRICT = {
  bounds: { minX: -60, maxX: 60, minZ: 135, maxZ: 492 },
  start: { x: 3, z: 150, heading: 0 },
  // the five landmarks the player should recognise (dev tools, act markers)
  landmarks: {
    staging: [0, 165], blockedStreet: [0, 292], square: [0, 386], metro: [27, 370], extraction: [0, 478],
  },
  // where each act begins (the shell mission's jump points)
  acts: [
    { name: 'THE TRANSFER', at: [3, 150], heading: 0 },
    { name: 'THE ROADBLOCK', at: [0, 240], heading: 0 },
    { name: 'THE SQUARE', at: [0, 352], heading: 0 },
    { name: 'THE INTERCEPT', at: [0, 412], heading: 0 },
  ],
  arena: { x: 0, z: 428, r: 15 },
  // places a person can stand (the navigation check reports anything reachable outside them)
  walkRects: [
    [-15, 135, 15, 233],   // staging area and the boulevard south
    [-60, 233, 60, 247],   // Rue des Ateliers
    [-13, 247, 13, 345],   // the Avenue
    [35, 247, 45, 345],    // the Passage
    [-48, 345, 48, 445],   // the square
    [-60, 388, -48, 402], [48, 388, 60, 402], // side streets off the square
    [-10, 445, 10, 492],   // Rue de la Caserne
  ],
  areas: [
    ['Staging area', -15, 135, 15, 181], ['Boulevard south', -15, 181, 15, 233], ['Rue des Ateliers', -60, 233, 60, 247],
    ['The Avenue', -13, 247, 13, 345], ['The Passage', 35, 247, 45, 345], ['Rue de la Fontaine', -60, 388, -48, 402],
    ['Rue des Douanes', 48, 388, 60, 402], ['Place du Château-d\'Eau', -48, 345, 48, 445], ['Rue de la Caserne', -10, 445, 10, 492],
  ],
};

export function areaAt(x, z) {
  for (const [name, x0, z0, x1, z1] of DISTRICT.areas) if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return name;
  return z < 135 ? 'Boulevard (out of bounds)' : 'outside the playable area';
}

// ------------------------------------------------------------------ textures
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
  return t;
}
function speckle(ctx, W, H, rnd, n, a) {
  for (let i = 0; i < n; i++) { const v = rnd() < 0.5 ? 0 : 255; ctx.fillStyle = `rgba(${v},${v},${v},${a * rnd()})`; ctx.fillRect(rnd() * W, rnd() * H, 2, 2); }
}
function streaks(ctx, W, H, rnd, k) {
  for (let i = 0; i < 26 * k; i++) {
    const x = rnd() * W, y = rnd() * H * 0.6, h = 40 + rnd() * 160;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(20,18,16,0.18)'); g.addColorStop(1, 'rgba(20,18,16,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, 3 + rnd() * 8, h);
  }
}

// Facade styles. One texture tile = 4 bays (6 m each) x 4 floors; windows are given per cell
// as fractions from the cell's bottom-left, so lit-window quads line up with the painted ones.
const STYLES = [
  { id: 'brick', fh: 3.1, wall: '#6f3527', wins: [[0.14, 0.38, 0.2, 0.8], [0.62, 0.86, 0.2, 0.8]], roof: 'flat', trim: 0 },
  { id: 'render', fh: 3.0, wall: '#b49064', wins: [[0.2, 0.36, 0.18, 0.8], [0.64, 0.8, 0.18, 0.8]], roof: 'mansard', trim: 1 },
  { id: 'stone', fh: 3.2, wall: '#cbc5b8', wins: [[0.15, 0.37, 0.12, 0.84], [0.63, 0.85, 0.12, 0.84]], roof: 'mansard', trim: 1 },
  { id: 'glass', fh: 3.5, wall: '#1b2228', wins: [[0.03, 0.97, 0.28, 0.94]], roof: 'flat', trim: 2 },
  { id: 'deco', fh: 3.3, wall: '#ddd3bf', wins: [[0.22, 0.78, 0.22, 0.8]], roof: 'stepped', trim: 1 },
];
const S = Object.fromEntries(STYLES.map((s, i) => [s.id, i]));

function facadeTile(si) {
  const st = STYLES[si], rnd = mulberry(7700 + si * 13);
  const CW = 256, CH = 128, W = CW * 4, H = CH * 4;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = st.wall; ctx.fillRect(0, 0, W, H);
  speckle(ctx, W, H, rnd, 26000, 0.09);
  if (st.id === 'brick') {
    for (let y = 0; y < H; y += 8) {
      ctx.fillStyle = 'rgba(35,18,12,0.35)'; ctx.fillRect(0, y, W, 1.5);
      for (let x = (y / 8) % 2 ? 0 : 12; x < W; x += 24) { ctx.fillStyle = 'rgba(35,18,12,0.3)'; ctx.fillRect(x, y, 1.5, 8); ctx.fillStyle = `rgba(${rnd() < 0.5 ? '150,70,50' : '60,25,18'},${0.12 * rnd()})`; ctx.fillRect(x + 2, y + 2, 20, 5); }
    }
  }
  if (st.id === 'stone') for (let y = 0; y < H; y += 32) { ctx.fillStyle = 'rgba(70,64,55,0.16)'; ctx.fillRect(0, y, W, 2); }
  for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) {
    const cx = b * CW, top = (3 - f) * CH; // canvas: the top row is the highest floor
    const R = (fx, fy) => [cx + fx * CW, top + (1 - fy) * CH]; // cell fraction (from bottom) -> canvas
    if (st.id === 'brick') { ctx.fillStyle = 'rgba(190,120,90,0.35)'; ctx.fillRect(cx, top + CH - 6, CW, 6); }
    if (st.id === 'deco') { ctx.fillStyle = 'rgba(120,105,80,0.28)'; ctx.fillRect(cx, top, 18, CH); ctx.fillRect(cx + CW - 18, top, 18, CH); ctx.fillStyle = 'rgba(255,250,235,0.4)'; for (let k = 0; k < 3; k++) ctx.fillRect(cx + CW / 2 - 30 + k * 24, top + 6, 12, 12); }
    if (st.id === 'glass') { ctx.fillStyle = '#4a545d'; ctx.fillRect(cx, top, CW, CH * 0.28); ctx.fillStyle = '#2a3036'; ctx.fillRect(cx, top + CH * 0.72, CW, 4); }
    for (const [x0, x1, y0, y1] of st.wins) {
      const [ax, ay] = R(x0, y1), [bx, by] = R(x1, y0), w = bx - ax, h = by - ay;
      const lit = rnd() < (st.id === 'glass' ? 0.22 : 0.16);
      const g = ctx.createLinearGradient(0, ay, 0, by);
      if (lit) { const warm = st.id !== 'glass'; g.addColorStop(0, warm ? '#9a7a4a' : '#8fa4b8'); g.addColorStop(1, warm ? '#4a3a22' : '#3d4b58'); }
      else { g.addColorStop(0, '#34404c'); g.addColorStop(0.55, '#1a2129'); g.addColorStop(1, '#242b31'); }
      ctx.fillStyle = g; ctx.fillRect(ax, ay, w, h);
      // reflections of the sky glow
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + w * 0.4, ay); ctx.lineTo(ax + w * 0.1, by); ctx.lineTo(ax, by); ctx.fill();
      if (st.id === 'brick') { ctx.fillStyle = '#d8d2c4'; ctx.fillRect(ax - 4, ay - 8, w + 8, 7); ctx.fillRect(ax - 4, by, w + 8, 5); ctx.strokeStyle = '#e8e4da'; ctx.lineWidth = 3; ctx.strokeRect(ax, ay, w, h); ctx.beginPath(); ctx.moveTo(ax + w / 2, ay); ctx.lineTo(ax + w / 2, by); ctx.stroke(); }
      if (st.id === 'render') {
        // wooden shutters (volets), some half closed
        const col = ['#5a6f73', '#6d5c48', '#4f5d4b'][Math.floor(rnd() * 3)];
        ctx.fillStyle = col; ctx.fillRect(ax - w * 0.42, ay, w * 0.4, h); ctx.fillRect(bx + 2, ay, w * 0.4, h);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = ay; y < by; y += 6) { ctx.fillRect(ax - w * 0.42, y, w * 0.4, 1.5); ctx.fillRect(bx + 2, y, w * 0.4, 1.5); }
        if (rnd() < 0.3) { ctx.fillStyle = col; ctx.fillRect(ax, ay, w * 0.5, h); }
        ctx.strokeStyle = '#efe7d8'; ctx.lineWidth = 2; ctx.strokeRect(ax, ay, w, h);
        ctx.fillStyle = 'rgba(240,232,215,0.6)'; ctx.fillRect(ax - 6, by, w + 12, 5);
      }
      if (st.id === 'stone') {
        ctx.fillStyle = 'rgba(245,240,230,0.5)'; ctx.fillRect(ax - 8, ay - 14, w + 16, 10);
        ctx.strokeStyle = '#e9e4da'; ctx.lineWidth = 3; ctx.strokeRect(ax, ay, w, h);
        ctx.beginPath(); ctx.moveTo(ax + w / 2, ay); ctx.lineTo(ax + w / 2, by); ctx.stroke();
        // wrought-iron balconette
        ctx.strokeStyle = '#151517'; ctx.lineWidth = 2; const ry = by - 22; ctx.strokeRect(ax - 3, ry, w + 6, 20);
        for (let x = ax; x < bx; x += 6) { ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry + 20); ctx.stroke(); }
      }
      if (st.id === 'glass') { ctx.fillStyle = '#5b6670'; for (let k = 1; k < 3; k++) ctx.fillRect(ax + (w * k) / 3 - 2, ay, 4, h); ctx.fillRect(ax, ay, w, 3); }
      if (st.id === 'deco') { ctx.fillStyle = '#3b3f44'; for (let k = 1; k < 4; k++) ctx.fillRect(ax + (w * k) / 4 - 1.5, ay, 3, h); ctx.fillRect(ax, ay + h / 2, w, 3); ctx.fillStyle = 'rgba(110,95,70,0.35)'; ctx.fillRect(ax - 6, by + 2, w + 12, 8); }
    }
  }
  streaks(ctx, W, H, rnd, st.id === 'glass' ? 0.3 : 1);
  return tex(c);
}

// Ground-floor shop fronts (one 6 m bay, 4.5 m tall). lit: drawn as a lit interior on an unlit
// material (a shop with its lights on at night); otherwise lit by the scene like the walls.
const SHOPS = [
  { name: 'CAFÉ DE LA PLACE', bg: '#173526', fg: '#ecd69a', lit: '#f0b867', awning: 1 },
  { name: 'BOULANGERIE', bg: '#4d2418', fg: '#f3e2bf', lit: '#f2c27a' },
  { name: 'PHARMACIE', bg: '#ecebe4', fg: '#178a45', lit: '#c8f0d8', cross: true },
  { name: 'TABAC · PRESSE', bg: '#7a1414', fg: '#fff', lit: '#e8b06c' },
  { name: 'BANQUE', bg: '#1f2d44', fg: '#d6dbe4', kind: 'shutter' },
  { name: 'OPTIQUE', bg: '#2b2b2b', fg: '#e0e0e0', kind: 'smashed' },
  { name: 'FLEURISTE', bg: '#3e5a2a', fg: '#f4ecd8', kind: 'shutter', tag: 'NI OUBLI NI PARDON' },
  { name: 'LAVERIE', bg: '#1b4f7a', fg: '#fff', lit: '#d8ecff' },
  { name: 'PIZZERIA', bg: '#8b2a12', fg: '#f6e4b0', lit: '#f4a65c', awning: 0 },
  { name: '', bg: '#3b3d40', fg: '#fff', kind: 'boarded' },
  { name: 'ÉPICERIE', bg: '#5b4a1e', fg: '#f8ecc8', kind: 'smashed' },
  { name: 'HÔTEL DU CHÂTEAU-D\'EAU', bg: '#1d1d24', fg: '#e6c77a', lit: '#e9b97a' },
  { name: 'CINÉMA LE PALACE', bg: '#5a0f14', fg: '#f2d48a', lit: '#ff9f6a' },
  { name: 'GRANDS MAGASINS', bg: '#1c2a3a', fg: '#e8dcc0', lit: '#f6e7c8' },
  { name: '', bg: '#20272e', fg: '#fff', lit: '#bcd4ea', lobby: true },
  { name: 'LIBRAIRIE', bg: '#22324a', fg: '#efe5cc', kind: 'shutter' },
];

function shopTex(i) {
  const s = SHOPS[i], rnd = mulberry(8100 + i * 29), lit = !!s.lit;
  const W = 512, H = 384;
  const [c, ctx] = canvas(W, H);
  // unlit materials show the texture at full brightness: the stone of a lit shop is pre-darkened
  ctx.fillStyle = lit ? '#4d4638' : '#bfb39a'; ctx.fillRect(0, 0, W, H);
  speckle(ctx, W, H, rnd, 4000, 0.1);
  ctx.fillStyle = lit ? '#5b5344' : '#cbbfa6'; ctx.fillRect(0, 0, 30, H); ctx.fillRect(W - 30, 0, 30, H);
  ctx.fillStyle = s.bg; ctx.fillRect(30, 34, W - 60, 64);
  if (s.name) {
    ctx.fillStyle = s.fg; ctx.font = `bold ${s.name.length > 14 ? 30 : 38}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s.name, W / 2, 67, W - 90);
  }
  const gx = 42, gy = 108, gw = W - 84, gh = H - 124;
  if (s.kind === 'shutter') {
    ctx.fillStyle = '#6a6c6e'; ctx.fillRect(gx, gy, gw, gh + 16);
    for (let y = gy; y < H; y += 9) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(gx, y, gw, 2); }
    if (s.tag) { ctx.save(); ctx.translate(W / 2, 250); ctx.rotate(-0.06); ctx.fillStyle = '#e8e8e8'; ctx.font = 'bold 40px Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s.tag, 0, 0, 400); ctx.restore(); }
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(gx + 40, 300); ctx.quadraticCurveTo(200, 200, 300, 320); ctx.stroke();
  } else if (s.kind === 'boarded') {
    // looted and boarded up with plywood
    for (let k = 0; k < 4; k++) { ctx.fillStyle = ['#b08a58', '#a37d4c', '#b9965f', '#9d7745'][k]; ctx.fillRect(gx + k * gw / 4, gy, gw / 4 - 3, gh + 16); }
    ctx.fillStyle = '#1a1a1a'; ctx.font = 'bold 54px Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('FERMÉ', W / 2, 260);
  } else {
    const g = ctx.createLinearGradient(0, gy, 0, gy + gh);
    if (lit) { g.addColorStop(0, s.lit); g.addColorStop(0.45, '#6a4c2e'); g.addColorStop(1, '#2a1d12'); }
    else { g.addColorStop(0, '#2b2f33'); g.addColorStop(1, '#0d0f11'); }
    ctx.fillStyle = g; ctx.fillRect(gx, gy, gw, gh);
    for (let k = 0; k < 8; k++) { ctx.fillStyle = `rgba(0,0,0,${0.25 + rnd() * 0.3})`; ctx.fillRect(gx + 10 + rnd() * (gw - 60), gy + 70 + rnd() * 80, 18 + rnd() * 50, 110); }
    if (s.lobby) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(gx + 30, gy + 150, gw - 60, 8); }
    ctx.strokeStyle = '#141414'; ctx.lineWidth = 6; ctx.strokeRect(gx, gy, gw, gh);
    ctx.beginPath(); ctx.moveTo(W / 2, gy); ctx.lineTo(W / 2, gy + gh); ctx.stroke();
    if (s.kind === 'smashed') {
      // looted: the window is gone, glass shards round a dark hole
      ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.moveTo(gx + 60, gy + 40); ctx.lineTo(gx + gw - 80, gy + 20); ctx.lineTo(gx + gw - 40, gy + gh - 10); ctx.lineTo(gx + 30, gy + gh - 30); ctx.fill();
      ctx.strokeStyle = 'rgba(220,235,245,0.7)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 16; k++) { const x = gx + rnd() * gw, y = gy + rnd() * gh; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 80, y + (rnd() - 0.5) * 80); ctx.stroke(); }
    }
    if (s.cross) { ctx.fillStyle = '#25d466'; ctx.fillRect(W - 108, gy + 10, 22, 64); ctx.fillRect(W - 128, gy + 31, 62, 22); }
  }
  return tex(c, false);
}

// a sign or plaque: lines of text on a coloured panel
function textTex(lines, { w = 512, h = 128, bg = '#111', fg = '#fff', font = 'bold 64px Arial', border = null } = {}) {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = Math.max(4, h * 0.05); ctx.strokeRect(6, 6, w - 12, h - 12); }
  ctx.fillStyle = fg; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, w / 2, (h * (i + 0.5)) / lines.length, w - 30));
  return tex(c, false);
}

function poolTex() {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#9a9a9a'); g.addColorStop(0.7, '#2c2c2c'); g.addColorStop(1, '#000000');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return tex(c, false);
}

// ------------------------------------------------------------------ the builder
export function buildDistrict(world, scene, renderer, camera) {
  return quietly(() => new Builder(world, scene, renderer, camera).build());
}

class Builder {
  constructor(world, scene, renderer, camera) {
    this.w = world; this.scene = scene; this.renderer = renderer; this.camera = camera;
    this.rng = mulberry(3300);
    this.D = { group: new THREE.Group(), sidewalks: [], roads: [], blocks: [], fires: [], smokes: [], lightBars: [], suppressed: [], flashers: [] };
    this.D.group.name = 'district:l3';
  }

  R(a, b) { return a + (b - a) * this.rng(); }
  pick(a) { return a[Math.floor(this.rng() * a.length)]; }

  _materials() {
    const m = this.w.materials;
    const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
    const lit = (o) => new THREE.MeshBasicMaterial({ fog: true, ...o });
    m.dfac = STYLES.map((s, i) => std({ map: facadeTile(i), roughness: s.id === 'glass' ? 0.3 : 0.9, metalness: s.id === 'glass' ? 0.5 : 0 }));
    m.dshop = SHOPS.map((s, i) => (s.lit ? lit({ map: shopTex(i) }) : std({ map: shopTex(i), roughness: 0.75 })));
    m.dlit = [0xffc77a, 0xffe0aa, 0xb8d0ff].map((c) => lit({ color: c }));
    m.dtrim = [0x5a2a1f, 0xd9d1c0, 0x39424a].map((c) => std({ color: c, roughness: 0.8 }));
    m.dbronze = std({ color: 0x4f4230, roughness: 0.45, metalness: 0.75 });
    m.dglobe = lit({ color: 0xff7a3a });
    m.dneon = [0xff3b3b, 0x2ee86a, 0xffd27a, 0x7ac8ff].map((c) => lit({ color: c }));
    const pool = poolTex();
    const add = (c, op) => lit({ map: pool, color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
    m.dpool = [add(0xffb866, 0.5), add(0xd6e4ff, 0.38), add(0x2a5cff, 0.7), add(0x2a5cff, 0.7)];
    // signs and plaques: [texture, lit?]
    const signs = [
      [textTex(['PLACE DU', 'CHÂTEAU-D\'EAU'], { w: 512, h: 256, bg: '#f2efe6', fg: '#1b1b1b', font: 'bold 64px Arial', border: '#1b1b1b' }), false],
      [textTex(['METROPOLITAIN'], { w: 1024, h: 128, bg: '#2f4a3a', fg: '#e8d9a8', font: 'italic bold 92px Georgia, serif', border: '#c9a24a' }), false],
      [textTex(['CHÂTEAU-D\'EAU'], { w: 512, h: 128, bg: '#1a3f8f', fg: '#fff', font: 'bold 62px Arial', border: '#fff' }), false],
      [textTex(['CINÉMA'], { w: 128, h: 512, bg: '#3a0a0c', fg: '#ffcf6a', font: 'bold 64px Arial' }), true],
      [textTex(['LE PALACE · CE SOIR'], { w: 1024, h: 128, bg: '#120c0c', fg: '#ffd88a', font: 'bold 78px Arial', border: '#ff9f6a' }), true],
      [textTex(['HÔTEL'], { w: 128, h: 384, bg: '#14141a', fg: '#ff5a5a', font: 'bold 60px Georgia, serif' }), true],
      [textTex(['GRANDS MAGASINS DU CHÂTEAU-D\'EAU'], { w: 2048, h: 128, bg: '#14202c', fg: '#f3e6c4', font: 'bold 84px Georgia, serif' }), true],
      [textTex(['↓ PLACE DU CHÂTEAU-D\'EAU', '↓ GARE DE L\'EST'], { w: 512, h: 192, bg: '#f4f4f0', fg: '#1d1d1d', font: 'bold 40px Arial', border: '#1d1d1d' }), false],
      [textTex(['GENDARMERIE NATIONALE', 'ZONE DE TRANSFERT'], { w: 1024, h: 256, bg: '#1b2b55', fg: '#ffffff', font: 'bold 74px Arial', border: '#ffffff' }), false],
      [textTex(['CONVOI · TRANSFERT', 'ACCÈS RÉSERVÉ'], { w: 1024, h: 256, bg: '#f2c230', fg: '#111', font: 'bold 80px Arial', border: '#111' }), false],
      [textTex(['ROUTE BARRÉE'], { w: 512, h: 128, bg: '#c0221d', fg: '#fff', font: 'bold 66px Arial', border: '#fff' }), false],
      [textTex(['SERVICES PUBLICS EN DANGER'], { w: 1536, h: 192, bg: '#c8161d', fg: '#fff', font: 'bold 104px Arial' }), false],
      [textTex(['TABAC'], { w: 256, h: 128, bg: '#b3121b', fg: '#fff', font: 'bold 70px Arial' }), true],
    ];
    m.dsign = signs.map(([t, l]) => (l ? lit({ map: t, side: THREE.DoubleSide }) : std({ map: t, roughness: 0.5, side: THREE.DoubleSide })));
    this.streetSign = (line) => std({ map: streetSignTexture('10e Arr.', line), roughness: 0.4 });
    this.mats = { pool: m.dpool };
  }

  // ------------------------------------------------------------------ primitives
  add(k, g) { this.w.add(k, g); return g; }
  box(k, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) { return this.w.box(k, w, h, d, x, y, z, ry, rx, rz); }
  cyl(k, rt, rb, h, x, y, z, seg = 10, rx = 0, rz = 0, ry = 0) { this.w.cyl(k, rt, rb, h, x, y, z, seg, rx, rz, ry); }
  floor(k, x0, z0, x1, z1, y = 0.002, us = 14) { this.w.quad(k, V(x0, y, z1), V(1, 0, 0), V(0, 0, -1), x1 - x0, z1 - z0, (x1 - x0) / us, (z1 - z0) / us); }
  // a raised pavement (0.14 m), known to the district's ground height
  pave(x0, z0, x1, z1, k = 'paving') {
    const h = 0.14, w = x1 - x0, d = z1 - z0, g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv, pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + x0 + w / 2) / 4, (pos.getZ(i) + z0 + d / 2) / 4);
    g.translate(x0 + w / 2, h / 2, z0 + d / 2);
    this.add(k, g);
    this.D.sidewalks.push({ x0, z0, x1, z1 });
  }
  gh(x, z) { for (const s of this.D.sidewalks) if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1) return 0.14; return this.w.groundHeight(x, z); }
  pool(x, z, r, kind = 0) {
    const g = new THREE.PlaneGeometry(r * 2, r * 2); g.rotateX(-Math.PI / 2); g.translate(x, this.gh(x, z) + 0.035, z);
    this.add(`dpool:${kind}`, g);
  }
  collider(x0, z0, x1, z1, h = 40, tag = 'building') { this.w.addCollider(x0, z0, x1, z1, h, tag); }

  // ------------------------------------------------------------------ buildings
  // One building on a frontage. o: ground point at its left end seen from outside; d: along the
  // frontage; n: outwards. spec: { style, floors, w, shops, depth, sign }
  building(o, d, n, w, spec) {
    const st = STYLES[spec.style], fh = st.fh, gh = spec.gh || 4.5, floors = spec.floors, depth = spec.depth || 12;
    const H = gh + floors * fh, inward = n.clone().negate();
    const at = (s, y = 0, k = 0) => o.clone().addScaledVector(d, s).setY(y).addScaledVector(n, k);
    const ry = Math.atan2(-d.z, d.x);
    const bays = Math.max(1, Math.round(w / 6)), bw = w / bays;
    // ground floor: shop fronts, an awning over the open cafés
    for (let i = 0; i < bays; i++) {
      const k = spec.shops ? spec.shops[i % spec.shops.length] : this.pick([0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 15]);
      this.w.quad(`dshop:${k}`, at(i * bw, 0, 0.03), d, UP, bw, gh, 1, 1);
      const sh = SHOPS[k];
      if (sh.awning !== undefined) {
        const aw = new THREE.PlaneGeometry(bw - 1, 1.8); aw.rotateX(-Math.PI / 2 - 0.45); aw.rotateY(ry + Math.PI);
        const c = at(i * bw + bw / 2, gh - 0.55, 0.85); aw.translate(c.x, c.y, c.z);
        this.add(`awnings:${sh.awning}`, aw);
      }
      if (sh.cross) { const c = at(i * bw + bw - 0.6, gh + 0.9, 0.5); this.box('dneon:1', 0.18, 0.7, 0.1, c.x, c.y, c.z, ry); this.box('dneon:1', 0.7, 0.18, 0.1, c.x, c.y, c.z, ry); }
      if (k === 3) { const c = at(i * bw + 0.7, gh + 0.6, 0.45); this.box('dneon:0', 0.32, 0.8, 0.32, c.x, c.y, c.z, ry + Math.PI / 4); }
    }
    // upper floors
    this.w.quad(`dfac:${spec.style}`, at(0, gh), d, UP, w, floors * fh, bays / 4, floors / 4);
    // lit windows: quads over some of the painted ones
    const litP = spec.litP ?? 0.13;
    for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) for (const [x0, x1, y0, y1] of st.wins) {
      if (this.rng() > litP) continue;
      const k = st.id === 'glass' ? 2 : this.rng() < 0.75 ? 0 : 1;
      this.w.quad(`dlit:${k}`, at(b * bw + x0 * bw, gh + f * fh + y0 * fh, 0.035), d, UP, (x1 - x0) * bw, (y1 - y0) * fh);
    }
    // string course over the shops, cornice at the top
    const mid = at(w / 2);
    const band = (y, h, out, key) => { const c = mid.clone().addScaledVector(n, out / 2 - 0.05); this.box(key, w, h, out, c.x, y, c.z, ry); };
    band(gh, 0.32, 0.4, 'stone');
    if (st.id === 'stone') for (const f of [1, floors - 1]) { if (f <= 0 || f >= floors) continue; const y = gh + f * fh + 0.02; band(y, 0.14, 0.85, 'stone'); this.w.quad('railing', at(0, y + 0.07, 0.8), d, UP, w, 1.0, w / 3, 1); }
    // roof
    const roof = spec.roof || st.roof;
    if (roof === 'mansard') {
      band(H - 0.15, 0.35, 0.6, 'stone');
      const slope = V(0, 0, 0).addScaledVector(UP, 3.4).addScaledVector(inward, 2.0); const sl = slope.length(); slope.normalize();
      this.w.quad('roof', at(0, H), d, slope, w, sl, bays, 1);
      const top = mid.clone().addScaledVector(inward, 2 + (depth - 2) / 2); this.box('roofTop', w, 0.3, depth - 2, top.x, H + 3.25, top.z, ry);
      for (let b = 0; b < bays; b++) { const c = at(b * bw + bw / 2, H + 1.3, -0.9); this.box('stone', 1.1, 1.5, 1.3, c.x, c.y, c.z, ry); this.box('roof', 1.3, 0.25, 1.5, c.x, c.y + 0.85, c.z, ry); }
      const nc = 1 + Math.floor(this.rng() * 3);
      for (let k = 0; k < nc; k++) { const c = at(this.R(1.5, w - 1.5), H + 3.6, -this.R(4, depth - 2)); this.box('chimney', this.R(0.8, 1.6), this.R(1.2, 2.4), 0.7, c.x, c.y, c.z, ry); }
    } else {
      // flat roof behind a parapet, with roof plant
      const cap = (y, h, out) => { const c = mid.clone().addScaledVector(n, out / 2 - 0.05); this.box(`dtrim:${st.trim}`, w, h, out, c.x, y, c.z, ry); };
      cap(H + 0.45, 0.9, 0.35);
      const top = mid.clone().addScaledVector(inward, depth / 2); this.box('roofTop', w, 0.3, depth, top.x, H + 0.1, top.z, ry);
      if (roof === 'stepped') {
        const t2 = mid.clone().addScaledVector(inward, depth / 2 + 1); this.box('stone', Math.max(2, w - 4), 3.6, depth - 3, t2.x, H + 1.8, t2.z, ry);
        const c = at(w / 2, H + 3.6 + 3, -3); this.cyl('darkMetal', 0.04, 0.04, 6, c.x, c.y, c.z, 5);
      } else {
        if (this.rng() < 0.6) { const c = at(this.R(2, w - 2), H + 1.8, -this.R(4, depth - 3)); this.cyl('darkMetal', 1.1, 1.1, 2.2, c.x, c.y, c.z, 12); this.cyl('roofTop', 1.2, 0.2, 0.6, c.x, c.y + 1.4, c.z, 12); }
        for (let k = 0; k < 2; k++) { const c = at(this.R(1, w - 1), H + 0.7, -this.R(3, depth - 2)); this.box('metal', 1.4, 1.0, 1.0, c.x, c.y, c.z, ry); }
        if (st.id === 'glass') { const c = at(w / 2, H + 1.6, -depth / 2); this.box('darkMetal', Math.min(10, w * 0.6), 3, depth * 0.5, c.x, c.y, c.z, ry); }
      }
    }
    // end walls (double-sided stone, as on the boulevard)
    for (const s of [0, w]) this.w.quad('stone', at(s), inward, UP, depth, H, depth / 4, H / 4);
    // a sign hung on the facade
    if (spec.sign) spec.sign(at, ry, H);
    return H;
  }

  // A run of buildings along one side of a block. (ax, az) -> (bx, bz) along the street,
  // n outwards. list: explicit specs [{w, style, floors, ...}] filled up with random ones.
  frontage(ax, az, bx, bz, n, opts = {}) {
    const d = V(0, 0, 0).crossVectors(UP, n).normalize();
    const pa = V(ax, 0, az), pb = V(bx, 0, bz);
    const o = pa.dot(d) <= pb.dot(d) ? pa : pb, len = Math.abs(pb.clone().sub(pa).dot(d));
    const styles = opts.styles || ['brick', 'render', 'stone', 'glass', 'deco'];
    const list = (opts.list || []).slice();
    let t = 0, prev = null;
    while (t < len - 0.5) {
      let spec = list.shift();
      if (!spec) {
        let st; do st = S[this.pick(styles)]; while (st === prev && styles.length > 1);
        const ww = this.pick([12, 18, 18, 24, 30]);
        spec = { style: st, w: ww, floors: STYLES[st].id === 'glass' ? 6 + Math.floor(this.rng() * 2) : 4 + Math.floor(this.rng() * 3) };
      }
      let w = Math.min(spec.w, len - t);
      if (len - t - w < 6) w = len - t; // no sliver at the end
      prev = spec.style;
      this.building(o.clone().addScaledVector(d, t), d, n, w, { ...spec, shops: spec.shops || opts.shops });
      t += w;
    }
  }

  // a city block: its footprint is solid, and its inside is filled so roofs read as a mass
  block(x0, z0, x1, z1, h = 17) {
    this.collider(x0, z0, x1, z1);
    this.D.blocks.push({ x0, z0, x1, z1 });
    if (x1 - x0 > 26 && z1 - z0 > 26) this.box('roofTop', x1 - x0 - 24, h, z1 - z0 - 24, (x0 + x1) / 2, h / 2, (z0 + z1) / 2);
  }

  // ------------------------------------------------------------------ street furniture
  candelabra(x, z, heads = 2) {
    const y = this.gh(x, z);
    this.cyl('black', 0.07, 0.13, 4.6, x, y + 2.3, z, 8);
    this.cyl('black', 0.22, 0.26, 0.5, x, y + 0.25, z, 10);
    for (let k = 0; k < heads; k++) {
      const a = (k / heads) * Math.PI * 2 + 0.4, hx = x + Math.cos(a) * 0.7, hz = z + Math.sin(a) * 0.7;
      this.box('black', 0.06, 0.06, 0.8, (x + hx) / 2, y + 4.45, (z + hz) / 2, -a + Math.PI / 2);
      this.box('lamp', 0.36, 0.5, 0.36, hx, y + 4.15, hz);
    }
    this.collider(x - 0.2, z - 0.2, x + 0.2, z + 0.2, 5, 'prop');
    this.pool(x, z, 6.5, 0);
  }
  streetLamp(x, z, side) { this.w._lamp(x, z, side); this.pool(x - side * 1.0, z, 6, 0); }
  floodMast(x, z, tx, tz) {
    // a police floodlight mast aimed at (tx, tz): a lit panel and a wide pool of cool light there
    const face = Math.atan2(tx - x, tz - z), fx = Math.sin(face), fz = Math.cos(face);
    this.cyl('darkMetal', 0.1, 0.16, 7, x, 3.5, z, 8);
    this.box('darkMetal', 1.8, 0.9, 0.3, x, 7.2, z, face, -0.5);
    this.box('dlit:2', 1.6, 0.7, 0.05, x + fx * 0.17, 7.15, z + fz * 0.17, face, -0.5);
    this.box('darkMetal', 1.2, 0.4, 1.2, x, 0.2, z);
    this.collider(x - 0.6, z - 0.6, x + 0.6, z + 0.6, 1, 'prop');
    this.pool(tx, tz, 10, 1);
  }
  streetSign(x, z, line, ry) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.38), this.streetSign(line));
    m.position.set(x, 3.4, z); m.rotation.y = ry; this.D.group.add(m);
  }
  plate(k, w, h, x, y, z, ry) { const g = new THREE.PlaneGeometry(w, h); g.rotateY(ry); g.translate(x, y, z); this.add(`dsign:${k}`, g); }
  car(x, z, ry, state = 'ok') { this.w._car(x, z, ry, Math.floor(this.rng() * 8), state); }
  fire(x, y, z, scale, smoke = 2) { this.w.fires.push({ pos: V(x, y, z), scale }); this.w.smokes.push({ pos: V(x, y + 1, z), rate: smoke, scale: 1.4 }); }

  // ------------------------------------------------------------------ build
  build() {
    const w = this.w, D = this.D;
    this._materials();
    D.roads = DISTRICT.walkRects.map(([x0, z0, x1, z1]) => ({ x0, z0, x1, z1 })); // minimap
    const before = new Set(this.scene.children), fires0 = w.fires.length, smokes0 = w.smokes.length, bars0 = w.lightBars.length;
    this._ground();
    this._blocks();
    this._staging();
    this._ateliers();
    this._avenue();
    this._passage();
    this._square();
    this._exit();
    this._dressing();
    // the batches become this district's meshes, in its own group
    w._flush(D.group, ['dlit', 'dpool', 'dsign', 'dshop', 'dglobe', 'dneon']);
    for (const m of D.group.children) if (m.name.startsWith('dpool')) { m.renderOrder = 2; m.receiveShadow = false; }
    for (const m of D.group.children) if (m.name === 'dpool:2' || m.name === 'dpool:3') D.flashers.push(m);
    // anything the shared helpers put straight into the scene (light bars, flags) joins the group
    for (const o of [...this.scene.children]) if (!before.has(o)) D.group.add(o);
    // fires, smoke and light bars are the district's, registered only while it is active
    D.fires = w.fires.splice(fires0); D.smokes = w.smokes.splice(smokes0); D.lightBars = w.lightBars.splice(bars0);
    this._puddles();
    this.scene.add(D.group);
    // compile every material now against the real scene (its lights), so nothing compiles in play
    try { this.renderer.compile(this.scene, this.camera); } catch (e) { /* compiled on first sight instead */ }
    D.group.visible = false;
    D.update = (dt, t) => {
      const on = Math.floor(t * 3) % 2 === 0;
      D.flashers.forEach((m, i) => { m.material.opacity = (on === (i === 0)) ? 0.75 : 0.08; });
    };
    return D;
  }

  _ground() {
    // ground under the whole district (the boulevard's ends at z 280)
    this.w.quad('ground', V(-200, -0.05, 640), V(1, 0, 0), V(0, 0, -1), 400, 410);
    // the boulevard's road ends at z 230; continue it into the junction
    this.w.quad('road', V(-9, 0.001, 247), V(1, 0, 0), V(0, 0, -1), 18, 17, 1, 17 / 18);
    this.pave(-15, 230, -9, 233); this.pave(9, 230, 15, 233);
  }

  _blocks() {
    const B = (x0, z0, x1, z1) => this.block(x0, z0, x1, z1);
    // north side of Rue des Ateliers (in front of the boulevard's last blocks)
    B(15, 221, 95, 233); B(-95, 221, -15, 233);
    this.frontage(15, 233, 95, 233, V(0, 0, 1), { list: [{ style: S.render, w: 18, floors: 5, shops: [1, 3, 0] }] });
    this.frontage(-95, 233, -15, 233, V(0, 0, 1), { list: [{ style: S.brick, w: 24, floors: 5 }], styles: ['brick', 'render', 'glass'] });
    // B1 west of the Avenue, with the department store's rotunda on the square
    B(-95, 247, -13, 345);
    this.frontage(-95, 247, -13, 247, V(0, 0, -1), { styles: ['brick', 'render', 'stone'] });
    this.frontage(-13, 247, -13, 345, V(1, 0, 0), { list: [{ style: S.render, w: 18, floors: 5, shops: [9, 10, 5] }, { style: S.brick, w: 24, floors: 6, shops: [9, 4, 6, 10] }, { style: S.stone, w: 24, floors: 5, shops: [5, 9, 15, 3] }, { style: S.glass, w: 18, floors: 7, shops: [14] }], styles: ['render', 'brick', 'stone'] });
    this.frontage(-48, 345, -13, 345, V(0, 0, 1), { list: [{ style: S.stone, w: 35, floors: 6, shops: [13], litP: 0.3, sign: (at, ry) => { const c = at(17.5, 5.5, 0.08); this.plate(6, 22, 1.4, c.x, c.y, c.z, ry); } }] });
    this.rotunda(-17.5, 340.5, 4.6, 4.5 + 6 * 3.2);
    // B2 between the Avenue and the Passage: the cinema faces the square
    B(13, 247, 35, 345);
    this.frontage(13, 247, 35, 247, V(0, 0, -1), { list: [{ style: S.brick, w: 22, floors: 5 }] });
    this.frontage(13, 247, 13, 345, V(-1, 0, 0), { list: [{ style: S.stone, w: 24, floors: 5, shops: [5, 9, 10, 4] }, { style: S.render, w: 18, floors: 4, shops: [6, 9, 15] }, { style: S.deco, w: 24, floors: 5, shops: [9, 5] }], styles: ['render', 'brick', 'stone'] });
    this.frontage(35, 247, 35, 345, V(1, 0, 0), { styles: ['brick', 'render'], shops: [9, 6, 15, 4, 10] });
    this.frontage(13, 345, 35, 345, V(0, 0, 1), { list: [{ style: S.deco, w: 22, floors: 5, shops: [12], litP: 0.25, sign: (at, ry, H) => {
      // the cinema: a vertical blade sign and a lit marquee over the entrance
      const c = at(11, 9, 1.2); this.plate(3, 1.4, 6, c.x - Math.cos(ry) * 0.0, c.y, c.z, ry + Math.PI / 2);
      this.box('dtrim:2', 0.25, 6.2, 1.5, c.x, c.y, c.z, ry);
      const mq = at(11, 4.9, 1.0); this.box('dtrim:2', 12, 0.9, 2.0, mq.x, mq.y, mq.z, ry); const f = at(11, 4.9, 2.02); this.plate(4, 11.6, 0.8, f.x, f.y, f.z, ry);
    } }] });
    // B3 east of the Passage
    B(45, 247, 95, 345);
    this.frontage(45, 247, 95, 247, V(0, 0, -1), { styles: ['render', 'glass', 'brick'] });
    this.frontage(45, 247, 45, 345, V(-1, 0, 0), { styles: ['render', 'brick'], shops: [6, 9, 15, 10, 1] });
    this.frontage(45, 345, 48, 345, V(0, 0, 1), { list: [{ style: S.render, w: 3, floors: 5, shops: [9] }] });
    // the square's west and east rows, cut by the side streets
    B(-100, 345, -48, 388); B(-100, 402, -48, 445); B(48, 345, 100, 388); B(48, 402, 100, 445);
    this.frontage(-48, 345, -48, 388, V(1, 0, 0), { list: [{ style: S.stone, w: 24, floors: 6, shops: [4, 4, 0, 0] }, { style: S.render, w: 19, floors: 5, shops: [8, 3, 7] }] });
    this.frontage(-48, 402, -48, 445, V(1, 0, 0), { list: [{ style: S.glass, w: 18, floors: 7, shops: [14] }, { style: S.stone, w: 25, floors: 6, shops: [2, 0, 1, 15] }] });
    this.frontage(48, 345, 48, 388, V(-1, 0, 0), { list: [{ style: S.deco, w: 19, floors: 6, shops: [11], litP: 0.3, sign: (at, ry) => { const c = at(9.5, 9.5, 0.9); this.plate(5, 1.0, 3.0, c.x, c.y, c.z, ry + Math.PI / 2); this.box('dtrim:2', 0.2, 3.2, 1.0, c.x, c.y, c.z, ry); } }, { style: S.stone, w: 24, floors: 6, shops: [0, 8, 3, 2] }] });
    this.frontage(48, 402, 48, 445, V(-1, 0, 0), { list: [{ style: S.brick, w: 24, floors: 6, shops: [5, 9, 10, 6] }, { style: S.render, w: 19, floors: 5 }] });
    this.frontage(-100, 388, -48, 388, V(0, 0, -1), { styles: ['render', 'brick'] });
    this.frontage(-100, 402, -48, 402, V(0, 0, 1), { styles: ['render', 'stone'] });
    this.frontage(48, 388, 100, 388, V(0, 0, -1), { styles: ['brick', 'render'] });
    this.frontage(48, 402, 100, 402, V(0, 0, 1), { styles: ['glass', 'render'] });
    // the south side and Rue de la Caserne
    B(-100, 445, -10, 520); B(10, 445, 100, 520); B(-10, 495, 10, 520);
    this.frontage(-48, 445, -10, 445, V(0, 0, -1), { list: [{ style: S.stone, w: 20, floors: 6, shops: [0, 0, 8] }, { style: S.brick, w: 18, floors: 5 }] });
    this.frontage(10, 445, 48, 445, V(0, 0, -1), { list: [{ style: S.glass, w: 18, floors: 7, shops: [14] }, { style: S.render, w: 20, floors: 5, shops: [1, 7, 3] }] });
    this.frontage(-10, 445, -10, 495, V(1, 0, 0), { styles: ['brick', 'render', 'stone'] });
    this.frontage(10, 445, 10, 495, V(-1, 0, 0), { styles: ['render', 'brick'] });
    this.frontage(-10, 495, 10, 495, V(0, 0, -1), { list: [{ style: S.stone, w: 20, floors: 6, shops: [4, 15, 4] }] });
    // street ends beyond the playable area: facades closing each view
    B(95, 221, 115, 259); B(-115, 221, -95, 259); B(100, 380, 120, 410); B(-120, 380, -100, 410);
    this.frontage(95, 233, 95, 247, V(-1, 0, 0), { list: [{ style: S.render, w: 14, floors: 5 }] });
    this.frontage(-95, 233, -95, 247, V(1, 0, 0), { list: [{ style: S.brick, w: 14, floors: 5 }] });
    this.frontage(100, 388, 100, 402, V(-1, 0, 0), { list: [{ style: S.stone, w: 14, floors: 6 }] });
    this.frontage(-100, 388, -100, 402, V(1, 0, 0), { list: [{ style: S.render, w: 14, floors: 5 }] });
  }

  // the department store's corner rotunda with its zinc dome (a landmark from the square)
  rotunda(x, z, r, H) {
    const g = new THREE.CylinderGeometry(r, r, H - 4.5, 24, 1, true);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (Math.PI * 2 * r) / 24, uv.getY(i) * (H - 4.5) / (4 * 3.2));
    g.translate(x, 4.5 + (H - 4.5) / 2, z); this.add(`dfac:${S.stone}`, g);
    this.cyl('stone', r, r, 4.5, x, 2.25, z, 24);
    for (let k = 0; k < 6; k++) { const a = Math.PI / 2 + (k / 6) * Math.PI; this.box('dlit:1', 2.2, 2.6, 0.05, x + Math.sin(a) * (r + 0.03), 1.9, z + Math.cos(a) * (r + 0.03), a); }
    this.cyl('stone', r + 0.4, r + 0.4, 0.5, x, H + 0.25, z, 24);
    const dome = new THREE.SphereGeometry(r + 0.2, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 1.25, 1); dome.translate(x, H + 0.5, z); this.add('roof', dome);
    this.cyl('stone', 0.9, 1.1, 2.2, x, H + 0.5 + (r + 0.2) * 1.25 + 0.9, z, 12);
    this.cyl('darkMetal', 0.05, 0.12, 3, x, H + 0.5 + (r + 0.2) * 1.25 + 3.4, z, 6);
    this.collider(x - r, z - r, x + r, z + r, 40, 'building');
  }

  _staging() {
    // the CRS staging area (existing vans): floodlights and the transfer lane to the cordon gate
    this.floodMast(-12.6, 162, -3, 168);
    this.floodMast(12.4, 176, 2, 178);
    for (let z = 172; z < 181; z += 1.6) { this.box('binLid', 0.12, 0.012, 1.0, -4.9, 0.008, z); this.box('binLid', 0.12, 0.012, 1.0, 3.6, 0.008, z); }
    this.plate(9, 3.2, 0.8, -7.4, 1.6, 180.75, 0); this.plate(9, 3.2, 0.8, -7.4, 1.6, 180.7, Math.PI);
    this.streetSign(14.98, 181.8, 'BD DE LA RÉPUBLIQUE', -Math.PI / 2);
    // the boulevard south of the cordon: burnt-out cars and the junction lamps
    this.car(-6.5, 212, 0.4, 'burnt'); this.fire(-6.5, 1.0, 212, 0.9, 1.4);
    this.streetLamp(9.6, 228, 1); this.streetLamp(-9.6, 214, -1);
    this.pool(9.6 - 1, 196, 6, 0); this.pool(-9.6 + 1, 196, 6, 0); this.pool(8.6, 224, 6, 0); this.pool(-8.6, 224, 6, 0);
    // the burning pile in the road at (0, 205) stays a Level 1/2 backdrop: it is suppressed here
    const f = this.w.fires.find((o) => Math.abs(o.pos.x) < 0.01 && Math.abs(o.pos.z - 205) < 0.01);
    const s = this.w.smokes.find((o) => Math.abs(o.pos.x) < 0.01 && Math.abs(o.pos.z - 205) < 0.01);
    this.D.suppressed = [f, s].filter(Boolean);
  }

  _ateliers() {
    // Rue des Ateliers, the cross street the routes fork from
    this.floor('roadPlain', -95, 235, 95, 245);
    this.pave(-95, 233, -15, 235); this.pave(15, 233, 95, 235); this.pave(-15, 233, -9, 235); this.pave(9, 233, 15, 235);
    this.pave(-95, 245, -9, 247); this.pave(9, 245, 37, 247); this.pave(43, 245, 95, 247);
    // crossings
    for (let x = -8.4; x < 8.5; x += 1.2) { this.box('white', 0.6, 0.012, 3.0, x + 0.3, 0.006, 231.6); this.box('white', 0.6, 0.012, 3.0, x + 0.3, 0.006, 249.2); }
    for (let z = 235.6; z < 244.6; z += 1.2) { this.box('white', 3.0, 0.012, 0.6, -11, 0.006, z + 0.3); this.box('white', 3.0, 0.012, 0.6, 11, 0.006, z + 0.3); }
    // parked cars, a burning one to the east, the police vans closing each end
    for (const x of [-52, -44, -30, -23, 22, 47, 54]) this.car(x, x % 2 ? 243.6 : 236.4, Math.PI / 2 + (x > 0 ? 0 : Math.PI), 'ok');
    this.car(30, 236.5, 1.4, 'burnt'); this.fire(30, 1.1, 236.5, 1.3, 2.2);
    this.w._van(-57, 240, Math.PI / 2, true); this.w._van(57, 240, -Math.PI / 2, true);
    this.collider(-60, 233, -56, 247, 3, 'cordon'); this.collider(56, 233, 60, 247, 3, 'cordon');
    for (const x of [-56, 56]) for (let z = 234.5; z < 246; z += 2.1) this.w._vauban(x - Math.sign(x) * 1.5, z, Math.PI / 2, { collide: false });
    // lamps and the city sign pointing to the square
    for (const x of [-40, -24, 24, 40]) this.streetLamp(x, 246.2, 0);
    this.cyl('darkMetal', 0.06, 0.06, 3.2, -10.6, 1.6, 246.2, 6);
    this.plate(7, 2.2, 0.82, -10.6, 2.9, 246.25, 0); this.plate(7, 2.2, 0.82, -10.6, 2.9, 246.15, Math.PI);
    this.streetSign(-15.02, 234.3, 'RUE DES ATELIERS', Math.PI / 2); this.streetSign(15.02, 234.3, 'RUE DES ATELIERS', -Math.PI / 2);
    this.streetSign(-13.02, 248.6, 'AV. DU CHÂTEAU-D\'EAU', Math.PI / 2); this.streetSign(35.02, 248.6, 'PASSAGE DES ÉCHAUDÉS', -Math.PI / 2);
    this.fire(-80, 1.2, 240, 1.6, 2.4); this.fire(82, 1.2, 239, 1.4, 2.2);
  }

  _avenue() {
    // the Avenue: 18 m road, plane trees and lamps, looted shops, blocked by a burnt-out bus
    this.w.quad('road', V(-9, 0.001, 349), V(1, 0, 0), V(0, 0, -1), 18, 102, 1, 102 / 18);
    this.pave(-13, 247, -9, 345); this.pave(9, 247, 13, 345);
    for (let z = 256; z < 340; z += 14) { if (Math.abs(z - 292) > 8) this.w._tree(-11.2, z); if (Math.abs(z + 7 - 292) > 8) this.w._tree(11.2, z + 7); }
    for (let z = 262; z < 340; z += 26) { this.streetLamp(9.6, z, 1); this.streetLamp(-9.6, z + 13, -1); }
    for (let z = 252; z < 340; z += this.R(6.5, 9)) {
      if (Math.abs(z - 292) < 10) continue;
      for (const side of [-1, 1]) if (this.rng() < 0.62) this.car(side * 7.7, z, (side > 0 ? 0 : Math.PI) + this.R(-0.05, 0.05), this.rng() < 0.12 ? 'burnt' : this.rng() < 0.06 ? 'side' : 'ok');
    }
    // the roadblock: a burnt bus across the road, wrecks, a burning barricade; a gap on the east pavement
    this.bus(-2.2, 292, 0.12);
    this.car(-9.5, 286, 0.9, 'burnt'); this.car(6.6, 297, -0.5, 'burnt');
    // fires kept few: four flickering lights serve the nearest fires, and a cluster turns everything orange
    this.w._barricade(4.5, 288.5, 7, false);
    this.w._binPyre(-6.5, 298, 0.8);
    this.fire(-2, 1.4, 292, 1.3, 2.6);
    this.w._vauban(-10.9, 289.6, 0); this.w._vauban(9.6, 289.4, 0.15);
    this.collider(-13, 287.6, -11.6, 296, 2, 'barricade'); // the west pavement is shut too
    this.plate(10, 2.0, 0.5, -2, 1.4, 286.6, Math.PI); this.plate(10, 2.0, 0.5, 4.5, 1.2, 287.3, Math.PI);
    this.floodMast(11.8, 278, 2, 286);
  }

  // a burnt-out bus: the blocked street's landmark (12 m, across the road)
  bus(x, z, ry) {
    const L = 12, W = 2.55, H = 3.0;
    const P = (k, w, h, d, ox, oy, oz) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(ox, oy, oz); g.rotateY(ry + Math.PI / 2); g.translate(x, 0, z); this.add(k, g); };
    P('charred', W, 0.9, L, 0, 0.75, 0);
    P('rust', W - 0.04, 1.4, L - 0.2, 0, 1.9, 0);
    P('burntGlass', W + 0.02, 0.95, L - 1, 0, 2.05, 0);
    for (let k = -5; k <= 5; k += 1.25) P('charred', W + 0.04, 1.0, 0.12, 0, 2.05, k);
    P('charred', W, 0.25, L, 0, H - 0.1, 0);
    P('rust', W - 0.3, 0.2, L - 1.2, 0.2, H + 0.05, 0.4); // the roof sagged
    for (const zz of [-3.8, 3.4]) for (const s of [-1, 1]) P('tyre', 0.3, 0.95, 0.95, s * (W / 2 - 0.1), 0.45, zz);
    const c = Math.cos(ry), s2 = Math.sin(ry);
    this.w.addObstacle(x, z, L, W + 0.2, ry, 3.2, 'barricade');
    this.box('charred', 4.2, 0.03, 13, x, 0.02, z, ry + Math.PI / 2);
    void c; void s2;
  }

  _passage() {
    // the Passage: a 10 m cobbled lane, doorways, washing lines and a scaffold over the east pavement
    this.floor('cobble', 37, 245, 43, 349, 0.002, 4);
    this.pave(35, 247, 37, 345); this.pave(43, 247, 45, 345);
    for (let z = 258; z < 340; z += 24) { this.streetLamp(36.4, z, -1); this.streetLamp(43.6, z + 12, 1); }
    // scaffold: poles, ledgers, boards, sheeting
    const zs = 284, ze = 300;
    for (let z = zs; z <= ze; z += 2) for (const x of [43.2, 44.6]) { this.cyl('metal', 0.04, 0.04, 12, x, 6, z, 6); this.collider(x - 0.06, z - 0.06, x + 0.06, z + 0.06, 12, 'prop'); }
    for (let y = 2.4; y < 12; y += 2.4) {
      for (const x of [43.2, 44.6]) this.box('metal', 0.06, 0.06, ze - zs, x, y, (zs + ze) / 2);
      this.box('wood', 1.5, 0.05, ze - zs, 43.9, y + 0.05, (zs + ze) / 2);
    }
    this.w.quad('paper', V(43.1, 2.5, ze), V(0, 0, -1), UP, ze - zs, 9.5);
    this.w._binPyre(39.5, 324, 0.8);
    for (const z of [262, 278, 315]) this.car(this.rng() < 0.5 ? 38.4 : 41.6, z, Math.PI / 2 * 0 + (this.rng() < 0.5 ? 0 : Math.PI), this.rng() < 0.3 ? 'burnt' : 'ok');
    // washing lines strung across the lane
    for (const z of [270, 306, 332]) this.box('black', 10, 0.02, 0.02, 40, 7.5 + this.rng(), z);
  }

  _square() {
    // Place du Chateau-d'Eau: perimeter pavements, a ring road, a raised esplanade round the monument
    const L = -48, Rr = 48, N = 345, Sz = 445;
    this.floor('roadPlain', L, N, Rr, Sz, 0.001, 14);
    this.pave(L, 349, -44, Sz - 4); this.pave(44, 349, Rr, Sz - 4);
    this.pave(L, N, -9, 349); this.pave(9, N, 37, 349); this.pave(43, N, Rr, 349);
    this.pave(L, Sz - 4, -6, Sz); this.pave(6, Sz - 4, Rr, Sz);
    this.pave(-34, 359, 34, 431, 'cobble');
    // crossings to the esplanade
    for (const [x, z, along] of [[0, 352, 'x'], [0, 437, 'x'], [-39, 395, 'z'], [39, 395, 'z']]) {
      for (let k = -4; k <= 4; k += 1.2) along === 'x' ? this.box('white', 0.6, 0.012, 4.5, x + k, 0.006, z) : this.box('white', 4.5, 0.012, 0.6, x, 0.006, z + k);
    }
    this.monument(0, 395);
    this.metro(27, 368);
    // plane trees round the esplanade (none in the arena), candelabra lamps, benches, kiosk
    for (let z = 366; z <= 424; z += 10) for (const x of [-30.5, 30.5]) { if (x > 0 && z < 376) continue; this.w._tree(x, z); }
    for (let x = -16; x <= 24; x += 10) { this.w._tree(x, 362.5); if (Math.abs(x) > 17) this.w._tree(x, 427.5); }
    this.w._tree(-26, 427.5);
    for (const [x, z] of [[-33, 360], [33, 380], [-33, 430], [33, 430], [-16, 360], [16, 360], [-33, 395], [33, 405], [-17, 430], [17, 430]]) this.candelabra(x, z);
    for (const [x, z] of [[-45.5, 360], [45.5, 362], [-45.5, 384], [45.5, 384], [-45.5, 418], [45.5, 418], [-45.5, 438], [45.5, 438], [-20, 346.6], [20, 346.6], [-24, 443.4], [24, 443.4]]) { this.candelabra(x, z, 1); }
    for (const [x, z, s] of [[-22, 372, 1], [-22, 386, 1], [22, 410, -1], [22, 420, -1], [-12, 366, 1]]) this.w._bench(x, z, s);
    this.kiosk(-27, 364);
    this.w._morris(-30.5, 437.5); this.w._morris(31, 357);
    // the rally's stage truck on the west side
    this.stageTruck(-40.5, 404);
    // cafe terraces against the west and east rows
    for (const z of [362, 368, 374]) this.w._terrace(-45.6, z, -1);
    for (const z of [425, 431]) this.w._terrace(45.6, z, 1);
    // wrecks and barricades: the night's damage
    this.car(-38, 356, 1.2, 'burnt'); this.fire(-38, 1.0, 356, 1.0, 1.8);
    this.car(39, 433, 2.6, 'side'); this.car(-39, 434, -1.6, 'ok'); this.car(38.5, 352, Math.PI / 2, 'ok');
    this.w._barricade(30, 439, 6, true);
    this.w._binPyre(-20, 441.5, 0.9);
    for (let i = 0; i < 9; i++) this.w._vauban(this.R(-30, 30), this.R(362, 428), this.R(0, 3.14), { collide: false, tilt: 1.45, y: 0.05 });
    // side streets off the square, each closed by a van with its lights going
    for (const s of [-1, 1]) {
      this.floor('roadPlain', s > 0 ? 48 : -100, 390, s > 0 ? 100 : -48, 400);
      this.pave(s > 0 ? 48 : -100, 388, s > 0 ? 100 : -48, 390); this.pave(s > 0 ? 48 : -100, 400, s > 0 ? 100 : -48, 402);
      this.w._van(s * 57.5, 395, s > 0 ? -Math.PI / 2 : Math.PI / 2, false, s > 0 ? 'samu' : 'fire');
      this.collider(s > 0 ? 56 : -60, 388, s > 0 ? 60 : -56, 402, 3, 'cordon');
      this.pool(s * 52, 395, 6, s > 0 ? 2 : 3);
      this.streetSign(s * 48.02, 389.6, s > 0 ? 'RUE DES DOUANES' : 'RUE DE LA FONTAINE', s > 0 ? -Math.PI / 2 : Math.PI / 2);
      this.fire(s * 86, 1.2, 395, 1.8, 2.6);
    }
    // the square's name plate and a union banner over the rally
    this.cyl('darkMetal', 0.06, 0.06, 3.4, -10, 1.7, 346.8, 6);
    this.plate(0, 2.0, 1.0, -10, 3.2, 346.85, Math.PI);
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), this.w.makeCloth(bannerTexture('LA VIE CHÈRE ÇA SUFFIT', '#c8161d', '#ffffff'), 0.05));
    ban.position.set(-47.6, 9, 380); ban.rotation.y = Math.PI / 2; this.D.group.add(ban);
  }

  // the column with its bronze figure: visible down the Avenue and from everywhere in the square
  monument(x, z) {
    this.box('stone', 12, 0.45, 12, x, 0.225, z); this.box('stone', 9.4, 0.45, 9.4, x, 0.675, z);
    this.box('stone', 4.6, 5.0, 4.6, x, 3.4, z); this.box('stone', 5.2, 0.5, 5.2, x, 6.1, z);
    this.cyl('stone', 0.78, 0.9, 13, x, 12.85, z, 16);
    this.box('stone', 2.2, 0.6, 2.2, x, 19.6, z);
    // the figure: a robed allegory holding up a branch
    this.cyl('dbronze', 0.55, 0.85, 2.6, x, 21.2, z, 12);
    this.cyl('dbronze', 0.32, 0.45, 1.2, x, 23.0, z, 10);
    const head = new THREE.SphereGeometry(0.32, 12, 8); head.translate(x, 23.85, z); this.add('dbronze', head);
    this.cyl('dbronze', 0.1, 0.12, 1.8, x + 0.55, 24.3, z, 6, 0, -0.35);
    this.cyl('dbronze', 0.05, 0.25, 0.9, x + 0.9, 25.4, z, 6, 0, -0.35);
    // seated bronzes at the corners of the pedestal and four plaques
    for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const bx = x + dx * 3.6, bz = z + dz * 3.6;
      this.box('dbronze', 1.4, 1.0, 1.4, bx, 1.4, bz); this.cyl('dbronze', 0.35, 0.5, 1.3, bx, 2.5, bz, 8);
      const h = new THREE.SphereGeometry(0.28, 10, 6); h.translate(bx, 3.35, bz); this.add('dbronze', h);
    }
    for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2; this.box('dbronze', 1.8, 1.0, 0.06, x + Math.sin(a) * 2.33, 2.5, z + Math.cos(a) * 2.33, a); }
    this.collider(x - 6, z - 6, x + 6, z + 6, 3, 'monument');
    // uplighters wash the column
    for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2 + Math.PI / 4; this.pool(x + Math.sin(a) * 5.4, z + Math.cos(a) * 5.4, 3.2, 1); }
    this.pool(x, z, 11, 0);
  }

  // a Guimard metro entrance: green cast iron, amber lamps, the METROPOLITAIN sign and a
  // fan-shaped glass canopy (an edicule), plus the modern M totem and the station name
  metro(x, z) {
    const w = 3.4, d = 6.4, y = 0.14;
    // the stairwell, seen from above
    this.box('black', w - 0.3, 0.02, d - 0.3, x, y + 0.02, z);
    for (let k = 0; k < 9; k++) this.box('darkMetal', w - 0.4, 0.02, 0.08, x, y + 0.035, z - d / 2 + 0.6 + k * 0.6);
    // balustrade on three sides (open at the south end)
    for (const s of [-1, 1]) { this.box('parisGreen', 0.08, 0.95, d, x + s * w / 2, y + 0.5, z); this.w.quad('railing', V(x + s * w / 2, y + 0.1, z - s * d / 2), V(0, 0, s), UP, d, 0.85, d / 1.2, 1); }
    this.box('parisGreen', w, 0.95, 0.08, x, y + 0.5, z - d / 2);
    this.collider(x - w / 2 - 0.1, z - d / 2 - 0.1, x + w / 2 + 0.1, z + d / 2 - 0.4, 1.1, 'prop');
    // the arch: two curving posts with amber globes and the sign between them
    for (const s of [-1, 1]) {
      const pts = [V(x + s * 1.55, y, z + d / 2), V(x + s * 1.6, y + 1.6, z + d / 2), V(x + s * 1.25, y + 2.9, z + d / 2 + 0.2), V(x + s * 0.6, y + 3.4, z + d / 2 + 0.6)];
      const t = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.07, 6); t.deleteAttribute('uv'); t.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(t.attributes.position.count * 2), 2));
      this.add('parisGreen', t);
      const gl = new THREE.SphereGeometry(0.2, 10, 8); gl.scale(1, 1.4, 1); gl.translate(x + s * 0.58, y + 3.55, z + d / 2 + 0.62); this.add('dglobe', gl);
    }
    this.box('parisGreen', 2.7, 0.55, 0.1, x, y + 2.75, z + d / 2 + 0.08);
    this.plate(1, 2.4, 0.4, x, y + 2.75, z + d / 2 + 0.14, 0); this.plate(1, 2.4, 0.4, x, y + 2.75, z + d / 2 + 0.02, Math.PI);
    // the glass fan canopy over the stairs
    for (let k = 0; k < 5; k++) {
      const g = new THREE.BoxGeometry(w + 0.8, 0.04, 1.4); g.rotateX(-0.28 + k * 0.03); g.translate(x, y + 3.0 + k * 0.05, z - d / 2 + 0.7 + k * 1.3); this.add('glass', g);
      this.box('parisGreen', w + 0.9, 0.08, 0.08, x, y + 3.0 + k * 0.05, z - d / 2 + 0.05 + k * 1.3);
    }
    for (const s of [-1, 1]) for (const zz of [z - d / 2 + 0.2, z + 0.6]) this.cyl('parisGreen', 0.05, 0.07, 3.0, x + s * (w / 2 + 0.35), y + 1.5, zz, 6);
    this.pool(x, z + d / 2 + 1.5, 4, 0);
    // the M totem and the station's name plate
    const tx = x + 4.2, tz = z + 3.6;
    this.cyl('darkMetal', 0.07, 0.07, 3.8, tx, y + 1.9, tz, 8);
    for (const s of [-1, 1]) { const c = new THREE.CircleGeometry(0.48, 24); if (s < 0) c.rotateY(Math.PI); c.translate(tx, y + 3.65, tz + s * 0.05); this.add('metroSign', c); }
    this.plate(2, 1.6, 0.4, tx, y + 3.0, tz + 0.08, 0); this.plate(2, 1.6, 0.4, tx, y + 3.0, tz - 0.08, Math.PI);
    this.collider(tx - 0.15, tz - 0.15, tx + 0.15, tz + 0.15, 4, 'prop');
    this.pool(tx, tz, 3, 1);
  }

  kiosk(x, z) {
    this.cyl('morris', 1.5, 1.5, 0.35, x, 0.3, z, 8);
    this.cyl('poster', 1.38, 1.38, 2.2, x, 1.55, z, 8);
    this.cyl('morris', 1.6, 1.45, 0.3, x, 2.8, z, 8);
    const dome = new THREE.SphereGeometry(1.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 0.6, 1); dome.translate(x, 2.95, z); this.add('morris', dome);
    this.cyl('morris', 0.06, 0.14, 0.6, x, 4.0, z, 6);
    this.collider(x - 1.5, z - 1.5, x + 1.5, z + 1.5, 3, 'prop');
  }

  stageTruck(x, z) {
    // a flatbed lorry used as the rally's stage, a banner and speaker stacks
    this.box('cars:2', 2.5, 2.4, 2.2, x, 1.5, z - 4.6);
    this.box('glass', 2.3, 0.9, 0.05, x, 2.0, z - 3.48);
    this.box('darkMetal', 2.5, 0.5, 9, x, 0.85, z);
    this.box('wood', 2.6, 0.12, 7.6, x, 1.16, z + 0.7);
    for (const zz of [-3.6, -0.5, 2.6, 4.0]) for (const s of [-1, 1]) this.cyl('tyre', 0.45, 0.45, 0.35, x + s * 1.1, 0.45, z + zz, 12, 0, Math.PI / 2);
    for (const zz of [-2.6, 4.2]) { this.cyl('darkMetal', 0.05, 0.05, 3.2, x - 0.2, 2.8, z + zz, 6); }
    this.plate(11, 7.2, 0.9, x - 0.2, 3.9, z + 0.8, Math.PI / 2);
    for (const zz of [-2.4, 3.9]) this.box('black', 0.8, 1.6, 0.8, x + 0.6, 2.0, z + zz);
    this.w.addObstacle(x, z, 2.7, 9.2, 0, 3, 'prop');
  }

  _exit() {
    // Rue de la Caserne and the extraction point: gendarmerie vans across the street, floodlit
    this.floor('roadPlain', -6, 441, 6, 495);
    this.pave(-10, 445, -6, 495); this.pave(6, 445, 10, 495);
    for (let k = -5; k <= 5; k += 1.2) this.box('white', 0.6, 0.012, 3.0, k, 0.006, 447.6);
    for (const z of [455, 468]) { this.streetLamp(-9.6, z, -1); this.streetLamp(9.6, z + 6, 1); }
    this.car(-7.7, 452, Math.PI, 'ok'); this.car(7.7, 458, 0, 'burnt');
    this.w._van(-3.5, 487, Math.PI / 2 + 0.05, true); this.w._van(3.6, 487.5, -Math.PI / 2, true);
    this.w._van(7.4, 470, 0.05, false, 'samu');
    for (let x = -9; x <= 9; x += 2.1) this.w._vauban(x, 491.5, 0);
    this.floodMast(-8.6, 484, -1, 477); this.floodMast(8.6, 483, 1, 476);
    this.plate(8, 4.4, 1.1, 0, 3.6, 490.6, Math.PI);
    this.cyl('darkMetal', 0.06, 0.06, 3.6, -2.1, 1.8, 490.7, 6); this.cyl('darkMetal', 0.06, 0.06, 3.6, 2.1, 1.8, 490.7, 6);
    this.pool(-3.5, 482.5, 6, 2); this.pool(3.6, 483, 6, 3); this.pool(7.4, 465.5, 5, 2);
    this.streetSign(-10.02, 446.5, 'RUE DE LA CASERNE', Math.PI / 2);
  }

  _dressing() {
    const w = this.w;
    // debris along the route: paper, cobbles, bottles, cardboard
    const rects = [[-9, 182, 9, 230], [-9, 247, 9, 340], [37, 247, 43, 345], [-40, 352, 40, 440], [-6, 445, 6, 475]];
    for (let i = 0; i < 240; i++) {
      const [x0, z0, x1, z1] = rects[i % rects.length], x = this.R(x0, x1), z = this.R(z0, z1), y = this.gh(x, z) + 0.01, k = this.rng();
      if (k < 0.35) this.box('paper', this.R(0.2, 0.4), 0.005, this.R(0.25, 0.35), x, y + 0.01, z, this.rng() * 6);
      else if (k < 0.55) this.box('stoneDark', this.R(0.12, 0.24), 0.1, this.R(0.08, 0.14), x, y + 0.05, z, this.rng() * 6);
      else if (k < 0.7) this.cyl('glass', 0.035, 0.035, 0.26, x, y + 0.04, z, 6, Math.PI / 2, 0, this.rng() * 6);
      else if (k < 0.85) this.box('cardboard', this.R(0.4, 0.7), this.R(0.05, 0.25), this.R(0.3, 0.6), x, y + 0.06, z, this.rng() * 6, 0, this.R(-0.2, 0.2));
      else this.box('trash', this.R(0.4, 0.6), 0.35, 0.4, x, y + 0.18, z, this.rng() * 6);
    }
    // a smoke column rising behind the south rooftops, and one beyond the east side
    this.D._farSmoke = true;
    w.smokes.push({ pos: V(10, 22, 545), rate: 2.6, scale: 2.4 }, { pos: V(130, 20, 300), rate: 2.2, scale: 2.2 });
  }

  _puddles() {
    const geos = [];
    const rects = [[-9, 185, 9, 345], [-60, 235, 60, 245], [-44, 349, 44, 359], [-44, 431, 44, 441], [37, 247, 43, 345], [-6, 445, 6, 490]];
    for (let i = 0; i < 70; i++) {
      const [x0, z0, x1, z1] = rects[i % rects.length], x = this.R(x0, x1), z = this.R(z0, z1);
      const g = new THREE.CircleGeometry(1, 14), pos = g.attributes.position;
      for (let k = 1; k < pos.count; k++) { const f = 0.7 + this.rng() * 0.5; pos.setX(k, pos.getX(k) * f); pos.setY(k, pos.getY(k) * f); }
      g.scale(this.R(0.6, 2.6), this.R(0.4, 1.5), 1); g.rotateX(-Math.PI / 2); g.rotateY(this.rng() * 3);
      g.translate(x, this.gh(x, z) + 0.012, z); geos.push(g);
    }
    // merged by hand: the puddles keep their own material (the boulevard's)
    const merged = new THREE.BufferGeometry();
    const pos = [], idx = []; let base = 0;
    for (const g of geos) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i)); const ix = g.index.array; for (let i = 0; i < ix.length; i++) idx.push(ix[i] + base); base += p.count; g.dispose(); }
    merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    merged.setIndex(idx);
    const mesh = new THREE.Mesh(merged, this.w.puddleMat);
    mesh.receiveShadow = true; mesh.renderOrder = 1; mesh.name = 'puddles';
    this.D.group.add(mesh);
  }
}
