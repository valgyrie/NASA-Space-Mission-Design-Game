# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–20 (12, 13, 16, 17, 18, 19 and 20 wait for a team test) and 31 built; local launchers merged. This session built ticket 20 on `codex/ticket-20-easy-and-advanced`, starting from freshly pulled `main` (`f65450b`, including ticket 19).

**Just finished: ticket 20, Easy and Advanced modes.** Rules: GDD §7. File map and decisions: `docs/tickets/20-easy-and-advanced.md`.
- Choose Easy (default) or Advanced at Company setup; the pause menu's Settings shows the fixed choice. Easy keeps the original Part set and balance.
- Advanced adds a Medium Battery (4.2 kg, 420 Wh) and Low-power Antenna (0.8 kg, 0.14 W, 24 kB/day). The designer shows finer Part labels and battery Wh/kg. Research separates the historical basis from game estimates; no modern technology moved into 1958.
- The same recipes, Marks, tech tree and flight rules handle both sets. Factories and the Market use the mode filter. Fixed Market rows displaying despite their hidden flag. The new Parts have 3D models; the Medium Battery also works with the eclipse Anomaly.
- Save v17 adds `state.difficulty` and the new stock keys. Earlier Companies become Easy and keep their existing game, including Missions already shipping.
- Tested: 314 unit tests and build pass; six focused tests added. Chromium at 1280×800 and 1024×768: setup, Settings, both Part sets, labels and bars, buying, Test Run, Shipping, reload, Factory choices, Market visibility and v16 migration. A production-build Launch with the new Parts reached a successful Mission Report (Shipping fast-forwarded to calm weather in a saved fixture). No page errors. Tutorial skipped for its known overlay issue.
- Not tested: touch or team playtesting. No new dependencies or test framework. Launcher checks still wait for the final ticket.

**QA review (2026-11-11):** checked `main` at `e2ba793`; recorded ten open fixes in tickets **01, 04, 05 (two), 08, 13, 14, 16, 17 and 31**, with steps and [screenshots](docs/qa/2026-11-11/README.md). Game code and existing ticket statuses are unchanged. The Scrub-card clock (16) and failed-rocket report (17) were already in the handoff.
- Completed all four Milestones and played all three Anomalies reached through Launches, including both new TIROS-1 kinds. Also checked Mines, Market trades, storage, Research, Mk 2 Parts, building Upgrades, insurance and reloads. Chromium at 1440×900 and 1024×768; pause-menu and Research-bar issues also occur in the production build. The 305 tests and build passed during the review.
- A person still needs to time the tutorial and judge the mini-games' difficulty; touch and performance on real laptops remain unchecked. No planned features were counted as bugs.

**Next:**
1. Team: compare Easy and Advanced, try the logo maker and an uploaded drawing, and play TIROS-1 to judge the panel timing and eclipse difficulty (ticket 12).
2. Open tickets: 21 (unblocked), 24 (unblocked), 25, 26 (unblocked), 30. Ticket 27 after the official Resources (Nov 13).

**Open:**
- The panel shows "Push now!" on the intro card while the game waits (it is a still frame); harmless.
- Mini-games use the mouse and keys; touch works for the panel (tap) and the eclipse (buttons), not tested.
- From ticket 18: Titanium left out; no Era 2 tech tree items; Thor-Delta/Delta D staging gap _(verify)_; Era 2 prices are game estimates; Syncom picture looks retouched.
- From before: no NASA photo of Vanguard TV3's explosion; a Spacecraft lost to the rocket lists Power, Comms and Time as met; no Reputation penalty for a missed deadline; insurance price shows twice when ticked; coordinates of JPL, LC-26 and Wallops _(verify)_; 12 m/s wind limit _(verify)_; the game keeps running while the Scrub card is open; orbits never decay; no "New game"; Speed not saved.
- Launcher checks wait for the final ticket (see AGENTS.md).
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `handoff`; `grill-with-docs` before ticket 21 (Free Play).

## Log

- 2026-11-12: Ticket 20 built from freshly pulled main: Easy and Advanced at setup and in Settings, two extra Advanced Parts with finer labels, shared Factory/Market and flight rules, save v17. 314 tests, build and browser checks pass.
- 2026-11-12: Ticket 19 built: Company logo maker and drawing upload, logo on HQ flag/sign, all four rockets and Mission Patches; save v16 migrates older Companies to the original preset. 308 tests and build pass.
- 2026-11-11: Recorded ten confirmed QA fixes in the existing tickets, with reproduction steps and screenshots; game code unchanged.
- 2026-11-11: Ticket 12 built: Stuck solar panel (Mark sets the chance, thruster in time with the swing) and Survive the eclipse (Power margin and battery set the chance, switch systems off till sunrise); one Anomaly per flight, new kinds first.
- 2026-11-11: Ticket 18 built: HQ Upgrade to Era 2 (date jumps to 1962), Telstar 1 (whole Thor-Delta paid, Ground Stations), Syncom 3 (geostationary orbit, Main Engine, Large Bus, Delta D), four NASA-photo cards, save v15.
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
