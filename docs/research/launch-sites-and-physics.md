# Launch sites, weather and physics

Researched 2026-11-07.

## Why latitude and coast matter

- **Equator boost:** Earth's surface at the equator moves east at about **465 m/s (1,670 km/h)**. Launching east gets this speed free, so rockets need less fuel or carry more. The boost shrinks toward the poles.[^lat]
- **Coast:** launching over the ocean means a failed rocket falls into water, not on towns. NASA moved big launches from White Sands, New Mexico, to the coast for this reason.[^coast]
- **Orbit tilt:** a launch site can't directly reach orbits tilted less than its own latitude (e.g. Vanguard 1, launched from Cape Canaveral, has a 34.25° orbit).[^v1]

## Real spaceports in the game

| Spaceport | Latitude | Used for (real) | Source |
|---|---|---|---|
| Cape Canaveral / Kennedy, Florida | ~28.5° N _(verify)_ | Explorer 1, TIROS-1, Telstar, Syncom 3, Apollo, Hubble, LRO, Falcon 9, Artemis | [Milestones](milestones.md) |
| Vandenberg, California | ~34.7° N _(verify)_ | Landsat 1 (polar orbits) | [Wikipedia: Landsat 1](https://en.wikipedia.org/wiki/Landsat_1) |
| Wallops Island, Virginia | ~37.9° N _(verify)_ | Small rockets | _(verify)_ |

## Launch weather (Scrubs)

- NASA's current rules are **NASA-STD-4010A, Lightning Launch Commit Criteria**. They exist because **Apollo 12 was struck by lightning at launch** (it recovered) and **Atlas-Centaur 67 was destroyed** by triggered lightning. The FAA uses the same rules for commercial launches.[^llcc]
- Typical rules: no launch within about 10 nautical miles of active lightning, or through thick clouds that extend into freezing temperatures. Wind limits depend on the rocket (one Falcon 9 list: sustained wind over 35 mph at pad height).[^wx]
- Florida's Space Coast is near the area of maximum lightning activity in the US, so Scrubs there are common: a good real trade-off for the game.[^llcc]

## Launch Windows

- **Mars:** Earth and Mars line up for an efficient transfer about every **26 months** (synodic period ~780 days) _(verify: from general knowledge, find a NASA source)_.
- **Moon:** the game uses a simplified "about once a month" window _(verify against a NASA source before writing card text)_.

## Climate data for Sites

- **NASA POWER** daily data, global, 1981–present, ~55 km resolution, no API key. Parameters: `ALLSKY_SFC_SW_DWN` (sunshine), `T2M` (temperature), `WS2M` (wind), `PRECTOTCORR` (rain; check the name in the official list).[^power]

[^lat]: [NASA Goddard: launching with Earth's spin](https://asd.gsfc.nasa.gov/blueshift/?p=8407) · [IFLScience: why rockets launch near the equator](https://www.iflscience.com/why-do-most-rockets-launch-from-close-to-the-equator-74919)
[^coast]: [ABC13: why NASA launches from Florida](https://abc13.com/nasa-cape-canaveral-why-shuttles-where-are-launched-from/1679515/) · [BGR: why NASA launches over water](https://bgr.com/2117342/why-nasa-always-launches-rockets-over-water)
[^v1]: [Wikipedia: Vanguard 1](https://en.wikipedia.org/wiki/Vanguard_1)
[^llcc]: [NASA-STD-4010A (NASA Standards)](https://standards.nasa.gov/standard/NASA/NASA-STD-4010) · [NTRS: Lightning Launch Commit Criteria rationale](https://ntrs.nasa.gov/citations/20170001583)
[^wx]: [ClickOrlando: launch weather rules](https://clickorlando.com/weather/2023/11/09/what-goes-into-forecasting-weather-for-rocket-launches-its-harder-than-you-think) · [Fox Weather: launch forecasting](https://foxweather.com/earth-space/forecasting-for-a-rocket-launch-begins-months-before-liftoff)
[^power]: [NASA POWER llms.txt](https://power.larc.nasa.gov/llms.txt) · [nasapower docs](https://docs.ropensci.org/nasapower/reference/get_power.html)
