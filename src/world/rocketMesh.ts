import * as THREE from 'three';
import { type CompanyLogo, DEFAULT_LOGO } from '../company/logo';
import { logoTexture } from './logoTexture';
import type { LaunchVehicleId } from '../game/launchVehicles';
import type { Design } from '../game/spacecraft';
import { bellProfile, latheGeometry } from './rocketLathe';
import { paint } from './rocketPaint';
import { buildSpacecraft } from './spacecraftMesh';

/**
 * The Launch Vehicles in metres, standing on their bases along +y, built from smooth lathed profiles with painted
 * metal (rocketPaint.ts). Shapes from docs/research/launch-vehicles.md. Every body part's geometry is placed in its
 * stage's own coordinates (no offsets on the meshes), so the paint's weld rings and soot line up along a stage.
 *
 * Juno I: 21.2 m; a Redstone-based first stage; on top, a spinning tub with an outer ring of 11 small solid
 * motors (stage 2) round a cluster of 3 (stage 3), then 1 more (stage 4) under the Spacecraft. Black and white.
 */

const R = {
  white: paint(0xcbc8c0, { roughness: 0.3, rings: 2.4, seams: 8, grime: 1.0, soot: 0.75, sootTop: 2.4 }),
  black: paint(0x18191b, { roughness: 0.36, rings: 2.4, seams: 8, grime: 0.35 }),
  /** Falcon 9's first stage: flown before, so greyed by soot from the engines and streaked down from the interstage. */
  whiteF9: paint(0xc6c3bb, { roughness: 0.36, rings: 1.9, seams: 6, grime: 1.6, soot: 0.55, sootTop: 6 }),
  /** The Merlin Vacuum's big nozzle extension: dark niobium. */
  niobium: paint(0x2e2b2a, { metalness: 0.85, roughness: 0.32, brushed: true, side: THREE.DoubleSide }),
  alu: paint(0xc3c7cc, { metalness: 0.9, roughness: 0.32, grime: 0.3, brushed: true }),
  steel: paint(0x8e949b, { metalness: 0.8, roughness: 0.4, rings: 0.6, grime: 0.45 }),
  dark: paint(0x3d3f43, { metalness: 0.65, roughness: 0.5, grime: 0.5, soot: 0.6, sootTop: 1.2 }),
  motor: paint(0x80858b, { metalness: 0.6, roughness: 0.42, rings: 0.35, grime: 0.4 }),
  // Regeneratively cooled bells: rows of brazed tubes round the outside.
  bellOut: paint(0x2b2826, { metalness: 0.7, roughness: 0.5, grime: 0.7, seams: 120, relief: 0 }),
  bellIn: paint(0x161412, { metalness: 0.4, roughness: 0.8, grime: 0.6 }),
  carbon: paint(0x141516, { roughness: 0.62, grime: 0.25, seams: 4 }),
  octaweb: paint(0x4a4c50, { metalness: 0.55, roughness: 0.6, grime: 0.6, soot: 0.8, sootTop: 1.4 }),
};

const SIDES = 64;

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

type Profile = [number, number][];

function lathe(profile: Profile, material: THREE.Material, segments = SIDES, phiStart = 0, phiLength = Math.PI * 2): THREE.Mesh {
  return new THREE.Mesh(latheGeometry(profile, segments, 35, phiStart, phiLength), material);
}

/** A closed cylinder (or frustum) from y0 to y1. */
function tube(r0: number, r1: number, y0: number, y1: number, material: THREE.Material, segments = SIDES): THREE.Mesh {
  return lathe([[0, y0], [r0, y0], [r1, y1], [0, y1]], material, segments);
}

/** A thin painted band standing just proud of the body. */
function band(r: number, y0: number, y1: number, material: THREE.Material): THREE.Mesh {
  const o = r * 1.004 + 0.002;
  return lathe([[r * 0.99, y0], [o, y0], [o, y1], [r * 0.99, y1]], material);
}

/** A quarter of a band round the body, for the roll pattern. */
function quarter(r: number, h: number, y: number, start: number, material: THREE.Material): THREE.Mesh {
  const o = r * 1.003 + 0.001;
  return lathe([[o, y], [o, y + h]], material, 18, start, Math.PI / 2);
}

/** A cable raceway running up the side of a tank, at angle `a` (radians round from +z). */
function raceway(r: number, y0: number, y1: number, a: number, material: THREE.Material, width = 0.13): THREE.Mesh {
  const shape = new THREE.Shape();
  const w = width / 2;
  shape.moveTo(-w, 0);
  shape.lineTo(-w * 0.8, 0.05);
  shape.quadraticCurveTo(0, 0.075, w * 0.8, 0.05);
  shape.lineTo(w, 0);
  shape.lineTo(-w, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, r - 0.01);
  g.rotateY(a);
  return new THREE.Mesh(g, material);
}

/** An engine bell, throat at `y`, exit `length` below; dark outside, sooty inside. */
function bell(throat: number, exit: number, length: number, y: number, x = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  const profile = bellProfile(throat, exit, length, Math.max(0.006, exit * 0.04));
  const outer = lathe(profile, R.bellOut, 40);
  // The same shape a hair inside, dark, so the throat reads as a deep hole.
  const inner = lathe(bellProfile(throat * 0.97, exit * 0.985, length * 0.995, 0.001).slice(1, 12), R.bellIn, 40);
  g.add(outer, inner);
  // Throat collar and a bit of the turbopump plumbing above it.
  g.add(tube(throat * 1.25, throat * 1.1, 0, throat * 1.2, R.dark, 24));
  g.position.set(x, y, z);
  return g;
}

/** One small solid motor (a scaled-down Sergeant): a tube with a nozzle, base at y = 0. */
function motor(length: number, radius: number): THREE.Group {
  const g = new THREE.Group();
  g.add(lathe([[0, 0.1], [radius * 0.92, 0.1], [radius, 0.13], [radius, length + 0.07], [radius * 0.85, length + 0.12], [0, length + 0.12]], R.motor, 20));
  g.add(lathe(bellProfile(radius * 0.35, radius * 0.7, 0.1, 0.006).map(([r, y]) => [r, y + 0.1] as [number, number]), R.bellOut, 16));
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

/** A swept tail fin with rounded edges, its root against a body of radius `r`. */
function finGeometry(r: number, span: number, rootChord: number, tipChord: number, sweep: number, thick: number): THREE.BufferGeometry {
  const fin = new THREE.Shape();
  fin.moveTo(0, 0);
  fin.lineTo(span, sweep * 0.25);
  fin.lineTo(span, sweep * 0.25 + tipChord);
  fin.lineTo(0, rootChord);
  fin.closePath();
  const g = new THREE.ExtrudeGeometry(fin, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.45, bevelSize: thick * 0.45, bevelSegments: 2, curveSegments: 1 });
  g.translate(r - thick, 0, -thick / 2);
  g.computeVertexNormals();
  return g;
}

function firstStage(): StageModel {
  const g = new THREE.Group();
  const r = JUNO.radius;
  // Tail unit: slightly flared skirt with the engine inside, then the long tank section.
  g.add(lathe([[r * 0.7, 0], [r * 0.95, 0], [r, 0.25], [r, 1.2], [r * 0.99, 1.22]], R.dark));
  g.add(lathe([[r * 0.99, 1.2], [r, 1.24], [r, JUNO.firstStageTop], [r * 0.98, JUNO.firstStageTop + 0.01]], R.white));
  // Roll pattern: black quarters, offset between bands.
  for (const [y, start] of [
    [9.5, 0],
    [9.5, Math.PI],
    [12.2, Math.PI / 2],
    [12.2, Math.PI * 1.5],
  ] as const) {
    g.add(quarter(r, 1.4, y, start, R.black));
  }
  g.add(band(r, JUNO.firstStageTop - 0.12, JUNO.firstStageTop + 0.02, R.black));
  g.add(raceway(r, 1.3, JUNO.firstStageTop - 0.2, Math.PI * 0.75, R.white));
  // Four fins with their air rudders, black, at the tail.
  const finGeo = finGeometry(r, 1.2, 3.0, 0.95, 2.1, 0.07);
  const rudderGeo = new THREE.BoxGeometry(0.06, 0.55, 0.42);
  rudderGeo.translate(r + 1.0, 0.35, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const f = new THREE.Mesh(finGeo, R.black);
    f.rotation.y = a;
    g.add(f);
    const rudder = new THREE.Mesh(rudderGeo, R.dark);
    rudder.rotation.y = a + Math.PI / 2;
    g.add(rudder);
  }
  // Instrument section, with its own pattern, then the cone up to the tub.
  g.add(lathe([[r * 0.98, JUNO.firstStageTop], [r, JUNO.firstStageTop + 0.02], [r, JUNO.instrumentTop], [r * 0.98, JUNO.instrumentTop + 0.01]], R.white));
  g.add(quarter(r, 0.8, JUNO.firstStageTop + 0.5, Math.PI / 4, R.black));
  g.add(quarter(r, 0.8, JUNO.firstStageTop + 0.5, Math.PI * 1.25, R.black));
  g.add(lathe([[r * 0.95, JUNO.instrumentTop], [r, JUNO.instrumentTop + 0.02], [JUNO.tubRadius + 0.05, JUNO.coneTop], [0, JUNO.coneTop]], R.alu));
  // The A-7 engine, its bell ending just below the skirt.
  g.add(bell(0.2, r * 0.55, 0.85, 0.55));
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
export function buildRocket(design: Design, vehicle: LaunchVehicleId = 'juno1', logo: CompanyLogo = DEFAULT_LOGO): RocketModel {
  const model = vehicle === 'falcon9' ? buildFalcon(design) : vehicle === 'juno1' ? buildJuno(design) : buildThor(design, vehicle === 'thorAble' ? THOR : THOR_DELTA, vehicle === 'deltaD' ? 3 : 0);
  const radius = vehicle === 'falcon9' ? 0.74 : vehicle === 'juno1' ? JUNO.radius : THOR.radius;
  const material = new THREE.MeshBasicMaterial({ map: logoTexture(logo), transparent: true, depthWrite: false });
  material.name = 'company-logo';
  // Four curved decals keep the emblem visible as the camera follows the climb.
  for (let i = 0; i < 4; i++) {
    const decal = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.012, radius * 1.012, radius * 1.1, 12, 1, true, i * Math.PI / 2 - 0.55, 1.1), material);
    decal.name = 'company-logo';
    decal.position.y = 7;
    model.stages[0]!.group.add(decal);
  }
  return model;
}

/** Falcon 9: two stages, nine engines below and one above. Compressed to fit the existing pad shot,
 * like the Thor models; the fairing is left off so the player's Spacecraft shows. No real logos. */
function buildFalcon(design: Design): RocketModel {
  const root = new THREE.Group();
  root.name = 'rocket';
  const r = 0.74;
  const first = new THREE.Group();
  // Octaweb and engine skirt, the long white tank, then the black interstage with folded grid fins.
  first.add(lathe([[r * 0.8, 0], [r * 0.98, 0], [r, 0.08], [r, 0.6], [r * 0.99, 0.62]], R.octaweb));
  first.add(lathe([[r * 0.99, 0.6], [r, 0.62], [r, 16.6], [r * 0.99, 16.61]], R.whiteF9));
  first.add(lathe([[r * 0.99, 16.6], [r * 1.003, 16.62], [r * 1.003, 18.2], [r * 0.95, 18.22]], R.carbon));
  first.add(raceway(r, 0.7, 16.5, Math.PI * 0.5, R.whiteF9, 0.16));
  // Landing legs folded flat against the tank, and grid fins folded against the interstage.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 4.2, 0.08), R.carbon);
    leg.geometry.translate(0, 2.4, r + 0.03);
    leg.rotation.y = a;
    first.add(leg);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.06), R.dark);
    fin.geometry.translate(0, 17.6, r + 0.05);
    fin.rotation.y = a + Math.PI / 4;
    first.add(fin);
  }
  const nozzles: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) {
    const angle = i * Math.PI / 4;
    const x = i === 8 ? 0 : Math.cos(angle) * 0.47;
    const z = i === 8 ? 0 : Math.sin(angle) * 0.47;
    first.add(bell(0.06, 0.15, 0.42, 0.17, x, z));
    nozzles.push(new THREE.Vector3(x, -0.25, z));
  }
  const second = new THREE.Group();
  second.add(lathe([[r * 0.9, 18.2], [r, 18.25], [r, 24.2], [r * 0.99, 24.21]], R.white));
  second.add(band(r, 23.6, 23.75, R.carbon));
  // The Merlin Vacuum: a short engine and a big, dark nozzle extension nearly as wide as the stage.
  second.add(bell(0.1, 0.3, 0.35, 18.2));
  second.add(lathe(bellProfile(0.3, 0.66, 0.95, 0.008).map(([pr, py]) => [pr, py + 17.85] as [number, number]), R.niobium, 48));
  // Payload adapter: a short aluminium cone up to the Spacecraft.
  second.add(lathe([[r * 0.99, 24.2], [r * 0.97, 24.25], [0.5, 25.4], [0.48, 25.6], [0, 25.6]], R.alu));
  const spinner = new THREE.Group();
  spinner.position.y = 25.6;
  const spacecraft = spacecraftOnTop(design, 2.4);
  spinner.add(spacecraft);
  root.add(first, second, spinner);
  return {
    root,
    stages: [
      { group: first, nozzles, nozzleRadius: 0.1 },
      { group: second, nozzles: [new THREE.Vector3(0, 17.4, 0)], nozzleRadius: 0.28 },
    ],
    spinner, spacecraft, upperBase: 17.4, upperLength: 10.6,
  };
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
    stage2.group.add(lathe([[JUNO.tubRadius - 0.05, y - 0.03], [JUNO.tubRadius, y - 0.03], [JUNO.tubRadius, y + 0.03], [JUNO.tubRadius - 0.05, y + 0.03]], R.steel, 40));
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
 * Thor-Able, in metres: 27 m tall (docs/research/launch-vehicles.md). A wide white Thor first stage
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

/** Heights along a Thor-family rocket, in metres: the Thor, its second stage, the Altair and the Spacecraft. */
type ThorShape = typeof THOR;

/**
 * Thor-Delta and Delta D (docs/research/launch-vehicles.md): the same Thor with a longer Delta second stage
 * (31–32 m in all; the model leaves out the nose fairing, so the Spacecraft shows). Delta D adds three Castor
 * solid boosters round the Thor's base. Proportions are approximate.
 */
export const THOR_DELTA: ThorShape = {
  ...THOR,
  ableTop: 25.5,
  altairTop: 27.3,
  top: 29.1,
};

/** Castor solid boosters strapped round the Thor: they burn with the first stage and drop with it. */
function strapOns(g: THREE.Group, nozzles: THREE.Vector3[], count: number): void {
  const r = 0.4;
  const length = 6;
  const out = THOR.radius + r - 0.05;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.PI / 6;
    const x = Math.sin(a) * out;
    const z = Math.cos(a) * out;
    const booster = new THREE.Group();
    booster.position.set(x, 0, z);
    // Casing with a pointed ogive nose, black band, and its nozzle.
    const profile: Profile = [[r * 0.6, 0.3], [r * 0.98, 0.3], [r, 0.4], [r, 0.4 + length]];
    for (let k = 1; k <= 8; k++) {
      const t = k / 8;
      profile.push([r * Math.sqrt(1 - t * t * 0.98), 0.4 + length + 1.3 * t]);
    }
    profile.push([0, 0.4 + length + 1.32]);
    booster.add(lathe(profile, R.white, 40));
    booster.add(band(r, length * 0.7, length * 0.7 + 0.2, R.black));
    // Struts to the Thor.
    for (const y of [0.9, length - 0.3]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), R.steel);
      strut.rotation.z = Math.PI / 2;
      strut.position.y = y;
      const holder = new THREE.Group();
      holder.add(strut);
      holder.rotation.y = a - Math.PI / 2;
      strut.position.x = -r - 0.05;
      booster.add(holder);
    }
    booster.add(bell(0.1, r * 0.55, 0.45, 0.35));
    g.add(booster);
    nozzles.push(new THREE.Vector3(x, -0.1, z));
  }
}

function thorStage(boosters = 0): StageModel {
  const g = new THREE.Group();
  const r = THOR.radius;
  // Engine section (dark, sooty), the long white tanks tapering towards the top, and the interstage.
  g.add(lathe([[r * 0.8, 0], [r * 0.95, 0], [r, 0.12], [r, 0.8], [r * 0.99, 0.82]], R.dark));
  g.add(lathe([[r * 0.99, 0.8], [r, 0.82], [r, THOR.taperFrom], [THOR.topRadius, THOR.thorTop], [THOR.topRadius * 0.97, THOR.thorTop + 0.01]], R.white));
  // Roll pattern and a band at the tank joint.
  for (const [y, start] of [
    [3.2, 0],
    [3.2, Math.PI],
    [6.4, Math.PI / 2],
    [6.4, Math.PI * 1.5],
  ] as const) {
    g.add(quarter(r, 1.6, y, start, R.black));
  }
  g.add(band(r, THOR.taperFrom - 0.1, THOR.taperFrom + 0.05, R.black));
  // Conduits up the side of the tanks.
  g.add(raceway(r, 0.85, THOR.taperFrom - 0.15, Math.PI * 0.5, R.white, 0.16));
  g.add(raceway(r, 0.85, THOR.taperFrom - 0.15, Math.PI * 1.5, R.white, 0.16));
  // Interstage up to the second stage.
  g.add(lathe([[THOR.topRadius * 0.97, THOR.thorTop], [THOR.topRadius, THOR.thorTop + 0.02], [THOR.ableRadius + 0.04, THOR.thorTop + 0.6], [THOR.ableRadius, THOR.thorTop + 0.61]], R.alu));
  // Main engine (its bell below the base) and two verniers on the sides.
  g.add(bell(0.24, r * 0.45, 1.0, 0.45));
  for (const sx of [-1, 1]) g.add(bell(0.035, 0.08, 0.22, 0.32, sx * (r + 0.06), 0));
  for (const sx of [-1, 1]) {
    const fairing = lathe([[0, 0.25], [0.13, 0.25], [0.14, 0.8], [0, 1.2]], R.dark, 16);
    fairing.position.x = sx * (r - 0.02);
    g.add(fairing);
  }
  const nozzles = [new THREE.Vector3(0, -0.55, 0)];
  if (boosters > 0) strapOns(g, nozzles, boosters);
  return { group: g, nozzles, nozzleRadius: r * 0.45 };
}

/** The second stage: Able on Thor-Able, Delta (longer) on the Thor-Deltas. */
function ableStage(shape: ThorShape = THOR): StageModel {
  const g = new THREE.Group();
  const r = shape.ableRadius;
  const base = shape.thorTop + 0.6;
  g.add(lathe([[r * 0.85, base], [r, base + 0.05], [r, shape.ableTop], [r * 0.97, shape.ableTop + 0.01]], R.white, 48));
  g.add(band(r, base + 1.2, base + 1.32, R.black));
  g.add(band(r, shape.ableTop - 0.5, shape.ableTop - 0.38, R.black));
  g.add(raceway(r, base + 0.1, shape.ableTop - 0.1, Math.PI * 0.25, R.white, 0.08));
  // Spin table on top.
  g.add(lathe([[r * 0.97, shape.ableTop], [r * 0.9, shape.ableTop + 0.05], [0.16, shape.ableTop + 0.3], [0.12, shape.ableTop + 0.35], [0, shape.ableTop + 0.35]], R.alu, 40));
  g.add(bell(0.06, r * 0.35, 0.45, base + 0.05));
  return { group: g, nozzles: [new THREE.Vector3(0, base - 0.4, 0)], nozzleRadius: r * 0.35 };
}

/** A Thor-family rocket with the player's Spacecraft on top: Thor-Able, or a Thor-Delta with `boosters` strapped on. */
function buildThor(design: Design, shape: ThorShape, boosters: number): RocketModel {
  const root = new THREE.Group();
  root.name = 'rocket';
  const first = thorStage(boosters);
  const second = ableStage(shape);
  root.add(first.group, second.group);

  // The Altair and the Spacecraft turn on a spin table on top of the second stage.
  const spinner = new THREE.Group();
  spinner.position.y = shape.ableTop + 0.35;
  root.add(spinner);
  const third = new THREE.Group();
  const altairLength = shape.altairTop - spinner.position.y;
  // The Altair: a round-shouldered glass-fibre motor case.
  third.add(lathe([[0.1, 0.18], [0.2, 0.2], [0.24, 0.32], [0.24, altairLength - 0.35], [0.2, altairLength - 0.22], [0.08, altairLength - 0.18], [0, altairLength - 0.18]], R.motor, 40));
  third.add(lathe([[0.2, altairLength - 0.2], [0.25, altairLength - 0.2], [0.25, altairLength - 0.12], [0.2, altairLength - 0.12]], R.dark, 40));
  third.add(lathe([[0, altairLength - 0.2], [0.1, altairLength - 0.2], [0.12, altairLength], [0, altairLength]], R.alu, 24));
  third.add(bell(0.05, 0.13, 0.2, 0.2));
  spinner.add(third);
  const spacecraft = spacecraftOnTop(design, shape.top - shape.altairTop);
  spacecraft.position.y = altairLength;
  spinner.add(spacecraft);

  const upperBase = THOR.thorTop + 0.6 - 0.4;
  return {
    root,
    stages: [first, second, { group: third, nozzles: [new THREE.Vector3(0, 0, 0)], nozzleRadius: 0.1 }],
    spinner,
    spacecraft,
    upperBase,
    upperLength: shape.top - upperBase,
  };
}

/** Free the rocket geometry and its logo; the other materials are shared and kept. */
export function disposeRocket(model: THREE.Object3D): void {
  const logos = new Set<THREE.MeshBasicMaterial>();
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.dispose();
    const material = o.material as THREE.MeshBasicMaterial;
    if (material.name === 'company-logo') logos.add(material);
  });
  for (const material of logos) {
    material.map?.dispose();
    material.dispose();
  }
}
