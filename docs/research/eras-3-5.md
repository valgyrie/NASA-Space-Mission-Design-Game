# Eras 3–5: facts and proposed game numbers (tickets 50–52)

Facts for the Campaign from Apollo 11 (1969) to Artemis IV (2028), with sources, and proposed game numbers for the coding agents. Researched 15 Nov 2026. NASA and agency pages first; Wikipedia only where nothing else was reachable (said so in place). NSSDCA pages reset the connection from this environment, so they are cited only where a search quoted them.

**How to read the game numbers.** Every number in a "Game proposal" table is a **game estimate** in the scale of `src/game/balance.ts` (Era 1–2 Parts weigh 1–24 kg; a TIROS-1 design weighs ~20 kg against the real 122.5 kg), with the real figure beside it for reference. Launch Vehicle lift stays real, as it does for Thor-Able, Delta D and Falcon 9 today, so from Era 3 on, cost, Launch Site, orbit, Bus size and Power decide designs more than mass (see the open question at the end).

---

## Era 3 (1969–1972): the Moon and the land from above

### Apollo 11 and its science package (EASEP)

| Fact | Value | Source |
|---|---|---|
| Launch | 16 Jul 1969, 9:32 a.m. EDT, Saturn V AS-506, Pad 39A, Kennedy | [^a11nasa] |
| Landing | 20 Jul 1969, about 102 h 45 min into the flight (20:17:39 UTC); Sea of Tranquility, Site 2 | [^a11nasa] [^a11alsj] |
| Tranquility Base | 0.67409° N, 23.47298° E (NASA's ALSJ, from NSSDC and LROC); the mission page gives 0°41′15″ N, 23°26′ E | [^a11alsj] [^a11nasa] |
| On the surface | 21 h 36 min; one moonwalk of 2 h 31 min | [^a11nasa] [^a11alsj] |
| EASEP | Early Apollo Scientific Experiments Package, flown on Apollo 11 only, solar powered, "an abbreviated set of experiments"; deployed by Aldrin | [^sp4029] [^a11nasa] |
| Two experiments | Passive Seismic Experiment Package (PSEP) and Laser Ranging Retroreflector (LRRR); together **77 kg**, 0.34 m³; the seismic package alone **45 kg** | [^sp4205] |
| Seismometer power | Its own solar panels, **34–36 W**; it worked only in the lunar day and switched to standby before nightfall | [^sp4205] [^nasaseis] |
| Heaters | Two radioisotope heaters, **15 W** each (34 g of plutonium-238 each), kept it at no colder than −54 °C through the **340-hour** lunar night; NASA calls this "the first major use of nuclear energy in a NASA manned mission" | [^sp4205] [^nasaseis] |
| What it found | Moonquakes and the Moon's inner structure; about 100–200 meteorite impacts | [^nasaseis] |
| Lunar night | Solar power lasted until a few hours before local sunset on **3 Aug 1969**; ground control switched it back on at sunrise on **19 Aug** | search summary of SP-4205 _(verify against the SP-4205 text)_ |
| How long it worked | Data for "just three weeks"; it stopped answering commands at 04:00 UT on **25 Aug 1969**, "probably" from overheating in the midday Sun (Wikipedia says 27 Aug) | [^nasaseis] |
| Laser reflector | **100** fused-silica corner cubes, each 3.8 cm across, in a 46 cm square aluminium panel; needs no power. Laser pulses timed from Earth give the Earth–Moon distance to about 3 cm | [^llr] [^sp4029] |
| Still in use | Laser ranging to the Apollo reflectors continues; the ILRS distributes data through April 2026 | [^ilrs] |
| The Moon moves away | About **3.8 cm a year** (NASA); laser ranging 1970–2015 gives 38.30 ± 0.09 mm/yr | [^llr] [^ilrs] |
| Who built it | Bendix supplied EASEP (approved 5 Nov 1966); principal investigators Gary Latham (seismometer, Lamont) and Carroll Alley (reflector, University of Maryland). The Smithsonian lists Teledyne as maker of its seismometer model _(verify which firm built which part)_ | [^sp4205] search results |
| Lunar day and night | About two Earth weeks each: NASA gives a **340-hour** night (≈14 days); a full day–night cycle is one synodic month, ≈29.5 days | [^nasaseis] |

**Game notes**
- "21 days" in the ticket is right in spirit: NASA says three weeks of data, spread over two lunar days (21 Jul–3 Aug, then 19–25 Aug).
- The real package slept through the night on solar power and heaters. The battery was not what kept it going.
- On the surface there is nothing to spin: Pointing is not needed (ticket 50 already says so).

### Landsat 1 (ERTS-1)

| Fact | Value | Source |
|---|---|---|
| Launch | **23 Jul 1972**, as the Earth Resources Technology Satellite (ERTS-1); renamed Landsat 1 in 1975 | [^ls1nasa] [^landsat] |
| Rocket and site | Delta 900 from Vandenberg SLC-2W (its first flight) | [^gunterdelta] |
| Orbit | **917 km**, **99.2°**, Sun-synchronous, near-polar; 103 min a lap, about 14 laps a day; **18-day** repeat cycle; crosses the equator at about **9:42 a.m.** local time (descending) | [^ls1nasa] |
| Instruments | **Multispectral Scanner (MSS)**, four bands: green 0.5–0.6 µm, red 0.6–0.7, near-infrared 0.7–0.8 and 0.8–1.1; 80 m detail; scenes 185 km wide. Built by **Hughes** | [^ls1nasa] |
| The cameras that failed | Three **Return Beam Vidicon** TV cameras (RCA). A power surge on 6 Aug 1972 cost attitude control; the RBV was switched off 15 days after launch (a faulty inductor in a power switch) | [^ls1nasa] |
| Pointing | Three-axis: horizon scanners, Sun sensors, **four reaction wheels** and freon gas jets, held to **±0.7°** on all three axes | [^ls1nasa] |
| Spacecraft | A modified **Nimbus** weather satellite (NASA: Nimbus 4); prime contractor General Electric | [^ls1nasa] [^landsat] |
| Mass | About **953 kg** (2,100 lb) in most sources; eoPortal and Gunter's give 816 kg; NSSDCA lists 1,800 kg _(verify; the game shows 953 kg)_ | search results [^landsat] |
| Power | Two solar "paddles", each about 4 m long; ~1,000 W at peak, ~515 W on average (eoPortal) _(verify against a NASA source)_ | search results |
| Data storage | Two wide-band video tape recorders, 30 min each | NSSDCA (fetched once) |
| Design life and real life | Designed for **1 year**; switched off **6 Jan 1978** (5½ years), when its orbit's drift left it in near-constant sunlight and it overheated | [^ls1nasa] |
| Images | NASA: over 300,000 scenes (overview) or over 175,000 (mission results); USGS archive holds 174,955 MSS scenes; 147 scenes a day | [^ls1nasa] |

### Sun-synchronous orbit and Vandenberg

- A Sun-synchronous orbit runs pole to pole and crosses the equator at the same local solar time on every pass, so sunlight falls at the same angle and images from different years compare. NASA's low satellites trim their tilt every year or two to stay that way.[^orbcat]
- Why about 98–99°: Earth's bulge makes a tilted orbit's plane turn slowly; tilted just past the pole (retrograde), it turns eastward about 1° a day, keeping pace with the Sun. NASA's example: 96° at a low altitude.[^orbcat] The tilt needed rises with height. Worked out from Earth's oblateness (J2 = 1.08263 × 10⁻³, a textbook constant): **98.2° at 705 km, 98.6° at 800 km, 99.0° at 900 km, 99.1° at 917 km**, against Landsat 1's real 99.2°. _(Calculation by the research agent; check with GMAT before showing numbers on screen.)_
- Vandenberg: NASA's preferred site for polar orbits; the coast juts into the Pacific, "allowing rockets to launch to the south without flying over populated areas".[^vafb] Polar launches from Florida would fly over Florida's towns.
- Launch Sites: Kennedy **LC-39A** 28.608° N, 80.604° W and **LC-39B** 28.627° N, 80.621° W (NASA's Apollo table gives 28.608422° N, 80.604133° W and 28.627306° N, 80.620869° W, geodetic);[^sp4029bg] Vandenberg **SLC-2W** 34.756° N, 120.622° W and Cape Canaveral **SLC-41** 28.583° N, 80.583° W (Wikipedia, rounded) _(verify these two against a NASA or Space Force source)_.

### Launch Vehicles of Era 3

| Fact | Saturn V | Delta 900 | Source |
|---|---|---|---|
| Height | **363 ft (110.6 m)** with Apollo spacecraft and escape tower | ~32 m _(verify; no source found)_ | [^satpk] |
| Stages | S-IC (5 F-1), 138 ft; S-II (5 J-2), 81.5 ft; S-IVB (1 J-2), 58.4 ft; plus an Instrument Unit | Extended Long Tank Thor with **9 Castor II** solid boosters; Delta second stage (AJ10-118F); no third stage | [^satpk] [^gunterdelta] |
| Burn times | Apollo 11: S-IC outboard cutoff at **161.6 s**; S-II cutoff 9 min 08 s (~384 s burn); S-IVB first burn to 11 min 39 s (~147 s); translunar injection **346.8 s** at 2 h 44 min | not found _(verify)_ | [^a11sum] |
| Lift | NASA press kit: **125 tons** to low Earth orbit or **48 tons** to the Moon; another Apollo-era NASA paper: 270,000 lb (122 t) to Earth orbit, 100,000 lb (45 t) to translunar injection | Sun-synchronous **816 kg** (Gunter's). An Air Force Space and Missile Museum fact sheet (quoted by a search; the site did not load): 3,700 lb (1,680 kg) to low orbit (Delta 900), 1,400 lb (635 kg) to transfer orbit (Delta 904) _(verify)_ | [^satpk] [^gunterdelta] search results |
| Flights | 13, 1967–1973, "every launch was successful" (NASA); the last launched Skylab from Pad 39A on 14 May 1973[^satv13][^skylab] | **2**, both from Vandenberg SLC-2W: ERTS-1 (23 Jul 1972) and Nimbus 5 (11 Dec 1972); no failure listed | [^gunterdelta] |

- Era 2's rockets had stopped long before 1969: Thor-Delta last flew 18 Sep 1962 and Delta D 6 Apr 1965 ([launch-vehicles.md](launch-vehicles.md); Gunter's agrees on Delta D).[^gunterdelta] Other Deltas (C, E, L, M, N) flew 1963–1971 but are not in the game.
- Saturn V record: Apollo 6 (1968) reached orbit but two second-stage engines shut down early _(verify; from memory, no source fetched)_.

### Parts history (one line each)

- **Fold-out solar panels:** Explorer 6 (7 Aug 1959), the "Paddlewheel Satellite", was the first spacecraft with solar cell paddles; only three of its four paddles fully opened.[^exp6] Real deployable arrays give about 40–140 W/kg against 50–75 W/kg for body-mounted ones ([spacecraft-parts.md](spacecraft-parts.md)).
- **Reaction wheels and three-axis pointing:** Landsat 1 held its aim to ±0.7° on three axes with four reaction wheels, a design taken from the Nimbus weather satellites.[^ls1nasa]
- **Dish (high-gain) antenna:** Mariner 4 (1964–65) carried a hinged dish about 117 cm across that was pointed at Earth; from Mars it sent 8⅓ bits a second, more than eight hours a picture.[^mariner4]

### Game proposal: Era 3

**Milestone Contracts** (game estimates; real basis beside them)

| Milestone | Client | Destination | Payload | Days of Data | Reward | Deadline | Launch |
|---|---|---|---|---|---|---|---|
| Apollo 11 science package | NASA | Moon's surface, Tranquility Base (0.67° N, 23.47° E) | Science Package | **21** (NASA: three weeks of data) | **$12M** | 365 days | Saturn V, whole launch paid by NASA (cost $0); ships to Kennedy |
| Landsat 1 | NASA | Sun-synchronous, **917 km, 99.2°**, crossing at 9:42 a.m. | Multispectral Scanner | **365** (its design life: 1 year) | **$15M** | 600 days | Delta 900 Rideshare from Vandenberg |

- Landsat's 365 days takes about 12 minutes at 1× (2 s a game day). If that is too long, the alternative is **180 days**: ten of its real 18-day cycles (the number ten is a game choice).
- Delta 900 first flew on 23 Jul 1972, so in a game started 1 Jan 1969 it should show "Opens in 1972", as ticket 51 does for Atlas V.

**Sunlight on the Moon's surface** (for Power): Apollo 11 landed in the lunar morning; sunset came on 3 Aug, about 14 days later, then about 14 days of night. Proposal: `SUNLIT_SHARE.moonSurface = 0.67` for a 21-day Mission starting at sunrise (14 of 21 days), and a **lunar night** check: the battery must carry the Spacecraft through its longest dark stretch (here 7 days), or it sleeps, as the real seismometer did. Which rule the game uses is an open question (ticket 50).

**New Parts** (game estimates; Mk 1)

| Part | Slot | Mass | Numbers | Days to make | Factory | Real figure for reference |
|---|---|---|---|---|---|---|
| Science Package | Payload | 12 kg | 2 W, 30 kB/day | 6 | Electronics Lab | EASEP 77 kg (seismometer 45 kg), 34–36 W from its own panels |
| Multispectral Scanner | Payload | 10 kg | 4 W, 150 kB/day | 6 | Electronics Lab | MSS: four bands, 80 m detail (Hughes); mass not found _(verify)_ |
| Reaction Wheels | Pointing | 6 kg | 3 W; steady aim, no spin | 5 | Metal Works | Landsat 1: four wheels, ±0.7°; small modern wheels 0.06–7.5 kg each |
| Dish Antenna | Comms | 3 kg | 2 W, sends 400 kB/day; must point at Earth (Point the antenna more likely without Reaction Wheels) | 4 | Electronics Lab | Mariner 4 dish ~117 cm; X-band today 25 Mbps–1.5 Gbps |
| Fold-out Solar Panels | Power | 5 kg | 20 W in sunlight; Stuck solar panel more likely than Solar Cells | 5 | Solar Fab | Explorer 6 paddles (1959); deployable arrays 40–140 W/kg |
| Heavy Bus | Bus | 30 kg | carries 100 kg, 75 days to assemble, Assembly Hall level 4 | 15 | Metal Works | Landsat 1 ~953 kg, a Nimbus-based frame about 3 m tall |

Market prices follow from each recipe (inputs plus work, ×2 to buy), as for the other Parts. Suggested recipes: Science Package Si 14 + Cu 8, work $30K; Multispectral Scanner Si 14 + Cu 6, $35K; Reaction Wheels Al 30 + Cu 10, $20K; Dish Antenna Al 15 + Cu 5, $15K; Fold-out Solar Panels Si 25 + Al 10, $12K; Heavy Bus Al 300, $30K.

Checks of these numbers against the game's rules:
- **Landsat-like design** (Heavy Bus 30, Multispectral Scanner 10, Reaction Wheels 6, Fold-out Panels 5, Large Battery 6, Dish Antenna 3): **60 kg**, uses **9 W**. The panels give 20 W × 0.6 (low-orbit sunlight share) = 12 W on average: 33% spare power, just under the Design Review's 35% (yellow); Mk 2 panels make it 47%. Body-mounted Solar Cells (1.8 W average) cannot run it for a year. The scanner's 150 kB/day needs the Dish Antenna (Simple Antenna: 50).
- **Apollo package** (Large Bus 15, Science Package 12, Fold-out Panels 5, Large Battery 6, Dish Antenna 3): **41 kg**, uses **4 W**. Over 21 days at 0.67 sunlight the panels give plenty, but the 7-day night needs 4 W × 168 h = **672 Wh**: the Large Battery (720 Wh) just covers it, a Medium (420 Wh) does not. Its Parts (26 kg) need the Large Bus, so the Lunar Module limit should be about **45 kg**.

**Launch Vehicles** (lift real; prices and reliability game estimates)

| Vehicle | Height | Stages for the show | Lift | Rideshare | Whole launch | Reliability (game) | Real record |
|---|---|---|---|---|---|---|---|
| Saturn V | 111 m | 5 F-1 · 162 s; 5 J-2 · 384 s; 1 J-2 · 147 s, then "Off to the Moon" 347 s | LEO 125,000 kg; to the Moon 45,000 kg | not sold | paid by NASA (Apollo) | 0.98 | 13 flights 1967–1973, all successful (NASA)[^satv13] |
| Delta 900 | 32 m _(verify)_ | Thor ELT + 9 Castor II; Delta second stage | SSO 816 kg; LEO 1,680 kg _(museum fact sheet)_ | $20,000/kg | $6M _(no real price found)_ | 0.97 (as Delta D) | 2 of 2 worked (1972) |

- Saturn V's "lift to the Moon's surface" for the Apollo Contract is the space in the Lunar Module, not the rocket: proposal **45 kg** (game estimate; EASEP's two packages weighed 77 kg).
- Comms from the Moon (open question): the Moon is about 10× farther than geostationary orbit, so a radio's signal arrives about 100× weaker (it falls with distance squared). A simple game rule: from the Moon, every antenna sends a fifth as much (game estimate), so the Science Package's 30 kB/day needs the Dish Antenna (400 → 80) rather than the Simple Antenna (50 → 10).
- Burn times for Delta 900's show: Thor ELT ~220 s, Castor II ~38 s, Delta stage ~330 s _(verify all three; not found in a source)_.

[^a11nasa]: [NASA: Apollo 11 Mission Overview](https://www.nasa.gov/history/apollo-11-mission-overview/) · [NASA: Apollo 11](https://www.nasa.gov/mission/apollo-11/)
[^a11alsj]: [NASA ALSJ: Apollo 11 (CSM Columbia and LM Eagle)](https://nasa.gov/wp-content/uploads/static/history/alsj/a11/a11ov.html)
[^sp4029]: [NASA SP-4029: Lunar Surface Experiments](https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_18-33_Lunar_Surface_Experiments.htm) (also says EASEP "continued to return data for 71 days", which conflicts with the three weeks on NASA's seismic page; not used)
[^sp4205]: [Chariots for Apollo (NASA SP-4205), appendix D](https://apolloexplorer.co.uk/books/SP-4205/app-d.html) · [NASA NTRS 19790020032: SP-4205 in full, p. 394: EASEP's two packages "weighed a total of 77 kilograms and occupied 0.34 cubic meters"](https://ntrs.nasa.gov/citations/19790020032) (read 15 Nov 2026)
[^nasaseis]: [NASA Science: Apollo 11 Seismic Experiment](https://science.nasa.gov/resource/apollo-11-seismic-experiment/)
[^llr]: [NASA Goddard: Measuring the Moon's distance (1994)](https://eclipse.gsfc.nasa.gov/SEhelp/ApolloLaser.html)
[^ilrs]: [ILRS (NASA): Lunar science](https://ilrs.gsfc.nasa.gov/science/scienceContributions/lunar.html)
[^ls1nasa]: [NASA Science: Landsat 1](https://science.nasa.gov/mission/landsat-1)
[^landsat]: [Wikipedia: Landsat 1](https://en.wikipedia.org/wiki/Landsat_1)
[^gunterdelta]: [Gunter's Space Page: Delta](https://space.skyrocket.de/doc_lau/delta.htm)
[^orbcat]: [NASA Earth Observatory: Catalog of Earth Satellite Orbits](https://science.nasa.gov/earth/earth-observatory/catalog-of-earth-satellite-orbits)
[^vafb]: [NASA Earth Observatory: Earth Science Lifts off from the California Coast (11 Apr 2013)](https://science.nasa.gov/?p=1112568)
[^satpk]: [NASA Apollo 4 press kit (1967), NTRS 19670031260](https://ntrs.nasa.gov/api/citations/19670031260/downloads/19670031260.pdf) (via search summary) · [NASA: Saturn V launch vehicles (ALSJ)](https://www.nasa.gov/wp-content/uploads/static/history/alsj/CSM02_Saturn_Launch_Vehicles_pp8-14.pdf)
[^a11sum]: [NASA SP-4029: Apollo 11 summary](https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_11a_Summary.htm) · [Apollo 11 Mission Report](https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11mr_NoMissingPages_19700008096.pdf) (via search summary)
[^sp4029bg]: [NASA SP-4029 (Apollo by the Numbers): General background, launch complex table](https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_18-01_General_Background.htm) (read 15 Nov 2026)
[^satv13]: [NASA: Saturn V in the Vehicle Assembly Building](https://www.nasa.gov/image-article/saturn-v-vehicle-assembly-building-kennedy-space-center/) ("A total of 13 Saturn V rockets were launched between 1967 and 1973. Every launch was successful.") · [NASA: 50 years ago, final Saturn rocket rolls out](https://www.nasa.gov/history/50-years-ago-final-saturn-rocket-rolls-out-to-launch-pad-39/) (12 for Apollo, one for Skylab)
[^skylab]: [NASA: 50 years ago, the launch of Skylab](https://www.nasa.gov/history/50-years-ago-the-launch-of-skylab-americas-first-space-station/) ("On May 14, 1973, the final Saturn V rocket thundered off Launch Pad 39A")
[^exp6]: [NASA SP-8074, Spacecraft design criteria](https://ntrs.nasa.gov/api/citations/19710028154/downloads/19710028154.pdf) · [NASA: Aeronautics and Astronautics Chronology, 1959](https://history.nasa.gov/Timeline/1959.html) (via search summary)
[^mariner4]: [JPL: Mariner IV charts vast expanse between Earth and Mars](https://www.jpl.nasa.gov/news/mariner-iv-charts-vast-expanse-between-earth-and-mars/) · [JPL DESCANSO monograph 8, ch. 3](https://descanso.jpl.nasa.gov/monograph/series8/Descanso8_03.pdf) (via search summary)

---

## Era 4 (1990–2009): telescopes and Moon maps

### Hubble Space Telescope

| Fact | Value | Source |
|---|---|---|
| Launch | **24 Apr 1990**, 8:33:51 a.m. EDT, Space Shuttle **Discovery**, STS-31, **Pad 39B**, Kennedy; the 10 Apr attempt was scrubbed ([milestones.md](milestones.md)) | [^sts31] |
| Crew | Loren Shriver, Charles Bolden, Steven Hawley, Bruce McCandless II, Kathryn Sullivan | [^sts31] |
| Deployed | **25 Apr 1990**, into a **380-statute-mile** orbit (about 611 km); orbit tilt 28.5° _(verify)_ | [^sts31] |
| Flight | 5 days 1 h 16 min; landed 29 Apr 1990 at Edwards Air Force Base | [^sts31] |
| Size | **13.2 m** long (43.5 ft), **4.2 m** wide at the back; main mirror **2.4 m** (94.5 in) | [^hubbledesign] |
| Mass | About **24,000 lb (10,800 kg)** at launch (NASA today; a NASA history article says 24,500 lb); about 27,000 lb after the 2009 servicing | [^hubblenums] |
| Pointing | **Four reaction wheels** (about 45 kg each), gyroscopes spinning at 19,200 rpm (usually three in use), and **three Fine Guidance Sensors** that lock onto guide stars. It holds a target to **0.007 arcsecond** (NASA compares it to a laser held on a dime 200 miles away) and turns at most about 90° in 15 minutes | [^hubblepoint] |
| The mirror flaw | NASA announced it on **27 Jun 1990**, two months after launch: "spherical aberration", an error "10 times larger than the specified tolerance". The main mirror was ground too flat near its edge because the null corrector used to test it during polishing had been set up wrong (one lens 1.3 mm out of place) | [^hubbleflaw] |
| How big | **2.2 microns** too flat at the edge (NASA's archived SM1 page); other NASA and ESA pages say 2, about 3, or 4 microns | [^hubblesm1] |
| The fix | First servicing mission, **STS-61, December 1993**, five spacewalks: astronauts installed **WFPC2** (a camera with its own corrective optics) and **COSTAR** (five pairs of correcting mirrors for three other instruments). COSTAR came out in May 2009 | [^hubbleflaw] [^sts61] |
| Design life | 15 years with servicing (JPL quicklook, via search) | search results |
| Batteries | Hubble was NASA's first nickel-hydrogen battery in low Earth orbit (1990) | [^nih2] |

### Lunar Reconnaissance Orbiter (LRO) and LCROSS

| Fact | Value | Source |
|---|---|---|
| Launch | **18 Jun 2009**, 21:32 UTC (5:32 p.m. EDT), **Atlas V 401** (AV-020), **SLC-41**, Cape Canaveral, with LCROSS; ULA: "Atlas V has 15 previous successful launches" | [^lroabout] [^ulalro] |
| Built by | NASA Goddard | search results (PDS, NSSDCA) |
| Mass | **1,850 kg** (4,000 lb) with fuel; NSSDCA and PDS give 1,846 kg and a dry mass under 949 kg. The design paper: under 2,000 kg, "of which about 900 kg is fuel", most of it used to brake into lunar orbit | [^lroabout] [^lrodesign] |
| Getting there | A four-day trip (five on some launch days); the first braking burn lasted 38 minutes on four 80 N thrusters; total Δv budget about **1,260 m/s** | [^lrodesign] |
| Orbits | Entered lunar orbit **23 Jun 2009**; commissioning orbit 30 × 216 km; then **50 km**, roughly circular, **polar**; lowered to about 20 × 165 km in 2015 | [^lroabout] [^lrodesign] |
| Phases | Primary (exploration) mission from September 2009, "expected to last one year" (NASA's About page gives 25 Sep _(verify: other NASA pages may say 15 Sep)_); NASA's science directorate took over in September 2010; still working in 2026 | [^lroabout] |
| Instruments (7) | **LROC** camera; **LOLA** laser altimeter (elevation maps; the first multi-beam laser altimeter in space); **Diviner** (DLRE, temperatures); **LAMP** (ultraviolet, water on the dayside); **LEND** (neutrons, hydrogen); **CRaTER** (cosmic-ray radiation effects); **Mini-RF** radar (partly failed January 2011) | [^lroabout] [^lrodesign] |
| Power | One 10.7 m² solar array, about **1,850 W** (end of life), 800 W on average; an **80 Ah lithium-ion** battery for the eclipses (PDS catalogue and NSSDCA, via search) | search results |
| Sunlight in its orbit | In full Sun twice a year for about two months each; the rest of the year, eclipses of up to **48 minutes** each orbit. A lap at 50 km takes about 113 minutes (calculated), so the worst case is about 58% sunlight | [^lrodesign] |
| Seeing Earth | Over each 27.4-day lunar month the whole orbit is visible from Earth twice, for about two days each; the rest of the time part of each orbit is hidden behind the Moon. Tracked for 30 minutes every orbit | [^lrodesign] |
| Landing sites | Photographed all the Apollo landing sites, Surveyor III, Chang'e 3 and 4 and several Luna landers | [^lroabout] |
| LCROSS | Its spent Centaur upper stage hit the permanently shadowed crater **Cabeus**, near the south pole, on **9 Oct 2009** (11:31 UTC), the LCROSS spacecraft four minutes later. NASA found about **150 kg** of water vapour and ice in the instruments' view ("24 gallons"); later analyses ~155 kg, about 5–6% of the debris | [^lcross] |

### Launch Vehicles of Era 4

| Fact | Space Shuttle | Atlas V 401 | Source |
|---|---|---|---|
| Parts | Orbiter with three main engines, external tank, **two solid rocket boosters** | Common Core Booster with one **RD-180** (kerosene and oxygen), **Centaur** upper stage with one RL10 (hydrogen and oxygen), 4 m fairing, no solid boosters | [^shuttleref] [^atlasoa7] |
| Size | Stack 184 ft (56 m) long; orbiter 122 ft long; payload bay 60 × 15 ft (18 × 4.6 m) | Booster 106.5 ft long, 12.5 ft wide; Centaur 41.5 ft; about 194 ft (59 m) with the long fairing used on OA-7 | [^shuttleref] [^atlasoa7] |
| Burns | Boosters: all propellant used "after about two minutes"; main engines run 8.5 minutes, then the tank drops | OA-7 (2017): booster cutoff at **4 min 16 s**; Centaur first cutoff at 18 min 12 s (mission-dependent) | [^shuttleref] [^atlasoa7] |
| Lift | About **27,500 kg** to low orbit ([launch-vehicles.md](launch-vehicles.md), secondary source); NASA's reference page gives no per-flight figure | **9,800 kg** low orbit (reference), **4,750 kg** geostationary transfer | [^atlasoa7] |
| Flights | **135**, from STS-1 (12 Apr 1981, Columbia, Pad 39A) to STS-135 (launched 8 Jul 2011, landed 21 Jul 2011). Challenger (1986) and Columbia (2003) were lost _(verify wording on the card)_ | First flight **21 Aug 2002** (Hot Bird 6, SLC-41); the 401 flew about half of all Atlas V missions by 2017; still flying in 2026 _(verify)_ | [^shuttleref] [^atlasoa7] |

- **Saturn V** last flew on 14 May 1973 (Skylab)[^skylab] and **Delta 900** on 11 Dec 1972 (Gunter's), so both are retired by 1990.[^gunterdelta]
- **Pegasus** (side story): first flight **5 Apr 1990**, released from NASA's B-52 (NASA 008) at 43,198 ft about 60 miles southwest of Monterey; three solid stages; it put the 423-lb PEGSAT into orbit. Built by Orbital Sciences with private money; its maker calls it the first privately developed space launch vehicle (a company claim). B-52 launches 1990–1994, then Orbital's own L-1011 airliner.[^pegasus]

### Batteries through the Eras

- Nickel-cadmium batteries stored power on TIROS-1, Syncom and other early satellites ([like-the-real-one.md](like-the-real-one.md)). Nickel-hydrogen took over on geostationary satellites from 1983 and first flew for NASA in low orbit on Hubble in 1990; a NASA memo gives bipolar nickel-hydrogen about 30% more energy per kilogram than nickel-cadmium.[^nih2] Typical figures (nickel-cadmium about 25–35 Wh/kg, nickel-hydrogen about 40–60 Wh/kg) are _(verify)_.
- Lithium-ion cells today hold **150–270 Wh/kg** (packs 75–250) ([spacecraft-parts.md](spacecraft-parts.md)). LRO flew an 80 Ah lithium-ion battery in 2009; the Space Station replaced its nickel-hydrogen batteries with lithium-ion ones from December 2016.[^nih2] Which spacecraft flew lithium-ion first was not found _(verify)_.

### Game proposal: Era 4

**Milestone Contracts** (game estimates)

| Milestone | Client | Destination | Payload | Days of Data | Reward | Deadline | Launch |
|---|---|---|---|---|---|---|---|
| Hubble | NASA | Low Earth Orbit, **611 km, 28.5°** _(tilt verify)_ | Space Telescope; needs Reaction Wheels | **365** (its first year; real design life 15 years with servicing) | **$20M** | 600 days | Space Shuttle, whole launch paid by NASA (cost $0); ships to Kennedy LC-39B |
| Lunar Reconnaissance Orbiter | NASA | Lunar orbit, **50 km, polar (90°)** | Moon Mapper; needs a Main Engine to brake into orbit | **365** (its one-year exploration mission) | **$25M** | 600 days | Atlas V 401 Rideshare from Cape Canaveral SLC-41 (opens 2002) |

- **Sunlight in lunar polar orbit:** proposal `SUNLIT_SHARE.lunarOrbit = 0.75` (game estimate between LRO's worst case, ~58%, and its two-month seasons of full Sun).
- **Earth contact from lunar orbit:** part of each orbit is hidden behind the Moon. Proposal: the antenna sends during 0.75 of the time (game estimate), and the Advanced Computer stores Data until Earth is in view.
- The Hubble "after" card can link to Ground Tests (ticket 40): the mirror was tested, but with a misset tool, and two months in orbit showed the error. Say it as NASA does; do not claim a full-system test would surely have caught it.

**New Parts** (game estimates, Mk 1)

| Part | Slot | Mass | Numbers | Days to make | Factory | Real figure for reference |
|---|---|---|---|---|---|---|
| Space Telescope | Payload | 90 kg | 4 W, 300 kB/day; needs Reaction Wheels | 12 | Electronics Lab | Hubble: 2.4 m mirror, 13.2 m long, ~10,800 kg; holds 0.007″ |
| Moon Mapper | Payload | 20 kg | 6 W, 150 kB/day | 8 | Electronics Lab | LRO's LROC camera and LOLA laser altimeter |
| Lithium Battery | Battery | 4 kg | 1,000 Wh (250 Wh/kg) | 4 | Battery Plant | Li-ion cells 150–270 Wh/kg; LRO's 80 Ah battery |
| Advanced Computer | Computer | 2 kg | 3 W; keeps up to 2,000 kB of Data while Earth is out of view | 5 | Electronics Lab | not researched (the Basic Computer is a game Part too) |
| Very Large Bus | Bus | 60 kg | carries 250 kg, 90 days to assemble, Assembly Hall level 5 | 20 | Metal Works | Hubble 13.2 × 4.2 m |

Suggested recipes: Space Telescope Si 40 + Al 60 + Cu 10, work $80K; Moon Mapper Si 18 + Cu 8, $40K; Lithium Battery Cu 10 + Si 6, $8K; Advanced Computer Si 8 + Cu 4, $15K; Very Large Bus Al 600, $60K.

Checks:
- **Hubble-like design** (Very Large Bus 60, Space Telescope 90, Reaction Wheels 6, Fold-out Panels 5, Lithium Battery 4, Dish Antenna 3): **168 kg**; its 108 kg of Parts is too much for the Heavy Bus (100), so it needs the Very Large Bus and Assembly Hall level 5. Uses 9 W against 12 W of panel power on average: 33% spare, as Landsat.
- **LRO-like design** (Heavy Bus 30, Moon Mapper 20, Reaction Wheels 6, Fold-out Panels 5, Lithium Battery 4, Dish Antenna 3, Main Engine 24, Advanced Computer 2): **94 kg**, uses 14 W against 15 W on average at 0.75 sunlight: 7% spare, so Mk 2 panels or Low-power electronics are needed (a real trade). A 48-minute eclipse at 14 W needs about 11 Wh a lap: any battery covers it, the Lithium one at a fraction of the mass. If antennas send a fifth from the Moon (Era 3 open question), the Dish gives 80 kB/day and the Moon Mapper's 150 needs one level 1 Ground Station (×2 = 160).

**Launch Vehicles** (lift real; prices and reliability game estimates)

| Vehicle | Height | Stages for the show | Lift | Rideshare | Whole launch | Reliability (game) |
|---|---|---|---|---|---|---|
| Space Shuttle | 56 m | 2 solid boosters (120 s) burning with 3 main engines (510 s); the orbiter opens its bay and lets the Spacecraft go | LEO 27,500 kg | $15,000/kg | paid by NASA (Hubble) | 0.99 (real: 135 flights; Challenger was lost during launch) |
| Atlas V 401 | 58 m | RD-180 booster (255 s), Centaur (about 800 s, mission-dependent) | LEO 9,800 kg; GTO 4,750 kg; to the Moon about 2,700 kg (LRO with LCROSS) _(verify LCROSS mass, ~890 kg)_ | $12,000/kg | not needed | 0.99 |

- Atlas V 401 shows "Opens in 2002" until the Game date reaches 21 Aug 2002, and stays open in Era 5 (still flying in 2026).
- The Shuttle is crewed: the GDD's crewed rule (≥95% estimated success) is about crewed Spacecraft the Company designs; it should not block a Spacecraft riding in the Shuttle's bay (open question for ticket 51).

[^sts31]: [NASA: STS-31](https://www.nasa.gov/mission/sts-31/)
[^hubbledesign]: [NASA Science: Hubble design](https://science.nasa.gov/mission/hubble/observatory/design/) (via search summary)
[^hubblenums]: [NASA Science: About Hubble](https://science.nasa.gov/mission/hubble/overview/about-hubble/) · [NASA Science: Hubble by the numbers](https://science.nasa.gov/mission/hubble/overview/hubble-by-the-numbers/) (via search summary)
[^hubblepoint]: [NASA Science: Hubble pointing control](https://science.nasa.gov/mission/hubble/observatory/design/pointing-control/)
[^hubbleflaw]: [NASA Science: Hubble's mirror flaw](https://science.nasa.gov/mission/hubble/observatory/design/optics/hubbles-mirror-flaw/)
[^hubblesm1]: [NASA Goddard (archive): Servicing Mission 1](https://asd.gsfc.nasa.gov/archive/hubble/missions/sm1.html) (via search summary) · [ESA/Hubble: the spherical aberration problem](https://esahubble.org/about/history/aberration_problem/)
[^sts61]: [NASA: 30 years ago, STS-61, the first Hubble servicing mission](https://www.nasa.gov/history/30-years-ago-sts-61-the-first-hubble-servicing-mission/) (via search summary)
[^nih2]: [NASA Handbook for Nickel-Hydrogen Batteries, NTRS 19940008792](https://ntrs.nasa.gov/citations/19940008792) · [NASA TM-106795, NTRS 19950010446](https://ntrs.nasa.gov/api/citations/19950010446/downloads/19950010446.pdf) · [ISS lithium-ion battery start-up, NTRS 20170004524](https://ntrs.nasa.gov/citations/20170004524) (all via search summary)
[^lroabout]: [NASA Science: About LRO](https://science.nasa.gov/mission/lro/about/)
[^ulalro]: [ULA: launches Moon missions for NASA (18 Jun 2009)](https://www.ulalaunch.com/about/news/2009/06/18/united-launch-alliance-successfully-launches-moon-missions-for-nasa)
[^lrodesign]: [Beckman (NASA Goddard), Mission design for the Lunar Reconnaissance Orbiter, AAS 07-057, NTRS 20070021535](https://ntrs.nasa.gov/api/citations/20070021535/downloads/20070021535.pdf) (pre-launch paper, read in full)
[^lcross]: [NASA Space Math: LCROSS sees water on the Moon](https://spacemath.gsfc.nasa.gov/news/6Page66.pdf) · [NASA Science: LCROSS impact site](https://science.nasa.gov/image-detail/20110615lcross/) · [NASA Ames history guide to LCROSS](https://history.arc.nasa.gov/hist_pdfs/guides/afs80005lcross.pdf) (via search summary)
[^shuttleref]: [NASA: The Space Shuttle](https://www.nasa.gov/reference/the-space-shuttle/) · [NASA: Space Shuttle](https://www.nasa.gov/space-shuttle/)
[^atlasoa7]: [ULA: Atlas V OA-7 mission overview (2017)](https://www.ulalaunch.com/docs/default-source/news-items/av_oa7_mob.pdf) (read in full) · [NSSDCA: Hot Bird 6](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2002-038A) (via search summary)
[^pegasus]: [NASA: B-52 heavy-lift airborne launch aircraft](https://www.nasa.gov/reference/b-52/) · [NTRS 19910042773: Pegasus first mission, flight results](https://ntrs.nasa.gov/citations/19910042773) · [Northrop Grumman: Pegasus](https://www.northropgrumman.com/what-we-do/space/launch-vehicles/pegasus) (via search summary)

---

## Era 5 (2015–2028): reusable rockets and Artemis

Artemis III and IV are in the future: each line says what the plan was and when the source said it. Re-check before release.

### Falcon 9: the first booster landing and the first reflight

| Fact | Value | Source |
|---|---|---|
| Flight 20 | **21 Dec 2015**, 8:29 p.m. EST, SLC-40, Cape Canaveral: Falcon 9 (upgraded "Full Thrust") launched **11 ORBCOMM OG2** satellites | [^f9af] |
| The landing | The first stage (B1019) landed at **Landing Zone 1** about nine minutes after liftoff (8:38 p.m. EST): the first landing of an orbital-class first stage after launching satellites | [^f9af] search results |
| The satellites | ORBCOMM's second-generation (OG2) messaging satellites for tracking ships, trucks and machines, built by Sierra Nevada Corporation; about **170 kg** each (SpaceX OG2 Mission 1 press kit; Wikipedia 172 kg); planned orbit about 750 km _(tilt verify: 45° or 47°)_. Sierra Nevada finished checking the last 11 in orbit and handed them over in early **March 2016** | [^og2] search results |
| First reflight | **30 Mar 2017**, SES-10 from LC-39A: booster B1021, which had flown before (CRS-8, April 2016 _(verify)_), flew again and landed on a drone ship. NASA's data sheet: "the first reflight of a complete orbital-class liquid-fueled rocket stage" | [^f9sma] |
| Reuse since | SpaceX's user guide: boosters re-flown more than 384 times by February 2025 | [^f9guide] |
| Rideshare price (2026) | About **$7,000/kg** to Sun-synchronous orbit, $350,000 for the first 50 kg (up from $6,500/kg, $325,000 per 50 kg, in 2025). Reported by trade press, February–March 2026; SpaceX's own page refused this environment, and SpaceX publishes no orbit other than SSO on its card | [^rideshare] |
| Rideshare price history | SpaceX's small-satellite rideshare started in 2019 at about $1M for 200 kg ($5,000/kg) _(verify)_: prices per kilogram **rose**, not fell, after boosters began to fly again | _(verify)_ |

### Falcon Heavy

| Fact | Value | Source |
|---|---|---|
| First flight | **6 Feb 2018**, 20:45 UTC, LC-39A, Kennedy | [^fhnasa] search results |
| Boosters | Three Falcon 9-derived cores, 27 Merlin engines; the two side boosters had flown before (Thaicom 8 and CRS-9, 2016) and landed side by side at LZ-1 and LZ-2; the centre core was lost at sea | search results (TechCrunch, Spaceflight Now) |
| Size and lift | 70 m; **63,800 kg** to low orbit, **26,700 kg** to geostationary transfer (expendable; SpaceX figures, quoted by aggregators; spacex.com refused this environment) _(verify on spacex.com)_ | search results |

### SLS Block 1 and Orion

| Fact | Value | Source |
|---|---|---|
| Size | **98.27 m** (322.4 ft); 5.74 million lb (2,604 t) fuelled; **8.8 million lb** of thrust at liftoff | [^slsguide] |
| Stages | Two **five-segment solid boosters** (burn ~**126 s**, separate about two minutes in); **core stage** with four RS-25 engines (burn **480 s**, cutoff about eight minutes in, ~185 km up); **ICPS** upper stage with one RL10B | [^slsguide] |
| Lift | More than **27 t** (59,525 lb) to translunar injection | [^slsguide] |
| Pad | Kennedy **LC-39B**, on **Mobile Launcher 1** | [^slsguide] |
| Artemis I | Launched **16 Nov 2022**; flew 16 Nov–11 Dec 2022 (25 days); the ICPS burned a record **18 minutes** to send Orion to the Moon; then deployed **10 CubeSats** | [^slsguide] |
| Artemis II profile | ICPS: 30-second perigee raise about 50 min after launch, then a **20-minute** apogee raise into a 185 × 74,080 km high Earth orbit; Orion separated about 3 h 25 min in, flew a ~70-minute proximity demonstration with the ICPS, spent about 25 hours in high Earth orbit and then fired its own service-module engine for translunar injection | [^slsguide] |
| Record | 2 flights, both worked (Artemis I 2022, Artemis II 2026) | [^slsguide] [^a2] |

### Artemis I's ten CubeSats (6U)

- Ten **6U** CubeSats (each up to **14 kg**, 30 lb, "shoebox" size; NASA's Artemis I reference page says 25 lb) rode in the Orion stage adapter and were deployed 4–8 hours after launch on 16 Nov 2022. Ground teams heard from **8 of 10**; **5** achieved partial or complete success. NASA lists likely causes for the silent or lost ones: tumbling, power failures, too hot or too cold, radiation; and "CubeSats flying to the Moon and beyond can be quickly lost if a communications link is not made with the ground soon after deployment".[^a1cubesats][^slssec]

| CubeSat | Built by | Destination (NASA table) | Purpose |
|---|---|---|---|
| ArgoMoon | Italian Space Agency (Argotec), Turin | High Earth / Moon orbit | Photographed the upper stage and Earth and Moon |
| BioSentinel | NASA Ames | Around the Sun | Yeast as a living radiation detector in deep space |
| CuSP | Southwest Research Institute | Around the Sun | Solar particles (space weather) |
| EQUULEUS | JAXA / University of Tokyo | Earth–Moon L2 | Earth's plasmasphere, impact flashes on the Moon |
| LunaH-Map | Arizona State University | Lunar orbit | Hydrogen (water) near the south pole; its engine failed, so it never reached lunar orbit |
| Lunar IceCube | Morehead State University | Lunar orbit | Water ice from orbit |
| LunIR | Lockheed Martin | Earth orbit (GEO class) | Infrared camera for a lunar flyby |
| NEA Scout | NASA Marshall | Near-Earth asteroid | Solar sail; never heard from |
| OMOTENASHI | JAXA | Moon's surface (lander) | Tiny lander; not enough power, landing called off |
| Team Miles | Fluid & Reason (citizen team), Tampa | Deep space | Plasma thrusters; never heard from |

Destinations and builders are from NASA's results paper; purposes and the individual outcomes come from late-2022 reporting _(verify per CubeSat before showing on a card; NASA's paper gives only the 8-of-10 and 5-of-10 counts)_.[^a1cubesats][^a1press]

### Artemis II (flown)

| Fact | Value | Source |
|---|---|---|
| Launch | **1 Apr 2026**, 6:35 p.m. EDT, LC-39B | [^a2] |
| Crew | Reid Wiseman, Victor Glover, Christina Koch (NASA), Jeremy Hansen (Canadian Space Agency) | [^a2] |
| Splashdown | **10 Apr 2026**, 8:07 p.m. EDT, Pacific Ocean off San Diego; NASA's mission page: 9 days 1 h 32 min | [^a2] |
| Distance | Farthest point **252,756 miles** from Earth, a record beyond Apollo 13's; 694,481 miles in all | [^a2] |
| CubeSats | **Four 12U CubeSats** from international partners, each up to **26 kg** (57.3 lb), twice the size of Artemis I's: **ATENEA** (Argentina, CONAE: radiation shielding, orbit design, long-range communications), **K-Rad Cube** (Korea, KASA: space radiation and its biological effect across the **Van Allen belts**), **TACHELES** (Germany, DLR: electrical parts for future lunar vehicles), **Space Weather CubeSat-1** (Saudi Space Agency: radiation, solar X-rays and particles, magnetic fields) | [^slsguide] |
| Where they went | Deployed in high Earth orbit on 1 Apr 2026 (planned about five hours in), "about a third of the distance to the Moon", on an Earth-return path: they could use their own engines to stay in Earth orbit or do their research during "a day-long journey" to re-entry | [^slsguide] [^a2sci] |
| How they did | Reported in the press: ATENEA made contact and finished its experiments (CONAE, via Argentine press); K-Rad Cube had trouble making normal contact (Korean press, via a forum); the others unconfirmed _(verify all four before a card names results)_ | search results |

### Artemis III and IV (plans as of 23–26 Oct 2026)

- **Artemis III (2027): a lander test in Earth orbit.** NASA changed it in late February 2026 from the first landing to an Earth-orbit test, like Apollo 9 ([milestones.md](milestones.md)). Plan of 23 Oct 2026: crew **Randy Bresnik, Frank Rubio, Andre Douglas and ESA's Luca Parmitano**; a planned **14-day** mission. Blue Origin first launches a **Blue Moon Mark 2** test article to a circular orbit about 273 miles (440 km) up, where it waits up to 30 days; SLS then launches Orion, which docks with it and the crew spend about two days testing its cabin, controls and life support; then SpaceX launches a **Starship V3** test article (about 206 nautical miles, 380 km), and Orion docks with it for up to two hours (the crew do not go in). Orion splashes down off California. It also studies "health assessments when astronauts cannot communicate directly with mission control".[^a3]
- **Artemis IV (2028): the first crewed landing since 1972, near the south pole.** Plan of 23 Oct 2026: "neither lander provider has been assigned to a specific Artemis lunar landing mission"; NASA will pick who goes first "based on lander readiness", and a second landing will follow. SpaceX's plan: Starship waits for Orion in Earth orbit, flies to the Moon and lands two crew for several days. Blue Origin's: Blue Moon Mark 2 with three transfer stages, an elliptical polar orbit, two crew to the south pole.[^a4]

### What a south-pole landing needs

| Need | Fact | Source |
|---|---|---|
| Talking to Earth | The south pole often cannot see Earth. NASA's LCRNS paper (2025): speaking straight to Earth gives a south-pole landing site **43%** coverage at best (Mount Malapert) and **17%** at worst (Spudis Ridge); **one relay** satellite raises it to **80–86%**; three relays give **100%**. One early design: relays in polar orbits 6,500 km from the Moon's centre, each covering the pole 41% of its 784-minute lap; 1.1 kW of solar panels; small enough for a Falcon 9 rideshare ring | [^lcrns] |
| Who builds relays | NASA chose **Intuitive Machines** in 2024 as the first commercial relay provider; its first relay satellite, **Altus-1**, is to launch with the IM-3 lander (NASA Moon Base page, updated 12 Nov 2026). ESA's equivalent is **Moonlight**, JAXA's the Lunar Navigation Satellite System; all are meant to work together. Firefly's Blue Ghost Mission 2 will talk through **Lunar Pathfinder** from the far side | [^lcrns] [^moonbase] |
| Cargo landers | NASA's CLPS buys rides from companies. **Intuitive Machines IM-1** landed in February 2024 near Malapert A in the south-pole region (it tipped over _(verify)_); **Firefly Blue Ghost Mission 1** landed on **2 Mar 2025** in Mare Crisium with 10 NASA instruments and worked through about 346 hours of daylight and 5 hours into the night; **IM-2** landed near the south pole on **6 Mar 2025**, "the southernmost lunar landing ever". Planned next (Nov 2026): Blue Moon Mark 1 "Endurance" (Shackleton connecting ridge), Griffin-1 (south pole, late 2026), IM-3 (Reiner Gamma), Blue Ghost Mission 2 (far side) | [^clps] [^moonbase] |
| Maps of landing sites | LRO's LOLA laser altimeter measures heights even inside shadowed craters; NASA uses its south-pole maps for landing sites. Planned: **MoonFall**, four drones to map possible Artemis sites (2028) | [^lola] [^moonbase] |
| Sunlight at the pole | The Sun never rises more than about 7° above the horizon there. Some ridges are lit most of the year: LOLA studies give **88%** on Connecting Ridge and over **70%** on average along it; nearby crater floors have not seen sunlight for billions of years | [^lola] |
| Radiation | Beyond Earth's magnetic field, radiation from the Sun and the galaxy raises astronauts' risk of cancer and other diseases later in life; NASA limits each career to a 3% chance of dying of cancer from it (via search) | [^rad] |
| Distance | The Moon is on average 384,400 km away: light and radio take about **1.28 s** each way (calculated) | [^moonfact] |

### Game proposal: Era 5

**Milestone Contracts** (game estimates)

| Milestone | Client | Destination | Payload | Days of Data | Reward | Launch |
|---|---|---|---|---|---|---|
| Falcon 9 booster landing | ORBCOMM (real client; no logo) | Low Earth Orbit, 750 km, 45° _(verify tilt)_ | Radio Transponder (a messaging satellite) | **75** (real: launch to Sierra Nevada's hand-over, about 21 Dec 2015–early Mar 2016) | $15M | Falcon 9 Rideshare, Cape Canaveral; the show lands the booster at LZ-1 |
| Artemis I (support) | NASA | Past the Moon (around the Sun or high Earth orbit) | Radiation Detector on a **CubeSat (6U)**; at most **14 kg** | **25** (Orion's flight, 16 Nov–11 Dec 2022) | $8M | SLS, free ride (NASA picked the CubeSats) |
| Artemis II (support) | NASA, for an international partner | High Earth orbit, 185 × 74,080 km | Radiation Detector on a **CubeSat (12U)**; at most **26 kg**; crosses the Van Allen belts like K-Rad Cube (links back to Explorer 1) | **1** (real: about a day from deployment to re-entry) or longer with a Main Engine to stay up | $6M | SLS, free ride |
| Artemis III (your choice; any one completes it) | NASA | Low Earth Orbit, about 440 km (the landers' orbit) | (a) **camera satellite** watching the dockings (TV Camera, Reaction Wheels); (b) **relay** for times Orion cannot reach mission control (Relay Radio); (c) **space-weather watch** for the crew (Radiation Detector) | **14** (the planned mission length) | $12M each; +$6M for each extra choice | Falcon 9 Rideshare |
| Artemis IV (finale; any one completes it) | NASA | (a) **lunar relay** in a high polar lunar orbit, about 4,760 km up (6,500 km from the centre); (b) **cargo lander** on a sunlit south-pole ridge; (c) **Moon Mapper** in a 50 km polar orbit | (a) Relay Radio; (b) Lander + Science Package; (c) Moon Mapper | (a) **30** (the crew's trip and stay, game estimate); (b) **14** (one lunar day, like Blue Ghost Mission 1's ~346 hours); (c) **27** (one turn of the Moon under a polar orbit, 27.4 days) | $30M each | Falcon Heavy or Falcon 9 Rideshare |

- **Sunlight on a south-pole ridge:** proposal `SUNLIT_SHARE.lunarSouthPole = 0.8` (between LOLA's 70% average and 88% best).
- **Relay rule:** a Spacecraft at the south pole or behind the Moon sends Data only 30% of the time on its own (between NASA's 17% and 43%); with the Company's relay in lunar orbit, 85% (NASA: 80–86%). Game estimates built on the LCRNS figures.
- **"Cheaper after the booster landing":** real rideshare prices per kilogram went up from 2019 to 2026. Proposal: the landing opens **Rideshare on Falcon 9 at $7,000/kg** (2026's real price) and the whole-rocket price drops; avoid saying rideshares got cheaper per kilogram. The team decides (ticket 52).

**New Parts** (game estimates, Mk 1)

| Part | Slot | Mass | Numbers | Days to make | Factory | Real figure for reference |
|---|---|---|---|---|---|---|
| CubeSat Bus (6U) | Bus | 2 kg | carries 12 kg (whole CubeSat ≤ 14 kg), 20 days to assemble, Assembly Hall level 1 | 4 | Metal Works | Artemis I: 6U, up to 14 kg |
| CubeSat Bus (12U) | Bus | 4 kg | carries 22 kg (≤ 26 kg), 25 days | 5 | Metal Works | Artemis II: 12U, up to 26 kg (or reuse ticket 48's sizes) |
| Lander | Propulsion | 40 kg | legs and a landing engine; needed for a surface Destination without Saturn V's Lunar Module | 12 | Metal Works | CLPS landers: Blue Ghost Mission 1 carried 10 NASA instruments _(lander mass not researched)_ |
| Relay Radio | Comms | 3 kg | 4 W; passes 600 kB/day between other Spacecraft and Earth; counts as the relay for the south-pole rule | 5 | Electronics Lab | LCRNS design: 1.1 kW solar, 8+ years in orbit |

Checks:
- **Artemis I CubeSat** (6U Bus 2, Radiation Detector 1.5, Solar Cells 2, Small Battery 3, Simple Antenna 1): **9.5 kg** ≤ 14. If antennas send a fifth beyond the Moon, the Simple Antenna gives 10 kB/day against the detector's 20, so the Dish (3 kg) is needed: 11.5 kg. Tight, like the real ones.
- **Artemis IV relay** (Heavy Bus 30, Relay Radio 3, Fold-out Panels 5, Lithium Battery 4, Reaction Wheels 6, Main Engine 24): **72 kg**.

**Launch Vehicles** (lift real; prices and reliability game estimates)

| Vehicle | Height | Stages for the show | Lift | Rideshare | Whole launch | Reliability (game) |
|---|---|---|---|---|---|---|
| Falcon 9 (existing) | 70 m | 9 Merlins (162 s), then the booster flips and lands at LZ-1 about 9 min after liftoff; 1 Merlin Vacuum (397 s) | as now | $7,000/kg | $74M (reported 2026 list price) _(verify)_ | 0.98 |
| Falcon Heavy | 70 m | 3 cores (27 Merlins); side boosters separate and land side by side; centre core; upper stage | LEO 63,800 kg; GTO 26,700 kg _(verify)_ | $7,000/kg | $90M (no verified price) | 0.97 |
| SLS Block 1 | 98 m | 2 solid boosters (126 s) with 4 RS-25 (480 s); ICPS; then "Off to the Moon" | to the Moon 27,000 kg | free ride for NASA-picked CubeSats | NASA only | 0.97 (real: 2 of 2) |

- Retired by 2015: Space Shuttle (2011). Still flying: Atlas V 401 and Falcon 9. Falcon Heavy shows "Opens in 2018", SLS "Opens in 2022".

## Open questions across Eras 3–5

1. **Lift scale.** Real lift (Delta 900: 816 kg to Sun-synchronous; Saturn V: 125 t) is far above the game's scaled Spacecraft (60–170 kg), so mass stops mattering from Era 3 on, as it already has for Thor-Able and Falcon 9. Keep real lift, or scale Era 3+ lift down for play?
2. **Comms by distance.** Should antennas send less from the Moon and beyond (proposed: a fifth)? It makes the Dish Antenna, Ground Stations and the Relay Radio matter, which is the real lesson of the south pole.
3. **Long Data days.** Landsat, Hubble and LRO each had a one-year first mission (365 days ≈ 12 minutes at 1×). Keep, or shorten?
4. **Time jumps inside an Era.** Era 3 waits for Delta 900 (1972), Era 4 for Atlas V (2002), Era 5 for Falcon Heavy (2018) and SLS (2022). Jump the Game date to each Milestone's real year, or let the player wait?
5. **Free Play start.** The code's Era 5 starts in 2026 (`ERA_START_UTC[5]`), the Campaign's Era 5 in 2015. Two start dates for one Era, or a Campaign-only start?

[^f9af]: [US Air Force: 45th SW launches ORBCOMM, lands first stage booster](https://www.af.mil/News/Article-Display/Article/637696/45th-sw-launches-orbcomm-lands-first-stage-booster) (via search summary)
[^og2]: [Sierra Nevada Corporation: ORBCOMM OG2 constellation checked out (press release)](https://www.sncorp.com/press-releases/snc-orbcomm-og2-global) · [SpaceX ORBCOMM OG2 Mission 1 press kit (copy)](https://sky-brokers.com/wp-content/uploads/2025/06/SpaceX-Orbcomm-OG2-Mission-1-Press-Kit.pdf) (via search summary)
[^f9sma]: [NASA SMA: Space Launch Report, Falcon 9 v1.2 data sheet](https://sma.nasa.gov/LaunchVehicle/assets/spacex-falcon-9-v1.2-data-sheet.pdf) (via search summary)
[^f9guide]: [SpaceX: Falcon Payload User's Guide (May 2025)](https://content.spacex.com/cms-assets/assets/falcon-users-guide-2025-05-09.pdf) (via search summary)
[^rideshare]: [NewSpace Economy: SpaceX rideshare pricing as of February 2026](https://newspaceeconomy.ca/2026/02/27/spacex-rideshare-pricing-as-of-february-2026-what-it-costs-whats-included-and-how-buyers-budget-a-mission/) (secondary; cites Ars Technica's March 2026 Rocket Report)
[^fhnasa]: [NASA History: 5 years ago, first flight of the Falcon Heavy rocket](https://www.nasa.gov/history/5-years-ago-first-flight-of-the-falcon-heavy-rocket/) (via search summary)
[^slsguide]: [NASA: SLS Reference Guide for Artemis II (December 2025)](https://www.nasa.gov/wp-content/uploads/2025/12/sls-5558-artemis-ii-sls-reference-guide.pdf) (read in full)
[^slssec]: [NASA: SLS secondary payloads fact sheet (Artemis I)](https://www.nasa.gov/wp-content/uploads/2022/08/secondary_payloads_fact_sheet_100321_508.pdf) · [NASA: Artemis I reference](https://www.nasa.gov/reference/artemis-i-2/) (via search summary)
[^a1cubesats]: [NASA (NTRS 20230008495): Artemis I CubeSat results and future options (2023)](https://ntrs.nasa.gov/api/citations/20230008495/downloads/Artemis%20I%20CubeSat%20Results%20and%20Future%20Options%20Conference%20Paper%202023_20230606.docx) (read in full)
[^a1press]: [Universe Today: What happened to those CubeSats launched with Artemis I? (Nov 2022)](https://www.universetoday.com/158787/what-happened-to-those-cubesats-that-were-launched-with-artemis-i/) · [Space.com: Artemis 1 cubesats](https://space.com/artemis-1-cubesats-deep-space-updates)
[^a2]: [NASA: Artemis II](https://www.nasa.gov/mission/artemis-ii/) · [NASA: Artemis II launch day updates (1 Apr 2026)](https://www.nasa.gov/blogs/missions/2026/04/01/live-artemis-ii-launch-day-updates/) · [NASA: Artemis II flight day 10, re-entry (10 Apr 2026)](https://www.nasa.gov/blogs/missions/2026/04/10/artemis-ii-flight-day-10-re-entry-live-updates/) (launch time, splashdown and distances via search summary)
[^a2sci]: [NASA: Artemis II science](https://www.nasa.gov/humans-in-space/artemis-ii-science/) · [NASA: Artemis II press kit](https://www.nasa.gov/artemis-ii-press-kit/) (via search summary)
[^a3]: [NASA: Artemis III mission to test future Moon lander operations (23 Oct 2026, updated 26 Oct)](https://www.nasa.gov/missions/artemis/nasas-artemis-iii-mission-to-test-future-moon-lander-operations/)
[^a4]: [NASA: NASA, partners accelerate lander development for 2028 Moon missions (23 Oct 2026, updated 26 Oct)](https://www.nasa.gov/missions/artemis/nasa-partners-accelerate-lander-development-for-2028-moon-missions/)
[^lcrns]: [Esper et al. (NASA), NASA's Lunar Communications Relay and Navigation Systems, SpaceOps 2025 paper 257](https://www.nasa.gov/wp-content/uploads/2026/02/lcrns-esper-257-1.pdf) (read in full)
[^moonbase]: [NASA: Moon Base phases (updated 12 Nov 2026)](https://www.nasa.gov/moonbase-phases/)
[^clps]: [NASA: Touchdown! Firefly's Blue Ghost lands on Moon](https://www.nasa.gov/news-release/touchdown-carrying-nasa-science-fireflys-blue-ghost-lands-on-moon/) · [NASA: CLPS providers](https://www.nasa.gov/commercial-lunar-payload-services/clps-providers/) (via search summary)
[^im1]: [NSSDCA: Intuitive Machines 1 (Odysseus)](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=IM-1-NOVA): launch mass 1,908 kg, Falcon 9, 15 Feb 2024 (the page returned errors from this environment on 15 Nov 2026; figures via search summary of it) · [NASA: IM-1 press kit](https://www.nasa.gov/wp-content/uploads/2024/01/np-2023-12-016-jsc-clps-im-press-kit-web-508.pdf) (no mass given)
[^lola]: [NASA (NTRS 20170007365): Illumination conditions at the lunar poles](https://ntrs.nasa.gov/api/citations/20170007365/downloads/20170007365.pdf) · [NASA Lunar Surface Data Book (NTRS 20250002845)](https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf) · [NASA SVS: Moon's south pole](https://svs.gsfc.nasa.gov/gallery/moonpole/) (via search summary)
[^rad]: [NASA: Step 3, Artemis: Moon missions as an astronaut testbed for Mars](https://www.nasa.gov/humans-in-space/step-3-artemis-moon-missions-as-an-astronaut-testbed-for-mars/) · [NASA THREE (JSC) risk pages](https://three.jsc.nasa.gov/?sub=nonRisks) (via search summary)
[^moonfact]: [NASA NSSDCA: Moon fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) (the page reset the connection from here; 384,400 km is its well-known mean distance _(verify)_)


---

## As built for the demo: facts checked again (15 Nov 2026)

Each fact the demo shows on screen, re-checked on a NASA page today (agent A). Items still marked _(verify)_ are in the code comments too.

| Fact in the game | Source (checked 15 Nov 2026) |
|---|---|
| Saturn V: Marshall Space Flight Center was given overall responsibility for its development; Wernher von Braun was Marshall's director | [NASA SP-4206, ch. 12](https://history.nasa.gov/SP-4206/ch12.htm) · [NASA: Saturn V F-1 engine arrives at Marshall](https://www.nasa.gov/image-article/saturn-v-f-1-engine-arrives-marshall/) |
| Five F-1 engines, 7.5 million pounds of thrust; 363 ft tall; Apollo 4, the first flight, uncrewed, 9 Nov 1967, Pad 39A, the first "all-up" test of all three stages | [NASA: 55 years ago, Apollo 4](https://www.nasa.gov/history/55-years-ago-apollo-4-the-first-flight-of-the-saturn-v/) |
| Apollo 8 (21 Dec 1968): first crewed Saturn V; first people to orbit the Moon (Borman, Lovell, Anders) | [NASA: Apollo 8](https://www.nasa.gov/mission/apollo-8/) |
| Apollo 11: 16 Jul 1969, 9:32 a.m. EDT, Pad 39A, AS-506; Armstrong, Collins, Aldrin; Eagle and Columbia; Sea of Tranquility, 20 Jul; Aldrin deployed EASEP; splashdown 24 Jul | [NASA: Apollo 11 mission overview](https://www.nasa.gov/history/apollo-11-mission-overview/) |
| Seismometer: two solar panels, worked only in the lunar day; radioisotope heater; about 340-hour night; about three weeks of data; stopped answering at 04:00 UT on 25 Aug 1969; 100–200 meteorite hits | [NASA Science: Apollo 11 seismic experiment](https://science.nasa.gov/resource/apollo-11-seismic-experiment/) |
| Laser reflector: 100 corner cubes, distance to about 3 cm; the Moon recedes about 3.8 cm a year | [NASA Goddard: Apollo laser ranging](https://eclipse.gsfc.nasa.gov/help/ApolloLaser.html) |
| SLS Block 1: more than 95 t to low Earth orbit, more than 27 t to the Moon | [NASA SLS fact sheet (Dec 2025)](https://www.nasa.gov/wp-content/uploads/2026/03/sls-5640-sls-fact-sheet-dec2025-508.pdf) · [SLS Reference Guide for Artemis II](https://www.nasa.gov/wp-content/uploads/2025/12/sls-5558-artemis-ii-sls-reference-guide.pdf) |
| Falcon 9 to the Moon: IM-1's Nova-C weighed 1,908 kg at launch (15 Feb 2024, Falcon 9 from LC-39A); used as a lower bound for lift, rounded down to 1,900 kg. NASA's IM-1 press kit gives no mass | [NSSDCA: Intuitive Machines 1 (Odysseus)](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=IM-1-NOVA)[^im1] |
| Artemis II, Artemis III and IV plans | as above in this note ([^a2], [^a3], [^a4]); III and IV are labelled "NASA's plan" in the game |

Game rules built on these (game estimates, in `src/game/balance.ts`): `LUNAR_NIGHT.sunDays` 14, `MOON_SEND_SHARE` 0.2, `SOUTH_POLE_LINK` 0.3 / 0.85, `SUNLIT_SHARE` (high Earth orbit 0.99, lunar orbit 0.75, Moon's surface 0.67, south pole 0.8), Lunar Module limit 45 kg, Lander 18 kg, Relay Radio as a Payload (30 kB/day). Checked since (15 Nov 2026, Credits session): Kennedy LC-39A/39B coordinates match NASA's Apollo table to the rounding;[^sp4029bg] Saturn V's record: NASA says all 13 launches were successful (not shown in the game);[^satv13] EASEP's 77 kg is on page 394 of NASA SP-4205.[^sp4205]
