"""
Build the photographic Earth pictures in public/textures/earth/ from NASA GIBS (no key needed).

  colour.jpg  4096 x 2048  NASA Blue Marble: Next Generation (layer BlueMarble_NextGeneration)
  clouds.jpg  4096 x 2048  clouds of one real day (VIIRS on Suomi NPP and NOAA-20, corrected reflectance),
                           found by how much whiter each pixel is than Blue Marble's cloud-free picture
  water.png   2048 x 1024  where the sea and lakes are (layer OSM_Land_Water_Map), for the Sun's glint
  lights.jpg  2048 x 1024  city lights at night (layer VIIRS_Black_Marble, 2016)

All are plate carree: column 0 is 180 W, row 0 is 90 N. The game's globe shifts them to its own seam.

GIBS WMTS, EPSG:4326 "best": level 3 of the 250m/500m tile matrix sets is 10 x 5 tiles of 512 px, 0.0703125 degrees a
pixel, so 5120 columns span exactly 360 degrees. eoimages.gsfc.nasa.gov is not reachable from the build machine.

There is no system Python with Pillow on the team's machine, so this runs inside Blender (its Python has NumPy and
Blender reads and writes JPEG and PNG):

  "C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b --factory-startup -P scripts/build_earth_textures.py

Tiles are cached in .leap/art-src/space/tiles/ (git-ignored), so a second run does not download again.
"""
import os
import sys
import urllib.request
from pathlib import Path

import bpy
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / '.leap' / 'art-src' / 'space' / 'tiles'
OUT = ROOT / 'public' / 'textures' / 'earth'
GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best'
CLOUD_DAY = '2024-09-10'

LAYERS = {
    'bluemarble': (f'{GIBS}/BlueMarble_NextGeneration/default/500m/{{z}}/{{row}}/{{col}}.jpeg', 3),
    'snpp': (f'{GIBS}/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{CLOUD_DAY}/250m/{{z}}/{{row}}/{{col}}.jpeg', 3),
    'noaa20': (f'{GIBS}/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/{CLOUD_DAY}/250m/{{z}}/{{row}}/{{col}}.jpeg', 3),
    'water': (f'{GIBS}/OSM_Land_Water_Map/default/250m/{{z}}/{{row}}/{{col}}.png', 3),
    'lights': (f'{GIBS}/VIIRS_Black_Marble/default/2016-01-01/500m/{{z}}/{{row}}/{{col}}.png', 2),
}


def fetch(url: str, path: Path) -> None:
    if path.exists() and path.stat().st_size > 0:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={'User-Agent': 'leap-build-script'})
    with urllib.request.urlopen(request, timeout=120) as response:
        path.write_bytes(response.read())


def read(path: Path) -> np.ndarray:
    """RGBA floats 0-1, top row first."""
    image = bpy.data.images.load(str(path))
    image.colorspace_settings.name = 'Non-Color'  # raw file values, no conversion
    w, h = image.size
    pixels = np.empty(w * h * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    bpy.data.images.remove(image)
    return pixels.reshape(h, w, 4)[::-1]


def layer(name: str) -> np.ndarray:
    url, z = LAYERS[name]
    cols, rows = {2: (5, 3), 3: (10, 5)}[z]
    grid = []
    for r in range(rows):
        line = []
        for c in range(cols):
            path = CACHE / name / f'{z}_{r}_{c}{Path(url).suffix}'
            fetch(url.format(z=z, row=r, col=c), path)
            line.append(read(path))
        grid.append(np.hstack(line))
    world = np.vstack(grid)
    height = world.shape[1] // 2
    world = world[:height]
    print(f'{name}: {world.shape[1]} x {world.shape[0]}', flush=True)
    return world[..., :3]


def shrink(a: np.ndarray, width: int) -> np.ndarray:
    """Area-average resize to `width` x `width / 2` (separable, exact box weights)."""
    def axis(a: np.ndarray, n: int, ax: int) -> np.ndarray:
        m = a.shape[ax]
        edges = np.linspace(0, m, n + 1)
        out = []
        for i in range(n):
            lo, hi = edges[i], edges[i + 1]
            i0, i1 = int(np.floor(lo)), int(np.ceil(hi))
            idx = np.arange(i0, i1)
            w = np.minimum(idx + 1, hi) - np.maximum(idx, lo)
            part = np.take(a, idx, axis=ax)
            shape = [1] * a.ndim
            shape[ax] = len(idx)
            out.append((part * w.reshape(shape)).sum(axis=ax) / w.sum())
        return np.stack(out, axis=ax)

    return axis(axis(a, width // 2, 0), width, 1)


def save(a: np.ndarray, path: Path, quality: int = 88) -> None:
    """Save an H x W x 3 (or H x W) array of 0-1 floats, top row first, as JPEG or PNG."""
    if a.ndim == 2:
        a = np.repeat(a[..., None], 3, axis=2)
    h, w = a.shape[:2]
    rgba = np.concatenate([a, np.ones((h, w, 1), dtype=np.float32)], axis=2)[::-1].astype(np.float32)
    image = bpy.data.images.new(path.stem, w, h, alpha=False)
    image.colorspace_settings.name = 'Non-Color'
    image.pixels.foreach_set(np.clip(rgba, 0, 1).ravel())
    scene = bpy.context.scene
    settings = scene.render.image_settings
    settings.file_format = 'JPEG' if path.suffix == '.jpg' else 'PNG'
    settings.color_mode = 'RGB' if a[..., 0].std() and not np.allclose(a[..., 0], a[..., 1]) else 'BW'
    settings.quality = quality
    settings.compression = 90
    if hasattr(settings, 'color_management'):
        settings.color_management = 'OVERRIDE'
        settings.view_settings.view_transform = 'Standard'
        settings.view_settings.look = 'None'
        settings.view_settings.exposure = 0
        settings.view_settings.gamma = 1
        settings.display_settings.display_device = 'sRGB'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    image.filepath_raw = str(path)
    image.save_render(str(path), scene=scene)
    bpy.data.images.remove(image)
    print(f'wrote {path.relative_to(ROOT)}: {path.stat().st_size / 1e6:.2f} MB', flush=True)


def luminance(a: np.ndarray) -> np.ndarray:
    return a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    original = ROOT / '.leap' / 'art-src' / 'space'

    blue = layer('bluemarble')
    save(shrink(blue, 4096), OUT / 'colour.jpg', 86)

    # Clouds: two satellites of the same day fill each other's gaps between swaths (no data is black).
    days = [layer('snpp'), layer('noaa20')]
    base = luminance(blue)
    covers = []
    for day in days:
        lowest = day.min(axis=2)
        spread = day.max(axis=2) - lowest
        # White and grey, brighter than the cloud-free ground below: that is cloud. Coloured or dark is ground.
        cover = (lowest - base * 1.1 - 0.2) / 0.6 - np.maximum(spread - 0.1, 0) * 3.0
        cover = np.clip(cover, 0, 1)
        has_data = luminance(day) > 0.012
        covers.append(np.where(has_data, cover, np.nan))
    stack = np.stack(covers)
    cloud = np.nanmean(stack, axis=0)
    cloud = np.nan_to_num(cloud, nan=0.0)
    cloud = np.clip(cloud, 0, 1) ** 1.25
    # Sea ice round Antarctica and in the Arctic is as white as cloud and not in Blue Marble: fade the polar belts.
    lat = 90 - (np.arange(cloud.shape[0]) + 0.5) * 180 / cloud.shape[0]
    polar = np.clip((np.abs(lat) - 58) / 14, 0, 1)
    cloud *= (1 - 0.75 * polar)[:, None]
    save(shrink(cloud, 4096), OUT / 'clouds.jpg', 82)

    water = layer('water')
    # OSM land/water map: water is the lighter grey, land the darker one.
    is_water = (luminance(water) > 0.38).astype(np.float32)
    save(shrink(is_water, 2048), OUT / 'water.png')

    lights = layer('lights')
    glow = np.clip(luminance(lights), 0, 1)
    save(shrink(glow, 2048), OUT / 'lights.jpg', 85)

    print('kept tiles in', original, flush=True)


try:
    main()
except Exception as error:  # make Blender exit non-zero
    import traceback

    traceback.print_exc()
    sys.exit(1)
