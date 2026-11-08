# LEAP: A Space Mission Design Game

_Launch · Engineer · Advance · Pioneer_

Run a space company, design spacecraft, and relive real space history from Explorer 1 (1958) to Artemis IV, learning the real trade-offs of mission design along the way.

Built for the **NASA Space Apps Challenge 2026**: [Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/).

**Status:** early build. You can build Mines and Factories, make Parts, and buy and sell on the Market.

## Run it

You need [Node.js](https://nodejs.org/) 20.19 or newer.

```bash
npm install
npm run dev
```

The game opens at http://localhost:5173.

**Camera:** left-drag (or W A S D / arrows) to move, right-drag to turn and tilt (or Q E to turn, R F to tilt down to the horizon), mouse wheel (or + −) to zoom. **H** goes back to the view of your whole Site.

**Keys:** Space pauses. Esc opens the menu (your Seed and the controls).

**Market:** open it under your Company name. Sell Raw Materials in 10 kg lots, or Parts one at a time, for money.

**Checks:** `npm run check` runs the type check and tests. They also run before every commit and stop it if anything fails.

## Docs

- [Game design](docs/GDD.md): what the game is
- [Checklist](CHECKLIST.md): what's done and what's next
- [Glossary](GLOSSARY.md): the game's terms
- [Challenge brief](docs/challenge.md)
- [Decisions](docs/adr/)
