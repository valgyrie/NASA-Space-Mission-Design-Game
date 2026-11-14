import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addSmoke, buildLevelSign, smokeOpacity } from './buildingParts';

describe('smokeOpacity', () => {
  it('starts and ends invisible and fades in faster than it fades out', () => {
    expect(smokeOpacity(0)).toBe(0);
    expect(smokeOpacity(1)).toBe(0);
    expect(smokeOpacity(0.15)).toBeGreaterThan(0.4);
    expect(smokeOpacity(0.15)).toBeGreaterThan(smokeOpacity(0.85));
    for (let k = -0.5; k <= 1.5; k += 0.05) {
      expect(smokeOpacity(k)).toBeGreaterThanOrEqual(0);
      expect(smokeOpacity(k)).toBeLessThanOrEqual(1);
    }
  });
});

describe('addSmoke', () => {
  it('makes a "smoke" group of puffs with phases, each holding a fixed-size sprite', () => {
    const g = new THREE.Group();
    addSmoke(g, 0, 1, 0, 5);
    const smoke = g.getObjectByName('smoke')!;
    expect(smoke.children).toHaveLength(5);
    for (const puff of smoke.children) {
      expect(typeof puff.userData.phase).toBe('number');
      expect(puff.children[0]).toBeInstanceOf(THREE.Sprite);
    }
  });
});

describe('buildLevelSign', () => {
  it('shows one star per level on each face', () => {
    for (const level of [1, 2, 5]) {
      const sign = buildLevelSign(level);
      expect(sign.name).toBe('level');
      let stars = 0;
      sign.traverse((o) => {
        if (o instanceof THREE.Mesh && o.geometry instanceof THREE.ExtrudeGeometry) stars++;
      });
      expect(stars).toBe(level * 2);
    }
  });
});
