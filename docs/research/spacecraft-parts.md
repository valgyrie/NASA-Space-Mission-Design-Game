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

## How the game uses this

- **Easy mode:** 2–3 options per slot with rounded numbers inside these ranges.
- **Advanced mode:** more options, closer to the table values.
- **Eras:** older Eras get lower values (e.g. Era 1 batteries far below Li-ion, silicon cells before multi-junction). Older-Era numbers are scaled down by the designers and labelled as game estimates, not measurements.

[^pow]: [NASA SoA 3.0 Power (2026)](https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems)
[^gnc]: [NASA SoA 5.0 Guidance, Navigation and Control (2026)](https://www.nasa.gov/smallsat-institute/sst-soa/guidance-navigation-and-control)
[^com]: [NASA SoA 9.0 Communications (2026)](https://www.nasa.gov/smallsat-institute/sst-soa/soa-communications)
[^prop]: [NASA SoA 4.0 In-Space Propulsion (2026)](https://www.nasa.gov/smallsat-institute/sst-soa/in-space_propulsion)
[^avi]: [NASA SoA 8.0 Avionics](https://www.nasa.gov/smallsat-institute/sst-soa/small-spacecraft-avionics) (page marked archived)
