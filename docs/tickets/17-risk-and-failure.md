# 17: Risk and failure

**What to build:** Launch Insurance, retryable Milestones with real failure stories, and a one-time startup grant so new players can't go bankrupt.

**Blocked by:** 08

**Status:** built, waiting for a team test

**From ticket 08:** `launch()` in `src/game/mission.ts` has no luck yet: the result follows from the design alone. A failed Mission keeps the Contract open until its deadline; nothing happens when the deadline passes. Launch Insurance belongs in the Launch planner's Costs card.

**From ticket 09:** the flight is now worked out in `src/game/flight.ts`. `realFlight` (used by `launch`) draws a small Part spread from the Seed and Launch day; `testRun` flies 200 such runs and gives `successPercent`, which the insurance price can use (`testRunFor` in `mission.ts` takes the planner's state). Launch Vehicle failures (Juno I's real record) are not in it yet: add them to both, so the Test Run's estimate stays honest.

- [x] Insurance price depends on estimated success; payout on failure; explained in one line
- [x] Failed Milestones can be retried
- [x] A real failure story (Vanguard TV3) is shown after a first failure
- [x] A one-time startup grant appears when money gets dangerously low

**Built (2026-11-10):** also Launch Vehicle failures (Juno I 80%, Thor-Able 85%, real records shown; the first Launch always works) in the real flight and the Test Run, and the coast effect in the Launch show. Rules: GDD §5 (grant), §6 (retry, failure story), §8 (failures, insurance).
