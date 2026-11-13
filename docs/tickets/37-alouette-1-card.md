# 37: Alouette 1 card

**What to build:** An "Also in 1962" side story Real History card shown after Telstar 1's "after" card: Alouette 1, Canada's first satellite. It brings in the partner agency (CSA) and a science satellite that outlived its design life.

**Blocked by:** 18

**Status:** not started (approved 2026-11-13)

- [ ] A side story card after Telstar 1's "after" card, kept in the History Archive like Vanguard 1
- [ ] Short true text from the facts below (no more than the other cards), with Learn more → the CSA page
- [ ] A real photo with a clear credit (CSA or NASA) _(verify the image source and its terms before adding it)_; without a cleared photo the card ships text-only or waits
- [ ] Facts added to `docs/research/milestones.md` with the source
- [ ] The CSA page is listed in Credits' reading sources
- [ ] Text in `src/strings.ts`; history tests updated; browser check after a Telstar 1 success

**Facts** (Canadian Space Agency, <https://www.asc-csa.gc.ca/eng/satellites/alouette.asp>):
- Launched 29 September 1962, from the Pacific Missile Range, California, on a two-stage Thor-Agena rocket.
- 145 kg.
- Put into "a near perfect 1000 km orbit"; studied the ionosphere from above.
- A one-year design life stretched into a 10-year mission; over one million images of the ionosphere.
- "With the Alouette launch, Canada became the first nation, after the Russian and American superpowers, to design and build its own artificial Earth satellite."

**Suggested card:** title "Canada's first satellite"; three or four lines: launch, what it studied, one year planned and ten years worked. The ten-years line ties to LEAP's Time and margin lessons.

**In the code (read-only pointers):** cards in `src/game/history.ts` (`HISTORY_CARD_IDS`, `HISTORY_CARDS`, `when: 'side'`, `cardsAfter`); Vanguard 1 is the existing side story example; card view `src/ui/historyCard.ts`; History Archive `src/ui/archive.ts`; photos in `public/` with credits per card.

**Sources:** CSA Alouette page above. Partner agency resources are "highly encouraged" by the Project Submission Guide (`docs/challenge.md`).

**Open points:**
- Photo: the CSA page shows an Alouette I image (`/images/satellites/alouette-ban-id-155.jpg`); its credit and terms are not stated on the page _(verify)_. A NASA image may be easier to clear.
