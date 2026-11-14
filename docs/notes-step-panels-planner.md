# Notes: Launch planner step panels (agent working file)

## Layout (built)
- Top, 60% of the planner (52% under 820 px tall): PlannerView (src/world/plannerView.ts), the chosen Launch
  Vehicle with the Spacecraft on the Launch show's pad, sky and ground. Drag/zoom, no pan, idle auto-rotate.
  Each step eases the camera: User/Review overview, Space the Spacecraft, Ground the tracking station,
  Launch Vehicle the whole rocket, Launch Site the pad from high up, Costs the sky. Wallops moves the pad 170 m
  east (nearer the sea). Vapour vents off the rocket.
- Ground step's dish: the Site's existing Blender Ground Station model (buildings.glb, `useModel`), at full size.
  No new .glb was needed.
- Below: "← Back to the design" + step bar (✓ visited, ! has a problem), one panel at a time with Back / Next.
- Footer bar, always visible: total vs money, problem count (→ Review), Test Run, Ship.
- The view is built on the first render() while shown, starts in render(), stops itself when its canvas is
  hidden or detached (checkVisibility each frame).

## Done
- launchPlanner.ts, plannerView.ts, CSS block "Launch planner: step panels" at the end of style.css,
  planner.* strings, GDD Segments bullet, CHECKLIST sub-line. Type check and tests pass.
- Browser-tested at 1920x1200, 1280x800, 1024x768 (panel scrolls inside at the small sizes), Era 1 and Era 2
  (Wallops, Delta D swap, Test Run and back, close stops drawing). Shots: screenshots/development-NASA_resources/steps-planner-*.png.

## Left (designer side, owned by the Mission Designer agent)
- Call `planner.setLogo?.(game.company.logo)` so the rocket carries the Company logo (default logo until then).
- Call `planner.dispose?.()` in the designer's destroy() to free the planner's WebGL context (Weekly Challenge).
