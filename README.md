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

## Fairness rule

Who becomes aggressive is chosen at random from the crowd, independently of clothing, flags or appearance. Threats are identified **only by behaviour**. While someone is acting violently (pursuing, punching, shoving, throwing, preparing a device), they show a red ground ring and a red minimap blip. Peaceful demonstrators keep chanting, filming and waving flags unless something credible happens near them, such as a strike, an explosion or a projectile.

## Characters, crowd and effects

**Base bodies.** Civilians use five realistic base bodies: the Mixamo female (Michelle), the Ready Player Me male, and three [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) people (a woman in a tee and jeans, a young man in a hoodie, a man in a denim jacket). The Rocketbox bodies are converted offline by `tools/rocketbox/` (see its `convert.js`): Biped bones renamed to Mixamo names, one skinned mesh with a texture atlas, a per-vertex garment part and six ARKit facial blendshapes kept. Their faces keep their own textures, tinted darker and warmer towards each person's complexion, and they keep their original clothes or get recoloured ones.

**Building on the base models.** The base bodies are extended in code:
- **Garment layers:** skinned clothing shells are generated from each body's own mesh and pushed out along its normals. There are football shirts (PSG-style band, stripes, hoops, Algeria-style green and white), hoodies, quilted puffer jackets and long coats, so outfits change silhouette, not just colour. About 14% of demonstrators wear a hi-vis *gilet jaune* over their garment, with reflective hoops and shoulder straps.
- **Body variation:** generated *belly* and *chest* blendshapes give varied builds, plus shoulder-width and head-size variation.
- **Accessories:** headscarves, caps, beanies, hoods, masks, keffiyehs, scarves and backpacks.

**Faces:**
- **Men:** the male model's `mouthOpen` and `mouthSmile` blendshapes and teeth are kept in the merged mesh. They drive talking, chanting in rhythm, shouting, screaming while fleeing, and smiling, all from each person's behaviour. Eye bones add saccades, gaze and blinks.
- **Women:** the Michelle model gets a generated jaw blendshape (its face is covered by a printed mask in the texture).
- **Rocketbox people:** real ARKit blendshapes: `jawOpen` (talking, chanting, shouting), `mouthSmile`, `eyeBlink` (blinks and squinting in distress), `browDown` (anger while attacking or shouting), `browInnerUp` (fear while fleeing, staggering or down) and `mouthFunnel` (rounded vowels while chanting). The crowd sets a per-person `brow` mood from behaviour.

**Flags:** handheld and large flags are roughly 55% Palestinian, 23% Algerian, 12% French and 10% red union strike flags (*GRÈVE*). Gilets jaunes mostly carry the tricolore. The same mix appears over the distant crowds and hanging from balconies.

**Banners and placards:** cost-of-living, public-services, union and student slogans (*LYCÉENS EN COLÈRE*, *FACS EN GRÈVE*, *JEUNESSE EN LUTTE*, *LA VIE CHÈRE ÇA SUFFIT*) alongside the original ones, plus two more large banners hung on the façades.

**Police:** CRS officers in the line, squads and at the objective step out towards nearby aggressors, wind up and strike with the baton. That staggers and drives attackers back; repeated hits occasionally put someone down, which earns a small *Officer assist* score.

**Characters.** Everyone in the game is a rigged, skinned glTF human driven by motion-capture clips, as follows:

| Who | Model |
|---|---|
| Player and police | Mixamo "Vanguard" soldier, recoloured on the CPU into navy and black CRS armour |
| Male demonstrators | Ready Player Me avatar, merged at load into one skinned mesh with a texture atlas, a normal-map atlas and per-vertex garment IDs |
| Female demonstrators | Mixamo "Michelle" streetwear model |

- **Retargeting.** The Mixamo clips (idle, walk, run, nod, head-shake, and a second walk/run style) are retargeted at load in world space against a shared T-pose reference. This copes with A-pose binds, different bone roll and Y-up/Z-up armatures.
- **Actions.** Strikes, throws, chants, flag waving, shoves, crouches and knockdowns are additive bone rotations applied in character space on top of the mocap.
- **Items.** Flags, placards, phones, bottles, the baton and the shield attach to sockets derived from the bind pose, so they follow the hands.
- **Crowd mix.** Modelled on reference photos of the Paris protests:
  - About 88% men and 12% women.
  - Mostly North African / Middle Eastern (about 54%) and Black (about 38%) complexions. White Europeans are hard-capped at 10% of everyone generated.
  - Clothing is mostly all-black streetwear: hoodies (some red or grey), puffers, and black tracksuit tops with orange, white or red sleeve stripes. Also PSG and Algeria shirts, keffiyehs, white caps and some gilets jaunes.
  - About half wear face coverings: balaclavas with an eye slot, black face masks, blue surgical masks and keffiyeh masks.
  - Appearance is never used to pick who turns violent; that is decided by behaviour (see above).
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

**Development:** with `?dev` in the URL, `__audioProbe(seconds)` reports per-second RMS and peak levels, clipped samples and active voices, and `__audioEvents(seconds)` counts requested and admitted sounds. Rebuild the audio files with `tools/audio/build_audio.py`.

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
  dev.js         Test helpers, loaded only with ?dev in the URL
```

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
