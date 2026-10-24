// Synthesised music stand-in (Level 2) and cinematic stings.
//
// A placeholder score built from oscillators and noise, until licensed music is
// sourced: a slow minor pad that is always there, a low pulse that comes in for
// fights and quickens for bosses, a sub drone under boss fights, and a resolving
// chord for the victory. Like the rest of the soundscape it is driven from update()
// (no free-running timers): beats are scheduled a little ahead of the audio clock.
//
// Signal: voices -> music bus (Music volume setting) -> game bus (pause fade) -> master.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz
// D minor progression, two bars per chord: Dm, Bb, F, A
const CHORDS = [[50, 53, 57], [46, 50, 53], [41, 45, 48], [45, 49, 52]];
const VICTORY = [50, 54, 57]; // D major: the resolve

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
    this.started = false;
  }

  // build the persistent voices once the audio context exists
  _build() {
    const c = this.a.ctx;
    this.bus = this.a.musicVol;
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
    this.chord = 0; this.bar = 0; this.beat = 0; this.nextBeat = c.currentTime + 0.1;
    this._setChord(CHORDS[0], 0.01);
    this.started = true;
  }

  _setChord(notes, tc = 1.2) {
    const t = this.a.ctx.currentTime;
    for (const v of this.voices) v.o.frequency.setTargetAtTime(NOTE(notes[v.i]), t, tc);
    this.drone.frequency.setTargetAtTime(NOTE(notes[0] - 24), t, tc);
  }

  setState(s) {
    if (!this.a.enabled) { this.state = s; return; }
    if (!this.started) this._build();
    if (s === this.state) return;
    const prev = this.state;
    this.state = s;
    const c = this.a.ctx, t = c.currentTime, st = STATES[s] || STATES.off;
    this.padOut.gain.setTargetAtTime(st.pad, t, s === 'off' ? 0.8 : 1.5);
    this.padFilter.frequency.setTargetAtTime(st.bright, t, 1.2);
    this.droneOut.gain.setTargetAtTime(st.drone, t, 1.0);
    this.pulseOut.gain.setTargetAtTime(st.pulse, t, 0.6);
    if (s === 'victory') this._setChord(VICTORY, 0.8);
    else if (prev === 'victory') this._setChord(CHORDS[this.chord], 1.5);
  }

  // called every frame from Audio.update
  update() {
    if (!this.started || !this.a.enabled) return;
    const c = this.a.ctx, st = STATES[this.state] || STATES.off;
    const spb = 60 / st.bpm;
    while (this.nextBeat < c.currentTime + 0.15) {
      const t = this.nextBeat;
      if (st.pulse > 0) {
        this._kick(t, this.beat % 4 === 0 ? 1 : 0.6);
        if (this.state !== 'combat' || this.beat % 2 === 1) this._tick(t + spb / 2, this.beat % 4 === 3 ? 0.5 : 0.3);
      }
      this.beat++;
      if (this.beat % 8 === 0 && this.state !== 'victory') { this.chord = (this.chord + 1) % CHORDS.length; this._setChord(CHORDS[this.chord]); }
      this.nextBeat += spb;
    }
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
  // 'phase' (phase change), 'victory'. They play on the music bus, unpositioned.
  sting(kind) {
    if (!this.a.enabled) return;
    if (!this.started) this._build();
    const c = this.a.ctx, t = c.currentTime + 0.01, out = this.bus;
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
      const notes = kind === 'intro' ? [38, 45, 50, 53] : [38, 44, 50];
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
      for (const n of [...VICTORY, 62, 66]) for (const det of [-5, 6]) { const o = osc('sawtooth', NOTE(n), det); o.connect(f); o.start(t); o.stop(t + 3.8); }
      done(3.9);
    }
  }
}
