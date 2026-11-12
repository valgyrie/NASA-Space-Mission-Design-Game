"""
Build src/world/blueMarble.ts: NASA Blue Marble land colours on the game's 1-degree Earth map.

Source: NASA Blue Marble: Next Generation (MODIS), layer BlueMarble_NextGeneration, served by NASA GIBS
(Global Imagery Browse Services) as WMTS tiles, no key needed:
  https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/500m/{level}/{row}/{col}.jpeg
Level 2 is 5 x 3 tiles of 512 px at 0.140625 degrees a pixel, so its 2560 columns span exactly 180W to 180E.

Run from the repository root:  python3 scripts/build_blue_marble.py > src/world/blueMarble.ts
Needs numpy and Pillow. Only cells that are land on the Natural Earth map (src/world/earthMap.ts) get a
colour, so coastlines stay the same; the sea keeps the globe shader's own colours.
"""
import io
import re
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

TILE = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/500m/2/{row}/{col}.jpeg'
DEGREES_PER_PIXEL = 0.140625
COLOURS = 52  # one letter each, A-Z then a-z, so run lengths can be plain numbers
LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'


def tile(row, col):
    with urllib.request.urlopen(TILE.format(row=row, col=col), timeout=120) as response:
        return np.asarray(Image.open(io.BytesIO(response.read())).convert('RGB'))


world = np.vstack([np.hstack([tile(r, c) for c in range(5)]) for r in range(3)])
height = round(180 / DEGREES_PER_PIXEL)
world = world[:height].astype(float)

# Average every pixel whose centre falls in a 1-degree cell (row 0 is 90N to 89N, column 0 is 180W to 179W).
centres = (np.arange(height) + 0.5) * DEGREES_PER_PIXEL
rows = centres.astype(int)
cols = ((np.arange(world.shape[1]) + 0.5) * DEGREES_PER_PIXEL).astype(int)
sums = np.zeros((180, 360, 3))
counts = np.zeros((180, 360, 1))
np.add.at(sums, (rows[:, None], cols[None, :]), world)
np.add.at(counts, (rows[:, None], cols[None, :]), 1)
cells = sums / counts

# Land cells from the game's own map, so Blue Marble only recolours what is already land.
text = Path('src/world/earthMap.ts').read_text()
map_rows = re.findall(r"^  '([^']*)',$", text, re.M)
assert len(map_rows) == 180, len(map_rows)
land = np.array([[c != '.' for c in ''.join(ch * int(n or 1) for ch, n in re.findall(r'([a-z.])(\d*)', r))] for r in map_rows])

# One shared palette for all land cells (Pillow's median cut), so each cell is a single letter.
pixels = cells[land].round().clip(0, 255).astype(np.uint8)
strip = Image.fromarray(pixels.reshape(1, -1, 3), 'RGB').quantize(colors=COLOURS, method=Image.Quantize.MEDIANCUT)
palette = np.array(strip.getpalette()[: COLOURS * 3]).reshape(-1, 3)
index = np.full(land.shape, -1)
index[land] = np.asarray(strip)[0]


def encode(row):
    out = []
    i = 0
    while i < len(row):
        j = i
        while j < len(row) and row[j] == row[i]:
            j += 1
        out.append(('.' if row[i] < 0 else LETTERS[row[i]]) + (str(j - i) if j - i > 1 else ''))
        i = j
    return ''.join(out)


print('/**')
print(' * NASA Blue Marble: Next Generation (MODIS) land colours on the 1-degree Earth map, made by')
print(' * scripts/build_blue_marble.py from NASA GIBS. Do not edit by hand.')
print(' * Rows run from 90°N to 90°S, columns from 180°W east to 180°E, run-length coded like earthMap.ts:')
print(' * a letter (a colour in BLUE_MARBLE_PALETTE, A first) or "." for sea, then how many cells it repeats.')
print(' */')
print('export const BLUE_MARBLE_PALETTE: readonly number[] = [')
for k in range(0, COLOURS, 8):
    print('  ' + ' '.join(f'0x{r:02x}{g:02x}{b:02x},' for r, g, b in palette[k : k + 8]))
print('];')
print('export const BLUE_MARBLE_ROWS: readonly string[] = [')
for r in range(180):
    print(f"  '{encode(index[r])}',")
print('];')
