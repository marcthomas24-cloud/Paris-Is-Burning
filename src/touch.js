// Touch controls: a floating stick on the left, drag-to-look on the right and
// a compact cluster of action buttons. Everything feeds Input (virtual keys,
// buttons and an analog axis), so gameplay code is the same as with a keyboard.
const $ = (id) => document.getElementById(id);

const LOOK_GAIN = 1.5;   // touch drag pixels -> mouse-look pixels
const STICK_R = 52;      // stick travel radius in CSS pixels
const DEADZONE = 0.18;

export class TouchControls {
  constructor(game) {
    this.game = game;
    this.input = game.input;
    this.root = $('touch-ui');
    this.base = $('stick-base');
    this.knob = $('stick-knob');
    this.stick = null;   // {id, x0, y0}
    this.looks = new Map(); // pointerId -> {x, y}
    this.sprint = false;
    this.enabled = false;
    if (this.input.touch) this.enable();
    // a touch on a hybrid laptop switches touch controls on for the session
    addEventListener('touchstart', () => this.enable(), { once: true, passive: true });

    this.root.addEventListener('pointerdown', (e) => this._down(e));
    this.root.addEventListener('pointermove', (e) => this._move(e));
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) this.root.addEventListener(ev, (e) => this._up(e));

    for (const b of this.root.querySelectorAll('[data-k]')) {
      const code = b.dataset.k;
      const press = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (b.classList.contains('toggle')) { this.sprint = !this.sprint; b.classList.toggle('on', this.sprint); this.input.setButton(code, this.sprint); return; }
        b.classList.add('on'); this.input.setButton(code, true);
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* synthetic event */ }
      };
      const release = (e) => {
        if (b.classList.contains('toggle')) return;
        e.preventDefault(); b.classList.remove('on'); this.input.setButton(code, false);
      };
      b.addEventListener('pointerdown', press);
      b.addEventListener('pointerup', release);
      b.addEventListener('pointercancel', release);
    }
    // the interaction prompt itself is the button for E on touch screens
    $('prompt').addEventListener('pointerdown', (e) => { if (!this.enabled) return; e.preventDefault(); this.input.setButton('KeyE', true); this.input.setButton('KeyE', false); });
    addEventListener('blur', () => this.releaseAll());
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.input.touch = true;
    document.body.classList.add('touch');
    this.input.unlock();
  }

  releaseAll() {
    this.stick = null; this.looks.clear();
    this.input.axis.x = this.input.axis.y = 0;
    this.base.classList.remove('active');
    for (const b of this.root.querySelectorAll('[data-k]')) {
      if (b.classList.contains('toggle')) continue;
      b.classList.remove('on'); this.input.setButton(b.dataset.k, false);
    }
  }

  _down(e) {
    if (!this.enabled || e.target.closest('button')) return;
    e.preventDefault();
    try { this.root.setPointerCapture(e.pointerId); } catch (err) { /* synthetic event */ }
    if (!this.stick && e.clientX < innerWidth * 0.42) {
      this.stick = { id: e.pointerId, x0: e.clientX, y0: e.clientY };
      this.base.style.left = e.clientX + 'px'; this.base.style.top = e.clientY + 'px';
      this.base.classList.add('active');
      this._knob(0, 0);
    } else this.looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  _move(e) {
    if (!this.enabled) return;
    if (this.stick && e.pointerId === this.stick.id) {
      let dx = e.clientX - this.stick.x0, dy = e.clientY - this.stick.y0;
      const d = Math.hypot(dx, dy);
      if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
      this._knob(dx, dy);
      const k = Math.min(1, d / STICK_R);
      const m = k < DEADZONE ? 0 : (k - DEADZONE) / (1 - DEADZONE);
      this.input.axis.x = d > 0 ? (dx / Math.min(d, STICK_R)) * m : 0;
      this.input.axis.y = d > 0 ? (dy / Math.min(d, STICK_R)) * m : 0;
      return;
    }
    const l = this.looks.get(e.pointerId);
    if (l) { this.input.look((e.clientX - l.x) * LOOK_GAIN, (e.clientY - l.y) * LOOK_GAIN); l.x = e.clientX; l.y = e.clientY; }
  }

  _up(e) {
    if (this.stick && e.pointerId === this.stick.id) {
      this.stick = null;
      this.input.axis.x = this.input.axis.y = 0;
      this.base.classList.remove('active');
      this._knob(0, 0);
    }
    this.looks.delete(e.pointerId);
  }

  _knob(dx, dy) { this.knob.style.transform = `translate(${dx}px, ${dy}px)`; }
}
