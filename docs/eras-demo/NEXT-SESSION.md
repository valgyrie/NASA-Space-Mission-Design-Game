# Eras demo: prompt for the next session

Paste the block below into a new Claude Code session opened in
`C:\Users\moham\Downloads\Space-apps\NASA-Space-Mission-Design-Game` (or wherever the repo is cloned).

---

You are continuing the **Eras demo** of LEAP (NASA Space Apps 2026 game). The team asked on 15 Nov 2026 to add two
Eras for the demo: **the Moon landing (Era 3, Apollo 11)** and **the Artemis Era (Artemis II, III, IV)**, with the
rocket that takes the astronauts to the Moon, a realistic landing on the Moon the player can look around, a Moon
model, correct NASA facts, and everything in the Credits. Blender or downloaded assets may be used (credited).

Start here:
1. `git pull` (work is merged into `main`; keep working on branch `eras-moon-artemis`, rebased on `main`, and merge
   into `main` when tested). Read `AGENTS.md`, `PROGRESS.md` (top block "Eras demo"), `docs/eras-demo/PLAN.md`
   (scope, ownership, the MoonShow interface, this PC's set-up) and this file.
2. Bash: `export PATH="$PWD/.leap/node:$PATH"`, then `npm run check` (534 tests pass at hand-over).
3. The user's rule: write code with Claude Opus subagents, at most two at a time; commit and push checkpoints early;
   push a handoff before usage runs out.

State at hand-over (15 Nov, afternoon):
- **Game logic: done** (commit b36a5d9). Era 3 with Milestone `apollo11` (science package on Saturn V from Kennedy
  39A, lunar night, radio from the Moon at a fifth, 45 kg limit), a Saturn V development card before it; Campaign
  Era 5 from 1 Jan 2026 (Era 4 skipped) with `artemis2` (12U CubeSat on SLS from 39B), choice Milestones `artemis3*`
  and `artemis4*` (any one completes; finale card, then Continue in Free Play); Demo Mode starts for Era 3 and Era 5;
  save v20 with a migration. New Parts: `sciencePackage`, `dishAntenna`, `foldOutPanels`, `cubeSatBus`,
  `relayRadio`, `lander`. Details: tickets 50 and 52, "As built (demo)".
- **3D: mostly built, never reviewed on screen.** The 3D agent was stopped mid-task for the usage limit; its work is
  committed as it stood (type check and tests passed). Built: Moon globe from NASA's CGI Moon Kit
  (`public/textures/moon/`, `scripts/blender/build_moon.py`, `src/world/moonGlobe.ts`), lunar surface patches,
  landing dust, Apollo CSM/LM, Orion, ICPS, a neutral lander, astronauts, retroreflector (`src/world/moon*.ts`), the
  four Moon sequences with captions and drag-to-look-around (`src/world/moonShow.ts`, `moonCamera.ts`, strings
  `moonShow.*`), Saturn V and SLS (`src/world/rocketMoon.ts`), LC-39A/39B pads in code (`launchPad.ts`), meshes for
  the six new Parts (`spacecraftMesh.ts`), the Moon in the Space view.
- Its last step was "fix the Artemis III satellite placement and player framing" (unfinished).

To do, in order:
1. **Look at it.** Start the dev server (preview tool, `.claude/launch.json` one folder up, name `leap-dev`) and play
   Demo Mode → Era 3 to the Apollo 11 Launch, and Demo Mode → Era 5 through Artemis II, III (each choice) and IV
   (each choice). Check: Saturn V and SLS on their pads and climbing, staging, the Moon sequences (landing, dust,
   astronauts, Earth in the sky, the player's Spacecraft), dragging to look around, captions, the Mission days after
   the Moon segment, the Mission Report, the finale and Continue in Free Play, the Space view, the Mission Designer
   with the new Parts, the Launch planner with the Moon rockets. 1280×800 and 1024×768. No console errors.
2. Fix what is wrong (Artemis III framing first). Keep 50+ fps on the Intel UHD laptop.
3. **Credits:** finish `docs/art/assets-moon.md` (hardware-shape references and the NASA pages behind every
   `moonShow.*` caption fact); make sure Credits in the game lists the Moon Kit and the NASA reading sources.
4. Facts marked _(verify)_ (see ticket 50/52 "As built" and `docs/research/eras-3-5.md`): Kennedy 39A/39B
   coordinates, Falcon 9's lift to the Moon (~1,900 kg from IM-1), Saturn V's last flight (14 May 1973), EASEP 77 kg
   from a nasa.gov page. Optional: NASA photos for the new history cards (public domain, `public/history/`, ≤ 200 kB).
5. Optional polish if time allows: LC-39A/39B pads in Blender (`scripts/blender/build_launch.py`) instead of code.
6. Update tickets 50/52, `CHECKLIST.md` (tick only what was tested), `PROGRESS.md`; commit, push, merge into `main`.
