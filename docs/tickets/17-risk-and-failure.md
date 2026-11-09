# 17: Risk and failure

**What to build:** Launch Insurance, retryable Milestones with real failure stories, and a one-time startup grant so new players can't go bankrupt.

**Blocked by:** 08

**Status:** ready-for-agent

**From ticket 08:** `launch()` in `src/game/mission.ts` has no luck yet: the result follows from the design alone. A failed Mission keeps the Contract open until its deadline; nothing happens when the deadline passes. Launch Insurance belongs in the Launch planner's Costs card.

- [ ] Insurance price depends on estimated success; payout on failure; explained in one line
- [ ] Failed Milestones can be retried
- [ ] A real failure story (Vanguard TV3) is shown after a first failure
- [ ] A one-time startup grant appears when money gets dangerously low
