// Riot soundscape (Web Audio API).
//
// Signal flow:
//   one-shots, beds -> ambience | effects bus -> game bus (pause / hidden-tab fade)
//   -> master (volume, mute) -> limiter -> speakers.  UI clicks skip the game bus,
//   so the pause menu still clicks. A shared street reverb gives distant sounds space.
//
// Openly licensed recordings in public/assets/audio/ (credited in the README and on
// the Controls screen) carry the soundscape. A few synthesised layers fill the gaps
// (whooshes, sub-bass, alarms), and stand in when a file fails to load or decode, so
// the game never depends on an audio file.
//
// Every layer is driven from update() (no free-running timers), so pausing stops
// new sounds and nothing piles up while the game is paused or the tab is hidden.

const R = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const FILES = {
  crowdA: 'crowd_large.mp3', crowdB: 'crowd_murmur.mp3', yell: 'crowd_yelling.mp3',
  chant: 'chant_protest.mp3', chantB: 'chant_stadium.mp3',
  street: 'street_city.mp3', fwFar: 'fireworks_far.mp3', fwStreet: 'fireworks_street.mp3',
  heli: 'helicopter.mp3', fire: 'fire_loop.mp3', adhan: 'adhan.mp3',
  sirenPolice: 'siren_police.wav', sirenGend: 'siren_gendarmerie.wav', sirenPompiers: 'siren_pompiers.wav',
  whistle: 'whistles.mp3', glass: 'glass.mp3', boom: 'explosions.mp3', punch: 'impact_body.mp3',
  shield: 'impact_shield.mp3', metal: 'impact_metal.mp3', stone: 'impact_stone.mp3',
  step: 'footsteps.mp3', grunt: 'grunts.mp3',
};
// Sprite sheets: equal slots of this many seconds, each sound starting ~50 ms in.
const SLOT = { whistle: 3, glass: 2.5, boom: 3, punch: 0.6, shield: 0.8, metal: 1.2, stone: 0.6, step: 0.4, grunt: 1.2 };

// Concurrency per category: [max simultaneous, base priority]. A new sound only
// replaces a playing one of lower (audibility-weighted, age-decayed) priority.
const CATS = {
  boom: [3, 10], impact: [5, 8], swing: [2, 6], step: [2, 3], glass: [3, 5], crash: [2, 4],
  shout: [2, 2], scream: [3, 4], whistle: [1, 2], chant: [1, 3], roar: [1, 4], fw: [3, 3], alarm: [2, 2], misc: [4, 3],
};
const MAX_VOICES = 22;

const SETTINGS_KEY = 'parisBurning.audio.v1';
const DEFAULTS = { master: 0.8, ambience: 0.8, effects: 0.9, muted: false };

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (s && typeof s === 'object') {
      const out = { ...DEFAULTS };
      for (const k of ['master', 'ambience', 'effects']) if (Number.isFinite(s[k])) out[k] = clamp(s[k], 0, 1);
      out.muted = !!s.muted;
      return out;
    }
  } catch (e) { /* storage blocked: defaults */ }
  return { ...DEFAULTS };
}

// A continuous layer made of overlapping, randomly chosen windows of one or more
// recordings with crossfades, so a 40 s file never audibly loops.
class Bed {
  constructor(audio, keys, dest, o = {}) {
    this.a = audio; this.keys = keys; this.o = { win: [7, 13], xf: 2.5, rate: [0.97, 1.03], ...o };
    const c = audio.ctx;
    this.out = c.createGain(); this.out.gain.value = o.gain ?? 1;
    let head = this.out;
    if (o.lp) { this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = o.lp; head.connect(this.lp); head = this.lp; }
    if (o.pan !== undefined && c.createStereoPanner) { this.pan = c.createStereoPanner(); this.pan.pan.value = o.pan; head.connect(this.pan); head = this.pan; }
    head.connect(dest);
    if (o.send && audio.verbIn) { this.send = c.createGain(); this.send.gain.value = o.send; head.connect(this.send).connect(audio.verbIn); }
    this.next = 0;
  }
  available() { return this.keys.some((k) => this.a.samples[k]); }
  update(now) {
    if (now < this.next - 0.08) return;
    const bufs = this.keys.map((k) => this.a.samples[k]).filter(Boolean);
    if (!bufs.length) return;
    const c = this.a.ctx, buf = pick(bufs), o = this.o;
    const rate = R(o.rate[0], o.rate[1]);
    const win = Math.min(R(o.win[0], o.win[1]), buf.duration / rate - 0.2);
    const xf = Math.min(o.xf, win / 2.5);
    const t = Math.max(now + 0.02, this.next);
    const off = R(0, Math.max(0, buf.duration - win * rate - 0.1));
    const s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + xf);
    g.gain.setValueAtTime(1, t + win - xf); g.gain.linearRampToValueAtTime(0, t + win);
    s.connect(g).connect(this.out);
    s.start(t, off, win * rate + 0.05);
    s.onended = () => { s.disconnect(); g.disconnect(); };
    this.next = t + win - xf;
  }
  level(v, tc = 0.6) { this.out.gain.setTargetAtTime(v, this.a.ctx.currentTime, tc); }
}

export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.paused = false;
    this.listener = { x: 0, z: 0, yaw: 0 };
    this.crowdLevel = 0.5; this.crowdSmooth = 0.5;
    this.intensity = 0;
    this.samples = {};
    this.voices = [];
    this.vehicles = [];
    this.alarms = [];
    this.pending = [];     // deferred one-shots {t, fn} run from update()
    this.recentBooms = [];
    this.lastSlot = {};
    this.settings = loadSettings();
    this.onSettings = null;
    this.fetches = null;
    this.loaded = false;
    document.addEventListener('visibilitychange', () => this._visibility());
    // iOS / Chrome may suspend or "interrupt" the context: any later gesture resumes it
    const unlock = () => { if (this.ctx && this.ctx.state !== 'running' && !document.hidden) this.ctx.resume().catch(() => {}); };
    for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, unlock, { capture: true, passive: true });
  }

  // ------------------------------------------------------------ loading
  // Start downloading early (no AudioContext needed); decoding waits for init().
  prefetch(base = 'assets/audio/') {
    if (this.fetches) return;
    this.fetches = {};
    for (const [k, f] of Object.entries(FILES)) {
      this.fetches[k] = fetch(base + f)
        .then((r) => {
          // an SPA fallback page served for a missing file is not audio
          if (!r.ok || (r.headers.get('content-type') || '').includes('text/html')) throw new Error('missing (HTTP ' + r.status + ')');
          return r.arrayBuffer();
        })
        .catch((e) => { console.warn('audio file unavailable, using fallback:', f, e.message || e); return null; });
    }
  }

  async _decodeAll() {
    const c = this.ctx;
    const decode = (buf) => new Promise((res, rej) => { const p = c.decodeAudioData(buf, res, rej); if (p && p.then) p.then(res, rej); });
    await Promise.all(Object.entries(this.fetches).map(async ([k, p]) => {
      const data = await p;
      if (!data) return;
      // the call to prayer is long and rare: decoded only when it plays, then released
      if (k === 'adhan') { this.adhanData = data; return; }
      try { this.samples[k] = await decode(data); } catch (e) { console.warn('audio decode failed, using fallback:', FILES[k], e && (e.message || e)); }
    }));
    this.loaded = true;
    // recordings that did not arrive get a quiet synthesised stand-in
    if (!this.samples.crowdA && !this.samples.crowdB) this._fallbackCrowd();
    if (!this.samples.fire) this._fallbackCrackle();
  }

  // ------------------------------------------------------------ setup
  // Must be called from a user gesture. Safe to call repeatedly: only the first
  // call builds anything, later calls just resume a suspended context.
  init() {
    if (this.ctx) { this._resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn('Web Audio unavailable: playing without sound'); return; }
    // touch devices run at 32 kHz: decoded recordings take a third less memory
    const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
    try { this.ctx = new AC({ latencyHint: 'interactive', ...(touch ? { sampleRate: 32000 } : {}) }); } catch (e) {
      try { this.ctx = new AC(); } catch (e2) { console.warn('No Web Audio', e2); return; }
    }
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
    const c = this.ctx;
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -5; this.limiter.knee.value = 3; this.limiter.ratio.value = 16;
    this.limiter.attack.value = 0.003; this.limiter.release.value = 0.2;
    // fixed makeup gain: the recordings are normalised conservatively, the limiter catches peaks
    this.master = c.createGain(); this.makeup = c.createGain(); this.makeup.gain.value = 2.2;
    this.master.connect(this.makeup).connect(this.limiter).connect(c.destination);
    this.game = c.createGain(); this.game.gain.value = this.paused || document.hidden ? 0 : 1; this.game.connect(this.master);
    this.uiBus = c.createGain(); this.uiBus.connect(this.master);
    this.ambVol = c.createGain(); this.duck = c.createGain();
    this.ambVol.connect(this.duck).connect(this.game);
    this.sfxVol = c.createGain(); this.sfxVol.connect(this.game);
    this.amb = this.ambVol; this.sfx = this.sfxVol;
    this._applySettings(true);
    this._makeNoise();
    this._makeVerb();
    this.enabled = true;
    this._resume();
    this.prefetch();
    this.loading = this._decodeAll();
    this._startLayers();
    c.onstatechange = () => { if (c.state !== 'running' && !document.hidden) this._resume(); };
  }

  _resume() {
    if (this.ctx && this.ctx.state !== 'running' && !document.hidden) this.ctx.resume().catch(() => {});
  }

  _makeNoise() {
    const c = this.ctx, len = c.sampleRate * 2;
    this.white = c.createBuffer(1, len, c.sampleRate);
    this.brown = c.createBuffer(1, len, c.sampleRate);
    const w = this.white.getChannelData(0), b = this.brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { w[i] = Math.random() * 2 - 1; last = (last + 0.02 * w[i]) / 1.02; b[i] = last * 3.5; }
  }

  // street reverb: decaying, darkening stereo noise impulse (façades and side streets)
  _makeVerb() {
    const c = this.ctx, sr = c.sampleRate, len = Math.floor(sr * 2.2);
    const ir = c.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const k = 0.35 + 0.6 * Math.min(1, t / 1.2); // darker as it decays
        lp += (Math.random() * 2 - 1 - lp) * (1 - k);
        d[i] = lp * Math.exp(-t * 2.6) * (t < 0.012 ? t / 0.012 : 1);
      }
    }
    this.verb = c.createConvolver(); this.verb.buffer = ir;
    this.verbIn = c.createGain(); this.verbIn.gain.value = 1;
    const ret = c.createGain(); ret.gain.value = 0.32;
    this.verbIn.connect(this.verb).connect(ret).connect(this.game);
  }

  _startLayers() {
    const c = this.ctx;
    // crowd: a large recorded crowd and a closer murmur, both windowed
    // (mono recordings panned apart so the crowd surrounds the listener)
    this.crowdBedA = new Bed(this, ['crowdA'], this.amb, { win: [8, 14], xf: 3, gain: 0.55, lp: 4000, pan: -0.3 });
    this.crowdBedB = new Bed(this, ['crowdB'], this.amb, { win: [7, 12], xf: 3, gain: 0.3, lp: 3000, pan: 0.35 });
    this.streetBed = new Bed(this, ['street'], this.amb, { win: [10, 16], xf: 3.5, gain: 0.22, lp: 2500 });
    this.fwBed = new Bed(this, ['fwFar'], this.amb, { win: [8, 14], xf: 3, gain: 0.22, lp: 3000, send: 0.4 });
    this.heliBed = new Bed(this, ['heli'], this.amb, { win: [8, 12], xf: 3, gain: 0, lp: 2200, pan: 0, send: 0.3 });
    this.heli = { a: Math.random() * 6.28, r: 90, on: false, t: R(20, 40) };
    // three positional fire voices follow the nearest fires
    this.fireVoices = [0, 1, 2].map(() => {
      const bed = new Bed(this, ['fire'], this.amb, { win: [5, 9], xf: 1.5, gain: 0, lp: 6000, pan: 0, rate: [0.9, 1.1] });
      return { bed, src: null };
    });
    // idle engine of the nearest police van (deep, filtered)
    const eng = c.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 42;
    const ef = c.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 90;
    this.engineGain = c.createGain(); this.engineGain.gain.value = 0;
    eng.connect(ef).connect(this.engineGain).connect(this.amb); eng.start();
    // event layers: seconds until the next one
    this.t = { shout: R(2, 4), whistle: R(6, 12), chant: R(5, 9), bang: R(3, 7), boom: R(10, 18), crash: R(5, 10), siren: R(1, 3), adhan: R(55, 95) };
    this.chantVoice = null; this.adhanVoice = null;
  }

  _fallbackCrowd() {
    const c = this.ctx;
    const mk = (freq, q, vol, rate) => {
      const src = c.createBufferSource(); src.buffer = this.brown; src.loop = true; src.playbackRate.value = rate;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
      const g = c.createGain(); g.gain.value = vol;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.1 + Math.random() * 0.15;
      const lg = c.createGain(); lg.gain.value = vol * 0.35;
      lfo.connect(lg).connect(g.gain); lfo.start();
      src.connect(bp).connect(g).connect(this.amb); src.start();
    };
    mk(380, 0.8, 0.22, 1); mk(1000, 1.1, 0.08, 1.3);
  }

  _fallbackCrackle() {
    const c = this.ctx;
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() < 0.0012 ? (Math.random() * 2 - 1) * 0.7 : 0) + (Math.random() * 2 - 1) * 0.03;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
    this.crackle = c.createGain(); this.crackle.gain.value = 0;
    src.connect(hp).connect(this.crackle).connect(this.amb); src.start();
  }

  // ------------------------------------------------------------ settings
  getSettings() { return { ...this.settings }; }

  setSetting(key, value) {
    if (key === 'muted') this.settings.muted = !!value;
    else if (key in DEFAULTS) this.settings[key] = clamp(+value || 0, 0, 1);
    this._applySettings();
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch (e) { /* storage blocked */ }
    if (this.onSettings) this.onSettings(this.getSettings());
  }

  toggleMute() { this.setSetting('muted', !this.settings.muted); return this.settings.muted; }

  _applySettings(immediate = false) {
    if (!this.ctx) return;
    const s = this.settings, t = this.ctx.currentTime;
    const curve = (v) => v * v; // perceptual taper
    const set = (p, v) => { p.cancelScheduledValues(t); if (immediate) p.setValueAtTime(v, t); else p.setTargetAtTime(v, t, 0.03); };
    set(this.master.gain, s.muted ? 0 : curve(s.master));
    set(this.ambVol.gain, curve(s.ambience));
    set(this.sfxVol.gain, curve(s.effects));
    set(this.uiBus.gain, curve(s.effects) * 0.7);
  }

  // ------------------------------------------------------------ pause / visibility
  setPaused(p) {
    this.paused = p;
    if (!this.enabled) return;
    this._gameFade(p || document.hidden ? 0 : 1, p ? 0.12 : 0.3);
  }

  _gameFade(v, tc) {
    const t = this.ctx.currentTime, g = this.game.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.setTargetAtTime(v, t, tc);
  }

  _visibility() {
    if (!this.enabled) return;
    if (document.hidden) {
      this._gameFade(0, 0.05);
      clearTimeout(this._suspendT);
      this._suspendT = setTimeout(() => { if (document.hidden) this.ctx.suspend().catch(() => {}); }, 250);
    } else {
      clearTimeout(this._suspendT);
      this._resume();
      this._gameFade(this.paused ? 0 : 1, 0.3);
    }
  }

  // ------------------------------------------------------------ mixing helpers
  setListener(x, z, yaw) { this.listener.x = x; this.listener.z = z; this.listener.yaw = yaw; }

  // distance gain, stereo pan and air/building absorption for a world position
  _place(pos, ref = 6, max = 120) {
    if (!pos) return { d: 0, g: 1, pan: 0, lp: 20000 };
    const L = this.listener, dx = pos.x - L.x, dz = pos.z - L.z;
    const d = Math.hypot(dx, dz);
    const fade = clamp(1 - (d / max) ** 2, 0, 1);
    const g = (d <= ref ? 1 : ref / d) * fade;
    // camera right vector for yaw (forward = (-sin yaw, -cos yaw))
    const rx = Math.cos(L.yaw), rz = -Math.sin(L.yaw);
    const side = d > 0.01 ? (dx * rx + dz * rz) / d : 0;
    const pan = clamp(side * Math.min(1, d / 3), -1, 1) * 0.85;
    const lp = clamp(20000 * Math.exp(-d / 45), 700, 20000);
    return { d, g, pan, lp };
  }

  _prune(now) {
    for (let i = this.voices.length - 1; i >= 0; i--) {
      const v = this.voices[i];
      if (now > v.end) { for (const n of v.nodes) { try { n.disconnect(); } catch (e) { /* already */ } } this.voices.splice(i, 1); }
    }
  }

  _effPri(v, now) { return v.pri * (1 - 0.75 * clamp((now - v.t0) / v.len, 0, 1)); }

  // voice allocation with per-category and global limits; returns null when the
  // sound is inaudible or less important than everything already playing
  _admit(cat, level) {
    if (level < 0.004) return null;
    const now = this.ctx.currentTime;
    this._prune(now);
    const [max, base] = CATS[cat] || CATS.misc;
    const pri = base * level;
    const same = this.voices.filter((v) => v.cat === cat);
    const pool = same.length >= max ? same : this.voices.length >= MAX_VOICES ? this.voices : null;
    if (pool) {
      let victim = null, vp = Infinity;
      for (const v of pool) { const p = this._effPri(v, now); if (p < vp) { vp = p; victim = v; } }
      if (!victim || vp >= pri) return null;
      this._kill(victim, now);
    }
    const v = { cat, pri, t0: now, len: 1, end: now + 30, nodes: [], srcs: [] };
    this.voices.push(v);
    return v;
  }

  _kill(v, now) {
    const g = v.out.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + 0.05);
    for (const s of v.srcs) { try { s.stop(now + 0.06); } catch (e) { /* not started */ } }
    v.end = now + 0.08; v.pri = -1;
  }

  // Build a positioned one-shot. build(out, t, place, voice) adds sources and
  // returns the sound's length in seconds.
  _shot(cat, pos, vol, o, build) {
    if (!this.enabled || this.paused) return null;
    const c = this.ctx;
    const p = this._place(pos, o.ref ?? 6, o.max ?? 120);
    // reduced detail with distance: beyond o.far only a share (o.farKeep) of requests play
    if (o.far && p.d > o.far && Math.random() > (o.farKeep ?? 0.5)) return null;
    const level = vol * p.g;
    const v = this._admit(cat, level);
    if (!v) return null;
    const t = c.currentTime + 0.005 + (o.delay ? Math.min(0.45, p.d / 343) : 0);
    const out = c.createGain(); out.gain.value = level;
    v.out = out; v.nodes.push(out); v.t0 = t;
    let head = out;
    if (p.lp < 19000) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = p.lp; head.connect(f); head = f; v.nodes.push(f); }
    if (c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = p.pan; head.connect(pn); head = pn; v.nodes.push(pn); }
    head.connect(o.bus || this.sfx);
    const wet = o.verb ?? clamp(p.d / 160, 0, 0.6);
    if (wet > 0.02) { const s = c.createGain(); s.gain.value = wet; head.connect(s).connect(this.verbIn); v.nodes.push(s); }
    v.place = p;
    const len = build(out, t, p, v) || 0.5;
    v.len = len; v.end = t + len + 0.15;
    return v;
  }

  // play part of a buffer into dest with a short fade at either end
  _buf(v, dest, buf, t, { offset = 0, dur, rate = 1, gain = 1, fadeIn = 0.004, fadeOut = 0.04 } = {}) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const g = c.createGain();
    const len = Math.min(dur ?? Infinity, (buf.duration - offset) / rate);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + fadeIn);
    g.gain.setValueAtTime(gain, t + Math.max(fadeIn, len - fadeOut)); g.gain.linearRampToValueAtTime(0, t + len);
    s.connect(g).connect(dest);
    s.start(t, offset, len * rate + 0.02);
    v.srcs.push(s); v.nodes.push(s, g);
    return len;
  }

  // a random slot of a sprite sheet, never the same one twice in a row
  _sprite(name) {
    const buf = this.samples[name];
    if (!buf) return null;
    const slot = SLOT[name], n = Math.max(1, Math.floor(buf.duration / slot + 0.01));
    let k = Math.floor(Math.random() * n);
    if (n > 1 && k === this.lastSlot[name]) k = (k + 1 + Math.floor(Math.random() * (n - 1))) % n;
    this.lastSlot[name] = k;
    return { buf, off: k * slot, dur: slot };
  }

  _noise(v, dest, buffer, t, dur, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer; s.playbackRate.value = rate; s.loop = true;
    s.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    v.srcs.push(s); v.nodes.push(s);
    return s;
  }

  _env(param, t0, a, peak, d) {
    param.setValueAtTime(0.0001, t0);
    param.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    param.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  _gain(v, dest, value = 1) { const g = this.ctx.createGain(); g.gain.value = value; g.connect(dest); v.nodes.push(g); return g; }
  _filter(v, dest, type, freq, q = 0.7) { const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; f.connect(dest); v.nodes.push(f); return f; }

  // low sine thump (body of an impact or blast)
  _thud(v, dest, t, f0, f1, dur, peak) {
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain(); this._env(g.gain, t, 0.004, peak, dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
    v.srcs.push(o); v.nodes.push(o, g);
  }

  _duckAmbience(depth = 0.55, hold = 0.35) {
    const t = this.ctx.currentTime, g = this.duck.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(depth, t + 0.03); g.setTargetAtTime(1, t + hold, 0.7);
  }

  _later(delay, fn) { this.pending.push({ t: this.ctx.currentTime + delay, fn }); }

  // somewhere in the crowd, preferably at a given distance band
  _crowdPos(dMin, dMax) {
    const L = this.listener;
    if (this._randomCrowdPos) {
      for (let i = 0; i < 6; i++) {
        const p = this._randomCrowdPos();
        if (!p) break;
        const d = Math.hypot(p.x - L.x, p.z - L.z);
        if (d >= dMin && d <= dMax) return p;
      }
    }
    return this._aroundListener(dMin, dMax);
  }

  _aroundListener(rMin, rMax) {
    const L = this.listener, a = Math.random() * 6.28, r = R(rMin, rMax);
    return { x: clamp(L.x + Math.cos(a) * r * 0.3, -14, 14), z: L.z + Math.sin(a) * r };
  }

  // ------------------------------------------------------------ per-frame
  setCrowdLevel(level) { this.crowdLevel = clamp(level, 0, 1); }

  setEngineProximity(k) {
    if (!this.enabled) return;
    this.engineGain.gain.setTargetAtTime(k * 0.06, this.ctx.currentTime, 0.5);
  }

  // info: { intensity 0..1, fires: [{pos, k}] }
  update(dt, info = {}) {
    if (!this.enabled || this.paused) return;
    const c = this.ctx, now = c.currentTime;
    if (c.state !== 'running') return;
    this.intensity = info.intensity ?? this.intensity;
    this.crowdSmooth += (this.crowdLevel - this.crowdSmooth) * Math.min(1, dt * 0.8);
    const cl = this.crowdSmooth;

    // continuous beds
    this.crowdBedA.update(now); this.crowdBedB.update(now); this.streetBed.update(now); this.fwBed.update(now);
    this.crowdBedA.level(0.4 + cl * 0.3, 1.2);
    this.crowdBedB.level(0.12 + cl * 0.35, 1.2);
    if (this.crowdBedA.lp) this.crowdBedA.lp.frequency.setTargetAtTime(2600 + cl * 3500, now, 1.5);
    this._updateFires(now, info.fires || []);
    this._updateHeli(dt, now);

    // deferred one-shots
    for (let i = this.pending.length - 1; i >= 0; i--) if (now >= this.pending[i].t) { const p = this.pending.splice(i, 1)[0]; p.fn(); }

    // event layers
    const T = this.t, busy = 0.6 + cl * 0.8;
    for (const k in T) T[k] -= dt;
    if (T.shout <= 0) { T.shout = R(2.8, 7) / busy; this.shout(this._crowdPos(12, 60), true); }
    if (T.whistle <= 0) { T.whistle = R(9, 22); this.whistle(this._crowdPos(15, 70)); }
    if (T.chant <= 0) { T.chant = R(14, 30); this.chant(); }
    if (T.bang <= 0) { T.bang = R(4, 10); this.distantBang(); }
    if (T.boom <= 0) { T.boom = R(10, 22); this.distantBoom(); }
    if (T.crash <= 0) { T.crash = R(5, 12); this.ambientCrash(); }
    if (T.adhan <= 0) { T.adhan = R(240, 420); this.adhan(); }
    if (this.samples.adhan && this.adhanVoice && now > this.adhanVoice.end) { this.samples.adhan = null; this.adhanVoice = null; }
    this._updateSirens(dt, now);
    this._updateAlarms(now);
    this._prune(now);
  }

  _updateFires(now, fires) {
    const L = this.listener;
    const near = fires.map((f) => ({ f, d: Math.hypot(f.pos.x - L.x, f.pos.z - L.z) })).filter((e) => e.d < 45).sort((a, b) => a.d - b.d);
    if (this.crackle) { const e = near[0]; this.crackle.gain.setTargetAtTime(e ? 0.4 * Math.max(0, 1 - e.d / 14) : 0, now, 0.3); }
    this.fireVoices.forEach((fv, i) => {
      const e = near[i];
      if (!e) { fv.bed.level(0, 0.4); fv.src = null; return; }
      fv.bed.update(now);
      const p = this._place(e.f.pos, 3, 45);
      const k = clamp(e.f.k ?? 1, 0.3, 2);
      fv.bed.level(0.9 * p.g * k, fv.src === e.f ? 0.25 : 0.6);
      if (fv.bed.pan) fv.bed.pan.pan.setTargetAtTime(p.pan, now, 0.15);
      if (fv.bed.lp) fv.bed.lp.frequency.setTargetAtTime(Math.min(8000, p.lp), now, 0.3);
      fv.src = e.f;
    });
  }

  _updateHeli(dt, now) {
    const h = this.heli, L = this.listener;
    h.t -= dt;
    if (h.t <= 0) { h.on = !h.on; h.t = h.on ? R(40, 80) : R(30, 70); }
    h.a += dt * 0.06;
    const hx = L.x + Math.cos(h.a) * h.r, hz = L.z + Math.sin(h.a * 0.7) * h.r;
    const p = this._place({ x: hx, z: hz }, 60, 400);
    this.heliBed.update(now);
    this.heliBed.level(h.on ? 0.35 * p.g : 0, 3);
    if (this.heliBed.pan) this.heliBed.pan.pan.setTargetAtTime(p.pan, now, 0.5);
  }

  // French two-tone sirens on vehicles that drive past along the cross streets
  _updateSirens(dt, now) {
    const L = this.listener, T = this.t;
    const want = 1 + (this.intensity > 0.5 ? 2 : this.intensity > 0.2 ? 1 : 0);
    if (T.siren <= 0) { T.siren = R(6, 16); if (this.vehicles.length < want) this._spawnVehicle(); }
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      v.t += dt; v.x += v.vx * dt; v.z += v.vz * dt;
      const p = this._place(v, 20, 280);
      const fade = clamp(Math.min(v.t / 3, (v.life - v.t) / 3), 0, 1);
      v.g.gain.setTargetAtTime(Math.max(0, p.g * 0.3 * fade), now, 0.12);
      if (v.pan) v.pan.pan.setTargetAtTime(p.pan, now, 0.12);
      v.lp.frequency.setTargetAtTime(Math.min(6000, p.lp + 600), now, 0.2);
      if (v.prevD !== null && v.src.playbackRate && dt > 1e-4) {
        const vr = (p.d - v.prevD) / dt;
        if (Number.isFinite(vr)) v.src.playbackRate.setTargetAtTime(clamp(1 - vr / 343, 0.94, 1.06), now, 0.15);
      }
      v.prevD = p.d;
      if (v.t > v.life) {
        try { v.src.stop(); } catch (e) { /* stopped */ }
        for (const n of v.nodes) n.disconnect();
        this.vehicles.splice(i, 1);
      }
    }
  }

  _spawnVehicle() {
    const L = this.listener, c = this.ctx;
    const lanes = [-190, -110, -20, 70, 175].filter((z) => Math.abs(z - L.z) > 25 && Math.abs(z - L.z) < 170);
    const lz = lanes.length ? pick(lanes) : L.z + (Math.random() < 0.5 ? -1 : 1) * R(60, 120);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const v = { x: -dir * R(130, 180), z: lz + R(-3, 3), vx: dir * R(12, 20), vz: 0, t: 0, life: 22, prevD: null, nodes: [] };
    const keys = ['sirenPolice', 'sirenPolice', 'sirenGend', 'sirenPompiers'].filter((k) => this.samples[k]);
    const g = c.createGain(); g.gain.value = 0;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2500;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    let src;
    if (keys.length) {
      const buf = this.samples[pick(keys)];
      src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      src.start(c.currentTime, Math.random() * buf.duration);
      src.connect(lp);
    } else {
      // fallback: square-wave two-tone, softened
      src = c.createOscillator(); src.type = 'square';
      const t = c.currentTime;
      for (let k = 0; k < 50; k++) src.frequency.setValueAtTime(k % 2 ? 580 : 435, t + k * 0.5);
      src.start(); const f2 = c.createGain(); f2.gain.value = 0.18; src.connect(f2).connect(lp); v.nodes.push(f2);
    }
    lp.connect(g);
    if (pan) g.connect(pan).connect(this.amb); else g.connect(this.amb);
    const send = c.createGain(); send.gain.value = 0.45; g.connect(send).connect(this.verbIn);
    v.src = src; v.g = g; v.pan = pan; v.lp = lp;
    v.nodes.push(src, lp, g, send); if (pan) v.nodes.push(pan);
    this.vehicles.push(v);
  }

  _updateAlarms(now) {
    for (let i = this.alarms.length - 1; i >= 0; i--) {
      const a = this.alarms[i];
      if (now > a.end) { a.nodes.forEach((n) => n.disconnect()); this.alarms.splice(i, 1); continue; }
      const p = this._place(a.pos, 6, 120);
      a.g.gain.setTargetAtTime(0.05 * p.g, now, 0.1);
      if (a.pan) a.pan.pan.setTargetAtTime(p.pan, now, 0.1);
    }
  }

  // ------------------------------------------------------------ ambient layers
  // a group somewhere in the crowd takes up a chant for a few seconds
  chant() {
    if (!this.enabled || this.chantVoice && this.ctx.currentTime < this.chantVoice.end) return;
    const keys = ['chant', 'chant', 'chantB'].filter((k) => this.samples[k]);
    if (!keys.length) return;
    const buf = this.samples[pick(keys)];
    const pos = this._crowdPos(25, 90);
    const dur = R(6, 11);
    this.chantVoice = this._shot('chant', pos, 0.75 * (0.6 + this.crowdSmooth * 0.6), { ref: 18, max: 180, bus: this.amb, verb: 0.35 }, (out, t, p, v) =>
      this._buf(v, out, buf, t, { offset: R(0, Math.max(0, buf.duration - dur - 0.5)), dur, rate: R(0.97, 1.03), fadeIn: 1.2, fadeOut: 2.2 }));
  }

  // one voice yelling. Close attackers get a recorded effort grunt; distant shouts
  // are short phrases cut from the crowd recordings
  shout(pos, distant = false) {
    if (!this.enabled) return;
    const p = this._place(pos, 5, 80);
    if (!distant && p.d < 18 && this.samples.grunt) {
      this._shot('shout', pos, 0.45, { ref: 4, max: 60 }, (out, t, pl, v) => { const s = this._sprite('grunt'); return this._buf(v, out, s.buf, t, { offset: s.off, dur: s.dur, rate: R(0.92, 1.08) }); });
      return;
    }
    const keys = ['yell', 'chant'].filter((k) => this.samples[k]);
    if (!keys.length) return;
    const buf = this.samples[pick(keys)], dur = R(0.7, 1.6);
    this._shot('shout', pos, 0.55, { ref: 8, max: 110, bus: this.amb }, (out, t, pl, v) => {
      const bp = this._filter(v, out, 'bandpass', R(900, 1500), 0.6);
      return this._buf(v, bp, buf, t, { offset: R(0, buf.duration - dur - 0.1), dur, rate: R(0.95, 1.06), fadeIn: 0.06, fadeOut: 0.3, gain: 1.6 });
    });
  }

  // the whole crowd yells at once (a charge, a surge, a car going up)
  roar(pos = null) {
    if (!this.enabled) return;
    const keys = ['yell', 'chantB', 'chant'].filter((k) => this.samples[k]);
    if (!keys.length) return;
    const buf = this.samples[pick(keys)], dur = R(2.2, 3.5);
    this._shot('roar', pos || this._crowdPos(15, 50), 0.6 * (0.6 + this.crowdSmooth * 0.5), { ref: 15, max: 160, bus: this.amb, verb: 0.3 }, (out, t, p, v) =>
      this._buf(v, out, buf, t, { offset: R(0, buf.duration - dur - 0.1), dur, rate: R(0.96, 1.04), fadeIn: 0.25, fadeOut: 1.4 }));
  }

  whistle(pos) {
    if (!this.enabled) return;
    if (this.samples.whistle) {
      this._shot('whistle', pos || this._crowdPos(15, 70), 0.35, { ref: 8, max: 120, bus: this.amb }, (out, t, p, v) => {
        const s = this._sprite('whistle');
        return this._buf(v, out, s.buf, t, { offset: s.off, dur: s.dur, rate: R(0.96, 1.04), fadeOut: 0.2 });
      });
      return;
    }
    this._shot('whistle', pos || this._crowdPos(15, 70), 0.06, { ref: 10, max: 120, bus: this.amb }, (out, t, p, v) => {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = R(2900, 3400);
      const g = this._gain(v, out, 0);
      for (let i = 0; i < 3; i++) { g.gain.setValueAtTime(0.0001, t + i * 0.22); g.gain.exponentialRampToValueAtTime(1, t + i * 0.22 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.16); }
      o.connect(g); o.start(t); o.stop(t + 0.8); v.srcs.push(o); v.nodes.push(o);
      return 0.8;
    });
  }

  // far-off firework / mortar detonations, cut from the street recording
  distantBang() {
    if (!this.enabled || !this.samples.fwStreet) return;
    const buf = this.samples.fwStreet, dur = R(1.2, 3);
    const L = this.listener, a = Math.random() * 6.28, r = R(70, 180);
    this._shot('fw', { x: L.x + Math.cos(a) * r, z: L.z + Math.sin(a) * r }, 0.9, { ref: 20, max: 260, delay: true, bus: this.amb }, (out, t, p, v) =>
      this._buf(v, out, buf, t, { offset: R(0, buf.duration - dur - 0.1), dur, rate: R(0.92, 1.05), fadeIn: 0.005, fadeOut: 0.3 }));
  }

  // explosions further away in the city: attenuated, dark, no debris
  distantBoom() {
    const L = this.listener, a = Math.random() * 6.28, r = R(110, 220);
    this.explosion({ x: L.x + Math.cos(a) * r, z: L.z + Math.sin(a) * r }, R(0.6, 1.0), { ambient: true });
  }

  // things being smashed in the street: windows, barriers, bins, shutters
  ambientCrash() {
    if (!this.enabled) return;
    const pos = this._aroundListener(20, 75), r = Math.random();
    if (r < 0.45) this.glass(pos, 0.7);
    else if (r < 0.7) this.shutter(pos);
    else this.crash(pos, R(0.6, 1));
    if (Math.random() < 0.25) this._later(R(0.3, 0.9), () => this.glass({ x: pos.x + R(-3, 3), z: pos.z + R(-3, 3) }, 0.5));
  }

  // distant call to prayer from a mosque across the arrondissement, now and then
  adhan() {
    if (!this.enabled) return;
    if (this.adhanVoice && this.ctx.currentTime < this.adhanVoice.end) return;
    if (!this.samples.adhan) {
      if (!this.adhanData || this.adhanDecoding) return;
      this.adhanDecoding = true;
      const data = this.adhanData.slice(0); // decoding detaches the buffer it is given
      new Promise((res, rej) => { const p = this.ctx.decodeAudioData(data, res, rej); if (p && p.then) p.then(res, rej); })
        .then((buf) => { this.samples.adhan = buf; this.adhanDecoding = false; this.adhan(); })
        .catch((e) => { this.adhanDecoding = false; this.adhanData = null; console.warn('audio decode failed:', FILES.adhan, e && (e.message || e)); });
      return;
    }
    const buf = this.samples.adhan, L = this.listener, a = R(0, 6.28);
    const pos = { x: L.x + Math.cos(a) * 240, z: L.z + Math.sin(a) * 240 };
    this.adhanVoice = this._shot('misc', pos, 1.0, { ref: 120, max: 600, bus: this.amb, verb: 0.55 }, (out, t, p, v) => {
      const lp = this._filter(v, out, 'lowpass', 2400);
      return this._buf(v, lp, buf, t, { dur: Math.min(buf.duration, 75), fadeIn: 3, fadeOut: 6, gain: 0.32 });
    });
    if (this.adhanVoice) this.adhanVoice.pri = 99; // a long layer: never stolen by short sounds
  }

  // ------------------------------------------------------------ alarms
  alarm(pos, seconds = 14) {
    if (!this.enabled || this.paused || this.alarms.length >= 2) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'square';
    const per = Math.random() < 0.5 ? 0.25 : 0.5;
    for (let k = 0; k < seconds / per; k++) o.frequency.setValueAtTime(k % 2 ? 1250 : 850, t + k * per);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 1.2;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2500;
    const g = c.createGain(); g.gain.value = 0;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    o.connect(f).connect(lp).connect(g);
    if (pan) g.connect(pan).connect(this.sfx); else g.connect(this.sfx);
    o.start(t); o.stop(t + seconds);
    this.alarms.push({ pos: { x: pos.x, z: pos.z }, g, pan, end: t + seconds, nodes: [o, f, lp, g, ...(pan ? [pan] : [])] });
  }

  // ------------------------------------------------------------ combat
  footstep(pos, vol = 0.12, hard = false) {
    if (!this.enabled) return;
    this._shot('step', pos, vol * 1.6, { ref: 3, max: 30, verb: 0 }, (out, t, p, v) => {
      const s = this._sprite('step');
      if (s) return this._buf(v, out, s.buf, t, { offset: s.off, dur: s.dur, rate: R(0.88, 1.08) * (hard ? 1 : 0.92) });
      const f = this._filter(v, out, 'lowpass', (hard ? 1400 : 700) + Math.random() * 500);
      const n = this.ctx.createGain(); this._env(n.gain, t, 0.004, 1, 0.07); n.connect(f); v.nodes.push(n);
      this._noise(v, n, this.white, t, 0.1, 0.6 + Math.random() * 0.3);
      return 0.12;
    });
  }

  // baton / arm swing: a short, directional whoosh
  swing(pos = null, heavy = false) {
    if (!this.enabled) return;
    this._shot('swing', pos, heavy ? 0.4 : 0.3, { ref: 2.5, max: 16, verb: 0 }, (out, t, p, v) => {
      const dur = R(0.16, 0.22);
      const bp = this._filter(v, out, 'bandpass', 500, 1.8);
      bp.frequency.setValueAtTime(R(450, 600), t); bp.frequency.exponentialRampToValueAtTime(R(1800, 2600), t + dur * 0.6); bp.frequency.exponentialRampToValueAtTime(900, t + dur);
      const g = this.ctx.createGain(); g.connect(bp); v.nodes.push(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      this._noise(v, g, this.white, t, dur + 0.02);
      return dur;
    });
  }

  // kind: 'body' (baton or fist on a person), 'shield' (blow on a riot shield), 'stone' (projectile)
  impact(pos, heavy = false, shield = false, kind = shield ? 'shield' : 'body') {
    if (!this.enabled) return;
    // one blow = one sound (a strike and its knock-down arrive in the same frame)
    const now = this.ctx.currentTime;
    this.recentHits = (this.recentHits || []).filter((r) => now - r.t < 0.08);
    if (pos && this.recentHits.some((r) => Math.hypot(r.x - pos.x, r.z - pos.z) < 1.5)) return;
    if (pos) this.recentHits.push({ x: pos.x, z: pos.z, t: now });
    const vol = kind === 'stone' ? 0.45 : heavy ? 0.85 : 0.65;
    this._shot('impact', pos, vol, { ref: 4, max: 70, far: 22, farKeep: 0.4 }, (out, t, p, v) => {
      const s = this._sprite(kind === 'shield' ? 'shield' : kind === 'stone' ? 'stone' : 'punch');
      let len = 0.25;
      if (s) len = this._buf(v, out, s.buf, t, { offset: s.off, dur: s.dur, rate: R(0.9, 1.08) * (heavy ? 0.92 : 1) });
      else {
        // synthesised stand-in: filtered noise crack
        const f = this._filter(v, out, kind === 'shield' ? 'bandpass' : 'lowpass', kind === 'shield' ? 1800 : 1200, 2);
        const g = this.ctx.createGain(); this._env(g.gain, t, 0.002, kind === 'shield' ? 0.9 : 0.6, kind === 'shield' ? 0.25 : 0.08); g.connect(f); v.nodes.push(g);
        this._noise(v, g, this.white, t, 0.3);
      }
      // restrained low-frequency weight; a shield also rings slightly
      if (kind !== 'stone' && p.d < 25) this._thud(v, out, t, kind === 'shield' ? 160 : 120, 48, heavy ? 0.14 : 0.1, heavy ? 0.35 : 0.22);
      if (kind === 'shield' && this.samples.metal && heavy) {
        const m = this._sprite('metal'); this._buf(v, out, m.buf, t + 0.005, { offset: m.off, dur: 0.5, rate: R(1.3, 1.6), gain: 0.18 });
      }
      return len;
    });
  }

  hurt(player = true) {
    if (!this.enabled) return;
    this._shot('shout', null, player ? 0.4 : 0.3, { verb: 0 }, (out, t, p, v) => {
      const s = this._sprite('grunt');
      if (s) return this._buf(v, out, s.buf, t, { offset: s.off, dur: s.dur, rate: player ? R(0.85, 0.95) : R(1, 1.1) });
      return 0.1;
    });
  }

  glass(pos, vol = 0.8) {
    if (!this.enabled) return;
    this._shot('glass', pos, vol, { ref: 6, max: 110, far: 35, farKeep: 0.45 }, (out, t, p, v) => {
      const s = this._sprite('glass');
      if (s) return this._buf(v, out, s.buf, t, { offset: s.off, dur: s.dur, rate: R(0.88, 1.12), fadeOut: 0.3 });
      const f = this._filter(v, out, 'highpass', 3000);
      const g = this.ctx.createGain(); this._env(g.gain, t, 0.002, 0.8, 0.3); g.connect(f); v.nodes.push(g);
      this._noise(v, g, this.white, t, 0.4);
      return 0.5;
    });
  }

  // metal crash with a few bounces (crowd barrier, bin, scooter, street furniture)
  crash(pos, size = 1) {
    if (!this.enabled) return;
    this._shot('crash', pos, 0.6 * size, { ref: 6, max: 120 }, (out, t, p, v) => {
      if (!this.samples.metal) return 0.1;
      let tt = t;
      const hits = 2 + Math.floor(Math.random() * 3);
      for (let h = 0; h < hits; h++) {
        const s = this._sprite('metal');
        this._buf(v, out, s.buf, tt, { offset: s.off, dur: s.dur, rate: R(0.75, 1.05), gain: h === 0 ? 1 : R(0.25, 0.55) });
        tt += R(0.12, 0.35);
      }
      return tt - t + 1.2;
    });
  }

  // a shop shutter being kicked: a fast rattle of light metal hits
  shutter(pos) {
    if (!this.enabled) return;
    this._shot('crash', pos, 0.5, { ref: 6, max: 110 }, (out, t, p, v) => {
      if (!this.samples.metal) return 0.1;
      const kicks = 1 + Math.floor(Math.random() * 3);
      let tt = t;
      for (let k = 0; k < kicks; k++) {
        const s = this._sprite('metal');
        this._buf(v, out, s.buf, tt, { offset: s.off, dur: s.dur, rate: R(1.1, 1.4), gain: 1 });
        for (let r = 1; r < 5; r++) { const s2 = this._sprite('metal'); this._buf(v, out, s2.buf, tt + r * R(0.04, 0.07), { offset: s2.off, dur: 0.3, rate: R(1.5, 1.9), gain: 0.5 / r }); }
        tt += R(0.4, 0.7);
      }
      return tt - t + 1;
    });
  }

  // Explosion: sharp recorded attack, a low thump, debris close by and a long
  // rumble tail. Distance darkens and delays it and drops the detail layers.
  explosion(pos, size = 1, opts = {}) {
    if (!this.enabled || this.paused) return;
    const now = this.ctx.currentTime;
    // one gameplay event = one bang: merge blasts at the same spot within 0.25 s
    this.recentBooms = this.recentBooms.filter((r) => now - r.t < 0.25);
    if (pos && this.recentBooms.some((r) => Math.hypot(r.x - pos.x, r.z - pos.z) < 8)) return;
    if (pos) this.recentBooms.push({ x: pos.x, z: pos.z, t: now });
    const v = this._shot('boom', pos, (opts.ambient ? 0.75 : 1.05) * size, { ref: 10, max: 280, delay: true, bus: opts.ambient ? this.amb : this.sfx }, (out, t, p, vc) => {
      const near = p.d < 45, mid = p.d < 120;
      let len = 0.6;
      const s = this._sprite('boom');
      if (s) len = this._buf(vc, out, s.buf, t, { offset: s.off, dur: s.dur, rate: R(0.82, 1.0) * (size > 1 ? 0.9 : 1), fadeOut: 0.6 });
      else {
        const f = this._filter(vc, out, 'lowpass', 4000 - Math.min(1, p.d / 90) * 3000);
        f.frequency.exponentialRampToValueAtTime(160, t + 1.4);
        const g = this.ctx.createGain(); this._env(g.gain, t, 0.004, 1, 1.4 + size * 0.6); g.connect(f); vc.nodes.push(g);
        this._noise(vc, g, this.white, t, 2.2, R(0.8, 1.2));
      }
      if (mid) this._thud(vc, out, t, R(58, 72), 28, 0.5 + size * 0.2, (near ? 0.75 : 0.4) * size);
      // debris: glass and metal raining down nearby
      if (near && size > 0.55 && !opts.ambient) {
        for (let k = 0; k < 2 + Math.floor(size * 2); k++) {
          const d = this._sprite(Math.random() < 0.6 ? 'glass' : 'metal');
          if (d) this._buf(vc, out, d.buf, t + R(0.25, 1.1), { offset: d.off, dur: Math.min(d.dur, 1.2), rate: R(0.9, 1.3), gain: R(0.08, 0.2), fadeOut: 0.2 });
        }
      }
      // rumble tail rolling off the façades
      const tail = 2.5 + size * 2.5;
      const lp = this._filter(vc, out, 'lowpass', 240);
      const tg = this.ctx.createGain(); tg.connect(lp); vc.nodes.push(tg);
      tg.gain.setValueAtTime(0.0001, t); tg.gain.exponentialRampToValueAtTime(0.5 * size, t + 0.06); tg.gain.exponentialRampToValueAtTime(0.0001, t + tail);
      this._noise(vc, tg, this.brown, t, tail);
      return Math.max(len, tail);
    });
    if (!v) return;
    if (v.place.d < 40 && size > 0.6) this._duckAmbience(0.6, 0.3);
    // the crowd answers a big bang with a roar
    if (!opts.ambient && size > 0.7 && v.place.d < 90 && Math.random() < 0.5) this._later(R(0.3, 0.8), () => this.roar(pos));
  }

  // petrol bomb landing: bottle shatter, fuel igniting with a whoomp, a brief burst.
  // The sustained burning comes from the fire voices following effects.flames.
  molotov(pos, size = 1) {
    if (!this.enabled || this.paused) return;
    this.glass(pos, 0.75);
    this._shot('boom', pos, 0.85 * size, { ref: 8, max: 200, delay: true }, (out, t, p, v) => {
      const bp = this._filter(v, out, 'bandpass', 300, 0.8);
      bp.frequency.setValueAtTime(260, t + 0.03); bp.frequency.exponentialRampToValueAtTime(1300, t + 0.25); bp.frequency.exponentialRampToValueAtTime(500, t + 1.4);
      const g = this.ctx.createGain(); g.connect(bp); v.nodes.push(g);
      g.gain.setValueAtTime(0.0001, t + 0.03); g.gain.exponentialRampToValueAtTime(1.2, t + 0.16); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      this._noise(v, g, this.white, t + 0.03, 1.6);
      if (p.d < 60) this._thud(v, out, t + 0.04, 90, 35, 0.35, 0.45);
      const s = this._sprite('boom');
      if (s) this._buf(v, out, s.buf, t + 0.04, { offset: s.off, dur: 1.4, rate: R(1.05, 1.2), gain: 0.35, fadeOut: 0.5 });
      if (this.samples.fire) { const f = this.samples.fire; this._buf(v, out, f, t + 0.1, { offset: R(0, f.duration - 3), dur: 2.5, gain: 0.9, fadeIn: 0.15, fadeOut: 1.2 }); }
      return 2.6;
    });
  }

  // firework mortar launch: a hollow thump and a rising hiss
  thump(pos) {
    if (!this.enabled) return;
    this._shot('fw', pos, 0.5, { ref: 6, max: 150 }, (out, t, p, v) => {
      this._thud(v, out, t, 140, 50, 0.18, 0.8);
      const f = this._filter(v, out, 'bandpass', 2500, 4);
      f.frequency.setValueAtTime(2500, t); f.frequency.exponentialRampToValueAtTime(5000, t + 0.9);
      const g = this.ctx.createGain(); g.connect(f); v.nodes.push(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      this._noise(v, g, this.white, t, 1.1);
      return 1.1;
    });
  }

  // airborne firework burst (recorded detonation and crackle)
  firework(pos) {
    if (!this.enabled) return;
    this._shot('fw', pos, 1.0, { ref: 12, max: 220, delay: true }, (out, t, p, v) => {
      if (p.d < 120) this._thud(v, out, t, 90, 40, 0.25, 0.5);
      const buf = this.samples.fwStreet;
      if (buf) return this._buf(v, out, buf, t, { offset: R(0, buf.duration - 3), dur: R(1.2, 2.2), fadeIn: 0.004, fadeOut: 0.4 });
      const f = this._filter(v, out, 'lowpass', 6000); f.frequency.exponentialRampToValueAtTime(300, t + 0.5);
      const g = this.ctx.createGain(); this._env(g.gain, t, 0.002, 1, 0.6); g.connect(f); v.nodes.push(g);
      this._noise(v, g, this.white, t, 0.8);
      return 0.8;
    });
  }

  // a frightened scream: a voiced source whose pitch jumps up and then sags,
  // with vibrato, shaped by open-vowel formants, a little rasp and breath noise
  scream(pos, female = true) {
    if (!this.enabled) return;
    this._shot('scream', pos, 0.42, { ref: 6, max: 90, far: 40, farKeep: 0.4 }, (out, t, p, v) => {
      const c = this.ctx, dur = R(0.55, 1.25);
      const f0 = female ? R(620, 920) : R(320, 480);
      const osc = c.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f0 * 0.75, t);
      osc.frequency.linearRampToValueAtTime(f0 * R(1.05, 1.2), t + dur * 0.22);
      osc.frequency.linearRampToValueAtTime(f0 * R(0.72, 0.88), t + dur);
      const vib = c.createOscillator(); vib.frequency.value = R(5.5, 9);
      const vg = c.createGain(); vg.gain.value = f0 * R(0.02, 0.045);
      vib.connect(vg).connect(osc.frequency);
      const env = c.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(1, t + 0.05);
      env.gain.setValueAtTime(1, t + dur * 0.6);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const rasp = c.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; curve[i] = Math.tanh(x * 2.5); }
      rasp.curve = curve;
      osc.connect(rasp).connect(env);
      const scale = female ? 1.15 : 1;
      for (const [f, q, g] of [[R(850, 1050) * scale, 6, 1], [R(1350, 1700) * scale, 8, 0.6], [2900 * scale, 10, 0.25]]) {
        const bp = this._filter(v, out, 'bandpass', f, q);
        const gg = c.createGain(); gg.gain.value = g * 2.2; env.connect(gg).connect(bp); v.nodes.push(gg);
      }
      const breath = this._gain(v, this._filter(v, out, 'highpass', 2200), 0.06);
      const bg = c.createGain(); this._env(bg.gain, t, 0.05, 1, dur); bg.connect(breath); v.nodes.push(bg);
      this._noise(v, bg, this.white, t, dur);
      osc.start(t); vib.start(t); osc.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
      v.srcs.push(osc, vib); v.nodes.push(osc, vib, vg, env, rasp);
      return dur;
    });
  }

  lighter(pos) {
    if (!this.enabled) return;
    this._shot('misc', pos, 0.5, { ref: 3, max: 30, verb: 0 }, (out, t, p, v) => {
      const f = this._filter(v, out, 'highpass', 2000);
      const g = this.ctx.createGain(); this._env(g.gain, t, 0.002, 1, 0.05); g.connect(f); v.nodes.push(g);
      this._noise(v, g, this.white, t, 0.08);
      const f2 = this._filter(v, out, 'bandpass', 800);
      const g2 = this.ctx.createGain(); g2.connect(f2); v.nodes.push(g2);
      g2.gain.setValueAtTime(0.0001, t + 0.1); g2.gain.exponentialRampToValueAtTime(0.5, t + 0.2); g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      this._noise(v, g2, this.white, t + 0.1, 1.2);
      return 1.3;
    });
  }

  // ------------------------------------------------------------ UI
  ui(kind = 'click') {
    if (!this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    const freqs = { click: [880, 880], good: [660, 990], bad: [300, 200], alert: [740, 520], radio: [1200, 1200] }[kind] || [800, 800];
    o.frequency.setValueAtTime(freqs[0], t); o.frequency.setValueAtTime(freqs[1], t + 0.08);
    const g = c.createGain(); this._env(g.gain, t, 0.005, 0.12, 0.18);
    o.connect(g).connect(this.uiBus); o.start(t); o.stop(t + 0.3);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  }

  // diagnostics for tests (?dev): what is playing right now
  stats() {
    if (!this.ctx) return { state: 'none' };
    const cats = {};
    for (const v of this.voices) if (v.end > this.ctx.currentTime) cats[v.cat] = (cats[v.cat] || 0) + 1;
    return { state: this.ctx.state, voices: this.voices.length, cats, vehicles: this.vehicles.length, alarms: this.alarms.length, loaded: Object.keys(this.samples), game: +this.game.gain.value.toFixed(2), master: +this.master.gain.value.toFixed(2) };
  }
}
