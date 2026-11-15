# Launch Vehicles: catalogue numbers

Payload to **low Earth orbit (LEO)** unless noted. Sources often disagree because they assume different orbits; the game uses the value in **bold** and rounds it. Researched 2026-11-07.

| Launch Vehicle | Era in game | Payload to LEO | Other | Sources |
|---|---|---|---|---|
| Juno I | 1 | **~14 kg** (enough for Explorer 1, 13.97 kg) _(verify: no direct capacity figure found)_ | | [Wikipedia: Explorer 1](https://en.wikipedia.org/wiki/Explorer_1) |
| Vanguard | 1 | _(not researched; used only in the failure story)_ | | |
| Thor-Able | 1 | **120 kg** (to 640 km at 48°) | Launched TIROS-1 (1 Apr 1960, its last flight) | [Astronautix: Thor Able](http://www.astronautix.com/t/thorable.html) · [Wikipedia: Thor-Able](https://en.wikipedia.org/wiki/Thor-Able) |
| Thor-Delta | 2 | **226 kg** (Astronautix) / 270 kg (Wikipedia) | GTO: **45 kg** | [Wikipedia](https://en.wikipedia.org/wiki/Thor-Delta) · [Astronautix](http://www.astronautix.com/t/thordelta.html) |
| Delta A | 2 | **250 kg** | | [Astronautix: Thor Delta A](http://astronautix.com/t/thordeltaa.html) |
| Delta D | 2 | **450 kg** | GTO: **104 kg**. Launched Syncom 3 to GEO | [Astronautix: Thor Delta D](http://www.astronautix.com/t/thordeltad.html) · [Wikipedia: Delta D](https://en.wikipedia.org/wiki/Delta_D) |
| Saturn V | 3 | **~140,000 kg** (incl. Moon-departure fuel); other sources 118,000–120,000 kg | | [Wikipedia: heavy-lift launch vehicle](https://en.wikipedia.org/wiki/Heavy-lift_launch_vehicle) |
| Delta 900 | 3 | **816 kg** to Sun-synchronous orbit (Gunter's); ~1,680 kg LEO _(verify)_ | Launched Landsat 1; 2 flights, both from Vandenberg, 1972 | [Gunter's: Delta](https://space.skyrocket.de/doc_lau/delta.htm) · details in [eras-3-5.md](eras-3-5.md) |
| Space Shuttle | 4 | **27,500 kg** | Crewed; deployed Hubble | [Wikipedia: heavy-lift launch vehicle](https://en.wikipedia.org/wiki/Heavy-lift_launch_vehicle) |
| Pegasus XL | 4 | **443 kg** (185 km, 28.5°) | Air-launched; first own-rocket model | [Wikipedia: Pegasus](https://en.wikipedia.org/wiki/Northrop_Grumman_Pegasus) |
| Atlas V 401 | 4 | **9,800 kg** | GTO: 4,750 kg | [ULA mission booklet](https://www.ulalaunch.com/docs/default-source/news-items/av_oa7_mob.pdf) · [Gunter's](https://space.skyrocket.de/doc_lau/atlas-5.htm) |
| Falcon 9 | 5 | **22,800 kg** expendable · **15,600 kg** with booster landing | Reusable booster | [Space Odyssey Hub](https://spaceodysseyhub.com/compare/rockets/falcon-9-vs-atlas-v) _(secondary source)_ |
| SLS Block 1 | 5 | **95,000 kg** | Artemis | [Wikipedia: super heavy-lift](https://wikipedia.com/wiki/Super_heavy_rocket) |

## Juno I: how Explorer 1 flew (ticket 10)

Used for the 3D Launch. Researched 2026-11-09.

| Fact | Value | Source |
|---|---|---|
| Stages | 4: a Jupiter-C first stage based on the Redstone missile, then three solid-fuel stages | [Wikipedia: Juno I](https://en.wikipedia.org/wiki/Juno_I) |
| Height | 21.2 m (Jupiter-C infobox says 21.3 m) | Juno I · [Wikipedia: Jupiter-C](https://en.wikipedia.org/wiki/Jupiter-C) |
| First stage | 1 Rocketdyne A-7 engine, Hydyne/LOX, burns **155 s** (Jupiter-C text says burnout 157 s after launch) | Juno I infobox · Jupiter-C |
| Upper stages | Scaled-down Sergeant solid motors in a spinning "tub": **11** (stage 2) as an outer ring round **3** (stage 3); **1** (stage 4) on top | Juno I infobox · Jupiter-C |
| Upper-stage burns | **6 s** each (Jupiter-C general characteristics say 6.5 s) | Juno I infobox |
| Coast | The second stage fired at the top of the climb "after a coasting flight of about **247 seconds**" | Jupiter-C |
| Spin | The tub was set spinning on the pad, 450–750 rpm, "to compensate for thrust imbalance" | Juno I · Jupiter-C |
| Fourth stage | Stayed on: Explorer 1 and the empty fourth-stage casing orbited as one, spinning at 750 rpm | [Wikipedia: Explorer 1](https://en.wikipedia.org/wiki/Explorer_1) |
| Orbit | 358 × 2,550 km, 114.80 min, 33.24° | Explorer 1 |

**Game notes**
- The game reads the 247 s coast as starting at first-stage burnout, so stage 2 fires at T+402 s and Explorer 1 reaches orbit at T+420 s, about 7 minutes _(verify: no source gives Explorer 1's own insertion time; the Jupiter-C page describes the design)_. No gaps between upper stages _(verify)_.
- The climb's shape (lean, speed, height) on screen is drawn to look right; no numbers from it are shown.

**Game notes (catalogue)**
- The Falcon 9 numbers show a real trade-off: landing the booster costs about a third of the payload, but the rocket can fly again.
- GEO and Moon capacities are much lower than LEO. Use GTO numbers where found, and a fixed fraction of LEO otherwise _(document the fraction when chosen)_.
- **Rideshare price:** recent third-party reports put SpaceX's sun-synchronous rideshare at about **$7,000/kg** in 2026 (about $350,000 for 50 kg), up from about $5,500–6,000/kg earlier. SpaceX publishes no official price card. Sources: [NewSpace Economy: rideshare market 2026](https://newspaceeconomy.ca/2026/02/27/satellite-ridesharing-market-analysis-2026/) · [SpaceNexus: rideshare launches](https://spacenexus.us/blog/rideshare-launches-small-satellites-affordably).

## Thor-Able: how TIROS-1 flew (ticket 14)

Researched 2026-11-10.

| Fact | Value | Source |
|---|---|---|
| Height | 26.9–27.8 m (Wikipedia); Astronautix says 30.00 m. The game uses **27 m**. | [Wikipedia: Thor-Able](https://en.wikipedia.org/wiki/Thor-Able) · [Astronautix](http://www.astronautix.com/t/thorable.html) |
| Stage 1 | Thor, 1 × LR79-7, burns **165 s** | Wikipedia · Astronautix |
| Stage 2 | Able, 1 × AJ10-101, burns **115 s** | Wikipedia · Astronautix |
| Stage 3 | Altair, 1 × X-248 solid, burns **38 s** (optional third stage) | Wikipedia |
| Payload | **120 kg** to a 640 km orbit at 48° | Wikipedia · Astronautix |
| Flights | First 24 Apr 1958; last 1 Apr 1960 (Thor-Able 148, "Thor DM-18 Able-II", orbiting TIROS-1) | Wikipedia |

**Game notes**
- The 10 s gap between stage 1 and stage 2 is a game estimate _(verify)_; the show calls it "Staging", not a coast. No gap before stage 3 _(verify)_.
- Rideshare $25,000 per kg is a game estimate (bigger rocket, cheaper per kg). It opens after Explorer 1, since it first flew in April 1958.
- The 3D model's proportions (Thor narrowing towards the top, slim Able, Altair on a spin table) are approximate.

## Launch records: how often Juno I and Thor-Able worked (ticket 17)

Researched 2026-11-10.

| Rocket | Record | Details | Source |
|---|---|---|---|
| Juno I | **3 of 6** reached orbit (50%), all in 1958 | Explorer 1 (1 Feb), Explorer 3 and Explorer 4 reached orbit; Explorer 2, Explorer 5 and Beacon 1 didn't. Last flight 23 Oct 1958, a failure. Then replaced by Juno II. | [Wikipedia: Juno I](https://en.wikipedia.org/wiki/Juno_I) |
| Thor-Able | **10 of 16** worked; 6 failures, 1958–1960 | 9 sub-orbital re-entry tests, 4 probes, 3 satellites, all from LC-17A. Three failures were the Altair third stage not firing (Pioneer 2, Transit 1A, and one more); Pioneer 0's Thor exploded at 77 s (turbopump). | [Wikipedia: Thor-Able](https://en.wikipedia.org/wiki/Thor-Able) |

**Game notes**
- The game's reliability is kinder than history, so the design decides most results: each rocket's real failure share is cut to 40% of itself (game estimate). Juno I works **80%** of the time, Thor-Able **85%**. The planner shows both the game figure and the real record.
- The Company's first Launch always works (Explorer 1 did), so the tutorial can't be lost to luck.
- Which stage fails is drawn evenly among the stages (game choice; real failures happened at every stage).
- Both Launch Sites launch east over the Atlantic, so a failed rocket falls into the sea: the Launch show says so (the GDD's "coast effect").

## Thor-Delta and Delta D: Era 2 (ticket 18)

Researched 2026-11-11.

| Fact | Thor-Delta | Delta D | Source |
|---|---|---|---|
| Height | 31 m | 32 m | Astronautix (both) |
| Stage 1 | Thor DM-19, burns **165 s** | Thor (Thrust Augmented), **150 s**, with **3 Castor** solid boosters (**27 s**) | [Wikipedia: PGM-17 Thor](https://en.wikipedia.org/wiki/PGM-17_Thor) · [Astronautix: Thor Delta D](http://www.astronautix.com/t/thordeltad.html) |
| Stage 2 | Delta (AJ10-118), **115 s** | Delta D, **170 s** | [Astronautix: AJ10-118](http://www.astronautix.com/a/aj10-118.html) · Astronautix: Thor Delta D |
| Stage 3 | Altair (X-248), **38 s** | Altair 2, **28 s** | Thor-Able table above · Astronautix: Thor Delta D |
| Payload | LEO 226 kg, GTO 45 kg | LEO 450 kg, GTO 104 kg | Astronautix |
| Record | **12 flights, 11 worked** (13 May 1960 – 18 Sep 1962); the first (Echo 1) failed | **2 flights, both worked**: Syncom 3 (19 Aug 1964), Intelsat I / Early Bird (6 Apr 1965) | [Wikipedia: Thor-Delta](https://en.wikipedia.org/wiki/Thor-Delta) · [Wikipedia: Delta D](https://en.wikipedia.org/wiki/Delta_D) |
| Launch price | AT&T paid NASA **$2,680,982** in advance for Telstar 1's launch | not found | [Wikipedia: Telstar 1](https://en.wikipedia.org/wiki/Telstar_1) (Congressional Record, 17 Aug 1962) |

**Game notes**
- Reliability: Thor-Delta's failure share (1/12) cut to 40% gives 97%; Delta D never failed, but two flights can't show that, so it gets the same 97% (game choice).
- Rideshare $20,000/kg (Thor-Delta) and $30,000/kg (Delta D), Delta D's whole-rocket $3.5M: game estimates. Thor-Delta's whole rocket, $2.7M, is AT&T's real payment, rounded.
- Juno I and Thor-Able retire in Era 2 (last flights 1958 and 1960).
- 10 s between stage 1 and stage 2 is a game estimate, as for Thor-Able _(verify)_. The 3D models leave out the nose fairing and are drawn shorter than 31–32 m, so the Spacecraft shows.

## Falcon 9: modern Free Play (ticket 21)

Checked 2026-11-12 against [Wikipedia: Falcon 9](https://en.wikipedia.org/wiki/Falcon_9) (Full Thrust figures, citing SpaceX's specifications and 2015 press kit). The SpaceX vehicle page returned an access error in this environment.

- **70 m** tall (69.8 m, rounded); two stages, **nine Merlin engines** on the first and **one vacuum Merlin** on the second. First-stage burn **162 s**, second **397 s**; real Mission profiles vary.
- Maximum **expendable** capacity: **22,800 kg** to Low Earth Orbit and **8,300 kg** to geostationary transfer orbit. These are not booster-recovery capacities. A Spacecraft still needs its Main Engine to reach geostationary orbit.
- The catalogue uses those expendable limits. Booster landing, fairing separation and mission-specific burns are left out. The low-poly model is shortened to fit the existing pad shot, like the Thor models, with the fairing omitted to show the player's Spacecraft. No real logos.
- **Game estimates:** $7,000/kg for either supported orbit (the existing rideshare research above gives its scale, not a quote for this service), 98% rocket reliability, 3 s staging gap. No fixed real flight record is displayed for a rocket still flying. This ticket does not add a landing mini-game or an owned rocket.
