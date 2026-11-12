// Level 4 district: Gare de l'Est at 03h10.
//
//  the street (z < 598, out of bounds: a burning barricade closes the boulevard)
//  -> forecourt (z 598-640, open air: lamps, benches, a burning bin pyre)
//  -> three entrances in the facade (z 640.75; roller shutters the officer can open and close)
//  -> concourse (z 641.5-679, x +-32: pillars, two kiosks, benches, the departures board)
//  -> two ticket-gate lines in the gate wall (z 679.75; worked by the station staff)
//  -> platform (z 680.5-699.45) and the night train standing along its edge.
//
// Built once, when Level 4 first loads, into its own group (World.registerDistrict /
// setDistrict show and hide it with the level), 600 m south of the boulevard so nothing of the
// other levels is in view. Everything is level: no stairs. Lit signs, lamps and windows are
// unlit materials, so no light is added and the light count never changes. Placement draws
// from its own random stream and never from the world's (other districts stay as they were).
//
// The moving parts are separate meshes the level script drives: the three shutters, the two
// gate lines (a folding barrier and lane lights) and the train with its sliding doors.
import * as THREE from 'three';
import { mulberry } from './textures.js';
import { quietly } from './world.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// ------------------------------------------------------------------ layout data
export const STATION = {
  bounds: { minX: -34.5, maxX: 34.5, minZ: 598.5, maxZ: 699.45 },
  start: { x: 5, z: 606, heading: 0 },
  doorZ: 640.75, gateZ: 679.75, edgeZ: 699.45, hallX: 32,
  doors: [{ id: 'W', name: 'West entrance', x: -20 }, { id: 'C', name: 'Centre entrance', x: 0 }, { id: 'E', name: 'East entrance', x: 20 }],
  doorHalf: 2.2,
  gates: [{ id: 'A', name: 'Gate A', x: -15 }, { id: 'B', name: 'Gate B', x: 15 }],
  gateHalf: 4.2, lanes: [-3, -1, 1, 3],
  trainDoors: [-26.25, -18.75, -11.25, -3.75, 3.75, 11.25, 18.75, 26.25],
  kiosks: [{ id: 'A', x: -27, z: 669, face: 1, name: 'RELAY' }, { id: 'B', x: 27, z: 669, face: -1, name: 'PAUL' }],
  kioskHalf: [2.3, 3],
  pyre: { x: 8, z: 624 },
  staffPosts: [[-22, 676.4], [22, 676.4]],
  pillars: [[-24, 653], [-8, 653], [8, 653], [24, 653], [-24, 666], [-8, 666], [8, 666], [24, 666]],
  landmarks: { forecourt: [5, 610], entrance: [20, 638], concourse: [0, 660], gateA: [-15, 676], gateB: [15, 676], platform: [0, 692] },
  walkRects: [[-34.5, 598.5, 34.5, 640], [-22.2, 640, -17.8, 641.5], [-2.2, 640, 2.2, 641.5], [17.8, 640, 22.2, 641.5], [-32, 641.5, 32, 679], [-19.2, 679, -10.8, 680.5], [10.8, 679, 19.2, 680.5], [-34.5, 680.5, 34.5, 699.45]],
  areas: [['Forecourt', -34.5, 598.5, 34.5, 641.5], ['Concourse', -32, 641.5, 32, 680.5], ['Platform', -34.5, 680.5, 34.5, 699.45]],
};

export function stationArea(x, z) {
  for (const [name, x0, z0, x1, z1] of STATION.areas) if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return name;
  return 'outside the station';
}
// 0 forecourt, 1 concourse, 2 platform
export const roomAt = (z) => (z < STATION.doorZ ? 0 : z < STATION.gateZ ? 1 : 2);

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
function floorTex() {
  const rnd = mulberry(4401), [c, ctx] = canvas(512, 512);
  ctx.fillStyle = '#b9b2a4'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const v = 168 + Math.floor(rnd() * 30);
    ctx.fillStyle = `rgb(${v + 12},${v + 6},${v - 6})`; ctx.fillRect(i * 128 + 2, j * 128 + 2, 124, 124);
  }
  speckle(ctx, 512, 512, rnd, 9000, 0.1);
  // scuffs where thousands of people walk
  for (let i = 0; i < 40; i++) { ctx.strokeStyle = `rgba(40,36,30,${0.05 + rnd() * 0.08})`; ctx.lineWidth = 1 + rnd() * 3; ctx.beginPath(); const x = rnd() * 512, y = rnd() * 512; ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 120, y + (rnd() - 0.5) * 120); ctx.stroke(); }
  return tex(c);
}
function platTex() {
  const rnd = mulberry(4402), [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#6f6f6c'; ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, 256, rnd, 7000, 0.14);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, 256, 2); ctx.fillRect(0, 0, 2, 256);
  return tex(c);
}
function wallTex() {
  const rnd = mulberry(4403), [c, ctx] = canvas(512, 512);
  ctx.fillStyle = '#c9c0ad'; ctx.fillRect(0, 0, 512, 512);
  speckle(ctx, 512, 512, rnd, 12000, 0.08);
  for (let y = 0; y < 512; y += 64) { ctx.fillStyle = 'rgba(70,60,45,0.22)'; ctx.fillRect(0, y, 512, 2); for (let x = (y / 64) % 2 ? 0 : 64; x < 512; x += 128) ctx.fillRect(x, y, 2, 64); }
  for (let i = 0; i < 18; i++) { const x = rnd() * 512, h = 60 + rnd() * 200, g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(30,26,20,0.16)'); g.addColorStop(1, 'rgba(30,26,20,0)'); ctx.fillStyle = g; ctx.fillRect(x, 0, 4 + rnd() * 10, h); }
  return tex(c);
}
function shutterTex() {
  const [c, ctx] = canvas(64, 256);
  ctx.fillStyle = '#7c7f82'; ctx.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 8) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, y, 64, 2); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, y + 2, 64, 1); }
  return tex(c);
}
function stripeTex() {
  const [c, ctx] = canvas(256, 32);
  for (let x = -32; x < 256; x += 32) { ctx.fillStyle = '#c8201c'; ctx.beginPath(); ctx.moveTo(x, 32); ctx.lineTo(x + 16, 0); ctx.lineTo(x + 32, 0); ctx.lineTo(x + 16, 32); ctx.fill(); ctx.fillStyle = '#ecebe6'; ctx.beginPath(); ctx.moveTo(x + 16, 32); ctx.lineTo(x + 32, 0); ctx.lineTo(x + 48, 0); ctx.lineTo(x + 32, 32); ctx.fill(); }
  return tex(c);
}
function textTex(lines, { w = 512, h = 128, bg = '#111', fg = '#fff', font = 'bold 64px Arial', border = null, align = 'center' } = {}) {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = Math.max(4, h * 0.04); ctx.strokeRect(6, 6, w - 12, h - 12); }
  ctx.fillStyle = fg; ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, align === 'center' ? w / 2 : 28, (h * (i + 0.5)) / lines.length, w - 40));
  return tex(c, false);
}
// the departures board: every line but the last trains is struck out
function boardTex() {
  const [c, ctx] = canvas(1024, 256);
  ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = '#f2c230'; ctx.font = 'bold 30px Arial'; ctx.textBaseline = 'middle';
  ctx.fillText('DÉPARTS · TRAINS DE NUIT', 24, 26);
  const rows = [['03h14', 'MEAUX · CHÂTEAU-THIERRY', 'VOIE 4', '#e9e6df'], ['03h29', 'CHELLES · LAGNY', 'VOIE 4', '#e9e6df'], ['03h44', 'DERNIER TRAIN · MEAUX', 'VOIE 4', '#ffb02e'], ['—', 'MÉTRO 4 · 5 · 7', 'FERMÉ', '#ff5a4a'], ['—', 'RER E MAGENTA', 'FERMÉ', '#ff5a4a']];
  ctx.font = 'bold 34px Consolas, monospace';
  rows.forEach(([t, d, v, col], i) => { const y = 72 + i * 38; ctx.fillStyle = i % 2 ? '#111a30' : '#0e1528'; ctx.fillRect(12, y - 18, 1000, 36); ctx.fillStyle = col; ctx.fillText(t, 24, y); ctx.fillText(d, 170, y); ctx.fillText(v, 850, y); });
  return tex(c, false);
}
function kioskTex(name, bg, fg, smashed) {
  const rnd = mulberry(4410 + name.length), [c, ctx] = canvas(512, 256);
  ctx.fillStyle = '#2a251e'; ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 60);
  ctx.fillStyle = fg; ctx.font = 'bold 44px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name, 256, 32);
  const g = ctx.createLinearGradient(0, 64, 0, 256); g.addColorStop(0, '#f1c98a'); g.addColorStop(0.5, '#8a6236'); g.addColorStop(1, '#33240f');
  ctx.fillStyle = g; ctx.fillRect(14, 70, 484, 176);
  for (let k = 0; k < 26; k++) { ctx.fillStyle = `hsl(${Math.floor(rnd() * 360)},45%,${30 + rnd() * 25}%)`; ctx.fillRect(22 + rnd() * 450, 96 + Math.floor(rnd() * 4) * 36, 14 + rnd() * 22, 28); }
  for (let y = 124; y < 250; y += 36) { ctx.fillStyle = 'rgba(20,14,8,0.8)'; ctx.fillRect(14, y, 484, 4); }
  if (smashed) {
    ctx.strokeStyle = 'rgba(235,245,250,0.85)'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 40; k++) { const x = 20 + rnd() * 470, y = 74 + rnd() * 170; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 120, y + (rnd() - 0.5) * 100); ctx.stroke(); }
    ctx.fillStyle = 'rgba(5,5,5,0.85)'; ctx.beginPath(); ctx.moveTo(120, 100); ctx.lineTo(330, 84); ctx.lineTo(380, 220); ctx.lineTo(150, 236); ctx.fill();
  }
  return tex(c, false);
}
// one 15 m car side: [colour, emissive (lit windows and door glass)]
function trainTex() {
  const W = 1024, H = 224, [c, ctx] = canvas(W, H), [e, ex] = canvas(W, H);
  ctx.fillStyle = '#d9dcde'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1d3f8a'; ctx.fillRect(0, 150, W, 54);
  ctx.fillStyle = '#c8201c'; ctx.fillRect(0, 142, W, 8);
  ctx.fillStyle = '#3b3f44'; ctx.fillRect(0, 204, W, 20); ctx.fillRect(0, 0, W, 12);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  const win = (x0, x1) => { ctx.fillStyle = '#141a22'; ctx.fillRect(x0 - 4, 40, x1 - x0 + 8, 78); ctx.fillStyle = '#f0d9a6'; ctx.fillRect(x0, 44, x1 - x0, 70); ex.fillStyle = '#e6c88e'; ex.fillRect(x0, 44, x1 - x0, 70); };
  // doors sit at +-3.75 m of 15 m: u 0.25 and 0.75 (left clear for the sliding leaves)
  for (const [a, b] of [[30, 150], [362, 480], [544, 662], [874, 994]]) { win(a, a + (b - a) * 0.46); win(a + (b - a) * 0.54, b); }
  ctx.fillStyle = '#1d3f8a'; ctx.font = 'bold 20px Arial'; ctx.textBaseline = 'middle'; ctx.fillText('TER  GRAND EST', 500, 28);
  return [tex(c, false), tex(e, false)];
}

// ------------------------------------------------------------------ the builder
export function buildStation(world, scene, renderer, camera) {
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
    this.rng = mulberry(4400);
    this.D = { group: new THREE.Group(), sidewalks: [], roads: [], blocks: [], fires: [], smokes: [], lightBars: [], suppressed: [] };
    this.D.group.name = 'district:l4';
  }

  R(a, b) { return a + (b - a) * this.rng(); }

  _materials() {
    const m = this.w.materials;
    const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
    const lit = (o) => new THREE.MeshBasicMaterial({ fog: true, ...o });
    m.sFloor = std({ map: floorTex(), roughness: 0.55, envMap: m.road.envMap || null, envMapIntensity: 0.25 });
    m.sPlat = std({ map: platTex(), roughness: 0.95, emissive: 0x6f6f6c, emissiveIntensity: 0.08 });
    const wt = wallTex();
    // walls carry a little of their own light: the bounce an interior has and one sun cannot give
    m.sWall = std({ map: wt, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: 0.16 });
    m.sRoof = std({ color: 0x23272c, roughness: 0.8, metalness: 0.3, side: THREE.DoubleSide });
    m.sIron = std({ color: 0x2f4a3a, roughness: 0.55, metalness: 0.35, emissive: 0x2f4a3a, emissiveIntensity: 0.25 });
    m.sYellow = std({ color: 0xe0b020, roughness: 0.8 });
    m.sBallast = std({ color: 0x2c2823, roughness: 1 });
    m.sKiosk = std({ color: 0x24282c, roughness: 0.6, metalness: 0.2, emissive: 0x24282c, emissiveIntensity: 0.4 });
    m.sLit = [0xffe2b0, 0xdfe9ff, 0x34d070, 0xff4a3a, 0xffb02e].map((c) => lit({ color: c }));
    const signs = [
      textTex(['GARE DE L\'EST'], { w: 1536, h: 192, bg: '#c9c0ad', fg: '#2a2620', font: 'bold 140px Georgia, serif' }),
      textTex(['ACCÈS AUX TRAINS · VOIE 4'], { w: 1024, h: 128, bg: '#14306e', fg: '#ffffff', font: 'bold 70px Arial' }),
      textTex(['VOIE 4'], { w: 512, h: 192, bg: '#14306e', fg: '#ffffff', font: 'bold 130px Arial', border: '#ffffff' }),
      textTex(['MÉTRO FERMÉ', 'TRAINS DE NUIT →'], { w: 768, h: 256, bg: '#f2c230', fg: '#111', font: 'bold 78px Arial', border: '#111' }),
      textTex(['ENTRÉE'], { w: 512, h: 128, bg: '#1b5e3a', fg: '#ffffff', font: 'bold 84px Arial' }),
      textTex(['BILLETS'], { w: 256, h: 128, bg: '#14306e', fg: '#ffffff', font: 'bold 58px Arial' }),
      textTex(['NE PAS FRANCHIR', 'LA LIGNE JAUNE'], { w: 768, h: 192, bg: '#111', fg: '#f2c230', font: 'bold 64px Arial' }),
      textTex(['PARIS EST'], { w: 768, h: 160, bg: '#14306e', fg: '#ffffff', font: 'bold 110px Arial', border: '#ffffff' }),
    ];
    m.sSign = signs.map((t, i) => (i === 0 ? std({ map: t, roughness: 0.8 }) : lit({ map: t, side: THREE.DoubleSide })));
    m.sBoard = lit({ map: boardTex() });
    m.sShop = [lit({ map: kioskTex('RELAY', '#b3121b', '#fff', false) }), lit({ map: kioskTex('PAUL', '#1d1a16', '#e6c77a', false) })];
    const st = shutterTex();
    this.shutterMat = std({ map: st, roughness: 0.5, metalness: 0.3, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 0.45 });
    this.barMat = std({ map: stripeTex(), roughness: 0.6, side: THREE.DoubleSide });
    this.smashedMats = [lit({ map: kioskTex('RELAY', '#b3121b', '#fff', true) }), lit({ map: kioskTex('PAUL', '#1d1a16', '#e6c77a', true) })];
    const [tc, te] = trainTex();
    this.trainSide = std({ map: tc, emissive: 0xffffff, emissiveMap: te, emissiveIntensity: 0.85, roughness: 0.45, metalness: 0.3 });
    this.trainBody = std({ color: 0xc9cdd0, roughness: 0.5, metalness: 0.4 });
    this.trainDark = std({ color: 0x1d2024, roughness: 0.7, metalness: 0.3 });
    this.trainLeaf = std({ color: 0x1d3f8a, roughness: 0.45, metalness: 0.3 });
    this.trainIn = lit({ color: 0xf3d9a4 });
  }

  // ------------------------------------------------------------------ primitives
  box(k, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) { return this.w.box(k, w, h, d, x, y, z, ry, rx, rz); }
  cyl(k, rt, rb, h, x, y, z, seg = 10, rx = 0, rz = 0) { this.w.cyl(k, rt, rb, h, x, y, z, seg, rx, rz); }
  floor(k, x0, z0, x1, z1, y = 0.003, us = 4) { this.w.quad(k, V(x0, y, z1), V(1, 0, 0), V(0, 0, -1), x1 - x0, z1 - z0, (x1 - x0) / us, (z1 - z0) / us); }
  // a vertical face from a to b; it faces the left of that direction
  wall(k, ax, az, bx, bz, y0, h, us = 4) {
    const d = V(bx - ax, 0, bz - az), len = d.length(); d.normalize();
    this.w.quad(k, V(ax, y0, az), d, UP, len, h, len / us, h / us);
  }
  plate(k, w, h, x, y, z, ry) { const g = new THREE.PlaneGeometry(w, h); g.rotateY(ry); g.translate(x, y, z); this.w.add(k, g); }
  collider(x0, z0, x1, z1, h = 12, tag = 'building') { return this.w.addCollider(x0, z0, x1, z1, h, tag); }
  solid(x0, z0, x1, z1) { this.collider(x0, z0, x1, z1); this.D.blocks.push({ x0, z0, x1, z1 }); }
  fire(x, y, z, scale, smoke = 2) { this.w.fires.push({ pos: V(x, y, z), scale }); this.w.smokes.push({ pos: V(x, y + 1, z), rate: smoke, scale: 1.4 }); }
  // dark masses with a few lit windows: the city round the station
  mass(x0, z0, x1, z1, h, faces) {
    this.box('stoneDark', x1 - x0, h, z1 - z0, (x0 + x1) / 2, h / 2, (z0 + z1) / 2);
    for (const [ax, az, bx, bz] of faces) {
      const d = V(bx - ax, 0, bz - az), len = d.length(); d.normalize();
      const n = V(-d.z, 0, d.x);
      for (let s = 2; s < len - 3; s += 4) for (let y = 5; y < h - 2; y += 3.2) {
        if (this.rng() > 0.16) continue;
        this.w.quad(`sLit:${this.rng() < 0.8 ? 0 : 1}`, V(ax + d.x * s + n.x * 0.05, y, az + d.z * s + n.z * 0.05), d, UP, 1.4, 1.9);
      }
    }
  }

  // ------------------------------------------------------------------ build
  build() {
    const w = this.w, D = this.D, S = STATION;
    this._materials();
    D.roads = S.walkRects.map(([x0, z0, x1, z1]) => ({ x0, z0, x1, z1 }));
    const before = new Set(this.scene.children), fires0 = w.fires.length, smokes0 = w.smokes.length;
    this._ground();
    this._city();
    this._forecourt();
    this._facade();
    this._concourse();
    this._gateWall();
    this._platform();
    w._flush(D.group, ['sLit', 'sSign', 'sBoard', 'sShop', 'sRoof', 'sFloor', 'sPlat', 'sYellow', 'sBallast']);
    for (const o of [...this.scene.children]) if (!before.has(o)) D.group.add(o);
    D.fires = w.fires.splice(fires0); D.smokes = w.smokes.splice(smokes0);
    this._moving();
    this.scene.add(D.group);
    try { this.renderer.compile(this.scene, this.camera); } catch (e) { /* compiled on first sight instead */ }
    D.group.visible = false;
    return D;
  }

  _ground() {
    this.w.quad('ground', V(-160, -0.05, 760), V(1, 0, 0), V(0, 0, -1), 320, 260);
    this.floor('roadPlain', -70, 540, 70, 598, 0.001, 14);
    this.floor('paving', -36, 598, 36, 640.2, 0.002, 4);
    // a taxi lane painted across the forecourt's north edge
    for (let x = -30; x < 31; x += 6) this.box('white', 3, 0.012, 0.15, x, 0.008, 601.2);
  }

  // the city round the station: the boulevard's mouth to the north, wings either side
  _city() {
    this.mass(-90, 540, -16, 596, 19, [[-16, 596, -16, 540], [-90, 596, -16, 596]]);
    this.mass(16, 540, 90, 596, 21, [[16, 540, 16, 596], [16, 596, 90, 596]]);
    this.mass(-70, 596, -36, 642, 16, [[-36, 642, -36, 596]]);
    this.mass(36, 596, 70, 642, 17, [[36, 596, 36, 642]]);
    this.mass(-80, 640, -33.5, 712, 12, []);
    this.mass(33.5, 640, 80, 712, 12, []);
    // the boulevard is shut by a burning barricade; people come round its ends
    for (let x = -11; x <= 11; x += this.R(1.4, 2.2)) {
      const z = 588 + this.R(-1, 1), k = this.rng();
      if (k < 0.35) for (let i = 0; i < 3; i++) this.box('wood', 1.2, 0.14, 0.8, x, 0.07 + i * 0.15, z, this.R(-0.5, 0.5));
      else if (k < 0.6) this.box('charred', 0.7, 1.0, 0.8, x, 0.4, z, this.R(0, 3), 0, this.rng() < 0.5 ? Math.PI / 2 : 0);
      else if (k < 0.8) { this.cyl('tyre', 0.38, 0.38, 0.24, x, 0.12, z, 12); this.cyl('tyre', 0.38, 0.38, 0.24, x + 0.1, 0.36, z + 0.1, 12); }
      else this.box('darkMetal', 2.2, 1.9, 0.05, x, 0.95, z, this.R(-0.5, 0.5), this.R(-0.3, 0.3));
    }
    this.fire(-5, 0.7, 588, 1.4, 2.4); this.fire(4, 0.7, 587.5, 1.2, 2.2);
    this.w.smokes.push({ pos: V(-40, 20, 520), rate: 2.4, scale: 2.4 }, { pos: V(50, 22, 500), rate: 2.2, scale: 2.2 });
    for (let x = -31; x <= 31; x += 2.1) if (Math.abs(x) < 12 || this.rng() < 0.45) this.w._vauban(x, 596.6 + this.R(-0.3, 0.3), this.R(-0.15, 0.15), { collide: false, tilt: this.rng() < 0.3 ? 1.45 : 0, y: 0.03 });
  }

  _forecourt() {
    const w = this.w, P = STATION.pyre;
    for (const [x, z, s] of [[-28, 606, -1], [28, 606, 1], [-28, 622, -1], [28, 622, 1], [-12, 634, -1], [12, 634, 1]]) w._lamp(x, z, s);
    w._bench(-30, 614, -1); w._bench(30, 614, 1); w._bench(-30, 630, -1); w._bench(30, 630, 1);
    w._bin(-26, 636, false); w._bin(26.5, 612, true); w._bin(-10, 604, false);
    w._morris(-22, 611);
    // the station's totem
    this.cyl('darkMetal', 0.1, 0.1, 4.4, 26, 2.2, 603, 8);
    this.plate('sSign:7', 3.2, 0.66, 26, 4.0, 603.06, 0); this.plate('sSign:7', 3.2, 0.66, 26, 4.0, 602.94, Math.PI);
    this.collider(25.8, 602.8, 26.2, 603.2, 5, 'prop');
    // the notice people read as they arrive
    this.cyl('darkMetal', 0.06, 0.06, 2.6, -3, 1.3, 602.4, 6);
    this.plate('sSign:3', 2.4, 0.8, -3, 2.3, 602.46, 0); this.plate('sSign:3', 2.4, 0.8, -3, 2.3, 602.34, Math.PI);
    // the bin pyre: bins dragged together and set alight (the forecourt's hazard)
    this.box('charred', 2.8, 0.03, 2.6, P.x, 0.02, P.z, 0.4);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + this.R(-0.3, 0.3), x = P.x + Math.cos(a) * 0.55, z = P.z + Math.sin(a) * 0.55;
      if (i === 1) this.box('charred', 0.7, 1.05, 0.8, x, 0.38, z, this.R(0, 6), 0, Math.PI / 2);
      else { this.box(i ? 'binGreen' : 'charred', 0.7, 1.05, 0.8, x, 0.55, z, this.R(0, 6)); }
    }
    for (let k = 0; k < 5; k++) this.box(this.rng() < 0.5 ? 'cardboard' : 'trash', this.R(0.4, 0.7), this.R(0.2, 0.4), this.R(0.4, 0.6), P.x + this.R(-1, 1), 0.15, P.z + this.R(-1, 1), this.R(0, 6));
    this.collider(P.x - 1.1, P.z - 1.1, P.x + 1.1, P.z + 1.1, 1.2, 'prop');
    w.fires.push({ pos: V(P.x, 1.0, P.z), scale: 1.7 }, { pos: V(P.x + 0.5, 0.6, P.z - 0.4), scale: 1.0 });
    w.smokes.push({ pos: V(P.x, 1.6, P.z), rate: 2.2, scale: 1.4 });
    // litter
    for (let i = 0; i < 90; i++) {
      const x = this.R(-33, 33), z = this.R(599, 639), k = this.rng();
      if (k < 0.5) this.box('paper', this.R(0.2, 0.4), 0.005, this.R(0.25, 0.35), x, 0.012, z, this.R(0, 6));
      else if (k < 0.75) this.cyl('glass', 0.035, 0.035, 0.26, x, 0.04, z, 6, Math.PI / 2, this.R(0, 6));
      else this.box('cardboard', this.R(0.3, 0.6), this.R(0.04, 0.2), this.R(0.3, 0.5), x, 0.06, z, this.R(0, 6));
    }
  }

  // the facade: stone, three entrances with iron frames, tall lit windows, the station's name
  _facade() {
    const S = STATION, H = 11.5, z0 = 640, z1 = 641.5, hw = S.doorHalf, top = 4.3;
    const segs = [[-36, -20 - hw], [-20 + hw, -hw], [hw, 20 - hw], [20 + hw, 36]];
    for (const [a, b] of segs) {
      this.box('sWall', b - a, H, z1 - z0, (a + b) / 2, H / 2, (z0 + z1) / 2);
      this.solid(a, z0, b, z1);
    }
    for (const d of S.doors) {
      this.box('sWall', hw * 2, H - top, z1 - z0, d.x, top + (H - top) / 2, (z0 + z1) / 2); // over the doorway
      for (const s of [-1, 1]) this.box('sIron', 0.22, top, 1.7, d.x + s * (hw - 0.1), top / 2, 640.75);
      this.box('sIron', hw * 2, 0.24, 1.7, d.x, top - 0.1, 640.75);
      this.plate('sSign:4', 3.0, 0.7, d.x, top + 0.75, z0 - 0.04, Math.PI);
      this.plate('sLit:0', 3.6, 0.12, d.x, top - 0.28, z0 + 0.3, Math.PI);
      // the great arched window over each entrance, lit from inside
      this.plate('sLit:0', 3.4, 3.6, d.x, 8.2, z0 - 0.05, Math.PI);
      for (let k = -1; k <= 1; k++) this.box('sIron', 0.1, 3.7, 0.12, d.x + k * 1.13, 8.2, z0 - 0.06);
      this.box('sIron', 3.6, 0.1, 0.12, d.x, 8.2, z0 - 0.06);
      this.plate('sLit:0', 3.4, 3.6, d.x, 8.2, z1 + 0.05, 0);
    }
    for (const x of [-10, 10]) { this.plate('sLit:0', 2.0, 3.2, x, 7.9, z0 - 0.05, Math.PI); this.box('sIron', 2.2, 0.1, 0.12, x, 7.9, z0 - 0.06); this.box('sIron', 0.1, 3.3, 0.12, x, 7.9, z0 - 0.06); }
    this.plate('sSign:0', 15, 1.9, 0, 10.35, z0 - 0.06, Math.PI);
    this.box('sWall', 72.6, 0.5, 2.1, 0, H + 0.25, 640.75); // cornice
    // the clock
    const cl = new THREE.CircleGeometry(0.85, 24); cl.rotateY(Math.PI); cl.translate(-30, 9.2, z0 - 0.07); this.w.add('sLit:0', cl);
    this.box('black', 0.06, 0.6, 0.02, -30, 9.45, z0 - 0.09); this.box('black', 0.06, 0.42, 0.02, -29.82, 9.2, z0 - 0.09, 0, 0, -Math.PI / 2);
  }

  _concourse() {
    const S = STATION, X = S.hallX, H = 11.5;
    this.floor('sFloor', -X, 640, X, 680.5);
    // side walls (the wings' inner faces) and the roof with its lamps
    this.wall('sWall', -X, 641.5, -X, 679, 0, H); this.wall('sWall', X, 679, X, 641.5, 0, H);
    this.solid(-36, 641.5, -X, 679); this.solid(X, 641.5, 36, 679);
    this.box('sRoof', 2 * X + 3, 0.4, 41, 0, H + 0.2, 660.25);
    for (let x = -24; x <= 24; x += 12) for (const z of [648, 660, 672]) { this.box('sLit:1', 1.1, 0.06, 6.5, x, H - 0.05, z); this.box('sRoof', 1.4, 0.3, 6.9, x, H + 0.1, z); }
    for (const z of [647, 660, 673]) this.box('sIron', 2 * X, 0.5, 0.35, 0, H - 0.25, z); // roof trusses
    // pillars
    for (const [x, z] of S.pillars) {
      this.box('sWall', 0.8, H, 0.8, x, H / 2, z); this.box('sIron', 1.0, 0.5, 1.0, x, 0.25, z); this.box('sIron', 1.0, 0.4, 1.0, x, H - 0.6, z);
      this.collider(x - 0.45, z - 0.45, x + 0.45, z + 0.45, H, 'prop');
    }
    // the departures board, hung from the roof facing the entrances
    this.box('black', 10.4, 2.8, 0.3, 0, 6.6, 671);
    this.plate('sBoard', 10, 2.5, 0, 6.6, 670.84, Math.PI);
    for (const x of [-4.6, 4.6]) this.cyl('darkMetal', 0.04, 0.04, 3.6, x, 9.8, 671, 6);
    // kiosks: a lit shop front facing the hall
    const [hx, hz] = S.kioskHalf;
    S.kiosks.forEach((k, i) => {
      this.box('sKiosk', hx * 2, 3.0, hz * 2, k.x, 1.5, k.z);
      this.box('sKiosk', hx * 2 + 0.5, 0.25, hz * 2 + 0.5, k.x, 3.1, k.z);
      this.box(`awnings:${i ? 3 : 0}`, 1.0, 0.06, hz * 2, k.x + k.face * (hx + 0.45), 2.75, k.z, 0, 0, -k.face * 0.3);
      this.solid(k.x - hx, k.z - hz, k.x + hx, k.z + hz);
    });
    // ticket machines against the facade wall, benches, a few bins
    for (const x of [-12, -10.4, 10.4, 12]) {
      this.box('sKiosk', 0.9, 1.9, 0.6, x, 0.95, 641.85); this.plate('sLit:1', 0.5, 0.4, x, 1.35, 642.16, 0);
      this.collider(x - 0.45, 641.5, x + 0.45, 642.2, 2, 'prop');
    }
    this.plate('sSign:5', 1.6, 0.6, -11.2, 2.6, 641.56, 0); this.plate('sSign:5', 1.6, 0.6, 11.2, 2.6, 641.56, 0);
    this.w._bench(-31.2, 648, -1); this.w._bench(-31.2, 656, -1); this.w._bench(31.2, 648, 1); this.w._bench(31.2, 656, 1);
    this.w._bench(-0.35, 659, -1); this.w._bench(0.35, 659, 1);
    this.w._bin(-8, 644.5, false); this.w._bin(8, 644.5, false);
    for (let i = 0; i < 60; i++) {
      const x = this.R(-31, 31), z = this.R(643, 678), k = this.rng();
      if (this.w.blocked(x, z, 0.5)) continue;
      if (k < 0.6) this.box('paper', this.R(0.2, 0.35), 0.005, this.R(0.2, 0.3), x, 0.012, z, this.R(0, 6));
      else this.cyl('glass', 0.035, 0.035, 0.26, x, 0.04, z, 6, Math.PI / 2, this.R(0, 6));
    }
  }

  // the wall between hall and platform, with the two gate lines
  _gateWall() {
    const S = STATION, H = 11.5, z0 = 679, z1 = 680.5, hw = S.gateHalf, top = 3.2;
    const segs = [[-33.5, -15 - hw], [-15 + hw, 15 - hw], [15 + hw, 33.5]];
    for (const [a, b] of segs) { this.box('sWall', b - a, H, z1 - z0, (a + b) / 2, H / 2, (z0 + z1) / 2); this.solid(a, z0, b, z1); }
    for (const g of S.gates) {
      this.box('sWall', hw * 2, H - top, z1 - z0, g.x, top + (H - top) / 2, (z0 + z1) / 2);
      this.box('sIron', hw * 2, 0.2, 1.6, g.x, top - 0.1, 679.75);
      this.plate('sSign:1', 6.4, 0.8, g.x, top + 0.8, z0 - 0.04, Math.PI);
      this.plate('sSign:2', 1.5, 0.56, g.x, top + 0.8, z1 + 0.04, 0);
      // cabinets between the lanes
      for (const dx of [-4, -2, 0, 2, 4]) {
        this.box('sKiosk', 0.3, 1.05, 1.5, g.x + dx, 0.53, 679.75); this.box('metal', 0.32, 0.04, 1.52, g.x + dx, 1.07, 679.75);
        this.collider(g.x + dx - 0.15, z0, g.x + dx + 0.15, z1, 1.1, 'prop');
      }
    }
    // windows onto the platform between the gate lines
    for (const x of [-6, 0, 6]) { this.plate('sLit:1', 3.6, 2.6, x, 6.2, z0 - 0.05, Math.PI); this.plate('sLit:1', 3.6, 2.6, x, 6.2, z1 + 0.05, 0); this.box('sIron', 3.8, 0.1, 1.6, x, 6.2, 679.75); }
  }

  _platform() {
    const S = STATION, E = 699.6;
    this.floor('sPlat', -36, 680.5, 36, E, 0.003, 3);
    this.box('sYellow', 72, 0.012, 0.5, 0, 0.01, 698.25);
    this.box('white', 72, 0.012, 0.3, 0, 0.01, 699.45);
    this.wall('stoneDark', 36, E, -36, E, -1.15, 1.15); // the platform's face
    this.floor('sBallast', -90, E, 90, 706.4, -1.15, 6);
    for (const z of [700.55, 701.99]) this.box('metal', 180, 0.14, 0.08, 0, -0.95, z);
    for (let x = -88; x < 90; x += 0.7) this.box('wood', 0.24, 0.1, 2.5, x, -1.08, 701.27);
    this.box('stoneDark', 180, 9, 0.6, 0, 3.4, 706.7); // the far wall
    for (let x = -30; x <= 30; x += 12) this.plate('sLit:0', 3.4, 1.9, x, 2.2, 706.38, Math.PI);
    for (let x = -24; x <= 24; x += 12) this.plate('sSign:6', 3.0, 0.75, x, 4.2, 706.38, Math.PI);
    // canopy with its lamps, on iron columns clear of the edge
    this.box('sRoof', 72, 0.3, 26.2, 0, 8.6, 693.5);
    for (let x = -30; x <= 30; x += 10) { this.box('sLit:1', 6.5, 0.06, 0.9, x, 8.42, 688); this.box('sLit:1', 6.5, 0.06, 0.9, x, 8.42, 697); }
    for (let x = -30; x <= 30; x += 15) {
      this.cyl('sIron', 0.16, 0.2, 8.5, x, 4.25, 689.5, 10); this.box('sIron', 0.5, 0.3, 17, x, 8.3, 692);
      this.collider(x - 0.22, 689.28, x + 0.22, 689.72, 8.5, 'prop');
    }
    // end walls and platform signs
    this.wall('sWall', -35, 680.5, -35, 706, 0, 8.6); this.wall('sWall', 35, 706, 35, 680.5, 0, 8.6);
    for (const x of [-22.5, 0, 22.5]) { this.box('black', 2.2, 0.8, 0.12, x, 5.4, 690); this.plate('sSign:2', 2.0, 0.7, x, 5.4, 689.93, Math.PI); this.plate('sSign:2', 2.0, 0.7, x, 5.4, 690.07, 0); this.cyl('darkMetal', 0.03, 0.03, 2.8, x, 7.2, 690, 6); }
    this.w._bench(-33.6, 686, -1); this.w._bench(33.6, 686, 1);
    void S;
  }

  // the parts the level script moves: shutters, gate barriers and lights, the train
  _moving() {
    const S = STATION, D = this.D, w = this.w;
    const mesh = (geo, mat, x, y, z, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; D.group.add(m); return m; };
    // entrances
    const sg = new THREE.BoxGeometry(S.doorHalf * 2 - 0.3, 4.2, 0.12);
    sg.attributes.uv.array.forEach((v, i, a) => { if (i % 2 === 1) a[i] = v * 4.2; });
    D.doors = S.doors.map((d) => ({ ...d, open: true, shutter: mesh(sg, this.shutterMat, d.x, 2.1, S.doorZ), col: this.collider(d.x - S.doorHalf, 640.3, d.x + S.doorHalf, 641.2, 4.2, 'shutter') }));
    D.setDoor = (i, open) => { const d = D.doors[i]; d.open = !!open; d.shutter.visible = !open; d.col.off = !!open; };
    // gate lines: a folding barrier when closed; lane lights green (open wide), amber (tickets), red (closed)
    const bg = new THREE.BoxGeometry(S.gateHalf * 2, 1.25, 0.08);
    bg.attributes.uv.array.forEach((v, i, a) => { if (i % 2 === 0) a[i] = v * 6; });
    const lg = new THREE.BoxGeometry(S.gateHalf * 2 - 0.6, 0.16, 0.1);
    D.gates = S.gates.map((g) => ({
      ...g, mode: 'tickets',
      bar: mesh(bg, this.barMat, g.x, 0.68, 679.15),
      col: this.collider(g.x - S.gateHalf, 679.0, g.x + S.gateHalf, 679.5, 1.3, 'gate'),
      lights: { open: mesh(lg, w.mat('sLit:2'), g.x, 2.75, 678.94, false), closed: mesh(lg, w.mat('sLit:3'), g.x, 2.75, 678.94, false), tickets: mesh(lg, w.mat('sLit:4'), g.x, 2.75, 678.94, false) },
    }));
    D.setGate = (i, mode) => {
      const g = D.gates[i]; g.mode = mode;
      g.bar.visible = mode === 'closed'; g.col.off = mode !== 'closed';
      for (const k of Object.keys(g.lights)) g.lights[k].visible = k === mode;
    };
    // kiosk fronts (swapped for the smashed one when the crew gets through the glass)
    const [hx, hz] = S.kioskHalf;
    D.kiosks = S.kiosks.map((k, i) => {
      const g = new THREE.PlaneGeometry(hz * 2 - 0.4, 2.5); g.rotateY(k.face * Math.PI / 2);
      return { ...k, front: mesh(g, w.mat(`sShop:${i}`), k.x + k.face * (hx + 0.02), 1.45, k.z, false), ok: w.mat(`sShop:${i}`), smashed: this.smashedMats[i] };
    });
    D.setKiosk = (i, smashed) => { const k = D.kiosks[i]; k.front.material = smashed ? k.smashed : k.ok; };
    // the train: four 15 m cars; a door every 7.5 m, each two sliding leaves over a lit doorway
    const T = new THREE.Group(); T.name = 'train';
    const add = (geo, mat, x, y, z, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; T.add(m); return m; };
    const body = new THREE.BoxGeometry(14.7, 3.5, 2.9), under = new THREE.BoxGeometry(14.2, 1.1, 2.4), side = new THREE.PlaneGeometry(14.7, 3.3);
    side.rotateY(Math.PI);
    const leafG = new THREE.BoxGeometry(0.66, 2.15, 0.05), inG = new THREE.PlaneGeometry(1.3, 2.15); inG.rotateY(Math.PI);
    const leaves = [];
    for (const cx of [-22.5, -7.5, 7.5, 22.5]) {
      add(body, this.trainBody, cx, 2.0, 701.27);
      add(under, this.trainDark, cx, -0.3, 701.27, false);
      add(side, this.trainSide, cx, 1.95, 699.8, false);
      for (const dx of [-3.75, 3.75]) {
        add(inG, this.trainIn, cx + dx, 1.3, 699.79, false);
        for (const s of [-1, 1]) leaves.push({ m: add(leafG, this.trainLeaf, cx + dx + s * 0.33, 1.3, 699.76, false), x0: cx + dx + s * 0.33, s });
      }
    }
    for (const cx of [-15, 0, 15]) add(new THREE.BoxGeometry(0.5, 2.6, 2.4), this.trainDark, cx, 1.6, 701.27, false); // gangways
    D.group.add(T);
    D.train = { group: T, leaves };
    // x: where the train stands (0: at the platform); k: how far the doors are open (0..1)
    D.setTrain = (x, k) => { T.position.x = x; T.visible = Math.abs(x) < 150; for (const l of leaves) l.m.position.x = l.x0 + l.s * 0.62 * k; };
    D.setTrain(200, 0);
    D.doors.forEach((_, i) => D.setDoor(i, true)); D.gates.forEach((_, i) => D.setGate(i, 'tickets'));
  }
}
