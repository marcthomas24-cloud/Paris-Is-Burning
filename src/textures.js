// Procedural canvas textures — no external image assets are required.
import * as THREE from 'three';

let anisotropy = 4;
export function setAnisotropy(a) { anisotropy = a; }

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, { repeat = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  return t;
}

// Deterministic RNG so the city looks the same every run.
export function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise(ctx, w, h, amount, rnd, alpha = 0.08) {
  for (let i = 0; i < amount; i++) {
    const v = rnd() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rnd()})`;
    const s = 1 + rnd() * 2.5;
    ctx.fillRect(rnd() * w, rnd() * h, s, s);
  }
}

function grime(ctx, w, h, rnd, strength = 0.25) {
  // vertical rain streaks and darker base
  for (let i = 0; i < 40; i++) {
    const x = rnd() * w, len = h * (0.1 + rnd() * 0.5), y = rnd() * h;
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, 'rgba(40,35,30,0)');
    g.addColorStop(0.3, `rgba(40,35,30,${0.12 * strength})`);
    g.addColorStop(1, 'rgba(40,35,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, 2 + rnd() * 8, len);
  }
}

// ---------------------------------------------------------------------------
// Haussmann upper façade: 2 bays wide, 5 floors tall. v=0 is the first floor.
export function facadeTexture(variant) {
  const rnd = mulberry(100 + variant * 17);
  const W = 512, H = 1024;
  const [c, ctx] = canvas(W, H);
  const stones = ['#d9ccb2', '#cfc2a6', '#e0d6c2', '#c7b99c'];
  const base = stones[variant % stones.length];
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  noise(ctx, W, H, 9000, rnd, 0.07);
  const floorH = H / 5;
  // stone block joints
  ctx.strokeStyle = 'rgba(90,75,55,0.12)'; ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let f = 0; f < 5; f++) {
    const top = H - (f + 1) * floorH; // canvas y of floor top (f=0 is bottom)
    // cornice band
    ctx.fillStyle = 'rgba(255,250,240,0.35)'; ctx.fillRect(0, top + floorH - 10, W, 4);
    ctx.fillStyle = 'rgba(60,50,40,0.28)'; ctx.fillRect(0, top + floorH - 6, W, 6);
    const tall = f === 0 || f === 3 ? 0.66 : 0.6;
    for (let b = 0; b < 2; b++) {
      const cx = W / 4 + b * (W / 2);
      const ww = 92, wh = floorH * tall;
      const wx = cx - ww / 2, wy = top + floorH * 0.16;
      // window surround
      ctx.fillStyle = 'rgba(255,248,235,0.45)'; ctx.fillRect(wx - 9, wy - 12, ww + 18, wh + 16);
      ctx.fillStyle = 'rgba(70,60,45,0.25)'; ctx.fillRect(wx - 9, wy - 12, ww + 18, 4);
      // pediment on 2nd floor
      if (f === 1) {
        ctx.fillStyle = 'rgba(255,248,235,0.5)';
        ctx.beginPath(); ctx.moveTo(wx - 14, wy - 12); ctx.lineTo(cx, wy - 36); ctx.lineTo(wx + ww + 14, wy - 12); ctx.fill();
      }
      // glass
      const lit = rnd() < 0.18;
      const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
      if (lit) { g.addColorStop(0, '#6d5a3e'); g.addColorStop(1, '#3b3022'); }
      else { g.addColorStop(0, '#2f3a45'); g.addColorStop(0.5, '#1d242c'); g.addColorStop(1, '#262d33'); }
      ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
      // curtains
      if (rnd() < 0.5) { ctx.fillStyle = 'rgba(230,225,210,0.35)'; ctx.fillRect(wx + 4, wy + 4, 18, wh - 8); ctx.fillRect(wx + ww - 22, wy + 4, 18, wh - 8); }
      // frames (French windows)
      ctx.strokeStyle = '#ece8df'; ctx.lineWidth = 5; ctx.strokeRect(wx, wy, ww, wh);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, wy); ctx.lineTo(cx, wy + wh); ctx.stroke();
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(wx, wy + (wh * k) / 4); ctx.lineTo(wx + ww, wy + (wh * k) / 4); ctx.stroke(); }
      // balconnette railing on floors without full balcony
      if (f !== 1 && f !== 4) {
        const ry = wy + wh - 34;
        ctx.strokeStyle = '#1b1b1d'; ctx.lineWidth = 2;
        ctx.strokeRect(wx - 4, ry, ww + 8, 30);
        for (let x = wx; x < wx + ww; x += 7) { ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry + 30); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(cx, ry + 15, 9, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }
  grime(ctx, W, H, rnd, 0.9);
  return tex(c);
}

// Ground floor shop fronts — 6 m wide, 4.5 m tall.
const SHOPS = [
  { name: 'CAFÉ', bg: '#1f3b2e', fg: '#e8d9a8', glow: '#c99a55' },
  { name: 'BOULANGERIE', bg: '#5a2a1f', fg: '#f0e0c0', glow: '#e2b06a' },
  { name: 'PHARMACIE', bg: '#e8e8e2', fg: '#1a7b3c', glow: '#c8e6d0', cross: true },
  { name: 'TABAC · PRESSE', bg: '#7d1515', fg: '#ffffff', glow: '#d7a05a' },
  { name: 'BRASSERIE', bg: '#14202e', fg: '#d8b863', glow: '#d39b4a' },
  { name: '', bg: '#3b3d40', fg: '#fff', shutter: true },
  { name: 'LIBRAIRIE', bg: '#22324a', fg: '#efe5cc', glow: '#cfae76' },
  { name: '', bg: '#3b3d40', fg: '#fff', shutter: true, tag: true },
];
export const SHOP_COUNT = SHOPS.length;

export function shopTexture(i) {
  const s = SHOPS[i];
  const rnd = mulberry(500 + i * 31);
  const W = 512, H = 384;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#cdbfa4'; ctx.fillRect(0, 0, W, H);
  noise(ctx, W, H, 5000, rnd, 0.08);
  // rusticated stone bands
  ctx.fillStyle = 'rgba(70,60,45,0.22)';
  for (let y = 20; y < H; y += 34) ctx.fillRect(0, y, W, 3);
  // pillars left/right
  ctx.fillStyle = '#d8ccb2'; ctx.fillRect(0, 0, 38, H); ctx.fillRect(W - 38, 0, 38, H);
  // sign band
  ctx.fillStyle = s.bg; ctx.fillRect(38, 40, W - 76, 62);
  if (s.name) {
    ctx.fillStyle = s.fg; ctx.font = 'bold 40px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s.name, W / 2, 73, W - 110);
  }
  if (s.shutter) {
    // lowered metal shutter
    ctx.fillStyle = '#6c6e70'; ctx.fillRect(48, 108, W - 96, H - 108);
    for (let y = 108; y < H; y += 9) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(48, y, W - 96, 2); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(48, y + 3, W - 96, 1); }
    // graffiti
    const cols = ['#e53935', '#111', '#2c6ef2', '#f2f2f2', '#16a34a'];
    ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      ctx.strokeStyle = cols[(k + i) % cols.length]; ctx.lineWidth = 5 + rnd() * 6;
      ctx.beginPath();
      let x = 70 + rnd() * 300, y = 160 + rnd() * 150; ctx.moveTo(x, y);
      for (let j = 0; j < 6; j++) { x += -30 + rnd() * 70; y += -40 + rnd() * 80; ctx.quadraticCurveTo(x + 20, y - 30, x, y); }
      ctx.stroke();
    }
    if (s.tag) { ctx.fillStyle = '#f2f2f2'; ctx.font = 'bold 54px Impact, sans-serif'; ctx.save(); ctx.translate(W / 2, 260); ctx.rotate(-0.08); ctx.textAlign = 'center'; ctx.fillText('ON LÂCHE RIEN', 0, 0, 380); ctx.restore(); }
  } else {
    // glazing with warm interior
    const g = ctx.createLinearGradient(0, 110, 0, H);
    g.addColorStop(0, s.glow); g.addColorStop(0.3, '#3a2d20'); g.addColorStop(1, '#17120d');
    ctx.fillStyle = g; ctx.fillRect(50, 112, W - 100, H - 130);
    // interior shapes (shelves / people silhouettes)
    for (let k = 0; k < 7; k++) { ctx.fillStyle = `rgba(0,0,0,${0.2 + rnd() * 0.3})`; ctx.fillRect(60 + rnd() * 360, 200 + rnd() * 80, 20 + rnd() * 50, 100); }
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(60, 112); ctx.lineTo(160, 112); ctx.lineTo(80, H - 18); ctx.lineTo(50, H - 18); ctx.fill();
    // door frame + mullions
    ctx.strokeStyle = '#1e1e1e'; ctx.lineWidth = 6; ctx.strokeRect(50, 112, W - 100, H - 130);
    ctx.beginPath(); ctx.moveTo(W / 2, 112); ctx.lineTo(W / 2, H - 18); ctx.stroke();
    if (s.cross) {
      ctx.fillStyle = '#18a548';
      ctx.fillRect(W - 110, 120, 20, 56); ctx.fillRect(W - 128, 138, 56, 20);
    }
    // cracked glass on some shops
    if (rnd() < 0.5) {
      ctx.strokeStyle = 'rgba(230,240,255,0.55)'; ctx.lineWidth = 1.5;
      const cx = 120 + rnd() * 260, cy = 180 + rnd() * 120;
      for (let k = 0; k < 10; k++) { const a = rnd() * 6.28; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (30 + rnd() * 70), cy + Math.sin(a) * (30 + rnd() * 70)); ctx.stroke(); }
    }
  }
  grime(ctx, W, H, rnd, 1.2);
  return tex(c);
}

export function stoneTexture() {
  const rnd = mulberry(7);
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#c8bb9f'; ctx.fillRect(0, 0, 256, 256);
  noise(ctx, 256, 256, 4000, rnd, 0.09);
  ctx.fillStyle = 'rgba(70,60,45,0.15)';
  for (let y = 0; y < 256; y += 32) ctx.fillRect(0, y, 256, 2);
  grime(ctx, 256, 256, rnd, 1);
  return tex(c);
}

// Mansard roof: zinc with dormer windows (2 per 6 m tile).
export function roofTexture() {
  const rnd = mulberry(11);
  const [c, ctx] = canvas(512, 256);
  ctx.fillStyle = '#5c646b'; ctx.fillRect(0, 0, 512, 256);
  for (let x = 0; x < 512; x += 12) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x, 0, 2, 256); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + 3, 0, 1, 256); }
  noise(ctx, 512, 256, 3000, rnd, 0.06);
  for (let b = 0; b < 2; b++) {
    const cx = 128 + b * 256;
    ctx.fillStyle = '#e0d6c2'; ctx.fillRect(cx - 40, 70, 80, 130);
    ctx.beginPath(); ctx.moveTo(cx - 48, 72); ctx.lineTo(cx, 34); ctx.lineTo(cx + 48, 72); ctx.fill();
    ctx.fillStyle = '#20272e'; ctx.fillRect(cx - 28, 86, 56, 104);
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 3; ctx.strokeRect(cx - 28, 86, 56, 104);
    ctx.beginPath(); ctx.moveTo(cx, 86); ctx.lineTo(cx, 190); ctx.stroke();
  }
  return tex(c);
}

export function asphaltTexture(lanes) {
  const rnd = mulberry(lanes ? 21 : 22);
  const S = 512;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#48494b'; ctx.fillRect(0, 0, S, S);
  noise(ctx, S, S, 26000, rnd, 0.12);
  // patches and stains
  for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(${rnd() < 0.5 ? 0 : 70},${rnd() < 0.5 ? 0 : 70},${rnd() < 0.5 ? 0 : 70},0.08)`; ctx.beginPath(); ctx.ellipse(rnd() * S, rnd() * S, 20 + rnd() * 80, 10 + rnd() * 40, rnd() * 3, 0, 7); ctx.fill(); }
  // cracks
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) { let x = rnd() * S, y = rnd() * S; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 8; j++) { x += -12 + rnd() * 24; y += -12 + rnd() * 24; ctx.lineTo(x, y); } ctx.stroke(); }
  if (lanes) {
    // texture spans 18 m across (u) and 18 m along (v)
    ctx.fillStyle = 'rgba(225,225,215,0.75)';
    const lane = S / 4;
    for (let k = 1; k < 4; k++) {
      const x = k * lane;
      if (k === 2) { ctx.fillRect(x - 4, 0, 3, S); ctx.fillRect(x + 2, 0, 3, S); }
      else for (let y = 0; y < S; y += 128) ctx.fillRect(x - 2, y, 4, 64);
    }
    ctx.fillRect(10, 0, 4, S); ctx.fillRect(S - 14, 0, 4, S);
  }
  return tex(c);
}

export function pavingTexture() {
  const rnd = mulberry(31);
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#8e8a82'; ctx.fillRect(0, 0, S, S);
  const t = 32;
  for (let y = 0; y < S; y += t) for (let x = 0; x < S; x += t) {
    const v = 125 + rnd() * 25;
    ctx.fillStyle = `rgb(${v},${v - 3},${v - 8})`; ctx.fillRect(x + 1, y + 1, t - 2, t - 2);
  }
  noise(ctx, S, S, 4000, rnd, 0.1);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(30,25,20,0.12)'; ctx.beginPath(); ctx.ellipse(rnd() * S, rnd() * S, 10 + rnd() * 30, 6 + rnd() * 16, rnd() * 3, 0, 7); ctx.fill(); }
  return tex(c);
}

export function cobbleTexture() {
  const rnd = mulberry(41);
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#3c3a37'; ctx.fillRect(0, 0, S, S);
  const t = 16;
  for (let y = 0; y < S; y += t) for (let x = (y / t) % 2 ? t / 2 : 0; x < S + t; x += t) {
    const v = 85 + rnd() * 40;
    ctx.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
    ctx.beginPath(); ctx.roundRect(x - t / 2 + 1, y + 1, t - 2, t - 2, 4); ctx.fill();
  }
  noise(ctx, S, S, 3000, rnd, 0.1);
  return tex(c);
}

// --- Clothing / props -------------------------------------------------------

// PSG-style home shirt: navy with a central red band edged in white.
export function psgShirtTexture(variant = 0) {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = '#132447'; ctx.fillRect(0, 0, 128, 128);
  const w = variant === 1 ? 48 : 40;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(64 - w / 2 - 6, 0, w + 12, 128);
  ctx.fillStyle = '#d4202f'; ctx.fillRect(64 - w / 2, 0, w, 128);
  // collar trim + small badge circle (generic, no logo)
  ctx.fillStyle = '#d4202f'; ctx.fillRect(0, 0, 128, 5);
  ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(30, 30, 7, 0, 7); ctx.fill();
  ctx.fillStyle = '#132447'; ctx.beginPath(); ctx.arc(30, 30, 4.5, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
  ctx.fillText('PARIS', 64, 64);
  return tex(c, { repeat: false });
}

// Palestinian flag: black / white / green with red triangle at the hoist.
export function palestineFlagTexture() {
  const W = 256, H = 128;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, W, H / 3);
  ctx.fillStyle = '#f5f5f5'; ctx.fillRect(0, H / 3, W, H / 3);
  ctx.fillStyle = '#0a8a3d'; ctx.fillRect(0, (2 * H) / 3, W, H / 3 + 1);
  ctx.fillStyle = '#d61f26';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.38, H / 2); ctx.lineTo(0, H); ctx.fill();
  return tex(c, { repeat: false });
}

export function franceFlagTexture() {
  const [c, ctx] = canvas(192, 128);
  ctx.fillStyle = '#1f3fa0'; ctx.fillRect(0, 0, 64, 128);
  ctx.fillStyle = '#f5f5f5'; ctx.fillRect(64, 0, 64, 128);
  ctx.fillStyle = '#e1262d'; ctx.fillRect(128, 0, 64, 128);
  return tex(c, { repeat: false });
}

export function keffiyehTexture() {
  const [c, ctx] = canvas(64, 64);
  ctx.fillStyle = '#f0ede6'; ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 2;
  for (let i = -64; i < 128; i += 8) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 64, 64); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i + 64, 0); ctx.lineTo(i, 64); ctx.stroke(); }
  return tex(c);
}

export function placardTexture(text, bg = '#f4f1ea', fg = '#151515') {
  const [c, ctx] = canvas(256, 180);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 180);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 250, 174);
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  const size = lines.length > 1 ? 44 : 52;
  ctx.font = `900 ${size}px Impact, Arial Black, sans-serif`;
  lines.forEach((l, i) => ctx.fillText(l, 128, 90 + (i - (lines.length - 1) / 2) * (size + 6), 236));
  return tex(c, { repeat: false });
}

export function bannerTexture(text, bg = '#f2efe8', fg = '#b31b1b') {
  const [c, ctx] = canvas(1024, 192);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 192);
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 112px Impact, Arial Black, sans-serif';
  ctx.fillText(text, 512, 100, 980);
  // painted drips
  const rnd = mulberry(text.length * 13);
  for (let i = 0; i < 14; i++) { ctx.fillRect(80 + rnd() * 860, 140, 4, 10 + rnd() * 40); }
  return tex(c, { repeat: false });
}

export function streetSignTexture(line1, line2) {
  const [c, ctx] = canvas(256, 96);
  ctx.fillStyle = '#1d3f7a'; ctx.beginPath(); ctx.roundRect(0, 0, 256, 96, 10); ctx.fill();
  ctx.strokeStyle = '#e8eef7'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(6, 6, 244, 84, 8); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.font = '13px Arial'; ctx.fillText(line1, 128, 30);
  ctx.font = 'bold 26px Arial'; ctx.fillText(line2, 128, 66, 232);
  return tex(c, { repeat: false });
}

export function shieldTexture() {
  const [c, ctx] = canvas(128, 256);
  ctx.fillStyle = 'rgba(200,215,230,0.35)'; ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center';
  ctx.fillText('POLICE', 64, 150);
  ctx.strokeStyle = 'rgba(30,40,60,0.8)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 122, 250);
  return tex(c, { repeat: false });
}

export function vestTexture(text) {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = '#1a2233'; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#e8e8e8'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
  ctx.fillText(text, 64, 72);
  ctx.fillStyle = '#c9a53a'; ctx.fillRect(0, 100, 128, 6);
  return tex(c, { repeat: false });
}

export function policeTextTexture() {
  const [c, ctx] = canvas(256, 80);
  ctx.clearRect(0, 0, 256, 80);
  ctx.fillStyle = '#e9edf2'; ctx.font = 'bold 58px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('POLICE', 128, 42, 240);
  return tex(c, { repeat: false });
}

export function hairTexture() {
  const rnd = mulberry(91);
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1600; i++) {
    const v = 90 + rnd() * 140; ctx.strokeStyle = `rgba(${v},${v},${v},0.5)`; ctx.lineWidth = 1;
    const x = rnd() * 128, y = rnd() * 128; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 4, y + 3 + rnd() * 6); ctx.stroke();
  }
  return tex(c);
}

export function sootTexture() {
  const rnd = mulberry(55);
  const [c, ctx] = canvas(128, 256);
  for (let i = 0; i < 40; i++) {
    const x = 64 + (rnd() - 0.5) * 50, y = 60 + rnd() * 190, r = 20 + rnd() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.08 + (y / 256) * 0.1;
    g.addColorStop(0, `rgba(12,10,9,${a})`); g.addColorStop(1, 'rgba(12,10,9,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return tex(c, { repeat: false });
}

export function vanTexture() {
  // CRS van side: white/blue with stripes and POLICE lettering
  const [c, ctx] = canvas(512, 192);
  ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, 0, 512, 192);
  ctx.fillStyle = '#16337a'; ctx.fillRect(0, 108, 512, 34);
  ctx.fillStyle = '#d4202f'; ctx.fillRect(0, 142, 512, 8);
  ctx.fillStyle = '#16337a'; ctx.font = 'bold 54px Arial'; ctx.textAlign = 'center'; ctx.fillText('POLICE', 256, 90);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.fillText('C R S', 256, 133);
  // windows grilles
  ctx.fillStyle = '#1b222a'; ctx.fillRect(20, 14, 90, 46);
  ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
  for (let x = 24; x < 110; x += 8) { ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x, 60); ctx.stroke(); }
  return tex(c, { repeat: false });
}

export function softSpriteTexture() {
  const [c, ctx] = canvas(128, 128);
  const rnd = mulberry(77);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  // break up the disc with soft blobs for a smoky look
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 24; i++) {
    const x = rnd() * 128, y = rnd() * 128, r = 6 + rnd() * 18;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
    gg.addColorStop(0, 'rgba(0,0,0,0.35)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  return tex(c, { repeat: false, srgb: false });
}

export function ringTexture() {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 30, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return tex(c, { repeat: false, srgb: false });
}

export function beamTexture() {
  const [c, ctx] = canvas(64, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0.9)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 256);
  const h = ctx.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = h; ctx.fillRect(0, 0, 64, 256);
  return tex(c, { repeat: false, srgb: false });
}

export function railingTexture() {
  const [c, ctx] = canvas(256, 64);
  ctx.clearRect(0, 0, 256, 64);
  ctx.strokeStyle = '#151517'; ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 60);
  ctx.lineWidth = 2;
  for (let x = 8; x < 256; x += 10) { ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, 60); ctx.stroke(); }
  for (let x = 32; x < 256; x += 64) { ctx.beginPath(); ctx.arc(x, 32, 14, 0, 7); ctx.stroke(); }
  return tex(c, { srgb: true });
}
