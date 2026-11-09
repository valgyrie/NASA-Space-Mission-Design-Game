# 08: First full Mission loop

**What to build:** The whole game loop works end to end in a rough form: pick a Launch Vehicle, ship to the spaceport, pay the Rideshare, Launch, and read a Mission Report that explains why it worked or failed.

**Blocked by:** 07

**Status:** ready-for-agent

**From ticket 07:** `src/game/spacecraft.ts` already has `spacecraftMass`, `partsNeeded` (take these from the Warehouse when shipping), `checkDesign` (its `problems` are the "because" reasons) and `missionGoal`. `src/game/launchVehicles.ts` has Juno I's lift; add price and choice there. The Time bar counts assembly days from the Bus (`OPTION_STATS`), but nothing waits for them yet.

- [ ] Juno I is selectable with its real capacity; over-mass designs are blocked with an explanation
- [ ] Shipping to Cape Canaveral costs money and days
- [ ] Rideshare cost is priced per kg
- [ ] Launch produces a result from the design (no animation needed yet)
- [ ] Mission Report states the outcome and at least one "because" reason tied to the design
- [ ] Completing Explorer 1 pays the Contract reward
