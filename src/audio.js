// Fully synthesised audio (Web Audio API). No audio files are needed, so
// nothing can fail to load; if Web Audio is unavailable every call is a no-op.
export class Audio {
  constructor() {
    this.ctx = null;
    this.listener = { x: 0, z: 0, yaw: 0 };
    this.crowdLevel = 0.5;
    this.enabled = false;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { console.warn('No Web Audio', e); return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.8;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    this.master.connect(comp).connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 1; this.sfx.connect(this.master);
    this.amb = c.createGain(); this.amb.gain.value = 0.9; this.amb.connect(this.master);
    // noise buffers
    const len = c.sampleRate * 2;
    this.white = c.createBuffer(1, len, c.sampleRate);
    this.brown = c.createBuffer(1, len, c.sampleRate);
    const w = this.white.getChannelData(0), b = this.brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { w[i] = Math.random() * 2 - 1; last = (last + 0.02 * w[i]) / 1.02; b[i] = last * 3.5; }
    this.enabled = true;
    this._startAmbience();
    this._timers();
  }

  setListener(x, z, yaw) { this.listener.x = x; this.listener.z = z; this.listener.yaw = yaw; }

  // distance attenuation + stereo pan for a world position
  _spatial(pos, ref = 6, max = 90) {
    if (!pos) return { g: 1, pan: 0 };
    const dx = pos.x - this.listener.x, dz = pos.z - this.listener.z;
    const d = Math.hypot(dx, dz);
    const g = d < ref ? 1 : Math.max(0, ref / d) * Math.max(0, 1 - d / max);
    // camera right vector for yaw: forward = (-sin yaw, -cos yaw)
    const rx = Math.cos(this.listener.yaw), rz = -Math.sin(this.listener.yaw);
    const pan = d > 0.01 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / d)) : 0;
    return { g, pan: pan * 0.8 };
  }

  _out(pos, vol = 1, ref, max) {
    const c = this.ctx;
    const { g, pan } = this._spatial(pos, ref, max);
    const gain = c.createGain(); gain.gain.value = vol * g;
    let node = gain;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; gain.connect(p); p.connect(this.sfx); }
    else gain.connect(this.sfx);
    return { node, level: vol * g };
  }

  _noise(buffer, dest, t0, dur, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer; s.playbackRate.value = rate;
    s.loop = dur > 1.9;
    s.connect(dest);
    s.start(t0, Math.random() * 1.5);
    s.stop(t0 + dur + 0.05);
    return s;
  }

  _env(param, t0, a, peak, d, sustain = 0) {
    param.setValueAtTime(0.0001, t0);
    param.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    param.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t0 + a + d);
  }

  // ------------------------------------------------------------ ambience
  _startAmbience() {
    const c = this.ctx;
    // crowd murmur: two band-limited noise layers with slow modulation
    const mk = (freq, q, vol, rate) => {
      const src = c.createBufferSource(); src.buffer = this.brown; src.loop = true; src.playbackRate.value = rate;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
      const g = c.createGain(); g.gain.value = vol;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.15 + Math.random() * 0.2;
      const lg = c.createGain(); lg.gain.value = vol * 0.4;
      lfo.connect(lg).connect(g.gain); lfo.start();
      src.connect(bp).connect(g).connect(this.amb); src.start();
      return g;
    };
    this.murmur1 = mk(380, 0.8, 0.5, 1);
    this.murmur2 = mk(1100, 1.2, 0.22, 1.3);
    const w = c.createBufferSource(); w.buffer = this.white; w.loop = true;
    const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 2400; wf.Q.value = 0.5;
    this.murmur3 = c.createGain(); this.murmur3.gain.value = 0.03;
    w.connect(wf).connect(this.murmur3).connect(this.amb); w.start();
    // city / vehicle rumble
    const r = c.createBufferSource(); r.buffer = this.brown; r.loop = true; r.playbackRate.value = 0.5;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 140;
    const rg = c.createGain(); rg.gain.value = 0.35;
    r.connect(lp).connect(rg).connect(this.amb); r.start();
    const eng = c.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 42;
    const ef = c.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 90;
    const eg = c.createGain(); eg.gain.value = 0.03;
    eng.connect(ef).connect(eg).connect(this.amb); eng.start();
    this.engineGain = eg;
  }

  setCrowdLevel(level) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    this.crowdLevel = level;
    this.murmur1.gain.setTargetAtTime(0.35 + level * 0.5, t, 0.8);
    this.murmur2.gain.setTargetAtTime(0.12 + level * 0.35, t, 0.8);
    this.murmur3.gain.setTargetAtTime(0.02 + level * 0.05, t, 0.8);
  }

  setEngineProximity(k) {
    if (!this.enabled) return;
    this.engineGain.gain.setTargetAtTime(0.02 + k * 0.08, this.ctx.currentTime, 0.5);
  }

  _timers() {
    const loop = (fn, min, max) => {
      const go = () => { if (this.enabled && !this.paused) fn(); setTimeout(go, (min + Math.random() * (max - min)) * 1000); };
      setTimeout(go, (min + Math.random() * (max - min)) * 1000);
    };
    loop(() => this.chant(), 5, 11);
    loop(() => this.shout(this._randomCrowdPos?.()), 0.6, 2.4);
    loop(() => this.siren(), 16, 34);
    loop(() => this.whistle(), 6, 15);
  }

  // ------------------------------------------------------------ voices
  _voice(dest, t0, dur, f0, vowel, vol, glide = 0) {
    const c = this.ctx;
    const F = { a: [800, 1200], o: [500, 900], e: [450, 1900], i: [300, 2300], u: [350, 800] }[vowel] || [700, 1200];
    const osc = c.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0, t0);
    if (glide) osc.frequency.linearRampToValueAtTime(f0 * (1 + glide), t0 + dur);
    const vib = c.createOscillator(); vib.frequency.value = 5 + Math.random() * 2;
    const vg = c.createGain(); vg.gain.value = f0 * 0.02; vib.connect(vg).connect(osc.frequency);
    const g = c.createGain();
    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = F[0]; f1.Q.value = 6;
    const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = F[1]; f2.Q.value = 8;
    const mix = c.createGain(); mix.gain.value = 1;
    osc.connect(f1).connect(mix); osc.connect(f2).connect(mix);
    mix.connect(g).connect(dest);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.04);
    g.gain.setValueAtTime(vol, t0 + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.start(t0); vib.start(t0); osc.stop(t0 + dur + 0.05); vib.stop(t0 + dur + 0.05);
  }

  chant() {
    if (!this.enabled) return;
    const c = this.ctx, t = c.currentTime + 0.05;
    const patterns = [
      // "Pa-ris ! Pa-ris !"  /  "Pa-les-tine !"  /  "Li-ber-té !"  / "Ici c'est Pa-ris"
      [['a', 0.22], ['i', 0.45], [null, 0.3], ['a', 0.22], ['i', 0.45], [null, 0.35], ['a', 0.22], ['i', 0.5]],
      [['a', 0.2], ['e', 0.2], ['i', 0.55], [null, 0.4], ['a', 0.2], ['e', 0.2], ['i', 0.55]],
      [['i', 0.2], ['e', 0.2], ['e', 0.55], [null, 0.4], ['i', 0.2], ['e', 0.2], ['e', 0.55]],
      [['i', 0.18], ['i', 0.18], ['e', 0.2], ['a', 0.2], ['i', 0.5], [null, 0.4], ['i', 0.18], ['i', 0.18], ['e', 0.2], ['a', 0.2], ['i', 0.5]],
    ];
    const pat = patterns[Math.floor(Math.random() * patterns.length)];
    const pos = this._randomCrowdPos ? this._randomCrowdPos() : null;
    const { node, level } = this._out(pos, 0.5 * (0.5 + this.crowdLevel), 14, 160);
    if (level < 0.01) return;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.connect(node);
    const reps = 1 + Math.floor(Math.random() * 2);
    let tt = t;
    for (let r = 0; r < reps; r++) {
      for (const [v, d] of pat) {
        if (v) for (let k = 0; k < 7; k++) this._voice(lp, tt + Math.random() * 0.04, d * 0.95, 150 + Math.random() * 110, v, 0.05);
        tt += d;
      }
      tt += 0.5;
    }
  }

  shout(pos) {
    if (!this.enabled) return;
    const c = this.ctx, t = c.currentTime + 0.02;
    const { node, level } = this._out(pos, 0.35, 5, 70);
    if (level < 0.01) return;
    const vowels = ['a', 'o', 'e', 'u'];
    const n = 1 + Math.floor(Math.random() * 3);
    let tt = t;
    for (let i = 0; i < n; i++) {
      const d = 0.15 + Math.random() * 0.35;
      this._voice(node, tt, d, 170 + Math.random() * 160, vowels[Math.floor(Math.random() * 4)], 0.22, (Math.random() - 0.6) * 0.3);
      tt += d + 0.05;
    }
  }

  whistle() {
    if (!this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const pos = this._randomCrowdPos ? this._randomCrowdPos() : null;
    const { node, level } = this._out(pos, 0.08, 10, 120);
    if (level < 0.005) return;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 2900 + Math.random() * 600;
    const g = c.createGain(); o.connect(g).connect(node);
    for (let i = 0; i < 3; i++) { g.gain.setValueAtTime(0.0001, t + i * 0.22); g.gain.exponentialRampToValueAtTime(1, t + i * 0.22 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.16); }
    o.start(t); o.stop(t + 0.8);
  }

  // French two-tone "pin-pon" passing by
  siren() {
    if (!this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const dur = 9;
    const o = c.createOscillator(); o.type = 'square';
    for (let k = 0; k < dur / 0.5; k++) o.frequency.setValueAtTime(k % 2 ? 580 : 435, t + k * 0.5);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    o.connect(lp).connect(g);
    if (p) { p.pan.setValueAtTime(-0.9, t); p.pan.linearRampToValueAtTime(0.9, t + dur); g.connect(p).connect(this.amb); } else g.connect(this.amb);
    o.start(t); o.stop(t + dur);
  }

  // ------------------------------------------------------------ sfx
  footstep(pos, vol = 0.12, hard = false) {
    if (!this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const { node, level } = this._out(pos, vol, 3, 30);
    if (level < 0.005) return;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = (hard ? 1400 : 700) + Math.random() * 500;
    const g = c.createGain(); this._env(g.gain, t, 0.004, 1, 0.07);
    f.connect(g).connect(node);
    this._noise(this.white, f, t, 0.1, 0.6 + Math.random() * 0.3);
  }

  swing() {
    if (!this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const { node } = this._out(null, 0.3);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.5;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2200 + Math.random() * 600, t + 0.14);
    const g = c.createGain(); this._env(g.gain, t, 0.06, 1, 0.12);
    f.connect(g).connect(node);
    this._noise(this.white, f, t, 0.25);
  }

  impact(pos, heavy = false, shield = false) {
    if (!this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const { node } = this._out(pos, heavy ? 0.9 : 0.6, 4, 50);
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(shield ? 220 : 140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    const g = c.createGain(); this._env(g.gain, t, 0.003, 1, 0.18);
    o.connect(g).connect(node); o.start(t); o.stop(t + 0.25);
    const f = c.createBiquadFilter(); f.type = shield ? 'bandpass' : 'lowpass'; f.frequency.value = shield ? 1800 : 1200; f.Q.value = 2;
    const g2 = c.createGain(); this._env(g2.gain, t, 0.002, shield ? 0.9 : 0.6, shield ? 0.25 : 0.08);
    f.connect(g2).connect(node);
    this._noise(this.white, f, t, 0.3);
  }

  hurt(player = true) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const { node } = this._out(null, 0.3);
    this._voice(node, t, 0.22, player ? 120 : 190, 'u', 0.3, -0.2);
  }

  glass(pos) {
    if (!this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const { node, level } = this._out(pos, 0.6, 5, 70);
    if (level < 0.01) return;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000;
    const g = c.createGain(); this._env(g.gain, t, 0.002, 1, 0.3);
    f.connect(g).connect(node);
    this._noise(this.white, f, t, 0.4);
    for (let i = 0; i < 5; i++) {
      const o = c.createOscillator(); o.frequency.value = 3000 + Math.random() * 4000;
      const og = c.createGain(); this._env(og.gain, t + i * 0.03, 0.002, 0.15, 0.2);
      o.connect(og).connect(node); o.start(t + i * 0.03); o.stop(t + 0.5);
    }
  }

  // size ~0.4 (flare-up) .. 1.2 (car fire). Distance darkens and delays the sound.
  explosion(pos, size = 1) {
    if (!this.enabled) return;
    const c = this.ctx;
    const dist = pos ? Math.hypot(pos.x - this.listener.x, pos.z - this.listener.z) : 0;
    const t = c.currentTime + Math.min(0.4, dist / 343);
    const v = 0.85 + Math.random() * 0.3;
    const { node } = this._out(pos, 1.25 * size, 8, 180);
    const far = Math.min(1, dist / 90);
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime((4500 - far * 3200) * v, t); f.frequency.exponentialRampToValueAtTime(160, t + 1.2 + size * 0.6);
    const g = c.createGain(); this._env(g.gain, t, 0.004, 1, 1.2 + size * 0.8);
    f.connect(g).connect(node);
    this._noise(this.white, f, t, 2.2, 0.8 + Math.random() * 0.4);
    const o = c.createOscillator(); o.frequency.setValueAtTime(70 + Math.random() * 40, t); o.frequency.exponentialRampToValueAtTime(26, t + 0.9);
    const og = c.createGain(); this._env(og.gain, t, 0.004, 1.3 * size, 0.9 + size * 0.3);
    o.connect(og).connect(node); o.start(t); o.stop(t + 1.4);
    // whoosh of igniting fuel + roar tail
    const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 380 + Math.random() * 300; f2.Q.value = 0.6;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.45 * size, t + 0.25); g2.gain.exponentialRampToValueAtTime(0.0001, t + 3 + size * 3);
    f2.connect(g2).connect(node);
    this._noise(this.brown, f2, t, 6);
    // echo off the façades
    const d = c.createDelay(1); d.delayTime.value = 0.18 + Math.random() * 0.12;
    const fb = c.createGain(); fb.gain.value = 0.28;
    g.connect(d); d.connect(fb).connect(node);
    if (size > 0.7) this.glass(pos);
  }

  // firework mortar launch thump and airborne burst with crackle
  thump(pos) {
    if (!this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const { node, level } = this._out(pos, 0.6, 6, 150);
    if (level < 0.005) return;
    const o = c.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.15);
    const g = c.createGain(); this._env(g.gain, t, 0.002, 1, 0.2);
    o.connect(g).connect(node); o.start(t); o.stop(t + 0.3);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(2500, t); f.frequency.exponentialRampToValueAtTime(5000, t + 0.9); f.Q.value = 4;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.25, t + 0.1); g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    f.connect(g2).connect(node); this._noise(this.white, f, t, 1.1);
  }

  firework(pos) {
    if (!this.enabled) return;
    const c = this.ctx;
    const dist = pos ? Math.hypot(pos.x - this.listener.x, pos.z - this.listener.z) : 0;
    const t = c.currentTime + Math.min(0.4, dist / 343);
    const { node, level } = this._out(pos, 1.0, 10, 200);
    if (level < 0.005) return;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(6000, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.5);
    const g = c.createGain(); this._env(g.gain, t, 0.002, 1, 0.6);
    f.connect(g).connect(node); this._noise(this.white, f, t, 0.8);
    // crackle
    for (let i = 0; i < 18; i++) {
      const tt = t + 0.15 + Math.random() * 1.2;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
      const cg = c.createGain(); this._env(cg.gain, tt, 0.001, 0.25 * Math.random(), 0.03);
      hp.connect(cg).connect(node); this._noise(this.white, hp, tt, 0.05);
    }
  }

  lighter(pos) {
    if (!this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const { node, level } = this._out(pos, 0.5, 3, 30);
    if (level < 0.01) return;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2000;
    const g = c.createGain(); this._env(g.gain, t, 0.002, 1, 0.05);
    f.connect(g).connect(node); this._noise(this.white, f, t, 0.08);
    const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 800;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.0001, t + 0.1); g2.gain.exponentialRampToValueAtTime(0.5, t + 0.2); g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    f2.connect(g2).connect(node); this._noise(this.white, f2, t + 0.1, 1.2);
  }

  ui(kind = 'click') {
    if (!this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    const freqs = { click: [880, 880], good: [660, 990], bad: [300, 200], alert: [740, 520], radio: [1200, 1200] }[kind] || [800, 800];
    o.frequency.setValueAtTime(freqs[0], t); o.frequency.setValueAtTime(freqs[1], t + 0.08);
    const g = c.createGain(); this._env(g.gain, t, 0.005, 0.12, 0.18);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.3);
    if (kind === 'radio') {
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2000;
      const g2 = c.createGain(); this._env(g2.gain, t, 0.005, 0.08, 0.25);
      f.connect(g2).connect(this.sfx); this._noise(this.white, f, t, 0.3);
    }
  }

  setPaused(p) {
    this.paused = p;
    if (!this.enabled) return;
    this.amb.gain.setTargetAtTime(p ? 0.15 : 0.9, this.ctx.currentTime, 0.2);
  }
}
