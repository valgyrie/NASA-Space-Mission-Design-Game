import { FOOTPRINT, footprint, foundationLevel } from '../game/siteState';
import { type Site, tileAt } from '../site/site';

/**
 * Where the Shipping truck parks while the Spacecraft is assembled, and the straight road it takes
 * off the Site. It leaves by the side with the least water on the way, and drives on past the edge
 * until the land fades, staying where the camera can still follow it.
 */

/** Tiles the truck drives past the Site's edge (the camera can follow up to 32). */
export const DRIVE_BEYOND_SITE = 28;

export interface ShippingRoute {
  /** The middle tile of the loading dock, where the truck waits during assembly. The dock is as big as a building. */
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

/** How bad a road is: a tile of water counts as much as this many height steps up or down. */
const WATER_COST = 4;
/** The dock would rather be on land this flat (height steps between its lowest and highest tile), level with the building. */
const FLAT = 1;
/** How many tiles further along the road it looks for flat land. */
const NEAR = 6;

/**
 * The route from the building on tile `start` (the Assembly Hall). The dock is the first spot along the
 * road, clear of that building, where all its tiles are dry and free, so the truck never parks on a
 * building, a Deposit or water; flat land level with the building first, if there is any. Of the four ways off the Site it takes
 * the easiest road: little water, few climbs, then the shortest. `occupied` tells whether a building
 * stands on a tile.
 */
export function shippingRoute(site: Site, start: { x: number; z: number }, occupied: (x: number, z: number) => boolean): ShippingRoute {
  const half = site.size / 2;
  const level = (x: number, z: number) => Math.max(0, tileAt(site, x, z)!.level);
  const home = foundationLevel(site, start.x, start.z);
  let best: { dir: { x: number; z: number }; dock: { x: number; z: number }; cost: number } | null = null;
  for (const dir of DIRECTIONS) {
    let dock: { x: number; z: number } | null = null;
    let flat = false;
    let x = start.x + dir.x * FOOTPRINT;
    let z = start.z + dir.z * FOOTPRINT;
    // Flat land counts only near the building; further on, any clear spot will do.
    for (let n = 0; tileAt(site, x, z) && !flat && !(dock && n > NEAR); x += dir.x, z += dir.z, n++) {
      const tiles = footprint(x, z).map((t) => ({ ...t, tile: tileAt(site, t.x, t.z) }));
      if (!tiles.every((t) => t.tile && t.tile.terrain !== 'water' && !t.tile.deposit && !occupied(t.x, t.z))) continue;
      const levels = tiles.map((t) => t.tile!.level);
      flat = Math.max(...levels) - Math.min(...levels) <= FLAT && Math.abs(Math.max(...levels) - home) <= FLAT;
      if (flat || !dock) dock = { x, z };
    }
    // No room that way: the truck loads where it starts.
    const from = dock ?? start;
    // A dock far above or below the building is as bad as the climb to it.
    let cost = dock ? Math.abs(foundationLevel(site, dock.x, dock.z) - home) * 2 : 1000;
    let steps = 0;
    for (let x = from.x, z = from.z; tileAt(site, x, z); x += dir.x, z += dir.z, steps++) {
      if (tileAt(site, x, z)!.terrain === 'water') cost += WATER_COST;
      if (tileAt(site, x + dir.x, z + dir.z)) cost += Math.abs(level(x + dir.x, z + dir.z) - level(x, z));
    }
    cost += steps / 1000;
    if (!best || cost < best.cost) best = { dir, dock: from, cost };
  }
  const { dir, dock } = best!;
  const from = { x: dock.x - half + 0.5, z: dock.z - half + 0.5 };
  return { dock, dir, from, to: roadEnd(site, dock, dir, from) };
}

/** Where the drive ends: from the dock to the Site's edge along the road (bought Plots included), then on past it. */
function roadEnd(site: Site, dock: ShippingRoute['dock'], dir: ShippingRoute['dir'], from: ShippingRoute['from']): ShippingRoute['to'] {
  let toEdge = 0;
  while (tileAt(site, dock.x + dir.x * toEdge, dock.z + dir.z * toEdge)) toEdge++;
  const length = toEdge - 0.5 + DRIVE_BEYOND_SITE;
  return { x: from.x + dir.x * length, z: from.z + dir.z * length };
}

/**
 * The same route after land was bought: the dock and the road's direction stay, and the drive now ends past
 * the new edge of the Site, so the truck never vanishes on owned land (ticket 30).
 */
export function extendRoute(site: Site, route: ShippingRoute): ShippingRoute {
  return { ...route, to: roadEnd(site, route.dock, route.dir, route.from) };
}

/** Where the truck is `fraction` (0–1) of the way along the road. It pulls away slowly and speeds up. */
export function truckPosition(route: ShippingRoute, fraction: number): { x: number; z: number } {
  const f = Math.min(1, Math.max(0, fraction));
  const k = f < 0.15 ? (f * f) / 0.3 : f - 0.075; // gentle start, then steady
  const along = k / 0.925;
  return { x: route.from.x + (route.to.x - route.from.x) * along, z: route.from.z + (route.to.z - route.from.z) * along };
}
