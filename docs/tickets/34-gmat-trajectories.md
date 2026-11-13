# 34: NASA's GMAT trajectories in the game

**What to build:** Use the real trajectories that NASA Mission Viz ships, computed with NASA's General Mission Analysis Tool (GMAT), as Reference Trajectories.

1. **Syncom 3's transfer orbit:** the Launch planner (geostationary Contracts) or the Test Run shows the real LEO → GEO run: a low orbit, two burns, ending in a circle 42,165 km from Earth's centre. Labelled "Path computed with NASA's GMAT".
2. **Reference paths in the Space view:** a short list ("Reference paths") the player can switch on: the LEO → GEO transfer, a long ellipse, and the Earth → Moon flight with the Moon's own path. Drawn thin and clearly apart from the Company's Spacecraft.

**Blocked by:** 27, 31

**Status:** not started (approved 2026-11-13)

- [ ] A script (not run by the game) reads the four files below, thins them and writes one small TypeScript module with the points in km (e.g. `src/world/referencePaths.ts`); the module stays small (aim for under 30 KB; raw files are about 250 KB)
- [ ] The script reads the four source files from `docs/research/sources/mission-viz/` (already in the repo, unchanged from NASA's repo) and records where they came from (repo, path, commit)
- [ ] Syncom 3: the planner or Test Run shows the transfer path with its two burns marked and the "Path computed with NASA's GMAT" label
- [ ] Space view: a Reference paths list; each path can be shown or hidden; the Earth → Moon path plays with the Moon moving on its own path, at the Space view's speed
- [ ] Frame handled correctly: the files are Earth-centred, equatorial X, Y, Z in km; Earth's axis in the Space view matches
- [ ] Each path has one plain line ("How a rocket's upper stage and a Spacecraft's engine reach geostationary orbit", "A long ellipse: fast at the low point, slow far out", "Three weeks from Earth to the Moon") and Learn more → Mission Viz
- [ ] Real data list and Credits: a Mission Viz / GMAT entry in `DATASETS` (`src/game/sources.ts`) with strings `data.<id>.*`
- [ ] Glossary term **Reference Trajectory** used in code names and text ("reference path" is fine in player text if the glossary says so)
- [ ] Tests for the module (point counts, first and last points match the source after thinning, radius range); browser check of each path

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
