# 43: Open in GMAT _(Later)_

**What to build:** A button in the Space view, on a followed Spacecraft, that saves a small GMAT script file of that Spacecraft's orbit, so a curious player can open it in NASA's free GMAT program and see the same orbit there.

**Blocked by:** 31, 34; and a person who opens one exported file in real GMAT (GMAT could not be installed in the build container: SourceForge blocks automated downloads)

**Status:** not started (approved 2026-11-13, Later)

- [ ] **Save for GMAT** on the followed Spacecraft writes a `.script` file (download, nothing online) with a Spacecraft defined by its orbit (perigee, apogee, inclination; epoch = its Launch date), a propagator and an orbit view
- [ ] One line explains GMAT ("NASA's free program for planning orbits") with Learn more → the GMAT page
- [ ] A team member opens a file for Explorer 1 and one for Syncom 3 in GMAT R2025a or later and confirms the orbit draws; the result is noted in this ticket before it is ticked
- [ ] Text in `src/strings.ts`; a unit test checks the script text for a known orbit

**In the code (read-only pointers):** Space view `src/ui/spaceScreen.ts`, `src/world/spaceView.ts`; orbit data on the Mission report and `src/game/space.ts` (`Satellite`, `orbitKm`); Contract inclination where stored in `src/game/contracts.ts`.

**Sources:** GMAT in the NASA Software Catalog (GSC-19468-1, names R2025a; open source; Windows, Linux, Mac OS) <https://software.nasa.gov/software/GSC-19468-1>; downloads on SourceForge <https://sourceforge.net/projects/gmat/> (R2026a is the newest release there). GMAT script syntax: GMAT's own User Guide _(verify the exact keywords against the guide; none were tested here)_.

**Open points:** whether to keep the file to Keplerian elements only (simplest) and how to state the frame (Earth-centred, equatorial).
