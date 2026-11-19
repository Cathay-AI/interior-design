import { finishFilter, roomScene, saveComparison, stages } from './room-scenes.js';
import { wireframeDrawingSet } from './fast-route/lib/drawings.js';
import { designEstimate } from './fast-route/lib/estimate.js';
import { STYLES } from './fast-route/lib/taste.js';

const screen = document.querySelector('#screen');
const catalogue = window.HB_CATALOG;
const rooms = ['客廳', '餐廳', '廚房', '客衛', '主臥', '主衛', '次臥 1', '次臥 2'];
const areas = [9, 4.5, 3, 1.5, 5.5, 1.5, 3.5, 4];
const prices = [[26,48],[18,30],[28,46],[14,23],[24,39],[15,25],[20,33],[23,36]];
const looks = ['靜謐橡木', '暖調復古', '日光北歐'];
const roomOptions = [
  ['米色布沙發', '淺灰布沙發'], ['橡木圓餐桌', '胡桃木餐桌'],
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
  room: 0, style: 0, shot: 0, step: 0, answers: [],
  filter: '', view: '實景', layoutPreview: true, changedRooms: new Set(),
  appliedLayout: false, appliedFeng: [],
  unlocked: false, feng: new Set([0, 1]),
  drawing: 'A-01', comparisonStage: 4, floor: '', floorInput: '',
  checkedLayout: null, layoutVersion: 0, note: '', refs: '', tags: ['自然材質', '好整理'], file: '', team: '設計師＋工班', sent: false,
});
const projects = new Map([
  ['oak', {name:'靜謐橡木', page:'project', state:'初步報價', draft:newDraft()}],
  ['family', {name:'小家庭', page:'brief', state:'進行中', draft:newDraft()}],
  ['floorplan', {name:'三房兩廳', page:'read', state:'待補', draft:newDraft()}],
  ['upload', {name:'新家平面圖', page:'scanning', state:'解析中', draft:newDraft()}],
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
function createProject() {
  const id = 'demo-' + ++projectCount;
  projects.set(id, {name:'新家 ' + projectCount, page:'project', state:'新建', draft:newDraft()});
  go('entry', id);
}
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
const picker = (label, attrs, fn) => el('label', {}, label, el('input', {type:'file',...attrs,onchange:fn}));
const price = (values) => values.join('–') + ' 萬';
const roomPrice = (i = draft.room) => prices[i].map((value, j) =>
  value + draft.style * (j + 2) + (draft.changedRooms.has(i) ? j + 1 : 0)
  + (i === 2 && draft.appliedLayout ? 2 : 0) + draft.appliedFeng.filter(n => [0,4][n] === i).length);
const roomKind = () => ['客廳','餐廳','廚房','衛浴','臥室','衛浴','臥室','臥室'][draft.room];
const roomLook = () => ({
  ...STYLES[['muji','retro','nordic'][draft.style]],
  name: looks[draft.style],
  sofa: catalogue.SOFAS[draft.changedRooms.has(0) ? 1 : 0].c,
});
let scene;
async function showModel(container) {
  try {
    const { mountRoom3D } = await import('./fast-route/lib/room3d.js');
    if (!container.isConnected) return;
    const width = Math.sqrt(areas[draft.room] * 3.3058);
    scene = mountRoom3D(container, roomLook(), 'A',
      {w:width, d:width, h:2.7, space:roomKind(), openKitchen:draft.appliedLayout}, () => container.classList.add('model-failed'));
  } catch {
    if (container.isConnected) container.classList.add('model-failed');
  }
}
const estimate = () => price(roomPrice());
const changedRoom = () => draft.changedRooms.has(draft.room);
const featuredItem = () => roomOptions[draft.room][changedRoom() ? 1 : 0];
const roomButtons = () => actions(...rooms.map((name, i) => button(name, refresh(() => {draft.room = i;}), draft.room === i)));
const plan = () => el('div', {class:'plan','aria-label':'平面圖示意'}, rooms.map((name, i) =>
  button(name + ' ' + areas[i] + ' 坪', refresh(() => {draft.room = i;}), draft.room === i)));
const preview = () => {
  const views = ['實景', '等角', '平面'];
  let content = stack(plan(), draft.appliedLayout && el('p', {class:'muted'}, '格局示意：已套用開放廚房與中島'));
  if (draft.view !== '平面') {
    const caption = [rooms[draft.room], looks[draft.style], featuredItem(),
      draft.room === 2 && draft.appliedLayout ? '開放廚房與中島' : '', draft.appliedFeng.length ? '已套用風水示意' : ''].filter(Boolean).join(' · ');
    content = figure(roomScene(draft.room, undefined, draft.appliedLayout), caption, rooms[draft.room] + ' · 完工示意', el('a', {class:'hotspot button',href:href('materials'),'aria-label':'查看家具與材質'}, '＋'));
    content.querySelector('img').style.filter = finishFilter(draft.style);
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
const layoutKey = () => JSON.stringify(draft.answers);
function recheckLayout() {
  const key = layoutKey();
  if (draft.checkedLayout !== key) draft.layoutVersion++;
  draft.checkedLayout = key;
  draft.checkedKitchen = draft.answers[1];
  draft.appliedLayout = draft.checkedKitchen === '天天煮';
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
const pages = {
  entry: () => grid(stack(...heading('把家的想像，變成真的。', '成品和報價免費看，喜歡了再付費做出來。'),
    floorUpload(), actions(link('現場拍照', 'camera'), link('說一句話', 'brief', true))),
    figure(photo, '26–48 萬 · 這間客廳的初步報價示意'), 'hero'),
  homes: () => stack(...heading('我的家', '最近專案 · 示意'),
    el('div', {class:'tiles'}, card(button('新建專案', createProject)),
      ...Array.from(projects, ([id, project]) =>
        card(el('h2', {}, project.name), el('span', {class:'badge'}, project.draft.unlocked ? '已解鎖' : project.state),
          el('a', {href:href(project.page, id),class:'button'}, '打開專案'))))),
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
  result: () => grid(preview(), el('section', {class:'card stack result-quote'},
    ...heading('實景＋初步報價', rooms[draft.room] + ' · 免費'),
    el('strong', {class:'price'}, estimate()), rows([['施工與材料', '示例'], [featuredItem(), '1 件・示例']]),
    card(el('h2', {}, '法規初檢 · 示意'),
      rows([['消防', '2 項要注意'], ['建築', '1 項待補資料']]),
      el('small', {}, '範例初檢，實際適用情況須經專業人員複核。'),
      link(draft.unlocked ? '看法規細評' : '解鎖看逐條', draft.unlocked ? 'compliance' : 'unlock')),
    actions(link('毛胚到完成', 'compare'), link('整戶', 'whole'), link('家具與材質', 'materials'), link('這個家', 'project'),
      link('解鎖下一步', 'unlock', true)))),
  project: () => stack(...heading('這個家', projects.get(projectId).name + ' · 我的家'), actions(link('空間條件', 'read'),
    link('3D 與報價', 'result'), link('施工圖與團隊', draft.unlocked ? 'drawings' : 'unlock')),
    roomButtons(), grid(preview(), card(el('h2', {}, '這間的初步報價'), el('strong',{class:'price'},estimate()), link('看整戶', 'whole')))),
  whole: () => stack(...heading('整戶：一間一間看'), roomButtons(),
    grid(preview(), card(el('h2', {}, rooms[draft.room] + '初步報價'),
      el('strong', {class:'price'}, estimate()), el('h2', {}, '整戶初步報價'),
      el('strong', {class:'price'}, price(prices.reduce(([low, high], _, i) => {
        const [a,b] = roomPrice(i); return [low + a, high + b];
      }, [0,0]))), rows(rooms.map((name, i) => [name, price(roomPrice(i))])), actions(link('返回成品', 'result'), link('毛胚到完成', 'compare'))))),
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
    const after = el('img', {src:roomScene(draft.room, stage, draft.appliedLayout), alt:room + ' · ' + stages[stage] + '示意'});
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
      plan(), el('p', {}, draft.layoutPreview && draft.answers[1] === '天天煮' ? '示意調整：開放廚房與中島' : '原本平面')),
      card(el('h2', {}, prompt), actions(...choices.map(choice =>
        button(choice, refresh(() => {draft.answers[draft.step] = choice;}), choice === draft.answers[draft.step]))),
        button('預覽調整／原本平面', refresh(() => {draft.layoutPreview = !draft.layoutPreview;})),
        actions(draft.step > 0 && button('上一關', refresh(() => {draft.step--;})),
          draft.step < 4 ? button('下一關', refresh(() => {draft.step++;})) : link('看居家人格', 'profile', true))));
  },
  profile: () => grid(preview(), card(...heading('你的居家人格', '自然實用派 · 示意'),
    rows(questions.map(([prompt], i) => [prompt, draft.answers[i] || '待補'])),
    actions(button('套用，看法規細評', () => {recheckLayout(); go('compliance');}),
      link('看法規細評', 'compliance'), link('風水評估', 'feng'), link('略過，去施工圖', 'drawings')))),
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
        actions(el('a', {href:href('layout'),class:'button',onclick:() => {draft.step = 1;}}, '回精修格局'),
          link('看風水', 'feng', true))));
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
    const cond = {space:roomKind(), ping:String(areas[draft.room]), age:'新成屋'};
    const look = roomLook();
    const sheets = wireframeDrawingSet(cond, look, designEstimate(cond, look), '2026-11-19');
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
  team: () => grid(figure(roomScene(draft.room, undefined, draft.appliedLayout), '這個家的示意交接包'), card(...heading('對接團隊', '示意團隊 · 不會發送資料'),
    actions(...['設計師＋工班','只找統包工班'].map(name =>
      button(name, refresh(() => {draft.team = name;}), draft.team === name))),
    rows([['3D、施工圖與報價清單','示例'],['空間條件與法規', draft.checkedLayout === layoutKey() ? '示意已檢核' : '待核對'],
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
  const [route, query] = location.hash.slice(1).split('?');
  const id = new URLSearchParams(query).get('project');
  if (projects.has(id)) projectId = id;
  draft = projects.get(projectId).draft;
  const requested = Object.hasOwn(pages, route) ? route : 'entry';
  const page = premium.includes(requested) && !draft.unlocked ? 'unlock' : requested;
  document.querySelector('#steps').replaceChildren(...phase.map(([name, label, target, ids]) => el('a',
    {href:href(draft.unlocked && target === 'unlock' ? 'layout' : target),
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
