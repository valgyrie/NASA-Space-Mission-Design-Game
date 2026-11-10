# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–11, 13 (waits for a person to time the first Launch), 14, 15 and 31 done; local launchers merged. **Ticket 15 is built** on `claude/relaxed-brown-rpznaa`.

**Just finished: ticket 15, building levels and the Assembly Hall.** How it plays: GDD §5 "Building levels (ticket 15)", "Marks" and "Assembly Hall". Code notes: the ticket's "For later tickets".
- **Team decisions (asked this session):** the Assembly Hall starts on every Site; each Part keeps its Mark (Mk 1–3) in the Warehouse; buildings keep working while upgraded.
- **Levels:** click any building: level, what the next level does, Upgrade button (cost and days), progress bar while it runs. Level 2 = building price, 15 days; level 3 = 2×, 30 days. Mines, Warehouses and Research Labs get +50% per level. 3D: gold stars on a little sign per level, a turning tower crane during an Upgrade.
- **Marks:** a level 2 Factory makes Mk 2 Parts (15% lighter, 10% less power, solar 10% more). Spacecraft take the best Mark in stock; the Market sells Mk 1 and buys back the worst first. The Mission Designer shows "Mk 2 · 2.6 kg"; lighter Parts cut the Rideshare.
- **Assembly Hall:** new 3D model (white clean-room hangar, gantry crane that moves while assembling, fans). Placed on the flat dry tile nearest the Site's middle. Level 1 takes a Small Bus; level 2 ($300K, 15 days) a Medium Bus, which TIROS-1 needs. A Medium Bus can still be designed and test-run, but the designer and planner say to upgrade the hall first. The Shipping truck now docks beside the hall.
- **Code:** `src/game/upgrades.ts` (new), `Levels`/`allBuildings`/`placeAssemblyHall`/`addPart`/`takePart`/`partMass` in siteState.ts, `marksFor`/`hallFits` in spacecraft.ts, `Mission.marks`. **Save v12** (older saves: every building level 1, every Part Mk 1, hall placed on load).
- **Tested** in headless Chromium at 1280×800: new game places the hall; hall panel → Upgrade → crane, countdown, level 2 after 15 days; a level 2 Metal Works made a Mk 2 Small Bus (2.6 kg); level 3 Warehouse gave 4,500 kg storage; Lab upgrade under way shows its days left; Mission Designer showed Mk 2 and the "needs Assembly Hall level 2" badge and warning on the Medium Bus; shipped Explorer 1 at 11.1 kg (Mk 2 Bus), Mission kept `marks`, truck docked beside the hall; reload kept levels, Upgrades and Marks. No console errors. 218 unit tests pass; build passes.
- Not tested: a person playing it at normal speed; whether 15/30-day Upgrades and the prices feel right.

**Next:**
1. Team: play Explorer 1 → TIROS-1 at normal speed, now with the hall Upgrade before TIROS-1; judge Upgrade prices and days. Also ticket 13's open box (time the first Launch).
2. Open tickets: 12 (Stuck solar panel, Survive the eclipse), 16, 17, 18 (now unblocked), 19, 20, 25, 30.

**Open:**
- The Market panel shows only totals per Part, not their Marks. No toast or sound when an Upgrade finishes.
- The hall can sit in a valley between mountains, where the default camera can hide it.
- No Computer slot, so TIROS-1's tape recorder isn't modelled. Thor-Able's staging gaps are game estimates _(verify)_.
- The Lab panel lists every tech tree item; later Eras need an Era filter.
- TIROS-1's real mass (122.5 kg) is far above the game's design (18–21 kg): Era 1 Parts are scaled-down estimates.
- From before: guide shows "Step 1" after the Company name; glow stays under dialogs; patches have no Company logo yet (19); Anomaly chance fixed until Ground Stations (18); one Anomaly per flight; Explorer 1's coast timing _(verify)_; blocky close-up Earth (26); orbits never decay; no "New game"; Speed not saved.
- Launcher checks wait for the final ticket (see AGENTS.md).
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `handoff`; `grill-with-docs` before ticket 18's design.

## Log

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
- 2026-11-09: Ticket 06 done: Contracts board, Explorer 1 Contract with deadline, save v5.
