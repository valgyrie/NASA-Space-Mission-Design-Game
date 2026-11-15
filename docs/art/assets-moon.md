# Moon assets (the Moon, its surface, the Moon rockets and craft)

Written by the orchestrator on 15 Nov 2026 when the 3D agent was stopped for the usage limit; the 3D agent's own
notes for this file were not written. **Next session: check every row against the code and add the hardware-shape
references used (NASA pages for Saturn V, the Lunar Module, the CSM, Orion, SLS, Mobile Launcher 1, the LUT).**

NASA imagery is public domain (not copyrighted in the US); NASA asks for credit.

| File | Source | Author | URL | Licence / credit |
|---|---|---|---|---|
| `public/textures/moon/colour.jpg` (4096×2048) | CGI Moon Kit: `lroc_color_poles_4k.tif`, the LRO Camera (LROC WAC) colour mosaic | Ernie Wright, NASA's Scientific Visualization Studio | https://svs.gsfc.nasa.gov/4720 | Public domain; credit "NASA's Scientific Visualization Studio" |
| `public/textures/moon/normal.jpg` (2048×1024) | CGI Moon Kit: `ldem_16_uint.tif`, LOLA elevation (16 px/degree), turned into a normal map by `scripts/blender/build_moon.py` | Ernie Wright, NASA's Scientific Visualization Studio (LOLA data: NASA GSFC) | https://svs.gsfc.nasa.gov/4720 | Public domain; credit "NASA's Scientific Visualization Studio" |

Originals (not shipped) are downloaded into `.leap/art-src/` by whoever re-runs `build_moon.py` (see its header).

Made in code, no outside assets: the lunar surface patches (`src/world/moonSurface.ts`, `moonTerrain.ts`), the
landing dust (`moonDust.ts`), the Apollo CSM and Lunar Module, Orion, the ICPS, the neutral crewed lander, the
astronauts and the laser retroreflector (`moonCraft.ts`), Saturn V and SLS (`rocketMoon.ts`), and Kennedy LC-39A
and LC-39B with their Mobile Launchers (`launchPad.ts`). No agency logos, flags or lettering on any of them.

Caption facts in `src/strings.ts` (`moonShow.*`) were taken by the 3D agent from NASA pages; the sources are to be
listed here by the next session (see the note at the top).
