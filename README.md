# Paris Burning

A browser-based third-person action game built with Three.js. You play a CRS riot officer on a chaotic Paris boulevard and deal with three dynamic incidents. Characters are rigged glTF humans with motion-capture animation, bundled locally. The city and effects are generated in code; the soundscape mixes openly licensed recordings with some synthesis. It plays on desktop (keyboard and mouse) and on phones and tablets (touch controls).

## Running

Requires Node 18+.

```bash
npm install
npm run dev
```

Open http://localhost:5173 and click **PLAY**.

### Production build / public deployment

```bash
npm run build      # outputs a static site to dist/
npm run preview    # optional: serve dist/ locally to check it
```

`dist/` is a fully static site of about 20 MB (character models 15 MB, audio 4.6 MB), with relative paths (`base: './'`). It works at a domain root or in a sub-folder. Both were tested: with a plain static server at `/`, and from `/dist/`. There's no server component and nothing needs an API key.

- **Netlify / Vercel / Cloudflare Pages:** drag and drop the `dist/` folder, or connect the repo with build command `npm run build` and output directory `dist`.
- **GitHub Pages:** push the contents of `dist/` to a `gh-pages` branch, or use a Pages workflow that runs `npm ci && npm run build` and publishes `dist/`.
- **itch.io (HTML5 game):** zip the *contents* of `dist/`, so that `index.html` is at the root of the zip, upload it as an HTML game, and set the viewport to something like 1280×720 with fullscreen enabled.

Before publishing commercially, read "Assets and licences" below.

## Controls

| Input | Action |
|---|---|
| W A S D | Move (relative to the camera) |
| Shift | Sprint (uses stamina) |
| Mouse | Rotate the camera (pointer lock). If the browser refuses the lock, moving the mouse over the game still turns, and resting the cursor at the left/right edge keeps turning. Arrow keys also work. Sensitivity and invert are under Options |
| Left mouse | Baton strike: wind-up, strike, then recovery, with a cooldown |
| Right mouse (hold) | Shield stance. Blocks frontal hits and projectiles, and lets you push through crowds |
| Space | Dodge / quick step (brief invulnerability) |
| E | Arrest a downed aggressor, or extract the officers at the objective |
| Q | First aid: restores 40 health over 1.6 s (3 kits per run). Health also regenerates after 5 s without damage |
| G | Throw a tear-gas grenade where the camera looks; aim higher to throw further (4–15 m, stopping short of walls). 3 per phase (Level 1) or section (Level 2), refilled when the next one starts; not available during boss fights. It lands as the same cloud as the CRS volleys: peaceful people and looting crews scatter, aggressors in thick gas cough and slow down for a moment but keep coming |
| B | Police barrier (4 carried). The first press shows a see-through barrier 2.4 m ahead, across your view: green where it fits, red where it would hit a wall, a person or another barrier. B again or left mouse places it; right mouse or G cancels. B beside one of your barriers picks it back up. Placed barriers are real obstacles: the crowd, aggressors and you walk round them, and they stop low projectiles. None in a boss fight; barriers inside an arena go back to you when the fight starts. They show as amber lines on the minimap |
| H | Toggle control hints |
| M | Mute / unmute |
| Esc | Pause |

**Touch screens (phones and tablets):** touch controls switch on automatically on touch-only devices, or at the first touch on a hybrid laptop. Add `?touch` to the URL to force them on for testing.

| Touch | Action |
|---|---|
| Drag on the left of the screen | Floating stick: move (partial push walks slower) |
| Drag on the right of the screen | Rotate the camera |
| STRIKE | Baton strike |
| SHIELD (hold) | Shield stance |
| DODGE | Dodge |
| SPRINT | Toggle sprint |
| GAS | Throw a tear-gas grenade |
| BARRIER | Show the barrier preview; tap STRIKE to place it (SHIELD cancels). Reads PICK UP beside one of your barriers |
| Tap the on-screen prompt | Arrest / respond (E) |
| ❚❚ and 🔊 (top right) | Pause and mute |

On touch screens the HUD is compacted: smaller objective and score panels, the minimap and bars in the top-right corner, at most two alerts at a time, and no keyboard hint panel. Landscape is recommended, but portrait works. Rendering starts at a lower pixel ratio with a smaller shadow map, and the existing dynamic-resolution system adjusts from there.

## Mission

A complete run takes about 2–3 minutes. A fast, efficient run is around 1:45; the scripted test bot took 1:48. Phases advance when you resolve them, not on a timer, and the city stays active if you explore.

1. **Street entry.** You spawn behind the CRS line with a short establishing shot down the boulevard. Ahead are a dense crowd, flags, banners, smoke columns, fires and flashing police lights. Three people in the crowd turn violent and attack the line, and the police fire tear gas. Neutralise the attackers before the line's integrity hits 0.
2. **Escalation.** A car explodes further up the boulevard, and a crowd surge rolls toward the line with two aggressors inside it. A **petrol-bomb suspect** sets up at one of several locations. He retrieves the bottle, lights it and winds up to throw. Strike him before the throw to prevent the attack. If he throws it, you get a flash, a fireball, sustained fire and a panicking crowd, and he runs (you can still catch him). The phase ends when the bomber and the surge aggressors are dealt with.
3. **Main incident.** Officers are cut off at Rue Oberkampf. Fight about 170 m down the boulevard against:
   - a second surge
   - petrol bombs landing on the street ahead
   - firework mortars
   - an ambush from Rue de Malte
   - a second bomber at a barricade

   At the junction, a final wave attacks the officers. Repel it, then press **E** beside the officers to extract them.

**Completion screen:** shows score, aggressors neutralised, arrests, bombs prevented, peaceful demonstrators struck, phases completed and mission time. RESTART starts a new run immediately.

**Variety between runs:** who turns violent, the bomber locations, surge composition, the ambush side, the final-wave size, and the timing of ambient events (molotovs, mortars, projectile volleys, flare-ups, car fires, tear gas) all change.

**Crowd tension** (`src/tension.js`): a 0–100 meter under the stamina bar, marked at 35 (*tense*) and 70 (*volatile*). It starts at 20 and drains slowly (0.3 a second) to a resting level of 10, so one mistake does not tip a calm crowd but two in quick succession do.

| Event | Tension |
|---|---|
| A peaceful person struck | +15 |
| Someone already on the ground struck (also with the police-brutality option) | +10 |
| A grenade landing among three or more peaceful people with nobody violent within 9 m | +8 |
| A third grenade within 20 s | +5 |
| An arrest | −8 |
| An aggressor stopped with no peaceful person struck in the previous 10 s | −3 |
| A barrier turning a bystander away while an aggressor is within 12 m of it (once per person; at most −10 per barrier) | −2 |

While the crowd is *tense* or *volatile*, ambient attackers come sooner (up to 2.2 times as often at 100). In Level 1 they also appear during phase 1, and two can be active at once while *volatile*. In Level 2 a street encounter brings one extra crew member (35% of the time when tense, 75% when volatile). Tension changes **how many** people turn violent and **how soon**, never **who**: the extra attackers come from the same random pools through the same selection code (see the fairness rule). Level 2 still never recruits peaceful people. The results screen shows the peak tension.

**Scoring:**
- Threat neutralised: +100
- Arrest: +150
- Petrol bomb prevented: +400
- Phase bonuses: +500 / +600 / +1000
- Time bonus
- No peaceful demonstrators struck: +500
- Striking a demonstrator who isn't a threat: −150

## Levels

**Level 1** is the mission described above. Completing it unlocks **Level 2 · Nuit** on that device (saved in `localStorage`; a CONTINUE button appears on the results screen and a LEVEL 2 button on the main menu). Completing Level 2 unlocks **Level 3 · The Breakout** the same way.

**Level 2** takes place on the same boulevard later that night, pushing back down it from Rue Oberkampf towards the CRS staging area, through the looting crews of the man they call *le Patron* (the Leader). It has five sections:

1. **Deployment.** Three crew groups introduce the standard enemies. After the first, the Leader is glimpsed directing his crews with a lit road flare, then leaves into Rue de Malte. He cannot be targeted or chased.
2. **Escalation.** Shield-carriers, a petrol-bomb suspect, a rush from a side street, a mixed group at Place de Malte and its reinforcements from both sides. Petrol bombs land on the boulevard ahead.
3. **The Enforcer** at the Rue de Malte junction: le Patron's lieutenant (boss fight, below).
4. **Second push.** An ambush from the shop fronts, throwers behind the barricade, a shop break-out, shields holding the street, and the crew's reserve from Rue Jean-Pierre Timbaud.
5. **Le Patron** at the Rue Jean-Pierre Timbaud junction (boss fight, below). Arresting him completes the level.

**Shield-carriers** carry an improvised shield (a plywood board, a torn-down road sign or a bin lid) that blocks baton strikes from the front: the strike bounces off and the officer recoils. They advance slowly, keep the shield towards you and bash: the shield is drawn back with an **amber ring** (0.75 s) before the bash, which can be blocked with your own shield. After it, the shield drops for about a second: strike then. A sprinting officer can also get round the side. No new controls are needed.

**Encounters** (`src/encounters.js`) are data: who comes (melee, thrower, shield), from where, and what triggers them (passing a point on the boulevard, or the previous group being dealt with). Members are drawn at random from free members of the looting crews; peaceful people are never recruited, and if too few crew members are free a group is smaller (counted as a shortfall). Level 2 adds four reserve crews along its route (48 crew members in all); they are inactive in Level 1. Appearance is never read. A section is complete when its groups are dealt with and you reach its end point.

**Bosses** (`src/boss.js`). Both use the existing controls (strike, shield, dodge) and the same rules: every attack has a wind-up of at least 0.55 s with an amber ring; each attack is either blockable with the shield or must be dodged or stepped away from; no hit takes more than a quarter of your health; the boss can only be hurt from the front while its guard is down (or from the side or behind); an opening allows two hits (three while stunned) before the boss shoves you clear without damage; a fight ends when you arrest the kneeling boss with **E**. During a boss fight nobody else may enter the arena, the baton only targets the boss, and no ambient petrol bombs land there. `__lintBosses()` checks the attack tables against these rules.

- **The Enforcer** (10 hits): a heavy steel shield that blocks from the front. *Shield bash* (0.8 s wind-up, blockable) leaves him open for 1.3 s. *Charge* (1.0 s wind-up, unblockable): he aims when the wind-up ends, so sidestep or dodge as he launches; if he misses he recovers for 1.4 s, and if he runs into a car, wall or barricade he is stunned for 2.4 s. After two of his bashes are blocked he backs off and charges.
- **Le Patron** (15 hits, three phases, a car-door shield and a fire axe). *Phase 1:* shield up, a heavy overhead chop (0.9 s, unblockable, 1.4 s opening) and a shield shove. *Phase 2:* he circles and strings two- and three-hit combinations: light swings you can block, ending in a heavy chop you must dodge. *Phase 3:* faster, shorter openings, and occasional feints: the wind-up visibly cancels and the real chop winds up in full, so a dodge spent on the feint has recovered in time. Each phase change is a short invulnerable pause that cancels his attack and pushes you back; damage never carries over.

**Presentation** (`src/cinematic.js`, `src/music.js`):

- **Short introductions**, each skippable with Space, Enter, a click or a tap: the first sight of le Patron (a telephoto look from where you stand, about 3 s), the Enforcer (shield slammed into the road, 3.3 s) and le Patron before his fight (axe raised, his line as a subtitle, 4.2 s). The game world keeps running underneath, nothing can hurt you meanwhile, and no new group attacks until it ends.
- **Victory:** after his arrest, a slow shot of le Patron in custody as his crews scatter (5.6 s), then the results with a hook for the next level.
- **Phase changes:** a banner with his line, a sting, a short slow-down and a small camera punch. Unblockable wind-ups make the ring pulse and play a two-note warning; blockable ones keep a steady amber ring. The boss bar shows lost health as a pale segment that drains after each hit.
- **Arenas:** burning barriers just outside each arena frame and light the fight, and the two police beacons move to its edge and strobe red and blue (the same lights, recoloured, so no shaders compile).
- **Music (Level 2):** a synthesised stand-in score: a slow minor pad, a low pulse that comes in for fights and quickens for bosses (faster again in le Patron's last phase), a sub drone under boss fights, and a resolving chord for the victory. It has its own **Music** volume on the Audio screen. Level 1 keeps its original soundscape without music.
- **Results:** rows arrive one by one; Level 2 adds both boss times, guard blocks and dodges, a rating, and the hook. The gameplay HUD fades out behind the results.

**Le Patron** runs the looting crews. He uses the night as cover: while the city's attention is on the protests, his crews strip the shops on this stretch of the boulevard for him. He is not part of the protest, and the people marching are no concern of his. He is a heavy-set man in an olive puffer jacket with a keffiyeh scarf, carrying a lit road flare in the street sections and a fire axe in the fight. Bespoke art and voice are not part of this build.

**Checkpoints.** If you fail in Level 2, **RETRY SECTION** restarts the current section with the score you had when it began.

The bosses' looks are grey-box placeholders; their complexions come from the shared generator.

**Level 3 · The Breakout** (unlocked by completing Level 2; `?dev&level=3` opens it directly). 02h20, twenty minutes after le Patron's arrest. He is loaded into a CRS transfer van at the staging area, and the officer escorts it south through a new district (`src/district.js`) to the gendarmerie beyond Place du Château-d'Eau. What is left of his crews tries to stop the van, organised by a man the radio only knows as **the Fixer**. Four acts, six checkpointed sections:

1. **The Transfer.** The van waits for you, then rolls. Crews behind the parked cars, two of them running for its rear doors, a burning car whose tank cooks off, a mixed group at Rue des Ateliers.
2. **The Roadblock.** The route choice, made by walking into one street or the other: **the Avenue** (shorter, blocked by a burnt-out bus and a barricade, throwers behind it and shields on the flanks; drag the two barricade halves clear with **E** and the van squeezes through) or **the Passage** (longer and narrow; close-quarters ambush from the doorways, a scaffold that gives way, a petrol trail with a man waiting to light it, a petrol-bomb suspect). Both routes meet the same group at the north edge of the square (a checkpoint).
3. **The Square.** A peaceful rally on the west side. Clear the crew guarding a scooter on the east side and search it (**E**): their phone names the Fixer and the van across the south exit. A crew member then fires mortars into the rally: the crowd panics east across the square with two attackers among them. The Fixer is revealed on the phone at the exit (a short close-up, then the long lens from where you stand) before his crew's last line attacks from both sides.
4. **The Intercept.** The van parks in the arena (nothing damages it while it is parked) and the Fixer comes out to stop it himself: the boss fight below. Arrest him (**E**) and his crews scatter; then the last stand in Rue de la Caserne and the handover (**E** at the van's doors), a short closing shot and the results. The start of the fight is a checkpoint of its own: **RETRY SECTION** goes straight back into it.

**The transfer van** (`src/convoy.js`) follows a fixed path at walking pace (slower in the Passage). It only moves while you are within 20 m, no attacker is within 8 m of it and nobody is in the 8 m ahead of its nose; it sounds its horn and asks people to make way when they stand in the road, and it holds at the end of each section until the section's groups are dealt with. Its condition is the bar under the objective (red below 30%). Only crew attacks damage it, each by a fixed amount: a strike on its side 3 (a shield bash 4), a stone or bottle that actually strikes its body 2, a crew petrol bomb bursting within 3 m 12 (then 3 a second while the pool burns under it), a completed breach of its rear doors 30 (six seconds at the doors, shown as **⚠ DOORS · %**; striking the breacher stops it), a hazard blast it is caught in (it holds well short of them). Peaceful people, ambient incidents and background fires cannot damage it, nothing passes through walls, and nothing lands during a short grace after a checkpoint or during a cinematic. Strikes and stones together draw on a budget that refills at 8 a second and holds at most 8, so over any stretch of T seconds they take at most 8 × T + 8 (sustained, 8 a second); with you more than 35 m away everything counts half as much again. Crews go for the van when you leave it (more than 12 m away and not close to them). At 0 the run fails ("The transfer vehicle was disabled"); **RETRY SECTION** restores the section with the van at the integrity it had then, never below 60.

**Hazards** (`src/hazards.js`) each have an amber ground ring, a sound and a HUD warning, and their tell lasts at least a second: the cook-off car (6.5 s hiss and flames; up to 24 at its centre, nothing beyond 6.5 m), the scaffold (1.2 s creak and falling dust; 18 to anyone under it, rubble left on the pavement), the petrol trail (lit only once you are within 12 m of the man at its end, a 2.2 s tell: strike him and it stays cold, otherwise a wall of fire for 8 s) and the fireworks (1 s tell; no damage, a panicked surge and thin smoke). Crew members caught by a blast or the scaffold go down (+150 each if you drew them in); peaceful people are warned off by the tell and never hurt. No light, material or shader program is added.

**Radio:** short lines from CONTROL, VAN 1 (the van's crew) and MOTO 3 (a scout ahead), one at a time with a pause between them; urgent lines (the doors, damage to the van) go first, and no line repeats (the van's crew calls for you at most every 30 s when you leave it).

**The Fixer** (`src/boss.js` FIXER, 15 hits, three phases) runs le Patron's crews day to day and is breaking him out to keep the network, and his own place in it, together; he speaks for nobody but himself. He is lean and quick, in a fitted dark technical jacket with orange piping, black tactical gloves with orange cuffs, orange trainers and a black cap, with no shield and no weapon. He uses the same rules as the Level 2 bosses (every wind-up at least 0.55 s with an amber ring, unblockable ones at least 0.6 s with a pulsing ring and a two-note warning, no hit above 16, two hits per opening, invulnerable phase changes that cancel his attack), plus two of his own: he cannot strike through a wall, car or barricade, and **an attack that finds nothing (dodged, stepped out of or out of reach) leaves him open for longer**. He keeps his distance, circles, side-steps after a recovery and sometimes backs off to make room, so walking straight at him does not work: let him commit.
- *Phase 1, testing you:* quick jabs (blockable), a kick (dodge or step back), two-jab combinations.
- *Phase 2, pressure:* longer combinations ending in the kick, wider movement, and the **rush**: a low crouch (0.8 s), then a straight run that aims at the launch. Dodge or sidestep as he launches (it reaches you 0.7–1 s later); run him into the van or a wall and he is dazed for 2 s.
- *Phase 3, desperation:* faster, mixed sequences (the kick can come first), shorter but real openings, and occasional feinted kicks that visibly cancel (a shrug and a shake of the head) before the real kick winds up in full.
His animation is procedural over the shared rigs: a bladed, bouncing guard with the fists up, a chambered knee before the kick, sideways and backwards footwork as a shuffle rather than the forward walk, his hands dropping in every opening (lower still after a miss), dazed hands to the head, and on his knees with his hands behind his head when beaten.

**Cinematics (Level 3)**, each short and skippable, with nothing hurting you or attacking out of them; the radio waits until the picture comes back: the transfer briefing (5.4 s), the Fixer's reveal in the square (3.6 s), his introduction before the fight (4 s: he ends a call, pockets the phone, squares up; he then holds his ground for a second), his arrest (3.6 s) and the handover (4.6 s).

**Music (Level 3):** its own synthesised theme in E minor with a Phrygian F, resolving to E major. It starts restrained (a dark pad over a heartbeat pulse), adds a sparse ostinato in the roadblock, drives harder in the square, and gives the Fixer a syncopated 3+3+2 figure that climbs an octave and speeds up for his last phase (with a riser into it). His defeat has a falling sting; the handover resolves the chord. Radio lines dip the music; stings never stack on themselves. New contextual sounds: the van's bodywork taking a blow, a radio chirp (two for urgent lines), a low klaxon when a hazard starts its tell, the Fixer's footwork (side-steps, feints, the rush's launch) and kicks. Everything plays through the existing buses, so the Music, Effects and Master volumes apply; a retry fades out whatever was still sounding from the failed run.

**Results:** acts, route, van condition at extraction, van damage incidents, breaches stopped and completed, crew neutralised, arrests, hazard takedowns, peaceful people struck, downed suspects struck, damage received, the Fixer's fight time, strikes stopped by his guard and dodges, crowd tension, time, score and rating. Scoring adds act bonuses (500 / 600 / 600 / 1000), roadblock cleared or Passage crossed with the van untouched (300), breach stopped (+250) or completed (−200), hazard takedowns (+150), 25 per hit on the Fixer and 1500 for his arrest, and 10 per point of van condition at the handover; the proportionate-force rules are those of Levels 1 and 2. Encounter members are drawn only from the looting crews (Level 3 adds three crews of its own: 60 crew members); the rally and passers-by are never recruited.

**Lighting presets** (`src/levels.js`): `dusk` (Level 1) and `night` (Level 2). A preset only changes light colours and intensities, fog, sky uniforms, lamp glow and exposure. It never adds or removes lights, so switching does not compile new shaders.

## Fairness rule

Who becomes aggressive is chosen at random from the crowd, independently of clothing, flags or appearance. Everyone on the street (demonstrators, looting crews and passers-by) is dressed from one shared clothing pool, so nothing a character wears says anything about their role, and becoming hostile never changes how someone looks. Threats are identified **only by behaviour**. While someone is acting violently (pursuing, punching, shoving, throwing, preparing a device), they show a red ground ring and a red minimap blip. Peaceful demonstrators keep chanting, filming and waving flags unless something credible happens near them, such as a strike, an explosion or a projectile.

Crowd tension follows the same rule: it changes how many people turn violent and how soon, but the extra attackers come from the same random pools through the same selection code. `__auditAppearance({ level, tension: 100 })` audits those selections too.

## Characters, crowd and effects

**Base bodies.** Civilians use five realistic base bodies: the Mixamo female (Michelle), the Ready Player Me male, and three [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) people (a woman in a tee and jeans, a young man in a hoodie, a man in a denim jacket). The Rocketbox bodies are converted offline by `tools/rocketbox/` (see its `convert.js`): Biped bones renamed to Mixamo names, one skinned mesh with a texture atlas, a per-vertex garment part and six ARKit facial blendshapes kept. Their faces keep their own textures, tinted darker and warmer towards each person's complexion, and they keep their original clothes or get recoloured ones.

**Building on the base models.** The base bodies are extended in code:
- **Garment layers:** skinned clothing shells are generated from each body's own mesh and pushed out along its normals. There are football shirts (PSG-style band, stripes, hoops, Algeria-style green and white), hoodies, quilted puffer jackets, long coats and pressed shirts, so outfits change silhouette, not just colour. About 10% of people wear a hi-vis *gilet jaune* over their garment, with reflective hoops and shoulder straps.
- **Body variation:** generated *belly* and *chest* blendshapes give varied builds, plus shoulder-width and head-size variation.
- **Accessories:** headscarves, caps, beanies, hoods, masks, keffiyehs, scarves and backpacks.

**Faces:**
- **Men:** the male model's `mouthOpen` and `mouthSmile` blendshapes and teeth are kept in the merged mesh. They drive talking, chanting in rhythm, shouting, screaming while fleeing, and smiling, all from each person's behaviour. Eye bones add saccades, gaze and blinks.
- **Women:** the Michelle model gets a generated jaw blendshape (its face is covered by a printed mask in the texture).
- **Rocketbox people:** real ARKit blendshapes: `jawOpen` (talking, chanting, shouting), `mouthSmile`, `eyeBlink` (blinks and squinting in distress), `browDown` (anger while attacking or shouting), `browInnerUp` (fear while fleeing, staggering or down) and `mouthFunnel` (rounded vowels while chanting). The crowd sets a per-person `brow` mood from behaviour.

**Flags:** handheld and large flags are roughly 55% Palestinian, 23% Algerian, 12% French and 10% red union strike flags (*GRÈVE*). Gilets jaunes mostly carry the tricolore. The same mix appears over the distant crowds and hanging from balconies.

**Banners and placards:** cost-of-living, public-services, union and student slogans (*LYCÉENS EN COLÈRE*, *FACS EN GRÈVE*, *JEUNESSE EN LUTTE*, *LA VIE CHÈRE ÇA SUFFIT*) alongside the original ones, plus two more large banners hung on the façades.

**Police:** CRS officers vary in height and build (and in complexion on the procedural fallback rig; the armoured model's visor hides the face). Officers in the line, squads and at the objective step out towards nearby aggressors, wind up and strike with the baton. That staggers and drives attackers back; repeated hits occasionally put someone down, which earns a small *Officer assist* score.

**Characters.** Everyone in the game is a rigged, skinned glTF human driven by motion-capture clips, as follows:

| Who | Model |
|---|---|
| Player and police | Mixamo "Vanguard" soldier, recoloured on the CPU into navy and black CRS armour |
| Male demonstrators | Ready Player Me avatar, merged at load into one skinned mesh with a texture atlas, a normal-map atlas and per-vertex garment IDs |
| Female demonstrators | Mixamo "Michelle" streetwear model |

- **Retargeting.** The Mixamo clips (idle, walk, run, nod, head-shake, and a second walk/run style) are retargeted at load in world space against a shared T-pose reference. This copes with A-pose binds, different bone roll and Y-up/Z-up armatures.
- **Actions.** Strikes, throws, chants, flag waving, shoves, crouches and knockdowns are additive bone rotations applied in character space on top of the mocap.
- **Items.** Flags, placards, phones, bottles, the baton and the shield attach to sockets derived from the bind pose, so they follow the hands.
- **Crowd mix.** One shared pool for demonstrators, looting crews and passers-by, with ordinary weights (no caps or quotas):
  - About 70% men and 30% women.
  - Complexions drawn about 34% European, 36% North African / Middle Eastern and 30% Black.
  - Clothing is mostly dark streetwear: hoodies (some red or grey), puffers, and black tracksuit tops with orange, white or red sleeve stripes. Also PSG and Algeria shirts, keffiyehs (about a quarter of people), white caps, gilets jaunes, and the wool coats and shirts of people out for the evening.
  - About a third wear face coverings: balaclavas with an eye slot, black face masks, blue surgical masks and keffiyeh masks.
  - Appearance is never used to pick who turns violent; that is decided by behaviour and mission state (see above). `__auditAppearance()` checks this (see Development and testing).
  - Props are only dropped when an attack needs the hands: a melee aggressor keeps a one-handed flag, throwers swap theirs for a stone.
- **Variety.** Each person is unique: skin tone, height, PSG / other football shirt / hoodie / jacket colours, trousers, shoes, beards, procedural hair, caps, beanies, hoods, masks, keffiyehs, scarves and backpacks.

**Crowd LOD.**

| LOD | Distance | Treatment |
|---|---|---|
| Near | under 20 m | Full skeletal animation, every frame, with action layers, items and shadows (shadows within 14 m only) |
| Mid | 20–34 m | Skeletal animation at a reduced rate, no shadows |
| Far | over 34 m | Each model is baked into idle and walking poses, decimated by vertex clustering, coloured per garment region from the original textures, and drawn as instanced meshes with per-instance clothing colours |

The same far system (with a coarser bake) draws about 1,300 background people beyond the police cordons and at the end of the boulevard; their instances are rebuilt only when the camera has moved. In total there are about 370 AI agents (320 in the crowd, plus looting crews and passers-by; at most 24 fully rigged at once, dropping to 12 automatically on slower GPUs). The number of people who turn on the officer is set per encounter and does not grow with the crowd. Bystanders and photographers stand on the pavements, back away from a fight around the officer, and CRS squads hold the line and the vans. Marching groups of up to 14 move along the boulevard and slow down at bottlenecks.

**Street fights** (`brawls.js`): ten set pieces along the boulevard in both levels: rioters kicking a CRS officer who has gone down, officers beating a rioter on the ground, and rioters smashing shop windows. Rioters scatter when the officer comes within 8 m and a scene starts again once the officer is well away; the crowd walks round them.

**Smoke, fire and explosions.**
- Layered noise-puff smoke columns: dark at the base, greying and expanding as they rise, lit from below near fires, and all pushed by a consistent wind.
- Low haze in the affected streets, plus fog that thickens and warms in smoke-filled stretches.
- About 45 fires: bins, rubbish heaps, barricades, cars, side streets and the far end. Six burning piles of wheelie bins with crowd barriers thrown on top stand in the road, and some bins have the yellow recycling lid. There are also embers, soot stains, and the four nearest fires cast flickering light.
- Explosions have a flash, fireball, sparks, an expanding smoke cloud, a dust ring, debris, dynamic light, camera shake and spatialised, delayed and echoing sound.
- An **incident scheduler** (`events.js`) keeps several areas active. It schedules petrol bombs, firework mortars, projectile volleys, fire flare-ups and parked cars catching fire, with randomised timing, size and direction.

**Look.** Post-processing (half-resolution bloom, a split-tone filmic grade, ACES tone mapping, vignette, grain and slight chromatic fringing), wet reflective roads and puddles using a procedural environment map, and reflective visors.

**Performance.**
- Frustum culling with padded skinned bounds.
- Shadows only for nearby characters, and the shadow map is refreshed every other frame.
- Particle pools with a near-camera fade to limit overdraw.
- Dynamic resolution between 0.85× and 1.5×, depending on frame time.

On an AMD Radeon integrated laptop GPU, the dense crowd areas run at roughly 50 fps and the open areas at 60 fps.

## Sound

The soundscape is built from openly licensed recordings (crowds, protest chanting, French sirens, fire, glass, explosions, impacts, a distant call to prayer). Synthesis fills a few gaps: baton whooshes, low-frequency weight, car alarms and petrol-bomb ignition. Full source list, processing and licence notes: [`tools/audio/SOURCES.md`](tools/audio/SOURCES.md).

**Mix (`src/audio.js`):** sounds go to an ambience bus or an effects bus, then to a game bus (faded on pause or when the tab is hidden), master volume and mute, makeup gain and a limiter. UI clicks bypass the game bus. A generated street reverb is used as a send for distant sounds.

**Layers:**
- **Continuous beds:** two crowd recordings, street traffic and distant fireworks. Each plays random crossfaded windows of its recording, so it never audibly loops. Crowd level and brightness follow how close and agitated the crowd is.
- **Events, timed from the game loop:** group chants from somewhere in the crowd (12–30 s apart, one at a time), individual distant shouts, whistles, far-off bangs and explosions, smashing and shutter-kicking in the street, a helicopter that comes and goes, and occasionally a distant call to prayer.
- **Sirens:** French police, gendarmerie and pompiers *deux-tons* on one to three vehicles driving along the cross streets, with distance, panning, air absorption and doppler.
- **Fire:** three positional voices follow the nearest fires and burning petrol.
- **Combat:** positional baton whooshes timed to peak at the strike, body, shield and stone impacts, footsteps on the gait, grunts. Explosions layer a recorded blast, a low thump, debris (close by only) and a long rumble. Petrol bombs layer the bottle breaking, ignition, a small burst and then the fire.

**Concurrency:** each category has a voice limit (for example 3 explosions, 5 impacts, 2 shouts, 1 chant) and there is a global cap of 22. A new sound only replaces one of lower priority, weighted by audibility and age, so nearby combat and explosions win over distant detail. Distant impacts, breaks and whooshes are thinned out or skipped. Identical blasts at one spot within 0.25 s merge, and so do impacts within 80 ms. Nearby blasts briefly duck the ambience.

**Controls:** master, ambience and effects volume and mute are on the Audio screen (main menu and pause menu). They are saved in `localStorage`. **M** toggles mute; touch screens have a mute button on the HUD.

**Robustness:** the AudioContext is created by the first click, and repeated clicks reuse it. A suspended or interrupted context resumes on the next interaction. Recordings start downloading while the city loads. A file that fails to load or decode falls back to a synthesised stand-in or is skipped, so the game never waits for or depends on audio. Touch devices run audio at 32 kHz, and the call to prayer is decoded only while it plays, to save memory.

**Audio development:** with `?dev` in the URL, `__audioProbe(seconds)` reports per-second RMS and peak levels, clipped samples and active voices, and `__audioEvents(seconds)` counts requested and admitted sounds. Rebuild the audio files with `tools/audio/build_audio.py`.

## Assets and licences

All assets are bundled locally in `public/assets/models/` and `public/assets/audio/`, and nothing is fetched from other sites at runtime. Audio sources and licences are listed in [`tools/audio/SOURCES.md`](tools/audio/SOURCES.md). Everything else (city, props, textures, flags, shirts and particles) is generated procedurally in code.

| File | Source | Licence / terms |
|---|---|---|
| `Soldier.glb` ("Vanguard" + Idle/Walk/Run) | three.js examples repository (r169), originally from mixamo.com | Mixamo (Adobe) characters and animations are royalty-free for personal, commercial and non-profit projects, but must not be redistributed as standalone assets |
| `Xbot.glb` (animations only) | three.js examples repository, from mixamo.com | As above |
| `Michelle.glb` | three.js examples repository, Mixamo character | As above |
| `rpm_male.glb` (from `readyplayer.me.glb`) | three.js examples repository, Ready Player Me avatar | Ready Player Me terms. Treat as prototype / non-commercial use and verify before any commercial release |
| `rb_female.glb`, `rb_male_a.glb`, `rb_male_b.glb` | Microsoft Rocketbox Avatar Library, avatars `Female_Adult_08`, `Male_Adult_04`, `Male_Adult_12` (`*_facial.fbx` with blendshapes), https://github.com/microsoft/Microsoft-Rocketbox. Converted with `tools/rocketbox/convert.js` (bones renamed, textures atlased and downsized, 6 of 170 blendshapes kept) | MIT License, Copyright (c) 2020 Microsoft. Commercial use, modification and redistribution allowed; keep the copyright and permission notice (reproduced below) |

Microsoft Rocketbox licence notice (MIT):

> Copyright (c) 2020 Microsoft
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

If the models fail to load, the game falls back to the original procedural primitive characters, so it always starts.

## Architecture

```
src/
  main.js        Bootstrap (async asset loading), render loop, state machine, hit-stop, lighting,
                 smoke-driven fog, dynamic resolution, post-processing hookup
  humans.js      glTF loading, world-space mocap retargeting, male mesh/atlas merge, CRS texture
                 recolour, garment recolour shaders, bone sockets, additive pose layer, finger grips
  impostors.js   Pose baking + vertex-cluster decimation + instanced far crowd with per-instance colours
  characters.js  Character API used by the game (build, items, poses, police gear); skinned path plus
                 the procedural fallback rig; outfit generator
  crowd.js       NPC state machines, perception and reaction delays, panic contagion, steering,
                 spatial hash, marching groups, LOD selection, background population
  effects.js     Particle systems (smoke/fire atlases), explosions, mortars, petrol fires, projectiles,
                 debris, fire lights
  events.js      Ambient incident scheduler (molotovs, mortars, volleys, flare-ups, car fires)
  post.js        Bloom, colour grade, vignette / grain
  world.js       Procedural Paris: buildings, streets, props, barricades, fires, puddles, colliders
  vehicles.js    Procedural cars (city car, hatchback, saloon, estate; burnt-out shells) and vans
                 (CRS, pompiers, SAMU, civilian): extruded profiles, wheel arches, glazing, trim
  brawls.js      Background street-fight set pieces
  player.js, camera.js, missions.js, hud.js, audio.js, input.js, textures.js
  levels.js      Level definitions (mission script, lighting preset, player start), lighting presets,
                 progression / unlocks
  level2.js      Level 2 mission script: sections, encounters, the Leader's first appearance, checkpoints
  level3.js      Level 3 mission script: acts and sections, the route choice, interactions, radio queue,
                 checkpoints, results
  district.js    The Level 3 district: streets, square, landmarks, its own shop fronts, built on first entry
  convoy.js      The transfer van: path following, stop rules, moving collider, integrity, breaches
  hazards.js     Level 3 hazards (cook-off car, petrol trail, scaffold, fireworks) and their crew actors
  encounters.js  Data-driven encounter runner (triggers, selection, resolution)
  boss.js        Boss state machine; the Enforcer, Leader and Fixer attack tables; fairness lint
  cinematic.js   Skippable camera sequences (shots, letterbox, name cards, subtitles)
  music.js       Synthesised score and stings (Levels 2 and 3: a theme per level, Level 3 builds by act)
  seed.js        ?seed=N: seeded Math.random for reproducible runs
  dev.js         Test helpers, loaded only with ?dev in the URL (with devtests.js and devtests3.js)
```

## Development and testing

Add `?dev` to the URL to load the test helpers (`src/dev.js`):

| Helper | What it does |
|---|---|
| `__start({ audio })` | Start playing (pass `{ audio: false }` for silent, reproducible runs) |
| `__step(seconds)` | Advance the simulation in fixed 1/60 s steps. From the first call the real-time loop only renders; `__live()` hands the simulation back |
| `__botRun(ms)` | Scripted bot that plays with the normal controls for up to `ms` of wall time; call repeatedly until `ended`. It skips cinematics with a key press unless `__bot.watch = true`. Its state is reset by every seeded `__start`; in Level 3 only, it also detours when it makes no progress towards its goal for 3 s (Levels 1 and 2 keep the bot their baselines were recorded with) |
| `__perf(frames)` | Average simulation and render cost per frame, draw calls and triangles summed over all post-processing passes, and the number of compiled shader programs |
| `__level(id, stage)` / `__jump(i)` | Switch level (ignores unlocks) / jump to a Level 2 section |
| `__unlock(id)` / `__resetProgress()` | Unlock a level / clear saved progress |
| `__auditAppearance({ seeds, level })` | Appearance audit for Level 1 or 2 (below) |
| `__boss(name)` / `__bossHit(from)` / `__lintBosses()` | Jump to the Enforcer or Leader fight / land a hit from the back or front through the real hit path / check the attack tables against the fairness rules |

| `__acts()` / `__pos()` / `__posHud(on)` | The level's acts or sections (jump with `__jump(i)`) / where the officer is (position, heading, area, act, camera distance) / the same, live, in a panel at the top |
| `__goto(x, z, deg)` / `__view(name)` | Put the officer somewhere, facing `deg` (0 = +z) / at a named viewpoint of the level (`__view()` lists them) |
| `__colliders(on, radius)` | Draw the collider boxes near the officer and the level bounds |
| `__navMap({ show })` | Flood fill from the level start at the officer's radius: reachable ground, ground reached outside the walk areas (a collision hole), unreachable walk areas (a closed-off pocket), landmarks reached; `show` overlays the map |
| `__walkRoute(name)` | Walk a route with the normal controls; reports stuck points, the closest camera distance and any frame with the camera inside a collider |
| `__npcNav(n, seconds)` | Send crowd agents to far points of the level; arrivals, progress, stuck agents, agents inside colliders or out of bounds |
| `__worldPerf({ frames })` | Frame cost, draw calls and triangles at each named viewpoint |

URL shortcuts: `?dev&level=2` starts in Level 2, and `?dev&level=2&stage=3` starts at its fourth section. `?dev&level=3` starts Level 3 (ignoring the unlock); `&stage=0-3` picks the act, `&stage=fixer` (or `__boss('fixer')`) starts the Fixer's fight, `&route=A|B` (or `__route('B')`) the route the bot takes, and `game.missions.jumpToSection(n)` any of its six sections. `?seed=N` makes a run reproducible: with `__start({ audio: false })` and `__step` / `__botRun`, a whole playthrough replays identically. To make that hold, the simulation never runs on wall-clock time: staggered effects use game-time timers, the menu's background simulation is frozen in seeded runs, and the dynamic-resolution system leaves crowd detail alone while the harness steps the game.

**Appearance audit.** For each seed the crowd gets freshly generated appearances from the real generator. The real selection code then runs: in Level 1 the aggressors, surges, bombers, the Rue de Malte ambush, ambient threats and the final wave; in Level 2 every street encounter through the encounter runner. Each selected character is compared with the pool it was drawn from. The markers are keffiyehs, Algeria and PSG shirts, headscarves, face coverings, balaclavas, hi-vis vests, smart clothes, carried flags, gender and complexion. A marker is flagged when its rate among selected characters differs from the pool's by more than chance allows (z-test, Bonferroni-corrected over all markers, familywise alpha 0.05). A pass means no skew larger than the reported minimum detectable difference was found; it is a screening check, not a proof of independence. Appearance markers decide the verdict. Carried flags are reported separately as props of the demonstrating activity: Level 2 deliberately sends the looting crews, who carry no flags, so flag carriers are under-represented among its attackers (about 2% against 15% in the pool). A built-in self-test runs the same statistic on a deliberately biased selector to show that it detects skew. The audit also compares marker rates across roles and confirms that no outfit changes when someone turns hostile.

Baseline results for Level 1 from before the Level 2 work are kept in `tools/baseline/`.

## Known limitations

- There are still three base meshes. Garment layers, blendshapes and accessories make silhouettes vary, but faces repeat on close inspection: one male face (with varied skin tone, beard and hair) and one female face.
- **The female model ships with a printed face covering in its texture**, so her generated jaw movement is barely visible. Proper female facial animation needs a different female base model with an exposed, rigged face.
- Garment layers are generated shells, so very tight poses can show slight clipping at the elbows and armpits.
- The male model's clothing is a waistcoat and shirt outfit, so football shirts read as shirt-and-jacket.
- Facial animation is absent.
- Combat, throwing and knockdown motions are procedural layers over mocap rather than dedicated mocap clips.
- The CRS armour is based on a stylised sci-fi trooper mesh.
- Smoke is billboard-based (no volumetric lighting or soft depth intersection), and the transparent particles are unsorted.
- Characters on the far LOD don't hold their items.
- NPC steering is local (no navmesh). Agents can briefly bunch up behind wrecked cars before detouring, and an attacker can stay pinned against a long obstacle (the Avenue's roadblock barricade, two parked cars nose to tail) while pursuing the officer on the other side. The group then stays "still fighting" until the officer walks round to him (the marker points at him).
- Seeded runs reproduce exactly from a fresh page load. A second seeded run on the same page does not: characters' blink and eye-movement timers carry over and draw on the same random stream. Gameplay is unaffected.
- On phones the BAR / GAS counters overlap the ENDURANCE label in the bars column (cosmetic).
- The first-play controls briefing describes Boulevard de la République even when the first level played is Level 3.
- Mixamo assets may be used inside games, but on the web the `.glb` files are technically downloadable from the hosting site. Check that this fits your use, and especially the Ready Player Me avatar's terms, before a commercial release.
- The automated playthrough uses a scripted bot, so how it feels to a human player (difficulty, mouse sensitivity) still needs a hands-on pass.

## Notes

- `window.game` is exposed for debugging in the browser console.
- If pointer lock is unavailable (for example inside an iframe), use the arrow keys to turn the camera.
