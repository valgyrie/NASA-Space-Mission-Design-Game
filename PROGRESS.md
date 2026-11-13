# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–26, 30 and 31 built; 27 partly built; 28’s and 29’s agent parts built. Branch `claude/eloquent-dirac-sm0oe0`, from `main` at **cb64dd0**.

**Just finished: the 15 QA findings from 12 November.** All are solved and rechecked in Chromium with the QA steps.
- 04/19: Tab stays inside open dialogs (`src/ui/focusTrap.ts`) and the top bar's speeds wait while a dialog holds the Site paused. Checked in development and the production build.
- 16: the Scrub card pauses the Site and restores its speed. 17: a rocket that never reached orbit gets "would have" lines for the rest of the report.
- 05: a Factory's inputs keep their storage room until the Part is done; a paused Factory with its inputs says it starts when time runs.
- 08: buildings can't cover the Shipping dock while it is in use (`World.onShippingDock`). 30: buying land extends an active route (`extendRoute`); **H** fits all owned Plots and zoom-out grows to match (`wholeSiteView`).
- 01: the camera stays above the land around it. 13: the low tutorial leaves room at the end of the Mission Designer's lists. 26/30: side panels sit between the measured top bar and build menu.
- 26: Site previews dispose old building shapes and instanced buffers: 2,161 WebGL buffers after three setup/Back trips (was 8,587). 02: refused saves show a warning until a save works.
- 22: `leap-online` redeployed (version 5) with the v19 validator; a v19 Company with a bought Plot saved and loaded back live in dev and production. Temporary accounts deleted.
- **362 tests in 39 files**, both type checks, production and online builds pass (existing large-chunk warning). `_solved` screenshots sit beside the originals in `screenshots/development-No_NASA_resources-/bugs and errors/`; tickets, QA report and bug index say what is solved. GDD updated. Launcher checks remain deferred.

**Next:**
1. Finish ticket 27’s official Resources work and review the Era prompts; the team supplies the real art for ticket 29.
2. Team: beginner tutorial timing, Anomaly difficulty, listening, real-device and cross-browser review. Finish ticket 28’s names, hosting, video, project page, repository visibility and organisers’ logo answer; final launcher checks stay at that ticket.

**Working convention:** use the glossary and the existing short, factual ticket/QA style. New images go in the agreed development folders with `ticket-NN-what-happened.png` names; a fixed bug gets a `_solved` copy beside the original. Tick fixes only after focused tests and a browser recheck. Headless Chromium here renders the Site at about 3 fps, so give browser scripts long timeouts.

**Suggested skills:** `research` for official Resources; `handoff`.

## Log

- 2026-11-13: Ticket 25 music fix: music was mixed at about −26 LUFS (too quiet to hear); now about −22 LUFS at the default volume. Failed tracks retry on the next click and show a note in Sound settings. 363 tests, type checks and build pass.
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
