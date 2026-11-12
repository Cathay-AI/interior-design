// UI for the 快速找風格 prototype: 靈感牆（點喜歡的圖）→ 3D 成品 → 估價與施工圖.
// Decision logic lives in ./lib (pure, unit-tested); this file owns state, rendering and browser APIs.
import { STYLES, SWIPE_ORDER, emptyScores, applySwipe, pickStyle } from './lib/taste.js';
import { designEstimate, resolvePing } from './lib/estimate.js';
import { STATES, ruleFindings } from './lib/rules.js';
import { AGES } from './lib/intake.js';
import { drawingSet } from './lib/drawings.js';
import { MASCOT, roomSVG } from './lib/art.js';

// The 3D module (Three.js) is loaded on demand so the first screen stays light.
let room3d = null;
const load3D = () => (room3d ??= import('./lib/room3d.js'));
let live = null; // the mounted 3D room, disposed whenever the screen changes

/* ================= content ================= */
const STEPS = [null, { name: '靈感' }, { name: '3D 成品' }, { name: '估價與施工圖' }];
const photo = (key, shot = 'hero') => `./assets/refs/${key}-${shot}.jpg`;
// Pins: [style, shot, width, height]. Interleaved so neighbouring pins differ in style and height.
const SHOTS = { hero: [880, 1100], wide: [1200, 800], detail: [540, 810], corner: [680, 680] };
const PINS = ['hero', 'corner', 'detail', 'wide'].flatMap((shot, r) =>
  SWIPE_ORDER.map((_, i) => SWIPE_ORDER[(i * (r % 2 ? 5 : 1) + r * 2) % SWIPE_ORDER.length]).map((k) => [k, shot, ...SHOTS[shot]]))
  .map((p, i, all) => all[(i * 7) % all.length]);
const EDITS = [
  ['沙發換淺色', (l) => ({ ...l, sofa: '#cfc8bd', fabric: 'linen', sofaTex: 'poly_wool_herringbone' })],
  ['牆換暖白', (l) => ({ ...l, wall: '#f3ece0', wallType: undefined, wallTex: 'plastered_wall' })],
  ['地毯拿掉', (l) => ({ ...l, rug: null })],
  ['地板換深色', (l) => ({ ...l, floor: '#6b4a32', floorType: 'wood', floorTex: 'wood_floor' })],
];
const STATE_COLOR = { ok: '#5f7a6a', conflict: '#b5653a', missing: '#c9a77c', na: '#8a7f72' };

/* ================= state ================= */
const fresh = () => ({
  step: 1, reached: 1, liked: new Set(),
  cond: { space: '客廳', style: null, ping: '', age: '新成屋' },
  versions: [], v: 0, view: 'A', mode: '3d', generated: false, unlocked: false,
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
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= navigation ================= */
function go(step) {
  S.step = step; S.reached = Math.max(S.reached, step);
  render();
  window.scrollTo({ top: 0 });
}
function render() {
  $('#steps').replaceChildren(...STEPS.slice(1).map((s, i) => {
    const n = i + 1, state = n === S.step ? 'now' : n <= S.reached ? 'done' : '';
    return h('li', {}, h('button', { class: state, disabled: n > S.reached, 'aria-current': n === S.step ? 'step' : false, onclick: () => go(n) },
      h('span', { class: 'n' }, String(n)), h('span', { class: 't' }, s.name)));
  }));
  $('#restart').hidden = S.reached === 1;
  live?.dispose(); live = null;
  app.replaceChildren();
  app.dataset.step = S.step;
  SCREENS[S.step]();
}
$('#restart').addEventListener('click', () => { S = fresh(); go(1); });

const setStyle = (key) => { S.cond.style = key; S.versions = [{ label: '版本 1', look: { ...STYLES[key] } }]; S.v = 0; };
const look = () => S.versions[S.v].look;
const backBtn = (n) => h('button', { class: 'back', onclick: () => go(n) }, '‹ 上一步');

/* ================= screens ================= */
const SCREENS = [];

/* ---- 1 靈感牆：像逛 Pinterest，點圖就是喜歡 ---- */
SCREENS[1] = () => {
  const bar = h('div', { class: 'feedbar' });
  const next = cta('', () => { setStyle(pickStyle(likedScores())); S.generated = false; go(2); }, 'accent', { id: 'make' });
  const count = h('span', { class: 'count', 'aria-live': 'polite' });
  const sync = () => {
    count.textContent = S.liked.size ? `已喜歡 ${S.liked.size} 張` : '點喜歡的圖';
    next.textContent = S.liked.size ? '看我的 3D' : '跳過，直接看 3D';
    next.classList.toggle('accent', S.liked.size > 0);
  };
  const pin = ([key, shot, w, hgt], i) => {
    const id = `${key}-${shot}`, st = STYLES[key];
    const btn = h('button', { class: 'pin', 'aria-pressed': String(S.liked.has(id)), 'aria-label': `${st.name}，${S.liked.has(id) ? '已喜歡' : '點一下喜歡'}`, 'data-style': key,
      onclick: () => {
        S.liked.has(id) ? S.liked.delete(id) : S.liked.add(id);
        btn.setAttribute('aria-pressed', String(S.liked.has(id)));
        btn.setAttribute('aria-label', `${st.name}，${S.liked.has(id) ? '已喜歡' : '點一下喜歡'}`);
        sync();
      } },
      h('img', { src: photo(key, shot), alt: '', width: w, height: hgt, loading: i < 6 ? 'eager' : 'lazy', decoding: 'async' }),
      h('span', { class: 'heart', 'aria-hidden': 'true' }, '♥'));
    return h('figure', {}, btn, h('figcaption', {}, st.name, h('small', {}, st.tags.slice(1).join('・'))));
  };
  bar.append(count, next);
  app.append(h('h1', { class: 'sr' }, '挑喜歡的風格'), h('div', { class: 'feed' }, ...PINS.map(pin)), bar);
  sync();
  (window.requestIdleCallback ?? setTimeout)(() => load3D().catch(() => {}));
};
const likedScores = () => [...S.liked].reduce((sc, id) => applySwipe(sc, id.split('-')[0], true), emptyScores());

/* ---- 2 3D 成品 ---- */
SCREENS[2] = () => {
  if (!S.cond.style) setStyle(pickStyle(likedScores()));
  if (!S.generated) return generating();
  const c = S.cond, current = look(), est = designEstimate(c, current);
  const stage = h('div', { class: 'scene', role: 'img', 'aria-label': S.mode === '3d' ? '3D 空間，可拖曳旋轉' : '寫實算圖' });
  const views = h('div', { class: 'seg', role: 'group', 'aria-label': '視角' }, ...['A', 'B', 'C'].map((v) => h('button', { 'aria-pressed': String(S.view === v), 'aria-label': '視角 ' + v,
    onclick: () => { S.view = v; live?.setView(v); [...views.children].forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === v))); } }, v)));
  const modes = h('div', { class: 'seg', role: 'group', 'aria-label': '顯示方式' }, ...[['3d', '即時 3D'], ['photo', '寫實圖']].map(([m, label]) =>
    h('button', { 'aria-pressed': String(S.mode === m), onclick: () => { S.mode = m; render(); } }, label)));
  const edit = (fn) => { S.versions.push({ label: `版本 ${S.versions.length + 1}`, look: fn({ ...look() }) }); S.v = S.versions.length - 1; S.mode = '3d'; render(); };
  app.append(h('div', { class: 'result' },
    h('div', { class: 'stagewrap' }, stage, h('div', { class: 'stagebar' }, modes, S.mode === '3d' ? views : null)),
    h('div', { class: 'panel' },
      h('div', { class: 'shead' }, backBtn(1), h('h1', {}, `${c.space}・${STYLES[c.style].name}`)),
      h('div', { class: 'tweak' }, h('b', {}, '換風格'),
        h('div', { class: 'chips' }, ...SWIPE_ORDER.map((k) => h('button', { class: 'chip', 'aria-pressed': String(c.style === k), onclick: () => { setStyle(k); render(); } }, STYLES[k].name)))),
      h('div', { class: 'tweak' }, h('b', {}, '改細節'),
        h('div', { class: 'chips' }, ...EDITS.map(([label, fn]) => h('button', { class: 'chip', onclick: () => edit(fn) }, label))),
        S.versions.length > 1 ? h('div', { class: 'chips versions' }, ...S.versions.map((v, i) => h('button', { class: 'chip ghost', 'aria-pressed': String(i === S.v), onclick: () => { S.v = i; render(); } }, v.label))) : null),
      h('p', { class: 'pricetag' }, '預估', h('b', { id: 'teaser' }, `${est.low}–${est.high} 萬`)),
      cta('看估價與施工圖', () => go(3)))));
  if (S.mode === 'photo') {
    stage.append(h('img', { class: 'photo', src: photo(c.style, 'wide'), alt: `${STYLES[c.style].name}寫實算圖` }),
      h('span', { class: 'hint' }, S.v ? '原始風格的算圖，不含你的修改' : '寫實算圖'));
    return;
  }
  const hint = h('span', { class: 'hint' }, '載入家具…');
  stage.append(hint);
  new MutationObserver((_, o) => { if (stage.dataset.ready) { hint.textContent = '拖曳旋轉'; o.disconnect(); } }).observe(stage, { attributes: true });
  load3D().then((m) => { if (S.step === 2 && stage.isConnected) { live = m.mountRoom3D(stage, current, S.view); window.__room = live; } })
    .catch(() => { stage.append(fromHTML(roomSVG(current, { label: '空間示意' }))); stage.querySelector('.hint').textContent = '這台裝置無法顯示 3D，改用示意圖'; });
};
function generating() {
  app.append(h('div', { class: 'gen', role: 'status' }, fromHTML(MASCOT), h('b', {}, `正在生成${STYLES[S.cond.style].name}的 3D…`)));
  // The only real wait is the 3D module; a short floor keeps the transition from flickering.
  const floor = new Promise((r) => setTimeout(r, reducedMotion() ? 0 : 700));
  Promise.all([load3D().catch(() => {}), floor]).then(() => { if (S.step === 2 && !S.generated) { S.generated = true; render(); } });
}

/* ---- 3 估價與施工圖 ---- */
SCREENS[3] = () => {
  const c = S.cond, current = look(), est = designEstimate(c, current);
  const max = Math.max(...est.items.map((i) => i.high));
  const setPing = (v) => { c.ping = String(Math.max(3, Math.min(60, v))); render(); };
  const money = h('div', { class: 'cardbox' },
    h('p', { class: 'note' }, `照這個設計做，預估花費`),
    h('p', { class: 'big', id: 'total' }, `${est.low}–${est.high} 萬`),
    h('div', { class: 'inline' },
      h('div', { class: 'stepper', role: 'group', 'aria-label': '坪數' },
        h('button', { 'aria-label': '減少坪數', onclick: () => setPing(resolvePing(c) - 1) }, '−'),
        h('output', { id: 'ping' }, `${est.ping} 坪${est.assumedPing ? '（預設）' : ''}`),
        h('button', { 'aria-label': '增加坪數', onclick: () => setPing(resolvePing(c) + 1) }, '＋')),
      ...AGES.map((a) => h('button', { class: 'chip', 'aria-pressed': String(c.age === a), onclick: () => { c.age = a; render(); } }, a))),
    h('ul', { class: 'items' }, ...est.items.map((i) => h('li', {}, h('b', {}, i.name), h('span', { class: 'amt' }, `${i.low}–${i.high} 萬`),
      h('small', {}, i.basis), h('span', { class: 'bar', 'aria-hidden': 'true' }, h('i', { style: `width:${(i.high / max) * 100}%` }))))),
    h('p', { class: 'note' }, '2025 參考行情，中等建材、不動格局；不含家電與設計監工費。'));

  const sheets = drawingSet(c, current, est, new Date().toISOString().slice(0, 10));
  const open = (s) => {
    if (!S.unlocked) return $('#unlock').showModal();
    $('#viewerBody').replaceChildren(fromHTML(s.svg)); $('#viewer').showModal();
  };
  const findings = ruleFindings({ ...c, ping: est.ping }, current);
  const drawings = h('div', { class: 'cardbox' + (S.unlocked ? '' : ' locked'), id: 'drawings' },
    h('div', { class: 'unlockrow' }, h('h2', {}, S.unlocked ? '施工圖包（已解鎖）' : '施工圖包'),
      S.unlocked ? null : h('span', { class: 'note' }, '6 張・付費後清晰可放大')),
    h('div', { class: 'sheets' }, ...sheets.map((s) => h('button', { class: 'sheetbtn', 'aria-label': `${s.title}${S.unlocked ? '，點擊放大' : '（未解鎖）'}`, onclick: () => open(s) },
      fromHTML(s.svg), h('span', { class: 'tag' }, s.title), S.unlocked ? null : h('span', { class: 'lock', 'aria-hidden': 'true' }, '🔒')))),
    h('details', { class: 'more' }, h('summary', {}, '施工前要確認的事'),
      h('ul', { class: 'cons' }, ...findings.filter((f) => f.state !== 'ok').map((f) => h('li', {}, h('i', { style: `background:${STATE_COLOR[f.state]}` }), h('span', {}, h('b', {}, `${f.title}（${STATES[f.state]}）`), '　', f.detail))))));
  app.append(h('div', { class: 'shead' }, backBtn(2), h('h1', {}, '估價與施工圖')),
    h('div', { class: 'two' }, money, drawings),
    ...(S.unlocked ? [] : [cta('解鎖施工圖包　NT$ 1,990', () => $('#unlock').showModal(), 'accent')]));
};
$('#payCancel').addEventListener('click', () => $('#unlock').close());
$('#payOk').addEventListener('click', () => { $('#unlock').close(); S.unlocked = true; if (S.step === 3) render(); });

render();
