// UI for the 快速找風格 prototype: 滑卡（Pinterest 靈感圖）→ 3D 成品 → 估價與施工圖.
// Decision logic lives in ./lib (pure, unit-tested); this file owns state, rendering and browser APIs.
import { STYLES, SWIPE_ORDER, emptyScores, applySwipe, pickStyle } from './lib/taste.js';
import { designEstimate, resolvePing } from './lib/estimate.js';
import { STATES, ruleFindings } from './lib/rules.js';
import { AGES } from './lib/intake.js';
import { drawingSet } from './lib/drawings.js';
import { MASCOT, roomSVG } from './lib/art.js';
import { PINS } from './lib/pins.js';
import { contextScore, pingFromDims, tighten } from './lib/context.js';
import { KINDS, ACCEPT, MAX_FILES, MAX_MB, guessKind, rejectReason, summarize } from './lib/docs.js';

// The 3D module (Three.js) is loaded on demand so the first screen stays light.
let room3d = null;
const load3D = () => (room3d ??= import('./lib/room3d.js'));
let live = null; // the mounted 3D room, disposed whenever the screen changes

/* ================= content ================= */
const STEPS = [null, { name: '滑卡' }, { name: '我家的條件' }, { name: '3D 成品' }, { name: '估價與施工圖' }];
// 18 cards, three per style; PINS is already interleaved so neighbouring cards differ.
const DECK = PINS.slice(0, 18);
const EDITS = [
  ['沙發換淺色', (l) => ({ ...l, sofa: '#cfc8bd', fabric: 'linen', sofaTex: 'poly_wool_herringbone' })],
  ['牆換暖白', (l) => ({ ...l, wall: '#f3ece0', wallType: undefined, wallTex: 'plastered_wall' })],
  ['地毯拿掉', (l) => ({ ...l, rug: null })],
  ['地板換深色', (l) => ({ ...l, floor: '#6b4a32', floorType: 'wood', floorTex: 'wood_floor' })],
];
const STATE_COLOR = { ok: '#5f7a6a', conflict: '#b5653a', missing: '#c9a77c', review: '#6f8fa8', na: '#8a7f72' };

/* ================= state ================= */
const fresh = () => ({
  step: 1, reached: 1, scores: emptyScores(), swiped: 0, liked: 0,
  cond: { space: '客廳', style: null, ping: '', len: '', wid: '', height: '', age: '新成屋', ageSet: false },
  docs: [], docError: '',
  versions: [], v: 0, view: 'A', generated: false, unlocked: false,
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
$('#restart').addEventListener('click', () => { S.docs.forEach((d) => d.url && URL.revokeObjectURL(d.url)); S = fresh(); go(1); });

const setStyle = (key) => { S.cond.style = key; S.versions = [{ label: '版本 1', look: { ...STYLES[key] } }]; S.v = 0; };
const look = () => S.versions[S.v].look;
// 估價：依設計逐項估，再依掌握度收窄區間
const knowledge = () => contextScore(S.cond, summarize(S.docs));
const estimateNow = () => tighten(designEstimate(S.cond, look()), knowledge().score);
const backBtn = (n) => h('button', { class: 'back', onclick: () => go(n) }, '‹ 上一步');

/* ================= screens ================= */
const SCREENS = [];

/* ---- 1 滑卡：一張一張看，右滑喜歡、左滑跳過 ---- */
SCREENS[1] = () => {
  const total = DECK.length;
  const deck = h('div', { class: 'deck', role: 'group', 'aria-label': '靈感卡片，右滑喜歡、左滑跳過' });
  const count = h('span', { class: 'count', 'aria-live': 'polite' });
  const skip = h('button', { class: 'link', id: 'skip', onclick: () => finish() });
  let busy = false;
  const finish = () => { setStyle(pickStyle(S.scores)); S.generated = false; go(2); };
  const makeCard = (p, depth) => {
    const st = STYLES[p.style];
    const card = h('div', { class: 'card', 'data-style': p.style, style: `transform:scale(${1 - depth * 0.04}) translateY(${depth * 12}px);z-index:${10 - depth}` },
      h('img', { src: p.src2x, alt: `${st.name}客廳`, draggable: 'false', referrerpolicy: 'no-referrer', onerror: () => card.classList.add('noimg') }),
      h('span', { class: 'stamp like' }, '喜歡'), h('span', { class: 'stamp nope' }, '跳過'),
      h('div', { class: 'meta' }, h('b', {}, st.name), h('div', { class: 'tags' }, ...st.tags.map((t) => h('span', {}, t)),
        h('a', { href: p.source, target: '_blank', rel: 'noopener noreferrer', onpointerdown: (e) => e.stopPropagation() }, '來源'))));
    return card;
  };
  const draw = () => {
    deck.replaceChildren(...DECK.slice(S.swiped, S.swiped + 3).map((p, i) => makeCard(p, i)).reverse());
    count.textContent = `${Math.min(S.swiped + 1, total)} / ${total}`;
    skip.textContent = S.liked ? '夠了，直接看 3D' : '跳過，直接看 3D';
    const top = deck.lastElementChild;
    if (top) drag(top);
  };
  const decide = (liked, card = deck.lastElementChild) => {
    if (busy || !card) return;
    busy = true;
    S.scores = applySwipe(S.scores, card.dataset.style, liked);
    S.swiped += 1; S.liked += liked ? 1 : 0;
    warm3D();
    card.querySelector(liked ? '.like' : '.nope').style.opacity = 1;
    card.style.transition = 'transform .28s ease-in, opacity .28s';
    card.style.transform = `translateX(${liked ? 130 : -130}%) rotate(${liked ? 18 : -18}deg)`;
    card.style.opacity = 0;
    setTimeout(() => { busy = false; if (S.step !== 1) return; if (S.swiped >= total) finish(); else draw(); }, reducedMotion() ? 0 : 260);
  };
  function drag(card) {
    let x0 = null, dx = 0;
    card.addEventListener('pointerdown', (e) => { if (busy) return; x0 = e.clientX; dx = 0; card.setPointerCapture(e.pointerId); card.style.transition = 'none'; });
    card.addEventListener('pointermove', (e) => {
      if (x0 === null) return;
      dx = e.clientX - x0;
      card.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
      card.querySelector('.like').style.opacity = Math.max(0, Math.min(1, dx / 90));
      card.querySelector('.nope').style.opacity = Math.max(0, Math.min(1, -dx / 90));
    });
    const up = () => {
      if (x0 === null) return;
      x0 = null;
      if (Math.abs(dx) > Math.min(110, card.clientWidth * 0.28)) return decide(dx > 0, card);
      card.style.transition = 'transform .2s'; card.style.transform = '';
      card.querySelectorAll('.stamp').forEach((s) => { s.style.opacity = 0; });
    };
    card.addEventListener('pointerup', up); card.addEventListener('pointercancel', up);
  }
  const onKey = (e) => { if (S.step !== 1) return document.removeEventListener('keydown', onKey); if (e.key === 'ArrowRight') decide(true); if (e.key === 'ArrowLeft') decide(false); };
  document.addEventListener('keydown', onKey);
  // warm the next few images so a swipe never reveals an empty card
  const preload = () => DECK.slice(S.swiped + 3, S.swiped + 6).forEach((p) => { const i = new Image(); i.referrerPolicy = 'no-referrer'; i.src = p.src2x; });
  draw(); preload();
  deck.addEventListener('transitionend', preload);
  app.append(h('h1', { class: 'sr' }, '滑卡挑風格'), deck,
    h('div', { class: 'swipebar' },
      h('button', { class: 'round nope', 'aria-label': '不喜歡', onclick: () => decide(false) }, '✕'), count,
      h('button', { class: 'round like', 'aria-label': '喜歡', onclick: () => decide(true) }, '♥')),
    skip);
  (window.requestIdleCallback ?? setTimeout)(warm3D);
};
// While the user swipes, fetch the 3D code and the furniture of whichever style is currently winning.
const warm3D = () => load3D().then((m) => m.preload(STYLES[pickStyle(S.scores)])).catch(() => {});

/* ---- 2 我家的圖：格局圖、平面圖、機電圖（選填） ---- */
SCREENS[2] = () => {
  const add = (files) => {
    S.docError = '';
    for (const f of files) {
      const why = rejectReason(f, S.docs.length);
      if (why) { S.docError = why; continue; }
      S.docs.push({ name: f.name, kind: guessKind(f.name, f.type), pdf: f.type === 'application/pdf', url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null });
    }
    render();
  };
  const input = h('input', { type: 'file', id: 'docFile', class: 'sr', accept: ACCEPT, multiple: true, onchange: (e) => { add([...e.target.files]); } });
  const drop = h('label', { for: 'docFile', class: 'drop', id: 'drop',
    ondragover: (e) => { e.preventDefault(); drop.classList.add('over'); }, ondragleave: () => drop.classList.remove('over'),
    ondrop: (e) => { e.preventDefault(); add([...e.dataTransfer.files]); } },
    h('b', {}, '＋ 選擇檔案，或拖曳到這裡'), h('span', {}, `格局圖、平面圖、機電圖・圖片或 PDF・最多 ${MAX_FILES} 份、每份 ${MAX_MB}MB`));
  const list = h('ul', { class: 'docs' }, ...S.docs.map((d, i) => h('li', {},
    d.url ? h('img', { src: d.url, alt: '' }) : h('span', { class: 'pdf', 'aria-hidden': 'true' }, 'PDF'),
    h('div', { class: 'docmeta' }, h('b', {}, d.name),
      h('div', { class: 'chips' }, ...Object.entries(KINDS).map(([k, label]) => h('button', { class: 'chip', 'aria-pressed': String(d.kind === k), onclick: () => { d.kind = k; render(); } }, label)))),
    h('button', { class: 'rm', 'aria-label': `移除 ${d.name}`, onclick: () => { if (d.url) URL.revokeObjectURL(d.url); S.docs.splice(i, 1); render(); } }, '×'))));
  const c = S.cond, k = knowledge(), pct = Math.round(k.score * 100);
  const field = (key, label, unit, attrs = {}) => h('label', { class: 'field' }, h('span', {}, label),
    h('input', { type: 'number', inputmode: 'decimal', min: 0, step: 'any', value: c[key], id: 'f-' + key, placeholder: '—', ...attrs,
      onchange: (e) => {
        c[key] = e.target.value;
        const p = pingFromDims(c.len, c.wid);
        if (key !== 'ping' && p) c.ping = String(p);          // 有長寬就以長寬為準
        if (key === 'ping') { c.len = ''; c.wid = ''; }
        render();
      } }), h('em', {}, unit));
  app.append(h('div', { class: 'shead' }, backBtn(1), h('h1', {}, '多告訴我一點你家'), h('p', { class: 'lead' }, '都是選填。給得越多，估價區間越窄、圖面尺寸越準。')),
    h('div', { class: 'meter', role: 'group', 'aria-label': '掌握度' },
      h('div', { class: 'row between' }, h('b', { id: 'score' }, `掌握度 ${pct}%`), h('span', { class: 'note' }, pct ? `估價區間收窄 ${Math.round(k.score * 50)}%` : '目前用預設值估算')),
      h('div', { class: 'bar' }, h('i', { style: `width:${pct}%` })),
      h('div', { class: 'chips' }, ...k.items.map((i) => h('span', { class: 'tick' + (i.done ? ' done' : '') }, (i.done ? '✓ ' : '＋ ') + i.label)))),
    h('div', { class: 'cardbox' }, h('b', {}, '空間'),
      h('div', { class: 'fields' }, field('ping', '坪數', '坪', { max: 200 }), field('len', '長', '公尺', { max: 30 }), field('wid', '寬', '公尺', { max: 30 }), field('height', '天花板高', '公尺', { max: 6 })),
      h('div', { class: 'inline' }, h('span', { class: 'note' }, '屋況'), ...AGES.map((a) => h('button', { class: 'chip', 'aria-pressed': String(c.ageSet && c.age === a), onclick: () => { c.age = a; c.ageSet = true; render(); } }, a)))),
    h('div', { class: 'cardbox' }, h('b', {}, '圖面'), input, drop,
      S.docError ? h('p', { class: 'err', role: 'alert' }, S.docError) : h('span', { hidden: true }),
      S.docs.length ? list : h('span', { hidden: true }),
      h('p', { class: 'note' }, '原型階段：檔案只留在你的瀏覽器，不會上傳，也還不會自動判讀內容。')),
    cta(pct ? '生成 3D' : '先跳過，生成 3D', () => { S.generated = false; go(3); }, pct ? 'accent' : ''));
};

/* ---- 3 3D 成品 ---- */
SCREENS[3] = () => {
  if (!S.cond.style) setStyle(pickStyle(S.scores));
  if (!S.generated) return generating();
  const c = S.cond, current = look(), est = estimateNow();
  const stage = h('div', { class: 'scene', role: 'img', 'aria-label': '3D 空間，可拖曳旋轉' });
  const views = h('div', { class: 'seg', role: 'group', 'aria-label': '視角' }, ...['A', 'B', 'C'].map((v) => h('button', { 'aria-pressed': String(S.view === v), 'aria-label': '視角 ' + v,
    onclick: () => { S.view = v; live?.setView(v); [...views.children].forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === v))); } }, v)));
  const edit = (fn) => { S.versions.push({ label: `版本 ${S.versions.length + 1}`, look: fn({ ...look() }) }); S.v = S.versions.length - 1; render(); };
  app.append(h('div', { class: 'result' },
    h('div', { class: 'stagewrap' }, stage, h('div', { class: 'stagebar' }, views)),
    h('div', { class: 'panel' },
      h('div', { class: 'shead' }, backBtn(2), h('h1', {}, `${c.space}・${STYLES[c.style].name}`)),
      h('div', { class: 'tweak' }, h('b', {}, '換風格'),
        h('div', { class: 'chips' }, ...SWIPE_ORDER.map((k) => h('button', { class: 'chip', 'aria-pressed': String(c.style === k), onclick: () => { setStyle(k); render(); } }, STYLES[k].name)))),
      h('div', { class: 'tweak' }, h('b', {}, '改細節'),
        h('div', { class: 'chips' }, ...EDITS.map(([label, fn]) => h('button', { class: 'chip', onclick: () => edit(fn) }, label))),
        S.versions.length > 1 ? h('div', { class: 'chips versions' }, ...S.versions.map((v, i) => h('button', { class: 'chip ghost', 'aria-pressed': String(i === S.v), onclick: () => { S.v = i; render(); } }, v.label))) : null),
      h('p', { class: 'note', id: 'ctx' }, `掌握度 ${Math.round(knowledge().score * 100)}%・${est.ping} 坪${est.assumedPing ? '（預設）' : ''}${c.len && c.wid ? `・${c.len}×${c.wid} 公尺` : ''}。3D 目前是示意格局，尚未依你家的尺寸變形。`, ' ', h('button', { class: 'link', onclick: () => go(2) }, '補條件')),
      h('p', { class: 'pricetag' }, '預估', h('b', { id: 'teaser' }, `${est.low}–${est.high} 萬`)),
      cta('看估價與施工圖', () => go(4)))));
  stage.append(h('span', { class: 'hint' }, '拖曳旋轉'));
  load3D().then((m) => { if (S.step === 3 && stage.isConnected) { live = m.mountRoom3D(stage, current, S.view); window.__room = live; } })
    .catch(() => { stage.append(fromHTML(roomSVG(current, { label: '空間示意' }))); stage.querySelector('.hint').textContent = '這台裝置無法顯示 3D，改用示意圖'; });
};
function generating() {
  app.append(h('div', { class: 'gen', role: 'status' }, fromHTML(MASCOT), h('b', {}, `正在生成${STYLES[S.cond.style].name}的 3D…`)));
  // The only real wait is the 3D module; a short floor keeps the transition from flickering.
  const floor = new Promise((r) => setTimeout(r, reducedMotion() ? 0 : 700));
  Promise.all([load3D().catch(() => {}), floor]).then(() => { if (S.step === 3 && !S.generated) { S.generated = true; render(); } });
}

/* ---- 4 估價與施工圖 ---- */
SCREENS[4] = () => {
  const c = S.cond, current = look(), est = estimateNow(), k = knowledge();
  const max = Math.max(...est.items.map((i) => i.high));
  const setPing = (v) => { c.ping = String(Math.max(3, Math.min(60, Math.round(v)))); c.len = ''; c.wid = ''; render(); };
  const money = h('div', { class: 'cardbox' },
    h('p', { class: 'note' }, `照這個設計做，預估花費`),
    h('p', { class: 'note', id: 'know' }, `掌握度 ${Math.round(k.score * 100)}%${est.narrowed ? `，區間已收窄 ${Math.round(est.narrowed * 100)}%` : ''}。`, ' ', h('button', { class: 'link', onclick: () => go(2) }, k.score < 1 ? '補條件讓它更準' : '修改條件')),
    h('p', { class: 'big', id: 'total' }, `${est.low}–${est.high} 萬`),
    h('div', { class: 'inline' },
      h('div', { class: 'stepper', role: 'group', 'aria-label': '坪數' },
        h('button', { 'aria-label': '減少坪數', onclick: () => setPing(resolvePing(c) - 1) }, '−'),
        h('output', { id: 'ping' }, `${est.ping} 坪${est.assumedPing ? '（預設）' : ''}`),
        h('button', { 'aria-label': '增加坪數', onclick: () => setPing(resolvePing(c) + 1) }, '＋')),
      ...AGES.map((a) => h('button', { class: 'chip', 'aria-pressed': String(c.age === a), onclick: () => { c.age = a; c.ageSet = true; render(); } }, a))),
    h('ul', { class: 'items' }, ...est.items.map((i) => h('li', {}, h('b', {}, i.name), h('span', { class: 'amt' }, `${i.low}–${i.high} 萬`),
      h('small', {}, i.basis), h('span', { class: 'bar', 'aria-hidden': 'true' }, h('i', { style: `width:${(i.high / max) * 100}%` }))))),
    h('p', { class: 'note' }, '2025 參考行情，中等建材、不動格局；不含家電與設計監工費。'));

  const sheets = drawingSet(c, current, est, new Date().toISOString().slice(0, 10));
  const open = (s) => {
    if (!S.unlocked) return $('#unlock').showModal();
    $('#viewerBody').replaceChildren(fromHTML(s.svg)); $('#viewer').showModal();
  };
  const docs = summarize(S.docs);
  const findings = ruleFindings({ ...c, ping: est.ping }, current, docs);
  const drawings = h('div', { class: 'cardbox' + (S.unlocked ? '' : ' locked'), id: 'drawings' },
    h('div', { class: 'unlockrow' }, h('h2', {}, S.unlocked ? '施工圖包（已解鎖）' : '施工圖包'),
      S.unlocked ? null : h('span', { class: 'note' }, '6 張・付費後清晰可放大')),
    h('p', { class: 'note', id: 'docsnote' }, docs.total ? `已附 ${docs.text}。圖面尺寸${c.len && c.wid ? '用你給的長寬' : '依坪數換算'}，格局仍是示意，尚未依你的圖繪製。` : `圖面尺寸${c.len && c.wid ? '用你給的長寬' : '依坪數換算'}，格局是示意。`),
    h('div', { class: 'sheets' }, ...sheets.map((s) => h('button', { class: 'sheetbtn', 'aria-label': `${s.title}${S.unlocked ? '，點擊放大' : '（未解鎖）'}`, onclick: () => open(s) },
      fromHTML(s.svg), h('span', { class: 'tag' }, s.title), S.unlocked ? null : h('span', { class: 'lock', 'aria-hidden': 'true' }, '🔒')))),
    h('details', { class: 'more' }, h('summary', {}, '施工前要確認的事'),
      h('ul', { class: 'cons' }, ...findings.filter((f) => f.state !== 'ok').map((f) => h('li', {}, h('i', { style: `background:${STATE_COLOR[f.state]}` }), h('span', {}, h('b', {}, `${f.title}（${STATES[f.state]}）`), '　', f.detail))))));
  app.append(h('div', { class: 'shead' }, backBtn(3), h('h1', {}, '估價與施工圖')),
    h('div', { class: 'two' }, money, drawings),
    ...(S.unlocked ? [] : [cta('解鎖施工圖包　NT$ 1,990', () => $('#unlock').showModal(), 'accent')]));
};
$('#payCancel').addEventListener('click', () => $('#unlock').close());
$('#payOk').addEventListener('click', () => { $('#unlock').close(); S.unlocked = true; if (S.step === 4) render(); });

render();
