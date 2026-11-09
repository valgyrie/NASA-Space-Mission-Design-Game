# 12: Anomalies: Stuck solar panel, Survive the eclipse

**What to build:** Two more Anomaly mini-games, each linked to a real design weakness.

**Blocked by:** 11, 14

**Status:** ready-for-agent

**From ticket 07:** Power in `checkDesign` compares energy over the whole Mission and does not check Earth's shadow yet (`SUNLIT_SHARE` is in `balance.ts`). Survive the eclipse needs a per-orbit battery check.

- [ ] Stuck solar panel is playable and more likely with cheap panels
- [ ] Survive the eclipse is playable and more likely with a thin Power margin
- [ ] Both follow the same first-time/skip and failure rules as ticket 11
