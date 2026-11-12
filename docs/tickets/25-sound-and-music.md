# 25: Sound and music

**What to build:** Sound effects made in code, music files from the team with looping crossfades, and every audio source recorded in the credits.

**Blocked by:** 01

**Status:** built, waiting for a team test

- [x] UI, building, launch, alarm and reward sounds play
- [x] Music plays per screen; looping tracks crossfade smoothly
- [x] Volume controls for music and effects
- [x] Every audio file is listed in the audio credits
- [x] Music normalised to −16 LUFS, peaks ≤ −1 dB, re-encoded small enough for the web, loaded per screen
- [x] Loop points and stinger cuts follow the track check in `docs/audio/README.md`

**As built:** Sound starts on the first click or key press (browsers block it before that). Every button clicks. Placing a building thuds and pings; a spot that won't take it plays two falling notes. The Launch beeps the last five seconds of the countdown, roars at liftoff and thumps at each stage; a lost rocket and every Anomaly sound an alarm, and an Anomaly won plays a rising chime, as does the startup grant. All effects are made in code (Web Audio), so there are no effect files.

Music follows the screen: main menu, the Site (its two calm tracks take turns), Mission Designer, the Launch's countdown and climb, the flight after it and the Space view, Anomalies, the Mission Report's success or failure stinger, and Real History and new-Era cards. Screens crossfade over 1.2 s. Looping tracks were cut before their fade-out; 3 s before a loop ends the next play starts and the two crossfade on an equal-power curve. The next track starts loading 20 s ahead. One-shot tracks (menu, Launch, stingers, history) play once, then silence until the screen changes. Returning to a screen starts its music from the top.

**Volume:** Music and Sound effects sliders in the pause menu and on the main menu. They apply at once and are kept in this browser (`leap.volume`), not in the Company save, so no save migration.

**Mastering:** `scripts/master_music.sh` rebuilds the files from the originals in git history: loop cuts, two-pass loudness normalisation to −16 LUFS (measured −16.2 to −16.4) with true peaks −1.4 dB or lower, 128 kbps MP3. 26 MB down to 15 MB. Each track streams only when its screen opens.

**Files:** `audio/tracks.ts` (tracks, cues, loop timing), `audio/scene.ts` (which screen's music plays), `audio/music.ts` (player), `audio/sfx.ts` (effects), `audio/engine.ts` (AudioContext, volume buses), `audio/settings.ts` (saved volumes), `ui/volumeControls.ts`. The Launch show reports its scene and plays its own effects.

**Tested:** 342 unit tests and the production build pass; 16 focused tests cover cues, loop timing, scene choice, volume storage, one file per track and every audio file listed in the credits. Chromium at 1280×800 and 1024×768: no sound before the first click; menu → Demo Site → Mission Designer → Site; a full Demo Era 1 Launch through countdown, climb, flight, a skipped Anomaly, the success stinger and the Explorer 1 history card; Site a → b → a and Designer loop crossfades with old tracks released; volume saved; production build loads only the menu and Site tracks. No page errors. Effects were counted, not heard: a person needs to listen to the mix, the effects' loudness against the music, and the loop seams. Touch and Safari/Firefox untested.
