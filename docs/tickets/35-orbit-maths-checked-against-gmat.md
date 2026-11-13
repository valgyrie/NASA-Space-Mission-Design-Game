# 35: Orbit maths checked against GMAT

**What to build:** A repo test that compares LEAP's own orbit code with NASA GMAT's output from ticket 34, and one line in Real data that says the check exists and how close it is.

**Blocked by:** 34 (its baked trajectory module). The GMAT runs themselves are in `docs/research/sources/mission-viz/`.

**Status:** not started (approved 2026-11-13)

**What is compared, plainly:** LEAP's Space view moves a Spacecraft along a fixed ellipse round a point Earth (two-body Kepler: `orbitMinutes` and `orbitPosition` in `src/game/space.ts`). GMAT's runs include more physics (the Moon's and Sun's pull, Earth's shape). The test takes GMAT's long-ellipse run (`MolniyaOrbit.json`, 155 points over 3.0 days), reads its lowest and highest points, gives LEAP the same orbit, lines up the time of the lowest point, and then compares the **distance from Earth's centre** at every GMAT time. It also compares the lap time. It does not compare direction in space (LEAP draws the orbit in its own plane).

- [ ] Test in the repo (e.g. `src/game/space.gmat.test.ts`) using the module from ticket 34; no network, no GMAT install
- [ ] Distance from Earth's centre: mean difference ≤ 2%, worst point ≤ 5% (tolerance set by this ticket; game estimate of what two-body maths should reach)
- [ ] Lap time from `orbitMinutes` within 1% of GMAT's period (about 66.7 h)
- [ ] Final circle of the transfer run (`missionfile.js`): GMAT ends at 42,165 km radius; LEAP's geostationary orbit is 35,786 + 6,371 = 42,157 km. Test within 0.1%
- [ ] The test explains in a comment what is and isn't compared and why the tolerance is not tighter
- [ ] One line in Real data (strings `data.<id>.*`), e.g. "LEAP's orbit maths is tested against a NASA GMAT run: within N% on average." N comes from the test's real result
- [ ] Type checks and all tests pass

**Expected result:** a throwaway check outside the repo (plain two-body maths, not LEAP's code) matched the long-ellipse run to 0.7% of distance on average over 2.8 days and 3.2% at worst, near the highest point, where the Moon's pull shows. LEAP's code should do about as well; if it does not, find out why before loosening the tolerance.

**In the code (read-only pointers):** `src/game/space.ts` (`EARTH_KM` 6,371, `EARTH_GM` 398,600, `orbitMinutes`, `orbitPosition`); its tests in `src/game/space.test.ts`; facts in `docs/research/orbits.md`. `orbitPosition` takes a share of a lap from the lowest point, so turn GMAT's time since the lowest point into a share with the lap time.

**Sources:** trajectory files and numbers in ticket 34 and `docs/research/official-resources.md`. GMAT <https://software.nasa.gov/software/GSC-19468-1>.

**In the repo for this ticket:** [`docs/research/sources/mission-viz/`](../research/sources/mission-viz/) (source files, read as data; index in [`sources/README.md`](../research/sources/README.md)). Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md).

**Open points:**
- Whether the line belongs in Real data or in Credits' Software section (GMAT is software; the run is data).
