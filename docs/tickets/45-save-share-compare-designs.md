# 45: Save, share and compare designs _(Later)_

**What to build:** Two designs side by side in the Mission Designer, and a short code that copies a design, like a Seed.

**Blocked by:** 07, 23

**Status:** not started (approved 2026-11-13, Later)

- [ ] Keep up to two saved designs per Contract (A and B); switch between them
- [ ] **Compare** shows A and B side by side: the six bars, mass, cost, the Test Run's estimated success, and (after ticket 33) the Design Review's share of green
- [ ] **Copy design** gives a short code; pasting a code loads that design (Parts not owned show as to buy)
- [ ] Codes are checked like Seeds: an invalid or locked choice is refused with one line
- [ ] Text in `src/strings.ts`; tests for code round trips and invalid codes; browser check

**In the code (read-only pointers):** `Design`, `isValidChoice`, `emptyDesign` in `src/game/spacecraft.ts`; Mission Designer `src/ui/missionDesigner.ts`; Seed codes and sharing in ticket 23 (`src/game/weekly.ts`, the pause menu's Copy in `src/ui/menu.ts`).

**Sources:** challenge brief, "The ability to save, share, and compare mission designs" (`docs/challenge.md`); Goddard Mission Design Lab's Tailored Trade Study ("compare different mission architectures and design options") <https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/>.

**In the repo for this ticket:** [`docs/research/sources/mission-design-lab.txt`](../research/sources/mission-design-lab.txt) (source files, read as data; index in [`sources/README.md`](../research/sources/README.md)). Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md).

**Open points:** whether a design code should also work in the Weekly Challenge (it could leak answers during the week).
