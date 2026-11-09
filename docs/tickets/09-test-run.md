# 09: Test Run

**What to build:** A free 2D Test Run shows the orbit, battery and Data graphs, predicted problems and an estimated success %. The simulation is deterministic and covered by tests.

**Blocked by:** 08

**Status:** done

**From ticket 08:** `src/game/mission.ts` has `flightFindings` (the flight worked out from the design, deterministic) and `planLaunch`. The Test Run can reuse `powerOf` and `dataOf` from `spacecraft.ts` for its graphs. A good place for the button: the Launch planner (`src/ui/launchPlanner.ts`).

- [x] Test Run is free and can be repeated
- [x] Top-down orbit view with battery and Data graphs over time
- [x] Predicted problems are listed in plain words
- [x] Estimated success % comes from many quick runs
- [x] Same design and Seed always give the same result
- [x] Tests cover the simulation's key outcomes
