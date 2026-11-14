# Graphics overhaul: terrain, water, sky (handoff notes)

Branch `realistic-graphics`. Replaces the terraced voxel land of the Site with a smooth, textured, sky-lit landscape.
Gameplay (`src/site/**`, `src/game/**`) is untouched. Typecheck and all tests pass (460 old + 3 new in
`src/world/ground.test.ts`).

## How the modules fit together

- `src/world/ground.ts` (pure, no Three.js): `Ground` class built by `buildGround(site, land, pads)`.
  - Near lattice: Site square bounds ± `NEAR_REACH` (64) tiles, a vertex every 0.5 tile (1 tile if over 220k vertices,
    i.e. with many Plots). Heights: tile levels × `STEP` (water tiles deepen with distance from shore, `waterBed`),
    blurred (5-tap), kept true per tile centre (`keepTrue`: land ≥ WATER_Y+0.07 and within ±0.3 of its level; water
    ≤ WATER_Y−0.14), Catmull-Rom interpolated to the lattice, plus small `microRelief` noise away from the shore.
  - Far lattice: every 4 tiles out to `FAR_REACH` (224); vertices on/inside the near edge copy near heights.
  - Looks per vertex (`GroundLook`): `mix` (sand, dirt, rock, snow; grass = rest) from `groundMix(terrain, level,
    climate)`, `ore` (Deposit colour premultiplied + amount; next-door Plots at 0.6), `site` (1 on the Site, fades out).
  - API for later scenery: `heightAt(x,z)`, `normalAt`, `slopeAt`, `terrainAt`, `isWater`; `surfaceHeight(ground,x,z)`.
  - Pads: `padFor(site,x,z)` (3×3 footprint at `foundationLevel*STEP`), `addPad(pad)` flattens + grades a
    `PAD_SKIRT` (1.25 tile) skirt; returns the changed vertex range. `DEPOSIT_COLOUR` now lives here (re-exported by
    `siteMesh.ts`).
- `src/world/terrainMesh.ts`: `latticeBuffers` (shared vertex buffers, optional skirt curtain on the outer edge),
  `latticeGeometry` (index over chosen cells, diagonal matches `latticeHeight`), `updateLatticeBuffers`,
  `terrainMaterial(sky, {climate})` = MeshStandardMaterial patched in `onBeforeCompile`: 5 photo layers (2 scales +
  macro noise anti-tiling, height blend, slope rock, deposit gravel patches, wet shore, paler land off-Site) and fog
  that fades to the sky cube's own horizon colour (tone-mapped like the sky). Re-exports `STEP`, `WATER_Y`.
- `src/world/terrainTextures.ts`: lazy loader `groundTextures()` (cached; shader uses flat fallback colours until
  `ready`).
- `src/world/water.ts`: `buildWater(ground, sky, kind)` – one big transparent plane with a custom shader; depth from
  the ground heights baked into two half-float textures (near/far); ripples (`water_normal.jpg`), Fresnel sky
  reflection from the sky cube, sun glint, shallow→deep colour, soft edge, thin foam. `refresh()` after pads.
- `src/world/environment.ts`: `createSkyEnvironment(renderer, scene, {sunDirection})` – three `Sky` (with its
  clouds) as the dome, a cloud-free copy rendered to a 128 px cube (`uniforms.skyCube`, for water + fog) and to PMREM
  (`scene.environment`), `horizon` colour for built-in fog, `sunColour`. Reusable by the launch view.
- `src/world/rocks.ts`: `boulderGeometry` (noisy, fractured icosphere with vertex-colour shading), `rockMaterial`.
- `src/world/siteMesh.ts`: `buildSiteMesh(site, skyUniforms, pads)` → group with meshes `terrain` (Site cells),
  `scenery-near` (rest of near lattice + skirt), `scenery-far`, `water`, `deposits` (InstancedMesh, `clearRocks`
  still works, cleared set survives `pressPad`), `site-border` (white ribbon draped on the ground).
  `terrain`/`scenery-near` have a custom `raycast` that ray-marches `heightAt` (fast, exact, passes through hills
  outside its region). Also `pressPad(group, pad)`, `animateSite`, `groundOf(group)`, `buildPlotMarker(ground, plot,
  buyable)` (signature changed: takes the Ground).
- `src/world/world.ts`: creates the sky environment; exposure 0.3, sun 8, environmentIntensity 0.9 (the Preetham
  sky is bright, so exposure is low); PCF shadows (PCFSoft is removed in r187) following the camera target, sized by
  zoom, texel-snapped; `groundY` = max(WATER_Y, ground height); `addBuilding` presses a pad; `redrawLand` rebuilds
  with all building pads; `markTile` marker is a draped sheet + rim (green/red).

## Requirements status (numbers from the task)

1. Smooth heightfield + `groundY`: done.
2. Building pads: done (add + redraw). The Shipping dock (`shippingView.ts`) gets no pad; it sits at the highest
   ground under it as before.
3. Picking: done (custom raycast on the same mesh names).
4. PBR ground: done (albedo + normal + roughness, 5 kinds, anti-tiling). Snow uses a brightened texture.
5. Scenery to horizon: done, near/far share heights at the seam, skirt hides cracks. Off-Site land slightly greyer.
6. Water: done for coast/lake/river, hidden for none. No shadows on water.
7. Sky: done (three `Sky`, clouds only in the visible dome; they show little at game camera angles).
8. Lighting/environment: done. Needs more tuning by eye (see bugs).
9. Climates: checked green/lake, desert/river, snow/coast, mountains/lake (screenshots below).
10. Performance: Home Site ≈ 148k near + 16k far vertices; 10 terrain textures at 1k; one 4096 shadow map; no extra
    per-frame passes. Not profiled on integrated GPUs; `redrawLand` not timed (feels instant).
11. Hook for vegetation: `Ground` API above (`groundOf(siteGroup)` from World's group).

## Known bugs / rough edges

- High land (level 7–8) right next to water makes a near-vertical rock wall (gameplay heights jump ~4.5 units in one
  tile); visible on snowy/mountain coasts and lakes. Could lower `keepTrue`'s land band near water or widen the bank.
- Near-horizon sky is very pale (physically right for Preetham at this sun height); could raise `rayleigh` or tint.
- Inland sand (dry climates) reads as flat beige blobs; desert could use a warmer/dune texture.
- Two 404 console errors appear on load; not from these files' textures (all load) – check the Network tab
  (possibly the other agent's models). Not investigated.
- `water.ts` foam/edge and `terrainMesh.ts` `gNormalW` line (`gN * (1.0 + 0.0 * tn.b)`) are untidy; normal
  strength 1.15 unchecked up close.
- Unused leftovers: `Ground.isWater`, `surfaceHeight` alias (kept as API).

## Next steps

1. Look at the screenshots and fix the cliff banks (bug 1).
2. Tune exposure/sun/sky colours and the scenery tint by eye; check shadow acne close to buildings.
3. Check a Site with several Plots (near lattice drops to 1 vertex per tile; pads still work but are coarser).
4. Find the 404s.

## Screenshots

- Before: `.leap/shots/out/before/03-site.png`, `04-low.png`, `05-close.png`.
- Now (Demo Era 2): `.leap/shots/out/terrain/site.png`, `horizon.png` (low + close).
- Climates: `.leap/shots/out/climates/*-site.png`, `*-low.png`, contact sheet `sheet.png`. Script used (scratch,
  may be gone): steps `eval:` → `import('/src/site/site.ts')` → `leap.world.showSite(m.generateSite(seed, climate))`.
