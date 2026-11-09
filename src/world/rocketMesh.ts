import * as THREE from 'three';
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

/** The whole Juno I with the player's Spacecraft on top. */
export function buildRocket(design: Design): RocketModel {
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
  const spacecraft = new THREE.Group();
  const model = buildSpacecraft(design);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = (JUNO.top - JUNO.stage4Top) / Math.max(size.y, 0.01);
  model.scale.setScalar(scale);
  model.position.y = -box.min.y * scale;
  spacecraft.add(model);
  spacecraft.position.y = JUNO.stage4Top - JUNO.coneTop;
  spinner.add(spacecraft);

  return { root, stages: [first, stage2, stage3, stage4], spinner, spacecraft };
}

/** Free the geometry the rocket built (materials are shared and kept). */
export function disposeRocket(model: THREE.Object3D): void {
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}
