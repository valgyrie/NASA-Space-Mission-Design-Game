# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–18 (12, 13, 16, 17 and 18 wait for a team test) and 31 done; local launchers merged. This session (branch `claude/ecstatic-davinci-ym221r`, merged into `main`) built ticket 12. The user was away and asked the agent to choose; decisions are in the ticket file.

**Just finished: ticket 12, Stuck solar panel and Survive the eclipse.** Rules: GDD §9 (the bullet after "First Anomaly"). Decisions and file map: `docs/tickets/12-anomalies-panel-eclipse.md`.
- Both only strike Spacecraft with Solar Cells. Still **one Anomaly per flight**: each kind rolls its own chance, a never-played kind wins, then the likeliest; the first flight still always meets Point the antenna. Flights without Solar Cells roll exactly as before.
- **Stuck solar panel:** chance by the Solar Cells' Mark (35/20/10%). Fire a thruster in time with the swing (resonance) until the panel latches; button mashing never works.
- **Survive the eclipse:** chance from the Power margin (8–60%) plus 12% for a Small Battery. Switch systems off (keys 1–4) so the battery lasts to sunrise; heaters off 4 s in a row freezes it; Payload time sets the score.
- `anomalyPanel.ts` is now a shell over per-kind views (`MiniGameView`, `src/ui/miniGame.ts`); the antenna moved to `antennaView.ts`. No save version change (optional Anomaly fields).
- **Tested** in headless Chromium at 1280×800 with the dev build: panel won (99%), eclipse played to sunrise (61%) and lost to cold, antenna still plays, report explains the eclipse, no console errors. 305 unit tests pass; build passes.
- Not tested: a person playing them (is the swing timing fair for a 10-year-old? is 12 s of eclipse enough?); a real TIROS-1 Launch meeting one by chance (covered by unit tests only); touch.

**Next:**
1. Team: play TIROS-1 a few times; judge the panel's timing and the eclipse's difficulty (numbers at the top of `src/game/panelGame.ts` and `src/game/eclipseGame.ts`, chances in `balance.ts`).
2. Open tickets: 19, 20, 21 (unblocked), 24 (unblocked), 25, 26 (unblocked), 30. Ticket 27 after the official Resources (Nov 13).

**Open:**
- The panel shows "Push now!" on the intro card while the game waits (it is a still frame); harmless.
- Mini-games use the mouse and keys; touch works for the panel (tap) and the eclipse (buttons), not tested.
- From ticket 18: Titanium left out; no Era 2 tech tree items; Thor-Delta/Delta D staging gap _(verify)_; Era 2 prices are game estimates; Syncom picture looks retouched.
- From before: no NASA photo of Vanguard TV3's explosion; a Spacecraft lost to the rocket lists Power, Comms and Time as met; no Reputation penalty for a missed deadline; insurance price shows twice when ticked; coordinates of JPL, LC-26 and Wallops _(verify)_; 12 m/s wind limit _(verify)_; the game keeps running while the Scrub card is open; no Company logo on patches (19); orbits never decay; no "New game"; Speed not saved.
- Launcher checks wait for the final ticket (see AGENTS.md).
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `handoff`; `grill-with-docs` before ticket 21 (Free Play).

## Log

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
