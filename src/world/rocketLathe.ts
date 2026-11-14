import * as THREE from 'three';

/**
 * A surface of revolution about +y, like THREE.LatheGeometry, but corners in the profile sharper than `sharpDeg`
 * keep hard edges (their ring of vertices is doubled), so a tank wall stays evenly lit right up to its rim.
 * The profile is [radius, height] pairs, in order; the side the surface faces is on the left of the direction of
 * travel when radius points right and height up: walk up the outside, down the inside.
 * u runs round (0–1), v is metres along the profile, so textures and paint patterns don't stretch.
 */
export function latheGeometry(profile: readonly (readonly [number, number])[], segments = 64, sharpDeg = 35, phiStart = 0, phiLength = Math.PI * 2): THREE.BufferGeometry {
  const n = profile.length;
  if (n < 2) throw new Error('latheGeometry needs at least two points');
  // Normal of each profile segment in the (r, y) plane: the travel direction turned a quarter clockwise.
  const segNormal: [number, number][] = [];
  const segLength: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dr = profile[i + 1]![0] - profile[i]![0];
    const dy = profile[i + 1]![1] - profile[i]![1];
    const len = Math.hypot(dr, dy) || 1e-9;
    segNormal.push([dy / len, -dr / len]);
    segLength.push(len);
  }
  const cosSharp = Math.cos((sharpDeg * Math.PI) / 180);
  // Rings: each profile point once, or twice at a sharp corner (one normal per side).
  const rings: { r: number; y: number; nr: number; ny: number; v: number }[] = [];
  let v = 0;
  for (let i = 0; i < n; i++) {
    const [r, y] = profile[i]!;
    if (i > 0) v += segLength[i - 1]!;
    const before = i > 0 ? segNormal[i - 1]! : null;
    const after = i < n - 1 ? segNormal[i]! : null;
    if (before && after && before[0] * after[0] + before[1] * after[1] < cosSharp) {
      rings.push({ r, y, nr: before[0], ny: before[1], v });
      rings.push({ r, y, nr: after[0], ny: after[1], v });
    } else {
      const a = before ?? after!;
      const b = after ?? before!;
      const nr = a[0] + b[0];
      const ny = a[1] + b[1];
      const len = Math.hypot(nr, ny) || 1;
      rings.push({ r, y, nr: nr / len, ny: ny / len, v });
    }
  }
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  for (let j = 0; j <= segments; j++) {
    const u = j / segments;
    const phi = phiStart + u * phiLength;
    const s = Math.sin(phi);
    const c = Math.cos(phi);
    for (const ring of rings) {
      positions.push(ring.r * s, ring.y, ring.r * c);
      normals.push(ring.nr * s, ring.ny, ring.nr * c);
      uvs.push(u, ring.v);
    }
  }
  const index: number[] = [];
  const m = rings.length;
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < m - 1; i++) {
      // A doubled ring at a corner has no surface between its two copies.
      if (rings[i]!.r === rings[i + 1]!.r && rings[i]!.y === rings[i + 1]!.y) continue;
      const a = j * m + i;
      const b = (j + 1) * m + i;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

/**
 * A rocket-engine bell, its throat at y = 0 and its exit `length` below: a curved (parabolic-ish) nozzle with a
 * thin rolled lip, open at the bottom so its dark inside shows. Inside first (down), then the outside (up).
 */
export function bellProfile(throat: number, exit: number, length: number, wall = 0.02): [number, number][] {
  const inside: [number, number][] = [];
  const steps = 10;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    // Opens fast just below the throat, then straightens: a Rao-style bell.
    const r = throat + (exit - throat) * (1 - (1 - t) ** 1.8);
    inside.push([r, -length * t]);
  }
  const outside = inside.map(([r, y]) => [r + wall, y] as [number, number]).reverse();
  return [[throat * 0.8, 0.02], ...inside, [exit + wall * 1.6, -length], ...outside, [throat * 0.9 + wall, 0.05]];
}
