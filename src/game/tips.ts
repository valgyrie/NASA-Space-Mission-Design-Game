import { SOURCES } from './sources';

/** Printed pages in CubeSat 101, October 2017. Wording and credit live in strings.ts. */
export const TIP_PAGES = {
  simple: 16,
  familiar: 16,
  limits: 16,
  accessible: 16,
  schedule: 23,
  panel: 16,
  groundStation: 22,
  scrub: 28,
} as const;
export type TipId = keyof typeof TIP_PAGES;

/** The others appear beside the panel, Anomaly or Scrub they explain. */
export const LOADING_TIPS = ['simple', 'familiar', 'limits', 'accessible', 'schedule'] as const satisfies readonly TipId[];

export function randomLoadingTip(random = Math.random): TipId {
  return LOADING_TIPS[Math.floor(random() * LOADING_TIPS.length)]!;
}

/** Eight front-matter pages precede printed page 1; PDF viewers count from the cover. */
export function tipSource(id: TipId): string {
  return `${SOURCES.cubesat101}#page=${TIP_PAGES[id] + 8}`;
}
