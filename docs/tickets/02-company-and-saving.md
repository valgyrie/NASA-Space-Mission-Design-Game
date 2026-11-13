# 02: Company and saving

**What to build:** The player names their Company and it is still there after reloading. All player-facing text comes from one strings file so translations can be added later.

**Blocked by:** 01

**Status:** done

- [x] New game asks for a Company name, with a "don't use your real full name" note
- [x] Bad words in names are rejected with a friendly message
- [x] The game autosaves locally; reloading restores the Company
- [x] No player-facing text is written outside the strings file

**QA (2026-11-12), background error:**

- [x] Tell the player when local saving fails. In a storage-failure fixture, make writes to `leap.save` throw **QuotaExceededError**, then edit the Company logo and choose **Save logo**. The logo changes in the game, but the stored Company is unchanged; reloading restores the old logo. There was one refused write and no visible alert. `saveGame` returns false, but the logo action and autosave ignore it. Browser storage being full or unavailable can silently lose progress. Keep the session playable and show a plain warning while saving is unavailable. No screenshot can show the failed background write.

**Solved (2026-11-13):** every Site save and the autosave report a refused write. A plain warning stays on screen while saving fails, play continues, and the warning goes once a save works. Rechecked with the same QuotaExceededError fixture and **Save logo**.
