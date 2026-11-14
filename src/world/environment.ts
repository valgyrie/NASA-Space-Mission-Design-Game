import * as THREE from 'three';

/**
 * A daytime sky with soft drifting clouds, and the light it gives: an environment map for PBR materials
 * (`scene.environment`), a small sky cube for water reflections and haze, and the haze colour at the horizon.
 * Any view can call `createSkyEnvironment` with its own renderer and scene.
 *
 * The sky is an artist-tuned gradient (deep blue overhead, a thin pale haze band at the horizon, a warm glow around
 * the sun) rather than a physical scattering model: at the low exposure the sunlit ground needs, a physical sky
 * washes out to white. Its colours are linear HDR values chosen for ACES tone mapping at about exposure 0.3.
 */

export interface SkyOptions {
  /** Unit vector toward the sun. */
  sunDirection: THREE.Vector3;
  /** Haze at the horizon: 1 is a clear day, 2 a hazy one. */
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
  sky: THREE.Mesh;
  uniforms: SkyUniforms;
  /** Average colour of the sky at the horizon, as it appears on screen (for the built-in fog of other materials). */
  horizon: THREE.Color;
  /** Colour and strength of the sunlight that reaches the ground. */
  sunColour: THREE.Color;
  /** Brightness (luminance) of the light the sky casts on level ground, for balancing `scene.environmentIntensity`. */
  skyLight: number;
  /** Keep the sky around the camera and let the clouds drift. */
  update(camera: THREE.Camera, seconds: number): void;
  dispose(): void;
}

/** Sky colours, linear HDR for this exposure (see the note at the top); other exposures scale them to look the same. */
const REFERENCE_EXPOSURE = 0.3;
const ZENITH = new THREE.Color(0.09, 0.34, 1.6);
const MID = new THREE.Color(0.2, 0.72, 2.75);
const HORIZON = new THREE.Color(1.3, 2.15, 3.7);

const VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vDir = world.xyz - cameraPosition;
    gl_Position = projectionMatrix * viewMatrix * world;
    gl_Position.z = gl_Position.w; // on the far plane
  }
`;

const FRAGMENT = /* glsl */ `
  #include <common>
  uniform vec3 uSunDir;
  uniform vec3 uSunColour;
  uniform vec3 uZenith;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform float uHaze;
  uniform float uCoverage;
  uniform float uTime;
  uniform float uSunDisc;
  varying vec3 vDir;

  float sHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float sNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), u.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float sFbm(vec2 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      s += a * sNoise(p);
      p = mat2(1.6, 1.2, -1.2, 1.6) * p + 0.17 * uTime * 0.02;
      a *= 0.5;
    }
    return s / 0.96875;
  }

  void main() {
    vec3 d = normalize(vDir);
    float y = d.y;
    float up = clamp(y, 0.0, 1.0);
    // Deep blue overhead, lighter lower down, and a thin pale haze right at the horizon.
    vec3 colour = mix(uZenith, uMid, pow(1.0 - up, 2.2));
    float haze = pow(1.0 - up, 14.0 / uHaze);
    colour = mix(colour, uHorizon, haze);
    // Below the horizon: the same haze, a little darker (land normally covers it).
    if (y < 0.0) colour = uHorizon;

    // Glow around the sun, brighter near the horizon.
    float cosT = max(dot(d, uSunDir), 0.0);
    colour += uSunColour * (pow(cosT, 10.0) * 0.55 + pow(cosT, 120.0) * 2.0) * (0.6 + 0.4 * haze);
    colour += uSunColour * smoothstep(0.99965, 0.9999, cosT) * 60.0 * uSunDisc;

    // Clouds on a flat layer high above: soft heaps lit from the sun's side, fading into the haze far away.
    if (uCoverage > 0.0 && y > 0.0) {
      vec2 uv = d.xz / (y + 0.06) * 1.1 + vec2(uTime * 0.004, uTime * 0.0015);
      float n = sFbm(uv);
      float cover = smoothstep(1.0 - uCoverage, 1.0 - uCoverage + 0.2, n);
      // Thicker cloud facing away from the sun is darker underneath.
      float toward = sFbm(uv + normalize(uSunDir.xz + 1e-4) * 0.09);
      float light = clamp(0.62 + (n - toward) * 3.2, 0.2, 1.0);
      vec3 lit = uSunColour * 7.5 + uMid * 0.4;
      vec3 shade = uMid * 0.55 + vec3(0.45, 0.48, 0.55);
      vec3 cloud = mix(shade, lit, light);
      // Bright silver edge on thin cloud near the sun.
      cloud += uSunColour * pow(cosT, 6.0) * (1.0 - cover) * 4.0;
      float far = pow(1.0 - up, 6.0);
      cloud = mix(cloud, uHorizon * 1.05, far * 0.85);
      colour = mix(colour, cloud, cover * smoothstep(0.0, 0.1, y) * 0.92);
    }
    gl_FragColor = vec4(colour, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function makeSky(o: SkyOptions, withClouds: boolean, sunColour: THREE.Color, exposure: number): THREE.Mesh {
  const k = REFERENCE_EXPOSURE / exposure;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: o.sunDirection.clone().normalize() },
      uSunColour: { value: sunColour.clone().multiplyScalar(k) },
      uZenith: { value: ZENITH.clone().multiplyScalar(k) },
      uMid: { value: MID.clone().multiplyScalar(k) },
      uHorizon: { value: HORIZON.clone().multiplyScalar(k) },
      uHaze: { value: o.turbidity ?? 1 },
      uCoverage: { value: withClouds ? (o.cloudCoverage ?? 0.42) : 0 },
      uTime: { value: 0 },
      uSunDisc: { value: withClouds ? 1 : 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), material);
  sky.scale.setScalar(1000);
  sky.frustumCulled = false;
  sky.renderOrder = -1;
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

/** Render a full-screen quad of `fragment` (which reads `cube` and `vUv`) and average the pixels (linear). */
function averageOf(renderer: THREE.WebGLRenderer, cube: THREE.Texture, w: number, h: number, fragment: string): THREE.Color {
  const target = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
  const material = new THREE.ShaderMaterial({
    uniforms: { cube: { value: cube } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform samplerCube cube;\nvarying vec2 vUv;\nvoid main() {\n${fragment}\n}`,
    depthTest: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  const scene = new THREE.Scene().add(quad);
  const before = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(scene, new THREE.Camera());
  const pixels = new Uint16Array(w * h * 4);
  renderer.readRenderTargetPixels(target, 0, 0, w, h, pixels);
  renderer.setRenderTarget(before);
  const sum = [0, 0, 0];
  for (let i = 0; i < w * h; i++) for (let c = 0; c < 3; c++) sum[c]! += THREE.DataUtils.fromHalfFloat(pixels[i * 4 + c]!) / (w * h);
  target.dispose();
  material.dispose();
  quad.geometry.dispose();
  const [r, g, b] = sum as [number, number, number];
  return Number.isFinite(r + g + b) && r + g + b > 0 ? new THREE.Color(r, g, b) : new THREE.Color(0.35, 0.45, 0.6);
}

/**
 * Add a sky to a scene and light the scene with it: sets `scene.environment` (and `scene.fog`'s colour if there is
 * fog). The caller adds its own sun light (use `sunColour` and the same direction) and shadows, and can scale
 * `scene.environmentIntensity` by `skyLight`.
 */
export function createSkyEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, options: SkyOptions): SkyEnvironment {
  // Sunlight through the air: warmer and weaker the lower the sun.
  const elevation = Math.max(0.02, options.sunDirection.y);
  const sunColour = new THREE.Color(1, 0.955 - 0.25 * (1 - elevation) ** 4, 0.88 - 0.4 * (1 - elevation) ** 3);

  const sky = makeSky(options, true, sunColour, renderer.toneMappingExposure);
  scene.add(sky);

  // A sky without the sun's disc and the drifting clouds, for reflections and image-based light (the sun is a light).
  const envScene = new THREE.Scene();
  const envSky = makeSky(options, false, sunColour, renderer.toneMappingExposure);
  envScene.add(envSky);
  const cubeTarget = new THREE.WebGLCubeRenderTarget(128, {
    type: THREE.HalfFloatType,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const cubeCamera = new THREE.CubeCamera(0.1, 5000, cubeTarget);
  cubeCamera.update(renderer, envScene); // render targets get no tone mapping: the cube holds linear light

  // Light from the sky is a little less blue than the sky looks, so white walls stay white in the shade.
  const envUniforms = (envSky.material as THREE.ShaderMaterial).uniforms;
  for (const name of ['uZenith', 'uMid', 'uHorizon'] as const) {
    const c = envUniforms[name]!.value as THREE.Color;
    const grey = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    c.lerp(new THREE.Color(grey, grey, grey), 0.85);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(envScene, 0.02, 0.1, 5000);
  pmrem.dispose();
  scene.environment = envTarget.texture;

  const horizonLinear = averageOf(
    renderer,
    cubeTarget.texture,
    32,
    1,
    'float a = vUv.x * 6.2831853; gl_FragColor = vec4(textureLod(cube, normalize(vec3(cos(a), 0.03, sin(a))), 2.0).rgb, 1.0);',
  );
  // Cosine-weighted rings over the upper half.
  const irradiance = averageOf(
    renderer,
    cubeTarget.texture,
    32,
    16,
    'float a = vUv.x * 6.2831853; float y = sqrt(vUv.y); float r = sqrt(1.0 - y * y);' +
      'gl_FragColor = vec4(textureLod(cube, vec3(cos(a) * r, y, sin(a) * r), 2.0).rgb, 1.0);',
  );
  const horizon = toScreen(horizonLinear, renderer.toneMappingExposure);
  if (scene.fog) scene.fog.color.copy(horizon);
  scene.background = null;

  const uniforms: SkyUniforms = {
    skyCube: { value: cubeTarget.texture },
    sunDirection: { value: options.sunDirection.clone().normalize() },
    sunColour: { value: sunColour.clone() },
  };

  const skyUniforms = (sky.material as THREE.ShaderMaterial).uniforms;
  let time = 0;
  return {
    sky,
    uniforms,
    horizon,
    sunColour,
    skyLight: 0.2126 * irradiance.r + 0.7152 * irradiance.g + 0.0722 * irradiance.b,
    update(camera, seconds) {
      sky.position.copy(camera.position);
      time += seconds;
      skyUniforms.uTime!.value = time;
    },
    dispose() {
      scene.remove(sky);
      sky.geometry.dispose();
      (sky.material as THREE.Material).dispose();
      envSky.geometry.dispose();
      (envSky.material as THREE.Material).dispose();
      cubeTarget.dispose();
      envTarget.dispose();
      if (scene.environment === envTarget.texture) scene.environment = null;
    },
  };
}
