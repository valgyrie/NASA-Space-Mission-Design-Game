# 23: Weekly Challenge and Seeds

**What to build:** Weekly Challenge with the same budget and Parts list for everyone, scored on reliability, science, money left and mass margin. Seeds can be shared.

**Blocked by:** 22

**Status:** built, waiting for a team test

- [x] Weekly Challenge is available only in Free Play
- [x] Fixed budget and Parts list for all players
- [x] Score: objective required, then Reliability 40%, Science 30%, Money left 20%, Mass margin 10%
- [x] Best attempt counts; top 3 get a badge; all finishers get the same reward
- [x] Seeds can be shared and loaded


**As built:** Weekly Challenge appears in Online with a Free Play Company, on the main menu or from its pause menu. Campaign and Demo Mode have no Weekly Challenge. Attempts use a separate state and the existing Mission Designer, 3D model, resource bars, Test Run and flight rules. The player's Company and cloud save are kept. Every attempt has $600,000, the same Mk 1 catalogue across both difficulty modes, JPL Shipping, Falcon 9 from Cape Canaveral, and one common clear Launch day after the largest Bus can be assembled. Parts, Rideshare and Shipping count against the budget. Personal stock, buildings, tech and grants cannot enter an attempt.

Weeks start Monday at 00:00 UTC on the server. Generated radiation surveys and weather Missions alternate. The server accepts a week and design, recreates the flight and requires the objective before scoring. Reliability uses the Test Run's estimated success including the Launch Vehicle; Science values reserve for up to twice the required Data; Money left and Mass margin are fractions of the starting budget and lift limit. Weights are 40/30/20/10, rounded to two decimal places out of 100. Exact definitions and game assumptions are in GDD §12. The ordinary first-Launch protection from rocket failure applies; this design contest has no Anomaly mini-game.

One best result per account per week is kept by an atomic database upsert. The top 20 are shown. All finishers earn the same weekly Mission Patch, collected with their Online account, without adding Company money. Final top-three podium badges appear after the week ends; current standings are provisional. Ties use a stable account ID, so speed does not count. Account recovery restores the patches and badges. These remain casual boards, without rate limiting or a broader anti-cheat system.

Pause-menu Copy now includes Seed, coordinates and the start/climate kind in a shared code. Paste it into Company setup to restore the same Site, including legacy-climate Sites. Raw Seeds still work with the chosen place. New Company from a Seed opens setup even with an existing Company; starting confirms before replacing it. Cancelling keeps the original save. Switching to Free Play preserves an imported legacy Site's climate.

**Files:** `src/game/weekly.ts` holds shared attempt and scoring rules, and `src/site/shareSeed.ts` handles shared codes. `src/ui/weekly.ts` extends Online and reuses `missionDesigner.ts`; the normal designer's planner and controls stay in place. Discarded challenge designers release their renderer and listeners. The existing online client/function add weekly actions; the `weekly_challenge` migration adds private results and a service-only SQL upsert. Both backend changes are deployed on the team's existing project. No dependency or save-format change.

**Tested:** all 336 tests, client/backend type checks, production build and backend bundle pass. Four focused additions cover week/year boundaries, deterministic attempts, fixed Launch day across Bus sizes, score weights, objective gating, invalid choices/capacity, and shared Site reproduction with normal and legacy climates.

Chromium at 1280×800 and 1024×768 checks design choices, Test Run, submission, failed retry, reward display, Campaign restriction, shared-code parsing and replacement cancellation. Challenge attempts leave the local Company save byte-for-byte unchanged. Production checks without development hooks cover submission, confirmed Seed replacement and copying it back, and challenge opening/closing from an active Site. Recovery in a fresh browser restores the finisher patch and a prior-week podium badge. No application page errors in completed checks.

Live API checks cover wrong codes, unavailable/malformed designs, expired weeks, failed objectives, server-derived scores, concurrent higher/lower submissions, one reward per week, preserved cloud-save revision and recovered rewards. Direct table reads, writes and score-RPC calls with the publishable key are denied. The security advisor reports only the intentional no-policy notices documented in `supabase/README.md`; the performance advisor has no findings. Temporary QA records were removed. Team playtesting, touch and real-laptop performance remain unchecked. Launcher checks remain deferred to the final ticket.
