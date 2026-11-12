# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–26 and 31 built; 27 partly built (PR #27: Blue Marble globe and Real data list); 28's agent parts built. 12, 13, 16–23, 25 and 26 still await team playtests/listening/visual review. This session worked on `claude/gracious-maxwell-l1cxre`, started from the tip of `main` (`71c533a`, the merge of PR #27).

**Just finished: ticket 28 (agent part), Credits screen and README.** Details: `docs/tickets/28-submission.md`, GDD §15.
- Main menu → **Credits**: team, AI-agents line, challenge link, not-endorsed-by-NASA line, every real dataset, Real History photo credits, reading sources, music/sound, software with licences. Back or Esc returns. `src/ui/credits.ts`; dataset list shared with the menus' Real data box.
- Team name is the placeholder **"Team Artemis-IV"** (`credits.team` in `src/strings.ts` and README's Credits section). The team will replace it with their names.
- README: short How to play steps and a Credits section.
- Tested: 345 tests, type checks and production build pass; Chromium at 1280×800 and 700×600 (open, scroll, Esc/Back focus, Demo picker unchanged, no horizontal scroll, no page errors). No save or backend changes. Launcher checks remain deferred.

**Next:**
1. Nov 13: finish ticket 27: capture the official Resources tab into `docs/challenge.md`, map each dataset used to a visible feature (GDD §14), add it to `DATASETS` + `data.<id>.*` strings. Credits picks it up automatically.
2. Hosting (ticket 28): the team must pick a host. Supabase only runs the online backend and cannot serve the game. `npm run build` gives a static `dist/` for GitHub Pages (needs the repo public, or a paid plan), Netlify or Vercel. For GitHub Pages under `/<repo>/`, set Vite `base` (assets already use `import.meta.env.BASE_URL`) and add a deploy workflow.
3. Team: real names in `credits.team`; video; project page; repo public; ask organisers about the official logo. Then the final-ticket launcher checks (CHECKLIST, Judges and submission).

**Open:**
- QA fixes from `docs/qa/2026-11-11/README.md` (nine still open), plus the open issues listed in tickets 12–23. Unchanged this session.
- Stray screenshots in the repo root (`active-*.png`, `board-*.png`, `market-*.png`, `top-*.png`) predate this session; ask the team before removing.

**Suggested skills:** `research` for the official Resources; `handoff`.

## Log

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
- 2026-11-10: Ticket 17 built: Launch Vehicle failures (first Launch safe), Launch Insurance, missed deadlines reopen Milestones, Vanguard TV3 failure story, one-time startup grant, save v14.
