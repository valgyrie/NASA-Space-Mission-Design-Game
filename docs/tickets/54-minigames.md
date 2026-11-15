# 54: Minigames

**What to build:** a new mode, **Minigames**, from the main menu. The player picks Explorer or Mission Director and plays that level's three short 2D games in a random order. Each game teaches one real space fact, stated after the game (child-friendly in Explorer). Asked for by the team on 15 Nov 2026.

**Blocked by:** 53

**Status:** done and merged into `main` (15 Nov 2026). All six games played through the real menu at 1280×800 and 1024×768.

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
- [x] Mission Director: Lost Signal built, and played through the menu to a win (3★) and to a loss
- [x] Play every game through the real menu (all six, both sizes; end screens checked)
- [x] GDD, GLOSSARY ("Minigame" vs the Anomaly "mini-game"), CHECKLIST

**As built so far:** `src/minigames/` (contract `types.ts`, `catalogue.ts`, games, models with tests, `kit.ts` shared drawing helpers, `minigames.css`, `director.css`), `src/ui/minigames.ts` (the screens), main menu button in `mainMenu.ts` / `main.ts`. Kids' links for the three Explorer facts in `sources.ts` (`MINIGAME_SOURCES`, `KIDS_LINKS`). 648 tests and both type checks pass.

**Play-test (15 Nov, night):** all six games through Main menu → Minigames at 1280×800 and 1024×768; Mission Director 9 of 9 stars at both sizes (Lost Signal win and a loss, Too Hot, Too Cold 94% in band, Square Peg peak 8.3 mmHg). No console errors from the game. Fixed: Lost Signal ran out of reserve 13 s after Start (time now 0.25 game hours per second; star 2 at half the reserve, the bar turns amber there); Lost Signal's spectrum labels when Canberra is below the horizon; fact and end screens opened scrolled down (focus without scrolling); Square Peg's ticker plurals.
**Left (minor):** Build Pluto's "So what is Pluto?" box overlaps the side panel by a few pixels; a long Square Peg ticker line is cut at 1024 px; Lost Signal can show DATA LOCK while the probe is very low in Canberra's sky. The game loop caps a frame at 0.1 s, so on a very slow machine the games run slower than real time.
