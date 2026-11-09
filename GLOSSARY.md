# LEAP

A tycoon game where the player runs a space company, then designs, launches and flies missions that teach real space-mission trade-offs.

## Language

### Company and world

**Company**:
The player's fictional space company, with a name and logo the player chooses.
_Avoid_: player base, studio

**Site**:
A piece of land the Company owns and builds on, shown as its own map.
_Avoid_: base, landing spot, colony

**Home Site**:
The Company's first Site, placed by seed or by the player's choice.
_Avoid_: starting base

**Spaceport Site**:
A Site with launch pads, from which the Company launches its own rockets.
_Avoid_: launch base

**Plot**:
A Site-sized piece of land next to a Site that the Company can buy to make the Site bigger.
_Avoid_: chunk, parcel, lot

**Seed**:
A code that generates the same Site map every time it is used.
_Avoid_: map code

**Game date**:
The date in the game world. It moves forward while the Site runs, faster at 2× and 4×, and stops when paused.
_Avoid_: time (Time is a Mission resource), clock, turn

**Era**:
A period of real space history (e.g. 1958–1960) that sets which technology, rockets and contracts exist.
_Avoid_: age, level, tier

### Economy

**Raw Material**:
A resource dug up by a Mine, such as aluminium or silicon.
_Avoid_: ore, resource (alone)

**Deposit**:
A patch of a Site's land that holds one Raw Material; a Mine must sit on one.
_Avoid_: vein, node, resource tile

**Part**:
A spacecraft component made by a Factory from Raw Materials, or bought on the Market.
_Avoid_: item, module (alone)

**Mine**:
A building that extracts one Raw Material from a deposit on a Site.

**Factory**:
A building that turns Raw Materials into Parts.
_Avoid_: workshop, plant (alone)

**Market**:
Where Parts and Raw Materials are bought and sold, at worse prices than making them yourself.
_Avoid_: shop, store

**Warehouse**:
A building that stores Raw Materials and Parts; storage is counted by mass.
_Avoid_: depot, storehouse, inventory

**Shipping**:
Moving Parts or a finished Spacecraft between Sites or to a launch site, costing money and days.
_Avoid_: transport, logistics

**Upgrade**:
Raising a building's level to make it produce more or better output.

**HQ**:
The Company's main building; upgrading it moves the Company into the next Era once that Era's Milestones are done.
_Avoid_: town hall, headquarters building

### Missions

**Contract**:
A request from a client with an objective, requirements, a reward and a deadline.
_Avoid_: quest, job, order

**Mission**:
The Company's attempt to fulfil a Contract or a science goal, from design to Mission Report.
_Avoid_: flight, run

**Milestone**:
A Campaign Contract based on a real event in space history, such as Explorer 1.
_Avoid_: story mission, chapter

**Spacecraft**:
What the player designs and sends to space: a satellite, probe, lander or crew capsule.
_Avoid_: rocket, ship, satellite (as the general term)

**Launch Vehicle**:
The rocket that carries a Spacecraft to space.
_Avoid_: rocket (alone), booster (alone)

**Stage**:
One section of a Launch Vehicle that burns, then drops away so the rest flies on lighter.

**Bus**:
The Spacecraft's main body; its size sets how much mass of Parts it can carry.
_Avoid_: chassis, frame, hull

**Mission Designer**:
The screen where the player builds a Spacecraft by picking one option for each slot.
_Avoid_: editor, builder, workshop

**Slot**:
A place on the Spacecraft for one system (Bus, Power, Battery, Comms, Pointing, Payload); each slot holds one option.
_Avoid_: socket, hardpoint

**Pointing**:
How the Spacecraft keeps steady and faces the right way, e.g. by spinning like Explorer 1.
_Avoid_: attitude control (in player text), orientation

**Payload**:
The instruments a Spacecraft carries to do its job.
_Avoid_: cargo (for instruments)

**Crew Module**:
A Part that carries astronauts and provides life support.
_Avoid_: life support system (as a separate part)

**Rideshare**:
Renting space on another organisation's Launch Vehicle, priced by mass.
_Avoid_: rental, booking

**Launch Site**:
The place a Launch Vehicle lifts off from: a real spaceport the Company ships its Spacecraft to, such as Cape Canaveral, or later its own Spaceport Site.
_Avoid_: launch base, pad (alone)

**Launch Window**:
A time period when a launch to a destination is possible and sensible.

**Scrub**:
A launch cancelled at the last moment, usually because of weather.
_Avoid_: delay, abort

**Test Run**:
A free, simplified 2D simulation of a Mission before the real Launch.
_Avoid_: simulation (alone), practice

**Estimated success**:
The share of a Test Run's quick runs in which the Mission met its Contract, shown as a percentage.
_Avoid_: success rate, odds, probability

**Launch**:
The real attempt to fly a Mission, with costs and risks.

**Anomaly**:
A problem during a Mission, played as a short mini-game.
_Avoid_: event, glitch, bug

**Mission Report**:
The result of a Mission, explaining why it succeeded or failed.
_Avoid_: results screen, summary

**Space view**:
A 3D view of Earth with every Spacecraft the Company has put in orbit, each moving along its real orbit. Clicking one follows it.
_Avoid_: map, radar, tracker (that is the Mission tracker)

**Launch Insurance**:
A payment before Launch that returns most of the Mission's cost if it fails.

**Ground Station**:
A building with an antenna that talks to Spacecraft; more and bigger ones improve Communications.
_Avoid_: radar, dish (alone)

**Mission Patch**:
A badge made for each Mission, collected in the patch gallery.

### Progress

**Reputation**:
How much clients trust the Company; higher Reputation unlocks better Contracts.

**Research Points**:
Points earned from science Missions, spent on Upgrades within the current Era.
_Avoid_: XP, science (as currency)

**Real History card**:
A short, true story about a real mission, with a link to learn more.
_Avoid_: lore, fun fact

### The six mission resources (from the challenge)

**Mass**:
Total mass of the Spacecraft.

**Power**:
Energy available to run the Spacecraft's systems and Payload.

**Budget**:
Money available to build and fly the Mission.

**Data**:
Information the Payload produces.

**Communications**:
How much Data the Spacecraft can send to Ground Stations.

**Time**:
How long the Mission takes to build and how long it operates.

### Modes

**Campaign**:
The story mode from 1958 to Artemis IV, built on real Milestones.
_Avoid_: story mode, career

**Free Play**:
Open-ended play with generated Contracts; where online features live.
_Avoid_: sandbox (that is a separate mode)

**Weekly Challenge**:
A Free Play Contract that everyone plays with the same budget and Parts list, ranked on a leaderboard.

**Demo Mode**:
Ready-made saves, one per Era, so judges can jump into any stage of the game.
