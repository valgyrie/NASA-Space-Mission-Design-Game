# Project page: text to paste

The answers for the Space Apps project form, field by field (ticket 28). The form's questions are quoted from the [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) as read on 13 Nov 2026. The Project tab opens on **Saturday 14 Nov, 9:00** local time of the Local Event; **Submit for Judging** closes **Sunday 15 Nov, 23:59** local time.

Before pasting, the team checks two things the agents cannot know: the team name and members (`credits.team` in `src/strings.ts` and the README say "Team Artemis-IV"), and the two links (hosted game and demo).

## What is the name of your project?

LEAP: A Space Mission Design Game

## High-level summary

LEAP is a browser game where you run a small space company and design real missions, from Explorer 1 in 1958 to modern rideshares. You build a Site, make Parts, take a Contract, design the Spacecraft slot by slot, pick a rocket and launch site, and fly it. Every choice has a cost: a heavier battery lasts longer but needs a bigger rocket; a better antenna sends more Data but uses more Power. The Mission Report explains why the Mission worked or failed, grouped under NASA's four mission Segments, and Real History cards tell what happened on the real mission. It answers the challenge by letting players try a whole mission from objective to operation, fail safely, and fly again. It matters because these trade-offs usually stay abstract for students; here they are things you touch.

## Demo

A link to the 30-second video or the 7-slide deck (public, no login). Over the limit is not eligible for Global Judging.

## Final project link

The hosted game: GitHub Pages at `https://valgyrie.github.io/NASA-Space-Mission-Design-Game/` once the repo is public and Pages is switched on (Settings → Pages → Source: GitHub Actions; the workflow is in `.github/workflows/pages.yml`). Also link the repository.

## Project details

**What it does.** Players grow a Company (about 40% of play) and design, launch and fly Missions (about 60%). A Campaign through space history, from Explorer 1 (1958) through Apollo 11 to the Artemis Moon missions, then a modern Free Play mode. Two game modes: Explorer for young players (pictures and words) and Mission Director (real numbers and a real budget). Demo Mode starts a ready Company for each Era in one click. Minigames teach one real fact each in a minute or two.

**How it works.**
- The **Mission Designer** shows six live bars: Mass, Power, Budget, Data, Communications and Time.
- The **Launch planner** groups the Mission under NASA's four Segments: who uses the Data (User), the Spacecraft (Space), the Ground Stations (Ground) and the rocket and launch site (Launch).
- A deterministic **Test Run** estimates the chance of success before the Spacecraft ships (the first one of each design is free).
- The Launch is shown in 3D; Anomalies (point the antenna, a stuck solar panel, an eclipse) are short mini-games that follow from the design's weak points.
- The **Mission Report** says what worked and why, with the design's own numbers.
- Real launch weather from NASA POWER can scrub a Launch; Earth's spin at each launch site changes what a rocket can lift.
- Online (optional, anonymous; built but switched off for now): cloud saves, leaderboards and a Weekly Challenge with the same budget and Parts for everyone. No chat, no personal data.

**Benefits.** Easy to start from about age 10, with depth for adults. Every number has a reason the player can read; every real mission links to its source.

**What we hope to achieve.** A game a class can play in one lesson and still talk about the next day: why the rocket was too small, why the Data didn't fit through the antenna.

**Tools.** TypeScript, Vite, three.js, HTML and CSS; Supabase for the online part; Python scripts to prepare the data; Blender scripts for the 3D models. Runs in any modern browser.

## NASA data and resources

- **NASA POWER** (Langley Research Center): the climate of every start (2025 monthly averages) and the daily launch weather at Cape Canaveral and Wallops Island (2025 daily data, version 2). <https://power.larc.nasa.gov/>
- **NASA Blue Marble: Next Generation**, served by **NASA GIBS**: the colours of the land on the globe in the Mission Designer, the Launch and the Space view. <https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/> · <https://nasa-gibs.github.io/gibs-api-docs/>
- **NASA Black Marble** and **VIIRS true-colour pictures**, also via NASA GIBS: city lights on the night side of the globe, and the clouds of one real day (10 September 2024). <https://blackmarble.gsfc.nasa.gov/> · <https://www.earthdata.nasa.gov/data/instruments/viirs>
- **NASA Image and Video Library**: the photos on Real History cards, each credited. <https://images.nasa.gov/>
- **Design and Develop Science Missions** (NASA Small Spacecraft institute, 2025; an official challenge Resource): the four mission Segments in the Launch planner and Mission Report. <https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf>
- **NASA history and science pages** for the facts behind each Milestone (Explorer 1, TIROS-1, Telstar 1, Syncom 3, Apollo 11, Artemis II–IV), the Moon sequences and the orbits: cited in `docs/research/`.

## Space Agency Partner data

None used yet. The Canadian Space Agency's Alouette 1 card is planned (ticket 37); add it here if it ships.

## References

Every source, as the form asks ("any code, text, and images (even if they are open source or freely available)"):

- **Data:** NASA POWER; NASA Blue Marble: Next Generation (NASA Earth Observatory, Reto Stöckli); NASA Black Marble (NASA Earth Observatory); VIIRS true-colour pictures (NASA and NOAA); NASA GIBS; Natural Earth (public domain map data); NASA Image and Video Library.
- **NASA resources:** Design and Develop Science Missions (Julie Levri, 26 March 2025); the challenge's other Resources were read for planned features (`docs/research/official-resources.md`).
- **Facts:** every mission fact and number is cited in `docs/research/` (NASA, JPL and Wikipedia pages per Milestone and rocket).
- **Photos:** NASA, NASA/MSFC and NASA Goddard, credited on each Real History card.
- **Code libraries:** three.js and its add-ons (MIT), Vite (MIT), obscenity (MIT), the Draco decoder by Google (Apache License 2.0), Supabase client calls (online backend).
- **3D models and textures:** models made for LEAP in Blender by AI coding agents (scripts in `scripts/blender/`). Photo textures from Poly Haven (CC0; land, buildings, launch pads) and ambientCG by Lennart Demes (CC0; leaves and bark). Ground photos repeat without a visible grid using Inigo Quilez's texture-repetition technique. Every file with author and licence: `docs/art/assets-*.md`.
- **Music:** generated with Google Lyria 3.5 (`docs/audio/README.md`). **Sound effects:** made in code.
- **Illustrations:** AI-generated (Canva's image generator; ChatGPT for the last two) from game screenshots and our prompts (`docs/art/README.md`), watermarked.
- **Licence:** Apache License 2.0 (`LICENSE`).

## Did you use any Super Intelligence (SI) tools? How?

Yes. AI coding agents (Claude Code and Codex) wrote the code from the team's design documents and tickets; the team reviewed and tested every change. The same agents built the 3D models as Blender scripts; the textures on them are real CC0 photos. The music was generated with Google Lyria 3.5 and is tagged as AI-generated in each file's metadata. The Era illustrations were generated with image tools (Canva, ChatGPT) from screenshots of our own game and carry a visible "AI-generated" watermark. The game idea and design are the team's own; facts and numbers come from cited NASA and other sources, not from AI. No NASA logos, flags or mission identifiers were generated.

## Early start

Disclose it here or in Project details (team wording; Space Apps support allowed it on 13 Nov 2026):

> Space Apps support allowed our team to start before the hackathon. We began on 7 November 2026; the git history shows every change and its date.

The team keeps support's message (ticket 28). The first commit date is in `git log --reverse`.

## Before you press Submit

- [ ] Links open in a private window with no login.
- [ ] Demo is 30 seconds or less, or 7 slides or fewer.
- [ ] Nobody under 18 appears in the demo or project.
- [ ] Everything on the page is in English.
- [ ] The repo is public.
