import { type CompanyLogo, logoUrl } from '../company/logo';
import { type MilestoneId } from '../game/contracts';
import type { Patch } from '../game/history';
import { t } from '../strings';
import { contractText, gameYear } from './format';

const SVG = 'http://www.w3.org/2000/svg';

/** Colours of each Milestone's patch: ring, sky and Earth. */
const PATCH_COLOURS: Record<MilestoneId, { ring: string; sky: string; earth: string; trim: string }> = {
  explorer1: { ring: '#1d3b6e', sky: '#0f1b33', earth: '#3f8fd0', trim: '#f2c14e' },
  tiros1: { ring: '#1f5f63', sky: '#0d2629', earth: '#5bb3c9', trim: '#e9eef2' },
  telstar1: { ring: '#6b2a2a', sky: '#1d0f14', earth: '#4a9be0', trim: '#f4d58d' },
  syncom3: { ring: '#3d2a6b', sky: '#120d24', earth: '#3f8fd0', trim: '#f2a65a' },
  apollo11: { ring: '#5a4a2a', sky: '#0b0b14', earth: '#3f8fd0', trim: '#e8e2cf' },
  artemis2: { ring: '#24365c', sky: '#0a1020', earth: '#4a9be0', trim: '#c9d3e0' },
  artemis3Camera: { ring: '#2c4a5e', sky: '#0b1622', earth: '#4a9be0', trim: '#e9b44c' },
  artemis3Relay: { ring: '#2c4a5e', sky: '#0b1622', earth: '#4a9be0', trim: '#7fd1b9' },
  artemis3SpaceWeather: { ring: '#2c4a5e', sky: '#0b1622', earth: '#4a9be0', trim: '#f28f5a' },
  artemis4Relay: { ring: '#3a3a48', sky: '#08080f', earth: '#4a9be0', trim: '#7fd1b9' },
  artemis4CargoLander: { ring: '#3a3a48', sky: '#08080f', earth: '#4a9be0', trim: '#e9b44c' },
  artemis4Mapper: { ring: '#3a3a48', sky: '#08080f', earth: '#4a9be0', trim: '#c9d3e0' },
};

let uid = 0;

function node<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

/** Text that follows a circle: along the top, or along the bottom reading left to right. */
function arcText(svg: SVGSVGElement, text: string, radius: number, top: boolean, attrs: Record<string, string | number>): void {
  const id = `patch-arc-${uid++}`;
  const d = top
    ? `M ${100 - radius} 100 A ${radius} ${radius} 0 0 1 ${100 + radius} 100`
    : `M ${100 - radius} 100 A ${radius} ${radius} 0 0 0 ${100 + radius} 100`;
  svg.append(node('path', { id, d, fill: 'none' }));
  const label = node('text', { 'text-anchor': 'middle', ...attrs });
  const path = node('textPath', { href: `#${id}`, startOffset: '50%' });
  path.textContent = text;
  label.append(path);
  svg.append(label);
}

/**
 * A Mission Patch, drawn in code: the Company's name round the top, the Mission's name round the bottom,
 * Earth with the Spacecraft on its orbit, and the year of the Launch. No real logos.
 */
export function makePatch(patch: Patch, company: string, logo: CompanyLogo): SVGSVGElement {
  const c = PATCH_COLOURS[patch.contract as MilestoneId] ?? PATCH_COLOURS.tiros1;
  const contract = contractText(patch.contract);
  const year = gameYear(patch.day);
  const svg = node('svg', { viewBox: '0 0 200 200', class: 'patch', role: 'img' });
  svg.setAttribute('aria-label', t('patch.name', { contract, company, year }));

  svg.append(
    node('circle', { cx: 100, cy: 100, r: 97, fill: c.trim }),
    node('circle', { cx: 100, cy: 100, r: 92, fill: c.ring }),
    node('circle', { cx: 100, cy: 100, r: 66, fill: c.sky, stroke: c.trim, 'stroke-width': 2 }),
  );
  // Stars, Earth rising at the bottom, and the orbit with the Spacecraft on it.
  for (const [x, y, r] of [[72, 62, 1.6], [128, 56, 1.2], [140, 92, 1.4], [62, 98, 1.1], [108, 46, 1]] as const) {
    svg.append(node('circle', { cx: x, cy: y, r, fill: '#ffffff' }));
  }
  const clip = `patch-clip-${uid++}`;
  const clipPath = node('clipPath', { id: clip });
  clipPath.append(node('circle', { cx: 100, cy: 100, r: 65 }));
  svg.append(clipPath);
  const earth = node('circle', { cx: 100, cy: 178, r: 62, fill: c.earth, 'clip-path': `url(#${clip})` });
  const land = node('path', { d: 'M 60 150 c 6 -12 18 -16 28 -12 c 8 3 10 -6 20 -6 c 10 0 12 8 22 6 c 8 -2 14 4 12 12 c -2 6 -10 4 -14 10 l -64 4 z', fill: '#5fae5a', 'clip-path': `url(#${clip})` });
  svg.append(earth, land);
  svg.append(node('ellipse', { cx: 100, cy: 108, rx: 54, ry: 20, fill: 'none', stroke: c.trim, 'stroke-width': 2, transform: 'rotate(-18 100 108)' }));
  // Explorer 1's shape: a long thin body, a nose cone and four whip antennas.
  const craft = node('g', { transform: 'translate(140 84) rotate(-30)' });
  craft.append(
    node('rect', { x: -16, y: -3.5, width: 26, height: 7, rx: 1.5, fill: '#d9dee6' }),
    node('path', { d: 'M 10 -3.5 L 18 0 L 10 3.5 Z', fill: '#d9dee6' }),
    node('rect', { x: -16, y: -3.5, width: 6, height: 7, fill: '#9aa6b8' }),
    node('path', { d: 'M -10 -3.5 l -4 -9 M -10 3.5 l -4 9 M -14 -3.5 l -7 -6 M -14 3.5 l -7 6', stroke: '#d9dee6', 'stroke-width': 1 }),
  );
  svg.append(craft);

  const font = { fill: '#ffffff', 'font-family': 'system-ui, sans-serif', 'font-weight': 700, 'letter-spacing': 1.5 };
  arcText(svg, company.toUpperCase(), 76, true, { ...font, 'font-size': company.length > 16 ? 11 : 14 });
  arcText(svg, contract.toUpperCase(), 84, false, { ...font, 'font-size': 15 });
  const yearText = node('text', { x: 100, y: 84, 'text-anchor': 'middle', fill: c.trim, 'font-family': 'system-ui, sans-serif', 'font-weight': 700, 'font-size': 13 });
  yearText.textContent = t('patch.year', { year });
  svg.append(yearText);
  svg.append(node('image', { href: logoUrl(logo), x: 82, y: 87, width: 36, height: 36 }));
  return svg;
}
