# Nature assets (trees, bushes, boulders, Shipping rig)

Every third-party file used for the trees and bushes. All are CC0 (public domain): no attribution is required, but
we credit them. The tree, bush, cactus, boulder, truck, dock and road shapes are made in code (`src/world/treeModels.ts`,
`sceneryRocks.ts`, `truckModel.ts`); the road's asphalt and the dock's gravel fill are drawn in a canvas at run time.

## Shipped files

| File | Made from | Size |
|---|---|---|
| `public/textures/nature/foliage_col.jpg` | Leaf cards, needle boughs, a spruce silhouette and bark composed by `scripts/blender/build_nature.py` from the sources below; the cactus skin (ribs, spine clusters) is drawn by the same script in code | ≈ 232 KB |
| `public/textures/nature/foliage_mask.jpg` | Coverage (alpha) of the same atlas | ≈ 173 KB |

## Sources (downloaded to `.leap/art-src/nature/dl/`, not shipped)

| Original | Author / site | URL | Licence | Used for |
|---|---|---|---|---|
| Leaf Set 024 (`LeafSet024_1K-JPG`, colour + opacity) | ambientCG (Lennart Demes) | https://ambientcg.com/a/LeafSet024 | CC0 1.0 | Beech-like leaves of the broadleaf trees and bushes |
| Leaf Set 016 (`LeafSet016_1K-JPG`, colour + opacity) | ambientCG (Lennart Demes) | https://ambientcg.com/a/LeafSet016 | CC0 1.0 | Oak leaves (oaks, scrub, thorn trees) |
| Leaf Set 019 (`LeafSet019_1K-JPG`, colour + opacity) | ambientCG (Lennart Demes) | https://ambientcg.com/a/LeafSet019 | CC0 1.0 | Needle sprays (conifers, palm fronds) |
| Bark 012 (`Bark012_1K-JPG`, colour) | ambientCG (Lennart Demes) | https://ambientcg.com/a/Bark012 | CC0 1.0 | Bark of trunks and limbs |

The boulders reuse the ground's rock photograph through `rockMaterial` (`src/world/rocks.ts`; listed in
`assets-terrain.md`).

Regenerate the atlas:

```
"C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b --factory-startup -P scripts/blender/build_nature.py
```
