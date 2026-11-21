import { finishFilter, roomScene, saveComparison, stages } from './room-scenes.js';
import { roomDims, wireframeDrawingSet } from './fast-route/lib/drawings.js';
import { designEstimate } from './fast-route/lib/estimate.js';
import { STYLES } from './fast-route/lib/taste.js';
import { LIMITS, roomSize } from './fast-route/lib/layout.js';

const screen = document.querySelector('#screen');
const homeLinks = document.querySelectorAll('.site-header a[href="#homes"]');
const railLinks = document.querySelectorAll('[data-rail]');
const rail = document.querySelector('.rail');
const menu = document.querySelector('.project-menu');
const catalogue = window.HB_CATALOG;
const rooms = ['客廳', '餐廳', '廚房', '客衛', '主臥', '主衛', '次臥 1', '次臥 2'];
const areas = [9, 4.5, 3, 1.5, 5.5, 1.5, 3.5, 4];
// Original Quiet Oak demo allowances, in 萬, keyed by estimate item for each room.
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
const looks = ['靜謐橡木', '日光米白', '森林木框'];
const lookNotes = ['橡木、米白、一張紅椅', '白牆、格柵矮櫃、圓潤沙發', '木框窗、橄欖綠、手作陶'];
const lookKeys = ['muji', 'nordic', 'retro'];
// Index into the finish filters of room-scenes.js for each direction.
const lookFilters = [0, 2, 1];
const livingFurniture = [
  {key:'chair', label:'單椅', names:['磚紅休閒椅', '苔綠休閒椅'], colors:['#a64c42','#515936'], extra:[1,1]},
  {key:'sofa', label:'沙發', names:['米白模組沙發', '淺灰模組沙發'], colors:['#d5c7af','#919da4'], extra:[1,2]},
];
const roomOptions = [
  livingFurniture[1].names, ['橡木圓餐桌', '胡桃木餐桌'],
  ['淺橡木廚櫃', '暖白廚櫃'], ['橡木浴櫃', '暖白浴櫃'],
  ['橡木床頭板', '亞麻床頭板'], ['懸浮橡木浴櫃', '石紋浴櫃'],
  ['橡木書桌櫃', '淺灰書桌櫃'], ['橡木床架', '胡桃木床架'],
];
const shots = ['站在門口往裡拍', '有窗戶的那一面', '天花板與樑', '插座、開關、冷氣孔'];
const fields = [
  ['格局：三房兩廳兩衛', '來源：建商平面圖', '讀到了'],
  ['各間尺寸與坪數', '8 間都有標註・點平面圖可改', '讀到了'],
  ['門窗與採光面', '主要採光朝南（照片比對）', '讀到了'],
  ['樑位：主臥床頭上方疑似有樑', '來源：現場照片・我不確定', '請確認'],
  ['天花板高度', '拍一張地板到天花板的照片，或直接填', '待補'],
  ['給排水與瓦斯位置', '廚房、主衛、客衛・上傳機電圖最準', '待補'],
];
const quizStages = ['回家', '怎麼煮', '怎麼收', '怎麼睡', '誰會來'];
const questions = [
  ['回到家第一件事？', ['東西先放好', '進門要有地方收鞋和包'], ['直接進客廳', '玄關越開闊越好']],
  ['平常在家煮飯嗎？', ['幾乎不煮', '外食為主'], ['週末才煮', '偶爾需要備餐的地方'], ['天天煮，還會一起煮', '需要大檯面，兩個人站得開']],
  ['東西怎麼收？', ['都藏起來', '櫃門關上看不到'], ['喜歡的擺出來', '留展示層架']],
  ['怎麼睡得好？', ['怕光也怕吵', '床不要對窗'], ['喜歡自然醒', '讓日光進來']],
  ['誰會來家裡？', ['常有朋友來', '客廳要坐得下'], ['以家人為主', '四個人以內']],
];
// Layout changes the demo can apply. Each one adds its allowance to one estimate item.
const layoutChanges = {
  kitchen: {name:'廚房打開，做中島', detail:'拿掉廚房和餐廳之間的牆', room:2, item:'cabinet', extra:[2,2]},
  entry: {name:'玄關加一整面收納', detail:'進門右手邊', room:0, item:'cabinet', extra:[3,5]},
  bed: {name:'主臥床換方向', detail:'床頭改靠實牆', room:4, item:'furniture', extra:[1,1]},
  screen: {name:'玄關加屏風櫃', detail:'擋住大門看向爐火的視線', room:0, item:'cabinet', extra:[1,2]},
};
const planMarks = {entry:[0, '玄關收納'], screen:[0, '屏風櫃'], bed:[4, '床轉向']};
const teams = [
  ['示意團隊 A', '擅長：木作收邊、新成屋'],
  ['示意團隊 B', '擅長：開放式廚房、系統櫃'],
  ['示意團隊 C', '擅長：老屋翻新、水電重拉'],
];
const briefTags = ['收納都藏起來', '米白為主', '一個重點色', '淺色地板'];
const scanSteps = [
  ['找出牆和房間', '讀到 8 間：三房兩廳兩衛'],
  ['讀尺寸標註', '換算成公尺和坪數'],
  ['比對門窗與採光', '跟你拍的照片對一下'],
  ['找樑、柱、管線', '圖上沒有的會請你補'],
  ['整理成空間條件', '缺的標待補'],
];
const buildSteps = [
  ['對照消防與建築法規', '先排除不能做的配置'],
  ['放進真實尺寸的家具', '每一件都量得到'],
  ['查在地行情算報價', '用這一區的材料與工資'],
  ['打上你家的採光', '落地窗朝南，上午的光'],
];
const newDraft = () => ({
  room: 0, style: 0, shot: 0, roomSizes: new Map(), zoomIndex: 1, editRoomSize: false,
  filter: '', view: '實景', changedRooms: new Set(), chairChanged: false, tuneMessage: '', photos: [], source: null, pendingSource: null,
  appliedLayout: false, changes: [], layoutVersion: 1, layoutOriginal: false, layoutMessage: '',
  dismissed: new Set(), fengOn: true, quizStep: 0, quizAnswers: [], prefsShared: false, shareMessage: '',
  unlocked: false, drawing: 'A-01', comparisonStage: 4, floor: '', floorInput: '',
  note: '', refs: '', styleNote: '', tags: briefTags.slice(0, 3), teamType: '設計師＋工班', teams: new Set([0]), sent: false,
});
const projects = new Map([
  ['oak', {name:'靜謐橡木', page:'project', draft:newDraft()}],
  ['family', {name:'小家庭', page:'brief', draft:newDraft()}],
  ['floorplan', {name:'三房兩廳', page:'read', draft:newDraft()}],
  ['upload', {name:'新家平面圖', page:'scanning', draft:newDraft()}],
  ['example', {name:'範例的家', page:'result', draft:newDraft(), isExample:true}],
]);
let projectId = 'oak';
let draft = projects.get(projectId).draft;
let projectCount = 0;
let examplesOpen = false;
const photo = roomScene(0);
const studio = './style-studio/';
const image = (n = draft.style) => [photo, studio + 'key-visuals/app/style-1.jpg', studio + 'key-visuals/app/style-2.jpg'][n];
// Pages that open after unlocking. The life quiz, compliance and feng shui are add-ons.
const premium = ['unlocked', 'layout', 'quiz', 'profile', 'compliance', 'feng', 'drawings', 'team'];
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  });
  node.append(...children.flat().filter(value => value != null && value !== false));
  return node;
}
const heading = (name, detail) => [el('h1', {}, name), detail && el('p', {class:'muted'}, detail)];
const card = (...children) => el('section', {class:'card stack'}, ...children);
const actions = (...children) => el('div', {class:'actions'}, ...children);
const grid = (first, second, extra = '') => el('div', {class:'grid ' + extra}, first, second);
const stack = (...children) => el('div', {class:'stack'}, ...children);
const href = (page, id = projectId) => '#' + page + '?project=' + id;
const go = (page, id = projectId) => {
  const target = href(page, id);
  // A locked deep link keeps its own address, so unlocking from it would not fire hashchange.
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
  ...(pressed == null ? {} : {'aria-pressed':pressed})}, name);
const refresh = (change) => (event) => {
  const buttons = Array.from(screen.querySelectorAll('button'));
  const index = buttons.indexOf(event.currentTarget);
  change();
  render(false);
  if (index >= 0) screen.querySelectorAll('button')[index]?.focus({preventScroll:true});
};
const rows = (items) => el('ul', {class:'rows'}, items.map(([name, value]) =>
  el('li', {}, el('span', {}, name), el('span', {class:'badge'}, value))));
const figure = (src, caption, alt = '室內設計參考示意', ...extra) => el('div', {class:'media'},
  el('img', {src, alt}), caption && el('div', {class:'floating'}, caption), ...extra);
const picker = (label, attrs, fn) => el('label', {class:'picker button'}, label,
  el('input', {type:'file','aria-label':label,...attrs,onchange:fn}));
const price = (values) => values.join('–') + ' 萬';
const roomArea = (i = draft.room, projectDraft = draft) => {
  const size = projectDraft.roomSizes.get(i);
  return size ? Math.round(size.w * size.d / 3.3058 * 10) / 10 : areas[i];
};
const roomKind = (i = draft.room) => ['客廳','餐廳','廚房','衛浴','臥室','衛浴','臥室','臥室'][i];
const setRoom = i => {
  if (i !== draft.room) draft.zoomIndex = 1;
  draft.room = i;
};
const roomLook = () => ({
  ...STYLES[lookKeys[draft.style]],
  name: looks[draft.style],
  sofa: livingFurniture[1].colors[Number(draft.changedRooms.has(0))],
  chairFabric: livingFurniture[0].colors[Number(draft.chairChanged)],
});
const roomCondition = () => {
  const size = draft.roomSizes.get(draft.room);
  return {space:roomKind(), ping:roomArea(), age:'新成屋', len:size?.w, wid:size?.d};
};
let scene;
let modelModule;
let modelAttempts = 0;
function loadModel() {
  if (!modelModule) {
    const url = new URL('./fast-route/lib/room3d.js', import.meta.url);
    // A failed module URL remains failed in this document's module map.
    if (modelAttempts) url.searchParams.set('retry', String(modelAttempts));
    modelModule = import(url.href).catch(error => {
      modelModule = undefined;
      modelAttempts++;
      throw error;
    });
  }
  return modelModule;
}
async function showModel(container, zoomOut, zoomIn, retry, notice, dimensions) {
  retry.hidden = zoomOut.hidden = zoomIn.hidden = true;
  notice.textContent = '正在載入 3D';
  dimensions.textContent = '';
  container.classList.remove('model-failed');
  const fail = () => {
    if (!container.isConnected) return;
    const focus = [zoomOut, zoomIn].includes(document.activeElement);
    scene?.dispose();
    scene = undefined;
    container.classList.add('model-failed');
    zoomOut.hidden = zoomIn.hidden = true;
    retry.hidden = false;
    notice.textContent = '3D 中斷，已顯示實景示意。';
    if (focus) retry.focus();
  };
  try {
    const { mountRoom3D } = await loadModel();
    if (!container.isConnected) return;
    const condition = roomCondition();
    const size = roomSize(condition, condition.ping);
    scene = mountRoom3D(container, roomLook(), 'A',
      {...size, space:condition.space, openKitchen:draft.appliedLayout}, fail, draft.zoomIndex);
    const actual = roomDims(scene.stats().size);
    dimensions.textContent = actual.w + ' × ' + actual.d + ' mm';
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
function modelControls(container) {
  const zoomOut = el('button', {type:'button','aria-label':'縮小 3D'}, '−');
  const zoomIn = el('button', {type:'button','aria-label':'放大 3D'}, '＋');
  const notice = el('small', {role:'status'});
  const dimensions = el('small', {class:'model-dimensions','aria-label':'3D 尺寸'});
  const restart = () => showModel(container, zoomOut, zoomIn, retry, notice, dimensions);
  const retry = button('重試 3D', async () => {
    await restart();
    (zoomIn.hidden ? retry : zoomIn.disabled ? zoomOut : zoomIn).focus();
  });
  const controls = el('div', {class:'model-controls'}, el('div', {class:'model-meta'}, notice, dimensions), zoomOut, zoomIn, retry);
  return {controls, restart};
}
const addPrices = ([low, high], [extraLow, extraHigh]) => [low + extraLow, high + extraHigh];
const sumCosts = items => items.reduce((total, item) => addPrices(total, item.values), [0,0]);

function roomCostItems(index = draft.room, changeKeys = draft.changes) {
  const space = roomKind(index);
  const baseline = baseRoomCosts[index];
  const cond = {space, ping:roomArea(index), age:'新成屋'};
  const look = roomLook();
  const defaultTerms = designEstimate({...cond, ping:areas[index]}, look).items;
  const adjustments = new Map();
  const add = (key, values) => adjustments.set(key, addPrices(adjustments.get(key) ?? [0,0], values));

  // Keep each demo surcharge on the work that changed.
  if (draft.style === 2) add(baseline.furniture ? 'furniture' : 'wall', [2,3]);
  if (draft.style === 1) add('cabinet', [4,6]);
  if (draft.changedRooms.has(index)) {
    const materialExtra = index === 0 ? livingFurniture[1].extra : [1,2];
    add(baseline.furniture ? 'furniture' : 'cabinet', materialExtra);
  }
  if (index === 0 && draft.chairChanged) add('furniture', livingFurniture[0].extra);
  for (const key of changeKeys) {
    const change = layoutChanges[key];
    if (change.room === index) add(change.item, change.extra);
  }

  return designEstimate(cond, look).items.map(({key, name, basis, low, high}, i) => {
    const terms = defaultTerms[i];
    const areaDelta = [Math.round(low - terms.low), Math.round(high - terms.high)];
    const [min, max] = addPrices(baseline[key], areaDelta);
    // Small rooms can narrow a range after rounding size-dependent costs.
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
    el('span', {}, name, basis && el('small', {}, basis)),
    el('strong', {}, price(values))));
  return el('details', {class:'cost-details'}, el('summary', {}, label),
    el('div', {class:'cost-breakdown'},
      el('p', {class:'muted'}, '依工項列出示意區間，實際單價與工法在現場丈量後確認。'),
      el('ul', {class:'rows'}, entries)));
}
const estimate = () => price(sumCosts(roomCostItems()));
const itemChanged = (key, projectDraft = draft) => key === 'chair' ? projectDraft.chairChanged : projectDraft.changedRooms.has(0);
function selectItem(key, changed) {
  if (key === 'chair') draft.chairChanged = changed;
  else if (changed) draft.changedRooms.add(0);
  else draft.changedRooms.delete(0);
}
function projectPhoto(stage = stages.length - 1, projectDraft = draft) {
  if (projectDraft.room === 0 && stage === stages.length - 1) {
    const variant = ['sofa', 'chair'].filter(key => itemChanged(key, projectDraft)).join('-');
    if (variant) return './imagery/living-' + variant + '.webp';
  }
  return roomScene(projectDraft.room, stage, projectDraft.appliedLayout);
}
function tuneForm() {
  const form = el('form', {class:'result-tune',onsubmit:event => {
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
      draft.tuneMessage = '示意版可單次調整沙發（米白／淺灰）或單椅（磚紅／苔綠）。';
    }
    render(false);
    screen.querySelector('.result-tune input')?.focus({preventScroll:true});
  }}, el('input', {type:'text','aria-label':'想改什麼？說一句話',required:'',placeholder:'想改什麼？例：沙發換淺灰'}),
  el('button', {type:'submit',class:'primary','aria-label':'套用微調'}, '→'));
  return [form, draft.tuneMessage && el('p', {role:'status'}, draft.tuneMessage)];
}
function furnitureList() {
  const options = livingFurniture.map(item => {
    const changed = itemChanged(item.key);
    const extra = item.extra[0] === item.extra[1] ? item.extra[0] + ' 萬' : price(item.extra);
    return el('li', {}, el('span', {class:'furniture-thumb ' + item.key},
      el('img', {src:projectPhoto(),alt:''})),
      el('span', {}, el('strong', {}, item.names[Number(changed)]),
        el('small', {}, changed ? '換款加價 ' + extra : '已含於示意報價')),
      el('button', {type:'button','aria-label':'換一款：' + item.label,'data-piece':item.key,onclick:() => {
        selectItem(item.key, !changed);
        draft.tuneMessage = '';
        draft.view = '實景';
        render(false);
        screen.querySelector('[data-piece="' + item.key + '"]')?.focus({preventScroll:true});
      }}, '換一款'));
  });
  return el('section', {class:'result-furniture'}, el('h2', {}, '客廳用到的家具'), el('ul', {}, options));
}
const changedRoom = () => draft.changedRooms.has(draft.room);
const featuredItem = () => roomOptions[draft.room][changedRoom() ? 1 : 0];
const roomButtons = () => el('div', {class:'actions room-options', role:'group', 'aria-label':'房間'},
  rooms.map((name, i) => button(name, refresh(() => setRoom(i)), draft.room === i)));
function editPlanRoom(index) {
  setRoom(index);
  draft.editRoomSize = true;
  render(false);
  screen.querySelector('.room-size-fields input')?.focus();
}
function planDiagram(projectDraft, openKitchen, selectRoom, marks = []) {
  return el('div', {class:'plan',role:'group','aria-label':'平面圖示意','data-open-kitchen':openKitchen},
    rooms.map((name, index) => {
      const area = roomArea(index, projectDraft) + ' 坪';
      const attrs = {class:'plan-room'};
      if (selectRoom) Object.assign(attrs, {
        type:'button','aria-label':name + ' ' + area,
        'aria-pressed':projectDraft.room === index,onclick:selectRoom(index),
      });
      return el(selectRoom ? 'button' : 'div', attrs, el('span', {}, name), el('small', {}, area),
        index === 2 && openKitchen && el('small', {class:'plan-island'}, '中島'),
        marks.filter(key => planMarks[key]?.[0] === index).map(key => el('small', {class:'plan-mark'}, planMarks[key][1])));
    }),
    el('span', {class:'plan-hall'}, '走道'));
}
const plan = (editable = false, openKitchen = draft.appliedLayout) => el('div', {class:'plan-stage'},
  planDiagram(draft, openKitchen, index => editable ? () => editPlanRoom(index) : refresh(() => setRoom(index))));
const preview = () => {
  const views = ['實景', '等角', '平面'];
  let content = stack(plan(), draft.appliedLayout && el('p', {class:'muted'}, '格局示意：已套用開放廚房與中島'));
  let cameraControls;
  if (draft.view !== '平面') {
    const caption = [rooms[draft.room], looks[draft.style], featuredItem(),
      draft.room === 2 && draft.appliedLayout ? '開放廚房與中島' : ''].filter(Boolean).join(' · ');
    content = figure(projectPhoto(), caption, rooms[draft.room] + ' · 完工示意',
      el('a', {class:'hotspot button',href:href('materials'),'aria-label':'查看家具與材質'}));
    content.querySelector('img').style.filter = finishFilter(lookFilters[draft.style]);
    if (draft.view === '等角') {
      content.classList.add('model');
      const model = modelControls(content);
      cameraControls = model.controls;
      model.restart();
    }
  }
  return el('div', {class:'room-preview', 'data-view':draft.view},
    el('div', {class:'actions view-modes',role:'group','aria-label':'房間檢視'},
      views.map(view => button(view, refresh(() => {draft.view = view;}), draft.view === view))),
    content, cameraControls);
};
function stageSource(label, file, newProject = false) {
  const id = newProject ? createProject('entry') : projectId;
  projects.get(id).draft.pendingSource = {label, files:[file.name]};
  go('scanning', id);
}
function upload(event, isPlan = true) {
  const file = event.target.files[0];
  if (file) stageSource(isPlan ? '平面圖' : '機電圖', file);
}
function usePhotos() {
  draft.pendingSource = {label:'現場照片', files:draft.photos.filter(Boolean)};
  draft.photos = [];
  draft.shot = 0;
}
function confirmSource() {
  if (!draft.pendingSource) return;
  draft.source = draft.pendingSource;
  draft.pendingSource = null;
}
const sourceDetails = (source = draft.source) => source && el('div', {class:'source-filename',role:'status'},
  el('strong', {}, '目前來源：' + source.label),
  source.files.length
    ? el('ul', {}, source.files.map(name => el('li', {}, name)))
    : el('small', {}, '示意流程，尚未選擇照片。'));
function roomSizeForm() {
  const index = draft.room;
  const size = draft.roomSizes.get(index);
  const dimension = (name, value, [min,max]) => el('label', {}, name, el('input', {
    type:'number', name, min, max, step:0.01, required:'', value:value ?? '',
  }));
  return el('form', {class:'room-size-form',onsubmit:event => {
    event.preventDefault();
    const form = event.currentTarget;
    const [w, d] = [...form.querySelectorAll('input')].map(input => input.valueAsNumber);
    draft.roomSizes.set(index, {w,d});
    render(false);
    screen.querySelector('.room-size-form button')?.focus({preventScroll:true});
  }}, el('h2', {}, rooms[index] + '尺寸'),
  el('p', {class:'muted',role:'status'}, size ? '已儲存手改尺寸，重選平面圖會保留。' : '從平面圖選房間後可手動更正。'),
  el('div', {class:'room-size-fields'}, dimension('長度（公尺）', size?.w, LIMITS.w), dimension('寬度（公尺）', size?.d, LIMITS.d)),
  el('button', {type:'submit'}, '儲存' + rooms[index] + '尺寸'));
}
function startUpload(newProject) {
  const error = el('p', {class:'upload-error',role:'status'});
  const input = el('input', {type:'file',accept:'image/*,.pdf,application/pdf','aria-labelledby':'upload-label','aria-describedby':'upload-hint',
    onchange:event => {
      const file = event.currentTarget.files[0];
      if (!file) return;
      const pdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const image = file.type.startsWith('image/') || /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|tiff?|webp)$/i.test(file.name);
      if (!pdf && !image) {
        event.currentTarget.value = '';
        error.textContent = '請選圖片或 PDF，再試一次。';
        return;
      }
      error.textContent = '';
      stageSource(pdf ? '平面圖' : '現場照片', file, newProject);
    }});
  return el('div', {class:'start-options'},
    el('label', {class:'start-upload'}, input,
      el('span', {class:'upload-copy'},
        el('span', {id:'upload-label'},
          el('strong', {class:'upload-desktop'}, '上傳平面圖或照片'),
          el('strong', {class:'upload-mobile'}, '拍照或上傳平面圖')),
        el('small', {id:'upload-hint','aria-hidden':'true'}, '建商平面圖、手繪、現場照片都可以')),
      el('span', {class:'upload-icon','aria-hidden':'true'}, '↑')),
    error);
}
// Section label above a page title. Add-ons also carry the way back to the home hub.
const eyebrow = (number, name, addon = false) => el('p', {class:'eyebrow'},
  addon && el('a', {href:href('project'),class:'back-link'}, '‹ 回這個家'),
  addon && el('span', {class:'badge'}, '加值'), el('span', {}, number + ' ' + name));
const detailRows = items => el('ul', {class:'rows detail-rows'}, items.map(([name, detail, value]) =>
  el('li', {}, el('span', {}, name, el('small', {}, detail)),
    value && el('span', {class:'badge' + (value === '讀到了' || value === '含' ? '' : ' paid')}, value))));
function drawingSheets() {
  const cond = roomCondition();
  const look = roomLook();
  return wireframeDrawingSet(cond, look, designEstimate(cond, look), '2026-11-19', draft.appliedLayout);
}
function stylePrice(style) {
  const current = draft.style;
  draft.style = style;
  const value = price(sumCosts(roomCostItems(0)));
  draft.style = current;
  return value;
}
let ticker;
// A short staged list for the two transitions. It finishes at once when motion is reduced.
function stepList(steps, label) {
  const items = steps.map(([title, detail]) => el('li', {class:'scan-step'},
    el('span', {class:'scan-mark','aria-hidden':'true'}),
    el('span', {}, el('strong', {}, title), el('small', {}, detail)), el('span', {class:'badge'})));
  const status = el('p', {class:'muted',role:'status'});
  let done = matchMedia('(prefers-reduced-motion: reduce)').matches ? steps.length : 0;
  const paint = () => {
    items.forEach((item, index) => {
      const state = index < done ? '已完成' : index === done ? '進行中' : '待處理';
      item.dataset.state = state;
      item.querySelector('.scan-mark').textContent = index < done ? '✓' : '';
      item.querySelector('.badge').textContent = state;
      if (index === done) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    status.textContent = done >= steps.length ? '都好了。' : '';
  };
  paint();
  if (done < steps.length) ticker = setInterval(() => {
    done++;
    paint();
    if (done >= steps.length) clearInterval(ticker);
  }, 900);
  return [el('ol', {class:'scan-steps','aria-label':label}, items), status];
}
// Every change to the layout is a new version; compliance and feng shui read the current one.
function setChange(key, on) {
  if (draft.changes.includes(key) === on) return;
  draft.changes = on ? [...draft.changes, key] : draft.changes.filter(value => value !== key);
  draft.appliedLayout = draft.changes.includes('kitchen');
  draft.layoutVersion++;
  draft.layoutOriginal = false;
}
const quizDone = () => questions.every((_, index) => draft.quizAnswers[index] != null);
function prefSuggestions() {
  if (!draft.prefsShared) return [];
  const answers = draft.quizAnswers;
  return [answers[1] === 2 && 'kitchen', answers[0] === 0 && 'entry', answers[3] === 0 && 'bed'].filter(Boolean);
}
function complianceFindings() {
  const open = draft.changes.includes('kitchen');
  return [
    {id:'permit', name:'室內裝修許可', where:'廚房・餐廳', source:'建築法規示例',
      detail:open ? 'v' + draft.layoutVersion + ' 拿掉了隔間牆，施工前需要申請。' : '這一版沒有拿掉隔間牆。',
      status:open ? '要處理' : '沒問題', advice:open && '保留這道牆，就不用申請',
      adopt:open && (() => setChange('kitchen', false))},
    {id:'alarm', name:'住宅用火災警報器', where:'客廳', source:'消防法規示例',
      detail:'天花板重做時，警報器要保留或補裝。', status:'要處理'},
    {id:'flame', name:'裝修材料耐燃等級', where:'全室', source:'建築法規示例',
      detail:draft.floor ? '已補：' + draft.floor + ' 樓，交由專業人員確認。' : '要知道你家在第幾樓才能判斷。',
      status:draft.floor ? '待覆核' : '待補資料'},
    {id:'sprinkler', name:'撒水頭淨空', where:'全室', source:'消防法規示例',
      detail:'依這個範例的空間資料，沒有撒水頭。', status:'沒問題'},
  ];
}
function fengFindings() {
  const open = draft.changes.includes('kitchen');
  const stove = open && !draft.changes.includes('screen');
  const bed = !draft.changes.includes('bed');
  return [
    {id:'stove', name:'開門見灶', where:'大門 → 廚房', source:'風水規則示例',
      detail:stove ? '打開廚房後，從大門看得到爐火。' : open ? '已加屏風櫃擋住視線。' : '廚房有隔間，從大門看不到爐火。',
      status:stove ? '要處理' : '沒問題', advice:stove && '玄關加屏風櫃',
      adopt:stove && (() => setChange('screen', true))},
    {id:'bed', name:'床頭靠窗', where:'主臥', source:'風水規則示例',
      detail:bed ? '床頭貼著窗。' : '床頭已改靠實牆。',
      status:bed ? '要處理' : '沒問題', advice:bed && '床轉 90 度靠牆',
      adopt:bed && (() => setChange('bed', true))},
    {id:'hall', name:'穿堂', where:'大門 → 落地窗', source:'風水規則示例',
      detail:'有玄關櫃擋住。', status:'沒問題'},
    {id:'door', name:'大門方位', where:'大門', source:'風水規則示例',
      detail:'需要大門朝向才能判斷。', status:'待補資料'},
  ];
}
const openFindings = (findings, prefix) =>
  findings.filter(item => item.status === '要處理' && !draft.dismissed.has(prefix + item.id)).length;
const findingCounts = (findings, prefix) => '要處理 ' + openFindings(findings, prefix) +
  '・待補 ' + findings.filter(item => item.status === '待補資料').length +
  '・沒問題 ' + findings.filter(item => item.status === '沒問題').length;
// Compliance and feng shui share one result format: item, place, state, note, source, advice.
function findingList(findings, prefix) {
  return findings.map((item, index) => {
    const key = prefix + item.id;
    const dismissed = item.status === '要處理' && draft.dismissed.has(key);
    const open = item.status === '要處理' && !dismissed;
    return el('article', {class:'check-result'},
      el('h3', {}, (index + 1) + ' ' + item.name),
      el('span', {class:'badge' + (open || item.status === '待補資料' ? ' paid' : '')}, dismissed ? '不處理' : item.status),
      el('small', {}, item.where), el('p', {}, item.detail),
      open && item.advice && el('p', {}, el('strong', {}, '建議：'), item.advice),
      el('small', {}, '來源：' + item.source + '・條號待專業確認'),
      open && actions(item.adopt && el('button', {type:'button',class:'primary','aria-label':'採納，回精修套用：' + item.advice,
        onclick:() => { item.adopt(); go('layout'); }}, '採納，回精修套用'),
        el('button', {type:'button','aria-label':'不處理：' + item.name,onclick:refresh(() => draft.dismissed.add(key))}, '不處理')));
  });
}
const resumePage = project => project.draft.pendingSource ? 'scanning' : project.page;

function recentProject(id, project) {
  const state = project.draft;
  const page = resumePage(project);
  const stage = projectProgress[page];
  const source = page === 'scanning' ? state.pendingSource : state.source;
  const isPlan = stage === '待補' || (stage === '解析中' && source && source.label !== '現場照片');
  const imageStage = stage === '解析中' ? 0 : stage === '進行中' ? 3 : stages.length - 1;
  const sourceName = source?.files[0];
  const status = stage === '團隊對接' && state.sent ? '示意已送件' : stage;
  const openLabel = stage === '初步報價' ? '看報價' : '繼續設計';
  const detail = stage === '解析中' || stage === '待補' ? sourceName ?? '示意空間' :
    rooms[state.room] + ' · ' + looks[state.style];
  return el('article', {class:'home-project'},
    el('div', {class:'home-project-visual'}, isPlan
      ? planDiagram(state, state.appliedLayout)
      : el('img', {src:projectPhoto(imageStage, state),alt:rooms[state.room] + '示意預覽'})),
    el('div', {class:'home-project-info'},
      el('h3', {}, el('a', {href:href(page, id),class:'home-project-link','aria-label':project.name + '，' + openLabel},
        project.name)),
      el('small', {}, detail),
      el('span', {class:'badge'}, status)));
}

function homesPage() {
  const entries = [...projects];
  const newHomes = entries.filter(([, project]) => project.isNew).reverse();
  const examples = entries.filter(([, project]) => !project.isNew && !project.isExample);
  return el('div', {class:'homes-dashboard stack'},
    el('header', {class:'homes-heading'}, el('h1', {}, '我的家')),
    el('section', {class:'home-entry','aria-label':'開始設計'},
      el('p', {}, '開始新的設計'), startUpload(true)),
    el('section', {'aria-labelledby':'recent-homes-title'},
      el('h2', {id:'recent-homes-title'}, '最近的家'),
      newHomes.length ? el('div', {class:'recent-homes'}, newHomes.map(([id, project]) => recentProject(id, project)))
        : el('p', {class:'homes-empty'}, '你開始的設計會出現在這裡。')),
    el('details', {class:'home-examples',...(examplesOpen ? {open:''} : {}),
      ontoggle:event => {if (event.currentTarget.isConnected) examplesOpen = event.currentTarget.open;}},
      el('summary', {}, '看示範'),
      el('section', {'aria-label':'設計示例'},
        el('div', {class:'recent-homes'}, examples.map(([id, project]) => recentProject(id, project))))));

}

function scanningPage() {
  const cancelPage = draft.source || draft.roomSizes.size ? 'read' : 'entry';
  const cancel = () => {
    draft.pendingSource = null;
    projects.get(projectId).page = cancelPage;
  };
  const photos = draft.pendingSource?.label === '現場照片';
  return grid(el('div', {class:'plan-stage scan-plan'},
    el('h2', {class:'plan-note'}, '示意平面圖'),
    el('div', {class:'scan-drawing'}, planDiagram(draft, draft.appliedLayout))),
    card(eyebrow('01', '空間解析'), ...heading(photos ? '正在讀你的照片' : '正在讀你的平面圖',
      '大概 20 秒。讀不到的地方我會標「待補」，不會卡住你。'),
      el('p', {class:'panel-note'}, '示意解析，使用範例平面。'),
      sourceDetails(draft.pendingSource),
      ...stepList(scanSteps, '解析步驟'),
      actions(el('a', {href:href(cancelPage),class:'button',onclick:cancel}, '取消'),
        el('a', {href:href('read'),class:'button primary',onclick:confirmSource}, '看我讀到什麼'))), 'scan-grid');
}

function changeQuizStep(offset) {
  draft.quizStep += offset;
  render(false);
  screen.querySelector('#layout-question').focus();
}

function profilePage() {
  const answers = draft.quizAnswers;
  const answered = answers.filter(value => value != null).length;
  const cook = answers[1] === 2;
  const preference = (name, step) => answers[step] != null &&
    [name, questions[step][answers[step] + 1].join('，')];
  const preferences = [preference('回家', 0), preference('下廚', 1), preference('收納', 2),
    preference('睡眠', 3), preference('待客', 4)].filter(Boolean);
  const personality = cook ? '窩居料理派' : '自然實用派';
  return grid(el('div', {class:'plan-stage profile-plan'},
    el('h2', {class:'plan-note'}, '測驗完成・' + answered + '／5 關・格局還沒動'),
    planDiagram(draft, draft.appliedLayout, null, draft.changes)),
    card(eyebrow('03', '生活測驗・結果', true), el('h1', {id:'profile-title',tabindex:'-1'}, '你的居家人格'),
      el('div', {class:'profile-personality'},
        el('h2', {}, personality),
        el('p', {}, cook ? '家是用來煮飯和賴著的，東西要收得掉。' : '家要好整理、好放鬆，不用太多裝飾。')),
      el('section', {class:'stack'}, el('h2', {}, '你的偏好（要不要套用，你決定）'),
        preferences.length ? rows(preferences) : el('p', {class:'muted'}, '還沒有答案，回測驗選一選。')),
      draft.shareMessage && el('p', {role:'status'}, draft.shareMessage),
      actions(link('回測驗', 'quiz'), button('分享人格', async () => {
        try {
          await navigator.clipboard.writeText('我的居家人格：' + personality);
          draft.shareMessage = '已複製到剪貼簿。';
        } catch {
          draft.shareMessage = '無法複製，請手動選取文字。';
        }
        render(false);
      }), button('把偏好帶去精修', () => { draft.prefsShared = true; go('layout'); }, null, 'primary'))), 'profile-grid');
}

function layoutPage() {
  const version = draft.layoutVersion;
  const original = draft.layoutOriginal && draft.changes.length > 0;
  const keys = original ? [] : draft.changes;
  const delta = key => {
    const [low, high] = layoutChanges[key].extra;
    return '＋' + (low === high ? low + ' 萬' : price([low, high]));
  };
  const fromQuiz = prefSuggestions();
  const suggestions = ['kitchen', 'entry', 'bed'].filter(key => !draft.changes.includes(key));
  const compliance = openFindings(complianceFindings(), 'c:');
  const feng = openFindings(fengFindings(), 'f:');
  const form = el('form', {class:'result-tune layout-form',onsubmit:event => {
    event.preventDefault();
    const request = event.currentTarget.querySelector('input').value.trim();
    const key = /廚房|中島|開放/.test(request) ? 'kitchen' : /玄關|收納|鞋櫃/.test(request) ? 'entry' : /床/.test(request) ? 'bed' : null;
    if (key && !draft.changes.includes(key)) {
      setChange(key, true);
      draft.layoutMessage = '已加入「' + layoutChanges[key].name + '」，這是 v' + draft.layoutVersion + '。';
    } else {
      draft.layoutMessage = key ? '這一版已經有「' + layoutChanges[key].name + '」。'
        : '示意版可以調整：廚房中島、玄關收納、主臥床向。';
    }
    render(false);
    screen.querySelector('.layout-form input')?.focus({preventScroll:true});
  }}, el('input', {type:'text','aria-label':'還想怎麼改？說一句話',required:'',placeholder:'還想怎麼改？例：廚房打開'}),
  el('button', {type:'submit',class:'primary','aria-label':'套用格局調整'}, '→'));
  return grid(el('div', {class:'plan-stage profile-plan'},
    el('div', {class:'profile-plan-heading'},
      el('h2', {class:'plan-note'}, '格局方案 v' + version + '・改了 ' + draft.changes.length + ' 處'),
      draft.changes.length > 0 && el('div', {class:'actions profile-compare',role:'group','aria-label':'比較格局'},
        button('調整後 v' + version, refresh(() => {draft.layoutOriginal = false;}), !original),
        button('原本 v1', refresh(() => {draft.layoutOriginal = true;}), original))),
    planDiagram(draft, !original && draft.appliedLayout, null, keys),
    el('div', {class:'profile-total',role:'status','aria-label':'整戶估價'},
      el('small', {}, original ? '整戶・原本估算' : '整戶・這一版估算'),
      el('strong', {}, price(sumCosts(homeCosts(keys).wholeHome))))),
    card(eyebrow('03', '精修格局'), el('h1', {}, '格局方案 v' + version),
      draft.changes.length
        ? el('ol', {class:'change-list','aria-label':'這一版的調整'}, draft.changes.map(key => el('li', {},
          el('span', {}, el('strong', {}, layoutChanges[key].name), el('small', {}, layoutChanges[key].detail)),
          el('span', {class:'badge'}, delta(key)),
          el('button', {type:'button','aria-label':'拿掉：' + layoutChanges[key].name,onclick:() => {
            setChange(key, false);
            draft.layoutMessage = '已拿掉「' + layoutChanges[key].name + '」，這是 v' + draft.layoutVersion + '。';
            render(false);
            screen.querySelector('.layout-form input')?.focus({preventScroll:true});
          }}, '拿掉'))))
        : el('p', {class:'muted'}, '這一版還是原本的格局。挑一個調整，或說一句話。'),
      suggestions.length > 0 && el('section', {class:'stack'}, el('h2', {}, '可以這樣改'),
        el('div', {class:'actions',role:'group','aria-label':'可以這樣改'}, suggestions.map(key =>
          el('button', {type:'button',onclick:() => {
            setChange(key, true);
            draft.layoutMessage = '已加入「' + layoutChanges[key].name + '」，這是 v' + draft.layoutVersion + '。';
            render(false);
            screen.querySelector('.layout-form input')?.focus({preventScroll:true});
          }}, '＋ ' + layoutChanges[key].name + (fromQuiz.includes(key) ? '（生活測驗）' : ''))))),
      form, draft.layoutMessage && el('p', {role:'status'}, draft.layoutMessage),
      el('section', {class:'stack'}, el('h2', {}, '想看再點：這一版的加值檢查'),
        actions(link('法規 ' + compliance, 'compliance'),
          link(draft.fengOn ? '風水 ' + feng : '風水 未納入', 'feng'),
          link('生活測驗 ' + (quizDone() ? '已完成' : '未做'), quizDone() ? 'profile' : 'quiz'))),
      actions(link('回這個家', 'project'), link('這一版定案，出施工圖', 'drawings', 'button primary'))), 'profile-grid');
}

function projectPage() {
  const locked = !draft.unlocked;
  const addon = (name, note, page, paid = false) => {
    const gated = paid && locked;
    return el('a', {href:href(gated ? 'unlock' : page),class:'addon-card'},
      el('strong', {}, name), el('small', {}, note),
      paid && el('span', {class:'badge' + (gated ? ' paid' : '')}, gated ? '解鎖後' : '已解鎖'));
  };
  return grid(preview(), card(el('p', {class:'eyebrow'}, el('span', {}, '這個家・' + projects.get(projectId).name)),
    el('h1', {}, '你家・' + rooms[draft.room]),
    el('p', {class:'muted'}, looks[draft.style] + '・' + roomArea() + ' 坪' + (locked ? '' : '・已解鎖')),
    roomButtons(),
    el('p', {class:'quote-line'}, el('strong', {class:'price'}, estimate()), el('small', {}, '初步報價'), link('看整戶', 'whole', 'text-link')),
    draft.room === 0 && tuneForm(),
    el('section', {class:'stack'}, el('h2', {}, '加值：想看的時候再進去'),
      el('div', {class:'addon-grid'},
        addon('家具與材質', '每一件都有尺寸', 'materials'), addon('毛胚到完成', '拉一下看家長出來', 'compare'),
        addon('法規細評', '逐條檢核附來源', 'compliance', true), addon('風水評估', '逐項檢查與建議', 'feng', true),
        addon('生活測驗', '五題找出你的偏好', 'quiz', true))),
    el('div', {class:'result-next'}, locked
      ? [link('解鎖施工圖', 'unlock', 'button premium-action'), el('small', {}, '精修格局＋施工圖 ' + drawingSheets().length + ' 張')]
      : [link('繼續精修格局', 'layout', 'button primary'), el('small', {}, '定案後出施工圖')])), 'result-grid');
}

const pages = {
  entry: hasProject => el('section', {class:'hero','aria-labelledby':'entry-title'},
    el('img', {class:'hero-photo',src:photo,alt:'靜謐橡木客廳示意',width:1536,height:1024,fetchpriority:'high'}),
    el('div', {class:'hero-copy'},
      el('h1', {id:'entry-title'}, '把家的想像，', el('br'), '變成真的。'),
      el('p', {}, '給我們你的房子，', el('br', {class:'promise-break'}), '還你成品、報價與施工圖。')),
    el('div', {class:'hero-start'}, startUpload(!hasProject),
      el('a', {href:href('result', 'example'),class:'hero-example'}, '手邊沒有？先看一個範例的家')),
    el('ol', {class:'hero-steps'}, el('li', {}, '你給房子'), el('li', {}, '看成品與報價・免費'), el('li', {}, '拿到施工圖・付費')),
    el('p', {class:'hero-steps-mobile'}, '免費看成品與報價，喜歡再解鎖施工圖')),
  homes: homesPage,
  camera: () => grid(figure(photo, '拍照位置示意'), card(eyebrow('01', '拍照引導'), ...heading('現場拍照', '第 ' + (draft.shot + 1) + ' 張／4'),
    rows(shots.map((name, i) => [name, i < draft.shot ? '已完成' : i === draft.shot ? '正在拍攝' : '待補'])),
    picker('從相簿選或拍攝', {accept:'image/*',capture:'environment'}, event => {
      const file = event.target.files[0];
      if (!file) return;
      draft.photos[draft.shot] = file.name;
      draft.shot = Math.min(3, draft.shot + 1);
      render(false);
    }),
    draft.photos.some(Boolean) && el('ul', {class:'source-filename'}, draft.photos.filter(Boolean).map(name => el('li', {}, name))),
    actions(button('下一張', refresh(() => {draft.shot = Math.min(3, draft.shot + 1);})),
      el('a', {href:href('scanning'),class:'button primary',onclick:usePhotos}, '拍完了')))),
  scanning: scanningPage,
  read: () => {
    const progress = 72 + (draft.conditions ? 14 : 0) + (draft.source?.label === '機電圖' ? 14 : 0);
    return grid(plan(true),
      card(eyebrow('01', '空間解析'), ...heading('我讀懂的你家'),
        el('p', {class:'panel-note'}, '示意平面圖讀到 8 間和尺寸。有 2 項圖上沒有、1 項我不確定，先標起來，不補也能往下走。'),
        el('details', {class:'room-size-panel', ...(draft.editRoomSize ? {open:''} : {}),
          ontoggle:event => {if (event.currentTarget.isConnected) draft.editRoomSize = event.currentTarget.open;}},
          el('summary', {}, '修改' + rooms[draft.room] + '尺寸'), roomSizeForm()),
        draft.conditions && el('p', {}, draft.conditions), actions(...[['','全部 6'],['待補','待補 2'],['請確認','請確認 1']]
          .map(([key, text]) => button(text, refresh(() => {draft.filter = key;}), draft.filter === key))),
        detailRows(fields.filter(([,, state]) => !draft.filter || state === draft.filter)),
        actions(link('＋ 再拍幾張', 'camera'), picker('＋ 上傳機電圖', {accept:'image/*,.pdf'}, event => upload(event, false)),
          link('直接填', 'conditions')),
        sourceDetails(),
        actions(picker('重選平面圖', {accept:'image/*,.pdf'}, upload)),
        el('label', {class:'condition-progress'}, '空間條件 ' + progress + '%', el('progress', {max:100,value:progress})),
        actions(link('對，看推薦的風格', 'style', 'button primary'))));
  },
  conditions: () => card(eyebrow('01', '空間解析'), ...heading('補充空間條件'), el('label', {}, '天花板及管線備註',
    el('textarea', {oninput: event => {draft.conditions = event.target.value;}}, draft.conditions || '')), link('返回空間條件', 'read', 'button primary')),
  brief: () => grid(figure(image(), '你家客廳・先用' + looks[draft.style] + '預覽'),
    card(eyebrow('02', '微調風格'), ...heading('都不像？說一句話，或丟幾張你喜歡的圖。'),
      el('label', {}, '想要什麼樣的家', el('textarea', {
        placeholder:'例如：想要乾淨、安靜一點，木頭多、東西都收得起來。',
        oninput:event => {draft.note = event.target.value;},
      }, draft.note)),
      picker('＋ 參考圖', {accept:'image/*',multiple:''}, event => {
        draft.refs = Array.from(event.target.files, f => f.name).join('、');
        render(false);
      }), draft.refs && el('small', {}, '參考圖：' + draft.refs),
      el('p', {}, '我聽到的是這樣，不對的點掉就好：'),
      el('div', {class:'actions',role:'group','aria-label':'聽到的偏好'}, briefTags.map(tag =>
        button(tag, refresh(() => {
          draft.tags = draft.tags.includes(tag) ? draft.tags.filter(value => value !== tag) : [...draft.tags, tag];
        }), draft.tags.includes(tag)))),
      actions(link('回到三個推薦', 'style'), link('照這樣生成，看實景與報價', 'generating', 'button primary')))),
  style: () => grid(figure(image(), '方向 ' + 'ABC'[draft.style] + '・' + looks[draft.style], looks[draft.style] + '客廳示意'),
    card(eyebrow('02', '初步推薦'), ...heading('我先推薦三個方向', '我看過你家的格局、採光和坪數，先收斂成這三個。點一個，畫面馬上換。'),
      el('div', {class:'style-options',role:'group','aria-label':'風格方向'}, looks.map((name, i) =>
        el('button', {type:'button','aria-pressed':draft.style === i,onclick:refresh(() => {draft.style = i;})},
          el('img', {src:image(i),alt:'',loading:'lazy'}),
          el('span', {}, el('strong', {}, 'ABC'[i] + ' ' + name), el('small', {}, lookNotes[i] + '・' + stylePrice(i))),
          draft.style === i && el('span', {class:'style-check','aria-hidden':'true'}, '✓')))),
      draft.styleNote && el('p', {role:'status'}, draft.styleNote),
      el('div', {class:'style-next'}, link('用 ' + 'ABC'[draft.style] + ' 生成我家的 3D', 'generating', 'button primary'),
        el('div', {class:'style-alternative'}, link('都不像？說一句話或丟參考圖', 'brief', 'text-link'),
          button('換三個', refresh(() => {draft.styleNote = '示意版目前只有這三個方向，可以說一句話微調。';})))))),
  generating: () => grid(figure(image(), '方向 ' + 'ABC'[draft.style] + '・' + looks[draft.style], looks[draft.style] + '客廳示意'),
    card(eyebrow('02', '生成中'), ...heading('正在把你家蓋出來', '示意過場，使用範例資料。'),
      ...stepList(buildSteps, '生成步驟'),
      actions(link('回推薦風格', 'style'), link('看成品與報價', 'result', 'button primary')))),
  result: () => {
    const costs = roomCostItems();
    return grid(preview(), el('section', {class:'card stack result-quote'},
      eyebrow('02', '你家的樣子'), el('h1', {}, rooms[draft.room] + '・' + looks[draft.style]),
      el('p', {class:'quote-line'}, el('strong', {class:'price'}, price(sumCosts(costs))), el('small', {}, '初步報價・免費')),
      draft.room === 0 && tuneForm(),
      el('p', {class:'panel-note'}, '法規已初檢・家具為真實尺寸・報價用在地行情（皆為示意資料）'),
      costDetails('看單室費用明細', costs),
      el('section', {class:'drawings-teaser'}, el('strong', {}, '施工圖 ' + drawingSheets().length + ' 張'),
        el('small', {}, draft.unlocked ? '已解鎖・平面・立面・水電' : '解鎖後清晰可下載・平面・立面・水電')),
      el('div', {class:'result-next'}, link('進到這個家', 'project'), draft.unlocked
        ? link('繼續精修格局', 'layout', 'button primary') : link('解鎖施工圖', 'unlock', 'button premium-action'))), 'result-grid');
  },
  project: projectPage,
  whole: () => {
    const {byRoom:costsByRoom, wholeHome} = homeCosts();
    const currentRoom = costsByRoom[draft.room];
    const next = (draft.room + 1) % rooms.length;
    return grid(preview(), card(eyebrow('02', '整個家', true), ...heading('一間一間看，整戶一起算', '點下面的房間切換。報價是各間加總出來的。'),
      roomButtons(),
      el('p', {class:'quote-line'}, el('strong', {class:'price'}, price(sumCosts(currentRoom))), el('small', {}, rooms[draft.room] + '初步報價')),
      el('p', {class:'quote-line'}, el('strong', {class:'price'}, price(sumCosts(wholeHome))), el('small', {}, '整戶・初步報價')),
      costDetails('看單室費用明細', currentRoom), costDetails('看整戶費用明細', wholeHome),
      rows(rooms.map((name, i) => [name + ' ' + roomArea(i) + ' 坪', price(sumCosts(costsByRoom[i]))])),
      actions(button('下一間：' + rooms[next], refresh(() => setRoom(next))), draft.unlocked
        ? link('繼續精修格局', 'layout', 'button primary') : link('解鎖精修與施工', 'unlock', 'button premium-action'))), 'result-grid');
  },
  materials: () => grid(preview(), card(eyebrow('02', '家具與材質', true),
    ...heading(rooms[draft.room] + '用到的', '示意型錄・品牌、型號與價格待接真實商品。換款會反映在清單與初步報價。'),
    el('p', {class:'quote-line'}, el('strong', {class:'price'}, estimate()), el('small', {}, rooms[draft.room] + '初步報價')),
    draft.room === 0 ? furnitureList() : actions(button('換一款：' + roomOptions[draft.room][changedRoom() ? 0 : 1], refresh(() => {
      if (changedRoom()) draft.changedRooms.delete(draft.room);
      else draft.changedRooms.add(draft.room);
    }), changedRoom())),
    rows([[featuredItem(), '1 件'], [catalogue.FLOORS[0].n, '地板'], [catalogue.WALLS[0].n, '牆面']]),
    actions(link('看整戶清單', 'whole'), link('換好了，更新報價', 'result', 'button primary')),
    el('a', {href:studio + 'prototype/',class:'text-link'}, '開啟 3D 風格實驗室'))),
  compare: () => {
    const room = rooms[draft.room];
    const stage = draft.comparisonStage;
    const before = el('img', {src:roomScene(draft.room, 0, draft.appliedLayout), alt:room + ' · 毛胚示意'});
    const after = el('img', {src:projectPhoto(stage), alt:room + ' · ' + stages[stage] + '示意'});
    const filter = finishFilter(lookFilters[draft.style], stage);
    const notice = el('small', {role:'status'});
    const range = el('input', {type:'range',value:50,'aria-label':'毛胚與完成比較',oninput:event => {
      after.style.clipPath = 'inset(0 0 0 ' + event.target.value + '%)';
    }});
    after.style.filter = filter;
    after.style.clipPath = 'inset(0 0 0 50%)';
    return grid(el('div', {class:'media compare'}, before, stage > 0 && after,
      el('div', {class:'comparison-labels'}, el('span', {}, '毛胚'), el('span', {}, stages[stage]))),
      card(eyebrow('02', '從毛胚到完成', true), ...heading('家一步一步長出來', room + '・同一個角度、同一道日光的各階段示意'),
        roomButtons(), range,
        el('div', {class:'actions',role:'group','aria-label':'施工階段'}, stages.map((name, i) =>
          button((i + 1) + ' ' + name, refresh(() => {draft.comparisonStage = i;}), i === stage))),
        notice,
        actions(button('存成對比圖', async () => {
          try {
            await saveComparison(before, after, Number(range.value), filter);
          } catch {
            notice.textContent = '圖檔載入失敗，請再試一次。';
          }
        }), link('看初步報價', 'result', 'button primary'))));
  },
  unlock: () => {
    const count = drawingSheets().length;
    return grid(figure(image(), '施工圖 ' + count + ' 張，還鎖著・平面・立面・水電'),
      card(eyebrow('03', '解鎖'), ...heading('喜歡的話，拿到施工圖', '付費方案示意・NT$ 價格待定・整戶一次'),
        detailRows([['精修格局', '直接改隔間與動線，每改一次都看得到', '含'],
          ['真實施工圖 ' + count + ' 張', '平面、立面、水電，可下載、交給團隊', '含']]),
        el('p', {class:'panel-note'}, '另外會開啟：法規細部評估、風水評估、生活測驗。想看的時候再進去。'),
        actions(link('先不要', 'project'), button('解鎖', () => {draft.unlocked = true; go('unlocked');}, null, 'premium-action')),
        el('small', {}, '示意解鎖，不會收費。')));
  },
  unlocked: () => grid(figure(image(), '已解鎖・A-01 平面配置圖・可下載'),
    card(eyebrow('03', '已解鎖'), ...heading('解鎖了。現在可以把它做出來。'),
      rows([['精修格局', '從這裡開始'], ['真實施工圖', '定案後下載'], ['法規細評・風水評估・生活測驗', '已開啟']]),
      el('p', {class:'panel-note'}, '這三樣是加值，想看的時候從「這個家」進去。'),
      actions(link('回這個家', 'project'), link('開始精修格局', 'layout', 'button primary')))),
  layout: layoutPage,
  quiz: () => {
    const step = draft.quizStep;
    const [prompt, ...choices] = questions[step];
    const answered = draft.quizAnswers[step] != null;
    return grid(el('div', {class:'plan-stage profile-plan'},
      el('h2', {class:'plan-note'}, '生活測驗・第 ' + (step + 1) + ' 關／5'),
      planDiagram(draft, draft.appliedLayout, null, draft.changes)),
      card(eyebrow('03', '生活測驗', true),
        el('ol', {class:'review-stages','aria-label':'測驗進度'}, quizStages.map((name, i) =>
          el('li', i === step ? {'aria-current':'step'} : {}, (draft.quizAnswers[i] != null && i !== step ? '✓ ' : (i + 1) + ' ') + name))),
        el('h1', {id:'layout-question',tabindex:'-1'}, prompt),
        el('div', {class:'quiz-choices',role:'group','aria-label':prompt}, choices.map(([name, note], i) =>
          el('button', {type:'button','aria-pressed':draft.quizAnswers[step] === i,
            onclick:refresh(() => {draft.quizAnswers[step] = i;})}, el('strong', {}, name), el('small', {}, note)))),
        el('p', {class:'panel-note',role:'status'}, answered
          ? '記下來了。測驗只問你怎麼生活，不會動格局；五關答完再一起交給精修。' : '測驗只問你怎麼生活，不會動格局。'),
        actions(step > 0 && button('上一關', () => changeQuizStep(-1)),
          step < 4 ? button('下一關：' + quizStages[step + 1], () => changeQuizStep(1), null, 'primary')
            : link('看測驗結果', 'profile', 'button primary'))), 'profile-grid');
  },
  profile: profilePage,
  compliance: () => {
    const findings = complianceFindings();
    return grid(el('div', {class:'plan-stage profile-plan'},
      el('h2', {class:'plan-note'}, '檢核對象：格局方案 v' + draft.layoutVersion),
      planDiagram(draft, draft.appliedLayout, null, draft.changes)),
      card(eyebrow('03', '法規細部評估', true), ...heading('逐條檢核，附來源',
        '法規只檢查格局方案 v' + draft.layoutVersion + '、不改格局。採納的建議會交回精修。'),
        el('p', {role:'status'}, findingCounts(findings, 'c:')),
        ...findingList(findings, 'c:'),
        el('form', {class:'stack',onsubmit:event => {
          event.preventDefault();
          draft.floor = draft.floorInput;
          render(false);
        }},
        el('label', {}, '你家在第幾樓？', el('input', {type:'number',min:'1',max:'200',step:'1',required:'',
          value:draft.floorInput,oninput:event => {draft.floorInput = event.target.value;}})),
        el('button', {type:'submit'}, '儲存樓層並重查')),
        el('small', {}, '提醒，不是合格判定。以上皆為示意結果，交付前由專業人員複核。'),
        actions(link('回精修格局', 'layout', 'button primary'), link('看風水評估', 'feng'))), 'profile-grid');
  },
  feng: () => {
    const findings = fengFindings();
    return grid(el('div', {class:'plan-stage profile-plan'},
      el('h2', {class:'plan-note'}, '檢核對象：格局方案 v' + draft.layoutVersion),
      planDiagram(draft, draft.appliedLayout, null, draft.changes)),
      card(eyebrow('03', '風水模組評估', true), ...heading('逐項檢查與建議',
        '風水只檢查格局方案 v' + draft.layoutVersion + '、不改格局。採納的建議會交回精修。'),
        actions(button('納入風水', refresh(() => {draft.fengOn = !draft.fengOn;}), draft.fengOn)),
        el('p', {role:'status'}, draft.fengOn ? findingCounts(findings, 'f:') : '已略過風水，這一版不檢查。'),
        ...(draft.fengOn ? findingList(findings, 'f:') : []),
        el('small', {}, '風水是傳統習俗的參考，不是安全或法規判定。採納後會出新的一版，法規會重查。'),
        actions(button('略過風水', () => {draft.fengOn = false; go('layout');}), link('回精修格局', 'layout', 'button primary'))), 'profile-grid');
  },
  drawings: () => {
    const sheets = drawingSheets();
    const selected = sheets.find(sheet => sheet.no === draft.drawing) ?? sheets[0];
    const label = sheet => sheet.no + ' ' + sheet.title;
    const svg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(selected.svg);
    const types = [...new Set(sheets.map(sheet => sheet.type))];
    const current = sheets.filter(sheet => sheet.type === selected.type);
    return grid(stack(el('section', {class:'card stack print-sheet'}, el('h2', {}, label(selected)),
      el('img', {class:'drawing', src:svg, alt:label(selected) + ' · 示意'}),
      el('small', {}, '格局方案 v' + draft.layoutVersion + ' · ' + selected.status))),
      el('aside', {class:'card stack drawing-controls'}, eyebrow('03', '真實施工圖'),
        ...heading('你家的施工圖包', '示意圖面・待現場丈量與專業覆核'),
        el('ol', {class:'review-stages','aria-label':'圖面進度'}, ['AI 初稿', '設計師覆核', '現場丈量', '定稿可施工'].map((name, i) =>
          el('li', i === 0 ? {'aria-current':'step'} : {}, name))),
        el('p', {class:'panel-note'}, sheets.length + ' 張圖都出來了，目前是 AI 初稿。水電要等現場丈量才能定。'),
        actions(...types.map(type => button(type + ' ' + sheets.filter(sheet => sheet.type === type).length + ' 張',
          refresh(() => {draft.drawing = sheets.find(sheet => sheet.type === type).no;}), selected.type === type))),
        el('ul', {class:'rows'}, current.map(sheet => el('li', {},
          button(label(sheet), refresh(() => {draft.drawing = sheet.no;}), sheet.no === selected.no),
          el('span', {class:'badge'}, sheet.status)))),
        rows([['初步報價', estimate()], ['消防與裝修法規', openFindings(complianceFindings(), 'c:') + ' 項要處理']]),
        actions(link('看法規細節', 'compliance'), link('回精修格局', 'layout'), button('下載 PDF', () => window.print())),
        actions(link('交給團隊做出來', 'team', 'button primary'))));
  },
  team: () => grid(stack(figure(projectPhoto(), '這個家的交接包'),
    card(el('h2', {}, '交接包'), el('p', {class:'muted'}, '團隊一打開就看得懂你要什麼，不用從頭再講一次。'),
      detailRows([['3D 成品', rooms.length + ' 個空間・' + looks[draft.style]],
        ['施工圖 ' + drawingSheets().length + ' 張', '平面・立面・水電'],
        ['報價與施工清單', '工項、材料與家具、數量'],
        ['空間條件與法規', '尺寸、屋況、待補項目、要辦的許可']]))),
    card(eyebrow('03', '交給團隊'), ...heading('找人把它做出來', '示意名單・不會發送資料'),
      el('div', {class:'actions',role:'group','aria-label':'合作方式'}, ['設計師＋工班', '只找統包工班'].map(name =>
        button(name, refresh(() => {draft.teamType = name;}), draft.teamType === name))),
      el('div', {class:'team-list',role:'group','aria-label':'團隊'}, teams.map(([name, note], i) =>
        el('button', {type:'button','aria-pressed':draft.teams.has(i),onclick:refresh(() => {
          if (draft.teams.has(i)) draft.teams.delete(i);
          else draft.teams.add(i);
        })}, el('strong', {}, name), el('small', {}, note + '・服務區域與開工時間待確認')))),
      el('ol', {class:'review-stages','aria-label':'接下來'}, ['送交接包', '現場丈量', '正式報價', '簽約開工'].map((name, i) =>
        el('li', i === Number(draft.sent) ? {'aria-current':'step'} : {}, (i + 1) + ' ' + name))),
      el('p', {role:'status'}, draft.sent ? '示意已送出交接包給 ' + draft.teams.size + ' 組，接下來約現場丈量。' : '已選 ' + draft.teams.size + ' 組'),
      actions(link('回這個家', 'project'), el('button', {type:'button', ...(draft.sent ? {} : {class:'primary'}),
        ...(draft.teams.size ? {} : {disabled:''}), onclick:refresh(() => {draft.sent = !draft.sent;})},
        draft.sent ? '重設示意送件' : '送出交接包，約現場丈量')))),
};
const phase = [
  ['你給房子', '免費', 'read', ['entry','camera','scanning','conditions','read']],
  ['看成品與報價', '免費', 'style', ['brief','style','generating','result','project','whole','materials','compare']],
  ['拿到施工圖', '付費', 'unlock', ['unlock', ...premium]],
];
const phaseNav = (page, compact = false) => el('nav', {
  class:compact ? 'phase-nav phase-compact' : 'phase-nav', 'aria-label':'設計階段',
}, phase.map(([name, label, target, ids]) => {
  const active = ids.includes(page);
  const targetPage = draft.unlocked && target === 'unlock' ? 'layout' : target;
  return el('a', {href:href(targetPage), ...(active ? {'aria-current':'step'} : {})},
    el('span', {}, name), page !== 'entry' && el('small', {class:'badge' + (label === '付費' ? ' paid' : '')}, label));
}));
const railSections = {
  project:['project','whole'], read:['read','conditions','camera','scanning'],
  result:['style','brief','generating','result','compare','materials'], drawings:['unlock', ...premium],
};
function updateNavigation(page) {
  const work = page !== 'entry' && page !== 'homes';
  document.body.dataset.page = page;
  document.body.classList.toggle('workspace', work);
  rail.hidden = menu.hidden = !work;
  const hasHomes = [...projects.values()].some(project => project.isNew);
  for (const anchor of homeLinks) anchor.hidden = !hasHomes;
  menu.open = false;
  for (const anchor of railLinks) {
    const target = anchor.dataset.rail;
    anchor.href = href(target);
    if (railSections[target].includes(page)) anchor.setAttribute('aria-current', 'location');
    else anchor.removeAttribute('aria-current');
  }
  document.querySelector('.site-header > .phase-nav')?.remove();
  if (work) rail.before(phaseNav(page, true));
}
const projectProgress = {
  entry:'新建', camera:'進行中', scanning:'解析中', read:'待補', conditions:'待補', brief:'進行中', style:'進行中',
  project:'初步報價', result:'初步報價', unlocked:'精修中', layout:'精修中', quiz:'精修中', profile:'精修中',
  compliance:'法規細評', feng:'精修中', drawings:'施工圖', team:'團隊對接',
};
function render(focus = true) {
  clearInterval(ticker);
  scene?.dispose();
  scene = undefined;
  const [route, query] = location.hash.slice(1).split('?');
  const id = new URLSearchParams(query).get('project');
  if (projects.has(id)) projectId = id;
  const project = projects.get(projectId);
  draft = project.draft;
  const requested = Object.hasOwn(pages, route) ? route : 'entry';
  const page = premium.includes(requested) && !draft.unlocked ? 'unlock' : requested;
  if (page === 'scanning' && resumePage(project) !== 'scanning') {
    location.replace(href(project.page));
    return;
  }
  if (page !== 'entry' && page !== 'scanning' && Object.hasOwn(projectProgress, page)) {
    project.page = page;
  }
  updateNavigation(page);
  const layout = pages[page](projects.has(id));
  const workGrid = layout.matches('.grid') ? layout : layout.querySelector('.grid');
  const panel = workGrid?.children[1];
  if (panel?.classList.contains('card')) {
    panel.classList.add('work-panel');
    panel.prepend(phaseNav(page));
  }
  if (project.isExample && page !== 'entry' && page !== 'homes') {
    screen.replaceChildren(el('aside', {class:'example-banner'},
      el('strong', {}, '範例的家 · 示意'), el('a', {href:'#entry'}, '回首頁')), layout);
  } else screen.replaceChildren(layout);
  if (focus && page === 'profile') {
    screen.querySelector('#profile-title').focus();
  } else if (focus) {
    screen.focus({preventScroll:true});
    window.scrollTo(0,0);
  }
}
if (/^#r=[A-Za-z0-9_-]+$/.test(location.hash)) {
  location.replace('./fast-route/' + location.hash);
} else {
  window.addEventListener('hashchange', () => render());
  render(false);
}
