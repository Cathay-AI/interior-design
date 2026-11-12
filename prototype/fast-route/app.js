// UI for the 快速找風格 prototype: five phone screens, 從一句話到一個家.
// Decision logic lives in ./lib (pure, unit-tested); this file owns state, rendering and browser APIs.
import { STYLES } from './lib/taste.js';
import { estimate, budgetFit } from './lib/estimate.js';
import { STATES, ruleFindings } from './lib/rules.js';
import { SPACES, AGES, parseIntake, inferStyle } from './lib/intake.js';
import { MASCOT, roomSVG } from './lib/art.js';

// The 3D module (Three.js) is loaded on demand so the first screens stay light.
let room3d = null;
const load3D = () => (room3d ??= import('./lib/room3d.js'));
let thumbs = null; // style key -> realistic still (data URL), rendered once
let live = null;   // the mounted 3D room, disposed whenever the screen changes

/* ================= content ================= */
const STEPS = [
  null,
  { title: '說說你想要的家', name: '說出想像', sub: '語音或打字' },
  { title: '哪幾張有你喜歡的感覺？', name: '參考圖', sub: '點選或上傳' },
  { title: '我理解的需求', name: '確認需求', sub: '只補必要資料' },
  { title: '你的 3D 提案', name: '3D 提案', sub: '可旋轉、可修改' },
  { title: '預算與限制', name: '預算與限制', sub: '區間與注意事項' },
];
const EXAMPLES = ['客廳想要溫暖木質感、多收納，預算大約 50 萬', '8 坪中古屋客廳，喜歡北歐明亮的感覺', '想要無印日式的臥室，預算 30 萬內'];
const EDITS = [
  ['沙發換淺色', (l) => ({ ...l, sofa: '#cfc8bd' })],
  ['牆換暖白', (l) => ({ ...l, wall: '#f3ece0' })],
  ['地毯拿掉', (l) => ({ ...l, rug: null })],
  ['地板換深色', (l) => ({ ...l, floor: '#7a5a3e' })],
];
const STATE_COLOR = { ok: '#5f7a6a', conflict: '#b5653a', missing: '#c9a77c', na: '#8a7f72' };

/* ================= state ================= */
const fresh = () => ({
  step: 1, reached: 1, text: '', picked: new Set(), uploads: [], parsed: null,
  cond: { space: '客廳', style: null, styleGuessed: true, budget: '', ping: '', age: '新成屋' },
  open: null, versions: [], v: 0, view: 'A', generated: false,
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
const cta = (label, onclick, cls = '', attrs = {}) => h('button', { class: 'cta ' + cls, onclick, ...attrs }, label);

/* ================= navigation ================= */
function go(step) {
  S.step = step; S.reached = Math.max(S.reached, step); S.open = null;
  render(); app.scrollTop = 0;
  if (matchMedia('(max-width: 899px)').matches) window.scrollTo({ top: 0 });
}
function render() {
  renderStory();
  $('#restart').hidden = S.reached === 1 && !S.text;
  live?.dispose(); live = null;
  app.replaceChildren();
  app.dataset.step = S.step;
  SCREENS[S.step]();
}
function renderStory() {
  const list = $('#steps');
  list.replaceChildren(...STEPS.slice(1).map((s, i) => {
    const n = i + 1;
    const state = n === S.step ? 'now' : n <= S.reached ? 'done' : '';
    return h('li', {}, h('button', { class: state, disabled: n > S.reached, 'aria-current': n === S.step ? 'step' : false, onclick: () => go(n) },
      h('span', { class: 'n' }, String(n)), h('span', { class: 't' }, s.name)));
  }));
}
$('#restart').addEventListener('click', () => { S.uploads.forEach((u) => URL.revokeObjectURL(u)); S = fresh(); go(1); });

const head = (n, lead) => h('div', { class: 'shead' },
  n > 1 ? h('button', { class: 'back', onclick: () => go(n - 1) }, '‹ 上一步') : null,
  h('h1', {}, STEPS[n].title), lead ? h('p', { class: 'lead' }, lead) : null);

function understand() {
  const c = S.cond;
  if (S.parsed !== S.text) { Object.assign(c, parseIntake(S.text)); S.parsed = S.text; }
  const fromText = inferStyle(S.text);
  const votes = [...S.picked];
  if (!c.style || c.styleGuessed) {
    c.style = fromText ?? votes[0] ?? 'warm';
    c.styleGuessed = !fromText && !votes.length;
  }
}
const look = () => S.versions[S.v]?.look ?? STYLES[S.cond.style ?? 'warm'];

/* ================= screens ================= */
const SCREENS = [];

/* ---- 1 說出想像 ---- */
SCREENS[1] = () => {
  const ta = h('textarea', { id: 'say', rows: 4, placeholder: '例如：客廳想要溫暖木質感、多收納，預算大約 50 萬', 'aria-label': '你的需求' }, S.text);
  const next = cta('下一步', () => { S.text = ta.value.trim(); understand(); go(2); });
  const sync = () => { S.text = ta.value; next.disabled = !ta.value.trim(); };
  ta.addEventListener('input', sync);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const label = h('span', { class: 'miclabel' }, Recognition ? '按住說話' : '此瀏覽器不支援語音，請直接打字');
  const mic = h('button', { class: 'mic', 'aria-label': '按住說話', disabled: !Recognition },
    fromHTML('<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'));
  if (Recognition) {
    let rec = null;
    const start = () => {
      if (rec) return;
      rec = new Recognition(); rec.lang = 'zh-TW'; rec.interimResults = true;
      const base = ta.value;
      mic.classList.add('on'); label.textContent = '正在聆聽…放開結束';
      rec.onresult = (e) => { ta.value = base + [...e.results].map((r) => r[0].transcript).join(''); sync(); };
      rec.onerror = () => { label.textContent = '沒有麥克風權限，請直接打字'; };
      rec.onend = () => { mic.classList.remove('on'); rec = null; if (label.textContent.startsWith('正在')) label.textContent = '按住說話'; };
      rec.start();
    };
    const stop = () => rec && rec.stop();
    mic.addEventListener('pointerdown', start);
    mic.addEventListener('pointerup', stop);
    mic.addEventListener('pointerleave', stop);
    mic.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(); });
    mic.addEventListener('keyup', stop);
  }
  app.append(head(1, '空間、喜歡的感覺、預算，想到什麼說什麼。之後都能改。'),
    h('div', { class: 'compose' }, ta, h('div', { class: 'row between' }, label, mic)),
    h('div', { class: 'chips' }, ...EXAMPLES.map((t) => h('button', { class: 'chip ghost', onclick: () => { ta.value = t; sync(); ta.focus(); } }, t))),
    next);
  sync();
  (window.requestIdleCallback ?? setTimeout)(() => load3D().catch(() => {}));
};

/* ---- 2 參考圖 ---- */
SCREENS[2] = () => {
  const grid = h('div', { class: 'tiles' });
  const draw = () => grid.replaceChildren(
    ...Object.entries(STYLES).map(([k, st]) => h('button', { class: 'tile', 'aria-pressed': String(S.picked.has(k)), 'aria-label': st.name,
      onclick: () => { S.picked.has(k) ? S.picked.delete(k) : S.picked.add(k); draw(); } },
      thumbs === null ? h('span', { class: 'skeleton' })
        : thumbs[k] ? h('img', { src: thumbs[k], alt: '', loading: 'lazy' }) : fromHTML(roomSVG(st)),
      h('span', { class: 'cap' }, st.name))),
    ...S.uploads.map((url, i) => h('div', { class: 'tile up' }, h('img', { src: url, alt: `我的參考圖 ${i + 1}` }),
      h('button', { class: 'rm', 'aria-label': `移除參考圖 ${i + 1}`, onclick: () => { URL.revokeObjectURL(url); S.uploads.splice(i, 1); draw(); } }, '×'))),
    h('label', { for: 'refFile', class: 'tile add' }, h('b', {}, '＋'), '放自己的圖'));
  const file = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'sr', id: 'refFile',
    onchange: (e) => { [...e.target.files].slice(0, 6 - S.uploads.length).forEach((f) => S.uploads.push(URL.createObjectURL(f))); e.target.value = ''; draw(); } });
  draw();
  if (thumbs === null) {
    load3D().then((m) => m.renderThumbnails(STYLES)).catch(() => ({}))
      .then((t) => { thumbs = t; if (S.step === 2) draw(); });
  }
  app.append(head(2, '可以複選，也可以跳過。自己的圖只在瀏覽器預覽，不會上傳。'), grid, file,
    cta(S.picked.size || S.uploads.length ? '下一步' : '先跳過', () => { understand(); go(3); }));
  grid.addEventListener('click', () => { app.querySelector('.cta').textContent = S.picked.size || S.uploads.length ? '下一步' : '先跳過'; });
};

/* ---- 3 我理解的需求 ---- */
SCREENS[3] = () => {
  if (!S.cond.style) understand();
  const c = S.cond;
  const set = (k, v) => { c[k] = v; if (k === 'style') c.styleGuessed = false; S.open = null; S.versions = []; S.generated = false; render(); };
  const chips = (k, options, fmt = (o) => o) => h('div', { class: 'chips' }, ...options.map((o) =>
    h('button', { class: 'chip', 'aria-pressed': String(String(c[k]) === String(o)), onclick: () => set(k, String(o)) }, fmt(o))));
  const number = (k, unit, max) => {
    const input = h('input', { type: 'number', inputmode: 'decimal', min: 1, max, placeholder: '自己填', value: c[k], 'aria-label': `自己填${unit}` });
    return h('form', { class: 'num', onsubmit: (e) => { e.preventDefault(); set(k, input.value); } }, input, h('span', {}, unit), h('button', { class: 'chip' }, '好'));
  };
  const rows = [
    ['space', '空間', c.space, () => chips('space', SPACES)],
    ['style', '風格', STYLES[c.style].name + (c.styleGuessed ? '（我猜的）' : ''), () => h('div', { class: 'chips' }, ...Object.entries(STYLES).map(([k, s]) =>
      h('button', { class: 'chip', 'aria-pressed': String(c.style === k), onclick: () => set('style', k) }, s.name)))],
    ['budget', '預算', c.budget ? `約 ${c.budget} 萬` : '未提供（可略過）', () => h('div', {}, chips('budget', [30, 50, 80, 120], (o) => `${o} 萬`), number('budget', '萬', 2000))],
    ['ping', '坪數', c.ping ? `${c.ping} 坪` : '請補充 ›', () => h('div', {}, chips('ping', [6, 8, 10, 15], (o) => `${o} 坪`), number('ping', '坪', 200)), !c.ping],
    ['age', '屋況', c.age, () => chips('age', AGES)],
  ];
  app.append(head(3, '我聽到的是這些。點任一列可以修改。'),
    h('div', { class: 'rows' }, ...rows.map(([k, label, value, editor, need]) => h('div', { class: 'rowitem' + (need ? ' need' : '') + (S.open === k ? ' open' : '') },
      h('button', { class: 'rowbtn', id: 'row-' + k, 'aria-expanded': String(S.open === k), onclick: () => { S.open = S.open === k ? null : k; render(); } },
        h('span', { class: 'k' }, label), h('span', { class: 'bar', 'aria-hidden': 'true' }), h('span', { class: 'v' }, value)),
      S.open === k ? h('div', { class: 'editor' }, editor()) : null))),
    c.ping ? null : h('p', { class: 'note' }, '只差坪數：沒有它就無法估價，其他都能先略過。'),
    cta('確認，開始生成', () => go(4)));
};

/* ---- 4 3D 提案 ---- */
SCREENS[4] = () => {
  if (!S.versions.length) { S.versions = [{ label: '版本 1', look: { ...STYLES[S.cond.style] } }]; S.v = 0; }
  if (!S.generated) return generating();
  const stage = h('div', { class: 'scene', role: 'img', 'aria-label': '3D 空間提案，可拖曳旋轉' }, h('span', { class: 'hint' }, '拖曳旋轉'));
  const views = h('div', { class: 'abc', role: 'group', 'aria-label': '視角' }, ...['A', 'B', 'C'].map((v) => h('button', { 'aria-pressed': String(S.view === v), 'aria-label': '視角 ' + v,
    onclick: () => { S.view = v; live?.setView(v); [...views.children].forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === v))); } }, v)));
  const edit = (fn) => { S.versions.push({ label: `版本 ${S.versions.length + 1}`, look: fn({ ...look() }) }); S.v = S.versions.length - 1; render(); };
  app.append(h('div', { class: 'result' },
    h('div', { class: 'stagewrap' }, stage, views),
    h('div', { class: 'panel' }, head(4, `${S.cond.space}・${STYLES[S.cond.style].name}`),
      h('div', { class: 'tweak' }, h('b', {}, '想改哪裡？'),
        h('div', { class: 'chips' }, ...EDITS.map(([label, fn]) => h('button', { class: 'chip', onclick: () => edit(fn) }, label))),
        S.versions.length > 1 ? h('div', { class: 'chips versions' }, ...S.versions.map((v, i) => h('button', { class: 'chip', 'aria-pressed': String(i === S.v), onclick: () => { S.v = i; render(); } }, v.label))) : null,
        h('p', { class: 'note' }, '每次修改都存成新版本，可以切換比較。')),
      cta('看預算與限制', () => go(5)))));
  const current = look();
  load3D().then((m) => { if (S.step === 4 && stage.isConnected) { live = m.mountRoom3D(stage, current, S.view); window.__room = live; } })
    .catch(() => { stage.append(fromHTML(roomSVG(current, { label: '空間提案示意' }))); stage.querySelector('.hint').textContent = '這台裝置無法顯示 3D，改用示意圖'; });
};
function generating() {
  const items = ['整理需求', '準備 3D 空間', '計算預算區間', '檢查台灣條件'];
  const ol = h('ol', { class: 'genlist' }, ...items.map((t) => h('li', {}, t)));
  app.append(h('div', { class: 'gen' }, fromHTML(MASCOT), h('b', {}, '正在幫你準備'), ol));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ready = load3D().catch(() => {});
  let i = 0;
  const tick = async () => {
    if (S.step !== 4) return;
    [...ol.children].forEach((li, k) => { li.className = k < i ? 'ok' : k === i ? 'on' : ''; });
    if (i === 1) await ready; // this step really waits for the 3D module
    if (i++ < items.length) setTimeout(tick, reduced ? 40 : 380);
    else if (S.step === 4) { S.generated = true; render(); }
  };
  tick();
}

/* ---- 5 預算與限制 ---- */
SCREENS[5] = () => {
  const c = S.cond;
  const est = estimate(c);
  const fit = budgetFit(est, c.budget);
  const fitText = { within: '在你的預算內有機會完成', partly: `部分落在你的預算 ${c.budget} 萬內，建議先定優先工項`, over: `低標已超過你的預算 ${c.budget} 萬，建議縮小範圍` }[fit];
  const money = est
    ? h('div', {},
      h('p', { class: 'big' }, `約 ${est.low}–${est.high} 萬`),
      h('div', { class: 'range', 'aria-hidden': 'true' }, h('i', { style: `left:${(est.unitLow / 20) * 100}%;width:${Math.max(8, ((est.unitHigh - est.unitLow) / 20) * 100)}%` })),
      fitText ? h('p', { class: 'fit ' + fit }, fitText) : null,
      h('details', { class: 'basis' }, h('summary', {}, '這個區間怎麼算的'),
        h('p', {}, `${c.space} ${est.ping} 坪 × ${c.age}每坪約 ${est.unitLow}–${est.unitHigh} 萬（參考行情，2025）。假設中等建材、不動格局；不含家電、軟裝與設計監工費。`)))
    : h('div', {}, h('p', { class: 'big none' }, '暫無可靠估算'), h('p', { class: 'note' }, '還缺坪數。補上後才給區間，不用猜的數字。'),
      h('button', { class: 'chip', onclick: () => { go(3); S.open = 'ping'; render(); } }, '補坪數'));
  const findings = ruleFindings(c, look());
  app.append(head(5, '先看量級，再決定要不要往下做。'), h('div', { class: 'two' }, h('div', { class: 'cardbox' }, money), h('div', { class: 'cardbox' },
    h('ul', { class: 'cons' }, ...findings.map((f) => h('li', {}, h('details', {},
      h('summary', {}, h('i', { style: `background:${STATE_COLOR[f.state]}` }), h('b', {}, f.title), h('span', { class: 'st' }, STATES[f.state])),
      h('p', {}, f.detail))))),
    h('p', { class: 'note' }, '未知不等於通過；點任一項看說明。'))),
    cta('解鎖更多方案', () => $('#unlock').showModal(), 'accent'));
};

render();
