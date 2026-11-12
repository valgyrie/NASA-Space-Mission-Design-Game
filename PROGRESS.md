# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–21, 24, 25 and 31 built; 12, 13, 16–21 and 25 still await team playtests. Ticket 22 is still blocked: on freshly pulled `main` (`b784dc4`) there is still no Supabase project, configuration or connected integration. Launcher checks wait for the final ticket.

**Just finished: ticket 25, Sound and music.** Rules, file map and test notes: `docs/tickets/25-sound-and-music.md`; mastering, loop cuts and credits: `docs/audio/README.md`.
- Code-made effects (Web Audio): button clicks, building placed or refused, countdown beeps, liftoff roar, staging thumps, alarms (lost rocket, Anomaly), reward chime (Anomaly won, startup grant). No effect files.
- Music per screen with 1.2 s crossfades; looping tracks crossfade 3 s into their next play, the Site alternates its two calm tracks, the next track preloads 20 s ahead. One-shots play once. Sound starts on the first click or key.
- Music and Sound effects sliders in the pause menu and main menu, kept in `localStorage` `leap.volume` (not the save; no migration).
- Music remastered with `scripts/master_music.sh`: loops cut before fades, −16 LUFS, peaks ≤ −1.4 dB, 128 kbps; 26 MB → 15 MB.
- Tested: 342 tests and production build pass (16 new). Chromium checks of every music scene, loop crossfades, release of old tracks, saved volume and per-screen loading in the production build; no page errors. Nobody has listened yet: effects were counted, not heard.

**Next:**
1. Team: listen to ticket 25 (balance of effects against music, loop seams, whether returning to a screen should resume rather than restart its track). Tune in `src/audio/sfx.ts`, `tracks.ts` (fades) or `settings.ts` (defaults: music 60%, effects 80%).
2. Resume ticket 22 when the team supplies its Supabase project and access (first criterion is a human prerequisite; see the ticket). Ticket 23 depends on 22. Other unblocked tickets: 26 (Look and feel) and 30. Ticket 27 waits for the official Resources (Nov 13).
3. Team: earlier playtests (Demo Mode, Free Play, Easy/Advanced, Anomaly difficulty); criteria are in each ticket.

**Open:**
- Audio: no sound before the first gesture (browser rule), so the menu theme starts on the first click. Touch, Safari and Firefox untested. Google's terms for Lyria music still need checking before release (`docs/audio/README.md`).
- QA review on `e2ba793` recorded ten fixes in tickets 01, 04, 05 (two), 08, 13, 14, 16, 17 and 31: `docs/qa/2026-11-11/README.md`.
- Campaign ends after Syncom 3 and continues into Free Play; Free Play uses Falcon 9 Rideshares and the existing Part set.
- Era 2 still omits Titanium and tech tree items (ticket 18); Thor-Delta/Delta D staging gap, JPL/LC-26/Wallops coordinates and the 12 m/s wind limit need verification; Era 2 prices are game estimates.
- Existing issues: the Scrub card leaves the clock running; a Spacecraft lost to its rocket still lists Power, Comms and Time as met; no Reputation penalty for a missed deadline; insurance price shown twice; orbits never decay; no reset/new Company button; Speed is not saved.
- Tutorial timing needs a person; real-laptop performance and most touch flows remain unchecked.
- Team: save the organisers' early-start permission in writing and capture the official Resources on Nov 13.

**Suggested skills:** `handoff`; `grill-with-docs` before ticket 26's look-and-feel choices.

## Log

- 2026-11-12: Ticket 25 built from freshly pulled main (`b784dc4`): code-made effects, music per screen with looping crossfades, volume sliders, music remastered (15 MB). 342 tests, build and browser checks pass; ticket 22 still blocked on Supabase.
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
