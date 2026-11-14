"""
Build LEAP's Site building models and export them to public/models/buildings.glb.

  blender -b -P scripts/blender/build_buildings.py                 # build all, export the GLB
  blender -b -P scripts/blender/build_buildings.py -- --preview    # ... and render previews of the exported GLB
  blender -b -P scripts/blender/build_buildings.py -- mine hq      # build only these, render previews, no export

Textures come from Poly Haven (CC0) and are downloaded into .leap/art-src/buildings/tex on first run.
Previews go to .leap/art-src/buildings/previews.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import lib  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
only = [a for a in args if not a.startswith('--')]
preview = '--preview' in args or bool(only)
OUT = os.path.join(lib.ROOT, 'public', 'models', 'buildings.glb')
PREVIEWS = os.path.join(lib.ART, 'previews')

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
lib.fetch_textures()
lib.make_materials()

import models_campus  # noqa: E402
import models_industry  # noqa: E402

MODELS = {**models_industry.MODELS, **models_campus.MODELS}

roots = {}
for name, build in MODELS.items():
    if only and name not in only:
        continue
    b = lib.Builder(name)
    build(b)
    roots[name] = lib.finalize(b, scene)
    if '--no-ao' not in args:
        lib.bake_ao(roots[name])
    # Hide each finished model so it does not shade the next one's bake (they all stand at the origin).
    for o in [roots[name], *roots[name].children_recursive]:
        o.hide_render = True
    print(f'MODEL {name}: {lib.triangles(roots[name])} triangles')

for root in roots.values():
    for o in [root, *root.children_recursive]:
        o.hide_render = False
if bpy.data.objects.get('bakeGround'):
    bpy.data.objects.remove(bpy.data.objects['bakeGround'])

if not only:
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
    )
    print(f'EXPORTED {OUT}: {os.path.getsize(OUT) / 1e6:.2f} MB')

if preview:
    import render  # noqa: E402
    if not only:
        # Check what the game gets: render the exported file, not the scene it came from.
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=OUT)
        roots = {o.name: o for o in bpy.context.scene.objects if o.parent is None and o.name in MODELS}
    render.render_all(roots, PREVIEWS)
