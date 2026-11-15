# Realistic look instead of cozy low-poly

The game first had a cozy, flat-shaded low-poly world (ADR-0001, ticket 26). On 14 Nov 2026 the team asked for it to be replaced by realistic graphics and allowed Blender and downloaded assets, as long as everything is credited. So the world now aims to look like a photo of a real place: smooth land with photo textures, a physical-looking sky, water and sun shadows, trees by climate, and a NASA photo of the Earth. Gameplay, saves and Seeds did not change; only how things are drawn (ticket 49).

- **Models are built by script.** AI coding agents write Blender Python scripts (`scripts/blender/`) that build, weather and bake the buildings and launch pads and export them as Draco-compressed GLB files (`public/models/`). The game loads them lazily and keeps simple code-built models as stand-ins until they arrive or if they fail. Rockets, Spacecraft, trees and the Shipping truck are built in code.
- **Free assets only.** Every third-party file is CC0 or public domain (Poly Haven, ambientCG, NASA imagery, Natural Earth) and is listed with its author, source and licence in `docs/art/assets-*.md` and in the in-game Credits.
- **Budgets.** One GLB per group, each building under 30k triangles (`buildings.glb` 8.9 MB, `launch.glb` 3.5 MB). Textures 1024 px (the tree atlas 1024 × 1536); only the Earth is larger (4096 × 2048). No extra full-scene render passes; one shadow map.

**Considered options:** keep low-poly and polish it (cheapest, smallest download, but not what the team asked for); a stylised look between the two (rejected for the same reason); hand-made or downloaded 3D models (rejected: models from scripts can be rebuilt, tuned and reviewed in git, and downloaded models rarely match the game's parts and licence rules).

**Consequences:**
- Download size: about 13 MB of models and 6 MB of textures on top of the code (the old look had none). They load after the first screen, so the game starts as before.
- Frame rate: fine on a mid-range graphics card; on integrated graphics the Site with trees runs at about 14 fps in headless tests (16 without trees). The team should test on a school-class laptop.
- Art must now fit the realistic look: Era illustration prompts in `docs/art/README.md` still describe the old look.
- Adding an asset means adding its credit in `docs/art/`, `src/game/sources.ts` and `src/strings.ts` (a test checks that every Poly Haven and ambientCG page in `docs/art/` is credited).
