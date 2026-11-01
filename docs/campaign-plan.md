# Campaign and progression: findings and design

Goal: make the three levels play as one campaign — one night in Paris, from 18h47 to dawn — with a beginning, a clear next step after every mission, records worth beating, and an ending. No microtransactions, upgrades or grind: every reward is a record of how a mission was played.

Inspected on 2026-11-01 on branch `level3`.

## What exists today

| System | Where | What it does |
|---|---|---|
| Unlocks | `levels.js` `Progress` | `parisBurning.progress.v1` = `{ unlocked: { 2: true, 3: true } }`. Every access is guarded; blocked storage means "locked". |
| Unlocking | `main.js` `endGame` | Winning level N unlocks N + 1. |
| Main menu | `index.html` `#menu` | PLAY (plays whichever level is loaded, Level 1 on a fresh page), hidden LEVEL 2 / LEVEL 3 buttons that appear once unlocked, CONTROLS, OPTIONS, RESTART. |
| Results | `hud.js` `showEnd` / `_showEndInfo` | Level 1 builds its own HTML in `hud.js`; Levels 2 and 3 return `endInfo()` rows. Each has a four-step rating (COMMENDATION / PROFESSIONAL / ADEQUATE / UNDER REVIEW), worked out three times with three sets of thresholds. Levels 2 and 3 end with a radio "hook" line. |
| End buttons | `#end-screen` | CONTINUE · LEVEL N (after a win, if there's a next level), RETRY SECTION (Levels 2–3 checkpoints), RESTART. |
| Settings | `audio.js`, `main.js` `PREFS_KEY` | Volumes, mute, sensitivity, invert and the brutality option are all saved already. |
| Dev shortcuts | `dev.js` | `?dev&level=N&stage=…`, `__level`, `__jump`, `__boss`, `__unlock`, `__resetProgress`; `__testProgression` covers the unlock chain. |

**Gaps**
- Nothing is remembered about *how* a mission went: no best score, no record, and no sign that a level has been completed apart from the next one being unlocked.
- Levels are buttons on the menu. There's no overview of the night, no sense of order, and no briefing before a mission.
- Damage received is only counted in Level 3.
- The rating rule is copied three times, and Level 1's results are a separate code path.
- Finishing Level 3 ends on a teaser line, with no conclusion to the campaign.
- The first-play briefing always describes Boulevard de la République (a known issue in the README).

## Design

### 1. One campaign definition — `src/campaign.js`
A single table, `CAMPAIGN`, with one entry per level: number, time, title, place, a two-sentence briefing, three objective lines, and its medal targets. The menu, the campaign screen, the results and the finale all read from it, so the level scripts don't change.

### 2. Medals: five things the player can see
A mission earns a medal only if it is **completed**. Four citations decide which one:

| Citation | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| Score at least | 4,500 | 9,000 | 12,000 |
| Arrests at least | 6 | 10 | 8 |
| Damage received at most | 120 | 180 | 150 |
| Civilians protected | no peaceful person struck | same | same |

- All four citations: **GOLD · COMMENDATION**
- Three: **SILVER · PROFESSIONAL**
- One or two: **BRONZE · ADEQUATE**
- None: no medal, **UNDER REVIEW**

The score targets are today's COMMENDATION bands, so the four existing rating words keep their order and meaning. Now they come from one rule, and the player can see why they got each one. The arrest and damage targets were set from the recorded bot runs (`tools/baseline`). The bot gets Bronze or Silver; Gold needs a clean, careful run.

Damage received moves into the shared `Missions` base, so all three levels count it the same way. Checkpoint retries keep the run's totals, as they already do for the score.

### 3. Records — extending `Progress` (same key, backward compatible)
```
parisBurning.progress.v1 = {
  unlocked:  { 2: true, 3: true },              // unchanged
  records:   { 1: { bestScore, bestMedal, bestTime, wins, plays, last: {…summary} } },
  finaleSeen: true,
}
```
- `plays` counts runs that reached a results screen; `wins` counts completions.
- Best score, best medal and fastest completion are kept separately. A worse run never overwrites a better one.
- `last` is the summary of the latest completed run (score, medal, citations, arrests, peaceful struck, damage, time). The finale adds these up.
- Old saves that only contain `unlocked` are read as they are. When storage is blocked the game still plays, but nothing is remembered.
- Runs driven by the test harness (`manualStep`) don't write records unless a test asks them to. A bot run shouldn't leave a gold medal on the developer's own campaign.

### 4. Campaign screen — `#campaign-screen`
PLAY now opens the campaign screen. On a fresh device it shows the night's opening line, with Level 1 selected and the others locked.
- **Timeline:** three stops connected by a line, each showing its time (18h47 · 01h12 · 02h20), name, state (LOCKED / NEXT / COMPLETE) and best medal. It runs across the screen on desktop and down it on narrow portrait screens.
- **Detail panel** for the selected mission: briefing, objectives, medal targets with the citations already earned ticked, best score, best time, wins.
- **Buttons:** START (REPLAY if completed), BACK. A locked mission says what unlocks it, and START is disabled.
- The mission selected first is the next one to play: the first unlocked mission not yet completed, or the last one played if all are complete.
- Under `?dev`, locked missions can be selected and started (marked DEV), so the shortcuts still work from the menu. `?dev&level=N` still boots straight into that level.
- The menu's LEVEL 2 / LEVEL 3 buttons are removed; the campaign screen replaces them. PLAY's tag line shows campaign progress ("2 / 3 complete").

### 5. Results — one path for every level
- Level 1's results move into a `Missions.endInfo()` like the other two. `hud.showEnd` keeps a single path, and rows can be marked red.
- Every level gets a **Damage received** row.
- After a win, a **medal block** replaces the old rating line: medal disc, rating word, the four citations with their targets and values, and NEW BEST tags (score, medal, time).
- A **Next** card appears under the hook: "NEXT · LEVEL 2 · NUIT — objective". On the final level it is replaced by CAMPAIGN COMPLETE.
- **Buttons:** CONTINUE · LEVEL N (unchanged), CAMPAIGN COMPLETE (Level 3 won), RETRY SECTION (unchanged), REPLAY (formerly RESTART: the same mission from the start), CAMPAIGN (back to the mission select).

### 6. Campaign completion — `#finale-screen`
This appears when the player presses CAMPAIGN COMPLETE after Level 3. It's always available afterwards from the campaign screen, as a button below the timeline.
- "05h40 · DAWN" and a short epilogue: the boulevard is quiet, le Patron and the Fixer are in custody, and most of the people on the street came to demonstrate and went home.
- Three medal discs, campaign totals from each level's latest completion (score, arrests, peaceful people struck, damage received, time), and a campaign rating equal to the lowest medal of the three.
- Buttons: CAMPAIGN (replay any level), MAIN MENU.

### 7. Briefing and next objective
- The first-play briefing gets each level's own opening line from `CAMPAIGN`. This fixes the known issue.
- Level 1 gets the same title card at its start that Levels 2 and 3 already have.
- The pause screen shows the current level's objective lines, so the player can always check what the mission is.

### 8. Settings
- Settings are already persisted, so that doesn't change.
- Options gets **RESET CAMPAIGN**, which wipes unlocks and records. It takes two taps ("TAP AGAIN TO CONFIRM"), and settings are left alone.

### 9. Developer shortcuts (kept, plus)
- `__level`, `__jump`, `__boss`, `__unlock`, `__resetProgress` and the URL shortcuts all stay.
- New: `__campaign()` returns the stored progress and records. `__unlockAll()` unlocks every level. `__testCampaign()` is the regression check for all of the above (below).

## Out of scope
- Upgrades and currencies.
- Difficulty levels.
- Leaderboards or any server.
- New cinematics.
- Changes to the level scripts beyond damage counting and Level 1's title card.

## Tests
`__testCampaign()` (devtests7.js), each run in an isolated storage sandbox that puts the device's own progress back afterwards:
- A fresh campaign: Level 1 is NEXT and Levels 2–3 are locked; START on a locked card is refused, and allowed under dev.
- Medal rule: a table of stat sets gives the expected medal and citations for each level.
- Winning writes a record. A worse replay keeps the best values. A better one updates them and shows NEW BEST.
- The CONTINUE chain from 1 to 3, then CAMPAIGN COMPLETE leads to the finale with the right totals; `finaleSeen` is stored.
- A failure writes a play but no win and no medal.
- A v1 save with only `unlocked` still loads. With storage throwing, the game plays and the screens render.
- Reset campaign takes two taps and leaves settings untouched.
- The campaign screen and the finale fit a 375×812 portrait viewport and an 812×375 landscape one with no horizontal overflow.

`__testProgression()` is updated to read the campaign cards instead of the removed menu buttons.
