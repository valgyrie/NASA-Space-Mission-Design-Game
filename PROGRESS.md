# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–10 and the new ticket 31 done, all merged into `main` (the team asked for 10 and 31 to be merged). The whole loop works: accept Explorer 1, design, Test Run, ship, watch the truck, Launch, watch the 3D Launch, read the Mission Report, get paid, then **see the Spacecraft in orbit in the Space view**.

**Just finished: ticket 31, Space view** (asked for by the team; no earlier ticket had it). How it plays: GDD §9 "Space view". Facts: `docs/research/orbits.md` (GM, radius, sidereal day from the NASA Earth Fact Sheet; Kepler gives Explorer 1's real 114.8 min).
- **Domain:** `src/game/space.ts`: `satellitesInOrbit(state)` (every report whose orbit finding is ok; id = index in `state.reports`), `satelliteStatus` (working day N of M / silent since the Power ran out / done), `orbitMinutes`, `orbitPosition` (Kepler). `Contract.inclinationDeg` (Explorer 1: 33.24°). **`MissionReport.design`** keeps the design that flew; **save v8** (v7 reports get `design: null`, shown as a plain model).
- **3D:** `src/world/spaceView.ts` (own renderer; Earth radius 30; orbits to scale and tilt; 300× real time, Earth turning at the same pace; click picking with invisible spheres, hidden behind Earth; follow mode turns the camera with the Spacecraft's along-track frame so Earth stays beside it, keeping the player's own drag and zoom).
- **UI:** `src/ui/spaceScreen.ts` (list, name tags, details, See the whole Earth, Esc). HUD **Space view** button (only once something is in orbit); Mission Report **See it in orbit** (only if it reached orbit). Pauses the Site like the Mission Designer.
- **Tested** in headless Chromium at 1280×800 and 1024×768: Launch → Esc → See it in orbit follows Explorer 1 (status, Launch, "358 to 2,550 km… tilted 33.2°", "One lap takes 115 minutes. Shown 300× faster."); camera stays with it over three time points; See the whole Earth shows the orbit round the globe with a name tag; clicking the Spacecraft in 3D follows it; Esc closes and the Site speed comes back; HUD button opens it; old-save report (no design) shows the plain model; Small Battery 20 days later says "Silent since day 16"; no console errors, no sideways scroll. 154 unit tests pass.
- Not tested: a device without WebGL (the list and details still show, with a note), since the Site itself needs WebGL.

**Before that: ticket 10, 3D Launch and flight.** How it plays: GDD §9 "First 3D Launch". Juno I facts with sources: `docs/research/launch-vehicles.md` (new "Juno I: how Explorer 1 flew" table).
- **Domain:** `LaunchVehicle` now has `heightM`, `stages` (motors, burn seconds) and `coastS` (`src/game/launchVehicles.ts`). `src/game/ascent.ts` turns them into the show: `flightShow(vehicle, flight)` gives segments (countdown, burn per stage, coast, orbit or lost, mission days, end) with screen seconds; `showAt(segments, seconds)` reads the moment; `stageTimes` gives T+ for each stage. Show length ~90 s at 1× (tested 60–120 s for 30/90/365 days).
- **`launch()` now returns `{ report, flight, design }`** (`LaunchResult` in `mission.ts`), so the show plays the same Flight the report came from. The result is saved before the show starts; reloading mid-show just skips it.
- **3D:** `src/world/rocketMesh.ts` (low-poly Juno I, 21.2 m, tub of 11 + 3 + 1 motors, the player's Spacecraft scaled on top) and `src/world/launchView.ts` (own WebGL renderer, three shots: pad and chase camera with smoke and a made-up climb path; upper stages over a 3,000-unit Earth with Cape Canaveral below; the orbit to scale with Kepler motion, dot grey once Power is out). Stage 4 stays on, as on Explorer 1.
- **UI:** `src/ui/launchShow.ts` (card with title, fact line, T+ clock or "Day N of M", Battery and Data bars; 1×/2×/4×, Simple view, Skip; Esc skips). Simple view reuses the Test Run's `drawOrbit` (now exported with `at`). It switches on by itself if the median frame over 40 timed frames is slower than 1/20 s, or WebGL fails. Wired in `playSite.ts` `launchMission`: world hidden during the show, Mission Report after.
- **Tested** in headless Chromium (SwiftShader) at 1440×900, 1280×800, 1024×768: Large Battery plays countdown → liftoff → coast → stages 2–4 → orbit → 30 days → "Mission complete" → report "Explorer 1 worked!"; Small Battery shows "Day 16: Power out" in orange, Battery bar 0 Wh, "Mission over", failure report; simulated slow frames (80 ms busy-wait) switch to the simple view with its note; Esc skips to the report; no console errors, no sideways scroll. 146 unit tests pass; build passes.

**Next:**
1. Ticket 11 (Anomalies: framework + Point the antenna). The Space view could later show the Anomaly's Spacecraft. The mission-days part of the show (`phase === 'mission'` in `launchShow.ts` / `drawOrbit` in `launchView.ts`) is the natural place to pause for an Anomaly. Also unblocked: 15, 16, 17, 19, 20, 25, 30.

**Open:**
- The 247 s coast is read as starting at first-stage burnout (orbit at T+420 s); no source gives Explorer 1's own times _(verify)_. Gunter's Space Page or the NASA Boehm PDF linked from Wikipedia's Juno I page may have them.
- The pad shot's high-altitude horizon is a flat haze band, and Earth facets are coarse in the space shot (icosahedron detail 48). Fine for now; ticket 26 can polish.
- The Game date doesn't move during the show (Mission days are only shown). Payment arrives at Launch, so the Space view can say "Sending Data: day 1 of 30" after a report that already says it worked.
- Space view: orbits never decay (drag and re-entry are not modelled). The Moon and orbits round other worlds wait for their Contracts (Optional in `CHECKLIST.md`).
- The "lost" path (too heavy for orbit) can't happen in play yet because the planner blocks it; it's unit-tested only.
- Every Era 1 design is 0% or 100% (needs ticket 14 Parts or ticket 17 failures). Test Run has no signal graph (18) or eclipse (12).
- Rideshare, Shipping and Part spreads are guesses; Juno I's 14 kg is still _(verify)_. No "New game"; Speed not saved; real-laptop performance unknown.
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `handoff`.

## Log

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
- 2026-11-08: Ticket 02 done: Company name with bad-word filter, local autosave, strings file.
