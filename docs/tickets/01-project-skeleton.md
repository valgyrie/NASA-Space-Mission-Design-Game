# 01: Project skeleton

**What to build:** The game opens in a browser showing an empty isometric low-poly world the player can pan, zoom and rotate. Type checks and tests run automatically before every commit.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Running one command starts the game locally in a browser
- [x] An empty isometric ground plane is visible with soft lighting
- [x] Mouse pans, zooms and rotates the camera smoothly
- [x] Type check and test run on every commit and block it on failure

**Changed later (2026-11-08):** the camera became a perspective camera that can also tilt down to the horizon, and the ground became a Site with land around it (ADR-0003).
- [x] README says how to run the game

**QA (2026-11-11):**

- [ ] Keep the camera above hills when zoomed close and tilted low. On Seed **K7QXM2**, Historic start, zoom into low land beside higher ground and hold **F**. The camera can go under the hillside: terrain disappears and the land looks cut open. **H** recovers the view.

![The Site camera under a hillside](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/2026-11-11/site-camera-under-hill.png)

**Rechecked (2026-11-12):** still reproduces on `4661008`. Current screenshots: [1](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-01-site-camera-under-hill.png).
