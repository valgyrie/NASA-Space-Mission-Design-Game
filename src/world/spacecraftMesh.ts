import * as THREE from 'three';
import { type Design } from '../game/spacecraft';
import { PRODUCT_COLOUR, mat } from './buildingParts';

/**
 * A low-poly model of the Spacecraft on the Mission Designer's table, built from the design.
 * It stands upright along y: Battery section at the bottom, Bus in the middle, Payload in the nose.
 * Shape loosely follows Explorer 1 (a slim striped cylinder with four whip antennas), not a copy of it.
 * Every Part adds small details (rings, bolts, cables, vents) so it reads like real hardware up close.
 */

const S = {
  hull: mat(0xd9dde3, { metalness: 0.25, roughness: 0.4 }),
  hullDark: mat(0x2b2f36, { metalness: 0.3, roughness: 0.6 }),
  steel: mat(0x8d96a3, { metalness: 0.25, roughness: 0.35 }),
  bolt: mat(0xb9c0c9, { metalness: 0.25, roughness: 0.3 }),
  gold: mat(0xe0b040, { metalness: 0.25, roughness: 0.4, emissive: 0x3a2a05, emissiveIntensity: 0.5 }),
  goldPale: mat(0xedcb6a, { metalness: 0.2, roughness: 0.5, emissive: 0x3a2a05, emissiveIntensity: 0.5 }),
  radiator: mat(0xf4f5f7, { roughness: 0.5 }),
  deck: mat(0x3a414c, { metalness: 0.25, roughness: 0.5 }),
  battery: mat(PRODUCT_COLOUR.batteryPlant, { roughness: 0.6 }),
  cellCap: mat(0x5a5f68, { metalness: 0.25, roughness: 0.4 }),
  cable: mat(0xc0392b, { roughness: 0.7 }),
  cableBlack: mat(0x1d2026, { roughness: 0.8 }),
  solar: mat(PRODUCT_COLOUR.solarFab, { metalness: 0.25, roughness: 0.25 }),
  solarLine: mat(0x15244f, { roughness: 0.5 }),
  antenna: mat(0xe8eaee, { metalness: 0.25, roughness: 0.3 }),
  slot: mat(0x6b5a3a, { roughness: 0.8 }),
  payload: mat(PRODUCT_COLOUR.electronicsLab, { roughness: 0.55 }),
  sensor: mat(0xf2f4f7, { roughness: 0.3 }),
  glass: mat(0xbfe6ff, { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.6 }),
  tube: mat(0xd9572b, { roughness: 0.5, emissive: 0x6a1a05, emissiveIntensity: 0.4 }),
  nozzle: mat(0x4a4f57, { metalness: 0.25, roughness: 0.4 }),
  ghost: new THREE.MeshBasicMaterial({ color: 0x9fb0c6, wireframe: true, transparent: true, opacity: 0.35 }),
};

const SIDES = 8;
const ROUND = 20;

const cylinder = (rTop: number, rBottom: number, h: number, sides = SIDES) =>
  new THREE.CylinderGeometry(rTop, rBottom, h, sides);

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, y = 0): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.y = y;
  return m;
}

/** A mesh placed at (x, y, z). */
function at(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

/** A thin ring around the y axis, like a flange or a band. */
function ring(radius: number, y: number, material: THREE.Material, height = 0.03, sides = ROUND): THREE.Mesh {
  return mesh(cylinder(radius, radius, height, sides), material, y);
}

/** Small bolts evenly round a circle. */
function bolts(g: THREE.Group, radius: number, y: number, count: number, size = 0.014, cx = 0, cz = 0): void {
  const geo = new THREE.SphereGeometry(size, 5, 3);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    g.add(at(geo, S.bolt, cx + Math.sin(a) * radius, y, cz + Math.cos(a) * radius));
  }
}

/** A straight rod from a to b. */
function rod(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
  const length = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 6), material);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}

/** A flat box stuck on the side of a round body at angle `a`, facing outwards. */
function onSide(geo: THREE.BufferGeometry, material: THREE.Material, radius: number, a: number, y: number): THREE.Mesh {
  const m = at(geo, material, Math.sin(a) * radius, y, Math.cos(a) * radius);
  m.rotation.y = a;
  return m;
}

interface BusShape {
  radius: number;
  height: number;
  /** Faces round the side: 8 for the octagonal Medium Bus, round for the Small Bus. */
  sides: number;
}

const BUS_SHAPE: Record<'smallBus' | 'mediumBus' | 'largeBus', BusShape> = {
  smallBus: { radius: 0.32, height: 1.0, sides: ROUND },
  mediumBus: { radius: 0.62, height: 1.1, sides: SIDES },
  largeBus: { radius: 0.85, height: 1.25, sides: ROUND },
};

/** Explorer-style slim cylinder: alternating bands (they kept the temperature even), seams, flanges and a hatch. */
function addSmallBus(g: THREE.Group, b: BusShape): void {
  const r = b.radius;
  g.add(mesh(cylinder(r, r, b.height, ROUND), S.hull));
  for (const y of [-0.3, 0, 0.3]) g.add(ring(r + 0.004, y, S.hullDark, 0.1));
  for (const y of [-b.height / 2, b.height / 2]) {
    g.add(ring(r + 0.015, y, S.steel, 0.035));
    bolts(g, r + 0.02, y, 16, 0.011);
  }
  // Vertical seams where the skin panels join.
  const seam = new THREE.BoxGeometry(0.012, b.height * 0.96, 0.01);
  for (let i = 0; i < 4; i++) g.add(onSide(seam, S.steel, r + 0.004, (i / 4) * Math.PI * 2 + Math.PI / 8, 0));
  // An access hatch with four screws.
  const hatchA = Math.PI * 0.75;
  g.add(onSide(new THREE.BoxGeometry(0.13, 0.13, 0.012), S.steel, r + 0.006, hatchA, 0.15));
  const screw = new THREE.SphereGeometry(0.008, 4, 3);
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const s = onSide(screw, S.bolt, r + 0.014, hatchA, 0.15 + dy * 0.05);
    s.position.x += Math.cos(hatchA) * dx * 0.05;
    s.position.z -= Math.sin(hatchA) * dx * 0.05;
    g.add(s);
  }
  // Little temperature sensors dotted round the skin.
  const dot = new THREE.CylinderGeometry(0.012, 0.012, 0.01, 6);
  for (let i = 0; i < 3; i++) {
    const m = onSide(dot, S.hullDark, r + 0.004, (i / 3) * Math.PI * 2, -0.15);
    m.rotateX(Math.PI / 2);
    g.add(m);
  }
}

/** Octagonal box wrapped in gold foil, with white radiators, corner rails and decks. */
function addMediumBus(g: THREE.Group, b: BusShape): void {
  const r = b.radius;
  const apothem = r * Math.cos(Math.PI / SIDES);
  const faceW = 2 * r * Math.sin(Math.PI / SIDES);
  g.add(mesh(cylinder(r * 0.98, r * 0.98, b.height, SIDES), S.deck));
  for (let i = 0; i < SIDES; i++) {
    const a = ((i + 0.5) / SIDES) * Math.PI * 2;
    if (i % 4 === 1) {
      // Radiator: a white panel with fins that sheds heat into space.
      g.add(onSide(new THREE.BoxGeometry(faceW * 0.9, b.height * 0.86, 0.02), S.radiator, apothem, a, 0));
      const fin = new THREE.BoxGeometry(faceW * 0.84, 0.012, 0.012);
      for (let k = -3; k <= 3; k++) g.add(onSide(fin, S.steel, apothem + 0.014, a, k * 0.12));
    } else {
      // Foil blankets: two shades, slightly crumpled into a lower and an upper sheet.
      g.add(onSide(new THREE.BoxGeometry(faceW * 0.94, b.height * 0.47, 0.02), i % 2 ? S.gold : S.goldPale, apothem, a, -b.height * 0.24));
      g.add(onSide(new THREE.BoxGeometry(faceW * 0.92, b.height * 0.47, 0.024), i % 2 ? S.goldPale : S.gold, apothem, a, b.height * 0.24));
    }
  }
  // Rails on every corner.
  const rail = new THREE.BoxGeometry(0.035, b.height * 1.02, 0.035);
  for (let i = 0; i < SIDES; i++) {
    const a = (i / SIDES) * Math.PI * 2;
    g.add(onSide(rail, S.steel, r, a, 0));
  }
  for (const y of [-b.height / 2, b.height / 2]) g.add(mesh(cylinder(r + 0.02, r + 0.02, 0.045, SIDES), S.steel, y));
  // Top deck: connectors and a cable bundle.
  const top = b.height / 2 + 0.03;
  for (const [x, z] of [[0.3, 0.1], [-0.25, 0.2], [0.05, -0.32]] as const) {
    g.add(at(new THREE.BoxGeometry(0.1, 0.05, 0.07), S.hullDark, x, top, z));
  }
  g.add(rod(new THREE.Vector3(0.3, top + 0.02, 0.1), new THREE.Vector3(-0.25, top + 0.02, 0.2), 0.012, S.cableBlack));
  // Handling lugs used when lifting it in the hall.
  const lug = new THREE.TorusGeometry(0.035, 0.01, 4, 8);
  for (const a of [Math.PI / 4, (Math.PI * 5) / 4]) {
    const m = onSide(lug, S.bolt, r + 0.03, a, b.height / 2 - 0.08);
    g.add(m);
  }
}

/**
 * A wide drum like Syncom's and the early communications satellites': white thermal skin with dark bands, a
 * gold-foil top deck, strong ring frames top and bottom and a row of access panels round the middle.
 */
function addLargeBus(g: THREE.Group, b: BusShape): void {
  const r = b.radius;
  g.add(mesh(cylinder(r, r, b.height, ROUND), S.radiator));
  for (const y of [-b.height * 0.3, b.height * 0.3]) g.add(ring(r + 0.004, y, S.hullDark, 0.08));
  for (const y of [-b.height / 2, b.height / 2]) {
    g.add(ring(r + 0.02, y, S.steel, 0.05));
    bolts(g, r + 0.025, y, 24, 0.012);
  }
  // Access panels with handles round the middle.
  const panel = new THREE.BoxGeometry(0.2, 0.22, 0.012);
  const handle = new THREE.BoxGeometry(0.08, 0.012, 0.02);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    g.add(onSide(panel, S.steel, r + 0.006, a, 0));
    g.add(onSide(handle, S.hullDark, r + 0.016, a, 0.06));
  }
  // Gold top deck with a cable bundle.
  const top = b.height / 2 + 0.03;
  g.add(mesh(cylinder(r * 0.94, r * 0.94, 0.02, ROUND), S.gold, top));
  for (const [x, z] of [[0.4, 0.2], [-0.35, 0.3], [0.1, -0.5]] as const) {
    g.add(at(new THREE.BoxGeometry(0.12, 0.05, 0.08), S.hullDark, x, top + 0.03, z));
  }
  g.add(rod(new THREE.Vector3(0.4, top + 0.05, 0.2), new THREE.Vector3(-0.35, top + 0.05, 0.3), 0.014, S.cableBlack));
}

/** The Bus. Centred on y = 0. With no Bus, a faint outline shows where it goes. */
function addBus(g: THREE.Group, id: keyof typeof BUS_SHAPE | null): BusShape {
  const shape = BUS_SHAPE[id ?? 'smallBus'];
  if (!id) g.add(mesh(cylinder(shape.radius, shape.radius, shape.height), S.ghost));
  else if (id === 'smallBus') addSmallBus(g, shape);
  else if (id === 'mediumBus') addMediumBus(g, shape);
  else addLargeBus(g, shape);
  return shape;
}

/** The Battery section below the Bus: a cage of struts holding rows of cells, wired up to the Bus. Returns its height. */
function addBattery(g: THREE.Group, bus: BusShape, id: Design['battery']): number {
  if (!id) return 0;
  const rows = id === 'largeBattery' || id === 'mediumBattery' ? 2 : 1;
  const h = rows * 0.24 + 0.04;
  const r = Math.min(bus.radius * 0.92, 0.5);
  const top = -bus.height / 2;
  const mid = top - h / 2;
  // Core and the two end plates.
  g.add(mesh(cylinder(r * 0.55, r * 0.55, h, 12), S.hullDark, mid));
  g.add(ring(r, top - 0.015, S.steel, 0.03));
  g.add(ring(r, top - h + 0.015, S.steel, 0.03));
  // Cells round the core, row by row.
  const count = (r > 0.4 ? 14 : 10) - (id === 'mediumBattery' ? 2 : 0);
  const cellR = Math.min(0.045, (Math.PI * r * 0.75) / count / 1.2);
  const cell = new THREE.CylinderGeometry(cellR, cellR, 0.19, 8);
  const cap = new THREE.CylinderGeometry(cellR * 0.6, cellR * 0.6, 0.02, 6);
  for (let row = 0; row < rows; row++) {
    const y = top - 0.03 - 0.12 - row * 0.24;
    for (let i = 0; i < count; i++) {
      const a = ((i + row * 0.5) / count) * Math.PI * 2;
      const x = Math.sin(a) * (r - cellR - 0.01);
      const z = Math.cos(a) * (r - cellR - 0.01);
      g.add(at(cell, S.battery, x, y, z));
      g.add(at(cap, S.cellCap, x, y + 0.105, z));
    }
  }
  // Cage struts and the wires up into the Bus.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    g.add(rod(new THREE.Vector3(x, top, z), new THREE.Vector3(x, top - h, z), 0.012, S.steel));
  }
  g.add(rod(new THREE.Vector3(0.06, top - h + 0.03, r * 0.56), new THREE.Vector3(0.06, top + 0.05, r * 0.56), 0.01, S.cable));
  g.add(rod(new THREE.Vector3(-0.06, top - h + 0.03, r * 0.56), new THREE.Vector3(-0.06, top + 0.05, r * 0.56), 0.01, S.cableBlack));
  return h;
}

/** Body-mounted solar cells: framed panels round the Bus, each split into a grid of cells. */
function addSolarCells(g: THREE.Group, bus: BusShape): void {
  // The octagonal Bus gets one panel per face; the round one twelve narrow panels just outside its skin.
  const octagon = bus.sides === SIDES;
  const faces = octagon ? SIDES : 12;
  const apothem = octagon ? bus.radius * Math.cos(Math.PI / faces) + 0.03 : bus.radius + 0.014;
  const faceW = 2 * apothem * Math.tan(Math.PI / faces) * 0.86;
  const h = bus.height * 0.62;
  const across = new THREE.BoxGeometry(faceW, 0.008, 0.006);
  const down = new THREE.BoxGeometry(0.008, h, 0.006);
  const frame = new THREE.BoxGeometry(faceW + 0.03, h + 0.03, 0.012);
  for (let i = 0; i < faces; i++) {
    const a = ((i + 0.5) / faces) * Math.PI * 2;
    g.add(onSide(frame, S.steel, apothem - 0.004, a, 0));
    g.add(onSide(new THREE.BoxGeometry(faceW, h, 0.016), S.solar, apothem, a, 0));
    for (let k = 1; k < 5; k++) g.add(onSide(across, S.solarLine, apothem + 0.01, a, -h / 2 + (k * h) / 5));
    g.add(onSide(down, S.solarLine, apothem + 0.01, a, 0));
  }
}

/** Four whip antennas on hinged mounts, sticking out sideways and down, plus two slot antennas in the skin. */
function addSimpleAntenna(g: THREE.Group, bus: BusShape, below: number, lowPower = false): void {
  const length = lowPower ? 0.65 : 0.9;
  const y = -bus.height / 2 - below * 0.5;
  const mountR = Math.min(bus.radius * 0.92, 0.5) + 0.02;
  const count = lowPower ? 2 : 4;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.PI / 4;
    const mount = onSide(new THREE.BoxGeometry(0.06, 0.06, 0.04), S.steel, mountR, a, y);
    g.add(mount);
    const whip = new THREE.Group();
    whip.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.06, 6), S.hullDark, 0.03)); // hinge spring
    whip.add(mesh(new THREE.CylinderGeometry(0.007, 0.012, length, 5), S.antenna, length / 2 + 0.06));
    whip.add(mesh(new THREE.SphereGeometry(0.022, 6, 4), S.antenna, length + 0.06));
    whip.position.set(Math.sin(a) * (mountR + 0.02), y, Math.cos(a) * (mountR + 0.02));
    // Point outwards and a little down.
    whip.rotation.set(0, a, 0);
    whip.rotateX(Math.PI / 2 + 0.35);
    g.add(whip);
  }
  // Slot antennas: two long windows in the side of the Bus.
  const slotGeo = new THREE.BoxGeometry(0.04, bus.height * 0.5, 0.012);
  const radius = bus.sides === SIDES ? bus.radius * Math.cos(Math.PI / SIDES) + 0.03 : bus.radius + 0.006;
  for (const a of [Math.PI / 2, -Math.PI / 2]) g.add(onSide(slotGeo, S.slot, radius, a, -0.05));
}

/** Spin: balance weights on short arms and two small spin-up nozzles pointing sideways. */
function addSpin(g: THREE.Group, bus: BusShape): void {
  const y = bus.height / 2 - 0.12;
  const r = bus.sides === SIDES ? bus.radius + 0.02 : bus.radius;
  for (const a of [0, Math.PI]) {
    const arm = new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
    const end = new THREE.Vector3(Math.sin(a) * (r + 0.1), y, Math.cos(a) * (r + 0.1));
    g.add(rod(arm, end, 0.01, S.steel));
    g.add(at(new THREE.SphereGeometry(0.035, 8, 6), S.steel, end.x, end.y, end.z));
  }
  for (const a of [Math.PI / 2, -Math.PI / 2]) {
    const n = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 8, 1, true), S.nozzle);
    n.position.set(Math.sin(a) * (r + 0.03), -bus.height / 2 + 0.1, Math.cos(a) * (r + 0.03));
    // Nozzles point along the side (tangent), so their push turns the Spacecraft.
    n.rotation.set(Math.PI / 2, 0, 0);
    n.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), a + Math.PI / 2);
    g.add(n);
  }
}

/** The radiation detector in the nose: an instrument can with vents and a window onto the Geiger tube, under a cone. */
function addRadiationDetector(g: THREE.Group, bus: BusShape): void {
  const base = bus.height / 2;
  const r = Math.min(bus.radius, 0.32) * 0.85;
  g.add(ring(r + 0.01, base + 0.015, S.steel, 0.03));
  g.add(mesh(cylinder(r, r, 0.3, ROUND), S.payload, base + 0.18));
  // Vent slits and a dark band.
  const vent = new THREE.BoxGeometry(0.06, 0.008, 0.01);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    for (let k = 0; k < 3; k++) g.add(onSide(vent, S.hullDark, r + 0.002, a, base + 0.1 + k * 0.025));
  }
  g.add(ring(r + 0.004, base + 0.29, S.hullDark, 0.03));
  // Window with the Geiger tube behind it.
  const windowA = Math.PI * 0.25;
  g.add(onSide(new THREE.BoxGeometry(0.12, 0.09, 0.012), S.steel, r + 0.004, windowA, base + 0.21));
  const tube = onSide(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 8), S.tube, r + 0.012, windowA, base + 0.21);
  tube.rotateZ(Math.PI / 2);
  g.add(tube);
  g.add(onSide(new THREE.BoxGeometry(0.11, 0.08, 0.008), S.glass, r + 0.02, windowA, base + 0.21));
  // Nose cone with a dark tip and a small temperature probe.
  g.add(mesh(cylinder(r * 0.3, r, 0.35, ROUND), S.sensor, base + 0.33 + 0.175));
  g.add(ring(r * 0.66, base + 0.5, S.hullDark, 0.02));
  g.add(mesh(new THREE.SphereGeometry(r * 0.3, 10, 6), S.hullDark, base + 0.68));
  g.add(rod(new THREE.Vector3(r * 0.2, base + 0.72, 0), new THREE.Vector3(r * 0.2, base + 0.86, 0), 0.006, S.antenna));
}

/**
 * Two TV cameras on a deck in the nose, like TIROS-1's: a short wide-angle one and a long narrow-angle one,
 * each a barrel with a lens hood and glass, plus the box of electronics and tape recorder between them.
 */
function addTvCamera(g: THREE.Group, bus: BusShape): void {
  const base = bus.height / 2;
  const r = Math.min(bus.radius, 0.5) * 0.8;
  g.add(mesh(cylinder(r, r, 0.04, ROUND), S.deck, base + 0.02));
  g.add(ring(r + 0.01, base + 0.045, S.steel, 0.012));
  // Electronics and tape recorder: a box with a reel window.
  g.add(at(new THREE.BoxGeometry(r * 0.7, 0.14, r * 0.5), S.payload, -r * 0.1, base + 0.11, -r * 0.35));
  for (const x of [-0.07, 0.05]) {
    const reel = at(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 12), S.hullDark, -r * 0.1 + x, base + 0.12, -r * 0.35 + r * 0.25 + 0.006);
    reel.rotation.x = Math.PI / 2;
    g.add(reel);
  }
  // Cameras: [x, z, barrel length, radius].
  for (const [x, z, len, cr] of [
    [-r * 0.4, r * 0.3, 0.16, 0.07],
    [r * 0.38, r * 0.15, 0.3, 0.06],
  ] as const) {
    g.add(at(new THREE.CylinderGeometry(cr, cr, len, 14), S.hull, x, base + 0.04 + len / 2, z));
    g.add(at(new THREE.CylinderGeometry(cr * 1.15, cr, 0.05, 14), S.hullDark, x, base + 0.04 + len + 0.025, z));
    g.add(at(new THREE.CylinderGeometry(cr * 0.8, cr * 0.8, 0.01, 14), S.glass, x, base + 0.04 + len + 0.045, z));
    g.add(at(new THREE.CylinderGeometry(cr * 1.05, cr * 1.05, 0.02, 14), S.gold, x, base + 0.07, z));
    bolts(g, cr + 0.01, base + 0.05, 6, 0.008, x, z);
  }
  g.add(rod(new THREE.Vector3(-r * 0.4, base + 0.08, r * 0.3), new THREE.Vector3(-r * 0.1, base + 0.1, -r * 0.2), 0.008, S.cable));
  g.add(rod(new THREE.Vector3(r * 0.38, base + 0.08, r * 0.15), new THREE.Vector3(0, base + 0.1, -r * 0.2), 0.008, S.cableBlack));
}

/**
 * A Radio Transponder in the nose, like Telstar's and Syncom's: a box of receivers and amplifiers on a deck, and a
 * mast with a belt of small microwave antennas round it (one ring to listen, one to send), topped by a slotted
 * antenna for commands.
 */
function addTransponder(g: THREE.Group, bus: BusShape): void {
  const base = bus.height / 2;
  const r = Math.min(bus.radius, 0.5) * 0.75;
  g.add(mesh(cylinder(r, r, 0.04, ROUND), S.deck, base + 0.02));
  g.add(ring(r + 0.01, base + 0.045, S.steel, 0.012));
  // Receivers and amplifier tubes: two boxes with gold covers.
  for (const [x, z] of [[-r * 0.45, -r * 0.3], [r * 0.45, -r * 0.3]] as const) {
    g.add(at(new THREE.BoxGeometry(r * 0.5, 0.12, r * 0.4), S.payload, x, base + 0.1, z));
    g.add(at(new THREE.BoxGeometry(r * 0.52, 0.015, r * 0.42), S.gold, x, base + 0.165, z));
  }
  // The mast with two belts of microwave antennas.
  const mastR = 0.09;
  g.add(mesh(cylinder(mastR, mastR, 0.5, 12), S.hull, base + 0.04 + 0.25));
  const cavity = new THREE.BoxGeometry(0.05, 0.05, 0.03);
  for (const y of [base + 0.2, base + 0.32]) {
    g.add(ring(mastR + 0.012, y - 0.04, S.steel, 0.012, 12));
    for (let i = 0; i < 12; i++) g.add(onSide(cavity, i % 2 ? S.hullDark : S.gold, mastR + 0.015, (i / 12) * Math.PI * 2, y));
  }
  // Slotted command antenna on top, and cables down to the boxes.
  g.add(mesh(cylinder(0.025, 0.025, 0.3, 8), S.antenna, base + 0.54 + 0.15));
  for (let k = 0; k < 4; k++) g.add(at(new THREE.BoxGeometry(0.052, 0.04, 0.01), S.slot, 0, base + 0.6 + k * 0.06, 0.026));
  g.add(mesh(new THREE.SphereGeometry(0.03, 8, 6), S.antenna, base + 0.86));
  g.add(rod(new THREE.Vector3(-r * 0.45, base + 0.17, -r * 0.1), new THREE.Vector3(0, base + 0.12, -mastR), 0.008, S.cable));
  g.add(rod(new THREE.Vector3(r * 0.45, base + 0.17, -r * 0.1), new THREE.Vector3(0, base + 0.1, -mastR), 0.008, S.cableBlack));
}

/**
 * A Main Engine under the Spacecraft, like Syncom's solid apogee motor: a round motor case tucked under the Bus
 * and a big bell nozzle pointing down through the launch adapter. Returns how far it reaches below.
 */
function addMainEngine(g: THREE.Group, bus: BusShape, below: number): void {
  const y = -bus.height / 2 - below;
  const caseR = Math.min(bus.radius * 0.5, 0.32);
  g.add(at(new THREE.SphereGeometry(caseR, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), S.hullDark, 0, y, 0));
  g.add(ring(caseR * 0.55, y - caseR * 0.92, S.steel, 0.04, 14));
  const bellTop = y - caseR * 0.95;
  g.add(mesh(new THREE.CylinderGeometry(caseR * 0.3, caseR * 0.75, 0.4, 16, 1, true), S.nozzle, bellTop - 0.2));
  g.add(ring(caseR * 0.76, bellTop - 0.4, S.steel, 0.02, 16));
  // Two small jets for pointing and steering, on arms.
  for (const a of [0, Math.PI]) {
    const x = Math.sin(a) * (caseR + 0.12);
    const z = Math.cos(a) * (caseR + 0.12);
    g.add(rod(new THREE.Vector3(0, y - 0.05, 0), new THREE.Vector3(x, y - 0.05, z), 0.01, S.steel));
    g.add(at(new THREE.ConeGeometry(0.025, 0.06, 8, 1, true), S.nozzle, x, y - 0.08, z));
  }
}

/** The ring that holds the Spacecraft to the Launch Vehicle. */
function addAdapter(g: THREE.Group, bus: BusShape, below: number): void {
  const y = -bus.height / 2 - below - 0.05;
  const r = Math.min(bus.radius * 0.8, 0.42);
  g.add(mesh(cylinder(r, r * 1.15, 0.08, ROUND), S.steel, y));
  g.add(ring(r * 1.16, y - 0.04, S.hullDark, 0.02));
  bolts(g, r * 1.16, y - 0.025, 12, 0.012);
}

/** Build the model for a design. Empty slots leave gaps; with no Bus a faint outline shows where it goes. */
export function buildSpacecraft(design: Design): THREE.Group {
  const g = new THREE.Group();
  g.name = 'spacecraft';
  const bus = addBus(g, design.bus as keyof typeof BUS_SHAPE | null);
  const below = addBattery(g, bus, design.battery);
  if (design.bus) addAdapter(g, bus, below);
  if (design.propulsion === 'mainEngine') addMainEngine(g, bus, below);
  if (design.power === 'solarCells') addSolarCells(g, bus);
  if (design.comms === 'simpleAntenna' || design.comms === 'lowPowerAntenna') {
    addSimpleAntenna(g, bus, below, design.comms === 'lowPowerAntenna');
  }
  if (design.pointing === 'spin') addSpin(g, bus);
  if (design.payload === 'radiationDetector') addRadiationDetector(g, bus);
  if (design.payload === 'tvCamera') addTvCamera(g, bus);
  if (design.payload === 'transponder') addTransponder(g, bus);
  // Stand the whole stack around its middle so it turns in place.
  const box = new THREE.Box3().setFromObject(g);
  g.position.y = -(box.min.y + box.max.y) / 2;
  const holder = new THREE.Group();
  holder.add(g);
  return holder;
}

/** Free the geometry of a model built by `buildSpacecraft` (materials are shared and kept). */
export function disposeSpacecraft(model: THREE.Object3D): void {
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}
