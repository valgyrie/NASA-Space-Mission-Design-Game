# LEAP: A Space Mission Design Game

**Watch it on YouTube**

| Video | Link |
|---|---|
| 2-minute video | https://youtu.be/M3r4RiREfuA |
| 30-second video | https://youtu.be/djvGhI7mmnE |
| Main game, tutorial section | https://youtu.be/XW8jWDYuxBc |
| Minigames playthrough | https://youtu.be/MwC3U5vhJKs |

![The LEAP title screen: the main menu in front of SLS on its pad](screenshots/game%20screenshots/title.jpg)

Run a space company. Mine metals, build Parts, design the spacecraft, pick the rocket, check the weather and launch. Along the way you fly the real missions of space history, from Explorer 1 in 1958 to the planned Artemis IV Moon landing.

Every choice moves six bars: Mass, Power, Budget, Data, Communications and Time. When a mission works or fails, the report says why, and a card tells what happened on the real one.

Made for the **NASA Space Apps Challenge 2026**, challenge [Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/). For players from about age 12 up.
## Contents

- [The game](#the-game)
  - [Build your Site](#build-your-site)
  - [Design the Spacecraft](#design-the-spacecraft)
  - [Plan the Launch](#plan-the-launch)
  - [Launch and fly](#launch-and-fly)
  - [Read the Mission Report](#read-the-mission-report)
- [Ways to play](#ways-to-play)
- [Run it](#run-it)
- [Controls](#controls)
- [Future work](#future-work)
- [For developers](#for-developers)
- [Docs](#docs)
- [Credits](#credits)
- [How AI was used](#how-ai-was-used)
- [Licence](#licence)
## The game

### Build your Site

![The Demo Site in 1958: Mines and factories on a coast, money and Raw Materials along the top, the Build menu at the bottom](screenshots/game%20screenshots/site.jpg)

Pick a real place on a globe. Its real 2025 climate, from NASA POWER, shapes the land you get. Put Mines on Deposits of aluminium, copper and silicon, build Factories that turn them into Parts, and sell what you don't need on the Market.

### Design the Spacecraft

![The Mission Designer for Explorer 1: the spacecraft over Earth, the six resource bars, all clear](screenshots/game%20screenshots/designer.jpg)

Take a Contract, then choose a Part for each slot: Bus, Power, Battery, Comms, Pointing, Payload. The spacecraft is put together in front of you. A Test Run shows how it would do before you ship it.

### Plan the Launch

![The Launch planner for Apollo 11's science package: Saturn V picked from the row of rockets, standing on its pad](screenshots/game%20screenshots/planner.jpg)

Choose a rocket that can lift it and a Launch Site (nearer the equator is better), check the weather and book the launch. In Mission Director mode you also plan the Ground Stations that will hear it, and can pay for Ground Tests and Launch Insurance. Bad weather on the day means a Scrub.

### Launch and fly

![Liftoff of SLS from Pad 39B carrying the player's CubeSat on Artemis II](screenshots/game%20screenshots/launch-sls.jpg)

Watch the launch in 3D: liftoff, staging, orbit, and on the Moon missions the trip to the Moon. Then things go wrong, as they do on real missions: point a drifting antenna back at the Ground Station, free a stuck solar panel, keep the batteries alive through an eclipse.

![Explorer 1 in orbit: the "Point the antenna" Anomaly](screenshots/game%20screenshots/anomaly.jpg)

### Read the Mission Report

![The Mission Report for Explorer 1: the first Mission Patch, what happened, the trouble in space, and the real Explorer 1 beside yours](screenshots/game%20screenshots/report.jpg)

The report says what worked and what didn't, and why. It compares your spacecraft with the real one, and a Real History card tells the real story. A successful Mission pays the reward and earns a Mission Patch; Milestones unlock new Parts and rockets.

## Ways to play

- **Campaign.** Space history in order. Era 1: Explorer 1 and TIROS-1. Era 2: Telstar 1 and Syncom 3. Era 3: Apollo 11, where you build the experiments the crew set up on the Moon. The Artemis Era: a CubeSat on Artemis II, then you choose how your Company helps Artemis III and IV. After that, the same Company carries on in Free Play.
- **Free Play.** Start anywhere on Earth in 2026, with made-up Contracts that each say who needs the Data and why.
- **Demo Mode.** A ready Company for each Era (Explorer 1, Telstar 1, Apollo 11, Artemis II), with the factories running and the design done, so you can go straight to the launch.
- **Minigames.** Short 2D games, apart from any Company, each ending with a real fact. In Explorer mode: Build Pluto, Rover Rescue and Planet Parade. In Mission Director mode: Too Hot, Too Cold (keep a satellite's parts at safe temperatures), Square Peg, Round Hole (Apollo 13's carbon dioxide fix) and Lost Signal (Voyager 2's lost contact in 2023).
- **Team Mode.** Two to four players share one Company on one computer. The four roles (Mission lead, Power, Communications, Science) are shared out, each owns its part of the design, and it ships only when every role has signed off.

<p>
<img src="screenshots/game%20screenshots/moon-apollo-11.jpg" width="49%" alt="Apollo 11 on the Moon: the Lunar Module and two astronauts setting up the science package">
<img src="screenshots/game%20screenshots/minigame.jpg" width="49%" alt="Lost Signal, a Mission Director mode Minigame: work the checklist to win back a probe whose antenna points 2° away from Earth">
</p>

There are two game modes. A Company keeps the one it started with, though an Explorer mode Company can switch to Mission Director mode once, from the pause menu:

- **Explorer mode:** pictures and plain words instead of numbers, a simpler Launch planner and links to NASA pages written for young readers.
- **Mission Director mode:** real numbers and a real budget, every Part and planning step. Offers expire, and repeat Test Runs cost money.

![Starting a Company: name, Campaign or Free Play, Explorer or Mission Director, a logo, and a real place on the globe](screenshots/game%20screenshots/new-company.jpg)

Online play (cloud saves, leaderboards, multiplayer and a Weekly Challenge) is still not fully built and switched off for now.

## Future work

- **A better interface.** Improve the UI from what beta players tell us.
- **Playing together.** A multiplayer mode where players work together through the Campaign.
- **The whole Campaign, 1958 to 2028.** To save time we jumped from Apollo 11 straight to Artemis. The missions in between are still to be built: Landsat 1, Hubble, the Lunar Reconnaissance Orbiter, the first Falcon 9 booster landing and Artemis I.
- **Proper hosting.** Put LEAP on a dedicated host, so anyone can play it in a browser without running it on their own computer.
- **Working with space agencies.** Partner with NASA or other space agencies to bring more real data into the game, and their experience into the team.

## Run it

Download the repository (Code → Download ZIP), unzip it, and keep the folder together. Then:

- **Windows:** double-click `LEAP.bat`.
- **macOS:** double-click `LEAP.command`.
- **Linux:** run `./LEAP.sh` in a terminal in this folder, or open `LEAP.sh` with **Run as a program**.

The first start needs internet and takes a few minutes. The launcher downloads its own copy of [Node.js](https://nodejs.org/) into this folder, checks it, and installs the game's packages. You don't need to install anything or have administrator rights. Later starts are quick.

LEAP opens in your browser at [http://localhost:5173](http://localhost:5173). **Keep the launcher window open while you play.** To quit, press **Exit** on the main menu, close the tab, then close the launcher window (or press **Ctrl+C** in it). Closing only the browser tab does not stop LEAP; run the launcher again to get the tab back.

Your Companies are saved in that browser. Use the same browser and address to find them again.

<details>
<summary>If something goes wrong</summary>

- **Setup failed:** the window shows the error. Check your internet connection and run the launcher again.
- **The browser didn't open:** use the link in the launcher window.
- **Port 5173 is in use:** close the other app using it. LEAP always uses the same address, so your browser can find your saves.
- **macOS or Linux says permission denied:** a ZIP can drop the "executable" flag. Run `chmod +x LEAP.sh LEAP.command` once, or start it with `sh LEAP.command` on macOS.
- **Linux needs:** `curl` or `wget`, `tar`, and `sha256sum` or `shasum`; `xdg-open` to open the browser.
- **Computer:** a 64-bit Intel/AMD or ARM computer that the current Node.js LTS supports, and a browser with WebGL. Use a mouse and keyboard; touch is not supported yet.

</details>

## Controls

| | |
|---|---|
| Move | Left-drag, or W A S D / arrow keys |
| Turn and tilt | Right-drag, or Q E to turn and R F to tilt |
| Zoom | Mouse wheel, or + and − |
| Whole Site view | H |
| Pause | Space |
| Menu | Esc |

The pause menu also shows your Company's Seed. Copy it to share your Site; paste it into the Seed field when you create a Company to get the same land in the same place.

## For developers

TypeScript, [three.js](https://threejs.org/) and [Vite](https://vite.dev/). Use the current Node.js LTS.

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # type check and tests; also runs before every commit
npm run build    # production build in dist/
```

- All player-facing text is in [`src/strings.ts`](src/strings.ts); a test fails if text is written anywhere else.
- The 3D models are built from Blender scripts in [`scripts/blender/`](scripts/blender/).
- The online backend (Supabase) is described in [`supabase/README.md`](supabase/README.md).
- The launcher has its own checks, `node --test scripts/leap.test.mjs`. They are run only before a release, on Windows, macOS and Linux.
- Rules for AI coding agents: [`AGENTS.md`](AGENTS.md).

## Docs

- [Game design](docs/GDD.md): what the game is and how each part works
- [Glossary](GLOSSARY.md): the game's terms
- [Checklist](CHECKLIST.md): what's done and what's next
- [Tickets](docs/tickets/README.md): the work, one playable slice at a time
- [Decisions](docs/adr/): choices that are hard to undo, and why
- [Research](docs/research/README.md): every fact and number in the game, with its source
- [Challenge brief](docs/challenge.md)
- [Screenshots](screenshots/README.md)

## Credits

Made by Team Artemis-IV for the NASA Space Apps Challenge 2026. LEAP is a fan-made learning game. It is not made or endorsed by NASA and uses no NASA logo or insignia.

- **Real data:** NASA POWER (climate and launch weather); NASA Blue Marble: Next Generation, Black Marble and one day of VIIRS clouds, via NASA GIBS (the Earth from space); Natural Earth (map data); the NASA Image and Video Library (Real History photos); NASA Mission Viz (GMAT reference trajectories); NASA's *Design and Develop Science Missions* (the four mission Segments), JPL's Concept Maturity Levels and NASA's *CubeSat 101* (design tips). Details and links: [`docs/research/`](docs/research/README.md).
- **3D models and textures:** models made for LEAP in Blender, from scripts in [`scripts/blender/`](scripts/blender/). Photo textures from [Poly Haven](https://polyhaven.com/) (CC0) and [ambientCG](https://ambientcg.com/) by Lennart Demes (CC0). Ground textures repeat without a visible grid using [Inigo Quilez's technique](https://iquilezles.org/articles/texturerepetition/). Every file with its author and licence: [`docs/art/`](docs/art/README.md).
- **Illustrations:** the Era pictures are AI-generated (Canva and ChatGPT image tools) from game screenshots and our prompts, and carry a visible "AI-generated" mark. See [`docs/art/`](docs/art/README.md).
- **Music:** generated by the team with Google Lyria 3.5. **Sound effects:** made in code with Web Audio. See [`docs/audio/`](docs/audio/README.md).
- **Software:** [three.js](https://threejs.org/) and its add-ons, [Vite](https://vite.dev/) and [obscenity](https://github.com/jo3-l/obscenity) (MIT); the [Draco](https://github.com/google/draco) decoder by Google (Apache 2.0); [Blender](https://www.blender.org/) for the models; [Supabase](https://supabase.com/) for the online features.

The in-game Credits screen has the full list with links.

## How AI was used

- **Code:** written by AI coding agents (Claude Code, Codex) from the team's design and tickets, then reviewed and tested by the team. Commits made by an agent say so in their `Co-Authored-By` line.
- **3D models:** written by AI coding agents as Blender Python scripts. Not drawn by hand, and not made by an image or 3D generator. The photo textures on them are real photos.
- **Music:** generated with Google Lyria 3.5. Each track says so in its metadata and carries Google's SynthID mark.
- **Illustrations:** the Era pictures are AI-generated, watermarked, and captioned "Illustration (AI-generated)" in the game.
- **Not AI:** the idea and the game design are the team's. Facts, numbers and photos come from the cited sources in [`docs/research/`](docs/research/README.md). Sound effects are made in code.

## Licence

LEAP's own code and text are under the [Apache License 2.0](LICENSE), the licence NASA Space Apps uses when a team names none. Material from others keeps its own terms: NASA data and photos (NASA media guidelines), Natural Earth (public domain), Poly Haven and ambientCG textures (CC0), three.js, Vite and obscenity (MIT), the Draco decoder (Apache 2.0), and the AI-generated music (Google's terms for Lyria).
