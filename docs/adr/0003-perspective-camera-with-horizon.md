# Perspective camera with a horizon, not a fixed isometric camera

The design first called for a fixed isometric (orthographic) camera. The team asked to see the world carry on to the horizon, which an orthographic camera can never show. So the Site view uses a narrow-lens (30°) perspective camera that opens at the classic isometric angle and can be tilted from about 7° above the ground (horizon in view) to 70° (nearly top-down). The land around the Site is drawn from the same Seed, in less detail further out, and fades into haze before it ends.

**Considered options:** keep the orthographic camera and add scenery around the Site. Rejected: without perspective there is no horizon, only more land.

**Consequences:** the view is no longer strictly isometric, so art should not rely on exact isometric angles. Things far away look smaller. More land is drawn (about 110k triangles), which is fine on any GPU from the last decade.
