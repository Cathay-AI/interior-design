import { finishFilter, roomScene, saveComparison, stages } from './room-scenes.js';
import { roomDims, roomReferencePlan, wireframeDrawingSet } from './fast-route/lib/drawings.js';
import { designEstimate } from './fast-route/lib/estimate.js';
import { STYLES } from './fast-route/lib/taste.js';
import { LIMITS, roomSize } from './fast-route/lib/layout.js';

const screen = document.querySelector('#screen');
const railLinks = document.querySelectorAll('[data-rail]');
const rail = document.querySelector('.rail');
const menu = document.querySelector('.project-menu');
const catalogue = window.HB_CATALOG;

const rooms = ['客廳', '餐廳', '廚房', '客衛', '主臥', '主衛', '次臥 1', '次臥 2'];
const areas = [9, 4.5, 3, 1.5, 5.5, 1.5, 3.5, 4];
const baseRoomCosts = [
  {floor:[4,7],wall:[2,4],cabinet:[5,10],light:[4,7],curtain:[2,3],furniture:[9,17]},
  {floor:[2,3],wall:[1,2],cabinet:[6,10],light:[2,4],curtain:[2,3],furniture:[5,8]},
  {floor:[3,5],wall:[3,5],cabinet:[14,23],water:[3,5],light:[5,8]},
  {floor:[1,2],wall:[2,3],cabinet:[1,2],fixture:[5,8],water:[4,6],light:[1,2]},
  {floor:[2,4],wall:[2,2],cabinet:[7,12],light:[3,5],curtain:[2,3],furniture:[8,13]},
  {floor:[1,2],wall:[2,3],cabinet:[2,3],fixture:[4,7],water:[4,7],light:[2,3]},
  {floor:[1,2],wall:[1,1],cabinet:[6,10],light:[3,5],curtain:[2,3],furniture:[7,12]},
  {floor:[2,3],wall:[1,2],cabinet:[7,11],light:[3,4],curtain:[2,3],furniture:[8,13]},
];
const looks = ['靜謐橡木', '霧灰', '墨綠'];
const lookNotes = ['橡木、米白、一張紅椅', '霧灰沙發、磚紅單椅', '米白沙發、墨綠單椅'];
const livingFurniture = [
  {key:'chair', label:'單椅', names:['磚紅休閒椅', '墨綠休閒椅'], materials:['磚紅絨布', '墨綠絨布'], colors:['#a64c42','#515936'], extra:[1,1], cut:[1,2], size:'寬 68 × 深 72 × 高 76 公分', materialSpec:'柚木＋絨布', lead:'交期 2–3 週', stock:'現貨示意'},
  {key:'sofa', label:'沙發', names:['米白模組沙發', '霧灰模組沙發'], materials:['米白布', '霧灰布'], colors:['#d5c7af','#919da4'], extra:[1,2], cut:[4,7], size:'寬 240 × 深 95 × 高 78 公分', materialSpec:'亞麻混紡布', lead:'交期 3–4 週', stock:'訂製示意'},
];
const tierOptions = [
  {key:'save', label:'省一點', delta:'－1 萬', adjust:[-1,-1], photo:'./imagery/hq-living-fog.jpg', note:'入門布面款（示意）'},
  {key:'base', label:'現在這款', delta:'—', adjust:[0,0], photo:'./imagery/living-4.webp', note:'目前配置款（示意）'},
  {key:'plus', label:'好一點', delta:'＋2 萬', adjust:[2,2], photo:'./imagery/hq-living-green.jpg', note:'實木旗艦款（示意）'},
];
const roomOptions = [
  livingFurniture[1].names, ['橡木圓餐桌', '胡桃木餐桌'],
  ['淺橡木廚櫃', '暖白廚櫃'], ['橡木浴櫃', '暖白浴櫃'],
  ['橡木床頭板', '亞麻床頭板'], ['懸浮橡木浴櫃', '石紋浴櫃'],
  ['橡木書桌櫃', '淺灰書桌櫃'], ['橡木床架', '胡桃木床架'],
];
const roomItemSpecs = [
  '寬 240 × 深 95 × 高 78 公分・布面', '直徑 120 × 高 75 公分・實木貼皮',
  '寬 260 × 深 60 × 高 85 公分・系統板材', '寬 90 × 深 48 × 高 80 公分・防潮木作',
  '寬 180 × 深 15 × 高 110 公分・木作繃布', '寬 120 × 深 50 × 高 80 公分・防潮木作',
  '寬 160 × 深 60 × 高 210 公分・系統木作', '寬 150 × 深 200 × 高 95 公分・實木框架',
];
const shots = ['站在門口往裡拍', '有窗戶的那一面', '天花板與樑', '插座、開關、冷氣孔'];
const shotTips = [
  ['站在門口往裡拍', '，讓牆角和地板都入鏡。'],
  ['對著有窗戶的那一面拍', '，確認採光方向。'],
  ['手機往上抬一點', '，把天花板和樑拍進來。'],
  ['近拍牆面的插座、開關', '和冷氣孔位置。'],
];
const stageNotes = [
  '範例毛胚空間',
  '淺橡木地板、白牆、柔光捲簾',
  '橡木牆板、懸浮櫃、白色高櫃',
  '模組沙發、黑鐵茶几、紅絨單椅',
  '嵌燈與日光一起看',
];
const genericStageNotes = ['範例毛胚空間', '鋪設地坪並整理牆面', '安裝固定設備或收納', '放入用品與軟裝', '查看完成後的照明'];
const fields = [
  ['格局：三房兩廳兩衛', '範例格局・固定資料', '範例'],
  ['各間尺寸與坪數', '8 個範例空間・點平面圖可改', '範例'],
  ['門窗與採光面', '範例為 6 扇窗、主要採光朝南', '範例'],
  ['範例樑位：主臥床頭上方', '確認你家的實際樑位', '請確認'],
  ['天花板高度', '拍一張地板到天花板的照片，或直接填', '待補'],
  ['給排水與瓦斯位置', '廚房、主衛、客衛・上傳機電圖最準', '待補'],
];
const quizStages = ['回家', '怎麼煮', '怎麼收', '怎麼睡', '誰會來'];
const quizRoomMap = [
  {room:0, hint:'玄關、客廳'},
  {room:2, hint:'廚房、餐廳'},
  {room:0, hint:'客廳、收納櫃'},
  {room:4, hint:'主臥'},
  {room:1, hint:'客廳、餐廳'},
];
const questions = [
  ['回到家第一件事？', ['東西先放好', '進門要有地方收鞋和包'], ['直接進客廳', '玄關越開闊越好']],
  ['平常在家煮飯嗎？', ['幾乎不煮', '外食為主'], ['週末才煮', '偶爾需要備餐的地方'], ['天天煮，還會一起煮', '需要大檯面，兩個人站得開']],
  ['東西怎麼收？', ['都藏起來', '櫃門關上看不到'], ['喜歡的擺出來', '留展示層架']],
  ['怎麼睡得好？', ['怕光也怕吵', '床不要對窗'], ['喜歡自然醒', '讓日光進來']],
  ['誰會來家裡？', ['常有朋友來', '客廳要坐得下'], ['以家人為主', '四個人以內']],
];
const edits = {
  screen: {name:'玄關加屏風櫃', detail:'風水建議', room:0, item:'cabinet', extra:[1,2]},
  bed: {name:'主臥床轉 90 度靠牆', detail:'風水建議', room:4, item:'furniture', extra:[1,1]},
  ceiling: {name:'不動天花板', detail:'法規建議・是否免申請待專業確認', room:0, item:'light', extra:[0,0]},
  lamp: {name:'落地燈', detail:'加一樣東西', room:0, item:'furniture', extra:[1,1]},
  rug: {name:'地毯', detail:'加一樣東西', room:0, item:'furniture', extra:[1,2]},
  entry: {name:'玄關收納櫃', detail:'加一樣東西', room:0, item:'cabinet', extra:[3,5]},
};
const addable = ['lamp', 'rug', 'entry'];
const planMarks = {entry:[0, '玄關收納'], screen:[0, '屏風櫃'], bed:[4, '床轉向']};
const uploadTypes = 'image/*,.pdf,application/pdf,.usdz,.ply,.obj,.e57,.las,.glb';
const teams = [
  ['示意團隊 A', '擅長：木作收邊、新成屋'],
  ['示意團隊 B', '擅長：開放式廚房、系統櫃'],
  ['示意團隊 C', '擅長：老屋翻新、水電重拉'],
];
const briefTags = ['靜謐橡木', '收納都藏起來', '米白為主', '一個重點色', '淺色地板'];
const scanSteps = [
  ['載入範例平面', '三房兩廳兩衛，共 8 個空間'],
  ['載入範例尺寸', '公尺與坪數可在下頁調整'],
  ['載入門窗與採光示例', '以下欄位都來自同一個範例'],
  ['標出可補充欄位', '樑位、天花板與管線可自行確認'],
  ['整理成空間條件', '缺的標待補'],
];
const buildSteps = [
  ['載入法規檢核示例', '示範警報器與逃生動線的檢查項目'],
  ['載入家具配置', '示例家具附尺寸與材質'],
  ['整理示意報價', '列出家具、材料與工項的範例金額'],
  ['準備完工示意圖', '套用所選的客廳風格'],
];

const newDraft = () => ({
  room: 0, style: 0, shot: 0, roomSizes: new Map(), zoomIndex: 1, editRoomSize: false,
  filter: '', regFilter: 'all', fengFilter: 'all', view: '實景', wholeView: '等角',
  changedRooms: new Set(), chairChanged: false, materialTier: 'base', libItem: 'chair',
  tuneMessage: '', photos: [], supplementalPhotos: [], source: null, pendingSource: null, mepFile: '',
  houseAge: null, windowType: '落地窗', scan: {len:562, wid:471, ceil:285, beam:242},
  appliedLayout: false, changes: [], layoutVersion: 1, removed: new Set(), own: [],
  ownDraft: {w:68, d:72, h:76, link:'', photo:''},
  editItem: 'chair', editTab: '換一款', editMessage: '', addOpen: false,
  dismissed: new Set(), fengOn: true, quizStep: 0, quizAnswers: [], prefsShared: false, shareMessage: '',
  unlocked: false, drawing: 'A-01', drawingTab: '平面', comparisonStage: 4, compareSplit: 46,
  floor: '', floorInput: '', note: '', refs: '', tags: briefTags.slice(0, 4),
  teamType: '設計師＋工班', teams: new Set(), sentTeams: [], sentSnapshot: null, sent: false, slotPicked: '',
});

const browseHomes = [
  ['example', 0, 0, '客廳・9 坪', '靜謐橡木', './imagery/living-4.webp'],
  ['example-fog', 0, 1, '客廳・9 坪', '霧灰', './imagery/hq-living-fog.jpg'],
  ['example-dining', 1, 0, '餐廳・4.5 坪', '暖光木質', roomScene(1)],
  ['example-bedroom', 4, 0, '主臥・5.5 坪', '床頭木牆', roomScene(4)],
  ['example-study', 6, 0, '書房・3.5 坪', '整面書牆', roomScene(6)],
];

const projects = new Map([
  ['oak', {name:'新家・客廳', page:'project', draft:newDraft()}],
  ['family', {name:'新家・等角', page:'whole', draft:newDraft()}],
  ['floorplan', {name:'新家・平面', page:'read', draft:newDraft()}],
  ['upload', {name:'爸媽家・客廳', page:'scanning', draft:{...newDraft(),
    pendingSource:{label:'現場照片', files:['爸媽家客廳.jpg']}}}],
  ...browseHomes.map(([id, room, style, label, name]) => [id, {
    name, page:'result', isExample:true, sample:{room, style, title:label.split('・')[0] + '・' + name},
    draft:{...newDraft(), room, style, changedRooms:new Set(style === 1 ? [0] : []), chairChanged:style === 2},
  }]),
]);

let projectId = 'oak';
let draft = projects.get(projectId).draft;
let projectCount = 0;
let dashSearch = '';
const favoriteFurniture = new Map();
const photo = roomScene(0);
const image = (n = draft.style) => [photo, './imagery/hq-living-fog.jpg', './imagery/hq-living-green.jpg'][n];
const premium = ['unlocked', 'edit', 'own', 'quiz', 'profile', 'compliance', 'feng', 'drawings', 'team', 'sent', 'notices'];
const standalone = ['entry', 'homes', 'browse', 'tool', 'camera'];

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value != null && value !== false) node.setAttribute(key, value);
  });
  node.append(...children.flat().filter(value => value != null && value !== false));
  return node;
}

function svg(html) {
  const wrap = document.createElement('span');
  wrap.innerHTML = html.trim();
  return wrap.firstElementChild;
}

const brandMark = (size = 30) => svg(`<svg width="${size}" height="${size}" viewBox="0 0 200 200" aria-hidden="true"><rect x="8" y="8" width="184" height="184" rx="40" fill="#1F1D1A"/><path d="M100 28v26" stroke="#D6D1C8" stroke-width="3"/><path d="M68 116a32 32 0 0 0 64 0Z" fill="#FFFBD6"/><path d="M100 52C66 52 44 80 41 116H159C156 80 134 52 100 52Z" fill="#F6F4EF"/></svg>`);
const liangSvg = (size = 30, dark = false) => svg(dark
  ? `<svg class="liang-icon" width="${size}" height="${size}" viewBox="-6 -6 212 212" aria-hidden="true"><circle cx="100" cy="118" r="84" fill="#FFFFFF" opacity="0.12"/><path d="M100 -6v46" stroke="#D6D1C8" stroke-width="3"/><path d="M62 113a38 38 0 0 0 76 0Z" fill="#FFFFFF"/><path d="M100 44C60 44 34 76 30 113H170C166 76 140 44 100 44Z" fill="#C9A77C"/></svg>`
  : `<svg class="liang-icon" width="${size}" height="${size}" viewBox="-6 -6 212 212" aria-hidden="true"><circle cx="100" cy="118" r="84" fill="#F6F4EF" opacity="0.7"/><path d="M100 -6v46" stroke="#1B2118" stroke-width="3"/><path d="M62 113a38 38 0 0 0 76 0Z" fill="#FFFBD6"/><path d="M100 44C60 44 34 76 30 113H170C166 76 140 44 100 44Z" fill="#1F1D1A"/><circle cx="85.5" cy="130" r="4" fill="#29251F"/><circle cx="114.5" cy="130" r="4" fill="#29251F"/></svg>`);

const ic = (paths, size = 18) => svg(`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`);
const IC = {
  upload: () => ic('<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>', 20),
  camera: () => ic('<path d="M4 8h4l2-3h4l2 3h4v11H4z"/><circle cx="12" cy="13" r="3.5"/>', 20),
  arrow: () => ic('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>', 16),
  lock: (s = 16) => ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', s),
  shield: () => ic('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>', 16),
  compass: () => ic('<circle cx="12" cy="12" r="9"/><path d="m15 9-2 5-4 1 2-5z"/>', 16),
  help: () => ic('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7"/><path d="M12 17h.01"/>', 16),
  list: () => ic('<path d="M5 6h14"/><path d="M5 12h14"/><path d="M5 18h9"/>', 18),
  compare: () => ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 3v18"/>', 18),
  plus: () => ic('<path d="M12 5v14M5 12h14"/>', 18),
  check: () => ic('<path d="m5 12 5 5 9-10"/>', 16),
  pen: () => ic('<path d="M4 20h4L19 9l-4-4L4 16z"/>', 20),
  folder: () => ic('<path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>', 20),
  mic: () => ic('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>', 19),
  home: () => ic('<path d="M4 11l8-7 8 7v9H4z"/><path d="M12 15v2"/>', 18),
  grid: () => ic('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>', 18),
  cube: () => ic('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5"/><path d="M12 12v9"/>', 18),
  heart: () => ic('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>', 18),
  chat: () => ic('<path d="M4 5h16v11H9l-5 4z"/>', 18),
  bell: () => ic('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>', 18),
};

const liangBubble = (...content) => el('div', {class:'liang-bubble'}, liangSvg(30), el('span', {}, ...content));
const actions = (...children) => el('div', {class:'actions'}, ...children);
const stack = (...children) => el('div', {class:'stack'}, ...children);
const workspaceGrid = (left, right, extra = '') => el('div', {class:'workspace-grid ' + extra}, left, right);
const href = (page, id = projectId) => '#' + page + '?project=' + id;
const go = (page, id = projectId) => {
  const target = href(page, id);
  if (location.hash === target) render();
  else location.hash = target;
};
function createProject(page) {
  const id = 'demo-' + ++projectCount;
  projects.set(id, {name:'新家 ' + projectCount, page, draft:newDraft(), isNew:true});
  return id;
}
const link = (name, page, className = 'button') => el('a', {href:href(page),class:className}, name);
const button = (name, click, pressed, className = '') => el('button', {type:'button',class:className,onclick:click,
  ...(pressed == null ? {} : {'aria-pressed':String(Boolean(pressed))})}, name);
const refresh = (change) => (event) => {
  const buttons = Array.from(screen.querySelectorAll('button'));
  const index = buttons.indexOf(event.currentTarget);
  change();
  render(false);
  if (index >= 0) screen.querySelectorAll('button')[index]?.focus({preventScroll:true});
};
const pill = (text, tone = 'linen') => el('span', {class:'pill ' + tone}, text);
const picker = (label, attrs, fn, className = 'button picker pill-btn') => el('label', {class:className}, label,
  el('input', {type:'file','aria-label':label,...attrs,onchange:fn}));
const price = (values) => values.join('–') + ' 萬';
const roomArea = (i = draft.room, projectDraft = draft) => {
  const size = knownRoomSize(i, projectDraft);
  return size ? Math.round(size.w * size.d / 3.3058 * 10) / 10 : areas[i];
};
function knownRoomSize(index, projectDraft = draft) {
  if (index === 0 && projectDraft.source?.label === 'LiDAR 掃描檔') {
    return {w:projectDraft.scan.len / 100, d:projectDraft.scan.wid / 100, h:projectDraft.scan.ceil / 100};
  }
  return projectDraft.roomSizes.get(index);
}
const roomKind = (i = draft.room) => ['客廳','餐廳','廚房','衛浴','臥室','衛浴','臥室','臥室'][i];
const setRoom = i => {
  if (i !== draft.room) draft.zoomIndex = 1;
  draft.room = i;
};
const roomLook = (projectDraft = draft) => ({
  ...STYLES.muji,
  name: looks[projectDraft.style],
  sofa: livingFurniture[1].colors[Number(projectDraft.changedRooms.has(0))],
  chairFabric: livingFurniture[0].colors[Number(projectDraft.chairChanged)],
});
const houseAge = (projectDraft = draft) => projectDraft.houseAge === '中古屋' ? '中古屋' : '新成屋';
const roomCondition = () => {
  const size = knownRoomSize(draft.room);
  const living = draft.room === 0;
  return {
    space:draft.room === 6 ? '書房' : roomKind(), ping:roomArea(), age:houseAge(),
    len:size?.w, wid:size?.d, height:size?.h,
    windowType:living && draft.source?.label === 'LiDAR 掃描檔' ? draft.windowType : undefined,
    removed:living ? [...draft.removed] : [],
  };
};

function referenceRoom() {
  const condition = roomCondition();
  return {...roomSize(condition, condition.ping), space:condition.space, windowType:condition.windowType,
    removed:condition.removed, openKitchen:condition.space === '廚房' && draft.appliedLayout, reference:true};
}

const dimensionLabel = size => {
  const {w, d, h} = roomDims(size);
  return w + ' × ' + d + ' × ' + h + ' mm';
};

// 3D WebGL viewer (kept for 等角 live 3D mode)
let scene;
let modelModule;
let modelAttempts = 0;
function loadModel() {
  if (!modelModule) {
    const url = new URL('./fast-route/lib/room3d.js', import.meta.url);
    if (modelAttempts) url.searchParams.set('retry', String(modelAttempts));
    modelModule = import(url.href).catch(error => {
      modelModule = undefined;
      modelAttempts++;
      throw error;
    });
  }
  return modelModule;
}
async function showModel(container, zoomOut, zoomIn, retry, notice, size, look) {
  retry.hidden = zoomOut.hidden = zoomIn.hidden = true;
  notice.textContent = '載入 3D';
  delete container.dataset.ready;
  const fail = () => {
    if (!container.isConnected) return;
    scene?.dispose();
    scene = undefined;
    zoomOut.hidden = zoomIn.hidden = true;
    retry.hidden = false;
    notice.textContent = '3D 無法載入，顯示同房間平面';
  };
  try {
    const { mountRoom3D } = await loadModel();
    if (!container.isConnected) return;
    scene = mountRoom3D(container, look, 'A', size, fail, draft.zoomIndex);
    const zoom = delta => {
      const {index, atMin, atMax} = scene.zoomBy(delta);
      draft.zoomIndex = index;
      zoomOut.disabled = atMin;
      zoomIn.disabled = atMax;
      notice.textContent = '縮放 ' + [0.8, 1, 1.25, 1.5][index] + '×';
    };
    zoomOut.onclick = () => zoom(-1);
    zoomIn.onclick = () => zoom(1);
    zoomOut.hidden = zoomIn.hidden = false;
    zoom(0);
  } catch {
    fail();
  }
}
function modelControls(container, size, look) {
  const zoomOut = el('button', {type:'button','aria-label':'縮小 3D'}, '−');
  const zoomIn = el('button', {type:'button','aria-label':'放大 3D'}, '＋');
  const notice = el('small', {role:'status'});
  const restart = () => showModel(container, zoomOut, zoomIn, retry, notice, size, look);
  const retry = button('重試 3D', async () => { await restart(); });
  const controls = el('div', {class:'model-controls'}, notice, zoomOut, zoomIn, retry);
  return {controls, restart};
}

const addPrices = ([low, high], [extraLow, extraHigh]) => [low + extraLow, high + extraHigh];
const sumCosts = items => items.reduce((total, item) => addPrices(total, item.values), [0,0]);

function roomCostItems(index = draft.room, changeKeys = draft.changes, projectDraft = draft) {
  const space = roomKind(index);
  const baseline = baseRoomCosts[index];
  const cond = {space, ping:roomArea(index, projectDraft), age:houseAge(projectDraft)};
  const look = roomLook(projectDraft);
  const defaultTerms = designEstimate({...cond, ping:areas[index]}, look).items;
  const adjustments = new Map();
  const add = (key, values) => adjustments.set(key, addPrices(adjustments.get(key) ?? [0,0], values));

  if (projectDraft.changedRooms.has(index)) {
    const materialExtra = index === 0 ? livingFurniture[1].extra : [1,2];
    add(baseline.furniture ? 'furniture' : 'cabinet', materialExtra);
  }
  if (index === 0 && projectDraft.chairChanged) add('furniture', livingFurniture[0].extra);
  if (index === 0 && projectDraft.materialTier !== 'base') {
    const t = tierOptions.find(x => x.key === projectDraft.materialTier);
    if (t) add('furniture', t.adjust);
  }
  for (const key of changeKeys) {
    const change = edits[key];
    if (change.room === index) add(change.item, change.extra);
  }
  if (index === 0) for (const item of livingFurniture) {
    if (projectDraft.removed.has(item.key)) add('furniture', item.cut.map(value => -value));
  }

  return designEstimate(cond, look).items.map(({key, name, basis, low, high}, i) => {
    const terms = defaultTerms[i];
    const areaDelta = [Math.round(low - terms.low), Math.round(high - terms.high)];
    const [min, max] = baseline[key] ? addPrices(baseline[key], areaDelta) : [Math.round(low), Math.round(high)];
    const sized = [Math.max(0, min), Math.max(0, min, max)];
    return {name, basis, values:addPrices(sized, adjustments.get(key) ?? [0,0])};
  });
}

function groupCosts(items) {
  const groups = new Map();
  for (const {name, values} of items) {
    groups.set(name, addPrices(groups.get(name) ?? [0,0], values));
  }
  return Array.from(groups, ([name, values]) => ({name, values}));
}
function homeCosts(changeKeys = draft.changes) {
  const byRoom = rooms.map((_, index) => roomCostItems(index, changeKeys));
  return {byRoom, wholeHome:groupCosts(byRoom.flat())};
}
function costDetails(label, items) {
  const entries = items.map(({name, values, basis}) => el('li', {},
    el('span', {}, el('strong', {}, name), basis && el('small', {}, basis)),
    el('strong', {}, price(values))));
  return el('details', {class:'cost-details'}, el('summary', {}, label, el('span', {'aria-hidden':'true'}, '▾')),
    el('div', {class:'cost-breakdown'},
      el('small', {}, '依工項列出示意區間，實際單價與工法在現場丈量後確認。'),
      el('ul', {class:'rows'}, entries)));
}
const estimate = () => price(sumCosts(roomCostItems()));
const itemChanged = (key, projectDraft = draft) => key === 'chair' ? projectDraft.chairChanged : projectDraft.changedRooms.has(0);
function selectItem(key, changed) {
  if (key === 'chair') draft.chairChanged = changed;
  else if (changed) draft.changedRooms.add(0);
  else draft.changedRooms.delete(0);
  draft.layoutVersion++;
}
function setStyle(style) {
  draft.style = style;
  if (style === 1) draft.changedRooms.add(0);
  else draft.changedRooms.delete(0);
  draft.chairChanged = style === 2;
}
const hqLivingVariants = {
  'sofa': './imagery/hq-living-fog.jpg',
  'chair': './imagery/hq-living-green.jpg',
  'sofa-chair': './imagery/hq-living-fog-green.jpg',
};
function projectPhoto(stage = stages.length - 1, projectDraft = draft) {
  if (projectDraft.room === 0 && stage === stages.length - 1) {
    const variant = ['sofa', 'chair'].filter(key => itemChanged(key, projectDraft)).join('-');
    if (variant && hqLivingVariants[variant]) return hqLivingVariants[variant];
  }
  return roomScene(projectDraft.room, stage, projectDraft.appliedLayout);
}

// Navigation phase bar (exact 3-step bar from N* artboards)
const phaseDefs = [
  ['確認空間條件', '免費', 'read', ['entry','camera','scanning','conditions','read']],
  ['看成品與報價', '免費', 'style', ['brief','style','generating','result','project','whole','materials','compare']],
  ['編輯與圖面', '付費', 'unlock', ['unlock', ...premium]],
];
function phaseNav(page, compact = false) {
  const activeIdx = phaseDefs.findIndex(([,,,ids]) => ids.includes(page));
  return el('nav', {
    class: compact ? 'phase-compact' : 'panel-phase',
    'aria-label': '設計階段',
  }, phaseDefs.map(([name, label, target], i) => {
    const targetPage = draft.unlocked && target === 'unlock' ? 'edit' : target;
    const isCurrent = i === activeIdx;
    const isDone = i < activeIdx;
    return el('a', {
      href: href(targetPage),
      ...(isCurrent ? {'aria-current':'step'} : {}),
      ...(isDone ? {'data-done':'true'} : {}),
    },
    !compact && el('span', {class:'bar','aria-hidden':'true'}),
    compact && el('span', {}, ['空間條件', '風格與報價', '編輯與圖面'][i]),
    !compact && el('span', {class:'phase-row'},
      el('span', {}, name),
      el('span', {class:'phase-tag' + (label === '付費' ? ' paid' : '')}, label)));
  }));
}

function workPanel({page, addon = false, eyebrowText, titleText, titleId, headerRight, body = [], footer = [], extraClass = ''}) {
  return el('section', {class:'work-panel ' + extraClass, 'data-panel':page},
    addon
      ? el('div', {class:'addon-bar'},
          el('a', {href:href('project'), class:'back-link'}, '‹ 回這個家'),
          pill('加值', 'linen'))
      : phaseNav(page, false),
    el('div', {class:'panel-body'},
      eyebrowText && el('span', {class:'eyebrow'}, eyebrowText),
      titleText && (headerRight
        ? el('div', {style:'display:flex;align-items:center;justify-content:space-between;gap:12px'},
            el('h1', titleId ? {id:titleId, tabindex:'-1'} : {}, titleText), headerRight)
        : el('h1', titleId ? {id:titleId, tabindex:'-1'} : {}, titleText)),
      ...body),
    footer.length > 0 && el('footer', {class:'panel-footer'}, ...footer));
}

function tuneForm(hub = false) {
  const form = el('form', {class: hub ? 'hub-tune' : 'result-tune', onsubmit: event => {
    event.preventDefault();
    const request = event.currentTarget.querySelector('input').value.trim();
    const sofa = /沙發/.test(request);
    const chair = /單椅|休閒椅/.test(request);
    const alternate = sofa ? /灰/.test(request) : /綠/.test(request);
    const original = sofa ? /米白|米色|淺色/.test(request) : /紅/.test(request);
    if (sofa !== chair && alternate !== original) {
      const item = livingFurniture.find(item => item.key === (sofa ? 'sofa' : 'chair'));
      selectItem(item.key, alternate);
      draft.tuneMessage = item.label + '已更新為' + item.names[Number(alternate)] + '。';
      draft.view = '實景';
    } else {
      draft.tuneMessage = '示意版可以換沙發（米白／霧灰）或單椅（磚紅／墨綠）。';
    }
    render(false);
    screen.querySelector((hub ? '.hub-tune' : '.result-tune') + ' input')?.focus({preventScroll:true});
  }},
  hub && liangSvg(30),
  el('input', {
    type:'text', 'aria-label':'想改什麼？說一句話', required:'',
    placeholder: hub ? '想改什麼？說一句話，例如「沙發換霧灰」' : '想改什麼？說一句話（例：沙發換霧灰）',
  }),
  el('button', {type:'submit', class:'primary', 'aria-label':'套用微調'}, '套用'));
  return [form, draft.tuneMessage && el('p', {role:'status', class:'muted', style:'font-size:13px'}, draft.tuneMessage)];
}

const changedRoom = () => draft.changedRooms.has(draft.room);
const featuredItem = () => roomOptions[draft.room][changedRoom() ? 1 : 0];
const roomButtons = () => el('div', {class:'room-options', role:'group', 'aria-label':'房間'},
  rooms.map((name, i) => button(name, refresh(() => setRoom(i)), draft.room === i)));

function editPlanRoom(index) {
  setRoom(index);
  draft.editRoomSize = true;
  render(false);
  screen.querySelector('.room-size-fields input')?.focus();
}

function planDiagram(projectDraft, openKitchen, selectRoom, marks = []) {
  return el('div', {class:'plan', role:'group', 'aria-label':'平面圖示意', 'data-open-kitchen':String(Boolean(openKitchen))},
    rooms.map((name, index) => {
      const area = roomArea(index, projectDraft) + ' 坪';
      const attrs = {class:'plan-room'};
      if (selectRoom) Object.assign(attrs, {
        type:'button', 'aria-label': name + ' ' + area,
        'aria-pressed': String(projectDraft.room === index), onclick: selectRoom(index),
      });
      return el(selectRoom ? 'button' : 'div', attrs,
        el('span', {}, name), el('small', {}, area),
        index === 2 && openKitchen && el('small', {class:'plan-island'}, '中島'),
        marks.filter(key => planMarks[key]?.[0] === index).map(key => el('small', {class:'plan-mark'}, planMarks[key][1])));
    }),
    el('span', {class:'plan-hall'}, '走道'));
}

// Floating pins over plan (left%, top%, text, tone)
function planStage({topPill, pins = [], legend = false, scanLine = false, editable = false, highlightRoom = null, marks = []}) {
  const tempDraft = highlightRoom != null ? {...draft, room: highlightRoom} : draft;
  const wrap = el('div', {class:'plan-wrap'},
    planDiagram(tempDraft, draft.appliedLayout, editable ? index => () => editPlanRoom(index) : index => refresh(() => setRoom(index)), marks),
    scanLine && el('span', {class:'scan-line','aria-hidden':'true'}),
    ...pins.map(([left, top, text, tone]) =>
      el('span', {class:'plan-float-pin ' + tone, style:`left:${left}%;top:${top}%`, 'aria-hidden':'true'}, text)));
  return el('div', {class:'plan-stage'},
    topPill && el('div', {class:'stage-pill'}, topPill),
    wrap,
    legend && el('div', {class:'plan-legend'},
      el('span', {}, pill('✓', 'green'), '範例'),
      el('span', {}, pill('?', 'linen'), '待補'),
      el('span', {}, pill('!', 'ink'), '請確認')));
}

const previewViews = ['實景', '等角', '平面'];
function preview({topPill = '', hotspots = false, onSpot = null, activeSpot = 'chair', showQuote = false, viewKey = 'view', hubTitle = false, extraOverlay = null} = {}) {
  const currentView = draft[viewKey];
  let content;
  let cameraControls;
  if (currentView === '實景') {
    content = el('div', {class:'media'},
      el('img', {src:projectPhoto(), alt:rooms[draft.room] + '・風格參考照', style:'filter:' + finishFilter(0)}),
      !hubTitle && el('div', {class:'stage-pill'}, topPill ? topPill + '・風格參考照' : '風格參考照'),
      hotspots && (onSpot
        ? [
            el('button', {type:'button', class:'hotspot' + (activeSpot === 'chair' ? ' white' : ''), style:'left:80%;top:62%', 'aria-label':'查看單椅', onclick:() => onSpot('chair')}),
            el('button', {type:'button', class:'hotspot' + (activeSpot === 'sofa' ? ' white' : ''), style:'left:47%;top:80%', 'aria-label':'查看沙發', onclick:() => onSpot('sofa')}),
          ]
        : [
            el('a', {class:'hotspot white', href:href('materials'), style:'left:80%;top:62%', 'aria-label':'查看單椅與材質'}),
            el('a', {class:'hotspot', href:href('materials'), style:'left:47%;top:80%', 'aria-label':'查看沙發與材質'}),
          ]),
      showQuote && el('div', {class:'stage-quote'},
        el('small', {}, rooms[draft.room] + '・初步報價（示意）'),
        el('strong', {}, estimate())));
  } else {
    const size = referenceRoom();
    const look = roomLook();
    const isModel = currentView === '等角';
    const name = rooms[draft.room];
    const dims = dimensionLabel(size);
    const plan = roomReferencePlan(size, look);
    content = el('div', {class:'media reference-stage' + (isModel ? ' model' : ''), role:'group', 'aria-label':name + '空間參考'},
      el('img', {class:'reference-plan', src:'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(plan), alt:name + '單室平面配置・' + dims}),
      el('div', {class:'reference-meta'},
        el('strong', {}, (hubTitle ? '' : name + '・') + (isModel ? '3D 配置參考' : '單室平面')),
        el('small', {class:'reference-dimensions', 'aria-label':'配置尺寸（長、寬、高）'}, dims),
        el('small', {}, (size.windowType ?? '範例門窗') + '・待現場丈量')));
    if (isModel) {
      const model = modelControls(content, size, look);
      cameraControls = model.controls;
      model.restart();
    }
  }
  return el('div', {class:'room-preview', 'data-view':currentView},
    el('div', {class:'view-modes', role:'group', 'aria-label':'房間檢視'},
      previewViews.map(v => button(v, refresh(() => { draft[viewKey] = v; }), currentView === v))),
    content, currentView === '實景' && extraOverlay, cameraControls);
}

function stageSource(label, file, newProject = false) {
  const id = newProject ? createProject('entry') : projectId;
  projects.get(id).draft.pendingSource = {label, files:[file.name]};
  go('scanning', id);
}
function upload(event, isPlan = true) {
  const file = event.target.files[0];
  const scan = file && /\.(?:usdz|ply|obj|e57|las|glb)$/i.test(file.name);
  if (!file) return;
  if (isPlan) {
    stageSource(scan ? 'LiDAR 掃描檔' : '平面圖', file);
  } else {
    draft.mepFile = file.name;
    render(false);
    screen.querySelector('[data-mep-file]')?.focus({preventScroll:true});
  }
}
function usePhotos() {
  const files = draft.photos.filter(Boolean);
  if (files.length) draft.pendingSource = {label:'現場照片', files, supplemental:Boolean(draft.source)};
  draft.photos = [];
  draft.shot = 0;
}
function confirmSource() {
  if (!draft.pendingSource) return;
  const pending = draft.pendingSource;
  if (pending.supplemental) {
    draft.supplementalPhotos = [...new Set([...draft.supplementalPhotos, ...pending.files])];
  } else {
    draft.source = pending;
    draft.mepFile = '';
    draft.supplementalPhotos = [];
  }
  draft.pendingSource = null;
}

function roomSizeForm() {
  const index = draft.room;
  const size = draft.roomSizes.get(index);
  const dimension = (name, value, [min,max]) => el('label', {}, name, el('input', {
    type:'number', name, min, max, step:0.01, required:'', value:value ?? '',
  }));
  return el('form', {class:'stack', style:'padding-top:8px', onsubmit:event => {
    event.preventDefault();
    const [w, d] = [...event.currentTarget.querySelectorAll('input')].map(input => input.valueAsNumber);
    draft.roomSizes.set(index, {w, d});
    render(false);
  }},
  el('small', {role:'status'}, size ? '已儲存手改尺寸，重選平面圖會保留。' : '點左邊平面圖房間可切換並修改尺寸。'),
  el('div', {style:'display:grid;grid-template-columns:1fr 1fr;gap:8px', class:'room-size-fields'},
    dimension('長度（公尺）', size?.w, LIMITS.w), dimension('寬度（公尺）', size?.d, LIMITS.d)),
  el('button', {type:'submit'}, '儲存' + rooms[index] + '尺寸'));
}

function startUpload(newProject) {
  const error = el('p', {class:'upload-error', role:'status'});
  const input = el('input', {type:'file', accept:uploadTypes, 'aria-labelledby':'upload-label', 'aria-describedby':'upload-hint',
    onchange:event => {
      const file = event.currentTarget.files[0];
      if (!file) return;
      const pdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const imageFile = file.type.startsWith('image/') || /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|tiff?|webp)$/i.test(file.name);
      const scan = /\.(?:usdz|ply|obj|e57|las|glb)$/i.test(file.name);
      if (!pdf && !imageFile && !scan) {
        event.currentTarget.value = '';
        error.textContent = '請選圖片、PDF 或掃描檔，再試一次。';
        return;
      }
      error.textContent = '';
      stageSource(scan ? 'LiDAR 掃描檔' : pdf ? '平面圖' : '現場照片', file, newProject);
    }});
  return el('div', {class:'start-options'},
    el('label', {class:'start-upload'}, input,
      el('span', {class:'upload-copy'},
        el('span', {id:'upload-label'},
          el('strong', {class:'upload-desktop'}, '上傳平面圖或照片'),
          el('strong', {class:'upload-mobile'}, '拍照或上傳平面圖')),
        el('small', {id:'upload-hint'}, '建商平面圖、現場照片、LiDAR 掃描檔都可以')),
      el('span', {class:'upload-icon upload-desktop', 'aria-hidden':'true'}, IC.upload()),
      el('span', {class:'upload-icon upload-mobile', 'aria-hidden':'true'}, IC.camera())),
    el('small', {class:'upload-demo-note'}, '試玩使用固定格局與圖片。選檔只記錄檔名。'),
    error);
}

const badgeTone = (val) => {
  if (['讀到了', '含', '沒問題', '範例尺寸'].includes(val)) return 'green';
  if (['待補', '要處理', '付費', '已開啟'].includes(val)) return 'red';
  if (['待現場丈量'].includes(val)) return 'ink';
  return 'linen';
};
const detailRows = items => el('ul', {class:'detail-rows'}, items.map(([name, detail, value]) =>
  el('li', {},
    el('span', {}, el('strong', {}, name), detail && el('small', {}, detail)),
    value && pill(value, badgeTone(value)))));

function drawingSheets() {
  const cond = roomCondition();
  const look = roomLook();
  return wireframeDrawingSet(cond, look, designEstimate(cond, look), '2026-11-19', draft.appliedLayout);
}
function stylePrice(style) {
  const keep = [draft.style, draft.changedRooms.has(0), draft.chairChanged];
  setStyle(style);
  const value = price(sumCosts(roomCostItems(0)));
  draft.style = keep[0];
  if (keep[1]) draft.changedRooms.add(0); else draft.changedRooms.delete(0);
  draft.chairChanged = keep[2];
  return value;
}

let ticker;
function stagedProgress(steps, label, onProgress) {
  const fill = el('span');
  const progress = el('div', {class:'anim-bar', role:'progressbar', 'aria-label':label, 'aria-valuemin':0, 'aria-valuemax':100}, fill);
  const items = steps.map(([title, detail]) => el('li', {class:'scan-step'},
    el('span', {class:'scan-mark','aria-hidden':'true'}),
    el('span', {}, el('strong', {}, title), el('small', {}, detail)),
    el('span', {class:'pill linen'})));
  const status = el('small', {role:'status'});
  let done = matchMedia('(prefers-reduced-motion: reduce)').matches ? steps.length : 0;
  const paint = () => {
    items.forEach((item, index) => {
      const state = index < done ? '已完成' : index === done ? '進行中' : '待處理';
      item.dataset.state = state;
      item.querySelector('.scan-mark').textContent = index < done ? '✓' : '';
      const b = item.querySelector('.pill');
      b.textContent = state;
      b.className = 'pill ' + (index < done ? 'green' : index === done ? 'ink' : 'linen');
      if (index === done) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    const percent = Math.round(100 * done / steps.length);
    fill.style.width = percent + '%';
    progress.setAttribute('aria-valuenow', percent);
    status.textContent = percent === 100 ? '都好了。' : '';
    onProgress(percent, done);
  };
  paint();
  if (done < steps.length) ticker = setInterval(() => {
    done++;
    paint();
    if (done >= steps.length) clearInterval(ticker);
  }, 900);
  return [progress, el('ol', {class:'scan-steps', 'aria-label':label}, items), status];
}

function setChange(key, on) {
  if (draft.changes.includes(key) === on) return;
  draft.changes = on ? [...draft.changes, key] : draft.changes.filter(value => value !== key);
  draft.layoutVersion++;
}
function prefSuggestions() {
  if (!draft.prefsShared) return [];
  const answers = draft.quizAnswers;
  return [answers[0] === 0 && 'entry', answers[3] === 0 && 'bed'].filter(Boolean);
}
function complianceFindings() {
  const keep = draft.changes.includes('ceiling');
  return [
    {id:'permit', name:'室內裝修許可', where:'客廳・餐廳', pin:[58, 30], source:'建築法規示例',
      detail:keep ? '這一版不動天花板，固定櫃以活動家具處理（是否免申請仍需專業確認）。' : '天花板和固定櫃要施工，開工前可能需要申請。',
      status:keep ? '沒問題' : '要處理', advice:!keep && '不動天花板，減少申請需求',
      adopt:!keep && (() => setChange('ceiling', true))},
    {id:'alarm', name:'住宅用火災警報器', where:'客廳', pin:[38, 14], source:'消防法規示例',
      detail:keep ? '天花板不動，警報器維持原位。' : '天花板重做時，警報器要保留或補裝。', status:keep ? '沒問題' : '要處理'},
    {id:'flame', name:'裝修材料耐燃等級', where:'全室', pin:[88, 15], source:'建築法規示例',
      detail:draft.floor ? '已補：' + draft.floor + ' 樓，交由專業人員確認。' : '要知道你家在第幾樓才能判斷。',
      status:draft.floor ? '待覆核' : '待補資料'},
    {id:'sprinkler', name:'撒水頭淨空', where:'全室', pin:[64, 62], source:'消防法規示例',
      detail:'依這個範例的空間資料，沒有撒水頭。', status:'沒問題'},
  ];
}
function fengFindings() {
  const stove = !draft.changes.includes('screen');
  const bed = !draft.changes.includes('bed');
  return [
    {id:'stove', name:'開門見灶', where:'大門 → 廚房', pin:[80, 22], source:'風水規則示例',
      detail:stove ? '從大門看得到爐火。' : '已加屏風櫃擋住視線。',
      status:stove ? '要處理' : '沒問題', advice:stove && '玄關加屏風櫃',
      adopt:stove && (() => setChange('screen', true))},
    {id:'bed', name:'床頭靠窗', where:'主臥', pin:[14, 74], source:'風水規則示例',
      detail:bed ? '床頭貼著窗。' : '床頭已改靠實牆。',
      status:bed ? '要處理' : '沒問題', advice:bed && '床轉 90 度靠牆',
      adopt:bed && (() => setChange('bed', true))},
    {id:'hall', name:'穿堂', where:'大門 → 落地窗', pin:[25, 12], source:'風水規則示例',
      detail:'有玄關櫃擋住。', status:'沒問題'},
    {id:'door', name:'大門方位', where:'大門', pin:[52, 10], source:'風水規則示例',
      detail:'需要大門朝向才能判斷。', status:'待補資料'},
  ];
}
const openFindings = (findings, prefix) =>
  findings.filter(item => item.status === '要處理' && !draft.dismissed.has(prefix + item.id)).length;
function findingBadgeLabel(label, findings, prefix) {
  const open = openFindings(findings, prefix);
  const missing = findings.filter(item => item.status === '待補資料').length;
  const review = findings.filter(item => item.status === '待覆核').length;
  if (open && missing) return label + ' ' + open + ' 要處理・' + missing + ' 待補';
  if (open) return label + ' ' + open + ' 要處理';
  if (missing) return label + ' 0 要處理・' + missing + ' 待補';
  if (review) return label + ' 待覆核 ' + review;
  return label + ' 沒問題';
}
function findingCounts(findings, prefix) {
  const count = status => findings.filter(item => item.status === status).length;
  const open = openFindings(findings, prefix);
  const skipped = count('要處理') - open;
  return '要處理 ' + open + '・待補 ' + count('待補資料') + (count('待覆核') ? '・待覆核 ' + count('待覆核') : '') +
    (skipped ? '・不處理 ' + skipped : '') + '・沒問題 ' + count('沒問題');
}
function findingList(findings, prefix, filter = 'all') {
  const adviceNote = prefix === 'c:'
    ? '（示意建議，是否需要申請由專業人員確認）'
    : '（傳統習俗參考，採納與否由你決定）';
  return findings.map((item, index) => {
    const key = prefix + item.id;
    const dismissed = item.status === '要處理' && draft.dismissed.has(key);
    const open = item.status === '要處理' && !dismissed;
    const displayStatus = dismissed ? '不處理' : item.status;
    if (filter === 'open' && !open) return null;
    if (filter === 'missing' && !['待補資料', '待覆核'].includes(item.status)) return null;
    if (filter === 'ok' && item.status !== '沒問題') return null;
    const tone = open ? 'red' : item.status === '沒問題' ? 'green' : 'linen';
    return el('article', {class:'check-result'},
      el('span', {class:'check-num' + (tone === 'green' ? ' ok' : tone === 'linen' ? ' linen' : '')}, String(index + 1)),
      el('div', {class:'check-body'},
        el('h3', {}, item.name, el('small', {}, item.where)),
        el('p', {}, item.detail),
        open && item.advice && el('p', {}, el('strong', {}, '建議：'), item.advice, el('small', {}, ' ' + adviceNote)),
        el('small', {}, '來源：' + item.source + (prefix === 'c:' ? '・條號待專業確認' : '')),
        item.id === 'flame' && el('form', {class:'inline-floor', onsubmit:event => {
          event.preventDefault();
          draft.floor = draft.floorInput;
          render(false);
        }},
        el('label', {style:'margin:0;font-size:13px'}, '你家在第幾樓？',
          el('input', {type:'number', min:'1', max:'200', step:'1', required:'', placeholder:'樓層',
            value:draft.floorInput, oninput:event => { draft.floorInput = event.target.value; }})),
        el('button', {type:'submit', style:'min-height:44px;border-radius:12px'}, '儲存樓層並重查')),
        open && actions(
          item.adopt && el('button', {type:'button', class:'primary', style:'min-height:44px;border-radius:14px;font-size:13px',
            'aria-label':'採納，回編輯套用：' + item.advice,
            onclick:() => { item.adopt(); draft.editMessage = '已採納「' + item.advice + '」。'; go('edit'); }}, '採納，回編輯套用'),
          el('button', {type:'button', 'aria-label':'不處理：' + item.name, onclick:refresh(() => draft.dismissed.add(key))}, '不處理')),
        dismissed && actions(el('button', {type:'button', 'aria-label':'改回要處理：' + item.name,
          onclick:refresh(() => draft.dismissed.delete(key))}, '改回要處理'))),
      pill(displayStatus, tone));
  }).filter(Boolean);
}

// Compare widget (shared by N46_Compare & NT1_Tool)
function compareWidget(beforeSrc, afterSrc, rightLabel = '完成', initialSplit = 46, onSplit) {
  let split = initialSplit;
  const before = el('img', {src:beforeSrc, alt:'毛胚空房間示意'});
  const after = el('img', {src:afterSrc, alt:rightLabel + '示意'});
  const divider = el('span', {class:'compare-divider', 'aria-hidden':'true'});
  const handle = el('span', {class:'compare-handle', 'aria-hidden':'true'}, IC.compare());
  const apply = value => {
    split = Math.max(0, Math.min(100, Number(value)));
    after.style.clipPath = `inset(0 0 0 ${split}%)`;
    divider.style.left = split + '%';
    handle.style.left = split + '%';
    if (onSplit) onSplit(split);
  };
  const range = el('input', {
    type:'range', min:'0', max:'100', value:String(split),
    class:'compare-range-overlay', 'aria-label':'毛胚與完成比較拉桿',
    oninput:event => apply(event.target.value),
  });
  apply(split);
  const rightTag = el('span', {class:'compare-tag-r'}, rightLabel);
  const stage = el('div', {class:'compare-stage media compare'},
    before, after, divider, handle, range,
    el('span', {class:'compare-tag-l'}, '毛胚'),
    rightTag);
  const setAfter = (src, label) => {
    after.src = src;
    after.alt = label + '示意';
    rightTag.textContent = label;
  };
  return {stage, before, after, getSplit: () => split, setAfter};
}

const drawingImage = (sheet, className = 'drawing') => el('img', {class:className,
  src:'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sheet.svg), alt:sheet.no + ' ' + sheet.title + ' · 示意'});

function cadFrame(sheet, {blurred = false, sharpen = false, stamp = 'AI 初稿・待設計師覆核', showTitleblock = false} = {}) {
  return el('div', {class:'cad-sheet-wrap' + (blurred ? ' blurred' : '') + (sharpen ? ' sharpen' : '')},
    el('div', {class:'cad-inner'},
      drawingImage(sheet, 'drawing'),
      stamp && el('span', {class:'cad-stamp'}, stamp)),
    showTitleblock && el('div', {class:'cad-titleblock'},
      el('span', {}, el('strong', {}, sheet.title), el('br'), '你家・三房兩廳'),
      el('span', {}, '圖號', el('br'), el('strong', {}, sheet.no)),
      el('span', {}, '覆核', el('br'), el('strong', {}, '待覆核')),
      el('span', {}, '版本', el('br'), el('strong', {}, '第 ' + draft.layoutVersion + ' 版'))));
}

// ===== MY HOMES DASHBOARD (ND_Dash) =====
const resumePage = project => project.draft.pendingSource ? 'scanning' : project.page;
const projectProgress = {
  entry:'新建', camera:'進行中', scanning:'解析中', read:'待補', conditions:'待補', brief:'進行中', style:'進行中',
  project:'初步報價', result:'初步報價', whole:'進行中', unlocked:'編輯中', edit:'編輯中', own:'編輯中', quiz:'編輯中', profile:'編輯中',
  compliance:'法規細評', feng:'編輯中', drawings:'施工圖', team:'團隊對接', sent:'團隊對接',
};

function homesPage() {
  const entries = [...projects].filter(([, p]) => !p.isExample);
  const cardThumbs = {
    oak: './imagery/living-4.webp',
    family: './imagery/iso-living.jpg',
    floorplan: './imagery/top-living.jpg',
    upload: './imagery/hq-living-bare.jpg',
  };
  const projectCard = ([id, project]) => {
    const state = project.draft;
    const page = resumePage(project);
    const stage = projectProgress[page] ?? '進行中';
    const thumb = cardThumbs[id] ?? projectPhoto(stages.length - 1, state);
    const status = stage === '團隊對接' && state.sent ? '示意已送件' : stage;
    const sub = id === 'oak' ? '靜謐橡木・示意價 ' + price(sumCosts(roomCostItems(0, state.changes, state)))
      : id === 'family' ? '三房兩廳・整戶估價'
      : id === 'floorplan' ? '待補 2 項'
      : state.pendingSource?.files[0] ?? '剛上傳照片';
    return el('article', {class:'home-project'},
      el('div', {class:'home-project-visual'}, el('img', {src:thumb, alt:project.name + '預覽'})),
      el('div', {class:'home-project-info'},
        el('div', {class:'home-project-meta'},
          el('a', {href:href(page, id), class:'home-project-link'}, project.name),
          el('small', {}, sub)),
        pill(status, 'linen')));
  };
  const recent = el('div', {class:'recent-homes'});
  const filterProjects = () => {
    const query = dashSearch.trim().toLowerCase();
    const visible = entries.filter(([, project]) =>
      project.name.toLowerCase().includes(query) || rooms[project.draft.room].includes(query));
    recent.replaceChildren(...(visible.length ? visible.map(projectCard)
      : [el('p', {class:'muted'}, '找不到符合「' + dashSearch + '」的專案。')]));
  };
  filterProjects();
  const quickCard = (icon, title, sub, target, isUpload = false) => {
    if (isUpload) {
      return el('label', {class:'dash-quick-card'},
        el('input', {type:'file', accept:uploadTypes, style:'position:absolute;inset:0;opacity:0;cursor:pointer', onchange:event => {
          const file = event.target.files[0];
          if (file) stageSource(/\.(?:usdz|ply|obj|e57|las|glb)$/i.test(file.name) ? 'LiDAR 掃描檔' : '平面圖', file, true);
        }}),
        el('span', {class:'dash-quick-icon', style:'background:#D6D1C8'}, icon),
        el('b', {}, title), el('span', {}, sub));
    }
    return el('a', {href:target, class:'dash-quick-card'},
      el('span', {class:'dash-quick-icon'}, icon),
      el('b', {}, title), el('span', {}, sub));
  };
  return el('div', {class:'dash-shell'},
    el('aside', {class:'dash-aside', 'aria-label':'我的家選單'},
      el('a', {href:'#entry', class:'dash-brand'}, brandMark(30), '空間設計'),
      el('a', {href:'#homes', class:'dash-nav-item', 'aria-current':'page'}, IC.home(), '總覽'),
      el('a', {href:href('project', 'oak'), class:'dash-nav-item'}, IC.grid(), '我的家'),
      el('a', {href:'#browse', class:'dash-nav-item'}, IC.cube(), '風格範本'),
      el('a', {href:href('materials', 'oak'), class:'dash-nav-item'}, IC.heart(), '家具與材質'),
      el('a', {href:href('whole', 'oak'), class:'dash-nav-item'}, IC.list(), '報價與清單'),
      el('a', {href:href('drawings', 'oak'), class:'dash-nav-item'}, IC.folder(), '施工圖'),
      el('a', {href:href('notices', 'oak'), class:'dash-nav-item'}, IC.bell(), '通知'),
      el('span', {class:'dash-aside-sec'}, '空間'),
      el('a', {href:href('project', 'oak'), class:'dash-nav-item'}, IC.folder(), '新家・三房兩廳'),
      el('a', {href:href(resumePage(projects.get('upload')), 'upload'), class:'dash-nav-item'}, IC.folder(), '爸媽家・客廳'),
      el('span', {style:'flex:1'}),
      el('a', {href:'#homes?section=favorites', class:'dash-nav-item'}, IC.heart(), '收藏'),
      el('a', {href:'#homes?section=help', class:'dash-nav-item'}, IC.help(), '說明與客服'),
      el('a', {href:'#tool', class:'dash-nav-item'}, IC.help(), '免費小工具')),
    el('div', {class:'dash-main'},
      el('div', {class:'dash-topbar'},
        el('h1', {}, '歡迎回家'),
        el('input', {type:'text', class:'dash-search', 'aria-label':'搜尋專案或房間', placeholder:'搜尋專案或房間',
          value:dashSearch, oninput:event => { dashSearch = event.target.value; filterProjects(); }}),
        el('a', {href:'#entry', class:'dash-new-btn'}, '＋ 新的家')),
      el('section', {class:'stack'},
        el('b', {style:'font-size:14px'}, '從哪裡開始'),
        el('div', {class:'dash-quick-grid'},
          quickCard(IC.upload(), '上傳平面圖', '以範例體驗空間條件', '#entry', true),
          quickCard(IC.camera(), '現場拍照', '跟著引導拍幾張', href('camera', 'oak')),
          quickCard(IC.chat(), '說一句話', '描述你想要的家', href('brief', 'oak')),
          quickCard(IC.cube(), '逛風格範本', '先看感覺挑方向', '#browse'),
          quickCard(IC.heart(), '家具與材質', '每一件都有尺寸', href('materials', 'oak')))),
      el('section', {class:'stack'},
        el('b', {style:'font-size:14px'}, '最近的家'),
        recent),
      el('div', {class:'dash-bottom'},
        el('section', {class:'dash-panel'},
          el('div', {class:'dash-panel-head'},
            el('div', {}, el('b', {style:'display:block;font-size:14px'}, '同一個家，三種看法'), el('small', {}, '風格照看材質，等角和平面對照配置')),
            el('a', {href:href('project', 'oak'), class:'text-link', style:'font-size:13px'}, '打開這個家')),
          el('div', {class:'dash-views'},
            ...[['實景', el('img', {src:'./imagery/living-4.webp', alt:''})], ['等角', IC.cube()], ['平面', IC.grid()]].map(([view, visual]) =>
              el('a', {href:href('project', 'oak') + '&view=' + encodeURIComponent(view), class:'dash-view-tile'},
                visual, el('span', {}, view))))),
        el('section', {class:'dash-panel'},
          el('div', {class:'dash-panel-head'},
            el('div', {}, el('b', {style:'display:block;font-size:14px'}, '你家用到的家具'), el('small', {}, '示意型錄，點了就能換')),
            el('a', {href:href('materials', 'oak'), class:'text-link', style:'font-size:13px'}, '看全部')),
          el('div', {class:'dash-furn'},
            [['模組沙發', '48% 92%'], ['黑鐵長茶几', '72% 86%'], ['紅絨休閒椅', '78% 66%'], ['橡木懸浮櫃', '10% 62%']].map(([name, pos]) =>
              el('a', {href:href('materials', 'oak'), class:'dash-furn-card'},
                el('span', {class:'thumb'}, el('img', {src:'./imagery/living-4.webp', alt:'', style:'transform-origin:' + pos})),
                el('b', {}, name), el('small', {}, 'NT$ 示意')))))),
      el('section', {id:'dash-favorites', class:'dash-panel', tabindex:'-1'},
        el('h2', {}, '我收藏的家具'),
        favoriteFurniture.size ? el('ul', {class:'rows'}, [...favoriteFurniture.values()].map(name => el('li', {}, name)))
          : el('p', {class:'muted'}, '還沒有收藏。可從「家具與材質」把喜歡的款式加入試玩收藏。')),
      el('section', {id:'dash-help', class:'dash-panel', tabindex:'-1'},
        el('h2', {}, '說明與客服'),
        el('p', {class:'muted'}, '試玩使用固定格局、參考圖及示意價格。選檔只記錄名稱，模擬送件不會聯絡團隊。試玩版尚未開放客服。'))));
}

// ===== SCANNING PAGE (N15_Reading) =====
function scanningPage() {
  const cancelPage = draft.source || draft.roomSizes.size ? 'read' : 'entry';
  const cancel = () => {
    draft.pendingSource = null;
    projects.get(projectId).page = cancelPage;
  };
  const kind = draft.pendingSource?.label;
  const fileName = draft.pendingSource?.files?.[0] ?? '建商平面圖.pdf';
  const title = '準備範例空間條件';
  const scanStage = planStage({topPill:'已選' + (kind ?? '檔案') + '：' + fileName, scanLine:true});
  const progress = stagedProgress(scanSteps, '示意解析進度', (_, done) => {
    scanStage.classList.toggle('scan-complete', done === scanSteps.length);
  });
  const ages = [['預售屋', '還沒交屋'], ['新成屋', '剛交屋'], ['中古屋', '住過、要翻新']].map(([name, note]) =>
    el('button', {type:'button', class:'choice-card', 'aria-pressed':String(draft.houseAge === name), onclick:event => {
      draft.houseAge = name;
      for (const node of event.currentTarget.parentElement.children) node.setAttribute('aria-pressed', String(node === event.currentTarget));
    }}, el('strong', {}, name), el('small', {}, note)));
  return workspaceGrid(
    scanStage,
    workPanel({
      page:'scanning', eyebrowText:'01 空間解析', titleText:title,
      body:[
        el('p', {class:'muted'}, '這是解析流程示意。下頁會顯示固定範例平面與尺寸。'),
        ...progress,
        el('div', {class:'stack', style:'margin-top:auto'},
          el('b', {id:'age-question', style:'font-size:15px'}, '等的時候問你一題：這間房子是？'),
          el('div', {class:'age-choices', role:'group', 'aria-labelledby':'age-question'}, ages),
          el('small', {}, '只影響報價怎麼算，不答也能繼續。')),
      ],
      footer:[
        el('a', {href:href(cancelPage), class:'button secondary', onclick:cancel}, '取消'),
        el('a', {href:href('read'), class:'button primary', onclick:confirmSource}, '確認範例空間'),
      ],
    }));
}

// ===== EDIT PAGE (N62_Layout) =====
function editPage() {
  setRoom(0);
  const range = values => values[0] === values[1] ? values[0] + ' 萬' : price(values);
  const baseVariant = key => (key === 'sofa' && draft.style === 1) || (key === 'chair' && draft.style === 2) ? 1 : 0;
  const variantPhoto = (key, variant) => {
    const sofa = key === 'sofa' ? Boolean(variant) : itemChanged('sofa');
    const chair = key === 'chair' ? Boolean(variant) : itemChanged('chair');
    const parts = [sofa && 'sofa', chair && 'chair'].filter(Boolean).join('-');
    return (parts && hqLivingVariants[parts]) || photo;
  };
  const editedRows = () => {
    const list = [];
    for (const item of livingFurniture) {
      const base = baseVariant(item.key);
      if (draft.removed.has(item.key)) {
        list.push({name:item.label, detail:'已拿掉', cost:'－' + range(item.cut), undo:() => { draft.removed.delete(item.key); draft.layoutVersion++; }});
      } else if (Number(itemChanged(item.key)) !== base) {
        const current = Number(itemChanged(item.key));
        list.push({name:item.label, detail:item.materials[base] + ' → ' + item.materials[current],
          cost:(current ? '＋' : '－') + range(item.extra), undo:() => selectItem(item.key, Boolean(base))});
      }
    }
    for (const key of draft.changes) {
      const change = edits[key];
      list.push({name:change.name, detail:change.detail,
        cost:change.extra[1] ? '＋' + range(change.extra) : '免加價', undo:() => setChange(key, false)});
    }
    draft.own.forEach((piece, index) => list.push({
      name:'你自己的家具', detail:piece.w + ' × ' + piece.d + ' × ' + piece.h + ' 公分・屋主自備',
      cost:'不計入報價', undo:() => { draft.own.splice(index, 1); draft.layoutVersion++; },
    }));
    return list;
  };
  const item = livingFurniture.find(entry => entry.key === draft.editItem) ?? livingFurniture[0];
  const current = Number(itemChanged(item.key));
  const removed = draft.removed.has(item.key);
  const rerender = selector => {
    render(false);
    screen.querySelector(selector)?.focus({preventScroll:true});
  };
  const spot = (entry, left, top, tagLeft = false) => el('button', {
    type:'button', class:'edit-spot' + (tagLeft ? ' tag-left' : ''), 'aria-label':'選' + entry.label,
    'aria-pressed':String(draft.editItem === entry.key), style:`left:${left};top:${top}`,
    onclick:() => { draft.editItem = entry.key; draft.editTab = '換一款'; rerender('.edit-spot[aria-pressed="true"]'); },
  }, el('span', {class:'spot-tag', 'aria-hidden':'true'}, entry.label));
  const decorSpot = (label, shortTag, left, top) => el('button', {
    type:'button', class:'edit-spot', 'aria-label':'點看' + label,
    'aria-pressed':'false', style:`left:${left};top:${top}`,
    onclick:() => { draft.editMessage = label + '於示意版固定，可點沙發、單椅換款，或按「＋ 加一樣東西」。'; rerender('.edit-form input'); },
  }, el('span', {class:'spot-tag', 'aria-hidden':'true'}, shortTag));
  const removedNames = livingFurniture.filter(e => draft.removed.has(e.key)).map(e => e.label);
  const syncParts = [];
  if (removedNames.length) syncParts.push('清單已移除：' + removedNames.join('、'));
  if (draft.changes.length) syncParts.push('已加 ' + draft.changes.length + ' 項');
  if (draft.own.length) syncParts.push('屋主自備 ' + draft.own.length + ' 件');

  const stage = el('div', {class:'media edit-stage'},
    el('img', {src:projectPhoto(), alt:'客廳 · 目前的設計示意'}),
    el('div', {class:'stage-pill'}, '點照片上的家具標籤，就能換款或換材質'),
    syncParts.length > 0 && el('div', {class:'edit-sync-note', role:'status'}, syncParts.join('・') + '（照片示意未更新）'),
    spot(livingFurniture[1], '47%', '80%'),
    decorSpot('橡木收納櫃', '收納櫃', '13%', '62%'),
    decorSpot('茶几與地毯', '茶几', '30%', '86%'),
    spot(livingFurniture[0], '82%', '65%', true),
    el('div', {class:'edit-stage-actions'},
      el('button', {type:'button', class:'edit-stage-add', onclick:() => {
        draft.addOpen = true;
        rerender('.add-drawer summary');
      }}, IC.plus(), '加一樣東西')),
    el('div', {class:'stage-quote', role:'status', 'aria-label':'改完的報價'},
      el('small', {}, '改完的報價・示意'),
      el('strong', {}, price(sumCosts(roomCostItems(0))))));

  const bodyTab = draft.editTab === '拿掉'
    ? stack(
        el('p', {class:'muted'}, removed ? item.label + '已拿掉，報價已扣掉這一件。示意圖不會更新。' : '拿掉後報價會扣掉這一件。示意圖不會更新。'),
        actions(button(removed ? '放回' + item.label : '拿掉' + item.label, () => {
          if (removed) draft.removed.delete(item.key);
          else draft.removed.add(item.key);
          draft.layoutVersion++;
          draft.editMessage = removed ? item.label + '放回來了。' : item.label + '已拿掉。';
          rerender('.tab-body button');
        })))
    : draft.editTab === '換材質'
      ? stack(
          el('div', {class:'swatch-grid', role:'group', 'aria-label':item.label + '的材質'},
            item.materials.map((mat, variant) => el('button', {
              type:'button', class:'swatch-btn', 'aria-pressed':String(!removed && current === variant),
              onclick:() => {
                draft.removed.delete(item.key);
                selectItem(item.key, Boolean(variant));
                draft.editMessage = item.label + '材質已換成' + mat + '。';
                rerender('.swatch-grid [aria-pressed="true"]');
              },
            }, el('span', {class:'swatch-dot', style:'background:' + item.colors[variant]}),
            el('span', {style:'display:flex;flex-direction:column;line-height:1.3'},
              el('strong', {}, mat),
              el('small', {}, variant === baseVariant(item.key) ? '原本的' : (variant ? '＋' : '－') + range(item.extra)))))),
          el('small', {}, '點色票會同步切換實景照片與報價。'))
      : el('div', {class:'option-cards', role:'group', 'aria-label':item.label + '的款式'},
          item.names.map((name, variant) => el('button', {
            type:'button', class:'option-card', 'aria-pressed':String(!removed && current === variant),
            onclick:() => {
              draft.removed.delete(item.key);
              selectItem(item.key, Boolean(variant));
              draft.editMessage = item.label + '換成' + name + '。';
              rerender('.option-cards [aria-pressed="true"]');
            },
          },
          el('span', {class:'furniture-thumb ' + item.key}, el('img', {src:variantPhoto(item.key, variant), alt:''})),
          el('strong', {}, item.materials[variant]),
          el('small', {}, variant === baseVariant(item.key) ? '原本的' : (variant ? '＋' : '－') + range(item.extra)))),
          el('a', {href:href('own'), class:'own-card'},
            el('span', {class:'own-icon', 'aria-hidden':'true'}, IC.upload()),
            el('strong', {}, '放你自己的'),
            el('small', {}, '照片或連結')));

  const form = el('form', {class:'result-tune edit-form', onsubmit:event => {
    event.preventDefault();
    const request = event.currentTarget.querySelector('input').value.trim();
    const target = /沙發/.test(request) ? 'sofa' : /椅/.test(request) ? 'chair' : item.key;
    const entry = livingFurniture.find(value => value.key === target);
    const alternate = target === 'sofa' ? /灰/.test(request) : /綠/.test(request);
    const original = target === 'sofa' ? /米白|米色|淺色/.test(request) : /紅/.test(request);
    if (alternate !== original) {
      draft.removed.delete(target);
      selectItem(target, alternate);
      draft.editItem = target;
      draft.editMessage = entry.label + '換成' + entry.names[Number(alternate)] + '。';
    } else {
      draft.editMessage = '示意版聽得懂：沙發換霧灰或米白、單椅換墨綠或磚紅。';
    }
    rerender('.edit-form input');
  }},
  el('input', {type:'text', 'aria-label':'或說一句話', required:'', placeholder:'或說一句話：單椅換墨綠'}),
  el('button', {type:'submit', class:'primary', 'aria-label':'套用這句話'}, '套用'));

  const changed = editedRows();
  const suggested = prefSuggestions();
  const more = [...addable, 'bed'].filter(key => !draft.changes.includes(key) && (key !== 'bed' || suggested.includes('bed')));
  const compList = complianceFindings();
  const fengList = fengFindings();
  const compLabel = findingBadgeLabel('法規', compList, 'c:');
  const fengLabel = draft.fengOn ? findingBadgeLabel('風水', fengList, 'f:') : '風水 未納入';

  return workspaceGrid(stage, workPanel({
    page:'edit', extraClass:'edit-panel', eyebrowText:'03 編輯你的家・客廳示意', titleText:item.label,
    body:[
      el('div', {class:'segmented edit-tabs', role:'group', 'aria-label':'怎麼改'},
        ['換一款', '換材質', '拿掉'].map(tab => button(tab, refresh(() => { draft.editTab = tab; }), draft.editTab === tab, 'seg-btn'))),
      el('div', {class:'tab-body'}, bodyTab),
      form,
      el('small', {}, '示意版示範客廳：沙發換霧灰／米白、單椅換墨綠／磚紅。'),
      draft.editMessage && el('p', {role:'status', style:'font-size:13px;font-weight:600'}, draft.editMessage),
      el('details', {class:'add-drawer add-menu', ...(draft.addOpen ? {open:''} : {}),
        ontoggle:event => { if (event.currentTarget.isConnected) draft.addOpen = event.currentTarget.open; }},
        el('summary', {}, '＋ 加一樣東西'),
        stack(
          more.length
            ? el('div', {class:'actions', style:'padding-top:6px'}, more.map(key => button('＋ ' + edits[key].name + (suggested.includes(key) ? '（生活測驗）' : ''), () => {
                setChange(key, true);
                draft.editMessage = '已加入' + edits[key].name + '。示意圖不會更新。';
                rerender('.edit-form input');
              }, null, 'pill-btn')))
            : el('small', {}, '示意版能加的都加了。'),
          el('small', {}, '加的東西會進報價與施工清單；示意圖不會更新。'))),
      el('div', {class:'stack', style:'gap:6px'},
        el('h2', {style:'font-size:13px'}, '你改過的 ', el('small', {}, '第 ' + draft.layoutVersion + ' 版')),
        changed.length
          ? el('ul', {class:'rows edited-rows'}, changed.map(row => el('li', {},
              el('span', {}, el('strong', {}, row.name), ' ', el('small', {}, row.detail)),
              el('span', {style:'font-size:13px;white-space:nowrap'}, row.cost),
              el('button', {type:'button', class:'undo-link', 'aria-label':'復原：' + row.name, onclick:() => {
                row.undo();
                draft.editMessage = '已復原「' + row.name + '」。';
                rerender('.edit-form input');
              }}, '復原'))))
          : el('small', {}, '還沒改過。點照片上的圓點，或從上面選。')),
      el('div', {class:'check-links'},
        el('a', {href:href('compliance'), class:'check-pill-link', 'aria-label':compLabel},
          IC.shield(), el('span', {}, '法規'), el('span', {class:'chk-val'}, compLabel.replace(/^法規\s*/, ''))),
        el('a', {href:href('feng'), class:'check-pill-link', 'aria-label':fengLabel},
          IC.compass(), el('span', {}, '風水'), el('span', {class:'chk-val'}, fengLabel.replace(/^風水\s*/, '')))),
    ],
    footer:[
      link('回這個家', 'project', 'button secondary'),
      link('改好了，出施工圖', 'drawings', 'button primary'),
    ],
  }));
}

// ===== OWN FURNITURE PAGE (N63_Upload) =====
function ownPage() {
  setRoom(0);
  const size = roomSize(roomCondition(), roomArea(0));
  const piece = draft.ownDraft;
  const availW = Math.round(size.w * 100 - 240 - 60);
  const availD = Math.round(size.d * 100 - 240);
  const availH = draft.source?.label === 'LiDAR 掃描檔' ? draft.scan.ceil : 285;
  const fit = () => {
    if (!(piece.w > 0 && piece.d > 0 && piece.h > 0)) return [false, '請填寬、深、高。', '請輸入有效尺寸'];
    if (piece.w > 400 || piece.d > 400 || piece.h > 400) return [false, '超出單件家具輸入上限（400 公分）。', '超出輸入上限'];
    const gapW = availW - piece.w;
    const gapD = availD - piece.d;
    const gapH = availH - piece.h;
    if (gapH < 0) return [false, '放不下：高度超過天花板高度（' + availH + ' 公分）' + -gapH + ' 公分。', '超過天花板高度'];
    if (gapW < 0) return [false, '放不下：寬度超過可用寬度（' + availW + ' 公分）' + -gapW + ' 公分。', '寬度放不下'];
    if (gapD < 0) return [false, '放不下：深度超過可用進深（' + availD + ' 公分）' + -gapD + ' 公分。', '深度放不下'];
    const aisle = Math.min(gapW, gapD);
    if (aisle < 60) return [false, '放不下：走道不足（只剩 ' + aisle + ' 公分，至少需要 60 公分才能通行）。', '走道不足・放不下'];
    if (aisle >= 75) return [true, '放得下。旁邊走道還有 ' + aisle + ' 公分（寬、深、高皆已檢查）。', '走道還有 ' + aisle + ' 公分'];
    return [true, '放得下，但走道只剩 ' + aisle + ' 公分，會有點擠（寬、深、高皆已檢查）。', '走道只剩 ' + aisle + ' 公分'];
  };
  const initial = fit();
  const stageCaption = el('div', {class:'floating', role:'status', style:'left:auto;right:16px;bottom:16px'}, initial[2]);
  const fitText = el('span', {class:'own-fit', role:'status'}, initial[1]);
  const fitCard = el('div', {class:'own-fit-card' + (initial[0] ? '' : ' bad')},
    el('span', {class:'fit-ic', 'aria-hidden':'true'}, initial[0] ? '✓' : '!'), fitText);
  const submit = el('button', {type:'submit', form:'own-form', class:'primary', ...(initial[0] ? {} : {disabled:''})}, '放進我家');
  const update = () => {
    const [ok, text, cap] = fit();
    fitText.textContent = text;
    fitCard.classList.toggle('bad', !ok);
    fitCard.querySelector('.fit-ic').textContent = ok ? '✓' : '!';
    stageCaption.textContent = cap;
    submit.disabled = !ok;
  };
  const dimension = (name, key) => el('label', {style:'font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:4px'},
    name + '（公分）',
    el('input', {type:'number', min:'1', max:'400', step:'1', required:'', value:String(piece[key]),
      oninput:event => { piece[key] = event.target.valueAsNumber; update(); }}));

  return workspaceGrid(
    el('div', {class:'media'},
      el('img', {src:projectPhoto(), alt:'客廳 · 放置自備家具示意'}),
      el('div', {class:'stage-pill'}, '你的家具放置預覽（示意圖不會疊合實物）'),
      el('span', {class:'own-box-overlay', 'aria-hidden':'true'}),
      stageCaption),
    workPanel({
      page:'own', eyebrowText:'03 編輯你的家', titleText:'放你自己的家具',
      body:[
        liangBubble('給我一張照片或商品連結，再告訴我尺寸。我照真實大小檢查寬、深、高，放不下會跟你說。'),
        el('form', {id:'own-form', class:'stack', onsubmit:event => {
          event.preventDefault();
          if (!fit()[0]) return;
          draft.own.push({w:piece.w, d:piece.d, h:piece.h});
          draft.layoutVersion++;
          draft.editMessage = '你的家具放進來了，施工清單會標「屋主自備」。示意圖不會更新。';
          go('edit');
        }},
        el('div', {class:'own-top-row'},
          el('div', {class:'own-preview-thumb'}, el('img', {src:projectPhoto(), alt:''})),
          el('div', {class:'stack', style:'gap:8px'},
            el('label', {style:'font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:4px'},
              '商品連結（選填）',
              el('input', {type:'url', placeholder:'https://', value:piece.link, oninput:e => { piece.link = e.target.value; }})),
            picker('上傳照片（選填）', {accept:'image/*'}, event => {
              piece.photo = event.target.files[0]?.name ?? '';
              render(false);
            }),
            piece.photo && el('small', {}, '照片：' + piece.photo + '（示意不實際上傳）'))),
        el('div', {class:'own-size'}, dimension('寬', 'w'), dimension('深', 'd'), dimension('高', 'h')),
        el('small', {}, '客廳可用範圍示意：寬 ' + availW + ' × 深 ' + availD + ' × 高 ' + availH + ' 公分。'),
        fitCard,
        el('small', {}, '自己帶的家具不算進報價，施工清單會標「屋主自備」。')),
      ],
      footer:[link('取消', 'edit', 'button secondary'), submit],
    }));
}

// ===== HOME HUB (NW_Work / NW2_Unlocked / NM06_Work) =====
function projectPage() {
  const locked = !draft.unlocked;
  const addon = (name, note, page, mobileIcon, paid = false) => {
    const gated = paid && locked;
    return el('a', {href:href(gated ? 'unlock' : page), class:'addon-card' + (gated ? ' locked' : '')},
      el('span', {class:'mobile-ic', 'aria-hidden':'true'}, mobileIcon),
      el('div', {class:'addon-card-main'},
        el('span', {class:'addon-card-top'},
          el('strong', {}, name),
          gated
            ? [el('span', {class:'card-ic', 'aria-hidden':'true'}, IC.lock(14)), el('span', {class:'addon-sr-badge'}, '解鎖後')]
            : paid
              ? el('span', {class:'new-dot'}, '新開啟')
              : el('span', {class:'card-arrow', 'aria-hidden':'true'}, IC.arrow())),
        el('small', {}, gated ? '解鎖後・' + note : note)));
  };
  return el('div', {class:'hub'},
    el('div', {class:'hub-journey'},
      phaseNav('project', false),
      el('span', {class:'hub-next-hint'},
        '下一步：', el('strong', {}, locked ? '確認成品後，點右下「解鎖施工圖」' : '點右下「繼續編輯」調整家具，或看施工圖交給團隊'))),
    el('div', {class:'hub-stage'},
      preview({
        hubTitle:true,
        extraOverlay: el('p', {class:'hub-price'},
          el('small', {}, '初步報價・示意金額'),
          el('strong', {class:'price'}, estimate())),
      }),
      el('div', {class:'hub-title'},
        el('h1', {}, '你家・' + rooms[draft.room]),
        draft.view === '實景' ? el('span', {class:'hub-style-label'}, '風格參考照') : el('small', {}, roomArea() + ' 坪'),
        !locked && pill('已解鎖', 'red')),
      el('div', {class:'hub-rooms'}, link('整戶', 'whole'), roomButtons())),
    draft.room === 0 && tuneForm(true),
    el('nav', {class:'hub-cards', 'aria-label':'加值與下一步'},
      addon('家具與材質', '每一件都有尺寸', 'materials', IC.list()),
      addon('毛胚到完成', '拉一下看家長出來', 'compare', IC.compare()),
      addon('法規細評', '逐條檢核附來源', 'compliance', IC.shield(), true),
      addon('風水評估', '逐項檢查與建議', 'feng', IC.compass(), true),
      addon('生活測驗', '五題找出你的偏好', 'quiz', IC.help(), true),
      locked
        ? el('a', {href:href('unlock'), class:'addon-card hub-cta'},
            el('span', {class:'addon-card-top'}, el('span', {class:'mobile-next', 'aria-hidden':'true'}, '下一步'), el('strong', {}, '解鎖施工圖'), el('span', {class:'card-arrow'}, IC.lock(16))),
            el('small', {}, '編輯你的家＋施工圖 ' + drawingSheets().length + ' 張'))
        : el('a', {href:href('edit'), class:'addon-card hub-cta'},
            el('span', {class:'addon-card-top'},
              el('span', {class:'mobile-next', 'aria-hidden':'true'}, '下一步'),
              el('strong', {}, draft.room === 0 ? '繼續編輯' : '繼續編輯（客廳示意）'),
              el('span', {class:'card-arrow'}, IC.arrow())),
            el('small', {}, draft.room === 0 ? '換家具、換材質' : '目前示範客廳換家具、換材質'))));
}

// ===== PROFILE PAGE (N6_Persona) =====
function profilePage() {
  const answers = draft.quizAnswers;
  const answered = answers.filter(value => value != null).length;
  const cook = answers[1] === 2;
  const neat = answers[2] === 0;
  const social = answers[4] === 0;
  const preference = (name, step) => answers[step] != null && [name, questions[step][answers[step] + 1].join('，')];
  const preferences = [preference('回家', 0), preference('下廚', 1), preference('收納', 2), preference('睡眠', 3), preference('待客', 4)].filter(Boolean);
  const personality = cook ? '窩居料理派' : '自然實用派';
  const traits = [
    ['下廚', cook ? 90 : answers[1] === 1 ? 55 : 25],
    ['收納', neat ? 82 : 45],
    ['待客', social ? 80 : 35],
    ['在家工作', answers[0] === 0 ? 40 : 25],
  ];
  return workspaceGrid(
    planStage({topPill:'測驗完成・' + answered + '／5 關・格局還沒動', marks:draft.changes}),
    workPanel({
      page:'profile', addon:true, eyebrowText:'03 生活測驗・結果',
      body:[
        el('div', {class:'profile-personality'},
          liangSvg(54, true),
          el('div', {style:'display:flex;flex-direction:column;gap:2px'},
            el('h1', {id:'profile-title', tabindex:'-1', style:'font-size:12px;font-weight:500;color:#D6D1C8'}, '你的居家人格'),
            el('h2', {}, personality),
            el('p', {}, cook ? '家是用來煮飯和賴著的，東西要收得掉。' : '家要好整理、好放鬆，不用太多裝飾。'))),
        el('div', {class:'trait-bars', 'aria-label':'生活傾向'}, traits.map(([name, pct]) =>
          el('div', {class:'trait-bar'}, el('span', {}, name), el('span', {class:'trait-track'}, el('span', {style:`width:${pct}%`}))))),
        el('b', {style:'font-size:14px'}, '你的偏好（要不要套用，你決定）'),
        preferences.length
          ? el('ul', {class:'rows'}, preferences.map(([k, v]) =>
              el('li', {style:'justify-content:flex-start;gap:14px'}, el('span', {class:'muted', style:'width:56px;flex:none'}, k), el('strong', {style:'font-weight:600'}, v))))
          : el('p', {class:'muted'}, '還沒有答案，回測驗選一選。'),
        draft.shareMessage && el('small', {role:'status'}, draft.shareMessage),
      ],
      footer:[
        button('分享人格', async () => {
          try {
            await navigator.clipboard.writeText('我的居家人格：' + personality);
            draft.shareMessage = '已複製到剪貼簿。';
          } catch {
            draft.shareMessage = '無法複製，請手動選取文字。';
          }
          render(false);
        }, null, 'secondary'),
        button('把偏好帶去編輯', () => {
          draft.prefsShared = true;
          draft.addOpen = true;
          const picks = prefSuggestions();
          const labels = picks.map(key => edits[key].name).join('、');
          draft.editMessage = picks.length
            ? '已帶入生活測驗的 ' + answered + ' 項偏好。有 ' + picks.length + ' 個可套用的建議（' + labels + '），已在下方「＋ 加一樣東西」標示。'
            : '已帶入生活測驗的 ' + answered + ' 項偏好，格局尚未變更。';
          go('edit');
        }, null, 'primary'),
      ],
    }));
}

// ===== BROWSE SAMPLES DATA (NS1_Samples) =====

let toolPhoto = '';

function changeQuizStep(offset) {
  draft.quizStep += offset;
  render(false);
  screen.querySelector('#layout-question')?.focus();
}

const pages = {
  entry: hasProject => el('section', {class:'hero', 'aria-labelledby':'entry-title'},
    el('img', {class:'hero-photo', src:photo, alt:'靜謐橡木客廳示意', width:1536, height:1024, fetchpriority:'high'}),
    el('header', {class:'hero-header'},
      el('a', {href:'#entry', 'aria-label':'首頁'}, brandMark(30)),
      el('a', {href:'#homes', class:'home-link'}, '我的家')),
    el('div', {class:'hero-copy'},
      el('h1', {id:'entry-title'}, '把家的想像，', el('br'), '變成真的。'),
      el('p', {}, '用範例體驗空間設計、裝修估價與圖面交接。')),
    el('div', {class:'hero-start'},
      startUpload(!hasProject),
      el('a', {href:'#browse', class:'hero-example'}, '還沒想法？先逛幾個家'),
      el('p', {class:'hero-steps-mobile'}, '先看風格與示意報價，再試用編輯與圖面')),
    el('ol', {class:'hero-steps', 'aria-label':'接下來'},
      el('li', {}, el('b', {}, '1'), '確認空間條件'),
      el('li', {}, el('b', {}, '2'), '看成品與報價・免費'),
      el('li', {}, el('b', {}, '3'), '試用編輯與示意施工圖'))),

  homes: homesPage,

  browse: () => el('div', {class:'browse-shell'},
    el('header', {class:'browse-top'},
      el('a', {href:'#entry', 'aria-label':'回首頁'}, brandMark(30)),
      el('a', {href:'#entry', class:'back-link'}, '‹ 回首頁')),
    el('div', {class:'browse-head'},
      el('h1', {}, '還沒想法？', el('br'), '先逛幾個家，挑有感覺的。'),
      el('label', {class:'browse-cta'},
        el('input', {type:'file', accept:uploadTypes, 'aria-label':'用我家試試看', onchange:event => {
          const file = event.target.files[0];
          if (file) stageSource(/\.(?:usdz|ply|obj|e57|las|glb)$/i.test(file.name) ? 'LiDAR 掃描檔' : '平面圖', file, true);
        }}),
        '用我家試試看', el('span', {class:'cta-icon', 'aria-hidden':'true'}, IC.upload()))),
    el('div', {class:'browse-bento'}, browseHomes.map(([id, , , areaLabel, lookLabel, thumb]) =>
      el('a', {href:href('result', id), class:'browse-card'},
        el('img', {src:thumb, alt:'', loading:'lazy'}),
        el('span', {}, areaLabel), el('strong', {}, lookLabel)))),
    el('small', {}, '選一張卡片，查看範例空間、家具與示意報價。選檔可體驗空間條件流程，只記錄檔名。')),

  tool: () => {
    const cmp = compareWidget(roomScene(0, 0), roomScene(0), '裝好', 46);
    return el('div', {class:'tool-shell tool-page'},
      el('div', {class:'tool-left'},
        el('a', {href:'#entry', 'aria-label':'回首頁'}, brandMark(30)),
        el('span', {class:'eyebrow', style:'margin-top:24px;color:var(--muted)'}, '免費小工具'),
        el('h1', {}, '拖一下，', el('br'), '比較毛胚和完工。'),
        el('p', {class:'tool-sub'}, '使用固定範例，選照片只記錄檔名。'),
        el('label', {class:'tool-upload-btn picker'},
          el('input', {type:'file', accept:'image/*', 'aria-label':'上傳一張照片', onchange:event => {
            const file = event.target.files[0];
            if (!file) return;
            toolPhoto = file.name;
            render(false);
          }}),
          '上傳一張照片', el('span', {class:'cta-icon', 'aria-hidden':'true'}, IC.camera())),
        toolPhoto && el('p', {role:'status', style:'font-size:14px;font-weight:600'}, '已選「' + toolPhoto + '」。拖曳圖片上的把手，即可比較範例房間。'),
        el('p', {class:'tool-foot'}, '做完之後：', el('a', {href:'#entry', class:'text-link'}, '想看整個家和報價？上傳平面圖'))),
      el('div', {class:'tool-right'}, cmp.stage));
  },

  camera: () => {
    const closeTarget = draft.source || draft.roomSizes.size ? 'read' : 'entry';
    const current = draft.shot;
    const captureNext = () => {
      if (!draft.photos[current]) draft.photos[current] = shots[current] + '（示意拍攝）';
      draft.shot = Math.min(shots.length - 1, current + 1);
      render(false);
    };
    return el('section', {class:'camera-shell', 'aria-label':'拍照引導'},
      el('div', {class:'camera-view'},
        el('img', {src:photo, alt:'現場取景示意'}),
        el('div', {class:'camera-top'},
          el('a', {href:href(closeTarget), class:'camera-close', 'aria-label':'關閉拍照引導'}, '✕'),
          el('span', {class:'camera-counter'}, rooms[draft.room] + '・第 ' + (current + 1) + ' 張／' + shots.length),
          el('span', {'aria-hidden':'true'})),
        el('div', {class:'camera-frame', 'aria-hidden':'true'}),
        el('div', {class:'camera-tip', role:'status'}, liangSvg(30),
          el('span', {}, el('strong', {}, shotTips[current][0]), shotTips[current][1]))),
      el('div', {class:'camera-sheet'},
        el('ol', {class:'camera-list', 'aria-label':'拍攝清單'}, shots.map((name, i) => {
          const done = Boolean(draft.photos[i]) || i < current;
          return el('li', {'data-done':String(done), 'data-active':String(i === current)},
            el('button', {type:'button', onclick:refresh(() => { draft.shot = i; })},
              el('span', {class:'camera-check', 'aria-hidden':'true'}, done ? '✓' : ''),
              el('span', {}, name)));
        })),
        draft.photos.some(Boolean) && el('small', {}, '已選：' + draft.photos.filter(Boolean).join('、')),
        el('div', {class:'camera-bar'},
          el('label', {class:'picker button camera-album'}, '從相簿選',
            el('input', {type:'file', accept:'image/*', capture:'environment', 'aria-label':'從相簿選', onchange:event => {
              const file = event.target.files[0];
              if (!file) return;
              draft.photos[draft.shot] = file.name;
              draft.shot = Math.min(shots.length - 1, draft.shot + 1);
              render(false);
            }})),
          el('button', {type:'button', class:'camera-shutter', 'aria-label':'拍攝第 ' + (current + 1) + ' 張：' + shots[current], onclick:captureNext}),
          el('a', {href:href(draft.photos.some(Boolean) ? 'scanning' : closeTarget), class:'camera-done', onclick:usePhotos}, '拍完了'))));
  },

  scanning: scanningPage,

  read: () => {
    const supplementalPhotos = () => draft.supplementalPhotos.length > 0 && el('small', {role:'status'},
      '補充照片（僅記錄檔名）：' + draft.supplementalPhotos.join('、'));
    const mepNote = () => draft.mepFile && el('small', {role:'status', tabindex:'-1', 'data-mep-file':''}, '已選機電圖：' + draft.mepFile + '（僅記錄檔名）');
    const ageGroup = () => el('div', {class:'actions', role:'group', 'aria-label':'屋型（影響報價）'},
      ['預售屋', '新成屋', '中古屋'].map(name => button(name, refresh(() => { draft.houseAge = name; }), draft.houseAge === name, 'pill-btn')));

    if (draft.source?.label === 'LiDAR 掃描檔') {
      const scan = draft.scan;
      const plan = planStage({topPill:'範例平面與尺寸・8 個空間', highlightRoom:0, pins:[[40, 11, '✓', 'green'], [4, 30, '窗', 'ink']]});
      const scanRow = (name, key, room) => el('div', {class:'scan-edit-row'},
        el('span', {}, name),
        el('span', {class:'num-wrap'},
          el('input', {type:'number', 'aria-label':name + '（公分）', min:key === 'beam' ? 100 : 200, max:key === 'ceil' || key === 'beam' ? 1200 : 6000, step:'1', required:'', value:String(scan[key]),
            onchange:event => {
              const value = event.target.valueAsNumber;
              if (!event.target.validity.valid || !Number.isFinite(value)) {
                event.target.value = scan[key];
                return;
              }
              scan[key] = value;
              if (room) {
                const roomButton = plan.querySelector('.plan-room');
                roomButton.querySelector('small').textContent = roomArea(0) + ' 坪';
                roomButton.setAttribute('aria-label', rooms[0] + ' ' + roomArea(0) + ' 坪');
              }
            }}),
          el('small', {}, '公分')),
        pill('範例尺寸', 'green'));
      return workspaceGrid(
        plan,
        workPanel({
          page:'read', eyebrowText:'01 空間條件', titleText:'確認範例掃描尺寸',
          body:[
            liangBubble('示意：掃描檔還不會真的解析，以下先帶入範例尺寸。點數字就能改，門窗點一下可以換。'),
            draft.source?.files?.[0] && el('small', {role:'status'}, '檔案：' + draft.source.files[0]),
            el('div', {},
              scanRow('客廳 長', 'len', true),
              scanRow('客廳 寬', 'wid', true),
              scanRow('天花板高度', 'ceil'),
              scanRow('樑下淨高', 'beam'),
              el('div', {class:'scan-edit-row'}, el('span', {}, '給排水位置'), el('strong', {}, '待補'), pill('待補', 'linen'))),
            mepNote(),
            supplementalPhotos(),
            el('div', {class:'stack', style:'gap:6px'},
              el('b', {id:'window-title', style:'font-size:13px'}, '客廳這面窗'),
              el('div', {class:'segmented', role:'group', 'aria-labelledby':'window-title'},
                ['落地窗', '半窗', '開放通道'].map(name => button(name, refresh(() => { draft.windowType = name; }), draft.windowType === name, 'seg-btn')))),
            el('div', {class:'stack', style:'gap:6px'}, el('b', {style:'font-size:13px'}, '屋型（影響報價）'), ageGroup()),
            actions(picker('＋ 上傳機電圖', {accept:'image/*,.pdf'}, event => upload(event, false)),
              picker('重選檔案', {accept:uploadTypes}, upload)),
          ],
          footer:[
            el('div', {class:'footer-progress'}, el('b', {}, '空間條件 96%'), el('span', {class:'track'}, el('span', {style:'width:96%'}))),
            link('下一步：選風格', 'style', 'button primary'),
          ],
        }));
    }

    const progress = 72 + (draft.conditions ? 14 : 0) + (draft.mepFile ? 14 : 0);
    return workspaceGrid(
      planStage({
        topPill:'範例平面・8 個空間・約 ' + areas.reduce((total, area) => total + area, 0) + ' 坪',
        pins:[[40, 11, '✓', 'green'], [92, 11, '?', 'linen'], [48, 77, '?', 'linen'], [32, 60, '!', 'ink']],
        legend:true, editable:true,
      }),
      workPanel({
        page:'read', eyebrowText:'01 空間解析', titleText:'確認範例空間條件',
        body:[
          liangBubble('格局、採光與樑位均為固定範例。可修改尺寸或填入補充資料，也可以直接選風格。'),
          el('div', {class:'segmented', role:'group', 'aria-label':'篩選空間條件'},
            [['','全部 6'],['待補','待補 2'],['請確認','請確認 1']].map(([key, text]) =>
              button(text, refresh(() => { draft.filter = key; }), draft.filter === key, 'seg-btn'))),
          detailRows(fields.filter(([,, state]) => !draft.filter || state === draft.filter)),
          draft.conditions && el('small', {}, '已補備註：' + draft.conditions),
          mepNote(),
          supplementalPhotos(),
          actions(
            link('＋ 再拍幾張', 'camera', 'button pill-btn'),
            picker('＋ 上傳機電圖', {accept:'image/*,.pdf'}, event => upload(event, false)),
            link('直接填', 'conditions', 'button pill-btn')),
          el('details', {class:'cost-details', ...(draft.editRoomSize ? {open:''} : {}),
            ontoggle:event => { if (event.currentTarget.isConnected) draft.editRoomSize = event.currentTarget.open; }},
            el('summary', {}, '修改' + rooms[draft.room] + '尺寸、屋型或重選檔案', el('span', {'aria-hidden':'true'}, '▾')),
            el('div', {class:'cost-breakdown stack'},
              roomSizeForm(),
              el('div', {class:'stack', style:'gap:6px'}, el('small', {}, '屋型（影響報價）'), ageGroup()),
              draft.source?.files?.[0] && el('small', {}, '目前來源：' + draft.source.label + '（' + draft.source.files.join('、') + '）'),
              actions(picker('重選平面圖', {accept:uploadTypes}, upload)))),
        ],
        footer:[
          el('div', {class:'footer-progress'}, el('b', {}, '空間條件 ' + progress + '%'), el('span', {class:'track'}, el('span', {style:`width:${progress}%`}))),
          link('下一步：選風格', 'style', 'button primary'),
        ],
      }));
  },

  conditions: () => workspaceGrid(
    planStage({topPill:'補充空間條件'}),
    workPanel({
      page:'conditions', eyebrowText:'01 空間解析', titleText:'補充空間條件',
      body:[
        el('label', {class:'stack', style:'gap:6px'}, el('b', {}, '天花板高度及管線備註'),
          el('textarea', {placeholder:'例如：天花板淨高 285 公分、瓦斯管在廚房右上角…',
            oninput:event => { draft.conditions = event.target.value; }}, draft.conditions || '')),
      ],
      footer:[link('返回空間條件', 'read', 'button primary')],
    })),

  style: () => workspaceGrid(
    el('div', {class:'media'},
      el('img', {src:image(), alt:looks[draft.style] + '客廳示意'}),
      el('div', {class:'stage-pill'}, '方向 ' + 'ABC'[draft.style] + '・' + looks[draft.style])),
    workPanel({
      page:'style', eyebrowText:'02 初步推薦', titleText:'我先推薦三個方向',
      body:[
        liangBubble('以同一個範例客廳比較三種風格。選一張卡片會切換預覽，各卡金額為初步估價示例。'),
        el('div', {class:'style-options', role:'group', 'aria-label':'風格方向'}, looks.map((name, i) =>
          el('button', {type:'button', class:'style-card', 'aria-pressed':String(draft.style === i), onclick:refresh(() => setStyle(i))},
            el('img', {src:image(i), alt:'', loading:'lazy'}),
            el('span', {class:'meta'}, el('strong', {}, 'ABC'[i] + ' ' + name), el('small', {}, lookNotes[i])),
            el('span', {class:'tag-price'}, stylePrice(i))))),
        link('都不像？說一句話或丟參考圖', 'brief', 'text-link'),
      ],
      footer:[
        link('都不像', 'brief', 'button secondary'),
        link('用 ' + 'ABC'[draft.style] + ' 預覽成品與報價', 'generating', 'button primary'),
      ],
    })),

  brief: () => workspaceGrid(
    el('div', {class:'media'},
      el('img', {src:image(), alt:looks[draft.style] + '客廳預覽'}),
      el('div', {class:'stage-pill'}, '你家客廳・先用' + looks[draft.style] + '預覽')),
    workPanel({
      page:'brief', eyebrowText:'02 微調風格', titleText:'都不像？說一句話，或丟幾張你喜歡的圖。',
      body:[
        el('div', {class:'quick-box'},
          el('textarea', {'aria-label':'想要什麼樣的家', placeholder:'想要乾淨、安靜一點，木頭多、東西都收得起來',
            oninput:event => { draft.note = event.target.value; }}, draft.note),
          el('div', {class:'quick-box-foot'},
            picker('＋ 參考圖', {accept:'image/*', multiple:''}, event => {
              draft.refs = Array.from(event.target.files, f => f.name).join('、');
              render(false);
            }),
            el('span', {style:'width:44px;height:44px;border-radius:22px;background:var(--ink);color:#fff;display:grid;place-items:center'}, IC.mic()))),
        el('b', {style:'font-size:14px'}, '參考圖' + (draft.refs ? '（已選：' + draft.refs + '）' : ' 3 張（示意）')),
        el('div', {class:'ref-grid'},
          el('div', {class:'ref-thumb'}, el('img', {src:'./imagery/hq-living-green.jpg', alt:''})),
          el('div', {class:'ref-thumb'}, el('img', {src:'./imagery/hq-living-fog.jpg', alt:''})),
          el('div', {class:'ref-thumb'}, el('img', {src:'./imagery/hq-dining.jpg', alt:''})),
          el('label', {class:'ref-add picker'}, '＋', el('input', {type:'file', accept:'image/*', multiple:'', 'aria-label':'加參考圖', onchange:event => {
            draft.refs = Array.from(event.target.files, f => f.name).join('、');
            render(false);
          }}))),
        liangBubble('我聽到的是這樣，不對的點掉就好：'),
        el('div', {class:'actions', role:'group', 'aria-label':'聽到的偏好'}, briefTags.map(tag =>
          button(tag, refresh(() => {
            draft.tags = draft.tags.includes(tag) ? draft.tags.filter(v => v !== tag) : [...draft.tags, tag];
          }), draft.tags.includes(tag), 'pill-btn'))),
        link('回到三個推薦', 'style', 'text-link'),
      ],
      footer:[link('看成品與示意報價', 'generating', 'button primary')],
    })),

  generating: () => {
    const heading = '正在準備範例預覽';
    const doneHeading = '範例預覽已準備好';
    const caption = el('span', {class:'eyebrow'}, '02 生成示意');
    const cards = [
      [IC.shield(), '法規檢核示例', '警報器、逃生動線'],
      [IC.grid(), '家具尺寸示例', '沙發 240 × 95 公分'],
      [IC.list(), '報價試算示例', '木地板、木作、燈具'],
    ].map(([icon, name, detail], index) =>
      el('div', {class:'gen-pop p' + (index + 1)}, el('span', {class:'icon-sq'}, icon),
        el('span', {}, el('b', {}, name), el('small', {}, detail))));
    const stage = el('div', {class:'gen-stage'},
      el('img', {class:'gen-before', src:roomScene(0, 0), alt:'毛胚示意'}),
      el('img', {class:'gen-after', src:image(), alt:looks[draft.style] + '完工示意'}),
      el('span', {class:'gen-beam', 'aria-hidden':'true'}),
      cards);
    let title = heading;
    let panel;
    const progress = stagedProgress(buildSteps, '範例預覽進度', (percent, done) => {
      stage.style.setProperty('--reveal', percent + '%');
      stage.classList.toggle('gen-complete', percent === 100);
      cards.forEach((card, index) => { card.hidden = done <= index; });
      title = percent === 100 ? doneHeading : heading;
      if (panel) panel.querySelector('h1').textContent = title;
      caption.textContent = percent === 100 ? '02 預覽就緒' : '02 生成示意';
    });
    panel = workPanel({
      page:'generating', titleText:title,
      body:[
        el('p', {class:'muted'}, '呈現所選風格的固定範例、家具與示意報價。'),
        ...progress,
      ],
      footer:[
        link('回推薦風格', 'style', 'button secondary'),
        link('看成品與報價', 'result', 'button primary'),
      ],
    });
    panel.querySelector('h1').before(caption);
    return workspaceGrid(stage, panel);
  },

  result: () => {
    const sample = projects.get(projectId).sample;
    const sampleTitle = sample?.room === draft.room && sample.style === draft.style ? sample.title : null;
    const costs = roomCostItems();
    const sheets = drawingSheets();
    const thumbMeta = ['平面', '立面', '水電'].map(type => sheets.find(sheet => sheet.type === type));
    return workspaceGrid(
      preview({topPill:looks[draft.style], hotspots:draft.room === 0}),
      workPanel({
        page:'result', eyebrowText:'02 你家的樣子', titleText:sampleTitle ?? (rooms[draft.room] + '・' + looks[draft.style]),
        body:[
          el('div', {class:'price-hero'},
            el('strong', {class:'price'}, price(sumCosts(costs))),
            el('span', {style:'flex:1'}),
            pill('初步報價・示意', 'linen')),
          ...(draft.room === 0 ? tuneForm(false) : []),
          el('span', {class:'shield-line'}, IC.shield(), '法規檢核、家具尺寸與報價均為範例'),
          costDetails('看單室費用明細', costs),
          el('section', {class:'drawings-teaser'},
            el('div', {class:'drawings-teaser-head'},
              el('b', {}, '施工圖 ' + sheets.length + ' 張'),
              el('span', {}, draft.unlocked ? '已解鎖・可檢視下載' : '模擬解鎖後可查看示意圖')),
            el('div', {class:'drawings-thumbs'}, thumbMeta.map(sheet =>
              el('span', {class:'drawings-thumb' + (draft.unlocked ? ' unlocked' : '')},
                drawingImage(sheet),
                !draft.unlocked && el('span', {class:'lock-dot', 'aria-hidden':'true'}, IC.lock(15)),
                el('span', {class:'thumb-label'}, sheet.type))))),
        ],
        footer:[
          draft.unlocked ? link('繼續編輯', 'edit', 'button secondary') : link('解鎖施工圖', 'unlock', 'button secondary'),
          link('進到這個家', 'project', 'button primary'),
        ],
      }));
  },

  project: projectPage,

  whole: () => {
    const {byRoom:costsByRoom, wholeHome} = homeCosts();
    const next = (draft.room + 1) % rooms.length;
    return workspaceGrid(
      el('div', {class:'hub-stage whole-stage'},
        preview({
          topPill:'你家・三房兩廳・正在看：' + rooms[draft.room],
          viewKey:'wholeView',
        }),
        el('div', {class:'hub-rooms'}, link('整戶', 'whole'), roomButtons())),
      workPanel({
        page:'whole', addon:true, eyebrowText:'02 整個家', titleText:'一間一間看，整戶一起算',
        body:[
          liangBubble('點下方切換房間。用等角和平面對照門窗與家具位置，報價依房間加總。'),
          el('div', {class:'stack', style:'gap:2px'}, rooms.map((name, i) =>
            el('button', {type:'button', class:'whole-room-row', 'aria-pressed':String(draft.room === i), onclick:refresh(() => setRoom(i))},
              el('b', {}, name), el('small', {}, roomArea(i) + ' 坪'), el('span', {style:'font-weight:600'}, price(sumCosts(costsByRoom[i])))))),
          costDetails('看整戶工項明細', wholeHome),
          el('div', {class:'whole-total-box'},
            el('small', {}, '整戶・初步報價（示意）'),
            el('strong', {}, price(sumCosts(wholeHome)))),
        ],
        footer:[
          button('下一間：' + rooms[next], refresh(() => setRoom(next)), null, 'secondary'),
          draft.unlocked ? link('繼續編輯', 'edit', 'button primary') : link('解鎖精修與施工', 'unlock', 'button premium-action'),
        ],
      }));
  },

  materials: () => {
    const isLiving = draft.room === 0;
    const activeItem = livingFurniture.find(x => x.key === draft.libItem) ?? livingFurniture[0];
    const changed = isLiving ? itemChanged(activeItem.key) : changedRoom();
    const specRows = isLiving
      ? [
          ['淺橡木地板', roomArea(0) + ' 坪', catalogue.FLOORS[0].n + '（示意）'],
          ['橡木牆板', '3.2 × 2.8 米', '木作飾面（示意）'],
          ['橡木懸浮櫃', '2.6 米', '系統木作（示意）'],
          ['嵌燈', '8 盞', '3000K 防眩（示意）'],
        ]
      : [
          [featuredItem(), '1 件', roomItemSpecs[draft.room]],
          ['淺橡木地板', roomArea() + ' 坪', '超耐磨木地板（示意）'],
          ['暖白牆面', '全室', '低甲醛乳膠漆（示意）'],
          ['嵌燈', '4 盞', '3000K 基礎照明（示意）'],
        ];
    const itemName = isLiving ? activeItem.names[Number(changed)] : featuredItem();
    const favoriteKey = draft.room + ':' + itemName;
    const favorite = favoriteFurniture.has(favoriteKey);
    const toggleFavorite = event => {
      if (favoriteFurniture.has(favoriteKey)) favoriteFurniture.delete(favoriteKey);
      else favoriteFurniture.set(favoriteKey, itemName);
      event.currentTarget.setAttribute('aria-pressed', String(favoriteFurniture.has(favoriteKey)));
    };
    return workspaceGrid(
      preview({
        topPill:'查看目前的家具與材質',
        hotspots:isLiving, showQuote:true, activeSpot:draft.libItem,
        onSpot: key => { draft.libItem = key; render(false); },
      }),
      workPanel({
        page:'materials', addon:true, eyebrowText:'素材行情資料庫',
        titleText: isLiving ? (activeItem.label + '的規格示例') : (rooms[draft.room] + '用到的'),
        body:[
          isLiving && el('div', {class:'segmented', role:'group', 'aria-label':'選擇客廳家具'},
            livingFurniture.map(f => button(f.label, refresh(() => { draft.libItem = f.key; }), draft.libItem === f.key, 'seg-btn'))),
          el('div', {class:'product-spotlight'},
            el('span', {class:'spot-img ' + (isLiving ? activeItem.key : '')}, el('img', {src:projectPhoto(), alt:''})),
            el('div', {class:'spot-meta'},
              el('b', {}, itemName),
              el('small', {}, isLiving ? (activeItem.size + '・' + activeItem.materialSpec) : roomItemSpecs[draft.room]),
              el('small', {}, isLiving ? (activeItem.lead + '・' + activeItem.stock) : '交期 2–3 週・示意型錄'),
              el('span', {class:'spot-price'}, 'NT$ 示意價格'))),
          el('div', {class:'actions'},
            el('button', {type:'button', 'aria-pressed':String(favorite), class:'pill-btn', onclick:toggleFavorite}, '收藏這件家具')),
          isLiving
            ? [
                el('div', {style:'display:flex;align-items:center;justify-content:space-between'},
                  el('b', {style:'font-size:14px'}, '換一款（同步更新報價）'),
                  el('button', {type:'button', class:'pill-btn', 'aria-label':'換一款：' + activeItem.label, onclick:refresh(() => {
                    selectItem(activeItem.key, !changed);
                    draft.view = '實景';
                  })}, '換色：' + activeItem.materials[Number(!changed)])),
                el('div', {class:'tier-grid', role:'group', 'aria-label':'預算等級'}, tierOptions.map(t =>
                  el('button', {type:'button', class:'tier-card', 'aria-pressed':String(draft.materialTier === t.key), onclick:refresh(() => {
                    if (draft.materialTier === t.key) return;
                    draft.materialTier = t.key;
                    draft.layoutVersion++;
                  })},
                  el('span', {class:'tier-img'}, el('img', {src:t.photo, alt:''})),
                  el('b', {}, t.label), el('small', {}, t.delta)))),
              ]
            : actions(button('換一款：' + roomOptions[draft.room][changedRoom() ? 0 : 1], refresh(() => {
                if (changedRoom()) draft.changedRooms.delete(draft.room);
                else draft.changedRooms.add(draft.room);
              }), changedRoom())),
          el('b', {style:'font-size:13px'}, rooms[draft.room] + '・家具與材料示例'),
          el('div', {class:'spec-table'}, specRows.map(([n, qty, spec]) =>
            el('div', {class:'spec-row'}, el('b', {}, n), el('span', {}, qty), el('span', {}, spec)))),
          el('p', {class:'muted', style:'font-size:12px'}, '目前' + rooms[draft.room] + '初步報價（示意）：', el('strong', {class:'price', style:'font-size:15px'}, estimate())),
        ],
        footer:[
          link('看整戶清單', 'whole', 'button secondary'),
          link('換好了，更新報價', 'result', 'button primary'),
        ],
      }));
  },

  compare: () => {
    const room = rooms[draft.room];
    const stageIdx = draft.comparisonStage;
    const notice = el('small', {role:'status'});
    const stagePhoto = index => draft.room === 0 && index === stages.length - 1
      ? './imagery/hq-living-lighting.jpg'
      : roomScene(draft.room, index, draft.appliedLayout);
    const cmp = compareWidget(
      stagePhoto(0),
      stagePhoto(stageIdx),
      stages[stageIdx],
      draft.compareSplit,
      val => { draft.compareSplit = val; },
    );
    return workspaceGrid(
      cmp.stage,
      workPanel({
        page:'compare', addon:true, eyebrowText:'02 從毛胚到完成', titleText:'從毛胚到完成',
        body:[
          liangBubble(room + '・施工階段示意。拖曳圖片上的把手，或點選施工階段。'),
          el('ol', {class:'stage-steps', role:'group', 'aria-label':'施工階段'}, stages.map((name, i) =>
            el('li', {}, el('button', {type:'button', class:'stage-step-btn', 'aria-pressed':String(i === stageIdx), onclick:event => {
              const selected = event.currentTarget;
              selected.closest('ol').querySelector('[aria-pressed="true"]').setAttribute('aria-pressed', 'false');
              selected.setAttribute('aria-pressed', 'true');
              draft.comparisonStage = i;
              notice.textContent = '';
              cmp.setAfter(stagePhoto(i), name);
            }},
              el('span', {class:'stage-step-num'}, String(i + 1)),
              el('span', {style:'display:flex;flex-direction:column;line-height:1.4'}, el('b', {}, name), el('small', {}, (draft.room === 0 ? stageNotes : genericStageNotes)[i])))))),
          actions(button('存成對比圖', async () => {
            try { await saveComparison(cmp.before, cmp.after, cmp.getSplit(), 'none'); }
            catch { notice.textContent = '圖檔載入失敗，請再試一次。'; }
          }, null, 'pill-btn')),
          notice,
        ],
        footer:[
          link('回這個家', 'project', 'button secondary'),
          link('看初步報價', 'result', 'button primary'),
        ],
      }));
  },

  unlock: () => {
    const sheets = drawingSheets();
    return workspaceGrid(
      el('div', {class:'cad-stage'},
        cadFrame(sheets[0], {blurred:true, stamp:''}),
        el('div', {class:'lock-scrim', 'aria-hidden':'true'}),
        el('div', {class:'lock-center'},
          el('span', {class:'lock-box', 'aria-hidden':'true'}, IC.lock(32)),
          el('b', {}, '施工圖 ' + sheets.length + ' 張，還鎖著'),
          el('span', {}, '平面・立面・水電'))),
      workPanel({
        page:'unlock', eyebrowText:'03 解鎖', titleText:'解鎖編輯與示意施工圖',
        body:[
          el('div', {class:'price-hero'},
            el('strong', {class:'price', style:'font-size:38px'}, '模擬解鎖'),
            el('small', {}, '試玩不收費')),
          el('ol', {class:'feature-list'},
            el('li', {}, el('span', {class:'feature-ic'}, IC.pen()),
              el('span', {}, el('b', {style:'display:block;font-size:16px'}, '編輯你的家'), el('small', {}, '換家具、換材質、加東西，或放進你自己的家具')),
              pill('含', 'green')),
            el('li', {}, el('span', {class:'feature-ic'}, IC.folder()),
              el('span', {}, el('b', {style:'display:block;font-size:16px'}, '示意施工圖 ' + sheets.length + ' 張'), el('small', {}, '範例客廳的平面、立面和水電圖，可列印或存成 PDF')),
              pill('含', 'green'))),
          el('small', {style:'line-height:1.65'},
            '另外會開啟：法規細評、風水評估、生活測驗。想看的時候再進去。', el('br'),
            '報價為示意。圖面未經覆核，僅供了解流程。', el('br'),
            '示意解鎖，不會收費。'),
        ],
        footer:[
          link('先不要', 'project', 'button secondary'),
          button('解鎖', () => { draft.unlocked = true; go('unlocked'); }, null, 'premium-action'),
        ],
      }));
  },

  unlocked: () => {
    const sheets = drawingSheets();
    return workspaceGrid(
      el('div', {class:'cad-stage'},
        cadFrame(sheets[0], {sharpen:true, stamp:'已解鎖'}),
        el('span', {class:'unlock-lock-dissolve', 'aria-hidden':'true'}, IC.lock(32)),
        el('span', {class:'unlock-ring', 'aria-hidden':'true'}),
        el('span', {class:'unlock-badge-top'}, IC.check(), '已解鎖')),
      workPanel({
        page:'unlocked', eyebrowText:'03 已解鎖', titleText:'解鎖了。現在可以把它變成你的。',
        body:[
          el('ol', {class:'feature-list anim-unlock'},
            el('li', {}, el('span', {class:'feature-ic ink'}, IC.pen()),
              el('span', {}, el('b', {style:'display:block;font-size:16px'}, '編輯你的家'), el('small', {}, '從這裡開始')),
              pill('已開啟', 'red')),
            el('li', {}, el('span', {class:'feature-ic ink'}, IC.folder()),
              el('span', {}, el('b', {style:'display:block;font-size:16px'}, '示意施工圖 ' + sheets.length + ' 張'), el('small', {}, '固定的客廳圖面示例，編輯不會改變圖面')),
              pill('已開啟', 'red'))),
          el('div', {class:'addon-chips anim-unlock'},
            el('span', {class:'addon-chip'}, IC.shield(), '法規細評'),
            el('span', {class:'addon-chip'}, IC.compass(), '風水評估'),
            el('span', {class:'addon-chip'}, IC.help(), '生活測驗')),
          el('small', {}, '這三樣是加值，想看的時候從「這個家」進去。'),
        ],
        footer:[
          link('回這個家', 'project', 'button secondary'),
          link('開始編輯', 'edit', 'button primary'),
        ],
      }));
  },

  edit: editPage,
  own: ownPage,

  quiz: () => {
    const step = draft.quizStep;
    const [prompt, ...choices] = questions[step];
    const answered = draft.quizAnswers[step] != null;
    const info = quizRoomMap[step];
    return workspaceGrid(
      planStage({topPill:'生活測驗・第 ' + (step + 1) + ' 關／5・這一題跟' + info.hint + '有關', highlightRoom:info.room, marks:draft.changes}),
      workPanel({
        page:'quiz', addon:true, eyebrowText:'03 生活測驗',
        body:[
          el('ol', {class:'quiz-circles', 'aria-label':'測驗進度'}, quizStages.map((name, i) => {
            const done = draft.quizAnswers[i] != null && i !== step;
            return el('li', {...(i === step ? {'aria-current':'step'} : {}), ...(done ? {'data-done':'true'} : {})},
              el('span', {class:'dot'}, done ? '✓' : String(i + 1)), name);
          })),
          el('h1', {id:'layout-question', tabindex:'-1'}, prompt),
          el('div', {class:'quiz-choices', role:'group', 'aria-label':prompt}, choices.map(([name, note], i) =>
            el('button', {type:'button', class:'quiz-radio-btn choice-card', 'aria-pressed':String(draft.quizAnswers[step] === i),
              onclick:refresh(() => { draft.quizAnswers[step] = i; })},
              el('span', {class:'quiz-radio-dot', 'aria-hidden':'true'}),
              el('span', {style:'display:flex;flex-direction:column;line-height:1.4'}, el('strong', {}, name), el('small', {}, note))))),
          liangBubble(answered
            ? '記下來了。測驗只問你怎麼生活，不會動你的設計；五關答完再一起帶去編輯。'
            : '測驗只問你怎麼生活，不會動你的設計。'),
        ],
        footer:[
          step > 0 && button('上一關', () => changeQuizStep(-1), null, 'secondary'),
          step < 4
            ? el('button', {type:'button', class:'primary', ...(answered ? {} : {disabled:''}), onclick:() => changeQuizStep(1)}, '下一關：' + quizStages[step + 1])
            : answered ? link('看測驗結果', 'profile', 'button primary')
              : el('button', {type:'button', class:'primary', disabled:''}, '看測驗結果'),
        ],
      }));
  },

  profile: profilePage,

  compliance: () => {
    const findings = complianceFindings();
    const pins = findings.slice(0, 3).map((item, idx) => [item.pin[0], item.pin[1], String(idx + 1),
      item.status === '沒問題' ? 'green' : item.status === '待補資料' ? 'linen' : 'red']);
    const openN = openFindings(findings, 'c:');
    const missN = findings.filter(i => ['待補資料', '待覆核'].includes(i.status)).length;
    const okN = findings.filter(i => i.status === '沒問題').length;
    return workspaceGrid(
      planStage({topPill:'檢核對象：目前的設計（第 ' + draft.layoutVersion + ' 版）', pins, marks:draft.changes}),
      workPanel({
        page:'compliance', addon:true, eyebrowText:'03 法規細部評估', titleText:'逐條檢核，附來源',
        body:[
          el('div', {class:'panel-note'}, IC.shield(), '法規只檢查目前的設計、不改格局。採納的建議會交回編輯。'),
          el('div', {class:'segmented', role:'group', 'aria-label':'法規篩選'}, [
            ['all', '全部 ' + findings.length], ['open', '要處理 ' + openN], ['missing', '待補 ' + missN], ['ok', '沒問題 ' + okN],
          ].map(([k, t]) => button(t, refresh(() => { draft.regFilter = k; }), draft.regFilter === k, 'seg-btn'))),
          el('small', {role:'status'}, findingCounts(findings, 'c:')),
          ...findingList(findings, 'c:', draft.regFilter),
          el('small', {}, '提醒，不是合格判定。以上皆為示意結果，交付前由專業人員複核。'),
        ],
        footer:[link('回這個家', 'project', 'button secondary'), link('回編輯', 'edit', 'button primary')],
      }));
  },

  feng: () => {
    const findings = fengFindings();
    const pins = draft.fengOn
      ? findings.slice(0, 3).map((item, idx) => [item.pin[0], item.pin[1], String(idx + 1), item.status === '沒問題' ? 'green' : 'red'])
      : [];
    const openN = openFindings(findings, 'f:');
    const okN = findings.filter(i => i.status === '沒問題').length;
    const missN = findings.filter(i => i.status === '待補資料').length;
    return workspaceGrid(
      planStage({topPill:'檢核對象：目前的設計（第 ' + draft.layoutVersion + ' 版）', pins, marks:draft.changes}),
      workPanel({
        page:'feng', addon:true, eyebrowText:'03 風水模組評估', titleText:'逐項檢查與建議',
        headerRight: el('label', {class:'feng-toggle-label'},
          el('input', {type:'checkbox', ...(draft.fengOn ? {checked:''} : {}), onchange:() => { draft.fengOn = !draft.fengOn; render(false); }}),
          '納入風水'),
        body:[
          el('div', {class:'panel-note'}, IC.compass(), '風水只檢查目前的設計、不改格局。採納的建議會交回編輯。'),
          draft.fengOn && el('div', {class:'segmented', role:'group', 'aria-label':'風水篩選'}, [
            ['all', '全部 ' + findings.length], ['open', '要處理 ' + openN], ['ok', '沒問題 ' + okN], ['missing', '待補 ' + missN],
          ].map(([k, t]) => button(t, refresh(() => { draft.fengFilter = k; }), draft.fengFilter === k, 'seg-btn'))),
          el('small', {role:'status'}, draft.fengOn ? findingCounts(findings, 'f:') : '已略過風水，這一版不檢查。'),
          ...(draft.fengOn ? findingList(findings, 'f:', draft.fengFilter) : []),
          el('small', {}, '風水是傳統習俗的參考，不是安全或法規判定。採納後會出新的一版，法規會重查。'),
        ],
        footer:[link('回這個家', 'project', 'button secondary'), link('回編輯', 'edit', 'button primary')],
      }));
  },

  drawings: () => {
    const sheets = drawingSheets();
    const selected = sheets.find(sheet => sheet.no === draft.drawing) ?? sheets[0];
    const types = [...new Set(sheets.map(sheet => sheet.type))];
    const activeTab = draft.drawingTab || selected.type;
    const showQuote = activeTab === '估價明細';
    const current = sheets.filter(sheet => sheet.type === (showQuote ? selected.type : activeTab));
    const compList = complianceFindings();
    const openComp = openFindings(compList, 'c:');
    const missingComp = compList.filter(i => i.status === '待補資料').length;
    const reviewComp = compList.filter(i => i.status === '待覆核').length;
    const compText = openComp + ' 項要處理' + (missingComp ? '・' + missingComp + ' 項待補' : reviewComp ? '・' + reviewComp + ' 項待覆核' : '');
    const {wholeHome} = homeCosts();

    const leftStage = el('div', {class:'cad-stage'},
      el('div', {class:'cad-tabs', role:'tablist', 'aria-label':'圖別'},
        ...types.map(type => button(type + ' ' + sheets.filter(s => s.type === type).length + ' 張',
          refresh(() => { draft.drawingTab = type; draft.drawing = sheets.find(s => s.type === type).no; }),
          activeTab === type, 'pill-btn')),
        button('估價明細', refresh(() => { draft.drawingTab = '估價明細'; }), showQuote, 'pill-btn')),
      showQuote
        ? el('div', {class:'cad-sheet-wrap', style:'display:flex;flex-direction:column;gap:10px;border:0;border-radius:18px'},
            el('h2', {}, '整戶估價明細（示意）'),
            el('small', {}, '以下為各工項示意區間，實際單價與工法於現場丈量後由施工團隊確認。'),
            el('ul', {class:'rows'}, wholeHome.map(({name, values}) => el('li', {}, el('span', {}, name), el('strong', {}, price(values))))),
            el('div', {class:'whole-total-box'}, el('small', {}, '整戶初步報價・示意金額'), el('strong', {}, price(sumCosts(wholeHome)))))
        : cadFrame(selected, {stamp:'AI 初稿・待設計師覆核'}));

    return workspaceGrid(leftStage, workPanel({
      page:'drawings', extraClass:'drawing-controls', eyebrowText:'03 示意施工圖／待覆核', titleText:rooms[draft.room] + '示意施工圖',
      body:[
        el('ol', {class:'review-bars review-stages', 'aria-label':'圖面進度'},
          ['AI 初稿', '設計師覆核', '現場丈量', '定稿可施工'].map((name, i) =>
            el('li', i === 0 ? {'aria-current':'step'} : {}, el('span', {class:'seg'}), name))),
        liangBubble('這 ' + sheets.length + ' 張示意圖用來示範交接。平面與等角共用尺寸和配置。另加、自備的家具以清單為準，現場仍須丈量與覆核。'),
        !showQuote && el('ul', {class:'sheet-rows'}, current.map(sheet => el('li', {},
          el('button', {type:'button', class:'sheet-row-btn', 'aria-pressed':String(sheet.no === selected.no),
            onclick:refresh(() => { draft.drawing = sheet.no; })},
            el('span', {class:'no'}, sheet.no),
            el('b', {}, sheet.title),
            pill(sheet.status, 'linen'))))),
        el('a', {href:href('compliance'), class:'reg-callout'},
          el('b', {}, '消防與裝修法規'), el('span', {}, compText), el('u', {}, '看細節')),
        el('ul', {class:'rows'}, [
          [rooms[draft.room] + '初步報價（示意）', estimate()],
          ['整戶初步報價（示意）', price(sumCosts(wholeHome))],
          ...(draft.own.length ? [['屋主自備家具', draft.own.length + ' 件・不計入報價']] : []),
        ].map(([k, v]) => el('li', {}, el('span', {}, k), el('strong', {}, v)))),
        actions(button('列印或存成 PDF', () => window.print(), null, 'pill-btn')),
      ],
      footer:[
        link('回編輯', 'edit', 'button secondary'),
        link('交給團隊做出來', 'team', 'button primary'),
      ],
    }));
  },

  team: () => {
    const locked = draft.sent;
    const shownTeams = locked ? new Set(draft.sentTeams) : draft.teams;
    const handoverLeft = el('div', {class:'handover-stage'},
      el('button', {type:'button', class:'handover-summary', 'aria-expanded':'false', 'aria-controls':'handover-grid',
        onclick:event => {
          const toggle = event.currentTarget;
          toggle.setAttribute('aria-expanded', String(toggle.getAttribute('aria-expanded') !== 'true'));
        }},
        el('strong', {}, '交接包預覽'),
        el('small', {}, '設計圖、施工圖、估價與空間條件（示意）')),
      el('div', {class:'stack', style:'gap:4px'},
        el('span', {class:'eyebrow'}, '交接包'),
        el('h2', {}, '團隊一打開就看得懂你要什麼，', el('br'), '不用從頭再講一次。')),
      el('div', {id:'handover-grid', class:'handover-grid'},
        el('div', {class:'handover-card'},
          el('div', {class:'h-media'}, el('img', {src:projectPhoto(), alt:'風格參考照'})),
          el('div', {class:'h-body'}, el('b', {}, '風格參考照'), el('span', {}, rooms.length + ' 個空間・' + looks[draft.style]))),
        el('div', {class:'handover-card'},
          el('div', {class:'h-media plan-mini'}, planDiagram(draft, draft.appliedLayout)),
          el('div', {class:'h-body'}, el('b', {}, '施工圖 ' + drawingSheets().length + ' 張（示意初稿）'), el('span', {}, '平面・立面・水電'))),
        el('div', {class:'handover-card'},
          el('div', {class:'h-body'}, el('b', {}, '報價與施工清單'), el('span', {}, '13 類工項、材料與家具型號、數量'))),
        el('div', {class:'handover-card'},
          el('div', {class:'h-body'}, el('b', {}, '空間條件與法規'), el('span', {}, '尺寸、屋況、待補項目、要辦的許可')))));

    return workspaceGrid(handoverLeft, workPanel({
      page:'team', eyebrowText:'03 交給團隊', titleText:'選擇要交接的團隊',
      body:[
        el('div', {class:'segmented', role:'group', 'aria-label':'合作方式'},
          ['設計師＋工班', '只找統包工班'].map(name => button(name, refresh(() => { draft.teamType = name; }), draft.teamType === name, 'seg-btn'))),
        liangBubble(locked
          ? '已鎖定本次送出名單，只有你送出的團隊會聯絡你。若要改選團隊，請先按下方「重設示意送件」。'
          : '選 1–3 組，再建立送件紀錄。這是試玩，資料留在本頁。'),
        el('div', {class:'team-list', role:'group', 'aria-label':'團隊'}, teams.map(([name, note], i) => {
          const picked = shownTeams.has(i);
          return el('button', {type:'button', class:'team-card', 'aria-pressed':String(picked), ...(locked ? {disabled:''} : {}),
            onclick:refresh(() => {
              if (locked) return;
              if (draft.teams.has(i)) draft.teams.delete(i);
              else if (draft.teams.size < 3) draft.teams.add(i);
            })},
            el('span', {class:'team-avatar', 'aria-hidden':'true'}, '照片'),
            el('span', {class:'team-meta'}, el('strong', {}, name), el('span', {}, note), el('small', {}, '服務區域・開工時間待確認')),
            el('span', {class:'team-check', 'aria-hidden':'true'}, picked ? '✓' : ''));
        })),
        el('ol', {class:'step-strip', 'aria-label':'接下來'},
          ['1 送交接包', '2 現場丈量', '3 正式報價', '4 簽約開工'].map((t, i) =>
            el('li', i === Number(draft.sent) ? {'aria-current':'step'} : {}, t))),
      ],
      footer:[
        el('b', {role:'status', style:'white-space:nowrap;font-size:14px'}, '已選 ' + shownTeams.size + '／3 組'),
        ...(draft.sent
          ? [link('看送出紀錄', 'sent', 'button primary'),
             button('重設示意送件', refresh(() => { draft.sent = false; draft.sentTeams = []; draft.sentSnapshot = null; }), null, 'secondary')]
          : [el('button', {type:'button', class:'primary', ...(draft.teams.size ? {} : {disabled:''}), onclick:() => {
              draft.sentTeams = [...draft.teams].sort();
              draft.sentSnapshot = {
                teams: [...draft.sentTeams], room: rooms[draft.room], estimate: estimate(),
                wholeEstimate: price(sumCosts(homeCosts().wholeHome)),
                layoutVersion: draft.layoutVersion, photo: projectPhoto(),
              };
              draft.sent = true;
              go('sent');
            }}, '送出交接包，約現場丈量')]),
      ],
    }));
  },

  sent: () => {
    const snap = draft.sent ? draft.sentSnapshot : null;
    if (!snap) {
      return workspaceGrid(
        el('div', {class:'media'},
          el('img', {src:projectPhoto(), alt:'目前設計示意'}),
          el('div', {class:'stage-pill'}, '目前設計（第 ' + draft.layoutVersion + ' 版）・尚未送出交接包')),
        workPanel({
          page:'sent', eyebrowText:'03 交給團隊', titleText:'尚未送出交接包',
          body:[
            liangBubble('目前沒有送出紀錄（尚未送出或已重設示意送件）。請回到「交給團隊」勾選要聯絡你的團隊並按送出，這裡才會保留該版本的送件快照。'),
          ],
          footer:[link('回這個家', 'project', 'button secondary'), link('去選團隊', 'team', 'button primary')],
        }));
    }
    const names = snap.teams.map(index => teams[index][0]).join('、');
    const sentVer = snap.layoutVersion;
    const drifted = draft.layoutVersion !== sentVer;
    const steps = [
      ['已建立示意送件紀錄', '模擬收件：' + names + '，第 ' + sentVer + ' 版的設計、圖面和報價。以送件當下選擇為準。', '已完成'],
      ['團隊回覆丈量時段', '回覆時間待確認；正式上線後會用 LINE 通知你（示意，這次不會傳訊息）', '下一步'],
      ['現場丈量', '施工圖依實際尺寸定稿', '待處理'],
      ['正式報價與簽約', '由你和團隊直接談', '待處理'],
    ];
    return workspaceGrid(
      el('div', {class:'media'},
        el('img', {src:snap.photo, alt:'送出當下設計示意'}),
        el('div', {class:'stage-pill'}, '你家・' + snap.room + '・第 ' + sentVer + ' 版'),
        el('div', {class:'stage-quote'},
          el('small', {}, '送出當下（第 ' + sentVer + ' 版）・' + snap.room + '初步報價'),
          el('strong', {}, snap.estimate))),
      workPanel({
        page:'sent', eyebrowText:'03 交給團隊', titleText:'送出了。接下來等團隊回覆。',
        body:[
          el('small', {}, '示意送件・沒有發送任何資料'),
          el('ol', {class:'scan-steps', 'aria-label':'接下來'}, steps.map(([name, note, st], i) =>
            el('li', {class:'scan-step', 'data-state':st},
              el('span', {class:'scan-mark', 'aria-hidden':'true'}, i === 0 ? '✓' : String(i + 1)),
              el('span', {}, el('strong', {}, name), el('small', {}, note)),
              i === 0 && pill('已完成', 'green')))),
          drifted && el('div', {class:'panel-note', role:'status'},
            '你之後已編輯到第 ' + draft.layoutVersion + ' 版（目前' + rooms[draft.room] + '初步報價 ' + estimate() + '）；本頁維持第 ' + sentVer + ' 版送件紀錄，若要交付新版請回團隊頁按「重設示意送件」。'),
          el('small', {}, '最多只會有你送出當下選的團隊聯絡你。正式報價以團隊丈量後為準。'),
        ],
        footer:[
          link('回這個家', 'project', 'button secondary'),
          link('看 LINE 通知長什麼樣', 'notices', 'button primary'),
        ],
      }));
  },

  notices: () => {
    const snap = draft.sent ? draft.sentSnapshot : null;
    const ver = snap ? snap.layoutVersion : draft.layoutVersion;
    const estText = snap ? snap.estimate : price(sumCosts(roomCostItems(0)));
    const drifted = Boolean(snap && draft.layoutVersion !== snap.layoutVersion);
    const openLabel = drifted ? '打開看（目前第 ' + draft.layoutVersion + ' 版）' : '打開看（第 ' + ver + ' 版）';
    const drawLabel = drifted ? '看施工圖（目前第 ' + draft.layoutVersion + ' 版）' : '看施工圖（第 ' + ver + ' 版）';
    const thirdCard = snap
      ? ['團隊回覆時', teams[snap.teams[0]][0] + ' 想約你丈量', '對應第 ' + ver + ' 版交接包，提了兩個現場丈量時段。（最多只會有 3 組團隊聯絡你）', '選時段', 'slot']
      : ['團隊回覆時', '送出後團隊會從這裡約丈量', '目前尚未送出交接包；送出後，你選的團隊會在此提現場丈量時段。', '去選團隊', 'team'];
    const notes = [
      ['生成完成時', '範例設計預覽已就緒', '第 ' + ver + ' 版・' + (snap?.room ?? '客廳') + '・' + looks[draft.style] + '，初步報價 ' + estText + '。', openLabel, 'result'],
      ['圖面通知範例', '可查看 ' + drawingSheets().length + ' 張示意施工圖', '圖面為目前房間的示意配置，尚未覆核。', drawLabel, 'drawings'],
      thirdCard,
    ];
    return el('div', {class:'line-wrap'},
      el('div', {style:'display:flex;align-items:center;justify-content:space-between'},
        el('h1', {style:'font-size:20px'}, 'LINE 通知長這樣'),
        link('回這個家', 'project', 'text-link')),
      drifted && el('div', {class:'panel-note', role:'status'},
        '以下通知對應已送出的第 ' + ver + ' 版（' + estText + '）。你目前已編輯到第 ' + draft.layoutVersion + ' 版（目前' + rooms[draft.room] + '初步報價 ' + estimate() + '），點下方按鈕會開啟目前最新的第 ' + draft.layoutVersion + ' 版。'),
      el('div', {class:'line-phone'},
        el('header', {class:'line-chat-head'}, brandMark(30), el('b', {}, '居家設計服務'), el('small', {}, 'LINE 官方帳號（示意）')),
        el('ul', {class:'notice-list'}, notes.map(([when, title, body, action, page]) =>
          el('li', {},
            el('span', {class:'notice-time'}, when),
            el('div', {class:'notice-bubble'},
              el('strong', {}, title), el('p', {}, body),
              page === 'slot'
                ? el('div', {class:'slot-row'}, ['本週六 10:00', '本週日 14:00'].map(slot =>
                    button(draft.slotPicked === slot ? '已選：' + slot : '選時段：' + slot, refresh(() => { draft.slotPicked = slot; }), draft.slotPicked === slot)))
                : link(action, page, 'button')))))),
      snap && draft.slotPicked && el('p', {role:'status', style:'font-size:13px;font-weight:600;text-align:center'}, '已選 ' + draft.slotPicked + '。這是示意，不會發送預約。'),
      actions(snap ? link('回送出完成', 'sent', 'button secondary') : link('去選團隊', 'team', 'button secondary'),
        link('回這個家', 'project', 'button primary')));
  },
};

const railSections = {
  project:['project','whole','materials','compare','compliance','feng','quiz','profile'],
  read:['read','conditions','camera','scanning'],
  result:['style','brief','generating','result'],
  drawings:['unlock','unlocked','edit','own','drawings','team','sent'],
  notices:['notices'],
};

function updateNavigation(page) {
  const work = !standalone.includes(page);
  document.body.dataset.page = page;
  document.body.classList.toggle('workspace', work);
  rail.hidden = menu.hidden = !work;
  menu.open = false;
  for (const anchor of railLinks) {
    const target = anchor.dataset.rail;
    anchor.href = href(target);
    if (railSections[target]?.includes(page)) anchor.setAttribute('aria-current', 'location');
    else anchor.removeAttribute('aria-current');
  }
  document.querySelector('.site-header > .phase-compact')?.remove();
  if (work) rail.before(phaseNav(page, true));
}

let lastPage;
let lastHash;
function render(focus = true) {
  clearInterval(ticker);
  scene?.dispose();
  scene = undefined;
  const [route, query] = location.hash.slice(1).split('?');
  const params = new URLSearchParams(query);
  const id = params.get('project');
  if (projects.has(id)) projectId = id;
  const project = projects.get(projectId);
  draft = project.draft;
  const requested = Object.hasOwn(pages, route) ? route : 'entry';
  const page = premium.includes(requested) && !draft.unlocked ? 'unlock' : requested;
  const view = params.get('view');
  if (lastHash !== location.hash && page === 'project' && previewViews.includes(view)) draft.view = view;
  lastHash = location.hash;
  if (draft.pendingSource && !['scanning', 'entry', 'camera', 'homes', 'browse', 'tool'].includes(page)) {
    confirmSource();
  }
  if (page === 'scanning' && resumePage(project) !== 'scanning') {
    location.replace(href(project.page));
    return;
  }
  if (page !== 'entry' && page !== 'scanning' && Object.hasOwn(projectProgress, page)) {
    project.page = page;
  }
  if (lastPage === 'edit' && page !== 'edit') draft.editMessage = '';
  lastPage = page;
  updateNavigation(page);
  const layout = pages[page](projects.has(id));
  if (project.isExample && !standalone.includes(page)) {
    screen.replaceChildren(el('aside', {class:'example-banner'},
      el('strong', {}, '範例的家 · 示意'), el('a', {href:'#entry'}, '回首頁')), layout);
  } else {
    screen.replaceChildren(layout);
  }
  const section = page === 'homes' ? new URLSearchParams(query).get('section') : null;
  const dashTarget = ['favorites', 'help'].includes(section) ? screen.querySelector('#dash-' + section) : null;
  if (dashTarget) {
    dashTarget.focus();
  } else if (focus && page === 'profile') {
    screen.querySelector('#profile-title')?.focus();
  } else if (focus) {
    screen.focus({preventScroll:true});
    window.scrollTo(0, 0);
  }
}

if (/^#r=[A-Za-z0-9_-]+$/.test(location.hash)) {
  location.replace('./fast-route/' + location.hash);
} else {
  window.addEventListener('hashchange', () => render());
  render(false);
}
