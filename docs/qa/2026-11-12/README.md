# QA: 12 November 2026

Checked the latest `main`, **4661008**, on `codex/qa-screenshots-tickets-19-31`. Chromium at **1440×900**, **1024×768** and **700×600**. Game code is unchanged. The eight earlier open findings still reproduce. This pass confirms six new findings and checks the narrow-screen overlap already noted in ticket 30: **15 open findings** in total. Shared causes are counted once.

Screenshots now live under [`screenshots/`](../../../screenshots/README.md). The [problem index](../../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/README.md) gives the visible trigger and current captures. The two background failures have measured evidence in their tickets, without a screenshot. Earlier captures are kept separately; none were deleted.

## Open findings

| Ticket | Finding | This pass |
|---|---|---|
| [22](../../tickets/22-online-basics.md), [30](../../tickets/30-buy-neighbouring-plots.md) | Current cloud saves rejected | **New.** Live v19 save: HTTP 400 `invalidSave`; the same Company in v18 format: HTTP 200, revision 1. Also seen in the production UI. |
| [02](../../tickets/02-company-and-saving.md) | Refused local saves silently lose changes | **New, background.** A QuotaExceededError fixture refused a logo save; the game changed, no alert appeared, and reload restored the old logo. |
| [19](../../tickets/19-company-logo.md) | Logo editor lets keyboard input restart the Site | **New.** Tab reaches background speed buttons; the Game date advances behind the editor. Production check also passes through the real UI. |
| [26](../../tickets/26-look-and-feel.md) | Site previews retain old building buffers | **New, background.** Three setup/Back round trips: 2,161 → 4,303 → 6,445 → 8,587 outstanding WebGL buffers. |
| [30](../../tickets/30-buy-neighbouring-plots.md) | Active Shipping route ignores bought land | **New.** Buy the east Plot during assembly: the truck disappears at x≈59.29 inside owned land, while Shipping is still under way. |
| [30](../../tickets/30-buy-neighbouring-plots.md) | Whole Site view crops bought Plots | **New.** Buy two east Plots, press H: the camera keeps its Home Site centre and distance. The east corners remain outside the screen. |
| [26](../../tickets/26-look-and-feel.md), [30](../../tickets/30-buy-neighbouring-plots.md) | Wrapped top bar covers side panels | Known from ticket 30; also affects the building panel. Reproduced at 700×600. The Era 2 building panel is clear at 1024×768. |
| [01](../../tickets/01-project-skeleton.md) | Site camera enters a hillside | Reproduced close to the coast on K7QXM2; terrain is cut open. H recovers it. |
| [04](../../tickets/04-mines-and-time.md) | Pause-menu keyboard input restarts the Site | Reproduced: Tab to 1× and Enter; the clock runs behind “Paused”. |
| [05](../../tickets/05-factories-and-market.md) | Factory completion/returned inputs overfill storage | Reproduced **503 / 500 kg** and **540 / 500 kg**. |
| [05](../../tickets/05-factories-and-market.md) | Paused Factory has an empty waiting reason | Reproduced “Waiting for” with all 40 kg Aluminium available. |
| [08](../../tickets/08-first-full-mission-loop.md) | Warehouse can occupy the Shipping dock | Reproduced: green marker at (48, 36), then a paid Warehouse through the truck/crane. |
| [13](../../tickets/13-tutorial-and-history.md) | Tutorial covers the Shipping button | Reproduced at 1440×900. The centre of Shipping hits `tutorial-line`. |
| [16](../../tickets/16-real-places-and-weather.md) | Scrub card leaves the clock running | Reproduced: the card still recommends 7 March 1962 after the date has moved beyond it. |
| [17](../../tickets/17-risk-and-failure.md) | Failed-rocket report claims flight achievements | Reproduced Thor-Delta stage 2 failure; report still claims 136 days of Power, all Data home and completion before the deadline. Insurance pays $2.18M correctly. |

## Tickets 19–31

| Ticket | Browser check in this pass | Still to check or finish |
|---|---|---|
| 19 | Maker changes, Save, reload under storage failure; editor keyboard escape | Team member’s own drawing; touch. Clock and storage failures above. |
| 20 | Advanced Parts selected, six resource bars, Market options, Settings | Team playtest. Full Advanced flight was covered by the earlier run, not repeated here. |
| 21 | Modern Company and all three generated Contract types on the board | Full Campaign continuation and all three flights not repeated here. |
| 22 | Live recovery, v18 control save, v19 rejection; production UI error | Fix deployment mismatch, then check v19 upload/load with owned land. |
| 23 | Live design and successful submission (**90.88/100**); local Company save stayed byte-for-byte unchanged | Human competition/playtest; a new week boundary was not simulated. |
| 24 | Era 2 Demo entry, menu return, separate saving | Era 1 demo and real-laptop loading speed not repeated/measured here. |
| 25 | Music 23%, effects 41% persisted across reload and Demo Mode | Human listening, Safari/Firefox and real speakers/headphones. Earlier audio waveform/loop checks were not repeated. |
| 26 | Credits/menu return, normal 1024 layout and 700 layout failure; buffer count | Team visual review, real-device performance. |
| 27 | Expanded Real data list and its visible credits | Official Resources are still pending; no resource-release work was done. |
| 28 | Credits opens and returns to the menu | Hosting, names, video, project page and public repository remain team tasks. |
| 29 | Era 2 card’s expected text-only fallback | Actual Era illustrations are still missing by design; no stand-in art added. |
| 30 | Buying land, expanding during assembly, truck disappearance, Whole Site view and narrow Plot card | Fixes above; land-price and Survey decisions remain team review. |
| 31 | Space view follows an Explorer 1 fixture; drag and zoom leave the camera outside Earth | Camera radius after the gestures: 42.95, above the 31.5 floor. The earlier inside-Earth finding remains marked fixed. |

## Verification and limits

**356 tests**, client/backend type checks, the production build and the online bundle pass. No tests, dependencies or test framework were added. The build still reports its existing large-chunk warning. Launcher checks remain deferred to the final ticket, as `AGENTS.md` requires.

Prepared Demo/saved-Company fixtures and the existing development handle set up stock, camera positions, Shipping dates and flight outcomes. The normal UI and game rules then reproduce the findings. The failed-rocket check uses a previous-flight fixture so first-Launch protection does not hide the failure. Land checks use a $20M fixture to avoid waiting for Contract income. The storage-error fixture deliberately refuses `leap.save` writes; it does not claim that the browser’s real quota was full. Buffer instrumentation counts creation minus deletion; a crash or frame-rate drop was not measured.

Production checks use the built game without development hooks for the logo-editor clock and cloud-save failure. Completed browser checks reported no uncaught application page errors. The temporary Online account, control save and weekly result were removed with the user’s approval; both account and weekly-row counts were verified as zero. Recovery codes are masked in screenshots.

A full Campaign playthrough, all Anomaly mini-games and beginner tutorial timing were not repeated. Their previous coverage is recorded in the tickets and [11 November QA](../2026-11-11/README.md). Touch, Safari/Firefox, real-device performance and human difficulty/listening judgements remain unchecked. Unfinished features and team review are kept separate from confirmed bugs.

## Writing and testing followed

Reviewed the repository’s Markdown, all 31 tickets, the handoff/log, glossary, decisions, checklist and existing tests before recording the findings. Kept the same short **QA** notes and unchecked fixes in the relevant tickets, with a concrete trigger, observed result and evidence. Glossary terms and existing scope are preserved. No design or historical facts changed, so the GDD, glossary and decisions need no new entries. Future captures use the paths and filename convention in `screenshots/README.md`; focused tests should accompany fixes, with browser checks before ticking them.
