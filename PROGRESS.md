# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–26 and 31 built; 12, 13, 16–23, 25 and 26 still await team playtests/listening/visual review. Local launchers are merged. This session built ticket 26 on `codex/ticket-26-look-and-feel` from freshly pulled `main` (`8d9719c`, including ticket 25).

**Just finished: ticket 26, Look and feel pass.** Details and file map: `docs/tickets/26-look-and-feel.md` and GDD §13.
- Kept and visually checked the existing low-poly models, shared palette, Company branding and 3 × 3 buildings at whole-Site, isometric and low angles. The Launch ground now curves with Earth's existing mean radius; all five rockets keep their stages and timeline.
- Added the original LEAP title screen, then the main menu over the saved Company's live buildings (Era 2 demo Site without a save). Menu animation does not advance the Company or write its save, and respects reduced motion. Starting play shows a rendered Site shot and one gameplay tip with no minimum reading time.
- Shared Learn more → links cover real missions, rockets, Launch Sites, orbits, climate and map data beside the existing UI. Generated Contracts are not presented as historical missions. Reading URLs return HTTP 200; game estimates are labelled. Dark/blue panels remain, with clearer muted text, keyboard focus, scrolling dialogs and an opaque Mission Designer text background. The bounded, wrapping top bar fixes the existing Research/Home overlap.
- Tested: 342 tests (two focused source tests added), client/backend type checks and production build pass. Chromium at 1280×800 and 1024×768 covers title/setup/Back, Demo picker/Esc, Test Run, Shipping, menu return, Continue, loading capture and save isolation. Render fixtures cover every building kind and five rockets from pad to orbit. Production Continue → Launch → skip → Mission Report → Space view passes with reading links and no page errors. A 700×600 menu check covers keyboard and reduced motion. No dependencies, save migration or backend changes. Launcher checks remain deferred; team visual review, real-device performance, touch, Safari and Firefox remain unchecked.

**Next:**
1. Ticket 27 waits for the official Resources (Nov 13); capture those and adapt the data/credits plan. Optional ticket 30 is also unblocked. Submission ticket 28 follows 27.
2. Team: visually review the title/menu, buildings at different tilts, rocket climb and source links. Listen to ticket 25 on speakers/headphones. Earlier team-test criteria remain in their tickets.

**Open:**
- QA review on `e2ba793` recorded ten fixes in tickets 01, 04, 05 (two), 08, 13, 14, 16, 17 and 31. Reproduction steps and screenshots: `docs/qa/2026-11-11/README.md`. Ticket 26 fixes the Research-bar overlap; the other nine remain open.
- Campaign currently ends after Syncom 3 and continues into Free Play; later Campaign Milestones move the interim endpoint. Free Play uses Falcon 9 Rideshares and the existing Part set. No booster landing or owned rocket yet.
- Era 2 still omits Titanium and tech tree items (ticket 18); Thor-Delta/Delta D staging gap and JPL/LC-26/Wallops coordinates need verification, the 12 m/s wind limit is unverified, and the Syncom photo looks retouched. Era 2 prices are game estimates.
- Existing issues: the Scrub card leaves the clock running; a Spacecraft lost to its rocket still lists Power, Comms and Time as met; no Reputation penalty for a missed deadline; insurance price shown twice; no NASA photo of Vanguard TV3's explosion. Orbits never decay and Speed is not saved. The panel Anomaly intro's “Push now!” is a harmless still frame.
- The tutorial overlay/timing still needs attention and a person to time it. Real-laptop performance and most touch flows remain unchecked; panel tap and eclipse buttons exist but have not been touch-tested.
- Launcher checks wait for the final ticket (AGENTS.md). Team: save the organisers' early-start permission in writing and capture the official Resources on Nov 13.

**Suggested skills:** `handoff`; `research` when the official Resources arrive.

## Log

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
- 2026-11-10: Ticket 16 built: globe start picker, NASA POWER 2025 climate shapes the Site, Wallops Island as a second Launch Site with less lift, Shipping by distance, real launch weather Scrubs, Launch Window advisor, save v13.
- 2026-11-10: Buildings now take 3 × 3 tiles (visible from the whole-Site view, Site still 64 × 64, older saves refitted); Earth from space is a smooth globe with rounded coasts.
