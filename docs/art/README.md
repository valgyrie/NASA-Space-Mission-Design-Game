# Era illustrations

> **Note (15 Nov 2026):** the game itself now has a realistic look (ADR-0005), not the low-poly look this guide describes. The three Era pictures stay. New prompts should match the new look (a real-looking place, still clearly an illustration, not a photo); the prompts below have not been rewritten.
>
> The 3D models' textures and the Earth's photos are listed with author and licence in `assets-terrain.md`, `assets-buildings.md`, `assets-launch.md`, `assets-nature.md`, `assets-space.md` and `assets-moon.md` (the Moon, its craft and the caption facts) in this folder.

One illustration per Era, shown at the top of the Era card when the Company enters that Era (ticket 29). Era 1's card opens a new Campaign; Era 2's follows the HQ Upgrade; Free Play's follows the move to the modern Era.

The team generates the images (ChatGPT or a similar image tool) from the prompts below. An agent then compresses them into the game.

**Checked 13 Nov:** the official Space Apps Resources (ticket 27) hold no image that fits an Era, so the prompts below stay.

**Space Apps rules (13 Nov):** generated images need a **visible watermark** in the image itself; `scripts/prepare-era-art.py` burns a small "AI-generated" mark into the bottom-right corner. Prompts carry no NASA branding: no logos, flags, insignia, mission patches, or mission names or numbers on hardware.

## Style guide

**What it is:** a clear **illustration**, never something that could pass for a photo. The game labels each one "Illustration (AI-generated)". Real photos stay on the Real History cards.

**Look:** the same as the game world. Cozy, colourful **low-poly 3D**: flat-shaded facets, simple shapes, soft daylight or a warm sky, gentle shadows. Toy-like and friendly, not gritty. Think of a diorama of the game's Site.

**Colours** (taken from the game):

| Use | Colour |
|---|---|
| Sky, zenith to horizon | `#5b97cf` → `#d3e4ee` |
| Sea | `#4aa3d8`, deep `#3b6e8f` |
| Grass, hills | `#8cc66d`, `#6c9e55` |
| Sand | `#e3cf94` |
| Rock | `#9b958e` |
| Buildings: walls, roofs | `#f3eee4`, `#d9583a` |
| Metal, rockets | `#f7f8fa`, `#7d8a99`, `#46505f` |
| Warm lights, flame | `#ffe08a`, `#ff7a2a` |
| UI dark panel (for night skies) | `#0e141f` |
| UI accent blue | `#4fa3ff` |

**Mood:** hopeful and curious. Each image shows one big moment of its Era, with room to breathe.

**Rules:**
- No text, letters, numbers or flags anywhere in the image.
- No logos, insignia or mission patches of NASA, SpaceX or any real organisation. No mission names or numbers painted on hardware. Rockets and buildings stay plain.
- Keep the bottom-right corner free of important detail: the watermark goes there.
- No real, recognisable people. Small faceless figures are fine.
- Hardware should look like its Era, but it is an illustration: it does not need to be exact.
- 16:9 landscape. Keep the main subject near the centre: the game crops edges on narrow screens.

**Size in the game:** 1280 × 720 WebP, aim under 150 KB each. Loaded only when its card opens.

## Prompts

Every prompt starts with the same style block so the three images match. Paste the whole block, then the Era part (the quoted text only).

The **What happened** notes are background for the team. Never paste them into the generator: they name real missions and agencies.

**Audit (13 Nov):** the three prompts and the style block name no agency, mission, rocket, place name on hardware, logo, flag or patch.

**Style block (use for every Era):**

> Stylised low-poly 3D illustration, flat-shaded facets, cozy and colourful like a miniature diorama in a video game. Soft lighting, gentle shadows, simple clean shapes. Colour palette: sky blue #5b97cf fading to pale #d3e4ee, sea blue #4aa3d8, grass green #8cc66d, sand #e3cf94, white #f7f8fa, warm red roofs #d9583a, warm lamp light #ffe08a. Clearly an illustration, not a photo, not photorealistic. No text, no letters, no numbers, no logos, no insignia, no flags, no recognisable people. Plain unmarked rockets and buildings. 16:9 landscape, main subject near the centre, bottom-right corner kept simple.

### Era 1: 1958–1960 (`era-1`)

What happened: Explorer 1, America's first satellite, launched at night on 31 January 1958 from Cape Canaveral on a Juno I rocket. It ran on batteries, and its radiation detector found the Van Allen belts. Sources: `docs/research/milestones.md`.

> [Style block] Scene: night on the Florida coast in 1958. A slender white rocket lifts off from a small, simple launch pad by the sea, with a bright warm flame and a soft cloud of smoke lighting up the pad. A plain steel service tower stands beside it. A few small low buildings with lit windows and a blockhouse sit nearby, palm trees and a sandy shore in front, calm dark sea behind. Above, a deep blue night sky (#0e141f to #3b6e8f) full of stars. Feeling: the very first step, small but brave.

### Era 2: 1962–1964 (`era-2`)

What happened: Telstar 1 (1962), a ball-shaped satellite covered in solar cells, sent the first live TV pictures across the Atlantic. The Andover, Maine station's horn antenna was seven stories high. Syncom 3 (1964) was the first geostationary satellite and carried the Tokyo Olympics live to the US. Sources: `docs/research/milestones.md`.

> [Style block] Scene: early evening in a green, hilly countryside with pine trees in the early 1960s. On a hilltop stands a giant horn-shaped radio antenna, as tall as a seven-storey building, pointing up at the sky, with a small control building beside it. High in the sky crosses a small faceted satellite shaped like a ball, covered in tiny dark-blue solar panels, glinting in the last sunlight, with a thin dotted line showing its path. In the valley below, a cozy small town with warm-lit windows; in one living room, through a big window, a family gathers around a glowing TV set. Sky fading from soft orange near the horizon to blue above. Feeling: the world is suddenly connected.

### Free Play: the modern Era, 2026 (`era-5`)

What it is in LEAP: the Company carries on in 2026 with generated Contracts and Falcon 9 Rideshares, where many small satellites share one rocket.

> [Style block] Scene: dawn over a modern coastal launch site. A tall, plain white two-stage rocket climbs into a pink-and-blue sky, its flame bright and its trail curving out over the sea. In the upper part of the image, above the curve of the Earth seen from space, a cluster of many small box-shaped satellites with fold-out solar panels spreads out gently from an open rocket stage, each one tiny and colourful. Below, a neat modern launch site with clean white buildings, solar panels on roofs and a big satellite dish. Feeling: space is open to everyone now; anything is possible.

## Matching the game: screenshots as references

Text prompts alone gave buildings that did not look like LEAP's. The fix: attach game screenshots and ask the image tool to keep their shapes and colours, plus the finished Era 1 picture as the style to match. The ChatGPT pack for Era 2 and Free Play (one folder per prompt with `prompt.md` and the screenshots to attach) was built on 13 Nov 2026 and sent to the team; its prompts are the same as below but start with "Use the attached game screenshots as the exact reference for every building". To capture new screenshots: Demo Mode → Era 2, hide the UI, and move `window.leap.world.camera` close to a building (dev server only).

## Adding the images

1. Save the team's picks anywhere (not in the repo), one per Era.
2. Run `python3 scripts/prepare-era-art.py 1 era1.png 2 era2.png 5 freeplay.png` from the repo root (needs Pillow). It crops to 16:9, resizes to 1280 × 720, burns in the "AI-generated" watermark and writes `public/eras/era-1.webp`, `era-2.webp` and `era-5.webp`.
3. Fill in the table below: tool, date, who chose it, the final prompt if it changed.
4. Start a new Campaign (Era 1 card), and use a Demo Company's HQ Upgrade or the Free Play move to check the other two.

Until a file exists its card shows text only, as before.

## Credits

Every image is credited in the game as "Illustration (AI-generated)" on its card, and in Credits → Illustrations.

| File | Era | Tool | Date | Prompt changes |
|---|---|---|---|---|
| `public/eras/era-1.webp` | 1 | Canva image generator (Canva connector), with two game screenshots as references (the launch pad with Juno I, and the Demo Site) | 13 Nov 2026, chosen by the agent at the team's request | Prompt rewritten to keep the game's own pad, red lattice tower, rocket and buildings; the first try from the text prompt alone was dropped because its buildings did not look like the game's |
| `public/eras/era-2.webp` | 2 | ChatGPT image generation, with four game screenshots (HQ and Ground Station, the dish, Research Lab and factories, the whole Site) and the Era 1 picture as references | 13 Nov 2026, generated by the team from the pack | Pack prompt 1 ("Use the attached game screenshots as the exact reference for every building") |
| `public/eras/era-5.webp` | Free Play | ChatGPT image generation, with three game screenshots (launch pad with the game's Falcon 9, the whole Site, HQ and Ground Station) and the Era 1 picture as references | 13 Nov 2026, generated by the team from the pack | Pack prompt 2 |
