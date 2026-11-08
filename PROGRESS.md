# Progress

## Current handoff

**Goal:** a 2.5D space-company tycoon for NASA Space Apps 2026 (hackathon Nov 14–15). See `docs/GDD.md`.

**State:** ticket 01 (project skeleton) is done and tested in headless Chromium. `npm run dev` opens an empty isometric Site: a 64×64 grass slab with a faint tile grid, hemisphere + soft-shadow sun light.
- Code: `src/main.ts` → `src/world/world.ts` (scene, lights, ground, `MapControls`). Pure camera maths in `src/world/isoCamera.ts`, tested in `isoCamera.test.ts`.
- Camera: orthographic, tilt fixed at true isometric (35.26°). Left-drag pans (clamped to the Site), right-drag turns, wheel zooms (0.5×–4×, toward cursor).
- Pre-commit hook (Husky, `.husky/pre-commit`) runs `npm run check` (tsc + Vitest). Verified it blocks a failing test and a type error. `npm install` sets it up via `prepare`.
- Stack versions: Vite 8, Three 0.187, TypeScript 5.9 (not 7), Vitest 5.

**Next:**
1. Ticket 02 (Company and saving) or 03 (Site from a Seed); both only need 01. 25 (sound and music) is also unblocked.
2. The build skills from the last handoff (`tdd`, `codebase-design`, `diagnosing-bugs`, `setup-pre-commit`, `prototype`) were **not** installed; the hook was set up by hand. Install them if wanted.

**Open:**
- Team should save the organisers' early-start permission in writing.
- Official Resources tab not captured yet (Nov 13).

**Suggested skills:** `domain-modeling` (new terms in ticket 02/03), `handoff`.

## Log

- 2026-11-08: Ticket 01 done: Vite + Three.js skeleton, isometric camera, pre-commit checks.
- 2026-11-07: Game named **LEAP: A Space Mission Design Game** (Launch · Engineer · Advance · Pioneer).
- 2026-11-07: Music prompts, cited research, `to-tickets` installed, 28 tickets approved and published.
- 2026-11-07: Design session done; GDD, glossary, ADR-0002, checklist, AGENTS.md written.
- 2026-11-07: Researched the challenge, chose the web stack, wrote `docs/challenge.md`, set up phase-1 skills and memory files.
