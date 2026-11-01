// Levels: per-level configuration, lighting presets and progression.
//  Level 1 · the existing mission (Missions), late afternoon.
//  Level 2 · the same boulevard later that night (Level2), pushing back down
//            the boulevard from Rue Oberkampf. Increment 1 lays out its route only.
// Lighting presets only change colours, intensities, fog and uniforms; they
// never add or remove lights, so switching does not recompile any shaders.
import { Missions, PHASES } from './missions.js';
import { Level2, L2_PHASES } from './level2.js';
import { Level3, L3_PHASES, L3_CROWD, L3_EVENTS } from './level3.js';
import { DISTRICT } from './district.js';

export const LIGHTING = {
  // the original look, values unchanged
  dusk: {
    hemiSky: 0xc4c6ca, hemiGround: 0x5a5044, hemiI: 1.7,
    sunColor: 0xffd6a8, sunI: 2.4, sunOffset: [-30, 70, -38],
    exposure: 1.15, baseFog: 0.0088, fogA: 0x7f786f, fogB: 0x6e6258,
    sky: { horizon: [0.62, 0.56, 0.50], low: [0.50, 0.47, 0.45], top: [0.24, 0.27, 0.31], glow: [0.9, 0.55, 0.28], glowK: 0.45, haze: [0.38, 0.33, 0.30] },
    lamp: 0.4, beaconOn: 14, beaconOff: 2, fireLight: 1, puddleEnv: 0.32, smokeTint: [1, 1, 1],
  },
  // night: cool moonlight fill, sodium lamps, fire and beacons do the lighting.
  // Kept bright enough that silhouettes read against the street (gameplay first).
  night: {
    hemiSky: 0x4a5a80, hemiGround: 0x2a2018, hemiI: 1.05,
    sunColor: 0x9db4e8, sunI: 0.75, sunOffset: [26, 70, -30],
    exposure: 1.3, baseFog: 0.0105, fogA: 0x23262e, fogB: 0x3a2c22,
    sky: { horizon: [0.20, 0.13, 0.09], low: [0.08, 0.08, 0.10], top: [0.02, 0.03, 0.05], glow: [0.75, 0.32, 0.12], glowK: 0.35, haze: [0.16, 0.10, 0.07] },
    lamp: 3.2, beaconOn: 24, beaconOff: 3, fireLight: 1.7, puddleEnv: 0.5, smokeTint: [0.42, 0.39, 0.38],
  },
  // Level 3: later the same night, a large square. Cooler and a little clearer than `night`,
  // so the far side of the square and its landmarks still read through the haze.
  night3: {
    hemiSky: 0x52648c, hemiGround: 0x2a2420, hemiI: 1.15,
    sunColor: 0xa6bce8, sunI: 0.8, sunOffset: [26, 70, -30],
    exposure: 1.35, baseFog: 0.0092, fogA: 0x252a34, fogB: 0x3a2e26,
    sky: { horizon: [0.17, 0.14, 0.13], low: [0.08, 0.09, 0.12], top: [0.02, 0.03, 0.06], glow: [0.55, 0.28, 0.14], glowK: 0.28, haze: [0.14, 0.12, 0.11] },
    lamp: 3.6, beaconOn: 26, beaconOff: 3, fireLight: 1.5, puddleEnv: 0.6, smokeTint: [0.44, 0.42, 0.42],
  },
};

export const LEVELS = {
  1: {
    id: 1, name: 'BOULEVARD DE LA RÉPUBLIQUE', tag: 'Boulevard de la République · 18h47',
    Missions, phases: PHASES, lighting: 'dusk',
    start: { x: 0.5, z: 141, heading: Math.PI },
  },
  2: {
    id: 2, name: 'NUIT', tag: 'Boulevard de la République · 01h12',
    Missions: Level2, phases: L2_PHASES, lighting: 'night', hazardDir: 1,
    policeOff: ['injured', 'guard'], // the cut-off officers were extracted at the end of Level 1
    reserveCrews: true,              // extra looting crews along the Level 2 route
    music: true,                     // synthesised score (music.js); Level 1 keeps its original soundscape
    start: { x: -1.5, z: -100, heading: 0 },
  },
  // The escort mission (Level3), with the Fixer's fight. Completing Level 2 unlocks it.
  3: {
    id: 3, name: 'THE BREAKOUT', tag: 'Place du Château-d\'Eau · 02h20',
    Missions: Level3, phases: L3_PHASES, lighting: 'night3', hazardDir: 1,
    policeOff: ['injured', 'guard'], reserveCrews: true, districtCrews: true, music: true, musicTheme: 'l3',
    start: { x: 4.2, z: 170.5, heading: 0 }, bounds: DISTRICT.bounds, // beside the transfer van, south of the CRS vans parked across the lane
    district: 'l3', cordonOpen: true, brawls: false,
    crowdLayout: L3_CROWD, events: L3_EVENTS, sirenLanes: [240, 395, 470],
  },
};

// Unlocks persist on this device. Storage can be unavailable (private windows,
// blocked site data), so every access is guarded and failure means "locked".
const KEY = 'parisBurning.progress.v1';
export const Progress = {
  _read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } },
  _write(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* not persisted */ } },
  unlocked(id) { return id === 1 || !!(this._read().unlocked || {})[id]; },
  unlock(id) { if (!LEVELS[id]) return; const p = this._read(); p.unlocked = { ...(p.unlocked || {}), [id]: true }; this._write(p); },
  reset() { this._write({}); },
};
