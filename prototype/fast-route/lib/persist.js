// 進度存檔：重整頁面不會從頭來。純函式；實際讀寫 localStorage 在 app.js。
// 上傳的檔案不存（瀏覽器的預覽網址重整後就失效），還原後請使用者重新附上。

export const KEY = 'fast-route:v1';
const STEPS = 4;

/** @returns {string} JSON：只留可還原的欄位 */
export function serialize(S) {
  const { step, reached, scores, swiped, liked, cond, said, versions, v, view, unlocked, history, reasons } = S;
  return JSON.stringify({ step, reached, scores, swiped, liked, cond, said, versions, v, view, unlocked, history, reasons, hadDocs: S.docs.length });
}

/**
 * @param {string|null} json 存過的字串（可能是舊版、壞掉或被改過）
 * @param {object} blank 全新的狀態
 * @returns {object} 可以直接用的狀態；任何一處對不上就回 blank，不冒險拼湊
 */
/** 後來才加的條件欄位：舊存檔沒有也收，補預設值。 */
const LATER = ['noFurniture', 'unitFloor', 'sprinkler', 'housing'];
export function restore(json, blank) {
  try {
    const d = JSON.parse(json);
    const int = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;
    if (!d || !int(d.step, 1, STEPS) || !int(d.reached, d.step, STEPS) || !int(d.swiped, 0, 999) || !int(d.liked, 0, d.swiped)) return blank;
    if (Object.keys(blank.scores).some((k) => typeof d.scores?.[k] !== 'number')) return blank;
    if (Object.keys(blank.cond).some((k) => !(k in (d.cond ?? {})) && !LATER.includes(k))) return blank;
    if (!Array.isArray(d.versions) || d.versions.some((x) => !x?.look?.name) || !['A', 'B', 'C'].includes(d.view)) return blank;
    if (d.step >= 3 && (!d.versions.length || !int(d.v, 0, d.versions.length - 1) || !d.cond.style)) return blank;
    return { ...blank, step: d.step, reached: d.reached, scores: d.scores, swiped: d.swiped, liked: d.liked, cond: { ...blank.cond, ...d.cond },
      history: Array.isArray(d.history) ? d.history.filter((x) => Array.isArray(x) && x[0] in blank.scores && typeof x[1] === 'boolean').slice(-d.swiped) : [],
      reasons: Array.isArray(d.reasons) ? d.reasons.filter((x) => typeof x === 'string').slice(0, 20) : [],
      said: String(d.said ?? ''), versions: d.versions, v: d.versions.length ? d.v : 0, view: d.view, unlocked: d.unlocked === true, lostDocs: d.hadDocs > 0 };
  } catch {
    return blank;
  }
}

/* ---------- 分享連結：把「哪個風格、改了什麼、我家的條件」放進網址，不需要伺服器 ---------- */
const SHARE_SPACES = ['客廳', '臥室'];
const COND_KEYS = ['space', 'ping', 'len', 'wid', 'height', 'age', 'floors', 'partition', 'unitFloor', 'sprinkler', 'housing'];
const b64 = { enc: (t) => btoa(unescape(encodeURIComponent(t))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (t) => decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/')))) };

/**
 * @param {{cond:object, versions:{edits?:number[]}[], v:number}} S
 * @returns {string} 放在網址 # 後面的字串。只含風格代號、修改的編號與條件，不含上傳的檔案與解鎖狀態。
 */
export function toShare(S) {
  const c = Object.fromEntries(COND_KEYS.filter((k) => S.cond[k] && !(k === 'space' && S.cond[k] === '客廳')).map((k) => [k, S.cond[k]]));   // 客廳是預設，不必帶
  if (S.cond.ageSet) c.ageSet = 1;
  return 'r=' + b64.enc(JSON.stringify({ s: S.cond.style, e: S.versions[S.v]?.edits ?? [], c }));
}

/**
 * @param {string} hash location.hash（含或不含 #）
 * @param {{styles:string[], edits:number, ages:string[]}} known 合法的風格代號、修改數量、屋況選項
 * @returns {null | {style:string, edits:number[], cond:object}} 對不上就回 null；所有值都經過白名單或數字檢查
 */
export function fromShare(hash, known) {
  try {
    const m = String(hash).replace(/^#/, '').match(/^r=([A-Za-z0-9_-]+)$/);
    if (!m) return null;
    const d = JSON.parse(b64.dec(m[1]));
    if (!known.styles.includes(d.s) || !Array.isArray(d.e) || d.e.length > 12) return null;
    if (d.e.some((i) => !Number.isInteger(i) || i < 0 || i >= known.edits)) return null;
    const c = d.c ?? {}, cond = {};
    for (const k of ['ping', 'len', 'wid', 'height', 'floors', 'unitFloor']) if (c[k] != null) { const n = Number.parseFloat(c[k]); if (!(n > 0 && n < 100000)) return null; cond[k] = String(n); }
    if (c.space != null) { if (!SHARE_SPACES.includes(c.space)) return null; cond.space = c.space; }
    if (c.age != null) { if (!known.ages.includes(c.age)) return null; cond.age = c.age; cond.ageSet = Boolean(c.ageSet); }
    if (c.sprinkler != null) { if (!['yes', 'no'].includes(c.sprinkler)) return null; cond.sprinkler = c.sprinkler; }
    if (c.housing != null) { if (!['apt', 'house'].includes(c.housing)) return null; cond.housing = c.housing; }
    if (c.partition != null) { if (!['yes', 'no'].includes(c.partition)) return null; cond.partition = c.partition; }
    return { style: d.s, edits: d.e, cond };
  } catch {
    return null;
  }
}
