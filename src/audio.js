// Riot soundscape (Web Audio API). Openly licensed field recordings (see
// README: sirens, crowds, fireworks, glass, whistle) are layered with
// synthesised voices, explosions, helicopter, alarms and fire crackle. If a
// recording fails to load or decode, the synthesised version is used instead,
// so the game never depends on an audio file.
const SAMPLE_FILES = {
  crowd: 'crowd_large.wav', stadium: 'stadium.ogg', siren: 'siren_twotone.ogg',
  fwFar1: 'fireworks_far1.ogg', fwFar3: 'fireworks_far3.ogg', fwStreet: 'fireworks_street.ogg',
  glass: 'glass.wav', whistle: 'whistle.ogg',
};
const R = (a, b) => a + Math.random() * (b - a);
export class Audio {
  constructor() {
    this.ctx = null;
    this.listener = { x: 0, z: 0, yaw: 0 };
    this.crowdLevel = 0.5;
    this.enabled = false;
    this.samples = {};
    this.vehicles = [];
    this.alarms = [];
    this.sirenT = 1;
  }

  // ------------------------------------------------------------ samples
  async loadSamples(base = 'assets/audio/') {
    if (!this.ctx) return;
    await Promise.all(Object.entries(SAMPLE_FILES).map(async ([k, f]) => {
      try {
        const res = await fetch(base + f);
        if (!res.ok) throw new Error(res.status);
        const buf = await res.arrayBuffer();
        this.samples[k] = await this.ctx.decodeAudioData(buf);
      } catch (e) { console.warn('audio sample unavailable, using synthesis:', f, e.message || e); }
    }));
    this._startSampleBeds();
  }

  // one-shot (or looping) sample at a world position
  playSample(name, { pos = null, vol = 1, rate = 1, offset = 0, dur = 0, loop = false, ref = 8, max = 160, fadeIn = 0.01, fadeOut = 0.15, filter = 0 } = {}) {
    const buf = this.samples[name];
    if (!this.enabled || !buf) return null;
    const c = this.ctx, t = c.currentTime;
    const { node, level } = this._out(pos, vol, ref, max);
    if (!loop && level < 0.003) return null;
    const src = c.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate; src.loop = loop;
    const g = c.createGain();
    let head = g;
    if (filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; g.connect(f); f.connect(node); } else g.connect(node);
    src.connect(head);
    const length = dur || buf.duration - offset;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + fadeIn);
    if (!loop) { g.gain.setValueAtTime(1, t + Math.max(fadeIn, length - fadeOut)); g.gain.exponentialRampToValueAtTime(0.0001, t + length); }
    src.start(t, offset % buf.duration, loop ? undefined : length + 0.05);
    return { src, gain: g, out: node };
  }

  // continuous beds from the recordings
  _startSampleBeds() {
    const c = this.ctx;
    const bed = (name, vol, filter, rate = 1) => {
      const buf = this.samples[name]; if (!buf) return null;
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true; src.playbackRate.value = rate;
      const g = c.createGain(); g.gain.value = vol;
      let n = src;
      if (filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; src.connect(f); n = f; }
      n.connect(g).connect(this.amb);
      src.start(c.currentTime, Math.random() * buf.duration);
      return g;
    };
    this.crowdBed = bed('crowd', 0.7);
    this.crowdBed2 = bed('crowd', 0.35, 1800, 0.93); // second, detuned copy widens the crowd
    this.roarBed = bed('stadium', 0.22, 2600);
    this.fwBed1 = bed('fwFar1', 0.35, 3500);
    this.fwBed2 = bed('fwFar3', 0.25, 2500, 0.9);
    // with real crowd recordings in place, pull the synthetic murmur back
    if (this.crowdBed) { this.murmur1.gain.value *= 0.35; this.murmur2.gain.value *= 0.35; }
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
    this._startHelicopter();
    this._startCrackle();
    this._timers();
    this.loadSamples();
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
    if (this.crowdBed) {
      this.crowdBed.gain.setTargetAtTime(0.5 + level * 0.55, t, 0.8);
      this.crowdBed2.gain.setTargetAtTime(0.25 + level * 0.3, t, 0.8);
      if (this.roarBed) this.roarBed.gain.setTargetAtTime(0.12 + level * 0.45, t, 1.2);
      this.murmur1.gain.setTargetAtTime((0.35 + level * 0.5) * 0.35, t, 0.8);
      this.murmur2.gain.setTargetAtTime((0.12 + level * 0.35) * 0.35, t, 0.8);
      return;
    }
    this.murmur1.gain.setTargetAtTime(0.35 + level * 0.5, t, 0.8);
    this.murmur2.gain.setTargetAtTime(0.12 + level * 0.35, t, 0.8);
    this.murmur3.gain.setTargetAtTime(0.02 + level * 0.05, t, 0.8);
  }

  setEngineProximity(k) {
    if (!this.enabled) return;
    this.engineGain.gain.setTargetAtTime(0.02 + k * 0.08, this.ctx.currentTime, 0.5);
  }

  // ------------------------------------------------------------ helicopter, alarms, crackle
  _startHelicopter() {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.brown; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const am = c.createGain(); am.gain.value = 0.5;
    const rotor = c.createOscillator(); rotor.frequency.value = 11.5;
    const depth = c.createGain(); depth.gain.value = 0.5;
    rotor.connect(depth).connect(am.gain); rotor.start();
    const g = c.createGain(); g.gain.value = 0;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    src.connect(lp).connect(am).connect(g);
    if (pan) { g.connect(pan); pan.connect(this.amb); } else g.connect(this.amb);
    src.start();
    this.heli = { g, pan, a: Math.random() * 6.28, r: 70 };
  }

  _startCrackle() {
    const c = this.ctx;
    // fire crackle: sparse clicks + hiss, gain driven by distance to the nearest fire
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() < 0.0016 ? (Math.random() * 2 - 1) * 0.9 : 0) + (Math.random() * 2 - 1) * 0.04;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(hp).connect(g).connect(this.amb); src.start();
    this.crackle = g;
  }

  // car / shop alarm at a position for a while
  alarm(pos, seconds = 14) {
    if (!this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'square';
    const per = Math.random() < 0.5 ? 0.25 : 0.5;
    for (let k = 0; k < seconds / per; k++) o.frequency.setValueAtTime(k % 2 ? 1250 : 850, t + k * per);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 1.2;
    const g = c.createGain(); g.gain.value = 0;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    o.connect(f).connect(g);
    if (pan) { g.connect(pan); pan.connect(this.sfx); } else g.connect(this.sfx);
    o.start(t); o.stop(t + seconds);
    this.alarms.push({ pos: pos.clone(), g, pan, end: t + seconds });
  }

  // a police / fire vehicle passing with the French two-tone siren
  _spawnVehicle() {
    const L = this.listener;
    // drive along a cross street or the far boulevard, past the listener at a distance
    const lanes = [[-110, 'x'], [-20, 'x'], [70, 'x'], [175, 'x'], [-190, 'x']];
    const [lz] = lanes[Math.floor(Math.random() * lanes.length)];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const v = { x: -dir * R(120, 180), z: lz + R(-3, 3), vx: dir * R(14, 22), vz: 0, t: 0, life: 18 };
    if (Math.abs(lz - L.z) > 160) v.z = L.z + (Math.random() < 0.5 ? -1 : 1) * R(60, 120);
    const c = this.ctx;
    const g = c.createGain(); g.gain.value = 0;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    let src;
    if (this.samples.siren) {
      src = c.createBufferSource(); src.buffer = this.samples.siren; src.loop = true;
      src.start(c.currentTime, Math.random() * this.samples.siren.duration);
      src.connect(lp);
    } else {
      src = c.createOscillator(); src.type = 'square';
      const t = c.currentTime;
      for (let k = 0; k < 40; k++) src.frequency.setValueAtTime(k % 2 ? 580 : 435, t + k * 0.5);
      src.start(); const f2 = c.createGain(); f2.gain.value = 0.25; src.connect(f2).connect(lp);
    }
    lp.connect(g);
    if (pan) { g.connect(pan); pan.connect(this.amb); } else g.connect(this.amb);
    v.src = src; v.g = g; v.pan = pan; v.lp = lp; v.prevD = null;
    this.vehicles.push(v);
  }

  // per-frame: moving sirens (distance, pan, doppler), helicopter, alarms, crackle
  update(dt, info = {}) {
    if (!this.enabled || this.paused) return;
    const c = this.ctx, t = c.currentTime, L = this.listener;
    const rx = Math.cos(L.yaw), rz = -Math.sin(L.yaw);
    const place = (x, z, ref, max) => { const dx = x - L.x, dz = z - L.z, d = Math.hypot(dx, dz); return { d, g: (d < ref ? 1 : ref / d) * Math.max(0, 1 - d / max), pan: d > 0.1 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / d)) * 0.85 : 0 }; };
    // keep two to four sirens on the move at any time ("a lot of sirens")
    this.sirenT -= dt;
    const want = 2 + (info.intensity > 0.5 ? 2 : info.intensity > 0.2 ? 1 : 0);
    if (this.sirenT <= 0 && this.vehicles.length < want) { this._spawnVehicle(); this.sirenT = R(2.5, 7); }
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      v.t += dt; v.x += v.vx * dt; v.z += v.vz * dt;
      const p = place(v.x, v.z, 18, 260);
      const fade = Math.min(1, v.t / 2, (v.life - v.t) / 2);
      v.g.gain.setTargetAtTime(Math.max(0, p.g * 0.55 * fade), t, 0.1);
      if (v.pan) v.pan.pan.setTargetAtTime(p.pan, t, 0.1);
      v.lp.frequency.setTargetAtTime(1200 + 4000 * Math.min(1, 40 / (p.d + 1)), t, 0.2);
      // doppler from the radial speed (skip zero-length frames, which would divide by zero)
      if (v.prevD !== null && v.src.playbackRate && dt > 1e-4) { const vr = (p.d - v.prevD) / dt; if (Number.isFinite(vr)) v.src.playbackRate.setTargetAtTime(Math.max(0.85, Math.min(1.15, 1 - vr / 343)), t, 0.1); }
      v.prevD = p.d;
      if (v.t > v.life) { try { v.src.stop(); } catch (e) {} v.g.disconnect(); this.vehicles.splice(i, 1); }
    }
    // helicopter circling overhead
    if (this.heli) {
      const h = this.heli; h.a += dt * 0.05;
      const hx = L.x + Math.cos(h.a) * h.r, hz = L.z + Math.sin(h.a * 0.7) * h.r;
      const p = place(hx, hz, 50, 400);
      h.g.gain.setTargetAtTime(0.16 * p.g * (0.6 + 0.4 * Math.sin(h.a * 3)), t, 0.3);
      if (h.pan) h.pan.pan.setTargetAtTime(p.pan, t, 0.3);
    }
    for (let i = this.alarms.length - 1; i >= 0; i--) {
      const a = this.alarms[i];
      if (t > a.end) { this.alarms.splice(i, 1); continue; }
      const p = place(a.pos.x, a.pos.z, 6, 120);
      a.g.gain.setTargetAtTime(0.09 * p.g, t, 0.1);
      if (a.pan) a.pan.pan.setTargetAtTime(p.pan, t, 0.1);
    }
    if (this.crackle) this.crackle.gain.setTargetAtTime(info.fireDist !== undefined ? 0.5 * Math.max(0, 1 - info.fireDist / 14) : 0, t, 0.3);
  }

  _timers() {
    const loop = (fn, min, max) => {
      const go = () => { if (this.enabled && !this.paused) fn(); setTimeout(go, (min + Math.random() * (max - min)) * 1000); };
      setTimeout(go, (min + Math.random() * (max - min)) * 1000);
    };
    loop(() => this.chant(), 5, 11);
    loop(() => this.shout(this._randomCrowdPos?.()), 0.6, 2.4);
    loop(() => this.whistle(), 5, 12);
    loop(() => this.distantBang(), 2.5, 8);
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

  // distant firecracker / mortar bangs from the recordings (short random slices)
  distantBang() {
    if (!this.enabled || !this.samples.fwStreet) return;
    const L = this.listener, a = Math.random() * 6.28, r = R(60, 160);
    const buf = this.samples.fwStreet;
    this.playSample('fwStreet', { pos: { x: L.x + Math.cos(a) * r, z: L.z + Math.sin(a) * r }, vol: R(0.6, 1.1), offset: R(0, buf.duration - 4), dur: R(1.5, 3.5), filter: R(1500, 4000), ref: 20, max: 260, fadeIn: 0.005, rate: R(0.9, 1.1) });
  }

  whistle() {
    if (!this.enabled) return;
    if (this.samples.whistle) {
      const L = this.listener;
      this.playSample('whistle', { pos: { x: L.x + R(-25, 25), z: L.z + R(-25, 25) }, vol: R(0.25, 0.45), rate: R(0.95, 1.05), ref: 8, max: 90 });
      return;
    }
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
    if (this.samples.glass) { this.playSample('glass', { pos, vol: 0.8, rate: R(0.85, 1.2), ref: 6, max: 90 }); return; }
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
    // recorded detonation texture on top of the synthesised blast
    if (this.samples.fwStreet) { const buf = this.samples.fwStreet; this.playSample('fwStreet', { pos, vol: 0.7 * size, offset: R(0, buf.duration - 2), dur: R(0.8, 1.4), ref: 10, max: 200, fadeIn: 0.003, rate: R(0.7, 0.85), filter: 2200 }); }
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
    if (this.samples.fwStreet) {
      const buf = this.samples.fwStreet;
      this.playSample('fwStreet', { pos, vol: 1.1, offset: R(0, buf.duration - 3), dur: R(1.2, 2.4), ref: 12, max: 220, fadeIn: 0.004 });
    }
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
