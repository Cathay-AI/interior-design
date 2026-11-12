// 掌握度：屋主補的條件越多，我們對這個家的掌握越高，估價區間就收得越窄。純函式。

export const PING_M2 = 3.3058;
const num = (v) => { const n = Number.parseFloat(v); return Number.isFinite(n) && n > 0 ? n : null; };

/** 長、寬（公尺）都有時回傳坪數（一位小數），否則 null。 */
export function pingFromDims(len, wid) {
  const l = num(len), w = num(wid);
  return l && w ? Math.round((l * w) / PING_M2 * 10) / 10 : null;
}

/**
 * @param {{ping?:string, len?:string, wid?:string, height?:string, ageSet?:boolean}} cond
 * @param {{plan?:number, mep?:number}} docs
 * @returns {{score:number, items:{key:string, label:string, done:boolean, weight:number}[]}} score 0–1
 */
export function contextScore(cond, docs = {}) {
  const dims = Boolean(num(cond.len) && num(cond.wid));
  const items = [
    { key: 'size', label: dims ? '空間長寬' : '坪數', done: dims || Boolean(num(cond.ping)), weight: dims ? 0.3 : 0.2 },
    { key: 'height', label: '天花板高度', done: Boolean(num(cond.height)), weight: 0.1 },
    { key: 'age', label: '屋況', done: Boolean(cond.ageSet), weight: 0.1 },
    { key: 'plan', label: '格局／平面圖', done: Boolean(docs.plan), weight: 0.3 },
    { key: 'mep', label: '機電圖', done: Boolean(docs.mep), weight: 0.2 },
  ];
  const score = Math.round(items.reduce((a, i) => a + (i.done ? i.weight : 0), 0) * 100) / 100;
  return { score, items };
}

/**
 * 掌握度越高，區間越窄：每一項以中點為準，寬度縮成原本的 (1 − 0.5 × score)。
 * 掌握度 0 時不變；滿分時寬度減半。合計由縮窄後的項目重新加總。
 * @template {{low:number, high:number, items:{low:number, high:number}[]}} E
 * @param {E} est @param {number} score @returns {E & {narrowed:number}} narrowed = 區間縮窄的比例 0–0.5
 */
export function tighten(est, score) {
  const narrowed = Math.max(0, Math.min(1, score)) * 0.5;
  const r1 = (v) => Math.round(v * 10) / 10;
  const items = est.items.map((i) => {
    const mid = (i.low + i.high) / 2, half = ((i.high - i.low) / 2) * (1 - narrowed);
    return { ...i, low: r1(mid - half), high: r1(mid + half) };
  });
  const sum = (k) => Math.round(items.reduce((a, i) => a + i[k], 0));
  return { ...est, items, low: sum('low'), high: sum('high'), narrowed };
}
