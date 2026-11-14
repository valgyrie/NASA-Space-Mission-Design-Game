import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

/**
 * A physically based daytime sky with soft clouds, and the light it gives: an environment map for PBR materials
 * (`scene.environment`), a small sky cube for water reflections and haze, and the haze colour at the horizon.
 * Any view can call `createSkyEnvironment` with its own renderer and scene.
 */

export interface SkyOptions {
  /** Unit vector toward the sun. */
  sunDirection: THREE.Vector3;
  /** Haze in the air: 2 is a clear day, 10 a hazy one. */
  turbidity?: number;
  /** 0 = clear sky, 1 = overcast. */
  cloudCoverage?: number;
}

/** Uniforms other shaders share with the sky: the sky cube (linear HDR), the sun's direction and colour. */
export interface SkyUniforms {
  skyCube: { value: THREE.Texture | null };
  sunDirection: { value: THREE.Vector3 };
  sunColour: { value: THREE.Color };
}

export interface SkyEnvironment {
  /** The visible sky dome. It follows the camera. */
  sky: Sky;
  uniforms: SkyUniforms;
  /** Average colour of the sky at the horizon, as it appears on screen (for the built-in fog of other materials). */
  horizon: THREE.Color;
  /** Colour and strength of the sunlight that reaches the ground. */
  sunColour: THREE.Color;
  /** Keep the sky around the camera and let the clouds drift. */
  update(camera: THREE.Camera, seconds: number): void;
  dispose(): void;
}

const SKY_PARAMS = { rayleigh: 2, mieCoefficient: 0.003, mieDirectionalG: 0.8 };

function makeSky(o: SkyOptions, sunDisc: boolean): Sky {
  const sky = new Sky();
  const u = sky.material.uniforms;
  u.turbidity!.value = o.turbidity ?? 1.8;
  u.rayleigh!.value = SKY_PARAMS.rayleigh;
  u.mieCoefficient!.value = SKY_PARAMS.mieCoefficient;
  u.mieDirectionalG!.value = SKY_PARAMS.mieDirectionalG;
  u.sunPosition!.value.copy(o.sunDirection);
  u.cloudCoverage!.value = sunDisc ? (o.cloudCoverage ?? 0.32) : 0;
  u.cloudDensity!.value = 0.55;
  u.cloudElevation!.value = 0.6;
  u.cloudScale!.value = 0.00022;
  u.showSunDisc!.value = sunDisc ? 1 : 0;
  sky.scale.setScalar(1000);
  sky.frustumCulled = false;
  sky.name = 'sky';
  return sky;
}

/** Three's ACES filmic curve and the sRGB transfer, in JS: how a linear colour ends up on screen. */
function toScreen(c: THREE.Color, exposure: number): THREE.Color {
  const rrt = (v: number) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
  const r0 = (c.r * exposure) / 0.6;
  const g0 = (c.g * exposure) / 0.6;
  const b0 = (c.b * exposure) / 0.6;
  const r1 = rrt(0.59719 * r0 + 0.35458 * g0 + 0.04823 * b0);
  const g1 = rrt(0.076 * r0 + 0.90834 * g0 + 0.01566 * b0);
  const b1 = rrt(0.0284 * r0 + 0.13383 * g0 + 0.83777 * b0);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const srgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  return new THREE.Color().setRGB(
    srgb(clamp(1.60475 * r1 - 0.53108 * g1 - 0.07367 * b1)),
    srgb(clamp(-0.10208 * r1 + 1.10813 * g1 - 0.00605 * b1)),
    srgb(clamp(-0.00327 * r1 - 0.07276 * g1 + 1.07602 * b1)),
    THREE.LinearSRGBColorSpace,
  );
}

/** Average linear colour of the sky cube around the horizon, a little above it. */
function horizonColour(renderer: THREE.WebGLRenderer, cube: THREE.Texture): THREE.Color {
  const width = 32;
  const target = new THREE.WebGLRenderTarget(width, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const material = new THREE.ShaderMaterial({
    uniforms: { cube: { value: cube } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform samplerCube cube;
      varying vec2 vUv;
      void main() {
        float a = vUv.x * 6.2831853;
        gl_FragColor = vec4(textureLod(cube, normalize(vec3(cos(a), 0.06, sin(a))), 3.0).rgb, 1.0);
      }`,
    depthTest: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  const scene = new THREE.Scene().add(quad);
  const camera = new THREE.Camera();
  const before = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  const pixels = new Uint16Array(width * 4);
  renderer.readRenderTargetPixels(target, 0, 0, width, 1, pixels);
  renderer.setRenderTarget(before);
  const sum = [0, 0, 0];
  for (let i = 0; i < width; i++) for (let c = 0; c < 3; c++) sum[c]! += THREE.DataUtils.fromHalfFloat(pixels[i * 4 + c]!) / width;
  target.dispose();
  material.dispose();
  quad.geometry.dispose();
  const [r, g, b] = sum as [number, number, number];
  return Number.isFinite(r + g + b) && r + g + b > 0 ? new THREE.Color(r, g, b) : new THREE.Color(0.35, 0.45, 0.6);
}

/**
 * Add a sky to a scene and light the scene with it: sets `scene.environment` (and `scene.fog`'s colour if there is
 * fog). The caller adds its own sun light (use `sunColour` and the same direction) and shadows.
 */
export function createSkyEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, options: SkyOptions): SkyEnvironment {
  const sky = makeSky(options, true);
  scene.add(sky);

  // A sky without the sun's disc, for reflections and image-based light (the sun itself is a light).
  const envScene = new THREE.Scene();
  const envSky = makeSky(options, false);
  envScene.add(envSky);
  const cubeTarget = new THREE.WebGLCubeRenderTarget(128, {
    type: THREE.HalfFloatType,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const cubeCamera = new THREE.CubeCamera(0.1, 5000, cubeTarget);
  cubeCamera.update(renderer, envScene);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(envScene, 0.02, 0.1, 5000);
  pmrem.dispose();
  scene.environment = envTarget.texture;

  // Sunlight through the air: warmer and weaker the lower the sun.
  const elevation = Math.max(0.02, options.sunDirection.y);
  const sunColour = new THREE.Color(1, 0.955 - 0.25 * (1 - elevation) ** 4, 0.88 - 0.4 * (1 - elevation) ** 3);

  const horizonLinear = horizonColour(renderer, cubeTarget.texture);
  const horizon = toScreen(horizonLinear, renderer.toneMappingExposure);
  if (scene.fog) scene.fog.color.copy(horizon);
  scene.background = null;

  const uniforms: SkyUniforms = {
    skyCube: { value: cubeTarget.texture },
    sunDirection: { value: options.sunDirection.clone().normalize() },
    sunColour: { value: sunColour.clone() },
  };

  let time = 0;
  return {
    sky,
    uniforms,
    horizon,
    sunColour,
    update(camera, seconds) {
      sky.position.copy(camera.position);
      time += seconds;
      sky.material.uniforms.time!.value = time;
    },
    dispose() {
      scene.remove(sky);
      sky.geometry.dispose();
      sky.material.dispose();
      envSky.geometry.dispose();
      envSky.material.dispose();
      cubeTarget.dispose();
      envTarget.dispose();
      if (scene.environment === envTarget.texture) scene.environment = null;
    },
  };
}
