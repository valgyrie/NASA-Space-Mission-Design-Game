# LEAP: A Space Mission Design Game

_Launch · Engineer · Advance · Pioneer_

Run a space company, design spacecraft, and relive real space history from Explorer 1 (1958) to Artemis IV, learning the real trade-offs of mission design along the way.

Built for the **NASA Space Apps Challenge 2026**: [Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/).

**Status:** early build. You can look around an empty Site.

## Run it

You need [Node.js](https://nodejs.org/) 20.19 or newer.

```bash
npm install
npm run dev
```

The game opens at http://localhost:5173.

**Camera:** left-drag to pan, right-drag to turn, mouse wheel to zoom.

**Checks:** `npm run check` runs the type check and tests. They also run before every commit and stop it if anything fails.

## Docs

- [Game design](docs/GDD.md): what the game is
- [Checklist](CHECKLIST.md): what's done and what's next
- [Glossary](GLOSSARY.md): the game's terms
- [Challenge brief](docs/challenge.md)
- [Decisions](docs/adr/)
