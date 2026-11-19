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
  { n: '暖白', c: '#f5ede0', p: 1, s: [JP, NO, FR, MO, KR, LX, MD] }, { n: '灰綠', c: '#c9d3c3', p: 2, s: [NO, RE, FR, JP, MC, TW] },
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
  { n: '切斯特皮', c: '#2e3a33', p: 3, m: 'sofa02', s: [IN, RE, MC, HT, LX] },
  { n: '雕花布面', c: '#d8d0c4', p: 3, m: 'sofa01', s: [FR] },
  { n: '雕花皮革', c: '#5a3a28', p: 3, m: 'sheenSofa', s: [FR, RE, MC, HT, IN] },
  { n: '靛藍布', c: '#4a6587', p: 2, m: 'glam', fab: 'rough_linen', s: [MD, HT] },
  { n: '木框布墊', c: '#cfc0a8', p: 2, m: 'woodSofa', s: [WB, JP, TW, BO, MD] },
  // Four more silhouettes (Poly Haven, CC0), so a sofa swap changes the shape, not only the fabric colour.
  { n: '雕花錦緞', c: '#7a5636', p: 3, m: 'sofa03', s: [FR, RE, LX] },
  { n: '羅漢床', c: '#5a2e1e', p: 3, m: 'chineseSofa', s: [TW, WB, RE] },
  { n: '花布躺床', c: '#e6ded2', p: 2, m: 'dayBed', s: [BO, RE, MD, KR] },
  { n: '木長凳', c: '#6e2f22', p: 1, m: 'woodBench', s: [WB, TW, BO, JP] },
  { n: '方塊低沙發', c: '#bfbcb5', p: 1, m: 'blockSofa', fab: 'rough_linen', s: [MO, NO, IN, JP] },
  { n: '雲朵沙發', c: '#efe7da', p: 2, m: 'cloudSofa', fab: 'wool_boucle', s: [KR, NO, MO, LX] },
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
  sofa03: { file: 'sofa-03.glb', slot: 'sofa' },
  // Built in code (room3d.js procSofa), tinted like the GLB sofa.
  blockSofa: { file: 'proc:block', slot: 'sofa', tint: 'fabric' },
  cloudSofa: { file: 'proc:cloud', slot: 'sofa', tint: 'fabric' },
  chineseSofa: { file: 'chinese-sofa.glb', slot: 'sofa' },
  dayBed: { file: 'day-bed.glb', slot: 'sofa' },
  woodBench: { file: 'wooden-bench.glb', slot: 'sofa' },
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
  cnChair: { file: 'chinese-armchair.glb', slot: 'chair', maxH: 1.0 },
  rockChair: { file: 'rocking-chair.glb', slot: 'chair' },
  greenChair: { file: 'green-chair.glb', slot: 'chair', maxH: .95 },
  roundWoodTable: { file: 'coffee-table-02.glb', slot: 'table', maxW: 1.0 },
  classicTable: { file: 'coffee-table-classic.glb', slot: 'table', maxW: 1.2, maxH: .5 },
  cnCabinet: { file: 'chinese-cabinet.glb', slot: 'side', maxH: 2.0 },
  tallCab: { file: 'painted-cabinet-02.glb', slot: 'side', maxH: 1.9 },
  wornShelf: { file: 'worn-bookshelf.glb', slot: 'side', maxH: 2.0 },
  planterBox: { file: 'planter-box.glb', slot: 'plant' },
  bust: { file: 'marble-bust.glb', slot: 'accent', at: 'table', maxH: .35 },
  elephant: { file: 'wooden-elephant.glb', slot: 'accent', at: 'table', scale: 2 },
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
// ---------- tag database ----------
// Every finish and every piece of furniture carries one tag from each group. The preference model learns a weight
// per tag from each answer and uses them to swap single pieces in the next round's options.
const TAG_GROUPS = {
  色溫: ['暖調', '中性', '冷調'], 深淺: ['淺色', '中間色', '深色'],
  材質: ['木', '布', '皮革', '絨布', '毛圈', '編織', '黃銅', '黑鐵', '石材', '磨石', '水泥', '灰泥', '漆面', '陶瓷', '玻璃', '紙', '植物'],
  造型: ['圓弧', '直線', '雕花'], 花樣: ['素面', '花紋', '條紋', '幾何'], 年代: ['現代', '復古', '古典', '自然', '工業'],
};
const PART_TAGS = {
  floor: ['暖調 淺色 木 直線 素面 自然', '暖調 深色 木 直線 素面 復古', '冷調 中間色 木 直線 素面 現代', '中性 淺色 磨石 直線 花紋 復古', '暖調 淺色 木 直線 幾何 古典',
    '冷調 深色 水泥 直線 素面 工業', '冷調 淺色 石材 直線 花紋 古典', '暖調 中間色 木 直線 幾何 復古', '暖調 中間色 木 直線 素面 自然'],
  wall: ['暖調 淺色 漆面 直線 素面 自然', '冷調 淺色 漆面 直線 素面 自然', '暖調 中間色 灰泥 直線 素面 復古', '冷調 淺色 漆面 直線 素面 現代', '暖調 淺色 漆面 直線 素面 自然',
    '冷調 淺色 漆面 直線 素面 現代', '冷調 中間色 水泥 直線 素面 工業', '暖調 淺色 漆面 直線 素面 現代', '暖調 中間色 灰泥 直線 素面 自然', '中性 深色 漆面 直線 素面 復古',
    '中性 淺色 漆面 直線 素面 古典', '冷調 深色 漆面 直線 素面 古典', '冷調 深色 漆面 直線 素面 現代'],
  sofa: ['暖調 淺色 布 圓弧 素面 現代', '冷調 淺色 布 圓弧 素面 現代', '暖調 中間色 皮革 圓弧 素面 復古', '冷調 深色 絨布 圓弧 素面 復古', '冷調 深色 布 圓弧 素面 現代',
    '暖調 淺色 布 圓弧 素面 自然', '暖調 淺色 毛圈 圓弧 素面 現代', '中性 淺色 絨布 圓弧 素面 古典', '冷調 深色 皮革 雕花 素面 古典', '中性 淺色 布 雕花 花紋 古典',
    '暖調 深色 皮革 雕花 素面 古典', '冷調 深色 布 圓弧 素面 現代', '暖調 中間色 木 直線 素面 自然',
    '暖調 深色 皮革 雕花 花紋 古典', '暖調 深色 木 直線 素面 復古', '暖調 淺色 布 直線 花紋 復古', '暖調 深色 木 直線 素面 自然',
    '冷調 淺色 布 直線 素面 現代', '暖調 淺色 毛圈 圓弧 素面 現代'],
  rug: ['暖調 淺色 毛圈 直線 素面 自然', '中性 淺色 布 圓弧 素面 現代', '暖調 深色 布 直線 花紋 古典', '冷調 深色 布 直線 素面 工業', '冷調 淺色 布 直線 素面 現代',
    '暖調 中間色 布 直線 花紋 古典', '暖調 中間色 布 直線 幾何 復古', '冷調 中間色 布 直線 條紋 自然', '暖調 中間色 編織 直線 素面 自然'],
  curtain: ['暖調 淺色 布 直線 素面 自然', '冷調 深色 絨布 直線 素面 現代', '暖調 中間色 木 直線 條紋 自然', '中性 淺色 布 直線 素面 現代', '暖調 中間色 布 直線 素面 復古'],
  lamp: ['暖調 淺色 紙 圓弧 素面 自然', '暖調 中間色 黃銅 雕花 素面 古典', '冷調 深色 黑鐵 直線 素面 工業', '中性 淺色 玻璃 圓弧 素面 現代', '中性 淺色 玻璃 雕花 素面 古典',
    '暖調 深色 黃銅 雕花 素面 復古'],
};
PARTS.forEach(p => p.list.forEach((o, i) => { o.tags = PART_TAGS[p.k][i].split(' '); }));
// Dressing pieces: slot, display name, the styles they fit, tags. A style's own pieces (STYLES.furn) are its defaults;
// the styles listed here are where a piece may be swapped in.
const FURN = {
  coffee: ['table', '木腳茶几', [NO, MO, MC, KR, JP], '暖調 淺色 木 直線 素面 現代'],
  roundTable: ['table', '大理石圓几', [LX, KR, MD, HT, MO, FR], '中性 淺色 石材 圓弧 素面 現代'],
  woodTable: ['table', '原木小茶几', [JP, BO, WB, TW, NO], '暖調 中間色 木 直線 素面 自然'],
  gothicTable: ['table', '雕花茶几', [RE, FR, HT], '暖調 深色 木 雕花 素面 古典'],
  ironTable: ['table', '鐵件茶几', [IN, MO, MC], '冷調 深色 黑鐵 直線 素面 工業'],
  teaTable: ['table', '中式茶几', [WB, TW, JP, RE], '暖調 深色 木 直線 素面 復古'],
  succulent: ['plant', '多肉盆栽', [JP, NO, LX, MD, MO, KR, IN], '中性 中間色 植物 圓弧 素面 自然'],
  bigPlant: ['plant', '大型盆栽', [FR, KR, BO, NO, MD, LX], '中性 中間色 植物 圓弧 素面 自然'],
  potPlant: ['plant', '陶盆植栽', [RE, MC, WB, TW, BO, IN], '暖調 中間色 植物 圓弧 素面 自然'],
  sheenChair: ['chair', '橘色單椅', [NO, MO, KR, MC], '暖調 中間色 布 直線 素面 現代'],
  ottoman: ['chair', '皮革腳凳', [LX, HT, IN, RE], '暖調 深色 皮革 圓弧 素面 現代'],
  frenchChair: ['chair', '法式扶手椅', [FR, LX, HT], '中性 淺色 布 雕花 花紋 古典'],
  loungeChair: ['chair', '中古躺椅', [RE, MC, IN, BO], '暖調 深色 皮革 直線 素面 復古'],
  leatherChair: ['chair', '皮革扶手椅', [IN, MC, HT, RE], '冷調 深色 皮革 直線 素面 工業'],
  dispShelf: ['side', '展示層架', [JP, NO, WB, BO], '暖調 中間色 木 直線 素面 自然'],
  lightShelf: ['side', '白色層架', [NO, BO, KR, MO, MD], '中性 淺色 漆面 直線 素面 現代'],
  drawer: ['side', '復古抽屜櫃', [RE, MC, TW, BO], '暖調 深色 木 直線 素面 復古'],
  steelShelf: ['side', '鐵件層架', [IN, MO], '冷調 深色 黑鐵 直線 素面 工業'],
  paintCab: ['side', '彩繪邊櫃', [KR, MD, FR, BO], '中性 淺色 漆面 雕花 素面 古典'],
  screenCn: ['screen', '中式屏風', [WB, TW], '暖調 深色 木 直線 花紋 古典'],
  vaseOld: ['accent', '青花古瓶', [RE, FR, TW, HT], '冷調 淺色 陶瓷 圓弧 花紋 古典'],
  vaseJp: ['accent', '陶瓷花瓶', [JP, KR, WB, TW, BO, MD, NO], '中性 淺色 陶瓷 圓弧 素面 自然'],
  vaseBrass: ['accent', '黃銅花瓶', [LX, MC, HT, FR, IN], '暖調 中間色 黃銅 圓弧 素面 現代'],
  cnChair: ['chair', '中式扶手椅', [WB, TW, JP, RE], '暖調 深色 木 直線 素面 古典'],
  rockChair: ['chair', '木搖椅', [BO, NO, JP, RE, MD], '暖調 中間色 木 圓弧 素面 自然'],
  greenChair: ['chair', '綠絨單椅', [FR, LX, RE, MC], '冷調 深色 絨布 圓弧 素面 復古'],
  roundWoodTable: ['table', '圓木茶几', [MC, NO, KR, MO, JP], '暖調 中間色 木 圓弧 素面 現代'],
  classicTable: ['table', '古典木茶几', [RE, FR, TW, MC], '暖調 深色 木 直線 素面 古典'],
  cnCabinet: ['side', '中式立櫃', [WB, TW, RE], '暖調 深色 木 直線 花紋 古典'],
  tallCab: ['side', '彩繪高櫃', [KR, MD, FR, BO], '中性 淺色 漆面 直線 素面 復古'],
  wornShelf: ['side', '舊木書架', [IN, RE, BO, TW], '暖調 中間色 木 直線 素面 復古'],
  planterBox: ['plant', '木箱植栽', [BO, IN, NO, MD, RE], '暖調 中間色 植物 直線 素面 自然'],
  bust: ['accent', '大理石胸像', [FR, LX, HT, MO], '冷調 淺色 石材 雕花 素面 古典'],
  elephant: ['accent', '木雕小象', [BO, TW, RE, MC, WB], '暖調 深色 木 雕花 素面 自然'],
};
for (const [k, [slot, n, st, tags]] of Object.entries(FURN)) FURN[k] = { k, slot, n, s: st, tags: tags.split(' ') };
const SLOT_N = { table: '茶几', plant: '植栽', chair: '單椅', side: '邊櫃', screen: '屏風', accent: '擺飾' };
// Every item has exactly one tag from each group; every style's own pieces fit that style.
const ALL_ITEMS = [...PARTS.flatMap(p => p.list), ...Object.values(FURN)];
for (const it of ALL_ITEMS) for (const [g, vocab] of Object.entries(TAG_GROUPS)) console.assert(it.tags.filter(t => vocab.includes(t)).length === 1, `${it.n}: needs one ${g} tag`);
for (const it of ALL_ITEMS) console.assert(it.tags.length === 6, `${it.n}: unknown tag in ${it.tags}`);
for (const [n, st] of Object.entries(STYLES)) for (const [slot, m] of Object.entries(st.furn || {})) if (m) console.assert(FURN[m] && FURN[m].slot === slot && FURN[m].s.includes(n), `${n}: ${slot} ${m} not tagged as fitting`);

// Curated looks: hand-matched combinations, four per style. The viewing step draws from these
// (not from random part swaps), so every choice card is a deliberately composed home.
// [style, name, floor, wall, sofa, rug, curtain, lamp, light]
const LOOKS = [
  [JP, '經典無印', 0, 0, 0, 0, 0, 0, 'golden'],
  [JP, '奶茶編織', 8, 4, 5, 0, 2, 0, 'golden'],
  [JP, '灰綠和紙', 0, 1, 12, 0, 0, 0, 'day'],
  [JP, '深木夜讀', 1, 4, 5, 5, 2, 0, 'dusk'],
  [NO, '經典北歐', 4, 3, 1, 1, 3, 3, 'day'],
  [NO, '霧藍窗光', 0, 5, 17, 4, 3, 3, 'day'],
  [NO, '灰綠木質', 2, 1, 5, 0, 0, 0, 'golden'],
  [NO, '燕麥圓毯', 4, 0, 18, 1, 0, 0, 'day'],
  [RE, '經典復古', 1, 2, 8, 2, 2, 5, 'golden'],
  [RE, '綠絨黃銅', 7, 1, 3, 5, 4, 1, 'dusk'],
  [RE, '奶茶皮革', 4, 4, 2, 5, 2, 1, 'golden'],
  [RE, '磨石雕花', 3, 2, 10, 2, 2, 5, 'dusk'],
  [IN, '經典工業', 5, 6, 4, 3, 1, 2, 'dusk'],
  [IN, '胡桃炭黑', 1, 12, 8, 3, 1, 2, 'dusk'],
  [IN, '灰泥冷調', 2, 8, 10, 4, 1, 2, 'day'],
  [IN, '鐵件暖光', 3, 6, 2, 3, 1, 2, 'golden'],
  [MO, '經典簡約', 2, 3, 1, 4, 3, 3, 'day'],
  [MO, '水泥靜白', 5, 0, 17, 4, 1, 2, 'day'],
  [MO, '大理石冷冽', 6, 3, 1, 1, 3, 3, 'day'],
  [MO, '霧藍點綴', 0, 5, 1, 4, 3, 3, 'golden'],
  [FR, '經典法式', 4, 5, 9, 1, 3, 4, 'golden'],
  [FR, '香檳雕花', 6, 10, 13, 5, 3, 4, 'golden'],
  [FR, '灰綠古典', 4, 1, 3, 5, 0, 1, 'day'],
  [FR, '暖白大理石', 6, 0, 0, 1, 3, 4, 'day'],
  [LX, '經典輕奢', 6, 10, 7, 1, 3, 1, 'golden'],
  [LX, '墨綠金屬', 3, 3, 3, 4, 1, 4, 'dusk'],
  [LX, '奶油大理石', 6, 7, 7, 1, 3, 4, 'day'],
  [LX, '絲絨夜色', 4, 10, 13, 1, 1, 1, 'dusk'],
  [KR, '經典奶油', 0, 7, 6, 0, 3, 0, 'day'],
  [KR, '磨石圓弧', 3, 7, 18, 1, 3, 3, 'day'],
  [KR, '奶茶毛圈', 8, 4, 6, 0, 0, 0, 'golden'],
  [KR, '燕麥窗光', 0, 0, 6, 1, 3, 3, 'day'],
  [MC, '經典中古', 7, 9, 2, 6, 2, 2, 'golden'],
  [MC, '柚木幾何', 7, 2, 2, 6, 4, 5, 'golden'],
  [MC, '橄欖沉穩', 1, 9, 10, 5, 2, 2, 'dusk'],
  [MC, '波斯織光', 8, 2, 2, 2, 2, 5, 'dusk'],
  [WB, '經典侘寂', 8, 8, 12, 0, 0, 0, 'dusk'],
  [WB, '灰泥茶席', 5, 8, 16, 8, 2, 5, 'dusk'],
  [WB, '燕麥禪意', 2, 4, 0, 0, 0, 0, 'golden'],
  [WB, '墨色編織', 8, 6, 6, 8, 2, 0, 'dusk'],
  [TW, '經典台味', 3, 4, 12, 8, 2, 5, 'golden'],
  [TW, '老宅午後', 8, 4, 14, 8, 0, 5, 'day'],
  [TW, '灰綠鐵窗', 8, 1, 12, 8, 2, 5, 'dusk'],
  [TW, '磨石涼蔭', 3, 4, 16, 8, 0, 5, 'day'],
  [BO, '經典波希', 8, 2, 2, 2, 2, 5, 'golden'],
  [BO, '奶茶藤影', 8, 4, 12, 8, 2, 5, 'golden'],
  [BO, '陶土織品', 1, 2, 2, 8, 2, 5, 'dusk'],
  [BO, '木框花毯', 8, 4, 15, 2, 2, 5, 'day'],
  [MD, '經典地中海', 8, 0, 11, 7, 3, 3, 'day'],
  [MD, '靛藍暮色', 8, 11, 11, 0, 0, 3, 'golden'],
  [MD, '磨石海風', 3, 0, 12, 7, 3, 3, 'golden'],
  [MD, '燕麥陽台', 8, 0, 15, 0, 0, 3, 'day'],
  [HT, '經典酒店', 6, 12, 8, 3, 1, 1, 'dusk'],
  [HT, '墨綠大理石', 6, 12, 3, 3, 1, 1, 'dusk'],
  [HT, '靛藍套房', 1, 11, 11, 3, 0, 1, 'dusk'],
  [HT, '香檳晨光', 1, 12, 7, 3, 1, 1, 'golden'],
].map(([style, name, floor, wall, sofa, rug, curtain, lamp, light]) => ({ style, name, floor, wall, sofa, rug, curtain, lamp, light }));
// Every look must be fully compatible with its style and free of known clashes.
for (const lk of LOOKS) for (const p of PARTS) console.assert(p.list[lk[p.k]] && p.list[lk[p.k]].s.includes(lk.style), `look ${lk.style}·${lk.name}: ${p.k} incompatible`);
for (const lk of LOOKS) for (const [ka, na, kb, nb] of CLASH) console.assert(!(PART[ka].list[lk[ka]].n === na && PART[kb].list[lk[kb]].n === nb), `look ${lk.style}·${lk.name}: clash ${na}+${nb}`);
// Taste vector [warmth, ornament, brightness] of a design: half the style's own, half its parts' colours and tiers.
function designX(d) {
  const xs = PARTS.map(p => { const o = PART[p.k].list[d[p.k]], h = o.c.replace('#', ''), [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)), lum = (.3 * r + .59 * g + .11 * b) / 255;
    return [Math.max(-1, Math.min(1, (r - b) / 90)), (o.p - 2) * .6, Math.max(-1, Math.min(1, (lum - .6) * 3))]; });
  return STYLES[d.style].x.map((s, i) => .5 * s + .5 * xs.reduce((a, x) => a + x[i], 0) / xs.length);
}
// Looks are photographed from one of three angles (look i uses LOOK_CAMS[i % 3]): wide, door side, from the sofa.
const LOOK_CAMS = [{ pos: [1.95, 1.45, 1.6], look: [-0.75, 0.7, -1.2], fov: 58 }, { pos: [1.9, 1.35, 1.85], look: [-1.3, .7, -1.3], fov: 56 }, { pos: [0.6, 1.25, 0.6], look: [-0.5, 0.55, -1.4], fov: 56 }];
// A look's vector also carries the light it is shown in.
const LOOK_LIGHT = { day: .25, golden: 0, dusk: -.3 };
const lookX = lk => { const x = designX(lk); x[2] = Math.max(-1, Math.min(1, x[2] + LOOK_LIGHT[lk.light])); return x; };
// Two more taste axes the literature treats as distinct from colour and ornament, read off the tag database:
// curvature (Bar & Neta 2006; Vartanian et al. 2013: people tend to prefer curved forms) and naturalness
// (Kaplan & Kaplan 1989; biophilic design: wood, plants, woven and clay against iron, concrete and glass).
// Both are shares of a room's pieces, scaled so the curated looks span about −1…1.
const AX_CURVE = { 圓弧: 1, 直線: -1 };
const AX_NATURE = { 木: 1, 植物: 1, 編織: 1, 陶瓷: 1, 自然: 1, 黑鐵: -1, 水泥: -1, 玻璃: -1, 工業: -1 };
const axesRaw = items => { const n = Math.max(1, items.length), s = m => items.reduce((a, it) => a + it.tags.reduce((b, t) => b + (m[t] || 0), 0), 0) / n; return [s(AX_CURVE), s(AX_NATURE)]; };
const lookItems = lk => { const f = { ...(STYLES[lk.style].furn || {}), ...(lk.furn || {}) }; return [...PARTS.map(p => p.list[lk[p.k]]), ...Object.values(f).filter(k => k && FURN[k]).map(k => FURN[k])]; };
const AX_SCALE = (() => { const r = LOOKS.map(lk => axesRaw(lookItems(lk))); return [0, 1].map(j => 1 / Math.max(1e-6, ...r.map(x => Math.abs(x[j])))); })();
const axesOf = items => axesRaw(items).map((v, j) => Math.max(-1, Math.min(1, v * AX_SCALE[j])));
// Every style's default room must use options that list the style as compatible.
for (const [name, st] of Object.entries(STYLES)) for (const p of PARTS) console.assert(p.list[st[p.k]].s.includes(name), `${name}: default ${p.k} not compatible`);
window.HB_CATALOG = { JP, NO, RE, IN, MO, FR, LX, KR, MC, WB, TW, BO, MD, HT, LOOKS, LOOK_CAMS, TAG_GROUPS, FURN, SLOT_N, designX, lookX, axesOf, lookItems, AX_CURVE, AX_NATURE, FLOORS, WALLS, SOFAS, RUGS, CURTAINS, LAMPS, PARTS, PART, CLASH, COST, MODELS, STYLES };
})();
