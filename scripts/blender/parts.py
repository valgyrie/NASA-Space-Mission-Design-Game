"""
Architectural pieces shared by the buildings: pads, halls, flat-roofed blocks, doors, windows, lamps,
railings, ladders, HVAC units, pallets, cars, trees, fences. Metres; Blender axes (front = -Y and +X).

Faces are named '-y', '+y', '+x', '-x'. A point on a face is given by `along` (x on ±y faces, y on ±x
faces), `out` (distance in front of the wall plane `p`) and z.
"""
import math

from mathutils import Vector

from lib import MAT, Node  # noqa: F401  (Node re-exported for building scripts)

PAD = 0.3  # top of the concrete pad every building stands on


# ---------------------------------------------------------------------------------------------
# Face helpers
# ---------------------------------------------------------------------------------------------

def fpos(face, p, along, out, z):
    if face == '-y':
        return Vector((along, p - out, z))
    if face == '+y':
        return Vector((along, p + out, z))
    if face == '+x':
        return Vector((p + out, along, z))
    return Vector((p - out, along, z))


def fsize(face, w, t, h):
    return (w, t, h) if face in ('-y', '+y') else (t, w, h)


def fbox(b, face, p, along, out, z, w, t, h, mat, bevel=0.02, node=None):
    """A box on a wall face: w along the face, t out of it (centred at `out`), h tall (centred at z)."""
    return b.box(fsize(face, w, t, h), fpos(face, p, along, out, z), mat, bevel=bevel, node=node)


def frot(face):
    """Z rotation that turns something built facing -Y to face `face`."""
    return {'-y': 0.0, '+x': math.pi / 2, '+y': math.pi, '-x': -math.pi / 2}[face]


# ---------------------------------------------------------------------------------------------
# Ground
# ---------------------------------------------------------------------------------------------

def pad(b, x0=-14.8, x1=14.8, y0=-14.8, y1=14.8, mat='concrete', h=PAD, joints=6.0):
    """The slab the building stands on, with a chamfered edge and sawn expansion joints every `joints` metres."""
    b.span(x0, x1, y0, y1, -0.6, h, mat, bevel=0.12, segs=2)
    if joints:
        for x in frange(x0 + joints, x1 - 1.0, joints):
            b.span(x - 0.03, x + 0.03, y0 + 0.1, y1 - 0.1, h - 0.01, h + 0.006, 'concreteDark', bevel=0)
        for y in frange(y0 + joints, y1 - 1.0, joints):
            b.span(x0 + 0.1, x1 - 0.1, y - 0.03, y + 0.03, h - 0.01, h + 0.006, 'concreteDark', bevel=0)


def slab(b, x0, x1, y0, y1, mat, z=PAD, t=0.04):
    """A thin surface on the pad (asphalt, lawn, gravel)."""
    b.span(x0, x1, y0, y1, z - 0.02, z + t, mat, bevel=min(0.02, t / 3), segs=1)


def kerb(b, pts, mat='concreteDark', w=0.25, h=0.15, z=PAD):
    for a, c in zip(pts, pts[1:]):
        b.bar((a[0], a[1], z + h / 2), (c[0], c[1], z + h / 2), w, mat, h=h, bevel=0.03, roll=0)


def line(b, a, c, w=0.12, z=PAD + 0.045):
    """A painted line on asphalt."""
    b.bar((a[0], a[1], z), (c[0], c[1], z), w, 'lineWhite', h=0.01)


# ---------------------------------------------------------------------------------------------
# Building bodies
# ---------------------------------------------------------------------------------------------

def gable_hall(b, x0, x1, y0, y1, eave, pitch=12, wall='cladGrey', roof='cladRoof', trim='steelGrey', z0=PAD,
               plinth=0.9, overhang=0.45, skylights=2, monitor=False, gutters=True, node=None):
    """A portal-frame industrial hall, ridge along X: concrete plinth, clad walls with gable ends, two roof
    slopes with an overhang, ridge cap, barge trims, corner flashings, gutters and downpipes, roof lights.
    Returns (ridge height, eave height) above ground."""
    p = math.radians(pitch)
    yc = (y0 + y1) / 2
    half = (y1 - y0) / 2
    ze = z0 + eave
    zr = ze + half * math.tan(p)
    # Plinth and clad walls with gable ends.
    b.span(x0 - 0.06, x1 + 0.06, y0 - 0.06, y1 + 0.06, z0 - 0.05, z0 + plinth, 'concrete', bevel=0.05, node=node)
    outline = [(y0, z0 + plinth), (y1, z0 + plinth), (y1, ze), (yc, zr), (y0, ze)]
    b.prism(outline, x1 - x0, ((x0 + x1) / 2, 0, 0), wall, axis='x', bevel=0.06, segs=2, node=node)
    # Roof slopes.
    hw = half + overhang
    slope = hw / math.cos(p)
    zedge = ze - overhang * math.tan(p)
    length = x1 - x0 + 2 * overhang
    for side in (-1, 1):
        cy = yc + side * hw / 2
        cz = (zedge + zr) / 2 + 0.12 / math.cos(p)
        b.box((length, slope, 0.18), ((x0 + x1) / 2, cy, cz), roof, rot=(-side * p, 0, 0), bevel=0.03, node=node)
        # Barge trims along the gable edges.
        for x in (x0 - overhang, x1 + overhang):
            b.box((0.12, slope, 0.32), (x, cy, cz), trim, rot=(-side * p, 0, 0), bevel=0.02, node=node)
        # Translucent roof lights.
        if skylights:
            n = skylights
            for i in range(n):
                xx = x0 + (i + 0.5) * (x1 - x0) / n
                sl = slope * 0.55
                b.box((1.4, sl, 0.06), (xx, yc + side * hw * 0.5, cz + 0.11 / math.cos(p)), 'skylight',
                      rot=(-side * p, 0, 0), bevel=0.02, node=node)
        if gutters:
            gy = yc + side * (hw + 0.12)
            gz = zedge + 0.02
            b.bar((x0 - overhang, gy, gz), (x1 + overhang, gy, gz), 0.26, trim, h=0.22, bevel=0.04)
            for x in (x0 + 0.3, x1 - 0.3):
                b.bar((x, yc + side * (half + 0.18), z0 + 0.2), (x, yc + side * (half + 0.18), gz), 0.13, trim,
                      round_=True, node=node)
    # Ridge cap.
    b.bar((x0 - overhang, yc, zr + 0.18), (x1 + overhang, yc, zr + 0.18), 0.5, trim, h=0.18, bevel=0.05, node=node)
    if monitor:
        # A raised ventilator lantern along the ridge, with louvred sides and its own little roof.
        mx0, mx1 = x0 + (x1 - x0) * 0.12, x1 - (x1 - x0) * 0.12
        b.span(mx0, mx1, yc - 1.3, yc + 1.3, zr - 0.3, zr + 1.3, 'steelGrey', bevel=0.04, node=node)
        for x in frange(mx0 + 0.4, mx1 - 0.2, 0.45):
            for side in (-1, 1):
                b.box((0.08, 0.2, 1.0), (x, yc + side * 1.33, zr + 0.65), 'steelDark', rot=(side * 0.5, 0, 0), bevel=0)
        q = math.radians(18)
        for side in (-1, 1):
            b.box((mx1 - mx0 + 0.6, 1.8 / math.cos(q), 0.14), ((mx0 + mx1) / 2, yc + side * 0.8, zr + 1.55), roof,
                  rot=(-side * q, 0, 0), bevel=0.03, node=node)
    # Corner flashings.
    for x in (x0 - 0.02, x1 + 0.02):
        for y in (y0 - 0.02, y1 + 0.02):
            b.span(x - 0.12, x + 0.12, y - 0.12, y + 0.12, z0 + plinth, ze, trim, bevel=0.03, node=node)
    return zr, ze


def flat_block(b, x0, x1, y0, y1, h, wall='plasterWhite', z0=PAD, parapet=0.9, coping='aluminium',
               roof='gravelRoof', plinth='concreteDark', node=None):
    """A flat-roofed block with a parapet, metal coping and a gravel roof. Returns the roof surface height."""
    top = z0 + h
    b.span(x0 - 0.05, x1 + 0.05, y0 - 0.05, y1 + 0.05, z0 - 0.05, z0 + 0.5, plinth, bevel=0.04, node=node)
    b.span(x0, x1, y0, y1, z0 + 0.5, top - parapet, wall, bevel=0.06, node=node)
    t = 0.35
    for (a0, a1, c0, c1) in ((x0, x1, y0, y0 + t), (x0, x1, y1 - t, y1), (x0, x0 + t, y0 + t, y1 - t),
                             (x1 - t, x1, y0 + t, y1 - t)):
        b.span(a0, a1, c0, c1, top - parapet - 0.01, top, wall, bevel=0.05, node=node)
    roof_z = top - parapet + 0.12
    b.span(x0 + t, x1 - t, y0 + t, y1 - t, top - parapet - 0.2, roof_z, roof, bevel=0, node=node)
    # Coping caps on the parapet.
    for (a0, a1, c0, c1) in ((x0 - 0.06, x1 + 0.06, y0 - 0.06, y0 + t + 0.04), (x0 - 0.06, x1 + 0.06, y1 - t - 0.04, y1 + 0.06),
                             (x0 - 0.06, x0 + t + 0.04, y0 + t, y1 - t), (x1 - t - 0.04, x1 + 0.06, y0 + t, y1 - t)):
        b.span(a0, a1, c0, c1, top, top + 0.1, coping, bevel=0.03, node=node)
    return roof_z


def frange(a, b, step):
    out = []
    x = a
    while x <= b + 1e-6:
        out.append(x)
        x += step
    return out


# ---------------------------------------------------------------------------------------------
# Openings
# ---------------------------------------------------------------------------------------------

def window(b, face, p, along, z, w, h, frame='frame', glass='glass', mullions=1, transoms=0, sill=True, node=None):
    """A framed window on a wall face, centred at (along, z)."""
    fbox(b, face, p, along, 0.03, z, w - 0.1, 0.06, h - 0.1, glass, bevel=0, node=node)
    ft = 0.09
    for a in (along - w / 2 + ft / 2, along + w / 2 - ft / 2):
        fbox(b, face, p, a, 0.07, z, ft, 0.14, h, frame, bevel=0, node=node)
    for zz in (z - h / 2 + ft / 2, z + h / 2 - ft / 2):
        fbox(b, face, p, along, 0.07, zz, w, 0.14, ft, frame, bevel=0, node=node)
    for i in range(1, mullions):
        a = along - w / 2 + i * w / mullions
        fbox(b, face, p, a, 0.06, z, 0.06, 0.1, h - 0.1, frame, bevel=0, node=node)
    for i in range(1, transoms + 1):
        zz = z - h / 2 + i * h / (transoms + 1)
        fbox(b, face, p, along, 0.06, zz, w - 0.1, 0.1, 0.06, frame, bevel=0, node=node)
    if sill:
        fbox(b, face, p, along, 0.12, z - h / 2 - 0.05, w + 0.15, 0.25, 0.08, 'frame', bevel=0, node=node)


def window_band(b, face, p, a0, a1, z, h, pitch=1.5, frame='frame', glass='glass', node=None):
    """A continuous ribbon of glazing with mullions every `pitch` metres."""
    w = a1 - a0
    c = (a0 + a1) / 2
    fbox(b, face, p, c, 0.03, z, w, 0.06, h, glass, bevel=0, node=node)
    for zz in (z - h / 2, z + h / 2):
        fbox(b, face, p, c, 0.08, zz, w + 0.1, 0.16, 0.12, frame, bevel=0, node=node)
    n = max(1, round(w / pitch))
    for i in range(n + 1):
        fbox(b, face, p, a0 + i * w / n, 0.08, z, 0.08, 0.14, h, frame, bevel=0, node=node)


def rollup_door(b, face, p, along, w, h, z0=PAD, mat='shutter', bollards=True, node=None):
    """A roll-up door: slatted shutter, steel jambs, coil box over it, yellow bollards in front."""
    fbox(b, face, p, along, 0.05, z0 + h / 2, w, 0.1, h, mat, bevel=0.01, node=node)
    for s in (-1, 1):
        fbox(b, face, p, along + s * (w / 2 + 0.15), 0.12, z0 + (h + 0.5) / 2, 0.3, 0.24, h + 0.5, 'steelGrey',
             bevel=0.03, node=node)
    fbox(b, face, p, along, 0.3, z0 + h + 0.35, w + 0.6, 0.6, 0.7, 'steelGrey', bevel=0.06, node=node)
    fbox(b, face, p, along, 0.05, z0 + 0.1, w, 0.14, 0.2, 'rubber', bevel=0.02, node=node)
    if bollards:
        for s in (-1, 1):
            c = fpos(face, p, along + s * (w / 2 + 0.6), 0.7, z0)
            b.cyl(0.11, 1.1, c, 'steelYellow', segs=16, bevel=0.04, node=node)
            b.cyl(0.115, 0.12, c + Vector((0, 0, 0.75)), 'hazard', segs=16, node=node)


def door(b, face, p, along, z0=PAD, w=1.0, h=2.2, leaf='steelGrey', canopy=True, step=True, glazed=False, node=None):
    """A personnel door with frame, handle, small canopy and a concrete step."""
    fbox(b, face, p, along, 0.04, z0 + h / 2, w, 0.08, h, 'glass' if glazed else leaf, bevel=0.01, node=node)
    for s in (-1, 1):
        fbox(b, face, p, along + s * (w / 2 + 0.05), 0.08, z0 + (h + 0.1) / 2, 0.1, 0.16, h + 0.1, 'frame', bevel=0.01, node=node)
    fbox(b, face, p, along, 0.08, z0 + h + 0.05, w + 0.2, 0.16, 0.1, 'frame', bevel=0.01, node=node)
    fbox(b, face, p, along + w * 0.35, 0.12, z0 + 1.05, 0.04, 0.1, 0.18, 'aluminium', bevel=0, node=node)
    if canopy:
        fbox(b, face, p, along, 0.6, z0 + h + 0.45, w + 0.9, 1.2, 0.12, 'aluminium', bevel=0.03, node=node)
        b.box((0.06, 0.06, 0.06), fpos(face, p, along, 1.15, z0 + h + 0.36), 'lampLit', bevel=0, node=node)
    if step:
        fbox(b, face, p, along, 0.5, z0 + 0.09, w + 0.6, 1.0, 0.18, 'concreteDark', bevel=0.03, node=node)


def vent_louvre(b, face, p, along, z, w=1.2, h=0.9, node=None):
    fbox(b, face, p, along, 0.05, z, w, 0.1, h, 'steelGrey', bevel=0.02, node=node)
    for zz in frange(z - h / 2 + 0.12, z + h / 2 - 0.1, 0.13):
        fbox(b, face, p, along, 0.12, zz, w - 0.12, 0.05, 0.05, 'steelDark', bevel=0, node=node)


def wall_lamp(b, face, p, along, z, node=None):
    fbox(b, face, p, along, 0.15, z, 0.35, 0.3, 0.18, 'steelDark', bevel=0.03, node=node)
    fbox(b, face, p, along, 0.17, z - 0.1, 0.28, 0.22, 0.03, 'lampLit', bevel=0, node=node)


# ---------------------------------------------------------------------------------------------
# Site furniture
# ---------------------------------------------------------------------------------------------

def lamp_post(b, x, y, h=8.0, angle=0.0, z0=PAD, node=None):
    """A street light: base plate, tapered galvanised pole, arm and a flat LED head lit from below."""
    b.cyl(0.25, 0.08, (x, y, z0), 'galvanised', segs=16, node=node)
    b.cyl(0.11, h, (x, y, z0), 'galvanised', segs=16, r2=0.06, node=node)
    d = Vector((math.cos(angle), math.sin(angle), 0))
    top = Vector((x, y, z0 + h))
    b.bar(top - d * 0.05, top + d * 1.4 + Vector((0, 0, 0.15)), 0.08, 'galvanised', round_=True, node=node)
    head = top + d * 1.65 + Vector((0, 0, 0.12))
    b.box((0.9, 0.38, 0.14), head, 'steelDark', rot=(0, 0, angle), bevel=0.05, node=node)
    b.box((0.7, 0.28, 0.03), head - Vector((0, 0, 0.08)), 'lampLit', rot=(0, 0, angle), bevel=0, node=node)


def railing(b, pts, h=1.1, mat='steelYellow', post=1.6, node=None):
    """Hand-rail along a polyline of (x, y, z): posts, top rail and knee rail."""
    pts = [Vector(p) for p in pts]
    for a, c in zip(pts, pts[1:]):
        b.bar(a + Vector((0, 0, h)), c + Vector((0, 0, h)), 0.05, mat, round_=True, node=node)
        b.bar(a + Vector((0, 0, h * 0.5)), c + Vector((0, 0, h * 0.5)), 0.04, mat, round_=True, node=node)
        n = max(1, round((c - a).length / post))
        for i in range(n + 1):
            q = a.lerp(c, i / n)
            b.bar(q, q + Vector((0, 0, h)), 0.05, mat, round_=True, segs=6, node=node)
        b.bar(a + Vector((0, 0, 0.05)), c + Vector((0, 0, 0.05)), 0.1, mat, h=0.02)


def ladder(b, x, y, z0, z1, face='-y', w=0.5, mat='galvanised', cage=False, node=None):
    """A fixed steel ladder standing off a wall that faces `face`."""
    side = Vector((1, 0, 0)) if face in ('-y', '+y') else Vector((0, 1, 0))
    base = Vector((x, y, z0))
    for s in (-1, 1):
        b.bar(base + side * s * w / 2, base + side * s * w / 2 + Vector((0, 0, z1 - z0)), 0.06, mat, h=0.03, node=node)
    for z in frange(z0 + 0.3, z1 - 0.1, 0.3):
        b.bar(Vector((x, y, z)) - side * w / 2, Vector((x, y, z)) + side * w / 2, 0.035, mat, round_=True, segs=6, node=node)
    if cage:
        out = {'-y': Vector((0, -1, 0)), '+y': Vector((0, 1, 0)), '+x': Vector((1, 0, 0)), '-x': Vector((-1, 0, 0))}[face]
        for z in frange(z0 + 2.4, z1, 1.2):
            pts =[Vector((x, y, z)) + side * 0.4 * math.cos(t) + out * (0.75 * math.sin(t)) for t in [i * math.pi / 6 for i in range(7)]]
            for p0, p1 in zip(pts, pts[1:]):
                b.bar(p0, p1, 0.04, mat, h=0.015, node=node)
        for s in (-1, 0, 1):
            off = side * 0.4 * s + out * (0.75 if s == 0 else 0.0)
            b.bar(Vector((x, y, z0 + 2.4)) + off, Vector((x, y, z1)) + off, 0.04, mat, h=0.015, node=node)


def ladder_line(b, a, c, side, w=0.5, mat='galvanised', node=None):
    """A ladder between two points (it may lean); `side` is the horizontal direction of its rungs."""
    a, c, side = Vector(a), Vector(c), Vector(side).normalized()
    for s in (-1, 1):
        b.bar(a + side * s * w / 2, c + side * s * w / 2, 0.06, mat, h=0.03, node=node)
    n = int((c - a).length / 0.3)
    for i in range(1, n):
        q = a.lerp(c, i / n)
        b.bar(q - side * w / 2, q + side * w / 2, 0.035, mat, round_=True, segs=6, node=node)


def i_beam(b, a, c, h=0.4, w=0.25, mat='steelDark', node=None):
    """An I-section member from a to c (web vertical when the member is horizontal)."""
    t = 0.03
    poly = [(-w / 2, 0), (w / 2, 0), (w / 2, t), (t / 2, t), (t / 2, h - t), (w / 2, h - t), (w / 2, h), (-w / 2, h),
            (-w / 2, h - t), (-t / 2, h - t), (-t / 2, t), (-w / 2, t)]
    a, c = Vector(a), Vector(c)
    d = c - a
    o = b.prism([(u, v - h / 2) for u, v in poly], d.length, (0, 0, 0), mat, axis='y', node=node)
    q = Vector((0, -1, 0)).rotation_difference(d.normalized())
    from mathutils import Matrix
    o.matrix_basis = Matrix.Translation((a + c) / 2) @ q.to_matrix().to_4x4()
    return o


def hvac(b, x, y, z, w=3.0, d=1.8, h=1.3, fans=2, rot=0.0, node=None):
    """A packaged rooftop air-conditioning unit: cased box, side louvres, round fan guards on top, on rails."""
    for s in (-1, 1):
        b.box((w + 0.4, 0.15, 0.2), (x, y + s * d * 0.35, z + 0.1), 'steelDark', rot=(0, 0, rot), bevel=0.02, node=node)
    b.box((w, d, h), (x, y, z + 0.2 + h / 2), 'plastic', rot=(0, 0, rot), bevel=0.05, node=node)
    c, s_ = math.cos(rot), math.sin(rot)
    for i in range(fans):
        fx = (i + 0.5) * w / fans - w / 2
        px, py = x + fx * c, y + fx * s_
        r = min(w / fans, d) * 0.42
        b.cyl(r, 0.18, (px, py, z + 0.2 + h - 0.02), 'steelGrey', segs=24, node=node)
        b.grid_quad(r * 2, r * 2, (px, py, z + 0.2 + h + 0.165), 'grille', rot=(0, 0, rot), node=node)
    for s in (-1, 1):
        ox, oy = -s_ * s * (d / 2 + 0.02), c * s * (d / 2 + 0.02)
        for k in range(5):
            zz = z + 0.45 + k * (h - 0.5) / 5
            b.box((w * 0.8, 0.04, 0.05), (x + ox, y + oy, zz), 'steelGrey', rot=(0, 0, rot), bevel=0, node=node)


def pallet(b, x, y, z=PAD, w=1.2, d=1.0, rot=0.0, node=None):
    """A Euro pallet: three runners and a slatted deck. Returns the deck top height."""
    c, s = math.cos(rot), math.sin(rot)

    def at(dx, dy, zz):
        return (x + dx * c - dy * s, y + dx * s + dy * c, zz)
    for dy in (-d / 2 + 0.05, 0, d / 2 - 0.05):
        b.box((w, 0.1, 0.1), at(0, dy, z + 0.05), 'woodLight', rot=(0, 0, rot), bevel=0.01, node=node)
    for i in range(5):
        dx = -w / 2 + 0.07 + i * (w - 0.14) / 4
        b.box((0.14, d, 0.025), at(dx, 0, z + 0.115), 'woodLight', rot=(0, 0, rot), bevel=0.005, node=node)
    return z + 0.13


def crate(b, x, y, z, w=1.1, d=0.9, h=0.9, mat='wood', rot=0.0, node=None):
    b.box((w, d, h), (x, y, z + h / 2), mat, rot=(0, 0, rot), bevel=0.04, node=node)


def wrapped_load(b, x, y, wrap, z=PAD, rot=0.0, h=1.1, node=None):
    """A pallet with a shrink-wrapped load in a colour."""
    top = pallet(b, x, y, z, rot=rot, node=node)
    b.box((1.15, 0.95, h), (x, y, top + h / 2), wrap, rot=(0, 0, rot), bevel=0.08, segs=2, node=node)


def drum(b, x, y, z=PAD, mat='steelBlue', node=None):
    b.cyl(0.29, 0.88, (x, y, z), mat, segs=20, bevel=0.03, node=node)
    for zz in (0.29, 0.58):
        b.cyl(0.3, 0.04, (x, y, z + zz), mat, segs=20, node=node)


def _interp(pts, x):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x0 <= x <= x1:
            t = (x - x0) / (x1 - x0)
            t = t * t * (3 - 2 * t)
            return y0 + (y1 - y0) * t
    return pts[0][1] if x < pts[0][0] else pts[-1][1]


def car_body(b, paint, node=None):
    """A saloon body lofted from cross-sections: rounded plan, tumblehome, a glasshouse with tinted windows
    (sloped faces above the waist) and a painted roof. 4.7 m long, front towards +x, on the ground at z = 0."""
    import bmesh
    top = [(-2.36, 0.72), (-2.25, 0.93), (-1.85, 0.99), (-1.2, 1.4), (0.25, 1.43), (0.95, 0.98), (2.15, 0.84),
           (2.36, 0.62)]
    xs = [-2.36, -2.3, -2.15, -1.95, -1.7, -1.45, -1.2, -0.8, -0.4, 0.0, 0.25, 0.5, 0.75, 0.95, 1.3, 1.7, 2.05, 2.25,
          2.36]
    bm = bmesh.new()
    rings = []
    for x in xs:
        zt = _interp(top, x)
        u = abs(x) / 2.36
        hw = 0.89 * (1 - 0.3 * u ** 8)
        zb = 0.32 + 0.06 * u ** 6
        zm = min(0.93, zt - 0.04)
        k = max(0.0, min(1.0, (zt - 0.97) / 0.4))
        hu = hw * (1 - 0.2 * k)
        sec = [(0.0, zb), (hw * 0.9, zb), (hw, zb + 0.14), (hw, zm), (hu, max(zm + 0.01, zt - 0.07)), (hu * 0.8, zt),
               (0.0, zt + 0.01)]
        ring = [bm.verts.new((x, yy, zz)) for yy, zz in sec]
        ring += [bm.verts.new((x, -yy, zz)) for yy, zz in reversed(sec[1:-1])]
        rings.append(ring)
    n = len(rings[0])
    for r0, r1 in zip(rings, rings[1:]):
        for j in range(n):
            bm.faces.new((r0[j], r0[(j + 1) % n], r1[(j + 1) % n], r1[j]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        c = f.calc_center_median()
        f.material_index = 1 if c.z > 0.97 and abs(f.normal.z) < 0.9 else 0
    return b.mesh(bm, [paint, 'glassDark'], (0, 0, 0), (0, 0, 0), node, 0, 2, 'box', smooth=40)


def car(b, x, y, rot=0.0, paint='carSilver', z=PAD, node=None):
    """A saloon car, 4.7 m long, front towards local +x."""
    from mathutils import Matrix
    m = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rot, 4, 'Z')

    def put(o):
        o.matrix_basis = m @ o.matrix_basis
    put(car_body(b, paint, node=node))
    put(b.box((4.5, 1.7, 0.12), (0, 0, 0.3), 'rubber', bevel=0.04, node=node))
    for wx in (-1.45, 1.45):
        for wy in (-0.8, 0.8):
            put(b.cyl(0.33, 0.24, (wx, wy - 0.12, 0.33), 'rubber', segs=20, rot=(math.pi / 2 * (1 if wy < 0 else -1), 0, 0),
                      bevel=0.06, uv='keep', node=node))
            put(b.cyl(0.2, 0.02, (wx, wy + (0.13 if wy > 0 else -0.13), 0.33), 'aluminium', segs=16,
                      rot=(math.pi / 2 * (-1 if wy > 0 else 1), 0, 0), uv='keep', node=node))
    for wy in (-0.6, 0.6):
        put(b.box((0.05, 0.3, 0.12), (2.33, wy, 0.68), 'lampLit', bevel=0.02, node=node))
        put(b.box((0.05, 0.3, 0.1), (-2.36, wy, 0.75), 'beacon', bevel=0.02, node=node))


def shrub_bed(b, x0, x1, y0, y1, seed=0, density=0.35, node=None):
    """A planted bed: bark mulch inside a concrete edging, with low clipped shrubs (no trees: real trees are
    scattered over the land by the game)."""
    import random
    rnd = random.Random(seed)
    b.span(x0, x1, y0, y1, PAD, PAD + 0.08, 'mulch', bevel=0.02, segs=1, node=node)
    for (a0, a1, c0, c1) in ((x0 - 0.12, x1 + 0.12, y0 - 0.12, y0), (x0 - 0.12, x1 + 0.12, y1, y1 + 0.12),
                             (x0 - 0.12, x0, y0, y1), (x1, x1 + 0.12, y0, y1)):
        b.span(a0, a1, c0, c1, PAD, PAD + 0.16, 'concrete', bevel=0.02, segs=1, node=node)
    n = max(2, int((x1 - x0) * (y1 - y0) * density))
    for i in range(n):
        r = rnd.uniform(0.35, 0.7)
        px = rnd.uniform(x0 + r * 0.8, x1 - r * 0.8)
        py = rnd.uniform(y0 + r * 0.8, y1 - r * 0.8)
        b.shrub(r, (px, py, PAD + 0.05), rnd.choice(('hedge', 'shrub', 'shrubDark')), seed=seed * 101 + i, node=node)


def hedge(b, x0, x1, y0, y1, h=1.0, node=None):
    """A clipped hedge: a row of overlapping lumpy shrubs (so its top and sides are not machine-smooth)."""
    long_x = (x1 - x0) >= (y1 - y0)
    length = (x1 - x0) if long_x else (y1 - y0)
    r = min(x1 - x0, y1 - y0) * 0.55
    n = max(2, round(length / (r * 1.25)))
    for i in range(n):
        t = (i + 0.5) / n
        px = x0 + (x1 - x0) * t if long_x else (x0 + x1) / 2
        py = (y0 + y1) / 2 if long_x else y0 + (y1 - y0) * t
        b.shrub(r, (px, py, PAD - r * 0.1), 'hedge' if i % 3 else 'shrub', seed=int(px * 13 + py * 7) + i, node=node)


def fence(b, pts, h=2.2, post=2.5, node=None):
    """A chain-link fence along a closed or open polyline of (x, y): posts, top rail and mesh."""
    pts = [Vector((p[0], p[1], PAD)) for p in pts]
    b.ribbon([tuple(p) for p in pts], h - 0.05, 'fence', node=node)
    for a, c in zip(pts, pts[1:]):
        b.bar(a + Vector((0, 0, h)), c + Vector((0, 0, h)), 0.05, 'galvanised', round_=True, segs=6, node=node)
        n = max(1, round((c - a).length / post))
        for i in range(n):
            q = a.lerp(c, i / n)
            b.cyl(0.04, h + 0.1, q, 'galvanised', segs=8, node=node)
    b.cyl(0.04, h + 0.1, pts[-1], 'galvanised', segs=8, node=node)


def sign_panel(b, face, p, along, z, w=3.0, h=0.9, mat='steelBlue', node=None):
    """A blank fascia sign panel (no text or logos)."""
    fbox(b, face, p, along, 0.06, z, w, 0.12, h, mat, bevel=0.03, node=node)
    fbox(b, face, p, along, 0.13, z, w - 0.2, 0.02, h - 0.2, 'whitePaint', bevel=0, node=node)
