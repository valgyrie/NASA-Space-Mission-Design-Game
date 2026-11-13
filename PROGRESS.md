# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–26, 30 and 31 built; 27 partly built; 28’s and 29’s agent parts built. Tickets 32–48 written, none started. Branch `claude/ecstatic-hawking-lk8q65`, from `main` at **f3aed16**, merged into `main`. Docs only this session (game code unchanged).

**Just finished: the official Resources (published 13 Nov) turned into docs and tickets.** The team approved all 19 ideas on 13 Nov.
- Source files are in the repo: `docs/research/sources/` (Mission Viz / GMAT trajectory files; text of the slides, CubeSat 101, the Webb game's options and the Mission Design Lab page; index in its README). Every ticket 32–48 names the files it needs. `scripts/fetch_spaceapps_page.py <url>` prints live challenge-site pages (Resources tab, guides, FAQ).
- `docs/challenge.md`: the Resources tab with NASA's own descriptions and links, and a short "Rules published 13 Nov" section (early start, demo limit, project page, AI watermark and branding, judging, licence). Stale team note removed; the Details tab is unchanged.
- `docs/research/official-resources.md` (new): what each Resource contains, JPL's CML levels, 80% rule and 35% margins, the four Mission Viz/GMAT trajectory files, CubeSat 101 page references, Alouette 1 facts, and how to reach spaceappschallenge.org from a container (missing SSL.com intermediate).
- Tickets 32–48 (one per idea; 2 and 3 share ticket 33). Ticket 27 now covers finishing the Resources' Real data entries; 28 has the rule items (early-start disclosure, demo limit, References, licence, AI, links, under-18, deadline); 29 has the watermark and no-NASA-branding items.
- GDD §3, §6–§10, §14 and §16 list the planned features, each marked planned with its ticket. Glossary: Segment, Concept Maturity Level, Design Review, Ground Test, Reference Trajectory, Team Mode. Checklist: Resources item ticked, early-start item reworded, one line per new ticket. AGENTS.md: organisers line.

**Next (recommended build order, `docs/tickets/README.md`):**
1. Ticket 27’s remaining item as each feature ships → 32 Segments → 33 Maturity strip and Design Review → 34 GMAT trajectories → 35 GMAT check → 36 Like the real one → 37 Alouette 1 → 38 tips → 39 six steps → rule items in 28/29 → 40 Ground Tests → 41 Team Mode → the rest. Stop adding features Saturday night.
2. Team: save Space Apps support’s early-start message and disclose the early start on the project page; choose the licence (Apache 2.0 or MIT) and demo format (30-second video or 7 slides); check the open _(verify)_ items (Mission Viz licence wording, Alouette photo credit, Syncom 3 end date, CubeSat 6U limits, GMAT script keywords).
3. Sunday: hosting, demo, project page, repo public, final launcher checks (ticket 28).

**Working convention:** use the glossary and the existing short, factual ticket/QA style. New images go in the agreed development folders with `ticket-NN-what-happened.png` names; a fixed bug gets a `_solved` copy beside the original. Tick fixes only after focused tests and a browser recheck. Headless Chromium here renders the Site at about 3 fps, so give browser scripts long timeouts. The downloaded Resources are not in the repo; re-fetch from the links in `docs/research/official-resources.md` when needed.

**Suggested skills:** `research` for the _(verify)_ items; `handoff`.

## Log

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
