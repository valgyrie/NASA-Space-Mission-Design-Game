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
| **Weekly Challenge** | Free Play only. Same budget, Parts list and weekly Seed for everyone. | ✅ |
| **Demo Mode** | One fixed demo Site, one ready save per Era. | ✅ |
| **Sandbox** | No limits, everything unlocked. | Later |
| **Team Mode** | _Planned (ticket 41)._ Two to four players share one Mission design on one screen and pass the mouse; each role (Mission lead, Power, Communications, Science) owns its slots and signs its lines of the Design Review before the design ships. No networking. | ✅ planned |

**As built (ticket 21):** choose Campaign or Free Play independently of Easy/Advanced. Free Play starts on 1 January 2026, anywhere on Earth's land, with HQ level 5 and a level 1 Assembly Hall. It uses the Parts built so far and the same economy, Marks, Research, six bars, Test Run, Shipping and flight rules; Solar Cells do not need the Vanguard 1 card here. Buildings and better Marks still need money and days. Falcon 9 Rideshares replace the retired historical rockets; see §8 and `docs/research/launch-vehicles.md`.

Three generated offers stay on the board: radiation surveys, weather photography and geostationary communications relays for fictional clients. Their duration (30–90 days), orbit and reward vary; deadlines allow 240 days beyond the requested Data period. All figures are game estimates. Taking work replenishes the board; successful Contracts stay completed, missed ones can be accepted again. IDs reproduce the same terms after reload, including on old Mission Reports and Patches.

After all **currently built** Campaign Milestones (through Syncom 3), the board offers **Continue in Free Play**. The same Company keeps its name, logo, place, Seed, buildings, stock, Marks, money, Research, reports, Patches and History Archive. The date jumps forward to 2026 (never backwards); pending Upgrade time is preserved. This interim endpoint moves when later Campaign Milestones are built; the planned story still ends after Artemis IV. Save v18 preserves earlier games as Campaign Companies. Online features wait for tickets 22–23.

**Demo Mode (ticket 24):** the main menu offers the two finished Campaign Eras on one fixed Site (Seed `K7QXM2`, Historic JPL place). Era 1 has Explorer 1 accepted and a batteries-only design; Era 2 has the earlier Milestones completed, Telstar 1 accepted, a solar-powered relay design and a Ground Station. Both have working industry, a Warehouse, spare Parts and enough money to test, change the design and ship at once. They use Easy mode and skip the tutorial, with the normal Mission rules and risks. Selecting an Era starts its prepared Company afresh; all demo saving is separate from the player's Company. The pause menu saves the current session before returning to the main menu. Later Campaign Eras need their own prepared save when built.

## 4. Starting the game

- **Name your Company** and make a **logo** (see §11).
- **Choose a start:**
  - Campaign: **Historic start** (red pin at JPL, Pasadena, where Explorer 1 was built), **Anywhere in the US**, or **Anywhere on Earth** (labelled alternate history).
  - Free Play: anywhere on Earth.
  - Pick a spot on a 3D globe, or press **Random**. Each start has a **Seed** that can be shared.
- **The location is real:** climate (sunshine, wind, rain, temperature) comes from NASA POWER data for 2025, baked into the game. Land type (coast, desert, mountains, forest, ice) also comes from real data.
- **The Site map is generated** from the Seed and that real data: terrain, water, and mineral deposits.
  - A Site is 64 × 64 tiles of terraced land: grass, sand, hills, mountains.
  - **Every building takes 3 × 3 tiles** (decided 2026-11-10): big enough to see from the whole-Site view, and a Site still holds hundreds. On a slope it stands on the highest ground under it, on a foundation. Buildings can't overlap or hang over the Site's edge.
  - Water is one of: a coast, a lake, a river, or none.
  - Every Site gets at least two Deposits each of Aluminium, Copper and Silicon, on the land where they're found (§5). If that land is missing, they go on any dry land, so no start is unplayable.
  - A random Seed is 6 letters and digits with no vowels (so it can't spell a word), e.g. `K7QXM2`. Players can type their own (up to 12, bad words blocked). Case, spaces and dashes don't matter.
  - The Seed is chosen in New game and afterwards shown in the pause menu (Esc), with Copy. It is not on screen during play.
- **Growing the Site (Optional, ticket 30):** the land around is split into **Plots** the size of the Site. Look at a neighbouring Plot, see its Deposits and water, and buy it to add it to the Site. Price rises with what it holds and with each Plot bought. Contracts can also give a Plot as a reward.
- **As built (ticket 30):** hover the land next door to highlight its Plot (green: you can buy it); its Deposits show faintly. Click it for a card with Deposits per Raw Material, water, land and price. Only Plots touching your land (corners count) can be bought. A bought Plot joins the Site: build on it, the border grows round it, the camera pans over it. Price: $600K for dry land plus $100K per Deposit, half as much again for each Plot already bought (game estimates). In Free Play every fourth Contract also gives a free Plot. Looking is free (no Survey fee).
- **The world goes on past the Site.** The same Seed shapes the land around it out to the horizon, so coasts and rivers carry on past the edge. Only the Site can be built on (for now); a thin line marks its edge, and the land outside is slightly hazy.
- **As built (ticket 16):** New game shows a globe beside the name and Seed. Buttons: **Historic** (red pin at JPL), **In the US**, **Anywhere** (labelled alternate history) and **🎲 Random** (a random land spot of the chosen kind, from Historic: the US, plus a new Seed). Drag to turn the globe, click land to move the pin: a spot in the US becomes a US start, anywhere else an alternate-history one; sea is refused. A line under the globe gives the land type and the place's real 2025 climate. The Site preview behind updates as the place changes. The place is saved; older saves keep their made-up Site and ship from JPL.
- **How the real place shapes the Site** (game rules on real numbers, `src/game/places.ts`): rain sets how dry the land is (desert land always dry, so more sand and Silicon); sea within 1° gives a coast, otherwise a lake, a river or none (none in deserts); mountain land or ground over 1,500 m gives more hills and peaks (more Copper), plains and low land are flatter; below about 3 °C a year the land turns snowy. Data: [`docs/research/places-and-weather.md`](research/places-and-weather.md).
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
| **Research Lab** | Turns science Data into **Research Points** | 50 kB a day each; Data waits until there is one |
| **Assembly Hall** | Builds the Spacecraft; its level sets the biggest Bus | Every Site starts with one near its middle |
| **Warehouse** | Stores Raw Materials and Parts | Storage counts by mass (kg) |
| **Ground Station** | Antenna that talks to Spacecraft; sets Communications | Bigger dish = more Data |
| **Launch Pad** | Launch your own rockets | Spaceport Site, Era 4 |

- **Upgrades** work like town halls in base-builders: each building has levels that raise output or quality (lighter, more efficient Parts). Upgrades cost money and take days (**Time**).
- **Building levels (ticket 15):** click any building to see its level, what the next one does, and its Upgrade. Level 2 costs the building's price and takes 15 days; level 3 costs twice that and takes 30. The building keeps working meanwhile, and a tower crane stands beside it; gold stars on a small sign show its level. Each level above 1 adds half again: Mines dig 10 → 15 → 20 kg a day, Warehouses store 2,000 → 3,000 → 4,000 kg, Research Labs research 50 → 75 → 100 kB a day.
- **Marks:** a Factory makes Parts of its own level: **Mk 1, Mk 2, Mk 3**. Each Mark above Mk 1 is 15% lighter, uses 10% less power and its solar cells make 10% more. The Warehouse keeps each Part's Mark; a Spacecraft takes the best ones, the Market buys back the worst first and sells only Mk 1. A lighter Spacecraft pays less Rideshare, so Factory Upgrades teach mass.
- **Assembly Hall:** every Site starts with a level 1 hall on flat, open, dry land near its middle (not at the foot of a cliff, where it would be hard to see). Level 1 takes a Small Bus, level 2 a Medium Bus ($300K, 15 days; TIROS-1 needs it). Its top level in Era 1 is 2; a bigger Bus in Era 2 opens level 3. A Bus the hall can't take can still be designed and test-run, but not shipped. The Shipping truck loads at a dock beside the hall, as big as a building, and takes the easiest road off the Site (little water, few climbs). Game estimates in `src/game/balance.ts`.
- **Income:** Contract rewards (main), selling Raw Materials and Parts (small), science Missions (Research Points and Reputation).
- **Costs:** buildings and Upgrades, Plots of land (Optional), **Rideshare** (priced per kg, which teaches mass), **Shipping**, **Launch Insurance**.
- **Safety net:** starting money covers the tutorial. A one-time **startup grant** appears if money gets dangerously low: the first time the Company has under **$300K** with no Mission on its way, a card says the government backs young space companies and pays **$1M**, once per game (game estimates, ticket 17). It waits until no report or card is on screen.
- **Time:** the Site runs in real time with pause and 1×/2×/4× speed. Opening the Mission Designer pauses it, as does any dialog over the Site; the speed buttons wait until it closes, and Tab stays inside the dialog. The **Game date** starts on 1 January 1958; one game day takes 2 real seconds at 1×. Space pauses and resumes.
- **Saving:** the game autosaves in the browser. If the browser refuses a save (storage full or turned off), a warning stays on screen until a save works again; play continues.
- **Mines** go on any Deposit, mountains included (Copper is often up there). A Mine only has to touch a Deposit with one of its 3 × 3 tiles, and its middle must be on dry land. It digs the Deposit nearest its middle.
- **First tuning** (all in `src/game/balance.ts`, change freely): start with **$2M**; a Mine costs **$150K** and digs **10 kg a day**. Money is US dollars, Raw Materials are kilograms.
- **Factories:** each makes one Part at a time, chosen by clicking it; it takes the Raw Materials when it starts a Part and adds the Part when done. Era 1 Parts: Small and Medium Bus (Metal Works), Basic Computer, Simple Antenna and Radiation Detector (Electronics Lab), Solar Cells (Solar Fab), Small and Large Battery (Battery Plant). Recipes are game estimates, not real figures.
- **Factories, Warehouses and Research Labs go on dry land without a Deposit** under any of their tiles, so Deposits stay free for Mines.
- **Storage** counts Raw Materials and Parts by mass: the Site holds **500 kg** in its yard, and each Warehouse adds **2,000 kg**. Mines stop when it is full. A Factory's Raw Materials keep their room until its Part is done, and a Part always weighs less than its inputs, so a finished Part or inputs given back never overfill it. A Factory that has its inputs while the Site is paused says it starts when time runs.
- **Market:** every Raw Material and Part has a making cost (Raw Materials' value plus the Factory's work). The Market sells at **2×** that and buys at **½**. Raw Materials trade in 10 kg lots, Parts one at a time, and arrive at once (Shipping between Sites comes later).

## 6. Contracts, Milestones and progression

- A **Contract** has a client, objective, requirements, reward (money, Reputation, land, Parts) and deadline. Example: _"Photograph 80% of Earth's land at ≤10 m detail for 2 years: $40M."_
- **Contracts board** (button in the Site view): shows Contracts on offer and the active ones. Accepting a Contract makes it active and starts its deadline that Game day; the days left show on the board and under the Company name. The board button glows while there is work on offer and none taken.
- **Explorer 1 Contract** (first tuning in `src/game/balance.ts`): client US Army; reach Low Earth Orbit, carry a radiation detector, send Data for 30 days; reward **$3M**; deadline **365 days** after accepting (about 12 minutes at 1×). When a deadline passes before the Contract is fulfilled, it goes back on the board (once no Mission for it is on its way), with a line saying the deadline passed; accepting it again starts a new deadline. No penalty yet (Reputation comes later).
- **Campaign:** each Era has **Milestones** (required) and optional side Contracts. Finishing an Era's Milestones unlocks the **HQ** Upgrade. Pay and wait, then the next Era begins and the year jumps.
- **Research Points** choose the order of Upgrades inside an Era (e.g. better solar cells or a stronger antenna first). Small tech tree, about 15 items in total.
- **Research (ticket 14):** every Spacecraft in orbit sends its Data home while it works (until its Power runs out or its Contract's days end; days lost to an Anomaly don't count), even on a failed Mission. The Data waits for a **Research Lab** ($250K), which turns 50 kB a day into Research Points: 100 kB = 1 point. Explorer 1 gives 6 points, TIROS-1 about 31. The top bar shows Research Points (and Data waiting with no Lab). Clicking a Lab shows the points, the next one's progress and the **tech tree**. Era 1 Upgrades: **Better solar cells** (×1.5 solar power, 5 points), **Stronger radio** (×1.5 antenna rate, 5), **Better batteries** (×1.25 battery energy, 5), **Low-power electronics** (×0.8 power use, 8). Each counts for every Spacecraft shipped after it is bought; a Spacecraft keeps the Upgrades it shipped with. Game estimates in `src/game/balance.ts`.
- **TIROS-1 Milestone (ticket 14):** offered once Explorer 1 is done (Milestones come in history's order). Client NASA; Low Earth Orbit, a **TV camera**, **78 days** of Data (NASA's figure); reward $5M, 365 days. Its "before" card is "Watching the weather", its "after" card "The first weather satellite". Explorer 1's success also shows a side story card, **Vanguard 1** ("Power from the Sun"), which unlocks **Solar Cells**. Finishing TIROS-1 completes Era 1's Milestones.
- **HQ and Eras (ticket 18):** every Site starts with an **HQ** beside the Assembly Hall; its level is the Company's Era. Once every Milestone of the Era is done (the Contracts board says so), the HQ Upgrade opens: $1.5M and 15 days, like any level 2 Upgrade (game estimate). When it is done the Game date jumps to the new Era's first day (Era 2: 1 January 1962), never backwards, and every date still to come moves with it. A card welcomes the new Era and lists what opened. Juno I and Thor-Able retire ("Retired: last flew in 1958/1960"). Parts, buildings and slots of a later Era show as locked ("Era 2") until then.
- **Telstar 1 Milestone (ticket 18):** client AT&T; Low Earth Orbit (the real 952 × 5,933 km at 44.8°), a **Radio Transponder**, **136 days** of Data (it worked normally from 10 July to 23 November 1962); reward $8M. As AT&T did, the Company pays for the **whole Launch Vehicle**, not a Rideshare: Thor-Delta costs $2.7M (AT&T paid NASA $2,680,982), whatever the mass. The transponder makes 90 kB a day, more than a Simple Antenna sends (50), so it needs a **Ground Station**. Cards: "TV across the ocean" and "Live via satellite" (the Andover horn antenna).
- **Syncom 3 Milestone (ticket 18):** client NASA; **geostationary orbit** (35,786 km over the equator), a Radio Transponder, **66 days** of Data (launch on 19 August 1964 to the end of the Tokyo Olympics, 24 October); reward $10M. The rocket only reaches a transfer orbit; the Spacecraft's own **Main Engine** (24 kg, like Syncom's solid apogee motor) does the rest, else it is "Stuck in the transfer orbit". With the engine it weighs about 48 kg: too much for Thor-Delta's 45 kg to the transfer orbit, so it flies on **Delta D** (104 kg), and its Parts need the **Large Bus** (Assembly Hall level 3, which opens in Era 2). Up there it is in sunlight 99% of the time (NASA's figure for Syncom). Cards: "A satellite that stands still" and "The Tokyo Olympics, live".
- **Ground Stations (ticket 18):** an Era 2 building ($400K): a big dish that turns while it works. Each one adds its level's boost to what every antenna sends home (one level 1 station doubles it, level 2 adds 1.5, level 3 adds 2; game estimates). Without one, Spacecraft use borrowed stations (×1). A Mission keeps the boost it shipped with. Sending more also lowers the chance of Point the antenna.
- **Who needs the Data** _(planned, ticket 42)_: every generated Free Play Contract says who needs the Data and why. Later, a "Choose a question" Contract derives orbit, Payload and days from the question and greys out options that can't answer it (the Webb game's pattern; NASA's "begin with the end in mind").
- **Rideshare dates** _(planned, ticket 44, Later)_: Rideshares leave on fixed days; a late Spacecraft waits for the next one. A Whole Launch picks its own day (CubeSat 101 §2.15).
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
- **As built (ticket 17):** a failed Mission keeps its Contract open until the deadline, then it goes back on the board. The Company's first failed Mission (for any reason) shows the **Vanguard TV3** card, "Up 1.2 metres, then down" (a failure story, kept in the History Archive), ending "find out why, fix it, and fly again". Its photo is a Vanguard rocket on its pad in 1958; no NASA photo of the explosion was found. Facts: `docs/research/milestones.md`.
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

- **Era 1 numbers** (game estimates in `src/game/balance.ts`): the tutorial design (Small Bus, batteries only, Large Battery, Simple Antenna, spin, radiation detector) weighs 11.5 kg and lasts about 33 days. A Small Battery runs out on day 16; a Medium Bus is too heavy for Juno I. Solar Cells stay locked until the Vanguard 1 card, after Explorer 1.
- **TIROS-1 numbers** (game estimates): the TV Camera weighs 4 kg, makes 40 kB a day and uses 1.4 W. Solar Cells give 3 W in sunlight, 1.8 W on average over an orbit, a little less than the camera and antenna use (2 W). So batteries alone last 15 days, a Small Battery with Solar Cells about 75 of the 78 days (the Test Run shows an estimated success in between), and a Large Battery with Solar Cells all of them. Better solar cells or Low-power electronics let the Small Battery do. The camera, solar cells and battery don't fit a Small Bus, and a Medium Bus design (18–21 kg) is too heavy for Juno I, so TIROS-1 needs Thor-Able. The 3D model shows two TV cameras and a tape recorder on a deck in the nose.
- **The 3D Spacecraft** sits against stars with the real Earth below: true continents from Natural Earth, coloured with NASA Blue Marble's real land colours, on a smooth globe with rounded coastlines, soft clouds, a glint of sunlight on the sea and a glowing atmosphere (the same Earth in the 3D Launch and the Space view; it stays smooth close up), turning slowly west to east. It starts over the Americas (Explorer 1 launched from Cape Canaveral) and is drawn at its true apparent size from 13,000 km up, so whole continents fit (from Explorer 1's own height it would fill half the sky). It stays in the lower part of the view however the camera turns. Details: [`docs/research/earth-map.md`](research/earth-map.md). Every Part has visible detail so choices read at a glance: the Small Bus is a slim striped cylinder with seams, flanges and a hatch; the Medium Bus is an octagon in gold foil with a finned white radiator and corner rails; batteries are rows of cells in a strut cage; solar cells are framed panels with a cell grid; the Simple Antenna is four hinged whips plus slot antennas; Spin adds balance weights and spin-up nozzles, and the model really spins; the radiation detector has vents and a window onto its Geiger tube under the nose cone. A launch adapter ring sits at the bottom.
- **Easy mode:** fewer, simpler Parts, and placement is automatic. **Advanced mode:** more Parts and more realistic numbers. **Manual placement** (panels facing the Sun, camera facing Earth) is **Later**, in Advanced only.

**Modes (ticket 20):** choose Easy (default) or Advanced when starting the Company; the pause menu's Settings keeps the choice visible. It stays fixed for that Company. Easy keeps the original Part set and rounded labels. Advanced adds a Medium Battery (4.2 kg, 420 Wh) and Low-power Antenna (0.8 kg, 0.14 W, 24 kB/day), shows up to two decimals and battery Wh/kg, and uses the same six resources and flight rules. The extra choices trade mass and Power against Communications. Their historical basis and game estimates are separated in `docs/research/spacecraft-parts.md`. Earlier saves become Easy and keep their game. Factories and the Market follow the same Part set as the Mission Designer.

| Slot | Options (by Era) |
|---|---|
| **Bus** | Small, Medium, Large |
| **Power** | Batteries only · body-mounted solar cells · fold-out solar panels · RTG (Later, deep space) |
| **Battery** | Small · Medium (Advanced) · Large · Lithium (Era 4) |
| **Comms** | Simple antenna (wide, slow) · Low-power Antenna (Advanced) · Dish antenna (fast, must point at Earth) · Relay radio |
| **Computer** | Basic · Advanced |
| **Attitude control** (pointing) | Spin (like Explorer 1) · Magnetic torquers · Reaction wheels |
| **Propulsion** | None · Small thrusters · Main engine (needed for GEO and the Moon). Built (ticket 18): None and Main Engine; the slot shows from Era 2 |
| **Payload** | Radiation detector · TV camera · Radio transponder (ticket 18) · Multispectral camera · Telescope · Moon mapper (camera + laser altimeter) · Science package |
| **Crewed only** | **Crew Module** (oxygen, water, food, temperature, CO₂ removal, in one Part) + **Launch Escape System** (required) |

- Every Part has **mass, power use, cost, build time, reliability**. Payload also has **Data per day** and **science value**. Real ranges: [`docs/research/spacecraft-parts.md`](research/spacecraft-parts.md). Older Eras use lower, clearly labelled game estimates.
- **Maturity strip** _(ticket 33)_: four steps at the top of the Mission Designer with JPL's Concept Maturity Level names and a one-line hint each: 1 Cocktail Napkin (Contract accepted), 2 Initial Feasibility (no bar short), 3 Trade Space (a second, different design has had a Test Run for this Contract), 4 Point Design (Design Review passed). Each step lights on its own rule, so a skipped step stays dark; the highest lit one is current. Nothing lights before a Contract is accepted. Changing the design can drop steps 2 and 4 again (JPL's feedback loop between CMLs 2–4). Hidden in the Weekly Challenge.
- **Design Review** _(ticket 33)_: in the Launch planner, above Shipping, in the style of JPL's CML 4 checklist. Seven requirement lines (orbit and mass, Payload, Power, Data, Communications, Time, Budget: Parts, Launch and Shipping against the money) are green when met, red when not. Three margin lines against JPL's 35%: green at 35% spare or more, yellow under it, red when short. Spare mass = (lift − mass) ÷ mass; spare power = (sunlight watts averaged over the orbit − watts used) ÷ watts used, left out on batteries alone; spare energy = (the Power bar's Wh − Wh used) ÷ Wh used. It passes at 80% of the counted lines green (JPL's rule). It replaced the planner's warnings list. A weak design can still ship. Same 35% in both modes: Explorer 1's tutorial design is 7 of 9 green (thin mass and energy, like most Era 1 designs), TIROS-1's 8 of 10 (its battery covers what sunlight misses), Syncom 3's 10 of 10.
- **Compare designs** _(planned, ticket 45, Later)_: two designs side by side; a short code copies a design, like a Seed.
- **CubeSat sizes** _(planned, ticket 48, Later)_: Free Play Buses become 1U, 3U and 6U (a 1U is a 10 cm cube of about 1 to 1.33 kg, CubeSat 101 §1.1).
- **Crewed rule:** estimated success must be **≥95%** to Launch.
- There is rarely one right answer: several designs can meet a Contract.

## 8. Launch planning

- **Launch Vehicle catalogue** by Era (Juno I, Thor-Able, Thor-Delta, Saturn V, Space Shuttle, Pegasus, Atlas V, Falcon 9, SLS: see [`docs/research/launch-vehicles.md`](research/launch-vehicles.md)): payload capacity per orbit, cost, reliability. Rideshare is priced per kg.
- **Launch site:** your Spaceport or a real spaceport you ship to (Cape Canaveral/Kennedy, Vandenberg, Wallops: see [`docs/research/launch-sites-and-physics.md`](research/launch-sites-and-physics.md)). Latitude and coast matter: launching east near the equator gives a free speed boost from Earth's spin, and a coast lets failed rockets fall into the sea.
- **Mass check:** the game blocks launches where Spacecraft mass is over the vehicle's capacity for that orbit.
- **Thor-Able (ticket 14):** 120 kg to Low Earth Orbit, Rideshare $25,000 per kg (game estimate), 27 m, three stages (Thor 165 s, Able 115 s, Altair 38 s). Bookable once Explorer 1 is done (it first flew in April 1958); before that the planner shows it with "Opens after Explorer 1". The vehicle picked in the Launch planner is saved, and the Mission Designer's Mass bar measures against it; when a design is too heavy, its warning names a bigger open vehicle. The 3D Launch shows a Thor-Able for it, with "Staging" between stages 1 and 2. Numbers: [`docs/research/launch-vehicles.md`](research/launch-vehicles.md).
- **First Mission loop (ticket 08):** the Launch planner sits inside the Mission Designer. It shows the Launch Vehicle (only Juno I in Era 1) with its lift and a fits/too-heavy line, the Launch Site (Cape Canaveral), the costs (Rideshare = kg × price per kg, plus Shipping), and a timeline (assembly, Shipping, arrival, Mission end, deadline). The Mission Designer's warnings are repeated there: a weak design can still ship, so the Mission Report can show what went wrong. Shipping is blocked only for no accepted Contract, a Mission already on its way, empty slots, too much mass, missing Parts or not enough money, each with one plain reason.
- **Segments** _(built, ticket 32)_: the Launch planner groups its cards under NASA's four mission Segments, user first ("begin with the end in mind", slide 15): User (who gets the Data, where it goes, when the Mission ends, the deadline), Space (mass, assembly), Ground (own or borrowed stations, what the antenna sends against what the Payload makes), Launch (Launch Vehicle, Launch Site, costs, Launch Insurance, Shipping, weather). All costs are Launch costs: the Parts are already paid for. Source: Design and Develop Science Missions, slide 8.
- **Ground Tests** _(planned, ticket 40)_: three optional tests before Shipping, each costing days and money and lowering one Anomaly's chance: vibration test → Stuck solar panel, thermal vacuum test → Survive the eclipse, Day in the Life test → Point the antenna (CubeSat 101 §6.9). Numbers will be game estimates.
- **Book Rideshare and ship** pays both costs at once and takes the Parts out of the Warehouse. The Site keeps running while the Spacecraft is assembled and shipped; the HUD counts down, then shows **Launch**. One Mission at a time.
- **Watching the Shipping:** the Mission happens on the Site, not just in numbers. A loading dock (concrete pad, crane, lamps) appears beside the Warehouse, or in the middle of the Site without one. During assembly the player's own Spacecraft stands on a flatbed truck inside a yellow scaffold while the crane swings over it. When Shipping starts, a crate closes over it and the truck drives off the Site, the side with the least water, and out of sight as the Shipping days run out (7 days: 14 seconds at 1×). **Follow the truck** glides the camera after it; dragging the map stops following, and once the truck is gone the camera returns to the Site. Nothing can be built on the dock while it is in use. Land bought on the road's side during a Mission keeps the dock, and the road runs on past the new edge.
- **Mission tracker** (HUD button while a Mission is on its way): a road from "Your Site" to the Launch Site with the truck on it, what is happening now and the days left, and four stages with their dates: assembly, Shipping, Launch (from the arrival date) and the Mission's days of Data (when it would end if launched then), then the deadline (orange if the Mission would end too late). It holds the Launch button once the Spacecraft has arrived. The Launch itself becomes a 3D sequence in ticket 10.
- **First tuning** (game estimates in `src/game/balance.ts`): Juno I Rideshare **$40,000 per kg** (no real per-kg price exists; for scale, 2026 rideshare is about $7,000/kg), Shipping to Cape Canaveral **$25,000 and 7 days** (until real Site places, ticket 16). Explorer 1 (11.5 kg) costs $485,000 and reaches the Cape 37 days after shipping.
- **Launch** works out the flight from the design and opens the Mission Report. Real Parts are a little off their labels (battery ±5%, power use ±5%, antenna ±10%, game estimates), drawn from the Seed and the Launch day, so it flies like one run of a Test Run: a 10% margin always holds, a thin one sometimes fails. Launch Vehicle failures come from ticket 17 (§8). Success pays the reward and moves the Contract to Done on the board. Failure pays nothing; the Contract stays open until its deadline, so the player can fix the design and ship again.
- **Weather:** rolled from the launch site's real climate. Over-limit wind or lightning **Scrubs** the launch (based on real launch weather rules).
- **Launch Window advisor:** suggests the best day and explains why ("calm winds; Moon window opens"). Moon windows come round about monthly. Mars about every 26 months (Later).
- **As built (ticket 16):**
  - **Launch Sites:** Cape Canaveral and **Wallops Island**, Virginia (decided 2026-11-10; labelled alternate history, as these rockets never flew from there). Each shows its latitude, the free speed east from Earth's spin, how much more or less the rockets lift than from the Cape (1% per 10 m/s, game estimate; Wallops: 4% less, so Juno I lifts 13.4 kg) and its Shipping. The pick is saved; the vehicle list, the Mass bar and the flight use the lift from that Site.
  - **Shipping by distance** from the Company's place: $5,000 + $5.60 a km and 650 km a day plus a day to load (game estimates; JPL to the Cape stays $25,000 and 7 days). A start abroad pays far more and waits weeks.
  - **Weather:** a Game day's weather is the real 2025 weather on the same date at that Launch Site (NASA POWER daily: strongest wind, rain, top temperature). Wind over 12 m/s, or thunderstorms (10 mm of rain on a day of 24 °C or more, standing in for lightning, which POWER doesn't record), **Scrub** the Launch: a card says why and gives the advisor's next good day; nothing is lost but time. The Site pauses while the card is read. Cape Canaveral Scrubs on summer storm days; Wallops more on windy winter days.
  - **Launch Window advisor:** in the Launch planner (from the arrival day) and the Mission tracker (from the first day it can go): the first calm, dry day within 14 days (wind under 8 m/s, under 2 mm of rain), else the first day within the limits, with the reason. Moon and Mars windows join with their Eras.
- **Era 2 rockets (ticket 18):** **Thor-Delta** (31 m; Thor 165 s, Delta 115 s, Altair 38 s; 226 kg to Low Earth Orbit, 45 kg to a geostationary transfer orbit; 11 of 12 flights worked; Rideshare $20,000/kg or the whole rocket $2.7M) and **Delta D** (32 m; a Thor with three Castor boosters, 150 s, Delta D 170 s, Altair 2 28 s; 450 kg and 104 kg; 2 of 2 flights; $30,000/kg or $3.5M whole). Both work 97% of the time in the game. For a geostationary orbit the planner explains the transfer orbit and the Main Engine, and rockets that can't reach it say so. The 3D Launch shows each one (Delta D with its boosters), and the orbit view and Space view step back to fit the geostationary orbit.
- **Launch Insurance:** price based on estimated success. Pays back most of the cost on failure. Explained in one line.
- **As built (ticket 17, game estimates in `src/game/balance.ts`):**
  - **Launch Vehicle failures:** a rocket can fail at any stage. The game uses kinder odds than history (each real failure share cut to 40%): **Juno I works 80%** of the time (real record 3 of 6), **Thor-Able 85%** (real 10 of 16); each vehicle in the planner shows both. The Company's **first Launch always works**, as Explorer 1 did, so the tutorial can't be lost to luck. The Launch show stops half-way through the failed stage ("Stage 2 failed"), the rocket tips over and falls, and the line says the pieces fell into the Atlantic, far from people, which is why launch sites are on the coast. The Mission Report names the stage and the real record; when only the rocket failed it says the design was fine. A Spacecraft that never reached orbit did nothing else, so the report gives the other requirements as what the design would have done.
  - **Test Run:** the estimated success is the share of runs the design got through times the rocket's reliability (so a design change shows without luck in the way), with a line saying both ("The design got through 100% of the runs, and Juno I works 80% of the time").
  - **Launch Insurance:** a tick box in the planner's Costs card. It pays back **80%** of the Rideshare and Shipping if the Mission fails (any reason). Price = payout × chance of failure (from the Test Run's estimate) × **1.3**, at least **3%** of the payout, rounded to $1,000. Under **50%** estimated success nobody will insure it. One line explains it: "Pays back $388K if the Mission fails. Priced from the estimated success (80%): the riskier the flight, the more it costs." Explorer 1 on a later Juno I flight: $101K for a $388K payout; on the first Launch (100%): $12K.

## 9. Test Run, flight and Anomalies

- **Test Run (2D, free, unlimited):** top-down orbit view plus graphs (battery, Data stored, signal). Shows predicted problems and an **estimated success %** (from running about 200 quick simulations).
- **First Test Run (ticket 09):** a **Test Run · free** button in the Launch planner. It needs no Contract, Parts or money, so players can test before buying. The screen shows the Contract's real orbit from above (Explorer 1: 358 × 2,550 km, drawn to scale; the dot speeds up at the low point, as Kepler says, and turns grey but keeps orbiting when the Power dies), a **Battery** graph (energy left each day, with a band for the best and worst runs) and a **Data sent home** graph against the client's goal. A replay runs the Mission's days in 8 seconds with a cursor on both graphs. The **estimated success** comes from 200 runs with the Parts a little off their labels; it shows 0% or 100% only when every run agreed. **Predicted problems** repeat the Mission Report's plain reasons, plus "ran out in N of 200 runs: the margin is thin" when only some runs fail. Same Seed and design always give the same Test Run. Signal (Ground Stations) joins with ticket 18. Earth's shadow is played as the Survive the eclipse Anomaly (ticket 12), not drawn in the Test Run. With Era 1's Parts every design is 0% or 100%; in-between values appear once Parts have thinner margins.
- **Launch and flight (3D):** a 2–4 minute flight: launch, staging, orbit, operations, with Anomalies along the way.
- **First 3D Launch (ticket 10):** pressing Launch settles the flight at once (it is saved), then plays it before the Mission Report, in about 1½ minutes: countdown; liftoff from the pad with smoke and a chase camera; the first stage burns 155 s and drops away; the coast; Juno I's three small-rocket stages (11, 3, then 1 motor, 6 s each) fire over Earth and the spent ones fall behind; "In orbit!"; then the orbit to scale while the Mission's days pass, with Battery and Data bars. A clock shows the real flight time (T+) and then the Mission day. Real times are squeezed (the first stage plays in 22 s; the days in up to 45 s). It ends the way the flight did: the dot goes grey on the day the Power runs out, a Spacecraft too heavy to reach orbit falls back. 1×/2×/4× and **Skip to the report** (also Esc). **Simple view** draws a 2D path and the Test Run's orbit instead; it takes over by itself when a device draws under 20 frames a second, or has no WebGL. The Game date does not move during the show. Facts: `docs/research/launch-vehicles.md`.
- **Anomalies (mini-games):**

| Anomaly | What you do | More likely when |
|---|---|---|
| **Point the antenna** | Aim at a Ground Station before contact is lost | Weak Comms, few Ground Stations |
| **Stuck solar panel** | Free a panel that didn't open | Cheap, low-reliability panels |
| **Dodge the debris** | Time a short engine burn to avoid space junk | Busy orbits, later Eras |
| **Survive the eclipse** | Switch systems off so the battery lasts through Earth's shadow | Small battery, thin Power margin |
| **Stop the tumble** | Steady a spinning Spacecraft (safe mode) | Weak attitude control |

- **Rules:** each type is mandatory the first time; after that it can be skipped and is resolved from your best past result. Anomalies come mostly from **design weaknesses**, not pure luck. Failing one **reduces** the Mission's result; it never destroys it outright.
- **First Anomaly (ticket 11): Point the antenna.** Whether it strikes is settled at Launch, with the flight: always on the Company's first flight (the tutorial's first Anomaly), then by chance, from 90% when the antenna sends no more than the Payload makes down to 15% when it can send three times as much (Explorer 1's Simple Antenna: about 32%). The idea it teaches: a link with room to spare still gets through when the antenna points a little off. It strikes on a day the Spacecraft still has Power, never on a flight that missed orbit. The Launch show pauses on that day: a short card says what went wrong and how to play, then **Start**. The Spacecraft hangs above Earth; its beam points away from a Ground Station that slides across below as Earth turns. Move the mouse (or hold ← →) to turn the antenna, which turns at a limited speed and wobbles a little as the Spacecraft spins; keep the beam on the station for 2 seconds to lock the signal before 15 seconds run out. Locking within 4 seconds scores 100%, then less the longer it took; losing contact scores 0%. The score sets the **Data lost**: up to 30% of the Mission's days (9 of Explorer 1's 30) at 0%, none at 100%. The reward is held back until then and cut by the same share; the Contract still counts as fulfilled. The show carries on with "No contact" over the lost days and the Data bar standing still. The first one has no skip (Skip and Esc jump to it); after that **Skip: use your best (N%)** settles it from the best score played. A game closed mid-Anomaly settles it on the next load (best score, or 50% if none, which doesn't count as played, so a first one comes back next flight). The Mission Report gets an **Anomaly** section: the day, the score, the Data and money lost, and why it happened (the chance, from the antenna's kB a day against the Payload's). Few Ground Stations will raise the chance once they exist (ticket 18). Numbers are game estimates in `balance.ts`.
- **Stuck solar panel and Survive the eclipse (ticket 12):** only a Spacecraft with **Solar Cells** can meet them (one on batteries alone works the same in sunlight and shadow). **One Anomaly per flight at most:** each kind the design can meet rolls its own chance at Launch; if more than one strikes, a kind the Company has never played comes first (so each new one gets met), then the likeliest, the design's weakest spot. The Company's first flight still always meets Point the antenna. Same first-time, skip, closed-game and Data-lost rules as Point the antenna; the reward is cut by the same share.
  - **Stuck solar panel:** chance by the Solar Cells' Mark: **Mk 1 35%, Mk 2 20%, Mk 3 10%** (cheap panels have rougher hinges; better Factories make better Marks). One panel caught on its hinge and only wobbles. The player fires a small thruster (click, Space or the button) to rock the Spacecraft: a push while the panel swings out adds to the swing, one while it swings back takes from it. The panel glows green at the best moment (swinging out through the middle); "With the swing" or "Against the swing" says how each push went. It latches when it swings fully open. 15 seconds; latched by 7 scores 100%, then less; still stuck scores 0%. Pressing as fast as the thruster allows never opens it: the idea it teaches is resonance (pushes in time add up, like on a playground swing). In the show the lost days read "Short of Power: the Payload is off to save the battery".
  - **Survive the eclipse:** chance from the **Power margin**, like the antenna's: 60% when the battery would last no longer than the Mission, down to 8% with 200% to spare or when sunlight alone covers what the Spacecraft uses, plus **12% with a Small Battery**. TIROS-1 with a Large Battery and Mk 1 cells: about 36%. The Spacecraft enters Earth's shadow with its battery low; the Sun is on the right, the shadow stretches left, and the Spacecraft crosses it to sunrise in 12 seconds. Four switches (click, or keys 1–4) with their watts: Computer 2 W (always on), Heaters 3 W, Radio 3 W, Payload 4 W. Everything on, the battery goes flat before sunrise; a line says how long it lasts at this rate. Heaters off for 4 seconds in a row and the battery freezes. The battery starts at 46% (Large Battery) or 34% (Small): with a Large Battery, radio off and Payload on all the way scores 100%; with a Small one the Payload must go off part of the way, unless the player switches the heaters off in short spells. Reaching sunrise scores 40% plus up to 60% for the Payload's time on (8 of 12 seconds is full marks); flat or frozen scores 0%. The game uses its own watts, not the design's (the design sets only the chance and the starting charge). Per-orbit battery check: with the game's battery sizes one pass through the shadow uses well under 1% of any battery, so no design fails on it; the eclipse's risk is the Anomaly instead.
  - The Mission Report says why: the Solar Cells' Mark, or how many days the battery would last against the Mission's days (or that sunlight covered it) and which battery. Numbers are game estimates in `balance.ts` and the two game files.
- **Hackathon:** build 3 (antenna, solar panel, eclipse), then the other 2 if time allows. All 3 built (tickets 11 and 12).

- **Space view (ticket 31):** a Spacecraft that reaches orbit stays there. **Space view** (HUD button, shown once something is in orbit; also **See it in orbit** on the Mission Report) shows Earth with every Spacecraft the Company has in orbit, each on its real orbit (size, shape and tilt; Explorer 1: 358 × 2,550 km, 33.24°), moving as Kepler says, 300× faster than real, with Earth turning at the same pace. Name tags and a list; clicking a Spacecraft (on screen, on its tag or in the list) follows its 3D model round the orbit with Earth beside it, and shows what it is doing: "Sending Data: day N of M", "Silent since day N: the Power ran out. Still in orbit." or "Mission done. Still in orbit.", plus its Launch, orbit and lap time ("One lap takes 115 minutes", worked out from Kepler's third law). Drag to turn, scroll to zoom, **See the whole Earth** to go back, Esc to close. It pauses the Site. Orbits round the Moon and other worlds join with their Contracts (Era 3 on). Facts: `docs/research/orbits.md`.
- **Reference Trajectories** _(ticket 34)_: NASA Mission Viz's GMAT-computed paths. The Launch planner shows the LEO → GEO run face-on for geostationary Contracts, with its two burns ("Path computed with NASA's GMAT"; a sample path, not Syncom 3's own). The Space view has a Reference paths list: the transfer, a long ellipse and the Earth → Moon flight with the Moon on its own path. Dashed orange, apart from the Company's blue orbits; each loops from its start at the Space view's speed. **Orbit maths checked** _(planned, ticket 35)_: a repo test compares the Space view's Kepler maths with a GMAT run.
- **Later in the Space view** _(planned)_: a timeline to drag through a Mission's events (ticket 47); low orbits decay and Spacecraft come down, with end-of-mission plans in Free Play (ticket 46); **Save for GMAT** exports an orbit for NASA's GMAT (ticket 43).

## 10. Mission Report and scoring

- Explains **why** the Mission ended as it did, linked to design choices ("Battery ran out in eclipse because Power margin was 3%. A larger battery or more solar cells would fix this.").
- **First version (ticket 08):** the outcome ("Explorer 1 worked!" / "failed."), then one line per requirement with ✓ or ✗ and the design numbers behind it, failures first: orbit (mass against lift), Payload, Power (battery Wh, watts used, days it lasted), Communications (kB sent against kB made) and Time (end date against deadline). Then the reward, or until when the Contract stays open. It pauses the Site while open. Every report is saved for the History Archive later.
- **Built:** lines grouped under the four Segments (ticket 32): reaching orbit is the Launch segment, unless the Spacecraft lacked a Main Engine (Space); Payload and Power are Space; Data getting home is Ground; the deadline is User. The Segment with a failed line comes first. A flown Mission adds who got the Data and which stations picked it up.
- **Planned:** a **Like the real one** ending: the player's Spacecraft beside the real one (mass, power source, how long it worked), or a real mission of the same kind in Free Play (ticket 36, from the Webb game); sourced lines from CubeSat 101 where they fit, e.g. "double up on the burn wire" after Stuck solar panel (ticket 38); whether a Ground Test was done (ticket 40).
- Rewards: money, Reputation, Research Points, a **Mission Patch**, and Real History cards.
- **Weekly Challenge score:** the objective must be met to score at all. Then **Reliability 40%**, **Science value 30%**, **Money left 20%**, **Mass margin 10%**. Best attempt counts; speed does not. Everyone who completes it gets the same reward; the top 3 get a badge.

## 11. Company identity

- **Company name:** player's choice, 2–24 characters, with a "don't use your real full name" note and a bad-word filter (also catches spelled-out and leetspeak words; real names like Cassini or Uranus pass).
- **Logo:** an in-game **logo maker** (shapes, colours, space icons). Players may also **upload a drawing**, resized to 128×128 (upload cap about 200 KB), with a "don't upload photos of people" warning and a report/hide button for viewers.
- The logo appears on the Company's rockets, flag and buildings, and on every **Mission Patch** (collected in a patch gallery).
- **As built (ticket 19):** choose a circle, shield or hexagon, a star, planet or rocket, and two colours. Uploads accept PNG, JPEG and WebP up to 200 KB; the drawing fits inside 128×128 without stretching, with transparent space around it. Only the flattened PNG is saved. Set the logo at setup, or click it beside the Company name to edit it (the Site pauses; Save applies it, Cancel or Esc keeps the old one). The HQ sign and flag, all four Launch Vehicles, and both the Mission Report and History Archive use the current logo, including on older patches. Saves from before logos get the original preset. Report/hide controls wait for visiting other Companies' Sites.
- **Default logo:** an original preset from the logo maker. Not the NASA Space Apps logo: it's an official emblem that must not be altered or imply endorsement, so it can't become a player's company logo. The official logo may appear unaltered on the splash and credits ("Made for NASA Space Apps 2026"), once organisers confirm.

## 12. Online (Free Play)

- **Anonymous accounts:** a nickname (NASA-themed generator with 🎲 re-roll, or the player's own, filtered) plus a **secret recovery code** to continue on another computer. No email, no password, no personal data.
- **Hackathon:** leaderboards (Company value, Missions completed, Reputation, Research), **Weekly Challenge**, shareable Seeds, cloud saves.
- **Later:** visiting other Companies' Sites (with their logo), preset messages ("Can you send 500 titanium?"), sending resources, cooperative missions. **No chat.**
- **Backend:** Supabase's hosted free tier (ADR-0001). We don't run a server of our own.

Ticket 22 adds **Online** to the main menu and Free Play pause menu, using the existing panels. Create a nickname or recover an account before starting a Company. The generated secret code is the account's key; keep a copy. No email, password or personal identity is required (ADR-0004).

**Save to cloud** stores one Free Play Company per account and updates its leaderboard scores. Saving and loading are manual. **Load cloud Company** asks before replacing this browser's Company; network failures keep the local save. Simultaneous writes are rejected. Campaign and Demo Mode stay local, with the existing separate demo slot. The game's save format is now v19 (bought Plots, ticket 30); the backend must be redeployed whenever the save format changes. Ticket 33's tested designs are an optional v19 field, so they needed no redeploy.

The four leaderboards show the top 20 saved Companies by one measure at a time. **Company value** is money + Raw Materials at making value + Parts at making cost + buildings at their build price and completed Upgrade cost; the HQ counts at its base value because its level marks the Era. Part Marks do not change their making value; Spacecraft in flight and pending Upgrades are not counted. **Missions completed** counts fulfilled Contracts. **Reputation** adds 10 per successful Mission Report and subtracts 5 per failed one, with a floor of zero. Missed-deadline penalties remain a later fix. **Research** counts all Research Points earned, including those spent. These are game estimates. Scores are calculated on the backend from player saves; those saves remain editable, so this is a casual leaderboard rather than an authoritative competition.

**Weekly Challenge (ticket 23):** available in Online only with a Free Play Company. A week starts Monday at 00:00 UTC, using the backend clock. Every attempt gets a separate design state: $600,000, JPL Shipping, Falcon 9 from Cape Canaveral, level 3 Assembly Hall, Mk 1 Parts and no personal stock, Research or Ground Stations. The common catalogue includes both difficulty sets, except the Main Engine and Transponder; objectives alternate between generated radiation surveys and weather Missions. Parts cost their normal Market prices; Rideshare and Shipping also come out of the fixed budget. The existing Mission Designer, resource bars and Test Run are reused. Submission flies the design immediately on one fixed clear day after the largest Bus could be assembled and shipped. This is a design contest: no Anomaly mini-game; the ordinary first-Launch protection from rocket failure applies. Neither attempts nor rewards change the player's Company or cloud save.

The backend accepts only the week and selected slots, recreates the attempt and checks the objective. A failed objective scores zero. Otherwise each component is a fraction from 0 to 1: **Reliability** is the Test Run's estimated success including Falcon 9; **Science** is the Data the labelled design could send over twice the required Mission length, limited by Power and Communications and capped at twice the required Data; **Money left** is the remaining budget divided by $600,000; **Mass margin** is unused Launch Vehicle lift divided by its lift limit. The score out of 100 is `40 × Reliability + 30 × Science + 20 × Money left + 10 × Mass margin`, rounded to two decimal places. These are game scoring values, not real engineering measures.

One best score is stored per account per week, including under simultaneous submissions. The top 20 are shown. All finishers earn the same collectible weekly Mission Patch, kept with the Online account. The final top 3 earn podium badges after the week closes; current standings are marked provisional. Exact ties use a stable account ID rather than time. Recovery restores the rewards as well as the account. This remains a casual competition without rate limiting or a broader anti-cheat system.

**Shared Seeds:** Copy in the pause menu includes the Seed, coordinates and start/climate kind in a `LEAP1` code. Paste it into Company setup to reproduce the same Site, including old Sites with the legacy climate. Raw Seeds still work with the chosen location. **New Company from a Seed** opens setup even when this browser has a Company; starting asks before replacing that Company. Changing to Free Play preserves a shared legacy Site's climate. Share codes contain no Company save or recovery secret.

## 13. Look, sound and text

- **Look:** cozy, colourful low-poly world under a daytime sky, with sun shadows and soft shading in corners and at the foot of cliffs. Clean, calm NASA-style interface (dark panels, crisp charts). Not overwhelming.
- **Camera:** opens at the classic isometric angle over the Site. Left-drag or WASD/arrows move (up to 32 tiles past the Site's edge, so you can look at the land next door), right-drag or Q/E and R/F turn and tilt (down to the horizon, up to nearly top-down), the wheel or +/− zooms. **H** (or the ⌂ button) glides back to the isometric view of the whole Site, every bought Plot included; zooming out reaches that far too. The camera stays above the hills. A narrow-lens perspective camera, so the horizon can be seen (ADR-0003).
- **Buildings:** detailed low-poly models, three tiles wide, that read at a glance even from the whole-Site view: each has a recognisable shape, small details (doors, windows, lamps), something in the colour of what it makes, and a moving part while it works (e.g. a Mine's winding wheel turns while the Site runs).
- **Text:** short and plain. Unusual terms get a hint the first time ("Launch Vehicle (the rocket)"). Every real thing gets **Learn more →** to an official NASA page or Wikipedia. No logos of NASA, SpaceX or any real organisation. Real mission names and facts only, with sources.
- **Sound:** sound effects generated in code where possible, otherwise free licensed packs. Music: free licensed tracks first, then AI-generated (Lyria 3.5) for gaps. All credited (see `docs/audio/`).
- **Music mood:** hopeful, cozy, exciting. Tracks: main menu, Site (calm), Mission Designer (focused), Launch (exciting), flight, Anomaly (tense), success and failure stingers. Era-flavoured music is Later.
- **Sound as built (ticket 25):** a shared Web Audio mixer loads the team's ten tracks by screen after the first gesture. Site A/B alternate; the five looping cues use 3-second overlaps at the approved cuts. Menu, Launch, history and report stingers play once. Short code-generated effects mark UI clicks, placement, countdown, liftoff, alarms and rewards. The main and pause menus offer separate music/effects volumes (0 mutes) and the audio credits. Preferences belong to the browser, outside Company saves. Hidden tabs suspend audio; unsupported or missing audio leaves the game playable. Files are normalized to −16 LUFS with peaks below −1 dBTP and encoded at 128 kbps; sources and measurements are in `docs/audio/`.
- **Title, menus and loading:** opening the game shows the title (LEAP logo, subtitle, acronym line), then the main menu. Full-screen menus use a **live 3D scene rendered by the game** (e.g. your Site at sunset, a slow orbit over Earth), not a picture. Loading screens show a rendered shot of what's loading plus **one short tip**: a real, sourced fact linked to the current Era or Mission (same facts as the History Archive) or a gameplay tip. Loading never waits longer just so a tip can be read.
- **Look as built (ticket 26):** the original LEAP title leads to the main menu over the saved Company's live Site (the Era 2 demo Site without a save). Menu model animation respects reduced motion and never advances the Company. Starting play shows a rendered Site shot and one gameplay tip until ready, without a reading-time delay. Existing low-poly models and Company logos are kept; the high-climb Launch ground curves with Earth. Reading links reuse the History sources and add rockets, Launch Sites, orbits, NASA POWER and Natural Earth beside their facts; game estimates are labelled. Shared panels keep the dark/blue palette with clearer text and keyboard focus, scrolling dialogs and a narrow-screen Mission Designer.
- **Images:** real things get **real NASA photos with credit** (check each image's credit: some on NASA sites belong to partners). **Era transitions** get one illustration each (AI-generated is fine), always clearly an illustration in the game's colours, never a fake photo. Images are compressed and loaded only when needed.
- **Era illustrations as built (ticket 29):** every Era has a card: Era 1's opens a new Campaign (before the tutorial's first step; older saves skip it), Era 2's follows the HQ Upgrade, Free Play's the move to 2026. A new Free Play Company has none. The card's 16:9 illustration (`public/eras/era-<N>.webp`, loaded when the card opens) is captioned "Illustration (AI-generated)" and credited in Credits; until the team adds a file the card shows text only. Style guide, prompts and the compression script: `docs/art/README.md`.
- **Name on screen:** the title screen shows a big **LEAP** logo, the subtitle "A Space Mission Design Game" underneath, and one small line, *Launch · Engineer · Advance · Pioneer* (the four words may animate out of the four letters once). Everywhere else the game is just "LEAP". The Apollo 11 Real History card mentions *"one giant leap"* once, as the hidden source of the name.
- **Language:** English. All text kept in one file so translations can be added later.

## 14. NASA data in the game

The challenge expects NASA data to be used visibly; the judging guide's Relevance criterion asks that it be "a core component of the proposed solution rather than a superficial addition" (`docs/challenge.md`). Data already in the game, and earlier planned slots:

| Data | Used for |
|---|---|
| NASA POWER (climate) | Site sunshine, wind, rain, temperature; launch weather. **In the game (ticket 16):** 2025 yearly climate for every start, daily 2025 weather at the Launch Sites |
| NASA GIBS (satellite imagery) | Real satellite photos of your region after Earth-imaging Missions (Optional) |
| JPL Horizons | Moon (and later Mars) positions and Launch Windows (Optional) |
| NASA DONKI (space weather) | Real solar storms as flight events (Optional) |
| NASA 3D Resources | Models of real spacecraft for Real History cards |
| NASA Small Spacecraft State-of-the-Art report | Real Part numbers |
| Natural Earth (public domain, not NASA) | Real continents on the Mission Designer's globe |
| NASA Blue Marble: Next Generation, via NASA GIBS | **In the game (ticket 27):** the colours of the land on the globe in the Mission Designer, Launch and Space view |

**Official challenge Resources (published 13 Nov).** All planned, none built yet. Each one used gets an entry in Real data and Credits when its ticket ships (ticket 27). Contents and numbers: [`docs/research/official-resources.md`](research/official-resources.md).

| Resource | Planned use |
|---|---|
| Design and Develop Science Missions (NASA slides, 2025) | Four Segments in the Launch planner and Mission Report (ticket 32); the tutorial under NASA's six steps (39); "begin with the end in mind" for Contracts (42) |
| GMAT | Its trajectories via Mission Viz (34); LEAP's orbit maths tested against a GMAT run (35); Save for GMAT (43, Later) |
| Concept Maturity Levels (JPL) | Maturity strip and Design Review with JPL's 35% margins and 80% rule (33) |
| Mission Design Lab (Goddard) | Team Mode roles from its disciplines (41); comparing designs (45); end of mission (46). Reading source, not data |
| NASA Mission Viz | GMAT-computed Reference Trajectories: Syncom 3's transfer, a long ellipse, Earth → Moon (34); draggable timeline (47) |
| Webb game "Build It Yourself: Satellite!" | "Like the real one" at the end of the Mission Report (36); science-first Contracts (42) |
| CubeSat 101 | Sourced loading tips and report lines (38); Ground Tests (40); Rideshare dates (44); end of mission (46); CubeSat sizes (48) |
| Visualize a Space Mission Using VR (2023 challenge) | Draggable timeline (47). Reading source |
| CSA Digital Games and Activities | Alouette 1 side story card (37); the RADARSAT game's "farmer, captain, first responder" for science-first Contracts (42) |

**Where the player sees it (ticket 27):** the main and pause menus have **Real data → Where LEAP uses real data**: each dataset with its link, what it does in LEAP and its credit. The globe says "Land colours: NASA Blue Marble"; climate and weather lines name NASA POWER; Real History cards credit their photos. Prices, Part numbers and Reliability stay labelled as game estimates.

## 15. Screens

Main menu · New game (mode, Company, logo, globe, Seed) · Site view (money, Raw Materials, date, speed) · Build menu · Contracts board · Mission Designer · Launch planner (vehicle, site, weather, window, insurance) · Test Run · Flight · Mission Report · Space view · Research · History Archive · Patch gallery · Leaderboards and Weekly Challenge · Pause menu (Esc: Seed, Settings) · Credits

**Credits (ticket 28):** a main-menu view, closed with Back or Esc. It shows the team (for now the placeholder "Team Artemis-IV"; the team adds its names before submission), that code and art were written with AI coding agents and reviewed by the team, the challenge link and a not-made-or-endorsed-by-NASA line. Then every real dataset (the same list as Real data), each Real History photo credit, every reading source (missions, rockets, Launch Sites, science), music and sound, and the software with its licence. No official logo until organisers confirm (§11).

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

**Planned (ticket 39):** the eight steps sit under NASA's six step names (Identify Need & Goals → Define Concept → Define Requirements → Design → Build & Verify → Implement; slide 10 of Design and Develop Science Missions). **Planned (ticket 38):** loading tips from CubeSat 101's "Free advice", each with its page.

**As built (ticket 13):** a small guide card under the top bar ("Step N of 8", one line, **Skip**) and a glow on the button to press next. Steps: accept Explorer 1 → build a Mine → build a Metal Works → fill every slot in the Mission Designer → open a free Test Run → ship → wait for the truck (try 4×) → Launch. The guide reads the game itself, so it survives a reload and never blocks: buying Parts instead of building moves it on. It moves to the bottom of the screen inside the Mission Designer, hides during the Launch show and dialogs, and ends with the first Mission Report. Skip closes it for good. The Company name, place (Historic start by default) and Site come first (New game).
- **Real History cards:** accepting a Milestone shows its "before" card (the real story); a successful Mission shows the "after" card once its Mission Report is closed. Each card has a real NASA photo with a credit line, a short true story and **Learn more →** to an official NASA page. Both pause the Site. Explorer 1's: "The race to space" (Sputnik, Vanguard TV3, 84 days) and "The Van Allen belts". A Milestone can also have **side story** cards ("Also in 1958") shown after its "after" card: Vanguard 1 after Explorer 1. _Planned (ticket 37):_ Alouette 1, Canada's first satellite, "Also in 1962" after Telstar 1 (CSA facts). TIROS-1's cards use a NASA photo of a Thor-Able launch (no TIROS-1 photo was found in NASA's library) and a NASA satellite image of a hurricane. Facts and photo sources: `docs/research/milestones.md`.
- **Mission Patch:** every successful Mission earns one, drawn by the game: Company name round the top, Mission name round the bottom, Earth, the Spacecraft on its orbit, the year and the Company logo in the centre. The Mission Report shows it ("Your first Mission Patch!").
- **History Archive** (HUD button, shown once it holds something): the patch gallery and every unlocked Real History card; click a card to read it again.

## 17. Design principles we follow

- Teach one idea at a time, hands-on, then build on it.
- Visible goals before mechanics. Early failure is cheap and reversible.
- Every choice has a visible consequence. Explain **why**, not just right or wrong.
- Short text. Learn more is optional.
- Balanced: never tedious, never bankrupting.

Sources for these principles: [Wayline: designing tutorials and onboarding](https://www.wayline.io/blog/designing-effective-game-tutorials-and-onboarding) · [GDevelop: text-based tutorials don't work](https://gdevelop.io/blog/improve-game-tutorials) · [Acagamic: onboarding techniques](https://acagamic.com/newsletter/2023/04/04/dont-spook-the-newbies-unveiling-5-proven-game-onboarding-techniques/) · [Frontiers in Education: onboarding in educational games](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.980881/epub)
