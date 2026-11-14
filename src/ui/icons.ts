/** Simple line icons drawn in code (no outside icon set), shown beside a button's words. */
const PATHS = {
  sound: 'M4 9h4l5-4v14l-5-4H4z M16 9a4 4 0 0 1 0 6 M18.5 6.5a7.5 7.5 0 0 1 0 11',
  market: 'M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H6 M9 20a1 1 0 1 0 0-.01 M17 20a1 1 0 1 0 0-.01',
  contracts: 'M8 4h8v3H8z M6 5H5v16h14V5h-1 M8 11h8 M8 15h6',
  designer: 'M9 9h6v6H9z M3 10h6 M15 10h6 M3 14h6 M15 14h6 M12 9V5 M10 5h4',
  space: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M4.5 17.5c-2-2 1.5-7.5 6.5-11.5s9-4 10-2.5-1.5 7-6.5 11-8.5 5-10 3z',
  archive: 'M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z',
  track: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 7v5l3 2',
  rocket: 'M12 2c3 3 4 7 3 12h-6c-1-5 0-9 3-12z M9 14l-3 4h4 M15 14l3 4h-4 M12 8a1 1 0 1 0 0 .01',
} as const;
export type IconName = keyof typeof PATHS;

export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('icon-svg');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.setAttribute('d', PATHS[name]);
  svg.append(line);
  return svg;
}
