import * as THREE from 'three';

/**
 * Flight-hardware materials for the Spacecraft: gold and silver multi-layer insulation (crinkled foil), solar
 * cells with their grid and blue-violet sheen, brushed and anodised aluminium, white thermal paint.
 * Materials are made at import (safe in Node); their small canvas textures are made the first time a model is
 * built in a browser (`dressSpacecraftMaterials`), so tests never touch the DOM.
 */

const physical = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
const standard = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);

export const SC = {
  /** Gold-coloured Kapton MLI: a shiny, crinkled metal look. */
  goldFoil: standard({ color: 0xe8b04a, metalness: 1, roughness: 0.32 }),
  /** Paler, older gold foil. */
  goldPale: standard({ color: 0xf0c978, metalness: 1, roughness: 0.38 }),
  /** Silver (aluminised) MLI. */
  silverFoil: standard({ color: 0xdfe3e8, metalness: 1, roughness: 0.28 }),
  /** Brushed aluminium: structure, rings, rails. */
  aluminium: physical({ color: 0xc9ced4, metalness: 1, roughness: 0.6, anisotropy: 0.7 }),
  /** Polished bare metal: bolts, tips. */
  polished: standard({ color: 0xe4e7ea, metalness: 1, roughness: 0.16 }),
  /** Black anodised aluminium. */
  anodised: standard({ color: 0x24272c, metalness: 0.6, roughness: 0.42 }),
  /** White thermal paint (radiators, Explorer-style bands). */
  whitePaint: standard({ color: 0xeeeeea, metalness: 0, roughness: 0.5 }),
  /** Dark thermal stripes. */
  blackPaint: standard({ color: 0x1b1d21, metalness: 0, roughness: 0.6 }),
  /** Grey primer and decks. */
  deck: standard({ color: 0x5c626b, metalness: 0.5, roughness: 0.48 }),
  /** Solar cells: dark blue-violet glass over a silver grid, with an interference sheen. */
  solar: physical({
    color: 0xffffff,
    metalness: 0.3,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 0.75,
    iridescenceIOR: 1.7,
    iridescenceThicknessMinimum: 250,
    iridescenceThicknessMaximum: 520,
  }),
  /** Solar cells seen from the back, and panel frames. */
  panelBack: standard({ color: 0x3a3f46, metalness: 0.4, roughness: 0.55 }),
  /** Engine bell: dark heat-tinted metal. */
  bell: standard({ color: 0x3b3a3a, metalness: 0.85, roughness: 0.42, side: THREE.DoubleSide }),
  /** The inside of a nozzle: sooty, nearly black. */
  throat: standard({ color: 0x0b0b0c, metalness: 0.2, roughness: 0.9, side: THREE.BackSide }),
  /** Fibreglass and white radome parts. */
  fibreglass: standard({ color: 0xe9e4d6, metalness: 0, roughness: 0.62 }),
  /** Cables: Kapton-wrapped harness and black jackets. */
  harness: standard({ color: 0xb8762a, metalness: 0.3, roughness: 0.5 }),
  cableBlack: standard({ color: 0x15171a, metalness: 0, roughness: 0.7 }),
  /** Optical glass of camera lenses. */
  lens: physical({ color: 0x0a1018, metalness: 0, roughness: 0.04, clearcoat: 1, iridescence: 0.5, iridescenceIOR: 1.5 }),
  /** Antenna whips: spring steel. */
  whip: standard({ color: 0xd7dadf, metalness: 1, roughness: 0.22 }),
  /** Tube glowing faintly in its window (the Geiger tube). */
  tube: standard({ color: 0xc8682f, metalness: 0.4, roughness: 0.4, emissive: 0x3a1204, emissiveIntensity: 0.6 }),
};

let dressed = false;

/** Small canvas textures for the materials above; called before each model is built (it runs once). */
export function dressSpacecraftMaterials(): void {
  if (dressed || typeof document === 'undefined') return;
  dressed = true;
  const crinkle = crinkleNormalMap(256);
  for (const m of [SC.goldFoil, SC.goldPale, SC.silverFoil]) {
    m.normalMap = crinkle;
    m.normalScale.set(0.9, 0.9);
    m.needsUpdate = true;
  }
  SC.solar.map = solarCellMap();
  SC.solar.needsUpdate = true;
  const brushed = brushedRoughnessMap(128);
  SC.aluminium.roughnessMap = brushed;
  SC.aluminium.needsUpdate = true;
}

/** A repeatable random number generator, so the textures look the same every time. */
function random(seed: number): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!];
}

/**
 * Crinkled foil: a height field of many sharp random creases (lines and folds), turned into a normal map.
 */
function crinkleNormalMap(size: number): THREE.Texture {
  const rand = random(11);
  const height = new Float32Array(size * size);
  // Creases: straight folds across the sheet, each a sharp ridge or valley that fades along its length.
  for (let k = 0; k < 140; k++) {
    const x0 = rand() * size;
    const y0 = rand() * size;
    const angle = rand() * Math.PI;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const length = 20 + rand() * 90;
    const depth = (rand() - 0.5) * 2.2;
    const width = 1.2 + rand() * 3.5;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Wrap so the texture tiles.
        let px = x - x0;
        let py = y - y0;
        px -= Math.round(px / size) * size;
        py -= Math.round(py / size) * size;
        const along = px * dx + py * dy;
        if (Math.abs(along) > length) continue;
        const across = Math.abs(-px * dy + py * dx);
        if (across > width * 3) continue;
        const fade = 1 - Math.abs(along) / length;
        height[y * size + x]! += depth * fade * Math.max(0, 1 - across / (width * 3));
      }
    }
  }
  // Soft pillowing of the blanket.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      height[y * size + x]! += Math.sin((x / size) * Math.PI * 6) * Math.sin((y / size) * Math.PI * 4) * 0.4;
    }
  }
  const [c, g] = canvas(size);
  const image = g.createImageData(size, size);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)]!;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (at(x - 1, y) - at(x + 1, y)) * 1.4;
      const ny = (at(x, y + 1) - at(x, y - 1)) * 1.4;
      const len = Math.hypot(nx, ny, 1);
      const o = (y * size + x) * 4;
      image.data[o] = ((nx / len) * 0.5 + 0.5) * 255;
      image.data[o + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      image.data[o + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      image.data[o + 3] = 255;
    }
  }
  g.putImageData(image, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/**
 * Solar cells: a 4 × 8 grid of dark blue-violet cells with thin silver fingers, two busbars each, cut corners,
 * pale gaps between the cells and interconnect tabs.
 */
function solarCellMap(): THREE.Texture {
  const [c, g] = canvas(512);
  const cols = 4;
  const rows = 8;
  const w = 512 / cols;
  const h = 512 / rows;
  const rand = random(5);
  g.fillStyle = '#c9ccd2'; // white substrate seen in the gaps
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * w + 3;
      const y = j * h + 3;
      const cw = w - 6;
      const ch = h - 6;
      const cut = 6;
      // Each cell a slightly different shade, as on real panels.
      const shade = rand() * 14;
      const grad = g.createLinearGradient(x, y, x + cw, y + ch);
      grad.addColorStop(0, `rgb(${30 + shade},${32 + shade},${92 + shade})`);
      grad.addColorStop(1, `rgb(${22 + shade},${26 + shade},${70 + shade})`);
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(x + cut, y);
      g.lineTo(x + cw - cut, y);
      g.lineTo(x + cw, y + cut);
      g.lineTo(x + cw, y + ch - cut);
      g.lineTo(x + cw - cut, y + ch);
      g.lineTo(x + cut, y + ch);
      g.lineTo(x, y + ch - cut);
      g.lineTo(x, y + cut);
      g.closePath();
      g.fill();
      // Fine grid fingers across the cell.
      g.strokeStyle = 'rgba(190,198,215,0.35)';
      g.lineWidth = 0.6;
      for (let f = 4; f < cw; f += 4) {
        g.beginPath();
        g.moveTo(x + f, y + 2);
        g.lineTo(x + f, y + ch - 2);
        g.stroke();
      }
      // Two busbars along the cell.
      g.fillStyle = 'rgba(214,218,226,0.9)';
      g.fillRect(x + 2, y + ch * 0.3, cw - 4, 1.6);
      g.fillRect(x + 2, y + ch * 0.7, cw - 4, 1.6);
      // Interconnect tabs to the next cell.
      g.fillStyle = '#d8dbe0';
      g.fillRect(x + cw - 1, y + ch * 0.3 - 1, 6, 3.5);
      g.fillRect(x + cw - 1, y + ch * 0.7 - 1, 6, 3.5);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Brushed metal: fine streaks of slightly different roughness along one direction. */
function brushedRoughnessMap(size: number): THREE.Texture {
  const [c, g] = canvas(size);
  const rand = random(3);
  g.fillStyle = 'rgb(128,128,128)';
  g.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    const v = 100 + rand() * 70;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(0, y, size, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
