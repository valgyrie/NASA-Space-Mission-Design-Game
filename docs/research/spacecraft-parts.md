# Spacecraft Parts: real numbers

Real-world ranges behind the game's Part stats. The main source is NASA's **State-of-the-Art of Small Spacecraft Technology** (2026 web chapters, May 2026). Numbers marked † came from a summary of the chapter page, not quoted text, so check the chapter PDF before final balancing. Researched 2026-11-07.

## Power

| Item | Real value | Source |
|---|---|---|
| Modern multi-junction solar cells | **~30% efficiency, up to 34%** | SoA §3.2.1 Solar Cells[^pow] |
| Silicon solar cells | **~17%** (AZUR Silicon S 32: 16.8%)† | SoA Table 3-1[^pow] |
| Body-mounted solar panels | **~50–75 W/kg**† | SoA Table 3-2[^pow] |
| Fold-out (deployable) solar arrays | **~40–140 W/kg**† (most 45–70; ROSA 100, MMA Hawk 121) | SoA Table 3-2[^pow] |
| Lithium-ion batteries | **~150–270 Wh/kg** (cells)†; packs **~75–250 Wh/kg**† | SoA §3.4.1, Table 3-5[^pow] |
| Explorer 1 mercury batteries | ~40% of the satellite's mass; lasted 31 days (high-power transmitter) and 105 days (low-power) | [Wikipedia: Explorer 1](https://en.wikipedia.org/wiki/Explorer_1) |

## Pointing (attitude control)

| Item | Real value | Source |
|---|---|---|
| Reaction wheels | **0.06–7.5 kg**, momentum 0.0017–16 N·m·s† | SoA Tables 5-1, 5-3[^gnc] |
| Magnetic torquers | **0.02–0.8 kg**† | SoA Table 5-4[^gnc] |
| Star trackers | **0.04–3 kg**; pointing knowledge ~8 arcsec | SoA Tables 5-1, 5-5[^gnc] |
| Spin stabilisation | Used by Explorer 1 | [Wikipedia: Explorer 1](https://en.wikipedia.org/wiki/Explorer_1) |

## Communications

| Band | Typical data rate | Typical radio mass | Source |
|---|---|---|---|
| UHF (simple antenna) | **~1–64 kbps**† | 10–450 g | SoA Table 9-3[^com] |
| S-band | **~1–7.5 Mbps**† | 70–400 g | SoA Table 9-3[^com] |
| X-band (dish, must point) | **~25 Mbps–1.5 Gbps**† | 130–560 g | SoA Table 9-3[^com] |
| Ka-band | >100 Mbps demonstrated (ISARA) | | SoA §9.2.1[^com] |

Table 9-3 mixes kbps and Gbps in one column; confirm each row in the PDF.

## Propulsion

| Type | Specific impulse (fuel efficiency) | Thrust | Source |
|---|---|---|---|
| Cold gas | **40–110 s**† | 10 µN–3.6 N | SoA Table 4-1[^prop] |
| Hydrazine monopropellant | **180–285 s**† (200–235 s typical, 1 N class) | 0.25–28 N | SoA Table 4-1[^prop] |
| "Green" and bipropellants | **150–310 s**† | 50 mN–22 N | SoA Table 4-1[^prop] |

## Computers

| Item | Real value | Source |
|---|---|---|
| Onboard computers | **~0.4–25 W**†; mass mostly not listed | SoA Table 8-4[^avi] |

## Explorer 1, the tutorial Spacecraft

Checked 2026-11-09 against [Wikipedia: Explorer 1](https://en.wikipedia.org/wiki/Explorer_1). The Mission Designer's Era 1 options are modelled on it.

| Item | Real value | Game (ticket 07) |
|---|---|---|
| Mass | "13.97 kg (30.8 lb), of which 8.3 kg (18 lb) were instrumentation" | Tutorial design 11.5 kg; Juno I lifts ~14 kg |
| Power | "mercury chemical batteries that made up approximately 40% of the payload weight"; high-power transmitter ran 31 days, low-power 105 days | Batteries only; Large Battery (6 kg) lasts ~33 days |
| Radios | "A 60 milliwatt transmitter" (108.03 MHz) and "a 10 milliwatt transmitter" (108.00 MHz) | Simple Antenna uses 0.6 W (rounded up for play) |
| Antennas | "two fiberglasses slot antennas in the body" and "four flexible whips forming a turnstile antenna" | Model shows four whips |
| Pointing | "spinning around its long axis at 750 revolutions per minute"; it ended up tumbling about another axis because flexible parts lost energy | Spin option, no Part (tumbling: future Anomaly) |
| Payload | "Anton 314 omnidirectional Geiger–Müller tube"; "Most of the time the instrument was saturated" | Radiation Detector, 1.5 kg |
| Data storage | No tape recorder on Explorer 1; Explorer 3 "included a tape data recorder" | No Computer slot yet; a recorder fits a later Era 1 Milestone |

All other Era 1 option numbers (Wh, W, kB a day, assembly days, Bus capacity) are game estimates in `src/game/balance.ts`, not measurements.

## TIROS-1, the second Milestone (ticket 14)

| Item | Real value | Game |
|---|---|---|
| Mass | 122.5 kg | A TIROS-1 design weighs 18–21 kg (Era 1 Parts are scaled-down game estimates); still too heavy for Juno I, so it needs Thor-Able |
| Power | About 9,000 solar cells charging nickel-cadmium batteries | Solar Cells (unlocked by Vanguard 1) plus a battery |
| Cameras | Two vidicon TV cameras, wide- and narrow-angle | TV Camera Payload, 4 kg, 40 kB a day, 1.4 W (game estimates); the 3D model shows two |
| Tape recorder | One (Wikipedia) or one per camera (NASA) | Not modelled yet: no Computer slot |
| Pointing | Spin-stabilised, 8–12 rpm | Spin |

Sources: [Wikipedia: TIROS-1](https://en.wikipedia.org/wiki/TIROS-1) · [NASA Science: TIROS](https://science.nasa.gov/mission/tiros/).

## Era 2 Parts (ticket 18)

| Item | Real value | Game |
|---|---|---|
| Telstar 1 | 77 kg sphere, 3,600 solar cells, one transponder relaying one TV channel | Radio Transponder: 3 kg, 1 W, 90 kB of Data a day (game estimates); runs on Solar Cells alone |
| Syncom 3 | 68 kg fuelled, 39 kg after its solid apogee motor burned; 29 W from 3,840 solar cells, in sunlight 99% of the time; two 2 W transponders | Main Engine: 24 kg, the heaviest Part (game estimate, scaled like the other Parts); 99% sunlight in geostationary orbit |
| Large Bus | Syncom and Early Bird were drums 71 cm across | Large Bus: 15 kg, carries 45 kg, 60 days to assemble, Assembly Hall level 3 (game estimates) |

Sources: [Wikipedia: Telstar 1](https://en.wikipedia.org/wiki/Telstar_1) · [NSSDCA: Syncom 3](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1964-047A). Ground Stations (×2 per level 1 station) are game estimates.

## How the game uses this

- **Easy mode:** 2–3 options per slot with rounded numbers inside these ranges.
- **Advanced mode:** more options, closer to the table values.
- **Eras:** older Eras get lower values (e.g. Era 1 batteries far below Li-ion, silicon cells before multi-junction). Older-Era numbers are scaled down by the designers and labelled as game estimates, not measurements.

[^pow]: [NASA SoA 3.0 Power (2026)](https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems)
[^gnc]: [NASA SoA 5.0 Guidance, Navigation and Control (2026)](https://www.nasa.gov/smallsat-institute/sst-soa/guidance-navigation-and-control)
[^com]: [NASA SoA 9.0 Communications (2026)](https://www.nasa.gov/smallsat-institute/sst-soa/soa-communications)
[^prop]: [NASA SoA 4.0 In-Space Propulsion (2026)](https://www.nasa.gov/smallsat-institute/sst-soa/in-space_propulsion)
[^avi]: [NASA SoA 8.0 Avionics](https://www.nasa.gov/smallsat-institute/sst-soa/small-spacecraft-avionics) (page marked archived)
