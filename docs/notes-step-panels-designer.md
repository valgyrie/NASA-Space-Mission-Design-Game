# Notes: Mission Designer step panels (agent working file)

## Plan
- Layout: 3D view on top (full width, ~60% height), resources as a compact card over its top-right corner.
  Bottom: step bar (one step per shown slot + "Check", "Plan the Launch →" at its right end), then only the
  current slot's panel (name + hint fold, option cards in a row, stock/Buy, Team "not yours"), Back / Next.
  Check step: warnings, status, Buy all missing Parts, mode fold, reading links.
- Assembly: `buildSpacecraft` groups each slot's meshes under a group tagged `userData.slot` (no look change).
  SpacecraftView slides the changed slot's Part in (~0.55 s, slight settle) and eases the camera to frame the
  whole Spacecraft. Opening the designer puts the whole Spacecraft together Part by Part.

## Done
- src/ui/missionDesigner.ts: step panels, `gaugeShort`, steps respect isSlotShown / Weekly `allows` / Team roles.
- src/world/spacecraftMesh.ts: `partOf` groups per slot. src/world/spacecraftView.ts: `assemble()`, arrivals,
  framing; a redraw with an unchanged design no longer rebuilds the model.
- style.css block "Mission Designer: step panels"; strings `designer.step*`, `designer.check*`, `designer.gaugeShort.*`.
- Low tutorial guide moves over the 3D view (body class `designer-steps-open`, `--designer-deck`).
- Tested in the browser at 1920×1200, 1280×800, 1024×768 (empty, assembly, Check, Team Mode, tutorial).
- GDD bullet and CHECKLIST line updated.

## Left
- Weekly Challenge variant not tried in the browser (needs Online); code path unchanged apart from layout.
- No Blender prop added (a work stand makes no sense floating over Earth).
