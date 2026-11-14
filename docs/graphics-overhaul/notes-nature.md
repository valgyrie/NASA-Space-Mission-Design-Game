# Graphics overhaul: trees, rocks, props, Shipping truck (stream 5 notes)

Session 3, 14 Nov 2026. Status: **all four steps done** (first pass); type check and all tests pass (489).

## Module map

- `scripts/blender/build_nature.py`: Blender used as a Python with NumPy (nothing rendered). Cuts leaves and needle
  sprays out of CC0 ambientCG atlases, lays them out as cards, packs them with a bark strip into one atlas:
  `public/textures/nature/foliage_col.jpg` + `foliage_mask.jpg` (1024 × 1536, ≈ 420 KB together). Layout in the
  script's docstring; `ATLAS` in `treeModels.ts` mirrors it. The pine silhouette at (256–512, 1024–1536) is unused
  (pine looked like a lollipop); free for a cactus or a broadleaf silhouette.
- `src/world/treeModels.ts`: shapes made in code once, shared by every Site. Kinds: broadleaf (beech), oak,
  conifer (spruce), pine (narrow fir-like spire), bush, scrub, palm. LOD 0 (≈ 300 tris broadleaf, ≈ 100 conifer:
  2 crossed whole-tree cards + 40 bough cards) and LOD 1 (≈ 36 tris broadleaf, 6 tris conifer: 3 crossed cards).
  Attribute `wind` (bend weight, leaf flag). Card normals point out of the crown.
- `src/world/vegetationPlacement.ts` (pure, tested): `placeVegetation(ground, site)`: per-tile hashed random numbers
  (stable when Plots are added), woods from two noise fields (up to 2 trees per tile), the Site keeps 16 %, bushes at
  wood edges. LOD 0 within 8 tiles of the Site, shadows within 24, trees out to 104 tiles (2-tile steps beyond the
  near land). Never: water, slope > 0.3, pads (+0.5), within 1.4 of a Deposit, within 1.2 of the Site's border.
  `TRIANGLE_BUDGET` 1M per Site: thick woods are thinned evenly. Climates: deserts dusty scrub, flat-topped thorn
  trees, palms by water; snow → conifers; hills and mountains more conifers.
- `src/world/sceneryRocks.ts`: `boulderShape` (80-tri smooth lumpy stone), `placeRocks`: on hills and mountains
  (also steep ground up to 0.6), few on grass and in deserts, small stones round big ones, 2.5 tiles clear of
  Deposits (their ore rocks must stand out). Out to 40 tiles. Drawn with stream 1's `rockMaterial`.
- `src/world/vegetation.ts`: `vegetationLayer()` (a `SceneryLayer`): InstancedMesh per kind / LOD / variant / shadow
  flag / patch (48 tiles near, 128 far), so patches are culled (also from the shadow pass). One material for all trees
  (`foliageMaterial`): wind sway + leaf flutter from one time uniform (set in `onBeforeRender`), no back-face normal
  flip, alpha to coverage, alpha boosted in small mipmaps, a little light through the leaves, snow on upward sides
  (`uSnow` = climate.snow). `clearPad` hides trees on a new pad and re-seats those on its graded skirt.
  `setVegetationClearing(rect | null)` keeps trees off the Shipping dock and road (also re-applied after `build`).
- `src/world/truckModel.ts`: `buildRig` (1960s-style conventional tractor + flatbed semi-trailer, ≈ 16.5 m, rounded
  boxes, lathe tyres with rims and studs, chrome, glass, lamps; `wheel` groups turn about z), `buildLoad` (Spacecraft
  on a cradle inside a galvanised scaffold with boards; for the drive a strapped olive tarpaulin load), `buildDock`
  (concrete apron with sawn joints, yellow kerbs, slewing pillar jib crane `crane`, two floodlights, foundation),
  `buildRoad` (asphalt ribbon draped on the ground, canvas texture with edge lines and a dashed centre line).
- `src/world/shippingView.ts`: same API and timing; rig drawn at 0.125 units per metre (≈ 2 tiles long; was a
  3.3-tile toy). The road runs from the dock's edge to the drive's end and 70 tiles on into the haze. The scene key
  includes `route.to`, so after buying land the road is rebuilt longer.

## Hooks in files I do not own

- `src/world/world.ts`: two lines: `import { vegetationLayer } from './vegetation';` and, at the end of the
  constructor, `this.addScenery(vegetationLayer());`. Nothing in `siteMesh.ts`.

## Checked (screenshots in `.leap/shots/out/`, git-ignored)

- Before: `s4/site.png`, `s4/low.png`, `s4/close.png` (no vegetation); `ship0/dock.png`, `ship0/dockclose.png`.
- After: `nature3/site.png`, `nature3/low.png`, `nature3/close.png`; climates `clim5/*-site.png|*-low.png`
  (desert, snowy, mount, temperate) and `clim6/` (mountain close, desert after the dry tint); Shipping `ship1/dock.png`,
  `ship1/dockclose.png`, `ship1/drive1.png`, `ship1/drive3.png`; building on a wooded tile `place/before|after.png`.
- Frame rate (this PC: Intel UHD integrated, headless Chrome, 1280×800, Demo Era 2 whole-Site view; noisy because
  another agent shares the machine): ≈ 14 fps with trees vs ≈ 16 without (the scene without trees is ≈ 16 and ≈ 24
  without any shadows). Trees add ≈ 170 draw calls (both passes) and ≈ 0.6M triangles on screen. A mid-range
  discrete GPU should be far above 60.
- Tools (git-ignored): `.leap/shots/shot5.mjs` (= shot.mjs + Vite's hot-reload socket blocked + `evalfile:file|arg`),
  `.leap/shots/js5/truck.js` (camera to the truck), `drive.js` (force the drive at fraction ARG), `place.js`,
  `perf.js` (fps with trees on/off), `perf2.js`. Other climates in the page:
  `eval:return import('/src/site/site.ts').then(m=>leap.world.showSite(m.generateSite('x',{dryness:0.9,water:'coast',relief:0.2})))`.

## Rough edges / next steps

- The road ignores buildings that stand on its line (the route itself is gameplay and was not changed); it can run
  over a pad or through a building next to the dock.
- The dock slab sits at the highest ground under it, so on a slope one side stands up as a low wall (like a
  building's foundation).
- Conifer LOD 0 shows its two crossed cards as an "X" when looked at from straight above close up.
- Broadleaf crowns in snowy Sites get white tops (reads as snow-laden; bare winter trees would be more accurate).
- No cacti; no grass tufts or flowers (ground clutter is stones only).
- Boulders are pale limestone-like; tint `shade` in `sceneryRocks.ts` if they should be darker.
- Placement takes ≈ 0.3–0.4 s per `build` on the Site (adds to `redrawLand`); could move to a worker if it matters.
