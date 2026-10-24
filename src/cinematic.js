// Short, skippable camera sequences (Level 2 introductions and the victory).
//
// A cinematic is a list of shots. Each shot eases from pose `a` to pose `b`
// ({ pos, look, fov }), given as functions so they can follow moving characters;
// the pose 'rig' is the normal over-the-shoulder camera of that frame, so a shot can
// blend back into gameplay. The world keeps running underneath (in game time, so
// seeded runs stay reproducible); the player's controls are ignored and the player
// cannot be hurt. Space, Enter, a click or a tap skips (after a short grace period).
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const ease = (u) => u * u * (3 - 2 * u);
const _p = new THREE.Vector3(), _l = new THREE.Vector3();

export class Cinematic {
  // o: { id, shots: [{ dur, a, b }], title, sub, titleAt: [from, to], line, lineAt, onDone, sting }
  constructor(game, o) {
    this.g = game; this.o = o; this.id = o.id;
    this.t = 0;
    this.total = o.shots.reduce((s, sh) => s + sh.dur, 0);
  }

  begin() {
    const o = this.o;
    $('cine').classList.remove('hidden');
    $('cine-title').textContent = o.title || ''; $('cine-sub').textContent = o.sub || '';
    $('cine-line').textContent = o.line || '';
    $('cine-card').classList.remove('show'); $('cine-line').classList.remove('show');
    $('app').classList.add('cine-on');
    if (o.sting) this.g.audio.music.sting(o.sting);
    return this;
  }

  // rig: the follow camera's pose this frame ({ pos, look, fov })
  update(dt, rig) {
    const o = this.o, cam = this.g.camera;
    this.t += dt;
    if (this.t >= this.total) return this.finish(false);
    let t0 = 0, sh = o.shots[0];
    for (const s of o.shots) { if (this.t < t0 + s.dur) { sh = s; break; } t0 += s.dur; }
    const u = ease(Math.min(1, (this.t - t0) / sh.dur));
    const A = sh.a === 'rig' ? rig : sh.a(), B = sh.b === 'rig' ? rig : sh.b();
    _p.lerpVectors(A.pos, B.pos, u); _l.lerpVectors(A.look, B.look, u);
    cam.position.copy(_p); cam.lookAt(_l);
    const fov = A.fov + (B.fov - A.fov) * u;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const ta = o.titleAt || [0.3, this.total - 0.3], la = o.lineAt || [0.6, this.total - 0.2];
    $('cine-card').classList.toggle('show', !!o.title && this.t >= ta[0] && this.t < ta[1]);
    $('cine-line').classList.toggle('show', !!o.line && this.t >= la[0] && this.t < la[1]);
  }

  skip() { if (this.t > 0.3) this.finish(true); }

  // end (or cancel) the sequence and hand the camera back
  finish(skipped, silent = false) {
    if (this.done) return;
    this.done = true;
    $('cine').classList.add('hidden');
    $('app').classList.remove('cine-on');
    const g = this.g;
    g.cinematic = null;
    g.cameraRig.fov = g.camera.fov; // eases back to the gameplay field of view
    g.cameraRig.smoothPivot = null;
    if (!silent && this.o.onDone) this.o.onDone(skipped);
  }
}

// Shot helpers ------------------------------------------------------------------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const head = (n, h = 1.5) => V(n.pos.x, n.pos.y + h, n.pos.z);

// a fixed spot in front of a character, low, looking up at them
export function frontOf(n, dist, height, side = 0, fov = 50) {
  return () => {
    const f = V(Math.sin(n.heading), 0, Math.cos(n.heading)), r = V(f.z, 0, -f.x);
    return { pos: head(n, height).addScaledVector(f, dist).addScaledVector(r, side), look: head(n, 1.35), fov };
  };
}

// circling a point (another character, or the midpoint of two), radius r
export function orbit(center, r, height, angle, fov = 48, lookH = 1.3) {
  return () => {
    const c = center();
    return { pos: V(c.x + Math.sin(angle) * r, c.y + height, c.z + Math.cos(angle) * r), look: V(c.x, c.y + lookH, c.z), fov };
  };
}

// from behind the officer, zoomed onto a distant character (a telephoto look)
export function overShoulderAt(player, target, fov) {
  return () => {
    const d = V(target.pos.x - player.pos.x, 0, target.pos.z - player.pos.z).normalize(), r = V(d.z, 0, -d.x);
    return { pos: head(player, 1.8).addScaledVector(d, -1.6).addScaledVector(r, -0.6), look: head(target, 1.4), fov };
  };
}
