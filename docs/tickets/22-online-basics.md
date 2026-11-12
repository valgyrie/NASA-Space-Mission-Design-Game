# 22: Online basics

**What to build:** Anonymous accounts (nickname generator with re-roll, recovery code), cloud saves and leaderboards, using the team's Supabase project.

**Blocked by:** 21

**Status:** blocked: the team's Supabase project is not configured

- [ ] Team has created the Supabase project (human step)
- [ ] Nickname generator with 🎲 re-roll; own names filtered
- [ ] Recovery code lets a player continue on another computer
- [ ] No email, password or personal data collected
- [ ] Cloud save works for Free Play
- [ ] Leaderboards: Company value, Missions completed, Reputation, Research

**Checked (2026-11-12):** not implemented on freshly pulled `main` (`9d3c02a`, including tickets 21 and 24). No Supabase project configuration is supplied in the checkout or environment, and Supabase is not connected. The team must supply its project and access before the online flows can be completed and verified. All 326 existing tests, type checking and the production build pass; these checks cover the existing game, not ticket 22. No game code, dependencies or tests changed.
