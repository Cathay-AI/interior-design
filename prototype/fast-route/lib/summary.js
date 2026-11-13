// 方案摘要：把這次的需求、設計、估價和要辦的事整理成一份純文字，讓屋主存下來、和家人討論，或交給自己的設計師。
import { regSummary } from './rules.js';

/**
 * @param {{cond:object, look:{name:string}, edits:string[], size:{w:number,d:number,h:number}, est:{low:number,high:number,ping:number,assumedPing:boolean,items:{name:string,basis:string,low:number,high:number}[]},
 *   findings:{state:string,title:string,brief:string,law?:string[]}[], reasons:string[], score:number, link?:string, date:string}} p
 * @returns {string}
 */
export function summaryText({ cond, look, edits, size, est, findings, reasons, score, link, date }) {
  const legal = findings.filter((f) => f.law);
  const pick = (state) => legal.filter((f) => f.state === state).map((f) => `- ${f.title}：${f.brief}`);
  const todo = [...pick('action'), ...pick('review')], ask = pick('missing');
  const yn = { yes: '有', no: '沒有' };
  const lines = [
    `回家之前｜${cond.space}設計方案摘要`, `產生日期：${date}`, '',
    '【我的需求】',
    `- 空間：${cond.space}`,
    `- 風格：${look.name}${edits.length ? `（調整：${edits.join('、')}）` : ''}`,
    reasons.length ? `- 在意的事：${reasons.join('、')}` : null,
    '', '【我家的條件】',
    `- 尺寸：${size.w} × ${size.d} 公尺、高 ${size.h} 公尺（${est.ping} 坪${est.assumedPing ? '，預設值，還沒填' : ''}）`,
    `- 屋況：${cond.age}${cond.ageSet ? '' : '（預設值，還沒選）'}`,
    cond.housing === 'house' ? '- 房屋：透天獨棟' : cond.floors ? `- 建物：${cond.floors} 層${cond.unitFloor ? `，我家在 ${cond.unitFloor} 樓` : ''}` : null,
    cond.partition ? `- 隔間：${cond.partition === 'yes' ? '會動隔間或加廁所浴室' : '不動'}` : null,
    cond.sprinkler ? `- 天花板撒水頭：${yn[cond.sprinkler]}` : null,
    `- 基本資料完整度：${Math.round(score * 100)}%`,
    '', `【預估花費】${est.low}–${est.high} 萬（${est.assumedPing || !cond.ageSet ? '範例估算' : '初步估算'}，非正式報價）`,
    ...est.items.map((i) => `- ${i.name}：${i.low}–${i.high} 萬（${i.basis}）`),
    '', `【法規與手續】${regSummary(findings).text}`,
    ...todo, ...(ask.length ? ['還沒辦法判斷的：', ...ask] : []),
    '', '【還要現場確認】',
    '- 門窗與柱位的實際位置、既有水電與消防設備、牆面與樓板狀況',
    '- 這份是 AI 初稿：尺寸由我自己填寫，金額是參考行情量級，法規是提醒、不是合格判定',
    link ? '' : null, link ? `打開同一個設計：${link}` : null,
  ];
  return lines.filter((l) => l !== null).join('\n') + '\n';
}
