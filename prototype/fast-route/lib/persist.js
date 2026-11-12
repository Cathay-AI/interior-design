// 進度存檔：重整頁面不會從頭來。純函式；實際讀寫 localStorage 在 app.js。
// 上傳的檔案不存（瀏覽器的預覽網址重整後就失效），還原後請使用者重新附上。

export const KEY = 'fast-route:v1';
const STEPS = 4;

/** @returns {string} JSON：只留可還原的欄位 */
export function serialize(S) {
  const { step, reached, scores, swiped, liked, cond, said, versions, v, view, unlocked } = S;
  return JSON.stringify({ step, reached, scores, swiped, liked, cond, said, versions, v, view, unlocked, hadDocs: S.docs.length });
}

/**
 * @param {string|null} json 存過的字串（可能是舊版、壞掉或被改過）
 * @param {object} blank 全新的狀態
 * @returns {object} 可以直接用的狀態；任何一處對不上就回 blank，不冒險拼湊
 */
export function restore(json, blank) {
  try {
    const d = JSON.parse(json);
    const int = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;
    if (!d || !int(d.step, 1, STEPS) || !int(d.reached, d.step, STEPS) || !int(d.swiped, 0, 999) || !int(d.liked, 0, d.swiped)) return blank;
    if (Object.keys(blank.scores).some((k) => typeof d.scores?.[k] !== 'number')) return blank;
    if (Object.keys(blank.cond).some((k) => !(k in (d.cond ?? {})))) return blank;
    if (!Array.isArray(d.versions) || d.versions.some((x) => !x?.look?.name) || !['A', 'B', 'C'].includes(d.view)) return blank;
    if (d.step >= 3 && (!d.versions.length || !int(d.v, 0, d.versions.length - 1) || !d.cond.style)) return blank;
    return { ...blank, step: d.step, reached: d.reached, scores: d.scores, swiped: d.swiped, liked: d.liked, cond: { ...blank.cond, ...d.cond },
      said: String(d.said ?? ''), versions: d.versions, v: d.versions.length ? d.v : 0, view: d.view, unlocked: d.unlocked === true, lostDocs: d.hadDocs > 0 };
  } catch {
    return blank;
  }
}
