"""Preview renders of the building models (EEVEE, sun and sky), from the game's view and a closer 3/4 view."""
import math
import os

import bpy
from mathutils import Vector


def setup_scene(scene):
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 750
    scene.render.film_transparent = False
    scene.eevee.taa_render_samples = 48
    scene.eevee.use_raytracing = True
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast' if 'AgX - Medium High Contrast' in [
        i.identifier for i in scene.view_settings.bl_rna.properties['look'].enum_items] else 'None'
    world = bpy.data.worlds.new('sky')
    scene.world = world
    nt = world.node_tree
    N, L = nt.nodes, nt.links
    bg = N['Background']
    sky = N.new('ShaderNodeTexSky')
    sky.sky_type = 'MULTIPLE_SCATTERING'
    sky.sun_disc = False
    sky.sun_elevation = math.radians(38)
    sky.sun_rotation = math.radians(-30)
    L.new(sky.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 0.25
    sun_data = bpy.data.lights.new('sun', 'SUN')
    sun_data.energy = 4.5
    sun_data.angle = math.radians(1.5)
    sun = bpy.data.objects.new('sun', sun_data)
    scene.collection.objects.link(sun)
    # Light from high up, from the front-right (+x, -y), like the game's afternoon sun.
    sun.rotation_euler = (math.radians(50), 0, math.radians(60))
    # Ground: a big grass-and-dirt plane.
    me = bpy.data.meshes.new('ground')
    s = 400
    me.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
    g = bpy.data.objects.new('ground', me)
    m = bpy.data.materials.new('groundMat')
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.12, 0.14, 0.07, 1)
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.95
    me.materials.append(m)
    scene.collection.objects.link(g)
    cam_data = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    return cam


def aim(cam, target, elev, azim, dist, lens):
    """Put the camera `dist` from target, `elev` degrees up, `azim` degrees from +x towards -y."""
    e, a = math.radians(elev), math.radians(azim)
    d = Vector((math.cos(e) * math.cos(a), -math.cos(e) * math.sin(a), math.sin(e)))
    cam.location = Vector(target) + d * dist
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = lens
    cam.data.clip_end = 2000


# What the game tints 'product*' and 'ore' materials with (see buildingParts.ts / siteMesh.ts), for previews.
PREVIEW_TINT = {'mine': 0xd8763a, 'metalWorks': 0xc8d0d9, 'electronicsLab': 0x2e9a5a, 'solarFab': 0x2b4fb3,
                'batteryPlant': 0xf2c230, 'assemblyHall': 0xc8d0d9}


def _tint(name):
    hexc = PREVIEW_TINT.get(name)
    for m in bpy.data.materials:
        if not (m.name.startswith('product') or m.name.startswith('ore')) or not m.node_tree:
            continue
        bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf:
            continue
        sock = bsdf.inputs['Base Color']
        c = (1, 1, 1, 1)
        if hexc is not None:
            c = tuple(((hexc >> s & 255) / 255) ** 2.2 for s in (16, 8, 0)) + (1,)
        if sock.is_linked:
            src = sock.links[0].from_node
            if src.type != 'MIX':
                mix = m.node_tree.nodes.new('ShaderNodeMix')
                mix.data_type = 'RGBA'
                mix.blend_type = 'MULTIPLY'
                mix.inputs['Factor'].default_value = 1
                m.node_tree.links.new(src.outputs[0], mix.inputs['A'])
                m.node_tree.links.new(mix.outputs['Result'], sock)
                src = mix
            src.inputs['B'].default_value = c
        else:
            sock.default_value = c


def render_all(roots, outdir, views=('site', 'close')):
    """roots: {name: root object}. Renders <outdir>/<name>-<view>.png with only that model visible."""
    scene = bpy.context.scene
    cam = setup_scene(scene)
    os.makedirs(outdir, exist_ok=True)
    for name, root in roots.items():
        _tint(name)
        for other in roots.values():
            for o in [other, *other.children_recursive]:
                o.hide_render = other is not root
        h = max(8.0, max((o.matrix_world @ Vector(c)).z for o in [root, *root.children_recursive] if o.type == 'MESH'
                         for c in o.bound_box))
        for view in views:
            if view == 'site':
                aim(cam, (0, 0, h * 0.3), 35, 45, 95 + h * 0.6, 50)
            else:
                aim(cam, (0, 0, h * 0.25), 18, 25, 42 + h * 0.35, 35)
            scene.render.filepath = os.path.join(outdir, f'{name}-{view}.png')
            bpy.ops.render.render(write_still=True)
            print('rendered', scene.render.filepath)
