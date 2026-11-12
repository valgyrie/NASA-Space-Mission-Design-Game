# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–22, 24 and 31 built; 12, 13, 16–22 still await their team playtests. Local launchers are merged. Ticket 22 was built on `codex/ticket-22-online-basics` from freshly pulled `main` (`b784dc4`), after the team connected its Supabase project. Earlier code, design and test patterns were reviewed first.

**Just finished: ticket 22, Online basics.** Rules, files and detailed checks: `docs/tickets/22-online-basics.md`, GDD §12, ADR-0004 and `supabase/README.md`.
- Online on the main menu and Free Play pause menu: space-themed nicknames, 🎲 re-roll, shared client/server name filter and copied secret recovery codes. No email, password or personal identity required. Codes authenticate private operations; only their hashes are stored in Supabase. Losing the code and browser data loses access.
- Explicit Save and confirmed Load for one private Free Play Company per account; no background sync. The existing v18 validator is shared with the backend. Local failures are reported, offline play stays available, concurrent writes conflict, and pagehide autosave keeps the downloaded Company when loading from a running Site. Campaign upload is disabled; Demo Mode retains its separate local slot.
- Four top-20 leaderboards expose nicknames and derived scores only. Company value, Missions completed, Reputation and Research definitions are in GDD §12. Player saves remain editable; no authoritative simulation or anti-cheat added.
- Supabase project `oyslhxxgxtqhgpfivwcb` has the `online_basics` migration and active `leap-online` function. RLS and revoked client grants deny direct table access. Server credentials stay inside the function. Deployment notes explain the intentional “RLS Enabled No Policy” informational notice. Rebuild and redeploy the backend when changing shared save/filter/score rules. No dependencies added; normal type checks now include backend code.
- Tested: 332 tests (six focused additions), client/backend type checks, production build and backend bundle pass. Chromium at 1280×800 and 1024×768 checks account creation, filtering/re-roll, all boards, manual save/load, separate-browser recovery and continued Advanced Free Play. Production checks include code copying, replacement cancellation, offline preservation, Campaign/Demo isolation and active-Site cloud loading through pagehide. Live API checks cover private access, malformed saves, score derivation, concurrent writes, table access denial and request size. QA accounts removed; no application page errors in completed checks. Team playtesting, touch and real-laptop performance remain unchecked. Launcher checks remain deferred.

**Next:**
1. Ticket 23 (Weekly Challenge and Seeds) is unblocked. Read the online rules and deployment notes before extending them. Other unblocked tickets: 25 (Sound and music), 26 and 30. Ticket 27 waits for the official Resources (Nov 13).
2. Team: try Online on two computers and keep the recovery code private; test Demo Mode, Free Play objectives and Campaign continuation, compare Easy/Advanced and judge the Anomaly difficulty. Older team-test criteria remain in their tickets.

**Open:**
- QA review on `e2ba793` recorded ten fixes in tickets 01, 04, 05 (two), 08, 13, 14, 16, 17 and 31. Reproduction steps and screenshots: `docs/qa/2026-11-11/README.md`. No unrelated fixes were folded into Demo Mode.
- Campaign currently ends after Syncom 3 and continues into Free Play; later Campaign Milestones move the interim endpoint. Free Play uses Falcon 9 Rideshares and the existing Part set. No booster landing or owned rocket yet.
- Era 2 still omits Titanium and tech tree items (ticket 18); Thor-Delta/Delta D staging gap and JPL/LC-26/Wallops coordinates need verification, the 12 m/s wind limit is unverified, and the Syncom photo looks retouched. Era 2 prices are game estimates.
- Existing issues: the Scrub card leaves the clock running; a Spacecraft lost to its rocket still lists Power, Comms and Time as met; no Reputation penalty for a missed deadline; insurance price shown twice; no NASA photo of Vanguard TV3's explosion. Orbits never decay, there is no reset/new Company button for an existing save, and Speed is not saved. The panel Anomaly intro's “Push now!” is a harmless still frame.
- The tutorial overlay/timing still needs attention and a person to time it. Real-laptop performance and most touch flows remain unchecked; panel tap and eclipse buttons exist but have not been touch-tested.
- Launcher checks wait for the final ticket (AGENTS.md). Team: save the organisers' early-start permission in writing and capture the official Resources on Nov 13.

**Suggested skills:** `handoff`; read the audio source notes before ticket 25.

## Log

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
- 2026-11-10: Ticket 13 built: Explorer 1 tutorial guide, Real History cards with NASA photos, Mission Patches, History Archive, save v10 (ticket 12 waits for 14).
- 2026-11-10: Synced the launcher branch with newer main; kept its game, tickets and current handoff.
- 2026-11-10: Deferred further launcher validation to the final ticket; existing game checks stay in place.
