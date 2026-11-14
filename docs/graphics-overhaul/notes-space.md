# Stream 4 notes: Earth, Spacecraft, space views

Session 3, 14 Nov. Working state: type check and 476 tests pass. Cut short by the usage limit; rough edges below.

## Module map

| File | What |
|---|---|
| `scripts/build_earth_textures.py` | Fetches NASA GIBS tiles, writes `public/textures/earth/{colour,clouds,lights}.jpg`, `water.png` (2.7 MB). Runs in Blender's Python (no Pillow on this machine). Tiles cached in `.leap/art-src/space/tiles/`. |
| `src/world/earthMesh.ts` | `buildEarth(radius) → { earth, spin, setSun }` (setSun is new, optional). Three ShaderMaterials: planet (soft terminator, glint on water only, cloud shadows, city lights, blue slant haze), cloud shell, atmosphere shell (Rayleigh limb, back side, additive). Sun = scene's first DirectionalLight, read in `onBeforeRender`, unless `setSun` fixed it. Shared uniforms switch every globe from the baked fallback (`earthTexture.ts`) to the photos when they load. Brightness `power` is 2.4 with tone mapping, 1.25 without (globe picker). |
| `src/world/earthTexture.ts`, `blueMarble.ts` | Unchanged (gameplay + fallback picture). |
| `src/world/stars.ts` | `makeStars(radius)`: 4,200 stars, magnitude-like brightness, temperature colours, crowded along a tilted galactic plane, round soft points (PointsMaterial + `onBeforeCompile` per-star size), plus a faint Milky Way glow child that follows the material colour (Launch view fades it). Still re-exported from `spacecraftView.ts`. |
| `src/world/spacecraftMaterials.ts` | `SC` PBR materials (gold/silver MLI, brushed aluminium with anisotropy, anodised, white/black paint, iridescent solar cells, bell, throat, lens…). `dressSpacecraftMaterials()` makes canvas textures once, browser only. |
| `src/world/spacecraftMesh.ts` | Same structure and Part logic as before; palette `S` mapped onto `SC`; `box()` = RoundedBoxGeometry; 48-sided rounds; textured solar panels with corner fasteners; lathe bell nozzle with dark throat; foil-wrapped motor case. |
| `src/world/spacecraftView.ts` | RoomEnvironment PMREM (`environmentIntensity` 0.55), Sun key + blue Earth-shine + rim; backdrop Earth sun fixed in camera frame (`EARTH_SUN`). |
| `src/world/spaceView.ts` | Dim RoomEnvironment (0.25), Earth-shine hemisphere, stronger Sun. |

## Checked

- Mission Designer, Demo Era 2 (Telstar design), wide and close: `.leap/shots/out/sp/designer2.png`, `designer2close.png`.
- Launch view orbit scene uses the new Earth and stars: `.leap/shots/out/sp/orbit.png` (before: `.leap/shots/out/s3/orbit.png`).

## Not checked / rough edges

- **Space view (SpaceView)** after a Launch and the **globe picker** were not screenshotted (out of time). Same
  Earth/star code; the globe picker has no tone mapping, so `power` drops to 1.25 there: check its brightness.
- Not every Part option was screenshotted (Era 1 Explorer 1 small bus, Large Bus, TV Camera, Main Engine bell).
- Glint retuned after the last orbit shot (was a large white blob); not re-shot.
- Antennas are still the old whip/slot shapes (now with metal materials and smoother geometry); no dish (no
  Part needs one). Battery cells keep the PRODUCT_COLOUR tint.
- Antarctic sea-ice belt in `clouds.jpg` is faded, not removed; swath seams faintly visible near the equator.
- The photo coastline (OSM/Blue Marble) and the 1° gameplay map differ slightly at coasts (picker clicks use the
  1° map).
- Credits: the water map is OpenStreetMap data (ODbL): stream 6 must add "© OpenStreetMap contributors".
  Black Marble: "NASA Earth Observatory". See `docs/art/assets-space.md`.
