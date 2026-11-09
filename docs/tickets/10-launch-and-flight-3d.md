# 10: 3D Launch and flight

**What to build:** The real Launch plays as a short 3D sequence: liftoff, staging and reaching orbit, then the Mission Report.

**Blocked by:** 08

**Status:** done

**From ticket 08:** the HUD's Launch button calls `launchMission` in `src/playSite.ts`, which runs `launch()` and opens the Mission Report at once. Put the 3D flight between the two. Launch is also on the Mission tracker (`src/ui/missionTracker.ts`), whose stages already include "Launch from Cape Canaveral" and the Mission's days of Data. The Site already shows the Spacecraft assembled and trucked away (`src/world/shippingView.ts`); its model comes from `buildSpacecraft`, so the flight can reuse it.

**From ticket 09:** `launch(state, seed)` uses `realFlight` from `src/game/flight.ts`, whose `Flight` has per-day battery and Data lists and `powerOutDay`, so the 3D flight can show the same story the Test Run graphs did.

- [x] Liftoff, staging and orbit insertion are shown in 3D
- [x] Flight lasts roughly 1–2 minutes and can be sped up
- [x] The outcome matches the simulation result
- [x] Falls back to a simple view if the device is slow
