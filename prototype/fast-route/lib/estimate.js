// 預估花費：依「這個設計用了什麼」逐項估算，回傳區間與每一項的依據，不問屋主預算。
// 單價為台灣參考行情量級（萬元），尚未以實際單價表校正；只用來看量級，不是報價。

/** 沒說坪數時的預設值（依空間），畫面上會標示為預設並可修改。 */
export const DEFAULT_PING = { 客廳: 8, 臥室: 5, 書房: 4, 餐廳: 5 };

/** 屋況加項（萬元／坪）：拆除清運、水電管線更新。 */
export const AGE_EXTRA = { 新成屋: null, 中古屋: [1.2, 2.5], 老屋: [3.5, 6] };

const FLOOR = {
  wood: ['超耐磨木地板', 0.45, 0.8],
  concrete: ['礦物塗料／優的鋼石地坪', 0.8, 1.4],
};
/** 家具軟裝等級（沙發、單椅、茶几、邊几、地毯、燈飾）。 */
const FURNITURE = { linen: [9, 16], velvet: [11, 19], leather: [14, 24] };
/** 臥室：床架、床墊、床頭櫃、單椅、燈飾。 */
const BEDROOM_FURNITURE = { linen: [7, 13], velvet: [8, 15], leather: [10, 18] };

const round1 = (v) => Math.round(v * 10) / 10;
const isDark = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) < 110;
};

/** @returns {number} 坪數；沒填或不合理時用空間預設值 */
export function resolvePing(cond) {
  const ping = Number.parseFloat(cond.ping);
  return Number.isFinite(ping) && ping > 0 ? ping : (DEFAULT_PING[cond.space] ?? 8);
}

/**
 * @param {{space:string, ping:string|number, age:string, noFurniture?:boolean}} cond　noFurniture：沿用舊家具或自己買，不計家具軟裝
 * @param {object} look 目前的設計（STYLES 的一筆，可能被修改過）
 * @returns {{low:number, high:number, ping:number, assumedPing:boolean,
 *   items:{key:string, name:string, basis:string, low:number, high:number}[]}}
 */
export function designEstimate(cond, look) {
  if (!(cond.age in AGE_EXTRA)) throw new Error(`unknown 屋況 ${cond.age}`);
  const ping = resolvePing(cond);
  const assumedPing = ping !== Number.parseFloat(cond.ping);
  const items = [];
  const add = (key, name, basis, low, high) => items.push({ key, name, basis, low: round1(low), high: round1(high) });

  const [floorName, fl, fh] = FLOOR[look.floorType] ?? FLOOR.wood;
  add('floor', '地坪', `${floorName} × ${ping} 坪`, fl * ping, fh * ping);

  const special = look.wallType === 'concrete' || isDark(look.wall);
  add('wall', '牆面與天花', special ? `特殊塗料／深色需多道 × ${ping} 坪` : `乳膠漆 × ${ping} 坪`, (special ? 0.45 : 0.25) * ping, (special ? 0.8 : 0.42) * ping);

  // 收納牆寬 175 cm ≈ 5.8 尺；低櫃 160 cm ≈ 5.3 尺。臥室的高櫃是衣櫃（含吊桿、抽屜五金，單價較高）。
  const wood = look.cabinetWood, bedroom = cond.space === '臥室';
  if (bedroom) add('cabinet', '衣櫃與斗櫃', `${wood ? '木皮' : '烤漆'}系統衣櫃 5.8 尺（含吊桿、抽屜）＋窗下斗櫃 5.3 尺`, 5.8 * (wood ? 0.85 : 0.75) + 5.3 * 0.4, 5.8 * (wood ? 1.5 : 1.3) + 5.3 * 0.7);
  else add('cabinet', '收納櫃', `${wood ? '木皮' : '烤漆'}系統高櫃 5.8 尺＋窗下低櫃 5.3 尺`, 5.8 * (wood ? 0.75 : 0.65) + 5.3 * 0.35, 5.8 * (wood ? 1.3 : 1.1) + 5.3 * 0.6);

  add('light', '燈具與電工', `嵌燈、吊燈、${bedroom ? '床頭燈' : '立燈'}與迴路 × ${ping} 坪`, 0.3 * ping + 1, 0.55 * ping + 2.5);
  add('curtain', '窗簾', bedroom ? '遮光簾＋紗簾＋軌道' : '落地窗紗簾＋軌道', bedroom ? 1.8 : 1.2, bedroom ? 3.6 : 2.8);

  const [ul, uh] = (bedroom ? BEDROOM_FURNITURE : FURNITURE)[look.fabric] ?? (bedroom ? BEDROOM_FURNITURE : FURNITURE).linen;
  const rug = look.rug ? [0.6, 1.8] : [0, 0];
  const fabricName = { leather: '皮革', velvet: '絨布', linen: '布面' }[look.fabric] ?? '布面';
  if (!cond.noFurniture) add('furniture', '家具軟裝', bedroom ? `${fabricName}床頭雙人床架、床墊、床頭櫃、單椅${look.rug ? '、地毯' : ''}` : `${fabricName}沙發、單椅、茶几${look.rug ? '、地毯' : ''}`, ul + rug[0], uh + rug[1]);

  const extra = AGE_EXTRA[cond.age];
  if (extra) add('base', `${cond.age}基礎工程`, `假設這個空間的舊裝潢全拆、水電管線重拉（每坪 ${extra[0]}–${extra[1]} 萬）× ${ping} 坪；管線近年換過可以少很多`, extra[0] * ping, extra[1] * ping);

  const sum = (k) => Math.round(items.reduce((a, i) => a + i[k], 0));
  return { low: sum('low'), high: sum('high'), ping, assumedPing, items };
}
