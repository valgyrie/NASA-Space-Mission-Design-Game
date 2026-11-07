# Tickets

> **Status: approved by the team (2026-11-07).** Each ticket's "done when" list is in its own file. Tick a ticket here when all its criteria pass.

Each ticket is a thin, playable slice of the game that fits in one session. Do a ticket only once everything it's **blocked by** is done.

| # | Ticket | Blocked by | What works when it's done |
|---|---|---|---|
| 01 | [Project skeleton](01-project-skeleton.md) | – | The game opens in a browser: empty isometric world, camera pan/zoom/rotate. Type checks and tests run before every commit. |
| 02 | [Company and saving](02-company-and-saving.md) | 01 | Name your Company (bad-word filter). It's still there after reload. All text comes from one strings file. |
| 03 | [Site from a Seed](03-site-from-seed.md) | 01 | A Seed generates the same Site every time: terrain, water and mineral deposits (placeholder climate). |
| 04 | [Mines and time](04-mines-and-time.md) | 03 | Place Mines on deposits; Raw Materials pile up over time; pause and 1×/2×/4×. |
| 05 | [Factories and Market](05-factories-and-market.md) | 04 | Factories turn Raw Materials into Parts; Warehouse stores them; buy and sell on the Market. |
| 06 | [Contracts board](06-contracts-board.md) | 02 | See and accept the Explorer 1 Contract; money and deadline shown. |
| 07 | [Mission Designer v1](07-mission-designer-v1.md) | 05, 06 | Build a Spacecraft from slots (Bus, Power, Battery, Comms, pointing, Payload) with a rotating 3D model and the six live resource bars. |
| 08 | [First full Mission loop](08-first-full-mission-loop.md) | 07 | Pick Juno I (mass check), ship to Cape Canaveral, pay the Rideshare, Launch, get a Mission Report that explains why. **The whole game loop works end to end, roughly.** |
| 09 | [Test Run](09-test-run.md) | 08 | Free 2D Test Run with battery and Data graphs and an estimated success %. Simulation is deterministic and tested. |
| 10 | [3D Launch and flight](10-launch-and-flight-3d.md) | 08 | Watch liftoff, staging and orbit in 3D. |
| 11 | [Anomalies: framework + Point the antenna](11-anomaly-framework-antenna.md) | 10 | First Anomaly mini-game; first time required, then skippable; driven by design weaknesses; failure lowers the result. |
| 12 | [Anomalies: Stuck solar panel, Survive the eclipse](12-anomalies-panel-eclipse.md) | 11, 14 | Two more Anomaly mini-games. |
| 13 | [Tutorial and Real History](13-tutorial-and-history.md) | 09, 11 | Explorer 1 tutorial: first Launch in under 10 minutes; Real History cards before and after; first Mission Patch; History Archive. |
| 14 | [Era 1 complete](14-era-1-complete.md) | 13 | TIROS-1 Milestone; solar cells unlock; Thor-Able; Research Lab, Research Points, first tech tree items. |
| 15 | [Upgrades and Assembly Hall](15-upgrades-and-assembly-hall.md) | 05 | Building levels (output and Part quality); Assembly Hall level limits Bus size. |
| 16 | [Real places and weather](16-real-places-and-weather.md) | 03, 08 | Globe picker (Historic pin, US, anywhere, Random); real NASA POWER climate baked in; Site shaped by it; latitude boost; weather Scrubs; Launch Window advisor. |
| 17 | [Risk and failure](17-risk-and-failure.md) | 08 | Launch Insurance; retryable Milestones with real failure stories (Vanguard TV3); startup grant. |
| 18 | [Era 2](18-era-2.md) | 14, 15 | HQ Upgrade to Era 2; Telstar 1 and Syncom 3; GEO, main engine, Thor-Delta/Delta D; Ground Stations set Communications. |
| 19 | [Company logo](19-company-logo.md) | 02 | Logo maker; upload (128×128, ~200 KB); logo on rockets, flag and Mission Patches. |
| 20 | [Easy and Advanced modes](20-easy-and-advanced.md) | 07 | Two Part sets with different detail. |
| 21 | [Free Play](21-free-play.md) | 18 | New Company anywhere on Earth in the modern Era, generated Contracts; Campaign continues into Free Play. |
| 22 | [Online basics](22-online-basics.md) | 21 | Anonymous account (nickname generator, recovery code), cloud save, leaderboards. Needs a Supabase project (team sets it up). |
| 23 | [Weekly Challenge and Seeds](23-weekly-challenge-and-seeds.md) | 22 | Same budget and Parts list for all, scoring weights, badges; share Seeds. |
| 24 | [Demo Mode](24-demo-mode.md) | 18 | One ready save per finished Era on a fixed demo Site. |
| 25 | [Sound and music](25-sound-and-music.md) | 01 | Code-made sound effects; music files from the team with looping crossfades; credits recorded. |
| 26 | [Look and feel pass](26-look-and-feel.md) | 18 | Cozy low-poly models and a clean NASA-style UI across all screens; Learn more → links. |
| 27 | [NASA data in view + official Resources](27-nasa-data-and-resources.md) | 16 | Adapt to the official Resources (Nov 13); make data use visible in game and credits. |
| 28 | [Submission](28-submission.md) | 24, 26, 27 | Credits screen, README, hosted link, video, project page, repo public. Mostly team tasks. |
| 29 | [Era illustrations](29-era-illustrations.md) | 27 | Style guide and image prompts for one illustration per Era; team generates them; shown on Era transitions. Done after the NASA Resources arrive. |

**Not in this list (Optional in `CHECKLIST.md`):** Eras 3–5, Crew Module, Dodge the debris, Stop the tumble, GIBS photos, Horizons, DONKI, manual placement, live weather, visiting Sites, co-op, Sandbox, Mars, touch, translations, desktop app.
