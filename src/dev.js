// Developer helpers, loaded only with ?dev in the URL. Lets automated tests
// step the simulation deterministically when the tab is not animating.
export function installDev(game) {
  window.__step = (sec, fn) => {
    const n = Math.round(sec * 60);
    for (let i = 0; i < n; i++) { if (fn) fn(i); if (game.state === 'playing') game.update(1 / 60); game.input.endFrame(); }
    game.renderer.shadowMap.needsUpdate = true;
    game.render();
  };
  window.__start = () => { game.audio.init(); game.play(); game._dismissOnboarding(); };
  // line up a few agents in front of the camera for inspection
  window.__studio = (filter, z = 156, n = 4) => {
    const list = game.crowd.npcs.filter(filter).slice(0, n);
    list.forEach((a, i) => { a.pos.set(-3 + i * 2, 0, z); a.anchor.copy(a.pos); a.state = 'act'; a.st = 0; a.dur = 99; a.lookT = 99; a.focus.set(0, 0, 175); });
    game.player.pos.set(0.6, 0, z + 4); game.player.heading = Math.PI; game.cameraRig.yaw = 0; game.cameraRig.pitch = -0.06;
    return list.map((a) => [a.id, a.rig.kind, a.role]);
  };
  // A simple test bot that plays with normal controls only (no teleporting):
  // chases the nearest active threat, otherwise follows the objective marker,
  // arrests downed aggressors and extracts the officers at the end.
  window.__bot = { log: [], stuckT: 0, side: 1, last: null };
  window.__botTick = () => {
    const g = game, I = g.input, m = g.missions, B = window.__bot, p = g.player.pos;
    I.keys.clear(); I.buttons.clear();
    const threat = g.crowd.nearest(p, (n) => g.crowd.isThreat(n) || (n.script && n.script.active), m.stage === 'p3' ? 12 : 30);
    let goal = null, fight = false;
    if (threat) { goal = threat.pos; fight = true; } else if (m.markerPos) goal = m.markerPos;
    if (g.crowd.arrestable(p) && !threat) I.edges.add('KeyE');
    if (m.stage === 'final' && m.extractReady && Math.hypot(p.x + 3, p.z + 112) < 4) I.edges.add('KeyE');
    if (goal) {
      const dx = goal.x - p.x, dz = goal.z - p.z, d = Math.hypot(dx, dz);
      g.cameraRig.yaw = Math.atan2(-dx, -dz) + (B.stuckT > 0.6 ? B.side * 0.9 : 0);
      if (fight && d < 1.8) I.edges.add('Mouse0'); else { I.keys.add('KeyW'); if (d > 6) I.keys.add('ShiftLeft'); if (B.strafeT > 0) { B.strafeT -= 0.1; I.keys.add(B.side > 0 ? 'KeyD' : 'KeyA'); I.keys.delete('KeyW'); } }
      const before = p.clone();
      window.__step(0.1);
      if (p.distanceTo(before) < 0.05 && !(fight && d < 1.8)) { B.stuckT += 0.1; if (B.stuckT > 1.2) { B.stuckT = 0; B.side *= -1; B.strafeT = 1.6; } } else B.stuckT = Math.max(0, B.stuckT - 0.05);
    } else window.__step(0.1);
    if (B.last !== m.stage) { B.log.push([m.stage, +m.t.toFixed(1)]); B.last = m.stage; }
  };
  window.__botRun = (ms = 20000) => {
    const t0 = performance.now(); let i = 0;
    while (performance.now() - t0 < ms && !game.missions.ended) { window.__botTick(); i++; }
    const m = game.missions;
    return { ticks: i, log: window.__bot.log, t: +m.t.toFixed(1), stage: m.stage, hp: +game.player.health.toFixed(0), score: m.score, ended: m.ended, state: game.state };
  };

  // Audio probe: taps the mix before and after the limiter and reports, per second,
  // RMS and peak level (dBFS), clipped samples and the voices playing.
  window.__audioProbe = (seconds = 10) => new Promise((resolve) => {
    const a = game.audio, c = a.ctx;
    if (!c) return resolve({ error: 'audio not initialised' });
    const tap = (node) => {
      const sp = c.createScriptProcessor(4096, 2, 1), acc = { sum: 0, n: 0, peak: 0, clip: 0 };
      sp.onaudioprocess = (e) => {
        for (let ch = 0; ch < e.inputBuffer.numberOfChannels; ch++) {
          const d = e.inputBuffer.getChannelData(ch);
          for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); acc.sum += v * v; acc.n++; if (v > acc.peak) acc.peak = v; if (v >= 0.999) acc.clip++; }
        }
      };
      const mute = c.createGain(); mute.gain.value = 0;
      node.connect(sp); sp.connect(mute).connect(c.destination);
      return { sp, acc };
    };
    const pre = tap(a.makeup), post = tap(a.limiter);
    const dB = (v) => (v > 0 ? +(20 * Math.log10(v)).toFixed(1) : -120);
    const rows = [];
    let k = 0;
    const iv = setInterval(() => {
      const row = { s: ++k, rms: dB(Math.sqrt(post.acc.sum / Math.max(1, post.acc.n))), peak: dB(post.acc.peak), clip: post.acc.clip, prePeak: dB(pre.acc.peak), voices: a.stats().cats, sirens: a.vehicles.length };
      rows.push(row);
      for (const t of [pre, post]) Object.assign(t.acc, { sum: 0, n: 0, peak: 0, clip: 0 });
      if (k >= seconds) { clearInterval(iv); for (const t of [pre, post]) t.sp.disconnect(); resolve(rows); }
    }, 1000);
  });

  // count how often each sound is requested and how often the voice limiter admits it
  window.__audioEvents = (seconds = 30) => new Promise((resolve) => {
    const a = game.audio, counts = {}, admitted = {};
    const names = ['explosion', 'molotov', 'glass', 'impact', 'swing', 'shout', 'chant', 'whistle', 'roar', 'crash', 'shutter', 'firework', 'distantBang', 'footstep', 'hurt', 'thump', 'adhan', 'alarm', 'scream'];
    const orig = {};
    for (const n of names) { orig[n] = a[n]; a[n] = function (...args) { counts[n] = (counts[n] || 0) + 1; return orig[n].apply(this, args); }; }
    const admit = a._admit;
    a._admit = function (cat, level) { const v = admit.call(this, cat, level); if (v) admitted[cat] = (admitted[cat] || 0) + 1; return v; };
    setTimeout(() => { for (const n of names) a[n] = orig[n]; a._admit = admit; resolve({ seconds, requested: counts, admitted }); }, seconds * 1000);
  });

  window.__perf = (frames = 60) => {
    const t0 = performance.now();
    for (let i = 0; i < frames; i++) { game.update(1 / 60); game.render(); }
    const ms = (performance.now() - t0) / frames;
    const info = game.renderer.info.render;
    return { msPerFrame: +ms.toFixed(2), calls: info.calls, tris: info.triangles };
  };
}
