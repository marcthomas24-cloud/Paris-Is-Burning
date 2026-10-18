# Audio sources and licences

Every file in `public/assets/audio/` is built by `build_audio.py` from the recordings below.
None are recordings of current events. Licences were checked on each file's Commons page
(or the Kenney pack's licence file) before download.

To rebuild: download the source files under their Commons names into one folder, add the
previously bundled `crowd_large.wav`, `fireworks_far1.ogg`, `fireworks_far3.ogg`,
`fireworks_street.ogg`, `glass.wav`, `siren_twotone.ogg` and `whistle.ogg` (in git history
before this change, under `public/assets/audio/`), unzip
Kenney's *Impact Sounds* pack, then run
`python build_audio.py <source dir> <kenney Audio dir> <path to ffmpeg>`.

## Output files

| Output | Made from | Processing |
|---|---|---|
| `crowd_large.mp3` | eguobyte, large crowd (CC0) | mono, loudness-normalised |
| `crowd_murmur.mp3` | unfa, another crowd (CC0) | 8–40 s, mono, normalised |
| `chant_protest.mp3` | Hardouin, French university protest chanting with whistles (CC BY 3.0) | 50–96 s, mono, normalised |
| `chant_stadium.mp3` | Work With Sounds / Torsten Nilsson, football crowd (CC BY 4.0) | 47–92 s, mono, normalised |
| `crowd_yelling.mp3` | stephan, street parade yelling (PD) | 0–35 s, mono, normalised |
| `street_city.mp3` | cori, Sunday in the city street noise 1 + 3 (PD) | two 22 s sections crossfaded |
| `fireworks_far.mp3` | ezwa, fireworks in distance 1 + 3 (PD) | sections crossfaded |
| `fireworks_street.mp3` | stephan, Silvester fireworks from the street (PD) | 0–36 s |
| `helicopter.mp3` | ezwa, helicopter over quiet neighbourhood (PD) | 3–15 s, normalised |
| `fire_loop.mp3` | ezwa, dry grass burning (PD) + Work With Sounds / Werstas, bonfire (CC BY 4.0) | crossfaded |
| `adhan.mp3` | Fraguando, call to prayer, Hassan II Mosque (CC BY-SA 4.0) | 2–57 s, faded, normalised |
| `siren_police.wav` | Manotechnologie, Deux-Tons-Police-France (CC BY-SA 4.0) | 4 whole cycles, seamless loop |
| `siren_gendarmerie.wav` | Manotechnologie, Deux-tons-Gendarmerie-France (CC BY-SA 4.0) | 4 whole cycles, seamless loop |
| `siren_pompiers.wav` | Manotechnologie, Deux-Tons-Pompiers-France (CC BY-SA 4.0) | 2 whole cycles, seamless loop |
| `whistles.mp3` (3 s slots) | Christoph Waghubinger, Bobbypfeife (CC BY-SA 3.0 AT); SpliceSound, referee whistle (CC0) | blasts cut into slots |
| `glass.mp3` (2.5 s slots) | Gravity Sound, Glass breaking 1–4 (CC BY 4.0) | |
| `explosions.mp3` (3 s slots) | tcpp, Explosion 10 (PD); Fg2, Explosion(s)-LS1001xx (PD) | single blasts cut out |
| `impact_body.mp3` (0.6 s slots) | Kenney Impact Sounds, punch (CC0); Gravity Sound, punch sounds (CC BY 4.0) | |
| `impact_shield.mp3` (0.8 s slots) | Kenney Impact Sounds, plate (CC0) | |
| `impact_metal.mp3` (1.2 s slots) | Kenney Impact Sounds, metal (CC0); Camshaft64, Metal Clanging Noises (CC BY-SA 4.0) | hits cut out |
| `impact_stone.mp3` (0.6 s slots) | Kenney Impact Sounds, mining + generic (CC0) | |
| `footsteps.mp3` (0.4 s slots) | Kenney Impact Sounds, concrete footsteps (CC0) | |
| `grunts.mp3` (1.2 s slots) | stilgar, Male pain grunts (PD) | |

## Source recordings

| Source | Author | Licence | Link |
|---|---|---|---|
| 360703 eguobyte large-crowd-medium-distance-stereo.wav | eguobyte | CC0 | https://commons.wikimedia.org/wiki/File:360703_eguobyte_large-crowd-medium-distance-stereo.wav |
| 211146 unfa another-crowd.flac | unfa | CC0 | https://commons.wikimedia.org/wiki/File:211146_unfa_another-crowd.flac |
| People chanting and blowing whistles during the 2007–2009 university protests in France - 20071211.oga | Hardouin | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:People_chanting_and_blowing_whistles_during_the_2007%E2%80%932009_university_protests_in_France_-_20071211.oga |
| WWS FootballAustriavs.Sweden.ogg | Work With Sounds / Torsten Nilsson | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:WWS_FootballAustriavs.Sweden.ogg |
| Street parade carnival people yelling kamelle kamelle.ogg | stephan | Public domain | https://commons.wikimedia.org/wiki/File:Street_parade_carnival_people_yelling_kamelle_kamelle.ogg |
| Sunday in the city street noise1.ogg, …noise3.ogg | cori | Public domain | https://commons.wikimedia.org/wiki/File:Sunday_in_the_city_street_noise1.ogg |
| Fireworks in distance 1.ogg, …3.ogg | ezwa | Public domain | https://commons.wikimedia.org/wiki/File:Fireworks_in_distance_1.ogg |
| Silvester fireworks from the street 03 end.ogg | stephan | Public domain | https://commons.wikimedia.org/wiki/File:Silvester_fireworks_from_the_street_03_end.ogg |
| Helicopter over quiet neighbourhood.ogg | ezwa | Public domain | https://commons.wikimedia.org/wiki/File:Helicopter_over_quiet_neighbourhood.ogg |
| Dry grass burning in open fireplace.ogg | ezwa | Public domain | https://commons.wikimedia.org/wiki/File:Dry_grass_burning_in_open_fireplace.ogg |
| WWS Bonfireburning.ogg | Work With Sounds / Werstas | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:WWS_Bonfireburning.ogg |
| Llamada a oración Mezquita Hassan II.wav | Fraguando | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Llamada_a_oraci%C3%B3n_Mezquita_Hassan_II.wav |
| Deux-Tons-Police-France.ogg | Manotechnologie | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Deux-Tons-Police-France.ogg |
| Deux-tons-Gendarmerie-France.ogg | Manotechnologie | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Deux-tons-Gendarmerie-France.ogg |
| Deux-Tons-Pompiers-France.ogg | Manotechnologie | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Deux-Tons-Pompiers-France.ogg |
| Bobbypfeife.ogg | Christoph Waghubinger (Lewenstein) | CC BY-SA 3.0 AT | https://commons.wikimedia.org/wiki/File:Bobbypfeife.ogg |
| 218318 splicesound referee-whistle-blow-gymnasium.wav | SpliceSound | CC0 | https://commons.wikimedia.org/wiki/File:218318_splicesound_referee-whistle-blow-gymnasium.wav |
| Glass breaking (Gravity Sound).wav, Glass breaking 2/3/4 | Gravity Sound | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Glass_breaking_(Gravity_Sound).wav |
| Explosion 10.ogg | tcpp | Public domain | https://commons.wikimedia.org/wiki/File:Explosion_10.ogg |
| Explosion-LS100155.ogg, Explosions-LS100152.ogg, Explosions-LS100155.ogg | Fg2 | Public domain | https://commons.wikimedia.org/wiki/File:Explosions-LS100155.ogg |
| Hard Punch Flesh, Hard Punch Gut, Punch Flesh, Punch Gut (Gravity Sound).mp3 | Gravity Sound | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Hard_Punch_Flesh_(Gravity_Sound).mp3 |
| Metal Clanging Noises.ogg | Camshaft64 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Metal_Clanging_Noises.ogg |
| Male pain grunts.ogg | stilgar | Public domain | https://commons.wikimedia.org/wiki/File:Male_pain_grunts.ogg |
| Impact Sounds (1.0) | Kenney (www.kenney.nl) | CC0 | https://kenney.nl/assets/impact-sounds |

## Licence obligations

- **CC BY / CC BY 3.0 / 4.0** (Hardouin, Work With Sounds, Gravity Sound): credit the author and licence. The game does this on the Controls screen and in the README.
- **CC BY-SA** (Manotechnologie sirens, Waghubinger whistle, Camshaft64 metal, Fraguando adhan): credit as above. The derived audio files (`siren_*.wav`, `whistles.mp3`, `impact_metal.mp3`, `adhan.mp3`) must stay under the same licence if redistributed. This applies to those files only, not to the game code.
- **CC0 / public domain**: no obligations. Kenney is credited as a courtesy.

Downloaded but not used: *2020-04-02 verre-1/2.wav* (ringing wine glasses, not breakage), *Islamic call to worship.oga* (close-mic studio recording), *WWS Policecarsiren.ogg* (not a French siren pattern), *Festival concert people crowd.ogg*, *Bones breaking wood fire ice crackling.ogg*.
