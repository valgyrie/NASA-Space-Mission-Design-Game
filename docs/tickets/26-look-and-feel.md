# 26: Look and feel pass

**What to build:** Cozy colourful low-poly models and a clean NASA-style interface across all screens, with Learn more → links on real things.

**Blocked by:** 18

**Status:** built, waiting for a team visual test

- [x] All buildings, rockets and Spacecraft use the agreed low-poly style
- [x] Buildings look right both from the isometric start view and tilted low toward the horizon
- [x] Interface is consistent, readable and not overwhelming
- [x] Learn more → links on every real mission, rocket and fact
- [x] No real organisation's logos anywhere
- [x] Title screen (LEAP logo, subtitle, acronym line) leads to the main menu
- [x] Main menu and full-screen menus use a live 3D scene as background
- [x] Loading screens show a rendered shot plus one sourced fact or gameplay tip, and never delay loading
- [x] Earth looks smooth, from far and up close (done early, 2026-11-10, asked for by the team). `buildEarth` in `src/world/earthMesh.ts` is now a smooth sphere with a picture made from the Natural Earth grid (`src/world/earthTexture.ts`): the shader cuts the coastline, so it stays sharp at any zoom; clouds are a soft shell. One set of pictures for every view, made once (about a third of a second) when the first Earth is shown
- [x] The 3D Launch's horizon high in the climb is a flat haze band over a flat floor (`src/world/launchView.ts`, pad shot): give it a curve or fade it into the space shot sooner

**Notes from tickets 10 and 31:** the flat horizon was seen in testing and left for this pass. The blocky Earth is fixed.

**Building size (2026-11-10, asked for by the team):** buildings were one tile and too small to see from the whole-Site view. They now take 3 × 3 tiles (GDD §4) and the models are three times as big; the Site stays 64 × 64. When checking "buildings look right", check the whole-Site view too.

**As built:** the existing building, Launch Vehicle and Spacecraft models already share the agreed low-poly palette and Company branding. Kept their shapes, colours and moving parts, and the buildings’ 3 × 3 footprints. Checked every building kind from the whole-Site view, the opening isometric angle and a low horizon angle, and all five Launch Vehicles from pad to orbit. The Launch ground now follows Earth's curvature (the existing 6,371 km mean radius) with joined land, beach and sea; the flight timeline and staging stay the same.

An original LEAP wordmark, subtitle and acronym line now have their own title screen. Its button leads to the main menu. Title and menu show the saved Company's live Site and buildings, or the prepared Era 2 Site without a player save. Only the models animate: the Company's Game date and save stay untouched. Reduced-motion preferences stop menu model animation. Setup, Demo picker and Online keep the rendered Site behind them. Starting play shows a captured Site render and one gameplay tip while it loads; the screen is removed as soon as setup finishes, with no minimum reading time.

Learn more → links sit beside Milestones, Launch Vehicles, Launch Sites, orbit facts, climate and map data in setup, Contracts, Mission Designer, Launch planner, Test Run, Launch, Mission Report and Space view. Existing Real History links are reused. Generated Contracts get science links without pretending to be real historical missions. Links open in a new tab, outside selection buttons. Game prices, Part performance, Scrub limits and Reliability are labelled as estimates. No new historical facts or organisation logos were added.

The shared dark panels and blue accents remain. Muted text has more contrast; keyboard focus is visible, dialogs scroll on short screens, the Mission Designer has an opaque background behind its text and its columns stack on narrow screens. The top bar stays beside the Company panel and wraps when Research needs more room, fixing the existing Home-button overlap.

**Files:** `src/ui/titleScreen.ts`, `src/ui/loading.ts` and `src/main.ts` handle entry and loading. `src/game/sources.ts` and `src/ui/learnMore.ts` share reading links across existing screens. `src/world/launchView.ts` curves the ground. Text remains in `src/strings.ts`; styles remain in `src/style.css`. No save migration, dependency or backend change.

**Tested:** all 342 tests, client/backend type checks and production build pass; two focused tests cover historical versus generated Mission sources. Chromium at 1280×800 and 1024×768 covers title, setup/Back, Demo picker/Esc, Test Run, Shipping, pause-menu return, Continue, loading-shot capture and player-save isolation. Render fixtures check all building kinds at three camera angles and every Launch Vehicle at countdown, mid/late first-stage burn, coast and orbit. Reading URLs, including the existing History sources, return HTTP 200. The Research/Home layout also passes with 13,600 kB waiting in development at both sizes and production at 1024×768. Production new-Company entry/saving and Continue → Launch → skip → Mission Report → Space view pass with the new links and no page errors. Keyboard/reduced-motion menus also fit 700×600. Launcher checks remain deferred to the final ticket. Team visual review, real-device performance, touch, Safari and Firefox remain unchecked.
