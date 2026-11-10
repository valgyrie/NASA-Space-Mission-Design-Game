import * as THREE from 'three';
import { type ShowMoment, stageTimes } from '../game/ascent';
import type { LaunchVehicleId } from '../game/launchVehicles';
import type { Design } from '../game/spacecraft';
import { buildEarth } from './earthMesh';
import { JUNO, type RocketModel, buildRocket, disposeRocket } from './rocketMesh';
import { makeStars } from './spacecraftView';

/**
 * The Launch in 3D, in three shots: the pad and the climb (metres, chase camera), the upper stages firing
 * at the top of the climb with Earth below, then the orbit seen from far out while the Mission's days pass.
 * It only draws what the show says: the outcome is already decided by the flight.
 */

export type Shot = 'pad' | 'space' | 'orbit';

const EARTH_KM = 6_371;
/** Where the camera cuts from the pad to space: part-way through the coast. */
const CUT_TO_SPACE = 0.3;
/** Share of the orbit segment still shown close up, before the cut to the whole orbit. */
const CUT_TO_ORBIT = 0.4;
/** Screen seconds for one lap in the orbit shot (Explorer 1 really took 115 minutes). */
const LAP_SECONDS = 6;
/** Turns per screen second of the spinning tub (the real one spun at hundreds of rpm). */
const SPIN_TURNS = 1.6;
/** Cape Canaveral, roughly: what Earth shows below the upper stages. Degrees. */
const BELOW = { lat: 28.5, lon: -80.6 };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---- The climb: a made-up path that looks right; no numbers from it reach the screen. ----

interface PathPoint {
  x: number;
  y: number;
  /** Lean from straight up, in radians, towards the east (+x). */
  lean: number;
  speed: number;
}

const PATH_STEP = 0.5;

function climbPath(burnEnd: number, coastEnd: number): PathPoint[] {
  const points: PathPoint[] = [];
  let x = 0;
  let y = 0;
  for (let t = 0; t <= coastEnd + 30; t += PATH_STEP) {
    const speed = t <= burnEnd ? 2.4 * t : Math.max(40, 2.4 * burnEnd - 1.5 * (t - burnEnd));
    const lean = smooth(12, burnEnd, t) * 0.9 + smooth(burnEnd, coastEnd, t) * 0.55;
    points.push({ x, y, lean, speed });
    x += speed * Math.sin(lean) * PATH_STEP;
    y += speed * Math.cos(lean) * PATH_STEP;
  }
  return points;
}

function pathAt(path: PathPoint[], t: number): PathPoint {
  if (t <= 0) return path[0]!;
  const i = Math.min(path.length - 2, Math.floor(t / PATH_STEP));
  const f = Math.min(1, t / PATH_STEP - i);
  const a = path[i]!;
  const b = path[i + 1]!;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, lean: a.lean + (b.lean - a.lean) * f, speed: a.speed + (b.speed - a.speed) * f };
}

// ---- Exhaust ----

const FLAME_OUTER = new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
const FLAME_INNER = new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });

/** A flame pointing down from y = 0, `length` long. Scale it to flicker. */
function flame(radius: number, length: number): THREE.Group {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 10, 1, true), FLAME_OUTER);
  outer.rotation.x = Math.PI;
  outer.position.y = -length / 2;
  const inner = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.55, length * 0.55, 8, 1, true), FLAME_INNER);
  inner.rotation.x = Math.PI;
  inner.position.y = -length * 0.275;
  g.add(outer, inner);
  g.visible = false;
  return g;
}

interface Puff {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  age: number;
  life: number;
  from: number;
  to: number;
}

const PUFFS = 220;

/** Smoke from the first stage: a pool of soft grey blobs that grow and fade where they were left. */
class Smoke {
  readonly group = new THREE.Group();
  private readonly puffs: Puff[] = [];
  private next = 0;

  constructor() {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < PUFFS; i++) {
      const material = new THREE.MeshLambertMaterial({ color: 0xece8e1, transparent: true, opacity: 0, depthWrite: false, flatShading: true });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.group.add(mesh);
      this.puffs.push({ mesh, velocity: new THREE.Vector3(), age: 0, life: 1, from: 1, to: 1 });
    }
  }

  emit(at: THREE.Vector3, velocity: THREE.Vector3, life: number, from: number, to: number): void {
    const p = this.puffs[this.next]!;
    this.next = (this.next + 1) % PUFFS;
    p.mesh.position.copy(at);
    p.mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    p.velocity.copy(velocity);
    p.age = 0;
    p.life = life;
    p.from = from;
    p.to = to;
    p.mesh.visible = true;
  }

  update(dt: number): void {
    for (const p of this.puffs) {
      if (!p.mesh.visible) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.mesh.visible = false;
        continue;
      }
      const k = p.age / p.life;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.multiplyScalar(Math.max(0, 1 - dt * 0.8));
      p.mesh.scale.setScalar(p.from + (p.to - p.from) * Math.sqrt(k));
      (p.mesh.material as THREE.MeshLambertMaterial).opacity = 0.8 * (1 - k) * Math.min(1, k * 8);
    }
  }

  clear(): void {
    for (const p of this.puffs) p.mesh.visible = false;
  }
}

// ---- The pad ----

function buildGround(): THREE.Group {
  const g = new THREE.Group();
  const radius = 400_000;
  const coast = 350;
  const half = (from: number, colour: number, x: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -radius);
    shape.absarc(0, 0, radius, from, from + Math.PI, false);
    shape.lineTo(0, -radius);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 48), new THREE.MeshLambertMaterial({ color: colour }));
    m.rotation.x = -Math.PI / 2;
    m.position.x = x;
    return m;
  };
  // Land to the west, a beach, the Atlantic to the east: one big round floor, so the far edge reads as a
  // horizon. The pieces don't overlap, so they never flicker.
  const land = half(Math.PI / 2, 0x7d8f5a, coast);
  const sea = half(-Math.PI / 2, 0x235f96, coast + 60);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(60, radius * 2), new THREE.MeshLambertMaterial({ color: 0xe2d3a4 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.x = coast + 30;
  g.add(land, beach, sea);

  const concrete = new THREE.MeshLambertMaterial({ color: 0xb3ada2, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const sand = new THREE.MeshLambertMaterial({ color: 0xcdbb8a, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const apron = new THREE.Mesh(new THREE.CircleGeometry(70, 24), sand);
  apron.rotation.x = -Math.PI / 2;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(26, 0.6, 26), concrete);
  slab.position.y = 0.3;
  const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 400), concrete);
  road.rotation.x = -Math.PI / 2;
  road.position.set(-30, 0.02, -200);
  g.add(apron, slab, road);

  // Launch stand under the rocket and a service mast beside it.
  const steel = new THREE.MeshStandardMaterial({ color: 0xc0472f, roughness: 0.7, flatShading: true });
  const grey = new THREE.MeshStandardMaterial({ color: 0x7c838c, roughness: 0.6, flatShading: true });
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 1.2, 12, 1, true), grey);
  stand.position.y = 1.2;
  g.add(stand);
  const mast = new THREE.Group();
  const beam = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), steel);
    m.position.set(x, y, z);
    mast.add(m);
  };
  for (const [x, z] of [
    [0, 0],
    [2.4, 0],
    [0, 2.4],
    [2.4, 2.4],
  ] as const) {
    beam(0.25, 24, 0.25, x, 12.6, z);
  }
  for (let y = 3; y <= 24; y += 3) {
    beam(2.6, 0.18, 0.18, 1.2, y, 0);
    beam(2.6, 0.18, 0.18, 1.2, y, 2.4);
    beam(0.18, 0.18, 2.6, 0, y, 1.2);
    beam(0.18, 0.18, 2.6, 2.4, y, 1.2);
  }
  for (const y of [9, 16, 20]) beam(3.2, 0.2, 0.3, 4.2, y, 1.2);
  mast.position.set(-7.6, 0, -1.2);
  g.add(mast);

  // The blockhouse, a low dome back from the pad.
  const dome = new THREE.Mesh(new THREE.SphereGeometry(9, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), grey);
  dome.position.set(-110, 0, 60);
  g.add(dome);
  return g;
}

// ---- The view ----

export class LaunchView {
  readonly canvas = document.createElement('canvas');
  private readonly renderer: THREE.WebGLRenderer;

  private readonly pad = new THREE.Scene();
  private readonly padCamera = new THREE.PerspectiveCamera(45, 1, 0.5, 300_000);
  private readonly padStars = makeStars(140);
  private readonly smoke = new Smoke();
  private readonly fog = new THREE.Fog(0x9cc8ee, 3_000, 60_000);
  private readonly sky = new THREE.Color();

  private readonly space = new THREE.Scene();
  private readonly spaceCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 20_000);
  private readonly spaceEarth = buildEarth(3_000);
  private readonly spaceEarthPivot = new THREE.Group();

  private readonly orbit = new THREE.Scene();
  private readonly orbitCamera = new THREE.PerspectiveCamera(40, 1, 0.5, 2_000);
  private readonly orbitEarth = buildEarth(30);
  private readonly orbitPlane = new THREE.Group();
  private readonly craft = new THREE.Group();
  private readonly craftColour = new THREE.Color();
  private orbitShape = { a: 1, b: 1, e: 0 };

  private climbing: RocketModel | null = null;
  private upper: RocketModel | null = null;
  private flames: THREE.Group[][] = [];
  private upperFlames: THREE.Group[][] = [];
  private path: PathPoint[] = [];
  private stages: { start: number; end: number }[] = [];
  private spin = 0;
  private orbitClock = 0;
  private lastT = -Infinity;

  constructor() {
    // Throws where WebGL is missing; the caller then uses the simple view.
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    // Pad: Florida sky, low sun from the east.
    this.pad.fog = this.fog;
    this.pad.background = this.sky;
    this.pad.add(buildGround(), this.smoke.group);
    this.pad.add(new THREE.HemisphereLight(0xdcecff, 0x5b6a45, 1.4));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.2);
    sun.position.set(40, 60, 30);
    this.pad.add(sun);
    // Stars draw first and everything else over them; they brighten as the sky darkens.
    const starMaterial = this.padStars.material as THREE.PointsMaterial;
    starMaterial.fog = false;
    starMaterial.blending = THREE.AdditiveBlending;
    starMaterial.depthTest = false;
    starMaterial.depthWrite = false;
    this.padStars.renderOrder = -1;
    this.pad.add(this.padStars);

    // Space: Earth's curve under the upper stages, Cape Canaveral below.
    this.space.background = new THREE.Color(0x02050c);
    this.space.add(makeStars(9_000));
    const tilt = new THREE.Group();
    tilt.rotation.x = -THREE.MathUtils.degToRad(90 - BELOW.lat);
    tilt.add(this.spaceEarth.earth);
    this.spaceEarth.spin(THREE.MathUtils.degToRad(-BELOW.lon));
    this.spaceEarthPivot.add(tilt);
    this.spaceEarthPivot.position.y = -3_150;
    this.space.add(this.spaceEarthPivot);
    this.space.add(new THREE.HemisphereLight(0xcfe3ff, 0x1a2230, 1.0));
    const spaceSun = new THREE.DirectionalLight(0xfff2dc, 2.6);
    spaceSun.position.set(-3, 5, 4);
    this.space.add(spaceSun);

    // Orbit: the whole Earth and the orbit drawn to scale.
    this.orbit.background = new THREE.Color(0x02050c);
    this.orbit.add(makeStars(900), this.orbitEarth.earth, this.orbitPlane);
    this.orbitEarth.spin(THREE.MathUtils.degToRad(80));
    this.orbitPlane.rotation.set(0.5, 0, 0.25);
    this.orbit.add(new THREE.HemisphereLight(0xcfe3ff, 0x0a0f18, 0.35));
    const orbitSun = new THREE.DirectionalLight(0xfff2dc, 3);
    orbitSun.position.set(60, 20, 50);
    this.orbit.add(orbitSun);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshBasicMaterial({ color: this.craftColour }));
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture(), color: this.craftColour, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
    );
    glow.scale.setScalar(5);
    this.craft.add(dot, glow);
    this.orbitPlane.add(this.craft);
  }

  /** Get ready for one Launch: build the rocket with this design on top and draw the orbit. */
  load(design: Design, vehicle: LaunchVehicleId, orbitKm: { low: number; high: number }): void {
    this.unload();
    this.stages = stageTimes(vehicle);
    const burnEnd = this.stages[0]!.end;
    const coastEnd = this.stages[1]?.start ?? burnEnd;
    this.path = climbPath(burnEnd, coastEnd);

    this.climbing = buildRocket(design, vehicle);
    this.climbing.root.position.y = 1.8;
    this.flames = this.climbing.stages.map((s, i) => s.nozzles.map((n) => this.addFlame(s.group, n, s.nozzleRadius, i === 0 ? 9 : 1.2)));
    this.pad.add(this.climbing.root);

    // The upper stages again for the space shot, lying along +x (flying east) without the first stage.
    // A taller upper rocket is shown smaller, so it fits the shot like Juno I's.
    this.upper = buildRocket(design, vehicle);
    this.upper.stages[0]!.group.visible = false;
    const fit = Math.min(1, (JUNO.top - JUNO.coneTop) / this.upper.upperLength);
    this.upper.root.scale.setScalar(fit);
    this.upper.root.rotation.z = -Math.PI / 2;
    this.upper.root.position.x = -this.upper.upperBase * fit;
    this.upperFlames = this.upper.stages.map((s) => s.nozzles.map((n) => this.addFlame(s.group, n, s.nozzleRadius * 1.4, 1.6)));
    this.space.add(this.upper.root);

    // The orbit: Earth's centre at one focus, drawn to scale.
    const rp = (30 * (EARTH_KM + orbitKm.low)) / EARTH_KM;
    const ra = (30 * (EARTH_KM + orbitKm.high)) / EARTH_KM;
    const a = (rp + ra) / 2;
    const e = (ra - rp) / (ra + rp);
    const b = a * Math.sqrt(1 - e * e);
    this.orbitShape = { a, b, e };
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 180; i++) {
      const E = (i / 180) * Math.PI * 2;
      points.push(new THREE.Vector3(a * (Math.cos(E) - e), 0, b * Math.sin(E)));
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0x9fc2ec, transparent: true, opacity: 0.55 }),
    );
    line.name = 'orbit-line';
    this.orbitPlane.add(line);

    this.smoke.clear();
    this.spin = 0;
    this.orbitClock = 0;
    this.lastT = -Infinity;
  }

  /** Free what `load` built. */
  unload(): void {
    for (const model of [this.climbing, this.upper]) {
      if (!model) continue;
      model.root.removeFromParent();
      disposeRocket(model.root);
    }
    this.climbing = null;
    this.upper = null;
    const line = this.orbitPlane.getObjectByName('orbit-line');
    if (line instanceof THREE.Line) {
      line.removeFromParent();
      line.geometry.dispose();
    }
  }

  /** Draw one frame. `dt` is screen seconds since the last frame, already sped up. Returns the shot drawn. */
  render(m: ShowMoment, dt: number, powered: boolean): Shot {
    this.fit();
    const phase = m.segment.phase;
    this.spin += dt * SPIN_TURNS * Math.PI * 2;
    let shot: Shot;
    if (phase === 'mission' || phase === 'end' || (phase === 'orbit' && m.fraction >= CUT_TO_ORBIT)) shot = 'orbit';
    else if (
      phase === 'countdown' ||
      ((phase === 'burn' || phase === 'lost') && m.segment.stage === 1) ||
      (phase === 'coast' && m.fraction < CUT_TO_SPACE)
    )
      shot = 'pad';
    else shot = 'space';

    // A failed stage stops pushing at once; the rocket tips over and falls.
    const lost = phase === 'lost';
    if (shot === 'pad') this.drawPad(lost ? m.segment.from : m.value, dt, lost ? m.fraction : 0);
    else if (shot === 'space') this.drawSpace(phase === 'orbit' || lost ? m.segment.from + m.fraction * m.segment.playS * 2 : m.value, lost ? m.fraction : 0, dt, lost && m.segment.stage !== undefined);
    else this.drawOrbit(dt, powered);
    return shot;
  }

  private addFlame(parent: THREE.Object3D, at: THREE.Vector3, radius: number, length: number): THREE.Group {
    const f = flame(radius, length);
    f.position.copy(at);
    parent.add(f);
    return f;
  }

  private burning(stage: number, t: number): boolean {
    const s = this.stages[stage];
    return !!s && t >= s.start && t < s.end;
  }

  /** Metres a spent stage has fallen back, `t` flight seconds after it finished. */
  private separation(stage: number, t: number): number {
    const s = this.stages[stage];
    if (!s || stage === this.stages.length - 1) return 0; // The last stage stays on, as Explorer 1's did.
    const since = t - s.end - 0.4;
    return since > 0 ? 0.6 * since + 0.12 * since * since : 0;
  }

  private flicker(flames: THREE.Group[], on: boolean, stretch = 1): void {
    for (const f of flames) {
      f.visible = on;
      // Thinner air lets the plume grow longer; it widens a little.
      if (on) f.scale.set(1 + (stretch - 1) * 0.25, (0.85 + Math.random() * 0.3) * stretch, 1 + (stretch - 1) * 0.25);
    }
  }

  /** The climb from the pad. `falling` (0–1) tips a rocket whose first stage failed over and drops it. */
  private drawPad(t: number, dt: number, falling = 0): void {
    const rocket = this.climbing;
    if (!rocket) return;
    const climb = pathAt(this.path, t);
    // A failed first stage: the rocket tips over and drops; the camera keeps it in view.
    const p = { ...climb, x: climb.x + falling * climb.y * 0.3, y: climb.y * (1 - 0.5 * falling * falling), lean: climb.lean + falling * 1.4 };
    const alt = p.y;
    rocket.root.position.set(p.x, 1.8 + p.y, 0);
    rocket.root.rotation.z = -p.lean;
    rocket.spinner.rotation.y = this.spin;
    const burn = this.burning(0, t) && falling === 0;
    this.flicker(this.flames[0]!, burn, 1 + Math.min(alt / 20_000, 0.8));

    // The first stage drops away after it burns out.
    const first = rocket.stages[0]!.group;
    const back = this.separation(0, t);
    first.position.y = -back;
    first.rotation.x = back * 0.002;
    first.visible = back < 2_000;

    // Smoke along the path while the first stage burns, spread over the pad at liftoff.
    if (burn && t > -0.5 && alt < 12_000) {
      const t0 = this.lastT > -Infinity && this.lastT < t ? Math.max(0, this.lastT) : t;
      const from = pathAt(this.path, t0);
      const steps = Math.min(6, Math.max(1, Math.ceil(Math.hypot(p.x - from.x, p.y - from.y) / (4 + p.speed * 0.04))));
      const down = new THREE.Vector3(-Math.sin(p.lean), -Math.cos(p.lean), 0);
      for (let i = 1; i <= steps; i++) {
        const q = pathAt(this.path, t0 + ((t - t0) * i) / steps);
        const at = new THREE.Vector3(q.x, 1.8 + q.y, 0).addScaledVector(down, 2);
        if (alt < 40) {
          const a = Math.random() * Math.PI * 2;
          const v = new THREE.Vector3(Math.cos(a) * 14, 1 + Math.random() * 3, Math.sin(a) * 14);
          this.smoke.emit(at.clone().setY(1.5), v, 6, 2, 9 + Math.random() * 4);
        }
        const v = down.clone().multiplyScalar(6).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(3));
        const size = Math.min(6, 1.2 + q.speed * 0.02);
        this.smoke.emit(at, v, 5, size, size * 3);
      }
    }
    this.smoke.update(dt);
    this.lastT = t;

    // The sky darkens as it climbs; haze stays on the ground.
    const high = smooth(1_500, 32_000, alt);
    this.sky.setHex(0x8cc4f0).lerp(new THREE.Color(0x03060f), high);
    this.fog.color.setHex(0x9cc8ee).lerp(new THREE.Color(0x4f7fb4), high);
    this.fog.near = 3_000 + alt;
    this.fog.far = Math.min(90_000, 60_000 + alt * 1.5);
    const stars = smooth(12_000, 40_000, alt);
    this.padStars.visible = stars > 0.05;
    (this.padStars.material as THREE.PointsMaterial).color.setHex(0xcfd9ff).multiplyScalar(stars);

    // Camera: on the ground watching it go, then chasing it.
    // Watch the middle of the rocket, then the part still flying once the first stage has gone.
    const along = 11 + 7.5 * smooth(150, 175, t);
    const centre = new THREE.Vector3(p.x, 1.8 + p.y, 0).add(new THREE.Vector3(Math.sin(p.lean), Math.cos(p.lean), 0).multiplyScalar(along));
    const ground = new THREE.Vector3(-42 + Math.min(0, t) * 0.6, 3, 34);
    // From below while it climbs, then from above to watch the first stage fall away.
    const above = smooth(130, 175, t);
    const closer = 1 - 0.35 * smooth(160, 190, t);
    const chase = centre.clone().add(new THREE.Vector3(-24 + above * 4, -6 + above * 16, 30 - above * 4).multiplyScalar(closer));
    const w = smooth(4, 18, t);
    this.padCamera.position.lerpVectors(ground, chase, w);
    this.padCamera.lookAt(t < 0 ? new THREE.Vector3(0, 12, 0) : centre);
    this.padStars.position.copy(this.padCamera.position);
    this.renderer.render(this.pad, this.padCamera);
  }

  /** High up: the upper stages fire one after another. `failed`: a stage failed, so no flame burns. */
  private drawSpace(t: number, falling: number, dt: number, failed = false): void {
    const rocket = this.upper;
    if (!rocket) return;
    rocket.spinner.rotation.y = this.spin;
    for (let s = 1; s < rocket.stages.length; s++) {
      this.flicker(this.upperFlames[s]!, this.burning(s, t) && !failed);
      const g = rocket.stages[s]!.group;
      const back = this.separation(s, t);
      g.position.y = -back;
      g.visible = back < 400;
    }
    // Didn't reach orbit: it tips over and falls back towards Earth.
    rocket.root.rotation.z = -Math.PI / 2 - falling * 0.6;
    // Earth slides by underneath, faster while a stage pushes.
    const pushing = !failed && this.stages.some((_, i) => i > 0 && this.burning(i, t));
    this.spaceEarthPivot.rotation.z += dt * (pushing ? 0.004 : 0.0012);
    this.spaceEarth.spin(dt * 0.0005);
    const drift = t * 0.01;
    const look = new THREE.Vector3(1.2, 0.9, 0);
    this.spaceCamera.position.set(-2.6 + Math.sin(drift) * 0.8, 2.4, 6.8 + Math.cos(drift) * 0.5);
    this.spaceCamera.lookAt(look);
    this.renderer.render(this.space, this.spaceCamera);
  }

  private drawOrbit(dt: number, powered: boolean): void {
    this.orbitClock += dt;
    const { a, b, e } = this.orbitShape;
    // Kepler: it moves fastest at its lowest point.
    const mean = (this.orbitClock / LAP_SECONDS) * Math.PI * 2;
    let E = mean;
    for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - mean) / (1 - e * Math.cos(E));
    this.craft.position.set(a * (Math.cos(E) - e), 0, -b * Math.sin(E));
    this.craftColour.setHex(powered ? 0x4fa3ff : 0x7b8798);
    this.orbitEarth.spin(dt * 0.05);
    const turn = 0.6 + this.orbitClock * 0.03;
    this.orbitCamera.position.set(Math.sin(turn) * 112, 38, Math.cos(turn) * 112);
    this.orbitCamera.lookAt(0, 0, 0);
    this.renderer.render(this.orbit, this.orbitCamera);
  }

  private fit(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (w === 0 || h === 0) return;
    const size = this.renderer.getSize(new THREE.Vector2());
    if (size.x === w && size.y === h) return;
    this.renderer.setSize(w, h, false);
    for (const camera of [this.padCamera, this.spaceCamera, this.orbitCamera]) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }
}

/** A soft round glow for the Spacecraft's dot. */
function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(c);
}
