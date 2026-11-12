# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–26, 30 and 31 built; 27 partly built; 28’s and 29’s agent parts built. This documentation branch, `codex/development-feature-screenshots`, starts from freshly fetched `main` at **3e14a17** (PR #31 merged). Game code, tests, save format, dependencies and deployed services are unchanged.

**Just finished: the requested feature screenshot guide.** Start at `screenshots/development-No_NASA_resources-/features and game/README.md`, linked from `screenshots/README.md`.
- **81 new PNGs** at 1440×900 in Chromium 156, with ticket links, short captions, entry paths, fixture details, verification and limits. Coverage spans the built features across tickets 01–31: entry/setup, every building, Market, design, all five Launch Vehicles in the catalogue, Shipping, Test Run, 3D Launch/staging, the three Anomalies, reports/Patches/history, Research/Marks, Campaign Eras 1–2, Free Play, Online, Weekly Challenge, sound/data/credits, bought land and Space view.
- Most building views use the actual Era 2 Demo. Mission/progression/Research/land captures also use prepared local states. The logo/save path starts through real Company setup. Current Weekly design/Test Run captures use an offline fixture; public leaderboard captures only read. No accounts, cloud saves or attempts were created. The earlier live weekly result and all other old captures remain unchanged and labelled with their original build.
- **356 tests in 39 files**, client/backend type checks, production build and online bundle pass. Existing large-chunk warning remains. All new images were visually inspected; their dimensions, links, ticket coverage and preserved earlier captures were checked. Completed capture passes reported no uncaught application page errors. Launcher checks remain deferred.
- Capture scripts stay in ignored `work/`, following the earlier run. Two harness mistakes were corrected: wait for the refreshed Launch button, and supply the design to `testRunFor`. Standalone Anomaly captures were remounted in the normal Launch parent so its controls receive input. No product fixes or acceptance ticks were made.

**Next:**
1. Fix the open QA findings one at a time, starting with ticket 22’s deployed v19 save-validator mismatch and ticket 02’s silent local-save failure. Full evidence: `docs/qa/2026-11-12/README.md`; visible problems: `screenshots/development-No_NASA_resources-/bugs and errors/README.md`. The 15 findings remain open.
2. Finish ticket 27’s official Resources work and review the Era prompts; the team supplies the real art for ticket 29. This guide shows the current text-only fallbacks.
3. Team: beginner tutorial timing, Anomaly difficulty, listening, real-device and cross-browser review. Finish ticket 28’s names, hosting, video, project page, repository visibility and organisers’ logo answer; final launcher checks stay at that ticket.

**Working convention:** use the glossary and the existing short, factual ticket/QA style. New images go in the agreed development folders with `ticket-NN-what-happened.png` names, source build, viewport, steps and observed result. Label fixtures and earlier evidence. Record background failures with measured evidence, and tick fixes only after their focused tests and browser recheck. The guide does not replace the tickets’ acceptance criteria or team tests.

**Suggested skills:** `research` for official Resources; `handoff`.

## Log

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
