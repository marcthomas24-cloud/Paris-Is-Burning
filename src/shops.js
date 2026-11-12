// The Revolution's street furniture: things on the boulevard the protester can break, enter,
// take, build or hide behind. Built once, when a Revolution level first loads, and switched off
// (meshes hidden, colliders `off`) in the State campaign, so nothing changes for the officer.
//   shops      · glazed shop fronts projecting onto the pavement (Paris's closed terraces):
//                smash the glass, walk in, take what is on the shelves; some have alarms
//   cars       · the parked cars' windows (world.vehicles), and their fires (burn.js)
//   panels     · lit advertising panels on the pavement
//   piles      · ammunition: loose cobbles, bottle crates, paint, fireworks, le Patron's crates
//   sites      · barricade sites: built from what is lying about, they stop a shield line
//   stash      · Papa's car, where loot is safe from confiscation
import * as THREE from 'three';
import { carParts } from './vehicles.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const DEPTH = 2.6, WIDTH = 7, HEIGHT = 3.1;

// item: [name, value €, colour, w, h, d]
export const SHOP_TYPES = {
  phones: { name: 'PHONE PALACE', sign: 0x1b6ef2, floor: 0xe8e8ea, alarm: true, heat: 14, kind: 'chain',
    items: [['Smartphone Pro Max', 220, 0x101012, 0.08, 0.16, 0.02], ['Wireless earbuds', 140, 0xf2f2f2, 0.1, 0.06, 0.06], ['Tablet', 260, 0x2a2a2e, 0.25, 0.18, 0.02], ['Smartwatch', 180, 0x111111, 0.06, 0.06, 0.04]] },
  sneakers: { name: 'SNEAKER SANCTUM', sign: 0xff5a1f, floor: 0x2a2a2e, alarm: true, heat: 10, kind: 'chain',
    items: [['"Air Solidarité" (limited)', 240, 0xf4f4f4, 0.32, 0.12, 0.2], ['Retro runners', 130, 0xd4202f, 0.3, 0.12, 0.19], ['Designer slides', 90, 0x111111, 0.28, 0.06, 0.18]] },
  luxury: { name: 'MAISON DORÉE', sign: 0xc9a227, floor: 0xf2ece0, alarm: true, heat: 22, kind: 'luxury',
    items: [['Monogram handbag', 1400, 0x6b4a2a, 0.34, 0.26, 0.14], ['Silk scarf', 380, 0xc8102e, 0.26, 0.04, 0.26], ['Gold watch', 2200, 0xd4af37, 0.08, 0.06, 0.06], ['Sunglasses', 420, 0x111111, 0.16, 0.06, 0.06]] },
  wine: { name: 'GRAND CRU CAVISTE', sign: 0x7a1d3a, floor: 0x5a3a2a, alarm: false, heat: 4, kind: 'small', ammo: 'bottle',
    items: [['Bordeaux 2015', 85, 0x4a0e1a, 0.08, 0.32, 0.08], ['Champagne', 120, 0x1a3a1a, 0.09, 0.33, 0.09], ['Natural wine (cloudy)', 38, 0xc8a24a, 0.08, 0.3, 0.08]] },
  bio: { name: 'BIO & SOLIDAIRE', sign: 0x3a8a2a, floor: 0xd8cfb8, alarm: false, heat: 2, kind: 'coop',
    items: [['Oat milk (barista)', 4, 0xe8e0c8, 0.1, 0.22, 0.07], ['Quinoa, fair trade', 9, 0xc8b070, 0.14, 0.2, 0.08], ['Kombucha', 6, 0xd08a3a, 0.08, 0.24, 0.08]] },
  bakery: { name: 'BOULANGERIE ROUX', sign: 0xd8a24a, floor: 0xe8d8b8, alarm: false, heat: 1, kind: 'family',
    items: [['Baguette tradition', 1.4, 0xd8a24a, 0.6, 0.07, 0.07], ['Croissants (6)', 7, 0xc8902a, 0.3, 0.1, 0.2], ['Tarte aux fraises', 18, 0xd4202f, 0.26, 0.06, 0.26]] },
  tech: { name: 'ÉLECTRO MÉGASTORE', sign: 0xf2c230, floor: 0x3a3a40, alarm: true, heat: 16, kind: 'chain', heavy: true,
    items: [['65" television', 900, 0x0a0a0c, 0.9, 0.55, 0.08], ['Games console', 480, 0xf2f2f2, 0.3, 0.08, 0.3], ['Laptop', 1100, 0x8a8f94, 0.34, 0.03, 0.24]] },
  fashion: { name: 'ZAPP · FAST FASHION', sign: 0xe0307a, floor: 0xf4f4f4, alarm: true, heat: 6, kind: 'chain',
    items: [['"Revolution" slogan tee', 19, 0xc8102e, 0.3, 0.04, 0.3], ['Oversized hoodie', 45, 0x8a9a6a, 0.34, 0.08, 0.3], ['Keffiyeh-print scarf', 25, 0xf2f2f2, 0.26, 0.04, 0.2]] },
  bank: { name: 'BANQUE NATIONALE DU PROFIT', sign: 0x0e3a5a, floor: 0xd8dce0, alarm: true, heat: 18, kind: 'bank', noLoot: true,
    items: [['Branded stress ball', 2, 0x0e3a5a, 0.08, 0.08, 0.08], ['Mortgage brochure', 0, 0xf2f2f2, 0.2, 0.28, 0.01]] },
  papa: { name: 'VAUTRIN IMMOBILIER', sign: 0x1b1b20, floor: 0xece8e0, alarm: true, heat: 12, kind: 'papa',
    items: [['Papa\'s desk bonsai', 650, 0x2f6a3a, 0.24, 0.3, 0.24], ['"Luxury loft" brochures', 0, 0xf2f2f2, 0.2, 0.28, 0.02], ['Signed photo of Papa', 0, 0xb8a587, 0.22, 0.28, 0.02]] },
  kebab: { name: 'KEBAB DU CANAL', sign: 0xd4202f, floor: 0xd8d0c0, alarm: false, heat: 1, kind: 'family',
    items: [['Döner (mixte, sauce blanche)', 8, 0xc8902a, 0.2, 0.12, 0.14], ['Can of Orangina', 2, 0xf28a1a, 0.06, 0.12, 0.06]] },
  coffee: { name: 'GLOBAL BEAN CO.', sign: 0x0a5a3a, floor: 0x5a4030, alarm: false, heat: 4, kind: 'chain',
    items: [['Seasonal latte syrup', 12, 0xd8a050, 0.08, 0.2, 0.08], ['Reusable cup (£ ethical)', 22, 0xf2f2f2, 0.1, 0.14, 0.1], ['Espresso machine', 650, 0x8a8f94, 0.36, 0.4, 0.3]] },
};

// Shop fronts on the boulevard: [side, z centre, type]. Free pavement runs found by probing the
// world's colliders, clear of the looting crews' own doors (crowd.js LOOT_SITES / RESERVE_SITES).
export const SHOP_SITES = [
  [1, 121.5, 'phones'], [-1, 18, 'bio'], [1, 24.5, 'sneakers'], [-1, 57.5, 'bakery'], [1, 82, 'wine'],
  [1, -6, 'bank'], [1, 38.5, 'fashion'], [1, -59, 'luxury'], [1, -87, 'tech'], [-1, -96, 'kebab'],
  [-1, -122.5, 'papa'], [1, -124, 'coffee'],
];

// Advertising panels: [x, z, facing]. Satirical posters (canvas textures).
const PANEL_SITES = [[10.2, 104, -1], [-10.2, 76, 1], [10.2, 52, -1], [-10.2, 4, 1], [10.2, -30, -1], [-10.2, -70, 1], [10.2, -104, -1], [-10.2, 130, 1]];
const ADS = [
  ['NEW · PHONE 27', 'Because you\'re worth €1,499', '#101012', '#f2f2f2'],
  ['LUXURY LOFTS', 'Le Marais · from €2.4M · Vautrin Immobilier', '#1b1b20', '#c9a227'],
  ['DRINK GLOBAL BEAN', 'Ethically sourced. Probably.', '#0a5a3a', '#f2f2f2'],
  ['RESIST IN STYLE', 'ZAPP "Revolution" tee · €19', '#e0307a', '#ffffff'],
  ['YOUR PENSION', 'is our business · Banque Nationale du Profit', '#0e3a5a', '#e8eef2'],
  ['SNEAKER DROP', '"Air Solidarité" · Saturday 10h', '#ff5a1f', '#111111'],
];

// Ammunition: [x, z, kind, charges (-1: never runs out)]
export const PILE_KINDS = {
  stone: { label: 'Loose cobbles', give: 5, color: 0x7a7570, prompt: 'Prise up cobblestones' },
  bottle: { label: 'Bottle crate', give: 4, color: 0x3a5a2a, prompt: 'Grab bottles' },
  paint: { label: 'Paint cans', give: 3, color: 0xe0307a, prompt: 'Take paint bombs' },
  firework: { label: 'Fireworks', give: 2, color: 0xd4202f, prompt: 'Take fireworks' },
  petrol: { label: 'Crew crate', give: 2, color: 0x2f6a3a, prompt: 'Take petrol bombs' },
};
export const AMMO_CAP = { stone: 8, bottle: 6, paint: 4, firework: 3, petrol: 2 };

const signTex = (text, bg, fg = '#ffffff') => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 64);
  x.fillStyle = fg; x.font = 'bold 38px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 256, 34, 490);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const adTex = ([title, sub, bg, fg]) => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 384;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 256, 384);
  x.fillStyle = fg; x.textAlign = 'center';
  x.font = 'bold 34px Arial'; x.fillText(title, 128, 150, 236);
  x.font = '17px Arial';
  const words = sub.split(' '); let line = '', y = 200;
  for (const w of words) { if (x.measureText(line + w).width > 220) { x.fillText(line, 128, y); line = ''; y += 24; } line += w + ' '; }
  x.fillText(line, 128, y);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export class RevStreet {
  constructor(game) {
    this.game = game;
    this.root = new THREE.Group();
    game.scene.add(this.root);
    this.mats = {
      glass: new THREE.MeshStandardMaterial({ color: 0x9fc6d8, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.28, depthWrite: false }),
      frame: new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.5, metalness: 0.5 }),
      shelf: new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.7 }),
      ceil: new THREE.MeshStandardMaterial({ color: 0xf4f0e4, emissive: 0xfff2d8, emissiveIntensity: 1.4, roughness: 0.6 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.8 }),
      ring: new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }),
      shard: new THREE.MeshStandardMaterial({ color: 0xbfe0ee, roughness: 0.1, metalness: 0.7, transparent: true, opacity: 0.7 }),
    };
    this.colliders = [];
    this.shops = SHOP_SITES.map(([side, z, type], i) => this._buildShop(i, side, z, type));
    this.panels = PANEL_SITES.map(([x, z, f], i) => this._buildPanel(i, x, z, f));
    this.piles = [];
    this.sites = [];
    this.stash = null;
    this.cars = new Map(); // world vehicle id -> { hits, trashed }
    this.enabled = true;
    this.setEnabled(false);
  }

  // ------------------------------------------------------------------ building
  _col(cx, cz, w, d, h = 3, tag = 'shop') {
    const c = this.game.world.addObstacle(cx, cz, w, d, 0, h, tag);
    this.colliders.push(c);
    return c;
  }

  _buildShop(i, side, zc, type) {
    const T = SHOP_TYPES[type], w = this.game.world;
    const g = new THREE.Group();
    const xFace = side * 15, xOut = side * (15 - DEPTH), xMid = side * (15 - DEPTH / 2);
    // floor, ceiling with its light, back wall shadowing the facade texture
    const floor = new THREE.Mesh(new THREE.BoxGeometry(DEPTH, 0.06, WIDTH), new THREE.MeshStandardMaterial({ color: T.floor, roughness: 0.4, metalness: 0.1 }));
    floor.position.set(xMid, 0.03, zc); floor.receiveShadow = true;
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(DEPTH, 0.12, WIDTH), this.mats.ceil);
    ceil.position.set(xMid, HEIGHT, zc);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.05, HEIGHT, WIDTH), new THREE.MeshStandardMaterial({ color: new THREE.Color(T.floor).multiplyScalar(0.8), roughness: 0.8 }));
    back.position.set(side * 14.97, HEIGHT / 2, zc);
    g.add(floor, ceil, back);
    // sign over the front
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, WIDTH), new THREE.MeshStandardMaterial({ color: 0xffffff, map: signTex(T.name, hex(T.sign)), emissive: 0xffffff, emissiveMap: signTex(T.name, hex(T.sign)), emissiveIntensity: 0.9 }));
    sign.position.set(xOut, HEIGHT + 0.38, zc);
    g.add(sign);
    // frame: corner posts, mid mullion, top rail
    for (const dz of [-WIDTH / 2, 0, WIDTH / 2]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, HEIGHT, 0.1), this.mats.frame); p.position.set(xOut, HEIGHT / 2, zc + dz); g.add(p);
    }
    for (const dz of [-WIDTH / 2, WIDTH / 2]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(DEPTH, HEIGHT, 0.08), this.mats.frame); p.position.set(xMid, HEIGHT / 2, zc + dz); g.add(p);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, WIDTH), this.mats.frame); rail.position.set(xOut, 0.08, zc); g.add(rail);
    // front glass: two panes
    const panes = [-1, 1].map((k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH / 2 - 0.1, HEIGHT - 0.2), this.mats.glass);
      m.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      m.position.set(xOut, HEIGHT / 2, zc + k * WIDTH / 4);
      m.renderOrder = 4;
      g.add(m);
      return m;
    });
    // broken glass left on the floor once smashed
    const shards = new THREE.Group();
    for (let k = 0; k < 14; k++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.12 + Math.random() * 0.2, 0.08 + Math.random() * 0.15), this.mats.shard);
      s.rotation.set(-Math.PI / 2, 0, Math.random() * 6);
      s.position.set(xOut + side * (-0.6 + Math.random() * 1.4), 0.075, zc + (Math.random() - 0.5) * WIDTH * 0.9);
      shards.add(s);
    }
    shards.visible = false; g.add(shards);
    // shelves along the back and the sides, goods on them
    const shelves = [];
    const spots = [];
    const nSpots = T.items.length >= 4 ? 4 : 3;
    for (let k = 0; k < nSpots; k++) {
      const dz = (k - (nSpots - 1) / 2) * (WIDTH / nSpots);
      const sx = side * 14.55;
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 1.25), this.mats.shelf);
      shelf.position.set(sx, 0.65, zc + dz); g.add(shelf); shelves.push(shelf);
      const goods = new THREE.Group();
      const it = T.items[k % T.items.length];
      const mat = new THREE.MeshStandardMaterial({ color: it[2], roughness: 0.45, metalness: type === 'luxury' || type === 'phones' ? 0.4 : 0.05 });
      const geo = new THREE.BoxGeometry(it[3], it[4], it[5]);
      for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(sx - side * 0.15 + (b - 0.5) * 0.22 * -side, 1.3 + it[4] / 2 + 0.01, zc + dz + (a - 1) * 0.36);
        goods.add(m);
      }
      g.add(goods);
      spots.push({ pos: V(side * 13.9, 0, zc + dz), goods, item: it, taken: false });
    }
    // the shop's light is its emissive ceiling (no new scene lights: the light count never changes)
    const light = { intensity: 0 };
    this.root.add(g);
    // colliders: front panes (removed when smashed), the two ends (always)
    const cols = [
      this._col(xOut, zc - WIDTH / 4, 0.14, WIDTH / 2, 3, 'shop'),
      this._col(xOut, zc + WIDTH / 4, 0.14, WIDTH / 2, 3, 'shop'),
    ];
    this._col(xMid, zc - WIDTH / 2, DEPTH, 0.14, 3, 'shopwall');
    this._col(xMid, zc + WIDTH / 2, DEPTH, 0.14, 3, 'shopwall');
    for (const s of shelves) this._col(s.position.x, s.position.z, 0.7, 1.25, 1.3, 'shopwall');
    return { i, side, z: zc, type, T, group: g, panes, shards, spots, light, cols, front: V(xOut - side * 0.2, 0, zc), door: V(side * (15 - DEPTH - 1.2), 0, zc), center: V(xMid, 0, zc), broken: false, burning: false, hits: 0 };
  }

  _buildPanel(i, x, z, facing) {
    const g = new THREE.Group();
    const ad = ADS[i % ADS.length];
    const tex = adTex(ad);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.9, 1.25), this.mats.frame);
    box.position.set(x, 1.25, z);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.65), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.85, roughness: 0.3 }));
    face.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    face.position.set(x + facing * 0.115, 1.25, z);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.35, 0.5), this.mats.frame); foot.position.set(x, 0.17, z);
    g.add(box, face, foot);
    this.root.add(g);
    this._col(x, z, 0.3, 1.3, 2.2, 'panel');
    return { i, pos: V(x, 0, z), face, facing, broken: false, ad };
  }

  // ------------------------------------------------------------------ per-mission layout
  // ammunition piles and barricade sites differ per mission; the shops and panels are fixed
  layout({ piles = [], sites = [], stash = null } = {}) {
    for (const p of this.piles) this.root.remove(p.mesh);
    for (const s of this.sites) { this.root.remove(s.mesh); this.root.remove(s.ghost); if (s.col) { s.col.off = true; } }
    this.piles = piles.map(([x, z, kind, charges]) => this._buildPile(x, z, kind, charges ?? -1));
    this.sites = sites.map(([x, z, w, ry]) => this._buildSite(x, z, w, ry || 0));
    if (this.stash) { this.root.remove(this.stash.mesh); this.stash.col.off = true; }
    this.stash = stash ? this._buildStash(stash[0], stash[1], stash[2] || 0) : null;
  }

  _buildPile(x, z, kind, charges) {
    const K = PILE_KINDS[kind];
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: K.color, roughness: 0.6 });
    if (kind === 'stone') {
      const geo = new THREE.DodecahedronGeometry(0.11);
      for (let k = 0; k < 9; k++) { const m = new THREE.Mesh(geo, mat); m.position.set((Math.random() - 0.5) * 0.7, 0.08 + Math.random() * 0.1, (Math.random() - 0.5) * 0.7); g.add(m); }
    } else {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.32, 0.45), new THREE.MeshStandardMaterial({ color: kind === 'paint' ? 0x8a8f94 : 0x6a4a2a, roughness: 0.8 }));
      crate.position.y = 0.16; g.add(crate);
      const geo = kind === 'paint' ? new THREE.CylinderGeometry(0.08, 0.08, 0.16, 8) : new THREE.CylinderGeometry(0.035, 0.04, 0.28, 6);
      for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(geo, mat); m.position.set(-0.2 + (k % 3) * 0.2, 0.38, -0.1 + Math.floor(k / 3) * 0.2); g.add(m); }
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 24), this.mats.ring);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
    g.position.set(x, this.game.world.groundHeight(x, z), z);
    this.root.add(g);
    return { pos: V(x, 0, z), kind, charges, mesh: g, ring };
  }

  _buildSite(x, z, w, ry) {
    // ghost: an outline of where the barricade goes; mesh: the built barricade
    const ghost = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 1.2), this.mats.ring);
    ghost.position.set(x, 0.05, z); ghost.rotation.y = ry;
    this.root.add(ghost);
    const mesh = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x7a8088, roughness: 0.5, metalness: 0.6 });
    const bin = new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: 0.7 });
    for (let k = 0; k < Math.round(w / 1.3); k++) {
      const off = -w / 2 + 0.65 + k * 1.3;
      const r = Math.random();
      let m;
      if (r < 0.35) { m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.8), wood); m.position.set(off, 0.1 + Math.random() * 0.6, 0); m.rotation.z = (Math.random() - 0.5) * 0.8; }
      else if (r < 0.65) { m = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 1.0, 10), bin); m.position.set(off, 0.35, (Math.random() - 0.5) * 0.4); m.rotation.z = Math.PI / 2 * (Math.random() < 0.5 ? 1 : 0.2); }
      else { m = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.0, 0.06), metal); m.position.set(off, 0.55, 0); m.rotation.set(0.3, 0, (Math.random() - 0.5) * 0.3); }
      m.castShadow = true;
      mesh.add(m);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.12, 0.9), wood); top.position.set(0, 1.05, 0); top.rotation.z = 0.1; mesh.add(top);
    mesh.position.set(x, 0, z); mesh.rotation.y = ry; mesh.visible = false;
    this.root.add(mesh);
    const col = this.game.world.addObstacle(x, z, w, 1.1, ry, 1.4, 'barricade');
    col.off = true;
    this.colliders.push(col);
    return { pos: V(x, 0, z), w, ry, ghost, mesh, col, built: false, progress: 0, burning: false, fire: null, barrier: null };
  }

  _buildStash(x, z, ry) {
    const w = this.game.world;
    const { parts } = carParts('sedan', { body: 'cars:0' });
    const g = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f4, roughness: 0.25, metalness: 0.5 });
    for (const [m, geo] of parts) { const mesh = new THREE.Mesh(geo, m.startsWith('cars') ? white : w.mat(m)); mesh.castShadow = true; g.add(mesh); }
    g.position.set(x, 0, z); g.rotation.y = ry;
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.85, 32), this.mats.ring);
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.05, 0); g.add(ring);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshBasicMaterial({ map: signTex('PAPA-75', '#f2f2f2', '#1b2a6a') }));
    plate.position.set(0, 0.45, -2.33); plate.rotation.y = Math.PI; g.add(plate);
    this.root.add(g);
    const col = w.addObstacle(x, z, 1.9, 4.7, ry, 1.5, 'stash');
    this.colliders.push(col);
    return { pos: V(x, 0, z), mesh: g, col, ring };
  }

  // ------------------------------------------------------------------ state
  setEnabled(on) {
    if (this.enabled === on) return;
    this.enabled = on;
    this.root.visible = on;
    for (const c of this.colliders) c.off = !on;
    if (on) this.reset();
  }

  reset() {
    for (const s of this.shops) {
      s.broken = false; s.burning = false; s.hits = 0; s.looters = 0; s.lootedBy = 0;
      for (const p of s.panes) p.visible = true;
      s.shards.visible = false;
      for (const c of s.cols) c.off = !this.enabled;
      for (const sp of s.spots) { sp.taken = false; sp.goods.visible = true; }
      if (s.fire) { this.game.effects.removeFire(s.fire); s.fire = null; }
      s.light.intensity = 0;
    }
    for (const p of this.panels) { p.broken = false; p.face.material.emissiveIntensity = 0.85; p.face.visible = true; }
    for (const s of this.sites) {
      s.built = false; s.progress = 0; s.mesh.visible = false; s.ghost.visible = true; s.col.off = true; s.barrier = null;
      if (s.fire) { this.game.effects.removeFire(s.fire); s.fire = null; } s.burning = false;
    }
    for (const p of this.piles) { p.mesh.visible = true; p.left = p.charges; }
    this.cars.clear();
  }

  // ------------------------------------------------------------------ queries
  // the shop front a point is at (the glass, within reach), unbroken
  frontAt(pos, reach = 1.6) {
    for (const s of this.shops) {
      if (s.broken) continue;
      const dx = Math.abs(pos.x - (s.side * (15 - DEPTH))), dz = Math.abs(pos.z - s.z);
      if (dx < reach && dz < WIDTH / 2 + 0.3) return s;
    }
    return null;
  }
  shopAt(pos) {
    for (const s of this.shops) if (Math.abs(pos.x - s.center.x) < DEPTH / 2 + 0.2 && Math.abs(pos.z - s.z) < WIDTH / 2) return s;
    return null;
  }
  // a shelf the protester can take from (inside a broken shop)
  spotNear(pos, r = 1.5) {
    for (const s of this.shops) {
      if (!s.broken) continue;
      for (const sp of s.spots) if (!sp.taken && Math.hypot(sp.pos.x - pos.x, sp.pos.z - pos.z) < r) return { shop: s, spot: sp };
    }
    return null;
  }
  panelNear(pos, r = 1.6) { return this.panels.find((p) => !p.broken && Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z) < r) || null; }
  carNear(pos, r = 2.4) {
    let best = null, bd = r;
    for (const v of this.game.world.vehicles) {
      if (v.kind !== 'car' || v.state !== 'ok') continue;
      const c = this.cars.get(v.id); if (c && c.trashed) continue;
      // distance to the car's box
      const dx = pos.x - v.x, dz = pos.z - v.z, cs = Math.cos(v.ry), sn = Math.sin(v.ry);
      const lx = cs * dx - sn * dz, lz = sn * dx + cs * dz;
      const ex = Math.max(0, Math.abs(lx) - v.W / 2), ez = Math.max(0, Math.abs(lz) - v.L / 2);
      const d = Math.hypot(ex, ez);
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }
  pileNear(pos, r = 1.4) { return this.piles.find((p) => p.mesh.visible && Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z) < r) || null; }
  siteNear(pos, r = 2.2) { return this.sites.find((s) => !s.built && Math.hypot(s.pos.x - pos.x, s.pos.z - pos.z) < r + s.w / 2 * 0.5) || null; }
  atStash(pos) { return this.stash && Math.hypot(this.stash.pos.x - pos.x, this.stash.pos.z - pos.z) < 3.6; }

  // ------------------------------------------------------------------ actions
  // something struck a shop front (a fist, a stone): glass breaks after enough of it
  hitFront(s, from, power = 1) {
    const g = this.game;
    if (s.broken) return false;
    s.hits += power;
    const p = s.front.clone().setY(1.4);
    p.z += Math.max(-WIDTH / 2, Math.min(WIDTH / 2, from.z - s.z)) * 0.8;
    g.effects.impact(p);
    if (s.hits < 2) { g.audio.impact(p, false, true); g.cameraRig.shake(0.08); return false; }
    this.smashShop(s, p);
    return true;
  }

  smashShop(s, at) {
    const g = this.game;
    s.broken = true;
    for (const pn of s.panes) pn.visible = false;
    s.shards.visible = true;
    for (const c of s.cols) c.off = true;
    s.light.intensity = 3.2;
    const p = at || s.front.clone().setY(1.4);
    g.audio.glass(p, 1);
    g.audio.glass(p.clone().add(V(0, 0, 1.5)), 0.6);
    g.cameraRig.shake(0.18);
    for (let k = 0; k < 40; k++) g.effects.fire.spawn({ pos: p.clone().add(V(0, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3)), vel: V(-s.side * (1 + Math.random() * 3), Math.random() * 2, (Math.random() - 0.5) * 3), size: 0.05 + Math.random() * 0.05, life: 0.5 + Math.random() * 0.4, alpha: 1, color: new THREE.Color(0.75, 0.95, 1), grav: 9, drag: 0.5, frame: 3 });
    if (s.T.alarm) g.audio.alarm(p, 18);
    g.crowd.disturb(p, 14, 0.55, 'violence');
    if (this.onSmash) this.onSmash(s);
  }

  // take one shelf's goods
  take(spot) {
    spot.taken = true; spot.goods.visible = false;
    this.game.audio.shutter(spot.pos);
  }

  igniteShop(s) {
    if (s.burning) return false;
    s.burning = true;
    if (!s.broken) this.smashShop(s);
    s.fire = this.game.effects.addFire(s.center.clone().setY(0.6), 1.4, 1.8);
    for (const sp of s.spots) if (!sp.taken && Math.random() < 0.5) { sp.taken = true; sp.goods.visible = false; } // goods burn
    if (this.onBurn) this.onBurn(s);
    return true;
  }

  hitPanel(p) {
    const g = this.game;
    p.broken = true;
    p.face.material = p.face.material.clone();
    p.face.material.emissiveIntensity = 0; p.face.material.color.setHex(0x333333);
    const at = p.pos.clone().setY(1.3);
    g.audio.glass(at, 0.7);
    for (let k = 0; k < 20; k++) g.effects.fire.spawn({ pos: at.clone(), vel: V((Math.random() - 0.5) * 3, Math.random() * 2.5, (Math.random() - 0.5) * 3), size: 0.05, life: 0.5, alpha: 1, color: new THREE.Color(0.8, 0.95, 1), grav: 9, drag: 0.5, frame: 3 });
    if (this.onPanel) this.onPanel(p);
  }

  // a car's windows: three blows trash it
  hitCar(v, from) {
    const g = this.game;
    const c = this.cars.get(v.id) || { hits: 0, trashed: false };
    this.cars.set(v.id, c);
    c.hits++;
    const at = V(v.x, 1.0, v.z);
    g.audio.glass(at, 0.6);
    g.effects.impact(at.clone().setY(1.1));
    for (let k = 0; k < 12; k++) g.effects.fire.spawn({ pos: at.clone(), vel: V((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3), size: 0.04, life: 0.45, alpha: 1, color: new THREE.Color(0.8, 0.95, 1), grav: 9, drag: 0.5, frame: 3 });
    if (c.hits === 1) g.audio.alarm(at, 10);
    if (c.hits >= 3 && !c.trashed) { c.trashed = true; if (this.onCar) this.onCar(v); }
    return c;
  }

  // ------------------------------------------------------------------ barricades
  build(site, dt, helpers) {
    site.progress += dt * (0.32 + helpers * 0.14);
    if (site.progress >= 1 && !site.built) {
      site.built = true;
      site.mesh.visible = true; site.ghost.visible = false; site.col.off = false;
      this.game.audio.crash(site.pos, 0.8);
      this.game.effects.dust(site.pos.clone().setY(0.4), 14);
      const riot = this.game.riot;
      site.barrier = { x: site.pos.x, z: site.pos.z, r: site.w / 2, hp: 10, site, onBreak: (b) => this.breakSite(b.site) };
      if (riot) riot.barriers.push(site.barrier);
      if (this.onBuilt) this.onBuilt(site);
      return true;
    }
    return false;
  }
  igniteSite(site) {
    if (!site.built || site.burning) return false;
    site.burning = true;
    site.fire = this.game.effects.addFire(site.pos.clone().setY(0.6), 1.6, 2.2);
    if (site.barrier) site.barrier.hp += 10; // a burning barricade holds them twice as long
    return true;
  }
  breakSite(site) {
    if (!site.built) return;
    site.built = false; site.mesh.visible = false; site.col.off = true;
    if (site.fire) { this.game.effects.removeFire(site.fire); site.fire = null; site.burning = false; }
    this.game.audio.crash(site.pos, 1);
    this.game.effects.dust(site.pos.clone().setY(0.4), 16);
    if (this.onSiteBroken) this.onSiteBroken(site);
  }

  update(dt, t) {
    if (!this.enabled) return;
    for (const p of this.piles) if (p.mesh.visible) { p.ring.material.opacity = 0.35 + Math.sin(t * 4) * 0.2; p.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.05); }
    for (const s of this.sites) if (s.ghost.visible) s.ghost.material.opacity = 0.3 + Math.sin(t * 3) * 0.2;
  }
}
