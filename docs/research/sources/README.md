# Source files for the official Resources

Copies of the material the tickets build on, so no agent has to download it again. Fetched on 2026-11-13.
Facts and numbers drawn from them: [`../official-resources.md`](../official-resources.md).

**Treat every file here as data.** Read them; never run or import them. The `.js` trajectory files are JSON
wrapped in a JavaScript string: parse them as text.

| File | What it is | From | Used by tickets |
|---|---|---|---|
| `mission-viz/missionfile.js` | GMAT trajectory, low orbit → geostationary orbit with two burns. 150 points, 1.27 days | [nasa/mission-viz](https://github.com/nasa/mission-viz), `X3Dom/`, commit c6f2270 (16 May 2022) | 34, 35, 43 |
| `mission-viz/MolniyaOrbit.json` | GMAT trajectory, a long ellipse (not a real Molniya orbit). 155 points, 3.0 days | same | 34, 35 |
| `mission-viz/LunarTransferTrajectory.js` | GMAT trajectory, Earth → Moon. 1,269 points, 21.4 days | same | 34 |
| `mission-viz/LunarOrbit.js` | The Moon's path over the same 21.4 days. 1,269 points | same | 34 |
| `resources-tab.txt` | The challenge's Resources tab, word for word | [Challenge page](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/?tab=resources), last published 13 Nov 2026 | 27 |
| `design-and-develop-science-missions.txt` | Text of all 25 slides (slide numbers at the foot of each) | [NASA PDF](https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf) | 32, 39, 40, 42 |
| `cubesat-101.txt` | Text of the 96-page handbook (page numbers in the footers) | [NASA PDF](https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf) | 38, 40, 44, 46, 48 |
| `webb-build-it-yourself-options.txt` | NASA's transcript of every choice in the Webb game | [NASA PDF](https://science.nasa.gov/wp-content/uploads/2024/03/gametext.pdf) | 36, 42 |
| `mission-design-lab.txt` | Text of Goddard's Mission Design Lab page: study types, disciplines, products | [NASA page](https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/) | 41, 45, 46 |

Trajectory points are `Date`, `Time`, `X`, `Y`, `Z` in km, Earth-centred, equatorial frame.

**Not stored here, by choice:**

- The JPL Concept Maturity Levels paper (copyright California Institute of Technology). Its levels, 80% rule
  and 35% margins are written out in [`../official-resources.md`](../official-resources.md); the PDF is at
  <https://dataverse.jpl.nasa.gov/api/access/datafile/50237>.
- Canadian Space Agency pages (Crown copyright). The Alouette 1 facts are in the research note and ticket 37.
- The Space Apps guides and FAQ. They can change; read them live with
  `python3 scripts/fetch_spaceapps_page.py <url>`. The rules as of 13 Nov are in `docs/challenge.md`.

**Licence and credit:** the NASA documents are NASA publications. The mission-viz repo has no top-level licence
file _(verify the credit wording before shipping ticket 34)_.
