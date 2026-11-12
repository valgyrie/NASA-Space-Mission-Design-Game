# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–25 and 31 built; 12, 13, 16–23 and 25 still await team playtests/listening. Local launchers are merged. This session built ticket 25 on `codex/ticket-25-sound-and-music` from freshly pulled `main` (`87a6b1a`, including tickets 22–24).

**Just finished: ticket 25, Sound and music.** File map, measurements, approved cuts and rebuilding steps: `docs/tickets/25-sound-and-music.md`, `docs/audio/README.md` and GDD §13.
- Web Audio plays the team's ten tracks by screen, restores cues after overlays, alternates Site tracks and schedules 3-second loop overlaps. Synthesized clicks, placement, countdown, liftoff, alarms and rewards use no external samples. Main/pause menus share volume controls and the full audio credit list.
- Audio waits for a gesture, loads by screen and releases other decoded tracks. Hidden tabs suspend; stale or failed loads cannot take over a newer screen. Music/effects mute and levels persist in `leap.audio`, outside Company/Demo/cloud saves. No save migration or new dependencies.
- Prepared audio: 14,732,651 bytes (38.7% smaller), 128 kbps stereo, every file within 0.02 LU of −16 LUFS and below −1 dBTP. Approved source windows and the existing short stingers retained. `scripts/prepare-music.py` reproduces preparation from originals in `87a6b1a`; `docs/audio/levels.json` records final measurements and hashes. Direct measured gain with encoded-result calibration preserved dynamics; a small-LRA loudness pass shifted the quiet intro and was discarded.
- Tested: all 340 tests, client/backend type checks and production build pass; four focused tests added. Chromium at 1280×800 and 1024×768: gesture gating, all cue families/restoration, settings persistence, credits, one-shot completion, actual loop overlap without silence/clipping, background suspension and graceful unsupported/missing-audio behavior. Six effects rendered with OfflineAudioContext. Placement, Launch and Anomaly hooks checked; production success/failure Missions play the correct stingers and history cue. Fixtures advance assembly/Shipping to clear weather; a shortened buffer tests the real loop scheduler without a several-minute wait. No application page errors in completed checks.
- Not checked: team listening on speakers/headphones, Safari/Firefox, touch and real-device performance. Launcher checks remain deferred. Shared weekly rules/backend were unchanged; no backend deployment was needed.

**Next:**
1. Next unblocked ticket: 26 (Look and feel pass). Also unblocked: 30. Ticket 27 waits for the official Resources (Nov 13).
2. Team: listen to the screen changes, Site loops, stingers and effects on speakers/headphones; check mute and volume controls. Try Weekly Challenge in Free Play, compare retries and recover its rewards in another browser; share a Site code and check that its map matches. Try Online on two computers and keep the recovery code private; test Demo Mode, Free Play objectives and Campaign continuation, compare Easy/Advanced and judge the Anomaly difficulty. Older team-test criteria remain in their tickets.

**Open:**
- QA review on `e2ba793` recorded ten fixes in tickets 01, 04, 05 (two), 08, 13, 14, 16, 17 and 31. Reproduction steps and screenshots: `docs/qa/2026-11-11/README.md`. No unrelated fixes were folded into Demo Mode.
- Campaign currently ends after Syncom 3 and continues into Free Play; later Campaign Milestones move the interim endpoint. Free Play uses Falcon 9 Rideshares and the existing Part set. No booster landing or owned rocket yet.
- Era 2 still omits Titanium and tech tree items (ticket 18); Thor-Delta/Delta D staging gap and JPL/LC-26/Wallops coordinates need verification, the 12 m/s wind limit is unverified, and the Syncom photo looks retouched. Era 2 prices are game estimates.
- Existing issues: the Scrub card leaves the clock running; a Spacecraft lost to its rocket still lists Power, Comms and Time as met; no Reputation penalty for a missed deadline; insurance price shown twice; no NASA photo of Vanguard TV3's explosion. Orbits never decay and Speed is not saved. The panel Anomaly intro's “Push now!” is a harmless still frame.
- The tutorial overlay/timing still needs attention and a person to time it. Real-laptop performance and most touch flows remain unchecked; panel tap and eclipse buttons exist but have not been touch-tested.
- Launcher checks wait for the final ticket (AGENTS.md). Team: save the organisers' early-start permission in writing and capture the official Resources on Nov 13.

**Suggested skills:** `handoff`; read the current art/style notes before ticket 26.

## Log

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
- 2026-11-10: Ticket 15 built: building levels and Upgrades, Part Marks (Mk 1–3), Assembly Hall (starts on the Site, sets the biggest Bus), save v12.
