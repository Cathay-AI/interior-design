/* 回家之前 mock prototype.
 * Everything runs in the browser: rooms are drawn from palettes, the preference model is a
 * small Bayesian logistic (Bradley–Terry) learner with expected-information pair selection,
 * and voice uses the Web Speech API only when the browser offers it. No network calls. */
(() => {
'use strict';

// ---------- small helpers ----------
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sig = z => 1 / (1 + Math.exp(-z));
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const sub = (a, b) => a.map((x, i) => x - b[i]);
function hexToRgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
function rgbToHex(c) { return '#' + c.map(x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join(''); } // taste-skill-ignore: hex colour digits, not index labels
function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((x, i) => x + (B[i] - x) * t)); }
function shade(h, amt) { return amt >= 0 ? mix(h, '#ffffff', amt) : mix(h, '#000000', -amt); }
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let uid = 0;

// ---------- catalogues ----------
const DIMS = [
  { name: '溫度', lo: '冷調', hi: '暖調' },
  { name: '裝飾', lo: '極簡', hi: '豐富' },
  { name: '光線', lo: '沉穩', hi: '明亮' },
];
const { JP, NO, RE, IN, MO, FR, LX, KR, MC, WB, LOOKS, LOOK_CAMS, FURN, SLOT_N, designX, lookX, MODELS, FLOORS, WALLS, SOFAS, RUGS, CURTAINS, LAMPS, PARTS, PART, CLASH, COST, STYLES } = window.HB_CATALOG;
const PERSONAS = {
  'solo-few-tidy-am': ['晨光窩居者', '週六七點，窗邊已有一杯咖啡', ['獨處角落', '窗邊座位']],
  'solo-few-tidy-pm': ['深夜極簡師', '半夜擦桌子是我的冥想', ['精簡收納', '分區調光']],
  'solo-few-loose-am': ['隨手日光客', '東西不多，但都不在該在的地方', ['隨手放置區', '透光窗簾']],
  'solo-few-loose-pm': ['月光遊牧人', '家就是一張床和充電線', ['獨處角落', '遮光窗簾']],
  'solo-keep-tidy-am': ['書櫃收藏家', '每本書都有位置，雖然還沒讀', ['展示牆', '窗邊閱讀']],
  'solo-keep-tidy-pm': ['夜間策展人', '凌晨兩點還在調公仔的角度', ['展示牆', '重點照明']],
  'solo-keep-loose-am': ['晨間尋寶人', '每天早上都在找鑰匙', ['門片收納', '玄關放置區']],
  'solo-keep-loose-pm': ['洞穴藏寶龍', '亂？我知道每樣東西在哪', ['大量門片收納', '分區調光']],
  'social-few-tidy-am': ['開放式主人', '客人走後十分鐘恢復原狀', ['開放客餐廳', '固定收納']],
  'social-few-tidy-pm': ['微醺吧台長', '家裡沒什麼，但吧台很齊', ['吧台區', '分區調光']],
  'social-few-loose-am': ['早午餐號召人', '十點揪人，九點五十才開始收', ['開放客餐廳', '門片遮亂']],
  'social-few-loose-pm': ['沙發收容所長', '朋友的第二個家，沙發隨時可睡', ['多人座位', '遮光窗簾']],
  'social-keep-tidy-am': ['招待所主委', '杯子分客用和更客用', ['多人座位', '展示櫃']],
  'social-keep-tidy-pm': ['派對總務長', '燈光有三種模式，還有遙控器', ['多人座位', '情境燈光']],
  'social-keep-loose-am': ['熱鬧大家長', '什麼都有，找得到算你厲害', ['開放客餐廳', '大量門片收納']],
  'social-keep-loose-pm': ['暖爐聚會家', '永遠有人留到最後一班車', ['多人座位', '氣氛燈光']],
};
const OPPOSITE = { solo: 'social', social: 'solo', few: 'keep', keep: 'few', tidy: 'loose', loose: 'tidy', am: 'pm', pm: 'am' };
const TRAIT_LABEL = { solo: '獨處充電', social: '有人充電', few: '少而精', keep: '捨不得丟', tidy: '要歸位', loose: '亂中有序', am: '晨型', pm: '夜貓' };
const QUIZ = [
  { k: 'charge', eyebrow: '充電方式 → 決定格局', scene: '聚會散場。你推開家門，屋裡只剩你一個人。', q: '接下來，你會做什麼？', a: [
    ['關燈，世界終於安靜', 'solo', '私密角落'], ['馬上開群組聊八卦', 'social', '開放客廳'],
    ['再揪一攤來家裡', 'social', '多人座位'], ['泡澡、追一集劇才睡', 'solo', '調光燈具'],
    ['窩進角落看書，誰都別吵', 'solo', '獨處角落'], ['開視訊，跟朋友邊聊邊收', 'social', '開放客廳']] },
  { k: 'items', eyebrow: '物品關係 → 決定收納量', scene: '搬家前一晚，紙箱堆在客廳。', q: '你打包的樣子是？', a: [
    ['一小時收完，東西本來就不多', 'few', '多留白'], ['每一箱都寫「重要」', 'keep', '加大收納'],
    ['順便丟掉一半', 'few', '精簡收納'], ['舊票根也要包起來', 'keep', '展示位置'],
    ['只留一箱，其他全捐', 'few', '極簡收納'], ['再買一批收納箱來裝', 'keep', '大量門片收納']] },
  { k: 'rhythm', eyebrow: '整理節奏 → 決定收納形式', scene: '出門前五分鐘，你在找鑰匙。', q: '鑰匙通常在哪？', a: [
    ['門口固定的小盤子', 'tidy', '固定位置'], ['昨天的外套口袋', 'loose', '隨手放置區'],
    ['包包、桌上、沙發縫都有可能', 'loose', '門片遮亂'], ['掛勾上，標籤朝外', 'tidy', '開放層架'],
    ['玄關抽屜第二格', 'tidy', '玄關收納'], ['問家人，每次都是他找到', 'loose', '玄關放置區']] },
  { k: 'time', eyebrow: '生活時段 → 決定光線', scene: '難得的週六，沒有任何行程。', q: '你最舒服的時段是？', a: [
    ['七點，窗邊一杯咖啡', 'am', '窗邊座位'], ['半夜，全世界都睡了', 'pm', '遮光窗簾'],
    ['早市逛完回來補眠', 'am', '透光窗簾'], ['晚上十一點才開始做事', 'pm', '分區調光'],
    ['六點去跑步，回來沖澡', 'am', '晨光座位'], ['中午起床，下午泡茶最舒服', 'pm', '午後採光']] },
  { k: 'charge', id: 'charge2', q: '你的第一個反應是？', a: [
    ['已讀，假裝沒看到', 'solo', '私密角落'], ['秒回：我要去！', 'social', '開放客廳'],
    ['問大家能不能改來我家', 'social', '多人座位'], ['想去，但十點前要回家', 'solo', '調光燈具'],
    ['今晚只想跟貓講話', 'solo', '獨處角落'], ['順便揪更多人', 'social', '多人座位']] },
  { k: 'items', id: 'items2', q: '它最後會在哪？', a: [
    ['隔週就轉送', 'few', '多留白'], ['收進櫃子，捨不得丟', 'keep', '加大收納'],
    ['擺出來當紀念', 'keep', '展示位置'], ['拍照留念，然後捐掉', 'few', '精簡收納'],
    ['放進「之後再說」那箱', 'keep', '大量門片收納'], ['直接問能不能換', 'few', '極簡收納']] },
  { k: 'rhythm', id: 'rhythm2', q: '你會怎麼做？', a: [
    ['睡前一定收乾淨', 'tidy', '固定位置'], ['推到一邊，明天再說', 'loose', '隨手放置區'],
    ['全部丟進一個籃子', 'loose', '門片遮亂'], ['每樣放回原位，順便擦桌子', 'tidy', '開放層架'],
    ['等朋友要來才收', 'loose', '玄關放置區'], ['掃地機器人出動前先收', 'tidy', '玄關收納']] },
  { k: 'time', id: 'time2', q: '這時候你在做什麼？', a: [
    ['早就上床了', 'am', '透光窗簾'], ['正要開始追劇', 'pm', '遮光窗簾'],
    ['剛從外面回來', 'pm', '分區調光'], ['準備明天的早餐', 'am', '晨光座位'],
    ['在燈下畫畫、做手工', 'pm', '重點照明'], ['敷完面膜準備睡', 'am', '窗邊座位']] },
];
// Each trait is asked twice; the persona takes the majority, and a tie goes to the later answer.
function traitsFromVotes() {
  const V = S.quiz.votes || {}, out = { ...S.quiz.ans };
  for (const [k, list] of Object.entries(V)) { const c = {}; list.forEach(v => { c[v] = (c[v] || 0) + 1; }); const best = Math.max(...Object.values(c)); out[k] = [...list].reverse().find(v => c[v] === best); }
  return out;
}
const CONFLICT = {
  charge: ['門要隔音組', '週五晚上誰說了算', '臥室隔音、客廳調光'],
  items: ['收納協商組', '儲藏室到底歸誰', '加大收納、各自分區'],
  rhythm: ['歸位大作戰組', '東西到底要不要歸位', '門片遮亂、隨手放置區'],
  time: ['日夜交班組', '早上幾點可以開大燈', '遮光窗簾、分區調光'],
};
const REF_BOARDS = [
  { n: '木質溫暖', x: [.8, -.4, .5], c: ['#d9c09a', '#f5ede0', '#b98f60'] },
  { n: '黑白俐落', x: [-.8, -.6, .3], c: ['#2f3236', '#f2f2ef', '#a7a39b'] },
  { n: '復古花樣', x: [.6, .8, -.2], c: ['#9b4a35', '#d9a687', '#4f6b58'] },
  { n: '奶油柔和', x: [.5, -.3, .8], c: ['#f3e6d3', '#fffaf0', '#d8c3a5'] },
  { n: '工業粗獷', x: [-.5, .1, -.7], c: ['#3b3b3b', '#8a8580', '#7a4b2e'] },
  { n: '自然綠意', x: [.3, .1, .5], c: ['#c9d3c3', '#8c9b7a', '#e8dcc8'] },
  { n: '海島藍白', x: [-.3, .1, .8], c: ['#2e4a7d', '#fbfaf6', '#c9b48f'] },
  { n: '金屬奢華', x: [0, .7, -.1], c: ['#e5d9c3', '#b08d57', '#2b2b2b'] },
];

// ---------- image pool for the preference engine ----------
// One taste vector per curated look in the catalog.
const POOL = LOOKS.map(lookX), TRAIN = POOL.map((_, i) => i);

function paletteFromAttrs(x) {
  const t = (x[0] + 1) / 2, L = x[2];
  const lift = c => shade(c, L >= 0 ? L * .12 : L * .45);
  return {
    floor: shade(mix('#8a8d90', '#d6b384', t), L * .12), wall: lift(mix('#e3e6e6', '#f5ecdc', t)),
    sofa: shade(mix('#5d6670', '#c4a079', t), L * .15), rug: mix('#c9cdd0', '#e8d6b8', t), table: mix('#2f3236', '#9c6b3f', t),
    win: L < -.3 ? '#7e98a6' : '#9ac1d1', deco: Math.round((x[1] + 1) * 1.5), plant: x[1] > -.6 || x[0] > .3,
  };
}
function describe(x) {
  const w = x[0] > .3 ? '暖色木質' : x[0] < -.3 ? '冷調灰階' : '中性色調';
  const d = x[1] > .3 ? '層次豐富' : x[1] < -.3 ? '低裝飾' : '適度裝飾';
  const l = x[2] > .3 ? '明亮' : x[2] < -.3 ? '暗調' : '一般採光';
  return `${w}、${d}、${l}的客廳`;
}

// ---------- isometric room (adapted from the deck's room art) ----------
function room(p, { title = '客廳示意', dusk = false, storage = false } = {}) {
  const id = 'r' + (++uid);
  const S = c => shade(c, -.08), T = c => shade(c, -.16);
  const deco = p.deco || 0;
  let frames = '';
  if (deco >= 1) frames += `<polygon points="92,232 138,205 138,243 92,270" fill="#fff" stroke="${shade(p.table, -.1)}" stroke-width="3"/><polygon points="98,236 132,216 132,240 98,260" fill="${mix(p.sofa, '#9ac1d1', .5)}"/>`;
  if (deco >= 2) frames += `<polygon points="150,198 186,177 186,207 150,228" fill="#fff" stroke="${shade(p.table, -.1)}" stroke-width="3"/><polygon points="155,201 181,186 181,204 155,219" fill="${mix(p.rug, '#c9a56a', .4)}"/>`;
  if (deco >= 3) frames += `<path d="M40 330 225 220M225 220 440 340" stroke="#c9a56a" stroke-width="4" opacity=".8"/><polygon points="169,374 253,325 333,372 250,420" fill="none" stroke="#c9a56a" stroke-width="5" opacity=".7"/>`;
  const curtain = p.curtain ? `<path d="M292 134 421 206" stroke="${shade(p.curtain, -.35)}" stroke-width="3"/><polygon points="296,137 314,147 314,250 296,240" fill="${p.curtain}"/><polygon points="399,195 417,205 417,302 399,292" fill="${shade(p.curtain, -.06)}"/>` : '';
  const plant = p.plant ?`<polygon points="376,365 405,365 398,408 384,408" fill="#a35b31"/><ellipse cx="383" cy="349" rx="10" ry="28" fill="#718c77" transform="rotate(-20 383 349)"/><ellipse cx="398" cy="343" rx="10" ry="30" fill="#4c6b59" transform="rotate(12 398 343)"/>` : '';
  const cab = storage ? `<polygon points="238,160 300,195 300,318 238,286" fill="${shade(p.table, .25)}"/><path d="M269 178v124M238 222l62 35" stroke="${shade(p.table, .05)}" stroke-width="2"/>` : '';
  const lightLayer = dusk
    ? `<rect x="30" y="55" width="420" height="405" fill="#2b2140" opacity=".34"/><circle cx="225" cy="200" r="120" fill="#ffcf7a" opacity=".12"/><circle cx="225" cy="190" r="80" fill="#ffcf7a" opacity=".16"/><circle cx="225" cy="180" r="44" fill="#ffcf7a" opacity=".22"/>`
    : `<polygon points="310,238 403,290 325,418 225,280" fill="#fff3ce" opacity=".23"/>`;
  return `<svg class="room" viewBox="30 55 420 405" role="img" aria-labelledby="${id}"><title id="${id}">${esc(title)}</title>
<polygon points="40,175 225,65 225,280 40,390" fill="${p.wall}"/><polygon points="225,65 440,185 440,390 225,280" fill="${S(p.wall)}"/>
<polygon points="40,390 225,280 440,390 255,455" fill="${p.floor}"/>
<polygon points="310,145 403,197 403,290 310,237" fill="${dusk ? '#46506a' : (p.win || '#9ac1d1')}"/><path d="M356 171v93m-46-74 93 53" stroke="#eee8da" stroke-width="3"/>${curtain}
${frames}${cab}
<polygon points="80,296 162,248 208,274 127,322" fill="${p.sofa}"/><polygon points="80,296 127,322 127,366 80,340" fill="${S(p.sofa)}"/>
<polygon points="127,322 208,274 208,319 127,366" fill="${T(p.sofa)}"/><polygon points="80,260 162,212 162,248 80,296" fill="${shade(p.sofa, -.11)}"/>
<polygon points="150,375 253,315 353,372 250,432" fill="${p.rug}"/><polygon points="169,374 253,325 333,372 250,420" fill="none" stroke="${shade(p.rug, -.12)}" stroke-width="2"/>
<polygon points="218,363 254,342 285,360 249,381" fill="${p.table}"/><polygon points="218,363 249,381 249,398 218,380" fill="${shade(p.table, -.2)}"/><polygon points="249,381 285,360 285,377 249,398" fill="${shade(p.table, -.1)}"/>
<path d="M225 71v83" stroke="#5b5142" stroke-width="2"/><polygon points="201,175 225,150 249,175" fill="${p.lamp || (dusk ? '#ffe2a8' : '#ddc28d')}" stroke="${p.lamp ? shade(p.lamp, -.3) : 'none'}" stroke-width="1.5"/>
${plant}${lightLayer}</svg>`;
}

function itemArt(t, c) {
  const s1 = shade(c, -.15), s2 = shade(c, -.3);
  const art = {
    sofa: `<rect x="34" y="40" width="132" height="34" rx="12" fill="${s1}"/><rect x="28" y="62" width="144" height="30" rx="10" fill="${c}"/><rect x="22" y="56" width="22" height="40" rx="9" fill="${s1}"/><rect x="156" y="56" width="22" height="40" rx="9" fill="${s1}"/><path d="M40 96v12M160 96v12" stroke="${s2}" stroke-width="5" stroke-linecap="round"/>`,
    lamp: `<path d="M100 44v62" stroke="${s2}" stroke-width="4"/><polygon points="76,18 124,18 136,48 64,48" fill="${c}"/><ellipse cx="100" cy="110" rx="26" ry="5" fill="${s2}"/><ellipse cx="100" cy="52" rx="28" ry="8" fill="#ffd98a" opacity=".45"/>`,
    curtain: `<path d="M24 14h152" stroke="${s2}" stroke-width="4" stroke-linecap="round"/><path d="M30 16h58v94c-14 4-44 4-58 0z" fill="${c}"/><path d="M112 16h58v94c-14 4-44 4-58 0z" fill="${c}"/><path d="M44 18v90M60 18v92M74 18v90M126 18v90M142 18v92M156 18v90" stroke="${s1}" stroke-width="2"/><rect x="90" y="16" width="20" height="90" fill="#cfe2ea"/>`,
    rug: `<polygon points="100,30 182,66 100,104 18,66" fill="${c}"/><polygon points="100,42 160,66 100,92 40,66" fill="none" stroke="${s1}" stroke-width="3"/><polygon points="100,54 134,66 100,80 66,66" fill="${s1}" opacity=".5"/>`,
  }[t];
  return `<svg class="item-art" viewBox="0 0 200 120" aria-hidden="true">${art}</svg>`;
}

const MASCOT = `<svg viewBox="-6 -6 212 212" aria-hidden="true"><circle cx="100" cy="118" r="72" fill="#ffd98a" opacity=".16"/><circle cx="100" cy="118" r="50" fill="#ffd98a" opacity=".3"/><path d="M100 0v40" stroke="#29251f" stroke-width="2.2"/><rect x="93" y="36" width="14" height="10" rx="2" fill="#b8935a"/><path d="M62 113a38 38 0 0 0 76 0Z" fill="#fff0cc"/><path d="M100 44C60 44 34 76 30 113H170C166 76 140 44 100 44Z" fill="#a2562d"/><path d="M100 44C140 44 166 76 170 113H100Z" fill="#6f3518" opacity=".28"/><rect x="28" y="111" width="144" height="4.5" rx="2.2" fill="#c9a56a"/><circle cx="85.5" cy="130" r="3.1" fill="#29251f"/><circle cx="114.5" cy="130" r="3.1" fill="#29251f"/></svg>`;

// ---------- state ----------
const KEY = 'hb-proto-v5';
const fresh = () => ({
  cur: 'intro', hist: [], route: 'ai', mode: 'ai', muted: true,
  eng: { mu: [0, 0, 0], v: [1.5, 1.5, 1.5], n: 0, why: '' }, used: [], ab: null, abCount: 0,
  swipe: { cards: [], i: 0, asking: false }, lockHintSeen: false, _react: '', _loading: false, quiz: { i: 0, ans: {} }, needs: [], persona: null,
  family: { status: 'idle', partner: null, combo: null }, mall: { idx: [0, 0, 0, 0, 0, 0], collected: [], clues: [] },
  dirs: null, design: null, locks: {}, rounds: 0, guess: { i: 0, res: [], answered: false, vars: null }, dusk: false,
  stages: {}, v3d: null, learned: [], mini: {}, voiceHints: 0,
  cardEdits: { addNever: [], delNever: [], addRules: [], delRules: [] },
});
let S = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch (e) { /* storage blocked: start fresh */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

function learn(msg) { S.learned.push(msg); if (S.learned.length > 40) S.learned.shift(); }

// ---------- engine ----------
// Assumed-density update for a logistic likelihood: keeps a diagonal Gaussian over taste weights.
function observe(d, y, w = 1) {
  const E = S.eng, p = sig(dot(E.mu, d)), k = p * (1 - p);
  const s = d.reduce((a, di, i) => a + E.v[i] * di * di, 0);
  for (let i = 0; i < 3; i++) {
    E.mu[i] += w * E.v[i] * d[i] * (y - p) / (1 + k * s);
    E.v[i] = Math.max(.06, E.v[i] - w * E.v[i] * E.v[i] * d[i] * d[i] * k / (1 + k * s));
  }
  E.n++;
}
const poolStyle = i => LOOKS[i].style;
// ---------- tag preferences ----------
// Every finish and piece in the catalogue is tagged (catalog.js: TAG_GROUPS, PART_TAGS, FURN). reco.js keeps a
// Bayesian weight per tag (mean and variance): a comparison updates on the difference of the two rooms' tag
// profiles, so tags both rooms share cancel; a single reaction updates on one profile. A piece scores its posterior
// mean tag weight plus its fit on the three taste dimensions.
const R = window.HB_RECO;
const SLOTS = ['table', 'chair', 'side', 'plant', 'accent', 'screen'];
const furnOf = lk => ({ ...(STYLES[lk.style].furn || {}), ...(lk.furn || {}) });
const itemsOf = lk => { const f = furnOf(lk); return [...PARTS.map(p => p.list[lk[p.k]]), ...SLOTS.map(k => f[k] && FURN[f[k]]).filter(Boolean)]; };
const tagPost = () => S.tagPost || (S.tagPost = R.fresh());
// w > 0 is evidence for the pieces, w < 0 against them; |w| is how much the reaction should count (at most 1).
function learnTags(items, w) { if (w) R.single(tagPost(), items, w > 0 ? 1 : 0, Math.min(1, Math.abs(w))); }
const learnPair = (win, lose, w = 1) => R.pair(tagPost(), win, lose, w);
const tagScore = it => R.meanOf(tagPost(), it);
const itemScore = it => tagScore(it) + .5 * dot(S.eng.mu, optionX(it));
// Tags the model is fairly sure about, strongest first.
const topTags = (n, sign = 1) => R.TAGS.map(t => [t, R.weight(tagPost(), t)]).filter(([, w]) => w.mu * sign > .25 && w.sd < .8)
  .sort((a, b) => (b[1].mu - a[1].mu) * sign).slice(0, n).map(([t]) => t);
// Which tags set two rooms apart: the derivation shown after each answer.
function tagDiff(win, lose) {
  const count = items => items.flatMap(it => it.tags).reduce((c, t) => (c[t] = (c[t] || 0) + 1, c), {});
  const a = count(win), b = count(lose), d = [...new Set([...Object.keys(a), ...Object.keys(b)])].map(t => [t, (a[t] || 0) - (b[t] || 0)]).filter(([, x]) => x);
  return { more: d.filter(([, x]) => x > 0).sort((p, q) => q[1] - p[1]).slice(0, 3).map(([t]) => t), less: d.filter(([, x]) => x < 0).sort((p, q) => p[1] - q[1]).slice(0, 2).map(([t]) => t) };
}
const pieceName = (k, it) => !it ? '' : FURN[it.k] === it ? it.n : { sofa: it.n.endsWith('沙發') ? it.n : it.n + '沙發', lamp: it.n, rug: it.n + '地毯', curtain: it.n + '窗簾', floor: it.n, wall: it.n + '牆' }[k];
const slotName = k => PART[k] ? PART[k].n : SLOT_N[k];

// ---------- recommender agent: one swap per round ----------
// The agent draws one set of tag weights from the posterior (Thompson sampling), so pieces it is unsure about still
// get tried. A swap must look like an improvement under the sampled weights, unless the person asked for that piece
// to change (only = that slot). An extra bonus for swapping uncertain tags did not help in simulation (sim/reco-sim.cjs:
// regret 0.79 with it, 0.74 without), so INFO_BONUS is 0; the hook stays for experiments.
// base = swaps already made to this room, so a room kept across rounds is refined one piece at a time.
// Pieces swapped in the last two rounds are skipped, so it is not always the sofa.
const INFO_BONUS = 0;
function tuneOne(i, base = null, only = null) {
  if (S.eng.n < 1 && !only) return null;
  const P = tagPost(), lk = candLook(i, base), recent = only ? [] : (S.tunedHist || []).slice(-2), f = furnOf(lk);
  const W = R.sample(P, rng(7919 + S.eng.n * 131 + i * 17)); let best = null;
  const consider = (k, cur, alts) => alts.forEach(([v, it]) => {
    const gain = R.sampledOf(W, it) - R.sampledOf(W, cur) + .5 * (dot(S.eng.mu, optionX(it)) - dot(S.eng.mu, optionX(cur)));
    const info = R.infoOf(P, cur, it), score = gain + INFO_BONUS * info;
    if ((only || gain > 0) && (!best || score > best.score)) best = { k, v, gain, info, score, meanGain: itemScore(it) - itemScore(cur) };
  });
  for (const k of ['sofa', 'lamp', 'rug', 'curtain', 'wall', 'floor']) {
    if (recent.includes(k) || (only && only !== k)) continue;
    consider(k, PART[k].list[lk[k]], PART[k].list.map((o, v) => [v, o]).filter(([v, o]) => v !== lk[k] && o.s.includes(lk.style) && !clashes({ ...lk, [k]: v }).length));
  }
  for (const k of SLOTS) {
    if (recent.includes(k) || !f[k] || (only && only !== k)) continue;
    consider(k, FURN[f[k]], Object.values(FURN).filter(it => it.slot === k && it.k !== f[k] && it.s.includes(lk.style)).map(it => [it.k, it]));
  }
  if (!best) return null;
  S.tunedHist = [...(S.tunedHist || []), best.k].slice(-6);
  const focus = R.groupUncertainty(P)[0];
  S.agent = { round: S.eng.n, look: i, k: best.k, v: best.v, mode: only ? 'asked' : best.meanGain <= 0 ? 'probe' : 'exploit', focus: focus.g };
  return { [best.k]: best.v };
}
function candLook(i, mod) {
  if (!mod) return LOOKS[i];
  const lk = { ...LOOKS[i] };
  for (const [k, v] of Object.entries(mod)) if (PART[k]) lk[k] = v; else lk.furn = { ...(lk.furn || {}), [k]: v };
  return lk;
}
const candX = (i, mod) => mod ? lookX(candLook(i, mod)) : POOL[i];
function tunedLine(i, mod) {
  if (!mod) return '';
  const [k, v] = Object.entries(mod)[0], lk = LOOKS[i];
  const from = PART[k] ? PART[k].list[lk[k]] : FURN[furnOf(lk)[k]], to = PART[k] ? PART[k].list[v] : FURN[v];
  const P = tagPost(), changed = to.tags.filter(t => !from.tags.includes(t)).map(t => [t, R.weight(P, t)]);
  const sure = changed.filter(([, w]) => w.mu > .25 && w.sd < .8).sort((a, b) => b[1].mu - a[1].mu)[0];
  const probe = changed.sort((a, b) => b[1].sd - a[1].sd)[0];
  const why = sure ? `你偏好「${sure[0]}」` : probe ? `想確認你對「${probe[0]}」的感覺` : '';
  return `${slotName(k)}換成${pieceName(k, to)}（原本是${pieceName(k, from)}${why ? `；${why}` : ''}）`;
}
// ---------- viewing rounds: four rooms, and the one you picked comes back refined ----------
// Round 1 shows four rooms of four styles. After a pick you can say which piece is still wrong; the next round brings
// the picked room back (the "champion") with that piece swapped (or, if nothing was named, one piece the agent picks),
// next to three challengers chosen for expected information. So every round both narrows the style and refines a room.
const AB_N = 4;
function pickInformative(n, fixed) {
  const T = tagPost(), r = rng(1000 + S.abCount * 31 + S.eng.n), fc = new Map();
  const fOf = o => { const key = o.i + JSON.stringify(o.mod || {}); if (!fc.has(key)) fc.set(key, o.mod ? R.feat(itemsOf(candLook(o.i, o.mod))) : lookFeat(o.i)); return fc.get(key); };
  const xOf = o => candX(o.i, o.mod);
  const shown = st => S.used.filter(u => poolStyle(u) === st).length;
  const chosen = [...fixed], avail = TRAIN.filter(i => !S.used.includes(i) && !fixed.some(o => o.i === i));
  while (chosen.length < n && avail.length) {
    let best = null;
    for (const i of avail) {
      if (chosen.some(o => poolStyle(o.i) === poolStyle(i))) continue; // four different styles per round
      const o = { i, mod: null };
      // Expected information against every room already in the round, over the three dimensions and the tag weights.
      let info = chosen.length ? 0 : POOL[i].reduce((a, x, k) => a + S.eng.v[k] * x * x, 0);
      for (const c of chosen) {
        const d = sub(xOf(o), xOf(c)), fd = fOf(o).map((x, j) => x - fOf(c)[j]), p = sig(dot(S.eng.mu, d) + dot(T.mu, fd));
        info += p * (1 - p) * (d.reduce((a, di, k) => a + S.eng.v[k] * di * di, 0) + TAG_INFO_W * fd.reduce((a, x, j) => a + T.v[j] * x * x, 0));
      }
      const score = (info + .02 * r()) * .3 ** shown(poolStyle(i));
      if (!best || score > best.score) best = { o, score };
    }
    if (!best) break;
    chosen.push(best.o); avail.splice(avail.indexOf(best.o.i), 1);
  }
  return chosen;
}
function nextRound() {
  const C = S.champ, fixed = [];
  if (C) {
    const add = tuneOne(C.i, C.mod, C.fix || null);
    fixed.push({ i: C.i, mod: add ? { ...(C.mod || {}), ...add } : C.mod, champ: true, prev: C.mod, fixed: C.fix || null });
  }
  const opts = pickInformative(AB_N, fixed), r = rng(77 + S.abCount * 13);
  for (let k = opts.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [opts[k], opts[j]] = [opts[j], opts[k]]; }
  S.ab = { opts, picked: null };
  S.eng.why = C ? '保留你上一輪選的那間並微調一處，另外三間挑在你最不確定的地方差最多的。' : '四間各是不同風格，挑在你最不確定的方向上差最多的組合。';
}
// What changed on the champion this round, for the guess strip.
function champLine() {
  const c = S.ab && S.ab.opts.find(o => o.champ); if (!c) return '';
  const added = Object.keys(c.mod || {}).find(k => !c.prev || c.prev[k] !== c.mod[k]);
  if (!added) return c.fixed ? `${LOOKS[c.i].style}沒有其他${slotName(c.fixed)}可換，先保留你選的那間` : '你上一輪選的那間還在，這次沒有更好的單品可換';
  return `你上一輪選的那間：${tunedLine(c.i, { [added]: c.mod[added] }).replace(/（原本是[^；）]*；?/, '（').replace('（）', '')}`;
}
function uncertainCards(n) {
  const avail = TRAIN.filter(i => !S.used.includes(i));
  const T = tagPost();
  const ranked = avail.map(i => { const f = lookFeat(i), p = sig(dot(S.eng.mu, POOL[i]) + dot(T.mu, f));
    return { i, s: (POOL[i].reduce((a, x, j) => a + S.eng.v[j] * x * x, 0) + TAG_INFO_W * f.reduce((a, x, j) => a + T.v[j] * x * x, 0)) * (1 - Math.abs(2 * p - 1)) }; })
    .sort((a, b) => b.s - a.s);
  // Most informative first, but never two cards of the same style in one deck.
  const out = [], seen = new Set();
  for (const o of ranked) { if (!seen.has(poolStyle(o.i))) { out.push(o.i); seen.add(poolStyle(o.i)); if (out.length === n) return out; } }
  for (const o of ranked) { if (out.length === n) break; if (!out.includes(o.i)) out.push(o.i); }
  return out;
}
// A style's tag profile is the average of its curated looks; its fit is the mean tag weight over that profile.
const styleFeatCache = {};
const styleFeat = n => styleFeatCache[n] || (styleFeatCache[n] = (() => { const fs = LOOKS.map((l, i) => l.style === n ? lookFeat(i) : null).filter(Boolean); return fs[0].map((_, j) => fs.reduce((a, f) => a + f[j], 0) / fs.length); })());
const TAG_FIT_W = .35;
const tagFit = n => dot(tagPost().mu, styleFeat(n)) / 12;
function rankStyles(mu = S.eng.mu) {
  const own = mu === S.eng.mu && S.tagPost && S.tagPost.n > 0;
  return Object.entries(STYLES).map(([n, s]) => ({ n, score: dot(mu, s.x) - .15 * s.x.reduce((a, x, i) => a + (x - clamp(mu[i], -1, 1)) ** 2, 0) + (own ? TAG_FIT_W * tagFit(n) : 0) }))
    .sort((a, b) => b.score - a.score);
}
function tagsFor(mu, v) {
  const out = [];
  const T = [['溫暖木質', '冷調灰階'], ['豐富層次', '低裝飾'], ['自然光', '沉穩暗調']];
  mu.forEach((m, i) => { if (Math.abs(m) > .25 && v[i] < .9) out.push({ i, label: m > 0 ? T[i][0] : T[i][1] }); });
  return out;
}

// ---------- design helpers ----------
const opt = (d, k) => PART[k].list[d[k]];
// Rendered stills of each style's default room (key-visuals/app), shot from the same 3D scene the 3D step uses.
const stylePlate = (name, small = false) => `<img class="plate-img" src="../key-visuals/app/style-${Object.keys(STYLES).indexOf(name)}.jpg" alt="${small ? '' : esc(name + '客廳：' + STYLES[name].note)}" width="800" height="600" loading="lazy">`;
const styleDesign = style => ({ style, ...Object.fromEntries(PARTS.map(p => [p.k, STYLES[style][p.k]])) });
function designPalette(d = S.design, extra = {}) {
  const st = STYLES[d.style];
  return { ...Object.fromEntries(PARTS.map(p => [p.k, opt(d, p.k).c])), table: st.table, deco: st.deco, plant: st.plant, ...extra };
}
// Choosing a direction also places collected mall items straight into the design — but only when they fit
// the style AND don't form a known clash with what's already in the room. Skipped items are reported, not lost.
function setDesign(style) {
  S.design = styleDesign(style);
  const applied = [], skipped = [];
  (S.mall.collected || []).forEach(({ k, n }) => {
    if (!PART[k]) return; // pre-refactor saves stored plain names
    const i = PART[k].list.findIndex(o => o.n === n);
    if (i < 0) return;
    if (!PART[k].list[i].s.includes(style)) { skipped.push(n); return; }
    const prev = S.design[k]; S.design[k] = i;
    if (clashes(S.design).length) { S.design[k] = prev; skipped.push(n); }
    else applied.push(`${PART[k].n}「${n}」`);
  });
  S.locks = {}; S.rounds = 0; return { applied, skipped };
}
const tier = n => '$'.repeat(n);
// Options of a part that fit the style, excluding the current one.
const alternatives = (d, k) => PART[k].list.map((_, i) => i).filter(i => i !== d[k] && PART[k].list[i].s.includes(d.style));
const clashes = d => CLASH.filter(([a, an, b, bn]) => opt(d, a).n === an && opt(d, b).n === bn);
// Rough attribute vector of a design (same 3 dimensions as the engine), from the style plus each part's colour and price tier.
const designAttrs = designX;
function quoteItems(v) {
  return [...PARTS.map(p => { const o = opt(v, p.k); return [p.n, o.n, COST[p.k][o.p - 1]]; }),
    ['基礎工程', '保護、拆除、油漆前置', 6], ...(v.storage ? [['收納櫃', '電視牆', 4]] : [])];
}
const lookDesign = lk => ({ style: lk.style, ...Object.fromEntries(PARTS.map(p => [p.k, lk[p.k]])) });
const quoteRange = v => { const low = quoteItems(v).reduce((a, x) => a + x[2], 0); return `NT$ ${Math.round(low)}–${Math.round(low * 1.3)} 萬`; };

// ---------- icons ----------
const icon = (n, label) => `<svg class="ico" viewBox="0 0 256 256" fill="currentColor" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${(window.PH || {})[n] || ''}</svg>`;
const cta = (...items) => `<div class="cta">${items.join('')}</div>`;

// ---------- flow ----------
const STAGES = [['s1', '看屋'], ['s2', '人格'], ['s3', '家人'], ['s4', '商場'], ['s5', '佈置'], ['s6', '試住']];
// 'ai' (default): no route menu up front; the choice between the full game and going straight to the room
// moves to the preview, after people have seen what the model made of their answers. 'full' / 'quick' / 'ref'
// are the fixed version, kept for side-by-side comparison.
const ROUTES = {
  ai: ['intro', 'ab', 'swipe', 'taste', 'peek', 'quiz', 'persona', 'family', 'mall', 'dirs', 'lock', 'vary', 'guess', 'stay', 'card', 'f3d'],
  full: ['intro', 'route', 'ab', 'swipe', 'taste', 'peek', 'quiz', 'persona', 'family', 'mall', 'dirs', 'lock', 'vary', 'guess', 'stay', 'card', 'f3d'],
  quick: ['intro', 'route', 'ab', 'taste', 'peek', 'dirs', 'lock', 'stay', 'card', 'f3d'],
  ref: ['intro', 'route', 'refs', 'ab', 'taste', 'peek', 'dirs', 'lock', 'stay', 'card', 'f3d'],
};
const STAGE_OF = { ab: 's1', swipe: 's1', taste: 's1', refs: 's1', peek: 's1', quiz: 's2', persona: 's2', family: 's3', mall: 's4', dirs: 's5', lock: 's5', vary: 's5', guess: 's6', stay: 's6', card: 's6' };
const longRoute = () => S.route === 'full' || S.route === 'ai';
// Seven rounds of four rooms on the long routes (four on the short ones): 28 rooms, versus 16 with pairs. Simulated users showed adaptive stopping does not beat this (see the review doc).
const AB_TOTAL = () => longRoute() ? 7 : 4;
function restart() { const mode = S.mode; cancelFamilyTimer(); S = fresh(); S.mode = mode; S.route = mode === 'ai' ? 'ai' : 'quick'; save(); render(); }

// Every step that changes answers first records a snapshot, so "back" undoes the answer as well as the screen.
function checkpoint() {
  const { hist, ...rest } = S;
  hist.push(JSON.stringify(rest));
  if (hist.length > 40) hist.shift();
}
function go(id, skipCheckpoint = false) {
  busy = false;
  if (!skipCheckpoint) checkpoint();
  $('#resume').hidden = true;
  const prevStage = STAGE_OF[S.cur];
  if (prevStage && STAGE_OF[id] !== prevStage) S.stages[prevStage] = true;
  const chapterOf = x => x === 'f3d' ? 'f' : STAGE_OF[x];
  if (chapterOf(id) && chapterOf(id) !== chapterOf(S.cur)) showChapter(chapterOf(id));
  S.cur = id; save(); render();
}
// skipCheckpoint: the answer that ended this screen already saved one, so back returns to that last question.
function next(skipCheckpoint = false) { const r = ROUTES[S.route], i = r.indexOf(S.cur); go(r[Math.min(r.length - 1, i + 1)], skipCheckpoint); }
function back() {
  if (!S.hist.length) return;
  const hist = S.hist, prev = JSON.parse(hist.pop());
  S = Object.assign(fresh(), prev, { hist });
  S._react = '已回到上一步，答案也一併復原。';
  busy = false; save(); render(true, 'back');
}

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
// ---------- stage: the 3D room behind every screen ----------
// Camera presets in metres (room 5 × 4.2 m, sofa on the back wall, window on the right wall).
const CAMS = {
  door: { pos: [1.45, 1.6, 2.02], look: [-0.4, 1.0, -1.5], fov: 60 },
  wide: { pos: [1.95, 1.45, 1.6], look: [-0.75, 0.7, -1.2], fov: 58 },
  sofa: { pos: [0.6, 1.25, 0.6], look: [-0.5, 0.55, -1.4], fov: 56 },
  corner: { pos: [-2.1, 1.3, 1.85], look: [-0.9, 0.8, -1.7], fov: 52 },
  window: { pos: [-1.5, 1.35, 1.3], look: [2.2, 1.25, -0.5], fov: 56 },
  high: { pos: [1.9, 2.35, 1.9], look: [-0.5, 0.15, -0.9], fov: 60 },
  low: { pos: [1.5, 0.55, 1.6], look: [-0.6, 0.65, -1.4], fov: 62 },
  lamp: { pos: [0.7, 1.05, 0.4], look: [-0.4, 1.8, -0.4], fov: 58 },
};
const tasteDesign = () => styleDesign(rankStyles()[0].n);
// What each screen shows behind it: which design, from where, in what light; dim = the screen carries its own imagery.
const STAGE_SPEC = {
  intro: () => ({ walk: true, design: styleDesign('暖調復古') }),
  route: () => ({ cam: 'door', bias: .2, light: 'dusk', design: styleDesign('暖調復古') }),
  refs: () => ({ cam: 'wide', light: 'dusk', design: styleDesign('暖調復古'), dim: true }),
  ab: () => ({ cam: 'low', light: 'dark', dim: true }),
  swipe: () => ({ cam: 'low', light: 'dark', dim: true }),
  taste: () => ({ cam: 'wide', bias: .2, light: 'golden', design: tasteDesign() }),
  peek: () => ({ cam: 'corner', bias: .16, light: 'golden', design: tasteDesign() }),
  quiz: () => { const q = QUIZ[Math.min(S.quiz.i, QUIZ.length - 1)], sc = SCENE[q.id || q.k], p = S.quiz.picked;
    return { cam: sc.cam, bias: .3, light: p != null ? TRAIT_LIGHT[q.a[p][1]] : sc.light, design: tasteDesign() }; },
  persona: () => { const am = S.persona && S.persona.traits.time === 'am'; return { cam: am ? 'window' : 'lamp', bias: .38, light: am ? 'day' : 'dusk', design: tasteDesign() }; },
  family: () => ({ cam: 'door', light: 'dusk', design: tasteDesign(), dim: true }),
  mall: () => ({ cam: 'low', light: 'golden', design: tasteDesign(), dim: true }),
  dirs: () => ({ cam: 'wide', light: 'golden', design: tasteDesign(), dim: true }),
  lock: () => ({ cam: 'high', bias: .3, light: 'day', design: S.design }),
  vary: () => ({ cam: 'wide', bias: .14, light: 'day', design: S.design }),
  guess: () => ({ cam: 'wide', bias: .14, light: 'golden', design: S.guess.vars && S.guess.i < GUESS_N ? S.guess.vars[S.guess.i].d : S.design }),
  stay: () => ({ cam: 'door', bias: .12, light: STAY[S.stayT || 'am'][1], design: S.design }),
  card: () => ({ cam: 'corner', bias: .3, light: 'golden', design: S.design }),
  f3d: () => ({ live: true, design: S.design }),
};
let stageKey = '', stageReady = Promise.resolve();
function stageUpdate(animate) {
  const f = STAGE_SPEC[S.cur], sp = f ? f() : { cam: 'door', light: 'dusk' }, st = $('#stage'), d = sp.design;
  st.classList.toggle('dim', !!sp.dim); st.classList.toggle('scrim', !!sp.walk);
  const poster = $('#stage-poster'), src = d ? `../key-visuals/app/style-${Object.keys(STYLES).indexOf(d.style)}.jpg` : '../key-visuals/app/intro.jpg';
  if (poster.getAttribute('src') !== src) poster.setAttribute('src', src);
  if (gl3d.state !== 'ready') return;
  const c = gl3d.ctl;
  if (c.canvas.parentElement !== st) st.prepend(c.canvas);
  st.classList.add('live');
  if (sp.live) { stageKey = ''; return; }
  c.stop();
  if (d) { const key = JSON.stringify([d.style, ...PARTS.map(p => d[p.k])]); if (key !== stageKey) { stageKey = key; c.paint(partsOf(d), STYLES[d.style]); } }
  if (sp.walk) return;
  const ms = reduceMotion.matches ? 0 : animate ? 1200 : (S.cur === 'quiz' && S.quiz.picked != null) || S.cur === 'stay' ? 600 : 0;
  stageReady = c.glide({ ...CAMS[sp.cam], bias: sp.bias || 0, light: c.lightOf(sp.light) }, ms);
}
// A/B and swipe show the catalog's curated looks: each is a complete, hand-matched home of one style
// (furniture, dressing, materials and light), rendered by the same 3D scene from one of three angles.
function lookScene(i, mod) {
  const lk = candLook(i, mod);
  return { styleName: lk.style, name: lk.name, look: lk, parts: partsOf(lookDesign(lk)), style: { ...STYLES[lk.style], furn: furnOf(lk) }, cam: LOOK_CAMS[i % 3], light: lk.light };
}
const shotCache = new Map(), shotWaiting = new Set();
// small: grid tiles get a 480×360 render instead of 720×540, under half the pixels to draw and keep.
const SHOT_CAP = 48;
function roomShot(i, prefix = '', mod = null, small = false) {
  const x = candX(i, mod), key = `${i}|${JSON.stringify(mod || {})}|${small ? 's' : 'l'}`, [w, h] = small ? [480, 360] : [720, 540];
  if (gl3d.state !== 'ready') return room(paletteFromAttrs(x), { title: prefix + describe(x) });
  const sc = lookScene(i, mod);
  const title = `${prefix}${sc.styleName}・${sc.name}${mod ? `，依你的口味${tunedLine(i, mod)}` : ''}，${describe(x)}`;
  if (!shotCache.has(key)) {
    if (shotCache.size >= SHOT_CAP) shotCache.delete(shotCache.keys().next().value);
    shotCache.set(key, gl3d.ctl.snapshot({ parts: sc.parts, style: sc.style, light: sc.light, ...sc.cam, w, h }));
    // Furniture still streaming in is missing from this first shot; retake once everything lands.
    const needed = [sc.parts.sofa.m, sc.parts.lamp.m, ...Object.values(sc.style.furn || {})].filter(k => k && MODELS[k] && !gl3d.ctl.modelReady(k));
    if ((needed.length || gl3d.ctl.texturesLoading) && !shotWaiting.has(key)) {
      shotWaiting.add(key);
      Promise.all([...needed.map(k => gl3d.ctl.whenModel(k)), gl3d.ctl.texturesReady()]).then(() => { shotWaiting.delete(key); shotCache.delete(key); if (S.cur === 'ab' || S.cur === 'swipe' || S.cur === 'guess') render(false); });
    }
  }
  return `<img class="shot" src="${shotCache.get(key)}" alt="${esc(title)}" width="${w}" height="${h}">`;
}
const glReady = () => gl3d.state === 'ready';

// ---------- chapter cards between stages ----------
const CHAPTER_COPY = { s1: ['看屋', '先憑直覺，挑你想住的房間'], s2: ['居家人格', '你怎麼生活，家就怎麼長'], s3: ['家人', '一起住的人，也要喜歡'], s4: ['軟裝商場', '喜歡的單品，都是線索'], s5: ['佈置', '留下喜歡的，其他交給我'], s6: ['試住', '先住一天，再決定'], f: ['走進你的家', '用說的，改到你滿意'] };
function showChapter(key) {
  const el = $('#chapter-card'), order = STAGES.filter(([k]) => ROUTES[S.route].some(id => STAGE_OF[id] === k)).map(([k]) => k);
  const n = key === 'f' ? order.length + 1 : order.indexOf(key) + 1;
  const ord = key === 'f' ? '最後' : '第' + '一二三四五六七八'[n - 1] + '關';
  el.innerHTML = `<h2>${CHAPTER_COPY[key][0]}</h2><p>${ord}・${CHAPTER_COPY[key][1]}</p>`;
  el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
  clearTimeout(showChapter._t); showChapter._t = setTimeout(hideChapter, reduceMotion.matches ? 900 : 1700);
}
function hideChapter() { const el = $('#chapter-card'); if (el.hidden) return; el.classList.add('out'); clearTimeout(showChapter._t); setTimeout(() => { el.hidden = true; el.classList.remove('in', 'out'); }, 400); }

// ---------- live guess (AI version) ----------
// The model's current reading is shown while people answer, not only in the notes panel.
// A top-two score gap under 0.15 is shown as undecided: in simulation the top guess was right
// 64-69% of the time above that gap and 35-54% below it (review doc, 2026-11-18).
const GUESS_GAP = .15;
function guessState() {
  const [a, b] = rankStyles();
  return { top: a.n, second: b.n, sure: S.eng.n >= 2 && a.score - b.score >= GUESS_GAP };
}
function guessStrip() {
  if (S.mode !== 'ai') return '';
  const g = guessState();
  const line = S.eng.n === 0 ? '還沒有線索，先選一間' : g.sure ? `目前猜：${g.top}` : `還在「${g.top}」和「${g.second}」之間`;
  const r = S.eng.n ? recoLine() : '';
  const said = S._inlineReact ? S._inlineReact.split(/[，。]/)[0] : '';
  return `<div class="guess-strip${said ? ' fresh' : ''}">${S.eng.n ? stylePlate(g.top, true) : ''}<p><small>${said ? esc(said) : '你的家目前像'}</small><b>${line}</b>${r ? `<span class="reco">${r}</span>` : ''}</p></div>`;
}
const INLINE_REACT = ['ab', 'swipe'];
// Live recommendation after every answer: what this round tuned, else the best-fitting pieces for the top guess.
function recoLine() {
  if (S.cur === 'ab' && S.ab && S.ab.opts) { const c = champLine(); if (c) return c; }
  const M = S.cur === 'swipe' ? { c: (S.swipe.mods || {})[S.swipe.i] } : {};
  const side = Object.keys(M).find(s => M[s]);
  if (side) { const i = S.swipe.cards[S.swipe.i];
    return `這一輪：這間的${tunedLine(i, M[side]).replace(/（原本是[^；）]*；?/, '（').replace('（）', '')}`; }
  const like = topTags(2);
  return `${like.length ? `你偏好${like.join('・')}，` : ''}推薦${recoItems(rankStyles()[0].n).map(([k, o]) => pieceName(k, o)).join('・')}`;
}
// The compatible pieces the current taste scores highest, for one style.
function recoItems(style, keys = ['sofa', 'lamp']) {
  return keys.map(k => [k, PART[k].list.filter(o => o.s.includes(style)).reduce((b, o) => itemScore(o) > itemScore(b) ? o : b)]);
}
// One sentence on what the last answer changed, in the words of the dimension that differed most.
function explainPick(before, winX, loseX) {
  const d = loseX ? sub(winX, loseX) : winX, mag = d.map(Math.abs), i = mag.indexOf(Math.max(...mag));
  const why = `你選了比較${d[i] > 0 ? DIMS[i].hi : DIMS[i].lo}的${loseX ? '那間' : '房間'}`;
  const g = guessState();
  if (before === null) return `第一個線索：${why}。先猜「${g.top}」。`;
  if (!g.sure) return `${why}，還在「${g.top}」和「${g.second}」之間。`;
  return g.top !== before ? `猜測從「${before}」換成「${g.top}」：${why}。` : `還是猜「${g.top}」，${why}。`;
}

// ---------- screens ----------
const SCREENS = {};
const def = (id, o) => { SCREENS[id] = o; };

// Walk-in intro: scrolling moves the camera from the front door to the sofa while the lights come on.
// Tapping the button plays the same move. Reduced motion, no WebGL, or a failed load keep the still image.
const WALK = [
  { at: 0, pos: [1.45, 1.6, 2.02], look: [-0.4, 1.05, -1.5], mood: 'dusk', fov: 62 },
  { at: .4, pos: [1.15, 1.5, 1.4], look: [-0.5, 0.85, -1.45], mood: 'golden', fov: 60 },
  { at: .75, pos: [0.85, 1.35, 0.9], look: [-0.5, 0.62, -1.45], mood: 'golden', fov: 57, beam: 1 },
  { at: 1, pos: [0.6, 1.25, 0.6], look: [-0.5, 0.55, -1.4], mood: 'golden', fov: 56, beam: 1 },
];
const smooth = t => t * t * (3 - 2 * t);
function walkPose(p) {
  let i = 0; while (i < WALK.length - 2 && p > WALK[i + 1].at) i++;
  const a = WALK[i], b = WALK[i + 1], t = smooth(clamp((p - a.at) / (b.at - a.at), 0, 1));
  const L = (x, y) => x.map((v, k) => v + (y[k] - v) * t);
  return { pos: L(a.pos, b.pos), look: L(a.look, b.look), fov: a.fov + (b.fov - a.fov) * t, moods: [a.mood, b.mood], t, beam: (a.beam || 0) + ((b.beam || 0) - (a.beam || 0)) * t };
}
const CHAPTERS = [[0, .3], [.34, .64], [.68, 1.01]];
def('intro', {
  bare: true,
  label: '序章', note: '開場：往下滑就走進客廳（3D 鏡頭隨捲動移動、燈光由暗轉亮），也可以直接按按鈕。不要求登入或填表。',
  guide: '往下滑，走進去。',
  tech: [['ok', '捲動帶動鏡頭：sticky 釘住文案＋捲動進度驅動 three.js 相機，只在捲動時重畫一格'], ['ok', '載入中、減少動態效果、或 WebGL 不可用時，舞台顯示預先拍好的開場圖（118 KB）'], ['mid', '開場就載入 three.js 與模型（約 1.8 MB）：弱網路下要量首屏時間，必要時延後到使用者開始捲動']],
  html: () => `<div class="walkin${reduceMotion.matches ? ' still' : ''}" id="walkin">
    <div class="walkin-pin" id="walkin-pin">
      <span class="walkin-hint" aria-hidden="true">往下滑，走進去</span>
      <div class="walkin-copy">
        <div class="chapter" data-i="0"><span class="brand-mark"><img src="../logo.svg" alt="">回家之前</span><h1 class="title hero">在搬進去之前，<br>先走進去住一次</h1>
          <ul class="intro-facts"><li>約 3 分鐘</li><li>${Object.keys(STYLES).length} 種風格</li><li>${LOOKS.length} 間樣板房</li><li>免註冊</li></ul></div>
        <div class="chapter" data-i="1"><p class="chapter-line">先看屋、測人格、問家人</p><p class="chapter-sub">每一關都在學你喜歡什麼</p></div>
        <div class="chapter" data-i="2"><p class="chapter-line">找到全家都喜歡的樣子</p><p class="chapter-sub">最後在 3D 裡走一圈，用說的改</p></div>
      </div>
    </div>
    <div class="walkin-track" aria-hidden="true"></div>
    ${cta(`<div class="style-ribbon" role="group" aria-label="或從一個風格開始"><p>或從一個風格開始</p><div class="ribbon-row">${Object.keys(STYLES).map(n => `<button class="ribbon-item" data-act="seed" data-arg="${n}">${stylePlate(n, true)}<span>${n}</span></button>`).join('')}</div></div>`,
      '<button class="btn orange" data-act="start">拿起鑰匙，開門</button>', S.mode === 'ai' ? '<button class="btn text" data-act="refs">我已經有參考圖</button>' : '', '<p class="disclaimer">Mock prototype：圖片、數字與模型皆為示意</p>')}</div>`,
  mount(el) {
    const walkin = $('#walkin', el), track = $('.walkin-track', el), chapters = [...el.querySelectorAll('.chapter')];
    let p = 0, raf = 0;
    const still = walkin.classList.contains('still');
    const progress = () => clamp(screenEl.scrollTop / Math.max(1, track.offsetHeight), 0, 1);
    const paint = () => {
      raf = 0;
      chapters.forEach((c, i) => { const [a, b] = CHAPTERS[i], fade = .06;
        const o = p < a ? clamp(1 - (a - p) / fade, 0, 1) : p > b ? clamp(1 - (p - b) / fade, 0, 1) : 1;
        const op = i === 0 && p === 0 ? 1 : o; c.style.opacity = op; c.style.visibility = op > .01 ? 'visible' : 'hidden'; c.style.transform = `translate3d(0,${(1 - op) * 16}px,0)`; c.setAttribute('aria-hidden', op < .5); });
      walkin.style.setProperty('--p', p);
      if (glReady()) gl3d.ctl.pose(walkPose(still ? .45 : p));
    };
    if (still) { chapters.forEach(c => { c.style.opacity = 1; }); if (glReady()) gl3d.ctl.pose(walkPose(.45)); return; }
    p = progress();
    const onScroll = () => { p = progress(); if (!raf) raf = requestAnimationFrame(paint); };
    screenEl.addEventListener('scroll', onScroll, { passive: true });
    paint();
    SCREENS.intro._play = done => {
      // Tap to enter: play the rest of the walk in about a second, then move on.
      const from = p, t0 = performance.now(), dur = glReady() ? 1100 * (1 - from) + 200 : 0;
      const step = now => { const k = Math.min(1, (now - t0) / Math.max(1, dur)); p = from + (1 - from) * smooth(k); paint(); if (k < 1) requestAnimationFrame(step); else done(); };
      requestAnimationFrame(step);
    };
    return () => { screenEl.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); SCREENS.intro._play = null; };
  },
  on: {
    start() { hold(); mascot('speak'); const play = SCREENS.intro._play; if (play) play(() => next()); else next(); },
    refs() { checkpoint(); S.route = 'ref'; learn('路線：已有參考圖'); go('refs', true); },
    // A style picked on the landing page is a starting guess, not an answer: the A/B rounds still run and can overturn it.
    seed(n) { checkpoint(); S.eng.mu = STYLES[n].x.map(x => x * .8); S.eng.v = [1, 1, 1]; learn(`開場選了「${n}」當起點`); S._react = `從${n}開始，看屋時會再確認。`; SCREENS.intro.on.start(); },
  },
});

def('route', {
  label: '序章・選路線', note: '三條路線都走得到定案卡。v3 把快速路線設為推薦，完整闖關改為選修；每條路線看屋後都會先給一張預覽。',
  guide: '看屋完就會先給你一張預覽。',
  tech: [['ok', '路線是狀態機設定（關卡清單），可存檔續玩'], ['mid', '預設推薦快速路線會不會降低人格／家人關卡的參與：用漏斗比較']],
  html: () => `<h1 class="title">門開了，你想怎麼走？</h1>
    <div class="route-list">${[['quick', '快速找風格', '建議先走這條：約 3 分鐘就看到預覽和 3D。', '看屋、預覽、佈置、定案', true],
       ['full', '完整闖關', '還不知道喜歡什麼，也想玩一玩。', '看屋、預覽、人格、家人、商場、佈置、試住、定案'],
       ['ref', '我已經有想法', '手上已經有參考圖。', '參考圖、確認口味、預覽、佈置、定案']]
      .map(([k, n, line, st, rec]) => `<button class="route${rec ? ' rec' : ''}" data-act="pick" data-arg="${k}"><b>${n}</b><span>${line}</span><small>${st}</small></button>`).join('')}</div>
    <p class="sub">一個人住就不會出現家人共測；跳過人格測驗的話，定案前補兩題收納和光線。</p>`,
  on: { pick(k) { S.route = k; learn(`路線：${{ full: '完整闖關', quick: '快速找風格', ref: '已有參考圖' }[k]}`); next(); } },
});

def('refs', {
  label: '參考圖', stage: 's1', note: '已有參考圖的人，不必從零看屋。萃取的口味只當起點，後面再用幾題確認。',
  guide: '上傳的圖只在你的裝置上預覽。',
  tech: [['mid', '參考圖萃取風格：多模態模型做得到，但要用固定詞表約束輸出，否則標籤不一致'], ['ok', '本 prototype 只預覽上傳圖，不分析內容'], ['mid', '社群截圖的授權：只用於個人分析，不進公開圖庫']],
  html: () => `<h1 class="title">你心中的樣子</h1>
    <p class="sub">挑一組最接近的顏色當起點，之後的題目會再修。</p>
    <div class="board-grid">${REF_BOARDS.map((b, i) => `<button class="board" data-act="board" data-arg="${i}"><span class="swatches" aria-hidden="true">${b.c.map(c => `<i style="background:${c}"></i>`).join('')}</span><b>${b.n}</b></button>`).join('')}</div>
    <label class="btn text" style="cursor:pointer">從相簿選參考圖，只在你的裝置上預覽<input type="file" accept="image/*" multiple hidden id="ref-file"></label>
    <div class="chips" id="ref-thumbs"></div>`,
  mount(el) {
    $('#ref-file', el).addEventListener('change', e => {
      const box = $('#ref-thumbs', el); box.innerHTML = '';
      [...e.target.files].slice(0, 6).forEach(f => { const img = new Image(); img.src = URL.createObjectURL(f); img.alt = f.name; img.style.cssText = 'width:64px;height:64px;object-fit:cover;border-radius:8px'; box.append(img); });
      toast('已收到圖片。正式版會從中整理風格標籤。');
    });
  },
  on: { board(i) { const b = REF_BOARDS[i]; S.eng.mu = b.x.map(x => x * 1.2); S.eng.v = [.7, .7, .7]; learn(`參考圖起點：${b.n}`); next(); } },
});

def('ab', {
  label: '第 1 關・看屋', stage: 's1', fit: true,
  step: () => `${Math.min(S.abCount + 1, AB_TOTAL())} / ${AB_TOTAL()}`,
  guide: '憑直覺選，沒有對錯。',
  note: '每輪四間不同風格的樣板房，選一間後可以說哪裡還要改。下一輪會把你選的那間帶回來、換掉那一件（沒說就由推薦代理挑一件），另外三間由引擎挑「最能減少不確定性」的組合。',
  tech: [['ok', '首版圖庫 60–100 張、預先標註屬性；不即時生成'], ['ok', '期望資訊量出題：本頁就是縮小版（3 維、56 組精選搭配）'], ['ok', '標籤資料庫：每件家具與材質有色溫、深淺、材質、造型、花樣、年代六個標籤；每個標籤一個貝氏權重（平均與不確定度），四選一＝三次成對比較'], ['ok', '推薦代理：從後驗抽一組權重（Thompson sampling）決定下一輪換哪一件；使用者點名的部位一定換'], ['ok', '模擬（sim/reco-sim.cjs，300 位）：四選一＋冠軍＋微調比舊的二選一，最終遺憾降 20–40%、風格猜中率高 6–15 個百分點；效果主要來自四選一與冠軍迴圈，貝氏模型本身與資訊獎勵沒有可量測的差異'], ['mid', '真人是否願意每輪多點一下微調：要做使用者測試'], ['mid', 'VLM：可自動替新素材標籤、把使用者上傳的參考圖轉成同一套標籤，並寫出推導；需要付費 API，尚未接'], ['ok', 'AI 版：作答時顯示目前猜測與改變的原因；前兩名分數差 < 0.15 時誠實顯示「還在兩者之間」'], ['mid', '自適應停題未採用：模擬 400 位使用者，固定 6 題已接近上限，「猜測穩定就停」與「先猜再驗」都沒有更準'], ['mid', '圖庫來源：要授權、台灣常見房型、攝影品質一致；成本與時程未估'], ['mid', 'JEV 是否勝過這種基準模型，需留出資料評測']],
  html: () => {
    if (!S.ab || !S.ab.opts) nextRound();
    const { opts, picked } = S.ab, done = picked != null, L = 'ABCD';
    const w = done ? opts[picked] : null, wl = w && candLook(w.i, w.mod), f = wl && furnOf(wl);
    const parts = w ? [...PARTS.map(p => p.k), ...['table', 'chair', 'side'].filter(k => f[k])] : [];
    return `<div class="progress"><i style="transform:scaleX(${(S.abCount + (done ? .5 : 0)) / AB_TOTAL()})"></i></div>
      <h1 class="title">${done ? '這間還想改哪裡？' : '最想住哪一間？'}</h1>
      ${guessStrip()}
      <div class="ab four${done ? ' done' : ''}">${opts.map((o, k) => `<button class="pick${done ? (k === picked ? ' chosen' : ' dim') : ''}" data-act="pick" data-arg="${k}" ${done ? 'disabled' : ''} aria-label="選 ${L[k]}${o.champ ? '（你上一輪選的，已微調）' : ''}：${describe(candX(o.i, o.mod))}"><b>${L[k]}</b>${o.champ ? '<span class="champ">上一輪選的</span>' : ''}${roomShot(o.i, `選項 ${L[k]}：`, o.mod, true)}</button>`).join('')}</div>
      ${done
        ? `<div class="tune" role="group" aria-label="想換掉的東西"><div class="chips">${parts.map(k => `<button class="chip" data-act="fix" data-arg="${k}">${slotName(k)}</button>`).join('')}</div></div>
           ${cta('<button class="btn" data-act="good">都很好，下一輪</button>', kbdHint('Enter 下一輪'))}`
        : cta(`<div class="row2"><button class="btn text" data-act="none">都不喜歡</button>${canSkipLook() ? '<button class="btn text" data-act="skipLook">先看結果</button>' : '<span></span>'}</div>`, kbdHint('1–4 或 A–D 選擇'))}`;
  },
  on: {
    pick(j, el) {
      if (S.ab.picked != null) return;
      checkpoint(); j = +j;
      const { opts } = S.ab, w = opts[j], wx = candX(w.i, w.mod), wi = itemsOf(candLook(w.i, w.mod));
      const before = S.eng.n ? guessState().top : null, losers = opts.filter((_, k) => k !== j);
      el.classList.add('chosen'); buzz();
      // One pick among four = three comparisons, each counted at 0.6 so a round is worth about two A/B answers.
      losers.forEach(o => { observe(sub(wx, candX(o.i, o.mod)), 1, .6); learnPair(wi, itemsOf(candLook(o.i, o.mod)), .6); });
      const li = losers.flatMap(o => itemsOf(candLook(o.i, o.mod))), td = tagDiff(wi, li.filter((_, k) => k % 3 === 0));
      if (td.more.length) learn(`標籤推導：選的那間多了${td.more.join('、')}${td.less.length ? `，少了${td.less.join('、')}` : ''}`);
      if (w.champ) learn(`又選了上一輪那間（微調後）${w.prev !== w.mod ? '：微調有效' : ''}`);
      else if (opts.some(o => o.champ)) learn('這次沒選上一輪那間：換一個方向');
      S.used.push(...opts.filter(o => !S.used.includes(o.i)).map(o => o.i)); learn(`偏好${LOOKS[w.i].style}・${LOOKS[w.i].name}`);
      const lx = losers.map(o => candX(o.i, o.mod)).reduce((a, x) => a.map((v, k) => v + x[k] / losers.length), [0, 0, 0]);
      S._react = S.mode === 'ai' ? explainPick(before, wx, lx) : `記下了：${describe(wx).replace('的客廳', '')}。`;
      S.ab.picked = j; save(); render(false);
    },
    // The feedback loop: name the piece that is still wrong; the next round brings this room back with it swapped.
    fix(k) {
      checkpoint();
      const w = S.ab.opts[S.ab.picked], lk = candLook(w.i, w.mod), it = PART[k] ? PART[k].list[lk[k]] : FURN[furnOf(lk)[k]];
      learnTags([it], -.7); if (PART[k]) observe(optionX(it), 0, .4);
      S.champ = { i: w.i, mod: w.mod, fix: k }; learn(`微調：不要${pieceName(k, it)}`); S._react = `好，下一輪把${slotName(k)}換掉。`; advanceAB();
    },
    good() { checkpoint(); const w = S.ab.opts[S.ab.picked]; S.champ = { i: w.i, mod: w.mod, fix: null }; S._react = '好，下一輪留著這間，再微調一處給你比。'; advanceAB(); },
    skipLook() { skipLook(); },
    none() {
      checkpoint();
      S.ab.opts.forEach(o => { observe(candX(o.i, o.mod), 0, .4); learnTags(itemsOf(candLook(o.i, o.mod)), -.4); });
      S.used.push(...S.ab.opts.filter(o => !S.used.includes(o.i)).map(o => o.i)); S.champ = null;
      learn('四間都不喜歡（各記一次負向）'); S._react = '記下了：這幾種都不是你要的，下一輪換方向。'; advanceAB();
    },
  },
});
// The long route asks up to 14 rooms; after enough answers people may stop and see the result.
const canSkipLook = () => longRoute() && (S.abCount >= 3 || S.cur === 'swipe');
function skipLook() { checkpoint(); S.ab = null; S.champ = null; S.swipe = { cards: [], i: 0, asking: false }; learn(`看屋提前結束（作答 ${S.eng.n} 次）`); go('taste', true); }
const kbdHint = t => finePointer ? `<p class="kbd-hint">鍵盤：${t}</p>` : '';
// A short tick on phones that support it, when an answer registers.
const buzz = () => { try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* unsupported */ } };
function advanceAB() {
  hold(); S.abCount++;
  if (S.abCount >= AB_TOTAL()) { S.ab = null; S.champ = null; setTimeout(() => next(true), 250); return; }
  nextRound(); save(); setTimeout(() => { busy = false; render(false); }, 250);
}

def('swipe', {
  label: '第 1 關・看屋', stage: 's1',
  step: () => `滑卡 ${S.swipe.i + 1} / ${SWIPE_N()}`,
  guide: '往右滑是想住，往左滑可以說原因。',
  note: '滑掉時一鍵回答原因，不用打字。原因會直接修正單一維度，比只知道「不喜歡」更有用。',
  tech: [['ok', 'Pointer Events 手勢；按鈕替代滑動（無障礙、桌機）'], ['ok', '卡片挑引擎最不確定的圖']],
  html: () => {
    if (!S.swipe.cards.length) S.swipe.cards = uncertainCards(SWIPE_N());
    const i = S.swipe.cards[S.swipe.i], mods = S.swipe.mods || (S.swipe.mods = {});
    if (!(S.swipe.i in mods)) mods[S.swipe.i] = tuneOne(i);
    const mod = mods[S.swipe.i], x = candX(i, mod), asking = S.swipe.asking;
    // Taste reasons nudge one dimension; part reasons say which piece put people off.
    const reasons = [[x[0] < 0 ? '太冷' : '太暖', [x[0] < 0 ? 1 : -1, 0, 0]], [x[1] > 0 ? '太滿' : '太空', [0, x[1] > 0 ? -1 : 1, 0]], [x[2] < 0 ? '太暗' : '太亮', [0, 0, x[2] < 0 ? 1 : -1]],
      ...['sofa', 'floor', 'lamp'].map(k => [`${PART[k].n}不對`, null, k])];
    S._reasons = reasons;
    return `<h1 class="title">這間如何？</h1>
      ${guessStrip()}
      <div class="swipe-area"><div class="swipe-under"></div>
        <div class="swipe-card${asking ? ' rejected' : ''}" id="card"><span class="stamp like">想住</span><span class="stamp nope">不要</span>${roomShot(i, '', mod)}</div>
        ${asking ? `<div class="why" role="group" aria-label="不喜歡的原因"><p>哪裡不對？</p><div class="chips">${reasons.map((r, j) => `<button class="chip" data-act="reason" data-arg="${j}">${r[0]}</button>`).join('')}<button class="chip" data-act="reason" data-arg="-1">說不上來</button></div></div>` : ''}
      </div>
      ${asking ? '' : `<div class="round-btns"><button class="round" data-act="nope" aria-label="不喜歡">${icon('x')}</button><button class="round yes" data-act="like" aria-label="喜歡">${icon('heart')}</button></div>${canSkipLook() ? '<button class="btn text skip-look" data-act="skipLook">先看結果</button>' : kbdHint('→ 想住・← 不要')}`}`;
  },
  mount(el) {
    const card = $('#card', el); if (!card || S.swipe.asking) return;
    let x0 = null, dx = 0;
    card.addEventListener('pointerdown', e => { x0 = e.clientX; card.setPointerCapture(e.pointerId); card.classList.add('dragging'); });
    card.addEventListener('pointermove', e => { if (x0 === null) return; dx = e.clientX - x0; card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`; $('.like', card).style.opacity = clamp(dx / 80, 0, 1); $('.nope', card).style.opacity = clamp(-dx / 80, 0, 1); });
    const end = () => { if (x0 === null) return; card.classList.remove('dragging'); x0 = null; if (dx > 80) SCREENS.swipe.on.like(); else if (dx < -80) SCREENS.swipe.on.nope(); else { card.style.transform = ''; $('.like', card).style.opacity = 0; $('.nope', card).style.opacity = 0; } dx = 0; };
    card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
  },
  on: {
    like() { if (busy) return; hold(); checkpoint(); const i = S.swipe.cards[S.swipe.i], mod = (S.swipe.mods || {})[S.swipe.i], x = candX(i, mod), before = guessState().top; flyCard(1); buzz(); observe(x, 1); learnTags(itemsOf(candLook(i, mod)), 1); S.used.push(i); learn(`喜歡：${describe(x)}${mod ? `（調整過：${tunedLine(i, mod)}）` : ''}`); S._react = S.mode === 'ai' ? explainPick(before, x) : '記下了：這間你想住。'; setTimeout(advanceSwipe, 300); },
    skipLook() { skipLook(); },
    nope() { if (busy) return; S.swipe.asking = true; save(); render(false); mascot('listen'); },
    reason(j) {
      hold(); checkpoint();
      const i = S.swipe.cards[S.swipe.i], cl = candLook(i, (S.swipe.mods || {})[S.swipe.i]); observe(candX(i, (S.swipe.mods || {})[S.swipe.i]), 0); learnTags(itemsOf(cl), -.6); S.used.push(i);
      if (+j >= 0) {
        const [label, d, k] = S._reasons[j];
        if (d) observe(d, 1, .8);
        else { const o = PART[k].list[cl[k]]; observe(optionX(o), 0, .5); learnTags([o], -.5); S.swipe.dislikedParts = [...(S.swipe.dislikedParts || []), `${PART[k].n}・${o.n}`]; }
        learn(`不喜歡的原因：${label}${k ? `（${PART[k].list[cl[k]].n}）` : ''}`); S._react = `記下了：${label}。`;
      } else { learn('不喜歡，原因說不上來'); S._react = '沒關係，記下「不喜歡」就夠了。'; }
      S.swipe.asking = false; flyCard(-1); setTimeout(advanceSwipe, 300);
    },
  },
});
function flyCard(dir) { const c = $('#card'); if (c) { c.classList.remove('rejected'); c.style.transform = `translateX(${dir * 420}px) rotate(${dir * 20}deg)`; } const w = $('.why'); if (w) w.remove(); }
const SWIPE_N = () => longRoute() ? 6 : 4;
function advanceSwipe() { S.swipe.i++; if (S.swipe.i >= SWIPE_N()) { next(true); return; } busy = false; save(); render(false); }

def('taste', {
  label: '第 1 關・口味圖譜', stage: 's1',
  guide: '猜錯的地方，點標籤或拖滑桿就能改。',
  note: '口味來自前面的選擇。點標籤可以翻轉，滑桿顯示目前的猜測和不確定程度。',
  tech: [['ok', '修正直接覆寫後驗平均並縮小不確定性'], ['ok', '設計建議：用「還不確定」引導下一步，而不是假裝很準']],
  html: () => {
    const { mu, v } = S.eng;
    // Each dimension reads as a word; a confident reading can be flipped by tapping it.
    const read = i => { const d = DIMS[i], m = mu[i], sure = Math.abs(m) > .25 && v[i] < .9; return { sure, word: sure ? `偏${m > 0 ? d.hi : d.lo}` : '還不確定' }; };
    return `<h1 class="title">你的居家口味</h1><p class="sub">猜錯的地方直接拖，背景的客廳會跟著改。</p>
      <div class="taste">${DIMS.map((d, i) => { const r = read(i);
        return `<div class="taste-row"><div class="taste-read"><b>${d.name}</b>${r.sure ? `<button class="taste-word" data-act="flip" data-arg="${i}" aria-label="${d.name}${r.word}，點一下改成相反">${r.word}</button>` : `<span class="taste-word unsure">${r.word}</span>`}</div>
        <input id="dim-${i}" type="range" min="-2" max="2" step=".1" value="${clamp(mu[i], -2, 2).toFixed(1)}" data-dim="${i}" aria-label="${d.name}：${d.lo}到${d.hi}">
        <div class="taste-ends" aria-hidden="true"><span>${d.lo}</span><span>${d.hi}</span></div></div>`; }).join('')}</div>
      <div class="feel" role="group" aria-label="想要的感覺"><p>還想要什麼感覺？可以多選</p><div class="chips">${FEEL.map(([w], j) => { const on = (S.feel || []).includes(w);
        return `<button class="chip${on ? ' on' : ''}" data-act="feel" data-arg="${j}" aria-pressed="${on}">${w}</button>`; }).join('')}</div></div>
      ${cta('<button class="btn" data-act="ok">對，就是這樣</button>')}`;
  },
  mount(el) {
    el.querySelectorAll('input[type=range]').forEach(r => r.addEventListener('change', () => {
      checkpoint(); const i = +r.dataset.dim; S.eng.mu[i] = +r.value; S.eng.v[i] = Math.min(S.eng.v[i], .3);
      learn(`手動修正「${DIMS[i].name}」為 ${(+r.value).toFixed(1)}`); S._react = `已改好「${DIMS[i].name}」。`; save(); render(false);
    }));
  },
  on: {
    feel(j) {
      checkpoint(); const [w, d] = FEEL[+j], list = S.feel || (S.feel = []);
      if (list.includes(w)) { S.feel = list.filter(x => x !== w); learn(`拿掉想要的感覺：${w}`); }
      else { list.push(w); observe(d, 1, .5); learnTags([{ tags: FEEL_TAGS[w] }], .4 * FEEL_TAGS[w].length / 3); learn(`想要的感覺：${w}（標籤：${FEEL_TAGS[w].join('、')}）`); S._react = `記下了：要${w}。`; }
      save(); render(false);
    },
    flip(i) { checkpoint(); i = +i; S.eng.mu[i] = -S.eng.mu[i]; S.eng.v[i] = Math.min(S.eng.v[i], .3); learn(`猜錯了：翻轉「${DIMS[i].name}」`); S._react = `已翻轉「${DIMS[i].name}」。`; save(); render(false); },
    ok() { learn(`確認口味：${tagsFor(S.eng.mu, S.eng.v).map(t => t.label).join(' ') || '中性'}`); next(); },
  },
});

// Feeling words on the taste screen: each nudges the taste dimensions in its direction.
const FEEL = [['安靜', [0, -.6, -.3]], ['明亮', [0, -.1, .9]], ['溫暖', [.9, .1, 0]], ['俐落', [-.6, -.7, .2]], ['復古', [.5, .6, -.3]], ['自然', [.5, -.2, .5]], ['華麗', [0, .9, 0]], ['隨性', [.3, .4, .1]], ['療癒', [.4, -.2, .2]], ['大器', [-.2, .3, -.2]]];
const FEEL_TAGS = { 安靜: ['素面', '中性'], 明亮: ['淺色', '玻璃'], 溫暖: ['暖調', '木'], 俐落: ['直線', '素面', '現代'], 復古: ['復古', '皮革'], 自然: ['自然', '木', '植物'], 華麗: ['雕花', '黃銅', '絨布'], 隨性: ['編織', '布'], 療癒: ['植物', '毛圈'], 大器: ['石材', '深色'] };
def('peek', {
  label: '第 1 關・先看預覽', stage: 's1',
  guide: () => longRoute() ? '這是目前的猜測。繼續闖關會更準，也可以直接去佈置。' : '這是目前的猜測，下一步可以動手改。',
  note: '核心價值（看到家、知道大概花多少）提前到看屋之後，不必走完全程才看到。預覽用目前排名第一的風格和預設組合。',
  tech: [['ok', '預覽 = 後驗第一名風格 × 預設元素組合，不需生成；報價與 3D 共用同一份元素清單'], ['mid', '太早給結果，可能讓人略過後面的關卡：追蹤「看到預覽後繼續闖關」的比例'], ['mid', '首屏要用實景圖才有說服力；程式繪圖只能示意']],
  html: () => {
    const top = rankStyles().slice(0, 3), pi = S.peekI || 0, cur = top[pi], d = styleDesign(cur.n), st = STYLES[cur.n];
    return `<div class="peek-tabs" role="tablist" aria-label="前三個可能">${top.map((t, j) => `<button role="tab" class="${j === pi ? 'on' : ''}" aria-selected="${j === pi}" data-act="tab" data-arg="${j}"><small>${['最可能', '第二', '第三'][j]}</small>${t.n}</button>`).join('')}</div>
      ${glReady() ? '' : `<figure class="plate">${stylePlate(cur.n)}</figure>`}
      <h1 class="style-name">${cur.n}</h1>
      <p class="lead">${pi ? '也可能是這樣' : '你的家可能長這樣'}：${st.note}。</p>
      <dl class="facts">
        <div><dt>粗略報價</dt><dd>${quoteRange(d)}，假設客廳 8 坪</dd></div>
        <div><dt>精選搭配</dt><dd>${LOOKS.filter(l => l.style === cur.n).map(l => l.name).join('、')}</dd></div>
        <div><dt>依據</dt><dd>你在看屋做的 ${S.eng.n} 次選擇</dd></div>
      </dl>
      ${longRoute()
        ? cta('<button class="btn" data-act="more">繼續闖關，讓它更準</button>', '<button class="btn text" data-act="skip">先跳到佈置</button>')
        : cta('<button class="btn" data-act="more">去佈置，動手改</button>')}`;
  },
  on: {
    tab(j) { S.peekI = +j; save(); render(false); },
    more() { peekCommit(); learn(`預覽：${rankStyles()[0].n}`); next(); },
    skip() { checkpoint(); peekCommit(); S.route = 'quick'; learn(`預覽：${rankStyles()[0].n}；改走快速路線`); next(true); },
  },
});

// Leaving the preview on the second or third tab says "this one is more me": nudge the taste towards it.
function peekCommit() { const pi = S.peekI || 0; if (!pi) return; const n = rankStyles()[pi].n; observe(STYLES[n].x, 1, .6); learn(`預覽時選了「${n}」比較像`); S.peekI = 0; }
// Each question is a scene: the camera goes where it happens, the light answers the choice.
// Lines are broken by hand so every scene reads as a script line, never by the browser.
const SCENE = {
  charge: { lines: ['聚會散場。', '你推開家門，', '屋裡只剩你一個人。'], cam: 'door', light: 'dark' },
  items: { lines: ['搬家前一晚，', '紙箱堆滿客廳。'], cam: 'wide', light: 'dusk' },
  rhythm: { lines: ['出門前五分鐘，', '你在找鑰匙。'], cam: 'low', light: 'day' },
  time: { lines: ['難得的週六，', '沒有任何行程。'], cam: 'window', light: 'golden' },
  charge2: { lines: ['週五晚上，', '手機跳出聚餐邀約。'], cam: 'sofa', light: 'dusk' },
  items2: { lines: ['朋友送你一個', '用不到的禮物。'], cam: 'corner', light: 'golden' },
  rhythm2: { lines: ['週日晚上，', '客廳桌上堆滿東西。'], cam: 'high', light: 'dusk' },
  time2: { lines: ['晚上十點，', '客廳的燈還亮著。'], cam: 'lamp', light: 'night' },
};
const TRAIT_LIGHT = { solo: 'dusk', social: 'golden', few: 'day', keep: 'golden', tidy: 'day', loose: 'dusk', am: 'day', pm: 'dusk' };
const TIME_WORD = { am: '晨型人', pm: '夜貓' };
const traitSentence = t => `${TRAIT_LABEL[t.charge]}、${TRAIT_LABEL[t.items]}、${TRAIT_LABEL[t.rhythm]}的${TIME_WORD[t.time]}。`;
def('quiz', {
  label: '第 2 關・居家人格', stage: 's2',
  step: () => `第 ${S.quiz.i + 1} 題，共 ${QUIZ.length} 題`,
  guide: '照平常的你回答就好。',
  note: '問生活裡的小事，不問風格名詞。每題是一個場景：鏡頭走到事情發生的地方，選完客廳的光會跟著答案變。正式版 12 題，這裡每個特質問 2 題、取多數。',
  tech: [['ok', '規則計分，不需要模型；可單元測試'], ['mid', '12 題加劇情對白的完成率要實測'], ['mid', '語音作答要把自由回答對應到選項，需 LLM 分類＋信心門檻']],
  html: () => {
    const q = QUIZ[S.quiz.i], sc = SCENE[q.id || q.k], picked = S.quiz.picked;
    return `<div class="q${picked != null ? ' answered' : ''}">
      <p class="q-scene">${sc.lines.map(l => `<span>${l}</span>`).join('')}</p>
      <h1 class="q-ask">${q.q}</h1>
      <div class="q-answers" role="group" aria-label="${esc(q.q)}">${q.a.map((a, j) => `<button class="q-answer${picked === j ? ' picked' : ''}" data-act="ans" data-arg="${j}"${picked != null ? ' disabled' : ''}>${a[0]}</button>`).join('')}</div>
    </div>`;
  },
  on: {
    ans(j) {
      checkpoint();
      const q = QUIZ[S.quiz.i], a = q.a[j];
      buzz(); S.quiz.ans[q.k] = a[1]; (S.quiz.votes = S.quiz.votes || {})[q.k] = [...(S.quiz.votes[q.k] || []), a[1]]; if (!S.needs.includes(a[2])) S.needs.push(a[2]);
      learn(`${TRAIT_LABEL[a[1]]} → 需求：${a[2]}`); S._react = `記下了：${TRAIT_LABEL[a[1]]}，家要有${a[2]}。`;
      // A beat: the choice stays lit and the room answers it, then the next scene.
      S.quiz.picked = +j; save(); render(false); hold();
      setTimeout(() => {
        S.quiz.picked = null;
        if (++S.quiz.i >= QUIZ.length) { const A = traitsFromVotes(); S.persona = { key: `${A.charge}-${A.items}-${A.rhythm}-${A.time}`, traits: A }; next(true); }
        else { busy = false; save(); render(true); }
      }, reduceMotion.matches ? 250 : 750);
    },
  },
});

def('persona', {
  label: '第 2 關・人格卡', stage: 's2',
  guide: '人格卡不含預算和照片，可以放心分享。',
  note: '生活人格配上看屋選出的風格，再說出家需要什麼。人格決定準則，眼睛決定風格。名字逐字浮現，客廳的光依晨型或夜貓切換。',
  tech: [['ok', '分享圖：伺服器端產生 OG 圖（Satori / Canvas），不帶個資'], ['mid', '命名和梗是否讓人想截圖：5–8 人質性測試'], ['mid', '「本週居家辯論」需要營運內容與審核，排在後面']],
  html: () => {
    const [name, quote, needs] = PERSONAS[S.persona.key], eye = rankStyles()[0].n, t = S.persona.traits;
    return `<article class="persona-reveal">
      <h1 class="persona-name" style="--n:${[...name].length}" aria-label="你的居家人格：${name}">${[...name].map((ch, i) => `<span style="--i:${i}" aria-hidden="true">${ch}</span>`).join('')}</h1>
      <p class="persona-quote">${quote}</p>
      <p class="persona-traits">${traitSentence(t)}</p>
      <dl class="persona-facts">
        <div><dt>你的眼睛</dt><dd>${eye}</dd></div>
        <div><dt>家要有</dt><dd>${needs.join('、')}</dd></div>
        <div><dt>要避開</dt><dd>${t.time === 'am' ? '窗簾厚到早上醒不來' : '早上有人開大燈'}</dd></div>
      </dl>
      <div class="not-me" role="group" aria-label="不太像？換一個特質"><p>不太像你？換一個特質</p><div class="chips">${Object.entries(t).map(([k, v]) => `<button class="chip" data-act="flip" data-arg="${k}">改成${TRAIT_LABEL[OPPOSITE[v]]}</button>`).join('')}</div></div>
      <p class="disclaimer">僅供娛樂，不是心理評估</p>
    </article>
    ${cta(`<div class="row2"><button class="btn ghost" data-act="share">${icon('share-network')}分享</button><button class="btn" data-act="go">下一關</button></div>`)}`;
  },
  on: { flip(k) { checkpoint(); const t = S.persona.traits; t[k] = OPPOSITE[t[k]]; S.persona.key = `${t.charge}-${t.items}-${t.rhythm}-${t.time}`; learn(`人格修正：改成${TRAIT_LABEL[t[k]]} → ${PERSONAS[S.persona.key][0]}`); S._react = `改好了：${PERSONAS[S.persona.key][0]}。`; save(); render(false); },
    share() { const [name, quote] = PERSONAS[S.persona.key]; shareCard({ kicker: '我的居家人格', title: name, line: quote, tags: ['charge', 'items', 'rhythm', 'time'].map(k => TRAIT_LABEL[S.persona.traits[k]]), file: '回家之前-居家人格' }); }, go() { learn(`人格：${PERSONAS[S.persona.key][0]}；準則：${PERSONAS[S.persona.key][2].join('、')}`); next(); } },
});

def('family', {
  label: '第 3 關・家人共測', stage: 's3',
  guide: () => ({ idle: '預算和房間照片預設不會分享。', sent: '不用等，家人測完我會通知你。', pending: '不用等，家人測完我會通知你。', loading: '正在比對兩個人的答案。', done: '共同點先鎖定，分歧之後再討論。', solo: '之後有人搬進來，可以再補測。' }[S.family.status]),
  note: '分享前講清楚會給對方看什麼。家人非同步作答，不卡主流程：你先往下走，家人完成時通知並合併進定案卡。家人結果取交集，不取平均。',
  tech: [['ok', '邀請連結：簽章 token＋免註冊臨時 session；可撤回'], ['ok', '測完才解鎖互看：伺服器端控管，不靠前端隱藏'], ['ok', '非同步合併：家人完成 → 推播／站內通知 → 定案卡重算（本 prototype 在你往下走約 5 秒後模擬完成）'], ['mid', '家人實際完成率是最大未知；要做漏斗追蹤'], ['mid', '家人在你進 3D 之後才完成：要決定是否回頭改已生成的 3D，或只更新準則'], ['mid', '未成年家人與個資：需要同意流程，法務確認']],
  html: () => {
    const F = S.family;
    if (F.status === 'idle') return `<h1 class="title">一起測我們的家</h1>
      <p class="lead">家人點你傳的連結就能作答，約兩分鐘，不用註冊。你不用等對方測完。</p>
      <div class="rel" role="group" aria-label="和誰一起住"><p>和誰一起住？</p><div class="chips">${Object.keys(REL).map(r => { const on = (F.rel || '伴侶') === r; return `<button class="chip${on ? ' on' : ''}" data-act="rel" data-arg="${r}" aria-pressed="${on}">${r}</button>`; }).join('')}</div></div>
      <dl class="facts">
        <div><dt>會分享</dt><dd>人格卡、你喜歡的圖片</dd></div>
        <div><dt>不會分享</dt><dd>預算、房間照片</dd></div>
      </dl>
      ${cta('<button class="btn orange" data-act="send">傳送邀請連結</button>', '<button class="btn text" data-act="solo">我一個人住，略過</button>')}`;
    if (F.status === 'sent' || F.status === 'pending') return `<h1 class="title">邀請已送出</h1>
      <p class="lead">家人作答中，測完才看得到對方的答案。你可以先往下走，結果會自動合併進定案卡。</p>
      ${cta('<button class="btn" data-act="go">繼續下一關</button>', '<button class="btn text" data-act="sim">Prototype：立刻模擬家人作答</button>')}`;
    if (F.status === 'loading') return `<h1 class="title">比對中</h1>
      <div class="sk-card" aria-busy="true" aria-label="正在產生同住組合"><span class="sk" style="width:40%;height:16px"></span><span class="sk" style="width:70%;height:32px"></span><span class="sk" style="width:55%;height:24px"></span><span class="sk" style="width:85%;height:20px"></span></div>`;
    if (F.status === 'solo') return `<h1 class="title">已略過家人共測</h1><p class="lead">風格只依你的選擇決定。之後有人搬進來，可以再補測。</p>${cta('<button class="btn" data-act="go">下一關</button>')}`;
    const c = F.combo, mine = PERSONAS[S.persona ? S.persona.key : 'solo-few-tidy-am'][0], theirs = PERSONAS[F.partner][0];
    return `<h1 class="style-name" style="white-space:normal">${c.name}</h1>
      <p class="lead">${mine}，遇上${theirs}。</p>
      <dl class="facts">
        <div><dt>共同喜歡</dt><dd>${c.common.join('、') || '還沒找到，後面的關卡會再比對'}</dd></div>
        <div><dt>最常吵</dt><dd>${c.fight}</dd></div>
        <div><dt>先解決</dt><dd>${c.fix}</dd></div>
      </dl>
      <p class="disclaimer">有梗的名字，不打分數</p>
      ${cta(`<div class="row2"><button class="btn ghost" data-act="share">${icon('share-network')}傳到群組</button><button class="btn" data-act="go">下一關</button></div>`)}`;
  },
  on: {
    rel(r) { S.family.rel = r; save(); render(false); },
    send() { checkpoint(); S.family.status = 'sent'; learn(`同住對象：${S.family.rel || '伴侶'}`); toast('邀請連結已複製（示意）'); learn('邀請同住家人'); save(); render(false); },
    solo() { checkpoint(); S.family.status = 'solo'; learn('一個人住：略過家人共測'); save(); render(false); },
    sim() {
      checkpoint(); S.family.status = 'loading'; mascot('think'); save(); render(false);
      setTimeout(() => { completeFamily(false); save(); if (S.cur === 'family') render(false); mascot('speak'); }, 900);
    },
    share() { const c = S.family.combo; shareCard({ kicker: '我們的同住組合', title: c.name, line: `最常吵：${c.fight}`, tags: c.common.length ? c.common : ['還在找共同點'], file: '回家之前-同住組合' }); },
    go() {
      if (S.family.status === 'sent') { checkpoint(); S.family.status = 'pending'; learn('家人非同步作答：先往下走'); next(true); return; }
      next();
    },
  },
});

// Share image: the rendered room as backdrop, the card text on top. No budget or photos ever go on it.
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
async function shareCard({ kicker, title, line, tags, file }) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  try { g.drawImage(await loadImg('../key-visuals/app/share-bg.jpg'), 0, 0, W, H); } catch (e) { g.fillStyle = '#29251f'; g.fillRect(0, 0, W, H); }
  const fade = g.createLinearGradient(0, H * .38, 0, H); fade.addColorStop(0, 'rgba(13,10,7,0)'); fade.addColorStop(.45, 'rgba(13,10,7,.78)'); fade.addColorStop(1, 'rgba(13,10,7,.92)');
  g.fillStyle = fade; g.fillRect(0, 0, W, H);
  const sans = '"Manrope","PingFang TC","Noto Sans TC",sans-serif', serif = sans;
  g.textBaseline = 'alphabetic'; g.fillStyle = '#ffd98a'; g.font = `600 34px ${sans}`; g.fillText(kicker, 80, H - 470);
  g.fillStyle = '#fbf8f2'; g.font = `700 104px ${serif}`; g.fillText(title, 76, H - 350);
  g.fillStyle = '#e8dcc8'; g.font = `500 40px ${sans}`; g.fillText(line, 80, H - 270);
  let x = 80; g.font = `600 30px ${sans}`;
  tags.slice(0, 4).forEach(t => { const w = g.measureText(t).width + 40; g.fillStyle = 'rgba(251,248,242,.14)'; g.beginPath(); g.roundRect(x, H - 220, w, 56, 12); g.fill(); g.fillStyle = '#fbf8f2'; g.fillText(t, x + 20, H - 182); x += w + 14; });
  try { g.drawImage(await loadImg('../logo.svg'), 80, H - 120, 56, 56); } catch (e) { /* logo is decoration */ }
  g.fillStyle = '#fbf8f2'; g.font = `700 38px ${serif}`; g.fillText('回家之前', 150, H - 78);
  g.fillStyle = 'rgba(251,248,242,.6)'; g.font = `500 24px ${sans}`; g.textAlign = 'right'; g.fillText('僅供娛樂，不含預算與照片', W - 80, H - 80);
  c.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    openSheet(`<h3>分享圖</h3><img class="share-preview" src="${url}" alt="${esc(kicker + '：' + title)}"><p class="sub">只有名稱、標籤和示意客廳，不含預算和房間照片。</p><div class="row2"><button class="btn ghost" id="share-close">關閉</button><a class="btn" href="${url}" download="${file}.png">儲存圖片</a></div>`,
      s => { $('#share-close', s).onclick = closeSheet; });
    learn(`產生分享圖：${title}`);
  }, 'image/png');
}
function completeFamily(async) {
  const me = S.persona ? S.persona.traits : { charge: 'solo', items: 'few', rhythm: 'tidy', time: 'am' };
  const rel = S.family.rel || '伴侶', k = REL[rel];
  const p = { ...me, [k]: OPPOSITE[me[k]] };
  const partner = `${p.charge}-${p.items}-${p.rhythm}-${p.time}`;
  const pMu = [S.eng.mu[0] * .6 + .3, -.5, S.eng.mu[2]];
  const mine = tagsFor(S.eng.mu, S.eng.v).map(t => t.label), theirs = tagsFor(pMu, [.3, .3, .3]).map(t => t.label);
  const [name, fight, fix] = CONFLICT[k];
  S.family = { status: 'done', rel, merged: async, partner, combo: { name, fight, fix, common: mine.filter(t => theirs.includes(t)) } };
  learn(`${rel}${async ? '（非同步完成）' : ''}：${PERSONAS[partner][0]}；分歧：${fight} → ${fix}`);
}
// Who you live with decides which habit you are most likely to clash on.
const REL = { 伴侶: 'charge', 室友: 'rhythm', 爸媽: 'time', 兄弟姊妹: 'items', 小孩: 'items' };
// Family members answer on their own time. Once the user has moved on, a pending invite "completes" a few seconds later.
let familyTimer = null;
function scheduleFamily() {
  if (S.family.status !== 'pending' || S.cur === 'family' || familyTimer) return;
  familyTimer = setTimeout(() => {
    familyTimer = null;
    if (S.family.status !== 'pending') return;
    completeFamily(true); save();
    toast(`家人測完了：${S.family.combo.name}，已合併進定案卡`);
    if (S.cur === 'card') render(false); else renderNotes(SCREENS[S.cur]);
  }, 5000);
}
function cancelFamilyTimer() { clearTimeout(familyTimer); familyTimer = null; }

// The mall sells the same element schema the rest of the flow uses: four shops, one part each.
const MALL = [['sofa', '沙發店'], ['lamp', '燈具店'], ['curtain', '窗簾店'], ['rug', '地毯店'], ['floor', '地板行'], ['wall', '油漆行']];
// An option's rough position on the taste dimensions: the average of its compatible styles.
const optionX = o => { const xs = o.s.map(n => STYLES[n].x); return [0, 1, 2].map(i => xs.reduce((t, x) => t + x[i], 0) / xs.length); };
// Close-up cameras per shop, metres in the room (sofa wall at -z, window at +x).
const MALL_CAMS = {
  sofa: { pos: [.75, 1.0, .8], look: [-.4, .5, -1.35], fov: 50 },
  lamp: { pos: [.35, 1.1, .7], look: [-.42, 1.95, -.3], fov: 50 },
  curtain: { pos: [.1, 1.35, .25], look: [2.4, 1.5, -.3], fov: 58 },
  rug: { pos: [.45, 1.5, 1.0], look: [-.5, 0, -.55], fov: 54 },
  floor: { pos: [1.2, 1.45, 1.5], look: [.4, 0, .2], fov: 56 },
  wall: { pos: [.9, 1.35, 1.2], look: [-.9, 1.5, -2.1], fov: 58 },
};
const mallShotCache = new Map(), mallShotWaiting = new Set();
// Each item is the current taste room with that one option swapped in, photographed close up.
function mallShot(k, o) {
  if (!glReady()) return itemArt(k, o.c);
  const base = tasteDesign(), key = `${base.style}|${k}|${o.n}`;
  if (!mallShotCache.has(key)) {
    const d = { ...base, [k]: PART[k].list.indexOf(o) };
    mallShotCache.set(key, gl3d.ctl.snapshot({ parts: partsOf(d), style: STYLES[d.style], light: 'day', ...MALL_CAMS[k], w: 560, h: 420 }));
    // A sofa or lamp whose model is still loading is missing from this first shot; retake once it lands.
    if (o.m && !gl3d.ctl.modelReady(o.m) && !mallShotWaiting.has(key)) {
      mallShotWaiting.add(key);
      gl3d.ctl.whenModel(o.m).then(() => { mallShotWaiting.delete(key); mallShotCache.delete(key); if (S.cur === 'mall') renderKeepScroll(); });
    }
  }
  return `<img class="shot" src="${mallShotCache.get(key)}" alt="${esc(o.n)}" width="560" height="420">`;
}
def('mall', {
  label: '第 4 關・軟裝商場', stage: 's4',
  step: () => `已收集 ${S.mall.clues.length} 條線索`,
  guide: '左右滑換店面，喜歡哪裡就點哪裡。',
  note: '四家店賣的就是元素清單裡的選項，單品特寫由同一個 3D 場景即時拍攝（套進你目前口味的客廳）。收藏的單品如果和之後選的方向相容，會直接放進佈置。',
  tech: [['ok', '單品特寫＝3D 場景換上該選項後拍一張快照，不需要獨立的商品圖庫'], ['ok', '收藏會帶進第 5 關：相容就直接套用，否則只當線索'], ['mid', '正式版接品牌商品時，授權、下架與變價的維護是主要成本'], ['mid', '和看屋關卡功能重疊；A/B 驗證不出增益就併入第 5 關']],
  html: () => {
    const M = S.mall;
    return `<h1 class="title">今天先逛${'一二三四五六'[MALL.length - 1]}家店</h1>
      <p class="sub">不看價格，只記你喜歡它的哪裡。${M.clues.length ? `線索：${M.clues.join('、')}。` : ''}</p>
      <div class="aisle">${MALL.map(([k, shopName], si) => {
        const list = PART[k].list, i = (M.idx[si] || 0) % list.length, o = list[i];
        const got = M.collected.some(c => c.k === k && c.n === o.n);
        return `<section class="shop" aria-label="${shopName}">
          <figure class="shop-view">${mallShot(k, o)}</figure>
          <div class="shop-row"><b>${o.n}</b><small>${shopName}・${i + 1}／${list.length}</small></div>
          <div class="chips">${[['c', '這個顏色'], ['s', `${o.s[0]}的感覺`]].map(([aKey, label]) => { const clue = aKey === 'c' ? o.n : o.s[0], on = M.clues.includes(clue);
            return `<button class="chip${on ? ' on' : ''}" data-act="like" data-arg="${si}:${aKey}" aria-pressed="${on}">${label}</button>`; }).join('')}</div>
          <div class="row2"><button class="btn ghost" data-act="nextItem" data-arg="${si}">下一件</button><button class="btn ${got ? 'ghost' : 'orange'}" data-act="keep" data-arg="${si}" ${got ? 'disabled' : ''}>${got ? '已收藏' : '收藏'}</button></div></section>`; }).join('')}</div>
      ${cta(`<button class="btn" data-act="go">${M.clues.length || M.collected.length ? '帶著收穫去佈置' : '略過商場'}</button>`, '<p class="disclaimer">選修關卡，可以略過</p>')}`;
  },
  on: {
    like(arg) {
      const [si, aKey] = arg.split(':'), k = MALL[si][0], list = PART[k].list, o = list[(S.mall.idx[si] || 0) % list.length];
      const clue = aKey === 'c' ? o.n : o.s[0];
      if (S.mall.clues.includes(clue)) return;
      checkpoint(); S.mall.clues.push(clue);
      observe(aKey === 'c' ? optionX(o) : STYLES[clue].x, 1, .4); learnTags([o], .3);
      learn(`商場線索：${clue}`); S._react = `記下了：你喜歡${clue}。`;
      save(); renderKeepScroll();
    },
    keep(si) {
      const k = MALL[si][0], list = PART[k].list, o = list[(S.mall.idx[si] || 0) % list.length];
      if (S.mall.collected.some(c => c.k === k && c.n === o.n)) return;
      checkpoint(); S.mall.collected.push({ k, n: o.n }); observe(optionX(o), 1, .6); learnTags([o], .4);
      learn(`收藏：${PART[k].n}「${o.n}」`); S._react = '收藏了。之後選方向時如果合拍，會直接放進佈置。';
      save(); renderKeepScroll();
    },
    nextItem(si) { const k = MALL[si][0], list = PART[k].list, o = list[(S.mall.idx[si] || 0) % list.length]; if (!S.mall.collected.some(c => c.k === k && c.n === o.n)) { observe(optionX(o), 0, .2); learnTags([o], -.1); } S.mall.idx[si] = (S.mall.idx[si] || 0) + 1; save(); renderKeepScroll(); },
    go() { if (S.mall.collected.length) learn(`帶著 ${S.mall.collected.length} 件收藏去佈置`); next(); },
  },
});

function renderKeepScroll() { const a = $('.aisle'), x = a ? a.scrollLeft : 0; render(false); const b = $('.aisle'); if (b) b.scrollLeft = x; }

def('dirs', {
  label: '第 5 關・佈置', stage: 's5',
  guide: '挑戰者是你可能沒想過的方向。',
  note: '主方向和相鄰方向來自偏好排名；再放一個挑戰者，避免只確認已知的口味。',
  tech: [['ok', '風格向量 × 偏好後驗排名，挑戰者取不同象限'], ['mid', '風格分類本身（6 種）需設計師定義和覆核']],
  html: () => {
    if (!S.dirs) { const r = rankStyles(); S.dirs = [r[0].n, r[1].n, r[r.length > 4 ? 3 : 2].n]; }
    const roles = ['最接近你的口味', '相鄰的方向', '你可能沒想過的'];
    return `<h1 class="title">三個方向，選一個開始</h1>
      ${S.dirs.map((n, i) => `<button class="dir${i === 0 ? ' main' : ''}" data-act="pick" data-arg="${n}">${stylePlate(n, true)}
        <div><b>${n}</b><span>${roles[i]}：${STYLES[n].note}</span></div></button>`).join('')}
      <details class="all-styles"><summary>其他 ${Object.keys(STYLES).length - S.dirs.length} 種風格也看看</summary>
        <div class="style-grid">${Object.keys(STYLES).filter(n => !S.dirs.includes(n)).map(n => `<button class="style-tile" data-act="pick" data-arg="${n}">${stylePlate(n, true)}<span>${n}</span></button>`).join('')}</div></details>`;
  },
  on: { pick(n) {
    const { applied, skipped } = setDesign(n);
    learn(`選定方向：${n}${n === S.dirs[2] ? '（挑戰者）' : S.dirs.includes(n) ? '' : '（從全部風格挑的）'}`);
    if (!S.dirs.includes(n)) observe(STYLES[n].x, 1, .6);
    if (applied.length) learn(`收藏放進佈置：${applied.join('、')}`);
    if (skipped.length) learn(`收藏與${n}不搭，保留：${skipped.join('、')}`);
    const parts = [applied.length ? `你收藏的${applied.join('、')}放進來了` : '', skipped.length ? `「${skipped.join('、')}」不太搭${n}，先留在收藏` : ''].filter(Boolean);
    if (parts.length) S._react = parts.join('；') + '。';
    next();
  } },
});

// The single unlocked swap, inside the style, that the current taste scores highest.
function bestSwap(d) {
  let best = null;
  PARTS.forEach(({ k }) => { if (S.locks[k]) return; const base = itemScore(opt(d, k));
    alternatives(d, k).forEach(v => { const nd = { ...d, [k]: v }, gain = itemScore(PART[k].list[v]) - base; if (gain > .05 && !clashes(nd).length && (!best || gain > best.gain)) best = { k, v, gain }; }); });
  return best;
}
const rerollable = d => PARTS.filter(p => !S.locks[p.k] && alternatives(d, p.k).length);
def('lock', {
  label: '第 5 關・鎖定與重抽', stage: 's5',
  step: () => `第 ${S.rounds + 1} 輪`,
  guide: '鎖住想留下的，其他交給我重抽。',
  note: '在圖上點選想留下的元素，其餘重抽。重抽只在這個風格的相容選項裡挑，並避開已知的衝突搭配。元素清單和定案卡、3D、報價共用同一份。',
  tech: [['low', '在 AI 生成圖上「只換沙發、其他不變」：純文字生圖做不到一致；需要 inpainting / 分割遮罩，延遲數秒到數十秒、成本高'], ['ok', '替代：預先準備分層素材（6 個元素各一層）即時合成，如本 prototype；生成只用在最後一張'], ['ok', '搭配約束：每個選項標相容風格＋衝突表；重抽時過濾（本 prototype 已示範）'], ['mid', '相容與衝突表需要設計師維護；選項變多後要改成規則或打分，不是手寫清單'], ['mid', '$ 相對價位需要材料單價表，且要標明區域與日期']],
  html: () => {
    const d = S.design, n = rerollable(d).length;
    return `<h1 class="title">鎖住喜歡的，其他重抽</h1>
      ${glReady() ? `<p class="cue">${S._loading ? '重抽中…' : S.lockHintSeen ? `${d.style}・第 ${S.rounds + 1} 輪` : '點畫面上的家具或下方清單，鎖住想留下的東西'}</p>` : `      <div class="pin-room${S._loading ? ' loading' : ''}" aria-busy="${!!S._loading}">${room(designPalette(), { title: `${d.style}客廳` })}
        ${PARTS.map(({ k, n: name, pin: [x, y] }) => `<button class="pin${S.locks[k] ? ' locked' : ''}" style="left:${x}%;top:${y}%" data-act="lock" data-arg="${k}" tabindex="-1" aria-hidden="true">${icon(S.locks[k] ? 'lock-simple' : 'plus')}${name}</button>`).join('')}
        ${S.lockHintSeen ? '' : '<span class="lock-hint">點圖上的標籤或下方清單，鎖住想留下的東西</span>'}</div>`}
      <ul class="locks">${PARTS.map(({ k, n: name }) => { const it = opt(d, k), alt = alternatives(d, k).length;
        return `<li><button class="lock-row${S.locks[k] ? ' on' : ''}" data-act="lock" data-arg="${k}" aria-pressed="${!!S.locks[k]}"><span class="swatch" style="background:${it.c}"></span><span>${name}：${it.n}</span><em>${S.locks[k] ? '已鎖定' : alt ? '會重抽' : '風格內唯一'}・<span class="sr">價位</span>${tier(it.p)}</em>${icon(S.locks[k] ? 'lock-simple' : 'plus')}</button></li>`; }).join('')}</ul>
      ${(() => { const r = bestSwap(d); return r ? `<button class="reco-chip" data-act="reco">${icon('lightning')}<span><small>這一輪推薦</small>${PART[r.k].n}換成${PART[r.k].list[r.v].n}</span></button>` : ''; })()}
      <div class="look-pick" role="group" aria-label="${d.style}的精選搭配"><p>或直接套用${d.style}的精選搭配（鎖住的不會變）</p><div class="chips">${LOOKS.map((l, i) => [l, i]).filter(([l]) => l.style === d.style).map(([l, i]) => `<button class="chip" data-act="look" data-arg="${i}">${l.name}</button>`).join('')}</div></div>
      <p class="sub small">重抽只在「${d.style}」相容的選項裡挑。</p>
      ${cta(`<div class="row2"><button class="btn ghost" data-act="reroll" ${!n || S._loading ? 'disabled' : ''}>${icon('arrow-clockwise')}重抽 ${n} 項</button><button class="btn" data-act="go">就這樣</button></div>`)}`;
  },
  mount() {
    if (!glReady()) return;
    const ui = $('#stage-ui');
    ui.innerHTML = PARTS.map(({ k, n }) => `<button class="pin on-stage${S.locks[k] ? ' locked' : ''}" data-k="${k}" tabindex="-1" aria-hidden="true">${icon(S.locks[k] ? 'lock-simple' : 'plus')}${n}</button>`).join('');
    const place = () => {
      const phone = $('#phone').getBoundingClientRect(), first = screenEl.firstElementChild, top = 76, bottom = first ? first.getBoundingClientRect().top - phone.top - 24 : 9999;
      ui.querySelectorAll('.pin').forEach(b => { const p = gl3d.ctl.project(b.dataset.k), ok = !!p && p[1] > top && p[1] < bottom; b.classList.toggle('shown', ok); if (p) { b.style.left = clamp(p[0], 48, phone.width - 48) + 'px'; b.style.top = p[1] + 'px'; } });
    };
    stageReady.then(place);
    ui.onclick = e => { const b = e.target.closest('.pin'); if (b) SCREENS.lock.on.lock(b.dataset.k); };
    return () => { ui.innerHTML = ''; ui.onclick = null; };
  },
  on: {
    lock(k) { if (busy) return; checkpoint(); S.locks[k] = !S.locks[k]; S.lockHintSeen = true; const p = PART[k]; if (S.locks[k]) { learn(`鎖定${p.n}：${opt(S.design, k).n}`); S._react = `${p.n}鎖住了，重抽時不會變。`; } save(); render(false); },
    reroll() {
      checkpoint(); S._loading = true; S.lockHintSeen = true; mascot('think'); render(false);
      setTimeout(() => {
        const r = rng(Date.now() & 0xffff), parts = rerollable(S.design);
        let nd, avoided = 0;
        for (let t = 0; t < 40; t++) {
          nd = { ...S.design };
          parts.forEach(({ k }) => { const alts = alternatives(S.design, k); nd[k] = alts[Math.floor(r() * alts.length)]; });
          if (!clashes(nd).length) break;
          avoided++;
        }
        S.design = nd; S.rounds++; S._loading = false;
        learn(`重抽第 ${S.rounds} 輪（限${S.design.style}相容選項${avoided ? `，避開 ${avoided} 個衝突搭配` : ''}）`);
        S._react = `第 ${S.rounds} 輪重抽完成${avoided ? '，避開了不搭的組合' : ''}。`; save(); render(false); mascot('speak');
      }, 450);
    },
    reco() { const r = bestSwap(S.design); if (!r) return; checkpoint(); S.design[r.k] = r.v; learnTags([PART[r.k].list[r.v]], .3); S.rounds++; learn(`採用推薦：${PART[r.k].n}換成${PART[r.k].list[r.v].n}`); S._react = `${PART[r.k].n}換成${PART[r.k].list[r.v].n}。`; save(); render(false); },
    look(i) {
      const lk = LOOKS[+i]; checkpoint();
      PARTS.forEach(p => { if (!S.locks[p.k]) S.design[p.k] = lk[p.k]; });
      S.rounds++; learn(`套用精選搭配：${lk.name}`); S._react = `換成「${lk.name}」了${PARTS.some(p => S.locks[p.k]) ? '，鎖住的沒動' : ''}。`; save(); render(false);
    },
    go() { learn(`佈置：${PARTS.map(p => `${p.n}${opt(S.design, p.k).n}`).join('、')}`); next(); },
  },
});

def('vary', {
  label: '第 5 關・只改一處', stage: 's5',
  guide: '其他東西都不動，一次只比一樣。',
  note: '每輪只改一兩個維度，才知道為什麼選。',
  tech: [['ok', '單一維度對照：同一底圖換一層即可，成本低'], ['ok', '得到乾淨的單維偏好資料，可回饋引擎']],
  html: () => {
    const k = S.varyK || 'wall', P = PART[k], list = P.list, cur = S.design[k], alts = alternatives(S.design, k);
    // Compatible options first, then the rest of the catalogue, six in all.
    const opts = [cur, ...alts, ...list.map((_, i) => i).filter(i => i !== cur && !alts.includes(i))].slice(0, 6);
    const recV = opts.reduce((b, i) => itemScore(list[i]) > itemScore(list[b]) ? i : b, opts[0]);
    const keep = PARTS.filter(p => p.k !== k).slice(0, 2).map(p => `${opt(S.design, p.k).n}${p.n}`).join('、');
    return `<div class="peek-tabs vary-tabs" role="tablist" aria-label="這輪要比的東西">${PARTS.map(p => `<button role="tab" class="${p.k === k ? 'on' : ''}" aria-selected="${p.k === k}" data-act="part" data-arg="${p.k}">${p.n}</button>`).join('')}</div>
      <h1 class="title">這輪只改${P.n}</h1><p class="sub">${keep}和其他東西都保持不變。</p>
      ${glReady() ? `<div class="swatch-row" role="group" aria-label="${P.n}">${opts.map(i => `<button class="swatch-pick${i === cur ? ' on' : ''}" data-act="pick" data-arg="${i}" aria-pressed="${i === cur}"><span class="swatch-dot" style="background:${list[i].c}"></span>${list[i].n}${i === recV && i !== cur ? '<small class="rec">推薦</small>' : list[i].s.includes(S.design.style) ? '' : '<small>跨風格</small>'}</button>`).join('')}</div>` : `<div class="variants">${opts.map(i => `<button class="variant${i === cur ? ' on' : ''}" data-act="pick" data-arg="${i}" aria-pressed="${i === cur}">${room(designPalette(S.design, { [k]: list[i].c }), { title: list[i].n + P.n })}${list[i].n}</button>`).join('')}</div>`}
      ${cta('<button class="btn" data-act="go">選好了，下一關</button>')}`;
  },
  on: {
    part(k) { S.varyK = k; save(); render(false); },
    pick(i) { checkpoint(); const k = S.varyK || 'wall', o = PART[k].list[+i]; S.design[k] = +i; learnTags([o], .3); learn(`單維偏好：${PART[k].n}選${o.n}`); S._react = `${PART[k].n}換成${o.n}。`; save(); render(false); },
    go() { next(); },
  },
});

def('guess', {
  label: '第 6 關・猜中測試', stage: 's6',
  step: () => S.guess.i < GUESS_N ? `${S.guess.i + 1} / ${GUESS_N}` : '結果',
  guide: '都是你選的方向，只換了一兩樣。這些答案只用來檢查。',
  note: '在你選的方向裡換一兩樣元素，先猜你會不會接受再揭曉。答案不進訓練。結果只當提示，不會把你退回上一關。',
  tech: [['ok', '題目是已選方向內的變體（同風格、相容選項），比跨風格留出圖更貼近真正要做的決定'], ['ok', '答案不進訓練；猜中率＋校準度是 JEV 對基準模型的驗收指標'], ['mid', '5 題樣本太小，統計上不可靠；只當互動回饋與「3D 階段先問哪幾項」的線索']],
  html: () => {
    const G = S.guess;
    if (!G.vars) G.vars = makeVariants();
    if (G.i >= GUESS_N) {
      const hits = G.res.filter(Boolean).length, missed = missedParts();
      return `<h1 class="title">猜中 <span class="num">${hits} / ${GUESS_N}</span></h1>
        <ol class="guess-list">${G.vars.map((v, j) => { const guessYes = v.p >= .5, hit = G.res[j], saidYes = hit ? guessYes : !guessYes;
          return `<li class="${hit ? 'hit' : 'miss'}">${icon(hit ? 'check' : 'x')}<span><b>${v.changes.map(c => c.label).join('、')}</b><small>我猜${guessYes ? '還想住' : '不想'}・你說${saidYes ? '還想住' : '不想'}</small></span></li>`; }).join('')}</ol>
        <p class="sub">${hits >= 4 ? '你的取捨大致抓到了。' : hits >= 2 ? '大方向對，細節還有出入。' : '這幾題猜得不準，細節偏好跟我想的不一樣。'}${missed.length ? `猜錯的集中在：${missed.join('、')}。進 3D 後我會先問這幾項。` : ''}</p>
        <p class="disclaimer">只有 ${GUESS_N} 題，僅供參考</p>
        ${cta('<button class="btn" data-act="go">去試住</button>', '<button class="btn text" data-act="redo">想再微調佈置</button>')}`;
    }
    const v = G.vars[G.i], last = G.res[G.res.length - 1];
    return `<div class="guess-result">${G.vars.map((_, j) => `<i class="${j < G.res.length ? (G.res[j] ? 'hit' : 'miss') : ''}"></i>`).join('')}</div>
      <h1 class="title">換成這樣，你還想住嗎？</h1>
      ${glReady() ? '' : `<div class="pin-room">${room(designPalette(v.d), { title: `${S.design.style}變體：${v.changes.map(c => c.label).join('、')}` })}</div>`}
      <ul class="changes">${v.changes.map(c => `<li><b>${PART[c.k].n}</b>${c.from}<span aria-hidden="true">→</span><span class="sr">換成</span>${c.to}</li>`).join('')}</ul>
      <p class="reveal">${G.answered ? `我猜你${v.p >= .5 ? '還想住' : '不想住'}（${Math.round(v.p * 100)}%），${last ? '猜中了。' : '這次沒猜中。'}` : '我已經猜好了，等你回答。'}</p>
      ${cta(G.answered ? '<button class="btn" data-act="nextg">下一題</button>' : '<div class="row2"><button class="btn ghost" data-act="ans" data-arg="0">不想</button><button class="btn orange" data-act="ans" data-arg="1">還想住</button></div>')}`;
  },
  on: {
    ans(y) { checkpoint(); const G = S.guess, v = G.vars[G.i], hit = (v.p >= .5 ? 1 : 0) === +y; G.res.push(hit); G.answered = true; learn(`變體 ${G.i + 1}（${v.changes.map(c => c.label).join('、')}）：${hit ? '猜中' : '猜錯'}（不進訓練）`); save(); render(false); },
    nextg() { S.guess.i++; S.guess.answered = false; save(); render(false); },
    redo() { checkpoint(); S.guess = { i: 0, res: [], answered: false, vars: null }; go('lock', true); },
    go() { const m = missedParts(); if (m.length) learn(`3D 先確認：${m.join('、')}`); next(); },
  },
});
const GUESS_N = 6;
// Variants inside the chosen direction: swap one or two parts for another option compatible with the same style.
function makeVariants() {
  const d = S.design, r = rng(4242 + S.rounds * 17 + d.floor), base = dot(S.eng.mu, designAttrs(d)), out = [];
  const pool = PARTS.filter(p => alternatives(d, p.k).length);
  for (let t = 0; t < GUESS_N; t++) {
    const picks = [pool[(t * 2 + Math.floor(r() * 2)) % pool.length]];
    if (t % 2 && pool.length > 1) picks.push(pool[(t * 2 + 3) % pool.length]);
    const nd = { ...d }, changes = [];
    [...new Set(picks)].forEach(({ k, n }) => { const alts = alternatives(d, k), j = alts[Math.floor(r() * alts.length)]; changes.push({ k, from: opt(d, k).n, to: PART[k].list[j].n, label: `${n}換${PART[k].list[j].n}` }); nd[k] = j; });
    // Same direction, so lean towards "still want to live here" unless the change moves against the learned taste.
    out.push({ d: nd, changes, p: sig(4 * (dot(S.eng.mu, designAttrs(nd)) - base) + .4) });
  }
  return out;
}
const missedParts = () => [...new Set((S.guess.vars || []).flatMap((v, i) => S.guess.res[i] === false ? v.changes.map(c => PART[c.k].n) : []))];

// A day in the room: name, light, line, icon.
const STAY = { am: ['早晨', 'day', '早上的光從窗簾透進來。', 'sun'], noon: ['午後', 'golden', '午後的斜陽照到沙發上。', 'sun'], eve: ['傍晚', 'dusk', '傍晚回到家，燈剛打開。', 'moon'], night: ['深夜', 'night', '深夜只留一盞燈。', 'moon'] };
def('stay', {
  label: '第 6 關・試住一天', stage: 's6',
  guide: '切換白天和傍晚，看看哪個時段最像你的家。',
  note: '在定案的客廳裡換上早晚光線，分開「喜歡看」和「想住」。',
  tech: [['ok', '早晚兩套光線：同一個場景換燈光即可'], ['low', '用使用者自家照片直接換風格並保持結構：生成品質與尺寸可信度不足，首版不承諾'], ['mid', '照片上傳：壓縮、EXIF 移除、私人儲存']],
  html: () => `<h1 class="title">在這裡住一天</h1>
    <p class="lead">${STAY[S.stayT || 'am'][2]}想每天住在這裡嗎？</p>
    <div class="toggle four" role="group" aria-label="時段">${Object.entries(STAY).map(([k, [n, , , ic]]) => { const on = (S.stayT || 'am') === k; return `<button class="${on ? 'on' : ''}" data-act="t" data-arg="${k}" aria-pressed="${on}">${icon(ic)}${n}</button>`; }).join('')}</div>
    ${glReady() ? '' : `<div class="pin-room">${room(designPalette(), { title: '試住樣板房', dusk: S.dusk })}</div>`}
    <label class="btn text" style="cursor:pointer">有自家照片？上傳看看（示意）<input type="file" accept="image/*" hidden id="own"></label>
    ${cta('<div class="row2"><button class="btn ghost" data-act="adjust">再調整</button><button class="btn orange" data-act="yes">想住</button></div>')}`,
  mount(el) { $('#own', el).addEventListener('change', () => toast('照片已收到。正式版才會處理。')); },
  on: { t(v) { S.stayT = v; S.dusk = v === 'eve' || v === 'night'; (S.staySeen = S.staySeen || []).includes(v) || S.staySeen.push(v); save(); render(false); }, adjust() { learn('試住：還想調整'); go('lock'); }, yes() { learn(`試住：想住（看過${(S.staySeen || ['am']).map(k => STAY[k][0]).join('、')}）`); next(); } },
});

// Routes that skip the personality quiz still ask the two questions that drive storage and lighting.
const MINI = ['rhythm', 'time'];
const miniQuiz = () => `<section class="mini" aria-label="補兩題">
  <h2>補兩題，讓 3D 更貼近你的生活</h2>
  ${MINI.map(k => { const q = QUIZ.find(x => x.k === k);
    return `<div class="mini-q" role="group" aria-label="${esc(q.q)}"><p>${q.scene}<b>${q.q}</b></p><div class="chips">${q.a.map((a, j) => `<button class="chip${S.mini[k] === j ? ' on' : ''}" data-act="mini" data-arg="${k}:${j}" aria-pressed="${S.mini[k] === j}">${a[0]}</button>`).join('')}</div></div>`; }).join('')}
  <p class="sub small">可以略過，之後在 3D 裡再補。</p></section>`;
// Picker sheet: tap a suggestion or type one. Used by the final card's editable rows.
function openPicker(title, pool, hint, onPick) {
  const commit = v => { v = (v || '').trim().slice(0, 12); if (!v) return; closeSheet(); checkpoint(); onPick(v); save(); render(false); };
  openSheet(`<h3>${esc(title)}</h3>
    <div class="chips">${pool.slice(0, 12).map(x => `<button class="chip" data-pick="${esc(x)}">${x}</button>`).join('') || '<span class="sub">沒有建議了，自己打一個吧。</span>'}</div>
    <label class="field-label" for="pick-input">或自己打一個</label><input id="pick-input" autocomplete="off" placeholder="${esc(hint)}">
    <div class="row2"><button class="btn ghost" id="pick-cancel">取消</button><button class="btn" id="pick-go">加入</button></div>`,
    sh => {
      sh.querySelectorAll('[data-pick]').forEach(b => { b.onclick = () => commit(b.dataset.pick); });
      $('#pick-cancel', sh).onclick = closeSheet;
      $('#pick-go', sh).onclick = () => commit($('#pick-input', sh).value);
      $('#pick-input', sh).addEventListener('keydown', e => { if (e.key === 'Enter') commit(e.target.value); });
    });
}
const NEVER_POOL = ['大理石', '黑色金屬', '大面積木紋', '繁複花紋', '深色牆', '鏡面裝飾', '開放式層架', '長毛地毯', '亮面烤漆', '水晶燈', '厚重窗簾', '冷白光', '皮革沙發', '淺色布沙發', '玻璃茶几', '整面壁紙'];
const RULE_POOL = [...new Set(QUIZ.flatMap(q => q.a.map(x => x[2])))];
function finalCard() {
  const d = S.design, mu = S.eng.mu;
  // Locked parts are fixed; with no explicit locks, the three big surfaces count as chosen and the rest stays open.
  const anyLock = PARTS.some(p => S.locks[p.k]);
  const isFixed = k => anyLock ? !!S.locks[k] : ['floor', 'wall', 'sofa'].includes(k);
  const locked = PARTS.filter(p => isFixed(p.k)).map(p => `${p.n}・${opt(d, p.k).n}`);
  if (mu[1] < -.25) locked.push('低裝飾');
  const never = [];
  if (mu[0] > .25) never.push('大理石', '黑色金屬'); else if (mu[0] < -.25) never.push('大面積木紋');
  if (mu[1] < -.25) never.push('繁複花紋'); if (mu[2] > .25) never.push('深色牆');
  const open = PARTS.filter(p => !isFixed(p.k)).map(p => `${p.n}・目前${opt(d, p.k).n}`);
  const F = S.family, rules = S.persona ? [...PERSONAS[S.persona.key][2]] : MINI.filter(k => S.mini[k] != null).map(k => QUIZ.find(q => q.k === k).a[S.mini[k]][2]);
  if (F.combo) rules.push(...F.combo.fix.split('、'));
  const family = F.status === 'done' ? { state: 'done', text: `${F.combo.name}${F.merged ? '（剛合併）' : ''}`, common: F.combo.common }
    : F.status === 'pending' ? { state: 'pending', text: '家人還在作答，完成後會自動合併' } : null;
  const E = S.cardEdits || { addNever: [], delNever: [], addRules: [], delRules: [] };
  const never2 = [...new Set([...never.filter(x => !E.delNever.includes(x)), ...E.addNever])];
  const rules2 = [...new Set([...rules.filter(x => !E.delRules.includes(x)), ...E.addRules])];
  return { style: d.style, locked: [...new Set(locked)], never: never2, open, rules: rules2, family };
}
def('card', {
  label: '終章・風格定案卡', stage: 's6',
  guide: () => S.family.status === 'pending' ? '家人還沒測完也能先進 3D，結果出來會再合併。' : '之後在 3D 裡還能修改。',
  note: '寫清楚風格、準則、絕對不要和還能變的項目，是進 3D 的依據。欄位直接對應同一份元素清單（地板、牆、沙發、地毯、窗簾、燈具）。',
  tech: [['ok', '定案卡是結構化 JSON（鎖定、不要、準則、彈性），直接當 3D 生成條件'], ['ok', '元素清單單一來源：鎖定、定案卡、3D 物件名、語音指令、報價明細共用'], ['ok', '版本化保存：之後修改留下歷史'], ['mid', '家人在定案後才完成：只更新準則，或提示使用者重新確認']],
  html: () => {
    const c = finalCard(), f = c.family;
    const chips = (list, rm, add, addLabel) => `<span class="edit-chips">${list.map(x => `<button class="chip rm" data-act="${rm}" data-arg="${esc(x)}" aria-label="移除「${esc(x)}」">${x}${icon('x')}</button>`).join('')}<button class="chip add" data-act="${add}">${icon('plus')}<span class="sr">${addLabel}</span></button></span>`;
    return `${glReady() ? '' : room(designPalette(), { title: '定案客廳' })}
      <h1 class="style-name">${c.style}</h1>
      <p class="lead">這是你的風格定案卡。「不要」和「準則」可以直接增刪，進 3D 之後每一項還能用說的改。</p>
      <dl class="facts" id="card-facts">
        <div><dt>留下</dt><dd>${c.locked.join('、')}</dd></div>
        <div><dt>不要</dt><dd>${chips(c.never, 'rmNever', 'addNever', '加一條不要')}</dd></div>
        <div><dt>準則</dt><dd id="card-rules">${c.rules.length || S.persona ? chips(c.rules, 'rmRule', 'addRule', '加一條準則') : '回答下面兩題，就會產生準則'}</dd></div>
        <div><dt>還能改</dt><dd>${c.open.join('、')}</dd></div>
        ${f ? `<div><dt>家人</dt><dd>${f.state === 'pending' ? '還在作答，完成後自動合併' : `${f.text}${f.common && f.common.length ? `，一起喜歡${f.common.join('、')}` : ''}`}</dd></div>` : ''}
      </dl>
      ${S.persona ? '' : miniQuiz()}
      ${cta('<button class="btn orange" data-act="go">確認，進入 3D</button>')}`;
  },
  on: {
    mini(arg) {
      const [k, j] = arg.split(':'), q = QUIZ.find(x => x.k === k), a = q.a[+j];
      checkpoint(); S.mini[k] = +j; learn(`補題：${TRAIT_LABEL[a[1]]} → 準則：${a[2]}`); S._react = `記下了：${a[2]}。`; save(); render(false);
    },
    rmNever(x) { checkpoint(); const E = S.cardEdits; if (E.addNever.includes(x)) E.addNever = E.addNever.filter(v => v !== x); else if (!E.delNever.includes(x)) E.delNever.push(x); learn(`拿掉「不要${x}」`); save(); render(false); },
    addNever() { openPicker('加一條「不要」', NEVER_POOL.filter(x => !finalCard().never.includes(x)), '例如：鏡面裝飾', v => { const E = S.cardEdits; E.delNever = E.delNever.filter(x => x !== v); if (!E.addNever.includes(v)) E.addNever.push(v); learn(`加上「不要${v}」`); S._react = `記下了：不要${v}。`; }); },
    rmRule(x) { checkpoint(); const E = S.cardEdits; if (E.addRules.includes(x)) E.addRules = E.addRules.filter(v => v !== x); else if (!E.delRules.includes(x)) E.delRules.push(x); learn(`拿掉準則「${x}」`); save(); render(false); },
    addRule() { openPicker('加一條準則', RULE_POOL.filter(x => !finalCard().rules.includes(x)), '例如：貓抓不壞的布', v => { const E = S.cardEdits; E.delRules = E.delRules.filter(x => x !== v); if (!E.addRules.includes(v)) E.addRules.push(v); learn(`加上準則「${v}」`); S._react = `記下了：${v}。`; }); },
    go() { const c = finalCard(); learn(`定案：${c.style}；不要 ${c.never.join('、') || '—'}`); next(); },
  },
});

// ---------- F: 3D with voice edits ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function parseCommand(text) {
  const out = [], parts = text.split(/[，,。、；;]|然後|還有/).map(s => s.trim()).filter(Boolean);
  const pickColor = (s, list, map) => { for (const [re, n] of map) if (re.test(s)) return list.findIndex(x => x.n === n); return -1; };
  for (const s of parts) {
    if (/收納|櫃/.test(s)) { out.push({ kind: 'storage', label: '電視牆加收納櫃', wait: true }); continue; }
    if (/移|搬|挪/.test(s)) { out.push({ kind: 'move', label: '移動家具', blocked: '需要房間尺寸才能檢查會不會撞到東西，目前做不到。' }); continue; }
    if (/窗簾/.test(s)) { const j = pickColor(s, CURTAINS, [[/遮光|深|暗/, '遮光絨布'], [/百葉|木/, '木百葉'], [/紗|白|透/, '白紗'], [/黃/, '芥末黃'], [/淺|亞麻|米/, '亞麻']]); if (j >= 0) out.push({ kind: 'curtain', v: j, label: `窗簾換${CURTAINS[j].n}` }); continue; }
    if (/地毯/.test(s)) { const j = pickColor(s, RUGS, [[/條紋/, '靛藍條紋'], [/編織/, '焦糖編織'], [/紅|花|波斯/, '磚紅波斯'], [/深|黑|炭/, '炭灰短毛'], [/灰/, '淺灰素面'], [/白|長毛/, '白色長毛'], [/淺|米|燕麥/, '燕麥圈絨']]); if (j >= 0) out.push({ kind: 'rug', v: j, label: `地毯換${RUGS[j].n}` }); continue; }
    if (/吊燈|燈具|燈款|水晶燈|提燈/.test(s)) { const j = pickColor(s, LAMPS, [[/黃銅|金/, '黃銅吊燈'], [/黑|鐵|工業/, '黑鐵吊燈'], [/水晶/, '水晶燈'], [/提燈|復古/, '復古提燈'], [/紙|和/, '和紙吊燈'], [/白|簡/, '白色極簡']]); if (j >= 0) out.push({ kind: 'lamp', v: j, label: `燈具換${LAMPS[j].n}` }); continue; }
    if (/沙發/.test(s)) { const j = pickColor(s, SOFAS, [[/靛藍|深藍/, '靛藍布'], [/木框/, '木框布墊'], [/毛圈|奶油/, '奶油毛圈'], [/香檳/, '香檳絨'], [/切斯特|拉扣/, '切斯特皮'], [/雕花|古典/, '雕花布面'], [/雕花皮|皮革雕花/, '雕花皮革'], [/淺灰|灰/, '淺灰布'], [/淺|白|米/, '米色布'], [/深|黑/, '深灰布'], [/綠/, '墨綠絨'], [/皮|棕|咖啡/, '焦糖皮']]); if (j >= 0) out.push({ kind: 'sofa', v: j, label: `沙發換${SOFAS[j].n}` }); continue; }
    if (/牆/.test(s)) { const j = pickColor(s, WALLS, [[/靛|深藍/, '靛藍'], [/炭黑|黑/, '炭黑'], [/清水模|水泥/, '清水模'], [/灰泥|藝術/, '藝術灰泥'], [/橄欖/, '橄欖綠'], [/香檳/, '香檳灰'], [/奶油/, '奶油白'], [/綠/, '灰綠'], [/藍/, '霧藍'], [/灰/, '淺灰'], [/陶|橘|紅/, '陶土'], [/奶茶|米/, '奶茶'], [/白|淺/, '暖白']]); if (j >= 0) out.push({ kind: 'wall', v: j, label: `牆面換${WALLS[j].n}` }); continue; }
    if (/地板|地面/.test(s)) { const j = pickColor(s, FLOORS, [[/大理石/, '大理石'], [/柚木|拼花/, '柚木拼花'], [/水泥|粉光/, '水泥粉光'], [/原木/, '原木地板'], [/深|胡桃/, '胡桃木'], [/灰/, '灰色超耐磨'], [/人字/, '白橡人字拼'], [/淺|白|橡/, '淺橡木'], [/磨石/, '水磨石']]); if (j >= 0) out.push({ kind: 'floor', v: j, label: `地板換${FLOORS[j].n}` }); continue; }
    if (/燈|暗|亮|傍晚|晚上|白天/.test(s)) { const dusk = /暗|傍晚|晚上|黃/.test(s); out.push({ kind: 'dusk', v: dusk, label: dusk ? '切到傍晚燈光' : '切到白天光線' }); continue; }
  }
  return out;
}
// Every face carries data-obj so the scene mirrors a GLB with named nodes (floor, wall, sofa, rug, curtain, lamp…).
function room3d(v) {
  const W = 250, D = 210, H = 140, f = [];
  let obj = '';
  const face = (w, h, tf, bg, extra = '') => f.push(`<div class="face" data-obj="${obj}" style="width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px;transform:${tf};background:${bg};${extra}"></div>`);
  const box = (cx, cz, w, h, d, c, y0 = 0) => {
    face(w, d, `translate3d(${cx}px,${-h - y0}px,${cz}px) rotateX(90deg)`, shade(c, .08));
    face(w, h, `translate3d(${cx}px,${-h / 2 - y0}px,${cz + d / 2}px)`, c);
    face(d, h, `translate3d(${cx + w / 2}px,${-h / 2 - y0}px,${cz}px) rotateY(90deg)`, shade(c, -.12));
    face(d, h, `translate3d(${cx - w / 2}px,${-h / 2 - y0}px,${cz}px) rotateY(-90deg)`, shade(c, -.06));
  };
  const c = k => opt(v, k).c, wall = c('wall'), sofa = c('sofa'), st = STYLES[v.style];
  obj = 'floor'; face(W, D, 'rotateX(90deg)', c('floor'));
  obj = 'wall'; face(W, H, `translate3d(0,${-H / 2}px,${-D / 2}px)`, wall);
  face(D, H, `translate3d(${-W / 2}px,${-H / 2}px,0) rotateY(90deg)`, shade(wall, -.06));
  obj = 'window'; face(70, 60, `translate3d(30px,-80px,${-D / 2 + 1}px)`, v.dusk ? '#46506a' : '#bfdbe6', 'border:4px solid #eee8da');
  obj = 'curtain'; face(16, 78, `translate3d(-12px,-76px,${-D / 2 + 2}px)`, c('curtain')); face(16, 78, `translate3d(72px,-76px,${-D / 2 + 2}px)`, shade(c('curtain'), -.06));
  obj = 'rug'; face(140, 90, `translate3d(0,-1px,10px) rotateX(90deg)`, c('rug'), 'border-radius:6px');
  obj = 'sofa'; box(-20, -D / 2 + 35, 130, 18, 46, sofa); box(-20, -D / 2 + 16, 130, 46, 10, shade(sofa, -.05));
  box(-90, -D / 2 + 35, 14, 30, 46, shade(sofa, -.04)); box(50, -D / 2 + 35, 14, 30, 46, shade(sofa, -.04));
  obj = 'table'; box(-5, 30, 60, 16, 34, st.table);
  obj = 'lamp'; face(2, 34, `translate3d(-5px,${-H + 17}px,30px)`, '#5b5142'); box(-5, 30, 26, 10, 26, c('lamp'), H - 44);
  if (v.storage) { obj = 'wall_tv'; box(-W / 2 + 12, 20, 22, 64, 100, shade(st.table, .3)); box(-W / 2 + 26, 20, 4, 28, 60, '#2a2724', 50); }
  if (st.plant) { obj = 'plant'; box(W / 2 - 22, -D / 2 + 30, 16, 18, 16, '#a35b31'); box(W / 2 - 22, -D / 2 + 30, 22, 30, 22, '#5f7d68', 18); }
  if (v.dusk) f.push(`<div class="face" data-obj="light" style="width:220px;height:220px;margin:-110px 0 0 -110px;transform:translate3d(0,-60px,0);background:#ffcf7a;opacity:.16;border-radius:50%;pointer-events:none"></div>`);
  return f.join('');
}
// Example sentences under the mic, four at a time; every one parses to a real edit (or an honest "can't").
const SAY = ['沙發換淺色，電視牆多一點收納', '牆換灰綠色', '窗簾換白紗、地毯換深灰', '燈光暗一點', '地板換人字拼', '吊燈換黃銅', '沙發換墨綠絨', '牆換奶茶色', '地毯換條紋', '窗簾換木百葉', '地板換水磨石，吊燈換和紙', '把沙發移到窗邊'];
let micCtl = null;
const finePointer = matchMedia('(pointer:fine)').matches;
// Walkable three.js room, loaded on first visit to the 3D screen. Until it is ready (or if it fails, e.g. offline)
// the CSS room above stays in place.
const gl3d = { state: 'idle', ctl: null, progress: 0 };
let tourTimer = null;
const partsOf = v => Object.fromEntries(PARTS.map(p => [p.k, opt(v, p.k)]));
const canGyro = 'DeviceOrientationEvent' in window && matchMedia('(pointer:coarse)').matches;
function loadGL() {
  gl3d.state = 'loading';
  import('./room3d.js')
    .then(m => m.createRoom({ onProgress: f => { gl3d.progress = f; const b = $('#gl-progress'); if (b) b.style.transform = `scaleX(${f})`; } }))
    .then(ctl => { gl3d.ctl = ctl; gl3d.state = 'ready'; render(false); })
    .catch(err => { console.warn('3D load failed', err); gl3d.state = 'failed'; if (S.cur === 'f3d') { toast('擬真 3D 載入失敗，先用簡易示意'); render(false); } });
}
def('f3d', {
  label: '3D 提案・客廳',
  guide: () => { const m = missedParts(); return (m.length ? `先確認${m.join('、')}要不要換。` : '') + (SR ? '按住麥克風說話，或點下面的句子。' : '這個瀏覽器不支援語音，可以打字或點下面的句子。'); },
  note: '邊看 3D 邊說，系統先複述聽到的內容，區分「馬上能改」和「需要等待」。每次修改存成新版本，可還原。',
  tech: [['ok', '自適應畫質：只有 3D 這關跑連續繪製，其他畫面都只畫單格；連續繪製時監測幀時間，過慢先降解析度、再關陰影'], ['ok', '3D：three.js r180＋GLB。家具用免費授權模型（Poly Haven CC0、Khronos／Wayfair CC BY 4.0），地板、牆、地毯、窗簾程式產生以便換色；物件名稱即元素清單的 key（sofa、wall_tv…）'], ['ok', '可走進去：拖曳環顧、點地板走過去、預設視角、方向鍵；手機可用陀螺儀；有頭顯可進 WebXR VR'], ['mid', '首次載入約 1.2 MB 模型＋three.js（收納櫃另 1.2 MB，需要時才載）；中低階手機的陰影與幀率要實測'], ['mid', 'iOS Safari 不支援 WebXR VR；陀螺儀需要使用者點按授權'], ['ok', '階段 1 按住說話：STT → LLM tool call → 改場景參數'], ['mid', `Web Speech API：${SR ? '這個瀏覽器有支援，' : '這個瀏覽器不支援，'}iOS Safari 支援不完整；正式版建議伺服器端 STT，並實測台灣口音（Breeze-ASR 等）`], ['low', '連續對話、可打斷：手機瀏覽器回音消除和音訊路由問題，排最後'], ['low', '語音移動家具：沒有尺寸就無法做碰撞檢查'], ['mid', '報價：要坪數和單價表，不可由 LLM 估；明細列與元素清單一一對應，才查得到每一項的依據']],
  html: () => {
    if (!S.v3d) S.v3d = { versions: [{ ...S.design, storage: false, dusk: false }], cur: 0, pending: null, busy: false };
    const V = S.v3d, v = V.versions[V.cur];
    const gl = gl3d.state === 'ready';
    return `<h1 class="sr">3D 提案：客廳</h1>
      ${gl ? '' : `<div class="viewer" id="viewer" tabindex="0" aria-label="${gl ? '3D 客廳，可以走進去看。拖曳環顧，點地板走過去，方向鍵移動和轉身' : '3D 客廳示意，可拖曳或用左右鍵旋轉'}">
        ${gl ? '' : `<div class="world" id="world" style="transform:rotateX(-24deg) rotateY(${V.angle ?? -32}deg)">${room3d(v)}</div>`}
        ${gl3d.state === 'loading' ? `<div class="gl-loading" role="status"><span>正在載入可走進去的 3D 客廳</span><i class="gl-bar"><i id="gl-progress" style="transform:scaleX(${gl3d.progress})"></i></i></div>` : ''}
        <span class="ver">版本 ${V.cur + 1}</span>${V.busy ? `<span class="busy-tag"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>收納櫃生成中</span>` : ''}
        <span class="pick-label" id="pick-label" role="status" aria-live="polite"></span>
        <div class="viewer-meta"><span class="hint">${gl ? '拖曳環顧・點地板走過去・點家具看名稱' : '拖曳旋轉（簡易示意）'}</span><span class="rot"><button data-act="rot" data-arg="-15" aria-label="向左轉">${icon('arrow-counter-clockwise')}</button><button data-act="rot" data-arg="15" aria-label="向右轉">${icon('arrow-clockwise')}</button></span></div></div>`}
      ${gl ? '' : `<div class="versions" role="group" aria-label="版本">${V.versions.map((_, i) => `<button class="${i === V.cur ? 'on' : ''}" data-act="ver" data-arg="${i}" aria-pressed="${i === V.cur}">版本 ${i + 1}</button>`).join('')}</div>`}
      <details class="quote-box"${V.openQuote ? ' open' : ''}><summary class="quote"><span>粗略報價・假設 8 坪${icon('caret-left')}</span>${V.busy ? '<span class="sk" aria-label="重新計算中"></span>' : `<b>${quoteRange(v)}</b>`}</summary>
        <ul class="quote-items">${quoteItems(v).map(([n, o, c]) => `<li><span>${n}<small>${o}</small></span><b>${c.toFixed(1)} 萬</b></li>`).join('')}<li class="note">示意單價，客廳 8 坪；上限抓下限的 1.3 倍，不含家電</li></ul></details>
      ${gl ? '<p class="credit">沙發 GlamVelvetSofa（Eric Chadwick © Wayfair，已改色）與 SheenWoodLeatherSofa（Eric Chadwick © Darmstadt Graphics Group），CC BY 4.0・其他家具與材質 Poly Haven、Khronos（CC0）・<a href="models/CREDITS.md">來源</a></p>' : ''}
      ${V.pending ? `<div class="confirm"><p>我聽到 ${V.pending.length} 件事，對嗎？</p>
        <ul class="confirm-list">${V.pending.map(c => `<li>${c.label}<em class="${c.blocked ? 'no' : c.wait ? 'wait' : 'now'}">${c.blocked ? '做不到' : c.wait ? '需要重新生成' : '馬上看到'}</em></li>`).join('')}</ul>
        ${V.pending.filter(c => c.blocked).map(c => `<p class="caveat">${icon('warning')}${c.blocked}</p>`).join('')}${V.pending.some(c => c.kind === 'storage') ? `<p class="caveat">${icon('warning')}收納櫃深度要等尺寸確認。</p>` : ''}</div>
        ${cta(`<div class="row2"><button class="btn ghost" data-act="cancel">再想想</button><button class="btn orange" data-act="apply" ${V.pending.every(c => c.blocked) ? 'disabled' : ''}>對，開始改</button></div>`)}`
      : `<div class="mic-row"><button class="mic" id="mic" aria-label="${SR ? '按住說話' : '打字輸入修改'}">${icon('microphone')}</button>
        <div class="mic-copy"><p class="transcript" id="transcript">${V.heard ? '「' + esc(V.heard) + '」' : '想改哪裡？'}</p><p class="mic-label">${SR ? (finePointer ? '按住說話，或按住空白鍵' : '按住說話') : '點一下打字'}</p></div></div>
        <div class="chips say-row">${SAY.slice((V.sayI || 0) * 4, (V.sayI || 0) * 4 + 4).map(t => `<button class="chip" data-act="say" data-arg="${t}">${t}</button>`).join('')}<button class="chip" data-act="moreSay">${icon('arrow-clockwise')}換一批</button><button class="chip" data-act="type">用打字</button></div>`}`;
  },
  mount(el) {
    const world = $('#world', el), V = S.v3d, v = V.versions[V.cur];
    let viewer = $('#viewer', el), cleanup = null;
    if (gl3d.state === 'ready') {
      const c = gl3d.ctl, ui = $('#stage-ui');
      ui.innerHTML = `<div class="touch" id="viewer" tabindex="0" aria-label="3D 客廳，可以走進去看。拖曳環顧，點地板走過去，方向鍵移動和轉身"></div>
        <div class="hud"><div class="hud-top"><div class="versions" role="group" aria-label="版本">${V.versions.map((_, i) => `<button class="${i === V.cur ? 'on' : ''}" data-act="ver" data-arg="${i}" aria-pressed="${i === V.cur}">版本 ${i + 1}</button>`).join('')}</div>${V.busy ? `<span class="busy-tag"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>收納櫃生成中</span>` : ''}<span class="rot"><button data-act="rot" data-arg="-15" aria-label="向左轉">${icon('arrow-counter-clockwise')}</button><button data-act="rot" data-arg="15" aria-label="向右轉">${icon('arrow-clockwise')}</button></span></div>
        <div class="view-bar" role="group" aria-label="視角"><button class="chip tour" data-act="tour">${icon('arrow-clockwise')}導覽一圈</button>${c.views.map(([k, n]) => `<button class="chip" data-act="view" data-arg="${k}">${n}</button>`).join('')}${canGyro ? `<button class="chip${c.gyroOn ? ' on' : ''}" data-act="gyro" aria-pressed="${c.gyroOn}">${icon('arrows-left-right')}轉手機看</button>` : ''}${c.vrSupported ? `<button class="chip vr" data-act="vr">進入 VR</button>` : ''}</div>
        <span class="pick-label" id="pick-label" role="status" aria-live="polite"></span></div>`;
      viewer = $('#viewer', ui);
      c.apply(v, partsOf(v), STYLES[v.style]); c.start(); c.keyScope(viewer);
      cleanup = () => { ui.innerHTML = ''; c.keyScope(null); };
      let p0 = null, last = null, moved = false;
      viewer.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; p0 = last = [e.clientX, e.clientY]; moved = false; viewer.setPointerCapture(e.pointerId); });
      viewer.addEventListener('pointermove', e => {
        if (!p0) return;
        c.drag(e.clientX - last[0], e.clientY - last[1]); last = [e.clientX, e.clientY];
        if (Math.hypot(e.clientX - p0[0], e.clientY - p0[1]) > 6) moved = true;
      });
      viewer.addEventListener('pointerup', e => {
        if (!p0) return; p0 = null; if (moved) return;
        const hit = c.pick(e.clientX, e.clientY), lab = $('#pick-label');
        if (!hit || hit.walk || !lab) return;
        const part = PART[hit.part];
        lab.textContent = part ? `${part.n}：${opt(v, hit.part).n}。可以說「${part.n}換…」` : hit.label;
        lab.classList.add('show'); clearTimeout(lab._t); lab._t = setTimeout(() => lab.classList.remove('show'), 2600);
      });
      viewer.addEventListener('pointercancel', () => { p0 = null; });
      SCREENS.f3d._setAngle = null;
    } else {
      const setAngle = a => { S.v3d.angle = clamp(a, -75, 8); world.style.transform = `rotateX(-24deg) rotateY(${S.v3d.angle}deg)`; };
      let x0 = null, a0 = 0;
      viewer.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; x0 = e.clientX; a0 = S.v3d.angle ?? -32; world.classList.add('dragging'); viewer.setPointerCapture(e.pointerId); });
      viewer.addEventListener('pointermove', e => { if (x0 !== null) setAngle(a0 + (e.clientX - x0) / 3); });
      viewer.addEventListener('pointerup', () => { x0 = null; world.classList.remove('dragging'); save(); });
      viewer.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setAngle((S.v3d.angle ?? -32) + (e.key === 'ArrowLeft' ? -15 : 15)); save(); } });
      SCREENS.f3d._setAngle = setAngle;
    }
    const qb = $('.quote-box', el); if (qb) qb.addEventListener('toggle', () => { S.v3d.openQuote = qb.open; save(); });
    micCtl = null;
    const mic = $('#mic', el); if (!mic) return cleanup;
    if (!SR) { mic.addEventListener('click', openTyped); return cleanup; }
    let rec = null, finalText = '';
    const start = e => {
      if (e) e.preventDefault(); if (rec) return; finalText = '';
      try { rec = new SR(); } catch (err) { toast('語音無法啟動，請改用下方的句子'); return; }
      rec.lang = 'zh-TW'; rec.interimResults = true;
      rec.onresult = ev => { finalText = [...ev.results].map(r => r[0].transcript).join(''); const t = $('#transcript'); if (t) t.textContent = '「' + finalText + '」'; };
      rec.onerror = ev => { toast(ev.error === 'not-allowed' ? '沒有麥克風權限。可以改點下方的句子。' : `語音辨識失敗（${ev.error}），請再試一次。`); mascot('idle'); };
      rec.onend = () => { mic.classList.remove('on'); rec = null; if (finalText) heard(finalText); else mascot('idle'); };
      rec.start(); mic.classList.add('on'); mascot('listen'); bubble('我在聽…');
    };
    const stop = () => { if (rec) { rec.stop(); mascot('think'); } };
    mic.addEventListener('pointerdown', start); mic.addEventListener('pointerup', stop); mic.addEventListener('pointerleave', stop);
    micCtl = { start, stop };
    return cleanup;
  },
  on: {
    say(t) { heard(t); },
    moreSay() { S.v3d.sayI = ((S.v3d.sayI || 0) + 1) % Math.ceil(SAY.length / 4); save(); render(false); },
    type() { openTyped(); },
    rot(d) { if (gl3d.state === 'ready') gl3d.ctl.turn(+d); else { SCREENS.f3d._setAngle((S.v3d.angle ?? -32) + +d); save(); } },
    view(k) { clearTimeout(tourTimer); gl3d.ctl.setView(k); },
    // Guided tour: door → sofa → window, each held long enough to look around.
    tour() {
      clearTimeout(tourTimer); const stops = ['door', 'sofa', 'window', 'door']; let i = 0;
      const go = () => { if (S.cur !== 'f3d' || !gl3d.ctl) return; gl3d.ctl.setView(stops[i]); const lab = $('#pick-label'); if (lab) { lab.textContent = `導覽 ${i + 1}／${stops.length}：${gl3d.ctl.views.find(v => v[0] === stops[i])[1]}`; lab.classList.add('show'); clearTimeout(lab._t); lab._t = setTimeout(() => lab.classList.remove('show'), 1800); } if (++i < stops.length) tourTimer = setTimeout(go, 2600); };
      go();
    },
    gyro() {
      gl3d.ctl.toggleGyro().then(on => { toast(on ? '轉動手機就能環顧四周' : '已關閉轉手機看'); render(false); })
        .catch(() => toast('沒有取得動作感應權限，可以改用拖曳環顧'));
    },
    vr() {
      gl3d.ctl.enterVR().then(session => { toast('已進入 VR。按頭顯的系統鍵可以離開'); session.addEventListener('end', () => { if (S.cur === 'f3d') render(false); }); })
        .catch(() => toast('無法進入 VR，請確認頭顯已連線'));
    },
    ver(i) { S.v3d.cur = +i; save(); render(false); },
    cancel() { S.v3d.pending = null; save(); render(false); },
    apply() {
      checkpoint();
      const V = S.v3d, base = { ...V.versions[V.versions.length - 1] }, cmds = V.pending;
      cmds.filter(c => !c.wait && !c.blocked).forEach(c => { base[c.kind] = c.v; });
      V.versions.push(base); V.cur = V.versions.length - 1; V.pending = null; V.heard = '';
      learn(`語音修改：${cmds.filter(c => !c.blocked).map(c => c.label).join('、')}`);
      S._react = `已存成版本 ${V.versions.length}，不喜歡可以切回前一版。`;
      if (cmds.some(c => c.wait)) {
        V.busy = true; mascot('think');
        setTimeout(() => { const nv = { ...V.versions[V.versions.length - 1], storage: true }; V.versions.push(nv); V.cur = V.versions.length - 1; V.busy = false; save(); if (S.cur === 'f3d') render(false); toast(`收納櫃已加上，存成版本 ${V.versions.length}`); mascot('speak'); }, 2600);
      }
      save(); render(false);
    },
  },
});
function openTyped() {
  openSheet(`<h3>用打字修改</h3><label class="field-label" for="typed">想改什麼？一次可以說好幾件事</label><input id="typed" placeholder="例如：沙發換淺色，牆換灰綠色" autocomplete="off"><div class="row2"><button class="btn ghost" id="typed-cancel">取消</button><button class="btn" id="typed-go">送出</button></div>`,
    sh => { const go = () => { const t = $('#typed', sh).value; closeSheet(); heard(t); }; $('#typed-go', sh).onclick = go; $('#typed-cancel', sh).onclick = closeSheet; $('#typed', sh).addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); $('#typed', sh).focus(); });
}
function heard(text) {
  if (!text || !text.trim()) return;
  const cmds = parseCommand(text); S.v3d.heard = text;
  if (!cmds.length) { S._react = '這句我還聽不懂。可以說「沙發換淺色」或「牆換灰綠色」。'; save(); render(false); return; }
  S.v3d.pending = cmds; S._react = `我聽到 ${cmds.length} 件事，確認後再改。`; save(); render(false);
}
document.addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.repeat || S.cur !== 'f3d' || !micCtl) return;
  if (e.target.closest('input,select,textarea,button:not(#mic)')) return;
  micCtl.start(e);
});
document.addEventListener('keyup', e => { if (e.code === 'Space' && S.cur === 'f3d' && micCtl) micCtl.stop(); });

// ---------- rendering ----------
const screenEl = $('#screen');
function stageLabel(sc) { const st = sc.step ? sc.step() : ''; return st ? `${sc.label}・${st}` : sc.label; }
// Taps that land while a delayed transition is pending would act on a screen that is about to change; drop them.
let busy = false;
const hold = () => { busy = true; };
// Re-rendering replaces the screen's DOM, so remember which control had focus and where the screen was scrolled.
const focusKey = el => el && screenEl.contains(el) && el !== screenEl ? (el.id ? '#' + el.id : el.dataset.act ? `[data-act="${el.dataset.act}"]${el.dataset.arg != null ? `[data-arg="${CSS.escape(el.dataset.arg)}"]` : ''}` : null) : null;
let unmount = null;
// dir: 'fwd' pushes the next screen in from depth, 'back' pulls the previous one forward.
function render(animate = true, dir = 'fwd') {
  const sc = SCREENS[S.cur];
  if (unmount) { unmount(); unmount = null; }
  if (S.cur !== 'f3d' && gl3d.ctl) gl3d.ctl.stop();
  const fk = animate ? null : focusKey(document.activeElement), top = screenEl.scrollTop;
  // On screens with the guess strip, the reaction is written into the strip instead of a bubble over the heading.
  S._inlineReact = S._react && S.mode === 'ai' && INLINE_REACT.includes(S.cur) ? S._react : '';
  screenEl.innerHTML = sc.bare ? sc.html() : `<div class="sheet-body">${sc.html()}</div>`;
  screenEl.classList.toggle('fit', !!sc.fit);
  if (animate) { screenEl.classList.remove('enter', 'back'); void screenEl.offsetWidth; screenEl.classList.add('enter'); screenEl.classList.toggle('back', dir === 'back'); screenEl.scrollTop = 0; }
  else { screenEl.classList.remove('enter'); screenEl.scrollTop = top; }
  screenEl.style.setProperty('--sh', screenEl.clientHeight + 'px');
  stageUpdate(animate);
  if (sc.mount) { const u = sc.mount(screenEl); if (typeof u === 'function') unmount = u; }
  if (fk) { const el = [...screenEl.querySelectorAll(fk)].find(x => x.tabIndex >= 0 && !x.disabled); if (el) el.focus({ preventScroll: true }); }
  updateMore();
  $('#phone').dataset.screen = S.cur;
  $('#back').disabled = !S.hist.length;
  // Only the stages on the chosen route appear, so a quick route does not look unfinished.
  const onRoute = STAGES.filter(([k]) => ROUTES[S.route].some(id => STAGE_OF[id] === k));
  $('#home-map').innerHTML = onRoute.map(([k]) => `<span class="${S.stages[k] ? 'lit' : (sc.stage || STAGE_OF[S.cur]) === k ? 'now' : ''}"></span>`).join('');
  $('#stage-label').textContent = stageLabel(sc);
  const hint = typeof sc.guide === 'function' ? sc.guide() : sc.guide;
  if (S._react) { if (S._inlineReact) { guideLine(S._react); speak(S._react); } else guideLine(S._react, true); S._react = ''; S._inlineReact = ''; }
  else { guideLine(hint); if (animate) speak(hint); }
  renderNotes(sc);
  scheduleFamily();
  if (animate) { const h = $('h1', screenEl); (h || screenEl).setAttribute('tabindex', '-1'); (h || screenEl).focus({ preventScroll: true }); }
}
// Hints go to screen readers; 亮亮 shows up as a bubble only for feedback.
function guideLine(t, react = false) {
  $('#guide-line').textContent = t;
  if (react) { bubble(t); speak(t); }
}
function bubble(t) {
  const b = $('#bubble'); $('#bubble-text').textContent = t; mascot('speak');
  b.classList.add('show'); clearTimeout(bubble._t); bubble._t = setTimeout(() => { b.classList.remove('show'); mascot('idle'); }, 2800);
}
function mascot(state) { $('#mascot').dataset.state = state; }
function speak(t) {
  if (S.muted || !('speechSynthesis' in window)) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-TW'; u.rate = 1.05; speechSynthesis.speak(u); } catch (e) { /* ignore */ }
}
function notesHTML(sc) {
  const E = S.eng;
  const engine = DIMS.map((d, i) => { const m = clamp(E.mu[i], -2, 2), sd = Math.sqrt(E.v[i]); const pos = x => (clamp(x, -2, 2) + 2) / 4 * 100;
    return `<div class="dim"><b>${d.name}</b><div class="dim-track"><span class="dim-band" style="left:${pos(m - sd)}%;width:${pos(m + sd) - pos(m - sd)}%"></span><span class="dim-dot" style="left:${pos(m)}%"></span></div><span>${E.mu[i] >= 0 ? '+' : ''}${E.mu[i].toFixed(2)}</span><div class="dim-ends"><span>${d.lo}</span><span>${d.hi}</span></div></div>`; }).join('');
  const top = rankStyles().slice(0, 3).map(s => s.n).join(' › ');
  return {
    screen: `<b>${esc(stageLabel(sc))}</b><br>${esc(sc.note)}`,
    learned: S.learned.length ? S.learned.slice().reverse().map(l => `<li>${esc(l)}</li>`).join('') : '<li class="empty">還沒有資料，開始作答後會出現在這裡。</li>',
    engine: `${engine}<p class="engine-why">觀察 ${E.n} 次｜目前風格排名：${top}${E.why && S.cur === 'ab' ? '<br>' + esc(E.why) : ''}</p>${tagNotes()}`,
    tech: sc.tech.map(([lv, t]) => `<li><span class="badge ${lv}">${{ ok: '可行', mid: '待驗證', low: '可行性低' }[lv]}</span><span>${esc(t)}</span></li>`).join(''),
  };
}
// Tag weights in the notes panel: the strongest likes and dislikes the item database has learned.
function tagNotes() {
  const P = S.tagPost;
  if (!P || !P.n) return '<p class="engine-why">標籤模型：還沒有資料。每件家具和材質都有色溫、深淺、材質、造型、花樣、年代六個標籤，作答後每個標籤會有一個權重和不確定度。</p>';
  const W = R.TAGS.map(t => [t, R.weight(P, t)]).filter(([, w]) => Math.abs(w.mu) > .1).sort((a, b) => b[1].mu - a[1].mu);
  const row = ([t, w]) => `<span class="tagw ${w.mu > 0 ? 'pos' : 'neg'}">${t}<b>${w.mu > 0 ? '+' : ''}${w.mu.toFixed(1)}</b><small>±${w.sd.toFixed(1)}</small></span>`;
  const A = S.agent, U = R.groupUncertainty(P);
  const agent = A ? `推薦代理：上一次${{ probe: '試探', exploit: '加強', asked: '照你說的換' }[A.mode]}「${slotName(A.k)}」${A.mode === 'probe' ? '（換上還沒摸清楚的標籤）' : A.mode === 'exploit' ? '（換成目前最可能喜歡的）' : ''}。` : '';
  return `<div class="tag-notes"><p class="engine-why">標籤模型（貝氏，更新 ${P.n} 次）｜最不確定：${U.slice(0, 2).map(o => `${o.g} ${o.u.toFixed(2)}`).join('、')}${agent ? '<br>' + agent : ''}</p>
    <div>${W.slice(0, 6).map(row).join('')}${W.length > 6 ? W.slice(-3).filter(([, w]) => w.mu < 0).map(row).join('') : ''}</div></div>`;
}
function renderNotes(sc) {
  const n = notesHTML(sc);
  $('#note-screen').innerHTML = n.screen; $('#note-learned').innerHTML = n.learned; $('#note-engine').innerHTML = n.engine; $('#note-tech').innerHTML = n.tech;
  $('#jump').innerHTML = Object.entries(SCREENS).map(([k, s]) => `<option value="${k}" ${k === S.cur ? 'selected' : ''}>${s.label}</option>`).join('');
}

// ---------- events ----------
// A soft edge above the sticky actions tells people there is more to scroll.
function updateMore() { screenEl.classList.toggle('more', screenEl.scrollHeight - screenEl.scrollTop - screenEl.clientHeight > 4); }
screenEl.addEventListener('scroll', updateMore, { passive: true });
screenEl.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t || t.disabled || busy) return;
  const fn = SCREENS[S.cur].on && SCREENS[S.cur].on[t.dataset.act];
  if (fn) fn(t.dataset.arg, t);
});
$('#back').addEventListener('click', back);
// Keyboard shortcuts for the choice screens; never while typing or with a sheet open.
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || busy || !$('#sheet').hidden || (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]'))) return;
  const press = sel => { const b = screenEl.querySelector(sel); if (b && !b.disabled) { e.preventDefault(); b.click(); } };
  const k = e.key.toLowerCase();
  if (S.cur === 'ab' && S.ab) {
    if (S.ab.picked == null) { const j = '1234'.indexOf(k) >= 0 ? '1234'.indexOf(k) : 'abcd'.indexOf(k); if (j >= 0) press(`[data-act=pick][data-arg="${j}"]`); }
    else if (k === 'enter') press('[data-act=good]');
  }
  else if (S.cur === 'swipe' && !S.swipe.asking) { if (k === 'arrowright') press('[data-act=like]'); else if (k === 'arrowleft') press('[data-act=nope]'); }
  else if (S.cur === 'quiz' && /^[1-6]$/.test(k)) press(`[data-act=ans][data-arg="${+k - 1}"]`);
});
function toggleVoice() {
  S.muted = !S.muted; save(); syncVoice();
  if (S.muted && 'speechSynthesis' in window) speechSynthesis.cancel(); else speak($('#guide-line').textContent);
  toast(S.muted ? '亮亮的語音已關閉' : '亮亮的語音已開啟（瀏覽器朗讀示意）');
}
function syncVoice() { const b = $('#voice-toggle'); b.textContent = `亮亮語音：${S.muted ? '關' : '開'}`; b.setAttribute('aria-pressed', String(!S.muted)); }
$('#voice-toggle').addEventListener('click', toggleVoice);
// AI version vs fixed version, for side-by-side comparison. Switching starts over so the two flows never mix.
function toggleMode() { S.mode = S.mode === 'ai' ? 'classic' : 'ai'; restart(); syncMode(); toast(S.mode === 'ai' ? '已切換到 AI 版，從頭開始' : '已切換到固定版（開場選路線），從頭開始'); }
function syncMode() { $('#mode-toggle').textContent = `流程：${S.mode === 'ai' ? 'AI 版' : '固定版'}`; }
$('#mode-toggle').addEventListener('click', toggleMode);
$('#chapter-card').addEventListener('click', hideChapter);
// HUD buttons in the stage layer use the same data-act handlers as the screen.
$('#stage-ui').addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t || t.disabled || busy) return;
  const fn = SCREENS[S.cur].on && SCREENS[S.cur].on[t.dataset.act];
  if (fn) fn(t.dataset.arg, t);
});
window.addEventListener('resize', () => { screenEl.style.setProperty('--sh', screenEl.clientHeight + 'px'); if (glReady() && S.cur !== 'f3d') stageUpdate(false); });
$('#reset').addEventListener('click', restart);
$('#jump').addEventListener('change', e => { ensureFor(e.target.value); go(e.target.value); });
$('#info').addEventListener('click', () => { const n = notesHTML(SCREENS[S.cur]); openSheet(`<h3>設計與技術註記</h3><div class="notes-block"><h2>這一步</h2><p class="note-screen">${n.screen}</p></div><div class="notes-block"><h2>正式版技術與風險</h2><ul class="tech">${n.tech}</ul></div><div class="notes-block"><h2>決策引擎視角</h2><div class="engine">${n.engine}</div></div><div class="notes-block"><h2>系統學到</h2><ol class="learned">${n.learned}</ol></div><button class="btn ghost" id="sheet-voice">亮亮語音：${S.muted ? '關（點一下開啟）' : '開（點一下關閉）'}</button><button class="btn ghost" id="sheet-mode">流程：${S.mode === 'ai' ? 'AI 版（點一下換固定版）' : '固定版（點一下換 AI 版）'}</button><div class="row2"><button class="btn ghost" id="sheet-reset">重新開始</button><button class="btn" id="sheet-close">關閉</button></div>`, s => { $('#sheet-close', s).onclick = closeSheet; $('#sheet-voice', s).onclick = () => { closeSheet(); toggleVoice(); }; $('#sheet-mode', s).onclick = () => { closeSheet(); toggleMode(); }; $('#sheet-reset', s).onclick = () => { closeSheet(); restart(); }; }); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

// Jumping straight into a later screen needs the prerequisites that earlier screens would have produced.
function ensureFor(id) {
  const order = ROUTES.full; const idx = order.indexOf(id);
  if (id === 'refs') S.route = 'ref';
  else if (!ROUTES[S.route].includes(id) && ROUTES.full.includes(id)) S.route = S.mode === 'ai' ? 'ai' : 'full';
  // Only routes that include the quiz get a stand-in persona; quick and reference routes use the two catch-up questions instead.
  if (idx >= order.indexOf('persona') && !S.persona && ROUTES[S.route].includes('quiz')) { S.quiz.ans = { charge: 'solo', items: 'keep', rhythm: 'loose', time: 'pm' }; S.persona = { key: 'solo-keep-loose-pm', traits: S.quiz.ans }; S.needs = ['大量門片收納', '分區調光']; }
  if (idx >= order.indexOf('lock') && !S.design) { if (!S.dirs) { const r = rankStyles(); S.dirs = [r[0].n, r[1].n, r[3].n]; } setDesign(S.dirs[0]); }
}

function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2400); }
// Bottom sheet: labelled by its heading, keeps Tab inside, and returns focus to the control that opened it.
let sheetReturn = null;
function openSheet(html, mount) {
  const b = $('#sheet');
  sheetReturn = document.activeElement;
  b.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">${html}</div>`;
  const h = $('h3', b); if (h) h.id = 'sheet-title';
  b.hidden = false; b.onclick = e => { if (e.target === b) closeSheet(); };
  b.onkeydown = e => {
    if (e.key !== 'Tab') return;
    const f = [...b.querySelectorAll('button,input,select,[href]')].filter(x => !x.disabled);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  };
  if (mount) mount(b);
  if (!b.contains(document.activeElement)) { const first = $('input,button', b); if (first) first.focus(); }
}
function closeSheet() {
  const b = $('#sheet'); if (b.hidden) return;
  b.hidden = true; b.innerHTML = '';
  if (sheetReturn && document.contains(sheetReturn)) sheetReturn.focus({ preventScroll: true });
  sheetReturn = null;
}

$('#mascot').innerHTML = MASCOT;
syncVoice();
syncMode();
// The 3D room loads at start-up; until then the stage shows a rendered still.
loadGL();
// ?debug=1 shows a small performance readout, for checking frame rates on a real phone over the LAN.
if (new URLSearchParams(location.search).has('debug')) {
  const hud = document.createElement('div');
  hud.id = 'perf-hud';
  $('#phone').append(hud);
  let frames = 0, last = performance.now(), fps = 0;
  const tick = () => { frames++; const now = performance.now(); if (now - last >= 1000) { fps = Math.round(frames * 1000 / (now - last)); frames = 0; last = now; } requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  setInterval(() => {
    const c = gl3d.ctl, mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB' : '—';
    hud.textContent = `fps ${fps}・畫質${c ? c.quality : '…'}・3D ${c && c.live ? Math.round(c.frameMs) + 'ms' : '待機'}・${mem}`;
  }, 500);
}
$('#back').innerHTML = icon('caret-left');
$('#resume-close').innerHTML = icon('x');
$('#info').innerHTML = icon('info');
if (!SCREENS[S.cur]) S.cur = 'intro';
// Coming back mid-flow: say so, and offer a way to start over without hunting for the notes panel.
const resumeEl = $('#resume');
const hideResume = () => { resumeEl.hidden = true; };
if (S.cur !== 'intro' && S.hist.length) {
  resumeEl.hidden = false;
  $('#resume-restart').onclick = () => { hideResume(); restart(); };
  $('#resume-close').onclick = () => { hideResume(); screenEl.focus({ preventScroll: true }); };
}
S._loading = false; S._react = '';
if (S.v3d) S.v3d.busy = false;
ensureFor(S.cur);
render();
})();
