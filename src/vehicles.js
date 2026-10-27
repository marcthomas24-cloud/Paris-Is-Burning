// Procedural vehicles: side-profile bodies extruded with rounded edges and real
// wheel-arch cut-outs, a glasshouse with pillars and windows, wheels with rims,
// bumpers, grille, lights, plates and mirrors. Parts are returned in vehicle space
// (front towards +z, ground at y = 0) as [materialKey, indexed geometry] pairs so
// the world can merge them into its per-material batches.
import * as THREE from 'three';

// Car types, loosely after common French cars (city car, hatchback, saloon, estate).
const CAR_TYPES = {
  city: { L: 3.65, W: 1.66, wb: 2.36, fo: 0.68, H: 1.5, hood: 0.72, ws: 0.72, belt: 0.95, wr: 0.29, tail: 'hatch', roofRear: 0.5 },
  hatch: { L: 4.05, W: 1.76, wb: 2.56, fo: 0.84, H: 1.46, hood: 0.92, ws: 0.78, belt: 0.93, wr: 0.31, tail: 'hatch', roofRear: 0.58 },
  sedan: { L: 4.6, W: 1.8, wb: 2.72, fo: 0.92, H: 1.44, hood: 1.12, ws: 0.82, belt: 0.92, wr: 0.32, tail: 'sedan', roofRear: 1.2 },
  estate: { L: 4.6, W: 1.8, wb: 2.75, fo: 0.9, H: 1.5, hood: 1.05, ws: 0.8, belt: 0.93, wr: 0.32, tail: 'estate', roofRear: 0.22 },
};
const CAR_WEIGHTS = [['hatch', 0.4], ['city', 0.25], ['sedan', 0.2], ['estate', 0.15]];

// Deterministic per-position choice: vehicles must not draw from the world's random
// stream, so the rest of the street layout stays exactly where it was.
export function hash2(x, z) { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }
export function carTypeAt(x, z) {
  let r = hash2(x, z), acc = 0;
  for (const [k, w] of CAR_WEIGHTS) { acc += w; if (r < acc) return k; }
  return 'hatch';
}

const BT = 0.06, BS = 0.05; // bevel thickness (across) and size (in profile)

function indexed(g) {
  if (!g.index) { const n = g.attributes.position.count; const idx = new Array(n); for (let i = 0; i < n; i++) idx[i] = i; g.setIndex(idx); }
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  return g;
}

// Extrude a side profile (shape x = length axis z, shape y = height) across a width, centred on x = 0.
function extrudeProfile(shape, width, bevel = true, curveSegments = 8) {
  const depth = Math.max(0.01, width - (bevel ? 2 * BT : 0));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel, bevelThickness: BT, bevelSize: BS, bevelSegments: 2, curveSegments });
  g.translate(0, 0, -depth / 2);
  g.rotateY(-Math.PI / 2); // shape x -> +z, extrusion -> x
  return indexed(g);
}

// Flat polygon on a vehicle side (points as [z, y]); side = -1 left, +1 right.
function sidePanel(pts, x, side) {
  const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ShapeGeometry(s);
  g.rotateY(-Math.PI / 2); // faces -x
  if (side > 0) {
    g.scale(-1, 1, 1);
    const idx = g.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  }
  g.translate(x * side, 0, 0);
  return indexed(g);
}

// Quad from four corners, wound to face `out`.
function quad(a, b, c, d, out) {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a));
  const P = n.dot(out) >= 0 ? [a, b, c, d] : [a, d, c, b];
  g.setAttribute('position', new THREE.Float32BufferAttribute(P.flatMap((p) => [p.x, p.y, p.z]), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  return g;
}

function box(w, h, d, x, y, z, rx = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  g.translate(x, y, z);
  return indexed(g);
}

function wheel(parts, x, z, r, w, burnt) {
  const side = Math.sign(x);
  if (!burnt) {
    const t = new THREE.CylinderGeometry(r, r, w, 18); t.rotateZ(Math.PI / 2); t.translate(x, r, z); parts.push(['tyre', indexed(t)]);
    const rim = new THREE.CylinderGeometry(r * 0.6, r * 0.6, w + 0.012, 10); rim.rotateZ(Math.PI / 2); rim.translate(x, r, z); parts.push(['rim', indexed(rim)]);
    const hub = new THREE.CylinderGeometry(r * 0.16, r * 0.16, w + 0.03, 8); hub.rotateZ(Math.PI / 2); hub.translate(x + side * 0.004, r, z); parts.push(['plastic', indexed(hub)]);
  } else {
    // tyres burnt away: the car sits on bare, rusted rims
    const rim = new THREE.CylinderGeometry(r * 0.66, r * 0.66, w * 0.8, 10); rim.rotateZ(Math.PI / 2); rim.translate(x, r * 0.66, z); parts.push(['rust', indexed(rim)]);
  }
}

// ---------------------------------------------------------------- cars
export function carParts(type, { body = 'cars:0', burnt = false } = {}) {
  const T = CAR_TYPES[type] || CAR_TYPES.hatch;
  const { L, W, wb, fo, H, hood, ws, belt, wr } = T;
  const f = L / 2, fa = f - fo, ra = fa - wb, ar = wr + 0.05, yb = 0.27;
  const sink = burnt ? wr * 0.34 : 0; // burnt-out shells sit on their rims
  const parts = [];
  const bodyMat = burnt ? 'charred' : body;
  const glassMat = burnt ? 'burntGlass' : 'glass';
  const cowl = f - hood;

  // lower body: sill, wheel arches, nose, bonnet, beltline, tail
  const s = new THREE.Shape();
  s.moveTo(-f + 0.06, yb + 0.1);
  s.lineTo(ra - ar - 0.02, yb);
  s.absarc(ra, wr, ar, Math.PI, 0, true);
  s.lineTo(fa - ar, yb);
  s.absarc(fa, wr, ar, Math.PI, 0, true);
  s.lineTo(f - 0.1, yb + 0.04);
  s.quadraticCurveTo(f + 0.02, yb + 0.08, f, 0.5);
  s.quadraticCurveTo(f, belt - 0.12, f - 0.2, belt - 0.1); // rounded nose
  s.lineTo(cowl, belt + 0.02);                               // bonnet rising to the windscreen
  s.lineTo(-f + 0.16, belt + 0.06);                          // beltline
  if (T.tail === 'sedan') s.quadraticCurveTo(-f, belt + 0.06, -f, belt - 0.12); // boot lid
  else s.quadraticCurveTo(-f + 0.02, belt + 0.04, -f, belt - 0.16);
  s.lineTo(-f + 0.02, 0.45);
  s.quadraticCurveTo(-f, yb + 0.12, -f + 0.06, yb + 0.1);
  parts.push([bodyMat, extrudeProfile(s, W)]);

  // glasshouse (body colour: pillars and roof)
  const Wc = W - 0.2;
  const roofF = cowl - ws, roofR = -f + T.roofRear;
  const rearBase = T.tail === 'sedan' ? -f + 0.86 : T.tail === 'estate' ? -f + 0.1 : -f + 0.16;
  const c = new THREE.Shape();
  c.moveTo(cowl + 0.02, belt - 0.03);
  c.lineTo(roofF, H - 0.05);
  c.quadraticCurveTo(roofF - 0.12, H, roofF - 0.3, H);
  c.quadraticCurveTo((roofF + roofR) / 2, H + 0.035, roofR + 0.15, H - 0.01);
  c.quadraticCurveTo(roofR, H - 0.02, roofR - 0.06, H - 0.1);
  c.lineTo(rearBase, belt + 0.04);
  c.lineTo(rearBase + 0.05, belt - 0.03);
  parts.push([bodyMat, extrudeProfile(c, Wc)]);

  // side windows, split by the B pillar
  const top = H - 0.09, bot = belt + 0.06;
  const A = cowl - 0.1, B = roofF - 0.07;
  const Cz = roofR + 0.12, Dz = Math.max(rearBase + 0.3, Cz - 0.25);
  const mid = (A + Dz) / 2 + 0.1;
  const xw = Wc / 2 + BT + 0.004;
  for (const side of [-1, 1]) {
    parts.push([glassMat, sidePanel([[A, bot], [B, top], [mid + 0.05, top], [mid + 0.05, bot]], xw, side)]);
    parts.push([glassMat, sidePanel([[mid - 0.05, bot], [mid - 0.05, top], [Cz, top], [Dz, bot]], xw, side)]);
  }
  // windscreen and rear window, lying on the glasshouse slopes
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const wsx = Wc / 2 - 0.06, o = BS + 0.008;
  {
    const dz = roofF - cowl, dy = H - belt, len = Math.hypot(dz, dy), nz = dy / len, ny = -dz / len; // outward normal of the slope
    const b0 = [cowl - 0.02 + nz * o, belt + 0.03 + ny * o], t0 = [roofF + 0.06 + nz * o, H - 0.08 + ny * o];
    parts.push([glassMat, quad(V3(-wsx, b0[1], b0[0]), V3(wsx, b0[1], b0[0]), V3(wsx, t0[1], t0[0]), V3(-wsx, t0[1], t0[0]), V3(0, ny, nz))]);
  }
  {
    const zt = roofR - 0.04, yt = H - 0.11, zb = rearBase + 0.04, yb2 = belt + 0.08;
    const dz = zb - zt, dy = yb2 - yt, len = Math.hypot(dz, dy), nz = dy / len, ny = -dz / len;
    const sgn = nz > 0 ? -1 : 1; // the rear window faces backwards
    const ox = nz * o * sgn, oy = ny * o * sgn;
    parts.push([glassMat, quad(V3(-wsx, yt + oy, zt + ox), V3(wsx, yt + oy, zt + ox), V3(wsx, yb2 + oy, zb + ox), V3(-wsx, yb2 + oy, zb + ox), V3(0, ny * sgn, nz * sgn))]);
  }

  // bumpers, grille, lights, plates, mirrors
  const trim = burnt ? 'charred' : 'plastic';
  parts.push([trim, box(W - 0.02, 0.2, 0.24, 0, 0.4, f - 0.06)]);
  parts.push([trim, box(W - 0.02, 0.22, 0.24, 0, 0.42, -f + 0.06)]);
  parts.push([trim, box(W * 0.42, 0.12, 0.06, 0, belt - 0.26, f - 0.03)]);
  if (!burnt) {
    for (const sx of [-1, 1]) {
      parts.push(['headlight', box(0.34, 0.1, 0.08, sx * (W / 2 - 0.27), belt - 0.18, f - 0.06)]);
      parts.push(['taillight', box(0.3, 0.13, 0.06, sx * (W / 2 - 0.2), belt - 0.1, -f + 0.01)]);
      parts.push(['amber', box(0.08, 0.06, 0.06, sx * (W / 2 - 0.08), 0.46, f - 0.04)]);
    }
    parts.push(['plate', box(0.52, 0.11, 0.02, 0, 0.42, f + 0.065)]);
    parts.push(['plate', box(0.52, 0.11, 0.02, 0, 0.6, -f - 0.005)]);
  }
  for (const sx of [-1, 1]) parts.push([burnt ? 'charred' : trim, box(0.08, 0.1, 0.16, sx * (W / 2 + 0.05), belt + 0.08, cowl - 0.18)]);
  // door shut lines and handles
  if (!burnt) for (const sx of [-1, 1]) {
    const xs = sx * (W / 2 + 0.003), hgt = belt - yb - 0.12;
    for (const z of [A + 0.04, mid, Dz - 0.02]) parts.push(['plastic', box(0.008, hgt, 0.012, xs, yb + 0.08 + hgt / 2, z)]);
    for (const z of [mid + 0.12, Dz + 0.12 < mid - 0.3 ? Dz + 0.12 : mid - 0.3]) parts.push(['plastic', box(0.03, 0.03, 0.13, sx * (W / 2 + 0.012), belt - 0.07, z)]);
  }
  // black sills between the arches
  for (const sx of [-1, 1]) parts.push([trim, box(0.04, 0.09, (fa - ar) - (ra + ar) - 0.06, sx * (W / 2 + 0.01), yb + 0.05, (fa - ar + ra + ar) / 2)]);

  for (const sx of [-1, 1]) for (const z of [fa, ra]) wheel(parts, sx * (W / 2 - 0.14), z, wr, 0.21, burnt);
  if (sink) for (const p of parts) p[1].translate(0, -sink, 0);
  return { parts, W, L, H: H - sink };
}

// ---------------------------------------------------------------- vans
// High-roof panel van (CRS / ambulance / fire service / tradesman).
export function vanParts(variant, body) {
  const L = 5.5, W = 2.04, H = 2.5, wb = 3.45, fo = 0.82, wr = 0.36;
  const f = L / 2, fa = f - fo, ra = fa - wb, ar = wr + 0.08, yb = 0.36;
  const parts = [];
  const s = new THREE.Shape();
  s.moveTo(-f + 0.03, yb + 0.06);
  s.lineTo(ra - ar, yb);
  s.absarc(ra, wr, ar, Math.PI, 0, true);
  s.lineTo(fa - ar, yb);
  s.absarc(fa, wr, ar, Math.PI, 0, true);
  s.lineTo(f - 0.08, yb + 0.04);
  s.quadraticCurveTo(f + 0.02, yb + 0.1, f, 0.62);
  s.quadraticCurveTo(f, 1.08, f - 0.24, 1.12);          // nose
  s.lineTo(f - 0.82, 1.32);                              // short bonnet
  s.lineTo(f - 1.42, H - 0.14);                          // windscreen
  s.quadraticCurveTo(f - 1.6, H, f - 1.95, H);
  s.lineTo(-f + 0.12, H);                                // roof
  s.quadraticCurveTo(-f, H, -f, H - 0.12);
  s.lineTo(-f, yb + 0.1);
  s.quadraticCurveTo(-f, yb + 0.06, -f + 0.03, yb + 0.06);
  parts.push([body, extrudeProfile(s, W)]);

  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const o = BS + 0.008;
  {
    const z0 = f - 0.84, y0 = 1.36, z1 = f - 1.38, y1 = H - 0.18;
    const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy), nz = dy / len, ny = -dz / len;
    const x = W / 2 - 0.12;
    parts.push(['glass', quad(V3(-x, y0 + ny * o, z0 + nz * o), V3(x, y0 + ny * o, z0 + nz * o), V3(x, y1 + ny * o, z1 + nz * o), V3(-x, y1 + ny * o, z1 + nz * o), V3(0, ny, nz))]);
  }
  const xw = W / 2 + BT + 0.004;
  for (const side of [-1, 1]) {
    // cab door window
    parts.push(['glass', sidePanel([[f - 0.95, 1.38], [f - 1.45, H - 0.22], [f - 2.15, H - 0.22], [f - 2.15, 1.38]], xw, side)]);
  }
  if (variant === 'civ') for (const side of [-1, 1]) parts.push(['glass', sidePanel([[-f + 0.3, 1.5], [-f + 0.3, H - 0.3], [f - 2.35, H - 0.3], [f - 2.35, 1.5]], xw, side)]);
  // rear doors' windows
  parts.push(['glass', quad(V3(-0.86, 1.55, -f - 0.012), V3(-0.08, 1.55, -f - 0.012), V3(-0.08, H - 0.3, -f - 0.012), V3(-0.86, H - 0.3, -f - 0.012), V3(0, 0, -1))]);
  parts.push(['glass', quad(V3(0.08, 1.55, -f - 0.012), V3(0.86, 1.55, -f - 0.012), V3(0.86, H - 0.3, -f - 0.012), V3(0.08, H - 0.3, -f - 0.012), V3(0, 0, -1))]);

  parts.push(['plastic', box(W, 0.26, 0.26, 0, 0.5, f - 0.05)]);
  parts.push(['plastic', box(W, 0.24, 0.2, 0, 0.5, -f + 0.04)]);
  parts.push(['plastic', box(W * 0.6, 0.26, 0.06, 0, 0.88, f - 0.02)]);
  for (const sx of [-1, 1]) {
    parts.push(['headlight', box(0.32, 0.16, 0.08, sx * (W / 2 - 0.26), 0.98, f - 0.08)]);
    parts.push(['taillight', box(0.14, 0.42, 0.05, sx * (W / 2 - 0.1), 0.95, -f - 0.005)]);
    parts.push(['plastic', box(0.08, 0.26, 0.2, sx * (W / 2 + 0.06), 1.62, f - 1.0)]); // mirrors
    parts.push(['plastic', box(0.04, 0.12, (fa - ar) - (ra + ar) - 0.08, sx * (W / 2 + 0.012), yb + 0.08, (fa - ar + ra + ar) / 2)]);
  }
  parts.push(['plate', box(0.52, 0.11, 0.02, 0, 0.5, f + 0.085)]);
  parts.push(['plate', box(0.52, 0.11, 0.02, 0, 0.75, -f - 0.012)]);
  for (const sx of [-1, 1]) for (const z of [fa, ra]) wheel(parts, sx * (W / 2 - 0.15), z, wr, 0.24, false);
  return { parts, W, L, H, f, cabZ: f - 2.2 };
}
