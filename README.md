# Paris Riot

A browser-based third-person action game built with Three.js. You play a CRS riot officer on a chaotic Paris boulevard and deal with three dynamic incidents. Characters are rigged glTF humans with motion-capture animation, bundled locally. The city, effects and audio are generated in code.

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

`dist/` is a fully static site of about 11 MB (the character models are 10 MB), with relative paths (`base: './'`). It works at a domain root or in a sub-folder. Both were tested: with a plain static server at `/`, and from `/dist/`. There's no server component and nothing needs an API key.

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
| Esc | Pause |

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

**Characters.** Everyone in the game is a rigged, skinned glTF human driven by motion-capture clips, as follows:

| Who | Model |
|---|---|
| Player and police | Mixamo "Vanguard" soldier, recoloured on the CPU into navy and black CRS armour |
| Male demonstrators | Ready Player Me avatar, merged at load into one skinned mesh with a texture atlas, a normal-map atlas and per-vertex garment IDs |
| Female demonstrators | Mixamo "Michelle" streetwear model |

- **Retargeting.** The Mixamo clips (idle, walk, run, nod, head-shake, and a second walk/run style) are retargeted at load in world space against a shared T-pose reference. This copes with A-pose binds, different bone roll and Y-up/Z-up armatures.
- **Actions.** Strikes, throws, chants, flag waving, shoves, crouches and knockdowns are additive bone rotations applied in character space on top of the mocap.
- **Items.** Flags, placards, phones, bottles, the baton and the shield attach to sockets derived from the bind pose, so they follow the hands.
- **Variety.** Each person is unique: skin tone, height, PSG / other football shirt / hoodie / jacket colours, trousers, shoes, beards, procedural hair, caps, beanies, hoods, masks, keffiyehs, scarves and backpacks.

**Crowd LOD.**

| LOD | Distance | Treatment |
|---|---|---|
| Near | under 20 m | Full skeletal animation, every frame, with action layers, items and shadows (shadows within 14 m only) |
| Mid | 20–34 m | Skeletal animation at a reduced rate, no shadows |
| Far | over 34 m | Each model is baked into idle and walking poses, decimated by vertex clustering, coloured per garment region from the original textures, and drawn as instanced meshes with per-instance clothing colours |

The same far system draws about 300 background people beyond the police cordons and at the end of the boulevard. In total there are 110 AI agents (at most 24 fully rigged at once) plus the background crowd. Bystanders and photographers stand on the pavements, and CRS squads hold the line and the vans. Marching groups move along the boulevard and slow down at bottlenecks.

**Smoke, fire and explosions.**
- Layered noise-puff smoke columns: dark at the base, greying and expanding as they rise, lit from below near fires, and all pushed by a consistent wind.
- Low haze in the affected streets, plus fog that thickens and warms in smoke-filled stretches.
- About 30 fires: bins, rubbish heaps, barricades, cars, side streets and the far end. There are also embers, soot stains, and the four nearest fires cast flickering light.
- Explosions have a flash, fireball, sparks, an expanding smoke cloud, a dust ring, debris, dynamic light, camera shake and spatialised, delayed and echoing sound.
- An **incident scheduler** (`events.js`) keeps several areas active. It schedules petrol bombs, firework mortars, projectile volleys, fire flare-ups and parked cars catching fire, with randomised timing, size and direction.

**Look.** Post-processing (half-resolution bloom, a split-tone filmic grade, ACES tone mapping, vignette, grain and slight chromatic fringing), wet reflective roads and puddles using a procedural environment map, and reflective visors.

**Performance.**
- Frustum culling with padded skinned bounds.
- Shadows only for nearby characters, and the shadow map is refreshed every other frame.
- Particle pools with a near-camera fade to limit overdraw.
- Dynamic resolution between 0.85× and 1.5×, depending on frame time.

On an AMD Radeon integrated laptop GPU, the dense crowd areas run at roughly 50 fps and the open areas at 60 fps.

## Assets and licences

All assets are bundled locally in `public/assets/models/`, and nothing is fetched at runtime. Everything else (city, props, textures, flags, shirts, particles and audio) is generated procedurally in code.

| File | Source | Licence / terms |
|---|---|---|
| `Soldier.glb` ("Vanguard" + Idle/Walk/Run) | three.js examples repository (r169), originally from mixamo.com | Mixamo (Adobe) characters and animations are royalty-free for personal, commercial and non-profit projects, but must not be redistributed as standalone assets |
| `Xbot.glb` (animations only) | three.js examples repository, from mixamo.com | As above |
| `Michelle.glb` | three.js examples repository, Mixamo character | As above |
| `rpm_male.glb` (from `readyplayer.me.glb`) | three.js examples repository, Ready Player Me avatar | Ready Player Me terms. Treat as prototype / non-commercial use and verify before any commercial release |

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

- There are three base body models. Variety comes from recolouring, accessories and proportions, so close inspection still shows shared faces and silhouettes.
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
