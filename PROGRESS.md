# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–04 are done and tested in headless Chromium.
- 01 camera (`src/world/`), pre-commit `npm run check`. 02 Company name, local save, `src/strings.ts`. 03 Site from a Seed (`src/site/`, `src/world/siteMesh.ts`).
- 04: `src/game/siteState.ts` holds `SiteState` (money, `day`, Mines, stock) and the pure rules: `checkMine`/`placeMine`, `advanceDays`, `daysFor` (speed, capped at 0.25 s per frame). Numbers in `src/game/balance.ts`. `src/playSite.ts` runs the Site view: builds the map and Mines, the frame loop, placement (hover = green/red tile, click-not-drag builds, Esc stops, Space pauses). UI: `src/ui/topBar.ts` (money, Game date, stock with +/day, speed), `src/ui/buildMenu.ts`, `src/ui/format.ts`. Mine model `src/world/mineMesh.ts`; `World` gained `onFrame`, `tileAtScreen`, `markTile`, `addMine`.
- Save is `version: 3` with `state`; versions 1 and 2 upgrade step by step (`src/save/save.ts`). A Mine placement saves at once; autosave every 30 s and on page hide.
- Dev builds expose `window.leap` (`world`, `site`, `state`, `setSpeed`) for browser tests.

**Next:**
1. Ticket 05 (Factories and Market): Factories are the next building in `buildMenu.ts`; Parts and a Warehouse join `SiteState` (bump `SAVE_VERSION`, add an upgrade step).
2. Also unblocked: 06 (Contracts board), 15 (Upgrades, needs 05), 19 (logo), 25 (sound).

**Open:**
- Balance numbers are first guesses ($2M start, $150K Mine, 10 kg/day, 2 s per game day). Tune when Factories and Contracts exist.
- Speed is not saved; the game always resumes at 1×.
- No "New game" or reset button yet (clear the site's local storage to start over).
- Top bar is wide (~740 px); fine on desktop, crowded on small screens.
- Team should save the organisers' early-start permission in writing. Official Resources tab not captured yet (Nov 13).

**Suggested skills:** `domain-modeling` (Factory, Part, Warehouse terms in ticket 05), `handoff`.

## Log

- 2026-11-08: Ticket 04 done: Mines on Deposits, Game date with pause/1×/2×/4×, top bar, save v3.
- 2026-11-08: Ticket 03 done: Site generated from a Seed (terrain, water, Deposits), Seed shown and copyable.
- 2026-11-08: Ticket 02 done: Company name with bad-word filter, local autosave, strings file.
- 2026-11-08: Ticket 01 done: Vite + Three.js skeleton, isometric camera, pre-commit checks.
- 2026-11-07: Game named **LEAP: A Space Mission Design Game** (Launch · Engineer · Advance · Pioneer).
- 2026-11-07: Music prompts, cited research, `to-tickets` installed, 28 tickets approved and published.
- 2026-11-07: Design session done; GDD, glossary, ADR-0002, checklist, AGENTS.md written.
- 2026-11-07: Researched the challenge, chose the web stack, wrote `docs/challenge.md`, set up phase-1 skills and memory files.
