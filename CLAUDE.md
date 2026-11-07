# Space Mission Design Game — agent guide

A 2.5D space-company tycoon for the **NASA Space Apps 2026** challenge "Space Mission Design Game" (hackathon **Nov 14–15, 2026**). Players grow a small space company (economy, ~40%) and design, launch and simulate missions (mission design, ~60%) that teach real aerospace trade-offs.

## Current phase: 1 — Design

No game code yet. Build only after the team confirms the Space Apps rule on work done before Nov 14.

## Start of every session

1. Read `PROGRESS.md` (the latest handoff), then `git log --oneline -15`.
2. Read the docs the handoff points to. Use `GLOSSARY.md` terms for every game concept, and respect `docs/adr/`.

## End of every session, or when usage runs low

Run `/handoff` (writes `PROGRESS.md`, commits, pushes). Unpushed work is lost: containers are deleted.

## Where things live

| Path | What |
|---|---|
| `docs/challenge.md` | Official challenge brief. Its considerations are **suggestions, not requirements**. |
| `docs/GDD.md` | Game design document: what we've decided the game is. |
| `GLOSSARY.md` | Game vocabulary (created lazily by `domain-modeling`). |
| `docs/adr/` | Hard-to-reverse decisions and why (`0001`, `0002`, …). |
| `docs/research/` | Cited research notes, e.g. NASA data (`research` skill). |
| `docs/questionnaires/` | Questions for teammates (`to-questionnaire`). |
| `.claude/skills/` | Project skills; see its `README.md`. |

## Working style

- **Usage is limited** (Claude Pro, shared with claude.ai chat): one topic per session, look facts up inline, and spawn sub-agents only for broad searches.
- The team reviews but does not code: explain decisions in plain language, keep commits small with clear messages.
- Design sessions: `/grill-with-docs`, recording decisions in `docs/GDD.md`, terms in `GLOSSARY.md`, and hard-to-reverse choices in `docs/adr/`.
