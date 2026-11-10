# Real places and launch weather

Researched 2026-11-10 for ticket 16. Built into `src/game/placeData.ts` by `scripts/build_places.py`.

## Climate at the start (NASA POWER)

- **Source:** NASA POWER Monthly and Annual API v2.10 ([power.larc.nasa.gov](https://power.larc.nasa.gov/docs/)), no key needed. The regional endpoint returns one parameter per request for a box up to 10° × 10°, on POWER's native grid (0.5° × 0.625°, from MERRA-2 and CERES SYN1deg). Checked 2026-11-10.
- **Parameters, 2025 annual mean** (the `202513` value):
  - `ALLSKY_SFC_SW_DWN`: sunshine reaching the ground, kWh/m²/day
  - `T2M`: temperature at 2 m, °C
  - `WS2M`: wind at 2 m, m/s
  - `PRECTOTCORR`: rain (precipitation corrected), mm/day
  - The ground height comes with each point (third coordinate), m.
- The game averages the native points into **2° cells** (about 220 km), only where the game's Earth map has land, and keeps 64 steps per value. Fine enough for a Site; not a weather map.
- Example (point request at JPL, 34.20° N, 118.17° W, 2025): 17.7 °C, 1.39 mm/day of rain, 5.52 kWh/m²/day, wind 1.98 m/s, 395 m up.

## Land type

From the game's 1° Earth map (Natural Earth, public domain: see [earth-map.md](earth-map.md)): forest, rainforest, northern forest, tundra, grassland, mountains, desert, ice. "Coast" = sea within 1° of the start.

## US outline

Natural Earth 1:110m admin-0 countries, `ADM0_A3 = USA` (public domain), from [nvkelso/natural-earth-vector](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson). Includes Alaska and Hawaii. At 1:110m small islands may be missing.

## Places

| Place | Lat, lon | Note |
|---|---|---|
| JPL, Pasadena (Historic start) | 34.20° N, 118.17° W _(verify)_ | Built Explorer 1 ([milestones.md](milestones.md)) |
| Cape Canaveral LC-26 | 28.44° N, 80.57° W _(verify)_ | Explorer 1's pad ([Wikipedia: LC-26](https://en.wikipedia.org/wiki/Cape_Canaveral_Launch_Complex_26)) |
| Wallops Island, Virginia | 37.84° N, 75.48° W _(verify)_ | NASA launch range on the Eastern Shore of Virginia, "approximately 100 miles north-northeast of Norfolk" ([Wikipedia: Wallops Flight Facility](https://en.wikipedia.org/wiki/Wallops_Flight_Facility), checked 2026-11-10) |

**Alternate history:** Juno I and Thor-Able only flew from Cape Canaveral. Offering Wallops Island in Era 1 is a game choice (decided by the team 2026-11-10) so the latitude lesson can be played; the planner labels it.

## Earth's spin and lift

- The ground at the equator moves east at about 465 m/s; at latitude φ it is 465 × cos φ ([launch-sites-and-physics.md](launch-sites-and-physics.md)). Cape Canaveral (28.44°): 409 m/s. Wallops Island (37.84°): 367 m/s.
- **Game estimate:** each 10 m/s more than at Cape Canaveral lets a rocket carry 1% more (`SPIN_LIFT_PER_MS`). Wallops: 4.2% less, so Juno I lifts 13.4 kg instead of 14. Real rockets gain less or more depending on their stages; the direction of the effect is real.

## Launch weather (Scrubs)

- **Source:** NASA POWER Daily API, point requests at each Launch Site for 2025: `WS10M_MAX` (strongest hourly wind at 10 m, m/s), `PRECTOTCORR` (rain, mm/day), `T2M_MAX` (top temperature, °C).
- **Game rules** (`LAUNCH_WEATHER` in `balance.ts`), loosely after real ones: wind over **12 m/s** Scrubs (one Falcon 9 list uses sustained wind over 35 mph ≈ 15.6 m/s at pad height; older, smaller rockets were stricter _(verify)_). POWER has no lightning, so a day with **≥ 10 mm of rain and ≥ 24 °C** stands in for thunderstorms, which real Lightning Launch Commit Criteria forbid (NASA-STD-4010A; Apollo 12 was struck at launch): see [launch-sites-and-physics.md](launch-sites-and-physics.md).
- The weather on a Game day is the real 2025 weather on the same date (29 February uses the 28th).

## Shipping by distance

Game estimates (`SHIPPING` in `balance.ts`), set so JPL → Cape Canaveral (about 3,600 km great-circle) stays $25,000 and 7 days as in ticket 08: $5,000 + $5.60/km, rounded to $1,000; 650 km a day, plus a day to load. Straight-line distance; real roads and ships are longer.
