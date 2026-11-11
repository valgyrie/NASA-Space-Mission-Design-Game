# 12: Anomalies: Stuck solar panel, Survive the eclipse

**What to build:** Two more Anomaly mini-games, each linked to a real design weakness.

**Blocked by:** 11, 14

**Status:** built, waiting for a team test

**From ticket 11:** the framework is in `src/game/anomalies.ts` (see ticket 11's notes). A Mission has at most one Anomaly for now; with three kinds, decide whether a flight can meet more than one.

**From ticket 07:** Power in `checkDesign` compares energy over the whole Mission and does not check Earth's shadow yet (`SUNLIT_SHARE` is in `balance.ts`). Survive the eclipse needs a per-orbit battery check.

- [x] Stuck solar panel is playable and more likely with cheap panels
- [x] Survive the eclipse is playable and more likely with a thin Power margin
- [x] Both follow the same first-time/skip and failure rules as ticket 11

**Decisions (the user was away and asked the agent to choose):**
- **One Anomaly per flight.** Each kind the design can meet rolls its own chance; if several strike, a kind the Company has never played wins (so new ones get met), then the likeliest. The first flight still always meets Point the antenna. `MissionReport.anomaly` stays one; no save version change (new optional fields `solarMark`, `battery`, `lastsDays`).
- **Only Spacecraft with Solar Cells** meet the two new kinds. "Cheap panels" = the Solar Cells' **Mark** (Mk 1 35%, Mk 2 20%, Mk 3 10%).
- **Eclipse chance** from the whole-Mission Power margin plus a Small Battery bump. A per-orbit battery check was not added to `checkDesign`: with the game's battery sizes one shadow pass uses under 1% of any battery, so it would never bite.
- **Stuck solar panel** teaches resonance: push in time with the swing. **Survive the eclipse** teaches power budgets: switch off what can wait, keep the heaters warm enough.
- Both cost Data days like Point the antenna (the framework's one consequence); the show names the reason per kind.
- Mini-game numbers are fixed game units, the same for every design (only the eclipse's starting charge depends on the battery).

**As built:** rules in `src/game/anomalies.ts` (`panelChance`, `eclipseChance`, `rollAnomaly`), games in `src/game/panelGame.ts` and `src/game/eclipseGame.ts`, screens in `src/ui/panelView.ts` and `src/ui/eclipseView.ts`. `src/ui/anomalyPanel.ts` is now a shell for any kind (`MiniGameView` in `src/ui/miniGame.ts`); Point the antenna moved to `src/ui/antennaView.ts`. Tested in headless Chromium at 1280×800: both games won and lost (eclipse lost to cold and played to sunrise), the antenna still plays, the report explains the eclipse; no console errors.

**For later tickets:** Dodge the debris and Stop the tumble (Optional) are a new `ANOMALY_KINDS` entry, a chance in `rollAnomaly`, a pure game file and a `MiniGameMaker` added to `VIEWS` in `anomalyPanel.ts`.
