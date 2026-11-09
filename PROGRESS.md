# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–05 done (on `main`), tested in headless Chromium (build, click a Factory, switch Part, Market buy/sell, Esc order, iso and low-tilt views):
- **Domain:** `src/economy/part.ts` (Factory kinds, building kinds, Era 1 Parts), recipes and prices in `src/game/balance.ts`, `src/game/siteState.ts` (`build`/`checkBuild` for every building, Factories, storage by mass), `src/game/market.ts`. Rules in `docs/GDD.md` §5 (new bullets under "First tuning").
- **Save v4** (`src/save/save.ts`): v3 saves keep Mines and stock.
- **Models:** shared helpers in `src/world/buildingParts.ts` (palette, `parts()`, `PRODUCT_COLOUR`, names of moving parts); Factories and Warehouse in `src/world/factoryMesh.ts`. `World.addBuilding`/`setWorking`; Factories move only while making a Part, Mines stop when storage is full.
- **UI:** build menu with all six buildings, Storage in the top bar, Market panel (HUD button, `src/ui/marketPanel.ts`), building panel on click (`src/ui/buildingPanel.ts`).
- **Camera fix:** the orbit point now glides to the ground height (`World.followGround`), so high plateaus no longer put the low-tilt camera under the ground. Closes the old open item.
- **Material selling:** already in ticket 05. Checked all three Raw Materials: 10 kg lots add money, keep fractional leftovers and survive reload. Added regression tests, clearer text for less than a full lot, and a short README note. The pause overlay now covers the Market; Esc resumes before closing panels. Checked in Chromium at 1440×900, 1366×768 and 1024×768; agent review passed.

**Next:**
1. Ticket 06 (Contracts board), then 07 (Mission Designer: "Parts come from the Warehouse" — use `state.parts`, `buy()` for buying on the spot; Part mass is in `RECIPES`). Also unblocked: 15, 19, 25, 30.

**Local launchers:** `LEAP.bat` (Windows), `LEAP.command` (macOS), `LEAP.sh` (Linux), with setup in `scripts/leap.ps1` and shared `scripts/leap.mjs`. They fetch the current Node.js LTS from the official release index, verify its SHA-256 checksum, and keep the runtime and npm cache in ignored `.leap/`. `npm ci` uses the current lockfile, includes development/optional packages, and checks engines; package-file or runtime changes trigger reinstall, and an engine failure refreshes Node once. Later starts check the installed dependency tree. Vite starts in the launcher process on `localhost:5173`; readiness is checked before opening the browser. Reopening recognises both the launcher and the existing `npm run dev` command, prints the link and explains how to quit. Linux file-manager launches open a terminal. Setup has download progress and a moving install bar. Game code, saves, package files and tickets are unchanged.

**Launcher validation:** clean Linux download/install/start, repeat launch and Chromium play/reload passed (3D canvas, Company retained, no page errors). `node --test scripts/leap.test.mjs` checks real Vite with simulated installs/openers: setup, cached restart, updates, broken packages, failed install/retry, runtime refresh request, stale lock, simultaneous setup, occupied port, existing dev server, paths with spaces/punctuation, Linux terminal opening and rejected downloads. Shell and PowerShell syntax passed; PowerShell streaming download, archive/checksum handling and setup locking also checked on Linux with fixtures. `npm run check` (75 tests) and `npm run build` passed; the existing bundle-size warning remains. Native Windows and macOS desktop smoke tests are still due. README has run, reopen, quit and troubleshooting steps; AGENTS.md records launcher maintenance. The next game ticket stays 06.

**Launcher test schedule:** the team wants launcher validation saved for the final ticket. Do not rerun launcher tests or setup/browser/progress/reopen/quit smoke tests for each ticket, update, dependency change or launcher edit unless explicitly asked. At the final ticket, run the separate launcher suite and clean Windows/macOS/Linux smoke tests, including the native checks still due. Keep the existing game tests, type checks and pre-commit hook. Normal dependency checks when a player starts LEAP are unchanged.

**Open:**
- Part list is a first cut for Era 1; ticket 07 adds the other stats (power, reliability) and may add Payloads. Keep inputs Raw Materials only (a test enforces Mine → Factory → Part).
- Factories cost nothing to run. Upgrades (ticket 15) will raise output.
- Balance numbers are first guesses (Market prices like "$18.64K" could be rounded).
- Each building is ~35–60 small meshes; merge static parts per material if Sites get crowded. Performance on real laptops still unknown.
- Market fits at 1024×768, but the top bar overlaps part of the Company panel at that width. Narrower screens are not checked.
- No "New game"/reset yet. Speed isn't saved.
- Ticket 30 open question: free Deposit view of a Plot, or a paid Survey? Default free.
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `domain-modeling` (Contract terms in ticket 06), `handoff`.

## Log

- 2026-11-10: Deferred further launcher validation to the final ticket; existing game checks stay in place.
- 2026-11-10: Added local launchers with dependency setup, progress, browser opening and reopening; game code and tickets unchanged.
- 2026-11-08: Checked existing Raw Material sales; added regression tests and a README note, fixed the stock message and pause overlay.
- 2026-11-08: Ticket 05 done: Factories, Warehouse storage by mass, Market, detailed moving models; camera follows ground height.
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
