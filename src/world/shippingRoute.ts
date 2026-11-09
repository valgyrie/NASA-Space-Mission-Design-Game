import { type Site, tileAt } from '../site/site';

/**
 * Where the Shipping truck parks while the Spacecraft is assembled, and the straight road it takes
 * off the Site. It leaves by the side with the least water on the way, and drives on past the edge
 * until the land fades, staying where the camera can still follow it.
 */

/** Tiles the truck drives past the Site's edge (the camera can follow up to 32). */
export const DRIVE_BEYOND_SITE = 28;

export interface ShippingRoute {
  /** The tile where the truck waits during assembly. */
  dock: { x: number; z: number };
  /** Unit step along the road: one of ±x or ±z. */
  dir: { x: number; z: number };
  /** World position of the dock tile's centre. */
  from: { x: number; z: number };
  /** World position where the drive ends, out past the Site. */
  to: { x: number; z: number };
}

const DIRECTIONS = [
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
  { x: 0, z: -1 },
];

/**
 * The route from tile `start` (the Warehouse, or the middle of the Site). The dock is the first dry,
 * free tile along the road, so the truck never parks on a building, a Deposit or water.
 */
export function shippingRoute(site: Site, start: { x: number; z: number }, occupied: (x: number, z: number) => boolean): ShippingRoute {
  const half = site.size / 2;
  let best = { dir: DIRECTIONS[0]!, water: Infinity, steps: Infinity };
  for (const dir of DIRECTIONS) {
    let water = 0;
    let steps = 0;
    for (let x = start.x, z = start.z; tileAt(site, x, z); x += dir.x, z += dir.z, steps++) {
      if (tileAt(site, x, z)!.terrain === 'water') water++;
    }
    if (water < best.water || (water === best.water && steps < best.steps)) best = { dir, water, steps };
  }
  const { dir } = best;
  let dock = { ...start };
  for (let x = start.x, z = start.z; tileAt(site, x, z); x += dir.x, z += dir.z) {
    const tile = tileAt(site, x, z)!;
    if (tile.terrain !== 'water' && !tile.deposit && !occupied(x, z)) {
      dock = { x, z };
      break;
    }
  }
  const from = { x: dock.x - half + 0.5, z: dock.z - half + 0.5 };
  // Distance from the dock to the Site's edge along the road, then on past it.
  const toEdge = dir.x > 0 ? site.size - dock.x : dir.x < 0 ? dock.x + 1 : dir.z > 0 ? site.size - dock.z : dock.z + 1;
  const length = toEdge - 0.5 + DRIVE_BEYOND_SITE;
  return { dock, dir, from, to: { x: from.x + dir.x * length, z: from.z + dir.z * length } };
}

/** Where the truck is `fraction` (0–1) of the way along the road. It pulls away slowly and speeds up. */
export function truckPosition(route: ShippingRoute, fraction: number): { x: number; z: number } {
  const f = Math.min(1, Math.max(0, fraction));
  const k = f < 0.15 ? (f * f) / 0.3 : f - 0.075; // gentle start, then steady
  const along = k / 0.925;
  return { x: route.from.x + (route.to.x - route.from.x) * along, z: route.from.z + (route.to.z - route.from.z) * along };
}
