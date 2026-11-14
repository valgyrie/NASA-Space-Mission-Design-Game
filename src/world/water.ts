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
  uniform float uAerial;
  uniform float uFlow;
  varying vec3 vWorld;

  float groundAt(vec2 xz) {
    vec2 n = (xz - uNearRect.xy) / uNearRect.z + 0.5 / (uNearRect.z / uNearRect.w);
    if (n.x > 0.0 && n.y > 0.0 && n.x < 1.0 && n.y < 1.0) return texture(uNear, n).r;
    vec2 f = (xz - uFarRect.xy) / uFarRect.z + 0.5 / (uFarRect.z / uFarRect.w);
    if (f.x > 0.0 && f.y > 0.0 && f.x < 1.0 && f.y < 1.0) return texture(uFar, f).r;
    return -4.0;
  }

  vec3 ripple(vec2 uv) { return texture(uRipples, uv).rgb * 2.0 - 1.0; }

  void main() {
    vec3 toEye = cameraPosition - vWorld;
    float dist = length(toEye);
    vec3 V = toEye / dist;
    float depth = ${WATER_Y.toFixed(3)} - groundAt(vWorld.xz);
    if (depth <= 0.0) discard;

    // Two layers of ripples drifting different ways, calmer far away (where they would only shimmer).
    vec2 p = vec2(vWorld.x, -vWorld.z);
    vec3 r1 = ripple(p / 9.0 + vec2(uTime * 0.011, uTime * 0.007) * uFlow);
    vec3 r2 = ripple(p / 23.0 * mat2(0.8, 0.6, -0.6, 0.8) - vec2(uTime * 0.006, -uTime * 0.009) * uFlow);
    vec3 r3 = ripple(p / 3.1 + vec2(-uTime * 0.02, uTime * 0.015) * uFlow);
    vec2 slope = (r1.xy * 0.6 + r2.xy * 0.8 + r3.xy * 0.35) * mix(0.36, 0.12, smoothstep(30.0, 260.0, dist));
    vec3 N = normalize(vec3(slope.x, 1.0, -slope.y));

    // Fresnel reflection of the sky.
    float cosV = max(dot(N, V), 0.0);
    float fresnel = 0.02 + 0.98 * pow(1.0 - cosV, 5.0);
    vec3 R = reflect(-V, N);
    R.y = abs(R.y);
    vec3 sky = textureLod(uSkyCube, R, 0.0).rgb;

    // Sun glint: a sharp highlight and a broad sheen.
    float sunDot = max(dot(R, uSunDir), 0.0);
    vec3 glint = uSunColour * (pow(sunDot, 900.0) * 60.0 + pow(sunDot, 90.0) * 1.2);

    // Light inside the water: turquoise over shallow sand, deep blue offshore.
    float absorb = 1.0 - exp(-depth * 1.35);
    vec3 shallow = vec3(0.07, 0.3, 0.28);
    vec3 deep = vec3(0.012, 0.075, 0.13);
    float lit = max(uSunDir.y, 0.0) * 0.7 + 0.35;
    vec3 body = mix(shallow, deep, smoothstep(0.0, 1.0, absorb)) * uSunColour * lit;

    vec3 colour = mix(body, sky, fresnel) + glint;
    float alpha = clamp(0.25 + absorb * 1.1, 0.0, 1.0);
    alpha = max(alpha, fresnel);
    // Soft edge where the water thins out over the beach, with a thin line of foam.
    float edge = smoothstep(0.0, 0.05, depth);
    float foamNoise = texture(uRipples, p / 1.7 + vec2(uTime * 0.03, 0.0)).b;
    float foam = smoothstep(0.1, 0.0, depth) * smoothstep(0.55, 0.9, foamNoise + 0.25 * sin(uTime * 1.3 + p.x * 0.7 + p.y * 0.4));
    colour = mix(colour, uSunColour * 0.9 * lit, foam * 0.6);
    alpha = max(alpha, foam * 0.7) * edge;

    gl_FragColor = vec4(colour, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #ifdef USE_FOG
      vec3 fogSky = textureLod(uSkyCube, normalize(vec3(-V.x, max(-V.y, 0.0) * 0.3 + 0.003, -V.z)), 1.0).rgb;
      #ifdef TONE_MAPPING
        fogSky = toneMapping(fogSky);
      #endif
      fogSky = linearToOutputTexel(vec4(fogSky, 1.0)).rgb;
      float fogAmount = max(smoothstep(fogNear, fogFar, dist), (1.0 - exp(-dist * uAerial)) * 0.45);
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
        uAerial: { value: 0.002 },
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
