# 33: Maturity strip and Design Review

**What to build:** Two linked pieces from JPL's Concept Maturity Levels.

1. **Maturity strip:** a four-step strip at the top of the Mission Designer with JPL's names and a plain hint for each step. Steps light up as the player reaches them.

| Step | JPL name | Reached when (LEAP) |
|---|---|---|
| 1 | Cocktail Napkin | the Contract is accepted |
| 2 | Initial Feasibility | every bar is covered (no bar short) |
| 3 | Trade Space | a second, different design has been tried in a Test Run for this Contract |
| 4 | Point Design | the Design Review is passed |

2. **Design Review:** before Shipping, a red / yellow / green checklist in the style of JPL's CML 4 checklist: one line per requirement (orbit and mass, Payload, Power, Data, Communications, Time, Budget), plus spare mass, spare power and spare energy measured against JPL's 35%. It passes when at least 80% of the lines are green (JPL's rule). It replaces the repeated warnings list in the Launch planner. A weak design can still ship, as now; the review only says how ready it is.

**Blocked by:** 32 (the Launch planner's layout changes there first)

**Status:** not started (approved 2026-11-13)

- [ ] The strip shows the four steps with JPL's names, the current one highlighted, each with a one-line hint (e.g. "Cocktail Napkin: you have an idea and a client")
- [ ] Steps follow the rules in the table; step 3 needs a Test Run of a design that differs from an earlier tested one for the same Contract
- [ ] The Design Review opens from the Launch planner before Shipping, one line per requirement and one per margin, each red, yellow or green with the number behind it
- [ ] Colours: green = met with at least JPL's margin, yellow = met but with less margin, red = not met (game rule; JPL's colours mean complete / in progress / not started, so say "in the style of")
- [ ] Margin lines: spare mass, spare power, spare energy, each against 35%
- [ ] It shows the share of green lines and "Passed" at 80% or more; passing reaches step 4 of the strip
- [ ] The Launch planner's repeated warnings list is gone; Shipping is still allowed for a weak design and still blocked only for the existing hard reasons (no Contract, empty slots, too much mass, missing Parts, not enough money)
- [ ] The flight rule does not change: "a 10% margin always holds" stays true in `src/game/flight.ts`
- [ ] Learn more → the CML paper; glossary terms **Concept Maturity Level** and **Design Review** used exactly
- [ ] Tests for the colour rules, the 80% rule and each strip step; browser check with Explorer 1 (tutorial design), TIROS-1 and Syncom 3

**In the code (read-only pointers):** bars and problems in `src/game/spacecraft.ts` (`checkDesign`, `DesignCheck`, `Gauge`, `DesignProblem`); the warnings list in `src/ui/launchPlanner.ts` (`designWarnings` hook, `planner.warnings*` strings) fed from `src/ui/missionDesigner.ts`; Test Run in `src/game/flight.ts` (`testRun`) and `testRunFor` in `src/game/mission.ts`; tutorial steps in `src/game/tutorial.ts` (the tutorial must still finish in under 10 minutes). Save version bump if the strip's progress is stored.

**Sources:** Wessen, Borden, Ziemer, Kwok (JPL), "Space Mission Concept Development Using Concept Maturity Levels", AIAA SPACE 2013: CML 1–4 names and definitions; "a mission concept is considered to be at a particular concept maturity level if 80% of the attributes in that column have been completed (green)"; feedback loop between CMLs 2–4; self-assessment "tends to result in overly optimistic scores". CML 4 checklist margins (Figure 8b): spacecraft dry mass ≥ 35%, power ≥ 35%, energy ≥ 35% (the figure is an image; numbers read from the PDF). <https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299>. Notes: `docs/research/official-resources.md`.

**Real data and Credits:** add the CML paper to `DATASETS` when this ships (ticket 27).

**In the repo for this ticket:** Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md). The JPL paper is not stored (copyright); its levels, 80% rule and margins are written out in the note.

**Open points:**
- How LEAP measures each margin: spare mass as (lift − mass) ÷ mass? Spare power as sunlight watts against watts used, spare energy as the Power bar's Wh against Wh used? Decide and write it in GDD §7.
- Designs on batteries alone have no "power" margin in sunlight terms: count the line as not applicable (left out of the 80%) or measure battery watts.
- With Era 1 Parts many good designs have under 35% spare mass (Juno I lifts about 14 kg for an 11.5 kg design: about 22%). Decide whether yellow there is the lesson or whether the threshold is shown but softened in Easy mode.
- Whether the Weekly Challenge shows the review (it has its own score).
