# 27: NASA data in view + official Resources

**What to build:** Adapt the game to the official challenge Resources (published Nov 13) and make NASA data use visible in the game and the credits.

**Blocked by:** 16

**Status:** in progress. Data credits, in-game note and Blue Marble globe built 2026-11-12. Official Resources captured and mapped in the docs on 2026-11-13 (docs only, no game code); each Resource's Real data entry waits for the ticket that uses it.

**Idea:** the Mission Designer's globe uses Natural Earth. NASA Blue Marble colours could replace the surface colours there (`scripts/build_earth_map.py`); its server refused the build container on Nov 9, so try from another network.

- [x] Official Resources tab captured into the challenge brief (`docs/challenge.md`, 2026-11-13)
- [x] Each official Resource has a planned visible use, or the reason it has none, in GDD §14 (2026-11-13)
- [ ] Each official Resource used gets an entry in Real data and Credits (`DATASETS` in `src/game/sources.ts`, strings `data.<id>.*`) when its feature ships (tickets 32–42)
- [x] Credits list every dataset with a link
- [x] An in-game note shows where real data is used

## Built so far (2026-11-12)

The Resources tab is due Nov 13. On Nov 12 the build container could not reach spaceappschallenge.org at all (curl: unverifiable certificate chain; through the browser: "upstream request failed"), so the first two items wait for someone to capture the tab from a normal browser.

- **Blue Marble globe:** NASA Blue Marble: Next Generation colours the land on the globe (Mission Designer, Launch, Space view). Visible Earth still refuses the container, but NASA GIBS serves the same layer: `scripts/build_blue_marble.py` stitches its level-2 WMTS tiles and averages them into the 1° map as `src/world/blueMarble.ts` (52-colour palette, about 23 KB). Natural Earth still decides land, sea and land type, so coasts and Sites are unchanged. Sources: `docs/research/earth-map.md`.
- **Real data list:** "Real data → Where LEAP uses real data" in the main and pause menus lists each dataset with its link, what it does in LEAP and its credit (`DATASETS` in `src/game/sources.ts`, `src/ui/dataCredits.ts`). Ticket 28's credits screen can reuse it.
- **Notes in place:** "Land colours: NASA Blue Marble" on the Mission Designer's globe and in the Space view. The climate and weather lines already named NASA POWER.

**Done on 2026-11-13 (docs only):** the Resources tab is in `docs/challenge.md` with NASA's own descriptions and the rules published that day; what each Resource contains is in `docs/research/official-resources.md`; GDD §14 lists each Resource with its planned use and ticket. The team approved the new tickets 32–48 the same day.

**To finish:** as each of tickets 32–42 ships, add its Resource to `DATASETS` and strings `data.<id>.*` (Real data and Credits show it). Then tick the third item. Planned entries: Design and Develop Science Missions (32, 39), Concept Maturity Levels (33), Mission Viz and GMAT (34, 35), Webb game (36, 42), CubeSat 101 (38, 40), CSA (37, 42). The Mission Design Lab and the 2023 challenge are reading sources (41, 45, 47) rather than data.

**Rechecked (2026-11-12):** The Real data list opens and displays the existing dataset uses and credits. The official Resources work remains pending. [QA report](../qa/2026-11-12/README.md).
