# 47: A timeline you can drag _(Later)_

**What to build:** In the Space view, a followed Spacecraft gets a timeline of its Mission's events (Launch, reaching orbit, Anomaly, Power ran out, Mission done) that the player can drag through, watching the Spacecraft and its status at that moment.

**Blocked by:** 31

**Status:** not started (approved 2026-11-13, Later)

- [ ] A timeline bar under the followed Spacecraft with marks for each event of its Mission Report
- [ ] Dragging moves the Spacecraft along its orbit to that time and updates its status line; letting go returns to live time (or a **Live** button)
- [ ] Keyboard: ← → step between events
- [ ] With ticket 34, Reference Trajectories can be scrubbed the same way (e.g. the Earth → Moon flight's 21 days)
- [ ] Text in `src/strings.ts`; tests for event times; browser check

**In the code (read-only pointers):** Space view `src/world/spaceView.ts`, `src/ui/spaceScreen.ts` (`statusText`, `satelliteFacts`); Mission Report data in `src/game/mission.ts`; Anomaly day in `src/game/anomalies.ts`.

**Sources:** 2023 Space Apps challenge "Visualize a Space Mission Using Virtual Reality" (mission concept, orbital trajectories, mission timeline, 3D) <https://www.spaceappschallenge.org/2023/challenges/visualize-a-space-mission-using-virtual-reality/>; NASA Mission Viz <https://nasa.github.io/mission-viz/>.

**In the repo for this ticket:** Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md). The 2023 challenge text is summarised in the note.
