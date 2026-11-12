import type { Scene } from './tracks';

/** What is on screen, for choosing its music. */
export interface OnScreen {
  /** The Launch is playing: its countdown and climb, the flight after it, or an Anomaly met on the way. */
  launch: 'ascent' | 'flight' | 'anomaly' | null;
  /** The Mission Report is open, and whether the Mission succeeded. */
  report: 'success' | 'failure' | null;
  /** A Real History card or a new Era's welcome. */
  history: boolean;
  designer: boolean;
  space: boolean;
}

/** The music for the Site and everything opened over it. What covers the most of the screen wins. */
export function sceneFor(on: OnScreen): Scene {
  if (on.launch === 'anomaly') return 'anomaly';
  if (on.launch === 'ascent') return 'launch';
  if (on.launch === 'flight') return 'flight';
  if (on.history) return 'history';
  if (on.report) return on.report;
  if (on.designer) return 'designer';
  if (on.space) return 'flight';
  return 'site';
}
