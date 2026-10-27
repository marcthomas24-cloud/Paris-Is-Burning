// Far-distance crowd: human models baked into static poses, decimated by
// vertex clustering, coloured per garment region and drawn with instancing.
// Used for distant AI agents (LOD 2) and the large background crowd.
import * as THREE from 'three';
import { Humans, CIV_KINDS } from './humans.js';

const canon = (n) => n.replace(/^mixamorig:?/, '');

function textureSampler(tex) {
  if (!tex || !tex.image) return null;
  const img = tex.image;
  const w = Math.min(256, img.width || 256), h = Math.min(256, img.height || 256);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  try { ctx.drawImage(img, 0, 0, w, h); } catch (e) { return null; }
  const data = ctx.getImageData(0, 0, w, h).data;
  return (u, v) => {
    // glTF textures: flipY = false
    const x = Math.min(w - 1, Math.max(0, Math.floor((u - Math.floor(u)) * w)));
    const y = Math.min(h - 1, Math.max(0, Math.floor((v - Math.floor(v)) * h)));
    const i = (y * w + x) * 4;
    return [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
  };
}

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 1e-5) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6; if (h < 0) h += 1; }
  return [h, mx ? d / mx : 0, mx];
}

// parts: 0 skin, 1 top, 2 bottom, 3 shoes, 4 hair, 5 keep baked colour
function classify(kind, meshName, boneName, rgb, y, top) {
  const [h, s, v] = hsv(...rgb);
  if (kind === 'male') {
    if (/Top/.test(meshName)) return 1;
    if (/Bottom/.test(meshName)) return 2;
    if (/Footwear/.test(meshName)) return 3;
    if (/Head/.test(meshName) && y > top - 0.085) return 4;
    return 0;
  }
  // Michelle: by bone + texture colour
  if (/Foot|Toe/.test(boneName)) return 3;
  if (/Head|Neck/.test(boneName)) return y > top - 0.13 || v < 0.22 ? 4 : 0;
  const skin = h > 0.02 && h < 0.11 && s > 0.3 && v < 0.75 && v > 0.15;
  if (skin) return 0;
  if (h > 0.1 && h < 0.18 && s > 0.4) return 2; // yellow trousers
  if (/UpLeg|Leg/.test(boneName)) return 2;
  if (v < 0.3) return 1; // dark top
  return 5;
}

function bake(kind, clipAlias, time, cell = 0.06) {
  const T = Humans.templates[kind];
  const model = T.scene; // template is posed temporarily, then restored
  const mixer = new THREE.AnimationMixer(model);
  const clip = Humans.clips[kind][clipAlias];
  const action = mixer.clipAction(clip); action.play();
  mixer.setTime(time);
  T.holder.updateMatrixWorld(true);
  const pos = [], col = [], part = [];
  const v = new THREE.Vector3();
  model.traverse((o) => {
    if (!o.isSkinnedMesh || /Teeth|Headwear|Eye|Beard/.test(o.name)) return;
    const g = o.geometry;
    const P = g.attributes.position, UV = g.attributes.uv, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
    const sample = textureSampler(o.material.map);
    const idx = g.index ? g.index.array : null;
    const nTri = idx ? idx.length / 3 : P.count / 3;
    const bones = o.skeleton.bones;
    const vpos = new Float32Array(P.count * 3), vcol = new Float32Array(P.count * 3), vpart = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i);
      o.applyBoneTransform(i, v);
      v.applyMatrix4(o.matrixWorld);
      vpos.set([v.x, v.y, v.z], i * 3);
      const rgb = sample && UV ? sample(UV.getX(i), UV.getY(i)) : [0.5, 0.5, 0.5];
      // dominant bone
      let bi = SI.getX(i), bw = SW.getX(i);
      for (const k of ['getY', 'getZ', 'getW']) if (SW[k](i) > bw) { bw = SW[k](i); bi = SI[k](i); }
      const bn = canon(bones[bi] ? bones[bi].name : '');
      const PA = g.attributes.part;
      if (PA) { const pp = PA.getX(i); vpart[i] = pp === 5 ? 0 : pp === 0 && v.y > T.top - 0.085 ? 4 : pp; }
      else vpart[i] = classify(kind, o.name, bn, rgb, v.y, T.top);
      vcol.set(rgb, i * 3);
    }
    for (let t = 0; t < nTri; t++) for (let k = 0; k < 3; k++) {
      const i = idx ? idx[t * 3 + k] : t * 3 + k;
      pos.push(vpos[i * 3], vpos[i * 3 + 1], vpos[i * 3 + 2]);
      col.push(vcol[i * 3], vcol[i * 3 + 1], vcol[i * 3 + 2]);
      part.push(vpart[i]);
    }
  });
  mixer.stopAllAction(); mixer.uncacheRoot(model);
  model.traverse((o) => { if (o.isBone && o.userData.bindQ) o.quaternion.copy(o.userData.bindQ); });
  T.holder.updateMatrixWorld(true);
  return decimate(pos, col, part, cell);
}

// Vertex clustering: snap to a grid, merge, drop collapsed triangles.
function decimate(pos, col, part, cell) {
  const map = new Map();
  const outP = [], outC = [], outPart = [], cnt = [];
  const index = [];
  const key = (x, y, z, p) => `${Math.round(x / cell)},${Math.round(y / cell)},${Math.round(z / cell)},${p}`;
  const vid = [];
  for (let i = 0; i < pos.length / 3; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], p = part[i];
    const k = key(x, y, z, p);
    let id = map.get(k);
    if (id === undefined) { id = outPart.length; map.set(k, id); outP.push(0, 0, 0); outC.push(0, 0, 0); outPart.push(p); cnt.push(0); }
    outP[id * 3] += x; outP[id * 3 + 1] += y; outP[id * 3 + 2] += z;
    outC[id * 3] += col[i * 3]; outC[id * 3 + 1] += col[i * 3 + 1]; outC[id * 3 + 2] += col[i * 3 + 2];
    cnt[id]++;
    vid.push(id);
  }
  for (let i = 0; i < cnt.length; i++) for (let k = 0; k < 3; k++) { outP[i * 3 + k] /= cnt[i]; outC[i * 3 + k] /= cnt[i]; }
  for (let t = 0; t < vid.length; t += 3) {
    const a = vid[t], b = vid[t + 1], c = vid[t + 2];
    if (a !== b && b !== c && a !== c) index.push(a, b, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(outP, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(outC, 3));
  g.setAttribute('part', new THREE.Float32BufferAttribute(outPart, 1));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

function impostorMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float part;
        attribute vec3 iSkin; attribute vec3 iTop; attribute vec3 iBottom; attribute vec3 iShoes; attribute vec3 iHair; attribute float iPat;`)
      .replace('#include <color_vertex>', `#include <color_vertex>
        {
          float l = dot(vColor.rgb, vec3(0.299, 0.587, 0.114));
          vec3 c = vColor.rgb;
          if (part < 0.5) c = vColor.rgb * iSkin;
          else if (part < 1.5) {
            c = iTop * (0.45 + l * 1.4);
            if (iPat > 0.5) { float ax = abs(position.x); c = ax < 0.06 ? vec3(0.66, 0.03, 0.04) : ax < 0.08 ? vec3(0.85) : vec3(0.012, 0.02, 0.07); }
          }
          else if (part < 2.5) c = iBottom * (0.45 + l * 1.4);
          else if (part < 3.5) c = iShoes * (0.5 + l);
          else if (part < 4.5) c = iHair * (0.6 + l);
          vColor.rgb = c;
        }`);
  };
  m.customProgramCacheKey = () => 'impostor-v1';
  return m;
}

export class FarCrowd {
  // cell: decimation grid (m); the distant background uses a coarser one
  constructor(scene, capacity = 420, cell = 0.06) {
    this.scene = scene;
    this.sets = {};
    this.capacity = capacity;
    const mat = impostorMaterial();
    for (const kind of CIV_KINDS) for (const pose of ['idle', 'walk']) {
      const geo = bake(kind, pose === 'idle' ? 'idle' : 'walk', pose === 'idle' ? 0.4 : 0.25, cell);
      const n = capacity;
      const attrs = {};
      for (const a of ['iSkin', 'iTop', 'iBottom', 'iShoes', 'iHair']) { attrs[a] = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); geo.setAttribute(a, attrs[a]); }
      attrs.iPat = new THREE.InstancedBufferAttribute(new Float32Array(n), 1); geo.setAttribute('iPat', attrs.iPat);
      const mesh = new THREE.InstancedMesh(geo, mat, n);
      mesh.count = 0; mesh.castShadow = false; mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      this.sets[`${kind}_${pose}`] = { mesh, attrs, n: 0, tris: geo.index.count / 3 };
    }
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3(); this.p = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
  }

  begin() { for (const s of Object.values(this.sets)) s.n = 0; }

  // o: {x, y, z, heading, scale, bob, colors:{skin,top,bottom,shoes,hair}, pat}
  add(kind, walking, o) {
    const set = this.sets[`${kind}_${walking ? 'walk' : 'idle'}`] || this.sets[`male_${walking ? 'walk' : 'idle'}`];
    if (set.n >= this.capacity) return;
    const i = set.n++;
    this.p.set(o.x, o.y + (o.bob || 0), o.z);
    this.q.setFromAxisAngle(this.up, o.heading);
    this.s.setScalar(o.scale || 1);
    this.m.compose(this.p, this.q, this.s);
    set.mesh.setMatrixAt(i, this.m);
    const C = o.colors;
    set.attrs.iSkin.setXYZ(i, C.skin.r, C.skin.g, C.skin.b);
    set.attrs.iTop.setXYZ(i, C.top.r, C.top.g, C.top.b);
    set.attrs.iBottom.setXYZ(i, C.bottom.r, C.bottom.g, C.bottom.b);
    set.attrs.iShoes.setXYZ(i, C.shoes.r, C.shoes.g, C.shoes.b);
    set.attrs.iHair.setXYZ(i, C.hair.r, C.hair.g, C.hair.b);
    set.attrs.iPat.setX(i, o.pat ? 1 : 0);
  }

  end() {
    for (const s of Object.values(this.sets)) {
      s.mesh.count = s.n;
      s.mesh.instanceMatrix.needsUpdate = true;
      for (const a of Object.values(s.attrs)) a.needsUpdate = true;
    }
  }
}

// Colour bundle for an outfit (linear colours)
export function outfitColors(o) {
  const c = (h) => new THREE.Color(h);
  const female = o.gender === 'f';
  return {
    skin: female ? o.skinMul.clone() : o.skinMul.clone(),
    top: c(o.vest ? 0xb8c818 : o.shellColor ??(o.top === 'hoodie' && female ? 0x141414 : o.topColor ?? 0x222222)),
    bottom: c(o.pants ?? 0x2a3a5a),
    shoes: c(o.shoes ?? 0xeeeeee),
    hair: c(o.headscarf ?? (o.hood ? o.topColor : o.hat === 'cap' || o.hat === 'beanie' ? o.hatColor : o.hair ?? 0x111111)),
  };
}
