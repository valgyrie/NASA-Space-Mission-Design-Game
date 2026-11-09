# Orbits (Space view)

Numbers the Space view uses to place and move Spacecraft. Researched 2026-11-09.

| Fact | Value | Source |
|---|---|---|
| Earth's gravity parameter GM | 0.39860 × 10⁶ km³/s² (game: 398,600) | [NASA Earth Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) |
| Earth's volumetric mean radius | 6,371.000 km | NASA Earth Fact Sheet |
| Earth's sidereal rotation period | 23.9345 h (game: 1,436 min) | NASA Earth Fact Sheet |
| Explorer 1's orbit | perigee 358 km, apogee 2,550 km, period 114.80 min, inclination 33.24° | [Wikipedia: Explorer 1](https://en.wikipedia.org/wiki/Explorer_1) |

**Check:** Kepler's third law, T = 2π √(a³ / GM) with a = 6,371 + (358 + 2,550) / 2 = 7,825 km, gives 114.8 minutes, the same as Explorer 1's real period (tested in `src/game/space.test.ts`).

**Game notes**
- Size, shape and tilt (inclination) of each orbit are real. Which way the orbit faces (its node) and where the Spacecraft starts on it are chosen for looks.
- Spacecraft models are drawn far larger than life (a real 2 m Spacecraft would be invisible next to Earth).
- Time runs 300× faster than real, and Earth turns at that same pace (one turn per sidereal day).
