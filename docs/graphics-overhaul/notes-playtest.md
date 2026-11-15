# Graphics overhaul: play-test before the merge (stream 7 notes)

15 Nov 2026, branch `realistic-graphics`. Windows 11, Intel UHD (integrated), headless Chrome (ANGLE D3D11), dev
server. Screenshots (git-ignored) under `.leap/shots/out/s7/`. Type check and all 514 tests pass.

## What was played

- **Demo Era 1, end to end** (`final-era1/`, also `era1b/`, `era1c/`, `era1d/`): Site, Mission Designer (Explorer 1),
  Launch planner, Book Rideshare, truck at the dock and driving (`era1b/drive1.png`), a scrub ("Wait for better
  weather"), the full Juno I Launch (pad, liftoff, climb, stage 2 over Earth, at work), the antenna anomaly, the
  Mission Report, "See it in orbit" (Space view). Console: no errors or warnings.
- **Demo Era 2, end to end** (`final-era2/`, `era2/`): same with Thor-Delta and Telstar 1, plus all 7 planner steps
  (`era2/p1-user.png` … `p7-review.png`) after the planner's sun change. Console: no errors or warnings.
- **Title menu** for about 60 s at 1024×768 (`small/title0…4.png`): the rockets cycle (Thor-Delta, then Delta D), no
  fall-back to the Site, no errors.
- **1024×768:** Site, Mission Designer, Launch planner (`small/site.png`, `designer.png`, `planner.png`,
  `planner-vehicle.png`): everything fits and reads.
- **New Company in a desert** (Phoenix, Arizona; `desert/`): globe picker, Seed preview behind the form, Start, Era
  card, sandy Site with dunes, cacti and scrub, a Warehouse placed by hand. No errors.

Not played (scope cut by the team): snowy and river/lake Companies, Free Play (Falcon 9 on the modern pad), buying a
Plot, a building upgrade with the crane, Delta D's Launch.

## Fixed

| What | File | Commit |
|---|---|---|
| Planner pad lit flat from behind the camera: sun now `(0.69, 0.57, 0.44)` like the Launch show; 7 camera steps checked | `src/world/plannerView.ts` | 791fe2f |
| Flaky pre-commit test "carries the coast and the river on past the edge" (5 s timeout when busy): 30 s timeout, same checks | `src/site/site.test.ts` | 791fe2f |
| Launch view sea seen from above showed its ripple texture as a regular grid: four turned scales sampled with Inigo Quilez's texture-repetition technique (two random offsets cross-faded along noise lines, contrast kept), plus broad gusty and calm patches. Before `era1b/liftoff.png` (crop `sea-before/juno_sea_crop.png`), after `fixcheck/sea-juno.png`, `sea-thor.png` (crop `sea-after/juno_sea_crop.png`) | `src/world/launchGround.ts` | b512114 |
| Bright white streaks floating above Earth's horizon in the space shots (the cloud shell, higher than real clouds, seen past the planet's edge): clouds fade out where the line of sight passes over the edge into space. Before `era2/high.png` (crop `era2/high_crop.png`), after `fixcheck/limb-thor.png`, `limb-juno.png`; full globes unchanged (`final-era2/orbit.png`, `final-era1/space.png`) | `src/world/earthMesh.ts` | b512114 |

## Frame rate (Intel UHD, headless Chrome; rAF is not capped at 60 here)

| View | Size | fps | median frame |
|---|---|---|---|
| Whole-Site view, Demo Era 1 | 1280×800 | 14.3 | 69 ms (p90 76) |
| Whole-Site view, Demo Era 2 | 1024×768 | 15.2 | 63 ms |
| Launch pad countdown, Juno I | 1280×800 | 51–59 | 14 ms |
| Launch pad countdown, Thor-Delta | 1280×800 | 55 | 20 ms |
| Liftoff, Juno I | 1280×800 | 69 | 14 ms |
| Climb (no pad in view), Juno I | 1280×800 | 134 | 7 ms |
| Title, rocket on the pad | 1024×768 | 48–51 | 21 ms |
| Title, climbing | 1024×768 | 108–143 | 7 ms |

The title's fall-back to the Site needs a median over 83 ms (`SLOW_FRAME_S`); this GPU is far from it. The Site is
the slow view on integrated graphics (trees, shadows, terrain shader); a mid-range discrete GPU should be well above 60.
In the Era 2 run the liftoff window measured 14.7 fps with a 14 ms median: one long stall (about 2 s) right after
liftoff, not seen in Era 1. Likely a first-use shader compile or the shadow map being redrawn; not traced.

## Cosmetic issues left (not fixed on purpose)

- The Era cards' AI-generated illustrations still show the old blocky look (`desert/site.png`).
- Launch pad and title: the service gantry's long shadow on the hardstand is ragged and noisy at grazing angles
  (shadow-map resolution; `era1/title_crop.png`).
- The climb shows the plume but hardly any smoke trail or contrail behind it (`final-era1/liftoff.png`,
  `era1b/climb.png`); shock diamonds read as rings across the plume (`era1b/climb.png`).
- Earth's sun sheen is a soft white disc in the middle of the Atlantic in the "at work" shot and Space view
  (`final-era2/orbit.png`).
- Shipping dock: a plain pale slab, brighter than everything round it; close up, tree trunks read as pale posts
  (`final-era1/truck.png`, `era1b/drive2.png`).
- Planner, Launch Site step: from high up the scrub shows big dark blotches (`era2/p5-site.png`); the vehicle tiles'
  rocket pictures are small and dim (`era2/p4-vehicle.png`).
- Not graphics, seen in passing: the globe picker calls Phoenix "forest" (the 1° land map); the first tutorial card says
  "Step 1 of 8" with six numbered pills visible (`desert/built.png`).

## Helpers (git-ignored, `.leap/shots/s7/`)

`golaunch.js` (clicks Launch at 4×, takes scrubs, returns when the show is up), `truckwait.js`, `steps.js` (planner
step by name), `findseed.js` (Seed with a given water kind at a place, typed as a LEAP1 code), `name.js`,
`freetile.js`, `tap.js` / `look.js` (tap or look at a Site tile, the free tile or a Plot), `fps.js`, `title.js`,
`crop.mjs` (crop and enlarge a screenshot). Used with `.leap/shots/shot5.mjs` and `.leap/shots/lh.js`.
