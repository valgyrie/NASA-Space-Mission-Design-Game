import * as THREE from 'three';

/**
 * The launch complex made in Blender (scripts/blender/build_launch.py → public/models/launch.glb), in metres, the
 * rocket's base at the origin. Three parts, found by the `role` in their glTF extras:
 *  - common: the sunken flame trench and deflector, the tank farm, pipe runs, floodlight towers;
 *  - classic: the late-1950s pad (launch stand, umbilical mast, service gantry, lightning masts, blockhouse);
 *  - modern: the Falcon 9 pad (launch mount, transporter-erector, crew tower, lightning towers, water tower).
 * Loaded lazily and once; callers keep their code-built pad until it arrives, and keep it for good if it fails.
 * Copies share geometry and materials with the loaded file: never dispose them.
 */

export interface LaunchModels {
  common: THREE.Object3D;
  classic: THREE.Object3D;
  modern: THREE.Object3D;
}

export type LaunchModelPart = keyof LaunchModels;

const PARTS: LaunchModelPart[] = ['common', 'classic', 'modern'];

let models: LaunchModels | null = null;
let loading: Promise<LaunchModels | null> | null = null;

/** Pick the three parts out of a loaded glTF scene by their roles; null if one is missing. */
export function partsByRole(nodes: readonly { userData: Record<string, unknown> }[]): Record<LaunchModelPart, number> | null {
  const found: Partial<Record<LaunchModelPart, number>> = {};
  nodes.forEach((node, i) => {
    const role = node.userData.role;
    if (typeof role === 'string' && (PARTS as string[]).includes(role)) found[role as LaunchModelPart] = i;
  });
  return PARTS.every((p) => found[p] !== undefined) ? (found as Record<LaunchModelPart, number>) : null;
}

/** Start loading (once). Resolves to the models, or null if they could not be loaded (or outside a browser). */
export function loadLaunchModels(): Promise<LaunchModels | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (loading) return loading;
  loading = Promise.all([import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/loaders/DRACOLoader.js')])
    .then(async ([{ GLTFLoader }, { DRACOLoader }]) => {
      const draco = new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL + 'models/draco/');
      try {
        return await new GLTFLoader().setDRACOLoader(draco).loadAsync(import.meta.env.BASE_URL + 'models/launch.glb');
      } finally {
        draco.dispose();
      }
    })
    .then((gltf) => {
      const nodes = [...gltf.scene.children];
      const index = partsByRole(nodes);
      if (!index) throw new Error('launch.glb has no common / classic / modern parts');
      for (const node of nodes) {
        node.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          const material = o.material as THREE.MeshStandardMaterial;
          // See-through wire (fences) would cast solid shadows; cut-out grating casts its holes.
          o.castShadow = !material.transparent;
          o.receiveShadow = true;
          if (material.alphaTest > 0) material.alphaToCoverage = true;
        });
        node.userData.shared = true;
      }
      models = { common: nodes[index.common]!, classic: nodes[index.classic]!, modern: nodes[index.modern]! };
      return models;
    })
    .catch((e: unknown) => {
      console.warn('Launch pad models could not be loaded; keeping the simple pad.', e);
      return null;
    });
  return loading;
}

/** The models if they have already loaded. */
export function launchModelsNow(): LaunchModels | null {
  return models;
}

/** A copy of one part (sharing geometry and materials). */
export function copyLaunchModel(from: LaunchModels, part: LaunchModelPart): THREE.Object3D {
  const copy = from[part].clone(true);
  copy.name = `launch-${part}`;
  copy.userData.shared = true;
  return copy;
}
