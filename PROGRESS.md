# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–26 and 30–35 built (32, 33 and 34 wait for a team test); 27 continues as tickets ship; 28 and 29 agent parts done. Ticket 35 built on branch `claude/awesome-darwin-s5j2s6` from `main` at **2afca4b** and merged into `main`. 406 tests and both type checks pass.

**Done this session (13 Nov): ticket 35, LEAP's orbit maths checked against GMAT.**
- Test `src/game/space.gmat.test.ts`: LEAP's `orbitMinutes`/`orbitPosition` against all 155 points of GMAT's long-ellipse run. Distance from Earth's centre 0.31% on average, 1.24% at worst; lap 66.72 h against GMAT's 66.68 h; geostationary 42,157 km against GMAT's 42,165 km. Details in the ticket's **Built** section and `docs/research/official-resources.md`.
- Source reader moved to `src/world/missionVizSource.ts` (Node only, tests only), shared with ticket 34's tests.
- Real data, Mission Viz entry: new line `data.missionViz.check` ("within 0.3% … 1.2% at worst"), drawn by `src/ui/dataCredits.ts`. The test fails if the line's numbers drift from the result.
- Screenshots `ticket-35-*` in `screenshots/development-NASA_resources/features and game/`.

**Next:**
1. Team: test tickets 32, 33 and 34. Decide if the Earth → Moon path (1 h 43 min at 300×) should play faster. Confirm the Mission Viz credit wording.
2. Ticket 36 (Like the real one), then 37–39 in the order in `docs/tickets/README.md`.
3. Team: make the repo public, then Settings → Pages → Source: GitHub Actions; paste `docs/submission.md` into the Project tab (opens Sat 14 Nov 9:00 local); demo (30 s video or 7 slides); save support's early-start message.

**Note:** a fresh container needs `npm ci` before `npm run check`.

**Working convention:** as before. New screenshots go in `screenshots/development-NASA_resources/` (README there). To capture game scenes for art: Demo Mode, hide `#ui`, move `window.leap.world.camera` (dev server only); `window.leap.launchShow.play(...)` plays any rocket.

**Suggested skills:** `/grill-with-docs` if ticket 36 raises design questions; `/handoff` at the end.

## Log

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
