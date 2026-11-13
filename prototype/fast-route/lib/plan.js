// 讀平面圖：把模型讀出來的結果整理成房間清單。純函式，瀏覽器和伺服器共用。

/** 模型要照這個格式回答。 */
export const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['is_floor_plan', 'rooms'],
  properties: {
    is_floor_plan: { type: 'boolean', description: '這張圖是不是住宅平面圖' },
    rooms: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['name', 'length_m', 'width_m', 'size_source'],
        properties: {
          name: { type: 'string', description: '房間名稱，繁體中文，8 個字以內，例如 客廳、餐廳、廚房、主臥、次臥 1、書房、主衛、客衛' },
          length_m: { type: 'number', description: '室內淨長邊，公尺' },
          width_m: { type: 'number', description: '室內淨短邊，公尺' },
          size_source: { type: 'string', enum: ['labeled', 'scaled', 'guessed'], description: 'labeled＝圖上直接標了這間的尺寸；scaled＝用圖上其他標註、比例尺或坪數換算；guessed＝圖上沒有可換算的依據，只能照常見大小估' },
        },
      },
    },
  },
};

export const PLAN_PROMPT = `這是一張住宅平面圖。請讀出每一個室內空間，給屋主確認。

要列的：客廳、餐廳、廚房、每一間臥室、書房、每一間衛浴，以及其他有門或有名字的室內房間（和室、儲藏室、更衣室…）。
不要列的：陽台、露台、玄關走道、樓梯間、電梯、管道間、公共區域。
客餐廳沒有隔間時，仍然分成「客廳」「餐廳」兩筆，各給自己那一塊的大小。

名稱用繁體中文。臥室最大的叫「主臥」，其餘叫「次臥 1」「次臥 2」；只有一間就叫「臥室」。衛浴在主臥裡的叫「主衛」，其餘叫「客衛」；只有一間就叫「衛浴」。圖上有寫名字就照圖上的意思。

尺寸是室內淨尺寸，單位公尺，長邊在前。圖上的標註常用公分或公釐（例如 420、4200），請換成公尺。
- 圖上直接標了這間的尺寸：照標註，size_source 填 labeled。
- 沒直接標，但能用其他標註、比例尺或總坪數換算（1 坪＝3.3058 平方公尺）：換算後填 scaled。
- 完全沒有依據：照這種房間的常見大小估，填 guessed。不要為了看起來確定而填 labeled。

不規則的房間，給面積相近的長方形。這張圖如果不是住宅平面圖，is_floor_plan 填 false、rooms 給空陣列。`;

const MIN = 2, MAX = 60;   // 和 context.js 的長寬範圍一致
const fmt = (n) => String(Math.round(n * 10) / 10);

/**
 * @param {unknown} raw 模型回的 JSON（已 parse）
 * @returns {{id:string,name:string,len:string,wid:string,on:boolean,edits:number[],unsure?:boolean}[]|null} 讀不出房間時回 null
 */
export function roomsFromPlan(raw) {
  if (!raw || typeof raw !== 'object' || raw.is_floor_plan !== true || !Array.isArray(raw.rooms)) return null;
  const seen = new Map(), out = [];
  for (const r of raw.rooms.slice(0, 30)) {
    if (!r || typeof r.name !== 'string') continue;
    let name = r.name.replace(/[<>&"'\s]+/g, ' ').trim().slice(0, 8);
    if (!name) continue;
    const a = Number(r.length_m), b = Number(r.width_m), ok = Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0;
    const hi = ok ? Math.max(a, b) : 3, lo = ok ? Math.min(a, b) : 3;
    const len = Math.min(MAX, Math.max(MIN, hi)), wid = Math.min(MAX, Math.max(MIN, lo));
    const unsure = !ok || r.size_source !== 'labeled' || len !== hi || wid !== lo;
    const n = (seen.get(name) ?? 0) + 1; seen.set(name, n);
    if (n > 1) name = `${name.slice(0, 6)} ${n}`;
    out.push({ id: 'r' + (out.length + 1), name, len: fmt(len), wid: fmt(wid), on: true, edits: [], ...(unsure ? { unsure: true } : {}) });
  }
  return out.length ? out : null;
}

/** 圖片送出前縮到這個邊長（像素）：夠模型看清標註，檔案也小。 */
export const MAX_EDGE = 2000;
/** 送出的檔案上限（base64 之前的位元組）。Vercel 的請求上限是 4.5MB，base64 會多三分之一。 */
export const MAX_BYTES = 3_200_000;
export const MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

/** 讀不出來時給屋主看的原因。 */
export const PLAN_ERRORS = {
  nokey: '讀圖功能還沒接上（伺服器沒有設定金鑰）。',
  notplan: '這張看起來不是平面圖，我讀不出房間。',
  toobig: '這個檔案太大，我讀不了。請換一張 3MB 以內的圖片或 PDF。',
  busy: '現在太多人在用，等一下再試。',
  failed: '這次沒讀成功。',
};
