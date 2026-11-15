# Graphics overhaul: rockets and the Launch scene (stream 3 notes)

Branch `realistic-graphics`, session 3 (14 Nov 2026). Files: `src/world/rocketMesh.ts`, `src/world/launchView.ts`,
new `src/world/launch*.ts` / `rocket*.ts` helpers and their tests, `docs/art/assets-launch.md`.

## Plan (in this order, so a cut-off still leaves a visible gain)

1. Sky/environment from `environment.ts` + pad ground and sea (one patched MeshStandardMaterial: scrub, sand,
   concrete, beach, sea with sky reflection and glint), shadows on the pad, exposure as on the Site.
2. Rockets: smooth lathe profiles (64 segments), painted-metal shader with panel seams and grime, proper engine bells.
3. Exhaust plume shader, lit smoke billboards (instanced, sorted), ground cloud, contrail.
4. Service tower with real truss detail, lightning masts, blockhouse, flame trench, road.
5. Climb (sky darkening with altitude, stars) and the space shot.

## State

1. **Done.** `launchView.ts` calls `createSkyEnvironment` (same gradient sky, clouds, PMREM light, haze as the Site),
   exposure 0.34 / sun 12 / sky light 0.62 like `world.ts`, PCF shadows round the pad (2048 map, ±45 m, only while
   the camera is low). The renderer switches back to exposure 1 for the space and orbit shots (stream 4's tuning).
   `launchGround.ts`: one curved disc to 1,500 km (log-spaced rings), a patched MeshStandardMaterial using stream
   1's photo textures (`groundTextures()`): olive scrub with bare sandy patches, a sandy clearing round the pad,
   concrete hardstand + roads with sawn joints and scorch, a beach with wet sand, and the sea (ripples from the
   shared water normal map, sky-cube Fresnel reflection, sun glint, shoal colour, surf line). The coastline wiggles
   (`gCoast`). Climb: zenith goes black first, horizon band stays pale, clouds drop away, fog thins with altitude,
   camera near/far adapt.
2. **Done.** `rocketLathe.ts` (`latheGeometry` with hard edges at sharp profile corners, `bellProfile`), tested.
   `rocketPaint.ts`: MeshStandardMaterial + shader wear in body coordinates (weld rings, panel seams that fade
   before they alias, streaks, blotchy roughness, tail soot, brushed metal). `rocketMesh.ts` rebuilt with 64-segment
   lathes: skirts, tanks, tapered Thor, interstages, raceways, Juno fins with air rudders, real engine bells (dark
   throat) everywhere, Castor boosters with ogive noses and struts, Falcon octaweb, legs and grid fins folded,
   spin tables, Altair case. Contract unchanged (stage groups, nozzles, nozzleRadius, spinner, spacecraft,
   upperBase/Length, logo decals at y = 7 on stage 0).
3. **Done.** `launchPlume.ts`: additive lathe plume (core + sheath, flicker running down, faint shock diamonds,
   ragged tail) + nozzle glow sprite; solids whiter, liquids yellow-orange. `launchSmoke.ts`: up to 900 instanced
   camera-facing cards, sorted back to front each frame, lit like cloud balls (sun side bright, underside bluish),
   orange glow while near the flame, fade in 0.2 s, grow and thin out. Emission (`LaunchView.exhaust`): LOX vapour
   during the countdown, ground cloud rolling out both ends of the trench at liftoff, trail behind the flame
   thinning to a contrail up to 45 km. Liftoff camera: a hard cut at T-0 to a tracking camera 190 m back (fov 30)
   that blends into the old chase camera from T+9 s to T+24 s.

## How to look at it quickly (dev only, git-ignored helpers)

- `.leap/shots/shot3.mjs`: `shot.mjs` + Vite's hot-reload socket blocked + HTTP ≥ 400 logged + `evalfile:` step.
- `.leap/shots/lh.js`: builds a `LaunchView` over the page and exposes `LH.to(showSeconds)` (steps the show at
  30 fps). Set `window.LH_VEHICLE` first (default `thorDelta`). Example:
  `node .leap/shots/shot3.mjs --browser "C:/Program Files/Google/Chrome/Application/chrome.exe" --out .leap/shots/out/launch/x --steps "wait:2500;evalfile:.leap/shots/lh.js;eval:return LH.to(2.5);shot:pad;eval:return LH.to(11);shot:climb;eval:return LH.to(31);shot:space"`
  Show seconds: countdown 0–3, first stage 3–25 (pad shot until ≈ 27.7), space shot after, orbit at ≈ 45.
- Before shots: `.leap/shots/out/launch/before/` (pad, liftoff, climb, high, space, orbit).

## Session 5 (14 Nov 2026, later): plan and state

Plan, in this order (each step leaves a visible gain):

1. Pad structures in Blender: `scripts/blender/build_launch.py` → `public/models/launch.glb` (Draco, AO baked into
   vertex colours, roles in glTF extras). Three roots: `common` (sunken flame trench and deflector, tank farm, pipe
   racks, floodlight towers, fences), `classic` (late-1950s Cape pad: launch stand, umbilical mast with swing arms,
   mobile service gantry rolled back on rails, lightning masts with catenary wires, domed blockhouse, cable tray) and
   `modern` (SLC-40-like for Falcon 9: launch mount, transporter-erector, crew access tower, four lightning towers,
   water tower). `src/world/launchModels.ts` loads it lazily; `launchPad.ts` keeps the code-built pad as the
   fallback and swaps the models in; `LaunchPad.setVehicle(v)` picks classic or modern and sizes the hold-down ring.
2. Pad ground and light: photographic concrete hardstand (CC0) with joints, stains and scorch; the ground opens over
   the sunken trench (only once the models are in); sky less saturated; sun from the side so white paint shows form.
3. Exhaust and smoke: softer plume, sprite nozzle glow, bigger merging billows, ground cloud, thinning contrail.
4. Rockets: paint detail, roll patterns, weathering, Falcon 9 upper-stage nozzle.
5. Climb and space: sky darkening, stars, crisp sun and Earth-shine on the upper stage.

### State (update as it goes)

1. **Done (first pass).** `scripts/blender/build_launch.py` → `public/models/launch.glb` (3.5 MB, AO baked, scorch
   darkened into the vertex colours). Triangles: common 46k, classic 55k, modern 47k. `launchModels.ts` loads it;
   `launchPad.ts` swaps it in for the code-built pad, `setVehicle()` picks the part and sizes the code-built
   hold-down ring (`holdDown`, `armReach`). `launchView.load` and `plannerView.show` call `setVehicle` (one line in
   plannerView.ts). The ground discards fragments over the trench opening (|x| < 3, |z| < 16 round the pad) once
   `pad.userData.trench` is set; `launchGround.ts` finds the pad by name in `onBeforeRender` (so Wallops works).
2. **Done.** Sun moved to the east-south-east (a morning sun over the sea, side light on the rocket), sky light 0.5,
   sky desaturated 30 %, turbidity 1.5, haze (fog) 250 m–16 km. Hardstand: photographed concrete (CC0) with slab
   tones, sawn joints, damp patches, stains, soot round the trench and fans of soot at both trench exits; tank-farm
   aprons; the rail beds of the gantry (classic) or the erector (modern). Scrub has hammocks and straw flats at
   large scale so the distance is not one flat band.
3. **Done (first pass).** Plume: premultiplied blending (covers part of the sky instead of adding to white), soft
   silhouette, white-hot only near the nozzle, orange tail, sharp periodic shock diamonds; glow sprite smaller,
   gaussian. Smoke: fbm billows instead of ball clusters, flatter lighting so overlapping cards merge, wind drift
   (stronger higher up), more and larger trail puffs with random sizes, ground cloud out of both trench ends plus
   steam out of the pit; capacity 1400.

Performance (thorDelta, 1280×800, Intel UHD; `.leap/shots/ab.js` renders HEAD's view and the new one interleaved
in one page with the game's own canvases stopped by `.leap/shots/quiet.js`): pad countdown HEAD 23.6 ms → 20.7 ms
(the shadow map is now drawn once while the rocket waits, so the models cost nothing there); liftoff 11.7 → 13.1 ms.
4. **Done (first pass).** `rocketPaint.ts`: seam lines keep their share of a pixel far away (faint lines instead of
   nothing), every skin panel a shade different (tone and roughness), panels bulge slightly between seams (a bump
   from derivatives, fades out when a panel is a few pixels), glossier paint (white 0xcbc8c0, roughness 0.3, black
   0.36). Bells show rows of cooling tubes (120 seams). Falcon 9: its first stage greyed by soot (flown before),
   and a short Merlin Vacuum with a big dark niobium nozzle extension (exit radius 0.66, nearly the stage's width).
   Code contract unchanged (`buildRocket`, stages, nozzles, spinner, Spacecraft, logo decals, `disposeRocket`).
5. **Done, NOT checked on screen.** Climb: the existing sky darkening and stars stay (zenith black first, pale
   horizon band longest), now with the haze. Space shot: hemisphere light 1.0 → 0.3 (no sky above the air), a
   crisp sun (3.4) from high up and behind the stages so they get a lit top and a dark underside, Earth-shine
   environment 0.8 → 1.1 for the blue fill from below; Earth keeps its old light direction via `setSun(-3, 5, 4)`.
   The dev server stopped (the app ended it) before this could be shot; look at `LH.to(31)` first next session.

### Module map (stream 3)

| File | What |
|---|---|
| `src/world/launchView.ts` | The Launch in three shots (pad and climb, space, orbit): lights, sky tweaks, cameras, exhaust emission, shadow-map caching. |
| `src/world/launchPad.ts` | `buildLaunchPad`: code-built fallback pad, swaps in the Blender models, `setVehicle`, hold-down ring (`holdDown`, `armReach`, `padKind`). |
| `src/world/launchModels.ts` | Loads `public/models/launch.glb` once (GLTFLoader + Draco), finds `common`/`classic`/`modern` by role (`partsByRole`). |
| `src/world/launchGround.ts` | Ground to the horizon: scrub, hardstand, beach, sea; opens over the trench; follows the pad (by name). |
| `src/world/launchPlume.ts` | Exhaust plume (lathe + premultiplied glow shader) and nozzle glow sprite. |
| `src/world/launchSmoke.ts` | Instanced, sorted smoke/steam cards; `billow` atlas, wind. |
| `src/world/rocketMesh.ts`, `rocketPaint.ts`, `rocketLathe.ts` | The five Launch Vehicles; painted-metal shader; lathe and bell profiles. |
| `scripts/blender/build_launch.py` | Builds `launch.glb` and `public/textures/launch/hardstand_*.jpg`. |
| Tests | `launchPad.test.ts` (padKind, holdDown, armReach, partsByRole), `launchSmoke.test.ts` (puffOpacity, billow), `rocketLathe.test.ts`. |

### Regenerate launch.glb

```
"C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b --factory-startup -P scripts/blender/build_launch.py
```
About 1.5 min (AO bake included; `-- --no-ao` for a quick look). Downloads the Poly Haven maps into
`.leap/art-src/launch/tex/` on first run, writes processed maps to `tex_out/`, exports `public/models/launch.glb`
(3.5 MB) and `public/textures/launch/hardstand_col.jpg`, `hardstand_nor.jpg`. Layout constants the TS code mirrors:
trench opening |x| < 3, |z| < 16 (`launchGround.ts` discard), stand top 1.8 m, gantry rail bed direction game
(-0.6, -0.8) 24–86 m out, erector rails east along z = ±1.7, tank aprons (`gConcrete`). Blender (x, y) = game (x, -z).

### Rough edges / next

- Space-shot lighting change (step 5) not yet seen on screen.
- Sea seen from above (liftoff/climb cameras) shows the water normal map's tiling as a regular grid; needs a
  distance fade or a larger third scale in `launchGround.ts`.
- From the far liftoff camera the trail still has a slight periodic bulge (a puff group per frame).
- The crew tower of the modern pad fills the right third of the pad shot; could move further east or be shorter.
- The planner keeps its own sun (behind the camera, `plannerView.ts` `SUN`), so the pad there is front-lit; for the
  same look as the Launch show use `(0.69, 0.57, 0.44)` there (not my file).
- Swing arms on the classic umbilical mast are at fixed heights (10.5, 17.3, 24.1 m); they fit Thor best.
- Triangles: common 46k + classic 55k (or modern 47k); ladders' cages, rails and pipes could be thinned if needed.
- Shock diamonds read as rings across the plume up close; could be subtler.
