# Building model assets

Third-party assets in `public/models/buildings.glb` (textures are resized, re-encoded as JPG and embedded; colour maps of
some are turned grey so materials can tint them, and some carry baked rain streaks and grime). Everything else in the
models is made in Blender by `scripts/blender/` (geometry, baked ambient occlusion and dirt in vertex colours, and the
procedural PV-module, chain-link fence and fan-guard textures).

| File (embedded image names) | Original | Author / site | URL | Licence |
|---|---|---|---|---|
| `clad_col`, `clad_nor`, `clad_arm` | Box Profile Metal Sheet | Amal Kumar / Poly Haven | https://polyhaven.com/a/box_profile_metal_sheet | CC0 |
| `corr_col`, `corr_nor`, `corr_arm` | Corrugated Iron 02 | Jenelle van Heerden, Sergej Majboroda / Poly Haven | https://polyhaven.com/a/corrugated_iron_02 | CC0 |
| `rust_col`, `rust_nor`, `rust_arm` | Worn Corrugated Iron | Jenelle van Heerden, Dimitrios Savva / Poly Haven | https://polyhaven.com/a/worn_corrugated_iron | CC0 |
| `concrete_col`, `concrete_nor`, `concrete_arm` | Concrete Floor 02 | Rob Tuytel / Poly Haven | https://polyhaven.com/a/concrete_floor_02 | CC0 |
| `brick_col`, `brick_nor`, `brick_arm` | Factory Brick | Rob Tuytel / Poly Haven | https://polyhaven.com/a/factory_brick | CC0 |
| `asphalt_col`, `asphalt_nor`, `asphalt_arm` | Asphalt 02 | Rob Tuytel / Poly Haven | https://polyhaven.com/a/asphalt_02 | CC0 |
| `shutter_col`, `shutter_nor`, `shutter_arm` | Painted Metal Shutter | Dario Barresi, Rico Cilliers, Charlotte Baglioni / Poly Haven | https://polyhaven.com/a/painted_metal_shutter | CC0 |
| `plaster_col`, `plaster_nor`, `plaster_arm` | Painted Plaster Wall | Amal Kumar / Poly Haven | https://polyhaven.com/a/painted_plaster_wall | CC0 |
| `gravel_col`, `gravel_nor`, `gravel_arm` | Gravel Floor | Jenelle van Heerden, Matterfield / Poly Haven | https://polyhaven.com/a/gravel_floor | CC0 |
| `ore_col`, `ore_nor`, `ore_arm` | Rocky Gravel | Dario Barresi, Dimitrios Savva / Poly Haven | https://polyhaven.com/a/rocky_gravel | CC0 |

Authors as listed on each asset page (checked 15 Nov 2026); CC0 needs no credit, but the game credits each one.

Also shipped, not an art asset: `public/models/draco/draco_decoder.wasm` and `draco_wasm_wrapper.js`, the Draco mesh
decoder from three.js (`node_modules/three/examples/jsm/libs/draco/gltf/`; Draco by Google, Apache License 2.0), copied
there by the build script so the game can decode the compressed GLB.
