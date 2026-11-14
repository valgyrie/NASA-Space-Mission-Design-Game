# Checklist

**Required** = needed for the hackathon submission. **Optional** = later, if time allows.
Tick an item only after it works in the game. Details for each item are in [`docs/GDD.md`](docs/GDD.md).

## Required

### Preparation
- [x] Challenge brief in the repo (`docs/challenge.md`)
- [x] Design session: GDD, glossary, decisions
- [ ] Save Space Apps support's message allowing our early start (the FAQ says teams may not start before the hackathon; support allowed it, 2026-11-13) and disclose the early start in the submission (ticket 28)
- [x] Music prompts (Lyria 3.5) and audio source list in `docs/audio/`
- [x] Research and cite: Milestone facts, Launch Vehicles, Part numbers, spaceports
- [ ] Close remaining _(verify)_ items in `docs/research/` (Juno I and Delta D/900 capacity, spaceport latitudes, Moon/Mars window sources)
- [x] Split the build into tickets (`docs/tickets/`)
- [x] Capture the official Resources tab (Nov 13) and adapt the data plan (`docs/challenge.md`, `docs/research/official-resources.md`, GDD §14; tickets 32–48)

### Foundations
- [x] Project setup (TypeScript, Vite, Three.js), type checks and tests on commit
- [x] Local launchers: dependency setup, progress, browser opening and reopening (`LEAP.bat`, `LEAP.command`, `LEAP.sh`)
- [x] Low-poly world with camera controls (pan, turn, tilt to the horizon, zoom; mouse and keyboard; H for the whole-Site view)
- [x] Land continues past the Site to the horizon; sky, haze and sun shadows
- [x] Pause menu (Esc) with the Seed and Copy
- [x] Save and load (local)
- [x] All game text in one file (translation-ready)

### Start and Site
- [x] Company name (filtered) and logo maker
- [x] Logo upload (128×128, ~200 KB cap, "no photos of people" warning)
- [x] Default Company logo: an original preset (not the Space Apps logo)
- [x] Globe picker: Historic start pin, US, anywhere; Random; Seeds
- [x] Real climate and land type per location (NASA POWER 2025, baked in)
- [x] Site map generated from Seed + real data
- [x] Real-time Site with pause and 1×/2×/4× speed

### Economy
- [x] Mines on deposits (Aluminium, Copper, Silicon first), detailed model with a turning wheel
- [x] Factories: Metal Works, Electronics Lab, Solar Fab, Battery Plant, detailed models that move while working
- [x] Warehouse: storage by mass, shown in the top bar
- [x] Research Lab (ticket 14)
- [x] Assembly Hall (ticket 15)
- [x] Ground Station, HQ (ticket 18)
- [x] Building Upgrades (levels): output, storage, research pace, Part Marks, biggest Bus (ticket 15)
- [x] Market (buy/sell Raw Materials and Parts at worse prices)
- [x] Shipping (money + days)
- [x] Watch the Shipping: Spacecraft assembled on a truck at a dock, the truck drives off, camera can follow; Mission tracker with the dates to come
- [x] Startup grant safety net (ticket 17)

### Missions
- [x] Contracts board
- [x] Mission Designer: 3D Spacecraft, slots, six live resource bars
- [x] Easy and Advanced Part sets
- [ ] Launch Vehicle catalogue with mass check (Juno I, Thor-Able, Thor-Delta, Delta D and the mass check done; more vehicles come with their Eras)
- [x] Rideshare priced per kg
- [x] Launch site choice, latitude and coast effects (ticket 16; ticket 17: a failed rocket falls into the Atlantic, which is why launch sites are on the coast)
- [x] Weather from real climate, Scrubs
- [ ] Launch Window advisor (weather done; Moon and Mars windows with their Eras)
- [x] Launch Insurance (ticket 17: priced from the Test Run's estimated success, pays back 80% of the cost)
- [x] Test Run (2D) with estimated success %
- [x] 3D Launch and flight
- [x] Space view: every Spacecraft in orbit, click one to follow it (ticket 31)
- [x] Anomalies: Point the antenna, Stuck solar panel, Survive the eclipse (tickets 11 and 12; one per flight)
- [x] Mission Report explaining why (first version: outcome, one reason per requirement, reward)
- [x] Mission Patches and patch gallery (tickets 13 and 19: drawn in code with the Company logo)

### Campaign
- [ ] Tutorial: Explorer 1, first Launch in under 10 minutes
- [x] Era 1: Explorer 1, TIROS-1 (ticket 14: TIROS-1, Vanguard 1 card unlocks Solar Cells, Thor-Able)
- [x] Era 2: Telstar 1, Syncom 3 (ticket 18: whole Launch for Telstar, geostationary orbit and Main Engine for Syncom)
- [x] HQ Upgrade moves to the next Era (ticket 18: the date jumps to 1962)
- [ ] Research Points and tech tree (Era 1's four Upgrades done, ticket 14; later Eras add theirs)
- [x] Real History cards (before and after), History Archive (Explorer 1's; later Milestones add theirs)
- [x] Failure stories, retryable Milestones (ticket 17: Vanguard TV3 card; a missed deadline puts the Milestone back on the board)

### Free Play and online
- [x] Free Play mode with generated Contracts
- [x] Anonymous accounts (nickname generator, recovery code)
- [x] Leaderboards
- [x] Weekly Challenge with fixed budget and scoring
- [x] Shareable Seeds (ticket 23)
- [x] Cloud saves for Free Play (ticket 22)

### Look and sound
- [x] Cozy low-poly art, clean NASA-style UI
- [x] Buildings big enough to see from the whole-Site view (3 × 3 tiles each; the Site stays 64 × 64)
- [x] Smooth Earth from space: rounded coasts and soft clouds, far and close up
- [x] Sound effects (ticket 25: generated in code)
- [x] Music (licensed or generated, credited; ticket 25)
- [x] Learn more → links on real things
- [x] Title screen → main menu with live 3D background; loading screens with sourced tips
- [x] Real NASA photos (credited) on Real History cards
- [x] Era illustrations: style guide + prompts, then team generates them (ticket 29, after the NASA Resources). All three in the game, made from game screenshots, watermarked

### Judges and submission
- [ ] Final ticket: check the local launchers once more (automated launcher checks, clean setup, progress, reopening and quitting on Windows, macOS and Linux)
- [x] Demo Mode: one save per finished Era (ticket 24: Eras 1 and 2, separate from the player Company)
- [x] NASA data used visibly in the game (see GDD §14)
- [x] Credits screen (data, audio, sources; team: Team Artemis-IV, confirmed 13 Nov)
- [ ] Ask organisers if the official Space Apps logo may appear, unaltered, on the splash and credits
- [x] README: how to play and run
- [ ] Hosted playable link (GitHub Pages workflow ready in `.github/workflows/pages.yml`; switch Pages on once the repo is public)
- [x] Licence (Apache 2.0) and how AI was used, in the README; AI tags in the music files
- [ ] Submission video
- [ ] Project page on spaceappschallenge.org (text ready to paste: `docs/submission.md`)
- [ ] Make the repo public before the deadline

### Official Resources (approved 2026-11-13, in build order)
- [x] Four Segments in the Launch planner and Mission Report (ticket 32)
- [x] Maturity strip and Design Review (ticket 33)
- [x] NASA's GMAT trajectories: Syncom 3's transfer and Reference paths in the Space view (ticket 34)
- [x] Orbit maths checked against GMAT (ticket 35)
- [x] Like the real one: the real Spacecraft at the end of the Mission Report (ticket 36)
- [x] Alouette 1 side story card (ticket 37)
- [x] Sourced tips from CubeSat 101 (ticket 38)
- [x] Tutorial under NASA's six steps (ticket 39)
- [x] Ground Tests before Shipping (ticket 40)
- [x] Team Mode on one screen (ticket 41)

## Optional (later)

- [x] Buy neighbouring Plots to grow the Site (ticket 30)
- [ ] Era 3: Apollo 11 support, Landsat 1
- [ ] Crew Module, Launch Escape System, ≥95% rule (crewed Milestones start in Era 3)
- [ ] Era 4: Hubble, Lunar Reconnaissance Orbiter, own rockets and Spaceport Site
- [ ] Era 5: Falcon 9 landing, Artemis I, Artemis II, Artemis IV finale
- [ ] Anomalies: Dodge the debris, Stop the tumble
- [ ] Satellite photos of your region after imaging Missions (NASA GIBS)
- [ ] Real Moon positions and windows (JPL Horizons)
- [ ] Space view shows the Moon, and Spacecraft orbiting the Moon or other worlds (with their Contracts, Era 3 on)
- [ ] Real solar storms as flight events (NASA DONKI)
- [ ] Manual Part placement in Advanced mode
- [ ] Live weather mode (today's real weather)
- [ ] Visit other Companies' Sites, preset messages, send resources
- [ ] Cooperative missions (up to 4 players)
- [x] Science-first Contracts: who needs the Data, then choose a question (ticket 42)
- [ ] Save for GMAT from the Space view (ticket 43)
- [ ] Rideshares leave on their date (ticket 44)
- [ ] Save, share and compare designs (ticket 45)
- [ ] End of mission: orbits decay, plans to leave orbit (ticket 46)
- [ ] A timeline you can drag in the Space view (ticket 47)
- [ ] CubeSat sizes for Free Play Buses (ticket 48)
- [ ] Sandbox mode
- [ ] Mars, asteroids, outer planets
- [ ] Era-flavoured music
- [ ] Touch and tablet support
- [ ] Translations (e.g. Arabic, right-to-left)
- [ ] Desktop app (Electron), PWA install
- [x] Choose a game name: **LEAP: A Space Mission Design Game**
