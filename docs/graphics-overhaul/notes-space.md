# Stream 4 notes: Earth, Spacecraft, space views

## Session 5 (14 Nov, night): left-overs

Plan, in order: (1) licence fix for the water mask, (2) Space view, globe picker, Era 1 designs and Part options
checked on screen, (3) real antenna shapes, then the stream-5 rough edges (`notes-nature.md`).

- **Done: water mask without OpenStreetMap.** `public/textures/earth/water.png` is now 4096 × 2048 drawn from
  Natural Earth 1:10m land, minor islands, Antarctic ice shelves and lakes (public domain) by the new
  `scripts/build_earth_water.py` (NumPy only; run with Blender's bundled `python.exe`). The OSM layer is gone from
  `build_earth_textures.py`; no OSM credit is needed any more. The planet shader also drops the glint where the
  photo is ice-white (moved ice-shelf edges). Docs: `docs/research/earth-map.md` "Water mask", `assets-space.md`.
- **Done: sun glint** is now a wide silvery sheen from wave-slope statistics (Cox and Munk, slope variance 0.04)
  instead of a sharp white dot with a halo (`earthMesh.ts`, planet shader). Peak about twice the open sea.
- **Done: globe picker** (new-Company setup) uses ACES tone mapping like the other views; before, clouds clipped to
  flat white and the land was dim. Before/after: `.leap/shots/out/s5sp/companies.png`, `globe2_crop.png`.
- **Checked:** Era 1 Explorer 1 and Part options Small/Medium/Large Bus, Solar Cells, both antennas, TV Camera,
  Transponder, Radiation Detector, Main Engine (`.leap/shots/out/s5sp/parts/*`; designs set with
  `.leap/shots/js6/design.js|<rad|large|medium|smalltv>` before opening the designer). They read well.
- **Done: antennas** (`spacecraftMesh.ts`): each whip is flange + screws, glass-fibre insulator, brass ferrule,
  coil spring, tapered whip, small tip weight; slot antennas are a dark slot on a doubler plate with a glass-fibre
  cover and two rows of screws; the Transponder's command antenna is a slotted cylinder with collars and a radome.
  Same places and Part identities. Close shots: `.leap/shots/out/s5sp/parts/era1_root.png`, `era1_slot.png`,
  `medium_top.png`.
- **Done: no orange ring round the Earth** when the Sun is behind the eye (Space view, globe picker, the Launch
  view's "at work" shot): the atmosphere's warm terminator tint now needs the terminator seen from the side.
- **Checked: Space view** after a Launch (Demo Era 2, Telstar 1): orbit line, label and dot, Reference paths
  (dashed, warm, with the Moon) and the Earth all read; `.leap/shots/out/s5sp/space/space1.png`, `space1close.png`,
  `refs.png`, `refsfar.png` (the dev route: hide `.launch` after the Launch, then click "Space view";
  `.leap/shots/js6/space.js`, `refs.js`).

Rough edges left (session 5):
- The Space view lights the Earth from behind the camera, so it is always a full disc (no day/night line). It is a
  design choice of `spaceView.ts` (the player sees their orbit over a lit Earth); left as is.
- Reference path markers are big soft orange glows (`referencePaths.ts`, looked at only).
- Seen from straight below, the launch adapter is a black disc (metal facing a dark room floor).
- Battery cells keep the yellow PRODUCT_COLOUR tint (reads as the Site's battery colour).
- Cloud picture: faded Antarctic sea ice and faint swath seams near the equator (unchanged).

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
- The photo coastline (Natural Earth 1:10m / Blue Marble) and the 1° gameplay map differ slightly at coasts (picker
  clicks use the 1° map).
- Credits: (session 5) the water map is now Natural Earth (public domain): **no OpenStreetMap credit is needed**.
  Black Marble: "NASA Earth Observatory". See `docs/art/assets-space.md`.
