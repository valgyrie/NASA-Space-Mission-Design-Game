# Graphics overhaul: trees, rocks, props, Shipping truck (stream 5 notes)

Session 3, 14 Nov 2026. Status: **in progress** (this file is updated after every step).

## Plan

1. Trees and bushes on the temperate Site (whole-Site view and close up).
2. Climates: desert (scrub, dry trees, cacti), snowy (snow-dusted conifers), mountainous (conifers, none on rock).
3. Shipping truck, cargo, dock and road.
4. Boulders and ground clutter.

## Design

- Textures: `scripts/blender/build_nature.py` (Blender's Python + NumPy, no rendering) composes leaf-cluster cards from
  CC0 ambientCG leaf atlases and a bark strip into one atlas: `public/textures/nature/foliage_col.jpg` (colour) and
  `foliage_mask.jpg` (alpha). One material for every tree kind → one draw call per kind per chunk.
- Geometry: built in code (`src/world/treeModels.ts`), once, shared by every Site: trunk and limbs (tapered tubes) plus
  leaf cards with normals pointing out of the crown (soft, rounded canopy light). Two levels of detail.
- Placement: `src/world/vegetationPlacement.ts` (pure, tested): deterministic from the Seed, by terrain kind, slope,
  climate; never on water, Deposits (with a margin), pads, the Site border band or the Shipping road.
- Drawing: `src/world/vegetation.ts`: the `SceneryLayer`; InstancedMesh per kind per 32-tile chunk (frustum culled per
  chunk, also for the shadow pass); wind sway in the vertex shader from one time uniform.

## Done

- Step 1 and 2 (trees and climates), checked in screenshots (`.leap/shots/out/nature3/`, `clim5/`):
  - Atlas `foliage_col.jpg` + `foliage_mask.jpg` (1024 × 1536, ~420 KB together): beech sprig, oak sprig, needle
    bough, bark strip, spruce silhouette (and an unused pine silhouette in 256–512 × 1024–1536, free for later).
  - Kinds: broadleaf (beech), oak, conifer (spruce), pine (narrow fir-like spire), bush, scrub, palm. LOD 0 within
    8 tiles of the Site (≈ 300 tris broadleaf, ≈ 100 conifer: 2 crossed silhouette cards + 40 bough cards), LOD 1
    beyond (≈ 36 tris broadleaf, 6 tris conifer: 3 crossed cards). Trees out to 104 tiles past the Site (2-tile
    steps beyond the full-detail land).
  - Density: woods from two noise fields, up to 2 trees per tile; the Site keeps 16 %; a hard budget of 1M triangles
    per Site thins evenly (`TRIANGLE_BUDGET`). Temperate ≈ 20k trees / 0.72M tris; snowy ≈ 39k → thinned to 1.0M.
    Placement ≈ 0.3–0.4 s per `build` (in Node; similar in the browser).
  - Climates: deserts get dusty scrub, a few flat-topped thorn trees, palms by the water; snowy Sites mostly
    conifers with snow on the upper sides of the leaves (`uSnow`); conifers more on hills and mountains; nothing on
    slopes over 0.3 (rock).
  - Material: MeshStandardMaterial patched: wind sway + leaf flutter (one shared time uniform, set in
    `onBeforeRender`), no normal flip on back faces (crown-shaped normals), alpha to coverage, alpha boosted in
    smaller mipmaps so thin needles do not vanish far away, a little light through the leaves.
- Hook in `world.ts` (two lines): `import { vegetationLayer } from './vegetation';` and, at the end of the
  constructor, `this.addScenery(vegetationLayer());`. Nothing in `siteMesh.ts`.

## Left

Shipping truck, dock and road (step 3); boulders and clutter (step 4); frame-rate check.
