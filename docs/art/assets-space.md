# Space assets (Earth, stars, Spacecraft)

All Earth pictures come from NASA GIBS (Global Imagery Browse Services) WMTS, EPSG:4326, made by
`scripts/build_earth_textures.py` (runs in Blender's Python). Originals (tiles) in `.leap/art-src/space/tiles/`.
NASA imagery is public domain (not copyrighted in the US); NASA asks for credit.

| File | Source layer | Author | URL | Licence / credit |
|---|---|---|---|---|
| `public/textures/earth/colour.jpg` (4096×2048) | `BlueMarble_NextGeneration` | Reto Stöckli, NASA Earth Observatory (MODIS) | https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/500m/3/{row}/{col}.jpeg | Public domain; credit "NASA Earth Observatory" |
| `public/textures/earth/clouds.jpg` (4096×2048) | `VIIRS_SNPP_CorrectedReflectance_TrueColor` and `VIIRS_NOAA20_CorrectedReflectance_TrueColor`, 2024-09-10 | NASA / NOAA (VIIRS), via GIBS | https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/2024-09-10/250m/3/{row}/{col}.jpeg | Public domain; GIBS acknowledgement |
| `public/textures/earth/water.png` (2048×1024) | `OSM_Land_Water_Map` | OpenStreetMap contributors, served by GIBS | https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/OSM_Land_Water_Map/default/250m/3/{row}/{col}.png | ODbL: **needs the credit "© OpenStreetMap contributors"** (new) |
| `public/textures/earth/lights.jpg` (2048×1024) | `VIIRS_Black_Marble`, 2016 | NASA Earth Observatory / NASA GSFC (VIIRS Black Marble) | https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_Black_Marble/default/2016-01-01/500m/2/{row}/{col}.png | Public domain; credit "NASA Earth Observatory" |

GIBS acknowledgement (already in the game's Real data list): "We acknowledge the use of imagery provided by services
from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)."

Stars, the Milky Way glow and all Spacecraft textures (foil crinkle, solar cells, brushed metal) are generated in
code (`src/world/stars.ts`, `src/world/spacecraftMaterials.ts`): no third-party files. The Mission Designer and
Space view reflections use three.js's `RoomEnvironment` (MIT, part of three).
