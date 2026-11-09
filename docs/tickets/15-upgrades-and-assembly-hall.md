# 15: Upgrades and Assembly Hall

**What to build:** Buildings have levels that raise output or Part quality. The Assembly Hall's level sets the biggest Bus.

**Blocked by:** 05

**Status:** ready-for-agent

**From ticket 08:** for now the Spacecraft is assembled on the Shipping truck at a loading dock beside the first Warehouse (`src/world/shippingView.ts`, dock chosen in `src/world/shippingRoute.ts`, start tile set in `src/playSite.ts`). Once the Assembly Hall exists, the dock should go beside it.

- [ ] Each building shows its level and the next Upgrade's cost and time
- [ ] Upgrades take days and cost money
- [ ] Higher-level Factories make better Parts (lighter or more efficient)
- [ ] Bus size is limited by the Assembly Hall level
