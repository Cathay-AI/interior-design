// Rule findings: each check ends in exactly one state. 未知不等於通過；收到圖面也不等於已檢查。
//
// 法規類的項目（有 source 欄位）是依台灣現行法規整理的「提醒」。引用的條文已在 CHECKED 那天對照全國法規資料庫核對過
// 條號與門檻（見 LAWS）；「六層以上集合住宅屬供公眾使用建築物」「五層以下增設廁所浴室或兩間以上居室」出自內政部解釋令，
// 解釋令原文沒有核對。這裡不做合格與否的判定：適用與例外仍要由消防與室內裝修專業確認，並隨修法更新。

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
 * @param {{space:string, ping:string|number, age:string, floors?:string|number, partition?:'yes'|'no'|'', unitFloor?:string|number, sprinkler?:'yes'|'no'|'', housing?:'apt'|'house'|''}} cond
 *   floors = 建物地上總樓層；partition = 這次會不會動隔間牆（或增設廁所浴室）；unitFloor = 你家在第幾樓；
 *   sprinkler = 天花板有沒有撒水頭；housing = 集合住宅（公寓、大樓）或透天獨棟
 * @param {{wall:string}} look
 * @param {{plan?:number, mep?:number}} docs 屋主附了幾份平面圖／機電圖（原型不判讀內容，只改變「缺資料」成「待判讀」）
 * @returns {{state:keyof STATES, title:string, detail:string, source?:string, law?:string[], certainty?:keyof CERTAINTY, ask?:string, permit?:boolean, brief:string}[]}
 *   brief = 一行講完要做什麼
 *   法規類項目才有 source／law（LAWS 的代碼）／certainty；ask = 回答哪一題就能判斷；permit = 這一項就是「要申請許可」
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
    : { state: 'missing', title: '插座與電源', detail: '需要既有插座點位（可上傳機電圖），才能確認' + (cond.space === '臥室' ? '床頭兩側的插座位置' : '電視牆與立燈位置') });

  findings.push(isDark(look.wall) && hasPing && ping < 7
    ? { state: 'conflict', title: '空間感（設計提醒）', detail: '深色牆面在 7 坪以下可能顯得壓迫，建議只做一面主牆' }
    : { state: 'ok', title: '採光與色彩', detail: '牆面明度足夠，窗邊保留自然光' });

  if (cond.age === '老屋') {
    findings.push({ state: docs.mep ? 'review' : 'missing', title: '既有管線（老屋）', detail: docs.mep ? '已收到機電圖；老屋仍需現勘既有電線、給排水與瓦斯管線' : '老屋需現勘既有電線、給排水與瓦斯管線（可上傳機電圖）' });
  }

  /* ---- 法規與施工條件：依建物、所在樓層、有沒有撒水頭，以及這個設計實際用了什麼 ---- */
  const int = (v) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : null; };
  const house = cond.housing === 'house';                       // 透天獨棟；沒選時當集合住宅
  const floors = int(cond.floors), unit = int(cond.unitFloor);
  // 所在樓層是否達十一層：直接知道，或由總樓層推得（總樓層不到 11，所在樓層一定不到）
  const high = unit ? unit >= 11 : floors && floors < 11 ? false : house && !floors ? false : null;
  const tall = floors ? floors >= 11 : house ? false : null;    // 地面樓層達十一層以上的建築物
  const room = cond.space === '臥室' ? '臥室' : '客廳';
  const cabinetName = cond.space === '臥室' ? '衣櫃' : '高櫃';
  const legal = (state, title, detail, law, certainty, extra = {}) => findings.push({ state, title, detail, law, certainty, source: law.map((k) => `${LAWS[k].name}${LAWS[k].art}`).join('、'), ...extra });

  // 1 室內裝修審查許可
  const permitLaw = ['act77', 'deco3', 'deco33'];
  const ceilingWork = '這個設計會重做天花板（嵌燈、窗簾盒），屬於「固著於構造體的天花板裝修」';
  if (house) legal('na', '室內裝修許可', '透天獨棟的自用住宅一般不屬於供公眾使用建築物，裝修通常不需要申請室內裝修許可；但不可以破壞主要構造。以所在地主管建築機關認定為準。', ['act77'], 'order');
  else if (!floors) legal('missing', '室內裝修許可', '需要建物總樓層才能判斷：六層以上的集合住宅裝修要先申請審查許可；五層以下在增設廁所浴室或動到隔間時才需要。', permitLaw, 'order', { ask: 'floors' });
  else if (floors >= 6) legal('action', '室內裝修許可', `${floors} 層集合住宅屬於供公眾使用建築物，室內裝修要先申請審查許可。${ceilingWork}。住宅可以走簡易程序：由建築師或室內裝修業的專業設計技術人員簽證後申報施工，完工再申請室內裝修合格證明。`, permitLaw, 'order', { permit: true });
  else if (cond.partition === 'yes') legal('action', '室內裝修許可', `${floors} 層集合住宅：增設廁所浴室，或增設兩間以上居室而變更分間牆時，要申請室內裝修審查許可。${docs.plan ? '已收到平面圖，變更範圍由專業團隊判讀。' : '請附平面圖，讓專業團隊判讀變更範圍。'}`, permitLaw, 'order', { permit: true });
  else if (cond.partition === 'no') legal('na', '室內裝修許可', `${floors} 層集合住宅，不動隔間、不增設廁所浴室：一般不需要申請。以所在地主管建築機關認定為準。`, permitLaw, 'order');
  else legal('missing', '室內裝修許可', `${floors} 層集合住宅：要不要申請，取決於會不會增設廁所浴室或動到隔間牆。`, permitLaw, 'order', { ask: 'partition' });

  // 2 裝修材料耐燃等級：住宅（H-2 組）的居室只有「十一層以上部分」列有等級
  if (high === true) legal('action', '裝修材料耐燃等級', `你家在十一層以上：天花板與牆面的裝修材料，居室要用耐燃二級以上（每 200 平方公尺內有防火區劃時；區劃更大則要耐燃一級）。這個設計重做天花板${look.cabinetWood ? `、${cabinetName}用木皮板` : ''}，天花板請選有耐燃等級證明的板材；離地 1.2 公尺以下的牆面不受限制。`, ['code88'], 'judgement');
  else if (high === false) legal('na', '裝修材料耐燃等級', `你家未達十一層：住宅的居室在附表裡沒有列耐燃等級要求。這個設計是${room}，不含使用瓦斯的廚房（廚房另有規定）。仍建議天花板選用耐燃板材。`, ['code88'], 'judgement');
  else legal('missing', '裝修材料耐燃等級', '需要知道你家在第幾樓：十一層以上的部分，天花板與牆面要用耐燃二級以上的材料；未達十一層的住宅居室沒有列等級要求。', ['code88'], 'judgement', { ask: 'unitFloor' });

  // 3 防焰物品：只列這個設計真的有的東西。拿掉地毯，地毯那一項就不會出現。
  const flame = (thing) => {
    if (tall === true) legal('action', `防焰${thing}`, `${floors} 層建築（地面樓層達十一層以上）：這個設計的${thing}要選附有防焰標示的產品。`, ['fire11'], 'verified');
    else if (tall === false) legal('na', `防焰${thing}`, `${floors ? `${floors} 層建築` : '透天住宅'}未達十一層，${thing}不強制使用防焰產品；仍建議選用。`, ['fire11'], 'verified');
    else legal('missing', `防焰${thing}`, `需要建物總樓層：地面樓層達十一層以上的建築物，${thing}要使用附有防焰標示的產品。`, ['fire11'], 'verified', { ask: 'floors' });
  };
  flame('窗簾');
  if (look.rug) flame('地毯');

  // 4 撒水頭淨空：問一句「天花板有沒有撒水頭」就有結論
  const expect = high === true || (floors && floors >= 16);     // 十一層以上的樓層、或十六層以上的高層建築物，應設自動撒水設備
  const clear = `撒水頭迴水板下方 45 公分內、水平方向 30 公分內要保持淨空。這個設計的${cabinetName}做到頂、天花板會重做，櫃體和新天花板都不能擋到撒水頭；要移位必須由消防設備師（士）設計。立面圖上已標出淨空範圍。`;
  if (cond.sprinkler === 'yes') legal('action', '撒水頭淨空', `你家天花板有撒水頭：${clear}`, ['std47', 'std17'], 'verified');
  else if (cond.sprinkler === 'no' && expect) legal('review', '撒水頭淨空', `你回答沒有撒水頭，但${high === true ? '十一層以上的樓層' : '十六層以上的高層建築物'}依規定應設自動撒水設備，可能被現有天花板遮住。請專業團隊現場確認。`, ['std17', 'std47'], 'judgement');
  else if (cond.sprinkler === 'no') legal('na', '撒水頭淨空', '你回答天花板沒有撒水頭，這一項不適用。', ['std47'], 'verified');
  else legal('missing', '撒水頭淨空', expect ? `依規定你家這一層應設自動撒水設備，很可能有撒水頭。抬頭看一下天花板：有的話，${cabinetName}和新天花板要讓出淨空。` : `抬頭看一下天花板有沒有撒水頭（${high === false ? '未達十一層的住宅樓層通常沒有' : '十一層以上的樓層通常有'}）。有的話，${cabinetName}和新天花板要讓出淨空。`, ['std17', 'std47'], 'verified', { ask: 'sprinkler' });

  // 5 火警偵測器／住宅用火災警報器：不管哪一種，天花板重做都要留著
  legal('action', tall === true ? '火警偵測器' : '住宅用火災警報器', tall === true
    ? `${floors} 層建築應設火警自動警報設備。天花板重做時，偵測器要裝回新天花板上，不要被天花板或${cabinetName}遮住；移位由消防專業處理。`
    : `沒有火警自動警報設備的住宅，要裝住宅用火災警報器。天花板重做時請保留或補裝在${room}，不要被天花板或${cabinetName}遮住。`,
  tall === true ? ['std19'] : ['fire6', 'std19'], 'verified');

  // 6 避難與防火區劃：這個設計沒有動到的，直接說沒有動到
  if (cond.partition === 'yes') legal('review', '避難與防火區劃', '你會動隔間：不可以妨害或破壞防火避難設施、消防設備、防火區劃與主要構造，也不可以封閉逃生通道或更換防火門。變更範圍由專業團隊確認。', ['act77', 'condo16'], 'verified');
  else legal('na', '避難與防火區劃', `這個設計只做${room}的天花板、牆面、櫃體與家具，沒有動到防火門、逃生通道、管道間與主要構造。施工時也不可以變更這些部分。`, ['act77', 'condo16'], 'verified');
  for (const f of findings) f.brief = briefOf(f, cabinetName);
  return findings;
}

/** 一行講完「要做什麼」；細節與依據點開才看。 */
function briefOf(f, cabinetName) {
  if (!f.law) return f.detail;
  const t = f.title, s = f.state;
  if (s === 'missing') return { floors: '告訴我建物總共幾層', unitFloor: '告訴我你家在第幾樓', sprinkler: '抬頭看一下天花板有沒有撒水頭', partition: '告訴我會不會動隔間' }[f.ask] ?? '還差一個答案';
  if (t === '室內裝修許可') return s === 'action' ? '施工前要申請，住宅可走簡易程序' : '一般不需申請';
  if (t === '裝修材料耐燃等級') return s === 'action' ? '天花板選有耐燃證明的板材' : '未達十一層，沒有等級要求';
  if (t.startsWith('防焰')) return s === 'action' ? `${t.slice(2)}選附防焰標示的產品` : '未達十一層，不強制';
  if (t === '撒水頭淨空') return s === 'action' ? `${cabinetName}和新天花板要讓出撒水頭淨空` : s === 'review' ? '請專業現場確認有沒有撒水頭' : '沒有撒水頭，不適用';
  if (t === '火警偵測器') return '天花板重做後，偵測器要裝回去';
  if (t === '住宅用火災警報器') return '天花板重做時，警報器要保留或補裝';
  if (t === '避難與防火區劃') return s === 'review' ? '隔間變更範圍由專業確認' : '這個設計沒有動到';
  return f.detail;
}

/** 這次對照全國法規資料庫（law.moj.gov.tw）核對條文的日期。修法後要重新核對並更新。 */
export const CHECKED = '2026-11-13';
/** 引用的條文：名稱、條號、最近修正日期、資料庫代碼。 */
export const LAWS = {
  act77: { name: '建築法', art: '第 77-2 條', amended: '2022-05-11', pcode: 'D0070109', flno: '77-2' },
  deco3: { name: '建築物室內裝修管理辦法', art: '第 3 條', amended: '2023-12-11', pcode: 'D0070148', flno: '3' },
  deco33: { name: '建築物室內裝修管理辦法', art: '第 33 條', amended: '2023-12-11', pcode: 'D0070148', flno: '33' },
  code88: { name: '建築技術規則建築設計施工編', art: '第 88 條', amended: '2026-02-23', pcode: 'D0070115', flno: '88' },
  fire6: { name: '消防法', art: '第 6 條', amended: '2024-11-29', pcode: 'D0120001', flno: '6' },
  fire11: { name: '消防法', art: '第 11 條', amended: '2024-11-29', pcode: 'D0120001', flno: '11' },
  std17: { name: '各類場所消防安全設備設置標準', art: '第 17 條', amended: '2024-04-24', pcode: 'D0120029', flno: '17' },
  std19: { name: '各類場所消防安全設備設置標準', art: '第 19 條', amended: '2024-04-24', pcode: 'D0120029', flno: '19' },
  std47: { name: '各類場所消防安全設備設置標準', art: '第 47 條', amended: '2024-04-24', pcode: 'D0120029', flno: '47' },
  condo16: { name: '公寓大廈管理條例', art: '第 16 條', amended: '2022-05-11', pcode: 'D0070118', flno: '16' },
};
export const lawUrl = (key) => `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=${LAWS[key].pcode}&flno=${LAWS[key].flno}`;
/** 確定程度：條文本身核對過不代表適用結論確定。 */
export const CERTAINTY = {
  verified: '門檻明確',
  judgement: '是否適用需專業判定',
  order: '適用對象依內政部解釋令，解釋令原文沒有對照',
};

/**
 * 3D 頁上那一行：這個設計要不要申請許可、有幾項要注意、還差幾個答案。
 * @param {ReturnType<typeof ruleFindings>} findings
 * @returns {{permit:'need'|'no'|'unknown', attention:number, asks:string[], text:string}}
 */
export function regSummary(findings) {
  const legalOnes = findings.filter((f) => f.law);
  const p = legalOnes.find((f) => f.title === '室內裝修許可');
  const permit = p?.state === 'action' ? 'need' : p?.state === 'na' ? 'no' : 'unknown';
  const attention = legalOnes.filter((f) => f !== p && (f.state === 'action' || f.state === 'review')).length;
  const asks = [...new Set(legalOnes.filter((f) => f.ask).map((f) => f.ask))];
  const head = { need: '這個設計需申請室內裝修許可', no: '這個設計一般不需申請室內裝修許可', unknown: '要不要申請室內裝修許可，還差一個答案' }[permit];
  const text = [head, attention ? `另外 ${attention} 項要注意` : null, asks.length ? `再回答 ${asks.length} 題就能判斷完` : null].filter(Boolean).join('・');
  return { permit, attention, asks, text };
}

export function countByState(findings) {
  return findings.reduce((acc, f) => ({ ...acc, [f.state]: (acc[f.state] ?? 0) + 1 }), {});
}
