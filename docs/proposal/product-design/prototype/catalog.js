/* Shared catalogue for the prototype and the key-visual studio: element schema, options, 3D models and style presets.
 * Loaded as a classic script before prototype.js and room3d.js; exposes window.HB_CATALOG. */
(() => {
'use strict';
// One element schema shared by locking, the final card, 3D object names, voice commands and the quote.
// p = relative price tier (1–3); s = styles the option is compatible with (re-rolls stay inside these).
// tex = a scanned PBR material in textures/<id>/ (colour, normal, roughness); rep = how often it repeats across the room.
// m = the 3D model an option uses (MODELS below); fab = a fabric normal map laid over a tintable sofa.
const JP = '無印日式', NO = '日光北歐', RE = '暖調復古', IN = '工業風', MO = '現代簡約', FR = '法式古典';
const LX = '輕奢', KR = '韓系奶油', MC = '中古世紀', WB = '侘寂';
const TW = '台式老宅', BO = '波希米亞', MD = '地中海', HT = '沉穩酒店';
const FLOORS = [
  { n: '淺橡木', c: '#d4b48c', p: 2, tex: 'laminate_floor_02', rep: 3, s: [JP, NO, MO, KR] },
  { n: '胡桃木', c: '#6b4430', p: 3, tex: 'plank_flooring_04', rep: 3, s: [RE, JP, IN, MC, HT, BO] },
  { n: '灰色超耐磨', c: '#8b8278', p: 1, tex: 'dark_wooden_planks', rep: 3, s: [MO, IN, NO, WB] },
  { n: '水磨石', c: '#b9ab9a', p: 3, tex: 'terrazzo_tiles', rep: 2.5, s: [MO, IN, RE, LX, KR, TW, MD] },
  { n: '白橡人字拼', c: '#c9a476', p: 3, tex: 'herringbone_parquet', rep: 3, s: [FR, NO, RE, LX, KR] },
  { n: '水泥粉光', c: '#6e6862', p: 2, tex: 'smooth_concrete_floor', rep: 2, s: [IN, MO, WB] },
  { n: '大理石', c: '#ddd6cc', p: 3, tex: 'marble_01', rep: 2, s: [LX, FR, MO, HT] },
  { n: '柚木拼花', c: '#9a6a3c', p: 3, tex: 'rectangular_parquet', rep: 3, s: [MC, RE] },
  { n: '原木地板', c: '#a77b4f', p: 2, tex: 'oak_wood_planks', rep: 3, s: [WB, JP, MC, KR, TW, BO, MD] },
];
// Painted walls share one scanned plaster relief tinted to the paint; tex walls show their own surface.
const WALLS = [
  { n: '暖白', c: '#f5ede0', p: 1, s: [JP, NO, FR, MO, KR, LX, MD] }, { n: '灰綠', c: '#c9d3c3', p: 2, s: [NO, RE, FR, JP, MC] },
  { n: '陶土', c: '#d9a687', p: 2, s: [RE, JP, MC, BO] }, { n: '淺灰', c: '#dcdcd8', p: 1, s: [MO, NO, IN, LX] },
  { n: '奶茶', c: '#e6d3bd', p: 1, s: [JP, FR, RE, KR, WB, TW, BO] }, { n: '霧藍', c: '#c7d3db', p: 2, s: [FR, NO, MO] },
  { n: '清水模', c: '#a9a8a3', p: 3, tex: 'concrete_wall_004', rep: 1.6, s: [IN, MO, WB] },
  { n: '奶油白', c: '#f3e9d6', p: 1, s: [KR, LX, JP] },
  { n: '藝術灰泥', c: '#b9a690', p: 3, tex: 'clay_plaster', rep: 1.4, s: [WB, IN] },
  { n: '橄欖綠', c: '#8d9068', p: 2, s: [MC, RE] }, { n: '香檳灰', c: '#cfc6ba', p: 2, s: [LX, FR] },
  { n: '靛藍', c: '#39547a', p: 2, s: [MD, HT] }, { n: '炭黑', c: '#3b3b3e', p: 2, s: [HT, IN] },
];
const SOFAS = [
  { n: '米色布', c: '#e2d6c2', p: 2, m: 'glam', fab: 'rough_linen', s: [JP, NO, FR, WB] },
  { n: '淺灰布', c: '#c9c9c4', p: 1, m: 'glam', fab: 'rough_linen', s: [NO, MO, JP] },
  { n: '焦糖皮', c: '#a8673b', p: 3, m: 'glam', fab: 'velour_velvet', s: [RE, IN, MC, BO] },
  { n: '墨綠絨', c: '#4f6b58', p: 3, m: 'glam', fab: 'velour_velvet', s: [RE, FR, LX, HT] },
  { n: '深灰布', c: '#5d6168', p: 1, m: 'glam', fab: 'rough_linen', s: [IN, MO] },
  { n: '燕麥色', c: '#d8c6a8', p: 2, m: 'glam', fab: 'rough_linen', s: [JP, FR, NO, WB] },
  { n: '奶油毛圈', c: '#efe6d6', p: 2, m: 'glam', fab: 'wool_boucle', s: [KR, WB, NO] },
  { n: '香檳絨', c: '#d9c3a0', p: 3, m: 'glam', fab: 'velour_velvet', s: [LX, KR, HT] },
  { n: '切斯特皮', c: '#2e3a33', p: 3, m: 'sofa02', s: [IN, RE] },
  { n: '雕花布面', c: '#d8d0c4', p: 3, m: 'sofa01', s: [FR] },
  { n: '雕花皮革', c: '#5a3a28', p: 3, m: 'sheenSofa', s: [FR, RE] },
  { n: '靛藍布', c: '#4a6587', p: 2, m: 'glam', fab: 'rough_linen', s: [MD, HT] },
  { n: '木框布墊', c: '#cfc0a8', p: 2, m: 'woodSofa', s: [WB, JP, TW, BO] },
];
const RUGS = [
  { n: '燕麥圈絨', c: '#e8dcc8', p: 2, s: [JP, NO, KR, WB, MD] }, { n: '白色長毛', c: '#eef0ee', p: 2, round: 1, s: [NO, MO, FR, KR, LX] },
  { n: '磚紅波斯', c: '#9b4a35', p: 3, s: [RE, FR, MC, BO] }, { n: '炭灰短毛', c: '#6f6c67', p: 1, s: [IN, MO, WB, HT] },
  { n: '淺灰素面', c: '#d6d6d2', p: 1, s: [MO, NO, IN, LX] }, { n: '駝色花紋', c: '#c9b08a', p: 3, s: [FR, RE, JP, MC] },
  { n: '幾何花紋', c: '#c58a4a', p: 2, s: [MC, RE] },
  { n: '靛藍條紋', c: '#5a7396', p: 2, s: [MD] }, { n: '焦糖編織', c: '#b07a48', p: 2, s: [BO, TW, WB] },
];
const CURTAINS = [
  { n: '亞麻', c: '#e6dccb', p: 2, s: [JP, NO, FR, KR, WB, TW, MD, HT] }, { n: '遮光絨布', c: '#4a4f5c', p: 2, s: [IN, MO, LX, HT] },
  { n: '木百葉', c: '#c8a77e', p: 3, s: [JP, RE, MC, WB, TW, BO] }, { n: '白紗', c: '#f4f1ea', p: 1, s: [NO, MO, FR, KR, LX, MD] },
  { n: '芥末黃', c: '#c9a24a', p: 2, s: [RE, MC] },
];
const LAMPS = [
  { n: '和紙吊燈', c: '#f2e8d5', p: 1, m: 'globe', s: [JP, NO, KR, WB] },
  { n: '黃銅吊燈', c: '#c9a56a', p: 3, m: 'chandelier02', s: [RE, FR, LX, HT] },
  { n: '黑鐵吊燈', c: '#2f3236', p: 2, m: 'industrialLamp', s: [IN, MO, MC] },
  { n: '白色極簡', c: '#e9e9e6', p: 1, m: 'globe', s: [MO, NO, KR, MD] },
  { n: '水晶燈', c: '#e8e1cf', p: 3, m: 'chandelier01', s: [FR, LX] },
  { n: '復古提燈', c: '#6b5a43', p: 2, m: 'lantern', s: [RE, MC, WB, TW, BO] },
];
// pin = label position on the lock screen's fallback drawing (percent of the room image).
const PARTS = [
  { k: 'floor', n: '地板', list: FLOORS, pin: [70, 90] }, { k: 'wall', n: '牆', list: WALLS, pin: [20, 24] },
  { k: 'sofa', n: '沙發', list: SOFAS, pin: [24, 56] }, { k: 'rug', n: '地毯', list: RUGS, pin: [44, 78] },
  { k: 'curtain', n: '窗簾', list: CURTAINS, pin: [78, 40] }, { k: 'lamp', n: '燈具', list: LAMPS, pin: [46, 18] },
];
const PART = Object.fromEntries(PARTS.map(p => [p.k, p]));
// Pairs that are each fine for the style but clash together; re-rolls skip them.
const CLASH = [['wall', '陶土', 'sofa', '墨綠絨'], ['rug', '磚紅波斯', 'curtain', '芥末黃'], ['wall', '霧藍', 'rug', '磚紅波斯'], ['wall', '橄欖綠', 'sofa', '墨綠絨']];
// Quote per part in NT$ 10k for tiers 1–3, assuming an 8-ping living room.
const COST = { floor: [2.4, 4, 6.4], wall: [1.2, 1.8, 3.2], sofa: [2, 4, 8], rug: [.3, .8, 2], curtain: [.6, 1.2, 2.4], lamp: [.3, .8, 2.5] };
// 3D models (models/CREDITS.md). slot decides placement; tint = materials recoloured to the option; at = 'table' sits on the coffee table.
const MODELS = {
  glam: { file: 'sofa.glb', slot: 'sofa', tint: 'fabric' },
  sofa02: { file: 'sofa-02.glb', slot: 'sofa' },
  sofa01: { file: 'sofa-01.glb', slot: 'sofa' },
  sheenSofa: { file: 'sheen-wood-leather-sofa.glb', slot: 'sofa' },
  globe: { file: 'ceiling-lamp.glb', slot: 'lamp', tint: 'globe|glass' },
  chandelier01: { file: 'chandelier-01.glb', slot: 'lamp', maxH: .9 },
  chandelier02: { file: 'chandelier-02.glb', slot: 'lamp' },
  industrialLamp: { file: 'hanging-industrial-lamp.glb', slot: 'lamp' },
  lantern: { file: 'lantern-chandelier-01.glb', slot: 'lamp', maxH: .85 },
  coffee: { file: 'coffee-table.glb', slot: 'table', rotY: 90 },
  roundTable: { file: 'coffee-table-round-01.glb', slot: 'table', maxW: 1.0 },
  woodTable: { file: 'small-wooden-table-01.glb', slot: 'table' },
  gothicTable: { file: 'gothic-coffee-table.glb', slot: 'table', maxW: 1.1 },
  ironTable: { file: 'industrial-coffee-table.glb', slot: 'table', maxH: .5 },
  teaTable: { file: 'chinese-tea-table.glb', slot: 'table' },
  succulent: { file: 'plant.glb', slot: 'plant', at: 'table', scale: 1.6 },
  bigPlant: { file: 'potted-plant-01.glb', slot: 'plant' },
  potPlant: { file: 'potted-plant-02.glb', slot: 'plant' },
  sheenChair: { file: 'sheen-chair.glb', slot: 'chair' },
  woodSofa: { file: 'wood-sofa.glb', slot: 'sofa' },
  ottoman: { file: 'ottoman.glb', slot: 'chair' },
  dispShelf: { file: 'display-shelves.glb', slot: 'side', rotY: 90 },
  lightShelf: { file: 'light-shelves.glb', slot: 'side' },
  drawer: { file: 'vintage-drawer.glb', slot: 'side', maxW: 1.15 },
  steelShelf: { file: 'steel-shelves.glb', slot: 'side', maxW: 1.4, maxH: 2.0 },
  paintCab: { file: 'painted-cabinet.glb', slot: 'side' },
  screenCn: { file: 'screen-panels.glb', slot: 'screen' },
  vaseOld: { file: 'vase-antique.glb', slot: 'accent', at: 'table' },
  vaseJp: { file: 'vase-ceramic.glb', slot: 'accent', at: 'table' },
  vaseBrass: { file: 'vase-brass.glb', slot: 'accent', at: 'table' },
  frenchChair: { file: 'armchair-01.glb', slot: 'chair' },
  loungeChair: { file: 'mid-century-lounge-chair.glb', slot: 'chair' },
  leatherChair: { file: 'modern-arm-chair-01.glb', slot: 'chair' },
};
// x = position on the taste dimensions (warmth, decoration, light). Part indices are the style's default room.
// furn = the style's own coffee table, plant and accent chair; deco = how many pictures hang above the sofa.
const STYLES = {
  [JP]: { x: [.7, -.7, .6], floor: 0, wall: 0, sofa: 0, rug: 0, curtain: 0, lamp: 0, table: '#b98f60', deco: 0, plant: true, furn: { table: 'woodTable', plant: 'succulent', chair: null, side: 'dispShelf', screen: null, accent: 'vaseJp' }, note: '淺木、米白、低裝飾' },
  [NO]: { x: [0, -.65, 1], floor: 4, wall: 3, sofa: 1, rug: 1, curtain: 3, lamp: 3, table: '#d8c3a0', deco: 1, plant: true, furn: { table: 'coffee', plant: 'succulent', chair: 'sheenChair', side: 'lightShelf', screen: null, accent: null }, note: '白橡、灰調、大量自然光' },
  [RE]: { x: [.8, .6, -.1], floor: 1, wall: 2, sofa: 8, rug: 2, curtain: 2, lamp: 5, table: '#6b4329', deco: 2, plant: true, furn: { table: 'gothicTable', plant: 'potPlant', chair: 'loungeChair', side: 'drawer', screen: null, accent: 'vaseOld' }, note: '胡桃木、陶土、皮革' },
  [IN]: { x: [-.7, .1, -.6], floor: 5, wall: 6, sofa: 4, rug: 3, curtain: 1, lamp: 2, table: '#2f3236', deco: 1, plant: false, furn: { table: 'ironTable', plant: null, chair: 'leatherChair', side: 'steelShelf', screen: null, accent: null }, note: '水泥、黑鐵、深色' },
  [MO]: { x: [-.5, -.8, .4], floor: 2, wall: 3, sofa: 1, rug: 4, curtain: 3, lamp: 3, table: '#3a3a3a', deco: 0, plant: false, furn: { table: 'coffee', plant: null, chair: 'sheenChair', side: null, screen: null, accent: null }, note: '灰白、俐落、無多餘裝飾' },
  [FR]: { x: [.2, .9, .4], floor: 4, wall: 5, sofa: 9, rug: 5, curtain: 0, lamp: 4, table: '#c9a56a', deco: 3, plant: true, furn: { table: 'gothicTable', plant: 'bigPlant', chair: 'frenchChair', side: null, screen: null, accent: 'vaseOld' }, note: '線板、人字拼、柔和色' },
  [LX]: { x: [.1, .5, .5], floor: 6, wall: 10, sofa: 7, rug: 1, curtain: 3, lamp: 1, table: '#c9a56a', deco: 2, plant: true, furn: { table: 'roundTable', plant: 'succulent', chair: 'ottoman', side: null, screen: null, accent: 'vaseBrass' }, note: '大理石、黃銅、絨布' },
  [KR]: { x: [.5, -.3, .8], floor: 0, wall: 7, sofa: 6, rug: 0, curtain: 3, lamp: 0, table: '#e9e1d4', deco: 1, plant: true, furn: { table: 'roundTable', plant: 'bigPlant', chair: null, side: 'paintCab', screen: null, accent: 'vaseJp' }, note: '奶油白、圓弧、柔光' },
  [MC]: { x: [.6, .3, .2], floor: 7, wall: 9, sofa: 2, rug: 6, curtain: 4, lamp: 2, table: '#8a5a3a', deco: 2, plant: true, furn: { table: 'coffee', plant: 'potPlant', chair: 'loungeChair', side: 'drawer', screen: null, accent: 'vaseBrass' }, note: '柚木、皮革、幾何' },
  [WB]: { x: [.4, -.8, -.3], floor: 8, wall: 8, sofa: 12, rug: 0, curtain: 0, lamp: 0, table: '#6b5a43', deco: 0, plant: true, furn: { table: 'teaTable', plant: 'potPlant', chair: null, side: null, screen: 'screenCn', accent: 'vaseJp' }, note: '灰泥、原木、低彩度' },
  [TW]: { x: [.5, .4, .1], floor: 3, wall: 4, sofa: 12, rug: 8, curtain: 2, lamp: 5, table: '#7a4a2e', deco: 2, plant: true, furn: { table: 'teaTable', plant: 'potPlant', chair: null, side: 'drawer', screen: 'screenCn', accent: 'vaseJp' }, note: '水磨石、木百葉、老木家具' },
  [BO]: { x: [.7, .8, .3], floor: 8, wall: 2, sofa: 2, rug: 2, curtain: 2, lamp: 5, table: '#8a5a36', deco: 3, plant: true, furn: { table: 'woodTable', plant: 'bigPlant', chair: null, side: 'lightShelf', screen: null, accent: 'vaseJp' }, note: '陶土、藤木、花紋織品' },
  [MD]: { x: [-.2, -.1, .8], floor: 8, wall: 0, sofa: 11, rug: 7, curtain: 3, lamp: 3, table: '#d9d3c7', deco: 1, plant: true, furn: { table: 'roundTable', plant: 'succulent', chair: null, side: 'paintCab', screen: null, accent: 'vaseJp' }, note: '白牆、靛藍、水洗質感' },
  [HT]: { x: [-.3, .3, -.7], floor: 6, wall: 12, sofa: 7, rug: 3, curtain: 1, lamp: 1, table: '#2e2a26', deco: 1, plant: false, furn: { table: 'roundTable', plant: null, chair: 'ottoman', side: null, screen: null, accent: 'vaseBrass' }, note: '炭黑、黃銅、酒店燈光' },
};
// Every style's default room must use options that list the style as compatible.
for (const [name, st] of Object.entries(STYLES)) for (const p of PARTS) console.assert(p.list[st[p.k]].s.includes(name), `${name}: default ${p.k} not compatible`);
window.HB_CATALOG = { JP, NO, RE, IN, MO, FR, LX, KR, MC, WB, TW, BO, MD, HT, FLOORS, WALLS, SOFAS, RUGS, CURTAINS, LAMPS, PARTS, PART, CLASH, COST, MODELS, STYLES };
})();
