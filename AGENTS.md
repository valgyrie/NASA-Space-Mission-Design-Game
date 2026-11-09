# Agent guide

Instructions for any AI coding agent working on this repo (Claude Code reads it through `CLAUDE.md`).

## Project

**LEAP: A Space Mission Design Game** (Launch · Engineer · Advance · Pioneer), a 2.5D space-company tycoon for the **NASA Space Apps 2026** challenge "Space Mission Design Game". Players grow a Company (~40% tycoon) and design, launch and fly Missions that teach real space-mission trade-offs (~60%). Audience: everyone from about age 10, so easy to start, with depth for adults. Stack: TypeScript, Vite, Three.js, HTML/CSS UI, Supabase (ADR-0001).

- **Phase:** design and planning done (28 tickets in `docs/tickets/`); building starts from ticket 01 when the team says so. Space Apps organisers allowed building before the event, but the game must be adapted to NASA's official Resources (published Nov 13). Hackathon: Nov 14–15, 2026.
- **Owner:** the team reviews and tests; agents write all code and art.

## Start of every session

1. Read `PROGRESS.md` (latest handoff), then `git log --oneline -15`.
2. Read what the handoff points to. Check `CHECKLIST.md` for the next unchecked Required item.
3. Use `GLOSSARY.md` terms exactly, in text, code names and tests. Respect `docs/adr/`; if you must contradict one, say so explicitly.

## Keep these files current as you work

| File | Update when |
|---|---|
| `docs/GDD.md` | A design decision is made or changed |
| `GLOSSARY.md` | A game term is added or sharpened (no implementation details) |
| `docs/adr/NNNN-*.md` | A decision is hard to reverse, surprising, and a real trade-off |
| `CHECKLIST.md` | An item is finished (tick it only after testing it) or a new one is agreed |
| `docs/research/` | Facts or numbers are researched (always with sources) |
| `docs/audio/` | Audio is added: source, licence, credit, prompt used |
| `PROGRESS.md` | End of every session (handoff) |

## End of every session, or when usage runs low

Write the handoff in `PROGRESS.md` (Claude: run `/handoff`), commit, and push. Containers are deleted, so unpushed work is lost. Leave the game in a working state.

## Rules

- **Usage is limited** (Claude Pro, shared with chat): one topic per session, look facts up inline, spawn sub-agents only for broad searches.
- **One Checklist item at a time.** Test it in the browser before ticking it.
- **Facts must be real and cited.** No invented mission facts or numbers; mark unverified ones _(verify)_.
- **No NASA, SpaceX or other real logos.** Real mission names and facts are fine.
- **Child safety:** no chat, no personal data, anonymous accounts.
- **Git:** small commits with clear messages; push often; the team merges into `main`.

## Writing style

- The game's name is **LEAP**. Use the full title "LEAP: A Space Mission Design Game" only on the title screen, README and submission; the acronym's meaning appears only on the title screen.
- **Human-facing text** (README, docs, in-game text, commit messages): short, plain, to the point, like a good game. No filler, no marketing tone, no feature lists for their own sake.
- **Agent-facing docs** (this file, skills): whatever works best for agents.

## Where things live

| Path | What |
|---|---|
| `docs/challenge.md` | Official brief (its considerations are suggestions, not requirements) |
| `docs/GDD.md` | What the game is |
| `GLOSSARY.md` | Game vocabulary |
| `docs/adr/` | Lasting decisions and why |
| `CHECKLIST.md` | Everything to do: Required (hackathon) and Optional (later) |
| `PROGRESS.md` | Latest handoff and short log |
| `docs/research/` | Cited research notes |
| `docs/audio/` | Audio sources, credits, music prompts |
| `docs/questionnaires/` | Questions for teammates |
| `src/strings.ts` | All player-facing text. Never write it anywhere else; a test fails if you do. |
| `LEAP.bat`, `LEAP.sh`, `LEAP.command`, `scripts/leap.*` | Local launchers and setup messages (outside the game). Keep them working when changing dependencies or the dev server; use the current manifest and lockfile. |
| `.claude/skills/<name>/SKILL.md` | Workflow skills (see its README). Other agents can read them as plain instructions. |
