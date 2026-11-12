// 施工圖（示意）：依同一份空間資料產生的 SVG 圖紙。純函式、不碰 DOM。
// 這些是原型用的模擬圖，未經專業簽證；畫面上以模糊＋付費解鎖呈現。
import { ROOM, WINDOW, CABINET, LAYOUT } from './layout.js';

const W = 840, H = 594, S = 88; // sheet size (px) and plan scale (px per metre)
const OX = 150 + (ROOM.w / 2) * S, OZ = 86 + (ROOM.d / 2) * S; // plan origin on the sheet
const px = (x) => +(OX + x * S).toFixed(1), pz = (z) => +(OZ + z * S).toFixed(1);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PING_M2 = 3.3058;

/**
 * 圖面尺寸（mm，取 10 的倍數）。屋主給了實際長寬就直接用；只有坪數時依坪數等比例縮放。
 * @param {number} ping @param {{len?:number|string, wid?:number|string, height?:number|string}} real
 */
export function roomDims(ping, real = {}) {
  const k = Math.sqrt((ping * PING_M2) / (ROOM.w * ROOM.d));
  const mm = (m) => Math.round((m * k * 1000) / 10) * 10;
  const given = (v) => { const n = Number.parseFloat(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) * 10 : null; };
  return { k, w: given(real.len) ?? mm(ROOM.w), d: given(real.wid) ?? mm(ROOM.d), h: given(real.height) ?? 2800, mm, measured: Boolean(given(real.len) && given(real.wid)) };
}

const text = (x, y, s, o = '') => `<text x="${x}" y="${y}" ${o}>${esc(s)}</text>`;
function dimH(x0, x1, y, label) {
  return `<g class="dim"><path d="M${x0} ${y}H${x1}M${x0} ${y - 5}v10M${x1} ${y - 5}v10M${x0 - 3} ${y + 3}l6 -6M${x1 - 3} ${y + 3}l6 -6"/>${text((x0 + x1) / 2, y - 5, label, 'text-anchor="middle"')}</g>`;
}
function dimV(y0, y1, x, label) {
  return `<g class="dim"><path d="M${x} ${y0}V${y1}M${x - 5} ${y0}h10M${x - 5} ${y1}h10M${x - 3} ${y0 + 3}l6 -6M${x - 3} ${y1 + 3}l6 -6"/>${text(x - 6, (y0 + y1) / 2, label, `text-anchor="middle" transform="rotate(-90 ${x - 6} ${(y0 + y1) / 2})"`)}</g>`;
}
function sheet({ no, title, scale = '1 : 50', project, date }, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}（示意）">
<style>.sh{font-family:"PingFang TC","Noto Sans TC",sans-serif;fill:#1d1d1b;font-size:10px}.sh path,.sh rect,.sh circle,.sh ellipse,.sh line{fill:none;stroke:#1d1d1b;stroke-width:1}.sh .wall{fill:#1d1d1b;stroke:none}.sh .thin path,.sh .thin rect,.sh .thin circle,.sh .thin line,.sh .thin ellipse{stroke-width:.6}.sh .dash{stroke-dasharray:5 4}.sh .dim path{stroke-width:.6}.sh .dim text{font-size:9px}.sh .fill{fill:#1d1d1b}.sh .tb text{font-size:9px}.sh .big{font-size:15px;font-weight:700}.sh .hatch path{stroke-width:.35;stroke:#6b6b68}.sh .red path,.sh .red circle,.sh .red rect,.sh .red line{stroke:#b3261e}.sh .red text{fill:#b3261e}.sh .blue path,.sh .blue circle,.sh .blue rect{stroke:#1d4f91}.sh .blue text{fill:#1d4f91}</style>
<rect width="${W}" height="${H}" fill="#fdfdfb"/>
<g class="sh">
<rect x="14" y="14" width="${W - 28}" height="${H - 28}" style="stroke-width:1.6"/>
${body}
<g class="tb"><rect x="${W - 234}" y="${H - 104}" width="220" height="90" style="fill:#fdfdfb"/><path d="M${W - 234} ${H - 74}h220M${W - 234} ${H - 44}h220M${W - 124} ${H - 44}v30"/>
${text(W - 226, H - 85, title, 'class="big"')}
${text(W - 226, H - 55, '專案：' + project)}
${text(W - 226, H - 25, '圖號 ' + no)}${text(W - 116, H - 31, '比例 ' + scale)}${text(W - 116, H - 19, '日期 ' + date)}</g>
${text(24, H - 22, '示意圖・未經專業簽證，不可作為施工依據', 'style="font-size:9px;fill:#6b6b68"')}
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
<path d="M${x1} ${z1 - 12}h${-door}" /><path class="dash" d="M${x1 - door} ${z1 - 12}A${door} ${door} 0 0 1 ${x1} ${z1 - 12 - door}"/></g></g>`;
}
function furniture() {
  const r = (L, rx = 4) => `<rect x="${px(L.x - L.sx / 2)}" y="${pz(L.z - L.sz / 2)}" width="${(L.sx * S).toFixed(1)}" height="${(L.sz * S).toFixed(1)}" rx="${rx}"/>`;
  const { sofa, table, chair, rug, sideboard, lamp, sidetable, plant } = LAYOUT;
  const cab = { x: (CABINET.x0 + CABINET.x1) / 2, z: -ROOM.d / 2 + CABINET.depth / 2, sx: CABINET.x1 - CABINET.x0, sz: CABINET.depth };
  const seat = sofa.sz / 3;
  return `<g class="thin"><g class="dash">${r(rug, 0)}</g>
${r(cab, 0)}<path d="M${px(CABINET.x0)} ${pz(-ROOM.d / 2)}L${px(CABINET.x1)} ${pz(-ROOM.d / 2 + CABINET.depth)}M${px(CABINET.x0 + cab.sx / 3)} ${pz(-ROOM.d / 2)}v${CABINET.depth * S}M${px(CABINET.x0 + (cab.sx * 2) / 3)} ${pz(-ROOM.d / 2)}v${CABINET.depth * S}"/>
${r(sideboard, 1)}${r(sofa, 8)}<path d="M${px(sofa.x - sofa.sx / 2 + 0.22)} ${pz(sofa.z - sofa.sz / 2 + 0.17)}v${(sofa.sz - 0.34) * S}M${px(sofa.x - sofa.sx / 2 + 0.22)} ${pz(sofa.z - seat / 2)}h${(sofa.sx - 0.22) * S}M${px(sofa.x - sofa.sx / 2 + 0.22)} ${pz(sofa.z + seat / 2)}h${(sofa.sx - 0.22) * S}"/>
<ellipse cx="${px(table.x)}" cy="${pz(table.z)}" rx="${(table.sx / 2) * S}" ry="${(table.sz / 2) * S}"/>
<g transform="rotate(-20 ${px(chair.x)} ${pz(chair.z)})">${r(chair, 8)}<path d="M${px(chair.x + chair.sx / 2 - 0.2)} ${pz(chair.z - chair.sz / 2 + 0.1)}v${(chair.sz - 0.2) * S}"/></g>
<circle cx="${px(lamp.x)}" cy="${pz(lamp.z)}" r="${0.2 * S}"/><path d="M${px(lamp.x) - 5} ${pz(lamp.z)}h10M${px(lamp.x)} ${pz(lamp.z) - 5}v10"/>
<circle cx="${px(sidetable.x)}" cy="${pz(sidetable.z)}" r="${0.22 * S}"/>
<circle cx="${px(plant.x)}" cy="${pz(plant.z)}" r="${0.3 * S}"/><path d="M${px(plant.x) - 18} ${pz(plant.z) - 18}l36 36M${px(plant.x) - 18} ${pz(plant.z) + 18}l36 -36M${px(plant.x) - 26} ${pz(plant.z)}h52M${px(plant.x)} ${pz(plant.z) - 26}v52"/></g>`;
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

function planSheet(meta, dm) {
  const { sofa, table } = LAYOUT;
  const clear = dm.mm(table.x - table.sx / 2 - (sofa.x + sofa.sx / 2));
  return sheet({ ...meta, no: 'A-01', title: '平面配置圖' }, shell() + furniture() + roomDimsSVG(dm)
    + dimH(px(CABINET.x0), px(CABINET.x1), pz(-ROOM.d / 2) - 14, String(dm.mm(CABINET.x1 - CABINET.x0)))
    + dimH(px(WINDOW.x0), px(WINDOW.x1), pz(-ROOM.d / 2) - 14, String(dm.mm(WINDOW.x1 - WINDOW.x0)))
    + dimH(px(sofa.x + sofa.sx / 2), px(table.x - table.sx / 2), pz(sofa.z + 0.75), String(clear))
    + dimV(pz(sofa.z - sofa.sz / 2), pz(sofa.z + sofa.sz / 2), px(sofa.x - sofa.sx / 2) + 16, String(dm.mm(sofa.sz)))
    + text(px(CABINET.x0) + 8, pz(-ROOM.d / 2) + 52, '①收納高櫃') + text(px(LAYOUT.sideboard.x) - 22, pz(-ROOM.d / 2) + 50, '②窗下低櫃')
    + text(px(sofa.x) - 30, pz(sofa.z + sofa.sz / 2) + 14, '③三人沙發') + text(px(LAYOUT.chair.x) + 44, pz(LAYOUT.chair.z) + 30, '④單椅')
    + legend([['<path class="dash" d="M-10 0h20"/>', '地毯範圍'], ['<rect x="-8" y="-4" width="16" height="8"/>', '固定櫃體（木作／系統）'], ['<circle r="6"/>', '活動家具']]));
}
function lightingSheet(meta, dm) {
  const downs = [[-1.3, -0.7], [-1.3, 1.2], [0.6, -0.7], [0.6, 1.2], [1.9, 0.3]];
  const c1 = downs.slice(0, 2), c2 = downs.slice(2);
  const wire = (pts) => `<path class="dash" d="M${pts.map(([x, z]) => `${px(x)} ${pz(z)}`).join('Q' + px(pts[0][0] - 0.5) + ' ' + pz(0.2) + ' ')}"/>`;
  return sheet({ ...meta, no: 'E-01', title: '天花板燈具配置圖' }, shell() + `<g style="opacity:.28">${furniture()}</g>` + roomDimsSVG(dm)
    + `<g class="red">${downs.map(([x, z]) => at(x, z, SYM.down)).join('')}${at(LAYOUT.pendant.x, LAYOUT.pendant.z, SYM.pendant)}${at(LAYOUT.lamp.x, LAYOUT.lamp.z, SYM.floor)}
<path class="dash" style="stroke-width:2" d="M${px(CABINET.x0 + 0.6)} ${pz(-ROOM.d / 2 + CABINET.depth - 0.04)}h${0.55 * S}"/>
<g class="thin">${wire(c1)}<path class="dash" d="M${px(c2[0][0])} ${pz(c2[0][1])}L${px(c2[1][0])} ${pz(c2[1][1])}L${px(c2[2][0])} ${pz(c2[2][1])}L${px(ROOM.w / 2) - 8} ${pz(ROOM.d / 2 - 1.2)}"/><path class="dash" d="M${px(LAYOUT.pendant.x)} ${pz(LAYOUT.pendant.z)}Q${px(0.8)} ${pz(1.9)} ${px(ROOM.w / 2) - 8} ${pz(ROOM.d / 2 - 1.3)}"/></g>
${at(ROOM.w / 2 - 0.08, ROOM.d / 2 - 1.2, SYM.sw)}${at(ROOM.w / 2 - 0.08, ROOM.d / 2 - 1.35, SYM.sw)}
${text(px(ROOM.w / 2) - 62, pz(ROOM.d / 2 - 1.45), 'S1 S2 S3')}${downs.map(([x, z], i) => text(px(x) + 9, pz(z) - 8, `L${i + 1}`)).join('')}${text(px(LAYOUT.pendant.x) + 12, pz(LAYOUT.pendant.z) - 10, 'P1')}</g>`
    + text(px(-ROOM.w / 2) + 6, pz(ROOM.d / 2) - 8, `天花板高度 CH=${dm.h - 200}，窗簾盒深 180`)
    + legend([[SYM.down, '嵌燈 Ø95　9W 3000K ×5'], [SYM.pendant, '吊燈　E27 ×1'], [SYM.strip, '層板 LED 燈條 2700K'], [SYM.floor, '立燈（插座迴路）'], [SYM.sw, '單切開關 H=1200']].map(([s, l]) => [`<g class="red">${s}</g>`, l])));
}
function powerSheet(meta, dm) {
  const b = -ROOM.d / 2 + 0.06, l = -ROOM.w / 2 + 0.08, r = ROOM.w / 2 - 0.08;
  const pts = [[l, -0.7, SYM.socketD, 'H300'], [l, 1.2, SYM.socketD, 'H300'], [l, 1.9, SYM.socket, 'H300'], [0.5, b + 0.42, SYM.socketD, 'H450'], [1.4, b + 0.42, SYM.net, 'H450'], [-1.6, b + 0.42, SYM.socket, 'H1000 櫃內'],
    [r, -0.4, SYM.socketD, 'H300'], [r, -0.1, SYM.tv, 'H1100'], [r, 0.15, SYM.net, 'H1100'], [r, 0.4, SYM.socketD, 'H1100']];
  return sheet({ ...meta, no: 'E-02', title: '插座與弱電配置圖' }, shell() + `<g style="opacity:.28">${furniture()}</g>` + roomDimsSVG(dm)
    + `<g class="blue">${pts.map(([x, z, s, t]) => at(x, z, s) + text(px(x) + (x > 1.5 ? -46 : 10), pz(z) + 4, t, 'style="font-size:8px"')).join('')}
<path class="dash thin" style="stroke-width:.6" d="M${px(l)} ${pz(-0.7)}V${pz(1.9)}M${px(r)} ${pz(-0.4)}V${pz(0.4)}"/></g>`
    + text(px(r) - 86, pz(-0.62), '電視牆（預留管 2 吋）') + text(px(-ROOM.w / 2) + 6, pz(ROOM.d / 2) - 8, '專用迴路：冷氣 1、插座 2（2.0mm² ／ 20A）')
    + legend([[SYM.socket, '單聯插座 110V'], [SYM.socketD, '雙聯插座 110V（接地）'], [SYM.net, '網路出線口 CAT6'], [SYM.tv, '電視出線口']].map(([s, lbl]) => [`<g class="blue">${s}</g>`, lbl])));
}
function elevationSheet(meta, dm) {
  const E = 96, ex = (x) => +(130 + (x + ROOM.w / 2) * E).toFixed(1), ey = (y) => +(110 + (ROOM.h - y) * E).toFixed(1);
  const cw = CABINET.x1 - CABINET.x0, bay = cw / 3, c0 = CABINET.x0, sb = LAYOUT.sideboard;
  const rect = (x0, y0, x1, y1, o = '') => `<rect x="${ex(x0)}" y="${ey(y1)}" width="${((x1 - x0) * E).toFixed(1)}" height="${((y1 - y0) * E).toFixed(1)}" ${o}/>`;
  const hatch = []; for (let i = 0; i < 9; i++) hatch.push(`M${ex(c0 + bay) + 4 + i * 6} ${ey(1.8) + 3}v${0.92 * E - 6}`);
  return sheet({ ...meta, no: 'A-02', title: '收納櫃與窗牆立面圖', scale: '1 : 40' },
    `<path style="stroke-width:1.8" d="M${ex(-ROOM.w / 2)} ${ey(0)}H${ex(ROOM.w / 2)}M${ex(-ROOM.w / 2)} ${ey(ROOM.h)}H${ex(ROOM.w / 2)}M${ex(-ROOM.w / 2)} ${ey(0)}V${ey(ROOM.h)}M${ex(ROOM.w / 2)} ${ey(0)}V${ey(ROOM.h)}"/>
<g class="thin">${rect(c0, 0.08, c0 + bay, ROOM.h)}${rect(c0 + bay * 2, 0.08, CABINET.x1, ROOM.h)}${rect(c0 + bay, 0.08, c0 + bay * 2, 0.88)}${rect(c0 + bay, 1.8, c0 + bay * 2, ROOM.h)}${rect(c0, 0, CABINET.x1, 0.08)}
<path d="M${ex(c0 + bay)} ${ey(1.33)}h${bay * E}"/><g class="hatch"><path d="${hatch.join('')}"/></g>
<path class="dash" d="M${ex(c0)} ${ey(ROOM.h)}L${ex(c0 + bay)} ${ey(1.4)}L${ex(c0)} ${ey(0.08)}M${ex(CABINET.x1)} ${ey(ROOM.h)}L${ex(c0 + bay * 2)} ${ey(1.4)}L${ex(CABINET.x1)} ${ey(0.08)}"/>
${rect(WINDOW.x0, WINDOW.y0, WINDOW.x1, WINDOW.y1)}<path d="M${ex((WINDOW.x0 + WINDOW.x1) / 2)} ${ey(WINDOW.y0)}V${ey(WINDOW.y1)}M${ex(WINDOW.x0)} ${ey(2.05)}H${ex(WINDOW.x1)}"/>
${rect(sb.x - sb.sx / 2, 0.11, sb.x + sb.sx / 2, 0.47)}<path d="M${ex(sb.x)} ${ey(0.11)}V${ey(0.47)}M${ex(sb.x - sb.sx / 4)} ${ey(0.11)}V${ey(0.47)}M${ex(sb.x + sb.sx / 4)} ${ey(0.11)}V${ey(0.47)}"/></g>`
    + dimH(ex(c0), ex(c0 + bay), ey(ROOM.h) - 16, String(dm.mm(bay))) + dimH(ex(c0 + bay), ex(c0 + bay * 2), ey(ROOM.h) - 16, String(dm.mm(bay))) + dimH(ex(c0 + bay * 2), ex(CABINET.x1), ey(ROOM.h) - 16, String(dm.mm(bay)))
    + dimH(ex(WINDOW.x0), ex(WINDOW.x1), ey(ROOM.h) - 16, String(dm.mm(WINDOW.x1 - WINDOW.x0))) + dimH(ex(-ROOM.w / 2), ex(ROOM.w / 2), ey(ROOM.h) - 40, String(dm.w))
    + dimV(ey(ROOM.h), ey(0), ex(-ROOM.w / 2) - 30, String(dm.h)) + dimV(ey(1.8), ey(0.88), ex(c0 + bay) - 8, '920') + dimV(ey(0.88), ey(0.08), ex(c0 + bay) - 8, '800')
    + text(ex(c0 + bay) + 6, ey(1.5), '開放層格', 'style="font-size:9px"') + text(ex(c0 + bay) + 6, ey(1.86), 'LED 燈條', 'style="font-size:8px"')
    + text(ex(c0) + 6, ey(0.3), `門片：${meta.cabinet}`, 'style="font-size:9px"') + text(ex(c0) + 6, ey(0.02) + 12, '踢腳 H80 內縮 30')
    + text(ex(WINDOW.x0) + 8, ey(WINDOW.y1) + 16, '既有鋁窗（不更動）') + text(ex(sb.x - sb.sx / 2), ey(0.5) - 4, `低櫃 W${dm.mm(sb.sx)}×D400×H470`, 'style="font-size:9px"'));
}
function floorSheet(meta, dm) {
  const x0 = px(-ROOM.w / 2), x1 = px(ROOM.w / 2), z0 = pz(-ROOM.d / 2), z1 = pz(ROOM.d / 2);
  const lines = [];
  if (meta.floorType === 'concrete') { for (let x = x0 + 1.2 * S; x < x1; x += 1.2 * S) lines.push(`M${x.toFixed(1)} ${z0}V${z1}`); for (let z = z0 + 1.2 * S; z < z1; z += 1.2 * S) lines.push(`M${x0} ${z.toFixed(1)}H${x1}`); } else {
    let row = 0;
    for (let z = z0 + 0.2 * S; z < z1; z += 0.2 * S, row++) { lines.push(`M${x0} ${z.toFixed(1)}H${x1}`); for (let x = x0 + ((row * 37) % 100) / 100 * 1.2 * S; x < x1; x += 1.2 * S) lines.push(`M${x.toFixed(1)} ${(z - 0.2 * S).toFixed(1)}v${0.2 * S}`); }
  }
  const area = ((dm.w / 1000) * (dm.d / 1000)).toFixed(1);
  return sheet({ ...meta, no: 'A-03', title: '地坪材料計畫圖' }, `<g class="hatch"><path d="${lines.join('')}"/></g>` + shell() + roomDimsSVG(dm)
    + `<rect x="${px(-0.9)}" y="${pz(0.3)}" width="190" height="62" style="fill:#fdfdfb"/>` + text(px(-0.9) + 10, pz(0.3) + 20, `FL-01　${meta.floorName}`, 'style="font-weight:700"')
    + text(px(-0.9) + 10, pz(0.3) + 36, `面積 ${area} m²（${meta.ping} 坪）損耗 8%`) + text(px(-0.9) + 10, pz(0.3) + 52, meta.floorType === 'concrete' ? '分割縫 1200×1200，收邊留 5mm' : '鋪設方向：平行長邊；起鋪點：窗側')
    + `<path style="stroke-width:1.4" d="M${px(-2)} ${pz(1.6)}h${1.4 * S}m-9 -5l9 5l-9 5"/>`
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

/**
 * @param {{space:string, age:string}} cond
 * @param {object} look
 * @param {ReturnType<import('./estimate.js').designEstimate>} est
 * @param {string} date yyyy-mm-dd
 * @returns {{no:string, title:string, svg:string}[]} six sheets
 */
export function drawingSet(cond, look, est, date) {
  const dm = roomDims(est.ping, cond);
  const meta = { project: `${cond.space}・${look.name}`, date, age: cond.age, ping: est.ping, floorType: look.floorType ?? 'wood',
    floorName: look.floorType === 'concrete' ? '礦物塗料地坪' : '超耐磨木地板', cabinet: look.cabinetWood ? '木皮板' : '烤漆板' };
  return [
    ['A-01', '平面配置圖', planSheet(meta, dm)],
    ['E-01', '天花板燈具配置圖', lightingSheet(meta, dm)],
    ['E-02', '插座與弱電配置圖', powerSheet(meta, dm)],
    ['A-02', '收納櫃與窗牆立面圖', elevationSheet(meta, dm)],
    ['A-03', '地坪材料計畫圖', floorSheet(meta, dm)],
    ['Q-01', '工程估價明細表', costSheet(meta, est)],
  ].map(([no, title, svg]) => ({ no, title, svg }));
}
