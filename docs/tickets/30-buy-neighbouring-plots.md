# 30: Buy the land next door

**What to build:** The land around the Site is split into Plots the same size as the Site (64 × 64 tiles). The player can move the camera over a neighbouring Plot, see what it holds (Deposits, water, land), and buy it. A bought Plot becomes part of the Site.

**Blocked by:** 05 (Raw Materials and Parts need a value before land is worth buying)

**Status:** built (agent tested in Chromium); awaiting team playtest. **Optional.**

**Why:** classic tycoon growth, and a real trade-off: a Plot with rich Copper inland, or one on the coast for a future Spaceport? It also gives the "land" Contract reward in `docs/GDD.md` §6 something to be.

- [x] Neighbouring Plots get Deposits from the Seed, using their own random numbers so the Home Site never changes
- [x] Hovering a neighbouring Plot highlights it; clicking shows a card: Deposits per Raw Material, water, main land types, price
- [x] Price grows with what the Plot holds and with each Plot already bought
- [x] Only Plots touching land the Company owns can be bought (the eight around the Home Site first)
- [x] A bought Plot joins the Site: Mines and other buildings can go on it, the border line grows around it, and the camera can pan over it
- [x] Bought Plots survive save and reload
- [x] A Contract can give a Plot as its reward

**Notes for the agent:**
- `src/site/site.ts` `landOf(site).groundAt(x, z)` already gives the land anywhere; Plot (px, pz) covers tiles `px*64 … px*64+63`. The 8 neighbours are already drawn in full detail (`NEAR_REACH = 64` in `src/world/siteMesh.ts`).
- Buildings take 3 × 3 tiles (`footprint` in `src/game/siteState.ts`), and the "edge" build problem keeps them inside the Site: with more Plots, check the tiles against every owned Plot.
- Save the list of owned Plots (e.g. `[[0,0],[1,0]]`), not their tiles. Bump `SAVE_VERSION` with an upgrade step.
- Open question for the team: show a Plot's Deposits for free, or charge a small Survey fee first? Free is simpler for younger players; a Survey adds a decision. Default to free.

**As built:**
- Plot (px, pz) keeps the Home Site's tile coordinates: the Home Site is Plot (0, 0), Plot (1, 0) is tiles 64–127 east of it. `src/site/site.ts` has `plotTiles`, `addPlot` and `tileAt` over owned Plots; rules are in `src/game/plots.ts`.
- Deposits on a Plot use the random numbers of `"<seed>:plot:<px>,<pz>"`. A Plot that is all sea (past a coast) gets none.
- Price: $600K × dry share of the Plot + $100K per Deposit, at least $100K, × (1 + 0.5 per Plot already bought). Game estimates in `PLOT_PRICE`.
- Hovering the land next door tints the Plot and puts a low fence round it: green if it can be bought, grey if not. Its Deposits show faintly on the land. Clicking opens the Plot card (right side); Esc closes it.
- Owned: the land is drawn, built on, outlined and clickable as one Site; shadows follow the Plot the camera looks at; the camera can pan half a Plot past the outermost owned land; the Shipping road counts bought land.
- Free Play: every 4th generated Contract (`free-3`, `free-7`, …) also gives a Plot. The next Plot is then free ("Take this Plot"). Milestones give money only.
- Survey question: default kept (free to look).
- Save v19 stores `plots` ([[1, 0], …]) and `freePlots`; older saves get none.
- Tested: 354 tests, type checks, build; Chromium at 1280 × 800 and 700 × 600: hover, card, buy, Warehouse on the new Plot, reload.
- Known: on a 700 px wide screen the card sits under the top bar, like the building panel.

**QA (2026-11-12):**

- [x] Keep the Plot card below the wrapped top bar. At **700×600**, click a neighbouring Plot: the heading and close control overlap the bar (card y=84, bar bottom y=136). The building panel has the same issue (ticket 26).

![The Plot card starts under the top bar](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-30-plot-card-under-top-bar.png)

- [ ] Check the live cloud save after this save-format change; current v19 saves are rejected by the deployed v18 backend. Reproduction and visible error: ticket 22's QA note.

- [x] Extend an active Shipping route when land is bought on its exit side. On Seed **K7QXM2**, Historic start, book Telstar 1 and buy the Plot east of the Site while assembly is under way. The old route still ends at world **x=60**, inside the now-owned east Plot (which reaches x=96). At 98% of Shipping the truck disappears there. `World.updateShipping` only makes a route when the Mission ID changes; buying the Plot keeps the old route. Check an in-progress expansion as well as buying land before Shipping starts.

The matched pair shows the [truck still present](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-30-truck-before-disappearing-on-owned-land.png) and [gone while still Shipping](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-30-truck-disappeared-on-owned-land.png).

![The truck near the old route end, inside the bought Plot](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-30-shipping-route-stops-inside-bought-plot.png)

- [x] Fit all owned land in **Whole Site view (H)**. Buy the two Plots east of the Home Site, then press **H**. It still centres (0, 0) and uses the original 171.67-unit camera distance; both eastern corners are outside the screen. The maximum zoom-out also stays at 214.59 units. On the test Site, the outer east corners projected beyond three screen half-widths. Pan still reaches the bought land, but H no longer gives a view of the whole Site.

![Whole Site view crops the bought land to the right](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-30-whole-site-view-crops-owned-plots.png)

**Solved (2026-11-13):** the Plot card follows the top bar (ticket 26's fix). Buying land keeps an active Mission's dock and runs its road past the new edge: on K7QXM2 the route end moves from x=60 to x=124, and the truck stays visible across the bought Plot. **H** now centres on all owned land and backs off to fit it; with two east Plots it looks at x=64 from 343 units and every corner is on screen. Zoom-out grows to match. Unit tests added. The cloud-save item stays open: see ticket 22.
