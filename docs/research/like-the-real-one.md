# Like the real one (ticket 36)

Figures for the real Spacecraft at the end of the Mission Report. Checked 2026-11-14. The game shows only figures listed here; each has its source in `src/game/realCraft.ts`.

The idea comes from NASA Goddard's Webb game "Build It Yourself: Satellite!", whose ending shows the real satellite most like yours ([NASA Science](https://science.nasa.gov/mission/webb/game-build-it-yourself/)).

## Campaign: the Milestone's own Spacecraft

| Spacecraft | Mass at launch | Power | How long it worked |
|---|---|---|---|
| Explorer 1 | 13.97 kg[^e1] | batteries only (mercury batteries)[^e1ten] | last transmission 23 May 1958[^e1nasa] |
| TIROS-1 | 122.5 kg[^tiros] | about 9,000 solar cells and 21 nickel-cadmium batteries[^tiros] | "operational for only 78 days"[^tirosnasa] (NSSDCA: until 15 June 1960) |
| Telstar 1 | 77 kg (NASA: "171-pound") [^telstar] | "covered with solar panels"[^telstar] | worked normally until 23 November 1962, 136 days[^telstarwiki] (see `milestones.md`) |
| Syncom 3 | 68 kg fully fuelled; 39 kg once its apogee motor had burned[^syncom] | 3,840 solar cells (29 W) and nickel-cadmium batteries for Earth's shadow[^syncom] | "turned off in April 1969"[^syncom] |

Syncom 3: the game compares the fuelled 68 kg, because LEAP's Mass bar counts the Main Engine (ticket 36 open point).

## Free Play: a real mission of the same kind

| Contract kind | Spacecraft | Mass at launch | Power | How long it worked |
|---|---|---|---|---|
| Radiation survey | SAMPEX (NASA, 1992; cosmic rays, solar particles and radiation-belt electrons in a 512 × 687 km orbit) | 158 kg[^sampex] | solar panels[^sampex] | data until July 2004, against a planned three years[^sampex] |
| Weather watch | NOAA-18 (NOAA-N, 2005; AVHRR/3 imaging radiometer) | 3,130 lb at liftoff, 1,420 kg[^noaa18lm] | solar array, 833 W[^noaa18lm] | decommissioned 6 June 2025, 17:40 UTC[^noaa18ospo] |
| Orbital relay | TDRS-1 (NASA's first Tracking and Data Relay Satellite, geostationary, 1983) | 2,268 kg[^tdrs] | deployed solar arrays and three nickel-cadmium batteries[^tdrsntrs] | "deactivated on June 27th 2010 following more than 26 years of operation"[^tdrsntrs] |

Not used: NOAA-18's mass is 2,232 kg in the WMO database (via Wikipedia) and 1,457 kg in some mirrors; the builder's 3,130 lb is used. TDRS-1's Wikipedia infobox gives 28 June 2010; NASA's paper says 27 June. NSSDCA has no entries for NOAA-18 or TIROS-N (error pages, 14 Nov 2026).

[^e1]: [Wikipedia: Explorer 1](https://en.wikipedia.org/wiki/Explorer_1)
[^e1ten]: [NASA Science: 10 things to know about Explorer 1](https://science.nasa.gov/missions/explorer/10-things-to-know-about-explorer-1-americas-first-satellite/)
[^e1nasa]: [NASA Science: Explorer 1](https://science.nasa.gov/mission/explorer-1/) ("Last Transmission: May 23, 1958")
[^tiros]: [NSSDCA: TIROS 1](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1960-002B)
[^tirosnasa]: [NASA Science: TIROS](https://science.nasa.gov/mission/tiros/)
[^telstar]: [NASA: Telstar Opened Era of Global Satellite Television](https://www.nasa.gov/history/telstar-opened-era-of-global-satellite-television/)
[^telstarwiki]: [Wikipedia: Telstar 1](https://en.wikipedia.org/wiki/Telstar_1)
[^syncom]: [NSSDCA: Syncom 3](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1964-047A)
[^sampex]: [NSSDCA: SAMPEX](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1992-038A)
[^noaa18lm]: [Lockheed Martin, 9 May 2005: NOAA-N ready for launch](https://news.lockheedmartin.com/2005-05-09-Nations-Newest-Advanced-Polar-Operational-Environmental-Satellite-Built-by-Lockheed-Martin-Ready-for-Launch)
[^noaa18ospo]: [NOAA OSPO: POES status](https://www.ospo.noaa.gov/operations/poes/status.html)
[^tdrs]: [NSSDCA: TDRS 1](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1983-026B)
[^tdrsntrs]: [Olney (NASA), TDRS-1 end-of-mission, NTRS 20110012816](https://ntrs.nasa.gov/citations/20110012816)
