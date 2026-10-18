// Keyboard / mouse input with pointer lock and per-frame "pressed" edges.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.edges = new Set();
    this.buttons = new Set();
    this.dx = 0; this.dy = 0;
    this.locked = false;
    this.wasLocked = false;
    this.onLockLost = null;
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code); this.edges.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.buttons.clear(); });
    canvas.addEventListener('mousedown', (e) => { this.buttons.add(e.button); this.edges.add('Mouse' + e.button); });
    addEventListener('mouseup', (e) => this.buttons.delete(e.button));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => {
      if (this.locked) { this.dx += e.movementX; this.dy += e.movementY; }
      else if (this.buttons.size && this.dragLook) { this.dx += e.movementX; this.dy += e.movementY; }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (this.locked) this.wasLocked = true;
      else if (this.wasLocked && this.onLockLost) this.onLockLost();
    });
  }

  lock() {
    try {
      const p = this.canvas.requestPointerLock && this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* pointer lock unavailable (iframe / automation): drag-look still works */ }
  }

  unlock() { this.wasLocked = false; if (document.pointerLockElement) document.exitPointerLock(); }

  down(code) { return this.keys.has(code); }
  pressed(code) { return this.edges.has(code); }
  mouse(b) { return this.buttons.has(b); }
  consumeMouse() { const r = [this.dx, this.dy]; this.dx = 0; this.dy = 0; return r; }
  endFrame() { this.edges.clear(); }
}
