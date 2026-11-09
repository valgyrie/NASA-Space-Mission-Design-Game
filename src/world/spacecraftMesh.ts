import * as THREE from 'three';
import { type Design } from '../game/spacecraft';
import { PRODUCT_COLOUR, mat } from './buildingParts';

/**
 * A low-poly model of the Spacecraft on the Mission Designer's table, built from the design.
 * It stands upright along y: Battery section at the bottom, Bus in the middle, Payload in the nose.
 * Shape loosely follows Explorer 1 (a slim striped cylinder with four whip antennas), not a copy of it.
 */

const S = {
  hull: mat(0xd9dde3, { metalness: 0.55, roughness: 0.4 }),
  hullDark: mat(0x2b2f36, { metalness: 0.3, roughness: 0.6 }),
  gold: mat(0xd8a93a, { metalness: 0.7, roughness: 0.35 }),
  battery: mat(PRODUCT_COLOUR.batteryPlant, { roughness: 0.6 }),
  solar: mat(PRODUCT_COLOUR.solarFab, { metalness: 0.4, roughness: 0.3 }),
  antenna: mat(0xe8eaee, { metalness: 0.6, roughness: 0.3 }),
  payload: mat(PRODUCT_COLOUR.electronicsLab, { roughness: 0.55 }),
  sensor: mat(0xf2f4f7, { roughness: 0.3 }),
  ghost: new THREE.MeshBasicMaterial({ color: 0x9fb0c6, wireframe: true, transparent: true, opacity: 0.35 }),
};

const SIDES = 8;

const cylinder = (rTop: number, rBottom: number, h: number, sides = SIDES) =>
  new THREE.CylinderGeometry(rTop, rBottom, h, sides);

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, y = 0): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.y = y;
  return m;
}

interface BusShape {
  radius: number;
  height: number;
}

const BUS_SHAPE: Record<'smallBus' | 'mediumBus', BusShape> = {
  smallBus: { radius: 0.32, height: 1.0 },
  mediumBus: { radius: 0.62, height: 1.1 },
};

/** The Bus: a striped cylinder (small) or a gold-foil octagon (medium). Centred on y = 0. */
function addBus(g: THREE.Group, id: 'smallBus' | 'mediumBus' | null): BusShape {
  const shape = BUS_SHAPE[id ?? 'smallBus'];
  if (!id) {
    g.add(mesh(cylinder(shape.radius, shape.radius, shape.height), S.ghost));
    return shape;
  }
  if (id === 'smallBus') {
    g.add(mesh(cylinder(shape.radius, shape.radius, shape.height, 16), S.hull));
    // Dark bands keep the temperature even, as on Explorer 1.
    for (const y of [-0.3, 0, 0.3]) g.add(mesh(cylinder(shape.radius + 0.005, shape.radius + 0.005, 0.1, 16), S.hullDark, y));
  } else {
    g.add(mesh(cylinder(shape.radius, shape.radius, shape.height), S.gold));
    for (const y of [-shape.height / 2, shape.height / 2]) {
      g.add(mesh(cylinder(shape.radius + 0.02, shape.radius + 0.02, 0.06), S.hull, y));
    }
  }
  return shape;
}

/** The Battery section below the Bus. Returns its height. */
function addBattery(g: THREE.Group, bus: BusShape, id: Design['battery']): number {
  if (!id) return 0;
  const h = id === 'largeBattery' ? 0.5 : 0.28;
  const r = bus.radius * 0.92;
  const top = -bus.height / 2;
  g.add(mesh(cylinder(r, r, h, 16), S.battery, top - h / 2));
  g.add(mesh(cylinder(r + 0.01, r + 0.01, 0.04, 16), S.hullDark, top - h * 0.3));
  g.add(mesh(cylinder(r + 0.01, r + 0.01, 0.04, 16), S.hullDark, top - h * 0.7));
  return h;
}

/** Body-mounted solar cells: a dark-blue panel on each face of the Bus. */
function addSolarCells(g: THREE.Group, bus: BusShape): void {
  const face = 2 * bus.radius * Math.tan(Math.PI / SIDES) * 0.8;
  const apothem = bus.radius * Math.cos(Math.PI / SIDES);
  for (let i = 0; i < SIDES; i++) {
    const a = ((i + 0.5) / SIDES) * Math.PI * 2;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(face, bus.height * 0.7, 0.02), S.solar);
    panel.position.set(Math.sin(a) * (apothem + 0.012), 0, Math.cos(a) * (apothem + 0.012));
    panel.rotation.y = a;
    g.add(panel);
  }
}

/** Four whip antennas sticking out sideways and down from the bottom of the Bus. */
function addWhips(g: THREE.Group, bus: BusShape, below: number): void {
  const length = 0.9;
  const y = -bus.height / 2 - below * 0.5;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const whip = new THREE.Group();
    const rod = mesh(new THREE.CylinderGeometry(0.008, 0.012, length, 5), S.antenna, length / 2);
    const tip = mesh(new THREE.SphereGeometry(0.022, 6, 4), S.antenna, length);
    whip.add(rod, tip);
    whip.position.set(Math.sin(a) * bus.radius * 0.9, y, Math.cos(a) * bus.radius * 0.9);
    // Point outwards and a little down.
    whip.rotation.set(0, a, 0);
    whip.rotateX(Math.PI / 2 + 0.35);
    g.add(whip);
  }
}

/** The radiation detector in the nose: an instrument can with a cone on top. */
function addRadiationDetector(g: THREE.Group, bus: BusShape): void {
  const base = bus.height / 2;
  const r = Math.min(bus.radius, 0.32) * 0.85;
  g.add(mesh(cylinder(r, r, 0.3, 16), S.payload, base + 0.15));
  g.add(mesh(cylinder(r * 0.3, r, 0.35, 16), S.sensor, base + 0.3 + 0.175));
  g.add(mesh(new THREE.SphereGeometry(r * 0.3, 10, 6), S.hullDark, base + 0.65));
}

/** Build the model for a design. Empty slots leave gaps; with no Bus a faint outline shows where it goes. */
export function buildSpacecraft(design: Design): THREE.Group {
  const g = new THREE.Group();
  g.name = 'spacecraft';
  const bus = addBus(g, design.bus as keyof typeof BUS_SHAPE | null);
  const below = addBattery(g, bus, design.battery);
  if (design.power === 'solarCells') addSolarCells(g, bus);
  if (design.comms === 'simpleAntenna') addWhips(g, bus, below);
  if (design.payload === 'radiationDetector') addRadiationDetector(g, bus);
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
