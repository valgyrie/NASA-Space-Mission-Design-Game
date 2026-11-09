# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–07 done and merged into `main`. Tested in headless Chromium at 1440×900 and 1024×768: open from the HUD, Site pauses (date stops), pick all six slots, bars and warnings react (Small Battery → "Power: runs out on day 16 of 30"), drag and wheel turn and zoom the model, Buy missing Parts fills the Warehouse, Esc closes and the speed comes back, design and Parts survive reload, no console errors.
- **3D models:** detailed per Part (seams, bolts, battery cells in a cage, cell grids, hinged whips, spin weights and nozzles, Geiger tube window, launch adapter) against stars and the real Earth (Natural Earth continents, deserts, forests, ice; clouds and an atmosphere glow), drawn at its true apparent size from 13,000 km and pinned to the lower part of the view. Rebuild the map with `scripts/build_earth_map.py`; sources and sizes in `docs/research/earth-map.md`. What each Part looks like: GDD §7. Low metalness on purpose: there is no environment map, so shiny metal renders dark.
- **Domain:** `src/game/spacecraft.ts`: slots, options, `Design`, `choose`, `checkDesign` (six `Gauge`s + typed `DesignProblem`s), `missionGoal` (first accepted Contract, else first on offer), `partsToBuy`, `costToBuy`, `buyMissing`. Numbers in `src/game/balance.ts` (`OPTION_STATS`, `SUNLIT_SHARE`). Bar definitions: GDD §7.
- **Launch Vehicles:** `src/game/launchVehicles.ts` has only Juno I (14 kg to LEO, still _(verify)_). Ticket 08 adds choosing, prices and the spaceport.
- **New Part:** Radiation Detector (Electronics Lab). Part masses were cut so an Explorer 1-like design fits Juno I (Small Bus 3 kg, Medium 8, batteries 3/6, computer 1).
- **Save v6:** `SiteState.design`; v5 saves get an empty design and `parts.radiationDetector = 0`.
- **UI:** `src/ui/missionDesigner.ts` (full-screen dialog), 3D in `src/world/spacecraftView.ts` (own small renderer, runs only while open) and `spacecraftMesh.ts`. The Site isn't drawn while the designer is open (`world.hidden`).
- **Facts:** Explorer 1 numbers checked and quoted in `docs/research/spacecraft-parts.md`.

**Next:**
1. Ticket 08 (First full Mission loop; notes from ticket 07 are in its file): Juno I picker with mass check (`spacecraftMass`, `LAUNCH_VEHICLES`), take the Parts out of the Warehouse when shipping (`partsNeeded`), Rideshare per kg, Mission Report from `checkDesign` problems. Also unblocked: 15, 19, 20, 25, 30.

**Open:**
- Solar Cells are shown but locked (`LOCKED` in `spacecraft.ts`); ticket 14 should unlock them with Vanguard 1.
- No Computer or Propulsion slot yet. Explorer 1 had no tape recorder (Explorer 3 did): a Basic Computer as Data storage could come with TIROS-1.
- Power doesn't check Earth's shadow yet (every battery covers it in Era 1); ticket 12's eclipse Anomaly will need it.
- Communications ignores Ground Stations (ticket 18).
- Assembly days (30/45 by Bus) are counted in the Time bar but nothing waits for them yet (ticket 08/15).
- Explorer 1 numbers ($3M reward, 365 days) are first guesses; tune once Rideshare prices exist (ticket 08).
- A passed deadline only shows "deadline passed". Penalties and retries belong to ticket 17.
- Balance numbers are first guesses. Performance on real laptops still unknown. Narrower than 1024 px is not checked (the designer's slot list scrolls at 1024×768).
- No "New game"/reset yet. Speed isn't saved.
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `domain-modeling` (Launch Vehicle, Rideshare, Shipping terms in ticket 08), `handoff`.

## Log

- 2026-11-09: Mission Designer globe now shows the real Earth (Natural Earth map, true apparent size from 13,000 km); merged.
- 2026-11-09: Ticket 07 done and merged: Mission Designer with six slots, detailed rotating 3D Spacecraft over Earth, six live bars, Radiation Detector Part, save v6.
- 2026-11-09: Ticket 06 done: Contracts board, Explorer 1 Contract with deadline, save v5.
- 2026-11-08: Checked existing Raw Material sales; added regression tests and a README note, fixed the stock message and pause overlay.
- 2026-11-08: Ticket 05 done: Factories, Warehouse storage by mass, Market, detailed moving models; camera follows ground height.
- 2026-11-08: Keyboard camera + H for the whole-Site view, pan past the Site, detailed Mine with turning wheel; ticket 30 (buy Plots, Optional) written.
- 2026-11-08: Seed moved to a pause menu (Esc); land carries on to the horizon; perspective camera with tilt (ADR-0003); working sun shadows.
- 2026-11-08: Ticket 04 done: Mines on Deposits, Game date with pause/1×/2×/4×, top bar, save v3.
- 2026-11-08: Ticket 03 done: Site generated from a Seed (terrain, water, Deposits), Seed shown and copyable.
- 2026-11-08: Ticket 02 done: Company name with bad-word filter, local autosave, strings file.
- 2026-11-08: Ticket 01 done: Vite + Three.js skeleton, isometric camera, pre-commit checks.
- 2026-11-07: Game named **LEAP: A Space Mission Design Game** (Launch · Engineer · Advance · Pioneer).
- 2026-11-07: Music prompts, cited research, `to-tickets` installed, 28 tickets approved and published.
- 2026-11-07: Design session done; GDD, glossary, ADR-0002, checklist, AGENTS.md written.
- 2026-11-07: Researched the challenge, chose the web stack, wrote `docs/challenge.md`, set up phase-1 skills and memory files.
