# Graphics overhaul: terrain, water, sky, lighting (stream 1 notes)

Branch `realistic-graphics`. Replaces the terraced voxel land of the Site with a smooth, photographic, sky-lit
landscape. Gameplay (`src/site/**`, `src/game/**`) is untouched; seeds and saves are unchanged. Current as of
14 Nov 2026, session 3 (third stream-1 agent). Type check and all 476 tests pass.

## Module map

- `src/world/ground.ts` (pure, no Three.js): `Ground`, built by `buildGround(site, land, pads)`.
  - Near lattice: Site square ± `NEAR_REACH` (64) tiles, a vertex every 0.5 tile (1 tile above 220k vertices, i.e.
    with several Plots). Heights: tile levels × `STEP`, water deepening offshore (`waterBed`), blurred, kept true per
    tile centre (`keepTrue`), banks limited to `BANK_SLOPE` (0.62/tile) by distance from water with a soft minimum
    (`bank`), Catmull-Rom to the lattice, plus `microRelief`.
  - Far lattice: every 4 tiles out to `FAR_REACH` (384, was 224, so the haze can build slowly); vertices inside the
    near land copy its heights.
  - Looks per vertex (`GroundLook`): `mix` (sand, dirt, rock, snow; grass = rest) from `groundMix`, `ore` (Deposit
    colour × amount; next-door Plots at 0.6), `site` (1 on the Site), `shore` (1 at the water, 0 by ~3.5 tiles:
    where a beach may be, `shoreOf`).
  - Pads: `padFor(site, x, z)`; `addPad` → `reshape`: footprint flat; `PAD_MARGIN` (0.75) flat margin; skirt as wide
    as the height difference needs (`skirtWidth`: never steeper than `PAD_GRADE` 0.62/tile, 2.25–6.5 tiles); nearby
    pads blend by inverse distance, so the ground between two pads at different heights slopes evenly.
  - Scenery API: see below.
- `src/world/terrainMesh.ts`: `latticeBuffers` / `latticeGeometry` / `updateLatticeBuffers` (shared vertex buffers,
  skirt curtain), `terrainMaterial(sky, { climate, beach })`: MeshStandardMaterial patched in `onBeforeCompile`.
  - 5 photo layers, each sampled with `gStochastic` (Inigo Quilez's texture-repetition technique 3: two random
    offsets cross-faded by noise) at two scales (the large one turned), so no tiling grid shows; far away each photo
    gives way to its average colour and broad macro variation (`farK`).
  - Weights: land kinds from `aMix` with noisy edges; rock on slopes (`gRockSlope`), summits (`gSummit`) and in
    `mountain` tiles (less in flat hollows); beach band = shore × height just above water × gentle slope; soil patches
    and soil fringes; snow; then a height blend (rock and stones poke through at borders).
  - Grading: grass lusher/drier in patches, sand warm (`gSandTint`), soil brown (`gDirtTint`), rock grey-brown by hill.
  - Deposits: stony ground (rock photo) stained by the ore colour, muted in sRGB with a chroma cap; ragged edge.
  - Wet dark sand at the waterline (only near real water). Off-Site land a touch greyer.
  - Fog: `pow(smoothstep(fogNear, fogFar, d), 1.5)` toward the sky cube's own horizon colour (tone-mapped like the
    sky). `material.userData.uniforms` exposes every uniform for tuning in the console.
- `src/world/terrainTextures.ts`: lazy cached loader `groundTextures()` (flat fallback colours until `ready`).
- `src/world/water.ts`: `buildWater(ground, sky, kind)`: one transparent plane; depth from the ground heights baked
  into two half-float textures. Ripples at four scales and directions, gust patches, fine scales fading out with
  distance and all slopes calming toward the horizon (no visible repeat); Fresnel sky reflection with a floor that
  rises at grazing angles; sun sparkle; turquoise shallows to deep blue; soft edge; thin broken foam; same haze as the
  ground, so the far sea melts into the sky's horizon band.
- `src/world/environment.ts`: `createSkyEnvironment(renderer, scene, { sunDirection })`: gradient sky + sun + cheap
  fbm clouds (dome), a cloud-free copy rendered to a 128 px cube (`uniforms.skyCube`: water, fog) and, desaturated
  85 %, to PMREM (`scene.environment`). Below the horizon the dome is exactly the horizon colour (no dark seam).
- `src/world/rocks.ts`: `boulderGeometry`, `rockMaterial(detail?)` (vertex colours + triplanar grain from the rock
  photo), `oreStone(hex)` (muted stone colour of an ore; same rule as the ground stain).
- `src/world/siteMesh.ts`: `buildSiteMesh(site, sky, pads)` → group: `terrain` (Site cells, clickable),
  `scenery-near`, `scenery-far`, `water`, `deposits` (InstancedMesh, 8–11 ore rocks per Deposit tile clustered
  round 2–3 big blocks; `clearRocks` still works and survives `pressPad`), `site-border`, `scenery` (empty group for
  trees etc.). Custom ray-marching `raycast` on `terrain`/`scenery-near`. `pressPad`, `animateSite`, `groundOf`,
  `sceneryOf`, `buildPlotMarker(ground, plot, buyable)`.
- `src/world/world.ts`: exposure 0.34, sun 12, sky light 0.62 (sun ≈ 3 × sky, so shading has contrast and shadows are
  not blue); PCF 4096 shadow map following the camera target, texel-snapped; `groundY`; pads on `addBuilding`;
  `redrawLand` rebuilds with all pads; `markTile` marker draped on the ground; scenery layers (below).
- `src/world/camera.ts`: `hazeFor(d)` = near d + 35, far d + 330.

## Vegetation / scenery API (for stream 5)

On a `Ground` (get it with `groundOf(siteGroup)`; in World it is `groundOf(this.siteGroup)`), world x/z in tiles:

| Call | Returns |
|---|---|
| `heightAt(x, z)` | ground height (under water: the bed). `World.groundY` clamps to the water surface. |
| `normalAt(x, z)`, `slopeAt(x, z)` | upward unit normal; 0 flat … 1 vertical |
| `terrainAt(x, z)` | `'water' \| 'sand' \| 'grass' \| 'hills' \| 'mountain'` (Site tile or land around it) |
| `isWater(x, z)` | below the water surface |
| `depositAt(x, z)` | the Deposit's Raw Material on the Site or a Plot next door, else null |
| `onPad(x, z, margin = 0)` | on a building pad (footprint + its flat margin + `margin`) |
| `surfaceAt(x, z)` | all of the above at once (`GroundSurface`, plus `onSite`) |
| `site`, `land`, `nearMin`/`nearMax`, `far` | the Site, its Land, full-detail bounds, coarse lattice |

Draw scenery with a `SceneryLayer` (exported from `world.ts`) and `world.addScenery(layer)`:

```ts
world.addScenery({
  build(into, ground, site) { /* add InstancedMeshes etc. to `into`; skip ground.onPad / isWater / depositAt */ },
  clearPad(into, pad, ground) { /* a building was placed on `pad`: hide what stands there */ },
});
```

`build` runs for the Site on screen when the layer is added, and after every `showSite` / `redrawLand` (pads already
pressed in). `clearPad` runs in `addBuilding` after the pad is pressed. The `scenery` group lives in the Site group,
so it is removed and its geometries/materials/instanced buffers disposed with it (`disposeAll`): make fresh objects
in `build`, or keep shared ones out of that group. Use `src/site/random.ts` with the Seed for repeatable placement.

## Status against the requirements

1. Smooth heightfield, `groundY`: done. 2. Pads: done; wide adaptive skirts, even slopes between neighbouring pads.
3. Picking: unchanged names, custom raycast. 4. PBR ground: done, no visible tiling. 5. Scenery to the horizon, Site
border, Plot marker and 3×3 marker on the ground: checked. 6. Water: done for coast/lake/river, hidden for none.
7. Sky: blue gradient, clouds, haze matching the fog. 8. Environment/sun/shadows: re-balanced this session.
9. Climates: checked temperate, desert, snowy, mountainous, lake, river, snowy coast, desert coast (contact sheets
below). 10. Performance: Home Site ≈ 103k near + 58k far vertices; with 5 Plots the near step drops to 1 tile (103k)
and `redrawLand` takes ≈ 270 ms; one shadow map; no extra passes. Terrain fragment shader: up to ~8 texture fetches
per active layer (usually 2–3 layers). Not profiled on an integrated GPU. 11. Vegetation hooks: done (above).

## Known rough edges

- Neighbouring buildings whose foundation levels differ and whose footprints touch have a vertical step between
  them (footprints must stay flat). The foundation blocks hide most of it; a short rock wall can show in the gap.
- Natural cliffs from the land generator (e.g. level 6 next to level 0 inland, beside some rivers) stay steep and
  read dark when in shadow. Banks next to water are limited; other cliffs are not.
- Snow fields are rather flat white from the whole-Site view.
- Ore patches and rocks show the ore colour clearly but muted; silicon reads blue-grey, copper rust, aluminium pale
  stone. Tune `0.16 /` (chroma cap) in `terrainMesh.ts` and `oreStone` together if the team wants more colour.
- The sea seen from the whole-Site view is a deep, dark blue (physically plausible); brighten `deep` in `water.ts`
  if wanted.
- The two console 404s in the Demo flow are `/favicon.ico` (no icon is declared in `index.html`): not in stream-1
  files. Fix: add `<link rel="icon" href="data:,">` or a real icon to `index.html`.

## Screenshots (`.leap/shots/out/`, git-ignored)

- Before (start of session 3): `s3/site.png`, `s3/low.png`, `s3/close.png`.
- After: `t3/site.png`, `t3/low.png`, `t3/close.png`, `t3/ore.png` (silicon Deposit close up), `t3/mine.png` (Mine
  on its pad), `t3/marker.png` (3×3 marker + Plot marker), `t3/plots.png` (5 Plots), `t3/title.png`.
- Climates: `clim/sheet.png` (whole-Site views), `clim/sheetlow.png` (low views), and `clim/<name>-site|low.png`.
- Tools used (git-ignored): `.leap/shots/shot2.mjs` (shot.mjs + `evalfile:` step, HTTP ≥ 400 logging, and Vite's
  hot-reload socket blocked so another agent's edits don't reload the page mid-run), `.leap/shots/js/*.js` (camera
  and probe snippets), `.leap/shots/climates.sh`, `.leap/shots/sheet.sh` (contact sheets).
