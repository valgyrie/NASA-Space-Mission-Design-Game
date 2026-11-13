import { t } from '../strings';
import { EARTH_KM } from '../game/space';
import { faceOn } from '../world/referenceTrajectory';
import { REFERENCE_PATH_DATA } from '../world/referencePaths';
import { learnMore } from './learnMore';
import { SOURCES } from '../game/sources';

/**
 * The Reference Trajectory to geostationary orbit, drawn face-on for the Launch planner: Earth, the low orbit,
 * the climb and the big circle, with its two burns marked. Path computed with NASA's GMAT (NASA Mission Viz).
 */

const SVG = 'http://www.w3.org/2000/svg';
/** Half the drawing's width, km: just past the geostationary circle (42,165 km from Earth's centre). */
const HALF = 50_000;

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

export function transferPicture(): HTMLElement {
  const figure = document.createElement('figure');
  figure.className = 'transfer-picture';
  const points = faceOn('geoTransfer');
  // y up on screen.
  const at = (p: { x: number; y: number }) => ({ x: Math.round(p.x), y: Math.round(-p.y) });
  const picture = svg('svg', { viewBox: `${-HALF} ${-HALF} ${HALF * 2} ${HALF * 2}`, role: 'img', 'aria-label': t('planner.transferAlt') });
  picture.append(
    svg('circle', { cx: 0, cy: 0, r: EARTH_KM, class: 'transfer-earth' }),
    svg('polyline', { points: points.map((p) => `${at(p).x},${at(p).y}`).join(' '), class: 'transfer-path' }),
  );
  REFERENCE_PATH_DATA.geoTransfer.burns.forEach((index, n) => {
    const p = points[index];
    const r = Math.hypot(p.x, p.y);
    const dot = at(p);
    // The label sits outside the path, away from Earth (inside the drawing for the outer burn).
    const out = n === 0 ? (r + 9_000) / r : (r - 9_000) / r;
    const label = at({ x: p.x * out, y: p.y * out });
    const text = svg('text', { x: label.x, y: label.y, class: 'transfer-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
    text.textContent = t(n === 0 ? 'planner.transferBurn1' : 'planner.transferBurn2');
    picture.append(svg('circle', { cx: dot.x, cy: dot.y, r: 1_600, class: 'transfer-burn' }), text);
  });
  const caption = document.createElement('figcaption');
  const heading = document.createElement('strong');
  heading.textContent = t('planner.transferHeading');
  const note = document.createElement('span');
  note.textContent = t('planner.transferNote');
  caption.append(heading, note, learnMore(SOURCES.missionViz, t('sources.missionViz')));
  figure.append(picture, caption);
  return figure;
}
