# Notes: Launch planner step panels (agent working file)

## Round 2: showcase layout (built)
- PlannerView (src/world/plannerView.ts) fills the whole planner behind the text. `setSafeArea(top, bottom)` tells
  it how much the title and the bottom row cover; a camera view offset centres the subject in the free space,
  and the framing distance uses the free height. Per-step camera moves kept.
- Title top centre: step name big (spaced capitals), Segment + hint small, then the step's folds (vehicle:
  geo note/fold, reading links; site: equator tip + fold, reading links; user: four-Segments fold).
- Launch Vehicle / Launch Site: chosen name in large capitals, key numbers on one line, a rule, square tiles.
  Rocket tiles: pictures rendered by the view (`vehicleThumbnail`, one per frame into a canvas corner, copied
  out, cached by vehicle+design+logo). Closed rockets: grey, lock, reason in a hover/focus tip (still focusable,
  aria-disabled). "Too heavy" / "Can't reach" tags. Site tiles: an SVG globe with the equator and the site's
  latitude, "Best" tag on the one nearest the equator.
- Info steps: one or two translucent cards at the bottom centre. Costs: insurance card + timeline/weather card
  (the cost rows live in the bottom-left totals panel).
- Pager under the middle: ‹ n / 7 · name ›, plus dots (green = seen and fine, orange = has a problem).
- Bottom-left: running costs, total vs money, problem count (→ Review). Bottom-right: Test Run, then Ship as
  the big outlined button. Low tutorial guide moves above them (CSS :has rule, --planner-actions set in JS).
- Ground Station (the Site's Blender model) moved to (-95, 0, -20): clear of the gantry and the usual view.
- Tested 1920x1200, 1600x1000, 1280x800, 1024x768 (no page scroll), Era 1 and Era 2 (Delta D, Wallops,
  closed-tile tip), Test Run and back. Anchors: planner-tests, planner-testrun, planner-ship, design-review.

## Left
- Nothing for the designer side: setLogo and dispose are wired (logo hook) by the coordinator.
