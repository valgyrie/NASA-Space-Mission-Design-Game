# 20: Easy and Advanced modes

**What to build:** Two difficulty modes with different Part sets and levels of detail.

**Blocked by:** 07

**Status:** ready-for-agent

**From ticket 07:** options and their numbers live in `OPTIONS` (`src/game/spacecraft.ts`) and `OPTION_STATS` (`src/game/balance.ts`); a second set per mode can follow the same shape.

- [ ] Mode is chosen at new game and shown in settings
- [ ] Easy: fewer Parts, rounded numbers
- [ ] Advanced: more Parts, numbers closer to the research ranges
