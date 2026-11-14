# 40: Ground Tests

**What to build:** Three optional Ground Tests before Shipping. Each costs days and money and lowers the chance of one Anomaly. The player trades Time and Budget against risk.

| Ground Test | What it shows (CubeSat 101) | Lowers the chance of |
|---|---|---|
| Vibration test | the Spacecraft survives the shaking of launch (§6.9.2) | Stuck solar panel |
| Thermal vacuum test | the Spacecraft works hot, cold and in vacuum (§6.9.3) | Survive the eclipse |
| Day in the Life test | the electronics and flight software work as expected after release: timers, first transmission (§6.9.1) | Point the antenna |

**Blocked by:** 12, 33

**Status:** built 2026-11-14; waits for a team test (the numbers are first guesses to tune). Results under **Built**.

- [x] The Launch planner (or the Design Review from ticket 33) offers the three Ground Tests with their days, cost and effect, each with a tick box
- [x] Ticked tests add their days to assembly (the Time bar and Mission tracker show it) and their cost to the Costs card
- [x] Each test lowers its Anomaly's chance; the planner shows the chance before and after
- [x] The Mission Report's Anomaly section says whether the matching test was done ("Vibration tested: the chance was lower")
- [x] Days, cost and effect are game estimates in `src/game/balance.ts`, clearly labelled
- [x] A test only shows when its Anomaly can strike this design (e.g. no vibration test for a design without Solar Cells)
- [x] One line each with Learn more → CubeSat 101; glossary term **Ground Test** used exactly (not "Test Run", which is the free simulation)
- [x] Tests for the chance change and the added days and cost; save version bump if the choice is stored on the Mission; browser check with TIROS-1

**In the code (read-only pointers):** Anomaly chances in `src/game/anomalies.ts` (`antennaChance`, `panelChance`, `eclipseChance`, `rollAnomaly`, `isMandatory`); numbers in `src/game/balance.ts`; Shipping and timeline in `src/game/mission.ts` (`shipMission`, `missionTimeline`); planner `src/ui/launchPlanner.ts`; report `anomalyLines` in `src/ui/missionReport.ts`; the Weekly Challenge's no-Anomaly rule in `src/game/weekly.ts`.

**Sources:** CubeSat 101 (October 2017): §6.9.1 Day In The Life testing (p. 59), §6.9.2 Dynamic Environment Testing, vibration and shock (pp. 60–61), §6.9.3 Thermal Vacuum Bakeout Testing (p. 62); §2.11 hardware fabrication and testing (p. 23); the burn-wire advice (p. 16: fishing line "comes loose during vibration testing or ascent"). Design and Develop Science Missions, "Build & Verify" (slides 10 and 22). Notes: `docs/research/official-resources.md`.

**Honest mapping note:** CubeSat 101's thermal vacuum *bakeout* is mainly there to let materials outgas before launch; its thermal vacuum *cycling* (p. 62) "can help screen for problems caused by the thermal cycling on orbit". The game's thermal vacuum test stands for the cycling kind. Say so in the Learn more line or the research note.

**In the repo for this ticket:** [`docs/research/sources/cubesat-101.txt`](../research/sources/cubesat-101.txt), [`docs/research/sources/design-and-develop-science-missions.txt`](../research/sources/design-and-develop-science-missions.txt) (source files, read as data; index in [`sources/README.md`](../research/sources/README.md)). Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md).

**Open points:**
- **Weekly Challenge:** it has no Anomaly mini-games, so Ground Tests would only cost. Hide them there, or let them raise the Weekly score's Reliability.
- **First-flight rule:** each Anomaly kind is mandatory the first time, and the Company's first flight always meets Point the antenna. Decide whether a Ground Test can prevent that first one (probably not: the tutorial needs it) and say so in the planner.
- Starting numbers (game estimates, to tune): days comparable to a few days of assembly, cost a small share of the Rideshare, chance cut by about half.

## Built (2026-11-14)

- **Where:** a Ground Tests card in the Launch planner's Space segment. Each test has a tick box, its days and price, "Anomaly: before% → after%", one line on what it does and Learn more → CubeSat 101 at its page (59, 60, 62). Vibration and thermal vacuum only show with Solar Cells; a line says so otherwise.
- **Days and money:** ticked tests add their days after assembly (planner Space rows, the Mission Designer's Time bar and the Design Review's time line, the Mission tracker's "Assembly and Ground Tests" stage) and their price to the Costs card, the total and the Budget bar. Launch Insurance's payout stays on the Rideshare and Shipping only.
- **Numbers (game estimates, `GROUND_TESTS` and `GROUND_TEST_CHANCE_LEFT` in `balance.ts`):** Day in the Life 3 days, $15,000; vibration 5 days, $25,000; thermal vacuum 7 days, $35,000; each halves its Anomaly's chance. For scale: assembly takes 30–60 days and Explorer 1's Rideshare about $460,000.
- **Report:** a third line under the Anomaly: "Vibration test done: the chance was lower (18% instead of 35%)", or "No vibration test before Shipping. With one, the chance would have been 18%." Reports from before this ticket show no such line.
- **Save:** still v19. The choice is optional fields (`groundTests` on the state and on the Mission, `tested` on the Anomaly), as ticket 33 did with `testedDesigns`, so the deployed `leap-online` validator keeps reading cloud saves. Older saves load with no tests.
- **Open points decided:** the Weekly Challenge has no Launch planner and no Anomalies, so Ground Tests do not appear there (nothing to hide). The Company's first flight still meets Point the antenna, tested or not; the planner says so on the first flight and the report says it too.
- **Honest mapping:** CubeSat 101's thermal vacuum *bakeout* is mainly for outgassing; the game's thermal vacuum test stands for thermal vacuum *cycling* (p. 62). Noted in `docs/research/official-resources.md`; the in-game line describes the hot-and-cold cycling.
- **Checks:** 435 game tests and both type checks pass. Browser (TIROS-1 fixture: Era 1 Demo with Explorer 1 done and TIROS-1 accepted, set through the dev page) at 1280×800 and 1024×768: planner card, costs and days, Shipping with two tests, a real flight with Stuck solar panel and the report line. No page errors. Screenshots `ticket-40-*`.
- **For the team:** are the days, prices and the halving fun? Should a test also show on a Mission Report with no Anomaly?
