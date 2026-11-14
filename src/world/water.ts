import * as THREE from 'three';
import type { SkyUniforms } from './environment';
import { type Ground, type Lattice, WATER_Y } from './ground';
import { groundTextures } from './terrainTextures';

/**
 * Sea, lake and river water: animated ripples, the sky reflected by Fresnel, sun glint, clear shallows over the
 * sand turning deep blue offshore, a soft edge and a thin line of foam at the shore. Depth comes from the drawn
 * ground's heights, baked into two small textures, so no extra render pass is needed.
 */

/** A lattice's heights as a half-float texture, one texel per vertex. */
function heightTexture(l: Lattice): THREE.DataTexture {
  const data = new Uint16Array(l.n * l.n);
  for (let k = 0; k < data.length; k++) data[k] = THREE.DataUtils.toHalfFloat(l.height[k]!);
  const t = new THREE.DataTexture(data, l.n, l.n, THREE.RedFormat, THREE.HalfFloatType);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}

/** Where a lattice's texture sits: x0, z0 of its first texel's centre, and its size in world units. */
function rect(l: Lattice): THREE.Vector4 {
  return new THREE.Vector4(l.x0, l.z0, l.step * l.n, l.step);
}

const VERTEX = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform sampler2D uRipples;
  uniform samplerCube uSkyCube;
  uniform vec3 uSunDir;
  uniform vec3 uSunColour;
  uniform sampler2D uNear;
  uniform vec4 uNearRect;
  uniform sampler2D uFar;
  uniform vec4 uFarRect;
  uniform float uFlow;
  varying vec3 vWorld;

  float groundAt(vec2 xz) {
    vec2 n = (xz - uNearRect.xy) / uNearRect.z + 0.5 / (uNearRect.z / uNearRect.w);
    if (n.x > 0.0 && n.y > 0.0 && n.x < 1.0 && n.y < 1.0) return texture(uNear, n).r;
    vec2 f = (xz - uFarRect.xy) / uFarRect.z + 0.5 / (uFarRect.z / uFarRect.w);
    if (f.x > 0.0 && f.y > 0.0 && f.x < 1.0 && f.y < 1.0) return texture(uFar, f).r;
    return -4.0;
  }

  float wHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float wNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), u.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  vec2 ripple(vec2 uv) { return texture(uRipples, uv).rg * 2.0 - 1.0; }

  void main() {
    vec3 toEye = cameraPosition - vWorld;
    float dist = length(toEye);
    vec3 V = toEye / dist;
    float depth = ${WATER_Y.toFixed(3)} - groundAt(vWorld.xz);
    if (depth <= 0.0) discard;

    // Ripples at four scales, each drifting its own way and turned against the others, so no pattern repeats.
    // Small ones fade out with distance (they would only shimmer); gusts make broad rougher and calmer patches.
    vec2 p = vec2(vWorld.x, -vWorld.z);
    float t = uTime * uFlow;
    float gust = 0.55 + 0.9 * wNoise(p * 0.018 + vec2(t * 0.012, -t * 0.007));
    vec2 s1 = ripple(mat2(0.8, 0.6, -0.6, 0.8) * p / 2.7 + vec2(-t * 0.021, t * 0.016));
    vec2 s2 = ripple(p / 8.3 + vec2(t * 0.011, t * 0.007));
    vec2 s3 = ripple(mat2(0.28, -0.96, 0.96, 0.28) * p / 21.0 - vec2(t * 0.006, -t * 0.008));
    vec2 s4 = ripple(mat2(-0.6, 0.8, -0.8, -0.6) * p / 57.0 + vec2(t * 0.003, t * 0.002));
    float fine = 1.0 - smoothstep(15.0, 70.0, dist);
    float mid = 1.0 - smoothstep(40.0, 200.0, dist);
    vec2 slope = (s1 * 0.4 * fine + s2 * 0.6 * mid + s3 * (0.55 - 0.25 * (1.0 - mid)) + s4 * 0.35) * 0.2 * gust;
    // Toward the horizon the sea reads as a smooth sheen, not as a pattern.
    slope *= mix(1.0, 0.12, smoothstep(30.0, 260.0, dist));
    vec3 N = normalize(vec3(slope.x, 1.0, -slope.y));

    // Fresnel reflection of the sky: little looking down, nearly a mirror toward the horizon.
    float cosV = max(dot(N, V), 0.0);
    float fresnel = 0.04 + 0.96 * pow(1.0 - cosV, 5.0);
    fresnel = max(fresnel, 0.75 * pow(1.0 - max(V.y, 0.0), 6.0));
    vec3 R = reflect(-V, N);
    R.y = abs(R.y);
    vec3 sky = textureLod(uSkyCube, R, 0.0).rgb;

    // Sun glint: a sharp sparkle and a broad sheen, where the ripples catch the sun.
    float sunDot = max(dot(R, uSunDir), 0.0);
    vec3 glint = uSunColour * (pow(sunDot, 700.0) * 50.0 * gust + pow(sunDot, 60.0) * 0.8);

    // Light inside the water: turquoise over shallow sand, deep blue offshore.
    float absorb = 1.0 - exp(-depth * 0.9);
    vec3 shallow = vec3(0.05, 0.3, 0.27);
    vec3 deep = vec3(0.03, 0.12, 0.17);
    float lit = max(uSunDir.y, 0.0) * 0.7 + 0.35;
    vec3 body = mix(shallow, deep, smoothstep(0.0, 1.0, absorb)) * uSunColour * lit;

    vec3 colour = mix(body, sky, fresnel) + glint;
    float alpha = clamp(0.3 + absorb * 1.1, 0.0, 1.0);
    alpha = max(alpha, fresnel);
    // Soft edge where the water thins out over the beach, with a thin broken line of foam.
    float edge = smoothstep(0.0, 0.04, depth);
    float foamNoise = texture(uRipples, p / 1.7 + vec2(t * 0.03, 0.0)).b;
    float foam = smoothstep(0.08, 0.01, depth) * smoothstep(0.5, 0.85, foamNoise + 0.25 * sin(uTime * 1.3 + p.x * 0.7 + p.y * 0.4));
    colour = mix(colour, uSunColour * 0.85 * lit, foam * 0.65);
    alpha = max(alpha, foam * 0.75) * edge;

    gl_FragColor = vec4(colour, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #ifdef USE_FOG
      vec3 fogSky = textureLod(uSkyCube, normalize(vec3(-V.x, max(-V.y, 0.0) * 0.3 + 0.003, -V.z)), 1.0).rgb;
      #ifdef TONE_MAPPING
        fogSky = toneMapping(fogSky);
      #endif
      fogSky = linearToOutputTexel(vec4(fogSky, 1.0)).rgb;
      float fogAmount = pow(smoothstep(fogNear, fogFar, dist), 1.5);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogSky, fogAmount);
      gl_FragColor.a = mix(gl_FragColor.a, 1.0, fogAmount);
    #endif
  }
`;

export interface WaterSurface {
  mesh: THREE.Mesh;
  /** Let the ripples move. */
  animate(seconds: number): void;
  /** Re-read the near ground's heights (after a building pad changed them). */
  refresh(): void;
}

/** The water surface of a Site, out to the horizon. Hidden when the Site has no water. */
export function buildWater(ground: Ground, sky: SkyUniforms, kind: 'coast' | 'lake' | 'river' | 'none'): WaterSurface {
  const far = ground.far;
  const size = far.step * (far.n - 1) + 1200;
  const middle = far.x0 + (far.step * (far.n - 1)) / 2;
  const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(middle, 0, middle);
  const near = heightTexture(ground.near);
  const farTex = heightTexture(far);
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uRipples: { value: null },
        uSkyCube: { value: null },
        uSunDir: { value: new THREE.Vector3() },
        uSunColour: { value: new THREE.Color() },
        uNear: { value: null },
        uNearRect: { value: rect(ground.near) },
        uFar: { value: null },
        uFarRect: { value: rect(far) },
        uFlow: { value: kind === 'river' ? 2.5 : 1 },
      },
    ]),
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  // Shared values (textures, the sky) are linked, not copied by `merge`.
  const u = material.uniforms;
  u.uRipples!.value = groundTextures().water;
  u.uSkyCube = sky.skyCube;
  u.uSunDir = sky.sunDirection;
  u.uSunColour = sky.sunColour;
  u.uNear!.value = near;
  u.uFar!.value = farTex;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'water';
  mesh.position.y = WATER_Y;
  mesh.renderOrder = 2;
  mesh.visible = kind !== 'none';
  mesh.userData.textures = [near, farTex];
  return {
    mesh,
    animate(seconds) {
      u.uTime!.value += seconds;
    },
    refresh() {
      const data = near.image.data as Uint16Array;
      for (let k = 0; k < data.length; k++) data[k] = THREE.DataUtils.toHalfFloat(ground.near.height[k]!);
      near.needsUpdate = true;
    },
  };
}
