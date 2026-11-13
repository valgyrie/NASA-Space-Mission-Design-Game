# 32: Four segments on screen

**What to build:** The Launch planner and the Mission Report group their lines under NASA's four mission Segments, so the player sees that a Mission is more than the Spacecraft. One line explains it, with **Learn more →** to NASA's slides.

| Segment | What LEAP already has in it |
|---|---|
| Launch segment | Launch Vehicle, Launch Site (and Shipping, Launch Insurance) |
| Space segment | the Spacecraft (Bus, Power, Battery, Comms, Pointing, Payload, Propulsion) |
| Ground segment | Ground Stations (or borrowed stations) |
| User segment | the client of the Contract, the Data, the Research Lab |

**Blocked by:** 18, 27

**Status:** built 2026-11-13 🧪 (waiting for a team test)

- [x] The Launch planner's cards sit under four headings in this order: User, Space, Ground, Launch (the slides' "begin with the end in mind": the user comes first; order is an open point)
- [x] The Mission Report groups its requirement lines under the same four headings; a Segment with nothing to say is left out
- [x] One short line explains Segments (e.g. "Every NASA mission has four parts: launch, space, ground and the people who use the Data."), with **Learn more →** to the slides
- [x] The User segment names who gets the Data (the Contract's client) and where it goes (Research Lab, or "waiting for a Research Lab")
- [x] The Ground segment says which Ground Stations the Mission uses, or "borrowed stations"
- [x] All text in `src/strings.ts`; glossary term **Segment** used exactly
- [x] Focused tests for the grouping; checked in the browser at 1280×800 and 1024×768 for Explorer 1 and Telstar 1

**In the code (read-only pointers):** Launch planner cards in `src/ui/launchPlanner.ts`; report lines in `src/ui/missionReport.ts` (`findingText`, `showMissionReport`) and the findings in `src/game/mission.ts` (`Finding`). Ground Station boost in `src/game/balance.ts`. Learn more links: `src/ui/learnMore.ts`; source URLs live in `src/game/sources.ts`. **Name clash:** `src/game/ascent.ts` already exports a `Segment` type for parts of the Launch show. Use a distinct code name (e.g. `MissionSegment`) or rename the show's type, so code names match the glossary.

**Sources:** Design and Develop Science Missions (NASA Small Spacecraft institute webinar, Julie Levri, 26 March 2025), slide 8 "What segments make up a science mission?"; slide 15 "Begin with the End in Mind - User Segment". <https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf>. Notes: `docs/research/official-resources.md`.

**Real data and Credits:** add the slides to `DATASETS` (`src/game/sources.ts`, strings `data.<id>.*`) when this ships (ticket 27).

**In the repo for this ticket:** [`docs/research/sources/design-and-develop-science-missions.txt`](../research/sources/design-and-develop-science-missions.txt) (source files, read as data; index in [`sources/README.md`](../research/sources/README.md)). Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md).

## Built (2026-11-13)

- **Code:** `src/game/segments.ts` (`MISSION_SEGMENTS`, `MissionSegment`, `findingSegment`, `bySegment`); planner layout in `src/ui/launchPlanner.ts`; `reportSegments` in `src/ui/missionReport.ts`. Reports now keep `ground` (the Ground Station boost when shipped); older saves lack it, and their report simply has no station line. No save version change.
- **Planner:** one intro line with **Learn more → NASA: the four Segments**, then User, Space and Ground stacked on the left and the Launch segment, wider, on the right (one column under 700 px).
  - User: Gets the Data (client), Data goes to (your Research Lab(s) / Waiting for a Research Lab, with a hint to build one), Mission ends, Deadline.
  - Space: Mass, Assembly (Bus).
  - Ground: your Ground Station(s) or borrowed stations; Antenna sends and Payload makes, in kB a day (red when the antenna can't keep up); the boost, or "Build a Ground Station" once they are open.
  - Launch: Launch Vehicle and Launch Site, Costs (Rideshare or Whole Launch, Shipping, Insurance, Total, Your money), Timeline (Shipping, arrival), Launch weather.
- **Report:** the "Why" lines sit under the Segments. Orbit is Launch, unless the Spacecraft had no Main Engine (Space); Payload and Power are Space; Data reaching home is Ground; the deadline is User. A Segment with a failed line comes first, and its failed line first. A flown Mission adds "who gets the Data and where it goes" (User) and which stations picked it up (Ground). A Mission that never reached orbit says so above the Segments.
- **Real data:** the slides are in `DATASETS` as `missionSegments` (ticket 27).
- **Checks:** 8 new tests (`src/game/segments.test.ts`); 370 tests and the type checks pass. In the browser: the planner for Explorer 1 and Telstar 1 at 1280×800 and 1024×768 (order User, Space, Ground, Launch; no overflow; no console errors), and the real report dialog filled from real Explorer 1 and Telstar 1 flights, and a rocket failure. [Screenshots](../../screenshots/development-NASA_resources/README.md).

**Open points settled:** User first (the slides' advice; the ticket's order). Rideshare, Whole Launch and every budget line sit in the Launch segment: all the money paid in the planner is Launch money.

**Team test:** play Explorer 1 in the Demo to the Mission Report and read the Segments; say if the order (User first) reads well.
