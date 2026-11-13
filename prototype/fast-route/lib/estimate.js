// 預估花費：依「這個設計用了什麼」逐項估算，回傳區間與每一項的依據，不問屋主預算。
// 單價為台灣參考行情量級（萬元），尚未以實際單價表校正；只用來看量級，不是報價。

/** 沒說坪數時的預設值（依空間），畫面上會標示為預設並可修改。 */
export const DEFAULT_PING = { 客廳: 8, 臥室: 5, 書房: 4, 餐廳: 4, 廚房: 3, 衛浴: 1.5 };

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

  const space = cond.space, wet = space === '廚房' || space === '衛浴', wood = look.cabinetWood, finish = wood ? '木皮' : '烤漆';
  const fabricName = { leather: '皮革', velvet: '絨布', linen: '布面' }[look.fabric] ?? '布面';
  // 地坪：廚房與衛浴用磁磚
  const [floorName, fl, fh] = wet ? ['防滑磁磚', 0.7, 1.2] : FLOOR[look.floorType] ?? FLOOR.wood;
  add('floor', '地坪', `${floorName} × ${ping} 坪`, fl * ping, fh * ping);
  const special = look.wallType === 'concrete' || isDark(look.wall);
  if (space === '衛浴') add('wall', '牆面與天花', `壁磚到頂＋防潮天花 × ${ping} 坪`, 1.6 * ping, 2.6 * ping);
  else add('wall', '牆面與天花', `${space === '廚房' ? '防潮漆＋爐台壁面烤漆玻璃' : special ? '特殊塗料／深色需多道' : '乳膠漆'} × ${ping} 坪`, (space === '廚房' ? 0.4 : special ? 0.45 : 0.25) * ping + (space === '廚房' ? 1 : 0), (space === '廚房' ? 0.65 : special ? 0.8 : 0.42) * ping + (space === '廚房' ? 2 : 0));

  // 櫃體：高櫃寬 175 cm ≈ 5.8 尺；低櫃 160 cm ≈ 5.3 尺。廚具以公分計（一字型約 240 cm）
  const tall = [5.8 * (wood ? 0.75 : 0.65), 5.8 * (wood ? 1.3 : 1.1)], low = [5.3 * 0.35, 5.3 * 0.6];
  if (space === '臥室') add('cabinet', '衣櫃與斗櫃', `${finish}系統衣櫃 5.8 尺（含吊桿、抽屜）＋窗下斗櫃 5.3 尺`, 5.8 * (wood ? 0.85 : 0.75) + 5.3 * 0.4, 5.8 * (wood ? 1.5 : 1.3) + 5.3 * 0.7);
  else if (space === '廚房') add('cabinet', '廚具', `一字型廚具約 240 公分：${finish}門片、人造石檯面、吊櫃（不含家電）`, 9, 16);
  else if (space === '衛浴') add('cabinet', '浴櫃與鏡櫃', '防水發泡板浴櫃 80 公分＋鏡櫃', 1.8, 3.6);
  else add('cabinet', space === '書房' ? '書櫃與低櫃' : space === '餐廳' ? '餐櫃與備餐櫃' : '收納櫃', `${finish}系統高櫃 5.8 尺＋窗下低櫃 5.3 尺`, tall[0] + low[0], tall[1] + low[1]);

  if (space === '衛浴') {
    add('fixture', '衛浴設備', '馬桶、面盆龍頭、淋浴龍頭、淋浴拉門', 5, 10);
    add('water', '防水與給排水', `地面與牆面防水（淋浴區到頂）、給排水配管 × ${ping} 坪`, 2.2 * ping + 1.5, 3.6 * ping + 3);
    add('light', '燈具與電工', '防潮嵌燈、暖風乾燥機與迴路', 1.6, 3.2);
  } else {
    if (space === '廚房') add('water', '給排水與瓦斯', '水槽給排水、瓦斯管與排油煙風管', 1.5, 3.5);
    add('light', '燈具與電工', `嵌燈、${space === '廚房' ? '吊櫃下燈條、家電專用' : space === '臥室' ? '吊燈、床頭燈與' : space === '餐廳' ? '餐桌吊燈與' : space === '書房' ? '吊燈、書桌燈與' : '吊燈、立燈與'}迴路 × ${ping} 坪`, 0.3 * ping + 1 + (space === '廚房' ? 1 : 0), 0.55 * ping + 2.5 + (space === '廚房' ? 2 : 0));
    if (space !== '廚房') add('curtain', '窗簾', space === '臥室' ? '遮光簾＋紗簾＋軌道' : '落地窗紗簾＋軌道', space === '臥室' ? 1.8 : 1.2, space === '臥室' ? 3.6 : 2.8);
  }

  // 家具軟裝：廚房與衛浴沒有這一項
  const rug = look.rug && !wet ? [0.6, 1.8] : [0, 0], rugText = look.rug && !wet ? '、地毯' : '';
  const sets = { 客廳: [FURNITURE, `${fabricName}沙發、單椅、茶几`], 臥室: [BEDROOM_FURNITURE, `${fabricName}床頭雙人床架、床墊、床頭櫃、單椅`],
    餐廳: [{ linen: [4, 8], velvet: [4.5, 9], leather: [5.5, 11] }, `實木餐桌、${fabricName}餐椅四張`], 書房: [{ linen: [3, 6.5], velvet: [3.5, 7], leather: [4.5, 9] }, `書桌、${fabricName}工作椅`] };
  if (!cond.noFurniture && sets[space]) { const [tbl, text] = sets[space], [ul, uh] = tbl[look.fabric] ?? tbl.linen; add('furniture', '家具軟裝', text + rugText, ul + rug[0], uh + rug[1]); }

  const extra = AGE_EXTRA[cond.age];
  if (extra) add('base', `${cond.age}基礎工程`, `假設這個空間的舊裝潢全拆、水電管線重拉（每坪 ${extra[0]}–${extra[1]} 萬）× ${ping} 坪；管線近年換過可以少很多`, extra[0] * ping, extra[1] * ping);

  const sum = (k) => Math.round(items.reduce((a, i) => a + i[k], 0));
  return { low: sum('low'), high: sum('high'), ping, assumedPing, items };
}
