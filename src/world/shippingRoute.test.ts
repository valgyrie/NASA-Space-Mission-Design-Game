import { describe, expect, it } from 'vitest';
import { covers, footprint } from '../game/siteState';
import { SITE_SIZE, addPlot, generateSite, plotOf, tileAt } from '../site/site';
import { DRIVE_BEYOND_SITE, extendRoute, shippingRoute, truckPosition } from './shippingRoute';

const site = generateSite('K7QXM2');
const nothing = () => false;

describe('Shipping route', () => {
  it('parks the truck on dry, free land without a Deposit, clear of the building it starts from', () => {
    for (const seed of ['K7QXM2', 'AB12CD', 'ZZ99', 'COAST1']) {
      const s = generateSite(seed);
      const start = { x: 32, z: 32 };
      const route = shippingRoute(s, start, nothing);
      for (const t of footprint(route.dock.x, route.dock.z)) {
        const tile = tileAt(s, t.x, t.z)!;
        expect(tile.terrain).not.toBe('water');
        expect(tile.deposit).toBeFalsy();
        expect(covers(start, t.x, t.z)).toBe(false);
      }
    }
  });

  it('never parks on a building', () => {
    const start = { x: 32, z: 32 };
    const free = shippingRoute(site, start, nothing).dock;
    const blocked = shippingRoute(site, start, (x, z) => x === free.x && z === free.z).dock;
    expect(covers(blocked, free.x, free.z)).toBe(false);
  });

  it('drives straight off the Site and on past its edge', () => {
    const route = shippingRoute(site, { x: 32, z: 32 }, nothing);
    expect(Math.abs(route.dir.x) + Math.abs(route.dir.z)).toBe(1);
    const end = route.dir.x !== 0 ? Math.abs(route.to.x) : Math.abs(route.to.z);
    expect(end).toBeCloseTo(site.size / 2 + DRIVE_BEYOND_SITE);
  });

  it('starts at the dock, ends at the far end, and only moves forward', () => {
    const route = shippingRoute(site, { x: 10, z: 50 }, nothing);
    expect(truckPosition(route, 0)).toEqual(route.from);
    expect(truckPosition(route, 1).x).toBeCloseTo(route.to.x);
    expect(truckPosition(route, 1).z).toBeCloseTo(route.to.z);
    let last = -1;
    for (let f = 0; f <= 1; f += 0.05) {
      const p = truckPosition(route, f);
      const along = (p.x - route.from.x) * route.dir.x + (p.z - route.from.z) * route.dir.z;
      expect(along).toBeGreaterThanOrEqual(last);
      last = along;
    }
  });

  it('keeps the dock but runs on past land bought on its way out (ticket 30)', () => {
    const s = generateSite('K7QXM2');
    const route = shippingRoute(s, { x: 32, z: 32 }, nothing);
    // Buy the Plot the road leaves through.
    const edge = { x: route.dock.x + route.dir.x * SITE_SIZE, z: route.dock.z + route.dir.z * SITE_SIZE };
    const plot = plotOf(edge.x, edge.z);
    addPlot(s, plot.px, plot.pz);
    const longer = extendRoute(s, route);
    expect(longer.dock).toEqual(route.dock);
    expect(longer.dir).toEqual(route.dir);
    expect(longer.from).toEqual(route.from);
    const along = (p: { x: number; z: number }) => (p.x - route.from.x) * route.dir.x + (p.z - route.from.z) * route.dir.z;
    expect(along(longer.to) - along(route.to)).toBeCloseTo(SITE_SIZE);
    // Where the old road ended is now owned land; the new one ends past it.
    const tileOf = (p: { x: number; z: number }) => ({ x: Math.floor(p.x + s.size / 2), z: Math.floor(p.z + s.size / 2) });
    const oldEnd = tileOf(route.to);
    expect(tileAt(s, oldEnd.x, oldEnd.z)).toBeTruthy();
    const back = { x: longer.to.x - route.dir.x * (DRIVE_BEYOND_SITE - 1), z: longer.to.z - route.dir.z * (DRIVE_BEYOND_SITE - 1) };
    const newEnd = tileOf(back);
    expect(tileAt(s, newEnd.x, newEnd.z)).toBeUndefined();
  });
});
