# 19: Company logo

**What to build:** Players make a logo with the logo maker or upload a drawing. The logo appears on rockets, the flag and Mission Patches.

**Blocked by:** 02

**Status:** built, waiting for a team test

- [x] Logo maker with shapes, colours and space icons
- [x] Default logo is an original preset
- [x] Upload is resized to 128×128 with a ~200 KB cap and a "no photos of people" warning
- [x] Logo shows on rockets, the flag and Mission Patches

**As built:** the same small editor at Company setup and from the logo beside the Company name. Three shapes (circle, shield, hexagon), three space icons (star, planet, rocket) and two colours. The original preset is a gold star on a blue hexagon. The Site pauses while editing; Save applies the draft, Cancel or Esc keeps the old logo.

Uploads accept PNG, JPEG and WebP up to 200 KB, fit inside 128×128 without stretching, and keep transparency. Only the flattened PNG is saved, not the source file or its metadata. Bad, oversized and unsupported files leave the current logo in place. The warning says no photos of people or real organisation logos.

The HQ's sign and both sides of its flag, all four Launch Vehicles, and Mission Patches in the report and History Archive use the current logo. Changing it also updates older patches. Save v16 adds `company.logo`; older saves get the preset without losing their Company or Site. Report/hide controls belong with visiting other Companies' Sites, when there are viewers.

**Files:** `src/company/logo.ts` (recipe, drawing, upload and validation), `src/ui/logoEditor.ts` (shared editor and dialog), `src/world/logoTexture.ts` (3D texture). Existing setup, HUD, HQ, rocket, Launch show, patch and save code use these.

**Tested:** 308 unit tests and the production build pass. Only three unit tests were added: v15 migration, custom logo persistence and invalid saved logo data. Chromium at 1280×800 and 1024×768: maker options, colours, PNG/JPEG/WebP resize and transparency, invalid uploads, Save/Cancel/Esc, pause, maker/upload reload, old-save migration, HQ flag/sign, Launch show, Mission Report and patch gallery. All four rocket models use the logo and release its texture. No page errors. Touch and a team member's own drawing remain unchecked.

**QA (2026-11-12):**

- [x] Keep the Site paused while the logo editor is open, including keyboard input. Click the Company logo, Tab past the editor's controls to **1×** or **4×** in the top bar, then Enter. The Game date and Contract deadline keep moving behind the editor. The pause menu has the same existing issue (ticket 04); the editor added in this ticket also needs to contain focus.

![The logo editor open while the Site runs](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-19-logo-editor-keyboard-runs-clock.png)

Also reproduced in the production build, without development hooks: **4×** runs behind the editor. [Before](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-19-production-logo-clock-before.png), [after](../../screenshots/development-No_NASA_resources-/bugs%20and%20errors/ticket-19-production-logo-clock-after.png).

**Solved (2026-11-13):** the editor keeps Tab inside itself and the speed buttons wait until it closes (shared fix with ticket 04). Rechecked in development and in the production build at 4×: the Game date did not move.
