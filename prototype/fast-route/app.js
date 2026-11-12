// UI for the 快速找風格 prototype: five phone screens, 從一句話到一個家.
// Decision logic lives in ./lib (pure, unit-tested); this file owns state, rendering and browser APIs.
import { STYLES } from './lib/taste.js';
import { estimate, budgetFit } from './lib/estimate.js';
import { STATES, ruleFindings } from './lib/rules.js';
import { SPACES, AGES, parseIntake, inferStyle } from './lib/intake.js';
import { MASCOT } from './lib/art.js';
import { mountRoom3D } from './lib/room3d.js';

/* ================= content ================= */
const STEPS = [
  null,
  { title: '新提案', name: '說出想像', sub: '語音或打字' },
  { title: '參考圖', name: '放參考圖', sub: '相簿、相機、檔案' },
  { title: '我理解的需求', name: '確認需求', sub: '只補必要資料' },
  { title: '3D 提案', name: '看 3D 提案', sub: '多視角、輕量載入' },
  { title: '預算與限制', name: '預算與限制', sub: '區間＋四態限制' },
];
const EXAMPLE = '客廳想要溫暖木質感、多收納，預算大約 50 萬';
const SAMPLES = [
  { id: 'wood', label: '木質沙發', style: 'warm', bg: '#c9a77c', art: '<rect x="26" y="52" width="48" height="20" rx="6" fill="#8c6f55"/>' },
  { id: 'lamp', label: '北歐吊燈', style: 'nordic', bg: '#a9c3d6', art: '<path d="M50 22V50" stroke="#2b2621" stroke-width="3"/><path d="M38 64H62L50 48Z" fill="none" stroke="#2b2621" stroke-width="3" stroke-linejoin="round"/>' },
  { id: 'green', label: '植栽綠意', style: 'muji', bg: '#5f7a6a', art: '<ellipse cx="50" cy="52" rx="15" ry="24" fill="#8fa894"/>' },
  { id: 'rug', label: '陶土地毯', style: 'retro', bg: '#e3c99a', art: '<rect x="24" y="30" width="52" height="42" rx="4" fill="#b5653a"/>' },
];
const EDITS = [
  ['沙發換淺色', (l) => ({ ...l, sofa: '#cfc8bd' })],
  ['牆換暖白', (l) => ({ ...l, wall: '#f3ece0' })],
  ['地毯拿掉', (l) => ({ ...l, rug: null })],
  ['地板換深色', (l) => ({ ...l, floor: '#7a5a3e' })],
];
const STATE_COLOR = { ok: '#5f7a6a', conflict: '#b5653a', missing: '#c9a77c', na: '#8a7f72' };

/* ================= state ================= */
const fresh = () => ({
  step: 1, reached: 1, text: '', picked: new Set(), uploads: [],
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
      h('span', { class: 'n' }, String(n)), h('span', { class: 't' }, h('b', {}, s.name), h('small', {}, s.sub))));
  }));
}
$('#restart').addEventListener('click', () => { S.uploads.forEach((u) => URL.revokeObjectURL(u)); S = fresh(); go(1); });

const head = (n) => h('div', { class: 'shead' },
  n > 1 ? h('button', { class: 'back', 'aria-label': '上一步', onclick: () => go(n - 1) }, '‹') : null,
  h('h2', {}, STEPS[n].title), h('span', { class: 'count' }, `${n}／5`));

function understand() {
  const c = S.cond;
  if (S.parsed !== S.text) { Object.assign(c, parseIntake(S.text)); S.parsed = S.text; }
  const fromText = inferStyle(S.text);
  const votes = [...S.picked].map((id) => SAMPLES.find((s) => s.id === id).style);
  if (!c.style || c.styleGuessed) {
    c.style = fromText ?? votes[0] ?? 'warm';
    c.styleGuessed = !fromText && !votes.length;
  }
}
const look = () => S.versions[S.v]?.look ?? STYLES[S.cond.style ?? 'warm'];

/* ================= screens ================= */
const SCREENS = [];

/* ---- 1 新提案：說出想像 ---- */
SCREENS[1] = () => {
  const ta = h('textarea', { id: 'say', rows: 4, placeholder: '說說你想要的家…', 'aria-label': '需求逐字稿' }, S.text);
  const next = cta('下一步', () => { S.text = ta.value.trim(); understand(); go(2); });
  const sync = () => { S.text = ta.value; next.disabled = !ta.value.trim(); };
  ta.addEventListener('input', sync);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const label = h('p', { class: 'miclabel' }, Recognition ? '按住說話' : '這個瀏覽器不支援語音，請直接打字');
  const mic = h('button', { class: 'mic', 'aria-label': '按住說話', disabled: !Recognition },
    fromHTML('<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'));
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
  app.append(head(1),
    h('div', { class: 'bubble' }, ta),
    h('div', { class: 'row between' }, h('span', { class: 'note' }, '可編輯逐字稿'),
      h('button', { class: 'link', onclick: () => { ta.value = EXAMPLE; sync(); } }, '用範例試試')),
    h('div', { class: 'micwrap' }, mic, label),
    next);
  sync();
};

/* ---- 2 參考圖 ---- */
SCREENS[2] = () => {
  const grid = h('div', { class: 'tiles' });
  const draw = () => grid.replaceChildren(
    ...SAMPLES.map((s) => h('button', { class: 'tile', 'aria-pressed': String(S.picked.has(s.id)), 'aria-label': s.label, style: `background:${s.bg}`,
      onclick: () => { S.picked.has(s.id) ? S.picked.delete(s.id) : S.picked.add(s.id); draw(); } },
      fromHTML(`<svg viewBox="0 0 100 100" aria-hidden="true">${s.art}</svg>`), h('span', { class: 'cap' }, s.label))),
    ...S.uploads.map((url, i) => h('div', { class: 'tile up' }, h('img', { src: url, alt: `我的參考圖 ${i + 1}` }),
      h('button', { class: 'rm', 'aria-label': `移除參考圖 ${i + 1}`, onclick: () => { URL.revokeObjectURL(url); S.uploads.splice(i, 1); draw(); } }, '×'))));
  const file = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'sr', id: 'refFile',
    onchange: (e) => { [...e.target.files].slice(0, 6 - S.uploads.length).forEach((f) => S.uploads.push(URL.createObjectURL(f))); e.target.value = ''; draw(); } });
  draw();
  app.append(head(2), grid,
    h('label', { for: 'refFile', class: 'add' }, '＋ 相簿／相機'), file,
    h('p', { class: 'note center' }, '點選喜歡的圖，或放自己的。圖片只在瀏覽器預覽，不會上傳。'),
    cta('下一步', () => { understand(); go(3); }));
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
  app.append(head(3),
    h('div', { class: 'rows' }, ...rows.map(([k, label, value, editor, need]) => h('div', { class: 'rowitem' + (need ? ' need' : '') + (S.open === k ? ' open' : '') },
      h('button', { class: 'rowbtn', id: 'row-' + k, 'aria-expanded': String(S.open === k), onclick: () => { S.open = S.open === k ? null : k; render(); } },
        h('span', { class: 'k' }, label), h('span', { class: 'bar', 'aria-hidden': 'true' }), h('span', { class: 'v' }, value)),
      S.open === k ? h('div', { class: 'editor' }, editor()) : null))),
    h('p', { class: 'note' }, c.ping ? '只問必要的。點任一列可以修改。' : '只問必要的：沒有坪數就無法估價，其他都能先略過。'),
    cta('確認，開始生成', () => go(4)));
};

/* ---- 4 3D 提案 ---- */
SCREENS[4] = () => {
  if (!S.versions.length) { S.versions = [{ label: '版本 1', look: { ...STYLES[S.cond.style] } }]; S.v = 0; }
  if (!S.generated) return generating();
  const scene = h('div', { class: 'scene', role: 'img', 'aria-label': '3D 空間提案，可拖曳旋轉' });
  const room = mountRoom3D(scene, look(), S.view);
  const views = h('div', { class: 'abc', role: 'group', 'aria-label': '視角' }, ...['A', 'B', 'C'].map((v) => h('button', { 'aria-pressed': String(S.view === v), 'aria-label': '視角 ' + v,
    onclick: () => { S.view = v; room.setView(v); [...views.children].forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === v))); } }, v)));
  const edit = (fn) => { S.versions.push({ label: `版本 ${S.versions.length + 1}`, look: fn({ ...look() }) }); S.v = S.versions.length - 1; render(); };
  app.append(head(4), scene, views, h('p', { class: 'note center' }, '預覽優先・可旋轉'),
    h('div', { class: 'tweak' }, h('b', {}, '想改哪裡？'),
      h('div', { class: 'chips' }, ...EDITS.map(([label, fn]) => h('button', { class: 'chip', onclick: () => edit(fn) }, label))),
      S.versions.length > 1 ? h('div', { class: 'chips versions' }, ...S.versions.map((v, i) => h('button', { class: 'chip', 'aria-pressed': String(i === S.v), onclick: () => { S.v = i; render(); } }, v.label))) : null),
    cta('看預算與限制', () => go(5)));
};
function generating() {
  const items = ['整理需求', '生成 3D 預覽', '計算預算區間', '檢查台灣條件'];
  const ol = h('ol', { class: 'genlist' }, ...items.map((t) => h('li', {}, t)));
  app.append(head(4), h('div', { class: 'gen' }, fromHTML(MASCOT), h('b', {}, '亮亮正在幫你準備'), ol));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  const tick = () => {
    if (S.step !== 4) return;
    [...ol.children].forEach((li, k) => { li.className = k < i ? 'ok' : k === i ? 'on' : ''; });
    if (i++ < items.length) setTimeout(tick, reduced ? 40 : 420);
    else { S.generated = true; render(); }
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
  app.append(head(5), money,
    h('ul', { class: 'cons' }, ...findings.map((f) => h('li', {}, h('details', {},
      h('summary', {}, h('i', { style: `background:${STATE_COLOR[f.state]}` }), h('b', {}, f.title), h('span', { class: 'st' }, STATES[f.state])),
      h('p', {}, f.detail))))),
    h('p', { class: 'note' }, '未知不等於通過；點任一項看說明。'),
    cta('解鎖更多方案', () => $('#unlock').showModal(), 'accent'));
};

render();
