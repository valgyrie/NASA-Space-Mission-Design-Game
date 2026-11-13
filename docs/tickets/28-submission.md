# 28: Submission

**What to build:** Everything needed to submit: credits screen, README, hosted playable link, video, project page, and the repo made public. Mostly team tasks.

**Blocked by:** 24, 26, 27

**Status:** in progress. Credits screen and README built 2026-11-12; hosting, video, project page and public repo remain (team). Rule items from 13 Nov added below. Formally blocked by 27: add each official Resource used to `DATASETS` and it shows in Credits too.

- [x] Credits screen lists data, audio, sources and the team (include Natural Earth for the globe: `docs/research/earth-map.md`)
- [x] README explains how to play and run
- [ ] Game is hosted at a public link
- [ ] Submission video recorded (team)
- [ ] Project page filled in on spaceappschallenge.org (team)
- [ ] Repo made public before the deadline (team)

**Rules published 13 Nov** (summary and links: `docs/challenge.md`, "Rules published 13 Nov"):

- [ ] **Early start:** the FAQ says "Teams are not allowed to begin working on the challenges prior to the hackathon." Space Apps support allowed this team to start early (team, 2026-11-13). Save the support message in the repo or team drive (team)
- [ ] **Disclose the early start in the project submission** (team). Keep this item visible until the project page is submitted
- [ ] **Demo limit:** a video of 30 seconds or less, or at most 7 slides including title and intro; over the limit is not eligible for Global Judging. Team decision still open: 30-second video or 7 slides
- [ ] **References:** the project page lists all data, resources and tools used, open-source code, text and images (Real data list, Credits, `docs/research/`, `docs/audio/`, `docs/art/`), with at least one NASA data or resource (needed for a Global Award). Partner agency resources (CSA) are "highly encouraged"
- [ ] **Licence:** add a LICENSE file. Team decision still open: Apache 2.0 or MIT. With none chosen, NASA distributes original content under Apache 2.0. Non-NASA material must be freely and publicly available or open source; check Google's current terms for the Lyria music (`docs/audio/README.md`)
- [ ] **AI (the site's "Super Intelligence", SI):** say in the README and project page how AI was used (code written by AI coding agents and reviewed by the team; Lyria music; AI illustrations). Audio and code: acknowledged in descriptive text and metadata. Images and video: visible watermark (ticket 29; also the demo video if it uses generated footage). The submission form asks how SI tools were used
- [ ] **Links:** public, no login, in English (a video may be spoken in another language with English subtitles)
- [ ] **No image, video, audio or likeness of anyone under 18** in the demo or project
- [ ] **Deadline:** "Submit for Judging" before Sunday 15 November, 23:59 local time of the Local Event
- [ ] Optional: request a FortiGuard web filter classification for the newly hosted site

## Built so far (2026-11-12)

- **Credits screen:** main menu → **Credits** (`src/ui/credits.ts`). Back or Esc returns to the Credits button; the Sound and Real data boxes hide while it is open because Credits repeats them. Sections: Made by, Real data (shared `makeDatasetList` in `src/ui/dataCredits.ts`), Real History photos, Reading sources (from `src/game/sources.ts` and the history cards), Music and sound, Software (`SOFTWARE` in `sources.ts`). Text: `credits.*` in `src/strings.ts`.
- **Team:** `credits.team` is the placeholder "Team Artemis-IV". Replace it with the team's names before submission (README's Credits section too).
- **README:** short How to play steps, a Credits section and a pointer to the in-game screen.
- **Not done:** the official Space Apps logo (waiting for organisers); hosting. Supabase only runs the online backend and cannot serve the game; the build (`npm run build` → `dist/`) is a static site for GitHub Pages, Netlify or Vercel. GitHub Pages on a private repo needs a paid plan, so it works once the repo is public.
- **Checked:** type checks and 345 tests pass; Chromium at 1280×800 and 700×600: open, read, scroll, Esc and Back, Demo picker still returns focus, no horizontal scroll, no page errors.

**Rechecked (2026-11-12):** Credits opens and Back/Esc returns to the menu. Hosting and the other team tasks remain open. [QA report](../qa/2026-11-12/README.md).

**Re-reading the rules:** `python3 scripts/fetch_spaceapps_page.py <url>` prints the live Project Submission Guide, Judging and Awards Guide or FAQ. Check them once more before submitting.
