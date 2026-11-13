// UI for the 快速找風格 prototype: 滑卡（Pinterest 靈感圖）→ 3D 成品 → 估價與施工圖.
// Decision logic lives in ./lib (pure, unit-tested); this file owns state, rendering and browser APIs.
import { STYLES, SWIPE_ORDER, REASONS, emptyScores, applySwipe, undoSwipe, pickStyle, topStyles } from './lib/taste.js';
import { designEstimate, resolvePing } from './lib/estimate.js';
import { STATES, ruleFindings } from './lib/rules.js';
import { AGES, parseHome } from './lib/intake.js';
import { drawingSet } from './lib/drawings.js';
import { roomSize } from './lib/layout.js';
import { MASCOT, roomSVG } from './lib/art.js';
import { PINS } from './lib/pins.js';
import { contextScore, pingFromDims, tighten, aboutThisHome, missingForHome, fieldError } from './lib/context.js';
import { KEY, serialize, restore, toShare, fromShare } from './lib/persist.js';
import { KINDS, ACCEPT, MAX_FILES, MAX_MB, guessKind, rejectReason, summarize } from './lib/docs.js';

// The 3D module (Three.js) is loaded on demand so the first screen stays light.
let room3d = null;
const load3D = () => (room3d ??= import('./lib/room3d.js'));
let live = null; // the mounted 3D room, disposed whenever the screen changes

/* ================= content ================= */
const STEPS = [null, { name: '滑卡' }, { name: '我家的條件' }, { name: '3D 示意' }, { name: '估價與施工圖初稿' }];
// 18 cards, three per style; PINS is already interleaved so neighbouring cards differ.
const DECK = PINS.slice(0, 18);
const EDITS = [
  ['沙發換淺色', (l) => ({ ...l, sofa: '#cfc8bd', fabric: 'linen', sofaTex: 'poly_wool_herringbone' })],
  ['牆換暖白', (l) => ({ ...l, wall: '#f3ece0', wallType: undefined, wallTex: 'plastered_wall' })],
  ['地毯拿掉', (l) => ({ ...l, rug: null })],
  ['地板換深色', (l) => ({ ...l, floor: '#6b4a32', floorType: 'wood', floorTex: 'wood_floor' })],
];
// 空間範圍：先做客廳與臥室，其餘先列出來讓人知道會有
const SPACE_OPTIONS = [['客廳', true], ['臥室', true], ['廚房', false], ['衛浴', false], ['全室', false]];
const VIEW_NAMES = { A: '斜角', B: '正面', C: '側面' };
const STATE_COLOR = { ok: '#5f7a6a', conflict: '#b5653a', missing: '#b08a4f', review: '#5f7f99', action: '#a8452a', na: '#8a7f72' };

/* ================= state ================= */
const fresh = () => ({
  step: 1, reached: 1, scores: emptyScores(), swiped: 0, liked: 0,
  cond: { space: '客廳', style: null, ping: '', len: '', wid: '', height: '', age: '新成屋', ageSet: false, floors: '', partition: '', noFurniture: false },
  docs: [], docError: '', said: '', heard: null, history: [], reasons: [],
  versions: [], v: 0, view: 'A', generated: false, unlocked: false,
  bad: {},   // 填錯的欄位：{ 欄位: { value, msg } }，不存檔
});
// 進度存在這台瀏覽器：重整頁面不會從頭來（上傳的檔案除外）
const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const save = () => { try { localStorage.setItem(KEY, serialize(S)); } catch { /* 私密模式或空間滿了：不存也能用 */ } };
let S = restore(stored(), fresh());
S.bad ??= {};

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
    return h('li', {}, h('button', { class: state, disabled: n > S.reached, 'aria-current': n === S.step ? 'step' : false, 'aria-label': `第 ${n} 步：${STEPS[n].name}`, onclick: () => go(n) },
      h('span', { class: 'n' }, String(n)), h('span', { class: 't' }, s.name)));
  }));
  $('#restart').hidden = S.reached === 1;
  live?.dispose(); live = null;
  // 重畫後把鍵盤焦點放回同一個位置（同一步內），用 Tab 操作的人不會被丟回頁首
  const FOCUSABLE = 'button:not(:disabled),input,textarea,a[href]';
  const at = Number(app.dataset.step) === S.step ? [...app.querySelectorAll(FOCUSABLE)].indexOf(document.activeElement) : -1;
  pending = false;
  app.replaceChildren();
  app.dataset.step = S.step;
  SCREENS[S.step]();
  if (at >= 0) app.querySelectorAll(FOCUSABLE)[at]?.focus({ preventScroll: true });
  save();
}
// 欄位改完會重畫整頁。如果這時手指或滑鼠正按在某個按鈕上，馬上重畫會把那顆按鈕換掉、那一下就落空，
// 所以等放開（click 送出）之後再畫。
let pressing = false, pending = false;
addEventListener('pointerdown', () => { pressing = true; }, true);
for (const type of ['pointerup', 'pointercancel']) addEventListener(type, () => setTimeout(() => { pressing = false; if (pending) render(); }, 0), true);
const renderSoon = () => { pending = true; if (!pressing) setTimeout(() => { if (pending) render(); }, 0); };
$('#restart').addEventListener('click', () => { S.docs.forEach((d) => d.url && URL.revokeObjectURL(d.url)); try { localStorage.removeItem(KEY); } catch { /* ignore */ } S = fresh(); go(1); });

const setStyle = (key) => { S.cond.style = key; S.versions = [{ look: { ...STYLES[key] }, edits: [] }]; S.v = 0; };
const look = () => S.versions[S.v].look;
// 估價：依設計逐項估，再依掌握度收窄區間
const knowledge = () => contextScore(S.cond, summarize(S.docs));
const estimateNow = () => tighten(designEstimate(S.cond, look()), knowledge().score);
// 分享：把目前的風格、修改與條件編進網址，對方打開就看到同一個結果（不含上傳的檔案與解鎖）
const shareBtn = () => {
  const btn = h('button', { class: 'link', id: 'share', onclick: async () => {
    const url = `${location.origin}${location.pathname}#${toShare(S)}`;
    try { await navigator.clipboard.writeText(url); btn.textContent = '已複製連結'; }
    catch { prompt('複製這個連結', url); }
    setTimeout(() => { btn.textContent = '複製分享連結'; }, 2400);
  } }, '複製分享連結');
  return btn;
};
const backBtn = (n) => h('button', { class: 'back', onclick: () => go(n) }, '‹ 上一步');

/* ================= screens ================= */
const SCREENS = [];

/* ---- 1 滑卡：一張一張看，右滑喜歡、左滑跳過 ---- */
SCREENS[1] = () => {
  const total = DECK.length;
  const deck = h('div', { class: 'deck', role: 'group', 'aria-label': '靈感卡片，右滑喜歡、左滑跳過' });
  const count = h('span', { class: 'count', 'aria-live': 'polite' });
  const skip = h('button', { class: 'link', id: 'skip', onclick: () => finish() });
  const undo = h('button', { class: 'link', id: 'undo', onclick: () => {
    if (busy) return;
    const last = S.history.pop();
    if (!last) return;
    S.scores = undoSwipe(S.scores, last[0], last[1]); S.swiped -= 1; S.liked -= last[1] ? 1 : 0;
    save(); draw();
  } }, '↩ 撤回上一張');
  // 選填：喜歡它的什麼。留給設計師參考，不影響 3D。
  const why = h('div', { class: 'why', id: 'why' });
  const drawWhy = () => why.replaceChildren(...(S.history.at(-1)?.[1] ? [h('span', { class: 'note' }, '喜歡它的什麼？（選填）'),
    ...REASONS.map((r) => h('button', { class: 'chip', 'aria-pressed': String(S.reasons.includes(r)), onclick: () => { S.reasons = S.reasons.includes(r) ? S.reasons.filter((x) => x !== r) : [...S.reasons, r]; save(); drawWhy(); } }, r))] : []));
  let busy = false;
  const finish = () => { setStyle(pickStyle(S.scores)); S.generated = false; go(2); };
  const makeCard = (p, depth) => {
    const st = STYLES[p.style];
    const card = h('div', { class: 'card', 'data-style': p.style, style: `transform:scale(${1 - depth * 0.04}) translateY(${depth * 12}px);z-index:${10 - depth}` },
      h('img', { src: p.src, srcset: `${p.src} 474w, ${p.src2x} 736w`, sizes: '(max-width: 520px) 92vw, 480px', alt: `${st.name}客廳`, draggable: 'false', referrerpolicy: 'no-referrer',
        fetchpriority: depth === 0 ? 'high' : 'low', decoding: 'async', onerror: () => card.classList.add('noimg') }),
      h('span', { class: 'stamp like' }, '喜歡'), h('span', { class: 'stamp nope' }, '跳過'),
      h('div', { class: 'meta' }, h('b', {}, st.name), h('div', { class: 'tags' }, ...st.tags.map((t) => h('span', {}, t)),
        h('a', { href: p.source, target: '_blank', rel: 'noopener noreferrer', onpointerdown: (e) => e.stopPropagation() }, '來源'))));
    return card;
  };
  const draw = () => {
    deck.replaceChildren(...DECK.slice(S.swiped, S.swiped + 3).map((p, i) => makeCard(p, i)).reverse());
    count.textContent = `${Math.min(S.swiped + 1, total)} / ${total}`;
    skip.textContent = S.liked ? '夠了，下一步' : '跳過選風格';
    undo.hidden = !S.history.length;
    drawWhy();
    const top = deck.lastElementChild;
    if (top) drag(top);
  };
  const decide = (liked, card = deck.lastElementChild) => {
    if (busy || !card) return;
    busy = true;
    S.scores = applySwipe(S.scores, card.dataset.style, liked);
    S.history.push([card.dataset.style, liked]);
    S.swiped += 1; S.liked += liked ? 1 : 0;
    save();
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
  draw();
  (window.requestIdleCallback ?? setTimeout)(preload);   // 等第一張顯示後才去暖後面幾張
  deck.addEventListener('transitionend', preload);
  app.append(h('h1', { class: 'sr' }, '滑卡挑風格'), deck,
    h('div', { class: 'swipebar' },
      h('button', { class: 'round nope', 'aria-label': '不喜歡', onclick: () => decide(false) }, '✕'), count,
      h('button', { class: 'round like', 'aria-label': '喜歡', onclick: () => decide(true) }, '♥')),
    why,
    h('div', { class: 'inline', style: 'justify-content:center;gap:18px' }, undo, skip));
};
// Fetch the 3D code and the chosen style's furniture. Called once the user reaches 我家的條件, so the
// swipe screen's own images are never competing with it for bandwidth.
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
    S.lostDocs = false;
    render();
  };
  const input = h('input', { type: 'file', id: 'docFile', class: 'sr', accept: ACCEPT, multiple: true, onchange: (e) => { add([...e.target.files]); } });
  const drop = h('label', { for: 'docFile', class: 'drop', id: 'drop',
    ondragover: (e) => { e.preventDefault(); drop.classList.add('over'); }, ondragleave: () => drop.classList.remove('over'),
    ondrop: (e) => { e.preventDefault(); add([...e.dataTransfer.files]); } },
    h('b', {}, '＋ 選擇檔案，或拖曳到這裡'), h('span', {}, `格局圖、平面圖、機電圖、現況照片・圖片或 PDF・最多 ${MAX_FILES} 份、每份 ${MAX_MB}MB`));
  const list = h('ul', { class: 'docs' }, ...S.docs.map((d, i) => h('li', {},
    d.url ? h('img', { src: d.url, alt: '' }) : h('span', { class: 'pdf', 'aria-hidden': 'true' }, 'PDF'),
    h('div', { class: 'docmeta' }, h('b', {}, d.name),
      h('div', { class: 'chips' }, ...Object.entries(KINDS).map(([k, label]) => h('button', { class: 'chip', 'aria-pressed': String(d.kind === k), onclick: () => { d.kind = k; render(); } }, label)))),
    h('button', { class: 'rm', 'aria-label': `移除 ${d.name}`, onclick: () => { if (d.url) URL.revokeObjectURL(d.url); S.docs.splice(i, 1); render(); } }, '×'))));
  const c = S.cond, k = knowledge(), pct = Math.round(k.score * 100);
  if (!c.style) setStyle(pickStyle(S.scores));
  warm3D();
  // 用說的（或打一句話）：聽得出來的欄位直接填進下面，其餘不動
  const LABEL = { space: ['空間', ''], ping: ['坪數', '坪'], len: ['長', '公尺'], wid: ['寬', '公尺'], height: ['天花板高', '公尺'], age: ['屋況', ''], floors: ['建物總樓層', '層'], partition: ['隔間', ''] };
  const applySaid = (text) => {
    S.said = text.trim();
    if (!S.said) { S.heard = null; return renderSoon(); }
    const got = parseHome(S.said);
    S.heard = Object.entries(got).sort(([a], [b]) => (b === 'space') - (a === 'space')).map(([key, v]) => `${LABEL[key][0]} ${key === 'partition' ? (v === 'yes' ? '會動' : '不動') : v}${LABEL[key][1] ? ' ' + LABEL[key][1] : ''}`);
    const space = got.space; delete got.space;
    const ready = SPACE_OPTIONS.find(([name]) => name === space)?.[1];
    if (space && ready && space !== c.space) { c.space = space; S.generated = false; }
    for (const key of NUMERIC) if (key in got) setField(key, got[key]);
    if (got.age) { c.age = got.age; c.ageSet = true; }
    if (got.partition) c.partition = got.partition;
    const p = pingFromDims(c.len, c.wid);
    if (p && (got.len || got.wid)) {
      c.ping = String(p); delete S.bad.ping;
      if (got.ping && Number(got.ping) !== p) S.heard.push(`坪數依長寬換算為 ${p} 坪`);
    }
    if (space && !ready) S.heard.push(`${space}還沒開放，先用${c.space}示範`);
    renderSoon();
  };
  // 一個欄位的值：合理就收下，不合理就留在欄位上並說明原因（不拿去算）
  const NUMERIC = ['ping', 'len', 'wid', 'height', 'floors'];
  const setField = (key, value) => {
    const msg = fieldError(key, value);
    if (msg) { S.bad[key] = { value: String(value), msg }; c[key] = ''; } else { delete S.bad[key]; c[key] = String(value).trim(); }
    return !msg;
  };
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const say = h('textarea', { id: 'say', rows: 2, placeholder: '例：客廳大概 8 坪，長 5 米 6、寬 4 米 7，中古屋', 'aria-label': '用一句話描述你家',
    onchange: (e) => { if (e.target.value.trim() !== S.said) applySaid(e.target.value); },
    // Enter 直接送出；Shift+Enter 換行；注音／拼音選字中的 Enter 不算
    onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); applySaid(say.value); } } }, S.said);
  const send = h('button', { class: 'send', id: 'saysend', 'aria-label': '送出這句話', onclick: () => applySaid(say.value) }, '送出');
  const micLabel = h('span', { class: 'note', id: 'micnote', 'aria-live': 'polite' },
    S.heard === null ? (Recognition ? '按麥克風用說的，或直接打一句話' : '這個瀏覽器不支援語音，請直接打一句話')
      : S.heard.length ? `聽到：${S.heard.join('、')}` : '沒聽出坪數或尺寸，可以再說一次，或直接填下面');
  let rec = null;
  const mic = h('button', { class: 'mic', id: 'mic', 'aria-label': '用說的', 'aria-pressed': 'false', disabled: !Recognition,
    onclick: () => {
      if (rec) return rec.stop();
      rec = new Recognition(); rec.lang = 'zh-TW'; rec.interimResults = true;
      mic.setAttribute('aria-pressed', 'true'); micLabel.textContent = '正在聽…說完再按一次';
      rec.onresult = (e) => { say.value = [...e.results].map((r) => r[0].transcript).join(''); };
      rec.onerror = (e) => { rec = null; mic.setAttribute('aria-pressed', 'false'); micLabel.textContent = e.error === 'not-allowed' ? '沒有麥克風權限，請直接打一句話' : '沒聽清楚，再試一次或直接打字'; };
      rec.onend = () => { if (!rec) return; rec = null; if (S.step === 2) applySaid(say.value); };
      rec.start();
    } }, fromHTML('<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'));
  const field = (key, label, unit, attrs = {}) => h('label', { class: 'field' }, h('span', {}, label),
    h('input', { type: 'number', inputmode: 'decimal', step: 'any', value: S.bad[key]?.value ?? c[key], id: 'f-' + key, placeholder: '—', ...attrs,
      'aria-invalid': S.bad[key] ? 'true' : false, 'aria-describedby': S.bad[key] ? 'e-' + key : false,
      onchange: (e) => {
        const ok = setField(key, e.target.value);
        const p = pingFromDims(c.len, c.wid);
        if (key !== 'ping' && p) { c.ping = String(p); delete S.bad.ping; }   // 有長寬就以長寬為準
        if (key === 'ping' && ok && c.ping) { c.len = ''; c.wid = ''; delete S.bad.len; delete S.bad.wid; }
        renderSoon();
      } }), h('em', {}, unit));
  const errors = (...keys) => keys.filter((key) => S.bad[key]).map((key) => h('p', { class: 'err', role: 'alert', id: 'e-' + key }, S.bad[key].msg));
  const dimsPing = pingFromDims(c.len, c.wid);
  const start = () => {
    const wrong = NUMERIC.find((key) => S.bad[key]);
    if (!wrong) { S.generated = false; return go(3); }
    render();                                   // 有填錯的欄位：不前進，帶到那一格並說明原因
    const el = $('#f-' + wrong); el.focus(); el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  };
  app.append(h('div', { class: 'shead' }, backBtn(1), h('h1', {}, '多告訴我一點你家'), h('p', { class: 'lead' }, '都是選填。你填的尺寸和條件會直接改變 3D、圖面和估價。')),
    (() => {
      const top = topStyles(S.scores), names = (ks) => ks.map((k) => STYLES[k].name).join('、'), pick = (k) => h('button', { class: 'chip', 'aria-pressed': String(c.style === k), onclick: () => { setStyle(k); S.generated = false; render(); } }, STYLES[k].name);
      return h('div', { class: 'taste', id: 'taste' },
        h('span', {}, !top.liked ? `還沒滑到喜歡的，先用${STYLES[top.first].name}。`
          : top.top.length > 1 ? `${names(top.top)}你一樣喜歡，先用${STYLES[c.style].name}做，下面可以換。`
            : top.also.length ? `你喜歡的是${names(top.top)}，也有一點${names(top.also)}。` : `你喜歡的是${names(top.top)}。`,
          S.reasons.length ? `在意的是${S.reasons.join('、')}。` : '', '要做哪一種？'),
        h('div', { class: 'chips', role: 'group', 'aria-label': '要做的風格' }, ...SWIPE_ORDER.map(pick)),
        h('span', {}, '要做哪個空間？'),
        h('div', { class: 'chips', role: 'group', 'aria-label': '要做的空間', id: 'spaces' }, ...SPACE_OPTIONS.map(([name, ready]) => h('button', { class: 'chip', disabled: !ready, 'aria-pressed': String(c.space === name),
          onclick: () => { if (c.space === name) return; c.space = name; S.generated = false; render(); } }, ready ? name : `${name}（之後）`))),
        c.space !== '客廳' ? h('span', { class: 'note', id: 'spacenote' }, `滑卡的圖是客廳，只用來抓風格；${c.space}會用同一種風格來配。`) : null);
    })(),
    h('div', { class: 'voice' }, mic, h('div', { class: 'voicebody' }, say, micLabel), send),
    Recognition ? h('p', { class: 'note', id: 'micprivacy' }, '按下麥克風後，聲音由瀏覽器的語音辨識服務處理，可能會傳送到瀏覽器供應商（例如 Google 或 Apple）。不想的話直接打字。') : null,
    h('div', { class: 'meter', role: 'group', 'aria-label': '掌握度' },
      h('div', { class: 'row between' }, h('b', { id: 'score' }, `掌握度 ${pct}%`), h('span', { class: 'note' }, pct ? `估價區間收窄 ${Math.round(k.score * 50)}%` : '目前用預設值估算')),
      h('div', { class: 'bar' }, h('i', { style: `width:${pct}%` })),
      h('div', { class: 'chips' }, ...k.items.map((i) => h('span', { class: 'tick' + (i.done ? ' done' : '') }, (i.done ? '✓ ' : '＋ ') + i.label)))),
    h('div', { class: 'cardbox' }, h('b', {}, '空間'),
      h('div', { class: 'fields' }, field('ping', '坪數', '坪'), field('len', '長', '公尺'), field('wid', '寬', '公尺'), field('height', '天花板高', '公尺')),
      ...errors('ping', 'len', 'wid', 'height'),
      dimsPing ? h('p', { class: 'note', id: 'pingnote' }, `坪數依長 × 寬換算：${c.len} × ${c.wid} 公尺 ≈ ${dimsPing} 坪。`) : null,
      h('div', { class: 'inline' }, h('span', { class: 'note' }, '屋況'), ...AGES.map((a) => h('button', { class: 'chip', 'aria-pressed': String(c.ageSet && c.age === a), onclick: () => { c.age = a; c.ageSet = true; render(); } }, a)))),
    h('div', { class: 'cardbox' }, h('b', {}, '建物與工程'), h('span', { class: 'note' }, '用來評估消防法規與室內裝修許可。'),
      h('div', { class: 'fields' }, field('floors', '建物總樓層', '層', { step: 1 })),
      ...errors('floors'),
      h('div', { class: 'inline', role: 'group', 'aria-label': '會動隔間嗎' }, h('span', { class: 'note' }, '會動隔間或加廁所浴室嗎'),
        ...[['yes', '會'], ['no', '不會']].map(([v, label]) => h('button', { class: 'chip', id: 'part-' + v, 'aria-pressed': String(c.partition === v), onclick: () => { c.partition = c.partition === v ? '' : v; render(); } }, label)))),
    h('div', { class: 'cardbox' }, h('b', {}, '參考圖（留給專業團隊看的）'),
      h('p', { class: 'note', id: 'docsrole' }, '這裡的圖目前不會被自動判讀，所以不會改變 3D、圖面或估價金額。要讓結果貼近你家，請在上面填長、寬、高。'),
      input, drop,
      S.docError ? h('p', { class: 'err', role: 'alert' }, S.docError) : h('span', { hidden: true }),
      S.lostDocs && !S.docs.length ? h('p', { class: 'err', id: 'lostdocs' }, '重新整理後，先前附的圖面需要再附一次（檔案只留在瀏覽器的這一次瀏覽）。') : h('span', { hidden: true }),
      S.docs.length ? list : h('span', { hidden: true }),
      h('p', { class: 'note' }, '原型階段：檔案只留在你的瀏覽器，不會上傳。')),
    cta(pct ? '生成 3D' : '先跳過，生成 3D', start, pct ? 'accent' : ''));
};

/* ---- 3 3D 成品 ---- */
SCREENS[3] = () => {
  if (!S.cond.style) setStyle(pickStyle(S.scores));
  if (!S.generated) return generating();
  const c = S.cond, current = look(), est = estimateNow(), size = roomSize(c, est.ping);
  const stage = h('div', { class: 'scene', role: 'img', 'aria-label': '3D 空間，可拖曳旋轉' });
  const views = h('div', { class: 'seg', role: 'group', 'aria-label': '視角' }, h('span', { class: 'note' }, '視角'), ...Object.entries(VIEW_NAMES).map(([v, label]) => h('button', { 'aria-pressed': String(S.view === v), 'aria-label': `視角 ${v}：${label}`, 'data-view': v,
    onclick: () => { S.view = v; live?.setView(v); views.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v))); save(); } }, label)));
  // 改細節是開關：再按一次就取消。每一步都留著，可以復原。
  const done = S.versions[S.v].edits ?? [];
  const edit = (i) => {
    const edits = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    S.versions = [...S.versions.slice(0, S.v + 1), { look: edits.reduce((l, n) => EDITS[n][1]({ ...l }), { ...STYLES[c.style] }), edits }];
    S.v = S.versions.length - 1; render();
  };
  app.append(h('div', { class: 'result' },
    h('div', { class: 'stagewrap' }, stage, h('div', { class: 'stagebar' }, views)),
    h('div', { class: 'panel' },
      h('div', { class: 'shead' }, backBtn(2), h('h1', {}, `${c.space}・${STYLES[c.style].name}`)),
      h('div', { class: 'tweak' }, h('b', {}, '換風格'),
        h('div', { class: 'chips' }, ...SWIPE_ORDER.map((k) => h('button', { class: 'chip', 'aria-pressed': String(c.style === k), onclick: () => { setStyle(k); render(); } }, STYLES[k].name)))),
      h('div', { class: 'tweak' }, h('b', {}, '改細節'),
        h('div', { class: 'chips' }, ...EDITS.map(([label], i) => h('button', { class: 'chip', 'aria-pressed': String(done.includes(i)), onclick: () => edit(i) }, c.space === '臥室' ? label.replace('沙發', '床頭') : label))),
        S.v > 0 ? h('p', { class: 'note', id: 'edits' }, done.length ? `已改 ${done.length} 項，再按一次可取消。` : '已回到原本的設計。', ' ',
          h('button', { class: 'link', id: 'undoedit', onclick: () => { S.versions = S.versions.slice(0, S.v); S.v -= 1; render(); } }, '↩ 復原上一步')) : null),
      h('p', { class: 'note', id: 'ctx' }, `這個房間：${size.w} × ${size.d} 公尺、高 ${size.h} 公尺（${est.ping} 坪${est.assumedPing ? '，預設' : ''}）・掌握度 ${Math.round(knowledge().score * 100)}%。`,
        size.clamped ? '這個尺寸放不下一張沙發或超過 60 公尺，3D 取了最接近的大小。' : '', ' ', h('button', { class: 'link', onclick: () => go(2) }, c.len && c.wid ? '修改尺寸' : '填你家的尺寸')),
      h('p', { class: 'pricetag' }, '預估', h('b', { id: 'teaser' }, `${est.low}–${est.high} 萬`)),
      h('p', { class: 'note', id: 'assume' }, `以 ${est.ping} 坪${est.assumedPing ? '（預設）' : ''}、${c.age}${c.ageSet ? '' : '（預設）'}估算。`,
        est.assumedPing || !c.ageSet ? '坪數和屋況會讓金額差很多，' : '', h('button', { class: 'link', onclick: () => go(2) }, est.assumedPing || !c.ageSet ? '填我家的' : '修改')),
      ...ruleFindings({ ...c, ping: est.ping }, current, summarize(S.docs)).filter((f) => f.state === 'conflict')
        .map((f) => h('p', { class: 'warn', role: 'status' }, h('b', {}, `${f.title}：`), f.detail)),
      cta('看估價與施工圖初稿', () => go(4)), shareBtn())));
  stage.append(h('span', { class: 'hint' }, '拖曳旋轉'));
  load3D().then((m) => { if (S.step === 3 && stage.isConnected) { live = m.mountRoom3D(stage, current, S.view, { ...size, space: c.space }); window.__room = live; } })
    .catch(() => {   // 這台裝置或瀏覽器開不了 3D：改成一張 2D 示意圖，並收起沒有作用的視角與拖曳提示
      stage.append(fromHTML(roomSVG(current, { label: '2D 示意圖' })));
      stage.classList.add('flat'); stage.setAttribute('aria-label', '2D 示意圖');
      stage.querySelector('.hint').textContent = '2D 示意圖（這台裝置無法顯示 3D）';
      views.hidden = true;
    });
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
  const setPing = (v) => { c.ping = String(Math.max(1, Math.round(v))); render(); };
  const money = h('div', { class: 'cardbox' },
    h('p', { class: 'note' }, `照這個設計做，預估花費`),
    h('p', { class: 'badge', id: 'estkind' }, est.assumedPing || !c.ageSet ? '範例估算，非正式報價' : '初步估算，非正式報價'),
    h('p', { class: 'note', id: 'know' }, `掌握度 ${Math.round(k.score * 100)}%${est.narrowed ? `，區間已收窄 ${Math.round(est.narrowed * 100)}%` : ''}。`, ' ', h('button', { class: 'link', onclick: () => go(2) }, k.score < 1 ? '補條件讓它更準' : '修改條件')),
    h('p', { class: 'big', id: 'total' }, `${est.low}–${est.high} 萬`),
    h('p', { class: 'note', id: 'assume4' }, `假設：${est.ping} 坪${est.assumedPing ? '（預設，你還沒填）' : ''}、${c.age}${c.ageSet ? '' : '（預設，你還沒選）'}、中等建材、不動格局${c.noFurniture ? '、不含家具軟裝' : ''}。`),
    h('div', { class: 'inline' },
      // 有填長寬時坪數由長寬決定：顯示實際尺寸並連回去改，不提供會把長寬清掉的加減鈕
      c.len && c.wid ? h('span', { class: 'chip ghost', id: 'ping' }, `${est.ping} 坪・${c.len} × ${c.wid} 公尺 `, h('button', { class: 'link', onclick: () => go(2) }, '修改'))
        : h('div', { class: 'stepper', role: 'group', 'aria-label': '坪數' },
          h('button', { 'aria-label': '減少坪數', onclick: () => setPing(resolvePing(c) - 1) }, '−'),
          h('output', { id: 'ping' }, `${est.ping} 坪${est.assumedPing ? '（預設）' : ''}`),
          h('button', { 'aria-label': '增加坪數', onclick: () => setPing(resolvePing(c) + 1) }, '＋')),
      ...AGES.map((a) => h('button', { class: 'chip', 'aria-pressed': String(c.age === a), onclick: () => { c.age = a; c.ageSet = true; render(); } }, a))),
    h('label', { class: 'check', id: 'withfurniture' }, h('input', { type: 'checkbox', checked: !c.noFurniture, onchange: (e) => { c.noFurniture = !e.target.checked; renderSoon(); } }),
      c.noFurniture ? '把家具軟裝算進來（目前不含：沿用舊家具或自己買）' : '把家具軟裝算進來（沿用舊家具或自己買，可以取消）'),
    h('ul', { class: 'items' }, ...est.items.map((i) => h('li', {}, h('b', {}, i.name), h('span', { class: 'amt' }, `${i.low}–${i.high} 萬`),
      h('small', {}, i.basis), h('span', { class: 'bar', 'aria-hidden': 'true' }, h('i', { style: `width:${(i.high / max) * 100}%` }))))),
    h('p', { class: 'note' }, '參考行情量級（尚未以實際單價表校正），中等建材、不動格局；不含家電與設計監工費。'));

  const sheets = drawingSet(c, current, est, new Date().toISOString().slice(0, 10));
  const docs = summarize(S.docs);
  const findings = ruleFindings({ ...c, ping: est.ping }, current, docs);
  const mine = aboutThisHome(c) || S.unlocked;   // 沒有手動填的長寬，畫的只是範例空間：不賣。已解鎖的不收回。
  const missing = missingForHome(c);
  const view = (s) => {
    $('#viewerBody').replaceChildren(fromHTML(s.svg));
    const a = $('#viewerDownload');
    if (a.href.startsWith('blob:')) URL.revokeObjectURL(a.href);
    a.hidden = !S.unlocked;                     // 範例只能看，不提供下載
    if (S.unlocked) { a.href = URL.createObjectURL(new Blob([s.svg], { type: 'image/svg+xml' })); a.download = s.file; } else a.removeAttribute('href');
    $('#viewerNote').textContent = mine ? '' : '這是範例空間（預設 8 坪）的 AI 初稿，不是你家的。';
    $('#viewerPrint').hidden = !S.unlocked;
    $('#viewerPrint').onclick = () => printSheet(s);
    $('#viewer').showModal();
  };
  // 存成 PDF：用瀏覽器的列印（另存為 PDF），紙張設成 A3 橫式，一張圖一頁
  const printSheet = (s) => {
    document.querySelector('iframe.printer')?.remove();
    const frame = h('iframe', { class: 'printer', title: '列印', 'aria-hidden': 'true' });
    document.body.append(frame);
    const d = frame.contentDocument;
    d.open(); d.write(`<!doctype html><title>${s.file.replace(/\.svg$/, '')}</title><style>@page{size:A3 landscape;margin:0}html,body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${s.svg}`); d.close();
    frame.contentWindow.focus(); frame.contentWindow.print();
  };
  const open = (s) => (!mine || S.unlocked ? view(s) : $('#unlock').showModal());   // 範例可以直接放大看；你家的要解鎖
  // 從 AI 初稿到可施工的圖：三個階段與各自的責任。後兩個階段的做法還在確認，不寫成已經具備。
  const stages = h('ol', { class: 'stages', id: 'stages' },
    h('li', { class: 'now' }, h('b', {}, '1　AI 初稿'), h('span', { class: 'pill' }, '現在'), h('p', {}, '依你填的長寬高、屋況、樓層自動配置空間、家具、燈位與插座。資料由你提供；圖上的門和窗位置是示意，還沒有你家實際的門窗、柱位、固定設備與既有機電。')),
    h('li', {}, h('b', {}, '2　專業團隊確認'), h('span', { class: 'pill tbd' }, '流程確認中'), h('p', {}, '由設計與施工團隊現場丈量、核對既有條件與法規。怎麼預約、由誰負責、費用與時程，還在確認，目前不包含在這個原型裡。')),
    h('li', {}, h('b', {}, '3　施工圖定稿'), h('span', { class: 'pill tbd' }, '標準確認中'), h('p', {}, '通過專業確認後才稱為可施工的圖。出圖標準還在確認。')));
  const drawings = h('div', { class: 'cardbox' + (mine && !S.unlocked ? ' locked' : ''), id: 'drawings' },
    h('div', { class: 'unlockrow' }, h('h2', {}, !mine ? '施工圖初稿（範例）' : S.unlocked ? '你家尺寸的施工圖初稿（已解鎖）' : '你家尺寸的施工圖初稿'),
      !mine ? h('span', { class: 'note' }, '6 張・點任一張放大看') : S.unlocked ? null : h('span', { class: 'note' }, '6 張・付費後清晰可放大、可下載')),
    h('p', { class: 'note', id: 'docsnote' }, !mine ? `這是範例空間的圖，讓你先看會拿到什麼。要產生你家的，還缺：${missing.join('、')}（手動填寫；上傳的平面圖目前不會被自動判讀）。`
      : `依你填的 ${c.len || '—'} × ${c.wid || '—'} 公尺配置。${docs.total ? `已附 ${docs.text}，留給專業團隊確認時參考。` : ''}`),
    h('div', { class: 'sheets' }, ...sheets.map((s) => h('button', { class: 'sheetbtn', 'aria-label': `${s.title}${!mine ? '（範例），點擊放大' : S.unlocked ? '，點擊放大' : '（未解鎖）'}`, onclick: () => open(s) },
      fromHTML(s.svg), h('span', { class: 'tag' }, !mine ? `${s.title}・範例` : s.title), mine && !S.unlocked ? h('span', { class: 'lock', 'aria-hidden': 'true' }, '🔒') : null))),
    !mine ? h('button', { class: 'chip', id: 'makemine', onclick: () => go(2) }, `產生我家的初稿（還缺${missing.join('、')}）`) : null,
    h('b', {}, '從初稿到可以施工'), stages);
  // 法規與施工條件評估：依台灣法規整理的提醒；由我們的設計與施工團隊逐項確認
  const item = (f) => h('li', {}, h('span', { class: 'state', style: `background:${STATE_COLOR[f.state]}` }, STATES[f.state]),
    h('div', {}, h('b', {}, f.title), h('p', {}, f.detail), f.source ? h('small', {}, `依據：${f.source}`) : null));
  const legal = findings.filter((f) => f.source), site = findings.filter((f) => !f.source && f.state !== 'ok');
  const regs = h('div', { class: 'cardbox', id: 'regs' },
    h('h2', {}, '法規與施工條件評估'),
    h('p', { class: 'note' }, c.floors ? `依 ${c.floors} 層建物${c.partition ? (c.partition === 'yes' ? '、會動隔間' : '、不動隔間') : ''}評估。` : '還不知道建物總樓層，以下多數項目無法判斷。', ' ',
      h('button', { class: 'link', onclick: () => go(2) }, c.floors && c.partition ? '修改' : '補樓層與隔間')),
    h('ul', { class: 'regs' }, ...legal.map(item), ...site.map(item)),
    h('p', { class: 'note' }, '這是依台灣消防與建築法規整理的提醒，不是合格判定；實際適用條文與申請，需由專業人員逐項確認。'));
  app.append(h('div', { class: 'shead' }, backBtn(3), h('h1', {}, '估價與施工圖初稿'), shareBtn()),
    h('div', { class: 'two' }, money, drawings),
    regs,
    ...(S.unlocked ? [] : [mine ? cta('解鎖我家的施工圖初稿　NT$ 1,990', () => $('#unlock').showModal(), 'accent') : cta('填我家的長寬，產生我家的初稿', () => go(2), 'accent', { id: 'needhome' })]));
};
$('#payCancel').addEventListener('click', () => $('#unlock').close());
$('#payOk').addEventListener('click', () => { $('#unlock').close(); S.unlocked = true; if (S.step === 4) render(); });

// 從分享連結打開：直接帶到那個設計的 3D（不覆蓋對方沒給的欄位）
const shared = fromShare(location.hash, { styles: Object.keys(STYLES), edits: EDITS.length, ages: AGES });
if (shared) {
  S = fresh();
  Object.assign(S.cond, shared.cond);
  setStyle(shared.style);
  let cur = { ...STYLES[shared.style] };
  shared.edits.forEach((i, n) => { cur = EDITS[i][1]({ ...cur }); S.versions.push({ look: cur, edits: shared.edits.slice(0, n + 1) }); });
  S.v = S.versions.length - 1;
  S.step = 3; S.reached = 4; S.swiped = 0;
  history.replaceState(null, '', location.pathname);
}
render();
