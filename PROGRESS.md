# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–04 are done and merged to `main`. Then, at the team's request (tested in headless Chromium):
- **Seed** moved out of the top-left panel into a **pause menu** (`src/ui/menu.ts`): Esc or ☰ opens it, pauses the Site, shows the Seed with Copy; Esc/Resume closes and restores the speed. Esc while placing a Mine only stops placing.
- **Horizon:** `src/site/site.ts` now builds a `Land` (`landOf(site).groundAt(x, z)`) that works for any tile position, so the scenery around the Site matches it and coasts and rivers carry on (river outside the Site uses its own random numbers, so Sites are unchanged). `src/world/siteMesh.ts` draws the Site (`terrain`, the only clickable mesh), near scenery (48 tiles, full detail, light haze), far scenery (4×4 blocks to 224 tiles), a water plane and a white border line. Shared terraced builder: `src/world/terrainMesh.ts`.
- **Camera** (ADR-0003): perspective, 30° lens, opens at the isometric angle; right-drag tilts 7°–70°; pan stays over the Site. Maths in `src/world/camera.ts` (was `isoCamera.ts`). Sky dome + fog that follows zoom (`hazeFor`) in `src/world/world.ts`.
- **Shadows:** the sun's shadow area was never applied before (`updateProjectionMatrix` was missing), so shadows only covered the centre. Fixed, sun lowered, 4096 shadow map, plus baked corner/cliff shading in the terrain colours.
- Frame time cap raised to 1 s so slow computers keep game time in step.

**Next:**
1. Ticket 05 (Factories and Market). Buildings go in `World.buildings`; placement reuses `tileAtScreen`/`markTile`.
2. Also unblocked: 06, 19, 25.

**Open:**
- Performance: about 110k triangles + 4096 shadow map. Fine on real GPUs; headless software rendering gets ~4 fps. If a teammate's laptop struggles, lower the shadow map to 2048 or shrink `FAR_REACH` in `siteMesh.ts`.
- Seams between near and far scenery can show small cliffs; they're about 50 tiles out and in the haze.
- No "New game"/reset yet (clear site data). Speed isn't saved. Balance numbers are first guesses.
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `domain-modeling` (Factory, Part, Warehouse in ticket 05), `handoff`.

## Log

- 2026-11-08: Seed moved to a pause menu (Esc); land carries on to the horizon; perspective camera with tilt (ADR-0003); working sun shadows.
- 2026-11-08: Ticket 04 done: Mines on Deposits, Game date with pause/1×/2×/4×, top bar, save v3.
- 2026-11-08: Ticket 03 done: Site generated from a Seed (terrain, water, Deposits), Seed shown and copyable.
- 2026-11-08: Ticket 02 done: Company name with bad-word filter, local autosave, strings file.
- 2026-11-08: Ticket 01 done: Vite + Three.js skeleton, isometric camera, pre-commit checks.
- 2026-11-07: Game named **LEAP: A Space Mission Design Game** (Launch · Engineer · Advance · Pioneer).
- 2026-11-07: Music prompts, cited research, `to-tickets` installed, 28 tickets approved and published.
- 2026-11-07: Design session done; GDD, glossary, ADR-0002, checklist, AGENTS.md written.
- 2026-11-07: Researched the challenge, chose the web stack, wrote `docs/challenge.md`, set up phase-1 skills and memory files.
