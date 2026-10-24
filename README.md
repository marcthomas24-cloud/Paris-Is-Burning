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
| Mouse | Rotate the camera (pointer lock). Arrow keys also work |
| Left mouse | Baton strike: wind-up, strike, then recovery, with a cooldown |
| Right mouse (hold) | Shield stance. Blocks frontal hits and projectiles, and lets you push through crowds |
| Space | Dodge / quick step (brief invulnerability) |
| E | Arrest a downed aggressor, or extract the officers at the objective |
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

**Scoring:**
- Threat neutralised: +100
- Arrest: +150
- Petrol bomb prevented: +400
- Phase bonuses: +500 / +600 / +1000
- Time bonus
- No peaceful demonstrators struck: +500
- Striking a demonstrator who isn't a threat: −150

## Levels

**Level 1** is the mission described above. Completing it unlocks **Level 2 · Nuit** on that device (saved in `localStorage`; a CONTINUE button appears on the results screen and a LEVEL 2 button on the main menu).

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

**Lighting presets** (`src/levels.js`): `dusk` (Level 1) and `night` (Level 2). A preset only changes light colours and intensities, fog, sky uniforms, lamp glow and exposure. It never adds or removes lights, so switching does not compile new shaders.

## Fairness rule

Who becomes aggressive is chosen at random from the crowd, independently of clothing, flags or appearance. Everyone on the street (demonstrators, looting crews and passers-by) is dressed from one shared clothing pool, so nothing a character wears says anything about their role, and becoming hostile never changes how someone looks. Threats are identified **only by behaviour**. While someone is acting violently (pursuing, punching, shoving, throwing, preparing a device), they show a red ground ring and a red minimap blip. Peaceful demonstrators keep chanting, filming and waving flags unless something credible happens near them, such as a strike, an explosion or a projectile.

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

The same far system draws about 300 background people beyond the police cordons and at the end of the boulevard. In total there are 150 AI agents (at most 20 fully rigged at once, dropping to 12 automatically on slower GPUs) plus about 560 background people. Bystanders and photographers stand on the pavements, and CRS squads hold the line and the vans. Marching groups move along the boulevard and slow down at bottlenecks.

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
  world.js       Procedural Paris: buildings, streets, props, vehicles (CRS, pompiers, SAMU),
                 barricades, fires, puddles, colliders
  player.js, camera.js, missions.js, hud.js, audio.js, input.js, textures.js
  levels.js      Level definitions (mission script, lighting preset, player start), lighting presets,
                 progression / unlocks
  level2.js      Level 2 mission script: sections, encounters, the Leader's first appearance, checkpoints
  encounters.js  Data-driven encounter runner (triggers, selection, resolution)
  boss.js        Boss state machine and the Enforcer / Leader attack tables; fairness lint
  cinematic.js   Skippable camera sequences (shots, letterbox, name cards, subtitles)
  music.js       Synthesised score and stings (Level 2)
  seed.js        ?seed=N: seeded Math.random for reproducible runs
  dev.js         Test helpers, loaded only with ?dev in the URL
```

## Development and testing

Add `?dev` to the URL to load the test helpers (`src/dev.js`):

| Helper | What it does |
|---|---|
| `__start({ audio })` | Start playing (pass `{ audio: false }` for silent, reproducible runs) |
| `__step(seconds)` | Advance the simulation in fixed 1/60 s steps. From the first call the real-time loop only renders; `__live()` hands the simulation back |
| `__botRun(ms)` | Scripted bot that plays with the normal controls for up to `ms` of wall time; call repeatedly until `ended`. It skips cinematics with a key press unless `__bot.watch = true` |
| `__perf(frames)` | Average simulation and render cost per frame, draw calls and triangles summed over all post-processing passes, and the number of compiled shader programs |
| `__level(id, stage)` / `__jump(i)` | Switch level (ignores unlocks) / jump to a Level 2 section |
| `__unlock(id)` / `__resetProgress()` | Unlock a level / clear saved progress |
| `__auditAppearance({ seeds, level })` | Appearance audit for Level 1 or 2 (below) |
| `__boss(name)` / `__bossHit(from)` / `__lintBosses()` | Jump to the Enforcer or Leader fight / land a hit from the back or front through the real hit path / check the attack tables against the fairness rules |

URL shortcuts: `?dev&level=2` starts in Level 2, and `?dev&level=2&stage=3` starts at its fourth section. `?seed=N` makes a run reproducible: with `__start({ audio: false })` and `__step` / `__botRun`, a whole playthrough replays identically. To make that hold, the simulation never runs on wall-clock time: staggered effects use game-time timers, the menu's background simulation is frozen in seeded runs, and the dynamic-resolution system leaves crowd detail alone while the harness steps the game.

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
- NPC steering is local (no navmesh). Agents can briefly bunch up behind wrecked cars before detouring.
- Mixamo assets may be used inside games, but on the web the `.glb` files are technically downloadable from the hosting site. Check that this fits your use, and especially the Ready Player Me avatar's terms, before a commercial release.
- The automated playthrough uses a scripted bot, so how it feels to a human player (difficulty, mouse sensitivity) still needs a hands-on pass.

## Notes

- `window.game` is exposed for debugging in the browser console.
- If pointer lock is unavailable (for example inside an iframe), use the arrow keys to turn the camera.
