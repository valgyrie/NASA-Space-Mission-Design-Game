# 10: 3D Launch and flight

**What to build:** The real Launch plays as a short 3D sequence: liftoff, staging and reaching orbit, then the Mission Report.

**Blocked by:** 08

**Status:** ready-for-agent

**From ticket 08:** the HUD's Launch button calls `launchMission` in `src/playSite.ts`, which runs `launch()` and opens the Mission Report at once. Put the 3D flight between the two. Launch is also on the Mission tracker (`src/ui/missionTracker.ts`), whose stages already include "Launch from Cape Canaveral" and the Mission's days of Data. The Site already shows the Spacecraft assembled and trucked away (`src/world/shippingView.ts`); its model comes from `buildSpacecraft`, so the flight can reuse it.

- [ ] Liftoff, staging and orbit insertion are shown in 3D
- [ ] Flight lasts roughly 1–2 minutes and can be sped up
- [ ] The outcome matches the simulation result
- [ ] Falls back to a simple view if the device is slow
