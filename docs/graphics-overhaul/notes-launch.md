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
