# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–26 and 31 built; 27 partly built (PR #27); 28's and 29's agent parts built on `claude/gracious-maxwell-l1cxre` (from `main` at `71c533a`, PR #27 the latest merged; no PR opened for this branch yet). 12, 13, 16–23, 25 and 26 still await team playtests/listening/visual review.

**Just finished: ticket 29 (agent part), Era illustrations.** Details: `docs/tickets/29-era-illustrations.md`, `docs/art/README.md`, GDD §13.
- `docs/art/README.md`: style guide, one prompt each for Era 1, Era 2 and Free Play, steps to add the images and a credits table.
- The team chose a new **Era 1 card** for new Campaigns (before the tutorial; older saves skip it via save upgrade `eraSeen: 1`).
- The Era card shows `public/eras/era-<N>.webp` with "Illustration (AI-generated)"; text only until the files exist. `scripts/prepare-era-art.py` compresses the team's picks. Credits has an Illustrations line.
- Tested: 347 tests, type checks, build; Chromium with stand-in images at 1280×800 and 700×600. No real images yet.

**Earlier this session: ticket 28 (agent part).** Main-menu Credits screen (team placeholder "Team Artemis-IV" in `credits.team`), README How to play and Credits. See `docs/tickets/28-submission.md`.

**Next:**
1. Nov 13: finish ticket 27 (capture the official Resources, map datasets, add to `DATASETS`). Then re-check the Era prompts against the Resources.
2. Team: generate the three Era images from `docs/art/README.md`; an agent runs the script, fills the credits table and ticks ticket 29's last item after seeing them in game.
3. Ticket 28 hosting: team picks GitHub Pages (repo must be public), Netlify or Vercel. Supabase only runs the backend. Then real names in `credits.team`, video, project page, repo public, organisers' logo answer, final launcher checks.

**Open:**
- QA fixes in `docs/qa/2026-11-11/README.md` (nine open) and the issues listed in tickets 12–23. Unchanged.
- Stray screenshots in the repo root (`active-*.png`, `board-*.png`, `market-*.png`, `top-*.png`) predate this session; ask the team before removing.

**Suggested skills:** `research` for the official Resources; `handoff`.

## Log

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
- 2026-11-11: Recorded ten confirmed QA fixes in the existing tickets, with reproduction steps and screenshots; game code unchanged.
- 2026-11-11: Ticket 12 built: Stuck solar panel (Mark sets the chance, thruster in time with the swing) and Survive the eclipse (Power margin and battery set the chance, switch systems off till sunrise); one Anomaly per flight, new kinds first.
- 2026-11-11: Ticket 18 built: HQ Upgrade to Era 2 (date jumps to 1962), Telstar 1 (whole Thor-Delta paid, Ground Stations), Syncom 3 (geostationary orbit, Main Engine, Large Bus, Delta D), four NASA-photo cards, save v15.
