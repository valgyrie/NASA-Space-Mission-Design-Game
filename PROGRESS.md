# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–26, 30 and 31 built; 27 partly built; 28’s and 29’s agent parts built. This is the QA-only branch `codex/qa-screenshots-tickets-19-31`, from the latest `main` at **4661008** (PR #30 merged). Game code and save format are unchanged. Team playtests and submission work remain open.

**Just finished: the requested bug reproduction and screenshot pass.** Full results: `docs/qa/2026-11-12/README.md`.
- All eight previously open QA findings still reproduce. Six new findings plus ticket 30’s known narrow-panel overlap make **15 open findings**, recorded as unchecked QA items in the relevant existing tickets. Shared causes are counted once.
- New: current v19 cloud saves fail against the deployed backend; local-save errors silently lose changes; the logo editor lets keyboard focus restart the clock; repeated setup/Back leaks building buffers; buying land during assembly leaves the old Shipping route; H crops an expanded Site.
- All development captures are in `screenshots/development-No_NASA_resources-/features and game/` or `bugs and errors/`. Root images and old QA images were moved unchanged; links updated. `screenshots/game screenshots/` is reserved for the final demo. Start at `screenshots/README.md`.
- 356 tests, client/backend type checks, production build and online bundle pass. Browser checks at 1440×900, 1024×768 and 700×600; production UI confirms the editor-clock and cloud-save failures. Live Weekly Challenge scored 90.88 and kept the local Company unchanged. The temporary cloud account/save/result were removed with explicit approval; both remaining-row counts are zero.
- Failed automation selectors were corrected in ignored `work/` scripts; completed runs reported no application page errors. Fixtures and remaining human/device checks are described in the QA report. No tests, dependencies or framework added; launcher checks remain deferred.

**Next:**
1. Review the QA report and fix one recorded finding at a time. Start with ticket 22’s deployed save-validator mismatch and ticket 02’s silent local-save failure, then the dialog clock and ticket 30 regressions. Each fix needs its focused check and a browser recheck before its checkbox is ticked.
2. Team: playtest the built tickets, judge Anomaly difficulty and tutorial timing, listen to the music and review art on real devices. The agent checks do not replace those.
3. Nov 13: finish ticket 27’s official Resources work, then review the Era prompts. Team generates the actual Era art; see `docs/art/README.md`.
4. Finish ticket 28’s names, hosting, video, project page, repository visibility and organisers’ logo answer; run final launcher checks at that ticket.

**Working convention:** keep the existing short ticket/QA writing, glossary terms and limited tests. Put new screenshots in the agreed folders with `ticket-NN-what-happened.png` names and link them from the relevant ticket. Record background errors with a trigger and measured evidence; screenshots are for visible problems. Current coverage and unchecked work are in the QA report, not implied by the screenshot alone.

**Suggested skills:** `research` for official Resources; `handoff`.

## Log

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
- 2026-11-12: Ticket 19 built: Company logo maker and drawing upload, logo on HQ flag/sign, all four rockets and Mission Patches; save v16 migrates older Companies to the original preset. 308 tests and build pass.
