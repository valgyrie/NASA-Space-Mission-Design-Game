# 44: Rideshares leave on their date _(Later)_

**What to build:** Rideshares get fixed departure days. A Spacecraft that is not at the Launch Site in time misses it and waits for the next one. Paying for the Whole Launch lets the Company pick the day.

**Blocked by:** 16, 21

**Status:** not started (approved 2026-11-13, Later). Needs play-testing: missing a ride must feel fair, not cruel.

- [ ] Each Rideshare vehicle has departure days (game estimates, e.g. every N days), shown in the Launch planner and the Mission tracker
- [ ] Shipping that arrives after a departure waits for the next one; the timeline and the Time bar say so before the player ships
- [ ] A missed ride gives one line from CubeSat 101 ("the rocket won't wait") and the next date
- [ ] A Whole Launch picks its own day, as now
- [ ] Weather Scrubs still apply on the departure day
- [ ] The tutorial's Explorer 1 timing still fits in 10 minutes (its first ride waits for the player, or departs often)
- [ ] Text in `src/strings.ts`; tests for the waiting rule; browser check

**In the code (read-only pointers):** `src/game/mission.ts` (`shipMission`, `missionTimeline`, `missionStage`, `launchWeather`); vehicles and costs in `src/game/launchVehicles.ts`; Launch Window advisor and Scrubs (ticket 16); Mission tracker `src/ui/missionTracker.ts`.

**Sources:** CubeSat 101 (October 2017) §2.15 Launch, p. 28: "If your project gets delayed for any reason, the launch will not be delayed. If your CubeSat is not delivered in time, the LV will definitely leave without your CubeSat onboard." <https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf>

**Open points:** how often each historical Rideshare departs (game estimate; real launch rates per year could anchor it _(verify)_).
