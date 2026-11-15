"""
Build LEAP's launch-complex models and export them to public/models/launch.glb.

  blender -b --factory-startup -P scripts/blender/build_launch.py              # build, bake AO, export
  blender -b --factory-startup -P scripts/blender/build_launch.py -- --no-ao   # skip the AO bake (quick look)

Three root nodes, each with a `role` in its glTF extras (src/world/launchModels.ts finds them by it):
  common   the sunken flame trench and its deflector, the tank farm, pipe runs, floodlight towers, fences;
  classic  a late-1950s Cape Canaveral pad (after LC-17 / LC-26): launch stand, umbilical mast with swing arms, the
           mobile service gantry rolled back on its rails, lightning masts with catenary wires, domed blockhouse,
           cable tray;
  modern   an SLC-40-like pad for Falcon 9: launch mount, transporter-erector, crew access tower, four lightning
           towers, deluge water tower.
Metres. Blender is Z-up; after export game x = Blender x, game y = Blender z, game z = -Blender y. The rocket stands
at the origin with its base 1.8 m up. The ground mesh is not in the file: launchGround.ts opens it over the trench.

Textures: Poly Haven (CC0), downloaded into .leap/art-src/launch/tex on first run (docs/art/assets-launch.md). The
same run writes the hardstand textures the ground shader uses into public/textures/launch/.
"""
import math
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bmesh  # noqa: E402
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402

import lib  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.join(lib.ROOT, 'public', 'models', 'launch.glb')
GROUND_TEX = os.path.join(lib.ROOT, 'public', 'textures', 'launch')

# lib's texture pipeline, pointed at this stream's folders and sets.
lib.ART = os.path.join(lib.ROOT, '.leap', 'art-src', 'launch')
lib.TEX_SRC = os.path.join(lib.ART, 'tex')
lib.TEX_OUT = os.path.join(lib.ART, 'tex_out')
# key: (Poly Haven asset, size, colour mode, contrast, gain, weathering) — see lib.PH_SETS.
lib.PH_SETS = {
    'paint': ('rusty_painted_metal', 1024, 'grey', 0.75, 1.0, 0.35),
    'plate': ('blue_metal_plate', 1024, 'grey', 0.7, 1.0, 0.3),
    'concrete': ('concrete_floor_worn_001', 1024, 'grey', 1.0, 1.0, 0.3),
    'metal': ('metal_plate_02', 512, 'grey', 0.9, 1.0, 0.2),
}
lib.ROUGH = {'paint': (0.42, 0.4), 'plate': (0.36, 0.4), 'concrete': (0.55, 0.4), 'metal': (0.38, 0.45)}

import parts as P  # noqa: E402

TAU = math.tau
UP = Vector((0, 0, 1))


def V(x, y, z=0.0):
    return Vector((x, y, z))


# ---------------------------------------------------------------------------------------------
# Textures and materials
# ---------------------------------------------------------------------------------------------

def grating_texture(size=256):
    """Bar grating with alpha, 0.4 m per repeat: deep bearing bars every 40 mm, cross bars every 100 mm. The bars
    are drawn wider than they are, as they look at a slant, so the deck stays solid in the distance (mip alpha > 0.5)."""
    v, u = np.mgrid[0:size, 0:size] / size
    bear = np.abs(((u * 10) % 1) - 0.5) > 0.24
    cross = np.abs(((v * 4) % 1) - 0.5) > 0.44
    a = np.zeros((size, size, 4), dtype=np.float32)
    rng = np.random.default_rng(5)
    grime = lib._norm(lib._blur_wrap(rng.random((size, size)), size / 10))
    shade = 0.5 + 0.25 * grime + 0.25 * cross
    a[..., 0] = a[..., 1] = a[..., 2] = shade
    a[..., 3] = (bear | cross).astype(np.float32)
    return lib._save(a, 'grating_col', alpha=True)


def ground_textures():
    """The concrete for the hardstand round the pad (drawn by the ground shader, not in the GLB)."""
    os.makedirs(GROUND_TEX, exist_ok=True)
    asset = lib.PH_SETS['concrete'][0]
    col = lib._load_scaled(os.path.join(lib.TEX_SRC, f'{asset}_diff_1k.jpg'), 1024)
    col[..., 3] = 1
    nor = lib._load_scaled(os.path.join(lib.TEX_SRC, f'{asset}_nor_gl_1k.jpg'), 1024)
    for arr, name, q in ((col, 'hardstand_col', 84), (nor, 'hardstand_nor', 86)):
        shutil.copyfile(lib._save(arr, name, q), os.path.join(GROUND_TEX, f'{name}.jpg'))


def make_materials():
    lib.TEXTURES.update(lib.prepare_textures())
    lib.TEXTURES['grating'] = {'col': grating_texture()}
    M = lib.material
    # Painted steel: weathered, chalky paint over sheet metal (detail maps tinted per material).
    M('gantryRed', (0.3, 0.05, 0.026), tex='paint', tile=2.2)
    M('steelWhite', (0.36, 0.36, 0.34), tex='plate', tile=2.0)
    M('steelGrey', (0.13, 0.135, 0.14), tex='plate', tile=2.0)
    M('cladding', (0.3, 0.3, 0.285), tex='plate', tile=1.6)
    M('tankWhite', (0.42, 0.42, 0.4), tex='plate', tile=3.0)
    M('galv', (0.22, 0.225, 0.22), tex='metal', tile=1.2)
    M('deflector', (0.07, 0.062, 0.055), tex='metal', tile=1.5)
    M('concrete', (0.25, 0.24, 0.22), tex='concrete', tile=3.0)
    M('trenchFloor', (0.12, 0.112, 0.105), tex='concrete', tile=3.0)
    M('grating', (0.42, 0.42, 0.4), tex='grating', tile=0.4, rough=0.6, alpha_clip=True)
    M('fence', (0.7, 0.71, 0.7), tex='fence', tile=0.5, rough=0.5, metal=0.6, alpha_clip='blend')
    M('railYellow', (0.5, 0.32, 0.02), rough=0.5)
    M('dark', (0.025, 0.027, 0.03), rough=0.55, metal=0.3)
    M('rubber', (0.015, 0.015, 0.016), rough=0.8)
    M('chrome', (0.55, 0.56, 0.58), rough=0.2, metal=1.0)
    M('glass', (0.05, 0.06, 0.07), rough=0.06, metal=0.6)
    M('lampLit', (1.0, 0.95, 0.85), emit=(1.0, 0.88, 0.66), strength=1.2)
    M('beacon', (1.0, 0.1, 0.05), emit=(1.0, 0.08, 0.03), strength=1.5)


# ---------------------------------------------------------------------------------------------
# Steelwork
# ---------------------------------------------------------------------------------------------

def rail(b, pts, mat='railYellow', h=1.05, post=1.8, node=None):
    """A hand rail along a polyline (points at deck level): posts, top rail and knee rail."""
    pts = [Vector(p) for p in pts]
    up = Vector((0, 0, h))
    for a, c in zip(pts, pts[1:]):
        b.bar(a + up, c + up, 0.05, mat, round_=True, segs=6, node=node)
        b.bar(a + up * 0.5, c + up * 0.5, 0.04, mat, round_=True, segs=5, node=node)
        n = max(1, round((c - a).length / post))
        for i in range(n + 1):
            q = a.lerp(c, i / n)
            b.bar(q, q + up, 0.05, mat, round_=True, segs=5, node=node)


def lattice(b, x0, y0, w, d, h, bay, mat, col=0.24, brace=0.09, z0=0.0, node=None, faces=(0, 1, 2, 3),
            column_mat=None):
    """A box truss: four corner columns, a ring of struts every `bay` metres and X bracing on the chosen faces
    (0: -y, 1: +x, 2: +y, 3: -x)."""
    c = [V(x0, y0, z0), V(x0 + w, y0, z0), V(x0 + w, y0 + d, z0), V(x0, y0 + d, z0)]
    for p in c:
        b.bar(p, p + V(0, 0, h), col, column_mat or mat, node=node, bevel=0.012)
    n = max(1, round(h / bay))
    step = h / n
    for k in range(n + 1):
        lift = V(0, 0, k * step)
        for i in range(4):
            a, e = c[i] + lift, c[(i + 1) % 4] + lift
            b.bar(a, e, brace * 1.25, mat, node=node)
            if k < n and i in faces:
                top = V(0, 0, step)
                b.bar(a, e + top, brace, mat, node=node)
                b.bar(e, a + top, brace, mat, node=node)


def platform(b, x0, y0, x1, y1, z, frame='galv', rails=(True, True, True, True), rail_mat='railYellow', node=None):
    """A grating deck with an edge frame and hand rails on the chosen sides (0: -y, 1: +x, 2: +y, 3: -x)."""
    b.box((x1 - x0, y1 - y0, 0.05), ((x0 + x1) / 2, (y0 + y1) / 2, z - 0.025), 'grating', bevel=0, node=node)
    c = [V(x0, y0, z), V(x1, y0, z), V(x1, y1, z), V(x0, y1, z)]
    for i in range(4):
        a, e = c[i], c[(i + 1) % 4]
        b.bar(a - V(0, 0, 0.09), e - V(0, 0, 0.09), 0.13, frame, node=node)
        if rails[i] and rail_mat:
            rail(b, [a, e], rail_mat, node=node)


def stair(b, a, c, side, w=0.8, mat='galv', rail_mat='railYellow', node=None):
    """A steel stair flight from a up to c: two stringers, grating treads and a hand rail on each side."""
    a, c, side = Vector(a), Vector(c), Vector(side).normalized()
    for s in (-1, 1):
        b.bar(a + side * s * w / 2, c + side * s * w / 2, 0.08, mat, node=node)
    n = max(2, int(abs(c.z - a.z) / 0.2))
    for i in range(1, n):
        q = a.lerp(c, i / n)
        b.bar(q - side * w / 2, q + side * w / 2, 0.22, 'grating', h=0.03, node=node)
    for s in (-1, 1):
        p0, p1 = a + side * s * w / 2, c + side * s * w / 2
        b.bar(p0 + V(0, 0, 0.95), p1 + V(0, 0, 0.95), 0.045, rail_mat, round_=True, segs=5, node=node)
        for q in (p0, p0.lerp(p1, 0.5), p1):
            b.bar(q, q + V(0, 0, 0.95), 0.045, rail_mat, round_=True, segs=5, node=node)


def catenary(b, p, q, sag, r=0.025, mat='galv', n=18, node=None):
    """A wire hanging between two points."""
    pts = [p.lerp(q, i / n) - V(0, 0, sag * 4 * (i / n) * (1 - i / n)) for i in range(n + 1)]
    for a, c in zip(pts, pts[1:]):
        b.bar(a, c, r * 2, mat, round_=True, segs=5, node=node)


def hbox(b, a, c, w, h, z, mat, node=None, bevel=0.0):
    """A horizontal box from a to c (x, y), w wide, h tall, its bottom at z."""
    a, c = Vector((a[0], a[1], 0)), Vector((c[0], c[1], 0))
    d = c - a
    return b.box((d.length, w, h), ((a.x + c.x) / 2, (a.y + c.y) / 2, z + h / 2), mat,
                 rot=(0, 0, math.atan2(d.y, d.x)), bevel=bevel, node=node)


def fence(b, pts, h=2.2, post=3.0, node=None):
    """A chain-link fence standing on the ground along a polyline of (x, y)."""
    pts = [V(p[0], p[1], 0.0) for p in pts]
    b.ribbon([tuple(p) for p in pts], h - 0.05, 'fence', node=node)
    for a, c in zip(pts, pts[1:]):
        b.bar(a + V(0, 0, h), c + V(0, 0, h), 0.05, 'galv', round_=True, segs=6, node=node)
        n = max(1, round((c - a).length / post))
        for i in range(n):
            b.cyl(0.04, h + 0.1, a.lerp(c, i / n), 'galv', segs=8, node=node)
    b.cyl(0.04, h + 0.1, pts[-1], 'galv', segs=8, node=node)


def pipe_run(b, pts, r, mat, z=0.8, node=None):
    """A pipe on low concrete sleepers, along a polyline of (x, y) at height z."""
    pts3 = [V(p[0], p[1], z) for p in pts]
    b.pipe(pts3, r, mat, node=node, segs=14)
    for a, c in zip(pts3, pts3[1:]):
        n = max(1, int((c - a).length / 6))
        for i in range(n + 1):
            q = a.lerp(c, i / n)
            b.box((0.5, 0.5, z - r), (q.x, q.y, (z - r) / 2), 'concrete', bevel=0.03, node=node)


# ---------------------------------------------------------------------------------------------
# Common: trench, tanks, pipes, floodlights
# ---------------------------------------------------------------------------------------------

TRENCH_X = 3.0   # half width of the opening in the ground
TRENCH_Y = 16.0  # half length; the floor ramps up to the ground at both ends
DEPTH = 4.0


def floor_z(y):
    t = min(1.0, max(0.0, (abs(y) - 5.0) / (TRENCH_Y - 5.0)))
    return -DEPTH + (DEPTH - 0.05) * t


def trench(b):
    """The flame trench: a concrete pit under the stand, its floor ramping up to the ground at both ends, a steel
    deflector splitting the exhaust north and south, water pipes along the walls, blast walls at the exits."""
    ys = sorted(set([y * 2.0 for y in range(-8, 9)] + [-5.0, 5.0]))
    xs = [-TRENCH_X, -1.5, 0.0, 1.5, TRENCH_X]
    bm = bmesh.new()
    grid = [[bm.verts.new((x, y, floor_z(y))) for x in xs] for y in ys]
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0:
            f.normal_flip()
    b.mesh(bm, 'trenchFloor', uv='box')
    # Walls: below the ground only their inner faces show; above it a parapet with a bevelled top.
    for s in (-1, 1):
        b.box((0.9, 2 * TRENCH_Y, DEPTH + 0.8), (s * (TRENCH_X + 0.45), 0, (0.6 - DEPTH - 0.2) / 2), 'concrete',
              bevel=0.04)
        # Deluge pipe along the wall, with spray nozzles.
        b.pipe([V(s * (TRENCH_X - 0.18), -12, -0.7), V(s * (TRENCH_X - 0.18), 12, -0.7)], 0.11, 'galv', segs=10)
        for y in range(-11, 12, 2):
            b.cyl(0.05, 0.25, (s * (TRENCH_X - 0.3), y, -0.82), 'galv', segs=6, rot=(0, s * 1.2, 0))
        # Blast walls splaying out at both exits.
        for e in (-1, 1):
            a = (s * (TRENCH_X + 0.45), e * TRENCH_Y)
            c = (s * (TRENCH_X + 3.4), e * (TRENCH_Y + 5.5))
            hbox(b, a, c, 0.6, 0.9, -0.2, 'concrete', bevel=0.04)
    # The deflector: a steel ridge across the trench, curving down to the floor both ways.
    pts = []
    for k in range(17):
        t = k / 16
        y = -4.8 + 9.6 * t
        u = abs(y) / 4.8
        pts.append((y, -DEPTH + 3.0 * (1 - u) ** 2 - 0.02))
    pts = [(4.8, -DEPTH - 0.1), (-4.8, -DEPTH - 0.1)] + pts
    b.prism(list(reversed(pts)), 2 * TRENCH_X - 0.04, (0, 0, 0), 'deflector', axis='x', smooth=30)
    # Rib plates on the deflector's back and a cooling-water manifold along its ridge.
    for x in (-2.0, 0.0, 2.0):
        b.box((0.06, 9.0, 0.5), (x, 0, -DEPTH + 0.15), 'deflector', bevel=0)
    b.pipe([V(-TRENCH_X + 0.1, 0, -0.95), V(TRENCH_X - 0.1, 0, -0.95)], 0.09, 'galv', segs=8)


def lox_sphere(b, cx, cy):
    """The liquid-oxygen storage sphere on eight legs, with sway rods, a ladder to a top platform, and its vaporizer."""
    R, zc = 5.0, 9.0
    b.sphere(R, (cx, cy, zc), 'tankWhite', segs=48, rings=24)
    b.torus(R + 0.03, 0.09, (cx, cy, zc), 'steelWhite', segs=64, ring_segs=6)
    legs = []
    for i in range(8):
        a = i / 8 * TAU
        p = V(cx + math.cos(a) * R, cy + math.sin(a) * R, 0)
        legs.append(p)
        b.cyl(0.55, 0.45, p, 'concrete', segs=12, bevel=0.05)
        b.bar(p, p + V(0, 0, zc), 0.36, 'steelWhite', round_=True, segs=12)
    for i in range(8):
        p, q = legs[i], legs[(i + 1) % 8]
        b.bar(p + V(0, 0, 1.6), q + V(0, 0, 6.8), 0.06, 'galv', round_=True, segs=4)
        b.bar(q + V(0, 0, 1.6), p + V(0, 0, 6.8), 0.06, 'galv', round_=True, segs=4)
        b.bar(p + V(0, 0, 1.6), q + V(0, 0, 1.6), 0.16, 'steelWhite')
    # Top platform and vent.
    top = zc + R - 0.12
    b.cyl(1.5, 0.08, (cx, cy, top), 'grating', segs=24)
    ring = [V(cx + math.cos(a) * 1.5, cy + math.sin(a) * 1.5, top + 0.08) for a in np.linspace(0, TAU, 13)]
    rail(b, ring, 'steelWhite', post=1.0)
    b.pipe([V(cx + 0.6, cy, top), V(cx + 0.6, cy, top + 2.2), V(cx + 1.2, cy, top + 2.6)], 0.09, 'galv', segs=8)
    # Ladder: straight up the outside to the equator, then over the shoulder to the top.
    lx = cx - R - 0.5
    P.ladder(b, lx, cy, 0.0, zc, face='-x', w=0.5, mat='galv', cage=True)
    prev = V(lx, cy, zc)
    for a in np.linspace(0.12, 1.3, 6):
        q = V(cx - math.cos(a) * (R + 0.45), cy, zc + math.sin(a) * (R + 0.45))
        P.ladder_line(b, prev, q, (0, 1, 0), w=0.5, mat='galv')
        prev = q
    # Outlet line down to the ground.
    b.pipe([V(cx, cy, zc - R), V(cx, cy, 0.8), V(cx - 6.5, cy, 0.8)], 0.2, 'steelWhite', segs=14)
    # Vaporizer: a frame of finned tubes beside the sphere.
    vx, vy = cx + 9.0, cy + 6.0
    b.box((3.4, 1.6, 0.3), (vx, vy, 0.15), 'concrete', bevel=0.03)
    for i in range(6):
        for j in range(2):
            b.cyl(0.14, 4.2, (vx - 1.4 + i * 0.56, vy - 0.35 + j * 0.7, 0.3), 'galv', segs=8)
    b.box((3.4, 1.6, 0.15), (vx, vy, 4.55), 'galv', bevel=0.02)


def fuel_tank(b, cx, cy):
    """A horizontal kerosene tank on concrete saddles, with bands, a manway and a ladder."""
    L, R, zc = 18.0, 2.6, 3.4
    prof = [(0.0, -L / 2 - 0.9)]
    for t in np.linspace(0.25, math.pi / 2, 6):
        prof.append((R * math.sin(t), -L / 2 - 0.9 * math.cos(t)))
    prof += [(R, L / 2)]
    for t in np.linspace(math.pi / 2, 0.25, 6):
        prof.append((R * math.sin(t), L / 2 + 0.9 * math.cos(t)))
    prof.append((0.0, L / 2 + 0.9))
    b.lathe(prof, (cx, cy, zc), 'tankWhite', segs=48, rot=(0, math.pi / 2, 0))
    for x in (-6.0, 0.0, 6.0):
        b.box((1.0, 3.8, zc - R + 0.7), (cx + x, cy, (zc - R + 0.7) / 2), 'concrete', bevel=0.05)
        b.torus(R + 0.03, 0.06, (cx + x + 0.8, cy, zc), 'steelWhite', rot=(0, math.pi / 2, 0), segs=48, ring_segs=5)
    b.cyl(0.45, 0.35, (cx + 4.0, cy, zc + R - 0.05), 'steelWhite', segs=16, bevel=0.03)
    b.cyl(0.08, 1.2, (cx - 5.0, cy, zc + R - 0.05), 'galv', segs=8)
    P.ladder(b, cx - L / 2 - 1.3, cy, 0.0, zc + R, face='-x', w=0.45, mat='galv')


def tank_farm(b):
    # Liquid oxygen north-east of the pad (game x 58, z -38), kerosene to the south-east (x 52, z 26 and 33).
    lox_sphere(b, 58.0, 38.0)
    fence(b, [(46, 26), (72, 26), (72, 50), (46, 50), (46, 26)])
    for y in (-26.0, -33.0):
        fuel_tank(b, 52.0, y)
    # Catwalk between the two fuel tanks, and the containment berm round them.
    b.box((0.9, 4.4, 0.05), (55.0, -29.5, 6.05), 'grating', bevel=0)
    rail(b, [V(54.55, -27.3, 6.05), V(54.55, -31.7, 6.05)])
    rail(b, [V(55.45, -27.3, 6.05), V(55.45, -31.7, 6.05)])
    for a, c in (((38, -21), (66, -21)), ((66, -21), (66, -38)), ((66, -38), (38, -38)), ((38, -38), (38, -21))):
        hbox(b, a, c, 0.4, 0.9, 0.0, 'concrete', bevel=0.04)
    # Propellant lines to the launch stand.
    pipe_run(b, [(51.5, 38.0), (14.0, 38.0), (14.0, 6.0), (4.6, 6.0)], 0.24, 'tankWhite')
    pipe_run(b, [(42.6, -29.5), (16.0, -29.5), (16.0, -6.0), (4.6, -6.0)], 0.15, 'steelGrey', z=0.7)
    pipe_run(b, [(42.6, -28.6), (16.9, -28.6), (16.9, -5.1), (4.6, -5.1)], 0.09, 'galv', z=0.7)


def floodlight(b, x, y, h=20.0):
    """A floodlight tower: a slim lattice with a railed top and a bank of lamps aimed at the pad."""
    w = 1.3
    b.box((2.0, 2.0, 0.4), (x, y, 0.2), 'concrete', bevel=0.04)
    lattice(b, x - w / 2, y - w / 2, w, w, h - 0.4, 2.4, 'galv', col=0.14, brace=0.055, z0=0.4)
    P.ladder(b, x, y - w / 2 - 0.25, 0.4, h, face='-y', w=0.45, mat='galv', cage=True)
    platform(b, x - 1.4, y - 1.4, x + 1.4, y + 1.4, h, rail_mat='galv')
    ang = math.atan2(-y, -x)
    d = V(math.cos(ang), math.sin(ang), 0)
    side = V(-d.y, d.x, 0)
    base = V(x, y, h) + d * 1.2
    b.box((0.12, 3.2, 2.0), base + V(0, 0, 1.4), 'dark', rot=(0, 0, ang), bevel=0)
    for i in (-1, 0, 1):
        for j in (0, 1):
            c = base + side * (i * 1.0) + V(0, 0, 0.9 + j * 0.95) + d * 0.3
            b.box((0.5, 0.85, 0.75), c, 'dark', rot=(0, 0.25, ang), bevel=0.04)
            b.box((0.04, 0.7, 0.6), c + d * 0.25 - V(0, 0, 0.06), 'lampLit', rot=(0, 0.25, ang), bevel=0)


def common(b):
    trench(b)
    tank_farm(b)
    for x, y in ((-4, 32), (26, 26), (26, -26), (-38, 8)):
        floodlight(b, x, y)


# ---------------------------------------------------------------------------------------------
# Classic pad (Juno I, Thor-Able, Thor-Delta, Delta D)
# ---------------------------------------------------------------------------------------------

def launch_stand(b):
    """A steel launch stand straddling the trench on four concrete pedestals: two deep plate girders across the
    trench, cross girders, and grating walkways over the parapets. The hold-down ring is code-built per rocket."""
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box((1.2, 1.7, 0.6), (sx * (TRENCH_X + 0.45), sy * 2.6, 0.9), 'concrete', bevel=0.05)
            b.box((0.9, 1.3, 0.06), (sx * (TRENCH_X + 0.45), sy * 2.6, 1.23), 'steelGrey', bevel=0.01)
    for sy in (-1, 1):
        P.i_beam(b, (-4.3, sy * 2.6, 1.48), (4.3, sy * 2.6, 1.48), h=0.62, w=0.42, mat='steelGrey')
        for x in np.linspace(-3.9, 3.9, 9):
            b.box((0.025, 0.36, 0.55), (x, sy * 2.6, 1.48), 'steelGrey', bevel=0)
    for sx in (-1, 1):
        P.i_beam(b, (sx * 2.1, -2.4, 1.55), (sx * 2.1, 2.4, 1.55), h=0.5, w=0.32, mat='steelGrey')
        # Walkways over the parapets, railed on the outside.
        x0, x1 = sorted((sx * 2.35, sx * 4.4))
        b.box((x1 - x0, 6.6, 0.05), ((x0 + x1) / 2, 0, 1.82), 'grating', bevel=0)
        xo = sx * 4.4
        rail(b, [V(xo, -3.3, 1.82), V(xo, 3.3, 1.82)])
    # Ends of the stand: diagonal knee braces down to the pedestals.
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.bar(V(sx * 3.45, sy * 2.6, 1.26), V(sx * 1.6, sy * 2.6, 1.2), 0.14, 'steelGrey')
    # Service boxes and cable bundles hanging off the stand towards the umbilical mast.
    b.box((0.8, 0.6, 0.9), (-4.0, 1.6, 2.3), 'steelGrey', bevel=0.03)
    b.pipe([V(-4.0, 1.6, 1.85), V(-4.6, 1.4, 1.2), V(-6.2, 1.1, 0.6)], 0.08, 'rubber', segs=8)
    b.pipe([V(-3.6, -1.2, 1.85), V(-4.8, -1.0, 1.0), V(-6.4, -0.9, 0.6)], 0.06, 'rubber', segs=8)


MAST_X, MAST_W, MAST_H = -9.2, 2.6, 29.0


def umbilical_mast(b):
    """The umbilical mast beside the rocket: a red lattice with railed platforms, a caged ladder, and three swing
    arms reaching to the rocket with their umbilical hoses."""
    x0, y0, w, h = MAST_X, -MAST_W / 2, MAST_W, MAST_H
    b.box((3.8, 3.8, 0.5), (x0 + w / 2, 0, 0.25), 'concrete', bevel=0.06)
    lattice(b, x0, y0, w, w, h - 0.5, 2.6, 'gantryRed', col=0.24, brace=0.085, z0=0.5)
    P.ladder(b, x0 - 0.3, 0.0, 0.5, h, face='-x', w=0.5, mat='galv', cage=True)
    for k in range(1, 6):
        z = 0.5 + 5.2 * k
        platform(b, x0 - 0.75, y0 - 0.75, x0 + w + 0.75, y0 + w + 0.75, z, rails=(True, False, True, True))
    platform(b, x0 - 0.3, y0 - 0.3, x0 + w + 0.3, y0 + w + 0.3, h, rails=(True, True, True, True))
    b.bar(V(x0 + w / 2, 0, h), V(x0 + w / 2, 0, h + 4.0), 0.09, 'galv', round_=True, segs=8)
    b.cyl(0.12, 0.25, (x0 + w / 2, 0.0, h + 4.0), 'beacon', segs=10)
    # Swing arms: a light truss each, hinged on the mast, a grating walkway on top.
    x1, x2 = x0 + w, -2.0
    for z in (10.5, 17.3, 24.1):
        for dy in (-0.45, 0.45):
            b.bar(V(x1, dy, z), V(x2, dy, z), 0.12, 'gantryRed')
            b.bar(V(x1, dy, z - 1.0), V(x2 + 0.8, dy, z - 0.3), 0.1, 'gantryRed')
        n = 6
        for i in range(n):
            xa = x1 + (x2 + 0.8 - x1) * i / n
            xb = x1 + (x2 + 0.8 - x1) * (i + 1) / n
            za = z - 1.0 + 0.7 * i / n
            zb = z - 1.0 + 0.7 * (i + 1) / n
            for dy in (-0.45, 0.45):
                b.bar(V(xa, dy, za if i % 2 == 0 else z), V(xb, dy, z if i % 2 == 0 else zb), 0.06, 'gantryRed')
            b.bar(V(xa, -0.45, z), V(xa, 0.45, z), 0.06, 'gantryRed')
        b.box((x2 - x1, 0.85, 0.04), ((x1 + x2) / 2, 0, z + 0.08), 'grating', bevel=0)
        b.bar(V(x1 + 0.12, 0, z - 1.5), V(x1 + 0.12, 0, z + 0.4), 0.2, 'steelGrey', round_=True, segs=10)
        # Umbilical hoses: from the mast, along the arm, sagging down off its tip.
        b.pipe([V(x1, 0.2, z - 0.5), V(x2 + 1.4, 0.25, z - 0.35), V(x2 + 0.35, 0.25, z - 0.9),
                V(x2 + 0.1, 0.25, z - 1.9)], 0.07, 'rubber', segs=8)
        b.box((0.3, 0.45, 0.35), (x2 + 0.1, 0.25, z - 2.05), 'steelGrey', bevel=0.02)
    # Cable bundle down the mast into the cable tray.
    b.pipe([V(x1 + 0.15, -0.9, h - 2), V(x1 + 0.15, -0.9, 1.0), V(x1 + 0.6, -2.4, 0.95)], 0.1, 'rubber', segs=8)


GANTRY_DIR = (-0.6, 0.8)  # from the pad toward the parked gantry, Blender (x, y): game (-0.6, -0.8), north-west
GANTRY_AT = 74.0          # metres from the pad to the gantry's centre


def gantry(b, node):
    """The mobile service structure, rolled back for the launch: a red steel tower on four bogies, open on the side
    that faced the rocket, with platforms round the slot, clad upper levels, stairs and a hammerhead crane.
    Built in its own frame: rails along local y, the pad toward local -y."""
    W, D, H, Z0 = 12.0, 10.0, 40.0, 1.8
    xs, ys = (-6.0, 6.0), (-5.0, 5.0)
    cols = [(-6, -5), (6, -5), (6, 5), (-6, 5), (0, 5), (-6, 0), (6, 0)]
    for x, y in cols:
        P.i_beam(b, (x, y, Z0), (x, y, H), h=0.55, w=0.45, mat='gantryRed', node=node)
    levels = [Z0 + 0.3] + [6.5 + 5.0 * k for k in range(7)] + [H]
    for i, z in enumerate(levels):
        # Ring beams round the frame.
        for a, c in (((-6, -5), (6, -5)), ((6, -5), (6, 5)), ((6, 5), (-6, 5)), ((-6, 5), (-6, -5))):
            b.bar(V(*a, z), V(*c, z), 0.32, 'gantryRed', node=node)
        if i == len(levels) - 1:
            continue
        top = levels[i + 1]
        # X bracing on the back and both sides; the side that faced the rocket stays open.
        for (ax, ay), (cx, cy) in (((-6, 5), (0, 5)), ((0, 5), (6, 5)), ((-6, -5), (-6, 0)), ((-6, 0), (-6, 5)),
                                   ((6, -5), (6, 0)), ((6, 0), (6, 5))):
            b.bar(V(ax, ay, z), V(cx, cy, top), 0.16, 'gantryRed', node=node)
            b.bar(V(cx, cy, z), V(ax, ay, top), 0.16, 'gantryRed', node=node)
        if i == 0:
            continue
        # Work platforms round the slot the rocket stood in (x -2.2..2.2, y -5..1.5).
        platform(b, -6.6, -5.6, -2.2, 5.0, z, rails=(True, True, False, True), node=node)
        platform(b, 2.2, -5.6, 6.6, 5.0, z, rails=(True, True, False, True), node=node)
        platform(b, -2.2, 1.5, 2.2, 5.0, z, rails=(True, False, False, False), node=node)
    # Clad upper levels: the weather enclosure round the top of the rocket.
    for z0, z1 in ((26.5, 31.2), (31.5, 36.2), (36.5, 39.6)):
        hz = z1 - z0
        b.box((W + 0.2, 0.06, hz), (0, 5.25, (z0 + z1) / 2), 'cladding', bevel=0, node=node)
        for sx in (-1, 1):
            b.box((0.06, D + 0.2, hz), (sx * 6.25, 0, (z0 + z1) / 2), 'cladding', bevel=0, node=node)
            # Folded-back doors on the open side.
            b.box((3.6, 0.06, hz), (sx * 4.1, -5.9, (z0 + z1) / 2), 'cladding', rot=(0, 0, sx * 0.5), bevel=0,
                  node=node)
    # Roof deck and the hammerhead crane reaching out over the slot.
    b.box((W + 1.0, D + 1.0, 0.25), (0, 0, H + 0.12), 'steelGrey', bevel=0.03, node=node)
    zc = H + 3.2
    b.box((2.2, 2.2, 2.9), (0, 3.0, H + 1.7), 'gantryRed', bevel=0.04, node=node)
    for dx in (-0.5, 0.5):
        for dz in (0.0, 1.1):
            b.bar(V(dx, 7.0, zc + dz), V(dx, -13.0, zc + dz), 0.14, 'gantryRed', node=node)
    for i in range(20):
        y0, y1 = 7.0 - i, 6.0 - i
        for dx in (-0.5, 0.5):
            b.bar(V(dx, y0, zc), V(dx, y1, zc + 1.1), 0.06, 'gantryRed', node=node)
        b.bar(V(-0.5, y1, zc + 1.1), V(0.5, y1, zc + 1.1), 0.06, 'gantryRed', node=node)
    b.box((1.8, 1.4, 1.6), (0, 6.8, zc + 0.2), 'concrete', bevel=0.04, node=node)
    b.box((1.4, 1.6, 1.4), (0, 3.6, zc - 0.6), 'steelWhite', bevel=0.05, node=node)
    b.box((0.8, 1.0, 0.5), (0, -9.0, zc - 0.4), 'dark', bevel=0.02, node=node)
    b.bar(V(0, -9.0, zc - 0.6), V(0, -9.0, 26.0), 0.04, 'dark', round_=True, segs=4, node=node)
    b.box((0.6, 0.6, 0.8), (0, -9.0, 25.6), 'railYellow', bevel=0.05, node=node)
    # Stair flights up the back face, zig-zagging between landings.
    for i, z in enumerate(levels[:-1]):
        z1 = levels[i + 1]
        mid = (z + z1) / 2
        xa, xb = (-5.2, -1.2) if i % 2 == 0 else (-1.2, -5.2)
        stair(b, V(xa, 6.0, z), V(xb, 6.0, mid), (0, 1, 0), node=node)
        stair(b, V(xb, 6.9, mid), V(xa, 6.9, z1), (0, 1, 0), node=node)
        for x in (xb,):
            b.box((1.2, 2.0, 0.05), (x + (0.6 if x < -3 else -0.6) * -1, 6.45, mid), 'grating', bevel=0, node=node)
    # Elevator shaft beside the back corner, with its car part way up.
    lattice(b, 6.5, 2.6, 2.0, 2.0, H + 2.0 - Z0, 2.5, 'gantryRed', col=0.16, brace=0.06, z0=Z0, node=node)
    b.box((1.6, 1.6, 2.4), (7.5, 3.6, 15.0), 'cladding', bevel=0.03, node=node)
    # Base frame, bogies and wheels on the two rails.
    for x in xs:
        b.box((0.9, D + 1.6, 1.0), (x, 0, Z0 - 0.4), 'gantryRed', bevel=0.04, node=node)
        for y in ys:
            b.box((1.3, 3.0, 0.9), (x * 0.92, y, 0.75), 'steelGrey', bevel=0.05, node=node)
            for dy in (-0.9, 0.9):
                b.cyl(0.42, 0.22, (x * 0.92 - 0.11, y + dy, 0.45), 'dark', segs=20, rot=(0, math.pi / 2, 0),
                      node=node)
    # Rails back toward the pad, ending at the edge of the hardstand.
    for x in (-5.52, 5.52):
        b.box((0.9, 59.0, 0.12), (x, -20.5, 0.06), 'concrete', bevel=0.02, node=node)
        b.box((0.12, 59.0, 0.16), (x, -20.5, 0.2), 'steelGrey', bevel=0.01, node=node)
    for y in np.arange(9.0, -50.0, -2.5):
        b.box((12.4, 0.35, 0.05), (0, y, 0.03), 'concrete', bevel=0, node=node)


def lightning_mast(b, x, y, h):
    """A tall tapered steel mast on a concrete base, a spike on top. Returns where its wire hangs from."""
    b.box((2.2, 2.2, 0.7), (x, y, 0.35), 'concrete', bevel=0.06)
    b.cyl(0.75, 0.08, (x, y, 0.7), 'galv', segs=16)
    b.lathe([(0.55, 0.7), (0.48, 1.2), (0.2, h), (0.07, h + 0.2), (0.05, h + 3.4), (0.0, h + 3.6)], (x, y, 0), 'galv',
            segs=20)
    for z in np.arange(8.0, h, 8.0):
        r = 0.48 + (0.2 - 0.48) * (z - 1.2) / (h - 1.2)
        b.torus(r + 0.015, 0.05, (x, y, z), 'galv', segs=20, ring_segs=4)
    b.box((1.2, 0.15, 0.15), (x, y, h - 0.6), 'galv', bevel=0)
    return V(x, y, h - 0.7)


def blockhouse(b, cx, cy):
    """The domed concrete blockhouse the launch was run from, its entrance turned away from the pad."""
    b.box((38, 30, 0.2), (cx - 2, cy, 0.1), 'concrete', bevel=0.04)
    prof = [(13.0, 0.2), (12.8, 0.9)]
    for a in np.linspace(0.04, math.pi / 2, 16):
        prof.append((12.3 * math.cos(a) + 0.01, 0.9 + 7.2 * math.sin(a)))
    prof.append((0.0, 8.1))
    b.lathe(prof, (cx, cy, 0), 'concrete', segs=72, smooth=60)
    b.box((7.0, 6.0, 3.8), (cx - 14.0, cy, 2.1), 'concrete', bevel=0.08)
    b.box((0.2, 2.8, 2.7), (cx - 17.55, cy, 1.55), 'steelGrey', bevel=0.02)
    b.box((0.1, 3.2, 0.3), (cx - 17.6, cy, 3.05), 'dark', bevel=0)
    # Periscope heads on the side facing the pad, an antenna mast, an air-conditioning unit.
    toward = math.atan2(-cy, -cx)
    for da in (-0.25, 0.25):
        a = toward + da
        px, py = cx + math.cos(a) * 7.5, cy + math.sin(a) * 7.5
        b.cyl(0.35, 1.6, (px, py, 6.0), 'steelGrey', segs=12)
        b.box((0.9, 0.6, 0.6), (px + math.cos(a) * 0.2, py + math.sin(a) * 0.2, 7.8), 'steelGrey',
              rot=(0, 0, a), bevel=0.05)
        b.box((0.04, 0.4, 0.3), (px + math.cos(a) * 0.66, py + math.sin(a) * 0.66, 7.8), 'glass', rot=(0, 0, a),
              bevel=0)
    b.bar(V(cx - 3, cy + 2, 7.4), V(cx - 3, cy + 2, 15.0), 0.12, 'galv', round_=True, segs=8)
    for z in (11.0, 13.0, 14.6):
        b.bar(V(cx - 4.2, cy + 2, z), V(cx - 1.8, cy + 2, z), 0.05, 'galv', round_=True, segs=5)
    b.box((2.4, 1.6, 1.6), (cx - 13.0, cy + 5.0, 1.0), 'steelWhite', bevel=0.06)


def cable_tray(b, pts, z=0.9, w=0.6):
    """A steel cable tray on posts, full of cable."""
    for a, c in zip(pts, pts[1:]):
        hbox(b, a, c, w, 0.03, z, 'galv')
        av, cv = V(a[0], a[1]), V(c[0], c[1])
        d = (cv - av).normalized()
        side = V(-d.y, d.x, 0)
        for s in (-1, 1):
            o = side * s * w / 2
            hbox(b, (a[0] + o.x, a[1] + o.y), (c[0] + o.x, c[1] + o.y), 0.03, 0.16, z, 'galv')
        hbox(b, a, c, w - 0.1, 0.07, z + 0.03, 'rubber')
        n = max(1, int((cv - av).length / 3.5))
        for i in range(n + 1):
            q = av.lerp(cv, i / n)
            b.box((0.08, 0.08, z), (q.x, q.y, z / 2), 'galv', bevel=0)
            b.box((0.06, w + 0.2, 0.06), (q.x, q.y, z - 0.03), 'galv', rot=(0, 0, math.atan2(d.y, d.x)), bevel=0)


def classic(b):
    launch_stand(b)
    umbilical_mast(b)
    node = lib.Node('gantry', parent=b.root, loc=(GANTRY_DIR[0] * GANTRY_AT, GANTRY_DIR[1] * GANTRY_AT, 0),
                    rot=(0, 0, math.atan2(-GANTRY_DIR[0], GANTRY_DIR[1])))
    gantry(b, node)
    tips = [lightning_mast(b, x, y, 46.0) for x, y in ((-36, 30), (36, 30), (30, -36))]
    for p, q in zip(tips, tips[1:] + tips[:1]):
        catenary(b, p, q, sag=3.5)
    blockhouse(b, -166.0, -46.0)
    cable_tray(b, [(-7.9, -2.4), (-12.0, -6.0), (-150.0, -6.0), (-150.0, -38.0), (-153.0, -42.0)])


# ---------------------------------------------------------------------------------------------
# Modern pad (Falcon 9)
# ---------------------------------------------------------------------------------------------

def launch_mount(b):
    """A heavy steel launch table on four piers over the trench, with an opening for the engines."""
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box((1.3, 2.0, 0.6), (sx * (TRENCH_X + 0.45), sy * 2.7, 0.9), 'concrete', bevel=0.05)
    for sy in (-1, 1):
        b.box((8.6, 1.9, 0.6), (0, sy * 2.55, 1.5), 'steelGrey', bevel=0.04)
    for sx in (-1, 1):
        b.box((2.6, 3.2, 0.6), (sx * 2.9, 0, 1.5), 'steelGrey', bevel=0.04)
    # Blast plates and stiffeners round the opening, piping on the deck.
    for sx in (-1, 1):
        b.box((0.08, 3.2, 0.5), (sx * 1.62, 0, 1.45), 'deflector', bevel=0)
    for sy in (-1, 1):
        b.box((3.2, 0.08, 0.5), (0, sy * 1.62, 1.45), 'deflector', bevel=0)
    b.pipe([V(4.4, -2.0, 1.95), V(1.9, -2.0, 1.95), V(1.9, -1.0, 1.95)], 0.09, 'galv', segs=8)
    b.pipe([V(4.4, 2.1, 1.95), V(2.0, 2.1, 1.95), V(1.7, 1.3, 1.95)], 0.07, 'galv', segs=8)
    for sx in (-1, 1):
        rail(b, [V(sx * 4.3, -3.4, 1.8), V(sx * 4.3, 3.4, 1.8)])


def strongback(b):
    """The transporter-erector standing behind Falcon 9 (east of it, so the watching cameras see the rocket in
    front): a white truss with clamp arms, raised by two hydraulic pistons, its carriage on rails running east."""
    x0, x1 = 1.6, 3.8
    z0, z1 = 1.9, 28.0
    lattice(b, x0, -1.1, x1 - x0, 2.2, z1 - z0, 2.2, 'steelWhite', col=0.26, brace=0.09, z0=z0)
    b.box((x1 - x0 + 0.4, 2.6, 0.4), ((x0 + x1) / 2, 0, z1 + 0.2), 'steelWhite', bevel=0.04)
    for z in (8.0, 15.0, 21.5, 26.2):
        for dy in (-0.55, 0.55):
            b.bar(V(x0, dy, z), V(1.02, dy * 0.6, z), 0.16, 'steelWhite')
        b.box((0.22, 0.95, 0.55), (0.92, 0, z), 'dark', bevel=0.03)
    b.box((2.4, 3.0, 1.1), (2.7, 0, 1.25), 'steelGrey', bevel=0.05)
    for sy in (-1.5, 1.5):
        b.bar(V(13.5, sy, 0.7), V(6.0, sy, 7.6), 0.55, 'steelGrey', round_=True, segs=16)
        b.bar(V(6.0, sy, 7.6), V(3.7, sy, 9.8), 0.24, 'chrome', round_=True, segs=12)
        b.box((1.4, 1.2, 0.9), (13.8, sy, 0.45), 'concrete', bevel=0.05)
    for y in (0.65, -0.65):
        b.pipe([V(x0 - 0.12, y, 2.2), V(x0 - 0.12, y, 25.0)], 0.06, 'rubber', segs=8, joints=False)
    # Carriage, and the rails east toward the hangar.
    for sy in (-1.7, 1.7):
        b.box((14.0, 0.6, 0.9), (11.0, sy, 0.75), 'steelWhite', bevel=0.04)
        for x in (5.0, 9.0, 13.0, 17.0):
            b.cyl(0.38, 0.25, (x, sy, 0.4), 'dark', segs=16, rot=(math.pi / 2, 0, 0))
        b.box((96.0, 0.8, 0.12), (52.0, sy, 0.06), 'concrete', bevel=0.02)
        b.box((96.0, 0.12, 0.16), (52.0, sy, 0.2), 'steelGrey', bevel=0.01)


def crew_tower(b):
    """The fixed tower south-east of the rocket: a square steel truss with stair landings, an elevator shaft and an
    access arm pointing at the rocket."""
    x0, y0, w, h = 6.0, -14.0, 6.0, 36.0
    cx, cy = x0 + w / 2, y0 + w / 2
    b.box((7.6, 7.6, 0.6), (cx, cy, 0.3), 'concrete', bevel=0.06)
    lattice(b, x0, y0, w, w, h - 0.6, 3.0, 'steelGrey', col=0.32, brace=0.11, z0=0.6)
    for k in range(1, 9):
        z = 0.6 + 4.0 * k
        platform(b, x0, y0, x0 + w, y0 + w, z, rails=(True, True, True, False))
        stair(b, V(x0 + 1.0, y0 + 0.6, z - 4.0), V(x0 + 1.0, y0 + 4.0, z - 2.0), (1, 0, 0))
        stair(b, V(x0 + 1.9, y0 + 4.0, z - 2.0), V(x0 + 1.9, y0 + 0.6, z), (1, 0, 0))
    b.box((2.2, 2.2, h + 2.0), (x0 + w - 1.2, y0 + 1.2, (h + 2.0) / 2 + 0.6), 'cladding', bevel=0.04)
    b.box((7.0, 7.0, 0.3), (cx, cy, h + 0.15), 'steelGrey', bevel=0.04)
    b.bar(V(x0 + 1, y0 + w - 1, h + 0.3), V(x0 + 1, y0 + w - 1, h + 6.0), 0.12, 'galv', round_=True, segs=8)
    b.cyl(0.12, 0.25, (x0 + 1, y0 + w - 1, h + 6.0), 'beacon', segs=10)
    # Access arm from the tower's corner, swung toward the rocket but stopped short of it.
    za = 27.0
    hbox(b, (x0 + 0.3, y0 + w - 0.3), (3.2, -3.0), 1.8, 2.5, za, 'steelWhite', bevel=0.05)
    hbox(b, (3.9, -3.7), (2.3, -2.1), 2.6, 2.9, za - 0.1, 'steelWhite', bevel=0.06)
    b.bar(V(x0, y0 + w, za - 3.5), V(4.6, -4.4, za), 0.2, 'steelGrey')


def tower(b, x, y, h):
    """A lightning tower: a slim galvanised lattice with a mast and spike on top. Returns where its wire hangs from."""
    w = 1.6
    b.box((3.0, 3.0, 0.6), (x, y, 0.3), 'concrete', bevel=0.05)
    lattice(b, x - w / 2, y - w / 2, w, w, h - 0.6, 2.6, 'galv', col=0.16, brace=0.06, z0=0.6)
    b.lathe([(0.25, h), (0.12, h + 6.0), (0.04, h + 9.0), (0.0, h + 9.2)], (x, y, 0), 'galv', segs=12)
    return V(x, y, h + 5.0)


def water_tower(b, cx, cy):
    """The elevated tank that feeds the deluge water at liftoff."""
    h, R = 30.0, 6.0
    legs = []
    for i in range(6):
        a = i / 6 * TAU + 0.3
        p = V(cx + math.cos(a) * 7.0, cy + math.sin(a) * 7.0, 0.0)
        q = V(cx + math.cos(a) * 5.2, cy + math.sin(a) * 5.2, h)
        legs.append((p, q))
        b.cyl(0.8, 0.5, p, 'concrete', segs=12, bevel=0.05)
        b.bar(p, q, 0.5, 'steelWhite', round_=True, segs=12)
    for z in (10.0, 20.0):
        t = z / h
        ring = [p.lerp(q, t) for p, q in legs]
        for i in range(6):
            b.bar(ring[i], ring[(i + 1) % 6], 0.22, 'steelWhite', round_=True, segs=8)
    for i in range(6):
        for z0, z1 in ((0.6, 10.0), (10.0, 20.0), (20.0, h)):
            a0, a1 = legs[i][0].lerp(legs[i][1], z0 / h), legs[i][0].lerp(legs[i][1], z1 / h)
            c0 = legs[(i + 1) % 6][0].lerp(legs[(i + 1) % 6][1], z0 / h)
            c1 = legs[(i + 1) % 6][0].lerp(legs[(i + 1) % 6][1], z1 / h)
            b.bar(a0, c1, 0.05, 'galv', round_=True, segs=4)
            b.bar(c0, a1, 0.05, 'galv', round_=True, segs=4)
    b.cyl(0.7, h, (cx, cy, 0), 'steelWhite', segs=16)
    prof = [(0.0, h - 2.2)]
    for a in np.linspace(-math.pi / 2, 0, 7):
        prof.append((R * math.cos(a), h + 1.4 + 3.6 * math.sin(a)))
    prof += [(R, h + 8.5), (R * 0.2, h + 10.6), (0.0, h + 10.8)]
    b.lathe(prof, (cx, cy, 0), 'tankWhite', segs=48, smooth=40)
    b.torus(R + 0.9, 0.05, (cx, cy, h + 2.4), 'galv', segs=48, ring_segs=4)
    ring = [V(cx + math.cos(a) * (R + 0.9), cy + math.sin(a) * (R + 0.9), h + 1.4) for a in np.linspace(0, TAU, 25)]
    b.lathe([(R - 0.05, h + 1.35), (R + 0.95, h + 1.35), (R + 0.95, h + 1.42), (R - 0.05, h + 1.42)], (cx, cy, 0),
            'grating', segs=48)
    rail(b, ring, 'galv', post=2.0)
    P.ladder(b, cx - 7.2, cy, 0.0, h + 1.4, face='-x', w=0.5, mat='galv', cage=True)
    pipe_run(b, [(cx - 7.5, cy), (cx - 7.5, 4.6), (4.6, 4.6)], 0.3, 'steelWhite')


def modern(b):
    launch_mount(b)
    strongback(b)
    crew_tower(b)
    tips = [tower(b, x, y, 44.0) for x, y in ((-34, 34), (34, 34), (34, -34), (-34, -34))]
    for p, q in zip(tips, tips[1:] + tips[:1]):
        catenary(b, p, q, sag=4.0)
    water_tower(b, 60.0, 15.0)


# ---------------------------------------------------------------------------------------------
# Baking and export
# ---------------------------------------------------------------------------------------------

def bake_ground():
    """The plane the AO bake shades against: the ground, with the trench left open."""
    gm = bpy.data.meshes.new('bakeGround')
    s, x, y = 300.0, TRENCH_X, TRENCH_Y
    vs = [(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0), (-x, -y, 0), (x, -y, 0), (x, y, 0), (-x, y, 0)]
    fs = [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    gm.from_pydata(vs, [], fs)
    ground = bpy.data.objects.new('bakeGround', gm)
    bpy.context.scene.collection.objects.link(ground)


def scorch(root):
    """Soot and scorch round the flame: darken the vertex colours near the nozzle and down the trench."""
    for o in [root, *root.children_recursive]:
        if o.type != 'MESH' or 'Col' not in o.data.color_attributes:
            continue
        me = o.data
        mw = o.matrix_world
        n = len(me.loops)
        vi = np.empty(n, dtype=np.int64)
        me.loops.foreach_get('vertex_index', vi)
        co = np.empty(len(me.vertices) * 3, dtype=np.float32)
        me.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3)
        m = np.array(mw)
        w = co @ m[:3, :3].T + m[:3, 3]
        p = w[vi]
        near = np.exp(-((p[:, 0] / 6.5) ** 2 + (p[:, 1] / 9.0) ** 2 + ((p[:, 2] - 0.5) / 5.0) ** 2))
        inside = (np.abs(p[:, 0]) < TRENCH_X + 0.05) & (np.abs(p[:, 1]) < TRENCH_Y + 6) & (p[:, 2] < 0.7)
        down = np.where(inside, 0.75 * np.exp(-(np.abs(p[:, 1]) / 15.0) ** 2), 0.0)
        s = np.clip(np.maximum(0.8 * near, down), 0, 0.85)
        col = me.color_attributes['Col']
        vals = np.empty(n * 4, dtype=np.float32)
        col.data.foreach_get('color', vals)
        vals = vals.reshape(n, 4)
        vals[:, :3] *= (1 - s)[:, None]
        col.data.foreach_set('color', vals.ravel())


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    lib.fetch_textures()
    make_materials()
    ground_textures()

    roots = {}
    for name, role, build in (('launchCommon', 'common', common), ('launchClassic', 'classic', classic),
                              ('launchModern', 'modern', modern)):
        b = lib.Builder(name)
        b.root.role = role
        build(b)
        roots[role] = lib.finalize(b, scene)
        print(f'MODEL {name}: {lib.triangles(roots[role])} triangles')

    def show(*keep):
        for role, root in roots.items():
            for o in [root, *root.children_recursive]:
                o.hide_render = role not in keep

    if '--no-ao' not in args:
        bake_ground()
        for role, others in (('common', ('classic',)), ('classic', ('common',)), ('modern', ('common',))):
            show(role, *others)
            lib.bake_ao(roots[role])
            scorch(roots[role])
        show(*roots)
        bpy.data.objects.remove(bpy.data.objects['bakeGround'])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format='GLB',
        export_image_format='AUTO',
        export_extras=True,
        export_yup=True,
        export_apply=False,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials='EXPORT',
        export_vertex_color='ACTIVE',
        export_all_vertex_colors=False,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        use_selection=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=7,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
        export_draco_color_quantization=8,
        export_draco_generic_quantization=12,
    )
    draco = os.path.join(lib.ROOT, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf')
    os.makedirs(os.path.join(os.path.dirname(OUT), 'draco'), exist_ok=True)
    for f in ('draco_decoder.wasm', 'draco_wasm_wrapper.js'):
        target = os.path.join(os.path.dirname(OUT), 'draco', f)
        if not os.path.exists(target):
            shutil.copyfile(os.path.join(draco, f), target)
    print(f'EXPORTED {OUT}: {os.path.getsize(OUT) / 1e6:.2f} MB')


main()
