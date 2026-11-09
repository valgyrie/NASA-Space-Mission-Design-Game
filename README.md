# LEAP: A Space Mission Design Game

_Launch · Engineer · Advance · Pioneer_

Run a space company, design spacecraft, and relive real space history from Explorer 1 (1958) to Artemis IV, learning the real trade-offs of mission design along the way.

Built for the **NASA Space Apps Challenge 2026**: [Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/).

**Status:** early build. You can build Mines and Factories, make Parts, and buy and sell on the Market.

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

**Camera:** left-drag (or W A S D / arrows) to move, right-drag to turn and tilt (or Q E to turn, R F to tilt down to the horizon), mouse wheel (or + −) to zoom. **H** goes back to the view of your whole Site.

**Keys:** Space pauses. Esc opens the menu (your Seed and the controls).

**Market:** open it under your Company name. Sell Raw Materials in 10 kg lots, or Parts one at a time, for money.

**Checks:** `npm run check` runs the type check and tests. They also run before every commit and stop it if anything fails.

**Launcher checks (Linux):** `node --test scripts/leap.test.mjs` checks setup, reopening, updates and failures with real Vite and simulated installs. Stop LEAP first so port 5173 is free. After changing the launchers, also check a clean first start, progress bars, reopening and quitting on Windows and macOS.

## Docs

- [Game design](docs/GDD.md): what the game is
- [Checklist](CHECKLIST.md): what's done and what's next
- [Glossary](GLOSSARY.md): the game's terms
- [Challenge brief](docs/challenge.md)
- [Decisions](docs/adr/)
