# 14: Era 1 complete

**What to build:** TIROS-1 Milestone, solar cells unlocking after Vanguard 1, the Thor-Able rocket, and Research Points spent on the first tech tree items.

**Blocked by:** 13

**Status:** done (2026-11-10)

**From ticket 07:** Solar Cells are already a Mission Designer option, shown locked by `LOCKED` in `src/game/spacecraft.ts`; replace that with the Vanguard 1 unlock. Their 3D panels are built. TIROS-1 needs a TV camera Payload and probably a tape recorder (Basic Computer slot): Explorer 1 had none, Explorer 3 did (`docs/research/spacecraft-parts.md`).

- [x] TIROS-1 Milestone is playable with its Real History cards
- [x] Solar cells unlock with a Vanguard 1 card
- [x] Thor-Able is in the catalogue with its real capacity
- [x] Research Lab turns Data into Research Points
- [x] At least 3 Era 1 Upgrades can be chosen with Research Points

**As built:** GDD §6 "Research (ticket 14)" and "TIROS-1 Milestone", §7 "TIROS-1 numbers", §8 "Thor-Able".

**For later tickets:**
- `src/game/research.ts`: Data from reports (`dataFromReport`), Labs (`runLabs`, run by `advanceDays`), points, `buyTech`. Tech tree numbers in `TECH_TREE` (balance.ts); later Eras add ids to `TECH_IDS` and a `era` filter in the Lab panel (it shows all ids today).
- Upgrades reach Part numbers through `statsOf(option, tech)`; `powerOf`/`dataOf` take the tech list. A `Mission` keeps `tech` from when it shipped, and `FlightPlan` needs it.
- Unlocks: `UNLOCKED_BY` (spacecraft.ts) ties an option to a Real History card; `Contract.after` orders Milestones; `LaunchVehicle.opensAfter` opens vehicles. Side story cards: `when: 'side'` in history.ts, shown after the "after" card.
- Ticket 12 can now use Solar Cells (Stuck solar panel). Ticket 18: HQ Upgrade once `completed` holds explorer1 and tiros1.
- No Computer slot: TIROS-1's tape recorder isn't modelled. `SiteState.vehicle` is the planner's pick; save v11.
