import * as THREE from 'three';
import type { Design } from '../game/spacecraft';
import { bellProfile, latheGeometry } from './rocketLathe';
import { paint } from './rocketPaint';
import { buildSpacecraft } from './spacecraftMesh';

/**
 * The two Moon rockets, built in real metres and shown at MOON_ROCKET_SCALE so they fit the Launch show's pad
 * shots beside the older rockets (still by far the tallest): proportions are real.
 *
 *  - Saturn V (Apollo 11), 110.6 m: S-IC (10.1 m wide, five F-1s under engine fairings, four fins, white with the
 *    black roll pattern), S-II (five J-2s), S-IVB (one J-2), Instrument Unit, the adapter holding the Lunar Module,
 *    the Service Module and the Command Module under its boost cover, and the Launch Escape System tower.
 *  - SLS Block 1 (Artemis II), 98 m: orange foam core stage (8.4 m) with four RS-25s, two white five-segment solid
 *    boosters with nose cones, the stage adapter, the ICPS, Orion's service module fairings and the Launch Abort
 *    System with its ogive cover.
 *
 * Stages for the show (docs/eras-demo/PLAN.md): Saturn V 1 = S-IC, 2 = S-II, 3 = S-IVB. SLS 1 = the two boosters
 * (the core's RS-25s burn with them: they are in stage 2's nozzles, lit from liftoff), 2 = core stage, 3 = ICPS.
 * No agency logos, flags or "USA" lettering.
 */

/** How large the Moon rockets are drawn, against real metres. */
export const MOON_ROCKET_SCALE = 0.42;
/** Height of the Mobile Launcher's deck the rocket stands on, real metres (25 ft). */
export const ML_DECK = 7.6;

const R = {
  white: paint(0xd2cfc7, { roughness: 0.35, rings: 6, seams: 12, grime: 0.6, soot: 0.5, sootTop: 6 }),
  whiteClean: paint(0xdedbd3, { roughness: 0.4, rings: 4, seams: 8, grime: 0.3 }),
  black: paint(0x17181a, { roughness: 0.4, rings: 6, seams: 12, grime: 0.3 }),
  foam: paint(0xc8692a, { roughness: 0.85, rings: 9, seams: 6, grime: 0.7, soot: 0.6, sootTop: 5, relief: 0.4 }),
  booster: paint(0xd8d6d0, { roughness: 0.45, rings: 10.5, seams: 6, grime: 0.7, soot: 0.6, sootTop: 6 }),
  alu: paint(0xc3c7cc, { metalness: 0.85, roughness: 0.35, grime: 0.3, brushed: true }),
  dark: paint(0x3b3d41, { metalness: 0.6, roughness: 0.5, grime: 0.5, soot: 0.7, sootTop: 3 }),
  bellOut: paint(0x2b2826, { metalness: 0.7, roughness: 0.5, grime: 0.7, seams: 120, relief: 0 }),
  bellIn: paint(0x161412, { metalness: 0.4, roughness: 0.8, grime: 0.6 }),
  /** RS-25 nozzles: light grey, regeneratively cooled tubes. */
  rs25: paint(0x8f9296, { metalness: 0.8, roughness: 0.35, seams: 160, grime: 0.4 }),
  tower: paint(0xb63a22, { roughness: 0.5, metalness: 0.4, grime: 0.4 }),
};

type Profile = [number, number][];

function lathe(profile: Profile, material: THREE.Material, segments = 64): THREE.Mesh {
  return new THREE.Mesh(latheGeometry(profile, segments), material);
}

function tube(r0: number, r1: number, y0: number, y1: number, material: THREE.Material, segments = 64): THREE.Mesh {
  return lathe([[0, y0], [r0, y0], [r1, y1], [0, y1]], material, segments);
}

/** A band of quarters round the body, alternately black and the body's colour: the roll pattern. */
function rollBand(r: number, y0: number, y1: number, offset: number, g: THREE.Group): void {
  for (let i = 0; i < 4; i += 2) {
    const o = r * 1.003 + 0.004;
    g.add(new THREE.Mesh(latheGeometry([[o, y0], [o, y1]], 18, 35, offset + (i * Math.PI) / 2, Math.PI / 2), R.black));
  }
}

function bell(throat: number, exit: number, length: number, y: number, x = 0, z = 0, outer: THREE.Material = R.bellOut): THREE.Group {
  const g = new THREE.Group();
  g.add(lathe(bellProfile(throat, exit, length, Math.max(0.01, exit * 0.03)), outer, 40));
  g.add(lathe(bellProfile(throat * 0.97, exit * 0.985, length * 0.995, 0.001).slice(1, 12), R.bellIn, 40));
  g.add(tube(throat * 1.3, throat * 1.1, 0, throat * 1.5, R.dark, 20));
  g.position.set(x, y, z);
  return g;
}

function strut(a: THREE.Vector3, b: THREE.Vector3, r: number, material: THREE.Material): THREE.Mesh {
  const d = b.clone().sub(a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), material);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

export type PlumeKind = 'liquid' | 'solid' | 'hydrogen';

export interface MoonStage {
  group: THREE.Group;
  nozzles: THREE.Vector3[];
  nozzleRadius: number;
  /** What each nozzle's flame looks like, and how long it is (stage metres). */
  plume: PlumeKind;
  flameLength: number;
}

export interface MoonRocket {
  root: THREE.Group;
  stages: MoonStage[];
  spinner: THREE.Group;
  spacecraft: THREE.Group;
  /** In the root's units (scaled). */
  upperBase: number;
  upperLength: number;
  /** Where the Company logo goes: the group, its height there and the body's radius (stage metres). */
  logo: { group: THREE.Group; y: number; radius: number };
  /** Scaled height above the root's base. */
  height: number;
}

/** The player's Spacecraft, small, out of sight inside the rocket (it rides in the Lunar Module, or the CubeSat
 * dispensers): it still has to exist for the show. */
function hiddenSpacecraft(design: Design, y: number): { spinner: THREE.Group; spacecraft: THREE.Group } {
  const spinner = new THREE.Group();
  spinner.position.y = y;
  const spacecraft = new THREE.Group();
  const model = buildSpacecraft(design);
  model.scale.setScalar(0.6);
  spacecraft.add(model);
  spinner.add(spacecraft);
  return { spinner, spacecraft };
}

/** The CSM under its boost cover with the escape tower, from `y` (top of the adapter) up. Returns the top. */
function apolloTop(g: THREE.Group, y: number): number {
  // Service Module (white panels) then the Command Module inside the boost protective cover (white cone).
  g.add(tube(1.96, 1.96, y, y + 4.0, R.whiteClean, 48));
  const cm = y + 4.0;
  g.add(lathe([[0, cm], [2.0, cm], [2.0, cm + 0.3], [0.45, cm + 3.4], [0.3, cm + 3.55], [0, cm + 3.55]], R.whiteClean, 48));
  // Escape tower: a truss, then the motor with its nozzles, and the nose cone with the canard.
  const tb = cm + 3.55;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    g.add(strut(new THREE.Vector3(Math.sin(a) * 0.62, tb - 0.2, Math.cos(a) * 0.62), new THREE.Vector3(Math.sin(a) * 0.32, tb + 3.0, Math.cos(a) * 0.32), 0.05, R.tower));
    g.add(strut(new THREE.Vector3(Math.sin(a) * 0.55, tb + 0.6, Math.cos(a) * 0.55), new THREE.Vector3(Math.sin(a + Math.PI / 2) * 0.42, tb + 2.0, Math.cos(a + Math.PI / 2) * 0.42), 0.035, R.tower));
  }
  g.add(tube(0.33, 0.33, tb + 3.0, tb + 3.3, R.dark, 24));
  g.add(lathe([[0, tb + 3.3], [0.33, tb + 3.3], [0.33, tb + 7.4], [0.3, tb + 7.9], [0.12, tb + 9.4], [0.03, tb + 9.9], [0, tb + 9.9]], R.whiteClean, 32));
  g.add(tube(0.34, 0.34, tb + 6.2, tb + 6.6, R.black, 24));
  return tb + 9.9;
}

/** Saturn V with the player's Spacecraft riding inside (in the Lunar Module, under the adapter). */
export function buildSaturnV(design: Design): MoonRocket {
  const root = new THREE.Group();
  root.name = 'rocket';
  const inner = new THREE.Group();
  inner.scale.setScalar(MOON_ROCKET_SCALE);
  inner.position.y = (ML_DECK - 4.3) * MOON_ROCKET_SCALE;
  root.add(inner);
  const r = 5.05;

  // ---- S-IC: 42 m, five F-1s.
  const sic = new THREE.Group();
  sic.add(lathe([[r * 0.9, 0], [r, 0.4], [r, 42.1], [r * 0.98, 42.12]], R.white, 72));
  // The roll pattern: black quarters on the thrust structure, the intertank and the forward skirt.
  rollBand(r, 0.4, 6.4, 0, sic);
  rollBand(r, 19.2, 25.8, Math.PI / 4, sic);
  rollBand(r, 38.4, 42.1, 0, sic);
  // Four engine fairings (cones) and fins at the base.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const fairing = lathe([[0, -1.6], [1.25, -1.6], [1.45, 0.4], [0.2, 9.5], [0, 9.6]], R.white, 24);
    fairing.position.set(Math.sin(a) * (r - 0.5), 0, Math.cos(a) * (r - 0.5));
    sic.add(fairing);
    const fin = new THREE.Shape();
    fin.moveTo(0, 0);
    fin.lineTo(3.2, 0.9);
    fin.lineTo(3.2, 3.4);
    fin.lineTo(0, 6.3);
    fin.closePath();
    const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 1 });
    fg.translate(r + 0.9, -1.4, -0.15);
    fg.computeVertexNormals();
    const f = new THREE.Mesh(fg, R.black);
    f.rotation.y = a - Math.PI / 2;
    sic.add(f);
  }
  const f1: THREE.Vector3[] = [new THREE.Vector3(0, -5.6, 0)];
  sic.add(bell(0.5, 1.85, 5.6, 0.2));
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const x = Math.sin(a) * 3.3;
    const z = Math.cos(a) * 3.3;
    sic.add(bell(0.5, 1.85, 5.6, 0.2, x, z));
    f1.push(new THREE.Vector3(x, -5.6, z));
  }
  sic.add(tube(r * 0.95, r * 0.95, -0.3, 0.4, R.dark, 48));
  inner.add(sic);

  // ---- S-II: 24.9 m with its interstage, five J-2s.
  const sii = new THREE.Group();
  const s2 = 42.1;
  sii.add(lathe([[r * 0.98, s2], [r, s2 + 0.05], [r, s2 + 24.9], [r * 0.98, s2 + 24.92]], R.white, 72));
  sii.add(tube(r * 1.004, r * 1.004, s2, s2 + 5.5, R.whiteClean, 72));
  rollBand(r, s2 + 21.6, s2 + 24.9, 0, sii);
  sii.add(tube(r * 1.005, r * 1.005, s2 + 5.5, s2 + 5.9, R.black, 72));
  const j2: THREE.Vector3[] = [new THREE.Vector3(0, s2 + 3.2 - 3.4, 0)];
  sii.add(bell(0.3, 1.0, 3.4, s2 + 3.2));
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    sii.add(bell(0.3, 1.0, 3.4, s2 + 3.2, Math.sin(a) * 2.8, Math.cos(a) * 2.8));
    j2.push(new THREE.Vector3(Math.sin(a) * 2.8, s2 - 0.2, Math.cos(a) * 2.8));
  }
  inner.add(sii);

  // ---- S-IVB: the tapered interstage, the 6.6 m stage, one J-2; then the IU, adapter and the CSM on top.
  const sivb = new THREE.Group();
  const s3 = s2 + 24.9;
  const r3 = 3.3;
  sivb.add(lathe([[r * 0.98, s3], [r, s3 + 0.05], [r3, s3 + 5.8], [r3 * 0.99, s3 + 5.82]], R.white, 72));
  sivb.add(lathe([[r3 * 0.98, s3 + 5.8], [r3, s3 + 5.85], [r3, s3 + 5.8 + 15.0], [r3 * 0.98, s3 + 5.8 + 15.02]], R.white, 64));
  rollBand(r3, s3 + 5.8, s3 + 8.2, Math.PI / 4, sivb);
  sivb.add(bell(0.35, 1.0, 3.2, s3 + 4.2));
  const iu = s3 + 20.8;
  sivb.add(tube(r3, r3, iu, iu + 0.9, R.alu, 64));
  sivb.add(lathe([[0, iu + 0.9], [r3, iu + 0.9], [1.96, iu + 0.9 + 8.5], [0, iu + 0.9 + 8.5]], R.whiteClean, 64));
  const top = apolloTop(sivb, iu + 9.4);
  inner.add(sivb);

  const { spinner, spacecraft } = hiddenSpacecraft(design, iu + 4);
  inner.add(spinner);
  const k = MOON_ROCKET_SCALE;
  return {
    root,
    stages: [
      { group: sic, nozzles: f1, nozzleRadius: 1.85, plume: 'liquid', flameLength: 48 },
      { group: sii, nozzles: j2, nozzleRadius: 1.0, plume: 'hydrogen', flameLength: 10 },
      { group: sivb, nozzles: [new THREE.Vector3(0, s3 + 1.0, 0)], nozzleRadius: 1.0, plume: 'hydrogen', flameLength: 10 },
    ],
    spinner,
    spacecraft,
    upperBase: inner.position.y + s2 * k,
    upperLength: (top - s2) * k,
    logo: { group: sic, y: 31, radius: r },
    height: inner.position.y + top * k,
  };
}

/** SLS Block 1 with Orion; the player's CubeSat rides in the stage adapter's dispensers. */
export function buildSLS(design: Design): MoonRocket {
  const root = new THREE.Group();
  root.name = 'rocket';
  const inner = new THREE.Group();
  inner.scale.setScalar(MOON_ROCKET_SCALE);
  inner.position.y = (ML_DECK - 4.3) * MOON_ROCKET_SCALE;
  root.add(inner);
  const rc = 4.2;

  // ---- Stage 1: the two five-segment solid boosters on either side (±x), 54 m, 3.7 m wide.
  const boosters = new THREE.Group();
  const rb = 1.85;
  const bx = rc + rb + 0.3;
  const srb: THREE.Vector3[] = [];
  for (const s of [-1, 1]) {
    const b = new THREE.Group();
    b.position.x = s * bx;
    // Aft skirt flaring out, the five segments, the forward assembly and nose cone.
    b.add(lathe([[2.7, 0], [2.75, 0.2], [rb, 3.6], [rb, 4.0]], R.booster, 48));
    const prof: Profile = [[rb * 0.98, 3.9], [rb, 4.0], [rb, 47.3]];
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      prof.push([rb * Math.sqrt(1 - t * t * 0.96), 47.3 + 6.7 * t]);
    }
    prof.push([0, 54.1]);
    b.add(lathe(prof, R.booster, 48));
    for (const y of [12.6, 21.2, 29.8, 38.4]) b.add(tube(rb * 1.006, rb * 1.006, y, y + 0.35, R.alu, 48));
    b.add(tube(rb * 1.008, rb * 1.008, 43.5, 44.6, R.black, 48));
    b.add(bell(0.6, 1.9, 2.4, 0.6, 0, 0, R.dark));
    // Attach struts to the core.
    for (const y of [5.5, 44]) b.add(strut(new THREE.Vector3(-s * rb, y, 0), new THREE.Vector3(-s * (bx - rc), y, 0), 0.18, R.alu));
    boosters.add(b);
    srb.push(new THREE.Vector3(s * bx, -1.8, 0));
  }
  inner.add(boosters);

  // ---- Stage 2: the core stage, orange foam, 64.6 m, 8.4 m wide; four RS-25s.
  const core = new THREE.Group();
  core.add(lathe([[rc * 0.92, 0], [rc, 0.5], [rc, 64.6], [rc * 0.98, 64.62]], R.foam, 72));
  // The engine section's white heat shield and the boattail.
  core.add(tube(rc * 1.002, rc * 1.002, 0.5, 5.2, R.whiteClean, 72));
  core.add(tube(rc * 0.9, rc * 0.9, -0.2, 0.5, R.dark, 48));
  // Intertank (ribbed, darker orange) and a feedline down the side.
  core.add(tube(rc * 1.004, rc * 1.004, 42.0, 48.5, paint(0xb35a22, { roughness: 0.8, seams: 72, relief: 1 }), 72));
  core.add(strut(new THREE.Vector3(0, 5.2, rc + 0.25), new THREE.Vector3(0, 42, rc + 0.25), 0.3, R.foam));
  const rs25: THREE.Vector3[] = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const x = Math.sin(a) * 2.2;
    const z = Math.cos(a) * 2.2;
    core.add(bell(0.3, 1.15, 3.1, -0.2, x, z, R.rs25));
    rs25.push(new THREE.Vector3(x, -3.3, z));
  }
  inner.add(core);

  // ---- Stage 3: the stage adapter cone, the ICPS, Orion's fairings and the Launch Abort System.
  const upper = new THREE.Group();
  const c = 64.6;
  upper.add(lathe([[rc * 0.98, c], [rc, c + 0.05], [2.6, c + 8.9], [2.55, c + 8.92]], R.whiteClean, 72));
  upper.add(tube(rc * 1.004, rc * 1.004, c, c + 0.8, R.alu, 72));
  // ICPS top showing above the adapter, then the Orion stage adapter ring.
  upper.add(tube(2.55, 2.55, c + 8.9, c + 10.6, R.whiteClean, 64));
  upper.add(tube(2.6, 2.6, c + 10.6, c + 11.8, R.alu, 64));
  // Service module under its three fairing panels, then the abort system's ogive cover and tower.
  const sm = c + 11.8;
  upper.add(lathe([[2.6, sm], [2.62, sm + 0.1], [2.62, sm + 4.6], [2.55, sm + 4.8]], R.whiteClean, 64));
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    upper.add(strut(new THREE.Vector3(Math.sin(a) * 2.63, sm, Math.cos(a) * 2.63), new THREE.Vector3(Math.sin(a) * 2.63, sm + 4.7, Math.cos(a) * 2.63), 0.04, R.dark));
  }
  const las = sm + 4.8;
  const ogive: Profile = [[2.55, las]];
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    ogive.push([2.55 * (1 - t) + 0.45 * t + 0.6 * Math.sin(Math.PI * t) * (1 - t), las + 7.0 * t]);
  }
  ogive.push([0, las + 7.0]);
  upper.add(lathe(ogive, R.whiteClean, 64));
  // The abort motor tower with its four angled nozzles, the attitude motor and nose.
  upper.add(tube(0.5, 0.5, las + 7.0, las + 13.5, R.whiteClean, 32));
  upper.add(tube(0.52, 0.52, las + 8.6, las + 9.4, R.dark, 32));
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.6, 12), R.dark);
    n.position.set(Math.sin(a) * 0.55, las + 9.0, Math.cos(a) * 0.55);
    n.rotation.set(Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6);
    upper.add(n);
  }
  upper.add(lathe([[0, las + 13.5], [0.5, las + 13.5], [0.35, las + 15.2], [0.05, las + 16.3], [0, las + 16.3]], R.whiteClean, 32));
  // RL10 under the ICPS (inside the adapter: out of sight until the core drops).
  upper.add(bell(0.15, 1.05, 3.6, c + 4.4));
  inner.add(upper);
  const top = las + 16.3;

  const { spinner, spacecraft } = hiddenSpacecraft(design, c + 11);
  inner.add(spinner);
  const k = MOON_ROCKET_SCALE;
  return {
    root,
    stages: [
      { group: boosters, nozzles: srb, nozzleRadius: 1.9, plume: 'solid', flameLength: 60 },
      { group: core, nozzles: rs25, nozzleRadius: 1.15, plume: 'hydrogen', flameLength: 26 },
      { group: upper, nozzles: [new THREE.Vector3(0, c + 0.8, 0)], nozzleRadius: 1.0, plume: 'hydrogen', flameLength: 10 },
    ],
    spinner,
    spacecraft,
    upperBase: inner.position.y + c * k,
    upperLength: (top - c) * k,
    logo: { group: core, y: 30, radius: rc },
    height: inner.position.y + top * k,
  };
}
