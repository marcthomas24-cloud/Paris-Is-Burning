# Devastation pass: findings and plan

Goal: make all three levels read as a city on fire. Many more burning vehicles and burning shops, structure fires, and damage that builds up over the night. The game rules stay as they are: fire you weren't warned about never hurts you, peaceful people are never hurt, and boss arenas stay fair.

Measured on 2026-11-01 on branch `level3`, in Level 2 at the start of section 1, with no incidents running.

## Findings

### 1. The fire and smoke budgets are already used up

| Pool | In use | Cap |
|---|---|---|
| Flame particles (`effects.fire`) | 1,220–1,233 | 1,300 (94%) |
| Smoke particles (`effects.smoke`) | 1,972 | 2,000 (99%) |

That is 48 fires and 42 smoke sources, 40 and 41 of them inside the emit radius. Every fire is fully simulated out to 170 m and every smoke column out to 230 m, whether it is 10 m or 160 m from the camera. A smoke column with `rate: 2` keeps about 120 puffs alive (roughly 9 a second, each living 11–16 s). When a pool is full, `ParticleSystem.spawn` drops the **oldest** particles first, which are the tops of the smoke columns and the embers.

**Consequence:** adding more `world.fires` entries the way we do now would not add fire. Columns would get shorter, flames would thin out, and a petrol bomb could starve every fire on the street. The first job is to make each fire cheaper; only then can we add more.

### 2. "A vehicle has caught fire" does not set a vehicle on fire

`IncidentScheduler.carFire()` (`src/events.js`) places flames at x = ±7.7 and a random z. That can land on an intact, shiny car or on an empty bit of kerb. The car never changes. `World._car()` merges every car into static material batches and keeps no record of them, so there is nothing to switch to a burnt state.

Burning vehicles at the moment:
- About 8% of parked cars are pre-built burnt shells. Most of them aren't on fire.
- Two cars in the middle of the boulevard are burning (z 40 and z −128).
- Burnt cars at the far ends of the side streets.
- In Level 3, about six burnt cars plus the bus.

### 3. Shops never look like they're burning

The boulevard has 8 shop textures (`src/textures.js`): 6 intact, lit shop windows and 2 graffitied shutters. When a looting crew commits arson (`crowd._arsonThrow`), flames appear at the door, but the shop front still shows an intact, warmly lit window behind them. No shop has flames in its window, a gutted interior, soot climbing the façade, or fire on the upper floors. Level 3 does have `looted` and `boarded` shop fronts, but none that burn.

### 4. Damage doesn't build up

`Effects.addFire` keeps at most **9** dynamic fires. The tenth removes the oldest one completely: no smouldering, no shell left behind, no soot. Shop arson, car fires, the boss-arena fires and the cook-off all share those 9 slots. Over a run the street ends up no more damaged than it started.

### 5. Every fire is the same kind of small, low fire

Fire `scale` ranges from 0.75 to 1.7, and every fire sits between 0.3 and 1.4 m off the ground: bins, heaps, pyres, barricades. Nothing burns above head height. Nothing lights a façade, and there are no big structure fires on the skyline. The orange glow on the horizon is a fixed sky uniform. Only the 4 nearest fires cast light (`fireLights`), plus 3 short flash lights.

### 6. Level 3 holds back on purpose

A comment in `district.js` reads *"fires kept few: four flickering lights serve the nearest fires, and a cluster turns everything orange"*. The district has about 10 fires. That limit came from the lighting, but it can be worked around (see Phase 3).

### 7. Incidents are infrequent

`carFire` fires every 30–55 s, flare-ups and petrol bombs every 3.5–9 s, and the cadence is the same throughout a level. Nothing escalates, and one fire never spreads to the next car or shop.

### 8. Constraints the plan has to respect

These come from the README and the code:
- **No new lights, and no shader programs compiled mid-game.** Lighting presets only change values. `__perf` currently counts 74 programs.
- **Frame-rate target:** about 50 fps in dense areas on an integrated AMD laptop GPU, with dynamic resolution between 0.85× and 1.5×. The frame times I measured here came from a hidden preview pane and aren't meaningful. Use `__worldPerf` on the target machine as the baseline.
- **Fairness:** hazards have a ring, a sound and at least 1 s of warning. Peaceful people are never hurt. The van takes damage only from crews. Nothing new can do damage inside a boss arena.
- **Who causes the damage:** arson is done only by the looting crews, never by demonstrators. Keep it that way.

## Plan

There are six phases. Each one is a commit you can review, in the same style as the Level 3 increments. Phases 0–2 build the systems; Phase 5 applies them to each level.

### Phase 0: Fire budget (needed before anything else)

**Status (2026-11-01): done.** At the opening of Level 2, the flame pool fell from 1,233 of 1,300 particles to about 330 of 2,400, and smoke from 1,972 of 2,000 to about 1,400 of 3,000. Neither pool evicts anything at any viewpoint in the three levels. Draw calls went from 274 to 275, and the vehicle shaders add 6 programs, compiled at load. Smoke headroom is 53%, a little under the 60% target; columns within 20 m are left at full density on purpose. Cluster merging, implemented more simply than planned: past 35 m, columns within 8 m are merged.

1. **Level of detail for fires.** Each fire picks a tier from its distance to the camera:
   - **Near (< 35 m):** today's particles.
   - **Mid (35–110 m):** one or two large animated flame cards, about 4 particles in place of about 35.
   - **Far (> 110 m):** a single glow sprite.

   Mid and far fires reuse `ParticleSystem` with the same shader source, so no new program is compiled.
2. **Level of detail for smoke columns.** Beyond 60 m, emit a quarter as many puffs at twice the size. Merge columns that are within 6 m of each other.
3. **Shared embers.** Replace each fire's own embers with one ember and ash field of about 200 particles that follows the camera and gets denser near fires.
4. **Eviction by priority.** When a pool is full, drop far, low-priority particles first, not the oldest. Petrol bombs and hazards are never evicted.
5. **Larger pools**, sized from measurements: about 2,400 flame particles and 3,000 smoke particles.
6. **Dev check `__fireBudget()`:** reports pool occupancy and evictions per second at each `__worldPerf` viewpoint. Add it to `devtests`.

**Done when:** the pools can carry the Phase 5 targets: up to about 120 active fires per level (most of them mid or far tier) and 60 or more smoke columns, with eviction under 5% a second and frame time within 10% of today's. The current scene alone should leave 60% or more headroom.

### Phase 1: Vehicles that really burn

**Status (2026-11-01): done, apart from scooters and bins.** They still burn as before, as separate fires; they move to Phase 2b. Glass goes dark but stays in place. Vans: only civilian vans burn.

1. **Vehicle registry.** `_car` and `_van` record `{ id, x, z, ry, type, state }`. Each vertex in the car batches gets a `vehicleId` attribute.
2. **Burn state as a texture.** A small data texture holds a burn value from 0 to 1 per vehicle. A patch to the car, glass and tyre materials, compiled once at load, uses it:
   - paint blisters, then chars to black
   - glass goes dark, then disappears
   - glowing emissive edges while the car is on fire

   Burning a car becomes one texel write: no geometry change and no extra draw call.
3. **Car fire lifecycle:**
   - **Ignition:** the engine bay, a small fire, the alarm.
   - **Fully alight:** the cabin, a fire of scale 2–2.5, a thick black column.
   - **Smouldering:** low flames, heavy smoke.
   - **Burnt shell:** a smoke wisp and a soot patch on the road.

   Each stage downgrades the fire's level-of-detail tier, so a shell costs almost nothing. A shell never reverts to an intact car.
4. **`carFire()` picks a real car** from the registry, out of sight or ahead of the player.
5. **Fire spreads** to a car or bin within 3 m with some probability, so you see chains of burning cars along the kerb. Tyres pop, and some fuel tanks flare as a visual and sound effect only. The only cook-off that does damage stays the Level 3 hazard with its warning.
6. **Replace the 9-fire cap** with downgrading: old fires become smouldering shells instead of disappearing.
7. **Scooters and bins** use the same lifecycle.

### Phase 2: Burning shops and buildings

1. **Shop-front states**, added to both shop sets (`textures.js` and `district.js`):
   - **Smashed:** glass gone, dark interior.
   - **Burning:** a bright interior inferno on an unlit material.
   - **Gutted:** black, with soot streaks.
2. **Bay-state overlay.** One instanced mesh covers every shop bay on the street, with a state index per bay; instances that aren't in use have zero scale. Arson flips the bay to burning, and it later becomes gutted. The whole thing is one draw call.
3. **Flames out of windows:**
   - Tongues of flame roll out of the top of the shop opening and up the façade.
   - Window glow on the floor above flickers.
   - A soot decal grows up the wall above. The soot decals become instances whose opacity can change.
4. **Structure fires.** Two to four buildings per level burn on their upper floors: flickering emissive windows, flames from one or two windows, and a very large column of smoke. These are the landmarks you can see down the street.
5. **Debris at burnt shops:** a collapsed awning, a fallen sign, merchandise thrown out, glass fragments. These are static batches, so they add no draw calls.
6. **Whole frontages burning.** A run of three to six bays on fire together, with flames joined across the bays and one shared smoke wall in place of separate columns. This is cheaper than the same number of separate fires and reads as a block on fire.

### Phase 2b: Heavy destruction

Authored set pieces, all static geometry in the existing material batches, so they add almost no draw calls. Each level gets the ones listed in Phase 5.

1. **Collapsed façades.** A building front with its top floors fallen in: exposed floor slabs and joists, a burning interior seen through the gap, and a mound of rubble spilling across the pavement into the road. The rubble mound is a collider, so the crowd walks round it.
2. **Large burning vehicles:** a bus, a delivery lorry, a burnt-out CRS van, and overturned cars pushed together into burning barricades. Each uses the Phase 1 burn lifecycle with a bigger fire and a taller column.
3. **Street furniture wrecked:** plane trees on fire or fallen across a lane, toppled streetlamps, smashed bus shelters, a burnt-out newspaper kiosk, a Morris column scorched black.
4. **Scorched road.** Every petrol bomb and explosion leaves a permanent scorch decal, plus fixed blast marks with a shallow crater near the authored explosions. All decals are instances of one mesh.
5. **Blackouts.** Whole blocks where the streetlamps are out (lamp intensity set to zero for those lamps), so fire is the only light and the burning stands out.
6. **Background destruction.** Distant shapes on the skyline: a burning roofline, a building with its top floors alight, a collapsed tower of scaffolding. These are far-tier impostors, so they cost little.

### Phase 3: The whole city on fire

1. **Skyline fires.** Five to eight huge smoke columns beyond the rooftops, built as far-tier impostors, each lit from below by a glow card. The `sky.glow` uniform pulses gently instead of staying fixed.
2. **Fake light pools.** Under each fire, an additive orange radial card on the ground and a vertical one on the nearest façade. These are instanced, so many fires light their surroundings without adding real lights. This also lifts the Level 3 limit on clustered fires.
3. **Ash and embers** drift through the camera's surroundings (from the shared field in Phase 0) and get thicker on streets where more is burning.
4. **Underlit smoke.** Smoke above the fire level takes on orange where fires are dense (from the existing `glowFn` hook and the `smokiness` value).
5. **Lighting gets hotter as a level goes on.** A heat value from 0 to 1 per level blends the preset towards hotter values as the level progresses: warmer `fogB` and `hemiGround`, more `fireLight`, a stronger `sky.glow`. These are value changes only, so no shader recompiles.

### Phase 4: Escalation and chaos

1. **Devastation director** (it can go in `events.js`). A meter from 0 to 1 per level is driven by phase or section progress, time, and crowd tension.

   | Event | Low | High |
   |---|---|---|
   | Car fires | every 30–55 s | every 10–18 s |
   | Shop arson by crews | — | more often |
   | Chains of spreading fire | — | enabled |

   It also adds new background events:
   - a transformer arcing with a blue-white flash, and streetlights in a block going out for a while (the lamp intensity drops)
   - a gas main flaring in a side street
   - a balcony fire dropping burning debris onto the far pavement, cosmetic only
   - shop alarms
   - fire-brigade sirens that never arrive
2. **Tension link.** When the crowd is *volatile*, crews commit arson more often. This uses the existing crew logic and follows the rule that tension changes how much happens, never who does it.
3. **Cosmetic and dangerous effects stay separate.** All new fire is scenery. Only the existing ignite pools, petrol bombs and Level 3 hazards do damage, so the fairness rules don't change.

### Phase 5: Applying it to each level

Every level starts heavily burning and gets worse. There is no calm opening.

| | Level 1 (dusk) | Level 2 (night) | Level 3 (district) |
|---|---|---|---|
| Active fires (today) | ~120 (48) | ~120 (48) | ~100 (~10) |
| Cars burnt or burning, start → end | 35% → 55% | 65% → 80% | 60% → 75% |
| Shops burning or gutted | 6–8 → 12+ | 20+ | 15+ |
| Structure fires (upper floors) | 2 → 4 | 5–6 | 4–5 |
| Collapsed façades | 1 (from phase 3) | 2 | 1 |
| Skyline columns | 5 | 8 | 8 |
| Blackout blocks | 0 | 2 | 2 |

**Level 1 · dusk, 18h47: already out of control.**
- From the spawn, the boulevard ahead is burning: a structure fire visible down the street, burning cars on both kerbs, and a burning bus across Rue de Malte.
- Crews set two or three shops alight in each phase, and fires spread along the kerbs as the director escalates.
- In phase 3 a façade at the Oberkampf junction collapses into the road (a scripted moment with a telegraphed rumble and dust, staged away from the player). The officers you extract are cut off behind burning rubble.
- At dusk the smoke reads against the sky: the skyline is a wall of black columns.

**Level 2 · night, 01h12: apocalyptic.**
- Continuity with Level 1: everything that burned is now a gutted shop or a burnt shell, and the collapsed façade at Oberkampf is still smouldering.
- Whole frontages on fire between Rue de Malte and Rue Jean-Pierre Timbaud. A second collapsed building at Rue de Malte, and a burnt-out CRS van.
- Two blackout blocks lit only by fire, constant ash, the skyline glowing orange, and transformer flashes and gas flares in the side streets.
- Both boss arenas keep today's framing fires. New fire stays outside the arena radius plus a margin, so the fights stay readable.

**Level 3 · the district, 02h20: the city in flames.**
- The Avenue is a corridor of fire: burning cars on both sides, and the bus as a full inferno that lights the roadblock.
- The Passage: burning shop fronts along the lane, a building alight above the scaffold, and embers falling through the narrow gap.
- The Square: ringed by burning cars and a burning kiosk, with one collapsed façade on the east side, and burning buildings framing the cinematic shots. The rally's own space stays clear.
- Two blackout blocks south of the square, and eight skyline columns to the south.
- Constraints: the van's path stays clear (a lint check), and its damage rules don't change.

### Guardrails and checks

- **`__lintFires`.** Fails a level if:
  - any fire or shell lies in the van's route corridor, on a crowd path, or within a boss arena radius plus 6 m
  - any burning car has no vehicle under it
  - any shop arson flips a bay outside the crews' sites
- **Readability.** Make sure the red threat rings and amber hazard rings still stand out against orange-lit ground; brighten them or add an outline if they don't. Run the existing test bot through all three levels.
- **Performance.** At every `__worldPerf` viewpoint:
  - at most about 12 extra draw calls
  - no change in the number of shader programs during play
  - frame time within 10% of the baseline
  - pool evictions under 5% a second

  On low-tier and touch devices, scale the density down using the existing quality tier.
- **The content rule.** Arson is only ever done by the looting crews. Demonstrators never set fires, and nobody's appearance plays any part in this (the appearance audit is unchanged).

## Suggested order

Phase 0, then 1, 2, 2b, 3, 4, and finally 5 one level at a time: Level 2 first because it's the showcase, then Level 1, then Level 3. Commit the uncommitted Level 3 work on `level3` before starting, so the two don't mix.
