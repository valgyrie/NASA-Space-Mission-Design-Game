import * as THREE from 'three';
import type { FactoryKind } from '../economy/part';
import { RAW_MATERIALS } from '../economy/rawMaterial';
import { M, PRODUCT_COLOUR, addSmoke, box, buildingGroup, colourMat, gableRoof, parts, v } from './buildingParts';
import { at, useModel } from './buildingModels';
import { DEPOSIT_COLOUR } from './siteMesh';

/**
 * Detailed low-poly Factories and the Warehouse, one tile each, at the Mine's level of detail.
 * Doors and windows face +x and +z, the sides the start view shows. Moving parts are named as in
 * `buildingParts.ts`; each Factory moves only while it is making something.
 */

type Parts = ReturnType<typeof parts>;

/** A roll-up door with ribs, on the +z face at `z`. */
function shutterDoor(p: Parts, x: number, z: number, w: number, h: number): void {
  p.add(box(w, h, 0.015), M.shutter, x, 0.05 + h / 2, z);
  for (let y = 0.08; y < h; y += 0.04) p.add(box(w, 0.006, 0.02), M.steel, x, 0.05 + y, z);
}

/** A row of windows along the +z face. */
function windowsZ(p: Parts, xs: number[], y: number, z: number, w = 0.08, h = 0.06): void {
  for (const x of xs) p.add(box(w, h, 0.015), M.glass, x, y, z);
}

/** A row of windows along the +x face. */
function windowsX(p: Parts, zs: number[], y: number, x: number, w = 0.08, h = 0.06): void {
  for (const z of zs) p.add(box(0.015, h, w), M.glass, x, y, z);
}

/** A wooden pallet with its top at y = 0.08. */
function pallet(p: Parts, x: number, z: number, w = 0.2, d = 0.16): void {
  p.add(box(w, 0.03, d), M.wood, x, 0.065, z);
}

/** Metal Works: a corrugated hall, a brick chimney that smokes, a glowing furnace, aluminium plates and a Bus frame. */
function metalWorks(g: THREE.Group, p: Parts): void {
  const product = colourMat(PRODUCT_COLOUR.metalWorks, { metalness: 0.5, roughness: 0.35 });
  // Hall: x −0.4…0.2, z −0.35…0.11.
  p.add(box(0.6, 0.34, 0.46), M.corrugated, -0.1, 0.22, -0.12);
  p.add(gableRoof(0.52, 0.14, 0.64), M.darkRoof, -0.1, 0.39, -0.12);
  shutterDoor(p, -0.06, 0.115, 0.2, 0.22);
  windowsZ(p, [-0.3, 0.12], 0.33, 0.115);
  windowsX(p, [-0.26, -0.12, 0.02], 0.32, 0.205);

  // Brick chimney at the back with white bands; smoke rises from it.
  p.cyl(0.06, 0.95, M.brick, -0.3, 0.05, -0.3, 8);
  p.cyl(0.063, 0.04, M.white, -0.3, 0.84, -0.3, 8);
  p.cyl(0.063, 0.04, M.white, -0.3, 0.92, -0.3, 8);
  addSmoke(g, -0.3, 1.02, -0.3);

  // Furnace on the +x side, glowing through its mouth, with a flue into the hall.
  p.add(box(0.16, 0.18, 0.18), M.brick, 0.3, 0.14, -0.2);
  p.add(box(0.018, 0.07, 0.09), M.fire, 0.385, 0.12, -0.2);
  p.cyl(0.03, 0.18, M.steel, 0.3, 0.23, -0.24, 6);
  p.bar(v(0.3, 0.4, -0.24), v(0.2, 0.36, -0.24), 0.04, M.steel);

  // Yard: a stack of aluminium plates, I-beams, and a finished Bus frame on a pallet.
  for (let i = 0; i < 4; i++) p.add(box(0.2, 0.018, 0.13), product, 0.27, 0.06 + i * 0.022, 0.26 + (i % 2) * 0.01);
  for (let i = 0; i < 3; i++) p.add(box(0.3, 0.03, 0.03), product, -0.22, 0.065 + (i === 2 ? 0.03 : 0), 0.24 + (i % 2) * 0.05 + (i === 2 ? 0.025 : 0));
  pallet(p, 0.03, 0.31, 0.17, 0.17);
  const s = 0.07;
  const cx = 0.03;
  const cz = 0.31;
  const y0 = 0.085;
  for (const [ax, az, bx, bz] of [
    [-1, -1, 1, -1],
    [1, -1, 1, 1],
    [1, 1, -1, 1],
    [-1, 1, -1, -1],
  ] as const) {
    for (const y of [y0, y0 + 2 * s]) p.bar(v(cx + ax * s, y, cz + az * s), v(cx + bx * s, y, cz + bz * s), 0.014, product);
    p.bar(v(cx + ax * s, y0, cz + az * s), v(cx + ax * s, y0 + 2 * s, cz + az * s), 0.014, product);
  }
  p.lamp(0.4, -0.4);
}

/** Electronics Lab: a clean white two-storey lab with window bands, a green stripe, and a turning dish on a mast. */
function electronicsLab(_g: THREE.Group, p: Parts): void {
  const product = colourMat(PRODUCT_COLOUR.electronicsLab);
  // Building: x −0.36…0.2, z −0.32…0.12, two storeys.
  p.add(box(0.56, 0.42, 0.44), M.white, -0.08, 0.26, -0.1);
  p.add(box(0.6, 0.03, 0.48), M.white, -0.08, 0.485, -0.1);
  p.add(box(0.565, 0.03, 0.445), product, -0.08, 0.45, -0.1);
  for (const y of [0.25, 0.38]) {
    p.add(box(0.5, 0.07, 0.015), M.glass, -0.08, y, 0.122);
    p.add(box(0.015, 0.07, 0.38), M.glass, 0.202, y, -0.1);
  }
  // Glass entrance with a little canopy.
  p.add(box(0.12, 0.14, 0.02), M.glass, -0.08, 0.12, 0.125);
  p.add(box(0.18, 0.015, 0.08), M.white, -0.08, 0.2, 0.16);

  // Roof: air-conditioning boxes and a mast with a dish that turns while the lab works.
  for (const x of [0.05, 0.13]) {
    p.add(box(0.07, 0.05, 0.07), M.tank, x, 0.525, -0.05);
    p.cyl(0.022, 0.006, M.dark, x, 0.55, -0.05, 8);
  }
  p.cyl(0.012, 0.36, M.steel, -0.25, 0.5, -0.24, 6);
  const dish = p.mover('spinY', -0.25, 0.86, -0.24);
  dish.userData.speed = 0.8;
  const bowl = p.add(new THREE.SphereGeometry(0.13, 10, 5, 0, Math.PI * 2, 0, Math.PI / 4.5), M.dish, 0, 0, 0, dish);
  bowl.rotation.x = Math.PI / 2 + 0.5;
  bowl.position.set(0, 0.02, 0.06);
  p.bar(v(0, 0.02, -0.02), v(0, 0.05, 0.12), 0.01, M.steel, dish);

  // Crates of green circuit boards on a pallet by the door.
  pallet(p, 0.25, 0.3, 0.18, 0.14);
  p.add(box(0.07, 0.06, 0.06), product, 0.21, 0.11, 0.3);
  p.add(box(0.07, 0.06, 0.06), product, 0.29, 0.11, 0.3);
  p.add(box(0.07, 0.06, 0.06), product, 0.25, 0.17, 0.3);
  p.lamp(-0.38, 0.38);
}

/** One solar panel: a silver frame with four blue cells, lying flat around its centre. */
function solarPanel(p: Parts, parent: THREE.Object3D, w: number, d: number): void {
  const blue = colourMat(PRODUCT_COLOUR.solarFab, { roughness: 0.25, metalness: 0.4 });
  p.add(box(w, 0.01, d), M.pipe, 0, 0, 0, parent);
  const cw = w / 2 - 0.012;
  const cd = d / 2 - 0.012;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.add(box(cw, 0.012, cd), blue, (sx * w) / 4, 0.003, (sz * d) / 4, parent);
}

/** Solar Fab: a long hall with blue panels on the roof, a test panel that follows the Sun, and finished panels. */
function solarFab(g: THREE.Group, p: Parts): void {
  // Hall: x −0.4…0.3, z −0.33…0.09.
  p.add(box(0.7, 0.24, 0.42), M.wall, -0.05, 0.17, -0.12);
  p.add(box(0.74, 0.03, 0.46), M.darkRoof, -0.05, 0.305, -0.12);
  shutterDoor(p, 0.12, 0.095, 0.14, 0.17);
  p.add(box(0.07, 0.13, 0.015), M.door, -0.25, 0.115, 0.095);
  windowsZ(p, [-0.1], 0.2, 0.095, 0.12, 0.06);
  windowsX(p, [-0.24, -0.05], 0.2, 0.302);
  // Two rows of three roof panels, tilted towards the low Sun.
  for (const z of [-0.23, -0.02]) {
    for (const x of [-0.29, -0.05, 0.19]) {
      const holder = new THREE.Group();
      holder.position.set(x, 0.345, z);
      holder.rotation.x = 0.35;
      g.add(holder);
      solarPanel(p, holder, 0.21, 0.17);
    }
  }
  // Test panel on a pole: it swings to follow the Sun while the Fab works.
  p.cyl(0.014, 0.3, M.steel, 0.3, 0.05, 0.3, 6);
  const tracker = p.mover('swing', 0.3, 0.37, 0.3);
  const tilt = new THREE.Group();
  tilt.rotation.x = 0.6;
  tracker.add(tilt);
  solarPanel(p, tilt, 0.2, 0.15);
  // Finished panels stacked on a pallet.
  pallet(p, -0.22, 0.28, 0.24, 0.18);
  for (let i = 0; i < 3; i++) {
    const stack = new THREE.Group();
    stack.position.set(-0.22, 0.09 + i * 0.016, 0.28);
    g.add(stack);
    solarPanel(p, stack, 0.21, 0.16);
  }
  p.lamp(0.4, -0.4);
}

/** Battery Plant: a works building, two tall tanks with pipes, a roof fan, and pallets of yellow battery cells. */
function batteryPlant(_g: THREE.Group, p: Parts): void {
  const product = colourMat(PRODUCT_COLOUR.batteryPlant);
  // Building: x −0.41…0.01, z −0.07…0.31.
  p.add(box(0.42, 0.28, 0.38), M.wall, -0.2, 0.19, 0.12);
  p.add(box(0.46, 0.03, 0.42), M.darkRoof, -0.2, 0.345, 0.12);
  p.add(box(0.425, 0.03, 0.385), product, -0.2, 0.3, 0.12);
  shutterDoor(p, -0.26, 0.315, 0.14, 0.16);
  p.add(box(0.07, 0.13, 0.015), M.door, -0.06, 0.115, 0.315);
  windowsX(p, [0.04, 0.2], 0.21, 0.012);
  // Roof fan: a round housing with blades that turn while the plant works.
  p.cyl(0.085, 0.05, M.tank, -0.25, 0.36, 0.08, 12);
  const fan = p.mover('spinY', -0.25, 0.415, 0.08);
  fan.userData.speed = 6;
  for (let i = 0; i < 3; i++) {
    const blade = p.add(box(0.14, 0.006, 0.03), M.dark, 0, 0, 0, fan);
    blade.rotation.y = (i * Math.PI) / 3;
  }
  // Two tanks with domed tops and yellow bands, piped into the building.
  for (const [x, z] of [
    [0.06, -0.27],
    [0.28, -0.22],
  ] as const) {
    p.cyl(0.095, 0.48, M.tank, x, 0.05, z, 12);
    p.add(new THREE.SphereGeometry(0.095, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), M.tank, x, 0.53, z);
    p.cyl(0.098, 0.04, product, x, 0.36, z, 12);
    p.cyl(0.098, 0.015, M.stripe, x, 0.34, z, 12);
    for (const [lx, lz] of [
      [-1, -1],
      [1, 1],
    ] as const)
      p.add(box(0.02, 0.06, 0.02), M.steel, x + lx * 0.06, 0.08, z + lz * 0.06);
  }
  p.bar(v(0.06, 0.2, -0.17), v(0.06, 0.2, -0.02), 0.025, M.pipe);
  p.bar(v(0.06, 0.2, -0.02), v(-0.01, 0.2, -0.02), 0.025, M.pipe);
  p.bar(v(0.28, 0.26, -0.13), v(0.28, 0.26, 0.02), 0.025, M.pipe);
  p.bar(v(0.28, 0.26, 0.02), v(-0.01, 0.26, 0.02), 0.025, M.pipe);
  p.bar(v(0.28, 0.05, 0.02), v(0.28, 0.26, 0.02), 0.02, M.steel);
  // Pallet of battery cells: yellow cylinders with dark tops.
  pallet(p, 0.26, 0.28, 0.2, 0.16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      const x = 0.195 + i * 0.044;
      const z = 0.235 + j * 0.044;
      p.cyl(0.018, 0.065, product, x, 0.08, z, 8);
      p.cyl(0.012, 0.012, M.dark, x, 0.145, z, 6);
    }
  }
  p.lamp(0.4, -0.02);
}

const BUILDERS: Record<FactoryKind, (g: THREE.Group, p: Parts) => void> = {
  metalWorks,
  electronicsLab,
  solarFab,
  batteryPlant,
};

/** A Factory model of `kind`, standing on a concrete pad. */
export function buildFactory(kind: FactoryKind): THREE.Group {
  const g = buildingGroup(kind);
  const p = parts(g);
  p.add(box(0.9, 0.05, 0.9), M.concrete, 0, 0.025, 0);
  BUILDERS[kind](g, p);
  // The realistic model replaces the code-built one once it has loaded; Metal Works' smoke moves to its chimney.
  useModel(g, kind, { product: PRODUCT_COLOUR[kind] }, [], (model) => {
    model.getObjectByName('smoke')?.position.copy(at(-6.5, 32.6, -12.6));
  });
  return g;
}

/** Warehouse: a long red-roofed store with a big door, crates in every colour, and a forklift at work. */
export function buildWarehouse(): THREE.Group {
  const g = buildingGroup('warehouse');
  const p = parts(g);
  p.add(box(0.9, 0.05, 0.9), M.concrete, 0, 0.025, 0);
  // Hall: x −0.38…0.38, z −0.38…0.12.
  p.add(box(0.76, 0.26, 0.5), M.corrugated, 0, 0.18, -0.13);
  p.add(gableRoof(0.56, 0.15, 0.8), M.roof, 0, 0.31, -0.13);
  p.add(box(0.77, 0.03, 0.51), M.wall, 0, 0.065, -0.13);
  shutterDoor(p, 0.06, 0.125, 0.26, 0.2);
  p.add(box(0.07, 0.13, 0.015), M.door, -0.24, 0.115, 0.125);
  windowsX(p, [-0.28, -0.13, 0.02], 0.26, 0.382, 0.08, 0.05);
  windowsZ(p, [-0.32, 0.3], 0.26, 0.125, 0.06, 0.05);

  // Crates outside in the colours of what is stored: Raw Materials and Parts.
  const colours = [...RAW_MATERIALS.map((m) => DEPOSIT_COLOUR[m]), ...Object.values(PRODUCT_COLOUR)];
  const spots = [
    [-0.36, 0.22, 0],
    [-0.27, 0.22, 0],
    [-0.36, 0.22, 1],
    [-0.36, 0.31, 0],
    [0.3, 0.22, 0],
    [0.37, 0.22, 0],
    [0.3, 0.31, 0],
  ] as const;
  spots.forEach(([x, z, level], i) => {
    p.add(box(0.075, 0.075, 0.075), M.wood, x, 0.09 + level * 0.08, z);
    p.add(box(0.065, 0.012, 0.065), colourMat(colours[i % colours.length]!), x, 0.13 + level * 0.08, z);
  });

  // Forklift driving in and out of the door with a crate on its forks.
  const fork = p.mover('shuttle', 0.06, 0.05, 0.3);
  fork.userData.base = 0.3;
  fork.userData.range = 0.07;
  p.add(box(0.08, 0.05, 0.1), M.yellow, 0, 0.035, 0.01, fork);
  p.add(box(0.07, 0.006, 0.07), M.dark, 0, 0.12, 0.02, fork);
  for (const sx of [-1, 1]) {
    p.bar(v(sx * 0.03, 0.06, 0.05), v(sx * 0.03, 0.12, 0.05), 0.008, M.dark, fork);
    p.bar(v(sx * 0.03, 0.02, -0.045), v(sx * 0.03, 0.16, -0.045), 0.012, M.steel, fork);
    p.add(box(0.012, 0.006, 0.07), M.steel, sx * 0.025, 0.03, -0.08, fork);
    for (const z of [-0.025, 0.04]) {
      const wheel = p.add(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 8), M.dark, sx * 0.042, 0.018, z, fork);
      wheel.rotation.z = Math.PI / 2;
    }
  }
  p.add(box(0.06, 0.05, 0.06), M.wood, 0, 0.06, -0.085, fork);
  p.add(box(0.05, 0.01, 0.05), colourMat(DEPOSIT_COLOUR.copper), 0, 0.09, -0.085, fork);
  p.lamp(-0.42, 0.42);
  useModel(g, 'warehouse');
  return g;
}

/**
 * Research Lab: a white two-storey lab with a band of windows, a rooftop observatory dome that turns while
 * it researches, a small dish and whip antenna for the Data coming down, and a tape-reel machine in the yard.
 */
export function buildResearchLab(): THREE.Group {
  const g = buildingGroup('researchLab');
  const p = parts(g);
  p.add(box(0.9, 0.05, 0.9), M.concrete, 0, 0.025, 0);
  // Lab block: x −0.36…0.2, z −0.36…0.14, flat roof with a parapet.
  p.add(box(0.56, 0.4, 0.5), M.white, -0.08, 0.25, -0.11);
  p.add(box(0.58, 0.03, 0.52), M.darkRoof, -0.08, 0.465, -0.11);
  p.add(box(0.565, 0.025, 0.505), M.steel, -0.08, 0.26, -0.11);
  windowsZ(p, [-0.28, -0.16, -0.04, 0.08], 0.36, 0.142, 0.08, 0.07);
  windowsZ(p, [-0.28, 0.08], 0.17, 0.142, 0.08, 0.07);
  windowsX(p, [-0.3, -0.18, -0.06, 0.06], 0.36, 0.202, 0.08, 0.07);
  windowsX(p, [-0.3, 0.06], 0.17, 0.202, 0.08, 0.07);
  // Glass doors with a canopy.
  p.add(box(0.12, 0.15, 0.015), M.glass, -0.1, 0.125, 0.142);
  p.add(box(0.18, 0.015, 0.08), M.steel, -0.1, 0.215, 0.18);

  // Observatory dome on the roof: drum, dome with a slit, turning while the Lab works.
  p.cyl(0.11, 0.06, M.white, -0.2, 0.48, -0.2, 14);
  const dome = p.mover('spinY', -0.2, 0.54, -0.2);
  dome.userData.speed = 0.4;
  const shell = p.add(new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.tank, 0, 0, 0, dome);
  shell.castShadow = true;
  p.add(box(0.03, 0.1, 0.05), M.dark, 0.0, 0.055, 0.085, dome).rotation.x = -0.5;

  // Small dish on a post and a whip antenna, pointing up.
  p.cyl(0.012, 0.12, M.steel, 0.08, 0.48, -0.25, 6);
  const dish = p.add(new THREE.SphereGeometry(0.07, 10, 5, 0, Math.PI * 2, 0, Math.PI / 3), M.dish, 0.08, 0.66, -0.25);
  dish.rotation.x = Math.PI;
  dish.rotation.z = 0.5;
  p.bar(v(0.15, 0.48, 0.05), v(0.15, 0.72, 0.05), 0.008, M.steel);

  // Yard: a tape-reel data machine (reels turn while working) and a bench.
  p.add(box(0.14, 0.2, 0.08), M.tank, 0.33, 0.15, 0.3);
  for (const y of [0.19, 0.12]) {
    const reel = p.mover('spin', 0.33, y, 0.345);
    p.add(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 10), M.dark, 0, 0, 0, reel).rotation.x = Math.PI / 2;
  }
  p.add(box(0.2, 0.03, 0.06), M.wood, -0.25, 0.08, 0.3);
  p.lamp(0.4, -0.4);
  useModel(g, 'researchLab');
  return g;
}

/**
 * Assembly Hall: a tall white clean-room hangar with a blue band, its big door open on a Spacecraft standing
 * on a work stand inside, a gantry crane that runs over the yard while a Spacecraft is put together, and
 * air-filter fans on the clean-room annex.
 */
export function buildAssemblyHall(): THREE.Group {
  const g = buildingGroup('assemblyHall');
  const p = parts(g);
  p.add(box(0.9, 0.05, 0.9), M.concrete, 0, 0.025, 0);
  // Hangar: x −0.34…0.22, z −0.38…0.06, tall, with a blue band and a shallow roof.
  p.add(box(0.56, 0.56, 0.44), M.white, -0.06, 0.33, -0.16);
  p.add(box(0.565, 0.05, 0.445), colourMat(0x2f5fa8), -0.06, 0.52, -0.16);
  p.add(gableRoof(0.46, 0.08, 0.58), M.darkRoof, -0.06, 0.61, -0.16);
  // Open door on +z: dark inside, door panels pushed aside, a Spacecraft on a stand in the opening.
  p.add(box(0.3, 0.42, 0.01), M.dark, -0.06, 0.26, 0.062);
  p.add(box(0.1, 0.44, 0.02), M.shutter, -0.27, 0.27, 0.07);
  p.add(box(0.1, 0.44, 0.02), M.shutter, 0.15, 0.27, 0.07);
  p.add(box(0.12, 0.04, 0.12), M.yellow, -0.06, 0.07, 0.03);
  p.cyl(0.045, 0.12, colourMat(PRODUCT_COLOUR.metalWorks, { metalness: 0.5, roughness: 0.35 }), -0.06, 0.09, 0.03, 8);
  p.add(new THREE.ConeGeometry(0.045, 0.06, 8), M.tank, -0.06, 0.24, 0.03);
  p.bar(v(-0.06, 0.27, 0.03), v(-0.06, 0.34, 0.03), 0.006, M.steel);
  windowsX(p, [-0.3, -0.16, -0.02], 0.44, 0.222, 0.08, 0.05);

  // Clean-room annex on +x with two air-filter fans on its roof.
  p.add(box(0.18, 0.26, 0.3), M.wall, 0.31, 0.18, -0.2);
  p.add(box(0.19, 0.02, 0.31), M.darkRoof, 0.31, 0.32, -0.2);
  windowsX(p, [-0.28, -0.12], 0.2, 0.402, 0.07, 0.05);
  for (const z of [-0.28, -0.12]) {
    p.cyl(0.04, 0.02, M.steel, 0.31, 0.33, z, 10);
    const fan = p.mover('spinY', 0.31, 0.355, z);
    fan.userData.speed = 3;
    p.add(box(0.07, 0.006, 0.015), M.dark, 0, 0, 0, fan);
    p.add(box(0.015, 0.006, 0.07), M.dark, 0, 0, 0, fan);
  }

  // Gantry crane over the yard: two rails along z, a bridge that runs back and forth with a hook.
  for (const x of [-0.36, 0.3]) p.add(box(0.02, 0.01, 0.34), M.rail, x, 0.055, 0.25);
  const gantry = p.mover('shuttle', 0, 0, 0.25);
  gantry.userData.base = 0.25;
  gantry.userData.range = 0.1;
  for (const x of [-0.36, 0.3]) {
    p.bar(v(x, 0.06, 0), v(x, 0.4, 0), 0.025, M.yellow, gantry);
    p.add(box(0.05, 0.03, 0.06), M.dark, x, 0.075, 0, gantry);
  }
  p.add(box(0.7, 0.04, 0.04), M.yellow, -0.03, 0.42, 0, gantry);
  p.add(box(0.06, 0.04, 0.06), M.dark, -0.06, 0.38, 0, gantry);
  p.bar(v(-0.06, 0.36, 0), v(-0.06, 0.22, 0), 0.004, M.dark, gantry);
  p.add(box(0.03, 0.02, 0.03), M.steel, -0.06, 0.21, 0, gantry);
  p.lamp(0.42, 0.42);
  useModel(g, 'assemblyHall', { productMetal: PRODUCT_COLOUR.metalWorks, productPV: PRODUCT_COLOUR.solarFab });
  return g;
}

/**
 * HQ: the Company's offices. A two-storey white block with a blue band and a glass front, a taller tower with a
 * rooftop mast, a flagpole with the Company's flag (plain until the logo maker, ticket 19), a lawn with trees, and
 * a car park. Its level sign shows the Company's Era.
 */
export function buildHQ(): THREE.Group {
  const g = buildingGroup('hq');
  const p = parts(g);
  p.add(box(0.9, 0.05, 0.9), M.concrete, 0, 0.025, 0);
  // Lawn on the +z side, with two round trees.
  p.add(box(0.5, 0.012, 0.26), colourMat(0x5f9e4a), -0.12, 0.056, 0.3);
  for (const x of [-0.3, 0.02]) {
    p.cyl(0.012, 0.06, M.wood, x, 0.06, 0.32, 5);
    p.add(new THREE.IcosahedronGeometry(0.06, 0), colourMat(0x3f7f3a), x, 0.16, 0.32);
  }
  // Office block: x −0.4…0.2, z −0.38…0.14, two storeys with a blue band between them.
  p.add(box(0.6, 0.36, 0.52), M.white, -0.1, 0.23, -0.12);
  p.add(box(0.605, 0.04, 0.525), colourMat(0x2f5fa8), -0.1, 0.24, -0.12);
  p.add(box(0.62, 0.03, 0.54), M.darkRoof, -0.1, 0.425, -0.12);
  windowsZ(p, [-0.34, -0.22, 0.02, 0.14], 0.33, 0.142, 0.08, 0.07);
  windowsZ(p, [-0.34, -0.22, 0.02, 0.14], 0.15, 0.142, 0.08, 0.07);
  windowsX(p, [-0.3, -0.18, -0.06, 0.06], 0.33, 0.202, 0.08, 0.07);
  windowsX(p, [-0.3, -0.18, -0.06, 0.06], 0.15, 0.202, 0.08, 0.07);
  // Glass entrance with a canopy, in the middle of the +z face.
  p.add(box(0.14, 0.16, 0.015), M.glass, -0.1, 0.13, 0.143);
  p.add(box(0.2, 0.015, 0.09), M.steel, -0.1, 0.22, 0.18);
  for (const x of [-0.18, -0.02]) p.cyl(0.006, 0.17, M.steel, x, 0.05, 0.22, 5);
  // A taller tower at the back corner with a lit top floor and a radio mast.
  p.add(box(0.2, 0.62, 0.2), M.wall, 0.1, 0.36, -0.28);
  p.add(box(0.205, 0.08, 0.205), M.glass, 0.1, 0.6, -0.28);
  p.add(box(0.22, 0.025, 0.22), M.darkRoof, 0.1, 0.68, -0.28);
  p.bar(v(0.1, 0.69, -0.28), v(0.1, 0.92, -0.28), 0.01, M.steel);
  p.add(new THREE.SphereGeometry(0.014, 6, 4), M.bulb, 0.1, 0.93, -0.28);
  // Flagpole and flag.
  p.cyl(0.008, 0.56, M.pipe, 0.32, 0.05, 0.28, 6);
  const logo = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true });
  const flag = p.add(box(0.16, 0.1, 0.006), colourMat(0x2f5fa8), 0.4, 0.55, 0.28);
  flag.rotation.y = 0.15;
  flag.name = 'flag';
  for (const side of [-1, 1]) {
    const emblem = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.085), logo);
    emblem.name = 'company-logo';
    emblem.position.z = side * 0.004;
    flag.add(emblem);
  }
  const sign = p.add(new THREE.PlaneGeometry(0.1, 0.1), logo, -0.1, 0.33, 0.146);
  sign.name = 'company-logo';
  // Car park on the +x side with two cars.
  p.add(box(0.2, 0.008, 0.3), M.asphalt, 0.33, 0.054, -0.06);
  p.add(box(0.07, 0.04, 0.11), colourMat(0xd9583a), 0.29, 0.08, -0.14);
  p.add(box(0.07, 0.04, 0.11), colourMat(0x3b6fb6), 0.38, 0.08, 0.02);
  p.lamp(-0.42, 0.42);
  // The realistic model keeps the code-made flag and logo, moved onto its flag pole and logo board.
  useModel(g, 'hq', {}, ['flag', 'company-logo'], (model) => {
    model.getObjectByName('flag')?.position.copy(at(10.5 + 2.7, 12.0, 9.5));
    model.getObjectByName('company-logo')?.position.copy(at(-4.0, 10.0, 4.64));
  });
  return g;
}

/**
 * Ground Station: a big white dish on a turning mount, tilted up at the sky, with its feed horn on struts; a
 * control hut with a small whip antenna; a fence. The dish turns slowly to follow a Spacecraft across the sky.
 */
export function buildGroundStation(): THREE.Group {
  const g = buildingGroup('groundStation');
  const p = parts(g);
  p.add(box(0.9, 0.05, 0.9), M.concrete, 0, 0.025, 0);
  // Pedestal: a concrete drum and a steel yoke that turns.
  p.cyl(0.13, 0.12, M.concrete, -0.06, 0.05, -0.06, 12);
  const mount = p.mover('spinY', -0.06, 0.17, -0.06);
  mount.userData.speed = 0.25;
  p.add(box(0.2, 0.06, 0.12), M.steel, 0, 0.03, 0, mount);
  for (const x of [-0.09, 0.09]) p.add(box(0.025, 0.2, 0.06), M.steel, x, 0.15, 0, mount);
  // The dish, tilted 40° up from facing sideways, on an axle between the yoke arms.
  const tilt = new THREE.Group();
  tilt.position.set(0, 0.24, 0);
  tilt.rotation.x = -0.7;
  mount.add(tilt);
  // A cap of a sphere, its hollow facing +z (towards the feed horn).
  const dish = p.add(new THREE.SphereGeometry(0.32, 18, 6, 0, Math.PI * 2, 0, 0.9), M.dish, 0, 0, 0.27, tilt);
  dish.rotation.x = -Math.PI / 2;
  p.add(new THREE.TorusGeometry(0.25, 0.008, 4, 24), M.steel, 0, 0, 0.07, tilt);
  // Feed horn on four struts at the dish's focus.
  p.add(new THREE.ConeGeometry(0.025, 0.07, 8), M.steel, 0, 0, 0.13, tilt).rotation.x = -Math.PI / 2;
  for (const [x, y] of [
    [0.2, 0],
    [-0.2, 0],
    [0, 0.2],
    [0, -0.2],
  ] as const) {
    p.bar(v(x, y, 0.07), v(0, 0, 0.11), 0.008, M.steel, tilt);
  }
  // Control hut with a whip antenna and a lit window.
  p.add(box(0.2, 0.16, 0.16), M.wall, 0.3, 0.13, 0.3);
  p.add(box(0.22, 0.02, 0.18), M.darkRoof, 0.3, 0.22, 0.3);
  p.add(box(0.06, 0.05, 0.015), M.bulb, 0.3, 0.15, 0.382);
  p.add(box(0.05, 0.1, 0.015), M.door, 0.24, 0.1, 0.382);
  p.bar(v(0.36, 0.23, 0.26), v(0.36, 0.45, 0.26), 0.006, M.steel);
  // A low fence round the dish.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.cyl(0.006, 0.07, M.steel, -0.06 + Math.cos(a) * 0.36, 0.05, -0.06 + Math.sin(a) * 0.36, 4);
  }
  p.lamp(-0.42, 0.42);
  useModel(g, 'groundStation');
  return g;
}
