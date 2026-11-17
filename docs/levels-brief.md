# Design brief: Levels 4–6 (the State campaign, 03h10 to dawn)

Written 2026-11-12. A brief, not a plan: it says what each level is for and what it needs. Each level gets its
own implementation plan (like `devastation-plan.md`) before work starts.

## Where the campaign stands

| Level | Time | Place | What the player does |
|---|---|---|---|
| 1 | 18h47 | Boulevard de la République | Tell aggressors from marchers; hold the line |
| 2 | 01h12 | The boulevard at night | Push back down it; the Enforcer, le Patron |
| 3 | 02h20 | Place du Château-d'Eau | Escort the van; the Fixer |
| finale | 05h40 | Dawn | Epilogue screen |

Three hours are missing between Level 3 and the dawn. Levels 1–3 escalate force: bigger crowds, harder bosses.
The epilogue then says "most of the people on the street came to demonstrate and went home", but the player
never plays that. Levels 4–6 are the half of the night where the job becomes getting people home.

## Pillars for all three

1. **People first.** Each level's hardest problem is a crowd of ordinary people, not a boss. No new boss fights.
2. **One new verb per level**, taught in its first two minutes, required by its last five.
3. **Restraint is the high-skill route.** Gold needs the level solved with little or no force; force remains possible and is slower and costlier.
4. **Same night, same city.** Reuse the boulevard kit, the crowd, the lighting system. Each level adds one new kind of space.
5. **Characters at conversation distance.** Every level puts specific, named-by-role people within two metres of the camera, so each depends on the body-language layer (`lifelike.js`) and extends it.

## Level 4 · LAST TRAIN · Gare de l'Est · 03h10

**The situation.** The Métro has closed. Hundreds of people, many of them the marchers from Level 1, are trying
to leave through the one station still running night trains. Gas drifts in from the boulevard. A looting crew
is working the concourse shops. The danger is a crush at the barriers.

**What the player does.** Keeps the crowd moving and breathing: opens and closes gates, places barriers to
split a flow, pulls people out of a crush, and deals with the crew without starting a stampede.

**New verb: direct.** Hold a key to point and call; calm people within about 8 m move the way the officer
points. It is the voice verb from the review (B11) in its simplest form. Shouting while holding the baton
raised frightens instead of directs.

**Beats.**
1. *Forecourt (2 min).* Teach direct: send a family round a burning bin to the open entrance.
2. *Concourse (5 min).* Three entrances feed two ticket gates. A density gauge replaces the tension bar. Above the red line people start to fall; keep it under by gating and splitting flows.
3. *The crew (3 min).* Looters smash the kiosk beside the densest queue. Any blow here sends a panic wave through the queue. Options: direct the queue away first, then act; or gas, which clears the crew and endangers the queue.
4. *Platform (4 min).* The train doors open for 40 s at a time. Hold the platform edge, get the last people on, including someone injured who must be carried.

**New characters and what they need.**

| Who | Behaviour | Animation and appearance needs |
|---|---|---|
| Families (adult with child) | Move as a pair; the adult will not leave the child; slow | Hand-holding pair rig (one IK arm each); a child body |
| Older travellers | Slow, cannot be hurried, first to fall in a crush | Older base body (review B8), slow walk clip (B1) |
| Station staff (2) | Follow direct orders exactly; can operate a gate | Hi-vis and uniform outfit; pointing gesture |
| People in a crush | Pressed, arms up at the chest, heads turning for air | New `pressed` pose in `lifelike.js`, driven by local density |

**Systems.** Local density per grid cell (the spatial hash exists); a crush state above a threshold; gates as
switchable colliders; stairs, which need foot planting (B3) or must be avoided with ramps.

**Medal citations.** Score; nobody trampled; trains boarded (people home) at least N; damage received.
"Arrests at least" is replaced here by "people home".

**Risks.** Interior lighting is new: one more lighting preset, no new light types. Crowd density near the
camera will press on the 24 skinned-rig cap; budget a pressed-crowd impostor.

**As built (2026-11-12, `src/level4.js`, `src/station.js`).** All four beats, direct (F), the density gauge, gates, the
crush and trample rules, families with children, staff and the carried casualty are in. Differences from the brief:
B1 and B11 were not done first, so there is no slow-walk clip and direct is this level's own verb (the player
side is general: `LEVELS[n].direct` and `missions.onDirect`, ready for Level 6). Children and older travellers
are the shared bodies scaled and posed, not new bodies (B8 still open). The hand-holding is posed, not IK.
Density is read per person (neighbours within a metre) and summed over six named places rather than per grid
cell. There is no pressed-crowd impostor: beyond the 24 rigs the queue is drawn with the standing impostors.
No section checkpoints.

## Level 5 · THE QUAYS · Canal Saint-Martin · 04h05

**The situation.** The last violent groups have left the boulevards and are moving along the canal in small
fast bands, lighting cars and vanishing over the footbridges. The officer now leads four others.

**What the player does.** Commands a squad along a kilometre of quay: hold a bridge, cut off a band, protect a
fire crew, and decide where four officers can do the most good when there are six places to be.

**New verb: order.** Four squad officers with three orders: hold here, follow, and advance to a marker. No
micromanagement; they fight and arrest on their own using the existing police-line behaviour.

**Beats.**
1. *First bridge (2 min).* Teach hold and follow: post two officers, take two across.
2. *Two quays (6 min).* Bands of 5–8 cross where no one stands. Each bridge held shrinks their options. Fires spread if nobody is near (the fire budget from the devastation work).
3. *The fire engine (4 min).* A pompiers crew needs four minutes on a burning building. Bands target it. The squad cannot cover both the engine and the bridge behind it.
4. *The lock (3 min).* The bands are cornered at the lock gates with the water behind them. A cornered band fights hard; an open route out lets them scatter and the level ends without the fight. Leaving the route open is the Gold path.

**New characters and what they need.**

| Who | Behaviour | Animation and appearance needs |
|---|---|---|
| Squad officers (4) | Follow orders; call out; get tired and hurt | Distinct builds and call signs on the back patch; acknowledgement gesture; visible fatigue (the stamina breathing already on the player) |
| Runners | Hit, burn, leave; never stand and fight unless cornered | Jog and sprint clips, look-back over the shoulder while running, vault over the quay rail |
| Pompiers (3) | Work the hose; retreat if struck | Firefighter outfit; two-person hose pose |
| Residents at windows | Watch, film, shout down | Upper-body only at windows: cheap life for the street |

**Systems.** Squad orders (a small state machine on top of `_copCombat`); water as a bounds and hazard;
bridges as chokepoints in the nav map; the bands' route choice reading which bridges are held.

**Medal citations.** Score; arrests; squad officers still standing; fires put out.

**Risks.** Squad AI in the open is the largest new system in the three levels. Keep orders to three and test
with the bot first. A long thin level strains the impostor and culling ranges; reuse the district bounds work.

**As built (2026-11-12, `src/level5.js`, `src/quays.js`).** All four beats, the three orders (1 hold, 2 follow, 3 advance),
the squad, bands that plan round held bridges, fires that spread when nobody is near, the fire engine and its crew, residents
at windows and both endings at the lock are in. Differences from the brief: the quays are 285 m long, not a kilometre, with
five bridges and eight side streets. Orders go to one officer at a time, chosen by the game (the nearest with you for hold
and advance, the nearest posted for follow), so there is no selecting. The squad are four of the existing `crowd.js` officers
with a moving post, not new characters: builds differ by scale only. B1 was not done first, so runners use the walk and run
clips; the look back over the shoulder is posed, and there is no vault over the quay rail (the rail and the water are one
collider nobody crosses). The pompiers' hose pose is two single poses, not a paired rig. The fourth citation is "cars burnt
out, 5 or fewer" rather than "fires put out", which a run with few fires could not earn. Bridge decks are flat (no stairs).
No section checkpoints. Until Level 6 exists the finale follows Level 5. Not yet tuned by a person playing it: the numbers
come from bot runs, and the bot gives almost no orders.

## Level 6 · DAWN · Place de la République · 05h10

**The situation.** A few hundred people remain round the monument, exhausted, some hurt, some angry, none
armed. The order is to clear the square by 05h40. On the other side is an organiser from Level 1's march, a
character the player has seen all night without knowing it.

**What the player does.** Ends the night without a charge. Walks in without the shield up, talks, lets the
medics in, gets the organiser to call it, and holds back a line of CRS who want it finished.

**New verb: talk.** Approach with the baton lowered and hold interact to speak with marked people. Short
exchanges with two or three replies (the Revolution plan's `dialogue.js`). What works depends on the night:
the campaign records already say whether peaceful people were struck in the latest run of each of Levels 1–5, and the square remembers.

**Beats.**
1. *The walk in (2 min).* No HUD threats. The crowd watches the officer cross the square. This is the body-language layer's set piece: every head turns.
2. *Three conversations (6 min).* A street medic (wants a corridor for the injured), a group of students (want their arrested friend's name taken), the organiser (wants the line pulled back 20 m). Each agreed request lowers tension and thins the crowd.
3. *The provocation (3 min).* One bottle from the back. The line surges. The player must stop their own side, using direct and order from Levels 4 and 5, and find the thrower without striking anyone near.
4. *First light (2 min).* If tension is low the organiser calls it and the square empties past the officer, some nodding, some not. If not, the charge happens and the level becomes a rescue.

**New characters and what they need.**

| Who | Behaviour | Animation and appearance needs |
|---|---|---|
| The organiser | Appears in the Level 1 crowd with a megaphone; here, speaks for the square | A fixed outfit recognisable from Level 1; megaphone prop; full face animation with a face fill light (review B5) |
| Street medics (3) | Kneel with the injured; move toward anyone down | White helmet with a cross, backpack; kneeling treatment pose (this is review B9 made visible) |
| The exhausted crowd | Sitting on kerbs and the monument steps, leaning on each other, wrapped in flags | Sit, lean and huddle poses; slow blink and head-drop; no chanting roles |
| The CRS line | Impatient: shields tapping, weight forward | Shield-tap loop; a captain who argues back |

**Systems.** Dialogue (shared with the Revolution campaign); a "memory" modifier read from each level's latest completed run in the campaign records;
sitting as a crowd state; the lighting system moving from `night3` to a new `dawn` preset during play, which
its design already allows since presets only change values.

**Medal citations.** Score; requests agreed (of 3); nobody struck, by either side; square cleared by 05h40.
Gold is a level with no blow landed.

**Ending.** The existing finale screen follows directly. Its closing line about the people on the street is now
something the player did rather than read.

**Risks.** A level without combat can feel like a cutscene. Beat 3 is the answer: the skills of the whole
campaign are needed, under time pressure, to prevent a fight. Dialogue must be short: nothing over ten seconds.

**As built (2026-11-12, `src/level6.js`, `src/republique.js`, `src/dialogue.js`).** All four beats, talk (E with the shield down
and the baton still), the three requests and the captain, the line's surges stopped with direct and the orders, the thrower,
both endings, the square's memory and the dawn light are in. Differences from the brief: the organiser is not yet placed in
Level 1's crowd (adding a scripted person there would change Level 1's recorded seeded runs), so the recognition is the
organiser's own line about 18h47 and the fixed outfit. The orders are the same keys as Level 5 but act on the line: 1 halts
the nearest officer moving, 2 calls him back (held: everyone in earshot), 3 sends one where you look (at the thrower, to take
him). There is no camera move into conversation distance and no new face rig: the face fill is the second beacon light moved
to the speaker's face (no light added), standing in for B5. Sit, lean, huddle, head-drop, kneel-to-treat and nod are pose
layers in `lifelike.js` over the existing clips (B1 still open); beyond the 24 rigs, seated people are standing impostors
sunk into the ground. The crowd is about 135, not a few hundred. The light mixes two presets (`dawn0` to `dawn`) as the clock
runs. No section checkpoints. Not tuned by a person playing it.

## The Revolution campaign

`docs/revolution-plan.md` covers missions 101–103 against Levels 1–3. If Levels 4–6 are built, each has a
natural mirror, to be briefed after 103 ships: the station as someone trying to get home (104), the canal as a
runner (105), and the square at dawn as the organiser (106), holding their own side back while the officer
holds his. Level 6 and 106 would be the same scene from both sides, which is the point of having two campaigns.

## Shared work the three levels depend on

| Work | Needed by | Review item |
|---|---|---|
| Mocap library: tired / brisk / old walks, jog, strafe, sit, kneel | 4, 5, 6 | B1 |
| Voice verbs: direct, then talk | 4, 6 | B11 |
| Helping the fallen; medics | 4, 6 | B9 |
| More bodies: older adult, child, two more women | 4, 6 | B8 |
| Face fill light | 6 | B5 |
| Foot planting or ramps | 4 | B3 |
| Body language driven by tension and density | 4, 6 | G3 |
| Campaign table, medals and records extended to six levels; finale totals | all | `campaign.js`, `levels.js` |

## Order and size

Build in the order 4, 5, 6. Level 4 delivers direct and the density system, which Level 6 needs. Level 5
delivers orders. Level 6 is mostly content on top of both. Rough size relative to Level 3 (the largest so
far): Level 4 about the same, Level 5 somewhat larger because of the squad, Level 6 smaller in systems and
larger in writing and animation. Do B1 and B11 before any of them.

## Decisions (2026-11-12)

1. **Six levels, one campaign.** Levels 4–6 extend the State campaign; the campaign table, medals, records and the finale's totals grow from three levels to six. Completing Level 3 unlocks Level 4 instead of the finale.
2. **Children are in.** Level 4's families are an adult with a child. Children are never targets, are never struck and cannot be struck: blows and projectiles pass to the adult, and a child in a crush is lifted by the adult rather than falling.
3. **Level 6 remembers the latest runs.** The square's memory reads each level's most recent completed run (`records[id].last` in `Progress`), not the best one. A player who wants a kinder dawn has to go back and play the earlier night better.
