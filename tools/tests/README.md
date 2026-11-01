# Regression and fairness tests

All tests run in the browser against a page opened with `?dev` (the helpers ship in the
separate `dev` chunk, `src/dev.js` + `src/devtests.js`, and load only with `?dev`).
Add `&seed=N` for a reproducible run. Results are plain objects; save them from the console.

## Production build

```bash
npm ci
npm run build
npm run preview -- --port 5176      # serves dist/
```

Then open `http://localhost:5176/?dev&seed=3` (Level 1), `http://localhost:5176/?dev&level=2&seed=12` (Level 2) or `http://localhost:5176/?dev&level=3&seed=5` (Level 3).

The Level 3 tests step the simulation in long synchronous stretches (a full routed run takes several minutes of wall time); start them from a timer and read the result afterwards, e.g. `setTimeout(() => __testRoutes().then((r) => (window.res = r)))`.

## Commands (browser console)

| Command | What it checks |
|---|---|
| `await __runToEnd()` | Bot plays the current level to the results screen (cinematics skipped) |
| `await __runToEnd({ watch: true })` | Same, cinematics played through |
| `await __auditRun({ watch: true })` | `__runToEnd` plus: duplicate spawns, encounters active > 90 s, boss damage during a phase change or after defeat, hits > 25, score equals the sum of awarded events |
| `__lintBosses()` | Attack tables of the Enforcer, le Patron and the Fixer against the fairness rules (boss.js): telegraphs, the 25 cap, a dodge or block answer for every attack, time to dodge again in combinations and after feints, runs that stop at obstacles, openings that a miss never shortens, reachable phases |
| `await __testTransitions(10)` | Le Patron phase changes with hits just before and during the change |
| `await __testFeints(400)` | Feints forced on: the real attack after a feint can still be dodged |
| `await __testCheckpoint('enforcer' \| 'leader')` | Die mid-fight, RETRY SECTION, check the reset |
| `await __testChargeWindow()` | Time from the Enforcer's launch to contact at several distances |
| `await __testWallStun()` | Charge into an obstacle: stun, no damage, front open |
| `await __fuzzBoss(name, seconds, hitRate)` | Random hits and positions: no stuck state, no extended invulnerability, health only falls |
| `await __probeMemory(8)` | Heap (Chrome) and GPU object counts across repeated boss retries |
| `await __frameTimes('leader', 300)` | Per-frame simulation and render cost (p50 / p95 / max) |
| `await __testGas()` | Officer's tear gas: lands near the aim point, crowd reacts, supply empties and refills per section, refused in a boss fight |
| `await __testBarriers()` | Police barriers: preview and place (a placing click is no strike), refusals, a walker goes round without entering it, pick-up, carried limit, boss arenas, restart |
| `await __testTension()` | Crowd tension: each cause through the real game paths, decay, HUD band, ambient rate and cap, Level 2 extra members (never peaceful), barrier credit and its cap |
| `await __auditAppearance({ level, tension: 100 })` | The appearance audit with tension held at 100, so the extra attackers it causes are audited too |
| `__hudLayout()` | Visible HUD panels that overlap or leave the screen at the current viewport |
| `__navMap({ show: true })` | Reachability from the level start: leaks into buildings, closed-off pockets, landmarks reached (Level 3: 0 / 0 / all five) |
| `await __walkRoute('A' \| 'B' \| 'square')` | Level 3 routes walked with the normal controls: stuck points, camera inside a collider, camera trapped |
| `await __npcNav(30, 90)` | Crowd agents sent 30-80 m across the level: arrivals, progress, stuck, inside colliders, out of bounds |
| `await __worldPerf({ frames: 40 })` | Frame cost, draw calls and triangles at each named viewpoint of the current level |
| `await __auditAppearance({ seeds: 30, level: 2 })` | Appearance of selected attackers versus their pool |
| `__vanSweep()` | Level 3: the transfer van's footprint along both routes against every static collider (the barricade it waits behind excepted) |
| `await __testVan()` | Level 3 van: waits for the officer, follows its path to the hold, stops for a person ahead (horn) and for an attacker, the damage table, x1.5 with the officer far away, the per-second cap, grace and the parked state; peaceful people, ambient incidents, stones on walls or over the roof and strikes from out of reach do nothing; failure and the retry's integrity floor |
| `await __testHazards()` | Level 3 hazards: telegraph lengths, the cook-off at its centre (24, no more) and walked out of (0), crew takedowns (+150) with no bystander struck, the scaffold under it (18) and stepped out of (0), the petrol trail lit / burnt out / struck in time, the van holding before it, fireworks runners all peaceful, scene light count and shared materials |
| `await __testRadio()` | Level 3 radio queue: urgent first, one at a time with a pause, no repeats, cooldowns |
| `await __testL3Checkpoints()` | Level 3: fail in each of the six sections (both routes from the square on), RETRY SECTION, check section, route, van position and integrity (at least 60), score, flags, encounters, roadblock |
| `await __testRoutes({ seed })` | Level 3: `__auditRun` on the Avenue and on the Passage; both must reach LEVEL 3 COMPLETE through all six sections with no audit issue and no shortfall |
| `await __testFixer()` | The Fixer: lint clean; each phase bot-played (moves used, largest hit, shortest telegraphs; footwork in phase 1, the rush from phase 2, kicks in phase 3); the rush's launch-to-contact at 5.6 / 6.5 / 8 m and a dodge at the launch (no damage, longer opening); a rush into the parked van (dazed, officer untouched, front open); a kick with a wall in between (no damage) and without (damage); a miss opens him longer than a hit; defeat, arrest, the escort going on |
| `await __testL3Cinematics()` | The briefing, the reveal, the Fixer's introduction, his arrest and the handover, each skipped at a random moment (with Space: no dodge from it) and played through: letterbox and HUD restored, camera back to the gameplay field of view, no damage, the mission moved on, the radio held back, no strike from the Fixer in the 1.4 s after his introduction |
| `await __testL3Music()` | Sound on, a full bot run: the music's tiers go 1, 2, 3 with the acts, it reaches its boss and last-phase states and ends on the victory; the volume settings are untouched; Level 2 gets its own theme back with no tier |
| `await __testRetryClean()` | Sound on: a phase banner up, a hiss, a radio duck, a sting and a cinematic when the run fails; RETRY SECTION leaves none of them, the fight restarts at full health in phase 1, the volume settings are untouched |
| `await __testVanQA()` | The van under the quality gate: full condition and its bar, one attacker, six at once, the officer moving round it, a cinematic (nothing lands), one petrol bomb (one 12 burst, the pool after), the bar at 62 % and 21 % (red), failure, RETRY SECTION |
| `await __testProgression()` | Unlocks: nothing at first, Level 1 won → Level 2 (CONTINUE, menu button), Level 2 won → Level 3, CONTINUE into Level 3, Level 3 won → no CONTINUE; stored in `localStorage`; a locked level refused. Restores the device's own progress afterwards |
| `await __testLeaks()` | Levels 1 and 2 before and after a visit to Level 3 (left mid-fight): the same active colliders (by place and kind), fire / smoke / beacon lists, people in play, theme and lighting, and none of Level 3's district, van, props, Fixer, crews or arena |
| `await __testShortcuts()` | `__level`, `__jump` on Levels 2 and 3, `__boss` for each boss, `?dev&level=2&stage=leader` style stage names, `__acts`, `__view`, the linter |
| `await __perfL3()` | Frame cost (simulation, render with the GPU flushed, p50 / p95 / p99 / max, frames over 33 ms) at the square at its fullest, fire and smoke, the van under six attackers, the square's first group, the Fixer's last phase, two cinematics; then memory across ten section and fight retries |
| `await __traceObjectives(fn)` | Wraps the bot: through `fn()` it records every objective text shown and any stretch without a marker outside the route choice, a boss fight, a cinematic or the results |
| `__testTransitions(10, 'fixer')`, `__testFeints(400, 'fixer')`, `__testCheckpoint('fixer')`, `__fuzzBoss('fixer')`, `__frameTimes('fixer')`, `__probeMemory(6, ['fixer'])` | The Level 2 boss checks, run on the Fixer |

## Vehicle viewer

`npm run dev`, then open `http://localhost:5173/tools/vehicles.html` (`?view=front|side|rear|top`,
`&only=city|hatch|sedan|estate|van|vanciv`) to inspect the procedural vehicles in `src/vehicles.js`
under neutral light. Dev server only; it is not part of the build.

## Reference results

Seeded results are reproducible for a given build and seed, at any window size (since the
stabilisation pass: rendering no longer shares the simulation's random stream). See
`tools/baseline/stabilisation-results.json` for the current references and how they relate
to the earlier baselines. The raw results of the stabilisation audit are in `logs/` (one JSON
file per check, with the exact command; `replay-and-street-retry.json` includes the inline
console script used for the street-section retry check).
