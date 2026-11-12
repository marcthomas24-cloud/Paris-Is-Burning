// Paris Burning — bootstrap, game loop and state machine.
import { SEED, isolateRender } from './seed.js'; // first: seeds Math.random when ?seed=N is given
import * as THREE from 'three';
import { World, quietly } from './world.js';
import { Effects } from './effects.js';
import { VehicleFires } from './burn.js';
import { Audio, BOULEVARD_SIREN_LANES } from './audio.js';
import { Crowd } from './crowd.js';
import { Brawls } from './brawls.js';
import { Player } from './player.js';
import { CameraRig } from './camera.js';
import { LEVELS, LIGHTING, Progress } from './levels.js';
import { HUD } from './hud.js';
import { Input } from './input.js';
import { loadHumans, makeEnvMap, Humans } from './humans.js';
import { IncidentScheduler, BOULEVARD_EVENTS } from './events.js';
import { Post } from './post.js';
import { Cinematic } from './cinematic.js';
import { TouchControls } from './touch.js';
import { CampaignUI, CAMPAIGN, mission, nextMission, completedCount, summarize, assess } from './campaign.js';

const $ = (id) => document.getElementById(id);
// controls during a cinematic: nothing pressed
const PREFS_KEY = 'parisBurning.gameplay.v1';
const PREF_DEFAULTS = { sens: 1, invertY: false, brutality: false, lockOn: true, assisted: false };
const NO_AIDS = { lockOn: false, assisted: false };
const wrapAngle = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
function loadPrefs() {
  try { return { ...PREF_DEFAULTS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch (e) { return { ...PREF_DEFAULTS }; }
}

const NULL_INPUT = { down: () => false, pressed: () => false, mouse: () => false, axis: { x: 0, y: 0 } };

class Game {
  constructor() {
    const canvas = $('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.maxPR = Math.min(devicePixelRatio, 1.5);
    this.pr = Math.min(this.maxPR, 1.25);
    this.renderer.setPixelRatio(this.pr);
    this.perf = { acc: 0, frames: 0 };
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x8c867e, 0.0125);
    this.scene.background = new THREE.Color(0x8c867e);
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 600);

    // overcast late-afternoon light: soft sky fill + low warm sun through haze
    this.hemi = new THREE.HemisphereLight(0xc4c6ca, 0x5a5044, 1.7);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffd6a8, 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -42; sc.right = 42; sc.top = 42; sc.bottom = -42; sc.near = 1; sc.far = 160;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    this.sun = sun; this.sunOffset = new THREE.Vector3(-30, 70, -38);
    this.scene.add(sun, sun.target);
    // police light-bar glow
    this.policeLights = [0, 1].map(() => { const l = new THREE.PointLight(0x3060ff, 0, 22, 1.8); this.scene.add(l); return l; });

    this.time = 0;
    this.timeScale = 1;
    this.hitStopT = 0;
    this.state = 'menu';
    this.input = new Input(canvas);
    this.prefs = loadPrefs();
    if (this.input.touch) { this.pr = Math.min(this.maxPR, 1.0); this.renderer.setPixelRatio(this.pr); sun.shadow.mapSize.set(1024, 1024); }
    this.audio = new Audio();
    this.ready = false;
    this.boot();
  }

  async boot() {
    const canvas = $('game');
    const loading = $('loading');
    document.querySelectorAll('.menu-buttons button').forEach((b) => (b.disabled = true));
    loading.textContent = 'Building the city…';
    await new Promise((r) => setTimeout(r, 30));
    makeEnvMap(this.renderer);
    this.world = new World(this.scene, this.renderer);
    this.effects = new Effects(this.scene, this.world, this.audio);
    this.burn = quietly(() => new VehicleFires(this)); // parked cars that catch fire and burn out (burn.js)
    this.hud = new HUD(this);
    this.cameraRig = new CameraRig(this.camera, this.world);
    try {
      await loadHumans((k) => (loading.textContent = `Loading characters… ${Math.round(k * 100)}%`));
    } catch (e) {
      console.warn('Character models failed to load — using procedural fallback rigs', e);
    }
    this.audio.prefetch(); // download recordings now; decoding waits for the first click
    loading.textContent = 'Populating the boulevard…';
    await new Promise((r) => setTimeout(r, 30));
    this.player = new Player(this);
    this.crowd = new Crowd(this, 320);
    this.brawls = new Brawls(this);
    this.events = new IncidentScheduler(this);
    // wet, reflective street surfaces
    for (const k of ['road', 'roadPlain', 'cobble']) { const m = this.world.materials[k]; m.envMap = Humans.envMap; m.envMapIntensity = 0.32; m.roughness = 0.66; m.metalness = 0.05; }
    this.world.addPuddles(Humans.envMap);
    // level: the one the campaign leads to; ?dev&level=N jumps straight to a level for testing
    // (developer and seeded pages start in Level 1 otherwise, whatever this device has played)
    const q = new URLSearchParams(location.search);
    this.dev = q.has('dev');
    const devLevel = this.dev && LEVELS[q.get('level')] ? +q.get('level') : 1;
    this.setLevel(this.dev || SEED !== null ? devLevel : nextMission());
    // a section number, or a boss's name (?dev&level=3&stage=fixer)
    this.devStage = q.has('dev') && q.has('stage') ? (Number.isNaN(+q.get('stage')) ? q.get('stage') : +q.get('stage')) : null;
    this.campaign = new CampaignUI(this);
    this._syncLevelMenu();
    this.post = new Post(this.renderer, this.scene, this.camera);
    this.audio._randomCrowdPos = () => this.crowd.randomCrowdPos();
    this.cameraRig.reset(this.player);
    this.firstPlay = true;
    this.onboarding = false;

    this.input.onLockLost = () => { if (this.state === 'playing') this.pause(); };
    addEventListener('resize', () => this.resize());
    addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.cinematic && this.state === 'playing') { this.cinematic.skip(); return; }
      if (e.code === 'Escape' && !this.input.locked) {
        if (this.state === 'playing') this.pause(); else if (this.state === 'paused') this.resume();
      }
      if (e.code === 'KeyH') $('controls-hint').classList.toggle('hidden');
      if (e.code === 'KeyM') { this.audio.init(); this.audio.toggleMute(); }
    });
    // leaving the tab or app pauses the game (pointer lock covers this on desktop)
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'playing') this.pause(); });
    addEventListener('blur', () => { if (this.state === 'playing' && !this.input.locked && this.input.touch) this.pause(); });
    canvas.addEventListener('mousedown', () => {
      if (this.state === 'playing' && !this.input.locked) this.input.lock();
    });
    this._wireMenus();
    this.clock = new THREE.Clock();
    loading.textContent = 'Ready';
    document.querySelectorAll('.menu-buttons button').forEach((b) => (b.disabled = false));
    this.ready = true;
    if (location.search.includes('dev')) import('./dev.js').then((m) => m.installDev(this));
    // seeded runs: the simulation (menu background included) only advances through the
    // developer helpers, so nothing consumes random numbers before the run starts
    if (SEED !== null) this.manualStep = true;
    this.renderer.setAnimationLoop(() => this.frame());
  }

  _wireMenus() {
    document.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', (e) => {
      this.audio.init();
      this.audio.ui('click');
      const a = b.dataset.action;
      if (a === 'play') this._menuPlay();
      else if (a === 'campaign') this.campaign.open(this.screen);
      else if (a === 'cmp-start') this.campaign.start();
      else if (a === 'cmp-back') this.campaign.back();
      else if (a === 'finale') this.campaign.showFinale(this.screen);
      else if (a === 'main-menu') this.toMenu();
      else if (a === 'reset-progress') this._resetProgress(b);
      else if (a === 'controls') { this.prevScreen = this.state === 'paused' ? 'pause-screen' : 'menu'; this._screen('controls-screen'); }
      else if (a === 'audio') { this.prevScreen = this.state === 'paused' ? 'pause-screen' : 'menu'; this._screen('audio-screen'); }
      else if (a === 'pause') { if (this.state === 'playing') this.pause(); }
      else if (a === 'mute') this.audio.toggleMute();
      else if (a === 'back') this._screen(this.prevScreen || 'menu');
      else if (a === 'restart') this.restart();
      else if (a === 'resume') this.resume();
      else if (a === 'retry') { const cp = this.missions.cp; this.restart(); if (cp && this.missions.resume) this.missions.resume(cp); }
      else if (a === 'continue') this.startLevel(this.level.id + 1);
    }));
    $('onboarding').addEventListener('click', () => this._dismissOnboarding());
    $('cine').addEventListener('pointerdown', (e) => { e.preventDefault(); if (this.cinematic) this.cinematic.skip(); });
    this.touch = new TouchControls(this);
    // audio settings: sliders on the Audio screen and the HUD mute button
    const syncAudioUI = (s) => {
      for (const k of ['master', 'ambience', 'effects', 'music']) { const v = Math.round(s[k] * 100); $('vol-' + k).value = v; $('vol-' + k + '-out').textContent = v + '%'; }
      $('vol-mute').checked = s.muted;
      $('hud-mute').classList.toggle('muted', s.muted);
      $('hud-mute').setAttribute('aria-pressed', String(s.muted));
    };
    for (const k of ['master', 'ambience', 'effects', 'music']) $('vol-' + k).addEventListener('input', (e) => this.audio.setSetting(k, e.target.value / 100));
    $('vol-mute').addEventListener('change', (e) => { this.audio.init(); this.audio.setSetting('muted', e.target.checked); });
    this.audio.onSettings = syncAudioUI;
    syncAudioUI(this.audio.getSettings());
    // gameplay options (same screen): mouse sensitivity, invert look, police brutality
    const syncPrefs = () => {
      const p = this.prefs;
      $('opt-sens').value = Math.round(p.sens * 100); $('opt-sens-out').textContent = Math.round(p.sens * 100) + '%';
      $('opt-invert').checked = p.invertY; $('opt-brutality').checked = p.brutality;
      $('opt-lockon').checked = p.lockOn; $('opt-assisted').checked = p.assisted;
      this.cameraRig.sens = p.sens; this.cameraRig.invertY = p.invertY;
    };
    const savePrefs = this._savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs)); } catch (e) { /* storage blocked */ } syncPrefs(); };
    $('opt-sens').addEventListener('input', (e) => { this.prefs.sens = e.target.value / 100; savePrefs(); });
    $('opt-invert').addEventListener('change', (e) => { this.prefs.invertY = e.target.checked; savePrefs(); });
    $('opt-brutality').addEventListener('change', (e) => { this.prefs.brutality = e.target.checked; savePrefs(); });
    $('opt-lockon').addEventListener('change', (e) => { this.prefs.lockOn = e.target.checked; savePrefs(); });
    $('opt-assisted').addEventListener('change', (e) => { this.prefs.assisted = e.target.checked; savePrefs(); });
    syncPrefs();
  }

  // ------------------------------------------------------------- levels
  // Switch the active level: mission script, lighting and player start. The
  // world, crowd and effects are shared; restart() puts them back to a clean state.
  setLevel(id) {
    const def = LEVELS[id];
    if (!def) return;
    if (!this.level || this.level.id !== id) {
      if (this.missions) this.missions.dispose();
      this.level = def;
      this.missions = new def.Missions(this);
    }
    this.player.start = def.start;
    // where this level plays: its part of the city, the clamp for everyone, the crowd's places
    this.world.setDistrict(def.district || null);
    this.world.setCordonGate(!!def.cordonOpen);
    this.world.setBounds(def.bounds);
    this.brawls.setEnabled(def.brawls !== false);
    const moved = this.crowd.layoutDef !== def.crowdLayout;
    this.crowd.setLayout(def.crowdLayout);
    const wasOn = this.crowd.reserveOn, extraWas = !!this.crowd.extraOn;
    this.crowd.setReserve(!!def.reserveCrews);
    this.crowd.setDistrictCrews(!!def.districtCrews);
    // bring the reserve crews in or out, or move everyone to the level's places
    if (this.crowd.reserveOn !== !!wasOn || !!this.crowd.extraOn !== extraWas || moved) this.crowd.reset();
    this.crowd.setPoliceOff(def.policeOff || []);
    this.events.hazardDir = def.hazardDir || -1;
    this.events.cfg = def.events || BOULEVARD_EVENTS;
    this.audio.sirenLanes = def.sirenLanes || BOULEVARD_SIREN_LANES;
    this.audio.music.setTheme(def.musicTheme);
    this.player.reset();
    this.cameraRig.reset(this.player);
    this.applyLighting(def.lighting);
    // the direct verb (F) belongs to the levels that use it
    for (const id of ['hint-direct', 'tb-direct']) $(id).classList.toggle('hidden', !def.direct);
  }

  // Play a short camera sequence (see cinematic.js). Developer runs can skip them all.
  playCinematic(opts) {
    if (this.cinematic) this.cinematic.finish(true, true);
    if (this.skipCinematics) { if (opts.onDone) opts.onDone(true); return null; }
    this.cinematic = new Cinematic(this, opts).begin();
    return this.cinematic;
  }

  // Start (or restart) a level from a menu or the end screen. Locked levels are refused
  // (force: the campaign screen of a developer build).
  startLevel(id, { force = false } = {}) {
    if (!LEVELS[id] || !(force || Progress.unlocked(id))) return;
    this.setLevel(id);
    if (this.state === 'menu' && !this.played) this.play(); else this.restart();
  }

  // the title screen's first button: the level the campaign leads to (a developer page: the level loaded)
  _menuPlay() {
    const id = this.dev ? this.level.id : nextMission();
    if (this.played || id !== this.level.id) this.startLevel(id, { force: this.dev }); else this.play();
  }

  // back to the title screen from the results or the finale
  toMenu() {
    if (this.cinematic) this.cinematic.finish(true, true);
    this.state = 'menu';
    this.pendingEnd = null;
    $('app').classList.remove('ended');
    this.hud.show(false);
    this.input.unlock();
    this.audio.setPaused(false);
    this._syncLevelMenu();
    this._screen('menu');
  }

  // Options: RESET CAMPAIGN takes a second tap within 4 s; settings are kept
  _resetProgress(b) {
    clearTimeout(this._resetT);
    if (!this._resetArmed) {
      this._resetArmed = true;
      b.textContent = 'TAP AGAIN TO CONFIRM'; b.classList.add('armed');
      this._resetT = setTimeout(() => { this._resetArmed = false; b.textContent = 'RESET CAMPAIGN'; b.classList.remove('armed'); }, 4000);
      return;
    }
    this._resetArmed = false;
    Progress.reset();
    this.campaign.sel = null;
    this._syncLevelMenu();
    b.textContent = 'CAMPAIGN RESET'; b.classList.remove('armed');
    this._resetT = setTimeout(() => { b.textContent = 'RESET CAMPAIGN'; }, 2500);
  }

  // Colours, intensities, fog and sky uniforms only: the light count never changes,
  // so the existing shader programs stay valid (no recompilation on switch).
  applyLighting(name) {
    const L = LIGHTING[name] || LIGHTING.dusk;
    this.lighting = L;
    this.hemi.color.set(L.hemiSky); this.hemi.groundColor.set(L.hemiGround); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunColor); this.sun.intensity = L.sunI; this.sunOffset.set(...L.sunOffset);
    this.renderer.toneMappingExposure = L.exposure;
    this.baseFog = L.baseFog;
    this._fogA = new THREE.Color(L.fogA); this._fogB = new THREE.Color(L.fogB);
    this.scene.fog.color.copy(this._fogA); this.scene.fog.density = L.baseFog;
    this.scene.background.copy(this._fogA);
    this.world.setSky(L.sky);
    this.world.materials.lamp.emissiveIntensity = L.lamp;
    for (const k of ['road', 'roadPlain', 'cobble']) this.world.materials[k].envMapIntensity = L.puddleEnv;
    this.effects.fireLightMul = L.fireLight;
    this.effects.smoke.mat.uniforms.uTint.value.setRGB(...L.smokeTint);
  }

  // the title screen follows the campaign: where the next level is, and PLAY / CONTINUE into it
  _syncLevelMenu() {
    const id = this.dev ? this.level.id : nextMission(), c = mission(id);
    const fresh = !completedCount() && id === 1;
    $('btn-play').textContent = fresh ? 'PLAY' : Progress.completed(id) ? `REPLAY · LEVEL ${id}` : `CONTINUE · LEVEL ${id}`;
    $('menu-tag').textContent = `${c.place} · ${c.time}${fresh ? '' : ` · Level ${id} of ${CAMPAIGN.length}`}`;
  }

  _screen(id) {
    this.screen = id;
    for (const s of ['menu', 'campaign-screen', 'finale-screen', 'controls-screen', 'audio-screen', 'pause-screen', 'end-screen']) $(s).classList.toggle('hidden', s !== id);
  }

  play() {
    if (this.state === 'paused') return this.resume();
    if (this.state === 'ended') return this.restart();
    this.played = true;
    this._screen(null);
    this.hud.show(true);
    this.state = 'playing';
    this.audio.setPaused(false);
    this.cameraRig.reset(this.player);
    this.cameraRig.intro(3.2);
    this._applyDevStage();
    if (this.firstPlay) {
      this.firstPlay = false;
      this.onboarding = true;
      $('ob-where').textContent = mission(this.level.id).opening; // where this first level puts you
      $('onboarding').classList.remove('hidden');
      this.onboardT = 0;
    } else this.input.lock();
  }

  _dismissOnboarding() {
    if (!this.onboarding) return;
    this.onboarding = false;
    $('onboarding').classList.add('hidden');
    this.input.lock();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.touch.releaseAll();
    this._pauseBrief();
    this._screen('pause-screen');
    this.audio.setPaused(true);
  }

  // the pause screen keeps the mission in view: the level, what is happening now, its objectives
  _pauseBrief() {
    const c = mission(this.level.id), now = this.missions.hudInfo ? this.missions.hudInfo().text : '';
    const esc = (v) => String(v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    $('pause-brief').innerHTML = `<div class="pb-k">LEVEL ${c.id} · ${c.time} · ${esc(c.title)}</div>`
      + (now ? `<div class="pb-now"><span class="chip">NOW</span> ${esc(now)}</div>` : '')
      + `<ul class="objectives">${c.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>`;
  }

  resume() {
    this._screen(null);
    this.state = 'playing';
    this.audio.setPaused(false);
    this.input.lock();
  }

  restart() {
    if (this.cinematic) this.cinematic.finish(true, true);
    $('app').classList.remove('ended');
    this.player.reset();
    this.crowd.reset();
    this.brawls.reset();
    this.missions.reset();
    this.effects.reset();
    this.burn.reset();
    this.events.reset();
    this.cameraRig.reset(this.player);
    this.cameraRig.intro(2.4);
    this.hud.clearAlerts();
    this.hud.clearOverlays(); // no banner or title card from the run before
    this.audio.stopVoices();  // nor the tail of its sounds (a hiss, a sting's echo)
    this.timeScale = 1; this.hitStopT = 0;
    this.pendingEnd = null;
    this._screen(null);
    this.hud.show(true);
    this.state = 'playing';
    this.firstPlay = false;
    this.onboarding = false;
    $('onboarding').classList.add('hidden');
    this.audio.setPaused(false);
    this._applyDevStage();
    this.input.lock();
  }

  // ?dev&stage=N: start the current level at section N (levels that support it)
  _applyDevStage() {
    if (this.devStage !== null && this.missions.jumpTo) this.missions.jumpTo(this.devStage);
  }

  endGame(win, reason) {
    this.pendingEnd = { win, reason, t: win ? 1.2 : 2.2 };
    // completing a level unlocks the next one on this device
    const next = LEVELS[this.level.id + 1];
    if (win && next && !next.devOnly) { Progress.unlock(next.id); this._syncLevelMenu(); }
  }

  _showEnd() {
    const { win, reason } = this.pendingEnd;
    this.pendingEnd = null;
    this.state = 'ended';
    // the campaign's record of the run: its medal and the device's bests (runs the test harness
    // drives are recorded only when a test asks, so a bot never leaves medals on a developer's device)
    const id = this.level.id, run = summarize(this.missions, win), assessment = assess(id, run);
    const flags = !this.manualStep || this.recordRuns ? Progress.addRun(id, run, assessment.medal) : {};
    this.lastResult = { id, run, assessment, flags };
    this.hud.showEnd(win, reason, this.missions, { id, assessment, flags, rec: Progress.record(id) });
    $('app').classList.add('ended'); // results over a clean picture: the gameplay HUD fades out
    const next = LEVELS[id + 1];
    const cont = !!(win && next && !next.devOnly && Progress.unlocked(next.id)), finale = win && !next, retry = !win && !!this.missions.cp;
    $('btn-continue').classList.toggle('hidden', !cont);
    if (next) $('btn-continue').textContent = `CONTINUE · LEVEL ${next.id}`;
    $('btn-finale').classList.toggle('hidden', !finale);
    $('btn-retry').classList.toggle('hidden', !retry); // section checkpoint (Levels 2 and 3)
    $('btn-restart').textContent = win ? 'REPLAY' : 'RESTART';
    $('btn-restart').classList.toggle('primary', !(cont || finale || retry));
    this._syncLevelMenu();
    this._screen('end-screen');
    this.input.unlock();
    this.audio.ui(win ? 'good' : 'bad');
  }

  // --- callbacks from systems
  onThreatNeutralized(n) { this.missions.onThreatNeutralized(n); }
  onPeacefulStruck(n) { this.missions.onPeacefulStruck(n); }
  onDownedStruck(n) { this.missions.onDownedStruck(n, this.prefs.brutality); }
  onPoliceLineHit(d) { this.missions.onPoliceLineHit(d); }
  // Player aids (Options): lock-on in boss fights and Assisted boss fights. Harness-driven runs
  // ignore the device's settings (a test sets game.testAids instead), so seeded results and the
  // boss tests are the same on every device.
  aids() { return this.manualStep ? (this.testAids || NO_AIDS) : this.prefs; }

  // the boss the officer locks on to: one in a fight, past his introduction, not yet down
  _lockTarget() {
    const b = this.missions && this.missions.boss;
    if (!this.aids().lockOn || !b || !b.active || b.s === 'intro' || this.cinematic || this.player.dead) return null;
    return b.n;
  }

  onPlayerDown() { this.hud.alert('Officer down', 'bad', 3); this.missions.fail('You were incapacitated.'); }
  hitStop(t) { this.hitStopT = t; }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    if (this.post) this.post.setSize(innerWidth, innerHeight);
  }

  frame() {
    if (!this.ready) return;
    const raw = this.clock.getDelta();
    let dt = Math.min(0.05, raw);
    this._adaptResolution(raw);
    // manualStep (developer helpers): the test harness advances the simulation itself
    // with fixed steps, so the real-time loop only renders and runs stay reproducible
    if (this.manualStep) { /* stepped by dev.js */ }
    else if (this.state === 'playing' && !this.onboarding) this.update(dt);
    else if (this.state === 'playing' && this.onboarding) {
      this.onboardT += dt;
      this._ambientUpdate(dt, true);
      this._audioMix(dt); // the street is already audible behind the briefing
      if (this.onboardT > 1.0 && (this.input.pressed('Mouse0') || this.input.pressed('KeyW') || this.input.pressed('Space') || this.input.pressed('Enter'))) this._dismissOnboarding();
    } else this._ambientUpdate(dt, this.state === 'menu');
    this.input.endFrame();
    // the sun's shadow map is refreshed every other frame (halves the shadow pass cost)
    this.frameNo = (this.frameNo || 0) + 1;
    this.renderer.shadowMap.needsUpdate = this.frameNo % 2 === 0 || this.hitStopT > 0;
    this.render();
  }

  // Dynamic resolution: trade pixel density for frame rate on slower GPUs.
  _adaptResolution(raw) {
    const p = this.perf;
    p.acc += raw; p.frames++;
    if (p.acc < 2) return;
    const ms = (p.acc / p.frames) * 1000;
    p.acc = 0; p.frames = 0;
    if (document.hidden) return;
    let pr = this.pr;
    // crowd detail changes which characters animate (and draw random numbers), so it stays
    // fixed while the test harness steps the simulation; pixel ratio only affects rendering
    const c = this.manualStep ? null : this.crowd;
    if (ms > 21 && pr > 0.85) pr = Math.max(0.85, pr - 0.1);
    else if (ms > 21 && c && c.maxSkinned > 12) c.maxSkinned -= 2; // then trade crowd detail
    else if (ms < 15 && c && c.maxSkinned < 24) c.maxSkinned += 2;
    else if (ms < 13 && pr < this.maxPR) pr = Math.min(this.maxPR, pr + 0.1);
    if (pr !== this.pr) {
      this.pr = pr;
      this.renderer.setPixelRatio(pr);
      if (this.post) { this.post.composer.setPixelRatio(pr); this.post.setSize(innerWidth, innerHeight); }
    }
  }

  render() {
    isolateRender(() => { // seeded runs: drawing never touches the simulation's random stream
      if (this.post) this.post.render(1 / 60, this.time, this.effects ? Math.min(1, this.effects.smokiness) : 0, this.hud ? this.hud.flash : 0);
      else this.renderer.render(this.scene, this.camera);
    });
  }

  // thicker, warmer haze in the smoke-filled stretches of the boulevard
  _atmosphere(dt) {
    const sm = Math.min(1.2, this.effects.smokiness);
    const want = this.baseFog + sm * 0.0055;
    const f = this.scene.fog;
    f.density += (want - f.density) * Math.min(1, dt * 1.5);
    const col = this._fogA || (this._fogA = new THREE.Color(0x7f786f));
    const col2 = this._fogB || (this._fogB = new THREE.Color(0x6e6258));
    f.color.copy(col).lerp(col2, Math.min(1, sm * 0.8));
    this.scene.background.copy(f.color);
  }

  // menu / pause background: world keeps breathing, camera drifts
  _ambientUpdate(dt, drift) {
    this.time += dt;
    if (drift) {
      this.cameraRig.yaw += dt * 0.04;
      this.crowd.update(dt, this.player);
      this.brawls.update(dt, this.time);
      this.effects.update(dt, this.time, this.camera.position);
      this.world.update(dt, this.time);
      this.cameraRig.update(dt, this.player, 0);
      this._atmosphere(dt);
      this._lights();
    }
  }

  _lights() {
    const p = this.player.pos;
    this.sun.position.copy(p).add(this.sunOffset);
    this.sun.target.position.copy(p);
    // police beacons: nearest two vans pulse blue
    const bars = this.world.lightBars.map((b) => [b, b.distanceToSquared(p)]).sort((a, b) => a[1] - b[1]);
    const on = Math.floor(this.time * 4) % 2 === 0;
    const A = this.crowd && this.crowd.arena;
    this.policeLights.forEach((l, i) => {
      if (A) {
        // boss arena: the two beacons strobe red and blue at its edge (same lights, new colours)
        l.position.set(A.x + (i ? 1 : -1) * A.r * 0.75, 3.2, A.z - A.r * 0.35);
        l.color.setHex(i ? 0x2a5cff : 0xff2a2a);
        l.intensity = (i % 2 === 0) === on ? this.lighting.beaconOn * 1.3 : this.lighting.beaconOff;
        return;
      }
      const b = bars[i];
      if (!b) return;
      l.position.copy(b[0]);
      l.color.setHex(0x3060ff);
      l.intensity = (i % 2 === 0) === on ? this.lighting.beaconOn : this.lighting.beaconOff;
    });
  }

  // audio listener + mix
  _audioMix(dt) {
    const a = this.audio;
    if (!a.enabled) return;
    a.setListener(this.camera.position.x, this.camera.position.z, this.cameraRig.yaw);
    const close = this.crowd.npcs.filter((n) => n.distToPlayer < 20).length;
    const panic = this.crowd.npcs.filter((n) => n.state === 'flee' && n.distToPlayer < 30).length;
    a.setCrowdLevel(Math.min(1, close / 18 + panic / 10));
    const vanD = Math.min(...this.world.lightBars.map((b) => b.distanceTo(this.player.pos)));
    a.setEngineProximity(Math.max(0, 1 - vanD / 25));
    // fires the mixer can place: persistent fires plus burning petrol pools
    const fires = this._fireList || (this._fireList = []);
    fires.length = 0;
    for (const f of this.world.fires) fires.push({ pos: f.pos, k: 0.6 * f.scale * (f.boost || 1) });
    for (const f of this.effects.flames) fires.push({ pos: f.pos, k: 1.6 * (1 - f.t / f.life) + 0.3 });
    const threats = this.crowd.threats().length;
    if (this.level.music) {
      const m = this.missions, b = m.boss;
      if (threats) this._lastThreatT = this.time;
      const fighting = this.time - (this._lastThreatT ?? -99) < 4; // hold through short gaps
      a.music.setTier(m.musicTier || 0); // Level 3 builds through its acts
      a.music.setState(m.stage === 'victory' || (m.ended && this.pendingEnd && this.pendingEnd.win) ? 'victory'
        : b && b.active ? (b.phaseIdx >= 2 ? 'boss3' : 'boss') : fighting || (m.van && m.van.underAttack()) ? 'combat' : 'calm');
    } else a.music.setState('off');
    a.update(dt, { intensity: Math.min(1, panic / 8 + threats / 5 + (this.missions.phase || 0) * 0.2), fires });
  }

  update(rawDt) {
    // hit-stop: brief slow-motion on impacts
    let dt = rawDt;
    if (this.hitStopT > 0) { this.hitStopT -= rawDt; dt = rawDt * 0.08; }
    this.time += dt;
    const input = this.input;
    let [mx, my] = input.consumeMouse();
    mx += input.edgeTurn() * 800 * rawDt; // unlocked mouse: rest the cursor at a screen edge to keep turning
    if (input.down('ArrowLeft')) mx -= 900 * rawDt;
    if (input.down('ArrowRight')) mx += 900 * rawDt;
    if (input.down('ArrowUp')) my -= 500 * rawDt;
    if (input.down('ArrowDown')) my += 500 * rawDt;
    const cine = this.cinematic;
    if (!cine) this.cameraRig.rotate(mx, my);
    // Tab: lock-on on or off (kept in Options); while locked the camera keeps the boss ahead,
    // so W/S close in or back off and A/D circle him (player.js keeps the officer facing him)
    if (input.pressed('Tab') && !cine && this.missions && this.missions.boss && this.missions.boss.active) {
      this.prefs.lockOn = !this.prefs.lockOn; this._savePrefs();
      this.hud.alert(`Boss lock-on ${this.prefs.lockOn ? 'ON' : 'OFF'} · Tab`, 'good', 1.4, 'lockon');
    }
    const lock = this.player.lockTarget = this._lockTarget();
    if (lock) {
      const dx = lock.pos.x - this.player.pos.x, dz = lock.pos.z - this.player.pos.z;
      if (dx * dx + dz * dz > 0.64) this.cameraRig.yaw += wrapAngle(Math.atan2(-dx, -dz) - this.cameraRig.yaw) * (1 - Math.exp(-rawDt * 6));
    }
    if (cine) {
      if (input.pressed('Space') || input.pressed('Enter') || input.pressed('Mouse0')) cine.skip();
      this.player.invuln = Math.max(this.player.invuln, 0.1); // nobody lands a hit during a cinematic
    }

    // (the frame that skips a cinematic still ignores the controls: the Space, Enter or click that
    // skipped it must not also dodge or strike)
    this.player.update(dt, cine ? NULL_INPUT : input, this.cameraRig.yaw);
    this.crowd.update(dt, this.player);
    this.brawls.update(dt, this.time);
    this.missions.update(dt);
    this.events.update(dt);
    this.burn.update(dt);
    this.effects.update(dt, this.time, this.camera.position);
    this._atmosphere(dt);
    this.world.update(dt, this.time);
    const near = this.crowd.query(this.player.pos.x, this.player.pos.z, 2.5, []).filter((o) => o.id !== undefined).length;
    this.cameraRig.update(rawDt, this.player, near);
    if (this.cinematic) this.cinematic.update(rawDt, this.cameraRig.lastPose);
    this._lights();

    this._audioMix(rawDt);
    this.hud.update(rawDt);
    if (this.pendingEnd) { this.pendingEnd.t -= rawDt; if (this.pendingEnd.t <= 0) this._showEnd(); }
  }
}

window.game = new Game();
