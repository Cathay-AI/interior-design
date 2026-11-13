// Rule findings: each check ends in exactly one state. 未知不等於通過；收到圖面也不等於已檢查。
//
// 法規類的項目（有 source 欄位）是依台灣現行法規整理的「提醒」，條文摘要為原型階段的初稿：
// 上線前必須由消防與室內裝修專業逐條核對條號、門檻與例外，並定期隨修法更新。這裡不做合格與否的判定。

export const STATES = {
  ok: '已檢查',
  conflict: '衝突',
  missing: '待補資料',
  review: '待判讀',
  action: '需辦理',
  na: '不適用',
};

const isDark = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
};

/**
 * @param {{space:string, ping:string|number, age:string, floors?:string|number, partition?:'yes'|'no'|''}} cond
 *   floors = 建物地上總樓層；partition = 這次會不會動隔間牆（或增設廁所浴室）
 * @param {{wall:string}} look
 * @param {{plan?:number, mep?:number}} docs 屋主附了幾份平面圖／機電圖（原型不判讀內容，只改變「缺資料」成「待判讀」）
 * @returns {{state:keyof STATES, title:string, detail:string, source?:string}[]} source = 依據的法規（僅法規類項目）
 */
export function ruleFindings(cond, look, docs = {}) {
  const ping = Number.parseFloat(cond.ping);
  const hasPing = Number.isFinite(ping) && ping > 0;
  const findings = [];

  findings.push(hasPing
    ? { state: 'ok', title: '動線', detail: cond.space === '臥室' ? `臥室 ${ping} 坪：床的兩側與衣櫃前保留走道（示意尺寸）` : `${cond.space} ${ping} 坪：沙發與茶几間保留走道（示意尺寸）` }
    : { state: 'missing', title: '動線', detail: '需要坪數或尺寸才能檢查' });

  findings.push(docs.mep
    ? { state: 'review', title: '插座與電源', detail: '已收到機電圖，需由專業判讀既有插座與迴路後確認' }
    : { state: 'missing', title: '插座與電源', detail: '需要既有插座點位（可上傳機電圖），才能確認' + (cond.space === '臥室' ? '床頭兩側與書桌的插座位置' : '電視牆與立燈位置') });

  findings.push(isDark(look.wall) && hasPing && ping < 7
    ? { state: 'conflict', title: '空間感（設計提醒）', detail: '深色牆面在 7 坪以下可能顯得壓迫，建議只做一面主牆' }
    : { state: 'ok', title: '採光與色彩', detail: '牆面明度足夠，窗邊保留自然光' });

  if (cond.age === '老屋') {
    findings.push({ state: docs.mep ? 'review' : 'missing', title: '既有管線（老屋）', detail: docs.mep ? '已收到機電圖；老屋仍需現勘既有電線、給排水與瓦斯管線' : '老屋需現勘既有電線、給排水與瓦斯管線（可上傳機電圖）' });
  }

  /* ---- 法規與施工條件：依建物樓層與是否動隔間 ---- */
  const floors = Number.parseInt(cond.floors, 10), knowFloors = Number.isFinite(floors) && floors > 0;
  const LAW = {
    permit: '建築物室內裝修管理辦法',
    flame: '消防法第 11 條',
    equip: '各類場所消防安全設備設置標準',
    alarm: '消防法第 6 條',
    finish: '建築技術規則建築設計施工編第 88 條',
  };

  // 室內裝修審查許可
  if (!knowFloors) findings.push({ state: 'missing', title: '室內裝修許可', source: LAW.permit, detail: '需要建物總樓層才能判斷：六層以上集合住宅裝修要申請審查許可；五層以下在增設廁所浴室或動到隔間時才需要。' });
  else if (floors >= 6) findings.push({ state: 'action', title: '室內裝修許可', source: LAW.permit, detail: `${floors} 層集合住宅：固著天花板、牆面裝修、高度超過 1.2 公尺的固定櫃或隔屏、分間牆變更都屬室內裝修，施工前應委託合格業者申請審查許可，完工後申請竣工查驗。` });
  else if (cond.partition === 'yes') findings.push({ state: 'action', title: '室內裝修許可', source: LAW.permit, detail: `${floors} 層集合住宅：增設廁所浴室，或增設兩間以上居室而變更分間牆時，應申請室內裝修審查許可。${docs.plan ? '已收到平面圖，待判讀變更範圍。' : '請附平面圖以判讀變更範圍。'}` });
  else if (cond.partition === 'no') findings.push({ state: 'na', title: '室內裝修許可', source: LAW.permit, detail: `${floors} 層集合住宅且不動隔間、不增設廁所浴室：一般不需申請；仍以所在地主管機關認定為準。` });
  else findings.push({ state: 'missing', title: '室內裝修許可', source: LAW.permit, detail: `${floors} 層集合住宅：是否需要申請，取決於會不會增設廁所浴室或動到隔間牆。` });

  // 裝修材料耐燃等級：本方案有固著天花板與做到頂的高櫃
  findings.push({ state: 'review', title: '裝修材料耐燃等級', source: LAW.finish, detail: `天花板與牆面的裝修材料需符合耐燃等級。本方案的${look.cabinetWood ? '木皮高櫃與' : ''}天花板請選用具耐燃等級證明的板材，實際要求的等級依樓層與用途由專業判定。` });

  // 防焰物品與撒水頭：十一層以上建築
  if (!knowFloors) {
    findings.push({ state: 'missing', title: '防焰窗簾與地毯', source: LAW.flame, detail: '需要建物總樓層：地面十一層以上的建築，窗簾、地毯、布幕需使用附防焰標示的產品。' });
    findings.push({ state: 'missing', title: '撒水頭與火警設備', source: LAW.equip, detail: '需要建物總樓層與現場確認，才能判斷天花板和高櫃會不會遮蔽撒水頭或偵測器。' });
  } else if (floors >= 11) {
    findings.push({ state: 'action', title: '防焰窗簾與地毯', source: LAW.flame, detail: `${floors} 層建築：本方案的窗簾${look.rug ? '與地毯' : ''}需選用附防焰標示的產品。` });
    findings.push({ state: 'action', title: '撒水頭與火警設備', source: LAW.equip, detail: '十一層以上樓層通常設有自動撒水設備：撒水頭迴水板下方 45 公分、水平 30 公分內不得有障礙物。本方案的高櫃做到頂、天花板會重做，需現場確認撒水頭與偵測器位置；要移位須由消防設備師（士）設計並依規定申請。' });
  } else {
    findings.push({ state: 'na', title: '防焰窗簾與地毯', source: LAW.flame, detail: `${floors} 層建築未達十一層，住宅的窗簾與地毯不強制使用防焰產品；仍建議選用。` });
    findings.push({ state: 'review', title: '住宅用火災警報器', source: LAW.alarm, detail: '未設火警自動警報設備的住宅應裝設住宅用火災警報器。天花板重做時請保留或補裝，不要被天花板或櫃體遮住。' });
  }

  // 避難與防火區劃：任何住宅都適用的底線
  findings.push({ state: 'review', title: '避難與防火區劃', source: '建築技術規則、公寓大廈管理條例', detail: '不可封閉或縮減陽台、逃生通道與緊急進口，不可拆除或更換防火門，管道間與樓板貫穿處需維持防火填塞。' });
  return findings;
}

export function countByState(findings) {
  return findings.reduce((acc, f) => ({ ...acc, [f.state]: (acc[f.state] ?? 0) + 1 }), {});
}
