# Tickets

> **Status: approved by the team (2026-11-07; tickets 32–48 on 2026-11-13).** Each ticket's "done when" list is in its own file. Tick a ticket here when all its criteria pass. 🧪 = built, waiting for a team test.

Each ticket is a thin, playable slice of the game that fits in one session. Do a ticket only once everything it's **blocked by** is done.

| # | Ticket | Blocked by | What works when it's done |
|---|---|---|---|
| 01 ✅ | [Project skeleton](01-project-skeleton.md) | – | The game opens in a browser: empty world, camera pan/zoom/rotate (later: tilt to the horizon, ADR-0003). Type checks and tests run before every commit. |
| 02 ✅ | [Company and saving](02-company-and-saving.md) | 01 | Name your Company (bad-word filter). It's still there after reload. All text comes from one strings file. |
| 03 ✅ | [Site from a Seed](03-site-from-seed.md) | 01 | A Seed generates the same Site every time: terrain, water and mineral deposits (placeholder climate). |
| 04 ✅ | [Mines and time](04-mines-and-time.md) | 03 | Place Mines on deposits; Raw Materials pile up over time; pause and 1×/2×/4×. |
| 05 ✅ | [Factories and Market](05-factories-and-market.md) | 04 | Factories turn Raw Materials into Parts; Warehouse stores them; buy and sell on the Market. |
| 06 ✅ | [Contracts board](06-contracts-board.md) | 02 | See and accept the Explorer 1 Contract; money and deadline shown. |
| 07 ✅ | [Mission Designer v1](07-mission-designer-v1.md) | 05, 06 | Build a Spacecraft from slots (Bus, Power, Battery, Comms, pointing, Payload) with a rotating 3D model and the six live resource bars. |
| 08 ✅ | [First full Mission loop](08-first-full-mission-loop.md) | 07 | Pick Juno I (mass check), ship to Cape Canaveral, pay the Rideshare, Launch, get a Mission Report that explains why. Watch the truck carry the Spacecraft off the Site; a Mission tracker shows the dates to come. **The whole game loop works end to end, roughly.** |
| 09 ✅ | [Test Run](09-test-run.md) | 08 | Free 2D Test Run with battery and Data graphs and an estimated success %. Simulation is deterministic and tested. |
| 10 ✅ | [3D Launch and flight](10-launch-and-flight-3d.md) | 08 | Watch liftoff, staging and orbit in 3D. |
| 11 ✅ | [Anomalies: framework + Point the antenna](11-anomaly-framework-antenna.md) | 10 | First Anomaly mini-game; first time required, then skippable; driven by design weaknesses; failure lowers the result. |
| 12 🧪 | [Anomalies: Stuck solar panel, Survive the eclipse](12-anomalies-panel-eclipse.md) | 11, 14 | Two more Anomaly mini-games. |
| 13 🧪 | [Tutorial and Real History](13-tutorial-and-history.md) | 09, 11 | Explorer 1 tutorial: first Launch in under 10 minutes; Real History cards before and after; first Mission Patch; History Archive. |
| 14 ✅ | [Era 1 complete](14-era-1-complete.md) | 13 | TIROS-1 Milestone; solar cells unlock; Thor-Able; Research Lab, Research Points, first tech tree items. |
| 15 ✅ | [Upgrades and Assembly Hall](15-upgrades-and-assembly-hall.md) | 05 | Building levels (output and Part quality); Assembly Hall level limits Bus size. |
| 16 🧪 | [Real places and weather](16-real-places-and-weather.md) | 03, 08 | Globe picker (Historic pin, US, anywhere, Random); real NASA POWER climate baked in; Site shaped by it; latitude boost; weather Scrubs; Launch Window advisor. |
| 17 🧪 | [Risk and failure](17-risk-and-failure.md) | 08 | Launch Insurance; retryable Milestones with real failure stories (Vanguard TV3); startup grant. |
| 18 🧪 | [Era 2](18-era-2.md) | 14, 15 | HQ Upgrade to Era 2; Telstar 1 and Syncom 3; GEO, main engine, Thor-Delta/Delta D; Ground Stations set Communications. |
| 19 🧪 | [Company logo](19-company-logo.md) | 02 | Logo maker; upload (128×128, ~200 KB); logo on rockets, flag and Mission Patches. |
| 20 🧪 | [Easy and Advanced modes](20-easy-and-advanced.md) | 07 | Two Part sets with different detail. |
| 21 🧪 | [Free Play](21-free-play.md) | 18 | New Company anywhere on Earth in the modern Era, generated Contracts; Campaign continues into Free Play. |
| 22 🧪 | [Online basics](22-online-basics.md) | 21 | Anonymous account (nickname generator, recovery code), manual Free Play cloud save and four leaderboards on the team's Supabase project. |
| 23 🧪 | [Weekly Challenge and Seeds](23-weekly-challenge-and-seeds.md) | 22 | Same budget and Parts list for all, scoring weights, badges; share Seeds. |
| 24 ✅ | [Demo Mode](24-demo-mode.md) | 18 | One ready save per finished Era on a fixed demo Site. |
| 25 🧪 | [Sound and music](25-sound-and-music.md) | 01 | Code-made sound effects; music files from the team with looping crossfades; credits recorded. |
| 26 🧪 | [Look and feel pass](26-look-and-feel.md) | 18 | Cozy low-poly models (replaced by ticket 49's realistic look) and a clean NASA-style UI across all screens; Learn more → links. |
| 27 | [NASA data in view + official Resources](27-nasa-data-and-resources.md) | 16 | Official Resources captured and mapped (docs, Nov 13); each Resource used gets a Real data and Credits entry when its ticket ships. |
| 28 | [Submission](28-submission.md) | 24, 26, 27 | Credits screen, README, hosted link, video, project page, repo public. Mostly team tasks. |
| 29 🧪 | [Era illustrations](29-era-illustrations.md) | 27 | Style guide and image prompts for one illustration per Era; team generates them; shown on Era transitions. Done after the NASA Resources arrive. |
| 30 ✅ | [Buy the land next door](30-buy-neighbouring-plots.md) _(Optional)_ | 05 | Look at the Plots around your Site, see their Deposits, and buy them to grow the Site. |
| 31 ✅ | [Space view](31-space-view.md) _(added 2026-11-09)_ | 10 | See every Spacecraft in orbit round Earth; click one to follow it along its real orbit. |
| 32 🧪 | [Four segments on screen](32-four-segments.md) | 18, 27 | Launch planner and Mission Report grouped under NASA's Launch, Space, Ground and User Segments. |
| 33 🧪 | [Maturity strip and Design Review](33-maturity-strip-and-design-review.md) | 32 | JPL's four Concept Maturity Levels on the Mission Designer; a red/yellow/green Design Review (35% margins, 80% green) replaces the planner's warnings. |
| 34 🧪 | [NASA's GMAT trajectories](34-gmat-trajectories.md) | 27, 31 | Syncom 3's real LEO → GEO transfer and Reference paths (long ellipse, Earth → Moon) from NASA Mission Viz. |
| 35 ✅ | [Orbit maths checked against GMAT](35-orbit-maths-checked-against-gmat.md) | 34 | A repo test compares LEAP's Kepler code with a GMAT run; one line in Real data. |
| 36 ✅ | [Like the real one](36-like-the-real-one.md) | 18, 21 | The Mission Report ends with the player's Spacecraft beside the real one. |
| 37 ✅ | [Alouette 1 card](37-alouette-1-card.md) | 18 | "Also in 1962" side story after Telstar 1, from CSA. |
| 38 ✅ | [Sourced tips](38-sourced-tips.md) | 12, 26 | About eight loading tips and report lines from CubeSat 101, each with its page. |
| 39 🧪 | [NASA's six steps](39-nasas-six-steps.md) | 13 | The tutorial's eight steps under NASA's six step names. |
| 40 🧪 | [Ground Tests](40-ground-tests.md) | 12, 33 | Vibration, thermal vacuum and Day in the Life tests: days and money against Anomaly risk. |
| 41 🧪 | [Team Mode on one screen](41-team-mode.md) | 33 | Two to four players, roles own slots, everyone signs the Design Review before Shipping. |
| 42 🧪 | [Science-first Contracts](42-science-first-contracts.md) _(Optional)_ | 21 | Light: every Free Play Contract says who needs the Data. Full: choose a question first. |
| 43 | [Open in GMAT](43-open-in-gmat.md) _(Later)_ | 31, 34 | Save a Spacecraft's orbit as a GMAT script; needs a person to test it in GMAT. |
| 44 | [Rideshares leave on their date](44-rideshares-leave-on-their-date.md) _(Later)_ | 16, 21 | Fixed departure days; miss one and wait. Needs play-testing. |
| 45 | [Save, share and compare designs](45-save-share-compare-designs.md) _(Later)_ | 07, 23 | Two designs side by side; a design as a short code. |
| 46 | [End of mission](46-end-of-mission.md) _(Later)_ | 31 | Low orbits decay; Free Play Contracts ask for a plan to leave orbit. Research first. |
| 47 | [A timeline you can drag](47-timeline-you-can-drag.md) _(Later)_ | 31 | Drag through a Mission's events in the Space view. |
| 48 | [CubeSat sizes](48-cubesat-sizes.md) _(Later)_ | 20, 21 | Free Play Buses become 1U, 3U and 6U; needs a rebalance. |
| 49 🧪 | [Realistic graphics](49-realistic-graphics.md) _(added 2026-11-14)_ | 26 | Smooth photo-textured land, real sky and water, Blender-built buildings and launch pads, trees by climate, a photo Earth; every asset credited. The team accepts it before the final merge. |

**Recommended build order (2026-11-13):** 27 → 32 → 33 → 34 → 35 → 36 → 37 → 38 → 39 → the rule items in 28 and 29 → 40 → 41 → the rest (42–48). Stop adding features on Saturday night (14 Nov). Sunday is for hosting, the demo, the project page and the final launcher checks (ticket 28).

**Changed since (2026-11-10, asked for by the team):** every building takes 3 × 3 tiles so it shows from the whole-Site view (GDD §4; tickets 04, 05 and 15 were built with one tile each), and the Earth seen from space is a smooth globe (ticket 26's Earth box, done early).

**Not in this list (Optional in `CHECKLIST.md`):** Eras 3–5, Crew Module, Dodge the debris, Stop the tumble, GIBS photos, Horizons, DONKI, manual placement, live weather, visiting Sites, co-op, Sandbox, Mars, touch, translations, desktop app.
