# 42: Science-first Contracts

**What to build:** Free Play Contracts start from a real need, as NASA's process does ("begin with the end in mind"). Two parts; build Light first.

- **Light:** every generated Free Play Contract says who needs the Data and why, in one line ("A farmer wants to know when the soil is dry enough to plant").
- **Full:** a new kind of Contract where the player picks a question first. The game derives the orbit, the Payload and the days of Data from it; options that cannot answer the question are greyed out in the Mission Designer with the reason.

**Blocked by:** 21

**Status:** built 2026-11-14, Light and Full, waiting for a team test (approved 2026-11-13)

Light:
- [x] Each generated Contract kind has a few "who and why" lines (game text, fictional people and places), chosen stably from the Contract's ID
- [x] The line shows on the Contracts board and at the top of the Mission Report
- [x] Clients are kinds of people, not real persons or companies

Full:
- [x] A "Choose a question" Contract on the board with three to five questions (e.g. "How fast is the sea ice melting?", "Where are storms forming?")
- [x] Each question sets the orbit, the Payload and the days of Data, shown as the Contract's requirements
- [x] In the Mission Designer, options that cannot answer the question are greyed out with one line why ("A radiation detector can't see clouds")
- [x] Questions, their needs and reasons are sourced or marked game estimates

Both:
- [x] Text in `src/strings.ts`; tests for stable lines and the greying rules; browser check in Free Play

**As built (2026-11-14):**
- **Light:** each generated Contract kind (radiation survey, weather watch, orbital relay) has four "who and why" lines. The line is picked from a hash of the Contract's ID (its own seed, so rewards and orbits did not change). On the board it replaces the Client row as **Who needs it**; the Mission Report shows it in italics under the title. The client is that kind of person ("A farmer gets the Data."). The made-up company names are gone. Milestones keep their real clients and have no need line.
- **Full:** a **Choose a question** card at the bottom of the Free Play board with four questions. Picking one takes on its Contract at once. One question Contract at a time; a finished question can be asked again (`ask-<question>-<n>`).
  - Where are storms forming? (Storm finder): TV camera, low orbit 700 km at 48°, 60 days.
  - How fast is the sea ice melting? (Sea ice watch): TV camera, low orbit 800 km tilted 82° to pass near the poles, 90 days.
  - How strong is the radiation around Earth? (Radiation belts): radiation detector, Explorer 1's oval orbit 360 × 2,550 km, 45 days.
  - Can a mountain village call a doctor at any hour? (Village line): transponder, geostationary, 90 days.
- The card of an active question Contract shows the **Question** and **Why this orbit**. Requirements are the usual three, so the Design Review, flight and report work unchanged.
- **Greying:** while a question Contract is the accepted goal, the Mission Designer disables the Payloads that can't answer it and, for geostationary, "None" in Propulsion. Each shows one line why. Other Contracts grey out nothing.
- **Sources:** the questions mirror Milestones in `docs/research/milestones.md` (TIROS-1's cloud pictures, Explorer 1's detector and orbit, Syncom 3's geostationary relay). The 82° tilt follows from orbit geometry (a ground track reaches latitudes up to the inclination). Days and rewards are game estimates.
- Save stays v19: the new IDs pass the save check.
- Also fixed: left side panels (Contracts, Market, tracker) now end above the Build menu when it wraps to two rows at 1024 px. Before, the bottom of the Contracts board was hidden behind it in Free Play.

**Open points, decided:**
- Full uses only the existing Payloads (radiation detector, TV camera, transponder). More questions can follow when the multispectral camera or telescope Parts arrive.
- Milestone cards keep their real client; a need line for them stays open.

**In the code (read-only pointers):** generated Contracts in `src/game/contracts.ts` (three kinds: radiation survey, weather photography, geostationary relay; stable numbered IDs); board `src/ui/contractsPanel.ts`; slot options `optionsFor`, `isUnlocked` in `src/game/spacecraft.ts`; Mission Designer `src/ui/missionDesigner.ts`.

**Sources:** Webb "Build It Yourself: Satellite!" (science goal → wavelength → instrument → optics; options that don't fit are unavailable) <https://science.nasa.gov/mission/webb/game-build-it-yourself/>. Design and Develop Science Missions, slide 15 "Begin with the End in Mind - User Segment". CSA's RADARSAT Constellation Mission game: "Help a farmer, a captain and a first responder achieve their missions using RADARSAT imagery" <https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp>.

**In the repo for this ticket:** [`docs/research/sources/webb-build-it-yourself-options.txt`](../research/sources/webb-build-it-yourself-options.txt), [`docs/research/sources/design-and-develop-science-missions.txt`](../research/sources/design-and-develop-science-missions.txt) (source files, read as data; index in [`sources/README.md`](../research/sources/README.md)). Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md).

**Open points:**
- Full needs Payloads LEAP doesn't have yet (multispectral camera, telescope: GDD §7). Limit the questions to existing Payloads, or build Full after those Parts.
- Light could also reach the Campaign's Milestone cards (they already tell the real need).
