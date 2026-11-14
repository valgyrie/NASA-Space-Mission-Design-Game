import * as THREE from 'three';
import type { SiteClimate } from '../site/site';
import type { SkyUniforms } from './environment';
import { type GroundLook, type Lattice, WATER_Y } from './ground';
import { GROUND_KINDS, groundTextures } from './terrainTextures';

export { STEP, WATER_Y } from './ground';
/** Colour of deep water, for anything that needs a flat water colour. */
export const WATER = 0x1d4f6e;

/** The vertex data of a lattice, shared by every mesh drawn from it (the Site and the land around it). */
export interface LatticeBuffers {
  lattice: Lattice;
  position: THREE.BufferAttribute;
  normal: THREE.BufferAttribute;
  attributes: Record<string, THREE.BufferAttribute>;
  /** Lattice vertices around the outer edge, in order, when there is a skirt; skirt vertex k hangs under edge[k]. */
  edge: number[];
}

/** Fill the normals of a range of lattice vertices from the heights around them. */
function writeNormals(l: Lattice, normal: Float32Array, i0: number, i1: number, j0: number, j1: number): void {
  const { n, height: h, step } = l;
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const xa = Math.max(0, i - 1);
      const xb = Math.min(n - 1, i + 1);
      const za = Math.max(0, j - 1);
      const zb = Math.min(n - 1, j + 1);
      const dx = (h[j * n + xb]! - h[j * n + xa]!) / ((xb - xa) * step);
      const dz = (h[zb * n + i]! - h[za * n + i]!) / ((zb - za) * step);
      const len = Math.hypot(dx, 1, dz);
      const v = (j * n + i) * 3;
      normal[v] = -dx / len;
      normal[v + 1] = 1 / len;
      normal[v + 2] = -dz / len;
    }
}

/**
 * Vertex buffers for a lattice: positions, normals and the ground looks. With `skirt`, extra vertices along the
 * outer edge hang a short curtain down, hiding any crack against coarser land beyond.
 */
export function latticeBuffers(l: Lattice, look: GroundLook, skirt: boolean): LatticeBuffers {
  const { n } = l;
  const edge: number[] = [];
  if (skirt) {
    for (let i = 0; i < n - 1; i++) edge.push(i); // top row
    for (let j = 0; j < n - 1; j++) edge.push(j * n + n - 1); // right column
    for (let i = n - 1; i > 0; i--) edge.push((n - 1) * n + i); // bottom row
    for (let j = n - 1; j > 0; j--) edge.push(j * n); // left column
  }
  const count = n * n + edge.length;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const mix = new Float32Array(count * 4);
  const ore = new Float32Array(count * 4);
  const site = new Float32Array(count);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const v = j * n + i;
      pos[v * 3] = l.x0 + i * l.step;
      pos[v * 3 + 1] = l.height[v]!;
      pos[v * 3 + 2] = l.z0 + j * l.step;
    }
  writeNormals(l, nor, 0, n - 1, 0, n - 1);
  mix.set(look.mix);
  ore.set(look.ore);
  site.set(look.site);
  edge.forEach((v, k) => {
    const s = n * n + k;
    pos[s * 3] = pos[v * 3]!;
    pos[s * 3 + 1] = pos[v * 3 + 1]! - 1.5;
    pos[s * 3 + 2] = pos[v * 3 + 2]!;
    for (let c = 0; c < 3; c++) nor[s * 3 + c] = nor[v * 3 + c]!;
    for (let c = 0; c < 4; c++) {
      mix[s * 4 + c] = mix[v * 4 + c]!;
      ore[s * 4 + c] = ore[v * 4 + c]!;
    }
    site[s] = site[v]!;
  });
  const buffers: LatticeBuffers = {
    lattice: l,
    position: new THREE.BufferAttribute(pos, 3),
    normal: new THREE.BufferAttribute(nor, 3),
    attributes: {
      aMix: new THREE.BufferAttribute(mix, 4),
      aOre: new THREE.BufferAttribute(ore, 4),
      aSite: new THREE.BufferAttribute(site, 1),
    },
    edge,
  };
  return buffers;
}

/** After the lattice heights changed in a range (a building pad), copy them to the vertex buffers. */
export function updateLatticeBuffers(b: LatticeBuffers, i0: number, i1: number, j0: number, j1: number): void {
  const l = b.lattice;
  const pos = b.position.array as Float32Array;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) pos[(j * l.n + i) * 3 + 1] = l.height[j * l.n + i]!;
  writeNormals(l, b.normal.array as Float32Array, Math.max(0, i0 - 1), Math.min(l.n - 1, i1 + 1), Math.max(0, j0 - 1), Math.min(l.n - 1, j1 + 1));
  b.position.needsUpdate = true;
  b.normal.needsUpdate = true;
}

/**
 * A mesh's triangles over the cells of a lattice that `include` accepts (cell (i, j) spans vertices i…i+1, j…j+1),
 * plus the skirt if the buffers have one and `withSkirt` is set.
 */
export function latticeGeometry(b: LatticeBuffers, include: (i: number, j: number) => boolean, withSkirt: boolean): THREE.BufferGeometry {
  const { n } = b.lattice;
  const index: number[] = [];
  for (let j = 0; j < n - 1; j++)
    for (let i = 0; i < n - 1; i++) {
      if (!include(i, j)) continue;
      const a = j * n + i;
      const bb = a + 1;
      const c = a + n;
      const d = c + 1;
      index.push(a, c, bb, bb, c, d);
    }
  const edge = b.edge;
  if (withSkirt && edge.length > 0) {
    for (let k = 0; k < edge.length; k++) {
      const v0 = edge[k]!;
      const v1 = edge[(k + 1) % edge.length]!;
      const s0 = n * n + k;
      const s1 = n * n + ((k + 1) % edge.length);
      // Both windings, so the curtain shows from either side.
      index.push(v0, s0, v1, v1, s0, s1, v0, v1, s0, v1, s1, s0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', b.position);
  g.setAttribute('normal', b.normal);
  for (const [name, attr] of Object.entries(b.attributes)) g.setAttribute(name, attr);
  g.setIndex(n * n > 65535 ? new THREE.Uint32BufferAttribute(index, 1) : new THREE.Uint16BufferAttribute(index, 1));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

/** Flat colours per ground kind, used until the photographs have loaded (linear RGB). */
const FALLBACK = {
  grass: [0.08, 0.09, 0.025],
  sand: [0.25, 0.185, 0.105],
  dirt: [0.19, 0.12, 0.075],
  rock: [0.15, 0.11, 0.05],
  snow: [0.55, 0.57, 0.62],
};

/** Repeat size of each ground photograph, in tiles; the second layer is this many times larger. */
const TEXTURE_TILES = { grass: 7, sand: 5, dirt: 5, rock: 5, snow: 9 };
const LARGE_LAYER = 3.7;

const SHADER_HEAD = /* glsl */ `
uniform sampler2D gAlb[5];
uniform sampler2D gNrm[5];
uniform float gScale[5];
uniform vec3 gFallback[5];
uniform float gReady;
uniform vec3 gGrassTint;
uniform vec3 gSandTint;
uniform float gSnowBoost;
uniform vec2 gRockSlope;
uniform samplerCube gSkyCube;
uniform float gAerial;
uniform float gWaterY;
varying vec3 vGWorld;
varying vec3 vGNormal;
varying vec4 vMix;
varying vec4 vOre;
varying float vSite;
vec3 gNormalW;
float gRough;

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
`;

/** Which texture slot each layer uses, unrolled (GLSL ES needs constant sampler indices). */
const SAMPLE_LAYERS = GROUND_KINDS.map(
  (_, k) => /* glsl */ `
  if (w[${k}] > 0.002) {
    vec2 uvA = p / gScale[${k}];
    vec2 uvB = rot * p / (gScale[${k}] * ${LARGE_LAYER.toFixed(2)});
    vec2 dA = vec2(1.0) / gScale[${k}];
    vec3 cA = textureGrad(gAlb[${k}], uvA, dpx * dA, dpy * dA).rgb;
    vec3 cB = textureGrad(gAlb[${k}], uvB + 0.37, rot * dpx * dA / ${LARGE_LAYER.toFixed(2)}, rot * dpy * dA / ${LARGE_LAYER.toFixed(2)}).rgb;
    vec4 nA = textureGrad(gNrm[${k}], uvA, dpx * dA, dpy * dA);
    vec4 nB = textureGrad(gNrm[${k}], uvB + 0.37, rot * dpx * dA / ${LARGE_LAYER.toFixed(2)}, rot * dpy * dA / ${LARGE_LAYER.toFixed(2)});
    alb[${k}] = mix(cA, cB, layerMix);
    avg[${k}] = textureLod(gAlb[${k}], vec2(0.5), 12.0).rgb;
    nrm[${k}] = mix(nA.rgb, nB.rgb, layerMix);
  }`,
).join('\n');

const SHADER_GROUND = /* glsl */ `
  vec3 gN = normalize(vGNormal);
  vec2 p = vec2(vGWorld.x, -vGWorld.z);
  vec2 dpx = dFdx(p);
  vec2 dpy = dFdy(p);
  float slope = 1.0 - gN.y;
  float macro = gFbm(p * 0.035);
  float detail = gFbm(p * 0.45 + 7.3);
  // Far away, photographs fade to their average colour and flatten, so their pattern never repeats visibly.
  float camDist = length(vGWorld - cameraPosition);
  float farK = smoothstep(30.0, 170.0, camDist);
  // Noise that breaks up where one kind of ground ends and the next begins.
  float brk = (gFbm(p * 0.21 + 5.1) - 0.5) * 0.8 + (detail - 0.5) * 0.4;
  float brk2 = (gFbm(p * 0.13 - 9.7) - 0.5) * 0.9 + (detail - 0.5) * 0.3;

  // Weights: sand, dry soil, rock, snow from the land; rock on steep slopes and high ground; grass is the rest.
  float wSand = smoothstep(0.3, 0.7, vMix.x + brk * 0.85);
  float wDirt = clamp(vMix.y + brk2 * 0.5 * smoothstep(0.0, 0.25, vMix.y), 0.0, 1.0);
  float wRock = clamp((vMix.z + brk2 * 0.75 - 0.18) * 2.0, 0.0, 1.0);
  float wSnow = smoothstep(0.25, 0.75, vMix.w + brk * 0.6);
  float steep = smoothstep(gRockSlope.x, gRockSlope.y, slope + brk * 0.12);
  steep = max(steep, smoothstep(0.07, 0.2, slope + brk * 0.08) * smoothstep(2.0, 3.8, vGWorld.y) * 0.85);
  wRock = max(wRock, steep);
  wSnow *= 1.0 - smoothstep(gRockSlope.y, gRockSlope.y + 0.12, slope);
  wDirt = max(wDirt, (1.0 - wSnow) * smoothstep(0.62, 0.82, gFbm(p * 0.08 + 3.1)) * 0.35 * (1.0 - wSand));
  // Grass gives way to soil at the edge of rock and sand.
  wDirt = max(wDirt, (1.0 - wSnow) * 0.35 * max(wRock, wSand) * (1.0 - max(wRock, wSand)) * 4.0 * 0.5);
  float wSum = wSand + wDirt + wRock + wSnow;
  if (wSum > 1.0) { wSand /= wSum; wDirt /= wSum; wRock /= wSum; wSnow /= wSum; }
  float wGrass = max(0.0, 1.0 - wSand - wDirt - wRock - wSnow);
  float w[5];
  w[0] = wGrass;
  w[1] = wSand;
  w[2] = wDirt;
  w[3] = wRock;
  w[4] = wSnow;

  vec3 alb[5];
  vec3 nrm[5];
  vec3 avg[5];
  for (int k = 0; k < 5; k++) { alb[k] = gFallback[k]; nrm[k] = vec3(0.5, 0.5, 0.85); avg[k] = gFallback[k]; }
  float layerMix = clamp(0.25 + (macro - 0.5) * 1.2, 0.0, 0.75);
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  if (gReady > 0.5) {
    ${SAMPLE_LAYERS}
  }
  // Sand: the photograph's ripples, graded to a warm sand colour with more contrast, in broad drifts.
  float sandLum = dot(alb[1], vec3(0.333)) / max(dot(avg[1], vec3(0.333)), 0.02);
  alb[1] = gSandTint * clamp(1.0 + (sandLum - 1.0) * 2.2, 0.4, 1.8) * (0.86 + 0.28 * gFbm(p * 0.09 + 1.3));
  avg[1] = gSandTint;
  alb[0] *= gGrassTint * (0.85 + 0.3 * gFbm(p * 0.02 + 11.0));
  avg[0] *= gGrassTint;
  alb[4] = min(alb[4] * gSnowBoost + 0.05, vec3(0.9));
  avg[4] = min(avg[4] * gSnowBoost + 0.05, vec3(0.9));
  for (int k = 0; k < 5; k++) {
    alb[k] = mix(alb[k], avg[k] * (0.9 + 0.2 * detail), farK * 0.6);
    nrm[k] = mix(nrm[k], vec3(0.5, 0.5, nrm[k].b), farK * 0.7);
  }

  // Height blend: where kinds meet, the higher-looking one (bright stones, sand) shows through in patches.
  float hi = 0.0;
  float t[5];
  for (int k = 0; k < 5; k++) {
    t[k] = w[k] > 0.002 ? w[k] + (dot(alb[k], vec3(0.33)) * (k == 3 ? 0.4 : 1.0) + (detail - 0.5) * 0.6) * 0.35 : -1.0;
    hi = max(hi, t[k]);
  }
  float sum = 0.0;
  for (int k = 0; k < 5; k++) { t[k] = max(t[k] - hi + 0.25, 0.0); sum += t[k]; }
  vec3 albedo = vec3(0.0);
  vec3 tn = vec3(0.0);
  for (int k = 0; k < 5; k++) { albedo += alb[k] * t[k] / sum; tn += nrm[k] * t[k] / sum; }
  albedo *= 0.88 + 0.24 * macro;

  // Deposits: a patch of ore-coloured stony ground with a ragged edge, readable from the whole-Site view.
  float oreAmount = vOre.a;
  if (oreAmount > 0.01) {
    vec3 oreColour = pow(vOre.rgb / oreAmount, vec3(2.2));
    float edgeNoise = (gFbm(p * 0.9 + 4.0) - 0.5) * 0.5 + (gNoise(p * 5.0) - 0.5) * 0.12;
    // A solid core and, around it, scattered stones thinning out into the ground.
    float spread = max(smoothstep(0.36, 0.42, oreAmount + edgeNoise),
      smoothstep(0.2, 0.36, oreAmount + edgeNoise) * step(0.62, gNoise(p * 7.0 + 1.7)));
    float grains = 0.65 + 0.7 * gNoise(p * 9.0) * (1.0 - farK * 0.7);
    float stones = smoothstep(0.55, 0.75, gNoise(p * 3.3 + 2.0));
    vec3 ore = oreColour * (0.75 + 0.35 * stones) * grains;
    // Pale ores stay stone-coloured rather than glowing white.
    ore *= min(1.0, 0.3 / max(dot(oreColour, vec3(0.3, 0.59, 0.11)), 0.01));
    ore = mix(vec3(dot(ore, vec3(0.3, 0.59, 0.11))), ore, 0.8);
    albedo = mix(albedo, ore, spread * 0.92);
    tn = mix(tn, vec3(0.5 + (gNoise(p * 6.0) - 0.5) * 0.3, 0.5 + (gNoise(p * 6.0 + 3.0) - 0.5) * 0.3, 0.6), spread * 0.7);
  }

  // Damp ground at the water's edge.
  float wet = smoothstep(gWaterY + 0.15, gWaterY, vGWorld.y);
  albedo *= 1.0 - 0.4 * wet;

  // The land around the Site is a little paler and greyer, so the Site stands out.
  float outside = 1.0 - vSite;
  albedo = mix(albedo, vec3(dot(albedo, vec3(0.3, 0.59, 0.11))), 0.14 * outside) * (1.0 - 0.04 * outside);

  diffuseColor.rgb = albedo;
  vec2 tnxy = (tn.rg * 2.0 - 1.0) * 1.1;
  gNormalW = normalize(gN + vec3(tnxy.x, 0.0, -tnxy.y));
  gRough = clamp(mix(tn.b, 0.35, wet), 0.3, 1.0);
`;

const SHADER_FOG = /* glsl */ `
#ifdef USE_FOG
  vec3 fogRay = vGWorld - cameraPosition;
  float fogDist = length(fogRay);
  vec3 fogDir = fogRay / fogDist;
  vec3 fogSky = textureLod(gSkyCube, normalize(vec3(fogDir.x, max(fogDir.y, 0.0) * 0.3 + 0.003, fogDir.z)), 1.0).rgb;
  #ifdef TONE_MAPPING
    fogSky = toneMapping(fogSky);
  #endif
  fogSky = linearToOutputTexel(vec4(fogSky, 1.0)).rgb;
  float fogAmount = max(smoothstep(fogNear, fogFar, fogDist), (1.0 - exp(-fogDist * gAerial)) * 0.45);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogSky, fogAmount);
#endif
`;

/** Shared settings of the terrain shader that change with the climate. */
export interface TerrainLook {
  climate: SiteClimate;
}

/**
 * Photographic ground: grass, sand, dry soil, rock and snow blended by the land's kinds, its slope and noise, with
 * Deposits as ore-coloured patches and haze toward the sky's own colour at the horizon.
 */
export function terrainMaterial(sky: SkyUniforms, look: TerrainLook): THREE.MeshStandardMaterial {
  const tex = groundTextures();
  const dry = look.climate.dryness;
  // Green and lush when wet, olive to straw when dry.
  const grassTint = new THREE.Color(0.86 + 0.35 * dry, 1.02 + 0.05 * dry, 0.78 + 0.1 * dry);
  const uniforms = {
    gAlb: { value: GROUND_KINDS.map((k) => tex.albedo[k]) },
    gNrm: { value: GROUND_KINDS.map((k) => tex.normal[k]) },
    gScale: { value: GROUND_KINDS.map((k) => TEXTURE_TILES[k]) },
    gFallback: { value: GROUND_KINDS.map((k) => new THREE.Vector3(...FALLBACK[k])) },
    gReady: { value: 0 },
    gGrassTint: { value: new THREE.Vector3(grassTint.r, grassTint.g, grassTint.b) },
    // Sand colour (linear): pale golden by the sea, warmer and redder in deserts.
    gSandTint: { value: new THREE.Vector3(0.27 + 0.05 * dry, 0.19 + 0.0 * dry, 0.085 - 0.015 * dry) },
    gSnowBoost: { value: 1.9 },
    gRockSlope: { value: new THREE.Vector2(0.15, 0.32) },
    gSkyCube: sky.skyCube,
    gAerial: { value: 0.002 },
    gWaterY: { value: WATER_Y },
  };
  void tex.ready.then(() => (uniforms.gReady.value = 1));
  const material = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec4 aMix;
        attribute vec4 aOre;
        attribute float aSite;
        varying vec3 vGWorld;
        varying vec3 vGNormal;
        varying vec4 vMix;
        varying vec4 vOre;
        varying float vSite;`,
      )
      .replace(
        '#include <fog_vertex>',
        `#include <fog_vertex>
        vGWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vGNormal = normalize(mat3(modelMatrix) * objectNormal);
        vMix = aMix;
        vOre = aOre;
        vSite = aSite;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SHADER_HEAD}`)
      .replace('#include <map_fragment>', SHADER_GROUND)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRough;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(gNormalW, 0.0)).xyz);')
      .replace('#include <fog_fragment>', SHADER_FOG);
  };
  material.customProgramCacheKey = () => 'leap-terrain';
  return material;
}
