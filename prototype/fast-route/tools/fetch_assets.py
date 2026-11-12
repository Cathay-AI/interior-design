#!/usr/bin/env python3
"""Download the CC0 furniture models and material textures from Poly Haven and shrink them for the web.

    python3 tools/fetch_assets.py            (needs network access to api.polyhaven.com / dl.polyhaven.org, Pillow)

Writes assets/models/<name>/ (glTF + textures at 512 px) and assets/tex/<name>/{diff,nor,rough}.jpg,
plus assets/tex/manifest.json with each texture's mean colour (used to tint a texture to a style's colour).
"""
import io, json, os, urllib.request
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
UA = {'User-Agent': 'interior-prototype/1.0'}
MODELS = ['modern_arm_chair_01', 'mid_century_lounge_chair', 'modern_coffee_table_01', 'modern_coffee_table_02',
          'coffee_table_round_01', 'industrial_coffee_table', 'modern_wooden_cabinet', 'modern_ceiling_lamp_01',
          'hanging_industrial_lamp', 'potted_plant_02', 'potted_plant_04', 'ceramic_vase_01', 'side_table_01']
# name -> size in px of the diffuse map (floors and walls fill the frame, so they keep more detail)
TEXTURES = {'laminate_floor_02': 1024, 'wood_floor': 1024, 'oak_wood_planks': 1024, 'herringbone_parquet': 1024,
            'plastered_wall': 512, 'concrete_wall_008': 1024, 'poly_wool_herringbone': 512, 'velour_velvet': 512,
            'brown_leather': 512, 'oak_veneer_01': 512, 'walnut_veneer': 512, 'black_oak_veneer': 512, 'ash_veneer': 512}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90).read()


def save_jpg(data, path, size, quality=80):
    im = Image.open(io.BytesIO(data)).convert('RGB')
    if max(im.size) > size:
        im = im.resize((size, size), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, quality=quality, optimize=True)
    return im


def main():
    for name in MODELS:
        d = os.path.join(ROOT, 'models', name)
        if os.path.exists(os.path.join(d, name + '.gltf')):
            continue
        g = json.loads(get(f'https://api.polyhaven.com/files/{name}'))['gltf']['1k']['gltf']
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, name + '.gltf'), 'wb').write(get(g['url']))
        for rel, inc in g['include'].items():
            data = get(inc['url'])
            if rel.endswith('.jpg'):
                save_jpg(data, os.path.join(d, rel), 512)
            else:
                open(os.path.join(d, rel), 'wb').write(data)
        print('model', name)
    manifest = {}
    for name, size in TEXTURES.items():
        d = os.path.join(ROOT, 'tex', name)
        f = None
        for key, out, s in [('Diffuse', 'diff', size), ('nor_gl', 'nor', min(size, 512)), ('Rough', 'rough', 256)]:
            p = os.path.join(d, out + '.jpg')
            if not os.path.exists(p):
                f = f or json.loads(get(f'https://api.polyhaven.com/files/{name}'))
                save_jpg(get(f[key]['1k']['jpg']['url']), p, s)
        im = Image.open(os.path.join(d, 'diff.jpg')).convert('RGB').resize((1, 1), Image.BOX)
        manifest[name] = '#%02x%02x%02x' % im.getpixel((0, 0))
        print('texture', name, manifest[name])
    json.dump(manifest, open(os.path.join(ROOT, 'tex', 'manifest.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
