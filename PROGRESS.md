# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–26 and 30–34 built (32, 33 and 34 wait for a team test); 27 continues as tickets ship; 28 and 29 agent parts done. Ticket 34 built on branch `claude/fervent-allen-eyumpc` from `main` at **55c14b0** and merged into `main`. 401 tests and both type checks pass.

**Done this session (13 Nov): ticket 34, NASA's GMAT trajectories.**
- Bake: `scripts/build_reference_paths.py` reads the four Mission Viz files as text and writes `src/world/referencePaths.ts` (18 KB; source repo, folder and commit recorded). Helpers and tests in `src/world/referenceTrajectory.ts` / `.test.ts`.
- Launch planner: for geostationary Contracts, a face-on picture of the GMAT transfer with Burn 1 and Burn 2, "Path computed with NASA's GMAT", labelled a sample path, not Syncom 3's own (`src/ui/transferPicture.ts`).
- Space view: Reference paths list (transfer, long ellipse, Earth → Moon with the Moon on its own path), dashed orange, looping at 300×. Far limit raised; stars follow the camera.
- Finding: the Earth → Moon file reaches the Moon on day 6.4 and then circles it for two weeks, so the player line says that instead of the ticket's "three weeks to the Moon". Noted in the ticket and `official-resources.md`.
- Mission Viz entry in Real data and Credits (`data.missionViz.*`). Screenshots `ticket-34-*` in `screenshots/development-NASA_resources/`.

**Next:**
1. Team: test tickets 32, 33 and 34. Decide if the Earth → Moon path (1 h 43 min at 300×) should play faster. Confirm the Mission Viz credit wording.
2. Ticket 35 (orbit maths checked against GMAT), then 36–39 in the order in `docs/tickets/README.md`.
3. Team: make the repo public, then Settings → Pages → Source: GitHub Actions; paste `docs/submission.md` into the Project tab (opens Sat 14 Nov 9:00 local); demo (30 s video or 7 slides); save support's early-start message.

**Working convention:** as before. New screenshots go in `screenshots/development-NASA_resources/` (README there). To capture game scenes for art: Demo Mode, hide `#ui`, move `window.leap.world.camera` (dev server only); `window.leap.launchShow.play(...)` plays any rocket.

## Log

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
- 2026-11-12: Ticket 23 built from freshly pulled main: weekly design contest, server scoring and best attempts, finisher patches/podium badges, location-aware shared Seeds; backend deployed. 336 tests, builds and live API/browser checks pass.
- 2026-11-12: Ticket 22 built after Supabase was connected: anonymous recovery-code accounts, manual private Free Play saves and four leaderboards; backend deployed. 332 tests, builds and live API/browser checks pass.
- 2026-11-12: Ticket 22 checked on freshly pulled main (`9d3c02a`): not implemented, blocked by the missing team Supabase project. Reviewed prior code/test patterns; all 326 baseline tests, type checking and build pass.
- 2026-11-12: Ticket 24 built from freshly pulled main: main menu, two ready Demo Mode Companies on a fixed Site, isolated saves and menu return. 326 tests, build and browser checks pass.
- 2026-11-12: Ticket 21 built from freshly pulled main: modern Free Play, generated Contracts, Falcon 9 Rideshares, same-Company continuation, save v18. 321 tests, build and browser checks pass.
- 2026-11-12: Ticket 20 built from freshly pulled main: Easy and Advanced at setup and in Settings, two extra Advanced Parts with finer labels, shared Factory/Market and flight rules, save v17. 314 tests, build and browser checks pass.
