"""
Textures for the trees and bushes (stream 5 of the graphics overhaul).

Blender is only used as a Python with NumPy and image input/output here: nothing is rendered. The script cuts
single leaves and needle sprays out of CC0 ambientCG atlases and lays them out as leaf-cluster cards, then packs the
cards and a bark strip into one atlas, so every tree kind draws with a single material:

  public/textures/nature/foliage_col.jpg   colour (sRGB), 1024 x 1536
  public/textures/nature/foliage_mask.jpg  coverage (grey), 1024 x 1536

Atlas layout (u right, v down, in pixels of the final atlas; the game mirrors these numbers in treeModels.ts):
  (0, 0)-(512, 512)      broadleaf cluster, beech leaves
  (512, 0)-(1024, 512)   broadleaf cluster, oak leaves
  (0, 512)-(1024, 768)   conifer branch tier (base on the left, tip on the right)
  (0, 768)-(1024, 1024)  bark (opaque; u around the trunk, v along it)
  (0, 1024)-(256, 1536)  whole spruce from the side (crossed cards)
  (256, 1024)-(512, 1536) whole pine from the side

Sources (download once into .leap/art-src/nature/dl/<id>/, see docs/art/assets-nature.md):
  LeafSet024 (beech), LeafSet016 (oak), LeafSet019 (needles), Bark012 (bark) from https://ambientcg.com, CC0.

Run:
  "C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b --factory-startup -P scripts/blender/build_nature.py
"""
import math
import os
import random
import urllib.request
import zipfile

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
DL = os.path.join(ROOT, '.leap', 'art-src', 'nature', 'dl')
OUT = os.path.join(ROOT, 'public', 'textures', 'nature')

SOURCES = ['LeafSet024', 'LeafSet016', 'LeafSet019', 'Bark012']


def fetch():
    for asset in SOURCES:
        folder = os.path.join(DL, asset)
        if os.path.exists(os.path.join(folder, f'{asset}_1K-JPG_Color.jpg')):
            continue
        os.makedirs(folder, exist_ok=True)
        url = f'https://ambientcg.com/get?file={asset}_1K-JPG.zip'
        print('download', url)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (texture fetch)'})
        path = os.path.join(DL, f'{asset}.zip')
        with urllib.request.urlopen(req) as r, open(path, 'wb') as f:
            f.write(r.read())
        with zipfile.ZipFile(path) as z:
            z.extractall(folder)


def load(asset, kind):
    """An ambientCG map as a float array, rows top-down, raw (sRGB) values."""
    img = bpy.data.images.load(os.path.join(DL, asset, f'{asset}_1K-JPG_{kind}.jpg'))
    img.colorspace_settings.name = 'Non-Color'
    a = np.empty(len(img.pixels), dtype=np.float32)
    img.pixels.foreach_get(a)
    a = a.reshape(img.size[1], img.size[0], 4)[::-1].copy()
    bpy.data.images.remove(img)
    return a


def save(arr, name, quality=88):
    """Write an H x W x 3 (or 4) float array, rows top-down, as a JPG in OUT."""
    h, w = arr.shape[:2]
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[..., :3] = arr[..., :3] if arr.ndim == 3 else arr[..., None]
    img = bpy.data.images.new(name, w, h, alpha=False)
    img.colorspace_settings.name = 'Non-Color'
    img.pixels.foreach_set(np.ascontiguousarray(rgba[::-1]).ravel())
    path = os.path.join(OUT, f'{name}.jpg')
    img.file_format = 'JPEG'
    img.filepath_raw = path
    img.save(filepath=path, quality=quality)
    bpy.data.images.remove(img)
    print('wrote', path, os.path.getsize(path) // 1024, 'KB')


def blur(a, sigma):
    """Gaussian blur of a 2D array (wrapping)."""
    h, w = a.shape
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    g = np.exp(-2 * (math.pi * sigma) ** 2 * (fx ** 2 + fy ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(a) * g))


def resize(a, w, h):
    """Bilinear resize of an H x W x C array."""
    sh, sw = a.shape[:2]
    ys = (np.arange(h) + 0.5) * sh / h - 0.5
    xs = (np.arange(w) + 0.5) * sw / w - 0.5
    y0 = np.clip(np.floor(ys).astype(int), 0, sh - 1)
    x0 = np.clip(np.floor(xs).astype(int), 0, sw - 1)
    y1 = np.clip(y0 + 1, 0, sh - 1)
    x1 = np.clip(x0 + 1, 0, sw - 1)
    fy = np.clip(ys - y0, 0, 1)[:, None, None]
    fx = np.clip(xs - x0, 0, 1)[None, :, None]
    top = a[y0][:, x0] * (1 - fx) + a[y0][:, x1] * fx
    bot = a[y1][:, x0] * (1 - fx) + a[y1][:, x1] * fx
    return top * (1 - fy) + bot * fy


# ---------------------------------------------------------------------------------------------
# Sprites: one leaf or spray each, RGBA, base at the bottom middle, tip at the top.
# ---------------------------------------------------------------------------------------------

def crop(col, mask, x0, y0, x1, y1):
    """Cut the shape in a box of an atlas down to its own bounds (ignoring stray specks)."""
    c = col[y0:y1, x0:x1, :3]
    m = mask[y0:y1, x0:x1, 0]
    m = np.clip((m - 0.25) / 0.5, 0, 1)
    rows = np.where((m > 0.5).sum(axis=1) > 6)[0]
    cols = np.where((m > 0.5).sum(axis=0) > 6)[0]
    c = c[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]
    m = m[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]
    return np.dstack([c, m]).astype(np.float32)


def leaves(asset, grid_x, grid_y):
    col = load(asset, 'Color')
    mask = load(asset, 'Opacity')
    h, w = col.shape[:2]
    out = []
    for gy in range(grid_y):
        for gx in range(grid_x):
            out.append(crop(col, mask, gx * w // grid_x, gy * h // grid_y, (gx + 1) * w // grid_x, (gy + 1) * h // grid_y))
    return out


def sprays():
    col = load('LeafSet019', 'Color')
    mask = load('LeafSet019', 'Opacity')
    out = []
    for y0, y1 in ((40, 300), (300, 640), (640, 1010)):
        s = crop(col, mask, 0, y0, 1024, y1)
        # Base (the cut stem) is on the right: turn it to the bottom, tip up.
        out.append(np.rot90(s, -1).copy())
    return out


# ---------------------------------------------------------------------------------------------
# Drawing on a card
# ---------------------------------------------------------------------------------------------

class Card:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.rgb = np.zeros((h, w, 3), dtype=np.float32)
        self.a = np.zeros((h, w), dtype=np.float32)

    def stamp(self, sprite, bx, by, angle, length, tint=(1, 1, 1), shade=1.0, width=1.0):
        """Draw `sprite` with its base at (bx, by), pointing `angle` (0 = up, clockwise, radians), `length` px long."""
        sh, sw = sprite.shape[:2]
        s = length / sh
        d = np.array([math.sin(angle), -math.cos(angle)])  # base → tip
        e = np.array([math.cos(angle), math.sin(angle)])  # across
        corners = [np.array([bx, by]) + d * t * length + e * u * sw * s * width / 2 for t in (0, 1) for u in (-1, 1)]
        xs = [c[0] for c in corners]
        ys = [c[1] for c in corners]
        x0, x1 = max(0, int(min(xs)) - 1), min(self.w, int(max(xs)) + 2)
        y0, y1 = max(0, int(min(ys)) - 1), min(self.h, int(max(ys)) + 2)
        if x0 >= x1 or y0 >= y1:
            return
        py, px = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        rx, ry = px - bx, py - by
        along = (rx * d[0] + ry * d[1]) / s
        across = (rx * e[0] + ry * e[1]) / (s * width)
        sx = np.round(sw / 2 + across).astype(int)
        sy = np.round(sh - 1 - along).astype(int)
        inside = (sx >= 0) & (sx < sw) & (sy >= 0) & (sy < sh)
        sx = np.clip(sx, 0, sw - 1)
        sy = np.clip(sy, 0, sh - 1)
        src = sprite[sy, sx]
        alpha = src[..., 3] * inside
        colour = src[..., :3] * np.array(tint, dtype=np.float32) * shade
        region = self.rgb[y0:y1, x0:x1]
        region[:] = colour * alpha[..., None] + region * (1 - alpha[..., None])
        self.a[y0:y1, x0:x1] = alpha + self.a[y0:y1, x0:x1] * (1 - alpha)

    def line(self, ax, ay, bx, by, r0, r1, colour):
        """A tapered stick from (ax, ay) (radius r0) to (bx, by) (radius r1)."""
        x0, x1 = max(0, int(min(ax, bx) - r0 - 2)), min(self.w, int(max(ax, bx) + r0 + 3))
        y0, y1 = max(0, int(min(ay, by) - r0 - 2)), min(self.h, int(max(ay, by) + r0 + 3))
        if x0 >= x1 or y0 >= y1:
            return
        py, px = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        vx, vy = bx - ax, by - ay
        t = np.clip(((px - ax) * vx + (py - ay) * vy) / max(1e-6, vx * vx + vy * vy), 0, 1)
        dist = np.hypot(px - (ax + vx * t), py - (ay + vy * t))
        r = r0 + (r1 - r0) * t
        alpha = np.clip(r - dist + 0.5, 0, 1)
        shade = 0.75 + 0.25 * np.clip(1 - dist / np.maximum(r, 0.5), 0, 1)
        region = self.rgb[y0:y1, x0:x1]
        region[:] = np.array(colour)[None, None] * shade[..., None] * alpha[..., None] + region * (1 - alpha[..., None])
        self.a[y0:y1, x0:x1] = alpha + self.a[y0:y1, x0:x1] * (1 - alpha)

    def finish(self, scale=2):
        """Fill the colour behind transparent pixels (so mipmaps don't darken the edges), then shrink by `scale`."""
        a = self.a
        fill = np.dstack([blur(self.rgb[..., c] * a, 12) for c in range(3)]) / np.maximum(blur(a, 12), 1e-4)[..., None]
        rgb = self.rgb * a[..., None] + np.clip(fill, 0, 1) * (1 - a[..., None])
        h, w = self.h // scale, self.w // scale
        rgb = rgb.reshape(h, scale, w, scale, 3).mean(axis=(1, 3))
        a = a.reshape(h, scale, w, scale).mean(axis=(1, 3))
        return rgb, a


TWIG = (0.30, 0.24, 0.17)


def broadleaf_card(sprites, seed, size=1024):
    """A sprig of leaves seen side-on: a twig up the middle, side shoots, leaves at their tips; deeper leaves darker."""
    rnd = random.Random(seed)
    card = Card(size, size)
    stamps = []
    # Twigs: main stem from the bottom middle, curving; side shoots alternate.
    cx, cy = size * 0.5, size * 0.97
    shoots = []
    pts = [(cx, cy)]
    for i in range(1, 7):
        t = i / 6
        pts.append((cx + math.sin(t * 2.2 + seed) * size * 0.05, cy - t * size * 0.74))
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        card.line(ax, ay, bx, by, 7 * (ay / size) + 2, 7 * (by / size) + 2, TWIG)
    for i in range(1, 13):
        t = 0.12 + 0.82 * i / 13
        j = int(t * 6)
        (ax, ay), (bx, by) = pts[j], pts[min(j + 1, 6)]
        f = t * 6 - j
        sx, sy = ax + (bx - ax) * f, ay + (by - ay) * f
        side = -1 if i % 2 else 1
        ang = side * (0.6 + rnd.uniform(0, 0.55)) * (1.15 - t * 0.5)
        ln = size * (0.30 - 0.18 * t) * rnd.uniform(0.8, 1.15)
        ex, ey = sx + math.sin(ang) * ln, sy - math.cos(ang) * ln
        card.line(sx, sy, ex, ey, 3.2, 1.4, TWIG)
        shoots.append((sx, sy, ex, ey, ang, ln))
    shoots.append((pts[-2][0], pts[-2][1], pts[-1][0], pts[-1][1], 0.0, size * 0.14))
    # Leaves along each shoot and in a fan at its tip.
    for sx, sy, ex, ey, ang, ln in shoots:
        n = max(3, int(ln / (size * 0.045)))
        for k in range(n):
            t = (k + 1) / n
            px, py = sx + (ex - sx) * t, sy + (ey - sy) * t
            for side in (-1, 1):
                a = ang + side * rnd.uniform(0.5, 1.1)
                stamps.append((px, py, a, size * rnd.uniform(0.085, 0.12)))
        for a in (-0.45, 0.0, 0.45):
            stamps.append((ex, ey, ang + a + rnd.uniform(-0.15, 0.15), size * rnd.uniform(0.1, 0.13)))
    rnd.shuffle(stamps)
    for idx, (px, py, a, ln) in enumerate(stamps):
        depth = idx / len(stamps)
        shade = 0.5 + 0.5 * depth ** 0.7
        warm = rnd.uniform(-0.06, 0.06)
        tint = (0.82 + warm, 0.92, 0.66 - warm)
        card.stamp(rnd.choice(sprites), px, py, a, ln, tint, shade * rnd.uniform(0.85, 1.05), width=rnd.uniform(0.85, 1.1))
    return card.finish()


def conifer_card(sprays_, seed, w=2048, h=512):
    """A branch tier: a bough from the trunk (left) to the tip (right), sprays fanning off it; deeper ones darker."""
    rnd = random.Random(seed)
    card = Card(w, h)
    by = h * 0.5
    card.line(0, by, w * 0.95, by + h * 0.04, 10, 2, TWIG)
    stamps = []
    for i in range(16):
        t = 0.06 + 0.9 * i / 16
        x = w * 0.95 * t
        y = by + h * 0.04 * t
        side = -1 if i % 2 else 1
        a = math.pi / 2 + side * rnd.uniform(0.1, 0.3)
        ln = w * (0.24 - 0.12 * t) * rnd.uniform(0.85, 1.05)
        stamps.append((x, y, a, ln))
    stamps.append((w * 0.55, by + h * 0.02, math.pi / 2, w * 0.42))
    rnd.shuffle(stamps)
    for idx, (x, y, a, ln) in enumerate(stamps):
        shade = 0.55 + 0.45 * (idx / len(stamps)) ** 0.7
        card.stamp(rnd.choice(sprays_), x, y, a, ln, (0.78, 0.88, 0.8), shade, width=rnd.uniform(0.75, 0.95))
    return card.finish()


def conifer_silhouette(sprays_, seed, pine=False, w=512, h=1024):
    """A whole conifer seen from the side (for crossed cards): trunk up the middle, tiers of drooping sprays."""
    rnd = random.Random(seed)
    card = Card(w, h)
    cx = w / 2
    card.line(cx, h * 0.995, cx, h * 0.03, 10 if pine else 8, 2, TWIG)
    stamps = []
    tiers = 18 if pine else 28
    for i in range(tiers):
        f = i / (tiers - 1)
        if pine:
            f = 0.45 + 0.55 * f
            half = w * 0.44 * max(0.0, math.sin(math.pi * min(1.0, (f - 0.42) / 0.6))) ** 0.7 + 10
            droop = -0.25 + 0.3 * f
        else:
            half = w * 0.47 * (1 - f) ** 0.95 + 10
            droop = 0.35 - 0.2 * f
        y = h * (0.97 - 0.93 * f)
        light = 0.62 + 0.38 * f
        for side in (-1, 1):
            for k in range(2):
                a = side * (math.pi / 2 + droop + rnd.uniform(-0.12, 0.12) - k * 0.35)
                ln = half * (1.1 - 0.35 * k) * rnd.uniform(0.85, 1.05)
                stamps.append((cx + side * rnd.uniform(0, 6), y + rnd.uniform(-6, 6), a, ln, light))
    rnd.shuffle(stamps)
    for idx, (x, y, a, ln, light) in enumerate(stamps):
        shade = (0.6 + 0.4 * (idx / len(stamps)) ** 0.7) * light
        card.stamp(rnd.choice(sprays_), x, y, a, max(ln, 12), (0.8, 0.9, 0.78), shade, width=rnd.uniform(0.9, 1.15))
    return card.finish()


def bark_strip():
    col = load('Bark012', 'Color')[..., :3]
    return resize(col, 1024, 256)


def main():
    fetch()
    os.makedirs(OUT, exist_ok=True)
    beech = leaves('LeafSet024', 3, 3)
    oak = leaves('LeafSet016', 3, 2)
    needles = sprays()
    rgb = np.zeros((1536, 1024, 3), dtype=np.float32)
    a = np.zeros((1536, 1024), dtype=np.float32)
    c, m = broadleaf_card(beech, 1)
    rgb[0:512, 0:512], a[0:512, 0:512] = c, m
    c, m = broadleaf_card(oak, 2)
    rgb[0:512, 512:1024], a[0:512, 512:1024] = c, m
    c, m = conifer_card(needles, 3)
    rgb[512:768, :], a[512:768, :] = c, m
    rgb[768:1024, :] = bark_strip()
    a[768:1024, :] = 1
    c, m = conifer_silhouette(needles, 4)
    rgb[1024:1536, 0:256], a[1024:1536, 0:256] = c, m
    c, m = conifer_silhouette(needles, 5, pine=True)
    rgb[1024:1536, 256:512], a[1024:1536, 256:512] = c, m
    save(rgb, 'foliage_col', 86)
    save(np.clip(a, 0, 1), 'foliage_mask', 90)


main()
