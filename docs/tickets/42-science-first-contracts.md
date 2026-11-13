# 42: Science-first Contracts

**What to build:** Free Play Contracts start from a real need, as NASA's process does ("begin with the end in mind"). Two parts; build Light first.

- **Light:** every generated Free Play Contract says who needs the Data and why, in one line ("A farmer wants to know when the soil is dry enough to plant").
- **Full:** a new kind of Contract where the player picks a question first. The game derives the orbit, the Payload and the days of Data from it; options that cannot answer the question are greyed out in the Mission Designer with the reason.

**Blocked by:** 21

**Status:** not started (approved 2026-11-13)

Light:
- [ ] Each generated Contract kind has a few "who and why" lines (game text, fictional people and places), chosen stably from the Contract's ID
- [ ] The line shows on the Contracts board and at the top of the Mission Report
- [ ] Clients are kinds of people, not real persons or companies

Full:
- [ ] A "Choose a question" Contract on the board with three to five questions (e.g. "How fast is the sea ice melting?", "Where are storms forming?")
- [ ] Each question sets the orbit, the Payload and the days of Data, shown as the Contract's requirements
- [ ] In the Mission Designer, options that cannot answer the question are greyed out with one line why ("A radiation detector can't see clouds")
- [ ] Questions, their needs and reasons are sourced or marked game estimates

Both:
- [ ] Text in `src/strings.ts`; tests for stable lines and the greying rules; browser check in Free Play

**In the code (read-only pointers):** generated Contracts in `src/game/contracts.ts` (three kinds: radiation survey, weather photography, geostationary relay; stable numbered IDs); board `src/ui/contractsPanel.ts`; slot options `optionsFor`, `isUnlocked` in `src/game/spacecraft.ts`; Mission Designer `src/ui/missionDesigner.ts`.

**Sources:** Webb "Build It Yourself: Satellite!" (science goal → wavelength → instrument → optics; options that don't fit are unavailable) <https://science.nasa.gov/mission/webb/game-build-it-yourself/>. Design and Develop Science Missions, slide 15 "Begin with the End in Mind - User Segment". CSA's RADARSAT Constellation Mission game: "Help a farmer, a captain and a first responder achieve their missions using RADARSAT imagery" <https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp>.

**Open points:**
- Full needs Payloads LEAP doesn't have yet (multispectral camera, telescope: GDD §7). Limit the questions to existing Payloads, or build Full after those Parts.
- Light could also reach the Campaign's Milestone cards (they already tell the real need).
