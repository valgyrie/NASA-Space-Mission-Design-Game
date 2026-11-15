# Moon assets (the Moon, its surface, the Moon rockets and craft)

First written by the orchestrator on 15 Nov 2026; rows checked against `scripts/blender/build_moon.py` and
`src/world/moonGlobe.ts`, shape references and caption sources added the same day (all pages opened 15 Nov 2026).

NASA imagery is public domain (not copyrighted in the US); NASA asks for credit.

| File | Source | Author | URL | Licence / credit |
|---|---|---|---|---|
| `public/textures/moon/colour.jpg` (4096×2048) | CGI Moon Kit: `lroc_color_poles_4k.tif`, the LRO Camera (LROC WAC) colour mosaic, centred on 0° longitude; saved as JPEG by `build_moon.py` | Ernie Wright, NASA's Scientific Visualization Studio | https://svs.gsfc.nasa.gov/4720 | Public domain; credit "NASA's Scientific Visualization Studio" |
| `public/textures/moon/normal.jpg` (2048×1024) | CGI Moon Kit: `ldem_16_uint.tif`, LOLA elevation (16 px/degree, half-metres relative to a radius of 1,727,400 m), turned into a normal map by `scripts/blender/build_moon.py` | Ernie Wright, NASA's Scientific Visualization Studio (LOLA data: NASA GSFC) | https://svs.gsfc.nasa.gov/4720 | Public domain; credit "NASA's Scientific Visualization Studio" |

`src/world/moonGlobe.ts` loads both files (colour map and normal map); nothing else from outside is used for the Moon.
In the game's Credits: `cgiMoonKit` in `src/game/sources.ts` (`ART_GROUPS.moon`).

Originals (not shipped): download the two `.tif` files from the SVS page into a folder (for example
`.leap/art-src/moon/`) and pass that folder to `build_moon.py` (see its header).

Made in code, no outside assets: the lunar surface patches (`src/world/moonSurface.ts`, `moonTerrain.ts`), the
landing dust (`moonDust.ts`), the Apollo CSM and Lunar Module, the S-IVB, Orion, the ICPS, the neutral crewed lander,
the astronauts and the laser retroreflector (`moonCraft.ts`), Saturn V and SLS (`rocketMoon.ts`), Kennedy LC-39A and
LC-39B with their Mobile Launchers (`launchPad.ts`), and the Science Package's seismometer (`spacecraftMesh.ts`).
No agency logos, flags or lettering on any of them.

## Hardware-shape references

NASA pages and drawings the shapes in code follow. Sizes in the code comments come from the same pages.

| Shape (code) | NASA reference | URL |
|---|---|---|
| Saturn V: S-IC, S-II, S-IVB, Instrument Unit, 111 m (`rocketMoon.ts`) | Apollo News Reference, "Saturn Launch Vehicles" (pp. 8–14, stage drawings and sizes); NASA: What was the Saturn V? (111 m, 363 ft) | https://www.nasa.gov/wp-content/uploads/static/history/alsj/CSMNewsRef-Boothman.html · https://www.nasa.gov/learning-resources/for-kids-and-students/what-was-the-saturn-v-grades-5-8/ |
| S-IVB at "Off to the Moon" (`moonCraft.ts`) | Apollo News Reference, "Saturn Launch Vehicles" and "LM & SLA Overview" (pp. 61–68: the adapter that holds the Lunar Module) | https://www.nasa.gov/wp-content/uploads/static/history/alsj/CSMNewsRef-Boothman.html |
| Apollo CSM, Columbia (`moonCraft.ts`), and the Launch Escape System on Saturn V (`rocketMoon.ts`) | Apollo News Reference, "Command Module Overview" (pp. 39–52), "Service Module Overview" (pp. 53–60), "Launch Escape Subsystem" (pp. 137–146) | https://www.nasa.gov/wp-content/uploads/static/history/alsj/CSMNewsRef-Boothman.html |
| Lunar Module, Eagle (`moonCraft.ts`) | LM News Reference (Grumman), "Lunar Module" (pp. LV1–17) and the LM Anatomy booklet insert | https://www.nasa.gov/wp-content/uploads/static/history/alsj/LMNewsRef-Boothman.html |
| Apollo spacesuit and backpack (`moonCraft.ts`, astronauts) | Apollo News Reference, "Spacesuits" (pp. 223–228); LM News Reference, "Crew Personal Equipment" and "Portable Life Support System" | https://www.nasa.gov/wp-content/uploads/static/history/alsj/CSMNewsRef-Boothman.html · https://www.nasa.gov/wp-content/uploads/static/history/alsj/LMNewsRef-Boothman.html |
| Laser Ranging Retroreflector (`moonCraft.ts`): 100 corner cubes in a 46 cm panel | NASA Goddard: Apollo laser ranging; NASA: Retroreflectors, from Apollo to Mars (photo) | https://eclipse.gsfc.nasa.gov/help/ApolloLaser.html · https://www.nasa.gov/image-article/retroreflectors-from-apollo-mars/ |
| EASEP's passive seismometer (the Science Package, `spacecraftMesh.ts`) | NASA photo AS11-40-5942: Aldrin carrying the seismometer and the reflector; NASA Science: Apollo 11 seismic experiment | https://www.nasa.gov/image-detail/amf-as11-40-5942/ · https://science.nasa.gov/resource/apollo-11-seismic-experiment/ |
| SLS Block 1: core stage, two five-segment boosters, stage adapter, 98 m (`rocketMoon.ts`) | NASA: SLS Reference Guide for Artemis II (December 2025) | https://www.nasa.gov/wp-content/uploads/2025/12/sls-5558-artemis-ii-sls-reference-guide.pdf |
| ICPS, the upper stage (`rocketMoon.ts`, `moonCraft.ts`) | NASA: SLS Reference Guide for Artemis II | https://www.nasa.gov/wp-content/uploads/2025/12/sls-5558-artemis-ii-sls-reference-guide.pdf |
| Orion with its European Service Module and solar wings (`moonCraft.ts`) | NASA: Orion spacecraft reference | https://www.nasa.gov/reference/orion-spacecraft/ |
| Orion's Launch Abort System with its ogive cover (`rocketMoon.ts`) | NASA: Launch Abort System reference | https://www.nasa.gov/reference/launch-abort-system/ |
| Mobile Launcher 1: 40 ft (12 m) square tower about 355 ft (108 m) tall (`launchPad.ts`) | NASA Exploration Ground Systems: Mobile Launcher | https://www.nasa.gov/humans-in-space/exploration-ground-systems/mobile-launcher/ |
| Saturn V's Mobile Launcher and Launch Umbilical Tower, nine swing arms (`launchPad.ts`) | NASA: Building KSC's Launch Complex 39 (fact sheet); NASA: 55 years ago, the first Saturn V rolls out | https://www.nasa.gov/wp-content/uploads/2026/07/facility-history-fact-sheet.pdf · https://www.nasa.gov/history/55-years-ago-the-first-saturn-v-rocket-rolls-out-to-the-launch-pad/ |
| LC-39A and LC-39B pads (`launchPad.ts`) | NASA: Building KSC's Launch Complex 39; NASA: Launch Pad 39B fact sheet; NASA: Kennedy's pads 39A and 39B (photo) | https://www.nasa.gov/wp-content/uploads/2026/07/facility-history-fact-sheet.pdf · https://www.nasa.gov/wp-content/uploads/2018/06/launchpad39b_factsheet_013018_508.pdf · https://www.nasa.gov/image-article/kennedy-space-centers-launch-pads-39a-39b/ |

The News Reference index pages link each section as a PDF; on 15 Nov 2026 the index pages loaded but the section PDFs
returned "not found" from this environment, so check a section's page numbers there before relying on a size.

## Sources behind the Moon sequence captions

Every fact in the `moonShow.*` captions in `src/strings.ts`, with the NASA page it comes from. Plans are marked as
plans in the captions. In the game's Credits these pages are under Reading sources (`SOURCES`, the History cards'
links and `VEHICLE_SOURCES` in `src/game/sources.ts`); `src/game/sources.test.ts` checks that every URL in this table
is there.

| String key | Fact | NASA URL |
|---|---|---|
| `moonShow.apollo11.tli.detail` | The S-IVB fired again 2 h 44 min after launch (ignition 2:44:16) for 346.83 s, 5 min 47 s. (NASA's overview page rounds it to "five minutes, 48 seconds".) | https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_11a_Summary.htm |
| `moonShow.apollo11.orbit.detail` | After the second burn: a lunar orbit of 62 by 70.5 miles (100 by 113 km) | https://www.nasa.gov/history/apollo-11-mission-overview/ |
| `moonShow.apollo11.undock.detail` | "At 100 hours, 12 minutes into the flight, the Eagle undocked and separated from Columbia" | https://www.nasa.gov/history/apollo-11-mission-overview/ |
| `moonShow.apollo11.descent.detail` | Powered descent: the descent engine fired for 756.3 s (12 min 36 s), from 102:33:05 to landing | https://www.nasa.gov/history/apollo-11-mission-overview/ · https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_11a_Summary.htm |
| `moonShow.apollo11.contact` | 102:45:40, Aldrin: "Contact Light." | https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.landing.html |
| `moonShow.apollo11.contact.detail` | Armstrong in the 1969 Technical Debrief: "I could see rocks and craters through this blowing dust." | https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.landing.html |
| `moonShow.apollo11.landed` | 102:45:58, Armstrong: "Houston, Tranquility Base here. The Eagle has landed." | https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.landing.html |
| `moonShow.apollo11.landed.detail` | Landing at 20:17:40 UTC, 20 July 1969 (ALSJ; SP-4029 gives 102:45:39.9, 20:17:39 GMT), at Tranquility Base | https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.landing.html · https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_11a_Summary.htm |
| `moonShow.apollo11.setup.detail` | Aldrin unloaded both packages and deployed the seismometer; Armstrong set up the laser reflector ("The laser reflector is installed and the bubble is level", 111:03:57). Armstrong and Aldrin spent 21 h 36 min on the surface | https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.clsout.html · https://www.nasa.gov/history/apollo-11-mission-overview/ |
| `moonShow.artemis2.sep.detail` | +03:24:15: Orion separates from the ICPS; the crew "transition the spacecraft to manual mode and pilot Orion's flight path" in the proximity operations demonstration | https://www.nasa.gov/artemis-ii-press-kit/ |
| `moonShow.artemis2.cubesats.detail` | +05:04: "CubeSats deploy at one minute intervals" | https://www.nasa.gov/artemis-ii-press-kit/ |
| `moonShow.artemis2.burn.detail` | "Translunar Injection by Orion's Main Engine"; the service module, provided by ESA, "fired its main engine" | https://www.nasa.gov/artemis-ii-press-kit/ · https://www.nasa.gov/news-release/nasa-welcomes-record-setting-artemis-ii-moonfarers-back-to-earth/ |
| `moonShow.artemis2.flyby.detail` | A free-return path: Orion "pulled back naturally by Earth's gravity", apart from small correction burns | https://www.nasa.gov/artemis-ii-press-kit/ |
| `moonShow.artemis2.earthset` | The crew photographed "earthset and earthrise" during the 6 April flyby | https://www.nasa.gov/news-release/nasa-welcomes-record-setting-artemis-ii-moonfarers-back-to-earth/ |
| `moonShow.artemis2.earthset.detail` | 252,756 miles from Earth, a record for human spaceflight | https://www.nasa.gov/news-release/nasa-welcomes-record-setting-artemis-ii-moonfarers-back-to-earth/ |
| `moonShow.artemis2.home.detail` | Splashdown off San Diego on 10 April 2026; mission length 9 days, 1 hour, 32 minutes | https://www.nasa.gov/news-release/nasa-welcomes-record-setting-artemis-ii-moonfarers-back-to-earth/ · https://www.nasa.gov/mission/artemis-ii/ |
| `moonShow.artemis3.orbit.detail` | Plan (23 Oct 2026, confirmed 4 Nov 2026): Artemis III in 2027; Blue Origin's Blue Moon test article waits in orbit at 273 miles (about 440 km) | https://www.nasa.gov/missions/artemis/nasas-artemis-iii-mission-to-test-future-moon-lander-operations/ · https://www.nasa.gov/missions/artemis/nasa-shares-plans-to-accelerate-artemis-return-to-moon/ |
| `moonShow.artemis3.camera.detail` | Apollo 9 (March 1969) tested the Lunar Module and its docking in Earth orbit. The camera satellite is a game idea | https://www.nasa.gov/mission/apollo-9/ |
| `moonShow.artemis3.relay.detail` | STS-6 deployed TDRS-1, the first Tracking and Data Relay Satellite, in April 1983. (Artemis III also studies health checks "when astronauts are unable to communicate directly with mission control".) | https://www.nasa.gov/mission/sts-6/ · https://www.nasa.gov/missions/artemis/nasas-artemis-iii-mission-to-test-future-moon-lander-operations/ |
| `moonShow.artemis3.spaceWeather.detail` | Solar particle events raise the dose; Orion's radiation sensor warns the crew to build a shelter from stowage bags | https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon/ |
| `moonShow.artemis3.approach.detail` | Plan: a crewed test of rendezvous and docking in Earth orbit (the Apollo 9 comparison is the game's) | https://www.nasa.gov/missions/artemis/nasa-shares-plans-to-accelerate-artemis-return-to-moon/ · https://www.nasa.gov/mission/apollo-9/ |
| `moonShow.artemis3.docking.detail` | Plan: the crew "assess the cabin environment, controls, and life-support systems firsthand" | https://www.nasa.gov/missions/artemis/nasas-artemis-iii-mission-to-test-future-moon-lander-operations/ |
| `moonShow.artemis3.docked.detail` | Plan: "approximately two days" aboard the lander test article, on a "planned 14-day mission" | https://www.nasa.gov/missions/artemis/nasas-artemis-iii-mission-to-test-future-moon-lander-operations/ |
| `moonShow.artemis4.orbit.detail` | Plan: "Artemis IV Moon landing mission in 2028"; the last landing was Apollo 17 in December 1972 | https://www.nasa.gov/missions/artemis/nasa-shares-plans-to-accelerate-artemis-return-to-moon/ · https://www.nasa.gov/mission/apollo-17/ |
| `moonShow.artemis4.undock.detail` | Plan: "The lander will bring two crew members to the lunar surface", while "two remain aboard Orion" | https://www.nasa.gov/missions/artemis/nasa-partners-accelerate-lander-development-for-2028-moon-missions/ |
| `moonShow.artemis4.relay.detail` | Straight to Earth, a south-pole site has 17–43% coverage; one relay raises it to 80–86% | https://www.nasa.gov/wp-content/uploads/2026/02/lcrns-esper-257-1.pdf |
| `moonShow.artemis4.cargo.detail` | IM-2, a NASA CLPS delivery, landed on 6 March 2025 near the south pole (Mons Mouton) | https://www.nasa.gov/news-release/nasa-receives-some-data-before-intuitive-machines-ends-lunar-mission/ |
| `moonShow.artemis4.mapper.detail` | LRO's laser altimeter (LOLA) maps the south pole's heights and its permanently shadowed regions | https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf |
| `moonShow.artemis4.descent` | Plan: the lander will "descend to the Moon's South Pole" | https://www.nasa.gov/missions/artemis/nasa-partners-accelerate-lander-development-for-2028-moon-missions/ |
| `moonShow.artemis4.descent.detail` | The Sun "never rises more than a few degrees above the horizon"; in the target landing regions "the highest possible elevation is 7°" | https://www.nasa.gov/centers-and-facilities/nesc/characterizing-the-visual-experience-of-astronauts-at-the-lunar-south-pole/ |
| `moonShow.artemis4.contact.detail` | Points on Shackleton crater's rim are sunlit more than 90% of the year; "the interior is perpetually in shadow" | https://science.nasa.gov/resource/shackleton-craters-illuminated-rim-shadowed-interior/ |
| `moonShow.artemis4.landed.detail` | Apollo 17 (December 1972) was the last crewed landing | https://www.nasa.gov/mission/apollo-17/ |
| `moonShow.artemis4.surface.detail` | Seen from the south pole, Earth "bobs up and down, never veering far from 0° longitude" while the Sun skims the horizon | https://science.nasa.gov/resource/earth-and-sun-from-the-moons-south-pole-2/ |

Corrected on 15 Nov 2026 against these pages: the S-IVB's burn (5 min 48 s → 5 min 47 s), Armstrong's quote (said in
the debrief, not at touchdown), who set up the reflector (Armstrong, not Aldrin), the free return ("no burn" → no big
burn), who stays in Orion (two crew; NASA does not say Orion waits in lunar orbit in both landers' plans), the 7° Sun
(the landing regions, not the pole itself, where it is 1.5°) and Earth's place in the polar sky.
