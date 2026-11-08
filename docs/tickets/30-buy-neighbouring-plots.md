# 30: Buy the land next door

**What to build:** The land around the Site is split into Plots the same size as the Site (64 × 64 tiles). The player can move the camera over a neighbouring Plot, see what it holds (Deposits, water, land), and buy it. A bought Plot becomes part of the Site.

**Blocked by:** 05 (Raw Materials and Parts need a value before land is worth buying)

**Status:** ready-for-agent. **Optional:** do it after the Required tickets unless the team moves it up.

**Why:** classic tycoon growth, and a real trade-off: a Plot with rich Copper inland, or one on the coast for a future Spaceport? It also gives the "land" Contract reward in `docs/GDD.md` §6 something to be.

- [ ] Neighbouring Plots get Deposits from the Seed, using their own random numbers so the Home Site never changes
- [ ] Hovering a neighbouring Plot highlights it; clicking shows a card: Deposits per Raw Material, water, main land types, price
- [ ] Price grows with what the Plot holds and with each Plot already bought
- [ ] Only Plots touching land the Company owns can be bought (the eight around the Home Site first)
- [ ] A bought Plot joins the Site: Mines and other buildings can go on it, the border line grows around it, and the camera can pan over it
- [ ] Bought Plots survive save and reload
- [ ] A Contract can give a Plot as its reward

**Notes for the agent:**
- `src/site/site.ts` `landOf(site).groundAt(x, z)` already gives the land anywhere; Plot (px, pz) covers tiles `px*64 … px*64+63`. The 8 neighbours are already drawn in full detail (`NEAR_REACH = 64` in `src/world/siteMesh.ts`).
- Save the list of owned Plots (e.g. `[[0,0],[1,0]]`), not their tiles. Bump `SAVE_VERSION` with an upgrade step.
- Open question for the team: show a Plot's Deposits for free, or charge a small Survey fee first? Free is simpler for younger players; a Survey adds a decision. Default to free.
