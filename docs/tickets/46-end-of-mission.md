# 46: End of mission _(Later)_

**What to build:** Low orbits decay. The Space view shows when a Spacecraft will come down, and Free Play Contracts ask for a plan to leave orbit. Ties to the planned Dodge the debris Anomaly.

**Blocked by:** 31

**Status:** not started (approved 2026-11-13, Later). Research first: every number here needs a source.

- [ ] Research note (in `docs/research/`) with real re-entry dates of LEAP's Milestone Spacecraft and the rules for leaving orbit _(verify all)_
- [ ] A Spacecraft in a low orbit gets a re-entry date (game estimate from its orbit, anchored to real cases); the Space view shows "Comes down in about N years" and removes it after that date
- [ ] Higher orbits (e.g. Telstar 1, Syncom 3: still in orbit) say so
- [ ] Free Play Contracts can require an end-of-mission plan (e.g. a small engine burn to lower the orbit, or a low enough orbit), shown as a requirement in the Mission Designer and the Mission Report
- [ ] Link to the Dodge the debris Anomaly when it is built (Optional in `CHECKLIST.md`)
- [ ] Text in `src/strings.ts`; tests; browser check

**Facts already in the repo:** Explorer 1 re-entered on 31 Mar 1970; Telstar 1 and Syncom 3 are still in orbit (`docs/research/milestones.md`).

**In the code (read-only pointers):** `src/game/space.ts` (`satellitesInOrbit`, `satelliteStatus`); Space view `src/ui/spaceScreen.ts`; Free Play Contracts `src/game/contracts.ts`; Propulsion slot in `src/game/spacecraft.ts`.

**Sources to research:** Goddard Mission Design Lab (covers "end-of-mission planning" and orbital debris) <https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/>; CubeSat 101 §6.1 Orbital Debris Mitigation Compliance (p. 54: the ODAR shows the CubeSat "will deorbit in a reasonable amount of time") <https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf>; real re-entry dates from NASA NSSDC _(verify)_. GMAT supports end-of-life modelling (Goddard GMAT page).

**Open points:** how fast decay is shown (real decay takes years to decades; the Space view runs 300× real time).
