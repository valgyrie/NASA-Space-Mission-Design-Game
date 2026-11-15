# Eras demo: play-test notes (15 Nov 2026, evening)

Played in a cloud container: headless Chromium with software WebGL, so frame rates here say nothing about the
Intel UHD laptop. The launch show drops to its simple view on this machine; the test forced the 3D view back on.
Each Moon sequence was also rendered beat by beat with a small debug page (`MoonShow` alone, any second).

## Played

- **Era 3 (Demo Mode), 1280×800:** Mission Designer (Apollo 11 design, all clear), Launch planner (Saturn V on
  LC-39A), Ship, scrub, Launch: Saturn V on the pad, liftoff, climb, staging, S-IVB; the whole Moon sequence (Off to
  the Moon, lunar orbit, Eagle undocks, powered descent, contact light, landed, crew sets up the package); Mission
  days with the "Point the antenna" Anomaly.
- **Era 5 (Demo Mode), 1280×800:** Artemis II (SLS on LC-39B, liftoff, boosters away, core stage; Mission Report;
  Patch), the Artemis III choice board, Artemis III docking camera (Falcon 9, the Moon-segment beats in order,
  Mission days, Anomaly, report, "Ready for the Moon" card), Artemis IV lunar relay (all beats: over the Moon,
  lander away, descent, ridge, moonwalk; Mission days; "Stuck solar panel" Anomaly) and Artemis IV cargo lander
  (report, the closing card "From Explorer 1 to the Moon", then Continue in Free Play on the Contracts board: the
  Company switches to Free Play and gets the question board).
- **1024×768:** Space view after Artemis II, the Mission Designer's steps with the new Parts (CubeSat Bus, Fold-out
  Solar Panels, Lander, Science Package, Relay Radio), Continue in Free Play.
- **Beat by beat (debug page):** Apollo 11, Artemis II, Artemis III (camera, relay, space-weather), Artemis IV
  (relay, cargo lander, Moon Mapper).
- No console errors in any run. One three.js warning on every screen (`iridescenceThicknessRange` renamed) is fixed.

## Fixed

- Apollo 11 "The Eagle has landed": the camera was under the ground (lower half black, Eagle cut off) and never
  tilted far enough to show Earth. Now it stands near Eagle and pans up over its top to Earth, 66.5° up in the west.
- Artemis II CubeSat release: the ICPS filled the frame and the CubeSat was a speck (it also flew out through the
  adapter wall). Now the camera follows the Company's CubeSat out of its dispenser.
- Artemis III "your satellite": the camera looked up from below with the lander filling half the frame and no Earth.
  Now the satellite is seen from the side with Earth's limb behind it.
- Mission Report: a one-day Mission said "Power lasted all 1 days"; it now says "the whole day".
- Seven caption facts corrected against NASA pages; the Apollo 11 History card now says who set up what
  (Aldrin the seismometer, Armstrong the reflector).

## Left for the team

- The Anomaly mini-games always draw Earth below the Spacecraft, also in lunar orbit and on the Moon.
- Artemis II: seen from above, the ICPS adapter is a plain grey disc.
- Earth from the Moon is drawn at its real size (about 2°), so it is small on screen.
- The Space view shows the Moon only on the "Earth to the Moon" reference path (now with NASA's Moon texture), not
  around Spacecraft that went to the Moon.
- Not checked here: frame rate on the Intel UHD laptop (this container renders in software); the Moon Mapper choice
  played through the game (its sequence was checked on the debug page); the Launch show at 1024×768.
