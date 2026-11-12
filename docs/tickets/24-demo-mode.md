# 24: Demo Mode

**What to build:** One ready-made save per finished Era on a fixed demo Site, so judges can jump into any stage.

**Blocked by:** 18

**Status:** done

- [x] Demo Mode is on the main menu
- [x] One save per finished Era loads in seconds
- [x] Each demo save has something interesting to do straight away

**As built:** the main menu shows Continue for an existing Company, or Start your Company, plus Demo Mode. It uses the live Site background and existing panel styles. Back returns from Company setup or the Era picker; Esc also closes the picker. The pause menu can return to the main menu, saving the current session first. Reloading releases its frame callbacks, views and input listeners together.

Two ready Companies cover the finished Campaign Eras on the same Seed (`K7QXM2`) and Historic JPL place:

- Era 1 (1958–1960): Explorer 1 accepted, a batteries-only design, Parts for two attempts, Mines, Factories and a Warehouse; $2M available.
- Era 2 (1962–1964): Era 1 Milestones and their History cards unlocked, Telstar 1 accepted, a solar-powered relay design, level 2 Assembly Hall, Solar Fab, Research Lab and Ground Station; $8M available for the whole Launch and further building.

Both use Easy mode, skip the tutorial and keep the normal design, Test Run, Shipping, weather, Launch and Anomaly rules. Stock and budgets are demo game values. Open the Mission Designer to test, change Parts or ship immediately; no account or network data is needed. A small label identifies the demo during play.

Every save path, including autosave, edits, Shipping and pagehide, uses the separate `leap.demo` slot. The player's `leap.save` is kept. Selecting an Era always constructs a fresh prepared save; demo progress is not a replacement for the player's Company. Save version remains 18. Add another prepared Company when a later Campaign Era is built.

**Files:** `src/game/demo.ts` prepares saves with the existing Site, placement and design functions and provides the demo storage adapter. `src/ui/mainMenu.ts` provides the menu and picker; `src/main.ts` selects the session. `src/playSite.ts` accepts its storage destination; the pause and setup menus supply return paths. Text stays in `src/strings.ts`.

**Tested:** all 326 tests and the production build pass; five focused tests cover layout, Era/Contract/design readiness, capacity, save round trips, both Missions through ordinary Shipping/Launch rules, fresh selection and player-save isolation. Chromium at 1280×800 and 1024×768 covers menu/setup Back, existing Company continuation, both prepared designs, Test Runs, Part edits, Shipping, main-menu return and fresh selection. The existing Advanced Free Play Company's save stayed byte-for-byte unchanged through the demos; an empty player slot stayed empty. Both Eras also pass production-build menu, Test Run, Shipping and save-isolation checks without development hooks. No application page errors in completed checks. Software-rendered Chromium loads each demo in seconds; performance on real laptops and touch remain unchecked. No dependencies or test framework added. Launcher checks remain deferred to the final ticket.
