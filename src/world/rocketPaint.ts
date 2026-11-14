import * as THREE from 'three';

/**
 * Painted and bare metal for rockets: a MeshStandardMaterial with the wear of a real vehicle added in the shader,
 * from the mesh's own coordinates (metres along and round the body): faint panel seams and weld rings, rain and
 * frost streaks running down, blotchy roughness, and soot round the tail. Nothing to load, so it works at once.
 */

export interface PaintOptions {
  roughness?: number;
  metalness?: number;
  /** Metres between weld rings along the body (0: none). */
  rings?: number;
  /** Panel seams round the body (0: none). */
  seams?: number;
  /** Streaks and blotches, 0–1. */
  grime?: number;
  /** Soot near the bottom (y < `sootTop` metres), 0–1. */
  soot?: number;
  sootTop?: number;
  /** Faint brushed / machined lines along the body (bare metal). */
  brushed?: boolean;
  side?: THREE.Side;
}

const PARS = /* glsl */ `
  varying vec3 vPaint;
  uniform vec4 uPaintA; // rings, seams, grime, soot
  uniform vec2 uPaintB; // sootTop, brushed
  float pHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float pNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), u.x), mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
`;

/** A rocket material. Its colour is sRGB hex, like other materials. */
export function paint(colour: number, o: PaintOptions = {}): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: colour,
    roughness: o.roughness ?? 0.5,
    metalness: o.metalness ?? 0,
    side: o.side ?? THREE.FrontSide,
  });
  const uniforms = {
    uPaintA: { value: new THREE.Vector4(o.rings ?? 0, o.seams ?? 0, o.grime ?? 0.5, o.soot ?? 0) },
    uPaintB: { value: new THREE.Vector2(o.sootTop ?? 2.5, o.brushed ? 1 : 0) },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPaint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaint = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${PARS}`)
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        #include <map_fragment>
        float pr = max(length(vPaint.xz), 0.05);
        float pa = atan(vPaint.x, vPaint.z);
        float arc = pa * pr;
        float py = vPaint.y;
        // How big one pixel is on the body: fine lines fade before they would shimmer.
        float px = max(fwidth(py), fwidth(arc));
        float sharp = 1.0 - smoothstep(0.008, 0.03, px);
        float seam = 0.0;
        if (uPaintA.x > 0.0) {
          float d = abs(fract(py / uPaintA.x + 0.5) - 0.5) * uPaintA.x;
          seam = max(seam, 1.0 - smoothstep(0.004, 0.012, d));
        }
        if (uPaintA.y > 0.0) {
          float pStep = 6.2831853 / uPaintA.y;
          float d = abs(fract(pa / pStep + 0.5) - 0.5) * pStep * pr;
          seam = max(seam, (1.0 - smoothstep(0.003, 0.009, d)) * 0.7);
        }
        diffuseColor.rgb *= 1.0 - seam * sharp * 0.32;
        // Streaks running down the body, and broad blotches.
        float streak = pNoise(vec2(arc * 7.0, py * 0.35)) * pNoise(vec2(arc * 2.3 + 4.0, py * 0.12));
        float blotch = pNoise(vec2(arc * 0.9, py * 0.9) + 11.0);
        float grime = uPaintA.z * (streak * 0.22 + (blotch - 0.5) * 0.08);
        diffuseColor.rgb *= 1.0 - grime;
        // Soot and scorch from the engine round the tail.
        float soot = uPaintA.w * (1.0 - smoothstep(0.0, uPaintB.x, py)) * (0.55 + 0.45 * pNoise(vec2(arc * 3.0, py * 2.0)));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.045, 0.04), clamp(soot, 0.0, 0.85));
        // Brushed metal: fine lines along the body.
        float brush = uPaintB.y * (pNoise(vec2(arc * 160.0, py * 0.8)) - 0.5) * sharp;
        diffuseColor.rgb *= 1.0 + brush * 0.12;
        float pRough = (blotch - 0.5) * 0.18 + streak * 0.12 + seam * 0.2 + brush * 0.1;
        `,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + pRough, 0.04, 1.0);',
      );
  };
  material.customProgramCacheKey = () => 'rocket-paint-1';
  return material;
}
