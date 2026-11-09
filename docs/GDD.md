# Game Design Document

> **LEAP: A Space Mission Design Game**. The letters stand for **Launch · Engineer · Advance · Pioneer** (see §13 for where this appears).
> Terms in **bold capitals** are defined in [`GLOSSARY.md`](../GLOSSARY.md). Decisions with lasting impact are in [`docs/adr/`](adr/).
> Facts and numbers are sourced in [`docs/research/`](research/). Anything still marked _(verify)_ there needs a source before it appears in the game.

## 1. The game in one paragraph

You run a small space **Company**. You build **Mines** and **Factories** on your **Site** to make **Parts**, take **Contracts**, then design a **Spacecraft**, pick a **Launch Vehicle**, check the weather and **Launch Window**, run a **Test Run**, and **Launch**. During flight you fix **Anomalies** in short mini-games. A **Mission Report** explains why it worked or failed. In the **Campaign** you relive real space history from 1958 to Artemis IV. Then **Free Play** opens with generated Contracts, leaderboards and **Weekly Challenges**.

## 2. Goals and audience

- **Audience:** everyone from about age 10: students, families and adults who love space. Easy to start, with depth for those who want it.
- **Teach the challenge's trade-offs:** every design choice changes **Mass, Power, Budget, Data, Communications** and **Time**, and the game shows how.
- **Split:** about **60% mission design** (Site choice, weather and Launch Windows, Ground Stations, Spacecraft design, Launch Vehicle, Test Runs, flying) and **40% tycoon** (Mines, Factories, Upgrades, money).
- **Judges play for minutes:** the first Launch happens within **10 minutes**, and **Demo Mode** jumps straight to any Era.
- **Platform:** browser on Windows, macOS, Linux and Chromebook, with mouse and keyboard. Touch is Later.

## 3. Modes

| Mode | What it is | Hackathon? |
|---|---|---|
| **Campaign** | 1958 → Artemis IV through real **Milestones**. Continues into Free Play with the same Company. | ✅ Eras built in order |
| **Free Play** | Modern Era, start anywhere on Earth, generated Contracts. Online features live here. | ✅ |
| **Weekly Challenge** | Free Play only. Same budget and Parts list for everyone, your own Seed. | ✅ |
| **Demo Mode** | One fixed demo Site, one ready save per Era. | ✅ |
| **Sandbox** | No limits, everything unlocked. | Later |

## 4. Starting the game

- **Name your Company** and make a **logo** (see §11).
- **Choose a start:**
  - Campaign: **Historic start** (red pin at JPL, Pasadena, where Explorer 1 was built), **Anywhere in the US**, or **Anywhere on Earth** (labelled alternate history).
  - Free Play: anywhere on Earth.
  - Pick a spot on a 3D globe, or press **Random**. Each start has a **Seed** that can be shared.
- **The location is real:** climate (sunshine, wind, rain, temperature) comes from NASA POWER data for 2025, baked into the game. Land type (coast, desert, mountains, forest, ice) also comes from real data.
- **The Site map is generated** from the Seed and that real data: terrain, water, and mineral deposits.
  - A Site is 64 × 64 tiles of terraced land: grass, sand, hills, mountains.
  - Water is one of: a coast, a lake, a river, or none.
  - Every Site gets at least two Deposits each of Aluminium, Copper and Silicon, on the land where they're found (§5). If that land is missing, they go on any dry land, so no start is unplayable.
  - A random Seed is 6 letters and digits with no vowels (so it can't spell a word), e.g. `K7QXM2`. Players can type their own (up to 12, bad words blocked). Case, spaces and dashes don't matter.
  - The Seed is chosen in New game and afterwards shown in the pause menu (Esc), with Copy. It is not on screen during play.
- **Growing the Site (Optional, ticket 30):** the land around is split into **Plots** the size of the Site. Look at a neighbouring Plot, see its Deposits and water, and buy it to add it to the Site. Price rises with what it holds and with each Plot bought. Contracts can also give a Plot as a reward.
- **The world goes on past the Site.** The same Seed shapes the land around it out to the horizon, so coasts and rivers carry on past the edge. Only the Site can be built on (for now); a thin line marks its edge, and the land outside is slightly hazy.
- **Good and bad starts are both playable.** An inland or northern Site is bad for launching but may be rich in minerals. A coastal Site near the equator is great for launching. Weather and latitude really matter (see §8).

## 5. Economy (≈40%)

**Rule:** chains are at most two steps (**Mine → Factory → Part**). Anything can also be bought on the **Market** at a worse price, so the economy saves money and time but never blocks a Mission.

### Raw Materials

| Raw Material | Found in | Used for | Unlocks |
|---|---|---|---|
| Aluminium | Most land | Bus structure | Era 1 |
| Copper | Hills, mountains | Wiring, radios, batteries | Era 1 |
| Silicon | Deserts, sand, coasts | Solar cells, computers | Era 1 |
| Titanium | Mountains | Strong structures, fuel tanks | Era 2 |
| Water | Rivers, lakes, coasts | Propellant (split into hydrogen and oxygen) | Era 3 |
| Lithium | Dry salt flats | Better batteries | Era 4 |

### Buildings

| Building | Does | Notes |
|---|---|---|
| **HQ** | Moves the Company into the next Era | Upgrade unlocks after the Era's Milestones are done |
| **Mine** | Extracts one Raw Material | Must sit on a deposit. Upgrades raise output. |
| **Metal Works** (Factory) | Aluminium/Titanium → Bus, tanks, structure | |
| **Electronics Lab** (Factory) | Silicon + Copper → computers, radios, sensors | |
| **Solar Fab** (Factory) | Silicon → solar panels | |
| **Battery Plant** (Factory) | Copper (later Lithium) → batteries | |
| **Propellant Plant** (Factory) | Water → propellant | Era 3 |
| **Research Lab** | Turns science Data into **Research Points** | |
| **Assembly Hall** | Builds the Spacecraft; its level sets the biggest Bus | |
| **Warehouse** | Stores Raw Materials and Parts | Storage counts by mass (kg) |
| **Ground Station** | Antenna that talks to Spacecraft; sets Communications | Bigger dish = more Data |
| **Launch Pad** | Launch your own rockets | Spaceport Site, Era 4 |

- **Upgrades** work like town halls in base-builders: each building has levels that raise output or quality (lighter, more efficient Parts). Upgrades cost money and take days (**Time**).
- **Income:** Contract rewards (main), selling Raw Materials and Parts (small), science Missions (Research Points and Reputation).
- **Costs:** buildings and Upgrades, Plots of land (Optional), **Rideshare** (priced per kg, which teaches mass), **Shipping**, **Launch Insurance**.
- **Safety net:** starting money covers the tutorial. A one-time startup grant appears if money gets dangerously low.
- **Time:** the Site runs in real time with pause and 1×/2×/4× speed. Opening the Mission Designer pauses it. The **Game date** starts on 1 January 1958; one game day takes 2 real seconds at 1×. Space pauses and resumes.
- **Mines** take one tile and can go on any Deposit, mountains included (Copper is often up there).
- **First tuning** (all in `src/game/balance.ts`, change freely): start with **$2M**; a Mine costs **$150K** and digs **10 kg a day**. Money is US dollars, Raw Materials are kilograms.
- **Factories:** each makes one Part at a time, chosen by clicking it; it takes the Raw Materials when it starts a Part and adds the Part when done. Era 1 Parts: Small and Medium Bus (Metal Works), Basic Computer, Simple Antenna and Radiation Detector (Electronics Lab), Solar Cells (Solar Fab), Small and Large Battery (Battery Plant). Recipes are game estimates, not real figures.
- **Factories and the Warehouse go on dry land without a Deposit,** so Deposits stay free for Mines.
- **Storage** counts Raw Materials and Parts by mass: the Site holds **500 kg** in its yard, and each Warehouse adds **2,000 kg**. Mines stop when it is full. A Part always weighs less than its inputs, so Factories never overfill it.
- **Market:** every Raw Material and Part has a making cost (Raw Materials' value plus the Factory's work). The Market sells at **2×** that and buys at **½**. Raw Materials trade in 10 kg lots, Parts one at a time, and arrive at once (Shipping between Sites comes later).

## 6. Contracts, Milestones and progression

- A **Contract** has a client, objective, requirements, reward (money, Reputation, land, Parts) and deadline. Example: _"Photograph 80% of Earth's land at ≤10 m detail for 2 years: $40M."_
- **Contracts board** (button in the Site view): shows Contracts on offer and the active ones. Accepting a Contract makes it active and starts its deadline that Game day; the days left show on the board and under the Company name. The board button glows while there is work on offer and none taken.
- **Explorer 1 Contract** (first tuning in `src/game/balance.ts`): client US Army; reach Low Earth Orbit, carry a radiation detector, send Data for 30 days; reward **$3M**; deadline **365 days** after accepting (about 12 minutes at 1×). What happens when a deadline passes comes with ticket 17.
- **Campaign:** each Era has **Milestones** (required) and optional side Contracts. Finishing an Era's Milestones unlocks the **HQ** Upgrade. Pay and wait, then the next Era begins and the year jumps.
- **Research Points** choose the order of Upgrades inside an Era (e.g. better solar cells or a stronger antenna first). Small tech tree, about 15 items in total.
- **Destinations (hackathon):** Low Earth Orbit → Sun-synchronous orbit → Geostationary orbit → Moon (orbit, then surface). Mars and beyond are Later.
- **Own rockets:** rent (Rideshare) at first. Own **Launch Vehicles** and a **Spaceport Site** arrive in Era 4 (1990s, when private rockets really appeared), about **1–3 hours** into the Campaign. Free Play can reach them sooner.
- **Endless:** after Artemis IV, the Campaign continues as Free Play.

### Campaign Eras and Milestones

Verified dates, rockets and sources: [`docs/research/milestones.md`](research/milestones.md).

| Era | Milestone | Real event | Player's role |
|---|---|---|---|
| 1 · 1958–1960 | Explorer 1 | First US satellite, 1958; its radiation detector found the Van Allen belts | Build it (tutorial) |
| | TIROS-1 | First weather satellite, 1960 | Build it |
| 2 · 1962–1964 | Telstar 1 | First live TV across the Atlantic, 1962 | Build it; pay for the launch, as AT&T did |
| | Syncom 3 | First geostationary satellite, 1964 | Build it |
| 3 · 1969–1972 | Apollo 11 | First Moon landing, 1969 | Support: build the experiments the crew set up on the Moon |
| | Landsat 1 | First land-observing satellite, 1972 | Build it |
| 4 · 1990–2009 | Hubble | Space telescope, 1990 | Build it |
| | Lunar Reconnaissance Orbiter | Maps the Moon, 2009 | Build it |
| 5 · 2015–2028 | Falcon 9 booster landing | First orbital-class booster landing, 2015 | Reusable rockets unlock |
| | Artemis I | Uncrewed Moon test flight, 2022 | Support |
| | Artemis II | Crew flies around the Moon, April 2026 | Support |
| | **Artemis IV** (finale) | Planned first crewed landing since 1972, by 2028 | Support: relay satellite and cargo lander to the landing site |

- Every Milestone shows a **Real History card** before (the real story) and after (what happened next), with **Learn more →**. Free Play shows optional "Did you know?" cards linked to Contract types. All unlocked cards are kept in the **History Archive**.
- **Failure is part of history:** failed Milestones are always retryable, and come with a short real failure story (e.g. Vanguard TV3 exploding on the pad in December 1957).
- Artemis IV is in the future. If NASA changes the plan, update the Era data file.

## 7. Spacecraft design (core of the 60%)

- **Mission Designer:** a 3D Spacecraft you can rotate, plus **slots**. Pick a **Bus** (small / medium / large), then one option per system, then the **Payload**.
- The six resources show as **live bars** with clear warnings ("Power: 12 W short in eclipse").
- **Mission Designer v1 (ticket 07):** full screen; opening it pauses the Site. Slots: Bus, Power, Battery, Comms, Pointing, Payload (Computer and Propulsion join when a Milestone needs them). It designs for the first accepted Contract, or the first one on offer. Each slot says whether its Part is in the Warehouse, with a Buy button if not, plus one "Buy missing Parts" button. Parts are used up only when the Mission ships. The design is saved. Once every slot is filled, **Plan the Launch →** opens the Launch planner.
- **The six bars** (each with a target line; green when met, orange when short, grey until its slots are filled):

| Bar | Measures | Target |
|---|---|---|
| Mass | Spacecraft mass | The Launch Vehicle's lift (Juno I, ~14 kg). Parts must also fit what the Bus carries. |
| Power | Battery energy plus sunlight over the Mission (Wh) | Energy the Parts use over the Mission |
| Budget | Market price of Parts not in the Warehouse | Money |
| Data | Days the right Payload keeps sending | The Contract's days |
| Communications | Data the antenna sends per day | Data the Payload makes per day |
| Time | Days to assemble (set by the Bus), ship to the Launch Site and fly | Days left before the deadline |

- **Era 1 numbers** (game estimates in `src/game/balance.ts`): the tutorial design (Small Bus, batteries only, Large Battery, Simple Antenna, spin, radiation detector) weighs 11.5 kg and lasts about 33 days. A Small Battery runs out on day 16; a Medium Bus is too heavy for Juno I. Solar Cells show as locked until Vanguard 1 (ticket 14).
- **The 3D Spacecraft** sits against stars with the real Earth below: true continents, deserts, forests and ice from Natural Earth on a low-poly globe, thin clouds and a glowing atmosphere, turning slowly west to east. It starts over the Americas (Explorer 1 launched from Cape Canaveral) and is drawn at its true apparent size from 13,000 km up, so whole continents fit (from Explorer 1's own height it would fill half the sky). It stays in the lower part of the view however the camera turns. Details: [`docs/research/earth-map.md`](research/earth-map.md). Every Part has visible detail so choices read at a glance: the Small Bus is a slim striped cylinder with seams, flanges and a hatch; the Medium Bus is an octagon in gold foil with a finned white radiator and corner rails; batteries are rows of cells in a strut cage; solar cells are framed panels with a cell grid; the Simple Antenna is four hinged whips plus slot antennas; Spin adds balance weights and spin-up nozzles, and the model really spins; the radiation detector has vents and a window onto its Geiger tube under the nose cone. A launch adapter ring sits at the bottom.
- **Easy mode:** fewer, simpler Parts, and placement is automatic. **Advanced mode:** more Parts and more realistic numbers. **Manual placement** (panels facing the Sun, camera facing Earth) is **Later**, in Advanced only.

| Slot | Options (by Era) |
|---|---|
| **Bus** | Small, Medium, Large |
| **Power** | Batteries only · body-mounted solar cells · fold-out solar panels · RTG (Later, deep space) |
| **Battery** | Small · Large · Lithium (Era 4) |
| **Comms** | Simple antenna (wide, slow) · Dish antenna (fast, must point at Earth) · Relay radio |
| **Computer** | Basic · Advanced |
| **Attitude control** (pointing) | Spin (like Explorer 1) · Magnetic torquers · Reaction wheels |
| **Propulsion** | None · Small thrusters · Main engine (needed for GEO and the Moon) |
| **Payload** | Radiation detector · TV camera · Radio transponder · Multispectral camera · Telescope · Moon mapper (camera + laser altimeter) · Science package |
| **Crewed only** | **Crew Module** (oxygen, water, food, temperature, CO₂ removal, in one Part) + **Launch Escape System** (required) |

- Every Part has **mass, power use, cost, build time, reliability**. Payload also has **Data per day** and **science value**. Real ranges: [`docs/research/spacecraft-parts.md`](research/spacecraft-parts.md). Older Eras use lower, clearly labelled game estimates.
- **Crewed rule:** estimated success must be **≥95%** to Launch.
- There is rarely one right answer: several designs can meet a Contract.

## 8. Launch planning

- **Launch Vehicle catalogue** by Era (Juno I, Thor-Able, Thor-Delta, Saturn V, Space Shuttle, Pegasus, Atlas V, Falcon 9, SLS: see [`docs/research/launch-vehicles.md`](research/launch-vehicles.md)): payload capacity per orbit, cost, reliability. Rideshare is priced per kg.
- **Launch site:** your Spaceport or a real spaceport you ship to (Cape Canaveral/Kennedy, Vandenberg, Wallops: see [`docs/research/launch-sites-and-physics.md`](research/launch-sites-and-physics.md)). Latitude and coast matter: launching east near the equator gives a free speed boost from Earth's spin, and a coast lets failed rockets fall into the sea.
- **Mass check:** the game blocks launches where Spacecraft mass is over the vehicle's capacity for that orbit.
- **First Mission loop (ticket 08):** the Launch planner sits inside the Mission Designer. It shows the Launch Vehicle (only Juno I in Era 1) with its lift and a fits/too-heavy line, the Launch Site (Cape Canaveral), the costs (Rideshare = kg × price per kg, plus Shipping), and a timeline (assembly, Shipping, arrival, Mission end, deadline). The Mission Designer's warnings are repeated there: a weak design can still ship, so the Mission Report can show what went wrong. Shipping is blocked only for no accepted Contract, a Mission already on its way, empty slots, too much mass, missing Parts or not enough money, each with one plain reason.
- **Book Rideshare and ship** pays both costs at once and takes the Parts out of the Warehouse. The Site keeps running while the Spacecraft is assembled and shipped; the HUD counts down, then shows **Launch**. One Mission at a time.
- **Watching the Shipping:** the Mission happens on the Site, not just in numbers. A loading dock (concrete pad, crane, lamps) appears beside the Warehouse, or in the middle of the Site without one. During assembly the player's own Spacecraft stands on a flatbed truck inside a yellow scaffold while the crane swings over it. When Shipping starts, a crate closes over it and the truck drives off the Site, the side with the least water, and out of sight as the Shipping days run out (7 days: 14 seconds at 1×). **Follow the truck** glides the camera after it; dragging the map stops following, and once the truck is gone the camera returns to the Site.
- **Mission tracker** (HUD button while a Mission is on its way): a road from "Your Site" to the Launch Site with the truck on it, what is happening now and the days left, and four stages with their dates: assembly, Shipping, Launch (from the arrival date) and the Mission's days of Data (when it would end if launched then), then the deadline (orange if the Mission would end too late). It holds the Launch button once the Spacecraft has arrived. The Launch itself becomes a 3D sequence in ticket 10.
- **First tuning** (game estimates in `src/game/balance.ts`): Juno I Rideshare **$40,000 per kg** (no real per-kg price exists; for scale, 2026 rideshare is about $7,000/kg), Shipping to Cape Canaveral **$25,000 and 7 days** (until real Site places, ticket 16). Explorer 1 (11.5 kg) costs $485,000 and reaches the Cape 37 days after shipping.
- **Launch** works out the flight from the design, with no luck yet (risk comes with ticket 17), and opens the Mission Report. Success pays the reward and moves the Contract to Done on the board. Failure pays nothing; the Contract stays open until its deadline, so the player can fix the design and ship again.
- **Weather:** rolled from the launch site's real climate. Over-limit wind or lightning **Scrubs** the launch (based on real launch weather rules).
- **Launch Window advisor:** suggests the best day and explains why ("calm winds; Moon window opens"). Moon windows come round about monthly. Mars about every 26 months (Later).
- **Launch Insurance:** price based on estimated success. Pays back most of the cost on failure. Explained in one line.

## 9. Test Run, flight and Anomalies

- **Test Run (2D, free, unlimited):** top-down orbit view plus graphs (battery, Data stored, signal). Shows predicted problems and an **estimated success %** (from running about 200 quick simulations).
- **Launch and flight (3D):** a 2–4 minute flight: launch, staging, orbit, operations, with Anomalies along the way.
- **Anomalies (mini-games):**

| Anomaly | What you do | More likely when |
|---|---|---|
| **Point the antenna** | Aim at a Ground Station before contact is lost | Weak Comms, few Ground Stations |
| **Stuck solar panel** | Free a panel that didn't open | Cheap, low-reliability panels |
| **Dodge the debris** | Time a short engine burn to avoid space junk | Busy orbits, later Eras |
| **Survive the eclipse** | Switch systems off so the battery lasts through Earth's shadow | Small battery, thin Power margin |
| **Stop the tumble** | Steady a spinning Spacecraft (safe mode) | Weak attitude control |

- **Rules:** each type is mandatory the first time; after that it can be skipped and is resolved from your best past result. Anomalies come mostly from **design weaknesses**, not pure luck. Failing one **reduces** the Mission's result; it never destroys it outright.
- **Hackathon:** build 3 (antenna, solar panel, eclipse), then the other 2 if time allows.

## 10. Mission Report and scoring

- Explains **why** the Mission ended as it did, linked to design choices ("Battery ran out in eclipse because Power margin was 3%. A larger battery or more solar cells would fix this.").
- **First version (ticket 08):** the outcome ("Explorer 1 worked!" / "failed."), then one line per requirement with ✓ or ✗ and the design numbers behind it, failures first: orbit (mass against lift), Payload, Power (battery Wh, watts used, days it lasted), Communications (kB sent against kB made) and Time (end date against deadline). Then the reward, or until when the Contract stays open. It pauses the Site while open. Every report is saved for the History Archive later.
- Rewards: money, Reputation, Research Points, a **Mission Patch**, and Real History cards.
- **Weekly Challenge score:** the objective must be met to score at all. Then **Reliability 40%**, **Science value 30%**, **Money left 20%**, **Mass margin 10%**. Best attempt counts; speed does not. Everyone who completes it gets the same reward; the top 3 get a badge.

## 11. Company identity

- **Company name:** player's choice, 2–24 characters, with a "don't use your real full name" note and a bad-word filter (also catches spelled-out and leetspeak words; real names like Cassini or Uranus pass).
- **Logo:** an in-game **logo maker** (shapes, colours, space icons). Players may also **upload a drawing**, resized to 128×128 (upload cap about 200 KB), with a "don't upload photos of people" warning and a report/hide button for viewers.
- The logo appears on the Company's rockets, flag and buildings, and on every **Mission Patch** (collected in a patch gallery).
- **Default logo:** an original preset from the logo maker. Not the NASA Space Apps logo: it's an official emblem that must not be altered or imply endorsement, so it can't become a player's company logo. The official logo may appear unaltered on the splash and credits ("Made for NASA Space Apps 2026"), once organisers confirm.

## 12. Online (Free Play)

- **Anonymous accounts:** a nickname (NASA-themed generator with 🎲 re-roll, or the player's own, filtered) plus a **secret recovery code** to continue on another computer. No email, no password, no personal data.
- **Hackathon:** leaderboards (Company value, Missions completed, Reputation, Research), **Weekly Challenge**, shareable Seeds, cloud saves.
- **Later:** visiting other Companies' Sites (with their logo), preset messages ("Can you send 500 titanium?"), sending resources, cooperative missions. **No chat.**
- **Backend:** Supabase's hosted free tier (ADR-0001). We don't run a server of our own.

## 13. Look, sound and text

- **Look:** cozy, colourful low-poly world under a daytime sky, with sun shadows and soft shading in corners and at the foot of cliffs. Clean, calm NASA-style interface (dark panels, crisp charts). Not overwhelming.
- **Camera:** opens at the classic isometric angle over the Site. Left-drag or WASD/arrows move (up to 32 tiles past the Site's edge, so you can look at the land next door), right-drag or Q/E and R/F turn and tilt (down to the horizon, up to nearly top-down), the wheel or +/− zooms. **H** (or the ⌂ button) glides back to the isometric view of the whole Site. A narrow-lens perspective camera, so the horizon can be seen (ADR-0003).
- **Buildings:** detailed low-poly models that read at a glance: each has a recognisable shape, small details (doors, windows, lamps), something in the colour of what it makes, and a moving part while it works (e.g. a Mine's winding wheel turns while the Site runs).
- **Text:** short and plain. Unusual terms get a hint the first time ("Launch Vehicle (the rocket)"). Every real thing gets **Learn more →** to an official NASA page or Wikipedia. No logos of NASA, SpaceX or any real organisation. Real mission names and facts only, with sources.
- **Sound:** sound effects generated in code where possible, otherwise free licensed packs. Music: free licensed tracks first, then AI-generated (Lyria 3.5) for gaps. All credited (see `docs/audio/`).
- **Music mood:** hopeful, cozy, exciting. Tracks: main menu, Site (calm), Mission Designer (focused), Launch (exciting), flight, Anomaly (tense), success and failure stingers. Era-flavoured music is Later.
- **Title, menus and loading:** opening the game shows the title (LEAP logo, subtitle, acronym line), then the main menu. Full-screen menus use a **live 3D scene rendered by the game** (e.g. your Site at sunset, a slow orbit over Earth), not a picture. Loading screens show a rendered shot of what's loading plus **one short tip**: a real, sourced fact linked to the current Era or Mission (same facts as the History Archive) or a gameplay tip. Loading never waits longer just so a tip can be read.
- **Images:** real things get **real NASA photos with credit** (check each image's credit: some on NASA sites belong to partners). **Era transitions** get one illustration each (AI-generated is fine), always clearly an illustration in the game's colours, never a fake photo. Images are compressed and loaded only when needed.
- **Name on screen:** the title screen shows a big **LEAP** logo, the subtitle "A Space Mission Design Game" underneath, and one small line, *Launch · Engineer · Advance · Pioneer* (the four words may animate out of the four letters once). Everywhere else the game is just "LEAP". The Apollo 11 Real History card mentions *"one giant leap"* once, as the hidden source of the name.
- **Language:** English. All text kept in one file so translations can be added later.

## 14. NASA data in the game

The challenge expects the provided data to be used visibly. Planned slots, to be adjusted when the official Resources appear (Nov 13):

| Data | Used for |
|---|---|
| NASA POWER (climate) | Site sunshine, wind, rain, temperature; launch weather |
| NASA GIBS (satellite imagery) | Real satellite photos of your region after Earth-imaging Missions |
| JPL Horizons | Moon (and later Mars) positions and Launch Windows |
| NASA DONKI (space weather) | Real solar storms as flight events |
| NASA 3D Resources | Models of real spacecraft for Real History cards |
| NASA Small Spacecraft State-of-the-Art report | Real Part numbers |
| Natural Earth (public domain, not NASA) | Real continents on the Mission Designer's globe |
| Official challenge Resources | To be added on Nov 13 |

## 15. Screens

Main menu · New game (mode, Company, logo, globe, Seed) · Site view (money, Raw Materials, date, speed) · Build menu · Contracts board · Mission Designer · Launch planner (vehicle, site, weather, window, insurance) · Test Run · Flight · Mission Report · Research · History Archive · Patch gallery · Leaderboards and Weekly Challenge · Pause menu (Esc: Seed, Settings) · Credits

## 16. Tutorial (first 10 minutes, Explorer 1)

1. Name the Company and pick the Historic start.
2. Accept the Explorer 1 Contract.
3. Place an Aluminium Mine and a Copper Mine, then Metal Works and an Electronics Lab (or buy Parts).
4. Open the Mission Designer: small Bus, batteries only (Explorer 1 had no solar cells), simple antenna, spin stabilisation, radiation detector.
5. Choose the Launch Vehicle (Juno I, as in 1958), book the Rideshare and ship to Cape Canaveral.
6. Test Run: see the battery graph, fix one warning.
7. Launch. First Anomaly: **Point the antenna**.
8. Mission Report and Real History card: the Van Allen belts were discovered. First Mission Patch.

Each step teaches one idea, hands-on, with a short line of text. No walls of text.

## 17. Design principles we follow

- Teach one idea at a time, hands-on, then build on it.
- Visible goals before mechanics. Early failure is cheap and reversible.
- Every choice has a visible consequence. Explain **why**, not just right or wrong.
- Short text. Learn more is optional.
- Balanced: never tedious, never bankrupting.

Sources for these principles: [Wayline: designing tutorials and onboarding](https://www.wayline.io/blog/designing-effective-game-tutorials-and-onboarding) · [GDevelop: text-based tutorials don't work](https://gdevelop.io/blog/improve-game-tutorials) · [Acagamic: onboarding techniques](https://acagamic.com/newsletter/2023/04/04/dont-spook-the-newbies-unveiling-5-proven-game-onboarding-techniques/) · [Frontiers in Education: onboarding in educational games](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.980881/epub)
