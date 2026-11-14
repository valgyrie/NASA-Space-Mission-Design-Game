# 37: Alouette 1 card

**What to build:** An "Also in 1962" side story Real History card shown after Telstar 1's "after" card: Alouette 1, Canada's first satellite. It brings in the partner agency (CSA) and a science satellite that outlived its design life.

**Blocked by:** 18

**Status:** built and browser-checked 2026-11-14 (approved 2026-11-13)

- [x] A side story card after Telstar 1's "after" card, kept in the History Archive like Vanguard 1
- [x] Short true text from the facts below (no more than the other cards), with Learn more → the CSA page
- [x] A real photo with a clear credit (CSA or NASA) _(verify the image source and its terms before adding it)_; without a cleared photo the card ships text-only or waits
- [x] Facts added to `docs/research/milestones.md` with the source
- [x] The CSA page is listed in Credits' reading sources
- [x] Text in `src/strings.ts`; history tests updated; browser check after a Telstar 1 success

**Facts** (Canadian Space Agency, <https://www.asc-csa.gc.ca/eng/satellites/alouette.asp>):
- Launched 29 September 1962, from the Pacific Missile Range, California, on a two-stage Thor-Agena rocket.
- 145 kg.
- Put into "a near perfect 1000 km orbit"; studied the ionosphere from above.
- A one-year design life stretched into a 10-year mission; over one million images of the ionosphere.
- "With the Alouette launch, Canada became the first nation, after the Russian and American superpowers, to design and build its own artificial Earth satellite."

**Suggested card:** title "Canada's first satellite"; three or four lines: launch, what it studied, one year planned and ten years worked. The ten-years line ties to LEAP's Time and margin lessons.

**In the code (read-only pointers):** cards in `src/game/history.ts` (`HISTORY_CARD_IDS`, `HISTORY_CARDS`, `when: 'side'`, `cardsAfter`); Vanguard 1 is the existing side story example; card view `src/ui/historyCard.ts`; History Archive `src/ui/archive.ts`; photos in `public/` with credits per card.

**Sources:** CSA Alouette page above. Partner agency resources are "highly encouraged" by the Project Submission Guide (`docs/challenge.md`).

**In the repo for this ticket:** Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md). The Alouette 1 facts and their CSA source are in the note.

**Open points:**
- **Resolved:** text-only, as allowed above. The CSA banner has no photo-specific credit or cleared reuse terms; its CSA/NASA credit is for the video. NASA Image and Video Library returned no Alouette images. No photo was copied.

**Validation:** 418 game tests, both type checks; browser at 1280×800 and 1024×768. Real Telstar 1 Shipping and Launch rules, with only the flight animation skipped and any Anomaly settled at a perfect played score: Mission Report → Telstar after card → Alouette. Checked archive/reopen, one saved entry, other cards still show photos, and CSA in Credits. Screenshots: `ticket-37-*` in `screenshots/development-NASA_resources/`. No save version bump.

**Online compatibility, checked 2026-11-14:** local/cloud-validator tests accept the new History ID, but the live `leap-online` v5 bundle does not. A live control save passed; the same save with `alouette1` returned HTTP 400 `invalidSave`. The backend rebuild succeeds, but automatic approval review blocked production deployment (repository work and merging did not explicitly authorize it). Deploy the rebuilt validator with approval before using the new card in cloud saves. No migration or save-version bump is needed. See `supabase/README.md` for the remaining verification and temporary account cleanup.
