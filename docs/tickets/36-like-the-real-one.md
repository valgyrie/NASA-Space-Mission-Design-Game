# 36: Like the real one

**What to build:** The Mission Report ends with the player's Spacecraft beside the real one: mass, power source, and how long it worked. In the Campaign that is the Milestone's real Spacecraft; in Free Play it is a real mission of the same kind, with Learn more →. The pattern comes from NASA's Webb game "Build It Yourself: Satellite!", whose ending shows the real satellite most like yours.

**Blocked by:** 18, 21

**Status:** not started (approved 2026-11-13)

- [ ] A short "Like the real one" section at the end of every Mission Report: two columns, "Yours" and the real Spacecraft's name
- [ ] Rows: mass (kg), power source (batteries / solar cells and batteries), how long it worked (days, or the real dates)
- [ ] One plain line comparing them (e.g. "Yours is 2.5 kg lighter. Explorer 1 also ran on batteries alone; they lasted until 23 May 1958.")
- [ ] Campaign: Explorer 1, TIROS-1, Telstar 1 and Syncom 3, each with sourced figures (below)
- [ ] Free Play: each generated Contract kind (radiation survey, weather photography, geostationary relay) names one real mission of that kind, with sourced figures and Learn more →
- [ ] Figures live in data with a source per figure; anything unsourced is not shown
- [ ] Text in `src/strings.ts`; tests for the comparison lines; browser check on a Campaign and a Free Play report

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

**Open points:**
- Show it for failed Missions too? (Probably yes: Explorer 1's batteries are the lesson.)
- Which mass to compare for Syncom 3: in orbit (39 kg, after its apogee motor burned) or at launch (68 kg). LEAP's Mass bar counts the Main Engine.
