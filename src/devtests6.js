// Fire checks (developer builds only: loaded by dev.js with ?dev). The fire budget and the
// vehicle fires of docs/devastation-plan.md, Phases 0 and 1. Each returns plain data with a
// `pass` flag.
//   await __fireBudget()          pool occupancy, evictions and tiers here (or at every __worldPerf view)
//   await __testVehicleFires()    cars catch fire, burn out to shells, spread, stay out of arenas, reset
import * as THREE from 'three';
import { BURN } from './burn.js';
import { FX } from './effects.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function installTests6(game) {
  const resume = () => { if (game.state === 'paused') { game._screen(null); game.state = 'playing'; game.audio.setPaused(false); } };
  const step = (s, fn) => { resume(); window.__step(s, fn); };

  // Pools after `seconds` of play where the camera is now: occupancy, particles evicted or dropped
  // per second, and how many fires sit in each tier. views: true measures every __worldPerf view.
  // Pass: every pool keeps 25% headroom and evicts under 5% of its size a second.
  window.__fireBudget = async ({ seconds = 3, views = false } = {}) => {
    const fx = game.effects;
    const one = () => {
      const e0 = [fx.fire.evicted, fx.smoke.evicted, fx.fire.dropped, fx.smoke.dropped];
      step(seconds);
      const pool = (ps, i) => ({ n: ps.p.length, max: ps.max, occ: +(ps.p.length / ps.max).toFixed(2), evictedPerSec: +((ps.evicted - e0[i]) / seconds).toFixed(1), droppedPerSec: +((ps.dropped - e0[i + 2]) / seconds).toFixed(1) });
      const fire = pool(fx.fire, 0), smoke = pool(fx.smoke, 1);
      const ok = (q) => q.occ <= 0.75 && q.evictedPerSec < q.max * 0.05;
      return { fires: game.world.fires.length, smokes: game.world.smokes.length, tiers: { ...fx.stats }, fire, smoke, vehicles: game.burn.summary(), pass: ok(fire) && ok(smoke) };
    };
    if (!views) return one();
    const rows = [];
    const names = String(window.__view('?')).replace(/^views: /, '').split(', ').filter(Boolean); // __view lists the names it knows
    for (const name of names) {
      window.__view(name); step(0.5);
      rows.push({ view: name, ...one() });
      await new Promise((r) => setTimeout(r, 1));
    }
    return { level: game.level.id, rows, pass: rows.every((r) => r.pass) };
  };

  window.__testVehicleFires = async () => {
    const out = { checks: {} }, c = out.checks;
    const saved = { ...BURN };
    Object.assign(BURN, { ignite: [0.5, 0.5], blaze: [2, 2], smoulder: [2, 2] }); // a whole life in 4.5 s
    try {
      window.__level(2); game.skipCinematics = true;
      window.__start({ audio: false, seed: 5 }); step(1);
      const w = game.world, burn = game.burn, tex = (v) => [burn._data()[v.id * 4], burn._data()[v.id * 4 + 1]];

      // every mesh drawn with a vehicle material carries the vehicle ids
      const missing = [];
      game.scene.traverse((o) => { if (o.isMesh && o.material && o.material.userData && o.material.userData.vburn && !o.geometry.attributes.vid) missing.push(o.name || o.type); });
      c.vidOnEveryVehicleMesh = { missing, pass: missing.length === 0 };
      c.registry = { ...burn.summary(), pass: burn.vehicles.length > 50 && burn.vehicles.filter((v) => v.burnable).length > 30 };

      // a scripted car fire takes the parked car nearest its spot and runs its whole life
      const p = game.player.pos;
      const car = burn.vehicles.filter((v) => burn.canIgnite(v) && Math.abs(v.z - (p.z + 30)) < 25).sort((a, b) => Math.abs(a.z - p.z - 30) - Math.abs(b.z - p.z - 30))[0];
      const fires0 = w.fires.length;
      game.events.carFire(V(car.x + 1, 1, car.z + 1));
      const b = burn.burning.get(car.id);
      c.scriptedTakesRealCar = { state: car.state, firesAdded: w.fires.length - fires0, pass: car.state === 'burning' && !!b && w.fires.includes(b.fire) };
      step(1.2);
      c.blazeChars = { stage: b.stage, texel: tex(car), pass: b.stage === 'blaze' && tex(car)[0] > 60 && tex(car)[1] > 0 };
      step(4);
      const wisp = burn.wisps.find((s) => Math.hypot(s.pos.x - car.x, s.pos.z - car.z) < 0.1);
      c.burnsOutToShell = { state: car.state, texel: tex(car), fireGone: !w.fires.includes(b.fire), wisp: !!wisp, scorch: burn.scorchN, pass: car.state === 'shell' && tex(car)[0] === 255 && tex(car)[1] === 0 && !w.fires.includes(b.fire) && !!wisp && burn.scorchN >= 1 };
      c.shellNeverReignites = { pass: !burn.ignite(car) && car.state === 'shell' };

      // the scheduler's car fires are real cars, in the level's stretch, 18-70 m from the officer
      const before = burn.ignited, z = game.events.cfg.carFireZ;
      for (let i = 0; i < 4; i++) game.events.carFire();
      const lit = [...burn.burning.values()].map((x) => x.v).filter((v) => v !== car);
      c.scheduledFires = { lit: lit.length, pass: burn.ignited - before === lit.length && lit.length > 0 && lit.every((v) => v.z >= z[0] && v.z <= z[1] && Math.hypot(v.x - p.x, v.z - p.z) > 18 && Math.hypot(v.x - p.x, v.z - p.z) < 70) };

      // spreading along the kerb (forced certain)
      BURN.spreadP = 1; BURN.blaze = [BURN.spreadEvery + 1, BURN.spreadEvery + 1]; // long enough for one check
      const s0 = burn.spread, src = burn.vehicles.find((v) => burn.canIgnite(v) && burn.vehicles.some((o) => o !== v && burn.canIgnite(o) && Math.hypot(o.x - v.x, o.z - v.z) < (v.L + o.L) / 2 + BURN.spreadGap));
      burn.ignite(src); step(0.6 + BURN.spreadEvery + 0.2);
      c.spreads = { spread: burn.spread - s0, pass: burn.spread > s0 };
      BURN.spreadP = saved.spreadP; BURN.blaze = [2, 2];

      // never inside a boss arena (plus its margin)
      const inArena = burn.vehicles.find((v) => burn.canIgnite(v));
      game.crowd.arena = { x: inArena.x + 3, z: inArena.z, r: 8 };
      c.arenaRefused = { pass: !burn.canIgnite(inArena) && !burn.ignite(inArena) && burn.nearest(inArena.x, inArena.z, 2) === null };
      game.crowd.arena = null;

      // petrol pools are never thinned out for scenery
      const d0 = game.effects.fire.dropped;
      for (let i = 0; i < 6; i++) game.effects.ignite(V(p.x + i, 0, p.z - 20), 3, 4);
      step(0.5);
      c.petrolNeverDropped = { dropped: game.effects.fire.dropped - d0, pass: game.effects.fire.dropped === d0 };

      // a restart puts every vehicle back
      game.restart(); step(0.2);
      c.restartResets = { ...burn.summary(), texel: tex(car), pass: burn.burning.size === 0 && car.state === 'ok' && tex(car)[0] === 0 && burn.scorchN === 0 && burn.wisps.length === 0 };
    } finally {
      Object.assign(BURN, saved);
    }
    out.budget = FX;
    out.pass = Object.values(c).every((x) => x.pass);
    return out;
  };
}
