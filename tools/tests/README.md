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

Then open `http://localhost:5176/?dev&seed=3` (Level 1) or `http://localhost:5176/?dev&level=2&seed=12` (Level 2).

## Commands (browser console)

| Command | What it checks |
|---|---|
| `await __runToEnd()` | Bot plays the current level to the results screen (cinematics skipped) |
| `await __runToEnd({ watch: true })` | Same, cinematics played through |
| `await __auditRun({ watch: true })` | `__runToEnd` plus: duplicate spawns, encounters active > 90 s, boss damage during a phase change or after defeat, hits > 25, score equals the sum of awarded events |
| `__lintBosses()` | Attack tables against the fairness rules (boss.js) |
| `await __testTransitions(10)` | Le Patron phase changes with hits just before and during the change |
| `await __testFeints(400)` | Feints forced on: the real attack after a feint can still be dodged |
| `await __testCheckpoint('enforcer' \| 'leader')` | Die mid-fight, RETRY SECTION, check the reset |
| `await __testChargeWindow()` | Time from the Enforcer's launch to contact at several distances |
| `await __testWallStun()` | Charge into an obstacle: stun, no damage, front open |
| `await __fuzzBoss(name, seconds, hitRate)` | Random hits and positions: no stuck state, no extended invulnerability, health only falls |
| `await __probeMemory(8)` | Heap (Chrome) and GPU object counts across repeated boss retries |
| `await __frameTimes('leader', 300)` | Per-frame simulation and render cost (p50 / p95 / max) |
| `__hudLayout()` | Visible HUD panels that overlap or leave the screen at the current viewport |
| `await __auditAppearance({ seeds: 30, level: 2 })` | Appearance of selected attackers versus their pool |

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
