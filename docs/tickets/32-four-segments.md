# 32: Four segments on screen

**What to build:** The Launch planner and the Mission Report group their lines under NASA's four mission Segments, so the player sees that a Mission is more than the Spacecraft. One line explains it, with **Learn more →** to NASA's slides.

| Segment | What LEAP already has in it |
|---|---|
| Launch segment | Launch Vehicle, Launch Site (and Shipping, Launch Insurance) |
| Space segment | the Spacecraft (Bus, Power, Battery, Comms, Pointing, Payload, Propulsion) |
| Ground segment | Ground Stations (or borrowed stations) |
| User segment | the client of the Contract, the Data, the Research Lab |

**Blocked by:** 18, 27

**Status:** not started (approved 2026-11-13)

- [ ] The Launch planner's cards sit under four headings in this order: User, Space, Ground, Launch (the slides' "begin with the end in mind": the user comes first; order is an open point)
- [ ] The Mission Report groups its requirement lines under the same four headings; a Segment with nothing to say is left out
- [ ] One short line explains Segments (e.g. "Every NASA mission has four parts: launch, space, ground and the people who use the Data."), with **Learn more →** to the slides
- [ ] The User segment names who gets the Data (the Contract's client) and where it goes (Research Lab, or "waiting for a Research Lab")
- [ ] The Ground segment says which Ground Stations the Mission uses, or "borrowed stations"
- [ ] All text in `src/strings.ts`; glossary term **Segment** used exactly
- [ ] Focused tests for the grouping; checked in the browser at 1280×800 and 1024×768 for Explorer 1 and Telstar 1

**In the code (read-only pointers):** Launch planner cards in `src/ui/launchPlanner.ts`; report lines in `src/ui/missionReport.ts` (`findingText`, `showMissionReport`) and the findings in `src/game/mission.ts` (`Finding`). Ground Station boost in `src/game/balance.ts`. Learn more links: `src/ui/learnMore.ts`; source URLs live in `src/game/sources.ts`. **Name clash:** `src/game/ascent.ts` already exports a `Segment` type for parts of the Launch show. Use a distinct code name (e.g. `MissionSegment`) or rename the show's type, so code names match the glossary.

**Sources:** Design and Develop Science Missions (NASA Small Spacecraft institute webinar, Julie Levri, 26 March 2025), slide 8 "What segments make up a science mission?"; slide 15 "Begin with the End in Mind - User Segment". <https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf>. Notes: `docs/research/official-resources.md`.

**Real data and Credits:** add the slides to `DATASETS` (`src/game/sources.ts`, strings `data.<id>.*`) when this ships (ticket 27).

**In the repo for this ticket:** [`docs/research/sources/design-and-develop-science-missions.txt`](../research/sources/design-and-develop-science-missions.txt) (source files, read as data; index in [`sources/README.md`](../research/sources/README.md)). Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md).

**Open points:**
- Order of the headings: User first (the slides' advice) or Launch first (the order the player acts in).
- Where the Telstar 1 Whole Launch and Rideshare lines sit (Launch segment) and where Budget lines sit (no Segment of their own; under the Segment that costs the money).
