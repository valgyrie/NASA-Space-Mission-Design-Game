# 05: Factories and Market

**What to build:** Factories turn Raw Materials into Parts, the Warehouse stores them, and the Market buys and sells at worse prices than making them yourself.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Metal Works, Electronics Lab, Solar Fab and Battery Plant can be built
- [ ] Each Factory turns its inputs into its Parts over time
- [ ] Warehouse capacity limits storage and is shown
- [ ] Market buys Raw Materials and Parts above making cost and sells below it
- [ ] Chains are never longer than Mine → Factory → Part
- [ ] Each Factory and the Warehouse has a detailed low-poly model at the Mine's level (`src/world/mineMesh.ts`): a building you can recognise (Metal Works: furnace and chimney; Electronics Lab: clean white lab with antenna; Solar Fab: panels on the roof; Battery Plant: tanks and pipes), small details (doors, windows, lamps), at least one moving part while it works (via `World.animateBuildings`), and something in the colour of what it makes
- [ ] Buildings look right both from the isometric start view and tilted low toward the horizon
