"""
Shared tools for the building models: textures, materials, a small scene graph of parts, mesh
primitives, and the step that turns parts into joined, bevelled, UV-mapped meshes for glTF.

Units are metres. Blender is Z-up; the glTF exporter turns that into Y-up, so in the game
  game +x = Blender +x,  game +y = Blender +z,  game +z = Blender -y.
Front facades therefore face Blender -Y and +X (the sides the game's start camera sees).
"""
import math
import os
import random
import urllib.request

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
ART = os.path.join(ROOT, '.leap', 'art-src', 'buildings')
TEX_SRC = os.path.join(ART, 'tex')
TEX_OUT = os.path.join(ART, 'tex_out')

# ---------------------------------------------------------------------------------------------
# Textures
# ---------------------------------------------------------------------------------------------

# Poly Haven sets (CC0). key: (asset id, size of colour and normal maps, colour mode, contrast, gain)
#   'grey' turns the colour map into a neutral detail map that materials tint with baseColorFactor.
PH_SETS = {
    'clad': ('box_profile_metal_sheet', 1024, 'grey', 0.8, 1.0),
    'concrete': ('concrete_floor_02', 1024, 'grey', 0.7, 1.0),
    'brick': ('red_brick_03', 1024, 'keep', 1.0, 1.1),
    'asphalt': ('asphalt_02', 512, 'keep', 1.0, 1.0),
    'shutter': ('painted_metal_shutter', 512, 'grey', 0.8, 1.0),
    'plaster': ('painted_plaster_wall', 512, 'grey', 0.6, 1.0),
    'gravel': ('gravel_floor', 512, 'grey', 1.0, 1.0),
}


def fetch_textures():
    """Download the Poly Haven maps we use (1k JPG) into .leap/art-src/buildings/tex if missing."""
    os.makedirs(TEX_SRC, exist_ok=True)
    for asset, *_ in PH_SETS.values():
        for kind in ('diff', 'nor_gl', 'arm'):
            name = f'{asset}_{kind}_1k.jpg'
            path = os.path.join(TEX_SRC, name)
            if os.path.exists(path) and os.path.getsize(path) > 0:
                continue
            url = f'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/{asset}/{name}'
            print('download', url)
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (texture fetch)'})
            with urllib.request.urlopen(req) as r, open(path, 'wb') as f:
                f.write(r.read())


def _pixels(img):
    a = np.empty(len(img.pixels), dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(img.size[1], img.size[0], 4)


def _save(arr, name, quality=82, alpha=False):
    """Write an RGBA float array as JPG (or PNG with alpha) into TEX_OUT; returns the path."""
    h, w = arr.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=alpha)
    img.pixels.foreach_set(np.ascontiguousarray(arr, dtype=np.float32).ravel())
    ext = 'png' if alpha else 'jpg'
    path = os.path.join(TEX_OUT, f'{name}.{ext}')
    img.file_format = 'PNG' if alpha else 'JPEG'
    img.filepath_raw = path
    img.save(filepath=path, quality=quality)
    bpy.data.images.remove(img)
    return path


def _load_scaled(path, size):
    img = bpy.data.images.load(path)
    img.colorspace_settings.name = 'Non-Color'
    if img.size[0] != size:
        img.scale(size, size)
    a = _pixels(img).copy()
    bpy.data.images.remove(img)
    return a


def prepare_textures():
    """Resize and re-encode the source maps; make the procedural ones. Returns {key: {map: path}}."""
    os.makedirs(TEX_OUT, exist_ok=True)
    out = {}
    for key, (asset, size, mode, contrast, gain) in PH_SETS.items():
        maps = {}
        diff = _load_scaled(os.path.join(TEX_SRC, f'{asset}_diff_1k.jpg'), size)
        if mode == 'grey':
            lum = diff[..., 0] * 0.2126 + diff[..., 1] * 0.7152 + diff[..., 2] * 0.0722
            lum = 0.82 * (1 + (lum / lum.mean() - 1) * contrast)
            diff[..., 0] = diff[..., 1] = diff[..., 2] = np.clip(lum, 0, 1)
        else:
            diff[..., :3] = np.clip(diff[..., :3] * gain, 0, 1)
        diff[..., 3] = 1
        maps['col'] = _save(diff, f'{key}_col')
        maps['nor'] = _save(_load_scaled(os.path.join(TEX_SRC, f'{asset}_nor_gl_1k.jpg'), size), f'{key}_nor', 85)
        maps['arm'] = _save(_load_scaled(os.path.join(TEX_SRC, f'{asset}_arm_1k.jpg'), 512), f'{key}_arm', 85)
        out[key] = maps
    out['pv'] = {'col': _pv_texture()}
    out['fence'] = {'col': _fence_texture()}
    out['grille'] = {'col': _grille_texture()}
    return out


def _pv_texture():
    """One 60-cell PV module (6 × 10 cells), 1 m × 1.65 m: dark cells, silver busbars and gaps, a frame."""
    w, h = 256, 424
    a = np.zeros((h, w, 4), dtype=np.float32)
    a[..., 3] = 1
    ys, xs = np.mgrid[0:h, 0:w]
    rng = np.random.default_rng(3)
    cell = 0.13 + rng.normal(0, 0.012, (h, w))
    a[..., 0] = a[..., 1] = a[..., 2] = cell
    fx = (xs - 6) / ((w - 12) / 6)
    fy = (ys - 6) / ((h - 12) / 10)
    gap = (np.abs(fx - np.round(fx)) * ((w - 12) / 6) < 1.2) | (np.abs(fy - np.round(fy)) * ((h - 12) / 10) < 1.2)
    bus = np.zeros_like(gap)
    for k in (0.25, 0.5, 0.75):
        bus |= np.abs((fx % 1) - k) * ((w - 12) / 6) < 0.6
    a[gap, :3] = 0.75
    a[bus & ~gap, :3] = 0.45
    frame = (xs < 6) | (xs >= w - 6) | (ys < 6) | (ys >= h - 6)
    a[frame, :3] = 0.8
    return _save(a, 'pv_col', 88)


def _fence_texture():
    """Chain-link mesh with alpha: galvanised wire diamonds, 128 px per 0.5 m."""
    n = 128
    a = np.zeros((n, n, 4), dtype=np.float32)
    ys, xs = np.mgrid[0:n, 0:n] / n * 8
    d1 = np.abs(((xs + ys) % 1) - 0.5)
    d2 = np.abs(((xs - ys) % 1) - 0.5)
    wire = (d1 > 0.42) | (d2 > 0.42)
    a[..., :3] = 0.62
    a[..., 3] = wire.astype(np.float32)
    return _save(a, 'fence_col', alpha=True)


def _grille_texture():
    """A round fan guard seen from above: concentric rings and spokes on a dark ground, for HVAC fans."""
    n = 128
    ys, xs = (np.mgrid[0:n, 0:n] + 0.5) / n * 2 - 1
    r = np.hypot(xs, ys)
    ang = np.arctan2(ys, xs)
    a = np.zeros((n, n, 4), dtype=np.float32)
    v = np.full((n, n), 0.04, dtype=np.float32)
    rings = (np.abs((r * 9) % 1 - 0.5) > 0.38) & (r < 0.97)
    spokes = (np.abs(((ang / (2 * math.pi) * 8) % 1) - 0.5) > 0.45) & (r < 0.97)
    hub = r < 0.16
    v[rings | spokes] = 0.55
    v[hub] = 0.3
    v[r >= 0.97] = 0.5
    a[..., 0] = a[..., 1] = a[..., 2] = v
    a[..., 3] = 1
    return _save(a, 'grille_col', 88)


# ---------------------------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------------------------

MAT = {}  # name -> bpy material
TILE = {}  # name -> metres per texture repeat (box mapping)


def _image(path, colour):
    img = bpy.data.images.load(path, check_existing=True)
    img.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
    return img


def _occlusion_group():
    g = bpy.data.node_groups.get('glTF Material Output')
    if not g:
        g = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
        g.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    return g


def material(name, colour=(0.8, 0.8, 0.8), rough=0.6, metal=0.0, tex=None, tile=2.0, emit=None, strength=1.0,
             alpha_clip=False, normal_strength=1.0):
    """A glTF-friendly Principled material. `tex` is a key of the prepared texture sets; `colour` tints it."""
    m = bpy.data.materials.new(name)
    m.use_backface_culling = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    bsdf = N['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    col = (*colour, 1.0)
    maps = TEXTURES.get(tex, {}) if tex else {}
    if 'col' in maps:
        im = N.new('ShaderNodeTexImage')
        im.image = _image(maps['col'], True)
        if colour != (1.0, 1.0, 1.0):
            mix = N.new('ShaderNodeMix')
            mix.data_type = 'RGBA'
            mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1.0
            mix.inputs['B'].default_value = col
            L.new(im.outputs['Color'], mix.inputs['A'])
            L.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
        else:
            L.new(im.outputs['Color'], bsdf.inputs['Base Color'])
        if alpha_clip:
            # Alpha below 0.5 is cut away: the exporter writes alphaMode MASK.
            rnd = N.new('ShaderNodeMath')
            rnd.operation = 'ROUND'
            L.new(im.outputs['Alpha'], rnd.inputs[0])
            L.new(rnd.outputs[0], bsdf.inputs['Alpha'])
            m.surface_render_method = 'DITHERED'
            m.use_backface_culling = False
    else:
        bsdf.inputs['Base Color'].default_value = col
    if 'arm' in maps:
        im = N.new('ShaderNodeTexImage')
        im.image = _image(maps['arm'], False)
        sep = N.new('ShaderNodeSeparateColor')
        L.new(im.outputs['Color'], sep.inputs['Color'])
        L.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
        L.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])
        grp = N.new('ShaderNodeGroup')
        grp.node_tree = _occlusion_group()
        L.new(sep.outputs['Red'], grp.inputs['Occlusion'])
    if 'nor' in maps:
        im = N.new('ShaderNodeTexImage')
        im.image = _image(maps['nor'], False)
        nm = N.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = normal_strength
        L.new(im.outputs['Color'], nm.inputs['Color'])
        L.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    if emit:
        bsdf.inputs['Emission Color'].default_value = (*emit, 1.0)
        bsdf.inputs['Emission Strength'].default_value = strength
    MAT[name] = m
    TILE[name] = tile
    return m


TEXTURES = {}


def make_materials():
    """The shared palette. Names starting with 'product' or equal to 'ore' are tinted per building in the game."""
    T = TEXTURES
    T.update(prepare_textures())
    # Cladding (box-profile steel sheet, 2 m per repeat), tinted.
    material('cladGrey', (0.42, 0.45, 0.48), tex='clad', tile=2.0)
    material('cladLight', (0.72, 0.74, 0.74), tex='clad', tile=2.0)
    material('cladWhite', (0.86, 0.87, 0.86), tex='clad', tile=2.0)
    material('cladRoof', (0.13, 0.15, 0.17), tex='clad', tile=2.0)
    material('cladRed', (0.36, 0.06, 0.04), tex='clad', tile=2.0)
    material('cladBlue', (0.05, 0.13, 0.32), tex='clad', tile=2.0)
    material('cladGreen', (0.12, 0.2, 0.15), tex='clad', tile=2.0)
    material('concrete', (0.52, 0.51, 0.49), tex='concrete', tile=3.0)
    material('concreteDark', (0.34, 0.34, 0.33), tex='concrete', tile=3.0)
    material('foundation', (0.45, 0.44, 0.42), tex='concrete', tile=4.0)
    material('brick', tex='brick', tile=1.6)
    material('asphalt', tex='asphalt', tile=4.0)
    material('shutter', (0.6, 0.63, 0.66), tex='shutter', tile=2.0)
    material('shutterBlue', (0.12, 0.22, 0.4), tex='shutter', tile=2.0)
    material('plasterWhite', (0.86, 0.86, 0.84), tex='plaster', tile=2.5)
    material('plasterWarm', (0.72, 0.66, 0.56), tex='plaster', tile=2.5)
    material('plasterGrey', (0.42, 0.43, 0.44), tex='plaster', tile=2.5)
    material('gravelRoof', (0.36, 0.36, 0.35), tex='gravel', tile=2.0)
    material('dirt', (0.22, 0.18, 0.14), tex='gravel', tile=3.0)
    material('grass', (0.14, 0.24, 0.07), tex='gravel', tile=2.0)
    material('hedge', (0.05, 0.13, 0.04), tex='gravel', tile=1.0, rough=0.9)
    material('ore', (1.0, 1.0, 1.0), tex='gravel', tile=2.0)
    # Plain painted and bare metals.
    material('steelDark', (0.035, 0.04, 0.045), rough=0.5, metal=0.3)
    material('steelGrey', (0.2, 0.21, 0.22), rough=0.45, metal=0.4)
    material('galvanised', (0.56, 0.57, 0.58), rough=0.38, metal=1.0)
    material('aluminium', (0.75, 0.76, 0.77), rough=0.3, metal=1.0)
    material('steelYellow', (0.82, 0.5, 0.02), rough=0.45)
    material('steelRed', (0.3, 0.045, 0.025), rough=0.5)
    material('steelBlue', (0.04, 0.12, 0.32), rough=0.45)
    material('whitePaint', (0.8, 0.8, 0.78), rough=0.35)
    material('hazard', (0.02, 0.02, 0.02), rough=0.6)
    material('glass', (0.32, 0.4, 0.45), rough=0.05, metal=0.9)
    material('foil', (0.78, 0.52, 0.14), rough=0.32, metal=1.0)
    material('skylight', (0.62, 0.66, 0.64), rough=0.35)
    material('glassDark', (0.03, 0.035, 0.04), rough=0.08, metal=0.7)
    material('frame', (0.28, 0.29, 0.3), rough=0.35, metal=0.8)
    material('interior', (0.015, 0.015, 0.016), rough=0.95)
    material('rubber', (0.012, 0.012, 0.012), rough=0.75)
    material('wood', (0.36, 0.23, 0.12), rough=0.8)
    material('woodLight', (0.55, 0.42, 0.26), rough=0.8)
    material('plastic', (0.7, 0.7, 0.68), rough=0.5)
    material('lineWhite', (0.75, 0.75, 0.72), rough=0.7)
    material('copperPipe', (0.75, 0.42, 0.25), rough=0.35, metal=1.0)
    material('fence', (1.0, 1.0, 1.0), tex='fence', tile=0.5, rough=0.4, metal=0.8, alpha_clip=True)
    material('grille', (1.0, 1.0, 1.0), tex='grille', tile=1.0, rough=0.5, metal=0.5)
    material('bark', (0.12, 0.08, 0.05), rough=0.9)
    material('leaves', (0.07, 0.16, 0.04), tex='gravel', tile=1.0, rough=0.85)
    # Lights: emissive, used sparingly.
    material('lampLit', (1.0, 0.95, 0.85), emit=(1.0, 0.86, 0.62), strength=6.0)
    material('windowLit', (0.9, 0.75, 0.5), emit=(1.0, 0.78, 0.45), strength=1.6, rough=0.2)
    material('fire', (1.0, 0.4, 0.1), emit=(1.0, 0.36, 0.05), strength=8.0)
    material('beacon', (1.0, 0.1, 0.05), emit=(1.0, 0.08, 0.03), strength=4.0)
    # Car paint.
    for name, c in (('carRed', (0.4, 0.03, 0.02)), ('carBlue', (0.03, 0.1, 0.3)), ('carWhite', (0.75, 0.76, 0.76)),
                    ('carSilver', (0.4, 0.42, 0.44)), ('carBlack', (0.02, 0.02, 0.025))):
        material(name, c, rough=0.25, metal=0.5)
    # What a building makes: tinted in the game with the Factory's product colour.
    material('product', (1.0, 1.0, 1.0), rough=0.5)
    material('productMetal', (1.0, 1.0, 1.0), rough=0.28, metal=1.0)
    material('productPV', (1.0, 1.0, 1.0), tex='pv', tile=1.0, rough=0.12, metal=0.3)
    # Crate wraps in the Raw Material and product colours (copied from siteMesh.ts / buildingParts.ts).
    for name, hexc in (('wrapAluminium', 0xdfe6ee), ('wrapCopper', 0xd8763a), ('wrapSilicon', 0x7b83eb),
                       ('wrapMetal', 0xc8d0d9), ('wrapCircuit', 0x2e9a5a), ('wrapSolar', 0x2b4fb3),
                       ('wrapBattery', 0xf2c230)):
        material(name, srgb_hex(hexc), rough=0.35)


def srgb_hex(h):
    """A hex sRGB colour as linear RGB (what Principled colours and glTF factors use)."""
    def lin(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin((h >> 16) & 255), lin((h >> 8) & 255), lin(h & 255))


# ---------------------------------------------------------------------------------------------
# Scene graph of parts
# ---------------------------------------------------------------------------------------------

class Node:
    """A glTF node: its own joined mesh of parts, a transform, a role for the game (e.g. 'spin'), children."""

    def __init__(self, name, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), role=None, **extras):
        self.name = name
        self.loc = Vector(loc)
        self.rot = Euler(rot)
        self.role = role
        self.extras = extras
        self.parts = []
        self.children = []
        if parent:
            parent.children.append(self)


class Builder:
    """Collects parts for one model. Every primitive takes `node=` (default: the root) and positions in that node's space."""

    def __init__(self, name):
        self.name = name
        self.root = Node(name)
        self.coll = bpy.data.collections.new(f'{name}_parts')
        bpy.context.scene.collection.children.link(self.coll)
        self.rng = random.Random(name)

    # -- low level -------------------------------------------------------------------------
    def mesh(self, bm, mat, loc=(0, 0, 0), rot=(0, 0, 0), node=None, bevel=0.0, segs=2, uv='box', smooth=35,
             scale=(1, 1, 1), bevel_angle=40):
        """Wrap a bmesh as a part. uv: 'box' (world-sized box mapping), 'cyl' (round Z axis) or 'keep'."""
        me = bpy.data.meshes.new('part')
        bm.to_mesh(me)
        bm.free()
        if isinstance(mat, str):
            mat = [mat]
        for m in mat:
            me.materials.append(MAT[m])
        me.shade_smooth()
        me.set_sharp_from_angle(angle=math.radians(smooth))
        o = bpy.data.objects.new('part', me)
        self.coll.objects.link(o)
        o.location = loc
        o.rotation_euler = rot
        o.scale = scale
        if bevel > 0:
            b = o.modifiers.new('bevel', 'BEVEL')
            b.width = bevel
            b.segments = segs
            b.limit_method = 'ANGLE'
            b.angle_limit = math.radians(bevel_angle)
            b.harden_normals = True
            b.use_clamp_overlap = True
        o['uv'] = uv
        (node or self.root).parts.append(o)
        return o

    # -- primitives ------------------------------------------------------------------------
    def box(self, size, loc, mat, rot=(0, 0, 0), node=None, bevel=0.03, segs=2, origin='center', uv='box'):
        """A box of size (x, y, z). origin 'bottom' puts loc at the middle of its bottom face."""
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        sx, sy, sz = size
        dz = sz / 2 if origin == 'bottom' else 0
        for v in bm.verts:
            v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz + dz))
        bev = min(bevel, min(size) * 0.3) if bevel else 0
        return self.mesh(bm, mat, loc, rot, node, bev, segs, uv)

    def span(self, x0, x1, y0, y1, z0, z1, mat, **kw):
        """A box between two corners."""
        return self.box((x1 - x0, y1 - y0, z1 - z0), ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), mat, **kw)

    def cyl(self, r, h, loc, mat, segs=24, r2=None, rot=(0, 0, 0), node=None, bevel=0.0, caps=True, uv='cyl', bevel_segs=2):
        """An upright cylinder (or cone with r2) standing on loc."""
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=segs, radius1=r,
                              radius2=r if r2 is None else r2, depth=h)
        for v in bm.verts:
            v.co.z += h / 2
        return self.mesh(bm, mat, loc, rot, node, min(bevel, r * 0.3, h * 0.3), bevel_segs, uv, smooth=50)

    def lathe(self, profile, loc, mat, segs=32, rot=(0, 0, 0), node=None, smooth=50, uv='cyl'):
        """Spin a profile [(radius, z), ...] round the Z axis."""
        bm = bmesh.new()
        verts = [bm.verts.new((max(r, 0.0), 0, z)) for r, z in profile]
        edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
        bmesh.ops.spin(bm, geom=verts + edges, axis=(0, 0, 1), cent=(0, 0, 0), steps=segs, angle=math.tau)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return self.mesh(bm, mat, loc, rot, node, 0, 2, uv, smooth=smooth)

    def prism(self, poly, length, loc, mat, axis='y', rot=(0, 0, 0), node=None, bevel=0.0, segs=2, uv='box', smooth=35):
        """Extrude a 2D outline [(u, v), ...] (counter-clockwise) by `length`, centred.
        axis 'y': outline in the XZ plane (u = x, v = z), pushed along Y. axis 'x': outline in YZ (u = y, v = z)."""
        bm = bmesh.new()
        if axis == 'y':
            vs = [bm.verts.new((u, length / 2, v)) for u, v in poly]
            vec = (0, -length, 0)
        else:
            vs = [bm.verts.new((-length / 2, u, v)) for u, v in poly]
            vec = (length, 0, 0)
        f = bm.faces.new(vs)
        res = bmesh.ops.extrude_face_region(bm, geom=[f])
        moved = [e for e in res['geom'] if isinstance(e, bmesh.types.BMVert)]
        bmesh.ops.translate(bm, verts=moved, vec=vec)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return self.mesh(bm, mat, loc, rot, node, bevel, segs, uv, smooth=smooth)

    def bar(self, a, b, w, mat, h=None, node=None, bevel=0.0, round_=False, segs=8, roll=0.0):
        """A member from point a to point b: square w × h, or round of diameter w."""
        a, b = Vector(a), Vector(b)
        d = b - a
        length = d.length
        if length < 1e-6:
            return None
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        rot = (q.to_matrix().to_4x4() @ Matrix.Rotation(roll, 4, 'Z')).to_euler()
        if round_:
            bm = bmesh.new()
            bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=w / 2, radius2=w / 2, depth=length)
            for v in bm.verts:
                v.co.z += length / 2
            return self.mesh(bm, mat, a, rot, node, 0, 2, 'cyl', smooth=60)
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        hh = w if h is None else h
        for v in bm.verts:
            v.co = Vector((v.co.x * w, v.co.y * hh, (v.co.z + 0.5) * length))
        return self.mesh(bm, mat, a, rot, node, min(bevel, w * 0.3), 1, 'box')

    def pipe(self, pts, r, mat, node=None, segs=12, joints=True):
        """A pipe along a polyline, with a rounded elbow at each bend."""
        pts = [Vector(p) for p in pts]
        for i in range(len(pts) - 1):
            self.bar(pts[i], pts[i + 1], r * 2, mat, node=node, round_=True, segs=segs)
        if joints:
            for p in pts[1:-1]:
                self.sphere(r * 1.08, p, mat, node=node, segs=segs)

    def sphere(self, r, loc, mat, node=None, segs=16, rings=None, scale=(1, 1, 1)):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings or max(4, segs // 2), radius=r)
        return self.mesh(bm, mat, loc, (0, 0, 0), node, 0, 2, 'box', smooth=80, scale=scale)

    def blob(self, r, loc, mat, seed=0, node=None, scale=(1, 1, 1)):
        """An irregular lump (a jittered icosphere): leaf clumps, boulders."""
        rnd = random.Random(seed)
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
        for v in bm.verts:
            v.co *= rnd.uniform(0.82, 1.12)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return self.mesh(bm, mat, loc, (rnd.uniform(0, 3), rnd.uniform(0, 3), rnd.uniform(0, 3)), node, 0, 2, 'box',
                         smooth=90, scale=scale)

    def torus(self, R, r, loc, mat, rot=(0, 0, 0), node=None, segs=32, ring_segs=8):
        """A ring of tube radius r round the Z axis."""
        bm = bmesh.new()
        rows = []
        for i in range(segs):
            a = i / segs * math.tau
            c, s = math.cos(a), math.sin(a)
            row = []
            for j in range(ring_segs):
                b = j / ring_segs * math.tau
                rr = R + r * math.cos(b)
                row.append(bm.verts.new((rr * c, rr * s, r * math.sin(b))))
            rows.append(row)
        for i in range(segs):
            for j in range(ring_segs):
                a, b = rows[i][j], rows[i][(j + 1) % ring_segs]
                c, d = rows[(i + 1) % segs][(j + 1) % ring_segs], rows[(i + 1) % segs][j]
                bm.faces.new((a, b, c, d))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return self.mesh(bm, mat, loc, rot, node, 0, 2, 'box', smooth=80)

    def plane(self, w, h, loc, mat, rot=(0, 0, 0), node=None, uv='box'):
        """A flat quad w × h in the XY plane, facing +Z."""
        bm = bmesh.new()
        vs = [bm.verts.new((x * w / 2, y * h / 2, 0)) for x, y in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        bm.faces.new(vs)
        return self.mesh(bm, mat, loc, rot, node, 0, 2, uv)

    def grid_quad(self, w, h, loc, mat, rot=(0, 0, 0), node=None):
        """A quad with UVs 0..1 (one texture across it), facing +Z."""
        bm = bmesh.new()
        uvl = bm.loops.layers.uv.new('UVMap')
        vs = [bm.verts.new((x * w / 2, y * h / 2, 0)) for x, y in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        f = bm.faces.new(vs)
        for loop, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
            loop[uvl].uv = uv
        return self.mesh(bm, mat, loc, rot, node, 0, 2, 'keep')

    def ribbon(self, pts, h, mat, node=None, uv_tile=None):
        """A vertical strip (e.g. a fence) standing on a polyline of (x, y, z0) points, h tall. UVs: metres / tile."""
        bm = bmesh.new()
        uvl = bm.loops.layers.uv.new('UVMap')
        t = uv_tile or TILE.get(mat, 1.0)
        dist = 0.0
        for i in range(len(pts) - 1):
            a, b = Vector(pts[i]), Vector(pts[i + 1])
            seg = (Vector((b.x, b.y, 0)) - Vector((a.x, a.y, 0))).length
            vs = [bm.verts.new(a), bm.verts.new(b), bm.verts.new(b + Vector((0, 0, h))), bm.verts.new(a + Vector((0, 0, h)))]
            f = bm.faces.new(vs)
            for loop, uv in zip(f.loops, ((dist, 0), (dist + seg, 0), (dist + seg, h), (dist, h))):
                loop[uvl].uv = (uv[0] / t, uv[1] / t)
            dist += seg
        return self.mesh(bm, mat, (0, 0, 0), (0, 0, 0), node, 0, 2, 'keep')

    def mound(self, r, h, loc, mat, segs=32, seed=0, node=None, squash=(1, 1)):
        """A heap of loose material: a rounded cone with a lumpy surface."""
        rnd = random.Random(seed)
        bm = bmesh.new()
        rings = 7
        prof = []
        for i in range(rings + 1):
            t = i / rings
            prof.append((r * (1 - t) ** 0.9 * (1 if i < rings else 0), h * (1 - (1 - t) ** 1.6)))
        verts = [bm.verts.new((rr, 0, z)) for rr, z in prof]
        edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
        bmesh.ops.spin(bm, geom=verts + edges, axis=(0, 0, 1), cent=(0, 0, 0), steps=segs, angle=math.tau)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        phases = [rnd.uniform(0, math.tau) for _ in range(6)]
        for v in bm.verts:
            if v.co.z < 0.01 or v.co.xy.length < 0.01:
                continue
            a = math.atan2(v.co.y, v.co.x)
            n = (0.08 * math.sin(3 * a + phases[0]) + 0.05 * math.sin(5 * a + phases[1]) + 0.04 * math.sin(9 * a + v.co.z + phases[2]))
            k = 1 + n
            v.co.x *= k * squash[0]
            v.co.y *= k * squash[1]
            v.co.z *= 1 + 0.5 * n
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return self.mesh(bm, mat, loc, (0, 0, 0), node, 0, 2, 'box', smooth=70)

    def tiled_quad(self, w, h, nu, nv, loc, mat, rot=(0, 0, 0), node=None, thick=0.0):
        """A quad w × h (XY plane, facing +Z) with its texture repeated nu × nv times, optionally a thin slab."""
        bm = bmesh.new()
        uvl = bm.loops.layers.uv.new('UVMap')
        vs = [bm.verts.new((x * w / 2, y * h / 2, 0)) for x, y in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        f = bm.faces.new(vs)
        for loop, uv in zip(f.loops, ((0, 0), (nu, 0), (nu, nv), (0, nv))):
            loop[uvl].uv = uv
        return self.mesh(bm, mat, loc, rot, node, 0, 2, 'keep')


# ---------------------------------------------------------------------------------------------
# Turning parts into exportable objects
# ---------------------------------------------------------------------------------------------

def _cyl_uv(me, tile):
    """Wrap UVs round the Z axis (sides) and map caps flat."""
    uvl = me.uv_layers['UVMap']
    for poly in me.polygons:
        if abs(poly.normal.z) > 0.7:
            for li in poly.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                uvl.data[li].uv = (co.x / tile, co.y / tile)
            continue
        us = []
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            us.append((li, math.atan2(co.y, co.x), co.xy.length, co.z))
        angs = [a for _, a, _, _ in us]
        if max(angs) - min(angs) > math.pi:
            us = [(li, a + math.tau if a < 0 else a, r, z) for li, a, r, z in us]
        for li, a, r, z in us:
            uvl.data[li].uv = (a * max(r, 0.05) / tile, z / tile)


def _box_uv(me, offset):
    uvl = me.uv_layers['UVMap']
    keep = me.attributes.get('keepuv')
    keepv = [0] * len(me.polygons)
    if keep:
        keep.data.foreach_get('value', keepv)
    tiles = [TILE.get(m.name.split('.')[0], 2.0) if m else 2.0 for m in me.materials]
    verts = me.vertices
    loops = me.loops
    for poly in me.polygons:
        if keepv[poly.index]:
            continue
        n = poly.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        s = 1 if n[ax] > 0 else -1
        t = tiles[poly.material_index] if poly.material_index < len(tiles) else 2.0
        for li in poly.loop_indices:
            co = verts[loops[li].vertex_index].co
            if ax == 0:
                u, v = s * co.y, co.z
            elif ax == 1:
                u, v = -s * co.x, co.z
            else:
                u, v = s * co.x, co.y
            uvl.data[li].uv = (u / t + offset[0], v / t + offset[1])


def _part_mesh(o, dg):
    ev = o.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    if 'UVMap' not in me.uv_layers:
        if len(me.uv_layers):
            me.uv_layers[0].name = 'UVMap'
        else:
            me.uv_layers.new(name='UVMap')
    mode = o['uv']
    keep = me.attributes.new('keepuv', 'INT', 'FACE')
    if mode == 'cyl':
        tile = TILE.get(me.materials[0].name.split('.')[0], 2.0) if me.materials else 2.0
        _cyl_uv(me, tile)
    if mode in ('cyl', 'keep'):
        keep.data.foreach_set('value', [1] * len(me.polygons))
    return me


def finalize(b, scene):
    """Build one Blender object per Node (parts joined, modifiers applied, UVs set). Returns the root object."""
    dg = bpy.context.evaluated_depsgraph_get()
    view = bpy.context.view_layer
    target_coll = bpy.data.collections.get('export') or bpy.data.collections.new('export')
    if target_coll.name not in scene.collection.children:
        scene.collection.children.link(target_coll)

    def make(node, parent_obj):
        meshes = []
        for o in node.parts:
            me = _part_mesh(o, dg)
            tmp = bpy.data.objects.new('tmp', me)
            target_coll.objects.link(tmp)
            tmp.matrix_world = o.matrix_basis.copy()
            meshes.append(tmp)
        if meshes:
            me = bpy.data.meshes.new(node.name)
            me.uv_layers.new(name='UVMap')
            obj = bpy.data.objects.new(node.name, me)
            target_coll.objects.link(obj)
            for ob in view.objects:
                ob.select_set(False)
            for t in meshes:
                t.select_set(True)
            obj.select_set(True)
            view.objects.active = obj
            bpy.ops.object.join()
            me = obj.data
            _box_uv(me, (b.rng.random(), b.rng.random()))
            if 'keepuv' in me.attributes:
                me.attributes.remove(me.attributes['keepuv'])
            # Drop materials no face uses; merge duplicate slots.
            _clean_slots(obj)
        else:
            obj = bpy.data.objects.new(node.name, None)
            obj.empty_display_size = 0.5
            target_coll.objects.link(obj)
        obj.name = node.name
        if parent_obj:
            obj.parent = parent_obj
        obj.location = node.loc
        obj.rotation_euler = node.rot
        if node.role:
            obj['role'] = node.role
        for k, v in node.extras.items():
            obj[k] = v
        for c in node.children:
            make(c, obj)
        return obj

    root = make(b.root, None)
    for o in list(b.coll.objects):
        me = o.data
        bpy.data.objects.remove(o)
        if me and me.users == 0:
            bpy.data.meshes.remove(me)
    bpy.data.collections.remove(b.coll)
    return root


def _clean_slots(obj):
    me = obj.data
    used = sorted({p.material_index for p in me.polygons})
    mats = [me.materials[i] for i in used]
    # Merge slots that share a material.
    uniq = []
    for m in mats:
        if m not in uniq:
            uniq.append(m)
    remap = {old: uniq.index(me.materials[old]) for old in used}
    idx = [0] * len(me.polygons)
    me.polygons.foreach_get('material_index', idx)
    me.materials.clear()
    for m in uniq:
        me.materials.append(m)
    me.polygons.foreach_set('material_index', [remap[i] for i in idx])


def triangles(obj):
    n = 0
    for o in [obj, *obj.children_recursive]:
        if o.type == 'MESH':
            n += sum(len(p.vertices) - 2 for p in o.data.polygons)
    return n
