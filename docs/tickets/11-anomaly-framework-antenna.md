# 11: Anomalies: framework + Point the antenna

**What to build:** The first Anomaly mini-game: aim the antenna at a Ground Station before contact is lost. Required the first time, skippable afterwards, more likely with weak Comms, and failing lowers the result instead of destroying the Mission.

**Blocked by:** 10

**Status:** done

- [x] Point the antenna appears during flight and is playable with the mouse
- [x] First time it can't be skipped; later it can, using the best past result
- [x] Its chance rises when the design's Comms margin is thin
- [x] Failing reduces the Mission result; it never destroys it outright
- [x] Mission Report mentions the Anomaly and why it happened

**For tickets 12 and later:** `src/game/anomalies.ts` holds the framework: `rollAnomaly` (settled at Launch, deterministic from the Seed), `settleAnomaly` / `skipAnomaly` / `settleUnanswered`, `lostDaysFor`, `withContactLost`, and `state.anomalyBest` (best played score per kind). Add a kind to `ANOMALY_KINDS`, give `rollAnomaly` its chance, and a mini-game like `src/game/antennaGame.ts` + `src/ui/anomalyPanel.ts`. Only one Anomaly per flight for now (`MissionReport.anomaly`); several per flight would make it a list. Ground Stations (ticket 18) should add to the antenna's chance ("few Ground Stations").
