// 我家的圖：屋主上傳的格局圖、平面圖、機電圖。純函式，不碰 DOM。
// 原型階段檔案只留在瀏覽器（不上傳、不判讀）；這裡只負責分類、檢查與摘要。

export const KINDS = { plan: '格局／平面圖', mep: '機電圖', photo: '現況照片' };
export const MAX_FILES = 8;
export const MAX_MB = 20;
export const ACCEPT = 'image/*,application/pdf';

const MEP_WORDS = ['機電', '水電', '電氣', '配電', '插座', '弱電', '給排水', '消防', '空調', 'mep', 'electrical', 'plumbing'];
const PLAN_WORDS = ['平面', '格局', '隔間', '配置', '戶型', '建築', 'plan', 'layout', 'floor'];

/** 依檔名猜圖面種類；猜不到時，PDF 當平面圖、圖片當現況照片。使用者可以改。 */
export function guessKind(name, type = '') {
  const n = name.toLowerCase();
  if (MEP_WORDS.some((w) => n.includes(w))) return 'mep';
  if (PLAN_WORDS.some((w) => n.includes(w))) return 'plan';
  return type === 'application/pdf' ? 'plan' : 'photo';
}

/**
 * @param {{name:string, type:string, size:number}} file
 * @param {number} already 已經有幾份
 * @returns {null | string} 不能收的原因；可以收就回 null
 */
export function rejectReason(file, already) {
  if (already >= MAX_FILES) return `最多 ${MAX_FILES} 份`;
  if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) return `${file.name}：只收圖片或 PDF`;
  if (file.size > MAX_MB * 1024 * 1024) return `${file.name}：超過 ${MAX_MB}MB`;
  return null;
}

/** @param {{kind:string}[]} docs @returns {{plan:number, mep:number, photo:number, total:number, text:string}} */
export function summarize(docs) {
  const n = { plan: 0, mep: 0, photo: 0 };
  for (const d of docs) if (d.kind in n) n[d.kind] += 1;
  const text = Object.entries(n).filter(([, v]) => v).map(([k, v]) => `${KINDS[k]} ${v} 份`).join('、');
  return { ...n, total: docs.length, text };
}
