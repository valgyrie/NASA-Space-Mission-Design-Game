# 21: Free Play

**What to build:** A new Free Play Company can start anywhere on Earth in the modern Era with generated Contracts. Finishing the Campaign continues into Free Play with the same Company.

**Blocked by:** 18

**Status:** built, waiting for a team test

- [x] Free Play starts anywhere on Earth in the modern Era
- [x] Contracts are generated with varied objectives and rewards
- [x] Campaign Companies can continue into Free Play

**As built:** Campaign (default) and Free Play are separate from Easy/Advanced at Company setup. Free Play starts in 2026, with the globe and Random available worldwide, HQ level 5, the existing Part set and a level 1 Assembly Hall. Solar Cells need no history card here; building Upgrades, Part Marks, Research, money and storage still matter. Settings shows the current play mode.

Three generated offers cover radiation surveys, weather photography and geostationary relays for fictional clients. Each has a stable numbered ID, varied duration/orbit/reward and a deadline; accepting replenishes the board, completing pays and keeps it done, missed work can be retried. The same Contract lookup feeds the designer, Test Run, Shipping, flight, Research, reports, Patches and Space view. No second simulation or stored copy of the generated catalogue.

Falcon 9 Rideshares serve the modern Era; historical rockets retire. Its two-stage low-poly model follows the existing rocket style and carries the Company logo. Capacity uses the expendable figures; booster landing is not part of this ticket. Facts and game estimates are separated in `docs/research/launch-vehicles.md`.

The board offers **Continue in Free Play** after all currently built Campaign Milestones, through Syncom 3. It keeps the Company, Site and history, jumps forward to 2026 without moving backwards, and preserves pending Upgrade time. The planned finale remains Artemis IV; later Campaign Milestones move this interim endpoint. Save v18 adds `state.playMode`; earlier games stay in Campaign with existing Missions intact. Online features wait for tickets 22–23.

**Files:** `game/contracts.ts` generates and resolves Contracts; `game/modes.ts` holds play mode choices; `game/eras.ts` adds the modern Era; `game/siteState.ts` starts and continues Companies. Existing flight, history, save and UI modules use the shared lookup. Text stays in `src/strings.ts`; the UI reuses the existing panels and styles.

**Tested:** 321 unit tests and the production build pass, with seven focused tests added. Checks cover modern starts, varied stable offers and deadlines, all three objective types through the shared Mission rules, continuation and pending Upgrade time, shipping/reload, old-save migration and invalid saved IDs/modes. Chromium at 1280×800 and 1024×768: Campaign/Free Play selection, globe/Random controls, Easy and Advanced setup, offers and accepting, Solar Cells without a history card, buying Parts, Test Run, modern/retired rockets, Shipping, reload, Settings and continuation. A production-build Falcon 9 Launch reached a successful generated Mission Report and Patch; its completed Contract survived reload. Assembly/Shipping time and calm weather were set in a saved fixture for that flight, with previous Anomaly scores allowing the normal skip. Continuation used a completed-Campaign fixture. No application page errors in the completed checks. No new dependencies or test framework; launcher checks wait for the final ticket. Team playtesting and touch remain unchecked.
