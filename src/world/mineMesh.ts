import * as THREE from 'three';
import type { RawMaterial } from '../economy/rawMaterial';
import { M, box, buildingGroup, colourMat, gableRoof, parts, v } from './buildingParts';
import { useModel } from './buildingModels';
import { DEPOSIT_COLOUR } from './siteMesh';

/**
 * A detailed low-poly Mine that fits one tile: concrete pad, hoist house, a steel headframe over the
 * shaft with a winding wheel (named "spin", it turns while the Site runs), a cart on rails, ore piles
 * in the colour of the Raw Material, and a lamp.
 */

export function buildMine(material: RawMaterial): THREE.Group {
  const g = buildingGroup('mine');
  const { add, bar, lamp } = parts(g);
  const ore = colourMat(DEPOSIT_COLOUR[material]);

  // Ground: concrete pad and the dark shaft opening under the headframe.
  add(box(0.9, 0.05, 0.9), M.concrete, 0, 0.025, 0);
  const shaft = { x: 0.18, z: -0.18 };
  add(box(0.26, 0.04, 0.26), M.dark, shaft.x, 0.06, shaft.z);

  // Hoist house: walls, gable roof, door and windows.
  const house = { x: -0.17, z: 0.14 };
  add(box(0.44, 0.3, 0.36), M.wall, house.x, 0.2, house.z);
  add(gableRoof(0.42, 0.16, 0.5), M.roof, house.x, 0.35, house.z);
  add(box(0.1, 0.17, 0.02), M.door, house.x + 0.1, 0.135, house.z + 0.185);
  add(box(0.1, 0.07, 0.02), M.glass, house.x - 0.1, 0.24, house.z + 0.185);
  add(box(0.02, 0.07, 0.1), M.glass, house.x - 0.225, 0.24, house.z);

  // Headframe: four leaning legs, braces on every side, a deck on top, and a back leg to the house.
  const h = 1.0;
  const base = 0.13;
  const top = 0.08;
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const;
  const at = (sx: number, sz: number, y: number) => {
    const r = base + (top - base) * (y / h);
    return v(shaft.x + sx * r, y, shaft.z + sz * r);
  };
  for (const [sx, sz] of corners) bar(at(sx, sz, 0.05), at(sx, sz, h), 0.035, M.steel);
  for (const y of [0.35, 0.68]) {
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i]!;
      const [bx, bz] = corners[(i + 1) % 4]!;
      bar(at(ax, az, y), at(bx, bz, y), 0.025, M.steel);
    }
  }
  // Cross bracing on the two faces you see from the start view.
  bar(at(1, 1, 0.08), at(-1, 1, 0.35), 0.02, M.steel);
  bar(at(-1, 1, 0.08), at(1, 1, 0.35), 0.02, M.steel);
  bar(at(1, -1, 0.08), at(1, 1, 0.35), 0.02, M.steel);
  bar(at(1, 1, 0.08), at(1, -1, 0.35), 0.02, M.steel);
  add(box(0.22, 0.03, 0.22), M.steel, shaft.x, h + 0.015, shaft.z);
  bar(v(shaft.x - 0.05, h, shaft.z + 0.05), v(house.x + 0.12, 0.36, house.z - 0.08), 0.04, M.steel);

  // Winding wheel on top, facing the house, with spokes. It turns while the Site runs.
  const wheel = new THREE.Group();
  wheel.position.set(shaft.x, h + 0.14, shaft.z);
  wheel.rotation.y = -Math.PI / 4;
  g.add(wheel);
  const spin = new THREE.Group();
  spin.name = 'spin';
  wheel.add(spin);
  add(new THREE.TorusGeometry(0.11, 0.018, 6, 14), M.steel, 0, 0, 0, spin);
  for (let i = 0; i < 3; i++) {
    const spoke = add(box(0.012, 0.21, 0.012), M.steel, 0, 0, 0, spin);
    spoke.rotation.z = (i * Math.PI) / 3;
  }
  // Cable from the wheel down into the hoist house.
  bar(v(shaft.x - 0.07, h + 0.2, shaft.z + 0.07), v(house.x + 0.08, 0.33, house.z - 0.04), 0.008, M.dark);

  // Rails from the shaft to the front, a cart full of ore, and the ore piles.
  for (const dx of [-0.045, 0.045]) add(box(0.015, 0.015, 0.5), M.rail, shaft.x + 0.03 + dx, 0.06, 0.12);
  for (let i = 0; i < 4; i++) add(box(0.14, 0.012, 0.03), M.wood, shaft.x + 0.03, 0.055, -0.08 + i * 0.13);
  add(box(0.13, 0.08, 0.16), M.steel, shaft.x + 0.03, 0.12, 0.2);
  add(box(0.11, 0.035, 0.14), ore, shaft.x + 0.03, 0.17, 0.2);
  add(new THREE.ConeGeometry(0.15, 0.17, 7), ore, -0.3, 0.13, -0.27);
  add(new THREE.ConeGeometry(0.09, 0.1, 6), ore, -0.13, 0.1, -0.33);

  // Lamp post at the front corner.
  lamp(0.38, 0.38);

  // The realistic model replaces all this once it has loaded (buildingModels.ts).
  useModel(g, 'mine', { ore: DEPOSIT_COLOUR[material] });
  return g;
}
