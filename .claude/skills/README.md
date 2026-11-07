# Project skills

Skills in this folder load automatically in every Claude Code session on this repo.

Most are copied from **[mattpocock/skills](https://github.com/mattpocock/skills)** (MIT License, © 2026 Matt Pocock, see `LICENSE-mattpocock-skills`), taken from `main` on 2026-11-07.

| Skill | Invoked by | Phase | Changes from upstream |
|---|---|---|---|
| `grill-me` | you (`/grill-me`) | Design | none |
| `grill-with-docs` | you (`/grill-with-docs`) | Design | none |
| `grilling` | agent or you | Design | none |
| `domain-modeling` | agent or you | Design | none |
| `research` | agent or you | Design / any | none |
| `to-questionnaire` | you (`/to-questionnaire`) | Design / any | writes to `docs/questionnaires/` instead of the current directory |
| `handoff` | you (`/handoff`) | Any | **rewritten**: writes to `PROGRESS.md` in the repo and commits + pushes, instead of `/tmp` (cloud containers are deleted) |
| `writing-for-agents` | agent or you | Any | none |

Not installed yet (build phase): `to-tickets`, `prototype`, `tdd`, `codebase-design`, `diagnosing-bugs`, `setup-pre-commit`, and maybe `wizard`.
Left out on purpose: `code-review` (expensive parallel sub-agents), and skills not relevant to this project.

User-invoked skills (`disable-model-invocation: true`) cost no context until you type them; agent-invoked ones keep a one-line description loaded in every session.
