# Paris Burning — Level 2 review bundle

Branch `level2`, commit f6db7f8. Three.js browser game. Level 2 was added in increments 1–4 on top of commit d2ea7d4.

## Commits

```
f6db7f8 Level 2 increment 4: cinematic presentation and synthesised audio
f5836a6 Record the charge wall-stun test in the increment 3 results
7fcfa59 Level 2 increment 3: Enforcer and Leader boss mechanics (grey-box)
113d054 Level 2 increment 2: street encounters, shield-carriers, checkpoints
9eb4724 Level 2 increment 1: level foundation, night preset, crowd audit fixes
```

## README.md

````markdown
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

````

## index.html

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <title>Paris Burning</title>
  <link rel="stylesheet" href="/src/style.css" />
</head>
<body>
  <div id="app">
    <canvas id="game"></canvas>

    <!-- In-game HUD -->
    <div id="hud" class="hidden">
      <div id="vignette"></div>
      <div id="hitflash"></div>

      <div id="objective" class="panel">
        <div class="mission-title"><span id="phase-name">PHASE 1 · STREET ENTRY</span> <span id="mission-progress">1 / 3</span></div>
        <div id="progress-pips"><span></span><span></span><span></span></div>
        <div id="objective-text">Hold the police line</div>
        <div id="incident-status"><span class="chip">ACTIVE</span><span id="incident-detail"></span></div>
        <div id="incident-bar"><div></div></div>
      </div>

      <div id="compass"><div id="compass-strip"></div><div id="compass-marker"></div><div id="compass-tick"></div></div>

      <div id="score-panel" class="panel">
        <div class="label">SCORE</div>
        <div id="score">0</div>
        <div id="score-pop"></div>
      </div>

      <div id="bottom-left">
        <canvas id="minimap" width="200" height="200"></canvas>
        <div class="bar-row"><div class="bar-label">SANTÉ</div><div id="health-bar" class="bar"><div></div></div></div>
        <div class="bar-row"><div class="bar-label">ENDURANCE</div><div id="stamina-bar" class="bar thin"><div></div></div></div>
      </div>

      <div id="controls-hint" class="panel">
        <div><b>WASD</b> move · <b>Shift</b> sprint · <b>Space</b> dodge</div>
        <div><b>LMB</b> baton · <b>RMB</b> shield · <b>E</b> interact / arrest</div>
        <div><b>Esc</b> pause · <b>H</b> hide hints</div>
      </div>

      <div id="alerts"></div>
      <div id="prompt" class="hidden"></div>
      <div id="crosshair"></div>
      <div id="offscreen-arrow"></div>
      <div id="threat-warning" class="hidden">⚠ PETROL BOMB</div>
      <div id="title-card"><div class="tc-title"></div><div class="tc-sub"></div></div>
      <div id="banner"><div class="bn-title"></div><div class="bn-sub"></div></div>
      <div id="boss-bar" class="hidden"><div class="boss-name"><span id="boss-name"></span><span id="boss-sub"></span></div><div id="boss-hp"><div class="chip"></div><div class="fill"></div></div><div id="boss-state"></div></div>

      <div id="hud-buttons">
        <button data-action="mute" id="hud-mute" class="hud-btn" aria-label="Mute sound" aria-pressed="false"><span class="ico-on">🔊</span><span class="ico-off">🔇</span></button>
        <button data-action="pause" class="hud-btn" aria-label="Pause">❚❚</button>
      </div>

      <!-- Touch controls (shown on touch screens only) -->
      <div id="touch-ui">
        <div id="stick-base"><div id="stick-knob"></div></div>
        <div id="touch-buttons">
          <button data-k="ShiftLeft" class="tb toggle" id="tb-sprint" aria-label="Sprint (toggle)">SPRINT</button>
          <button data-k="Space" class="tb" id="tb-dodge" aria-label="Dodge">DODGE</button>
          <button data-k="Mouse2" class="tb" id="tb-shield" aria-label="Shield (hold)">SHIELD</button>
          <button data-k="Mouse0" class="tb" id="tb-strike" aria-label="Baton strike">STRIKE</button>
        </div>
      </div>
    </div>

    <!-- Onboarding -->
    <div id="onboarding" class="hidden">
      <div class="ob-title">BRIEFING</div>
      <p>You are a CRS officer on Boulevard de la République. Most demonstrators are peaceful.
         Only act against individuals who are <b class="red">actively aggressive</b> — they are marked with a red ring and red minimap blip.</p>
      <div class="ob-grid touch-only">
        <div><b>Left thumb</b><span>Move</span></div>
        <div><b>Right drag</b><span>Camera</span></div>
        <div><b>STRIKE</b><span>Baton</span></div>
        <div><b>SHIELD</b><span>Hold to block</span></div>
        <div><b>DODGE</b><span>Quick step</span></div>
        <div><b>SPRINT</b><span>Toggle</span></div>
        <div><b>Prompt</b><span>Tap to arrest</span></div>
        <div><b>❚❚</b><span>Pause</span></div>
      </div>
      <div class="ob-grid desk-only">
        <div><b>WASD</b><span>Move</span></div>
        <div><b>Mouse</b><span>Camera</span></div>
        <div><b>Shift</b><span>Sprint</span></div>
        <div><b>LMB</b><span>Baton strike</span></div>
        <div><b>RMB</b><span>Shield stance</span></div>
        <div><b>Space</b><span>Dodge</span></div>
        <div><b>E</b><span>Arrest / respond</span></div>
        <div><b>Esc</b><span>Pause</span></div>
      </div>
      <p class="dim">Striking peaceful demonstrators costs points. Arrest downed aggressors <span class="desk-only">with E</span><span class="touch-only">by tapping the prompt</span>.</p>
      <div class="dim small"><span class="desk-only">Click</span><span class="touch-only">Tap</span> to begin</div>
    </div>

    <!-- Cinematic overlay: letterbox, name card, subtitle, skip hint -->
    <div id="cine" class="hidden">
      <div class="cine-bar top"></div><div class="cine-bar bottom"></div>
      <div id="cine-card"><div id="cine-title"></div><div id="cine-sub"></div></div>
      <div id="cine-line"></div>
      <div id="cine-skip"><span class="desk-only">SPACE / CLICK</span><span class="touch-only">TAP</span> TO SKIP</div>
    </div>

    <!-- Menus -->
    <div id="menu" class="screen">
      <div class="menu-inner">
        <div class="logo"><span>PARIS</span><span class="accent">BURNING</span></div>
        <div class="tag">Boulevard de la République · 18h47</div>
        <div class="menu-buttons">
          <button data-action="play" class="primary">PLAY</button>
          <button data-action="level" data-level="2" class="hidden">LEVEL 2 · NUIT</button>
          <button data-action="controls">CONTROLS</button>
          <button data-action="audio">AUDIO</button>
          <button data-action="restart">RESTART</button>
        </div>
        <div id="loading" class="dim small">Building the city…</div>
        <div id="rotate-hint" class="dim small">Best played in landscape — rotate your device.</div>
      </div>
    </div>

    <div id="controls-screen" class="screen hidden">
      <div class="menu-inner">
        <h2>CONTROLS</h2>
        <table class="ctrl-table">
          <tr><td>W A S D</td><td>Move (camera relative)</td></tr>
          <tr><td>Shift</td><td>Sprint (uses stamina)</td></tr>
          <tr><td>Mouse</td><td>Rotate camera (arrow keys also work)</td></tr>
          <tr><td>Left mouse</td><td>Baton strike — wind-up, strike, recovery</td></tr>
          <tr><td>Right mouse (hold)</td><td>Shield stance — blocks frontal hits &amp; projectiles, push through crowds</td></tr>
          <tr><td>Space</td><td>Dodge / quick step</td></tr>
          <tr><td>E</td><td>Arrest a downed aggressor · respond to incident</td></tr>
          <tr><td>H</td><td>Toggle control hints</td></tr>
          <tr><td>M</td><td>Mute / unmute sound</td></tr>
          <tr><td>Esc</td><td>Pause</td></tr>
        </table>
        <p class="dim touch-only">Touch: drag on the left of the screen to move, drag on the right to look. STRIKE, SHIELD (hold), DODGE and SPRINT (toggle) are bottom right; tap the on-screen prompt to arrest or respond.</p>
        <p class="dim">Threats are determined by behaviour, never appearance. Aggressors show a red ring when acting violently.</p>
        <p class="dim small credits">Sound recordings via Wikimedia Commons: French sirens by Manotechnologie (CC BY-SA 4.0) · protest chanting by Hardouin (CC BY 3.0) · football crowd by Torsten Nilsson and bonfire by Werstas, Work With Sounds (CC BY 4.0) · glass breaking and punches by Gravity Sound (CC BY 4.0) · call to prayer by Fraguando (CC BY-SA 4.0) · metal clanging by Camshaft64 (CC BY-SA 4.0) · "Bobbypfeife" by Christoph Waghubinger (CC BY-SA 3.0 AT) · crowds by eguobyte and unfa, referee whistle by SpliceSound (CC0) · street, fireworks, fire, helicopter, yelling, explosions and grunts by cori, ezwa, stephan, tcpp, Fg2 and stilgar (public domain). Impact sounds by Kenney (CC0). Characters: Mixamo (Adobe), Ready Player Me, Microsoft Rocketbox.</p>
        <div class="menu-buttons"><button data-action="back" class="primary">BACK</button></div>
      </div>
    </div>

    <div id="audio-screen" class="screen hidden">
      <div class="menu-inner">
        <h2>AUDIO</h2>
        <div class="audio-settings">
          <label for="vol-master">Master</label><input type="range" id="vol-master" min="0" max="100" step="1" /><output id="vol-master-out" for="vol-master"></output>
          <label for="vol-ambience">Ambience</label><input type="range" id="vol-ambience" min="0" max="100" step="1" /><output id="vol-ambience-out" for="vol-ambience"></output>
          <label for="vol-effects">Effects</label><input type="range" id="vol-effects" min="0" max="100" step="1" /><output id="vol-effects-out" for="vol-effects"></output>
          <label for="vol-music">Music</label><input type="range" id="vol-music" min="0" max="100" step="1" /><output id="vol-music-out" for="vol-music"></output>
          <label for="vol-mute">Mute</label><input type="checkbox" id="vol-mute" /><span class="dim small desk-only">M key</span>
        </div>
        <p class="dim small">Settings are saved on this device.</p>
        <div class="menu-buttons"><button data-action="back" class="primary">BACK</button></div>
      </div>
    </div>

    <div id="pause-screen" class="screen hidden">
      <div class="menu-inner">
        <h2>PAUSED</h2>
        <div class="menu-buttons">
          <button data-action="resume" class="primary">RESUME</button>
          <button data-action="audio">AUDIO</button>
          <button data-action="controls">CONTROLS</button>
          <button data-action="restart">RESTART</button>
        </div>
      </div>
    </div>

    <div id="end-screen" class="screen hidden">
      <div class="menu-inner">
        <h2 id="end-title">MISSION COMPLETE</h2>
        <div id="end-sub" class="tag"></div>
        <div id="end-stats"></div>
        <div class="menu-buttons">
          <button data-action="continue" id="btn-continue" class="primary hidden">CONTINUE · LEVEL 2</button>
          <button data-action="retry" id="btn-retry" class="primary hidden">RETRY SECTION</button>
          <button data-action="restart" class="primary">RESTART</button>
        </div>
      </div>
    </div>
  </div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>

```

## src/audio.js

```js
// Riot soundscape (Web Audio API).
//
// Signal flow:
//   one-shots, beds -> ambience | effects bus -> game bus (pause / hidden-tab fade)
//   -> master (volume, mute) -> limiter -> speakers.  UI clicks skip the game bus,
//   so the pause menu still clicks. A shared street reverb gives distant sounds space.
//
// Openly licensed recordings in public/assets/audio/ (credited in the README and on
// the Controls screen) carry the soundscape. A few synthesised layers fill the gaps
// (whooshes, sub-bass, alarms), and stand in when a file fails to load or decode, so
// the game never depends on an audio file.
//
// Every layer is driven from update() (no free-running timers), so pausing stops
// new sounds and nothing piles up while the game is paused or the tab is hidden.

import { Music } from './music.js';

const R = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const FILES = {
  crowdA: 'crowd_large.mp3', crowdB: 'crowd_murmur.mp3', yell: 'crowd_yelling.mp3',
  chant: 'chant_protest.mp3', chantB: 'chant_stadium.mp3',
  street: 'street_city.mp3', fwFar: 'fireworks_far.mp3', fwStreet: 'fireworks_street.mp3',
  heli: 'helicopter.mp3', fire: 'fire_loop.mp3', adhan: 'adhan.mp3',
  sirenPolice: 'siren_police.wav', sirenGend: 'siren_gendarmerie.wav', sirenPompiers: 'siren_pompiers.wav',
  whistle: 'whistles.mp3', glass: 'glass.mp3', boom: 'explosions.mp3', punch: 'impact_body.mp3',
  shield: 'impact_shield.mp3', metal: 'impact_metal.mp3', stone: 'impact_stone.mp3',
  step: 'footsteps.mp3', grunt: 'grunts.mp3',
};
// Sprite sheets: equal slots of this many seconds, each sound starting ~50 ms in.
const SLOT = { whistle: 3, glass: 2.5, boom: 3, punch: 0.6, shield: 0.8, metal: 1.2, stone: 0.6, step: 0.4, grunt: 1.2 };

// Concurrency per category: [max simultaneous, base priority]. A new sound only
// replaces a playing one of lower (audibility-weighted, age-decayed) priority.
const CATS = {
  boom: [3, 10], impact: [5, 8], swing: [2, 6], step: [2, 3], glass: [3, 5], crash: [2, 4],
  shout: [2, 2], scream: [3, 4], whistle: [1, 2], chant: [1, 3], roar: [1, 4], fw: [3, 3], alarm: [2, 2], misc: [4, 3],
};
const MAX_VOICES = 22;

const SETTINGS_KEY = 'parisBurning.audio.v1';
const DEFAULTS = { master: 0.8, ambience: 0.8, effects: 0.9, music: 0.7, muted: false };

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (s && typeof s === 'object') {
      const out = { ...DEFAULTS };
      for (const k of ['master', 'ambience', 'effects', 'music']) if (Number.isFinite(s[k])) out[k] = clamp(s[k], 0, 1);
      out.muted = !!s.muted;
      return out;
    }
  } catch (e) { /* storage blocked: defaults */ }
  return { ...DEFAULTS };
}

// A continuous layer made of overlapping, randomly chosen windows of one or more
// recordings with crossfades, so a 40 s file never audibly loops.
class Bed {
  constructor(audio, keys, dest, o = {}) {
    this.a = audio; this.keys = keys; this.o = { win: [7, 13], xf: 2.5, rate: [0.97, 1.03], ...o };
    const c = audio.ctx;
    this.out = c.createGain(); this.out.gain.value = o.gain ?? 1;
    let head = this.out;
    if (o.lp) { this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = o.lp; head.connect(this.lp); head = this.lp; }
    if (o.pan !== undefined && c.createStereoPanner) { this.pan = c.createStereoPanner(); this.pan.pan.value = o.pan; head.connect(this.pan); head = this.pan; }
    head.connect(dest);
    if (o.send && audio.verbIn) { this.send = c.createGain(); this.send.gain.value = o.send; head.connect(this.send).connect(audio.verbIn); }
    this.next = 0;
  }
  available() { return this.keys.some((k) => this.a.samples[k]); }
  update(now) {
    if (now < this.next - 0.08) return;
    const bufs = this.keys.map((k) => this.a.samples[k]).filter(Boolean);
    if (!bufs.length) return;
    const c = this.a.ctx, buf = pick(bufs), o = this.o;
    const rate = R(o.rate[0], o.rate[1]);
    const win = Math.min(R(o.win[0], o.win[1]), buf.duration / rate - 0.2);
    const xf = Math.min(o.xf, win / 2.5);
    const t = Math.max(now + 0.02, this.next);
    const off = R(0, Math.max(0, buf.duration - win * rate - 0.1));
    const s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + xf);
    g.gain.setValueAtTime(1, t + win - xf); g.gain.linearRampToValueAtTime(0, t + win);
    s.connect(g).connect(this.out);
    s.start(t, off, win * rate + 0.05);
    s.onended = () => { s.disconnect(); g.disconnect(); };
    this.next = t + win - xf;
  }
  level(v, tc = 0.6) { this.out.gain.setTargetAtTime(v, this.a.ctx.currentTime, tc); }
}

export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.paused = false;
    this.listener = { x: 0, z: 0, yaw: 0 };
    this.crowdLevel = 0.5; this.crowdSmooth = 0.5;
    this.intensity = 0;
    this.samples = {};
    this.voices = [];
    this.vehicles = [];
    this.alarms = [];
    this.pending = [];     // deferred one-shots {t, fn} run from update()
    this.music = new Music(this);
    this.recentBooms = [];
    this.lastSlot = {};
    this.settings = loadSettings();
    this.onSettings = null;
    this.fetches = null;
    this.loaded = false;
    document.addEventListener('visibilitychange', () => this._visibility());
    // iOS / Chrome may suspend or "interrupt" the context: any later gesture resumes it
    const unlock = () => { if (this.ctx && this.ctx.state !== 'running' && !document.hidden) this.ctx.resume().catch(() => {}); };
    for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, unlock, { capture: true, passive: true });
  }

  // ------------------------------------------------------------ loading
  // Start downloading early (no AudioContext needed); decoding waits for init().
  prefetch(base = 'assets/audio/') {
    if (this.fetches) return;
    this.fetches = {};
    for (const [k, f] of Object.entries(FILES)) {
      this.fetches[k] = fetch(base + f)
        .then((r) => {
          // an SPA fallback page served for a missing file is not audio
          if (!r.ok || (r.headers.get('content-type') || '').includes('text/html')) throw new Error('missing (HTTP ' + r.status + ')');
          return r.arrayBuffer();
        })
        .catch((e) => { console.warn('audio file unavailable, using fallback:', f, e.message || e); return null; });
    }
  }

  async _decodeAll() {
    const c = this.ctx;
    const decode = (buf) => new Promise((res, rej) => { const p = c.decodeAudioData(buf, res, rej); if (p && p.then) p.then(res, rej); });
    await Promise.all(Object.entries(this.fetches).map(async ([k, p]) => {
      const data = await p;
      if (!data) return;
      // the call to prayer is long and rare: decoded only when it plays, then released
      if (k === 'adhan') { this.adhanData = data; return; }
      try { this.samples[k] = await decode(data); } catch (e) { console.warn('audio decode failed, using fallback:', FILES[k], e && (e.message || e)); }
    }));
    this.loaded = true;
    // recordings that did not arrive get a quiet synthesised stand-in
    if (!this.samples.crowdA && !this.samples.crowdB) this._fallbackCrowd();
    if (!this.samples.fire) this._fallbackCrackle();
  }

  // ------------------------------------------------------------ setup
  // Must be called from a user gesture. Safe to call repeatedly: only the first
  // call builds anything, later calls just resume a suspended context.
  init() {
    if (this.ctx) { this._resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn('Web Audio unavailable: playing without sound'); return; }
    // touch devices run at 32 kHz: decoded recordings take a third less memory
    const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
    try { this.ctx = new AC({ latencyHint: 'interactive', ...(touch ? { sampleRate: 32000 } : {}) }); } catch (e) {
      try { this.ctx = new AC(); } catch (e2) { console.warn('No Web Audio', e2); return; }
    }
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
    const c = this.ctx;
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -5; this.limiter.knee.value = 3; this.limiter.ratio.value = 16;
    this.limiter.attack.value = 0.003; this.limiter.release.value = 0.2;
    // fixed makeup gain: the recordings are normalised conservatively, the limiter catches peaks
    this.master = c.createGain(); this.makeup = c.createGain(); this.makeup.gain.value = 2.2;
    this.master.connect(this.makeup).connect(this.limiter).connect(c.destination);
    this.game = c.createGain(); this.game.gain.value = this.paused || document.hidden ? 0 : 1; this.game.connect(this.master);
    this.uiBus = c.createGain(); this.uiBus.connect(this.master);
    this.ambVol = c.createGain(); this.duck = c.createGain();
    this.ambVol.connect(this.duck).connect(this.game);
    this.sfxVol = c.createGain(); this.sfxVol.connect(this.game);
    this.musicVol = c.createGain(); this.musicVol.connect(this.game); // music bus (music.js)
    this.amb = this.ambVol; this.sfx = this.sfxVol;
    this._applySettings(true);
    this._makeNoise();
    this._makeVerb();
    this.enabled = true;
    this._resume();
    this.prefetch();
    this.loading = this._decodeAll();
    this._startLayers();
    c.onstatechange = () => { if (c.state !== 'running' && !document.hidden) this._resume(); };
  }

  _resume() {
    if (this.ctx && this.ctx.state !== 'running' && !document.hidden) this.ctx.resume().catch(() => {});
  }

  _makeNoise() {
    const c = this.ctx, len = c.sampleRate * 2;
    this.white = c.createBuffer(1, len, c.sampleRate);
    this.brown = c.createBuffer(1, len, c.sampleRate);
    const w = this.white.getChannelData(0), b = this.brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { w[i] = Math.random() * 2 - 1; last = (last + 0.02 * w[i]) / 1.02; b[i] = last * 3.5; }
  }

  // street reverb: decaying, darkening stereo noise impulse (façades and side streets)
  _makeVerb() {
    const c = this.ctx, sr = c.sampleRate, len = Math.floor(sr * 2.2);
    const ir = c.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const k = 0.35 + 0.6 * Math.min(1, t / 1.2); // darker as it decays
        lp += (Math.random() * 2 - 1 - lp) * (1 - k);
        d[i] = lp * Math.exp(-t * 2.6) * (t < 0.012 ? t / 0.012 : 1);
      }
    }
    this.verb = c.createConvolver(); this.verb.buffer = ir;
    this.verbIn = c.createGain(); this.verbIn.gain.value = 1;
    const ret = c.createGain(); ret.gain.value = 0.32;
    this.verbIn.connect(this.verb).connect(ret).connect(this.game);
  }

  _startLayers() {
    const c = this.ctx;
    // crowd: a large recorded crowd and a closer murmur, both windowed
    // (mono recordings panned apart so the crowd surrounds the listener)
    this.crowdBedA = new Bed(this, ['crowdA'], this.amb, { win: [8, 14], xf: 3, gain: 0.55, lp: 4000, pan: -0.3 });
    this.crowdBedB = new Bed(this, ['crowdB'], this.amb, { win: [7, 12], xf: 3, gain: 0.3, lp: 3000, pan: 0.35 });
    this.streetBed = new Bed(this, ['street'], this.amb, { win: [10, 16], xf: 3.5, gain: 0.22, lp: 2500 });
    this.fwBed = new Bed(this, ['fwFar'], this.amb, { win: [8, 14], xf: 3, gain: 0.22, lp: 3000, send: 0.4 });
    this.heliBed = new Bed(this, ['heli'], this.amb, { win: [8, 12], xf: 3, gain: 0, lp: 2200, pan: 0, send: 0.3 });
    this.heli = { a: Math.random() * 6.28, r: 90, on: false, t: R(20, 40) };
    // three positional fire voices follow the nearest fires
    this.fireVoices = [0, 1, 2].map(() => {
      const bed = new Bed(this, ['fire'], this.amb, { win: [5, 9], xf: 1.5, gain: 0, lp: 6000, pan: 0, rate: [0.9, 1.1] });
      return { bed, src: null };
    });
    // idle engine of the nearest police van (deep, filtered)
    const eng = c.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 42;
    const ef = c.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 90;
    this.engineGain = c.createGain(); this.engineGain.gain.value = 0;
    eng.connect(ef).connect(this.engineGain).connect(this.amb); eng.start();
    // event layers: seconds until the next one
    this.t = { shout: R(2, 4), whistle: R(6, 12), chant: R(5, 9), bang: R(3, 7), boom: R(10, 18), crash: R(5, 10), siren: R(1, 3), adhan: R(55, 95) };
    this.chantVoice = null; this.adhanVoice = null;
  }

  _fallbackCrowd() {
    const c = this.ctx;
    const mk = (freq, q, vol, rate) => {
      const src = c.createBufferSource(); src.buffer = this.brown; src.loop = true; src.playbackRate.value = rate;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
      const g = c.createGain(); g.gain.value = vol;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.1 + Math.random() * 0.15;
      const lg = c.createGain(); lg.gain.value = vol * 0.35;
      lfo.connect(lg).connect(g.gain); lfo.start();
      src.connect(bp).connect(g).connect(this.amb); src.start();
    };
    mk(380, 0.8, 0.22, 1); mk(1000, 1.1, 0.08, 1.3);
  }

  _fallbackCrackle() {
    const c = this.ctx;
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() < 0.0012 ? (Math.random() * 2 - 1) * 0.7 : 0) + (Math.random() * 2 - 1) * 0.03;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
    this.crackle = c.createGain(); this.crackle.gain.value = 0;
    src.connect(hp).connect(this.crackle).connect(this.amb); src.start();
  }

  // ------------------------------------------------------------ settings
  getSettings() { return { ...this.settings }; }

  setSetting(key, value) {
    if (key === 'muted') this.settings.muted = !!value;
    else if (key in DEFAULTS) this.settings[key] = clamp(+value || 0, 0, 1);
    this._applySettings();
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch (e) { /* storage blocked */ }
    if (this.onSettings) this.onSettings(this.getSettings());
  }

  toggleMute() { this.setSetting('muted', !this.settings.muted); return this.settings.muted; }

  _applySettings(immediate = false) {
    if (!this.ctx) return;
    const s = this.settings, t = this.ctx.currentTime;
    const curve = (v) => v * v; // perceptual taper
    const set = (p, v) => { p.cancelScheduledValues(t); if (immediate) p.setValueAtTime(v, t); else p.setTargetAtTime(v, t, 0.03); };
    set(this.master.gain, s.muted ? 0 : curve(s.master));
    set(this.ambVol.gain, curve(s.ambience));
    set(this.sfxVol.gain, curve(s.effects));
    set(this.musicVol.gain, curve(s.music));
    set(this.uiBus.gain, curve(s.effects) * 0.7);
  }

  // ------------------------------------------------------------ pause / visibility
  setPaused(p) {
    this.paused = p;
    if (!this.enabled) return;
    this._gameFade(p || document.hidden ? 0 : 1, p ? 0.12 : 0.3);
  }

  _gameFade(v, tc) {
    const t = this.ctx.currentTime, g = this.game.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.setTargetAtTime(v, t, tc);
  }

  _visibility() {
    if (!this.enabled) return;
    if (document.hidden) {
      this._gameFade(0, 0.05);
      clearTimeout(this._suspendT);
      this._suspendT = setTimeout(() => { if (document.hidden) this.ctx.suspend().catch(() => {}); }, 250);
    } else {
      clearTimeout(this._suspendT);
      this._resume();
      this._gameFade(this.paused ? 0 : 1, 0.3);
    }
  }

  // ------------------------------------------------------------ mixing helpers
  setListener(x, z, yaw) { this.listener.x = x; this.listener.z = z; this.listener.yaw = yaw; }

  // distance gain, stereo pan and air/building absorption for a world position
  _place(pos, ref = 6, max = 120) {
    if (!pos) return { d: 0, g: 1, pan: 0, lp: 20000 };
    const L = this.listener, dx = pos.x - L.x, dz = pos.z - L.z;
    const d = Math.hypot(dx, dz);
    const fade = clamp(1 - (d / max) ** 2, 0, 1);
    const g = (d <= ref ? 1 : ref / d) * fade;
    // camera right vector for yaw (forward = (-sin yaw, -cos yaw))
    const rx = Math.cos(L.yaw), rz = -Math.sin(L.yaw);
    const side = d > 0.01 ? (dx * rx + dz * rz) / d : 0;
    const pan = clamp(side * Math.min(1, d / 3), -1, 1) * 0.85;
    const lp = clamp(20000 * Math.exp(-d / 45), 700, 20000);
    return { d, g, pan, lp };
  }

  _prune(now) {
    for (let i = this.voices.length - 1; i >= 0; i--) {
      const v = this.voices[i];
      if (now > v.end) { for (const n of v.nodes) { try { n.disconnect(); } catch (e) { /* already */ } } this.voices.splice(i, 1); }
    }
  }

  _effPri(v, now) { return v.pri * (1 - 0.75 * clamp((now - v.t0) / v.len, 0, 1)); }

  // voice allocation with per-category and global limits; returns null when the
  // sound is inaudible or less important than everything already playing
  _admit(cat, level) {
    if (level < 0.004) return null;
    const now = this.ctx.currentTime;
    this._prune(now);
    const [max, base] = CATS[cat] || CATS.misc;
    const pri = base * level;
    const same = this.voices.filter((v) => v.cat === cat);
    const pool = same.length >= max ? same : this.voices.length >= MAX_VOICES ? this.voices : null;
    if (pool) {
      let victim = null, vp = Infinity;
      for (const v of pool) { const p = this._effPri(v, now); if (p < vp) { vp = p; victim = v; } }
      if (!victim || vp >= pri) return null;
      this._kill(victim, now);
    }
    const v = { cat, pri, t0: now, len: 1, end: now + 30, nodes: [], srcs: [] };
    this.voices.push(v);
    return v;
  }

  _kill(v, now) {
    const g = v.out.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + 0.05);
    for (const s of v.srcs) { try { s.stop(now + 0.06); } catch (e) { /* not started */ } }
    v.end = now + 0.08; v.pri = -1;
  }

  // Build a positioned one-shot. build(out, t, place, voice) adds sources and
  // returns the sound's length in seconds.
  _shot(cat, pos, vol, o, build) {
    if (!this.enabled || this.paused) return null;
    const c = this.ctx;
    const p = this._place(pos, o.ref ?? 6, o.max ?? 120);
    // reduced detail with distance: beyond o.far only a share (o.farKeep) of requests play
    if (o.far && p.d > o.far && Math.random() > (o.farKeep ?? 0.5)) return null;
    const level = vol * p.g;
    const v = this._admit(cat, level);
    if (!v) return null;
    const t = c.currentTime + 0.005 + (o.delay ? Math.min(0.45, p.d / 343) : 0);
    const out = c.createGain(); out.gain.value = level;
    v.out = out; v.nodes.push(out); v.t0 = t;
    let head = out;
    if (p.lp < 19000) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = p.lp; head.connect(f); head = f; v.nodes.push(f); }
    if (c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = p.pan; head.connect(pn); head = pn; v.nodes.push(pn); }
    head.connect(o.bus || this.sfx);
    const wet = o.verb ?? clamp(p.d / 160, 0, 0.6);
    if (wet > 0.02) { const s = c.createGain(); s.gain.value = wet; head.connect(s).connect(this.verbIn); v.nodes.push(s); }
    v.place = p;
    const len = build(out, t, p, v) || 0.5;
    v.len = len; v.end = t + len + 0.15;
    return v;
  }

  // play part of a buffer into dest with a short fade at either end
  _buf(v, dest, buf, t, { offset = 0, dur, rate = 1, gain = 1, fadeIn = 0.004, fadeOut = 0.04 } = {}) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const g = c.createGain();
    const len = Math.min(dur ?? Infinity, (buf.duration - offset) / rate);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + fadeIn);
    g.gain.setValueAtTime(gain, t + Math.max(fadeIn, len - fadeOut)); g.gain.linearRampToValueAtTime(0, t + len);
    s.connect(g).connect(dest);
    s.start(t, offset, len * rate + 0.02);
    v.srcs.push(s); v.nodes.push(s, g);
    return len;
  }

  // a random slot of a sprite sheet, never the same one twice in a row
  _sprite(name) {
    const buf = this.samples[name];
    if (!buf) return null;
    const slot = SLOT[name], n = Math.max(1, Math.floor(buf.duration / slot + 0.01));
    let k = Math.floor(Math.random() * n);
    if (n > 1 && k === this.lastSlot[name]) k = (k + 1 + Math.floor(Math.random() * (n - 1))) % n;
    this.lastSlot[name] = k;
    return { buf, off: k * slot, dur: slot };
  }

  _noise(v, dest, buffer, t, dur, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer; s.playbackRate.value = rate; s.loop = true;
    s.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    v.srcs.push(s); v.nodes.push(s);
    return s;
  }

  _env(param, t0, a, peak, d) {
    param.setValueAtTime(0.0001, t0);
    param.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    param.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  _gain(v, dest, value = 1) { const g = this.ctx.createGain(); g.gain.value = value; g.connect(dest); v.nodes.push(g); return g; }
  _filter(v, dest, type, freq, q = 0.7) { const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; f.connect(dest); v.nodes.push(f); return f; }

  // low sine thump (body of an impact or blast)
  _thud(v, dest, t, f0, f1, dur, peak) {
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain(); this._env(g.gain, t, 0.004, peak, dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
    v.srcs.push(o); v.nodes.push(o, g);
  }

  _duckAmbience(depth = 0.55, hold = 0.35) {
    const t = this.ctx.currentTime, g = this.duck.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(depth, t + 0.03); g.setTargetAtTime(1, t + hold, 0.7);
  }

  _later(delay, fn) { this.pending.push({ t: this.ctx.currentTime + delay, fn }); }

  // somewhere in the crowd, preferably at a given distance band
  _crowdPos(dMin, dMax) {
    const L = this.listener;
    if (this._randomCrowdPos) {
      for (let i = 0; i < 6; i++) {
        const p = this._randomCrowdPos();
        if (!p) break;
        const d = Math.hypot(p.x - L.x, p.z - L.z);
        if (d >= dMin && d <= dMax) return p;
      }
    }
    return this._aroundListener(dMin, dMax);
  }

  _aroundListener(rMin, rMax) {
    const L = this.listener, a = Math.random() * 6.28, r = R(rMin, rMax);
    return { x: clamp(L.x + Math.cos(a) * r * 0.3, -14, 14), z: L.z + Math.sin(a) * r };
  }

  // ------------------------------------------------------------ per-frame
  setCrowdLevel(level) { this.crowdLevel = clamp(level, 0, 1); }

  setEngineProximity(k) {
    if (!this.enabled) return;
    this.engineGain.gain.setTargetAtTime(k * 0.06, this.ctx.currentTime, 0.5);
  }

  // info: { intensity 0..1, fires: [{pos, k}] }
  update(dt, info = {}) {
    if (!this.enabled || this.paused) return;
    const c = this.ctx, now = c.currentTime;
    if (c.state !== 'running') return;
    this.intensity = info.intensity ?? this.intensity;
    this.music.update();
    this.crowdSmooth += (this.crowdLevel - this.crowdSmooth) * Math.min(1, dt * 0.8);
    const cl = this.crowdSmooth;

    // continuous beds
    this.crowdBedA.update(now); this.crowdBedB.update(now); this.streetBed.update(now); this.fwBed.update(now);
    this.crowdBedA.level(0.4 + cl * 0.3, 1.2);
    this.crowdBedB.level(0.12 + cl * 0.35, 1.2);
    if (this.crowdBedA.lp) this.crowdBedA.lp.frequency.setTargetAtTime(2600 + cl * 3500, now, 1.5);
    this._updateFires(now, info.fires || []);
    this._updateHeli(dt, now);

    // deferred one-shots
    for (let i = this.pending.length - 1; i >= 0; i--) if (now >= this.pending[i].t) { const p = this.pending.splice(i, 1)[0]; p.fn(); }

    // event layers
    const T = this.t, busy = 0.6 + cl * 0.8;
    for (const k in T) T[k] -= dt;
    if (T.shout <= 0) { T.shout = R(2.8, 7) / busy; this.shout(this._crowdPos(12, 60), true); }
    if (T.whistle <= 0) { T.whistle = R(9, 22); this.whistle(this._crowdPos(15, 70)); }
    if (T.chant <= 0) { T.chant = R(14, 30); this.chant(); }
    if (T.bang <= 0) { T.bang = R(4, 10); this.distantBang(); }
    if (T.boom <= 0) { T.boom = R(10, 22); this.distantBoom(); }
    if (T.crash <= 0) { T.crash = R(5, 12); this.ambientCrash(); }
    // the distant call to prayer belongs to the city's background, not to the fighting:
    // when its turn comes during a violent moment it waits for things to calm down
    if (T.adhan <= 0) { if (this.intensity > 0.45) T.adhan = R(20, 40); else { T.adhan = R(240, 420); this.adhan(); } }
    if (this.samples.adhan && this.adhanVoice && now > this.adhanVoice.end) { this.samples.adhan = null; this.adhanVoice = null; }
    this._updateSirens(dt, now);
    this._updateAlarms(now);
    this._prune(now);
  }

  _updateFires(now, fires) {
    const L = this.listener;
    const near = fires.map((f) => ({ f, d: Math.hypot(f.pos.x - L.x, f.pos.z - L.z) })).filter((e) => e.d < 45).sort((a, b) => a.d - b.d);
    if (this.crackle) { const e = near[0]; this.crackle.gain.setTargetAtTime(e ? 0.4 * Math.max(0, 1 - e.d / 14) : 0, now, 0.3); }
    this.fireVoices.forEach((fv, i) => {
      const e = near[i];
      if (!e) { fv.bed.level(0, 0.4); fv.src = null; return; }
      fv.bed.update(now);
      const p = this._place(e.f.pos, 3, 45);
      const k = clamp(e.f.k ?? 1, 0.3, 2);
      fv.bed.level(0.9 * p.g * k, fv.src === e.f ? 0.25 : 0.6);
      if (fv.bed.pan) fv.bed.pan.pan.setTargetAtTime(p.pan, now, 0.15);
      if (fv.bed.lp) fv.bed.lp.frequency.setTargetAtTime(Math.min(8000, p.lp), now, 0.3);
      fv.src = e.f;
    });
  }

  _updateHeli(dt, now) {
    const h = this.heli, L = this.listener;
    h.t -= dt;
    if (h.t <= 0) { h.on = !h.on; h.t = h.on ? R(40, 80) : R(30, 70); }
    h.a += dt * 0.06;
    const hx = L.x + Math.cos(h.a) * h.r, hz = L.z + Math.sin(h.a * 0.7) * h.r;
    const p = this._place({ x: hx, z: hz }, 60, 400);
    this.heliBed.update(now);
    this.heliBed.level(h.on ? 0.35 * p.g : 0, 3);
    if (this.heliBed.pan) this.heliBed.pan.pan.setTargetAtTime(p.pan, now, 0.5);
  }

  // French two-tone sirens on vehicles that drive past along the cross streets
  _updateSirens(dt, now) {
    const L = this.listener, T = this.t;
    const want = 1 + (this.intensity > 0.5 ? 2 : this.intensity > 0.2 ? 1 : 0);
    if (T.siren <= 0) { T.siren = R(6, 16); if (this.vehicles.length < want) this._spawnVehicle(); }
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      v.t += dt; v.x += v.vx * dt; v.z += v.vz * dt;
      const p = this._place(v, 20, 280);
      const fade = clamp(Math.min(v.t / 3, (v.life - v.t) / 3), 0, 1);
      v.g.gain.setTargetAtTime(Math.max(0, p.g * 0.3 * fade), now, 0.12);
      if (v.pan) v.pan.pan.setTargetAtTime(p.pan, now, 0.12);
      v.lp.frequency.setTargetAtTime(Math.min(6000, p.lp + 600), now, 0.2);
      if (v.prevD !== null && v.src.playbackRate && dt > 1e-4) {
        const vr = (p.d - v.prevD) / dt;
        if (Number.isFinite(vr)) v.src.playbackRate.setTargetAtTime(clamp(1 - vr / 343, 0.94, 1.06), now, 0.15);
      }
      v.prevD = p.d;
      if (v.t > v.life) {
        try { v.src.stop(); } catch (e) { /* stopped */ }
        for (const n of v.nodes) n.disconnect();
        this.vehicles.splice(i, 1);
      }
    }
  }

  _spawnVehicle() {
    const L = this.listener, c = this.ctx;
    const lanes = [-190, -110, -20, 70, 175].filter((z) => Math.abs(z - L.z) > 25 && Math.abs(z - L.z) < 170);
    const lz = lanes.length ? pick(lanes) : L.z + (Math.random() < 0.5 ? -1 : 1) * R(60, 120);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const v = { x: -dir * R(130, 180), z: lz + R(-3, 3), vx: dir * R(12, 20), vz: 0, t: 0, life: 22, prevD: null, nodes: [] };
    const keys = ['sirenPolice', 'sirenPolice', 'sirenGend', 'sirenPompiers'].filter((k) => this.samples[k]);
    const g = c.createGain(); g.gain.value = 0;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2500;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    let src;
    if (keys.length) {
      const buf = this.samples[pick(keys)];
      src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      src.start(c.currentTime, Math.random() * buf.duration);
      src.connect(lp);
    } else {
      // fallback: square-wave two-tone, softened
      src = c.createOscillator(); src.type = 'square';
      const t = c.currentTime;
      for (let k = 0; k < 50; k++) src.frequency.setValueAtTime(k % 2 ? 580 : 435, t + k * 0.5);
      src.start(); const f2 = c.createGain(); f2.gain.value = 0.18; src.connect(f2).connect(lp); v.nodes.push(f2);
    }
    lp.connect(g);
    if (pan) g.connect(pan).connect(this.amb); else g.connect(this.amb);
    const send = c.createGain(); send.gain.value = 0.45; g.connect(send).connect(this.verbIn);
    v.src = src; v.g = g; v.pan = pan; v.lp = lp;
    v.nodes.push(src, lp, g, send); if (pan) v.nodes.push(pan);
    this.vehicles.push(v);
  }

  _updateAlarms(now) {
    for (let i = this.alarms.length - 1; i >= 0; i--) {
      const a = this.alarms[i];
      if (now > a.end) { a.nodes.forEach((n) => n.disconnect()); this.alarms.splice(i, 1); continue; }
      const p = this._place(a.pos, 6, 120);
      a.g.gain.setTargetAtTime(0.05 * p.g, now, 0.1);
      if (a.pan) a.pan.pan.setTargetAtTime(p.pan, now, 0.1);
    }
  }

  // ------------------------------------------------------------ ambient layers
  // a group somewhere in the crowd takes up a chant for a few seconds
  chant() {
    if (!this.enabled || this.chantVoice && this.ctx.currentTime < this.chantVoice.end) return;
    const keys = ['chant', 'chant', 'chantB'].filter((k) => this.samples[k]);
    if (!keys.length) return;
    const buf = this.samples[pick(keys)];
    const pos = this._crowdPos(25, 90);
    const dur = R(6, 11);
    this.chantVoice = this._shot('chant', pos, 0.75 * (0.6 + this.crowdSmooth * 0.6), { ref: 18, max: 180, bus: this.amb, verb: 0.35 }, (out, t, p, v) =>
      this._buf(v, out, buf, t, { offset: R(0, Math.max(0, buf.duration - dur - 0.5)), dur, rate: R(0.97, 1.03), fadeIn: 1.2, fadeOut: 2.2 }));
  }

  // one voice yelling. Close attackers get a recorded effort grunt; distant shouts
  // are short phrases cut from the crowd recordings
  shout(pos, distant = false) {
    if (!this.enabled) return;
    const p = this._place(pos, 5, 80);
    if (!distant && p.d < 18 && this.samples.grunt) {
      this._shot('shout', pos, 0.45, { ref: 4, max: 60 }, (out, t, pl, v) => { const s = this._sprite('grunt'); return this._buf(v, out, s.buf, t, { offset: s.off, dur: s.dur, rate: R(0.92, 1.08) }); });
      return;
    }
    const keys = ['yell', 'chant'].filter((k) => this.samples[k]);
    if (!keys.length) return;
    const buf = this.samples[pick(keys)], dur = R(0.7, 1.6);
    this._shot('shout', pos, 0.55, { ref: 8, max: 110, bus: this.amb }, (out, t, pl, v) => {
      const bp = this._filter(v, out, 'bandpass', R(900, 1500), 0.6);
      return this._buf(v, bp, buf, t, { offset: R(0, buf.duration - dur - 0.1), dur, rate: R(0.95, 1.06), fadeIn: 0.06, fadeOut: 0.3, gain: 1.6 });
    });
  }

  // the whole crowd yells at once (a charge, a surge, a car going up)
  roar(pos = null) {
    if (!this.enabled) return;
    const keys = ['yell', 'chantB', 'chant'].filter((k) => this.samples[k]);
    if (!keys.length) return;
    const buf = this.samples[pick(keys)], dur = R(2.2, 3.5);
    this._shot('roar', pos || this._crowdPos(15, 50), 0.6 * (0.6 + this.crowdSmooth * 0.5), { ref: 15, max: 160, bus: this.amb, verb: 0.3 }, (out, t, p, v) =>
      this._buf(v, out, buf, t, { offset: R(0, buf.duration - dur - 0.1), dur, rate: R(0.96, 1.04), fadeIn: 0.25, fadeOut: 1.4 }));
  }

  whistle(pos) {
    if (!this.enabled) return;
    if (this.samples.whistle) {
      this._shot('whistle', pos || this._crowdPos(15, 70), 0.35, { ref: 8, max: 120, bus: this.amb }, (out, t, p, v) => {
        const s = this._sprite('whistle');
        return this._buf(v, out, s.buf, t, { offset: s.off, dur: s.dur, rate: R(0.96, 1.04), fadeOut: 0.2 });
      });
      return;
    }
    this._shot('whistle', pos || this._crowdPos(15, 70), 0.06, { ref: 10, max: 120, bus: this.amb }, (out, t, p, v) => {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = R(2900, 3400);
      const g = this._gain(v, out, 0);
      for (let i = 0; i < 3; i++) { g.gain.setValueAtTime(0.0001, t + i * 0.22); g.gain.exponentialRampToValueAtTime(1, t + i * 0.22 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.16); }
      o.connect(g); o.start(t); o.stop(t + 0.8); v.srcs.push(o); v.nodes.push(o);
      return 0.8;
    });
  }

  // far-off firework / mortar detonations, cut from the street recording
  distantBang() {
    if (!this.enabled || !this.samples.fwStreet) return;
    const buf = this.samples.fwStreet, dur = R(1.2, 3);
    const L = this.listener, a = Math.random() * 6.28, r = R(70, 180);
    this._shot('fw', { x: L.x + Math.cos(a) * r, z: L.z + Math.sin(a) * r }, 0.9, { ref: 20, max: 260, delay: true, bus: this.amb }, (out, t, p, v) =>
      this._buf(v, out, buf, t, { offset: R(0, buf.duration - dur - 0.1), dur, rate: R(0.92, 1.05), fadeIn: 0.005, fadeOut: 0.3 }));
  }

  // explosions further away in the city: attenuated, dark, no debris
  distantBoom() {
    const L = this.listener, a = Math.random() * 6.28, r = R(110, 220);
    this.explosion({ x: L.x + Math.cos(a) * r, z: L.z + Math.sin(a) * r }, R(0.6, 1.0), { ambient: true });
  }

  // things being smashed in the street: windows, barriers, bins, shutters
  ambientCrash() {
    if (!this.enabled) return;
    const pos = this._aroundListener(20, 75), r = Math.random();
    if (r < 0.45) this.glass(pos, 0.7);
    else if (r < 0.7) this.shutter(pos);
    else this.crash(pos, R(0.6, 1));
    if (Math.random() < 0.25) this._later(R(0.3, 0.9), () => this.glass({ x: pos.x + R(-3, 3), z: pos.z + R(-3, 3) }, 0.5));
  }

  // distant call to prayer from a mosque across the arrondissement, now and then
  adhan() {
    if (!this.enabled) return;
    if (this.adhanVoice && this.ctx.currentTime < this.adhanVoice.end) return;
    if (!this.samples.adhan) {
      if (!this.adhanData || this.adhanDecoding) return;
      this.adhanDecoding = true;
      const data = this.adhanData.slice(0); // decoding detaches the buffer it is given
      new Promise((res, rej) => { const p = this.ctx.decodeAudioData(data, res, rej); if (p && p.then) p.then(res, rej); })
        .then((buf) => { this.samples.adhan = buf; this.adhanDecoding = false; this.adhan(); })
        .catch((e) => { this.adhanDecoding = false; this.adhanData = null; console.warn('audio decode failed:', FILES.adhan, e && (e.message || e)); });
      return;
    }
    const buf = this.samples.adhan, L = this.listener, a = R(0, 6.28);
    const pos = { x: L.x + Math.cos(a) * 240, z: L.z + Math.sin(a) * 240 };
    this.adhanVoice = this._shot('misc', pos, 1.0, { ref: 120, max: 600, bus: this.amb, verb: 0.55 }, (out, t, p, v) => {
      const lp = this._filter(v, out, 'lowpass', 2400);
      return this._buf(v, lp, buf, t, { dur: Math.min(buf.duration, 75), fadeIn: 3, fadeOut: 6, gain: 0.32 });
    });
    if (this.adhanVoice) this.adhanVoice.pri = 99; // a long layer: never stolen by short sounds
  }

  // ------------------------------------------------------------ alarms
  alarm(pos, seconds = 14) {
    if (!this.enabled || this.paused || this.alarms.length >= 2) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'square';
    const per = Math.random() < 0.5 ? 0.25 : 0.5;
    for (let k = 0; k < seconds / per; k++) o.frequency.setValueAtTime(k % 2 ? 1250 : 850, t + k * per);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 1.2;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2500;
    const g = c.createGain(); g.gain.value = 0;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    o.connect(f).connect(lp).connect(g);
    if (pan) g.connect(pan).connect(this.sfx); else g.connect(this.sfx);
    o.start(t); o.stop(t + seconds);
    this.alarms.push({ pos: { x: pos.x, z: pos.z }, g, pan, end: t + seconds, nodes: [o, f, lp, g, ...(pan ? [pan] : [])] });
  }

  // ------------------------------------------------------------ combat
  footstep(pos, vol = 0.12, hard = false) {
    if (!this.enabled) return;
    this._shot('step', pos, vol * 1.6, { ref: 3, max: 30, verb: 0 }, (out, t, p, v) => {
      const s = this._sprite('step');
      if (s) return this._buf(v, out, s.buf, t, { offset: s.off, dur: s.dur, rate: R(0.88, 1.08) * (hard ? 1 : 0.92) });
      const f = this._filter(v, out, 'lowpass', (hard ? 1400 : 700) + Math.random() * 500);
      const n = this.ctx.createGain(); this._env(n.gain, t, 0.004, 1, 0.07); n.connect(f); v.nodes.push(n);
      this._noise(v, n, this.white, t, 0.1, 0.6 + Math.random() * 0.3);
      return 0.12;
    });
  }

  // baton / arm swing: a short, directional whoosh
  swing(pos = null, heavy = false) {
    if (!this.enabled) return;
    this._shot('swing', pos, heavy ? 0.4 : 0.3, { ref: 2.5, max: 16, verb: 0 }, (out, t, p, v) => {
      const dur = R(0.16, 0.22);
      const bp = this._filter(v, out, 'bandpass', 500, 1.8);
      bp.frequency.setValueAtTime(R(450, 600), t); bp.frequency.exponentialRampToValueAtTime(R(1800, 2600), t + dur * 0.6); bp.frequency.exponentialRampToValueAtTime(900, t + dur);
      const g = this.ctx.createGain(); g.connect(bp); v.nodes.push(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      this._noise(v, g, this.white, t, dur + 0.02);
      return dur;
    });
  }

  // kind: 'body' (baton or fist on a person), 'shield' (blow on a riot shield), 'stone' (projectile)
  impact(pos, heavy = false, shield = false, kind = shield ? 'shield' : 'body') {
    if (!this.enabled) return;
    // one blow = one sound (a strike and its knock-down arrive in the same frame)
    const now = this.ctx.currentTime;
    this.recentHits = (this.recentHits || []).filter((r) => now - r.t < 0.08);
    if (pos && this.recentHits.some((r) => Math.hypot(r.x - pos.x, r.z - pos.z) < 1.5)) return;
    if (pos) this.recentHits.push({ x: pos.x, z: pos.z, t: now });
    const vol = kind === 'stone' ? 0.45 : heavy ? 0.85 : 0.65;
    this._shot('impact', pos, vol, { ref: 4, max: 70, far: 22, farKeep: 0.4 }, (out, t, p, v) => {
      const s = this._sprite(kind === 'shield' ? 'shield' : kind === 'stone' ? 'stone' : 'punch');
      let len = 0.25;
      if (s) len = this._buf(v, out, s.buf, t, { offset: s.off, dur: s.dur, rate: R(0.9, 1.08) * (heavy ? 0.92 : 1) });
      else {
        // synthesised stand-in: filtered noise crack
        const f = this._filter(v, out, kind === 'shield' ? 'bandpass' : 'lowpass', kind === 'shield' ? 1800 : 1200, 2);
        const g = this.ctx.createGain(); this._env(g.gain, t, 0.002, kind === 'shield' ? 0.9 : 0.6, kind === 'shield' ? 0.25 : 0.08); g.connect(f); v.nodes.push(g);
        this._noise(v, g, this.white, t, 0.3);
      }
      // restrained low-frequency weight; a shield also rings slightly
      if (kind !== 'stone' && p.d < 25) this._thud(v, out, t, kind === 'shield' ? 160 : 120, 48, heavy ? 0.14 : 0.1, heavy ? 0.35 : 0.22);
      if (kind === 'shield' && this.samples.metal && heavy) {
        const m = this._sprite('metal'); this._buf(v, out, m.buf, t + 0.005, { offset: m.off, dur: 0.5, rate: R(1.3, 1.6), gain: 0.18 });
      }
      return len;
    });
  }

  hurt(player = true) {
    if (!this.enabled) return;
    this._shot('shout', null, player ? 0.4 : 0.3, { verb: 0 }, (out, t, p, v) => {
      const s = this._sprite('grunt');
      if (s) return this._buf(v, out, s.buf, t, { offset: s.off, dur: s.dur, rate: player ? R(0.85, 0.95) : R(1, 1.1) });
      return 0.1;
    });
  }

  glass(pos, vol = 0.8) {
    if (!this.enabled) return;
    this._shot('glass', pos, vol, { ref: 6, max: 110, far: 35, farKeep: 0.45 }, (out, t, p, v) => {
      const s = this._sprite('glass');
      if (s) return this._buf(v, out, s.buf, t, { offset: s.off, dur: s.dur, rate: R(0.88, 1.12), fadeOut: 0.3 });
      const f = this._filter(v, out, 'highpass', 3000);
      const g = this.ctx.createGain(); this._env(g.gain, t, 0.002, 0.8, 0.3); g.connect(f); v.nodes.push(g);
      this._noise(v, g, this.white, t, 0.4);
      return 0.5;
    });
  }

  // metal crash with a few bounces (crowd barrier, bin, scooter, street furniture)
  crash(pos, size = 1) {
    if (!this.enabled) return;
    this._shot('crash', pos, 0.6 * size, { ref: 6, max: 120 }, (out, t, p, v) => {
      if (!this.samples.metal) return 0.1;
      let tt = t;
      const hits = 2 + Math.floor(Math.random() * 3);
      for (let h = 0; h < hits; h++) {
        const s = this._sprite('metal');
        this._buf(v, out, s.buf, tt, { offset: s.off, dur: s.dur, rate: R(0.75, 1.05), gain: h === 0 ? 1 : R(0.25, 0.55) });
        tt += R(0.12, 0.35);
      }
      return tt - t + 1.2;
    });
  }

  // a shop shutter being kicked: a fast rattle of light metal hits
  shutter(pos) {
    if (!this.enabled) return;
    this._shot('crash', pos, 0.5, { ref: 6, max: 110 }, (out, t, p, v) => {
      if (!this.samples.metal) return 0.1;
      const kicks = 1 + Math.floor(Math.random() * 3);
      let tt = t;
      for (let k = 0; k < kicks; k++) {
        const s = this._sprite('metal');
        this._buf(v, out, s.buf, tt, { offset: s.off, dur: s.dur, rate: R(1.1, 1.4), gain: 1 });
        for (let r = 1; r < 5; r++) { const s2 = this._sprite('metal'); this._buf(v, out, s2.buf, tt + r * R(0.04, 0.07), { offset: s2.off, dur: 0.3, rate: R(1.5, 1.9), gain: 0.5 / r }); }
        tt += R(0.4, 0.7);
      }
      return tt - t + 1;
    });
  }

  // Explosion: sharp recorded attack, a low thump, debris close by and a long
  // rumble tail. Distance darkens and delays it and drops the detail layers.
  explosion(pos, size = 1, opts = {}) {
    if (!this.enabled || this.paused) return;
    const now = this.ctx.currentTime;
    // one gameplay event = one bang: merge blasts at the same spot within 0.25 s
    this.recentBooms = this.recentBooms.filter((r) => now - r.t < 0.25);
    if (pos && this.recentBooms.some((r) => Math.hypot(r.x - pos.x, r.z - pos.z) < 8)) return;
    if (pos) this.recentBooms.push({ x: pos.x, z: pos.z, t: now });
    const v = this._shot('boom', pos, (opts.ambient ? 0.75 : 1.05) * size, { ref: 10, max: 280, delay: true, bus: opts.ambient ? this.amb : this.sfx }, (out, t, p, vc) => {
      const near = p.d < 45, mid = p.d < 120;
      let len = 0.6;
      const s = this._sprite('boom');
      if (s) len = this._buf(vc, out, s.buf, t, { offset: s.off, dur: s.dur, rate: R(0.82, 1.0) * (size > 1 ? 0.9 : 1), fadeOut: 0.6 });
      else {
        const f = this._filter(vc, out, 'lowpass', 4000 - Math.min(1, p.d / 90) * 3000);
        f.frequency.exponentialRampToValueAtTime(160, t + 1.4);
        const g = this.ctx.createGain(); this._env(g.gain, t, 0.004, 1, 1.4 + size * 0.6); g.connect(f); vc.nodes.push(g);
        this._noise(vc, g, this.white, t, 2.2, R(0.8, 1.2));
      }
      if (mid) this._thud(vc, out, t, R(58, 72), 28, 0.5 + size * 0.2, (near ? 0.75 : 0.4) * size);
      // debris: glass and metal raining down nearby
      if (near && size > 0.55 && !opts.ambient) {
        for (let k = 0; k < 2 + Math.floor(size * 2); k++) {
          const d = this._sprite(Math.random() < 0.6 ? 'glass' : 'metal');
          if (d) this._buf(vc, out, d.buf, t + R(0.25, 1.1), { offset: d.off, dur: Math.min(d.dur, 1.2), rate: R(0.9, 1.3), gain: R(0.08, 0.2), fadeOut: 0.2 });
        }
      }
      // rumble tail rolling off the façades
      const tail = 2.5 + size * 2.5;
      const lp = this._filter(vc, out, 'lowpass', 240);
      const tg = this.ctx.createGain(); tg.connect(lp); vc.nodes.push(tg);
      tg.gain.setValueAtTime(0.0001, t); tg.gain.exponentialRampToValueAtTime(0.5 * size, t + 0.06); tg.gain.exponentialRampToValueAtTime(0.0001, t + tail);
      this._noise(vc, tg, this.brown, t, tail);
      return Math.max(len, tail);
    });
    if (!v) return;
    if (v.place.d < 40 && size > 0.6) this._duckAmbience(0.6, 0.3);
    // the crowd answers a big bang with a roar
    if (!opts.ambient && size > 0.7 && v.place.d < 90 && Math.random() < 0.5) this._later(R(0.3, 0.8), () => this.roar(pos));
  }

  // petrol bomb landing: bottle shatter, fuel igniting with a whoomp, a brief burst.
  // The sustained burning comes from the fire voices following effects.flames.
  molotov(pos, size = 1) {
    if (!this.enabled || this.paused) return;
    this.glass(pos, 0.75);
    this._shot('boom', pos, 0.85 * size, { ref: 8, max: 200, delay: true }, (out, t, p, v) => {
      const bp = this._filter(v, out, 'bandpass', 300, 0.8);
      bp.frequency.setValueAtTime(260, t + 0.03); bp.frequency.exponentialRampToValueAtTime(1300, t + 0.25); bp.frequency.exponentialRampToValueAtTime(500, t + 1.4);
      const g = this.ctx.createGain(); g.connect(bp); v.nodes.push(g);
      g.gain.setValueAtTime(0.0001, t + 0.03); g.gain.exponentialRampToValueAtTime(1.2, t + 0.16); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      this._noise(v, g, this.white, t + 0.03, 1.6);
      if (p.d < 60) this._thud(v, out, t + 0.04, 90, 35, 0.35, 0.45);
      const s = this._sprite('boom');
      if (s) this._buf(v, out, s.buf, t + 0.04, { offset: s.off, dur: 1.4, rate: R(1.05, 1.2), gain: 0.35, fadeOut: 0.5 });
      if (this.samples.fire) { const f = this.samples.fire; this._buf(v, out, f, t + 0.1, { offset: R(0, f.duration - 3), dur: 2.5, gain: 0.9, fadeIn: 0.15, fadeOut: 1.2 }); }
      return 2.6;
    });
  }

  // firework mortar launch: a hollow thump and a rising hiss
  thump(pos) {
    if (!this.enabled) return;
    this._shot('fw', pos, 0.5, { ref: 6, max: 150 }, (out, t, p, v) => {
      this._thud(v, out, t, 140, 50, 0.18, 0.8);
      const f = this._filter(v, out, 'bandpass', 2500, 4);
      f.frequency.setValueAtTime(2500, t); f.frequency.exponentialRampToValueAtTime(5000, t + 0.9);
      const g = this.ctx.createGain(); g.connect(f); v.nodes.push(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      this._noise(v, g, this.white, t, 1.1);
      return 1.1;
    });
  }

  // airborne firework burst (recorded detonation and crackle)
  firework(pos) {
    if (!this.enabled) return;
    this._shot('fw', pos, 1.0, { ref: 12, max: 220, delay: true }, (out, t, p, v) => {
      if (p.d < 120) this._thud(v, out, t, 90, 40, 0.25, 0.5);
      const buf = this.samples.fwStreet;
      if (buf) return this._buf(v, out, buf, t, { offset: R(0, buf.duration - 3), dur: R(1.2, 2.2), fadeIn: 0.004, fadeOut: 0.4 });
      const f = this._filter(v, out, 'lowpass', 6000); f.frequency.exponentialRampToValueAtTime(300, t + 0.5);
      const g = this.ctx.createGain(); this._env(g.gain, t, 0.002, 1, 0.6); g.connect(f); v.nodes.push(g);
      this._noise(v, g, this.white, t, 0.8);
      return 0.8;
    });
  }

  // a frightened scream: a voiced source whose pitch jumps up and then sags,
  // with vibrato, shaped by open-vowel formants, a little rasp and breath noise
  scream(pos, female = true) {
    if (!this.enabled) return;
    this._shot('scream', pos, 0.42, { ref: 6, max: 90, far: 40, farKeep: 0.4 }, (out, t, p, v) => {
      const c = this.ctx, dur = R(0.55, 1.25);
      const f0 = female ? R(620, 920) : R(320, 480);
      const osc = c.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f0 * 0.75, t);
      osc.frequency.linearRampToValueAtTime(f0 * R(1.05, 1.2), t + dur * 0.22);
      osc.frequency.linearRampToValueAtTime(f0 * R(0.72, 0.88), t + dur);
      const vib = c.createOscillator(); vib.frequency.value = R(5.5, 9);
      const vg = c.createGain(); vg.gain.value = f0 * R(0.02, 0.045);
      vib.connect(vg).connect(osc.frequency);
      const env = c.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(1, t + 0.05);
      env.gain.setValueAtTime(1, t + dur * 0.6);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const rasp = c.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; curve[i] = Math.tanh(x * 2.5); }
      rasp.curve = curve;
      osc.connect(rasp).connect(env);
      const scale = female ? 1.15 : 1;
      for (const [f, q, g] of [[R(850, 1050) * scale, 6, 1], [R(1350, 1700) * scale, 8, 0.6], [2900 * scale, 10, 0.25]]) {
        const bp = this._filter(v, out, 'bandpass', f, q);
        const gg = c.createGain(); gg.gain.value = g * 2.2; env.connect(gg).connect(bp); v.nodes.push(gg);
      }
      const breath = this._gain(v, this._filter(v, out, 'highpass', 2200), 0.06);
      const bg = c.createGain(); this._env(bg.gain, t, 0.05, 1, dur); bg.connect(breath); v.nodes.push(bg);
      this._noise(v, bg, this.white, t, dur);
      osc.start(t); vib.start(t); osc.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
      v.srcs.push(osc, vib); v.nodes.push(osc, vib, vg, env, rasp);
      return dur;
    });
  }

  lighter(pos) {
    if (!this.enabled) return;
    this._shot('misc', pos, 0.5, { ref: 3, max: 30, verb: 0 }, (out, t, p, v) => {
      const f = this._filter(v, out, 'highpass', 2000);
      const g = this.ctx.createGain(); this._env(g.gain, t, 0.002, 1, 0.05); g.connect(f); v.nodes.push(g);
      this._noise(v, g, this.white, t, 0.08);
      const f2 = this._filter(v, out, 'bandpass', 800);
      const g2 = this.ctx.createGain(); g2.connect(f2); v.nodes.push(g2);
      g2.gain.setValueAtTime(0.0001, t + 0.1); g2.gain.exponentialRampToValueAtTime(0.5, t + 0.2); g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      this._noise(v, g2, this.white, t + 0.1, 1.2);
      return 1.3;
    });
  }

  // ------------------------------------------------------------ UI
  ui(kind = 'click') {
    if (!this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    const freqs = { click: [880, 880], good: [660, 990], bad: [300, 200], alert: [740, 520], radio: [1200, 1200] }[kind] || [800, 800];
    o.frequency.setValueAtTime(freqs[0], t); o.frequency.setValueAtTime(freqs[1], t + 0.08);
    const g = c.createGain(); this._env(g.gain, t, 0.005, 0.12, 0.18);
    o.connect(g).connect(this.uiBus); o.start(t); o.stop(t + 0.3);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  }

  // diagnostics for tests (?dev): what is playing right now
  stats() {
    if (!this.ctx) return { state: 'none' };
    const cats = {};
    for (const v of this.voices) if (v.end > this.ctx.currentTime) cats[v.cat] = (cats[v.cat] || 0) + 1;
    return { state: this.ctx.state, voices: this.voices.length, cats, vehicles: this.vehicles.length, alarms: this.alarms.length, loaded: Object.keys(this.samples), game: +this.game.gain.value.toFixed(2), master: +this.master.gain.value.toFixed(2) };
  }
}

```

## src/boss.js

```js
// Bosses (Level 2): the Enforcer and the Leader ("le Patron").
//
// A boss is a scripted crowd character driven by this state machine through the
// crowd's script hooks (tick / move / heading / pose / onBaton), so the player's
// existing controls apply unchanged: baton strike, shield, dodge.
//
// Every attack is data (see ENFORCER and LEADER below) and follows the same rules,
// checked by __lintBosses() in dev.js:
//  - a readable wind-up of at least 0.55 s (pose, amber ring, voice); unblockable
//    attacks also flash a warning the first few times
//  - each attack is either blockable with the shield, or dodgeable (no attack is both
//    unblockable and undodgeable); a hit never takes more than a quarter of the health
//  - the boss is only hurt from the front while its guard is down (recovery after an
//    attack, stunned after a charge into a wall); from the side or behind it can be hit
//  - an opening allows a few hits (openCap); then the boss shoves the officer clear
//    (no damage) and recovers, so each opening must be earned
//  - phase changes are invulnerable pauses that cancel the attack in progress; damage
//    never carries over a phase threshold
//  - feints: a wind-up that visibly cancels, followed by the real attack's full
//    wind-up, so a dodge spent on the feint has recovered before the real hit lands
import * as THREE from 'three';
import { SHIELD_POSE, giveItem, clearItem, attachFireAxe, removeFireAxe, crouch, setRingVisible } from './characters.js';

const V = () => new THREE.Vector3();
const tmp = V();
const DODGE_COOLDOWN = 0.75; // player.js
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

// ------------------------------------------------------------------ definitions
// kind: bash / shove (shield), chop / swing (axe), charge
// blockable: the player's raised shield stops it; otherwise it must be dodged or avoided
export const ENFORCER = {
  id: 'enforcer', name: 'THE ENFORCER', sub: "le Patron's lieutenant", hp: 10, shield: 'heavy', axe: false,
  openCap: { rec: 2, stun: 3 },
  phases: [{ from: 8, speed: 2.4, turn: 2.0, guardCos: 0.4, cooldown: 1.3 }],
  attacks: {
    bash: { kind: 'bash', wind: 0.8, range: 2.6, arcCos: 0.35, dmg: 14, push: 5.5, blockable: true, rec: 1.3 },
    charge: { kind: 'charge', wind: 1.0, speed: 9, maxDist: 14, dmg: 20, push: 7, blockable: false, rec: 1.4, stun: 2.4 },
  },
};

export const LEADER = {
  id: 'leader', name: 'LE PATRON', sub: 'runs the looting crews', hp: 15, shield: 'door', axe: true,
  openCap: { rec: 2, stun: 3 },
  phases: [
    // 1: defensive, shield up, deliberate heavy attacks
    { from: 15, speed: 2.1, turn: 3.0, guardCos: 0.35, cooldown: 1.2, strafe: false,
      moves: [['chop', 0.6], ['shove', 0.4]] },
    // 2: combinations and lateral movement
    { from: 10, speed: 2.8, turn: 3.6, guardCos: 0.35, cooldown: 0.9, strafe: true,
      moves: [['combo2', 0.45], ['combo3', 0.3], ['chop2', 0.25]] },
    // 3: pressure, shorter recoveries, occasional feints
    { from: 5, speed: 3.0, turn: 4.2, guardCos: 0.35, cooldown: 0.6, strafe: true, feint: 0.3,
      moves: [['combo2f', 0.4], ['combo3f', 0.35], ['chop3', 0.25]] },
  ],
  attacks: {
    chop: { kind: 'chop', wind: 0.9, range: 2.7, arcCos: 0.4, dmg: 20, push: 4, blockable: false, rec: 1.4 },
    shove: { kind: 'shove', wind: 0.6, range: 2.1, arcCos: 0.35, dmg: 8, push: 4.5, blockable: true, rec: 0.7 },
    chop2: { kind: 'chop', wind: 0.75, range: 2.7, arcCos: 0.4, dmg: 18, push: 4, blockable: false, rec: 1.2 },
    chop3: { kind: 'chop', wind: 0.6, range: 2.7, arcCos: 0.4, dmg: 18, push: 4, blockable: false, rec: 0.85, feintable: true },
    swing: { kind: 'swing', wind: 0.55, range: 2.4, arcCos: 0.2, dmg: 9, push: 2.5, blockable: true, rec: 0.25 },
    combo2: { seq: ['swing', 'chop2'] },
    combo3: { seq: ['swing', 'swing', 'chop2'] },
    combo2f: { seq: ['swing', 'chop3'], recScale: 0.75 },
    combo3f: { seq: ['swing', 'swing', 'chop3'], recScale: 0.75 },
  },
  feintCancel: 0.35,
  barks: [
    '"Every shop on this street pays me tonight."',
    '"You think they march for me? They are my cover."',
    '"If I leave with nothing, it all burns."',
  ],
};

// ------------------------------------------------------------------ boss
export class Boss {
  constructor(game, npc, def) {
    this.game = game; this.n = npc; this.def = def;
    this.log = []; // every resolved attack: for fairness checks and tuning
  }

  get phase() { return this.def.phases[this.phaseIdx]; }
  get active() { return this.s !== 'defeated' && this.s !== 'off'; }

  // Place and start the fight. arena: { x, z, r }
  start(pos, heading, arena) {
    const g = this.game, n = this.n, d = this.def;
    this.hp = d.hp; this.phaseIdx = 0; this.s = 'intro'; this.t = 0; this.cool = 1.0;
    this.queue = []; this.cur = null; this.chargeCool = 2.0; this.flinchT = 0; this.warned = 0; this.strafeSide = 1; this.strafeT = 0;
    this.lastFeint = false; this.hits = 0; this.blocks = 0; this.arrested = false; this.blockedBashes = 0;
    this.introT = 0; this.wait = 0; this.slammed = false; this.startedAt = g.crowd.time;
    n.pos.copy(pos); n.anchor.copy(pos); n.vel.set(0, 0, 0); n.knock.set(0, 0, 0); n.heading = heading;
    n.temperament = 'hostile'; n.attackStyle = 'boss'; n.neutralized = false; n.arrested = false; n.untargetable = false;
    n.radius = 0.42; n.mass = 3; n.stimuli.length = 0; n.boss = this;
    g.crowd.setState(n, 'boss', 9999);
    n.rig.root.visible = true;
    giveItem(n.rig, 'impshield', Math.random, d.shield);
    if (d.axe) attachFireAxe(n.rig);
    n.script = {
      tick: (m, player, dt) => this.tick(dt),
      move: () => this.move(),
      heading: (m, dt) => this.heading(dt),
      pose: (m, P, dt, t) => this.pose(P, dt, t),
      onBaton: (m, dir, from) => this.onBaton(dir, from),
      amber: false, marked: true,
    };
    g.crowd.setArena(arena.x, arena.z, arena.r, n);
    // burning barriers just outside the arena: they frame the fight and light it (no damage)
    this.fires = [];
    for (const a of [0.8, 2.4, 3.9, 5.5]) {
      const x = arena.x + Math.sin(a) * (arena.r + 1.2), z = arena.z + Math.cos(a) * (arena.r + 1.2);
      if (!g.world.blocked(x, z, 0.6)) this.fires.push(g.effects.addFire(V().set(x, 0.3, z), 1.1, 1.2));
    }
  }

  // Remove the boss from the fight (level reset, checkpoint retry).
  stop() {
    const n = this.n;
    this.s = 'off';
    removeFireAxe(n.rig); clearItem(n.rig);
    for (const f of this.fires || []) this.game.effects.removeFire(f);
    this.fires = [];
    if (n.rig.ring) n.rig.ring.scale.setScalar(1);
    n.boss = null; n.script = null; n.attackStyle = null;
    this.game.crowd.clearArena();
  }

  // ------------------------------------------------------------ hits on the boss
  guarding() { return ['intro', 'idle', 'wind', 'feint', 'charge', 'backoff'].includes(this.s); }

  onBaton(dir, from) {
    const g = this.game, n = this.n;
    if (!this.active) return 'blocked';
    const fx = Math.sin(n.heading), fz = Math.cos(n.heading);
    const dx = from.x - n.pos.x, dz = from.z - n.pos.z, dd = Math.hypot(dx, dz) || 1;
    const front = (fx * dx + fz * dz) / dd > this.phase.guardCos;
    if (this.s === 'transition' || (front && this.guarding())) {
      // the guard (or a phase change) stops it: the officer recoils, no damage
      this.blocks++;
      if (g.missions.stats.blocked !== undefined) g.missions.stats.blocked++;
      g.player.knock.addScaledVector(dir, -3.4);
      g.player.staggerT = Math.max(g.player.staggerT, 0.22);
      g.audio.impact(n.pos, false, true);
      g.effects.impact(n.pos.clone().setY(n.pos.y + 1.3));
      g.cameraRig.shake(0.14);
      if (this.s !== 'transition') g.hud.alert('Blocked — wait for the opening, or get round the side', 'warn', 2, 'bossguard');
      return 'blocked';
    }
    // a hit: one point of health, never across a phase threshold
    this.hits++; this.openHits = (this.openHits || 0) + 1;
    this.flinchT = 0.22;
    n.knock.copy(dir).multiplyScalar(0.8);
    g.missions.addScore(25, 'Hit');
    const next = this.def.phases[this.phaseIdx + 1];
    this.hp = Math.max(next ? next.from : 0, this.hp - 1);
    if (this.hp <= 0) this._defeat();
    else if (next && this.hp <= next.from) this._transition();
    else if ((this.s === 'rec' || this.s === 'stun') && this.openHits >= this.def.openCap[this.s]) this._breakout();
    return 'hit';
  }

  // Enough hits for this opening: shove the officer back (no damage) and recover.
  _breakout() {
    const g = this.game, n = this.n;
    this.s = 'idle'; this.t = 0; this.cool = 0.7; this.flinchT = 0;
    const away = tmp.set(g.player.pos.x - n.pos.x, 0, g.player.pos.z - n.pos.z);
    if (away.length() < 3.5) g.player.knock.addScaledVector(away.normalize(), 4.5);
    g.audio.impact(n.pos, false, true);
    g.cameraRig.shake(0.15);
  }

  _transition() {
    const g = this.game, n = this.n;
    this.phaseIdx++;
    this.s = 'transition'; this.t = 0; this.dur = 2.2; this.queue = []; this.cur = null;
    // a non-damaging shove to reset the spacing
    const away = tmp.set(g.player.pos.x - n.pos.x, 0, g.player.pos.z - n.pos.z);
    if (away.length() < 4) g.player.knock.addScaledVector(away.normalize(), 5);
    // presentation: a banner with his line, a sting, a short slow-down and a restrained camera punch
    g.cameraRig.shake(0.25);
    g.cameraRig.kick(6);
    g.hitStop(0.18);
    const bark = this.def.barks && this.def.barks[this.phaseIdx];
    g.hud.banner(`PHASE ${this.phaseIdx + 1}`, bark || '');
    g.audio.music.sting('phase');
    g.audio.shout(n.pos);
  }

  _defeat() {
    const g = this.game, n = this.n;
    this.s = 'defeated'; this.t = 0; this.queue = []; this.cur = null;
    n.neutralized = true; n.untargetable = true;
    this.n.script.amber = false;
    setRingVisible(n.rig, false);
    if (n.rig.axe) n.rig.axe.visible = false; // dropped
    g.crowd.clearArena();
    g.onThreatNeutralized(n);
    g.cameraRig.shake(0.3);
    g.hitStop(0.12);
  }

  // ------------------------------------------------------------ behaviour
  tick(dt) {
    const g = this.game, n = this.n, p = g.player;
    if (this.s === 'off') return;
    n.stimuli.length = 0; // bosses do not panic
    n.lastAggro = g.crowd.time;
    this.t += dt; this.cool -= dt; this.chargeCool -= dt; this.flinchT -= dt; this.strafeT -= dt;
    const d = Math.hypot(p.pos.x - n.pos.x, p.pos.z - n.pos.z);
    this.dist = d;
    this.n.script.amber = this.s === 'wind' || this.s === 'feint';
    switch (this.s) {
      case 'intro':
        // during his introduction he holds his ground (the cinematic shows the beats);
        // afterwards he engages after a short moment, or at once if the officer comes close
        if (g.cinematic) { this.introT += dt; this._introBeats(); break; }
        this.wait += dt;
        if (this.wait > 0.8 || d < 10) { this.s = 'idle'; this.t = 0; }
        break;
      case 'idle':
        if (this.cool <= 0) this._choose(d);
        break;
      case 'wind':
        if (this.t >= this.cur.wind) {
          if (this.cur.feint) { this.s = 'feint'; this.t = 0; break; }
          if (this.cur.kind === 'charge') { this._startCharge(); break; }
          this._strike(d);
        }
        break;
      case 'feint':
        // visibly cancelled: guard back up, then the real attack winds up in full
        if (this.t >= this.def.feintCancel) { const a = { ...this.cur, feint: false }; this._wind(a); }
        break;
      case 'strike':
        if (this.t >= 0.12) {
          if (this.queue.length) this._wind(this.queue.shift());
          else { this.s = 'rec'; this.t = 0; this.dur = this.cur.rec * (this.curRecScale || 1); this.openHits = 0; }
        }
        break;
      case 'charge': this._chargeTick(dt, d); break;
      case 'backoff':
        // far enough for a fair run-up (measured: ~0.7 s from launch to contact at 6.2 m): the charge aims when its wind-up ends, so the officer
        // reacts to the launch; distance is what gives the reaction time
        if ((this.dist >= 6.2 && this.t >= 0.6) || this.t >= 2.0) { this.chargeCool = 6; this.queue = []; this.curRecScale = 1; this._wind(this.def.attacks.charge); }
        break;
      case 'rec': case 'stun':
        if (this.t >= this.dur) { this.s = 'idle'; this.t = 0; this.cool = this.phase.cooldown; }
        break;
      case 'transition':
        if (this.t >= this.dur) { this.s = 'idle'; this.t = 0; this.cool = 0.8; }
        break;
      case 'defeated': break;
    }
  }

  // intro beats, timed to the introduction cinematic
  _introBeats() {
    const g = this.game, n = this.n;
    if (this.def.id === 'enforcer' && !this.slammed && this.introT > 1.25) {
      this.slammed = true; // the steel shield slammed into the road
      g.audio.impact(n.pos, true, true); g.effects.dust(n.pos.clone().setY(0.2), 16); g.cameraRig.shake(0.2);
    }
  }

  _choose(d) {
    const ph = this.phase, A = this.def.attacks;
    if (this.def.id === 'enforcer') {
      // pattern: after two bashes stopped by the officer's shield he backs off and charges
      if (this.blockedBashes >= 2 && this.chargeCool <= 0) { this.blockedBashes = 0; this.s = 'backoff'; this.t = 0; return; }
      if (d > 6.5 && this.chargeCool <= 0) { this.chargeCool = 6; this.queue = []; this.curRecScale = 1; return this._wind(A.charge); }
      if (d <= A.bash.range - 0.1) { this.queue = []; this.curRecScale = 1; return this._wind(A.bash); }
      return;
    }
    if (d > 3.0) return; // closing in
    let r = Math.random(), pickId = ph.moves[0][0];
    for (const [id, w] of ph.moves) { if ((r -= w) <= 0) { pickId = id; break; } }
    const m = A[pickId];
    const seq = (m.seq || [pickId]).map((id) => A[id]);
    this.curRecScale = m.recScale || 1;
    const first = seq.shift();
    this.queue = seq.map((a) => ({ ...a }));
    // phase 3: a heavy may be feinted (never twice in a row); the real attack follows in full
    const last = this.queue.length ? this.queue[this.queue.length - 1] : null;
    const heavy = last || first;
    if (ph.feint && heavy.feintable && !this.lastFeint && Math.random() < ph.feint) {
      if (last) this.queue[this.queue.length - 1] = { ...last, feint: true };
      else return this._wind({ ...first, feint: true }, true);
      this.lastFeint = true;
    } else this.lastFeint = false;
    this._wind({ ...first });
  }

  _wind(a, feinting = false) {
    const g = this.game, n = this.n;
    this.cur = a; this.s = 'wind'; this.t = 0;
    if (feinting) this.lastFeint = true;
    if (Math.random() < 0.5) g.audio.shout(n.pos);
    if (!a.blockable) g.audio.music.sting('warn'); // unblockable: a distinct warning sound every time
    if (!a.blockable && this.warned < 3) {
      this.warned++;
      g.hud.alert(a.kind === 'charge' ? 'CHARGE — dodge sideways!' : 'Heavy swing — dodge or step back!', 'bad', 1.4, 'bossunblock');
    }
  }

  _strike(d) {
    const g = this.game, n = this.n, p = g.player, a = this.cur;
    this.s = 'strike'; this.t = 0;
    g.audio.swing(n.pos, a.kind === 'chop');
    const fx = Math.sin(n.heading), fz = Math.cos(n.heading);
    const dx = p.pos.x - n.pos.x, dz = p.pos.z - n.pos.z;
    const inArc = d <= a.range && (fx * dx + fz * dz) / (d || 1) >= a.arcCos;
    const entry = { t: +g.crowd.time.toFixed(2), boss: this.def.id, kind: a.kind, wind: a.wind, blockable: a.blockable, inRange: inArc, invuln: p.invuln > 0, guard: p.blockK > 0.6, dealt: 0 };
    if (inArc) {
      const push = tmp.set(dx, 0, dz).normalize().multiplyScalar(a.push).clone();
      // blockable: pass the source so the officer's shield can stop it; unblockable: no source
      entry.dealt = +p.takeDamage(a.dmg, a.blockable ? n.pos : null, push).toFixed(2);
      if (a.kind === 'bash' && entry.dealt > 0 && entry.dealt < a.dmg * 0.5) this.blockedBashes++;
      if (a.kind === 'chop') { g.cameraRig.shake(0.3); g.effects.dust(p.pos.clone().setY(0.2), 8); }
    } else if (a.kind === 'chop') g.effects.dust(n.pos.clone().add(V().set(fx * 1.6, 0.1, fz * 1.6)), 10); // axe into the road
    this.log.push(entry);
  }

  _startCharge() {
    const g = this.game, n = this.n, p = g.player;
    // direction locks when the wind-up ends: no homing, a sidestep or dodge clears it
    this.chargeDir = V().set(p.pos.x - n.pos.x, 0, p.pos.z - n.pos.z).normalize();
    n.heading = Math.atan2(this.chargeDir.x, this.chargeDir.z);
    this.chargeFrom = n.pos.clone();
    this.s = 'charge'; this.t = 0; this.chargeHit = false;
    g.audio.shout(n.pos);
  }

  _chargeTick(dt, d) {
    const g = this.game, n = this.n, p = g.player, a = this.cur;
    const ahead = 1.7;
    // into a wall, car or barricade: stunned (the big opening)
    if (g.world.blocked(n.pos.x + this.chargeDir.x * ahead, n.pos.z + this.chargeDir.z * ahead, 0.4)) {
      this.s = 'stun'; this.t = 0; this.dur = a.stun; n.vel.set(0, 0, 0); this.openHits = 0;
      n.knock.copy(this.chargeDir).multiplyScalar(-2);
      g.cameraRig.shake(0.35); g.audio.impact(n.pos, true, true); g.effects.dust(n.pos.clone().setY(0.5), 14);
      g.hud.alert('He hit the wall — now!', 'good', 1.6, 'bossstun');
      this.log.push({ t: +g.crowd.time.toFixed(2), boss: this.def.id, kind: 'charge', wind: a.wind, blockable: false, inRange: false, dealt: 0, wall: true });
      return;
    }
    if (!this.chargeHit && d < 1.25) {
      this.chargeHit = true;
      const dealt = p.takeDamage(a.dmg, null, this.chargeDir.clone().multiplyScalar(a.push));
      this.log.push({ t: +g.crowd.time.toFixed(2), boss: this.def.id, kind: 'charge', wind: a.wind, blockable: false, inRange: true, invuln: dealt === 0, dealt: +dealt.toFixed(2) });
      if (dealt > 0) { g.cameraRig.shake(0.4); this.s = 'rec'; this.t = 0; this.dur = a.rec; this.openHits = 0; return; }
    }
    if (n.pos.distanceTo(this.chargeFrom) > a.maxDist || this.t > 2.5) {
      if (!this.chargeHit) this.log.push({ t: +g.crowd.time.toFixed(2), boss: this.def.id, kind: 'charge', wind: a.wind, blockable: false, inRange: false, dealt: 0 });
      this.s = 'rec'; this.t = 0; this.dur = a.rec; this.openHits = 0;
    }
  }

  move() {
    const g = this.game, n = this.n, p = g.player.pos, ph = this.phase;
    if (this.s === 'charge') return { speed: this.cur.speed, dest: tmp.copy(n.pos).addScaledVector(this.chargeDir, 6).clone() };
    if (this.s === 'backoff') {
      const away = V().set(n.pos.x - p.x, 0, n.pos.z - p.z).normalize();
      return { speed: 3.2, dest: n.pos.clone().addScaledVector(away, 3) };
    }
    if (this.s !== 'idle') return { speed: 0 };
    const d = this.dist || 99;
    if (ph.strafe && d < 4.5) {
      // circle the officer, switching sides now and then
      if (this.strafeT <= 0) { this.strafeT = 1.5 + Math.random() * 1.5; this.strafeSide = -this.strafeSide; }
      const a = Math.atan2(n.pos.x - p.x, n.pos.z - p.z) + this.strafeSide * 0.7;
      return { speed: ph.speed, dest: V().set(p.x + Math.sin(a) * 2.5, 0, p.z + Math.cos(a) * 2.5) };
    }
    const want = this.def.id === 'enforcer' ? 2.3 : 2.4;
    if (d <= want) return { speed: 0 };
    return { speed: d > 7 && this.def.id === 'leader' ? 4.2 : ph.speed, dest: p.clone() };
  }

  heading(dt) {
    const n = this.n, p = this.game.player.pos;
    if (this.s === 'charge') return Math.atan2(this.chargeDir.x, this.chargeDir.z);
    if (this.s === 'defeated' || this.s === 'stun' || this.s === 'strike') return n.heading;
    // tracking slows during a recovery and in the last moments of a wind-up
    let rate = this.phase.turn;
    if (this.s === 'rec') rate *= 0.35;
    if (this.s === 'wind' && this.cur && this.t > this.cur.wind - 0.25) rate *= 0.4;
    const want = Math.atan2(p.x - n.pos.x, p.z - n.pos.z);
    const dh = wrap(want - n.heading);
    return n.heading + Math.max(-rate * dt, Math.min(rate * dt, dh));
  }

  // ------------------------------------------------------------ poses (grey-box)
  pose(P, dt, t) {
    const n = this.n, rig = n.rig, a = this.cur, s = this.s;
    let sp = SHIELD_POSE.guard, rate = 12, sk = 10;
    const k = this.cur && this.s === 'wind' ? Math.min(1, this.t / this.cur.wind) : 0;
    // guard stance by default: shield across the body, weapon ready
    P.shLX = -1.25; P.elL = -1.8; P.shLZ = 0.35; P.knL = P.knR = 0.25; P.y = -0.04; P.spX = 0.12;
    P.shRX = this.def.axe ? -0.7 : -0.6; P.elR = this.def.axe ? -1.0 : -1.5; P.shRZ = -0.25;
    P.brow = 1; P.mouth = 0.2;
    // unblockable wind-ups: the ring pulses (blockable ones stay steady)
    if (rig.ring) rig.ring.scale.setScalar(s === 'wind' && a && !a.blockable ? 1 + 0.3 * Math.abs(Math.sin(t * 16)) : 1);
    if (s === 'intro' && this.game.cinematic) {
      const it = this.introT;
      if (this.def.id === 'enforcer') {
        // shield raised high, then slammed down at 1.25 s
        if (it < 1.25) { sp = [SHIELD_POSE.wind[0].clone().setY(0.55), SHIELD_POSE.wind[1]]; P.shLX = -2.0; P.elL = -1.2; P.spX = -0.15; sk = 6; }
        else { sp = SHIELD_POSE.strike; P.shLX = -1.5; P.elL = -0.6; P.spX = 0.35; sk = 30; }
      } else if (it > 0.8 && it < 2.9) { P.shRX = -2.9; P.elR = -0.7; P.shRZ = -0.15; P.spX = -0.1; P.hdX = -0.15; P.mouth = 0.7; } // axe raised
    }
    if (s === 'wind' && a) {
      if (a.kind === 'bash' || a.kind === 'shove') { sp = SHIELD_POSE.wind; P.shLX = -1.1; P.elL = -1.9; P.spY = 0.45 * k; P.spX = -0.12; P.knL = P.knR = 0.4; }
      else if (a.kind === 'charge') { crouch(P, 0.45 * k + 0.1); P.spX = 0.35 + 0.15 * k; P.hdX = 0.2; P.shLX = -1.1; }
      else if (a.kind === 'chop') { P.shRX = -2.9 * (0.3 + 0.7 * k); P.elR = -0.9; P.shRZ = -0.2; P.spX = -0.15 * k; P.spY = -0.2 * k; P.mouth = 0.6; }
      else if (a.kind === 'swing') { P.shRX = -1.3; P.shRZ = -1.3 * k; P.elR = -0.4; P.spY = -0.7 * k; }
    } else if (s === 'strike' && a) {
      rate = 30; sk = 30;
      if (a.kind === 'bash' || a.kind === 'shove') { sp = SHIELD_POSE.strike; P.shLX = -1.5; P.elL = -0.6; P.spY = -0.35; P.spX = 0.35; P.hpLX = -0.6; P.knL = 0.45; }
      else if (a.kind === 'chop') { P.shRX = -0.4; P.elR = -0.1; P.spX = 0.55; P.hdX = 0.2; P.knL = 0.5; P.hpLX = -0.5; P.mouth = 0.8; }
      else if (a.kind === 'swing') { P.shRX = -1.4; P.shRZ = 0.5; P.elR = -0.2; P.spY = 0.7; }
    } else if (s === 'feint') { rate = 18; P.mouth = 0.3; } // straight back to guard: the cancel is visible
    else if (s === 'charge') { P.spX = 0.5; P.hdX = 0.25; P.shLX = -1.4; }
    else if (s === 'backoff') { P.spX = 0.05; P.hdX = 0.1; }
    else if (s === 'rec') {
      rate = 8; sp = SHIELD_POSE.open; sk = 12;
      P.shLX = -0.3; P.elL = -0.4; P.spX = 0.3; P.hdX = 0.3;
      if (a && a.kind === 'chop') { P.shRX = -0.25; P.elR = -0.05; P.spX = 0.5; P.hdX = 0.35; } // axe buried in the road
    } else if (s === 'stun') {
      rate = 8; sp = SHIELD_POSE.open; sk = 12;
      P.shLX = -0.2; P.elL = -0.3; P.spX = 0.3 + Math.sin(t * 9) * 0.06; P.hdX = 0.45 + Math.sin(t * 7) * 0.15; P.hdY = Math.sin(t * 5) * 0.3; P.knL = P.knR = 0.35; P.brow = -1;
    } else if (s === 'transition') {
      rate = 10; P.shRX = -1.0; P.shRZ = -0.9; P.shLZ = 0.8; P.hdX = -0.45; P.spX = -0.2; P.mouth = 1;
    } else if (s === 'defeated') {
      rate = 5; sp = SHIELD_POSE.open; sk = 6;
      P.knL = P.knR = 1.55; P.y = -0.42; P.spX = 0.3; P.hdX = 0.4; P.shLX = 0.2; P.shRX = 0.2; P.elL = P.elR = -0.3; P.brow = -1; P.mouth = 0.3;
    }
    if (this.flinchT > 0) { P.spX -= 0.25; P.hdX -= 0.3; P.brow = -1; }
    if (rig.item) {
      const kk = 1 - Math.exp(-dt * sk);
      rig.item.position.lerp(sp[0], kk);
      rig.item.rotation.x += (sp[1].x - rig.item.rotation.x) * kk;
      rig.item.rotation.y += (sp[1].y - rig.item.rotation.y) * kk;
      rig.item.rotation.z += (sp[1].z - rig.item.rotation.z) * kk;
    }
    return rate;
  }

  // HUD
  info() {
    const marks = this.def.phases.slice(1).map((ph) => ph.from / this.def.hp);
    return { name: this.def.name, sub: this.def.sub, hp: this.hp, max: this.def.hp, marks, phase: this.phaseIdx, phases: this.def.phases.length, open: this.s === 'rec' || this.s === 'stun', state: this.s };
  }
}

// Fairness rules for every attack (used by __lintBosses).
export function lintBoss(def) {
  const out = [];
  const A = def.attacks;
  for (const [id, a] of Object.entries(A)) {
    if (a.seq) {
      const parts = a.seq.map((x) => A[x]);
      const last = parts[parts.length - 1];
      if ((last.rec * (a.recScale || 1)) < 0.6) out.push(`${id}: final recovery ${(last.rec * (a.recScale || 1)).toFixed(2)} s < 0.6 s`);
      continue;
    }
    if (a.wind < 0.55) out.push(`${id}: wind-up ${a.wind} s < 0.55 s`);
    if (a.dmg > 25) out.push(`${id}: damage ${a.dmg} > 25`);
    if (!a.blockable && a.kind !== 'charge' && !(a.range <= 3)) out.push(`${id}: unblockable with range ${a.range} m cannot be stepped out of`);
    if (!a.blockable && a.wind < 0.6) out.push(`${id}: unblockable wind-up ${a.wind} s < 0.6 s`);
    if (a.feintable && def.feintCancel + a.wind < DODGE_COOLDOWN + 0.15) out.push(`${id}: feint cancel + real wind-up ${(def.feintCancel + a.wind).toFixed(2)} s leaves no time to dodge again (cooldown ${DODGE_COOLDOWN} s)`);
  }
  for (const ph of def.phases) for (const [id] of ph.moves || []) if (!A[id]) out.push(`phase move ${id} undefined`);
  return out;
}

```

## src/camera.js

```js
// Over-the-shoulder third-person camera with collision, shake and crowd-aware height.
import * as THREE from 'three';

export class CameraRig {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.yaw = 0;
    this.pitch = -0.12;
    this.dist = 3.4;
    this.curDist = 3.4;
    this.shakeAmt = 0;
    this.pivot = new THREE.Vector3();
    this.smoothPivot = null;
    this.extraH = 0;
    this.fov = 62;
  }

  // opening establishing shot: starts high and wide, eases into the shoulder view
  intro(dur = 3.2) { this.introT = dur; this.introDur = dur; }

  reset(player) {
    this.yaw = player.heading + Math.PI; // camera behind the player
    this.pitch = -0.12;
    this.smoothPivot = null;
    this.curDist = this.dist;
  }

  shake(a) { this.shakeAmt = Math.min(0.6, this.shakeAmt + a); }
  // brief field-of-view punch (phase changes): restrained, eases out
  kick(deg) { this.fovKick = Math.min(10, (this.fovKick || 0) + deg); }

  rotate(dx, dy) {
    this.yaw -= dx * 0.0024;
    this.pitch = Math.max(-0.95, Math.min(0.5, this.pitch - dy * 0.002));
  }

  update(dt, player, crowdDensity) {
    // raise the camera a little in dense crowds so the officer stays visible
    this.extraH += ((crowdDensity > 3 ? 0.55 : crowdDensity > 1 ? 0.25 : 0) - this.extraH) * Math.min(1, dt * 2);
    const head = new THREE.Vector3(player.pos.x, player.pos.y + 1.6 + this.extraH, player.pos.z);
    if (!this.smoothPivot) this.smoothPivot = head.clone();
    this.smoothPivot.lerp(head, 1 - Math.exp(-dt * 18));

    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const fwd = new THREE.Vector3(-Math.sin(this.yaw) * cp, sp, -Math.cos(this.yaw) * cp);
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const shoulder = player.blocking ? 0.75 : 0.55;
    const pivot = this.smoothPivot.clone().addScaledVector(right, shoulder);
    // shoulder offset must not poke into walls either
    const sideHit = this.world.raycast(this.smoothPivot, right, shoulder + 0.3);
    if (sideHit < shoulder + 0.3) pivot.copy(this.smoothPivot).addScaledVector(right, Math.max(0, sideHit - 0.3));

    const wantDist = (player.sprinting ? 3.9 : player.blocking ? 2.8 : this.dist) + this.extraH * 0.8;
    const back = fwd.clone().negate();
    const hit = this.world.raycast(pivot, back, wantDist + 0.3);
    const allowed = Math.max(0.6, hit - 0.3);
    const target = Math.min(wantDist, allowed);
    // pull in instantly, ease back out
    if (target < this.curDist) this.curDist = target;
    else this.curDist += (target - this.curDist) * Math.min(1, dt * 3);

    const pos = pivot.clone().addScaledVector(back, this.curDist);
    pos.y = Math.max(pos.y, 0.35);
    let look = pivot.clone().addScaledVector(fwd, 10);
    if (this.introT > 0) {
      this.introT -= dt;
      const k = 1 - Math.max(0, this.introT) / this.introDur;
      const e = k * k * (3 - 2 * k);
      const flat = new THREE.Vector3(fwd.x, 0, fwd.z).normalize();
      const wide = this.smoothPivot.clone().addScaledVector(flat, -9).add(new THREE.Vector3(0, 6.5, 0)).addScaledVector(right, 3);
      const wideLook = this.smoothPivot.clone().addScaledVector(flat, 40).add(new THREE.Vector3(0, 3, 0));
      pos.lerpVectors(wide, pos, e);
      look.lerpVectors(wideLook, look, e);
    }
    if (this.shakeAmt > 0.001) {
      const s = this.shakeAmt * this.shakeAmt;
      pos.x += (Math.random() - 0.5) * s * 0.5; pos.y += (Math.random() - 0.5) * s * 0.5; pos.z += (Math.random() - 0.5) * s * 0.5;
      this.shakeAmt *= Math.exp(-dt * 7);
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
    this.fovKick = (this.fovKick || 0) * Math.exp(-dt * 4);
    const wantFov = (player.sprinting ? 70 : player.blocking ? 56 : 62) + this.fovKick;
    this.lastPose = { pos: pos.clone(), look: look.clone(), fov: wantFov }; // cinematics blend back to this
    this.fov += (wantFov - this.fov) * Math.min(1, dt * 4);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) { this.camera.fov = this.fov; this.camera.updateProjectionMatrix(); }
  }
}

```

## src/characters.js

```js
// Articulated procedural humanoids + layered procedural animation.
import * as THREE from 'three';
import * as T from './textures.js';
import { Humans, createHuman, updateHuman } from './humans.js';

const matCache = new Map();
export function colMat(hex, opts = {}) {
  const k = hex + JSON.stringify(opts);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, ...opts }));
  return matCache.get(k);
}

let G = null; // shared geometry
let M = null; // shared textured materials
function initShared(world) {
  if (G) return;
  const cap = (r, l, ty) => { const g = new THREE.CapsuleGeometry(r, l, 3, 8); g.translate(0, ty, 0); return g; };
  G = {
    pelvis: new THREE.BoxGeometry(0.36, 0.22, 0.23),
    torso: (() => { const g = new THREE.BoxGeometry(0.4, 0.5, 0.23, 1, 1, 1); g.translate(0, 0.27, 0); return g; })(),
    torsoBig: (() => { const g = new THREE.BoxGeometry(0.46, 0.52, 0.3); g.translate(0, 0.28, 0); return g; })(),
    neck: (() => { const g = new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8); g.translate(0, 0.04, 0); return g; })(),
    head: (() => { const g = new THREE.SphereGeometry(0.11, 12, 10); g.scale(0.92, 1.1, 1.0); g.translate(0, 0.14, 0.0); return g; })(),
    hair: (() => { const g = new THREE.SphereGeometry(0.118, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55); g.scale(0.95, 1.05, 1.05); g.translate(0, 0.16, -0.01); return g; })(),
    cap: (() => { const g = new THREE.SphereGeometry(0.122, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5); g.translate(0, 0.17, 0); return g; })(),
    brim: (() => { const g = new THREE.BoxGeometry(0.2, 0.015, 0.12); g.translate(0, 0.18, 0.15); return g; })(),
    hood: (() => { const g = new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62); g.scale(1, 1.1, 1.1); g.translate(0, 0.14, -0.02); return g; })(),
    mask: (() => { const g = new THREE.BoxGeometry(0.2, 0.1, 0.08); g.translate(0, 0.08, 0.075); return g; })(),
    scarf: (() => { const g = new THREE.CylinderGeometry(0.085, 0.1, 0.1, 10); g.translate(0, 0.02, 0); return g; })(),
    upperArm: cap(0.064, 0.19, -0.14),
    upperArmBig: cap(0.068, 0.2, -0.14),
    forearm: cap(0.056, 0.17, -0.13),
    hand: (() => { const g = new THREE.BoxGeometry(0.075, 0.1, 0.05); g.translate(0, -0.05, 0); return g; })(),
    thigh: cap(0.088, 0.28, -0.22),
    shin: cap(0.072, 0.3, -0.22),
    shinGuard: (() => { const g = new THREE.BoxGeometry(0.13, 0.32, 0.13); g.translate(0, -0.2, 0.02); return g; })(),
    foot: (() => { const g = new THREE.BoxGeometry(0.115, 0.09, 0.27); g.translate(0, -0.02, 0.05); return g; })(),
    backpack: (() => { const g = new THREE.BoxGeometry(0.3, 0.36, 0.14); g.translate(0, 0.3, -0.18); return g; })(),
    helmet: (() => { const g = new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62); g.translate(0, 0.15, -0.005); return g; })(),
    visor: (() => { const g = new THREE.SphereGeometry(0.158, 14, 8, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.3, Math.PI * 0.36); g.translate(0, 0.14, 0.0); return g; })(),
    pad: (() => { const g = new THREE.SphereGeometry(0.09, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5); g.scale(1, 0.8, 1.1); return g; })(),
    pole: (() => { const g = new THREE.CylinderGeometry(0.012, 0.012, 1.0, 5); g.translate(0, -0.5, 0); return g; })(),
    bigPole: (() => { const g = new THREE.CylinderGeometry(0.018, 0.018, 3.2, 5); g.translate(0, -1.3, 0); return g; })(),
    flag: (() => { const g = new THREE.PlaneGeometry(0.75, 0.5, 8, 1); g.translate(0.375, 0, 0); return g; })(),
    bigFlag: (() => { const g = new THREE.PlaneGeometry(2.0, 1.3, 12, 2); g.translate(1.0, 0, 0); return g; })(),
    placard: new THREE.PlaneGeometry(0.62, 0.44),
    phone: (() => { const g = new THREE.BoxGeometry(0.075, 0.14, 0.012); return g; })(),
    banner: new THREE.PlaneGeometry(2.3, 0.62),
    baton: (() => { const g = new THREE.CylinderGeometry(0.018, 0.022, 0.62, 8); g.translate(0, -0.26, 0); return g; })(),
    batonHandle: (() => { const g = new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6); g.rotateZ(Math.PI / 2); g.translate(0.06, -0.12, 0); return g; })(),
    shield: (() => { const g = new THREE.BoxGeometry(0.56, 1.0, 0.02); return g; })(),
    ring: (() => { const g = new THREE.PlaneGeometry(1.4, 1.4); g.rotateX(-Math.PI / 2); g.translate(0, 0.03, 0); return g; })(),
    bottle: (() => { const g = new THREE.CylinderGeometry(0.035, 0.04, 0.22, 8); g.translate(0, 0.0, 0); return g; })(),
    rag: (() => { const g = new THREE.BoxGeometry(0.03, 0.08, 0.03); g.translate(0, 0.14, 0); return g; })(),
    // goods carried out of looted shops: carton, boxed television, shoe boxes, bag
    loot: [[0.42, 0.32, 0.32, 0xa07a4a], [0.62, 0.42, 0.1, 0x151515], [0.36, 0.16, 0.26, 0xe0601a], [0.3, 0.38, 0.18, 0xd8d8dc]]
      .map(([w, h, d, c]) => ({ geo: new THREE.BoxGeometry(w, h, d), color: c })),
  };
  M = {
    psg: [T.psgShirtTexture(0), T.psgShirtTexture(1)].map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })),
    keffiyeh: new THREE.MeshStandardMaterial({ map: T.keffiyehTexture(), roughness: 0.9 }),
    palFlag: world.materials.palFlag,
    palFlagBig: world.materials.palFlagBig,
    algFlag: world.materials.algFlag,
    algFlagBig: world.materials.algFlagBig,
    frFlag: world.materials.frFlag,
    frFlagBig: world.materials.frFlagBig,
    uniFlag: world.materials.uniFlag,
    uniFlagBig: world.materials.uniFlagBig,
    shield: new THREE.MeshStandardMaterial({ map: T.shieldTexture(), transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    visor: new THREE.MeshStandardMaterial({ color: 0x8fa3b8, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.5, depthWrite: false, side: THREE.DoubleSide }),
    vest: new THREE.MeshStandardMaterial({ map: T.vestTexture('POLICE'), roughness: 0.7 }),
    ring: new THREE.MeshBasicMaterial({ map: T.ringTexture(), color: 0xff2a2a, transparent: true, depthWrite: false, opacity: 0.9 }),
    policeText: new THREE.MeshStandardMaterial({ map: T.policeTextTexture(), transparent: true, alphaTest: 0.3, roughness: 0.6 }),
    hair: [0x0f0b08, 0x1c140e, 0x2e2018, 0x4a3524, 0x6b5238, 0x111111].map((c) => new THREE.MeshStandardMaterial({ color: c, map: T.hairTexture(), roughness: 0.75 })),
    ringBlue: new THREE.MeshBasicMaterial({ map: T.ringTexture(), color: 0xffc040, transparent: true, depthWrite: false, opacity: 0.9 }),
    phoneScreen: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x88aaff, emissiveIntensity: 0.6 }),
    bottle: new THREE.MeshStandardMaterial({ color: 0x2f6a3a, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 }),
    rag: new THREE.MeshStandardMaterial({ color: 0xc8b89a }),
    placards: [
      'FREE\nPALESTINE', 'JUSTICE', 'LIBERTÉ\nÉGALITÉ', 'PAIX', 'ON LÂCHE\nRIEN', 'ICI C\'EST\nPARIS', 'STOP', 'RÉSISTANCE', 'NON !', 'CESSEZ-LE-FEU',
      'VIE CHÈRE\nÇA SUFFIT', 'SAUVONS\nL\'HÔPITAL', 'GRÈVE !', 'LYCÉES\nEN LUTTE', 'PAS DE\nJUSTICE\nPAS DE PAIX', 'SMIC\nINDIGNE',
    ].map((txt, i) => new THREE.MeshStandardMaterial({ map: T.placardTexture(txt, i % 3 === 1 ? '#111' : '#f4f1ea', i % 3 === 1 ? '#f4f1ea' : (i % 2 ? '#b31b1b' : '#151515')), roughness: 0.9, side: THREE.FrontSide })),
    banners: [
      ['PALESTINE VIVRA', '#f2efe8', '#0a7a35'], ['ICI C\'EST PARIS', '#132447', '#ffffff'], ['JUSTICE POUR TOUS', '#111', '#f2f2f2'], ['STOP AUX VIOLENCES', '#f2efe8', '#b31b1b'],
      // student and union banners
      ['LYCÉENS EN COLÈRE', '#f2efe8', '#111'], ['FACS EN GRÈVE', '#c8161d', '#ffffff'], ['JEUNESSE EN LUTTE', '#111', '#f2c230'],
      ['LA VIE CHÈRE ÇA SUFFIT', '#f2efe8', '#c8161d'], ['SERVICES PUBLICS EN DANGER', '#1b2a4a', '#ffffff'],
    ].map(([t, b, f]) => new THREE.MeshStandardMaterial({ map: T.bannerTexture(t, b, f), side: THREE.DoubleSide, roughness: 0.9 })),
  };
}

const SKINS = [0xf1c9a5, 0xe0ac86, 0xc68c64, 0xa86f4c, 0x8a5636, 0x6b4029, 0x4e2e1c, 0xd8b090];
const HAIR = [0x1a1410, 0x2b1d14, 0x0d0d0d, 0x5a3b22, 0x7a5a3a, 0x222222];
const DARKS = [0x101010, 0x161616, 0x1c1c1e, 0x23252a, 0x2a2d33];
const HOODIES = [0x8e1418, 0x4a4c50, 0x22324a, 0x4a5a3a, 0x7a6a50, 0x5a2a3a, 0x8a8f94, 0x2a4a6a];
const TRACKS = [0x1b2a6a, 0x5a1a2a, 0x2f4a3a, 0x4a4c50, 0x6a6a70, 0x0e3a5a];
const STRIPES = [0xe0601a, 0xf2f2f2, 0xf2f2f2, 0xc8102e, 0xf2c230, 0x2c6ef2, 0x16a34a];
const CASUAL = [0x3a4a5e, 0x5a2a2a, 0x2f4a3a, 0x7a6a50, 0x8a8f94, 0xc0bab0, 0x6a4a6a, 0x9a4a2a, 0x2a3a6a, 0xd8d4c8, 0x4a5a3a];
const PANTS = [0x1a1c22, 0x23262c, 0x2a3346, 0x3b3f46, 0x4a4a42, 0x1b2a40, 0x111111, 0x5a5348];

// One shared clothing pool for everyone on the street: demonstrators, looters
// and passers-by all draw from the same distribution, so nothing a character
// wears says anything about the role they play or whether they turn violent.
// (Roles and hostility are assigned separately, from behaviour and mission state.)
// The pool follows the reference photos of the Paris street protests: mostly dark
// streetwear (hoodies, puffers, tracksuits), PSG and Algeria shirts, keffiyehs,
// face coverings, hi-vis vests, and the coats and shirts of people out for the evening.
export function randomOutfit(rng) {
  const r = rng();
  const o = {
    skin: SKINS[Math.floor(rng() * SKINS.length)],
    hair: HAIR[Math.floor(rng() * HAIR.length)],
    pants: PANTS[Math.floor(rng() * PANTS.length)],
    shoes: rng() < 0.55 ? 0xeeeeee : rng() < 0.5 ? 0x141414 : 0x8a2a2a,
    height: 0.92 + rng() * 0.16,
    build: 0.9 + rng() * 0.22,
    backpack: rng() < 0.3,
  };
  if (r < 0.12) { o.top = 'psg'; o.psg = rng() < 0.5 ? 0 : 1; o.topColor = 0x132447; o.longSleeve = rng() < 0.3; }
  else if (r < 0.42) {
    o.top = 'hoodie'; const hc = rng();
    o.topColor = hc < 0.65 ? DARKS[Math.floor(rng() * DARKS.length)] : HOODIES[Math.floor(rng() * HOODIES.length)];
    o.longSleeve = true; o.hood = rng() < 0.5;
  }
  else if (r < 0.54) { o.top = 'track'; o.topColor = rng() < 0.6 ? DARKS[Math.floor(rng() * 3)] : TRACKS[Math.floor(rng() * TRACKS.length)]; o.stripe = STRIPES[Math.floor(rng() * STRIPES.length)]; o.longSleeve = true; }
  else if (r < 0.70) { o.top = 'jacket'; o.topColor = rng() < 0.8 ? DARKS[Math.floor(rng() * DARKS.length)] : CASUAL[Math.floor(rng() * CASUAL.length)]; o.longSleeve = true; }
  else if (r < 0.84) { o.top = 'tee'; o.topColor = rng() < 0.5 ? DARKS[Math.floor(rng() * DARKS.length)] : CASUAL[Math.floor(rng() * CASUAL.length)]; o.longSleeve = false; }
  // smart: wool coat or pressed shirt (dressed in skinnedOutfit)
  else { o.top = 'jacket'; o.smart = true; o.topColor = SMART_COATS[Math.floor(rng() * SMART_COATS.length)]; o.longSleeve = true; }
  if (o.top === 'psg' && rng() < 0.3) o.pants = 0x132447;
  const hr = rng();
  o.hat = o.hood ? 'none' : hr < 0.24 ? 'cap' : hr < 0.36 ? 'beanie' : 'none';
  o.hatColor = rng() < 0.6 ? 0x111111 : rng() < 0.6 ? 0xeeeeee : rng() < 0.5 ? 0x132447 : 0xd4202f;
  const mr = rng();
  // balaclava: black full-head cover with an eye slot
  o.mask = mr < 0.08 ? 'balaclava' : mr < 0.18 ? 'black' : mr < 0.30 ? 'surgical' : mr < 0.33 ? 'white' : mr < 0.37 ? 'keffiyeh' : 'none';
  if (o.mask === 'balaclava') o.hat = 'none';
  const sr = rng();
  o.scarf = sr < 0.2 ? 'keffiyeh' : sr < 0.26 ? 'psg' : sr < 0.32 ? 'red' : 'none';
  skinnedOutfit(o, rng);
  // gilets jaunes: a hi-vis vest worn over whatever garment they have on
  if (rng() < 0.1) {
    o.vest = true;
    if (!o.garment) { o.garment = 'shirt'; o.shellColor = o.topColor ?? 0x222222; o.keepTop = false; }
    o.shellPattern = 7; o.pa = 0xd8ec1a; o.pb = 0xb8bec4;
    if (o.mask === 'black' && rng() < 0.6) o.mask = 'none';
  }
  return o;
}
const SMART_COATS = [0x8a6a48, 0x22324a, 0x2a2a2e, 0x5a5a5e, 0xb8a587, 0x3a2a22, 0x6a1d2a];
const SMART_SHIRTS = [0xf2f2f0, 0xb8cce0, 0xe8d8d0, 0xd8dccf, 0x9fb4c8];

// Extra parameters used by the skinned (glTF) characters.
// Complexion groups, drawn with ordinary weights (no caps or quotas). They only
// choose a base body, skin tone and hair; nothing in the game reads them for
// behaviour, and the audit in dev.js (__auditAppearance) checks that.
const SKIN_GROUPS = {
  eu: [0xf3d2bd, 0xe8b996, 0xdcb08c],
  na: [0xc08562, 0xb47b55, 0xa87a58, 0xa06a48, 0x956040, 0x8a5a3c],
  af: [0x84553a, 0x6a412b, 0x5a3624, 0x4d2e1f, 0x3e2418],
};
export const SHARE = { female: 0.3, eu: 0.34, af: 0.3 }; // na: the remainder (0.36)

// CRS officers: varied height, build and complexion from the same groups as
// everyone else. (The skinned CRS model is fully armoured with a visor, so the
// complexion shows on the procedural fallback rig; height and build show on both.)
export function policeOutfit(rng) {
  const er = rng();
  const group = er < SHARE.eu ? 'eu' : er < SHARE.eu + SHARE.af ? 'af' : 'na';
  const tones = SKIN_GROUPS[group];
  return { skin: tones[Math.floor(rng() * tones.length)], height: 0.96 + rng() * 0.1, build: 0.95 + rng() * 0.15 };
}
const JEANS = [0x2a3a5a, 0x1e2a44, 0x3b4b6b, 0x151a24, 0x222222, 0x4a4a48, 0x5a5040, 0x3a3f46, 0x6a6a70, 0x1b1b1b];
const SHOES = [0xf0f0f0, 0xe8e8e8, 0x151515, 0x222222, 0x8a2a2a, 0x3a4a6a, 0xc8c0b0, 0xf4f4f4];
const FOOTBALL = [
  // [pattern, a, b, c]  pattern: 2 vertical stripes, 3 hoops, 4 two-tone, 0 solid
  [2, 0x0b0b0b, 0xf2f2f2], [3, 0x0a7a35, 0xf2f2f2], [0, 0x1f3fa0], [4, 0xf2f2f2, 0x0a7a35], [0, 0xc8102e], [2, 0x7a1d3a, 0x1b2a6a], [0, 0xf2c230], [4, 0x0b0b0b, 0xd4202f],
  [3, 0x1b2a6a, 0xf2c230], [2, 0xd4202f, 0xf2f2f2], [0, 0x6aa8e0], [4, 0x7a1d3a, 0x6aa8e0], [3, 0x111111, 0xe0601a], [0, 0xf2f2f2], [2, 0x0a7a35, 0x111111], [4, 0xe0601a, 0x111111],
];
// Rocketbox bodies keep their own face/skin texture (only a slight tint) and can
// keep their original clothes; these are the colours used for far impostors then.
const RB_BASE = {
  rb_female: { top: 0x8c8c8a, pants: 0x3b4d6e, shoes: 0x5a3a26, hair: 0x2a1a12 },
  rb_male_a: { top: 0x1e1f21, pants: 0x4a4332, shoes: 0xd8d8dc, hair: 0x0e0b09 },
  rb_male_b: { top: 0x3c4f6e, pants: 0x6f87a6, shoes: 0xe8e8e8, hair: 0x0e0b09 },
};
function skinnedOutfit(o, rng) {
  const pick = (a) => a[Math.floor(rng() * a.length)];
  o.gender = rng() < SHARE.female ? 'f' : 'm';
  const er = rng();
  o.ethnicity = er < SHARE.eu ? 'eu' : er < SHARE.eu + SHARE.af ? 'af' : 'na';
  // base body: original Michelle / Ready Player Me bodies (tinted to any
  // complexion) plus the Rocketbox people, whose face textures are brown-skinned
  const br = rng();
  if (o.ethnicity === 'eu') o.base = o.gender === 'f' ? 'michelle' : 'male';
  else o.base = o.gender === 'f' ? (br < 0.6 ? 'rb_female' : 'michelle') : br < 0.4 ? 'male' : br < 0.7 ? 'rb_male_a' : 'rb_male_b';
  o.skinTone = pick(SKIN_GROUPS[o.ethnicity]);
  o.skin = o.skinTone; // procedural fallback rig
  const tone = new THREE.Color(o.skinTone);
  o.skinMul = o.gender === 'f'
    ? new THREE.Color(tone.r / 0.45, tone.g / 0.29, tone.b / 0.2).multiplyScalar(0.92)
    : new THREE.Color(tone.r / 0.8, tone.g / 0.62, tone.b / 0.57);
  o.pants = o.top === 'psg' && rng() < 0.3 ? 0x132447 : pick(JEANS);
  o.shoes = pick(SHOES);
  o.pattern = 0;
  if (o.top === 'psg') { o.pattern = 1; o.topColor = 0x132447; o.pa = 0x132447; o.pb = 0xd4202f; o.pc = 0xf2f2f2; o.topBase = 0x132447; }
  else if (o.top === 'tee' && rng() < 0.55) {
    const f = pick(FOOTBALL); o.pattern = f[0]; o.topColor = f[1]; o.pa = f[1]; o.pb = f[2] ?? f[1]; o.topBase = f[1];
  } else o.topBase = o.top === 'hoodie' ? 0x000000 : o.topColor;
  o.accent = pick([0xd4202f, 0x2c6ef2, 0xf2f2f2, 0x16a34a, 0xf2c230, 0x111111]);
  o.hairStyle = o.ethnicity === 'af' ? pick(['buzz', 'buzz', 'curly', 'short', 'none']) : pick(['short', 'short', 'buzz', 'curly', 'short', 'none']);
  o.hairIdx = o.ethnicity === 'eu' ? Math.floor(rng() * 6) : Math.floor(rng() * 3);
  o.hair = [0x0f0b08, 0x1c140e, 0x2e2018, 0x4a3524, 0x6b5238, 0x111111][o.hairIdx];
  o.beard = o.gender === 'm' && rng() < 0.4;
  o.packColor = pick([0x1d1f22, 0x2a3a5a, 0x4a3a2a, 0x3a4a3a, 0x6a1d1d]);
  o.height = o.gender === 'f' ? 0.96 + rng() * 0.08 : 0.93 + rng() * 0.1;
  // garment layer over the base body + body shape
  const gr = rng();
  if (o.top === 'psg') { o.garment = 'shirt'; o.shellColor = 0x132447; o.shellPattern = 1; }
  else if (o.top === 'tee') {
    o.garment = 'shirt'; o.shellColor = o.topColor; o.shellPattern = o.pattern || 0;
    if (rng() < 0.3) { o.shellPattern = 6; o.pa = 0x0a7a35; o.pb = 0xf4f4f4; o.shellColor = 0xf4f4f4; } // Algeria-style shirt
  } else if (o.top === 'hoodie') { o.garment = gr < 0.75 ? 'hoodie' : 'puffer'; o.shellColor = o.topColor; o.shellPattern = 0; }
  else if (o.top === 'track') { o.garment = 'hoodie'; o.shellColor = o.topColor; o.shellPattern = 8; o.pa = o.stripe; o.pants = rng() < 0.7 ? 0x141416 : 0x3a3d42; }
  else if (o.smart) {
    // wool coat or pressed shirt, trousers, leather shoes
    const coat = gr < 0.65;
    o.garment = coat ? 'coat' : 'shirt'; o.shellPattern = 0;
    o.shellColor = coat ? pick(SMART_COATS) : pick(SMART_SHIRTS);
    o.topColor = o.topBase = o.shellColor;
    o.pants = pick([0x2a2a30, 0x3a3f4a, 0x8a7a5a, 0x22324a, 0x4a4a48, 0x1b1b20]);
    o.shoes = pick([0x4a2e1c, 0x151515, 0x3a2418, 0x222222]);
  }
  else { o.garment = gr < 0.4 ? 'puffer' : gr < 0.7 ? 'coat' : gr < 0.9 ? 'hoodie' : null; o.shellColor = o.topColor; o.shellPattern = 0; }
  if (o.garment === 'coat' && !o.smart) o.shellColor = pick([0x2a2622, 0x3a3226, 0x1b1d22, 0x4a4036, 0x22324a]);
  if (o.garment === 'puffer') o.shellColor = pick([0x111111, 0x1a1c22, 0x2a3a5a, 0x5a1a1a, 0x2f3b33, 0x8a7a5a, 0x6a6a70]);
  if (o.garment && rng() < 0.1) o.garment = null; // some keep the base outfit
  if (o.gender === 'f' && !o.garment) { o.garment = 'shirt'; o.shellColor = pick([0x111111, 0xf2f2f2, 0x7a1d3a, 0x2a3a5a]); o.shellPattern = 0; }
  const heavy = rng() < 0.25;
  o.body = {
    girth: heavy ? 1.08 + rng() * 0.1 : 0.95 + rng() * 0.07,
    chest: 0.97 + rng() * 0.08,
    shoulders: o.gender === 'f' ? 0.95 + rng() * 0.05 : 0.98 + rng() * 0.09,
    head: 0.96 + rng() * 0.07,
  };
  if (o.gender === 'f' && rng() < 0.2) { o.headscarf = pick([0x111111, 0x2a2a3a, 0x5a2a3a, 0xd8d0c0, 0x3a4a3a, 0x6a4a3a]); o.hat = 'none'; o.hood = false; }
  if (o.gender === 'f' && o.mask === 'balaclava') { o.mask = 'black'; o.hood = true; }
  const rb = RB_BASE[o.base];
  if (rb) {
    // darken / warm the face texture towards the drawn complexion
    // (linear-space multiplier: 0.5 reads as roughly 25% darker on screen)
    const v = o.ethnicity === 'af' ? 0.3 + rng() * 0.14 : o.base === 'rb_female' ? 0.42 + rng() * 0.12 : 0.72 + rng() * 0.2;
    const warm = (1 - v) * 0.6; // darker skin also gets a little warmer
    o.skinMul = new THREE.Color(v * (1 + warm * 0.15 + (rng() - 0.5) * 0.04), v * (1 - warm * 0.05), v * (1 - warm * 0.3 - rng() * 0.04));
    o.hair = rb.hair; o.hairStyle = 'none'; o.beard = false;
    if (o.base === 'rb_female' && o.hat === 'cap') o.hat = 'none'; // caps float on her long hair
    if (o.base === 'rb_male_a') { o.hat = 'none'; o.hood = false; if (o.mask === 'balaclava') o.mask = 'black'; } // his afro stays visible
    o.keepTop = !o.garment || rng() < 0.4;
    o.keepBottom = rng() < 0.5; o.keepShoes = rng() < 0.6;
    if (o.keepTop && !o.garment) { o.topColor = rb.top; o.pattern = 0; }
    if (o.keepBottom) o.pants = rb.pants;
    if (o.keepShoes) o.shoes = rb.shoes;
    if (o.base === 'rb_female' && o.garment === 'shirt' && rng() < 0.5) { o.garment = null; o.keepTop = true; o.topColor = rb.top; o.shellColor = undefined; o.shellPattern = 0; }
  }
}

// Build a rig. kind: 'civ' | 'police'. Uses skinned glTF humans when loaded,
// otherwise falls back to the procedural primitive rig below.
export function buildCharacter(world, outfit, kind = 'civ') {
  initShared(world);
  if (Humans.ready) return buildSkinned(outfit, kind);
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  const body = new THREE.Group(); // scaled container
  root.add(body);
  const s = outfit.height || 1;
  body.scale.set((outfit.build || 1) * s, s, s);
  const meshes = [];
  const mk = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = false; parent.add(m); meshes.push(m); return m; };

  const police = kind === 'police';
  const skin = colMat(outfit.skin || 0xd0a080);
  const topMat = police ? colMat(0x1a2233, { roughness: 0.7 }) : outfit.vest ? colMat(0xd8ec1a, { roughness: 0.6 }) : outfit.top === 'psg' ? M.psg[outfit.psg] : colMat(outfit.topColor);
  const sleeveMat = police ? colMat(0x1a2233, { roughness: 0.7 }) : outfit.top === 'psg' ? colMat(0x132447, { roughness: 0.6 }) : colMat(outfit.topColor);
  const pantsMat = police ? colMat(0x161c29) : colMat(outfit.pants);
  const shoeMat = police ? colMat(0x0b0b0b, { roughness: 0.5 }) : colMat(outfit.shoes);
  const armour = colMat(0x10141c, { roughness: 0.45, metalness: 0.2 });

  const hips = new THREE.Group(); hips.position.y = 0.93; body.add(hips);
  mk(G.pelvis, pantsMat, hips);
  const spine = new THREE.Group(); spine.position.y = 0.06; hips.add(spine);
  mk(police ? G.torsoBig : G.torso, police ? M.vest : topMat, spine);
  const neck = new THREE.Group(); neck.position.y = 0.53; spine.add(neck);
  mk(G.neck, skin, neck);
  const head = new THREE.Group(); head.position.y = 0.05; neck.add(head);
  mk(G.head, skin, head);

  if (police) {
    mk(G.helmet, colMat(0x0e1420, { roughness: 0.25, metalness: 0.4 }), head);
    const v = mk(G.visor, M.visor, head); v.castShadow = false;
    mk(G.scarf, colMat(0x111111), neck);
  } else {
    if (outfit.hood) mk(G.hood, colMat(outfit.topColor), head);
    else if (outfit.hat === 'cap') { mk(G.cap, colMat(outfit.hatColor), head); mk(G.brim, colMat(outfit.hatColor), head); }
    else if (outfit.hat === 'beanie') mk(G.cap, colMat(outfit.hatColor), head);
    else mk(G.hair, colMat(outfit.hair), head);
    if (outfit.mask === 'black') mk(G.mask, colMat(0x0c0c0c), head);
    else if (outfit.mask === 'white') mk(G.mask, colMat(0xdde3e6), head);
    if (outfit.scarf === 'keffiyeh') mk(G.scarf, M.keffiyeh, neck);
    else if (outfit.scarf === 'psg') mk(G.scarf, colMat(0xd4202f), neck);
  }
  if (outfit.backpack) mk(G.backpack, colMat(0x1d1f22), spine);

  const arm = (side) => {
    const sh = new THREE.Group(); sh.position.set(side * (police ? 0.25 : 0.235), 0.47, 0); spine.add(sh);
    mk(police ? G.upperArmBig : G.upperArm, sleeveMat, sh);
    if (police) { const p = mk(G.pad, armour, sh); p.position.set(side * 0.02, 0.0, 0); }
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    mk(G.forearm, outfit.longSleeve || police ? sleeveMat : skin, el);
    const hand = new THREE.Group(); hand.position.y = -0.27; el.add(hand);
    mk(G.hand, police ? colMat(0x0b0b0b) : skin, hand);
    return { sh, el, hand };
  };
  const L = arm(1), Rr = arm(-1);
  const leg = (side) => {
    const hip = new THREE.Group(); hip.position.set(side * 0.1, -0.04, 0); hips.add(hip);
    mk(G.thigh, pantsMat, hip);
    const kn = new THREE.Group(); kn.position.y = -0.44; hip.add(kn);
    mk(G.shin, pantsMat, kn);
    if (police) mk(G.shinGuard, armour, kn);
    const ft = new THREE.Group(); ft.position.y = -0.42; kn.add(ft);
    mk(G.foot, shoeMat, ft);
    return { hip, kn, ft };
  };
  const LL = leg(1), RL = leg(-1);

  const rig = {
    root, body, hips, spine, neck, head,
    shL: L.sh, elL: L.el, handL: L.hand, shR: Rr.sh, elR: Rr.el, handR: Rr.hand,
    hipL: LL.hip, knL: LL.kn, hipR: RL.hip, knR: RL.kn,
    meshes, pose: newPose(), item: null, itemType: 'none', phase: Math.random() * 6.28,
  };

  // hostile threat ring
  const ring = new THREE.Mesh(G.ring, M.ring);
  ring.visible = false; ring.renderOrder = 2;
  root.add(ring);
  rig.ring = ring;
  return rig;
}

// ---------------------------------------------------------------- skinned
let HG = null;
function hairGeo() {
  if (HG) return HG;
  const sphere = (r, phi, sx, sy, sz, ty, tz) => { const g = new THREE.SphereGeometry(r, 18, 12, 0, Math.PI * 2, 0, phi); g.scale(sx, sy, sz); g.translate(0, ty, tz); return g; };
  HG = {
    short: sphere(0.104, Math.PI * 0.52, 0.94, 0.98, 1.06, 0.022, -0.012),
    buzz: sphere(0.1, Math.PI * 0.47, 0.93, 0.95, 1.04, 0.028, -0.008),
    curly: (() => { const g = new THREE.IcosahedronGeometry(0.115, 2); g.scale(0.95, 0.85, 1.05); g.translate(0, 0.04, -0.015); return g; })(),
    cap: sphere(0.108, Math.PI * 0.5, 0.96, 0.9, 1.06, 0.032, -0.006),
    brim: (() => { const g = new THREE.CylinderGeometry(0.1, 0.1, 0.012, 16, 1, false, -Math.PI * 0.5, Math.PI); g.translate(0, 0.035, 0.07); return g; })(),
    beanie: sphere(0.112, Math.PI * 0.56, 0.97, 1.08, 1.06, 0.02, -0.01),
    balaclava: (() => { const g = new THREE.SphereGeometry(0.109, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.4); g.scale(0.97, 1.02, 1.08); g.translate(0, 0.03, -0.008); return g; })(),
    balaclavaBack: (() => { const g = new THREE.SphereGeometry(0.107, 18, 10, Math.PI * 0.6, Math.PI * 0.8, Math.PI * 0.35, Math.PI * 0.55); g.scale(0.98, 1.05, 1.08); return g; })(),
    hood: (() => { const g = new THREE.SphereGeometry(0.135, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.66); g.scale(1, 1.05, 1.12); g.translate(0, 0.0, -0.035); return g; })(),
    mask: (() => { const g = new THREE.SphereGeometry(0.1, 16, 8, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.52, Math.PI * 0.3); g.scale(1.0, 1.05, 1.08); return g; })(),
    scarf: (() => { const g = new THREE.TorusGeometry(0.075, 0.03, 8, 18); g.rotateX(Math.PI / 2); g.scale(1.05, 1, 1.1); return g; })(),
    pack: (() => { const g = new THREE.BoxGeometry(0.3, 0.38, 0.15, 2, 2, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); p.setZ(i, z * (1 - Math.abs(p.getY(i)) * 0.6)); } g.computeVertexNormals(); return g; })(),
    patch: new THREE.PlaneGeometry(0.26, 0.08),
  };
  return HG;
}
const fabric = (hex, rough = 0.95) => colMat(hex, { roughness: rough });

function buildSkinned(outfit, kind) {
  const police = kind === 'police';
  let rig;
  const H = hairGeo();
  if (police) {
    rig = createHuman('soldier', { height: outfit.height || 1.0, build: outfit.build || 1 }, { style: 1, idle: 'idle2' });
    const back = new THREE.Mesh(H.patch, M.policeText);
    back.position.set(0, 0.08, -0.17); back.rotation.y = Math.PI; back.scale.setScalar(1.25);
    rig.chest.add(back);
    const front = new THREE.Mesh(H.patch, M.policeText);
    front.position.set(0.07, 0.06, 0.17); front.scale.setScalar(0.5);
    rig.chest.add(front);
  } else {
    const female = outfit.gender === 'f';
    rig = createHuman(outfit.base || (female ? 'michelle' : 'male'), outfit);
    const rbBody = /^rb_/.test(rig.kind);
    const add = (geo, mat, parent, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; parent.add(m); rig.meshes.push(m); return m; };
    if (!female) {
      if (outfit.hood) { const h = add(H.hood, fabric(outfit.topColor), rig.head); if (rbBody) { h.rotation.x = -0.45; h.position.set(0, 0.012, -0.02); } }
      else if (outfit.hat === 'cap') { add(H.cap, fabric(outfit.hatColor, 0.8), rig.head); add(H.brim, fabric(outfit.hatColor, 0.8), rig.head); }
      else if (outfit.hat === 'beanie') add(H.beanie, fabric(outfit.hatColor), rig.head);
      else if (outfit.hairStyle !== 'none' && !rbBody) add(H[outfit.hairStyle] || H.short, M.hair[outfit.hairIdx], rig.head);
    } else {
      if (outfit.hat === 'cap') { const k = rbBody ? 1.04 : 1.12; const c = add(H.cap, fabric(outfit.hatColor, 0.8), rig.head); c.scale.setScalar(k); const b = add(H.brim, fabric(outfit.hatColor, 0.8), rig.head); b.scale.setScalar(k); }
      else if (outfit.hood) { const h = add(H.hood, fabric(0x111214), rig.head); h.scale.setScalar(1.15); if (rbBody) { h.rotation.x = -0.62; h.position.set(0, 0.03, -0.05); } }
      else if (outfit.headscarf) {
        const h = add(H.hood, fabric(outfit.headscarf), rig.head); h.scale.set(1.2, 1.18, 1.18);
        if (rbBody) { h.rotation.x = -0.62; h.position.set(0, 0.03, -0.05); }
        const d = add(H.scarf, fabric(outfit.headscarf), rig.chest); d.position.set(0, 0.17, 0.0); d.scale.set(1.35, 1.6, 1.35);
      }
    }
    if (outfit.mask !== 'none') {
      const mc = { black: 0x0b0b0c, balaclava: 0x0b0b0c, surgical: 0x9ec9de, white: 0xdfe4e6 }[outfit.mask];
      const mm = add(H.mask, outfit.mask === 'keffiyeh' ? M.keffiyeh : fabric(mc ?? 0xdfe4e6, mc === 0x0b0b0c ? 0.95 : 0.9), rig.head, false);
      if (female) mm.scale.setScalar(1.08);
      if (rbBody) mm.position.set(0, female ? -0.05 : -0.045, 0.012); // Rocketbox faces sit lower in the head socket
      if (outfit.mask === 'surgical') mm.scale.set(0.97, 0.85, 1.02);
      // balaclava: knitted cover over the crown and back of the head, leaving an eye slot
      if (outfit.mask === 'balaclava' && !outfit.hood) { for (const geo of [H.balaclava, H.balaclavaBack]) { const b = add(geo, fabric(0x0b0b0c), rig.head); if (female) b.scale.setScalar(1.08); } }
    }
    if (outfit.scarf !== 'none') {
      const sc = add(H.scarf, outfit.scarf === 'keffiyeh' ? M.keffiyeh : fabric(outfit.scarf === 'psg' ? 0x132447 : 0x7a1d1d), rig.chest);
      sc.position.set(0, female ? 0.17 : 0.22, 0.005);
    }
    if (outfit.backpack) {
      const p = add(H.pack, fabric(outfit.packColor || 0x1d1f22, 0.8), rig.chest);
      p.position.set(0, -0.02, -0.19);
    }
  }
  const ring = new THREE.Mesh(G.ring, M.ring);
  ring.visible = false; ring.renderOrder = 2;
  rig.root.add(ring);
  rig.ring = ring;
  rig.pose = newPose();
  return rig;
}

export function addPoliceGear(rig) {
  // baton in right hand
  const baton = new THREE.Group();
  const b = new THREE.Mesh(G.baton, colMat(0x0a0a0a, { roughness: 0.4 })); b.castShadow = true;
  const h = new THREE.Mesh(G.batonHandle, colMat(0x0a0a0a, { roughness: 0.4 }));
  baton.add(b, h);
  baton.position.set(0, -0.07, 0.02);
  baton.rotation.x = rig.skinned ? -1.0 : 1.15; // extends from the fist (thumb side)
  rig.gripR = true;
  rig.handR.add(baton);
  rig.baton = baton;
  // shield on the torso (blended between carry and block positions)
  const shield = new THREE.Mesh(G.shield, M.shield);
  shield.renderOrder = 3;
  rig.spine.add(shield);
  rig.shield = shield;
  rig.shieldBlend = 0;
  updateShield(rig, 0);
}

export function updateShield(rig, k) {
  const s = rig.shield; if (!s) return;
  if (rig.skinned) {
    // carry: slung on the left side; block: raised in front of the chest
    s.position.set(0.36 * (1 - k) + 0.1 * k, 0.0 * (1 - k) + 0.36 * k, 0.02 * (1 - k) + 0.46 * k);
    s.rotation.set(0.05 * (1 - k) - 0.05 * k, (Math.PI / 2 - 0.12) * (1 - k) + 0.1 * k, 0);
    return;
  }
  // carry: hanging from left forearm at the side; block: raised in front of chest
  s.position.set(0.34 * (1 - k) + 0.08 * k, -0.02 * (1 - k) + 0.3 * k, 0.04 * (1 - k) + 0.42 * k);
  s.rotation.set(0.05 * (1 - k), (Math.PI / 2 - 0.15) * (1 - k) + 0.12 * k, 0);
}

// Improvised-shield placement in the spine frame (+z forward, +x the character's left):
// [position, rotation]. Large, clear differences so the open state reads at a glance.
export const SHIELD_POSE = {
  guard: [new THREE.Vector3(0.1, 0.28, 0.36), new THREE.Euler(0, 0, 0)],
  wind: [new THREE.Vector3(0.22, 0.34, 0.18), new THREE.Euler(0, 0.6, 0)],
  strike: [new THREE.Vector3(0.04, 0.34, 0.62), new THREE.Euler(-0.1, 0, 0)],
  open: [new THREE.Vector3(0.36, -0.08, 0.2), new THREE.Euler(1.0, 0.5, 0.5)],
};

export function giveItem(rig, type, rng = Math.random, variant = 'pal') {
  initShared();
  clearItem(rig);
  const g = new THREE.Group();
  rig.itemType = type;
  rig.itemVariant = type === 'frflag' ? 'fr' : type === 'flag' || type === 'bigflag' ? variant : null; // which flag (used by the dev appearance audit)
  if (type === 'flag' || type === 'frflag') {
    g.add(new THREE.Mesh(G.pole, colMat(0x6a5a40)));
    const v = type === 'frflag' ? 'fr' : variant;
    const cloth = new THREE.Mesh(G.flag, v === 'fr' ? M.frFlag : v === 'uni' ? M.uniFlag : v === 'alg' ? M.algFlag : M.palFlag);
    cloth.position.set(0, -0.76, 0); cloth.rotation.x = Math.PI; // local -Y is 'up' when the arm is raised
    g.add(cloth);
    rig.handR.add(g);
  } else if (type === 'bigflag') {
    g.add(new THREE.Mesh(G.bigPole, colMat(0x3a3a3a)));
    const cloth = new THREE.Mesh(G.bigFlag, variant === 'fr' ? M.frFlagBig : variant === 'uni' ? M.uniFlagBig : variant === 'alg' ? M.algFlagBig : M.palFlagBig);
    cloth.position.set(0, -2.25, 0); cloth.rotation.x = Math.PI;
    g.add(cloth);
    g.position.set(0, 0.25, 0); // hands lower on the pole
    rig.handR.add(g);
  } else if (type === 'placard') {
    g.add(new THREE.Mesh(G.pole, colMat(0x8a6a45)));
    const m = M.placards[Math.floor(rng() * M.placards.length)];
    // two back-to-back boards so the text reads from the front and behind when the arm is raised
    const front = new THREE.Mesh(G.placard, m); front.position.set(0, -0.92, -0.01); front.rotation.set(0, Math.PI, Math.PI);
    const back = new THREE.Mesh(G.placard, m); back.position.set(0, -0.92, 0.01); back.rotation.set(0, 0, Math.PI);
    g.add(front, back);
    rig.handR.add(g);
  } else if (type === 'phone') {
    const p = new THREE.Mesh(G.phone, M.phoneScreen);
    p.position.set(0, -0.09, 0.04); p.rotation.x = -0.3;
    g.add(p);
    rig.handR.add(g);
  } else if (type === 'banner') {
    const m = M.banners[Math.floor(rng() * M.banners.length)];
    const b = new THREE.Mesh(G.banner, m); b.castShadow = true;
    b.position.set(0, 0.32, 0.5);
    g.add(b);
    const p1 = new THREE.Mesh(G.pole, colMat(0x8a6a45)); p1.position.set(1.15, 0.9, 0.5); g.add(p1);
    const p2 = new THREE.Mesh(G.pole, colMat(0x8a6a45)); p2.position.set(-1.15, 0.9, 0.5); g.add(p2);
    rig.spine.add(g);
  } else if (type === 'bottle') {
    const bt = new THREE.Mesh(G.bottle, M.bottle);
    const rag = new THREE.Mesh(G.rag, M.rag);
    g.add(bt, rag);
    g.position.set(0, -0.1, 0.03); g.rotation.x = Math.PI; // neck pointing along the forearm
    rig.handR.add(g);
    rig.wick = new THREE.Object3D(); rig.wick.position.set(0, 0.2, 0); g.add(rig.wick);
  } else if (type === 'camera') {
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.08), colMat(0x111111, { roughness: 0.4 }));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.09, 12), colMat(0x1a1a1a, { roughness: 0.25, metalness: 0.6 }));
    lens.rotation.x = Math.PI / 2; lens.position.set(0, 0, 0.08);
    cam.add(lens);
    cam.position.set(-0.04, -0.06, 0.06);
    g.add(cam);
    rig.handR.add(g);
  } else if (type === 'loot') {
    // held in both arms against the chest
    const it = G.loot[Math.floor(rng() * G.loot.length)];
    g.add(new THREE.Mesh(it.geo, colMat(it.color, { roughness: 0.7 })));
    g.position.set(0, rig.skinned ? 0.27 : 0.25, rig.skinned ? 0.28 : 0.28);
    rig.spine.add(g);
  } else if (type === 'flare') {
    // lit road flare: red emissive tip (picked up by the bloom); sparks are spawned by the holder's script
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), colMat(0x8a1010, { roughness: 0.6 }));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff5040, emissive: 0xff2a10, emissiveIntensity: 9 }));
    tip.position.y = -0.17;
    g.add(stick, tip);
    g.position.set(0, -0.06, 0.03);
    rig.handR.add(g);
    rig.flareTip = tip;
  } else if (type === 'impshield') {
    // improvised shield on the left hand: a plywood board, a torn-down road sign or a bin lid
    const s = new THREE.Group();
    if (variant === 'sign') {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.02, 24), colMat(0xc8161d, { roughness: 0.5, metalness: 0.3 }));
      disc.rotation.x = Math.PI / 2;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.025), colMat(0xf2f2f2, { roughness: 0.5 }));
      bar.position.z = 0.004;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), colMat(0x8a8f94, { roughness: 0.4, metalness: 0.6 }));
      pole.position.set(0, -0.55, -0.02);
      s.add(disc, bar, pole);
    } else if (variant === 'heavy') {
      // the Enforcer's reinforced shield: a steel plate bolted to a board, with straps
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.12, 0.04), colMat(0x3a3d42, { roughness: 0.55, metalness: 0.5 }));
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.07, 0.06), colMat(0x1d1f22, { roughness: 0.6, metalness: 0.4 }));
      band.position.set(0, 0.32, 0.02);
      const band2 = band.clone(); band2.position.y = -0.32;
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), colMat(0x0a0a0a));
      slit.position.set(0, 0.42, 0.02);
      s.add(plate, band, band2, slit);
    } else if (variant === 'door') {
      // the Leader's shield: a car door torn off a burnt-out car
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.62, 0.06), colMat(0x5a1a18, { roughness: 0.45, metalness: 0.4 }));
      panel.position.y = -0.12;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.38, 0.04), colMat(0x121212, { roughness: 0.3, metalness: 0.5 }));
      frame.position.y = 0.36;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), colMat(0x8a8f94, { metalness: 0.7, roughness: 0.3 }));
      handle.position.set(-0.28, 0.0, 0.04);
      s.add(panel, frame, handle);
    } else if (variant === 'lid') {
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.78, 0.05), colMat(0xd8b52a, { roughness: 0.7 }));
      const lip = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 0.09), colMat(0xc8a520, { roughness: 0.7 }));
      lip.position.set(0, 0.39, 0.02);
      s.add(lid, lip);
    } else {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.86, 0.025), colMat(0xa8835a, { roughness: 0.95 }));
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.04), colMat(0x6a5038, { roughness: 0.95 }));
      slat.position.set(0, 0.2, 0.02);
      const slat2 = slat.clone(); slat2.position.y = -0.22;
      s.add(board, slat, slat2);
    }
    // carried across the body in front of the torso; the crowd moves it per state
    // (raised guard, drawn back, driven forward, dropped during the recovery)
    g.add(s);
    g.position.copy(SHIELD_POSE.guard[0]);
    rig.spine.add(g);
  } else if (type === 'stone') {
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06), colMat(0x6a6660));
    st.position.set(0, -0.1, 0.03); g.add(st);
    rig.handR.add(g);
  }
  rig.item = g;
  rig.gripR = !!rig.baton || !!rig.axe || ['flag', 'frflag', 'bigflag', 'placard', 'phone', 'bottle', 'stone', 'camera', 'loot', 'flare'].includes(type);
  rig.gripL = type === 'bigflag' || type === 'loot' || type === 'impshield';
  g.traverse((o) => { if (o.isMesh) o.castShadow = type === 'banner' || type === 'placard' || type === 'bigflag' || type === 'loot' || type === 'impshield'; });
  return g;
}

// The Leader's fire axe, held in the right hand alongside his shield (it is not the
// rig's single 'item' slot). Oriented like the police baton: extends from the fist.
export function attachFireAxe(rig) {
  initShared();
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.92, 8), colMat(0x1a1a1a, { roughness: 0.5 }));
  handle.position.y = -0.34;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.2, 8), colMat(0xd8b52a, { roughness: 0.6 }));
  grip.position.y = 0.0;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.26), colMat(0xb81414, { roughness: 0.4, metalness: 0.4 }));
  head.position.set(0, -0.76, 0.06);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.08), colMat(0xc8ccd0, { roughness: 0.25, metalness: 0.8 }));
  blade.position.set(0, -0.76, 0.21);
  const pick = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 6), colMat(0xb81414, { roughness: 0.4, metalness: 0.4 }));
  pick.rotation.x = -Math.PI / 2; pick.position.set(0, -0.76, -0.13);
  g.add(handle, grip, head, blade, pick);
  g.rotation.x = rig.skinned ? -1.0 : 1.15;
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  rig.handR.add(g);
  rig.axe = g; rig.gripR = true;
  return g;
}
export function removeFireAxe(rig) { if (rig.axe) { rig.axe.parent && rig.axe.parent.remove(rig.axe); rig.axe = null; } }

// Compile the shaders of props that first appear mid-level (Level 2's shields and flare)
// while the level loads, so their first appearance does not stall a frame.
export function prewarmItems(renderer, scene, camera, types) {
  const holder = new THREE.Group();
  holder.position.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3));
  for (const [type, variant] of types) {
    const rig = { spine: new THREE.Group(), handL: new THREE.Group(), handR: new THREE.Group(), skinned: true };
    holder.add(rig.spine, rig.handL, rig.handR);
    if (type === 'axe') attachFireAxe(rig); else giveItem(rig, type, Math.random, variant);
  }
  scene.add(holder);
  renderer.compile(scene, camera);
  scene.remove(holder);
}

export function clearItem(rig) {
  if (rig.item) { rig.item.parent && rig.item.parent.remove(rig.item); rig.item = null; }
  rig.gripR = !!rig.baton || !!rig.axe; rig.gripL = false;
  rig.itemType = 'none'; rig.itemVariant = null; rig.flareTip = null;
  rig.wick = null;
}

// -------------------------------------------------------------------- poses
const KEYS = ['mouth', 'smile', 'brow', 'y', 'lean', 'spX', 'spY', 'spZ', 'hdX', 'hdY', 'shLX', 'shLY', 'shLZ', 'elL', 'shRX', 'shRY', 'shRZ', 'elR', 'hpLX', 'hpLZ', 'knL', 'hpRX', 'hpRZ', 'knR', 'tiltX', 'tiltZ', 'itemZ', 'itemX'];
export function newPose() { const p = {}; for (const k of KEYS) p[k] = 0; return p; }

// Locomotion + idle base layer. speed in m/s.
export function baseLayer(P, rig, speed, t, dt, combat = false) {
  const s = Math.min(1, speed / 6.5);
  rig.phase += dt * (speed * 1.75 + (speed > 0.15 ? 2.2 : 0));
  if (rig.skinned) {
    // locomotion comes from motion capture; only add a guarded stance
    rig.speed = speed;
    if (combat) { P.knL = P.knR = 0.18; P.hpLX = P.hpRX = -0.1; P.y = -0.025; P.spX = 0.08; }
    return;
  }
  const ph = rig.phase;
  const moving = speed > 0.15;
  const amp = moving ? 0.35 + s * 0.65 : 0;
  P.hpLX = -Math.sin(ph) * amp * 0.85;
  P.hpRX = Math.sin(ph) * amp * 0.85;
  P.knL = moving ? 0.1 + Math.max(0, -Math.cos(ph)) * amp * 1.5 : 0.04;
  P.knR = moving ? 0.1 + Math.max(0, Math.cos(ph)) * amp * 1.5 : 0.04;
  P.shLX = Math.sin(ph) * amp * 0.75;
  P.shRX = -Math.sin(ph) * amp * 0.75;
  P.elL = -0.25 - amp * 0.9;
  P.elR = -0.25 - amp * 0.9;
  P.shLZ = 0.07; P.shRZ = -0.07;
  P.y = moving ? -Math.abs(Math.cos(ph)) * 0.05 * amp + 0.015 * amp : Math.sin(t * 1.6 + rig.phase) * 0.004;
  P.spX = moving ? 0.06 + s * 0.22 : Math.sin(t * 1.3 + rig.phase) * 0.015;
  P.spY = moving ? Math.sin(ph) * 0.12 * amp : 0;
  P.hdX = -P.spX * 0.6;
  if (combat && !moving) { P.knL = P.knR = 0.25; P.hpLX = P.hpRX = -0.12; P.y = -0.04; P.spX = 0.12; }
}

// Apply target pose with smoothing.
export function applyPose(rig, P, dt, rate = 14) {
  const cur = rig.pose;
  const k = 1 - Math.exp(-dt * rate);
  for (const key of KEYS) cur[key] += (P[key] - cur[key]) * k;
  if (rig.skinned) { updateHuman(rig, cur, dt, rig.lodFull !== false); return; }
  const c = cur;
  rig.hips.position.y = 0.93 + c.y;
  rig.hips.rotation.x = c.lean;
  rig.spine.rotation.set(c.spX, c.spY, c.spZ);
  rig.head.rotation.set(c.hdX, c.hdY, 0);
  rig.shL.rotation.set(c.shLX, c.shLY, c.shLZ);
  rig.shR.rotation.set(c.shRX, c.shRY, c.shRZ);
  rig.elL.rotation.x = c.elL;
  rig.elR.rotation.x = c.elR;
  rig.hipL.rotation.set(c.hpLX, 0, c.hpLZ);
  rig.hipR.rotation.set(c.hpRX, 0, c.hpRZ);
  rig.knL.rotation.x = c.knL;
  rig.knR.rotation.x = c.knR;
  rig.root.rotation.x = c.tiltX;
  rig.root.rotation.z = c.tiltZ;
  if (rig.item && (rig.itemType === 'bigflag' || rig.itemType === 'flag' || rig.itemType === 'placard')) {
    rig.item.rotation.z = c.itemZ;
    rig.item.rotation.x = c.itemX;
  }
}

// Crouch helper (picking something up, kneeling)
export function crouch(P, k) {
  P.hpLX = P.hpRX = -1.2 * k;
  P.knL = P.knR = 2.0 * k;
  P.y = -0.36 * k;
  P.spX = 0.5 * k;
}

// Lying down: dir = +1 fall forward (face down), -1 fall backward.
export function lying(P, dir, k, t) {
  P.tiltX = dir * 1.5 * k;
  P.y = 0.05 * k - 0.0;
  P.spX = 0; P.spY = 0;
  P.shLZ = 0.9 * k; P.shRZ = -0.9 * k; P.shLX = -0.3 * k; P.shRX = 0.2 * k;
  P.elL = -0.5 * k; P.elR = -0.4 * k;
  P.hpLX = -0.15 * k; P.hpRX = 0.1 * k; P.hpLZ = 0.15 * k; P.hpRZ = -0.1 * k;
  P.knL = 0.3 * k; P.knR = 0.1 * k;
  P.hdX = -0.2 * dir * k + Math.sin(t * 2) * 0.03;
}

export function setRingVisible(rig, on, mat) {
  rig.ring.visible = on;
  if (on && mat) rig.ring.material = mat === 'amber' ? M.ringBlue : M.ring;
}

export function getShared() { return { G, M }; }

```

## src/cinematic.js

```js
// Short, skippable camera sequences (Level 2 introductions and the victory).
//
// A cinematic is a list of shots. Each shot eases from pose `a` to pose `b`
// ({ pos, look, fov }), given as functions so they can follow moving characters;
// the pose 'rig' is the normal over-the-shoulder camera of that frame, so a shot can
// blend back into gameplay. The world keeps running underneath (in game time, so
// seeded runs stay reproducible); the player's controls are ignored and the player
// cannot be hurt. Space, Enter, a click or a tap skips (after a short grace period).
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const ease = (u) => u * u * (3 - 2 * u);
const _p = new THREE.Vector3(), _l = new THREE.Vector3();

export class Cinematic {
  // o: { id, shots: [{ dur, a, b }], title, sub, titleAt: [from, to], line, lineAt, onDone, sting }
  constructor(game, o) {
    this.g = game; this.o = o; this.id = o.id;
    this.t = 0;
    this.total = o.shots.reduce((s, sh) => s + sh.dur, 0);
  }

  begin() {
    const o = this.o;
    $('cine').classList.remove('hidden');
    $('cine-title').textContent = o.title || ''; $('cine-sub').textContent = o.sub || '';
    $('cine-line').textContent = o.line || '';
    $('cine-card').classList.remove('show'); $('cine-line').classList.remove('show');
    $('app').classList.add('cine-on');
    if (o.sting) this.g.audio.music.sting(o.sting);
    return this;
  }

  // rig: the follow camera's pose this frame ({ pos, look, fov })
  update(dt, rig) {
    const o = this.o, cam = this.g.camera;
    this.t += dt;
    if (this.t >= this.total) return this.finish(false);
    let t0 = 0, sh = o.shots[0];
    for (const s of o.shots) { if (this.t < t0 + s.dur) { sh = s; break; } t0 += s.dur; }
    const u = ease(Math.min(1, (this.t - t0) / sh.dur));
    const A = sh.a === 'rig' ? rig : sh.a(), B = sh.b === 'rig' ? rig : sh.b();
    _p.lerpVectors(A.pos, B.pos, u); _l.lerpVectors(A.look, B.look, u);
    cam.position.copy(_p); cam.lookAt(_l);
    const fov = A.fov + (B.fov - A.fov) * u;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const ta = o.titleAt || [0.3, this.total - 0.3], la = o.lineAt || [0.6, this.total - 0.2];
    $('cine-card').classList.toggle('show', !!o.title && this.t >= ta[0] && this.t < ta[1]);
    $('cine-line').classList.toggle('show', !!o.line && this.t >= la[0] && this.t < la[1]);
  }

  skip() { if (this.t > 0.3) this.finish(true); }

  // end (or cancel) the sequence and hand the camera back
  finish(skipped, silent = false) {
    if (this.done) return;
    this.done = true;
    $('cine').classList.add('hidden');
    $('app').classList.remove('cine-on');
    const g = this.g;
    g.cinematic = null;
    g.cameraRig.fov = g.camera.fov; // eases back to the gameplay field of view
    g.cameraRig.smoothPivot = null;
    if (!silent && this.o.onDone) this.o.onDone(skipped);
  }
}

// Shot helpers ------------------------------------------------------------------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const head = (n, h = 1.5) => V(n.pos.x, n.pos.y + h, n.pos.z);

// a fixed spot in front of a character, low, looking up at them
export function frontOf(n, dist, height, side = 0, fov = 50) {
  return () => {
    const f = V(Math.sin(n.heading), 0, Math.cos(n.heading)), r = V(f.z, 0, -f.x);
    return { pos: head(n, height).addScaledVector(f, dist).addScaledVector(r, side), look: head(n, 1.35), fov };
  };
}

// circling a point (another character, or the midpoint of two), radius r
export function orbit(center, r, height, angle, fov = 48, lookH = 1.3) {
  return () => {
    const c = center();
    return { pos: V(c.x + Math.sin(angle) * r, c.y + height, c.z + Math.cos(angle) * r), look: V(c.x, c.y + lookH, c.z), fov };
  };
}

// from behind the officer, zoomed onto a distant character (a telephoto look)
export function overShoulderAt(player, target, fov) {
  return () => {
    const d = V(target.pos.x - player.pos.x, 0, target.pos.z - player.pos.z).normalize(), r = V(d.z, 0, -d.x);
    return { pos: head(player, 1.8).addScaledVector(d, -1.6).addScaledVector(r, -0.6), look: head(target, 1.4), fov };
  };
}

```

## src/crowd.js

```js
// Crowd simulation: per-agent state machines, perception with reaction delays,
// panic contagion, steering/avoidance, spatial hashing and distance-based LOD.
import * as THREE from 'three';
import { SHIELD_POSE, buildCharacter, randomOutfit, policeOutfit, giveItem, clearItem, newPose, baseLayer, applyPose, crouch, lying, setRingVisible, addPoliceGear, updateShield } from './characters.js';
import { mulberry } from './textures.js';
import { LAYOUT } from './world.js';
import { Humans } from './humans.js';
import { FarCrowd, outfitColors } from './impostors.js';

const LOD_FAR = 34;   // beyond this, agents are drawn as instanced impostors
const LOD_MID = 20;   // beyond this, skeletal animation runs at a reduced rate
const MAX_SKINNED = 20; // hard cap on fully rigged agents drawn at once

const V = () => new THREE.Vector3();
const tmp = V(), tmp2 = V();
const AGGRO_STATES = new Set(['pursue', 'atk_wind', 'atk_strike', 'atk_rec', 'circle', 'throw_prep', 'throw_wind', 'throw_rel', 'bomb_retrieve', 'bomb_light', 'bomb_wind', 'bomb_throw']);
const DISABLED = new Set(['stagger', 'down', 'recover', 'arrested']);

function angleLerp(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}
function headingTo(from, to) { return Math.atan2(to.x - from.x, to.z - from.z); }

// Looting crews work shop fronts along the boulevard: [side, z]. Each crew
// breaks into a shop, carries goods off, sets it alight and moves on.
const LOOT_SITES = [[-1, 98], [1, 92], [-1, 40], [1, 12], [-1, -52], [1, -78], [-1, -138], [1, -142]];
const CREW_SIZE = 4;
// Extra crews working the Level 2 route (added when Level 2 first loads; inactive in Level 1)
const RESERVE_SITES = [[-1, -64], [1, -38], [-1, 30], [1, 50]];
const CIVILIANS = 16;
const CROSS = LAYOUT.crossStreets;
// Shield-carrier (Level 2): an improvised shield blocks baton strikes from the front.
// Openings: the recovery after its shield bash, or getting round its side.
export const SHIELD = {
  guardCos: 0.42,   // blocks strikes arriving within ~65 degrees of where it faces
  turnRate: 2.6,    // rad/s while guarding: a sprinting officer can get round it
  speed: 2.8,       // advance speed (m/s)
  bashWind: 0.75,   // telegraph: shield drawn back, amber ring (s)
  bashRec: 1.1,     // shield lowered after the bash: the opening (s)
  bashDamage: 10, bashPush: 5,
  hp: 3,
};

const ACTIVITIES = [
  ['chant', 0.17], ['flag', 0.19], ['bigflag', 0.09], ['placard', 0.13], ['film', 0.09], ['banner', 0.04], ['shout', 0.07], ['wander', 0.07], ['clap', 0.05], ['watch', 0.06], ['photo', 0.04],
];

export class Crowd {
  constructor(game, count = 52) {
    this.game = game;
    this.world = game.world;
    this.scene = game.scene;
    this.rng = mulberry(4242);
    this.npcs = [];
    this.police = [];
    this.grid = new Map();
    this.time = 0;
    this.count = count;
    this.maxSkinned = MAX_SKINNED;
    for (let i = 0; i < count; i++) this._spawn(randomOutfit(this.rng));
    // looting crews, and passers-by caught up in the violence
    this.crews = LOOT_SITES.map(([side, z], i) => ({ id: i, side, z0: z, home: z, door: V(), rally: V(), members: [] }));
    for (const c of this.crews) for (let k = 0; k < CREW_SIZE; k++) { const n = this._spawn(randomOutfit(this.rng)); n.kind = 'looter'; n.crew = c; c.members.push(n); }
    for (let k = 0; k < CIVILIANS; k++) this._spawn(randomOutfit(this.rng)).kind = 'civilian';
    // far-distance instanced crowd (distant agents + background population)
    if (Humans.ready) {
      this.far = new FarCrowd(this.scene, 640);
      this._buildBackground();
      if (this.world.impostors) this.world.impostors.mesh.visible = false;
    }
    // friendly CRS line + cut-off officers for incident 3
    const positions = [];
    for (let x = -9; x <= 9; x += 2.6) if (Math.abs(x - 0.4) > 1.5) positions.push([x, 125.5, 'line']);
    positions.push([-3.2, -114.5, 'injured'], [-1.6, -113.6, 'guard'], [-4.6, -113.2, 'guard'], [-6.2, -112.4, 'guard']);
    // CRS squads by the vans and along the pavement
    positions.push([-11, 132.5, 'squad'], [-12.6, 134, 'squad'], [11.2, 132.5, 'squad'], [12.6, 134.2, 'squad'], [-3.5, 139.5, 'squad'], [4.8, 140.5, 'squad']);
    for (const [x, z, role] of positions) {
      const rig = buildCharacter(this.world, policeOutfit(this.rng), 'police');
      addPoliceGear(rig);
      this.scene.add(rig.root);
      this.police.push({ rig, pos: new THREE.Vector3(x, 0, z), heading: role === 'line' ? Math.PI : 0, role, flinch: 0, hp: 1 });
    }
    this.reset();
  }

  _spawn(outfit) {
    const rig = buildCharacter(this.world, outfit, 'civ');
    this.scene.add(rig.root);
    const n = { id: this.npcs.length, rig, outfit, pos: V(), vel: V(), knock: V(), anchor: V(), target: V(), focus: V(), stimuli: [], colors: Humans.ready ? outfitColors(outfit) : null };
    this.npcs.push(n);
    return n;
  }

  pickActivity() {
    let r = this.rng(), acc = 0;
    for (const [a, w] of ACTIVITIES) { acc += w; if (r < acc) return a; }
    return 'chant';
  }

  reset() {
    this.time = 0;
    const gps = this.world.gatherPoints;
    this.lastScream = -9;
    for (const c of this.crews) { if (c.reserve && !this.reserveOn) continue; c.z0 = c.home; this._placeCrew(c); c.burns = 0; c.burnT = 8 + this.rng() * 25; }
    this.npcs.forEach((n, i) => {
      if (n.special) { this.retire(n); return; } // scripted characters are placed by their level
      if (n.crew && n.crew.reserve && !this.reserveOn) { this.retire(n); n.temperament = 'reserve'; return; } // Level 2 crews
      // first third clusters near the police line so the player starts with a crowd in view
      const gp = i < 34 ? gps[i % 3] : gps[3 + (i % (gps.length - 3))];
      n.anchor.set(gp.x + (this.rng() - 0.5) * (i < 34 ? 16 : 9), 0, gp.z + (this.rng() - 0.5) * (i < 34 ? 12 : 9));
      if (this.world.blocked(n.anchor.x, n.anchor.z, 0.4)) n.anchor.set(gp.x, 0, gp.z);
      n.pos.copy(n.anchor);
      n.vel.set(0, 0, 0); n.knock.set(0, 0, 0);
      n.heading = this.rng() * 6.28;
      n.group = gps.indexOf(gp);
      n.temperament = 'peaceful';
      n.attackStyle = null;
      n.role = this.pickActivity();
      n.state = 'act'; n.st = 0; n.dur = 4 + this.rng() * 8;
      n.fear = 0; n.courage = 0.45 + this.rng() * 0.5;
      n.stimuli.length = 0;
      n.hp = 2; n.threat = false; n.lastAggro = -99; n.neutralized = false; n.arrested = false; n.surrendered = false;
      n.speedMul = 0.85 + this.rng() * 0.3;
      n.thinkT = this.rng() * 0.3; n.animAcc = 0; n.cool = 0; n.targetRef = null;
      n.script = null; n.surge = null; n.hitCount = 0; n.fallDir = -1;
      n.radius = 0.32; n.mass = 1;
      if ((n.role === 'watch' || n.role === 'photo') && Math.abs(n.anchor.x) < 9.5 && Math.abs(n.anchor.z) < 170) {
        const sx = (n.anchor.x >= 0 ? 1 : -1) * (10.8 + this.rng() * 2.6);
        if (!this.world.blocked(sx, n.anchor.z, 0.4)) { n.anchor.x = sx; n.pos.copy(n.anchor); }
      }
      n.rig.root.visible = true;
      n.rig.pose = newPose();
      setRingVisible(n.rig, false);
      if (n.kind === 'looter') this._resetLooter(n);
      else if (n.kind === 'civilian') this._resetCivilian(n);
      else this.equip(n);
    });
    for (const p of this.police) { p.flinch = 0; p.hp = 1; p.rig.root.position.copy(p.pos); p.rig.root.rotation.y = p.heading; }
    this._makeMarches();
  }

  equip(n) {
    const map = { flag: 'flag', bigflag: 'bigflag', placard: 'placard', film: 'phone', banner: 'banner', photo: 'camera' };
    // flags carried in the demonstrations: Palestinian, Algerian, French and red union flags;
    // gilets jaunes mostly carry the tricolore
    const f = this.rng();
    // (weighted after the reference photos: Palestinian flags dominate, then Algerian)
    const variant = n.outfit.vest && f < 0.7 ? 'fr' : f < 0.55 ? 'pal' : f < 0.78 ? 'alg' : f < 0.9 ? 'fr' : 'uni';
    if (map[n.role]) giveItem(n.rig, map[n.role], this.rng, variant);
    else if (n.role === 'chant' && this.rng() < 0.25) { n.role = 'flag'; giveItem(n.rig, 'flag', this.rng, variant); }
    else clearItem(n.rig);
  }

  // ------------------------------------------------------------------ looters
  // Find a reachable spot in front of a shop near the crew's z, plus a rally
  // point on the pavement where the crew gathers between break-ins.
  _placeCrew(c) {
    const inStreet = (z) => CROSS.some((s) => Math.abs(z - s.z) < s.half + 3);
    c.z0 = Math.max(-150, Math.min(108, c.z0));
    for (let i = 0; i < 6 && inStreet(c.z0); i++) c.z0 += c.z0 > c.home ? 6 : -6;
    c.damage = 0; c.broken = false;
    for (let dz = 0; dz < 14; dz += 1.5) for (const sg of [1, -1]) {
      const z = c.z0 + dz * sg;
      if (inStreet(z)) continue;
      for (let x = 14.6; x > 11; x -= 0.4) {
        if (this.world.blocked(c.side * x, z, 0.35)) continue;
        c.door.set(c.side * x, 0, z);
        const rz = z + (this.rng() < 0.5 ? -3 : 3);
        c.rally.set(c.side * 11.2, 0, this.world.blocked(c.side * 11.2, rz, 0.4) ? z : rz);
        return;
      }
    }
    c.door.set(c.side * 12, 0, c.z0); c.rally.set(c.side * 10.5, 0, c.z0);
  }

  _rallySpot(n) {
    const c = n.crew;
    n.anchor.set(c.rally.x + (this.rng() - 0.5) * 2.4, 0, c.rally.z + (this.rng() - 0.5) * 3);
    if (this.world.blocked(n.anchor.x, n.anchor.z, 0.4)) n.anchor.copy(c.rally);
  }

  _resetLooter(n) {
    clearItem(n.rig);
    n.temperament = 'looter';
    n.role = this.rng() < 0.5 ? 'shout' : 'watch';
    n.courage = 0.8 + this.rng() * 0.2;
    n.speedMul = 0.95 + this.rng() * 0.2;
    this._rallySpot(n);
    n.pos.copy(n.anchor);
    n.focus.copy(n.crew.door);
    this.setState(n, 'act', 0); n.dur = this.rng() * 6;
  }

  _lootMove(n, step, speed) {
    const c = n.crew;
    n.lootStep = step; n.lootSpeed = speed;
    if (step === 'door') n.target.set(c.door.x, 0, c.door.z + (this.rng() - 0.5) * 2.4);
    else if (step === 'rally') n.target.copy(n.anchor);
    this.setState(n, 'loot_move');
  }

  _thinkLooter(n, player) {
    const s = n.state;
    if (DISABLED.has(s) || s === 'flee' || s === 'surrender' || s.startsWith('arson')) return;
    // scatter when the officer comes close, then regroup
    if (n.distToPlayer < 6.5) {
      clearItem(n.rig);
      n.fleeFrom = player.pos.clone();
      this.setState(n, 'flee', 3 + this.rng() * 3);
      if (this.rng() < 0.3) this.game.audio.shout(n.pos);
      return;
    }
    if (s === 'calm' || s === 'walk') { clearItem(n.rig); this._rallySpot(n); this._lootMove(n, 'rally', 2.2); return; }
    if (s === 'act') {
      n.focus.copy(n.crew.door);
      if (n.st > n.dur) this._lootMove(n, 'door', 2.4);
    }
  }

  _startArson(n) {
    const c = n.crew;
    giveItem(n.rig, 'bottle');
    n.target.set(c.side * 10.5, 0, c.door.z + (this.rng() - 0.5) * 4);
    if (this.world.blocked(n.target.x, n.target.z, 0.4)) n.target.copy(c.rally);
    n.lootStep = 'arson'; n.lootSpeed = 2.6;
    this.setState(n, 'loot_move');
  }

  _updateCrews(dt) {
    for (const c of this.crews) {
      if (c.reserve && !this.reserveOn) continue;
      c.burnT -= dt;
      if (c.burnT > 0) continue;
      c.burnT = 28 + this.rng() * 30;
      if (c.burns >= 3) continue;
      const m = c.members.find((o) => o.temperament === 'looter' && o.state === 'act');
      if (m) this._startArson(m);
    }
  }

  _looterTransitions(n, dt) {
    const c = n.crew, s = n.state, g = this.game;
    if (s === 'loot_move') {
      if (Math.hypot(n.target.x - n.pos.x, n.target.z - n.pos.z) > 0.6 && n.st < 14) return;
      if (n.lootStep === 'door') {
        n.focus.set(c.side * 30, 0, n.pos.z); // face the shop front
        if (c.broken) this.setState(n, 'loot_grab', 1.2 + this.rng() * 1.4);
        else { this.setState(n, 'loot_smash', 2.5 + this.rng() * 2.5); n.hitCyc = Math.floor(n.id * 0.3 - 0.25); }
      } else if (n.lootStep === 'stash') { clearItem(n.rig); this._lootMove(n, 'rally', 2.0); }
      else if (n.lootStep === 'arson') { n.focus.copy(c.door); this.setState(n, 'arson_light', 1.3 + this.rng() * 0.8); g.audio.lighter(n.pos); }
      else { this.setState(n, 'act', 0); n.dur = 2 + this.rng() * 7; }
    } else if (s === 'loot_smash') {
      // blows land at the peak of each kick / swing in the animation
      const cyc = Math.floor(n.st * 1.6 + n.id * 0.3 - 0.25);
      if (cyc !== n.hitCyc) {
        n.hitCyc = cyc;
        const at = n.pos.clone().setY(n.pos.y + 1.0); at.x += c.side * 0.6;
        c.damage++;
        if (!c.broken && c.damage >= 6) {
          c.broken = true;
          g.audio.glass(at, 1.0); g.audio.shutter(at);
          g.effects.dust(at, 10);
          this.disturb(at, 12, 0.6, 'violence', n);
        } else if (this.rng() < 0.55) g.audio.shutter(at);
        else g.audio.glass(at, 0.5);
        g.effects.dust(at, 3);
      }
      if (n.st > n.dur) {
        if (c.broken) this.setState(n, 'loot_grab', 1.2 + this.rng());
        else { this._rallySpot(n); this._lootMove(n, 'rally', 2.0); }
      }
    } else if (s === 'loot_grab' && n.st > n.dur) {
      giveItem(n.rig, 'loot', this.rng);
      // carry it off along the pavement
      const dir = this.rng() < 0.5 ? 1 : -1;
      n.target.set(c.side * (10.5 + this.rng() * 2), 0, c.door.z + dir * (12 + this.rng() * 8));
      if (this.world.blocked(n.target.x, n.target.z, 0.4)) n.target.copy(n.anchor);
      n.lootStep = 'stash'; n.lootSpeed = 1.9;
      this.setState(n, 'loot_move');
    } else if (s === 'arson_light' || s === 'arson_wind') {
      if (n.rig.wick && (s === 'arson_wind' || n.st > 0.5)) {
        const p = V(); n.rig.wick.getWorldPosition(p);
        if (Math.random() < 0.7) g.effects.fire.spawn({ pos: p, vel: V().set(0, 0.8, 0), size: 0.16 + Math.random() * 0.1, life: 0.25, alpha: 1, color: new THREE.Color(1, 0.75, 0.3), color2: new THREE.Color(0.9, 0.2, 0), drag: 1 });
      }
      if (n.st > n.dur) { if (s === 'arson_light') this.setState(n, 'arson_wind', 0.55); else { this.setState(n, 'arson_throw', 0.4); this._arsonThrow(n); } }
    } else if (s === 'arson_throw' && n.st > n.dur) {
      this._rallySpot(n); this._lootMove(n, 'rally', 3.8);
    }
  }

  // petrol bomb into the shop: a burst of flame at the door, then the shop
  // burns. The crew moves on to another shop further along.
  _arsonThrow(n) {
    const c = n.crew, g = this.game;
    clearItem(n.rig);
    const door = c.door.clone();
    const from = n.pos.clone().setY(n.pos.y + 1.9);
    g.audio.swing(n.pos);
    g.effects.throwProjectile(from, V().set(door.x + c.side * 0.4, 0.8, door.z), 'petrol', () => {
      const ground = door.clone().setY(this.world.groundHeight(door.x, door.z));
      g.effects.ignite(ground, 2.4, 7 + this.rng() * 4);
      g.effects.addFire(V().set(door.x + c.side * 1.1, 1.0, door.z), 1.3, 2.2);
      g.audio.molotov(ground, 0.9);
      g.audio.glass(ground, 0.7);
      this.disturb(ground, 18, 0.95, 'explosion');
      const d = g.player.pos.distanceTo(ground);
      if (d < 3.2) g.player.takeDamage(14, ground, null);
      if (d < 60) g.hud.alert('Rioters have set a shop on fire', 'warn', 2.2, 'shopfire');
    });
    c.burns++;
    c.z0 += (this.rng() < 0.5 ? -1 : 1) * (14 + this.rng() * 8);
    this._placeCrew(c);
    for (const m of c.members) if (m !== n && m.state === 'act') { this._rallySpot(m); this._lootMove(m, 'rally', 2.4); }
  }

  // ------------------------------------------------------------------ civilians
  _resetCivilian(n) {
    clearItem(n.rig);
    n.temperament = 'civilian';
    n.courage = 0.05 + this.rng() * 0.2;
    n.speedMul = 0.9 + this.rng() * 0.2;
    this._placeCivilian(n, null);
  }

  // put a passer-by near one of the looting crews, already running from it
  _placeCivilian(n, player) {
    const p = player && player.pos;
    let cands = this.crews.filter((c) => { if (!p) return true; const d = c.door.distanceTo(p); return d > 36 && d < 80; });
    if (!cands.length) cands = this.crews;
    const c = cands[Math.floor(this.rng() * cands.length)];
    n.pos.copy(c.rally);
    for (let k = 0; k < 8; k++) {
      const x = c.side * (9.8 + this.rng() * 3.5), z = c.door.z + (this.rng() < 0.5 ? -1 : 1) * (3 + this.rng() * 7);
      if (!this.world.blocked(x, z, 0.4)) { n.pos.set(x, 0, z); break; }
    }
    n.anchor.copy(n.pos); n.vel.set(0, 0, 0); n.knock.set(0, 0, 0);
    n.role = 'cower';
    n.fleeFrom = c.door.clone();
    this.setState(n, 'flee', 3 + this.rng() * 3);
  }

  // closest looter, aggressor or fire to a civilian
  _nearestDanger(n) {
    let best = null, bd = 16 * 16;
    for (const c of this.crews) for (const m of c.members) {
      if (m.temperament !== 'looter' || m.arrested) continue;
      const d = (m.pos.x - n.pos.x) ** 2 + (m.pos.z - n.pos.z) ** 2;
      if (d < bd) { bd = d; best = m.pos; }
    }
    for (const o of this.query(n.pos.x, n.pos.z, 12, [])) {
      if (o.id === undefined || !this.isThreat(o)) continue;
      const d = (o.pos.x - n.pos.x) ** 2 + (o.pos.z - n.pos.z) ** 2;
      if (d < bd) { bd = d; best = o.pos; }
    }
    for (const f of this.world.fires) {
      const d = (f.pos.x - n.pos.x) ** 2 + (f.pos.z - n.pos.z) ** 2;
      if (d < 7 * 7 && d < bd) { bd = d; best = f.pos; }
    }
    return best;
  }

  _scream(n) {
    if (this.time - this.lastScream < 0.7 || n.distToPlayer > 45) return;
    this.lastScream = this.time;
    this.game.audio.scream(n.pos, n.outfit.gender === 'f');
  }

  _thinkCivilian(n, player, dt) {
    const s = n.state;
    if (DISABLED.has(s) || s === 'surrender') return;
    const danger = this._nearestDanger(n);
    if (s === 'flee') {
      if (danger) n.fleeFrom.set(danger.x, 0, danger.z);
      if (this.rng() < dt * 0.35) this._scream(n);
      return;
    }
    if (danger) {
      n.fleeFrom = V().set(danger.x, 0, danger.z);
      this.setState(n, 'flee', 3 + this.rng() * 3);
      this._scream(n);
      return;
    }
    // well out of sight: rejoin the scene near another crew
    if (n.distToPlayer > 50 && (s === 'calm' || s === 'act')) { this._placeCivilian(n, player); return; }
    if (s === 'calm') {
      // stop and look back at what they ran from
      n.role = 'cower';
      this.setState(n, 'act', 0); n.dur = 1.5 + this.rng() * 2.5;
    }
    if (n.state === 'act') {
      if (n.fleeFrom) n.focus.copy(n.fleeFrom);
      if (n.st > n.dur) {
        // hurry on, away from the trouble
        const from = n.fleeFrom || player.pos;
        tmp.set(n.pos.x - from.x, 0, n.pos.z - from.z);
        if (tmp.lengthSq() < 0.01) tmp.set(0, 0, 1);
        tmp.normalize();
        for (let k = 0; k < 6; k++) {
          const a = (this.rng() - 0.5) * 1.4, r = 8 + this.rng() * 6;
          const x = n.pos.x + (tmp.x * Math.cos(a) - tmp.z * Math.sin(a)) * r, z = n.pos.z + (tmp.x * Math.sin(a) + tmp.z * Math.cos(a)) * r;
          if (!this.world.blocked(x, z, 0.4)) { n.target.set(x, 0, z); break; }
        }
        this.setState(n, 'walk');
      }
    }
  }

  // Groups of demonstrators that move together along the boulevard.
  _makeMarches() {
    for (const n of this.npcs) { n.march = null; }
    const paths = [
      [[-4, 108], [-5, 60], [-3, 10], [4, -40], [3, -90]],
      [[6, -95], [5, -50], [-2, 0], [-4, 50], [-6, 95]],
      [[11.5, 100], [11.5, 60], [11.8, 20], [11.5, -10], [-11.5, -10], [-11.8, 30], [-11.5, 90]],
    ];
    this.marches = paths.map((path, gi) => ({ path: path.map(([x, z]) => new THREE.Vector3(x, 0, z)), idx: 1, pos: new THREE.Vector3(path[0][0], 0, path[0][1]), dir: new THREE.Vector3(0, 0, -1), speed: 0.85 + gi * 0.12, wait: 0 }));
    const free = this.npcs.filter((n) => n.id >= 34 && n.temperament === 'peaceful');
    let k = 0;
    this.marches.forEach((g, gi) => {
      const size = gi === 2 ? 5 : 8;
      for (let i = 0; i < size && k < free.length; i++, k++) {
        const n = free[k];
        n.march = g;
        const row = Math.floor(i / 3), col = (i % 3) - 1;
        n.mOff = new THREE.Vector3(col * 1.1 + (this.rng() - 0.5) * 0.4, 0, row * 1.2 + (this.rng() - 0.5) * 0.4);
        n.pos.set(g.pos.x + n.mOff.x, 0, g.pos.z + n.mOff.z);
        n.speedMul = 1.05;
      }
    });
  }

  _updateMarches(dt) {
    for (const g of this.marches || []) {
      if (g.wait > 0) { g.wait -= dt; continue; }
      const tgt = g.path[g.idx];
      const dx = tgt.x - g.pos.x, dz = tgt.z - g.pos.z, d = Math.hypot(dx, dz);
      // groups slow down where the crowd is thick (bottlenecks at barricades)
      const dens = this.query(g.pos.x, g.pos.z, 4, []).length;
      const sp = g.speed * (dens > 14 ? 0.45 : 1);
      if (d < 0.5) {
        g.idx = (g.idx + 1) % g.path.length;
        if (g.idx === 0) g.path.reverse(), (g.idx = 1);
        g.wait = 2 + Math.random() * 5; // stop to chant
      } else {
        g.dir.set(dx / d, 0, dz / d);
        g.pos.addScaledVector(g.dir, Math.min(d, sp * dt));
      }
    }
  }

  // ------------------------------------------------------------------ hash
  _rebuildGrid() {
    this.grid.clear();
    const put = (o, x, z) => {
      const k = Math.floor(x / 2) * 1000 + Math.floor(z / 2);
      let l = this.grid.get(k); if (!l) { l = []; this.grid.set(k, l); } l.push(o);
    };
    for (const n of this.npcs) if (n.state !== 'gone') put(n, n.pos.x, n.pos.z);
    for (const p of this.police) if (!p.off) put(p, p.pos.x, p.pos.z);
  }

  query(x, z, r, out = []) {
    out.length = 0;
    for (let gx = Math.floor((x - r) / 2); gx <= Math.floor((x + r) / 2); gx++)
      for (let gz = Math.floor((z - r) / 2); gz <= Math.floor((z + r) / 2); gz++) {
        const l = this.grid.get(gx * 1000 + gz);
        if (l) for (const o of l) if ((o.pos.x - x) ** 2 + (o.pos.z - z) ** 2 < r * r) out.push(o);
      }
    return out;
  }

  // ------------------------------------------------------------------ events
  // Emit a disturbance; nearby agents react individually after a delay.
  disturb(pos, radius, intensity, type, source = null) {
    for (const n of this.npcs) {
      if (n === source || DISABLED.has(n.state) || n.state === 'gone') continue;
      const d = Math.hypot(n.pos.x - pos.x, n.pos.z - pos.z);
      if (d > radius) continue;
      const delay = 0.08 + this.rng() * 0.6 + d * 0.035;
      n.stimuli.push({ t: delay, k: intensity * (1 - (d / radius) * 0.7), pos: pos.clone(), type });
    }
  }

  isThreat(n) {
    return !n.neutralized && !n.arrested && n.temperament === 'hostile' && (AGGRO_STATES.has(n.state) || this.time - n.lastAggro < 4);
  }

  makeHostile(n, style, targetMode = 'auto') {
    n.temperament = 'hostile';
    n.attackStyle = style;
    n.targetMode = targetMode;
    n.hp = style === 'melee' ? 2 + (this.rng() < 0.4 ? 1 : 0) : style === 'shield' ? SHIELD.hp : 2;
    n.guardBlocks = 0;
    n.neutralized = false;
    n.cool = this.rng() * 1.5;
    // Props are only dropped when the attack needs the hands: a melee aggressor keeps a
    // one-handed flag, throwers swap theirs for a stone, two-handed props are let go.
    // Clothing is never changed: becoming hostile does not alter how someone looks.
    const keep = style === 'bomber' || (style === 'melee' && (n.rig.itemType === 'flag' || n.rig.itemType === 'frflag'));
    if (n.rig.itemType !== 'none' && !keep) clearItem(n.rig);
    if (style === 'thrower') giveItem(n.rig, 'stone');
    if (style === 'shield') giveItem(n.rig, 'impshield', this.rng, ['board', 'sign', 'lid'][n.id % 3]); // picks up a shield: both hands busy
    this.setState(n, style === 'thrower' ? 'pursue' : 'pursue');
    n.lastAggro = this.time;
  }

  setState(n, s, dur = 0) {
    n.state = s; n.st = 0; n.dur = dur;
  }

  // Called by the player's baton when a strike connects with this agent.
  // True when a shield-carrier's guard stops a strike coming from attackerPos.
  guards(n, attackerPos) {
    if (n.attackStyle !== 'shield' || n.neutralized || n.rig.itemType !== 'impshield') return false;
    if (!['pursue', 'circle', 'atk_wind', 'act', 'walk'].includes(n.state)) return false; // lowered: recovery, stagger, down
    const fx = Math.sin(n.heading), fz = Math.cos(n.heading);
    const dx = attackerPos.x - n.pos.x, dz = attackerPos.z - n.pos.z, d = Math.hypot(dx, dz) || 1;
    return (fx * dx + fz * dz) / d > SHIELD.guardCos;
  }

  onBatonHit(n, dir, attackerPos) {
    const g = this.game;
    if (n.script && n.script.onBaton) return n.script.onBaton(n, dir, attackerPos); // bosses handle their own hits
    if (this.guards(n, attackerPos)) {
      // blocked: no damage; both sides are pushed apart and the officer recoils
      n.guardBlocks++;
      if (g.missions.stats.blocked !== undefined) g.missions.stats.blocked++;
      n.knock.copy(dir).multiplyScalar(1.2);
      g.player.knock.addScaledVector(dir, -3.2);
      g.player.staggerT = Math.max(g.player.staggerT, 0.22);
      g.audio.impact(n.pos, false, true);
      g.effects.impact(n.pos.clone().setY(n.pos.y + 1.2));
      g.cameraRig.shake(0.12);
      g.hud.alert('Shield — bait the bash, or get round the side', 'warn', 2.2, 'shieldhint');
      return 'blocked';
    }
    const wasThreat = this.isThreat(n) || (n.script && n.script.active) || n.temperament === 'looter';
    const fwd = tmp.set(Math.sin(n.heading), 0, Math.cos(n.heading));
    const fromBehind = fwd.dot(dir) > 0.2; // strike travelling in the same direction they face
    n.hitCount++;
    n.hp -= 1;
    const knock = n.hp <= 0 || n.state === 'stagger' || (!wasThreat && n.hitCount >= 2);
    n.fallDir = fromBehind ? 1 : -1;
    if (n.script && n.script.onHit) n.script.onHit(n);
    if (knock) {
      n.knock.copy(dir).multiplyScalar(4.2);
      this.setState(n, 'down', (n.temperament === 'hostile' ? 4.5 : 3) + this.rng() * 2);
      if (wasThreat && !n.neutralized) { n.neutralized = true; g.onThreatNeutralized(n); }
      g.effects.dust(n.pos.clone().setY(0.2), 10);
      g.audio.impact(n.pos, true);
    } else {
      n.knock.copy(dir).multiplyScalar(2.8);
      this.setState(n, 'stagger', 0.65 + this.rng() * 0.2);
      n.staggerBack = !fromBehind;
    }
    if (!wasThreat) {
      g.onPeacefulStruck(n);
      n.fear = 1.2;
      this.disturb(n.pos, 11, 1.0, 'violence', n);
    } else {
      this.disturb(n.pos, 7, 0.45, 'violence', n);
    }
    setRingVisible(n.rig, false);
    clearItem(n.rig);
    if (n.surge) n.surge = null;
  }

  // ------------------------------------------------------------------ update
  update(dt, player) {
    this.time += dt;
    const t = this.time;
    this._rebuildGrid();
    this._updateMarches(dt);
    this._updateCrews(dt);
    const ppos = player.pos;
    for (const n of this.npcs) {
      if (n.state === 'gone') continue;
      const dist = Math.hypot(n.pos.x - ppos.x, n.pos.z - ppos.z);
      n.distToPlayer = dist;
      // perception (always processed so reactions stay timely)
      for (let i = n.stimuli.length - 1; i >= 0; i--) {
        const s = n.stimuli[i];
        s.t -= dt;
        if (s.t <= 0) { n.stimuli.splice(i, 1); this._react(n, s); }
      }
      n.fear = Math.max(0, n.fear - dt * 0.12);
      // think at a reduced rate when far from the player
      n.thinkT -= dt;
      const thinkInterval = dist < 35 ? 0 : dist < 70 ? 0.2 : 0.5;
      if (n.thinkT <= 0) { this._think(n, player, Math.max(dt, thinkInterval)); n.thinkT = thinkInterval; }
      n.st += dt;
      this._timedTransitions(n, player, dt);
      this._move(n, dt, player);
    }
    this._separate(player, dt);
    // render update (pose LOD)
    const cam = this.game.camera.position;
    if (this.far) this.far.begin();
    // the closest MAX_SKINNED agents get full skeletal rigs; the rest use impostors
    const order = this.npcs.filter((n) => n.state !== 'gone').sort((a, b) => a.distToPlayer - b.distToPlayer);
    order.forEach((n, i) => (n.rank = i));
    // camera→player segment, used to hide agents that would block the view
    const sx = ppos.x - cam.x, sz = ppos.z - cam.z, sl2 = sx * sx + sz * sz || 1;
    for (const n of this.npcs) {
      if (n.state === 'gone') continue;
      const r = n.rig.root;
      r.position.set(n.pos.x, n.pos.y, n.pos.z);
      r.rotation.y = n.heading;
      const dc = cam.distanceToSquared(tmp.set(n.pos.x, n.pos.y + 1.3, n.pos.z));
      const u = ((n.pos.x - cam.x) * sx + (n.pos.z - cam.z) * sz) / sl2;
      let blocking = false;
      if (u > 0 && u < 0.82) {
        const qx = cam.x + sx * u - n.pos.x, qz = cam.z + sz * u - n.pos.z;
        blocking = qx * qx + qz * qz < 0.5 * 0.5;
      }
      // scripted characters (the Leader) keep their full rig while in view, whatever the cap
      const lod = !this.far ? 0 : n.special ? (n.distToPlayer > 90 ? 2 : n.distToPlayer > LOD_MID ? 1 : 0) : n.distToPlayer > LOD_FAR || n.rank >= this.maxSkinned ? 2 : n.distToPlayer > LOD_MID ? 1 : 0;
      n.lod = lod;
      if (lod === 2) {
        r.visible = false;
        const lyingDown = n.state === 'down' || n.state === 'arrested';
        if (!lyingDown) this.far.add(n.rig.kind, n.speed > 0.5, { x: n.pos.x, y: n.pos.y, z: n.pos.z, heading: n.heading, scale: n.outfit.height || 1, colors: n.colors, pat: n.outfit.shellPattern === 1 });
        n.animAcc += dt;
        continue;
      }
      r.visible = dc > 1.1 * 1.1 && !blocking; // never let a body fill the camera or hide the officer
      n.animAcc += dt;
      if (lod === 0 || n.animAcc > 0.05) { this._animate(n, n.animAcc, t); n.animAcc = 0; }
      const shadow = n.distToPlayer < 14;
      if (shadow !== n.shadow) { n.shadow = shadow; for (const m of n.rig.meshes) m.castShadow = shadow && !m.userData.detail; }
      const threat = this.isThreat(n) || (n.script && n.script.marked);
      // looters caught in the act are marked amber
      const looting = n.temperament === 'looter' && (n.state === 'loot_smash' || n.state === 'loot_grab' || n.state.startsWith('arson') || n.rig.itemType === 'loot');
      const telegraph = n.attackKind === 'bash' && n.state === 'atk_wind';
      setRingVisible(n.rig, (!!threat || looting) && !DISABLED.has(n.state), looting || telegraph || (n.script && n.script.amber) ? 'amber' : 'red');
    }
    if (this.far) { this._drawBackground(t); this.far.end(); }
    this._updatePolice(dt, t, player);
  }

  // Background population in places the player cannot reach: side streets
  // beyond the police cordons and the far end of the boulevard.
  _buildBackground() {
    const rng = mulberry(777);
    const spots = [];
    const R = (a, b) => a + (b - a) * rng();
    for (const s of LAYOUT.crossStreets) for (const xs of [-1, 1]) {
      // groups clustered around a few centres
      for (let gI = 0; gI < 7; gI++) {
        const cx = xs * (63.5 + Math.pow(rng(), 1.7) * 52), cz = s.z + R(-s.half + 1.5, s.half - 1.5), n = 6 + Math.floor(rng() * 10);
        for (let i = 0; i < n; i++) spots.push([cx + R(-3, 3), Math.max(s.z - s.half + 0.6, Math.min(s.z + s.half - 0.6, cz + R(-2.5, 2.5)))]);
      }
    }
    // dense crowd held behind the northern barricade, and gathering just in front of it
    for (let gI = 0; gI < 5; gI++) {
      const cx = R(-11, 11), cz = R(-163, -146), n = 8 + Math.floor(rng() * 8);
      for (let i = 0; i < n; i++) spots.push([Math.max(-13, Math.min(13, cx + R(-3, 3))), cz + R(-3, 3)]);
    }
    for (let gI = 0; gI < 12; gI++) {
      const cx = R(-12, 12), cz = R(-214, -172), n = 10 + Math.floor(rng() * 12);
      for (let i = 0; i < n; i++) spots.push([Math.max(-14, Math.min(14, cx + R(-4, 4))), cz + R(-4, 4)]);
    }
    for (let i = 0; i < 14; i++) spots.push([R(-12, 12), R(186, 200)]);
    // looting gangs along the shop fronts of the side streets and at the far barricade
    const gangs = [];
    for (const s of LAYOUT.crossStreets) for (const xs of [-1, 1]) for (let gI = 0; gI < 3; gI++) {
      const sz = rng() < 0.5 ? -1 : 1, cx = xs * R(66, 112), cz = s.z + sz * (s.half - 1.4), n = 5 + Math.floor(rng() * 6);
      for (let i = 0; i < n; i++) gangs.push([cx + R(-2.5, 2.5), cz - sz * R(0, 1.6)]);
    }
    for (let gI = 0; gI < 4; gI++) {
      const cx = R(-12, 12), cz = R(-210, -175), n = 6 + Math.floor(rng() * 6);
      for (let i = 0; i < n; i++) gangs.push([Math.max(-14, Math.min(14, cx + R(-3, 3))), cz + R(-3, 3)]);
    }
    const mk = (x, z) => {
      const o = randomOutfit(rng);
      return { x, z, h: rng() * 6.28, ph: rng() * 6.28, kind: o.base || (o.gender === 'f' ? 'michelle' : 'male'), scale: o.height, colors: outfitColors(o), pat: o.shellPattern === 1, walk: rng() < 0.15 };
    };
    this.bg = spots.slice(0, 560).map(([x, z]) => mk(x, z)).concat(gangs.map(([x, z]) => mk(x, z)));
  }

  _drawBackground(t) {
    const cam = this.game.camera.position;
    for (const b of this.bg) {
      if ((b.x - cam.x) ** 2 + (b.z - cam.z) ** 2 > 180 * 180) continue;
      const bob = Math.max(0, Math.sin(t * 3.1 + b.ph)) * 0.05;
      this.far.add(b.kind, b.walk, { x: b.x, y: 0, z: b.z, heading: b.h + Math.sin(t * 0.4 + b.ph) * 0.4, scale: b.scale, bob, colors: b.colors, pat: b.pat });
    }
  }

  _react(n, s) {
    if (DISABLED.has(n.state) || n.arrested || n.state === 'surrender') return;
    if (n.temperament === 'looter') {
      // only tear gas breaks up a looting crew
      if (s.type === 'teargas' && s.k > 0.35 && !n.state.startsWith('arson') && n.state !== 'flee') {
        clearItem(n.rig); n.fleeFrom = s.pos.clone(); this.setState(n, 'flee', 4 + this.rng() * 2);
      }
      return;
    }
    if (n.temperament === 'hostile' && !n.neutralized) {
      // aggressors are hard to scare; explosions they caused don't matter to them
      if (s.type === 'explosion' && s.k > 0.9 && n.attackStyle !== 'bomber') n.fear += 0.3;
      return;
    }
    if (n.script && n.script.active) return;
    const sens = { explosion: 1.5, violence: 1.45, projectile: 0.9, panic: 0.9, charge: 0.6, teargas: 1.7 }[s.type] ?? 0.6;
    n.fear += s.k * sens * (1.15 - n.courage * 0.6);
    const threshold = n.surge ? 0.9 : 0.35 + n.courage * 0.45;
    if (n.fear > threshold) {
      const already = n.state === 'flee';
      n.fleeFrom = s.pos.clone();
      this.setState(n, 'flee', 3 + this.rng() * 3 + s.k * 2);
      if (!already && n.temperament === 'civilian') this._scream(n);
      if (n.surge) n.surge = null;
      // panic is contagious, but weakens as it spreads
      if (!already && s.k > 0.3 && this.rng() < 0.65) this.disturb(n.pos, 6, s.k * 0.55, 'panic', n);
    } else if (s.k > 0.15 && n.state === 'act') {
      // look at the commotion; some filmers will start filming it
      n.focus.copy(s.pos);
      n.lookT = 3;
    }
  }

  // Decisions made at the think rate
  _think(n, player, dt) {
    const g = this.game;
    if (n.temperament === 'looter') return this._thinkLooter(n, player);
    if (n.temperament === 'civilian') return this._thinkCivilian(n, player, dt);
    if (n.march && n.temperament === 'peaceful' && !n.surge && (n.state === 'act' || n.state === 'walk' || n.state === 'calm')) {
      // marching group: keep station around the moving group centre
      const g = n.march;
      n.target.set(g.pos.x + n.mOff.x, 0, g.pos.z + n.mOff.z);
      n.anchor.copy(n.target);
      const d = Math.hypot(n.target.x - n.pos.x, n.target.z - n.pos.z);
      if (d > 1.2 && n.state !== 'walk') this.setState(n, 'walk');
      n.focus.set(g.pos.x + g.dir.x * 20, 0, g.pos.z + g.dir.z * 20);
    } else if (n.state === 'act' || n.state === 'walk') {
      // pick a new spot near the anchor now and then
      if (n.st > n.dur) {
        const r = n.role === 'wander' ? 12 : 3.5;
        for (let k = 0; k < 4; k++) {
          tmp.set(n.anchor.x + (this.rng() - 0.5) * 2 * r, 0, n.anchor.z + (this.rng() - 0.5) * 2 * r);
          if (!this.world.blocked(tmp.x, tmp.z, 0.5)) { n.target.copy(tmp); break; }
        }
        this.setState(n, 'walk', 0);
        n.dur = 5 + this.rng() * 10;
      }
      // focus: filmers point their phones at the officer when he is close
      if (!n.lookT || n.lookT <= 0) {
        if ((n.role === 'film' || n.role === 'shout') && n.distToPlayer < 16) n.focus.copy(player.pos);
        else if (n.pos.z < 128) n.focus.set(n.pos.x * 0.5, 0, 135);
        else n.focus.set(0, 0, 100);
      } else n.lookT -= dt;
      // stay out of the officer's way when he walks through (personal space)
      if (n.distToPlayer < 1.6 && player.speed > 1.5) n.yield = 0.6;
    }
    if (n.temperament === 'hostile' && !n.neutralized && !n.script) this._thinkHostile(n, player);
    if (n.state === 'calm' && n.st > 2) {
      // return to peaceful activity at a new anchor away from the trouble
      n.anchor.copy(n.pos); n.fear = Math.min(n.fear, 0.2);
      this.setState(n, 'act', 0); n.dur = 3 + this.rng() * 6;
    }
    if (n.surge) {
      if (n.state !== 'surge' && !DISABLED.has(n.state) && n.state !== 'flee') this.setState(n, 'surge');
      if (n.pos.z > n.surge.endZ) { n.surge = null; n.anchor.copy(n.pos); this.setState(n, 'act', 0); n.dur = 2; }
    }
  }

  _pickTarget(n, player) {
    // Aggressors go for the officer if he is close; otherwise the police line (incident 1)
    const pd = n.distToPlayer;
    if (n.targetMode === 'officers' && pd > 3.5) {
      let best = null, bd = Infinity;
      for (const p of this.police) if (!p.off && (p.role === 'guard' || p.role === 'injured')) { const d = p.pos.distanceToSquared(n.pos); if (d < bd) { bd = d; best = p; } }
      if (best) return { pos: best.pos, isPlayer: false, cop: best };
    }
    if (n.targetMode === 'player' || n.targetMode === 'officers' || pd < 10 || !this.police.some((p) => p.role === 'line')) return { pos: player.pos, isPlayer: true };
    let best = null, bd = Infinity;
    for (const p of this.police) if (p.role === 'line') { const d = p.pos.distanceToSquared(n.pos); if (d < bd) { bd = d; best = p; } }
    return { pos: best.pos, isPlayer: false, cop: best };
  }

  _thinkHostile(n, player) {
    if (DISABLED.has(n.state) || n.state === 'flee' || n.state === 'surrender') return;
    const tg = this._pickTarget(n, player);
    n.targetRef = tg;
    const d = Math.hypot(tg.pos.x - n.pos.x, tg.pos.z - n.pos.z);
    if (n.state === 'act' || n.state === 'walk' || n.state === 'calm') this.setState(n, 'pursue');
    if (n.attackStyle === 'melee') {
      if (n.state === 'pursue' && d < 1.35 && n.cool <= 0) {
        n.attackKind = this.rng() < 0.35 ? 'shove' : 'punch';
        this.setState(n, 'atk_wind', n.attackKind === 'shove' ? 0.5 : 0.55);
        if (this.rng() < 0.5) this.game.audio.shout(n.pos);
      }
    } else if (n.attackStyle === 'thrower') {
      if ((n.state === 'pursue' || n.state === 'circle') && d < 16 && d > 5 && n.cool <= 0) this.setState(n, 'throw_prep', 0.8);
    } else if (n.attackStyle === 'shield') {
      if ((n.state === 'pursue' || n.state === 'circle') && d < 1.9 && n.cool <= 0) {
        n.attackKind = 'bash';
        this.setState(n, 'atk_wind', SHIELD.bashWind);
        if (this.rng() < 0.6) this.game.audio.shout(n.pos);
      }
    }
  }

  // State changes driven by elapsed time
  _timedTransitions(n, player, dt) {
    const g = this.game;
    const s = n.state;
    n.cool -= dt;
    if (s === 'walk' && Math.hypot(n.target.x - n.pos.x, n.target.z - n.pos.z) < 0.5) { this.setState(n, 'act'); n.dur = 4 + this.rng() * 10; }
    if (s === 'flee' && n.st > n.dur) this.setState(n, 'calm');
    if (s === 'stagger' && n.st > n.dur) {
      if (n.temperament === 'hostile' && !n.neutralized && !n.script) this.setState(n, 'pursue');
      else { n.fleeFrom = player.pos.clone(); this.setState(n, 'flee', 4); }
    }
    if (s === 'down' && n.st > n.dur) this.setState(n, 'recover', 1.5);
    if (s === 'recover' && n.st > n.dur) {
      if (n.neutralized) { this.setState(n, 'surrender', 4.5); n.surrendered = true; }
      else if (n.temperament === 'hostile' && !n.script) this.setState(n, 'pursue');
      else { n.fleeFrom = player.pos.clone(); this.setState(n, 'flee', 5); }
    }
    if (s === 'surrender' && n.st > n.dur) {
      n.temperament = 'peaceful'; n.attackStyle = null; n.fleeFrom = player.pos.clone();
      this.setState(n, 'flee', 6);
    }
    // melee attack phases
    if (s === 'atk_wind' && n.st > n.dur) {
      this.setState(n, 'atk_strike', 0.16);
      const tg = n.targetRef;
      if (tg) {
        const d = Math.hypot(tg.pos.x - n.pos.x, tg.pos.z - n.pos.z);
        if (d < (n.attackKind === 'bash' ? 2.1 : 1.75)) {
          const dir = tmp2.set(tg.pos.x - n.pos.x, 0, tg.pos.z - n.pos.z).normalize();
          if (tg.isPlayer && n.attackKind === 'bash') g.player.takeDamage(SHIELD.bashDamage, n.pos, dir.clone().multiplyScalar(SHIELD.bashPush));
          else if (tg.isPlayer) g.player.takeDamage(n.attackKind === 'shove' ? 6 : 9, n.pos, dir.clone().multiplyScalar(n.attackKind === 'shove' ? 4.5 : 2));
          else if (tg.cop) {
            tg.cop.flinch = 0.4; g.onPoliceLineHit(n.attackKind === 'shove' ? 1 : 1.3, tg.cop); g.audio.impact(tg.cop.pos, false, true);
            // the line shoves back: attackers get pushed away and must re-engage
            if (this.rng() < 0.45) { n.knock.copy(dir).multiplyScalar(-3.5); this.setState(n, 'stagger', 0.5); n.staggerBack = true; }
          }
        } else g.audio.swing(n.pos);
      }
      n.lastAggro = this.time;
    }
    if (s === 'atk_strike' && n.st > n.dur) this.setState(n, 'atk_rec', n.attackKind === 'bash' ? SHIELD.bashRec : 0.45);
    if (s === 'atk_rec' && n.st > n.dur) { n.cool = 0.9 + this.rng() * 1.6; this.setState(n, 'circle', n.cool); }
    if (s === 'circle' && n.st > n.dur) this.setState(n, 'pursue');
    // throwing
    if (s === 'throw_prep' && n.st > n.dur) { this.setState(n, 'throw_wind', 0.7); giveItem(n.rig, this.rng() < 0.5 ? 'stone' : 'bottle'); }
    if (s === 'throw_wind' && n.st > n.dur) {
      this.setState(n, 'throw_rel', 0.45);
      const tg = n.targetRef || { pos: player.pos, isPlayer: true };
      const type = n.rig.itemType === 'bottle' ? 'bottle' : 'stone';
      clearItem(n.rig);
      const from = n.pos.clone().setY(n.pos.y + 1.9);
      const aim = tg.pos.clone().setY(1.2);
      if (tg.isPlayer) aim.addScaledVector(player.vel, 0.6); // lead the target
      aim.x += (this.rng() - 0.5) * 1.6; aim.z += (this.rng() - 0.5) * 1.6;
      const proj = g.effects.throwProjectile(from, aim, type, (pos, p, hitPlayer) => {
        if (hitPlayer) g.player.takeDamage(10, from, null, true);
        // a stone on the officer is voiced by the hit / block sound in takeDamage
        if (type === 'bottle') g.audio.glass(pos); else if (!hitPlayer) g.audio.impact(pos, false, false, 'stone');
        g.effects.dust(pos, 5);
        this.disturb(pos, 6, 0.4, 'projectile');
        if (!hitPlayer && tg.cop && pos.distanceTo(tg.cop.pos) < 1.8) { tg.cop.flinch = 0.4; g.onPoliceLineHit(1, tg.cop); }
      });
      proj.check = (pos) => g.player.hitTest(pos);
      g.audio.swing(n.pos);
      n.lastAggro = this.time;
    }
    if (s === 'throw_rel' && n.st > n.dur) { n.cool = 2.5 + this.rng() * 2.5; this.setState(n, 'circle', n.cool); }
    if (n.script && n.script.tick) n.script.tick(n, player, dt);
    if (n.temperament === 'looter') this._looterTransitions(n, dt);
  }

  // Steering, avoidance and integration
  _move(n, dt, player) {
    const s = n.state;
    let speed = 0, dest = null;
    const desired = tmp.set(0, 0, 0);
    if (s === 'walk') { dest = n.target; speed = (n.role === 'wander' ? 1.35 : n.temperament === 'civilian' ? 1.9 : 1.1) * n.speedMul; }
    else if (s === 'loot_move') { dest = n.target; speed = n.lootSpeed * n.speedMul; }
    else if (s === 'flee') {
      desired.set(n.pos.x - n.fleeFrom.x, 0, n.pos.z - n.fleeFrom.z);
      if (desired.lengthSq() < 0.01) desired.set(this.rng() - 0.5, 0, this.rng() - 0.5);
      desired.normalize();
      // bias flight along the street axis rather than into walls
      if (Math.abs(n.pos.x) > 9) desired.x *= 0.3;
      desired.normalize();
      speed = (4.2 + n.courage * 1.5) * n.speedMul;
    } else if (s === 'pursue' && n.targetRef) {
      dest = n.targetRef.pos; speed = 4.0 * n.speedMul;
      const d = Math.hypot(dest.x - n.pos.x, dest.z - n.pos.z);
      if (n.attackStyle === 'thrower' && d < 9) { speed = 1.6; dest = null; desired.set(n.pos.x - n.targetRef.pos.x, 0, n.pos.z - n.targetRef.pos.z).normalize(); }
      else if (n.attackStyle === 'melee' && d < 1.1) { speed = 0; dest = null; }
      else if (n.attackStyle === 'shield') { speed = d < 1.5 ? 0 : SHIELD.speed * n.speedMul; if (d < 1.5) dest = null; }
    } else if (s === 'circle' && n.targetRef) {
      // back off / strafe around the target
      const away = tmp2.set(n.pos.x - n.targetRef.pos.x, 0, n.pos.z - n.targetRef.pos.z);
      const d = away.length(); away.normalize();
      const side = n.id % 2 ? 1 : -1;
      desired.set(-away.z * side, 0, away.x * side).addScaledVector(away, d < 3 ? 1 : d > 6 ? -0.6 : 0).normalize();
      speed = 1.6;
    } else if (s === 'surge' && n.surge) {
      desired.set(n.surge.dir.x, 0, n.surge.dir.z);
      desired.x += (n.surge.laneX - n.pos.x) * 0.15;
      desired.normalize();
      speed = n.surge.speed * n.speedMul;
    } else if (s === 'act' && n.yield > 0) {
      // step aside
      desired.set(n.pos.x - player.pos.x, 0, n.pos.z - player.pos.z).normalize();
      speed = 1.2; n.yield -= dt;
    }
    if (n.script && n.script.move) { const r = n.script.move(n, desired); if (r) { speed = r.speed; dest = r.dest || null; } }
    if (dest) {
      desired.set(dest.x - n.pos.x, 0, dest.z - n.pos.z);
      const d = desired.length();
      if (d > 0.05) desired.multiplyScalar(1 / d); else speed = 0;
      if (d < 1.2) speed *= d / 1.2;
    }
    // stuck recovery: if an agent wants to move but isn't, detour sideways for a moment
    if (n.detourT > 0) {
      n.detourT -= dt;
      const c = Math.cos(n.detourA), sn = Math.sin(n.detourA);
      desired.set(desired.x * c - desired.z * sn, 0, desired.x * sn + desired.z * c);
    }
    // obstacle avoidance: probe ahead, try rotated directions if blocked
    if (speed > 0.1) {
      const look = Math.min(1.6, 0.6 + speed * 0.3);
      if (this.world.blocked(n.pos.x + desired.x * look, n.pos.z + desired.z * look, 0.3)) {
        let found = false;
        for (const a of [0.7, -0.7, 1.4, -1.4, 2.2, -2.2]) {
          const c = Math.cos(a), sn = Math.sin(a);
          const dx = desired.x * c - desired.z * sn, dz = desired.x * sn + desired.z * c;
          if (!this.world.blocked(n.pos.x + dx * look, n.pos.z + dz * look, 0.3)) { desired.set(dx, 0, dz); found = true; break; }
        }
        if (!found) speed *= 0.2;
      }
    }
    if (DISABLED.has(s) || s === 'surrender' || s.startsWith('atk') || s.startsWith('throw') || s.startsWith('bomb') || s === 'loot_smash' || s === 'loot_grab' || s.startsWith('arson')) speed = s === 'atk_strike' ? 1.5 : 0;
    if (s === 'atk_strike' && n.targetRef) desired.set(n.targetRef.pos.x - n.pos.x, 0, n.targetRef.pos.z - n.pos.z).normalize();
    // integrate with acceleration limits
    const accel = s === 'flee' ? 9 : 6;
    const k = 1 - Math.exp(-accel * dt);
    n.vel.x += (desired.x * speed - n.vel.x) * k;
    n.vel.z += (desired.z * speed - n.vel.z) * k;
    n.pos.x += (n.vel.x + n.knock.x) * dt;
    n.pos.z += (n.vel.z + n.knock.z) * dt;
    n.knock.multiplyScalar(Math.exp(-dt * 5));
    this.world.resolveCircle(n.pos, n.radius);
    const A = this.arena;
    if (A && n !== A.boss) {
      const ax = n.pos.x - A.x, az = n.pos.z - A.z, ad = Math.hypot(ax, az);
      const R = A.r + 0.3; // margin: crowd separation afterwards can nudge a few centimetres
      if (ad < R) { const k = R / (ad || 1); n.pos.x = A.x + ax * k; n.pos.z = A.z + az * k; }
    }
    n.pos.y += (this.world.groundHeight(n.pos.x, n.pos.z) - n.pos.y) * Math.min(1, dt * 12);
    // heading
    const sp = Math.hypot(n.vel.x, n.vel.z);
    n.speed = sp;
    if (speed > 1.2 && sp < 0.35 && !DISABLED.has(s)) { n.stuckT = (n.stuckT || 0) + dt; if (n.stuckT > 0.8) { n.stuckT = 0; n.detourT = 1.0 + this.rng(); n.detourA = (this.rng() < 0.5 ? -1 : 1) * (1.2 + this.rng() * 0.6); } }
    else n.stuckT = 0;
    let want = n.heading;
    if (s === 'down' || s === 'recover' || s === 'arrested') want = n.heading;
    else if ((s.startsWith('atk') || s.startsWith('throw') || s === 'circle' || s === 'bomb_wind' || s === 'bomb_throw') && n.targetRef) want = headingTo(n.pos, n.targetRef.pos);
    else if (sp > 0.35 && s !== 'stagger' && !(s === 'act' && n.yield > 0)) want = Math.atan2(n.vel.x, n.vel.z);
    else if (s === 'act' || s === 'surrender' || s === 'loot_smash' || s === 'loot_grab' || s.startsWith('arson')) want = headingTo(n.pos, n.focus);
    if (n.script && n.script.heading) n.heading = n.script.heading(n, dt); // scripted facing (bosses)
    else if (n.attackStyle === 'shield' && n.targetRef && (s === 'pursue' || s === 'circle' || s === 'atk_wind')) {
      want = headingTo(n.pos, n.targetRef.pos);
      let dh = want - n.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      n.heading += Math.max(-SHIELD.turnRate * dt, Math.min(SHIELD.turnRate * dt, dh));
    } else n.heading = angleLerp(n.heading, want, 1 - Math.exp(-dt * (s === 'flee' ? 10 : 5)));
  }

  // Soft agent-agent and agent-player separation using the spatial hash.
  _separate(player, dt) {
    const near = [];
    for (const n of this.npcs) {
      if (n.state === 'gone') continue;
      const lying = n.state === 'down' || n.state === 'arrested';
      this.query(n.pos.x, n.pos.z, 0.9, near);
      for (const o of near) {
        if (o === n) continue;
        if (o.id !== undefined && o.id < n.id) continue; // each NPC pair once
        const isCop = o.id === undefined;
        const dx = o.pos.x - n.pos.x, dz = o.pos.z - n.pos.z;
        const d2 = dx * dx + dz * dz, minD = lying || o.state === 'down' ? 0.5 : 0.66;
        if (d2 < minD * minD && d2 > 1e-6) {
          const d = Math.sqrt(d2), push = (minD - d) / d * 0.5;
          if (isCop) { n.pos.x -= dx * push * 2; n.pos.z -= dz * push * 2; }
          else { n.pos.x -= dx * push; n.pos.z -= dz * push; o.pos.x += dx * push; o.pos.z += dz * push; }
        }
      }
      // player (heavier; shield stance makes him a wedge)
      const dx = player.pos.x - n.pos.x, dz = player.pos.z - n.pos.z;
      const d2 = dx * dx + dz * dz, minD = lying ? 0.45 : 0.72;
      if (d2 < minD * minD && d2 > 1e-6) {
        const d = Math.sqrt(d2), overlap = (minD - d) / d;
        const pm = player.blocking ? 5 : 1.6, nm = n.surge ? 2.6 : 1;
        const pk = nm / (pm + nm), nk = pm / (pm + nm);
        player.pos.x += dx * overlap * pk; player.pos.z += dz * overlap * pk;
        n.pos.x -= dx * overlap * nk; n.pos.z -= dz * overlap * nk;
        if (n.surge) { player.surgePush = (player.surgePush || 0) + dt; }
      }
    }
    // police are static obstacles for the player too
    for (const p of this.police) {
      if (p.off) continue;
      const dx = player.pos.x - p.pos.x, dz = player.pos.z - p.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 0.7 * 0.7 && d2 > 1e-6) { const d = Math.sqrt(d2), o = (0.7 - d) / d; player.pos.x += dx * o; player.pos.z += dz * o; }
    }
  }

  // ------------------------------------------------------------------ animation
  _animate(n, dt, t) {
    const rig = n.rig;
    const P = newPose();
    const s = n.state;
    const k01 = (x) => Math.max(0, Math.min(1, x));
    let rate = 12;
    baseLayer(P, rig, n.speed, t, dt, s === 'pursue' || s === 'circle');
    const ph = t * 1.0 + n.id * 0.37;
    const act = s === 'act' || s === 'walk' || s === 'surge' || s === 'calm';
    if (act) {
      const role = n.role;
      if (role === 'chant' || (s === 'surge' && n.id % 3 === 0)) {
        const beat = Math.sin(t * 5.2 + (n.group || 0)) ;
        P.shRX = -2.4 + beat * 0.35; P.elR = -0.5 - beat * 0.3; P.shRZ = -0.15;
        P.hdX = -0.15; P.y += Math.max(0, beat) * 0.03;
      } else if (role === 'flag') {
        P.shRX = -2.5; P.elR = -0.25; P.shRZ = -0.1 + Math.sin(t * 4 + n.id) * 0.45;
        P.itemZ = Math.sin(t * 4 + n.id) * 0.25;
      } else if (role === 'bigflag') {
        const sw = Math.sin(t * 1.6 + n.id);
        P.shRX = -2.85; P.elR = -0.2; P.shLX = -2.6; P.elL = -0.6; P.shLZ = -0.2;
        P.spZ = sw * 0.12; P.itemZ = sw * 0.45; P.spX = -0.05;
      } else if (role === 'placard') {
        const b = Math.sin(t * 3 + n.id);
        P.shRX = -2.75 + b * 0.1; P.elR = -0.15; P.shLX = -2.4; P.elL = -0.9; P.shLZ = -0.35; P.y += b * 0.01;
      } else if (role === 'film') {
        P.shRX = -1.45; P.elR = -0.85; P.shRZ = 0.12; P.hdX = 0.05;
      } else if (role === 'banner') {
        P.shRX = P.shLX = -1.0; P.elR = P.elL = -0.6; P.shLZ = 0.2; P.shRZ = -0.2;
      } else if (role === 'shout') {
        const b = Math.sin(t * 6 + n.id);
        P.shRX = -1.6 + b * 0.25; P.elR = -0.15; P.spX += 0.12; P.hdX = -0.2;
      } else if (role === 'watch') {
        // bystander: arms folded, weight on one leg, head turning
        P.shLX = P.shRX = -0.55; P.elL = P.elR = -2.0; P.shLZ = -0.42; P.shRZ = 0.42; P.hdY = Math.sin(t * 0.4 + n.id) * 0.5;
      } else if (role === 'photo') {
        // photographer: camera held up to the face, both hands
        P.shRX = -1.25; P.elR = -1.75; P.shRZ = 0.32; P.shLX = -1.25; P.elL = -1.75; P.shLZ = -0.32; P.hdX = 0.05;
      } else if (role === 'cower') {
        // frightened passer-by: hands to the face or head, hunched, glancing about
        const v = n.id % 3;
        if (v === 0) { P.shRX = P.shLX = -1.35; P.elR = P.elL = -2.3; P.shRZ = 0.35; P.shLZ = -0.35; }
        else if (v === 1) { P.shRX = P.shLX = -2.4; P.elR = P.elL = -2.0; P.shRZ = 0.25; P.shLZ = -0.25; }
        else { P.shRX = -1.3; P.elR = -2.3; P.shRZ = 0.35; P.shLX = -0.5; P.elL = -1.6; P.shLZ = -0.5; }
        P.spX += 0.12; P.hdY = Math.sin(t * 2.2 + n.id) * 0.45;
      } else if (role === 'clap') {
        const b = Math.sin(t * 9 + n.id);
        P.shRX = P.shLX = -1.1; P.elR = P.elL = -1.0; P.shLZ = -0.35 + b * 0.2; P.shRZ = 0.35 - b * 0.2;
      }
    } else if (s === 'flee') {
      if (n.temperament === 'civilian') {
        if (n.id % 2) { P.shLX = P.shRX = -2.5; P.elL = P.elR = -2.2; } // both hands over the head
        P.hdY = Math.sin(t * 2.6 + n.id) * 0.5; // looking back over the shoulder
      } else if (n.id % 4 === 0) { P.shLX = -2.6; P.elL = -2.2; } // arm shielding head
      P.spX = 0.3;
      if (n.rig.itemType === 'bigflag' || n.rig.itemType === 'banner') { P.shRX = -1.2; }
    } else if (n.attackStyle === 'shield' && rig.itemType === 'impshield' && (s === 'pursue' || s === 'circle' || s === 'atk_wind' || s === 'atk_strike' || s === 'atk_rec')) {
      // shield carried across the body; the bash drives it forward, the recovery drops it
      let sp = SHIELD_POSE.guard, sk = 10;
      if (s === 'atk_wind') { rate = 10; sp = SHIELD_POSE.wind; P.shLX = -1.1; P.elL = -1.9; P.spY = 0.45; P.spX = -0.12; P.knL = P.knR = 0.4; P.y = -0.06; }
      else if (s === 'atk_strike') { rate = 30; sp = SHIELD_POSE.strike; sk = 30; P.shLX = -1.5; P.elL = -0.6; P.spY = -0.35; P.spX = 0.35; P.hpLX = -0.6; P.knL = 0.45; }
      else if (s === 'atk_rec') { rate = 7; sp = SHIELD_POSE.open; sk = 12; P.shLX = -0.3; P.elL = -0.4; P.spX = 0.25; P.hdX = 0.3; } // dropped: the opening
      else { P.shLX = -1.25; P.elL = -1.8; P.shLZ = 0.35; P.spX = 0.12; P.knL = P.knR = 0.22; P.y = -0.03; }
      P.shRX = -0.5; P.elR = -1.5; P.shRZ = -0.2;
      if (rig.item) {
        const k = 1 - Math.exp(-dt * sk);
        rig.item.position.lerp(sp[0], k);
        rig.item.rotation.set(rig.item.rotation.x + (sp[1].x - rig.item.rotation.x) * k, rig.item.rotation.y + (sp[1].y - rig.item.rotation.y) * k, rig.item.rotation.z + (sp[1].z - rig.item.rotation.z) * k);
      }
    } else if (s === 'pursue' || s === 'circle') {
      P.elR = P.elL = -1.6; P.shRX = P.shLX = -0.5; P.shLZ = 0.2; P.shRZ = -0.2;
      if (n.attackStyle === 'thrower' && rig.itemType !== 'none') { P.shRX = -0.2; P.elR = -0.4; }
    } else if (s === 'atk_wind') {
      rate = 16;
      if (n.attackKind === 'shove') { P.shRX = P.shLX = -0.8; P.elR = P.elL = -1.9; P.spX = -0.1; P.shLZ = -0.2; P.shRZ = 0.2; }
      else { P.shRX = 0.5; P.shRZ = -0.5; P.elR = -2.2; P.spY = -0.55; P.shLX = -1.1; P.elL = -1.4; }
      P.knL = P.knR = 0.3; P.y = -0.05;
    } else if (s === 'atk_strike' || s === 'atk_rec') {
      rate = s === 'atk_strike' ? 30 : 8;
      if (n.attackKind === 'shove') { P.shRX = P.shLX = -1.5; P.elR = P.elL = -0.1; P.spX = 0.35; P.shLZ = -0.12; P.shRZ = 0.12; }
      else { P.shRX = -1.55; P.shRZ = 0.15; P.elR = -0.05; P.spY = 0.5; P.spX = 0.2; P.shLX = -0.4; P.elL = -1.5; }
      P.hpLX = -0.5; P.knL = 0.4; P.hpRX = 0.3;
    } else if (s === 'throw_prep') {
      crouch(P, k01(n.st / 0.35)); P.shRX = -0.9; P.elR = -0.2;
    } else if (s === 'throw_wind') {
      rate = 14;
      P.shRX = -2.7; P.shRZ = -0.35; P.elR = -1.7; P.spY = -0.6; P.spX = -0.15; P.shLX = -1.4; P.shLZ = 0.1;
      P.hpLX = -0.4; P.knL = 0.2; P.hpRX = 0.25;
    } else if (s === 'throw_rel') {
      rate = 26;
      P.shRX = -0.6; P.shRZ = 0.25; P.elR = -0.1; P.spY = 0.55; P.spX = 0.4; P.shLX = -0.2;
      P.hpLX = -0.6; P.knL = 0.5; P.hpRX = 0.35;
    } else if (s === 'stagger') {
      rate = 18;
      const b = n.staggerBack ? -1 : 1;
      P.spX = 0.4 * b; P.hdX = 0.4 * b; P.shLZ = 0.9; P.shRZ = -0.9; P.shLX = -0.6; P.shRX = -0.4;
      P.elL = P.elR = -0.6; P.knL = 0.3 + Math.sin(n.st * 18) * 0.2; P.knR = 0.3 - Math.sin(n.st * 18) * 0.2;
      P.hpLX = Math.sin(n.st * 14) * 0.4; P.hpRX = -P.hpLX;
    } else if (s === 'down') {
      rate = n.st < 0.5 ? 9 : 4;
      lying(P, n.fallDir, 1, t);
    } else if (s === 'recover') {
      rate = 10;
      const k = n.st / n.dur;
      if (k < 0.5) { lying(P, n.fallDir, 1 - k * 2, t); crouch(P, k * 2); P.tiltX = n.fallDir * 1.5 * (1 - k * 2); P.shLX = -1.0; P.shRX = -1.0; }
      else { crouch(P, (1 - k) * 2); P.shLX = -0.4; P.shRX = -0.4; }
    } else if (s === 'surrender') {
      P.shRX = P.shLX = -2.9; P.elR = P.elL = -0.5; P.shLZ = 0.25; P.shRZ = -0.25; P.hdX = 0.25;
    } else if (s === 'arrested') {
      rate = 6;
      P.hpLX = P.hpRX = 0.0; P.knL = P.knR = 1.55; P.y = -0.42;
      P.shLX = P.shRX = 0.55; P.elL = P.elR = -1.2; P.shLZ = -0.15; P.shRZ = 0.15; P.hdX = 0.35; P.spX = 0.15;
    } else if (s === 'loot_move') {
      if (rig.itemType === 'loot') { P.shRX = P.shLX = -0.75; P.elR = P.elL = -1.25; P.shLZ = -0.25; P.shRZ = 0.25; }
      else if (rig.itemType === 'bottle') { P.shRX = -0.3; P.elR = -0.8; }
    } else if (s === 'loot_smash') {
      rate = 16;
      const ph2 = (n.st * 1.6 + n.id * 0.3) % 1, k = Math.sin(ph2 * Math.PI * 2);
      if (n.id % 2 === 0) {
        // front kicks at the shutter
        const kk = Math.max(0, k);
        P.hpRX = -1.3 * kk; P.knR = 0.9 * (1 - kk) + 0.2; P.spX = -0.15 * kk; P.shLX = -0.6; P.shRX = -0.4; P.elL = P.elR = -1.2;
      } else {
        // overhand blows at the glass
        P.shRX = -1.9 - k * 0.9; P.elR = -0.6 - Math.max(0, k) * 0.8; P.spY = -0.25 * k; P.spX = 0.1 + 0.15 * Math.max(0, -k); P.shLX = -0.9; P.elL = -1.2;
      }
    } else if (s === 'loot_grab') {
      crouch(P, 0.75); P.shRX = P.shLX = -1.1; P.elR = P.elL = -0.4; P.hdX = 0.3;
    } else if (s === 'arson_light') {
      P.shRX = -0.9; P.elR = -1.5; P.shLX = -0.95; P.elL = -1.5; P.shLZ = -0.35; P.shRZ = 0.35; P.hdX = 0.35;
    } else if (s === 'arson_wind') {
      rate = 10;
      P.shRX = -2.8; P.shRZ = -0.3; P.elR = -1.8; P.spY = -0.65; P.spX = -0.2; P.shLX = -1.35; P.shLZ = 0.1; P.elL = -0.2;
      P.hpLX = -0.45; P.knL = 0.25; P.hpRX = 0.3;
    } else if (s === 'arson_throw') {
      rate = 26;
      P.shRX = -0.5; P.shRZ = 0.25; P.elR = -0.05; P.spY = 0.6; P.spX = 0.45; P.shLX = -0.2;
      P.hpLX = -0.6; P.knL = 0.5; P.hpRX = 0.35;
    } else if (s === 'bomb_retrieve') {
      crouch(P, k01(n.st / 0.4) * 0.9); P.shRX = -0.8; P.elR = -0.4; P.shLX = -0.7; P.elL = -0.6; P.hdX = 0.4;
    } else if (s === 'bomb_light') {
      P.shRX = -0.9; P.elR = -1.5; P.shLX = -0.95; P.elL = -1.5; P.shLZ = -0.35; P.shRZ = 0.35; P.hdX = 0.35;
      P.y += Math.sin(t * 20) * 0.003;
    } else if (s === 'bomb_wind') {
      rate = 10;
      const tr = Math.sin(t * 30) * 0.03;
      P.shRX = -2.8 + tr; P.shRZ = -0.3; P.elR = -1.8; P.spY = -0.65; P.spX = -0.2; P.shLX = -1.35; P.shLZ = 0.1; P.elL = -0.2;
      P.hpLX = -0.45; P.knL = 0.25; P.hpRX = 0.3;
    } else if (s === 'bomb_throw') {
      rate = 26;
      P.shRX = -0.5; P.shRZ = 0.25; P.elR = -0.05; P.spY = 0.6; P.spX = 0.45; P.shLX = -0.2;
      P.hpLX = -0.6; P.knL = 0.5; P.hpRX = 0.35;
    }
    // face: mouth and smile follow what the person is doing
    {
      const beat = Math.max(0, Math.sin(t * 5.2 + (n.group || 0)));
      const jit = 0.5 + 0.5 * Math.sin(t * 13 + n.id * 1.7) * Math.sin(t * 7.3 + n.id);
      if (s === 'act' || s === 'walk' || s === 'surge' || s === 'calm') {
        const r = n.role;
        if (r === 'cower') { P.mouth = 0.3 + jit * 0.45; P.brow = -1; P.smile = 0; }
        else if (r === 'chant' || r === 'flag' || r === 'bigflag' || r === 'placard' || r === 'banner' || s === 'surge') { P.mouth = beat * 0.85; P.smile = n.temperament === 'peaceful' ? 0.25 : 0; P.brow = n.temperament === 'peaceful' ? 0 : 0.4; }
        else if (r === 'shout') { P.mouth = 0.45 + jit * 0.5; P.brow = 0.7; }
        else if (r === 'clap') { P.mouth = beat * 0.5; P.smile = 0.6; }
        else { P.mouth = jit > 0.75 ? (jit - 0.75) * 1.6 : 0; P.smile = (n.id % 3 === 0) ? 0.35 : 0.1; } // chatting
      } else if (s === 'flee') { P.mouth = n.temperament === 'civilian' ? 0.6 + jit * 0.4 : 0.45 + jit * 0.35; P.brow = -1; }
      else if (s === 'pursue' || s === 'circle' || s.startsWith('atk') || s.startsWith('throw') || s.startsWith('bomb') || s === 'loot_smash' || s.startsWith('arson')) { P.mouth = 0.35 + jit * 0.6; P.brow = 1; }
      else if (s === 'stagger') { P.mouth = 0.85; P.brow = -1; }
      else if (s === 'down' || s === 'recover') { P.mouth = 0.3 + jit * 0.2; P.brow = -0.8; }
      else if (s === 'surrender') { P.mouth = 0.15; P.brow = -0.6; }
    }
    if (n.script && n.script.pose) { const r = n.script.pose(n, P, dt, t); if (r) rate = r; } // bosses pose themselves
    applyPose(rig, P, dt, rate);
    // lying bodies sit slightly above ground
    rig.root.position.y = n.pos.y + (s === 'down' ? 0.12 : s === 'recover' ? 0.12 * Math.max(0, 1 - n.st / (n.dur * 0.5)) : 0);
  }

  // ------------------------------------------------------------------ Level 2 support
  // Add the reserve crews once (Level 2), then switch them on or off per level.
  addReserveCrews() {
    if (this.reserveCrews) return;
    const rng = mulberry(9001); // own stream: Level 1's crowd is untouched
    this.reserveCrews = RESERVE_SITES.map(([side, z], i) => ({ id: this.crews.length + i, side, z0: z, home: z, door: V(), rally: V(), members: [], reserve: true }));
    for (const c of this.reserveCrews) {
      this.crews.push(c);
      for (let k = 0; k < CREW_SIZE; k++) { const n = this._spawn(randomOutfit(rng)); n.kind = 'looter'; n.crew = c; c.members.push(n); n.rig.pose = newPose(); this.retire(n); n.temperament = 'reserve'; }
    }
  }
  setReserve(on) { this.reserveOn = !!on && !!this.reserveCrews; }

  // Boss arena: nobody but the boss may stand inside; people already there are moved out.
  setArena(x, z, r, boss) {
    this.arena = { x, z, r, boss };
    for (const n of this.npcs) {
      if (n === boss || n.state === 'gone') continue;
      for (const v of [n.pos, n.anchor, n.target]) {
        const dx = v.x - x, dz = v.z - z, d = Math.hypot(dx, dz);
        if (d < r + 3) { const k = (r + 4 + Math.random() * 4) / (d || 1); v.x = x + dx * k; v.z = z + dz * k; }
      }
      if (n.march) n.march = null;
    }
  }
  clearArena() { this.arena = null; }

  // Officers not present in the current level (e.g. Level 2 has no cut-off group at Oberkampf).
  setPoliceOff(roles = []) {
    for (const p of this.police) { p.off = roles.includes(p.role); p.rig.root.visible = !p.off; }
  }

  // Take a character out of the simulation (hidden, untouchable) until a script places it.
  retire(n) {
    this.setState(n, 'gone');
    n.rig.root.visible = false;
    setRingVisible(n.rig, false);
    n.script = null; n.temperament = 'scripted'; n.threat = false; n.neutralized = false; n.arrested = false;
    n.vel.set(0, 0, 0); n.knock.set(0, 0, 0); n.stimuli.length = 0;
    if (this.far) n.lod = 2;
  }

  // A scripted character with a fixed outfit (Level 2's Leader). Kept out of every
  // crowd pool: its temperament is never 'peaceful', 'looter' or 'civilian'.
  spawnSpecial(outfit) {
    const n = this._spawn(outfit);
    n.special = true; n.kind = 'special'; n.untargetable = true;
    n.hp = 99; n.radius = 0.34; n.mass = 1.3; n.speedMul = 1; n.courage = 1; n.fear = 0;
    n.stimuli.length = 0; n.hitCount = 0; n.surge = null; n.march = null; n.thinkT = 0; n.animAcc = 0; n.cool = 0;
    n.rig.pose = newPose();
    this.retire(n);
    return n;
  }

  _updatePolice(dt, t, player) {
    const hostileNear = this.npcs.some((n) => this.isThreat(n) && n.pos.z > 115);
    for (const p of this.police) {
      if (p.off) continue;
      const rig = p.rig;
      const P = newPose();
      baseLayer(P, rig, 0, t + p.pos.x, dt, true);
      if (p.role !== 'injured') this._copCombat(p, P, dt);
      if (p.role === 'line' || p.role === 'squad') {
        const k = hostileNear ? 1 : 0.5;
        rig.shieldBlend += (k - rig.shieldBlend) * Math.min(1, dt * 4);
        updateShield(rig, rig.shieldBlend);
        P.shLX = -1.3 * rig.shieldBlend; P.elL = -0.5 * rig.shieldBlend; P.shRX = -0.3; P.elR = -0.5;
        if (p.flinch > 0) { p.flinch -= dt; P.spX = -0.25; P.hdX = -0.2; }
        // look toward nearest threat
        let best = null, bd = 400;
        for (const n of this.npcs) if (this.isThreat(n)) { const d = n.pos.distanceToSquared(p.pos); if (d < bd) { bd = d; best = n; } }
        const want = best ? headingTo(p.pos, best.pos) : Math.PI;
        if (!p.atk) p.heading = angleLerp(p.heading, want, 1 - Math.exp(-dt * 3));
      } else if (p.role === 'injured') {
        P.hpLX = P.hpRX = -1.5; P.knL = 0.2; P.knR = 1.2; P.y = -0.62; P.spX = -0.3; P.shLX = -0.4; P.shLZ = 0.4; P.hdX = 0.2;
        updateShield(rig, 0);
        if (rig.shield) rig.shield.visible = false;
      } else {
        updateShield(rig, 1);
        P.shLX = -1.3; P.elL = -0.5;
        if (!p.atk) p.heading = angleLerp(p.heading, headingTo(p.pos, player.pos), 1 - Math.exp(-dt * 1.5));
      }
      if (p.atk) this._copPose(p, P);
      const pd = p.pos.distanceTo(player.pos);
      rig.root.visible = pd < 70;
      const sh = pd < 16;
      if (sh !== p.shadow) { p.shadow = sh; for (const m of rig.meshes) m.castShadow = sh; }
      if (!rig.root.visible) continue;
      applyPose(rig, P, dt, p.atk ? 26 : 8);
      rig.root.position.copy(p.pos);
      rig.root.rotation.y = p.heading;
    }
  }

  // Officers defend themselves: step out towards an aggressor that comes close,
  // wind up and strike with the baton, then fall back to their post.
  _copCombat(p, P, dt) {
    if (!p.home) p.home = p.pos.clone();
    p.cool = Math.max(0, (p.cool || 0) - dt);
    let target = null, bd = 4.2 * 4.2;
    for (const n of this.query(p.pos.x, p.pos.z, 4.5, [])) {
      if (n.id === undefined || !this.isThreat(n) || n.state === 'down' || n.state === 'stagger') continue;
      const d = n.pos.distanceToSquared(p.pos); if (d < bd) { bd = d; target = n; }
    }
    if (p.atk) {
      p.atk.t += dt;
      const tg = p.atk.target;
      p.heading = angleLerp(p.heading, headingTo(p.pos, tg.pos), 1 - Math.exp(-dt * 10));
      if (p.atk.phase === 'wind' && p.atk.t > 0.28) {
        p.atk.phase = 'strike'; p.atk.t = 0;
        this.game.audio.swing(p.pos);
        const dx = tg.pos.x - p.pos.x, dz = tg.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d < 2.2 && tg.state !== 'down') {
          const dir = new THREE.Vector3(dx / d, 0, dz / d);
          this.copHit(tg, dir);
        }
      } else if (p.atk.phase === 'strike' && p.atk.t > 0.16) { p.atk.phase = 'rec'; p.atk.t = 0; }
      else if (p.atk.phase === 'rec' && p.atk.t > 0.35) { p.atk = null; p.cool = 0.9 + this.rng() * 1.2; }
      return;
    }
    if (target && p.cool <= 0) {
      const d = Math.sqrt(bd);
      if (d > 1.9) {
        // step towards the aggressor, but don't leave the post by more than ~2.5 m
        const step = Math.min(dt * 2.2, d - 1.6);
        const nx = p.pos.x + (target.pos.x - p.pos.x) / d * step, nz = p.pos.z + (target.pos.z - p.pos.z) / d * step;
        if (Math.hypot(nx - p.home.x, nz - p.home.z) < 2.5 && !this.world.blocked(nx, nz, 0.3)) { p.pos.x = nx; p.pos.z = nz; P.knL = 0.3; P.knR = 0.15; }
      } else p.atk = { phase: 'wind', t: 0, target };
    } else if (!target) {
      // drift back to the post
      const dx = p.home.x - p.pos.x, dz = p.home.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.05) { const st = Math.min(d, dt * 1.2); p.pos.x += dx / d * st; p.pos.z += dz / d * st; }
    }
  }

  _copPose(p, P) {
    const a = p.atk;
    if (a.phase === 'wind') { P.shRX = -2.6; P.shRZ = -0.45; P.elR = -1.35; P.spY = -0.45; P.spX = -0.05; }
    else if (a.phase === 'strike') { P.shRX = -0.55; P.shRZ = 0.32; P.elR = -0.15; P.spY = 0.5; P.spX = 0.25; P.hpLX = -0.5; P.knL = 0.35; }
    else { P.shRX = -0.6; P.elR = -0.6; P.spY = 0.15; }
  }

  // a police baton strike: staggers the aggressor and drives them back; repeated
  // hits can put them down (counts as neutralised, with a smaller assist score)
  copHit(n, dir) {
    const g = this.game;
    g.audio.impact(n.pos, false);
    g.effects.impact(n.pos.clone().setY(n.pos.y + 1.3));
    n.knock.copy(dir).multiplyScalar(3.6);
    n.copHits = (n.copHits || 0) + 1;
    if (n.copHits >= 4 && this.rng() < 0.35 && !n.script) {
      n.fallDir = -1;
      this.setState(n, 'down', 4 + this.rng() * 2);
      if (!n.neutralized) { n.neutralized = true; g.missions.stats.neutralized++; g.missions.addScore(50, 'Officer assist'); }
    } else {
      this.setState(n, 'stagger', 0.6);
      n.staggerBack = true;
    }
    this.disturb(n.pos, 6, 0.35, 'violence', n);
  }

  // Helpers used by missions --------------------------------------------------
  nearest(pos, filter, maxD = 999) {
    let best = null, bd = maxD * maxD;
    for (const n of this.npcs) {
      if (n.state === 'gone' || !filter(n)) continue;
      const d = n.pos.distanceToSquared(pos);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  threats() { return this.npcs.filter((n) => this.isThreat(n)); }

  arrestable(pos) {
    return this.nearest(pos, (n) => n.neutralized && !n.arrested && (n.state === 'down' || n.state === 'recover' || n.state === 'surrender'), 2.3);
  }

  arrest(n) {
    n.arrested = true;
    clearItem(n.rig);
    this.setState(n, 'arrested');
    n.vel.set(0, 0, 0);
  }

  randomCrowdPos() {
    const n = this.npcs[Math.floor(Math.random() * this.npcs.length)];
    return n.pos;
  }
}

```

## src/dev.js

```js
// Developer helpers, loaded only with ?dev in the URL. Lets automated tests
// step the simulation deterministically when the tab is not animating.
//  ?dev&level=2         start in Level 2 (ignores the unlock)
//  ?dev&level=2&stage=3 start Level 2 at section 3
//  ?seed=N              seeded run: __start({ audio: false }) then __step / __botRun replay exactly
import { LEVELS, Progress } from './levels.js';
import { randomOutfit } from './characters.js';
import { mulberry } from './textures.js';
import { reseed, SEED } from './seed.js';
import { lintBoss, ENFORCER, LEADER } from './boss.js';

export function installDev(game) {
  // Fixed-step simulation. The first call hands the simulation to the harness:
  // the real-time loop then only renders (see Game.frame), so runs are reproducible.
  window.__step = (sec, fn) => {
    game.manualStep = true;
    const n = Math.round(sec * 60);
    for (let i = 0; i < n; i++) { if (fn) fn(i); if (game.state === 'playing') game.update(1 / 60); game.input.endFrame(); }
    game.renderer.shadowMap.needsUpdate = true;
    game.render();
  };
  // __start({ audio, seed }). With a seed (or ?seed=N) the run is reproducible: the menu's
  // background simulation has already consumed random numbers and moved people for a
  // variable number of frames, so every random stream and the simulation are reset here.
  window.__start = (opts = {}) => {
    if (opts.audio !== false) game.audio.init();
    game.play(); game._dismissOnboarding();
    const seed = opts.seed ?? SEED;
    if (seed !== null && seed !== undefined) {
      game.manualStep = true;
      reseed(seed);
      game.crowd.rng = mulberry(seed + 4242);
      game.time = 0;
      game.crowd.maxSkinned = 20;
      game.effects.emitAcc = 0; game.effects.smoke.clear();
      game.restart();
    }
  };
  window.__live = () => { game.manualStep = false; }; // give the simulation back to the real-time loop
  // levels and progression
  window.__level = (id, stage = null) => { if (!LEVELS[id]) return 'no such level'; game.devStage = stage; game.setLevel(id); game.restart(); return { level: id, stage }; };
  window.__jump = (i) => { if (!game.missions.jumpTo) return 'this level has no sections'; game.missions.jumpTo(i); return game.missions.section; };
  window.__unlock = (id = 2) => { Progress.unlock(id); game._syncLevelMenu(); return Progress.unlocked(id); };
  window.__resetProgress = () => { Progress.reset(); game._syncLevelMenu(); return Progress.unlocked(2); };
  // bosses: jump to a fight, land a hit through the real hit path, check the fairness rules
  window.__boss = (name = 'enforcer') => window.__level(2, name === 'leader' ? 4 : 2);
  window.__bossHit = (from = 'back') => {
    const b = game.missions.boss; if (!b) return 'no boss';
    const n = b.n, f = from === 'back' ? -1.6 : 1.6;
    const pos = n.pos.clone().add({ x: Math.sin(n.heading) * f, y: 0, z: Math.cos(n.heading) * f });
    const dir = n.pos.clone().sub(pos).setY(0).normalize();
    return { result: game.crowd.onBatonHit(n, dir, pos), hp: b.hp, phase: b.phaseIdx + 1, state: b.s };
  };
  window.__lintBosses = () => ({ enforcer: lintBoss(ENFORCER), leader: lintBoss(LEADER) });
  // line up a few agents in front of the camera for inspection
  window.__studio = (filter, z = 156, n = 4) => {
    const list = game.crowd.npcs.filter(filter).slice(0, n);
    list.forEach((a, i) => { a.pos.set(-3 + i * 2, 0, z); a.anchor.copy(a.pos); a.state = 'act'; a.st = 0; a.dur = 99; a.lookT = 99; a.focus.set(0, 0, 175); });
    game.player.pos.set(0.6, 0, z + 4); game.player.heading = Math.PI; game.cameraRig.yaw = 0; game.cameraRig.pitch = -0.06;
    return list.map((a) => [a.id, a.rig.kind, a.role]);
  };
  // A simple test bot that plays with normal controls only (no teleporting):
  // chases the nearest active threat, otherwise follows the objective marker,
  // arrests downed aggressors and extracts the officers at the end.
  window.__bot = { log: [], stuckT: 0, side: 1, last: null };
  window.__botTick = () => {
    const g = game, I = g.input, m = g.missions, B = window.__bot, p = g.player.pos;
    // the page pauses itself on blur / visibility / pointer-lock loss; the bot carries on
    if (g.state === 'paused') { g._screen(null); g.state = 'playing'; g.audio.setPaused(false); B.pauses = (B.pauses || 0) + 1; }
    I.keys.clear(); I.buttons.clear();
    // cinematics: skipped with a key press (set __bot.watch = true to let them play)
    if (g.cinematic && !B.watch) { I.edges.add('Enter'); window.__step(0.1); return; }
    const threat = g.crowd.nearest(p, (n) => g.crowd.isThreat(n) || (n.script && n.script.active), m.stage === 'p3' ? 12 : 30);
    let goal = null, fight = false;
    if (threat) { goal = threat.pos; fight = true; } else if (m.markerPos) goal = m.markerPos;
    if (g.crowd.arrestable(p) && !threat) I.edges.add('KeyE');
    if (m.boss && m.boss.s === 'defeated') { goal = m.boss.n.pos; fight = false; if (p.distanceTo(goal) < 2.4) I.edges.add('KeyE'); }
    if (m.stage === 'final' && m.extractReady && Math.hypot(p.x + 3, p.z + 112) < 4) I.edges.add('KeyE');
    if (goal) {
      const dx = goal.x - p.x, dz = goal.z - p.z, d = Math.hypot(dx, dz);
      g.cameraRig.yaw = Math.atan2(-dx, -dz) + (B.stuckT > 0.6 ? B.side * 0.9 : 0);
      // bosses: react to what can be seen (wind-up pose and ring, charge, opening), never to
      // whether a wind-up is a feint; block blockable attacks, dodge sideways out of heavy ones
      const bs = fight && threat.boss;
      // shields: raise the shield, close in and wait for the bash; strike once it is lowered
      const guarded = fight && threat.attackStyle === 'shield' && g.crowd.guards(threat, p);
      if (bs && bs.active) {
        const a = bs.cur, s = bs.s, side = B.side > 0 ? 'KeyD' : 'KeyA';
        const dodge = () => { if (B.lastDodged !== a) { B.lastDodged = a; I.keys.add(side); I.edges.add('Space'); B.side *= -1; B.dodges = (B.dodges || 0) + 1; } };
        if (s === 'rec' || s === 'stun') { if (d < 1.9) I.edges.add('Mouse0'); else { I.keys.add('KeyW'); if (d > 3) I.keys.add('ShiftLeft'); } }
        else if (s === 'wind' && a) {
          if (a.blockable) { I.buttons.add(2); if (d > 2.0) I.keys.add('KeyW'); }
          else if (a.kind === 'charge') I.buttons.add(2); // wait for the launch: the charge aims as the wind-up ends
          else if (d < a.range + 0.7 && bs.t > a.wind - 0.25) dodge();
          else I.buttons.add(2);
        }
        else if (s === 'charge') { if (d < 4.2) dodge(); }
        else if (s === 'transition') I.keys.add('KeyS');
        else { I.buttons.add(2); if (d > 2.3) I.keys.add('KeyW'); }
      }
      else if (guarded && d < 3.5) { I.buttons.add(2); if (d > 1.7) I.keys.add('KeyW'); }
      else if (fight && d < 1.8) I.edges.add('Mouse0'); else { I.keys.add('KeyW'); if (d > 6) I.keys.add('ShiftLeft'); if (B.strafeT > 0) { B.strafeT -= 0.1; I.keys.add(B.side > 0 ? 'KeyD' : 'KeyA'); I.keys.delete('KeyW'); } }
      const before = p.clone();
      window.__step(0.1);
      if (p.distanceTo(before) < 0.05 && !(fight && d < 1.8)) { B.stuckT += 0.1; if (B.stuckT > 1.2) { B.stuckT = 0; B.side *= -1; B.strafeT = 1.6; } } else B.stuckT = Math.max(0, B.stuckT - 0.05);
    } else window.__step(0.1);
    if (B.last !== m.stage) { B.log.push([m.stage, +m.t.toFixed(1)]); B.last = m.stage; }
  };
  window.__botRun = (ms = 20000) => {
    const t0 = performance.now(); let i = 0;
    while (performance.now() - t0 < ms && !game.missions.ended) { window.__botTick(); i++; }
    const m = game.missions;
    return { ticks: i, log: window.__bot.log, t: +m.t.toFixed(1), stage: m.stage, hp: +game.player.health.toFixed(0), score: m.score, ended: m.ended, state: game.state };
  };

  // Audio probe: taps the mix before and after the limiter and reports, per second,
  // RMS and peak level (dBFS), clipped samples and the voices playing.
  window.__audioProbe = (seconds = 10) => new Promise((resolve) => {
    const a = game.audio, c = a.ctx;
    if (!c) return resolve({ error: 'audio not initialised' });
    const tap = (node) => {
      const sp = c.createScriptProcessor(4096, 2, 1), acc = { sum: 0, n: 0, peak: 0, clip: 0 };
      sp.onaudioprocess = (e) => {
        for (let ch = 0; ch < e.inputBuffer.numberOfChannels; ch++) {
          const d = e.inputBuffer.getChannelData(ch);
          for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); acc.sum += v * v; acc.n++; if (v > acc.peak) acc.peak = v; if (v >= 0.999) acc.clip++; }
        }
      };
      const mute = c.createGain(); mute.gain.value = 0;
      node.connect(sp); sp.connect(mute).connect(c.destination);
      return { sp, acc };
    };
    const pre = tap(a.makeup), post = tap(a.limiter);
    const dB = (v) => (v > 0 ? +(20 * Math.log10(v)).toFixed(1) : -120);
    const rows = [];
    let k = 0;
    const iv = setInterval(() => {
      const row = { s: ++k, rms: dB(Math.sqrt(post.acc.sum / Math.max(1, post.acc.n))), peak: dB(post.acc.peak), clip: post.acc.clip, prePeak: dB(pre.acc.peak), voices: a.stats().cats, sirens: a.vehicles.length };
      rows.push(row);
      for (const t of [pre, post]) Object.assign(t.acc, { sum: 0, n: 0, peak: 0, clip: 0 });
      if (k >= seconds) { clearInterval(iv); for (const t of [pre, post]) t.sp.disconnect(); resolve(rows); }
    }, 1000);
  });

  // count how often each sound is requested and how often the voice limiter admits it
  window.__audioEvents = (seconds = 30) => new Promise((resolve) => {
    const a = game.audio, counts = {}, admitted = {};
    const names = ['explosion', 'molotov', 'glass', 'impact', 'swing', 'shout', 'chant', 'whistle', 'roar', 'crash', 'shutter', 'firework', 'distantBang', 'footstep', 'hurt', 'thump', 'adhan', 'alarm', 'scream'];
    const orig = {};
    for (const n of names) { orig[n] = a[n]; a[n] = function (...args) { counts[n] = (counts[n] || 0) + 1; return orig[n].apply(this, args); }; }
    const admit = a._admit;
    a._admit = function (cat, level) { const v = admit.call(this, cat, level); if (v) admitted[cat] = (admitted[cat] || 0) + 1; return v; };
    setTimeout(() => { for (const n of names) a[n] = orig[n]; a._admit = admit; resolve({ seconds, requested: counts, admitted }); }, seconds * 1000);
  });

  // Frame cost split into simulation and rendering. renderer.info is accumulated over
  // all post-processing passes (the composer resets it per pass), and gl.finish() makes
  // the GPU time count. `programs` is the number of compiled shader programs.
  window.__perf = (frames = 60) => {
    const info = game.renderer.info, gl = game.renderer.getContext();
    let up = 0, rd = 0, calls = 0, tris = 0;
    for (let i = 0; i < frames; i++) {
      const t0 = performance.now();
      game.update(1 / 60);
      const t1 = performance.now();
      info.autoReset = false; info.reset();
      game.render(); gl.finish();
      info.autoReset = true;
      rd += performance.now() - t1; up += t1 - t0;
      calls += info.render.calls; tris += info.render.triangles;
    }
    return { msPerFrame: +((up + rd) / frames).toFixed(2), updateMs: +(up / frames).toFixed(2), renderMs: +(rd / frames).toFixed(2), calls: Math.round(calls / frames), tris: Math.round(tris / frames), programs: info.programs.length };
  };

  // ------------------------------------------------------------------------
  // Appearance audit: do the people the game turns hostile look different from
  // the people it could have picked?
  //
  // For each seed the whole crowd gets freshly generated appearances from the real
  // generator (randomOutfit), Math.random is seeded, the level is restarted and the
  // real Level 1 selection code runs: _startP1/_startP2/_startP3 (aggressors, surges,
  // bombers), the Rue de Malte ambush (triggered by moving the officer), ambient
  // threats and the final wave. Every makeHostile / bomber call is recorded together
  // with the pool it was drawn from (peaceful demonstrators at that moment, plus the
  // chosen person). Seed 0 audits the crowd exactly as it was built, without swapping.
  //
  // Per marker it compares the observed count among selected characters with the
  // count expected from their pools: z = (O - E) / sqrt(sum p(1-p)), two-sided, with
  // a Bonferroni correction over all markers (familywise alpha 0.05).
  // What a pass means: no skew larger than the reported minimum detectable difference
  // was found in these samples. It is a screening check, not a proof of independence.
  // A self-test re-runs the statistic on a deliberately biased selector (2x weight on
  // one marker) over the same recorded pools, to show the check can detect skew.
  //
  // The appearance data are swapped on the NPC records only; their 3D rigs are not
  // rebuilt (the selection code reads neither). Everything is restored afterwards.
  const MARKERS = {
    keffiyeh: (n) => n.outfit.scarf === 'keffiyeh' || n.outfit.mask === 'keffiyeh',
    algeriaShirt: (n) => n.outfit.shellPattern === 6,
    psg: (n) => n.outfit.top === 'psg' || n.outfit.scarf === 'psg',
    headscarf: (n) => !!n.outfit.headscarf,
    faceCovered: (n) => n.outfit.mask !== 'none',
    balaclava: (n) => n.outfit.mask === 'balaclava',
    hiVis: (n) => !!n.outfit.vest,
    smartClothes: (n) => !!n.outfit.smart,
    female: (n) => n.outfit.gender === 'f',
    complexionEu: (n) => n.outfit.ethnicity === 'eu',
    complexionNa: (n) => n.outfit.ethnicity === 'na',
    complexionAf: (n) => n.outfit.ethnicity === 'af',
    palestinianFlag: (n) => (n.rig.itemType === 'flag' || n.rig.itemType === 'bigflag') && n.rig.itemVariant === 'pal',
    algerianFlag: (n) => (n.rig.itemType === 'flag' || n.rig.itemType === 'bigflag') && n.rig.itemVariant === 'alg',
    frenchFlag: (n) => n.rig.itemVariant === 'fr',
  };
  const KEYS = Object.keys(MARKERS);
  const maskOf = (n) => KEYS.reduce((m, k, i) => (MARKERS[k](n) ? m | (1 << i) : m), 0);
  // inverse standard normal CDF (Acklam's rational approximation)
  const probit = (p) => {
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
    const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
    const q = Math.min(p, 1 - p);
    let x;
    if (q < 0.02425) { const t = Math.sqrt(-2 * Math.log(q)); x = (((((c[0] * t + c[1]) * t + c[2]) * t + c[3]) * t + c[4]) * t + c[5]) / ((((d[0] * t + d[1]) * t + d[2]) * t + d[3]) * t + 1); }
    else { const t = q - 0.5, r = t * t; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * t / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    return p < 0.5 ? x : -x;
  };

  const score = (events, pickIdx) => {
    // events: [{ pool: [mask...], chosen: index into pool }]
    const zCrit = probit(1 - 0.025 / KEYS.length);
    const rows = {};
    KEYS.forEach((k, i) => {
      const bit = 1 << i;
      let O = 0, E = 0, V = 0;
      for (const ev of events) {
        const p = ev.pool.filter((m) => m & bit).length / ev.pool.length;
        const chosen = pickIdx ? pickIdx(ev) : ev.chosen;
        if (ev.pool[chosen] & bit) O++;
        E += p; V += p * (1 - p);
      }
      const N = events.length;
      if (V < 5) { rows[k] = { selected: O, expected: +E.toFixed(1), verdict: 'too rare to assess' }; return; }
      const z = (O - E) / Math.sqrt(V);
      rows[k] = {
        selectedPct: +(100 * O / N).toFixed(1), poolPct: +(100 * E / N).toFixed(1),
        z: +z.toFixed(2), minDetectablePts: +(100 * zCrit * Math.sqrt(V) / N).toFixed(1),
        verdict: Math.abs(z) > zCrit ? 'SKEW DETECTED' : 'ok',
      };
    });
    return { zCrit: +zCrit.toFixed(2), rows };
  };

  window.__auditAppearance = async ({ seeds = 20, selfTestMarker = 'keffiyeh', level = 1 } = {}) => {
    const g = game, crowd = g.crowd, prevLevel = g.level.id;
    g.setLevel(level);
    const m = g.missions;
    const saved = crowd.npcs.map((n) => n.outfit);
    const savedSeedRandom = Math.random;
    const events = [];
    const roleCounts = { demonstrator: {}, looter: {}, civilian: {} };
    const roleN = { demonstrator: 0, looter: 0, civilian: 0 };
    let outfitChanged = 0, flagCarriersSelected = 0, flagsKeptAfter = 0;
    const origMake = crowd.makeHostile.bind(crowd), origBomber = m._setupBomber.bind(m);
    // Level 1 draws from peaceful demonstrators; Level 2's encounter runner draws from
    // its own eligible pool (looting crews first, then anyone free), recorded at the pick
    const record = (n) => {
      const pool = crowd.npcs.filter((o) => o === n || (o.temperament === 'peaceful' && !o.script && !o.arrested && o.state !== 'down' && o.state !== 'gone'));
      events.push({ pool: pool.map(maskOf), chosen: pool.indexOf(n) });
    };
    let origPick = null;
    if (m.enc) {
      origPick = m.enc._pick.bind(m.enc);
      m.enc._pick = (count) => {
        const pool = crowd.npcs.filter((o) => m.enc.eligible(o));
        const chosen = origPick(count);
        for (const c of chosen) events.push({ pool: pool.map(maskOf), chosen: pool.indexOf(c) });
        return chosen;
      };
    }
    crowd.makeHostile = (n, style, mode) => {
      if (!m.enc) record(n);
      const before = JSON.stringify(n.outfit), flag = n.rig.itemType === 'flag' || n.rig.itemType === 'frflag';
      origMake(n, style, mode);
      if (JSON.stringify(n.outfit) !== before) outfitChanged++;
      if (flag && style === 'melee') { flagCarriersSelected++; if (n.rig.itemType === 'flag' || n.rig.itemType === 'frflag') flagsKeptAfter++; }
    };
    m._setupBomber = (n, ...rest) => { if (n && !m.enc) record(n); return origBomber(n, ...rest); };
    const step = (s) => window.__step(s);
    const wasAudio = g.audio.enabled;
    try {
      for (let s = 0; s < seeds; s++) {
        reseed(1000 + s);
        if (s > 0) { const rng = mulberry(7919 * s + 17); for (const n of crowd.npcs) if (!n.special) n.outfit = randomOutfit(rng); }
        for (const n of crowd.npcs) {
          if (n.special) continue;
          const role = n.kind === 'looter' ? 'looter' : n.kind === 'civilian' ? 'civilian' : 'demonstrator';
          roleN[role]++;
          for (const k of KEYS.slice(0, 12)) if (MARKERS[k](n)) roleCounts[role][k] = (roleCounts[role][k] || 0) + 1;
        }
        g.restart();
        if (level === 1) {
          m.stage = 'audit';
          step(1.0);
          m._startP1(); m.stage = 'audit'; step(0.5);
          m._startP2(); m.stage = 'audit'; step(0.5);
          m._startP3(); step(0.3);
          g.player.pos.set(0, 0, -10); m.stage = 'p3'; step(0.2); // real ambush trigger
          m.stage = 'audit';
          for (let k = 0; k < 3; k++) { m.ambient = null; m._ambientThreat(); step(0.3); }
          m._startFinal(); m.stage = 'audit';
        } else {
          // every street encounter of Level 2, section by section, through the real runner
          step(0.5);
          for (const i of [0, 1, 3]) {
            m.resume({ section: i }); step(0.3);
            for (const e of m.enc.list) if (m.enc.state[e.id].status === 'waiting') { m.enc.start(e); step(0.3); }
          }
        }
        await new Promise((r) => setTimeout(r, 0)); // keep the page responsive
      }
    } finally {
      crowd.makeHostile = origMake; m._setupBomber = origBomber;
      if (origPick) m.enc._pick = origPick;
      crowd.npcs.forEach((n, i) => { n.outfit = saved[i]; });
      Math.random = savedSeedRandom;
      g.setLevel(prevLevel);
      g.restart();
    }
    // role comparison: demonstrators vs everyone else (looters + civilians)
    const roles = {};
    for (const k of KEYS.slice(0, 12)) {
      const a = roleCounts.demonstrator[k] || 0, na = roleN.demonstrator;
      const b = (roleCounts.looter[k] || 0) + (roleCounts.civilian[k] || 0), nb = roleN.looter + roleN.civilian;
      const p = (a + b) / (na + nb), se = Math.sqrt(p * (1 - p) * (1 / na + 1 / nb));
      roles[k] = { demonstratorPct: +(100 * a / na).toFixed(1), looterPct: +(100 * (roleCounts.looter[k] || 0) / roleN.looter).toFixed(1), civilianPct: +(100 * (roleCounts.civilian[k] || 0) / roleN.civilian).toFixed(1), z: se ? +((a / na - b / nb) / se).toFixed(2) : 0 };
    }
    // self-test: same pools, a selector that gives the marker double weight
    const bit = 1 << KEYS.indexOf(selfTestMarker);
    const srng = mulberry(4242);
    const biased = (ev) => {
      const w = ev.pool.map((m) => (m & bit ? 2 : 1));
      let r = srng() * w.reduce((x, y) => x + y, 0);
      for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
      return w.length - 1;
    };
    const real = score(events);
    const st = score(events, biased).rows[selfTestMarker];
    // Appearance (clothing, complexion, gender) decides the verdict. Carried flags are props of
    // the demonstrating activity, not of the person: a selector that prefers a role (Level 2
    // sends the looting crews, who carry no flags) shows up here and is reported separately.
    const PROPS = ['palestinianFlag', 'algerianFlag', 'frenchFlag'];
    const skewed = Object.entries(real.rows).filter(([, r]) => r.verdict === 'SKEW DETECTED').map(([k]) => k);
    const flagged = skewed.filter((k) => !PROPS.includes(k));
    const propSkew = skewed.filter((k) => PROPS.includes(k));
    const result = {
      level, seeds, selections: events.length, familywiseAlpha: 0.05, zCritical: real.zCrit,
      verdict: flagged.length ? `appearance skew detected in: ${flagged.join(', ')}` : 'no material appearance skew detected (screening check; see minDetectablePts)',
      carriedProps: propSkew.length ? `role-linked: ${propSkew.map((k) => `${k} ${real.rows[k].selectedPct}% selected vs ${real.rows[k].poolPct}% in pool`).join('; ')}` : 'no skew',
      markers: real.rows,
      roles: { note: 'marker rates by role across all generated populations; z compares demonstrators with looters + civilians', n: roleN, rows: roles },
      hostility: { outfitsChangedByMakeHostile: outfitChanged, meleeFlagCarriersSelected: flagCarriersSelected, flagsKept: flagsKeptAfter },
      selfTest: { marker: selfTestMarker, weight: 2, ...st, detected: st.verdict === 'SKEW DETECTED' },
      audioWasOn: wasAudio,
    };
    window.__auditResult = result;
    return result;
  };
}

```

## src/effects.js

```js
// Billboard particle systems (instanced quads), fire lights, embers, debris,
// projectiles, explosions and firework mortars.
import * as THREE from 'three';

// ---------------------------------------------------------------- textures
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

// 2x2 atlas of cloudy smoke puffs built from many soft blobs (layered density)
function smokeAtlas() {
  const S = 256, H = 128;
  const [c, ctx] = canvas(S, S);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * H, oy = Math.floor(k / 2) * H;
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, H, H); ctx.clip();
    for (let i = 0; i < 70; i++) {
      const a = rnd() * 6.28, r = Math.pow(rnd(), 0.7) * 34;
      const x = ox + 64 + Math.cos(a) * r, y = oy + 64 + Math.sin(a) * r * 0.9;
      const rad = 10 + rnd() * 26 * (1 - r / 50);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const al = 0.1 + rnd() * 0.14;
      g.addColorStop(0, `rgba(255,255,255,${al})`); g.addColorStop(0.6, `rgba(255,255,255,${al * 0.5})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // soften the outer edge
    const fade = ctx.createRadialGradient(ox + 64, oy + 64, 30, ox + 64, oy + 64, 64);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = fade; ctx.fillRect(ox, oy, H, H);
    ctx.restore(); ctx.globalCompositeOperation = 'source-over';
  }
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}

function fireAtlas() {
  const S = 256, H = 128;
  const [c, ctx] = canvas(S, S);
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * H, oy = Math.floor(k / 2) * H;
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, H, H); ctx.clip();
    if (k === 3) {
      // round glow (sparks / flash)
      const g = ctx.createRadialGradient(ox + 64, oy + 64, 0, ox + 64, oy + 64, 62);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(ox, oy, H, H);
    } else {
      // flame tongue: tall teardrop of blobs
      for (let i = 0; i < 40; i++) {
        const tY = rnd();
        const x = ox + 64 + (rnd() - 0.5) * 40 * (1 - tY * 0.7), y = oy + 110 - tY * 90;
        const rad = (22 - tY * 16) * (0.6 + rnd() * 0.6);
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
    ctx.restore();
  }
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}

// ---------------------------------------------------------------- particles
class ParticleSystem {
  constructor(scene, max, additive, tex) {
    this.max = max;
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    this.off = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.sz = new Float32Array(max * 3); // size, rotation, frame
    geo.setAttribute('iOff', new THREE.InstancedBufferAttribute(this.off, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('iCol', new THREE.InstancedBufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('iSz', new THREE.InstancedBufferAttribute(this.sz, 3).setUsage(THREE.DynamicDrawUsage));
    geo.instanceCount = 0;
    this.geo = geo;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 }, sunDir: { value: new THREE.Vector3(-0.4, 0.8, -0.4) }, uTint: { value: new THREE.Color(1, 1, 1) } },
      vertexShader: `
        attribute vec3 iOff; attribute vec4 iCol; attribute vec3 iSz;
        varying vec2 vUv; varying vec4 vCol; varying float vFog; varying float vNear;
        uniform float fogDensity;
        void main(){
          float f = iSz.z;
          vUv = uv * 0.5 + vec2(mod(f, 2.0), floor(f / 2.0)) * 0.5;
          vCol = iCol;
          vec4 mv = modelViewMatrix * vec4(iOff, 1.0);
          float c = cos(iSz.y), s = sin(iSz.y);
          vec2 p = vec2(position.x*c - position.y*s, position.x*s + position.y*c) * iSz.x;
          mv.xy += p;
          float d = -mv.z;
          vFog = 1.0 - exp(-fogDensity*fogDensity*d*d);
          // fade billboards that are about to fill the screen (overdraw + clipping)
          vNear = smoothstep(0.6, 2.5 + iSz.x * 0.25, d);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map; uniform vec3 fogColor; uniform vec3 uTint;
        varying vec2 vUv; varying vec4 vCol; varying float vFog; varying float vNear;
        void main(){
          vec4 t = texture2D(map, vUv);
          ${additive
    ? `vec4 c = vec4(vCol.rgb, vCol.a * t.a * vNear);
          c.rgb *= c.a * 1.6; c.rgb *= (1.0 - vFog * 0.7);`
    : `// fake self-shadowing: puffs are lit from above, darker underneath
          float lit = mix(0.72, 1.12, fract(vUv.y * 2.0));
          vec4 c = vec4(vCol.rgb * lit * uTint, vCol.a * t.a * vNear); // uTint: ambient level of the lighting preset
          c.rgb = mix(c.rgb, fogColor, vFog * 0.6);`}
          if (c.a < 0.003) discard;
          gl_FragColor = c;
        }`,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mat = mat;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 6 : 5;
    scene.add(this.mesh);
    this.p = [];
  }
  spawn(o) {
    if (this.p.length >= this.max) this.p.splice(0, 1 + Math.floor(this.max * 0.02));
    const q = { age: 0, rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.8, drag: 0.5, grow: 1, frame: o.frame ?? Math.floor(Math.random() * 3.99), ...o, pos: o.pos.clone(), vel: o.vel ? o.vel.clone() : new THREE.Vector3() };
    this.p.push(q);
    return q;
  }
  update(dt, wind, fog, glowFn) {
    this.mat.uniforms.fogColor.value.copy(fog.color);
    this.mat.uniforms.fogDensity.value = fog.density;
    let n = 0;
    let w = 0;
    for (let i = 0; i < this.p.length; i++) { const q = this.p[i]; q.age += dt; if (q.age < q.life) this.p[w++] = q; }
    this.p.length = w;
    const tc = new THREE.Color();
    for (const q of this.p) {
      const k = q.age / q.life;
      q.vel.y += (q.buoy || 0) * dt - (q.grav || 0) * dt;
      q.vel.multiplyScalar(Math.exp(-q.drag * dt));
      q.pos.addScaledVector(q.vel, dt);
      if (wind) q.pos.addScaledVector(wind, dt * (q.windK ?? 1) * Math.min(1, 0.3 + q.pos.y * 0.12));
      if (q.grav && q.pos.y < 0.03) { q.pos.y = 0.03; q.vel.y *= -0.3; q.vel.x *= 0.5; q.vel.z *= 0.5; }
      q.rot += q.spin * dt;
      const size = q.size * (1 + (q.grow - 1) * (1 - (1 - k) * (1 - k)));
      const fadeIn = Math.min(1, q.age / (q.fadeIn || 0.08));
      const a = q.alpha * fadeIn * (q.fadeCurve === 'late' ? 1 - k * k : 1 - k);
      tc.copy(q.color); if (q.color2) tc.lerp(q.color2, Math.min(1, k * (q.colorK || 1)));
      if (q.glow) { const gl = q.glow * Math.max(0, 1 - q.age / (q.glowT || 1.5)); tc.r += gl * 0.55; tc.g += gl * 0.22; tc.b += gl * 0.05; }
      this.off[n * 3] = q.pos.x; this.off[n * 3 + 1] = q.pos.y; this.off[n * 3 + 2] = q.pos.z;
      this.col[n * 4] = tc.r; this.col[n * 4 + 1] = tc.g; this.col[n * 4 + 2] = tc.b; this.col[n * 4 + 3] = a;
      this.sz[n * 3] = size; this.sz[n * 3 + 1] = q.rot; this.sz[n * 3 + 2] = q.frame;
      n++;
    }
    this.geo.instanceCount = n;
    for (const k of ['iOff', 'iCol', 'iSz']) { const at = this.geo.attributes[k]; at.needsUpdate = true; at.updateRanges && (at.clearUpdateRanges(), at.addUpdateRange(0, n * at.itemSize)); }
  }
  clear() { this.p.length = 0; }
}

const C = (r, g, b) => new THREE.Color(r, g, b);
const R = (a, b) => a + Math.random() * (b - a);

export class Effects {
  constructor(scene, world, audio) {
    this.scene = scene; this.world = world; this.audio = audio;
    this.smoke = new ParticleSystem(scene, 2000, false, smokeAtlas());
    this.fire = new ParticleSystem(scene, 1300, true, fireAtlas());
    this.wind = new THREE.Vector3(0.9, 0, -0.5); // steady wind blowing smoke north-east
    this.emitAcc = 0;
    this.lights = [];
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xff8a3a, 0, 14, 1.6);
      scene.add(l);
      this.lights.push({ light: l, t: 0, life: 0, intensity: 0, flicker: true });
    }
    this.fireLights = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xff7a30, 0, 20, 1.5); scene.add(l); return l; });
    this.flames = [];       // temporary area fires {pos, radius, t, life}
    this.projectiles = [];
    this.tracers = [];      // firework mortars
    this.debris = [];
    const dg = new THREE.BoxGeometry(0.07, 0.04, 0.05);
    this.debrisMesh = new THREE.InstancedMesh(dg, new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 1 }), 160);
    this.debrisMesh.count = 0; this.debrisMesh.frustumCulled = false;
    scene.add(this.debrisMesh);
    this.tmpM = new THREE.Matrix4();
    this.smokiness = 0;
    this.dynamicFires = [];
  }

  reset() {
    this.flames.length = 0;
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles.length = 0;
    this.tracers.length = 0;
    this.debris.length = 0;
    this.fire.clear();
    for (const f of this.dynamicFires) { const i = this.world.fires.indexOf(f.fire); if (i >= 0) this.world.fires.splice(i, 1); const j = this.world.smokes.indexOf(f.smoke); if (j >= 0) this.world.smokes.splice(j, 1); }
    this.dynamicFires.length = 0;
    for (const l of this.lights) { l.life = 0; l.light.intensity = 0; }
  }

  flash(pos, color, intensity, life, dist = 16) {
    let slot = this.lights.find((l) => l.life <= l.t) || this.lights.reduce((a, b) => (a.life - a.t < b.life - b.t ? a : b));
    slot.t = 0; slot.life = life; slot.intensity = intensity;
    slot.light.color.set(color); slot.light.position.copy(pos); slot.light.distance = dist;
  }

  dust(pos, n = 8, color = 0x9a9080) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      this.smoke.spawn({ pos: pos.clone().add(new THREE.Vector3(R(-0.2, 0.2), R(0, 0.3), R(-0.2, 0.2))), vel: new THREE.Vector3(R(-1, 1), R(0, 1.2), R(-1, 1)), size: R(0.35, 0.65), grow: 3, life: R(0.9, 1.5), alpha: 0.35, color: c, drag: 2.5, windK: 0.3 });
    }
  }

  impact(pos) {
    for (let i = 0; i < 8; i++) this.fire.spawn({ pos, vel: new THREE.Vector3(R(-1.5, 1.5), R(0, 2.5), R(-1.5, 1.5)), size: 0.06, life: R(0.18, 0.3), alpha: 0.9, color: C(1, 0.9, 0.7), grav: 9, drag: 1, frame: 3 });
    this.dust(pos, 4, 0xbab0a0);
  }

  spawnDebris(pos, n = 10, speed = 4) {
    for (let i = 0; i < n; i++) {
      if (this.debris.length > 150) this.debris.shift();
      this.debris.push({ pos: pos.clone(), vel: new THREE.Vector3(R(-0.5, 0.5) * speed, Math.random() * speed, R(-0.5, 0.5) * speed), rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), spin: Math.random() * 10, life: R(5, 9), age: 0 });
    }
  }

  // Explosion burst (flash, fireball, sparks, expanding smoke, dust ring, debris)
  explosion(pos, s = 1, opts = {}) {
    const p = pos.clone();
    // brief flash
    this.fire.spawn({ pos: p.clone().setY(p.y + 0.8), size: 7 * s, grow: 1.4, life: 0.14, alpha: 1, color: C(1, 0.92, 0.75), frame: 3, drag: 0, fadeIn: 0.01 });
    this.flash(p.clone().setY(p.y + 1.5), 0xffb060, 55 * s, 0.45, 30 * s);
    // fireball
    for (let i = 0; i < 46 * s; i++) {
      const a = Math.random() * 6.28, el = R(0.1, 1.2), sp = R(2, 6) * s;
      this.fire.spawn({ pos: p.clone().add(new THREE.Vector3(0, 0.3, 0)), vel: new THREE.Vector3(Math.cos(a) * Math.cos(el) * sp, Math.sin(el) * sp * 0.9 + 1.5, Math.sin(a) * Math.cos(el) * sp), size: R(0.8, 1.7) * s, grow: 1.8, life: R(0.45, 0.95), alpha: 1, color: C(1, 0.8, 0.45), color2: C(0.75, 0.16, 0.02), drag: 3, buoy: 4, frame: Math.floor(Math.random() * 3) });
    }
    // sparks
    for (let i = 0; i < 40 * s; i++) {
      this.fire.spawn({ pos: p.clone().setY(p.y + 0.3), vel: new THREE.Vector3(R(-7, 7), R(2, 9), R(-7, 7)).multiplyScalar(s), size: R(0.05, 0.1), life: R(0.5, 1.4), alpha: 1, color: C(1, 0.82, 0.45), color2: C(1, 0.35, 0.05), grav: 9.8, drag: 0.6, frame: 3 });
    }
    // expanding smoke cloud
    for (let i = 0; i < 26 * s; i++) {
      const a = Math.random() * 6.28, sp = R(1.5, 5) * s;
      this.smoke.spawn({ pos: p.clone().add(new THREE.Vector3(R(-0.5, 0.5), R(0.4, 1.6), R(-0.5, 0.5))), vel: new THREE.Vector3(Math.cos(a) * sp, R(1, 3.5), Math.sin(a) * sp), size: R(1.2, 2.2) * s, grow: 4, life: R(4, 7), alpha: 0.62, color: C(0.07, 0.065, 0.06), color2: C(0.3, 0.29, 0.28), drag: 1.4, buoy: 0.25, windK: 1, glow: 1.2, glowT: 0.9, fadeCurve: 'late' });
    }
    // dust ring
    for (let i = 0; i < 18 * s; i++) {
      const a = (i / (18 * s)) * 6.28;
      this.smoke.spawn({ pos: p.clone().setY(0.25), vel: new THREE.Vector3(Math.cos(a) * 6 * s, 0.3, Math.sin(a) * 6 * s), size: 0.8 * s, grow: 4, life: R(1.5, 2.5), alpha: 0.35, color: C(0.45, 0.42, 0.38), drag: 3, windK: 0.4 });
    }
    if (!opts.noDebris) this.spawnDebris(p.clone().setY(0.3), Math.round(12 * s), 5 * s);
  }

  // Short-lived pool of fire from a petrol bomb.
  ignite(pos, radius = 3.2, life = 6) {
    this.flames.push({ pos: pos.clone().setY(0.05), radius, t: 0, life });
    this.explosion(pos, radius / 3.2);
    this.flash(pos.clone().setY(0.8), 0xff7a20, 14, life, 18);
    for (let i = 0; i < 18; i++) this.fire.spawn({ pos: pos.clone().setY(0.2), vel: new THREE.Vector3(R(-6, 6), R(0, 3), R(-6, 6)), size: 0.05, life: 0.4, alpha: 1, color: C(0.7, 1, 0.8), grav: 12, drag: 0.5, frame: 3 }); // glass
  }

  // A new persistent fire (car / bin catching fire). Returns handle.
  addFire(pos, scale = 1, smokeRate = 1.5) {
    const fire = { pos: pos.clone(), scale, dynamic: true };
    const smoke = { pos: pos.clone().setY(pos.y + 1), rate: smokeRate, scale: 1 + scale * 0.4 };
    this.world.fires.push(fire); this.world.smokes.push(smoke);
    this.dynamicFires.push({ fire, smoke });
    if (this.dynamicFires.length > 9) {
      const old = this.dynamicFires.shift();
      this.world.fires.splice(this.world.fires.indexOf(old.fire), 1);
      this.world.smokes.splice(this.world.smokes.indexOf(old.smoke), 1);
    }
    return fire;
  }

  // Firework mortar: a rising tracer that bursts in the air.
  mortar(from, to, onBurst) {
    const T = R(0.9, 1.3);
    const vel = new THREE.Vector3((to.x - from.x) / T, (to.y - from.y + 4.9 * T * T) / T, (to.z - from.z) / T);
    this.tracers.push({ pos: from.clone(), vel, t: 0, T, onBurst, color: [C(1, 0.3, 0.25), C(0.4, 1, 0.5), C(1, 1, 0.9), C(1, 0.8, 0.3)][Math.floor(Math.random() * 4)] });
  }

  throwProjectile(from, to, type, onImpact, flightTime) {
    const dist = from.distanceTo(to);
    const T = flightTime || Math.max(0.55, Math.min(1.4, dist / 13));
    const g = 9.8;
    const vel = new THREE.Vector3((to.x - from.x) / T, (to.y - from.y + 0.5 * g * T * T) / T, (to.z - from.z) / T);
    let mesh;
    if (type === 'petrol') mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0x2f6a3a, roughness: 0.2, transparent: true, opacity: 0.85 }));
    else if (type === 'bottle') mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0x4a3a1a, roughness: 0.2 }));
    else mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07), new THREE.MeshStandardMaterial({ color: 0x6a6660 }));
    mesh.castShadow = true;
    mesh.position.copy(from);
    this.scene.add(mesh);
    const p = { mesh, vel, type, onImpact, age: 0, spin: new THREE.Vector3(8 + Math.random() * 6, Math.random() * 4, 0), alive: true };
    this.projectiles.push(p);
    return p;
  }

  update(dt, t, camPos) {
    const fogObj = this.scene.fog;
    this.emitAcc += dt;
    const step = 1 / 30;
    const near = (p, r) => (p.x - camPos.x) ** 2 + (p.z - camPos.z) ** 2 < r * r;
    while (this.emitAcc > step) {
      this.emitAcc -= step;
      for (const f of this.world.fires) {
        if (!near(f.pos, 170)) continue;
        const sc = f.scale * (f.boost || 1);
        // flame tongues
        const n = sc > 1.6 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          if (Math.random() < 0.9) this.fire.spawn({ pos: f.pos.clone().add(new THREE.Vector3(R(-0.4, 0.4) * sc, R(-0.1, 0.2), R(-0.4, 0.4) * sc)), vel: new THREE.Vector3(R(-0.2, 0.2), R(1.2, 2.6), R(-0.2, 0.2)), size: R(0.6, 1.1) * sc, grow: 0.5, life: R(0.4, 0.8), alpha: 0.85, color: C(1, 0.72, 0.32), color2: C(0.8, 0.14, 0.02), drag: 1, windK: 0.5, frame: Math.floor(Math.random() * 3), spin: R(-0.3, 0.3) });
        }
        // embers
        if (Math.random() < 0.35 * sc) this.fire.spawn({ pos: f.pos.clone().add(new THREE.Vector3(R(-0.5, 0.5), 0.6, R(-0.5, 0.5))), vel: new THREE.Vector3(R(-0.8, 0.8), R(1.5, 3.5), R(-0.8, 0.8)), size: R(0.04, 0.08), life: R(1.5, 3.2), alpha: 1, color: C(1, 0.6, 0.2), color2: C(0.6, 0.1, 0), drag: 0.6, windK: 1.4, frame: 3, buoy: 0.2 });
      }
      for (const s of this.world.smokes) {
        if (!near(s.pos, 230)) continue;
        const dfar = !near(s.pos, 80);
        const sc = (s.scale || 1) * (dfar ? 1.5 : 1);
        // tall dark column: dense near the source, expanding and greying as it rises
        if (Math.random() < 0.15 * s.rate * (dfar ? 0.6 : 1)) this.smoke.spawn({ pos: s.pos.clone().add(new THREE.Vector3(R(-0.5, 0.5), 0, R(-0.5, 0.5))), vel: new THREE.Vector3(R(-0.3, 0.3), R(2.2, 3.2), R(-0.3, 0.3)), size: R(2.0, 2.8) * sc, grow: 6, life: R(11, 16), alpha: 0.82, color: C(0.035, 0.032, 0.03), color2: C(0.2, 0.19, 0.185), colorK: 1.1, drag: 0.12, buoy: 0.05, windK: 1.5, glow: 1.4, glowT: 1.6, fadeIn: 0.6, fadeCurve: 'late' });
        // low haze rolling downwind through the street
        if (!dfar && near(s.pos, 55) && Math.random() < 0.03 * s.rate) this.smoke.spawn({ pos: s.pos.clone().add(new THREE.Vector3(R(-2, 2), R(-0.6, 0.6), R(-2, 2))), vel: new THREE.Vector3(R(-0.3, 0.3), 0.05, R(-0.3, 0.3)), size: R(5, 8), grow: 1.6, life: R(12, 16), alpha: 0.11, color: C(0.24, 0.23, 0.22), drag: 0.1, windK: 1.0, fadeIn: 3 });
      }
      // ambient drifting street haze (tear gas remnants) around the camera
      if (Math.random() < 0.14) {
        const a = Math.random() * 6.28, r = 8 + Math.random() * 34;
        const p = new THREE.Vector3(camPos.x + Math.cos(a) * r, 0.5 + Math.random() * 1.8, camPos.z + Math.sin(a) * r);
        p.x = Math.max(-14, Math.min(14, p.x));
        this.smoke.spawn({ pos: p, vel: new THREE.Vector3(0, 0.05, 0), size: R(3.5, 7), grow: 1.6, life: 10, alpha: 0.06, color: C(0.55, 0.53, 0.5), drag: 0.1, windK: 0.8, fadeIn: 3 });
      }
      // temporary petrol fires
      for (const f of this.flames) {
        const k = 1 - f.t / f.life;
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * f.radius * (0.55 + 0.45 * k);
          this.fire.spawn({ pos: f.pos.clone().add(new THREE.Vector3(Math.cos(a) * r, 0.1, Math.sin(a) * r)), vel: new THREE.Vector3(0, R(1.5, 3.2), 0), size: R(0.6, 1.2) * (0.5 + k), grow: 0.4, life: R(0.4, 0.8), alpha: 0.95, color: C(1, 0.75, 0.35), color2: C(0.85, 0.16, 0.02), drag: 1, frame: Math.floor(Math.random() * 3) });
        }
        if (Math.random() < 0.35) this.smoke.spawn({ pos: f.pos.clone().add(new THREE.Vector3(R(-0.5, 0.5) * f.radius, 1.4, R(-0.5, 0.5) * f.radius)), vel: new THREE.Vector3(0, 2, 0), size: 1.4, grow: 5, life: R(5, 8), alpha: 0.5, color: C(0.06, 0.055, 0.05), color2: C(0.3, 0.29, 0.28), drag: 0.25, windK: 1.3, glow: 1.2, fadeCurve: 'late' });
        if (Math.random() < 0.3) this.fire.spawn({ pos: f.pos.clone().setY(0.4), vel: new THREE.Vector3(R(-1, 1), R(2, 4), R(-1, 1)), size: 0.06, life: R(1, 2), alpha: 1, color: C(1, 0.6, 0.2), drag: 0.6, windK: 1.2, frame: 3 });
      }
    }
    for (let i = this.flames.length - 1; i >= 0; i--) { this.flames[i].t += dt; if (this.flames[i].t > this.flames[i].life) this.flames.splice(i, 1); }
    for (const f of this.world.fires) if (f.boost) { f.boostT -= dt; if (f.boostT <= 0) f.boost = 0; }

    // flickering light on the nearest persistent fires
    const list = this.world.fires.map((f) => [f, f.pos.distanceToSquared(camPos)]).sort((a, b) => a[1] - b[1]);
    this.fireLights.forEach((light, i) => {
      const e = list[i];
      if (!e || e[1] > 70 * 70) { light.intensity = 0; return; }
      const f = e[0];
      light.position.copy(f.pos).setY(f.pos.y + 1.0);
      light.intensity = (7 + Math.sin(t * 17 + i) * 1.8 + Math.sin(t * 29 + i * 2) * 1.4) * f.scale * (f.boost || 1) * (this.fireLightMul || 1);
    });
    // smokiness around the camera (drives fog/haze in main)
    let sm = 0;
    for (const s of this.world.smokes) { const d = Math.sqrt((s.pos.x - camPos.x) ** 2 + (s.pos.z - camPos.z) ** 2); sm += (s.rate || 1) * Math.exp(-d / 22); }
    this.smokiness += (Math.min(1.5, sm) - this.smokiness) * Math.min(1, dt * 0.8);

    for (const l of this.lights) {
      if (l.t < l.life) { l.t += dt; const k = 1 - l.t / l.life; l.light.intensity = l.intensity * k * (l.flicker ? 0.8 + Math.random() * 0.4 : 1); }
      else l.light.intensity = 0;
    }

    // mortars
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const m = this.tracers[i];
      m.t += dt; m.vel.y -= 9.8 * dt; m.pos.addScaledVector(m.vel, dt);
      this.fire.spawn({ pos: m.pos, size: 0.18, life: 0.35, alpha: 1, color: C(1, 0.85, 0.6), drag: 0, frame: 3 });
      if (m.t >= m.T * 0.82) {
        this.tracers.splice(i, 1);
        for (let k = 0; k < 70; k++) {
          const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(R(5, 9));
          this.fire.spawn({ pos: m.pos, vel: v, size: R(0.1, 0.18), life: R(0.8, 1.5), alpha: 1, color: m.color, color2: C(0.6, 0.15, 0.05), grav: 3, drag: 1.4, frame: 3 });
        }
        this.fire.spawn({ pos: m.pos, size: 6, life: 0.15, alpha: 1, color: m.color, frame: 3, drag: 0 });
        this.flash(m.pos, m.color.getHex(), 30, 0.35, 34);
        for (let k = 0; k < 6; k++) this.smoke.spawn({ pos: m.pos.clone().add(new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1))), size: 2, grow: 3, life: 5, alpha: 0.25, color: C(0.5, 0.48, 0.46), drag: 0.5, windK: 1.4 });
        if (m.onBurst) m.onBurst(m.pos.clone());
      }
    }

    // projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;
      p.vel.y -= 9.8 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin.x * dt; p.mesh.rotation.y += p.spin.y * dt;
      if (p.type === 'petrol') {
        this.fire.spawn({ pos: p.mesh.position, vel: new THREE.Vector3(0, 0.6, 0), size: 0.32, life: 0.28, alpha: 1, color: C(1, 0.7, 0.3), color2: C(0.9, 0.2, 0), drag: 1, frame: 0 });
        if (Math.random() < 0.5) this.smoke.spawn({ pos: p.mesh.position, vel: new THREE.Vector3(0, 0.4, 0), size: 0.3, grow: 4, life: 1.6, alpha: 0.45, color: C(0.12, 0.11, 0.1), drag: 1 });
      }
      const pos = p.mesh.position;
      const hitGround = pos.y <= this.world.groundHeight(pos.x, pos.z) + 0.05;
      const hitWall = this.world.blocked(pos.x, pos.z, 0.05) && pos.y < 3;
      const hitCustom = p.alive && p.check ? p.check(pos) : false;
      if (hitGround || hitWall || hitCustom || p.age > 5) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose(); p.mesh.material.dispose();
        this.projectiles.splice(i, 1);
        if (p.onImpact) p.onImpact(pos.clone(), p, hitCustom);
      }
    }

    // debris
    let n = 0;
    for (let i = this.debris.length - 1; i >= 0; i--) { const d = this.debris[i]; d.age += dt; if (d.age > d.life) this.debris.splice(i, 1); }
    for (const d of this.debris) {
      if (d.pos.y > 0.03 || Math.abs(d.vel.y) > 0.1) {
        d.vel.y -= 9.8 * dt; d.pos.addScaledVector(d.vel, dt);
        d.rot.x += d.spin * dt;
        if (d.pos.y < 0.03) { d.pos.y = 0.03; d.vel.multiplyScalar(0.4); d.vel.y = Math.abs(d.vel.y) * 0.3; d.spin *= 0.5; }
      }
      this.tmpM.makeRotationFromEuler(d.rot).setPosition(d.pos);
      this.debrisMesh.setMatrixAt(n++, this.tmpM);
    }
    this.debrisMesh.count = n;
    this.debrisMesh.instanceMatrix.needsUpdate = true;

    this.smoke.update(dt, this.wind, fogObj);
    this.fire.update(dt, this.wind, fogObj);
  }

  // remove a fire added with addFire (boss arenas take theirs down when the fight ends)
  removeFire(fire) {
    const k = this.dynamicFires.findIndex((f) => f.fire === fire);
    if (k < 0) return;
    const f = this.dynamicFires.splice(k, 1)[0];
    const i = this.world.fires.indexOf(f.fire); if (i >= 0) this.world.fires.splice(i, 1);
    const j = this.world.smokes.indexOf(f.smoke); if (j >= 0) this.world.smokes.splice(j, 1);
  }

  inFire(pos) {
    for (const f of this.flames) {
      const r = f.radius * (1 - (f.t / f.life) * 0.4);
      if ((pos.x - f.pos.x) ** 2 + (pos.z - f.pos.z) ** 2 < r * r) return true;
    }
    return false;
  }
}

```

## src/encounters.js

```js
// Data-driven street encounters (Level 2).
//
// An encounter is a small group sent at the officer when a trigger fires:
//   { id, trigger: { z } | { after: 'id' } | { now: true }, radio, alert,
//     members: [{ style: 'melee' | 'thrower' | 'shield', at: [x, z] }],
//     events: [['mortar'] | ['molotovAt', [x, z]] | ['carFire', [x, z]], ...] }
// `z` triggers when the officer's position passes that z in the level's direction
// of travel. An encounter resolves when every member is neutralised, arrested or
// no longer hostile.
//
// Who takes part is decided by role and availability only: members are drawn at
// random from the free members of the looting crews (the Leader's people). Peaceful
// people are never recruited; if too few crew members are free, the group is smaller
// (counted in `shortfall`). Appearance is never read (see __auditAppearance).
import * as THREE from 'three';

export class EncounterRunner {
  constructor(game, dir = 1) {
    this.game = game;
    this.dir = dir; // +1: the officer advances towards +z
    this.reset();
  }

  reset() {
    this.list = [];      // encounters of the current section
    this.state = {};     // id -> { status: 'waiting' | 'active' | 'resolved', members, t }
    this.shortfall = 0;  // members that could not be found
  }

  // Load a section's encounters (earlier sections' encounters are dropped).
  load(list) {
    this.list = list;
    this.state = {};
    for (const e of list) this.state[e.id] = { status: 'waiting', members: [], t: 0 };
  }

  // Someone free to be sent in: the selection pool for every encounter.
  eligible(n, minDist = 22) {
    const free = !n.script && !n.arrested && !n.neutralized && !n.special && n.state !== 'gone' && n.state !== 'down' && n.state !== 'recover' && n.distToPlayer > minDist;
    return free && n.temperament === 'looter';
  }

  _pick(count) {
    const crowd = this.game.crowd;
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const picked = shuffle(crowd.npcs.filter((n) => this.eligible(n))).slice(0, count);
    this.shortfall += count - picked.length;
    return picked;
  }

  start(e) {
    const g = this.game, crowd = g.crowd, st = this.state[e.id];
    st.status = 'active'; st.t = 0;
    if (e.bomber) {
      // a petrol-bomb suspect (Level 1's bomber script): stop him before he throws
      const [n] = this._pick(1);
      st.members = n ? [n] : [];
      if (!n) return;
      const spot = new THREE.Vector3(e.bomber[0], 0, e.bomber[1]);
      g.missions.bomber = n;
      g.missions._setupBomber(n, spot, 24, (prevented) => g.hud.alert(prevented ? 'Petrol bomb attack prevented' : 'Bomber dealt with', 'good', 2.5));
      return;
    }
    const people = this._pick(e.members.length);
    people.forEach((n, i) => {
      const m = e.members[i];
      // enter from just outside the officer's view where possible (side streets, behind barricades)
      let x = m.at[0], z = m.at[1];
      for (let k = 0; k < 8 && g.world.blocked(x, z, 0.4); k++) { x += (Math.random() - 0.5) * 2; z += (Math.random() - 0.5) * 2; }
      n.pos.set(x, 0, z); n.vel.set(0, 0, 0); n.knock.set(0, 0, 0);
      n.surge = null; n.march = null; n.stimuli.length = 0;
      n.heading = Math.atan2(g.player.pos.x - x, g.player.pos.z - z);
      crowd.makeHostile(n, m.style, 'player');
      n.cool = 0.6 + Math.random() * 1.2 + i * 0.4; // staggered: the group does not all swing at once
    });
    st.members = people;
    if (e.radio) g.missions.radio(e.radio);
    if (e.alert) g.hud.alert(e.alert, 'warn', 2.5);
    for (const [type, at] of e.events || []) {
      const pos = at ? new THREE.Vector3(at[0], type === 'carFire' ? 1.0 : 0, at[1]) : undefined;
      g.events.scripted(type, pos);
    }
    if (g.audio.enabled) g.audio.shout(people[0] ? people[0].pos : g.player.pos);
  }

  alive(id) {
    const st = this.state[id];
    return st ? st.members.filter((n) => !n.neutralized && !n.arrested && n.temperament === 'hostile').length : 0;
  }

  update(dt) {
    const p = this.game.player.pos;
    for (const e of this.list) {
      const st = this.state[e.id];
      if (st.status === 'waiting') {
        if (this.game.cinematic) continue; // nothing starts while a cinematic plays
        const tr = e.trigger || { now: true };
        const go = tr.now || (tr.z !== undefined && (p.z - tr.z) * this.dir >= 0) || (tr.after && this.state[tr.after] && this.state[tr.after].status === 'resolved');
        if (go) this.start(e);
      } else if (st.status === 'active') {
        st.t += dt;
        if (this.alive(e.id) === 0) st.status = 'resolved';
      }
    }
  }

  // every encounter of the section has resolved
  cleared() { return this.list.every((e) => this.state[e.id].status === 'resolved'); }

  // members still fighting, across the section
  active() {
    const out = [];
    for (const e of this.list) if (this.state[e.id].status === 'active') for (const n of this.state[e.id].members) if (!n.neutralized && !n.arrested && n.temperament === 'hostile') out.push(n);
    return out;
  }

  counts() {
    let total = 0, down = 0;
    for (const e of this.list) {
      const st = this.state[e.id];
      if (st.status === 'waiting') continue;
      total += st.members.length;
      down += st.members.length - this.alive(e.id);
    }
    return { total, down };
  }
}

```

## src/events.js

```js
// Ambient incident scheduler: keeps several disturbance areas active around the
// player — petrol bombs, firework mortars, projectile volleys, fires flaring
// up and parked cars catching fire. Timing, size, direction and sound vary so
// the city never repeats the same explosion on a loop.
import * as THREE from 'three';

const R = (a, b) => a + Math.random() * (b - a);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Areas where unrest is ongoing. `crowd` is where throwers stand, `police`
// is roughly where the projectiles are aimed.
const ZONES = [
  { name: 'Timbaud east', crowd: V(78, 0, 70), police: V(61, 0, 70) },
  { name: 'Timbaud west', crowd: V(-80, 0, 69), police: V(-61, 0, 71) },
  { name: 'Malte east', crowd: V(82, 0, -20), police: V(61, 0, -20) },
  { name: 'Malte west', crowd: V(-78, 0, -21), police: V(-61, 0, -19) },
  { name: 'Oberkampf east', crowd: V(80, 0, -110), police: V(61, 0, -110) },
  { name: 'Oberkampf west', crowd: V(-84, 0, -109), police: V(-61, 0, -111) },
  { name: 'North barricade', crowd: V(0, 0, -182), police: V(R(-6, 6), 0, -160) },
  { name: 'Boulevard centre', crowd: V(-4, 0, 60), police: V(2, 0, 78), inside: true },
  { name: 'Place de Malte', crowd: V(3, 0, -30), police: V(0, 0, -12), inside: true },
  { name: 'Oberkampf junction', crowd: V(-2, 0, -96), police: V(2, 0, -78), inside: true },
];

export class IncidentScheduler {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  // hazardDir: the direction the officer advances along the boulevard (Level 1 -z, Level 2 +z)
  reset() { this.hazardDir = (this.game.level && this.game.level.hazardDir) || -1; this.t = 4; this.carT = 22 + Math.random() * 15; this.lastZone = null; this.queue = []; this.hazards = false; this.hazT = 4; this.gasT = 30 + Math.random() * 20; this.gasClouds = []; this.timers = []; }

  // run fn after `sec` seconds of game time (staggered shots; replaces wall-clock
  // timers so the simulation stays reproducible and nothing fires while paused)
  later(sec, fn) { this.timers.push({ t: sec, fn }); }

  // queue a named event after a delay (phase scripting)
  schedule(type, delay, pos) { this.queue.push({ type, t: delay, pos }); }
  scripted(type, pos) { this._run(type, pos); }
  setHazards(on) { this.hazards = on; this.hazT = 3; }

  _run(type, pos) {
    const p = this.game.player.pos;
    if (type === 'carFire') this.carFire(pos);
    else if (type === 'teargas') this.tearGas();
    else if (type === 'mortar') this.mortar(this._nearestZone(p, 25));
    else if (type === 'molotovAt') this.molotovAt(pos);
  }

  _nearestZone(p, minD) {
    const c = ZONES.filter((z) => z.crowd.distanceTo(p) > minD).sort((a, b) => a.crowd.distanceTo(p) - b.crowd.distanceTo(p));
    return c[0] || ZONES[0];
  }

  // CRS fire tear-gas canisters from the line into the crowd ahead
  tearGas() {
    const g = this.game;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      this.later(i * R(250, 600) / 1000, () => {
        const from = V(R(-8, 8), 2.2, 125);
        const to = V(R(-9, 9), 0.1, R(86, 108));
        g.audio.thump(from);
        g.effects.throwProjectile(from, to, 'stone', (pos) => {
          const ground = pos.clone().setY(g.world.groundHeight(pos.x, pos.z) + 0.1);
          this.gasClouds.push({ pos: ground, t: 0, life: R(12, 16) });
          g.crowd.disturb(ground, 9, 0.8, 'teargas');
          g.audio.impact(ground, false, false, 'stone');
        }, R(1.1, 1.5));
      });
    }
  }

  // a petrol bomb thrown from the crowd to land at (or near) a given point
  molotovAt(target, fromSide) {
    const g = this.game;
    const side = fromSide ?? (target.x > 0 ? 1 : -1);
    const from = V(side * R(10, 13), 1.9, target.z + R(-6, 6));
    g.effects.throwProjectile(from, target.clone().setY(0.1), 'petrol', (pos) => {
      const ground = pos.clone().setY(g.world.groundHeight(pos.x, pos.z));
      g.effects.ignite(ground, R(2.2, 3.0), R(5, 8));
      g.audio.molotov(ground, R(0.8, 1.0));
      g.crowd.disturb(ground, 16, 0.9, 'explosion');
      this._shakeFrom(ground, 0.4);
      const d = g.player.pos.distanceTo(ground);
      if (d < 3.2) g.player.takeDamage(14, ground, null);
    }, R(1.0, 1.3));
  }

  // hazard phases: petrol bombs land on the boulevard ahead of the officer
  _hazard() {
    const g = this.game, p = g.player.pos;
    const sideOff = (Math.random() < 0.5 ? -1 : 1) * R(2.5, 6);
    const ahead = V(Math.max(-12, Math.min(12, p.x + sideOff)), 0, p.z + this.hazardDir * R(14, 24));
    if (ahead.z < -120 || ahead.z > 170) return;
    g.hud.alert('Incoming petrol bomb!', 'warn', 1.4, 'incoming');
    this.molotovAt(ahead);
  }

  update(dt) {
    const g = this.game;
    this.t -= dt; this.carT -= dt;
    for (let i = this.timers.length - 1; i >= 0; i--) { const tm = this.timers[i]; tm.t -= dt; if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); } }
    for (let i = this.queue.length - 1; i >= 0; i--) { const q = this.queue[i]; q.t -= dt; if (q.t <= 0) { this.queue.splice(i, 1); this._run(q.type, q.pos); } }
    if (this.hazards) { this.hazT -= dt; if (this.hazT <= 0) { this.hazT = R(8, 13); this._hazard(); } }
    // police tear gas at intervals while the crowd is near the line
    this.gasT -= dt;
    if (this.gasT <= 0) { this.gasT = R(35, 60); if (g.player.pos.z > 40) this.tearGas(); }
    // lingering tear-gas clouds: thick pale smoke that keeps people away
    for (let i = this.gasClouds.length - 1; i >= 0; i--) {
      const c = this.gasClouds[i];
      c.t += dt;
      if (c.t > c.life) { this.gasClouds.splice(i, 1); continue; }
      const k = 1 - c.t / c.life;
      if (Math.random() < 0.3 * k + 0.05) g.effects.smoke.spawn({ pos: c.pos.clone().add(V(R(-0.6, 0.6), R(0.2, 0.8), R(-0.6, 0.6))), vel: V(R(-1.2, 1.2), R(0.4, 1.0), R(-1.2, 1.2)), size: R(1.0, 1.6), grow: 4, life: R(5, 8), alpha: 0.14, color: new THREE.Color(0.66, 0.68, 0.66), drag: 0.6, windK: 1.0, fadeIn: 0.4 });
      if (Math.random() < dt * 1.5) g.crowd.disturb(c.pos, 7 * k + 2, 0.5, 'teargas');
    }
    if (this.t <= 0) {
      this.t = R(3.5, 9);
      const p = g.player.pos;
      // prefer areas at a visible distance, never on top of the player
      // never into a boss arena: a boss fight must contain no damage the player cannot see coming
      const A = g.crowd.arena, nearArena = (v) => A && Math.hypot(v.x - A.x, v.z - A.z) < A.r + 25;
      const cands = ZONES.filter((z) => { const d = z.crowd.distanceTo(p); return d > (z.inside ? 30 : 20) && d < 170 && z !== this.lastZone && !nearArena(z.police) && !nearArena(z.crowd); });
      if (!cands.length) return;
      const z = cands[Math.floor(Math.random() * cands.length)];
      this.lastZone = z;
      const r = Math.random();
      if (r < 0.34) this.molotov(z);
      else if (r < 0.62) this.mortar(z);
      else if (r < 0.86) this.volley(z);
      else this.flareUp(z);
    }
    if (this.carT <= 0) { this.carT = R(30, 55); this.carFire(); }
  }

  _from(z) { return z.crowd.clone().add(V(R(-4, 4), 1.9, R(-3, 3))); }
  _to(z) { return z.police.clone().add(V(R(-4, 4), 0.1, R(-4, 4))); }

  molotov(z) {
    const g = this.game;
    const from = this._from(z), to = this._to(z);
    g.effects.throwProjectile(from, to, 'petrol', (pos) => {
      const ground = pos.clone().setY(g.world.groundHeight(pos.x, pos.z));
      const s = R(0.6, 1.0);
      g.effects.ignite(ground, 2.2 + s, R(4, 7));
      g.audio.molotov(ground, 0.6 + s * 0.4);
      g.crowd.disturb(ground, 16, 0.9, 'explosion');
      this._shakeFrom(ground, 0.35);
      if (g.player.pos.distanceTo(ground) < 3.5) g.player.takeDamage(14, ground, null);
    }, R(1.0, 1.5));
  }

  mortar(z) {
    const g = this.game;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      this.later(i * R(350, 900) / 1000, () => {
        const from = z.crowd.clone().add(V(R(-3, 3), 0.3, R(-3, 3)));
        const to = z.police.clone().add(V(R(-6, 6), R(6, 14), R(-6, 6)));
        g.audio.thump(from);
        g.effects.mortar(from, to, (pos) => {
          g.audio.firework(pos);
          g.crowd.disturb(pos.clone().setY(0), 14, 0.6, 'explosion');
          this._shakeFrom(pos, 0.15);
        });
      });
    }
  }

  volley(z) {
    const g = this.game;
    const n = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      this.later(i * R(150, 420) / 1000, () => {
        const type = Math.random() < 0.4 ? 'bottle' : 'stone';
        g.effects.throwProjectile(this._from(z), this._to(z), type, (pos) => {
          if (type === 'bottle') g.audio.glass(pos, 0.6); else g.audio.impact(pos, false, false, Math.random() < 0.6 ? 'stone' : 'shield');
          g.effects.dust(pos, 4);
          g.crowd.disturb(pos, 5, 0.3, 'projectile');
        });
      });
    }
    if (Math.random() < 0.6) g.audio.shout(z.crowd, true);
  }

  flareUp(z) {
    const g = this.game;
    // nearest persistent fire to the zone roars up for a few seconds
    let best = null, bd = Infinity;
    for (const f of g.world.fires) { const d = f.pos.distanceToSquared(z.crowd); if (d < bd) { bd = d; best = f; } }
    if (!best || bd > 60 * 60) return this.molotov(z);
    best.boost = R(1.8, 2.6); best.boostT = R(2.5, 4);
    g.effects.explosion(best.pos, 0.55, { noDebris: true });
    g.audio.explosion(best.pos, 0.45);
  }

  carFire(at) {
    const g = this.game;
    // a parked car near the player's area bursts into flames (not too close)
    const p = g.player.pos;
    const spot = at ? at.clone() : V(R(-1, 1) > 0 ? 7.7 : -7.7, 1.0, p.z + R(-60, 60) * (Math.random() < 0.5 ? 1 : -1));
    spot.z = Math.max(-150, Math.min(110, spot.z));
    if (!at && spot.distanceTo(p) < 18) return;
    g.effects.explosion(spot, 1.1);
    g.effects.addFire(spot, 1.4, 2.0);
    g.audio.explosion(spot, 1.1);
    g.audio.alarm(spot, 16 + Math.random() * 10);
    g.crowd.disturb(spot, 22, 1.0, 'explosion');
    this._shakeFrom(spot, 0.5);
    if (spot.distanceTo(p) < 60) g.hud.alert('A vehicle has caught fire', 'warn', 2.2, 'carfire');
  }

  _shakeFrom(pos, k) {
    const d = pos.distanceTo(this.game.player.pos);
    this.game.cameraRig.shake(Math.max(0, k * (1 - d / 60)));
  }
}

```

## src/hud.js

```js
// DOM HUD: objective panel, compass, minimap, bars, alerts, prompts, feedback.
import * as THREE from 'three';
import { LAYOUT } from './world.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor(game) {
    this.game = game;
    this.el = $('hud');
    this.alerts = $('alerts');
    this.map = $('minimap').getContext('2d');
    this.promptEl = $('prompt');
    this.promptSet = false;
    this.alertKeys = new Map();
    this.flash = 0;
    this.lastScore = -1;
    this.mapT = 0;
    // compass strip labels
    const strip = $('compass-strip');
    this.compassItems = [];
    const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    for (let d = 0; d < 360; d += 15) {
      const s = document.createElement('span');
      s.textContent = names[d] || '·';
      if (names[d] && names[d].length === 1) s.className = 'card';
      strip.appendChild(s);
      this.compassItems.push({ el: s, d });
    }
  }

  show(on) { this.el.classList.toggle('hidden', !on); }

  alert(text, kind = 'info', dur = 2.5, key = null) {
    if (key) {
      const last = this.alertKeys.get(key);
      if (last && performance.now() - last < 900) return;
      this.alertKeys.set(key, performance.now());
    }
    const d = document.createElement('div');
    d.className = 'alert ' + kind;
    d.textContent = text;
    this.alerts.appendChild(d);
    while (this.alerts.children.length > 4) this.alerts.firstChild.remove();
    setTimeout(() => d.classList.add('fade'), dur * 1000);
    setTimeout(() => d.remove(), dur * 1000 + 600);
  }

  clearAlerts() { this.alerts.innerHTML = ''; }

  scorePop(v, reason) {
    const el = $('score-pop');
    el.textContent = `${v > 0 ? '+' : ''}${v} ${reason || ''}`;
    el.className = v >= 0 ? 'pos' : 'neg';
    void el.offsetWidth;
    el.classList.add('show');
  }

  prompt(key, text) {
    this.promptEl.innerHTML = `<b>${key}</b>${text}`;
    this.promptEl.classList.remove('hidden');
    this.promptSet = true;
  }

  damageFlash(k) { this.flash = Math.min(1, this.flash + k); }

  hitMarker() {
    const c = $('crosshair');
    c.classList.add('hit');
    clearTimeout(this._hm);
    this._hm = setTimeout(() => c.classList.remove('hit'), 160);
  }

  update(dt) {
    const g = this.game, p = g.player, m = g.missions;
    // prompt is re-asserted every frame by whoever needs it
    if (!this.promptSet) this.promptEl.classList.add('hidden');
    this.promptSet = false;

    if (m.score !== this.lastScore) { $('score').textContent = m.score.toLocaleString('fr-FR'); this.lastScore = m.score; }
    const hb = $('health-bar').firstElementChild;
    hb.style.width = p.health + '%';
    hb.style.background = p.health < 30 ? 'var(--red)' : p.health < 60 ? 'var(--amber)' : 'var(--green)';
    $('stamina-bar').firstElementChild.style.width = p.stamina + '%';

    // objective panel
    const info = m.hudInfo();
    $('objective-text').textContent = info.text;
    const chip = document.querySelector('#incident-status .chip');
    chip.textContent = info.chip;
    chip.className = 'chip ' + ({ calm: 'calm', active: '', danger: 'danger', done: 'done' }[info.status] || '');
    $('incident-detail').textContent = info.detail;
    // phase count comes from the level (3 in Level 1, 5 in Level 2)
    const np = info.completed.length;
    $('mission-progress').textContent = `${Math.min(np, info.index + 1)} / ${np}`;
    const pn = `PHASE ${info.index + 1} · ${info.phaseName}`;
    if (this._pn !== pn) { this._pn = pn; $('phase-name').textContent = pn; }
    const pipBox = $('progress-pips');
    if (pipBox.children.length !== np) pipBox.innerHTML = '<span></span>'.repeat(np);
    const pips = pipBox.children;
    for (let i = 0; i < np; i++) pips[i].className = info.completed[i] ? 'done' : i === info.index ? 'active' : '';
    const bar = $('incident-bar');
    bar.style.visibility = info.bar === null ? 'hidden' : 'visible';
    if (info.bar !== null) { bar.firstElementChild.style.width = info.bar * 100 + '%'; bar.firstElementChild.style.background = info.bar < 0.3 ? 'var(--red)' : 'var(--accent)'; }

    $('threat-warning').classList.toggle('hidden', !m.warning);

    // boss bar: name, health with phase marks, and when the guard is down
    const bi = m.bossInfo ? m.bossInfo() : null;
    $('boss-bar').classList.toggle('hidden', !bi);
    if (bi) {
      const key = bi.name + bi.max + bi.phases;
      if (this._bossKey !== key) {
        this._bossKey = key;
        $('boss-name').textContent = bi.name; $('boss-sub').textContent = bi.sub;
        const hp = $('boss-hp'); hp.querySelectorAll('.tick').forEach((e) => e.remove());
        for (const f of bi.marks) { const tk = document.createElement('span'); tk.className = 'tick'; tk.style.left = (f * 100) + '%'; hp.appendChild(tk); }
      }
      const w = (bi.hp / bi.max) * 100 + '%';
      const fill = $('boss-hp').querySelector('.fill'), chip = $('boss-hp').querySelector('.chip');
      if (fill.style.width !== w) { fill.style.width = w; chip.style.width = w; } // the chip lags behind (CSS transition delay)
      const st = $('boss-state');
      const txt = bi.state === 'defeated' ? 'DOWN — ARREST HIM' : bi.state === 'transition' ? `PHASE ${bi.phase + 1}` : bi.open ? 'OPENING' : '';
      if (st.textContent !== txt) { st.textContent = txt; st.className = bi.open || bi.state === 'defeated' ? 'open' : bi.state === 'transition' ? 'phase' : ''; }
    }

    // damage vignette
    this.flash = Math.max(0, this.flash - dt * 1.5);
    const low = p.health < 35 ? (0.35 + Math.sin(g.time * 5) * 0.1) * (1 - p.health / 35) : 0;
    $('vignette').style.opacity = Math.max(this.flash, low).toFixed(3);

    this._compass(info);
    this._offscreen();
    this.mapT += dt;
    if (this.mapT > 1 / 20) { this.mapT = 0; this._minimap(); }
  }

  _camBearing() {
    // camera forward = (-sin yaw, -cos yaw); north = -z
    const yaw = this.game.cameraRig.yaw;
    return ((-yaw * 180) / Math.PI % 360 + 360) % 360;
  }

  _compass() {
    const cb = this._camBearing();
    const W = 420, ppd = W / 160;
    for (const it of this.compassItems) {
      let d = it.d - cb; d = ((d + 540) % 360) - 180;
      it.el.style.left = W / 2 + d * ppd + 'px';
      it.el.style.display = Math.abs(d) > 85 ? 'none' : '';
    }
    const mk = $('compass-marker');
    const mp = this.game.missions.markerPos;
    if (mp) {
      const p = this.game.player.pos;
      const b = (Math.atan2(mp.x - p.x, -(mp.z - p.z)) * 180) / Math.PI;
      let d = b - cb; d = ((d + 540) % 360) - 180;
      mk.style.display = '';
      mk.style.left = W / 2 + Math.max(-75, Math.min(75, d)) * ppd + 'px';
    } else mk.style.display = 'none';
  }

  _offscreen() {
    const arrow = $('offscreen-arrow');
    const mp = this.game.missions.markerPos;
    if (!mp) { arrow.style.opacity = 0; return; }
    const cam = this.game.camera;
    const v = new THREE.Vector3(mp.x, 1.5, mp.z).project(cam);
    const behind = v.z > 1;
    const onScreen = !behind && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.9;
    if (onScreen) { arrow.style.opacity = 0; return; }
    let x = v.x, y = v.y;
    if (behind) { x = -x; y = -Math.abs(y) - 0.5; }
    const a = Math.atan2(y, x);
    const W = innerWidth, H = innerHeight;
    const r = Math.min(W, H) * 0.42;
    const px = W / 2 + Math.cos(a) * r, py = H / 2 - Math.sin(a) * r;
    arrow.style.opacity = 0.9;
    arrow.style.left = px - 10 + 'px';
    arrow.style.top = py - 9 + 'px';
    arrow.style.transform = `rotate(${-a + Math.PI / 2}rad)`;
  }

  _minimap() {
    const ctx = this.map, g = this.game, p = g.player.pos, w = g.world;
    const S = 200, C = 100, scale = 1.35;
    const yaw = g.cameraRig.yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const tr = (x, z) => { const dx = x - p.x, dz = z - p.z; return [C + (dx * rx + dz * rz) * scale, C - (dx * fx + dz * fz) * scale]; };
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath(); ctx.arc(C, C, C - 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(22,24,28,0.92)'; ctx.fillRect(0, 0, S, S);
    const poly = (x0, z0, x1, z1, style) => {
      ctx.fillStyle = style; ctx.beginPath();
      const a = tr(x0, z0), b = tr(x1, z0), c = tr(x1, z1), d = tr(x0, z1);
      ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.lineTo(...d); ctx.closePath(); ctx.fill();
    };
    for (const r of w.roads) poly(r.x0, r.z0, r.x1, r.z1, 'rgba(120,120,118,0.55)');
    for (const b of w.blocks) poly(b.x0, b.z0, b.x1, b.z1, 'rgba(58,56,52,0.95)');
    // NPCs
    const crowd = g.crowd;
    for (const n of crowd.npcs) {
      if (n.state === 'gone') continue;
      const [x, y] = tr(n.pos.x, n.pos.z);
      if (x < -5 || x > S + 5 || y < -5 || y > S + 5) continue;
      const threat = crowd.isThreat(n) || (n.script && n.script.marked);
      ctx.fillStyle = threat ? '#ff3b3b' : n.arrested ? '#e9e6df' : n.state === 'flee' ? 'rgba(255,200,120,0.75)' : 'rgba(190,186,176,0.6)';
      const r = threat ? 3.6 : 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#3d7bff';
    for (const c of crowd.police) { const [x, y] = tr(c.pos.x, c.pos.z); ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill(); }
    // objective
    const mp = g.missions.markerPos;
    if (mp) {
      let [x, y] = tr(mp.x, mp.z);
      const dx = x - C, dy = y - C, d = Math.hypot(dx, dy);
      if (d > C - 10) { x = C + (dx / d) * (C - 10); y = C + (dy / d) * (C - 10); }
      ctx.fillStyle = '#ffb02e';
      ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // player arrow (map is camera-up, so rotate by player heading relative to camera)
    const ph = g.player.heading;
    const pf = [Math.sin(ph), Math.cos(ph)];
    const ax = pf[0] * rx + pf[1] * rz, ay = -(pf[0] * fx + pf[1] * fz);
    const ang = Math.atan2(ay, ax);
    ctx.save(); ctx.translate(C, C); ctx.rotate(ang + Math.PI / 2);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(0, 3); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
    // north indicator
    const nx = C - rz * (C - 12), ny = C + fz * (C - 12); // world north (0,-1) in map space
    ctx.fillStyle = '#e9e6df'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny);
  }

  showEnd(win, reason, m) {
    if (m.endInfo) return this._showEndInfo(win, m.endInfo(win, reason));
    $('end-title').textContent = win ? 'MISSION COMPLETE' : 'MISSION FAILED';
    $('end-title').style.color = win ? 'var(--text)' : 'var(--red)';
    $('end-sub').textContent = win ? `Line held · ${m.stats.bombsStopped ? 'petrol bomb stopped' : 'bomber dealt with'} · officers extracted from Rue Oberkampf` : reason || '';
    const s = m.stats;
    const rank = m.score >= 4500 && s.peaceful === 0 ? 'COMMENDATION' : m.score >= 3000 ? 'PROFESSIONAL' : m.score >= 1500 ? 'ADEQUATE' : 'UNDER REVIEW';
    $('end-stats').innerHTML = `
      <div class="row"><span>Aggressors neutralised</span><span>${s.neutralized}</span></div>
      <div class="row"><span>Arrests</span><span>${s.arrests}</span></div>
      <div class="row"><span>Petrol bombs prevented</span><span>${s.bombsStopped} / ${s.bombsStopped + s.bombsThrown}</span></div>
      <div class="row"><span>Peaceful demonstrators struck</span><span style="color:${s.peaceful ? 'var(--red)' : 'inherit'}">${s.peaceful}</span></div>
      <div class="row"><span>Phases completed</span><span>${m.completed.filter(Boolean).length} / 3</span></div>
      <div class="row"><span>Mission time</span><span>${Math.floor(m.t / 60)}:${String(Math.floor(m.t % 60)).padStart(2, '0')}</span></div>
      <div class="row total"><span>SCORE</span><span>${m.score.toLocaleString('fr-FR')}</span></div>
      <div class="rank">${win ? 'RATING · ' + rank : 'Restart to try again'}</div>`;
  }

  // Non-blocking title card (level start): fades in and out over `dur` seconds.
  titleCard(title, sub, dur = 3.5) {
    const el = $('title-card');
    el.querySelector('.tc-title').textContent = title; el.querySelector('.tc-sub').textContent = sub;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._tcT); this._tcT = setTimeout(() => el.classList.remove('show'), dur * 1000);
  }

  // Big centred banner (boss phase changes).
  banner(title, sub = '', dur = 1.8) {
    const el = $('banner');
    el.querySelector('.bn-title').textContent = title; el.querySelector('.bn-sub').textContent = sub;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._bnT); this._bnT = setTimeout(() => el.classList.remove('show'), dur * 1000);
  }

  // end screen described by the level's own mission script (Level 2 onwards)
  _showEndInfo(win, e) {
    const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    $('end-title').textContent = e.title;
    $('end-title').style.color = win ? 'var(--text)' : 'var(--red)';
    $('end-sub').textContent = e.sub;
    $('end-stats').innerHTML = e.rows.map(([k, v]) => `<div class="row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')
      + `<div class="row total"><span>SCORE</span><span>${this.game.missions.score.toLocaleString('fr-FR')}</span></div>`
      + `<div class="rank">${esc(e.rank)}</div>`
      + (e.hook ? `<div class="hook">${esc(e.hook)}</div>` : '');
  }
}

```

## src/humans.js

```js
// Skinned human characters: loads local Mixamo-rigged glTF models, retargets
// motion-capture clips between them, recolours clothing per character in the
// shader (keeping the fabric detail of the original textures), and layers the
// game's procedural pose offsets (strikes, throws, chants, knockdowns) on top
// of the mocap skeleton in character space.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const FILES = {
  soldier: 'Soldier.glb', michelle: 'Michelle.glb', male: 'rpm_male.glb', xbot: 'Xbot.glb',
  rb_female: 'rb_female.glb', rb_male_a: 'rb_male_a.glb', rb_male_b: 'rb_male_b.glb',
};
// Microsoft Rocketbox bodies (converted by tools/rocketbox): one skinned mesh with
// a per-vertex garment part, a texture atlas and ARKit facial blendshapes.
export const RB_KINDS = ['rb_female', 'rb_male_a', 'rb_male_b'];
export const CIV_KINDS = ['michelle', 'male', ...RB_KINDS];
const canon = (name) => name.replace(/^mixamorig:?/, '');

export const Humans = { ready: false, templates: {}, clips: {}, envMap: null };

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const _m = new THREE.Matrix4();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);

// ------------------------------------------------------------------ loading
export async function loadHumans(onProgress) {
  const loader = new GLTFLoader();
  const keys = Object.keys(FILES);
  let done = 0;
  const results = await Promise.all(keys.map((k) => loader.loadAsync(`assets/models/${FILES[k]}`).then((g) => { done++; onProgress && onProgress(done / keys.length); return g; })));
  const gl = {}; keys.forEach((k, i) => (gl[k] = results[i]));
  for (const k of keys) Humans.templates[k] = prepTemplate(k, gl[k]);
  // source clips (Mixamo motion capture)
  const src = [
    ['xbot', gl.xbot.animations, { idle: 'idle', walk: 'walk', run: 'run', agree: 'agree', shake: 'headShake' }],
    ['soldier', gl.soldier.animations, { idle2: 'Idle', walk2: 'Walk', run2: 'Run' }],
  ];
  for (const tk of ['soldier', ...CIV_KINDS]) {
    const T = Humans.templates[tk];
    Humans.clips[tk] = {};
    for (const [sk, anims, map] of src) {
      const S = Humans.templates[sk];
      for (const [alias, name] of Object.entries(map)) {
        const clip = anims.find((a) => a.name === name);
        if (clip) Humans.clips[tk][alias] = retarget(clip, S, T, alias, Humans.templates.xbot);
      }
    }
  }
  Humans.ready = true;
  return Humans;
}

// The Ready Player Me male ships as 8 skinned meshes (head, eyes, body, top,
// trousers, shoes, beard...). Merge them into ONE skinned mesh with a texture
// atlas, a normal-map atlas and a per-vertex garment "part" id, so each man is
// a single draw call and garments are recoloured in the shader.
const MALE_PARTS = [
  // name pattern, part id, atlas rect [x, y, w, h] (normalised, top-down)
  [/Head/, 0, [0, 0, 0.5, 0.5]],
  [/Outfit_Top/, 1, [0.5, 0, 0.5, 0.5]],
  [/Outfit_Bottom/, 2, [0, 0.5, 0.5, 0.5]],
  [/Outfit_Footwear/, 3, [0.75, 0.5, 0.25, 0.25]],
  [/Body/, 0, [0.5, 0.5, 0.25, 0.25]],
  [/EyeLeft|EyeRight/, 5, [0.5, 0.75, 0.125, 0.125]],
  [/Beard/, 4, [0.625, 0.75, 0.125, 0.125]],
  [/Teeth/, 5, [0.75, 0.75, 0.125, 0.125]],
];
function mergeMale(scene) {
  const meshes = [];
  scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  const S = 2048;
  const cA = document.createElement('canvas'); cA.width = cA.height = S;
  const cN = document.createElement('canvas'); cN.width = cN.height = S;
  const xa = cA.getContext('2d'), xn = cN.getContext('2d');
  xn.fillStyle = 'rgb(128,128,255)'; xn.fillRect(0, 0, S, S);
  const geos = [];
  let first = null;
  for (const o of meshes) {
    const def = MALE_PARTS.find(([re]) => re.test(o.name));
    if (!def || /Headwear/.test(o.name)) { o.visible = false; continue; }
    if (!first) first = o;
    const [, part, [rx, ry, rw, rh]] = def;
    const m = o.material;
    if (m.map && m.map.image) xa.drawImage(m.map.image, rx * S, ry * S, rw * S, rh * S);
    else { xa.fillStyle = '#' + m.color.getHexString(); xa.fillRect(rx * S, ry * S, rw * S, rh * S); }
    if (m.normalMap && m.normalMap.image) xn.drawImage(m.normalMap.image, rx * S, ry * S, rw * S, rh * S);
    const g = new THREE.BufferGeometry();
    const src = o.geometry;
    // positions in the first mesh's bind space (all RPM meshes share one bind, but be safe)
    const P = src.attributes.position.clone();
    const N = src.attributes.normal.clone();
    if (o !== first) {
      const mtx = first.bindMatrixInverse.clone().multiply(o.bindMatrix);
      P.applyMatrix4(mtx); N.applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(mtx));
    }
    g.setAttribute('position', P);
    g.setAttribute('normal', N);
    const uv = src.attributes.uv;
    const nuv = new Float32Array(uv.count * 2);
    for (let i = 0; i < uv.count; i++) {
      const u = Math.min(0.998, Math.max(0.002, uv.getX(i))), v = Math.min(0.998, Math.max(0.002, uv.getY(i)));
      nuv[i * 2] = rx + u * rw; nuv[i * 2 + 1] = ry + v * rh;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(nuv, 2));
    const si = src.attributes.skinIndex, sw = src.attributes.skinWeight;
    const siA = new Uint16Array(si.count * 4), swA = new Float32Array(sw.count * 4);
    for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) { siA[i * 4 + k] = si.getComponent(i, k); swA[i * 4 + k] = sw.getComponent(i, k); }
    g.setAttribute('skinIndex', new THREE.BufferAttribute(siA, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(swA, 4));
    g.setAttribute('part', new THREE.BufferAttribute(new Float32Array(P.count).fill(part), 1));
    const idx = src.index ? Array.from(src.index.array) : [...Array(P.count).keys()];
    g.setIndex(idx);
    // mouthOpen / mouthSmile blendshapes (zeros for parts that don't have them)
    const ms = src.morphAttributes && src.morphAttributes.position;
    g.morphAttributes.position = [0, 1].map((k) => {
      const arr = new Float32Array(P.count * 3);
      const m = ms && ms[k];
      if (m) for (let i = 0; i < P.count; i++) { arr[i * 3] = m.getX(i); arr[i * 3 + 1] = m.getY(i); arr[i * 3 + 2] = m.getZ(i); } // handles interleaved / sparse data
      return new THREE.BufferAttribute(arr, 3);
    });
    g.morphTargetsRelative = true;
    geos.push(g);
    o.visible = false;
  }
  const merged = mergeGeometries(geos);
  const atlas = new THREE.CanvasTexture(cA); atlas.flipY = false; atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 4;
  const natlas = new THREE.CanvasTexture(cN); natlas.flipY = false;
  const mat = new THREE.MeshStandardMaterial({ map: atlas, normalMap: natlas, roughness: 0.85, metalness: 0 });
  const mesh = new THREE.SkinnedMesh(merged, mat);
  mesh.name = 'MaleMerged';
  first.parent.add(mesh);
  mesh.position.copy(first.position); mesh.quaternion.copy(first.quaternion); mesh.scale.copy(first.scale);
  mesh.bind(first.skeleton, first.bindMatrix);
  mesh.updateMorphTargets();
  mesh.morphTargetDictionary = { mouthOpen: 0, mouthSmile: 1 };
  for (const o of meshes) o.parent && o.parent.remove(o);
}

// ------------------------------------------------------------------ garments
// Clothing shells generated from each base body: a copy of the relevant part of
// the skinned mesh pushed out along its normals, skinned to the same skeleton.
// This lets three base bodies wear football shirts, hoodies, puffer jackets and
// long coats with genuinely different silhouettes.
const GARMENTS = {
  shirt: { offset: 0.007, sleeves: true, low: false },
  hoodie: { offset: 0.016, sleeves: true, low: false },
  puffer: { offset: 0.034, sleeves: true, low: false },
  coat: { offset: 0.02, sleeves: true, low: true },
};
const TORSO_BONES = /^(Spine|Spine1|Spine2|LeftShoulder|RightShoulder|LeftArm|RightArm|Neck)$/;
const SLEEVE_BONES = /^(LeftForeArm|RightForeArm)$/;
const LOW_BONES = /^(Hips|LeftUpLeg|RightUpLeg)$/;

// The rest-pose transform from mesh space to character space, measured through
// the skinning (some rigs carry an armature scale that the bind matrices undo).
const RF_CACHE = new WeakMap();
function restFrame(mesh) {
  if (RF_CACHE.has(mesh)) return RF_CACHE.get(mesh);
  const P = mesh.geometry.attributes.position;
  const v = new THREE.Vector3();
  const J = (x, y, z, i) => { v.set(x, y, z); mesh.applyBoneTransform(i, v); return v.applyMatrix4(mesh.matrixWorld).clone(); };
  // probe the linear part around a well-skinned vertex near the middle of the body
  let pi = 0, best = Infinity;
  const c = new THREE.Vector3();
  for (let i = 0; i < P.count; i += 7) { c.fromBufferAttribute(P, i); const w = J(c.x, c.y, c.z, i); const d = Math.abs(w.y - 1.2) + Math.abs(w.x); if (d < best) { best = d; pi = i; } }
  c.fromBufferAttribute(P, pi);
  const e = 1e-3 * Math.max(1e-6, Math.abs(c.x) + Math.abs(c.y) + Math.abs(c.z));
  const o = J(c.x, c.y, c.z, pi);
  const ax = J(c.x + e, c.y, c.z, pi).sub(o).divideScalar(e);
  const ay = J(c.x, c.y + e, c.z, pi).sub(o).divideScalar(e);
  const az = J(c.x, c.y, c.z + e, pi).sub(o).divideScalar(e);
  const L = new THREE.Matrix4().makeBasis(ax, ay, az);
  const t = o.clone().sub(c.clone().applyMatrix4(L));
  L.setPosition(t);
  const rf = {
    L, Li: L.clone().invert(),
    NM: new THREE.Matrix3().getNormalMatrix(L),
    lin: new THREE.Matrix3().setFromMatrix4(L.clone().invert()),
    toChar: (i, out) => { out.fromBufferAttribute(P, i); mesh.applyBoneTransform(i, out); return out.applyMatrix4(mesh.matrixWorld); },
  };
  RF_CACHE.set(mesh, rf);
  return rf;
}

function mainMesh(scene) {
  let best = null;
  scene.traverse((o) => { if (o.isSkinnedMesh && o.visible !== false && (!best || o.geometry.attributes.position.count > best.geometry.attributes.position.count)) best = o; });
  return best;
}

function shellGeometry(T, garment) {
  T.shells = T.shells || {};
  if (T.shells[garment]) return T.shells[garment];
  const cfg = GARMENTS[garment];
  const mesh = mainMesh(T.scene);
  const g = mesh.geometry;
  const P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, PART = g.attributes.part;
  const RF = restFrame(mesh), Mi = RF.Li, NM = RF.NM;
  const bones = mesh.skeleton.bones.map((b) => canon(b.name));
  const hipsY = T.restHipsWorld.y, neckY = new THREE.Vector3().setFromMatrixPosition(T.bind.Neck).y;
  const keep = new Uint8Array(P.count), cp = new THREE.Vector3(), cn = new THREE.Vector3();
  const charPos = new Float32Array(P.count * 3), charN = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) {
    RF.toChar(i, cp); cn.fromBufferAttribute(N, i).applyMatrix3(NM).normalize();
    charPos.set([cp.x, cp.y, cp.z], i * 3); charN.set([cn.x, cn.y, cn.z], i * 3);
    let bi = SI.getX(i), bw = SW.getX(i);
    for (const k of ['getY', 'getZ', 'getW']) if (SW[k](i) > bw) { bw = SW[k](i); bi = SI[k](i); }
    const bn = bones[bi] || '';
    let ok = false;
    if (PART) {
      const pt = PART.getX(i);
      ok = pt === 1 || (cfg.low && pt === 2 && cp.y > hipsY - 0.35);
      if (ok && !cfg.sleeves && SLEEVE_BONES.test(bn)) ok = false;
    } else {
      ok = (TORSO_BONES.test(bn) || (cfg.sleeves && SLEEVE_BONES.test(bn)) || (cfg.low && LOW_BONES.test(bn) && cp.y > hipsY - 0.4)) && cp.y > hipsY - (cfg.low ? 0.4 : 0.1) && cp.y < neckY + 0.02;
      if (bn === 'Neck' && cp.y > neckY - 0.02) ok = false;
    }
    keep[i] = ok ? 1 : 0;
  }
  const map = new Int32Array(P.count).fill(-1);
  const idx = g.index.array, outIdx = [];
  let n = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (!(keep[a] && keep[b] && keep[c])) continue;
    for (const v of [a, b, c]) { if (map[v] < 0) map[v] = n++; outIdx.push(map[v]); }
  }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const v3 = new THREE.Vector3(), lin = RF.lin;
  for (let i = 0; i < P.count; i++) {
    const j = map[i]; if (j < 0) continue;
    // offset along the normal in character space (metres), converted to a mesh-space delta
    v3.set(charN[i * 3], charN[i * 3 + 1], charN[i * 3 + 2]).multiplyScalar(cfg.offset).applyMatrix3(lin);
    pos.set([P.getX(i) + v3.x, P.getY(i) + v3.y, P.getZ(i) + v3.z], j * 3);
    v3.fromBufferAttribute(N, i); nor.set([v3.x, v3.y, v3.z], j * 3);
    uv.set([Math.atan2(charPos[i * 3], charPos[i * 3 + 2]) * 1.6, charPos[i * 3 + 1] * 5], j * 2);
    for (let k = 0; k < 4; k++) { si[j * 4 + k] = SI.getComponent(i, k); sw[j * 4 + k] = SW.getComponent(i, k); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  out.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  out.setIndex(outIdx);
  const bm = addBodyMorphs(out, mesh, bones);
  out.morphAttributes.position = [bm.belly, bm.chest];
  out.morphTargetsRelative = true;
  T.shells[garment] = out;
  return out;
}

let FABRIC_N = null;
function fabricNormal() {
  if (FABRIC_N) return FABRIC_N;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'); x.fillStyle = 'rgb(128,128,255)'; x.fillRect(0, 0, S, S);
  // knit / weave micro-relief + a few seams
  for (let i = 0; i < 9000; i++) { const v = 110 + Math.random() * 40; x.fillStyle = `rgb(${v},${128 + (Math.random() - 0.5) * 30},255)`; x.fillRect(Math.random() * S, Math.random() * S, 2, 1); }
  x.fillStyle = 'rgb(100,128,240)'; for (const yy of [64, 192]) x.fillRect(0, yy, S, 2);
  FABRIC_N = new THREE.CanvasTexture(c); FABRIC_N.wrapS = FABRIC_N.wrapT = THREE.RepeatWrapping;
  return FABRIC_N;
}

function armPoint(T, name) {
  const m = T.bind[name] || T.bind[name.replace('Left', 'Right')];
  const v = m ? new THREE.Vector3().setFromMatrixPosition(m) : new THREE.Vector3(0.2, 1.4, 0);
  v.x = Math.abs(v.x);
  return v;
}

function garmentMaterial(o, garment, bind, T) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: garment === 'puffer' ? 0.55 : garment === 'shirt' ? 0.75 : 0.92, normalMap: fabricNormal(), normalScale: new THREE.Vector2(0.6, 0.6), envMap: Humans.envMap, envMapIntensity: garment === 'puffer' ? 0.5 : 0.2 });
  const U = {
    uBase: { value: new THREE.Color(o.shellColor) }, uPattern: { value: o.shellPattern || 0 },
    uPA: { value: new THREE.Color(o.pa ?? o.shellColor) }, uPB: { value: new THREE.Color(o.pb ?? o.shellColor) }, uPC: { value: new THREE.Color(o.pc ?? 0xffffff) },
    uQuilt: { value: garment === 'puffer' ? 1 : 0 }, uBind: { value: bind },
    // arm axis (left side, mirrored by |x|) for tracksuit sleeve stripes
    uArmA: { value: armPoint(T, 'LeftArm') }, uArmB: { value: armPoint(T, 'LeftHand') },
  };
  mat.userData.U = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uBind; varying vec3 vCharPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCharPos = (uBind * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uBase, uPA, uPB, uPC, uArmA, uArmB; uniform int uPattern; uniform float uQuilt; varying vec3 vCharPos;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 p = vCharPos; vec3 o = uBase;
          float torso = step(abs(p.x), 0.22) * step(p.y, 1.55);
          if (uPattern == 1) { // PSG-style centre band
            float band = 1.0 - smoothstep(0.065, 0.069, abs(p.x));
            float edge = 1.0 - smoothstep(0.085, 0.089, abs(p.x));
            o = mix(o, mix(mix(uPA, uPC, edge), uPB, band), torso);
          } else if (uPattern == 2) o = mix(o, mix(uPA, uPB, step(0.5, fract(p.x * 11.0))), torso);
          else if (uPattern == 3) o = mix(o, mix(uPA, uPB, step(0.5, fract(p.y * 9.0))), torso);
          else if (uPattern == 4) o = mix(uPA, uPB, step(1.28, p.y));
          else if (uPattern == 6) { // Algeria-style shirt: green / white halves
            o = mix(uPA, uPB, step(0.0, p.x));
          } else if (uPattern == 7) { // hi-vis gilet jaune: yellow body, two reflective hoops, shoulder straps
            float vest = torso * step(0.92, p.y) * step(p.y, 1.47);
            float hoops = (1.0 - smoothstep(0.016, 0.02, abs(p.y - 1.02))) + (1.0 - smoothstep(0.016, 0.02, abs(p.y - 1.1)));
            float straps = (1.0 - smoothstep(0.016, 0.02, abs(abs(p.x) - 0.1))) * step(1.22, p.y);
            o = mix(o, mix(uPA, uPB, clamp(hoops + straps, 0.0, 1.0)), vest);
          }
          else if (uPattern == 8) { // tracksuit top: three stripes down the outside of each sleeve
            vec3 q = vec3(abs(p.x), p.y, p.z);
            vec3 ax = uArmB - uArmA; float L = length(ax); ax /= L;
            float t = dot(q - uArmA, ax);
            vec3 d = normalize(q - uArmA - ax * t);
            vec3 outer = normalize(cross(ax, vec3(0.0, 0.0, 1.0))); outer *= sign(outer.y + 1e-4);
            vec3 side = cross(ax, outer);
            float a = atan(dot(d, side), dot(d, outer));
            float st = 0.0;
            for (int k = -1; k <= 1; k++) st += 1.0 - smoothstep(0.07, 0.1, abs(a - float(k) * 0.3));
            o = mix(o, uPA, clamp(st, 0.0, 1.0) * step(0.04, t) * step(t, L * 0.92) * step(0.15, q.x));
          }
          if (uQuilt > 0.5) o *= 0.82 + 0.18 * smoothstep(0.0, 0.5, abs(sin(p.y * 38.0)));
          diffuseColor.rgb *= o;
        }`);
  };
  mat.customProgramCacheKey = () => 'garment-v2';
  return mat;
}

// Body-shape blendshapes: push the surface out along its normals, weighted by
// how strongly each vertex follows the lower / upper spine. Applied per person.
function addBodyMorphs(geo, mesh, boneNames) {
  const P = geo.attributes.position, N = geo.attributes.normal, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
  const RF = restFrame(mesh), NM = RF.NM, lin = RF.lin;
  const want = { belly: { Spine: 1, Hips: 0.45, Spine1: 0.55 }, chest: { Spine1: 0.5, Spine2: 1, LeftShoulder: 0.5, RightShoulder: 0.5 } };
  const amt = { belly: 0.055, chest: 0.022 };
  const out = {};
  const n = new THREE.Vector3(), d = new THREE.Vector3(), c = new THREE.Vector3();
  for (const key of ['belly', 'chest']) {
    const arr = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      let w = 0;
      for (let k = 0; k < 4; k++) w += (want[key][boneNames[SI.getComponent(i, k)]] || 0) * SW.getComponent(i, k);
      if (w < 0.01) continue;
      n.fromBufferAttribute(N, i).applyMatrix3(NM).normalize();
      // bellies push mostly forward/sideways, never up or down
      if (key === 'belly') { n.y *= 0.2; n.z = n.z > 0 ? n.z * 1.6 : n.z * 0.5; }
      d.copy(n).multiplyScalar(amt[key] * Math.min(1, w)).applyMatrix3(lin);
      arr.set([d.x, d.y, d.z], i * 3);
    }
    out[key] = new THREE.BufferAttribute(arr, 3);
  }
  return out;
}

function attachMorphs(mesh, geo, extra) {
  const names = Object.keys(mesh.morphTargetDictionary || {});
  geo.morphAttributes.position = geo.morphAttributes.position || [];
  const dict = { ...(mesh.morphTargetDictionary || {}) };
  for (const [k, attr] of Object.entries(extra)) { dict[k] = geo.morphAttributes.position.length; geo.morphAttributes.position.push(attr); }
  geo.morphTargetsRelative = true;
  return dict;
}

// Procedural jaw-drop blendshape for heads that ship without facial morphs.
function addJawMorph(T) {
  const mesh = mainMesh(T.scene);
  const g = mesh.geometry;
  if (g.morphAttributes.position && g.morphAttributes.position.length) return;
  const P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
  const RF = restFrame(mesh);
  const bones = mesh.skeleton.bones.map((b) => canon(b.name));
  const H = new THREE.Vector3().setFromMatrixPosition(T.bind.Head);
  const cp = new THREE.Vector3();
  const pts = [];
  let chin = Infinity, noseZ = -Infinity, noseY = 0;
  for (let i = 0; i < P.count; i++) {
    let bi = SI.getX(i), bw = SW.getX(i);
    for (const k of ['getY', 'getZ', 'getW']) if (SW[k](i) > bw) { bw = SW[k](i); bi = SI[k](i); }
    if (!/Head|Neck/.test(bones[bi] || '')) continue;
    RF.toChar(i, cp);
    pts.push([i, cp.x, cp.y, cp.z]);
    if (cp.z > H.z + 0.04 && Math.abs(cp.x) < 0.03) { if (cp.y < chin && cp.y > H.y - 0.12) chin = cp.y; if (cp.z > noseZ && cp.y > H.y) { noseZ = cp.z; noseY = cp.y; } }
  }
  if (!isFinite(chin)) return;
  const mouthY = noseY - 0.36 * (noseY - chin);
  const pivot = new THREE.Vector3(0, mouthY + 0.03, H.z - 0.01);
  const ang = 0.26, ca = Math.cos(ang), sa = Math.sin(ang);
  const delta = new Float32Array(P.count * 3), lin = RF.lin;
  const d = new THREE.Vector3();
  for (const [i, x, y, z] of pts) {
    if (z < H.z - 0.005 || y > mouthY + 0.006 || y < chin - 0.045) continue;
    const w = Math.min(1, (mouthY + 0.006 - y) / 0.02) * Math.min(1, (z - (H.z - 0.005)) / 0.03) * Math.min(1, (y - (chin - 0.045)) / 0.03);
    const dy = y - pivot.y, dz = z - pivot.z;
    const ny = pivot.y + dy * ca - dz * sa, nz = pivot.z + dy * sa + dz * ca;
    d.set(0, (ny - y) * w, (nz - z) * w).applyMatrix3(lin);
    delta.set([d.x, d.y, d.z], i * 3);
  }
  g.morphAttributes.position = [new THREE.BufferAttribute(delta, 3)];
  g.morphTargetsRelative = true;
  mesh.updateMorphTargets();
  mesh.morphTargetDictionary = { mouthOpen: 0 };
}


function patchMale(mat, o) {
  const U = {
    uSkin: { value: o.skinMul.clone() }, uTop: { value: new THREE.Color(o.topColor) }, uBottom: { value: new THREE.Color(o.pants) },
    uShoes: { value: new THREE.Color(o.shoes) }, uHair: { value: new THREE.Color(o.hair) },
    uPattern: { value: o.pattern || 0 }, uPA: { value: new THREE.Color(o.pa ?? 0xffffff) }, uPB: { value: new THREE.Color(o.pb ?? 0xffffff) }, uPC: { value: new THREE.Color(o.pc ?? 0xffffff) },
    uBind: { value: o.bind },
    uKeep: { value: new THREE.Vector3(o.keepTop ? 1 : 0, o.keepBottom ? 1 : 0, o.keepShoes ? 1 : 0) },
  };
  const rb = !!o.rb; // Rocketbox: flat part ids, hair cards alpha-tested from the atlas, keepable base clothes
  const vary = rb ? 'flat varying' : 'varying';
  mat.userData.U = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float part; ${vary} float vPart; uniform mat4 uBind; varying vec3 vCharPos;`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPart = part; vCharPos = (uBind * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        ${vary} float vPart; varying vec3 vCharPos;
        uniform vec3 uSkin, uTop, uBottom, uShoes, uHair, uPA, uPB, uPC, uKeep; uniform int uPattern;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 c = diffuseColor.rgb;
          float part = vPart;
          ${rb ? `if (part > 3.5) { if (texture2D(map, vMapUv + vec2(0.5, 0.0)).r < 0.5) discard; }
          else if (part > 0.5 && part < 2.5) { // skin showing through a garment triangle (necklines, cuffs)
            vec3 s = pow(max(c, vec3(1e-4)), vec3(1.0 / 2.2));
            float mx = max(s.r, max(s.g, s.b)), dd = mx - min(s.r, min(s.g, s.b)), hh = (s.g - s.b) / (dd + 1e-4);
            if (s.r >= s.g && s.g >= s.b && dd / mx > 0.22 && dd / mx < 0.7 && mx > 0.25 && hh > 0.15 && hh < 0.75) part = 0.0;
          }` : ''}
          float lum = dot(c, vec3(0.299, 0.587, 0.114));
          float k = 0.35 + lum * 1.6;
          vec3 o = c;
          if (part < 0.5) o = c * uSkin;
          else if (part < 1.5) {
            o = uTop * k;
            vec3 p = vCharPos; float l = 0.3 + lum * 1.4;
            float torso = step(0.98, p.y) * step(p.y, 1.52) * step(abs(p.x), 0.21);
            if (uPattern == 1) {
              float band = 1.0 - smoothstep(0.07, 0.074, abs(p.x));
              float edge = 1.0 - smoothstep(0.09, 0.094, abs(p.x));
              o = mix(o, mix(mix(uPA * l, uPC * l, edge), uPB * l, band), torso);
            } else if (uPattern == 2) o = mix(o, mix(uPA, uPB, step(0.5, fract(p.x * 11.0))) * l, torso);
            else if (uPattern == 3) o = mix(o, mix(uPA, uPB, step(0.5, fract(p.y * 9.0))) * l, torso);
            else if (uPattern == 4) o = mix(o, mix(uPA, uPB, step(1.27, p.y)) * l, step(0.98, p.y));
            ${rb ? 'o = mix(o, c, uKeep.x);' : ''}
          }
          else if (part < 2.5) o = mix(uBottom * k, c, uKeep.y);
          else if (part < 3.5) o = mix(uShoes * k, c, uKeep.z);
          else if (part < 4.5) o = ${rb ? 'c' : 'uHair * (0.4 + lum)'};
          diffuseColor.rgb = o;
        }`);
  };
  mat.customProgramCacheKey = () => (rb ? 'rb-v1' : 'male-merged-v1');
}

function prepTemplate(key, gltf) {
  const scene = gltf.scene;
  if (key === 'male') mergeMale(scene);
  const rb = RB_KINDS.includes(key);
  if (rb) scene.traverse((o) => { if (o.isSkinnedMesh && o.geometry.attributes._part) { o.geometry.setAttribute('part', o.geometry.attributes._part); o.geometry.deleteAttribute('_part'); } });
  const yawFix = key === 'soldier' ? Math.PI : 0;
  const holder = new THREE.Group();
  holder.rotation.y = yawFix;
  holder.add(scene);
  holder.updateMatrixWorld(true);
  const bones = {};
  scene.traverse((o) => { if (o.isBone) { bones[canon(o.name)] = o; o.userData.bindQ = o.quaternion.clone(); } });
  const hips = bones.Hips;
  const restHipsWorld = hips.getWorldPosition(new THREE.Vector3());
  const parentQ = hips.parent.getWorldQuaternion(new THREE.Quaternion());
  const parentM = hips.parent.matrixWorld.clone();
  const box = new THREE.Box3().setFromObject(scene);
  // world-space bind matrices of every bone (for sockets)
  const bind = {};
  for (const [n, b] of Object.entries(bones)) bind[n] = b.matrixWorld.clone();
  const boneScale = hips.getWorldScale(new THREE.Vector3()).x;
  const T = { key, gltf, scene, holder, yawFix, bones, restHipsWorld, parentQ, parentM, top: box.max.y, bind, boneScale };
  if (key === 'michelle') addJawMorph(T);
  if (key === 'male' || key === 'michelle' || rb) {
    const mesh = mainMesh(scene);
    const names = mesh.skeleton.bones.map((b) => canon(b.name));
    const dict = attachMorphs(mesh, mesh.geometry, addBodyMorphs(mesh.geometry, mesh, names));
    mesh.updateMorphTargets();
    mesh.morphTargetDictionary = dict;
    T.boneNames = names;
  }
  return T;
}

// Copy Mixamo tracks across rigs that share bone naming; correct the Hips for
// differing armature orientation (Y-up vs Z-up) and scale the hip height.
// World-space retargeting. Both rigs are first brought to a common reference
// pose (the source's T-pose: every bone points at its child in the same
// direction), then each frame's world-space rotation *relative to that pose*
// is transferred bone by bone. This copes with A-pose binds, different bone
// roll and Y-up/Z-up armatures.
const CHILD = {
  Hips: 'Spine', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head',
  LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', LeftHand: 'LeftHandMiddle1',
  RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand', RightHand: 'RightHandMiddle1',
  LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase',
};
for (const side of ['Left', 'Right']) for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) { CHILD[`${side}Hand${f}1`] = `${side}Hand${f}2`; CHILD[`${side}Hand${f}2`] = `${side}Hand${f}3`; }

function boneOrder(tpl) {
  const order = [];
  tpl.scene.traverse((o) => { if (o.isBone) order.push(canon(o.name)); });
  return order;
}

// Pose `tpl` so each bone points at its child like the reference template does;
// returns world quaternions (character space) of that reference pose.
function referencePose(tpl, ref) {
  const saved = new Map();
  tpl.scene.traverse((o) => { if (o.isBone) saved.set(o, o.quaternion.clone()); });
  tpl.holder.updateMatrixWorld(true);
  const order = boneOrder(tpl);
  if (tpl !== ref) {
    for (const c of order) {
      const ch = CHILD[c];
      const b = tpl.bones[c], bc = tpl.bones[ch];
      if (!b || !bc || !ref.bones[c] || !ref.bones[ch] || c === 'Hips') continue;
      const dRef = new THREE.Vector3().setFromMatrixPosition(ref.bind[ch]).sub(new THREE.Vector3().setFromMatrixPosition(ref.bind[c])).normalize();
      const pb = b.getWorldPosition(new THREE.Vector3()), pc = bc.getWorldPosition(new THREE.Vector3());
      const dCur = pc.sub(pb).normalize();
      const rq = new THREE.Quaternion().setFromUnitVectors(dCur, dRef);
      b.parent.getWorldQuaternion(_q);
      _q3.copy(_q).invert().multiply(rq).multiply(_q);
      b.quaternion.premultiply(_q3);
      b.updateMatrixWorld(true);
    }
  }
  const world = {};
  for (const c of order) world[c] = tpl.bones[c].getWorldQuaternion(new THREE.Quaternion());
  // restore bind pose
  for (const [b, q] of saved) b.quaternion.copy(q);
  tpl.holder.updateMatrixWorld(true);
  return world;
}

function retarget(clip, S, T, alias, refTpl) {
  if (!S.refWorld) S.refWorld = referencePose(S, refTpl);
  if (!T.refWorld) T.refWorld = referencePose(T, refTpl);
  const order = boneOrder(T).filter((c) => S.bones[c]);
  const fps = 30, n = Math.max(2, Math.ceil(clip.duration * fps) + 1);
  const times = new Float32Array(n);
  const qv = {}; for (const c of order) qv[c] = new Float32Array(n * 4);
  const hv = new Float32Array(n * 3);
  // static parent world quats of target bones whose parent is not a mapped bone
  const tParentStatic = {};
  for (const c of order) {
    const par = T.bones[c].parent;
    const pc = par && par.isBone ? canon(par.name) : null;
    if (!pc || !order.includes(pc)) tParentStatic[c] = par.getWorldQuaternion(new THREE.Quaternion());
  }
  const mixer = new THREE.AnimationMixer(S.scene);
  const action = mixer.clipAction(clip); action.play();
  const ratio = T.restHipsWorld.y / S.restHipsWorld.y;
  const invTP = T.parentM.clone().invert();
  const sw = {}, tw = {};
  const tmpInv = new THREE.Quaternion(), out = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const t = Math.min(clip.duration, i / fps);
    times[i] = t;
    mixer.setTime(t);
    S.holder.updateMatrixWorld(true);
    for (const c of order) {
      sw[c] = sw[c] || new THREE.Quaternion();
      S.bones[c].getWorldQuaternion(sw[c]);
      // target world = (source world * inv(source ref)) * target ref
      tw[c] = tw[c] || new THREE.Quaternion();
      tmpInv.copy(S.refWorld[c]).invert();
      tw[c].copy(sw[c]).multiply(tmpInv).multiply(T.refWorld[c]);
      const par = T.bones[c].parent;
      const pq = tParentStatic[c] || tw[canon(par.name)];
      out.copy(pq).invert().multiply(tw[c]);
      out.toArray(qv[c], i * 4);
    }
    // hips translation (vertical bob, sway), scaled to the target's leg length
    S.bones.Hips.getWorldPosition(_v).sub(S.restHipsWorld).multiplyScalar(ratio);
    _v.z *= 0.3; _v.x *= 0.6;
    _v.add(T.restHipsWorld).applyMatrix4(invTP);
    _v.toArray(hv, i * 3);
  }
  mixer.stopAllAction(); mixer.uncacheRoot(S.scene);
  // restore the source skeleton to bind pose
  S.scene.traverse((o) => { if (o.isBone && o.userData.bindQ) o.quaternion.copy(o.userData.bindQ); });
  S.holder.updateMatrixWorld(true);
  const tracks = order.map((c) => new THREE.QuaternionKeyframeTrack(`${T.bones[c].name}.quaternion`, times, qv[c]));
  tracks.push(new THREE.VectorKeyframeTrack(`${T.bones.Hips.name}.position`, times, hv));
  return new THREE.AnimationClip(alias, clip.duration, tracks);
}

// ------------------------------------------------------------------ materials
// Shared shader patch: recolour by hue rules and/or a tint, plus garment patterns.
// Per-character uniforms live on cloned materials; the program is shared.
function patchMaterial(mat, opts) {
  const U = {
    uMode: { value: opts.mode || 0 },          // 0 tint, 1 hue rules
    uTint: { value: new THREE.Color(opts.tint ?? 0xffffff) },
    uKeepLum: { value: opts.keepLum ?? 1.0 },
    uC0: { value: new THREE.Color(opts.c0 ?? 0xffffff) }, // rule colours
    uC1: { value: new THREE.Color(opts.c1 ?? 0xffffff) },
    uC2: { value: new THREE.Color(opts.c2 ?? 0xffffff) },
    uC3: { value: new THREE.Color(opts.c3 ?? 0xffffff) },
    uPattern: { value: opts.pattern || 0 },    // 0 none, 1 PSG band, 2 vertical stripes, 3 hoops, 4 two-tone
    uPA: { value: new THREE.Color(opts.pa ?? 0xffffff) },
    uPB: { value: new THREE.Color(opts.pb ?? 0xffffff) },
    uPC: { value: new THREE.Color(opts.pc ?? 0xffffff) },
    uBind: { value: opts.bind || new THREE.Matrix4() },
    uPatBox: { value: new THREE.Vector4(opts.patY0 ?? 1.0, opts.patY1 ?? 1.6, opts.patZ ?? 0, opts.patW ?? 0.075) },
    uMaskRules: { value: opts.rules || 0 },
  };
  mat.userData.U = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uBind;\nvarying vec3 vCharPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCharPos = (uBind * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform int uMode; uniform vec3 uTint; uniform float uKeepLum;
        uniform vec3 uC0, uC1, uC2, uC3, uPA, uPB, uPC; uniform int uPattern; uniform vec4 uPatBox; uniform int uMaskRules;
        varying vec3 vCharPos;
        vec3 rgb2hsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); float e=1.0e-10; return vec3(abs(q.z+(q.w-q.y)/(6.0*d+e)),d/(q.x+e),q.x); }
        float hueNear(float h, float c, float w){ float d = abs(h - c); d = min(d, 1.0 - d); return 1.0 - smoothstep(w * 0.6, w, d); }
      `)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 c = diffuseColor.rgb;
          float lum = dot(c, vec3(0.299, 0.587, 0.114));
          vec3 hsv = rgb2hsv(pow(max(c, vec3(0.0)), vec3(1.0 / 2.2))); // classify in display (sRGB) space
          vec3 outc = c;
          if (uMode == 0) {
            outc = mix(c * uTint, uTint * (0.35 + lum * 1.6), uKeepLum);
          } else {
            // hue rules: 0 = cream/armour, 1 = green cloth, 2 = red accents, 3 = yellow, 4 = skin
            float sat = hsv.y, val = hsv.z;
            outc = c;
            if (uMaskRules == 1) { // Vanguard soldier -> CRS officer
              float cream = smoothstep(0.35, 0.55, val) * (1.0 - smoothstep(0.35, 0.6, sat)) * hueNear(hsv.x, 0.09, 0.12);
              float green = hueNear(hsv.x, 0.22, 0.12) * smoothstep(0.08, 0.2, sat);
              float red = hueNear(hsv.x, 0.0, 0.06) * smoothstep(0.45, 0.7, sat);
              float l = 0.25 + lum * 1.3;
              outc = mix(outc, uC0 * l, cream);
              outc = mix(outc, uC1 * (0.4 + lum * 2.2), green);
              outc = mix(outc, uC2 * l, red);
              outc = mix(outc, c * 0.55 + uC1 * 0.1, (1.0 - cream - green - red) * 0.5);
            } else if (uMaskRules == 2) { // Michelle streetwear
              float yellow = hueNear(hsv.x, 0.14, 0.07) * smoothstep(0.35, 0.6, sat) * smoothstep(0.35, 0.6, val);
              float red = hueNear(hsv.x, 0.0, 0.05) * smoothstep(0.5, 0.75, sat);
              float skin = hueNear(hsv.x, 0.06, 0.05) * smoothstep(0.25, 0.4, sat) * (1.0 - smoothstep(0.75, 0.95, val)) * (1.0 - red);
              outc = mix(outc, uC0 * (0.3 + lum * 1.2), yellow);
              outc = mix(outc, uC2 * (0.4 + lum), red);
              outc = mix(outc, c * uC3, skin);
              // dark garments: optional base colour
              float dark = (1.0 - smoothstep(0.12, 0.3, val)) * (1.0 - skin);
              outc = mix(outc, uC1 * (0.25 + lum * 2.5), dark * step(0.01, uC1.r + uC1.g + uC1.b));
            }
          }
          // garment patterns in bind (character) space
          if (uPattern > 0) {
            vec3 p = vCharPos;
            float inY = step(uPatBox.x, p.y) * step(p.y, uPatBox.y);
            float l = 0.3 + lum * 1.4;
            float torso = inY * step(abs(p.x), 0.21);
            if (uPattern == 1) {
              float band = 1.0 - smoothstep(uPatBox.w, uPatBox.w + 0.004, abs(p.x));
              float edge = 1.0 - smoothstep(uPatBox.w + 0.02, uPatBox.w + 0.024, abs(p.x));
              vec3 col = mix(uPA * l, uPC * l, edge);
              col = mix(col, uPB * l, band);
              outc = mix(outc, col, torso);
            } else if (uPattern == 2) {
              float s = step(0.5, fract(p.x * 11.0));
              outc = mix(outc, mix(uPA, uPB, s) * l, torso);
            } else if (uPattern == 3) {
              float s = step(0.5, fract(p.y * 9.0));
              outc = mix(outc, mix(uPA, uPB, s) * l, torso);
            } else if (uPattern == 4) {
              float s = step(uPatBox.x + (uPatBox.y - uPatBox.x) * 0.55, p.y);
              outc = mix(outc, mix(uPA, uPB, s) * l, inY);
            }
          }
          diffuseColor.rgb = outc;
        }
      `);
  };
  mat.customProgramCacheKey = () => 'human-recolor-v1';
  return mat;
}

// Recolour the Vanguard soldier texture into CRS colours once, on the CPU:
// cream armour -> dark navy-black plates, olive cloth -> navy uniform,
// red stripes -> police blue. Luminance is kept so wear, seams and edges stay.
let CRS_TEX = null;
function crsTexture(src) {
  if (CRS_TEX) return CRS_TEX;
  const img = src.image;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn;
    let h = 0;
    if (dl > 1e-4) { if (mx === r) h = ((g - b) / dl) % 6; else if (mx === g) h = (b - r) / dl + 2; else h = (r - g) / dl + 4; h /= 6; if (h < 0) h += 1; }
    const sat = mx ? dl / mx : 0, val = mx, lum = 0.3 * r + 0.59 * g + 0.11 * b;
    let o;
    if (val > 0.42 && sat < 0.55 && h > 0.02 && h < 0.17) o = [0.10 + lum * 0.16, 0.12 + lum * 0.19, 0.17 + lum * 0.27]; // armour plates
    else if (h > 0.13 && h < 0.33 && sat > 0.1) o = [0.08 + lum * 0.35, 0.11 + lum * 0.45, 0.2 + lum * 0.8]; // cloth -> navy
    else if ((h < 0.04 || h > 0.95) && sat > 0.5) o = [0.15, 0.28, 0.62]; // stripes -> blue
    else o = [r * 0.62, g * 0.66, b * 0.78];
    d[i] = Math.min(255, o[0] * 255); d[i + 1] = Math.min(255, o[1] * 255); d[i + 2] = Math.min(255, o[2] * 255);
  }
  ctx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.flipY = src.flipY; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = src.wrapS; t.wrapT = src.wrapT; t.anisotropy = 4;
  CRS_TEX = t;
  return t;
}

// ------------------------------------------------------------------ build
const SKIN_AVG = new THREE.Color(0.8, 0.62, 0.57);

function socket(rig, boneName, charMatrix) {
  // Attach an empty group to a bone such that, in bind pose, its world frame equals charMatrix.
  const T = rig.T, bone = rig.bones[boneName];
  const g = new THREE.Group();
  const local = T.bind[boneName].clone().invert().multiply(charMatrix);
  local.decompose(g.position, g.quaternion, g.scale);
  bone.add(g);
  return g;
}

function basis(x, y, z, pos) { return new THREE.Matrix4().makeBasis(x, y, z).setPosition(pos); }

export function createHuman(kind, outfit, extra = {}) {
  const T = Humans.templates[kind];
  const model = SkeletonUtils.clone(T.scene);
  const holder = new THREE.Group();
  holder.rotation.y = T.yawFix;
  holder.add(model);
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  const body = new THREE.Group(); // receives crouch offsets + height scale
  body.add(holder);
  root.add(body);
  const hs = outfit.height || 1;
  const bw = THREE.MathUtils.clamp(outfit.build || 1, 0.9, 1.14); // body width varies the silhouette
  body.scale.set(hs * bw, hs, hs * (0.5 + bw * 0.5));
  const bones = {};
  model.traverse((o) => { if (o.isBone) bones[canon(o.name)] = o; });
  const rig = { skinned: true, kind, T, root, body, model, bones, meshes: [], pose: null, item: null, itemType: 'none', phase: Math.random() * 6.28, speed: 0, acc: 0 };
  // bind matrices for this clone (identical to template; template is in its holder frame)
  holder.updateMatrixWorld(true);

  // materials
  const tplMain = mainMesh(T.scene);
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    const n = o.name;
    if (o.isSkinnedMesh) {
      // bind-pose bounds padded for limb motion, so culling stays correct while animating
      o.computeBoundingSphere();
      o.boundingSphere.radius *= 1.5;
    }
    if (/Eye/.test(n)) { o.castShadow = false; o.receiveShadow = false; o.userData.detail = true; }
    if (/Teeth|Headwear/.test(n)) { o.visible = false; return; }
    if (n === 'Wolf3D_Beard') { o.visible = !!outfit.beard; }
    const m = o.material.clone();
    m.envMap = Humans.envMap; m.envMapIntensity = 0.5;
    const bindM = o.name === tplMain.name && kind !== 'soldier' ? restFrame(tplMain).L.clone() : o.matrixWorld.clone();
    if (kind === 'soldier') {
      if (/visor/i.test(n)) {
        o.material = new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 0.05, metalness: 0.9, envMap: Humans.envMap, envMapIntensity: 1.6, transparent: true, opacity: 0.88 });
        rig.meshes.push(o); return;
      }
      m.map = crsTexture(m.map);
      m.color.set(0xffffff);
      m.roughness = 0.5; m.metalness = 0.05; m.envMapIntensity = 0.25;
    } else if (kind === 'michelle') {
      patchMaterial(m, { mode: 1, rules: 2, c0: outfit.pants, c1: outfit.topBase ?? 0x000000, c2: outfit.accent, c3: outfit.skinMul, bind: bindM, pattern: outfit.pattern, pa: outfit.pa, pb: outfit.pb, pc: outfit.pc, patY0: 0.95, patY1: 1.42, patW: 0.06 });
    } else if (kind === 'male') {
      patchMale(m, { ...outfit, hair: outfit.beard ? outfit.hair : outfit.skinTone, bind: bindM });
    } else if (RB_KINDS.includes(kind)) {
      m.roughness = 0.75; m.envMapIntensity = 0.3;
      patchMale(m, { ...outfit, bind: bindM, rb: true });
    }
    o.material = m;
    rig.meshes.push(o);
  });

  // ---- sockets (frames defined in character space at bind pose)
  const B = T.bind;
  const posOf = (n) => new THREE.Vector3().setFromMatrixPosition(B[n]);
  const holderInv = new THREE.Matrix4(); // template bind already includes holder yaw (character space)
  const handBasis = (side) => {
    const hand = posOf(side + 'Hand'), elbow = posOf(side + 'ForeArm');
    const y = elbow.clone().sub(hand).normalize(); // -Y points along the forearm, beyond the hand
    const z = new THREE.Vector3(0, 0, 1); z.addScaledVector(y, -z.dot(y)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    const grip = hand.clone().addScaledVector(y, -0.075);
    return basis(x, y, z, grip);
  };
  rig.handR = socket(rig, 'RightHand', handBasis('Right'));
  rig.handL = socket(rig, 'LeftHand', handBasis('Left'));
  // "spine" socket keeps the old procedural rig's frame: origin near the waist
  rig.spine = socket(rig, 'Spine', basis(AX, AY, AZ, new THREE.Vector3(0, posOf('Hips').y - 0.0, 0)));
  rig.chest = socket(rig, 'Spine2', basis(AX, AY, AZ, posOf('Spine2')));
  const headTop = kind === 'soldier' ? T.top - 0.05 : T.top;
  const headPos = posOf('Head'); headPos.y = headTop - (kind === 'rb_female' ? 0.135 : RB_KINDS.includes(kind) ? 0.105 : 0.115); // Rocketbox: realistic head size, her hair adds volume
  headPos.z += kind === 'male' ? 0.02 : RB_KINDS.includes(kind) ? 0.03 : 0.0;
  rig.head = socket(rig, 'Head', basis(AX, AY, AZ, headPos));
  rig.headTop = headTop;

  // grip pose for fingers (curl) applied after the mixer each frame
  rig.grip = { R: buildGrip(rig, 'Right'), L: buildGrip(rig, 'Left') };

  // clothing layer generated from the base body
  if (outfit.garment && GARMENTS[outfit.garment] && kind !== 'soldier') {
    const base = mainMesh(model);
    const geo = shellGeometry(T, outfit.garment);
    if (geo.index.count > 0) {
      const sh = new THREE.SkinnedMesh(geo, garmentMaterial(outfit, outfit.garment, restFrame(mainMesh(T.scene)).L.clone(), T));
      sh.name = 'Garment';
      sh.updateMorphTargets();
      sh.morphTargetDictionary = { belly: 0, chest: 1 };
      sh.position.copy(base.position); sh.quaternion.copy(base.quaternion); sh.scale.copy(base.scale);
      base.parent.add(sh);
      sh.bind(base.skeleton, base.bindMatrix);
      sh.castShadow = false; sh.receiveShadow = true; sh.userData.detail = true; // the body underneath casts the shadow
      sh.computeBoundingSphere(); sh.boundingSphere.radius *= 1.5;
      rig.meshes.push(sh);
    }
  }
  // body shape: girth, shoulder width, head size (bone scale is never animated)
  if (outfit.body && kind !== 'soldier') {
    const B = outfit.body;
    // girth / chest via generated blendshapes on the body and the garment
    for (const m of [mainMesh(model), ...rig.meshes.filter((x) => x.name === 'Garment')]) {
      if (!m || !m.morphTargetDictionary) continue;
      const d = m.morphTargetDictionary;
      if (d.belly !== undefined) m.morphTargetInfluences[d.belly] = Math.max(0, (B.girth - 0.95) / 0.21);
      if (d.chest !== undefined) m.morphTargetInfluences[d.chest] = Math.max(0, (B.chest - 0.97) / 0.08) * 0.8;
    }
    for (const s of ['LeftShoulder', 'RightShoulder']) if (bones[s]) bones[s].position.multiplyScalar(B.shoulders);
    if (bones.Head) bones.Head.scale.setScalar(B.head);
  }
  // face: blendshapes, eye bones
  const faceMesh = mainMesh(model);
  rig.face = {
    mesh: faceMesh && faceMesh.morphTargetInfluences ? faceMesh : null,
    open: faceMesh && faceMesh.morphTargetDictionary ? faceMesh.morphTargetDictionary.mouthOpen : undefined,
    smile: faceMesh && faceMesh.morphTargetDictionary ? faceMesh.morphTargetDictionary.mouthSmile : undefined,
    blinkM: faceMesh && faceMesh.morphTargetDictionary ? faceMesh.morphTargetDictionary.eyeBlink : undefined,
    browUp: faceMesh && faceMesh.morphTargetDictionary ? faceMesh.morphTargetDictionary.browInnerUp : undefined,
    browDown: faceMesh && faceMesh.morphTargetDictionary ? faceMesh.morphTargetDictionary.browDown : undefined,
    funnel: faceMesh && faceMesh.morphTargetDictionary ? faceMesh.morphTargetDictionary.mouthFunnel : undefined,
    mood: 0, moodV: 0,
    eyes: [bones.LeftEye, bones.RightEye].filter(Boolean).map((e) => ((e.userData.restQ = e.quaternion.clone()), e)),
    blinkT: 1 + Math.random() * 3, blink: 0, sacT: 0, sx: 0, sy: 0, mouth: 0, smileV: 0,
  };

  // animation
  const clips = Humans.clips[kind];
  const mixer = new THREE.AnimationMixer(model);
  const style = extra.style ?? (Math.random() < 0.5 ? 0 : 1);
  const pickClip = (a, b) => clips[style ? b : a] || clips[a] || clips[b];
  const idleName = extra.idle || (style ? 'idle2' : 'idle');
  rig.actions = {
    idle: mixer.clipAction(clips[idleName] || pickClip('idle', 'idle2')),
    walk: mixer.clipAction(pickClip('walk', 'walk2')),
    run: mixer.clipAction(pickClip('run', 'run2')),
  };
  for (const a of Object.values(rig.actions)) { a.play(); a.setEffectiveWeight(0); a.time = Math.random() * a.getClip().duration; }
  rig.actions.idle.setEffectiveWeight(1);
  rig.mixer = mixer;
  rig.walkRef = style ? 1.25 : 1.4;
  rig.runRef = style ? 3.6 : 4.2;
  return rig;
}

function buildGrip(rig, side) {
  // Curl finger bones around the character-space forward axis (as measured in bind pose).
  const out = [];
  const sgn = side === 'Right' ? 1 : -1;
  for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) {
    for (let i = 1; i <= 3; i++) {
      const n = `${side}Hand${f}${i}`;
      const b = rig.bones[n]; if (!b) continue;
      const wq = new THREE.Quaternion(); rig.T.bind[n].decompose(_v, wq, _v2);
      const axis = new THREE.Vector3(0, 0, sgn).applyQuaternion(wq.clone().invert());
      out.push({ b, q: new THREE.Quaternion().setFromAxisAngle(axis, i === 1 ? 1.2 : 1.3) });
    }
  }
  for (let i = 1; i <= 3; i++) {
    const n = `${side}HandThumb${i}`;
    const b = rig.bones[n]; if (!b) continue;
    const wq = new THREE.Quaternion(); rig.T.bind[n].decompose(_v, wq, _v2);
    const axis = new THREE.Vector3(0, sgn * 0.6, 0.4).normalize().applyQuaternion(wq.clone().invert());
    out.push({ b, q: new THREE.Quaternion().setFromAxisAngle(axis, 0.5) });
  }
  return out;
}

// ------------------------------------------------------------------ per-frame
// Rotate a bone about a world-space axis, then refresh its subtree.
function rotWorld(bone, axisW, ang) {
  if (Math.abs(ang) < 1e-4) return false;
  bone.parent.getWorldQuaternion(_q);
  _q2.setFromAxisAngle(axisW, ang);
  _q3.copy(_q).invert().multiply(_q2).multiply(_q); // parent^-1 * R * parent
  bone.quaternion.premultiply(_q3);
  return true;
}

const cx = new THREE.Vector3(), cy = new THREE.Vector3(), cz = new THREE.Vector3();
function rot3(bone, x, y, z) {
  let ch = false;
  // order: twist (Y), then side (Z), then pitch (X) — matches the old rig's Euler order closely enough
  ch = rotWorld(bone, cy, y) || ch;
  ch = rotWorld(bone, cz, z) || ch;
  ch = rotWorld(bone, cx, x) || ch;
  if (ch) bone.updateMatrixWorld(true);
}

export function updateHuman(rig, P, dt, full = true) {
  // locomotion blend from speed
  const s = rig.speed;
  const A = rig.actions;
  const lying = Math.abs(P.tiltX) > 0.3 || P.y < -0.25;
  const wIdle = lying ? 1 : 1 - THREE.MathUtils.smoothstep(s, 0.15, 1.0);
  const wRun = lying ? 0 : THREE.MathUtils.smoothstep(s, 2.4, 4.0);
  const wWalk = lying ? 0 : Math.max(0, 1 - wIdle - wRun);
  A.idle.setEffectiveWeight(wIdle);
  A.walk.setEffectiveWeight(wWalk);
  A.run.setEffectiveWeight(wRun);
  A.walk.timeScale = THREE.MathUtils.clamp(s / rig.walkRef, 0.6, 1.7);
  A.run.timeScale = THREE.MathUtils.clamp(s / rig.runRef, 0.75, 1.5);
  rig.mixer.update(dt);

  // root & body (tilt for knockdowns, vertical offset for crouches)
  rig.root.rotation.x = P.tiltX;
  rig.root.rotation.z = P.tiltZ;
  rig.body.position.y = P.y;
  rig.root.updateMatrixWorld(true);
  if (!full) return;

  // character-space axes in world
  rig.root.getWorldQuaternion(_q);
  cx.copy(AX).applyQuaternion(_q); cy.copy(AY).applyQuaternion(_q); cz.copy(AZ).applyQuaternion(_q);
  const b = rig.bones;
  rot3(b.Spine1, P.spX, P.spY, P.spZ);
  rot3(b.Head, P.hdX, P.hdY, 0);
  rot3(b.LeftArm, P.shLX, P.shLY, P.shLZ);
  rot3(b.LeftForeArm, P.elL, 0, 0);
  rot3(b.RightArm, P.shRX, P.shRY, P.shRZ);
  rot3(b.RightForeArm, P.elR, 0, 0);
  rot3(b.LeftUpLeg, P.hpLX, 0, P.hpLZ);
  rot3(b.LeftLeg, P.knL, 0, 0);
  rot3(b.RightUpLeg, P.hpRX, 0, P.hpRZ);
  rot3(b.RightLeg, P.knR, 0, 0);
  // fists around held items
  if (rig.gripR) { for (const g of rig.grip.R) g.b.quaternion.multiply(g.q); b.RightHand.updateMatrixWorld(true); }
  if (rig.gripL) { for (const g of rig.grip.L) g.b.quaternion.multiply(g.q); b.LeftHand.updateMatrixWorld(true); }
  if (rig.item && (rig.itemType === 'bigflag' || rig.itemType === 'flag' || rig.itemType === 'placard')) {
    rig.item.rotation.z = P.itemZ; rig.item.rotation.x = P.itemX;
  }
  updateFace(rig, P, dt);
}

// Facial animation: mouth from the action layer (talk / chant / shout / pain),
// smile for calm crowd members, eye saccades and blinks.
function updateFace(rig, P, dt) {
  const f = rig.face;
  if (!f) return;
  const k = 1 - Math.exp(-dt * 18);
  f.mouth += (Math.max(0, Math.min(1, P.mouth)) - f.mouth) * k;
  f.smileV += (Math.max(0, Math.min(1, P.smile)) - f.smileV) * (1 - Math.exp(-dt * 4));
  f.moodV += (Math.max(-1, Math.min(1, P.brow || 0)) - f.moodV) * (1 - Math.exp(-dt * 5));
  const mi = f.mesh && f.mesh.morphTargetInfluences;
  if (mi) {
    if (f.open !== undefined) mi[f.open] = f.mouth;
    if (f.smile !== undefined) mi[f.smile] = f.smileV * (1 - f.mouth * 0.6);
    // ARKit brows: anger pulls them down, fear / pain raises the inner brows
    if (f.browDown !== undefined) mi[f.browDown] = Math.max(0, f.moodV) * 0.9;
    if (f.browUp !== undefined) mi[f.browUp] = Math.max(0, -f.moodV) * 0.9 + f.smileV * 0.15;
    // rounded lips on the open phase of chants
    if (f.funnel !== undefined) mi[f.funnel] = f.mouth > 0.2 && f.moodV >= 0 ? (0.5 + 0.5 * Math.sin(rig.phase * 0.7 + f.blinkT)) * f.mouth * 0.35 : 0;
  }
  if (!f.eyes.length && f.blinkM === undefined) return;
  // saccades: quick small gaze jumps; occasional blink (eyeballs squash behind the lids)
  f.sacT -= dt;
  if (f.sacT <= 0) { f.sacT = 0.4 + Math.random() * 1.8; f.sx = (Math.random() - 0.5) * 0.5; f.sy = (Math.random() - 0.5) * 0.22; }
  f.blinkT -= dt;
  if (f.blinkT <= 0) { f.blink = 0.14; f.blinkT = 2 + Math.random() * 4; }
  if (f.blink > 0) f.blink -= dt;
  // blendshape lids where the head has them, otherwise squash the eyeballs behind the lids
  if (f.blinkM !== undefined) mi[f.blinkM] = f.blink > 0 ? Math.sin(Math.min(1, f.blink / 0.14) * Math.PI) : Math.max(0, -f.moodV) * 0.15;
  const b = f.blink > 0 && f.blinkM === undefined ? 0.12 : 1;
  for (const e of f.eyes) {
    e.quaternion.copy(e.userData.restQ);
    rotWorld(e, cy, f.sx + P.hdY * -0.3);
    rotWorld(e, cx, f.sy);
    e.scale.set(1, b, 1);
    e.updateMatrixWorld(true);
  }
}

export function setHumanShadows(rig, on) { for (const m of rig.meshes) m.castShadow = on && !m.userData.detail; }

// ------------------------------------------------------------------ outfits
const SKIN_TONES = [0xf3d2bd, 0xe8b996, 0xd9a07a, 0xc08562, 0xa06a48, 0x84553a, 0x6a412b, 0x4d2e1f, 0xdcb08c, 0xb98a6a];
export function skinMul(hex) {
  const c = new THREE.Color(hex);
  return new THREE.Color(c.r / SKIN_AVG.r, c.g / SKIN_AVG.g, c.b / SKIN_AVG.b);
}
export function randomSkin(rng) { return SKIN_TONES[Math.floor(rng() * SKIN_TONES.length)]; }

// Build a procedural environment map (overcast sky + warm horizon) for reflections.
export function makeEnvMap(renderer) {
  const scene = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: `varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(vec3(0.42,0.38,0.34), vec3(0.62,0.6,0.58), smoothstep(-0.05,0.25,h)); c = mix(c, vec3(0.3,0.32,0.36), smoothstep(0.3,1.0,h)); c += vec3(1.0,0.45,0.15)*smoothstep(0.15,-0.05,abs(h-0.03))*0.25; c = mix(vec3(0.12,0.11,0.1), c, smoothstep(-0.2,0.0,h)); gl_FragColor = vec4(c,1.0);} `,
  });
  scene.add(new THREE.Mesh(geo, mat));
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0.04);
  pm.dispose();
  Humans.envMap = rt.texture;
  return rt.texture;
}

```

## src/impostors.js

```js
// Far-distance crowd: human models baked into static poses, decimated by
// vertex clustering, coloured per garment region and drawn with instancing.
// Used for distant AI agents (LOD 2) and the large background crowd.
import * as THREE from 'three';
import { Humans, CIV_KINDS } from './humans.js';

const canon = (n) => n.replace(/^mixamorig:?/, '');

function textureSampler(tex) {
  if (!tex || !tex.image) return null;
  const img = tex.image;
  const w = Math.min(256, img.width || 256), h = Math.min(256, img.height || 256);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  try { ctx.drawImage(img, 0, 0, w, h); } catch (e) { return null; }
  const data = ctx.getImageData(0, 0, w, h).data;
  return (u, v) => {
    // glTF textures: flipY = false
    const x = Math.min(w - 1, Math.max(0, Math.floor((u - Math.floor(u)) * w)));
    const y = Math.min(h - 1, Math.max(0, Math.floor((v - Math.floor(v)) * h)));
    const i = (y * w + x) * 4;
    return [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
  };
}

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 1e-5) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6; if (h < 0) h += 1; }
  return [h, mx ? d / mx : 0, mx];
}

// parts: 0 skin, 1 top, 2 bottom, 3 shoes, 4 hair, 5 keep baked colour
function classify(kind, meshName, boneName, rgb, y, top) {
  const [h, s, v] = hsv(...rgb);
  if (kind === 'male') {
    if (/Top/.test(meshName)) return 1;
    if (/Bottom/.test(meshName)) return 2;
    if (/Footwear/.test(meshName)) return 3;
    if (/Head/.test(meshName) && y > top - 0.085) return 4;
    return 0;
  }
  // Michelle: by bone + texture colour
  if (/Foot|Toe/.test(boneName)) return 3;
  if (/Head|Neck/.test(boneName)) return y > top - 0.13 || v < 0.22 ? 4 : 0;
  const skin = h > 0.02 && h < 0.11 && s > 0.3 && v < 0.75 && v > 0.15;
  if (skin) return 0;
  if (h > 0.1 && h < 0.18 && s > 0.4) return 2; // yellow trousers
  if (/UpLeg|Leg/.test(boneName)) return 2;
  if (v < 0.3) return 1; // dark top
  return 5;
}

function bake(kind, clipAlias, time) {
  const T = Humans.templates[kind];
  const model = T.scene; // template is posed temporarily, then restored
  const mixer = new THREE.AnimationMixer(model);
  const clip = Humans.clips[kind][clipAlias];
  const action = mixer.clipAction(clip); action.play();
  mixer.setTime(time);
  T.holder.updateMatrixWorld(true);
  const pos = [], col = [], part = [];
  const v = new THREE.Vector3();
  model.traverse((o) => {
    if (!o.isSkinnedMesh || /Teeth|Headwear|Eye|Beard/.test(o.name)) return;
    const g = o.geometry;
    const P = g.attributes.position, UV = g.attributes.uv, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
    const sample = textureSampler(o.material.map);
    const idx = g.index ? g.index.array : null;
    const nTri = idx ? idx.length / 3 : P.count / 3;
    const bones = o.skeleton.bones;
    const vpos = new Float32Array(P.count * 3), vcol = new Float32Array(P.count * 3), vpart = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i);
      o.applyBoneTransform(i, v);
      v.applyMatrix4(o.matrixWorld);
      vpos.set([v.x, v.y, v.z], i * 3);
      const rgb = sample && UV ? sample(UV.getX(i), UV.getY(i)) : [0.5, 0.5, 0.5];
      // dominant bone
      let bi = SI.getX(i), bw = SW.getX(i);
      for (const k of ['getY', 'getZ', 'getW']) if (SW[k](i) > bw) { bw = SW[k](i); bi = SI[k](i); }
      const bn = canon(bones[bi] ? bones[bi].name : '');
      const PA = g.attributes.part;
      if (PA) { const pp = PA.getX(i); vpart[i] = pp === 5 ? 0 : pp === 0 && v.y > T.top - 0.085 ? 4 : pp; }
      else vpart[i] = classify(kind, o.name, bn, rgb, v.y, T.top);
      vcol.set(rgb, i * 3);
    }
    for (let t = 0; t < nTri; t++) for (let k = 0; k < 3; k++) {
      const i = idx ? idx[t * 3 + k] : t * 3 + k;
      pos.push(vpos[i * 3], vpos[i * 3 + 1], vpos[i * 3 + 2]);
      col.push(vcol[i * 3], vcol[i * 3 + 1], vcol[i * 3 + 2]);
      part.push(vpart[i]);
    }
  });
  mixer.stopAllAction(); mixer.uncacheRoot(model);
  model.traverse((o) => { if (o.isBone && o.userData.bindQ) o.quaternion.copy(o.userData.bindQ); });
  T.holder.updateMatrixWorld(true);
  return decimate(pos, col, part, 0.06);
}

// Vertex clustering: snap to a grid, merge, drop collapsed triangles.
function decimate(pos, col, part, cell) {
  const map = new Map();
  const outP = [], outC = [], outPart = [], cnt = [];
  const index = [];
  const key = (x, y, z, p) => `${Math.round(x / cell)},${Math.round(y / cell)},${Math.round(z / cell)},${p}`;
  const vid = [];
  for (let i = 0; i < pos.length / 3; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], p = part[i];
    const k = key(x, y, z, p);
    let id = map.get(k);
    if (id === undefined) { id = outPart.length; map.set(k, id); outP.push(0, 0, 0); outC.push(0, 0, 0); outPart.push(p); cnt.push(0); }
    outP[id * 3] += x; outP[id * 3 + 1] += y; outP[id * 3 + 2] += z;
    outC[id * 3] += col[i * 3]; outC[id * 3 + 1] += col[i * 3 + 1]; outC[id * 3 + 2] += col[i * 3 + 2];
    cnt[id]++;
    vid.push(id);
  }
  for (let i = 0; i < cnt.length; i++) for (let k = 0; k < 3; k++) { outP[i * 3 + k] /= cnt[i]; outC[i * 3 + k] /= cnt[i]; }
  for (let t = 0; t < vid.length; t += 3) {
    const a = vid[t], b = vid[t + 1], c = vid[t + 2];
    if (a !== b && b !== c && a !== c) index.push(a, b, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(outP, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(outC, 3));
  g.setAttribute('part', new THREE.Float32BufferAttribute(outPart, 1));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

function impostorMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float part;
        attribute vec3 iSkin; attribute vec3 iTop; attribute vec3 iBottom; attribute vec3 iShoes; attribute vec3 iHair; attribute float iPat;`)
      .replace('#include <color_vertex>', `#include <color_vertex>
        {
          float l = dot(vColor.rgb, vec3(0.299, 0.587, 0.114));
          vec3 c = vColor.rgb;
          if (part < 0.5) c = vColor.rgb * iSkin;
          else if (part < 1.5) {
            c = iTop * (0.45 + l * 1.4);
            if (iPat > 0.5) { float ax = abs(position.x); c = ax < 0.06 ? vec3(0.66, 0.03, 0.04) : ax < 0.08 ? vec3(0.85) : vec3(0.012, 0.02, 0.07); }
          }
          else if (part < 2.5) c = iBottom * (0.45 + l * 1.4);
          else if (part < 3.5) c = iShoes * (0.5 + l);
          else if (part < 4.5) c = iHair * (0.6 + l);
          vColor.rgb = c;
        }`);
  };
  m.customProgramCacheKey = () => 'impostor-v1';
  return m;
}

export class FarCrowd {
  constructor(scene, capacity = 420) {
    this.scene = scene;
    this.sets = {};
    this.capacity = capacity;
    const mat = impostorMaterial();
    for (const kind of CIV_KINDS) for (const pose of ['idle', 'walk']) {
      const geo = bake(kind, pose === 'idle' ? 'idle' : 'walk', pose === 'idle' ? 0.4 : 0.25);
      const n = capacity;
      const attrs = {};
      for (const a of ['iSkin', 'iTop', 'iBottom', 'iShoes', 'iHair']) { attrs[a] = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); geo.setAttribute(a, attrs[a]); }
      attrs.iPat = new THREE.InstancedBufferAttribute(new Float32Array(n), 1); geo.setAttribute('iPat', attrs.iPat);
      const mesh = new THREE.InstancedMesh(geo, mat, n);
      mesh.count = 0; mesh.castShadow = false; mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      this.sets[`${kind}_${pose}`] = { mesh, attrs, n: 0, tris: geo.index.count / 3 };
    }
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3(); this.p = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
  }

  begin() { for (const s of Object.values(this.sets)) s.n = 0; }

  // o: {x, y, z, heading, scale, bob, colors:{skin,top,bottom,shoes,hair}, pat}
  add(kind, walking, o) {
    const set = this.sets[`${kind}_${walking ? 'walk' : 'idle'}`] || this.sets[`male_${walking ? 'walk' : 'idle'}`];
    if (set.n >= this.capacity) return;
    const i = set.n++;
    this.p.set(o.x, o.y + (o.bob || 0), o.z);
    this.q.setFromAxisAngle(this.up, o.heading);
    this.s.setScalar(o.scale || 1);
    this.m.compose(this.p, this.q, this.s);
    set.mesh.setMatrixAt(i, this.m);
    const C = o.colors;
    set.attrs.iSkin.setXYZ(i, C.skin.r, C.skin.g, C.skin.b);
    set.attrs.iTop.setXYZ(i, C.top.r, C.top.g, C.top.b);
    set.attrs.iBottom.setXYZ(i, C.bottom.r, C.bottom.g, C.bottom.b);
    set.attrs.iShoes.setXYZ(i, C.shoes.r, C.shoes.g, C.shoes.b);
    set.attrs.iHair.setXYZ(i, C.hair.r, C.hair.g, C.hair.b);
    set.attrs.iPat.setX(i, o.pat ? 1 : 0);
  }

  end() {
    for (const s of Object.values(this.sets)) {
      s.mesh.count = s.n;
      s.mesh.instanceMatrix.needsUpdate = true;
      for (const a of Object.values(s.attrs)) a.needsUpdate = true;
    }
  }
}

// Colour bundle for an outfit (linear colours)
export function outfitColors(o) {
  const c = (h) => new THREE.Color(h);
  const female = o.gender === 'f';
  return {
    skin: female ? o.skinMul.clone() : o.skinMul.clone(),
    top: c(o.vest ? 0xb8c818 : o.shellColor ??(o.top === 'hoodie' && female ? 0x141414 : o.topColor ?? 0x222222)),
    bottom: c(o.pants ?? 0x2a3a5a),
    shoes: c(o.shoes ?? 0xeeeeee),
    hair: c(o.headscarf ?? (o.hood ? o.topColor : o.hat === 'cap' || o.hat === 'beanie' ? o.hatColor : o.hair ?? 0x111111)),
  };
}

```

## src/input.js

```js
// Keyboard / mouse input with pointer lock and per-frame "pressed" edges.
// Touch controls (touch.js) feed the same keys/buttons plus an analog stick axis.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.edges = new Set();
    this.buttons = new Set();
    this.dx = 0; this.dy = 0;
    this.locked = false;
    this.wasLocked = false;
    this.onLockLost = null;
    this.axis = { x: 0, y: 0 }; // virtual stick: x right, y down (-1..1)
    this.touch = matchMedia('(hover: none) and (pointer: coarse)').matches || /[?&]touch/.test(location.search);
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code); this.edges.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.buttons.clear(); });
    canvas.addEventListener('mousedown', (e) => { this.buttons.add(e.button); this.edges.add('Mouse' + e.button); });
    addEventListener('mouseup', (e) => this.buttons.delete(e.button));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => {
      if (this.locked) { this.dx += e.movementX; this.dy += e.movementY; }
      else if (this.buttons.size && this.dragLook) { this.dx += e.movementX; this.dy += e.movementY; }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (this.locked) this.wasLocked = true;
      else if (this.wasLocked && this.onLockLost) this.onLockLost();
    });
  }

  // virtual buttons from the touch controls: 'Mouse0', 'Mouse2', key codes
  setButton(code, down) {
    if (code.startsWith('Mouse')) { const b = +code.slice(5); if (down) this.buttons.add(b); else this.buttons.delete(b); }
    else if (down) this.keys.add(code); else this.keys.delete(code);
    if (down) this.edges.add(code);
  }

  look(dx, dy) { this.dx += dx; this.dy += dy; }

  lock() {
    if (this.touch) return; // no pointer lock on touch screens
    try {
      const p = this.canvas.requestPointerLock && this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* pointer lock unavailable (iframe / automation): drag-look still works */ }
  }

  unlock() { this.wasLocked = false; if (document.pointerLockElement) document.exitPointerLock(); }

  down(code) { return this.keys.has(code); }
  pressed(code) { return this.edges.has(code); }
  mouse(b) { return this.buttons.has(b); }
  consumeMouse() { const r = [this.dx, this.dy]; this.dx = 0; this.dy = 0; return r; }
  endFrame() { this.edges.clear(); }
}

```

## src/level2.js

```js
// Level 2 · "Nuit".
// Later the same night. The officer regroups at Rue Oberkampf and pushes back
// down the boulevard towards the CRS staging area, through the looting crews of
// the man they call "le Patron" (the Leader).
//
//  1 Deployment   standard enemies, first sight of the Leader directing his crews
//  2 Escalation   shield-carriers, groups, a petrol bomber, incoming petrol bombs
//  3 The Enforcer mini-boss at the Rue de Malte junction, le Patron's lieutenant
//  4 Second push  ambush from the shop fronts, barricades, mixed groups
//  5 The Leader   le Patron himself at the Rue Jean-Pierre Timbaud junction
//
// Le Patron uses the night as cover: while the city is busy with the protests, his
// crews strip the shops on this stretch for him. He is not part of the protest and
// the people marching are no concern of his. Bosses: see boss.js.
//
// Shares the Missions interface (reset / update / hudInfo / callbacks / scoring)
// so the game loop, HUD and end screen treat both levels the same way.
import * as THREE from 'three';
import { Missions } from './missions.js';
import { EncounterRunner } from './encounters.js';
import { randomOutfit, giveItem, clearItem, prewarmItems } from './characters.js';
import { Boss, ENFORCER, LEADER } from './boss.js';
import { frontOf, orbit, overShoulderAt } from './cinematic.js';
import { mulberry } from './textures.js';

export const L2_PHASES = ['DEPLOYMENT', 'ESCALATION', 'THE ENFORCER', 'SECOND PUSH', 'THE LEADER'];
// the hook for the next level: where le Patron's goods went
const HOOK = 'Control: "His ledger names a depot on the canal. That is tomorrow night."';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const REACH = 5;

const SECTIONS = [
  {
    start: [-1.5, -100], end: [0, -70], hazards: false,
    radio: 'Regroup complete. Looting crews are working the shops between here and Rue de Malte. Clear the boulevard.',
    text: 'Clear the crews off the boulevard',
    encounters: [
      { id: 'shopfront', trigger: { z: -98 }, alert: 'Two of the crew coming at you',
        members: [{ style: 'melee', at: [-12, -80] }, { style: 'melee', at: [-11.5, -77] }] },
      { id: 'barricade', trigger: { after: 'shopfront' }, alert: 'Behind the burning barricade!',
        members: [{ style: 'melee', at: [8, -78] }, { style: 'thrower', at: [9, -72] }] },
      { id: 'kiosk', trigger: { after: 'barricade' }, alert: 'Three more by the kiosk',
        members: [{ style: 'melee', at: [-10, -62] }, { style: 'melee', at: [-8, -60] }, { style: 'thrower', at: [-12, -57] }] },
    ],
    leader: { after: 'shopfront', at: [-6.5, -50] }, // clear of the over-the-shoulder camera
  },
  {
    start: [0, -72], end: [0, -32], hazards: true,
    radio: 'Some carry improvised shields. Bait the bash, strike while it is down, or get round the side.',
    text: 'Push through towards Rue de Malte',
    encounters: [
      { id: 'shieldIntro', trigger: { z: -68 }, alert: 'Shield ahead — watch for the amber ring',
        members: [{ style: 'shield', at: [1, -52] }, { style: 'thrower', at: [-4, -47] }] },
      { id: 'bomber', trigger: { after: 'shieldIntro' }, bomber: [-7, -44] },
      { id: 'sidestreet', trigger: { after: 'shieldIntro' }, alert: 'Coming out of the side street — right!', events: [['molotovAt', [4, -50]]],
        members: [{ style: 'melee', at: [13, -46] }, { style: 'melee', at: [13, -42] }, { style: 'melee', at: [12.5, -39] }] },
      { id: 'malteGroup', trigger: { z: -50 }, alert: 'Group at Place de Malte!', events: [['mortar']],
        members: [{ style: 'melee', at: [-6, -26] }, { style: 'shield', at: [2, -28] }, { style: 'thrower', at: [7, -24] }, { style: 'melee', at: [-2, -24] }] },
      { id: 'malteReinforce', trigger: { after: 'malteGroup' }, alert: 'Reinforcements from Rue de Malte — both sides!', events: [['mortar']],
        members: [{ style: 'shield', at: [-20, -20] }, { style: 'melee', at: [-22, -18] }, { style: 'melee', at: [20, -21] }, { style: 'thrower', at: [22, -19] }] },
    ],
  },
  {
    start: [0, -34], end: [0, -20], hazards: false,
    boss: 'enforcer', arena: [0, -16, 15], spawn: [0, -8],
    radio: "Big one with the steel shield: le Patron's lieutenant. The crews call him the Enforcer. Make him commit.",
    text: 'Stop the Enforcer',
    after: 'Lieutenant in custody. Le Patron is pulling his crews back to Timbaud.',
    encounters: [],
  },
  {
    start: [0, -18], end: [0, 55], hazards: true,
    radio: 'Junction secure. Keep pushing towards Rue Jean-Pierre Timbaud. Expect them in the shop fronts.',
    text: 'Advance towards Rue Jean-Pierre Timbaud',
    encounters: [
      { id: 'ambush', trigger: { z: 4 }, alert: 'Ambush from the shop fronts!',
        members: [{ style: 'melee', at: [-13, 14] }, { style: 'melee', at: [-12.5, 18] }, { style: 'shield', at: [12.5, 16] }] },
      { id: 'barricade22', trigger: { z: 14 }, alert: 'Throwers behind the barricade',
        members: [{ style: 'thrower', at: [-6, 30] }, { style: 'thrower', at: [-2.5, 32] }, { style: 'melee', at: [3, 29] }] },
      { id: 'shopRun', trigger: { after: 'barricade22' }, alert: 'They are breaking out of the shop — right!',
        members: [{ style: 'melee', at: [12.5, 30] }, { style: 'melee', at: [12.5, 33] }, { style: 'melee', at: [12, 36] }] },
      { id: 'lastPush', trigger: { z: 32 }, alert: 'They are holding the street — shields up front', events: [['carFire', [7.7, 40]], ['mortar']],
        members: [{ style: 'shield', at: [-2, 50] }, { style: 'shield', at: [3, 52] }, { style: 'thrower', at: [-6, 57] }, { style: 'melee', at: [6, 48] }] },
      { id: 'reserve', trigger: { after: 'lastPush' }, alert: 'Their reserve, from Rue Jean-Pierre Timbaud!',
        members: [{ style: 'shield', at: [-18, 68] }, { style: 'thrower', at: [18, 70] }, { style: 'thrower', at: [-20, 72] }, { style: 'melee', at: [20, 66] }] },
    ],
  },
  {
    start: [0, 53], end: [0, 70], hazards: false,
    boss: 'leader', arena: [0, 72, 15], spawn: [0, 80],
    radio: 'That is le Patron. His crews have been stripping this boulevard for him all night.',
    text: 'Stop le Patron',
    encounters: [],
  },
];

// The Leader's look is fixed (art-directed in later increments); complexion and
// build come from the shared generator, clothing is set here.
function leaderOutfit() {
  let o = null;
  for (let s = 1871; !o || o.gender !== 'm' || o.base !== 'male'; s++) o = randomOutfit(mulberry(s));
  Object.assign(o, {
    top: 'jacket', smart: false, topColor: 0x2f3b33, topBase: 0x2f3b33, longSleeve: true,
    garment: 'puffer', shellColor: 0x2f3b33, shellPattern: 0, vest: false, keepTop: false,
    scarf: 'keffiyeh', mask: 'none', hat: 'none', hood: false, backpack: false, beard: true,
    pants: 0x1b1b20, shoes: 0x151515, height: 1.07, build: 1.1,
  });
  o.body = { ...o.body, girth: 1.12, shoulders: 1.08 };
  return o;
}

// The Enforcer: heavy-set, all in black, balaclava; fixed look, complexion from the generator.
function enforcerOutfit() {
  let o = null;
  for (let s = 4242; !o || o.gender !== 'm' || o.base === 'rb_male_a'; s++) o = randomOutfit(mulberry(s));
  Object.assign(o, {
    top: 'hoodie', smart: false, topColor: 0x141416, topBase: 0x000000, longSleeve: true,
    garment: 'puffer', shellColor: 0x1b1d22, shellPattern: 0, vest: false, keepTop: false,
    scarf: 'none', mask: 'balaclava', hat: 'none', hood: false, backpack: false,
    pants: 0x141416, shoes: 0x151515, height: 1.12, build: 1.14, keepBottom: false, keepShoes: false,
  });
  o.body = { ...o.body, girth: 1.16, shoulders: 1.1, chest: 1.05 };
  return o;
}

export class Level2 extends Missions {
  constructor(game) {
    super(game);
    this.enc = new EncounterRunner(game, 1);
    game.crowd.addReserveCrews(); // the Leader's extra crews along this route
    // one Leader per game, kept across level switches
    this.leader = game.crowd.leader || (game.crowd.leader = game.crowd.spawnSpecial(leaderOutfit()));
    this.enforcer = game.crowd.enforcer || (game.crowd.enforcer = game.crowd.spawnSpecial(enforcerOutfit()));
    // compile the new props and the (hidden) bosses now rather than on first sight
    const ahead = game.camera.position.clone().add(game.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(4));
    for (const b of [this.leader, this.enforcer]) { b.rig.root.visible = true; b.rig.root.position.copy(ahead); }
    prewarmItems(game.renderer, game.scene, game.camera, [['impshield', 'board'], ['impshield', 'sign'], ['impshield', 'lid'], ['impshield', 'heavy'], ['impshield', 'door'], ['flare'], ['axe']]);
    for (const b of [this.leader, this.enforcer]) b.rig.root.visible = false;
    this.reset();
  }

  reset() {
    super.reset();
    this.completed = SECTIONS.map(() => false);
    this.phaseTimes = SECTIONS.map(() => 0);
    this.section = 0;
    this.stats.blocked = 0; this.stats.dodges = 0; this.bossTimes = {};
    this.cp = null;
    this.leaderSeen = false;
    if (this.enc) this.enc.reset();
    if (this.boss) { this.boss.stop(); this.boss = null; }
    this.game.crowd.clearArena();
    if (this.leader) this.game.crowd.retire(this.leader);
    if (this.enforcer) this.game.crowd.retire(this.enforcer);
  }

  // ------------------------------------------------------------- sections
  _startSection(i) {
    const g = this.game, sec = SECTIONS[i];
    this.section = i; this.stage = 'route'; this.stageT = 0;
    this.enc.load(sec.encounters);
    g.events.setHazards(sec.hazards);
    if (sec.radio) this.radio(sec.radio);
    if (this.boss) { this.boss.stop(); this.boss = null; }
    if (sec.boss) {
      const npc = sec.boss === 'enforcer' ? this.enforcer : this.leader;
      g.crowd.retire(npc);
      this.boss = new Boss(g, npc, sec.boss === 'enforcer' ? ENFORCER : LEADER);
      const at = V(sec.spawn[0], 0, sec.spawn[1]);
      this.boss.start(at, Math.atan2(g.player.pos.x - at.x, g.player.pos.z - at.z), { x: sec.arena[0], z: sec.arena[1], r: sec.arena[2] });
      this.bossStart = this.t;
      this._bossIntro(sec.boss, npc);
    }
    // checkpoint: retrying after a failure restarts this section with the score so far
    this.cp = { section: i, score: this.score, stats: { ...this.stats }, t: this.t };
  }

  // Restart at a section: used by RETRY SECTION and by the developer shortcuts.
  resume(cp) {
    const g = this.game;
    for (let k = 0; k < cp.section; k++) this.completed[k] = true;
    this.score = cp.score || 0; this.t = cp.t || 0;
    if (cp.stats) Object.assign(this.stats, cp.stats);
    const [x, z] = SECTIONS[cp.section].start;
    g.player.pos.set(x, 0, z); g.player.heading = 0;
    g.cameraRig.reset(g.player);
    this.leaderSeen = cp.section > 0;
    this._startSection(cp.section);
  }
  jumpTo(i) { this.resume({ section: Math.max(0, Math.min(SECTIONS.length - 1, i | 0)) }); }

  update(dt) {
    const g = this.game;
    this.t += dt; this.stageT += dt;
    switch (this.stage) {
      case 'intro':
        if (this.stageT > 1.2) { this._startSection(0); g.hud.titleCard('NUIT', 'Boulevard de la République · 01h12'); }
        break;
      case 'route': {
        const sec = SECTIONS[this.section];
        if (sec.boss) { this._bossUpdate(sec); break; }
        this.enc.update(dt);
        if (sec.leader && !this.leaderSeen && this.enc.state[sec.leader.after] && this.enc.state[sec.leader.after].status === 'resolved') this._showLeader(sec.leader.at);
        const end = V(sec.end[0], 0, sec.end[1]);
        const fighting = this.enc.active();
        const near = fighting.length ? g.crowd.nearest(g.player.pos, (n) => fighting.includes(n)) : null;
        this.markerPos = near ? near.pos : this.enc.cleared() ? end : this._nextTriggerPos(sec, end);
        if (this.enc.cleared() && Math.hypot(g.player.pos.x - end.x, g.player.pos.z - end.z) < REACH) {
          this._phaseDone(this.section, sec.placeholder ? 0 : 300, sec.placeholder ? `${L2_PHASES[this.section]} — placeholder` : `${L2_PHASES[this.section]} cleared`);
          if (this.section + 1 >= SECTIONS.length) this.complete();
          else this._startSection(this.section + 1);
        }
        break;
      }
    }
    const a = g.crowd.arrestable(g.player.pos);
    if (a) {
      g.hud.prompt('E', 'Arrest suspect');
      if (g.input.pressed('KeyE')) { g.crowd.arrest(a); this.onArrest(a); }
    }
    this._updateMarker(dt);
  }

  // Boss sections end with the arrest: the defeated boss kneels until the officer cuffs him.
  _bossUpdate(sec) {
    const g = this.game, b = this.boss;
    this.markerPos = null;
    if (!b || b.s !== 'defeated') return;
    const n = b.n;
    this.markerPos = n.pos;
    if (Math.hypot(g.player.pos.x - n.pos.x, g.player.pos.z - n.pos.z) < 2.6) {
      g.hud.prompt('E', sec.boss === 'enforcer' ? 'Arrest the Enforcer' : 'Arrest le Patron');
      if (g.input.pressed('KeyE')) {
        b.stop(); this.boss = null;
        g.crowd.arrest(n); n.untargetable = true;
        this.onArrest(n);
        this.bossTimes[sec.boss] = this.t - this.bossStart;
        this.addScore(sec.boss === 'enforcer' ? 800 : 1500, sec.boss === 'enforcer' ? 'Enforcer arrested' : 'Le Patron arrested');
        this._phaseDone(this.section, 0, sec.boss === 'enforcer' ? 'The Enforcer is in custody' : 'Le Patron is in custody');
        if (sec.after) this.radio(sec.after);
        if (this.section + 1 >= SECTIONS.length) this._victory(n);
        else this._startSection(this.section + 1);
      }
    }
  }

  bossInfo() { return this.boss ? this.boss.info() : null; }

  // ------------------------------------------------------------- presentation
  _bossIntro(id, n) {
    const g = this.game, p = g.player;
    if (id === 'enforcer') {
      g.playCinematic({
        id: 'enforcer', title: 'THE ENFORCER', sub: "le Patron's lieutenant", titleAt: [0.4, 3.0], sting: 'intro',
        shots: [{ dur: 1.7, a: frontOf(n, 8.0, 0.8, 2.6, 46), b: frontOf(n, 6.2, 1.0, 2.0, 42) }, { dur: 1.6, a: frontOf(n, 6.2, 1.0, 2.0, 42), b: 'rig' }],
      });
    } else {
      const base = n.heading;
      g.playCinematic({
        id: 'leader', title: 'LE PATRON', sub: 'runs the looting crews', titleAt: [0.5, 3.6], sting: 'intro',
        line: LEADER.barks[0], lineAt: [1.0, 3.8],
        // from his axe side, high enough to clear the street furniture
        shots: [{ dur: 2.4, a: orbit(() => n.pos, 5.8, 1.9, base - 0.95, 44, 1.45), b: orbit(() => n.pos, 4.9, 1.6, base - 0.4, 40, 1.45) },
          { dur: 1.8, a: orbit(() => n.pos, 4.9, 1.6, base - 0.4, 40, 1.45), b: 'rig' }],
      });
    }
  }

  // Le Patron in custody: the crews scatter, a short closing shot, then the results.
  _victory(n) {
    const g = this.game, p = g.player;
    this.stage = 'victory';
    g.events.setHazards(false);
    for (const m of g.crowd.npcs) if (m.temperament === 'looter') { m.fleeFrom = n.pos.clone(); g.crowd.setState(m, 'flee', 8); }
    const mid = () => V((p.pos.x + n.pos.x) / 2, 0, (p.pos.z + n.pos.z) / 2);
    const a0 = Math.atan2(p.pos.x - n.pos.x, p.pos.z - n.pos.z) + 1.2;
    const end = () => { this.radio(HOOK); this.complete(); };
    g.playCinematic({
      id: 'victory', title: 'LE PATRON IN CUSTODY', sub: 'Boulevard de la République · 01h58', titleAt: [0.6, 5.0], sting: 'victory',
      line: 'The crews scatter into the side streets.', lineAt: [1.4, 5.0],
      shots: [{ dur: 5.6, a: orbit(mid, 5.0, 1.7, a0, 46, 1.0), b: orbit(mid, 6.0, 2.8, a0 + 1.5, 50, 1.0) }],
      onDone: end,
    });
  }

  // where the next encounter will start (keeps the marker leading the officer on)

  // where the next encounter will start (keeps the marker leading the officer on)
  _nextTriggerPos(sec, end) {
    const p = this.game.player.pos;
    for (const e of sec.encounters) {
      if (this.enc.state[e.id].status !== 'waiting' || !e.trigger || e.trigger.z === undefined) continue;
      return V(p.x * 0.5, 0, e.trigger.z + 6);
    }
    return end;
  }

  // ------------------------------------------------------------- the Leader, first sight
  // He stands on the barricade directing his crews, sees the officer, and leaves
  // into Rue de Malte. Untouchable and never part of any selection pool.
  _showLeader(at) {
    const g = this.game, n = this.leader;
    this.leaderSeen = true;
    n.pos.set(at[0], 0, at[1]); n.anchor.copy(n.pos); n.vel.set(0, 0, 0);
    n.heading = Math.atan2(g.player.pos.x - n.pos.x, g.player.pos.z - n.pos.z);
    n.rig.root.visible = true;
    n.role = 'shout'; n.lookT = 99; n.untargetable = true;
    giveItem(n.rig, 'flare'); // a lit road flare held up: easy to pick out at night
    // a short look at him from where the officer stands (the encounters wait meanwhile)
    const p = g.player;
    g.playCinematic({
      id: 'glimpse', title: 'LE PATRON', sub: 'runs the looting crews', titleAt: [0.7, 2.5],
      shots: [{ dur: 0.8, a: 'rig', b: overShoulderAt(p, n, 22) }, { dur: 1.5, a: overShoulderAt(p, n, 22), b: overShoulderAt(p, n, 20) }, { dur: 0.6, a: overShoulderAt(p, n, 20), b: 'rig' }],
    });
    g.crowd.setState(n, 'act', 999);
    const route = [V(-10, 0, -30), V(-16, 0, -21), V(-45, 0, -20)]; // off into Rue de Malte
    const sc = { t: 0, leg: -1 };
    sc.tick = (m, player, dt) => {
      sc.t += dt; m.stimuli.length = 0; m.focus.copy(player.pos);
      if (m.rig.flareTip && m.lod < 2 && Math.random() < 0.8) {
        const tp = m.rig.flareTip.getWorldPosition(new THREE.Vector3());
        g.effects.fire.spawn({ pos: tp, vel: V((Math.random() - 0.5) * 0.6, 0.9 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6), size: 0.1 + Math.random() * 0.08, life: 0.35, alpha: 1, color: new THREE.Color(1, 0.35, 0.25), color2: new THREE.Color(0.8, 0.05, 0.02), drag: 1.5 });
        if (Math.random() < 0.15) g.effects.smoke.spawn({ pos: tp.clone().setY(tp.y + 0.2), vel: V(0, 0.8, 0), size: 0.5, grow: 3, life: 2.5, alpha: 0.35, color: new THREE.Color(0.75, 0.32, 0.3), drag: 0.6, buoy: 0.2 });
      }
      if (sc.leg < 0 && (sc.t > 7 || m.distToPlayer < 24)) { sc.leg = 0; m.role = 'watch'; }
      if (sc.leg >= 0 && sc.leg < route.length && Math.hypot(m.pos.x - route[sc.leg].x, m.pos.z - route[sc.leg].z) < 1.5) sc.leg++;
      if (sc.leg >= route.length || (sc.leg >= 0 && m.distToPlayer > 70)) { clearItem(m.rig); g.crowd.retire(m); }
    };
    sc.move = () => (sc.leg >= 0 && sc.leg < route.length ? { speed: 5.4, dest: route[sc.leg] } : { speed: 0 });
    n.script = sc;
    this.radio('Control: the man with the flare runs those crews. They call him "le Patron". Do not chase him.');
  }

  // ------------------------------------------------------------- end
  complete() {
    if (this.ended) return;
    this.ended = true;
    this.stage = 'done'; // the world keeps updating until the results screen appears
    this.markerPos = null;
    this.game.events.setHazards(false);
    if (this.stats.peaceful === 0) this.addScore(500, 'Proportionate force');
    this.game.endGame(true);
  }

  hudInfo() {
    const i = Math.min(this.section, SECTIONS.length - 1), sec = SECTIONS[i];
    const info = { index: i, phaseName: L2_PHASES[i], text: '', status: 'active', chip: 'ACTIVE', detail: '', bar: null, completed: this.completed };
    if (this.stage === 'intro') return Object.assign(info, { text: 'Regroup at Rue Oberkampf', chip: 'STANDBY', status: 'calm', detail: 'Radio traffic incoming…' });
    const p = this.game.player.pos;
    const d = Math.round(Math.hypot(p.x - sec.end[0], p.z - sec.end[1]));
    const fighting = this.enc.active().length;
    const { total, down } = this.enc.counts();
    if (sec.boss) {
      const bi = this.boss ? this.boss.info() : null;
      if (bi && bi.state === 'defeated') return Object.assign(info, { text: sec.boss === 'enforcer' ? 'Arrest the Enforcer' : 'Arrest le Patron', status: 'active', chip: 'DOWN', detail: 'Press E beside him' });
      return Object.assign(info, { text: sec.text, status: 'danger', chip: 'BOSS', detail: 'Strike when his guard drops, or from the side' });
    }
    const b = this.bomber && this.bomber.script;
    if (b && b.active && (b.phase === 'retrieve' || b.phase === 'light' || b.phase === 'wind')) return Object.assign(info, { text: 'Stop the petrol bomber!', status: 'danger', chip: 'DANGER', detail: 'Strike him before he throws' });
    if (fighting) return Object.assign(info, { text: sec.text, status: 'danger', chip: 'ENGAGED', detail: `Crew ${down} / ${total} · ${fighting} still fighting` });
    return Object.assign(info, { text: sec.text, detail: sec.placeholder ? `${d} m · placeholder` : total ? `Crew ${down} / ${total} · ${d} m` : `${d} m` });
  }

  endInfo(win, reason) {
    const s = this.stats;
    const t = `${Math.floor(this.t / 60)}:${String(Math.floor(this.t % 60)).padStart(2, '0')}`;
    const fmt = (v) => (v === undefined ? '—' : `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}`);
    return {
      title: win ? 'LEVEL 2 COMPLETE' : 'MISSION FAILED',
      sub: win ? 'Le Patron and his lieutenant in custody · the route to the staging area is open' : reason || '',
      rows: [
        ['Sections cleared', `${this.completed.filter(Boolean).length} / ${SECTIONS.length}`],
        ['Crew members neutralised', s.neutralized],
        ['Arrests', s.arrests],
        ['Petrol bombs prevented', `${s.bombsStopped} / ${s.bombsStopped + s.bombsThrown}`],
        ['The Enforcer', fmt(this.bossTimes.enforcer)],
        ['Le Patron', fmt(this.bossTimes.leader)],
        ['Strikes blocked by a guard / dodges', `${s.blocked} / ${s.dodges}`],
        ['Peaceful people struck', s.peaceful],
        ['Mission time', t],
      ],
      hook: win ? HOOK : '',
      rank: win ? 'RATING · ' + (this.score >= 9000 && s.peaceful === 0 ? 'COMMENDATION' : this.score >= 7000 ? 'PROFESSIONAL' : this.score >= 5000 ? 'ADEQUATE' : 'UNDER REVIEW') : this.cp ? 'Retry from the start of this section, or restart' : 'Restart to try again',
    };
  }
}

```

## src/levels.js

```js
// Levels: per-level configuration, lighting presets and progression.
//  Level 1 · the existing mission (Missions), late afternoon.
//  Level 2 · the same boulevard later that night (Level2), pushing back down
//            the boulevard from Rue Oberkampf. Increment 1 lays out its route only.
// Lighting presets only change colours, intensities, fog and uniforms; they
// never add or remove lights, so switching does not recompile any shaders.
import { Missions, PHASES } from './missions.js';
import { Level2, L2_PHASES } from './level2.js';

export const LIGHTING = {
  // the original look, values unchanged
  dusk: {
    hemiSky: 0xc4c6ca, hemiGround: 0x5a5044, hemiI: 1.7,
    sunColor: 0xffd6a8, sunI: 2.4, sunOffset: [-30, 70, -38],
    exposure: 1.15, baseFog: 0.0088, fogA: 0x7f786f, fogB: 0x6e6258,
    sky: { horizon: [0.62, 0.56, 0.50], low: [0.50, 0.47, 0.45], top: [0.24, 0.27, 0.31], glow: [0.9, 0.55, 0.28], glowK: 0.45, haze: [0.38, 0.33, 0.30] },
    lamp: 0.4, beaconOn: 14, beaconOff: 2, fireLight: 1, puddleEnv: 0.32, smokeTint: [1, 1, 1],
  },
  // night: cool moonlight fill, sodium lamps, fire and beacons do the lighting.
  // Kept bright enough that silhouettes read against the street (gameplay first).
  night: {
    hemiSky: 0x4a5a80, hemiGround: 0x2a2018, hemiI: 1.05,
    sunColor: 0x9db4e8, sunI: 0.75, sunOffset: [26, 70, -30],
    exposure: 1.3, baseFog: 0.0105, fogA: 0x23262e, fogB: 0x3a2c22,
    sky: { horizon: [0.20, 0.13, 0.09], low: [0.08, 0.08, 0.10], top: [0.02, 0.03, 0.05], glow: [0.75, 0.32, 0.12], glowK: 0.35, haze: [0.16, 0.10, 0.07] },
    lamp: 3.2, beaconOn: 24, beaconOff: 3, fireLight: 1.7, puddleEnv: 0.5, smokeTint: [0.42, 0.39, 0.38],
  },
};

export const LEVELS = {
  1: {
    id: 1, name: 'BOULEVARD DE LA RÉPUBLIQUE', tag: 'Boulevard de la République · 18h47',
    Missions, phases: PHASES, lighting: 'dusk',
    start: { x: 0.5, z: 141, heading: Math.PI },
  },
  2: {
    id: 2, name: 'NUIT', tag: 'Boulevard de la République · 01h12',
    Missions: Level2, phases: L2_PHASES, lighting: 'night', hazardDir: 1,
    policeOff: ['injured', 'guard'], // the cut-off officers were extracted at the end of Level 1
    reserveCrews: true,              // extra looting crews along the Level 2 route
    music: true,                     // synthesised score (music.js); Level 1 keeps its original soundscape
    start: { x: -1.5, z: -100, heading: 0 },
  },
};

// Unlocks persist on this device. Storage can be unavailable (private windows,
// blocked site data), so every access is guarded and failure means "locked".
const KEY = 'parisBurning.progress.v1';
export const Progress = {
  _read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } },
  _write(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* not persisted */ } },
  unlocked(id) { return id === 1 || !!(this._read().unlocked || {})[id]; },
  unlock(id) { if (!LEVELS[id]) return; const p = this._read(); p.unlocked = { ...(p.unlocked || {}), [id]: true }; this._write(p); },
  reset() { this._write({}); },
};

```

## src/main.js

```js
// Paris Burning — bootstrap, game loop and state machine.
import { SEED } from './seed.js'; // first: seeds Math.random when ?seed=N is given
import * as THREE from 'three';
import { World } from './world.js';
import { Effects } from './effects.js';
import { Audio } from './audio.js';
import { Crowd } from './crowd.js';
import { Player } from './player.js';
import { CameraRig } from './camera.js';
import { LEVELS, LIGHTING, Progress } from './levels.js';
import { HUD } from './hud.js';
import { Input } from './input.js';
import { loadHumans, makeEnvMap, Humans } from './humans.js';
import { IncidentScheduler } from './events.js';
import { Post } from './post.js';
import { Cinematic } from './cinematic.js';
import { TouchControls } from './touch.js';

const $ = (id) => document.getElementById(id);
// controls during a cinematic: nothing pressed
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
    this.crowd = new Crowd(this, 150);
    this.events = new IncidentScheduler(this);
    // wet, reflective street surfaces
    for (const k of ['road', 'roadPlain', 'cobble']) { const m = this.world.materials[k]; m.envMap = Humans.envMap; m.envMapIntensity = 0.32; m.roughness = 0.66; m.metalness = 0.05; }
    this.world.addPuddles(Humans.envMap);
    // level: Level 1 by default; ?dev&level=N jumps straight to a level for testing
    const q = new URLSearchParams(location.search);
    const devLevel = q.has('dev') && LEVELS[q.get('level')] ? +q.get('level') : 1;
    this.setLevel(devLevel);
    this.devStage = q.has('dev') && q.has('stage') ? +q.get('stage') : null;
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
      if (a === 'play') this.play();
      else if (a === 'controls') { this.prevScreen = this.state === 'paused' ? 'pause-screen' : 'menu'; this._screen('controls-screen'); }
      else if (a === 'audio') { this.prevScreen = this.state === 'paused' ? 'pause-screen' : 'menu'; this._screen('audio-screen'); }
      else if (a === 'pause') { if (this.state === 'playing') this.pause(); }
      else if (a === 'mute') this.audio.toggleMute();
      else if (a === 'back') this._screen(this.prevScreen || 'menu');
      else if (a === 'restart') this.restart();
      else if (a === 'resume') this.resume();
      else if (a === 'retry') { const cp = this.missions.cp; this.restart(); if (cp && this.missions.resume) this.missions.resume(cp); }
      else if (a === 'continue' || a === 'level') this.startLevel(a === 'continue' ? this.level.id + 1 : +b.dataset.level);
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
    const wasOn = this.crowd.reserveOn;
    this.crowd.setReserve(!!def.reserveCrews);
    if (this.crowd.reserveOn !== !!wasOn) this.crowd.reset(); // bring the reserve crews in or out
    this.crowd.setPoliceOff(def.policeOff || []);
    this.events.hazardDir = def.hazardDir || -1;
    this.player.reset();
    this.cameraRig.reset(this.player);
    this.applyLighting(def.lighting);
  }

  // Play a short camera sequence (see cinematic.js). Developer runs can skip them all.
  playCinematic(opts) {
    if (this.cinematic) this.cinematic.finish(true, true);
    if (this.skipCinematics) { if (opts.onDone) opts.onDone(true); return null; }
    this.cinematic = new Cinematic(this, opts).begin();
    return this.cinematic;
  }

  // Start (or restart) a level from a menu or the end screen. Locked levels are refused.
  startLevel(id) {
    if (!LEVELS[id] || !Progress.unlocked(id)) return;
    this.setLevel(id);
    if (this.state === 'menu') this.play(); else this.restart();
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

  _syncLevelMenu() {
    document.querySelectorAll('[data-action="level"]').forEach((b) => b.classList.toggle('hidden', !Progress.unlocked(+b.dataset.level)));
  }

  _screen(id) {
    for (const s of ['menu', 'controls-screen', 'audio-screen', 'pause-screen', 'end-screen']) $(s).classList.toggle('hidden', s !== id);
  }

  play() {
    if (this.state === 'paused') return this.resume();
    if (this.state === 'ended') return this.restart();
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
    this._screen('pause-screen');
    this.audio.setPaused(true);
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
    this.missions.reset();
    this.effects.reset();
    this.events.reset();
    this.cameraRig.reset(this.player);
    this.cameraRig.intro(2.4);
    this.hud.clearAlerts();
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
    if (win && LEVELS[this.level.id + 1]) { Progress.unlock(this.level.id + 1); this._syncLevelMenu(); }
  }

  _showEnd() {
    const { win, reason } = this.pendingEnd;
    this.pendingEnd = null;
    this.state = 'ended';
    this.hud.showEnd(win, reason, this.missions);
    $('app').classList.add('ended'); // results over a clean picture: the gameplay HUD fades out
    const next = LEVELS[this.level.id + 1];
    $('btn-continue').classList.toggle('hidden', !(win && next && Progress.unlocked(next.id)));
    $('btn-retry').classList.toggle('hidden', !(!win && this.missions.cp)); // section checkpoint (Level 2)
    this._screen('end-screen');
    this.input.unlock();
    this.audio.ui(win ? 'good' : 'bad');
  }

  // --- callbacks from systems
  onThreatNeutralized(n) { this.missions.onThreatNeutralized(n); }
  onPeacefulStruck(n) { this.missions.onPeacefulStruck(n); }
  onPoliceLineHit(d) { this.missions.onPoliceLineHit(d); }
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
    else if (ms < 15 && c && c.maxSkinned < 20) c.maxSkinned += 2;
    else if (ms < 13 && pr < this.maxPR) pr = Math.min(this.maxPR, pr + 0.1);
    if (pr !== this.pr) {
      this.pr = pr;
      this.renderer.setPixelRatio(pr);
      if (this.post) { this.post.composer.setPixelRatio(pr); this.post.setSize(innerWidth, innerHeight); }
    }
  }

  render() {
    if (this.post) this.post.render(1 / 60, this.time, this.effects ? Math.min(1, this.effects.smokiness) : 0, this.hud ? this.hud.flash : 0);
    else this.renderer.render(this.scene, this.camera);
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
      a.music.setState(m.stage === 'victory' || (m.ended && this.pendingEnd && this.pendingEnd.win) ? 'victory'
        : b && b.active ? (b.phaseIdx >= 2 ? 'boss3' : 'boss') : fighting ? 'combat' : 'calm');
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
    if (input.down('ArrowLeft')) mx -= 900 * rawDt;
    if (input.down('ArrowRight')) mx += 900 * rawDt;
    if (input.down('ArrowUp')) my -= 500 * rawDt;
    if (input.down('ArrowDown')) my += 500 * rawDt;
    const cine = this.cinematic;
    if (!cine) this.cameraRig.rotate(mx, my);
    if (cine) {
      if (input.pressed('Space') || input.pressed('Enter') || input.pressed('Mouse0')) cine.skip();
      this.player.invuln = Math.max(this.player.invuln, 0.1); // nobody lands a hit during a cinematic
    }

    this.player.update(dt, this.cinematic ? NULL_INPUT : input, this.cameraRig.yaw);
    this.crowd.update(dt, this.player);
    this.missions.update(dt);
    this.events.update(dt);
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

```

## src/missions.js

```js
// Mission flow: three event-driven phases, scoring, objectives, hazards.
//  Phase 1 · Street entry   — aggressors attack the CRS line in front of the crowd
//  Phase 2 · Escalation     — crowd surge with aggressors + a petrol-bomb suspect
//  Phase 3 · Main incident  — reach the officers cut off at Rue Oberkampf through
//                             hazards, repel the final assault, extract them.
// Phases advance on gameplay events (threats resolved, objective reached), never
// on a fixed timer; the world keeps running in between.
import * as THREE from 'three';
import { giveItem, clearItem } from './characters.js';
import { beamTexture } from './textures.js';

const OBJECTIVE_POS = new THREE.Vector3(-3, 0, -112);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const PHASES = ['STREET ENTRY', 'ESCALATION', 'MAIN INCIDENT'];

export class Missions {
  constructor(game) {
    this.game = game;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 40, 16, 1, true), new THREE.MeshBasicMaterial({ map: beamTexture(), color: 0xffb02e, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, opacity: 0.6 }));
    beam.position.y = 20;
    const chevron = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0xffb02e, fog: false }));
    chevron.rotation.x = Math.PI;
    this.marker = new THREE.Group();
    this.marker.add(beam, chevron);
    this.chevron = chevron;
    this.marker.visible = false;
    game.scene.add(this.marker);
    this.reset();
  }

  // called when the game switches to another level's mission script
  dispose() { this.game.scene.remove(this.marker); }

  reset() {
    this.stage = 'intro';
    this.phase = 0;
    this.t = 0;
    this.stageT = 0;
    this.score = 0;
    this.stats = { neutralized: 0, arrests: 0, peaceful: 0, bombsStopped: 0, bombsThrown: 0, damage: 0 };
    this.line = 100;
    this.officers = 100;
    this.hostiles1 = [];
    this.hostiles2 = [];
    this.finalWave = [];
    this.bomber = null;
    this.bomber2 = null;
    this.bomberDone = false;
    this.timer = 0;
    this.completed = [false, false, false];
    this.ambientT = 35;
    this.ambient = null;
    this.markerPos = null;
    this.warning = false;
    this.ended = false;
    this.finalStarted = false;
    this.ambushed = false;
    this.ambush = [];
    this.extractReady = false;
    this.phaseTimes = [0, 0, 0];
  }

  addScore(v, reason) {
    this.score = Math.max(0, this.score + v);
    this.game.hud.scorePop(v, reason);
  }

  // ------------------------------------------------------------- callbacks
  onThreatNeutralized(n) {
    this.stats.neutralized++;
    this.addScore(100, 'Threat neutralised');
    this.game.hud.alert('Aggressor down — press E nearby to arrest', 'good', 2.5, 'down');
  }
  onPeacefulStruck(n) {
    this.stats.peaceful++;
    this.addScore(-150, 'Excessive force');
    this.game.hud.alert('EXCESSIVE FORCE — that demonstrator was not a threat', 'bad', 3);
    this.game.audio.ui('bad');
  }
  onPoliceLineHit(dmg, cop) {
    if (cop && cop.role !== 'line') {
      if (this.stage !== 'final') return;
      this.officers = Math.max(0, this.officers - dmg * 1.6);
      if (this.officers <= 0) this.fail('The cut-off officers were overrun.');
      return;
    }
    if (this.stage !== 'p1' && this.stage !== 'p2') return;
    this.line = Math.max(0, this.line - dmg);
    if (this.line <= 0 && !this.ended) this.fail('The police line was overrun.');
  }
  onArrest(n) {
    this.stats.arrests++;
    this.addScore(150, 'Arrest');
    this.game.hud.alert('Suspect arrested', 'good', 2);
    this.game.audio.ui('good');
  }

  radio(text) { this.game.hud.alert('📻 ' + text, 'radio', 5); this.game.audio.ui('radio'); }

  _pickFromCrowd(filter, n) {
    const pool = this.game.crowd.npcs.filter((o) => o.temperament === 'peaceful' && !o.script && !o.arrested && !o.surge && o.state !== 'down' && filter(o));
    pool.sort(() => Math.random() - 0.5);
    return pool.slice(0, n);
  }

  _phaseDone(i, bonus, text) {
    this.completed[i] = true;
    this.phaseTimes[i] = this.t;
    this.addScore(bonus, 'Phase complete');
    this.game.hud.alert(text, 'good', 3);
    this.game.audio.ui('good');
  }

  // ------------------------------------------------------------- phase 1
  _startP1() {
    const g = this.game, crowd = g.crowd;
    this.stage = 'p1'; this.phase = 0; this.stageT = 0;
    // appearance plays no part in who turns violent: random individuals near the line
    this.hostiles1 = this._pickFromCrowd((n) => n.pos.z > 92 && n.pos.z < 121, 3);
    const styles = Math.random() < 0.5 ? ['melee', 'melee', 'thrower'] : ['melee', 'thrower', 'melee'];
    this.hostiles1.forEach((n, i) => crowd.makeHostile(n, styles[i], 'auto'));
    crowd.disturb(V(0, 0, 112), 14, 0.35, 'charge');
    this.radio('Aggressors are attacking the CRS line. Neutralise them — the marchers around them are peaceful.');
    g.events.schedule('teargas', 5 + Math.random() * 4);
  }

  // ------------------------------------------------------------- phase 2
  _startP2() {
    const g = this.game, crowd = g.crowd;
    this.stage = 'p2'; this.phase = 1; this.stageT = 0;
    this.radio('Situation escalating — a crowd surge is heading for the line. Reports of a petrol bomb up the boulevard!');
    // distant explosion: a car goes up further along the boulevard
    g.events.scripted('carFire', V(pick([-7.7, 7.7]), 1.0, 52 + Math.random() * 20));
    g.events.schedule('mortar', 6 + Math.random() * 5);
    // surge towards the police line, with aggressors hidden inside it
    const surge = this._pickFromCrowd((n) => n.pos.z < 95 && n.pos.z > -40, 18);
    const z0 = 66 + Math.random() * 8;
    surge.forEach((n) => {
      let x = 0, z = 0;
      for (let k = 0; k < 8; k++) { x = -9 + Math.random() * 18; z = z0 - Math.random() * 8; if (!g.world.blocked(x, z, 0.4)) break; }
      n.pos.set(x, 0, z); n.vel.set(0, 0, 0);
      n.surge = { dir: V(0, 0, 1), speed: 1.6 + Math.random() * 0.5, laneX: x, endZ: 117 };
      crowd.setState(n, 'surge');
    });
    this.hostiles2 = surge.slice(0, 2);
    this.hostiles2.forEach((n) => { n.surge = null; crowd.makeHostile(n, 'melee', 'auto'); });
    crowd.disturb(V(0, 0, z0), 10, 0.25, 'charge');
    // petrol-bomb suspect at a varied location ahead
    const spot = pick([V(-5.5, 0, 76), V(6.5, 0, 62), V(-2, 0, 50), V(11.5, 0, 70)]);
    const n = crowd.nearest(spot, (o) => o.temperament === 'peaceful' && !o.arrested && !o.script && !o.surge && o.state !== 'down');
    this.bomber = n; this.bomberDone = false;
    this.bomberSpot = spot;
    this._setupBomber(n, spot, 30, (prevented) => {
      this.bomberDone = true;
      g.hud.alert(prevented ? 'Petrol bomb attack prevented' : 'Bomber dealt with', 'good', 2.5);
    });
  }

  // ------------------------------------------------------------- phase 3
  _startP3() {
    const g = this.game, crowd = g.crowd;
    this.stage = 'p3'; this.phase = 2; this.stageT = 0;
    this.timer = 160;
    this.markerPos = OBJECTIVE_POS.clone();
    this.radio('Officers cut off at Rue Oberkampf and under attack! Get through to them — expect resistance on the boulevard.');
    // a surge rolling down the boulevard towards the officer
    const pz = g.player.pos.z;
    const z0 = Math.max(-80, Math.min(pz - 45, 20));
    const surge = this._pickFromCrowd((n) => n.distToPlayer > 40, 22);
    surge.forEach((n) => {
      let x = 0, z = 0;
      for (let k = 0; k < 8; k++) { x = -10 + Math.random() * 20; z = z0 - Math.random() * 10; if (!g.world.blocked(x, z, 0.4)) break; }
      n.pos.set(x, 0, z); n.vel.set(0, 0, 0);
      n.surge = { dir: V(0, 0, 1), speed: 1.7 + Math.random() * 0.4, laneX: x, endZ: Math.min(170, pz + 40) };
      crowd.setState(n, 'surge');
    });
    surge.slice(0, 2).forEach((n) => { n.surge = null; crowd.makeHostile(n, Math.random() < 0.5 ? 'melee' : 'thrower', 'player'); });
    // second device on the way, at one of the barricades
    const spot = pick([V(7.5, 0, -82), V(-6, 0, -60), V(4.5, 0, -30)]);
    const b = crowd.nearest(spot, (o) => o.temperament === 'peaceful' && !o.arrested && !o.script && !o.surge && o.state !== 'down' && o.distToPlayer > 25);
    if (b) { this.bomber2 = b; this._setupBomber(b, spot, 26, (prevented) => { this.addScore(prevented ? 200 : 0, 'Second device'); }); }
    g.events.setHazards(true);
  }

  _startFinal() {
    const g = this.game, crowd = g.crowd;
    this.stage = 'final'; this.stageT = 0;
    this.radio('Aggressors closing in on the officers — protect them!');
    // assailants come from the north side of the junction
    const n = 3 + (Math.random() < 0.4 ? 1 : 0);
    const wave = this._pickFromCrowd((o) => o.distToPlayer > 30, n);
    const side = Math.random() < 0.5 ? -1 : 1;
    wave.forEach((o, i) => {
      const x = side * (19 + Math.random() * 7), z = -112 + (Math.random() - 0.5) * 6;
      o.pos.set(x, 0, z); o.vel.set(0, 0, 0);
      crowd.makeHostile(o, i === 0 && n > 3 ? 'thrower' : 'melee', 'officers');
    });
    this.finalWave = wave;
    g.events.scripted('molotovAt', V(2 + Math.random() * 4, 0, -122));
  }

  // ------------------------------------------------------------- petrol bombs
  _setupBomber(n, spot, triggerDist, onDone) {
    const g = this.game, crowd = g.crowd;
    n.pos.copy(spot); n.anchor.copy(spot); n.vel.set(0, 0, 0); n.march = null;
    n.temperament = 'hostile'; n.attackStyle = 'bomber'; n.hp = 1; n.neutralized = false; n.lastAggro = -99;
    n.role = 'shout';
    clearItem(n.rig);
    crowd.setState(n, 'act'); n.dur = 99;
    const self = this;
    const sc = {
      active: false, phase: 'wait', marked: false, amber: false, t: 0, escapeT: 0,
      tick(n, player, dt) {
        sc.t += dt;
        const d = n.distToPlayer;
        if (sc.phase === 'wait') {
          n.targetRef = { pos: player.pos, isPlayer: true };
          if (d < triggerDist) {
            sc.phase = 'retrieve'; sc.active = true; sc.marked = true; sc.amber = true;
            crowd.setState(n, 'bomb_retrieve', 2.4);
            g.hud.alert('Suspect reaching into a bag!', 'warn', 2.5);
            g.audio.ui('alert');
          }
        } else if (sc.phase === 'retrieve' && n.state === 'bomb_retrieve' && n.st > n.dur) {
          sc.phase = 'light'; sc.amber = false; n.lastAggro = crowd.time;
          giveItem(n.rig, 'bottle');
          crowd.setState(n, 'bomb_light', 2.2);
          g.audio.lighter(n.pos);
        } else if (sc.phase === 'light' && n.state === 'bomb_light' && n.st > n.dur) {
          sc.phase = 'wind'; n.lastAggro = crowd.time;
          crowd.setState(n, 'bomb_wind', 2.7);
          self.warning = true;
        } else if (sc.phase === 'wind' && n.state === 'bomb_wind' && n.st > n.dur) {
          sc.phase = 'throw'; self.warning = false;
          crowd.setState(n, 'bomb_throw', 0.5);
          clearItem(n.rig);
          self._throwPetrol(n, player);
        } else if (sc.phase === 'throw' && n.state === 'bomb_throw' && n.st > n.dur) {
          sc.phase = 'flee'; sc.escapeT = 0;
          n.fleeFrom = player.pos.clone();
          crowd.setState(n, 'flee', 30);
        } else if (sc.phase === 'flee') {
          sc.escapeT += dt;
          n.lastAggro = crowd.time; // still a wanted suspect
          if (n.state === 'flee') n.fleeFrom.copy(player.pos);
          if (sc.escapeT > 30 && !n.neutralized) { sc.phase = 'escaped'; sc.active = false; sc.marked = false; n.temperament = 'peaceful'; g.hud.alert('Suspect escaped into the crowd', 'bad', 3); onDone(false); }
        }
        if ((sc.phase === 'light' && n.st > 0.6) || sc.phase === 'wind') {
          if (n.rig.wick) {
            const p = new THREE.Vector3(); n.rig.wick.getWorldPosition(p);
            if (Math.random() < 0.7) g.effects.fire.spawn({ pos: p, vel: V(0, 0.8, 0), size: 0.16 + Math.random() * 0.1, life: 0.25, alpha: 1, color: new THREE.Color(1, 0.75, 0.3), color2: new THREE.Color(0.9, 0.2, 0), drag: 1 });
            if (Math.random() < 0.05) g.effects.flash(p, 0xff9a40, 3, 0.2, 6);
          }
        }
        if (n.neutralized && sc.phase !== 'done' && sc.phase !== 'escaped') {
          const before = sc.phase;
          sc.phase = 'done'; sc.active = false; sc.marked = false; self.warning = false;
          onDone(before === 'retrieve' || before === 'light' || before === 'wind');
        }
      },
      onHit(n) {
        if (sc.phase === 'retrieve' || sc.phase === 'light' || sc.phase === 'wind') {
          clearItem(n.rig);
          self.warning = false;
          self.stats.bombsStopped++;
          self.addScore(400, 'Petrol bomb prevented');
          g.hud.alert('Device dropped — attack prevented!', 'good', 3);
        }
      },
      move() {
        if (sc.phase === 'wait') return { speed: 0 };
        // running from the scene: slower than a sprinting officer, and tiring
        if (sc.phase === 'flee' && n.state === 'flee') return { speed: Math.max(3.3, 4.6 - sc.escapeT * 0.25) };
        return null;
      },
    };
    n.script = sc;
    return sc;
  }

  _throwPetrol(n, player) {
    const g = this.game;
    this.stats.bombsThrown++;
    const from = n.pos.clone().setY(n.pos.y + 2.0);
    const d = n.distToPlayer;
    let aim;
    // thrown at where the officer is now (barely leading), so moving away during the
    // flight or dodging avoids it
    if (d < 30) aim = player.pos.clone().addScaledVector(player.vel, 0.15).setY(0.1);
    else aim = V(n.pos.x + Math.sin(n.heading) * 14, 0.1, n.pos.z + Math.cos(n.heading) * 14);
    aim.x += (Math.random() - 0.5) * 2.4; aim.z += (Math.random() - 0.5) * 2.4;
    const thrower = n.pos.clone();
    const proj = g.effects.throwProjectile(from, aim, 'petrol', (pos) => {
      const ground = pos.clone().setY(g.world.groundHeight(pos.x, pos.z));
      g.effects.ignite(ground, 2.6, 5);
      g.audio.molotov(ground, 1.2);
      g.crowd.disturb(ground, 20, 1.0, 'explosion');
      const pd = g.player.pos.distanceTo(ground);
      g.cameraRig.shake(Math.max(0, 0.6 - pd * 0.03));
      // a raised shield facing the thrower stops the splash
      if (pd < 3.2) g.player.takeDamage(22 * (1 - pd / 4), thrower, V(g.player.pos.x - ground.x, 0, g.player.pos.z - ground.z).normalize().multiplyScalar(3));
    }, Math.max(1.0, Math.min(1.6, d / 12)));
    proj.check = (pos) => g.player.hitTest(pos);
    g.audio.swing(n.pos, true);
    g.hud.alert('PETROL BOMB THROWN!', 'bad', 2.5);
  }

  _ambientThreat() {
    const g = this.game, crowd = g.crowd;
    if (this.ambient && crowd.isThreat(this.ambient)) return;
    const cands = crowd.npcs.filter((n) => n.temperament === 'peaceful' && !n.script && !n.surge && !n.arrested && n.state === 'act' && n.distToPlayer > 12 && n.distToPlayer < 28);
    if (!cands.length) return;
    const n = pick(cands);
    crowd.makeHostile(n, Math.random() < 0.6 ? 'thrower' : 'melee', 'player');
    this.ambient = n;
    g.hud.alert('An individual has turned violent nearby', 'warn', 2.5);
  }

  fail(reason) {
    if (this.ended) return;
    this.ended = true;
    this.game.endGame(false, reason);
  }

  complete() {
    if (this.ended) return;
    this.ended = true;
    this._phaseDone(2, 1000, 'Officers extracted');
    const bonus = Math.round(Math.max(0, this.timer) * 4);
    if (bonus > 0) this.addScore(bonus, 'Time bonus');
    if (this.stats.peaceful === 0) this.addScore(500, 'Proportionate force');
    this.game.events.setHazards(false);
    this.game.endGame(true);
  }

  // ------------------------------------------------------------- update
  update(dt) {
    const g = this.game;
    this.t += dt; this.stageT += dt;
    const crowd = g.crowd;
    const alive = (list) => list.filter((n) => !n.neutralized && !n.arrested && n.temperament === 'hostile').length;
    switch (this.stage) {
      case 'intro':
        if (this.stageT > 1.2) this._startP1();
        break;
      case 'p1': {
        const left = alive(this.hostiles1);
        const nearest = crowd.nearest(g.player.pos, (n) => this.hostiles1.includes(n) && !n.neutralized);
        this.markerPos = nearest ? nearest.pos : null;
        if (left === 0) { this._phaseDone(0, 500 + Math.round(this.line * 2), 'Police line secured'); this.stage = 'gap1'; this.stageT = 0; this.markerPos = null; }
        break;
      }
      case 'gap1':
        if (this.stageT > 3) this._startP2();
        break;
      case 'p2': {
        const left = alive(this.hostiles2);
        const b = this.bomber && this.bomber.script;
        if (!this.bomberDone) this.markerPos = b && b.active ? this.bomber.pos : this.bomberSpot;
        else { const h = crowd.nearest(g.player.pos, (n) => this.hostiles2.includes(n) && !n.neutralized); this.markerPos = h ? h.pos : null; }
        if (this.bomberDone && left === 0) { this._phaseDone(1, 600, 'Escalation contained'); this.stage = 'gap2'; this.stageT = 0; this.markerPos = null; }
        break;
      }
      case 'gap2':
        if (this.stageT > 3) this._startP3();
        break;
      case 'p3': {
        this.timer -= dt;
        // ambush from Rue de Malte as the officer passes the junction
        if (!this.ambushed && g.player.pos.z < -8) {
          this.ambushed = true;
          const side = Math.random() < 0.5 ? -1 : 1;
          const am = this._pickFromCrowd((o) => o.distToPlayer > 30, 2 + (Math.random() < 0.5 ? 1 : 0));
          am.forEach((o, i) => { o.pos.set(side * (20 + i * 1.5), 0, -20 + (i - 1) * 1.6); o.vel.set(0, 0, 0); crowd.makeHostile(o, i === 2 ? 'thrower' : 'melee', 'player'); });
          this.ambush = am;
          g.hud.alert(`Ambush from Rue de Malte — ${side < 0 ? 'left' : 'right'}!`, 'warn', 2.5);
          g.events.scripted('mortar');
        }
        if (g.player.pos.distanceTo(OBJECTIVE_POS) < 22) this._startFinal();
        if (this.timer <= 0) this.fail('The cut-off officers were not reached in time.');
        break;
      }
      case 'final': {
        this.timer -= dt;
        const left = alive(this.finalWave);
        const near = crowd.nearest(g.player.pos, (n) => this.finalWave.includes(n) && !n.neutralized);
        this.markerPos = near ? near.pos : OBJECTIVE_POS;
        if (left === 0) {
          if (!this.extractReady) { this.extractReady = true; g.hud.alert('Area secure — extract the officers', 'good', 3); }
          this.markerPos = OBJECTIVE_POS;
          if (g.player.pos.distanceTo(OBJECTIVE_POS) < 4.5) {
            g.hud.prompt('E', 'Extract the officers');
            if (g.input.pressed('KeyE')) this.complete();
          }
        }
        if (this.timer <= 0) this.fail('The cut-off officers were not reached in time.');
        break;
      }
    }
    if (this.stage !== 'intro' && this.stage !== 'p1' && this.stage !== 'final') {
      this.ambientT -= dt;
      if (this.ambientT <= 0) { this.ambientT = 30 + Math.random() * 25; this._ambientThreat(); }
    }
    const a = crowd.arrestable(g.player.pos);
    if (a && !(this.extractReady && g.player.pos.distanceTo(OBJECTIVE_POS) < 4.5)) {
      g.hud.prompt('E', 'Arrest suspect');
      if (g.input.pressed('KeyE')) { crowd.arrest(a); this.onArrest(a); }
    }
    this._updateMarker(dt);
  }

  // objective beam over markerPos (shared by every level's mission script)
  _updateMarker(dt) {
    const g = this.game;
    const md = this.markerPos ? Math.hypot(this.markerPos.x - g.player.pos.x, this.markerPos.z - g.player.pos.z) : 0;
    if (this.markerPos && md > 9) {
      this.marker.visible = true;
      this.marker.children[0].material.opacity = Math.min(0.6, (md - 9) / 15);
      this.marker.position.set(this.markerPos.x, 0, this.markerPos.z);
      this.chevron.position.y = 2.6 + Math.sin(this.t * 3) * 0.15;
      this.chevron.rotation.y += dt * 2;
    } else this.marker.visible = false;
  }

  // ------------------------------------------------------------- HUD data
  hudInfo() {
    const info = { index: this.phase, phaseName: PHASES[this.phase], text: '', status: 'calm', chip: 'CALM', detail: '', bar: null };
    const left = (l) => l.filter((n) => !n.neutralized && !n.arrested && n.temperament === 'hostile').length;
    switch (this.stage) {
      case 'intro':
        Object.assign(info, { text: 'Hold position with the CRS line', chip: 'STANDBY', detail: 'Radio traffic incoming…' }); break;
      case 'p1': {
        const n = this.hostiles1.length;
        Object.assign(info, { text: 'Repel the aggressors attacking the police line', status: 'active', chip: 'ACTIVE', detail: `Aggressors ${n - left(this.hostiles1)} / ${n} · Line ${Math.round(this.line)}%`, bar: this.line / 100 });
        break;
      }
      case 'gap1':
        Object.assign(info, { index: 1, phaseName: PHASES[1], text: 'Stand by — radio traffic', chip: 'CALM' }); break;
      case 'p2': {
        const sc = this.bomber && this.bomber.script;
        const ph = this.bomberDone ? 'done' : sc ? sc.phase : 'wait';
        const ag = `Surge aggressors ${2 - left(this.hostiles2)} / 2`;
        const map = {
          wait: ['Find the petrol-bomb suspect before he acts', 'ACTIVE', 'active', `Suspect not yet located · ${ag}`],
          retrieve: ['Stop him — he is retrieving a device!', 'DANGER', 'danger', 'Device being retrieved'],
          light: ['Stop him before he throws it!', 'DANGER', 'danger', 'Device being lit'],
          wind: ['STOP HIM NOW!', 'DANGER', 'danger', 'About to throw'],
          throw: ['Take cover!', 'DANGER', 'danger', 'Device thrown'],
          flee: ['Catch the fleeing suspect', 'ACTIVE', 'active', `Suspect fleeing · ${Math.max(0, Math.ceil(22 - (sc ? sc.escapeT : 0)))}s`],
          done: ['Neutralise the aggressors in the surge', 'ACTIVE', 'active', ag],
        };
        const m = map[ph] || map.wait;
        Object.assign(info, { text: m[0], chip: m[1], status: m[2], detail: m[3], bar: this.line / 100 });
        break;
      }
      case 'gap2':
        Object.assign(info, { index: 2, phaseName: PHASES[2], text: 'Regroup', chip: 'CALM', detail: 'Radio traffic incoming…' }); break;
      case 'p3': {
        const sc = this.bomber2 && this.bomber2.script;
        const danger = sc && sc.active;
        Object.assign(info, { text: 'Reach the officers cut off at Rue Oberkampf', status: danger ? 'danger' : 'active', chip: danger ? 'DANGER' : 'ACTIVE', detail: `${Math.round(this.game.player.pos.distanceTo(OBJECTIVE_POS))} m · ${Math.max(0, Math.ceil(this.timer))}s${danger ? ' · INCENDIARY DEVICE' : ''}`, bar: Math.max(0, this.timer / 160) });
        break;
      }
      case 'final': {
        const n = this.finalWave.length, l = left(this.finalWave);
        Object.assign(info, l > 0
          ? { text: 'Protect the cut-off officers', status: 'danger', chip: 'DANGER', detail: `Assailants ${n - l} / ${n} · Officers ${Math.round(this.officers)}%`, bar: this.officers / 100 }
          : { text: 'Extract the officers — press E beside them', status: 'active', chip: 'SECURE', detail: `${Math.round(this.game.player.pos.distanceTo(OBJECTIVE_POS))} m`, bar: null });
        break;
      }
    }
    info.completed = this.completed;
    return info;
  }
}

```

## src/music.js

```js
// Synthesised music stand-in (Level 2) and cinematic stings.
//
// A placeholder score built from oscillators and noise, until licensed music is
// sourced: a slow minor pad that is always there, a low pulse that comes in for
// fights and quickens for bosses, a sub drone under boss fights, and a resolving
// chord for the victory. Like the rest of the soundscape it is driven from update()
// (no free-running timers): beats are scheduled a little ahead of the audio clock.
//
// Signal: voices -> music bus (Music volume setting) -> game bus (pause fade) -> master.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz
// D minor progression, two bars per chord: Dm, Bb, F, A
const CHORDS = [[50, 53, 57], [46, 50, 53], [41, 45, 48], [45, 49, 52]];
const VICTORY = [50, 54, 57]; // D major: the resolve

// per state: pad level, pad brightness (filter Hz), pulse level, drone level, tempo (bpm).
// Levels keep the score under the soundscape (measured: about +2 dB RMS in boss fights).
const STATES = {
  off: { pad: 0, bright: 500, pulse: 0, drone: 0, bpm: 80 },
  calm: { pad: 0.12, bright: 650, pulse: 0, drone: 0, bpm: 80 },
  combat: { pad: 0.14, bright: 900, pulse: 0.26, drone: 0, bpm: 92 },
  boss: { pad: 0.15, bright: 1100, pulse: 0.4, drone: 0.12, bpm: 108 },
  boss3: { pad: 0.17, bright: 1500, pulse: 0.48, drone: 0.15, bpm: 122 },
  victory: { pad: 0.2, bright: 1800, pulse: 0, drone: 0, bpm: 80 },
};

export class Music {
  constructor(audio) {
    this.a = audio;
    this.state = 'off';
    this.started = false;
  }

  // build the persistent voices once the audio context exists
  _build() {
    const c = this.a.ctx;
    this.bus = this.a.musicVol;
    this.padOut = c.createGain(); this.padOut.gain.value = 0;
    this.padFilter = c.createBiquadFilter(); this.padFilter.type = 'lowpass'; this.padFilter.frequency.value = 600; this.padFilter.Q.value = 0.8;
    this.padFilter.connect(this.padOut).connect(this.bus);
    // slow movement in the pad's brightness
    this.lfo = c.createOscillator(); this.lfo.frequency.value = 0.07;
    this.lfoGain = c.createGain(); this.lfoGain.gain.value = 180;
    this.lfo.connect(this.lfoGain).connect(this.padFilter.frequency); this.lfo.start();
    // three chord notes, two slightly detuned saws each
    this.voices = [];
    for (let i = 0; i < 3; i++) for (const det of [-6, 7]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.detune.value = det;
      const g = c.createGain(); g.gain.value = 0.11;
      o.connect(g).connect(this.padFilter); o.start();
      this.voices.push({ o, i });
    }
    this.droneOut = c.createGain(); this.droneOut.gain.value = 0;
    this.drone = c.createOscillator(); this.drone.type = 'sine'; this.drone.frequency.value = NOTE(26);
    this.drone2 = c.createOscillator(); this.drone2.type = 'triangle'; this.drone2.frequency.value = NOTE(38); this.drone2.detune.value = 4;
    const d2g = c.createGain(); d2g.gain.value = 0.35;
    this.drone.connect(this.droneOut); this.drone2.connect(d2g).connect(this.droneOut);
    this.droneOut.connect(this.bus); this.drone.start(); this.drone2.start();
    this.pulseOut = c.createGain(); this.pulseOut.gain.value = 0; this.pulseOut.connect(this.bus);
    this.chord = 0; this.bar = 0; this.beat = 0; this.nextBeat = c.currentTime + 0.1;
    this._setChord(CHORDS[0], 0.01);
    this.started = true;
  }

  _setChord(notes, tc = 1.2) {
    const t = this.a.ctx.currentTime;
    for (const v of this.voices) v.o.frequency.setTargetAtTime(NOTE(notes[v.i]), t, tc);
    this.drone.frequency.setTargetAtTime(NOTE(notes[0] - 24), t, tc);
  }

  setState(s) {
    if (!this.a.enabled) { this.state = s; return; }
    if (!this.started) this._build();
    if (s === this.state) return;
    const prev = this.state;
    this.state = s;
    const c = this.a.ctx, t = c.currentTime, st = STATES[s] || STATES.off;
    this.padOut.gain.setTargetAtTime(st.pad, t, s === 'off' ? 0.8 : 1.5);
    this.padFilter.frequency.setTargetAtTime(st.bright, t, 1.2);
    this.droneOut.gain.setTargetAtTime(st.drone, t, 1.0);
    this.pulseOut.gain.setTargetAtTime(st.pulse, t, 0.6);
    if (s === 'victory') this._setChord(VICTORY, 0.8);
    else if (prev === 'victory') this._setChord(CHORDS[this.chord], 1.5);
  }

  // called every frame from Audio.update
  update() {
    if (!this.started || !this.a.enabled) return;
    const c = this.a.ctx, st = STATES[this.state] || STATES.off;
    const spb = 60 / st.bpm;
    while (this.nextBeat < c.currentTime + 0.15) {
      const t = this.nextBeat;
      if (st.pulse > 0) {
        this._kick(t, this.beat % 4 === 0 ? 1 : 0.6);
        if (this.state !== 'combat' || this.beat % 2 === 1) this._tick(t + spb / 2, this.beat % 4 === 3 ? 0.5 : 0.3);
      }
      this.beat++;
      if (this.beat % 8 === 0 && this.state !== 'victory') { this.chord = (this.chord + 1) % CHORDS.length; this._setChord(CHORDS[this.chord]); }
      this.nextBeat += spb;
    }
  }

  _kick(t, level) {
    const c = this.a.ctx;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9 * level, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(this.pulseOut); o.start(t); o.stop(t + 0.4);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  }

  _tick(t, level) {
    const c = this.a.ctx;
    const s = c.createBufferSource(); s.buffer = this.a.white;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * level, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(f).connect(g).connect(this.pulseOut); s.start(t, Math.random() * 1.5, 0.08);
    s.onended = () => { s.disconnect(); f.disconnect(); g.disconnect(); };
  }

  // One-shot stings: 'warn' (unblockable wind-up), 'intro' (boss name card),
  // 'phase' (phase change), 'victory'. They play on the music bus, unpositioned.
  sting(kind) {
    if (!this.a.enabled) return;
    if (!this.started) this._build();
    const c = this.a.ctx, t = c.currentTime + 0.01, out = this.bus;
    const env = (g, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
    const nodes = [];
    const osc = (type, f, det = 0) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; nodes.push(o); return o; };
    const gain = () => { const g = c.createGain(); nodes.push(g); return g; };
    const done = (len) => setTimeout(() => nodes.forEach((n) => { try { n.disconnect(); } catch (e) { /* gone */ } }), (len + 0.2) * 1000);
    if (kind === 'warn') {
      // two quick rising blips: something heavy is coming
      for (const [dt, f] of [[0, 620], [0.11, 930]]) {
        const o = osc('triangle', f), g = gain();
        g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(0.22, t + dt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.1);
        o.frequency.setValueAtTime(f, t + dt); o.frequency.linearRampToValueAtTime(f * 1.25, t + dt + 0.09);
        o.connect(g).connect(out); o.start(t + dt); o.stop(t + dt + 0.12);
      }
      done(0.3);
    } else if (kind === 'intro' || kind === 'phase') {
      // low swelling stab (minor), with a sub hit for phase changes
      const notes = kind === 'intro' ? [38, 45, 50, 53] : [38, 44, 50];
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(kind === 'intro' ? 1800 : 2600, t + 0.35); f.frequency.exponentialRampToValueAtTime(400, t + 1.6); nodes.push(f);
      const g = gain(); env(g, kind === 'intro' ? 0.25 : 0.04, kind === 'intro' ? 0.32 : 0.4, kind === 'intro' ? 1.8 : 1.2);
      f.connect(g).connect(out);
      for (const n of notes) for (const det of [-8, 8]) { const o = osc('sawtooth', NOTE(n), det); o.connect(f); o.start(t); o.stop(t + 2.3); }
      if (kind === 'phase') {
        const sub = osc('sine', 70), sg = gain();
        sub.frequency.setValueAtTime(90, t); sub.frequency.exponentialRampToValueAtTime(32, t + 0.6);
        env(sg, 0.01, 0.9, 0.7); sub.connect(sg).connect(out); sub.start(t); sub.stop(t + 0.9);
      }
      done(2.4);
    } else if (kind === 'victory') {
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; nodes.push(f);
      const g = gain(); env(g, 0.4, 0.3, 3.2); f.connect(g).connect(out);
      for (const n of [...VICTORY, 62, 66]) for (const det of [-5, 6]) { const o = osc('sawtooth', NOTE(n), det); o.connect(f); o.start(t); o.stop(t + 3.8); }
      done(3.9);
    }
  }
}

```

## src/player.js

```js
// Player CRS officer: camera-relative movement, sprint/dodge, baton combat,
// shield stance, damage & reactions.
import * as THREE from 'three';
import { buildCharacter, addPoliceGear, newPose, baseLayer, applyPose, updateShield } from './characters.js';

const WINDUP = 0.13, STRIKE = 0.12, RECOVER = 0.3;

function angleLerp(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

export class Player {
  constructor(game) {
    this.game = game;
    this.rig = buildCharacter(game.world, { skin: 0xd8b090, height: 1.02 }, 'police');
    addPoliceGear(this.rig);
    game.scene.add(this.rig.root);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.reset();
  }

  reset() {
    const s = this.start || { x: 0.5, z: 141, heading: Math.PI }; // set per level; Level 1 faces north (-z)
    this.pos.set(s.x, 0, s.z);
    this.vel.set(0, 0, 0);
    this.heading = s.heading;
    this.health = 100;
    this.stamina = 100;
    this.attack = null;      // {phase, t, target, hit}
    this.attackBuffer = 0;
    this.blocking = false;
    this.blockK = 0;
    this.dodgeT = 0; this.dodgeCool = 0; this.dodgeDir = new THREE.Vector3();
    this.staggerT = 0; this.staggerDir = new THREE.Vector3();
    this.invuln = 0;
    this.sinceDamage = 99;
    this.speed = 0;
    this.sprinting = false;
    this.dead = false;
    this.knock = new THREE.Vector3();
    this.lastStepPhase = 0;
    this.rig.pose = newPose();
    this.surgePush = 0;
  }

  forward() { return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading)); }

  // projectile hit test against the officer's body
  hitTest(p) {
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
    return dx * dx + dz * dz < 0.45 * 0.45 && p.y > this.pos.y + 0.2 && p.y < this.pos.y + 1.95;
  }

  takeDamage(amount, fromPos, push, projectile = false) {
    const g = this.game;
    if (this.dead || this.invuln > 0) return 0;
    let blocked = false;
    if (fromPos && this.blockK > 0.6) {
      const to = new THREE.Vector3(fromPos.x - this.pos.x, 0, fromPos.z - this.pos.z).normalize();
      if (to.dot(this.forward()) > 0.25) blocked = true;
    }
    if (blocked) {
      amount *= 0.12;
      this.stamina = Math.max(0, this.stamina - (projectile ? 4 : 9));
      g.audio.impact(this.pos, false, true);
      g.cameraRig.shake(0.12);
      if (push) this.knock.addScaledVector(push, 0.25);
      g.hud.alert('Blocked', 'good', 0.8, 'block');
    } else {
      this.staggerT = projectile ? 0.25 : 0.38;
      if (push) { this.knock.add(push); this.staggerDir.copy(push).normalize(); }
      else if (fromPos) this.staggerDir.set(this.pos.x - fromPos.x, 0, this.pos.z - fromPos.z).normalize();
      g.audio.impact(this.pos, amount > 8);
      g.audio.hurt(true);
      g.cameraRig.shake(0.35);
      g.hud.damageFlash(Math.min(1, amount / 20));
      // a hit interrupts your own wind-up
      if (this.attack && this.attack.phase === 'windup') this.attack = null;
    }
    this.health = Math.max(0, this.health - amount);
    this.sinceDamage = 0;
    if (this.health <= 0 && !this.dead) { this.dead = true; g.onPlayerDown(); }
    return amount;
  }

  _findTarget(dirHint) {
    // soft lock: closest agent in a forward cone, preferring active threats
    const crowd = this.game.crowd;
    const list = crowd.query(this.pos.x, this.pos.z, 3.4, []);
    let best = null, bs = Infinity;
    for (const n of list) {
      if (n.id === undefined || n.untargetable || n.state === 'down' || n.state === 'arrested' || n.state === 'gone') continue;
      if (crowd.arena && n !== crowd.arena.boss) continue; // boss fight: the baton only goes for the boss
      const dx = n.pos.x - this.pos.x, dz = n.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * dirHint.x + dz * dirHint.z) / (d || 1))));
      if (ang > 0.85) continue;
      const score = d + ang * 1.5 - (crowd.isThreat(n) ? 1.2 : 0);
      if (score < bs) { bs = score; best = n; }
    }
    return best;
  }

  update(dt, input, camYaw) {
    const g = this.game;
    this.sinceDamage += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.dodgeCool = Math.max(0, this.dodgeCool - dt);
    this.staggerT = Math.max(0, this.staggerT - dt);
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);

    const camF = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const camR = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    const wish = new THREE.Vector3();
    if (!this.dead) {
      if (input.down('KeyW')) wish.add(camF);
      if (input.down('KeyS')) wish.sub(camF);
      if (input.down('KeyD')) wish.add(camR);
      if (input.down('KeyA')) wish.sub(camR);
      // analog stick (touch): partial deflection walks slower
      if (input.axis.x || input.axis.y) wish.addScaledVector(camF, -input.axis.y).addScaledVector(camR, input.axis.x);
    }
    if (wish.lengthSq() > 1) wish.normalize();

    // --- stance & attacks
    this.blocking = !this.dead && input.mouse(2) && !this.attack && this.dodgeT <= 0;
    this.blockK += ((this.blocking ? 1 : 0) - this.blockK) * Math.min(1, dt * 14);
    if (input.pressed('Mouse0')) this.attackBuffer = 0.22;
    const canAttack = !this.dead && this.staggerT <= 0 && this.dodgeT <= 0 && (!this.attack || (this.attack.phase === 'recover' && this.attack.t > 0.14));
    if (this.attackBuffer > 0 && canAttack) {
      this.attackBuffer = 0;
      const target = this._findTarget(camF);
      this.attack = { phase: 'windup', t: 0, target, hit: false };
      // the whoosh peaks as the baton comes down, just before the impact
      g.audio.swing(this.pos);
      if (target) this.heading = Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
      else this.heading = Math.atan2(camF.x, camF.z);
    }
    if (this.attack) {
      const a = this.attack;
      a.t += dt;
      if (a.phase === 'windup' && a.t >= WINDUP) { a.phase = 'strike'; a.t = 0; this._resolveStrike(); }
      else if (a.phase === 'strike' && a.t >= STRIKE) { a.phase = 'recover'; a.t = 0; }
      else if (a.phase === 'recover' && a.t >= RECOVER) this.attack = null;
    }

    // --- dodge
    if (!this.dead && input.pressed('Space') && this.dodgeCool <= 0 && this.stamina > 12 && this.staggerT <= 0) {
      this.dodgeDir.copy(wish.lengthSq() > 0 ? wish : this.forward().negate()).normalize();
      this.dodgeT = 0.32; this.dodgeCool = 0.75; this.invuln = 0.28;
      if (g.missions && g.missions.stats.dodges !== undefined) g.missions.stats.dodges++;
      this.stamina -= 18;
      this.attack = null;
      g.audio.footstep(this.pos, 0.3, true);
      g.effects.dust(this.pos.clone().setY(0.1), 4);
    }

    // --- locomotion
    const shift = input.down('ShiftLeft') || input.down('ShiftRight');
    this.sprinting = shift && wish.lengthSq() > 0 && !this.blocking && !this.attack && this.stamina > 1;
    let maxSpeed = this.blocking ? 1.9 : this.sprinting ? 6.6 : 4.0;
    if (this.attack) maxSpeed = this.attack.phase === 'strike' ? 2.2 : 1.0;
    if (this.staggerT > 0) maxSpeed = 0.8;
    if (this.dead) maxSpeed = 0;
    const target = wish.clone().multiplyScalar(maxSpeed);
    if (this.attack && this.attack.phase === 'strike' && this.attack.target) {
      const tdir = new THREE.Vector3(this.attack.target.pos.x - this.pos.x, 0, this.attack.target.pos.z - this.pos.z);
      if (tdir.length() > 1.3) target.copy(tdir.normalize().multiplyScalar(3.2)); // lunge into range
    }
    const accel = wish.lengthSq() > 0 ? 16 : 12;
    const k = 1 - Math.exp(-accel * dt);
    this.vel.x += (target.x - this.vel.x) * k;
    this.vel.z += (target.z - this.vel.z) * k;
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      this.vel.copy(this.dodgeDir).multiplyScalar(8.5 * Math.max(0.3, this.dodgeT / 0.32));
    }
    this.pos.x += (this.vel.x + this.knock.x) * dt;
    this.pos.z += (this.vel.z + this.knock.z) * dt;
    this.knock.multiplyScalar(Math.exp(-dt * 6));
    g.world.resolveCircle(this.pos, 0.36);
    this.pos.y += (g.world.groundHeight(this.pos.x, this.pos.z) - this.pos.y) * Math.min(1, dt * 14);
    this.speed = Math.hypot(this.vel.x, this.vel.z);

    // stamina & health regen
    if (this.sprinting) this.stamina = Math.max(0, this.stamina - dt * 16);
    else this.stamina = Math.min(100, this.stamina + dt * (this.blocking ? 6 : 14));
    if (this.sinceDamage > 6 && !this.dead) this.health = Math.min(100, this.health + dt * 2.5);

    // petrol fire damage (no blocking flames)
    if (!this.dead && g.effects.inFire(this.pos)) {
      this.health = Math.max(0, this.health - dt * 15);
      this.sinceDamage = 0;
      g.hud.damageFlash(0.4);
      if (this.health <= 0) { this.dead = true; g.onPlayerDown(); }
    }

    // --- facing
    let want = this.heading;
    if (this.blocking) want = Math.atan2(camF.x, camF.z);
    else if (this.attack) want = this.heading;
    else if (this.speed > 0.3 && this.dodgeT <= 0) want = Math.atan2(this.vel.x, this.vel.z);
    const turnRate = this.blocking ? 14 : this.sprinting ? 8 : 11;
    this.heading = angleLerp(this.heading, want, 1 - Math.exp(-dt * turnRate));

    this._animate(dt, g.time);
  }

  _resolveStrike() {
    const g = this.game;
    const fwd = this.forward();
    const list = g.crowd.query(this.pos.x, this.pos.z, 2.6, []);
    let best = null, bs = Infinity;
    for (const n of list) {
      if (n.id === undefined || n.untargetable || n.state === 'down' || n.state === 'arrested' || n.state === 'gone') continue; // scripted characters off-fight are not targets
      if (g.crowd.arena && n !== g.crowd.arena.boss) continue; // boss fight: bystanders are never struck
      const dx = n.pos.x - this.pos.x, dz = n.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.05 + n.radius * 0.5) continue;
      const cos = (dx * fwd.x + dz * fwd.z) / (d || 1);
      if (cos < 0.55) continue; // ~56 degree half-angle
      const score = d - cos * 0.8 + (n === this.attack.target ? -0.6 : 0);
      if (score < bs) { bs = score; best = n; }
    }
    if (best) {
      const dir = new THREE.Vector3(best.pos.x - this.pos.x, 0, best.pos.z - this.pos.z).normalize();
      this.attack.hit = true;
      if (g.crowd.onBatonHit(best, dir, this.pos) === 'blocked') return; // a shield took it; the crowd plays the block
      g.audio.impact(best.pos, false);
      g.effects.impact(best.pos.clone().setY(best.pos.y + 1.3));
      g.hitStop(0.07);
      g.cameraRig.shake(0.22);
      g.hud.hitMarker();
    }
  }

  _animate(dt, t) {
    const rig = this.rig;
    const P = newPose();
    baseLayer(P, rig, this.speed, t, dt, false);
    let rate = 14;
    // footsteps from the gait phase
    if (this.speed > 0.4) {
      const stepPh = Math.floor(rig.phase / Math.PI);
      if (stepPh !== this.lastStepPhase) { this.lastStepPhase = stepPh; this.game.audio.footstep(this.pos, this.sprinting ? 0.2 : 0.13, true); }
    }
    // baton carry
    P.shRX += -0.25; P.elR = Math.min(P.elR, -0.5);
    // shield carry on left side; stance raises it
    const bk = this.blockK;
    P.shLX = P.shLX * (1 - bk) - 1.3 * bk; P.elL = P.elL * (1 - bk) - 0.5 * bk; P.shLZ = 0.1 * (1 - bk);
    if (bk > 0.5) { P.spX = 0.14; P.knL = Math.max(P.knL, 0.25); P.knR = Math.max(P.knR, 0.25); P.y -= 0.04; P.hdX = 0.05; }
    updateShield(rig, bk);
    if (this.attack) {
      const a = this.attack;
      if (a.phase === 'windup') { rate = 30; P.shRX = -2.6; P.shRZ = -0.45; P.elR = -1.35; P.spY = -0.45; P.spX = -0.05; }
      else if (a.phase === 'strike') { rate = 34; P.shRX = -0.55; P.shRZ = 0.32; P.elR = -0.15; P.spY = 0.5; P.spX = 0.25; P.hpLX = -0.55; P.knL = 0.35; P.hpRX = 0.3; }
      else { rate = 10; P.shRX = -0.6; P.elR = -0.6; P.spY = 0.15; }
    }
    if (this.dodgeT > 0) { P.spX = 0.35; P.knL = P.knR = 0.6; P.y = -0.12; }
    if (this.staggerT > 0) {
      rate = 18;
      const f = this.forward();
      const back = this.staggerDir.dot(f) < 0; // pushed from the front
      P.spX = back ? -0.35 : 0.35; P.hdX = back ? -0.3 : 0.3; P.shRZ = -0.6; P.shLZ = 0.6;
    }
    if (this.dead) { rate = 6; P.tiltX = -1.5; P.y = 0.05; P.shLZ = 0.9; P.shRZ = -0.9; }
    applyPose(rig, P, dt, rate);
    rig.root.position.copy(this.pos);
    if (this.dead) rig.root.position.y += 0.12;
    rig.root.rotation.y = this.heading;
  }
}

```

## src/post.js

```js
// Cinematic post-processing: half-resolution bloom for fire and lights, a
// filmic colour grade (cool shadows, warm highlights, restrained saturation),
// then tone mapping, vignette and fine film grain.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uSmoke: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uSmoke; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;           // linear HDR
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // split toning: teal-grey shadows, amber highlights
      vec3 shadowTint = vec3(0.90, 0.98, 1.06);
      vec3 highTint = vec3(1.07, 1.0, 0.9);
      float k = smoothstep(0.02, 0.6, l);
      c *= mix(shadowTint, highTint, k);
      // restrained saturation, a little more in the fire-lit highlights
      c = mix(vec3(l), c, 0.82 + k * 0.15);
      // smoke-heavy streets wash out towards a brown haze
      c = mix(c, vec3(l) * vec3(1.05, 0.98, 0.9), uSmoke * 0.18);
      // gentle S-curve in log space
      c = pow(c, vec3(1.06));
      gl_FragColor = vec4(c, 1.0);
    }`,
};

const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uHurt: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uHurt; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      // faint chromatic fringing towards the edges
      vec2 d = uv - 0.5;
      float r2 = dot(d, d);
      vec3 c;
      c.r = texture2D(tDiffuse, uv + d * 0.0035 * (1.0 + uHurt * 4.0)).r;
      c.g = texture2D(tDiffuse, uv).g;
      c.b = texture2D(tDiffuse, uv - d * 0.0035 * (1.0 + uHurt * 4.0)).b;
      float vig = smoothstep(0.85, 0.18, r2 * 1.6);
      c *= mix(0.62, 1.0, vig);
      float g = hash(uv * vec2(1920.0, 1080.0) + fract(uTime * 7.3)) - 0.5;
      c += g * 0.035;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    const size = renderer.getSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 2 });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2.5, size.y / 2.5), 0.55, 0.6, 0.92);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.finish = new ShaderPass(FinishShader);
    this.composer.addPass(this.finish);
  }
  setSize(w, h) {
    this.composer.setSize(w, h);
    this.bloom.setSize(w / 2.5, h / 2.5);
  }
  render(dt, time, smoke, hurt) {
    this.grade.uniforms.uSmoke.value = smoke;
    this.finish.uniforms.uTime.value = time;
    this.finish.uniforms.uHurt.value = hurt;
    this.composer.render(dt);
  }
}

```

## src/seed.js

```js
// Reproducible runs: with ?seed=N in the URL, Math.random is replaced by a
// seeded generator before any other module runs. Combined with the fixed-step
// developer helpers (dev.js) and audio left off, a run can be replayed exactly.
// Without the parameter nothing changes.
import { mulberry } from './textures.js';

const arg = new URLSearchParams(location.search).get('seed');
export const SEED = arg === null ? null : (parseInt(arg, 10) || 1);
export function reseed(seed) { Math.random = mulberry(seed); }
if (SEED !== null) reseed(SEED);

```

## src/textures.js

```js
// Procedural canvas textures — no external image assets are required.
import * as THREE from 'three';

let anisotropy = 4;
export function setAnisotropy(a) { anisotropy = a; }

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, { repeat = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  return t;
}

// Deterministic RNG so the city looks the same every run.
export function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise(ctx, w, h, amount, rnd, alpha = 0.08) {
  for (let i = 0; i < amount; i++) {
    const v = rnd() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rnd()})`;
    const s = 1 + rnd() * 2.5;
    ctx.fillRect(rnd() * w, rnd() * h, s, s);
  }
}

function grime(ctx, w, h, rnd, strength = 0.25) {
  // vertical rain streaks and darker base
  for (let i = 0; i < 40; i++) {
    const x = rnd() * w, len = h * (0.1 + rnd() * 0.5), y = rnd() * h;
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, 'rgba(40,35,30,0)');
    g.addColorStop(0.3, `rgba(40,35,30,${0.12 * strength})`);
    g.addColorStop(1, 'rgba(40,35,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, 2 + rnd() * 8, len);
  }
}

// ---------------------------------------------------------------------------
// Haussmann upper façade: 2 bays wide, 5 floors tall. v=0 is the first floor.
export function facadeTexture(variant) {
  const rnd = mulberry(100 + variant * 17);
  const W = 512, H = 1024;
  const [c, ctx] = canvas(W, H);
  const stones = ['#d9ccb2', '#cfc2a6', '#e0d6c2', '#c7b99c'];
  const base = stones[variant % stones.length];
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  noise(ctx, W, H, 9000, rnd, 0.07);
  const floorH = H / 5;
  // stone block joints
  ctx.strokeStyle = 'rgba(90,75,55,0.12)'; ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let f = 0; f < 5; f++) {
    const top = H - (f + 1) * floorH; // canvas y of floor top (f=0 is bottom)
    // cornice band
    ctx.fillStyle = 'rgba(255,250,240,0.35)'; ctx.fillRect(0, top + floorH - 10, W, 4);
    ctx.fillStyle = 'rgba(60,50,40,0.28)'; ctx.fillRect(0, top + floorH - 6, W, 6);
    const tall = f === 0 || f === 3 ? 0.66 : 0.6;
    for (let b = 0; b < 2; b++) {
      const cx = W / 4 + b * (W / 2);
      const ww = 92, wh = floorH * tall;
      const wx = cx - ww / 2, wy = top + floorH * 0.16;
      // window surround
      ctx.fillStyle = 'rgba(255,248,235,0.45)'; ctx.fillRect(wx - 9, wy - 12, ww + 18, wh + 16);
      ctx.fillStyle = 'rgba(70,60,45,0.25)'; ctx.fillRect(wx - 9, wy - 12, ww + 18, 4);
      // pediment on 2nd floor
      if (f === 1) {
        ctx.fillStyle = 'rgba(255,248,235,0.5)';
        ctx.beginPath(); ctx.moveTo(wx - 14, wy - 12); ctx.lineTo(cx, wy - 36); ctx.lineTo(wx + ww + 14, wy - 12); ctx.fill();
      }
      // glass
      const lit = rnd() < 0.18;
      const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
      if (lit) { g.addColorStop(0, '#6d5a3e'); g.addColorStop(1, '#3b3022'); }
      else { g.addColorStop(0, '#2f3a45'); g.addColorStop(0.5, '#1d242c'); g.addColorStop(1, '#262d33'); }
      ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
      // curtains
      if (rnd() < 0.5) { ctx.fillStyle = 'rgba(230,225,210,0.35)'; ctx.fillRect(wx + 4, wy + 4, 18, wh - 8); ctx.fillRect(wx + ww - 22, wy + 4, 18, wh - 8); }
      // frames (French windows)
      ctx.strokeStyle = '#ece8df'; ctx.lineWidth = 5; ctx.strokeRect(wx, wy, ww, wh);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, wy); ctx.lineTo(cx, wy + wh); ctx.stroke();
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(wx, wy + (wh * k) / 4); ctx.lineTo(wx + ww, wy + (wh * k) / 4); ctx.stroke(); }
      // balconnette railing on floors without full balcony
      if (f !== 1 && f !== 4) {
        const ry = wy + wh - 34;
        ctx.strokeStyle = '#1b1b1d'; ctx.lineWidth = 2;
        ctx.strokeRect(wx - 4, ry, ww + 8, 30);
        for (let x = wx; x < wx + ww; x += 7) { ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry + 30); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(cx, ry + 15, 9, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }
  grime(ctx, W, H, rnd, 0.9);
  return tex(c);
}

// Ground floor shop fronts — 6 m wide, 4.5 m tall.
const SHOPS = [
  { name: 'CAFÉ', bg: '#1f3b2e', fg: '#e8d9a8', glow: '#c99a55' },
  { name: 'BOULANGERIE', bg: '#5a2a1f', fg: '#f0e0c0', glow: '#e2b06a' },
  { name: 'PHARMACIE', bg: '#e8e8e2', fg: '#1a7b3c', glow: '#c8e6d0', cross: true },
  { name: 'TABAC · PRESSE', bg: '#7d1515', fg: '#ffffff', glow: '#d7a05a' },
  { name: 'BRASSERIE', bg: '#14202e', fg: '#d8b863', glow: '#d39b4a' },
  { name: '', bg: '#3b3d40', fg: '#fff', shutter: true },
  { name: 'LIBRAIRIE', bg: '#22324a', fg: '#efe5cc', glow: '#cfae76' },
  { name: '', bg: '#3b3d40', fg: '#fff', shutter: true, tag: true },
];
export const SHOP_COUNT = SHOPS.length;

export function shopTexture(i) {
  const s = SHOPS[i];
  const rnd = mulberry(500 + i * 31);
  const W = 512, H = 384;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#cdbfa4'; ctx.fillRect(0, 0, W, H);
  noise(ctx, W, H, 5000, rnd, 0.08);
  // rusticated stone bands
  ctx.fillStyle = 'rgba(70,60,45,0.22)';
  for (let y = 20; y < H; y += 34) ctx.fillRect(0, y, W, 3);
  // pillars left/right
  ctx.fillStyle = '#d8ccb2'; ctx.fillRect(0, 0, 38, H); ctx.fillRect(W - 38, 0, 38, H);
  // sign band
  ctx.fillStyle = s.bg; ctx.fillRect(38, 40, W - 76, 62);
  if (s.name) {
    ctx.fillStyle = s.fg; ctx.font = 'bold 40px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s.name, W / 2, 73, W - 110);
  }
  if (s.shutter) {
    // lowered metal shutter
    ctx.fillStyle = '#6c6e70'; ctx.fillRect(48, 108, W - 96, H - 108);
    for (let y = 108; y < H; y += 9) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(48, y, W - 96, 2); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(48, y + 3, W - 96, 1); }
    // graffiti
    const cols = ['#e53935', '#111', '#2c6ef2', '#f2f2f2', '#16a34a'];
    ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      ctx.strokeStyle = cols[(k + i) % cols.length]; ctx.lineWidth = 5 + rnd() * 6;
      ctx.beginPath();
      let x = 70 + rnd() * 300, y = 160 + rnd() * 150; ctx.moveTo(x, y);
      for (let j = 0; j < 6; j++) { x += -30 + rnd() * 70; y += -40 + rnd() * 80; ctx.quadraticCurveTo(x + 20, y - 30, x, y); }
      ctx.stroke();
    }
    if (s.tag) { ctx.fillStyle = '#f2f2f2'; ctx.font = 'bold 54px Impact, sans-serif'; ctx.save(); ctx.translate(W / 2, 260); ctx.rotate(-0.08); ctx.textAlign = 'center'; ctx.fillText('ON LÂCHE RIEN', 0, 0, 380); ctx.restore(); }
  } else {
    // glazing with warm interior
    const g = ctx.createLinearGradient(0, 110, 0, H);
    g.addColorStop(0, s.glow); g.addColorStop(0.3, '#3a2d20'); g.addColorStop(1, '#17120d');
    ctx.fillStyle = g; ctx.fillRect(50, 112, W - 100, H - 130);
    // interior shapes (shelves / people silhouettes)
    for (let k = 0; k < 7; k++) { ctx.fillStyle = `rgba(0,0,0,${0.2 + rnd() * 0.3})`; ctx.fillRect(60 + rnd() * 360, 200 + rnd() * 80, 20 + rnd() * 50, 100); }
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(60, 112); ctx.lineTo(160, 112); ctx.lineTo(80, H - 18); ctx.lineTo(50, H - 18); ctx.fill();
    // door frame + mullions
    ctx.strokeStyle = '#1e1e1e'; ctx.lineWidth = 6; ctx.strokeRect(50, 112, W - 100, H - 130);
    ctx.beginPath(); ctx.moveTo(W / 2, 112); ctx.lineTo(W / 2, H - 18); ctx.stroke();
    if (s.cross) {
      ctx.fillStyle = '#18a548';
      ctx.fillRect(W - 110, 120, 20, 56); ctx.fillRect(W - 128, 138, 56, 20);
    }
    // cracked glass on some shops
    if (rnd() < 0.5) {
      ctx.strokeStyle = 'rgba(230,240,255,0.55)'; ctx.lineWidth = 1.5;
      const cx = 120 + rnd() * 260, cy = 180 + rnd() * 120;
      for (let k = 0; k < 10; k++) { const a = rnd() * 6.28; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (30 + rnd() * 70), cy + Math.sin(a) * (30 + rnd() * 70)); ctx.stroke(); }
    }
  }
  grime(ctx, W, H, rnd, 1.2);
  return tex(c);
}

export function stoneTexture() {
  const rnd = mulberry(7);
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#c8bb9f'; ctx.fillRect(0, 0, 256, 256);
  noise(ctx, 256, 256, 4000, rnd, 0.09);
  ctx.fillStyle = 'rgba(70,60,45,0.15)';
  for (let y = 0; y < 256; y += 32) ctx.fillRect(0, y, 256, 2);
  grime(ctx, 256, 256, rnd, 1);
  return tex(c);
}

// Mansard roof: zinc with dormer windows (2 per 6 m tile).
export function roofTexture() {
  const rnd = mulberry(11);
  const [c, ctx] = canvas(512, 256);
  ctx.fillStyle = '#5c646b'; ctx.fillRect(0, 0, 512, 256);
  for (let x = 0; x < 512; x += 12) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x, 0, 2, 256); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + 3, 0, 1, 256); }
  noise(ctx, 512, 256, 3000, rnd, 0.06);
  for (let b = 0; b < 2; b++) {
    const cx = 128 + b * 256;
    ctx.fillStyle = '#e0d6c2'; ctx.fillRect(cx - 40, 70, 80, 130);
    ctx.beginPath(); ctx.moveTo(cx - 48, 72); ctx.lineTo(cx, 34); ctx.lineTo(cx + 48, 72); ctx.fill();
    ctx.fillStyle = '#20272e'; ctx.fillRect(cx - 28, 86, 56, 104);
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 3; ctx.strokeRect(cx - 28, 86, 56, 104);
    ctx.beginPath(); ctx.moveTo(cx, 86); ctx.lineTo(cx, 190); ctx.stroke();
  }
  return tex(c);
}

export function asphaltTexture(lanes) {
  const rnd = mulberry(lanes ? 21 : 22);
  const S = 512;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#48494b'; ctx.fillRect(0, 0, S, S);
  noise(ctx, S, S, 26000, rnd, 0.12);
  // patches and stains
  for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(${rnd() < 0.5 ? 0 : 70},${rnd() < 0.5 ? 0 : 70},${rnd() < 0.5 ? 0 : 70},0.08)`; ctx.beginPath(); ctx.ellipse(rnd() * S, rnd() * S, 20 + rnd() * 80, 10 + rnd() * 40, rnd() * 3, 0, 7); ctx.fill(); }
  // cracks
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) { let x = rnd() * S, y = rnd() * S; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 8; j++) { x += -12 + rnd() * 24; y += -12 + rnd() * 24; ctx.lineTo(x, y); } ctx.stroke(); }
  if (lanes) {
    // texture spans 18 m across (u) and 18 m along (v)
    ctx.fillStyle = 'rgba(225,225,215,0.75)';
    const lane = S / 4;
    for (let k = 1; k < 4; k++) {
      const x = k * lane;
      if (k === 2) { ctx.fillRect(x - 4, 0, 3, S); ctx.fillRect(x + 2, 0, 3, S); }
      else for (let y = 0; y < S; y += 128) ctx.fillRect(x - 2, y, 4, 64);
    }
    ctx.fillRect(10, 0, 4, S); ctx.fillRect(S - 14, 0, 4, S);
  }
  return tex(c);
}

export function pavingTexture() {
  const rnd = mulberry(31);
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#8e8a82'; ctx.fillRect(0, 0, S, S);
  const t = 32;
  for (let y = 0; y < S; y += t) for (let x = 0; x < S; x += t) {
    const v = 125 + rnd() * 25;
    ctx.fillStyle = `rgb(${v},${v - 3},${v - 8})`; ctx.fillRect(x + 1, y + 1, t - 2, t - 2);
  }
  noise(ctx, S, S, 4000, rnd, 0.1);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(30,25,20,0.12)'; ctx.beginPath(); ctx.ellipse(rnd() * S, rnd() * S, 10 + rnd() * 30, 6 + rnd() * 16, rnd() * 3, 0, 7); ctx.fill(); }
  return tex(c);
}

export function cobbleTexture() {
  const rnd = mulberry(41);
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#3c3a37'; ctx.fillRect(0, 0, S, S);
  const t = 16;
  for (let y = 0; y < S; y += t) for (let x = (y / t) % 2 ? t / 2 : 0; x < S + t; x += t) {
    const v = 85 + rnd() * 40;
    ctx.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
    ctx.beginPath(); ctx.roundRect(x - t / 2 + 1, y + 1, t - 2, t - 2, 4); ctx.fill();
  }
  noise(ctx, S, S, 3000, rnd, 0.1);
  return tex(c);
}

// --- Clothing / props -------------------------------------------------------

// PSG-style home shirt: navy with a central red band edged in white.
export function psgShirtTexture(variant = 0) {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = '#132447'; ctx.fillRect(0, 0, 128, 128);
  const w = variant === 1 ? 48 : 40;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(64 - w / 2 - 6, 0, w + 12, 128);
  ctx.fillStyle = '#d4202f'; ctx.fillRect(64 - w / 2, 0, w, 128);
  // collar trim + small badge circle (generic, no logo)
  ctx.fillStyle = '#d4202f'; ctx.fillRect(0, 0, 128, 5);
  ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(30, 30, 7, 0, 7); ctx.fill();
  ctx.fillStyle = '#132447'; ctx.beginPath(); ctx.arc(30, 30, 4.5, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
  ctx.fillText('PARIS', 64, 64);
  return tex(c, { repeat: false });
}

// Palestinian flag: black / white / green with red triangle at the hoist.
export function palestineFlagTexture() {
  const W = 256, H = 128;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, W, H / 3);
  ctx.fillStyle = '#f5f5f5'; ctx.fillRect(0, H / 3, W, H / 3);
  ctx.fillStyle = '#0a8a3d'; ctx.fillRect(0, (2 * H) / 3, W, H / 3 + 1);
  ctx.fillStyle = '#d61f26';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.38, H / 2); ctx.lineTo(0, H); ctx.fill();
  return tex(c, { repeat: false });
}

// Algerian flag: green (hoist) and white halves, red crescent and star.
export function algeriaFlagTexture() {
  const W = 256, H = 170;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#006233'; ctx.fillRect(0, 0, W / 2, H);
  ctx.fillStyle = '#f7f7f7'; ctx.fillRect(W / 2, 0, W / 2, H);
  const cx = W / 2, cy = H / 2, r = H * 0.25;
  ctx.fillStyle = '#d21034';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // cut the inner circle to form the crescent (paint with the background halves)
  ctx.save(); ctx.beginPath(); ctx.arc(cx + r * 0.25, cy, r * 0.8, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#006233'; ctx.fillRect(0, 0, W / 2, H);
  ctx.fillStyle = '#f7f7f7'; ctx.fillRect(W / 2, 0, W / 2, H);
  ctx.restore();
  // five-pointed star inside the crescent
  ctx.fillStyle = '#d21034';
  const sx = cx + r * 0.32, sy = cy, R1 = r * 0.36, R2 = R1 * 0.4;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? R2 : R1; ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
  return tex(c, { repeat: false });
}

export function franceFlagTexture() {
  const [c, ctx] = canvas(192, 128);
  ctx.fillStyle = '#1f3fa0'; ctx.fillRect(0, 0, 64, 128);
  ctx.fillStyle = '#f5f5f5'; ctx.fillRect(64, 0, 64, 128);
  ctx.fillStyle = '#e1262d'; ctx.fillRect(128, 0, 64, 128);
  return tex(c, { repeat: false });
}

// Red trade-union strike flag with a white slogan.
export function unionFlagTexture(text = 'GRÈVE') {
  const W = 256, H = 170;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#c8161d'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, H - 18, W, 18);
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  const size = lines.length > 1 ? 50 : 64;
  ctx.font = `900 ${size}px Impact, Arial Black, sans-serif`;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * (size + 4), W - 24));
  return tex(c, { repeat: false });
}

export function keffiyehTexture() {
  const [c, ctx] = canvas(64, 64);
  ctx.fillStyle = '#f0ede6'; ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 2;
  for (let i = -64; i < 128; i += 8) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 64, 64); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i + 64, 0); ctx.lineTo(i, 64); ctx.stroke(); }
  return tex(c);
}

export function placardTexture(text, bg = '#f4f1ea', fg = '#151515') {
  const [c, ctx] = canvas(256, 180);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 180);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 250, 174);
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  const size = lines.length > 1 ? 44 : 52;
  ctx.font = `900 ${size}px Impact, Arial Black, sans-serif`;
  lines.forEach((l, i) => ctx.fillText(l, 128, 90 + (i - (lines.length - 1) / 2) * (size + 6), 236));
  return tex(c, { repeat: false });
}

export function bannerTexture(text, bg = '#f2efe8', fg = '#b31b1b') {
  const [c, ctx] = canvas(1024, 192);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 192);
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 112px Impact, Arial Black, sans-serif';
  ctx.fillText(text, 512, 100, 980);
  // painted drips
  const rnd = mulberry(text.length * 13);
  for (let i = 0; i < 14; i++) { ctx.fillRect(80 + rnd() * 860, 140, 4, 10 + rnd() * 40); }
  return tex(c, { repeat: false });
}

export function streetSignTexture(line1, line2) {
  const [c, ctx] = canvas(256, 96);
  ctx.fillStyle = '#1d3f7a'; ctx.beginPath(); ctx.roundRect(0, 0, 256, 96, 10); ctx.fill();
  ctx.strokeStyle = '#e8eef7'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(6, 6, 244, 84, 8); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.font = '13px Arial'; ctx.fillText(line1, 128, 30);
  ctx.font = 'bold 26px Arial'; ctx.fillText(line2, 128, 66, 232);
  return tex(c, { repeat: false });
}

export function shieldTexture() {
  const [c, ctx] = canvas(128, 256);
  ctx.fillStyle = 'rgba(200,215,230,0.35)'; ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center';
  ctx.fillText('POLICE', 64, 150);
  ctx.strokeStyle = 'rgba(30,40,60,0.8)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 122, 250);
  return tex(c, { repeat: false });
}

export function vestTexture(text) {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = '#1a2233'; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#e8e8e8'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
  ctx.fillText(text, 64, 72);
  ctx.fillStyle = '#c9a53a'; ctx.fillRect(0, 100, 128, 6);
  return tex(c, { repeat: false });
}

export function policeTextTexture() {
  const [c, ctx] = canvas(256, 80);
  ctx.clearRect(0, 0, 256, 80);
  ctx.fillStyle = '#e9edf2'; ctx.font = 'bold 58px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('POLICE', 128, 42, 240);
  return tex(c, { repeat: false });
}

export function hairTexture() {
  const rnd = mulberry(91);
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1600; i++) {
    const v = 90 + rnd() * 140; ctx.strokeStyle = `rgba(${v},${v},${v},0.5)`; ctx.lineWidth = 1;
    const x = rnd() * 128, y = rnd() * 128; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 4, y + 3 + rnd() * 6); ctx.stroke();
  }
  return tex(c);
}

export function sootTexture() {
  const rnd = mulberry(55);
  const [c, ctx] = canvas(128, 256);
  for (let i = 0; i < 40; i++) {
    const x = 64 + (rnd() - 0.5) * 50, y = 60 + rnd() * 190, r = 20 + rnd() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.08 + (y / 256) * 0.1;
    g.addColorStop(0, `rgba(12,10,9,${a})`); g.addColorStop(1, 'rgba(12,10,9,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return tex(c, { repeat: false });
}

export function vanTexture() {
  // CRS van side: white/blue with stripes and POLICE lettering
  const [c, ctx] = canvas(512, 192);
  ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, 0, 512, 192);
  ctx.fillStyle = '#16337a'; ctx.fillRect(0, 108, 512, 34);
  ctx.fillStyle = '#d4202f'; ctx.fillRect(0, 142, 512, 8);
  ctx.fillStyle = '#16337a'; ctx.font = 'bold 54px Arial'; ctx.textAlign = 'center'; ctx.fillText('POLICE', 256, 90);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.fillText('C R S', 256, 133);
  // windows grilles
  ctx.fillStyle = '#1b222a'; ctx.fillRect(20, 14, 90, 46);
  ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
  for (let x = 24; x < 110; x += 8) { ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x, 60); ctx.stroke(); }
  return tex(c, { repeat: false });
}

export function softSpriteTexture() {
  const [c, ctx] = canvas(128, 128);
  const rnd = mulberry(77);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  // break up the disc with soft blobs for a smoky look
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 24; i++) {
    const x = rnd() * 128, y = rnd() * 128, r = 6 + rnd() * 18;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
    gg.addColorStop(0, 'rgba(0,0,0,0.35)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  return tex(c, { repeat: false, srgb: false });
}

export function ringTexture() {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 30, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return tex(c, { repeat: false, srgb: false });
}

export function beamTexture() {
  const [c, ctx] = canvas(64, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0.9)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 256);
  const h = ctx.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = h; ctx.fillRect(0, 0, 64, 256);
  return tex(c, { repeat: false, srgb: false });
}

export function railingTexture() {
  const [c, ctx] = canvas(256, 64);
  ctx.clearRect(0, 0, 256, 64);
  ctx.strokeStyle = '#151517'; ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 60);
  ctx.lineWidth = 2;
  for (let x = 8; x < 256; x += 10) { ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, 60); ctx.stroke(); }
  for (let x = 32; x < 256; x += 64) { ctx.beginPath(); ctx.arc(x, 32, 14, 0, 7); ctx.stroke(); }
  return tex(c, { srgb: true });
}

```

## src/touch.js

```js
// Touch controls: a floating stick on the left, drag-to-look on the right and
// a compact cluster of action buttons. Everything feeds Input (virtual keys,
// buttons and an analog axis), so gameplay code is the same as with a keyboard.
const $ = (id) => document.getElementById(id);

const LOOK_GAIN = 1.5;   // touch drag pixels -> mouse-look pixels
const STICK_R = 52;      // stick travel radius in CSS pixels
const DEADZONE = 0.18;

export class TouchControls {
  constructor(game) {
    this.game = game;
    this.input = game.input;
    this.root = $('touch-ui');
    this.base = $('stick-base');
    this.knob = $('stick-knob');
    this.stick = null;   // {id, x0, y0}
    this.looks = new Map(); // pointerId -> {x, y}
    this.sprint = false;
    this.enabled = false;
    if (this.input.touch) this.enable();
    // a touch on a hybrid laptop switches touch controls on for the session
    addEventListener('touchstart', () => this.enable(), { once: true, passive: true });

    this.root.addEventListener('pointerdown', (e) => this._down(e));
    this.root.addEventListener('pointermove', (e) => this._move(e));
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) this.root.addEventListener(ev, (e) => this._up(e));

    for (const b of this.root.querySelectorAll('[data-k]')) {
      const code = b.dataset.k;
      const press = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (b.classList.contains('toggle')) { this.sprint = !this.sprint; b.classList.toggle('on', this.sprint); this.input.setButton(code, this.sprint); return; }
        b.classList.add('on'); this.input.setButton(code, true);
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* synthetic event */ }
      };
      const release = (e) => {
        if (b.classList.contains('toggle')) return;
        e.preventDefault(); b.classList.remove('on'); this.input.setButton(code, false);
      };
      b.addEventListener('pointerdown', press);
      b.addEventListener('pointerup', release);
      b.addEventListener('pointercancel', release);
    }
    // the interaction prompt itself is the button for E on touch screens
    $('prompt').addEventListener('pointerdown', (e) => { if (!this.enabled) return; e.preventDefault(); this.input.setButton('KeyE', true); this.input.setButton('KeyE', false); });
    addEventListener('blur', () => this.releaseAll());
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.input.touch = true;
    document.body.classList.add('touch');
    this.input.unlock();
  }

  releaseAll() {
    this.stick = null; this.looks.clear();
    this.input.axis.x = this.input.axis.y = 0;
    this.base.classList.remove('active');
    for (const b of this.root.querySelectorAll('[data-k]')) {
      if (b.classList.contains('toggle')) continue;
      b.classList.remove('on'); this.input.setButton(b.dataset.k, false);
    }
  }

  _down(e) {
    if (!this.enabled || e.target.closest('button')) return;
    e.preventDefault();
    try { this.root.setPointerCapture(e.pointerId); } catch (err) { /* synthetic event */ }
    if (!this.stick && e.clientX < innerWidth * 0.42) {
      this.stick = { id: e.pointerId, x0: e.clientX, y0: e.clientY };
      this.base.style.left = e.clientX + 'px'; this.base.style.top = e.clientY + 'px';
      this.base.classList.add('active');
      this._knob(0, 0);
    } else this.looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  _move(e) {
    if (!this.enabled) return;
    if (this.stick && e.pointerId === this.stick.id) {
      let dx = e.clientX - this.stick.x0, dy = e.clientY - this.stick.y0;
      const d = Math.hypot(dx, dy);
      if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
      this._knob(dx, dy);
      const k = Math.min(1, d / STICK_R);
      const m = k < DEADZONE ? 0 : (k - DEADZONE) / (1 - DEADZONE);
      this.input.axis.x = d > 0 ? (dx / Math.min(d, STICK_R)) * m : 0;
      this.input.axis.y = d > 0 ? (dy / Math.min(d, STICK_R)) * m : 0;
      return;
    }
    const l = this.looks.get(e.pointerId);
    if (l) { this.input.look((e.clientX - l.x) * LOOK_GAIN, (e.clientY - l.y) * LOOK_GAIN); l.x = e.clientX; l.y = e.clientY; }
  }

  _up(e) {
    if (this.stick && e.pointerId === this.stick.id) {
      this.stick = null;
      this.input.axis.x = this.input.axis.y = 0;
      this.base.classList.remove('active');
      this._knob(0, 0);
    }
    this.looks.delete(e.pointerId);
  }

  _knob(dx, dy) { this.knob.style.transform = `translate(${dx}px, ${dy}px)`; }
}

```

## src/world.js

```js
// Procedural Parisian street environment: Haussmann blocks, boulevard, side
// streets, cafés, parked cars, CRS vans, barricades, debris and colliders.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as T from './textures.js';

export const LAYOUT = {
  roadHalf: 9,
  blvdHalf: 15,
  crossStreets: [
    { z: -110, half: 7, name: 'RUE OBERKAMPF' },
    { z: -20, half: 6, name: 'RUE DE MALTE' },
    { z: 70, half: 7, name: 'RUE JEAN-PIERRE TIMBAUD' },
  ],
  extentX: 140,
  extentZ: 230,
  bounds: { minX: -58, maxX: 58, minZ: -166, maxZ: 182 },
};

const rnd = T.mulberry(1234);
const R = (a, b) => a + (b - a) * rnd();
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

export class World {
  constructor(scene, renderer) {
    this.scene = scene;
    this.colliders = [];
    this.grid = new Map();
    this.cell = 8;
    this.buckets = new Map();
    this.materials = {};
    this.fires = [];        // persistent fire emitters {pos, scale}
    this.smokes = [];       // persistent smoke emitters
    this.roads = [];        // rects for minimap
    this.sidewalks = [];    // raised rects
    this.blocks = [];       // building footprints for minimap
    this.flags = [];        // static waving flags (cloth meshes)
    this.lightBars = [];
    this.gatherPoints = []; // crowd anchors
    T.setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
    this._initMaterials();
    this._buildSky();
    this._buildGround();
    this._buildBlocks();
    this._buildStreetFurniture();
    this._buildVehicles();
    this._buildBarricades();
    this._buildImpostorCrowds();
    this._flush();
  }

  // ---------------------------------------------------------------- materials
  _initMaterials() {
    const m = this.materials;
    const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
    m.facade = [0, 1, 2, 3].map((i) => std({ map: T.facadeTexture(i), roughness: 0.92 }));
    m.shop = Array.from({ length: T.SHOP_COUNT }, (_, i) => std({ map: T.shopTexture(i), roughness: 0.7 }));
    m.stone = std({ map: T.stoneTexture(), color: 0xe6dccb, side: THREE.DoubleSide });
    m.stoneDark = std({ color: 0x8c8371 });
    m.roof = std({ map: T.roofTexture(), roughness: 0.6, metalness: 0.3 });
    m.roofTop = std({ color: 0x4a5056, roughness: 0.7, metalness: 0.2 });
    m.chimney = std({ color: 0x9a5b3e });
    m.railing = std({ map: T.railingTexture(), transparent: false, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 });
    m.road = std({ map: T.asphaltTexture(true), roughness: 0.95 });
    m.roadPlain = std({ map: T.asphaltTexture(false), roughness: 0.95 });
    m.paving = std({ map: T.pavingTexture(), roughness: 0.92 });
    m.cobble = std({ map: T.cobbleTexture(), roughness: 0.9 });
    m.curb = std({ color: 0x9b978d });
    m.white = std({ color: 0xdedbd2, roughness: 0.8 });
    m.black = std({ color: 0x18191b, roughness: 0.6, metalness: 0.4 });
    m.metal = std({ color: 0x8a8f94, roughness: 0.45, metalness: 0.7 });
    m.darkMetal = std({ color: 0x2b2f33, roughness: 0.5, metalness: 0.6 });
    m.bark = std({ color: 0x6b6152 });
    m.leaves = std({ color: 0x4a5a32, roughness: 1 });
    m.leaves2 = std({ color: 0x5d6b3a, roughness: 1 });
    m.parisGreen = std({ color: 0x2f4a3a, roughness: 0.6, metalness: 0.3 });
    m.glass = std({ color: 0x1a2128, roughness: 0.15, metalness: 0.8 });
    m.tyre = std({ color: 0x141414, roughness: 0.9 });
    m.charred = std({ color: 0x1c1a19, roughness: 1 });
    m.rust = std({ color: 0x4a3426, roughness: 1 });
    m.wood = std({ color: 0x8a6a45 });
    m.cardboard = std({ color: 0xa88a5e });
    m.trash = std({ color: 0x2a2d2b, roughness: 0.6 });
    m.paper = std({ color: 0xd9d6cc, side: THREE.DoubleSide });
    m.binGreen = std({ color: 0x2d5a3a, roughness: 0.6 });
    m.vanSide = std({ map: T.vanTexture(), roughness: 0.5 });
    m.vanBody = std({ color: 0xe9ecef, roughness: 0.5 });
    m.vanBlue = std({ color: 0x16337a, roughness: 0.5 });
    m.headlight = std({ color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: 0.6 });
    m.taillight = std({ color: 0x550000, emissive: 0xff1010, emissiveIntensity: 0.5 });
    m.lightA = new THREE.MeshStandardMaterial({ color: 0x0a1a66, emissive: 0x2a5cff, emissiveIntensity: 0 });
    m.lightB = new THREE.MeshStandardMaterial({ color: 0x0a1a66, emissive: 0x2a5cff, emissiveIntensity: 0 });
    m.lamp = std({ color: 0xfff1cc, emissive: 0xffd9a0, emissiveIntensity: 0.4 });
    m.awnings = [0x7a1d1d, 0x1d4a2d, 0x1b2a4a, 0x6a4a1e].map((c) => std({ color: c, side: THREE.DoubleSide, roughness: 0.85 }));
    m.cars = [0x8b8f94, 0x1d1f22, 0xe2e2df, 0x3a4a5e, 0x6e1a1a, 0x2f3b33, 0xb5a98e, 0x50555c].map((c) => std({ color: c, roughness: 0.35, metalness: 0.55 }));
    m.scooter = std({ color: 0x3a8a5a, roughness: 0.4, metalness: 0.4 });
    m.morris = std({ color: 0x2c4a3c, roughness: 0.5, metalness: 0.2 });
    m.poster = std({ map: T.placardTexture('CONCERT\nOLYMPIA', '#e9c46a', '#1d3557') });
    m.metroSign = std({ map: T.placardTexture('M', '#f2c230', '#1a1a1a'), emissive: 0x332200, emissiveIntensity: 0.2 });
    m.ground = std({ color: 0x2b2a28 });
    m.fireRed = std({ color: 0x8e1414, roughness: 0.4, metalness: 0.3 });
    m.samuStripe = std({ color: 0xe86a12, roughness: 0.5 });
    m.soot = new THREE.MeshStandardMaterial({ map: T.sootTexture(), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });

    // Waving cloth shader shared by all flags/banners.
    this.clothUniforms = { uTime: { value: 0 } };
    this.makeCloth = (map, amp = 0.12) => {
      const mat = new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.9 });
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = this.clothUniforms.uTime;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uTime;')
          .replace('#include <begin_vertex>', `
            #include <begin_vertex>
            #ifdef USE_INSTANCING
              vec3 _wp = instanceMatrix[3].xyz;
            #else
              vec3 _wp = modelMatrix[3].xyz;
            #endif
            float _ph = _wp.x * 0.7 + _wp.z * 1.3;
            float _u = uv.x;
            transformed.z += sin(_u * 7.0 - uTime * 5.5 + _ph) * ${amp.toFixed(3)} * _u
                           + sin(_u * 13.0 - uTime * 8.0 + _ph * 1.7) * ${(amp * 0.35).toFixed(3)} * _u;
          `);
      };
      return mat;
    };
    m.palFlag = this.makeCloth(T.palestineFlagTexture(), 0.14);
    m.palFlagBig = this.makeCloth(T.palestineFlagTexture(), 0.25);
    m.frFlag = this.makeCloth(T.franceFlagTexture(), 0.12);
    m.palFlagStatic = new THREE.MeshStandardMaterial({ map: T.palestineFlagTexture(), side: THREE.DoubleSide, roughness: 0.9 });
    m.algFlag = this.makeCloth(T.algeriaFlagTexture(), 0.14);
    m.algFlagBig = this.makeCloth(T.algeriaFlagTexture(), 0.25);
    m.algFlagStatic = new THREE.MeshStandardMaterial({ map: T.algeriaFlagTexture(), side: THREE.DoubleSide, roughness: 0.9 });
    m.frFlagBig = this.makeCloth(T.franceFlagTexture(), 0.25);
    m.frFlagStatic = new THREE.MeshStandardMaterial({ map: T.franceFlagTexture(), side: THREE.DoubleSide, roughness: 0.9 });
    // red union strike flags
    m.uniFlag = this.makeCloth(T.unionFlagTexture('GRÈVE'), 0.14);
    m.uniFlagBig = this.makeCloth(T.unionFlagTexture('GRÈVE\nGÉNÉRALE'), 0.25);
    m.uniFlagStatic = new THREE.MeshStandardMaterial({ map: T.unionFlagTexture('TOUS\nENSEMBLE'), side: THREE.DoubleSide, roughness: 0.9 });
    m.binLid = std({ color: 0xe8c21a, roughness: 0.55 });
  }

  // ---------------------------------------------------------------- helpers
  add(matKey, geo) {
    if (!this.buckets.has(matKey)) this.buckets.set(matKey, []);
    // normalise attribute sets so merging works
    if (!geo.index) geo = geo; // all our primitives are indexed
    for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
    this.buckets.get(matKey).push(geo);
  }

  mat(key) {
    const parts = key.split(':');
    let m = this.materials[parts[0]];
    if (parts.length > 1) m = m[+parts[1]];
    return m;
  }

  box(matKey, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0, uvScale) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (uvScale) scaleUV(g, uvScale[0], uvScale[1]);
    const e = new THREE.Euler(rx, ry, rz, 'YXZ');
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(e));
    g.translate(x, y, z);
    this.add(matKey, g);
    return g;
  }

  cyl(matKey, rt, rb, h, x, y, z, seg = 10, rx = 0, rz = 0, ry = 0) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')));
    g.translate(x, y, z);
    this.add(matKey, g);
  }

  // Plane with given basis; origin = bottom-left corner.
  quad(matKey, origin, uDir, vDir, w, h, u1 = 1, v1 = 1, u0 = 0, v0 = 0) {
    const g = new THREE.PlaneGeometry(1, 1);
    const pos = g.attributes.position, uv = g.attributes.uv;
    // PlaneGeometry vertices: (-.5,.5) (.5,.5) (-.5,-.5) (.5,-.5)
    for (let i = 0; i < 4; i++) {
      const px = pos.getX(i) + 0.5, py = pos.getY(i) + 0.5;
      const p = origin.clone().addScaledVector(uDir, px * w).addScaledVector(vDir, py * h);
      pos.setXYZ(i, p.x, p.y, p.z);
      uv.setXY(i, u0 + px * (u1 - u0), v0 + py * (v1 - v0));
    }
    g.computeVertexNormals();
    this.add(matKey, g);
    return g;
  }

  addCollider(minX, minZ, maxX, maxZ, h = 30, tag = 'static') {
    const c = { minX, minZ, maxX, maxZ, h, tag };
    this.colliders.push(c);
    const cs = this.cell;
    for (let gx = Math.floor(minX / cs); gx <= Math.floor(maxX / cs); gx++)
      for (let gz = Math.floor(minZ / cs); gz <= Math.floor(maxZ / cs); gz++) {
        const k = gx * 10007 + gz;
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(c);
      }
    return c;
  }

  addColliderRotated(cx, cz, w, d, ry, h) {
    // AABB of a rotated rectangle (good enough for props)
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
    return this.addCollider(cx - hw, cz - hd, cx + hw, cz + hd, h);
  }

  _flush() {
    for (const [key, geos] of this.buckets) {
      const merged = mergeGeometries(geos, false);
      if (!merged) { console.warn('merge failed', key); continue; }
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, this.mat(key));
      const noShadow = ['road', 'roadPlain', 'paving', 'cobble', 'ground', 'paper', 'soot'];
      mesh.castShadow = !noShadow.includes(key) && !key.startsWith('shop') && !key.startsWith('facade');
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
      geos.forEach((g) => g.dispose());
    }
    this.buckets.clear();
  }

  // ---------------------------------------------------------------- sky
  _buildSky() {
    const geo = new THREE.SphereGeometry(900, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      // colours are uniforms so a lighting preset can change them without a recompile
      uniforms: {
        uHorizon: { value: new THREE.Vector3(0.62, 0.56, 0.50) },
        uLow: { value: new THREE.Vector3(0.50, 0.47, 0.45) },
        uTop: { value: new THREE.Vector3(0.24, 0.27, 0.31) },
        uGlow: { value: new THREE.Vector3(0.9, 0.55, 0.28) },
        uGlowK: { value: 0.45 },
        uHaze: { value: new THREE.Vector3(0.38, 0.33, 0.30) },
      },
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `varying vec3 vP;
        uniform vec3 uHorizon, uLow, uTop, uGlow, uHaze; uniform float uGlowK;
        void main(){
          float h = vP.y;
          vec3 c = mix(uHorizon, uLow, smoothstep(0.0, 0.12, h));
          c = mix(c, uTop, smoothstep(0.12, 0.7, h));
          // sun glow behind the clouds (west); a fire-lit glow at night
          vec3 sd = normalize(vec3(-0.6, 0.18, -0.55));
          float s = max(dot(vP, sd), 0.0);
          c += uGlow * pow(s, 10.0) * uGlowK;
          // smoke-stained haze near the horizon
          c = mix(c, uHaze, smoothstep(0.25, 0.0, abs(h-0.02)) * 0.25);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const sky = new THREE.Mesh(geo, mat);
    sky.renderOrder = -1;
    this.sky = sky;
    this.scene.add(sky);
  }

  setSky(s) {
    const u = this.sky.material.uniforms;
    u.uHorizon.value.set(...s.horizon); u.uLow.value.set(...s.low); u.uTop.value.set(...s.top);
    u.uGlow.value.set(...s.glow); u.uGlowK.value = s.glowK; u.uHaze.value.set(...s.haze);
  }

  // ---------------------------------------------------------------- ground
  _buildGround() {
    const L = LAYOUT, E = L.extentZ, X = L.extentX;
    // base ground (under everything)
    this.quad('ground', new THREE.Vector3(-X - 50, -0.05, E + 50), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), 2 * X + 100, 2 * E + 100);
    // boulevard road
    this.quad('road', new THREE.Vector3(-L.roadHalf, 0, E), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), 2 * L.roadHalf, 2 * E, 1, (2 * E) / 18);
    this.roads.push({ x0: -L.blvdHalf, z0: -E, x1: L.blvdHalf, z1: E });
    // cross streets
    for (const s of L.crossStreets) {
      const rh = s.half - 2.5;
      for (const side of [-1, 1]) {
        const x0 = side > 0 ? L.roadHalf : -X, x1 = side > 0 ? X : -L.roadHalf;
        this.quad('roadPlain', new THREE.Vector3(x0, 0.002, s.z + rh), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), x1 - x0, 2 * rh, (x1 - x0) / 14, (2 * rh) / 14);
        // cross street sidewalks
        for (const zs of [-1, 1]) {
          const zc = s.z + zs * (s.half - 1.25);
          this._sidewalk(side > 0 ? L.blvdHalf : -X, zc - 1.25, side > 0 ? X : -L.blvdHalf, zc + 1.25);
        }
      }
      this.roads.push({ x0: -X, z0: s.z - s.half, x1: X, z1: s.z + s.half });
      // crosswalks across the boulevard
      for (const zs of [-1, 1]) {
        const zc = s.z + zs * (s.half + 2.2);
        for (let x = -L.roadHalf + 0.8; x < L.roadHalf - 0.5; x += 1.2)
          this.box('white', 0.6, 0.012, 3.2, x + 0.3, 0.006, zc);
      }
      for (const xs of [-1, 1]) {
        const xc = xs * (L.roadHalf + 1.5);
        for (let z = s.z - rh + 0.6; z < s.z + rh - 0.4; z += 1.2) this.box('white', 3.0, 0.012, 0.6, xc, 0.006, z + 0.3);
      }
    }
    // boulevard sidewalks, split by cross streets
    const zs = [-E, ...L.crossStreets.flatMap((s) => [s.z - s.half, s.z + s.half]), E];
    for (let i = 0; i < zs.length; i += 2) {
      for (const side of [-1, 1]) {
        const x0 = side > 0 ? L.roadHalf : -L.blvdHalf, x1 = side > 0 ? L.blvdHalf : -L.roadHalf;
        this._sidewalk(x0, zs[i], x1, zs[i + 1]);
      }
    }
  }

  _sidewalk(x0, z0, x1, z1) {
    const h = 0.14, w = x1 - x0, d = z1 - z0;
    const g = new THREE.BoxGeometry(w, h, d);
    // top-face UVs in metres / 4
    const uv = g.attributes.uv, pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + x0 + w / 2) / 4, (pos.getZ(i) + z0 + d / 2) / 4);
    g.translate(x0 + w / 2, h / 2, z0 + d / 2);
    this.add('paving', g);
    this.sidewalks.push({ x0, z0, x1, z1 });
  }

  groundHeight(x, z) {
    for (const s of this.sidewalks) if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1) return 0.14;
    return 0;
  }

  // ---------------------------------------------------------------- buildings
  _buildBlocks() {
    const L = LAYOUT, E = L.extentZ, X = L.extentX;
    const edges = [-E];
    for (const s of L.crossStreets) edges.push(s.z - s.half, s.z + s.half);
    edges.push(E);
    let shopIdx = 0;
    for (let i = 0; i < edges.length; i += 2) {
      const za = edges[i], zb = edges[i + 1];
      for (const side of [-1, 1]) {
        const xFront = side * L.blvdHalf;
        const depth = 14;
        // Boulevard frontage, facing the road (normal = -side on x)
        const n = new THREE.Vector3(-side, 0, 0);
        const dir = new THREE.Vector3(0, 0, side); // walking along frontage so that n x dir points up correctly
        this._frontage(new THREE.Vector3(xFront, 0, side > 0 ? za : zb), dir, n, zb - za, depth, () => shopIdx++);
        const blkX0 = side > 0 ? L.blvdHalf : -X, blkX1 = side > 0 ? X : -L.blvdHalf;
        this.blocks.push({ x0: blkX0, z0: za, x1: blkX1, z1: zb });
        // cross-street frontages (only where the edge borders a street)
        const xStart = side * (L.blvdHalf + depth), len = X - (L.blvdHalf + depth);
        if (i > 0) { // north edge borders street at za, facing -z
          const nn = new THREE.Vector3(0, 0, -1);
          const d = new THREE.Vector3(side > 0 ? 1 : -1, 0, 0);
          // choose origin so that facade faces nn: dir x up must equal nn
          const o = side > 0 ? new THREE.Vector3(xStart, 0, za) : new THREE.Vector3(xStart, 0, za);
          this._frontage(o, d, nn, len, depth, () => shopIdx++);
        }
        if (i < edges.length - 2) {
          const nn = new THREE.Vector3(0, 0, 1);
          const d = new THREE.Vector3(side > 0 ? 1 : -1, 0, 0);
          this._frontage(new THREE.Vector3(xStart, 0, zb), d, nn, len, depth, () => shopIdx++);
        }
        // interior filler (keeps the roofscape solid from distance)
        const fx0 = side > 0 ? L.blvdHalf + depth - 0.5 : -X, fx1 = side > 0 ? X : -(L.blvdHalf + depth - 0.5);
        const fz0 = za + (i > 0 ? depth - 0.5 : 0), fz1 = zb - (i < edges.length - 2 ? depth - 0.5 : 0);
        if (fz1 > fz0) this.box('roofTop', fx1 - fx0, 20, fz1 - fz0, (fx0 + fx1) / 2, 10, (fz0 + fz1) / 2);
        this.addCollider(Math.min(blkX0, blkX1), za, Math.max(blkX0, blkX1), zb, 40, 'building');
      }
    }
  }

  // Builds a run of Haussmann buildings along a frontage line.
  _frontage(origin, dir, normal, length, depth, nextShop) {
    const up = new THREE.Vector3(0, 1, 0);
    // ensure facade faces `normal`: plane normal = uDir x vDir
    const testN = new THREE.Vector3().crossVectors(dir, up);
    let o = origin.clone(), d = dir.clone();
    if (testN.dot(normal) < 0) { o.addScaledVector(d, length); d.negate(); }
    const inward = normal.clone().negate();
    let t = 0;
    while (t < length - 0.1) {
      let w = pick([12, 18, 18, 24]);
      if (length - t < w + 6) w = length - t;
      const floors = rnd() < 0.35 ? 4 : 5;
      const style = Math.floor(rnd() * 4);
      const shop = nextShop() % T.SHOP_COUNT;
      this._building(o.clone().addScaledVector(d, t), d, inward, normal, w, depth, floors, style, shop);
      t += w;
    }
  }

  _building(p0, d, inward, n, w, depth, floors, style, shop) {
    const up = new THREE.Vector3(0, 1, 0);
    const GH = 4.5, FH = 3.1;
    const H = GH + floors * FH;
    const bays = w / 6;
    const out = (v, k) => v.clone().addScaledVector(n, k);
    // ground floor shops
    this.quad(`shop:${shop}`, out(p0, 0.02), d, up, w, GH, bays, 1);
    // upper façade
    this.quad(`facade:${style}`, out(p0.clone().setY(GH), 0.0), d, up, w, floors * FH, bays, floors / 5);
    // cornices
    const mid = p0.clone().addScaledVector(d, w / 2);
    const ang = Math.atan2(d.x, d.z) + Math.PI / 2;
    const cornice = (y, depthOut, hgt) => {
      const g = new THREE.BoxGeometry(w, hgt, depthOut);
      g.rotateY(ang);
      const c = out(mid, depthOut / 2 - 0.05); g.translate(c.x, y, c.z);
      this.add('stone', g);
    };
    cornice(GH, 0.35, 0.3);
    cornice(H - 0.15, 0.6, 0.35);
    // continuous balconies on 2nd and 5th floor
    for (const f of [1, 4]) {
      if (f >= floors) continue;
      const y = GH + f * FH + 0.02;
      cornice(y, 0.85, 0.14);
      const railO = out(p0.clone().setY(y + 0.07), 0.8);
      this.quad('railing', railO, d, up, w, 1.0, w / 3, 1);
    }
    // awning over shops that are open
    if (shop !== 5 && shop !== 7 && rnd() < 0.8) {
      const aw = new THREE.PlaneGeometry(w - 1.2, 1.8);
      aw.rotateX(-Math.PI / 2 - 0.45);
      aw.rotateY(ang);
      const c = out(mid, 0.85); aw.translate(c.x, GH - 0.55, c.z);
      this.add(`awnings:${Math.floor(rnd() * 4)}`, aw);
    }
    // mansard roof (sloped zinc with dormers) + flat top
    const slope = new THREE.Vector3().addScaledVector(up, 3.4).addScaledVector(inward, 2.0);
    const sl = slope.length(); slope.normalize();
    this.quad('roof', p0.clone().setY(H), d, slope, w, sl, bays, 1);
    const topW = depth - 2.0;
    const tg = new THREE.BoxGeometry(w, 0.3, topW);
    tg.rotateY(ang);
    const tc = mid.clone().addScaledVector(inward, 2.0 + topW / 2); tg.translate(tc.x, H + 3.4 - 0.15, tc.z);
    this.add('roofTop', tg);
    // side walls
    for (const end of [0, w]) {
      const s0 = p0.clone().addScaledVector(d, end);
      this.quad('stone', s0, inward, up, depth, H, depth / 4, H / 4);
    }
    // chimneys
    const nc = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < nc; k++) {
      const c = p0.clone().addScaledVector(d, R(1.5, w - 1.5)).addScaledVector(inward, R(4, depth - 2));
      this.box('chimney', R(0.8, 1.8), R(1.2, 2.2), 0.7, c.x, H + 3.6, c.z, ang);
    }
    // occasional hanging flags / banners from balconies
    const r = rnd();
    if (floors > 1 && r < 0.12) {
      const f = rnd();
      this._hangingFlag(out(p0.clone().addScaledVector(d, R(2, w - 2)).setY(GH + FH + 1.0), 0.9), n, f < 0.35 ? 'palFlagStatic' : f < 0.55 ? 'algFlagStatic' : f < 0.85 ? 'frFlagStatic' : 'uniFlagStatic');
    }
  }

  _hangingFlag(pos, n, matKey) {
    const g = new THREE.PlaneGeometry(1.4, 0.9);
    g.translate(0, -0.45, 0);
    const m = new THREE.Mesh(g, this.mat(matKey));
    m.position.copy(pos);
    m.rotation.y = Math.atan2(n.x, n.z);
    m.rotation.x = 0.08;
    this.scene.add(m);
  }

  // ---------------------------------------------------------------- props
  _buildStreetFurniture() {
    const L = LAYOUT;
    const nearCross = (z, pad = 9) => L.crossStreets.some((s) => Math.abs(z - s.z) < s.half + pad);
    // trees & lamps along boulevard
    for (let z = -220; z <= 220; z += 14) {
      for (const side of [-1, 1]) {
        if (nearCross(z)) continue;
        const x = side * 12.2;
        this._tree(x, z + (side > 0 ? 0 : 7));
        if (Math.abs(z) % 28 === 0) this._lamp(side * 9.6, z + 3, side);
      }
    }
    // café terraces + benches + bins on the sidewalks of the playable area
    for (let z = -160; z <= 175; z += 9) {
      for (const side of [-1, 1]) {
        if (nearCross(z, 4)) continue;
        const r = rnd();
        const x = side * 13.6;
        if (r < 0.22) this._terrace(x, z, side);
        else if (r < 0.32) this._bin(side * 10.0, z + 2, rnd() < 0.5);
        else if (r < 0.4) this._bench(side * 10.4, z + 4, side);
        else if (r < 0.5) this._scooter(side * 10.3, z + 1, rnd() < 0.5);
      }
    }
    // Morris column, Métro sign, kiosk at Rue de Malte intersection
    this._morris(12.0, -32);
    this._metro(-12.0, -8.5);
    this._morris(-12.0, 84);
    // street signs at corners
    for (const s of L.crossStreets) {
      for (const xs of [-1, 1]) for (const zs of [-1, 1]) {
        const x = xs * (L.blvdHalf - 0.02), z = s.z + zs * (s.half + 0.8);
        const tex = zs < 0 ? T.streetSignTexture('11e Arr.', 'BD DE LA RÉPUBLIQUE') : T.streetSignTexture('11e Arr.', s.name);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.38), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }));
        m.position.set(x, 3.4, z);
        m.rotation.y = xs > 0 ? -Math.PI / 2 : Math.PI / 2;
        this.scene.add(m);
      }
    }
    // debris field
    for (let i = 0; i < 260; i++) {
      const x = R(-14, 14), z = R(-165, 165);
      const k = rnd(), gy = this.groundHeight(x, z) - 0.14;
      if (k < 0.35) this.box('paper', R(0.2, 0.4), 0.005, R(0.25, 0.35), x, gy + 0.15 + 0.01, z, rnd() * 6);
      else if (k < 0.55) this.box('stoneDark', R(0.12, 0.24), 0.1, R(0.08, 0.14), x, gy + 0.19, z, rnd() * 6); // cobbles / bricks
      else if (k < 0.7) this.cyl('glass', 0.035, 0.035, 0.26, x, gy + 0.18, z, 6, Math.PI / 2, 0, rnd() * 6); // bottles
      else if (k < 0.82) this.box('cardboard', R(0.4, 0.7), R(0.05, 0.3), R(0.3, 0.6), x, gy + 0.22, z, rnd() * 6, 0, R(-0.2, 0.2));
      else if (k < 0.9) this.box('trash', R(0.4, 0.6), 0.35, 0.4, x, gy + 0.32, z, rnd() * 6); // rubbish bags
      else this.box('metal', 0.9, 0.03, 0.04, x, gy + 0.17, z, rnd() * 6); // bent barrier pieces
    }
    // overturned dumpsters & burning bins as small fires
    const fireSpots = [[-4, 62], [5.5, 18], [-6, -58], [3, -95], [-2.5, -138], [7, 104]];
    for (const [x, z] of fireSpots) {
      this._wheelieBin(x, z, true);
      this.fires.push({ pos: new THREE.Vector3(x, 0.6, z), scale: 0.8 });
      this.smokes.push({ pos: new THREE.Vector3(x, 1.2, z), rate: 0.9 });
    }
    for (let i = 0; i < 14; i++) this._wheelieBin(R(-8, 8), R(-160, 165), rnd() < 0.6);
    // burning rubbish heaps and scooters on the pavements
    const heaps = [[-11.6, 118], [12.2, 52], [-12.0, -40], [11.4, -72], [-6, 8], [3.5, -150], [9.5, 92], [-10.5, 30]];
    for (const [x, z] of heaps) {
      for (let k = 0; k < 6; k++) this.box(rnd() < 0.5 ? 'trash' : 'cardboard', R(0.4, 0.8), R(0.25, 0.5), R(0.4, 0.7), x + R(-0.7, 0.7), this.groundHeight(x, z) + 0.15, z + R(-0.7, 0.7), rnd() * 6, R(-0.2, 0.2));
      this.box('charred', 1.8, 0.04, 1.8, x, this.groundHeight(x, z) + 0.02, z);
      this.addCollider(x - 0.8, z - 0.8, x + 0.8, z + 0.8, 0.8);
      this.fires.push({ pos: new THREE.Vector3(x, this.groundHeight(x, z) + 0.3, z), scale: 0.75 + rnd() * 0.4 });
      this.smokes.push({ pos: new THREE.Vector3(x, 1.2, z), rate: 1.0, scale: 1 });
    }
    // fires further away: down the side streets and the far end of the boulevard
    const far = [[80, 70, 1.6], [-92, 72, 1.3], [74, -19, 1.8], [-70, -22, 1.5], [96, -110, 1.4], [-82, -108, 1.7], [-6, -198, 2.0], [9, -214, 1.6], [0, 205, 1.2]];
    for (const [x, z, sc] of far) {
      if (Math.abs(x) > 20) this._car(x, z, rnd() * 3, 1, 'burnt');
      this.fires.push({ pos: new THREE.Vector3(x, 1.0, z), scale: sc });
      this.smokes.push({ pos: new THREE.Vector3(x, 2.0, z), rate: 2.4, scale: 1.6 });
    }
    // smoke stains on façades above the nearest fires
    for (const [x, z] of [[-11.6, 118], [12.2, 52], [-12.0, -40], [11.4, -72], [-10.5, 30], [9.5, 92]]) {
      const sx = x > 0 ? 14.95 : -14.95;
      const g = new THREE.PlaneGeometry(4.5, 7);
      g.rotateY(x > 0 ? -Math.PI / 2 : Math.PI / 2);
      g.translate(sx, 4.6, z);
      this.add('soot', g);
    }
    // gather points for the crowd
    this.gatherPoints.push(
      new THREE.Vector3(0, 0, 95), new THREE.Vector3(-4, 0, 82), new THREE.Vector3(5, 0, 110),
      new THREE.Vector3(0, 0, 50), new THREE.Vector3(-5, 0, 28), new THREE.Vector3(6, 0, -5),
      new THREE.Vector3(-2, 0, -20), new THREE.Vector3(0, 0, -45), new THREE.Vector3(3, 0, -75),
      new THREE.Vector3(-30, 0, 70), new THREE.Vector3(32, 0, -20), new THREE.Vector3(-34, 0, -110),
      new THREE.Vector3(40, 0, 70), new THREE.Vector3(-42, 0, -20), new THREE.Vector3(44, 0, -110), new THREE.Vector3(24, 0, 71),
    );
  }

  _tree(x, z) {
    const h = R(4.5, 5.5);
    this.cyl('bark', 0.16, 0.24, h, x, h / 2, z, 7);
    // grille
    this.box('darkMetal', 1.6, 0.03, 1.6, x, 0.155, z);
    for (let k = 0; k < 4; k++) {
      const g = new THREE.IcosahedronGeometry(R(1.6, 2.3), 1);
      g.scale(1, 0.75, 1);
      g.translate(x + R(-1.2, 1.2), h + R(0.3, 1.8), z + R(-1.2, 1.2));
      g.deleteAttribute('uv'); const uvs = new Float32Array(g.attributes.position.count * 2); g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      this.add(rnd() < 0.5 ? 'leaves' : 'leaves2', g.index ? g : toIndexed(g));
    }
    this.addCollider(x - 0.3, z - 0.3, x + 0.3, z + 0.3, h);
  }

  _lamp(x, z, side) {
    this.cyl('black', 0.06, 0.1, 5.5, x, 2.75, z, 8);
    this.box('black', 0.08, 0.08, 1.2, x - side * 0.5, 5.4, z, Math.PI / 2);
    this.box('lamp', 0.32, 0.4, 0.32, x - side * 1.0, 5.15, z);
    this.addCollider(x - 0.15, z - 0.15, x + 0.15, z + 0.15, 5);
  }

  _terrace(x, z, side) {
    for (let k = 0; k < 2; k++) {
      const tz = z + k * 2.2, tx = x - side * R(0, 0.6);
      const over = rnd() < 0.3;
      if (over) {
        this.cyl('metal', 0.35, 0.35, 0.03, tx, 0.35, tz, 12, Math.PI / 2 - 0.2, 0, rnd() * 6);
      } else {
        this.cyl('metal', 0.35, 0.35, 0.03, tx, 0.86, tz, 12);
        this.cyl('darkMetal', 0.03, 0.03, 0.72, tx, 0.5, tz, 6);
      }
      for (const cz of [-0.6, 0.6]) {
        const fallen = rnd() < 0.3;
        this.box('wood', 0.42, 0.04, 0.42, tx + R(-0.4, 0.4), fallen ? 0.24 : 0.6, tz + cz, rnd() * 3, fallen ? 1.3 : 0);
        if (!fallen) this.box('wood', 0.42, 0.45, 0.04, tx, 0.85, tz + cz * 1.35);
      }
      this.addCollider(tx - 0.45, tz - 0.45, tx + 0.45, tz + 0.45, 0.9);
    }
  }

  _bin(x, z, toppled) {
    // Paris "Vigipirate" hoop bin
    if (toppled) {
      this.cyl('binGreen', 0.22, 0.22, 0.6, x + 0.4, 0.22, z, 10, 0, Math.PI / 2);
    } else {
      this.cyl('darkMetal', 0.03, 0.03, 1.0, x, 0.5, z, 6);
      this.cyl('binGreen', 0.24, 0.22, 0.62, x, 0.6, z, 10);
    }
    this.addCollider(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 1);
  }

  _wheelieBin(x, z, toppled) {
    const ry = rnd() * 6;
    if (toppled) {
      this.box('binGreen', 0.7, 1.05, 0.8, x, 0.38, z, ry, 0, Math.PI / 2);
    } else {
      this.box('binGreen', 0.7, 1.05, 0.8, x, 0.55, z, ry);
      this.box(rnd() < 0.5 ? 'binLid' : 'binGreen', 0.74, 0.06, 0.85, x, 1.1, z, ry); // yellow lid = recycling bin
    }
    this.addColliderRotated(x, z, 1.0, 0.8, ry, 1.1);
  }

  _bench(x, z, side) {
    this.box('parisGreen', 0.5, 0.06, 1.8, x, 0.45, z);
    this.box('parisGreen', 0.06, 0.5, 1.8, x + side * 0.24, 0.72, z);
    for (const dz of [-0.75, 0.75]) this.box('darkMetal', 0.45, 0.45, 0.06, x, 0.22, z + dz);
    this.addCollider(x - 0.3, z - 0.95, x + 0.3, z + 0.95, 0.9);
  }

  _scooter(x, z, fallen) {
    const ry = R(-0.4, 0.4);
    const g = (w, h, d, oy, oz, m = 'scooter') => this.box(m, w, h, d, x, oy, z + oz, ry, 0, fallen ? 1.4 : 0);
    if (fallen) { this.box('scooter', 0.12, 0.08, 1.0, x + 0.15, 0.08, z, ry); this.box('darkMetal', 0.03, 1.0, 0.03, x + 0.5, 0.06, z + 0.45, ry, 0, Math.PI / 2); }
    else { g(0.14, 0.08, 1.0, 0.12, 0); g(0.04, 1.05, 0.04, 0.6, 0.45, 'darkMetal'); g(0.45, 0.03, 0.03, 1.12, 0.45, 'darkMetal'); }
    this.addCollider(x - 0.3, z - 0.55, x + 0.3, z + 0.55, 1.0);
  }

  _morris(x, z) {
    this.cyl('morris', 0.75, 0.75, 0.4, x, 0.2, z, 18);
    this.cyl('poster', 0.68, 0.68, 2.6, x, 1.7, z, 18);
    this.cyl('morris', 0.78, 0.7, 0.25, x, 3.1, z, 18);
    const dome = new THREE.SphereGeometry(0.72, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.translate(x, 3.2, z); this.add('morris', dome);
    this.cyl('morris', 0.04, 0.12, 0.5, x, 3.95, z, 8);
    this.addCollider(x - 0.8, z - 0.8, x + 0.8, z + 0.8, 4);
  }

  _metro(x, z) {
    this.cyl('darkMetal', 0.07, 0.07, 3.6, x, 1.8, z, 8);
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), this.materials.metroSign);
    m.position.set(x + 0.08, 3.4, z); m.rotation.y = Math.PI / 2;
    this.scene.add(m);
    const m2 = m.clone(); m2.position.x = x - 0.08; m2.rotation.y = -Math.PI / 2; this.scene.add(m2);
    // stair railings
    this.box('darkMetal', 0.05, 0.9, 4.0, x + 1.2, 0.6, z + 3);
    this.box('darkMetal', 0.05, 0.9, 4.0, x - 1.2, 0.6, z + 3);
    this.box('darkMetal', 2.4, 0.9, 0.05, x, 0.6, z + 5);
    this.addCollider(x - 1.3, z - 0.2, x + 1.3, z + 5.1, 1);
  }

  // ---------------------------------------------------------------- vehicles
  _car(x, z, ry, color, state = 'ok') {
    const mat = state === 'burnt' ? 'charred' : `cars:${color}`;
    const glass = state === 'burnt' ? 'rust' : 'glass';
    const rz = state === 'flipped' ? Math.PI : state === 'side' ? Math.PI / 2 : 0;
    const lift = state === 'flipped' ? 1.45 : state === 'side' ? 0.9 : 0;
    const B = (m, w, h, d, ox, oy, oz) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(ox, oy, oz);
      g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, ry, rz, 'YXZ')));
      g.translate(x, lift, z);
      this.add(m, g);
    };
    B(mat, 1.78, 0.62, 4.2, 0, 0.62, 0);
    B(mat, 1.6, 0.5, 2.2, 0, 1.18, -0.2);
    B(glass, 1.62, 0.42, 2.0, 0, 1.18, -0.2);
    B(glass, 1.5, 0.38, 0.05, 0, 1.2, 0.92);
    if (state !== 'burnt') { B('headlight', 0.35, 0.12, 0.05, 0.6, 0.72, 2.1); B('headlight', 0.35, 0.12, 0.05, -0.6, 0.72, 2.1); B('taillight', 0.3, 0.12, 0.05, 0.62, 0.75, -2.1); B('taillight', 0.3, 0.12, 0.05, -0.62, 0.75, -2.1); }
    for (const wx of [-0.82, 0.82]) for (const wz of [-1.35, 1.35]) {
      const g = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12);
      g.rotateZ(Math.PI / 2); g.translate(wx, 0.33, wz);
      g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, ry, rz, 'YXZ')));
      g.translate(x, lift, z);
      this.add(state === 'burnt' ? 'rust' : 'tyre', g);
    }
    this.addColliderRotated(x, z, state === 'side' ? 1.6 : 1.9, 4.3, ry, 1.6);
  }

  _van(x, z, ry, police, variant = police ? 'police' : 'civ') {
    const B = (m, w, h, d, ox, oy, oz) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(ox, oy, oz);
      g.rotateY(ry); g.translate(x, 0, z);
      this.add(m, g);
      return g;
    };
    const body = variant === 'fire' ? 'fireRed' : variant === 'samu' ? 'vanBody' : police ? 'vanBody' : `cars:${Math.floor(rnd() * 8)}`;
    if (variant === 'fire' || variant === 'samu') police = false;
    B(body, 2.1, 2.2, 5.6, 0, 1.45, -0.3);
    B(body, 2.0, 1.1, 1.0, 0, 0.95, 2.9);
    B('glass', 1.9, 0.75, 0.9, 0, 1.9, 2.45);
    if (police) {
      // side livery panels
      for (const s of [-1, 1]) {
        const g = new THREE.PlaneGeometry(5.2, 1.9);
        g.rotateY(s * Math.PI / 2); g.translate(s * 1.056, 1.5, -0.4);
        g.rotateY(ry); g.translate(x, 0, z);
        this.add('vanSide', g);
      }
      B('vanBlue', 2.12, 0.3, 1.02, 0, 0.6, 2.9);
      B('darkMetal', 1.9, 0.4, 0.3, 0, 0.7, 3.45); // bull bar
      // roof light bar: two halves that alternate
      for (const [i, s] of [[0, -1], [1, 1]]) {
        const g = new THREE.BoxGeometry(0.75, 0.16, 0.3);
        g.translate(s * 0.42, 2.66, 1.8); g.rotateY(ry); g.translate(x, 0, z);
        const mesh = new THREE.Mesh(g, i ? this.materials.lightB : this.materials.lightA);
        this.scene.add(mesh);
      }
      this.lightBars.push(new THREE.Vector3(x, 2.9, z).add(new THREE.Vector3(0, 0, 1.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry)));
    }
    if (variant === 'fire' || variant === 'samu') {
      if (variant === 'samu') { B('samuStripe', 2.13, 0.28, 5.62, 0, 1.0, -0.3); B('samuStripe', 2.13, 0.12, 5.62, 0, 1.55, -0.3); }
      else { B('white', 2.13, 0.1, 5.62, 0, 1.1, -0.3); B('darkMetal', 1.6, 0.12, 4.6, 0, 2.62, -0.6); }
      for (const [i, sgn] of [[0, -1], [1, 1]]) {
        const g = new THREE.BoxGeometry(0.75, 0.16, 0.3);
        g.translate(sgn * 0.42, 2.66, 1.8); g.rotateY(ry); g.translate(x, 0, z);
        this.scene.add(new THREE.Mesh(g, i ? this.materials.lightB : this.materials.lightA));
      }
      this.lightBars.push(new THREE.Vector3(x, 2.9, z).add(new THREE.Vector3(0, 0, 1.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry)));
    }
    for (const wx of [-0.95, 0.95]) for (const wz of [-2.0, 2.4]) {
      const g = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 12);
      g.rotateZ(Math.PI / 2); g.translate(wx, 0.38, wz); g.rotateY(ry); g.translate(x, 0, z);
      this.add('tyre', g);
    }
    this.addColliderRotated(x, z + Math.cos(ry) * 0.1, 2.2, 6.6, ry, 2.6);
  }

  _buildVehicles() {
    const L = LAYOUT;
    // parked cars along the boulevard curbs
    for (let z = -200; z <= 200; z += R(5.5, 9)) {
      for (const side of [-1, 1]) {
        if (L.crossStreets.some((s) => Math.abs(z - s.z) < s.half + 5)) continue;
        if (z > 118 && z < 182) continue; // police zone
        if (rnd() < 0.35) continue;
        const r = rnd();
        const state = r < 0.08 ? 'burnt' : r < 0.12 ? 'side' : 'ok';
        if (rnd() < 0.12) this._van(side * 7.6, z, side > 0 ? 0 : Math.PI, false);
        else this._car(side * 7.7, z, (side > 0 ? 0 : Math.PI) + R(-0.05, 0.05), Math.floor(rnd() * 8), state);
      }
    }
    // cross street parking
    for (const s of L.crossStreets) {
      for (let x = 20; x < 130; x += R(5.5, 8)) {
        for (const xs of [-1, 1]) {
          if (rnd() < 0.4) continue;
          this._car(xs * x, s.z + (rnd() < 0.5 ? -1 : 1) * (s.half - 3.6), Math.PI / 2 + (rnd() < 0.5 ? 0 : Math.PI), Math.floor(rnd() * 8), rnd() < 0.1 ? 'burnt' : 'ok');
        }
      }
    }
    // abandoned cars in the middle of the boulevard
    this._car(-2.5, 40, 0.7, 2, 'burnt');
    this.fires.push({ pos: new THREE.Vector3(-2.5, 1.2, 40), scale: 1.4 });
    this.smokes.push({ pos: new THREE.Vector3(-2.5, 2.0, 40), rate: 2.2 });
    this._car(3.5, -60, -0.4, 4, 'side');
    this._car(-1, -125, 1.2, 1, 'flipped');
    this._car(4, -128, -0.2, 0, 'burnt');
    this.fires.push({ pos: new THREE.Vector3(4, 1.2, -128), scale: 1.2 });
    this.smokes.push({ pos: new THREE.Vector3(4, 2.0, -128), rate: 2.0 });
    // CRS vans forming the police position at the south end
    this._van(-6.2, 150, 0.15, true);
    this._van(6.0, 151, -0.2, true);
    this._van(-2.0, 166, 1.45, true);
    this._van(5.5, 168, 1.6, true);
    this._van(-9.5, 175, 0.1, true);
    // emergency services standing by at the junctions
    this._van(-46, 74.5, Math.PI / 2 - 0.1, false, 'fire');
    this._van(44, -16, -Math.PI / 2 + 0.15, false, 'samu');
    this._van(47, -114.5, Math.PI / 2, true);
    this._van(-44, -24, Math.PI / 2 + 0.2, true);
    this._van(7.4, 139, 0.05, false, 'samu');
    // police cars blocking side streets at the bounds
    for (const s of L.crossStreets) for (const xs of [-1, 1]) this._van(xs * 60, s.z, 0, rnd() < 0.5);
  }

  // ---------------------------------------------------------------- barricades
  _vauban(x, z, ry, { mat = 'metal', tilt = 0, roll = 0, y = 0, collide = true } = {}) {
    // metal crowd-control barrier, 2 m wide (tilt / roll lean it onto a pile)
    const B = (w, h, d, ox, oy) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(ox, oy, 0); g.rotateZ(roll); g.rotateX(tilt); g.rotateY(ry); g.translate(x, y, z);
      this.add(mat, g);
    };
    B(2.0, 0.05, 0.05, 0, 1.08); B(2.0, 0.05, 0.05, 0, 0.25);
    for (let k = -0.95; k <= 0.96; k += 0.16) B(0.025, 0.85, 0.025, k, 0.66);
    B(0.06, 1.1, 0.06, -1.0, 0.55); B(0.06, 1.1, 0.06, 1.0, 0.55);
    B(0.06, 0.04, 0.7, -0.9, 0.02); B(0.06, 0.04, 0.7, 0.9, 0.02);
    if (collide) this.addColliderRotated(x, z, 2.0, 0.35, ry, 1.1);
  }

  _binPyre(cx, cz, scale = 1) {
    // bins dragged into the road, crowd barriers thrown on top, set alight
    const gy = this.groundHeight(cx, cz);
    this.box('charred', 2.6, 0.03, 2.4, cx, gy + 0.02, cz, rnd() * 6);
    const nb = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * Math.PI * 2 + R(-0.4, 0.4), d = R(0.3, 0.6);
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, ry = rnd() * 6;
      const burnt = rnd() < 0.5;
      if (rnd() < 0.5) {
        this.box(burnt ? 'charred' : 'binGreen', 0.7, 1.05, 0.8, x, 0.38, z, ry, 0, Math.PI / 2);
      } else {
        this.box(burnt ? 'charred' : 'binGreen', 0.7, 1.05, 0.8, x, 0.55, z, ry);
        if (!burnt) this.box('binLid', 0.74, 0.06, 0.85, x, 1.1, z, ry, R(-0.5, 0));
      }
    }
    for (let k = 0; k < 2; k++) {
      this._vauban(cx + R(-0.4, 0.4), cz + R(-0.4, 0.4), rnd() * 6, { mat: rnd() < 0.5 ? 'rust' : 'metal', tilt: R(0.6, 1.1) * (rnd() < 0.5 ? 1 : -1), roll: R(-0.3, 0.3), y: 0.3 + k * 0.25, collide: false });
    }
    for (let k = 0; k < 4; k++) this.box(rnd() < 0.5 ? 'cardboard' : 'trash', R(0.4, 0.7), R(0.2, 0.4), R(0.4, 0.6), cx + R(-0.9, 0.9), gy + 0.15, cz + R(-0.9, 0.9), rnd() * 6, R(-0.2, 0.2));
    this.addCollider(cx - 1.1, cz - 1.1, cx + 1.1, cz + 1.1, 1.2);
    this.fires.push({ pos: new THREE.Vector3(cx, 1.0, cz), scale: 1.7 * scale });
    this.fires.push({ pos: new THREE.Vector3(cx + R(-0.6, 0.6), 0.6, cz + R(-0.6, 0.6)), scale: 1.0 * scale });
    this.smokes.push({ pos: new THREE.Vector3(cx, 1.6, cz), rate: 2.2 * scale, scale: 1.4 });
  }

  _barricade(cx, cz, width, burning) {
    // improvised barricade: pallets, bins, fences, tyres
    for (let x = cx - width / 2; x < cx + width / 2; x += R(0.9, 1.5)) {
      const r = rnd(), z = cz + R(-0.8, 0.8), ry = R(-0.6, 0.6);
      if (r < 0.3) for (let k = 0; k < 2 + Math.floor(rnd() * 3); k++) this.box('wood', 1.2, 0.14, 0.8, x, 0.07 + k * 0.15, z, ry + R(-0.3, 0.3), R(-0.15, 0.15));
      else if (r < 0.5) this.box('binGreen', 0.7, 1.0, 0.8, x, 0.4, z, ry, 0, Math.PI / 2 * (rnd() < 0.5 ? 1 : 0));
      else if (r < 0.7) { this.cyl('tyre', 0.38, 0.38, 0.24, x, 0.12, z, 12); this.cyl('tyre', 0.38, 0.38, 0.24, x + 0.1, 0.36, z + 0.1, 12); }
      else if (r < 0.85) this.box('darkMetal', 2.2, 1.9, 0.05, x, 0.95, z, ry, R(-0.3, 0.3)); // construction fence
      else this.box('cardboard', 0.8, 0.6, 0.6, x, 0.3, z, ry);
    }
    this.addCollider(cx - width / 2, cz - 1.1, cx + width / 2, cz + 1.1, 1.6, 'barricade');
    if (burning) {
      for (let x = cx - width / 2 + 1; x < cx + width / 2; x += 3) {
        this.fires.push({ pos: new THREE.Vector3(x, 0.6, cz), scale: 1.1 });
        this.smokes.push({ pos: new THREE.Vector3(x, 1.4, cz), rate: 1.2 });
      }
    }
  }

  _buildBarricades() {
    // police line Vauban barriers (with gaps)
    for (let x = -13; x <= 13; x += 2.1) {
      if (Math.abs(x - 0.4) < 2.2) continue;
      this._vauban(x, 128, 0);
    }
    // overturned barriers in the crowd
    for (let i = 0; i < 16; i++) this._vauban(R(-8, 8), R(-150, 115), R(0, 3.14));
    // burning piles of bins and barriers in the road
    for (const [x, z, s] of [[6.5, 98, 1], [-7, 44, 1.1], [7.2, 4, 0.9], [-6.8, -72, 1.2], [6.8, -126, 1], [-2, -150, 1.3]]) this._binPyre(x, z, s);
    // improvised barricades
    this._barricade(-5, 22, 7, false);
    this._barricade(5, -88, 6, true);
    this._barricade(0, -168, 26, true);   // northern limit
    this._barricade(-3.5, 60, 4, false);
    // rear police cordon (southern limit)
    for (let x = -14; x <= 14; x += 2.05) this._vauban(x, 181, 0);
    // banners on barricades
    const banner = (text, x, z, ry, bg, fg) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.9), new THREE.MeshStandardMaterial({ map: T.bannerTexture(text, bg, fg), side: THREE.DoubleSide, roughness: 0.9 }));
      m.position.set(x, 1.5, z); m.rotation.y = ry; m.castShadow = true;
      this.scene.add(m);
    };
    banner('RÉSISTANCE', -5, 22.9, 0, '#f2efe8', '#b31b1b');
    banner('PALESTINE LIBRE', 5, -87.1, 0, '#111', '#f2f2f2');
    banner('PARIS EST À NOUS', 0, -166.8, 0, '#1b2a4a', '#ffffff');
    // big banner hung across facades over the boulevard
    const big = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), this.makeCloth(T.bannerTexture('ICI C\'EST PARIS', '#132447', '#ffffff'), 0.05));
    big.position.set(-14.6, 9, 4); big.rotation.y = Math.PI / 2; this.scene.add(big);
    const big2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), this.makeCloth(T.bannerTexture('JUSTICE · LIBERTÉ', '#f2efe8', '#111'), 0.05));
    big2.position.set(14.6, 10, -52); big2.rotation.y = -Math.PI / 2; this.scene.add(big2);
    const big3 = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), this.makeCloth(T.bannerTexture('LYCÉENS EN COLÈRE', '#f2efe8', '#111'), 0.05));
    big3.position.set(-14.6, 8.5, -74); big3.rotation.y = Math.PI / 2; this.scene.add(big3);
    const big4 = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), this.makeCloth(T.bannerTexture('LA VIE CHÈRE ÇA SUFFIT', '#c8161d', '#ffffff'), 0.05));
    big4.position.set(14.6, 9.5, 100); big4.rotation.y = -Math.PI / 2; this.scene.add(big4);
  }

  // ---------------------------------------------------------------- distant crowds
  _buildImpostorCrowds() {
    const L = LAYOUT;
    const spots = [];
    for (const s of L.crossStreets) for (const xs of [-1, 1]) for (let i = 0; i < 55; i++) spots.push([xs * R(66, 125), s.z + R(-s.half + 1, s.half - 1)]);
    for (let i = 0; i < 160; i++) spots.push([R(-13, 13), R(-215, -172)]);
    const body = new THREE.CapsuleGeometry(0.22, 1.0, 2, 6); body.translate(0, 0.75, 0);
    const head = new THREE.SphereGeometry(0.12, 6, 4); head.translate(0, 1.58, 0);
    const legs = new THREE.BoxGeometry(0.34, 0.5, 0.2); legs.translate(0, 0.25, 0);
    [body, head, legs].forEach((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
    const geo = mergeGeometries([toIndexed(body), toIndexed(head), toIndexed(legs)]);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const inst = new THREE.InstancedMesh(geo, mat, spots.length);
    const cols = [0x111111, 0x1a1a1a, 0x132447, 0x132447, 0x2a2a2a, 0x3a3f46, 0x5a4a3a, 0x7a1d1d, 0x22324a, 0xd8d4c8];
    const m = new THREE.Matrix4(), c = new THREE.Color();
    this.impostors = { mesh: inst, base: [] };
    spots.forEach(([x, z], i) => {
      const s = R(0.9, 1.08);
      m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6), new THREE.Vector3(s, s, s));
      inst.setMatrixAt(i, m);
      inst.setColorAt(i, c.setHex(pick(cols)));
      this.impostors.base.push({ x, z, s, ph: rnd() * 6, ry: rnd() * 6 });
    });
    inst.castShadow = false; inst.receiveShadow = false;
    this.scene.add(inst);
    // distant flags above the impostor crowds
    const fg = new THREE.PlaneGeometry(1.6, 1.0, 8, 1); fg.translate(0.8, 0, 0);
    const pole = new THREE.CylinderGeometry(0.02, 0.02, 3.2, 4); pole.translate(0, -1.0, 0);
    // distant flags over the crowds: Palestinian, Algerian, French and red union flags
    const fm = this.materials;
    for (const [mat, n] of [[fm.palFlagBig, 30], [fm.algFlagBig, 18], [fm.frFlagBig, 24], [fm.uniFlagBig, 22]]) {
      const flags = new THREE.InstancedMesh(fg, mat, n);
      const poles = new THREE.InstancedMesh(pole, this.materials.darkMetal, n);
      for (let i = 0; i < n; i++) {
        const [x, z] = spots[Math.floor(rnd() * spots.length)];
        m.compose(new THREE.Vector3(x, 3.4 + R(-0.3, 0.6), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), R(-1, 1) + (Math.abs(x) > 40 ? Math.PI / 2 : 0)), new THREE.Vector3(1, 1, 1));
        flags.setMatrixAt(i, m); poles.setMatrixAt(i, m);
      }
      this.scene.add(flags, poles);
    }
  }

  updateImpostors(t) {
    const { mesh, base } = this.impostors;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      const bob = Math.max(0, Math.sin(t * 3.2 + b.ph)) * 0.12;
      p.set(b.x, bob, b.z);
      q.setFromAxisAngle(up, b.ry + Math.sin(t * 0.7 + b.ph) * 0.3);
      s.set(b.s, b.s, b.s);
      m.compose(p, q, s); mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // Glossy rain puddles on the road and pavements (reflect the sky / fires)
  addPuddles(envMap) {
    const geos = [];
    for (let i = 0; i < 70; i++) {
      const x = R(-13, 13), z = R(-165, 175);
      const g = new THREE.CircleGeometry(1, 14);
      const pos = g.attributes.position;
      for (let k = 1; k < pos.count; k++) { const f = 0.7 + rnd() * 0.5; pos.setX(k, pos.getX(k) * f); pos.setY(k, pos.getY(k) * f); }
      g.scale(R(0.6, 2.4), R(0.4, 1.4), 1);
      g.rotateX(-Math.PI / 2); g.rotateY(rnd() * 3);
      g.translate(x, this.groundHeight(x, z) + 0.012, z);
      geos.push(g);
    }
    const mat = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.04, metalness: 0.6, envMap, envMapIntensity: 1.1, transparent: true, opacity: 0.82, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    this.scene.add(mesh);
  }

  // ---------------------------------------------------------------- queries
  near(x, z, r) {
    const cs = this.cell, out = new Set();
    for (let gx = Math.floor((x - r) / cs); gx <= Math.floor((x + r) / cs); gx++)
      for (let gz = Math.floor((z - r) / cs); gz <= Math.floor((z + r) / cs); gz++) {
        const l = this.grid.get(gx * 10007 + gz);
        if (l) for (const c of l) out.add(c);
      }
    return out;
  }

  // Push a circle out of static colliders. Returns true if it collided.
  resolveCircle(p, r) {
    let hit = false;
    for (const c of this.near(p.x, p.z, r + 1)) {
      const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
      let dx = p.x - cx, dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        hit = true;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2), k = (r - d) / d;
          p.x += dx * k; p.z += dz * k;
        } else {
          // centre inside the box: push out along the shallowest axis
          const l = p.x - c.minX, rr = c.maxX - p.x, t = p.z - c.minZ, b = c.maxZ - p.z;
          const m = Math.min(l, rr, t, b);
          if (m === l) p.x = c.minX - r; else if (m === rr) p.x = c.maxX + r; else if (m === t) p.z = c.minZ - r; else p.z = c.maxZ + r;
        }
      }
    }
    const B = LAYOUT.bounds;
    p.x = Math.max(B.minX, Math.min(B.maxX, p.x));
    p.z = Math.max(B.minZ, Math.min(B.maxZ, p.z));
    return hit;
  }

  blocked(x, z, r) {
    for (const c of this.near(x, z, r + 1)) {
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
    }
    const B = LAYOUT.bounds;
    return x < B.minX || x > B.maxX || z < B.minZ || z > B.maxZ;
  }

  // 3D ray vs collider boxes (slab test). Returns distance or maxDist.
  raycast(o, d, maxDist) {
    let best = maxDist;
    const steps = Math.ceil(maxDist / this.cell) + 1;
    const seen = new Set();
    for (let i = 0; i <= steps; i++) {
      const t = Math.min(maxDist, i * this.cell);
      for (const c of this.near(o.x + d.x * t, o.z + d.z * t, this.cell)) {
        if (seen.has(c)) continue; seen.add(c);
        const hit = rayBox(o, d, c.minX - 0.15, -1, c.minZ - 0.15, c.maxX + 0.15, c.h + 0.15, c.maxZ + 0.15);
        if (hit !== null && hit < best) best = hit;
      }
    }
    return best;
  }

  update(dt, t) {
    this.clothUniforms.uTime.value = t;
    const on = Math.floor(t * 4) % 2 === 0;
    this.materials.lightA.emissiveIntensity = on ? 6 : 0.2;
    this.materials.lightB.emissiveIntensity = on ? 0.2 : 6;
    if (this.impostors.mesh.visible) this.updateImpostors(t);
  }
}

function rayBox(o, d, x0, y0, z0, x1, y1, z1) {
  let tmin = 0, tmax = Infinity;
  for (const [oo, dd, a, b] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]]) {
    if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) return null; continue; }
    let t1 = (a - oo) / dd, t2 = (b - oo) / dd;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

function scaleUV(g, su, sv) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
}

function toIndexed(g) {
  if (g.index) return g;
  const n = g.attributes.position.count;
  const idx = []; for (let i = 0; i < n; i++) idx.push(i);
  g.setIndex(idx);
  return g;
}

```

## src/style.css

```css
:root {
  --panel: rgba(10, 12, 16, 0.62);
  --panel-border: rgba(255, 255, 255, 0.08);
  --text: #e9e6df;
  --dim: #9a978f;
  --accent: #3d7bff;
  --red: #ff3b3b;
  --amber: #ffb02e;
  --green: #4fd17a;
  --font: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --mono: "Consolas", "SF Mono", monospace;
}

* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; overflow: hidden; background: #0b0c0e; color: var(--text); font-family: var(--font); }
#app { position: fixed; inset: 0; }
#game { width: 100%; height: 100%; display: block; }
.hidden { display: none !important; }
.dim { color: var(--dim); }
.small { font-size: 12px; letter-spacing: 0.08em; }
.red { color: var(--red); }

/* ---------- HUD ---------- */
#hud { position: absolute; inset: 0; pointer-events: none; user-select: none; }
.panel {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  backdrop-filter: blur(6px);
}
#vignette {
  position: absolute; inset: 0; opacity: 0; transition: opacity 0.25s;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(150, 0, 0, 0.75) 100%);
}
#hitflash { position: absolute; inset: 0; background: rgba(255,255,255,0.0); }

#objective { position: absolute; top: 20px; left: 20px; width: 340px; padding: 12px 14px 12px; }
.mission-title { font-size: 11px; letter-spacing: 0.22em; color: var(--dim); display: flex; justify-content: space-between; }
#progress-pips { display: flex; gap: 4px; margin: 8px 0 8px; }
#progress-pips span { flex: 1; height: 3px; background: rgba(255,255,255,0.15); border-radius: 2px; transition: background 0.4s; }
#progress-pips span.done { background: var(--green); }
#progress-pips span.active { background: var(--amber); animation: pulse 1.2s infinite; }
#objective-text { font-size: 17px; font-weight: 600; line-height: 1.3; }
#incident-status { margin-top: 8px; font-size: 12px; display: flex; gap: 8px; align-items: center; color: var(--dim); }
.chip { font-size: 10px; letter-spacing: 0.14em; font-weight: 700; padding: 2px 6px; border-radius: 2px; background: var(--amber); color: #111; }
.chip.calm { background: #5d6470; color: #eee; }
.chip.done { background: var(--green); }
.chip.danger { background: var(--red); color: #fff; animation: pulse 0.8s infinite; }
#incident-bar { margin-top: 8px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
#incident-bar div { height: 100%; width: 100%; background: var(--accent); transition: width 0.3s; }

#compass {
  position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
  width: 420px; height: 30px; overflow: hidden;
  background: linear-gradient(90deg, transparent, rgba(10,12,16,0.6) 20%, rgba(10,12,16,0.6) 80%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent);
}
#compass-strip { position: absolute; top: 0; left: 0; height: 30px; white-space: nowrap; font-family: var(--mono); font-size: 12px; }
#compass-strip span { position: absolute; top: 7px; transform: translateX(-50%); color: var(--dim); }
#compass-strip span.card { color: var(--text); font-weight: 700; font-size: 13px; }
#compass-marker { position: absolute; top: 3px; width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 10px solid var(--amber); transform: translateX(-50%); }
#compass-tick { position: absolute; left: 50%; bottom: 0; width: 2px; height: 8px; background: var(--text); transform: translateX(-50%); }

#score-panel { position: absolute; top: 20px; right: 20px; padding: 10px 16px; text-align: right; min-width: 140px; }
#score-panel .label { font-size: 11px; letter-spacing: 0.22em; color: var(--dim); }
#score { font-size: 30px; font-weight: 700; font-family: var(--mono); }
#score-pop { position: absolute; right: 16px; top: 64px; white-space: nowrap; font-family: var(--mono); font-weight: 700; font-size: 16px; opacity: 0; }
#score-pop.show { animation: pop 1.3s ease-out; }
#score-pop.pos { color: var(--green); }
#score-pop.neg { color: var(--red); }

#bottom-left { position: absolute; left: 20px; bottom: 20px; width: 200px; }
#minimap { width: 200px; height: 200px; border-radius: 50%; background: rgba(10,12,16,0.7); border: 2px solid rgba(255,255,255,0.12); display: block; }
.bar-row { margin-top: 8px; }
.bar-label { font-size: 10px; letter-spacing: 0.2em; color: var(--dim); margin-bottom: 3px; }
.bar { height: 8px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
.bar.thin { height: 4px; }
.bar div { height: 100%; width: 100%; background: var(--green); transition: width 0.15s, background 0.3s; }
#stamina-bar div { background: #c9c3b4; }

#controls-hint { position: absolute; right: 20px; bottom: 20px; padding: 10px 14px; font-size: 12px; line-height: 1.7; color: var(--dim); }
#controls-hint b { color: var(--text); font-family: var(--mono); font-weight: 600; }

#alerts { position: absolute; top: 150px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 6px; }
.alert { padding: 8px 18px; background: var(--panel); border-left: 3px solid var(--accent); font-size: 14px; font-weight: 600; letter-spacing: 0.03em; animation: alertIn 0.25s ease-out; white-space: nowrap; }
.alert.warn { border-left-color: var(--amber); }
.alert.bad { border-left-color: var(--red); }
.alert.good { border-left-color: var(--green); }
.alert.radio { border-left-color: #7aa7ff; font-style: italic; font-weight: 500; }
.alert.fade { opacity: 0; transition: opacity 0.5s; }

#prompt { position: absolute; left: 50%; bottom: 120px; transform: translateX(-50%); padding: 8px 16px; background: var(--panel); font-size: 14px; border-radius: 3px; }
#prompt b { display: inline-block; padding: 0 7px; margin-right: 8px; background: var(--text); color: #111; border-radius: 2px; font-family: var(--mono); }

#crosshair { position: absolute; left: 50%; top: 50%; width: 4px; height: 4px; margin: -2px; border-radius: 50%; background: rgba(255,255,255,0.6); }
#crosshair.hit { background: var(--red); box-shadow: 0 0 0 6px rgba(255,59,59,0.25); }

#offscreen-arrow { position: absolute; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 18px solid var(--amber); opacity: 0; filter: drop-shadow(0 0 4px rgba(0,0,0,0.8)); }

#threat-warning { position: absolute; top: 33%; left: 50%; transform: translateX(-50%); font-size: 22px; font-weight: 800; letter-spacing: 0.2em; color: var(--red); text-shadow: 0 0 12px rgba(0,0,0,0.9); animation: pulse 0.6s infinite; }

#onboarding {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 560px; padding: 24px 28px; background: rgba(10,12,16,0.82); border: 1px solid var(--panel-border); border-radius: 6px;
  backdrop-filter: blur(8px); line-height: 1.5; font-size: 14px;
}
.ob-title { font-size: 12px; letter-spacing: 0.3em; color: var(--amber); margin-bottom: 8px; font-weight: 700; }
.ob-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 14px 0; }
.ob-grid div { background: rgba(255,255,255,0.05); padding: 8px; border-radius: 3px; text-align: center; }
.ob-grid b { display: block; font-family: var(--mono); font-size: 14px; }
.ob-grid span { font-size: 11px; color: var(--dim); }

/* ---------- Screens ---------- */
.screen {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: radial-gradient(ellipse at 30% 40%, rgba(20,24,34,0.55), rgba(5,6,8,0.92));
}
#menu { background: radial-gradient(ellipse at 30% 40%, rgba(20,24,34,0.35), rgba(5,6,8,0.85)); justify-content: flex-start; padding-left: 9vw; }
.menu-inner { max-width: 640px; }
.logo { font-size: 84px; font-weight: 900; letter-spacing: -0.02em; line-height: 0.9; display: flex; flex-direction: column; }
.logo .accent { color: transparent; -webkit-text-stroke: 2px var(--text); }
.tag { margin: 14px 0 34px; color: var(--dim); letter-spacing: 0.22em; font-size: 12px; text-transform: uppercase; }
h2 { font-size: 36px; font-weight: 800; letter-spacing: 0.08em; margin: 0 0 18px; }
.menu-buttons { display: flex; flex-direction: column; gap: 8px; width: 280px; margin-top: 18px; }
.menu-buttons button {
  pointer-events: auto; text-align: left; padding: 13px 18px; font-size: 15px; font-weight: 700; letter-spacing: 0.18em;
  background: rgba(255,255,255,0.06); color: var(--text); border: 1px solid rgba(255,255,255,0.1); border-left: 3px solid transparent;
  cursor: pointer; font-family: var(--font); transition: background 0.15s, border-color 0.15s, transform 0.15s;
}
.menu-buttons button:hover { background: rgba(255,255,255,0.14); border-left-color: var(--accent); transform: translateX(4px); }
.menu-buttons button.primary { background: var(--text); color: #111; }
.menu-buttons button.primary:hover { background: #fff; }
.menu-buttons button:disabled { opacity: 0.4; cursor: wait; }
.ctrl-table { border-collapse: collapse; font-size: 14px; margin-bottom: 10px; }
.ctrl-table td { padding: 7px 18px 7px 0; border-bottom: 1px solid rgba(255,255,255,0.07); }
.ctrl-table td:first-child { font-family: var(--mono); font-weight: 700; color: var(--text); white-space: nowrap; }
#end-stats { font-family: var(--mono); font-size: 14px; line-height: 1.9; min-width: 360px; }
#end-stats .row { display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); }
#end-stats .total { font-size: 20px; font-weight: 700; margin-top: 8px; border: none; }
#end-stats .rank { margin-top: 10px; font-size: 13px; color: var(--amber); letter-spacing: 0.2em; }

@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px); } 15% { opacity: 1; transform: translateY(0); } 80% { opacity: 1; } 100% { opacity: 0; transform: translateY(-8px); } }
@keyframes alertIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }

@media (max-width: 900px) {
  #objective { width: 260px; }
  #compass { width: 260px; }
  #controls-hint { display: none; }
  .logo { font-size: 56px; }
  #onboarding { width: calc(100% - 32px); }
}

.credits { max-width: 560px; line-height: 1.5; letter-spacing: 0.02em; margin-top: 10px; }

/* ---------- Audio settings ---------- */
.audio-settings { display: grid; grid-template-columns: 110px minmax(160px, 300px) 52px; gap: 14px 14px; align-items: center; margin: 6px 0 10px; font-size: 14px; letter-spacing: 0.08em; }
.audio-settings label { font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 0.18em; }
.audio-settings output { font-family: var(--mono); color: var(--dim); text-align: right; }
.audio-settings input[type="range"] { width: 100%; accent-color: var(--accent); height: 28px; cursor: pointer; }
.audio-settings input[type="checkbox"] { width: 22px; height: 22px; accent-color: var(--accent); cursor: pointer; }
.audio-settings input:focus-visible, .menu-buttons button:focus-visible, .hud-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ---------- HUD buttons (pause / mute) & touch controls: touch screens only ---------- */
#hud-buttons, #touch-ui, .touch-only, #rotate-hint { display: none; }
.touch .touch-only { display: revert; }
.touch .desk-only { display: none; }
.touch .ob-grid.touch-only { display: grid; }
.hud-btn {
  pointer-events: auto; width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.18);
  background: var(--panel); color: var(--text); font-size: 15px; line-height: 1; padding: 0; cursor: pointer;
  backdrop-filter: blur(6px); -webkit-tap-highlight-color: transparent;
}
.hud-btn .ico-off, .hud-btn.muted .ico-on { display: none; }
.hud-btn.muted .ico-off { display: inline; }

#touch-ui { position: absolute; inset: 0; pointer-events: auto; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
#stick-base {
  position: absolute; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.22); background: rgba(10,12,16,0.25);
  left: calc(env(safe-area-inset-left, 0px) + 96px); top: calc(100% - 110px); opacity: 0.45; transition: opacity 0.15s;
}
#stick-base.active { opacity: 1; transition: none; }
#stick-knob { position: absolute; left: 50%; top: 50%; width: 50px; height: 50px; margin: -25px; border-radius: 50%; background: rgba(233,230,223,0.55); }
#touch-buttons {
  position: absolute; right: calc(env(safe-area-inset-right, 0px) + 14px); bottom: calc(env(safe-area-inset-bottom, 0px) + 14px);
  width: 176px; height: 158px;
}
.tb {
  position: absolute; border-radius: 50%; border: 2px solid rgba(255,255,255,0.25); background: rgba(10,12,16,0.5);
  color: var(--text); font-family: var(--font); font-weight: 800; font-size: 10px; letter-spacing: 0.08em; padding: 0;
  touch-action: none; -webkit-tap-highlight-color: transparent; backdrop-filter: blur(4px);
}
.tb.on { background: rgba(233,230,223,0.85); color: #111; }
#tb-strike { right: 0; bottom: 0; width: 82px; height: 82px; font-size: 12px; border-color: rgba(255,90,90,0.6); }
#tb-shield { right: 92px; bottom: 0; width: 64px; height: 64px; border-color: rgba(61,123,255,0.7); }
#tb-dodge { right: 8px; bottom: 94px; width: 58px; height: 58px; }
#tb-sprint { right: 104px; bottom: 76px; width: 52px; height: 52px; font-size: 9px; }
#tb-sprint.on { background: var(--amber); color: #111; }

.touch #hud-buttons { display: flex; gap: 8px; position: absolute; top: calc(env(safe-area-inset-top, 0px) + 8px); right: calc(env(safe-area-inset-right, 0px) + 112px); }
.touch #touch-ui { display: block; }
.touch #controls-hint { display: none; }
.touch #crosshair { opacity: 0.5; }
.touch #objective { top: calc(env(safe-area-inset-top, 0px) + 8px); left: calc(env(safe-area-inset-left, 0px) + 8px); width: 220px; padding: 7px 10px; }
.touch .mission-title { font-size: 9px; letter-spacing: 0.14em; }
.touch #progress-pips { margin: 5px 0; }
.touch #objective-text { font-size: 13px; }
.touch #incident-status { margin-top: 4px; font-size: 10px; }
.touch #incident-bar { margin-top: 5px; }
.touch #compass { top: calc(env(safe-area-inset-top, 0px) + 8px); width: 180px; height: 24px; }
.touch #compass-strip span { top: 4px; font-size: 10px; }
.touch #score-panel { top: calc(env(safe-area-inset-top, 0px) + 8px); right: calc(env(safe-area-inset-right, 0px) + 8px); padding: 4px 10px; min-width: 96px; }
.touch #score-panel .label { font-size: 8px; }
.touch #score { font-size: 18px; }
.touch #score-pop { top: 40px; font-size: 12px; }
.touch #bottom-left { left: auto; bottom: auto; right: calc(env(safe-area-inset-right, 0px) + 8px); top: calc(env(safe-area-inset-top, 0px) + 58px); width: 96px; }
.touch #minimap { width: 96px; height: 96px; }
.touch .bar-row { margin-top: 5px; }
.touch .bar-label { font-size: 8px; letter-spacing: 0.12em; }
.touch #alerts { top: calc(env(safe-area-inset-top, 0px) + 40px); max-width: 52vw; }
.touch .alert { font-size: 12px; padding: 5px 12px; white-space: normal; text-align: center; }
.touch #alerts .alert:nth-last-child(n+3) { display: none; }
.touch #threat-warning { font-size: 15px; top: 26%; }
.touch #prompt { pointer-events: auto; bottom: calc(env(safe-area-inset-bottom, 0px) + 18px); padding: 12px 20px; font-size: 14px; font-weight: 700; border: 1px solid var(--amber); animation: pulse 1.4s infinite; touch-action: none; }
.touch #prompt b { display: none; }
.touch #prompt::before { content: 'TAP · '; color: var(--amber); }
.touch #onboarding { width: calc(100% - 24px); max-width: 620px; max-height: calc(100% - 24px); overflow-y: auto; padding: 14px 18px; font-size: 12px; }
.touch .ob-grid { gap: 6px; margin: 10px 0; }
.touch .ob-grid div { padding: 6px; }
.touch .ob-grid b { font-size: 11px; }

/* menus on small screens: scroll instead of overflowing */
.screen { overflow-y: auto; -webkit-overflow-scrolling: touch; }
@media (max-width: 900px), (max-height: 560px) {
  .screen { align-items: flex-start; padding: max(16px, env(safe-area-inset-top, 0px)) 16px 16px; }
  #menu { padding-left: max(16px, env(safe-area-inset-left, 0px)); align-items: center; }
  .menu-inner { max-width: 100%; }
  .logo { font-size: 44px; }
  .tag { margin: 8px 0 14px; font-size: 10px; }
  h2 { font-size: 24px; margin-bottom: 10px; }
  .menu-buttons { width: 240px; gap: 6px; margin-top: 10px; }
  .menu-buttons button { padding: 11px 16px; font-size: 13px; }
  .ctrl-table { font-size: 12px; }
  .ctrl-table td { padding: 5px 12px 5px 0; }
  .audio-settings { grid-template-columns: 90px minmax(120px, 1fr) 46px; gap: 10px; }
  #end-stats { min-width: 0; font-size: 12px; }
}
@media (orientation: portrait) {
  .touch #rotate-hint { display: block; margin-top: 10px; color: var(--amber); }
  .touch #compass { display: none; }
  .touch #objective { width: calc(100% - 136px); }
  .touch #hud-buttons { top: calc(env(safe-area-inset-top, 0px) + 200px); right: calc(env(safe-area-inset-right, 0px) + 8px); flex-direction: column; }
  .touch #alerts { top: 120px; max-width: 70vw; }
  .ob-grid { grid-template-columns: repeat(2, 1fr); }
}
/* touch layer sits under the HUD's own tappable elements */
#touch-ui { z-index: 1; }
#hud-buttons, #prompt { z-index: 2; }
#onboarding { z-index: 5; }
.screen { z-index: 10; }

/* ---------- boss bar (Level 2) ---------- */
#boss-bar { position: absolute; bottom: 92px; left: 50%; transform: translateX(-50%); width: min(520px, 60vw); text-align: center; text-shadow: 0 1px 4px rgba(0,0,0,0.9); }
#boss-bar .boss-name { display: flex; justify-content: center; align-items: baseline; gap: 10px; margin-bottom: 5px; }
#boss-name { font-size: 15px; font-weight: 800; letter-spacing: 0.22em; }
#boss-sub { font-size: 11px; letter-spacing: 0.12em; color: var(--dim); text-transform: uppercase; }
#boss-hp { position: relative; height: 9px; background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.18); }
#boss-hp .tick { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--text); opacity: 0.8; }
#boss-state { height: 16px; margin-top: 4px; font-size: 12px; font-weight: 800; letter-spacing: 0.25em; }
#boss-state.open { color: var(--green); }
#boss-state.phase { color: var(--amber); }
/* phones: directly under the objective panel, clear of the minimap and bars on the right */
.touch #boss-bar { bottom: auto !important; top: calc(env(safe-area-inset-top, 0px) + 112px); left: calc(env(safe-area-inset-left, 0px) + 8px) !important; right: auto !important; transform: none !important; width: min(62vw, 239px) !important; text-align: left; }
.touch #boss-bar .boss-name { justify-content: flex-start; }
.touch #boss-name { font-size: 12px; }
.touch #boss-sub { display: none; }
/* narrower windows: beside the minimap; above the control hints while they are shown */
@media (max-width: 1150px) {
  #boss-bar { left: 300px; right: 16px; width: auto; transform: none; bottom: 170px; }
}
@media (max-width: 900px) {
  #boss-bar { bottom: 22px; }
}

/* ---------- cinematics, title card, banner (Level 2) ---------- */
#cine { position: absolute; inset: 0; z-index: 30; pointer-events: auto; cursor: pointer; }
.cine-bar { position: absolute; left: 0; right: 0; height: 11vh; background: #000; animation: cineBar 0.45s ease-out both; }
.cine-bar.top { top: 0; } .cine-bar.bottom { bottom: 0; }
@keyframes cineBar { from { transform: scaleY(0); } to { transform: scaleY(1); } }
#cine-card { position: absolute; left: 6vw; bottom: 16vh; opacity: 0; transform: translateX(-12px); transition: opacity 0.5s, transform 0.5s; text-shadow: 0 2px 12px rgba(0,0,0,0.9); }
#cine-card.show { opacity: 1; transform: none; }
#cine-title { font-size: clamp(26px, 5vw, 54px); font-weight: 900; letter-spacing: 0.18em; }
#cine-sub { margin-top: 4px; font-size: clamp(11px, 1.6vw, 15px); letter-spacing: 0.3em; text-transform: uppercase; color: var(--amber); }
#cine-line { position: absolute; left: 50%; bottom: calc(5.5vh - 0.75em); /* inside the bottom bar, like film subtitles */ transform: translateX(-50%); max-width: min(720px, 86vw); text-align: center; font-size: clamp(14px, 2vw, 19px); font-style: italic; opacity: 0; transition: opacity 0.4s; text-shadow: 0 2px 8px rgba(0,0,0,0.95); }
#cine-line.show { opacity: 1; }
#cine-skip { position: absolute; right: 16px; top: calc(5.5vh - 0.6em); font-size: 11px; letter-spacing: 0.2em; color: var(--dim); }
.cine-on #hud { opacity: 0; transition: opacity 0.3s; }
.cine-on #touch-ui { display: none !important; }
#title-card { position: absolute; top: 30%; left: 50%; transform: translateX(-50%); text-align: center; opacity: 0; pointer-events: none; text-shadow: 0 2px 14px rgba(0,0,0,0.9); }
#title-card.show { animation: titleCard 3.5s ease both; }
@keyframes titleCard { 0% { opacity: 0; letter-spacing: 0.5em; } 15%, 75% { opacity: 1; letter-spacing: 0.3em; } 100% { opacity: 0; } }
#title-card .tc-title { font-size: clamp(28px, 6vw, 64px); font-weight: 900; letter-spacing: 0.3em; }
#title-card .tc-sub { font-size: clamp(11px, 1.6vw, 14px); letter-spacing: 0.3em; color: var(--dim); text-transform: uppercase; }
#banner { position: absolute; top: 24%; left: 50%; transform: translateX(-50%); text-align: center; opacity: 0; pointer-events: none; text-shadow: 0 2px 14px rgba(0,0,0,0.95); }
#banner.show { animation: banner 1.8s ease both; }
@keyframes banner { 0% { opacity: 0; transform: translateX(-50%) scale(1.25); } 12% { opacity: 1; transform: translateX(-50%) scale(1); } 80% { opacity: 1; } 100% { opacity: 0; } }
#banner .bn-title { font-size: clamp(24px, 4.5vw, 46px); font-weight: 900; letter-spacing: 0.3em; color: var(--amber); }
#banner .bn-sub { font-size: 14px; font-style: italic; margin-top: 6px; }
#boss-hp > .fill, #boss-hp > .chip { position: absolute; left: 0; top: 0; height: 100%; width: 100%; }
#boss-hp > .fill { background: var(--red); transition: width 0.08s; }
#boss-hp > .chip { background: #f4e9d8; opacity: 0.75; transition: width 0.5s ease 0.35s; }
/* results: rows arrive one after another */
#end-stats .row { animation: rowIn 0.35s ease both; }
#end-stats .row:nth-child(2) { animation-delay: 0.06s; } #end-stats .row:nth-child(3) { animation-delay: 0.12s; } #end-stats .row:nth-child(4) { animation-delay: 0.18s; }
#end-stats .row:nth-child(5) { animation-delay: 0.24s; } #end-stats .row:nth-child(6) { animation-delay: 0.3s; } #end-stats .row:nth-child(7) { animation-delay: 0.36s; } #end-stats .row:nth-child(n+8) { animation-delay: 0.42s; }
@keyframes rowIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
#end-stats .hook { margin-top: 14px; font-style: italic; color: var(--dim); font-size: 13px; line-height: 1.5; animation: rowIn 0.6s ease 0.8s both; }
#boss-bar .boss-name { white-space: nowrap; overflow: hidden; }
#boss-sub { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.ended #hud { opacity: 0; transition: opacity 0.4s; }

```

