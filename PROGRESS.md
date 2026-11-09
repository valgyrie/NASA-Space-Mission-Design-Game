# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01–06 done. Ticket 06 (Contracts board) is on branch `claude/practical-wozniak-6t2cl1`, waiting for the team to merge. Tested in headless Chromium at 1440×900 and 1024×768: open the board, accept Explorer 1, watch days count down, Market and board close each other, Esc closes the board, the Contract survives reload, no console errors.
- **Domain:** `src/game/contracts.ts` (`CONTRACTS`, `acceptContract`, `availableContracts`, `deadlineDay`, `daysLeft`). Requirements are typed data (`orbit`, `payload`, `dataDays`) so ticket 08's Mission Report can check them. Reward and deadline are in `src/game/balance.ts`. Deadlines count whole Game dates from the day accepted.
- **Save v5:** `SiteState.contracts` (accepted Contracts with `acceptedDay`); v4 saves get `contracts: []`.
- **UI:** `src/ui/contractsPanel.ts` (left side panel, same spot as the Market). HUD has a Contracts button that pulses until a Contract is taken, and an "Explorer 1: N days left" line. `showHud` now returns `{ update(state) }`.
- **Layout fix:** the top bar and HUD no longer overlap at 1024×768 (checked 1024–1440 px wide with a 24-character name and big numbers).
- **Facts:** Explorer 1 client and the 30-day Data requirement are cited in `docs/research/milestones.md` (Game notes). Rules in `docs/GDD.md` §6.

**Next:**
1. Ticket 07 (Mission Designer v1): Parts come from the Warehouse (`state.parts`, `buy()` to buy on the spot; Part mass is in `RECIPES`). It needs a **radiation detector** Payload, which the Explorer 1 Contract already names (`PayloadKind` in `contracts.ts`, string `payload.radiationDetector`). Also unblocked: 15, 19, 25, 30.

**Open:**
- A passed deadline only shows "deadline passed" (orange). Penalties and retries belong to ticket 17.
- Explorer 1 numbers ($3M reward, 365 days) are first guesses; tune once Rideshare prices exist (ticket 08).
- Part list is a first cut for Era 1; ticket 07 adds the other stats (power, reliability) and Payloads. Keep inputs Raw Materials only (a test enforces Mine → Factory → Part).
- Factories cost nothing to run. Upgrades (ticket 15) will raise output.
- Balance numbers are first guesses (Market prices like "$18.64K" could be rounded).
- Each building is ~35–60 small meshes; merge static parts per material if Sites get crowded. Performance on real laptops still unknown.
- Narrower than 1024 px is not checked. (The top bar no longer overlaps the HUD from 1024 px up: the HUD has a fixed width, long names end in "…", and the top bar is tighter below 1280 px.)
- No "New game"/reset yet. Speed isn't saved.
- Ticket 30 open question: free Deposit view of a Plot, or a paid Survey? Default free.
- Team: save the organisers' early-start permission in writing; capture the official Resources (Nov 13).

**Suggested skills:** `domain-modeling` (Part and Payload terms in ticket 07), `handoff`.

## Log

- 2026-11-09: Ticket 06 done: Contracts board, Explorer 1 Contract with deadline, save v5.
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
