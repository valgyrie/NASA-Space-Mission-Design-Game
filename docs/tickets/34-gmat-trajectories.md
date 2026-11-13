# 34: NASA's GMAT trajectories in the game

**What to build:** Use the real trajectories that NASA Mission Viz ships, computed with NASA's General Mission Analysis Tool (GMAT), as Reference Trajectories.

1. **Syncom 3's transfer orbit:** the Launch planner (geostationary Contracts) or the Test Run shows the real LEO → GEO run: a low orbit, two burns, ending in a circle 42,165 km from Earth's centre. Labelled "Path computed with NASA's GMAT".
2. **Reference paths in the Space view:** a short list ("Reference paths") the player can switch on: the LEO → GEO transfer, a long ellipse, and the Earth → Moon flight with the Moon's own path. Drawn thin and clearly apart from the Company's Spacecraft.

**Blocked by:** 27, 31

**Status:** built 2026-11-13, waiting for a team test (🧪). Decisions below under **Built**.

- [x] A script (not run by the game) reads the four files below, thins them and writes one small TypeScript module with the points in km (e.g. `src/world/referencePaths.ts`); the module stays small (aim for under 30 KB; raw files are about 250 KB)
- [x] The script reads the four source files from `docs/research/sources/mission-viz/` (already in the repo, unchanged from NASA's repo) and records where they came from (repo, path, commit)
- [x] Syncom 3: the planner or Test Run shows the transfer path with its two burns marked and the "Path computed with NASA's GMAT" label
- [x] Space view: a Reference paths list; each path can be shown or hidden; the Earth → Moon path plays with the Moon moving on its own path, at the Space view's speed
- [x] Frame handled correctly: the files are Earth-centred, equatorial X, Y, Z in km; Earth's axis in the Space view matches
- [x] Each path has one plain line ("How a rocket's upper stage and a Spacecraft's engine reach geostationary orbit", "A long ellipse: fast at the low point, slow far out", "Three weeks from Earth to the Moon") and Learn more → Mission Viz
- [x] Real data list and Credits: a Mission Viz / GMAT entry in `DATASETS` (`src/game/sources.ts`) with strings `data.<id>.*`
- [x] Glossary term **Reference Trajectory** used in code names and text ("reference path" is fine in player text if the glossary says so)
- [x] Tests for the module (point counts, first and last points match the source after thinning, radius range); browser check of each path

**The files** are in the repo at `docs/research/sources/mission-viz/` (copied from <https://github.com/nasa/mission-viz>, folder `X3Dom/`, commit c6f2270 of 16 May 2022). Each is a list of points with Date, Time, X, Y, Z (km, Earth-centred equatorial frame):

| File | Points | Covers | What it is |
|---|---|---|---|
| `missionfile.js` | 150 | 1.27 days from 1 Jan 2000 | LEO → GEO transfer: starts about 637 × 990 km, two burns, ends circular at 42,165 km radius |
| `MolniyaOrbit.json` | 155 | 3.0 days | Despite the name: about 2,240 × 151,900 km altitude, 12.45° inclination, 66.7 h period. Not a real Molniya orbit; do not call it one in game |
| `LunarTransferTrajectory.js` | 1,269 | 21.4 days from 22 Jul 2014 | the spacecraft's Earth → Moon path |
| `LunarOrbit.js` | 1,269 | same times | the Moon's path over the same days |

The `.js` files wrap JSON in a JavaScript string (`var trajectory = '...'`). Parse them as text in the script; never execute them.

**Licence and credit:** the mission-viz repo has no top-level licence file; `X3Dom/LICENSE` is the X3DOM library's own MIT/GPL licence, not the trajectories'. It is NASA-published material. Credit: "NASA Mission Viz (github.com/nasa/mission-viz), trajectories generated with NASA GMAT" _(verify the licence wording with the team before shipping)_.

**In the code (read-only pointers):** Space view scene `src/world/spaceView.ts`, screen and list `src/ui/spaceScreen.ts`, camera `src/world/spaceCamera.ts`; orbit maths `src/game/space.ts`; geostationary explanation strings `planner.geoNote`, `problem.needsEngine` in `src/strings.ts`; Launch planner `src/ui/launchPlanner.ts`; Test Run `src/ui/testRun.ts`. Earlier bakes for the pattern: `scripts/build_blue_marble.py` → `src/world/blueMarble.ts`.

**Sources:** NASA Mission Viz <https://nasa.github.io/mission-viz/> (Daniel O'Neil, NASA, 2015–2018: tutorial series on drawing a GMAT trajectory in a web page). GMAT <https://software.nasa.gov/software/GSC-19468-1>. Numbers above: `docs/research/official-resources.md`.

**In the repo for this ticket:** [`docs/research/sources/mission-viz/`](../research/sources/mission-viz/) (source files, read as data; index in [`sources/README.md`](../research/sources/README.md)). Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md).

**Open points:**
- Planner or Test Run for the Syncom 3 path (or both). The planner already explains the transfer orbit in text.
- The Moon path needs the Moon drawn in the Space view; the Moon itself is Optional in `CHECKLIST.md`. A simple grey sphere on the GMAT path may be enough here.
- Thinning: keep every burn and the closest approach points; drop points on smooth arcs.

**Built (2026-11-13):**
- `scripts/build_reference_paths.py` → `src/world/referencePaths.ts` (18 KB, 515 of 2,843 points). Thinning is time-synchronised Douglas-Peucker: a dropped point is never more than 0.3% of its distance from Earth off the path at its own time, so the moving dot stays on time. Burns are found where the orbit's size jumps (vis-viva between points): two, 5 h 20 min apart. Helpers in `src/world/referenceTrajectory.ts`; 16 tests.
- **Planner, not Test Run:** the face-on picture (`src/ui/transferPicture.ts`) sits under `planner.geoNote` and shows only for geostationary Contracts. It says "A sample path, not Syncom 3's own": the file is a generic GMAT run starting 1 Jan 2000, not Syncom 3's flight.
- **Space view:** a Reference paths section under the Spacecraft list. Paths are dashed and orange (the Company's are solid and blue); white dots mark burns; the Moon is a grey ball (real size) with a glow, on its own grey path. Each path starts from its beginning when switched on and loops. The camera's far limit grows to 30,000 units and the stars travel with the camera, so the Moon fits.
- **Frame:** GMAT x, y, z → view x, z, −y (north up, as the globe). Earth's spin angle is for looks, as before.
- **Earth → Moon line changed:** the file is not three weeks to the Moon. It starts 158,000 km out, swings past Earth (8,620 km from its centre on day 1.4), reaches the Moon on day 6.4 and then circles it about 9,200 km from its centre for two weeks. Player line: "Six days to the Moon after one swing past Earth, then two weeks circling it."
- **Speed:** paths run at the Space view's 300×, as asked. The Earth → Moon flight then takes about 1 h 43 min of real time to play through; a faster speed for Reference paths is a one-line change if the team wants it.
- Credit wording still _(verify)_ with the team: "NASA Mission Viz (github.com/nasa/mission-viz, Daniel O'Neil, NASA), trajectories generated with NASA's General Mission Analysis Tool (GMAT)".
