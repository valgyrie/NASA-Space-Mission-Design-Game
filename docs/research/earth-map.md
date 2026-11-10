# Earth map (the globe seen from space)

The Earth in the Mission Designer, the 3D Launch and the Space view uses real geography. Researched 2026-11-09.

## Source

[Natural Earth](https://www.naturalearthdata.com/) 1:110m vectors, **public domain** ("No permission is needed to use Natural Earth", [terms of use](https://www.naturalearthdata.com/about/terms-of-use/)). Files taken from [nvkelso/natural-earth-vector](https://github.com/nvkelso/natural-earth-vector/tree/master/geojson):

| File | Used for |
|---|---|
| `ne_110m_land.geojson` | Land and sea |
| `ne_110m_glaciated_areas.geojson` | Ice (Greenland, Antarctica and other ice caps) |
| `ne_110m_geography_regions_polys.geojson` | Deserts (Sahara, Gobi, Arabian Peninsula, Australia's Western Plateau), rainforest basins (Amazon, Congo, Malay Archipelago), mountain ranges and the Plateau of Tibet, tundra (Canadian Shield), plains (Great Plains, Kazakh Steppe, North China Plain, Northern European Plain) |

`scripts/build_earth_map.py` turns these into a 1° grid (`src/world/earthMap.ts`, about 8 KB run-length coded). Land not inside a named region is coloured by latitude: tropical forest within 12° of the equator, temperate forest, boreal forest from 50°N, tundra from 64°, and ice south of 62°S. That is a game simplification, not a vegetation map. Clouds are decoration, thicker near the equator and the storm belts around 50°.

## Drawing it smooth (2026-11-10)

The grid is only 1° per cell (about 111 km at the equator), so drawing its cells as they are gives blocks and stair-step coasts. The game keeps the same data and smooths it when it draws: every pixel of the globe's picture blends the nine cells around it, and the coastline is cut where that blend is half land. Islands of one or two cells are kept. So coasts are rounded, not more accurate: the real detail is still 1°. No new data source.

## Size

Earth's mean radius is 6,371 km. From altitude *h*, Earth's disc has an angular radius of asin(6371 / (6371 + *h*)).

| Altitude | Disc across | Note |
|---|---|---|
| 358 km | ~141° | Explorer 1's lowest point (perigee) |
| 2,550 km | ~91° | Explorer 1's highest point (apogee) |
| 13,000 km | ~38° | What the Mission Designer shows, so whole continents fit in the view |

Explorer 1 orbit: "a perigee of 358 km (222 mi) and an apogee of 2,550 km (1,580 mi) having a period of 114.80 minutes, and an inclination of 33.24°" ([Wikipedia: Explorer 1](https://en.wikipedia.org/wiki/Explorer_1), checked 2026-11-09).

## Not used (yet)

NASA's Blue Marble imagery ([Visible Earth](https://visibleearth.nasa.gov/collection/1484/blue-marble)) would give true colours, but its server refused connections from the build container. Ticket 27 could swap it in and credit NASA.
