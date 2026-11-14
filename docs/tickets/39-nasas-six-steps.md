# 39: NASA's six steps

**What to build:** The tutorial's eight steps sit under NASA's six step names for designing and developing a mission, so the player learns the real process while playing it.

**Blocked by:** 13

**Status:** built 2026-11-14; waits for a team test (the mapping open point). Results under **Built**.

| NASA step (slide 10) | Tutorial steps under it (`TUTORIAL_STEPS`) |
|---|---|
| Identify Need & Goals | contract (accept Explorer 1) |
| Define Concept | mine, factory (make the Parts) _(open point)_ |
| Define Requirements | design (fill every slot against the six bars) |
| Design | testRun (try it, change it) |
| Build & Verify | ship (assemble and ship) |
| Implement | travel, launch |

- [x] The tutorial guide card shows the NASA step name above the existing line (e.g. "Define Requirements · Step 4 of 8")
- [x] A small six-step row shows where the player is; done steps are ticked
- [x] At the end, one line names all six and Learn more → the slides
- [x] The mapping above is reviewed against the slides before building (see open points)
- [x] The tutorial still takes under 10 minutes and never blocks; Skip still works
- [x] Text in `src/strings.ts`; tutorial tests updated; browser check of a full tutorial at 1280×800

**In the code (read-only pointers):** `src/game/tutorial.ts` (`TUTORIAL_STEPS`: contract, mine, factory, design, testRun, ship, travel, launch; `tutorialStep`); guide card `src/ui/tutorialGuide.ts`; strings `tutorial.*` in `src/strings.ts`.

**Sources:** Design and Develop Science Missions, slide 10 "Big Picture Process to Design & Develop a Space Mission": Identify Need & Goals → Define Concept → Define Requirements → Design → Build & Verify → Implement. Slide 19: "When identifying requirements, also plan how you will verify that design satisfies requirements". <https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf>

**In the repo for this ticket:** [`docs/research/sources/design-and-develop-science-missions.txt`](../research/sources/design-and-develop-science-missions.txt) (source files, read as data; index in [`sources/README.md`](../research/sources/README.md)). Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md).

**Open points:**
- The Mines and Factory steps are tycoon steps, not NASA's "Define Concept". Alternative: put them under "Build & Verify" and show "Define Concept" and "Define Requirements" both on the design step. Decide with the team.
- If ticket 33's maturity strip is built first, keep the two rows from crowding the Mission Designer: the six steps belong to the tutorial card only.

**Built (2026-11-14):**
- `NASA_STEPS` and `NASA_STEP_OF` in `src/game/tutorial.ts`, with the table above unchanged. The guide's label reads e.g. "Define Requirements · Step 4 of 8"; under it, six small numbered dots: done ones ticked, the current one lit, each named in its tooltip and for screen readers.
- Last card, once the first Mission Report is in (`tutorialEnded`): "Tutorial done", all six ticked, "You just followed NASA's six steps to design a mission: …" and Learn more → slide 10 of the slides (`SOURCES.sixSteps`, `#page=10`; PDF page 10 is slide 10). Skip becomes Close. It goes away when closed (saved as `skipped`) or when the next Mission ships. No save change. A save that already had one report and an open tutorial shows it once.
- Slides reviewed: slide 10 lists the six steps, nothing more; the slides after it use them as headings for BioNutrients-2 (Need & Goals, ConOps for Concept, measured requirements, Design, Build & Verify, operations). The order of the tutorial must not go backwards, so the table stays. The open point stays open for the team: Mines and Metal Works under "Define Concept" is the weakest fit.
- Pace: no new steps, no waits; Skip unchanged. 4 tests added (420 → 424): the mapping is in order and uses all six, the end line names all six in order, the last card's show/hide rules, never in Free Play.
- Browser: a fresh Campaign at 1280×800 and 1024×768, all eight steps, the guide low inside the Mission Designer, a real Launch with the antenna Anomaly played, the last card, Close. No page errors. Screenshots `ticket-39-*`.
