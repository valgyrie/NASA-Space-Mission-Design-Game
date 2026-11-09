# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–09 done (08 merged into `main`; 09 on branch `claude/gallant-goldberg-07ceik`, waiting for the team to merge). The whole loop works: accept Explorer 1, design, Plan the Launch, **Test Run**, ship, watch the truck, Launch, read the Mission Report, get paid.

**Just finished: ticket 09, Test Run.** How it plays: GDD §9 "First Test Run".
- **Domain:** `src/game/flight.ts`. `fly(plan, launchDay, deadline, spread)` works out one flight day by day (battery Wh, Data sent home, `powerOutDay`, findings). `drawSpread` varies Parts off their labels (`PART_SPREAD` in `balance.ts`: battery ±5%, power use ±5%, antenna ±10%, game estimates). `testRun` flies `TEST_RUNS` (200) seeded runs: `successPercent`, `missed` per requirement, battery best/worst band. `realFlight` draws one spread from Seed + Launch day.
- **Changed from ticket 08:** `flightFindings` is gone; `launch(state, seed)` now uses `realFlight`, so the real flight is one run of the same model and the % is honest. With Era 1 Parts nothing changes in play (the Explorer design is 100%, Small Battery 0%), because a 10% margin always holds. The team may want to know this decision; GDD §8 says it.
- `testRunFor(state, seed, design, vehicle)` in `mission.ts` uses the planner's Launch day and deadline. It needs no Contract, Parts or money.
- `Contract.orbitKm` (Explorer 1: 358 × 2,550 km, cited in `docs/research/earth-map.md`) draws the orbit.
- **UI:** `src/ui/testRun.ts` (canvas orbit view with Kepler motion, SVG graphs with a replay cursor, estimated success, predicted problems via the Mission Report's `findingText`). Button in the Launch planner footer; the Mission Designer now switches between three views (`showView` in `missionDesigner.ts`), and `showMissionDesigner` takes the Seed.
- **Tested** in headless Chromium at 1440×900, 1280×800 and 1024×768: Large Battery 100%, no problems, "Day 30 of 30"; Small Battery 0%, "Power ran out on day 16 of 30…", orbit dot goes grey on day 16; Test Run again gives the same %; Back returns to the planner; no console errors, no sideways scroll. 138 unit tests pass.

**Next:**
1. Ticket 10 (3D Launch and flight; notes from 08 and 09 in its file). Also unblocked: 15, 16, 17, 19, 20, 25, 30. Ticket 13 now waits only for 11.

**Open:**
- Every Era 1 design is 0% or 100%: in-between estimates need thinner-margin Parts (Solar Cells, ticket 14) or Launch Vehicle failures (ticket 17, add to both `realFlight` and `testRun`).
- The Test Run has no signal graph (needs Ground Stations, ticket 18) and ignores Earth's shadow (ticket 12).
- The truck drives in a straight line over terraces and water; there are no roads. The Spacecraft on the truck is small.
- After Explorer 1 there are no more Contracts until ticket 14.
- The Mission Report appears the moment you Launch; the 30 flying days don't pass on the Game date (ticket 10 can decide).
- Rideshare $40K/kg, Shipping $25K / 7 days and the Part spreads are guesses; tune with playtests. Juno I's 14 kg is still _(verify)_.
- A passed deadline does nothing yet (ticket 17). No "New game"/reset. Speed isn't saved.
- Performance on real laptops unknown; narrower than 1024 px not checked.
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `handoff`.

## Log

- 2026-11-09: Ticket 09 done: free Test Run with orbit view, battery and Data graphs, estimated success from 200 seeded runs; the real Launch flies the same model.
- 2026-11-09: Watch the Shipping: Spacecraft assembled on a truck at a dock, truck drives off the Site, Follow the truck, Mission tracker with the dates to come.
- 2026-11-09: Ticket 08 done: Launch planner (Juno I mass check, Rideshare per kg, Shipping to Cape Canaveral), Launch from the HUD, Mission Report with reasons, reward paid, save v7.
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
