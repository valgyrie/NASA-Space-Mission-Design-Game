# Earth map (Mission Designer globe)

The Earth behind the Spacecraft in the Mission Designer uses real geography. Researched 2026-11-09.

## Source

[Natural Earth](https://www.naturalearthdata.com/) 1:110m vectors, **public domain** ("No permission is needed to use Natural Earth", [terms of use](https://www.naturalearthdata.com/about/terms-of-use/)). Files taken from [nvkelso/natural-earth-vector](https://github.com/nvkelso/natural-earth-vector/tree/master/geojson):

| File | Used for |
|---|---|
| `ne_110m_land.geojson` | Land and sea |
| `ne_110m_glaciated_areas.geojson` | Ice (Greenland, Antarctica and other ice caps) |
| `ne_110m_geography_regions_polys.geojson` | Deserts (Sahara, Gobi, Arabian Peninsula, Australia's Western Plateau), rainforest basins (Amazon, Congo, Malay Archipelago), mountain ranges and the Plateau of Tibet, tundra (Canadian Shield), plains (Great Plains, Kazakh Steppe, North China Plain, Northern European Plain) |

`scripts/build_earth_map.py` turns these into a 1° grid (`src/world/earthMap.ts`, about 8 KB run-length coded). Land not inside a named region is coloured by latitude: tropical forest within 12° of the equator, temperate forest, boreal forest from 50°N, tundra from 64°, and ice south of 62°S. That is a game simplification, not a vegetation map. Clouds are decoration, thicker near the equator and the storm belts around 50°.

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
