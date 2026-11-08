# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–04 done (on `main`). Since then, on `claude/sharp-cray-oqvpn1`, at the team's request, all tested in headless Chromium:
- Land to the horizon, perspective camera with tilt (ADR-0003), working sun shadows, Seed in the pause menu (Esc). See the previous log line.
- **Controls:** pan reaches 32 tiles past the Site (`PAN_BEYOND_SITE` in `src/world/camera.ts`). Keyboard in `World.listenToKeys`/`moveCamera` (`src/world/world.ts`): WASD/arrows move, Q/E turn, R/F tilt, +/− zoom, **H** or the ⌂ HUD button glides home to the isometric whole-Site view (nearest corner kept). `world.keyboardEnabled` is off while the pause menu is open. The pause menu lists the controls.
- **Detailed Mine** (`src/world/mineMesh.ts`): pad, hoist house with gable roof/door/windows, braced headframe, winding wheel (`spin`, turned by `World.animateBuildings` while the Site runs), cable, rails and ore cart, ore piles, lamp.
- Full-detail scenery now reaches one Site-sized Plot past each edge (`NEAR_REACH = 64`), ready for ticket 30. About 137k triangles in total.
- **New ticket 30** (Optional, blocked by 05): buy neighbouring Plots. Ticket 05 now requires detailed Factory/Warehouse models at the Mine's level.

**Next:**
1. Ticket 05 (Factories and Market), with detailed models per its new criterion. Reuse the helpers in `mineMesh.ts` (`bar`, `gableRoof`) — consider moving them to a shared `buildingParts.ts`.
2. Also unblocked: 06, 19, 25. Ticket 30 after the Required tickets unless the team moves it up.

**Open:**
- The camera orbits a point at ground level (y = 0), so on high plateaus it looks slightly below the buildings. Could follow terrain height later.
- Each Mine is ~35 small meshes; if Sites get dozens of buildings, merge static parts per material.
- Performance unknown on real laptops (no GPU here). Knobs: shadow map size in `world.ts`, `NEAR_REACH`/`FAR_REACH` in `siteMesh.ts`.
- Ticket 30 open question: free Deposit view of a Plot, or a paid Survey? Default free.
- No "New game"/reset yet. Speed isn't saved. Balance numbers are first guesses.
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `domain-modeling` (Factory, Part, Warehouse in ticket 05), `handoff`.

## Log

- 2026-11-08: Keyboard camera + H for the whole-Site view, pan past the Site, detailed Mine with turning wheel; ticket 30 (buy Plots, Optional) written.
- 2026-11-08: Seed moved to a pause menu (Esc); land carries on to the horizon; perspective camera with tilt (ADR-0003); working sun shadows.
- 2026-11-08: Ticket 04 done: Mines on Deposits, Game date with pause/1×/2×/4×, top bar, save v3.
- 2026-11-08: Ticket 03 done: Site generated from a Seed (terrain, water, Deposits), Seed shown and copyable.
- 2026-11-08: Ticket 02 done: Company name with bad-word filter, local autosave, strings file.
- 2026-11-08: Ticket 01 done: Vite + Three.js skeleton, isometric camera, pre-commit checks.
- 2026-11-07: Game named **LEAP: A Space Mission Design Game** (Launch · Engineer · Advance · Pioneer).
- 2026-11-07: Music prompts, cited research, `to-tickets` installed, 28 tickets approved and published.
- 2026-11-07: Design session done; GDD, glossary, ADR-0002, checklist, AGENTS.md written.
- 2026-11-07: Researched the challenge, chose the web stack, wrote `docs/challenge.md`, set up phase-1 skills and memory files.
