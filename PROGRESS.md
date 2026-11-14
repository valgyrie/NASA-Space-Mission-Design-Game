# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–26 and 30–39 built (32, 33, 34, 36 and 39 wait for a team test); 27 continues as tickets ship; 28 and 29 agent parts done. Ticket 39 built from freshly pulled `main` **1c6bdef** and merged into `main`. 424 game tests and both type checks pass.

**Done this session (14 Nov): ticket 39, NASA's six steps.**
- Ticket 35 was asked for first; it was already merged (PR #41) and its test still passes.
- The tutorial guide shows NASA's step name above "Step N of 8" and a row of six dots (done ticked, current lit). After the first Mission Report, a last card names all six with Learn more → slide 10 of NASA's slides; Close instead of Skip. It also goes once the next Mission ships. No save change.
- Mapping kept as the ticket's table (Mines and Metal Works under "Define Concept"); order never goes backwards. Still an open point for the team.
- Browser: fresh Campaign at 1280×800 and 1024×768, all eight steps, guide inside the Mission Designer, a real Launch with the antenna Anomaly, last card, Close. No page errors. Screenshots `ticket-39-*`.

**Still pending from the last session:** remove the synthetic Supabase account `Ticket37Check` (ID `8255a026-af45-440c-830c-435eb6b096b4`) once a working Supabase deletion confirmation is available. See `supabase/README.md`. Do not ask for the same permission again.

**Next:**
1. Team: test tickets 32, 33, 34, 36 and 39. In 39, decide whether Mines and Metal Works belong under "Define Concept". Check the open-point choices in ticket 36 (failed Missions, Syncom 3's mass) and the Free Play picks (SAMPEX, NOAA-18, TDRS-1). Decide if the Earth → Moon path (1 h 43 min at 300×) should play faster. Confirm the Mission Viz credit wording.
2. The rule items in tickets 28 and 29, then 40–41 in the order in `docs/tickets/README.md`.
3. Team: make the repo public, then Settings → Pages → Source: GitHub Actions; paste `docs/submission.md` into the Project tab (opens Sat 14 Nov 9:00 local); demo (30 s video or 7 slides); save support's early-start message.

**Note:** a fresh container needs `npm ci` before `npm run check`.

**Working convention:** as before. New screenshots go in `screenshots/development-NASA_resources/` (README there). To capture game scenes for art: Demo Mode, hide `#ui`, move `window.leap.world.camera` (dev server only); `window.leap.launchShow.play(...)` plays any rocket.

**Suggested skill:** `/handoff` at the end.

## Log

- 2026-11-14: Ticket 39 built: the tutorial under NASA's six steps (step name, six-dot row, last card with the slides). 424 tests, type checks and browser checks (1280×800, 1024×768, full tutorial) pass.

- 2026-11-14: With explicit user approval, deployed `leap-online` v6 for Alouette History ID compatibility. Live API and Chromium client recovery/save/load pass. Cleanup of the one synthetic account remains blocked by expired Supabase confirmations, despite approval.

- 2026-11-14: Ticket 38 built: eight page-linked CubeSat 101 tips, five random loading choices and contextual advice; Real data/Credits updated. 420 game tests, both type checks, production/online builds and focused browser checks pass. Backend deployment for the new History ID remains blocked pending explicit production approval.

- 2026-11-14: Ticket 37 built: Alouette 1 side story after Telstar 1, CSA source in Credits; text-only until a photo is cleared. 418 game tests, both type checks and browser flow/save/layout checks pass.

- 2026-11-14: Ticket 36 built: Like the real one at the end of every Mission Report (mass, Power, how long it worked, one comparing line); seven real Spacecraft with a source per figure; Webb game in Real data. 417 tests, type checks and browser checks (1280×800, 1024×768; Campaign, Free Play, a failed Mission) pass.
- 2026-11-13: Ticket 35 built: repo test compares LEAP's Kepler code with GMAT's long ellipse (0.31% mean, 1.24% worst distance; lap 0.07%; GEO radius 0.02%); one line in Real data. 406 tests, type checks and browser checks (1280×800, 1024×768) pass.
- 2026-11-13: Ticket 34 built: GMAT Reference Trajectories from NASA Mission Viz baked to 18 KB; transfer picture in the Launch planner; Reference paths (transfer, long ellipse, Earth → Moon with the Moon) in the Space view; Mission Viz in Real data. 401 tests, type checks and browser checks (1280×800, 1024×768) pass.
- 2026-11-13: Ticket 33 built: maturity strip (JPL's four Concept Maturity Levels) and the Design Review (35% margins, 80% green) replacing the planner's warnings; tested designs saved without a version bump; CML paper in Real data. Merged main's ticket 32. 385 tests, type checks and browser checks (Explorer 1, TIROS-1, Syncom 3; 1280×800 and 1024×768) pass.
- 2026-11-13: Ticket 32 built (Segments in planner and report); ticket 28 licence, AI disclosure, music AI tags, Pages workflow and project page text; ticket 29 watermark and Era 1 picture from game screenshots; Era 2 and Free Play pictures added from the team's ChatGPT results. 370 tests, type checks and browser checks pass.
- 2026-11-13: Official Resources captured into `docs/challenge.md` with the rules published that day; research note `official-resources.md`; tickets 32–48 written from the 19 approved ideas; tickets 27–29, GDD, glossary, checklist and AGENTS.md updated. Docs only; game code unchanged. Source files added under `docs/research/sources/` and linked from each ticket; `scripts/fetch_spaceapps_page.py` reads the challenge site.
- 2026-11-13: Fixed all 15 QA findings (tickets 01, 02, 04, 05, 08, 13, 16, 17, 19, 22, 26, 30) with tests and `_solved` screenshots; `leap-online` redeployed and a live v19 cloud save/load checked. 362 tests, both type checks and production/online builds pass.
- 2026-11-12: Feature guide on main 3e14a17: 81 new screenshots across the built tickets, with captions, entry paths, fixtures and limits; older images kept. 356 tests, both type checks and production/online builds pass. Game code unchanged.
- 2026-11-12: QA on main 4661008: rechecked eight open bugs, confirmed six new findings and the known narrow-panel overlap; 15 findings in existing tickets. Screenshots organised, background evidence recorded. 356 tests, both type checks, production/online builds and focused browser/API checks pass.
- 2026-11-12: Ticket 31 QA fix: the Space view camera can no longer go inside Earth. 356 tests, build and before/after browser checks pass.
- 2026-11-12: Ticket 30 built from freshly pulled main: Plots next door with their own Deposits, hover highlight and Plot card, buying grows the Site (building, border, camera, shadows, Shipping road), Free Play land Contracts, save v19. 354 tests, build and browser checks pass.
- 2026-11-12: Ticket 29 (agent part): art guide and Era prompts, Era 1 card for new Campaigns, Era card image slot with AI-illustration caption, compression script. 347 tests, build and browser checks pass.
- 2026-11-12: Ticket 28 (agent part): main-menu Credits screen (placeholder team Artemis-IV), README How to play and Credits. 345 tests, build and browser checks pass.
- 2026-11-12: Ticket 27 (part) on `main` via PR #27: Blue Marble globe colours from NASA GIBS and the Real data list in the menus; official Resources still to capture.
- 2026-11-12: Ticket 26 built from freshly pulled main: title/live Company menu, loading shots/tip, shared source links, curved Launch ground and UI readability; Research/Home overlap fixed. 342 tests, build and browser checks pass.
- 2026-11-12: Ticket 25 built from freshly pulled main: screen music, crossfaded loops, generated effects, persistent volumes and audio credits; smaller normalized tracks. 340 tests, build and browser/audio checks pass.
