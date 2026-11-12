# 22: Online basics

**What to build:** Anonymous accounts (nickname generator with re-roll, recovery code), cloud saves and leaderboards, using the team's Supabase project.

**Blocked by:** 21

**Status:** built, waiting for a team test

- [x] Team has created the Supabase project (human step)
- [x] Nickname generator with 🎲 re-roll; own names filtered
- [x] Recovery code lets a player continue on another computer
- [x] No email, password or personal data collected
- [x] Cloud save works for Free Play
- [x] Leaderboards: Company value, Missions completed, Reputation, Research

**As built:** Online opens from the main menu and the Free Play pause menu, with the existing panels and all text in `src/strings.ts`. Space-themed nickname generation and 🎲 re-roll use the shared Company name filter; the backend repeats the filter. The team's healthy `NASA-Space-Mission-Design-Game` project is connected and the migration and function are deployed.

Accounts use generated secret recovery codes, with only their hashes in the database (ADR-0004). Copy the code and enter it in another browser to recover the account. No email, password, real name or Supabase Auth identity is requested. Anyone holding the code controls the account; there is no code reset.

Save to cloud explicitly stores one Free Play Company per account; Load cloud Company confirms before replacing the local Company. No background sync. The existing save validator and version 18 format are reused, Campaign upload is disabled, and Demo Mode keeps its separate local slot and has no Online action. Offline failures keep local data. Revision checks reject simultaneous writes. Loading from the running Site also updates the object used by its pagehide autosave before reloading.

Four top-20 leaderboards expose only nicknames and scores. The function derives scores from the saved Company; definitions are in GDD §12. These are casual, player-save leaderboards, without an authoritative simulation or anti-cheat. RLS and revoked client grants block direct database reads/writes; private requests authenticate with the recovery code. No service key is shipped to the browser.

**Files:** `src/online/model.ts` holds shared nickname/code/save/score rules; `client.ts` handles the endpoint and browser account slot; `src/ui/online.ts` supplies the dialog. The menus and `playSite.ts` provide entry points and pause/load hooks. `supabase/` holds the migration, function, type check, bundle configuration and deployment notes. No dependencies or test framework added; normal type checks now include the backend.

**Tested:** all 332 tests and the production build pass, including six focused tests for nickname generation, code formatting, score definitions, the existing save validator, second-browser recovery and failure preservation. Both client and backend type checks and the backend bundle pass. Chromium at 1280×800 and 1024×768 checks creation, own-name filtering, re-roll, all four leaderboards, manual upload, recovery in separate browser storage, exact save-data download and continued Advanced Free Play. Production-build checks without development hooks cover copying the code, cancellation before replacement, save/load, offline preservation, Campaign upload rejection, Demo Mode isolation and cloud loading from an active Site through its pagehide autosave. The Site clock pauses in Online. An initial scroll issue and active-tab contrast were fixed. No application page errors in completed checks.

Live API checks cover backend name filtering, wrong codes, cross-account save isolation, malformed/Campaign saves, derived scores, all four ordered boards, simultaneous writes (one succeeds, one conflicts), direct table read/write denial and the 1 MiB request cap. QA accounts were removed afterwards. Team playtesting, touch and real-laptop performance remain unchecked. Launcher checks stay deferred to the final ticket.
