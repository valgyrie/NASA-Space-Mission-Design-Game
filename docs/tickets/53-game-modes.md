# 53: Explorer and Mission Director

**What to build:** two game modes on one rule set. **Explorer** for young players (pictures and plain words instead of numbers, a shorter Launch planner, gentler failure) and **Mission Director** for players who want realism (real numbers, expiring Offers, paid testing, Deposits that run out). Asked for by the team on 15 Nov 2026 (`plans.txt`), with changes agreed after review.

**Blocked by:** 20

**Status:** built, waiting for a team test. Branch `game-modes`; not merged into `main`.

- [x] Mode names and setup lines; one choice at Company setup (ids stay `easy` / `advanced`)
- [x] Explorer: bars with icons and words, no units; ghost preview of each Part's effect
- [x] Explorer: short texts for the most-seen cards (`<key>.short`)
- [x] Explorer: four-step Launch planner with a tick/cross checklist; no Insurance, no Ground Tests
- [x] Explorer: Test Run and Mission Report without numbers
- [x] Explorer: bigger, colour-blind-safe UI by CSS (`body.mode-explorer`)
- [x] Explorer: NASA pages for young readers instead of papers and slides
- [x] Explorer: refund once per Contract after a failed Mission; faster Mines and Shipping
- [x] Mission Director: Offers expire after 60 days; first Test Run free, repeats paid; Ground Tests ×3 money, ×2 days
- [x] Mission Director: Deposits run out, with a bar on the Mine
- [x] Safety valve: the grant can come again; some Contract is always open; test for recovery when broke
- [x] Switch an Explorer Company to Mission Director, one way; save v21 with migration
- [ ] Optional: budget overruns, schedule slips, penalties for failed or late Contracts, harder Anomalies

**As built (15 Nov 2026):**
- **Names:** "Explorer" ("Great for ages 10 and up. Pictures and plain words instead of numbers.") and "Mission Director" ("Real numbers and a real budget, with every Part and planning step."), in `strings.ts` (`mode.*`). `isExplorer` / `isDirector` / `switchToDirector` in `src/game/modes.ts`; `setDisplayMode` puts `mode-explorer` or `mode-director` on `<body>` (`src/ui/displayMode.ts`).
- **Explorer display:** `src/game/explorer.ts` (what-if bars for the ghost preview, option levels, day phase, chance words, checklist); `src/ui/plannerSteps.ts` (Explorer: vehicle, site, costs, review shown as Rocket, Launch Site, Weather, Launch; Mission Director: all seven). `textFor` / `tm` pick a `.short` string in Explorer. Short texts so far: slot "why" folds, planner steps and hints, Segments intro, report "not flown", tutorial end, Explorer 1 history cards, Era 1, four loading tips, weather and advice lines. The JPL maturity strip is hidden in Explorer to keep fewer panels open (one CSS line; the team may want it back).
- **Kids' links:** `KIDS_LINKS` and `kidsLinkFor` in `src/game/sources.ts`; `learnMore`/`setLinkTarget` swap or hide links when the mode changes, and hide repeats among siblings. Every URL checked live on 15 Nov 2026: `docs/research/kids-links.md`.
- **Rules (game estimates in `balance.ts`):** `OFFER_DAYS` 60; `TEST_RUN_FEE` 2% of the reward, $10K minimum (`src/game/testRunFee.ts`, last 40 designs remembered); Ground Tests ×3 / ×2 in Mission Director, none in Explorer; `DEPOSIT_KG_PER_TILE` 1,000 (`src/game/deposits.ts`; a level 1 Mine empties a Deposit in about 600 days); `EXPLORER_PACE` Mines ×1.5, Shipping days ×0.5; `GRANT_AGAIN` every 180 days, five per game; in the Campaign between Eras the grant triggers below the HQ Upgrade's cost.
- **Save v21:** new `grants`, `offerDays`, `expiredOffers`, `testRuns`, `depositsUsed`, `refunds`; optional `Mission.launchCost`, `MissionReport.refund`. v20 saves migrate with full Deposits and no history.
- **Also on this branch:** the Online button is greyed out with "Coming soon" (main menu and pause menu); Back and Resume are pinned to the bottom of scrolling menus.

**Tested:** 588 tests and both type checks pass (535 before): planner steps per mode, short-text keys, ghost numbers against `checkDesign`, checklist, no digits in Explorer report lines, expiry, Test Run fee, Ground Test prices, depletion, recovery when broke (Free Play and Campaign), Explorer refund, faster waits, v20 → v21 migration, the switch, Weekly Challenge unaffected, kids' links. Browser (15 Nov): Explorer in Demo Era 1 at 1280×800 and 1024×768 (bars, ghost, four steps, checklist, free Test Run, kids' links, pause menu); Mission Director in a fresh Free Play Company at 1280×800 and 1024×768 (setup lines, Companies list, 60-day Offer countdown, seven steps, "Test Run · free" then "Test Run · $32K", professional links). No console errors on a clean load.

**Not checked in the browser:** a Deposit running out, the grant coming again, the Explorer refund after a real failed Launch, the switch to Mission Director (it reloads to the main menu rather than reopening the Company), the Mission Report and history cards in Explorer, touch screens.

**Left for later:** Anomaly lines, "Like the real one" (kg), Warehouse counts and HUD numbers still show numbers in Explorer; the ghost preview changes the arrow and colour but not the bar's word; the `leap-online` function needs a rebuild and redeploy for save v21 before Online returns; the optional Mission Director extras above.
