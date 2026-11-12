// UI for the 快速找風格 prototype. Decision logic lives in ./lib (pure, unit-tested);
// this file only owns state, rendering and browser APIs.
import { STYLES, PAIRS, DISLIKE_REASONS, WALL_SWATCHES, emptyScores, applyChoice, boost, tasteResult, directions, describe } from './lib/taste.js';
import { COST_PER_PING, estimate, budgetFit } from './lib/estimate.js';
import { STATES, ruleFindings, countByState } from './lib/rules.js';
import { SPACES, AGES, CITIES, parseIntake } from './lib/intake.js';
import { roomSVG, MASCOT, shade } from './lib/art.js';
import { mountRoom3D } from './lib/room3d.js';

/* ================= routes ================= */
const ROUTES = {
  full: { name: '完整闖關', desc: '還不知道喜歡什麼，也想玩', hint: '慢慢找出喜歡的樣子', open: false,
    steps: [['看屋', 1], ['人格', 0], ['家人', 0], ['商場', 0], ['佈置', 1], ['試住', 0], ['定案', 1]] },
  fast: { name: '快速找風格', desc: '想快點看到結果', hint: '想快點看到結果', open: true,
    steps: [['看屋', 1], ['佈置', 1], ['定案', 1]] },
  idea: { name: '我已經有想法', desc: '手上已有參考圖', hint: '直接放參考圖', open: true,
    steps: [['參考圖', 1], ['確認口味', 1], ['佈置', 1], ['定案', 1]] },
};
const STEP_PILL = { view: '看屋', taste: '看屋', ref: '參考圖', confirm: '確認口味', layout: '佈置', final: '定案', cond: '3D 與報價', gen: '3D 與報價', result: '3D 與報價' };
const STATE_COLOR = { ok: '#5f7a6a', conflict: '#c0602d', missing: '#c9a77c', na: '#8a7f72' };

/* ================= state ================= */
const fresh = () => ({
  route: null, step: 'entry', q: 0, scores: emptyScores(), dislikes: new Set(), tags: new Set(),
  dir: null, locks: { floor: true, wall: false, sofa: false }, wall: null, sofaOverride: null, refs: [],
  cond: { space: '客廳', ping: '', age: '新成屋', city: '台北市', budget: '', text: '' },
  versions: [], v: 0, view: 'A',
});
let S = fresh();

/* ================= dom helpers ================= */
const $ = (s) => document.querySelector(s);
const app = $('#app');
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
const fromHTML = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstChild; };
const guide = (text) => h('div', { class: 'guide' }, fromHTML(MASCOT), h('div', { class: 'bubble' }, text));
const card = (attrs, ...c) => h('div', { ...attrs, class: 'card ' + (attrs.class || '') }, ...c);

/* ================= router ================= */
function go(step) { S.step = step; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function render() { renderBar(); app.replaceChildren(); (VIEWS[S.step] || VIEWS.entry)(); }
function renderBar() {
  const bar = $('#routebar');
  bar.replaceChildren();
  $('#switchRoute').hidden = !S.route;
  if (!S.route) { bar.append(h('span', { class: 'note' }, '序章・鑰匙')); return; }
  const names = [...ROUTES[S.route].steps.filter((s) => s[1]).map((s) => s[0]), '3D 與報價'];
  const cur = names.indexOf(STEP_PILL[S.step]);
  names.forEach((n, i) => {
    if (i) bar.append(h('span', { class: 'sep', 'aria-hidden': 'true' }, '›'));
    bar.append(h('span', { class: 'pill ' + (i < cur ? 'done' : i === cur ? 'now' : ''), 'aria-current': i === cur ? 'step' : false }, n));
  });
  const now = bar.querySelector('.now');
  if (now) bar.scrollLeft = now.offsetLeft - bar.clientWidth / 2 + now.clientWidth / 2;
}
$('#switchRoute').addEventListener('click', () => { if (confirm('回到序章重新選路線？目前的選擇會清除。')) { S = fresh(); go('entry'); } });

function currentLook() {
  const st = { ...STYLES[S.dir] };
  if (S.wall) st.wall = S.wall.color;
  if (S.sofaOverride) st.sofa = S.sofaOverride;
  return st;
}

/* ================= views ================= */
const VIEWS = {};

VIEWS.entry = () => {
  const order = ['full', 'fast', 'idea'];
  const phone = h('div', { class: 'phone' }, h('div', { class: 'screen' },
    h('p', { class: 'note' }, '序章・鑰匙'), fromHTML(MASCOT),
    h('p', { class: 'door' }, '門開了。', h('br'), '你想怎麼走？'),
    ...order.map((k) => h('button', { class: 'routeBtn' + (k === 'fast' ? ' primary' : ''), onclick: () => start(k), 'aria-disabled': ROUTES[k].open ? false : 'true' },
      h('b', {}, ROUTES[k].name, ROUTES[k].open ? null : h('span', { class: 'soon' }, '下一版')), h('span', {}, ROUTES[k].hint))),
    h('p', { class: 'note' }, '之後都能換路線')));
  const chain = (r) => {
    const c = h('div', { class: 'chain' });
    r.steps.forEach(([n, req], i) => { if (i) c.append(h('span', { class: 'sep' }, '›')); c.append(h('span', { class: 'tag' + (req ? '' : ' opt') }, n)); });
    return c;
  };
  app.append(h('section', { class: 'entry' }, phone, h('div', {},
    h('p', { class: 'kicker' }, 'A 入口・開場路線'), h('h1', {}, '三條路線，都走得到定案'),
    h('div', { class: 'legend' }, h('span', {}, h('i', { class: 'req' }), '必要'), h('span', {}, h('i', { class: 'opt' }), '可跳過，之後可補玩')),
    h('div', { class: 'routes' }, ...order.map((k) => h('button', { class: 'route', onclick: () => start(k) },
      h('div', {}, h('h3', {}, ROUTES[k].name, ROUTES[k].open ? null : h('span', { class: 'soon' }, '下一版')), h('p', {}, ROUTES[k].desc)), chain(ROUTES[k])))),
    h('div', { class: 'rules' },
      h('div', {}, h('b', {}, '自動略過'), h('p', {}, '一個人住或自己決定，就不出現家人共測。')),
      h('div', {}, h('b', {}, '跳過人格'), h('p', {}, '進 3D 前用幾題補上收納和光線等準則。')),
      h('div', {}, h('b', {}, '不看施工範圍'), h('p', {}, '關卡是為了找出喜好，施工範圍等確認裝修時再問。'))))));
};
function start(k) {
  if (!ROUTES[k].open) { alert('完整闖關在下一版開放。這個原型先做「快速找風格」與「我已經有想法」。'); return; }
  S = fresh(); S.route = k; go(k === 'fast' ? 'view' : 'ref');
}

/* ---- 第 1 關 看屋 ---- */
VIEWS.view = () => {
  const pair = PAIRS[S.q];
  const answer = (choice) => {
    S.scores = applyChoice(S.scores, pair, choice);
    S.q += 1;
    S.q >= PAIRS.length ? go('taste') : render();
  };
  const reasons = h('div', { class: 'row', hidden: true }, h('span', { class: 'note' }, '哪裡不喜歡？'),
    ...DISLIKE_REASONS.map((d) => h('button', { class: 'chip', onclick: () => { S.dislikes.add(d); answer(null); } }, d)));
  const option = (k, label) => h('button', { class: 'option', onclick: () => answer(k), 'aria-label': `選 ${label}` },
    h('span', { class: 'lbl' }, label), fromHTML(roomSVG(STYLES[k], { label: `選項 ${label} 的客廳` })));
  app.append(h('section', { class: 'step' },
    h('div', {}, h('p', { class: 'kicker' }, '第 1 關・看屋'), h('h2', {}, '哪間更想住？'), h('p', { class: 'lead' }, '看圖選就好，不用先懂風格名詞。')),
    h('div', { class: 'qmeta' }, h('span', {}, `第 ${S.q + 1} 題／共 ${PAIRS.length} 題`), h('span', {}, '二選一，逼出取捨')),
    h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': PAIRS.length, 'aria-valuenow': S.q }, h('i', { style: `width:${(S.q / PAIRS.length) * 100}%` })),
    h('div', { class: 'versus' }, option(pair[0], 'A'), option(pair[1], 'B')),
    h('div', { class: 'row' }, h('button', { class: 'chip', onclick: () => { reasons.hidden = false; } }, '兩間都不喜歡'), reasons),
    guide(S.q === 0 ? '兩扇門都開了，你想住進哪一間？' : '很好，再一題。直覺選就好。')));
};

/* ---- 口味圖譜 ---- */
VIEWS.taste = () => {
  const r = tasteResult(S.scores);
  const [top, second, third] = r.ranked;
  if (!S.tags.size) { STYLES[top].tags.forEach((t) => S.tags.add(t)); S.tags.add(STYLES[second].tags[0]); }
  const map = h('div', { class: 'map', role: 'img', 'aria-label': `口味圖譜：${describe(r)}` });
  [['暖', 'right:10px;top:calc(50% - 22px)'], ['冷', 'left:10px;top:calc(50% - 22px)'], ['豐富', 'left:calc(50% + 6px);top:8px'], ['簡約', 'left:calc(50% + 6px);bottom:8px']]
    .forEach(([t, s]) => map.append(h('span', { class: 'ax', style: s }, t)));
  for (const s of Object.values(STYLES)) map.append(h('span', { class: 'dot', style: `left:${50 + s.x * 40}%;top:${50 + s.y * 40}%` }, h('b', {}, s.name)));
  const me = h('span', { class: 'me', style: 'left:50%;top:50%' });
  map.append(me);
  requestAnimationFrame(() => requestAnimationFrame(() => { me.style.left = `${50 + r.x * 40}%`; me.style.top = `${50 + r.y * 40}%`; }));
  const all = [...new Set([top, second, third].flatMap((k) => STYLES[k].tags))];
  const tags = h('div', { class: 'row' }, ...all.map((t) => h('button', { class: 'chip', 'aria-pressed': String(S.tags.has(t)),
    onclick: (e) => { S.tags.has(t) ? S.tags.delete(t) : S.tags.add(t); e.currentTarget.setAttribute('aria-pressed', String(S.tags.has(t))); } }, '#' + t)));
  app.append(h('section', { class: 'step split' },
    card({ class: 'visual' }, map, h('p', { class: 'note center' }, '位置由你的選擇算出，猜錯了可以改標籤')),
    h('div', {},
      h('p', { class: 'kicker' }, '第 1 關・結果'), h('h2', {}, '你的居家口味'),
      h('p', { class: 'lead' }, `${describe(r)}，最接近「${STYLES[top].name}」，其次是「${STYLES[second].name}」。`),
      S.dislikes.size ? h('p', { class: 'note' }, '你不喜歡：' + [...S.dislikes].join('、')) : null,
      card({ class: 'stack' }, h('b', {}, '猜錯了？點一下就能改'), tags),
      h('div', { class: 'actions' },
        h('button', { class: 'btn accent', onclick: () => go('layout') }, '對，就是這樣'),
        h('button', { class: 'btn line', onclick: () => { const route = S.route; S = fresh(); S.route = route; go('view'); } }, '重新看屋')),
      guide('這是我猜的口味。有不對的地方直接改，我會記下來。'))));
};

/* ---- 我已經有想法：參考圖 → 確認口味 ---- */
VIEWS.ref = () => {
  const thumbs = h('div', { class: 'thumbs' });
  const next = h('button', { class: 'btn accent', disabled: !S.refs.length, onclick: () => go('confirm') }, '下一步：確認口味');
  const draw = () => {
    thumbs.replaceChildren(...S.refs.map((url, i) => h('div', {}, h('img', { src: url, alt: `參考圖 ${i + 1}` }),
      h('button', { 'aria-label': `移除參考圖 ${i + 1}`, onclick: () => { URL.revokeObjectURL(url); S.refs.splice(i, 1); draw(); } }, '×'))));
    next.disabled = !S.refs.length;
  };
  const file = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'sr', id: 'refFile',
    onchange: (e) => { [...e.target.files].slice(0, 8 - S.refs.length).forEach((f) => S.refs.push(URL.createObjectURL(f))); draw(); } });
  draw();
  app.append(h('section', { class: 'step split' },
    card({ class: 'visual' }, h('label', { for: 'refFile', class: 'upload' }, '＋ 從相簿、相機或電腦選圖（最多 8 張）'), file, thumbs, h('p', { class: 'note' }, '圖片只在你的瀏覽器裡預覽，不會上傳。')),
    h('div', {}, h('p', { class: 'kicker' }, '我已經有想法・參考圖'), h('h2', {}, '放上你喜歡的圖'), h('p', { class: 'lead' }, '室內照、家具、色票都可以。下一步會整理出口味讓你確認。'),
      h('div', { class: 'actions' }, next, h('button', { class: 'btn line', onclick: () => { S.route = 'fast'; go('view'); } }, '沒有圖，改走快速路線')),
      guide('先放幾張就好，3 張以上會更準。'))));
};
VIEWS.confirm = () => {
  const candidates = ['warm', 'muji', 'nordic']; // 原型：示意方向；正式版由參考圖推出候選
  const pick = (k) => { S.scores = boost(S.scores, k, 3); STYLES[k].tags.forEach((t) => S.tags.add(t)); go('layout'); };
  app.append(h('section', { class: 'step' },
    h('div', {}, h('p', { class: 'kicker' }, '我已經有想法・確認口味'), h('h2', {}, '你的參考圖比較像哪一種？'), h('p', { class: 'lead' }, '原型以示意方向代替圖片分析；正式版會由參考圖推出候選口味。')),
    h('div', { class: 'versus three' }, ...candidates.map((k) => h('button', { class: 'option', onclick: () => pick(k) }, fromHTML(roomSVG(STYLES[k])), h('b', { class: 'optname' }, STYLES[k].name)))),
    guide('選最接近的一個，下一關還能鎖定細節。')));
};

/* ---- 第 2 關 佈置 ---- */
VIEWS.layout = () => {
  const dirs = directions(S.scores);
  if (!S.dir) S.dir = dirs[0].key;
  const hero = card({ class: 'hero' });
  const paint = () => { hero.innerHTML = roomSVG(currentLook(), { label: '目前方案示意' }); };
  const LOCKS = [['floor', '木地板'], ['wall', '牆色'], ['sofa', '沙發']];
  const lockLabel = (k, l) => (S.locks[k] ? '🔒 ' : '') + l;
  const reroll = () => {
    if (!S.locks.sofa) { const pool = ['#5f7a6a', '#a9b0b3', '#8f4c2a', '#cfc2ad', '#4f6d8a', '#2b2621']; S.sofaOverride = pool[Math.floor(Math.random() * pool.length)]; }
    if (!S.locks.wall) S.wall = WALL_SWATCHES[Math.floor(Math.random() * WALL_SWATCHES.length)];
    paint();
  };
  paint();
  app.append(h('section', { class: 'step split' },
    h('div', { class: 'visual' }, hero, h('p', { class: 'note' }, '材質只標相對價位，不用先給預算。')),
    h('div', { class: 'stack' },
      h('div', {}, h('p', { class: 'kicker' }, '第 2 關・佈置'), h('h2', {}, '鎖住喜歡的，其他重抽')),
      card({ class: 'stack' }, h('b', {}, '1　選方向'),
        h('div', { class: 'dirs' }, ...dirs.map(({ key, role }) => h('button', { class: 'dir', 'aria-pressed': String(S.dir === key),
          onclick: () => { S.dir = key; S.wall = null; S.sofaOverride = null; render(); } }, fromHTML(roomSVG(STYLES[key])), h('small', {}, role), h('b', {}, STYLES[key].name)))),
        h('p', { class: 'note' }, '放一個挑戰者，避免只確認已知的口味。')),
      card({ class: 'stack' }, h('b', {}, '2　鎖定與重抽'),
        h('div', { class: 'row' }, ...LOCKS.map(([k, l]) => h('button', { class: 'chip lock', 'aria-pressed': String(S.locks[k]),
          onclick: (e) => { S.locks[k] = !S.locks[k]; e.currentTarget.setAttribute('aria-pressed', String(S.locks[k])); e.currentTarget.textContent = lockLabel(k, l); } }, lockLabel(k, l)))),
        h('div', {}, h('button', { class: 'btn line', onclick: reroll }, '重抽沒鎖的'))),
      card({ class: 'stack' }, h('b', {}, '3　這輪只改牆色'),
        h('div', { class: 'swatches' }, ...WALL_SWATCHES.map((w) => h('button', { class: 'sw', 'aria-pressed': String(S.wall?.name === w.name),
          onclick: () => { S.wall = w; S.locks.wall = true; render(); } }, h('i', { style: `background:${w.color}` }), w.name)))),
      h('div', { class: 'actions' }, h('button', { class: 'btn accent', onclick: () => go('final') }, '就是這個，產生定案卡')),
      guide('每輪只改一兩個地方，才知道你為什麼選它。'))));
};

/* ---- 定案卡 ---- */
VIEWS.final = () => {
  const look = STYLES[S.dir];
  const locked = [S.locks.floor && `地板：${look.name}木色`, S.wall ? `牆色：${S.wall.name}` : S.locks.wall && '牆色：原色', S.locks.sofa && '沙發保留'].filter(Boolean);
  const flexible = [!S.locks.sofa && '沙發色', !S.locks.wall && !S.wall && '牆色', '窗簾'].filter(Boolean);
  const group = (title, items, cls = '') => h('div', { class: 'grp ' + cls }, h('b', {}, title), items.length ? h('div', { class: 'row' }, ...items.map((t) => h('span', {}, t))) : h('p', { class: 'note' }, '（未指定，可略過）'));
  app.append(h('section', { class: 'step split' },
    card({ class: 'visual hero' }, fromHTML(roomSVG(currentLook(), { label: '定案方案示意' }))),
    card({ class: 'final' },
      h('p', { class: 'kicker' }, '風格定案卡'), h('h2', {}, look.name + (S.wall ? `・${S.wall.name}牆` : '')),
      group('口味標籤', [...S.tags].map((t) => '#' + t)),
      group('已鎖定', locked),
      group('絕對不要', [...S.dislikes], 'no'),
      group('保留彈性', flexible),
      h('p', { class: 'note' }, '之後仍可修改；準則與風格要請設計師覆核。'),
      h('div', { class: 'actions' }, h('button', { class: 'btn accent', onclick: () => go('cond') }, '確認，進入 3D'), h('button', { class: 'btn line', onclick: () => go('layout') }, '回去調整')))));
};

/* ---- 3D 與報價：確認需求（說出想像＋只補必要資料） ---- */
VIEWS.cond = () => {
  const c = S.cond;
  const ta = h('textarea', { id: 'say', placeholder: '例如：客廳大約 8 坪，想要多一點收納，預算 50 萬內，中古屋在新北市' }, c.text);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micNote = h('span', { class: 'note' }, Recognition ? '按一下說話，說完可以修改逐字稿' : '這個瀏覽器不支援語音輸入，請直接打字');
  const mic = h('button', { class: 'mic', 'aria-label': '開始或停止說話', disabled: !Recognition }, fromHTML('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'));
  if (Recognition) {
    let rec = null;
    mic.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new Recognition(); rec.lang = 'zh-TW'; rec.interimResults = true;
      mic.classList.add('on'); micNote.textContent = '正在聆聽…再按一下停止';
      rec.onresult = (e) => { ta.value = [...e.results].map((r) => r[0].transcript).join(''); };
      rec.onerror = () => { micNote.textContent = '沒有取得麥克風權限，請直接打字'; };
      rec.onend = () => { mic.classList.remove('on'); rec = null; if (!micNote.textContent.startsWith('沒有')) micNote.textContent = '可以修改逐字稿，再按「整理需求」'; };
      rec.start();
    });
  }
  const select = (id, options, value) => h('select', { id }, ...options.map((o) => h('option', { selected: o === value }, o)));
  const fields = {
    space: select('sp', SPACES, c.space),
    ping: h('input', { id: 'pg', type: 'number', inputmode: 'decimal', min: 1, max: 200, placeholder: '不知道可先空著', value: c.ping }),
    age: select('ag', AGES, c.age),
    city: select('ct', CITIES, c.city),
    budget: h('input', { id: 'bd', type: 'number', inputmode: 'numeric', min: 1, placeholder: '可略過', value: c.budget }),
  };
  const read = () => { for (const k in fields) c[k] = fields[k].value; c.text = ta.value; fields.ping.classList.toggle('missing', !c.ping); };
  const write = () => { for (const k in fields) fields[k].value = c[k]; fields.ping.classList.toggle('missing', !c.ping); };
  Object.values(fields).forEach((el) => el.addEventListener('input', read));
  const field = (label, el) => h('div', { class: 'field' }, h('label', { for: el.id }, label), el);
  write();
  app.append(h('section', { class: 'step split' },
    card({ class: 'visual stack' },
      h('b', {}, '說出想像，或直接打字'), h('div', { class: 'row' }, mic, micNote),
      h('div', { class: 'field' }, h('label', { for: 'say', class: 'sr' }, '需求逐字稿'), ta),
      h('div', {}, h('button', { class: 'btn line', onclick: () => { Object.assign(c, parseIntake(ta.value)); c.text = ta.value; write(); } }, '整理需求')),
      h('p', { class: 'note' }, '錄音前會取得權限；拒絕或不支援時可以改打字。')),
    h('div', { class: 'stack' },
      h('div', {}, h('p', { class: 'kicker' }, '3D 與報價・確認需求'), h('h2', {}, '我理解的需求'), h('p', { class: 'lead' }, '只問必要的：沒有坪數就無法估價，其他都能先略過。')),
      card({}, h('div', { class: 'fields two' },
        field('空間', fields.space), field('坪數（估價必要）', fields.ping), field('屋況', fields.age), field('地區', fields.city), field('預算上限（萬元，可略過）', fields.budget))),
      h('div', { class: 'actions' }, h('button', { class: 'btn accent', onclick: () => { read(); go('gen'); } }, '確認，開始生成')),
      guide('風格已經定案了，現在只差房子的條件。不知道的我會標「待補資料」，不會亂猜。'))));
};

/* ---- 生成中 ---- */
VIEWS.gen = () => {
  const items = ['整理需求與定案卡', '生成 3D 預覽（輕量）', '計算預算區間', '檢查台灣空間／消防／機電條件'];
  const ol = h('ol', {}, ...items.map((t) => h('li', {}, t)));
  app.append(h('section', { class: 'gen' }, fromHTML(MASCOT), h('h2', {}, '亮亮正在幫你準備'), ol, h('p', { class: 'note' }, '預覽優先，較重的內容按需載入')));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  const tick = () => {
    [...ol.children].forEach((li, k) => { li.className = k < i ? 'ok' : k === i ? 'on' : ''; });
    if (i++ < items.length) setTimeout(tick, reduced ? 50 : 600);
    else { S.versions = [{ label: '版本 1', look: currentLook() }]; S.v = 0; go('result'); }
  };
  tick();
};

/* ---- 結果頁 ---- */
const EDITS = [
  ['沙發換淺色', ['沙發', '淺'], (l) => ({ ...l, sofa: '#cfc8bd' })],
  ['牆換暖白', ['牆', '白'], (l) => ({ ...l, wall: '#f3ece0' })],
  ['地毯拿掉', ['地毯'], (l) => ({ ...l, rug: null })],
  ['地板換深色', ['地板', '深'], (l) => ({ ...l, floor: '#7a5a3e' })],
];
VIEWS.result = () => {
  const c = S.cond;
  const look = S.versions[S.v].look;
  const est = estimate(c);
  const fit = budgetFit(est, c.budget);
  const findings = ruleFindings(c, look);
  const counts = countByState(findings);

  const scene = h('div', { class: 'scene', role: 'img', 'aria-label': '3D 空間提案，可拖曳旋轉' });
  const room = mountRoom3D(scene, look, S.view);
  const views = h('div', { class: 'views' }, ...['A', 'B', 'C'].map((v) => h('button', { 'aria-pressed': String(S.view === v),
    onclick: () => { S.view = v; room.setView(v); [...views.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v))); }, 'data-v': v }, '視角 ' + v)));
  scene.append(views, h('span', { class: 'hint' }, '拖曳旋轉'));

  const edit = (text) => {
    const hits = EDITS.filter(([label, keys]) => text === label || keys.every((k) => text.includes(k)));
    if (!hits.length) { alert('原型目前聽得懂：' + EDITS.map((e) => e[0]).join('、')); return; }
    const next = hits.reduce((l, [, , fn]) => fn(l), { ...look });
    S.versions.push({ label: `版本 ${S.versions.length + 1}`, look: next });
    S.v = S.versions.length - 1;
    render();
  };
  const sayInput = h('input', { placeholder: '想改哪裡？例如：沙發換淺色、牆換暖白', 'aria-label': '修改需求' });

  const fitText = { within: ['在你的預算內有機會完成', 'var(--green)'], partly: [`部分落在你的預算 ${c.budget} 萬內，建議先定優先工項`, 'var(--accent-d)'], over: [`低標已超過你的預算 ${c.budget} 萬，建議縮小範圍或局部施作`, 'var(--accent)'] }[fit];
  const budget = card({ class: 'budget' }, h('p', { class: 'note' }, '預算區間（示意）'),
    est ? h('div', {},
      h('p', { class: 'big' }, `約 ${est.low}–${est.high} 萬`),
      h('div', { class: 'range', 'aria-hidden': 'true' }, h('i', { style: `left:${(est.unitLow / 20) * 100}%;width:${((est.unitHigh - est.unitLow) / 20) * 100}%` })),
      fitText ? h('p', { class: 'note', style: `color:${fitText[1]}` }, fitText[0]) : null,
      h('dl', { class: 'basis' },
        h('dt', {}, '範圍'), h('dd', {}, `${c.space}，${est.ping} 坪`),
        h('dt', {}, '單價依據'), h('dd', {}, `${c.age}每坪約 ${est.unitLow}–${est.unitHigh} 萬（參考行情，2025）`),
        h('dt', {}, '主要假設'), h('dd', {}, '中等建材、不動格局'),
        h('dt', {}, '排除'), h('dd', {}, '家電、軟裝家具、設計與監工費')))
      : h('div', {}, h('p', { class: 'big small' }, '暫無可靠估算'), h('p', { class: 'lead' }, '還缺坪數。補上後才給區間，不用猜的數字。'),
        h('div', { class: 'actions' }, h('button', { class: 'btn line', onclick: () => go('cond') }, '補坪數'))));

  const rules = card({},
    h('div', { class: 'row between' }, h('b', {}, '台灣條件檢查'), h('span', { class: 'note' }, Object.entries(counts).map(([k, n]) => `${STATES[k]} ${n}`).join('・'))),
    h('ul', { class: 'cons' }, ...findings.map((f) => h('li', {}, h('span', { class: 'dotc', style: `background:${STATE_COLOR[f.state]}` }),
      h('div', {}, h('b', {}, f.title), h('div', { class: 'note' }, f.detail)), h('span', { class: 'st ' + f.state }, STATES[f.state])))),
    h('p', { class: 'note' }, '未知不等於通過；正式版需附來源、版本與適用條件，並由專業覆核。'));

  app.append(h('section', { class: 'res' },
    h('div', { class: 'left stack' },
      h('div', { class: 'row between' }, h('div', {}, h('p', { class: 'kicker' }, '3D 與報價・結果頁'), h('h2', {}, `${c.space}提案`)),
        h('div', { class: 'versions' }, ...S.versions.map((v, i) => h('button', { 'aria-pressed': String(i === S.v), onclick: () => { S.v = i; render(); } }, v.label)))),
      scene,
      card({ class: 'stack' }, h('b', {}, '對著 3D 說，把家改到對'),
        h('div', { class: 'say' }, sayInput, h('button', { class: 'btn', onclick: () => edit(sayInput.value) }, '改')),
        h('div', { class: 'row' }, ...EDITS.map(([label]) => h('button', { class: 'chip', onclick: () => edit(label) }, label))),
        h('p', { class: 'note' }, '每次修改都存成新版本，可以比較、還原。'))),
    h('div', { class: 'stack' }, budget, rules,
      h('button', { class: 'btn accent block', onclick: () => $('#unlock').showModal() }, '解鎖更多方案'),
      h('button', { class: 'btn line block', onclick: () => { S = fresh(); go('entry'); } }, '重新開始'))));
};

render();
