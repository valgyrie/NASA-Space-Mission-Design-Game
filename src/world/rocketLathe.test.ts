import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { bellProfile, latheGeometry } from './rocketLathe';

/** Every triangle's winding agrees with its vertices' normals (the side it faces is the side it is lit from). */
function windingAgrees(g: THREE.BufferGeometry): boolean {
  const p = g.getAttribute('position');
  const n = g.getAttribute('normal');
  const idx = g.getIndex()!;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const vn = new THREE.Vector3();
  for (let t = 0; t < idx.count; t += 3) {
    const [i, j, k] = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, j);
    c.fromBufferAttribute(p, k);
    const face = b.clone().sub(a).cross(c.clone().sub(a));
    if (face.lengthSq() < 1e-14) continue;
    vn.fromBufferAttribute(n, i).add(new THREE.Vector3().fromBufferAttribute(n, j)).add(new THREE.Vector3().fromBufferAttribute(n, k));
    if (face.dot(vn) <= 0) return false;
  }
  return true;
}

describe('latheGeometry', () => {
  it('faces a tank wall outward and its top cap up', () => {
    const g = latheGeometry([[0, 0], [1, 0], [1, 2], [0, 2]], 16);
    expect(windingAgrees(g)).toBe(true);
  });

  it('keeps hard edges at sharp corners: the wall stays level-lit right to its rim', () => {
    const g = latheGeometry([[1, 0], [1, 2], [0, 2]], 8);
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      if (Math.abs(p.getY(i) - 2) < 1e-9 && Math.abs(Math.hypot(p.getX(i), p.getZ(i)) - 1) < 1e-9) {
        // At the rim there is a copy facing out and a copy facing up, nothing in between.
        const ny = n.getY(i);
        expect(ny === 0 || Math.abs(ny - 1) < 1e-9).toBe(true);
      }
    }
  });

  it('smooths gentle bends', () => {
    const g = latheGeometry([[1, 0], [1, 1], [0.95, 1.5]], 8);
    // 3 profile points, no corner doubled: 9 columns of 3.
    expect(g.getAttribute('position').count).toBe(27);
  });

  it('makes an engine bell whose inside faces the axis and outside faces out', () => {
    const g = latheGeometry(bellProfile(0.1, 0.3, 0.5), 24);
    expect(windingAgrees(g)).toBe(true);
    const box = new THREE.Box3().setFromBufferAttribute(g.getAttribute('position') as THREE.BufferAttribute);
    expect(box.min.y).toBeCloseTo(-0.5, 5);
    expect(box.max.x).toBeGreaterThan(0.3);
  });
});
