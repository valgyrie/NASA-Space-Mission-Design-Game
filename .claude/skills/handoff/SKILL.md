---
name: handoff
description: Compact the current conversation into a handoff in PROGRESS.md, then commit and push, so a fresh session can continue the work.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff summarising the current conversation so a fresh agent can continue the work. Sessions run in throwaway cloud containers, so the handoff lives **in the repo**, never in a temp directory.

1. **Write the handoff** as the `## Current handoff` section at the top of `PROGRESS.md` (repo root), replacing the previous one. Cover: the goal, current state, what was just finished, what's next (the very next step first), open questions, and approaches that failed and why. Done when a fresh agent could start the next step from this section plus the files it points to.
2. **Log the previous handoff** as one dated line under `## Log` (newest first). Trim the log to its 15 newest lines.
3. **Suggest skills**: end the handoff with a "Suggested skills" line naming the skills the next session should call.
4. **Point, don't copy.** Content already captured elsewhere (`GLOSSARY.md`, `docs/adr/`, `docs/GDD.md`, `docs/research/`, tickets, commits) is referenced by path, not duplicated.
5. **Redact** API keys, passwords, tokens, and personal information.
6. **Commit and push** `PROGRESS.md` with every other changed file from the session, to the current branch. Done when `git status` is clean and the push succeeded; report the branch name so the user can continue from it.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the handoff accordingly.
