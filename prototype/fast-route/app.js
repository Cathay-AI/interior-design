// UI for the 快速找風格 prototype: 滑卡（Pinterest 靈感圖）→ 3D 成品 → 估價與施工圖.
// Decision logic lives in ./lib (pure, unit-tested); this file owns state, rendering and browser APIs.
import { STYLES, SWIPE_ORDER, REASONS, emptyScores, applySwipe, undoSwipe, pickStyle, topStyles } from './lib/taste.js';
import { designEstimate, resolvePing } from './lib/estimate.js';
import { STATES, CERTAINTY, CHECKED, LAWS, lawUrl, ruleFindings, regSummary } from './lib/rules.js';
import { AGES, parseHome } from './lib/intake.js';
import { drawingSet } from './lib/drawings.js';
import { roomSize, roomLayout } from './lib/layout.js';
import { MASCOT, roomSVG } from './lib/art.js';
import { PINS } from './lib/pins.js';
import { contextScore, pingFromDims, tighten, aboutThisHome, missingForHome, fieldError } from './lib/context.js';
import { GREETING, swipeReply, nextQuestion, designNotes, editReply, parseEdit } from './lib/voice.js';
import { summaryText } from './lib/summary.js';
import { templateRooms, kindOf, roomPing, homeTitle, planSVG, homeEstimate } from './lib/home.js';
import { KEY, serialize, restore, toShare, fromShare } from './lib/persist.js';
import { KINDS, ACCEPT, MAX_FILES, MAX_MB, guessKind, rejectReason, summarize } from './lib/docs.js';

// The 3D module (Three.js) is loaded on demand so the first screen stays light.
let room3d = null;
const load3D = () => (room3d ??= import('./lib/room3d.js'));
let live = null; // the mounted 3D room, disposed whenever the screen changes

/* ================= content ================= */
// 步驟名稱以「你家」為主詞
const STEPS = [null, { name: '你家' }, { name: '風格' }, { name: '設計' }, { name: '花費' }];
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
// 紅筆只給「需辦理」；其餘狀態用墨線與鉛筆色
const STATE_COLOR = { ok: '#1e2428', conflict: '#d2402e', missing: '#6f797e', review: '#6f797e', action: '#d2402e', na: '#6f797e' };

/* ================= state ================= */
const fresh = () => ({
  step: 1, reached: 1, scores: emptyScores(), swiped: 0, liked: 0,
  cond: { space: '客廳', style: null, ping: '', len: '', wid: '', height: '', age: '新成屋', ageSet: false, floors: '', partition: '', unitFloor: '', sprinkler: '', housing: '', noFurniture: false },
  docs: [], docError: '', said: '', heard: null, history: [], reasons: [],
  versions: [], v: 0, view: 'A', generated: false, unlocked: false, regsOpen: false, started: false, note: '',
  home: null, room: null, tab: 'room', costTab: 'room', editing: null,   // 整戶：home = { rooms }；room = 目前在看的房間 formOpen: false, docsOpen: false, whyOpen: false, regsMore: false,
  bad: {},   // 填錯的欄位：{ 欄位: { value, msg } }，不存檔
});
// 進度存在這台瀏覽器：重整頁面不會從頭來（上傳的檔案除外）
const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const save = () => { try { localStorage.setItem(KEY, serialize(S)); } catch { /* 私密模式或空間滿了：不存也能用 */ } };
let S = restore(stored(), fresh());
S.bad ??= {}; S.note ??= ''; S.regsOpen ??= false;

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
// 右欄貼底的動作列：每個畫面把主要按鈕放這裡，內容區自己捲
const dock = (...nodes) => $('#actions').append(...nodes.filter(Boolean));
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= 舞台：房間一直在場 =================
   同一個 canvas 從開場到最後一步都不卸載；屋主做的事（選空間、滑卡、填尺寸、改設計）只更新它。
   右下角是常駐的預估金額，左下角是房間的尺寸線。 */
const sceneEl = $('#scene');
let stageKey = '', stageFailed = false, shownPrice = null, rollTimer = 0;
/* ---- 整戶：一串房間，一次看一間 ---- */
const multi = () => Boolean(S.home);
const curRoom = () => S.home?.rooms.find((r) => r.id === S.room) ?? null;
const roomOK = () => !multi() || kindOf(curRoom()?.name ?? '') !== null;          // 這一間做得出 3D 嗎
const lookWith = (edits) => (edits ?? []).reduce((l, n) => EDITS[n][1]({ ...l }), { ...STYLES[S.cond.style ?? pickStyle(S.scores)] });
const keepEdits = () => { const r = curRoom(); if (r && S.versions.length) r.edits = [...(S.versions[S.v].edits ?? [])]; };
function enterRoom(id) {
  const r = S.home.rooms.find((x) => x.id === id);
  if (!r) return;
  keepEdits(); S.room = id; S.tab = 'room'; S.note = '';
  const kind = kindOf(r.name);
  if (kind) Object.assign(S.cond, { space: kind, len: r.len, wid: r.wid, ping: String(roomPing(r) ?? '') });
  if (S.cond.style) { S.versions = [{ look: lookWith(r.edits), edits: [...(r.edits ?? [])] }]; S.v = 0; }
}
const estimateRoom = (r) => { const cond = { ...S.cond, space: kindOf(r.name), len: r.len, wid: r.wid, ping: String(roomPing(r) ?? '') }; return tighten(designEstimate(cond, lookWith(r.edits)), contextScore(cond, {}).score); };
const homeNow = () => { keepEdits(); return homeEstimate(S.home.rooms, estimateRoom); };
const roomLabel = () => (multi() ? curRoom()?.name ?? S.cond.space : S.cond.space);
// 舞台上現在該是哪個設計：還沒定風格時，用滑卡目前領先的那一種（開場則是訪客點的色票）
const stageLook = () => (S.cond.style && S.versions.length ? look() : STYLES[S.swiped || !S.tryStyle ? pickStyle(S.scores) : S.tryStyle]);
function syncStage() {
  const c = S.cond, cur = stageLook(), est = tighten(designEstimate(c, cur), knowledge().score), size = { ...roomSize(c, est.ping), space: c.space };
  // 整戶時，舞台在「看整個家」的畫面改放示意平面圖；3D 留在底下不卸載
  const planMode = multi() && (S.step !== 3 || S.tab === 'all' || !roomOK());
  const plan = $('#plan'); plan.hidden = !planMode;
  const pickRoom = (e) => { const g = e.target.closest('[data-room]'); if (!g || (e.type === 'keydown' && e.key !== 'Enter')) return; if (S.step < 3 && !S.cond.style) return; enterRoom(g.dataset.room); go(3); };
  if (planMode) { plan.replaceChildren(fromHTML(planSVG(S.home.rooms, S.step === 3 && S.tab === 'room' ? S.room : null)), h('p', { class: 'note' }, '示意平面圖：只表示有哪些房間和大概的大小，不是你家的實際格局。')); plan.onclick = pickRoom; plan.onkeydown = pickRoom; }
  const where = $('#where2'); where.hidden = !planMode; if (planMode) where.textContent = `你家・${homeTitle(S.home.rooms)}`;
  $('#hint').hidden = planMode;
  // 房間列與小平面圖：只在一間一間看設計時出現
  const tabs = $('#roomtabs'); tabs.hidden = !(multi() && S.step === 3);
  if (!tabs.hidden) tabs.replaceChildren(h('button', { 'aria-pressed': String(S.tab === 'all'), onclick: () => { keepEdits(); S.tab = 'all'; render(); } }, '整戶'),
    ...S.home.rooms.filter((r) => r.on).map((r) => h('button', { 'aria-pressed': String(S.tab === 'room' && r.id === S.room), onclick: () => { enterRoom(r.id); render(); } }, r.name, h('i', { class: kindOf(r.name) ? '' : 'off', 'aria-hidden': 'true' }))));
  const mini = $('#minimap'); mini.hidden = !(multi() && S.step === 3 && !planMode);
  if (!mini.hidden) { mini.replaceChildren(fromHTML(planSVG(S.home.rooms, S.room)), h('small', {}, '點平面圖換房間')); mini.onclick = pickRoom; }
  // 金額卡：常駐；整戶是合計，還沒挑風格就先不給數字
  const whole = multi() && (S.step === 4 || (S.step === 3 && S.tab === 'all')), home = whole ? homeNow() : null;
  $('#pricekind').textContent = multi() && S.step < 3 ? '挑完風格就有估算' : whole ? '整戶・範例估算' : !S.started ? '範例估算' : est.assumedPing || !c.ageSet ? '範例估算' : '初步估算';
  if (multi() && (S.step < 3 || (S.step === 3 && S.tab === 'room' && !roomOK()))) rollPrice(null); else if (whole) rollPrice(home.low, home.high); else rollPrice(est.low, est.high);
  // 尺寸卡
  const dims = $('#dims'); dims.hidden = planMode;
  dims.replaceChildren(h('small', {}, `${S.started ? `你家${roomLabel()}` : '範例客廳'}・${est.assumedPing ? '約 ' : ''}${est.ping} 坪`), h('b', {}, `${Math.round(size.w * 10) / 10} × ${Math.round(size.d * 10) / 10} 公尺`));
  // 開場可以先玩：點色票，房間整個換風格
  const sw = $('#swatches'); sw.hidden = S.started;
  if (!S.started) sw.replaceChildren(...SWIPE_ORDER.map((k) => h('button', { class: 'swatch', 'aria-label': STYLES[k].name, title: STYLES[k].name, 'aria-pressed': String(STYLES[k] === cur),
    onclick: () => { S.tryStyle = k; syncStage(); } }, h('i', { style: `background:${STYLES[k].wall}` }), h('i', { style: `background:${STYLES[k].floor}` }))));
  // 視角：看單一房間的 3D 時才有用
  const views = $('#views'); views.hidden = S.step !== 3 || planMode || stageFailed;
  views.replaceChildren(...Object.entries(VIEW_NAMES).map(([v, label]) => h('button', { 'aria-pressed': String(S.view === v), 'aria-label': `視角 ${v}：${label}`, 'data-view': v,
    onclick: () => { S.view = v; live?.setView(v); views.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v))); save(); } }, label)));
  const key = JSON.stringify([cur, size]);
  if (key === stageKey) return;
  const first = !stageKey; stageKey = key;
  if (stageFailed) return flatStage(cur);
  if (live) return live.update(cur, size);
  if (!first) return;                                            // 3D 還在載：載好時會用當下的設計
  $('#poster').hidden = !(cur === STYLES.warm && c.space === '客廳' && !c.len);   // 預設客廳先用一張圖墊著，3D 好了就換上
  load3D().then((m) => { const now = stageNow(); live = m.mountRoom3D(sceneEl, now.look, S.view, now.size); window.__room = live; })
    .catch(() => { stageFailed = true; flatStage(stageLook()); $('#views').hidden = true; });
}
const stageNow = () => { const cur = stageLook(), est = tighten(designEstimate(S.cond, cur), knowledge().score); return { look: cur, size: { ...roomSize(S.cond, est.ping), space: S.cond.space } }; };
// 這台裝置或瀏覽器開不了 3D：同一個位置改放 2D 示意圖，收起沒有作用的視角與拖曳提示
function flatStage(cur) {
  sceneEl.querySelector('svg')?.remove(); $('#poster').hidden = true;
  sceneEl.append(fromHTML(roomSVG(cur, { label: '2D 示意圖' })));
  sceneEl.classList.add('flat'); sceneEl.setAttribute('aria-label', '2D 示意圖');
  $('#hint').textContent = '2D 示意圖（這台裝置無法顯示 3D）';
}
function rollPrice(low, high) {
  const el = $('#teaser'), text = (a, b) => `${Math.round(a)}–${Math.round(b)} 萬`, from = shownPrice;
  cancelAnimationFrame(rollTimer); el.classList.remove('flash');
  if (low === null) { shownPrice = null; el.textContent = '— 萬'; return; }
  shownPrice = [low, high];
  if (!from || reducedMotion() || (from[0] === low && from[1] === high)) { el.textContent = text(low, high); return; }
  el.classList.add('flash');
  const t0 = performance.now(), step = (now) => {
    const t = Math.min(1, (now - t0) / 400);
    el.textContent = text(from[0] + (low - from[0]) * t, from[1] + (high - from[1]) * t);
    if (t < 1) rollTimer = requestAnimationFrame(step); else el.classList.remove('flash');
  };
  rollTimer = requestAnimationFrame(step);
}

/* ================= navigation ================= */
function go(step) {
  S.note = '';
  S.step = step; S.reached = Math.max(S.reached, step);
  render();
  window.scrollTo({ top: 0 }); app.scrollTop = 0;
}
function render() {
  $('#steps').replaceChildren(...STEPS.slice(1).map((s, i) => {
    const n = i + 1, state = n === S.step ? 'now' : n <= S.reached ? 'done' : '';
    return h('li', {}, h('button', { class: state, disabled: n > S.reached, 'aria-current': n === S.step ? 'step' : false, 'aria-label': `第 ${n} 步：${STEPS[n].name}`, onclick: () => go(n) },
      h('span', { class: 'n' }, n < S.step && n <= S.reached ? '✓' : String(n)), h('span', { class: 't' }, s.name)));
  }));
  $('#restart').hidden = S.reached === 1;
  // 重畫後把鍵盤焦點放回同一個位置（同一步內），用 Tab 操作的人不會被丟回頁首
  const FOCUSABLE = 'button:not(:disabled),input,textarea,a[href]';
  const sig = (el) => el && (el.id || `${el.tagName}:${el.textContent.trim().slice(0, 24)}`);
  const at = Number(app.dataset.step) === S.step ? [...app.querySelectorAll(FOCUSABLE)].indexOf(document.activeElement) : -1, was = sig(document.activeElement);
  pending = false;
  app.replaceChildren(); $('#actions').replaceChildren();
  $('#shareslot').replaceChildren(...(S.step >= 3 && !multi() ? [shareBtn()] : []));
  app.dataset.step = S.step;
  SCREENS[S.step]();
  if (at >= 0) { const el = app.querySelectorAll(FOCUSABLE)[at]; if (sig(el) === was) el.focus({ preventScroll: true }); }   // 位置上換了別的東西就不硬放
  syncStage();
  save();
}
// 欄位改完會重畫整頁。如果這時手指或滑鼠正按在某個按鈕上，馬上重畫會把那顆按鈕換掉、那一下就落空，
// 所以等放開（click 送出）之後再畫。
let pressing = false, pending = false;
addEventListener('pointerdown', () => { pressing = true; }, true);
for (const type of ['pointerup', 'pointercancel']) addEventListener(type, () => setTimeout(() => { pressing = false; if (pending) render(); }, 0), true);
const renderSoon = () => { pending = true; if (!pressing) setTimeout(() => { if (pending) render(); }, 0); };
$('#restart').addEventListener('click', () => { S.docs.forEach((d) => d.url && URL.revokeObjectURL(d.url)); try { localStorage.removeItem(KEY); } catch { /* ignore */ } S = fresh(); go(1); });

const setStyle = (key) => { S.cond.style = key; const edits = multi() ? [...(curRoom()?.edits ?? [])] : []; S.versions = [{ look: edits.reduce((l, n) => EDITS[n][1]({ ...l }), { ...STYLES[key] }), edits }]; S.v = 0; };
const look = () => S.versions[S.v].look;
// 估價：依設計逐項估，再依掌握度收窄區間
const knowledge = () => contextScore(S.cond, summarize(S.docs));
const estimateNow = () => tighten(designEstimate(S.cond, look()), knowledge().score);
// 分享：把目前的風格、修改與條件編進網址，對方打開就看到同一個結果（不含上傳的檔案與解鎖）
const shareBtn = () => {
  const btn = h('button', { class: 'ghostbtn out', id: 'share', onclick: async () => {
    const url = `${location.origin}${location.pathname}#${toShare(S)}`;
    try { await navigator.clipboard.writeText(url); btn.textContent = '已複製連結'; }
    catch { prompt('複製這個連結', url); }
    setTimeout(() => { btn.textContent = '分享'; }, 2400);
  } }, '分享');
  return btn;
};
const backBtn = (n, label = '上一步', fn = null) => h('button', { class: 'back', onclick: fn ?? (() => go(n)) }, `‹ ${label}`);

/* ---- 設計師的對話框：每一步都有人在回應（話術在 lib/voice.js） ---- */
const agent = (content, attrs = {}) => h('div', { class: 'agent', ...attrs }, fromHTML(MASCOT),
  h('div', { class: 'bubble', 'aria-live': 'polite' }, ...(Array.isArray(content) ? content.map((t) => h('p', {}, t)) : [h('p', {}, content)])));

/* ---- 法規與施工條件：3D 頁和估價頁共用的清單 ---- */
const findingsNow = () => ruleFindings({ ...S.cond, ping: estimateNow().ping }, look(), summarize(S.docs));
// 差一個答案的項目，直接在那一項底下回答，不用回上一頁
function askInline(key) {
  const c = S.cond, set = (k, v) => { c[k] = v; render(); };
  const yesNo = (k, yes, no) => h('div', { class: 'inline ask', role: 'group' }, ...[['yes', yes], ['no', no]].map(([v, label]) => h('button', { class: 'chip', 'aria-pressed': String(c[k] === v), onclick: () => set(k, v) }, label)));
  const number = (k, label) => {
    const input = h('input', { type: 'number', inputmode: 'numeric', min: 1, step: 1, placeholder: '—', 'aria-label': label, id: 'ask-' + k });
    const err = h('span', { class: 'err', role: 'alert' });
    const ok = () => { const msg = fieldError(k, input.value) || (input.value ? '' : '請填數字'); err.textContent = msg; if (!msg) set(k, input.value.trim()); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
    return h('div', { class: 'inline ask' }, h('span', { class: 'note' }, label), input, h('button', { class: 'chip', onclick: ok }, '確定'), err);
  };
  return { sprinkler: () => yesNo('sprinkler', '有撒水頭', '沒有'), partition: () => yesNo('partition', '會動隔間或加廁所浴室', '不會'),
    unitFloor: () => number('unitFloor', '你家在第幾樓'), floors: () => number('floors', '建物總共幾層') }[key]?.() ?? null;
}
function regsList(findings) {
  const asked = new Set();
  // 每項只留一行「要做什麼」；說明與依據點開才看
  const item = (f) => h('li', {}, h('span', { class: 'state', style: `background:${STATE_COLOR[f.state]}` }, STATES[f.state]),
    h('div', {}, h('b', {}, f.title), h('p', { class: 'brief' }, f.brief),
      f.ask && !asked.has(f.ask) && asked.add(f.ask) ? askInline(f.ask) : null,   // 同一題只問一次
      f.law ? h('details', {}, h('summary', {}, '說明與依據'), h('p', {}, f.detail),
        h('small', {}, ...f.law.flatMap((k, i) => [i ? '、' : '', h('a', { href: lawUrl(k), target: '_blank', rel: 'noopener' }, `${LAWS[k].name}${LAWS[k].art}`)]),
          `（${[...new Set(f.law.map((k) => LAWS[k].amended))].join('、')} 修正）・${CERTAINTY[f.certainty]}`)) : null));
  const rank = { action: 0, conflict: 0, review: 1, missing: 2 };
  const shown = findings.filter((f) => f.state in rank && (f.source || f.state !== 'ok')).sort((x, y) => (x.source ? 0 : 1) - (y.source ? 0 : 1) || rank[x.state] - rank[y.state]);
  const quiet = findings.filter((f) => f.source && f.state === 'na');
  return h('div', {}, h('ul', { class: 'regs' }, ...shown.map(item), ...(S.regsMore ? quiet.map(item) : [])),
    quiet.length ? h('button', { class: 'link', id: 'regsmore', onclick: () => { S.regsMore = !S.regsMore; render(); } }, S.regsMore ? '收起不適用的項目' : `另有 ${quiet.length} 項不適用`) : null);
}
const REG_NOTE = `提醒，不是合格判定。條號由 AI 在 ${CHECKED} 對照全國法規資料庫，尚待專業人員複核。`;

/* ================= screens ================= */
const SCREENS = [];

/* ---- 開場：先講承諾、先給成果看、先問想弄哪裡 ---- */
function intro() {
  const pick = (name) => { S.home = null; S.cond.space = name; S.started = true; render(); };
  // 丟平面圖：檔案留作參考圖。還不會自動讀圖，所以先給三房兩廳的範本讓屋主改
  const take = (files) => {
    const f = files[0]; if (!f) return;
    const why = rejectReason(f, S.docs.length);
    if (why) { S.docError = why; return render(); }
    S.docError = '';
    S.docs.push({ name: f.name, kind: 'plan', pdf: f.type === 'application/pdf', url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null });
    S.home = { rooms: templateRooms() }; S.room = S.home.rooms[0].id; S.started = true; S.cond.space = '客廳';
    render();
  };
  const file = h('input', { type: 'file', id: 'planFile', class: 'sr', accept: ACCEPT, onchange: (e) => take([...e.target.files]) });
  const zone = h('label', { for: 'planFile', class: 'upload', id: 'upload',
    ondragover: (e) => { e.preventDefault(); zone.classList.add('over'); }, ondragleave: () => zone.classList.remove('over'), ondrop: (e) => { e.preventDefault(); take([...e.dataTransfer.files]); } },
    h('i', { 'aria-hidden': 'true' }, fromHTML('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V5M7 10l5-5 5 5M5 19h14"/></svg>')),
    h('b', {}, '上傳你家的平面圖'), h('span', {}, '建商給的平面圖、權狀附圖、手繪都可以'), h('span', {}, '拖進來，或點這裡選檔案（JPG／PNG／PDF）'));
  app.append(h('div', { class: 'intro' },
    h('p', { class: 'eyebrow' }, 'AI 室內設計師・亮亮'),
    h('h1', {}, '把平面圖丟給我，', h('br'), '整個家一次設計好。'),
    h('p', { class: 'lead', id: 'greeting' }, '幾房幾廳都可以，一間一間看設計，整戶加總花費。'),
    file, zone,
    S.docError ? h('p', { class: 'err', role: 'alert' }, S.docError) : null,
    h('p', { class: 'or' }, '還沒有平面圖？先挑一個空間試試'),
    h('div', { class: 'chips', role: 'group', 'aria-label': '先挑一個空間', id: 'where', style: 'justify-content:center' },
      ...SPACE_OPTIONS.filter(([name]) => name !== '全室').map(([name, ready]) => h('button', { class: 'chip', disabled: !ready, onclick: () => pick(name) }, ready ? name : `${name}（之後）`)))),
    h('div', { class: 'how' }, ...[['1', '丟平面圖', '確認有哪些房間'], ['2', '滑卡挑風格', '整個家一起套用'], ['3', '看設計與花費', '一間一間看，整戶加總']].map(([n, t, d]) => h('div', {}, h('i', {}, n), h('b', {}, t), h('span', {}, d)))));
}

/* ---- 1 你家（整戶）：確認有哪些房間 ---- */
function roomsScreen() {
  const rooms = S.home.rooms, on = rooms.filter((r) => r.on), c = S.cond;
  const row = (r) => {
    const editing = S.editing === r.id, ping = roomPing(r);
    const li = h('li', {},
      h('input', { type: 'checkbox', checked: r.on, 'aria-label': `做${r.name}`, onchange: (e) => { r.on = e.target.checked; renderSoon(); } }),
      h('b', {}, r.name), h('span', { class: 'dim' }, `${r.len} × ${r.wid} 公尺${ping ? `・${ping} 坪` : ''}`),
      h('button', { class: 'mini', 'aria-label': `改${r.name}`, 'aria-expanded': String(editing), onclick: () => { S.editing = editing ? null : r.id; render(); } }, editing ? '收起' : '改'));
    if (editing) {
      const name = h('input', { class: 'name', value: r.name, maxlength: 8, 'aria-label': '房間名稱' }), len = h('input', { type: 'number', inputmode: 'decimal', step: 'any', value: r.len, 'aria-label': '長（公尺）' }), wid = h('input', { type: 'number', inputmode: 'decimal', step: 'any', value: r.wid, 'aria-label': '寬（公尺）' });
      const err = h('span', { class: 'err', role: 'alert' });
      const done = () => {
        const msg = fieldError('len', len.value) || fieldError('wid', wid.value) || (!len.value || !wid.value ? '長和寬都要填' : '') || (!name.value.trim() ? '房間要有名字' : '');
        if (msg) { err.textContent = msg; return; }
        Object.assign(r, { name: name.value.trim(), len: len.value.trim(), wid: wid.value.trim() }); S.editing = null; render();
      };
      li.append(h('div', { class: 'edit' }, name, len, h('span', { class: 'note' }, '×'), wid, h('span', { class: 'note' }, '公尺'),
        h('button', { class: 'mini', onclick: done }, '完成'), h('button', { class: 'mini', onclick: () => { S.home.rooms = rooms.filter((x) => x !== r); S.editing = null; render(); } }, '刪除'), err));
    }
    return li;
  };
  app.append(h('div', { class: 'shead' }, backBtn(1, '換一張圖', () => { S.home = null; S.started = false; S.editing = null; render(); }), h('h1', {}, '你家有這些房間，對嗎？')),
    agent('我還不會自動讀平面圖。先給你三房兩廳的範本：不做的取消勾選，尺寸不對就點「改」。', { id: 'asking' }),
    h('ul', { class: 'rooms', id: 'rooms' }, ...rooms.map(row)),
    h('div', { class: 'inline' },
      h('button', { class: 'soft', id: 'addroom', onclick: () => { const id = 'r' + (Math.max(0, ...rooms.map((x) => Number(x.id.slice(1)) || 0)) + 1); rooms.push({ id, name: '新房間', len: '3', wid: '3', on: true, edits: [] }); S.editing = id; render(); } }, '＋ 加一間'),
      on.some((r) => !kindOf(r.name)) ? h('span', { class: 'note', id: 'notyet' }, `目前做得出設計的是客廳和臥室；${on.filter((r) => !kindOf(r.name)).map((r) => r.name).join('、')}先列著，還不會算進花費。`) : null));
  dock(h('div', { class: 'segm', role: 'group', 'aria-label': '屋況' }, ...AGES.map((x) => h('button', { 'aria-pressed': String(c.age === x), onclick: () => { c.age = x; c.ageSet = true; render(); } }, x))),
    cta(`對，${on.length} 間都做`, () => { S.editing = null; if (!on.some((r) => r.id === S.room && kindOf(r.name))) S.room = (on.find((r) => kindOf(r.name)) ?? on[0]).id; go(2); }, '', { id: 'roomsok', disabled: !on.length }));
}

/* ---- 2 風格：一張一張看，右滑喜歡、左滑跳過 ---- */
SCREENS[2] = () => {
  const total = DECK.length;
  const deck = h('div', { class: 'deck', role: 'group', 'aria-label': '靈感卡片，右滑喜歡、左滑跳過' });
  const count = h('span', { class: 'count', 'aria-live': 'polite' });
  const talk = agent('', { id: 'talk' });
  const liked = h('b', { class: 'grow', id: 'likedcount' });
  const skip = cta('', () => finish(), 'dark', { id: 'skip' });
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
  const finish = () => { setStyle(pickStyle(S.scores)); S.generated = false; if (multi()) enterRoom(S.room ?? S.home.rooms[0].id); go(3); };
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
    syncStage();   // 喜歡了什麼，房間就往那個風格變
    deck.replaceChildren(...DECK.slice(S.swiped, S.swiped + 3).map((p, i) => makeCard(p, i)).reverse());
    count.textContent = `${Math.min(S.swiped + 1, total)} / ${total}`;
    const reply = swipeReply({ space: S.cond.space, scores: S.scores, swiped: S.swiped, liked: S.liked, last: S.history.at(-1) });
    talk.querySelector('.bubble p').textContent = reply.text;
    skip.textContent = S.liked ? '夠了，看我家的設計' : '跳過，先用預設風格';
    liked.textContent = `已喜歡 ${S.liked} 張`;
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
    setTimeout(() => { busy = false; if (S.step !== 2) return; if (S.swiped >= total) finish(); else draw(); }, reducedMotion() ? 0 : 260);
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
  const onKey = (e) => { if (S.step !== 2) return document.removeEventListener('keydown', onKey); if (e.key === 'ArrowRight') decide(true); if (e.key === 'ArrowLeft') decide(false); };
  document.addEventListener('keydown', onKey);
  // warm the next few images so a swipe never reveals an empty card
  const preload = () => DECK.slice(S.swiped + 3, S.swiped + 6).forEach((p) => { const i = new Image(); i.referrerPolicy = 'no-referrer'; i.src = p.src2x; });
  draw();
  (window.requestIdleCallback ?? setTimeout)(preload);   // 等第一張顯示後才去暖後面幾張
  deck.addEventListener('transitionend', preload);
  dock(liked, skip);
  app.append(h('div', { class: 'shead' }, backBtn(1), h('h1', {}, '喜歡這種感覺嗎？')), talk, deck,
    h('div', { class: 'swipebar' },
      h('button', { class: 'round nope', 'aria-label': '不喜歡', onclick: () => decide(false) }, '✕'), count,
      h('button', { class: 'round like', 'aria-label': '喜歡', onclick: () => decide(true) }, '♥')),
    h('div', { class: 'inline', style: 'justify-content:center' }, undo));
};
// Fetch the 3D code and the chosen style's furniture. Called once the user reaches 我家的條件, so the
// swipe screen's own images are never competing with it for bandwidth.
const warm3D = () => load3D().then((m) => m.preload(STYLES[pickStyle(S.scores)])).catch(() => {});

/* ---- 1 你家：開場 → 整戶確認房間，或單一房間填尺寸 ---- */
SCREENS[1] = () => (!S.started ? intro() : multi() ? roomsScreen() : sizeScreen());
function sizeScreen() {
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
  const LABEL = { space: ['空間', ''], ping: ['坪數', '坪'], len: ['長', '公尺'], wid: ['寬', '公尺'], height: ['天花板高', '公尺'], age: ['屋況', ''], floors: ['建物總樓層', '層'], partition: ['隔間', ''], unitFloor: ['所在樓層', '樓'], sprinkler: ['撒水頭', ''], housing: ['房屋', ''] };
  const applySaid = (text) => {
    S.said = text.trim();
    if (!S.said) { S.heard = null; return renderSoon(); }
    const got = parseHome(S.said);
    S.heard = Object.entries(got).sort(([a], [b]) => (b === 'space') - (a === 'space')).map(([key, v]) => `${LABEL[key][0]} ${key === 'partition' ? (v === 'yes' ? '會動' : '不動') : key === 'sprinkler' ? (v === 'yes' ? '有' : '沒有') : key === 'housing' ? '透天' : v}${LABEL[key][1] ? ' ' + LABEL[key][1] : ''}`);
    const space = got.space; delete got.space;
    const ready = SPACE_OPTIONS.find(([name]) => name === space)?.[1];
    if (space && ready && space !== c.space) { c.space = space; S.generated = false; }
    for (const key of NUMERIC) if (key in got) setField(key, got[key]);
    if (got.age) { c.age = got.age; c.ageSet = true; }
    if (got.partition) c.partition = got.partition;
    if (got.sprinkler) c.sprinkler = got.sprinkler;
    if (got.housing) c.housing = got.housing;
    const p = pingFromDims(c.len, c.wid);
    if (p && (got.len || got.wid)) {
      c.ping = String(p); delete S.bad.ping;
      if (got.ping && Number(got.ping) !== p) S.heard.push(`坪數依長寬換算為 ${p} 坪`);
    }
    if (space && !ready) S.heard.push(`${space}還沒開放，先用${c.space}示範`);
    renderSoon();
  };
  // 一個欄位的值：合理就收下，不合理就留在欄位上並說明原因（不拿去算）
  const NUMERIC = ['ping', 'len', 'wid', 'height', 'floors', 'unitFloor'];
  const setField = (key, value) => {
    const other = key === 'unitFloor' ? c.floors : key === 'floors' ? c.unitFloor : '';
    const [unit, total] = key === 'unitFloor' ? [Number(value), Number(other)] : [Number(other), Number(value)];
    const msg = fieldError(key, value) || (String(value).trim() && other && unit > total ? '所在樓層不能高於建物總樓層' : '');
    if (msg) { S.bad[key] = { value: String(value), msg }; c[key] = ''; } else { delete S.bad[key]; c[key] = String(value).trim(); }
    return !msg;
  };
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const say = h('textarea', { id: 'say', rows: 2, placeholder: '或用一句話講', 'aria-label': '用一句話描述你家',
    onchange: (e) => { if (e.target.value.trim() !== S.said) applySaid(e.target.value); },
    // Enter 直接送出；Shift+Enter 換行；注音／拼音選字中的 Enter 不算
    onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); applySaid(say.value); } } }, S.said);
  const send = h('button', { class: 'send', id: 'saysend', 'aria-label': '送出這句話', onclick: () => applySaid(say.value) }, '→');
  const micLabel = h('span', { class: 'note', id: 'micnote', 'aria-live': 'polite' },
    S.heard === null ? ''
      : S.heard.length ? `聽到：${S.heard.join('、')}` : '沒聽出坪數或尺寸，可以再說一次，或直接填下面');
  let rec = null;
  const mic = h('button', { class: 'mic', id: 'mic', 'aria-label': '用說的', 'aria-pressed': 'false', disabled: !Recognition,
    onclick: () => {
      if (rec) return rec.stop();
      rec = new Recognition(); rec.lang = 'zh-TW'; rec.interimResults = true;
      mic.setAttribute('aria-pressed', 'true'); micLabel.textContent = '正在聽…說完再按一次（聲音由瀏覽器的語音服務處理）';
      rec.onresult = (e) => { say.value = [...e.results].map((r) => r[0].transcript).join(''); };
      rec.onerror = (e) => { rec = null; mic.setAttribute('aria-pressed', 'false'); micLabel.textContent = e.error === 'not-allowed' ? '沒有麥克風權限，請直接打一句話' : '沒聽清楚，再試一次或直接打字'; };
      rec.onend = () => { if (!rec) return; rec = null; if (S.step === 2) applySaid(say.value); };
      rec.start();
    } }, fromHTML('<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'));
  const field = (key, label, unit, attrs = {}) => h('label', { class: 'field' }, h('span', {}, label),
    h('input', { type: 'number', inputmode: 'decimal', step: 'any', value: S.bad[key]?.value ?? c[key], id: 'f-' + key, placeholder: '—', ...attrs,
      'aria-invalid': S.bad[key] ? 'true' : false, 'aria-describedby': S.bad[key] ? 'e-' + key : false,
      oninput: (e) => { if (!S.bad[key]) return; e.target.removeAttribute('aria-invalid'); $('#e-' + key)?.remove(); },   // 一改就先收起舊的錯誤，改完再檢查
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
    if (!wrong) { S.generated = false; return go(2); }
    render();                                   // 有填錯的欄位：不前進，帶到那一格並說明原因
    const el = $('#f-' + wrong); el.focus(); el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  };
  // 一個畫面只問一件事：設計師問一句，答案就在那句話下面；完整欄位與參考圖收起來，要的人再打開
  const q = nextQuestion(c), formOpen = S.formOpen || NUMERIC.some((key) => S.bad[key]);
  const chipsFor = (key, opts) => h('div', { class: 'inline ask', role: 'group' }, ...opts.map(([v, label]) => h('button', { class: 'chip', onclick: () => { c[key] = v; if (key === 'age') c.ageSet = true; render(); } }, label)));
  const quick = formOpen || !q.key ? null
    : q.key === 'len' ? h('div', { class: 'quick' }, h('div', { class: 'fields two' }, field('len', '長', '公尺'), field('wid', '寬', '公尺')), ...errors('len', 'wid'))
      : q.key === 'height' ? h('div', { class: 'quick' }, h('div', { class: 'fields two' }, field('height', '天花板高', '公尺')), ...errors('height'))
        : q.key === 'age' ? chipsFor('age', AGES.map((x) => [x, x]))
          : askInline(q.key);
  const form = !formOpen ? [] : [
    h('div', { class: 'meter', role: 'group', 'aria-label': '基本資料完整度' },
      h('div', { class: 'bar' }, h('i', { style: `width:${pct}%` })),
      h('div', { class: 'chips' }, ...k.items.map((i) => h('span', { class: 'tick' + (i.done ? ' done' : '') }, (i.done ? '✓ ' : '＋ ') + i.label))),
      h('p', { class: 'note', id: 'onsite' }, '填滿也只是基本資料：門窗、柱位、既有水電要現場確認。')),
    h('div', { class: 'cardbox' }, h('b', {}, '空間'),
      h('div', { class: 'fields' }, field('ping', '坪數', '坪'), field('len', '長', '公尺'), field('wid', '寬', '公尺'), field('height', '天花板高', '公尺')),
      ...errors('ping', 'len', 'wid', 'height'),
      dimsPing ? h('p', { class: 'note', id: 'pingnote' }, `依長 × 寬換算為 ${dimsPing} 坪。`) : null,
      h('div', { class: 'inline' }, h('span', { class: 'note' }, '屋況'), ...AGES.map((x) => h('button', { class: 'chip', 'aria-pressed': String(c.ageSet && c.age === x), onclick: () => { c.age = x; c.ageSet = true; render(); } }, x)))),
    h('div', { class: 'cardbox' }, h('b', {}, '建物'),
      h('div', { class: 'inline', role: 'group', 'aria-label': '房屋類型' }, h('span', { class: 'note' }, '房屋類型'),
        ...[['apt', '公寓／大樓'], ['house', '透天獨棟']].map(([v, label]) => h('button', { class: 'chip', id: 'house-' + v, 'aria-pressed': String((c.housing || 'apt') === v), onclick: () => { c.housing = v; render(); } }, label))),
      h('div', { class: 'fields' }, field('floors', '建物總樓層', '層', { step: 1 }), c.housing === 'house' ? null : field('unitFloor', '你家在第幾樓', '樓', { step: 1 })),
      ...errors('floors', 'unitFloor'),
      h('div', { class: 'inline', role: 'group', 'aria-label': '天花板有撒水頭嗎' }, h('span', { class: 'note' }, '天花板有撒水頭嗎'),
        ...[['yes', '有'], ['no', '沒有']].map(([v, label]) => h('button', { class: 'chip', id: 'spr-' + v, 'aria-pressed': String(c.sprinkler === v), onclick: () => { c.sprinkler = c.sprinkler === v ? '' : v; render(); } }, label))),
      h('div', { class: 'inline', role: 'group', 'aria-label': '會動隔間嗎' }, h('span', { class: 'note' }, '會動隔間或加廁所浴室嗎'),
        ...[['yes', '會'], ['no', '不會']].map(([v, label]) => h('button', { class: 'chip', id: 'part-' + v, 'aria-pressed': String(c.partition === v), onclick: () => { c.partition = c.partition === v ? '' : v; render(); } }, label))))];
  const docsCard = !(S.docsOpen || S.docs.length || S.docError) ? null : h('div', { class: 'cardbox' }, h('b', {}, '參考圖'),
    h('p', { class: 'note', id: 'docsrole' }, '留給專業團隊看；目前不會被自動判讀，不會改變 3D 或金額。檔案只留在你的瀏覽器。'),
    input, drop,
    S.docError ? h('p', { class: 'err', role: 'alert' }, S.docError) : h('span', { hidden: true }),
    S.docs.length ? list : h('span', { hidden: true }));
  dock(cta(pct ? '下一步：挑風格' : '先跳過，挑風格', start, '', { id: 'generate' }));
  app.append(...[h('div', { class: 'shead' }, backBtn(1, '上一步', () => { S.started = false; render(); }), h('h1', {}, `你家${c.space}大概多大？`)),
    agent(q.text, { id: 'asking' }), quick,
    h('div', { class: 'voice' }, mic, h('div', { class: 'voicebody' }, say, micLabel), send),
    h('div', { class: 'inline more' },
      h('b', { id: 'score' }, `基本資料完整度 ${pct}%`),
      h('button', { class: 'link', id: 'openform', 'aria-expanded': String(formOpen), onclick: () => { S.formOpen = !formOpen; render(); } }, formOpen ? '收起欄位' : '自己填欄位'),
      docsCard ? null : h('button', { class: 'link', id: 'opendocs', onclick: () => { S.docsOpen = true; render(); } }, '附參考圖')),
    S.lostDocs && !S.docs.length ? h('p', { class: 'err', id: 'lostdocs' }, '重新整理後，先前附的圖要再附一次。') : null,
    ...form, docsCard,
    ].filter(Boolean));   // DOM 的 append 會把 null 印成字，先濾掉
};

/* ---- 3 3D 成品 ---- */
SCREENS[3] = () => {
  if (!S.cond.style) setStyle(pickStyle(S.scores));
  S.generated = true;
  // 整戶：下一間與整戶花費放在貼底的動作列
  const nextRoom = () => { const on = S.home.rooms.filter((r) => r.on), i = on.findIndex((r) => r.id === S.room); return on[(i + 1) % on.length]; };
  const dockHome = () => { const n = nextRoom(); dock(n && n.id !== S.room ? h('button', { class: 'soft', id: 'nextroom', onclick: () => { enterRoom(n.id); render(); app.scrollTop = 0; } }, `下一間：${n.name}`) : null, cta('看整戶要花多少', () => go(4), '', { id: 'tocost' })); };
  if (multi() && S.tab === 'all') {
    const home = homeNow();
    dockHome();
    return app.append(h('div', { class: 'shead' }, backBtn(2), h('h1', {}, '整個家')),
      agent('點平面圖或上面的房間，一間一間看。', { id: 'designer' }),
      h('ul', { class: 'rooms' }, ...home.rows.map((x) => h('li', {}, h('b', {}, x.name), h('span', { class: 'dim' }, x.ping ? `${x.ping} 坪` : ''),
        x.est ? h('button', { class: 'mini', onclick: () => { enterRoom(x.id); render(); } }, '看設計') : h('span', { class: 'note' }, '還沒開放')))));
  }
  if (multi() && !roomOK()) {
    dockHome();
    return app.append(h('div', { class: 'shead' }, backBtn(2), h('h1', {}, curRoom().name)),
      agent(`${curRoom().name}的設計還沒開放。目前做得出客廳和臥室，其餘空間之後補上。`, { id: 'designer' }));
  }
  const c = S.cond, current = look(), est = estimateNow(), size = roomSize(c, est.ping);
  const findings = findingsNow(), summary = regSummary(findings);
  // 改細節是開關：再按一次就取消。每一步都留著，可以復原。
  const done = S.versions[S.v].edits ?? [];
  const editLabel = (i) => (c.space === '臥室' ? EDITS[i][0].replace('沙發', '床頭') : EDITS[i][0]);
  const actions = (fs) => fs.filter((f) => f.law && f.state === 'action').map((f) => f.title);
  const edit = (i) => {
    const on = !done.includes(i), edits = on ? [...done, i] : done.filter((x) => x !== i);
    S.versions = [...S.versions.slice(0, S.v + 1), { look: edits.reduce((l, n) => EDITS[n][1]({ ...l }), { ...STYLES[c.style] }), edits }];
    S.v = S.versions.length - 1;
    // 改完回一句：錢差多少、法規上多了或少了什麼
    S.note = editReply({ label: editLabel(i), on, before: est, after: estimateNow(), legalBefore: actions(findings), legalAfter: actions(findingsNow()) });
    render();
  };
  // 用說的改：聽得懂的就是上面那幾個修改和六種風格；聽不懂就照實說
  const told = (text) => {
    if (!text.trim()) return;
    const got = parseEdit(text, EDITS.map((_, i) => editLabel(i)));
    const todo = got.edits.filter((e) => done.includes(e.edit) !== e.on), said = [];
    if (got.style && got.style !== c.style) { setStyle(got.style); said.push(`好，換成${STYLES[got.style].name}。`); }
    else if (todo.length) {
      const edits = todo.reduce((list, e) => (e.on ? [...list, e.edit] : list.filter((x) => x !== e.edit)), done);
      S.versions = [...S.versions.slice(0, S.v + 1), { look: edits.reduce((l, n) => EDITS[n][1]({ ...l }), { ...STYLES[c.style] }), edits }];
      S.v = S.versions.length - 1;
      said.push(editReply({ label: todo.map((e) => (e.on ? editLabel(e.edit) : `取消「${editLabel(e.edit)}」`)).join('、'), on: true, before: est, after: estimateNow(), legalBefore: actions(findings), legalAfter: actions(findingsNow()) }));
    } else if (got.edits.length) said.push('這個已經是你要的樣子了。');
    // 聽不懂的每一段都說出來，不悄悄略過
    if (got.unknown.length) said.push(`${got.unknown.map((u) => `「${u}」`).join('、')}我還不會改，目前能改的是上面那幾項和風格。`);
    S.note = said.join(''); render();
  };
  const tell = h('input', { type: 'text', id: 'tell', class: 'tell', placeholder: '或直接說：我不要地毯', 'aria-label': '用說的改設計', enterkeyhint: 'send',
    onkeydown: (e) => { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) told(e.target.value); } });
  const notes = designNotes(c, current, roomLayout({ ...size, space: c.space }), S.reasons);
  app.append(
    h('div', { class: 'panel' },
      h('div', { class: 'shead' }, backBtn(2), h('h1', {}, `${roomLabel()}・${STYLES[c.style].name}`)),
      agent(S.note || notes[0], { id: 'designer' }),
      h('details', { class: 'whyso', id: 'whyso', open: S.whyOpen, ontoggle: (e) => { S.whyOpen = e.target.open; } }, h('summary', {}, '為什麼這樣配'), h('ul', {}, ...notes.map((t) => h('li', {}, t)))),
      h('div', { class: 'tweak' }, h('div', { class: 'tweakhead' }, h('b', {}, '換風格'), multi() ? h('span', { class: 'note' }, '整個家一起換') : null),
        // 三色色票（牆、地板、沙發）加名稱
        h('div', { class: 'styles' }, ...SWIPE_ORDER.map((k) => h('button', { class: 'styleopt', 'aria-pressed': String(c.style === k), onclick: () => { keepEdits(); setStyle(k); S.note = `好，${multi() ? '整個家' : ''}換成${STYLES[k].name}。`; render(); } },
          h('span', { 'aria-hidden': 'true' }, h('i', { style: `background:${STYLES[k].wall}` }), h('i', { style: `background:${STYLES[k].floor}` }), h('i', { style: `background:${STYLES[k].sofa}` })), STYLES[k].name)))),
      h('div', { class: 'tweak' }, h('b', {}, '改細節'),
        h('div', { class: 'chips' }, ...EDITS.map((_, i) => h('button', { class: 'chip', 'aria-pressed': String(done.includes(i)), onclick: () => edit(i) }, editLabel(i)))),
        S.v > 0 ? h('p', { class: 'note', id: 'edits' }, done.length ? `已改 ${done.length} 項，再按一次可取消。` : '已回到原本的設計。', ' ',
          h('button', { class: 'link', id: 'undoedit', onclick: () => { S.versions = S.versions.slice(0, S.v); S.v -= 1; S.note = '好，復原了上一步。'; render(); } }, '↩ 復原上一步')) : null,
        h('div', { class: 'tellrow' }, tell, h('button', { class: 'send', 'aria-label': '送出修改', onclick: () => told(tell.value) }, '→'))),
      multi() ? null : h('p', { class: 'note', id: 'ctx' }, `這個房間：${size.w} × ${size.d} 公尺、高 ${size.h} 公尺（${est.ping} 坪${est.assumedPing ? '，預設' : ''}）。門窗、柱位待現場確認。`,
        size.clamped ? '這個尺寸放不下一張沙發或超過 60 公尺，3D 取了最接近的大小。' : '', ' ', h('button', { class: 'link', onclick: () => go(1) }, c.len && c.wid ? '修改尺寸' : '填你家的尺寸')),
      multi() ? null : h('p', { class: 'note', id: 'assume' }, `以 ${est.ping} 坪${est.assumedPing ? '（預設）' : ''}、${c.age}${c.ageSet ? '' : '（預設）'}估算。`,
        est.assumedPing || !c.ageSet ? '坪數和屋況會讓金額差很多，' : '', h('button', { class: 'link', onclick: () => go(1) }, est.assumedPing || !c.ageSet ? '填我家的' : '修改')),
      h('div', { class: 'regbox' + (S.regsOpen ? ' open' : ''), id: 'regbox' },
        h('button', { class: 'regsum', id: 'regsum', 'aria-expanded': String(S.regsOpen), 'aria-controls': 'regdetail', onclick: () => { S.regsOpen = !S.regsOpen; render(); } },
          h('span', { class: 'dot ' + summary.permit, 'aria-hidden': 'true' }), h('span', {}, summary.text), h('span', { class: 'chev', 'aria-hidden': 'true' }, S.regsOpen ? '收起' : '看細節')),
        S.regsOpen ? h('div', { id: 'regdetail' }, regsList(findings), h('p', { class: 'note' }, REG_NOTE)) : null),
      ...findings.filter((f) => f.state === 'conflict').map((f) => h('p', { class: 'warn', role: 'status' }, h('b', {}, `${f.title}：`), f.detail)),
      ));
  if (multi()) dockHome(); else dock(cta('看要花多少', () => go(4), '', { id: 'tocost' }));
};

/* ---- 4 估價與施工圖 ---- */
SCREENS[4] = () => {
  if (multi() && !roomOK()) { const ok = S.home.rooms.find((r) => r.on && kindOf(r.name)); if (ok) enterRoom(ok.id); }   // 下面的圖面與法規看的是做得出設計的那一間
  const c = S.cond, current = look(), est = estimateNow(), k = knowledge();
  const max = Math.max(...est.items.map((i) => i.high));
  const setPing = (v) => { c.ping = String(Math.max(1, Math.round(v))); render(); };
  const money = h('div', { class: 'cardbox' },
    h('p', { class: 'note' }, `照這個設計做，預估花費`),
    h('p', { class: 'badge', id: 'estkind' }, est.assumedPing || !c.ageSet ? '範例估算，非正式報價' : '初步估算，非正式報價'),
    h('p', { class: 'note', id: 'know' }, `基本資料完整度 ${Math.round(k.score * 100)}%${est.narrowed ? `，區間已收窄 ${Math.round(est.narrowed * 100)}%` : ''}。`, ' ', h('button', { class: 'link', onclick: () => go(2) }, k.score < 1 ? '補條件讓它更準' : '修改條件')),
    h('p', { class: 'big', id: 'total' }, `${est.low}–${est.high} 萬`),
    h('p', { class: 'note', id: 'assume4' }, `假設：${est.ping} 坪${est.assumedPing ? '（預設，你還沒填）' : ''}、${c.age}${c.ageSet ? '' : '（預設，你還沒選）'}、中等建材、不動格局${c.noFurniture ? '、不含家具軟裝' : ''}。`),
    h('div', { class: 'inline' },
      // 有填長寬時坪數由長寬決定：顯示實際尺寸並連回去改，不提供會把長寬清掉的加減鈕
      c.len && c.wid ? h('span', { class: 'chip ghost', id: 'ping' }, `${est.ping} 坪・${c.len} × ${c.wid} 公尺 `, h('button', { class: 'link', onclick: () => go(1) }, '修改'))
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
    h('div', { class: 'unlockrow' }, h('h2', {}, multi() ? `${roomLabel()}的施工圖初稿${S.unlocked ? '（已解鎖）' : ''}` : !mine ? '施工圖初稿（範例）' : S.unlocked ? '你家尺寸的施工圖初稿（已解鎖）' : '你家尺寸的施工圖初稿'),
      !mine ? h('span', { class: 'note' }, '6 張・點任一張放大看') : S.unlocked ? null : h('span', { class: 'note' }, '6 張・付費後清晰可放大、可下載')),
    h('p', { class: 'note', id: 'docsnote' }, !mine ? `這是範例空間的圖，讓你先看會拿到什麼。要產生你家的，還缺：${missing.join('、')}（手動填寫；上傳的平面圖目前不會被自動判讀）。`
      : `依你填的 ${c.len || '—'} × ${c.wid || '—'} 公尺配置。${docs.total ? `已附 ${docs.text}，留給專業團隊確認時參考。` : ''}`),
    h('div', { class: 'sheets' }, ...sheets.map((s) => h('button', { class: 'sheetbtn', 'aria-label': `${s.title}${!mine ? '（範例），點擊放大' : S.unlocked ? '，點擊放大' : '（未解鎖）'}`, onclick: () => open(s) },
      fromHTML(s.svg), h('span', { class: 'tag' }, !mine ? `${s.title}・範例` : s.title), mine && !S.unlocked ? h('span', { class: 'lock', 'aria-hidden': 'true' }, '🔒') : null))),
    !mine ? h('button', { class: 'chip', id: 'makemine', onclick: () => go(1) }, `產生我家的初稿（還缺${missing.join('、')}）`) : null,
    h('b', {}, '從初稿到可以施工'), stages);
  // 法規與施工條件評估：和 3D 頁同一份清單，這裡完整列出
  const regs = h('div', { class: 'cardbox', id: 'regs' },
    h('h2', {}, '法規與施工條件'),
    h('button', { class: 'regsum', id: 'regline', 'aria-expanded': String(S.regsOpen), onclick: () => { S.regsOpen = !S.regsOpen; render(); } },
      h('span', {}, regSummary(findings).text), h('span', { class: 'chev', 'aria-hidden': 'true' }, S.regsOpen ? '收起' : '看細節')),
    ...(S.regsOpen ? [regsList(findings), h('p', { class: 'note' }, REG_NOTE)] : []));
  // 下一步：把需求和方案帶走。存下來、和家人討論，或交給自己的設計師
  const summary = () => summaryText({ cond: c, look: current, edits: (S.versions[S.v].edits ?? []).map((i) => (c.space === '臥室' ? EDITS[i][0].replace('沙發', '床頭') : EDITS[i][0])),
    size: roomSize(c, est.ping), est, findings, reasons: S.reasons, score: k.score, link: `${location.origin}${location.pathname}#${toShare(S)}`, date: new Date().toISOString().slice(0, 10) });
  const copied = h('span', { class: 'note', 'aria-live': 'polite' });
  const takeaway = h('div', { class: 'cardbox', id: 'takeaway' },
    h('h2', {}, '把這個方案帶走'),
    h('p', { class: 'note' }, '需求、條件、估價和要辦的事整理成一份摘要，可以和家人討論，或交給你的設計師。'),
    h('div', { class: 'inline' },
      h('button', { class: 'btn', id: 'exportsum', onclick: () => {
        const a = h('a', { href: URL.createObjectURL(new Blob([summary()], { type: 'text/plain;charset=utf-8' })), download: 'home-design-summary.txt' });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); copied.textContent = '已下載';
      } }, '下載方案摘要'),
      h('button', { class: 'btn ghost', id: 'copysum', onclick: async () => { try { await navigator.clipboard.writeText(summary()); copied.textContent = '已複製，可以直接貼到訊息裡'; } catch { copied.textContent = '複製不了，請用下載'; } } }, '複製文字'),
      copied));
  if (multi()) {
    // 整戶：合計、依房間／依工項，取消勾選就先不做那一間
    const home = homeNow(), rooms = S.home.rooms, open = home.rows.filter((x) => !x.est).map((x) => x.name);
    const byRoom = h('ul', { class: 'rooms', id: 'byroom' }, ...home.rows.map((x) => h('li', {},
      h('input', { type: 'checkbox', checked: true, 'aria-label': `做${x.name}`, onchange: () => { rooms.find((r) => r.id === x.id).on = false; renderSoon(); } }),
      h('b', {}, x.name), h('small', { class: 'note' }, x.ping ? `${x.ping} 坪` : ''), x.est ? h('span', { class: 'amt' }, `${x.est.low}–${x.est.high} 萬`) : h('span', { class: 'dim' }, '還沒開放'))),
      ...rooms.filter((r) => !r.on).map((r) => h('li', {}, h('input', { type: 'checkbox', checked: false, 'aria-label': `做${r.name}`, onchange: () => { r.on = true; renderSoon(); } }), h('b', { style: 'color:var(--muted)' }, r.name), h('span', { class: 'dim' }, '先不做'))));
    const byItem = h('ul', { class: 'items', id: 'byitem' }, ...home.items.map((i) => h('li', {}, h('b', {}, i.name), h('span', { class: 'amt' }, `${i.low}–${i.high} 萬`))));
    app.append(h('div', { class: 'shead' }, backBtn(3, '回到設計'), h('p', { class: 'note' }, '整個家照這個設計做，大約要花'),
      h('div', { class: 'total' }, h('h1', { class: 'big', id: 'total' }, `${home.low}–${home.high}`, h('small', {}, '萬')), h('span', { class: 'badge', id: 'estkind' }, '範例估算，非正式報價')),
      h('p', { class: 'note', id: 'assume4' }, `${homeTitle(rooms)}・${c.age}${c.ageSet ? '' : '（預設）'}。`, open.length ? `${open.join('、')}的設計還沒開放，沒有算進合計。` : '')),
      h('div', { class: 'segm', role: 'group', 'aria-label': '怎麼看' }, ...[['room', '依房間'], ['item', '依工項']].map(([v, label]) => h('button', { 'aria-pressed': String(S.costTab === v), onclick: () => { S.costTab = v; render(); } }, label))),
      S.costTab === 'item' ? byItem : byRoom,
      h('p', { class: 'note' }, '取消勾選就先不做那一間，合計馬上更新。參考行情量級，不含家電與設計監工費。'),
      drawings, regs);
    return dock(h('p', { class: 'note' }, '整戶施工圖是 AI 初稿；專業團隊確認的流程還在確認中。'),
      S.unlocked ? null : cta('解鎖整戶施工圖', () => { $('#unlockprice').replaceChildren('價格待定 ', h('small', {}, '原型不會扣款')); $('#unlock').showModal(); }, '', { id: 'unlockhome' }));
  }
  app.append(h('div', { class: 'shead' }, backBtn(3), h('h1', {}, '估價與施工圖初稿')),
    h('div', { class: 'two' }, money, drawings),
    regs, takeaway);
  if (!S.unlocked) dock(mine ? cta('解鎖我家的施工圖初稿　NT$ 1,990', () => $('#unlock').showModal(), '', { id: 'unlockmine' }) : cta('填我家的長寬，產生我家的初稿', () => go(1), '', { id: 'needhome' }));
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
  S.step = 3; S.reached = 4; S.swiped = 0; S.started = true;
  history.replaceState(null, '', location.pathname);
}
render();
