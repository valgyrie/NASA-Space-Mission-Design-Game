# 52: Era 5, reusable rockets and Artemis (2015–2028)

**What to build:** the last Campaign Era, up to the finale. Milestones: the first Falcon 9 booster landing, Artemis I, Artemis II, then **Artemis III and Artemis IV, where the player chooses how the Company helps**. After the finale the Campaign continues as Free Play, which gets the same Moon Contracts. Asked for by the team on 15 Nov 2026 ("for Artemis 3 and Artemis 4, give the player a choice to do whatever he wants, in the campaign and in Free Play").

**Blocked by:** 51

**Status:** planned (15 Nov 2026); facts checked and numbers proposed 15 Nov 2026 against NASA's Artemis plans of 23–26 Oct 2026. Ready for a coding agent once the open questions below are answered (or their proposed defaults accepted). Re-check Artemis III and IV before release: they are in the future.

**Research:** [`docs/research/eras-3-5.md` § Era 5](../research/eras-3-5.md#era-5-20152028-reusable-rockets-and-artemis). Numbers below are **game estimates** unless they say "real".

**Design:**

- **Era 5 starts 1 January 2015** in the Campaign (Free Play keeps starting on 1 January 2026). HQ level 5. The Space Shuttle retires ("Retired: last flew in 2011", real); Falcon 9 opens; Atlas V 401 stays open (still flying in 2026); Falcon Heavy shows "Opens in 2018" and SLS "Opens in 2022" until their real first flights.
- **Falcon 9 booster landing.** Client ORBCOMM (a real company; no logo). A messaging satellite on Falcon 9, like the eleven ORBCOMM OG2 satellites (real: about 170 kg each, built by Sierra Nevada) launched on **21 December 2015**, when the first stage landed at Landing Zone 1 about nine minutes after liftoff. Low Earth Orbit 750 km, 45° _(tilt verify)_; Payload: Radio Transponder; Data **75 days** (real: launch to Sierra Nevada handing the satellites over, early March 2016). Reward **$15M**. The Launch show lands the booster after this Milestone.
- **After the landing.** Real rideshare prices per kilogram went **up**, not down (about $5,000/kg in 2019 _(verify)_, $7,000/kg in 2026). Proposed: the landing opens Falcon 9 Rideshares at $7,000/kg and lowers the whole-rocket price; the card says boosters now fly again and again (B1021 was first to refly, 30 March 2017, SES-10). Do not say rideshares became cheaper per kilogram. See open question 1.
- **Artemis I** (support). Client NASA. A **CubeSat (6U)** riding on SLS with the uncrewed Orion (real: 16 November 2022), as ten real CubeSats did, out past the Moon. At most **14 kg** (real Artemis I limit). Payload: Radiation Detector (real: BioSentinel used yeast as a living radiation detector; links back to Explorer 1). Data **25 days** (Orion's flight, 16 November–11 December 2022). Reward **$8M**; the ride is free (NASA picked the real CubeSats). Its "after" card: NASA heard from 8 of the 10 CubeSats and 5 met some or all of their goals; deep-space CubeSats are easily lost if they don't make contact soon after release.
- **Artemis II** (support). The crewed flight around the Moon: real launch **1 April 2026**, splashdown **10 April 2026** off San Diego (9 days 1 hour 32 minutes); crew Reid Wiseman, Victor Glover, Christina Koch and Jeremy Hansen (Canadian Space Agency); farthest point 252,756 miles, a record. The Company's part is what really flew: **four international 12U CubeSats** (ATENEA from Argentina, K-Rad Cube from Korea, TACHELES from Germany, Space Weather CubeSat-1 from Saudi Arabia) released in high Earth orbit about a third of the way to the Moon. Proposed Contract: a **CubeSat (12U)**, at most **26 kg**, with a Radiation Detector crossing the Van Allen belts, as K-Rad Cube did. Orbit 185 × 74,080 km (real SLS/Orion high Earth orbit). Data **1 day** (real: about a day from release to re-entry), or longer if the player adds a Main Engine to stay up. Reward **$6M**; free ride.
- **Artemis III: your choice.** Real plan (NASA, 23 October 2026): in **2027** a crew (Randy Bresnik, Frank Rubio, Andre Douglas, ESA's Luca Parmitano) flies Orion to low Earth orbit for **14 days**, docks with a Blue Moon Mark 2 test article (waiting in a circular orbit about 440 km up), spends about two days testing it, then docks with a Starship test article. The board offers three ways to help, all game ideas built on real needs; the player picks one (or more for extra reward): a **camera satellite** that watches the dockings (TV Camera, Reaction Wheels), a **relay** for times Orion cannot reach mission control (NASA's plan studies exactly that), or a **space-weather watch** for the crew (Radiation Detector). Low Earth Orbit about 440 km; Data **14 days** (the planned mission length). Reward **$12M** each, **+$6M** for each extra choice. Any one completes the Milestone.
- **Artemis IV: your choice (finale).** The planned first crewed landing since 1972, near the Moon's south pole, in **2028**. Real (23 October 2026): neither SpaceX's Starship nor Blue Origin's Blue Moon has been assigned; NASA will pick by readiness. Three ways to help, each built on a real need:
  - **Lunar relay satellite** (Relay Radio) in a high polar lunar orbit, about 4,760 km up. Real: straight to Earth, a south-pole site has 17–43% coverage; one relay makes it 80–86% (NASA's LCRNS paper, 2025); Intuitive Machines' Altus-1 is to be the first commercial relay. Data **30 days** (the crew's trip and stay).
  - **Cargo lander** (Lander + Science Package) on a sunlit south-pole ridge. Real: NASA's CLPS landers, e.g. Firefly's Blue Ghost Mission 1 (2 March 2025, about 346 hours of daylight) and Intuitive Machines' IM-2 (6 March 2025, the southernmost landing ever). Data **14 days** (one lunar day).
  - **Moon Mapper** in a 50 km polar orbit scouting the landing site. Real: LRO's laser altimeter maps the south pole, even inside shadowed craters. Data **27 days** (one turn of the Moon under a polar orbit).
  
  Reward **$30M** each. Any one finishes the Campaign; a closing card, then "Continue in Free Play" with the same Company. The other choices stay as optional Contracts.
- **The south pole's sunlight and radio:** proposed sunlight share **0.8** on a south-pole ridge (real: LOLA gives 70–88% on Connecting Ridge; the Sun never rises more than about 7°). Without a relay, a Spacecraft on the south pole sends Data **30%** of the time; with the Company's relay in lunar orbit, **85%** (game estimates built on NASA's 17–43% and 80–86%).
- **New Parts** (game estimates, Mk 1):

  | Part | Slot | Mass | Numbers | Days to make | Factory |
  |---|---|---|---|---|---|
  | CubeSat Bus (6U) | Bus | 2 kg | carries 12 kg, 20 days to assemble, Assembly Hall level 1 | 4 | Metal Works |
  | CubeSat Bus (12U) | Bus | 4 kg | carries 22 kg, 25 days | 5 | Metal Works |
  | Lander | Propulsion | 40 kg | legs and a landing engine; needed for the surface | 12 | Metal Works |
  | Relay Radio | Comms | 3 kg | 4 W; passes 600 kB/day between other Spacecraft and Earth | 5 | Electronics Lab |

  Checks: an Artemis I CubeSat (6U Bus, Radiation Detector, Solar Cells, Small Battery, Simple Antenna) weighs 9.5 kg; if antennas send less beyond the Moon (ticket 50, open question 3) it needs the Dish Antenna and weighs 11.5 kg, close to the real 14 kg limit. An Artemis IV relay weighs about 72 kg.
- **Rockets** (lift real; prices and reliability game estimates):
  - **SLS Block 1 with Orion**: 98 m; two five-segment solid boosters (126 s) with four RS-25 engines on the core stage (480 s), then the ICPS upper stage, then "Off to the Moon". Lift to the Moon 27,000 kg (real). Kennedy LC-39B on Mobile Launcher 1. NASA's own: CubeSats NASA picked ride free; no Rideshare. Reliability 0.97 (real: 2 of 2).
  - **Falcon Heavy**: 70 m; three cores, 27 engines; side boosters separate and land side by side (real first flight, 6 February 2018, LC-39A: both side boosters landed, the centre core was lost). Lift 63,800 kg low orbit, 26,700 kg geostationary transfer _(verify on spacex.com)_. Rideshare $7,000/kg; whole launch $90M (no verified price). Reliability 0.97.
  - **Falcon 9**'s first stage lands at LZ-1 in the show after the booster-landing Milestone.
- **Free Play:** generated Moon Contracts (lunar relay, lunar mapping, cargo to the surface) and the three Artemis choices as Contract kinds, once the Company has the Parts. The Weekly Challenge is unchanged.
- **Like the real one:** ORBCOMM OG2 about 170 kg; BioSentinel or K-Rad Cube (6U ≤14 kg, 12U ≤26 kg); LRO for the Moon Mapper. The relay and cargo-lander choices compare with plans, not flown craft: say so.
- **Demo Mode:** an Era 5 save.

**Code areas:**
- `src/game/eras.ts`: `MODERN_ERA` is Free Play's Era 5 with `ERA_START_UTC[5]` = 2026; the Campaign needs 2015 (a per-mode start, or a Campaign-only entry).
- `src/game/contracts.ts`: Milestones `falcon9Landing`, `artemis1`, `artemis2`, `artemis3`, `artemis4`; a "choice" Milestone that any one of several Contracts completes; new `Orbit`s (`highEarthOrbit`, `beyondMoon`, `lunarSouthPole`; `lunarOrbit` from ticket 51); Free Play templates and `QUESTIONS` for Moon Contracts.
- `src/game/balance.ts`: `RECIPES`, `OPTION_STATS`, `CONTRACT_REWARD`, `CONTRACT_DEADLINE_DAYS`, `SUNLIT_SHARE.lunarSouthPole`, relay share, `RIDESHARE_PER_KG`, `LAUNCH_PRICE`, `ROCKET_RELIABILITY`.
- `src/economy/part.ts`; `src/game/spacecraft.ts` (CubeSat Buses, Lander, Relay Radio, the relay rule); `src/game/flight.ts`, `anomalies.ts`, `mission.ts` (finale, Continue in Free Play).
- `src/game/launchVehicles.ts`: `falconHeavy`, `sls` (opens-in years), Falcon 9 landing flag; `src/game/history.ts` (cards, finale), `realCraft.ts`, `sources.ts`, `demo.ts`, `space.ts` (Moon orbits and the south pole), `src/strings.ts`.
- `src/world/rocketMesh.ts`, `launchPad.ts`, `launchModels.ts`, `launchView.ts` (booster landing, side boosters), `spacecraftMesh.ts`, `spaceView.ts`; `src/ui/contractsPanel.ts` (the choice board), `launchShow.ts`, `eraCard.ts`, `historyCard.ts`.
- `scripts/blender/build_launch.py` (SLS with Orion on its mobile launcher, Falcon Heavy, LZ-1), `parts.py` (CubeSats, lander, relay satellite); `src/save/save.ts`. Overlaps ticket 48 (CubeSat sizes): share the CubeSat Buses.

**Art (Blender):** SLS with Orion and its mobile launcher, Falcon Heavy, the Falcon 9 booster landing, CubeSat, lander, relay satellite.

**Open questions for the team:**
1. After the booster landing: real rideshare prices per kilogram rose (2019 to 2026). Keep "cheaper Rideshares" as a game simplification, or make the landing open Rideshares and lower only the whole-rocket price (proposed)?
2. Artemis II's Data is about a day in reality. Keep 1 day (the challenge is mass and radio, not Power), or let a Main Engine keep the CubeSat up longer for more reward?
3. CubeSat Buses: two new Buses here (6U, 12U), or build ticket 48's sizes first and reuse them?
4. Artemis III and IV are in the future. If NASA changes the plan again before release, who re-checks the cards (the plans here are from 23–26 October 2026)?
5. Should the finale card name the Artemis IV lander once NASA assigns one, or stay neutral?

**Done when:**
- [ ] HQ Upgrade after Era 4 opens Era 5 (2015); Free Play still starts in 2026
- [ ] Falcon 9 booster landing Milestone; Falcon 9 Rideshares afterwards (price rule as decided)
- [ ] Artemis I and Artemis II support Milestones
- [ ] Artemis III and Artemis IV offer three choices each; any one completes the Milestone
- [ ] Finale card, then Continue in Free Play; Free Play offers Moon Contracts
- [ ] SLS and Falcon Heavy in the catalogue and the 3D Launch; new Parts with 3D models
- [ ] Real History cards, facts cited, future dates marked; Era 5 in Demo Mode
- [ ] Old saves load; Seeds unchanged; tests; browser check at 1280×800 and 1024×768


## As built (demo, 15 Nov 2026)

Cut down by `docs/eras-demo/PLAN.md`: the Campaign's Artemis Era starts **1 January 2026** (same day as Free Play), right after Era 3. No Falcon 9 booster landing, Artemis I, Falcon Heavy, CubeSat 6U or Free Play Moon Contracts.

- **Artemis II** (`artemis2`): high Earth orbit 185 × 74,080 km, Radiation Detector, 1 day, $6M. NASA ride on SLS from `kennedy39B`, ≤ 26 kg, and the Bus must be the **CubeSat Bus (12U)** (`cubeSat`, problem "needsCubeSat").
- **Artemis III** (Choice Milestone `artemis3`): `artemis3Camera` (TV Camera), `artemis3Relay` (Relay Radio), `artemis3SpaceWeather` (Radiation Detector); Low Earth Orbit 440 km, 14 days; $12M, extra choices $6M; Falcon 9 from the Cape.
- **Artemis IV** (Choice Milestone `artemis4`, the finale): `artemis4Relay` (lunar orbit 4,760 km, polar, Relay Radio, 30 days), `artemis4CargoLander` (south pole, Science Package + Lander, 14 days), `artemis4Mapper` (lunar orbit 50 km, polar, TV Camera, 27 days); $30M, extra $15M. Any one completes the Campaign: closing card "From Explorer 1 to the Moon", then Continue in Free Play.
- **Board**: each Choice Milestone's Contracts side by side, each with a "Why NASA needs it" line, and a note that it is NASA's plan of 23 October 2026.
- **Rules**: lunar orbit needs a Main Engine; landing alone needs a **Lander** (Propulsion, 18 kg, lighter than proposed so it fits the Large Bus); south pole sunlight 0.8; Data gets home ×0.2 from the Moon, and at the south pole ×0.3 alone or ×0.85 once `artemis4Relay` is done.
- **SLS** (`sls`, `nasaOnly`): 98.3 m; boosters + 4 RS-25 · 126 s, core · 360 s (to ~486 s), ICPS · 30 s; 27,000 kg to the Moon, 95,000 kg low orbit. Falcon 9 to the Moon 1,900 kg (IM-1's Nova-C, about 1,908 kg, _(verify on a NASA page)_).
- **Parts**: CubeSat Bus (12U) (4 kg, carries 22 kg, 25 days, Hall 1), Relay Radio (Payload, 3 kg, 4 W, 30 kB/day), Lander.
- **Cards**: Artemis II before/after (facts flown); Artemis III and IV marked "NASA's plan".
- **Launch show**: `'moon'` segments `{ kind: 'artemis2' }`, `{ kind: 'artemis3', choice }`, `{ kind: 'artemis4', choice }`.
- **Demo Mode**: Artemis Era start with the Artemis II CubeSat ready and spare Parts for Artemis III and IV.
- Tests: `src/game/era5.test.ts`.
