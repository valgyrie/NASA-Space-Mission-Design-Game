# 49: Realistic graphics _(added 2026-11-14)_

**What to build:** the team asked for the blocky, voxel-like low-poly look to be replaced by realistic graphics, with better land and models. Blender and downloaded assets are allowed if every one is credited. Gameplay, saves and Seeds must not change: only how things are drawn. The team accepts the result before the final merge into `main` (ADR-0005).

**Blocked by:** 26

**Status:** built in seven streams on the `realistic-graphics` branch (14–15 Nov 2026); the Launch scene was still being finished when this was written. Waiting for the play-test and a team test.

- [x] The Site's land is smooth, with photo textures and no visible tiling; Deposits read as ore-stained stony ground; checked in temperate, desert, snowy, mountain, lake, river and coast Sites
- [x] Sky, clouds, haze, water and sun shadows look real and match between the Site and the Launch
- [x] The ten buildings, the crane and the foundations are Blender models (Draco GLB, each under 30k triangles) with weathering and baked shading; code-built stand-ins if loading fails; moving parts, smoke, level signs and the HQ flag still work
- [x] Trees, bushes, cacti and boulders by climate, never on buildings, Deposits, water or the Shipping road; the Shipping truck and dock
- [ ] Rockets, launch pads, flame, smoke and the climb in the Launch (first pass built; the climb not yet checked on screen)
- [x] The Earth is a NASA photo with real clouds, city lights and a thin atmosphere; Spacecraft look like flight hardware; stars vary and show the Milky Way
- [x] Every third-party file is CC0 or public domain, listed in `docs/art/assets-*.md` and in Credits; a test checks the Poly Haven and ambientCG pages
- [x] README, submission text, GDD §13 and §14, ADR-0005, Checklist; favicon
- [x] Type check and all tests pass; production build works
- [ ] Full play-test: Demo Eras 1 and 2, a new Company in several places, Free Play, the Mission Designer, a Launch, the Space view, buying Plots, an upgrade, the tutorial, 1024 × 768; no console errors (stream 7)
- [ ] Frame rate on a school-class laptop with integrated graphics
- [ ] Team test and go-ahead before the final merge into `main`

**As built (2026-11-15):**
- **Land, water, sky, light (stream 1):** one smooth ground mesh from the Site's tiles, flat pads for buildings with graded skirts. Five Poly Haven photo textures (grass, sand, rock, snow, soil), sampled with Inigo Quilez's texture-repetition technique so no grid shows; rock on slopes and summits, beaches, wet sand, soil patches. Deposits are stony ground stained in the ore's colour with clusters of ore rocks. Water with ripples at four scales, sky reflection, sun sparkle, turquoise shallows and thin foam. A gradient sky with clouds and a matching haze; the sky also lights and reflects in everything. One shadow map. Notes: `docs/graphics-overhaul/notes-terrain.md`.
- **Buildings (stream 2):** `scripts/blender/` builds the ten buildings, the crane and the foundation; `public/models/buildings.glb` (8.9 MB). Muted, weathered materials from ten Poly Haven textures, ambient occlusion and dirt baked into vertex colours, cars, shrubs and hedges, chain-link fences. Smoke is soft sprites; the level sign has gold stars; the HQ flag waves with the Company logo. Notes: `notes-buildings.md`.
- **Spacecraft, Earth, space (stream 4):** the Earth uses NASA Blue Marble (4096 × 2048), the clouds of one real day from VIIRS, Black Marble city lights and a water map drawn from Natural Earth (no OpenStreetMap data), with a soft day/night line, glint on water only and a thin blue rim. Spacecraft parts have gold and silver foil, solar cells with a cell grid, brushed metal, real antenna shapes and engine bells with dark throats, under studio light. 4,200 stars with real-looking brightness and colour and a faint Milky Way. Notes: `notes-space.md`.
- **Trees, rocks, truck (stream 5):** beech, oak, spruce, fir-like pine, palm, thorn tree, bush, scrub and cactus shapes, built in code from ambientCG leaves and bark, swaying in the wind, placed by climate and slope with the Seed, so the same Site always has the same trees. Boulders on hills. A 1960s truck and trailer, a dock with a jib crane on a gravel bank, an asphalt road. Notes: `notes-nature.md`.
- **Rockets and the Launch (stream 3):** the Site's sky, ground and sea round the pad, a photo concrete hardstand; pads from `scripts/blender/build_launch.py` (`public/models/launch.glb`, 3.5 MB): a late-1950s Cape pad and a modern Falcon 9 pad with tower, flame trench and tank farm. Smooth rockets with painted-metal wear and real engine bells; a soft flame with shock diamonds, lit billowing smoke, a ground cloud and a contrail; the sky darkens as the rocket climbs. Notes: `notes-launch.md`.
- **Credits and docs (stream 6):** a **3D models and textures** section in Credits lists every texture by name and author with a link, grouped as land, buildings, launch pads (Poly Haven) and trees (ambientCG), plus three.js add-ons, the Draco decoder (Google, Apache 2.0) and Inigo Quilez's technique. Real data gained NASA Black Marble and the VIIRS clouds. Blender joined the Software list. README, submission text, GDD, ADR-0005 (ADR-0001 points to it), `docs/art/README.md` note, an SVG favicon (no more `/favicon.ico` 404).
- Gameplay code is untouched (in `src/game/` only the credit links in `sources.ts` changed); saves and Seeds load as before.

**Sizes:** models 12.6 MB (`buildings.glb` 8.9 MB, `launch.glb` 3.5 MB, Draco decoder 0.25 MB); textures 6.1 MB (Earth 2.9 MB, land 2.5 MB, trees 0.4 MB, launch 0.2 MB). Textures are 1024 px (tree atlas 1024 × 1536), the Earth 4096 × 2048. Main script bundle 1.4 MB (409 KB gzipped).

**Open points (from the notes files; fix in the play-test if they bother the team):**
- Not profiled on a typical school laptop: on this PC's integrated graphics the whole-Site view runs at about 14 fps with trees (16 without) in headless tests.
- Touching buildings on different levels show a step; steep inland cliffs read dark; snow fields are flat white from far; the sea is a deep blue from the whole-Site view; the three Deposit kinds are hard to tell apart from far.
- The truck drives straight through buildings that stand on its route (the road stops at their edges); the route is gameplay.
- The Space view lights the Earth from behind the camera, so it never shows a night side there.
- The Era illustrations were made for the old look (`docs/art/README.md`).
- three r187's `DRACOLoader` also makes Vite copy its own decoder into `dist/assets/` (about 1.3 MB, never loaded, since the game points the loader at `public/models/draco/`).

**Sources:** asset lists with authors, links and licences in `docs/art/assets-terrain.md`, `assets-buildings.md`, `assets-launch.md`, `assets-nature.md`, `assets-space.md`; Earth imagery research in `docs/research/earth-map.md`. Work log and agent prompts: `docs/graphics-overhaul/HANDOFF.md`.
