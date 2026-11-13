# 48: CubeSat sizes _(Later)_

**What to build:** In Free Play, the Bus choices become real CubeSat sizes: 1U, 3U and 6U, with their real sizes and mass limits. Needs a rebalance of Parts, Rideshare prices and Contracts.

**Blocked by:** 20, 21

**Status:** not started (approved 2026-11-13, Later)

- [ ] Free Play Bus options: 1U, 3U, 6U, each with its size and mass limit and a one-line explanation ("1U: a 10 cm cube")
- [ ] Parts fit by volume or slots per size (game rule), so a 1U can't carry a big camera
- [ ] Rideshare cost, Contracts and the Weekly Challenge rebalanced and tested; the Campaign keeps its historical Buses
- [ ] Learn more → CubeSat 101; research note updated with sizes and sources
- [ ] Text in `src/strings.ts`; tests; browser check of a 1U and a 6U Free Play Mission

**Facts:** CubeSat 101 §1.1 (p. 4): "A 1U CubeSat is a 10 cm cube with a mass of approximately 1 to 1.33 kg"; 1U standard 10 × 10 × 11 cm; 3U standard 10 × 10 × 34 cm; larger sizes include 1.5U, 2U, 3U, 6U and 12U. The 6U's size and mass limit are not in the guide's text _(verify from the CubeSat Design Specification)_.

**In the code (read-only pointers):** Bus options and `carriedMass` in `src/game/spacecraft.ts`; Assembly Hall Bus limits (ticket 15) in `src/game/upgrades.ts`; Rideshare price per kg in `src/game/launchVehicles.ts`; Free Play Contracts `src/game/contracts.ts`; Weekly rules `src/game/weekly.ts`.

**Sources:** CubeSat 101 (October 2017) <https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf>.

**Open points:** keep "Small / Medium / Large Bus" in Easy mode and show CubeSat sizes only in Advanced?
