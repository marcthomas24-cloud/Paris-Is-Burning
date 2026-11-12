// Body language: the layer that makes a rig read as a person rather than a posed figure.
//
// Everything here is added on top of the motion capture and the action poses (characters.js
// newPose / applyPose): breathing, weight shifting, fidgets, where someone is looking, leaning
// into a run or a turn, flinching, and how a body goes down and gets back up.
//
// Rules for this file:
//  - Pose only. It never moves anyone, changes a state or touches a timer the simulation reads.
//  - No Math.random. In seeded runs Math.random is the simulation's stream, so every difference
//    between people comes from a hash of their id and every change over time from the clock.
import { lying } from './characters.js';

const TAU = Math.PI * 2;
const fract = (x) => x - Math.floor(x);
export const hash = (a, b = 0) => fract(Math.sin(a * 127.1 + b * 311.7 + 17.3) * 43758.5453);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sstep = (x, a, b) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const wrap = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const mix = (P, key, v, k) => { P[key] += (v - P[key]) * k; };

// One person's habits, fixed for the life of the rig, plus the small state the layer keeps.
export function life(rig, id) {
  if (rig.life) return rig.life;
  const h = (k) => hash(id + 1, k);
  return (rig.life = {
    id, ph: h(1) * TAU,
    slouch: h(2) * 0.09 - 0.02,   // -0.02 (upright) .. 0.07 (round-shouldered)
    armOut: h(3) * 0.07,          // how far the arms are carried from the body
    breath: 1.5 + h(4) * 0.6,     // rad/s, about 14 to 20 breaths a minute
    shiftT: 7 + h(5) * 7,         // seconds between changes of standing leg
    fidgetT: 11 + h(6) * 10,      // seconds between fidgets
    side: h(7) < 0.5 ? -1 : 1,    // favoured standing leg
    h: null, s: 0, yaw: 0, acc: 0, // heading and speed last frame, smoothed turn rate and acceleration
    gy: 0, gx: 0,                  // where the head is turned (yaw, pitch)
    startle: 0, wary: 0, buddy: null, buddyT: 0,
  });
}

// A smooth 0..1 pulse that is 1 for `duty` of every `period` seconds, offset per person.
export function pulse(id, t, period, duty, salt = 0) {
  const f = fract(t / period + hash(id + 5, salt));
  const e = Math.min(0.08, duty * 0.4);
  return sstep(f, 0, e) * (1 - sstep(f, duty - e, duty));
}

// Moving bodies lean: forward when speeding up, back when stopping, into a turn, and a little
// further forward the faster they run. Posture differs per person.
export function motion(P, L, heading, speed, dt) {
  if (dt > 0) {
    if (L.h === null) { L.h = heading; L.s = speed; }
    const k = 1 - Math.exp(-dt * 6);
    L.yaw += (clamp(wrap(heading - L.h) / dt, -6, 6) - L.yaw) * k;
    L.acc += (clamp((speed - L.s) / dt, -12, 12) - L.acc) * k;
    L.h = heading; L.s = speed;
  }
  const m = sstep(speed, 0.3, 1.2);
  const bank = clamp(-L.yaw * speed * 0.018, -0.2, 0.2) * m;
  P.tiltZ += bank * 0.55; P.spZ += bank * 0.6;
  P.hdY += clamp(L.yaw * 0.07, -0.35, 0.35) * m; // the head leads the turn
  P.spX += clamp(L.acc * 0.022, -0.1, 0.16) + sstep(speed, 2.6, 5.5) * 0.07;
  P.spX += L.slouch * (1 - sstep(speed, 2.5, 4.5) * 0.5); P.hdX -= L.slouch * 0.4;
  P.shLZ += L.armOut; P.shRZ -= L.armOut;
}

// Breathing for everyone; `effort` 0..1 makes it faster and deeper (out of breath, hurt).
export function breathe(P, L, t, effort = 0) {
  const br = Math.sin(t * L.breath * (1 + effort * 1.6) + L.ph);
  const a = 0.012 + effort * 0.045;
  P.spX += br * a; P.hdX -= br * a * 0.5; P.y += br * 0.0025 * (1 + effort * 2);
  P.shLZ += br * a * 0.6; P.shRZ -= br * a * 0.6;
}

// Standing still: weight settles on one leg and changes over now and then; with free arms,
// the small things people do while they wait. k is how still they are (0 walking, 1 standing).
export function idle(P, L, t, k, arms = true) {
  if (k <= 0.01) return;
  const w = Math.tanh(2.5 * Math.sin(t * TAU / L.shiftT + L.ph * 2) + 0.8 * Math.sin(t * TAU / (L.shiftT * 2.7) + L.ph)) * k * L.side;
  const a = Math.abs(w);
  // w > 0: weight on the left leg, the right knee relaxes
  P.tiltZ -= 0.028 * w; P.spZ += 0.05 * w; P.spY += 0.04 * w + Math.sin(t * 0.23 + L.ph) * 0.03 * k; P.y -= 0.01 * a;
  if (w > 0) { P.knR += 0.17 * a; P.hpRX -= 0.085 * a; P.hpRZ -= 0.04 * a; }
  else { P.knL += 0.17 * a; P.hpLX -= 0.085 * a; P.hpLZ += 0.04 * a; }
  if (!arms) return;
  const c = t / L.fidgetT + L.ph, ci = Math.floor(c), f = c - ci;
  const g = Math.floor(hash(L.id + 3, ci) * 8);
  const dur = g === 2 || g === 5 ? 0.55 : 0.26; // hands on hips and folded arms are held longer
  const e = sstep(f, 0, 0.05) * (1 - sstep(f, dur - 0.05, dur)) * k;
  if (e <= 0.001) return;
  if (g === 0) { // glance at a watch or a phone in the left hand
    mix(P, 'shLX', -0.85, e); mix(P, 'elL', -1.7, e); mix(P, 'shLZ', -0.25, e); P.hdX += 0.32 * e; P.hdY += 0.15 * e;
  } else if (g === 1) { // rub the back of the neck
    mix(P, 'shRX', -2.2, e); mix(P, 'elR', -2.3 + Math.sin(t * 9) * 0.07, e); mix(P, 'shRZ', -0.35, e); P.hdX += 0.12 * e; P.hdY -= 0.2 * e;
  } else if (g === 2) { // hands on hips
    mix(P, 'shLZ', 0.55, e); mix(P, 'shRZ', -0.55, e); mix(P, 'shLX', 0.25, e); mix(P, 'shRX', 0.25, e); mix(P, 'elL', -1.15, e); mix(P, 'elR', -1.15, e);
  } else if (g === 3) { // look back over a shoulder
    P.hdY += 0.95 * L.side * e; P.spY += 0.3 * L.side * e;
  } else if (g === 4) { // rub the hands together
    const r = Math.sin(t * 7) * 0.06;
    mix(P, 'shLX', -0.75 + r, e); mix(P, 'shRX', -0.75 - r, e); mix(P, 'elL', -1.75, e); mix(P, 'elR', -1.75, e); mix(P, 'shLZ', -0.3, e); mix(P, 'shRZ', 0.3, e);
  } else if (g === 5) { // fold the arms
    mix(P, 'shLX', -0.55, e); mix(P, 'shRX', -0.55, e); mix(P, 'elL', -2.0, e); mix(P, 'elR', -2.0, e); mix(P, 'shLZ', -0.42, e); mix(P, 'shRZ', 0.42, e);
  } else if (g === 6) { // stretch the neck and shoulders
    P.hdX -= 0.28 * e; P.spX -= 0.09 * e; P.shLX += 0.3 * e; P.shRX += 0.3 * e; P.shLZ += 0.12 * e; P.shRZ -= 0.12 * e;
  } // 7: nothing, just stands
}

// Turn the head (and a little of the shoulders and the eyes) to a point. target: { x, z } with an
// optional eye height `ty`; w 0..1 is how much attention it gets. With no target, or one behind
// them, the gaze drifts about the street.
export function gaze(P, L, pos, heading, target, w, dt, t, ty = 1.6) {
  const drift = Math.sin(t * 0.21 + L.ph) * 0.32 + Math.sin(t * 0.53 + L.ph * 2) * 0.16;
  let wy = drift, wx = 0;
  if (target && w > 0) {
    const dx = target.x - pos.x, dz = target.z - pos.z;
    const rel = wrap(Math.atan2(dx, dz) - heading);
    if (Math.abs(rel) > 2.0) w = 0; // behind: they would have to turn round
    wy = clamp(rel, -1.25, 1.25) * w + drift * (1 - w);
    wx = clamp(-Math.atan2(ty - 1.6, Math.max(0.6, Math.hypot(dx, dz))), -0.45, 0.6) * w;
  }
  const r = 1 - Math.exp(-dt * (target && w > 0.5 ? 7 : 2.5));
  L.gy += (wy - L.gy) * r; L.gx += (wx - L.gx) * r;
  P.hdY += L.gy * 0.62; P.spY += L.gy * 0.2; P.hdX += L.gx; P.gzY = L.gy * 0.25;
}

// A start at a bang or a blow nearby: shoulders in, head ducked, knees soft. Set L.startle to 0..1.
export function startle(P, L, dt) {
  if (L.startle <= 0) return;
  const k = sstep(L.startle, 0, 0.5);
  L.startle = Math.max(0, L.startle - dt * 1.7);
  P.spX -= 0.14 * k; P.hdX += 0.24 * k; P.y -= 0.045 * k; P.knL += 0.22 * k; P.knR += 0.22 * k;
  mix(P, 'shLX', -0.7, k * 0.8); mix(P, 'shRX', -0.7, k * 0.8); mix(P, 'elL', -1.5, k * 0.8); mix(P, 'elR', -1.5, k * 0.8);
}

// Open hands raised between themselves and a threat, leaning back from it. k 0..1.
export function wary(P, k) {
  if (k <= 0.01) return;
  mix(P, 'shLX', -1.25, k); mix(P, 'shRX', -1.25, k); mix(P, 'elL', -1.5, k); mix(P, 'elR', -1.5, k);
  P.shLZ += 0.25 * k; P.shRZ -= 0.25 * k; P.spX -= 0.13 * k; P.y -= 0.02 * k; P.knL += 0.12 * k; P.knR += 0.12 * k;
}

// Hands that talk: small beats of a forearm while someone is speaking. k follows the mouth.
export function talk(P, L, t, k) {
  if (k <= 0.01) return;
  const b = Math.sin(t * 5.5 + L.ph) * 0.5 + 0.5;
  if (L.side > 0) { mix(P, 'shRX', -0.55 - b * 0.25, k); mix(P, 'elR', -1.35 - b * 0.35, k); P.shRZ -= 0.12 * k; }
  else { mix(P, 'shLX', -0.55 - b * 0.25, k); mix(P, 'elL', -1.35 - b * 0.35, k); P.shLZ += 0.12 * k; }
  P.hdX += Math.sin(t * 2.7 + L.ph) * 0.05 * k;
}

// Pressed in a crowd with no room to move (Level 4): forearms up across the chest to keep a
// space to breathe in, shoulders in, chin lifted and the head turning for air. k 0..1 follows
// the local density.
export function pressed(P, L, t, k) {
  if (k <= 0.01) return;
  const s = L.side, sway = Math.sin(t * 1.7 + L.ph);
  mix(P, 'shLX', -0.95, k); mix(P, 'shRX', -0.95, k); mix(P, 'elL', -2.15, k); mix(P, 'elR', -2.15, k);
  mix(P, 'shLZ', -0.38, k); mix(P, 'shRZ', 0.38, k);
  P.spX -= 0.07 * k; P.spZ += sway * 0.05 * k; P.y += 0.012 * k; // up on the toes
  P.hdX -= (0.2 + 0.08 * Math.sin(t * 0.9 + L.ph * 3)) * k;
  P.hdY += (Math.sin(t * 0.8 + L.ph) * 0.55 + s * 0.15) * k;
  if (P.mouth !== undefined) { P.mouth = Math.max(P.mouth, 0.35 * k); P.brow = -0.7 * k; P.smile = 0; }
}

// Walking hand in hand (Level 4's families). side: +1 the left hand, -1 the right. up: 0 an adult
// reaching down and a little out, 1 a child reaching up. k 0..1.
export function handHeld(P, side, up, k) {
  if (k <= 0.01) return;
  const sh = side > 0 ? 'shL' : 'shR', el = side > 0 ? 'elL' : 'elR';
  mix(P, sh + 'X', up ? -0.5 : 0.05, k); mix(P, sh + 'Z', side * (up ? 1.75 : 0.42), k); mix(P, el, up ? -0.25 : -0.12, k);
  if (!up) P.spZ += side * 0.04 * k; else P.hdY += side * 0.25 * k; // the child looks up at them now and then
}

// An older person's carriage: rounded back, head forward, short careful steps. k 0..1.
export function stooped(P, k) {
  if (k <= 0.01) return;
  P.spX += 0.2 * k; P.hdX -= 0.1 * k; P.y -= 0.025 * k; P.knL += 0.1 * k; P.knR += 0.1 * k;
  P.shLX += 0.08 * k; P.shRX += 0.08 * k;
}

// Walked along by someone: an arm over their shoulder, the weight on them, one leg dragging.
// side: +1 the helper is on their left. k 0..1.
export function supported(P, side, t, k) {
  if (k <= 0.01) return;
  const sh = side > 0 ? 'shL' : 'shR', el = side > 0 ? 'elL' : 'elR';
  mix(P, sh + 'X', -0.35, k); mix(P, sh + 'Z', side * 1.55, k); mix(P, el, -0.7, k);
  P.spZ += side * 0.2 * k; P.spX += 0.16 * k; P.hdX += 0.22 * k; P.y -= 0.05 * k;
  if (side > 0) P.knR += 0.3 * k; else P.knL += 0.3 * k;
  P.hdY += Math.sin(t * 0.6) * 0.1 * k;
}

// Reeling from a blow. back: struck from the front (driven backwards). st / dur: time in the stagger.
export function staggered(P, id, back, st, dur) {
  const b = back ? -1 : 1, v = (id + (back ? 1 : 0)) % 3;
  const u = clamp(st / Math.max(0.2, dur || 0.5), 0, 1), env = Math.sin(u * Math.PI);
  const step = Math.sin(st * 13), sl = Math.max(0, step), sr = Math.max(0, -step);
  P.spX = (0.22 + 0.3 * env) * b; P.hdX = 0.4 * b * (1 - u * 0.5); P.y = -0.05 * env;
  // two or three quick steps to stay upright
  P.hpLX = -0.42 * sl * b; P.knL = 0.22 + 0.4 * sl; P.hpRX = -0.42 * sr * b; P.knR = 0.22 + 0.4 * sr;
  P.spZ = Math.sin(st * 9 + id) * 0.09 * env;
  if (v === 0) { // arms thrown out for balance
    P.shLZ = 0.9; P.shRZ = -0.9; P.shLX = -0.6; P.shRX = -0.4; P.elL = P.elR = -0.6;
  } else if (v === 1) { // a hand goes to the head
    P.shRX = -2.3; P.elR = -2.2; P.shRZ = -0.3; P.shLZ = 0.7; P.shLX = -0.3; P.elL = -0.5; P.spY = 0.25; P.spZ += 0.15;
  } else { // folded over the ribs
    P.spX += 0.28; P.shLX = P.shRX = -0.5; P.elL = P.elR = -1.9; P.shLZ = -0.4; P.shRZ = 0.4; P.spY = -0.3;
  }
}

// Going down and lying there. dir: +1 face down, -1 on the back. st: seconds since the fall began.
// The legs give way first, the body follows, and nobody lands in quite the same heap.
export function fallen(P, id, dir, st, t) {
  const a = sstep(st, 0, 0.42);
  const buckle = sstep(st, 0, 0.16) * (1 - sstep(st, 0.24, 0.52));
  lying(P, dir, a, t);
  P.tiltZ = (hash(id, 10) - 0.5) * 0.5 * a;
  const v = id % 3, s = hash(id, 9) < 0.5 ? -1 : 1;
  if (v === 1) {
    if (dir < 0) { P.hpLX = -0.9 * a; P.knL = 1.5 * a; P.shRX = -2.4 * a; P.elR = -1.2 * a; P.hdY = 0.5 * s * a; } // a knee up, an arm thrown back
    else { P.knL = 0.9 * a; P.shLX = P.shRX = -2.6 * a; P.elL = P.elR = -1.6 * a; P.shLZ = 0.35 * a; P.shRZ = -0.35 * a; } // face down, arms round the head
  } else if (v === 2) {
    const draw = 0.5 + 0.22 * Math.sin(t * 0.9 + id); // knees slowly drawing up and easing
    if (dir < 0) { P.shLX = P.shRX = -1.6 * a; P.elL = P.elR = -2.3 * a; P.shLZ = -0.2 * a; P.shRZ = 0.2 * a; P.hpLX = P.hpRX = -draw * a; P.knL = P.knR = (0.6 + draw) * a; P.spY = 0.3 * s * a; } // hands to the face
    else { P.shLX = -2.3 * a; P.elL = -2.0 * a; P.shRX = -0.3 * a; P.knL = 0.5 * a; P.spY = 0.35 * s * a; }
  }
  // hurt, not still: a slow rock and a turning head
  P.spZ += Math.sin(t * 1.1 + id) * 0.05 * a; P.hdY += Math.sin(t * 0.7 + id * 1.3) * 0.22 * a;
  // the collapse itself: knees fold, arms come up
  P.knL += 1.1 * buckle; P.knR += 0.8 * buckle; P.hpLX -= 0.5 * buckle; P.hpRX -= 0.3 * buckle; P.y -= 0.2 * buckle;
  P.shLX -= 1.1 * buckle; P.shRX -= 0.8 * buckle;
}

// Getting up: the torso comes off the ground onto one knee, a hand on the thigh, then the legs
// straighten with the head still hanging and a moment of unsteadiness. k 0..1.
export function rising(P, id, dir, k, t) {
  const up = sstep(k, 0, 0.5), stand = sstep(k, 0.5, 1), cr = up * (1 - stand);
  lying(P, dir, 1 - up, t);
  P.tiltX = dir * 1.5 * (1 - up);
  P.hpLX = -1.25 * cr; P.knL = 2.0 * cr; P.hpRX = -0.7 * cr; P.knR = 2.1 * cr;
  P.y = -0.36 * cr + 0.05 * (1 - up);
  P.spX = 0.55 * cr + 0.12 * stand * (1 - stand) * 4;
  P.shLX = -0.9 * cr - 0.3 * (1 - up); P.elL = -0.6 * cr; P.shRX = -0.5 * cr - 0.3 * (1 - up); P.elR = -0.4 * cr;
  P.shLZ = 0.15 * (1 - stand); P.shRZ = -0.15 * (1 - stand);
  P.hdX = 0.35 * (1 - stand);
  P.spZ = Math.sin(k * 9 + id) * 0.07 * stand * (1 - stand) * 4;
}
