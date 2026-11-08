# 05: Factories and Market

**What to build:** Factories turn Raw Materials into Parts, the Warehouse stores them, and the Market buys and sells at worse prices than making them yourself.

**Blocked by:** 04

**Status:** done

- [x] Metal Works, Electronics Lab, Solar Fab and Battery Plant can be built
- [x] Each Factory turns its inputs into its Parts over time
- [x] Warehouse capacity limits storage and is shown
- [x] Market buys Raw Materials and Parts above making cost and sells below it
- [x] Selling Raw Materials takes 10 kg from stock, adds money and survives reload; less than a full lot leaves stock and money unchanged
- [x] Chains are never longer than Mine → Factory → Part
- [x] Each Factory and the Warehouse has a detailed low-poly model at the Mine's level (`src/world/mineMesh.ts`): a building you can recognise (Metal Works: furnace and chimney; Electronics Lab: clean white lab with antenna; Solar Fab: panels on the roof; Battery Plant: tanks and pipes), small details (doors, windows, lamps), at least one moving part while it works (via `World.animateBuildings`), and something in the colour of what it makes
- [x] Buildings look right both from the isometric start view and tilted low toward the horizon
