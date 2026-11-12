# 20: Easy and Advanced modes

**What to build:** Two difficulty modes with different Part sets and levels of detail.

**Blocked by:** 07

**Status:** built, waiting for a team test

**From ticket 07:** options and their numbers live in `OPTIONS` (`src/game/spacecraft.ts`) and `OPTION_STATS` (`src/game/balance.ts`); a second set per mode can follow the same shape.

- [x] Mode is chosen at new game and shown in settings
- [x] Easy: fewer Parts, rounded numbers
- [x] Advanced: more Parts, numbers closer to the research ranges

**As built:** choose Easy (default) or Advanced at Company setup. The pause menu's Settings shows the choice; it stays fixed for that Company. Easy keeps the original Parts and rounded labels. Advanced includes those Parts plus a Medium Battery (4.2 kg, 420 Wh) and Low-power Antenna (0.8 kg, 0.14 W, 24 kB/day), with up to two decimals and battery Wh/kg in the Mission Designer.

The Medium Battery's 100 Wh/kg sits inside NASA's early mercury-battery range. The radio uses less Power but sends less Data: enough for the Radiation Detector, too little for the TV Camera without Ground Stations. These are game estimates, with their historical basis and limits in `docs/research/spacecraft-parts.md`. Both modes use the existing recipes, Marks, tech tree, six bars and flight rules. No separate simulation or manual placement.

Factories and the Market follow the same Part set. Market rows now respect their hidden flag (the grid style used to override it). Both new Parts have 3D models, and the Medium Battery is recognised by the eclipse Anomaly. Save v17 adds `state.difficulty` and the extra stock keys; earlier saves become Easy and keep their Company, stock, design and Missions.

**Files:** `src/game/modes.ts` holds the two modes and Part filter; `balance.ts` and `spacecraft.ts` keep the recipes, stats and choices. Existing setup, menu, save, Factory/Market availability, Spacecraft model and eclipse code use them. All new player text stays in `src/strings.ts`.

**Tested:** 314 unit tests and the production build pass. Six focused tests added: Part availability and unlocks, design/Shipping/Test Run/flight agreement with Marks, the low-power radio's Data shortfall, old-save migration, Advanced persistence with a shipping Mission, and invalid saved modes. Chromium at 1280×800 and 1024×768: setup and Settings, both Part sets, precise labels and six bars, buying, Test Run, Shipping and reload, Factory lists and selecting the Medium Battery, Market visibility, and v16 migration. A production-build Launch with the two new Parts reached a successful Mission Report. Shipping time and calm weather were set in a saved fixture for that last check. No page errors. The tutorial was skipped because of its existing overlay issue (ticket 13). No new dependencies or test framework; launcher checks still wait for the final ticket. Team playtesting and touch remain unchecked.

**Rechecked (2026-11-12):** Advanced choices, resource bars, Market options and Settings checked again. Team playtesting remains open. [QA report](../qa/2026-11-12/README.md).
