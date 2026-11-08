# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** tickets 01 and 02 are done and tested in headless Chromium.
- 01: empty isometric Site and camera (`src/world/`). Pre-commit hook runs `npm run check` (tsc + Vitest).
- 02: a new game shows "Start your Company" (`src/ui/newCompany.ts`). Name rules and bad-word filter in `src/company/companyName.ts` (uses the `obscenity` library, also checks the name with spaces and dots removed). Local save in `src/save/save.ts` (`localStorage` key `leap.save`, `version: 1`), autosaves on start, every 30 s and when the page is hidden. The HUD (`src/ui/hud.ts`) shows the Company name.
- All player text is in `src/strings.ts`, read with `t(key, values)`. `src/strings.test.ts` fails if a DOM text property is set to a literal elsewhere, or if `index.html` has visible text.

**Next:**
1. Ticket 03 (Site from a Seed) is the natural next step. 06 (Contracts board), 19 (Company logo) and 25 (sound and music) are also unblocked.
2. New state (Site, money, time) goes into `SaveData` in `src/save/save.ts`. Bump `SAVE_VERSION` when the shape changes; old saves are currently just ignored (no migration yet).

**Open:**
- No "New game" or reset button yet: to start over, clear the site's local storage. Belongs with the main menu.
- Team should save the organisers' early-start permission in writing.
- Official Resources tab not captured yet (Nov 13).
- Build skills (`tdd`, `codebase-design`, …) still not installed.

**Suggested skills:** `domain-modeling` (Site, Seed, deposits in ticket 03), `handoff`.

## Log

- 2026-11-08: Ticket 02 done: Company name with bad-word filter, local autosave, strings file.
- 2026-11-08: Ticket 01 done: Vite + Three.js skeleton, isometric camera, pre-commit checks.
- 2026-11-07: Game named **LEAP: A Space Mission Design Game** (Launch · Engineer · Advance · Pioneer).
- 2026-11-07: Music prompts, cited research, `to-tickets` installed, 28 tickets approved and published.
- 2026-11-07: Design session done; GDD, glossary, ADR-0002, checklist, AGENTS.md written.
- 2026-11-07: Researched the challenge, chose the web stack, wrote `docs/challenge.md`, set up phase-1 skills and memory files.
