// Rocketbox (3ds Max Biped FBX) -> game-ready GLB with Mixamo bone names,
// one skinned mesh, texture atlas, per-vertex garment part and selected
// facial blendshapes.
import * as THREE from 'three';
import { TGALoader } from 'three/addons/loaders/TGALoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const BONE_MAP = [
  [/^Bip01_Pelvis$/, 'Hips'], [/^Bip01_Spine$/, 'Spine'], [/^Bip01_Spine1$/, 'Spine1'], [/^Bip01_Spine2$/, 'Spine2'],
  [/^Bip01_Neck$/, 'Neck'], [/^Bip01_Head$/, 'Head'], [/^Bip01_LEye$/, 'LeftEye'], [/^Bip01_REye$/, 'RightEye'], [/^Bip01_MJaw$/, 'Jaw'],
];
for (const [s, S] of [['L', 'Left'], ['R', 'Right']]) {
  BONE_MAP.push([new RegExp(`^Bip01_${s}_Clavicle$`), `${S}Shoulder`], [new RegExp(`^Bip01_${s}_UpperArm$`), `${S}Arm`], [new RegExp(`^Bip01_${s}_Forearm$`), `${S}ForeArm`], [new RegExp(`^Bip01_${s}_Hand$`), `${S}Hand`],
    [new RegExp(`^Bip01_${s}_Thigh$`), `${S}UpLeg`], [new RegExp(`^Bip01_${s}_Calf$`), `${S}Leg`], [new RegExp(`^Bip01_${s}_Foot$`), `${S}Foot`], [new RegExp(`^Bip01_${s}_Toe0$`), `${S}ToeBase`]);
  ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].forEach((f, fi) => {
    BONE_MAP.push([new RegExp(`^Bip01_${s}_Finger${fi}$`), `${S}Hand${f}1`], [new RegExp(`^Bip01_${s}_Finger${fi}1$`), `${S}Hand${f}2`], [new RegExp(`^Bip01_${s}_Finger${fi}2$`), `${S}Hand${f}3`]);
  });
}

// output blendshape name -> [source names] (summed, ARKit set)
const MORPHS = {
  mouthOpen: ['AK_25_JawOpen'],
  mouthSmile: ['AK_44_MouthSmileLeft', 'AK_45_MouthSmileRight'],
  eyeBlink: ['AK_09_EyeBlinkLeft', 'AK_10_EyeBlinkRight'],
  browInnerUp: ['AK_03_BrowInnerUp'],
  browDown: ['AK_01_BrowDownLeft', 'AK_02_BrowDownRight'],
  mouthFunnel: ['AK_32_MouthFunnel'],
};

const tga = new TGALoader();
const loadTga = (url) => new Promise((res, rej) => tga.load(url, (t) => res(t.image), undefined, rej));
// TGALoader returns {data,width,height} (RGBA, already flipped to top-down for flipY=true textures)
function toCanvas(img, size) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); const id = x.createImageData(img.width, img.height); id.data.set(img.data); x.putImageData(id, 0, 0);
  if (!size || size === img.width) return c;
  const d = document.createElement('canvas'); d.width = d.height = size; d.getContext('2d').drawImage(c, 0, 0, size, size); return d;
}
function sampler(img) {
  return (u, v) => { // FBX uv: v up; TGALoader output top-down after its own flip
    u = u - Math.floor(u); v = v - Math.floor(v);
    const x = Math.min(img.width - 1, Math.floor(u * img.width)), y = Math.min(img.height - 1, Math.floor((1 - v) * img.height));
    const i = (y * img.width + x) * 4; return [img.data[i] / 255, img.data[i + 1] / 255, img.data[i + 2] / 255];
  };
}
function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d > 1e-5) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6; if (h < 0) h += 1; }
  return [h, mx ? d / mx : 0, mx];
}

export async function convert(dir, prefix, outName, opts = {}) {
  const log = [];
  const root = await window.loadFbx(dir, `${dir}_facial.fbx`);
  let mesh = null; root.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
  // ---- bones: rename, reparent thighs to the pelvis (keeping world transforms)
  const byName = {};
  root.traverse((o) => { if (o.isBone) { const m = BONE_MAP.find(([re]) => re.test(o.name)); if (m) o.name = m[1]; else o.name = o.name.replace(/^Bip01_?/, 'Face_') || 'Root'; byName[o.name] = o; } });
  byName.Root = root.getObjectByName('Root') || byName.Face_;
  root.updateMatrixWorld(true);
  for (const s of ['Left', 'Right']) { byName.Hips.attach(byName[`${s}UpLeg`]); byName.Spine2.attach(byName[`${s}Shoulder`]); }
  root.updateMatrixWorld(true);
  // ---- geometry: drop unused attrs, keep chosen morphs, index
  const src = mesh.geometry;
  const g = new THREE.BufferGeometry();
  for (const a of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']) g.setAttribute(a, src.attributes[a]);
  const dict = mesh.morphTargetDictionary, mp = src.morphAttributes.position;
  g.morphAttributes.position = Object.entries(MORPHS).map(([k, names]) => {
    const arr = new Float32Array(src.attributes.position.count * 3);
    for (const n of names) { const i = dict[`blendShape1.${n}`]; if (i === undefined) { log.push('missing ' + n); continue; } const m = mp[i]; for (let j = 0; j < arr.length; j++) arr[j] += m.array[j]; }
    const at = new THREE.BufferAttribute(arr, 3); at.name = k; return at;
  });
  g.morphTargetsRelative = true;
  // per-vertex material id (FBX groups)
  const matId = new Float32Array(src.attributes.position.count);
  for (const gr of src.groups) for (let i = gr.start; i < gr.start + gr.count; i++) matId[i] = gr.materialIndex;
  // garment part: 0 skin/head, 1 top, 2 bottom, 3 shoes, 4 hair (alpha cards)
  const T = {};
  for (const t of ['body_color', 'head_color', 'opacity_color', 'body_normal', 'head_normal']) { try { T[t] = await loadTga(`/dl/${dir}/${prefix}_${t}.tga`); } catch (e) { log.push('no ' + t); } }
  const sBody = sampler(T.body_color);
  const bones = mesh.skeleton.bones.map((b) => b.name);
  const P = g.attributes.position, UV = g.attributes.uv, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
  const part = new Float32Array(P.count);
  const wsum = (i, re) => { let w = 0; for (let k = 0; k < 4; k++) if (re.test(bones[SI.getComponent(i, k)] || '')) w += SW.getComponent(i, k); return w; };
  const hist = [0, 0, 0, 0, 0];
  for (let i = 0; i < P.count; i++) {
    const mi = matId[i];
    let p = 0;
    if (mi === 2) p = 4;
    else if (mi === 0) {
      const [h, s, v] = hsv(...sBody(UV.getX(i), UV.getY(i)));
      const skin = h > 0.0 && h < 0.11 && s > 0.2 && s < 0.75 && v > 0.2 && v < 0.98 && (opts.skinTest ? opts.skinTest(h, s, v) : true);
      if (wsum(i, /Foot|ToeBase/) > 0.5) p = 3;
      else if (skin && wsum(i, /Hand|ForeArm|Arm|Neck|Head/) > 0.3) p = 0;
      else if (wsum(i, /UpLeg|^Left_?Leg$|^Right_?Leg$|LeftLeg|RightLeg/) > 0.5) p = 2;
      else if (wsum(i, /Hips/) > 0.6 && !opts.hipsTop) p = 2;
      else p = skin && wsum(i, /Hand/) > 0.5 ? 0 : 1;
    }
    part[i] = p; hist[p]++;
  }
  g.setAttribute('part', new THREE.BufferAttribute(part, 1));
  // ---- atlas: head TL, body TR, hair RGB BL, hair alpha BR (2048 jpeg)
  const A = 2048, H = A / 2;
  const ca = document.createElement('canvas'); ca.width = ca.height = A; const xa = ca.getContext('2d');
  xa.fillStyle = '#000'; xa.fillRect(0, 0, A, A);
  xa.drawImage(toCanvas(T.head_color), 0, 0, H, H);
  xa.drawImage(toCanvas(T.body_color), H, 0, H, H);
  if (T.opacity_color) {
    const oc = toCanvas(T.opacity_color);
    xa.drawImage(oc, 0, H, H, H);
    // alpha as greyscale
    const ox = oc.getContext('2d').getImageData(0, 0, oc.width, oc.height);
    for (let i = 0; i < ox.data.length; i += 4) { const a = ox.data[i + 3]; ox.data[i] = ox.data[i + 1] = ox.data[i + 2] = a; ox.data[i + 3] = 255; }
    const ac = document.createElement('canvas'); ac.width = oc.width; ac.height = oc.height; ac.getContext('2d').putImageData(ox, 0, 0);
    xa.drawImage(ac, H, H, H, H);
  }
  const N = 1024, Hn = N / 2;
  const cn = document.createElement('canvas'); cn.width = cn.height = N; const xn = cn.getContext('2d');
  xn.fillStyle = 'rgb(128,128,255)'; xn.fillRect(0, 0, N, N);
  if (T.head_normal) xn.drawImage(toCanvas(T.head_normal), 0, 0, Hn, Hn);
  if (T.body_normal) xn.drawImage(toCanvas(T.body_normal), Hn, 0, Hn, Hn);
  // remap uvs into the atlas (glTF convention: v down, flipY = false)
  const rect = [[0.5, 0], [0, 0], [0, 0.5]]; // per material id: body, head, hair (x0, y0), size 0.5
  const nuv = new Float32Array(UV.count * 2);
  for (let i = 0; i < UV.count; i++) {
    const [rx, ry] = rect[matId[i]] || rect[0];
    let u = UV.getX(i), v = UV.getY(i); u -= Math.floor(u); v -= Math.floor(v);
    u = Math.min(0.999, Math.max(0.001, u)); v = Math.min(0.999, Math.max(0.001, 1 - v));
    nuv[i * 2] = rx + u * 0.5; nuv[i * 2 + 1] = ry + v * 0.5;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(nuv, 2));
  const before = g.attributes.position.count;
  const gi = mergeVertices(g, 1e-4);
  log.push(`verts ${before} -> ${gi.attributes.position.count}, tris ${gi.index.count / 3}, parts ${hist}`);
  // ---- assemble: Root group (cm -> m) with the armature and one mesh
  const map = new THREE.CanvasTexture(ca); map.flipY = false; map.colorSpace = THREE.SRGBColorSpace; map.userData.mimeType = 'image/jpeg';
  const nmap = new THREE.CanvasTexture(cn); nmap.flipY = false; nmap.userData.mimeType = 'image/jpeg';
  const mat = new THREE.MeshStandardMaterial({ map, normalMap: nmap, roughness: 0.8, metalness: 0, name: outName });
  const out = new THREE.SkinnedMesh(gi, mat); out.name = outName + '_Body';
  out.morphTargetDictionary = {}; Object.keys(MORPHS).forEach((k, i) => (out.morphTargetDictionary[k] = i));
  out.morphTargetInfluences = Object.keys(MORPHS).map(() => 0);
  const scene = new THREE.Group(); scene.name = outName;
  const arm = new THREE.Group(); arm.name = 'Armature'; arm.scale.setScalar(0.01);
  scene.add(arm);
  const top = byName.Hips.parent; // Bip01 root bone
  top.name = 'Root';
  arm.add(top);
  arm.add(out);
  out.position.copy(mesh.position); out.quaternion.copy(mesh.quaternion); out.scale.copy(mesh.scale);
  scene.updateMatrixWorld(true);
  // keep the original inverse bind matrices (bones moved under a new parent but world bind unchanged up to the armature scale)
  const skel = new THREE.Skeleton(mesh.skeleton.bones, mesh.skeleton.boneInverses);
  out.bind(skel, mesh.bindMatrix);
  const exp = new GLTFExporter();
  const glb = await exp.parseAsync(scene, { binary: true, onlyVisible: false });
  const r = await fetch(`/out/${outName}.glb`, { method: 'PUT', body: glb });
  log.push(await r.text());
  // jpeg quality check: export preview images
  return log;
}
