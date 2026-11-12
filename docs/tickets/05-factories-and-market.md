# 05: Factories and Market

**What to build:** Factories turn Raw Materials into Parts, the Warehouse stores them, and the Market buys and sells at worse prices than making them yourself.

**Blocked by:** 04

**Status:** done

- [x] Metal Works, Electronics Lab, Solar Fab and Battery Plant can be built
- [x] Each Factory turns its inputs into its Parts over time
- [x] Warehouse capacity limits storage and is shown
- [x] Market buys Raw Materials and Parts above making cost and sells below it
- [x] Selling Raw Materials takes 10 kg from stock, adds money and survives reload; less than a full lot leaves stock and money unchanged
- [x] Chains are never longer than Mine → Factory → Part
- [x] Each Factory and the Warehouse has a detailed low-poly model at the Mine's level (`src/world/mineMesh.ts`): a building you can recognise (Metal Works: furnace and chimney; Electronics Lab: clean white lab with antenna; Solar Fab: panels on the roof; Battery Plant: tanks and pipes), small details (doors, windows, lamps), at least one moving part while it works (via `World.animateBuildings`), and something in the colour of what it makes
- [x] Buildings look right both from the isometric start view and tilted low toward the horizon

**QA (2026-11-11):**

- [ ] Keep storage within capacity when a Factory finishes a Part or returns its inputs. With no Warehouse, start a Small Bus with 40 kg Aluminium, pause, then fill storage with 500 kg Copper. Letting the Bus finish gives **503 / 500 kg**. Switching to Medium Bus before it finishes returns the Aluminium and gives **540 / 500 kg**.

![A finished Small Bus takes storage over capacity](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/2026-11-11/storage-finished-part.png)

![Changing the Part returns inputs above capacity](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/2026-11-11/storage-returned-inputs.png)

- [ ] Explain why a Factory with enough inputs is waiting while the Site is paused. Pause, put 40 kg Aluminium in stock, and open a Metal Works set to Small Bus. Its status says only **"Waiting for"**, with nothing after it. Production starts when the Site resumes.

![The Metal Works has its inputs but shows an empty warning](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/2026-11-11/factory-waiting-blank.png)

**Rechecked (2026-11-12):** still reproduces on `4661008`. Current screenshots: [1](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-05-finished-part-overfills-storage.png), [2](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-05-returned-inputs-overfill-storage.png), [3](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-05-paused-factory-waiting-blank.png).
