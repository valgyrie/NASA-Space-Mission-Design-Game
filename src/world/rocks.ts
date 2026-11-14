import * as THREE from 'three';

/** Repeatable 0–1 number for a whole-number 3D point. */
function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 3D value noise in 0–1. */
function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const s = (t: number) => t * t * (3 - 2 * t);
  const fx = s(x - ix);
  const fy = s(y - iy);
  const fz = s(z - iz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(ix + dx, iy + dy, iz + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy),
    l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  );
}

/**
 * A weathered boulder about 2 units across, resting on y = 0: a lumpy sphere with a few flat fracture faces and a
 * flattened base, darker in its cracks (vertex colours).
 */
export function boulderGeometry(seed: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  // A few random planes cut the rock, like broken faces.
  const cuts = Array.from({ length: 5 }, (_, i) => {
    const n = new THREE.Vector3(hash3(seed, i, 1) - 0.5, hash3(seed, i, 2) - 0.3, hash3(seed, i, 3) - 0.5).normalize();
    return { n, d: 0.62 + hash3(seed, i, 4) * 0.25 };
  });
  const shade: number[] = [];
  for (let k = 0; k < pos.count; k++) {
    v.fromBufferAttribute(pos, k);
    const o = seed * 7.13;
    const bump = noise3(v.x * 1.7 + o, v.y * 1.7, v.z * 1.7) * 0.35 + noise3(v.x * 4.5, v.y * 4.5 + o, v.z * 4.5) * 0.12;
    v.multiplyScalar(0.78 + bump);
    for (const c of cuts) {
      const d = v.dot(c.n);
      if (d > c.d) v.addScaledVector(c.n, c.d - d);
    }
    v.y = Math.max(v.y * 0.72, -0.3);
    pos.setXYZ(k, v.x, v.y + 0.3, v.z);
    shade.push(0.62 + bump * 0.9);
  }
  // Each Icosahedron face has its own corners; merge them so the shading is smooth.
  g.deleteAttribute('uv');
  g.setAttribute('color', new THREE.Float32BufferAttribute(shade.flatMap((s) => [s, s, s]), 3));
  const merged = mergeByPosition(g);
  merged.computeVertexNormals();
  return merged;
}

/** Weld vertices at the same place, so normals are averaged across faces. */
function mergeByPosition(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const col = g.attributes.color as THREE.BufferAttribute;
  const key = (k: number) => `${pos.getX(k).toFixed(4)},${pos.getY(k).toFixed(4)},${pos.getZ(k).toFixed(4)}`;
  const seen = new Map<string, number>();
  const positions: number[] = [];
  const colours: number[] = [];
  const index: number[] = [];
  for (let k = 0; k < pos.count; k++) {
    const id = key(k);
    let at = seen.get(id);
    if (at === undefined) {
      at = positions.length / 3;
      seen.set(id, at);
      positions.push(pos.getX(k), pos.getY(k), pos.getZ(k));
      colours.push(col.getX(k), col.getY(k), col.getZ(k));
    }
    index.push(at);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  out.setIndex(index);
  g.dispose();
  return out;
}

/**
 * Rough stone, tinted per instance, with the grain of the rock photograph projected on it from three sides
 * (`detail`: the rock colour map; its brightness, not its colour, is used, so the tint stays the rock's own).
 */
export function rockMaterial(detail?: THREE.Texture): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.02 });
  if (!detail) return material;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.rDetail = { value: detail };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRockP;\nvarying vec3 vRockN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRockP = position * 0.9;\n#ifdef USE_INSTANCING\nvRockP += instanceMatrix[3].xyz * 0.37;\n#endif\nvRockN = normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D rDetail;\nvarying vec3 vRockP;\nvarying vec3 vRockN;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 bw = pow(abs(normalize(vRockN)), vec3(4.0));
        bw /= bw.x + bw.y + bw.z;
        vec3 grain = texture(rDetail, vRockP.yz).rgb * bw.x + texture(rDetail, vRockP.xz + 0.3).rgb * bw.y + texture(rDetail, vRockP.xy + 0.6).rgb * bw.z;
        vec3 mean = textureLod(rDetail, vec2(0.5), 12.0).rgb;
        diffuseColor.rgb *= clamp(dot(grain, vec3(0.333)) / max(dot(mean, vec3(0.333)), 0.02), 0.4, 1.7);`,
      );
  };
  material.customProgramCacheKey = () => 'leap-rock';
  return material;
}

/**
 * Linear colour of stone stained by an ore whose colour is `hex` (sRGB, as in DEPOSIT_COLOUR): the ore's hue,
 * muted, at the brightness of stone, so copper reads rusty, silicon blue-grey and aluminium pale, but none glows.
 */
export function oreStone(hex: number): THREE.Color {
  const lin = new THREE.Color().setHex(hex);
  const lum = 0.2126 * lin.r + 0.7152 * lin.g + 0.0722 * lin.b;
  // Muted in sRGB (so orange stays orange, not pink): strong colours, like a blue far from grey, are muted more.
  const s = [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
  const sl = Math.max(0.3 * s[0]! + 0.59 * s[1]! + 0.11 * s[2]!, 0.01);
  const dev = s.map((v) => v / sl - 1);
  const muted = Math.min(0.6, 0.16 / Math.max(...dev.map(Math.abs), 0.01));
  const hue = dev.map((d) => Math.pow(1 + d * muted, 2.2));
  const hl = 0.2126 * hue[0]! + 0.7152 * hue[1]! + 0.0722 * hue[2]!;
  const bright = (0.05 + Math.min(lum, 0.5) * 0.55) / hl;
  return new THREE.Color(hue[0]! * bright, hue[1]! * bright, hue[2]! * bright);
}
