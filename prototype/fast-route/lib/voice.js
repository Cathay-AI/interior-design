// 設計師說的話：每一句都由現有的分數、配置與估價資料組出來（沒有接語言模型），所以說的一定和畫面一致。
import { STYLES, topStyles } from './taste.js';

/** 每種風格用一句屋主聽得懂的話形容。 */
export const TRAIT = {
  warm: '暖木色、柔和的布面', nordic: '明亮的淺色木頭', retro: '復古的暖色調',
  dark: '深色、沉穩的調子', muji: '簡單留白的淺木色', indus: '水泥灰和鐵件',
};
const names = (keys) => keys.map((k) => STYLES[k].name).join('、');

/** 開場：先問想弄哪裡。 */
export const GREETING = '嗨，我來幫你設計你家。想先弄哪裡？';

/**
 * 滑卡時的回話。
 * @param {{space:string, scores:Record<string,number>, swiped:number, liked:number, last?:[string, boolean]}} s last = 剛滑的那張 [風格, 是否喜歡]
 * @returns {{text:string, ready:boolean}} ready = 已經抓得到方向，可以邀請看成果
 */
export function swipeReply({ space, scores, swiped, liked, last }) {
  if (!last) return { text: `好，${space}。右滑喜歡、左滑跳過，滑幾張我就知道你的方向。`, ready: false };
  const top = topStyles(scores).top;
  if (liked >= 3 || (swiped >= 5 && liked >= 1)) return { text: `我大概知道你的方向了：${names(top)}。要看看我幫你配的樣子嗎？`, ready: true };
  if (last[1]) return { text: `收到，你家${space}會偏${TRAIT[last[0]]}。`, ready: false };
  return { text: liked ? '了解，這種先不要。' : '了解，這種不要，再看幾張。', ready: false };
}

/**
 * 第 2 步：設計師接著問最有用、還沒回答的那一項，並說明為什麼問。
 * @returns {{key:string|null, text:string}} key = 對應的欄位；null 表示夠了
 */
export function nextQuestion(cond) {
  const has = (k) => String(cond[k] ?? '').trim() !== '';
  const house = cond.housing === 'house';
  if (!(has('len') && has('wid'))) return { key: 'len', text: `你家${cond.space}的長和寬大概幾公尺？有了尺寸，3D 和圖就照你家畫，不是範例。` };
  if (!has('floors')) return { key: 'floors', text: house ? '你家總共幾層樓？' : '你家是幾層樓的大樓？這會影響要不要申請裝修許可、窗簾要不要用防焰的。' };
  if (!house && !has('partition')) return { key: 'partition', text: '這次會動隔間，或加廁所、浴室嗎？會的話申請的手續不一樣。' };
  if (!has('sprinkler')) return { key: 'sprinkler', text: '抬頭看一下，天花板有撒水頭嗎？有的話，櫃子和新天花板要讓出空間。' };
  if (!house && Number(cond.floors) >= 11 && !has('unitFloor')) return { key: 'unitFloor', text: '你家在第幾樓？十一樓以上，天花板要用耐燃的板材。' };
  if (!has('height')) return { key: 'height', text: '天花板大概多高？我會照這個高度做櫃子和窗簾。' };
  if (!cond.ageSet) return { key: 'age', text: '房子是新成屋、中古屋還是老屋？老屋通常要多算拆除和水電。' };
  return { key: null, text: '這些夠了，我可以照你家的條件設計了。' };
}

const cm = (m) => Math.round((m * 100) / 5) * 5;

/**
 * 3D 出來時，說明這個配置是怎麼決定的。只講配置資料裡真的有的事。
 * @param {{space:string}} cond @param {{name:string}} look
 * @param {ReturnType<import('./layout.js').roomLayout>} plan @param {string[]} reasons 滑卡時說在意的事
 * @returns {string[]}
 */
export function designNotes(cond, look, { room, layout, cabinet }, reasons = []) {
  const R = room.w / 2, B = -room.d / 2, out = [];
  const cabW = cm(cabinet.x1 - cabinet.x0), care = reasons.includes('收納') ? '你說在意收納，所以' : '';
  if (layout.bed) {
    const bed = layout.bed, foot = cm(R - (bed.x + bed.sx / 2)), front = cm(bed.z - bed.sz / 2 - (B + cabinet.depth));
    out.push(`床頭靠牆，放${bed.sz >= 1.3 ? '雙人床' : '單人床（房間比較短）'}；床尾到對面牆還有 ${foot} 公分可以走。`);
    out.push(`${care}衣櫃做在窗戶旁那面牆，寬 ${cabW} 公分、做到頂；衣櫃前留了 ${front} 公分${front >= 60 ? '，開門拿衣服夠用' : '，比較窄，建議做拉門'}。`);
    const nights = [layout.nightA, layout.nightB].filter(Boolean).length;
    out.push(nights === 2 ? '床頭兩側各一張床頭櫃，插座也配在兩側。' : nights === 1 ? '床邊只放得下一張床頭櫃。' : '房間比較小，床頭櫃沒有放，走道比較重要。');
  } else {
    const { sofa, table } = layout;
    if (table) out.push(`沙發靠牆、面向整個空間，和茶几之間留 ${cm(table.x - table.sx / 2 - (sofa.x + sofa.sx / 2))} 公分好伸腳；茶几到對面牆還有 ${cm(R - (table.x + table.sx / 2))} 公分可以走。`);
    else out.push(`空間比較窄，我只放${sofa.sz < 1.9 ? '雙人' : '三人'}沙發、不放茶几，沙發前留 ${cm(R - (sofa.x + sofa.sx / 2))} 公分走道。`);
    out.push(`${care}高櫃做在窗戶旁那面牆，寬 ${cabW} 公分、做到頂${layout.sideboard ? '；窗下再一座低櫃，不擋光' : ''}。`);
    const left = [['chair', '單椅'], ['sidetable', '邊几'], ['plant', '盆栽']].filter(([k]) => !layout[k]).map(([, n]) => n);
    if (left.length && table) out.push(`${left.join('、')}我沒有放，放了會擠到走道。`);
  }
  out.push(`整體用${look.name}：${TRAIT[Object.keys(STYLES).find((k) => STYLES[k].name === look.name)] ?? look.name}。`);
  return out;
}

/**
 * 改完設計後回一句：改了什麼、錢差多少、法規上多了或少了什麼。
 * @param {{label:string, on:boolean, before:{low:number, high:number}, after:{low:number, high:number}, legalBefore:string[], legalAfter:string[]}} c
 *   legalBefore／legalAfter = 改之前、之後「需辦理」的法規項目名稱
 */
export function editReply({ label, on, before, after, legalBefore, legalAfter }) {
  const diff = Math.round(((after.low + after.high) - (before.low + before.high)) / 2 * 10) / 10;
  const money = diff === 0 ? '預估金額沒有變' : `預估${diff < 0 ? '少' : '多'}約 ${Math.abs(diff)} 萬`;
  const gone = legalBefore.filter((t) => !legalAfter.includes(t)), added = legalAfter.filter((t) => !legalBefore.includes(t));
  const legal = [gone.length ? `不用再處理${gone.join('、')}` : '', added.length ? `要多注意${added.join('、')}` : ''].filter(Boolean).join('，');
  return `好，${on ? label : `取消「${label}」`}。${money}${legal ? `；${legal}` : '，法規上要辦的事不變'}。`;
}

/**
 * 用說的改設計：聽得懂的範圍就是畫面上那幾個修改和六種風格。
 * @param {string} text @param {string[]} editLabels 目前的修改名稱（依序）
 * @returns {{edit:number, on:boolean} | {style:string} | null}
 */
export function parseEdit(text, editLabels) {
  const t = String(text);
  const off = /不要改|改回|恢復|還原|取消/.test(t);
  const rules = [[/(沙發|床頭).*(淺|亮|白)|淺色.*(沙發|床頭)/, '淺色'], [/牆.*(白|暖白|淺)|(白|淺).*牆/, '牆'], [/地毯/, '地毯'], [/地板.*(深|暗)|深色.*地板/, '地板']];
  for (const [re, word] of rules) {
    if (!re.test(t)) continue;
    const i = editLabels.findIndex((l) => l.includes(word));
    if (i < 0) continue;
    if (word === '地毯') return { edit: i, on: /不要|拿掉|移除|去掉|不用|沒有/.test(t) && !/要回|放回|加回|還是要/.test(t) };
    return { edit: i, on: !off };
  }
  const style = Object.keys(STYLES).find((k) => t.includes(STYLES[k].name) || t.includes(STYLES[k].name.slice(-2)));
  return style ? { style } : null;
}
