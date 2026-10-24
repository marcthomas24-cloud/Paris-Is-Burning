// Articulated procedural humanoids + layered procedural animation.
import * as THREE from 'three';
import * as T from './textures.js';
import { Humans, createHuman, updateHuman } from './humans.js';

const matCache = new Map();
export function colMat(hex, opts = {}) {
  const k = hex + JSON.stringify(opts);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, ...opts }));
  return matCache.get(k);
}

let G = null; // shared geometry
let M = null; // shared textured materials
function initShared(world) {
  if (G) return;
  const cap = (r, l, ty) => { const g = new THREE.CapsuleGeometry(r, l, 3, 8); g.translate(0, ty, 0); return g; };
  G = {
    pelvis: new THREE.BoxGeometry(0.36, 0.22, 0.23),
    torso: (() => { const g = new THREE.BoxGeometry(0.4, 0.5, 0.23, 1, 1, 1); g.translate(0, 0.27, 0); return g; })(),
    torsoBig: (() => { const g = new THREE.BoxGeometry(0.46, 0.52, 0.3); g.translate(0, 0.28, 0); return g; })(),
    neck: (() => { const g = new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8); g.translate(0, 0.04, 0); return g; })(),
    head: (() => { const g = new THREE.SphereGeometry(0.11, 12, 10); g.scale(0.92, 1.1, 1.0); g.translate(0, 0.14, 0.0); return g; })(),
    hair: (() => { const g = new THREE.SphereGeometry(0.118, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55); g.scale(0.95, 1.05, 1.05); g.translate(0, 0.16, -0.01); return g; })(),
    cap: (() => { const g = new THREE.SphereGeometry(0.122, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5); g.translate(0, 0.17, 0); return g; })(),
    brim: (() => { const g = new THREE.BoxGeometry(0.2, 0.015, 0.12); g.translate(0, 0.18, 0.15); return g; })(),
    hood: (() => { const g = new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62); g.scale(1, 1.1, 1.1); g.translate(0, 0.14, -0.02); return g; })(),
    mask: (() => { const g = new THREE.BoxGeometry(0.2, 0.1, 0.08); g.translate(0, 0.08, 0.075); return g; })(),
    scarf: (() => { const g = new THREE.CylinderGeometry(0.085, 0.1, 0.1, 10); g.translate(0, 0.02, 0); return g; })(),
    upperArm: cap(0.064, 0.19, -0.14),
    upperArmBig: cap(0.068, 0.2, -0.14),
    forearm: cap(0.056, 0.17, -0.13),
    hand: (() => { const g = new THREE.BoxGeometry(0.075, 0.1, 0.05); g.translate(0, -0.05, 0); return g; })(),
    thigh: cap(0.088, 0.28, -0.22),
    shin: cap(0.072, 0.3, -0.22),
    shinGuard: (() => { const g = new THREE.BoxGeometry(0.13, 0.32, 0.13); g.translate(0, -0.2, 0.02); return g; })(),
    foot: (() => { const g = new THREE.BoxGeometry(0.115, 0.09, 0.27); g.translate(0, -0.02, 0.05); return g; })(),
    backpack: (() => { const g = new THREE.BoxGeometry(0.3, 0.36, 0.14); g.translate(0, 0.3, -0.18); return g; })(),
    helmet: (() => { const g = new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62); g.translate(0, 0.15, -0.005); return g; })(),
    visor: (() => { const g = new THREE.SphereGeometry(0.158, 14, 8, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.3, Math.PI * 0.36); g.translate(0, 0.14, 0.0); return g; })(),
    pad: (() => { const g = new THREE.SphereGeometry(0.09, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5); g.scale(1, 0.8, 1.1); return g; })(),
    pole: (() => { const g = new THREE.CylinderGeometry(0.012, 0.012, 1.0, 5); g.translate(0, -0.5, 0); return g; })(),
    bigPole: (() => { const g = new THREE.CylinderGeometry(0.018, 0.018, 3.2, 5); g.translate(0, -1.3, 0); return g; })(),
    flag: (() => { const g = new THREE.PlaneGeometry(0.75, 0.5, 8, 1); g.translate(0.375, 0, 0); return g; })(),
    bigFlag: (() => { const g = new THREE.PlaneGeometry(2.0, 1.3, 12, 2); g.translate(1.0, 0, 0); return g; })(),
    placard: new THREE.PlaneGeometry(0.62, 0.44),
    phone: (() => { const g = new THREE.BoxGeometry(0.075, 0.14, 0.012); return g; })(),
    banner: new THREE.PlaneGeometry(2.3, 0.62),
    baton: (() => { const g = new THREE.CylinderGeometry(0.018, 0.022, 0.62, 8); g.translate(0, -0.26, 0); return g; })(),
    batonHandle: (() => { const g = new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6); g.rotateZ(Math.PI / 2); g.translate(0.06, -0.12, 0); return g; })(),
    shield: (() => { const g = new THREE.BoxGeometry(0.56, 1.0, 0.02); return g; })(),
    ring: (() => { const g = new THREE.PlaneGeometry(1.4, 1.4); g.rotateX(-Math.PI / 2); g.translate(0, 0.03, 0); return g; })(),
    bottle: (() => { const g = new THREE.CylinderGeometry(0.035, 0.04, 0.22, 8); g.translate(0, 0.0, 0); return g; })(),
    rag: (() => { const g = new THREE.BoxGeometry(0.03, 0.08, 0.03); g.translate(0, 0.14, 0); return g; })(),
    // goods carried out of looted shops: carton, boxed television, shoe boxes, bag
    loot: [[0.42, 0.32, 0.32, 0xa07a4a], [0.62, 0.42, 0.1, 0x151515], [0.36, 0.16, 0.26, 0xe0601a], [0.3, 0.38, 0.18, 0xd8d8dc]]
      .map(([w, h, d, c]) => ({ geo: new THREE.BoxGeometry(w, h, d), color: c })),
  };
  M = {
    psg: [T.psgShirtTexture(0), T.psgShirtTexture(1)].map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })),
    keffiyeh: new THREE.MeshStandardMaterial({ map: T.keffiyehTexture(), roughness: 0.9 }),
    palFlag: world.materials.palFlag,
    palFlagBig: world.materials.palFlagBig,
    algFlag: world.materials.algFlag,
    algFlagBig: world.materials.algFlagBig,
    frFlag: world.materials.frFlag,
    frFlagBig: world.materials.frFlagBig,
    uniFlag: world.materials.uniFlag,
    uniFlagBig: world.materials.uniFlagBig,
    shield: new THREE.MeshStandardMaterial({ map: T.shieldTexture(), transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    visor: new THREE.MeshStandardMaterial({ color: 0x8fa3b8, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.5, depthWrite: false, side: THREE.DoubleSide }),
    vest: new THREE.MeshStandardMaterial({ map: T.vestTexture('POLICE'), roughness: 0.7 }),
    ring: new THREE.MeshBasicMaterial({ map: T.ringTexture(), color: 0xff2a2a, transparent: true, depthWrite: false, opacity: 0.9 }),
    policeText: new THREE.MeshStandardMaterial({ map: T.policeTextTexture(), transparent: true, alphaTest: 0.3, roughness: 0.6 }),
    hair: [0x0f0b08, 0x1c140e, 0x2e2018, 0x4a3524, 0x6b5238, 0x111111].map((c) => new THREE.MeshStandardMaterial({ color: c, map: T.hairTexture(), roughness: 0.75 })),
    ringBlue: new THREE.MeshBasicMaterial({ map: T.ringTexture(), color: 0xffc040, transparent: true, depthWrite: false, opacity: 0.9 }),
    phoneScreen: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x88aaff, emissiveIntensity: 0.6 }),
    bottle: new THREE.MeshStandardMaterial({ color: 0x2f6a3a, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 }),
    rag: new THREE.MeshStandardMaterial({ color: 0xc8b89a }),
    placards: [
      'FREE\nPALESTINE', 'JUSTICE', 'LIBERTÉ\nÉGALITÉ', 'PAIX', 'ON LÂCHE\nRIEN', 'ICI C\'EST\nPARIS', 'STOP', 'RÉSISTANCE', 'NON !', 'CESSEZ-LE-FEU',
      'VIE CHÈRE\nÇA SUFFIT', 'SAUVONS\nL\'HÔPITAL', 'GRÈVE !', 'LYCÉES\nEN LUTTE', 'PAS DE\nJUSTICE\nPAS DE PAIX', 'SMIC\nINDIGNE',
    ].map((txt, i) => new THREE.MeshStandardMaterial({ map: T.placardTexture(txt, i % 3 === 1 ? '#111' : '#f4f1ea', i % 3 === 1 ? '#f4f1ea' : (i % 2 ? '#b31b1b' : '#151515')), roughness: 0.9, side: THREE.FrontSide })),
    banners: [
      ['PALESTINE VIVRA', '#f2efe8', '#0a7a35'], ['ICI C\'EST PARIS', '#132447', '#ffffff'], ['JUSTICE POUR TOUS', '#111', '#f2f2f2'], ['STOP AUX VIOLENCES', '#f2efe8', '#b31b1b'],
      // student and union banners
      ['LYCÉENS EN COLÈRE', '#f2efe8', '#111'], ['FACS EN GRÈVE', '#c8161d', '#ffffff'], ['JEUNESSE EN LUTTE', '#111', '#f2c230'],
      ['LA VIE CHÈRE ÇA SUFFIT', '#f2efe8', '#c8161d'], ['SERVICES PUBLICS EN DANGER', '#1b2a4a', '#ffffff'],
    ].map(([t, b, f]) => new THREE.MeshStandardMaterial({ map: T.bannerTexture(t, b, f), side: THREE.DoubleSide, roughness: 0.9 })),
  };
}

const SKINS = [0xf1c9a5, 0xe0ac86, 0xc68c64, 0xa86f4c, 0x8a5636, 0x6b4029, 0x4e2e1c, 0xd8b090];
const HAIR = [0x1a1410, 0x2b1d14, 0x0d0d0d, 0x5a3b22, 0x7a5a3a, 0x222222];
const DARKS = [0x101010, 0x161616, 0x1c1c1e, 0x23252a, 0x2a2d33];
const HOODIES = [0x8e1418, 0x4a4c50, 0x22324a, 0x4a5a3a, 0x7a6a50, 0x5a2a3a, 0x8a8f94, 0x2a4a6a];
const TRACKS = [0x1b2a6a, 0x5a1a2a, 0x2f4a3a, 0x4a4c50, 0x6a6a70, 0x0e3a5a];
const STRIPES = [0xe0601a, 0xf2f2f2, 0xf2f2f2, 0xc8102e, 0xf2c230, 0x2c6ef2, 0x16a34a];
const CASUAL = [0x3a4a5e, 0x5a2a2a, 0x2f4a3a, 0x7a6a50, 0x8a8f94, 0xc0bab0, 0x6a4a6a, 0x9a4a2a, 0x2a3a6a, 0xd8d4c8, 0x4a5a3a];
const PANTS = [0x1a1c22, 0x23262c, 0x2a3346, 0x3b3f46, 0x4a4a42, 0x1b2a40, 0x111111, 0x5a5348];

// One shared clothing pool for everyone on the street: demonstrators, looters
// and passers-by all draw from the same distribution, so nothing a character
// wears says anything about the role they play or whether they turn violent.
// (Roles and hostility are assigned separately, from behaviour and mission state.)
// The pool follows the reference photos of the Paris street protests: mostly dark
// streetwear (hoodies, puffers, tracksuits), PSG and Algeria shirts, keffiyehs,
// face coverings, hi-vis vests, and the coats and shirts of people out for the evening.
export function randomOutfit(rng) {
  const r = rng();
  const o = {
    skin: SKINS[Math.floor(rng() * SKINS.length)],
    hair: HAIR[Math.floor(rng() * HAIR.length)],
    pants: PANTS[Math.floor(rng() * PANTS.length)],
    shoes: rng() < 0.55 ? 0xeeeeee : rng() < 0.5 ? 0x141414 : 0x8a2a2a,
    height: 0.92 + rng() * 0.16,
    build: 0.9 + rng() * 0.22,
    backpack: rng() < 0.3,
  };
  if (r < 0.12) { o.top = 'psg'; o.psg = rng() < 0.5 ? 0 : 1; o.topColor = 0x132447; o.longSleeve = rng() < 0.3; }
  else if (r < 0.42) {
    o.top = 'hoodie'; const hc = rng();
    o.topColor = hc < 0.65 ? DARKS[Math.floor(rng() * DARKS.length)] : HOODIES[Math.floor(rng() * HOODIES.length)];
    o.longSleeve = true; o.hood = rng() < 0.5;
  }
  else if (r < 0.54) { o.top = 'track'; o.topColor = rng() < 0.6 ? DARKS[Math.floor(rng() * 3)] : TRACKS[Math.floor(rng() * TRACKS.length)]; o.stripe = STRIPES[Math.floor(rng() * STRIPES.length)]; o.longSleeve = true; }
  else if (r < 0.70) { o.top = 'jacket'; o.topColor = rng() < 0.8 ? DARKS[Math.floor(rng() * DARKS.length)] : CASUAL[Math.floor(rng() * CASUAL.length)]; o.longSleeve = true; }
  else if (r < 0.84) { o.top = 'tee'; o.topColor = rng() < 0.5 ? DARKS[Math.floor(rng() * DARKS.length)] : CASUAL[Math.floor(rng() * CASUAL.length)]; o.longSleeve = false; }
  // smart: wool coat or pressed shirt (dressed in skinnedOutfit)
  else { o.top = 'jacket'; o.smart = true; o.topColor = SMART_COATS[Math.floor(rng() * SMART_COATS.length)]; o.longSleeve = true; }
  if (o.top === 'psg' && rng() < 0.3) o.pants = 0x132447;
  const hr = rng();
  o.hat = o.hood ? 'none' : hr < 0.24 ? 'cap' : hr < 0.36 ? 'beanie' : 'none';
  o.hatColor = rng() < 0.6 ? 0x111111 : rng() < 0.6 ? 0xeeeeee : rng() < 0.5 ? 0x132447 : 0xd4202f;
  const mr = rng();
  // balaclava: black full-head cover with an eye slot
  o.mask = mr < 0.08 ? 'balaclava' : mr < 0.18 ? 'black' : mr < 0.30 ? 'surgical' : mr < 0.33 ? 'white' : mr < 0.37 ? 'keffiyeh' : 'none';
  if (o.mask === 'balaclava') o.hat = 'none';
  const sr = rng();
  o.scarf = sr < 0.2 ? 'keffiyeh' : sr < 0.26 ? 'psg' : sr < 0.32 ? 'red' : 'none';
  skinnedOutfit(o, rng);
  // gilets jaunes: a hi-vis vest worn over whatever garment they have on
  if (rng() < 0.1) {
    o.vest = true;
    if (!o.garment) { o.garment = 'shirt'; o.shellColor = o.topColor ?? 0x222222; o.keepTop = false; }
    o.shellPattern = 7; o.pa = 0xd8ec1a; o.pb = 0xb8bec4;
    if (o.mask === 'black' && rng() < 0.6) o.mask = 'none';
  }
  return o;
}
const SMART_COATS = [0x8a6a48, 0x22324a, 0x2a2a2e, 0x5a5a5e, 0xb8a587, 0x3a2a22, 0x6a1d2a];
const SMART_SHIRTS = [0xf2f2f0, 0xb8cce0, 0xe8d8d0, 0xd8dccf, 0x9fb4c8];

// Extra parameters used by the skinned (glTF) characters.
// Complexion groups, drawn with ordinary weights (no caps or quotas). They only
// choose a base body, skin tone and hair; nothing in the game reads them for
// behaviour, and the audit in dev.js (__auditAppearance) checks that.
const SKIN_GROUPS = {
  eu: [0xf3d2bd, 0xe8b996, 0xdcb08c],
  na: [0xc08562, 0xb47b55, 0xa87a58, 0xa06a48, 0x956040, 0x8a5a3c],
  af: [0x84553a, 0x6a412b, 0x5a3624, 0x4d2e1f, 0x3e2418],
};
export const SHARE = { female: 0.3, eu: 0.34, af: 0.3 }; // na: the remainder (0.36)

// CRS officers: varied height, build and complexion from the same groups as
// everyone else. (The skinned CRS model is fully armoured with a visor, so the
// complexion shows on the procedural fallback rig; height and build show on both.)
export function policeOutfit(rng) {
  const er = rng();
  const group = er < SHARE.eu ? 'eu' : er < SHARE.eu + SHARE.af ? 'af' : 'na';
  const tones = SKIN_GROUPS[group];
  return { skin: tones[Math.floor(rng() * tones.length)], height: 0.96 + rng() * 0.1, build: 0.95 + rng() * 0.15 };
}
const JEANS = [0x2a3a5a, 0x1e2a44, 0x3b4b6b, 0x151a24, 0x222222, 0x4a4a48, 0x5a5040, 0x3a3f46, 0x6a6a70, 0x1b1b1b];
const SHOES = [0xf0f0f0, 0xe8e8e8, 0x151515, 0x222222, 0x8a2a2a, 0x3a4a6a, 0xc8c0b0, 0xf4f4f4];
const FOOTBALL = [
  // [pattern, a, b, c]  pattern: 2 vertical stripes, 3 hoops, 4 two-tone, 0 solid
  [2, 0x0b0b0b, 0xf2f2f2], [3, 0x0a7a35, 0xf2f2f2], [0, 0x1f3fa0], [4, 0xf2f2f2, 0x0a7a35], [0, 0xc8102e], [2, 0x7a1d3a, 0x1b2a6a], [0, 0xf2c230], [4, 0x0b0b0b, 0xd4202f],
  [3, 0x1b2a6a, 0xf2c230], [2, 0xd4202f, 0xf2f2f2], [0, 0x6aa8e0], [4, 0x7a1d3a, 0x6aa8e0], [3, 0x111111, 0xe0601a], [0, 0xf2f2f2], [2, 0x0a7a35, 0x111111], [4, 0xe0601a, 0x111111],
];
// Rocketbox bodies keep their own face/skin texture (only a slight tint) and can
// keep their original clothes; these are the colours used for far impostors then.
const RB_BASE = {
  rb_female: { top: 0x8c8c8a, pants: 0x3b4d6e, shoes: 0x5a3a26, hair: 0x2a1a12 },
  rb_male_a: { top: 0x1e1f21, pants: 0x4a4332, shoes: 0xd8d8dc, hair: 0x0e0b09 },
  rb_male_b: { top: 0x3c4f6e, pants: 0x6f87a6, shoes: 0xe8e8e8, hair: 0x0e0b09 },
};
function skinnedOutfit(o, rng) {
  const pick = (a) => a[Math.floor(rng() * a.length)];
  o.gender = rng() < SHARE.female ? 'f' : 'm';
  const er = rng();
  o.ethnicity = er < SHARE.eu ? 'eu' : er < SHARE.eu + SHARE.af ? 'af' : 'na';
  // base body: original Michelle / Ready Player Me bodies (tinted to any
  // complexion) plus the Rocketbox people, whose face textures are brown-skinned
  const br = rng();
  if (o.ethnicity === 'eu') o.base = o.gender === 'f' ? 'michelle' : 'male';
  else o.base = o.gender === 'f' ? (br < 0.6 ? 'rb_female' : 'michelle') : br < 0.4 ? 'male' : br < 0.7 ? 'rb_male_a' : 'rb_male_b';
  o.skinTone = pick(SKIN_GROUPS[o.ethnicity]);
  o.skin = o.skinTone; // procedural fallback rig
  const tone = new THREE.Color(o.skinTone);
  o.skinMul = o.gender === 'f'
    ? new THREE.Color(tone.r / 0.45, tone.g / 0.29, tone.b / 0.2).multiplyScalar(0.92)
    : new THREE.Color(tone.r / 0.8, tone.g / 0.62, tone.b / 0.57);
  o.pants = o.top === 'psg' && rng() < 0.3 ? 0x132447 : pick(JEANS);
  o.shoes = pick(SHOES);
  o.pattern = 0;
  if (o.top === 'psg') { o.pattern = 1; o.topColor = 0x132447; o.pa = 0x132447; o.pb = 0xd4202f; o.pc = 0xf2f2f2; o.topBase = 0x132447; }
  else if (o.top === 'tee' && rng() < 0.55) {
    const f = pick(FOOTBALL); o.pattern = f[0]; o.topColor = f[1]; o.pa = f[1]; o.pb = f[2] ?? f[1]; o.topBase = f[1];
  } else o.topBase = o.top === 'hoodie' ? 0x000000 : o.topColor;
  o.accent = pick([0xd4202f, 0x2c6ef2, 0xf2f2f2, 0x16a34a, 0xf2c230, 0x111111]);
  o.hairStyle = o.ethnicity === 'af' ? pick(['buzz', 'buzz', 'curly', 'short', 'none']) : pick(['short', 'short', 'buzz', 'curly', 'short', 'none']);
  o.hairIdx = o.ethnicity === 'eu' ? Math.floor(rng() * 6) : Math.floor(rng() * 3);
  o.hair = [0x0f0b08, 0x1c140e, 0x2e2018, 0x4a3524, 0x6b5238, 0x111111][o.hairIdx];
  o.beard = o.gender === 'm' && rng() < 0.4;
  o.packColor = pick([0x1d1f22, 0x2a3a5a, 0x4a3a2a, 0x3a4a3a, 0x6a1d1d]);
  o.height = o.gender === 'f' ? 0.96 + rng() * 0.08 : 0.93 + rng() * 0.1;
  // garment layer over the base body + body shape
  const gr = rng();
  if (o.top === 'psg') { o.garment = 'shirt'; o.shellColor = 0x132447; o.shellPattern = 1; }
  else if (o.top === 'tee') {
    o.garment = 'shirt'; o.shellColor = o.topColor; o.shellPattern = o.pattern || 0;
    if (rng() < 0.3) { o.shellPattern = 6; o.pa = 0x0a7a35; o.pb = 0xf4f4f4; o.shellColor = 0xf4f4f4; } // Algeria-style shirt
  } else if (o.top === 'hoodie') { o.garment = gr < 0.75 ? 'hoodie' : 'puffer'; o.shellColor = o.topColor; o.shellPattern = 0; }
  else if (o.top === 'track') { o.garment = 'hoodie'; o.shellColor = o.topColor; o.shellPattern = 8; o.pa = o.stripe; o.pants = rng() < 0.7 ? 0x141416 : 0x3a3d42; }
  else if (o.smart) {
    // wool coat or pressed shirt, trousers, leather shoes
    const coat = gr < 0.65;
    o.garment = coat ? 'coat' : 'shirt'; o.shellPattern = 0;
    o.shellColor = coat ? pick(SMART_COATS) : pick(SMART_SHIRTS);
    o.topColor = o.topBase = o.shellColor;
    o.pants = pick([0x2a2a30, 0x3a3f4a, 0x8a7a5a, 0x22324a, 0x4a4a48, 0x1b1b20]);
    o.shoes = pick([0x4a2e1c, 0x151515, 0x3a2418, 0x222222]);
  }
  else { o.garment = gr < 0.4 ? 'puffer' : gr < 0.7 ? 'coat' : gr < 0.9 ? 'hoodie' : null; o.shellColor = o.topColor; o.shellPattern = 0; }
  if (o.garment === 'coat' && !o.smart) o.shellColor = pick([0x2a2622, 0x3a3226, 0x1b1d22, 0x4a4036, 0x22324a]);
  if (o.garment === 'puffer') o.shellColor = pick([0x111111, 0x1a1c22, 0x2a3a5a, 0x5a1a1a, 0x2f3b33, 0x8a7a5a, 0x6a6a70]);
  if (o.garment && rng() < 0.1) o.garment = null; // some keep the base outfit
  if (o.gender === 'f' && !o.garment) { o.garment = 'shirt'; o.shellColor = pick([0x111111, 0xf2f2f2, 0x7a1d3a, 0x2a3a5a]); o.shellPattern = 0; }
  const heavy = rng() < 0.25;
  o.body = {
    girth: heavy ? 1.08 + rng() * 0.1 : 0.95 + rng() * 0.07,
    chest: 0.97 + rng() * 0.08,
    shoulders: o.gender === 'f' ? 0.95 + rng() * 0.05 : 0.98 + rng() * 0.09,
    head: 0.96 + rng() * 0.07,
  };
  if (o.gender === 'f' && rng() < 0.2) { o.headscarf = pick([0x111111, 0x2a2a3a, 0x5a2a3a, 0xd8d0c0, 0x3a4a3a, 0x6a4a3a]); o.hat = 'none'; o.hood = false; }
  if (o.gender === 'f' && o.mask === 'balaclava') { o.mask = 'black'; o.hood = true; }
  const rb = RB_BASE[o.base];
  if (rb) {
    // darken / warm the face texture towards the drawn complexion
    // (linear-space multiplier: 0.5 reads as roughly 25% darker on screen)
    const v = o.ethnicity === 'af' ? 0.3 + rng() * 0.14 : o.base === 'rb_female' ? 0.42 + rng() * 0.12 : 0.72 + rng() * 0.2;
    const warm = (1 - v) * 0.6; // darker skin also gets a little warmer
    o.skinMul = new THREE.Color(v * (1 + warm * 0.15 + (rng() - 0.5) * 0.04), v * (1 - warm * 0.05), v * (1 - warm * 0.3 - rng() * 0.04));
    o.hair = rb.hair; o.hairStyle = 'none'; o.beard = false;
    if (o.base === 'rb_female' && o.hat === 'cap') o.hat = 'none'; // caps float on her long hair
    if (o.base === 'rb_male_a') { o.hat = 'none'; o.hood = false; if (o.mask === 'balaclava') o.mask = 'black'; } // his afro stays visible
    o.keepTop = !o.garment || rng() < 0.4;
    o.keepBottom = rng() < 0.5; o.keepShoes = rng() < 0.6;
    if (o.keepTop && !o.garment) { o.topColor = rb.top; o.pattern = 0; }
    if (o.keepBottom) o.pants = rb.pants;
    if (o.keepShoes) o.shoes = rb.shoes;
    if (o.base === 'rb_female' && o.garment === 'shirt' && rng() < 0.5) { o.garment = null; o.keepTop = true; o.topColor = rb.top; o.shellColor = undefined; o.shellPattern = 0; }
  }
}

// Build a rig. kind: 'civ' | 'police'. Uses skinned glTF humans when loaded,
// otherwise falls back to the procedural primitive rig below.
export function buildCharacter(world, outfit, kind = 'civ') {
  initShared(world);
  if (Humans.ready) return buildSkinned(outfit, kind);
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  const body = new THREE.Group(); // scaled container
  root.add(body);
  const s = outfit.height || 1;
  body.scale.set((outfit.build || 1) * s, s, s);
  const meshes = [];
  const mk = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = false; parent.add(m); meshes.push(m); return m; };

  const police = kind === 'police';
  const skin = colMat(outfit.skin || 0xd0a080);
  const topMat = police ? colMat(0x1a2233, { roughness: 0.7 }) : outfit.vest ? colMat(0xd8ec1a, { roughness: 0.6 }) : outfit.top === 'psg' ? M.psg[outfit.psg] : colMat(outfit.topColor);
  const sleeveMat = police ? colMat(0x1a2233, { roughness: 0.7 }) : outfit.top === 'psg' ? colMat(0x132447, { roughness: 0.6 }) : colMat(outfit.topColor);
  const pantsMat = police ? colMat(0x161c29) : colMat(outfit.pants);
  const shoeMat = police ? colMat(0x0b0b0b, { roughness: 0.5 }) : colMat(outfit.shoes);
  const armour = colMat(0x10141c, { roughness: 0.45, metalness: 0.2 });

  const hips = new THREE.Group(); hips.position.y = 0.93; body.add(hips);
  mk(G.pelvis, pantsMat, hips);
  const spine = new THREE.Group(); spine.position.y = 0.06; hips.add(spine);
  mk(police ? G.torsoBig : G.torso, police ? M.vest : topMat, spine);
  const neck = new THREE.Group(); neck.position.y = 0.53; spine.add(neck);
  mk(G.neck, skin, neck);
  const head = new THREE.Group(); head.position.y = 0.05; neck.add(head);
  mk(G.head, skin, head);

  if (police) {
    mk(G.helmet, colMat(0x0e1420, { roughness: 0.25, metalness: 0.4 }), head);
    const v = mk(G.visor, M.visor, head); v.castShadow = false;
    mk(G.scarf, colMat(0x111111), neck);
  } else {
    if (outfit.hood) mk(G.hood, colMat(outfit.topColor), head);
    else if (outfit.hat === 'cap') { mk(G.cap, colMat(outfit.hatColor), head); mk(G.brim, colMat(outfit.hatColor), head); }
    else if (outfit.hat === 'beanie') mk(G.cap, colMat(outfit.hatColor), head);
    else mk(G.hair, colMat(outfit.hair), head);
    if (outfit.mask === 'black') mk(G.mask, colMat(0x0c0c0c), head);
    else if (outfit.mask === 'white') mk(G.mask, colMat(0xdde3e6), head);
    if (outfit.scarf === 'keffiyeh') mk(G.scarf, M.keffiyeh, neck);
    else if (outfit.scarf === 'psg') mk(G.scarf, colMat(0xd4202f), neck);
  }
  if (outfit.backpack) mk(G.backpack, colMat(0x1d1f22), spine);

  const arm = (side) => {
    const sh = new THREE.Group(); sh.position.set(side * (police ? 0.25 : 0.235), 0.47, 0); spine.add(sh);
    mk(police ? G.upperArmBig : G.upperArm, sleeveMat, sh);
    if (police) { const p = mk(G.pad, armour, sh); p.position.set(side * 0.02, 0.0, 0); }
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    mk(G.forearm, outfit.longSleeve || police ? sleeveMat : skin, el);
    const hand = new THREE.Group(); hand.position.y = -0.27; el.add(hand);
    mk(G.hand, police ? colMat(0x0b0b0b) : skin, hand);
    return { sh, el, hand };
  };
  const L = arm(1), Rr = arm(-1);
  const leg = (side) => {
    const hip = new THREE.Group(); hip.position.set(side * 0.1, -0.04, 0); hips.add(hip);
    mk(G.thigh, pantsMat, hip);
    const kn = new THREE.Group(); kn.position.y = -0.44; hip.add(kn);
    mk(G.shin, pantsMat, kn);
    if (police) mk(G.shinGuard, armour, kn);
    const ft = new THREE.Group(); ft.position.y = -0.42; kn.add(ft);
    mk(G.foot, shoeMat, ft);
    return { hip, kn, ft };
  };
  const LL = leg(1), RL = leg(-1);

  const rig = {
    root, body, hips, spine, neck, head,
    shL: L.sh, elL: L.el, handL: L.hand, shR: Rr.sh, elR: Rr.el, handR: Rr.hand,
    hipL: LL.hip, knL: LL.kn, hipR: RL.hip, knR: RL.kn,
    meshes, pose: newPose(), item: null, itemType: 'none', phase: Math.random() * 6.28,
  };

  // hostile threat ring
  const ring = new THREE.Mesh(G.ring, M.ring);
  ring.visible = false; ring.renderOrder = 2;
  root.add(ring);
  rig.ring = ring;
  return rig;
}

// ---------------------------------------------------------------- skinned
let HG = null;
function hairGeo() {
  if (HG) return HG;
  const sphere = (r, phi, sx, sy, sz, ty, tz) => { const g = new THREE.SphereGeometry(r, 18, 12, 0, Math.PI * 2, 0, phi); g.scale(sx, sy, sz); g.translate(0, ty, tz); return g; };
  HG = {
    short: sphere(0.104, Math.PI * 0.52, 0.94, 0.98, 1.06, 0.022, -0.012),
    buzz: sphere(0.1, Math.PI * 0.47, 0.93, 0.95, 1.04, 0.028, -0.008),
    curly: (() => { const g = new THREE.IcosahedronGeometry(0.115, 2); g.scale(0.95, 0.85, 1.05); g.translate(0, 0.04, -0.015); return g; })(),
    cap: sphere(0.108, Math.PI * 0.5, 0.96, 0.9, 1.06, 0.032, -0.006),
    brim: (() => { const g = new THREE.CylinderGeometry(0.1, 0.1, 0.012, 16, 1, false, -Math.PI * 0.5, Math.PI); g.translate(0, 0.035, 0.07); return g; })(),
    beanie: sphere(0.112, Math.PI * 0.56, 0.97, 1.08, 1.06, 0.02, -0.01),
    balaclava: (() => { const g = new THREE.SphereGeometry(0.109, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.4); g.scale(0.97, 1.02, 1.08); g.translate(0, 0.03, -0.008); return g; })(),
    balaclavaBack: (() => { const g = new THREE.SphereGeometry(0.107, 18, 10, Math.PI * 0.6, Math.PI * 0.8, Math.PI * 0.35, Math.PI * 0.55); g.scale(0.98, 1.05, 1.08); return g; })(),
    hood: (() => { const g = new THREE.SphereGeometry(0.135, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.66); g.scale(1, 1.05, 1.12); g.translate(0, 0.0, -0.035); return g; })(),
    mask: (() => { const g = new THREE.SphereGeometry(0.1, 16, 8, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.52, Math.PI * 0.3); g.scale(1.0, 1.05, 1.08); return g; })(),
    scarf: (() => { const g = new THREE.TorusGeometry(0.075, 0.03, 8, 18); g.rotateX(Math.PI / 2); g.scale(1.05, 1, 1.1); return g; })(),
    pack: (() => { const g = new THREE.BoxGeometry(0.3, 0.38, 0.15, 2, 2, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); p.setZ(i, z * (1 - Math.abs(p.getY(i)) * 0.6)); } g.computeVertexNormals(); return g; })(),
    patch: new THREE.PlaneGeometry(0.26, 0.08),
  };
  return HG;
}
const fabric = (hex, rough = 0.95) => colMat(hex, { roughness: rough });

function buildSkinned(outfit, kind) {
  const police = kind === 'police';
  let rig;
  const H = hairGeo();
  if (police) {
    rig = createHuman('soldier', { height: outfit.height || 1.0, build: outfit.build || 1 }, { style: 1, idle: 'idle2' });
    const back = new THREE.Mesh(H.patch, M.policeText);
    back.position.set(0, 0.08, -0.17); back.rotation.y = Math.PI; back.scale.setScalar(1.25);
    rig.chest.add(back);
    const front = new THREE.Mesh(H.patch, M.policeText);
    front.position.set(0.07, 0.06, 0.17); front.scale.setScalar(0.5);
    rig.chest.add(front);
  } else {
    const female = outfit.gender === 'f';
    rig = createHuman(outfit.base || (female ? 'michelle' : 'male'), outfit);
    const rbBody = /^rb_/.test(rig.kind);
    const add = (geo, mat, parent, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; parent.add(m); rig.meshes.push(m); return m; };
    if (!female) {
      if (outfit.hood) { const h = add(H.hood, fabric(outfit.topColor), rig.head); if (rbBody) { h.rotation.x = -0.45; h.position.set(0, 0.012, -0.02); } }
      else if (outfit.hat === 'cap') { add(H.cap, fabric(outfit.hatColor, 0.8), rig.head); add(H.brim, fabric(outfit.hatColor, 0.8), rig.head); }
      else if (outfit.hat === 'beanie') add(H.beanie, fabric(outfit.hatColor), rig.head);
      else if (outfit.hairStyle !== 'none' && !rbBody) add(H[outfit.hairStyle] || H.short, M.hair[outfit.hairIdx], rig.head);
    } else {
      if (outfit.hat === 'cap') { const k = rbBody ? 1.04 : 1.12; const c = add(H.cap, fabric(outfit.hatColor, 0.8), rig.head); c.scale.setScalar(k); const b = add(H.brim, fabric(outfit.hatColor, 0.8), rig.head); b.scale.setScalar(k); }
      else if (outfit.hood) { const h = add(H.hood, fabric(0x111214), rig.head); h.scale.setScalar(1.15); if (rbBody) { h.rotation.x = -0.62; h.position.set(0, 0.03, -0.05); } }
      else if (outfit.headscarf) {
        const h = add(H.hood, fabric(outfit.headscarf), rig.head); h.scale.set(1.2, 1.18, 1.18);
        if (rbBody) { h.rotation.x = -0.62; h.position.set(0, 0.03, -0.05); }
        const d = add(H.scarf, fabric(outfit.headscarf), rig.chest); d.position.set(0, 0.17, 0.0); d.scale.set(1.35, 1.6, 1.35);
      }
    }
    if (outfit.mask !== 'none') {
      const mc = { black: 0x0b0b0c, balaclava: 0x0b0b0c, surgical: 0x9ec9de, white: 0xdfe4e6 }[outfit.mask];
      const mm = add(H.mask, outfit.mask === 'keffiyeh' ? M.keffiyeh : fabric(mc ?? 0xdfe4e6, mc === 0x0b0b0c ? 0.95 : 0.9), rig.head, false);
      if (female) mm.scale.setScalar(1.08);
      if (rbBody) mm.position.set(0, female ? -0.05 : -0.045, 0.012); // Rocketbox faces sit lower in the head socket
      if (outfit.mask === 'surgical') mm.scale.set(0.97, 0.85, 1.02);
      // balaclava: knitted cover over the crown and back of the head, leaving an eye slot
      if (outfit.mask === 'balaclava' && !outfit.hood) { for (const geo of [H.balaclava, H.balaclavaBack]) { const b = add(geo, fabric(0x0b0b0c), rig.head); if (female) b.scale.setScalar(1.08); } }
    }
    if (outfit.scarf !== 'none') {
      const sc = add(H.scarf, outfit.scarf === 'keffiyeh' ? M.keffiyeh : fabric(outfit.scarf === 'psg' ? 0x132447 : 0x7a1d1d), rig.chest);
      sc.position.set(0, female ? 0.17 : 0.22, 0.005);
    }
    if (outfit.backpack) {
      const p = add(H.pack, fabric(outfit.packColor || 0x1d1f22, 0.8), rig.chest);
      p.position.set(0, -0.02, -0.19);
    }
  }
  const ring = new THREE.Mesh(G.ring, M.ring);
  ring.visible = false; ring.renderOrder = 2;
  rig.root.add(ring);
  rig.ring = ring;
  rig.pose = newPose();
  return rig;
}

export function addPoliceGear(rig) {
  // baton in right hand
  const baton = new THREE.Group();
  const b = new THREE.Mesh(G.baton, colMat(0x0a0a0a, { roughness: 0.4 })); b.castShadow = true;
  const h = new THREE.Mesh(G.batonHandle, colMat(0x0a0a0a, { roughness: 0.4 }));
  baton.add(b, h);
  baton.position.set(0, -0.07, 0.02);
  baton.rotation.x = rig.skinned ? -1.0 : 1.15; // extends from the fist (thumb side)
  rig.gripR = true;
  rig.handR.add(baton);
  rig.baton = baton;
  // shield on the torso (blended between carry and block positions)
  const shield = new THREE.Mesh(G.shield, M.shield);
  shield.renderOrder = 3;
  rig.spine.add(shield);
  rig.shield = shield;
  rig.shieldBlend = 0;
  updateShield(rig, 0);
}

export function updateShield(rig, k) {
  const s = rig.shield; if (!s) return;
  if (rig.skinned) {
    // carry: slung on the left side; block: raised in front of the chest
    s.position.set(0.36 * (1 - k) + 0.1 * k, 0.0 * (1 - k) + 0.36 * k, 0.02 * (1 - k) + 0.46 * k);
    s.rotation.set(0.05 * (1 - k) - 0.05 * k, (Math.PI / 2 - 0.12) * (1 - k) + 0.1 * k, 0);
    return;
  }
  // carry: hanging from left forearm at the side; block: raised in front of chest
  s.position.set(0.34 * (1 - k) + 0.08 * k, -0.02 * (1 - k) + 0.3 * k, 0.04 * (1 - k) + 0.42 * k);
  s.rotation.set(0.05 * (1 - k), (Math.PI / 2 - 0.15) * (1 - k) + 0.12 * k, 0);
}

// Improvised-shield placement in the spine frame (+z forward, +x the character's left):
// [position, rotation]. Large, clear differences so the open state reads at a glance.
export const SHIELD_POSE = {
  guard: [new THREE.Vector3(0.1, 0.28, 0.36), new THREE.Euler(0, 0, 0)],
  wind: [new THREE.Vector3(0.22, 0.34, 0.18), new THREE.Euler(0, 0.6, 0)],
  strike: [new THREE.Vector3(0.04, 0.34, 0.62), new THREE.Euler(-0.1, 0, 0)],
  open: [new THREE.Vector3(0.36, -0.08, 0.2), new THREE.Euler(1.0, 0.5, 0.5)],
};

export function giveItem(rig, type, rng = Math.random, variant = 'pal') {
  initShared();
  clearItem(rig);
  const g = new THREE.Group();
  rig.itemType = type;
  rig.itemVariant = type === 'frflag' ? 'fr' : type === 'flag' || type === 'bigflag' ? variant : null; // which flag (used by the dev appearance audit)
  if (type === 'flag' || type === 'frflag') {
    g.add(new THREE.Mesh(G.pole, colMat(0x6a5a40)));
    const v = type === 'frflag' ? 'fr' : variant;
    const cloth = new THREE.Mesh(G.flag, v === 'fr' ? M.frFlag : v === 'uni' ? M.uniFlag : v === 'alg' ? M.algFlag : M.palFlag);
    cloth.position.set(0, -0.76, 0); cloth.rotation.x = Math.PI; // local -Y is 'up' when the arm is raised
    g.add(cloth);
    rig.handR.add(g);
  } else if (type === 'bigflag') {
    g.add(new THREE.Mesh(G.bigPole, colMat(0x3a3a3a)));
    const cloth = new THREE.Mesh(G.bigFlag, variant === 'fr' ? M.frFlagBig : variant === 'uni' ? M.uniFlagBig : variant === 'alg' ? M.algFlagBig : M.palFlagBig);
    cloth.position.set(0, -2.25, 0); cloth.rotation.x = Math.PI;
    g.add(cloth);
    g.position.set(0, 0.25, 0); // hands lower on the pole
    rig.handR.add(g);
  } else if (type === 'placard') {
    g.add(new THREE.Mesh(G.pole, colMat(0x8a6a45)));
    const m = M.placards[Math.floor(rng() * M.placards.length)];
    // two back-to-back boards so the text reads from the front and behind when the arm is raised
    const front = new THREE.Mesh(G.placard, m); front.position.set(0, -0.92, -0.01); front.rotation.set(0, Math.PI, Math.PI);
    const back = new THREE.Mesh(G.placard, m); back.position.set(0, -0.92, 0.01); back.rotation.set(0, 0, Math.PI);
    g.add(front, back);
    rig.handR.add(g);
  } else if (type === 'phone') {
    const p = new THREE.Mesh(G.phone, M.phoneScreen);
    p.position.set(0, -0.09, 0.04); p.rotation.x = -0.3;
    g.add(p);
    rig.handR.add(g);
  } else if (type === 'banner') {
    const m = M.banners[Math.floor(rng() * M.banners.length)];
    const b = new THREE.Mesh(G.banner, m); b.castShadow = true;
    b.position.set(0, 0.32, 0.5);
    g.add(b);
    const p1 = new THREE.Mesh(G.pole, colMat(0x8a6a45)); p1.position.set(1.15, 0.9, 0.5); g.add(p1);
    const p2 = new THREE.Mesh(G.pole, colMat(0x8a6a45)); p2.position.set(-1.15, 0.9, 0.5); g.add(p2);
    rig.spine.add(g);
  } else if (type === 'bottle') {
    const bt = new THREE.Mesh(G.bottle, M.bottle);
    const rag = new THREE.Mesh(G.rag, M.rag);
    g.add(bt, rag);
    g.position.set(0, -0.1, 0.03); g.rotation.x = Math.PI; // neck pointing along the forearm
    rig.handR.add(g);
    rig.wick = new THREE.Object3D(); rig.wick.position.set(0, 0.2, 0); g.add(rig.wick);
  } else if (type === 'camera') {
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.08), colMat(0x111111, { roughness: 0.4 }));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.09, 12), colMat(0x1a1a1a, { roughness: 0.25, metalness: 0.6 }));
    lens.rotation.x = Math.PI / 2; lens.position.set(0, 0, 0.08);
    cam.add(lens);
    cam.position.set(-0.04, -0.06, 0.06);
    g.add(cam);
    rig.handR.add(g);
  } else if (type === 'loot') {
    // held in both arms against the chest
    const it = G.loot[Math.floor(rng() * G.loot.length)];
    g.add(new THREE.Mesh(it.geo, colMat(it.color, { roughness: 0.7 })));
    g.position.set(0, rig.skinned ? 0.27 : 0.25, rig.skinned ? 0.28 : 0.28);
    rig.spine.add(g);
  } else if (type === 'flare') {
    // lit road flare: red emissive tip (picked up by the bloom); sparks are spawned by the holder's script
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), colMat(0x8a1010, { roughness: 0.6 }));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff5040, emissive: 0xff2a10, emissiveIntensity: 9 }));
    tip.position.y = -0.17;
    g.add(stick, tip);
    g.position.set(0, -0.06, 0.03);
    rig.handR.add(g);
    rig.flareTip = tip;
  } else if (type === 'impshield') {
    // improvised shield on the left hand: a plywood board, a torn-down road sign or a bin lid
    const s = new THREE.Group();
    if (variant === 'sign') {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.02, 24), colMat(0xc8161d, { roughness: 0.5, metalness: 0.3 }));
      disc.rotation.x = Math.PI / 2;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.025), colMat(0xf2f2f2, { roughness: 0.5 }));
      bar.position.z = 0.004;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), colMat(0x8a8f94, { roughness: 0.4, metalness: 0.6 }));
      pole.position.set(0, -0.55, -0.02);
      s.add(disc, bar, pole);
    } else if (variant === 'heavy') {
      // the Enforcer's reinforced shield: a steel plate bolted to a board, with straps
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.12, 0.04), colMat(0x3a3d42, { roughness: 0.55, metalness: 0.5 }));
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.07, 0.06), colMat(0x1d1f22, { roughness: 0.6, metalness: 0.4 }));
      band.position.set(0, 0.32, 0.02);
      const band2 = band.clone(); band2.position.y = -0.32;
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), colMat(0x0a0a0a));
      slit.position.set(0, 0.42, 0.02);
      s.add(plate, band, band2, slit);
    } else if (variant === 'door') {
      // the Leader's shield: a car door torn off a burnt-out car
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.62, 0.06), colMat(0x5a1a18, { roughness: 0.45, metalness: 0.4 }));
      panel.position.y = -0.12;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.38, 0.04), colMat(0x121212, { roughness: 0.3, metalness: 0.5 }));
      frame.position.y = 0.36;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), colMat(0x8a8f94, { metalness: 0.7, roughness: 0.3 }));
      handle.position.set(-0.28, 0.0, 0.04);
      s.add(panel, frame, handle);
    } else if (variant === 'lid') {
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.78, 0.05), colMat(0xd8b52a, { roughness: 0.7 }));
      const lip = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 0.09), colMat(0xc8a520, { roughness: 0.7 }));
      lip.position.set(0, 0.39, 0.02);
      s.add(lid, lip);
    } else {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.86, 0.025), colMat(0xa8835a, { roughness: 0.95 }));
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.04), colMat(0x6a5038, { roughness: 0.95 }));
      slat.position.set(0, 0.2, 0.02);
      const slat2 = slat.clone(); slat2.position.y = -0.22;
      s.add(board, slat, slat2);
    }
    // carried across the body in front of the torso; the crowd moves it per state
    // (raised guard, drawn back, driven forward, dropped during the recovery)
    g.add(s);
    g.position.copy(SHIELD_POSE.guard[0]);
    rig.spine.add(g);
  } else if (type === 'stone') {
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06), colMat(0x6a6660));
    st.position.set(0, -0.1, 0.03); g.add(st);
    rig.handR.add(g);
  }
  rig.item = g;
  rig.gripR = !!rig.baton || !!rig.axe || ['flag', 'frflag', 'bigflag', 'placard', 'phone', 'bottle', 'stone', 'camera', 'loot', 'flare'].includes(type);
  rig.gripL = type === 'bigflag' || type === 'loot' || type === 'impshield';
  g.traverse((o) => { if (o.isMesh) o.castShadow = type === 'banner' || type === 'placard' || type === 'bigflag' || type === 'loot' || type === 'impshield'; });
  return g;
}

// The Leader's fire axe, held in the right hand alongside his shield (it is not the
// rig's single 'item' slot). Oriented like the police baton: extends from the fist.
export function attachFireAxe(rig) {
  initShared();
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.92, 8), colMat(0x1a1a1a, { roughness: 0.5 }));
  handle.position.y = -0.34;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.2, 8), colMat(0xd8b52a, { roughness: 0.6 }));
  grip.position.y = 0.0;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.26), colMat(0xb81414, { roughness: 0.4, metalness: 0.4 }));
  head.position.set(0, -0.76, 0.06);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.08), colMat(0xc8ccd0, { roughness: 0.25, metalness: 0.8 }));
  blade.position.set(0, -0.76, 0.21);
  const pick = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 6), colMat(0xb81414, { roughness: 0.4, metalness: 0.4 }));
  pick.rotation.x = -Math.PI / 2; pick.position.set(0, -0.76, -0.13);
  g.add(handle, grip, head, blade, pick);
  g.rotation.x = rig.skinned ? -1.0 : 1.15;
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  rig.handR.add(g);
  rig.axe = g; rig.gripR = true;
  return g;
}
export function removeFireAxe(rig) { if (rig.axe) { rig.axe.parent && rig.axe.parent.remove(rig.axe); rig.axe = null; } }

// Compile the shaders of props that first appear mid-level (Level 2's shields and flare)
// while the level loads, so their first appearance does not stall a frame.
export function prewarmItems(renderer, scene, camera, types) {
  const holder = new THREE.Group();
  holder.position.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3));
  for (const [type, variant] of types) {
    const rig = { spine: new THREE.Group(), handL: new THREE.Group(), handR: new THREE.Group(), skinned: true };
    holder.add(rig.spine, rig.handL, rig.handR);
    if (type === 'axe') attachFireAxe(rig); else giveItem(rig, type, Math.random, variant);
  }
  scene.add(holder);
  renderer.compile(scene, camera);
  scene.remove(holder);
}

export function clearItem(rig) {
  if (rig.item) { rig.item.parent && rig.item.parent.remove(rig.item); rig.item = null; }
  rig.gripR = !!rig.baton || !!rig.axe; rig.gripL = false;
  rig.itemType = 'none'; rig.itemVariant = null; rig.flareTip = null;
  rig.wick = null;
}

// -------------------------------------------------------------------- poses
const KEYS = ['mouth', 'smile', 'brow', 'y', 'lean', 'spX', 'spY', 'spZ', 'hdX', 'hdY', 'shLX', 'shLY', 'shLZ', 'elL', 'shRX', 'shRY', 'shRZ', 'elR', 'hpLX', 'hpLZ', 'knL', 'hpRX', 'hpRZ', 'knR', 'tiltX', 'tiltZ', 'itemZ', 'itemX'];
export function newPose() { const p = {}; for (const k of KEYS) p[k] = 0; return p; }

// Locomotion + idle base layer. speed in m/s.
export function baseLayer(P, rig, speed, t, dt, combat = false) {
  const s = Math.min(1, speed / 6.5);
  rig.phase += dt * (speed * 1.75 + (speed > 0.15 ? 2.2 : 0));
  if (rig.skinned) {
    // locomotion comes from motion capture; only add a guarded stance
    rig.speed = speed;
    if (combat) { P.knL = P.knR = 0.18; P.hpLX = P.hpRX = -0.1; P.y = -0.025; P.spX = 0.08; }
    return;
  }
  const ph = rig.phase;
  const moving = speed > 0.15;
  const amp = moving ? 0.35 + s * 0.65 : 0;
  P.hpLX = -Math.sin(ph) * amp * 0.85;
  P.hpRX = Math.sin(ph) * amp * 0.85;
  P.knL = moving ? 0.1 + Math.max(0, -Math.cos(ph)) * amp * 1.5 : 0.04;
  P.knR = moving ? 0.1 + Math.max(0, Math.cos(ph)) * amp * 1.5 : 0.04;
  P.shLX = Math.sin(ph) * amp * 0.75;
  P.shRX = -Math.sin(ph) * amp * 0.75;
  P.elL = -0.25 - amp * 0.9;
  P.elR = -0.25 - amp * 0.9;
  P.shLZ = 0.07; P.shRZ = -0.07;
  P.y = moving ? -Math.abs(Math.cos(ph)) * 0.05 * amp + 0.015 * amp : Math.sin(t * 1.6 + rig.phase) * 0.004;
  P.spX = moving ? 0.06 + s * 0.22 : Math.sin(t * 1.3 + rig.phase) * 0.015;
  P.spY = moving ? Math.sin(ph) * 0.12 * amp : 0;
  P.hdX = -P.spX * 0.6;
  if (combat && !moving) { P.knL = P.knR = 0.25; P.hpLX = P.hpRX = -0.12; P.y = -0.04; P.spX = 0.12; }
}

// Apply target pose with smoothing.
export function applyPose(rig, P, dt, rate = 14) {
  const cur = rig.pose;
  const k = 1 - Math.exp(-dt * rate);
  for (const key of KEYS) cur[key] += (P[key] - cur[key]) * k;
  if (rig.skinned) { updateHuman(rig, cur, dt, rig.lodFull !== false); return; }
  const c = cur;
  rig.hips.position.y = 0.93 + c.y;
  rig.hips.rotation.x = c.lean;
  rig.spine.rotation.set(c.spX, c.spY, c.spZ);
  rig.head.rotation.set(c.hdX, c.hdY, 0);
  rig.shL.rotation.set(c.shLX, c.shLY, c.shLZ);
  rig.shR.rotation.set(c.shRX, c.shRY, c.shRZ);
  rig.elL.rotation.x = c.elL;
  rig.elR.rotation.x = c.elR;
  rig.hipL.rotation.set(c.hpLX, 0, c.hpLZ);
  rig.hipR.rotation.set(c.hpRX, 0, c.hpRZ);
  rig.knL.rotation.x = c.knL;
  rig.knR.rotation.x = c.knR;
  rig.root.rotation.x = c.tiltX;
  rig.root.rotation.z = c.tiltZ;
  if (rig.item && (rig.itemType === 'bigflag' || rig.itemType === 'flag' || rig.itemType === 'placard')) {
    rig.item.rotation.z = c.itemZ;
    rig.item.rotation.x = c.itemX;
  }
}

// Crouch helper (picking something up, kneeling)
export function crouch(P, k) {
  P.hpLX = P.hpRX = -1.2 * k;
  P.knL = P.knR = 2.0 * k;
  P.y = -0.36 * k;
  P.spX = 0.5 * k;
}

// Lying down: dir = +1 fall forward (face down), -1 fall backward.
export function lying(P, dir, k, t) {
  P.tiltX = dir * 1.5 * k;
  P.y = 0.05 * k - 0.0;
  P.spX = 0; P.spY = 0;
  P.shLZ = 0.9 * k; P.shRZ = -0.9 * k; P.shLX = -0.3 * k; P.shRX = 0.2 * k;
  P.elL = -0.5 * k; P.elR = -0.4 * k;
  P.hpLX = -0.15 * k; P.hpRX = 0.1 * k; P.hpLZ = 0.15 * k; P.hpRZ = -0.1 * k;
  P.knL = 0.3 * k; P.knR = 0.1 * k;
  P.hdX = -0.2 * dir * k + Math.sin(t * 2) * 0.03;
}

export function setRingVisible(rig, on, mat) {
  rig.ring.visible = on;
  if (on && mat) rig.ring.material = mat === 'amber' ? M.ringBlue : M.ring;
}

export function getShared() { return { G, M }; }
