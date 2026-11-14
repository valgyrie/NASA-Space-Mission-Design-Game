import * as THREE from 'three';
import type { SkyUniforms } from './environment';
import { groundTextures } from './terrainTextures';

/**
 * The ground round the launch pad, in metres: Florida scrub to the west, a sandy clearing and concrete round the
 * pad, a beach, and the Atlantic to the east, out to the horizon on Earth's curve. One mesh, one material: a
 * MeshStandardMaterial (so it takes shadows, sky light and fog) patched to blend the photo textures the Site uses
 * and to draw the sea with the sky reflected, ripples and sun glint.
 */

const EARTH_M = 6_371_000;
/** How far out the ground goes, in metres. */
export const GROUND_REACH = 1_500_000;
/** Where the beach starts, east of the pad (metres along +x), before the coastline's wiggle. */
export const COAST_X = 420;

/** Height of Earth's surface `d` metres from the pad, so the ground curves away to the horizon. */
export function curveDrop(d: number): number {
  return Math.sqrt(Math.max(0, EARTH_M * EARTH_M - d * d)) - EARTH_M;
}

/** Radii of the ground's rings: dense round the pad, sparse far out (each ring a fixed share wider). */
export function ringRadii(count: number, first = 2, reach = GROUND_REACH): number[] {
  const radii = [0];
  const k = Math.pow(reach / first, 1 / (count - 2));
  for (let i = 1; i < count; i++) radii.push(first * Math.pow(k, i - 1));
  return radii;
}

/** A disc on Earth's curve, tangent at the pad. */
function curvedDisc(rings: number, segments: number): THREE.BufferGeometry {
  const radii = ringRadii(rings);
  const positions: number[] = [];
  const index: number[] = [];
  for (let i = 0; i < radii.length; i++) {
    const r = radii[i]!;
    for (let j = 0; j <= segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      positions.push(Math.cos(a) * r, curveDrop(r), Math.sin(a) * r);
    }
  }
  const row = segments + 1;
  for (let i = 0; i < radii.length - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * row + j;
      const b = a + row;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

const COMMON = /* glsl */ `
  uniform sampler2D gGrassA;
  uniform sampler2D gGrassN;
  uniform sampler2D gSandA;
  uniform sampler2D gSandN;
  uniform sampler2D gDirtA;
  uniform sampler2D gDirtN;
  uniform sampler2D gWaterN;
  uniform samplerCube gSkyCube;
  uniform vec3 gSunDir;
  uniform vec3 gSunColour;
  uniform float gTime;
  varying vec3 vGround;

  float gHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float gNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), u.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float gFbm(vec2 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      s += a * gNoise(p);
      p = mat2(1.6, 1.2, -1.2, 1.6) * p;
      a *= 0.5;
    }
    return s / 0.9375;
  }
  // A photo at two scales, the larger one turned, so no tiling grid shows; far away only its average remains.
  vec4 gTwo(sampler2D t, vec2 p, float s1, float s2, float far) {
    vec4 a = texture2D(t, p / s1);
    vec4 b = texture2D(t, mat2(0.8, 0.6, -0.6, 0.8) * p / s2 + 0.37);
    vec4 avg = textureLod(t, vec2(0.5), 12.0);
    return mix(mix(a, b, 0.45), avg, far);
  }
  // East edge of the land: the coastline wiggles along z.
  float gCoast(float z) {
    return ${COAST_X.toFixed(1)} + (gFbm(vec2(z * 0.0007, 3.1)) - 0.5) * 420.0 + (gNoise(vec2(z * 0.012, 7.0)) - 0.5) * 22.0;
  }
  // Concrete: the pad's hardstand, the road west to the blockhouse and the access road running north-south.
  float gConcrete(vec2 p) {
    float pad = length(p) - 31.0;
    float road = max(abs(p.y - 0.0) - 4.0, p.x + 140.0);
    road = max(road, p.x - 0.0);
    float access = max(abs(p.x + 140.0) - 4.5, abs(p.y) - 3000.0);
    vec2 park = abs(p - vec2(-46.0, -40.0)) - vec2(12.0, 32.0);
    float gantry = max(park.x, park.y);
    float d = min(min(pad, gantry), min(road, access));
    return 1.0 - smoothstep(-0.15, 0.15, d);
  }
`;

/** The ground material: scrub, sand, concrete, beach and sea. */
function groundMaterial(sky: SkyUniforms): THREE.MeshStandardMaterial {
  const tex = groundTextures();
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  material.name = 'launch-ground';
  const uniforms = {
    gGrassA: { value: tex.albedo.grass },
    gGrassN: { value: tex.normal.grass },
    gSandA: { value: tex.albedo.sand },
    gSandN: { value: tex.normal.sand },
    gDirtA: { value: tex.albedo.dirt },
    gDirtN: { value: tex.normal.dirt },
    gWaterN: { value: tex.water },
    gSkyCube: sky.skyCube,
    gSunDir: sky.sunDirection,
    gSunColour: sky.sunColour,
    gTime: { value: 0 },
  };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGround;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvGround = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${COMMON}`)
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec2 gp = vGround.xz;
        float gDist = length(cameraPosition - vGround);
        float gFar = smoothstep(60.0, 900.0, gDist);
        float macro = gFbm(gp * 0.004);
        float fine = gFbm(gp * 0.05);
        // Florida scrub: palmetto and grass, olive and dry, with bare sandy soil between.
        vec4 grass = gTwo(gGrassA, gp, 3.1, 19.0, gFar);
        vec4 sandT = gTwo(gSandA, gp, 2.3, 13.0, gFar);
        vec4 dirt = gTwo(gDirtA, gp, 2.7, 15.0, gFar);
        vec3 scrub = grass.rgb * mix(vec3(0.62, 0.78, 0.42), vec3(0.85, 0.9, 0.55), macro);
        vec3 soil = mix(sandT.rgb * vec3(1.0, 0.94, 0.84), dirt.rgb * vec3(1.05, 0.98, 0.86), 0.45);
        float bare = smoothstep(0.62, 0.8, fine * 0.6 + macro * 0.6);
        vec3 land = mix(scrub, soil, bare * 0.7);
        // A cleared, sandy ring round the pad, fading into the scrub with a ragged edge.
        float r = length(gp);
        float clearing = 1.0 - smoothstep(70.0, 125.0, r + (fine - 0.5) * 60.0);
        clearing = max(clearing, (1.0 - smoothstep(6.0, 16.0, abs(gp.y) + (fine - 0.5) * 10.0)) * step(gp.x, 0.0) * step(-150.0, gp.x));
        land = mix(land, soil * vec3(1.06, 1.03, 0.98), clearing);
        // Beach: pale sand, darker and wet at the water.
        float coast = gCoast(gp.y);
        float beach = smoothstep(coast - 6.0, coast + 2.0, gp.x + (fine - 0.5) * 12.0);
        vec3 beachSand = sandT.rgb * vec3(1.18, 1.12, 1.0);
        float wet = smoothstep(coast + 36.0, coast + 46.0, gp.x);
        beachSand *= mix(1.0, 0.62, wet);
        land = mix(land, beachSand, beach);
        // Concrete: pale, a little blotchy, with sawn joints every 6 m and rust-brown burn marks near the pad.
        float conc = gConcrete(gp);
        vec3 concrete = vec3(0.21, 0.205, 0.19) * (0.86 + 0.22 * fine) * mix(vec3(1.0), sandT.rgb * 2.2, 0.12);
        vec2 joint = abs(fract(gp / 6.0 + 0.5) - 0.5) * 6.0;
        concrete *= mix(0.85, 1.0, smoothstep(0.02, 0.07, min(joint.x, joint.y)) * (1.0 - gFar) + gFar);
        float scorch = (1.0 - smoothstep(4.0, 26.0, r + (fine - 0.5) * 14.0));
        concrete = mix(concrete, vec3(0.16, 0.14, 0.12), scorch * 0.65);
        land = mix(land, concrete, conc);
        // Far away the land greys a little toward the haze.
        land = mix(land, land * vec3(0.92, 0.95, 1.0), gFar);
        diffuseColor.rgb *= land;
        float gSea = smoothstep(coast + 40.0, coast + 44.0, gp.x);
        float gBeach = beach;
        float gConc = conc;
        float gBare = bare;
        float gClear = clearing;
        `,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `
        float roughnessFactor = mix(0.95, 0.85, gConc);
        roughnessFactor = mix(roughnessFactor, 0.55, gBeach * smoothstep(gCoast(gp.y) + 30.0, gCoast(gp.y) + 44.0, gp.x));
        `,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
        {
          vec4 nG = gTwo(gGrassN, gp, 3.1, 19.0, gFar);
          vec4 nS = gTwo(gSandN, gp, 2.3, 13.0, gFar);
          vec4 nD = gTwo(gDirtN, gp, 2.7, 15.0, gFar);
          vec4 nL = mix(nG, mix(nS, nD, 0.45), max(gBare * 0.7, gClear));
          nL = mix(nL, nS, gBeach);
          vec2 slope = (nL.xy * 2.0 - 1.0) * (1.0 - gConc * 0.8) * (1.0 - gFar);
          vec3 nWorld = normalize(vec3(slope.x, 1.0, -slope.y));
          normal = normalize((viewMatrix * vec4(nWorld, 0.0)).xyz);
        }
        `,
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `
        if (gSea > 0.0) {
          // The sea: ripples at three scales, the sky reflected by Fresnel, sun glint, deep blue body.
          vec2 p = vec2(gp.x, -gp.y);
          float t = gTime;
          vec2 s1 = texture2D(gWaterN, mat2(0.8, 0.6, -0.6, 0.8) * p / 9.0 + vec2(-t * 0.02, t * 0.015)).rg * 2.0 - 1.0;
          vec2 s2 = texture2D(gWaterN, p / 31.0 + vec2(t * 0.01, t * 0.006)).rg * 2.0 - 1.0;
          vec2 s3 = texture2D(gWaterN, mat2(0.28, -0.96, 0.96, 0.28) * p / 97.0 - vec2(t * 0.005, -t * 0.007)).rg * 2.0 - 1.0;
          float near = 1.0 - smoothstep(80.0, 2500.0, gDist);
          vec2 sl = (s1 * 0.5 * near + s2 * 0.6 + s3 * 0.5) * 0.18 * mix(0.15, 1.0, 1.0 - smoothstep(500.0, 20000.0, gDist));
          vec3 N = normalize(vec3(sl.x, 1.0, -sl.y));
          vec3 V = normalize(cameraPosition - vGround);
          float cosV = max(dot(N, V), 0.0);
          float fresnel = 0.03 + 0.97 * pow(1.0 - cosV, 5.0);
          vec3 R = reflect(-V, N);
          R.y = abs(R.y);
          vec3 skyR = textureLod(gSkyCube, R, 0.0).rgb;
          float sunDot = max(dot(R, gSunDir), 0.0);
          vec3 glint = gSunColour * (pow(sunDot, 900.0) * 40.0 + pow(sunDot, 80.0) * 0.6);
          float lit = max(gSunDir.y, 0.0) * 0.7 + 0.35;
          float shoal = smoothstep(gCoast(gp.y) + 44.0, gCoast(gp.y) + 220.0, gp.x);
          vec3 body = mix(vec3(0.05, 0.28, 0.26), vec3(0.015, 0.07, 0.11), shoal) * gSunColour * lit;
          vec3 sea = mix(body, skyR, fresnel) + glint;
          // Surf: a broken white line along the beach.
          float surf = smoothstep(gCoast(gp.y) + 58.0, gCoast(gp.y) + 45.0, gp.x) * smoothstep(0.45, 0.8, gNoise(p * 0.15 + vec2(t * 0.2, 0.0)) + 0.3 * sin(t * 0.9 + p.x * 0.25));
          sea = mix(sea, gSunColour * 0.8 * lit, surf * 0.7);
          outgoingLight = mix(outgoingLight, sea, gSea);
        }
        #include <opaque_fragment>
        `,
      );
  };
  material.customProgramCacheKey = () => 'launch-ground-1';
  return material;
}

export interface LaunchGround {
  mesh: THREE.Mesh;
  /** Let the sea move. */
  animate(seconds: number): void;
}

/** The ground round the pad out to the horizon. */
export function buildLaunchGround(sky: SkyUniforms): LaunchGround {
  const material = groundMaterial(sky);
  const mesh = new THREE.Mesh(curvedDisc(160, 192), material);
  mesh.name = 'launch-ground';
  mesh.receiveShadow = true;
  const time = (material.userData.uniforms as { gTime: { value: number } }).gTime;
  return {
    mesh,
    animate(seconds) {
      time.value += seconds;
    },
  };
}
