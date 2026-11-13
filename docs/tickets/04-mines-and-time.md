# 04: Mines and time

**What to build:** The player places Mines on deposits and Raw Materials pile up over time. Time can be paused or sped up.

**Blocked by:** 03

**Status:** done

- [x] A Mine can only be placed on a matching deposit
- [x] Placing a Mine costs money
- [x] Raw Materials increase over time and are shown in the top bar
- [x] Pause, 1×, 2× and 4× speed work and affect production
- [x] Production survives save and reload

**QA (2026-11-11):**

- [x] Keep the Site paused while the pause menu is open, including when using the keyboard. Open the menu, press Tab until **1×** behind it gets focus, then Enter. The Site runs but the menu still says **Paused**. The Game date advanced about 2.4 days in five seconds; Contract days keep counting down. Also checked in the production build.

![The pause menu open while the Site runs at 1×](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/2026-11-11/pause-menu-running.png)

**Rechecked (2026-11-12):** still reproduces on `4661008`. Current screenshots: [1](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-04-pause-menu-keyboard-runs-clock.png).

**Solved (2026-11-13):** Tab stays inside the open dialog, and the top bar's speed buttons do nothing while a dialog holds the Site paused. Rechecked: 20 Tabs, Enter and a direct 1× click behind the menu; the Game date did not move in five seconds.
