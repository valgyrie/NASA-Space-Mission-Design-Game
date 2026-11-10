import * as THREE from 'three';
import type { LaunchVehicleId } from '../game/launchVehicles';
import type { Design } from '../game/spacecraft';
import { mat } from './buildingParts';
import { buildSpacecraft } from './spacecraftMesh';

/**
 * A low-poly Juno I, in metres, standing on its base along +y. Shape from docs/research/launch-vehicles.md:
 * 21.2 m tall; a Redstone-based first stage; on top, a spinning tub with an outer ring of 11 small solid
 * motors (stage 2) round a cluster of 3 (stage 3), then 1 more (stage 4) under the Spacecraft.
 * Painted black and white like the real rocket.
 */

const R = {
  white: mat(0xeeeee8, { roughness: 0.55 }),
  black: mat(0x1c1f24, { roughness: 0.6 }),
  steel: mat(0x9aa3ad, { metalness: 0.3, roughness: 0.4 }),
  dark: mat(0x3a3f47, { metalness: 0.25, roughness: 0.5 }),
  motor: mat(0x6f7782, { metalness: 0.3, roughness: 0.45 }),
  nozzle: mat(0x2b2f36, { metalness: 0.3, roughness: 0.4 }),
};

const SIDES = 16;

/** Heights along the rocket, in metres from its base. */
export const JUNO = {
  radius: 0.89,
  firstStageTop: 15.6,
  instrumentTop: 17.6,
  coneTop: 18.2,
  tubTop: 19.4,
  stage4Top: 20.2,
  top: 21.2,
  tubRadius: 0.42,
};

function cyl(rTop: number, rBottom: number, h: number, material: THREE.Material, y: number, sides = SIDES): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, sides), material);
  m.position.y = y + h / 2;
  return m;
}

/** A quarter of a band round the body, for the roll pattern. */
function quarter(r: number, h: number, y: number, start: number, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.004, r * 1.004, h, 8, 1, true, start, Math.PI / 2), material);
  m.position.y = y + h / 2;
  return m;
}

/** One small solid motor: a tube with a nozzle, base at y = 0. */
function motor(length: number, radius: number): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(radius, radius, length, R.motor, 0.12, 8));
  g.add(cyl(radius * 0.55, radius * 0.85, 0.12, R.nozzle, 0, 8));
  return g;
}

/** Where each stage's exhaust comes out, in the stage group's own space (pointing down). */
export interface StageModel {
  group: THREE.Group;
  nozzles: THREE.Vector3[];
  /** Radius of one nozzle, for the size of its flame. */
  nozzleRadius: number;
}

export interface RocketModel {
  root: THREE.Group;
  /** Bottom to top: Redstone first stage (with the instrument section), stage 2 ring, stage 3 cluster, stage 4. */
  stages: StageModel[];
  /** Everything from stage 2 up turns: the tub was spun on the pad so the small motors fire straight. */
  spinner: THREE.Group;
  spacecraft: THREE.Group;
  /** Metres from the base to where stage 2 starts: the space shot shows the rocket from here up. */
  upperBase: number;
  /** Metres from there to the top. */
  upperLength: number;
}

function firstStage(): StageModel {
  const g = new THREE.Group();
  const r = JUNO.radius;
  g.add(cyl(r, r, JUNO.firstStageTop - 1.2, R.white, 1.2));
  g.add(cyl(r, r * 0.92, 1.2, R.dark, 0));
  // Roll pattern: black quarters, offset between bands.
  for (const [y, start] of [
    [9.5, 0],
    [9.5, Math.PI],
    [12.2, Math.PI / 2],
    [12.2, Math.PI * 1.5],
  ] as const) {
    g.add(quarter(r, 1.4, y, start, R.black));
  }
  g.add(cyl(r * 1.01, r * 1.01, 0.12, R.black, JUNO.firstStageTop - 0.1));
  // Four fins, black, at the tail.
  const fin = new THREE.Shape();
  fin.moveTo(0, 0);
  fin.lineTo(1.25, 0);
  fin.lineTo(1.25, 0.9);
  fin.lineTo(0, 3.1);
  fin.closePath();
  const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.08, bevelEnabled: false });
  finGeo.translate(r * 0.9, 0, -0.04);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(finGeo, R.black);
    f.rotation.y = (i * Math.PI) / 2 + Math.PI / 4;
    g.add(f);
  }
  // Instrument section and the cone up to the tub.
  g.add(cyl(r, r, JUNO.instrumentTop - JUNO.firstStageTop, R.white, JUNO.firstStageTop));
  g.add(quarter(r, 0.8, JUNO.firstStageTop + 0.5, Math.PI / 4, R.black));
  g.add(quarter(r, 0.8, JUNO.firstStageTop + 0.5, Math.PI * 1.25, R.black));
  g.add(cyl(JUNO.tubRadius + 0.05, r, JUNO.coneTop - JUNO.instrumentTop, R.steel, JUNO.instrumentTop));
  g.add(cyl(r * 0.55, r * 0.75, 0.35, R.nozzle, -0.3));
  return { group: g, nozzles: [new THREE.Vector3(0, -0.3, 0)], nozzleRadius: r * 0.55 };
}

/** A ring (or cluster) of small motors standing in the tub. */
function cluster(count: number, ringRadius: number, base: number, length: number): StageModel {
  const g = new THREE.Group();
  const radius = 0.075;
  const nozzles: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const m = motor(length, radius);
    const x = Math.sin(a) * ringRadius;
    const z = Math.cos(a) * ringRadius;
    m.position.set(x, base, z);
    g.add(m);
    nozzles.push(new THREE.Vector3(x, base, z));
  }
  return { group: g, nozzles, nozzleRadius: radius * 0.55 };
}

/** The player's Spacecraft, scaled to `height` metres and standing on y = 0. */
function spacecraftOnTop(design: Design, height: number): THREE.Group {
  const spacecraft = new THREE.Group();
  const model = buildSpacecraft(design);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = height / Math.max(size.y, 0.01);
  model.scale.setScalar(scale);
  model.position.y = -box.min.y * scale;
  spacecraft.add(model);
  return spacecraft;
}

/** The Launch Vehicle with the player's Spacecraft on top. */
export function buildRocket(design: Design, vehicle: LaunchVehicleId = 'juno1'): RocketModel {
  return vehicle === 'thorAble' ? buildThorAble(design) : buildJuno(design);
}

/** The whole Juno I with the player's Spacecraft on top. */
function buildJuno(design: Design): RocketModel {
  const root = new THREE.Group();
  root.name = 'rocket';
  const first = firstStage();
  root.add(first.group);

  const spinner = new THREE.Group();
  spinner.position.y = JUNO.coneTop;
  root.add(spinner);
  const tubLength = JUNO.tubTop - JUNO.coneTop;
  const stage2 = cluster(11, JUNO.tubRadius - 0.08, 0, tubLength - 0.2);
  // Bands that hold the ring together go with stage 2.
  for (const y of [0.25, tubLength - 0.15]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(JUNO.tubRadius - 0.02, 0.025, 4, 22), R.dark);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    stage2.group.add(band);
  }
  const stage3 = cluster(3, 0.1, 0.1, tubLength - 0.3);
  const stage4 = cluster(1, 0, tubLength, JUNO.stage4Top - JUNO.tubTop - 0.12);
  spinner.add(stage2.group, stage3.group, stage4.group);

  // The Spacecraft sits on stage 4, scaled to about a metre tall.
  const spacecraft = spacecraftOnTop(design, JUNO.top - JUNO.stage4Top);
  spacecraft.position.y = JUNO.stage4Top - JUNO.coneTop;
  spinner.add(spacecraft);

  return {
    root,
    stages: [first, stage2, stage3, stage4],
    spinner,
    spacecraft,
    upperBase: JUNO.coneTop,
    upperLength: JUNO.top - JUNO.coneTop,
  };
}

/**
 * A low-poly Thor-Able, in metres: 27 m tall (docs/research/launch-vehicles.md). A wide white Thor first stage
 * that narrows towards the top, with a black roll pattern and two small vernier engines by the main one;
 * the slim Able second stage; then the Altair solid third stage on a spin table with the Spacecraft on top.
 * Proportions are approximate.
 */
export const THOR = {
  radius: 1.22,
  taperFrom: 10.5,
  thorTop: 18.4,
  topRadius: 0.5,
  ableTop: 23.6,
  ableRadius: 0.42,
  altairTop: 25.4,
  top: 27,
};

function thorStage(): StageModel {
  const g = new THREE.Group();
  const r = THOR.radius;
  g.add(cyl(r, r, THOR.taperFrom - 0.8, R.white, 0.8));
  g.add(cyl(r, r * 0.95, 0.8, R.dark, 0));
  g.add(cyl(THOR.topRadius, r, THOR.thorTop - THOR.taperFrom, R.white, THOR.taperFrom));
  // Roll pattern and a band at the tank joint.
  for (const [y, start] of [
    [3.2, 0],
    [3.2, Math.PI],
    [6.4, Math.PI / 2],
    [6.4, Math.PI * 1.5],
  ] as const) {
    g.add(quarter(r, 1.6, y, start, R.black));
  }
  g.add(cyl(r * 1.01, r * 1.01, 0.15, R.black, THOR.taperFrom - 0.1));
  // Interstage up to the Able.
  g.add(cyl(THOR.ableRadius + 0.04, THOR.topRadius, 0.6, R.steel, THOR.thorTop));
  // Main engine and two verniers.
  g.add(cyl(r * 0.45, r * 0.62, 0.6, R.nozzle, -0.55));
  for (const sx of [-1, 1]) {
    const vernier = cyl(0.08, 0.14, 0.3, R.nozzle, 0.1);
    vernier.position.x = sx * (r + 0.05);
    g.add(vernier);
  }
  return { group: g, nozzles: [new THREE.Vector3(0, -0.55, 0)], nozzleRadius: r * 0.45 };
}

function ableStage(): StageModel {
  const g = new THREE.Group();
  const r = THOR.ableRadius;
  const base = THOR.thorTop + 0.6;
  g.add(cyl(r, r, THOR.ableTop - base, R.white, base));
  g.add(cyl(r * 1.01, r * 1.01, 0.12, R.black, base + 1.2));
  g.add(cyl(r * 1.01, r * 1.01, 0.12, R.black, THOR.ableTop - 0.5));
  g.add(cyl(0.12, r * 0.5, 0.35, R.steel, THOR.ableTop));
  g.add(cyl(r * 0.35, r * 0.5, 0.4, R.nozzle, base - 0.4));
  return { group: g, nozzles: [new THREE.Vector3(0, base - 0.4, 0)], nozzleRadius: r * 0.35 };
}

function buildThorAble(design: Design): RocketModel {
  const root = new THREE.Group();
  root.name = 'rocket';
  const first = thorStage();
  const second = ableStage();
  root.add(first.group, second.group);

  // The Altair and the Spacecraft turn on a spin table on top of the Able.
  const spinner = new THREE.Group();
  spinner.position.y = THOR.ableTop + 0.35;
  root.add(spinner);
  const third = new THREE.Group();
  const altairLength = THOR.altairTop - spinner.position.y;
  third.add(cyl(0.24, 0.24, altairLength - 0.2, R.motor, 0.2));
  third.add(cyl(0.25, 0.25, 0.06, R.dark, altairLength - 0.4));
  third.add(cyl(0.1, 0.16, 0.2, R.nozzle, 0));
  spinner.add(third);
  const spacecraft = spacecraftOnTop(design, THOR.top - THOR.altairTop);
  spacecraft.position.y = altairLength;
  spinner.add(spacecraft);

  const upperBase = THOR.thorTop + 0.6 - 0.4;
  return {
    root,
    stages: [first, second, { group: third, nozzles: [new THREE.Vector3(0, 0, 0)], nozzleRadius: 0.1 }],
    spinner,
    spacecraft,
    upperBase,
    upperLength: THOR.top - upperBase,
  };
}

/** Free the geometry the rocket built (materials are shared and kept). */
export function disposeRocket(model: THREE.Object3D): void {
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}
