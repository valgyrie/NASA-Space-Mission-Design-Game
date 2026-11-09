# Checklist

**Required** = needed for the hackathon submission. **Optional** = later, if time allows.
Tick an item only after it works in the game. Details for each item are in [`docs/GDD.md`](docs/GDD.md).

## Required

### Preparation
- [x] Challenge brief in the repo (`docs/challenge.md`)
- [x] Design session: GDD, glossary, decisions
- [ ] Get the organisers' "you may start early" message in writing and save it
- [x] Music prompts (Lyria 3.5) and audio source list in `docs/audio/`
- [x] Research and cite: Milestone facts, Launch Vehicles, Part numbers, spaceports
- [ ] Close remaining _(verify)_ items in `docs/research/` (Juno I and Delta D/900 capacity, spaceport latitudes, Moon/Mars window sources)
- [x] Split the build into tickets (`docs/tickets/`)
- [ ] Capture the official Resources tab (Nov 13) and adapt the data plan

### Foundations
- [x] Project setup (TypeScript, Vite, Three.js), type checks and tests on commit
- [x] Local launchers: dependency setup, progress, browser opening and reopening (`LEAP.bat`, `LEAP.command`, `LEAP.sh`)
- [x] Low-poly world with camera controls (pan, turn, tilt to the horizon, zoom; mouse and keyboard; H for the whole-Site view)
- [x] Land continues past the Site to the horizon; sky, haze and sun shadows
- [x] Pause menu (Esc) with the Seed and Copy
- [x] Save and load (local)
- [x] All game text in one file (translation-ready)

### Start and Site
- [ ] Company name (filtered) and logo maker
- [ ] Logo upload (128×128, ~200 KB cap, "no photos of people" warning)
- [ ] Default Company logo: an original preset (not the Space Apps logo)
- [ ] Globe picker: Historic start pin, US, anywhere; Random; Seeds
- [ ] Real climate and land type per location (NASA POWER 2025, baked in)
- [ ] Site map generated from Seed + real data
- [x] Real-time Site with pause and 1×/2×/4× speed

### Economy
- [x] Mines on deposits (Aluminium, Copper, Silicon first), detailed model with a turning wheel
- [x] Factories: Metal Works, Electronics Lab, Solar Fab, Battery Plant, detailed models that move while working
- [x] Warehouse: storage by mass, shown in the top bar
- [ ] Assembly Hall, Research Lab, Ground Station, HQ
- [ ] Building Upgrades (levels)
- [x] Market (buy/sell Raw Materials and Parts at worse prices)
- [x] Shipping (money + days)
- [x] Watch the Shipping: Spacecraft assembled on a truck at a dock, the truck drives off, camera can follow; Mission tracker with the dates to come
- [ ] Startup grant safety net

### Missions
- [x] Contracts board
- [x] Mission Designer: 3D Spacecraft, slots, six live resource bars
- [ ] Easy and Advanced Part sets
- [ ] Launch Vehicle catalogue with mass check (Juno I and the mass check done; more vehicles come with their Eras)
- [x] Rideshare priced per kg
- [ ] Launch site choice, latitude and coast effects
- [ ] Weather from real climate, Scrubs
- [ ] Launch Window advisor
- [ ] Launch Insurance
- [x] Test Run (2D) with estimated success %
- [x] 3D Launch and flight
- [x] Space view: every Spacecraft in orbit, click one to follow it (ticket 31)
- [ ] Anomalies: Point the antenna, Stuck solar panel, Survive the eclipse (Point the antenna and the framework done, ticket 11)
- [x] Mission Report explaining why (first version: outcome, one reason per requirement, reward)
- [ ] Mission Patches and patch gallery

### Campaign
- [ ] Tutorial: Explorer 1, first Launch in under 10 minutes
- [ ] Era 1: Explorer 1, TIROS-1
- [ ] Era 2: Telstar 1, Syncom 3
- [ ] HQ Upgrade moves to the next Era
- [ ] Research Points and tech tree
- [ ] Real History cards (before and after), History Archive
- [ ] Failure stories, retryable Milestones

### Free Play and online
- [ ] Free Play mode with generated Contracts
- [ ] Anonymous accounts (nickname generator, recovery code)
- [ ] Leaderboards
- [ ] Weekly Challenge with fixed budget and scoring
- [ ] Shareable Seeds, cloud saves

### Look and sound
- [ ] Cozy low-poly art, clean NASA-style UI
- [ ] Sound effects
- [ ] Music (licensed or generated, credited)
- [ ] Learn more → links on real things
- [ ] Title screen → main menu with live 3D background; loading screens with sourced tips
- [ ] Real NASA photos (credited) on Real History cards
- [ ] Era illustrations: style guide + prompts, then team generates them (ticket 29, after the NASA Resources)

### Judges and submission
- [ ] Final ticket: check the local launchers once more (automated launcher checks, clean setup, progress, reopening and quitting on Windows, macOS and Linux)
- [ ] Demo Mode: one save per finished Era
- [ ] NASA data used visibly in the game (see GDD §14)
- [ ] Credits screen (data, audio, sources)
- [ ] Ask organisers if the official Space Apps logo may appear, unaltered, on the splash and credits
- [ ] README: how to play and run
- [ ] Hosted playable link
- [ ] Submission video
- [ ] Project page on spaceappschallenge.org
- [ ] Make the repo public before the deadline

## Optional (later)

- [ ] Buy neighbouring Plots to grow the Site (ticket 30)
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
- [ ] Sandbox mode
- [ ] Mars, asteroids, outer planets
- [ ] Era-flavoured music
- [ ] Touch and tablet support
- [ ] Translations (e.g. Arabic, right-to-left)
- [ ] Desktop app (Electron), PWA install
- [x] Choose a game name: **LEAP: A Space Mission Design Game**
