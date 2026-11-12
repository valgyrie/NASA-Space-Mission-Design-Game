# 28: Submission

**What to build:** Everything needed to submit: credits screen, README, hosted playable link, video, project page, and the repo made public. Mostly team tasks.

**Blocked by:** 24, 26, 27

**Status:** in progress. Credits screen and README built 2026-11-12; hosting, video, project page and public repo remain (team). Formally blocked by 27, whose official Resources arrive Nov 13: add any dataset used from them to `DATASETS` and it shows in Credits too.

- [x] Credits screen lists data, audio, sources and the team (include Natural Earth for the globe: `docs/research/earth-map.md`)
- [x] README explains how to play and run
- [ ] Game is hosted at a public link
- [ ] Submission video recorded (team)
- [ ] Project page filled in on spaceappschallenge.org (team)
- [ ] Repo made public before the deadline (team)

## Built so far (2026-11-12)

- **Credits screen:** main menu → **Credits** (`src/ui/credits.ts`). Back or Esc returns to the Credits button; the Sound and Real data boxes hide while it is open because Credits repeats them. Sections: Made by, Real data (shared `makeDatasetList` in `src/ui/dataCredits.ts`), Real History photos, Reading sources (from `src/game/sources.ts` and the history cards), Music and sound, Software (`SOFTWARE` in `sources.ts`). Text: `credits.*` in `src/strings.ts`.
- **Team:** `credits.team` is the placeholder "Team Artemis-IV". Replace it with the team's names before submission (README's Credits section too).
- **README:** short How to play steps, a Credits section and a pointer to the in-game screen.
- **Not done:** the official Space Apps logo (waiting for organisers); hosting. Supabase only runs the online backend and cannot serve the game; the build (`npm run build` → `dist/`) is a static site for GitHub Pages, Netlify or Vercel. GitHub Pages on a private repo needs a paid plan, so it works once the repo is public.
- **Checked:** type checks and 345 tests pass; Chromium at 1280×800 and 700×600: open, read, scroll, Esc and Back, Demo picker still returns focus, no horizontal scroll, no page errors.
