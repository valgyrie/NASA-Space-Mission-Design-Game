"""
Build public/textures/earth/water.png: where the sea and the lakes are, for the Sun's glint on the globe.

  water.png  4096 x 2048, 8-bit grey: 255 is water, 0 is land, greys along the coasts (4 x 4 samples a pixel).
             Plate carree like the other Earth pictures: column 0 is 180 W, row 0 is 90 N.

Source: Natural Earth 1:10m (public domain, https://www.naturalearthdata.com/about/terms-of-use/), the same
data family as the game's 1-degree map (scripts/build_earth_map.py), from
https://github.com/nvkelso/natural-earth-vector/tree/master/geojson :
  ne_10m_land.geojson           land (holes such as the Caspian Sea stay water)
  ne_10m_minor_islands.geojson  small islands not in the land layer
  ne_10m_antarctic_ice_shelves_polys.geojson  Antarctic ice shelves (white ice, not sea: no glint, no sea tint)
  ne_10m_lakes.geojson          lakes and reservoirs (salt pans, "Alkaline Lake", are left as land: mostly dry)

Needs only NumPy (no Pillow, no Blender API): run it with any Python that has NumPy, for example Blender's own:

  "C:/Program Files/Blender Foundation/Blender 5.3/5.3/python/bin/python.exe" scripts/build_earth_water.py

The GeoJSON files are downloaded once into .leap/art-src/space/ne/ (git-ignored).
"""
import json
import struct
import sys
import urllib.request
import zlib
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / '.leap' / 'art-src' / 'space' / 'ne'
OUT = ROOT / 'public' / 'textures' / 'earth' / 'water.png'
NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson'

WIDTH, HEIGHT = 4096, 2048
SAMPLES = 4  # per pixel along each axis
BAND = 256  # output rows rasterised at a time


def features(name: str) -> list:
    path = CACHE / f'{name}.geojson'
    if not path.exists() or path.stat().st_size == 0:
        CACHE.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(f'{NE}/{name}.geojson', headers={'User-Agent': 'leap-build-script'})
        with urllib.request.urlopen(request, timeout=300) as response:
            path.write_bytes(response.read())
    return json.loads(path.read_text(encoding='utf-8'))['features']


def edges(feats: list, width: int, height: int) -> np.ndarray:
    """Every ring edge of the features as rows (x0, y0, x1, y1) in sample units (x east from 180 W, y down from 90 N)."""
    parts = []
    for f in feats:
        g = f['geometry']
        if g is None:
            continue
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            for ring in poly:
                r = np.asarray(ring, dtype=np.float64)[:, :2]
                if len(r) < 3:
                    continue
                if not np.array_equal(r[0], r[-1]):
                    r = np.vstack([r, r[:1]])
                x = (r[:, 0] + 180.0) / 360.0 * width
                y = (90.0 - r[:, 1]) / 180.0 * height
                parts.append(np.stack([x[:-1], y[:-1], x[1:], y[1:]], axis=1))
    return np.concatenate(parts)


def crossings(e: np.ndarray) -> tuple:
    """Where each edge crosses the centre line of each sample row: (row, x), sorted by row then x."""
    e = e[e[:, 1] != e[:, 3]]
    x0, y0, x1, y1 = e.T
    lo, hi = np.minimum(y0, y1), np.maximum(y0, y1)
    # Half-open rule: an edge counts for row j when lo <= j + 0.5 < hi, so every closed ring crosses a row an even
    # number of times.
    first = np.ceil(lo - 0.5).astype(np.int64)
    end = np.ceil(hi - 0.5).astype(np.int64)
    count = np.maximum(end - first, 0)
    idx = np.repeat(np.arange(len(e)), count)
    offset = np.arange(count.sum()) - np.repeat(np.cumsum(count) - count, count)
    row = first[idx] + offset
    t = (row + 0.5 - y0[idx]) / (y1[idx] - y0[idx])
    x = x0[idx] + t * (x1[idx] - x0[idx])
    order = np.lexsort((x, row))
    return row[order], x[order]


def fill(rows: np.ndarray, xs: np.ndarray, r0: int, r1: int, width: int) -> np.ndarray:
    """Even-odd fill of sample rows r0..r1-1 from their sorted crossings: True inside."""
    a, b = np.searchsorted(rows, r0), np.searchsorted(rows, r1)
    row, x = rows[a:b], xs[a:b]
    if len(row) % 2:
        raise ValueError(f'odd number of crossings between rows {r0} and {r1}')
    start = np.clip(np.ceil(x[0::2] - 0.5), 0, width).astype(np.int64)
    stop = np.clip(np.ceil(x[1::2] - 0.5), 0, width).astype(np.int64)
    if not np.array_equal(row[0::2], row[1::2]):
        raise ValueError('crossings do not pair up within rows')
    diff = np.zeros((r1 - r0, width + 1), dtype=np.int32)
    np.add.at(diff, (row[0::2] - r0, start), 1)
    np.add.at(diff, (row[0::2] - r0, stop), -1)
    return np.cumsum(diff[:, :width], axis=1) > 0


def write_png(grey: np.ndarray, path: Path) -> None:
    """8-bit greyscale PNG, rows filtered with "Sub" (the left neighbour), so long runs compress well."""
    h, w = grey.shape
    sub = grey.astype(np.int16)
    sub[:, 1:] -= grey[:, :-1].astype(np.int16)
    raw = np.hstack([np.ones((h, 1), dtype=np.uint8), (sub % 256).astype(np.uint8)]).tobytes()

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xFFFFFFFF)

    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 0, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    path.write_bytes(png)


def main() -> None:
    sw, sh = WIDTH * SAMPLES, HEIGHT * SAMPLES
    land = [f for f in features('ne_10m_land') if (f['properties'].get('featurecla') or 'Land') == 'Land']
    islands = features('ne_10m_minor_islands')
    shelves = features('ne_10m_antarctic_ice_shelves_polys')
    lakes = [f for f in features('ne_10m_lakes') if f['properties'].get('featurecla') in ('Lake', 'Reservoir')]
    # One layer each: the even-odd rule must not cut a hole where two layers overlap (an island in an ice shelf).
    layers = [crossings(edges(feats, sw, sh)) for feats in (land, islands, shelves, lakes)]
    print(f'land, islands, ice shelves, lakes: {", ".join(str(len(r)) for r, _ in layers)} row crossings', flush=True)

    out = np.empty((HEIGHT, WIDTH), dtype=np.uint8)
    step = BAND * SAMPLES
    for r0 in range(0, sh, step):
        r1 = r0 + step
        ground, small, shelf, lake = (fill(rows, xs, r0, r1, sw) for rows, xs in layers)
        water = ~(ground | small | shelf) | lake
        share = water.reshape(BAND, SAMPLES, WIDTH, SAMPLES).mean(axis=(1, 3))
        out[r0 // SAMPLES : r1 // SAMPLES] = np.round(share * 255).astype(np.uint8)

    def at(lat: float, lon: float) -> int:
        return int(out[int((90 - lat) / 180 * HEIGHT), int((lon + 180) / 360 * WIDTH)])

    checks = {'Pacific': (0, -150, 255), 'Sahara': (23, 10, 0), 'Caspian Sea': (42, 50.5, 255),
              'Lake Superior': (47.6, -87.5, 255), 'Antarctica': (-85, 0, 0), 'Lake Victoria': (-1, 33, 255),
              'Ross Ice Shelf': (-81, -175, 0)}
    for name, (lat, lon, want) in checks.items():
        got = at(lat, lon)
        print(f'{name}: {got}', flush=True)
        if got != want:
            raise ValueError(f'{name} should be {want}, got {got}')
    write_png(out, OUT)
    print(f'wrote {OUT.relative_to(ROOT)}: {WIDTH} x {HEIGHT}, {OUT.stat().st_size / 1e3:.0f} KB, '
          f'{(out > 127).mean() * 100:.1f} % water', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        import traceback

        traceback.print_exc()
        sys.exit(1)
