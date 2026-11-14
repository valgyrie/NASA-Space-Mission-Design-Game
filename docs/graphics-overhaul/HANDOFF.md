# Realistic graphics overhaul: handoff

Written 14 Nov 2026 by the orchestrating agent (Claude Fable) when usage ran low. Another agent continues from here.
Read this file first, then `notes-terrain.md` and `notes-buildings.md` beside it (written by the two coding agents at
their checkpoint; if one is missing, that agent was cut off: inspect its files and screenshots instead).

## Session 2 (14 Nov, afternoon): read this first

A second orchestrator (Claude Fable) continued on branch `realistic-graphics` and was cut short by the usage limit.
The team asked for the work in progress to be committed, pushed and merged into `main` so the next session can go on.

- **Started, not finished:** two Opus agents were continuing **stream 1** (terrain, water, sky) and **stream 2**
  (buildings) from the priority lists in the two "continue" prompts below. Whatever they had changed when the
  checkpoint was taken is committed. It passes the type check and tests, but **nobody has looked at it critically
  yet**. Their notes (`notes-terrain.md`, `notes-buildings.md`) are only as fresh as the agents left them: if a note
  does not mention session 2, that agent was cut off, so trust `git log -p` and new screenshots instead.
- **First thing to do:** take the Demo Era 2 screenshots (command below), compare them with the problem lists in the
  two "continue" prompts, and re-run those prompts with whatever is still wrong. Then streams 3 and 4 together, then
  5, then 6, then 7, as in the table.
- **Not started:** streams 3, 4, 5, 6 and 7. Their prompts below are ready to paste.
- The **final** look still needs the team's go-ahead before its last merge.

What the orchestrator saw in the game at the start of session 2 (Demo Era 2, 1280×800), i.e. what streams 1 and 2
were asked to fix:

- At low camera angles the whole sky is near-white from the horizon to the top of the screen; no clouds show.
- Sand is flat pale grey blobs with a hard outline; rock areas are blotchy with visible repetition and hard edges.
- Deposits are tiny blue-white specks, hard to find from the whole-Site view.
- Buildings are clean bright white with pale roofs, like an untextured maquette; the Mine's ore piles are flat
  orange blobs; smoke is faceted puffs; level signs are the old pole with gold icosahedra.
- Building foundations stick out over slopes like a table, with the ground falling away under the edge.

### This machine (Windows 11, differs from the notes further down)

- **Node is on PATH** (v24, `C:\Program Files\nodejs`), and `node_modules` is installed. `npm run typecheck` and
  `npx vitest run` work from the repo root (463 tests on 14 Nov). No need for `.leap/node`.
- **Screenshots need Chrome.** Edge fails to launch from `shot.mjs` here. Always pass
  `--browser "C:/Program Files/Google/Chrome/Application/chrome.exe"`. `.leap/shots/` (git-ignored) must be set up
  once per machine: copy `scripts/dev/shot.mjs` there, then `npm init -y && npm install puppeteer-core` in it.
- **Dev server:** in the Claude desktop app, add `.claude/launch.json` (not committed) with
  `node node_modules/vite/bin/vite.js --port 5173 --strictPort` and start it with the preview tool. Elsewhere, run
  that command in the background.
- **`gh` is not installed.** Git push works through the Windows credential manager. Merge like part 1: push the
  branch, then fast-forward `main` (`git push origin realistic-graphics:main`) when `main` has not moved, or merge
  locally and push.
- `.leap/art-src/` is empty on a fresh clone: the Blender script downloads its textures again on first run; terrain
  originals must be fetched again if needed.
- The two 404s in the console do not happen on the title page (every texture and the GLB load). They appear later
  in the Demo Era 2 flow; not traced yet.
- Agents were started with the Agent tool, `subagent_type: general-purpose`, `model: opus`, two at a time, each
  with the shared rules plus one stream prompt, pasted in full (an agent starts with no memory of this file).

## What the team asked for

> Change the graphics from voxel to something more realistic and non-voxel; improve the terrain and the models.
> GitHub and local Blender may be used; assets may be downloaded and used, but must be credited in the Credits.
> Get the team's acceptance before merging the finished work. Write code with Claude Opus agents, two at a time at most.

The team later asked for the work in progress to be pushed and merged so a new session can continue. The **final**
result still needs the team's go-ahead before it is merged.

## How the work is organised

The orchestrator does not write game code. It reads, briefs Opus coding agents (two at a time, each owning a disjoint
set of files in the same checkout), looks at their screenshots critically, sends feedback, and handles git.
Gameplay must not change: only how things are drawn. `src/site/site.ts` and `src/game/**` are off limits.

| # | Stream | Owner files | State on 14 Nov |
|---|---|---|---|
| 1 | Terrain, water, sky, lighting | `src/world/terrainMesh.ts`, `siteMesh.ts`, `world.ts`, `camera.ts`, new `ground.ts`, `water.ts`, `environment.ts`, `terrainTextures.ts`, `rocks.ts`, `public/textures/**` | Working checkpoint, polish left; see `notes-terrain.md` |
| 2 | Buildings built in Blender (GLB) | `scripts/blender/**`, `public/models/**`, `src/world/factoryMesh.ts`, `mineMesh.ts`, `buildingParts.ts`, `buildingModels.ts` | Working checkpoint, polish left; see `notes-buildings.md` |
| 3 | Rockets and the Launch scene | `src/world/rocketMesh.ts`, `launchView.ts` | Not started; prompt below |
| 4 | Spacecraft, Earth and space views | `src/world/spacecraftMesh.ts`, `spacecraftView.ts`, `spaceView.ts`, `earthMesh.ts`, `earthTexture.ts`, `globePicker.ts` | Not started; prompt below |
| 5 | Trees, rocks, props, Shipping truck | new `src/world/vegetation.ts`, `shippingView.ts` | Not started; prompt below |
| 6 | Credits, docs, tests, screenshots | `src/strings.ts`, `src/game/sources.ts`, `src/ui/credits.ts`, README, GDD, CHECKLIST, PROGRESS, a new ticket | Not started; prompt below |
| 7 | Full play-test, fixes, then ask the team to merge | | Not started |

Streams 1 and 2 must be finished (or continued) before 5; 3 and 4 can run together; 6 runs last.

## State at the checkpoint (14 Nov, commit "Realistic graphics, part 1")

Works: Demo Mode Era 2 loads with smooth textured land, water, a physical sky and all ten Blender buildings.
Type check, 463 tests and the production build pass. Seen by the orchestrator in screenshots, still to fix:

- **Sky and exposure:** the sky near the horizon is blown out to white at low camera angles; clouds barely show.
- **Sand and Deposits:** sand areas and Deposit patches read as flat pale blobs from the whole-Site view; Deposits
  need a clearer ore colour and the sand more texture and a softer edge.
- **Steep rock walls** where mountains meet water.
- **Buildings:** a little white and plasticky (more weathering, darker roofs, baked AO would help); smoke is still
  faceted puffs; level sign and HQ flag are the old ones; Research Lab and HQ may be over 30k triangles.
- **Not yet checked in the game:** moving parts, the crane during an upgrade, foundations on slopes, the title
  screen, a Site with many Plots, frame rate on integrated graphics, the placement marker while building.
- Two 404s in the console on load are older than this work (they appear on `main` too); find and fix if cheap.
- The in-game Credits and the README have one plain line for the new models and Poly Haven textures
  (`credits.models` in `src/strings.ts`). Stream 6 should turn it into a proper linked section and keep it in step
  with `docs/art/assets-*.md` as more assets arrive.
- Launch scene, rockets, Spacecraft, Earth, trees and the truck are untouched (streams 3–5).

## Set-up on a fresh machine

- Node is not installed system-wide. The game's launcher keeps a private copy in `.leap/node/` (git-ignored).
  Run `LEAP.bat` once, or download the current Node LTS zip there by hand. Then in Bash:
  `export PATH="$PWD/.leap/node:$PATH"; npm ci`.
- Checks: `npm run typecheck` and `npx vitest run` (460 tests on main). The pre-commit hook runs both.
- Dev server: `node node_modules/vite/bin/vite.js --port 5173 --strictPort` (not `npm run dev`, which opens a browser).
- Screenshots: `scripts/dev/shot.mjs` (set-up steps in its header). Example, Demo Mode Era 2:
  `.leap/node/node.exe .leap/shots/shot.mjs --out .leap/shots/out/x --steps "wait:2500;click:Let;wait:800;click:Demo;wait:800;click:Era 2;wait:5000;shot:site;hold:f,1500;wait:500;shot:low;wheel:-300*8;wait:800;shot:close;log"`
  A whole Launch: after Era 2 loads, `click:Mission Designer;wait:1500;click:Plan the Launch;wait:1200;click:Book Rideshare and ship;wait:1500;click:4×;wait:27000;click:Launch;wait:2500;shot:pad;wait:13000;shot:climb;wait:37000;shot:orbit`.
  In dev, `window.leap` exposes `{ world, site, state, … }` once a game has started.
- Blender 5.3: `"C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b -P script.py -- args`.
- "Before" screenshots of the old look are in `screenshots/` (e.g. `ticket-18-building-hq.png`, `ticket-10-liftoff.png`).
- Assets: CC0 or public domain only (Poly Haven, ambientCG; NASA imagery). Originals in `.leap/art-src/` (git-ignored),
  shipped files in `public/`. Every shipped asset is listed in `docs/art/assets-*.md` with author, URL and licence.
  NASA's `eoimages.gsfc.nasa.gov` cannot be reached from here; NASA GIBS can (see `docs/research/earth-map.md` and
  `scripts/build_blue_marble.py`).

## Shared rules to paste at the top of every coding agent's prompt

```
You are working on LEAP, a three.js (r187) + TypeScript + Vite browser game (a space-company tycoon for NASA Space
Apps 2026). Repo root: <path>, branch `realistic-graphics`. Read `AGENTS.md` and `docs/graphics-overhaul/HANDOFF.md`
first. The team wants the old blocky "voxel"/flat-shaded low-poly look replaced by realistic graphics. Gameplay,
saves and seeds must not change: only how things are drawn (`src/site/site.ts` and `src/game/**` are off limits).

Rules:
- Edit only the files listed as yours. Another agent may be working in the same checkout on other files.
- Do NOT commit, push, switch branches or stash. Do not add npm dependencies (three's `examples/jsm` is fine).
- Node: on PATH on the team's Windows machine; if `node` is missing, `export PATH="<repo>/.leap/node:$PATH"`.
  Then `npm run typecheck` and `npx vitest run`. Do not run `scripts/leap.test.mjs` or any launcher.
  All tests and the type check must pass when you finish. Vitest runs in plain Node (no DOM, no WebGL): nothing may
  touch `document`, images, `fetch` or a renderer at module import time. Add tests for new pure functions.
- All player-facing text lives in `src/strings.ts` (a test enforces it). No real logos (NASA, SpaceX…).
- Assets: CC0/public domain only; originals in `.leap/art-src/<stream>/`, shipped files in `public/`, loaded lazily
  with `import.meta.env.BASE_URL + '…'`; list each in `docs/art/assets-<stream>.md` (file, original name, author/site,
  URL, licence). Keep textures ≤ 1024 px (Earth may be larger) and your stream's shipped assets ≤ ~10 MB.
- Performance: 60 fps on a mid-range laptop GPU; no extra full-scene render passes per frame.
- Check your work visually and iterate like a harsh art director: a dev server runs at http://localhost:5173 (do not
  start or stop one); take screenshots with `.leap/shots/shot.mjs` (see HANDOFF.md; on Windows always pass
  `--browser "C:/Program Files/Google/Chrome/Application/chrome.exe"`) and look at them with the Read tool.
  Toy-like, boxy, plasticky or flat results are not done.
- Another agent may change the sky, exposure or ground under you while you work, and the type check may fail in
  its files for a moment: wait and re-run, do not fix files that are not yours.
- Finish with a short report: what you built, assets used, test results, screenshot paths, known rough edges, and
  anything you needed from files you don't own. Also write it to `docs/graphics-overhaul/notes-<stream>.md`.
```

## Prompt: continue stream 1 (terrain, water, sky, lighting)

```
<shared rules>
Your files: src/world/terrainMesh.ts, siteMesh.ts, world.ts, camera.ts, ground.ts, water.ts, environment.ts,
terrainTextures.ts, rocks.ts, public/textures/**, docs/art/assets-terrain.md.
Read docs/graphics-overhaul/notes-terrain.md and continue from its "not done" and "next steps" lists. The full
requirements, in short:
1. Smooth continuous heightfield from the tile levels (no terraces, no tile edges); one exported pure function for
   the surface height at any world (x, z); World.groundY uses it (camera and Shipping truck follow the ground).
2. Terrain flattened to foundationLevel(site, x, z) * STEP under each building's 3×3 footprint with a graded skirt,
   updated on World.addBuilding and after redrawLand(). No building floats or is buried.
3. Picking unchanged: meshes named `terrain` (owned Site) and `scenery-near` are raycast and the hit is floored to a tile.
4. PBR ground: grass, sand, rock on slopes and mountains, snow (high tops and climate.snow), dry soil (climate.dryness);
   albedo + normal maps, anti-tiling, smooth blending; Deposits readable (ore-coloured patch + realistic ore rocks,
   clearRocks still works).
5. Scenery to the horizon with no seams; Site border, Plot marker and the 3×3 placement marker hug the ground.
6. Water: animated normal-mapped ripples, Fresnel sky reflection, sun glint, depth colour, soft shoreline; works for
   coast, lake, river; hidden for none; no planar-reflection pass.
7. Physical sky with the sun at SUN_DIRECTION, cheap soft clouds, horizon haze matching the fog.
8. scene.environment from the sky (PMREM) in a reusable module (the Launch pad view will call it); natural sun,
   exposure and soft shadows.
9. Looks right for temperate, desert, snowy, flat, mountainous, and all four water kinds.
10. ≤ ~200k near-terrain vertices, one shadow map, fast redrawLand().
11. Hooks for a later vegetation agent: surface height, slope/normal and terrain kind at a world position.

Session-2 priority list (fix in this order, check each in screenshots, stop when it looks good):
1. Sky and exposure: at low camera angles the sky is blown out to near-white and no clouds show. Wanted: a clearly
   blue daytime sky with soft visible clouds, a pale haze only in a thin band at the horizon, distant land and sea
   fading into exactly that haze colour. Re-tune exposure, sun and environment intensity together so buildings and
   land do not get darker or flatter. If three's Preetham `Sky` cannot do it at this sun height, replace the dome
   with a cheap gradient + sun + procedural cloud shader, keeping `createSkyEnvironment`'s API, sky cube and PMREM.
2. Sand reads as flat pale grey blobs with a hard outline: warm sand/dry-ground colour, visible texture and
   ripples, edges broken up and blended into the grass with noise; inland sand should look like natural bare ground.
3. Rock/hill areas are blotchy and repeat visibly from the whole-Site view, with hard edges: natural transition by
   slope and height, less noise at distance, no visible tiling.
4. Deposits are tiny specks: a clearly readable ore-coloured ground patch plus realistic ore rocks, visible from
   the whole-Site view (players place Mines on them). `clearRocks` must keep working.
5. Steep rock walls where high land meets water: widen and soften the bank.
6. Building pads on slopes: foundations stick out over the slope like a table. Make the pressed pad and skirt wide
   and graded enough that foundations sit in the ground all round (the foundation block belongs to stream 2).
7. Verify and fix: shadows close to buildings, a Site with several bought Plots, the title screen's live Site, the
   3×3 placement marker, Plot markers, four climates (temperate, desert, snowy, mountainous) with coast, lake,
   river and no water; water after the sky change.
8. If cheap: find the two 404s in the Demo Era 2 flow.
```

## Prompt: continue stream 2 (buildings in Blender)

```
<shared rules>
Your files: scripts/blender/**, public/models/**, src/world/factoryMesh.ts, mineMesh.ts, buildingParts.ts,
buildingModels.ts, docs/art/assets-buildings.md, and src/main.ts only if preloading needs it.
Read docs/graphics-overhaul/notes-buildings.md and continue from its "not done" and "next steps" lists. In short:
- Ten buildings, each on a 3×3 tile footprint (think 30 m × 30 m): mine, metalWorks, electronicsLab, solarFab,
  batteryPlant, warehouse, researchLab, assemblyHall, hq, groundStation. Authored in Blender 5.3 by Python scripts
  kept in scripts/blender/ (one command regenerates the GLB), exported to public/models/, loaded with GLTFLoader.
- Realistic: real proportions and industrial architecture, bevelled edges, smooth shading, round things round, PBR
  materials with photographic CC0 textures, glass that reflects the sky, sparing emissive lights; stretch: baked AO.
  ≤ ~30k triangles per building, ≤ ~12 MB shipped in total. Each building keeps its identity, product colour
  (PRODUCT_COLOUR) and moving part, and reads at a glance from the whole-Site view.
- Contract with World (world.ts): builder functions stay synchronous and keep their names; the returned group has its
  origin at the footprint centre on the ground; named parts World drives: `spin`, `spinY` (userData.speed), `swing`,
  `shuttle` (userData.base, userData.range), `smoke` (must exist synchronously; soft sprite puffs), `company-logo`
  (MeshBasicMaterial whose map World.setCompanyLogo sets, possibly before the GLB arrives), `level` and `crane`
  (`craneJib`). GLTFLoader renames duplicate node names, so carry roles in glTF extras and rename after load.
  Mine ore piles take DEPOSIT_COLOUR; doors face +x and +z. Buildings cast and receive shadows. A late or missing
  GLB must never crash the game or leave a building invisible.
- Check every building close up and from the whole-Site view in Demo Mode Era 2, and that moving parts move.

Session-2 priority list (fix in this order, check each in Blender previews and game screenshots):
1. White and plasticky: nearly every building is the same clean white with pale grey roofs. Wanted: varied,
   believable materials per building (weathered corrugated cladding in muted colours, brick, concrete, dark bitumen
   or standing-seam roofs, galvanised steel), dirt and rain streaks, darker bases, panel joints. Bake ambient
   occlusion (small AO/ORM texture or vertex colours, whichever exports cleanly through glTF). Keep each building
   recognisable from the whole-Site view and keep the PRODUCT_COLOUR accents.
2. The Mine's ore piles are flat saturated orange blobs: heaped crushed ore, rough and textured, tinted by
   DEPOSIT_COLOUR but not neon.
3. Smoke: soft camera-facing sprite puffs (canvas texture made lazily). World overwrites each puff's `scale`, so
   put the Sprite as a child of each puff with a fixed scale; the `smoke` group must exist synchronously.
4. Level sign (`buildLevelSign`): a small plaque with 1–n stars instead of the pole with gold icosahedra.
5. HQ flag: gently waved cloth; Company logo visible close up.
6. Verify in the game: moving parts move (two shots a second apart), the crane during an upgrade, every building
   close up, the title-screen Site, lamps and windows not glowing too much by day, glass reflecting the sky.
7. Budget: researchLab and hq under 30k triangles; report the `MODEL …` lines and the GLB size (9.7 MB before).
8. No flash of the old code-built model before the GLB arrives: preload before the first Site is shown if simple
   and safe, else a neutral placeholder; a late or failed GLB must never crash or leave a building invisible.
```

## Prompt: stream 3 (rockets and the Launch scene)

```
<shared rules>
Your files: src/world/rocketMesh.ts, src/world/launchView.ts, public/textures/launch/**, docs/art/assets-launch.md.
Read both files fully, plus src/ui/launchShow.ts (how the view is driven; do not change its behaviour or the flight
timeline), src/game/launchVehicles.ts and docs/research/launch-vehicles.md (real shapes and sizes). Look at
screenshots/…/ticket-10-liftoff.png and ticket-10-upper-stage-flight-over-earth.png for the old look.

Make the Launch look real, like launch footage:
1. Rockets (Juno I, Thor-Able, Thor-Delta, Delta D, Falcon 9): keep `buildRocket`, `RocketModel`, `StageModel`,
   stage separation, the spinning tub, the Spacecraft on top and the Company logo decal exactly as the code contract
   has them, but model them properly: smooth lathe profiles with ≥ 48 segments, real proportions and paint schemes
   from the research note, panel lines, raceways, fins, interstages, engine bells with glowing throats, PBR painted
   metal (subtle normal/roughness detail), no flat shading. No real logos or agency markings.
2. Pad scene: reuse the sky/environment module from stream 1 (`src/world/environment.ts`) so the sky, sun and
   reflections match the Site; realistic Florida coast ground (PBR sand/scrub/concrete textures, a proper concrete
   pad with flame trench, a service tower/gantry with real truss detail, lightning masts, blockhouse, road, sea with
   the stream-1 water material if it can be shared). Shadows on the pad.
3. Exhaust and smoke: a shader or sprite-based plume (bright core, shock-diamond hint, soft falloff, flicker) and
   billowing volumetric-looking smoke/steam from soft lit sprites instead of faceted blobs; a ground cloud at
   liftoff; a contrail during the climb. Keep it cheap: this view already falls back to a "Simple view" on slow
   devices (see launchShow.ts) and that fallback must keep working.
4. Climb and space shots: sky darkening with altitude that looks physical; stars; the Earth below uses stream 4's
   Earth (call `buildEarth` as today; do not edit earthMesh.ts).
Test with a full Launch in Demo Mode Era 2 (step list in HANDOFF.md) and Era 1 (Juno I), at 1280×800.
```

## Prompt: stream 4 (Spacecraft, Earth and space views)

```
<shared rules>
Your files: src/world/spacecraftMesh.ts, spacecraftView.ts, spaceView.ts, earthMesh.ts, earthTexture.ts,
globePicker.ts, blueMarble.ts (only if replaced), scripts/build_*.py for new Earth pictures, public/textures/earth/**,
docs/art/assets-space.md, docs/research/earth-map.md (add how the new pictures were made).
Read those files and their tests (earthMesh.test.ts, earthTexture.test.ts must keep passing: `surfaceAt`, `SURFACES`
and `latLonOf` drive gameplay and must not change). Old look: screenshots/…/ticket-07-era-2-mission-designer.png,
ticket-31-whole-earth-and-orbit.png.

1. Earth: a photographic globe. Build a 4096×2048 (or 5120×2560) colour map from NASA Blue Marble: Next Generation
   through NASA GIBS WMTS (how: docs/research/earth-map.md and scripts/build_blue_marble.py; eoimages.gsfc.nasa.gov
   is unreachable from here), saved as a JPG ≤ ~2.5 MB in public/textures/earth/. Add a specular/ocean mask (from the
   existing Natural Earth land data), sun glint on the oceans, a soft realistic cloud layer with shadows (a real
   cloud picture if a public-domain one can be fetched, else good procedural clouds), a thin Rayleigh-blue atmosphere
   rim with a proper day/night terminator, and optionally night lights if a public-domain picture is reachable.
   Keep the existing baked picture as the fallback while the JPG loads or if it fails. Credit lines needed by NASA
   (Blue Marble: "NASA Earth Observatory"; the GIBS acknowledgement) are already in the game; say in your report if
   anything new needs a credit. The same Earth is used by the Mission Designer backdrop, the space view, the Launch
   view and the globe picker.
2. Spacecraft: keep `buildSpacecraft(design)` and every Part's place and identity (Bus sizes, Solar Cells, Battery,
   antennas, spin, Payloads, Main Engine, adapter), but make it look like real flight hardware: smooth geometry, PBR
   metals, gold/silver multi-layer insulation with a crinkled normal map, solar cells with cell grid and blue-violet
   sheen, brushed aluminium, white thermal paint, fasteners, antennas with real shapes. Good studio-style lighting
   and an environment map in the Mission Designer view so metals reflect; crisp sun and Earth-shine in space views.
3. Stars: a realistic star field (varied brightness and colour, a faint Milky Way band) instead of uniform points.
Test in the Mission Designer (Demo Era 1 and Era 2, every Part option) and the Space view after a Launch.
```

## Prompt: stream 5 (trees, rocks, props and the Shipping truck)

```
<shared rules>
Start only when streams 1 and 2 are done. Your files: new src/world/vegetation.ts (and helpers),
src/world/shippingView.ts, public/models/nature/**, public/textures/nature/**, docs/art/assets-nature.md; in
src/world/world.ts and siteMesh.ts only the small hooks needed to add, clear and dispose scenery (say exactly what
you changed).
1. Vegetation: realistic trees and bushes scattered by terrain kind and climate with the stream-1 hooks (surface
   height, slope, terrain kind): broadleaf and conifer on grass/hills, sparse scrub and palms or cacti in deserts,
   none on rock, snow-dusted in snowy Sites; denser off the Site than on it; deterministic from the Seed (use
   src/site/random.ts so a Site always looks the same); never on Deposits, water, building footprints (cleared when a
   building is placed, like clearRocks) or the Shipping route. Instanced, with wind sway in the vertex shader, alpha
   tested leaf cards that cast shadows, and a hard budget (≤ ~1.2M triangles on screen, far trees thinned or dropped).
   Make the trees in Blender by script (trunk and branches plus leaf-card clusters from a CC0 leaf atlas, e.g.
   ambientCG) and export small GLBs, or bake a few from the MIT `@dgreenheck/ez-tree` generator at build time and
   export them with GLTFExporter (do not ship ez-tree as a runtime dependency: it is 24 MB).
2. Rocks and ground clutter: boulders on hills and mountains from decimated CC0 scans (Poly Haven `rock_07`,
   `rock_09`, `boulder_01`, catalogue in `.leap/ph_models.json`) or good procedural ones.
3. The Shipping truck, its cargo, the dock and the road: a realistic flatbed truck with the Spacecraft under a
   cover or in a container as today, wheels that turn, a paved road that follows the ground. Keep ShippingView's
   API and timing.
```

## Prompt: stream 6 (credits, docs, tests, screenshots)

```
<shared rules>
Runs last. Read docs/art/assets-*.md and docs/graphics-overhaul/notes-*.md.
1. Credits: add a section to the in-game Credits screen (src/ui/credits.ts, strings in src/strings.ts, links in
   src/game/sources.ts in the existing pattern, with its test) listing every third-party texture and model with
   author/site and licence (Poly Haven CC0, ambientCG CC0, NASA imagery, three.js addons), and that the 3D models
   were made in Blender by AI agents. Mirror it in README.md (Credits, How AI was used, Licence) and
   docs/submission.md if it lists assets.
2. Docs: GDD "Look" section (now realistic, not low-poly), a new ADR if the look change contradicts an old one,
   GLOSSARY only if a term changed, a new ticket file in docs/tickets/ in the existing format with "As built",
   CHECKLIST, and the PROGRESS.md handoff.
3. Screenshots: new feature screenshots in screenshots/development-NASA_resources/ following its README.
4. Run `npm run check` and a production build (`npx tsc --noEmit && npx vite build`); report bundle and asset sizes.
```

## Stream 7: play-test, then ask

Play Demo Era 1 and Era 2 end to end, a new Company (several places: desert, snowy, river, lake), Free Play, the
Mission Designer, a Launch, the Space view, Plot buying, building upgrades (crane), the tutorial, and 1024×768.
Watch the console for errors and the frame rate. Fix what is found (through an Opus agent). Then show the team
before/after screenshots and **ask for their acceptance before the final merge into `main`**.
