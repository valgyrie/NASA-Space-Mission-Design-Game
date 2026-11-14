# Space assets (Earth, stars, Spacecraft)

The Earth photographs come from NASA GIBS (Global Imagery Browse Services) WMTS, EPSG:4326, made by
`scripts/build_earth_textures.py` (runs in Blender's Python). Originals (tiles) in `.leap/art-src/space/tiles/`.
The water mask is drawn from Natural Earth by `scripts/build_earth_water.py` (originals in `.leap/art-src/space/ne/`).
It replaced an OpenStreetMap (ODbL) water map on 14 Nov 2026, so no OpenStreetMap data is shipped and no OSM credit
is needed.
NASA imagery is public domain (not copyrighted in the US); NASA asks for credit.

| File | Source layer | Author | URL | Licence / credit |
|---|---|---|---|---|
| `public/textures/earth/colour.jpg` (4096×2048) | `BlueMarble_NextGeneration` | Reto Stöckli, NASA Earth Observatory (MODIS) | https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/500m/3/{row}/{col}.jpeg | Public domain; credit "NASA Earth Observatory" |
| `public/textures/earth/clouds.jpg` (4096×2048) | `VIIRS_SNPP_CorrectedReflectance_TrueColor` and `VIIRS_NOAA20_CorrectedReflectance_TrueColor`, 2024-09-10 | NASA / NOAA (VIIRS), via GIBS | https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/2024-09-10/250m/3/{row}/{col}.jpeg | Public domain; GIBS acknowledgement |
| `public/textures/earth/water.png` (4096×2048, ≈ 210 KB) | Natural Earth 1:10m `ne_10m_land`, `ne_10m_minor_islands`, `ne_10m_antarctic_ice_shelves_polys`, `ne_10m_lakes` (Lake and Reservoir), rasterised by `scripts/build_earth_water.py` | Natural Earth (Tom Patterson, Nathaniel Vaughn Kelso and contributors) | https://github.com/nvkelso/natural-earth-vector/tree/master/geojson | Public domain (https://www.naturalearthdata.com/about/terms-of-use/); no credit needed, already listed with the 1° map |
| `public/textures/earth/lights.jpg` (2048×1024) | `VIIRS_Black_Marble`, 2016 | NASA Earth Observatory / NASA GSFC (VIIRS Black Marble) | https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_Black_Marble/default/2016-01-01/500m/2/{row}/{col}.png | Public domain; credit "NASA Earth Observatory" |

GIBS acknowledgement (already in the game's Real data list): "We acknowledge the use of imagery provided by services
from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)."

Stars, the Milky Way glow and all Spacecraft textures (foil crinkle, solar cells, brushed metal) are generated in
code (`src/world/stars.ts`, `src/world/spacecraftMaterials.ts`): no third-party files. The Mission Designer and
Space view reflections use three.js's `RoomEnvironment` (MIT, part of three).
