# LEAP: A Space Mission Design Game

_Launch · Engineer · Advance · Pioneer_

Run a space company, design spacecraft, and relive real space history from Explorer 1 (1958) to Artemis IV, learning the real trade-offs of mission design along the way.

Built for the **NASA Space Apps Challenge 2026**: [Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/).

**Status:** early build. Campaign Eras 1 and 2 and modern Free Play are playable. Demo Mode offers ready Companies for both Campaign Eras.

## How to play

1. **Start a Company.** Name it and pick where on Earth to build. Real climate data shapes your Site.
2. **Build.** Place Mines on deposits, Factories to turn Raw Materials into Parts, and sell what you don't need on the Market.
3. **Take a Contract.** The first is Explorer 1, America's first satellite (1958).
4. **Design the Spacecraft.** In the Mission Designer, pick a Part for each slot and keep the six bars (Mass, Power, Budget, Data, Communications, Time) in the green. A free Test Run shows how it would do.
5. **Launch.** Choose a rocket that can lift it, ship it to the Launch Site, watch the weather, and fly. Fix Anomalies in flight.
6. **Read the Mission Report.** It explains what worked and why. Real History cards tell what happened on the real mission.

Milestones unlock new Parts and rockets; an HQ Upgrade takes the Company into the next Era. After Era 2 the Company carries on in modern Free Play. No time to build? **Demo Mode** on the main menu starts a ready Company.

## Run it

Download or clone the repo, then extract it if it is a ZIP. Keep the whole folder together.

- **Windows:** double-click `LEAP.bat`.
- **macOS:** double-click `LEAP.command`.
- **Linux:** open `LEAP.sh` with **Run as a program**; it opens a terminal for setup and quitting. You can also run `./LEAP.sh` in a terminal in this folder.

The launcher downloads a private copy of [Node.js](https://nodejs.org/), checks its checksum, and installs the packages in `package-lock.json`. No npm commands or administrator access needed. Setup stays in this folder. The first start needs internet and may take a few minutes; progress bars and short messages explain each step. Later starts check the packages and install any dependency changes after a game update. If needed, the launcher checks for a newer Node.js LTS release too.

LEAP opens at [http://localhost:5173](http://localhost:5173) once it is ready. **Keep the launcher window open while you play.** To quit, close that window or press **Ctrl+C** there. Closing the browser tab does not stop LEAP. Run the launcher again to reopen the browser: it tells you if LEAP is already running and shows the same link. Closing that second window leaves the first one running.

Use a 64-bit Intel/AMD or ARM computer supported by the current Node.js LTS. Linux needs `curl` or `wget`, `tar`, and `sha256sum` or `shasum`; `xdg-open` opens the browser. If the browser does not open, use the link in the window. If executable permissions were lost in a ZIP, run `chmod +x LEAP.sh LEAP.command` once. On macOS, you can also run `sh LEAP.command` in Terminal.

If setup fails, the window keeps the error visible. Check the message and your connection, then try again. If another app uses port 5173, close that app first; LEAP keeps the same address so your browser can find your existing save.

### For development

The existing npm commands still work. Use the current Node.js LTS.

```bash
npm install
npm run dev
```

The game opens at [http://localhost:5173](http://localhost:5173).

### Play

**Title:** choose **Let’s go** to open the main menu over a live Site. **Learn more →** links beside real missions, rockets and science open their sources in a new tab.

**Main menu:** Continue your Company, or start one if you have no save. **Demo Mode** offers Era 1 (Explorer 1) and Era 2 (Telstar 1), with working buildings, Parts and a prepared design. Open the Mission Designer to try a Test Run or ship. Your own Company is kept; selecting an Era starts the demo afresh. Use **Main menu** in the pause menu to return.

**Camera:** left-drag (or W A S D / arrows) to move, right-drag to turn and tilt (or Q E to turn, R F to tilt down to the horizon), mouse wheel (or + −) to zoom. **H** goes back to the view of your whole Site.

**Sound:** music and effects start after your first click or key. Adjust their separate volumes (0 mutes) in the main or pause menu; Audio credits lists the music and original effects. Settings stay in this browser.

**Credits:** on the main menu. It lists the team, every real dataset, photo credits, reading sources, music and software.

**Keys:** Space pauses. Esc opens the menu (your Seed and the controls).

**Online:** open it from the main menu or the Free Play pause menu. Generate a nickname or choose a filtered, made-up one. Keep a private copy of the recovery code to continue on another computer. **Save to cloud** saves your Free Play Company and updates four leaderboards. **Load cloud Company** asks before replacing the Company on this browser. Saves are manual; local play still works offline. No email or password is needed. Backend setup and deployment notes are in [`supabase/README.md`](supabase/README.md).

**Weekly Challenge:** in Online with a Free Play Company, design with the same budget and Parts as everyone else. Test for free, submit attempts and keep your best score. Every finisher gets the same weekly Mission Patch; the final top three earn podium badges. Your Company save is kept.

**Share a Site:** Esc → Copy includes the Seed and location. Use **New Company from a Seed** on the main menu and paste the code into the Seed field. Starting asks before replacing an existing Company. A raw Seed still works with the location you choose.

**Market:** open it under your Company name. Sell Raw Materials in 10 kg lots, or Parts one at a time, for money.

**Contracts and Mission Designer:** both buttons are under your Company name. The Mission Designer pauses the Site: pick a Part for each slot, turn the 3D Spacecraft by dragging, and watch the six bars (Mass, Power, Budget, Data, Communications, Time). Missing Parts can be bought right there.

**Checks:** `npm run check` runs the type check and tests. They also run before every commit and stop it if anything fails.

**Launcher checks (final ticket only):** these are separate from the game tests and do not run on each ticket or update. At the final ticket, run `node --test scripts/leap.test.mjs` on Linux with port 5173 free, then check a clean first start, progress bars, reopening and quitting on Windows, macOS and Linux.

## Credits

Made by Team Artemis-IV for the NASA Space Apps Challenge 2026. Code and art written with AI coding agents, then reviewed and tested by the team. LEAP is a fan-made learning game, not made or endorsed by NASA.

- **Real data:** NASA POWER (climate and launch weather), NASA Blue Marble: Next Generation via NASA GIBS (globe colours), Natural Earth (public domain map data) and the NASA Image and Video Library (Real History photos). Details: [`docs/research/`](docs/research/).
- **Music:** generated by the team with Google Lyria 3.5. **Sound effects:** made in code with Web Audio. Details: [`docs/audio/`](docs/audio/README.md).
- **Software:** [three.js](https://threejs.org/), [Vite](https://vite.dev/) and [obscenity](https://github.com/jo3-l/obscenity) (all MIT licence); [Supabase](https://supabase.com/) for online features.

The in-game Credits screen has the full list with links.

## Docs

- [Game design](docs/GDD.md): what the game is
- [Checklist](CHECKLIST.md): what's done and what's next
- [Glossary](GLOSSARY.md): the game's terms
- [Challenge brief](docs/challenge.md)
- [Decisions](docs/adr/)
- [Screenshots and QA evidence](screenshots/README.md)
