# Design review: gameplay and characters

Reviewed on 2026-11-12 on branch `level3`, by reading the code and playing Levels 1 and 2 under `?dev`.
Items marked **Done** were implemented in this pass (see "What changed" at the end). The rest is a ranked backlog.

## Summary

The game's systems are strong: a readable crowd with temperaments, fair bosses, a campaign with records, and a
test harness most projects never get. What held it back was the people. Up close they stood like mannequins,
looked at nothing, slid instead of stepping, and fell over like planks. The player spends the whole game two
metres from other human beings, so that is where the next gains in quality are, more than in new systems.

## Characters

### Movement

| # | Finding | Severity | Status |
|---|---|---|---|
| M1 | Standing people were frozen in one symmetric mocap idle: both feet square, arms hanging, no weight shift, no breathing visible. | High | **Done**: per-person breathing, weight on one leg that changes every 7–14 s, eight fidgets (phone glance, neck rub, hands on hips, folded arms, look over shoulder…). |
| M2 | Role poses were held for ever. A flag bearer kept an arm overhead all evening; a filmer never lowered the phone; a watcher never unfolded their arms. | High | **Done**: flags rest on the shoulder, placards come down to the chest, filmers check their screen, watchers alternate. |
| M3 | Nobody looked at anything. Heads faced dead ahead while the officer walked past at arm's length or a car exploded. | High | **Done**: head, shoulders and eyes turn to a commotion, to the officer when he is close (or sprinting / swinging within 7 m), and to the person they are standing with. Otherwise the gaze drifts. |
| M4 | Running and turning bodies stayed bolt upright. | Medium | **Done**: lean into acceleration and braking, bank into turns, head leads the turn, forward lean grows with speed. Applies to crowd and officer. |
| M5 | The police line slid. `_copCombat` moved officers while the animation was told their speed was 0. | High (plain bug) | **Done**: pace is measured from movement; they walk out and walk backwards to their post. |
| M6 | Falls were a rigid rotation about the feet; everyone landed in the same pose; getting up was the fall played backwards. | High | **Done**: knees give way first, three landing poses per direction with a random lie, slow pain movement on the ground, and a rise through one knee with a hand on the thigh. |
| M7 | One stagger pose for every blow. | Medium | **Done**: three variants (arms out, hand to head, folded over ribs) with quick balancing steps. |
| M8 | Strikes and throws moved the body as one block. | Medium | **Done** (partly): the head now trails and catches up on any fast torso move; the officer's wind-up shifts weight to the back foot. Full hip-driven swings need new clips (backlog B1). |
| M9 | Everyone shares two walk cycles and one run. A crowd of 300 reads as two people copied. | High | Backlog B1. Posture and arm carriage now vary per person, which helps, but gait needs more clips. |
| M10 | No strafing or backing away: fighters circling the officer turn their backs to walk sideways. | Medium | Backlog B2. |
| M11 | Feet slide when clip speed is clamped (very slow shuffles, top-speed flight) and feet do not plant on kerbs. | Low | Backlog B3. |
| M12 | Mid-distance people (20–34 m) get mocap only, so the body-language layer switches off with a visible pop at 20 m. | Low | Backlog B4. |

### Appearance

| # | Finding | Severity | Status |
|---|---|---|---|
| A1 | Open, flat "doll" hands on anyone not holding something. | Medium | **Done**: fingers hang loosely curled, little finger most. |
| A2 | White trainers bloomed into glowing feet under the dusk sun. | Low | **Done**: off-white palette. |
| A3 | Faces are dark and flat at dusk and at night; expression work (brows, mouth) is there but cannot be read. | Medium | Backlog B5: a soft face fill term in the skin shader, limited to LOD 0. |
| A4 | Nothing ever marks a person: no dust after a fall, no soot near fires, no sweat or wet clothes. | Medium | Backlog B6. |
| A5 | Clothing is a rigid shell. Coats, hoods and scarves never move. | Low | Backlog B7: two-bone jiggle on coat hems and hoods. |
| A6 | Only seven base bodies; the two female bodies are recognisable after a minute. | Medium | Backlog B8: two more female and one older body through the existing Rocketbox converter. |
| A7 | Age is uniform: everyone is 20–35. No older marchers, no teenagers. | Medium | Backlog B8 (same work). |

### Interactions

| # | Finding | Severity | Status |
|---|---|---|---|
| I1 | Peaceful people ignored a baton swung beside them unless they fled. | High | **Done**: within 2.4 m of a swinging or charging officer, open hands come up and weight goes back. |
| I2 | Bystanders did not react physically to a blow or bang unless it pushed them into flight. | Medium | **Done**: a short start (duck, shoulders in) scaled by how close and how loud. |
| I3 | People in a group never addressed each other. | Medium | **Done**: standing neighbours look at each other in turns and gesture when speaking. |
| I4 | Nobody helps anyone. A person on the ground lies alone in a crowd of 300. | High | Backlog B9. It changes the simulation, so it needs new baselines; not done here. |
| I5 | Arrest is a state change: the person kneels on their own. No approach, no cuffing, no contact between two bodies. | High | Backlog B10. |
| I6 | The officer cannot talk. Every interaction with a peaceful person is movement or force. | High | Backlog B11: a "warn / order back" verb; it would also carry Level 6 in the brief. |
| I7 | Hits have no contact point: a strike lands on "the person", so reactions cannot favour the struck side. | Low | Backlog B12. |

## Gameplay

| # | Finding | Recommendation |
|---|---|---|
| G1 | The first 30 seconds of Level 1 ask the player to tell aggressors from marchers with only a red ring to go on. With body language in place the ring can become a secondary cue. | Make aggressors readable by behaviour first (stance, stare, approach line); fade the ring in only after 1.5 s of threat. Test with the ring off. |
| G2 | The officer has one attack. Combat depth comes entirely from enemy types. | Add a shield shove (no damage, creates space, legal on anyone) before adding anything else. It gives a non-violent answer to crowding. |
| G3 | Tension is a HUD bar. The street itself barely changes between CALM and VOLATILE. | Drive crowd body language from tension: more shouting roles, tighter spacing, fewer fidgets, faster gaze. The hooks now exist in `lifelike.js`. |
| G4 | Failure teaches little. "EXCESSIVE FORCE" appears, the score drops, play continues. | A two-second beat: the struck person's neighbours turn and film. It costs nothing mechanically and makes the consequence visible. |
| G5 | Level 2 and Level 3 lean on bosses; the campaign's theme (restraint) has no late-game expression. | See the levels brief: Levels 4–6 are built around protecting and de-escalating. |
| G6 | Onboarding is a text panel. | Teach block, strike and arrest on the first aggressor with three contextual prompts, then remove the panel. |
| G7 | Audio carries the crowd well, but voices are not tied to individuals. | Attach short barks to the person speaking (the mouth already moves); one positional voice within 6 m sells the whole crowd. |

## Backlog, in the order I would do it

| # | Work | Why this order | Size |
|---|---|---|---|
| B1 | Mocap library: 3 more walks (tired, brisk, heavy), a jog, strafe left / right, walk back, 2 hit reactions, baton swing, overarm throw. Retarget through the existing `retarget()`. | Biggest remaining gain in realism for every level. | L |
| B9 | Helping the fallen: a nearby peaceful person crouches beside someone down, then helps them up. | The single most humanising behaviour missing. Needs new seeded baselines. | M |
| B10 | Paired arrest: officer steps behind, hands go to the back, short two-person animation. | The game's main verb deserves contact. | M |
| B11 | Voice verb: warn / order back, with crowd reactions scaled by tension. | Unlocks non-violent play and Level 6. | M |
| B2 | Strafing and back-pedalling for fighters, using B1's clips. | Fixes the last obviously wrong movement. | S |
| B5 | Face fill light in the skin shader. | Makes the existing facial animation visible. | S |
| B4 | Run the lean and gaze parts of the layer at LOD 1. | Removes the pop at 20 m. Measure cost first. | S |
| B6 | Dirt and soot as a per-person shader uniform (dust after a fall, soot near fire). | Cheap, persistent consequence. | S |
| B8 | Three more base bodies, including an older one. | Variety and age range. | M |
| B3 | Foot planting (two-bone IK on kerbs and stairs). | Needed for the station level's stairs. | M |
| B7 | Cloth jiggle bones. | Polish. | S |
| B12 | Hit location (high / body / legs) feeding the stagger variant. | Polish. | S |

## What changed in this pass

- New `src/lifelike.js`: the body-language layer. Pose only, no `Math.random`, driven by a hash of each person's id and the simulation clock.
- `src/crowd.js`: layer applied to every close-up person and to the police line; role poses get rests; falls, staggers and rises replaced; officers walk instead of sliding.
- `src/player.js`: the officer leans, breathes with his stamina, stoops when badly hurt and watches the nearest aggressor.
- `src/characters.js`: head follow-through in `applyPose`; eye-lead pose key; off-white trainers.
- `src/humans.js`: relaxed finger curl; walk clip can play backwards.

### Verification

- Seeded replay, Level 1, seed 3, bot for 54 s of game time: crowd position hash, score, officer position and the next random number are **identical** before and after the change. The layer does not disturb reproducible runs.
- Levels 1 and 2 load and play with no console errors; `vite build` succeeds.
- Not run: the full regression suites (`__testCampaign`, `__auditAppearance`, the Level 3 route tests) and a frame-time comparison. Level 3 and the Revolution modules were not played.
