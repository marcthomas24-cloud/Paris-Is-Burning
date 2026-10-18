// Skinned human characters: loads local Mixamo-rigged glTF models, retargets
// motion-capture clips between them, recolours clothing per character in the
// shader (keeping the fabric detail of the original textures), and layers the
// game's procedural pose offsets (strikes, throws, chants, knockdowns) on top
// of the mocap skeleton in character space.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const FILES = {
  soldier: 'Soldier.glb', michelle: 'Michelle.glb', male: 'rpm_male.glb', xbot: 'Xbot.glb',
  rb_female: 'rb_female.glb', rb_male_a: 'rb_male_a.glb', rb_male_b: 'rb_male_b.glb',
};
// Microsoft Rocketbox bodies (converted by tools/rocketbox): one skinned mesh with
// a per-vertex garment part, a texture atlas and ARKit facial blendshapes.
export const RB_KINDS = ['rb_female', 'rb_male_a', 'rb_male_b'];
export const CIV_KINDS = ['michelle', 'male', ...RB_KINDS];
const canon = (name) => name.replace(/^mixamorig:?/, '');

export const Humans = { ready: false, templates: {}, clips: {}, envMap: null };

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const _m = new THREE.Matrix4();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);

// ------------------------------------------------------------------ loading
export async function loadHumans(onProgress) {
  const loader = new GLTFLoader();
  const keys = Object.keys(FILES);
  let done = 0;
  const results = await Promise.all(keys.map((k) => loader.loadAsync(`assets/models/${FILES[k]}`).then((g) => { done++; onProgress && onProgress(done / keys.length); return g; })));
  const gl = {}; keys.forEach((k, i) => (gl[k] = results[i]));
  for (const k of keys) Humans.templates[k] = prepTemplate(k, gl[k]);
  // source clips (Mixamo motion capture)
  const src = [
    ['xbot', gl.xbot.animations, { idle: 'idle', walk: 'walk', run: 'run', agree: 'agree', shake: 'headShake' }],
    ['soldier', gl.soldier.animations, { idle2: 'Idle', walk2: 'Walk', run2: 'Run' }],
  ];
  for (const tk of ['soldier', ...CIV_KINDS]) {
    const T = Humans.templates[tk];
    Humans.clips[tk] = {};
    for (const [sk, anims, map] of src) {
      const S = Humans.templates[sk];
      for (const [alias, name] of Object.entries(map)) {
        const clip = anims.find((a) => a.name === name);
        if (clip) Humans.clips[tk][alias] = retarget(clip, S, T, alias, Humans.templates.xbot);
      }
    }
  }
  Humans.ready = true;
  return Humans;
}

// The Ready Player Me male ships as 8 skinned meshes (head, eyes, body, top,
// trousers, shoes, beard...). Merge them into ONE skinned mesh with a texture
// atlas, a normal-map atlas and a per-vertex garment "part" id, so each man is
// a single draw call and garments are recoloured in the shader.
const MALE_PARTS = [
  // name pattern, part id, atlas rect [x, y, w, h] (normalised, top-down)
  [/Head/, 0, [0, 0, 0.5, 0.5]],
  [/Outfit_Top/, 1, [0.5, 0, 0.5, 0.5]],
  [/Outfit_Bottom/, 2, [0, 0.5, 0.5, 0.5]],
  [/Outfit_Footwear/, 3, [0.75, 0.5, 0.25, 0.25]],
  [/Body/, 0, [0.5, 0.5, 0.25, 0.25]],
  [/EyeLeft|EyeRight/, 5, [0.5, 0.75, 0.125, 0.125]],
  [/Beard/, 4, [0.625, 0.75, 0.125, 0.125]],
  [/Teeth/, 5, [0.75, 0.75, 0.125, 0.125]],
];
function mergeMale(scene) {
  const meshes = [];
  scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  const S = 2048;
  const cA = document.createElement('canvas'); cA.width = cA.height = S;
  const cN = document.createElement('canvas'); cN.width = cN.height = S;
  const xa = cA.getContext('2d'), xn = cN.getContext('2d');
  xn.fillStyle = 'rgb(128,128,255)'; xn.fillRect(0, 0, S, S);
  const geos = [];
  let first = null;
  for (const o of meshes) {
    const def = MALE_PARTS.find(([re]) => re.test(o.name));
    if (!def || /Headwear/.test(o.name)) { o.visible = false; continue; }
    if (!first) first = o;
    const [, part, [rx, ry, rw, rh]] = def;
    const m = o.material;
    if (m.map && m.map.image) xa.drawImage(m.map.image, rx * S, ry * S, rw * S, rh * S);
    else { xa.fillStyle = '#' + m.color.getHexString(); xa.fillRect(rx * S, ry * S, rw * S, rh * S); }
    if (m.normalMap && m.normalMap.image) xn.drawImage(m.normalMap.image, rx * S, ry * S, rw * S, rh * S);
    const g = new THREE.BufferGeometry();
    const src = o.geometry;
    // positions in the first mesh's bind space (all RPM meshes share one bind, but be safe)
    const P = src.attributes.position.clone();
    const N = src.attributes.normal.clone();
    if (o !== first) {
      const mtx = first.bindMatrixInverse.clone().multiply(o.bindMatrix);
      P.applyMatrix4(mtx); N.applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(mtx));
    }
    g.setAttribute('position', P);
    g.setAttribute('normal', N);
    const uv = src.attributes.uv;
    const nuv = new Float32Array(uv.count * 2);
    for (let i = 0; i < uv.count; i++) {
      const u = Math.min(0.998, Math.max(0.002, uv.getX(i))), v = Math.min(0.998, Math.max(0.002, uv.getY(i)));
      nuv[i * 2] = rx + u * rw; nuv[i * 2 + 1] = ry + v * rh;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(nuv, 2));
    const si = src.attributes.skinIndex, sw = src.attributes.skinWeight;
    const siA = new Uint16Array(si.count * 4), swA = new Float32Array(sw.count * 4);
    for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) { siA[i * 4 + k] = si.getComponent(i, k); swA[i * 4 + k] = sw.getComponent(i, k); }
    g.setAttribute('skinIndex', new THREE.BufferAttribute(siA, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(swA, 4));
    g.setAttribute('part', new THREE.BufferAttribute(new Float32Array(P.count).fill(part), 1));
    const idx = src.index ? Array.from(src.index.array) : [...Array(P.count).keys()];
    g.setIndex(idx);
    // mouthOpen / mouthSmile blendshapes (zeros for parts that don't have them)
    const ms = src.morphAttributes && src.morphAttributes.position;
    g.morphAttributes.position = [0, 1].map((k) => {
      const arr = new Float32Array(P.count * 3);
      const m = ms && ms[k];
      if (m) for (let i = 0; i < P.count; i++) { arr[i * 3] = m.getX(i); arr[i * 3 + 1] = m.getY(i); arr[i * 3 + 2] = m.getZ(i); } // handles interleaved / sparse data
      return new THREE.BufferAttribute(arr, 3);
    });
    g.morphTargetsRelative = true;
    geos.push(g);
    o.visible = false;
  }
  const merged = mergeGeometries(geos);
  const atlas = new THREE.CanvasTexture(cA); atlas.flipY = false; atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 4;
  const natlas = new THREE.CanvasTexture(cN); natlas.flipY = false;
  const mat = new THREE.MeshStandardMaterial({ map: atlas, normalMap: natlas, roughness: 0.85, metalness: 0 });
  const mesh = new THREE.SkinnedMesh(merged, mat);
  mesh.name = 'MaleMerged';
  first.parent.add(mesh);
  mesh.position.copy(first.position); mesh.quaternion.copy(first.quaternion); mesh.scale.copy(first.scale);
  mesh.bind(first.skeleton, first.bindMatrix);
  mesh.updateMorphTargets();
  mesh.morphTargetDictionary = { mouthOpen: 0, mouthSmile: 1 };
  for (const o of meshes) o.parent && o.parent.remove(o);
}

// ------------------------------------------------------------------ garments
// Clothing shells generated from each base body: a copy of the relevant part of
// the skinned mesh pushed out along its normals, skinned to the same skeleton.
// This lets three base bodies wear football shirts, hoodies, puffer jackets and
// long coats with genuinely different silhouettes.
const GARMENTS = {
  shirt: { offset: 0.007, sleeves: true, low: false },
  hoodie: { offset: 0.016, sleeves: true, low: false },
  puffer: { offset: 0.034, sleeves: true, low: false },
  coat: { offset: 0.02, sleeves: true, low: true },
};
const TORSO_BONES = /^(Spine|Spine1|Spine2|LeftShoulder|RightShoulder|LeftArm|RightArm|Neck)$/;
const SLEEVE_BONES = /^(LeftForeArm|RightForeArm)$/;
const LOW_BONES = /^(Hips|LeftUpLeg|RightUpLeg)$/;

// The rest-pose transform from mesh space to character space, measured through
// the skinning (some rigs carry an armature scale that the bind matrices undo).
const RF_CACHE = new WeakMap();
function restFrame(mesh) {
  if (RF_CACHE.has(mesh)) return RF_CACHE.get(mesh);
  const P = mesh.geometry.attributes.position;
  const v = new THREE.Vector3();
  const J = (x, y, z, i) => { v.set(x, y, z); mesh.applyBoneTransform(i, v); return v.applyMatrix4(mesh.matrixWorld).clone(); };
  // probe the linear part around a well-skinned vertex near the middle of the body
  let pi = 0, best = Infinity;
  const c = new THREE.Vector3();
  for (let i = 0; i < P.count; i += 7) { c.fromBufferAttribute(P, i); const w = J(c.x, c.y, c.z, i); const d = Math.abs(w.y - 1.2) + Math.abs(w.x); if (d < best) { best = d; pi = i; } }
  c.fromBufferAttribute(P, pi);
  const e = 1e-3 * Math.max(1e-6, Math.abs(c.x) + Math.abs(c.y) + Math.abs(c.z));
  const o = J(c.x, c.y, c.z, pi);
  const ax = J(c.x + e, c.y, c.z, pi).sub(o).divideScalar(e);
  const ay = J(c.x, c.y + e, c.z, pi).sub(o).divideScalar(e);
  const az = J(c.x, c.y, c.z + e, pi).sub(o).divideScalar(e);
  const L = new THREE.Matrix4().makeBasis(ax, ay, az);
  const t = o.clone().sub(c.clone().applyMatrix4(L));
  L.setPosition(t);
  const rf = {
    L, Li: L.clone().invert(),
    NM: new THREE.Matrix3().getNormalMatrix(L),
    lin: new THREE.Matrix3().setFromMatrix4(L.clone().invert()),
    toChar: (i, out) => { out.fromBufferAttribute(P, i); mesh.applyBoneTransform(i, out); return out.applyMatrix4(mesh.matrixWorld); },
  };
  RF_CACHE.set(mesh, rf);
  return rf;
}

function mainMesh(scene) {
  let best = null;
  scene.traverse((o) => { if (o.isSkinnedMesh && o.visible !== false && (!best || o.geometry.attributes.position.count > best.geometry.attributes.position.count)) best = o; });
  return best;
}

function shellGeometry(T, garment) {
  T.shells = T.shells || {};
  if (T.shells[garment]) return T.shells[garment];
  const cfg = GARMENTS[garment];
  const mesh = mainMesh(T.scene);
  const g = mesh.geometry;
  const P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, PART = g.attributes.part;
  const RF = restFrame(mesh), Mi = RF.Li, NM = RF.NM;
  const bones = mesh.skeleton.bones.map((b) => canon(b.name));
  const hipsY = T.restHipsWorld.y, neckY = new THREE.Vector3().setFromMatrixPosition(T.bind.Neck).y;
  const keep = new Uint8Array(P.count), cp = new THREE.Vector3(), cn = new THREE.Vector3();
  const charPos = new Float32Array(P.count * 3), charN = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) {
    RF.toChar(i, cp); cn.fromBufferAttribute(N, i).applyMatrix3(NM).normalize();
    charPos.set([cp.x, cp.y, cp.z], i * 3); charN.set([cn.x, cn.y, cn.z], i * 3);
    let bi = SI.getX(i), bw = SW.getX(i);
    for (const k of ['getY', 'getZ', 'getW']) if (SW[k](i) > bw) { bw = SW[k](i); bi = SI[k](i); }
    const bn = bones[bi] || '';
    let ok = false;
    if (PART) {
      const pt = PART.getX(i);
      ok = pt === 1 || (cfg.low && pt === 2 && cp.y > hipsY - 0.35);
      if (ok && !cfg.sleeves && SLEEVE_BONES.test(bn)) ok = false;
    } else {
      ok = (TORSO_BONES.test(bn) || (cfg.sleeves && SLEEVE_BONES.test(bn)) || (cfg.low && LOW_BONES.test(bn) && cp.y > hipsY - 0.4)) && cp.y > hipsY - (cfg.low ? 0.4 : 0.1) && cp.y < neckY + 0.02;
      if (bn === 'Neck' && cp.y > neckY - 0.02) ok = false;
    }
    keep[i] = ok ? 1 : 0;
  }
  const map = new Int32Array(P.count).fill(-1);
  const idx = g.index.array, outIdx = [];
  let n = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (!(keep[a] && keep[b] && keep[c])) continue;
    for (const v of [a, b, c]) { if (map[v] < 0) map[v] = n++; outIdx.push(map[v]); }
  }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const v3 = new THREE.Vector3(), lin = RF.lin;
  for (let i = 0; i < P.count; i++) {
    const j = map[i]; if (j < 0) continue;
    // offset along the normal in character space (metres), converted to a mesh-space delta
    v3.set(charN[i * 3], charN[i * 3 + 1], charN[i * 3 + 2]).multiplyScalar(cfg.offset).applyMatrix3(lin);
    pos.set([P.getX(i) + v3.x, P.getY(i) + v3.y, P.getZ(i) + v3.z], j * 3);
    v3.fromBufferAttribute(N, i); nor.set([v3.x, v3.y, v3.z], j * 3);
    uv.set([Math.atan2(charPos[i * 3], charPos[i * 3 + 2]) * 1.6, charPos[i * 3 + 1] * 5], j * 2);
    for (let k = 0; k < 4; k++) { si[j * 4 + k] = SI.getComponent(i, k); sw[j * 4 + k] = SW.getComponent(i, k); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  out.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  out.setIndex(outIdx);
  const bm = addBodyMorphs(out, mesh, bones);
  out.morphAttributes.position = [bm.belly, bm.chest];
  out.morphTargetsRelative = true;
  T.shells[garment] = out;
  return out;
}

let FABRIC_N = null;
function fabricNormal() {
  if (FABRIC_N) return FABRIC_N;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'); x.fillStyle = 'rgb(128,128,255)'; x.fillRect(0, 0, S, S);
  // knit / weave micro-relief + a few seams
  for (let i = 0; i < 9000; i++) { const v = 110 + Math.random() * 40; x.fillStyle = `rgb(${v},${128 + (Math.random() - 0.5) * 30},255)`; x.fillRect(Math.random() * S, Math.random() * S, 2, 1); }
  x.fillStyle = 'rgb(100,128,240)'; for (const yy of [64, 192]) x.fillRect(0, yy, S, 2);
  FABRIC_N = new THREE.CanvasTexture(c); FABRIC_N.wrapS = FABRIC_N.wrapT = THREE.RepeatWrapping;
  return FABRIC_N;
}

function armPoint(T, name) {
  const m = T.bind[name] || T.bind[name.replace('Left', 'Right')];
  const v = m ? new THREE.Vector3().setFromMatrixPosition(m) : new THREE.Vector3(0.2, 1.4, 0);
  v.x = Math.abs(v.x);
  return v;
}

function garmentMaterial(o, garment, bind, T) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: garment === 'puffer' ? 0.55 : garment === 'shirt' ? 0.75 : 0.92, normalMap: fabricNormal(), normalScale: new THREE.Vector2(0.6, 0.6), envMap: Humans.envMap, envMapIntensity: garment === 'puffer' ? 0.5 : 0.2 });
  const U = {
    uBase: { value: new THREE.Color(o.shellColor) }, uPattern: { value: o.shellPattern || 0 },
    uPA: { value: new THREE.Color(o.pa ?? o.shellColor) }, uPB: { value: new THREE.Color(o.pb ?? o.shellColor) }, uPC: { value: new THREE.Color(o.pc ?? 0xffffff) },
    uQuilt: { value: garment === 'puffer' ? 1 : 0 }, uBind: { value: bind },
    // arm axis (left side, mirrored by |x|) for tracksuit sleeve stripes
    uArmA: { value: armPoint(T, 'LeftArm') }, uArmB: { value: armPoint(T, 'LeftHand') },
  };
  mat.userData.U = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uBind; varying vec3 vCharPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCharPos = (uBind * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uBase, uPA, uPB, uPC, uArmA, uArmB; uniform int uPattern; uniform float uQuilt; varying vec3 vCharPos;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 p = vCharPos; vec3 o = uBase;
          float torso = step(abs(p.x), 0.22) * step(p.y, 1.55);
          if (uPattern == 1) { // PSG-style centre band
            float band = 1.0 - smoothstep(0.065, 0.069, abs(p.x));
            float edge = 1.0 - smoothstep(0.085, 0.089, abs(p.x));
            o = mix(o, mix(mix(uPA, uPC, edge), uPB, band), torso);
          } else if (uPattern == 2) o = mix(o, mix(uPA, uPB, step(0.5, fract(p.x * 11.0))), torso);
          else if (uPattern == 3) o = mix(o, mix(uPA, uPB, step(0.5, fract(p.y * 9.0))), torso);
          else if (uPattern == 4) o = mix(uPA, uPB, step(1.28, p.y));
          else if (uPattern == 6) { // Algeria-style shirt: green / white halves
            o = mix(uPA, uPB, step(0.0, p.x));
          } else if (uPattern == 7) { // hi-vis gilet jaune: yellow body, two reflective hoops, shoulder straps
            float vest = torso * step(0.92, p.y) * step(p.y, 1.47);
            float hoops = (1.0 - smoothstep(0.016, 0.02, abs(p.y - 1.02))) + (1.0 - smoothstep(0.016, 0.02, abs(p.y - 1.1)));
            float straps = (1.0 - smoothstep(0.016, 0.02, abs(abs(p.x) - 0.1))) * step(1.22, p.y);
            o = mix(o, mix(uPA, uPB, clamp(hoops + straps, 0.0, 1.0)), vest);
          }
          else if (uPattern == 8) { // tracksuit top: three stripes down the outside of each sleeve
            vec3 q = vec3(abs(p.x), p.y, p.z);
            vec3 ax = uArmB - uArmA; float L = length(ax); ax /= L;
            float t = dot(q - uArmA, ax);
            vec3 d = normalize(q - uArmA - ax * t);
            vec3 outer = normalize(cross(ax, vec3(0.0, 0.0, 1.0))); outer *= sign(outer.y + 1e-4);
            vec3 side = cross(ax, outer);
            float a = atan(dot(d, side), dot(d, outer));
            float st = 0.0;
            for (int k = -1; k <= 1; k++) st += 1.0 - smoothstep(0.07, 0.1, abs(a - float(k) * 0.3));
            o = mix(o, uPA, clamp(st, 0.0, 1.0) * step(0.04, t) * step(t, L * 0.92) * step(0.15, q.x));
          }
          if (uQuilt > 0.5) o *= 0.82 + 0.18 * smoothstep(0.0, 0.5, abs(sin(p.y * 38.0)));
          diffuseColor.rgb *= o;
        }`);
  };
  mat.customProgramCacheKey = () => 'garment-v2';
  return mat;
}

// Body-shape blendshapes: push the surface out along its normals, weighted by
// how strongly each vertex follows the lower / upper spine. Applied per person.
function addBodyMorphs(geo, mesh, boneNames) {
  const P = geo.attributes.position, N = geo.attributes.normal, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
  const RF = restFrame(mesh), NM = RF.NM, lin = RF.lin;
  const want = { belly: { Spine: 1, Hips: 0.45, Spine1: 0.55 }, chest: { Spine1: 0.5, Spine2: 1, LeftShoulder: 0.5, RightShoulder: 0.5 } };
  const amt = { belly: 0.055, chest: 0.022 };
  const out = {};
  const n = new THREE.Vector3(), d = new THREE.Vector3(), c = new THREE.Vector3();
  for (const key of ['belly', 'chest']) {
    const arr = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      let w = 0;
      for (let k = 0; k < 4; k++) w += (want[key][boneNames[SI.getComponent(i, k)]] || 0) * SW.getComponent(i, k);
      if (w < 0.01) continue;
      n.fromBufferAttribute(N, i).applyMatrix3(NM).normalize();
      // bellies push mostly forward/sideways, never up or down
      if (key === 'belly') { n.y *= 0.2; n.z = n.z > 0 ? n.z * 1.6 : n.z * 0.5; }
      d.copy(n).multiplyScalar(amt[key] * Math.min(1, w)).applyMatrix3(lin);
      arr.set([d.x, d.y, d.z], i * 3);
    }
    out[key] = new THREE.BufferAttribute(arr, 3);
  }
  return out;
}

function attachMorphs(mesh, geo, extra) {
  const names = Object.keys(mesh.morphTargetDictionary || {});
  geo.morphAttributes.position = geo.morphAttributes.position || [];
  const dict = { ...(mesh.morphTargetDictionary || {}) };
  for (const [k, attr] of Object.entries(extra)) { dict[k] = geo.morphAttributes.position.length; geo.morphAttributes.position.push(attr); }
  geo.morphTargetsRelative = true;
  return dict;
}

// Procedural jaw-drop blendshape for heads that ship without facial morphs.
function addJawMorph(T) {
  const mesh = mainMesh(T.scene);
  const g = mesh.geometry;
  if (g.morphAttributes.position && g.morphAttributes.position.length) return;
  const P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
  const RF = restFrame(mesh);
  const bones = mesh.skeleton.bones.map((b) => canon(b.name));
  const H = new THREE.Vector3().setFromMatrixPosition(T.bind.Head);
  const cp = new THREE.Vector3();
  const pts = [];
  let chin = Infinity, noseZ = -Infinity, noseY = 0;
  for (let i = 0; i < P.count; i++) {
    let bi = SI.getX(i), bw = SW.getX(i);
    for (const k of ['getY', 'getZ', 'getW']) if (SW[k](i) > bw) { bw = SW[k](i); bi = SI[k](i); }
    if (!/Head|Neck/.test(bones[bi] || '')) continue;
    RF.toChar(i, cp);
    pts.push([i, cp.x, cp.y, cp.z]);
    if (cp.z > H.z + 0.04 && Math.abs(cp.x) < 0.03) { if (cp.y < chin && cp.y > H.y - 0.12) chin = cp.y; if (cp.z > noseZ && cp.y > H.y) { noseZ = cp.z; noseY = cp.y; } }
  }
  if (!isFinite(chin)) return;
  const mouthY = noseY - 0.36 * (noseY - chin);
  const pivot = new THREE.Vector3(0, mouthY + 0.03, H.z - 0.01);
  const ang = 0.26, ca = Math.cos(ang), sa = Math.sin(ang);
  const delta = new Float32Array(P.count * 3), lin = RF.lin;
  const d = new THREE.Vector3();
  for (const [i, x, y, z] of pts) {
    if (z < H.z - 0.005 || y > mouthY + 0.006 || y < chin - 0.045) continue;
    const w = Math.min(1, (mouthY + 0.006 - y) / 0.02) * Math.min(1, (z - (H.z - 0.005)) / 0.03) * Math.min(1, (y - (chin - 0.045)) / 0.03);
    const dy = y - pivot.y, dz = z - pivot.z;
    const ny = pivot.y + dy * ca - dz * sa, nz = pivot.z + dy * sa + dz * ca;
    d.set(0, (ny - y) * w, (nz - z) * w).applyMatrix3(lin);
    delta.set([d.x, d.y, d.z], i * 3);
  }
  g.morphAttributes.position = [new THREE.BufferAttribute(delta, 3)];
  g.morphTargetsRelative = true;
  mesh.updateMorphTargets();
  mesh.morphTargetDictionary = { mouthOpen: 0 };
}


function patchMale(mat, o) {
  const U = {
    uSkin: { value: o.skinMul.clone() }, uTop: { value: new THREE.Color(o.topColor) }, uBottom: { value: new THREE.Color(o.pants) },
    uShoes: { value: new THREE.Color(o.shoes) }, uHair: { value: new THREE.Color(o.hair) },
    uPattern: { value: o.pattern || 0 }, uPA: { value: new THREE.Color(o.pa ?? 0xffffff) }, uPB: { value: new THREE.Color(o.pb ?? 0xffffff) }, uPC: { value: new THREE.Color(o.pc ?? 0xffffff) },
    uBind: { value: o.bind },
    uKeep: { value: new THREE.Vector3(o.keepTop ? 1 : 0, o.keepBottom ? 1 : 0, o.keepShoes ? 1 : 0) },
  };
  const rb = !!o.rb; // Rocketbox: flat part ids, hair cards alpha-tested from the atlas, keepable base clothes
  const vary = rb ? 'flat varying' : 'varying';
  mat.userData.U = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float part; ${vary} float vPart; uniform mat4 uBind; varying vec3 vCharPos;`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPart = part; vCharPos = (uBind * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        ${vary} float vPart; varying vec3 vCharPos;
        uniform vec3 uSkin, uTop, uBottom, uShoes, uHair, uPA, uPB, uPC, uKeep; uniform int uPattern;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 c = diffuseColor.rgb;
          float part = vPart;
          ${rb ? `if (part > 3.5) { if (texture2D(map, vMapUv + vec2(0.5, 0.0)).r < 0.5) discard; }
          else if (part > 0.5 && part < 2.5) { // skin showing through a garment triangle (necklines, cuffs)
            vec3 s = pow(max(c, vec3(1e-4)), vec3(1.0 / 2.2));
            float mx = max(s.r, max(s.g, s.b)), dd = mx - min(s.r, min(s.g, s.b)), hh = (s.g - s.b) / (dd + 1e-4);
            if (s.r >= s.g && s.g >= s.b && dd / mx > 0.22 && dd / mx < 0.7 && mx > 0.25 && hh > 0.15 && hh < 0.75) part = 0.0;
          }` : ''}
          float lum = dot(c, vec3(0.299, 0.587, 0.114));
          float k = 0.35 + lum * 1.6;
          vec3 o = c;
          if (part < 0.5) o = c * uSkin;
          else if (part < 1.5) {
            o = uTop * k;
            vec3 p = vCharPos; float l = 0.3 + lum * 1.4;
            float torso = step(0.98, p.y) * step(p.y, 1.52) * step(abs(p.x), 0.21);
            if (uPattern == 1) {
              float band = 1.0 - smoothstep(0.07, 0.074, abs(p.x));
              float edge = 1.0 - smoothstep(0.09, 0.094, abs(p.x));
              o = mix(o, mix(mix(uPA * l, uPC * l, edge), uPB * l, band), torso);
            } else if (uPattern == 2) o = mix(o, mix(uPA, uPB, step(0.5, fract(p.x * 11.0))) * l, torso);
            else if (uPattern == 3) o = mix(o, mix(uPA, uPB, step(0.5, fract(p.y * 9.0))) * l, torso);
            else if (uPattern == 4) o = mix(o, mix(uPA, uPB, step(1.27, p.y)) * l, step(0.98, p.y));
            ${rb ? 'o = mix(o, c, uKeep.x);' : ''}
          }
          else if (part < 2.5) o = mix(uBottom * k, c, uKeep.y);
          else if (part < 3.5) o = mix(uShoes * k, c, uKeep.z);
          else if (part < 4.5) o = ${rb ? 'c' : 'uHair * (0.4 + lum)'};
          diffuseColor.rgb = o;
        }`);
  };
  mat.customProgramCacheKey = () => (rb ? 'rb-v1' : 'male-merged-v1');
}

function prepTemplate(key, gltf) {
  const scene = gltf.scene;
  if (key === 'male') mergeMale(scene);
  const rb = RB_KINDS.includes(key);
  if (rb) scene.traverse((o) => { if (o.isSkinnedMesh && o.geometry.attributes._part) { o.geometry.setAttribute('part', o.geometry.attributes._part); o.geometry.deleteAttribute('_part'); } });
  const yawFix = key === 'soldier' ? Math.PI : 0;
  const holder = new THREE.Group();
  holder.rotation.y = yawFix;
  holder.add(scene);
  holder.updateMatrixWorld(true);
  const bones = {};
  scene.traverse((o) => { if (o.isBone) { bones[canon(o.name)] = o; o.userData.bindQ = o.quaternion.clone(); } });
  const hips = bones.Hips;
  const restHipsWorld = hips.getWorldPosition(new THREE.Vector3());
  const parentQ = hips.parent.getWorldQuaternion(new THREE.Quaternion());
  const parentM = hips.parent.matrixWorld.clone();
  const box = new THREE.Box3().setFromObject(scene);
  // world-space bind matrices of every bone (for sockets)
  const bind = {};
  for (const [n, b] of Object.entries(bones)) bind[n] = b.matrixWorld.clone();
  const boneScale = hips.getWorldScale(new THREE.Vector3()).x;
  const T = { key, gltf, scene, holder, yawFix, bones, restHipsWorld, parentQ, parentM, top: box.max.y, bind, boneScale };
  if (key === 'michelle') addJawMorph(T);
  if (key === 'male' || key === 'michelle' || rb) {
    const mesh = mainMesh(scene);
    const names = mesh.skeleton.bones.map((b) => canon(b.name));
    const dict = attachMorphs(mesh, mesh.geometry, addBodyMorphs(mesh.geometry, mesh, names));
    mesh.updateMorphTargets();
    mesh.morphTargetDictionary = dict;
    T.boneNames = names;
  }
  return T;
}

// Copy Mixamo tracks across rigs that share bone naming; correct the Hips for
// differing armature orientation (Y-up vs Z-up) and scale the hip height.
// World-space retargeting. Both rigs are first brought to a common reference
// pose (the source's T-pose: every bone points at its child in the same
// direction), then each frame's world-space rotation *relative to that pose*
// is transferred bone by bone. This copes with A-pose binds, different bone
// roll and Y-up/Z-up armatures.
const CHILD = {
  Hips: 'Spine', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head',
  LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', LeftHand: 'LeftHandMiddle1',
  RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand', RightHand: 'RightHandMiddle1',
  LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase',
};
for (const side of ['Left', 'Right']) for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) { CHILD[`${side}Hand${f}1`] = `${side}Hand${f}2`; CHILD[`${side}Hand${f}2`] = `${side}Hand${f}3`; }

function boneOrder(tpl) {
  const order = [];
  tpl.scene.traverse((o) => { if (o.isBone) order.push(canon(o.name)); });
  return order;
}

// Pose `tpl` so each bone points at its child like the reference template does;
// returns world quaternions (character space) of that reference pose.
function referencePose(tpl, ref) {
  const saved = new Map();
  tpl.scene.traverse((o) => { if (o.isBone) saved.set(o, o.quaternion.clone()); });
  tpl.holder.updateMatrixWorld(true);
  const order = boneOrder(tpl);
  if (tpl !== ref) {
    for (const c of order) {
      const ch = CHILD[c];
      const b = tpl.bones[c], bc = tpl.bones[ch];
      if (!b || !bc || !ref.bones[c] || !ref.bones[ch] || c === 'Hips') continue;
      const dRef = new THREE.Vector3().setFromMatrixPosition(ref.bind[ch]).sub(new THREE.Vector3().setFromMatrixPosition(ref.bind[c])).normalize();
      const pb = b.getWorldPosition(new THREE.Vector3()), pc = bc.getWorldPosition(new THREE.Vector3());
      const dCur = pc.sub(pb).normalize();
      const rq = new THREE.Quaternion().setFromUnitVectors(dCur, dRef);
      b.parent.getWorldQuaternion(_q);
      _q3.copy(_q).invert().multiply(rq).multiply(_q);
      b.quaternion.premultiply(_q3);
      b.updateMatrixWorld(true);
    }
  }
  const world = {};
  for (const c of order) world[c] = tpl.bones[c].getWorldQuaternion(new THREE.Quaternion());
  // restore bind pose
  for (const [b, q] of saved) b.quaternion.copy(q);
  tpl.holder.updateMatrixWorld(true);
  return world;
}

function retarget(clip, S, T, alias, refTpl) {
  if (!S.refWorld) S.refWorld = referencePose(S, refTpl);
  if (!T.refWorld) T.refWorld = referencePose(T, refTpl);
  const order = boneOrder(T).filter((c) => S.bones[c]);
  const fps = 30, n = Math.max(2, Math.ceil(clip.duration * fps) + 1);
  const times = new Float32Array(n);
  const qv = {}; for (const c of order) qv[c] = new Float32Array(n * 4);
  const hv = new Float32Array(n * 3);
  // static parent world quats of target bones whose parent is not a mapped bone
  const tParentStatic = {};
  for (const c of order) {
    const par = T.bones[c].parent;
    const pc = par && par.isBone ? canon(par.name) : null;
    if (!pc || !order.includes(pc)) tParentStatic[c] = par.getWorldQuaternion(new THREE.Quaternion());
  }
  const mixer = new THREE.AnimationMixer(S.scene);
  const action = mixer.clipAction(clip); action.play();
  const ratio = T.restHipsWorld.y / S.restHipsWorld.y;
  const invTP = T.parentM.clone().invert();
  const sw = {}, tw = {};
  const tmpInv = new THREE.Quaternion(), out = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const t = Math.min(clip.duration, i / fps);
    times[i] = t;
    mixer.setTime(t);
    S.holder.updateMatrixWorld(true);
    for (const c of order) {
      sw[c] = sw[c] || new THREE.Quaternion();
      S.bones[c].getWorldQuaternion(sw[c]);
      // target world = (source world * inv(source ref)) * target ref
      tw[c] = tw[c] || new THREE.Quaternion();
      tmpInv.copy(S.refWorld[c]).invert();
      tw[c].copy(sw[c]).multiply(tmpInv).multiply(T.refWorld[c]);
      const par = T.bones[c].parent;
      const pq = tParentStatic[c] || tw[canon(par.name)];
      out.copy(pq).invert().multiply(tw[c]);
      out.toArray(qv[c], i * 4);
    }
    // hips translation (vertical bob, sway), scaled to the target's leg length
    S.bones.Hips.getWorldPosition(_v).sub(S.restHipsWorld).multiplyScalar(ratio);
    _v.z *= 0.3; _v.x *= 0.6;
    _v.add(T.restHipsWorld).applyMatrix4(invTP);
    _v.toArray(hv, i * 3);
  }
  mixer.stopAllAction(); mixer.uncacheRoot(S.scene);
  // restore the source skeleton to bind pose
  S.scene.traverse((o) => { if (o.isBone && o.userData.bindQ) o.quaternion.copy(o.userData.bindQ); });
  S.holder.updateMatrixWorld(true);
  const tracks = order.map((c) => new THREE.QuaternionKeyframeTrack(`${T.bones[c].name}.quaternion`, times, qv[c]));
  tracks.push(new THREE.VectorKeyframeTrack(`${T.bones.Hips.name}.position`, times, hv));
  return new THREE.AnimationClip(alias, clip.duration, tracks);
}

// ------------------------------------------------------------------ materials
// Shared shader patch: recolour by hue rules and/or a tint, plus garment patterns.
// Per-character uniforms live on cloned materials; the program is shared.
function patchMaterial(mat, opts) {
  const U = {
    uMode: { value: opts.mode || 0 },          // 0 tint, 1 hue rules
    uTint: { value: new THREE.Color(opts.tint ?? 0xffffff) },
    uKeepLum: { value: opts.keepLum ?? 1.0 },
    uC0: { value: new THREE.Color(opts.c0 ?? 0xffffff) }, // rule colours
    uC1: { value: new THREE.Color(opts.c1 ?? 0xffffff) },
    uC2: { value: new THREE.Color(opts.c2 ?? 0xffffff) },
    uC3: { value: new THREE.Color(opts.c3 ?? 0xffffff) },
    uPattern: { value: opts.pattern || 0 },    // 0 none, 1 PSG band, 2 vertical stripes, 3 hoops, 4 two-tone
    uPA: { value: new THREE.Color(opts.pa ?? 0xffffff) },
    uPB: { value: new THREE.Color(opts.pb ?? 0xffffff) },
    uPC: { value: new THREE.Color(opts.pc ?? 0xffffff) },
    uBind: { value: opts.bind || new THREE.Matrix4() },
    uPatBox: { value: new THREE.Vector4(opts.patY0 ?? 1.0, opts.patY1 ?? 1.6, opts.patZ ?? 0, opts.patW ?? 0.075) },
    uMaskRules: { value: opts.rules || 0 },
  };
  mat.userData.U = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uBind;\nvarying vec3 vCharPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCharPos = (uBind * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform int uMode; uniform vec3 uTint; uniform float uKeepLum;
        uniform vec3 uC0, uC1, uC2, uC3, uPA, uPB, uPC; uniform int uPattern; uniform vec4 uPatBox; uniform int uMaskRules;
        varying vec3 vCharPos;
        vec3 rgb2hsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); float e=1.0e-10; return vec3(abs(q.z+(q.w-q.y)/(6.0*d+e)),d/(q.x+e),q.x); }
        float hueNear(float h, float c, float w){ float d = abs(h - c); d = min(d, 1.0 - d); return 1.0 - smoothstep(w * 0.6, w, d); }
      `)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 c = diffuseColor.rgb;
          float lum = dot(c, vec3(0.299, 0.587, 0.114));
          vec3 hsv = rgb2hsv(pow(max(c, vec3(0.0)), vec3(1.0 / 2.2))); // classify in display (sRGB) space
          vec3 outc = c;
          if (uMode == 0) {
            outc = mix(c * uTint, uTint * (0.35 + lum * 1.6), uKeepLum);
          } else {
            // hue rules: 0 = cream/armour, 1 = green cloth, 2 = red accents, 3 = yellow, 4 = skin
            float sat = hsv.y, val = hsv.z;
            outc = c;
            if (uMaskRules == 1) { // Vanguard soldier -> CRS officer
              float cream = smoothstep(0.35, 0.55, val) * (1.0 - smoothstep(0.35, 0.6, sat)) * hueNear(hsv.x, 0.09, 0.12);
              float green = hueNear(hsv.x, 0.22, 0.12) * smoothstep(0.08, 0.2, sat);
              float red = hueNear(hsv.x, 0.0, 0.06) * smoothstep(0.45, 0.7, sat);
              float l = 0.25 + lum * 1.3;
              outc = mix(outc, uC0 * l, cream);
              outc = mix(outc, uC1 * (0.4 + lum * 2.2), green);
              outc = mix(outc, uC2 * l, red);
              outc = mix(outc, c * 0.55 + uC1 * 0.1, (1.0 - cream - green - red) * 0.5);
            } else if (uMaskRules == 2) { // Michelle streetwear
              float yellow = hueNear(hsv.x, 0.14, 0.07) * smoothstep(0.35, 0.6, sat) * smoothstep(0.35, 0.6, val);
              float red = hueNear(hsv.x, 0.0, 0.05) * smoothstep(0.5, 0.75, sat);
              float skin = hueNear(hsv.x, 0.06, 0.05) * smoothstep(0.25, 0.4, sat) * (1.0 - smoothstep(0.75, 0.95, val)) * (1.0 - red);
              outc = mix(outc, uC0 * (0.3 + lum * 1.2), yellow);
              outc = mix(outc, uC2 * (0.4 + lum), red);
              outc = mix(outc, c * uC3, skin);
              // dark garments: optional base colour
              float dark = (1.0 - smoothstep(0.12, 0.3, val)) * (1.0 - skin);
              outc = mix(outc, uC1 * (0.25 + lum * 2.5), dark * step(0.01, uC1.r + uC1.g + uC1.b));
            }
          }
          // garment patterns in bind (character) space
          if (uPattern > 0) {
            vec3 p = vCharPos;
            float inY = step(uPatBox.x, p.y) * step(p.y, uPatBox.y);
            float l = 0.3 + lum * 1.4;
            float torso = inY * step(abs(p.x), 0.21);
            if (uPattern == 1) {
              float band = 1.0 - smoothstep(uPatBox.w, uPatBox.w + 0.004, abs(p.x));
              float edge = 1.0 - smoothstep(uPatBox.w + 0.02, uPatBox.w + 0.024, abs(p.x));
              vec3 col = mix(uPA * l, uPC * l, edge);
              col = mix(col, uPB * l, band);
              outc = mix(outc, col, torso);
            } else if (uPattern == 2) {
              float s = step(0.5, fract(p.x * 11.0));
              outc = mix(outc, mix(uPA, uPB, s) * l, torso);
            } else if (uPattern == 3) {
              float s = step(0.5, fract(p.y * 9.0));
              outc = mix(outc, mix(uPA, uPB, s) * l, torso);
            } else if (uPattern == 4) {
              float s = step(uPatBox.x + (uPatBox.y - uPatBox.x) * 0.55, p.y);
              outc = mix(outc, mix(uPA, uPB, s) * l, inY);
            }
          }
          diffuseColor.rgb = outc;
        }
      `);
  };
  mat.customProgramCacheKey = () => 'human-recolor-v1';
  return mat;
}

// Recolour the Vanguard soldier texture into CRS colours once, on the CPU:
// cream armour -> dark navy-black plates, olive cloth -> navy uniform,
// red stripes -> police blue. Luminance is kept so wear, seams and edges stay.
let CRS_TEX = null;
function crsTexture(src) {
  if (CRS_TEX) return CRS_TEX;
  const img = src.image;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn;
    let h = 0;
    if (dl > 1e-4) { if (mx === r) h = ((g - b) / dl) % 6; else if (mx === g) h = (b - r) / dl + 2; else h = (r - g) / dl + 4; h /= 6; if (h < 0) h += 1; }
    const sat = mx ? dl / mx : 0, val = mx, lum = 0.3 * r + 0.59 * g + 0.11 * b;
    let o;
    if (val > 0.42 && sat < 0.55 && h > 0.02 && h < 0.17) o = [0.10 + lum * 0.16, 0.12 + lum * 0.19, 0.17 + lum * 0.27]; // armour plates
    else if (h > 0.13 && h < 0.33 && sat > 0.1) o = [0.08 + lum * 0.35, 0.11 + lum * 0.45, 0.2 + lum * 0.8]; // cloth -> navy
    else if ((h < 0.04 || h > 0.95) && sat > 0.5) o = [0.15, 0.28, 0.62]; // stripes -> blue
    else o = [r * 0.62, g * 0.66, b * 0.78];
    d[i] = Math.min(255, o[0] * 255); d[i + 1] = Math.min(255, o[1] * 255); d[i + 2] = Math.min(255, o[2] * 255);
  }
  ctx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.flipY = src.flipY; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = src.wrapS; t.wrapT = src.wrapT; t.anisotropy = 4;
  CRS_TEX = t;
  return t;
}

// ------------------------------------------------------------------ build
const SKIN_AVG = new THREE.Color(0.8, 0.62, 0.57);

function socket(rig, boneName, charMatrix) {
  // Attach an empty group to a bone such that, in bind pose, its world frame equals charMatrix.
  const T = rig.T, bone = rig.bones[boneName];
  const g = new THREE.Group();
  const local = T.bind[boneName].clone().invert().multiply(charMatrix);
  local.decompose(g.position, g.quaternion, g.scale);
  bone.add(g);
  return g;
}

function basis(x, y, z, pos) { return new THREE.Matrix4().makeBasis(x, y, z).setPosition(pos); }

export function createHuman(kind, outfit, extra = {}) {
  const T = Humans.templates[kind];
  const model = SkeletonUtils.clone(T.scene);
  const holder = new THREE.Group();
  holder.rotation.y = T.yawFix;
  holder.add(model);
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  const body = new THREE.Group(); // receives crouch offsets + height scale
  body.add(holder);
  root.add(body);
  const hs = outfit.height || 1;
  const bw = THREE.MathUtils.clamp(outfit.build || 1, 0.9, 1.14); // body width varies the silhouette
  body.scale.set(hs * bw, hs, hs * (0.5 + bw * 0.5));
  const bones = {};
  model.traverse((o) => { if (o.isBone) bones[canon(o.name)] = o; });
  const rig = { skinned: true, kind, T, root, body, model, bones, meshes: [], pose: null, item: null, itemType: 'none', phase: Math.random() * 6.28, speed: 0, acc: 0 };
  // bind matrices for this clone (identical to template; template is in its holder frame)
  holder.updateMatrixWorld(true);

  // materials
  const tplMain = mainMesh(T.scene);
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    const n = o.name;
    if (o.isSkinnedMesh) {
      // bind-pose bounds padded for limb motion, so culling stays correct while animating
      o.computeBoundingSphere();
      o.boundingSphere.radius *= 1.5;
    }
    if (/Eye/.test(n)) { o.castShadow = false; o.receiveShadow = false; o.userData.detail = true; }
    if (/Teeth|Headwear/.test(n)) { o.visible = false; return; }
    if (n === 'Wolf3D_Beard') { o.visible = !!outfit.beard; }
    const m = o.material.clone();
    m.envMap = Humans.envMap; m.envMapIntensity = 0.5;
    const bindM = o.name === tplMain.name && kind !== 'soldier' ? restFrame(tplMain).L.clone() : o.matrixWorld.clone();
    if (kind === 'soldier') {
      if (/visor/i.test(n)) {
        o.material = new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 0.05, metalness: 0.9, envMap: Humans.envMap, envMapIntensity: 1.6, transparent: true, opacity: 0.88 });
        rig.meshes.push(o); return;
      }
      m.map = crsTexture(m.map);
      m.color.set(0xffffff);
      m.roughness = 0.5; m.metalness = 0.05; m.envMapIntensity = 0.25;
    } else if (kind === 'michelle') {
      patchMaterial(m, { mode: 1, rules: 2, c0: outfit.pants, c1: outfit.topBase ?? 0x000000, c2: outfit.accent, c3: outfit.skinMul, bind: bindM, pattern: outfit.pattern, pa: outfit.pa, pb: outfit.pb, pc: outfit.pc, patY0: 0.95, patY1: 1.42, patW: 0.06 });
    } else if (kind === 'male') {
      patchMale(m, { ...outfit, hair: outfit.beard ? outfit.hair : outfit.skinTone, bind: bindM });
    } else if (RB_KINDS.includes(kind)) {
      m.roughness = 0.75; m.envMapIntensity = 0.3;
      patchMale(m, { ...outfit, bind: bindM, rb: true });
    }
    o.material = m;
    rig.meshes.push(o);
  });

  // ---- sockets (frames defined in character space at bind pose)
  const B = T.bind;
  const posOf = (n) => new THREE.Vector3().setFromMatrixPosition(B[n]);
  const holderInv = new THREE.Matrix4(); // template bind already includes holder yaw (character space)
  const handBasis = (side) => {
    const hand = posOf(side + 'Hand'), elbow = posOf(side + 'ForeArm');
    const y = elbow.clone().sub(hand).normalize(); // -Y points along the forearm, beyond the hand
    const z = new THREE.Vector3(0, 0, 1); z.addScaledVector(y, -z.dot(y)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    const grip = hand.clone().addScaledVector(y, -0.075);
    return basis(x, y, z, grip);
  };
  rig.handR = socket(rig, 'RightHand', handBasis('Right'));
  rig.handL = socket(rig, 'LeftHand', handBasis('Left'));
  // "spine" socket keeps the old procedural rig's frame: origin near the waist
  rig.spine = socket(rig, 'Spine', basis(AX, AY, AZ, new THREE.Vector3(0, posOf('Hips').y - 0.0, 0)));
  rig.chest = socket(rig, 'Spine2', basis(AX, AY, AZ, posOf('Spine2')));
  const headTop = kind === 'soldier' ? T.top - 0.05 : T.top;
  const headPos = posOf('Head'); headPos.y = headTop - (kind === 'rb_female' ? 0.135 : RB_KINDS.includes(kind) ? 0.105 : 0.115); // Rocketbox: realistic head size, her hair adds volume
  headPos.z += kind === 'male' ? 0.02 : RB_KINDS.includes(kind) ? 0.03 : 0.0;
  rig.head = socket(rig, 'Head', basis(AX, AY, AZ, headPos));
  rig.headTop = headTop;

  // grip pose for fingers (curl) applied after the mixer each frame
  rig.grip = { R: buildGrip(rig, 'Right'), L: buildGrip(rig, 'Left') };

  // clothing layer generated from the base body
  if (outfit.garment && GARMENTS[outfit.garment] && kind !== 'soldier') {
    const base = mainMesh(model);
    const geo = shellGeometry(T, outfit.garment);
    if (geo.index.count > 0) {
      const sh = new THREE.SkinnedMesh(geo, garmentMaterial(outfit, outfit.garment, restFrame(mainMesh(T.scene)).L.clone(), T));
      sh.name = 'Garment';
      sh.updateMorphTargets();
      sh.morphTargetDictionary = { belly: 0, chest: 1 };
      sh.position.copy(base.position); sh.quaternion.copy(base.quaternion); sh.scale.copy(base.scale);
      base.parent.add(sh);
      sh.bind(base.skeleton, base.bindMatrix);
      sh.castShadow = false; sh.receiveShadow = true; sh.userData.detail = true; // the body underneath casts the shadow
      sh.computeBoundingSphere(); sh.boundingSphere.radius *= 1.5;
      rig.meshes.push(sh);
    }
  }
  // body shape: girth, shoulder width, head size (bone scale is never animated)
  if (outfit.body && kind !== 'soldier') {
    const B = outfit.body;
    // girth / chest via generated blendshapes on the body and the garment
    for (const m of [mainMesh(model), ...rig.meshes.filter((x) => x.name === 'Garment')]) {
      if (!m || !m.morphTargetDictionary) continue;
      const d = m.morphTargetDictionary;
      if (d.belly !== undefined) m.morphTargetInfluences[d.belly] = Math.max(0, (B.girth - 0.95) / 0.21);
      if (d.chest !== undefined) m.morphTargetInfluences[d.chest] = Math.max(0, (B.chest - 0.97) / 0.08) * 0.8;
    }
    for (const s of ['LeftShoulder', 'RightShoulder']) if (bones[s]) bones[s].position.multiplyScalar(B.shoulders);
    if (bones.Head) bones.Head.scale.setScalar(B.head);
  }
  // face: blendshapes, eye bones
  const faceMesh = mainMesh(model);
  rig.face = {
    mesh: faceMesh && faceMesh.morphTargetInfluences ? faceMesh : null,
    open: faceMesh && faceMesh.morphTargetDictionary ? faceMesh.morphTargetDictionary.mouthOpen : undefined,
    smile: faceMesh && faceMesh.morphTargetDictionary ? faceMesh.morphTargetDictionary.mouthSmile : undefined,
    blinkM: faceMesh && faceMesh.morphTargetDictionary ? faceMesh.morphTargetDictionary.eyeBlink : undefined,
    browUp: faceMesh && faceMesh.morphTargetDictionary ? faceMesh.morphTargetDictionary.browInnerUp : undefined,
    browDown: faceMesh && faceMesh.morphTargetDictionary ? faceMesh.morphTargetDictionary.browDown : undefined,
    funnel: faceMesh && faceMesh.morphTargetDictionary ? faceMesh.morphTargetDictionary.mouthFunnel : undefined,
    mood: 0, moodV: 0,
    eyes: [bones.LeftEye, bones.RightEye].filter(Boolean).map((e) => ((e.userData.restQ = e.quaternion.clone()), e)),
    blinkT: 1 + Math.random() * 3, blink: 0, sacT: 0, sx: 0, sy: 0, mouth: 0, smileV: 0,
  };

  // animation
  const clips = Humans.clips[kind];
  const mixer = new THREE.AnimationMixer(model);
  const style = extra.style ?? (Math.random() < 0.5 ? 0 : 1);
  const pickClip = (a, b) => clips[style ? b : a] || clips[a] || clips[b];
  const idleName = extra.idle || (style ? 'idle2' : 'idle');
  rig.actions = {
    idle: mixer.clipAction(clips[idleName] || pickClip('idle', 'idle2')),
    walk: mixer.clipAction(pickClip('walk', 'walk2')),
    run: mixer.clipAction(pickClip('run', 'run2')),
  };
  for (const a of Object.values(rig.actions)) { a.play(); a.setEffectiveWeight(0); a.time = Math.random() * a.getClip().duration; }
  rig.actions.idle.setEffectiveWeight(1);
  rig.mixer = mixer;
  rig.walkRef = style ? 1.25 : 1.4;
  rig.runRef = style ? 3.6 : 4.2;
  return rig;
}

function buildGrip(rig, side) {
  // Curl finger bones around the character-space forward axis (as measured in bind pose).
  const out = [];
  const sgn = side === 'Right' ? 1 : -1;
  for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) {
    for (let i = 1; i <= 3; i++) {
      const n = `${side}Hand${f}${i}`;
      const b = rig.bones[n]; if (!b) continue;
      const wq = new THREE.Quaternion(); rig.T.bind[n].decompose(_v, wq, _v2);
      const axis = new THREE.Vector3(0, 0, sgn).applyQuaternion(wq.clone().invert());
      out.push({ b, q: new THREE.Quaternion().setFromAxisAngle(axis, i === 1 ? 1.2 : 1.3) });
    }
  }
  for (let i = 1; i <= 3; i++) {
    const n = `${side}HandThumb${i}`;
    const b = rig.bones[n]; if (!b) continue;
    const wq = new THREE.Quaternion(); rig.T.bind[n].decompose(_v, wq, _v2);
    const axis = new THREE.Vector3(0, sgn * 0.6, 0.4).normalize().applyQuaternion(wq.clone().invert());
    out.push({ b, q: new THREE.Quaternion().setFromAxisAngle(axis, 0.5) });
  }
  return out;
}

// ------------------------------------------------------------------ per-frame
// Rotate a bone about a world-space axis, then refresh its subtree.
function rotWorld(bone, axisW, ang) {
  if (Math.abs(ang) < 1e-4) return false;
  bone.parent.getWorldQuaternion(_q);
  _q2.setFromAxisAngle(axisW, ang);
  _q3.copy(_q).invert().multiply(_q2).multiply(_q); // parent^-1 * R * parent
  bone.quaternion.premultiply(_q3);
  return true;
}

const cx = new THREE.Vector3(), cy = new THREE.Vector3(), cz = new THREE.Vector3();
function rot3(bone, x, y, z) {
  let ch = false;
  // order: twist (Y), then side (Z), then pitch (X) — matches the old rig's Euler order closely enough
  ch = rotWorld(bone, cy, y) || ch;
  ch = rotWorld(bone, cz, z) || ch;
  ch = rotWorld(bone, cx, x) || ch;
  if (ch) bone.updateMatrixWorld(true);
}

export function updateHuman(rig, P, dt, full = true) {
  // locomotion blend from speed
  const s = rig.speed;
  const A = rig.actions;
  const lying = Math.abs(P.tiltX) > 0.3 || P.y < -0.25;
  const wIdle = lying ? 1 : 1 - THREE.MathUtils.smoothstep(s, 0.15, 1.0);
  const wRun = lying ? 0 : THREE.MathUtils.smoothstep(s, 2.4, 4.0);
  const wWalk = lying ? 0 : Math.max(0, 1 - wIdle - wRun);
  A.idle.setEffectiveWeight(wIdle);
  A.walk.setEffectiveWeight(wWalk);
  A.run.setEffectiveWeight(wRun);
  A.walk.timeScale = THREE.MathUtils.clamp(s / rig.walkRef, 0.6, 1.7);
  A.run.timeScale = THREE.MathUtils.clamp(s / rig.runRef, 0.75, 1.5);
  rig.mixer.update(dt);

  // root & body (tilt for knockdowns, vertical offset for crouches)
  rig.root.rotation.x = P.tiltX;
  rig.root.rotation.z = P.tiltZ;
  rig.body.position.y = P.y;
  rig.root.updateMatrixWorld(true);
  if (!full) return;

  // character-space axes in world
  rig.root.getWorldQuaternion(_q);
  cx.copy(AX).applyQuaternion(_q); cy.copy(AY).applyQuaternion(_q); cz.copy(AZ).applyQuaternion(_q);
  const b = rig.bones;
  rot3(b.Spine1, P.spX, P.spY, P.spZ);
  rot3(b.Head, P.hdX, P.hdY, 0);
  rot3(b.LeftArm, P.shLX, P.shLY, P.shLZ);
  rot3(b.LeftForeArm, P.elL, 0, 0);
  rot3(b.RightArm, P.shRX, P.shRY, P.shRZ);
  rot3(b.RightForeArm, P.elR, 0, 0);
  rot3(b.LeftUpLeg, P.hpLX, 0, P.hpLZ);
  rot3(b.LeftLeg, P.knL, 0, 0);
  rot3(b.RightUpLeg, P.hpRX, 0, P.hpRZ);
  rot3(b.RightLeg, P.knR, 0, 0);
  // fists around held items
  if (rig.gripR) { for (const g of rig.grip.R) g.b.quaternion.multiply(g.q); b.RightHand.updateMatrixWorld(true); }
  if (rig.gripL) { for (const g of rig.grip.L) g.b.quaternion.multiply(g.q); b.LeftHand.updateMatrixWorld(true); }
  if (rig.item && (rig.itemType === 'bigflag' || rig.itemType === 'flag' || rig.itemType === 'placard')) {
    rig.item.rotation.z = P.itemZ; rig.item.rotation.x = P.itemX;
  }
  updateFace(rig, P, dt);
}

// Facial animation: mouth from the action layer (talk / chant / shout / pain),
// smile for calm crowd members, eye saccades and blinks.
function updateFace(rig, P, dt) {
  const f = rig.face;
  if (!f) return;
  const k = 1 - Math.exp(-dt * 18);
  f.mouth += (Math.max(0, Math.min(1, P.mouth)) - f.mouth) * k;
  f.smileV += (Math.max(0, Math.min(1, P.smile)) - f.smileV) * (1 - Math.exp(-dt * 4));
  f.moodV += (Math.max(-1, Math.min(1, P.brow || 0)) - f.moodV) * (1 - Math.exp(-dt * 5));
  const mi = f.mesh && f.mesh.morphTargetInfluences;
  if (mi) {
    if (f.open !== undefined) mi[f.open] = f.mouth;
    if (f.smile !== undefined) mi[f.smile] = f.smileV * (1 - f.mouth * 0.6);
    // ARKit brows: anger pulls them down, fear / pain raises the inner brows
    if (f.browDown !== undefined) mi[f.browDown] = Math.max(0, f.moodV) * 0.9;
    if (f.browUp !== undefined) mi[f.browUp] = Math.max(0, -f.moodV) * 0.9 + f.smileV * 0.15;
    // rounded lips on the open phase of chants
    if (f.funnel !== undefined) mi[f.funnel] = f.mouth > 0.2 && f.moodV >= 0 ? (0.5 + 0.5 * Math.sin(rig.phase * 0.7 + f.blinkT)) * f.mouth * 0.35 : 0;
  }
  if (!f.eyes.length && f.blinkM === undefined) return;
  // saccades: quick small gaze jumps; occasional blink (eyeballs squash behind the lids)
  f.sacT -= dt;
  if (f.sacT <= 0) { f.sacT = 0.4 + Math.random() * 1.8; f.sx = (Math.random() - 0.5) * 0.5; f.sy = (Math.random() - 0.5) * 0.22; }
  f.blinkT -= dt;
  if (f.blinkT <= 0) { f.blink = 0.14; f.blinkT = 2 + Math.random() * 4; }
  if (f.blink > 0) f.blink -= dt;
  // blendshape lids where the head has them, otherwise squash the eyeballs behind the lids
  if (f.blinkM !== undefined) mi[f.blinkM] = f.blink > 0 ? Math.sin(Math.min(1, f.blink / 0.14) * Math.PI) : Math.max(0, -f.moodV) * 0.15;
  const b = f.blink > 0 && f.blinkM === undefined ? 0.12 : 1;
  for (const e of f.eyes) {
    e.quaternion.copy(e.userData.restQ);
    rotWorld(e, cy, f.sx + P.hdY * -0.3);
    rotWorld(e, cx, f.sy);
    e.scale.set(1, b, 1);
    e.updateMatrixWorld(true);
  }
}

export function setHumanShadows(rig, on) { for (const m of rig.meshes) m.castShadow = on && !m.userData.detail; }

// ------------------------------------------------------------------ outfits
const SKIN_TONES = [0xf3d2bd, 0xe8b996, 0xd9a07a, 0xc08562, 0xa06a48, 0x84553a, 0x6a412b, 0x4d2e1f, 0xdcb08c, 0xb98a6a];
export function skinMul(hex) {
  const c = new THREE.Color(hex);
  return new THREE.Color(c.r / SKIN_AVG.r, c.g / SKIN_AVG.g, c.b / SKIN_AVG.b);
}
export function randomSkin(rng) { return SKIN_TONES[Math.floor(rng() * SKIN_TONES.length)]; }

// Build a procedural environment map (overcast sky + warm horizon) for reflections.
export function makeEnvMap(renderer) {
  const scene = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: `varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(vec3(0.42,0.38,0.34), vec3(0.62,0.6,0.58), smoothstep(-0.05,0.25,h)); c = mix(c, vec3(0.3,0.32,0.36), smoothstep(0.3,1.0,h)); c += vec3(1.0,0.45,0.15)*smoothstep(0.15,-0.05,abs(h-0.03))*0.25; c = mix(vec3(0.12,0.11,0.1), c, smoothstep(-0.2,0.0,h)); gl_FragColor = vec4(c,1.0);} `,
  });
  scene.add(new THREE.Mesh(geo, mat));
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0.04);
  pm.dispose();
  Humans.envMap = rt.texture;
  return rt.texture;
}
