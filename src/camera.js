// Over-the-shoulder third-person camera with collision, shake and crowd-aware height.
import * as THREE from 'three';

export class CameraRig {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.yaw = 0;
    this.pitch = -0.12;
    this.dist = 3.4;
    this.curDist = 3.4;
    this.shakeAmt = 0;
    this.pivot = new THREE.Vector3();
    this.smoothPivot = null;
    this.extraH = 0;
    this.fov = 62;
    this.sens = 1;        // mouse sensitivity multiplier (options screen)
    this.invertY = false;
  }

  // opening establishing shot: starts high and wide, eases into the shoulder view
  intro(dur = 3.2) { this.introT = dur; this.introDur = dur; }

  reset(player) {
    this.yaw = player.heading + Math.PI; // camera behind the player
    this.pitch = -0.12;
    this.smoothPivot = null;
    this.curDist = this.dist;
  }

  shake(a) { this.shakeAmt = Math.min(0.6, this.shakeAmt + a); }
  // brief field-of-view punch (phase changes): restrained, eases out
  kick(deg) { this.fovKick = Math.min(10, (this.fovKick || 0) + deg); }

  rotate(dx, dy) {
    this.yaw -= dx * 0.0026 * this.sens;
    this.pitch = Math.max(-0.95, Math.min(0.5, this.pitch - dy * 0.0021 * this.sens * (this.invertY ? -1 : 1)));
  }

  update(dt, player, crowdDensity) {
    // raise the camera a little in dense crowds so the officer stays visible
    this.extraH += ((crowdDensity > 3 ? 0.55 : crowdDensity > 1 ? 0.25 : 0) - this.extraH) * Math.min(1, dt * 2);
    const head = new THREE.Vector3(player.pos.x, player.pos.y + 1.6 + this.extraH, player.pos.z);
    if (!this.smoothPivot) this.smoothPivot = head.clone();
    this.smoothPivot.lerp(head, 1 - Math.exp(-dt * 18));

    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const fwd = new THREE.Vector3(-Math.sin(this.yaw) * cp, sp, -Math.cos(this.yaw) * cp);
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const shoulder = player.blocking ? 0.75 : 0.55;
    const pivot = this.smoothPivot.clone().addScaledVector(right, shoulder);
    // shoulder offset must not poke into walls either
    const sideHit = this.world.raycast(this.smoothPivot, right, shoulder + 0.3);
    if (sideHit < shoulder + 0.3) pivot.copy(this.smoothPivot).addScaledVector(right, Math.max(0, sideHit - 0.3));

    const wantDist = (player.sprinting ? 3.9 : player.blocking ? 2.8 : this.dist) + this.extraH * 0.8;
    const back = fwd.clone().negate();
    const hit = this.world.raycast(pivot, back, wantDist + 0.3);
    const allowed = Math.max(0.6, hit - 0.3);
    const target = Math.min(wantDist, allowed);
    // pull in instantly, ease back out
    if (target < this.curDist) this.curDist = target;
    else this.curDist += (target - this.curDist) * Math.min(1, dt * 3);

    const pos = pivot.clone().addScaledVector(back, this.curDist);
    pos.y = Math.max(pos.y, 0.35);
    let look = pivot.clone().addScaledVector(fwd, 10);
    if (this.introT > 0) {
      this.introT -= dt;
      const k = 1 - Math.max(0, this.introT) / this.introDur;
      const e = k * k * (3 - 2 * k);
      const flat = new THREE.Vector3(fwd.x, 0, fwd.z).normalize();
      const wide = this.smoothPivot.clone().addScaledVector(flat, -9).add(new THREE.Vector3(0, 6.5, 0)).addScaledVector(right, 3);
      const wideLook = this.smoothPivot.clone().addScaledVector(flat, 40).add(new THREE.Vector3(0, 3, 0));
      pos.lerpVectors(wide, pos, e);
      look.lerpVectors(wideLook, look, e);
    }
    if (this.shakeAmt > 0.001) {
      const s = this.shakeAmt * this.shakeAmt;
      pos.x += (Math.random() - 0.5) * s * 0.5; pos.y += (Math.random() - 0.5) * s * 0.5; pos.z += (Math.random() - 0.5) * s * 0.5;
      this.shakeAmt *= Math.exp(-dt * 7);
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
    this.fovKick = (this.fovKick || 0) * Math.exp(-dt * 4);
    const wantFov = (player.sprinting ? 70 : player.blocking ? 56 : 62) + this.fovKick;
    this.lastPose = { pos: pos.clone(), look: look.clone(), fov: wantFov }; // cinematics blend back to this
    this.fov += (wantFov - this.fov) * Math.min(1, dt * 4);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) { this.camera.fov = this.fov; this.camera.updateProjectionMatrix(); }
  }
}
