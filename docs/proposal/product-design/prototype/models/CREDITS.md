# 3D model and material credits

Models were converted to GLB with gltf-transform 4.1.1 (`optimize --texture-compress webp --texture-size 512`; the two potted plants also with `--simplify`). Materials were downsized and re-encoded as WebP (colour 1024px, normal and roughness 512px) into `../textures/<id>/`. Geometry and materials are otherwise unchanged; the prototype recolours the sofa fabric, the lamp shade and painted walls at runtime and lays fabric normal maps over the tintable sofa.

## Models

| File | Source | Author | License |
|---|---|---|---|
| `sofa.glb` | [GlamVelvetSofa](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa), Khronos glTF Sample Assets | Eric Chadwick, © 2021 Wayfair, LLC | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `sheen-wood-leather-sofa.glb` | [SheenWoodLeatherSofa](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenWoodLeatherSofa), Khronos glTF Sample Assets | Eric Chadwick, © Darmstadt Graphics Group GmbH | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `sheen-chair.glb` | [SheenChair](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenChair), Khronos glTF Sample Assets | Eric Chadwick, Wayfair, LLC | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `sofa-01.glb` | [Sofa 01](https://polyhaven.com/a/Sofa_01), Poly Haven | Kirill Sannikov | CC0 |
| `sofa-02.glb` | [Sofa 02](https://polyhaven.com/a/sofa_02), Poly Haven | Kirill Sannikov | CC0 |
| `coffee-table.glb` | [Modern Coffee Table 01](https://polyhaven.com/a/modern_coffee_table_01), Poly Haven | Amin | CC0 |
| `coffee-table-round-01.glb` | [Coffee Table Round 01](https://polyhaven.com/a/coffee_table_round_01), Poly Haven | Ulan Cabanilla | CC0 |
| `small-wooden-table-01.glb` | [Small Wooden Table 01](https://polyhaven.com/a/small_wooden_table_01), Poly Haven | Ulan Cabanilla | CC0 |
| `gothic-coffee-table.glb` | [Gothic Coffee Table](https://polyhaven.com/a/gothic_coffee_table), Poly Haven | Ulan Cabanilla | CC0 |
| `industrial-coffee-table.glb` | [Industrial Coffee Table](https://polyhaven.com/a/industrial_coffee_table), Poly Haven | Ulan Cabanilla | CC0 |
| `chinese-tea-table.glb` | [Chinese Tea Table](https://polyhaven.com/a/chinese_tea_table), Poly Haven | Kirill Sannikov | CC0 |
| `ceiling-lamp.glb` | [Modern Ceiling Lamp 01](https://polyhaven.com/a/modern_ceiling_lamp_01), Poly Haven | James Ray Cock | CC0 |
| `chandelier-01.glb` | [Chandelier 01](https://polyhaven.com/a/Chandelier_01), Poly Haven | Kirill Sannikov | CC0 |
| `chandelier-02.glb` | [Chandelier 02](https://polyhaven.com/a/Chandelier_02), Poly Haven | Kirill Sannikov | CC0 |
| `hanging-industrial-lamp.glb` | [Hanging Industrial Lamp](https://polyhaven.com/a/hanging_industrial_lamp), Poly Haven | Kuutti Siitonen | CC0 |
| `lantern-chandelier-01.glb` | [Lantern Chandelier 01](https://polyhaven.com/a/lantern_chandelier_01), Poly Haven | Kirill Sannikov | CC0 |
| `plant.glb` | [Potted Plant 04](https://polyhaven.com/a/potted_plant_04), Poly Haven | James Ray Cock | CC0 |
| `potted-plant-01.glb` | [Potted Plant 01](https://polyhaven.com/a/potted_plant_01), Poly Haven | Rico Cilliers | CC0 |
| `potted-plant-02.glb` | [Potted Plant 02](https://polyhaven.com/a/potted_plant_02), Poly Haven | Rico Cilliers | CC0 |
| `armchair-01.glb` | [Arm Chair 01](https://polyhaven.com/a/ArmChair_01), Poly Haven | Kirill Sannikov | CC0 |
| `mid-century-lounge-chair.glb` | [Mid Century Lounge Chair](https://polyhaven.com/a/mid_century_lounge_chair), Poly Haven | Kuutti Siitonen | CC0 |
| `modern-arm-chair-01.glb` | [Modern Arm Chair 01](https://polyhaven.com/a/modern_arm_chair_01), Poly Haven | Vibrant Nordic | CC0 |
| `cabinet.glb` | [Modern Wooden Cabinet](https://polyhaven.com/a/modern_wooden_cabinet), Poly Haven | Patrik Pangerl | CC0 |

Changes to the CC BY 4.0 models: textures resized and re-encoded as WebP; GlamVelvetSofa's fabric is recoloured and given fabric normal maps at runtime.

## Materials (`../textures/`)

All from [Poly Haven](https://polyhaven.com/textures), CC0.

| Folder | Material | Author |
|---|---|---|
| `laminate_floor_02` | Laminate Floor 02 | Dario Barresi, Charlotte Baglioni |
| `plank_flooring_04` | Plank Flooring 04 | Dimitrios Savva |
| `dark_wooden_planks` | Dark Wooden Planks | Amal Kumar |
| `terrazzo_tiles` | Terrazzo Tiles | Amal Kumar |
| `herringbone_parquet` | Herringbone Parquet | Jenelle van Heerden, Sergej Majboroda |
| `smooth_concrete_floor` | Smooth Concrete Floor | Dimitrios Savva |
| `marble_01` | Marble 01 | Rob Tuytel |
| `rectangular_parquet` | Rectangular Parquet | Jenelle van Heerden, Sergej Majboroda |
| `oak_wood_planks` | Oak Wood Planks | Dimitrios Savva |
| `plastered_wall_04` | Plastered Wall 04 | Rob Tuytel |
| `concrete_wall_004` | Concrete Wall 004 | Dario Barresi, Charlotte Baglioni |
| `clay_plaster` | Clay Plaster | Amal Kumar |
| `rough_linen` | Rough Linen | colormass, Rico Cilliers |
| `poly_wool_herringbone` | Poly Wool Herringbone | colormass, Rico Cilliers |
| `wool_boucle` | Wool Boucle | colormass, Rico Cilliers |
| `velour_velvet` | Velour Velvet | colormass, Rico Cilliers |

## Added dressing models (all Poly Haven, CC0)

| File | Source asset | Author |
|---|---|---|
| `wood-sofa.glb` | Painted Wooden Sofa | Kirill Sannikov |
| `chinese-sofa.glb` | [Chinese Sofa](https://polyhaven.com/a/chinese_sofa) | Kirill Sannikov |
| `day-bed.glb` | [Vintage Day Bed](https://polyhaven.com/a/vintage_day_bed) | Aron Łyczek |
| `wooden-bench.glb` | [Painted Wooden Bench](https://polyhaven.com/a/painted_wooden_bench) | Kirill Sannikov |
| `display-shelves.glb` | Wooden Display Shelves 01 | James Ray Cock |
| `light-shelves.glb` | Painted Wooden Shelves | Kirill Sannikov |
| `vintage-drawer.glb` | Vintage Wooden Drawer 01 | James Ray Cock |
| `steel-shelves.glb` | Steel Frame Shelves 03 | Ulan Cabanilla |
| `painted-cabinet.glb` | Painted Wooden Cabinet | Kirill Sannikov |
| `screen-panels.glb` | Chinese Screen Panels | Kirill Sannikov |
| `ottoman.glb` | Ottoman 01 | Caspian Fortune |
| `vase-antique.glb` | Antique Ceramic Vase 01 | James Ray Cock |
| `vase-ceramic.glb` | Ceramic Vase 03 | James Ray Cock |
| `vase-brass.glb` | Brass Vase 02 | Rico Cilliers |
| `chinese-armchair.glb` | [Chinese Armchair](https://polyhaven.com/a/chinese_armchair) | Kirill Sannikov |
| `rocking-chair.glb` | [Rockingchair 01](https://polyhaven.com/a/Rockingchair_01) | Jorge Camacho |
| `green-chair.glb` | [Green Chair 01](https://polyhaven.com/a/GreenChair_01) | Kirill Sannikov |
| `coffee-table-02.glb` | [Modern Coffee Table 02](https://polyhaven.com/a/modern_coffee_table_02) | Amin |
| `coffee-table-classic.glb` | [Coffee Table 01](https://polyhaven.com/a/CoffeeTable_01) | Fernando Quinn |
| `chinese-cabinet.glb` | [Chinese Cabinet](https://polyhaven.com/a/chinese_cabinet) | Kirill Sannikov |
| `painted-cabinet-02.glb` | [Painted Wooden Cabinet 02](https://polyhaven.com/a/painted_wooden_cabinet_02) | Kirill Sannikov |
| `worn-bookshelf.glb` | [Wooden Bookshelf Worn](https://polyhaven.com/a/wooden_bookshelf_worn) | Ulan Cabanilla |
| `planter-box.glb` | [Planter Box 01](https://polyhaven.com/a/planter_box_01) (also with `--simplify`) | James Ray Cock |
| `marble-bust.glb` | [Marble Bust 01](https://polyhaven.com/a/marble_bust_01) | Rico Cilliers |
| `wooden-elephant.glb` | [Carved Wooden Elephant](https://polyhaven.com/a/carved_wooden_elephant) | Greg Zaal |
| `mantel-clock.glb` | [Mantel Clock 01](https://polyhaven.com/a/mantel_clock_01) | Yann Kervran, Rico Cilliers |
| `horse-statue.glb` | [Horse Statue 01](https://polyhaven.com/a/horse_statue_01) | Rico Cilliers |
| `cat-statue.glb` | [Concrete Cat Statue](https://polyhaven.com/a/concrete_cat_statue) | Rico Cilliers, Riley Queen |
| `vase-ceramic-01.glb` | [Ceramic Vase 01](https://polyhaven.com/a/ceramic_vase_01) | James Ray Cock |
| `tea-set.glb` | [Tea Set 01](https://polyhaven.com/a/tea_set_01) | James Ray Cock, Rico Cilliers, Jurita Burger |
| `chandelier-03.glb` | [Chandelier 03](https://polyhaven.com/a/Chandelier_03) | Kirill Sannikov |
| `chinese-chandelier.glb` | [Chinese Chandelier](https://polyhaven.com/a/chinese_chandelier) | Kirill Sannikov |
| `gallinera-chair.glb` | [Gallinera Chair](https://polyhaven.com/a/gallinera_chair) | Ulan Cabanilla |
| `chinese-stool.glb` | [Chinese Stool](https://polyhaven.com/a/chinese_stool) | Kirill Sannikov |
| `painted-chair.glb` | [Painted Wooden Chair 01](https://polyhaven.com/a/painted_wooden_chair_01) | Kuutti Siitonen |
| `wooden-chair.glb` | [Wooden Chair 01](https://polyhaven.com/a/WoodenChair_01) | Jake Mobley |
| `classic-console.glb` | [Classic Console 01](https://polyhaven.com/a/ClassicConsole_01) | Kirill Sannikov |
| `gothic-commode.glb` | [Gothic Commode 01](https://polyhaven.com/a/GothicCommode_01) | Kirill Sannikov |
| `drawer-cabinet.glb` | [Drawer Cabinet](https://polyhaven.com/a/drawer_cabinet) | Ulan Cabanilla |
| `chinese-console.glb` | [Chinese Console Table](https://polyhaven.com/a/chinese_console_table) | Kirill Sannikov |
| `gallinera-table.glb` | [Gallinera Table](https://polyhaven.com/a/gallinera_table) | Ulan Cabanilla |
| `painted-table.glb` | [Painted Wooden Table](https://polyhaven.com/a/painted_wooden_table) | Kirill Sannikov |

The block sofa (方塊低沙發) and cloud sofa (雲朵沙發) are not files: `room3d.js` builds them from rounded boxes at runtime (`procSofa`).
