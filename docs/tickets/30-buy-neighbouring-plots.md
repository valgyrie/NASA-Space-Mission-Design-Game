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
