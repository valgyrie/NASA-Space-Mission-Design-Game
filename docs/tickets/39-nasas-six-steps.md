# 39: NASA's six steps

**What to build:** The tutorial's eight steps sit under NASA's six step names for designing and developing a mission, so the player learns the real process while playing it.

**Blocked by:** 13

**Status:** not started (approved 2026-11-13)

| NASA step (slide 10) | Tutorial steps under it (`TUTORIAL_STEPS`) |
|---|---|
| Identify Need & Goals | contract (accept Explorer 1) |
| Define Concept | mine, factory (make the Parts) _(open point)_ |
| Define Requirements | design (fill every slot against the six bars) |
| Design | testRun (try it, change it) |
| Build & Verify | ship (assemble and ship) |
| Implement | travel, launch |

- [ ] The tutorial guide card shows the NASA step name above the existing line (e.g. "Define Requirements · Step 4 of 8")
- [ ] A small six-step row shows where the player is; done steps are ticked
- [ ] At the end, one line names all six and Learn more → the slides
- [ ] The mapping above is reviewed against the slides before building (see open points)
- [ ] The tutorial still takes under 10 minutes and never blocks; Skip still works
- [ ] Text in `src/strings.ts`; tutorial tests updated; browser check of a full tutorial at 1280×800

**In the code (read-only pointers):** `src/game/tutorial.ts` (`TUTORIAL_STEPS`: contract, mine, factory, design, testRun, ship, travel, launch; `tutorialStep`); guide card `src/ui/tutorialGuide.ts`; strings `tutorial.*` in `src/strings.ts`.

**Sources:** Design and Develop Science Missions, slide 10 "Big Picture Process to Design & Develop a Space Mission": Identify Need & Goals → Define Concept → Define Requirements → Design → Build & Verify → Implement. Slide 19: "When identifying requirements, also plan how you will verify that design satisfies requirements". <https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf>

**In the repo for this ticket:** [`docs/research/sources/design-and-develop-science-missions.txt`](../research/sources/design-and-develop-science-missions.txt) (source files, read as data; index in [`sources/README.md`](../research/sources/README.md)). Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md).

**Open points:**
- The Mines and Factory steps are tycoon steps, not NASA's "Define Concept". Alternative: put them under "Build & Verify" and show "Define Concept" and "Define Requirements" both on the design step. Decide with the team.
- If ticket 33's maturity strip is built first, keep the two rows from crowding the Mission Designer: the six steps belong to the tutorial card only.
