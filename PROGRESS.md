# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–11 and 31 done and merged; local launchers merged. **Ticket 13 is built** (branch `claude/ticket-12-sltuz3`, merged by PR) and waits only for a person to time the first Launch. The loop: name the Company, the tutorial guide leads through accepting Explorer 1 (its "before" Real History card), a Mine, a Metal Works, the Mission Designer, a Test Run, shipping, the truck and the Launch; Point the antenna; the Mission Report with the first Mission Patch; the "after" card; the History Archive.

**Why ticket 13 and not 12:** ticket 12 is blocked by 14 (Solar Cells are locked until Vanguard 1, so a Stuck solar panel can't happen yet). The user chose to do 13 first. The branch name still says ticket 12.

**Just finished: ticket 13, Tutorial and Real History.** How it plays: GDD §16 "As built (ticket 13)". Code notes: ticket 13's "For later tickets".
- **Domain:** `src/game/tutorial.ts` (`tutorialStep`, 8 steps read from the state, never blocking), `src/game/history.ts` (`HISTORY_CARDS`, `historyCardFor`, `unlockCard`, `awardMission` called by `launch`, `patchFor`). `SiteState.history`, `.patches`, `.tutorial`; **save v10** (a v9 save gets the cards and patches it had already earned).
- **UI:** `src/ui/tutorialGuide.ts` (guide card, glow on `data-tutorial` buttons), `historyCard.ts`, `archive.ts`, `patch.ts` (SVG patch drawn in code); report shows the patch; HUD button "History Archive". Photos: `public/history/` (NASA/MSFC, sources in `docs/research/milestones.md`).
- **Tested** in headless Chromium at 1280×800 and 1024×768: a scripted new player walked all 8 steps and reached the Launch button in 1 min 45 s; before card on accept (pauses, Esc closes); Test Run step advances when it opens; Launch → Anomaly → report with "Your first Mission Patch!" → after card → History Archive shows the patch and both cards, a card reopens from it; reload keeps them; Skip hides the guide for good. No console errors. 192 unit tests pass; build passes.
- Not tested: a person timing it (the ticket's last box), real mouse/touch, Learn more links opening (both URLs fetched fine).

**Next:**
1. Team: play a new game and time the first Launch (ticket 13's open box); judge the guide's wording for a 10-year-old.
2. Ticket 14 (Era 1 complete) is now unblocked; it unblocks 12. Also open: 15, 16, 17, 19, 20, 25, 30.

**Open:**
- The guide shows "Step 1" after the Company name; the Historic start and globe come with ticket 16. GDD §16 step 6 "fix one warning" isn't forced: the guide asks whether the battery lasts 30 days.
- The glow stays on the next button while a dialog covers the guide (harmless).
- Patches don't carry the Company logo yet (ticket 19).
- From before: Anomaly chance fixed (~32%) until Comms Parts differ (14) and Ground Stations (18); one Anomaly per flight; Space view's day count ignores lost days; Explorer 1's coast timing _(verify)_; blocky close-up Earth (26); Game date still during the show; orbits never decay; Era 1 designs are 0% or 100%; no "New game"; Speed not saved.
- Launcher checks wait for the final ticket (see AGENTS.md).
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `handoff`.

## Log

- 2026-11-10: Ticket 13 built: Explorer 1 tutorial guide, Real History cards with NASA photos, Mission Patches, History Archive, save v10 (ticket 12 waits for 14).
- 2026-11-10: Synced the launcher branch with newer main; kept its game, tickets and current handoff.
- 2026-11-10: Deferred further launcher validation to the final ticket; existing game checks stay in place.
- 2026-11-10: Added local launchers with dependency setup, progress, browser opening and reopening; game code and tickets unchanged.
- 2026-11-09: Ticket 11 done: Anomaly framework and Point the antenna (mouse mini-game during the Launch show, first one can't be skipped, chance from the Comms margin, lost Data cuts the pay), save v9.
- 2026-11-09: Ticket 31 (new) done: Space view with every Spacecraft in orbit on its real orbit, click to follow; reports keep their design, save v8. Tickets 10 and 31 merged into `main`.
- 2026-11-09: Ticket 10 done: 3D Launch of Juno I (pad, staging, orbit, Mission days) between Launch and the Mission Report, with speed, skip and a simple view for slow devices.
- 2026-11-09: Ticket 09 done: free Test Run with orbit view, battery and Data graphs, estimated success from 200 seeded runs; the real Launch flies the same model.
- 2026-11-09: Watch the Shipping: Spacecraft assembled on a truck at a dock, truck drives off the Site, Follow the truck, Mission tracker with the dates to come.
- 2026-11-09: Ticket 08 done: Launch planner (Juno I mass check, Rideshare per kg, Shipping to Cape Canaveral), Launch from the HUD, Mission Report with reasons, reward paid, save v7.
- 2026-11-09: Mission Designer globe now shows the real Earth (Natural Earth map, true apparent size from 13,000 km); merged.
- 2026-11-09: Ticket 07 done and merged: Mission Designer with six slots, detailed rotating 3D Spacecraft over Earth, six live bars, Radiation Detector Part, save v6.
- 2026-11-09: Ticket 06 done: Contracts board, Explorer 1 Contract with deadline, save v5.
- 2026-11-08: Checked existing Raw Material sales; added regression tests and a README note, fixed the stock message and pause overlay.
- 2026-11-08: Ticket 05 done: Factories, Warehouse storage by mass, Market, detailed moving models; camera follows ground height.
