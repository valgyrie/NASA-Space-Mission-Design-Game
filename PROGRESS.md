# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–11, 13 (waits for a person to time the first Launch), 14 and 31 done; local launchers merged. **Ticket 14 is built** on `claude/focused-shannon-y99w5e`: Era 1's Milestones are both playable.

**Just finished: ticket 14, Era 1 complete.** How it plays: GDD §6 "Research (ticket 14)" and "TIROS-1 Milestone", §7 "TIROS-1 numbers", §8 "Thor-Able". Code notes: the ticket's "For later tickets".
- **Loop:** Explorer 1 succeeds → "after" card → **Vanguard 1** side story card ("Power from the Sun") unlocks Solar Cells → **TIROS-1** appears on the board (NASA, TV camera, 78 days, $5M) → its "before" card → design with Medium Bus, Solar Cells, a battery and the new **TV Camera** → too heavy for Juno I, so pick **Thor-Able** (120 kg, $25K/kg, opens after Explorer 1) → 3D Thor-Able Launch → "after" card and second Mission Patch.
- **Research:** Spacecraft in orbit send Data home while they work; a **Research Lab** ($250K, new 3D model with a turning dome) turns 50 kB a day into Research Points (100 kB each). Top bar shows RP. Click a Lab for the **tech tree**: Better solar cells, Stronger radio, Better batteries (5 RP each), Low-power electronics (8). A shipped Spacecraft keeps the Upgrades it shipped with.
- **Code:** `src/game/research.ts` (new), `statsOf`/`UNLOCKED_BY` in spacecraft.ts, `Contract.after`, `LaunchVehicle.opensAfter`, side story cards in history.ts, Thor-Able in rocketMesh.ts. **Save v11** (a v10 Company that had done Explorer 1 gets the Vanguard 1 card).
- **Photos:** NASA "Vanguard Satellite, 1958"; NASA/MSFC Thor-Able launching Explorer 6 (no TIROS-1 photo in NASA's library); NASA Terra image of Hurricane Gonzalo. Sources in `docs/research/milestones.md`.
- **Tested** in headless Chromium at 1280×800: flew Explorer 1 → Vanguard 1 card; TIROS-1 on the board, accepted with its "before" card; built a Research Lab, Data turned into 6 RP, bought Better solar cells; Mission Designer showed Solar Cells unlocked, the TV Camera model and the "Thor-Able in the Launch planner" warning; planner showed Juno I too heavy and Thor-Able fits; shipped, launched the 3D Thor-Able, report all green, "after" card, Archive with both patches and cards; reload kept it. No console errors. 205 unit tests pass; build passes.
- Not tested: a person playing it through at normal speed; Learn more links opening (all fetched fine).

**Next:**
1. Team: play Explorer 1 → TIROS-1 at normal speed; judge the TIROS-1 balance (78 days at 1× is about 2.5 minutes of waiting) and the RP pace. Also ticket 13's open box (time the first Launch).
2. Ticket 12 (Stuck solar panel, Survive the eclipse) is now unblocked. Also open: 15, 16, 17, 19, 20, 25, 30; 18 needs 15.

**Open:**
- No Computer slot, so TIROS-1's tape recorder isn't modelled. Thor-Able's staging gaps are game estimates _(verify)_.
- The Lab panel lists every tech tree item; later Eras need an Era filter.
- TIROS-1's real mass (122.5 kg) is far above the game's design (18–21 kg): Era 1 Parts are scaled-down estimates.
- From before: guide shows "Step 1" after the Company name; glow stays under dialogs; patches have no Company logo yet (19); Anomaly chance fixed until Ground Stations (18); one Anomaly per flight; Explorer 1's coast timing _(verify)_; blocky close-up Earth (26); orbits never decay; no "New game"; Speed not saved.
- Launcher checks wait for the final ticket (see AGENTS.md).
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `handoff`.

## Log

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
- 2026-11-09: Ticket 06 done: Contracts board, Explorer 1 Contract with deadline, save v5.
- 2026-11-08: Checked existing Raw Material sales; added regression tests and a README note, fixed the stock message and pause overlay.
- 2026-11-08: Ticket 05 done: Factories, Warehouse storage by mass, Market, detailed moving models; camera follows ground height.
