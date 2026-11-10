# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–11, 13 (waits for a person to time the first Launch), 14, 15, 16, 17 and 31 done; local launchers merged. This session (branch `claude/magical-davinci-6i2awc`) built ticket 17.

**Just finished: ticket 17, risk and failure.** Rules: GDD §5 (grant), §6 (retry, failure story), §8 (failures, insurance). Facts: `docs/research/launch-vehicles.md` (records), `docs/research/milestones.md` (Vanguard TV3).
- **Launch Vehicle failures** (`drawRocket`, `realFlight`, `testRun` in `src/game/flight.ts`; `rocketReliability` in `mission.ts`): Juno I works 80%, Thor-Able 85% (real records 3 of 6 and 10 of 16, cut to 40% of the real failure share; game estimates in `balance.ts`). The Company's first Launch always works. Any stage can fail; the orbit finding gets `failedStage`.
- **Test Run:** estimated success = design runs × reliability (exact, no luck), with a line giving both.
- **Launch show** (`ascent.ts`, `launchView.ts`): stops half-way through the failed stage, the rocket tips and falls with no flame; "Stage n failed: the pieces fell into the Atlantic, far from people. That is why launch sites are on the coast." (the coast effect).
- **Launch Insurance** (`insuranceQuote`, `shipMission(..., { insure, seed })`): tick box in the planner's Costs card. Pays back 80% of Rideshare + Shipping on any failure; price = payout × fail chance × 1.3, min 3%, none under 50% estimated success. Paid back in `launch()`; the report says how much.
- **Retry:** `expireContracts` (in `advanceDays`) puts a Contract back on the board when its deadline passes and no Mission for it is on its way; the board says so (`state.reopened`). The report says "your design was fine" when only the rocket failed.
- **Failure story:** the Company's first failed Mission unlocks the `vanguardTV3` card (new `when: 'failure'`), shown after the report and kept in the History Archive.
- **Startup grant** (`src/game/grant.ts`, `src/ui/grantCard.ts`): under $300K with no Mission on its way, $1M once, as a card when nothing else is on screen.
- **Save v14:** `mission.insurance`, `report.insurancePaid`, `state.reopened`, `state.grantDay`.
- **Tested** in headless Chromium at 1280×800: planner (reliability lines, insurance on/off and price), Test Run line, ship with insurance, a stage-4 and a stage-1 failure in the show, report with payout and "design was fine", Vanguard TV3 card once, grant card, missed deadline back on the board. No console errors. 262 unit tests pass; build passes.
- Not tested: a person playing it; the Simple view's failure; touch.

**Next:**
1. Team: judge the rocket odds (80%/85% feel fair?), the insurance prices and the grant amount; try a failed Launch and a missed deadline.
2. Open tickets: 12 (Stuck solar panel, Survive the eclipse), 18, 19, 20, 25, 30. Ticket 27 is unblocked (adapt to the official Resources, Nov 13).

**Open:**
- No NASA photo of the Vanguard TV3 explosion was found; the card shows a Vanguard rocket on its pad (1958). Swap in a better one if found.
- A Spacecraft lost to the rocket still lists Power, Comms and Time as met in the report (same as a too-heavy one).
- No Reputation penalty for a missed deadline yet. Insurance covers design failures too (the price includes them).
- Insurance price shows twice in the Costs card (the tick box and the row) when ticked.
- From before: coordinates of JPL, LC-26 and Wallops _(verify)_; 12 m/s wind limit _(verify)_; the game keeps running while the Scrub card is open; 2° place data; straight-line Shipping; no place names on the globe; fewer Mines per Deposit since 3 × 3 buildings; tall foundations on steep slopes; Market shows only totals per Part; no Upgrade-done toast; no Computer slot; Thor-Able staging gaps _(verify)_; Lab lists every tech item; TIROS-1 Parts are scaled-down estimates; guide "Step 1" after the name; glow under dialogs; no Company logo on patches (19); Anomaly chance fixed until Ground Stations (18); one Anomaly per flight; Explorer 1's coast timing _(verify)_; orbits never decay; no "New game"; Speed not saved.
- Launcher checks wait for the final ticket (see AGENTS.md).
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `handoff`; `grill-with-docs` before ticket 18's design.

## Log

- 2026-11-10: Ticket 17 built: Launch Vehicle failures (first Launch safe), Launch Insurance, missed deadlines reopen Milestones, Vanguard TV3 failure story, one-time startup grant, save v14.
- 2026-11-10: Ticket 16 built: globe start picker, NASA POWER 2025 climate shapes the Site, Wallops Island as a second Launch Site with less lift, Shipping by distance, real launch weather Scrubs, Launch Window advisor, save v13.
- 2026-11-10: Buildings now take 3 × 3 tiles (visible from the whole-Site view, Site still 64 × 64, older saves refitted); Earth from space is a smooth globe with rounded coasts.
- 2026-11-10: Ticket 15 built: building levels and Upgrades, Part Marks (Mk 1–3), Assembly Hall (starts on the Site, sets the biggest Bus), save v12.
- 2026-11-10: Ticket 14 built: TIROS-1 Milestone, Vanguard 1 card unlocks Solar Cells, TV Camera, Thor-Able (3D too), Research Lab, Research Points and four Era 1 tech tree Upgrades, save v11.
- 2026-11-10: Ticket 13 built: Explorer 1 tutorial guide, Real History cards with NASA photos, Mission Patches, History Archive, save v10 (ticket 12 waits for 14).
- 2026-11-10: Synced the launcher branch with newer main; kept its game, tickets and current handoff.
- 2026-11-10: Deferred further launcher validation to the final ticket; existing game checks stay in place.
- 2026-11-10: Added local launchers with dependency setup, progress, browser opening and reopening; game code and tickets unchanged.
- 2026-11-09: Ticket 11 done: Anomaly framework and Point the antenna (mouse mini-game during the Launch show, first one can't be skipped, chance from the Comms margin, lost Data cuts the pay), save v9.
- 2026-11-09: Ticket 31 (new) done: Space view with every Spacecraft in orbit on its real orbit, click to follow; reports keep their design, save v8. Tickets 10 and 31 merged into `main`.
- 2026-11-09: Ticket 10 done: 3D Launch of Juno I (pad, staging, orbit, Mission days) between Launch and the Mission Report, with speed, skip and a simple view for slow devices.
- 2026-11-09: Ticket 09 done: free Test Run with orbit view, battery and Data graphs, estimated success from 200 seeded runs; the real Launch flies the same model.
- 2026-11-09: Watch the Shipping: Spacecraft assembled on a truck at a dock, truck drives off the Site, Follow the truck, Mission tracker with the dates to come.
- 2026-11-09: Ticket 08 done: Launch planner (Juno I mass check, Rideshare per kg, Shipping to Cape Canaveral), Launch from the HUD, Mission Report with reasons, reward paid, save v7.
- 2026-11-09: Mission Designer globe now shows the real Earth (Natural Earth map, true apparent size from 13,000 km); merged.
- 2026-11-09: Ticket 07 done and merged: Mission Designer with six slots, detailed rotating 3D Spacecraft over Earth, six live bars, Radiation Detector Part, save v6.
