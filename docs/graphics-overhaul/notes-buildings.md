# Realistic building models: handoff notes

## State (stopped at a safe checkpoint for usage)

- **All ten buildings exist in Blender** (mine, metalWorks, electronicsLab, solarFab, batteryPlant, warehouse,
  researchLab, assemblyHall, hq, groundStation) plus `crane` (tower crane, `craneJib` role) and `foundation`
  (56 m concrete block with joints and coping). Exported to `public/models/buildings.glb` (9.7 MB: 2.3 MB textures,
  ~7.4 MB geometry; 31 nodes, top-level node per model).
- **All are wired into the game** via `src/world/buildingModels.ts`: each sync builder still builds the OLD code
  model and calls `useModel(g, key, tint, keep, place)`, which swaps the old children for a clone of the GLB node
  once the file has loaded (shared promise, dynamic import of GLTFLoader, nothing at module import; does nothing in
  Node). If loading fails the old model stays (fallback). `buildingGroup` names its placeholder block `foundation`
  and `useFoundation` swaps it. Kept across a swap: `foundation`, `level`, `crane`, `smoke`, plus per-call names
  (HQ keeps `flag` and `company-logo`, moved onto the new pole/board). Metal Works' smoke group is moved to the
  new chimney top.
- Tints: materials named `product`, `productMetal`, `productPV` take the Factory's `PRODUCT_COLOUR`; `ore` takes
  `DEPOSIT_COLOUR` (cloned material cached per material+colour). Assembly Hall: productMetal = metalWorks,
  productPV = solarFab.
- Moving parts carry `extras.role` (→ `userData.role`, renamed to `o.name` on load) and `speed`/`base`/`range`:
  mine sheaves `spin` ×2, electronics dish/battery roof fan/research observatory + anemometer/assembly filter fans/
  ground-station antenna `spinY`, solar tracker `swing`, warehouse forklift and assembly gantry `shuttle`
  (base/range in metres, game z = −Blender y), crane `craneJib`.
- Checked: typecheck passes, 463/463 tests pass, Demo Era 2 shows all models in game with correct orientation and
  smoke on the chimney (`.leap/shots/out/buildings/close.png`, `site.png`). Two 404 console errors appeared in the
  run; not traced (may be another agent's asset) — check with the Network tab.

## Not done / known issues

1. Smoke is still the old faceted icosahedron puffs; brief wants camera-facing soft sprites (canvas texture made
   lazily). Note World overwrites each puff's `scale`, so put the Sprite as a child of each puff with fixed scale ~0.1.
2. `buildLevelSign` is still the old pole + gold icosahedra; make a tasteful plaque with 1–n stars (code-built).
3. HQ flag is the old flat box flag (repositioned); could be a waved cloth plane. Verify logo visible close up.
4. Not verified in game: moving parts actually move (take two shots a second apart), crane during upgrade,
   each building close up, title-screen preview, sloped-ground foundation look.
5. Glass is metallic 0.9 / rough 0.05: relies on `scene.environment` (the other agent sets it). Lamps/windows use
   emissive strength 4–8 (KHR_materials_emissive_strength); check they do not bloom too much.
6. Triangles: researchLab ~39.7k and hq ~37k (over the 30k aim, measured before window bevels were removed;
   re-check the `MODEL …` lines). Others 4k–27k.
7. No AO bake yet (stretch goal). Geometry could be reduced (bevels on small parts) if size matters.
8. Old code-built models still sit in `factoryMesh.ts`/`mineMesh.ts` as the fallback; they are drawn for a moment
   before the GLB arrives. Optionally preload in `main.ts` before `previewCompany()`.

## Regenerate

```
"C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b --factory-startup -P scripts/blender/build_buildings.py -- --preview
```
Builds all, exports `public/models/buildings.glb`, re-imports it and renders previews to
`.leap/art-src/buildings/previews/<name>-site.png` and `-close.png` (~25 s). `-- mine hq` builds only those and
renders previews without exporting (fast iteration). Textures download automatically on first run into
`.leap/art-src/buildings/tex/`; processed copies go to `.leap/art-src/buildings/tex_out/`.

Files: `scripts/blender/lib.py` (textures, materials, Builder primitives, finalize: apply bevel modifiers, join
parts per node, box/cylinder UVs in metres, material-slot cleanup), `parts.py` (halls, flat blocks, doors,
windows, lamps, railings, ladders, HVAC, pallets, cars, trees, fences), `models_industry.py`, `models_campus.py`
(each has an `ANCHORS` dict of positions the TS code mirrors), `render.py` (EEVEE previews).
Axes: front facades face Blender −Y and +X (game +z and +x); game z = −Blender y. 1 m = 0.03 model units.

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
  texture (Poly Haven `_arm` maps are already ORM). Image format `AUTO` copies the JPG bytes as-is, so resize/
  re-encode yourself. Custom object props export as node `extras` with `export_extras=True`.
- Materials get `use_backface_culling = True` so glTF `doubleSided` is false (fence material is double-sided,
  alpha via Math ROUND → MASK).
