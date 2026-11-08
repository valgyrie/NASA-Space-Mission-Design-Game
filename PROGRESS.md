# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01, 02 and 03 are done and tested in headless Chromium.
- 01: isometric camera (`src/world/world.ts`, `isoCamera.ts`). Pre-commit hook runs `npm run check`.
- 02: Company name + bad-word filter (`src/company/`), local autosave (`src/save/save.ts`), all text in `src/strings.ts` (guarded by a test).
- 03: `src/site/site.ts` `generateSite(seed, climate?)` is pure and deterministic: 64×64 `Tile`s (`terrain`, `level`, `deposit`), `water` kind (coast/lake/river/none), placeholder `climate.dryness`. Seeded random and noise in `src/site/random.ts`; Seed rules in `src/site/seed.ts`. 3D model in `src/world/siteMesh.ts` (one vertex-coloured mesh, water plane, instanced deposit rocks); `World.showSite()` swaps it. New-game dialog has a Seed field with 🎲 and live preview; HUD shows Seed + Copy + deposit colour legend.
- Save is now `version: 2` with `site.seed`; version 1 saves are upgraded with a random Seed.

**Next:**
1. Ticket 04 (Mines and time): Mines go on tiles where `deposit` is set. Tile → world position: `tileCentre()` and `STEP` in `src/world/siteMesh.ts`. Picking a tile needs a raycast against the terrain mesh (not built yet).
2. Also unblocked: 06 (Contracts board), 19 (Company logo), 25 (sound and music).
3. Ticket 16 replaces `placeholderClimate()` with real NASA POWER data (pass `climate` to `generateSite`). Changing the generator changes every saved Site, since only the Seed is stored.

**Open:**
- No "New game" or reset button yet (clear the site's local storage to start over).
- Should mountain tiles be buildable? Copper often sits on them. Decide in ticket 04.
- Team should save the organisers' early-start permission in writing.
- Official Resources tab not captured yet (Nov 13).
- Build skills (`tdd`, `codebase-design`, …) still not installed.

**Suggested skills:** `domain-modeling` (Mine, game time terms in ticket 04), `handoff`.

## Log

- 2026-11-08: Ticket 03 done: Site generated from a Seed (terrain, water, Deposits), Seed shown and copyable.
- 2026-11-08: Ticket 02 done: Company name with bad-word filter, local autosave, strings file.
- 2026-11-08: Ticket 01 done: Vite + Three.js skeleton, isometric camera, pre-commit checks.
- 2026-11-07: Game named **LEAP: A Space Mission Design Game** (Launch · Engineer · Advance · Pioneer).
- 2026-11-07: Music prompts, cited research, `to-tickets` installed, 28 tickets approved and published.
- 2026-11-07: Design session done; GDD, glossary, ADR-0002, checklist, AGENTS.md written.
- 2026-11-07: Researched the challenge, chose the web stack, wrote `docs/challenge.md`, set up phase-1 skills and memory files.
