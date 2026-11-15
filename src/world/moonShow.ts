import * as THREE from 'three';
import type { CompanyLogo } from '../company/logo';
import type { Design } from '../game/spacecraft';
import { buildEarth } from './earthMesh';
import { LookAround } from './moonCamera';
import {
  buildAstronaut,
  buildCSM,
  buildCrewLander,
  buildCubeSat,
  buildICPS,
  buildLunarModule,
  buildOrion,
  buildRetroreflector,
  buildTliStack,
  disposeCraft,
} from './moonCraft';
import { MoonDust } from './moonDust';
import { buildMoon, moonDirection } from './moonGlobe';
import { type LunarSurface, buildLunarSurface } from './moonSurface';
import { buildSpacecraft, disposeSpacecraft } from './spacecraftMesh';
import { makeStars } from './stars';

/**
 * The Moon sequences of the Launch show (Eras 3 and 5): what plays after the climb when a Mission goes to or
 * near the Moon. Apollo 11: Saturn V's S-IVB fires "Off to the Moon", lunar orbit, the Lunar Module lands at
 * Tranquility Base and the crew sets up the Company's science package. Artemis II: Orion's flight round the Moon.
 * Artemis III: Orion docking with a lander test article in low Earth orbit. Artemis IV: a crewed landing near the
 * south pole. The player's Spacecraft is shown in each.
 *
 * INTERFACE CONTRACT (docs/eras-demo/PLAN.md): the game-logic side (ascent.ts, launchShow.ts) only uses the
 * exported types and functions below; the 3D side owns everything else in this file and in src/world/moon*.ts.
 *
 * Drawing: two passes. The backdrop (Earth, the whole Moon, stars) is in kilometres with its own camera, which
 * copies the main camera's turn; then the depth is cleared and the near scene (hardware, the landing site's
 * ground) is drawn in metres. Both share one frame of reference: the near scene's origin is the backdrop's origin.
 */

export type MoonShowKind = 'apollo11' | 'artemis2' | 'artemis3' | 'artemis4';

/** How the Company helps Artemis III and IV (the player's choice). */
export type ArtemisChoice = 'camera' | 'relay' | 'spaceWeather' | 'cargoLander' | 'mapper';

export interface MoonShowSpec {
  kind: MoonShowKind;
  /** Artemis III: camera, relay or spaceWeather. Artemis IV: relay, cargoLander or mapper. */
  choice?: ArtemisChoice;
}

/** One captioned moment of a Moon sequence. Its text is the strings `moonShow.<kind>.<key>` and `moonShow.<kind>.<key>.detail`. */
export interface MoonBeat {
  key: string;
  /** Seconds from the start of the sequence, at normal speed. */
  startS: number;
}

/** Artemis III's choices (and the beat that shows the player's satellite). */
const ARTEMIS3_CHOICES: readonly ArtemisChoice[] = ['camera', 'relay', 'spaceWeather'];
/** Artemis IV's choices; the beat key for the cargo lander is 'cargo'. */
const ARTEMIS4_CHOICES: readonly ArtemisChoice[] = ['relay', 'cargoLander', 'mapper'];

function artemis3Choice(spec: MoonShowSpec): ArtemisChoice {
  return spec.choice && ARTEMIS3_CHOICES.includes(spec.choice) ? spec.choice : 'camera';
}

function artemis4Choice(spec: MoonShowSpec): ArtemisChoice {
  return spec.choice && ARTEMIS4_CHOICES.includes(spec.choice) ? spec.choice : 'relay';
}

/** The captioned moments of a sequence, in order; the first starts at 0. */
export function moonShowBeats(spec: MoonShowSpec): MoonBeat[] {
  const b = (key: string, startS: number): MoonBeat => ({ key, startS });
  switch (spec.kind) {
    case 'apollo11':
      return [b('tli', 0), b('orbit', 9), b('undock', 17), b('descent', 24), b('contact', 36.5), b('landed', 41), b('setup', 48)];
    case 'artemis2':
      return [b('sep', 0), b('cubesats', 8), b('burn', 17), b('flyby', 25), b('earthset', 36), b('home', 44)];
    case 'artemis3':
      return [b('orbit', 0), b(artemis3Choice(spec), 8), b('approach', 16), b('docking', 26), b('docked', 32)];
    case 'artemis4': {
      const c = artemis4Choice(spec);
      return [b('orbit', 0), b('undock', 8), b(c === 'cargoLander' ? 'cargo' : c, 14), b('descent', 22), b('contact', 34), b('landed', 39), b('surface', 46)];
    }
  }
}

/** Screen seconds the whole sequence takes at normal speed (about 30–60). */
export function moonShowLength(spec: MoonShowSpec): number {
  return { apollo11: 60, artemis2: 50, artemis3: 42, artemis4: 58 }[spec.kind];
}

/** The beat playing at `seconds` into the sequence. */
export function moonBeatAt(spec: MoonShowSpec, seconds: number): MoonBeat {
  const beats = moonShowBeats(spec);
  let beat = beats[0]!;
  for (const b of beats) if (b.startS <= seconds) beat = b;
  return beat;
}

// ---- Drawing ----

const EARTH_KM = 6_371;
const MOON_KM = 1_737.4;
const EARTH_MOON_KM = 384_400;

const sm = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const deg = THREE.MathUtils.degToRad;

/** What one frame shows: lights, where Earth and the Moon are, and the camera. */
interface Frame {
  /** Name of the shot; a change fades in from black. */
  shot: string;
  sun: THREE.Vector3;
  camera: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  /** Earth's centre in km (near-scene frame), or null to hide it. */
  earth: THREE.Vector3 | null;
  /** The Moon globe's centre (km) and turn, or null to hide it (on the ground). */
  moon: { at: THREE.Vector3; turn: THREE.Quaternion } | null;
  /** Ambient fill: Earth-shine in Earth orbit, almost nothing at the Moon. */
  fill: number;
  fillColour: number;
  stars: number;
  exposure: number;
  /** Where to fit the sun's shadow camera (metres), or null for no shadows. */
  shadow: { at: THREE.Vector3; size: number } | null;
  /** Up direction for the camera (default +y). */
  up?: THREE.Vector3;
}

/** Turn of the Moon globe that puts `latDeg, lonDeg` straight up (+y), turned `spin` radians about that axis. */
function moonTurnBelow(latDeg: number, lonDeg: number, spin = 0): THREE.Quaternion {
  const q = new THREE.Quaternion().setFromUnitVectors(moonDirection(latDeg, lonDeg), v3(0, 1, 0));
  return new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), spin).multiply(q);
}

/** A small environment for metal and foil: dark sky above, `below` colour from the ground or Earth underneath. */
function envMap(renderer: THREE.WebGLRenderer, below: THREE.Color, side: THREE.Color): THREE.Texture {
  const scene = new THREE.Scene();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { below: { value: below }, side: { value: side } },
      vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'uniform vec3 below; uniform vec3 side; varying vec3 vDir; void main() { float y = normalize(vDir).y;' +
        ' vec3 c = below * smoothstep(0.05, -0.5, y) + side * exp(-abs(y + 0.02) * 14.0); gl_FragColor = vec4(c, 1.0); }',
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

/** The player's Spacecraft scaled to `size` metres tall, standing on y = 0 (or centred, if `centred`). */
function playerCraft(design: Design, size: number, centred = false): THREE.Group {
  const model = buildSpacecraft(design);
  const box = new THREE.Box3().setFromObject(model);
  const s = size / Math.max(0.01, box.getSize(new THREE.Vector3()).y);
  model.scale.setScalar(s);
  const g = new THREE.Group();
  if (!centred) model.position.y = -box.min.y * s;
  g.add(model);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true;
  });
  g.name = 'player-craft';
  return g;
}

/** A faint line (radio link or laser) between two points, updated per frame. */
function linkLine(colour: number, opacity: number): THREE.Line {
  const g = new THREE.BufferGeometry().setFromPoints([v3(0, 0, 0), v3(0, 1, 0)]);
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  line.frustumCulled = false;
  return line;
}

function setLine(line: THREE.Line, a: THREE.Vector3, b: THREE.Vector3): void {
  const p = line.geometry.attributes.position as THREE.BufferAttribute;
  p.setXYZ(0, a.x, a.y, a.z);
  p.setXYZ(1, b.x, b.y, b.z);
  p.needsUpdate = true;
}

/** A soft bright dot (a satellite glinting far overhead). */
function glintSprite(): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, sizeAttenuation: false }));
  s.scale.setScalar(0.012);
  return s;
}

/** Everything one sequence built, so it can be freed. */
interface Cast {
  roots: THREE.Object3D[];
  surface: LunarSurface | null;
  frame: (t: number, dt: number) => Frame;
}

/**
 * The 3D sequence. LaunchView owns one, draws it while the show's segment is 'moon', and passes its renderer in.
 * `render` takes the sequence's own seconds (ShowMoment.value), so pause, speed-up and Skip all work.
 */
export class MoonShow {
  private readonly backdrop = new THREE.Scene();
  private readonly backCamera = new THREE.PerspectiveCamera(40, 1, 1, 1_000_000);
  private readonly near = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80_000);
  private readonly overlay = new THREE.Scene();
  private readonly overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly fade: THREE.Mesh;
  private readonly sun = new THREE.DirectionalLight(0xfff6ea, 3.2);
  private readonly fill = new THREE.HemisphereLight(0x9fb8e0, 0x404040, 0.1);
  private readonly backSun = new THREE.DirectionalLight(0xfff6ea, 3.2);
  private readonly look: LookAround;
  private readonly calm: boolean;
  private earth: ReturnType<typeof buildEarth> | null = null;
  private moon: THREE.Mesh | null = null;
  private stars: THREE.Points | null = null;
  private envs: { space: THREE.Texture; moon: THREE.Texture } | null = null;
  private readonly dust = new MoonDust();
  private cast: Cast | null = null;
  private shot = '';
  private shotAge = 0;
  private lastT = 0;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.look = new LookAround(renderer.domElement, this.calm);
    this.near.add(this.sun, this.sun.target, this.fill, this.dust.points);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.backdrop.add(this.backSun, this.backSun.target);
    this.backdrop.add(new THREE.AmbientLight(0xffffff, 0.015));
    this.fade = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
    this.overlay.add(this.fade);
  }

  /** Get ready for one Mission: build the right scene, with the player's Spacecraft and logo. */
  start(spec: MoonShowSpec, design: Design, logo: CompanyLogo): void {
    void logo;
    this.clear();
    if (!this.earth) {
      this.earth = buildEarth(EARTH_KM);
      this.moon = buildMoon(MOON_KM, 160, 70);
      this.stars = makeStars(5_000);
      const m = this.stars.material as THREE.PointsMaterial;
      m.depthTest = false;
      m.depthWrite = false;
      m.transparent = false;
      m.blending = THREE.AdditiveBlending;
      this.stars.renderOrder = -1;
      this.backdrop.add(this.earth.earth, this.moon, this.stars);
      this.envs = {
        space: envMap(this.renderer, new THREE.Color(0.12, 0.24, 0.45), new THREE.Color(0.3, 0.42, 0.6)),
        moon: envMap(this.renderer, new THREE.Color(0.28, 0.27, 0.26), new THREE.Color(0.35, 0.34, 0.33)),
      };
    }
    this.cast = spec.kind === 'apollo11' ? this.apollo11(design) : spec.kind === 'artemis2' ? this.artemis2(design) : spec.kind === 'artemis3' ? this.artemis3(design, artemis3Choice(spec)) : this.artemis4(design, artemis4Choice(spec));
    for (const r of this.cast.roots) this.near.add(r);
    if (this.cast.surface) this.near.add(this.cast.surface.group);
    this.look.reset();
    this.dust.clear();
    this.shot = '';
    this.lastT = 0;
  }

  /** Draw the sequence at `seconds`; `dt` is screen seconds since the last frame (for dust, flames). */
  render(seconds: number, dt: number, width: number, height: number): void {
    const cast = this.cast;
    if (!cast || !this.earth || !this.moon || !this.stars) return;
    this.look.active = true;
    this.look.update(dt);
    const f = cast.frame(seconds, dt);
    this.lastT = seconds;
    if (f.shot !== this.shot) {
      this.shot = f.shot;
      this.shotAge = 0;
    } else this.shotAge += dt;

    // Camera, with the player's look-around on top of the film's path.
    const aspect = width / Math.max(1, height);
    this.camera.up.copy(f.up ?? v3(0, 1, 0));
    this.camera.position.copy(f.camera);
    this.camera.lookAt(f.target);
    this.look.apply(this.camera, f.target);
    if (this.camera.fov !== f.fov || this.camera.aspect !== aspect) {
      this.camera.fov = f.fov;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
    // The backdrop camera turns with it; it stands at the same place, in kilometres.
    this.backCamera.position.copy(this.camera.position).multiplyScalar(0.001);
    this.backCamera.quaternion.copy(this.camera.quaternion);
    if (this.backCamera.fov !== f.fov || this.backCamera.aspect !== aspect) {
      this.backCamera.fov = f.fov;
      this.backCamera.aspect = aspect;
      this.backCamera.updateProjectionMatrix();
    }
    this.stars.position.copy(this.backCamera.position);
    (this.stars.material as THREE.PointsMaterial).color.setScalar(f.stars);
    this.stars.visible = f.stars > 0.01;

    const sun = f.sun.clone().normalize();
    this.earth.earth.visible = !!f.earth;
    if (f.earth) this.earth.earth.position.copy(f.earth);
    this.earth.setSun(sun);
    this.earth.spin(dt * 0.004);
    this.moon.visible = !!f.moon;
    if (f.moon) {
      this.moon.position.copy(f.moon.at);
      this.moon.quaternion.copy(f.moon.turn);
    }
    this.backSun.position.copy(sun).multiplyScalar(1000);
    this.backSun.target.position.set(0, 0, 0);

    this.sun.position.copy(sun).multiplyScalar(200).add(f.shadow?.at ?? f.target);
    this.sun.target.position.copy(f.shadow?.at ?? f.target);
    this.sun.castShadow = !!f.shadow;
    if (f.shadow) {
      const c = this.sun.shadow.camera;
      c.left = c.bottom = -f.shadow.size;
      c.right = c.top = f.shadow.size;
      c.near = 1;
      c.far = 400 + f.shadow.size * 2;
      this.sun.position.copy(sun).multiplyScalar(200 + f.shadow.size).add(f.shadow.at);
      c.updateProjectionMatrix();
    }
    this.fill.intensity = f.fill;
    this.fill.color.setHex(f.fillColour);
    // Metal and foil reflect a grey ground at the Moon, a blue Earth below in Earth orbit.
    const lunar = !!f.moon || !!cast.surface?.group.visible;
    this.near.environment = lunar ? this.envs!.moon : this.envs!.space;
    this.near.environmentIntensity = lunar ? 0.4 : 0.6;
    this.dust.setScale((height * this.renderer.getPixelRatio()) / (2 * Math.tan(deg(f.fov) / 2)));

    const r = this.renderer;
    r.toneMappingExposure = f.exposure;
    r.shadowMap.autoUpdate = false;
    r.shadowMap.needsUpdate = !!f.shadow;
    r.autoClear = true;
    r.setClearColor(0x000000, 1);
    r.render(this.backdrop, this.backCamera);
    r.autoClear = false;
    r.clearDepth();
    r.render(this.near, this.camera);
    const fade = 1 - sm(0, this.calm ? 0.3 : 0.7, this.shotAge);
    if (fade > 0.005) {
      (this.fade.material as THREE.MeshBasicMaterial).opacity = fade;
      r.render(this.overlay, this.overlayCamera);
    }
    r.autoClear = true;
  }

  /** The Moon scene is off screen: pointer input no longer moves its camera. */
  pause(): void {
    this.look.active = false;
  }

  /** Free this sequence's scene (the Earth, Moon and stars stay for the next one). */
  clear(): void {
    this.look.active = false;
    if (!this.cast) return;
    for (const r of this.cast.roots) {
      r.removeFromParent();
      r.traverse((o) => {
        if (o.name === 'player-craft') disposeSpacecraft(o);
      });
      disposeCraft(r);
      r.traverse((o) => {
        if (o instanceof THREE.Line) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
        if (o instanceof THREE.Sprite) {
          (o.material as THREE.SpriteMaterial).map?.dispose();
          o.material.dispose();
        }
      });
    }
    if (this.cast.surface) {
      this.cast.surface.group.removeFromParent();
      this.cast.surface.dispose();
    }
    this.cast = null;
  }

  /** Free the GPU memory when the show closes. */
  dispose(): void {
    this.clear();
    this.look.dispose();
    this.dust.dispose();
    this.fade.geometry.dispose();
    (this.fade.material as THREE.Material).dispose();
    this.backdrop.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.envs?.space.dispose();
    this.envs?.moon.dispose();
    this.earth = null;
    this.moon = null;
  }

  /** Seconds into the sequence last drawn (for tests and the held scene). */
  get seconds(): number {
    return this.lastT;
  }

  // ---- Apollo 11 ----

  private apollo11(design: Design): Cast {
    // Tranquility Base: the Sun about 10° up in the east (lunar morning), Earth high in the west (the site is
    // 23.5° east of the middle of the near side, so Earth stands about 66° up).
    const sunGround = v3(Math.cos(deg(10.8)), Math.sin(deg(10.8)), -0.03);
    const earthGround = v3(-Math.sin(deg(23.47)), Math.cos(deg(23.47)), 0.01).normalize().multiplyScalar(EARTH_MOON_KM);
    const surface = buildLunarSurface('tranquility', sunGround);
    const ground = (x: number, z: number) => surface.heightAt(x, z);

    const tli = buildTliStack();
    tli.root.rotation.z = -Math.PI / 2;
    tli.flame.visible = true;
    // Docked in lunar orbit: Columbia nose-to-nose with Eagle, flying along +x.
    const docked = new THREE.Group();
    const csm = buildCSM();
    csm.root.rotation.z = -Math.PI / 2;
    const lmOrbit = buildLunarModule();
    lmOrbit.root.rotation.z = Math.PI / 2;
    lmOrbit.root.position.x = 3.3 + 6.45;
    docked.add(csm.root, lmOrbit.root);
    // On the ground: Eagle, the crew, the science package (the player's Spacecraft) and the reflector.
    const lm = buildLunarModule();
    const crew = [buildAstronaut(), buildAstronaut()];
    const pkg = playerCraft(design, 1.0);
    pkg.position.set(4, ground(4, 16), 16);
    pkg.rotation.y = 0.4;
    const lrrr = buildRetroreflector();
    lrrr.position.set(-1.5, ground(-1.5, 15), 15);
    lrrr.rotation.y = Math.PI / 2;
    const onGround = new THREE.Group();
    onGround.add(pkg, lrrr, crew[0]!.root, crew[1]!.root);
    const landY = ground(0, 0);

    const orbitAlt = 110;
    const moonOrbit = (t: number) => ({ at: v3(0, -(MOON_KM + orbitAlt), 0), turn: moonTurnBelow(1.5, 30 - t * 0.12, 0.2) });
    const orbitSun = v3(-0.35, 0.5, 0.8);
    const earthFromOrbit = (t: number) => {
      const m = moonOrbit(t);
      return v3(1, 0, 0).applyQuaternion(m.turn).multiplyScalar(EARTH_MOON_KM).add(m.at);
    };

    const frame = (t: number, dt: number): Frame => {
      const vis = (tliOn: boolean, orbitOn: boolean, groundOn: boolean) => {
        tli.root.visible = tliOn;
        docked.visible = orbitOn;
        lm.root.visible = groundOn;
        onGround.visible = groundOn && t >= 47;
        surface.group.visible = groundOn;
      };
      if (t < 9) {
        // Off to the Moon: the S-IVB's J-2 burning, Earth's limb below.
        vis(true, false, false);
        tli.flame.scale.y = 0.94 + Math.random() * 0.1;
        const k = t / 9;
        this.dust.update(dt, null, 0, ground);
        return {
          shot: 'tli', sun: v3(0.5, 0.55, 0.6), fov: 38,
          camera: v3(-8 + 20 * k, 9 - 3 * k, 44 - 6 * k), target: v3(13, -2, 0),
          earth: v3(0, -(EARTH_KM + 190), -400).applyAxisAngle(v3(0, 0, 1), -t * 0.0016),
          moon: null, fill: 0.35, fillColour: 0x8fb4ff, stars: 0.25, exposure: 1.0, shadow: { at: v3(14, 0, 0), size: 22 },
        };
      }
      if (t < 24) {
        // Lunar orbit, then Eagle undocks and drifts away from Columbia.
        vis(false, true, false);
        const u = Math.max(0, t - 18);
        const apart = u * u * 0.18 + u * 0.4;
        lmOrbit.root.position.set(3.3 + 6.45 + apart, -apart * 0.25, 0);
        lmOrbit.root.rotation.set(0, u * 0.04, Math.PI / 2 + u * 0.02);
        const k = (t - 9) / 15;
        const undock = t >= 17;
        return {
          shot: undock ? 'undock' : 'orbit', sun: orbitSun, fov: undock ? 36 : 40,
          camera: undock ? v3(2 + u * 0.6, 4.5, 26 + u * 0.4) : v3(-14 + 12 * k, 6, 22 - 4 * k),
          target: undock ? v3(6 + apart * 0.5, 0, 0) : v3(5, -1.5, 0),
          earth: earthFromOrbit(t), moon: moonOrbit(t),
          fill: 0.04, fillColour: 0x9fa4ad, stars: 0.4, exposure: 1.0, shadow: { at: v3(6 + apart * 0.5, 0, 0), size: 16 },
        };
      }
      // On the surface: the powered descent from the east, touchdown, then the crew outside.
      vis(false, false, true);
      const touchdown = 37.5;
      const u = Math.min(1, (t - 24) / (touchdown - 24));
      const x = 280 * (1 - u) ** 2;
      const h = 150 * (1 - u) ** 1.6;
      const settle = sm(touchdown, touchdown + 0.35, t);
      lm.root.position.set(x, landY + h - 0.05 * settle, -0.6 * x * 0.1);
      lm.root.rotation.set(0, -Math.PI / 2, deg(-14) * (1 - u) ** 1.5);
      lm.legs.scale.y = 1 - 0.03 * settle;
      const engine = t < touchdown + 1.0;
      lm.flame.visible = engine;
      lm.flame.scale.y = 0.9 + Math.random() * 0.2;
      const gy = ground(x, -0.06 * x);
      const below = engine && h < 30 ? v3(x, gy, -0.06 * x) : null;
      this.dust.update(dt, below, below ? Math.pow(1 - h / 30, 1.2) : 0, ground);

      // Two crew members: one walks slowly round the package, one stands by the ladder.
      const walk = (t - 47) * (this.calm ? 0.15 : 0.35);
      const a0 = crew[0]!;
      a0.root.position.set(4 + Math.cos(walk) * 3.2, 0, 16 + Math.sin(walk) * 3.2);
      a0.root.position.y = ground(a0.root.position.x, a0.root.position.z) + Math.abs(Math.sin(walk * 6)) * 0.12;
      a0.root.rotation.y = -walk;
      a0.legs[0].rotation.x = Math.sin(walk * 6) * 0.35;
      a0.legs[1].rotation.x = -Math.sin(walk * 6) * 0.35;
      const a1 = crew[1]!;
      a1.root.position.set(1.5, ground(1.5, 6.5), 6.5);
      a1.root.rotation.y = 0.5 + Math.sin(t * 0.3) * 0.2;
      a1.arms[1].rotation.x = -0.6 + Math.sin(t * 0.8) * 0.15;

      const lmAt = lm.root.position.clone().add(v3(0, 3.5, 0));
      if (t < touchdown - 4) {
        // Chase alongside, a little behind and below, the ground streaming past.
        return {
          shot: 'descent', sun: sunGround, fov: 42,
          camera: lmAt.clone().add(v3(22, -4 + 4 * u, 26)), target: lmAt.clone().add(v3(-6, -3, 0)),
          earth: earthGround, moon: null, fill: 0.03, fillColour: 0x8fa0c0, stars: 0.0, exposure: 1.0,
          shadow: { at: v3(x * 0.5, landY, 0), size: 30 + x * 0.5 },
        };
      }
      if (t < 41) {
        // A camera low on the ground watches the last metres: dust sheeting out, contact.
        return {
          shot: 'contact', sun: sunGround, fov: 40,
          camera: v3(8, landY + 1.4, 34), target: v3(-2, landY + 2.5 + h * 0.5, 0),
          earth: earthGround, moon: null, fill: 0.03, fillColour: 0x8fa0c0, stars: 0, exposure: 1.0, shadow: { at: v3(-8, landY, 0), size: 40 },
        };
      }
      if (t < 47) {
        // Looking west past Eagle, up at Earth high in the black sky; the long morning shadow stretches away.
        // Crouched close to Eagle on its east side, the view tilts from Eagle up past its top to Earth (66.5° up
        // in the west), so the ascent stage stands against the black sky with Earth above it.
        const k = sm(0.25, 0.95, (t - 41) / 6);
        const eye = v3(8.2, ground(8.2, 1.6) + 1.0, 1.6);
        const flat = Math.hypot(eye.x, eye.z);
        const pitch = THREE.MathUtils.lerp(Math.atan2(landY + 2.5 - eye.y, flat), deg(52), k);
        const yaw0 = Math.atan2(-eye.z, -eye.x);
        const turn = THREE.MathUtils.euclideanModulo(Math.atan2(earthGround.z, earthGround.x) - yaw0 + Math.PI, 2 * Math.PI) - Math.PI;
        const yaw = yaw0 + turn * k;
        return {
          shot: 'landed', sun: sunGround, fov: 55 + 10 * k,
          camera: eye, target: eye.clone().add(v3(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch)).multiplyScalar(30)),
          earth: earthGround, moon: null, fill: 0.03, fillColour: 0x8fa0c0, stars: 0, exposure: 1.0, shadow: { at: v3(-14, landY, 0), size: 32 },
        };
      }
      // The crew at work: the camera circles slowly round Eagle, the package and the reflector.
      const turn = 0.4 + (t - 47) * (this.calm ? 0.01 : 0.04);
      const centre = v3(1.5, landY + 1.2, 9);
      return {
        shot: 'setup', sun: sunGround, fov: 45,
        camera: centre.clone().add(v3(Math.sin(turn) * 24, 4.5, Math.cos(turn) * 24)), target: centre,
        earth: earthGround, moon: null, fill: 0.03, fillColour: 0x8fa0c0, stars: 0, exposure: 1.0, shadow: { at: v3(-6, landY, 6), size: 34 },
      };
    };
    return { roots: [tli.root, docked, lm.root, onGround], surface, frame };
  }

  // ---- Artemis II ----

  private artemis2(design: Design): Cast {
    const icps = buildICPS();
    icps.rotation.z = -Math.PI / 2;
    const orion = buildOrion();
    const cubes = [playerCraft(design, 0.45, true), buildCubeSat(), buildCubeSat(), buildCubeSat()];
    const group = new THREE.Group();
    group.add(icps, orion.root, ...cubes);
    // High Earth orbit: Earth big beyond the stage, below and ahead of the cameras (which look towards -z).
    const heoEarth = v3(4_000, -10_000, -24_000);
    const sunHeo = v3(0.65, 0.5, 0.55);
    const flybySun = v3(0.75, 0.35, 0.55);
    const frame = (t: number): Frame => {
      // Orion leaves the ICPS and turns round to face it (the crew flew it by hand), then the CubeSats pop out.
      const sep = Math.min(t, 17);
      const away = 4.4 + sep * 1.2 + sep * sep * 0.05;
      orion.root.position.set(away, 0, 0);
      orion.root.rotation.set(0, 0, -Math.PI / 2 + Math.PI * sm(3, 9, t));
      cubes.forEach((c, i) => {
        const t0 = 8.5 + i * 1.2;
        const s = Math.max(0, t - t0);
        const a = (i / 4) * Math.PI * 2 + 0.9;
        c.visible = t >= t0 && t < 25;
        // Out of its dispenser inside the adapter ring (r 2.1 m, 0.4 m below the rim), then away from the stage.
        const r = 2.1 + s * 0.3;
        c.position.set(-0.4 + s * 0.4, Math.cos(a) * r, Math.sin(a) * r);
        c.rotation.set(s * 0.25, s * 0.18 + i, 0);
      });
      icps.visible = t < 25;
      orion.flame.visible = t >= 18 && t < 24.5;
      orion.flame.scale.y = 0.9 + Math.random() * 0.2;
      const base = { earth: heoEarth, moon: null, fill: 0.25, fillColour: 0x8fb4ff, stars: 0.4, exposure: 1.0 };
      if (t < 8) {
        const k = t / 8;
        return { ...base, shot: 'heo', sun: sunHeo, fov: 42, camera: v3(-4 + 6 * k, 9, 34 - 4 * k), target: v3(away * 0.5 - 2, -2, 0), shadow: { at: v3(away * 0.5, 0, 0), size: 20 } };
      }
      if (t < 12) {
        // Close over the adapter ring as the Company's CubeSat springs out of its dispenser, the others after it.
        const k = (t - 8) / 4;
        return { ...base, shot: 'cubesats', sun: sunHeo, fov: 38, camera: v3(1.7 + 0.3 * k, 2.6, 3.2 + 0.3 * k), target: v3(0.1, 1.55, 1.85), shadow: { at: v3(0, 1.5, 1.5), size: 5 } };
      }
      if (t < 17) {
        // Close on the Company's CubeSat drifting away, the stage's adapter behind it, Earth beyond.
        const p = cubes[0]!.position;
        const k = (t - 12) / 5;
        return { ...base, shot: 'player', sun: sunHeo, fov: 36, camera: p.clone().add(v3(0.3 + 0.1 * k, 0.3, 0.95 + 0.15 * k)), target: p.clone().add(v3(-0.15, -0.1, 0)), shadow: { at: p, size: 2 } };
      }
      if (t < 25) {
        // Off to the Moon on Orion's own main engine; Earth falls away below.
        orion.root.position.set(0, 0, 0);
        orion.root.rotation.set(0, 0, -Math.PI / 2);
        const k = (t - 17) / 8;
        return { ...base, shot: 'burn', sun: sunHeo, fov: 44, camera: v3(-26 + 8 * k, 8, 16 - 3 * k), target: v3(-3, -2, 0), earth: heoEarth.clone().multiplyScalar(1 + k * 0.5), stars: 0.5, shadow: { at: v3(-2, 0, 0), size: 14 } };
      }
      // Round the far side: the Moon ahead and below, then the Earthset, then heading home.
      orion.root.position.set(0, 0, 0);
      const alt = 6_500;
      const lunar = { fill: 0.02, fillColour: 0x9fa4ad, exposure: 1.0, shadow: { at: v3(0, 0, 0), size: 14 } };
      if (t < 36) {
        const k = (t - 25) / 11;
        orion.root.rotation.set(0.25, 0, -Math.PI / 2 + 0.15);
        const moonDir = v3(0.3, -0.45, -0.84).normalize();
        return {
          ...lunar, shot: 'flyby', sun: flybySun, fov: 46, stars: 0.5,
          camera: v3(-5 + 4 * k, 7, 24 - 4 * k), target: v3(1, -2.5, -4),
          earth: null, moon: { at: moonDir.multiplyScalar(MOON_KM + alt), turn: moonTurnBelow(10, 175 - (t - 25) * 0.8, 0.3) },
        };
      }
      if (t < 44) {
        // Earthset: a long lens past Orion's wing; Earth slips down behind the Moon's limb.
        const k = (t - 36) / 8;
        const moonAt = v3(0, -(MOON_KM + alt) * 0.35, -(MOON_KM + alt) * 0.94);
        const dir = moonAt.clone().normalize();
        const limbUp = Math.asin(MOON_KM / moonAt.length());
        const view = dir.clone().applyAxisAngle(v3(1, 0, 0), limbUp + deg(1.4) - deg(3.0) * sm(0, 1, k));
        orion.root.rotation.set(0, 0.5, -Math.PI / 2 + 0.3);
        const camera = view.clone().multiplyScalar(-110).add(v3(-9, 0, 0));
        return {
          ...lunar, shot: 'earthset', sun: flybySun, fov: 11, stars: 0.15,
          camera, target: camera.clone().add(view.clone().applyAxisAngle(v3(1, 0, 0), deg(-1.5))),
          earth: view.clone().multiplyScalar(EARTH_MOON_KM), moon: { at: moonAt, turn: moonTurnBelow(-10, 160, 0) },
          shadow: { at: v3(0, 0, 0), size: 14 },
        };
      }
      // Home: Orion turns for Earth, a small blue-and-white disc ahead; the Moon falls behind.
      const k = Math.min(1, (t - 44) / 6);
      orion.root.rotation.set(0, 0, Math.PI / 2 + 0.3);
      const earthDir = v3(-1, 0.1, -0.2).normalize();
      return {
        ...lunar, shot: 'home', sun: flybySun, fov: 40, stars: 0.5,
        camera: v3(16, 4 - k, 10 + 3 * k), target: v3(-6, 0, -2),
        earth: earthDir.multiplyScalar(EARTH_MOON_KM * 0.8),
        moon: { at: v3(14_000 + k * 800, -1_500, 9_000), turn: moonTurnBelow(-10, 170, 0) },
      };
    };
    return { roots: [group], surface: null, frame };
  }

  // ---- Artemis III ----

  private artemis3(design: Design, choice: ArtemisChoice): Cast {
    const lander = buildCrewLander();
    lander.root.rotation.z = -Math.PI / 2;
    const orion = buildOrion();
    orion.root.rotation.z = Math.PI / 2;
    const sat = playerCraft(design, 1.6, true);
    sat.position.set(10, 6, 16);
    const link = linkLine(0x9fd0ff, 0.35);
    link.visible = choice === 'relay';
    const group = new THREE.Group();
    group.add(lander.root, orion.root, sat, link);
    const earth = v3(0, -(EARTH_KM + 440), 0);
    const sun = v3(0.45, 0.6, 0.65);
    const dockX = 15.1 + 3.4;
    const frame = (t: number): Frame => {
      const approach = sm(14, 30, t);
      const x = dockX + 70 * (1 - approach) + (t < 30 ? 0 : 0);
      orion.root.position.set(x, 0, 0);
      orion.root.rotation.set(0, 0, Math.PI / 2 + Math.sin(t * 0.3) * 0.02 * (1 - approach));
      sat.rotation.y = t * 0.15;
      setLine(link, sat.position, orion.root.position);
      const base: Pick<Frame, 'sun' | 'earth' | 'moon' | 'fill' | 'fillColour' | 'stars' | 'exposure'> = {
        sun, earth: earth.clone().applyAxisAngle(v3(0, 0, 1), -t * 0.0012), moon: null, fill: 0.35, fillColour: 0x8fb4ff, stars: 0.2, exposure: 1.0,
      };
      if (t < 8) {
        const k = t / 8;
        return { ...base, shot: 'wait', fov: 40, camera: v3(-6 + 10 * k, 10, 34 - 4 * k), target: v3(8, -3, 0), shadow: { at: v3(7, 0, 0), size: 14 } };
      }
      if (t < 16) {
        // The player's satellite nearby, the lander behind it, Earth's blue below.
        const k = (t - 8) / 8;
        // From the side and a little above, looking down past the satellite at Earth's limb (21° below level here).
        return { ...base, shot: 'player', fov: 36, camera: sat.position.clone().add(v3(5.2 - 1.2 * k, 1.6, 1.6 + 0.6 * k)), target: sat.position.clone().add(v3(0.2, -0.5, -0.4)), shadow: { at: sat.position, size: 6 } };
      }
      if (t < 26) {
        return { ...base, shot: 'approach', fov: 38, camera: v3(4, 12, 40), target: v3((x + 10) / 2, 0, 0), shadow: { at: v3((x + 8) / 2, 0, 0), size: 30 + (x - dockX) * 0.5 } };
      }
      // Docking close up, then the docked pair turning slowly over Earth.
      const k = (t - 26) / 16;
      return { ...base, shot: t < 32 ? 'docking' : 'docked', fov: t < 32 ? 30 : 40, camera: t < 32 ? v3(dockX - 4, 5, 13) : v3(10 + Math.sin(k * 2) * 12, 9, 34), target: v3(t < 32 ? dockX - 2 : 12, 0, 0), shadow: { at: v3(12, 0, 0), size: 18 } };
    };
    return { roots: [group], surface: null, frame };
  }

  // ---- Artemis IV ----

  private artemis4(design: Design, choice: ArtemisChoice): Cast {
    // The south-pole ridge: the Sun a few degrees up, sweeping in low across the ridge; Earth low on the horizon.
    const sunGround = v3(Math.cos(deg(4)), Math.sin(deg(4)), 0.25).normalize();
    const earthGround = v3(-0.9, Math.sin(deg(3.5)), 0.42).normalize().multiplyScalar(EARTH_MOON_KM);
    const surface = buildLunarSurface('southPole', sunGround);
    const ground = (x: number, z: number) => surface.heightAt(x, z);
    const landY = ground(0, 0);

    // In lunar orbit: Orion docked to the lander's top.
    const orbitGroup = new THREE.Group();
    const orion = buildOrion();
    const orbitLander = buildCrewLander();
    orbitLander.root.rotation.z = -Math.PI / 2;
    orion.root.rotation.z = Math.PI / 2;
    orion.root.position.x = 15.1 + 3.4;
    orbitGroup.add(orion.root, orbitLander.root);
    // On the ground.
    const lander = buildCrewLander();
    const crew = [buildAstronaut(), buildAstronaut()];
    const groundGroup = new THREE.Group();
    groundGroup.add(lander.root, crew[0]!.root, crew[1]!.root);
    // The player's craft: in orbit (relay, mapper) or standing on the ridge (cargo lander, on its own legs).
    const player = new THREE.Group();
    // A cargo lander always stands on the Lander Part's legs (spacecraftMesh.ts), even if the design left it out.
    const cargo = choice === 'cargoLander';
    const model = playerCraft(cargo ? { ...design, propulsion: 'lander' } : design, cargo ? 2.6 : 2.2, !cargo);
    player.add(model);
    if (cargo) {
      player.position.set(-26, ground(-26, -18) - 0.05, -18);
      groundGroup.add(player);
    }
    const glint = glintSprite();
    const link = linkLine(choice === 'mapper' ? 0x6dff8a : 0x9fd0ff, choice === 'mapper' ? 0.8 : 0.3);
    groundGroup.add(glint, link);
    const orbitPlayer = new THREE.Group();
    if (choice !== 'cargoLander') orbitPlayer.add(player);
    const pulse = linkLine(0x6dff8a, 0.9);
    orbitPlayer.add(pulse);

    const orbitSun = v3(0.9, 0.12, 0.4);
    const moonOrbit = (t: number, alt: number) => ({ at: v3(0, -(MOON_KM + alt), 0), turn: moonTurnBelow(-80 - t * 0.12, 10, 0.4) });
    const earthFor = (m: { at: THREE.Vector3; turn: THREE.Quaternion }) => v3(1, 0, 0).applyQuaternion(m.turn).multiplyScalar(EARTH_MOON_KM).add(m.at);

    const frame = (t: number, dt: number): Frame => {
      const onGround = t >= 22 || (choice === 'cargoLander' && t >= 14);
      orbitGroup.visible = t < 14;
      orbitPlayer.visible = t >= 14 && t < 22 && choice !== 'cargoLander';
      groundGroup.visible = onGround;
      surface.group.visible = onGround;
      if (t < 14) {
        const u = Math.max(0, t - 9);
        const apart = u * u * 0.25 + u * 0.3;
        orbitLander.root.position.set(-apart, -apart * 0.4, 0);
        const m = moonOrbit(t, 100);
        const k = t / 14;
        this.dust.update(dt, null, 0, ground);
        return {
          shot: t < 8 ? 'orbit' : 'undock', sun: orbitSun, fov: 40,
          camera: v3(-6 + 10 * k - apart * 0.5, 9, 40 - 6 * k), target: v3(6 - apart * 0.6, -2, 0),
          earth: earthFor(m), moon: m, fill: 0.03, fillColour: 0x9fa4ad, stars: 0.35, exposure: 1.0, shadow: { at: v3(5 - apart * 0.5, 0, 0), size: 22 },
        };
      }
      if (t < 22 && choice !== 'cargoLander') {
        // The player's relay or Moon Mapper in its polar orbit, the pole's long shadows far below.
        const k = (t - 14) / 8;
        const alt = choice === 'mapper' ? 50 : 4_760;
        // The Moon beyond the craft (straight below the low mapper; off to one side, far below, for the relay).
        const below = choice === 'mapper' ? v3(0, -1, 0) : v3(-0.5, -0.42, -0.75).normalize();
        const m = {
          at: below.clone().multiplyScalar(MOON_KM + alt),
          turn: new THREE.Quaternion().setFromUnitVectors(moonDirection(-84 - t * 0.1, 10), below.clone().negate()),
        };
        model.rotation.y = t * 0.1;
        pulse.visible = choice === 'mapper' && (t * 2) % 1 < 0.25;
        setLine(pulse, v3(0, -0.6, 0), below.clone().multiplyScalar(alt * 1000));
        return {
          shot: 'player', sun: orbitSun, fov: 36,
          camera: v3(6 - 3 * k, 2.4, 7 + k), target: v3(0, -0.3, 0),
          earth: earthFor(m), moon: m, fill: 0.03, fillColour: 0x9fa4ad, stars: 0.4, exposure: 1.0, shadow: { at: v3(0, 0, 0), size: 4 },
        };
      }
      // The descent onto the ridge, touchdown, the crew outside.
      const touchdown = 35.5;
      const u = Math.min(1, Math.max(0, (t - 22) / (touchdown - 22)));
      const x = -160 * (1 - u) ** 2;
      const h = (t < 22 ? 1 : 0) * 600 + 180 * (1 - u) ** 1.6;
      const settle = sm(touchdown, touchdown + 0.35, t);
      lander.root.position.set(x, landY + h - 0.06 * settle, 40 * (1 - u) ** 2);
      lander.root.rotation.set(0, 0, deg(8) * (1 - u) ** 1.5);
      lander.legs.scale.y = 1 - 0.025 * settle;
      const engine = t < touchdown + 1;
      lander.flame.visible = engine;
      lander.flame.scale.y = 0.9 + Math.random() * 0.2;
      const gy = ground(x, 40 * (1 - u) ** 2);
      const below = engine && h < 40 ? v3(x, gy, 40 * (1 - u) ** 2) : null;
      this.dust.update(dt, below, below ? Math.pow(1 - h / 40, 1.2) : 0, ground);

      // Crew: down the lift and a few steps out.
      const out = sm(46, 52, t);
      crew.forEach((c, i) => {
        const cx = 4 + i * 2.2 + out * (3 + i * 2);
        const cz = 5.5 + out * (2 + i);
        c.root.visible = t >= 46;
        c.root.position.set(cx, ground(cx, cz), cz);
        c.root.rotation.y = 0.9 + i * 0.5;
        const step = t * (this.calm ? 1.5 : 3.5) + i;
        const walking = out > 0 && out < 1;
        c.legs[0].rotation.x = walking ? Math.sin(step) * 0.3 : 0;
        c.legs[1].rotation.x = walking ? -Math.sin(step) * 0.3 : 0;
      });
      // Overhead: the relay or mapper crosses the black sky as a moving point; a link to the lander.
      const overhead = choice !== 'cargoLander';
      glint.visible = overhead && t >= 46;
      link.visible = overhead && t >= 46 && (choice === 'relay' || (t * 1.5) % 1 < 0.2);
      if (overhead) {
        const s = (t - 46) * 0.02;
        const sky = v3(-0.2 + s, 0.75, -0.6 + s * 0.5).normalize().multiplyScalar(4_000);
        glint.position.copy(sky);
        setLine(link, choice === 'relay' ? v3(0, landY + 15.2, 0) : v3(sky.x * 0.0 + 6, landY, 2), sky);
      }

      const at = lander.root.position.clone().add(v3(0, 7, 0));
      const shadow = { at: v3(Math.min(0, x * 0.5) - 14, landY, 0), size: 40 + Math.abs(x) * 0.5 };
      const base = { sun: sunGround, earth: earthGround, moon: null, fill: 0.02, fillColour: 0x8fa0c0, stars: 0, exposure: 1.1, shadow };
      if (t < 22) {
        // Cargo lander choice: the player's lander stands on the ridge; the crew's lander a speck descending.
        const k = (t - 14) / 8;
        return { ...base, shot: 'player', fov: 38, camera: player.position.clone().add(v3(8 - 2 * k, 2.2, 6)), target: player.position.clone().add(v3(0, 1.3, 0)), shadow: { at: player.position, size: 12 } };
      }
      if (t < touchdown - 4) {
        return { ...base, shot: 'descent', fov: 44, camera: at.clone().add(v3(30, -2 + 6 * u, 34)), target: at.clone().add(v3(-4, -6, 0)) };
      }
      if (t < 39) {
        return { ...base, shot: 'contact', fov: 42, camera: v3(34, landY + 2.0, 26), target: v3(0, landY + 5 + h * 0.4, 0) };
      }
      if (t < 46) {
        // Looking west across the dark lowland to Earth low on the horizon, the lander lit from behind us.
        const k = (t - 39) / 7;
        return { ...base, shot: 'landed', fov: 40, camera: v3(36 - 4 * k, landY + 3, 10 + 2 * k), target: v3(-60, landY + 4, -14) };
      }
      const turn = 1.2 + (t - 46) * (this.calm ? 0.01 : 0.035);
      const centre = v3(3, landY + 2.5, 4);
      return { ...base, shot: 'surface', fov: 46, camera: centre.clone().add(v3(Math.sin(turn) * 30, 5, Math.cos(turn) * 30)), target: centre };
    };
    return { roots: [orbitGroup, groundGroup, orbitPlayer], surface, frame };
  }
}
