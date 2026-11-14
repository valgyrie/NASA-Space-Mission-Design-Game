# Realistic graphics overhaul: handoff

Written 14 Nov 2026 by the orchestrating agent (Claude Fable) when usage ran low. Another agent continues from here.
Read "Session 4" and "Session 3: START HERE" first, then `notes-terrain.md`, `notes-buildings.md` and `notes-space.md` beside it (written by the two coding agents at
their checkpoint; if one is missing, that agent was cut off: inspect its files and screenshots instead).

## Session 4 (14 Nov, later): latest state, read before "Session 3"

A fourth orchestrator (Claude Fable) pulled session 3's work onto a second PC and went on from there. "Session 3:
START HERE" below still holds for everything not listed here.

- **Running in session 4 (the team's choice):** **stream 3** (rockets and the Launch scene) and **stream 5** (trees,
  rocks, Shipping truck), one Opus agent each. Their notes: `notes-launch.md` and `notes-nature.md` (written early
  and updated as they go). If a notes file exists but the work is uncommitted or looks half done, that agent was
  cut off: run the checks, look at the game, then re-run its prompt with what is left.
- **Stream 4 (Spacecraft, Earth, space views) is NOT being done in session 4.** Session 3 pushed it from the
  first PC after this note was written (commit "photographic Earth, new stars, Spacecraft materials and lighting"):
  it is mostly done. What is left, including one licence point, is under "Stream 4 left-overs" below.
- **Left after that:** stream 6 (credits, docs), stream 7 (play-test), then ask the team before the final merge.
- Agent prompts used in session 4: the session-3 header with the "Second PC" facts below instead of its machine
  facts, plus: the owned-files list of the stream, "another agent is editing other files in this checkout", and
  an order of work that leaves a visible gain if cut off (stream 3: sky and pad ground, rockets, exhaust and smoke,
  tower, climb; stream 5: temperate trees, other climates, truck and road, boulders).

### Second PC (Windows 11, repo in `Pictures/NASA-Space-Mission-Design-Game`)

- **Node is on PATH** (v24); `npm run typecheck` and `npx vitest run` work from the repo root.
- **Edge does not launch from `shot.mjs`; Chrome does.** Always pass
  `--browser "C:/Program Files/Google/Chrome/Application/chrome.exe"`.
- Dev server on **5173**, started with the preview tool from `.claude/launch.json` in the repo (not committed).
- `.leap/shots/` holds only `shot.mjs` (no `shot2.mjs`, no `s3/` shots, no `.leap/ph_models.json`). Site shots
  after session 3: `.leap/shots/out/s4/`.
- A local `git stash` on this PC holds two agents' unfinished session-2 edits to the land and buildings. Session 3
  replaced that work; the stash is only a safety copy and can be dropped.

## Session 3 (14 Nov, evening): START HERE

A third orchestrator (Claude Fable) continued on `realistic-graphics` and stopped when usage ran low. The team asked
for the work to be saved, the prompts for later agents written here, and everything pushed and merged into `main`
so another session can go on. The **final** look still needs the team's go-ahead before its last merge.

### State of each stream

| # | Stream | State | Notes file |
|---|---|---|---|
| 1 | Terrain, water, sky, lighting | **Done** (reviewed in screenshots). Small rough edges only | `notes-terrain.md` |
| 2 | Buildings in Blender | **Done** (reviewed). Draco GLB 8.9 MB, every building under 30k triangles | `notes-buildings.md` |
| 4 | Spacecraft, Earth, space views | **Mostly done** (reviewed: Mission Designer and orbit scene). Left-overs listed below | `notes-space.md` |
| 3 | Rockets and the Launch scene | Not started | |
| 5 | Trees, rocks, Shipping truck | Not started (streams 1 and 2 are done, so it can start) | |
| 6 | Credits, docs, tests, screenshots | Not started | |
| 7 | Play-test, fixes, ask the team | Not started | |

### Stream 4 left-overs (give these to an agent with the stream-4 files)

Done: photographic Earth (NASA Blue Marble, one real day of clouds, city lights, water-only glint, thin blue rim,
fallback to the old picture), new star field with a Milky Way, Spacecraft materials (foil, solar cells with a cell
grid, brushed metal, paint) and studio lighting. After shots: `.leap/shots/out/sp/designer2.png`, `orbit.png`.

- **Licence, before the final merge:** `public/textures/earth/water.png` comes from the GIBS layer
  `OSM_Land_Water_Map` (OpenStreetMap, **ODbL**, not public domain). Either credit "© OpenStreetMap contributors"
  in the game, `src/game/sources.ts` and the README, or rebuild the mask from the Natural Earth land data the
  game already has (public domain) and drop the OSM file. Black Marble (`lights.jpg`) needs "NASA Earth
  Observatory" in the Credits.
- **Not checked on screen:** the Space view after a Launch (orbit line, Reference paths), the globe picker (no tone
  mapping there, so the Earth may be dim), Era 1 designs, and the Part options Small Bus, Large Bus, TV Camera and
  Main Engine.
- The sun glint was a big white blob in `sp/orbit.png`; the agent toned it down afterwards but did not re-shoot.
- Antennas keep their old whip and slot shapes; faint swath seams in the clouds near the equator; faded Antarctic
  sea ice in the cloud picture.
- The Spacecraft on top of the rocket in the Launch view still looked flat: check it with stream 3.
- Stream 3 can call `buildEarth(...).setSun(dir)` to light the Earth independently of its scene lights.

### What to do first

1. `git status` and `git log --oneline -8`. Uncommitted changes are from an agent that was cut off (most likely
   stream 4). Run the checks, look at the game, and keep or finish them: do not throw them away unseen.
2. Start the dev server and take the screenshots below. Compare with the "what the orchestrator saw" lists.
3. Run two Opus agents at a time: **stream 3** together with the **stream 4 left-overs** (or stream 5); then
   **stream 5**; then **stream 6**; then the play-test (stream 7).
4. After each agent reports: look at its screenshots yourself, commit, and push the branch.
5. Show the team before/after screenshots and **ask before the final merge into `main`**.

### This machine (the team's Windows 11 PC, repo in `Downloads/Space-apps/`)

The session-2 notes about Node and Chrome further down did not hold here. What is true:

- **Node is not on PATH.** Bash: `export PATH="$PWD/.leap/node:$PATH"` (the launcher's private Node), then
  `npm run typecheck`, `npx vitest run` (476 tests on 14 Nov evening). The pre-commit hook runs `npm run check`, so
  commit from a shell with that PATH.
- **Chrome is not installed; Edge works.** Run `shot.mjs` without `--browser`.
- **Dev server:** `.claude/launch.json` sits one folder above the repo (`Space-apps/.claude/`), name `leap-dev`;
  start it with the preview tool. An older dev server may still hold port 5173, so the tool picks **5174**: pass
  `--url http://localhost:5174/` to `shot.mjs`.
- `.leap/shots/shot2.mjs` (made by the terrain agent, git-ignored) is `shot.mjs` plus: Vite's hot-reload socket
  blocked (other agents' edits no longer reload the page mid-shot), HTTP errors logged, an `evalfile:` step.
  Helpers in `.leap/shots/js/`, `climates.sh`, `sheet.sh`.
- Blender 5.3 headless: `"C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b --factory-startup -P x.py`.
  Its Python has NumPy and can pack textures; there may be no system Python.
- `gh` is not installed; `git push` works. Merge: `git push origin realistic-graphics:main` when `main` has not
  moved, else merge locally and push.
- Screenshots of session 3 (git-ignored): `.leap/shots/out/s3/` (before), `t3/` and `clim/` (terrain after), `b3/`
  (buildings after), `sp/` (space, if any).

### Header for every agent prompt (session 3 version)

Start each agent with the Agent tool, `subagent_type: general-purpose`, `model: opus`, two at a time. Paste this
header, then the stream's brief. It replaces neither the "Shared rules" block further down (the agent must read
and follow it) nor the stream prompt: it adds this machine's facts.

```
You are a coding agent on LEAP, a three.js (r187) + TypeScript + Vite browser game (a space-company tycoon for NASA
Space Apps 2026). Repo root: C:/Users/moham/Downloads/Space-apps/NASA-Space-Mission-Design-Game, branch
`realistic-graphics`. The team wants the old blocky voxel / flat low-poly look replaced by realistic graphics.
You own stream <N>: <name>.

Read first: AGENTS.md; docs/graphics-overhaul/HANDOFF.md (the "Shared rules" block is binding for you; "Prompt:
stream <N>" is your brief); docs/graphics-overhaul/notes-*.md for the modules you build on.

Machine facts (they override the handoff where they differ):
- Node is NOT on PATH. In Bash: export PATH="/c/Users/moham/Downloads/Space-apps/NASA-Space-Mission-Design-Game/.leap/node:$PATH"
  then `npm run typecheck` and `npx vitest run`. Never run launchers or scripts/leap.test.mjs.
- Blender 5.3, headless only: "C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b --factory-startup -P <script.py> -- <args>
- A dev server is already running at http://localhost:5174 (if down, try 5173). Do not start or stop servers.
- Screenshots: Chrome is not installed; default Edge works, so do NOT pass --browser:
  .leap/node/node.exe .leap/shots/shot.mjs --url http://localhost:5174/ --out .leap/shots/out/<dir> --steps "<steps>"
  (`.leap/shots/shot2.mjs` is the same but immune to hot reloads caused by another agent's edits.)
- Do NOT commit, push, stash or switch branches. No new npm dependencies (three's examples/jsm is fine).
- Usage may run out at any moment: write docs/graphics-overhaul/notes-<stream>.md early (plan, done, half done,
  left) and update it after every step; keep the type check, the tests and the game working after every step.
- Finish: type check and all tests pass; notes file current; final report with what changed, assets (name, author,
  URL, licence), test results, best before/after screenshot paths, rough edges, and what you need from files you
  do not own.
```

### What the orchestrator saw in session 3, per remaining stream (add to the stream's prompt)

**Stream 4 (Spacecraft, Earth, space views).** Before shots: `.leap/shots/out/s3/designer.png`, `orbit.png`.
- Earth is a cartoon globe: blurry land, flat blue sea, clouds as hard white blobs, a thick bright-blue outline
  ring instead of an atmosphere, a flat white spot for sun glint, no night side. Wanted: passes for a photo from
  orbit: Blue Marble colour at 4096×2048 or more, real-looking clouds with soft shadows, glint on water only, thin
  Rayleigh-blue limb fading to space, soft terminator, optionally city lights.
- Spacecraft is flat-shaded boxes and prisms in solid colours (mustard panels, plain dark-blue rectangles as solar
  cells, grey cylinders). Wanted: flight hardware as in a clean-room photo: bevelled geometry, crinkled gold and
  silver insulation, solar cells with cell grid and busbars, brushed and anodised aluminium, white thermal paint,
  fasteners, antennas with real shapes, engine bell with a dark throat. Every Part choice must still change the
  model the same recognisable way, and each design must keep looking like its real counterpart.
- Studio light and an environment map in the Mission Designer; crisp sun and Earth-shine in space.
- Stars are uniform white dots: vary brightness and colour, add a faint Milky Way band.
- Extra files it may own: new helpers under `src/world/` (e.g. `stars.ts`), `scripts/blender/build_spacecraft.py`
  (may import `lib.py`, not edit it), `public/models/spacecraft.glb`, `public/textures/space/**`,
  `docs/graphics-overhaul/notes-space.md`. `src/ui/**` is off limits. `buildEarth` and `buildSpacecraft` keep
  their signatures (the Launch view calls them). Check the globe picker too (new Company → pick a place).

**Stream 3 (rockets and the Launch scene).** Before shots: `.leap/shots/out/s3/pad.png`, `climb.png`.
- The pad is a flat beige plane with a grey slab, a flat green strip and a flat blue strip for the sea, under a
  plain light-blue sky. The tower is a red stick frame. The rocket is a faceted grey lathe with black bands. The
  exhaust is a solid white cone. During the climb there is no smoke, no contrail, and the ground is a pale blue blur.
- Use `createSkyEnvironment` from `src/world/environment.ts` (see `notes-terrain.md`) so the sky, sun, clouds and
  reflections match the Site; the water shader in `water.ts` may be reusable for the sea.
- The stream-2 pipeline (`scripts/blender/lib.py`, Draco GLB, `buildingModels.ts`) can be reused for the pad
  structures (service tower, blockhouse, lightning masts) in a new `scripts/blender/build_launch.py` and
  `public/models/launch.glb`. Rockets may also be authored in Blender if stage separation, the spinning tub, the
  Spacecraft on top and the Company logo decal keep working.

**Stream 5 (trees, rocks, truck).** The land has no vegetation at all, so green hills look bare. Stream 1 left the
hooks: `Ground.surfaceAt/heightAt/normalAt/slopeAt/terrainAt/isWater/depositAt/onPad`, `SceneryLayer` with
`world.addScenery(layer)` (`build` runs on `showSite`/`redrawLand`, `clearPad` on `addBuilding`) and the `scenery`
group (`sceneryOf`). Details in `notes-terrain.md`. Building grounds have shrubs and hedges, no trees: landscape
trees must look right beside them. Shipping before shot: `.leap/shots/out/s3/shipping.png`.

**Stream 6 (credits, docs).** Besides the stream-6 prompt below:
- Credits must list, from `docs/art/assets-*.md`: the Poly Haven textures (terrain: Rocky Terrain 02, Aerial Beach
  01, Aerial Rocks 02, Aerial Ground Rock, Snow Field Aerial; buildings: Box Profile Metal Sheet, Concrete Floor
  02, Factory Brick, Asphalt 02, Painted Metal Shutter, Painted Plaster Wall, Gravel Floor, Corrugated Iron 02,
  Worn Corrugated Iron, Rocky Gravel; all CC0), the three.js Draco decoder (Google, Apache 2.0, in
  `public/models/draco/`), three.js `Sky` and addons (MIT), Inigo Quilez's texture-repetition technique (credit as
  a courtesy), and whatever streams 3–5 add (NASA Blue Marble / GIBS for the Earth).
- `index.html` has no favicon: the two 404s in the console are both `/favicon.ico`. Add
  `<link rel="icon" href="data:,">` or a real icon.

**Rough edges left in streams 1 and 2** (fix in the play-test if they bother the team):
- Touching buildings with different foundation levels show a vertical step; steep inland cliffs look dark; snow
  fields are flat white from far; the sea is a deep dark blue from the whole-Site view (`deep` in `water.ts`).
- Ore colour strength: the 0.16 cap sits in both `terrainMesh.ts` and `rocks.ts`; change them together.
- From the whole-Site view the three Deposit kinds are hard to tell apart (all read blue-grey) and the buildings
  look dark: the orchestrator saw this in `t3/site.png`; raise the ore cap or add a clearer cue if the team agrees.
- Level-sign stars only read close up; shrubs are faceted very close up; pale walls look lighter in the game than
  in Blender previews.
- Not profiled on integrated graphics yet.

## Session 2 (14 Nov, afternoon): history

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

### This machine (session 2's notes: Windows 11, differs from the notes further down)

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
