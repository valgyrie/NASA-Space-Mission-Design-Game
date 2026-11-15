# Eras demo: the Moon landing and Artemis (15 Nov 2026)

The team asked (15 Nov): "start implementing the eras. Because this is a demo we just want 2 additional important
eras: the Moon landing and the Artemis era of Artemis II, III and IV. For the Moon landing we need the rocket that
launches the astronauts to the Moon, show it realistically landing on the Moon and the player views it; similar for
Artemis. A model for the Moon. Blender or assets may be used. Correct information from NASA, all in the Credits."

Branch: `eras-moon-artemis` (from `main` e9f6b90). Tickets: 50 (Era 3) and 52 (Era 5), cut down as below.
Facts and proposed numbers: `docs/research/eras-3-5.md` (cited; re-check anything you use against the NASA page).

## Scope (cut down from tickets 50 and 52)

- **Era 3, "The Moon" (1969–1972).** One Milestone: **Apollo 11's science package** (ticket 50's design: EASEP-like
  Science Package riding in the Lunar Module on a Saturn V NASA pays for, Tranquility Base, 21 days of Data, the lunar
  night). **Landsat 1, Delta 900, Vandenberg, Heavy Bus, Reaction Wheels, Multispectral Scanner: not in the demo.**
- **Era 4: skipped for now.** The HQ Upgrade after Era 3 goes straight to Era 5. In player-facing text use the Era's
  name and years ("The Artemis Era, 2026–2028"), so the missing number does not show; if a number must show, Era 5.
- **Era 5, "Artemis" (Campaign starts 1 January 2026, the same day Free Play starts).** Milestones in order:
  **Artemis II** (the Company's 12U CubeSat rides SLS with Orion, released in high Earth orbit; real 1–10 April 2026),
  **Artemis III, your choice** (camera / relay / space-weather satellite near Orion's docking tests in low Earth orbit
  at about 440 km, 2027; launched on the Company's own Falcon 9 from the Cape), **Artemis IV, your choice, the finale**
  (lunar relay / cargo lander on the south-pole ridge / Moon Mapper in a 50 km polar orbit, 2028; any one finishes the
  Campaign, then "Continue in Free Play"). **Falcon 9 booster landing, Artemis I, Falcon Heavy, Free Play Moon
  Contracts: not in the demo.**
- **Open questions: take the tickets' proposed defaults** (50: battery must carry 7 dark days; antennas send a fifth
  from the Moon so the Dish Antenna is needed; real rocket lift; Computer slot waits. 52: Artemis II Data 1 day; one
  new CubeSat Bus (12U) only; the Artemis IV lander stays neutral, never named). Mark future plans as plans.
- **Launch Vehicles:** `saturnV` (Kennedy LC-39A; NASA's, whole launch paid by NASA for the Apollo 11 Contract) and
  `sls` (SLS Block 1 with Orion, Kennedy LC-39B on Mobile Launcher 1; CubeSats NASA picks ride free). Artemis III and
  IV Spacecraft fly on the Company's Falcon 9 (already in the game) from Cape Canaveral; to the Moon Falcon 9 needs a
  cited lift figure (IM-1 and IM-2 flew to the Moon on Falcon 9), or use the closest cited number marked _(verify)_.
- **Launch Sites:** `kennedy39A` (28.608° N, 80.604° W) and `kennedy39B` (28.627° N, 80.621° W _(verify)_).
- **Demo Mode:** add an Era 3 and an Era 5 start, each with a design ready, so the team can show both quickly.

## Stage tables both sides use (real; see the research note)

- **Saturn V (Apollo 11):** 3 stages. 1 = S-IC, five F-1, 162 s. 2 = S-II, five J-2, 384 s. 3 = S-IVB, one J-2,
  147 s (to Earth orbit). The S-IVB's second burn, "Off to the Moon" (translunar injection, 347 s), plays inside the
  Moon sequence, not as a stage. 111 m tall (363 ft). Escape tower on top of the Command Module.
- **SLS Block 1 (Artemis II):** 3 stages in the game. 1 = the two five-segment solid boosters with the core stage's
  four RS-25 engines, 126 s (boosters drop). 2 = the core stage alone, to about 486 s after liftoff (core drops).
  3 = ICPS (one RL10). 98 m tall (322 ft). Orion with its Launch Abort System on top.
  Game-logic side: put the exact cited times in `launchVehicles.ts`; the 3D side only needs "stage 1 drop = the two
  boosters, stage 2 drop = the core stage, stage 3 = ICPS".

## Who owns what (two agents work in the same folder at the same time)

| | Game-logic agent (A) | 3D/art agent (B) |
|---|---|---|
| Owns | `src/game/**`, `src/ui/**`, `src/save/**`, `src/economy/**`, `src/game/ascent.ts`, `src/ui/launchShow.ts`, `docs/tickets/50*,52*`, `docs/research/**`, `GLOSSARY.md`, `docs/GDD.md`, `public/history/**`, `public/eras/**` | `src/world/**` (incl. `moonShow.ts`, `moon*.ts`, `rocketMesh.ts`, `launchView.ts`, `launchPad.ts`, `launchModels.ts`, `spacecraftMesh.ts`, `spaceView.ts`, `plannerView.ts`), `scripts/blender/**`, `public/models/**`, `public/textures/**`, `docs/art/**`, `docs/graphics-overhaul/**` |
| Shared, edit only your own lines, re-read before every edit | `src/strings.ts`: everything except the `moonShow.*` keys and `credits.asset.*` keys of new art. `src/game/sources.ts`: `SOURCES`, `VEHICLE_SOURCES`, `SITE_SOURCES` | `src/strings.ts`: `moonShow.*` keys (one block at the end of STRINGS) and `credits.asset.*` for new art. `src/game/sources.ts`: `ART_ASSETS`, `ART_GROUPS`, `ART_GROUP_IDS` |

Never edit, revert, "fix" or format the other agent's files. If the type check fails only in the other agent's
files, carry on with yours and say so in your report. Do not commit: the orchestrator commits checkpoints.

## Interface (already in the code, do not change the signatures without saying so in your report)

- `src/world/moonShow.ts` exports `MoonShowKind` (`apollo11 | artemis2 | artemis3 | artemis4`), `ArtemisChoice`
  (`camera | relay | spaceWeather | cargoLander | mapper`), `MoonShowSpec { kind, choice? }`, `MoonBeat { key, startS }`,
  `moonShowBeats(spec)`, `moonShowLength(spec)`, `moonBeatAt(spec, seconds)` and `class MoonShow` (`start`, `render`,
  `dispose`). It is a stub now; agent B fills it in.
- `src/game/ascent.ts`: `ShowPhase` has `'moon'`; `Segment.moon?: MoonShowSpec`. **A** adds, for a Mission that goes
  to or near the Moon (and for Artemis III's docking show), one `'moon'` segment after `'orbit'` with
  `from: 0, to: moonShowLength(spec), playS: moonShowLength(spec)`, then the usual `'mission'` and `'end'` segments.
- **A** writes the caption: `showText` case `'moon'` uses `moonBeatAt(spec, m.value)` and shows
  `t('moonShow.<kind>.<key>')` / `t('moonShow.<kind>.<key>.detail')`. **B** defines the beats and writes those strings.
- **B**: `LaunchView.render` draws the `MoonShow` while the phase is `'moon'` (calling `start` with the Spacecraft's
  design and logo the first time it meets that segment in a show), and keeps showing the Moon scene (held, slowly
  drifting camera) during the following `'mission'` and `'end'` segments of that show; a show without a `'moon'`
  segment looks exactly as before. Also: Saturn V and SLS in `rocketMesh.ts` and on their pads, the Moon in the Space
  view, and the Launch planner's view of the new rockets.
- Vehicle and Site IDs: `saturnV`, `sls`, `kennedy39A`, `kennedy39B`. **A adds them to `launchVehicles.ts` first**
  (within its first steps), so B's `Record<LaunchVehicleId, …>` tables compile.

## Machine set-up (this PC)

- Bash: `export PATH="$PWD/.leap/node:$PATH"` then `npm run typecheck`, `npx vitest run`. No system Python.
- Blender 5.3 headless: `"C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b --factory-startup -P x.py`
  (its Python has NumPy). Existing pipeline: `scripts/blender/lib.py`, `build_launch.py`, Draco GLB.
- Screenshots: `.leap/node/node.exe .leap/shots/shot.mjs --out <dir> --url http://localhost:5173/ --size 1280x800 --steps "..."`
  (Edge, headless; read the file's header for step syntax; `shot2.mjs` blocks hot reload). The dev server is started
  by the orchestrator; if none answers on 5173/5174, start `npx vite --port 5173 --strictPort` in the background.
- Intel UHD laptop GPU: the Launch runs at 50+ fps; keep new scenes within the same budget (textures ≤ 4k, GLBs Draco).
