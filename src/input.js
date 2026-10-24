// Keyboard / mouse input with pointer lock and per-frame "pressed" edges.
// Touch controls (touch.js) feed the same keys/buttons plus an analog stick axis.
// When pointer lock is unavailable or refused (embedded browsers, Chrome's ~1 s
// cool-down after Esc), the mouse still steers: plain movement over the canvas
// turns the camera, and resting the cursor near the left/right edge keeps turning.
const SPIKE = 160; // px per event: larger jumps are a known pointer-lock glitch on Windows

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
    this.cursor = null; // last cursor position over the canvas (unlocked only)
    this.axis = { x: 0, y: 0 }; // virtual stick: x right, y down (-1..1)
    this.touch = matchMedia('(hover: none) and (pointer: coarse)').matches || /[?&]touch/.test(location.search);
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code); this.edges.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.buttons.clear(); this.cursor = null; });
    canvas.addEventListener('mousedown', (e) => { this.buttons.add(e.button); this.edges.add('Mouse' + e.button); });
    addEventListener('mouseup', (e) => this.buttons.delete(e.button));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => {
      const mx = Math.max(-SPIKE, Math.min(SPIKE, e.movementX || 0));
      const my = Math.max(-SPIKE, Math.min(SPIKE, e.movementY || 0));
      if (this.locked) { this.dx += mx; this.dy += my; return; }
      if (this.touch || e.target !== canvas) { this.cursor = null; return; }
      this.dx += mx; this.dy += my;
      this.cursor = { x: e.clientX / innerWidth, y: e.clientY / innerHeight };
    });
    canvas.addEventListener('mouseleave', () => { this.cursor = null; });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.dx = this.dy = 0; this.cursor = null;
      if (this.locked) this.wasLocked = true;
      else if (this.wasLocked && this.onLockLost) this.onLockLost();
    });
  }

  // virtual buttons from the touch controls: 'Mouse0', 'Mouse2', key codes
  setButton(code, down) {
    if (code.startsWith('Mouse')) { const b = +code.slice(5); if (down) this.buttons.add(b); else this.buttons.delete(b); }
    else if (down) this.keys.add(code); else this.keys.delete(code);
    if (down) this.edges.add(code);
  }

  look(dx, dy) { this.dx += dx; this.dy += dy; }

  lock() {
    this.dx = this.dy = 0;
    if (this.touch || this.locked) return; // no pointer lock on touch screens
    const c = this.canvas;
    if (!c.requestPointerLock) return;
    try {
      // raw movement (no OS acceleration) where supported; plain lock otherwise
      const p = c.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { const q = c.requestPointerLock(); if (q && q.catch) q.catch(() => {}); } catch (e) { /* unlocked steering */ } });
    } catch (e) {
      try { c.requestPointerLock(); } catch (e2) { /* pointer lock unavailable: unlocked steering */ }
    }
  }

  unlock() { this.wasLocked = false; if (document.pointerLockElement) document.exitPointerLock(); }

  // unlocked mouse: -1..1 while the cursor rests near the left/right edge of the view
  edgeTurn() {
    if (this.locked || this.touch || !this.cursor) return 0;
    const x = this.cursor.x, E = 0.08;
    if (x < E) return -(1 - x / E);
    if (x > 1 - E) return (x - (1 - E)) / E;
    return 0;
  }

  down(code) { return this.keys.has(code); }
  pressed(code) { return this.edges.has(code); }
  mouse(b) { return this.buttons.has(b); }
  consumeMouse() { const r = [this.dx, this.dy]; this.dx = 0; this.dy = 0; return r; }
  endFrame() { this.edges.clear(); }
}
