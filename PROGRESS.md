# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–11, 13 (waits for a person to time the first Launch), 14, 15, 16, 17, 18 and 31 done; local launchers merged. This session (branch `claude/confident-pasteur-iz2iwo`) built ticket 18. The user was away and asked the agent to choose; decisions are listed in the ticket file.

**Just finished: ticket 18, Era 2.** Rules: GDD §6 (HQ and Eras, Telstar 1, Syncom 3, Ground Stations), §8 (Era 2 rockets). Facts: `docs/research/milestones.md`, `launch-vehicles.md`, `spacecraft-parts.md`.
- **HQ** (`src/game/eras.ts`, `enterEra` in `siteState.ts`): every Site starts with one beside the Assembly Hall; its level is the Era. Once Explorer 1 and TIROS-1 are done the Contracts board says so, and the HQ Upgrade ($1.5M, 15 days) moves the Company into Era 2: the date jumps to 1 Jan 1962 (never backwards), dates still to come move with it, a card welcomes the new Era. Juno I and Thor-Able retire; Era 2 Parts, buildings and the Propulsion slot are locked ("Era 2") before.
- **Telstar 1:** AT&T; Radio Transponder, 136 days; the Company pays the **whole Thor-Delta** ($2.7M, AT&T's real payment) instead of a Rideshare. Needs a Ground Station (the transponder makes 90 kB a day, the Simple Antenna sends 50).
- **Syncom 3:** NASA; **geostationary orbit**, 66 days (to the end of the Tokyo Olympics). The rocket reaches a transfer orbit; a **Main Engine** (24 kg) does the rest, else "Stuck in the transfer orbit". At 48 kg it needs **Delta D** (Thor-Delta lifts 45 kg there) and the **Large Bus** (Assembly Hall level 3). 99% sunlight up there.
- **Ground Stations** ($400K, Era 2): each multiplies what antennas send (level 1 doubles it); a Mission keeps the boost it shipped with.
- **Thor-Delta** and **Delta D** with real lift, stages and records (97% in game), 3D models (Delta D with three boosters). Orbit view and Space view step back to fit the geostationary orbit.
- Four Real History cards with NASA photos; patches for both. **Save v15.**
- **Tested** in headless Chromium at 1280×800: Era 1 locks, board hint, HQ panel and Upgrade, year jump and Era card, Telstar card and board, Ground Station build and panel, Telstar design/planner (whole rocket)/ship/Launch, Syncom design (Large Bus, Main Engine)/planner (Thor-Delta too heavy, Delta D fits)/ship/Launch/report/cards/patch. Delta D on the pad and the geostationary orbit rendered directly. No console errors. 280 unit tests pass; build passes.
- Not tested: a person playing it; the full 3D Launch show (headless Chromium falls back to Simple view); touch.

**Next:**
1. Team: play Era 1 → Era 2; judge the prices (HQ $1.5M, whole Thor-Delta $2.7M, Ground Station $400K, rewards $8M/$10M) and whether Syncom feels too easy or too hard.
2. Open tickets: 12 (Stuck solar panel, Survive the eclipse), 19, 20, 21 (now unblocked), 24 (unblocked), 25, 26 (unblocked), 30. Ticket 27 after the official Resources (Nov 13).

**Open:**
- Titanium (GDD §5, Era 2) left out: new Deposits would change every Site made from a Seed. No Era 2 tech tree items yet; no Test Run signal graph.
- Thor-Delta/Delta D 10 s staging gap _(verify)_; Delta D whole-rocket price and Era 2 Rideshare prices are game estimates.
- The Andover photo comes via Wikimedia Commons (credited NASA); the Syncom picture is NASA's but looks retouched.
- From before: no NASA photo of Vanguard TV3's explosion; a Spacecraft lost to the rocket lists Power, Comms and Time as met; no Reputation penalty for a missed deadline; insurance price shows twice when ticked; coordinates of JPL, LC-26 and Wallops _(verify)_; 12 m/s wind limit _(verify)_; the game keeps running while the Scrub card is open; no Company logo on patches (19); one Anomaly per flight; orbits never decay; no "New game"; Speed not saved.
- Launcher checks wait for the final ticket (see AGENTS.md).
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `handoff`; `grill-with-docs` before ticket 21 (Free Play).

## Log

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
- 2026-11-09: Watch the Shipping: Spacecraft assembled on a truck at a dock, truck drives off the Site, Follow the truck, Mission tracker with the dates to come.
- 2026-11-09: Ticket 08 done: Launch planner (Juno I mass check, Rideshare per kg, Shipping to Cape Canaveral), Launch from the HUD, Mission Report with reasons, reward paid, save v7.
- 2026-11-09: Mission Designer globe now shows the real Earth (Natural Earth map, true apparent size from 13,000 km); merged.
- 2026-11-09: Ticket 07 done and merged: Mission Designer with six slots, detailed rotating 3D Spacecraft over Earth, six live bars, Radiation Detector Part, save v6.
