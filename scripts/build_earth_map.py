"""
Build src/world/earthMap.ts: a 1-degree map of Earth's surface types for the Mission Designer's globe.

Source: Natural Earth 1:110m land, glaciated areas and geography regions (public domain),
https://github.com/nvkelso/natural-earth-vector (geojson/ folder). Download these three files into one folder:
  ne_110m_land.geojson  ne_110m_glaciated_areas.geojson  ne_110m_geography_regions_polys.geojson
Then run:  python3 scripts/build_earth_map.py <that folder> > src/world/earthMap.ts
Needs numpy.
"""
import json
import sys
from pathlib import Path

import numpy as np

src = Path(sys.argv[1])
lats = 89.5 - np.arange(180)  # row 0 is the north
lons = -179.5 + np.arange(360)
LON, LAT = np.meshgrid(lons, lats)


def rings(geometry):
    polys = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
    for poly in polys:
        for ring in poly:
            yield np.asarray(ring, dtype=float)


def inside(features):
    """Grid cells whose centre is inside any of the features (even-odd rule per polygon, holes included)."""
    hit = np.zeros(LAT.shape, dtype=bool)
    for f in features:
        cell = np.zeros(LAT.shape, dtype=bool)
        for ring in rings(f['geometry']):
            x0, y0 = ring[:-1, 0], ring[:-1, 1]
            x1, y1 = ring[1:, 0], ring[1:, 1]
            for a, b, c, d in zip(x0, y0, x1, y1):
                if b == d:
                    continue
                crosses = (b > LAT) != (d > LAT)
                x_at = a + (LAT - b) * (c - a) / (d - b)
                cell ^= crosses & (LON < x_at)
        hit |= cell
    return hit


def load(name):
    return json.load(open(src / name))['features']


land = inside(load('ne_110m_land.geojson'))
ice = inside(load('ne_110m_glaciated_areas.geojson'))
regions = load('ne_110m_geography_regions_polys.geojson')


def region(test):
    return inside([f for f in regions if test(f['properties'])])


desert = region(lambda p: p['FEATURECLA'] == 'Desert' or p['NAME'] in ('ARABIAN PENINSULA', 'WESTERN PLATEAU'))
mountain = region(lambda p: p['FEATURECLA'] == 'Range/mtn' or p['NAME'] == 'PLATEAU OF TIBET')
rainforest = region(lambda p: p['FEATURECLA'] == 'Basin' or p['NAME'] in ('MALAY ARCHIPELAGO', 'GREATER SUNDA ISLANDS'))
tundra = region(lambda p: p['FEATURECLA'] == 'Tundra')
steppe = region(lambda p: p['FEATURECLA'] == 'Plain')

# Surface letters, most specific first. Lower letters come from latitude when no region says otherwise.
absl = np.abs(LAT)
grid = np.full(LAT.shape, '.', dtype='<U1')  # sea
grid[land] = 'f'  # temperate forest
grid[land & (absl < 12)] = 'r'  # tropical forest
grid[land & (LAT >= 50)] = 'b'  # boreal forest
grid[land & (absl >= 64)] = 't'  # tundra
grid[land & steppe] = 's'
grid[land & tundra] = 't'
grid[land & rainforest] = 'r'
grid[land & mountain] = 'm'
grid[land & desert] = 'd'
grid[(land | ice) & (ice | (LAT < -62))] = 'i'


def rle(row):
    out, run = [], 1
    for i in range(1, len(row) + 1):
        if i < len(row) and row[i] == row[i - 1]:
            run += 1
            continue
        out.append(row[i - 1] + (str(run) if run > 1 else ''))
        run = 1
    return ''.join(out)


rows = [rle(r) for r in grid]
print('/**')
print(' * Earth\'s surface on a 1-degree grid, made by scripts/build_earth_map.py from Natural Earth')
print(' * (public domain, naturalearthdata.com). Do not edit by hand.')
print(' * Rows run from 90°N to 90°S, columns from 180°W east to 180°E. Each row is run-length coded:')
print(' * a letter, then how many cells it repeats (1 if no number).')
print(' * . sea · f temperate forest · r tropical forest · b boreal forest · t tundra · s grassland')
print(' * m mountains · d desert · i ice')
print(' */')
print('export const EARTH_MAP_ROWS: readonly string[] = [')
for r in rows:
    print(f"  '{r}',")
print('];')
