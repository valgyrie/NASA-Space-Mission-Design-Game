import * as THREE from 'three';
import type { RawMaterial } from '../economy/rawMaterial';
import { DEPOSIT_COLOUR } from './siteMesh';

const geo = {
  shed: new THREE.BoxGeometry(0.55, 0.38, 0.5),
  roof: new THREE.ConeGeometry(0.46, 0.26, 4),
  leg: new THREE.BoxGeometry(0.07, 1.0, 0.07),
  beam: new THREE.BoxGeometry(0.36, 0.07, 0.07),
  wheel: new THREE.CylinderGeometry(0.15, 0.15, 0.05, 10),
  pile: new THREE.ConeGeometry(0.22, 0.24, 6),
};
geo.roof.rotateY(Math.PI / 4);
geo.wheel.rotateX(Math.PI / 2);

const mat = (color: number) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 });
const MATERIALS = {
  shed: mat(0xf6f1e7),
  roof: mat(0xd9583a),
  steel: mat(0x3d4654),
};
const pileMaterials = new Map<RawMaterial, THREE.Material>();

/** A small low-poly Mine: shed, headframe tower and a pile of what it digs up. Fits one tile. */
export function buildMine(material: RawMaterial): THREE.Group {
  const g = new THREE.Group();
  g.name = 'mine';
  g.scale.setScalar(1.25);
  const part = (geometry: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  };

  part(geo.shed, MATERIALS.shed, -0.13, 0.19, -0.12);
  part(geo.roof, MATERIALS.roof, -0.13, 0.51, -0.12);
  part(geo.leg, MATERIALS.steel, 0.1, 0.5, 0.28);
  part(geo.leg, MATERIALS.steel, 0.38, 0.5, 0.28);
  part(geo.beam, MATERIALS.steel, 0.24, 0.96, 0.28);
  part(geo.wheel, MATERIALS.steel, 0.24, 1.06, 0.28);

  let pile = pileMaterials.get(material);
  if (!pile) pileMaterials.set(material, (pile = mat(DEPOSIT_COLOUR[material])));
  part(geo.pile, pile, -0.26, 0.12, 0.28);
  return g;
}
