# 13: Tutorial and Real History

**What to build:** The Explorer 1 tutorial gets a new player to their first Launch in under 10 minutes, with Real History cards before and after, the first Mission Patch, and the History Archive.

**Blocked by:** 09, 11

**Status:** built; waiting for a tester to time the first Launch

- [ ] A new player reaches Launch in under 10 minutes (timed by a tester). A scripted run reached the Launch button in 1 min 45 s at 1280×800; a person still needs to time it.
- [x] Each step teaches one idea with one short line of text
- [x] Real History card before (the real story) and after (what happened next), with Learn more →
- [x] First Mission Patch is awarded and appears in the patch gallery
- [x] History Archive keeps every unlocked card
- [x] Explorer 1 facts match the research notes
- [x] Cards use real NASA photos with a visible credit line

**For later tickets:** cards are in `src/game/history.ts` (`HISTORY_CARDS`, photo in `public/history/`, text and credit in `strings.ts` under `history.<id>.*`). A new Milestone adds its "before" and "after" cards there; `historyCardFor` finds them, accepting the Contract shows "before", a successful Mission unlocks "after" (`awardMission`, called by `launch`). Patch colours per Contract are in `src/ui/patch.ts`; the Company logo (ticket 19) should go in its centre. The tutorial steps are `src/game/tutorial.ts`; buttons it points at carry `data-tutorial` (`src/ui/tutorialGuide.ts`).

**QA (2026-11-11):**

- [ ] Keep the tutorial clear of the controls it points at. At **1440×900**, step 6 tells the player to book the Rideshare, but covers the Shipping button's label and price at the bottom of the Launch planner. Clicking the centre hits the guide; the exposed sides still work, or the player can skip the tutorial. The card can also cover part of Test Run. Checked after building a Mine and Metal Works.

![Step 6 covers the Shipping button](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/2026-11-11/tutorial-covers-shipping.png)

**Rechecked (2026-11-12):** still reproduces on `4661008`. Current screenshots: [1](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-13-tutorial-covers-shipping.png).
