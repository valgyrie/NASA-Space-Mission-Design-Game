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
- [ ] Earth looks smooth up close: in the 3D Launch's upper-stage shot and the Space view's follow camera, the globe's flat triangles show as big blocks (`buildEarth` in `src/world/earthMesh.ts` uses one icosahedron detail, 48, for every view). Use a finer globe, or a finer patch, only where the camera is close, and keep it fast on slow laptops
- [ ] The 3D Launch's horizon high in the climb is a flat haze band over a flat floor (`src/world/launchView.ts`, pad shot): give it a curve or fade it into the space shot sooner

**Notes from tickets 10 and 31:** both blocky-Earth spots and the flat horizon were seen in testing and left for this pass; the whole-Earth views (Mission Designer, Space view overview, orbit shot) look fine at detail 48.
