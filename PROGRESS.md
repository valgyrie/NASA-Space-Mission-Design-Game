# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–24 and 31 built; 12, 13 and 16–23 still await their team playtests. Local launchers are merged. Ticket 23 was built on `codex/ticket-23-weekly-challenge` from freshly pulled `main` (`e3f2194`, including ticket 22). Prior ticket implementations, design and test patterns were reviewed first.

**Just finished: ticket 23, Weekly Challenge and Seeds.** Rules, file map and detailed checks: `docs/tickets/23-weekly-challenge-and-seeds.md`, GDD §12 and `supabase/README.md`.
- Online with a Free Play Company now offers a weekly design contest. Attempts use isolated resources and the existing Mission Designer, Test Run and flight simulation. Fixed budget/catalogue/location/Launch day; server-owned UTC week, objective validation and weighted scoring. The Company and its cloud-save revision are kept.
- Best attempt per account/week survives concurrent submissions. Finishers collect the same weekly Mission Patch; final top-three podium badges arrive after the week closes. Rewards stay in the Online account and recover with its code. No currency sync, scheduled task or save migration.
- Copy in the pause menu includes location and climate kind with the Seed. Company setup loads shared codes; raw Seeds still work. New Company from a Seed asks before replacing an existing Company. Legacy climate survives import and mode changes.
- `weekly_challenge` migration (`20261112095744`) and updated `leap-online` function are deployed on the existing Supabase project. Same RLS/revoked-client-grant boundary as ticket 22; score upsert is service-only and security invoker. No dependencies added. Shared weekly-rule changes require rebuilding and redeploying the backend too.
- Tested: 336 tests, client/backend type checks, production build and backend bundle pass. Four focused tests added. Chromium at 1280×800 and 1024×768 covers success, failure, Test Run, rewards, Campaign restriction and Seed import/cancel. Production checks include submission, Seed replacement/copy, active-Site challenge use and separate-browser reward recovery. Company save isolation, concurrent best results and direct-access denial verified. No application page errors in completed checks; QA accounts removed. Team playtesting, touch and real-laptop performance remain unchecked. Launcher checks stay deferred.

**Next:**
1. Next unblocked ticket: 25 (Sound and music); read the audio source notes first. Also unblocked: 26 and 30. Ticket 27 waits for the official Resources (Nov 13).
2. Team: try Weekly Challenge in Free Play, compare retries and recover its rewards in another browser; share a Site code and check that its map matches. Try Online on two computers and keep the recovery code private; test Demo Mode, Free Play objectives and Campaign continuation, compare Easy/Advanced and judge the Anomaly difficulty. Older team-test criteria remain in their tickets.

**Open:**
- QA review on `e2ba793` recorded ten fixes in tickets 01, 04, 05 (two), 08, 13, 14, 16, 17 and 31. Reproduction steps and screenshots: `docs/qa/2026-11-11/README.md`. No unrelated fixes were folded into Demo Mode.
- Campaign currently ends after Syncom 3 and continues into Free Play; later Campaign Milestones move the interim endpoint. Free Play uses Falcon 9 Rideshares and the existing Part set. No booster landing or owned rocket yet.
- Era 2 still omits Titanium and tech tree items (ticket 18); Thor-Delta/Delta D staging gap and JPL/LC-26/Wallops coordinates need verification, the 12 m/s wind limit is unverified, and the Syncom photo looks retouched. Era 2 prices are game estimates.
- Existing issues: the Scrub card leaves the clock running; a Spacecraft lost to its rocket still lists Power, Comms and Time as met; no Reputation penalty for a missed deadline; insurance price shown twice; no NASA photo of Vanguard TV3's explosion. Orbits never decay and Speed is not saved. The panel Anomaly intro's “Push now!” is a harmless still frame.
- The tutorial overlay/timing still needs attention and a person to time it. Real-laptop performance and most touch flows remain unchecked; panel tap and eclipse buttons exist but have not been touch-tested.
- Launcher checks wait for the final ticket (AGENTS.md). Team: save the organisers' early-start permission in writing and capture the official Resources on Nov 13.

**Suggested skills:** `handoff`; read the audio source notes before ticket 25.

## Log

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
- 2026-11-10: Ticket 16 built: globe start picker, NASA POWER 2025 climate shapes the Site, Wallops Island as a second Launch Site with less lift, Shipping by distance, real launch weather Scrubs, Launch Window advisor, save v13.
- 2026-11-10: Buildings now take 3 × 3 tiles (visible from the whole-Site view, Site still 64 × 64, older saves refitted); Earth from space is a smooth globe with rounded coasts.
- 2026-11-10: Ticket 15 built: building levels and Upgrades, Part Marks (Mk 1–3), Assembly Hall (starts on the Site, sets the biggest Bus), save v12.
- 2026-11-10: Ticket 14 built: TIROS-1 Milestone, Vanguard 1 card unlocks Solar Cells, TV Camera, Thor-Able (3D too), Research Lab, Research Points and four Era 1 tech tree Upgrades, save v11.
