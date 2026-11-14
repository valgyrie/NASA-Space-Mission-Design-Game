# 41: Team Mode on one screen

**What to build:** Two to four players share one Mission design on one computer and pass the mouse. Each player takes a role and owns the slots of that role. The design ships only when every role has signed its lines of the Design Review. No networking. This answers the challenge's "team of up to four" point, LEAP's largest gap.

| Role | Owns (slots and Design Review lines) |
|---|---|
| Mission lead | the Contract, Launch Vehicle, Launch Site, Budget and Time lines |
| Power | Power and Battery slots; Power and spare power / energy lines |
| Communications | Comms slot, Ground Stations; Communications line |
| Science | Payload (and Pointing); Data line |

With fewer than four players, one player holds more than one role (e.g. two players: Mission lead + Science, Power + Communications).

**Blocked by:** 33 (the Design Review)

**Status:** built 2026-11-14, waiting for a team test (approved 2026-11-13)

- [x] Team Mode can be switched on for a Mission from the Mission Designer: pick 2, 3 or 4 players, type a short name or pick a colour per player (no personal data; names never leave the computer)
- [x] Each slot shows its role's colour; a role's slots can be changed only while that role is "at the mouse" (a role picker at the top)
- [x] The Design Review shows each role's lines with a **Sign** button; a role signs only its own lines; any change to a signed role's slot clears that signature
- [x] **Ship** is enabled only when every role has signed; the reason is shown ("Waiting for: Power")
- [x] The Mission Report names each role's part ("Power: the battery lasted all 78 days")
- [x] Works with mouse and keyboard; nothing online; no chat
- [x] Text in `src/strings.ts`; glossary term **Team Mode** used exactly; tests for signing and unsigning; browser check with three players on TIROS-1

**As built (2026-11-14):**
- **Where:** a **Team Mode** button in the Mission Designer's header. It is a Company setting: the players share one Company on one computer, and it stays on for the next Missions until switched off. Not in the Weekly Challenge.
- **Players:** Off, 2, 3 or 4. Each has a colour (six to pick from, none of them the Design Review's green, yellow or red; picking a taken one swaps) and an optional nickname of up to 12 characters ("Player N" without one).
- **Roles:** two players: Mission lead + Science, Power + Communications. Three: Mission lead, Power, Communications + Science. Four: one each.
- **Who owns what:** Mission lead: Bus, Propulsion, Launch Vehicle, Launch Site, Launch Insurance; lines Orbit and mass, Time, Budget, Spare mass. Power: Power, Battery, the vibration and thermal vacuum tests; lines Power, Spare power, Spare energy. Communications: Comms, the Day in the Life test; line Communications. Science: Payload, Pointing; lines Payload, Data.
- **At the mouse:** a row of player buttons under the header. Only that player's roles can be changed; the rest are greyed out with "Pass the mouse to …".
- **Signing:** the Design Review groups its lines by role, each with a **Sign** button. A signature holds only while the role's choices and the colours of its lines stay as signed. So a role's own change clears it, and so does another role's change that turns one of its lines another colour (the negotiation the brief asks for). Buying Parts and the Test Run are open to everyone.
- **Ship:** blocked with "Waiting for: Power" until every role has signed. After Shipping the next design starts unsigned.
- **Mission Report:** a Team Mode section with one line per role, e.g. "Power · Ada: Power lasted all 78 days: …".
- **Saving:** in the Company save (still v19, optional fields). Cloud saves have the nicknames blanked; colours stay.

**Open points, decided:**
- Company setting, switched from the Mission Designer (the team asked for "two players in one base", 14 Nov). No main-menu or Demo Mode entry: any Demo Mode Company can switch it on.
- No extra score. The Mission Report names each role's part.
- Nicknames stay on the computer and pass the Company name filter; colours alone also work.
- Online co-op (players on different computers) is still the Optional idea in `CHECKLIST.md`, not this ticket.

**In the code:** `src/game/team.ts` (roles, ownership, signing), `src/ui/teamBar.ts` (setup, player buttons, role labels). Pointers from before: slots in `src/game/spacecraft.ts` (`Slot`, `Design`, `choose`); Mission Designer `src/ui/missionDesigner.ts`; Launch planner `src/ui/launchPlanner.ts`; Design Review from ticket 33; report `src/ui/missionReport.ts`; save in `src/save/`.

**Sources:** challenge brief, Collaboration and Game design sections ("up to four participants", "different roles or responsibilities", "negotiate between competing priorities") in `docs/challenge.md`. Roles drawn from Goddard's Mission Design Lab disciplines (power, communications, mission operations and others) <https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/>.

**In the repo for this ticket:** [`docs/research/sources/mission-design-lab.txt`](../research/sources/mission-design-lab.txt) (source files, read as data; index in [`sources/README.md`](../research/sources/README.md)). Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md).

**For the team test:** is passing the mouse fun with two, three and four? Should a signature clear when another role changes a line's colour, or only on the role's own change?
