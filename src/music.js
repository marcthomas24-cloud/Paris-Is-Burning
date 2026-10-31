// Synthesised score (Levels 2 and 3) and cinematic stings.
//
// A score built from oscillators and noise (no recordings): a slow minor pad that is always
// there, a low pulse that comes in for fights and quickens for bosses, a sub drone under boss
// fights, and a resolving chord for the victory. Level 3 adds an ostinato (a short repeating
// figure on the chord tones) and builds through its acts. Like the rest of the soundscape it is
// driven from update() (no free-running timers): beats are scheduled a little ahead of the
// audio clock.
//
// Signal: voices -> duck (under radio lines) -> music bus (Music volume setting) -> game bus
// (pause fade) -> master.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz
// A theme per level: a chord progression (two bars per chord), the chord the victory resolves
// to, and optional tempo overrides per state (bpm). Level 2: D minor (Dm, Bb, F, A), D major.
// Level 3: E minor with the Phrygian F (Em, F, Em, D), resolving to E major. Its `states` and
// `tiers` override the shared levels: tiers follow the act (0 the transfer, 1 the roadblock,
// 2 the square, 3 the intercept and the extraction) so the score builds through the level;
// `arp` is the ostinato's level and its pattern (ARP), `kickEvery` thins the pulse to a
// heartbeat, `ticks: false` drops the hi-hat. `intro` / `phase` are the notes of those stings.
export const THEMES = {
  l2: { chords: [[50, 53, 57], [46, 50, 53], [41, 45, 48], [45, 49, 52]], victory: [50, 54, 57], bpm: {} },
  l3: {
    chords: [[52, 55, 59], [53, 57, 60], [52, 55, 59], [50, 54, 57]], victory: [52, 56, 59], bpm: {},
    intro: [40, 47, 52, 55], phase: [40, 46, 52],
    states: {
      boss: { pad: 0.15, bright: 1250, pulse: 0.4, drone: 0.12, bpm: 116, arp: 0.1, arpPat: 'boss', arpBright: 2200 },
      boss3: { pad: 0.18, bright: 1700, pulse: 0.5, drone: 0.16, bpm: 132, arp: 0.13, arpPat: 'climax', arpBright: 3400 },
      victory: { pad: 0.2, bright: 1900, pulse: 0, drone: 0, bpm: 76, arp: 0 },
    },
    tiers: [
      { calm: { pad: 0.1, bright: 520, pulse: 0.12, bpm: 84, kickEvery: 2, ticks: false }, combat: { pad: 0.13, bright: 800, pulse: 0.22, bpm: 96 } },
      { calm: { pad: 0.12, bright: 650, pulse: 0.14, bpm: 92, kickEvery: 2, ticks: false, arp: 0.05, arpPat: 'low' }, combat: { pad: 0.14, bright: 950, pulse: 0.28, bpm: 104, arp: 0.07, arpPat: 'low' } },
      { calm: { pad: 0.13, bright: 800, pulse: 0.18, bpm: 100, arp: 0.06, arpPat: 'drive', ticks: false }, combat: { pad: 0.15, bright: 1100, pulse: 0.32, bpm: 110, arp: 0.09, arpPat: 'drive' } },
      { calm: { pad: 0.13, bright: 850, pulse: 0.18, bpm: 104, arp: 0.06, arpPat: 'drive', ticks: false }, combat: { pad: 0.16, bright: 1250, pulse: 0.34, bpm: 116, arp: 0.1, arpPat: 'drive' } },
    ],
  },
};
// Ostinato patterns: notes per beat (div) and the chord tone of each step (-1 rests); oct raises
// it by octaves. 'boss' is the Fixer's figure, accented 3 + 3 + 2; 'climax' doubles it an octave up.
const ARP = {
  low: { div: 2, oct: 1, steps: [0, -1, 2, -1, 1, -1, 2, -1] },
  drive: { div: 4, oct: 1, steps: [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 1, 2, 0, 2] },
  boss: { div: 4, oct: 1, steps: [0, -1, -1, 2, -1, -1, 1, -1, 0, -1, -1, 2, -1, -1, 1, 2] },
  climax: { div: 4, oct: 2, steps: [0, 2, 1, 2, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 0, 1], double: true },
};

// per state: pad level, pad brightness (filter Hz), pulse level, drone level, tempo (bpm).
// Levels keep the score under the soundscape (measured: about +2 dB RMS in boss fights).
const STATES = {
  off: { pad: 0, bright: 500, pulse: 0, drone: 0, bpm: 80 },
  calm: { pad: 0.12, bright: 650, pulse: 0, drone: 0, bpm: 80 },
  combat: { pad: 0.14, bright: 900, pulse: 0.26, drone: 0, bpm: 92 },
  boss: { pad: 0.15, bright: 1100, pulse: 0.4, drone: 0.12, bpm: 108 },
  boss3: { pad: 0.17, bright: 1500, pulse: 0.48, drone: 0.15, bpm: 122 },
  victory: { pad: 0.2, bright: 1800, pulse: 0, drone: 0, bpm: 80 },
};

export class Music {
  constructor(audio) {
    this.a = audio;
    this.state = 'off';
    this.tier = 0;
    this.started = false;
    this.theme = THEMES.l2;
    this.lastSting = {};
  }

  // switch the level's theme (unknown names keep the Level 2 one); takes effect at the next chord
  setTheme(name) {
    const th = THEMES[name] || THEMES.l2;
    if (th === this.theme) return;
    this.theme = th; this.tier = 0;
    if (this.started && this.a.enabled) this._apply(this.state, 1.5);
  }

  // Level 3: the act the score is in (themes without tiers ignore it)
  setTier(k) {
    if (!this.theme.tiers || k === this.tier) return;
    this.tier = k;
    if (this.started && this.a.enabled) this._apply(this.state, 2.5);
  }

  // the levels for a state: shared, then the theme's, then the current tier's
  _st(s = this.state) {
    const base = STATES[s] || STATES.off, th = this.theme;
    const own = th.states && th.states[s], tier = th.tiers && th.tiers[Math.min(this.tier, th.tiers.length - 1)][s];
    return own || tier ? { ...base, ...own, ...tier } : base;
  }

  // dip the music (radio lines): to depth for hold seconds, then back; depth 1 restores at once
  duck(depth, hold) {
    if (!this.started || !this.a.enabled) return;
    const t = this.a.ctx.currentTime, g = this.out.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    if (depth >= 1) { g.setTargetAtTime(1, t, 0.05); return; }
    g.setTargetAtTime(depth, t, 0.15); g.setTargetAtTime(1, t + hold, 0.8);
  }

  // build the persistent voices once the audio context exists
  _build() {
    const c = this.a.ctx;
    this.out = c.createGain(); this.out.connect(this.a.musicVol);
    this.bus = this.out;
    this.padOut = c.createGain(); this.padOut.gain.value = 0;
    this.padFilter = c.createBiquadFilter(); this.padFilter.type = 'lowpass'; this.padFilter.frequency.value = 600; this.padFilter.Q.value = 0.8;
    this.padFilter.connect(this.padOut).connect(this.bus);
    // slow movement in the pad's brightness
    this.lfo = c.createOscillator(); this.lfo.frequency.value = 0.07;
    this.lfoGain = c.createGain(); this.lfoGain.gain.value = 180;
    this.lfo.connect(this.lfoGain).connect(this.padFilter.frequency); this.lfo.start();
    // three chord notes, two slightly detuned saws each
    this.voices = [];
    for (let i = 0; i < 3; i++) for (const det of [-6, 7]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.detune.value = det;
      const g = c.createGain(); g.gain.value = 0.11;
      o.connect(g).connect(this.padFilter); o.start();
      this.voices.push({ o, i });
    }
    this.droneOut = c.createGain(); this.droneOut.gain.value = 0;
    this.drone = c.createOscillator(); this.drone.type = 'sine'; this.drone.frequency.value = NOTE(26);
    this.drone2 = c.createOscillator(); this.drone2.type = 'triangle'; this.drone2.frequency.value = NOTE(38); this.drone2.detune.value = 4;
    const d2g = c.createGain(); d2g.gain.value = 0.35;
    this.drone.connect(this.droneOut); this.drone2.connect(d2g).connect(this.droneOut);
    this.droneOut.connect(this.bus); this.drone.start(); this.drone2.start();
    this.pulseOut = c.createGain(); this.pulseOut.gain.value = 0; this.pulseOut.connect(this.bus);
    // the ostinato (Level 3): short square notes through one shared filter
    this.arpOut = c.createGain(); this.arpOut.gain.value = 0;
    this.arpFilter = c.createBiquadFilter(); this.arpFilter.type = 'lowpass'; this.arpFilter.frequency.value = 1400; this.arpFilter.Q.value = 2;
    this.arpFilter.connect(this.arpOut).connect(this.bus);
    this.chord = 0; this.bar = 0; this.beat = 0; this.nextBeat = c.currentTime + 0.1;
    this.chordNotes = this.theme.chords[0];
    this._setChord(this.theme.chords[0], 0.01);
    this.started = true;
  }

  _setChord(notes, tc = 1.2) {
    const t = this.a.ctx.currentTime;
    this.chordNotes = notes;
    for (const v of this.voices) v.o.frequency.setTargetAtTime(NOTE(notes[v.i]), t, tc);
    this.drone.frequency.setTargetAtTime(NOTE(notes[0] - 24), t, tc);
  }

  setState(s) {
    if (!this.a.enabled) { this.state = s; return; }
    if (!this.started) this._build();
    if (s === this.state) return;
    const prev = this.state;
    this.state = s;
    this._apply(s);
    if (s === 'victory') this._setChord(this.theme.victory, 0.8);
    else if (prev === 'victory') this._setChord(this.theme.chords[this.chord % this.theme.chords.length], 1.5);
  }

  // glide every layer to the levels of a state (tc: the pad's time constant)
  _apply(s, tc) {
    const t = this.a.ctx.currentTime, st = this._st(s);
    this.padOut.gain.setTargetAtTime(st.pad, t, tc ?? (s === 'off' ? 0.8 : 1.5));
    this.padFilter.frequency.setTargetAtTime(st.bright, t, 1.2);
    this.droneOut.gain.setTargetAtTime(st.drone, t, 1.0);
    this.pulseOut.gain.setTargetAtTime(st.pulse, t, 0.6);
    this.arpOut.gain.setTargetAtTime(st.arp || 0, t, st.arp ? 1.2 : 0.6);
    this.arpFilter.frequency.setTargetAtTime(st.arpBright || 1400, t, 1.0);
  }

  // called every frame from Audio.update
  update() {
    if (!this.started || !this.a.enabled) return;
    const c = this.a.ctx, st = this._st();
    const spb = 60 / (this.theme.bpm[this.state] || st.bpm);
    const arp = st.arp > 0 && ARP[st.arpPat];
    while (this.nextBeat < c.currentTime + 0.15) {
      const t = this.nextBeat;
      if (st.pulse > 0) {
        if (!st.kickEvery || this.beat % st.kickEvery === 0) this._kick(t, this.beat % 4 === 0 ? 1 : 0.6);
        if (st.ticks !== false && (this.state !== 'combat' || this.beat % 2 === 1)) this._tick(t + spb / 2, this.beat % 4 === 3 ? 0.5 : 0.3);
      }
      if (arp) {
        for (let i = 0; i < arp.div; i++) {
          const j = (this.beat * arp.div + i) % arp.steps.length, tone = arp.steps[j];
          if (tone < 0) continue;
          const n = this.chordNotes[tone] + 12 * arp.oct, at = t + (i * spb) / arp.div;
          const acc = j % 8 === 0 ? 1 : arp === ARP.boss ? 0.85 : 0.6;
          this._note(at, n, acc, spb / arp.div);
          if (arp.double) this._note(at, n - 12, acc * 0.6, spb / arp.div);
        }
      }
      this.beat++;
      if (this.beat % 8 === 0 && this.state !== 'victory') { const ch = this.theme.chords; this.chord = (this.chord + 1) % ch.length; this._setChord(ch[this.chord]); }
      this.nextBeat += spb;
    }
  }

  // one ostinato note: a short plucked square
  _note(t, midi, level, step) {
    const c = this.a.ctx;
    const o = c.createOscillator(); o.type = 'square'; o.frequency.value = NOTE(midi);
    const g = c.createGain(), len = Math.min(0.22, step * 0.9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * level, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(this.arpFilter); o.start(t); o.stop(t + len + 0.02);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  }

  _kick(t, level) {
    const c = this.a.ctx;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9 * level, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(this.pulseOut); o.start(t); o.stop(t + 0.4);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  }

  _tick(t, level) {
    const c = this.a.ctx;
    const s = c.createBufferSource(); s.buffer = this.a.white;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * level, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(f).connect(g).connect(this.pulseOut); s.start(t, Math.random() * 1.5, 0.08);
    s.onended = () => { s.disconnect(); f.disconnect(); g.disconnect(); };
  }

  // One-shot stings: 'warn' (unblockable wind-up), 'intro' (boss name card),
  // 'phase' (phase change), 'climax' (a boss's last phase), 'defeat' (a boss beaten),
  // 'victory'. They play on the music bus, unpositioned. The same sting never restarts on top
  // of itself (0.35 s for the warning, a second for the rest).
  sting(kind) {
    if (!this.a.enabled) return;
    if (!this.started) this._build();
    const c = this.a.ctx, t = c.currentTime + 0.01, out = this.bus;
    if (t - (this.lastSting[kind] ?? -9) < (kind === 'warn' ? 0.35 : 1.0)) return;
    this.lastSting[kind] = t;
    if (kind === 'climax') { this._riser(t, out); kind = 'phase'; }
    const env = (g, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
    const nodes = [];
    const osc = (type, f, det = 0) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; nodes.push(o); return o; };
    const gain = () => { const g = c.createGain(); nodes.push(g); return g; };
    const done = (len) => setTimeout(() => nodes.forEach((n) => { try { n.disconnect(); } catch (e) { /* gone */ } }), (len + 0.2) * 1000);
    if (kind === 'warn') {
      // two quick rising blips: something heavy is coming
      for (const [dt, f] of [[0, 620], [0.11, 930]]) {
        const o = osc('triangle', f), g = gain();
        g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(0.22, t + dt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.1);
        o.frequency.setValueAtTime(f, t + dt); o.frequency.linearRampToValueAtTime(f * 1.25, t + dt + 0.09);
        o.connect(g).connect(out); o.start(t + dt); o.stop(t + dt + 0.12);
      }
      done(0.3);
    } else if (kind === 'intro' || kind === 'phase') {
      // low swelling stab (minor), with a sub hit for phase changes
      const notes = kind === 'intro' ? this.theme.intro || [38, 45, 50, 53] : this.theme.phase || [38, 44, 50];
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(kind === 'intro' ? 1800 : 2600, t + 0.35); f.frequency.exponentialRampToValueAtTime(400, t + 1.6); nodes.push(f);
      const g = gain(); env(g, kind === 'intro' ? 0.25 : 0.04, kind === 'intro' ? 0.32 : 0.4, kind === 'intro' ? 1.8 : 1.2);
      f.connect(g).connect(out);
      for (const n of notes) for (const det of [-8, 8]) { const o = osc('sawtooth', NOTE(n), det); o.connect(f); o.start(t); o.stop(t + 2.3); }
      if (kind === 'phase') {
        const sub = osc('sine', 70), sg = gain();
        sub.frequency.setValueAtTime(90, t); sub.frequency.exponentialRampToValueAtTime(32, t + 0.6);
        env(sg, 0.01, 0.9, 0.7); sub.connect(sg).connect(out); sub.start(t); sub.stop(t + 0.9);
      }
      done(2.4);
    } else if (kind === 'victory') {
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; nodes.push(f);
      const g = gain(); env(g, 0.4, 0.3, 3.2); f.connect(g).connect(out);
      // the theme's resolving chord with its third and fifth an octave up
      const top = this.theme === THEMES.l2 ? [62, 66] : [this.theme.victory[1] + 12, this.theme.victory[2] + 12];
      for (const n of [...this.theme.victory, ...top]) for (const det of [-5, 6]) { const o = osc('sawtooth', NOTE(n), det); o.connect(f); o.start(t); o.stop(t + 3.8); }
      done(3.9);
    } else if (kind === 'defeat') {
      // a falling minor stab over a sub hit: the fight is over, the mission is not
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(350, t + 1.8); nodes.push(f);
      const g = gain(); env(g, 0.02, 0.34, 1.9); f.connect(g).connect(out);
      const root = (this.theme.phase || [38])[0] + 12;
      for (const [n, at] of [[root + 7, 0], [root + 3, 0.12], [root, 0.24]]) for (const det of [-7, 7]) {
        const o = osc('sawtooth', NOTE(n), det); o.frequency.setValueAtTime(NOTE(n), t + at); o.frequency.exponentialRampToValueAtTime(NOTE(n - 1), t + at + 1.4);
        o.connect(f); o.start(t + at); o.stop(t + 2.1);
      }
      const sub = osc('sine', 80), sg = gain();
      sub.frequency.setValueAtTime(80, t); sub.frequency.exponentialRampToValueAtTime(30, t + 0.9);
      env(sg, 0.01, 0.8, 0.9); sub.connect(sg).connect(out); sub.start(t); sub.stop(t + 1.1);
      done(2.2);
    }
  }

  // a rising noise sweep into a last phase (played before the phase stab)
  _riser(t, out) {
    const c = this.a.ctx;
    const s = c.createBufferSource(); s.buffer = this.a.white; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(5200, t + 1.1);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 1.0); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + 1.35);
    s.onended = () => { s.disconnect(); f.disconnect(); g.disconnect(); };
  }
}
