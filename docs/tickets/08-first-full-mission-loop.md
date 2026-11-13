# 08: First full Mission loop

**What to build:** The whole game loop works end to end in a rough form: pick a Launch Vehicle, ship to the spaceport, pay the Rideshare, Launch, and read a Mission Report that explains why it worked or failed.

**Blocked by:** 07

**Status:** done

**From ticket 07:** `src/game/spacecraft.ts` already has `spacecraftMass`, `partsNeeded` (take these from the Warehouse when shipping), `checkDesign` (its `problems` are the "because" reasons) and `missionGoal`. `src/game/launchVehicles.ts` has Juno I's lift; add price and choice there. The Time bar counts assembly days from the Bus (`OPTION_STATS`), but nothing waits for them yet.

- [x] Juno I is selectable with its real capacity; over-mass designs are blocked with an explanation
- [x] Shipping to Cape Canaveral costs money and days
- [x] Rideshare cost is priced per kg
- [x] Launch produces a result from the design (no animation needed yet)
- [x] Mission Report states the outcome and at least one "because" reason tied to the design
- [x] Completing Explorer 1 pays the Contract reward

**Added after review (2026-11-09):** the player can watch the Shipping and see the dates to come.

- [x] The Spacecraft is assembled on a truck at a loading dock on the Site, then the truck drives off with it in a crate
- [x] Follow the truck with the camera
- [x] Mission tracker: where the Spacecraft is now, each stage with its dates, the deadline, and Launch once it has arrived
- Watching the Launch itself is ticket 10.

**QA (2026-11-11):**

- [x] Keep buildings off the occupied Shipping dock. While a Spacecraft is being assembled on the truck, place a Warehouse on the loading dock. The marker is green, money is spent, and the Warehouse appears through the truck and crane. After reload the Warehouse stays and the dock moves elsewhere. Checked on Seed **K7QXM2**, Historic start.

![A Warehouse overlaps the Shipping truck and crane](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/2026-11-11/warehouse-on-shipping-dock.png)

**Rechecked (2026-11-12):** still reproduces on `4661008`. Current screenshots: [1](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-08-occupied-shipping-dock-green-marker.png), [2](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-08-warehouse-on-shipping-dock.png).

**Solved (2026-11-13):** while a Spacecraft is assembled or shipped, a building that would cover the dock shows a red marker and is refused ("The Shipping truck is loading here."). No money is spent, and the dock stays at (48, 36) after reload. Rechecked on K7QXM2.
