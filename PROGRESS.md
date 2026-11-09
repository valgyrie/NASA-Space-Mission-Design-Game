# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–11 and 31 done. 01–10 and 31 are merged into `main`; **ticket 11 is on branch `claude/focused-noether-0sf8x6`, not merged yet.** The loop: accept Explorer 1, design, Test Run, ship, Launch, watch the 3D Launch, **play Point the antenna on its day**, read the Mission Report, get paid, see the Spacecraft in the Space view.

**Just finished: ticket 11, Anomalies framework + Point the antenna.** How it plays (chance, mini-game, scoring, Data and pay lost, skip rules, reload rule): GDD §9 "First Anomaly (ticket 11)". Code notes for the next Anomalies: ticket 11's "For tickets 12 and later".
- **Domain:** `src/game/anomalies.ts` (`rollAnomaly` at Launch, `antennaChance`, `settleAnomaly`, `skipAnomaly`, `settleUnanswered`, `lostDaysFor`, `withContactLost`); `src/game/antennaGame.ts` (the mini-game as pure steps). `MissionReport.anomaly`, `SiteState.anomalyBest`; **save v9**. `completeContract(state, id, pay)`: the reward is held at Launch while an Anomaly is open. Balance numbers in `balance.ts` (`ANTENNA_CHANCE`, `ANOMALY_MAX_DATA_LOSS`, `ANOMALY_UNANSWERED_SCORE`).
- **UI:** `src/ui/anomalyPanel.ts` (2D canvas over the Launch show, so it also works in Simple view); `launchShow.ts` pauses on the day, Skip/Esc jump to a first Anomaly or skip a later one with the best score; `missionReport.ts` `anomalyLines`; `playSite.ts` settles open ones on load and saves after each answer.
- **Tested** in headless Chromium at 1280×800 and 1024×768: first Launch pauses on day 2; Esc can't close it; aiming locks in 3.5 s → 100%, $3M paid; aiming late → 35%, 6 days lost, $600K cut, "No contact" during the lost days; no aiming → "Contact lost", 0%, 9 days, $900K cut; Esc during the countdown jumps to the Anomaly; second flight (best 80%) Skip to the report → "Skipped, so your best score counted (80%)", $200K cut; reload mid-Anomaly → settled at 50% on load, best stays empty; no console errors. 180 unit tests pass; build passes.
- Not tested: a real mouse by a person (Playwright moved the mouse); touch (pointer events are wired, untested).

**Next:**
1. Team: try the mini-game by hand and judge its difficulty (15 s, 2 s hold, 4 s par, wobble) for a 10-year-old; numbers are at the top of `src/game/antennaGame.ts`.
2. Ticket 13 (Tutorial and Real History) is now unblocked (09, 11 done); also 15, 16, 17, 19, 20, 25, 30. Ticket 12 still waits for 14.

**Open:**
- With Era 1's only antenna the chance is fixed (~32%); it varies once Comms Parts differ (ticket 14) and Ground Stations exist (ticket 18).
- One Anomaly per flight at most. A score of 0 counts as a best of 0, so a later skip gives 0%.
- The Test Run doesn't mention Anomalies yet; it could show the antenna's chance under Predicted problems.
- The Space view's "Sending Data: day N of M" ignores the lost days.
- The 247 s coast is read as starting at first-stage burnout (orbit at T+420 s); no source gives Explorer 1's own times _(verify)_.
- Blocky Earth up close and the flat horizon high in the climb: in ticket 26.
- The Game date doesn't move during the show. Orbits never decay. The "lost" path (too heavy) can't happen in play yet.
- Every Era 1 design is 0% or 100% (needs ticket 14 Parts or 17 failures). Rideshare, Shipping and Part spreads are guesses; Juno I's 14 kg is still _(verify)_. No "New game"; Speed not saved; real-laptop performance unknown.
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `handoff`.

## Log

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
- 2026-11-08: Keyboard camera + H for the whole-Site view, pan past the Site, detailed Mine with turning wheel; ticket 30 (buy Plots, Optional) written.
- 2026-11-08: Seed moved to a pause menu (Esc); land carries on to the horizon; perspective camera with tilt (ADR-0003); working sun shadows.
- 2026-11-08: Ticket 04 done: Mines on Deposits, Game date with pause/1×/2×/4×, top bar, save v3.
- 2026-11-08: Ticket 03 done: Site generated from a Seed (terrain, water, Deposits), Seed shown and copyable.
