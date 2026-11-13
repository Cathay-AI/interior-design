// 整戶：一個家是一串房間。這裡管房間清單、哪些空間做得出設計、示意平面圖，以及整戶加總。純函式。
import { pingFromDims } from './context.js';

/** 還不會自動讀平面圖時給的起點：三房兩廳。屋主改成自己家的房間與尺寸。 */
export const TEMPLATE = [
  ['客廳', '5.6', '4.7'], ['餐廳', '3.4', '3.0'], ['廚房', '3.4', '2.4'], ['主臥', '4.3', '3.9'],
  ['次臥 1', '3.2', '3.0'], ['次臥 2', '3.6', '3.0'], ['主衛', '2.4', '2.0'], ['客衛', '2.2', '2.0'],
];
export const templateRooms = () => TEMPLATE.map(([name, len, wid], i) => ({ id: 'r' + (i + 1), name, len, wid, on: true, edits: [] }));
export const singleRoom = (space) => [{ id: 'r1', name: space, len: '', wid: '', on: true, edits: [] }];

/** 這個房間用哪一種配置。每一種空間都做得出 3D、圖面和估價；認不出名字的（儲藏室、多功能室…）用書房的配置。 */
export const KINDS = ['客廳', '臥室', '餐廳', '廚房', '衛浴', '書房'];
export const kindOf = (name) => (/客廳|起居/.test(name) ? '客廳' : /餐/.test(name) ? '餐廳' : /廚/.test(name) ? '廚房' : /衛|浴|廁/.test(name) ? '衛浴'
  : /臥|房間|小孩房|孝親房|客房/.test(name) && !/書房/.test(name) ? '臥室' : '書房');
export const roomPing = (r) => pingFromDims(r.len, r.wid);
export const homeTitle = (rooms) => {
  const on = rooms.filter((r) => r.on), beds = on.filter((r) => kindOf(r.name) === '臥室').length, halls = on.filter((r) => /客廳|餐廳|起居/.test(r.name)).length;
  const n = (v) => '零一兩三四五六七八九十'[v] ?? String(v), total = Math.round(on.reduce((a, r) => a + (roomPing(r) ?? 0), 0));
  return `${beds ? `${n(beds)}房` : ''}${halls ? `${n(halls)}廳` : ''}${beds || halls ? '・' : ''}${on.length} 個空間${total ? `・室內約 ${total} 坪` : ''}`;
};

/**
 * 示意平面圖：把房間依面積排成兩排的方塊。只表示「有哪些房間、大概多大」，不是實際格局。
 * @param {{id:string,name:string,len:string,wid:string,on:boolean}[]} rooms @param {string|null} current 目前在看的房間
 * @returns {string} SVG；每個房間是一個帶 data-room 的 <g>，可以點
 */
export function planSVG(rooms, current = null) {
  const W = 600, H = 420, pad = 10, list = rooms.filter((r) => r.on).map((r) => ({ r, a: Math.max(1, (Number(r.len) || 3) * (Number(r.wid) || 3)) }));
  if (!list.length) return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="還沒有房間"></svg>`;
  const total = list.reduce((a, x) => a + x.a, 0);
  let acc = 0, cut = list.length;
  for (let i = 0; i < list.length; i++) { acc += list[i].a; if (acc >= total / 2) { cut = i + 1; break; } }
  const rows = list.length < 3 ? [list] : [list.slice(0, cut), list.slice(cut)].filter((x) => x.length);
  let y = pad; const out = [];
  for (const row of rows) {
    const ra = row.reduce((a, x) => a + x.a, 0), hgt = (H - pad * 2) * (ra / total); let x = pad;
    for (const { r, a } of row) {
      const w = (W - pad * 2) * (a / ra), on = r.id === current, size = Math.max(11, Math.min(18, w / (r.name.length + 1)));
      out.push(`<g data-room="${r.id}" tabindex="0" role="button" aria-label="${r.name}" style="cursor:pointer"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${hgt.toFixed(1)}" fill="${on ? '#f1dfcb' : '#fffdf9'}" stroke="#29251f" stroke-width="${on ? 4 : 2.5}"/>`
        + `<text x="${(x + w / 2).toFixed(1)}" y="${(y + hgt / 2 + size / 3).toFixed(1)}" text-anchor="middle" font-size="${size.toFixed(1)}" font-weight="${on ? 700 : 500}" fill="#29251f">${r.name}</text></g>`);
      x += w;
    }
    y += hgt;
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="整戶示意平面圖（不是實際格局）" style="font-family:inherit">${out.join('')}</svg>`;
}

/**
 * 整戶估價：每個勾選的房間各算一次再加總。
 * @param {object[]} rooms @param {(room:object)=>({low:number,high:number,items:object[]}|null)} estimateRoom
 * @returns {{rows:{id:string,name:string,ping:number|null,est:object|null}[], low:number, high:number, open:number, items:{name:string,low:number,high:number}[]}}
 */
export function homeEstimate(rooms, estimateRoom) {
  const rows = rooms.filter((r) => r.on).map((r) => ({ id: r.id, name: r.name, ping: roomPing(r), est: estimateRoom(r) }));
  const done = rows.filter((x) => x.est), items = new Map();
  for (const x of done) for (const i of x.est.items) { const cur = items.get(i.name) ?? { name: i.name, low: 0, high: 0 }; cur.low += i.low; cur.high += i.high; items.set(i.name, cur); }
  const r1 = (v) => Math.round(v * 10) / 10;
  return { rows, low: Math.round(done.reduce((a, x) => a + x.est.low, 0)), high: Math.round(done.reduce((a, x) => a + x.est.high, 0)), open: rows.length - done.length,
    items: [...items.values()].map((i) => ({ name: i.name, low: r1(i.low), high: r1(i.high) })) };
}
