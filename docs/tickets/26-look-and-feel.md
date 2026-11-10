# 26: Look and feel pass

**What to build:** Cozy colourful low-poly models and a clean NASA-style interface across all screens, with Learn more → links on real things.

**Blocked by:** 18

**Status:** ready-for-agent

- [ ] All buildings, rockets and Spacecraft use the agreed low-poly style
- [ ] Buildings look right both from the isometric start view and tilted low toward the horizon
- [ ] Interface is consistent, readable and not overwhelming
- [ ] Learn more → links on every real mission, rocket and fact
- [ ] No real organisation's logos anywhere
- [ ] Title screen (LEAP logo, subtitle, acronym line) leads to the main menu
- [ ] Main menu and full-screen menus use a live 3D scene as background
- [ ] Loading screens show a rendered shot plus one sourced fact or gameplay tip, and never delay loading
- [x] Earth looks smooth, from far and up close (done early, 2026-11-10, asked for by the team). `buildEarth` in `src/world/earthMesh.ts` is now a smooth sphere with a picture made from the Natural Earth grid (`src/world/earthTexture.ts`): the shader cuts the coastline, so it stays sharp at any zoom; clouds are a soft shell. One set of pictures for every view, made once (about a third of a second) when the first Earth is shown
- [ ] The 3D Launch's horizon high in the climb is a flat haze band over a flat floor (`src/world/launchView.ts`, pad shot): give it a curve or fade it into the space shot sooner

**Notes from tickets 10 and 31:** the flat horizon was seen in testing and left for this pass. The blocky Earth is fixed.

**Building size (2026-11-10, asked for by the team):** buildings were one tile and too small to see from the whole-Site view. They now take 3 × 3 tiles (GDD §3) and the models are three times as big; the Site stays 64 × 64. When checking "buildings look right", check the whole-Site view too.
