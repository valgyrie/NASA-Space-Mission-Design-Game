# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–11, 13 (waits for a person to time the first Launch), 14, 15, 16 and 31 done; local launchers merged. This session (branch `claude/fervent-allen-9ojsq2`) built ticket 16.

**Just finished: ticket 16, real places and weather.** Rules: GDD §4 (starting) and §8 (launch planning). Data: `docs/research/places-and-weather.md`.
- **New game globe** (`src/world/globePicker.ts`, `src/ui/newCompany.ts`): Historic (JPL pin), In the US, Anywhere (alternate history), 🎲 Random; drag to turn, click land to move the pin. A line gives the land type and the real 2025 climate.
- **Baked NASA POWER 2025** (`src/game/placeData.ts`, built by `scripts/build_places.py`, about 160 KB): yearly sunshine, temperature, wind, rain and height on a 2° land grid; daily wind, rain and top temperature at Cape Canaveral and Wallops Island; the US outline from Natural Earth.
- **The place shapes the Site** (`siteClimateFor` in `src/game/places.ts`; `SiteClimate` gained `water`, `relief`, `snow`): rain → dryness, sea nearby → coast, mountains/height → more hills, cold → snow tint (`src/world/siteMesh.ts`).
- **Launch Sites:** Cape Canaveral and Wallops Island (team's choice: alternate history, labelled). Lift scales with Earth's spin (1% per 10 m/s, game estimate): Juno I 13.4 kg from Wallops. `liftFrom` in `launchVehicles.ts`; used by the planner, the Mass bar and the flight.
- **Shipping by distance** from the start ($5,000 + $5.60/km, 650 km a day + 1; JPL → Cape stays $25,000 and 7 days).
- **Weather and Scrubs:** a Game day's weather is the real 2025 weather on that date. Wind over 12 m/s or thunderstorm days (≥10 mm rain, ≥24 °C) Scrub: `launch()` refuses, a card (`src/ui/scrubCard.ts`) says why and names the advisor's next good day. About 8% of days Scrub.
- **Launch Window advisor** (`adviseLaunch`): first calm, dry day in 14 (else first within limits), in the planner and the Mission tracker.
- **Save v13:** `state.place` and `state.launchSite`. Older saves get `place.start = 'legacy'`: their Site keeps its made-up climate and ships from JPL.
- **Tested** in headless Chromium at 1280×800: New game globe (Historic, Anywhere, click, Random), planner with both Launch Sites and the weather card, shipping, a Scrub on a windy day at the Cape with the next good day named. Also a snowy northern-Canada start. No console errors. 247 unit tests pass; build passes.
- Not tested: a person playing it; a start far abroad played through; touch on the globe.

**Next:**
1. Team: try New game (Historic, a US spot, somewhere abroad, Random) and a Launch from each Launch Site; judge the Scrub rate and the Shipping prices.
2. Open tickets: 12 (Stuck solar panel, Survive the eclipse), 17, 18, 19, 20, 25, 30. Ticket 27 is now unblocked (adapt to the official Resources, Nov 13).

**Open:**
- Coordinates of JPL, LC-26 and Wallops are _(verify)_ (Wikipedia's API rate-limited us). Wind limit 12 m/s for 1950s rockets is a game estimate _(verify)_.
- The coast effect (a failed rocket falls into the sea) waits for Launch Vehicle failures (ticket 17). Moon and Mars windows wait for their Eras.
- The game keeps running while the Scrub card is open.
- Place data is 2° (about 220 km): a coastal city can get an inland neighbour's climate. Shipping is straight-line, even across oceans.
- No place names on the globe (only latitude and longitude). No US outline drawn on the globe.
- From before: fewer Mines per Deposit since 3 × 3 buildings; tall foundations on steep slopes; Market shows only totals per Part; no Upgrade-done toast; no Computer slot; Thor-Able staging gaps _(verify)_; Lab lists every tech item; TIROS-1 Parts are scaled-down estimates; guide "Step 1" after the name; glow under dialogs; no Company logo on patches (19); Anomaly chance fixed until Ground Stations (18); one Anomaly per flight; Explorer 1's coast timing _(verify)_; orbits never decay; no "New game"; Speed not saved.
- Launcher checks wait for the final ticket (see AGENTS.md).
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `handoff`; `grill-with-docs` before ticket 18's design.

## Log

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
