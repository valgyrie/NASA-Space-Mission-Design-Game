"""
Build src/game/placeData.ts: real climate for every start on Earth, launch weather at the Launch Sites,
and which land is in the US. Ticket 16; facts in docs/research/places-and-weather.md.

Sources:
  - NASA POWER (power.larc.nasa.gov, no key): 2025 annual means of sunshine (ALLSKY_SFC_SW_DWN),
    temperature (T2M), wind (WS2M) and rain (PRECTOTCORR), plus ground height, from the monthly
    regional API; daily 2025 peak wind (WS10M_MAX), rain (PRECTOTCORR) and top temperature (T2M_MAX)
    at each Launch Site from the daily point API.
  - Natural Earth 1:110m countries (public domain), for the US outline:
    https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson

Run in two steps (the first downloads about 1,000 small files into <cache> and can be stopped and resumed):
  python3 scripts/build_places.py fetch <cache>
  python3 scripts/build_places.py build <cache> > src/game/placeData.ts
Needs numpy.
"""
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
API = 'https://power.larc.nasa.gov/api/temporal'
PARAMS = ['ALLSKY_SFC_SW_DWN', 'T2M', 'WS2M', 'PRECTOTCORR']
DAILY = ['WS10M_MAX', 'PRECTOTCORR', 'T2M_MAX']
# Launch pads: Cape Canaveral LC-26 (Explorer 1) and Wallops Island. docs/research/places-and-weather.md.
LAUNCH_SITES = {'capeCanaveral': (28.44, -80.57), 'wallops': (37.84, -75.48)}
COUNTRIES = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
CELL = 2  # degrees per climate cell


def earth_grid():
    """The game's 1-degree surface map (src/world/earthMap.ts): 180 rows from the north, 360 columns from 180°W."""
    text = (ROOT / 'src/world/earthMap.ts').read_text()
    rows = re.findall(r"^  '([^']*)',$", text, re.M)
    out = []
    for row in rows:
        out.append(''.join(c * (int(n) if n else 1) for c, n in re.findall(r'([a-z.])(\d*)', row)))
    assert len(out) == 180 and all(len(r) == 360 for r in out)
    return np.array([list(r) for r in out])


def get(url, path):
    if path.exists():
        return json.loads(path.read_text())
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                data = r.read()
            path.write_bytes(data)
            return json.loads(data)
        except Exception as e:  # network hiccup: wait and retry
            print(f'retry {attempt + 1} {path.name}: {e}', file=sys.stderr)
            time.sleep(2 ** attempt)
    raise SystemExit(f'could not fetch {url}')


def boxes(grid):
    """10° boxes (south, west) holding any land."""
    for s in range(-90, 90, 10):
        for w in range(-180, 180, 10):
            r0, r1 = 90 - (s + 10), 90 - s
            if (grid[r0:r1, w + 180:w + 190] != '.').any():
                yield s, w


def fetch(cache):
    cache.mkdir(parents=True, exist_ok=True)
    grid = earth_grid()
    todo = list(boxes(grid))
    print(f'{len(todo)} boxes x {len(PARAMS)} parameters', file=sys.stderr)
    for i, (s, w) in enumerate(todo):
        for p in PARAMS:
            url = (f'{API}/monthly/regional?latitude-min={s}&latitude-max={s + 10}&longitude-min={w}'
                   f'&longitude-max={w + 10}&parameters={p}&community=RE&start=2025&end=2025&format=JSON')
            get(url, cache / f'box_{s}_{w}_{p}.json')
        if i % 20 == 0:
            print(f'{i}/{len(todo)}', file=sys.stderr)
    for name, (lat, lon) in LAUNCH_SITES.items():
        url = (f'{API}/daily/point?parameters={",".join(DAILY)}&community=RE&latitude={lat}&longitude={lon}'
               f'&start=20250101&end=20251231&format=JSON')
        get(url, cache / f'daily_{name}.json')
    get(COUNTRIES, cache / 'countries.geojson')
    print('done', file=sys.stderr)


def inside(features, lat, lon):
    """Cells whose centre is inside any feature (even-odd rule), as in build_earth_map.py."""
    LON, LAT = np.meshgrid(lon, lat)
    hit = np.zeros(LAT.shape, dtype=bool)
    for f in features:
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            cell = np.zeros(LAT.shape, dtype=bool)
            for ring in poly:
                ring = np.asarray(ring, dtype=float)
                for a, b, c, d in zip(ring[:-1, 0], ring[:-1, 1], ring[1:, 0], ring[1:, 1]):
                    if b == d:
                        continue
                    crosses = (b > LAT) != (d > LAT)
                    x_at = a + (LAT - b) * (c - a) / (d - b)
                    cell ^= crosses & (LON < x_at)
            hit |= cell
    return hit


# One character per cell: 64 steps from `low` in steps of `step`. '.' = sea.
CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/'
SCALES = {
    'sun': (0.0, 0.125),  # kWh per m² per day
    'temp': (-50.0, 1.5),  # °C
    'wind': (0.0, 0.2),  # m/s at 2 m
    'rain': (0.0, 0.2),  # mm per day
    'height': (0.0, 100.0),  # m above sea level
}


def code(value, scale):
    low, step = scale
    return CHARS[int(min(63, max(0, round((value - low) / step))))]


def build(cache):
    grid = earth_grid()
    rows, cols = 180 // CELL, 360 // CELL
    sums = {k: np.zeros((rows, cols)) for k in SCALES}
    counts = {k: np.zeros((rows, cols)) for k in SCALES}
    key = {'ALLSKY_SFC_SW_DWN': 'sun', 'T2M': 'temp', 'WS2M': 'wind', 'PRECTOTCORR': 'rain'}
    seen = set()
    for f in sorted(cache.glob('box_*.json')):
        data = json.loads(f.read_text())
        for feat in data.get('features', []):
            lon, lat, height = feat['geometry']['coordinates']
            r = min(rows - 1, int((90 - lat) // CELL))
            c = min(cols - 1, int((lon + 180) // CELL))
            for p, series in feat['properties']['parameter'].items():
                v = series.get('202513')
                if v is None or v <= -999:
                    continue
                sums[key[p]][r, c] += v
                counts[key[p]][r, c] += 1
            if (lat, lon) not in seen:
                seen.add((lat, lon))
                sums['height'][r, c] += max(0.0, height)
                counts['height'][r, c] += 1
    land = np.zeros((rows, cols), dtype=bool)
    for r in range(rows):
        for c in range(cols):
            land[r, c] = (grid[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL] != '.').any()

    lines = []
    for k, scale in SCALES.items():
        mean = np.where(counts[k] > 0, sums[k] / np.maximum(counts[k], 1), np.nan)
        out = []
        for r in range(rows):
            out.append(''.join(code(mean[r, c], scale) if land[r, c] and not np.isnan(mean[r, c]) else '.'
                               for c in range(cols)))
        lines.append((k, out))

    countries = json.loads((cache / 'countries.geojson').read_text())['features']
    usa = [f for f in countries if f['properties'].get('ADM0_A3') == 'USA']
    us = inside(usa, 89.5 - np.arange(180), -179.5 + np.arange(360)) & (grid != '.')
    us_rows = [''.join('u' if v else '.' for v in row) for row in us]

    daily = {}
    for name in LAUNCH_SITES:
        p = json.loads((cache / f'daily_{name}.json').read_text())['properties']['parameter']
        days = sorted(p['WS10M_MAX'])
        assert len(days) == 365, name
        daily[name] = {
            'wind': [round(p['WS10M_MAX'][d], 1) for d in days],
            'rain': [round(p['PRECTOTCORR'][d], 1) for d in days],
            'hot': [round(p['T2M_MAX'][d], 1) for d in days],
        }

    def rle(row):
        return ''.join(c + (str(len(m)) if len(m) > 1 else '') for m in re.findall(r'((.)\2*)', row) for c in [m[0]])

    w = print
    w('/**')
    w(' * Real places, made by scripts/build_places.py. Do not edit by hand.')
    w(' * Climate: NASA POWER 2025 annual means (power.larc.nasa.gov), on a 2-degree grid: rows from 90°N')
    w(' * southwards, columns from 180°W eastwards, one character per cell (see CLIMATE_SCALES), "." for sea.')
    w(' * Launch weather: NASA POWER daily 2025 at each Launch Site, 1 January first.')
    w(' * US land: Natural Earth 1:110m countries (public domain), 1-degree grid run-length coded like earthMap.ts.')
    w(' */')
    w(f"export const CLIMATE_CHARS = '{CHARS}';")
    w('/** Value = low + step × the character\'s place in CLIMATE_CHARS. */')
    w('export const CLIMATE_SCALES = {')
    for k, (low, step) in SCALES.items():
        w(f'  {k}: {{ low: {low}, step: {step} }},')
    w('} as const;')
    w('export const CLIMATE_ROWS: Record<keyof typeof CLIMATE_SCALES, readonly string[]> = {')
    for k, out in lines:
        w(f'  {k}: [')
        for row in out:
            w(f"    '{row}',")
        w('  ],')
    w('};')
    w('/** Daily 2025 weather at each Launch Site: peak wind at 10 m (m/s), rain (mm), top temperature (°C). */')
    w('export const LAUNCH_WEATHER_2025 = {')
    for name, d in daily.items():
        w(f'  {name}: {{')
        for k, v in d.items():
            w(f'    {k}: {json.dumps(v)},')
        w('  },')
    w('} as const;')
    w('/** US land on the 1-degree grid: u = US, . = elsewhere. */')
    w('export const US_ROWS: readonly string[] = [')
    for row in us_rows:
        w(f"  '{rle(row)}',")
    w('];')


if __name__ == '__main__':
    {'fetch': fetch, 'build': build}[sys.argv[1]](Path(sys.argv[2]))
