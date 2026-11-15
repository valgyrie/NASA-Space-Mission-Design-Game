import * as THREE from 'three';
import { bellProfile, latheGeometry } from './rocketLathe';
import { SC, dressSpacecraftMaterials } from './spacecraftMaterials';

/**
 * The crewed hardware of the Moon sequences, in metres, built in code at real sizes (shapes from the NASA pages
 * listed in docs/art/assets-moon.md): Apollo's Lunar Module (Eagle), Command and Service Module (Columbia) and the
 * S-IVB stack at "Off to the Moon"; Artemis' Orion with its European Service Module, the ICPS, a neutral crewed
 * lander (never a real company's), astronauts in white suits, a laser retroreflector and small CubeSats.
 * No logos or flags. Materials are shared (module level); free a model with `disposeCraft` (geometry only).
 */

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);

const M = {
  /** Thermal blankets of the LM descent stage: gold-coloured Kapton, crinkled. */
  gold: SC.goldFoil,
  /** Black Kapton / black-painted panels on the LM. */
  black: std({ color: 0x141416, roughness: 0.55, metalness: 0.3 }),
  /** The LM ascent stage's grey-beige anodised skin. */
  ascent: std({ color: 0xa9a69c, roughness: 0.45, metalness: 0.45 }),
  ascentDark: std({ color: 0x55565a, roughness: 0.5, metalness: 0.4 }),
  window: std({ color: 0x0b0f14, roughness: 0.08, metalness: 0.9 }),
  /** Polished aluminised Mylar strips on the Command Module: almost a mirror. */
  mirror: std({ color: 0xe8ebee, roughness: 0.12, metalness: 1 }),
  /** White paint and white thermal coatings (Service Module, S-IVB, Orion, ICPS). */
  white: std({ color: 0xe9e8e3, roughness: 0.55, metalness: 0.05 }),
  whiteMetal: std({ color: 0xd6d8da, roughness: 0.35, metalness: 0.6 }),
  grey: std({ color: 0x6e7176, roughness: 0.5, metalness: 0.6 }),
  dark: std({ color: 0x232427, roughness: 0.6, metalness: 0.4 }),
  /** Heat shields: Avcoat, dark brown-grey. */
  heatShield: std({ color: 0x3b3430, roughness: 0.9, metalness: 0 }),
  bellOut: SC.bell,
  bellIn: SC.throat,
  solar: SC.solar,
  panelBack: SC.panelBack,
  silver: SC.silverFoil,
  /** Spacesuit fabric: white Beta cloth, matt. */
  suit: std({ color: 0xeeece6, roughness: 0.85, metalness: 0 }),
  /** The gold sun visor. */
  visor: std({ color: 0xd9a441, roughness: 0.08, metalness: 1 }),
  boot: std({ color: 0x9a9890, roughness: 0.9, metalness: 0 }),
};

/** Every model's Meshes cast and receive shadows. */
function shadows(g: THREE.Object3D): void {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true;
  });
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

function lathe(profile: [number, number][], material: THREE.Material, segments = 48): THREE.Mesh {
  return new THREE.Mesh(latheGeometry(profile, segments), material);
}

/** A closed cylinder (or frustum) along y from y0 to y1. */
function tube(r0: number, r1: number, y0: number, y1: number, material: THREE.Material, segments = 48): THREE.Mesh {
  return lathe([[0, y0], [r0, y0], [r1, y1], [0, y1]], material, segments);
}

/** An engine bell, throat at y, opening downwards. */
function bell(throat: number, exit: number, length: number, y: number, outer: THREE.Material = M.bellOut): THREE.Group {
  const g = new THREE.Group();
  g.add(lathe(bellProfile(throat, exit, length, Math.max(0.006, exit * 0.03)), outer, 40));
  g.add(lathe(bellProfile(throat * 0.97, exit * 0.985, length * 0.995, 0.001).slice(1, 12), M.bellIn, 40));
  g.position.y = y;
  return g;
}

/** A strut between two points. */
function strut(a: THREE.Vector3, b: THREE.Vector3, r: number, material: THREE.Material): THREE.Mesh {
  const d = b.clone().sub(a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), material);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

/** An RCS thruster quad: a small box with four little nozzles. */
function rcsQuad(material: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.35, 0.55, 0.3), material));
  for (const [dx, dy] of [[0, 0.42], [0, -0.42], [0.3, 0], [-0.3, 0]] as const) {
    const n = mesh(new THREE.CylinderGeometry(0.035, 0.07, 0.18, 10), M.dark, dx, dy, 0);
    if (dx) n.rotation.z = dx > 0 ? -Math.PI / 2 : Math.PI / 2;
    else if (dy < 0) n.rotation.z = Math.PI;
    g.add(n);
  }
  return g;
}

/** A thin vacuum flame: almost invisible exhaust, a soft glow at the nozzle (ShaderMaterial, additive). */
export function vacuumFlame(radius: number, length: number, colour: THREE.ColorRepresentation, strength = 1): THREE.Mesh {
  const g = new THREE.CylinderGeometry(radius * 2.2, radius * 0.95, length, 24, 1, true);
  g.translate(0, -length / 2, 0);
  const material = new THREE.ShaderMaterial({
    uniforms: { colour: { value: new THREE.Color(colour) }, strength: { value: strength }, length: { value: length } },
    vertexShader:
      'varying float vAlong; varying vec3 vN; varying vec3 vV; uniform float length;' +
      'void main(){ vAlong = -position.y / length; vec4 mv = modelViewMatrix * vec4(position,1.0);' +
      ' vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader:
      'varying float vAlong; varying vec3 vN; varying vec3 vV; uniform vec3 colour; uniform float strength;' +
      'void main(){ float edge = pow(abs(dot(vN, vV)), 1.5); float a = exp(-vAlong * 3.2) * edge * strength;' +
      ' gl_FragColor = vec4(colour * a, 1.0); }',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(g, material);
  m.name = 'flame';
  m.renderOrder = 5;
  return m;
}

// ---- Apollo ----

/** The Lunar Module's parts that move: legs compress at touchdown, the flame shows while the engine fires. */
export interface LunarModule {
  root: THREE.Group;
  /** The ascent stage (separate, so it could lift off). */
  ascent: THREE.Group;
  /** Four legs; their y-scale shortens a little as the struts stroke at touchdown. */
  legs: THREE.Group;
  flame: THREE.Mesh;
}

/**
 * Apollo's Lunar Module, standing on its footpads at y = 0, its forward face (with the ladder) towards +z.
 * Real sizes: 7.0 m tall with the legs out, 9.4 m across the footpads, descent stage about 4.2 m wide.
 */
export function buildLunarModule(): LunarModule {
  dressSpacecraftMaterials();
  const root = new THREE.Group();
  root.name = 'lunar-module';

  // Descent stage: an octagonal box in gold and black blankets, its engine bell underneath.
  const descent = new THREE.Group();
  const body = new THREE.CylinderGeometry(2.25, 2.25, 1.65, 8);
  body.rotateY(Math.PI / 8);
  descent.add(mesh(body, M.gold, 0, 2.0, 0));
  // Black panels on the four long faces (the quadrants between the legs).
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const p = mesh(new THREE.BoxGeometry(1.25, 1.2, 0.04), M.black, Math.sin(a) * 2.09, 2.05, Math.cos(a) * 2.09);
    p.rotation.y = a;
    descent.add(p);
  }
  descent.add(mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.12, 8).rotateY(Math.PI / 8), M.black, 0, 1.12, 0));
  descent.add(bell(0.35, 0.78, 1.15, 1.2, M.dark));
  // Porch and ladder on the forward leg.
  descent.add(mesh(new THREE.BoxGeometry(1.0, 0.06, 0.8), M.gold, 0, 2.86, 2.3));
  root.add(descent);

  // Legs: a primary strut down to the footpad and two secondary struts back to the body, on ±x and ±z.
  const legs = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const leg = new THREE.Group();
    const top = new THREE.Vector3(0, 2.6, 2.05);
    const foot = new THREE.Vector3(0, 0.2, 4.55);
    leg.add(strut(top, foot, 0.09, M.gold));
    leg.add(strut(new THREE.Vector3(0.95, 1.3, 1.95), foot.clone().setY(0.55), 0.045, M.silver));
    leg.add(strut(new THREE.Vector3(-0.95, 1.3, 1.95), foot.clone().setY(0.55), 0.045, M.silver));
    leg.add(mesh(new THREE.CylinderGeometry(0.47, 0.4, 0.16, 16), M.silver, foot.x, 0.08, foot.z));
    if (i === 0) {
      // The ladder on the forward strut.
      for (let k = 0; k < 9; k++) {
        const t = 0.12 + k * 0.09;
        const at = top.clone().lerp(foot, t);
        leg.add(mesh(new THREE.BoxGeometry(0.55, 0.035, 0.035), M.silver, at.x, at.y, at.z + 0.08));
      }
    }
    leg.rotation.y = a;
    legs.add(leg);
  }
  root.add(legs);

  // Ascent stage: the angular crew cabin, dark windows, the docking tunnel on top, RCS quads at the corners.
  const ascent = new THREE.Group();
  ascent.position.y = 2.85;
  const cabin = new THREE.CylinderGeometry(1.2, 1.2, 2.3, 12, 1, false);
  cabin.rotateZ(Math.PI / 2);
  ascent.add(mesh(cabin, M.ascent, 0, 1.55, 0.35));
  // Front face: two flat facets with triangular windows.
  const face = new THREE.BoxGeometry(2.3, 1.7, 0.6);
  ascent.add(mesh(face, M.ascent, 0, 1.45, 1.25));
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.32, 3), M.window);
    w.position.set(sx * 0.6, 1.95, 1.56);
    w.rotation.z = sx > 0 ? Math.PI / 6 : -Math.PI / 6 + Math.PI;
    ascent.add(w);
  }
  // The forward hatch, square, low on the front.
  ascent.add(mesh(new THREE.BoxGeometry(0.85, 0.85, 0.05), M.ascentDark, 0, 0.9, 1.56));
  // Aft equipment bay and side tank bulges.
  ascent.add(mesh(new THREE.BoxGeometry(2.6, 1.6, 1.5), M.ascentDark, 0, 1.25, -1.15));
  for (const sx of [-1, 1]) {
    const tank = new THREE.CylinderGeometry(0.55, 0.55, 1.4, 16);
    tank.rotateX(Math.PI / 2);
    ascent.add(mesh(tank, M.ascent, sx * 1.55, 0.95, -0.25));
  }
  ascent.add(mesh(new THREE.BoxGeometry(3.0, 0.3, 3.2), M.black, 0, 0.15, 0));
  // Docking tunnel and drogue on top, rendezvous radar dish and the steerable antenna.
  ascent.add(tube(0.42, 0.42, 2.6, 3.5, M.ascent, 24));
  ascent.add(tube(0.5, 0.5, 3.5, 3.62, M.ascentDark, 24));
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, 0, 0.9), M.silver);
  dish.position.set(0.3, 2.95, 1.0);
  dish.rotation.x = -1.0;
  ascent.add(dish);
  const sband = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 8, 0, Math.PI * 2, 0, 0.9), M.silver);
  sband.position.set(-1.25, 2.85, -0.6);
  sband.rotation.set(-0.6, 0, 0.9);
  ascent.add(sband, strut(new THREE.Vector3(-0.9, 2.5, -0.5), new THREE.Vector3(-1.2, 2.85, -0.6), 0.03, M.silver));
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const q = rcsQuad(M.ascent);
    q.position.set(Math.sin(a) * 2.0, 2.0, Math.cos(a) * 1.9);
    q.rotation.y = a;
    ascent.add(q);
    ascent.add(strut(new THREE.Vector3(Math.sin(a) * 1.2, 2.0, Math.cos(a) * 1.1), q.position, 0.04, M.ascent));
  }
  root.add(ascent);

  const flame = vacuumFlame(0.7, 5, 0xffc58a, 0.3);
  flame.position.y = 0.05;
  flame.visible = false;
  descent.add(flame);
  shadows(root);
  flame.castShadow = false;
  return { root, ascent, legs, flame };
}

/**
 * Apollo's Command and Service Module, the heat shield end at y = 0 of the Command Module and the nose (docking
 * probe) up: Service Module below (its engine bell pointing down). About 11 m long, 3.9 m wide.
 * Returns the group and the main-engine flame.
 */
export function buildCSM(): { root: THREE.Group; flame: THREE.Mesh } {
  dressSpacecraftMaterials();
  const root = new THREE.Group();
  root.name = 'csm';
  // Command Module: a 3.9 m cone, 3.2 m tall, with its polished strips and a dark heat shield.
  root.add(lathe([[0, -0.15], [1.6, -0.1], [1.95, 0.05], [1.95, 0.12], [0.42, 3.1], [0.3, 3.25], [0, 3.25]], M.mirror));
  root.add(lathe([[0, -0.32], [1.9, -0.18], [1.94, -0.04], [0, -0.2]], M.heatShield));
  const win = mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05), M.window, 0, 1.6, 1.15);
  win.rotation.x = -0.55;
  root.add(win);
  // Docking probe.
  root.add(tube(0.05, 0.03, 3.2, 3.85, M.silver, 10));
  // Service Module: white cylinder with radiator panels, RCS quads, its engine bell.
  root.add(tube(1.95, 1.95, -4.15, -0.32, M.white));
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const r = mesh(new THREE.BoxGeometry(0.9, 2.3, 0.03), M.whiteMetal, Math.sin(a) * 1.96, -2.4, Math.cos(a) * 1.96);
    r.rotation.y = a;
    root.add(r);
  }
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const q = rcsQuad(M.white);
    q.position.set(Math.sin(a) * 2.1, -1.0, Math.cos(a) * 2.1);
    q.rotation.y = a;
    root.add(q);
  }
  root.add(tube(1.9, 1.3, -4.4, -4.15, M.dark));
  root.add(bell(0.4, 1.25, 2.8, -4.3));
  // High-gain antenna: four small dishes on a boom at the aft end.
  const boom = strut(new THREE.Vector3(0, -4.0, 1.9), new THREE.Vector3(0, -4.8, 3.0), 0.05, M.silver);
  root.add(boom);
  for (const [dx, dy] of [[-0.3, 0.3], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3]] as const) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 6, 0, Math.PI * 2, 0, 0.8), M.silver);
    d.position.set(dx, -4.8 + dy, 3.1);
    d.rotation.x = Math.PI / 2;
    root.add(d);
  }
  const flame = vacuumFlame(1.2, 14, 0xffd9a8, 0.35);
  flame.position.y = -7.1;
  flame.visible = false;
  root.add(flame);
  shadows(root);
  flame.castShadow = false;
  return { root, flame };
}

/**
 * Saturn V's third stage at "Off to the Moon": S-IVB (6.6 m wide, 17.8 m), Instrument Unit, the tapered adapter
 * that holds the Lunar Module inside, and the CSM on top. The J-2 engine's base at y = 0.
 */
export function buildTliStack(): { root: THREE.Group; flame: THREE.Mesh } {
  dressSpacecraftMaterials();
  const root = new THREE.Group();
  root.name = 's-ivb-stack';
  const r = 3.3;
  // Aft skirt, the tank (white), the Instrument Unit, then the adapter cone up to the Service Module.
  root.add(tube(r * 0.94, r, 3.2, 4.4, M.grey));
  root.add(lathe([[0, 4.3], [r, 4.4], [r, 20.2], [0, 20.3]], M.white, 64));
  root.add(tube(r, r, 20.2, 21.1, M.whiteMetal, 64));
  root.add(lathe([[0, 21.1], [r, 21.1], [1.96, 29.6], [0, 29.6]], M.white, 64));
  // Thin seams on the adapter's panels.
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    root.add(strut(new THREE.Vector3(Math.sin(a) * r * 1.002, 21.1, Math.cos(a) * r * 1.002), new THREE.Vector3(Math.sin(a) * 1.965, 29.6, Math.cos(a) * 1.965), 0.03, M.grey));
  }
  // The two auxiliary propulsion modules on the aft skirt (black and white).
  for (const s of [-1, 1]) {
    const apsGeo = new THREE.CylinderGeometry(0.55, 0.75, 2.2, 16, 1, false, 0, Math.PI);
    const aps = mesh(apsGeo, M.dark, s * (r - 0.1), 4.6, 0);
    aps.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(aps);
  }
  // Black band on the aft skirt, like the real stage.
  root.add(tube(r * 1.004, r * 1.004, 4.4, 5.6, M.black, 64));
  // The J-2 engine.
  root.add(bell(0.35, 1.0, 3.2, 3.35));
  const csm = buildCSM();
  csm.root.position.y = 29.6 + 4.4;
  root.add(csm.root);
  const flame = vacuumFlame(1.0, 12, 0xffe2b8, 0.3);
  flame.position.y = 0.2;
  flame.visible = false;
  root.add(flame);
  shadows(root);
  flame.castShadow = false;
  return { root, flame };
}

// ---- Artemis ----

/**
 * Orion: the crew module (5 m wide, white), the crew module adapter, and the European Service Module with its four
 * solar array wings in an X (about 19 m across) and the main engine. Heat shield at y = 0, nose (docking port) up.
 */
export function buildOrion(): { root: THREE.Group; flame: THREE.Mesh; wings: THREE.Group } {
  dressSpacecraftMaterials();
  const root = new THREE.Group();
  root.name = 'orion';
  root.add(lathe([[0, -0.2], [2.4, -0.05], [2.5, 0.1], [2.5, 0.2], [0.85, 3.0], [0.7, 3.1], [0, 3.1]], M.white, 64));
  root.add(lathe([[0, -0.45], [2.4, -0.25], [2.49, -0.05], [0, -0.25]], M.heatShield, 48));
  // Docking ring and windows.
  root.add(tube(0.75, 0.75, 3.1, 3.4, M.grey, 32));
  for (let i = 0; i < 4; i++) {
    const a = -0.7 + i * 0.47;
    const w = mesh(new THREE.BoxGeometry(0.32, 0.36, 0.04), M.window, Math.sin(a) * 1.75, 1.45, Math.cos(a) * 1.75);
    w.rotation.set(-0.55, a, 0, 'YXZ');
    root.add(w);
  }
  // Crew module adapter and the service module, silver and white, with radiator panels.
  root.add(tube(2.5, 2.05, -1.2, -0.25, M.silver, 48));
  root.add(tube(2.05, 2.05, -4.0, -1.2, M.whiteMetal, 48));
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    const p = mesh(new THREE.BoxGeometry(1.0, 2.4, 0.03), i % 2 ? M.white : M.silver, Math.sin(a) * 2.06, -2.6, Math.cos(a) * 2.06);
    p.rotation.y = a;
    root.add(p);
  }
  root.add(tube(2.05, 1.0, -4.4, -4.0, M.dark, 48));
  root.add(bell(0.2, 0.55, 1.4, -4.4));
  // Auxiliary thrusters round the aft.
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const t = bell(0.04, 0.09, 0.25, -4.05);
    t.position.x = Math.sin(a) * 1.6;
    t.position.z = Math.cos(a) * 1.6;
    root.add(t);
  }
  // Four wings in an X, each three panels on a short arm.
  const wings = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const wing = new THREE.Group();
    wing.add(strut(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0.9), 0.06, M.grey));
    for (let k = 0; k < 3; k++) {
      const z = 1.1 + k * 2.1 + 1.0;
      wing.add(mesh(new THREE.BoxGeometry(2.0, 0.03, 2.0), M.solar, 0, 0.012, z));
      wing.add(mesh(new THREE.BoxGeometry(2.04, 0.02, 2.04), M.panelBack, 0, -0.012, z));
    }
    wing.position.set(Math.sin(Math.PI / 4 + (i * Math.PI) / 2) * 2.05, -3.0, Math.cos(Math.PI / 4 + (i * Math.PI) / 2) * 2.05);
    wing.rotation.y = Math.PI / 4 + (i * Math.PI) / 2;
    // Turned so the cells face along +x of the wing (a little towards the Sun in each shot).
    wing.rotation.z = 0.85;
    wings.add(wing);
  }
  root.add(wings);
  const flame = vacuumFlame(0.5, 7, 0xbfd6ff, 0.6);
  flame.position.y = -5.8;
  flame.visible = false;
  root.add(flame);
  shadows(root);
  flame.castShadow = false;
  return { root, flame, wings };
}

/**
 * SLS's Interim Cryogenic Propulsion Stage with the Orion stage adapter on top (where CubeSats ride): 5 m wide,
 * about 14 m long with its RL10's big nozzle. Top (the adapter ring, which held Orion) at y = 0, engine down.
 */
export function buildICPS(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'icps';
  root.add(tube(2.55, 2.55, -0.8, 0, M.whiteMetal, 48));
  root.add(lathe([[0, -8.6], [2.2, -8.4], [2.55, -7.5], [2.55, -0.8], [0, -0.8]], M.white, 64));
  // Exposed oxygen tank below the hydrogen tank, struts, then the RL10 with its long nozzle.
  root.add(lathe([[0, -10.6], [1.3, -10.4], [1.6, -9.6], [1.4, -8.8], [0, -8.4]], M.whiteMetal, 32));
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    root.add(strut(new THREE.Vector3(Math.sin(a) * 2.3, -8.0, Math.cos(a) * 2.3), new THREE.Vector3(Math.sin(a) * 1.4, -10.2, Math.cos(a) * 1.4), 0.05, M.grey));
  }
  root.add(bell(0.15, 1.05, 3.6, -10.4));
  // CubeSat dispensers on the adapter ring: small boxes round the inside.
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const box = mesh(new THREE.BoxGeometry(0.35, 0.5, 0.3), M.grey, Math.sin(a) * 2.1, -0.4, Math.cos(a) * 2.1);
    box.rotation.y = a;
    root.add(box);
  }
  shadows(root);
  return root;
}

/**
 * A crewed lander, deliberately generic (never a real company's): a tall white tower on four splayed legs, the
 * crew cabin with windows high up, a band of solar cells, thrusters round the top. Feet at y = 0, about 15 m tall.
 * `flame` is the landing engines' glow.
 */
export function buildCrewLander(): { root: THREE.Group; legs: THREE.Group; flame: THREE.Mesh } {
  dressSpacecraftMaterials();
  const root = new THREE.Group();
  root.name = 'crew-lander';
  const r = 2.4;
  root.add(lathe([[0, 1.6], [r * 0.85, 1.6], [r, 2.2], [r, 11.5], [r * 0.75, 13.6], [0.8, 14.6], [0, 14.7]], M.white, 48));
  root.add(tube(r * 1.004, r * 1.004, 2.2, 4.6, M.gold, 48));
  root.add(tube(r * 1.005, r * 1.005, 6.0, 8.0, M.solar, 48));
  root.add(tube(r * 1.006, r * 1.006, 8.0, 8.1, M.grey, 48));
  root.add(tube(0.75, 0.75, 14.6, 15.1, M.grey, 24));
  for (let i = 0; i < 4; i++) {
    const a = 0.25 + i * 0.32;
    const w = mesh(new THREE.BoxGeometry(0.5, 0.65, 0.05), M.window, Math.sin(a) * (r + 0.02), 10.4, Math.cos(a) * (r + 0.02));
    w.rotation.y = a;
    root.add(w);
  }
  // An airlock hatch and a lift platform down the side.
  root.add(mesh(new THREE.BoxGeometry(1.1, 1.8, 0.1), M.grey, 0, 9.0, r + 0.02));
  root.add(mesh(new THREE.BoxGeometry(1.4, 0.08, 1.2), M.grey, 0, 0.6, r + 1.1));
  for (const sx of [-1, 1]) root.add(strut(new THREE.Vector3(sx * 0.6, 0.6, r + 0.1), new THREE.Vector3(sx * 0.6, 8.2, r + 0.1), 0.05, M.grey));
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const q = rcsQuad(M.white);
    q.position.set(Math.sin(a) * (r + 0.2), 12.6, Math.cos(a) * (r + 0.2));
    q.rotation.y = a;
    root.add(q);
  }
  const legs = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const leg = new THREE.Group();
    const top = new THREE.Vector3(0, 4.2, r - 0.1);
    const foot = new THREE.Vector3(0, 0.15, r + 3.2);
    leg.add(strut(top, foot, 0.14, M.grey));
    leg.add(strut(new THREE.Vector3(0, 1.8, r), foot.clone().setY(0.4), 0.08, M.grey));
    leg.add(mesh(new THREE.CylinderGeometry(0.7, 0.6, 0.18, 16), M.silver, foot.x, 0.09, foot.z));
    leg.rotation.y = a;
    legs.add(leg);
  }
  root.add(legs);
  for (const [x, z] of [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]] as const) {
    const b = bell(0.15, 0.4, 0.9, 1.65);
    b.position.x = x;
    b.position.z = z;
    root.add(b);
  }
  const flame = vacuumFlame(1.4, 7, 0xd5e4ff, 0.5);
  flame.position.y = 0.7;
  flame.visible = false;
  root.add(flame);
  shadows(root);
  flame.castShadow = false;
  return { root, legs, flame };
}

// ---- On the surface ----

/** An astronaut in a white suit with the backpack and gold visor, feet at y = 0, facing +z, about 1.85 m tall. */
export function buildAstronaut(): { root: THREE.Group; legs: [THREE.Group, THREE.Group]; arms: [THREE.Group, THREE.Group] } {
  const root = new THREE.Group();
  root.name = 'astronaut';
  const limb = (r: number, len: number, material: THREE.Material) => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CapsuleGeometry(r, len, 4, 10), material, 0, -len / 2 - r * 0.5, 0));
    return g;
  };
  const legs: [THREE.Group, THREE.Group] = [limb(0.1, 0.7, M.suit), limb(0.1, 0.7, M.suit)];
  legs.forEach((leg, i) => {
    leg.position.set(i ? 0.13 : -0.13, 0.95, 0);
    leg.add(mesh(new THREE.BoxGeometry(0.17, 0.12, 0.3), M.boot, 0, -0.9, 0.04));
    root.add(leg);
  });
  root.add(mesh(new THREE.CapsuleGeometry(0.22, 0.42, 4, 12), M.suit, 0, 1.28, 0));
  // Backpack (life support) and its control box on the chest.
  root.add(mesh(new THREE.BoxGeometry(0.5, 0.66, 0.26), M.suit, 0, 1.36, -0.3));
  root.add(mesh(new THREE.BoxGeometry(0.28, 0.14, 0.12), M.grey, 0, 1.3, 0.24));
  // Helmet: clear bubble over a gold visor.
  root.add(mesh(new THREE.SphereGeometry(0.17, 18, 12), M.suit, 0, 1.72, -0.02));
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.175, 18, 12, -1.1, 2.2, 0.6, 1.5), M.visor);
  visor.position.set(0, 1.72, 0);
  root.add(visor);
  const arms: [THREE.Group, THREE.Group] = [limb(0.075, 0.5, M.suit), limb(0.075, 0.5, M.suit)];
  arms.forEach((arm, i) => {
    arm.position.set(i ? 0.3 : -0.3, 1.55, 0.02);
    arm.rotation.z = i ? 0.15 : -0.15;
    root.add(arm);
  });
  shadows(root);
  return { root, legs, arms };
}

/** Apollo 11's Laser Ranging Retroreflector: a 46 cm panel of 100 corner cubes, tilted on a small stand. */
export function buildRetroreflector(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'retroreflector';
  g.add(mesh(new THREE.BoxGeometry(0.6, 0.06, 0.6), M.silver, 0, 0.04, 0));
  const panel = new THREE.Group();
  panel.position.set(0, 0.3, 0);
  panel.rotation.x = -0.5;
  panel.add(mesh(new THREE.BoxGeometry(0.46, 0.05, 0.46), M.silver));
  const cube = new THREE.CylinderGeometry(0.018, 0.018, 0.01, 6);
  const cubes = new THREE.InstancedMesh(cube, M.window, 100);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 100; i++) cubes.setMatrixAt(i, m.makeTranslation(((i % 10) - 4.5) * 0.042, 0.03, (Math.floor(i / 10) - 4.5) * 0.042));
  panel.add(cubes);
  g.add(panel);
  g.add(strut(new THREE.Vector3(0, 0.07, -0.2), new THREE.Vector3(0, 0.33, -0.05), 0.02, M.silver));
  shadows(g);
  return g;
}

/** A 12U CubeSat (about 23 x 23 x 34 cm) with two small fold-out panels; for the other CubeSats on Artemis II. */
export function buildCubeSat(): THREE.Group {
  dressSpacecraftMaterials();
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.23, 0.34, 0.23), M.silver));
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.34, 0.01, 0.22), M.solar, s * 0.29, 0.1, 0));
  shadows(g);
  return g;
}

/** Free the geometry of anything built here (materials are shared and kept). */
export function disposeCraft(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh) {
      o.geometry.dispose();
      if (o.material instanceof THREE.ShaderMaterial) o.material.dispose();
    }
  });
}
