import * as THREE from 'three';
import type { Site } from '../site/site';
import { type Ground, PAD_MARGIN, PAD_SKIRT_MAX, type Pad } from './ground';
import { rockMaterial } from './rocks';
import { type RockSpot, boulderShape, placeRocks } from './sceneryRocks';
import { groundTextures } from './terrainTextures';
import { type TreeKind, treeGeometries } from './treeModels';
import { PAD_CLEAR, type TreeSpot, placeVegetation } from './vegetationPlacement';
import type { SceneryLayer } from './world';

/**
 * Trees and bushes on every Site (a `SceneryLayer`). One material for all of them (the foliage atlas), one
 * InstancedMesh per kind, shape and patch of land, so whole patches are skipped when off screen (also for the
 * shadows). The wind bends them in the vertex shader; the only per-frame work is one time value.
 */

/** Size (tiles) of the patches trees are grouped in: full-detail ones, and the rest. */
const PATCH = [48, 128] as const;

const wind = { value: 0 };
let textures: { col: THREE.Texture; mask: THREE.Texture } | null = null;

/** The foliage atlas, loaded once (the first time a Site is drawn) and kept for every Site after. */
function foliageTextures(): { col: THREE.Texture; mask: THREE.Texture } {
  if (!textures) {
    const loader = new THREE.TextureLoader();
    const base = import.meta.env.BASE_URL + 'textures/nature/';
    const col = loader.load(base + 'foliage_col.jpg');
    col.colorSpace = THREE.SRGBColorSpace;
    const mask = loader.load(base + 'foliage_mask.jpg');
    for (const t of [col, mask]) {
      t.anisotropy = 4;
      t.generateMipmaps = true;
    }
    textures = { col, mask };
  }
  return textures;
}

/**
 * The material of every tree: alpha-tested leaf cards (smoothed with alpha to coverage), lit on both sides without
 * flipping the crown-shaped normals, swaying in the wind, with a little light shining through the leaves and, on
 * snowy Sites, snow on the upper sides of the boughs.
 */
function foliageMaterial(snow: number): THREE.MeshStandardMaterial {
  const { col, mask } = foliageTextures();
  const m = new THREE.MeshStandardMaterial({
    map: col,
    alphaMap: mask,
    alphaTest: 0.45,
    alphaToCoverage: true,
    side: THREE.DoubleSide,
    roughness: 0.82,
    metalness: 0,
  });
  m.customProgramCacheKey = () => 'leap-foliage';
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = wind;
    shader.uniforms.uSnow = { value: snow };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec2 wind;
uniform float uWind;
varying float vLeaf;
varying float vUp;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vLeaf = wind.y;
vec3 rootW = vec3(0.0);
#ifdef USE_INSTANCING
  rootW = instanceMatrix[3].xyz;
#endif
float ph = dot(rootW.xz, vec2(0.31, 0.57));
// The whole tree leans with slow gusts, more at the top; leaves flutter a little.
float gust = sin(uWind * 0.9 + ph * 0.35) * 0.5 + 0.5;
float sway = (sin(uWind * 1.7 + ph) * 0.6 + sin(uWind * 2.9 + ph * 1.3) * 0.25) * (0.4 + gust);
transformed.x += sway * 0.018 * wind.x;
transformed.z += sway * 0.011 * wind.x;
transformed += objectNormal * sin(uWind * 7.0 + dot(position, vec3(31.0, 23.0, 17.0)) + ph) * 0.006 * wind.y;
vUp = normalize(mat3(modelMatrix) * objectNormal).y;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uSnow;
varying float vLeaf;
varying float vUp;`,
      )
      .replace(
        '#include <normal_fragment_begin>',
        THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''),
      )
      .replace(
        '#include <alphamap_fragment>',
        `#include <alphamap_fragment>
// Keep thin leaves and needles from fading away in the smaller mipmaps (more coverage the further the mip).
vec2 texel = vAlphaMapUv * 1024.0;
float mip = max(0.0, 0.5 * log2(max(dot(dFdx(texel), dFdx(texel)), dot(dFdy(texel), dFdy(texel)))));
diffuseColor.a *= 1.0 + mip * 0.3;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.93, 0.97), uSnow * smoothstep(0.15, 0.65, vUp) * vLeaf * 0.85);`,
      )
      .replace(
        '#include <opaque_fragment>',
        `// Light through the leaves on the shaded side.
outgoingLight += diffuseColor.rgb * vLeaf * 0.06 * (1.0 - max(vUp, 0.0));
#include <opaque_fragment>`,
      );
  };
  return m;
}

/** Positions (x, z) and the matrices first given to the instances, so they can be hidden and shown again. */
interface Instances {
  spots: Float32Array;
  base: Float32Array;
  /** 1 where a building now stands (stays hidden). */
  gone: Uint8Array;
}

/** A rectangle trees are kept out of (world x/z). */
export interface Clearing {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

let road: Clearing | null = null;
/** Groups of trees on screen (normally one: the Site's). */
const live = new Set<THREE.Group>();

/** Keep trees out of a strip (the Shipping road and dock), or let them back (null). */
export function setVegetationClearing(c: Clearing | null): void {
  road = c;
  for (const g of live) refresh(g);
}

function inClearing(x: number, z: number): boolean {
  return !!road && x >= road.x0 && x <= road.x1 && z >= road.z0 && z <= road.z1;
}

const ZERO = new Float32Array(16);

/** Write every instance's matrix again: its first one, or nothing (zero size) where it is cleared. */
function refresh(group: THREE.Group): void {
  for (const mesh of group.children) {
    if (!(mesh instanceof THREE.InstancedMesh) || !mesh.userData.trees) continue;
    const { spots, base, gone } = mesh.userData.trees as Instances;
    const arr = mesh.instanceMatrix.array as Float32Array;
    for (let i = 0; i < mesh.count; i++) {
      const hidden = gone[i] || inClearing(spots[i * 2]!, spots[i * 2 + 1]!);
      arr.set(hidden ? ZERO : base.subarray(i * 16, i * 16 + 16), i * 16);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
}

function patchKey(s: TreeSpot): string {
  const p = PATCH[s.lod];
  return `${s.kind}:${s.lod}:${s.variant}:${s.shadow}:${Math.floor(s.x / p)},${Math.floor(s.z / p)}`;
}

/** The trees layer; add it once with `world.addScenery(vegetationLayer())`. */
export function vegetationLayer(): SceneryLayer {
  return {
    build(into: THREE.Group, ground: Ground, site: Site): void {
      // Forget groups of Sites no longer on screen.
      for (const g of live) if (!g.parent?.parent) live.delete(g);
      const group = new THREE.Group();
      group.name = 'trees';
      const material = foliageMaterial(ground.land.climate.snow ?? 0);
      const patches = new Map<string, TreeSpot[]>();
      for (const s of placeVegetation(ground, site)) {
        const key = patchKey(s);
        const list = patches.get(key);
        if (list) list.push(s);
        else patches.set(key, [s]);
      }
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      const colour = new THREE.Color();
      for (const list of patches.values()) {
        const { kind, lod, variant } = list[0]!;
        const geometry = treeGeometries(kind as TreeKind, lod)[variant]!;
        const mesh = new THREE.InstancedMesh(geometry, material, list.length);
        mesh.name = `trees-${kind}-${lod}`;
        const spots = new Float32Array(list.length * 2);
        list.forEach((s, i) => {
          q.setFromAxisAngle(up, s.yaw);
          m.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(s.scale, s.scale * s.squash, s.scale));
          mesh.setMatrixAt(i, m);
          mesh.setColorAt(i, colour.setRGB(s.tint[0], s.tint[1], s.tint[2], THREE.SRGBColorSpace));
          spots[i * 2] = s.x;
          spots[i * 2 + 1] = s.z;
        });
        mesh.userData.trees = {
          spots,
          base: (mesh.instanceMatrix.array as Float32Array).slice(),
          gone: new Uint8Array(list.length),
        } satisfies Instances;
        mesh.computeBoundingSphere();
        mesh.castShadow = list[0]!.shadow;
        mesh.receiveShadow = lod === 0;
        mesh.onBeforeRender = () => {
          wind.value = performance.now() / 1000;
        };
        group.add(mesh);
      }
      // Boulders, in 32-tile patches like the trees near the Site.
      const rockPatches = new Map<string, RockSpot[]>();
      for (const r of placeRocks(ground, site)) {
        const key = `${Math.floor(r.x / PATCH[0])},${Math.floor(r.z / PATCH[0])}`;
        const list = rockPatches.get(key);
        if (list) list.push(r);
        else rockPatches.set(key, [r]);
      }
      const stone = rockMaterial(groundTextures().albedo.rock);
      const e = new THREE.Euler();
      for (const list of rockPatches.values()) {
        const mesh = new THREE.InstancedMesh(boulderShape(), stone, list.length);
        mesh.name = 'boulders';
        const spots = new Float32Array(list.length * 2);
        list.forEach((r, i) => {
          q.setFromEuler(e.set(r.tilt, r.yaw, r.tilt * 0.5));
          m.compose(new THREE.Vector3(r.x, r.y, r.z), q, new THREE.Vector3(r.size, r.size * r.flat, r.size * (0.8 + r.flat * 0.3)));
          mesh.setMatrixAt(i, m);
          mesh.setColorAt(i, colour.setRGB(r.shade[0], r.shade[1], r.shade[2], THREE.SRGBColorSpace));
          spots[i * 2] = r.x;
          spots[i * 2 + 1] = r.z;
        });
        mesh.userData.trees = { spots, base: (mesh.instanceMatrix.array as Float32Array).slice(), gone: new Uint8Array(list.length) } satisfies Instances;
        mesh.computeBoundingSphere();
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
      into.add(group);
      live.add(group);
      if (road) refresh(group);
    },

    clearPad(into: THREE.Group, pad: Pad, ground: Ground): void {
      const reach = PAD_MARGIN + PAD_SKIRT_MAX + 1;
      for (const group of into.children) {
        if (group.name !== 'trees') continue;
        for (const mesh of group.children) {
          if (!(mesh instanceof THREE.InstancedMesh) || !mesh.userData.trees) continue;
          const t = mesh.userData.trees as Instances;
          let changed = false;
          for (let i = 0; i < mesh.count; i++) {
            const x = t.spots[i * 2]!;
            const z = t.spots[i * 2 + 1]!;
            if (x < pad.x0 - reach || x > pad.x1 + reach || z < pad.z0 - reach || z > pad.z1 + reach) continue;
            changed = true;
            if (ground.onPad(x, z, PAD_CLEAR)) t.gone[i] = 1;
            // The ground round the pad was graded: stand on it again.
            else t.base[i * 16 + 13] = ground.heightAt(x, z) - 0.03;
          }
          if (changed) mesh.computeBoundingSphere();
        }
        refresh(group as THREE.Group);
      }
    },
  };
}
