# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–08 done and merged into `main`. The whole loop works roughly: accept Explorer 1, design, Plan the Launch, book the Rideshare and ship, watch the Spacecraft get assembled on a truck and driven off the Site, Launch from the HUD or the Mission tracker, read the Mission Report, get paid. Tested in headless Chromium at 1440×900 and 1024×768: Medium Bus blocked ("2.5 kg too heavy for Juno I…"), Small Battery ships with a warning and fails ("Power ran out on day 16 of 30…", Contract stays open), Large Battery succeeds and pays $3M, Contract moves to Done, Esc closes the report and the speed comes back, everything survives reload, no console errors.
- **Domain:** `src/game/mission.ts`: `planLaunch` (costs, days, blocking `PlanProblem`s), `shipMission` (pays, takes Parts, sets `state.mission`), `missionStage` (assembling → shipping → ready), `launch` (`flightFindings` → `MissionReport`, pays via `completeContract`). How it plays and the numbers: GDD §8 and §10.
- **Launch Vehicles and Sites:** `src/game/launchVehicles.ts` (`perKg`, `rideshareCost`, `LAUNCH_SITES`); prices in `balance.ts` (`RIDESHARE_PER_KG`, `SHIPPING`), both game estimates.
- **Spacecraft:** `spacecraft.ts` gained `powerOf`, `dataOf`, `hasRightPayload`, `assemblyDays`, `contractNeeds`, `isComplete`. `MissionGoal.accepted` became `status` ('accepted' | 'offered' | 'done'). The Time bar now adds Shipping days.
- **Save v7:** `SiteState.completed`, `mission`, `reports`; v6 saves get none.
- **Watching the Shipping** (added after review): `src/world/shippingView.ts` (dock, crane, truck, scaffold, crate, your Spacecraft from `buildSpacecraft`), `shippingRoute.ts` (dock tile and straight road off the Site, side with least water; tested), `World.updateShipping` / `followTruck`. `missionStage` now has `fraction`; `missionTimeline` gives the dates to come. Mission tracker panel: `src/ui/missionTracker.ts`. Left side panels now open below the HUD (`--hud-bottom`, set in `hud.ts`). Tested at 1440×900, 1280×800 and 1024×768, including reload mid-Shipping and a dock beside a Warehouse.
- **UI:** Launch planner inside the Mission Designer (`src/ui/launchPlanner.ts`), HUD mission line and Launch button (`hud.ts`), Mission Report dialog (`missionReport.ts`), Done list on the Contracts board. Wiring in `playSite.ts` (`launchMission`).

**Next:**
1. Ticket 10 (3D Launch and flight: the user wants to watch the Launch too) or 09 (Test Run); notes from 08 are in their files. Also unblocked: 15, 16, 17, 19, 20, 25, 30.

**Open:**
- The truck drives in a straight line over terraces and water (it rides up steps smoothly); there are no roads. The Spacecraft on the truck is small (about a quarter tile).
- After Explorer 1 there are no more Contracts until ticket 14; the designer then shows "For: Explorer 1 (done)".
- The Mission Report appears the moment you Launch; the 30 flying days don't pass on the Game date (ticket 10 can decide).
- A Spacecraft whose Power dies still "finishes" on schedule in the Time line; fine for now.
- Rideshare $40K/kg and Shipping $25K / 7 days are guesses; tune with playtests. Juno I's 14 kg is still _(verify)_.
- Solar Cells locked until ticket 14. Power ignores Earth's shadow (ticket 12). Communications ignores Ground Stations (ticket 18).
- A passed deadline does nothing yet (ticket 17). No "New game"/reset. Speed isn't saved.
- Performance on real laptops unknown; narrower than 1024 px not checked.
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `handoff`; `research` if Juno I numbers get checked.

## Log

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
- 2026-11-07: Music prompts, cited research, `to-tickets` installed, 28 tickets approved and published.
