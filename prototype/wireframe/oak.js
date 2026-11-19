import { finishFilter, roomScene, saveComparison, stages } from './room-scenes.js';
import { roomDims, wireframeDrawingSet } from './fast-route/lib/drawings.js';
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
const looks = ['靜謐橡木', '暖調復古', '日光北歐'];
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
  ['三房兩廳兩衛', '讀到了'], ['各間尺寸與坪數', '讀到了'],
  ['門窗與採光面', '讀到了'], ['主臥床頭上方疑似有樑', '請確認'],
  ['天花板高度', '待補'], ['給排水與瓦斯位置', '待補'],
];
const questions = [
  ['怎麼回家？', '玄關收納', '開放玄關'], ['怎麼煮？', '天天煮', '偶爾煮'],
  ['怎麼收？', '封閉收納', '展示層架'], ['怎麼睡？', '遮光安靜', '自然採光'],
  ['誰會來？', '常有訪客', '以家人為主'],
];
const newDraft = () => ({
  room: 0, style: 0, shot: 0, step: 0, answers: [], roomSizes: new Map(), zoomIndex: 1, editRoomSize: false,
  filter: '', view: '實景', layoutPreview: true, profileOriginal: false, changedRooms: new Set(), chairChanged: false, tuneMessage: '', photos: [], source: null, pendingSource: null,
  appliedLayout: false, appliedFeng: [],
  unlocked: false, feng: new Set([0, 1]),
  drawing: 'A-01', comparisonStage: 4, floor: '', floorInput: '',
  checkedLayout: null, layoutVersion: 0, note: '', refs: '', tags: ['自然材質', '好整理'], team: '設計師＋工班', sent: false,
});
const projects = new Map([
  ['oak', {name:'靜謐橡木', page:'project', draft:newDraft()}],
  ['family', {name:'小家庭', page:'brief', draft:newDraft()}],
  ['floorplan', {name:'三房兩廳', page:'read', draft:newDraft()}],
  ['upload', {name:'新家平面圖', page:'scanning', draft:newDraft()}],
]);
let projectId = 'oak';
let draft = projects.get(projectId).draft;
let projectCount = 0;
const photo = roomScene(0);
const studio = './style-studio/';
const image = (n = draft.style) => [photo, studio + 'key-visuals/app/style-2.jpg', studio + 'key-visuals/app/style-1.jpg'][n];
const premium = ['layout', 'profile', 'compliance', 'feng', 'drawings', 'team'];
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
const go = (page, id = projectId) => { location.hash = href(page, id); };
function createProject(page) {
  const id = 'demo-' + ++projectCount;
  projects.set(id, {name:'新家 ' + projectCount, page, draft:newDraft(), isNew:true});
  return id;
}
const startProject = page => go(page, createProject(page));
const link = (name, page, primary = false) => el('a', {href:href(page),class:'button' + (primary ? ' primary' : '')}, name);
const button = (name, click, pressed) => el('button', {type:'button',onclick:click,...(pressed == null ? {} : {'aria-pressed':pressed})}, name);
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
  ...STYLES[['muji','retro','nordic'][draft.style]],
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

function roomCostItems(index = draft.room, openKitchen = draft.appliedLayout) {
  const space = roomKind(index);
  const baseline = baseRoomCosts[index];
  const cond = {space, ping:roomArea(index), age:'新成屋'};
  const look = roomLook();
  const defaultTerms = designEstimate({...cond, ping:areas[index]}, look).items;
  const adjustments = new Map();
  const add = (key, values) => adjustments.set(key, addPrices(adjustments.get(key) ?? [0,0], values));

  // Keep each demo surcharge on the work that changed.
  if (draft.style === 1) add(baseline.furniture ? 'furniture' : 'wall', [2,3]);
  if (draft.style === 2) add('cabinet', [4,6]);
  if (draft.changedRooms.has(index)) {
    const materialExtra = index === 0 ? livingFurniture[1].extra : [1,2];
    add(baseline.furniture ? 'furniture' : 'cabinet', materialExtra);
  }
  if (index === 0 && draft.chairChanged) add('furniture', livingFurniture[0].extra);
  if (index === 2 && openKitchen) add('cabinet', [2,2]);
  if ((index === 0 && draft.appliedFeng.includes(0)) || (index === 4 && draft.appliedFeng.includes(1))) {
    add('furniture', [1,1]);
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

function homeCosts(openKitchen = draft.appliedLayout) {
  const byRoom = rooms.map((_, index) => roomCostItems(index, openKitchen));
  return {byRoom, wholeHome:groupCosts(byRoom.flat())};
}

function costDetails(label, items) {
  const entries = items.map(({name, values, basis}) => el('li', {},
    el('span', {}, name, basis && el('small', {}, basis)),
    el('strong', {}, price(values))));
  return el('details', {class:'cost-details'}, el('summary', {}, label),
    el('p', {class:'muted'}, '依工項列出示意區間，實際單價與工法在現場丈量後確認。'),
    el('ul', {class:'rows'}, entries));
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
function resultFurniture() {
  const tune = el('form', {class:'result-tune',onsubmit:event => {
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
  }}, el('input', {type:'text','aria-label':'就地微調',required:'',placeholder:'想改什麼？例：沙發換淺灰'}),
  el('button', {type:'submit',class:'primary','aria-label':'套用微調'}, '→'));
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
  return el('section', {class:'result-furniture'}, tune,
    draft.tuneMessage && el('p', {role:'status'}, draft.tuneMessage),
    el('h2', {}, '家具示意'), el('ul', {}, options));
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
function planDiagram(projectDraft, openKitchen, selectRoom) {
  return el('div', {class:'plan',role:'group','aria-label':'平面圖示意','data-open-kitchen':openKitchen},
    rooms.map((name, index) => {
      const area = roomArea(index, projectDraft) + ' 坪';
      const attrs = {class:'plan-room'};
      if (selectRoom) Object.assign(attrs, {
        type:'button','aria-label':name + ' ' + area,
        'aria-pressed':projectDraft.room === index,onclick:selectRoom(index),
      });
      return el(selectRoom ? 'button' : 'div', attrs, el('span', {}, name), el('small', {}, area),
        index === 2 && openKitchen && el('small', {class:'plan-island'}, '中島'));
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
      draft.room === 2 && draft.appliedLayout ? '開放廚房與中島' : '', draft.appliedFeng.length ? '已套用風水示意' : ''].filter(Boolean).join(' · ');
    content = figure(projectPhoto(), caption, rooms[draft.room] + ' · 完工示意',
      el('a', {class:'hotspot button',href:href('materials'),'aria-label':'查看家具與材質'}));
    content.querySelector('img').style.filter = finishFilter(draft.style);
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
function upload(event, isPlan = true, newProject = false) {
  const file = event.target.files[0];
  if (!file) return;
  const id = newProject ? createProject('entry') : projectId;
  projects.get(id).draft.pendingSource = {label:isPlan ? '平面圖' : '機電圖', files:[file.name]};
  go('scanning', id);
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
const floorUpload = () => el('label', {class:'hero-upload'},
  el('input', {type:'file',accept:'image/*,.pdf','aria-label':'上傳建商平面圖',onchange:upload}),
  el('span', {}, el('strong', {}, '上傳建商平面圖'), el('small', {}, '手繪、權狀附圖也可以')),
  el('span', {class:'upload-arrow','aria-hidden':'true'}, '→'));
const proposedOpenKitchen = () => draft.answers[1] === '天天煮';
const layoutKey = () => JSON.stringify(draft.answers);
const backToLayout = () => el('a', {href:href('layout'),class:'button',onclick:() => {draft.step = 1;}}, '回精修格局');
function recheckLayout() {
  const key = layoutKey();
  if (draft.checkedLayout !== key) draft.layoutVersion++;
  draft.checkedLayout = key;
  draft.checkedKitchen = draft.answers[1];
  draft.appliedLayout = proposedOpenKitchen();
}
function complianceFindings() {
  const openKitchen = draft.checkedKitchen === '天天煮';
  const evaluated = draft.checkedLayout !== null;
  return [
    {name:'室內裝修許可', source:'建築法規示例',
      detail:openKitchen ? '示意情境：移除廚房隔間牆，列入申請確認。' : '示意情境：本版未移除廚房隔間牆。',
      status:!evaluated ? '待重查' : openKitchen ? '要辦理' : '符合示例'},
    {name:'住宅用火災警報器', source:'消防法規示例',
      detail:'範例提醒：重做天花板時，請確認警報器保留或補裝。', status:'要辦理'},
    {name:'裝修材料耐燃等級', source:'建築法規示例',
      detail:draft.floor ? '示意資料已補：' + draft.floor + ' 樓，交由專業人員確認。' : '待補樓層，才能進一步檢核。',
      status:draft.floor ? '已補資料・待覆核' : '待補資料'},
    {name:'撒水頭淨空', source:'消防法規示例',
      detail:'依此範例的空間資料，無撒水頭。', status:'符合示例'},
  ];
}
const homeStart = (tag, attrs, icon, title, detail, ...controls) => el(tag, {class:'home-start',...attrs},
  el('span', {class:'home-start-icon','aria-hidden':'true'}, icon),
  el('strong', {}, title), el('small', {}, detail), controls);

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
  const detail = stage === '解析中' || stage === '待補' ? sourceName ?? '示意空間' :
    rooms[state.room] + ' · ' + looks[state.style];
  return el('article', {class:'home-project'},
    el('div', {class:'home-project-visual'}, isPlan
      ? planDiagram(state, state.appliedLayout)
      : el('img', {src:projectPhoto(imageStage, state),alt:rooms[state.room] + '示意預覽'})),
    el('div', {class:'home-project-info'},
      el('div', {}, el('h3', {}, project.name), el('small', {}, detail)),
      el('span', {class:'badge'}, status),
      el('a', {href:href(page, id),class:'home-project-link'}, '打開專案')));
}

function homesPage() {
  const entries = [...projects];
  const newHomes = entries.filter(([, project]) => project.isNew).reverse();
  const examples = entries.filter(([, project]) => !project.isNew);
  const recent = [...newHomes, ...examples];
  return el('div', {class:'homes-dashboard stack'},
    el('header', {class:'homes-heading'},
      el('h1', {}, '我的家'), el('button', {type:'button',class:'primary',onclick:() => startProject('entry')}, '新建專案')),
    el('section', {'aria-labelledby':'home-start-title'},
      el('h2', {id:'home-start-title'}, '從哪裡開始'),
      el('p', {class:'muted home-start-hint'}, '選一種方式，開始一個新案。'),
      el('div', {class:'home-starts'},
        homeStart('label', {}, '↑', '上傳平面圖', '建商圖、手繪都能讀',
          el('input', {type:'file',accept:'image/*,.pdf','aria-label':'上傳平面圖',
            onchange:event => upload(event, true, true)})),
        homeStart('button', {type:'button','aria-label':'現場拍照',onclick:() => startProject('camera')},
          '◎', '現場拍照', '跟著引導拍幾張'),
        homeStart('button', {type:'button','aria-label':'說一句話',onclick:() => startProject('brief')},
          '…', '說一句話', '描述你想要的家'))),
    el('section', {'aria-labelledby':'recent-homes-title'},
      el('h2', {id:'recent-homes-title'}, '最近的家'),
      el('div', {class:'recent-homes'}, recent.map(([id, project]) => recentProject(id, project)))));
}

const scanSteps = [
  ['找出牆和房間', '辨識各房與隔間', '已完成'],
  ['讀尺寸標註', '換算成公尺與坪數', '已完成'],
  ['比對門窗與採光', '核對開口與採光方向', '進行中'],
  ['找樑、柱、管線', '交由屋主補足看不清楚的資料', '待處理'],
  ['整理成空間條件', '缺少的資料標為待補', '待處理'],
];
function scanningPage() {
  const cancelPage = draft.source || draft.roomSizes.size ? 'read' : 'entry';
  const cancel = () => {
    draft.pendingSource = null;
    projects.get(projectId).page = cancelPage;
  };
  return grid(el('div', {class:'plan-stage scan-plan'},
    el('h2', {class:'plan-note'}, '示意平面圖'),
    el('div', {class:'scan-drawing'}, planDiagram(draft, draft.appliedLayout))),
    card(...heading('正在讀懂你家'),
      el('p', {class:'panel-note'}, '示意解析，使用範例平面。讀不到的資料可在下一步補。'),
      sourceDetails(draft.pendingSource),
      draft.pendingSource && el('small', {}, '本次來源在查看解析結果後確認。'),
      el('ol', {class:'scan-steps','aria-label':'解析步驟'},
        scanSteps.map(([title, detail, status], index) =>
          el('li', {class:'scan-step','data-state':status,...(index === 2 ? {'aria-current':'step'} : {})},
            el('span', {class:'scan-mark','aria-hidden':'true'}, index < 2 ? '✓' : ''),
            el('span', {}, el('strong', {}, title), el('small', {}, detail)),
            el('span', {class:'badge'}, status)))),
      actions(el('a', {href:href(cancelPage),class:'button',onclick:cancel}, '取消'),
        el('a', {href:href('read'),class:'button primary',onclick:confirmSource}, '查看解析結果'))), 'scan-grid');
}

function profilePage() {
  const proposed = proposedOpenKitchen();
  const original = homeCosts(false);
  const adjusted = proposed ? homeCosts(true) : original;
  const isOriginal = draft.profileOriginal;
  const displayed = isOriginal ? original : adjusted;
  const kitchenBefore = sumCosts(original.byRoom[2]);
  const kitchenAfter = sumCosts(adjusted.byRoom[2]);
  const [extraLow, extraHigh] = kitchenAfter.map((amount, index) => amount - kitchenBefore[index]);
  const extra = extraLow === extraHigh ? extraLow + ' 萬' : price([extraLow, extraHigh]);
  return grid(el('div', {class:'plan-stage profile-plan'},
    el('div', {class:'profile-plan-heading'},
      el('h2', {class:'plan-note'}, '同案格局對照'),
      el('div', {class:'actions profile-compare',role:'group','aria-label':'比較格局'},
        button('調整後', refresh(() => {draft.profileOriginal = false;}), !isOriginal),
        button('原本', refresh(() => {draft.profileOriginal = true;}), isOriginal))),
    planDiagram(draft, !isOriginal && proposed),
    el('div', {class:'profile-total',role:'status','aria-label':'整戶估價'},
      el('small', {}, isOriginal ? '整戶 · 原本估算' : '整戶 · 調整後估算'),
      el('strong', {}, price(sumCosts(displayed.wholeHome))))),
    card(...heading('你的居家人格'),
      el('div', {class:'profile-personality'}, el('small', {}, '你的選擇'),
        el('h2', {}, proposed ? '窩居料理派' : '自然實用派'),
        el('p', {}, draft.answers.filter(Boolean).join(' · ') || '回精修格局補上選擇。')),
      el('section', {class:'profile-changes stack'}, el('h2', {}, '格局跟著這樣變'),
        el('div', {class:'profile-change'},
          el('div', {}, el('h3', {}, proposed ? '廚房打開，做中島' : '保留原本廚房'),
            el('small', {}, proposed ? '移除廚房與餐廳間隔牆，加入示意中島。' : '保留廚房間隔，由原格局估價。')),
          el('strong', {}, proposed ? '＋' + extra : '無價差')),
        el('p', {}, '廚房 ' + price(kitchenBefore) + ' → ' + price(kitchenAfter))),
      el('p', {class:'panel-note'}, proposed ? '格局調整後，法規細評會提示隔間變更的示意檢查。' : '法規細評提供這個家的示意檢查。'),
      el('div', {class:'profile-actions stack'},
        actions(link('看法規細評', 'compliance'), link('風水評估', 'feng'), link('略過，去施工圖', 'drawings')),
        actions(backToLayout(), el('button', {type:'button',class:'primary',onclick:() => {recheckLayout(); go('compliance');}},
          '套用，看法規細評')))), 'profile-grid');
}

const pages = {
  entry: () => el('section', {class:'hero','aria-labelledby':'entry-title'},
    el('img', {class:'hero-photo',src:photo,alt:'靜謐橡木客廳示意',width:1536,height:1024,fetchpriority:'high'}),
    el('h1', {id:'entry-title'}, '把家的想像，', el('br'), '變成真的。'),
    el('div', {class:'hero-start'},
      el('p', {class:'hero-mobile-intro'}, '給我們你的房子，還你成品、報價與施工圖。'),
      floorUpload(), actions(link('現場拍照', 'camera'), link('說一句話', 'brief'))),
    el('div', {class:'hero-hotspots'},
      el('details', {}, el('summary', {'aria-label':'看磚紅單椅'}), el('div', {}, '磚紅單椅', el('small', {}, '布面搭配橡木椅腳'))),
      el('details', {}, el('summary', {'aria-label':'看橡木收納'}), el('div', {}, '白橡木收納', el('small', {}, '開放層板與封閉櫃體')))),
    el('div', {class:'hero-summary'},
      el('p', {class:'hero-promise'}, '給我們你的房子，', el('br'), '還你成品、報價與施工圖。'),
      el('div', {class:'hero-price'}, el('strong', {}, '26–48 萬'), el('small', {}, '這間客廳的初步報價示意')),
      el('p', {}, '成品、報價、法規初檢都免費看。', el('br'), '喜歡了，再解鎖施工圖。'))),
  homes: homesPage,
  camera: () => grid(figure(photo, '拍照位置示意'), card(...heading('現場拍照', '第 ' + (draft.shot + 1) + ' 張／4'),
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
  read: () => grid(plan(true),
    card(...heading('我讀懂的你家'), el('p', {class:'panel-note'}, '示意平面圖讀到 8 間。有 2 項待補、1 項請確認，也可以先選風格。'),
    el('details', {class:'room-size-panel', ...(draft.editRoomSize ? {open:''} : {}),
      ontoggle:event => {if (event.currentTarget.isConnected) draft.editRoomSize = event.currentTarget.open;}},
      el('summary', {}, '修改' + rooms[draft.room] + '尺寸'), roomSizeForm()),
    draft.conditions && el('p', {}, draft.conditions), actions(...[['','全部 6'],['待補','待補 2'],['請確認','請確認 1']]
      .map(([key, text]) => button(text, refresh(() => {draft.filter = key;}), draft.filter === key))),
    rows(fields.filter(([, state]) => !draft.filter || state === draft.filter)),
    actions(link('再拍幾張', 'camera'), link('直接填', 'conditions')),
    sourceDetails(),
    actions(picker('重選平面圖', {accept:'image/*,.pdf'}, upload),
      picker('上傳機電圖', {accept:'image/*,.pdf'}, event => upload(event, false))),
    actions(link('補充偏好', 'brief'), link('直接選風格', 'style', true)))),
  conditions: () => card(...heading('補充空間條件'), el('label', {}, '天花板及管線備註',
    el('textarea', {oninput: event => {draft.conditions = event.target.value;}}, draft.conditions || '')), link('返回空間條件', 'read', true)),
  brief: () => grid(figure(image(), '用預設風格預覽'), card(...heading('說一句話，或加幾張參考圖。'),
    el('label', {}, '想要什麼樣的家', el('textarea', {oninput:event => {draft.note = event.target.value;}}, draft.note)),
    picker('參考圖', {accept:'image/*',multiple:''}, event => {
      draft.refs = Array.from(event.target.files, f => f.name).join('、'); render(false);
    }), draft.refs && el('small', {}, draft.refs),
    actions(...draft.tags.map(tag => button(tag + ' ×', refresh(() => {draft.tags = draft.tags.filter(value => value !== tag);})))) ,
    link('選風格', 'style', true))),
  style: () => grid(figure(image(), looks[draft.style], looks[draft.style] + '客廳示意'),
    card(...heading('初步推薦風格'),
      el('div', {class:'style-options',role:'group','aria-label':'風格方向'}, looks.map((name, i) =>
        el('button', {type:'button','aria-pressed':draft.style === i,onclick:refresh(() => {draft.style = i;})},
          el('img', {src:image(i),alt:'',loading:'lazy'}), 'ABC'[i] + ' · ' + name))),
      actions(link('上一步', 'brief'), link('確認方向，看成品', 'result', true)))),
  result: () => {
    const costs = roomCostItems();
    return grid(preview(), el('section', {class:'card stack result-quote'},
      ...heading('實景＋初步報價', rooms[draft.room] + ' · 免費'),
      el('strong', {class:'price'}, price(sumCosts(costs))), draft.room === 0 && resultFurniture(),
      costDetails('看單室費用明細', costs),
      actions(link('毛胚到完成', 'compare'), link('整戶', 'whole'), link('家具與材質', 'materials'), link('這個家', 'project')),
      card(el('h2', {}, '法規初檢 · 示意'),
        rows([['消防', '2 項要注意'], ['建築', '1 項待補資料']]),
        el('small', {}, '範例初檢，實際適用情況須經專業人員複核。'),
        link(draft.unlocked ? '看法規細評' : '解鎖看逐條', draft.unlocked ? 'compliance' : 'unlock')),
      el('div', {class:'result-next'}, link('解鎖精修與施工', 'unlock', true))), 'result-grid');
  },
  project: () => stack(...heading('這個家', projects.get(projectId).name + ' · 我的家'), actions(link('空間條件', 'read'),
    link('3D 與報價', 'result'), link('施工圖與團隊', draft.unlocked ? 'drawings' : 'unlock')),
    roomButtons(), grid(preview(), card(el('h2', {}, '這間的初步報價'), el('strong',{class:'price'},estimate()), link('看整戶', 'whole')))),
  whole: () => {
    const {byRoom:costsByRoom, wholeHome} = homeCosts();
    const currentRoom = costsByRoom[draft.room];
    return stack(...heading('整戶：一間一間看'), roomButtons(),
      grid(preview(), card(el('h2', {}, rooms[draft.room] + '初步報價'),
        el('strong', {class:'price'}, price(sumCosts(currentRoom))), el('h2', {}, '整戶初步報價'),
        el('strong', {class:'price'}, price(sumCosts(wholeHome))),
        costDetails('看單室費用明細', currentRoom), costDetails('看整戶費用明細', wholeHome),
        rows(rooms.map((name, i) => [name, price(sumCosts(costsByRoom[i]))])),
        actions(link('返回成品', 'result'), link('毛胚到完成', 'compare')))));
  },
  materials: () => grid(preview(), card(...heading('家具與材質', '示意型錄 · 換款反映在清單與初步報價'),
    rows([[featuredItem(), '1 件'], [catalogue.FLOORS[0].n, '地板'], [catalogue.WALLS[0].n, '牆面']]),
    actions(button('確認換款', refresh(() => {
      if (changedRoom()) draft.changedRooms.delete(draft.room);
      else draft.changedRooms.add(draft.room);
    }), changedRoom()), link('看更新後報價', 'result')),
    el('a', {href:studio + 'prototype/',class:'button'}, '開啟 3D 風格實驗室'))),
  compare: () => {
    const room = rooms[draft.room];
    const stage = draft.comparisonStage;
    const before = el('img', {src:roomScene(draft.room, 0, draft.appliedLayout), alt:room + ' · 毛胚示意'});
    const after = el('img', {src:projectPhoto(stage), alt:room + ' · ' + stages[stage] + '示意'});
    const filter = finishFilter(draft.style, stage);
    const notice = el('small', {role:'status'});
    const range = el('input', {type:'range',value:50,'aria-label':'毛胚與完成比較',oninput:event => {
      after.style.clipPath = 'inset(0 0 0 ' + event.target.value + '%)';
    }});
    after.style.filter = filter;
    after.style.clipPath = 'inset(0 0 0 50%)';
    return stack(roomButtons(),
      grid(el('div', {class:'media compare'}, before, stage > 0 && after,
        el('div', {class:'comparison-labels'}, el('span', {}, '毛胚'), el('span', {}, stages[stage]))),
        card(...heading('毛胚到完成', room + ' · 同鏡位各階段示意'),
          el('strong', {class:'price'}, estimate()), range,
          actions(...stages.map((name, i) => button(name, refresh(() => {draft.comparisonStage = i;}), i === stage))),
          button('存成對比圖', async () => {
            try {
              await saveComparison(before, after, Number(range.value), filter);
            } catch {
              notice.textContent = '圖檔載入失敗，請再試一次。';
            }
          }), notice,
          actions(link('看初步報價', 'result'), link('看整戶', 'whole', true)))));
  },
  unlock: () => grid(figure(image(), '整戶一次解鎖'), card(...heading('喜歡了，再把它做出來。', '付費方案示意 · 價格待定'),
    rows([['格局精修', '含'], ['法規細部評估', '示意'], ['風水評估', '選用'], ['施工圖', '含'], ['對接團隊', '含']]),
    actions(link('先不要', 'result'), button('示意解鎖', () => {draft.unlocked = true; go('layout');})))),
  layout: () => {
    const [prompt, ...choices] = questions[draft.step];
    return grid(stack(...heading('格局精修', '第 ' + (draft.step + 1) + ' 關／5 · ' + ['回家','怎麼煮','怎麼收','怎麼睡','誰會來'][draft.step]),
      plan(false, draft.layoutPreview && proposedOpenKitchen()),
      el('p', {}, draft.layoutPreview && proposedOpenKitchen() ? '示意調整：開放廚房與中島' : '原本平面')),
      card(el('h2', {}, prompt), actions(...choices.map(choice =>
        button(choice, refresh(() => {draft.answers[draft.step] = choice; draft.profileOriginal = false;}), choice === draft.answers[draft.step]))),
        button('預覽調整／原本平面', refresh(() => {draft.layoutPreview = !draft.layoutPreview;})),
        actions(draft.step > 0 && button('上一關', refresh(() => {draft.step--;})),
          draft.step < 4 ? button('下一關', refresh(() => {draft.step++;})) : link('看居家人格', 'profile', true))));
  },
  profile: profilePage,
  compliance: () => {
    const changed = draft.checkedLayout !== layoutKey();
    const findings = complianceFindings();
    const needsAction = findings.filter(item => item.status === '要辦理').length;
    const missing = findings.filter(item => item.status === '待補資料').length;
    return grid(stack(plan(), card(el('p', {role:'status'}, changed
      ? '格局已變更 · 等待重查'
      : '格局變更已重查 · 版本 ' + draft.layoutVersion),
      button('依新格局重查', refresh(recheckLayout)))),
      card(...heading('法規細部評估', '逐條檢核 · 示意範例'),
        el('p', {}, '以下皆為範例結果，實際適用情況須經專業人員複核。'),
        el('p', {}, '要辦理 ' + needsAction + ' · 待補 ' + missing + ' · 檢核 ' + findings.length + ' 條'),
        ...findings.map(({name, source, detail, status}) => el('article', {class:'check-result'},
          el('h3', {}, name), el('p', {}, detail), el('small', {}, source + ' · 條號待專業確認'),
          el('span', {class:'badge ' + (status === '符合示例' ? '' : 'paid')}, status))),
        el('form', {class:'stack',onsubmit:event => {
          event.preventDefault();
          draft.floor = draft.floorInput;
          recheckLayout();
          render(false);
        }},
        el('label', {}, '你家在第幾樓？', el('input', {type:'number',min:'1',max:'200',step:'1',required:'',
          value:draft.floorInput,oninput:event => {draft.floorInput = event.target.value;}})),
        el('button', {type:'submit'}, '儲存樓層並重查')),
        actions(backToLayout(), link('看風水', 'feng', true))));
  },
  feng: () => grid(plan(), card(...heading('風水評估', '傳統習俗參考 · 12 項示意'),
    rows([['客廳動線','建議調整'],['主臥床頭','建議調整'],['大門方位','待補']]),
    el('details', {}, el('summary', {}, '9 項沒問題'),
      rows(['玄關採光','餐廳通行','廚房出入口','客衛通風','主衛門向','次臥 1 採光',
        '次臥 2 通行','收納動線','走道寬度'].map(name => [name,'沒問題']))),
    actions(...['客廳動線','主臥床頭'].map((name, i) => button(
      name + (draft.feng.has(i) ? ' · 已選' : ' · 我不在意'), refresh(() => {
        if (draft.feng.has(i)) draft.feng.delete(i); else draft.feng.add(i);
      }),draft.feng.has(i)))),
    actions(link('略過', 'drawings'), button('套用 ' + draft.feng.size + ' 項', () => {
      draft.appliedFeng = [...draft.feng]; go('drawings');
    })))),
  drawings: () => {
    const cond = roomCondition();
    const look = roomLook();
    const sheets = wireframeDrawingSet(cond, look, designEstimate(cond, look), '2026-11-19', draft.appliedLayout);
    const selected = sheets.find(sheet => sheet.no === draft.drawing) ?? sheets[0];
    const label = sheet => sheet.no + ' ' + sheet.title;
    const svg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(selected.svg);
    const types = [...new Set(sheets.map(sheet => sheet.type))];
    const current = sheets.filter(sheet => sheet.type === selected.type);
    return grid(stack(...heading('施工圖', '示意圖面 · 待現場丈量與專業覆核'),
      el('section', {class:'card stack print-sheet'}, el('h2', {}, label(selected)),
        el('img', {class:'drawing', src:svg, alt:label(selected) + ' · 示意'}),
        el('small', {}, '圖面版本 Demo 01 · ' + selected.status))),
      el('aside', {class:'card stack drawing-controls'}, el('h2', {}, '圖面清單 · ' + sheets.length + ' 張'),
        actions(...types.map(type => button(type + ' ' + sheets.filter(sheet => sheet.type === type).length + ' 張',
          refresh(() => {draft.drawing = sheets.find(sheet => sheet.type === type).no;}), selected.type === type))),
        el('ul', {class:'rows'}, current.map(sheet => el('li', {},
          button(label(sheet), refresh(() => {draft.drawing = sheet.no;}), sheet.no === selected.no),
          el('span', {class:'badge'}, sheet.status)))),
        rows([[featuredItem(),'1 件'], ['初步報價',estimate()], ['現場丈量','待丈量']]),
        actions(link('看法規細評', 'compliance'), button('列印／另存 PDF', () => window.print()), link('對接團隊', 'team', true))));
  },
  team: () => grid(figure(projectPhoto(), '這個家的示意交接包'), card(...heading('對接團隊', '示意團隊 · 不會發送資料'),
    actions(...['設計師＋工班','只找統包工班'].map(name =>
      button(name, refresh(() => {draft.team = name;}), draft.team === name))),
    rows([['3D、施工圖與報價清單','示例'],['空間條件與法規', draft.checkedLayout === layoutKey() ? '示意已檢核' : '待核對'],
      ['送交接包', draft.sent ? '示意已送件' : '待送件'], ['現場丈量','待排程'], ['正式報價與簽約','待丈量']]),
    actions(button(draft.sent ? '重設示意送件' : '模擬送交接包', refresh(() => {draft.sent = !draft.sent;})), link('回我的家', 'homes')))),
};
const phase = [
  ['你給房子', '免費', 'read', ['entry','camera','scanning','conditions','read']],
  ['看成品與報價', '免費', 'style', ['brief','style','result','project','whole','materials','compare']],
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
  result:['style','brief','result','compare','materials'], drawings:['unlock', ...premium],
};
function updateNavigation(page) {
  const work = page !== 'entry' && page !== 'homes';
  document.body.dataset.page = page;
  document.body.classList.toggle('workspace', work);
  rail.hidden = menu.hidden = !work;
  menu.open = false;
  for (const anchor of railLinks) {
    const target = anchor.dataset.rail;
    anchor.href = href(target);
    if (railSections[target].includes(page)) anchor.setAttribute('aria-current', 'location');
    else anchor.removeAttribute('aria-current');
  }
  document.querySelector('.site-header > .phase-nav')?.remove();
  if (page !== 'homes') rail.before(phaseNav(page, work));
}
const projectProgress = {
  entry:'新建', camera:'進行中', scanning:'解析中', read:'待補', conditions:'待補', brief:'進行中', style:'進行中',
  project:'初步報價', result:'初步報價', layout:'精修中', profile:'精修中', compliance:'法規細評',
  feng:'精修中', drawings:'施工圖', team:'團隊對接',
};
function render(focus = true) {
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
  const layout = pages[page]();
  const workGrid = layout.matches('.grid') ? layout : layout.querySelector('.grid');
  const panel = workGrid?.children[1];
  if (panel?.classList.contains('card')) {
    panel.classList.add('work-panel');
    panel.prepend(phaseNav(page));
  }
  screen.replaceChildren(layout);
  if (focus) {
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
