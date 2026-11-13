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

**Status:** not started (approved 2026-11-13)

- [ ] Team Mode can be switched on for a Mission from the Mission Designer: pick 2, 3 or 4 players, type a short name or pick a colour per player (no personal data; names never leave the computer)
- [ ] Each slot shows its role's colour; a role's slots can be changed only while that role is "at the mouse" (a role picker at the top)
- [ ] The Design Review shows each role's lines with a **Sign** button; a role signs only its own lines; any change to a signed role's slot clears that signature
- [ ] **Ship** is enabled only when every role has signed; the reason is shown ("Waiting for: Power")
- [ ] The Mission Report names each role's part ("Power: the battery lasted all 78 days")
- [ ] Works with mouse and keyboard; nothing online; no chat
- [ ] Text in `src/strings.ts`; glossary term **Team Mode** used exactly; tests for signing and unsigning; browser check with three players on TIROS-1

**In the code (read-only pointers):** slots in `src/game/spacecraft.ts` (`Slot`, `Design`, `choose`); Mission Designer `src/ui/missionDesigner.ts`; Launch planner `src/ui/launchPlanner.ts`; Design Review from ticket 33; report `src/ui/missionReport.ts`; save in `src/save/`.

**Sources:** challenge brief, Collaboration and Game design sections ("up to four participants", "different roles or responsibilities", "negotiate between competing priorities") in `docs/challenge.md`. Roles drawn from Goddard's Mission Design Lab disciplines (power, communications, mission operations and others) <https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/>.

**In the repo for this ticket:** [`docs/research/sources/mission-design-lab.txt`](../research/sources/mission-design-lab.txt) (source files, read as data; index in [`sources/README.md`](../research/sources/README.md)). Facts and numbers: [`docs/research/official-resources.md`](../research/official-resources.md).

**Open points:**
- Is Team Mode a Company setting, a per-Mission switch, or a main-menu entry with a ready Demo Mode Company? A Demo entry may suit judges best.
- Does a team score anything extra ("successful collaboration" in the brief)? E.g. a Patch line naming the roles.
- Child safety: player names stay local and pass the existing name filter, or use colours only.
