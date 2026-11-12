# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–21 (12, 13, 16, 17, 18, 19, 20 and 21 wait for a team test) and 31 built; local launchers merged. This session built ticket 21 on `codex/ticket-21-free-play`, starting from freshly pulled `main` (`1cf2f11`, including ticket 20).

**Just finished: ticket 21, Free Play.** Rules: GDD §3. File map and decisions: `docs/tickets/21-free-play.md`.
- Choose Campaign (default) or Free Play independently of Easy/Advanced. Free Play starts anywhere on Earth in 2026, with the existing Parts, unlocked Solar Cells, HQ level 5 and a level 1 Assembly Hall. Settings shows the current play mode.
- Three generated offers cover radiation surveys, weather photography and geostationary relays, with varied durations, orbits and rewards. Stable IDs keep their terms the same in saves, Test Runs, flights, reports, Research, Patches and Space view. Accepting replenishes the board; completed work stays done; missed work can be retried.
- Modern Launches use Falcon 9 Rideshares and a two-stage low-poly model with the Company logo. Historical rockets retire. Sourced expendable capacities; prices, staging gap and game reliability are labelled game estimates. No booster landing or owned rocket in this ticket.
- After the four currently built Campaign Milestones (through Syncom 3), **Continue in Free Play** keeps the same Company and Site, stock, money, Marks, Research, reports, Patches and History Archive. It jumps the date forward to 2026, preserving pending Upgrade time. Later Campaign Milestones move this interim endpoint; the planned finale stays Artemis IV.
- Save v18 adds `state.playMode`. Earlier games stay in Campaign, including Missions already shipping. Generated Contracts are resolved from their IDs rather than duplicated in the save.
- Tested: 321 unit tests and build pass; seven focused tests added. Chromium at 1280×800 and 1024×768: setup, worldwide controls, both difficulties, generated board, accepting, Part choices/buying, Test Run, Shipping and reload, modern rocket catalogue, Settings and completed-Campaign continuation. A production-build Falcon 9 flight earned a successful Mission Report and Patch; completed work survived reload. Shipping time/calm weather and previous Anomaly scores used a saved fixture for that flight; continuation used a completed Campaign fixture. No application page errors in the completed checks.
- Not tested: touch or team playtesting. No new dependencies or test framework. Launcher checks still wait for the final ticket. Online play needs ticket 22 and a team-provided Supabase project.

**QA review (2026-11-11):** checked `main` at `e2ba793`; recorded ten open fixes in tickets **01, 04, 05 (two), 08, 13, 14, 16, 17 and 31**, with steps and [screenshots](docs/qa/2026-11-11/README.md). Game code and existing ticket statuses are unchanged. The Scrub-card clock (16) and failed-rocket report (17) were already in the handoff.
- Completed all four Milestones and played all three Anomalies reached through Launches, including both new TIROS-1 kinds. Also checked Mines, Market trades, storage, Research, Mk 2 Parts, building Upgrades, insurance and reloads. Chromium at 1440×900 and 1024×768; pause-menu and Research-bar issues also occur in the production build. The 305 tests and build passed during the review.
- A person still needs to time the tutorial and judge the mini-games' difficulty; touch and performance on real laptops remain unchecked. No planned features were counted as bugs.

**Next:**
1. Team: try a new Free Play Company, finish different generated objectives and continue a Campaign. Compare Easy and Advanced; judge the Anomaly difficulty (ticket 12).
2. Open tickets: 22 (needs a Supabase project from the team), 24 (unblocked), 25, 26 (unblocked), 30. Ticket 27 after the official Resources (Nov 13).

**Open:**
- The panel shows "Push now!" on the intro card while the game waits (it is a still frame); harmless.
- Mini-games use the mouse and keys; touch works for the panel (tap) and the eclipse (buttons), not tested.
- From ticket 18: Titanium left out; no Era 2 tech tree items; Thor-Delta/Delta D staging gap _(verify)_; Era 2 prices are game estimates; Syncom picture looks retouched.
- From before: no NASA photo of Vanguard TV3's explosion; a Spacecraft lost to the rocket lists Power, Comms and Time as met; no Reputation penalty for a missed deadline; insurance price shows twice when ticked; coordinates of JPL, LC-26 and Wallops _(verify)_; 12 m/s wind limit _(verify)_; the game keeps running while the Scrub card is open; orbits never decay; no "New game"; Speed not saved.
- Launcher checks wait for the final ticket (see AGENTS.md).
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `handoff`.

## Log

- 2026-11-12: Ticket 21 built from freshly pulled main: modern Free Play, generated Contracts, Falcon 9 Rideshares, same-Company continuation, save v18. 321 tests, build and browser checks pass.
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
