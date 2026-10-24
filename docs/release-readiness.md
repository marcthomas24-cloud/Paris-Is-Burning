# Release readiness: assets, licences and known limitations

Status as of the stabilisation audit (branch `level2`). This is an inventory of what needs
checking before a commercial release; it makes no licensing claims beyond the evidence
recorded in this repository. "Evidence" means what the repository documents (README,
`tools/audio/SOURCES.md`, git history); none of the source pages were re-checked during
the audit.

## Third-party assets

### Character models (`public/assets/models/`)

| Asset | Source (as documented) | Licence evidence in repo | Outstanding action |
|---|---|---|---|
| `Soldier.glb` (Mixamo "Vanguard", Idle/Walk/Run) | three.js examples r169, originally mixamo.com | README: Mixamo assets royalty-free in games, no standalone redistribution | Confirm Adobe Mixamo terms for a web build where the `.glb` is downloadable from the host; consider packing/obfuscating or replacing |
| `Xbot.glb` (animations only) | three.js examples, mixamo.com | As above | As above |
| `Michelle.glb` | three.js examples, Mixamo | As above | As above |
| `rpm_male.glb` (`readyplayer.me.glb`) | three.js examples, Ready Player Me avatar | README: "treat as prototype / non-commercial; verify before commercial release" | **Blocker**: obtain written terms for commercial use or replace this body |
| `rb_female.glb`, `rb_male_a.glb`, `rb_male_b.glb` | Microsoft Rocketbox Avatar Library (`Female_Adult_08`, `Male_Adult_04`, `Male_Adult_12`), converted by `tools/rocketbox/convert.js` | MIT licence; notice reproduced in README | Keep the MIT notice with the distributed game (credits screen or bundled text) |

### Audio (`public/assets/audio/`)

All 23 files are built by `tools/audio/build_audio.py` from Wikimedia Commons recordings and
Kenney's *Impact Sounds*; per-file sources, authors, licences and links are in
`tools/audio/SOURCES.md`.

| Licence group | Files | Obligation | Outstanding action |
|---|---|---|---|
| CC0 / public domain (eguobyte, unfa, stephan, cori, ezwa, tcpp, Fg2, stilgar, SpliceSound, Kenney) | crowd beds, street, fireworks, helicopter, fire (part), explosions, grunts, footsteps, impacts (part) | none | Re-check each Commons page's licence before release (one pass) |
| CC BY 3.0 / 4.0 (Hardouin, Work With Sounds, Gravity Sound) | `chant_protest`, `chant_stadium`, `fire_loop` (part), `glass`, `impact_body` (part) | attribution | Credits exist on the Controls screen and in the README; confirm they ship in the final UI |
| CC BY-SA (Manotechnologie, Waghubinger, Camshaft64, Fraguando) | `siren_*.wav`, `whistles.mp3`, `impact_metal.mp3`, `adhan.mp3` | attribution + share-alike for these derived files | Decide whether share-alike files are acceptable in a commercial package (they may be redistributed under CC BY-SA); otherwise replace them |
| Earlier bundled recordings used to rebuild some files (`crowd_large.wav`, `fireworks_far*.ogg`, `fireworks_street.ogg`, `glass.wav`, `siren_twotone.ogg`, `whistle.ogg`) | | documented in the README of commits `fbf0772` / `677a75a` (Commons, CC0/PD/CC BY/CC BY-SA) | Covered by the table above; keep the history reference |

Synthesised sound (baton whooshes, sub-bass, alarms, the Level 2 score and stings in
`src/music.js`) is generated in code and has no third-party source.

### Textures, fonts and other content

| Item | Evidence | Outstanding action |
|---|---|---|
| City, props, textures, flags, shirts, particles | Generated in code (README) | None for ownership. **Trademark review**: the "PSG-style" shirt (navy with red band, generic badge, no logo) and the "ICI C'EST PARIS" banner text echo Paris Saint-Germain branding |
| Fonts | System fonts only (`Segoe UI`, `Helvetica Neue`, `Arial`, `Consolas`); nothing bundled | None |
| three.js (MIT), Vite (MIT, build only) | `package.json`, lockfile | Include the three.js MIT notice in third-party notices |
| Real places (Boulevard de la République, Rue Oberkampf, Rue de Malte, Rue Jean-Pierre Timbaud) | Street names only | Legal review of depicting real Paris locations in this subject matter |

## Deployment and platform limitations

- **Static build**: `dist/` is about 20 MB (models 15 MB, audio 4.6 MB); relative paths (`base: './'`). Tested only through `vite preview` on localhost.
- **Dev-only advisories**: `npm audit` reports esbuild (moderate) and vite (high) advisories affecting the *development server*; they do not ship in `dist/`. Upgrading needs `vite` outside the pinned version.
- **Asset exposure**: models and audio are plain files in `dist/assets/` and can be downloaded by anyone who can load the game (relevant to the Mixamo / Ready Player Me terms above).
- **Browsers**: tested only in the Claude desktop app's built-in Chromium (version 152) on Windows 11. Not tested: Firefox, Safari (macOS/iOS), Chrome on Android, Edge, or WebGL-limited devices.
- **Real devices**: no physical phone or tablet was tested; mobile results come from Chromium device emulation on a desktop GPU.
- **Very short landscape screens**: below about 338 CSS px of height the DODGE button can still touch the stamina bar (checked clear at 340 px and above).
- **Performance**: only per-frame cost under the test harness was measured (median ~33-40 ms at full detail on an integrated AMD GPU, see `tools/tests/logs/frame-times.json`); real frame pacing with adaptive quality, and any mobile GPU, are unmeasured.

## Saves, progression and accessibility

- **Progression** (Level 2 unlock) and audio settings are stored in `localStorage` only: they are lost in private windows, when site data is cleared, and are not shared across devices or browsers. Failures are handled (the game treats storage errors as "locked").
- **No in-game route back to the main menu**: the menu appears only at page load; to replay Level 1 after Level 2, reload the page.
- **Accessibility not addressed**: no key remapping, no subtitles for radio messages beyond on-screen text, no colour-blind consideration for the amber / red rings (blockable vs unblockable is also signalled by a pulsing ring and a sound), no reduced-motion option for camera shake and FOV kicks, no difficulty settings, and gameplay relies on pointer lock on desktop.
