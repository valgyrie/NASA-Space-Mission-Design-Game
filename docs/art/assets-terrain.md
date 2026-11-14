# Terrain, water and sky assets

Every file the Site's ground and water load. All CC0 (public domain); credit is courteous, not required.
Originals (1k JPG, `diff`, `nor_gl`, `rough`) are kept in `.leap/art-src/terrain/` (git-ignored).

Packing: `<kind>_albedo.jpg` is the original colour map recompressed (JPG q82). `<kind>_normal.jpg` holds the
OpenGL normal map in red/green and the roughness map in blue (JPG q85).

| File in `public/textures/terrain/` | Original | Author / site | URL | Licence |
|---|---|---|---|---|
| `grass_albedo.jpg`, `grass_normal.jpg` | Rocky Terrain 02 (`rocky_terrain_02`) | Amal Kumar / Poly Haven | https://polyhaven.com/a/rocky_terrain_02 | CC0 |
| `sand_albedo.jpg`, `sand_normal.jpg` | Aerial Beach 01 (`aerial_beach_01`) | Rob Tuytel / Poly Haven | https://polyhaven.com/a/aerial_beach_01 | CC0 |
| `rock_albedo.jpg`, `rock_normal.jpg` | Aerial Rocks 04 (`aerial_rocks_04`) | Rob Tuytel / Poly Haven | https://polyhaven.com/a/aerial_rocks_04 | CC0 |
| `snow_albedo.jpg`, `snow_normal.jpg` | Snow Field Aerial (`snow_field_aerial`) | Rob Tuytel / Poly Haven | https://polyhaven.com/a/snow_field_aerial | CC0 |
| `dirt_albedo.jpg`, `dirt_normal.jpg` | Dirt Aerial 03 (`dirt_aerial_03`) | Rob Tuytel / Poly Haven | https://polyhaven.com/a/dirt_aerial_03 | CC0 |
| `water_normal.jpg` | Made for LEAP (random-spectrum ripple normals, generated with NumPy) | LEAP team | — | CC0 |

`aerial_rocks_02` was downloaded and tried but is not shipped. The sky is procedural (three.js `Sky`, MIT, part of the
`three` dependency); no sky images are used.
