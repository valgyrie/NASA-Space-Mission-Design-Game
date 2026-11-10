# 15: Upgrades and Assembly Hall

**What to build:** Buildings have levels that raise output or Part quality. The Assembly Hall's level sets the biggest Bus.

**Blocked by:** 05

**Status:** done (2026-11-10)

**From ticket 08:** for now the Spacecraft is assembled on the Shipping truck at a loading dock beside the first Warehouse (`src/world/shippingView.ts`, dock chosen in `src/world/shippingRoute.ts`, start tile set in `src/playSite.ts`). Once the Assembly Hall exists, the dock should go beside it.

- [x] Each building shows its level and the next Upgrade's cost and time
- [x] Upgrades take days and cost money
- [x] Higher-level Factories make better Parts (lighter or more efficient)
- [x] Bus size is limited by the Assembly Hall level

**As built:** GDD §5 "Building levels (ticket 15)", "Marks" and "Assembly Hall". Decided with the team: the hall starts on the Site, each Part keeps its Mark, buildings keep working while upgraded.

**For later tickets:**
- `src/game/upgrades.ts`: `nextUpgrade`, `startUpgrade`, `maxLevel`, the hall's `hallLevel`/`hallTakes`. Numbers: `UPGRADE`, `MAX_LEVEL`, `LEVEL_OUTPUT_STEP`, `BUS_HALL_LEVEL`, `MARK_STEP`, `ASSEMBLY_HALL_COST` in balance.ts. `advanceDays` finishes Upgrades.
- Every building has `level` and `upgradeDay` (`Levels` in siteState.ts); `allBuildings(state)` lists them all, the hall included. A new building kind (Ground Station, HQ) needs a case in `allBuildings`, `buildingAt`, the panel's `levelBody` and `World.addBuilding`.
- Marks: `state.parts` is the total; `state.betterParts[part]` counts Mk 2, Mk 3 (the rest are Mk 1). Change stock only through `addPart`/`takePart`. A design's `marksFor(state, design)`, a Mission's `marks`, and `statsOf`/`spacecraftMass`/`powerOf` take them. `FlightPlan.marks` is optional (all Mk 1).
- Ticket 18: a Large Bus goes in `BUS_HALL_LEVEL` at 3 and `MAX_LEVEL.assemblyHall` goes to 3. The HQ can reuse `nextUpgrade`.
- The hall is placed by `placeAssemblyHall` when the Site is first shown; until then `hallLevel` counts it as level 1. Save v12.
- Not done: the Market panel still shows only totals per Part (the Mission Designer and Factory panel show Marks); no sound or toast when an Upgrade finishes.
