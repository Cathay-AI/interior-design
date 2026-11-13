// 施工圖草稿：依這個家的實際尺寸（lib/layout.js 的 roomSize / roomLayout）產生的 SVG 圖紙。純函式、不碰 DOM。
// 圖面跟著尺寸重新配置（牆、窗、櫃、家具、燈位、插座），不是同一張範本換數字。
// 這是交給設計師與施工團隊覆核的草稿；每張圖上都標示「草稿・待專業覆核」。
import { roomLayout, roomSize } from './layout.js';

const W = 840, H = 594;                     // sheet in px; printed on A3 landscape, 1 px = 0.5 mm
const SCALES = [20, 25, 30, 40, 50, 60, 75, 100, 150, 200, 250, 300, 400, 500];
const PLAN = { x: 70, y: 84, w: 500, h: 370 };   // where the plan may sit on the sheet
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// The room being drawn. drawingSet sets these before any sheet is built (building is synchronous).
let ROOM, WINDOW, CABINET, LAYOUT, S, N, OX, OZ, RUG = true;
/** Pick the largest standard drawing scale (1 : N) at which the plan fits, and centre the plan. */
function useRoom(size) {
  ({ room: ROOM, window: WINDOW, cabinet: CABINET, layout: LAYOUT } = roomLayout(size));
  N = SCALES.find((n) => (ROOM.w * 2000) / n <= PLAN.w && (ROOM.d * 2000) / n <= PLAN.h) ?? SCALES.at(-1);
  S = 2000 / N;                             // px per metre at 1 : N
  OX = PLAN.x + PLAN.w / 2; OZ = PLAN.y + PLAN.h / 2;
}
const px = (x) => +(OX + x * S).toFixed(1), pz = (z) => +(OZ + z * S).toFixed(1);

/** 圖面上標的尺寸（mm，取 10 的倍數）。 */
export function roomDims(size) {
  const mm = (m) => Math.round(m * 100) * 10;
  return { w: mm(size.w), d: mm(size.d), h: mm(size.h), mm };
}

const text = (x, y, s, o = '') => `<text x="${x}" y="${y}" ${o}>${esc(s)}</text>`;
function dimH(x0, x1, y, label) {
  return `<g class="dim"><path d="M${x0} ${y}H${x1}M${x0} ${y - 5}v10M${x1} ${y - 5}v10M${x0 - 3} ${y + 3}l6 -6M${x1 - 3} ${y + 3}l6 -6"/>${text((x0 + x1) / 2, y - 5, label, 'text-anchor="middle"')}</g>`;
}
function dimV(y0, y1, x, label) {
  return `<g class="dim"><path d="M${x} ${y0}V${y1}M${x - 5} ${y0}h10M${x - 5} ${y1}h10M${x - 3} ${y0 + 3}l6 -6M${x - 3} ${y1 + 3}l6 -6"/>${text(x - 6, (y0 + y1) / 2, label, `text-anchor="middle" transform="rotate(-90 ${x - 6} ${(y0 + y1) / 2})"`)}</g>`;
}
function sheet({ no, title, scale = `1 : ${N}`, project, date }, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}（草稿）">
<style>.sh{font-family:"PingFang TC","Noto Sans TC",sans-serif;fill:#1d1d1b;font-size:10px}.sh path,.sh rect,.sh circle,.sh ellipse,.sh line{fill:none;stroke:#1d1d1b;stroke-width:1}.sh .wall{fill:#1d1d1b;stroke:none}.sh .thin path,.sh .thin rect,.sh .thin circle,.sh .thin line,.sh .thin ellipse{stroke-width:.6}.sh .dash{stroke-dasharray:5 4}.sh .dim path{stroke-width:.6}.sh .dim text{font-size:9px}.sh .fill{fill:#1d1d1b}.sh .tb text{font-size:9px}.sh .big{font-size:15px;font-weight:700}.sh .hatch path{stroke-width:.35;stroke:#6b6b68}.sh .red path,.sh .red circle,.sh .red rect,.sh .red line{stroke:#b3261e}.sh .red text{fill:#b3261e}.sh .blue path,.sh .blue circle,.sh .blue rect{stroke:#1d4f91}.sh .blue text{fill:#1d4f91}</style>
<rect width="${W}" height="${H}" fill="#fdfdfb"/>
<g class="sh">
<rect x="14" y="14" width="${W - 28}" height="${H - 28}" style="stroke-width:1.6"/>
${body}
<g class="tb"><rect x="${W - 234}" y="${H - 104}" width="220" height="90" style="fill:#fdfdfb"/><path d="M${W - 234} ${H - 74}h220M${W - 234} ${H - 44}h220M${W - 124} ${H - 44}v30"/>
${text(W - 226, H - 85, title, 'class="big"')}
${text(W - 226, H - 55, '專案：' + project)}
${text(W - 226, H - 25, '圖號 ' + no)}${text(W - 116, H - 31, '比例 ' + scale)}${text(W - 116, H - 19, '日期 ' + date)}</g>
${text(24, H - 22, 'AI 初稿・需現場丈量，經專業團隊確認後才是可施工的圖', 'style="font-size:9px;fill:#6b6b68"')}
</g></svg>`;
}

/* ---------- shared plan pieces ---------- */
function shell() {
  const t = 0.12 * S, x0 = px(-ROOM.w / 2), x1 = px(ROOM.w / 2), z0 = pz(-ROOM.d / 2), z1 = pz(ROOM.d / 2);
  const wx0 = px(WINDOW.x0), wx1 = px(WINDOW.x1), door = 0.9 * S;
  return `<g>
<rect class="wall" x="${x0 - t}" y="${z0 - t}" width="${wx0 - x0 + t}" height="${t}"/><rect class="wall" x="${wx1}" y="${z0 - t}" width="${x1 - wx1 + t}" height="${t}"/>
<rect class="wall" x="${x0 - t}" y="${z0}" width="${t}" height="${z1 - z0 + t}"/><rect class="wall" x="${x1}" y="${z0}" width="${t}" height="${z1 - z0 - door - 12}"/>
<rect class="wall" x="${x1}" y="${z1 - 12}" width="${t}" height="${12 + t}"/><rect class="wall" x="${x0}" y="${z1}" width="${x1 - x0}" height="${t}"/>
<g class="thin"><rect x="${wx0}" y="${z0 - t}" width="${wx1 - wx0}" height="${t}"/><path d="M${wx0} ${z0 - t / 2}H${wx1}M${(wx0 + wx1) / 2} ${z0 - t}v${t}"/>
<path d="M${x1} ${z1 - 12}h${-door}" /><path class="dash" d="M${x1 - door} ${z1 - 12}A${door} ${door} 0 0 1 ${x1} ${z1 - 12 - door}"/></g>
${text(x1 + t + 6, z1 - 12 - door / 2, '門（示意）', 'style="font-size:9px"')}${text(wx1 + 6, z0 - t - 4, '窗（示意）', 'style="font-size:9px"')}</g>`;
}
function furniture() {
  const r = (L, rx = 4) => `<rect x="${px(L.x - L.sx / 2)}" y="${pz(L.z - L.sz / 2)}" width="${(L.sx * S).toFixed(1)}" height="${(L.sz * S).toFixed(1)}" rx="${Math.min(rx, S / 12)}"/>`;
  const { sofa, table, chair, rug, sideboard, lamp, sidetable, plant, bed, nightA, nightB } = LAYOUT;
  const cab = { x: (CABINET.x0 + CABINET.x1) / 2, z: -ROOM.d / 2 + CABINET.depth / 2, sx: CABINET.x1 - CABINET.x0, sz: CABINET.depth };
  const pr = 0.3 * S;
  const sofaSVG = () => {
    const seats = sofa.sz < 1.9 ? 2 : 3, seat = sofa.sz / seats, sx0 = px(sofa.x - sofa.sx / 2 + 0.22);
    const cuts = seats === 3 ? [sofa.z - seat / 2, sofa.z + seat / 2] : [sofa.z];
    return `${r(sofa, 8)}<path d="M${sx0} ${pz(sofa.z - sofa.sz / 2 + 0.17)}v${(sofa.sz - 0.34) * S}${cuts.map((z) => `M${sx0} ${pz(z)}h${(sofa.sx - 0.22) * S}`).join('')}"/>`;
  };
  // 床：床頭板、枕頭、被子反摺線
  const bedSVG = () => {
    const bx = bed.x - bed.sx / 2, n = bed.sz >= 1.3 ? 2 : 1, pw = bed.sz / n - 0.16;
    const pillows = Array.from({ length: n }, (_, i) => r({ x: bx + 0.4, z: bed.z - bed.sz / 2 + (bed.sz / n) * (i + 0.5), sx: 0.4, sz: pw }, 5)).join('');
    return `${r(bed, 3)}${r({ x: bx + 0.04, z: bed.z, sx: 0.08, sz: bed.sz }, 0)}${pillows}<path d="M${px(bx + 0.78)} ${pz(bed.z - bed.sz / 2)}v${bed.sz * S}M${px(bx + 0.95)} ${pz(bed.z - bed.sz / 2)}v${bed.sz * S}"/>${[nightA, nightB].filter(Boolean).map((t) => r(t, 2)).join('')}`;
  };
  return `<g class="thin">${RUG ? `<g class="dash">${r(rug, 0)}</g>` : ''}
${r(cab, 0)}<path d="M${px(CABINET.x0)} ${pz(-ROOM.d / 2)}L${px(CABINET.x1)} ${pz(-ROOM.d / 2 + CABINET.depth)}M${px(CABINET.x0 + cab.sx / 3)} ${pz(-ROOM.d / 2)}v${CABINET.depth * S}M${px(CABINET.x0 + (cab.sx * 2) / 3)} ${pz(-ROOM.d / 2)}v${CABINET.depth * S}"/>
${sideboard ? r(sideboard, 1) : ''}${sofa ? sofaSVG() : ''}${bed ? bedSVG() : ''}
${table ? `<ellipse cx="${px(table.x)}" cy="${pz(table.z)}" rx="${(table.sx / 2) * S}" ry="${(table.sz / 2) * S}"/>` : ''}
${chair ? `<g transform="rotate(-20 ${px(chair.x)} ${pz(chair.z)})">${r(chair, 8)}<path d="M${px(chair.x + chair.sx / 2 - 0.2)} ${pz(chair.z - chair.sz / 2 + 0.1)}v${(chair.sz - 0.2) * S}"/></g>` : ''}
${lamp ? `<circle cx="${px(lamp.x)}" cy="${pz(lamp.z)}" r="${0.2 * S}"/>` : ''}
${sidetable ? `<circle cx="${px(sidetable.x)}" cy="${pz(sidetable.z)}" r="${0.22 * S}"/>` : ''}
${plant ? `<circle cx="${px(plant.x)}" cy="${pz(plant.z)}" r="${pr}"/><path d="M${px(plant.x) - pr * 0.7} ${pz(plant.z) - pr * 0.7}l${pr * 1.4} ${pr * 1.4}M${px(plant.x) - pr * 0.7} ${pz(plant.z) + pr * 0.7}l${pr * 1.4} ${-pr * 1.4}"/>` : ''}</g>`;
}
const roomDimsSVG = (dm) => dimH(px(-ROOM.w / 2), px(ROOM.w / 2), pz(-ROOM.d / 2) - 34, String(dm.w)) + dimV(pz(-ROOM.d / 2), pz(ROOM.d / 2), px(-ROOM.w / 2) - 34, String(dm.d));
const legend = (rows, x = W - 234, y = 40) => `<g><rect x="${x}" y="${y}" width="220" height="${rows.length * 22 + 30}" style="fill:#fdfdfb"/>${text(x + 10, y + 18, '圖例', 'style="font-weight:700"')}${rows.map(([sym, label], i) => `<g transform="translate(${x + 22} ${y + 40 + i * 22})">${sym}</g>${text(x + 44, y + 44 + i * 22, label)}`).join('')}</g>`;

/* ---------- sheets ---------- */
const SYM = {
  down: '<circle r="6"/><path d="M-6 0h12M0 -6v12"/>',
  pendant: '<circle r="9"/><circle r="4" class="fill"/>',
  strip: '<path class="dash" d="M-10 0h20" style="stroke-width:2"/>',
  floor: '<circle r="7"/><path d="M-5 -5l10 10M-5 5l10 -10"/>',
  sw: '<circle r="3.5" class="fill"/><path d="M0 0l9 -9M9 -9h5"/>',
  socket: '<circle r="6.5"/><path d="M-2.5 -3v6M2.5 -3v6"/>',
  socketD: '<circle r="6.5"/><path d="M-2.5 -3v6M2.5 -3v6M-9 9h18"/>',
  net: '<rect x="-6" y="-6" width="12" height="12"/><path d="M-6 6l12 -12"/>',
  tv: '<rect x="-6" y="-6" width="12" height="12"/><path d="M-3 -2h6M0 -2v5"/>',
};
const at = (x, z, sym, cls = '') => `<g class="${cls}" transform="translate(${px(x)} ${pz(z)})">${sym}</g>`;

const tagSym = (n) => `<circle r="7.5" style="fill:#fdfdfb"/><text text-anchor="middle" y="3.4" style="font-size:9.5px;font-weight:700">${n}</text>`;
const tag = (n, x, z) => `<g transform="translate(${px(x)} ${pz(z)})">${tagSym(n)}</g>`;
function planSheet(meta, dm) {
  const { sofa, table, chair, sideboard, bed } = LAYOUT, back = pz(-ROOM.d / 2), main = sofa ?? bed;
  // 編號標在家具裡面，名稱放圖例：不會壓到旁邊的家具或尺寸線
  const tags = [['1', bed ? '衣櫃（高櫃）' : '收納高櫃', (CABINET.x0 + CABINET.x1) / 2, -ROOM.d / 2 + CABINET.depth / 2],
    ...(sideboard ? [['2', bed ? '窗下斗櫃' : '窗下低櫃', sideboard.x, sideboard.z]] : []),
    bed ? ['3', bed.sz >= 1.3 ? '雙人床 150×200' : '單人床 105×200', bed.x + 0.35, bed.z] : ['3', sofa.sz < 1.9 ? '雙人沙發' : '三人沙發', sofa.x + 0.12, sofa.z - sofa.sz / 2 + 0.3],
    ...(chair ? [['4', '單椅', chair.x, chair.z]] : [])];
  return sheet({ ...meta, no: 'A-01', title: '平面配置圖' }, shell() + furniture() + roomDimsSVG(dm)
    + dimH(px(CABINET.x0), px(CABINET.x1), back - 14, String(dm.mm(CABINET.x1 - CABINET.x0)))
    + dimH(px(WINDOW.x0), px(WINDOW.x1), back - 14, String(dm.mm(WINDOW.x1 - WINDOW.x0)))
    + (table ? dimH(px(sofa.x + sofa.sx / 2), px(table.x - table.sx / 2), pz(sofa.z + table.sz / 2) + 14, String(dm.mm(table.x - table.sx / 2 - (sofa.x + sofa.sx / 2)))) : '')
    + (sofa ? dimV(pz(sofa.z - sofa.sz / 2), pz(sofa.z + sofa.sz / 2), px(sofa.x - sofa.sx / 2) + 16, String(dm.mm(sofa.sz)))
      : dimV(pz(bed.z - bed.sz / 2), pz(bed.z + bed.sz / 2), px(bed.x + bed.sx / 2) - 14, String(dm.mm(bed.sz))) + dimH(px(bed.x - bed.sx / 2), px(bed.x + bed.sx / 2), pz(bed.z + bed.sz / 2) + 16, String(dm.mm(bed.sx))))
    + tags.map(([n, , x, z]) => tag(n, x, z)).join('')
    + legend([...(RUG ? [['<path class="dash" d="M-10 0h20"/>', '地毯範圍']] : []), ['<rect x="-8" y="-4" width="16" height="8"/>', '固定櫃體（木作／系統）'], ['<circle r="6"/>', '活動家具'],
      ...tags.map(([n, label]) => [tagSym(n), label]), ['<path d="M-10 0h20"/>', '門、窗位置為示意，以現場為準']]));
}
/** 嵌燈依房間大小排成格點：約每 2.2 m 一盞，離牆半個間距。 */
export function downlights(room) {
  const cols = Math.max(2, Math.min(8, Math.round(room.w / 2.2))), rows = Math.max(1, Math.min(8, Math.round(room.d / 2.2)));
  const out = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) out.push([-room.w / 2 + (room.w * (i + 0.5)) / cols, -room.d / 2 + (room.d * (j + 0.5)) / rows]);
  return out;
}
function lightingSheet(meta, dm) {
  const downs = downlights(ROOM), R = ROOM.w / 2, F = ROOM.d / 2, swz = F - Math.min(1.2, ROOM.d * 0.3), bay = (CABINET.x1 - CABINET.x0) / 3;
  const rows = [...new Set(downs.map(([, z]) => z))];
  const circuits = rows.map((z) => `M${downs.filter((p) => p[1] === z).map(([x]) => `${px(x)} ${pz(z)}`).join('L')}L${px(R) - 8} ${pz(swz)}`).join('');
  return sheet({ ...meta, no: 'E-01', title: '天花板燈具配置圖' }, shell() + `<g style="opacity:.28">${furniture()}</g>` + roomDimsSVG(dm)
    + `<g class="red">${downs.map(([x, z]) => at(x, z, SYM.down)).join('')}${at(LAYOUT.pendant.x, LAYOUT.pendant.z, SYM.pendant)}${LAYOUT.lamp ? at(LAYOUT.lamp.x, LAYOUT.lamp.z, SYM.floor) : ''}
<path class="dash" style="stroke-width:2" d="M${px(CABINET.x0 + bay)} ${pz(-F + CABINET.depth - 0.04)}h${bay * S}"/>
<g class="thin"><path class="dash" d="${circuits}"/><path class="dash" d="M${px(LAYOUT.pendant.x)} ${pz(LAYOUT.pendant.z)}L${px(R) - 8} ${pz(swz - 0.15)}"/></g>
${at(R - 0.08, swz, SYM.sw)}${at(R - 0.08, swz - 0.15, SYM.sw)}
${text(px(R) - 44, pz(swz) + 16, 'S1 S2')}${downs.length <= 16 ? downs.map(([x, z], i) => text(px(x) + 9, pz(z) - 8, `L${i + 1}`)).join('') : ''}${text(px(LAYOUT.pendant.x) + 12, pz(LAYOUT.pendant.z) - 10, 'P1')}</g>`
    + `<g class="red">${text(px(-ROOM.w / 2) + 6, pz(F) - 22, `天花板重做：火警偵測器／住宅用火災警報器${meta.sprinkler === 'no' ? '' : '、撒水頭'}位置待現場標註，嵌燈與造型需避開`, 'style="font-size:9px"')}</g>`
    + text(px(-ROOM.w / 2) + 6, pz(F) - 8, `現況淨高 ${dm.h}；完成天花板 CH=${dm.h - 200}（預留 200 走燈具與管線），窗簾盒深 180`)
    + legend([[SYM.down, `嵌燈 Ø95　9W 3000K ×${downs.length}`], [SYM.pendant, '吊燈　E27 ×1'], [SYM.strip, '層板 LED 燈條 2700K'], ...(LAYOUT.lamp ? [[SYM.floor, '立燈（插座迴路）']] : []), [SYM.sw, '單切開關 H=1200']].map(([sym, l]) => [`<g class="red">${sym}</g>`, l])));
}
function powerSheet(meta, dm) {
  const b = -ROOM.d / 2 + 0.06, l = -ROOM.w / 2 + 0.08, r = ROOM.w / 2 - 0.08, bed = LAYOUT.bed, sofa = LAYOUT.sofa ?? bed, wc = (WINDOW.x0 + WINDOW.x1) / 2;
  const sz0 = sofa.z - sofa.sz / 2 - 0.15, sz1 = sofa.z + sofa.sz / 2 + 0.15;       // 沙發（或床頭）兩端各一組
  const pts = [[l, sz0, SYM.socketD, bed ? 'H600 床頭' : 'H300'], [l, sz1, SYM.socketD, bed ? 'H600 床頭' : 'H300'],
    [(CABINET.x0 + CABINET.x1) / 2, b + CABINET.depth, SYM.socket, 'H1000 櫃內'], [wc - 0.3, b + 0.42, SYM.socketD, 'H450'], [wc + 0.3, b + 0.42, SYM.net, 'H450'],
    ...(bed ? [[r, sofa.z - 0.15, SYM.socketD, 'H300'], [r, sofa.z + 0.15, SYM.net, 'H300']]
      : [[r, sofa.z - 0.45, SYM.socketD, 'H300'], [r, sofa.z - 0.15, SYM.tv, 'H1100'], [r, sofa.z + 0.15, SYM.net, 'H1100'], [r, sofa.z + 0.45, SYM.socketD, 'H1100']])];
  return sheet({ ...meta, no: 'E-02', title: '插座與弱電配置圖' }, shell() + `<g style="opacity:.28">${furniture()}</g>` + roomDimsSVG(dm)
    + `<g class="blue">${pts.map(([x, z, sym, t]) => at(x, z, sym) + text(px(x) + (x > r - 0.5 ? -46 : 10), pz(z) + 4, t, 'style="font-size:8px"')).join('')}
<path class="dash thin" style="stroke-width:.6" d="M${px(l)} ${pz(sz0)}V${pz(sz1)}${bed ? '' : `M${px(r)} ${pz(sofa.z - 0.45)}V${pz(sofa.z + 0.45)}`}"/></g>`
    + (bed ? text(px(l) + 12, pz(sz0) - 10, '床頭兩側：插座＋雙切開關（進門與床頭都能關燈）', 'style="font-size:9px"') : text(px(r) - 96, pz(sofa.z - 0.45) - 12, '電視牆（預留管 2 吋）'))
    + text(px(-ROOM.w / 2) + 6, pz(ROOM.d / 2) - 8, '專用迴路：冷氣 1、插座 2（2.0mm² ／ 20A）')
    + legend([[SYM.socket, '單聯插座 110V'], [SYM.socketD, '雙聯插座 110V（接地）'], [SYM.net, '網路出線口 CAT6'], ...(bed ? [] : [[SYM.tv, '電視出線口']])].map(([sym, lbl]) => [`<g class="blue">${sym}</g>`, lbl])));
}
function elevationSheet(meta, dm) {
  const EN = SCALES.find((n) => (ROOM.w * 2000) / n <= 640 && (ROOM.h * 2000) / n <= 300) ?? SCALES.at(-1), E = 2000 / EN;
  const ex = (x) => +(100 + (640 - ROOM.w * E) / 2 + (x + ROOM.w / 2) * E).toFixed(1), ey = (y) => +(110 + (ROOM.h - y) * E).toFixed(1);
  const cw = CABINET.x1 - CABINET.x0, bay = cw / 3, c0 = CABINET.x0, sb = LAYOUT.sideboard;
  const rect = (x0, y0, x1, y1, o = '') => `<rect x="${ex(x0)}" y="${ey(y1)}" width="${((x1 - x0) * E).toFixed(1)}" height="${((y1 - y0) * E).toFixed(1)}" ${o}/>`;
  const hatch = []; for (let i = 0; i < Math.max(0, Math.floor((bay * E - 8) / 6)); i++) hatch.push(`M${ex(c0 + bay) + 4 + i * 6} ${ey(1.8) + 3}v${0.92 * E - 6}`);
  return sheet({ ...meta, no: 'A-02', title: `${meta.bedroom ? '衣櫃' : '收納櫃'}與窗牆立面圖`, scale: `1 : ${EN}` },
    `<path style="stroke-width:1.8" d="M${ex(-ROOM.w / 2)} ${ey(0)}H${ex(ROOM.w / 2)}M${ex(-ROOM.w / 2)} ${ey(ROOM.h)}H${ex(ROOM.w / 2)}M${ex(-ROOM.w / 2)} ${ey(0)}V${ey(ROOM.h)}M${ex(ROOM.w / 2)} ${ey(0)}V${ey(ROOM.h)}"/>
<g class="thin">${rect(c0, 0.08, c0 + bay, ROOM.h)}${rect(c0 + bay * 2, 0.08, CABINET.x1, ROOM.h)}${rect(c0 + bay, 0.08, c0 + bay * 2, 0.88)}${rect(c0 + bay, 1.8, c0 + bay * 2, ROOM.h)}${rect(c0, 0, CABINET.x1, 0.08)}
<path d="M${ex(c0 + bay)} ${ey(1.33)}h${bay * E}"/><g class="hatch"><path d="${hatch.join('')}"/></g>
<path class="dash" d="M${ex(c0)} ${ey(ROOM.h)}L${ex(c0 + bay)} ${ey(1.4)}L${ex(c0)} ${ey(0.08)}M${ex(CABINET.x1)} ${ey(ROOM.h)}L${ex(c0 + bay * 2)} ${ey(1.4)}L${ex(CABINET.x1)} ${ey(0.08)}"/>
${rect(WINDOW.x0, WINDOW.y0, WINDOW.x1, WINDOW.y1)}<path d="M${ex((WINDOW.x0 + WINDOW.x1) / 2)} ${ey(WINDOW.y0)}V${ey(WINDOW.y1)}M${ex(WINDOW.x0)} ${ey(Math.min(2.05, WINDOW.y1 - 0.4))}H${ex(WINDOW.x1)}"/>
${sb ? `${rect(sb.x - sb.sx / 2, 0.11, sb.x + sb.sx / 2, 0.47)}<path d="M${ex(sb.x)} ${ey(0.11)}V${ey(0.47)}M${ex(sb.x - sb.sx / 4)} ${ey(0.11)}V${ey(0.47)}M${ex(sb.x + sb.sx / 4)} ${ey(0.11)}V${ey(0.47)}"/>` : ''}</g>`
    + dimH(ex(c0), ex(c0 + bay), ey(ROOM.h) - 16, String(dm.mm(bay))) + dimH(ex(c0 + bay), ex(c0 + bay * 2), ey(ROOM.h) - 16, String(dm.mm(bay))) + dimH(ex(c0 + bay * 2), ex(CABINET.x1), ey(ROOM.h) - 16, String(dm.mm(bay)))
    + dimH(ex(WINDOW.x0), ex(WINDOW.x1), ey(ROOM.h) - 16, String(dm.mm(WINDOW.x1 - WINDOW.x0))) + dimH(ex(-ROOM.w / 2), ex(ROOM.w / 2), ey(ROOM.h) - 40, String(dm.w))
    + dimV(ey(ROOM.h), ey(0), ex(-ROOM.w / 2) - 30, String(dm.h)) + dimV(ey(1.8), ey(0.88), ex(c0 + bay) - 8, '920') + dimV(ey(0.88), ey(0.08), ex(c0 + bay) - 8, '800')
    + text(ex(c0 + bay) + 6, ey(1.5), meta.bedroom ? '開放格（包包、摺衣）' : '開放層格', 'style="font-size:9px"') + text(ex(c0 + bay) + 6, ey(1.86), 'LED 燈條', 'style="font-size:8px"')
    + text(ex(c0) + 6, ey(0.3), `門片：${meta.cabinet}`, 'style="font-size:9px"') + text(ex(c0) + 6, ey(0.02) + 12, '踢腳 H80 內縮 30')
    + (meta.sprinkler === 'no' ? '' : `<g class="red"><path class="dash" d="M${ex(-ROOM.w / 2)} ${ey(ROOM.h - 0.45)}H${ex(ROOM.w / 2)}"/>${text(ex(CABINET.x1) + 8, ey(ROOM.h - 0.45) + 11, `撒水頭淨空：迴水板下方 450、水平 300 內不得有櫃體或天花造型（${meta.sprinkler === 'yes' ? '屋主回報有撒水頭，位置待現場標註' : '有無撒水頭待現場確認'}）`, 'style="font-size:8px"')}${text(ex(c0) + 6, ey(ROOM.h - 0.45) + 11, '櫃頂進入淨空處需降低', 'style="font-size:8px"')}</g>`)
    + text(ex(WINDOW.x0) + 8, ey(WINDOW.y1) + 16, '既有鋁窗（不更動）') + (sb ? text(ex(sb.x - sb.sx / 2), ey(0.5) - 4, `${meta.bedroom ? '斗櫃' : '低櫃'} W${dm.mm(sb.sx)}×D400×H470`, 'style="font-size:9px"') : ''));
}
function floorSheet(meta, dm) {
  const x0 = px(-ROOM.w / 2), x1 = px(ROOM.w / 2), z0 = pz(-ROOM.d / 2), z1 = pz(ROOM.d / 2);
  const lines = [], pw = Math.max(0.2 * S, 4), pl = pw * 6;   // plank hatch, never finer than 4 px
  if (meta.floorType === 'concrete') { for (let x = x0 + 1.2 * S; x < x1; x += 1.2 * S) lines.push(`M${x.toFixed(1)} ${z0}V${z1}`); for (let z = z0 + 1.2 * S; z < z1; z += 1.2 * S) lines.push(`M${x0} ${z.toFixed(1)}H${x1}`); } else {
    let row = 0;
    for (let z = z0 + pw; z < z1; z += pw, row++) { lines.push(`M${x0} ${z.toFixed(1)}H${x1}`); for (let x = x0 + ((row * 37) % 100) / 100 * pl; x < x1; x += pl) lines.push(`M${x.toFixed(1)} ${(z - pw).toFixed(1)}v${pw.toFixed(1)}`); }
  }
  const area = ((dm.w / 1000) * (dm.d / 1000)).toFixed(1);
  return sheet({ ...meta, no: 'A-03', title: '地坪材料計畫圖' }, `<g class="hatch"><path d="${lines.join('')}"/></g>` + shell() + roomDimsSVG(dm)
    + `<rect x="${px(0) - 95}" y="${pz(0) - 31}" width="190" height="62" style="fill:#fdfdfb"/>` + text(px(0) - 85, pz(0) - 11, `FL-01　${meta.floorName}`, 'style="font-weight:700"')
    + text(px(0) - 85, pz(0) + 5, `面積 ${area} m²（${meta.ping} 坪）損耗 8%`) + text(px(0) - 85, pz(0) + 21, meta.floorType === 'concrete' ? '分割縫 1200×1200，收邊留 5mm' : '鋪設方向：平行長邊；起鋪點：窗側')
    + `<path style="stroke-width:1.4" d="M${px(-ROOM.w / 4)} ${pz(ROOM.d / 2) - 22}h${Math.min(1.4, ROOM.w / 3) * S}m-9 -5l9 5l-9 5"/>`
    + legend([['<path d="M-10 0h20M-10 5h20M-2 0v5"/>', meta.floorName], ['<path d="M-10 -4h20v8h-20z" class="fill"/>', '既有 RC 牆'], ['<path class="dash" d="M-10 0h20"/>', '門檻／收邊條']]));
}
function costSheet(meta, est) {
  const rows = est.items, x = 60, y = 96, cols = [0, 46, 170, 420, 520];
  const head = ['項次', '工項', '內容與規格', '複價（萬）', '備註'];
  return sheet({ ...meta, no: 'Q-01', title: '工程估價明細表', scale: '—' },
    text(x, 62, '工程估價明細表', 'class="big"') + text(x, 80, `${meta.project}・${est.ping} 坪・${meta.age}`)
    + `<g class="thin"><rect x="${x}" y="${y}" width="560" height="${(rows.length + 2) * 30}"/>${rows.map((_, i) => `<path d="M${x} ${y + (i + 1) * 30}h560"/>`).join('')}<path d="M${x} ${y + (rows.length + 1) * 30}h560" style="stroke-width:1.4"/>${cols.slice(1).map((c) => `<path d="M${x + c} ${y}v${(rows.length + 1) * 30}"/>`).join('')}</g>`
    + head.map((t, i) => text(x + cols[i] + 8, y + 19, t, 'style="font-weight:700"')).join('')
    + rows.map((r, i) => text(x + 8, y + 49 + i * 30, String(i + 1).padStart(2, '0')) + text(x + cols[1] + 8, y + 49 + i * 30, r.name) + text(x + cols[2] + 8, y + 49 + i * 30, r.basis, 'style="font-size:8.5px"') + text(x + cols[3] + 8, y + 49 + i * 30, `${r.low} – ${r.high}`) + text(x + cols[4] + 8, y + 49 + i * 30, i === 0 ? '含損耗' : '')).join('')
    + text(x + cols[2] + 8, y + 49 + rows.length * 30, '合計（未稅，不含設計監工費）', 'style="font-weight:700"') + text(x + cols[3] + 8, y + 49 + rows.length * 30, `${est.low} – ${est.high}`, 'style="font-weight:700"'));
}

// 下載檔名用英數，避免各系統對中文檔名的處理不一致
const FILE = { 'A-01': 'floor-plan', 'E-01': 'lighting', 'E-02': 'power', 'A-02': 'elevation', 'A-03': 'flooring', 'Q-01': 'estimate' };

/**
 * @param {{space:string, age:string}} cond
 * @param {object} look
 * @param {ReturnType<import('./estimate.js').designEstimate>} est
 * @param {string} date yyyy-mm-dd
 * @returns {{no:string, title:string, svg:string, file:string}[]} six sheets
 */
export function drawingSet(cond, look, est, date) {
  const size = roomSize(cond, est.ping);
  useRoom({ ...size, space: cond.space });
  RUG = Boolean(look.rug);
  const dm = roomDims(size);
  const meta = { bedroom: cond.space === '臥室', sprinkler: cond.sprinkler ?? '', project: `${cond.space}・${look.name}`, date, age: cond.age, ping: est.ping, floorType: look.floorType ?? 'wood',
    floorName: look.floorType === 'concrete' ? '礦物塗料地坪' : '超耐磨木地板', cabinet: look.cabinetWood ? '木皮板' : '烤漆板' };
  return [
    ['A-01', '平面配置圖', planSheet(meta, dm)],
    ['E-01', '天花板燈具配置圖', lightingSheet(meta, dm)],
    ['E-02', '插座與弱電配置圖', powerSheet(meta, dm)],
    ['A-02', `${meta.bedroom ? '衣櫃' : '收納櫃'}與窗牆立面圖`, elevationSheet(meta, dm)],
    ['A-03', '地坪材料計畫圖', floorSheet(meta, dm)],
    ['Q-01', '工程估價明細表', costSheet(meta, est)],
  ].map(([no, title, svg]) => ({ no, title, svg, file: `${no}-${FILE[no]}.svg` }));
}
