# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–26 and 30–41 built (32, 33, 34, 36, 39, 40 and 41 wait for a team test); 27 continues as tickets ship; 28 and 29 agent parts done. Ticket 41 built from freshly pulled `main` **30c291c** and merged into `main`. 453 game tests and both type checks pass.

**Done this session (14 Nov): ticket 41, Team Mode.**
- A **Team Mode** button in the Mission Designer's header: Off, 2, 3 or 4 players share the Company on one computer, each with a colour and an optional nickname. It stays on for the next Missions. Details and who owns what: `docs/tickets/41-team-mode.md` ("As built").
- A row of player buttons passes the mouse. Slots, Launch Vehicle, Launch Site, Launch Insurance and Ground Tests carry their role's label and colour, and answer only to the player at the mouse.
- The Design Review groups its lines by role with a **Sign** button each. A signature clears when that role changes a choice or one of its lines changes colour. Ship waits: "Waiting for: Power".
- Mission Report: a Team Mode section, one line per role with its player.
- Save stays v19 (optional `team` on the state, Mission and report). Cloud saves blank the nicknames (`withoutPlayerNames`, tested).
- Also fixed: the Mission Designer's body no longer overflows the panel when a row above it changes height (`grid-template-rows` in `.designer-body`).
- Browser: TIROS-1 fixture with three players at 1280×800 and 1024×768, mouse and keyboard, sign, unsign, re-sign, ship, a real flight and the report; also 4, 2 and Off. No page errors. Screenshots `ticket-41-*`.

**Team asked (14 Nov):** "multiplayer, 2 players in 1 base". Team Mode now is that on one computer. Players on different computers (online co-op) is still the Optional idea in `CHECKLIST.md`; it needs its own ticket and a look at ADR-0004 and child safety first.

**Still pending from an earlier session:** remove the synthetic Supabase account `Ticket37Check` (ID `8255a026-af45-440c-830c-435eb6b096b4`) once a working Supabase deletion confirmation is available. See `supabase/README.md`. Do not ask for the same permission again.

**Next:**
1. Team: test tickets 32, 33, 34, 36, 39, 40 and 41 (41: is passing the mouse fun with two, three and four? Should a signature clear when another role changes a line's colour?). In 39, decide whether Mines and Metal Works belong under "Define Concept". Check the open-point choices in ticket 36 and the Free Play picks (SAMPEX, NOAA-18, TDRS-1). Decide if the Earth → Moon path should play faster. Confirm the Mission Viz credit wording.
2. The rule items in tickets 28 and 29, then the rest (42–48) in the order in `docs/tickets/README.md`. Feature freeze is Saturday night (14 Nov).
3. Team: make the repo public, then Settings → Pages → Source: GitHub Actions; paste `docs/submission.md` into the Project tab; demo (30 s video or 7 slides, Team Mode is worth showing: it answers the brief's "up to four" point); save support's early-start message.

**Note:** a fresh container needs `npm ci` before `npm run check`.

**Working convention:** as before. New screenshots go in `screenshots/development-NASA_resources/` (README there). To capture game scenes for art: Demo Mode, hide `#ui`, move `window.leap.world.camera` (dev server only); `window.leap.launchShow.play(...)` plays any rocket. Fixtures for browser checks: Demo Mode Era 1, then set `window.leap.state` and import game modules from `/src/game/*.ts` in the dev page.

**Suggested skill:** `/handoff` at the end.

## Log

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
- 2026-11-12: QA on main 4661008: rechecked eight open bugs, confirmed six new findings and the known narrow-panel overlap; 15 findings in existing tickets. Screenshots organised, background evidence recorded. 356 tests, both type checks, production/online builds and focused browser/API checks pass.
