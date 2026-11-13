# 25: Sound and music

**What to build:** Sound effects made in code, music files from the team with looping crossfades, and every audio source recorded in the credits.

**Blocked by:** 01

**Status:** built, waiting for a team listening test

- [x] UI, building, launch, alarm and reward sounds play
- [x] Music plays per screen; looping tracks crossfade smoothly
- [x] Volume controls for music and effects
- [x] Every audio file is listed in the audio credits
- [x] Music normalised to −16 LUFS, peaks ≤ −1 dB, re-encoded small enough for the web, loaded per screen
- [x] Loop points and stinger cuts follow the track check in `docs/audio/README.md`

**As built:** a page-wide Web Audio mixer plays the team's ten tracks by screen, schedules 3-second loop overlaps and alternates the Site pair. Overlays restore the music underneath; the menu, Launch, stingers and history tracks play once. No music is requested before a user gesture. Muted music is not loaded, hidden tabs suspend, and unavailable audio never blocks play. Only the current screen's tracks stay decoded.

Short original effects cover button clicks, successful building placement, countdown, liftoff, Scrubs/Anomalies/failure alarms and rewards. Main and pause menus have separate music/effects sliders and expandable audio credits. Browser preferences are separate from every Company save; no save migration or new dependencies.

**Files:** `src/audio/tracks.ts` defines cues and settings; `src/audio/sound.ts` handles playback and synthesis; `src/ui/audioControls.ts` supplies the shared controls/credits. Existing screen open/close and Launch-phase handlers select the cues. Prepared MP3s stay under `public/audio/music/`. Sources, approved windows, measured levels and rebuilding steps: `docs/audio/README.md`, `docs/audio/levels.json`, `scripts/prepare-music.py`.

**Tested:** all 340 tests, client/backend type checks and production build pass; four focused tests added. Every encoded track meets −16 LUFS (±0.02 LU) and peaks below −1 dBTP; total size fell 38.7%. Chromium at 1280×800 and 1024×768 covers playback, settings persistence, credits, screen restoration, one-shot completion, loop seams and missing/unsupported audio. OfflineAudioContext verifies all six effects; a short buffer fixture verifies overlapping scheduled loops with no silence or clipping. Actual placement and Launch/Anomaly/report/history/Space-view cues were checked. Production-build success/failure Missions play their stingers and the successful Mission's history cue; saved fixtures advance assembly/Shipping to clear weather. No application page errors in completed checks. No dependencies or test framework added. Launcher checks remain deferred. Team listening on real speakers/headphones, Safari/Firefox, touch and real-device performance remain unchecked.

**Rechecked (2026-11-12):** Music 23% and effects 41% persisted across reload and Demo Mode. Listening and cross-browser checks remain open; the earlier waveform and loop tests were not repeated. [QA report](../qa/2026-11-12/README.md).

**Music level and failures (2026-11-13):** players heard effects but little or no music. The files were fine (−16 LUFS), but the music bus played them at 0.6 × the slider, about −26 LUFS at the default 50% and −36 LUFS in the menu theme's soft opening: too quiet on laptop speakers. The bus now uses the slider directly (`MUSIC_GAIN = 1`): about −22 LUFS at 50%, peaks still below clipping. A track that fails to load or decode no longer leaves music silent for the rest of the screen: the next click or key retries, the Sound settings say "Music could not load in this browser", and the console logs the reason. Checked in Chromium with the real autoplay policy: menu, Demo Mode, Site, Mission Designer, pause menu and History Archive all play; blocked files show the note and recover on the next click. Total silence was not reproduced here; if music is still missing, the note and console message say why.
