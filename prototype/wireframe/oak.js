import { drawingSet } from './fast-route/lib/drawings.js';
import { designEstimate } from './fast-route/lib/estimate.js';
import { STYLES } from './fast-route/lib/taste.js';

const screen = document.querySelector('#screen');
const catalogue = window.HB_CATALOG;
const rooms = ['客廳', '餐廳', '廚房', '客衛', '主臥', '主衛', '次臥 1', '次臥 2'];
const areas = [9, 4.5, 3, 1.5, 5.5, 1.5, 3.5, 4];
const prices = [[26,48],[18,30],[28,46],[14,23],[24,39],[15,25],[20,33],[23,36]];
const looks = ['靜謐橡木', '暖調復古', '日光北歐'];
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
const draft = {
  room: 0, style: 0, shot: 0, step: 0, answers: [],
  filter: '', view: '實景', layoutPreview: true, changed: false,
  appliedLayout: false, appliedFeng: [],
  unlocked: false, feng: new Set([0, 1]),
  drawingType: '平面', note: '', refs: '', tags: ['自然材質', '好整理'], file: '', team: '設計師＋工班', sent: false,
};
const photo = './fast-route/assets/preview-living.jpg';
const studio = './style-studio/';
const image = (n = draft.style) => [photo, studio + 'key-visuals/app/style-2.jpg', studio + 'key-visuals/app/style-1.jpg'][n];
const documents = {
  平面: ['配置平面圖', '尺寸平面圖', '拆除平面圖'],
  立面: ['電視牆立面', '玄關立面', '主臥立面', '收納立面'],
  水電: ['照明迴路圖', '插座配置圖', '給排水示意圖'],
};
const premium = ['layout', 'profile', 'feng', 'drawings', 'team'];
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
const go = (page) => { location.hash = page; };
const link = (name, page, primary = false) => el('a', {href:'#' + page,class:'button' + (primary ? ' primary' : '')}, name);
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
const figure = (src, caption, ...extra) => el('div', {class:'media'},
  el('img', {src, alt:'室內設計參考示意'}), caption && el('div', {class:'floating'}, caption), ...extra);
const picker = (label, attrs, fn) => el('label', {}, label, el('input', {type:'file',...attrs,onchange:fn}));
const price = (values) => values.join('–') + ' 萬';
const roomPrice = (i = draft.room) => prices[i].map((value, j) =>
  value + draft.style * (j + 2) + (i === 0 && draft.changed ? j + 1 : 0)
  + (i === 2 && draft.appliedLayout ? 2 : 0) + draft.appliedFeng.filter(n => [0,4][n] === i).length);
const roomKind = () => ['客廳','餐廳','廚房','衛浴','臥室','衛浴','臥室','臥室'][draft.room];
const roomLook = () => ({
  ...STYLES[['muji','retro','nordic'][draft.style]],
  name: looks[draft.style],
  sofa: catalogue.SOFAS[draft.changed ? 1 : 0].c,
});
let scene;
async function showModel(container) {
  try {
    const { mountRoom3D } = await import('./fast-route/lib/room3d.js');
    if (!container.isConnected) return;
    const width = Math.sqrt(areas[draft.room] * 3.3058);
    scene = mountRoom3D(container, roomLook(), 'A',
      {w:width, d:width, h:2.7, space:roomKind()}, () => container.classList.add('model-failed'));
  } catch {
    if (container.isConnected) container.classList.add('model-failed');
  }
}
const estimate = () => price(roomPrice());
const sofa = () => catalogue.SOFAS[draft.changed ? 1 : 0].n;
const roomButtons = () => actions(...rooms.map((name, i) => button(name, refresh(() => {draft.room = i;}), draft.room === i)));
const plan = () => el('div', {class:'plan','aria-label':'平面圖示意'}, rooms.map((name, i) =>
  button(name + ' ' + areas[i] + ' 坪', refresh(() => {draft.room = i;}), draft.room === i)));
const preview = () => {
  const views = ['實景', '等角', '平面'];
  let content = plan();
  if (draft.view !== '平面') {
    const caption = [rooms[draft.room], looks[draft.style], sofa(),
      draft.appliedLayout ? '已套用格局示意' : '', draft.appliedFeng.length ? '已套用風水示意' : ''].filter(Boolean).join(' · ');
    content = figure(image(), caption, el('a', {class:'hotspot button',href:'#materials','aria-label':'查看家具與材質'}, '＋'));
    if (draft.view === '等角') {
      content.classList.add('model');
      content.append(el('small', {class:'model-label'}, '3D 不可用時顯示示意影像'));
      showModel(content);
    }
  }
  return stack(actions(...views.map(view => button(view, refresh(() => {draft.view = view;}), draft.view === view))), content);
};
function upload(event) {
  const file = event.target.files[0];
  if (!file) return;
  draft.file = file.name;
  go('scanning');
}
const floorUpload = () => picker('上傳建商平面圖', {accept:'image/*,.pdf'}, upload);
const pages = {
  entry: () => grid(stack(...heading('把家的想像，變成真的。', '成品和報價免費看，喜歡了再付費做出來。'),
    floorUpload(), actions(link('現場拍照', 'camera'), link('說一句話', 'brief', true))),
    figure(photo, '26–48 萬 · 這間客廳的初步報價示意'), 'hero'),
  homes: () => stack(...heading('我的家', '最近專案 · 示意'),
    el('div', {class:'tiles'}, card(floorUpload(), link('新建專案', 'entry')),
      ...[['靜謐橡木', draft.unlocked ? '已解鎖' : '初步報價', 'project'],
          ['小家庭', '進行中', 'brief'], ['三房兩廳', '待補', 'read'], ['新家平面圖', '解析中', 'scanning']]
        .map(([name, state, page]) => card(el('h2', {}, name), el('span', {class:'badge'}, state), link('打開專案', page))))),
  camera: () => grid(figure(photo, '拍照位置示意'), card(...heading('現場拍照', '第 ' + (draft.shot + 1) + ' 張／4'),
    rows(shots.map((name, i) => [name, i < draft.shot ? '已完成' : i === draft.shot ? '正在拍攝' : '待補'])),
    picker('從相簿選或拍攝', {accept:'image/*',capture:'environment'}, event => {
      if (event.target.files.length) { draft.shot = Math.min(3, draft.shot + 1); render(false); }
    }),
    actions(button('下一張', refresh(() => {draft.shot = Math.min(3, draft.shot + 1);})), link('拍完了', 'scanning', true)))),
  scanning: () => card(...heading('正在讀懂你家', draft.file || '示意格局'),
    el('progress', {value:72,max:100,'aria-label':'示意解析進度'}),
    actions(link('取消', 'entry'), link('查看解析結果', 'read', true))),
  read: () => grid(stack(...heading('我讀懂的你家', '空間解析完成 · 8 間 · 原稿示例'), plan()),
    card(el('h2', {}, '空間條件'), draft.conditions && el('p', {}, draft.conditions), actions(...[['','全部 6'],['待補','待補 2'],['請確認','請確認 1']]
      .map(([key, text]) => button(text, refresh(() => {draft.filter = key;}), draft.filter === key))),
    rows(fields.filter(([, state]) => !draft.filter || state === draft.filter)),
    actions(link('再拍幾張', 'camera'), link('直接填', 'conditions')),
    picker('上傳機電圖', {accept:'image/*,.pdf'}, upload),
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
  style: () => stack(...heading('選一個想住進去的家', '三個示意方向，可隨時切換。'),
    el('div', {class:'tiles'}, looks.map((name, i) => card(figure(image(i)), button(
      'ABC'[i] + ' · ' + name, refresh(() => {draft.style = i;}), draft.style === i)))),
    actions(link('上一步', 'brief'), link('確認方向，看成品', 'result', true))),
  result: () => grid(preview(), card(...heading('實景＋初步報價', rooms[draft.room] + ' · 免費'),
    el('strong', {class:'price'}, estimate()), rows([['施工與材料', '示例'], [sofa(), '1 件・示例']]),
    actions(link('毛胚到完成', 'compare'), link('整戶', 'whole'), link('家具與材質', 'materials'), link('這個家', 'project'),
      link('解鎖下一步', 'unlock', true)))),
  project: () => stack(...heading('這個家', '靜謐橡木 · 我的家'), actions(link('空間條件', 'read'),
    link('3D 與報價', 'result'), link('施工圖與團隊', draft.unlocked ? 'drawings' : 'unlock')),
    roomButtons(), grid(preview(), card(el('h2', {}, '這間的初步報價'), el('strong',{class:'price'},estimate()), link('看整戶', 'whole')))),
  whole: () => stack(...heading('整戶：一間一間看'), roomButtons(),
    grid(preview(), card(el('h2', {}, '整戶初步報價'),
      el('strong', {class:'price'}, price(prices.reduce(([low, high], _, i) => {
        const [a,b] = roomPrice(i); return [low + a, high + b];
      }, [0,0]))), rows(rooms.map((name, i) => [name, price(roomPrice(i))])), link('返回成品', 'result')))),
  materials: () => grid(preview(), card(...heading('家具與材質', '示意型錄 · 推薦風格分支'),
    rows([[sofa(), '1 件'], [catalogue.FLOORS[0].n, '地板'], [catalogue.WALLS[0].n, '牆面']]),
    actions(button('確認換款', refresh(() => {draft.changed = !draft.changed;}), draft.changed), link('看更新後報價', 'result')),
    el('a', {href:studio + 'prototype/',class:'button'}, '開啟 3D 風格實驗室'))),
  compare: () => {
    const after = el('img', {src:image(),alt:'完工風格示意'});
    const range = el('input', {type:'range',value:50,'aria-label':'毛胚與完成比較',oninput:event => {
      after.style.clipPath = 'inset(0 0 0 ' + event.target.value + '%)';
    }});
    after.style.clipPath = 'inset(0 0 0 50%)';
    return grid(el('div', {class:'media compare'}, el('img', {class:'before',src:photo,alt:'毛胚階段示意'}), after),
      card(...heading('毛胚到完成', '拖動看施工前後的示意差異。'), range,
        actions(...['毛胚', '燈光', '家具與軟裝'].map((name, i) => button(name, () => {
          range.value = [100,65,0][i]; range.dispatchEvent(new Event('input'));
        }))),
        el('a', {class:'button',href:image(),download:''}, '儲存完成示意圖'), link('看整戶', 'whole', true)));
  },
  unlock: () => grid(figure(image(), '整戶一次解鎖'), card(...heading('喜歡了，再把它做出來。', '付費方案示意 · 價格待定'),
    rows([['格局精修', '含'], ['風水評估', '選用'], ['施工圖', '含'], ['對接團隊', '含']]),
    actions(link('先不要', 'result'), button('示意解鎖', () => {draft.unlocked = true; go('layout');})))),
  layout: () => {
    const [prompt, ...choices] = questions[draft.step];
    return grid(stack(...heading('格局精修', '第 ' + (draft.step + 1) + ' 關／5 · ' + ['回家','怎麼煮','怎麼收','怎麼睡','誰會來'][draft.step]),
      plan(), el('p', {}, draft.layoutPreview && draft.answers[1] === '天天煮' ? '示意調整：開放廚房與中島' : '原本平面')),
      card(el('h2', {}, prompt), actions(...choices.map(choice =>
        button(choice, refresh(() => {draft.answers[draft.step] = choice;}), choice === draft.answers[draft.step]))),
        button('預覽調整／原本平面', refresh(() => {draft.layoutPreview = !draft.layoutPreview;})),
        actions(draft.step > 0 && button('上一關', refresh(() => {draft.step--;})),
          draft.step < 4 ? button('下一關', refresh(() => {draft.step++;})) : link('看居家人格', 'profile', true))));
  },
  profile: () => grid(preview(), card(...heading('你的居家人格', '自然實用派 · 示意'),
    rows(questions.map(([prompt], i) => [prompt, draft.answers[i] || '待補'])),
    actions(button('套用到 3D', refresh(() => {draft.appliedLayout = draft.answers.some(Boolean);}), draft.appliedLayout),
      link('風水評估', 'feng'), link('略過，去施工圖', 'drawings', true)))),
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
    const types = Object.keys(documents);
    const type = draft.drawingType;
    const group = types.indexOf(type);
    const prefix = ['A','E','M'][group];
    const cond = {space:roomKind(), ping:String(areas[draft.room]), age:'新成屋'};
    const look = roomLook();
    const sheets = drawingSet(cond, look, designEstimate(cond, look), '2026-11-19');
    const illustration = sheets[[0,3,2][group]];
    const svg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(illustration.svg);
    return grid(stack(...heading('施工圖', '示意圖面 · 待現場丈量與專業覆核'),
      el('section', {class:'card stack'}, el('h2', {}, prefix + '-01 · ' + documents[type][0]),
        el('img', {class:'drawing', src:svg, alt:illustration.title + '示意'}),
        el('small', {}, '圖面版本 Demo 01 · 覆核中'))),
      card(el('h2', {}, '圖面清單 · 10 張'),
        actions(...types.map(name => button(name + ' ' + documents[name].length + ' 張',
          refresh(() => {draft.drawingType = name;}), type === name))),
        rows(documents[type].map((name, i) => [prefix + '-0' + (i + 1) + '　' + name, '覆核中'])),
        rows([[sofa(),'1 件'], ['初步報價',estimate()], ['現場丈量','待丈量']]),
        actions(button('列印／另存 PDF', () => window.print()), link('對接團隊', 'team', true))));
  },
  team: () => grid(figure(image(), '這個家的示意交接包'), card(...heading('對接團隊', '示意團隊 · 不會發送資料'),
    actions(...['設計師＋工班','只找統包工班'].map(name =>
      button(name, refresh(() => {draft.team = name;}), draft.team === name))),
    rows([['3D、施工圖與報價清單','示例'],['空間條件與法規','待核對'],
      ['送交接包', draft.sent ? '示意已送件' : '待送件'], ['現場丈量','待排程'], ['正式報價與簽約','待丈量']]),
    actions(button(draft.sent ? '重設示意送件' : '模擬送交接包', refresh(() => {draft.sent = !draft.sent;})), link('回我的家', 'homes')))),
};
const phase = [
  ['讀懂你家', '免費', 'read', ['entry','camera','scanning','conditions','read']],
  ['看見成品', '免費', 'style', ['brief','style','result','project','whole','materials','compare']],
  ['做出來', '付費', 'unlock', ['unlock', ...premium]],
];
function render(focus = true) {
  scene?.dispose();
  scene = undefined;
  const route = location.hash.slice(1);
  const requested = Object.hasOwn(pages, route) ? route : 'entry';
  const page = premium.includes(requested) && !draft.unlocked ? 'unlock' : requested;
  document.querySelector('#steps').replaceChildren(...phase.map(([name, label, target, ids]) => el('a',
    {href:'#' + (draft.unlocked && target === 'unlock' ? 'layout' : target),
      ...(ids.includes(page) ? {'aria-current':'step'} : {})},
    name + ' ', el('span', {class:'badge' + (label === '付費' ? ' paid' : '')}, label))));
  screen.replaceChildren(pages[page]());
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
