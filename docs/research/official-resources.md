# Official challenge Resources

What each Resource on the challenge's Resources tab really contains, the facts and numbers LEAP plans to use, and where. Captured and read on 2026-11-13. NASA's own descriptions of each Resource are in [`docs/challenge.md`](../challenge.md#resources); planned uses are in GDD §14. Nothing here is built yet.

## Design and Develop Science Missions

<https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf>

- 25 slides, 26 March 2025, from the "Access to Space for All" Systems Engineering Webinar Series of NASA's Small Spacecraft institute (www.nasa.gov/smallsat-institute). Presenter: Julie Levri, Flight Systems Engineer.
- **Slide 8, four segments:** Launch segment ("Launch vehicle and related services used to get the spacecraft into space"), Space segment ("Spacecraft and various components like orbiters, landers, rovers, and instruments used to collect data"), Ground segment ("Ground stations and mission control centers that communicate with the spacecraft, receive data, and manage the mission"), User segment ("Scientists and the public who will use the data collected by the mission for research and education").
- **Slide 10, six steps:** Identify Need & Goals → Define Concept → Define Requirements → Design → Build & Verify → Implement.
- **Concept of Operations** and **"Begin with the End in Mind"** (slide 15: the user segment first).
- **Requirements come with how they are verified** (slide 19): "When identifying requirements, also plan how you will verify that design satisfies requirements (prior to implementation). For example, < 250 g sample container is verified by weighing an empty sample container."
- Worked example throughout: **BioNutrients-2** on the ISS (launched on NG-18).
- **Planned in LEAP:** Segments on screen (ticket 32), the tutorial under the six steps (39), "begin with the end in mind" in Contracts (42), Build & Verify for Ground Tests (40).

## General Mission Analysis Tool (GMAT)

- NASA Software Catalog: GSC-19468-1, "General Mission Analysis Tool (GMAT) Version R2025a"; open source; Windows, Linux, Mac OS; download on SourceForge. <https://software.nasa.gov/software/GSC-19468-1>
- R2026a is the newest release on SourceForge (release notes in the project's file feed, 2026-11-13). <https://sourceforge.net/projects/gmat/>
- Goddard: "two million source lines of code"; "300,000 downloads since its inception"; uses include orbit and manoeuvre planning, launch windows, Monte Carlo, orbital event detection and End-of-Life modelling. <https://etd.gsfc.nasa.gov/capabilities/capabilities-listing/general-mission-analysis-tool-gmat/>
- A desktop program; it cannot run inside a browser game. It could not be installed in the build container (SourceForge blocks automated downloads), so nothing here was run in GMAT.
- **Planned in LEAP:** its trajectories via Mission Viz (ticket 34), LEAP's orbit maths tested against them (35), Open in GMAT (43, needs a person to try the file).

## Concept Maturity Levels (CMLs)

R. Wessen, C. Borden, J. Ziemer, J. Kwok (JPL), "Space Mission Concept Development Using Concept Maturity Levels", AIAA SPACE 2013. <https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299>

- Levels: CML 1 Cocktail Napkin, 2 Initial Feasibility, 3 Trade Space, 4 Point Design, 5 Baseline Concept, 6 Integrated Concept, 7 Preliminary Implementation Baseline, 8 PDR, 9 CDR.
- CML 1: "The science questions have been well articulated ... a rudimentary sketch of the mission concept and high-level objectives have been created." CML 2: "basic calculations have been performed". CML 3: "architectural trades between the spacecraft system, ground system and mission design". CML 4: "A specific design and cost that returns the desired science has been selected within the trade space and defined down to the level of major subsystems with acceptable margins and reserves."
- "There is a feedback loop between CMLs 2-4."
- Checklist statuses: green = completed, yellow = in the process of being completed, red = not yet started. "A mission concept is considered to be at a particular concept maturity level if 80% of the attributes in that column have been completed (green)." The paper adds that there is "nothing special about 80%" and that self-assessments "have a tendency to result in overly optimistic scores".
- **CML 4 checklist margins (Figure 8b):** spacecraft dry mass ≥ 35%, power ≥ 35%, energy ≥ 35%, flight software ≥ 100%, telecom ≥ 3 dB (deep space) / ≥ 6 dB (proximity links). The figure is an image in the PDF; these numbers were read from it, not from the text layer. The caption notes there are no propellant, data storage or attitude control margins at CML 4.
- JPL's A-Team works CML 1–3; Team X works CML 4.
- **Planned in LEAP:** the maturity strip and the Design Review (ticket 33). LEAP uses the colours for margins (met with 35% / met with less / not met), which is an adaptation: say "in the style of" JPL's checklist.

## Mission Design Lab (MDL), Goddard

<https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/>

- Study types: Office Hours (about an hour), Concept Development (a few half days), Tailored Trade Study, Point Design Study (6 days; CAD, Master Equipment List, cost).
- 16 disciplines, from power, propulsion, thermal and communications to cost and risk.
- Covers end-of-mission ("controlled and uncontrolled de-orbit", sample return) and orbital debris.
- **Planned in LEAP:** roles for Team Mode (ticket 41), trade studies for comparing designs (45), end of mission (46). A reading source rather than data.

## NASA Mission Viz

<https://nasa.github.io/mission-viz/> · repo <https://github.com/nasa/mission-viz> (read at commit c6f2270, 16 May 2022)

- Demos and tutorials from 2015 to 2018 by Daniel O'Neil (NASA): a Three.js orrery, an Earth–Moon X3DOM animation, and a three-part tutorial on drawing a GMAT-generated trajectory in a web page (PDFs dated 18 Sep, 23 Sep and 2 Nov 2015).
- **Trajectory files** in `X3Dom/`, each a list of points with Date, Time, X, Y, Z in km, Earth-centred equatorial frame:

| File | Points | Span | What it is |
|---|---|---|---|
| `missionfile.js` | 150 | 1.27 days from 1 Jan 2000 | LEO → GEO transfer: starts about 637 × 990 km, two burns, ends circular at 42,165 km radius |
| `MolniyaOrbit.json` | 155 | 3.0 days | about 2,240 × 151,900 km altitude, 12.45° inclination, 66.7 h period (not a real Molniya orbit, despite the name) |
| `LunarTransferTrajectory.js` | 1,269 | 21.4 days from 22 Jul 2014 | spacecraft path, Earth to the Moon |
| `LunarOrbit.js` | 1,269 | same times | the Moon's path |

- Raw size about 250 KB together. The `.js` files hold JSON inside a JavaScript string.
- **Check by hand:** two-body maths for 2,240 × 151,900 km gives a semi-major axis of 83,441 km and a period of about 66.6 h, matching the 66.7 h above. A geostationary radius of 35,786 + 6,371 km = 42,157 km is 8 km from the transfer run's final 42,165 km.
- **Earth → Moon file, read in ticket 34:** it starts 158,311 km from Earth, passes 8,620 km from Earth's centre on day 1.4, comes within 10,000 km of the Moon on day 6.4 and then stays about 9,200 km from the Moon's centre until the end (day 21.4): a week to get there, two weeks in orbit round the Moon. The Moon's path is 18.95° to the equator, at the low end of its 18–29° range _(verify the 2014 value)_, which supports the equatorial frame. The transfer to GEO is in one plane at 12.85° to the equator: it ends circling at geostationary height, but tilted, so strictly geosynchronous.
- **Check outside the repo** (plain two-body maths, not LEAP's code): matched the long-ellipse run to 0.7% of distance on average over 2.8 days, 3.2% at worst, near apogee, where the Moon's pull shows.
- **LEAP's own code, tested in the repo (ticket 35, `src/game/space.gmat.test.ts`):** with GMAT's lowest (8,604 km) and highest (158,429 km) distances and the lowest point lined up, `orbitPosition` is within 0.31% of GMAT's distance from Earth's centre on average over all 155 points, 1.24% at worst. Lap: GMAT 66.68 h (high point to high point), `orbitMinutes` 66.72 h. Geostationary: 42,157 km against the transfer run's final 42,165.0 km. The long-ellipse file starts at the same moment and distance as the Earth → Moon file, X mirrored; its two high points differ by 118 km.
- **Licence:** no top-level licence file; `X3Dom/LICENSE` is the X3DOM library's MIT/GPL licence. NASA-published material. Credit: "NASA Mission Viz (github.com/nasa/mission-viz), trajectories generated with NASA GMAT" _(verify the licence wording with the team)_.
- **Planned in LEAP:** tickets 34, 35, 47.

## Webb game: "Build It Yourself: Satellite!"

<https://science.nasa.gov/mission/webb/game-build-it-yourself/> (page heading "A Learning Game About Telescopes"; the Resources tab's untitled link goes here)

- NASA Goddard; approved by NASA Education product review in 2013; author Maggie Masetti.
- Flow: pick science goals (five to choose from) → wavelength → instrument → optics. Three levels; options that don't fit are greyed out. The ending launches the satellite, shows the real satellite most like yours and real data.
- **Planned in LEAP:** "Like the real one" (ticket 36), science-first Contracts (42).

## CubeSat 101

"CubeSat 101: Basic Concepts and Processes for First-Time CubeSat Developers", NASA CubeSat Launch Initiative, revision October 2017, 96 pages, produced by Cal Poly's CubeSat Systems Engineer Lab. <https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf>

Page numbers are the printed ones.

| Where | What it says | LEAP use |
|---|---|---|
| §1.1, p. 4 | "A 1U CubeSat is a 10 cm cube with a mass of approximately 1 to 1.33 kg"; 1U standard 10 × 10 × 11 cm, 3U 10 × 10 × 34 cm; larger sizes 1.5U, 2U, 3U, 6U, 12U | CubeSat sizes (48); 6U limits _(verify from the CubeSat Design Specification)_ |
| Free Advice, p. 16 | Keep it simple; double up on that burn wire (fishing line "comes loose during vibration testing or ascent"); important components on the exterior; use familiar components that "have flown on CubeSats before"; do not design to the limits of the envelope | tips (38); Stuck solar panel report |
| §2.10, p. 22 | "Launching with an inadequate ground station is a mission killer." | Ground Station panel (38) |
| §2.11, p. 23 | build schedule margin; "cheaper to build two satellites at once"; ETU and FlatSat | tips (38); Ground Tests (40) |
| §2.15, p. 28 | "If your CubeSat is not delivered in time, the LV will definitely leave without your CubeSat onboard."; "day-of-launch scrubs are common due to weather and other factors" | tips (38); Rideshares leave on their date (44) |
| §6.1, p. 54 | the ODAR shows the CubeSat "will deorbit in a reasonable amount of time" | End of mission (46) |
| §6.9.1, p. 59 | Day In The Life test: electronics and flight software work as expected (timers, deployables, first transmission) | Ground Tests: Point the antenna (40) |
| §6.9.2, pp. 60–61 | vibration and shock: survive launch; vibration testing "is required for all launches" | Ground Tests: Stuck solar panel (40) |
| §6.9.3, p. 62 | thermal vacuum bakeout (outgassing); TVAC cycling "can help screen for problems caused by the thermal cycling on orbit" | Ground Tests: Survive the eclipse (40), standing for the cycling kind |

## Visualize a Space Mission Using Virtual Reality (2023 challenge)

<https://www.spaceappschallenge.org/2023/challenges/visualize-a-space-mission-using-virtual-reality/>

- Asked for a whole mission shown in VR: concept, orbital trajectories, mission timeline, 3D.
- **Planned in LEAP:** the draggable timeline (ticket 47). A reading source.

## CSA: Digital Games and Activities

<https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp>

- The catalogue lists Tomatosphere Adventure, Mission: Astronaut, Exploring Earth, a RADARSAT Constellation Mission game ("Help a farmer, a captain and a first responder achieve their missions using RADARSAT imagery") and an OSIRIS-REx game.
- Alouette 1, from CSA's own page <https://www.asc-csa.gc.ca/eng/satellites/alouette.asp>: launched 29 September 1962 from the Pacific Missile Range, California, on a two-stage Thor-Agena; 145 kg; "a near perfect 1000 km orbit"; studied the ionosphere from above; one-year design life, a 10-year mission, over one million images of the ionosphere; Canada "the first nation, after the Russian and American superpowers, to design and build its own artificial Earth satellite". Rechecked 2026-11-14: the banner photo's credit and reuse terms remain unverified; the CSA/NASA credit belongs to the video. Ticket 37 ships text-only; details in `milestones.md`.
- **Planned in LEAP:** Alouette 1 card (ticket 37), science-first Contracts (42).

## Source files in the repo

[`sources/`](sources/README.md) holds copies fetched on 2026-11-13, so tickets need no new downloads: the four Mission Viz / GMAT trajectory files, the Resources tab word for word, and the text of the slides, CubeSat 101, the Webb game's options and the Mission Design Lab page. The JPL paper, the CSA pages and the Space Apps guides are not stored (copyright, or they can change); the index says where to get them.

## Not reached

Space Apps Connect (GitHub Discussions), the GMAT program files, and two CSA game pages could not be opened from the build container on 2026-11-13.

## Reaching spaceappschallenge.org from a build container

**Short way:** `python3 scripts/fetch_spaceapps_page.py <url>` does the steps below and prints the page text (checked on the Resources tab, 2026-11-13).

The site's server sends an incomplete certificate chain: its intermediate "SSL.com TLS Issuing RSA CA R1" is cross-signed by a root the container's CA bundle lacks, so `curl` fails with an unverifiable chain. Fix without turning verification off:

1. Download the CA's own intermediate from the certificate's AIA URL: `http://cert.ssl.com/SSL.com-TLS-I-RSA-R1.cer` (DER).
2. Convert it to PEM (`openssl x509 -inform der -in SSL.com-TLS-I-RSA-R1.cer -out inter.pem`).
3. Append it to a copy of the container's CA bundle and pass that file to `curl --cacert`.

It then chains to "SSL.com TLS RSA Root CA 2022", already trusted. The page content sits in the Next.js `self.__next_f.push` script chunks, not in the visible HTML.
