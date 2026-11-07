# Music prompts (Lyria 3.5)

Prompts for generating the game's music with **Lyria 3.5** in Gemini. Use these only for tracks we can't get from a free licensed source (see [`README.md`](README.md)).

## How to use

1. Paste one prompt into Gemini with Lyria 3.5.
2. Generate **2–3 versions** of each prompt. Results differ every time, and Lyria can't edit a track afterwards, only make a new one.
3. Listen and pick the best one. If none fit, adjust the words in **Mood** or **Instruments** and try again.
4. Save as `<id>.mp3` (WAV if offered) using the ID in each heading, and send it in chat. It goes in `public/audio/music/`.
5. Note which version you kept in the credits table in [`README.md`](README.md).

Rules followed in every prompt (from Google's [Lyria prompt guide](https://ai.google.dev/gemini-api/docs/lyria-prompt-guide)):

- Start with the **genre**, then mood, instruments, **BPM**, **key**, structure and length. Specific prompts beat vague ones.
- **"Instrumental only, no vocals."** Lyria 3.5 adds singing by default. The rule is **no sung words**: wordless choir or humming is fine if it shows up (and is asked for on purpose in `launch`).
- No artist or game names (prompts asking for specific artists get blocked).
- The guide has no loop feature. For tracks that loop, the prompt asks for **no fade-out and an ending that matches the start**; the game crossfades the seam.

## Shared sound of the game

All tracks share one palette so the game sounds like one world:
**soft synth pads, warm strings, glockenspiel or celesta sparkle, gentle piano, light percussion. Hopeful, cozy, curious, never dark.** Keys stay in the same family (C, G, F, D major), so moving between tracks feels smooth.

---

## `menu-theme` · Main menu

```
Orchestral score with soft electronic textures, hopeful and wondrous, the feeling of looking up at the night sky as a child. Warm string ensemble, gentle piano melody, shimmering glockenspiel, soft synth pads, light timpani swells. Slow tempo around 76 BPM, in D major.
[Intro] soft pads and twinkling glockenspiel
[Main theme] piano carries a simple, memorable melody, strings join
[Build] fuller strings and a gentle timpani swell, bright and triumphant but not loud
[Outro] the melody returns softly on piano and settles on the opening chord.
About 2 minutes long. Instrumental only, no vocals.
```

## `site-calm-a` · Site view (building), loop

```
Chillout with light orchestral touches, cozy, relaxed and curious, background music for building a small space company. Mellow Rhodes piano chords, soft synth pads, plucked strings, marimba, a light brushed drum groove. Steady 90 BPM, in G major.
[Intro] Rhodes and pads
[Verse 1] marimba melody over plucked strings
[Chorus] warm strings lift the melody, still calm
[Verse 2] variation with glockenspiel
[Outro] return to the opening Rhodes chords at the same tempo, no fade-out, ending exactly like it began so it can loop.
About 3 minutes long. Steady energy throughout, nothing sudden. Instrumental only, no vocals.
```

## `site-calm-b` · Site view (building), second loop

```
Lofi chillout with a dreamy space feel, relaxed and warm, background music for a cozy building game. Soft piano, kalimba, airy synth pads, warm bass, gentle vinyl texture, soft kick and shaker. Steady 84 BPM, in F major.
[Intro] kalimba and pads
[Verse 1] piano melody, warm bass enters
[Chorus] fuller pads, a slow rising synth line like a satellite drifting by
[Verse 2] kalimba and piano trade the melody
[Outro] back to kalimba and pads at the same tempo, no fade-out, ending exactly like it began so it can loop.
About 3 minutes long. Steady energy throughout. Instrumental only, no vocals.
```

## `designer-focus` · Mission Designer, loop

```
Ambient electronic with a gentle pulse, focused and thoughtful, music for designing a spacecraft. Soft arpeggiated synth, warm synth pads, vibraphone, light ticking percussion like clockwork, subtle bass. Steady 100 BPM, in C major.
[Intro] arpeggio and pads
[Verse] vibraphone adds a calm melody
[Chorus] slightly brighter, pads open up, still calm enough to think
[Outro] return to the opening arpeggio at the same tempo, no fade-out, ending like it began so it can loop.
About 2 minutes 30 seconds long. No big drops or sudden changes. Instrumental only, no vocals.
```

## `launch` · Launch countdown and liftoff

```
Orchestral score, building excitement to a triumphant release, the moment a rocket lifts off. Pulsing low strings, ticking percussion, rising brass, full string section, timpani, shimmering cymbals, soft wordless choir and warm synth pad. Starts at 110 BPM and grows in intensity, in D major.
[0:00 - 0:30] Countdown: low pulsing strings and a ticking rhythm, tension slowly rising
[0:30 - 0:45] Ignition: timpani roll and a big swell
[0:45 - 1:15] Liftoff: triumphant brass and strings play a bold, hopeful melody
[1:15 - 1:30] Climbing to orbit: the music thins out into shimmering high strings and calm pads.
About 1 minute 30 seconds long. Exciting but never scary. Instrumental only, no vocals.
```

## `flight-orbit` · In flight and in orbit, loop

```
Ambient space music, floating, peaceful and full of wonder, a spacecraft gliding over Earth. Slow evolving synth pads, soft harp, gentle piano notes far apart, distant glockenspiel, very light pulse. Slow tempo around 70 BPM, in G major.
[Intro] pads fade in
[Section 1] harp and piano drift slowly
[Section 2] glockenspiel sparkles, pads swell gently
[Outro] back to the opening pads at the same tempo, no fade-out, ending like it began so it can loop.
About 3 minutes long. Calm throughout. Instrumental only, no vocals.
```

## `anomaly` · Anomaly mini-game, loop

```
Electronic score with orchestral tension, urgent but kid-friendly, like fixing a problem against a timer in a cartoon space adventure. Fast staccato strings, pulsing synth bass, ticking percussion, bright synth stabs, a hopeful melody hidden underneath. Fast 140 BPM, in D minor.
[Intro] ticking and staccato strings
[Loop section] driving rhythm, synth stabs, a short hopeful motif
[Outro] return to the opening ticking and strings at the same tempo, no fade-out, ending like it began so it can loop.
About 1 minute long. Tense and energetic, never scary or dark. Instrumental only, no vocals.
```

## `stinger-success` · Mission success

```
Orchestral fanfare, triumphant and joyful, a short celebration for a successful space mission. Bright brass, rising strings, glockenspiel sparkle, cymbal swell, in D major, 100 BPM. A rising flourish that ends on a big, warm final chord that rings out.
About 10 seconds long. Instrumental only, no vocals.
```

## `stinger-failure` · Mission failed

```
Gentle orchestral cue, a soft "not this time" feeling that stays encouraging, never sad or scary. Soft piano, warm strings, a quiet glockenspiel note, in F major, 80 BPM. A short falling phrase that ends on a hopeful, unresolved chord, like "try again".
About 8 seconds long. Instrumental only, no vocals.
```

## `era-history` · Era change and Real History cards

```
Orchestral score, nostalgic and inspiring, looking back at the history of space exploration. Warm strings, gentle French horn melody, soft piano, light snare roll, subtle vintage radio-static texture at the start only. Slow tempo around 72 BPM, in C major.
[Intro] faint radio static fades into soft piano
[Theme] French horn plays a proud, simple melody over strings
[Build] strings swell, hopeful and forward-looking
[Outro] settles on a warm major chord.
About 1 minute long. Instrumental only, no vocals.
```
