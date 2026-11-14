# Realistic building models: notes (stream 2)

Current as of session 3 (14 Nov 2026, third buildings agent). Session 2's script changes (muted palette, weathering in
the colour maps, vertex-colour AO bake, `_densify`) were never exported; session 3 exported them and went on.

## State

- **Ten buildings + `crane` + `foundation`** in `public/models/buildings.glb`: **8.9 MB** (4.0 MB textures, the rest
  Draco-compressed geometry and vertex colours). Triangles (`MODEL …` lines): mine 24.9k, metalWorks 23.8k,
  electronicsLab 19.9k, solarFab 15.1k, batteryPlant 28.5k, warehouse 26.8k, researchLab 19.7k, assemblyHall 20.1k,
  hq 28.8k, groundStation 15.4k, crane 4.6k, foundation 7.4k. All under 30k.
- **Draco:** the exporter compresses meshes (`export_draco_*` in `build_buildings.py`); the script copies three's
  decoder (`node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm`, `draco_wasm_wrapper.js`) to
  `public/models/draco/`. `buildingModels.ts` loads with `GLTFLoader` + `DRACOLoader` (both dynamic imports).
- **Materials:** per building, muted and weathered: slate-blue box-profile (Metal Works), sand (Warehouse, red roof),
  sage (Battery Plant), cream (Solar Fab), off-white hangar (Assembly Hall), precast concrete (Electronics Lab), brick
  (Research Lab, Mine engine house, furnace, chimney), grey plaster (HQ), corrugated iron (Ground Station shelter),
  rusty flaking corrugated sheet (Mine roof, ore bin, conveyor gallery; Metal Works furnace hood and flue). Pads are
  darker, warm concrete with sawn joints every 6 m. Metals are dull (galvanised metal 0.6 / rough 0.6, aluminium
  0.7 / 0.5), window frames and sills are dark powder-coat (dielectric), glass is dark (0.1, metal 0.5, rough 0.06)
  so it shows sky reflections without going white. Lamps 1.2, lit windows 0.35, fire 4 (emissive strength).
- **AO and dirt** baked into `COLOR_0` (three multiplies it into the base colour): Cycles AO bake (32 samples,
  2.5 m, with a ground plane), softened `0.3 + 0.7·ao^0.75`, × splash grime on the bottom 1.5 m of walls, × world-space
  fractal dirt blotches and vertical run-off streaks on walls (`_dirt`). `_densify` cuts big faces every 2 m so the
  vertex colours have enough resolution.
- **Ore heaps** (`Builder.mound`): angle-of-repose cone with rounded crest and spreading toe, fractal-noise slumps,
  Poly Haven `rocky_gravel` (grey detail map, tile 1.2 m, normal ×1.6) plus scattered lumps. The game tints `ore` with
  `oreTint(DEPOSIT_COLOUR)` (buildingModels.ts): same hue, saturation ×0.45, lightness 0.25–0.5.
- **No trees** in the building grounds (a later stream scatters real trees): `shrub_bed` (mulch bed, concrete edging,
  noise-displaced shrubs) and hedges made of overlapping shrubs. **Cars** are lofted saloon bodies (`car_body`:
  rounded plan, tumblehome, tinted glasshouse, painted roof), muted paints.
- **Fence** (`fence` material) is alpha **BLEND**, not MASK, so the chain-link fades to a veil with distance instead
  of vanishing; `buildingModels.ts` keeps transparent meshes from casting shadows.
- **Code-built parts** (buildingParts.ts / factoryMesh.ts):
  - Smoke: each puff (a Group whose position and scale World sets) holds a `THREE.Sprite` (fixed scale 0.22, canvas
    texture of overlapping soft blobs made lazily on first use, null in Node). `onBeforeRender` fades it with
    `smokeOpacity(k)` where k comes from the puff's scale (0.5 → 2.1), and turns it slowly.
  - Level sign: a navy board in a steel frame on two posts, turned 45° towards the start view, one gold extruded star
    per level on each face (`buildLevelSign`).
  - HQ flag: `buildFlag`, a 16×8-segment cloth hanging from its hoist edge, waved on the CPU in `onBeforeRender`
    (`clothOffset`, ≤ 50 Hz), with the two `company-logo` planes waving with it (back one turned so the logo reads
    the right way). `useModel`'s `place` puts it at `at(10.6, 13.0, 9.5)` next to the Blender pole.
- **Preload:** `main.ts` waits for `preloadBuildingModels(4000)` before drawing the title Site (skipped if the player
  has already gone on to a game or the new-Company screen), so the code-built stand-ins never flash. A late GLB still
  swaps in; a failed one leaves the code-built models (warning in the console).
- **Tests:** `buildingModels.test.ts` (oreTint), `buildingParts.test.ts` (smokeOpacity, addSmoke structure, stars per
  level). Type check and all tests pass.
- **Checked in the game** (Demo Era 2, 1280×800, `.leap/shots/out/b3/`): every building close up, the solar tracker
  swings between two shots a second apart, smoke rises from the Metal Works chimney, the crane shows on an upgrading
  building (forced with a patched `world.setLevel`), level signs, flag and logo, title-screen Site.

## Known rough edges / next steps

1. The scene lighting is strong and bluish (stream 1's sky and exposure): pale materials still read lighter in the
   game than in the Blender previews. If exposure changes, re-check `cladWhite`, `whitePaint`, `plasterWhite`.
2. Foundation: still a vertical 56 m concrete block (the pad sits on it), so there is never a gap under a building;
   on steep slopes it shows as a retaining wall. A battered base would poke into neighbouring footprints (buildings
   touch), so it was not done; terrain grading around the pad is stream 1's.
3. Smoke reads as a soft plume; against a pale sky it is subtle by design.
4. Level signs look like small dark boards from the whole-Site view (stars only read close up).
5. Draco: geometry is still ~4.9 MB because hard edges and box-mapped UVs split many vertices. Dropping `_densify` on
   faces that are hidden or small, or 512 px ore maps, would save ~1 MB if needed.
6. Shrubs are low-poly lumps (fine at game distance, faceted very close up).

## Regenerate

```
"C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b --factory-startup -P scripts/blender/build_buildings.py -- --preview
```
Builds all (~1 min with the AO bakes), exports `public/models/buildings.glb` and the Draco decoder, re-imports the GLB
and renders previews to `.leap/art-src/buildings/previews/<name>-site.png` and `-close.png`. `-- mine hq` builds
only those and renders previews without exporting. `--no-ao` skips the bake. Textures download automatically on
first run into `.leap/art-src/buildings/tex/`; processed copies go to `.leap/art-src/buildings/tex_out/`.

Files: `scripts/blender/lib.py` (textures and weathering, materials, Builder primitives incl. `mound`, `shrub`;
finalize: apply bevels, join parts per node, `_densify`, box/cylinder UVs in metres, slot cleanup; `bake_ao`, `_dirt`),
`parts.py` (pads, halls, flat blocks, doors, windows, lamps, railings, ladders, HVAC, pallets, `car_body`/`car`,
`shrub_bed`, `hedge`, fences), `models_industry.py`, `models_campus.py` (each has an `ANCHORS` dict of positions the TS
code mirrors), `render.py` (EEVEE previews). Axes: front facades face Blender −Y and +X (game +z and +x); game
z = −Blender y. 1 m = 0.03 model units. Keep the front-left corner (x, y ≈ −14.3) clear: the game's level sign
stands there.

## Screenshots in the game

`.leap/shots/shot.mjs` with `window.leap`. Useful tricks: World pulls the camera target to the ground every frame
(`followGround`), so for high views patch it out with `eval:leap.world.followGround=()=>{}`; to show the crane,
wrap `leap.world.setLevel` so it passes `upgrading = true` for one tile (playSite calls it every frame). Vite reloads
the page when another agent edits files; retry a shot run that fails with "leap is not defined".

## Blender 5.3 API findings

- EEVEE engine id is `BLENDER_EEVEE`. Sky node types: `SINGLE_SCATTERING`, `MULTIPLE_SCATTERING`, `PREETHAM`,
  `HOSEK_WILKIE`.
- `Mesh.set_sharp_from_angle(angle=…)` and `Mesh.shade_smooth()` exist; Bevel modifier `harden_normals` gives
  weighted-normal style shading, preserved by `bpy.data.meshes.new_from_object(..., preserve_all_data_layers=True)`
  and by `bpy.ops.object.join()`.
- `me.materials.clear()` resets every polygon's material_index to 0: set indices after re-adding materials.
- `Image.save(filepath=, quality=)` writes raw pixels (no view transform) — safe for normal/ARM maps.
- glTF exporter: a Mix (MULTIPLY, factor 1) of image × constant colour exports as `baseColorFactor`; Separate
  Color G/B → roughness/metallic plus a `glTF Material Output` node group with an `Occlusion` input → one ORM
  texture. Image format `AUTO` copies the JPG bytes as-is, so resize/re-encode yourself. Custom object props export
  as node `extras` with `export_extras=True`. `export_vertex_color='ACTIVE'` writes the active colour attribute as
  `COLOR_0`. Draco works headless (`export_draco_mesh_compression_enable`), and the importer reads it back.
- Alpha: image alpha → BSDF Alpha with `surface_render_method = 'BLENDED'` exports `alphaMode: BLEND`; through a
  Math ROUND with `'DITHERED'` it exports `MASK`.
- Cycles `bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')` bakes into the active colour attribute of every
  selected mesh.
- Source files are CRLF: edit with tools that keep line endings.
