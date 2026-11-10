# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–11, 13 (waits for a person to time the first Launch), 14, 15 and 31 done; local launchers merged. This session (branch `claude/happy-hopper-1jm3ev`) fixed two things the team asked for; no new ticket.

**Just finished: bigger buildings and a smooth Earth.**
- **Buildings take 3 × 3 tiles** and their models are three times as big, so they show from the whole-Site view. The Site stays 64 × 64 (the team wants it spacious; it still holds hundreds of buildings). Rules: GDD §3 and §5 (Mines, Assembly Hall).
  - A building's `x`, `z` is its middle tile. `FOOTPRINT`, `footprint`, `covers`, `foundationLevel`, `fitBuildings` in `src/game/siteState.ts`; `BUILDING_SCALE` and the foundation block in `src/world/buildingParts.ts`.
  - On a slope a building stands on the highest ground under it, on a foundation. New build problem "edge" (too close to the Site's edge).
  - A Mine only has to touch a Deposit; it digs the one nearest its middle.
  - The Assembly Hall now avoids slopes and the foot of cliffs. The Shipping dock and truck are three times as big; the dock looks for flat land level with the hall, and the road takes the easiest side (`src/world/shippingRoute.ts`).
  - **Older saves:** `fitBuildings` moves overlapping buildings to the nearest free spot when the Site is shown (levels kept, Mines keep their Raw Material). No save version change (still v12).
- **Earth is smooth** in the Mission Designer, the 3D Launch and the Space view: a real sphere with a picture made from the same Natural Earth grid, rounded coasts that stay sharp close up, soft clouds, sunlight glinting on the sea. `src/world/earthTexture.ts` (the pictures, tested), `src/world/earthMesh.ts` (the globe and its shaders). How: `docs/research/earth-map.md`. This ticks ticket 26's blocky-Earth box early.
- **Bug fixed on the way:** pressing Start within 0.2 s of typing a Seed redrew the Site afterwards and wiped the Assembly Hall's model (`src/ui/newCompany.ts`).
- **Tested** in headless Chromium at 1280×800: buildings visible at the whole-Site view and fully zoomed out; close-up with foundations on slopes; 3 × 3 green placing marker; click on a corner tile of a building opens its panel; Upgrade crane; dock, truck, crate and Follow the truck; old-style save (buildings side by side, Mines on every Deposit tile) loads with nothing overlapping; Earth in the Space view (overview, zoomed in, follow), Mission Designer and the Launch's upper-stage and orbit shots. No console errors. 231 unit tests pass; build passes.
- Not tested: a person playing it; frame rate on a slow laptop (the Earth pictures take about a third of a second, once, when the first Earth is shown).

**Next:**
1. Team: look at the new building size and the Earth; play Explorer 1 → TIROS-1 at normal speed (hall Upgrade before TIROS-1), judge Upgrade prices and days. Also ticket 13's open box (time the first Launch).
2. Open tickets: 12 (Stuck solar panel, Survive the eclipse), 16, 17, 18, 19, 20, 25, 30.

**Open:**
- Fewer Mines fit on a Deposit now (one Mine covers up to 9 tiles), so Raw Materials come slower per Deposit. Mine output (10 kg a day) is unchanged: raise it in `src/game/balance.ts` if play feels slow.
- A building on a steep slope stands on a tall foundation. No limit on how steep.
- Deposit rocks and the truck's road are still tile-sized details next to big buildings; there are no drawn roads.
- No message when an older save's buildings are moved.
- The 3D Launch's flat horizon during the climb is still open (ticket 26).
- The Market panel shows only totals per Part, not their Marks. No toast or sound when an Upgrade finishes.
- No Computer slot, so TIROS-1's tape recorder isn't modelled. Thor-Able's staging gaps are game estimates _(verify)_.
- The Lab panel lists every tech tree item; later Eras need an Era filter.
- TIROS-1's real mass (122.5 kg) is far above the game's design (18–21 kg): Era 1 Parts are scaled-down estimates.
- From before: guide shows "Step 1" after the Company name; glow stays under dialogs; patches have no Company logo yet (19); Anomaly chance fixed until Ground Stations (18); one Anomaly per flight; Explorer 1's coast timing _(verify)_; orbits never decay; no "New game"; Speed not saved.
- Launcher checks wait for the final ticket (see AGENTS.md).
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `handoff`; `grill-with-docs` before ticket 18's design.

## Log

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
