// Dialogue: subtitled lines with a speaker and timed choices (keys 1-3, click or tap).
// Shared by the State campaign's Level 6 (talk) and, when it is built, the Revolution campaign
// (docs/revolution-plan.md). A conversation is a generator function the caller writes:
//
//   function* talk(d) {
//     yield d.line('MEDIC', 'We have six people who cannot walk.');
//     const k = yield d.ask(['I will get you a corridor.', 'Not now.'], { def: 1 });
//     if (k === 0) yield d.line('MEDIC', 'Thank you.');
//     return k;                                   // handed to onEnd
//   }
//   dialogue.start(talk, { onEnd: (result, cut) => ... });
//
// Lines run for a time that follows their length and can be cut short with E; a choice waits
// at most `limit` seconds and then takes `def` (saying nothing is a choice too). The player's
// pick is shown as their own line. Every exchange is kept short: the brief's rule is nothing
// over ten seconds. The box lives in the HUD; while it is open the level should keep the
// officer's hands still (missions.talking, read by player.js).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Dialogue {
  constructor(game, colors = {}) {
    this.game = game;
    this.colors = colors; // speaker name -> CSS colour
    this.gen = null; this.op = null; this.onEnd = null;
    this.log = [];        // { who, text } of everything said, for tests and the results
    this.el = document.getElementById('dialogue');
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = 'dialogue'; this.el.className = 'hidden';
      (document.getElementById('hud') || document.body).appendChild(this.el);
    }
    this.el.innerHTML = '<div class="dl-who"></div><div class="dl-text"></div><div class="dl-choices"></div><div class="dl-time"><div></div></div>';
    this.whoEl = this.el.querySelector('.dl-who'); this.textEl = this.el.querySelector('.dl-text');
    this.chEl = this.el.querySelector('.dl-choices'); this.timeEl = this.el.querySelector('.dl-time > div');
    // a tap or click on a choice (the keys are read in update)
    this.chEl.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-choice]');
      if (!b || !this.op || this.op.kind !== 'ask') return;
      e.preventDefault(); e.stopPropagation();
      this._choose(+b.dataset.choice);
    });
  }

  get open() { return !!this.gen; }
  // who is speaking now ('YOU' while the player's pick shows), or null
  get speaker() { return this.op && this.op.kind === 'line' ? this.op.who : null; }

  // ---- the ops a conversation yields
  line(who, text, dur = null) { return { kind: 'line', who, text, dur: dur ?? clamp(1.3 + text.length / 24, 1.8, 4.6), t: 0 }; }
  ask(options, { def = options.length - 1, limit = 8 } = {}) { return { kind: 'ask', options: options.slice(0, 3), def, limit, t: 0 }; }
  wait(dur) { return { kind: 'wait', dur, t: 0 }; }

  start(fn, { onEnd = null, args = [] } = {}) {
    if (this.gen) this.close(true);
    this.gen = fn(this, ...args); this.onEnd = onEnd; this.op = null; this.skipArm = 0.25;
    this.el.classList.remove('hidden');
    this._next(undefined);
  }

  // end now (cut: the conversation was broken off, its generator does not finish)
  close(cut = true, result = undefined) {
    if (!this.gen) return;
    const done = this.onEnd;
    this.gen = null; this.op = null; this.onEnd = null;
    this.el.classList.add('hidden');
    if (done) done(result, cut);
  }

  _next(v) {
    let r;
    try { r = this.gen.next(v); } catch (e) { console.error(e); this.close(true); return; }
    if (r.done) { this.close(false, r.value); return; }
    this.op = r.value;
    this._render();
  }

  _choose(i) {
    const op = this.op;
    if (!op || op.kind !== 'ask' || i < 0 || i >= op.options.length) return;
    this.game.audio.ui('click');
    // the pick, said aloud; then the conversation goes on with it
    this.op = { kind: 'line', who: 'YOU', text: op.options[i], dur: clamp(0.9 + op.options[i].length / 30, 1.1, 2.6), t: 0, then: i };
    this.log.push({ who: 'YOU', text: op.options[i] });
    this._render();
  }

  _render() {
    const op = this.op;
    if (!op) return;
    if (op.kind === 'line') {
      const c = this.colors[op.who] || (op.who === 'YOU' ? '#9fd0ff' : '#ffb02e');
      this.whoEl.textContent = op.who; this.whoEl.style.color = c;
      this.textEl.textContent = op.text;
      this.chEl.innerHTML = '';
      this.el.classList.toggle('you', op.who === 'YOU');
      if (op.then === undefined) this.log.push({ who: op.who, text: op.text });
    } else if (op.kind === 'ask') {
      this.whoEl.textContent = 'YOUR ANSWER'; this.whoEl.style.color = '#9fd0ff';
      this.textEl.textContent = '';
      this.el.classList.remove('you');
      this.chEl.innerHTML = op.options.map((o, i) => `<button data-choice="${i}" class="dl-ch${i === op.def ? ' def' : ''}"><b>${i + 1}</b>${esc(o)}</button>`).join('');
    } else { this.whoEl.textContent = ''; this.textEl.textContent = ''; this.chEl.innerHTML = ''; }
  }

  update(dt) {
    if (!this.gen || !this.op) return;
    const op = this.op, I = this.game.input;
    op.t += dt;
    this.skipArm = Math.max(0, this.skipArm - dt);
    if (op.kind === 'ask') {
      this.timeEl.style.width = `${Math.round(clamp(1 - op.t / op.limit, 0, 1) * 100)}%`;
      for (let i = 0; i < op.options.length; i++) if (I.pressed('Digit' + (i + 1)) || I.pressed('Numpad' + (i + 1))) { this._choose(i); return; }
      if (op.t >= op.limit) this._choose(op.def);
      return;
    }
    this.timeEl.style.width = '0%';
    const skip = this.skipArm <= 0 && (I.pressed('KeyE') || I.pressed('Space'));
    if (op.t >= op.dur || (skip && op.t > 0.35)) this._next(op.then);
  }
}
