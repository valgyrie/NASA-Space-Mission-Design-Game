# 54: Minigames

**What to build:** a new mode, **Minigames**, from the main menu. The player picks Explorer or Mission Director and plays that level's three short 2D games in a random order. Each game teaches one real space fact, stated after the game (child-friendly in Explorer). Asked for by the team on 15 Nov 2026.

**Blocked by:** 53

**Status:** merged into `main` (15 Nov 2026) at the user's request, without the last browser play-test. Lost Signal had small fixes from a play-test that was stopped before it finished; the browser items below are still open.

**Facts and sources:** [`docs/research/minigames.md`](../research/minigames.md). Numbers in the games that aren't there are game estimates, labelled in the code.

| Level | Game | Fact |
|---|---|---|
| Explorer | Build Pluto (`pluto.ts`) | Pluto became a dwarf planet in 2006; rock and ice, not gas |
| Explorer | Rover Rescue (`rover.ts`) | Mars rovers drive around, drill and study samples |
| Explorer | Planet Parade (`planets.ts`) | The planets' order from the Sun, and by size |
| Mission Director | Too Hot, Too Cold (`thermal.ts`) | Heaters and radiators keep parts in their temperature range |
| Mission Director | Square Peg, Round Hole (`co2.ts`) | Apollo 13's CO₂ fix: square canisters, round openings |
| Mission Director | Lost Signal (`signal.ts`) | Voyager 2's 2023 loss of contact; DSN, carrier lock, inverse-square loss |

- [x] Facts researched and cited
- [x] Shell: menu button, level choice, intro card, game, fact card (stars, "You learned", NASA link; Space Place in Explorer), end screen, best stars saved
- [x] Explorer games built and played to the end in the browser (1280×800 and 1024×768)
- [x] Mission Director: Too Hot, Too Cold and Square Peg, Round Hole built
- [ ] Mission Director: Lost Signal built with its model and tests, but its browser play-through to a win was not finished
- [ ] Play every game through the real menu (the Mission Director games were tested only in a harness)
- [x] GDD, GLOSSARY ("Minigame" vs the Anomaly "mini-game"), CHECKLIST

**As built so far:** `src/minigames/` (contract `types.ts`, `catalogue.ts`, games, models with tests, `kit.ts` shared drawing helpers, `minigames.css`, `director.css`), `src/ui/minigames.ts` (the screens), main menu button in `mainMenu.ts` / `main.ts`. Kids' links for the three Explorer facts in `sources.ts` (`MINIGAME_SOURCES`, `KIDS_LINKS`). 648 tests and both type checks pass.
