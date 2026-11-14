# 36: Like the real one

**What to build:** The Mission Report ends with the player's Spacecraft beside the real one: mass, power source, and how long it worked. In the Campaign that is the Milestone's real Spacecraft; in Free Play it is a real mission of the same kind, with Learn more →. The pattern comes from NASA's Webb game "Build It Yourself: Satellite!", whose ending shows the real satellite most like yours.

**Blocked by:** 18, 21

**Status:** built 2026-11-14 (see **Built** below)

- [x] A short "Like the real one" section at the end of every Mission Report: two columns, "Yours" and the real Spacecraft's name
- [x] Rows: mass (kg), power source (batteries / solar cells and batteries), how long it worked (days, or the real dates)
- [x] One plain line comparing them (e.g. "Yours is 2.5 kg lighter. Explorer 1 also ran on batteries alone; they lasted until 23 May 1958.")
- [x] Campaign: Explorer 1, TIROS-1, Telstar 1 and Syncom 3, each with sourced figures (below)
- [x] Free Play: each generated Contract kind (radiation survey, weather photography, geostationary relay) names one real mission of that kind, with sourced figures and Learn more →
- [x] Figures live in data with a source per figure; anything unsourced is not shown
- [x] Text in `src/strings.ts`; tests for the comparison lines; browser check on a Campaign and a Free Play report

**Figures already sourced** (`docs/research/milestones.md`; check each again when building):

| Spacecraft | Mass | Power | Worked |
|---|---|---|---|
| Explorer 1 | 13.97 kg | mercury batteries only (~40% of its mass) | until the batteries ran out, 23 May 1958 (one NASA page says last transmission 21 May; the History card says "May") |
| TIROS-1 | 122.5 kg | about 9,000 solar cells charging nickel-cadmium batteries | NASA: "operational for only 78 days" |
| Telstar 1 | 77 kg | about 3,600 solar cells | worked normally 10 July to 23 November 1962 (136 days) |
| Syncom 3 | 39 kg in orbit (68 kg fuelled) | 3,840 solar cells, 29 W | launched 19 Aug 1964, turned off in 1969 _(verify an exact end date before showing days)_ |

**To source:** one real mission per Free Play Contract kind, with mass, power source and working life _(verify all)_. Use NASA pages first (NSSDC, mission pages).

**In the code (read-only pointers):** `src/ui/missionReport.ts` (`showMissionReport`); report data in `src/game/mission.ts` (`MissionReport`, findings); the flown design is kept on the report (save v8, ticket 31); Contracts and kinds in `src/game/contracts.ts`; mission Learn more links in `src/ui/learnMore.ts` (`missionLinks`) and `src/game/sources.ts` (`missionSource`).

**Sources:** Webb "Build It Yourself: Satellite!" (NASA Goddard; page heading "A Learning Game About Telescopes") <https://science.nasa.gov/mission/webb/game-build-it-yourself/>. Mission figures: `docs/research/milestones.md`.

**In the repo for this ticket:** [`docs/research/sources/webb-build-it-yourself-options.txt`](../research/sources/webb-build-it-yourself-options.txt) (source files, read as data; index in [`sources/README.md`](../research/sources/README.md)). Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md). Real figures already sourced: [`docs/research/milestones.md`](../research/milestones.md).

**Open points (decided while building, 2026-11-14; the team can change them):**
- Failed Missions show it too. If the Spacecraft never reached orbit, "How long it worked" says so.
- Syncom 3 is compared at launch (68 kg fuelled), since LEAP's Mass bar counts the Main Engine. Every row says "Mass at launch".

**Built (2026-11-14):**
- Data: `src/game/realCraft.ts`, seven real Spacecraft, each figure with its own source URL; `realCraftFor(contract)` picks the Milestone's own or, in Free Play, SAMPEX (radiation survey), NOAA-18 (weather watch) or TDRS-1 (orbital relay). Figures and sources: `docs/research/like-the-real-one.md`.
- Report: `src/ui/likeTheRealOne.ts` builds the rows and the comparing line; `src/ui/missionReport.ts` shows the section after the Mission Patch, before the buttons, with Learn more →. Rows: Mass at launch, Power, How long it worked. Yours: mass from the orbit line, Power from the design (batteries only / solar cells and batteries), days from the Power line ("All 30 days of the Mission", "41 days, then the Power ran out", "Never reached orbit"). Old saves without the design show "–".
- Line: mass difference (within 5% or 0.5 kg reads "about the same"; under 10 kg with one decimal), then power ("also ran on batteries alone" / "used solar cells"), then how long the real one worked. Example: "Yours is 2.5 kg lighter. Explorer 1 also ran on batteries alone. They lasted until 23 May 1958."
- Real data: new entry for the Webb game (ticket 27's planned entry).
- Tests: `src/ui/likeTheRealOne.test.ts` (11). Browser: Explorer 1 and Free Play weather at 1280×800, Telstar 1 and Free Play relay (a failed one) at 1024×768, Real data list; screenshots `ticket-36-*`.
- Changed from the table above: Telstar 1's power shows "Solar cells" (NASA's page names only solar panels); TIROS-1 shows NASA's 78 days.
