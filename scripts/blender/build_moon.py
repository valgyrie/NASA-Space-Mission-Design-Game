"""
The Moon's textures for LEAP, from NASA's CGI Moon Kit (NASA's Scientific Visualization Studio, Ernie Wright,
https://svs.gsfc.nasa.gov/4720, public domain):

  lroc_color_poles_4k.tif  LRO Camera (LROC WAC) colour mosaic, 4096 x 2048, centred on 0 deg longitude
  ldem_16_uint.tif         LOLA elevation, 16 pixels a degree, uint16 half-metres above 1,727,400 m

Writes public/textures/moon/colour.jpg (4096 x 2048) and normal.jpg (2048 x 1024, tangent space, OpenGL
convention: +x east, +y north, relief exaggerated RELIEF times so 8 bits keep the gentle slopes; the game turns
it down with normalScale).

Run headless (Blender's own Python has NumPy):
  blender -b --factory-startup -P scripts/blender/build_moon.py -- <folder with the two .tif files> <out folder>
"""

import os
import sys

import bpy
import numpy as np

RELIEF = 4.0
MOON_M = 1_737_400.0


def args():
    a = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return a[0], a[1]


def load(path, data=False):
    img = bpy.data.images.load(path)
    if data:
        img.colorspace_settings.name = "Non-Color"
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    return img, px.reshape(h, w, 4)


def save(rgb, path, quality):
    """rgb: rows bottom-up (Blender's order), values 0-1."""
    h, w, _ = rgb.shape
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=False)
    img.colorspace_settings.name = "Non-Color"
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[:, :, :3] = np.clip(rgb, 0, 1)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = path
    img.file_format = "JPEG"
    img.save(quality=quality)
    print("wrote", path, os.path.getsize(path) // 1024, "KB")


def resample(a, w, h):
    """Bilinear resample of a 2D array to h x w (longitude wraps)."""
    sh, sw = a.shape
    xs = (np.arange(w) + 0.5) * sw / w - 0.5
    ys = (np.arange(h) + 0.5) * sh / h - 0.5
    x0 = np.floor(xs).astype(int)
    fx = xs - x0
    y0 = np.clip(np.floor(ys).astype(int), 0, sh - 1)
    y1 = np.clip(y0 + 1, 0, sh - 1)
    fy = np.clip(ys - np.floor(ys), 0, 1)
    x1 = (x0 + 1) % sw
    x0 = x0 % sw
    top = a[y0][:, x0] * (1 - fx) + a[y0][:, x1] * fx
    bot = a[y1][:, x0] * (1 - fx) + a[y1][:, x1] * fx
    return top * (1 - fy[:, None]) + bot * fy[:, None]


def main():
    src, out = (os.path.abspath(p) for p in args())
    os.makedirs(out, exist_ok=True)

    # Colour: kept as it is (sRGB), only re-encoded.
    _, colour = load(os.path.join(src, "lroc_color_poles_4k.tif"), data=True)
    save(colour[:, :, :3], os.path.join(out, "colour.jpg"), 86)

    # Elevation in metres from the mean radius, box-filtered down before the gradient so it doesn't alias.
    _, dem = load(os.path.join(src, "ldem_16_uint.tif"), data=True)
    metres = dem[:, :, 0].astype(np.float64) * 65535.0 * 0.5 + 1_727_400.0 - MOON_M
    print("elevation range m:", metres.min(), metres.max())
    w, h = 2048, 1024
    hm = resample(metres, w, h)
    # Rows bottom-up: row 0 is the south pole edge. Latitude of each row's centre:
    lat = ((np.arange(h) + 0.5) / h - 0.5) * np.pi
    dx = 2 * np.pi * MOON_M * np.maximum(np.cos(lat), 0.02) / w
    dy = np.pi * MOON_M / h
    gx = (np.roll(hm, -1, axis=1) - np.roll(hm, 1, axis=1)) / (2 * dx[:, None])
    up = np.vstack([hm[1:], hm[-1:]])
    down = np.vstack([hm[:1], hm[:-1]])
    gy = (up - down) / (2 * dy)
    nx = -gx * RELIEF
    ny = -gy * RELIEF
    nz = np.ones_like(nx)
    n = np.sqrt(nx * nx + ny * ny + nz * nz)
    rgb = np.stack([nx / n, ny / n, nz / n], axis=-1) * 0.5 + 0.5
    save(rgb.astype(np.float32), os.path.join(out, "normal.jpg"), 90)


main()
