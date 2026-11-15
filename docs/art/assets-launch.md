# Launch scene assets

Third-party assets in the Launch scene (the pad, the Launch planner's pad and the title screen's launch). Everything
else is made by this project: the pad models are built in Blender by `scripts/blender/build_launch.py` (geometry, baked
ambient occlusion and soot in vertex colours, and the procedural bar-grating and chain-link fence textures); rockets,
exhaust, smoke and sky are drawn in code (`src/world/rocket*.ts`, `src/world/launch*.ts`). The ground's scrub, sand and
sea textures are the terrain stream's (`docs/art/assets-terrain.md`).

## `public/models/launch.glb`

Textures are resized to 1024 px (ARM maps 512 px), re-encoded as JPG and embedded. Colour maps are turned into grey
detail maps (materials tint them) with baked rain streaks and grime; the metallic channel of the ARM maps is zeroed.

| File (embedded image names) | Original | Author / site | URL | Licence |
|---|---|---|---|---|
| `paint_col`, `paint_nor`, `paint_arm` | Rusty Painted Metal | Amal Kumar / Poly Haven | https://polyhaven.com/a/rusty_painted_metal | CC0 |
| `plate_col`, `plate_nor`, `plate_arm` | Blue Metal Plate | Rob Tuytel / Poly Haven | https://polyhaven.com/a/blue_metal_plate | CC0 |
| `concrete_col`, `concrete_nor`, `concrete_arm` | Concrete Floor Worn 001 | Dimitrios Savva (photo), Rico Cilliers (processing) / Poly Haven | https://polyhaven.com/a/concrete_floor_worn_001 | CC0 |
| `metal_col`, `metal_nor`, `metal_arm` | Metal Plate 02 | Rob Tuytel / Poly Haven | https://polyhaven.com/a/metal_plate_02 | CC0 |
| `grating_col`, `fence_col` | (procedural, made by the build scripts) | LEAP | — | project's own |

## `public/textures/launch/`

| File | Original | Author / site | URL | Licence |
|---|---|---|---|---|
| `hardstand_col.jpg` (colour, 1024 px) | Concrete Floor Worn 001 (diffuse) | Dimitrios Savva (photo), Rico Cilliers (processing) / Poly Haven | https://polyhaven.com/a/concrete_floor_worn_001 | CC0 |
| `hardstand_nor.jpg` (normal, OpenGL, 1024 px) | Concrete Floor Worn 001 (normal) | Dimitrios Savva (photo), Rico Cilliers (processing) / Poly Haven | https://polyhaven.com/a/concrete_floor_worn_001 | CC0 |

CC0 needs no credit; the game credits Poly Haven. Originals are downloaded by the build script into
`.leap/art-src/launch/tex/` (git-ignored).

Also shipped, not an art asset: `public/models/draco/` (three.js's Draco decoder, Apache License 2.0), shared with the
building models; see `docs/art/assets-buildings.md`.
