"""
The campus buildings: Research Lab, Assembly Hall, HQ, Ground Station; plus the tower crane shown while a
building is upgraded, and the concrete foundation block every building stands on.
"""
import math

from mathutils import Vector

import parts as P
from lib import Node
from models_industry import dish_mesh
from parts import PAD

# Code-made things in the game (metres, Blender axes). Keep in sync with src/world/buildingModels.ts.
ANCHORS = {
    'hq.flag': (10.5, -9.5, 13.2),  # top of the flag pole
    'hq.sign': (-4.0, -4.62, 10.0),  # centre of the logo board above the entrance
}


# ---------------------------------------------------------------------------------------------
# Research Lab
# ---------------------------------------------------------------------------------------------

def research_lab(b):
    P.pad(b)
    x0, x1, y0, y1 = -12.5, 6.0, -4.5, 12.0
    roof = P.flat_block(b, x0, x1, y0, y1, 13.0, wall='brick')
    # Three storeys of punched windows with a dark spandrel band.
    for zf in (PAD + 2.2, PAD + 6.0, PAD + 9.8):
        for a in P.frange(x0 + 1.6, x1 - 1.4, 2.3):
            if zf < PAD + 3 and -7.5 < a < -1.5:
                continue
            P.window(b, '-y', y0, a, zf, 1.6, 2.0, mullions=2, transoms=1)
        for a in P.frange(y0 + 1.6, y1 - 1.4, 2.3):
            P.window(b, '+x', x1, a, zf, 1.6, 2.0, mullions=2, transoms=1)
    # Glazed stair tower and an entrance with a canopy.
    sx = -4.5
    b.span(sx - 2.0, sx + 2.0, y0 - 1.2, y0 + 0.5, PAD, PAD + 14.0, 'plasterGrey', bevel=0.06)
    b.span(sx - 1.6, sx + 1.6, y0 - 1.24, y0, PAD + 4.0, PAD + 13.4, 'glass', bevel=0)
    for z in P.frange(PAD + 4.0, PAD + 13.4, 1.9):
        b.span(sx - 1.65, sx + 1.65, y0 - 1.3, y0 - 1.15, z - 0.06, z + 0.06, 'frame', bevel=0)
    b.span(sx - 1.6, sx + 1.6, y0 - 1.24, y0, PAD, PAD + 3.0, 'glass', bevel=0)
    b.span(sx - 3.4, sx + 3.4, y0 - 3.5, y0 - 1.0, PAD + 3.2, PAD + 3.45, 'aluminium', bevel=0.05)
    for s in (-1, 1):
        b.cyl(0.12, 3.2, (sx + s * 3.0, y0 - 3.2, PAD), 'aluminium', segs=16)
    b.span(sx - 3.4, sx + 3.4, y0 - 3.7, y0 - 1.2, PAD, PAD + 0.12, 'concreteDark', bevel=0.03)
    P.sign_panel(b, '-y', y0, 0.5, PAD + 3.6, w=4.0, h=0.8, mat='steelBlue')
    # Observatory on the roof: drum, and a dome with its slit that turns while the Lab researches.
    ox, oy = -7.0, 6.5
    b.cyl(3.6, 2.6, (ox, oy, roof - 0.1), 'whitePaint', segs=48, bevel=0.05)
    b.cyl(3.75, 0.2, (ox, oy, roof + 2.5), 'steelGrey', segs=48)
    dome = Node('observatory', b.root, loc=(ox, oy, roof + 2.7), role='spinY', speed=0.4)
    R = 3.6
    prof = [(R * math.cos(math.radians(a)), R * math.sin(math.radians(a))) for a in range(0, 91, 6)]
    b.lathe(prof, (0, 0, 0), 'aluminium', segs=48, node=dome)
    # The slit: a dark strip over the dome from the rim to just past the top, with shutter rails.
    for a in range(0, 100, 6):
        t0, t1 = math.radians(a), math.radians(min(a + 6, 100))
        p0 = Vector((0, -R * math.cos(t0) - 0.02, R * math.sin(t0)))
        p1 = Vector((0, -R * math.cos(t1) - 0.02, R * math.sin(t1)))
        b.bar(p0, p1, 1.0, 'interior', h=0.06, node=dome)
        for s in (-1, 1):
            b.bar(p0 + Vector((s * 0.62, -0.05 * math.cos(t0), 0.05 * math.sin(t0))),
                  p1 + Vector((s * 0.62, -0.05 * math.cos(t1), 0.05 * math.sin(t1))), 0.16, 'steelGrey', h=0.14, node=dome)
    # Roof plant, a small dish on a post, a whip antenna and a weather mast with a turning anemometer.
    P.hvac(b, 1.0, 8.5, roof, w=3.0, d=1.8)
    P.hvac(b, 1.0, 4.5, roof, w=3.0, d=1.8)
    b.cyl(0.12, 2.2, (3.0, 0.0, roof), 'galvanised', segs=12)
    tilt = Node('labDishPost', b.root, loc=(3.0, 0.0, roof + 2.4), rot=(math.radians(50), 0, math.radians(20)))
    dish_mesh(b, tilt, 1.2, 0.35, segs=32, thickness=0.05)
    b.bar((0, 0, 0.35), (0, 0, 0.9), 0.05, 'galvanised', round_=True, node=tilt)
    b.cyl(0.05, 7.0, (-11.5, -3.6, roof), 'galvanised', segs=8, r2=0.015)
    b.cyl(0.06, 4.5, (4.8, 10.8, roof), 'galvanised', segs=8)
    ane = Node('anemometer', b.root, loc=(4.8, 10.8, roof + 4.6), role='spinY', speed=5.0)
    for k in range(3):
        a = k / 3 * math.tau
        b.bar((0, 0, 0), (math.cos(a) * 0.45, math.sin(a) * 0.45, 0), 0.03, 'galvanised', round_=True, node=ane)
        b.sphere(0.1, (math.cos(a) * 0.45, math.sin(a) * 0.45, 0), 'steelDark', segs=10, node=ane)
    # Yard: lawn, trees, benches, bike shelter.
    P.slab(b, 7.2, 14.6, -14.6, 14.6, 'grass', t=0.03)
    P.slab(b, -14.6, 7.2, -14.6, -9.2, 'grass', t=0.03)
    for (x, y, s) in ((10.5, 9.0, 1), (11.5, -1.5, 2), (-11.5, -12.0, 3), (10.0, -11.5, 4)):
        P.tree(b, x, y, h=7.5, seed=s)
    for x in (-10.0, 1.5):
        b.span(x - 1.0, x + 1.0, -8.0, -7.5, PAD + 0.42, PAD + 0.5, 'wood', bevel=0.02)
        for s in (-1, 1):
            b.span(x + s * 0.8 - 0.05, x + s * 0.8 + 0.05, -8.0, -7.5, PAD, PAD + 0.42, 'steelDark', bevel=0)
    P.lamp_post(b, 13.6, -13.6, angle=math.radians(135))
    P.lamp_post(b, -1.0, -13.6, angle=math.radians(90))


# ---------------------------------------------------------------------------------------------
# Assembly Hall
# ---------------------------------------------------------------------------------------------

def spacecraft(b, x, y, z):
    """A generic Spacecraft on a work stand: gold-foil bus, folded panels, adapter and a dish."""
    b.span(x - 2.2, x + 2.2, y - 2.2, y + 2.2, z, z + 0.9, 'steelYellow', bevel=0.08)
    for (dx, dy) in ((-1.9, -1.9), (1.9, -1.9), (1.9, 1.9), (-1.9, 1.9)):
        b.cyl(0.15, 0.3, (x + dx, y + dy, z - 0.3), 'rubber', segs=12, uv='keep')
    zb = z + 0.9
    b.cyl(1.25, 0.8, (x, y, zb), 'aluminium', segs=32, r2=0.9)
    b.span(x - 1.5, x + 1.5, y - 1.5, y + 1.5, zb + 0.8, zb + 4.6, 'foil', bevel=0.06)
    for dx in (-1.5, 1.5):
        for dy in (-1.5, 1.5):
            b.span(x + dx - 0.1, x + dx + 0.1, y + dy - 0.1, y + dy + 0.1, zb + 0.75, zb + 4.65, 'productMetal', bevel=0.02)
    for s in (-1, 1):
        # Solar arrays folded against the sides for launch.
        b.span(x + s * 1.6 - 0.06, x + s * 1.6 + 0.06, y - 1.3, y + 1.3, zb + 1.0, zb + 4.4, 'aluminium', bevel=0.02)
        b.span(x + s * 1.67 - 0.02, x + s * 1.67 + 0.02, y - 1.2, y + 1.2, zb + 1.1, zb + 4.3, 'productPV', bevel=0)
    b.span(x - 1.55, x + 1.55, y - 1.55, y + 1.55, zb + 4.6, zb + 4.75, 'whitePaint', bevel=0.03)
    b.cyl(0.12, 0.6, (x + 0.8, y + 0.8, zb + 4.75), 'galvanised', segs=10)
    dish = Node(f'scDish{x:.0f}', b.root, loc=(x - 0.2, y - 0.3, zb + 4.85), rot=(math.radians(-25), 0, 0))
    dish_mesh(b, dish, 1.1, 0.32, segs=28, thickness=0.05)
    b.cyl(0.05, 0.6, (0, 0, 0.1), 'galvanised', segs=8, node=dish)


def gantry(b, node, span_x0, span_x1, h):
    """A yellow gantry crane: A-frame legs on bogies, a box-girder bridge, a hoist trolley and hook."""
    for x in (span_x0, span_x1):
        b.box((0.8, 3.4, 0.7), (x, 0, PAD + 0.55), 'steelYellow', bevel=0.08, node=node)
        for s in (-1, 1):
            b.cyl(0.32, 0.3, (x - 0.15, s * 1.2, PAD + 0.32), 'steelDark', segs=16, rot=(0, math.pi / 2, 0), uv='keep',
                  node=node)
            b.bar((x, s * 1.3, PAD + 0.9), (x, s * 0.4, h - 0.6), 0.45, 'steelYellow', bevel=0.04, node=node)
        b.bar((x, -1.0, PAD + 4.0), (x, 1.0, PAD + 4.0), 0.25, 'steelYellow', node=node)
    for s in (-1, 1):
        b.span(span_x0 - 0.6, span_x1 + 0.6, s * 0.75 - 0.35, s * 0.75 + 0.35, h - 0.6, h + 0.9, 'steelYellow', bevel=0.06,
               node=node)
    b.span(span_x0 - 0.5, span_x1 + 0.5, -1.1, 1.1, h + 0.9, h + 1.0, 'galvanised', bevel=0, node=node)
    tx = (span_x0 + span_x1) / 2 - 2.0
    b.span(tx - 1.2, tx + 1.2, -1.3, 1.3, h + 1.0, h + 2.2, 'steelYellow', bevel=0.08, node=node)
    b.cyl(0.55, 1.8, (tx - 0.9, 0, h + 1.6), 'steelDark', segs=20, rot=(0, math.pi / 2, 0), uv='keep', node=node)
    for s in (-0.2, 0.2):
        b.bar((tx + s, 0, h - 0.6), (tx + s, 0, PAD + 7.0), 0.05, 'steelDark', round_=True, segs=6, node=node)
    b.box((0.8, 0.5, 0.9), (tx, 0, PAD + 6.6), 'steelYellow', bevel=0.08, node=node)
    b.torus(0.28, 0.08, (tx, 0, PAD + 5.8), 'steelDark', rot=(math.pi / 2, 0, 0), segs=16, ring_segs=6, node=node)


def assembly_hall(b):
    P.pad(b)
    P.slab(b, -14.6, 14.6, -14.6, -1.6, 'concreteDark', t=0.02)
    x0, x1, y0, y1 = -11.5, 7.0, -1.5, 12.8
    zr, ze = P.gable_hall(b, x0, x1, y0, y1, eave=18.5, pitch=6, wall='cladWhite', roof='cladRoof', skylights=3,
                          trim='steelGrey')
    # Blue band below the eaves.
    for face, p, a0, a1 in (('-y', y0, x0, x1), ('+x', x1, y0, y1), ('+y', y1, x0, x1), ('-x', x0, y0, y1)):
        P.fbox(b, face, p, (a0 + a1) / 2, 0.05, PAD + 16.6, a1 - a0 + 0.1, 0.1, 1.6, 'cladBlue', bevel=0.02)
    # The big door, open: a dark opening, door leaves slid aside, a track beam over it.
    dx, dw, dh = -2.5, 11.0, 15.0
    P.fbox(b, '-y', y0, dx, 0.02, PAD + dh / 2, dw, 0.04, dh, 'interior', bevel=0)
    P.fbox(b, '-y', y0, dx, 0.25, PAD + dh + 0.5, dw + 7.0, 0.5, 1.0, 'steelGrey', bevel=0.05)
    for s in (-1, 1):
        P.fbox(b, '-y', y0, dx + s * (dw / 2 + 0.25), 0.2, PAD + dh / 2, 0.5, 0.4, dh, 'steelGrey', bevel=0.04)
        P.fbox(b, '-y', y0, dx + s * (dw / 2 + 2.9), 0.55, PAD + dh / 2 + 0.05, 5.2, 0.22, dh - 0.1, 'cladWhite', bevel=0.05)
        for z in (PAD + 5.0, PAD + 10.0):
            P.fbox(b, '-y', y0, dx + s * (dw / 2 + 2.9), 0.7, z, 5.2, 0.1, 0.12, 'steelGrey', bevel=0)
    P.door(b, '-y', y0, -9.8)
    for a in (-1.5, 3.0):
        P.window(b, '+x', x1, a, PAD + 13.5, 3.0, 1.4, mullions=3)
    for a in (-8.0,):
        P.window(b, '-y', y0, a, PAD + 13.5, 3.0, 1.4, mullions=3)
    P.wall_lamp(b, '-y', y0, dx - 6.0, PAD + 15.0)
    P.wall_lamp(b, '-y', y0, dx + 6.0, PAD + 15.0)
    # A Spacecraft on its stand, rolled out in front of the door.
    spacecraft(b, dx, y0 - 4.5, PAD + 0.6)
    # Clean-room annex on +x, with two air-filter fans on its roof.
    ax0, ax1, ay0, ay1 = 7.0, 14.2, 1.0, 10.5
    roof = P.flat_block(b, ax0, ax1, ay0, ay1, 8.0, wall='plasterWhite')
    for a in (3.0, 8.0):
        P.window(b, '+x', ax1, a, PAD + 4.0, 2.4, 1.4, mullions=2)
    P.door(b, '-y', ay0, 10.6)
    for y in (3.5, 7.8):
        b.lathe([(1.5, 0), (1.5, 0.9), (1.3, 0.9), (1.3, 0.25), (0, 0.25)], (10.6, y, roof), 'galvanised', segs=32, smooth=30)
        fan = Node(f'filterFan{y:.0f}', b.root, loc=(10.6, y, roof + 0.6), role='spinY', speed=3.0)
        b.cyl(0.2, 0.2, (0, 0, -0.1), 'steelDark', segs=12, node=fan)
        for k in range(4):
            a = k / 4 * math.tau
            b.box((1.0, 0.32, 0.04), (math.cos(a) * 0.7, math.sin(a) * 0.7, 0), 'steelDark', rot=(0.35, 0, a), bevel=0.01,
                  node=fan)
    # Gantry crane over the yard: rails along y and a bridge that runs back and forth ('shuttle' along game z).
    gx0, gx1 = -13.2, 12.6
    for x in (gx0, gx1):
        b.span(x - 0.15, x + 0.15, -14.4, -2.4, PAD, PAD + 0.18, 'galvanised', bevel=0)
    base = 8.3
    g = Node('gantry', b.root, loc=(0, -base, 0), role='shuttle', base=base, range=3.3)
    gantry(b, g, gx0, gx1, 13.5)
    P.lamp_post(b, 13.6, -13.6, h=9, angle=math.radians(135))


# ---------------------------------------------------------------------------------------------
# HQ
# ---------------------------------------------------------------------------------------------

def hq(b):
    P.pad(b)
    x0, x1, y0, y1 = -13.0, 4.5, -4.5, 8.0
    roof = P.flat_block(b, x0, x1, y0, y1, 12.0, wall='plasterGrey', parapet=1.0)
    # Curtain wall: three storeys of glazing with spandrel bands, on the front and the +x side.
    for zf in (PAD + 2.0, PAD + 5.8, PAD + 9.6):
        P.window_band(b, '-y', y0, x0 + 0.6, x1 - 0.6, zf, 2.6, pitch=1.6)
        P.window_band(b, '+x', x1, y0 + 0.6, y1 - 0.6, zf, 2.6, pitch=1.6)
        P.window_band(b, '-x', x0, y0 + 0.6, y1 - 0.6, zf, 2.6, pitch=1.6)
    # The tower at the back with a lit top floor and a radio mast.
    tx0, tx1, ty0, ty1 = -1.0, 6.0, 6.5, 13.5
    b.span(tx0, tx1, ty0, ty1, PAD, PAD + 20.0, 'plasterWhite', bevel=0.08)
    for zf in P.frange(PAD + 2.0, PAD + 18.0, 3.4):
        lit = zf > PAD + 17
        P.window_band(b, '-y', ty0, tx0 + 0.5, tx1 - 0.5, zf, 2.4, pitch=1.4, glass='windowLit' if lit else 'glass')
        P.window_band(b, '+x', tx1, ty0 + 0.5, ty1 - 0.5, zf, 2.4, pitch=1.4, glass='windowLit' if lit else 'glass')
    b.span(tx0 - 0.1, tx1 + 0.1, ty0 - 0.1, ty1 + 0.1, PAD + 20.0, PAD + 21.0, 'aluminium', bevel=0.05)
    mx, my = (tx0 + tx1) / 2, (ty0 + ty1) / 2
    b.cyl(0.18, 7.0, (mx, my, PAD + 21.0), 'galvanised', segs=12, r2=0.06)
    b.sphere(0.2, (mx, my, PAD + 28.1), 'beacon', segs=12)
    for z in (PAD + 23.0, PAD + 25.0):
        b.bar((mx - 0.8, my, z), (mx + 0.8, my, z), 0.05, 'galvanised', round_=True)
    P.hvac(b, -9.0, 4.0, roof, w=3.0, d=1.8)
    P.hvac(b, -5.0, 4.0, roof, w=3.0, d=1.8)
    # Entrance: glazed doors, a cantilevered canopy, and a board for the Company logo (the logo is drawn by the game).
    ex = -4.0
    P.door(b, '-y', y0, ex - 0.6, w=1.2, h=2.6, glazed=True, canopy=False, step=False)
    P.door(b, '-y', y0, ex + 0.6, w=1.2, h=2.6, glazed=True, canopy=False, step=False)
    b.span(ex - 4.0, ex + 4.0, y0 - 4.0, y0, PAD + 3.6, PAD + 3.95, 'aluminium', bevel=0.06)
    for s in (-1, 1):
        b.cyl(0.14, 3.6, (ex + s * 3.6, y0 - 3.6, PAD), 'aluminium', segs=16)
    for k in range(4):
        b.box((0.08, 0.08, 0.05), (ex - 2.4 + k * 1.6, y0 - 2.0, PAD + 3.57), 'lampLit', bevel=0)
    b.span(ex - 4.2, ex + 4.2, y0 - 4.4, y0, PAD, PAD + 0.12, 'concrete', bevel=0.03)
    sx, sy, sz = ANCHORS['hq.sign']
    b.span(sx - 1.7, sx + 1.7, y0 - 0.12, y0 + 0.01, sz - 1.7, sz + 1.7, 'steelBlue', bevel=0.04)
    # Flag pole (the flag itself is made by the game, with the Company logo on it).
    fx, fy, fz = ANCHORS['hq.flag']
    b.cyl(0.6, 0.3, (fx, fy, PAD), 'concrete', segs=24, bevel=0.04)
    b.cyl(0.1, fz - PAD - 0.3, (fx, fy, PAD + 0.3), 'aluminium', segs=16, r2=0.06)
    b.sphere(0.15, (fx, fy, fz), 'aluminium', segs=12)
    # Lawn with paths, hedges and trees in front; car park on the +x side.
    P.slab(b, -14.6, 6.0, -14.6, -8.8, 'grass', t=0.03)
    P.slab(b, ex - 1.8, ex + 1.8, -14.6, y0 - 4.4, 'concrete', t=0.05)
    P.hedge(b, -13.8, -6.6, -8.4, -7.4)
    P.hedge(b, -1.4, 5.6, -8.4, -7.4)
    for (x, y, s) in ((-11.0, -12.0, 1), (2.5, -12.5, 2), (-13.0, 11.5, 3)):
        P.tree(b, x, y, h=8.0, seed=s)
    P.slab(b, 6.6, 14.6, -6.5, 14.6, 'asphalt')
    for y in P.frange(-6.0, 13.0, 2.7):
        P.line(b, (9.0, y), (14.0, y))
    P.line(b, (9.0, -6.0), (9.0, 13.0))
    paints = ['carRed', 'carBlue', 'carSilver', 'carWhite', 'carBlack']
    for i, y in enumerate((-4.65, 0.75, 3.45, 8.85, 11.55)):
        P.car(b, 11.5, y, rot=math.radians(180 if i % 2 else 0), paint=paints[i])
    P.kerb(b, [(6.6, -6.5), (14.6, -6.5)])
    P.lamp_post(b, 13.6, -13.6, angle=math.radians(135))
    P.lamp_post(b, 7.6, 6.0, angle=math.radians(0))
    P.lamp_post(b, -7.5, -13.6, angle=math.radians(90))


# ---------------------------------------------------------------------------------------------
# Ground Station
# ---------------------------------------------------------------------------------------------

def ground_station(b):
    P.pad(b, mat='concreteDark')
    P.slab(b, -14.6, 14.6, -14.6, 14.6, 'dirt', t=0.03)
    cx, cy = -2.0, 2.0
    # Pedestal: a concrete drum with an access door.
    b.cyl(4.2, 0.4, (cx, cy, PAD), 'concrete', segs=48, bevel=0.06)
    b.cyl(3.4, 3.0, (cx, cy, PAD + 0.4), 'concrete', segs=48, bevel=0.06)
    P.door(b, '-y', cy - 3.35, cx, z0=PAD + 0.4, w=1.0, h=2.1, canopy=False, step=False)
    # Azimuth turntable, yoke and the dish: the mount turns slowly to follow a Spacecraft across the sky.
    mount = Node('antenna', b.root, loc=(cx, cy, PAD + 3.4), role='spinY', speed=0.25)
    b.cyl(3.3, 0.7, (0, 0, 0), 'steelGrey', segs=48, bevel=0.06, node=mount)
    b.span(-3.4, 3.4, -1.6, 1.6, 0.7, 1.6, 'whitePaint', bevel=0.1, node=mount)
    for s in (-1, 1):
        b.prism([(-1.4, 0), (1.4, 0), (0.7, 5.4), (-0.7, 5.4)], 0.8, (s * 3.0, 0, 1.6), 'whitePaint', axis='x', bevel=0.08,
                node=mount)
        b.cyl(0.9, 0.9, (s * 3.0, 0, 6.6), 'steelGrey', segs=24, rot=(0, math.pi / 2, 0), uv='keep', node=mount)
    b.span(-3.6, -2.4, -1.0, 1.0, 1.6, 3.4, 'steelGrey', bevel=0.05, node=mount)
    P.ladder(b, 0.0, -1.7, 1.6, 6.0, face='-y', node=mount)
    # Elevation: the dish looks up 40° (its face towards game +z, the start view).
    el = Node('dish', mount, loc=(0, 0, 6.6), rot=(math.radians(50), 0, 0))
    b.cyl(0.55, 5.4, (-2.7, 0, 0), 'steelGrey', segs=20, rot=(0, math.pi / 2, 0), uv='keep', node=el)
    b.cyl(1.4, 1.8, (0, 0, 0.2), 'whitePaint', segs=32, r2=1.0, node=el)
    R, depth = 9.0, 2.6
    z0 = 1.8
    prof = []
    for i in range(13):
        r = R * i / 12
        prof.append((r, z0 + depth * (r / R) ** 2))
    back = [(r, z - 0.18 - 0.25 * (1 - r / R)) for r, z in reversed(prof)]
    b.lathe(prof + [(R + 0.05, z0 + depth + 0.1)] + back, (0, 0, 0), 'whitePaint', segs=64, node=el, smooth=60)
    b.torus(R + 0.05, 0.12, (0, 0, z0 + depth + 0.02), 'whitePaint', segs=64, ring_segs=6, node=el)
    # Back structure: radial trusses.
    for k in range(12):
        a = k / 12 * math.tau
        c, s = math.cos(a), math.sin(a)
        p_in = Vector((c * 1.2, s * 1.2, 1.0))
        p_rim = Vector((c * (R - 0.4), s * (R - 0.4), z0 + depth * ((R - 0.4) / R) ** 2 - 0.3))
        p_mid = Vector((c * R * 0.5, s * R * 0.5, z0 + depth * 0.25 - 0.4))
        b.bar(p_in, p_rim, 0.16, 'steelGrey', node=el)
        b.bar(p_in, p_mid - Vector((0, 0, 0.9)), 0.14, 'steelGrey', node=el)
        b.bar(p_mid - Vector((0, 0, 0.9)), p_rim, 0.14, 'steelGrey', node=el)
    # Feed: four struts from the dish to a subreflector at the focus, and the feed horn in the middle.
    fz = z0 + R * R / (4 * depth) * 0.62
    for k in range(4):
        a = k / 4 * math.tau + math.pi / 4
        p = Vector((math.cos(a) * R * 0.72, math.sin(a) * R * 0.72, z0 + depth * 0.52 + 0.05))
        b.bar(p, (0, 0, fz - 0.4), 0.16, 'whitePaint', round_=True, node=el)
    b.lathe([(0.0, 0.0), (1.1, 0.25), (1.2, 0.3), (0.0, 0.5)], (0, 0, fz - 0.55), 'whitePaint', segs=32, node=el)
    b.cyl(0.55, 2.2, (0, 0, z0 - 0.1), 'whitePaint', segs=24, r2=0.3, node=el)
    # Equipment shelter with a door, a lit window, an air conditioner, a whip antenna and a cable tray.
    hx0, hx1, hy0, hy1 = 7.0, 13.6, -13.4, -8.2
    roof = P.flat_block(b, hx0, hx1, hy0, hy1, 3.4, wall='cladLight', parapet=0.4, roof='gravelRoof')
    P.door(b, '-y', hy0, 8.6, h=2.1)
    P.window(b, '-y', hy0, 11.6, PAD + 1.8, 1.6, 1.0, glass='windowLit', mullions=2)
    P.window(b, '+x', hx1, -10.8, PAD + 1.8, 1.6, 1.0, mullions=2)
    P.fbox(b, '-x', hx0, -10.5, 0.4, PAD + 1.6, 1.0, 0.8, 1.2, 'plastic')
    b.cyl(0.04, 5.0, (12.8, -9.0, roof), 'galvanised', segs=8, r2=0.015)
    b.cyl(0.08, 3.0, (8.0, -9.0, roof), 'galvanised', segs=8)
    for k in range(3):
        b.bar((7.6, -9.0, roof + 1.5 + k * 0.5), (8.4, -9.0, roof + 1.5 + k * 0.5), 0.04, 'galvanised', round_=True)
    b.span(-2.4, 7.0, -10.9, -10.5, PAD, PAD + 0.25, 'galvanised', bevel=0)
    b.span(-2.4, -2.0, -10.9, -1.0, PAD, PAD + 0.25, 'galvanised', bevel=0)
    # Fence round the dish, with a gate on the front.
    r = 12.3
    pts = [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in range(-80, 261, 20)]
    P.fence(b, pts)
    for a in (-80, -100):
        b.cyl(0.07, 2.5, (cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)), PAD), 'galvanised', segs=10)
    P.lamp_post(b, 13.6, -6.0, angle=math.radians(180))
    P.lamp_post(b, -13.6, -13.6, angle=math.radians(45))


# ---------------------------------------------------------------------------------------------
# Tower crane and foundation
# ---------------------------------------------------------------------------------------------

def lattice(b, a, c, w, chord=0.16, lace=0.08, mat='steelYellow', node=None, step=None, tri=False):
    """A lattice boom from a to c: 3 or 4 chords with zig-zag lacing, cross-section w."""
    a, c = Vector(a), Vector(c)
    d = (c - a).normalized()
    up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
    s = d.cross(up).normalized()
    u = s.cross(d).normalized()
    if tri:
        offs = [s * (-w / 2), s * (w / 2), u * (w * 0.87)]
        offs = [o - u * (w * 0.29) for o in offs]
    else:
        offs = [s * sx * w / 2 + u * sz * w / 2 for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    for o in offs:
        b.bar(a + o, c + o, chord, mat, round_=True, segs=8, node=node)
    L = (c - a).length
    n = max(1, round(L / (step or w)))
    for i in range(n):
        p0, p1 = a + d * (L * i / n), a + d * (L * (i + 1) / n)
        for k in range(len(offs)):
            o0, o1 = offs[k], offs[(k + 1) % len(offs)]
            if i % 2 == 0:
                b.bar(p0 + o0, p1 + o1, lace, mat, round_=True, segs=6, node=node)
            else:
                b.bar(p0 + o1, p1 + o0, lace, mat, round_=True, segs=6, node=node)


def crane(b):
    H = 34.0
    b.span(-2.4, 2.4, -2.4, 2.4, -0.6, 1.0, 'concrete', bevel=0.08)
    lattice(b, (0, 0, 1.0), (0, 0, H), 1.8, chord=0.2, lace=0.09, step=1.8)
    jib = Node('jib', b.root, loc=(0, 0, H), role='craneJib', speed=0.35)
    b.cyl(1.3, 0.6, (0, 0, 0), 'steelYellow', segs=32, node=jib)
    b.span(-1.4, 1.4, -1.2, 1.2, 0.6, 1.6, 'steelYellow', bevel=0.06, node=jib)
    # Operator cab on the side, glazed.
    b.span(-0.6, 1.4, -2.6, -1.2, 0.4, 2.6, 'whitePaint', bevel=0.12, node=jib)
    b.span(0.4, 1.45, -2.65, -1.25, 1.2, 2.4, 'glassDark', bevel=0.05, node=jib)
    # Jib (to +x), counter-jib (to -x) with concrete counterweights, apex tower and ties.
    lattice(b, (1.0, 0, 1.4), (24.0, 0, 1.4), 1.3, chord=0.15, lace=0.07, node=jib, step=1.6, tri=True)
    for s in (-1, 1):
        b.bar((-1.0, s * 0.7, 1.3), (-9.0, s * 0.7, 1.3), 0.3, 'steelYellow', h=0.4, node=jib)
    for k in range(4):
        b.span(-8.6 + k * 0.85, -7.85 + k * 0.85, -1.0, 1.0, -0.6, 1.1, 'concrete', bevel=0.05, node=jib)
    b.span(-6.0, -1.5, -0.7, 0.7, 1.15, 1.25, 'galvanised', bevel=0, node=jib)
    b.span(-4.0, -2.4, -0.9, 0.9, 1.25, 2.4, 'steelGrey', bevel=0.06, node=jib)
    for s in (-1, 1):
        b.bar((s * 0.7, 0, 1.6), (0, 0, 7.5), 0.25, 'steelYellow', node=jib)
    b.bar((0, 0, 7.5), (16.0, 0, 2.1), 0.07, 'steelDark', round_=True, segs=6, node=jib)
    b.bar((0, 0, 7.5), (-8.5, 0, 1.5), 0.07, 'steelDark', round_=True, segs=6, node=jib)
    # Trolley, hoist ropes and the hook block with a load.
    t = 15.0
    b.span(t - 0.8, t + 0.8, -0.6, 0.6, 0.7, 1.0, 'steelGrey', bevel=0.04, node=jib)
    for s in (-0.15, 0.15):
        b.bar((t + s, 0, 0.7), (t + s, 0, -14.0), 0.04, 'steelDark', round_=True, segs=4, node=jib)
    b.span(t - 0.4, t + 0.4, -0.35, 0.35, -15.0, -14.0, 'steelYellow', bevel=0.06, node=jib)
    b.torus(0.25, 0.07, (t, 0, -15.3), 'steelDark', rot=(math.pi / 2, 0, 0), segs=16, ring_segs=6, node=jib)
    for s in (-1, 1):
        b.bar((t, 0, -15.5), (t + s * 1.2, 0, -17.0), 0.03, 'steelDark', round_=True, segs=4, node=jib)
    for k in range(4):
        b.bar((t - 1.25, -0.5 + k * 0.33, -17.05), (t + 1.25, -0.5 + k * 0.33, -17.05), 0.22, 'wrapAluminium', h=0.22,
              bevel=0.02, node=jib)
    b.sphere(0.12, (24.0, 0, 2.4), 'beacon', segs=10, node=jib)


def foundation(b):
    """A cast-in-place concrete block under a building, 56 m deep: on a slope it shows as a retaining wall."""
    D = 56.6
    b.span(-15.0, 15.0, -15.0, 15.0, -D, -0.1, 'foundation', bevel=0.0)
    for k in range(-2, 3):
        a = k * 6.0
        for face, p in (('-y', -15.0), ('+y', 15.0)):
            P.fbox(b, face, p, a, 0.01, -D / 2, 0.12, 0.04, D, 'concreteDark', bevel=0)
        for face, p in (('+x', 15.0), ('-x', -15.0)):
            P.fbox(b, face, p, a, 0.01, -D / 2, 0.12, 0.04, D, 'concreteDark', bevel=0)
    # A chamfered coping along the top edge.
    for (x0, x1, y0, y1) in ((-15.15, 15.15, -15.15, -14.6), (-15.15, 15.15, 14.6, 15.15), (-15.15, -14.6, -14.6, 14.6),
                             (14.6, 15.15, -14.6, 14.6)):
        b.span(x0, x1, y0, y1, -0.5, -0.02, 'concreteDark', bevel=0.06)


MODELS = {
    'researchLab': research_lab,
    'assemblyHall': assembly_hall,
    'hq': hq,
    'groundStation': ground_station,
    'crane': crane,
    'foundation': foundation,
}
