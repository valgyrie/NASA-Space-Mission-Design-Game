# 38: Sourced tips

**What to build:** About eight short loading tips and Mission Report lines taken from the "Free advice" boxes and text of NASA's CubeSat 101, each with its page. Keep each one simple and tied to something the player just saw.

**Blocked by:** 12, 26

**Status:** not started (approved 2026-11-13)

- [ ] Loading screens pick one tip at random from the list (today there is one: `loading.tip`)
- [ ] Each tip has a source line or Learn more → CubeSat 101 with the page
- [ ] Mission Report and panel lines where they fit (table below)
- [ ] Each tip reworded in plain words for age 10+, the meaning unchanged; quoted text stays exact
- [ ] Text in `src/strings.ts`; page numbers recorded in `docs/research/official-resources.md`; browser check of the loading screen and the Stuck solar panel report

| Tip (plain) | CubeSat 101 says | Where in LEAP | Page |
|---|---|---|---|
| Keep it simple. | "KEEP IT SIMPLE. Keep the design as simple as possible." | loading tip | 16 |
| Fold-out parts are held by a wire that melts to let go. Use two. | "DOUBLE UP ON THAT BURN WIRE" | Mission Report after **Stuck solar panel** | 16 |
| Parts that have flown before are safer. | "USE FAMILIAR COMPONENTS. Whenever possible, choose major components that have flown on CubeSats before." | loading tip (later: Part Marks) | 16 |
| Don't build right up to the limit. | "DO NOT DESIGN TO THE LIMITS OF THE ENVELOPE." | loading tip; Design Review margin lines (ticket 33) | 16 |
| Put the parts you may need to fix where you can reach them. | "IMPORTANT COMPONENTS SHOULD BE ON THE EXTERIOR." | loading tip | 16 |
| A weak ground station can end a mission. | "Launching with an inadequate ground station is a mission killer." | Ground Station panel | 22 |
| Building two at once costs less than building one, then another. | "it's cheaper to build two satellites at once than to build one and later decide to build another" (§2.11) | loading tip | 23 |
| Launches are often called off on the day. | "day-of-launch scrubs are common due to weather and other factors" (§2.15) | Scrub card | 28 |
| The rocket won't wait for you. | "If your CubeSat is not delivered in time, the LV will definitely leave without your CubeSat onboard." (§2.15) | loading tip (ties to ticket 44) | 28 |

Page numbers are the printed page numbers in the October 2017 revision.

**In the code (read-only pointers):** loading screen `src/ui/loading.ts` (`loading.tip` in `src/strings.ts`); Stuck solar panel report lines `anomalyLines` in `src/ui/missionReport.ts`; Ground Station panel in `src/ui/buildingPanel.ts`; Scrub card `src/ui/scrubCard.ts`; Learn more `src/ui/learnMore.ts`.

**Sources:** CubeSat 101: Basic Concepts and Processes for First-Time CubeSat Developers, NASA CubeSat Launch Initiative, revision October 2017 (produced by Cal Poly) <https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf>.

**Real data and Credits:** add CubeSat 101 to `DATASETS` (or reading sources) when this ships (ticket 27).

**Open points:** keep the "build two" tip only if it does not suggest a feature LEAP lacks; drop any tip that needs CubeSat words the player has not met.
