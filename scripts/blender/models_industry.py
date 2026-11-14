"""
The industrial buildings: Mine, Metal Works, Electronics Lab, Solar Fab, Battery Plant, Warehouse.

Each builder fills a 30 m × 30 m footprint centred on the origin, front facades towards -Y and +X.
Positions that the game also needs (smoke, flags) are listed in ANCHORS and copied into buildingModels.ts.
"""
import math

from mathutils import Vector

import parts as P
from lib import Node
from parts import PAD

# Where the game puts code-made things (metres, Blender axes). Keep in sync with src/world/buildingModels.ts.
ANCHORS = {
    'metalWorks.smoke': (-6.5, 12.6, 32.6),
}


# ---------------------------------------------------------------------------------------------
# Metal Works
# ---------------------------------------------------------------------------------------------

def chimney(b, x, y, h=32.0, r0=1.7, r1=1.15):
    """A tapered brick chimney with corbelled top, red and white bands, steel hoops and a ladder."""
    b.cyl(2.3, 1.4, (x, y, PAD - 0.1), 'concrete', segs=32, bevel=0.1)
    z0 = PAD + 1.3

    def r_at(z):
        return r0 + (r1 - r0) * (z - z0) / (h - z0)
    prof = [(r0, z0), (r1 + 0.03, h - 1.6), (r1 + 0.25, h - 1.3), (r1 + 0.25, h - 0.6), (r1 + 0.12, h - 0.4),
            (r1 + 0.12, h), (r1 - 0.25, h), (r1 - 0.25, h - 2.0)]
    b.lathe(prof, (x, y, 0), 'brick', segs=32, smooth=40)
    b.cyl(r1 - 0.24, 0.05, (x, y, h - 1.9), 'interior', segs=24)
    for zb in (h - 4.6, h - 8.2):
        r = r_at(zb + 0.9) + 0.03
        b.cyl(r, 1.8, (x, y, zb), 'whitePaint', segs=32, r2=r_at(zb + 1.8) + 0.03)
    for zh in P.frange(z0 + 3, h - 10, 3.5):
        b.torus(r_at(zh) + 0.02, 0.05, (x, y, zh), 'steelDark', segs=32, ring_segs=6)
    # Ladder up the front (-y) side, following the taper, with a cage up high.
    P.ladder_line(b, (x, y - r0 - 0.25, z0 + 0.3), (x, y - r1 - 0.35, h - 0.6), (1, 0, 0), w=0.45)
    b.cyl(0.08, 0.6, (x + 0.9, y - r1 - 0.1, h), 'beacon', segs=12)


def metal_works(b):
    P.pad(b)
    # Yard surfaces: asphalt apron in front of the big door, gravel by the furnace.
    P.slab(b, -8.5, 2.0, -14.6, -2.2, 'asphalt')
    P.slab(b, 6.6, 14.6, -6.0, 9.0, 'dirt', t=0.03)
    # The hall.
    x0, x1, y0, y1 = -13.0, 6.0, -2.0, 10.5
    zr, ze = P.gable_hall(b, x0, x1, y0, y1, eave=9.0, pitch=15, wall='cladGrey', roof='cladRoof', monitor=True,
                          skylights=3)
    P.rollup_door(b, '-y', y0, -3.2, 5.0, 5.6)
    P.door(b, '-y', y0, -9.5)
    for a in (-11.5, -7.8, 1.0, 4.2):
        P.window(b, '-y', y0, a, ze - 2.0, 2.4, 1.3, mullions=3)
    P.wall_lamp(b, '-y', y0, -3.2, 7.7)
    P.wall_lamp(b, '-y', y0, -9.5, 3.4)
    for a in (0.4, 4.2, 8.0):
        P.window(b, '+x', x1, a, ze - 2.0, 2.4, 1.3, mullions=3)
    P.vent_louvre(b, '+x', x1, 8.0, 2.4)
    P.door(b, '+x', x1, 4.6)
    # Roof ventilators (turbine vents) on the back slope.
    for x in (-9.0, -2.0):
        b.cyl(0.35, 0.8, (x, 6.3, zr - 0.9), 'galvanised', segs=20)
        b.lathe([(0.6, 0), (0.6, 0.35), (0.45, 0.6), (0.0, 0.7)], (x, 6.3, zr - 0.15), 'galvanised', segs=24)

    # Brick chimney behind the hall, connected by a flue duct.
    cx, cy, _ = ANCHORS['metalWorks.smoke']
    chimney(b, cx, cy)
    b.pipe([(-6.5, 10.6, 5.0), (-6.5, 11.1, 5.0)], 0.7, 'steelDark', segs=20)

    # Furnace on the +x side, its mouth glowing, with a hood and a flue into the hall.
    fx, fy = 10.2, 3.5
    b.span(fx - 2.4, fx + 2.4, fy - 2.6, fy + 2.6, PAD, PAD + 4.6, 'brick', bevel=0.08)
    b.span(fx - 2.6, fx + 2.6, fy - 2.8, fy + 2.8, PAD + 4.6, PAD + 5.0, 'concreteDark', bevel=0.06)
    b.span(fx + 2.35, fx + 2.55, fy - 1.3, fy + 1.3, PAD + 0.5, PAD + 2.6, 'steelDark', bevel=0.03)
    b.span(fx + 2.5, fx + 2.6, fy - 1.0, fy + 1.0, PAD + 0.7, PAD + 2.3, 'fire', bevel=0)
    b.box((0.5, 3.2, 0.25), (fx + 2.7, fy, PAD + 2.75), 'steelDark', bevel=0.04)
    for s in (-1, 1):
        b.span(fx + 2.4, fx + 2.75, fy + s * 1.6 - 0.15, fy + s * 1.6 + 0.15, PAD, PAD + 4.6, 'steelDark', bevel=0.03)
    b.lathe([(1.8, 0), (1.4, 0.6), (0.55, 1.6), (0.55, 1.7)], (fx, fy, PAD + 5.0), 'steelGrey', segs=24)
    b.pipe([(fx, fy, PAD + 6.6), (fx, fy, PAD + 8.6), (x1 + 0.2, fy, PAD + 8.6)], 0.5, 'steelGrey', segs=20)
    # Charging skip and slag box beside the furnace.
    b.span(fx - 1.5, fx + 1.5, fy - 5.2, fy - 3.6, PAD, PAD + 1.1, 'steelYellow', bevel=0.06)
    b.span(fx - 1.3, fx + 1.3, fy - 5.0, fy - 3.8, PAD + 1.0, PAD + 1.15, 'productMetal', bevel=0.02)

    # Yard: stacks of aluminium plate on timber bearers, I-beams on a rack, and a finished Bus frame.
    for i, (px, py) in enumerate(((7.5, -10.0), (11.5, -10.0))):
        for s in (-0.9, 0.9):
            b.box((0.15, 2.6, 0.15), (px + s, py, PAD + 0.075), 'wood', bevel=0.01)
        for k in range(6 + i * 2):
            b.box((3.0, 1.6, 0.08), (px + (k % 2) * 0.04, py + (k % 3) * 0.03, PAD + 0.2 + k * 0.085), 'productMetal',
                  bevel=0.01, segs=1)
    for s in (-1.4, 1.4):
        b.span(-12.8, -12.5, -11.0 + s, -10.6 + s, PAD, PAD + 1.6, 'steelDark', bevel=0.02)
        b.span(-5.0, -4.7, -11.0 + s, -10.6 + s, PAD, PAD + 1.6, 'steelDark', bevel=0.02)
    for s in (-1.4, 1.4):
        b.span(-12.9, -4.6, -11.2 + s, -10.4 + s, PAD + 1.6, PAD + 1.75, 'steelDark', bevel=0.02)
    for k in range(5):
        y = -12.2 + k * 0.6
        P.i_beam(b, (-12.6, y, PAD + 1.95), (-4.9, y, PAD + 1.95), mat='productMetal')
    for k in range(3):
        y = -11.9 + k * 0.6
        P.i_beam(b, (-12.4, y, PAD + 2.35), (-5.1, y, PAD + 2.35), mat='productMetal')
    # Bus frame: a square box frame of tubes on a pallet.
    bx, by = 1.0, -10.5
    top = P.pallet(b, bx, by, w=2.4, d=2.4)
    s = 1.0
    for z in (top + 0.06, top + 2.0):
        for (ax, ay, cx_, cy_) in ((-s, -s, s, -s), (s, -s, s, s), (s, s, -s, s), (-s, s, -s, -s)):
            b.bar((bx + ax, by + ay, z), (bx + cx_, by + cy_, z), 0.12, 'productMetal', bevel=0.02)
    for (ax, ay) in ((-s, -s), (s, -s), (s, s), (-s, s)):
        b.bar((bx + ax, by + ay, top), (bx + ax, by + ay, top + 2.06), 0.12, 'productMetal', bevel=0.02)
    b.bar((bx - s, by - s, top + 0.06), (bx + s, by - s, top + 2.0), 0.08, 'productMetal', bevel=0.02)
    b.bar((bx + s, by - s, top + 0.06), (bx + s, by + s, top + 2.0), 0.08, 'productMetal', bevel=0.02)
    # Gas bottles in a cage, a skip, a lamp post.
    b.span(-1.8, 0.6, 11.0, 12.6, PAD, PAD + 0.1, 'concreteDark', bevel=0.02)
    for i in range(4):
        b.cyl(0.13, 1.5, (-1.4 + i * 0.55, 11.8, PAD + 0.1), 'steelBlue' if i % 2 else 'steelRed', segs=14, bevel=0.05)
    P.lamp_post(b, 13.6, -13.6, angle=math.radians(135))
    P.lamp_post(b, -1.0, -13.8, h=7, angle=math.radians(90))


# ---------------------------------------------------------------------------------------------
# Mine
# ---------------------------------------------------------------------------------------------

def sheave(b, node, R=2.4):
    """A headframe sheave wheel in the node's XZ plane (axle along local Y): rim, spokes and hub."""
    b.torus(R, 0.16, (0, 0, 0), 'steelDark', rot=(math.pi / 2, 0, 0), segs=40, ring_segs=8, node=node)
    b.torus(R - 0.28, 0.09, (0, 0, 0), 'steelDark', rot=(math.pi / 2, 0, 0), segs=40, ring_segs=6, node=node)
    for i in range(10):
        a = i / 10 * math.tau
        b.bar((0, 0, 0), (math.cos(a) * (R - 0.25), 0, math.sin(a) * (R - 0.25)), 0.13, 'steelDark', h=0.07, node=node)
    b.cyl(0.42, 0.5, (0, 0.25, 0), 'steelGrey', segs=20, rot=(math.pi / 2, 0, 0), bevel=0.05, uv='keep', node=node)


def mine(b):
    P.pad(b, mat='concreteDark')
    P.slab(b, -14.6, 14.6, -14.6, 14.6, 'dirt', t=0.03)
    sx, sy = 6.0, 5.5  # shaft centre
    # Shaft collar: a concrete block with the dark shaft opening.
    b.span(sx - 3.2, sx + 3.2, sy - 3.2, sy + 3.2, PAD, PAD + 0.6, 'concrete', bevel=0.08)
    b.span(sx - 1.6, sx + 1.6, sy - 1.6, sy + 1.6, PAD + 0.6, PAD + 0.62, 'interior', bevel=0)
    # Headframe: four raking legs of a steel lattice tower, girts and X-bracing on every face.
    H = 30.0
    base, top = 4.6, 2.1

    def at(cx, cy, z):
        r = base + (top - base) * (z - PAD) / (H - PAD)
        return Vector((sx + cx * r, sy + cy * r, z))
    corners = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    for c in corners:
        b.bar(at(*c, PAD + 0.6), at(*c, H), 0.6, 'steelRed', bevel=0.05)
        b.box((1.3, 1.3, 0.5), at(*c, PAD + 0.6) - Vector((0, 0, 0.25)), 'concrete', bevel=0.05)
    levels = [PAD + 0.6, 6.5, 12.5, 18.5, 24.5, H]
    for i in range(4):
        a, c = corners[i], corners[(i + 1) % 4]
        for z in levels[1:]:
            b.bar(at(*a, z), at(*c, z), 0.32, 'steelRed', bevel=0.04)
        for z0, z1 in zip(levels, levels[1:]):
            b.bar(at(*a, z0), at(*c, z1), 0.16, 'steelRed', bevel=0.02)
            b.bar(at(*c, z0), at(*a, z1), 0.16, 'steelRed', bevel=0.02)
    # Sheave deck with grating and railing, a bearing block for each wheel.
    b.span(sx - top - 0.9, sx + top + 0.9, sy - top - 0.9, sy + top + 0.9, H, H + 0.35, 'steelGrey', bevel=0.04)
    t = top + 0.8
    P.railing(b, [(sx - t, sy - t, H + 0.35), (sx + t, sy - t, H + 0.35), (sx + t, sy + t, H + 0.35),
                  (sx - t, sy + t, H + 0.35), (sx - t, sy - t, H + 0.35)], mat='steelYellow')
    # Back legs (struts) leaning towards the winding house, which takes the rope pull.
    d = Vector((-1, -1, 0)).normalized()
    side = Vector((1, -1, 0)).normalized()
    for s in (-1, 1):
        topp = Vector((sx, sy, H - 0.5)) + d * 1.5 + side * s * 2.0
        foot = Vector((sx, sy, PAD + 0.3)) + d * 13.0 + side * s * 3.2
        b.bar(foot, topp, 0.55, 'steelRed', bevel=0.04)
        b.box((1.2, 1.2, 0.6), foot, 'concrete', bevel=0.05)
        for k in (0.33, 0.66):
            q = foot.lerp(topp, k)
            b.bar(q, at(*((1, -1) if s > 0 else (-1, 1)), q.z), 0.25, 'steelRed', bevel=0.02)
    # Two sheave wheels side by side on the deck; their axle runs across the rope direction.
    mount = Node('sheaves', b.root, loc=(sx + d.x * 0.4, sy + d.y * 0.4, H + 3.0), rot=(0, 0, math.radians(-135)))
    for off in (-1.3, 1.3):
        wheel = Node(f'sheave{off:+.0f}', mount, loc=(0, off, 0), role='spin')
        sheave(b, wheel)
        for s in (-1, 1):
            b.span(-0.5, 0.5, off + s * 0.55 - 0.2, off + s * 0.55 + 0.2, -3.0, -0.2, 'steelGrey', bevel=0.04, node=mount)
    b.span(-0.2, 0.2, -2.2, 2.2, -0.12, 0.12, 'galvanised', bevel=0.02, node=mount)
    # Hoist ropes: down the shaft and across to the winding house.
    house = (-7.5, -8.0)
    rope_to = Vector((house[0] + 5.6, house[1] + 3.0, 6.2))
    for off in (-1.3, 1.3):
        c = Vector((sx, sy, H + 3.0)) + d * 0.4 + side * off
        b.bar(c - d * 2.4, Vector((c.x, c.y, PAD + 0.6)) - d * 2.4, 0.07, 'steelDark', round_=True, segs=6)
        b.bar(c + d * 2.0 + Vector((0, 0, 1.1)), rope_to + side * off * 0.5, 0.07, 'steelDark', round_=True, segs=6)
    # Ore bin on the front of the headframe and an inclined conveyor gallery out to the stockpile.
    bx, by = sx + 0.5, sy - 5.2
    b.span(bx - 1.8, bx + 1.8, by - 1.6, by + 1.6, 11.0, 15.0, 'cladGrey', bevel=0.06)
    b.span(bx - 1.9, bx + 1.9, by - 1.7, by + 1.7, 15.0, 15.25, 'steelGrey', bevel=0.04)
    b.lathe([(0.0, 8.8), (0.5, 8.8), (2.2, 11.0)], (bx, by, 0), 'steelGrey', segs=4, smooth=10)
    for (dx, dy) in ((-1.6, -1.4), (1.6, -1.4)):
        b.bar((bx + dx, by + dy, PAD), (bx + dx, by + dy, 11.0), 0.35, 'steelRed', bevel=0.03)
    b.bar((bx - 1.6, by - 1.4, PAD), (bx + 1.6, by - 1.4, 10.0), 0.18, 'steelRed', bevel=0.02)
    pile = Vector((9.6, -8.6, 0))
    c0 = Vector((bx + 1.0, by - 1.0, 14.0))
    c1 = Vector((pile.x + 0.2, pile.y + 0.8, 10.8))
    dirv = (c1 - c0).normalized()
    across = Vector((-dirv.y, dirv.x, 0)).normalized()
    for s in (-1, 1):
        b.bar(c0 + across * s * 0.9, c1 + across * s * 0.9, 0.18, 'steelGrey', bevel=0.02)
        b.bar(c0 + across * s * 0.9 + Vector((0, 0, 1.6)), c1 + across * s * 0.9 + Vector((0, 0, 1.6)), 0.12, 'steelGrey')
        n = 6
        for k in range(n + 1):
            q = c0.lerp(c1, k / n) + across * s * 0.9
            b.bar(q, q + Vector((0, 0, 1.6)), 0.1, 'steelGrey')
    b.bar(c0 + Vector((0, 0, 0.25)), c1 + Vector((0, 0, 0.25)), 1.3, 'rubber', h=0.12)
    gal = b.bar(c0 + Vector((0, 0, 1.75)), c1 + Vector((0, 0, 1.75)), 2.2, 'cladGrey', h=0.12, bevel=0.02)
    mid = c0.lerp(c1, 0.5)
    for s in (-1, 1):
        b.bar((mid.x + across.x * s * 1.0, mid.y + across.y * s * 1.0, PAD), mid + across * s * 1.0, 0.3, 'steelRed')
    # Ore stockpiles under the conveyor and by the rails.
    b.mound(5.0, 7.2, (pile.x, pile.y, PAD - 0.1), 'ore', seed=1)
    b.mound(3.2, 3.2, (-1.0, 11.8, PAD - 0.1), 'ore', seed=2, squash=(1.3, 0.8))
    b.mound(4.0, 3.8, (-8.0, 8.0, PAD - 0.1), 'ore', seed=3, squash=(1.1, 0.9))
    # Lumps that rolled off the heaps.
    for k, (px, py, pr) in enumerate(((pile.x, pile.y, 5.0), (-1.0, 11.8, 3.6), (-8.0, 8.0, 4.2))):
        for i in range(7):
            a = b.rng.uniform(0, math.tau)
            d = pr + b.rng.uniform(0.0, 0.9)
            r = b.rng.uniform(0.18, 0.42)
            qx = max(-14.2, min(14.2, px + math.cos(a) * d))
            qy = max(-14.2, min(14.2, py + math.sin(a) * d))
            b.blob(r, (qx, qy, PAD + r * 0.4), 'ore', seed=k * 10 + i,
                   scale=(1, 1, 0.7))

    # Winding house: brick engine house with tall windows and the rope openings high on its gable.
    hx0, hx1, hy0, hy1 = -13.2, -1.8, -13.0, -3.0
    zr, ze = P.gable_hall(b, hx0, hx1, hy0, hy1, eave=7.5, pitch=24, wall='brick', roof='cladRoof', plinth=0.6,
                          skylights=0, trim='steelDark')
    for a in (-11.0, -8.6, -4.2):
        P.window(b, '-y', hy0, a, PAD + 4.0, 1.4, 3.0, frame='steelDark', glass='glassDark', mullions=2, transoms=3)
    P.door(b, '-y', hy0, -6.4, w=1.6, h=2.6, leaf='steelBlue')
    for a in (-11.5, -8.0, -4.5):
        P.window(b, '+y', hy1, a, PAD + 4.0, 1.4, 3.0, frame='steelDark', glass='glassDark', mullions=2, transoms=3)
    P.window(b, '+x', hx1, -9.6, PAD + 3.6, 1.4, 2.6, frame='steelDark', glass='glassDark', mullions=2, transoms=2)
    P.fbox(b, '+x', hx1, -6.5, 0.05, 6.2, 2.4, 0.1, 1.0, 'interior', bevel=0)
    P.fbox(b, '+x', hx1, -6.5, 0.12, 6.75, 2.8, 0.25, 0.15, 'concreteDark')
    P.wall_lamp(b, '-y', hy0, -6.4, PAD + 3.6)
    # Transformer and a cable to the house.
    b.span(-0.5, 2.0, -12.8, -10.6, PAD, PAD + 0.3, 'concrete', bevel=0.04)
    b.span(-0.2, 1.7, -12.5, -10.9, PAD + 0.3, PAD + 2.0, 'cladGreen', bevel=0.06)
    for k in range(3):
        b.cyl(0.08, 0.6, (0.2 + k * 0.6, -11.7, PAD + 2.0), 'whitePaint', segs=10)

    # Rails from the shaft to the front, on sleepers, with an ore wagon.
    rx = 1.4
    for dx in (-0.72, 0.72):
        b.span(rx + dx - 0.04, rx + dx + 0.04, -13.6, sy - 2.6, PAD + 0.18, PAD + 0.32, 'galvanised', bevel=0)
    for y in P.frange(-13.4, sy - 2.9, 0.9):
        b.span(rx - 1.2, rx + 1.2, y - 0.12, y + 0.12, PAD, PAD + 0.18, 'wood', bevel=0.02, segs=1)
    b.span(rx - 1.0, sx - 2.0, sy - 3.0, sy - 2.0, PAD, PAD + 0.25, 'concrete', bevel=0.03)
    for wy in (-5.5, -9.4):
        b.prism([(-0.95, 0.0), (0.95, 0.0), (1.15, 1.2), (-1.15, 1.2)], 3.2, (rx, wy, PAD + 0.75), 'steelDark', axis='y',
                bevel=0.06)
        b.mound(1.05, 0.55, (rx, wy, PAD + 1.9), 'ore', seed=4, squash=(0.95, 1.45))
        for dy in (-1.0, 1.0):
            for dx in (-0.72, 0.72):
                b.cyl(0.36, 0.14, (rx + dx * 1.05, wy + dy, PAD + 0.36), 'steelGrey', segs=16,
                      rot=(0, math.pi / 2 * (1 if dx > 0 else -1), 0), uv='keep')
    P.lamp_post(b, 13.6, -13.6, angle=math.radians(135))
    P.lamp_post(b, -0.6, -1.0, angle=math.radians(200))


# ---------------------------------------------------------------------------------------------
# Electronics Lab
# ---------------------------------------------------------------------------------------------

def dish_mesh(b, node, R, depth, mat='whitePaint', segs=40, thickness=0.12):
    """A parabolic dish facing +Z, vertex at the origin: a closed shell (front, rim, back)."""
    prof = []
    n = 10
    for i in range(n + 1):
        r = R * i / n
        prof.append((r, depth * (r / R) ** 2))
    back = [(r, z - thickness - 0.04 * (1 - r / R)) for r, z in reversed(prof)]
    prof = prof + [(R, depth + 0.02)] + back
    b.lathe(prof, (0, 0, 0), mat, segs=segs, node=node, smooth=60)


def electronics_lab(b):
    P.pad(b)
    x0, x1, y0, y1 = -12.5, 6.5, -4.0, 10.5
    roof = P.flat_block(b, x0, x1, y0, y1, 11.5, wall='precast')
    # Product-coloured band under the coping, all round.
    for face, p, a0, a1 in (('-y', y0, x0, x1), ('+x', x1, y0, y1)):
        P.fbox(b, face, p, (a0 + a1) / 2, 0.04, PAD + 10.0, a1 - a0 + 0.02, 0.08, 0.7, 'product', bevel=0.02)
    for face, p, a0, a1 in (('+y', y1, x0, x1), ('-x', x0, y0, y1)):
        P.fbox(b, face, p, (a0 + a1) / 2, 0.04, PAD + 10.0, a1 - a0 + 0.02, 0.08, 0.7, 'product', bevel=0.02)
    # Ribbon windows on both storeys.
    for z in (PAD + 2.9, PAD + 7.0):
        P.window_band(b, '-y', y0, x0 + 1.0, -6.5, z, 1.7)
        P.window_band(b, '-y', y0, -1.5, x1 - 1.0, z, 1.7)
        P.window_band(b, '+x', x1, y0 + 1.0, y1 - 4.5, z, 1.7)
    P.window_band(b, '-y', y0, -6.5, -1.5, PAD + 7.0, 1.7)
    # Glazed entrance box with a canopy.
    ex = -4.0
    b.span(ex - 2.4, ex + 2.4, y0 - 1.6, y0, PAD, PAD + 4.0, 'glass', bevel=0.02)
    for xx in P.frange(ex - 2.4, ex + 2.4, 1.2):
        b.span(xx - 0.05, xx + 0.05, y0 - 1.66, y0 - 1.56, PAD, PAD + 4.0, 'frame', bevel=0)
    b.span(ex - 2.5, ex + 2.5, y0 - 1.7, y0, PAD + 4.0, PAD + 4.4, 'whitePaint', bevel=0.04)
    b.span(ex - 3.6, ex + 3.6, y0 - 3.2, y0, PAD + 4.4, PAD + 4.65, 'aluminium', bevel=0.05)
    for s in (-1, 1):
        b.cyl(0.12, 4.4, (ex + s * 3.3, y0 - 2.9, PAD), 'aluminium', segs=16)
    b.span(ex - 3.5, ex + 3.5, y0 - 3.4, y0 - 1.6, PAD, PAD + 0.12, 'concreteDark', bevel=0.03)
    # Loading door on +x with a small dock.
    P.rollup_door(b, '+x', x1, 7.2, 3.2, 3.6, mat='shutter')
    # Roof: air handlers, exhaust stacks with rain caps, duct runs.
    P.hvac(b, -8.5, 1.0, roof, w=4.4, d=2.2, h=1.6, fans=2)
    P.hvac(b, -8.5, 5.0, roof, w=4.4, d=2.2, h=1.6, fans=2)
    P.hvac(b, -2.0, 7.0, roof, w=3.0, d=1.8, h=1.3, fans=1)
    b.span(-6.2, 2.5, 0.6, 1.4, roof, roof + 0.9, 'galvanised', bevel=0.04)
    b.span(1.7, 2.5, 0.6, 7.0, roof, roof + 0.9, 'galvanised', bevel=0.04)
    for (x, y) in ((3.5, 2.0), (3.5, 4.0), (3.5, 6.0)):
        b.cyl(0.35, 3.0, (x, y, roof), 'galvanised', segs=20)
        b.lathe([(0.0, 0.0), (0.7, 0.0), (0.0, 0.45)], (x, y, roof + 3.2), 'galvanised', segs=20)
        for k in range(3):
            a = k / 3 * math.tau
            b.bar((x, y, roof + 3.0), (x + math.cos(a) * 0.5, y + math.sin(a) * 0.5, roof + 3.2), 0.04, 'galvanised')
    # Mast with a small dish that turns while the lab works.
    mx, my = -10.5, 8.5
    b.cyl(0.18, 6.0, (mx, my, roof), 'galvanised', segs=16)
    b.box((1.0, 1.0, 0.15), (mx, my, roof + 0.08), 'steelGrey', bevel=0.03)
    turn = Node('labDish', b.root, loc=(mx, my, roof + 6.0), role='spinY', speed=0.8)
    b.cyl(0.3, 0.5, (0, 0, 0), 'steelGrey', segs=16, node=turn)
    tilt = Node('labDishTilt', turn, loc=(0, 0, 0.9), rot=(math.radians(55), 0, 0))
    dish_mesh(b, tilt, 1.5, 0.45, segs=32, thickness=0.06)
    for k in range(3):
        a = k / 3 * math.tau + 0.5
        b.bar((math.cos(a) * 1.4, math.sin(a) * 1.4, 0.45), (0, 0, 1.2), 0.04, 'galvanised', round_=True, node=tilt)
    b.cyl(0.08, 0.25, (0, 0, 1.15), 'steelDark', segs=12, node=tilt)
    b.bar((0, 0, -0.3), (0, 0, -0.9), 0.2, 'steelGrey', round_=True, node=tilt)
    # Nitrogen tank and gas cabinet on the yard side, a pallet of crated circuit boards by the door.
    tx, ty = 11.0, 8.5
    b.span(tx - 2.0, tx + 2.0, ty - 2.0, ty + 2.0, PAD, PAD + 0.25, 'concrete', bevel=0.04)
    b.lathe([(0.0, 1.6), (1.1, 1.6), (1.25, 2.0), (1.25, 9.0), (1.1, 9.5), (0.5, 9.75), (0.0, 9.8)], (tx, ty, 0), 'whitePaint',
            segs=32)
    for k in range(4):
        a = k / 4 * math.tau + 0.78
        b.bar((tx + math.cos(a) * 0.9, ty + math.sin(a) * 0.9, PAD), (tx + math.cos(a) * 1.1, ty + math.sin(a) * 1.1, 2.4), 0.18,
              'steelGrey')
    b.pipe([(tx - 1.2, ty, 2.2), (x1 + 2.0, ty, 2.2), (x1 + 2.0, ty, 4.5), (x1 + 0.1, ty, 4.5)], 0.08, 'galvanised', segs=10)
    P.ladder_line(b, (tx, ty - 1.45, 2.0), (tx, ty - 1.45, 9.0), (1, 0, 0), w=0.4)
    for i, (px, py) in enumerate(((9.5, -2.5), (11.5, -2.5))):
        top = P.pallet(b, px, py)
        for k in range(2):
            for j in range(2):
                P.crate(b, px - 0.3 + j * 0.6, py, top + k * 0.55, w=0.55, d=0.9, h=0.5, mat='product')
    P.lamp_post(b, 13.6, -13.6, angle=math.radians(135))
    P.lamp_post(b, -13.6, -12.0, angle=math.radians(45))
    # Two parking bays and a car.
    P.slab(b, 1.5, 12.0, -14.6, -8.0, 'asphalt')
    for x in (1.8, 5.0, 8.2, 11.4):
        P.line(b, (x, -14.0), (x, -9.0))
    P.car(b, 3.4, -11.6, rot=math.radians(90), paint='carWhite')


# ---------------------------------------------------------------------------------------------
# Solar Fab
# ---------------------------------------------------------------------------------------------

def pv_array(b, cx, cy, z, cols, rows, tilt_deg=20, node=None, frame='aluminium', legs=True):
    """A row of PV modules (1 m × 1.65 m, portrait) on a rack, tilted up towards -Y."""
    t = math.radians(tilt_deg)
    w = cols * 1.02
    h = rows * 1.67
    zc = z + 0.6 + h / 2 * math.sin(t)
    b.tiled_quad(w, h, cols, rows, (cx, cy, zc + 0.05), 'productPV', rot=(t, 0, 0), node=node)
    b.box((w + 0.06, h + 0.06, 0.08), (cx, cy, zc), frame, rot=(t, 0, 0), bevel=0.02, node=node)
    if legs:
        for k in range(int(cols / 4) + 1):
            x = cx - w / 2 + k * w / max(1, int(cols / 4))
            yf = cy - h / 2 * math.cos(t)
            yb = cy + h / 2 * math.cos(t)
            b.bar((x, yf, z), (x, yf, zc - h / 2 * math.sin(t)), 0.1, 'galvanised', node=node)
            b.bar((x, yb, z), (x, yb, zc + h / 2 * math.sin(t)), 0.1, 'galvanised', node=node)


def solar_fab(b):
    P.pad(b)
    x0, x1, y0, y1 = -13.0, 9.0, -3.0, 11.5
    zr, ze = P.gable_hall(b, x0, x1, y0, y1, eave=7.0, pitch=5, wall='cladCream', roof='cladRoof', skylights=0)
    P.rollup_door(b, '-y', y0, 3.5, 4.5, 4.8)
    P.door(b, '-y', y0, -10.5)
    P.window_band(b, '-y', y0, -8.5, -0.5, PAD + 3.0, 1.4)
    P.sign_panel(b, '-y', y0, -4.5, PAD + 5.6, w=6.0, h=1.0, mat='steelBlue')
    for a in (0.0, 4.5):
        P.window(b, '+x', x1, a, PAD + 3.0, 2.4, 1.4, mullions=3)
    P.door(b, '+x', x1, 8.8)
    # Roof-top PV: rows across both slopes.
    for y in (-1.0, 2.6, 6.2, 9.8):
        zroof = PAD + 7.0 + ((y1 - y0) / 2 - abs(y - (y0 + y1) / 2)) * math.tan(math.radians(5))
        pv_array(b, -2.0, y, zroof, 20, 1, tilt_deg=18)
    # Inverters and a transformer on the +x side.
    b.span(10.2, 14.4, 2.0, 7.5, PAD, PAD + 0.25, 'concrete', bevel=0.03)
    for k in range(3):
        b.span(10.6 + k * 1.3, 11.6 + k * 1.3, 2.4, 3.2, PAD + 0.25, PAD + 2.0, 'plastic', bevel=0.05)
    b.span(10.8, 13.8, 4.8, 7.2, PAD + 0.25, PAD + 2.4, 'cladGreen', bevel=0.08)
    for k in range(3):
        b.cyl(0.09, 0.7, (11.4 + k * 0.9, 6.0, PAD + 2.4), 'whitePaint', segs=10)
    # Ground-mounted test panel that follows the Sun (swings about the vertical).
    tx, ty = 9.8, -9.0
    b.cyl(0.6, 0.4, (tx, ty, PAD), 'concrete', segs=20)
    b.cyl(0.16, 3.2, (tx, ty, PAD + 0.4), 'galvanised', segs=16)
    swing = Node('tracker', b.root, loc=(tx, ty, PAD + 3.6), role='swing')
    b.box((0.4, 0.4, 0.5), (0, 0, 0), 'steelGrey', bevel=0.05, node=swing)
    tilt = Node('trackerTilt', swing, loc=(0, 0, 0.3), rot=(math.radians(35), 0, 0))
    b.tiled_quad(5.1, 3.34, 5, 2, (0, 0, 0.1), 'productPV', node=tilt)
    b.box((5.2, 3.44, 0.1), (0, 0, 0.03), 'aluminium', bevel=0.02, node=tilt)
    b.bar((-2.4, 0, -0.05), (2.4, 0, -0.05), 0.2, 'galvanised', round_=True, node=tilt)
    # Finished panels stacked on pallets, and a forklift-ready stack of empty racks.
    for (px, py) in ((-10.0, -10.5), (-7.4, -10.5), (-10.0, -7.6)):
        top = P.pallet(b, px, py, w=1.2, d=1.8)
        for k in range(6):
            b.tiled_quad(1.0, 1.65, 1, 1, (px, py, top + 0.045 + k * 0.045), 'productPV')
            b.box((1.04, 1.69, 0.04), (px, py, top + 0.02 + k * 0.045), 'aluminium', bevel=0.005, segs=1)
    P.lamp_post(b, 13.6, -13.6, angle=math.radians(135))
    P.lamp_post(b, -1.5, -13.6, angle=math.radians(90))
    P.slab(b, 0.0, 7.0, -14.6, -3.1, 'asphalt')


# ---------------------------------------------------------------------------------------------
# Battery Plant
# ---------------------------------------------------------------------------------------------

def tank(b, x, y, r=2.8, h=14.0, band='product'):
    """A vertical process tank on a ring base: dished head, coloured band, ladder with cage, top platform."""
    b.cyl(r + 0.5, 0.5, (x, y, PAD), 'concrete', segs=40, bevel=0.06)
    z0 = PAD + 0.5
    prof = [(0.0, z0), (r, z0), (r, z0 + h), (r * 0.92, z0 + h + 0.55), (r * 0.6, z0 + h + 1.05), (0.0, z0 + h + 1.25)]
    b.lathe(prof, (x, y, 0), 'whitePaint', segs=40, smooth=40)
    b.cyl(r + 0.03, 1.4, (x, y, z0 + h * 0.62), band, segs=40)
    b.cyl(r + 0.03, 0.25, (x, y, z0 + h * 0.62 - 0.4), 'hazard', segs=40)
    for zz in P.frange(z0 + 2.0, z0 + h - 1, 3.0):
        b.torus(r + 0.02, 0.04, (x, y, zz), 'steelGrey', segs=40, ring_segs=4)
    # Ladder on the front, platform with railing on top.
    P.ladder(b, x, y - r - 0.35, z0 + 0.2, z0 + h + 1.4, face='-y', cage=True)
    pz = z0 + h + 1.25
    b.cyl(1.3, 0.12, (x, y, pz), 'galvanised', segs=24)
    pts = [(x + math.cos(a) * 1.25, y + math.sin(a) * 1.25, pz + 0.12) for a in [math.radians(200 + i * 35) for i in range(9)]]
    P.railing(b, pts, mat='steelYellow')
    b.cyl(0.25, 0.7, (x + 0.6, y + 0.6, pz), 'steelGrey', segs=16)


def battery_plant(b):
    P.pad(b)
    x0, x1, y0, y1 = -13.5, 0.5, -10.5, 3.0
    roof = P.flat_block(b, x0, x1, y0, y1, 9.0, wall='cladSage')
    for face, p, a0, a1 in (('-y', y0, x0, x1), ('+x', x1, y0, y1), ('+y', y1, x0, x1), ('-x', x0, y0, y1)):
        P.fbox(b, face, p, (a0 + a1) / 2, 0.04, PAD + 7.6, a1 - a0 + 0.02, 0.08, 0.6, 'product', bevel=0.02)
    P.rollup_door(b, '-y', y0, -8.5, 4.0, 4.5)
    P.door(b, '-y', y0, -3.0)
    P.window_band(b, '-y', y0, -1.8, x1 - 0.8, PAD + 4.2, 1.2)
    for a in (-8.0, -4.5, -1.0):
        P.window(b, '+x', x1, a, PAD + 4.2, 2.2, 1.3, mullions=2)
    P.door(b, '+x', x1, 1.4)
    # Roof: an exhaust fan with blades that turn while the plant works, and an AC unit.
    fx, fy = -8.0, -3.5
    b.lathe([(1.75, 0), (1.75, 1.3), (1.55, 1.3), (1.55, 0.3), (0.0, 0.3)], (fx, fy, roof), 'galvanised', segs=36, smooth=30)
    fan = Node('roofFan', b.root, loc=(fx, fy, roof + 0.9), role='spinY', speed=6.0)
    b.cyl(0.25, 0.3, (0, 0, -0.15), 'steelDark', segs=16, node=fan)
    for k in range(5):
        a = k / 5 * math.tau
        b.box((1.3, 0.38, 0.04), (math.cos(a) * 0.85, math.sin(a) * 0.85, 0), 'steelDark', rot=(0.35, 0, a), bevel=0.01,
              node=fan)
    for k in range(4):
        a = k / 4 * math.tau + 0.4
        b.bar((fx, fy, roof + 1.4), (fx + math.cos(a) * 1.6, fy + math.sin(a) * 1.6, roof + 1.4), 0.05, 'galvanised')
    P.hvac(b, -2.5, 0.0, roof, w=3.0, d=1.8)
    # Tank farm behind a bund wall, piped into the building over a pipe rack.
    b.span(2.0, 14.6, 4.0, 14.6, PAD, PAD + 0.05, 'concreteDark', bevel=0)
    for (a0, a1, c0, c1) in ((2.0, 14.6, 4.0, 4.35), (2.0, 2.35, 4.0, 14.6), (14.25, 14.6, 4.0, 14.6), (2.0, 14.6, 14.25, 14.6)):
        b.span(a0, a1, c0, c1, PAD, PAD + 1.1, 'concrete', bevel=0.05)
    tank(b, 5.5, 9.8)
    tank(b, 11.3, 8.6, r=2.5, h=12.0)
    # Pipe rack: portal frames along x with three pipes to the building.
    for x in (1.6, 4.0, 7.0, 10.0):
        for y in (3.6, 5.0):
            b.bar((x, y, PAD), (x, y, PAD + 5.2), 0.25, 'steelGrey')
        b.bar((x, 3.5, PAD + 5.2), (x, 5.1, PAD + 5.2), 0.25, 'steelGrey')
    for k, (r, mat) in enumerate(((0.18, 'galvanised'), (0.14, 'steelYellow'), (0.12, 'galvanised'))):
        y = 3.9 + k * 0.45
        b.pipe([(x1 + 0.05, y, PAD + 5.5 + r), (10.0, y, PAD + 5.5 + r)], r, mat)
    b.pipe([(5.5, 7.0, PAD + 3.0), (5.5, 4.35, PAD + 3.0), (5.5, 4.35, PAD + 5.7), (5.5, 3.9, PAD + 5.7)], 0.18, 'galvanised')
    b.pipe([(11.3, 6.1, PAD + 2.5), (11.3, 4.35, PAD + 2.5), (11.3, 4.35, PAD + 5.6), (10.0, 4.35, PAD + 5.6)], 0.14, 'steelYellow')
    # Pallets of yellow battery cells, and spare drums.
    for (px, py) in ((7.0, -9.5), (9.6, -9.5), (7.0, -12.2)):
        top = P.pallet(b, px, py)
        for i in range(4):
            for j in range(3):
                cx, cy = px - 0.42 + i * 0.28, py - 0.3 + j * 0.3
                b.cyl(0.12, 0.65, (cx, cy, top), 'product', segs=12)
                b.cyl(0.07, 0.05, (cx, cy, top + 0.65), 'steelDark', segs=8)
    for k in range(3):
        P.drum(b, 12.8, -6.0 + k * 0.7)
    P.lamp_post(b, 13.6, -13.6, angle=math.radians(135))
    P.lamp_post(b, 1.4, -13.6, angle=math.radians(90))
    P.slab(b, -11.5, -5.5, -14.6, -10.6, 'asphalt')


# ---------------------------------------------------------------------------------------------
# Warehouse
# ---------------------------------------------------------------------------------------------

def forklift(b, node):
    """A counterbalance forklift, forks towards +Y (into the hall), with a crate on the forks."""
    b.box((1.2, 2.2, 0.9), (0, -0.3, 0.75), 'steelYellow', bevel=0.12, node=node)
    b.box((1.15, 0.7, 0.75), (0, -1.15, 1.05), 'steelDark', bevel=0.15, node=node)
    b.box((1.0, 0.9, 0.08), (0, -0.4, 2.3), 'steelDark', bevel=0.03, node=node)
    for x in (-0.45, 0.45):
        for y in (0.3, -1.1):
            b.bar((x, y, 1.2), (x, y + 0.05, 2.3), 0.07, 'steelDark', node=node)
    b.box((0.45, 0.5, 0.15), (0, -0.4, 1.35), 'rubber', bevel=0.04, node=node)
    for x in (-0.38, 0.38):
        b.bar((x, 0.95, 0.15), (x, 0.95, 2.9), 0.12, 'steelGrey', h=0.08, node=node)
        b.box((0.12, 1.1, 0.05), (x * 0.8, 1.55, 0.15), 'steelGrey', bevel=0, node=node)
    for x in (-0.6, 0.6):
        for y, r in ((0.45, 0.32), (-1.1, 0.28)):
            b.cyl(r, 0.25, (x + (0.12 if x > 0 else -0.12), y, r), 'rubber', segs=16,
                  rot=(0, math.pi / 2 * (1 if x > 0 else -1), 0), bevel=0.06, uv='keep', node=node)
    b.box((1.1, 1.0, 0.8), (0, 1.55, 0.6), 'wood', bevel=0.04, node=node)
    b.box((1.0, 0.9, 0.1), (0, 1.55, 1.05), 'wrapCopper', bevel=0.02, node=node)


def warehouse(b):
    P.pad(b)
    x0, x1, y0, y1 = -12.5, 12.5, -3.5, 12.5
    zr, ze = P.gable_hall(b, x0, x1, y0, y1, eave=8.0, pitch=10, wall='cladSand', roof='cladRed', skylights=4,
                          trim='steelGrey')
    P.slab(b, -4.0, 7.0, -14.6, -3.6, 'asphalt')
    P.rollup_door(b, '-y', y0, 2.0, 4.6, 5.0)
    P.rollup_door(b, '-y', y0, -6.5, 3.6, 4.0, mat='shutterBlue')
    P.door(b, '-y', y0, -10.8)
    for a in (-9.5, 7.0, 10.0):
        P.window(b, '-y', y0, a, PAD + 6.2, 2.0, 1.0, mullions=2)
    for a in (-1.0, 3.0, 7.0):
        P.window(b, '+x', x1, a, PAD + 6.2, 2.0, 1.0, mullions=2)
    P.rollup_door(b, '+x', x1, 10.2, 3.2, 3.6)
    P.wall_lamp(b, '-y', y0, 2.0, PAD + 6.6)
    P.wall_lamp(b, '-y', y0, -6.5, PAD + 5.6)
    # Loads in the colours of what is stored (Raw Materials and Parts), outside on both sides of the door.
    wraps = ['wrapAluminium', 'wrapCopper', 'wrapSilicon', 'wrapMetal', 'wrapCircuit', 'wrapSolar', 'wrapBattery']
    spots = [(-12.0, -6.5, 0), (-10.6, -6.5, 0), (-12.0, -6.5, 1), (-12.0, -8.0, 0), (9.6, -6.0, 0), (11.0, -6.0, 0),
             (9.6, -6.0, 1), (12.4, -6.0, 0), (11.0, -7.6, 0)]
    for i, (x, y, lv) in enumerate(spots):
        P.wrapped_load(b, x, y, wraps[i % len(wraps)], z=PAD + lv * 1.25, h=1.0)
    # Pallet rack along the left.
    for x in (-13.6, -11.0, -8.4):
        for y in (-12.2, -10.8):
            b.bar((x, y, PAD), (x, y, PAD + 4.6), 0.1, 'steelBlue', h=0.08)
    for z in (PAD + 0.25, PAD + 2.4, PAD + 4.5):
        for y in (-12.2, -10.8):
            b.bar((-13.6, y, z), (-8.4, y, z), 0.08, 'steelYellow', h=0.14)
    for i, x in enumerate((-12.3, -9.7)):
        for j, z in enumerate((PAD + 0.32, PAD + 2.47)):
            P.wrapped_load(b, x, -11.5, wraps[(i * 2 + j + 3) % len(wraps)], z=z, h=1.2)
    # The forklift, driving in and out of the door ('shuttle' slides along game z = -Blender y).
    base = 9.0
    fork = Node('forklift', b.root, loc=(2.0, -base, PAD), role='shuttle', base=base, range=2.4)
    forklift(b, fork)
    P.lamp_post(b, 13.6, -13.6, angle=math.radians(135))
    P.lamp_post(b, -3.0, -13.6, angle=math.radians(90))


MODELS = {
    'mine': mine,
    'metalWorks': metal_works,
    'electronicsLab': electronics_lab,
    'solarFab': solar_fab,
    'batteryPlant': battery_plant,
    'warehouse': warehouse,
}
