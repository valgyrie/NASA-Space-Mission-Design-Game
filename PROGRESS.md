# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–21, 24 and 31 built; 12, 13, 16–21 still await their team playtests. Local launchers are merged. Ticket 22 is not implemented on freshly pulled `main` (`9d3c02a`, including ticket 24).

**Ticket 22 check:** reviewed tickets 20, 21 and 24, their changes, save/UI modules and test patterns. The team's Supabase project is still missing: no project configuration in the checkout or environment, no relevant GitHub issue, and no connected Supabase integration. Asked the team to connect Supabase and identify its project, or supply its project URL and public publishable/anon key. Secret/service-role keys must stay out of chat and client code. Account recovery, cloud saves and leaderboards remain unbuilt and untested. Existing baseline: all 326 tests, type checking and the production build pass. No game code, dependencies or tests changed; launcher checks remain deferred.

**Just finished: ticket 24, Demo Mode.** Rules and file map: `docs/tickets/24-demo-mode.md`, GDD §3.
- Main menu over the live Site: Continue the saved Company (or Start your Company), Demo Mode and an Era picker. Company setup has Back; the pause menu saves before returning to the main menu. Returning reloads the page to release the previous session's views, listeners and frame callbacks.
- Two prepared saves on the same Seed and JPL place: Era 1/Explorer 1 and Era 2/Telstar 1, with industry, stocked Parts, accepted Contracts and ready designs. Use the Mission Designer immediately. Easy mode, tutorial skipped; ordinary Test Run, Shipping, weather, flight and Anomaly rules still apply.
- `src/game/demo.ts` uses the existing state, placement and design functions. Demo saving uses `leap.demo` through a storage adapter passed to `playSite`; the player's `leap.save` stays separate. Selecting an Era starts afresh. No save migration or new dependencies.
- Tested: 326 tests and production build pass; five focused tests added, including both demo Missions through ordinary Shipping/Launch rules and save isolation. Chromium at 1280×800 and 1024×768: menu/setup Back, prepared designs, Test Runs, edits, Shipping, return/reset and original Advanced Free Play Company continuation. Its player save stayed byte-for-byte unchanged during demos; an empty player slot stayed empty. Both Eras also checked in the production build without development hooks. No application page errors in completed checks. A label/build-bar overlap at 1024×768 was fixed.
- Not tested: touch, real-laptop performance or team playtesting. Software-rendered Chromium loads the demos in seconds. Launcher checks still wait for the final ticket.

**Next:**
1. Resume ticket 22 when the team supplies its Supabase project and access. Its first acceptance criterion is a human prerequisite. Follow the existing panels, `src/strings.ts`, save format and focused Vitest/browser checks; verify recovery on a second browser session, private Free Play cloud saves and all four leaderboards against the real project before marking it built. Ticket 23 depends on 22. Other unblocked tickets: 25 (Sound and music), 26 and 30. Ticket 27 waits for the official Resources (Nov 13).
2. Team: try Demo Mode; play Free Play objectives and Campaign continuation, compare Easy/Advanced and judge the Anomaly difficulty. Older team-test criteria remain in their tickets.

**Open:**
- QA review on `e2ba793` recorded ten fixes in tickets 01, 04, 05 (two), 08, 13, 14, 16, 17 and 31. Reproduction steps and screenshots: `docs/qa/2026-11-11/README.md`. No unrelated fixes were folded into Demo Mode.
- Campaign currently ends after Syncom 3 and continues into Free Play; later Campaign Milestones move the interim endpoint. Free Play uses Falcon 9 Rideshares and the existing Part set. No booster landing or owned rocket yet.
- Era 2 still omits Titanium and tech tree items (ticket 18); Thor-Delta/Delta D staging gap and JPL/LC-26/Wallops coordinates need verification, the 12 m/s wind limit is unverified, and the Syncom photo looks retouched. Era 2 prices are game estimates.
- Existing issues: the Scrub card leaves the clock running; a Spacecraft lost to its rocket still lists Power, Comms and Time as met; no Reputation penalty for a missed deadline; insurance price shown twice; no NASA photo of Vanguard TV3's explosion. Orbits never decay, there is no reset/new Company button for an existing save, and Speed is not saved. The panel Anomaly intro's “Push now!” is a harmless still frame.
- The tutorial overlay/timing still needs attention and a person to time it. Real-laptop performance and most touch flows remain unchecked; panel tap and eclipse buttons exist but have not been touch-tested.
- Launcher checks wait for the final ticket (AGENTS.md). Team: save the organisers' early-start permission in writing and capture the official Resources on Nov 13.

**Suggested skills:** `handoff`; read the audio source notes before ticket 25.

## Log

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
