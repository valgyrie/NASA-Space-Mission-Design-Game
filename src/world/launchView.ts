import * as THREE from 'three';
import { type CompanyLogo, DEFAULT_LOGO } from '../company/logo';
import { type ShowMoment, stageTimes } from '../game/ascent';
import type { LaunchVehicleId } from '../game/launchVehicles';
import type { Design } from '../game/spacecraft';
import { buildEarth } from './earthMesh';
import { type SkyEnvironment, createSkyEnvironment } from './environment';
import { type LaunchGround, buildLaunchGround } from './launchGround';
import { type LaunchPad, buildLaunchPad } from './launchPad';
import { PLUME_HYDROGEN, PLUME_LIQUID, PLUME_SOLID, type PlumeLook, advancePlumes, buildPlume, disposePlume } from './launchPlume';
import { LaunchSmoke, type SmokeLight } from './launchSmoke';
import { MoonShow, type MoonShowSpec, moonShowLength } from './moonShow';
import { JUNO, type RocketModel, buildRocket, disposeRocket } from './rocketMesh';
import { makeStars } from './spacecraftView';

/**
 * The Launch in 3D, in three shots: the pad and the climb (metres, chase camera), the upper stages firing
 * at the top of the climb with Earth below, then the orbit seen from far out while the Mission's days pass.
 * It only draws what the show says: the outcome is already decided by the flight.
 */

export type Shot = 'pad' | 'space' | 'orbit' | 'moon';

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
/**
 * Toward the sun on the pad: a morning sun over the sea, east-south-east, well to the right of the watching cameras
 * (they look north-east), so the rocket's round white body shows a lit side, a shadow side and a highlight instead of
 * flat front light.
 */
const PAD_SUN = new THREE.Vector3(0.69, 0.57, 0.44).normalize();
/** Florida haze: a paler, thicker band at the horizon than the Site's sky. */
const PAD_TURBIDITY = 1.5;
/** Picture brightness and light on the pad, as on the Site (world.ts), so the two look alike. */
const PAD_EXPOSURE = 0.34;
const PAD_SUN_INTENSITY = 12;
const PAD_SKY_LIGHT = 0.5;
/** The space shots were tuned for this exposure. */
const SPACE_EXPOSURE = 1;

const PLUME_LOOK = { liquid: PLUME_LIQUID, solid: PLUME_SOLID, hydrogen: PLUME_HYDROGEN } as const;

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

// ---- Exhaust: launchPlume.ts and launchSmoke.ts ----

// ---- The pad ----

// ---- The view ----

export class LaunchView {
  readonly canvas = document.createElement('canvas');
  private readonly renderer: THREE.WebGLRenderer;

  private readonly pad = new THREE.Scene();
  private readonly padCamera = new THREE.PerspectiveCamera(45, 1, 0.5, 300_000);
  private readonly padStars = makeStars(140);
  private readonly smoke = new LaunchSmoke(1400);
  private readonly smokeLight: SmokeLight = { sunDirection: PAD_SUN.clone(), sun: new THREE.Color(), sky: new THREE.Color(0.7, 0.8, 1.0) };
  private readonly fog = new THREE.Fog(0x9cc8ee, 250, 16_000);
  private readonly skyEnv: SkyEnvironment;
  /** The sky's colours on the ground, so the climb can darken them and come back for the next Launch. */
  private readonly skyBase: { zenith: THREE.Color; mid: THREE.Color; horizon: THREE.Color; coverage: number; fog: THREE.Color };
  private readonly ground: LaunchGround;
  private readonly launchPad: LaunchPad = buildLaunchPad(31);
  private readonly padSun: THREE.DirectionalLight;
  private envIntensity = 1;

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
  /** How far the orbit camera stands from Earth, so the whole orbit fits. */
  private orbitDistance = 112;

  private climbing: RocketModel | null = null;
  private vehicle: LaunchVehicleId = 'juno1';
  /** How much further back the pad cameras stand: 1, more for the tall Moon rockets. */
  private camScale = 1;
  private upper: RocketModel | null = null;
  private flames: THREE.Group[][] = [];
  private upperFlames: THREE.Group[][] = [];
  private path: PathPoint[] = [];
  private stages: { start: number; end: number }[] = [];
  private spin = 0;
  private orbitClock = 0;
  private lastT = -Infinity;
  /** The Moon sequence (moonShow.ts), made the first time a show has a 'moon' segment. */
  private moonShow: MoonShow | null = null;
  /** The Moon sequence this show has started, held on screen through the Mission's days after it. */
  private moonSpec: MoonShowSpec | null = null;
  private moonHold = 0;
  private design: Design | null = null;
  private logo: CompanyLogo = DEFAULT_LOGO;
  /** What the pad's shadow map last showed (rocket and pad models), so a still pad is not drawn into it again. */
  private shadowOf = '';

  constructor() {
    // Throws where WebGL is missing; the caller then uses the simple view.
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = PAD_EXPOSURE;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // Pad: the same sky, sun and haze as the Site, a morning sun behind the watching camera.
    this.pad.fog = this.fog;
    this.skyEnv = createSkyEnvironment(this.renderer, this.pad, { sunDirection: PAD_SUN, turbidity: PAD_TURBIDITY });
    const skyU = (this.skyEnv.sky.material as THREE.ShaderMaterial).uniforms;
    // A humid coastal sky: less saturated than the Site's deep blue, paler lower down.
    desaturate(skyU.uZenith!.value as THREE.Color, 0.3);
    desaturate(skyU.uMid!.value as THREE.Color, 0.3);
    (skyU.uMid!.value as THREE.Color).lerp(skyU.uHorizon!.value as THREE.Color, 0.15);
    this.skyBase = {
      zenith: (skyU.uZenith!.value as THREE.Color).clone(),
      mid: (skyU.uMid!.value as THREE.Color).clone(),
      horizon: (skyU.uHorizon!.value as THREE.Color).clone(),
      coverage: skyU.uCoverage!.value as number,
      fog: this.fog.color.clone(),
    };
    this.ground = buildLaunchGround(this.skyEnv.uniforms);
    this.pad.add(this.ground.mesh, this.launchPad.group, this.smoke.mesh);
    this.smokeLight.sun.copy(this.skyEnv.sunColour).multiplyScalar(3.4);
    // An onshore sea breeze from the east-south-east: smoke drifts inland.
    this.smoke.wind.set(-2.4, 0, -1.0);
    this.envIntensity = PAD_SKY_LIGHT / Math.max(this.skyEnv.skyLight, 0.05);
    this.pad.environmentIntensity = this.envIntensity;
    const sun = new THREE.DirectionalLight(this.skyEnv.sunColour, PAD_SUN_INTENSITY);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.03;
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -70;
    sc.right = sc.top = 70;
    sc.near = 1;
    sc.far = 400;
    this.padSun = sun;
    this.pad.add(sun, sun.target);
    // Stars draw just after the sky dome and everything else over them; they brighten as the sky darkens.
    const starMaterial = this.padStars.material as THREE.PointsMaterial;
    starMaterial.fog = false;
    starMaterial.blending = THREE.AdditiveBlending;
    starMaterial.transparent = false;
    starMaterial.depthTest = false;
    starMaterial.depthWrite = false;
    this.padStars.renderOrder = -0.5;
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
    // Above the air there is no sky light: a crisp sun from high up and a little behind the stages (a sharp line
    // between their lit tops and dark undersides), and blue Earth-shine filling in from below.
    this.space.add(new THREE.HemisphereLight(0x8aa4c8, 0x1d3a66, 0.3));
    this.space.environment = earthShine(this.renderer);
    this.space.environmentIntensity = 1.1;
    const spaceSun = new THREE.DirectionalLight(0xfff4e2, 3.4);
    spaceSun.position.set(1.5, 4, -2.6);
    this.space.add(spaceSun);
    // Earth keeps the light it was tuned with (stream 4), from above and in front.
    this.spaceEarth.setSun(new THREE.Vector3(-3, 5, 4));

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
  load(design: Design, vehicle: LaunchVehicleId, orbitKm: { low: number; high: number }, logo: CompanyLogo = DEFAULT_LOGO): void {
    this.unload();
    this.design = design;
    this.logo = logo;
    this.stages = stageTimes(vehicle);
    const burnEnd = this.stages[0]!.end;
    const coastEnd = this.stages[1]?.start ?? burnEnd;
    this.path = climbPath(burnEnd, coastEnd);

    this.launchPad.setVehicle(vehicle);
    this.climbing = buildRocket(design, vehicle, logo);
    this.climbing.root.position.y = 1.8;
    this.vehicle = vehicle;
    // The Moon rockets carry their own flame looks and lengths (rocketMoon.ts); the others keep the old rules.
    this.camScale = Math.max(1, (this.climbing.height ?? 0) / 28);
    this.flames = this.climbing.stages.map((s, i) =>
      s.nozzles.map((n, k) =>
        s.plume
          ? this.addFlame(s.group, n, s.nozzleRadius, s.flameLength ?? 10, PLUME_LOOK[s.plume])
          : this.addFlame(s.group, n, s.nozzleRadius, i === 0 ? (k === 0 || vehicle === 'falcon9' ? 9 : 7) : 1.2, i === 0 ? k > 0 && vehicle !== 'falcon9' : s.nozzleRadius <= 0.1),
      ),
    );
    this.climbing.root.traverse((o) => {
      if (o instanceof THREE.Mesh && !(o.material as THREE.Material).transparent) o.castShadow = o.receiveShadow = true;
    });
    this.pad.add(this.climbing.root);

    // The upper stages again for the space shot, lying along +x (flying east) without the first stage.
    // A taller upper rocket is shown smaller, so it fits the shot like Juno I's.
    this.upper = buildRocket(design, vehicle, logo);
    this.upper.stages[0]!.group.visible = false;
    const fit = Math.min(1, (JUNO.top - JUNO.coneTop) / this.upper.upperLength);
    this.upper.root.scale.setScalar(fit);
    this.upper.root.rotation.z = -Math.PI / 2;
    this.upper.root.position.x = -this.upper.upperBase * fit;
    this.upperFlames = this.upper.stages.map((s) =>
      s.nozzles.map((n) => (s.plume ? this.addFlame(s.group, n, s.nozzleRadius * 1.4, (s.flameLength ?? 10) * 0.5, PLUME_LOOK[s.plume]) : this.addFlame(s.group, n, s.nozzleRadius * 1.4, 1.6, s.nozzleRadius <= 0.1))),
    );
    this.space.add(this.upper.root);

    // The orbit: Earth's centre at one focus, drawn to scale.
    const rp = (30 * (EARTH_KM + orbitKm.low)) / EARTH_KM;
    const ra = (30 * (EARTH_KM + orbitKm.high)) / EARTH_KM;
    const a = (rp + ra) / 2;
    const e = (ra - rp) / (ra + rp);
    const b = a * Math.sqrt(1 - e * e);
    this.orbitShape = { a, b, e };
    // Stand far enough back to see the whole orbit: a geostationary one is over six times Earth's size.
    this.orbitDistance = Math.max(112, a * 2.7);
    // The Spacecraft's dot grows with the distance, so it stays as easy to see.
    this.craft.scale.setScalar(this.orbitDistance / 112);
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
      model.root.traverse((o) => {
        if (o.name === 'plume') disposePlume(o);
      });
      disposeRocket(model.root);
    }
    this.climbing = null;
    this.upper = null;
    this.moonShow?.clear();
    this.moonSpec = null;
    this.moonHold = 0;
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
    advancePlumes(dt);
    // The Moon sequence plays in its own segment, then stays on screen (held, drifting) through the Mission's days.
    if (phase === 'moon' && m.segment.moon) return this.drawMoon(m.segment.moon, m.value, dt);
    if ((phase === 'mission' || phase === 'end') && this.moonSpec) {
      this.moonHold += dt;
      return this.drawMoon(this.moonSpec, moonShowLength(this.moonSpec) + this.moonHold, dt);
    }
    this.moonShow?.pause();
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
    // A Spacecraft stuck in its transfer orbit (no main engine) doesn't fall: it drifts on with its last stage.
    const lost = phase === 'lost' && !m.segment.stuck;
    const after = phase === 'orbit' || phase === 'lost';
    this.renderer.toneMappingExposure = shot === 'pad' ? PAD_EXPOSURE : SPACE_EXPOSURE;
    if (shot === 'pad') this.drawPad(lost ? m.segment.from : m.value, dt, lost ? m.fraction : 0);
    else if (shot === 'space') this.drawSpace(after ? m.segment.from + m.fraction * m.segment.playS * 2 : m.value, lost ? m.fraction : 0, dt, lost && m.segment.stage !== undefined);
    else this.drawOrbit(dt, powered);
    return shot;
  }

  /** One frame of the Moon sequence `spec`, started the first time this show meets it. */
  private drawMoon(spec: MoonShowSpec, seconds: number, dt: number): Shot {
    this.moonShow ??= new MoonShow(this.renderer);
    if (!this.moonSpec || this.moonSpec.kind !== spec.kind || this.moonSpec.choice !== spec.choice) {
      this.moonSpec = { ...spec };
      this.moonHold = 0;
      if (this.design) this.moonShow.start(spec, this.design, this.logo);
    }
    const size = this.renderer.getSize(new THREE.Vector2());
    this.moonShow.render(seconds, dt, size.x, size.y);
    return 'moon';
  }

  private addFlame(parent: THREE.Object3D, at: THREE.Vector3, radius: number, length: number, solid: boolean | PlumeLook = false): THREE.Group {
    const f = buildPlume(radius, length, typeof solid === 'object' ? solid : solid ? PLUME_SOLID : PLUME_LIQUID);
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
      if (on) f.scale.set(1 + (stretch - 1) * 2.2, (0.93 + Math.random() * 0.14) * stretch, 1 + (stretch - 1) * 2.2);
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
    // SLS: the core stage's four RS-25s light before the boosters and burn on after they drop.
    if (this.vehicle === 'sls') this.flicker(this.flames[1]!, falling === 0 && (burn || this.burning(1, t)), 1 + Math.min(alt / 20_000, 0.8));

    // The first stage drops away after it burns out.
    const first = rocket.stages[0]!.group;
    const back = this.separation(0, t);
    first.position.y = -back;
    first.rotation.x = back * 0.002;
    first.visible = back < 2_000;

    if (falling === 0) this.exhaust(t, p, alt, burn, dt);
    this.lastT = t;

    // The sky darkens as it climbs; haze stays on the ground.
    this.climbSky(alt, dt);
    const stars = smooth(12_000, 40_000, alt);
    this.padStars.visible = stars > 0.05;
    (this.padStars.material as THREE.PointsMaterial).color.setHex(0xcfd9ff).multiplyScalar(stars);

    // Camera: on the ground watching it go, then chasing it.
    // Watch the middle of the rocket, then the part still flying once the first stage has gone.
    const k = this.camScale;
    const along = (11 + 7.5 * smooth(150, 175, t)) * k;
    const centre = new THREE.Vector3(p.x, 1.8 + p.y, 0).add(new THREE.Vector3(Math.sin(p.lean), Math.cos(p.lean), 0).multiplyScalar(along));
    // Before liftoff, close by the pad; from liftoff, a tracking camera further back that sees the ground cloud.
    const ground = (t < 0 ? new THREE.Vector3(-42 + t * 0.6, 5, 34) : new THREE.Vector3(-150, 8, 125)).multiplyScalar(k);
    // From below while it climbs, then from above to watch the first stage fall away.
    const above = smooth(130, 175, t);
    const closer = 1 - 0.35 * smooth(160, 190, t);
    const chase = centre.clone().add(new THREE.Vector3(-24 + above * 4, -6 + above * 16, 30 - above * 4).multiplyScalar(closer * k));
    const w = smooth(9, 24, t);
    const fov = t < 0 ? 45 : 30 + 15 * w;
    if (this.padCamera.fov !== fov) {
      this.padCamera.fov = fov;
      this.padCamera.updateProjectionMatrix();
    }
    this.padCamera.position.lerpVectors(ground, chase, w);
    this.padCamera.lookAt(t < 0 ? new THREE.Vector3(0, 12 * k, 0) : centre);
    this.padStars.position.copy(this.padCamera.position);
    this.padCamera.updateMatrixWorld();
    this.smoke.update(dt, this.padCamera, this.smokeLight);
    this.skyEnv.update(this.padCamera, dt);
    // Sharp shadows round the pad while the camera is near the ground. While the rocket waits on the pad nothing
    // that casts a shadow moves, so the shadow map is drawn once and kept.
    this.padSun.castShadow = alt < 600;
    const shadowOf = t < 0 ? `${this.vehicle}|${this.launchPad.group.userData.version ?? 0}|${this.climbing?.root.uuid}` : '';
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = !shadowOf || shadowOf !== this.shadowOf;
    this.shadowOf = shadowOf;
    this.padSun.target.position.set(0, 10, 0);
    this.padSun.position.copy(PAD_SUN).multiplyScalar(200).add(this.padSun.target.position);
    this.renderer.render(this.pad, this.padCamera);
  }

  /**
   * Smoke and steam: vapour venting on the pad before liftoff, the ground cloud billowing out of the flame trench
   * at liftoff, and the exhaust trail left in the air, thinning to a contrail high up.
   */
  private exhaust(t: number, p: PathPoint, alt: number, burn: boolean, dt: number): void {
    const rnd = () => Math.random() - 0.5;
    // Before liftoff: cold oxygen vapour drifting off the tank and falling away.
    if (t < 0 && Math.random() < dt * 12) {
      const a = Math.random() * Math.PI * 2;
      const y = 6 + Math.random() * 6;
      const at = new THREE.Vector3(Math.sin(a) * 1.3, y, Math.cos(a) * 1.3);
      this.smoke.emit(at, new THREE.Vector3(Math.sin(a) * 1.2 + 0.6, -0.8, Math.cos(a) * 1.2), 3.5, 0.6, 3.2, { opacity: 0.55, drag: 0.4 });
    }
    if (!burn || t < -0.5) return;
    const down = new THREE.Vector3(-Math.sin(p.lean), -Math.cos(p.lean), 0);
    // At liftoff the exhaust hits the deflector in the trench and rolls out of both its ends as a huge cloud of
    // smoke and steam (the deluge water boils), which billows up and drifts.
    if (alt < 120) {
      const k = 1 - alt / 120;
      const n = Math.round(dt * 70 * k) + (Math.random() < 0.6 * k ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const side = Math.random() < 0.5 ? 1 : -1;
        const at = new THREE.Vector3(rnd() * 5, 0.6 + Math.random() * 1.6, side * (13 + Math.random() * 5));
        const v = new THREE.Vector3(rnd() * 12, 2 + Math.random() * 5, side * (16 + Math.random() * 24));
        this.smoke.emit(at, v, 16 + Math.random() * 8, 8 + Math.random() * 4, 30 + Math.random() * 18, { heat: 0.35, lift: 1.5, drag: 0.32, opacity: 0.7 });
      }
      // Steam boiling straight up out of the pit, and smoke spreading round the base of the rocket.
      if (Math.random() < dt * 30 * k) {
        const at = new THREE.Vector3(rnd() * 4, 0.5, rnd() * 18);
        this.smoke.emit(at, new THREE.Vector3(rnd() * 3, 7 + Math.random() * 6, rnd() * 3), 12, 6, 26, { heat: 0.5, lift: 2.2, drag: 0.5, opacity: 0.6 });
      }
      if (Math.random() < dt * 25 * k) {
        const a = Math.random() * Math.PI * 2;
        const v = new THREE.Vector3(Math.cos(a) * 10, 1 + Math.random() * 3, Math.sin(a) * 10);
        this.smoke.emit(new THREE.Vector3(0, 2.5, 0), v, 12, 7, 24, { heat: 0.7, lift: 1.2, drag: 0.45, opacity: 0.65 });
      }
    }
    // The trail: soft billows left along the path just behind the flame, close enough to merge into one column,
    // growing and drifting with the wind; high up it thins to a contrail.
    if (alt > 45_000) return;
    const t0 = this.lastT > -Infinity && this.lastT < t ? Math.max(0, this.lastT) : t;
    const from = pathAt(this.path, t0);
    const size = Math.min(20, 6 + p.speed * 0.06);
    const spacing = Math.max(2.4, size * 0.38);
    const steps = Math.min(20, Math.max(1, Math.ceil(Math.hypot(p.x - from.x, p.y - from.y) / spacing)));
    const thin = 1 - smooth(6_000, 30_000, alt);
    const solid = this.vehicle === 'deltaD' || this.vehicle === 'sls';
    for (let i = 1; i <= steps; i++) {
      const q = pathAt(this.path, t0 + ((t - t0) * i) / steps);
      const at = new THREE.Vector3(q.x, 1.8 + q.y, 0).addScaledVector(down, 8 + Math.random() * 4).add(new THREE.Vector3(rnd(), rnd(), rnd()).multiplyScalar(size * 0.45));
      const v = down.clone().multiplyScalar(4).add(new THREE.Vector3(rnd(), rnd(), rnd()).multiplyScalar(3));
      const s0 = size * (0.7 + 0.6 * Math.random());
      this.smoke.emit(at, v, 9 + Math.random() * 5, s0, s0 * (solid ? 3.8 : 3.2), {
        heat: alt < 3_000 ? 0.8 : 0.35,
        opacity: (solid ? 0.85 : 0.7) * (0.25 + 0.75 * thin),
        drag: 0.3,
      });
    }
  }

  /**
   * The sky as the rocket climbs: the blue overhead deepens to black first (less air above), the horizon keeps a
   * pale blue band longest, the clouds drop away below, and the haze thins.
   */
  private climbSky(alt: number, dt: number): void {
    const u = (this.skyEnv.sky.material as THREE.ShaderMaterial).uniforms;
    const b = this.skyBase;
    // Fraction of the air still above: about 1/e every 8 km.
    const air = Math.exp(-alt / 8_000);
    const black = new THREE.Color(0, 0, 0);
    (u.uZenith!.value as THREE.Color).copy(b.zenith).lerp(black, 1 - air ** 0.7);
    (u.uMid!.value as THREE.Color).copy(b.mid).lerp(b.zenith, 1 - air).lerp(black, (1 - air) ** 1.5 * 0.92);
    (u.uHorizon!.value as THREE.Color).copy(b.horizon).lerp(b.mid, smooth(2_000, 40_000, alt) * 0.6);
    u.uCoverage!.value = b.coverage * (1 - smooth(1_500, 4_500, alt));
    const high = smooth(1_500, 32_000, alt);
    this.fog.color.copy(b.fog).lerp(new THREE.Color(0x7aa6d8), high);
    // Haze lies low: looking down from high up, the ground shows through.
    this.fog.near = 250 + alt * 3;
    this.fog.far = Math.min(900_000, 16_000 + alt * 14);
    this.padCamera.near = alt > 2_000 ? 2 : 0.5;
    this.padCamera.far = alt > 2_000 ? 2_000_000 : 300_000;
    this.padCamera.updateProjectionMatrix();
    this.pad.environmentIntensity = this.envIntensity * (0.55 + 0.45 * air);
    this.ground.animate(dt);
  }

  /** High up: the upper stages fire one after another. `failed`: a stage failed, so no flame burns. */
  private drawSpace(t: number, falling: number, dt: number, failed = false): void {
    const rocket = this.upper;
    if (!rocket) return;
    rocket.spinner.rotation.y = this.spin;
    for (let s = 1; s < rocket.stages.length; s++) {
      this.flicker(this.upperFlames[s]!, this.burning(s, t) && !failed, 1.5);
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
    const d = this.orbitDistance;
    this.orbitCamera.position.set(Math.sin(turn) * d, (38 * d) / 112, Math.cos(turn) * d);
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

/** Move a colour `amount` of the way to the grey of the same brightness. */
function desaturate(c: THREE.Color, amount: number): void {
  const grey = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  c.lerp(new THREE.Color(grey, grey, grey), amount);
}

/** A small environment map for the space shot: black above, the blue glow of Earth below, a bright limb between. */
function earthShine(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'varying vec3 vDir; void main() { float y = normalize(vDir).y;' +
        ' vec3 c = mix(vec3(0.0), vec3(0.16, 0.3, 0.55), smoothstep(0.1, -0.4, y)) + vec3(0.35, 0.5, 0.75) * exp(-abs(y + 0.05) * 18.0);' +
        ' gl_FragColor = vec4(c, 1.0); }',
    }),
  );
  scene.add(sphere);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0, 0.1, 100);
  pmrem.dispose();
  sphere.geometry.dispose();
  (sphere.material as THREE.Material).dispose();
  return target.texture;
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
