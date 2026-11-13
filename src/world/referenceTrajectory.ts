import { REFERENCE_PATH_DATA, type ReferencePathKey } from './referencePaths';

/**
 * Reference Trajectories: real paths computed by NASA with GMAT (from NASA Mission Viz), shown for comparison
 * in the Space view and the Launch planner. Not the Company's Spacecraft. Data: referencePaths.ts.
 */

/** The ones the player can switch on, in list order. The Moon's own path comes with the Earth → Moon flight. */
export const REFERENCE_TRAJECTORY_IDS = ['geoTransfer', 'longEllipse', 'lunarTransfer'] as const;
export type ReferenceTrajectoryId = (typeof REFERENCE_TRAJECTORY_IDS)[number];

/** Drawn alongside a Reference Trajectory, on the same clock: the Moon on its own path. */
export const COMPANION: Partial<Record<ReferenceTrajectoryId, ReferencePathKey>> = { lunarTransfer: 'moon' };

/** One point: minutes from the start, then km, Earth-centred and equatorial (z towards the north pole). */
export interface ReferencePoint {
  minutes: number;
  x: number;
  y: number;
  z: number;
}

const cache = new Map<ReferencePathKey, ReferencePoint[]>();

export function referencePoints(key: ReferencePathKey): ReferencePoint[] {
  let points = cache.get(key);
  if (!points) {
    const flat = REFERENCE_PATH_DATA[key].points;
    points = [];
    for (let i = 0; i + 3 < flat.length; i += 4) points.push({ minutes: flat[i], x: flat[i + 1], y: flat[i + 2], z: flat[i + 3] });
    cache.set(key, points);
  }
  return points;
}

/** The points where an engine fires, in order. */
export function referenceBurns(key: ReferencePathKey): ReferencePoint[] {
  const points = referencePoints(key);
  return REFERENCE_PATH_DATA[key].burns.map((i) => points[i]);
}

/** How long the path takes, in minutes. */
export function referenceMinutes(key: ReferencePathKey): number {
  const points = referencePoints(key);
  return points[points.length - 1].minutes;
}

export function distanceKm(p: { x: number; y: number; z: number }): number {
  return Math.hypot(p.x, p.y, p.z);
}

/** Closest and farthest distance from Earth's centre along the path, km. */
export function radiusRange(key: ReferencePathKey): { min: number; max: number } {
  const r = referencePoints(key).map(distanceKm);
  return { min: Math.min(...r), max: Math.max(...r) };
}

/** Where it is `minutes` after the start (held at the ends), straight between kept points. */
export function referencePositionAt(key: ReferencePathKey, minutes: number): { x: number; y: number; z: number } {
  const points = referencePoints(key);
  if (minutes <= points[0].minutes) return { ...points[0] };
  let lo = 0;
  let hi = points.length - 1;
  if (minutes >= points[hi].minutes) return { ...points[hi] };
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].minutes <= minutes) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  const k = (minutes - a.minutes) / (b.minutes - a.minutes);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
}

/**
 * The path seen face-on, in km on a flat drawing: the first point on +x, the direction it moves in on +y.
 * Works for a path that stays in one plane (the transfer to geostationary orbit does).
 */
export function faceOn(key: ReferencePathKey): { x: number; y: number }[] {
  const points = referencePoints(key);
  const a = points[0];
  const b = points[Math.min(3, points.length - 1)];
  const n = { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
  const nl = distanceKm(n);
  const al = distanceKm(a);
  const u = { x: a.x / al, y: a.y / al, z: a.z / al };
  const w = { x: (n.y * u.z - n.z * u.y) / nl, y: (n.z * u.x - n.x * u.z) / nl, z: (n.x * u.y - n.y * u.x) / nl };
  return points.map((p) => ({ x: p.x * u.x + p.y * u.y + p.z * u.z, y: p.x * w.x + p.y * w.y + p.z * w.z }));
}
