# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–26 and 30–42 built (32, 33, 34, 36, 39, 40, 41 and 42 wait for a team test); 27 continues as tickets ship; 28 and 29 agent parts done. Ticket 42 built from freshly pulled `main` **a95ba6a** and merged into `main`. 460 game tests and both type checks pass.

**Done this session (14 Nov): ticket 42, Science-first Contracts, Light and Full.** Details: `docs/tickets/42-science-first-contracts.md` ("As built").
- Light: every generated Free Play Contract says who needs the Data ("A farmer wants to know if rain is coming before the harvest."), picked stably from its ID. Board row **Who needs it**; italic line under the Mission Report title. Clients are now kinds of people; the made-up company names are gone.
- Full: a **Choose a question** card on the Free Play board, four questions (storms, sea ice, radiation, a mountain village's calls). The question sets orbit, Payload and days; the Mission Designer greys out Payloads that can't answer it (and "None" in Propulsion for geostationary), one line why. IDs `ask-<question>-<n>`; save stays v19.
- Glossary: **Question Contract**.
- Also fixed: left side panels end above the Build menu when it wraps to two rows (1024 px, Free Play). Before, the bottom of the Contracts board was hidden and unclickable.
- Browser: Free Play fixture at 1280×800 and 1024×768: board, question card, Village line accepted, greyed options (forced click ignored), a real flight and the report. No page errors. Screenshots `ticket-42-*`.

**In progress (14 Nov): realistic graphics.** The team asked for the voxel look to be replaced. Part 1 is in: smooth textured land, water, a physical sky, and all ten buildings as Blender models (`public/models/buildings.glb`, scripts in `scripts/blender/`). Gameplay is unchanged; 463 tests, type checks and the production build pass. Rockets, the Launch scene, Spacecraft, Earth, trees, the truck and the Credits entries for the new assets are still to do. Everything a new session needs, with the prompts for each remaining stream: `docs/graphics-overhaul/HANDOFF.md`. The finished look needs the team's go-ahead before its final merge.

**Realistic graphics, session 2 (14 Nov, afternoon):** cut short by the usage limit. Two agents were polishing the land and sky (white sky, sand, rock, Deposits, cliffs, ground under buildings) and the buildings (materials, baked shading, smoke, level sign, flag). Their work so far is committed as a checkpoint that passes the checks, but nobody has reviewed how it looks. Start at "Session 2: read this first" in `docs/graphics-overhaul/HANDOFF.md`: it has the state, this machine's set-up (Node on PATH, screenshots need Chrome, no `gh`) and the prompts to re-run.

**Realistic graphics, session 3 (14 Nov, evening):** the land, water and sky are finished (clear view, no texture grid, real sand and beaches, ore-stained Deposits with rocks, a sea that no longer repeats, ground graded round buildings) and so are the buildings (own materials per building, dirt and baked shading, ore heaps, soft smoke, star signs, waving flag; model file 8.9 MB). 476 tests and the type checks pass. The Earth is now NASA photographs with real clouds and city lights, the stars have a Milky Way, and the Spacecraft has foil, solar-cell and metal materials (a few checks and one licence point are left, listed in the handoff); rockets and the Launch scene, trees and the truck, the Credits entries and the play-test are not started. Start at "Session 3: START HERE" in `docs/graphics-overhaul/HANDOFF.md`: state, this machine's set-up and the prompts for each remaining agent. The finished look still needs the team's go-ahead before its final merge.

**Realistic graphics, session 4 (14 Nov, later):** on a second PC. Rockets and the Launch scene, and trees, rocks and the Shipping truck, were being built by two agents when usage ran low; their work so far is committed as a checkpoint that passes the checks but has not been reviewed on screen. The Spacecraft, Earth and stars came in from the first PC (left-overs and one licence point are in the handoff). Start at "Session 4" in `docs/graphics-overhaul/HANDOFF.md`: state, both PCs' set-up and the prompts to re-run.

**Still pending from an earlier session:** remove the synthetic Supabase account `Ticket37Check` (ID `8255a026-af45-440c-830c-435eb6b096b4`) once a working Supabase deletion confirmation is available. See `supabase/README.md`. Do not ask for the same permission again.

**Next:**
1. Team: test tickets 32, 33, 34, 36, 39, 40, 41 and 42 (42: do the need lines and questions read well for a 10-year-old? Should Milestone cards get a need line too?). In 39, decide whether Mines and Metal Works belong under "Define Concept". Check the open-point choices in ticket 36 and the Free Play picks (SAMPEX, NOAA-18, TDRS-1). Decide if the Earth → Moon path should play faster. Confirm the Mission Viz credit wording.
2. The rule items in tickets 28 and 29, then 43–48 in the order in `docs/tickets/README.md`. Feature freeze is Saturday night (14 Nov).
3. Team: make the repo public, then Settings → Pages → Source: GitHub Actions; paste `docs/submission.md` into the Project tab; demo (30 s video or 7 slides; Team Mode answers the brief's "up to four" point); save support's early-start message.

**Note:** a fresh container needs `npm ci` before `npm run check`.

**Working convention:** as before. New screenshots go in `screenshots/development-NASA_resources/` (README there). Free Play fixture: on the dev page, import `/src/game/siteState.ts` and `/src/save/save.ts`, write a Free Play save to `localStorage`, reload, Let's go → Continue, then place HQ and Assembly Hall with `placeHQ`/`placeAssemblyHall` on `window.leap.state`. Campaign fixtures: Demo Mode Era 1, then set `window.leap.state`.

**Suggested skill:** `/handoff` at the end.

## Log

- 2026-11-14: Realistic graphics, session 3: land, water, sky and the ten Blender buildings finished and reviewed in screenshots; Spacecraft and Earth started. 476 tests and type checks pass. Handoff with agent prompts in `docs/graphics-overhaul/HANDOFF.md`.
- 2026-11-14: Music fix: tracks are now MP3s saved as `<id>.music`, because download managers (e.g. Internet Download Manager) grabbed every `.mp3` request, so the game had no music and kept re-requesting. A track that fails stays silent until reload. 463 tests and type checks pass; browser check: one request per track, a blocked track is not retried.
- 2026-11-14: Ticket 42 built: who needs the Data on every Free Play Contract, a Choose a question card with greying in the Mission Designer, side panels end above a two-row Build menu. 460 tests, type checks and browser checks (Free Play, 1280×800 and 1024×768) pass.
- 2026-11-14: Ticket 41 built: Team Mode (2–4 players on one computer, roles own slots and planner choices, signing the Design Review, report section, nicknames kept out of cloud saves). 453 tests, type checks and browser checks (TIROS-1, three players, 1280×800 and 1024×768) pass.
- 2026-11-14: Ticket 40 built: Ground Tests in the Launch planner (days, price, halved Anomaly chance, CubeSat 101 pages), report line, save still v19. 435 tests, type checks and browser checks (TIROS-1 at 1280×800 and 1024×768) pass.
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
