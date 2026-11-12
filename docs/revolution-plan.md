# The Revolution — implementation plan

Second campaign: the same night in Paris from the other side of the police line.
Branch `level3` (active). The State campaign (Levels 1–3) is unchanged.

## What is reused
- World: Boulevard de la République (dusk / night lighting presets), colliders, cars (burn.js), effects, audio.
- Crowd (crowd.js): all 320 demonstrators, looting crews, civilians, reactions, panic, chants.
  New hooks only: a `riot` target mode (allies attack the mobile police), projectile routing, and
  follower scripts through the existing `n.script` move/tick interface.
- Characters (characters.js / humans.js): the protagonist is a fixed outfit on the same skinned bodies;
  the mobile CRS are the same police rigs and gear.
- Missions interface (reset / update / hudInfo / endInfo / fail), objective marker, HUD, cinematics,
  campaign records (levels.js Progress, same storage key).

## New modules
| File | What |
|---|---|
| `activist.js` | Gus, the playable protester: sprint, dodge-roll, punch / shove, aimed throws, chant, recruit, order followers, loot, smash, selfie, snack, struggle when grabbed |
| `riot.js` | Mobile CRS: shield lines that advance and bash, snatch squads that grab, gas grenadiers; take hits, stagger, fall, rout |
| `shops.js` | Glazed shop fronts that can be smashed and entered and looted; car windows, ad panels, ammo piles, barricade sites, the stash |
| `revmissions.js` | The three missions on one base class: scoring, styles, reputation, notoriety, followers, loot, destruction, arrests |
| `revcampaign.js` | Campaign table, cast, dialogue and barks, medals, endings |
| `dialogue.js` | Subtitled lines with a speaker and timed choices (keys 1–3, click or tap) |

## Campaign flow
Title → PLAY → **choose a side** (THE STATE / THE REVOLUTION) → that campaign's next mission.
The campaign screen has both tracks. Revolution missions are level ids 101–103.

1. **The Awakening** — 18h47, the same march the officer polices in Level 1. Chant, recruit, then a
   choice at the CRS line (sit-in / cobblestones / the phone shop), then escape the kettle.
2. **Property of the People** — 01h12, the night boulevard of Level 2. Shop fronts, the bank, the
   bakery, le Patron's crews; loot, smash or defend; get the goods to Papa's car before the sweep.
3. **The People's Revolution** — 03h05. The whole boulevard: barricades, waves of shield lines, then
   the CRS staging area where Level 1 began. Four endings from how Gus played the night.

## Conflicts and how they are handled
- `game.player` is swapped per level (officer / activist); the inactive rig is hidden.
- Seeded replays of the State campaign: everything Revolution-only is built lazily on the first
  Revolution level, so State runs draw exactly the same random numbers.
- HUD: police-only widgets (aid kits, gas, barriers, tension) are hidden in Revolution levels and a
  Revolution panel (loot, followers, notoriety, styles) shown instead.
- Shop colliders use their own tag (`shop`) so the officer's barrier-deflection credit never fires.
