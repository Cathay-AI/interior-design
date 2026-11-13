// Room and furniture dimensions (metres, origin at the floor centre; x = left→right, z = back→front).
// Pure data: the 3D scene and the construction drawings are both drawn from it.

export const ROOM = { w: 5.0, d: 4.2, h: 2.8 };
/** Window opening in the back wall (x range, sill and head height, metres). */
export const WINDOW = { x0: -0.35, x1: 2.05, y0: 0.45, y1: 2.55 };
/** Built-in storage on the back wall. */
export const CABINET = { x0: -2.5, x1: -0.75, depth: 0.42 };
/** Furniture footprint used by the drawings too (centre x/z, size along x/z). */
export const LAYOUT = {
  sofa: { x: -2.5 + 0.48, z: 0.25, sx: 0.96, sz: 2.3 },
  table: { x: -0.85, z: 0.25, sx: 0.62, sz: 1.05 },
  chair: { x: 0.85, z: -0.55, sx: 0.85, sz: 0.85 },
  rug: { x: -0.7, z: 0.25, sx: 2.0, sz: 2.6 },
  sideboard: { x: 0.85, z: -2.1 + 0.2, sx: 1.6, sz: 0.4 },
  lamp: { x: -2.15, z: 1.75 },
  sidetable: { x: -2.2, z: -1.25 },
  plant: { x: 2.1, z: -1.55 },
  pendant: { x: -0.85, z: 0.25 },
};

/* ---------- a room of any size ---------- */
const PING_M2 = 3.3058;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pos = (v) => { const n = Number.parseFloat(v); return Number.isFinite(n) && n > 0 ? n : null; };
/**
 * Sizes the 3D room accepts (metres). There is no practical upper limit: a 100 坪 home is drawn as 100 坪.
 * The lower bound is physical: below it not even a two-seat sofa fits.
 */
export const LIMITS = { w: [2, 60], d: [2, 60], h: [2, 12] };

/**
 * Room size for the 3D view. Uses the homeowner's length / width / height when given;
 * otherwise keeps the default proportions and scales them to the 坪數.
 * @param {{len?:string|number, wid?:string|number, height?:string|number}} cond
 * @param {number} ping
 * @returns {{w:number, d:number, h:number, clamped:boolean}} w = 長 (left-right), d = 寬 (back-front)
 */
export function roomSize(cond, ping) {
  const k = Math.sqrt((ping * PING_M2) / (ROOM.w * ROOM.d));
  const want = { w: pos(cond.len) ?? ROOM.w * k, d: pos(cond.wid) ?? ROOM.d * k, h: pos(cond.height) ?? ROOM.h };
  const out = { w: clamp(want.w, ...LIMITS.w), d: clamp(want.d, ...LIMITS.d), h: clamp(want.h, ...LIMITS.h) };
  const r2 = (v) => Math.round(v * 100) / 100;
  return { w: r2(out.w), d: r2(out.d), h: r2(out.h), clamped: out.w !== want.w || out.d !== want.d || out.h !== want.h };
}

/**
 * Where everything goes in a room of this size. Furniture keeps its own size and stays anchored to the
 * walls it belongs to, so a bigger room gains floor space instead of bigger furniture; in a small room
 * the sofa shortens and pieces that would not fit are left out (their entry is null).
 * roomLayout(ROOM) reproduces the default constants above.
 * space '臥室' swaps the seating group for a bed, bedside tables and a chair by the window; entries that do not apply are null.
 * 餐廳／書房／廚房／衛浴 put their own pieces in `fixtures` (axis-aligned boxes: t = dtable, dchair, desk, counter, upper, fridge, vanity, toilet, shower),
 * name the main piece as `anchor`, and may set noCabinet / noCurtain; rug is null where a rug makes no sense.
 */
export function roomLayout({ w, d, h, space = '客廳' }) {
  const L = -w / 2, R = w / 2, B = -d / 2, F = d / 2;
  const cabinet = { x0: L, x1: L + Math.min(1.75, w * 0.36), depth: 0.42 };
  const x1 = R - 0.45, x0 = Math.max(cabinet.x1 + 0.3, x1 - Math.min(8, 2.4 * Math.max(1, w / ROOM.w)));
  const window = { x0, x1, y0: 0.45, y1: Math.min(2.55 + (h - ROOM.h) * 0.8, h - 0.25) };
  const sofaLen = Math.max(1.5, Math.min(2.3, d - 0.5));  // two-seater when the room is short
  const sz = d >= 3.4 ? 0.06 * d : 0.15;                  // seating group sits a little forward of centre
  const sofa = { x: L + 0.48, z: Math.min(sz, F - sofaLen / 2 - 0.1), sx: 0.96, sz: sofaLen };
  const table = w >= 2.8 ? { x: L + 1.65, z: sofa.z, sx: 0.62, sz: Math.min(1.05, sofaLen - 0.4) } : null;
  const chairX = Math.min(L + 3.35, R - 0.75);
  const chair = w >= 3.6 && d >= 3 ? { x: chairX, z: Math.max(sofa.z - 0.8, B + 0.95), sx: 0.85, sz: 0.85 } : null;
  const plantAt = (chair) => (w >= 3.2 && (!chair || Math.hypot(R - 0.4 - chair.x, B + 0.55 - chair.z) >= 1.25) ? { x: R - 0.4, z: B + 0.55 } : null);
  const sideboard = x1 - x0 >= 1.8 ? { x: (x0 + x1) / 2, z: B + 0.2, sx: 1.6, sz: 0.4 } : null;
  const empty = { sofa: null, table: null, lamp: null, sidetable: null, bed: null, nightA: null, nightB: null, chair: null };
  const box = (t, x, z, sx, sz, o = {}) => ({ t, x, z, sx, sz, ...o });
  if (space === '餐廳') {
    // 餐桌在中間，長邊各兩張椅子；餐櫃用後牆的高櫃，窗下是備餐的低櫃
    const big = w >= 2.8 && d >= 2.6, tw = big ? 1.5 : 1.0, td = big ? 0.85 : 0.7, tz = Math.min(0.06 * d, F - td / 2 - 0.75), tx = Math.max(L + tw / 2 + 0.5, Math.min(0, R - tw / 2 - 0.5));
    const anchor = box('dtable', tx, tz, tw, td);
    const seats = (big ? [-0.38, 0.38] : [0]).flatMap((dx) => [box('dchair', tx + dx, tz - td / 2 - 0.2, 0.44, 0.46, { ry: 0 }), box('dchair', tx + dx, tz + td / 2 + 0.2, 0.44, 0.46, { ry: Math.PI })])
      .filter((c) => c.z - 0.23 >= B + cabinet.depth + 0.05 && c.z + 0.23 <= F - 0.02);
    return { room: { w, d, h }, window, cabinet, layout: { ...empty, sideboard, plant: plantAt(null), pendant: { x: tx, z: tz }, anchor, fixtures: [anchor, ...seats],
      rug: { x: tx, z: tz, sx: Math.min(tw + 0.9, w - 0.3), sz: Math.min(td + 1.5, d - 0.5) } } };
  }
  if (space === '書房') {
    // 書桌靠左牆、人面向牆；後牆的高櫃是書櫃；房間夠大再放一張閱讀椅
    const dl = Math.max(1.0, Math.min(1.5, d - 1.2)), dz = Math.min(Math.max(B + cabinet.depth + 0.4 + dl / 2, 0.08 * d), F - dl / 2 - 0.1);
    const anchor = box('desk', L + 0.34, dz, 0.64, dl), seat = box('dchair', L + 0.95, dz, 0.46, 0.44, { ry: Math.PI / 2 });
    const reading = w >= 3.8 && d >= 3.2 ? { x: Math.min(L + 3.2, R - 0.75), z: B + 1.15, sx: 0.85, sz: 0.85 } : null;
    return { room: { w, d, h }, window, cabinet, layout: { ...empty, chair: reading, sideboard, plant: plantAt(reading), pendant: { x: Math.min(0, R - 0.6), z: dz }, anchor, fixtures: [anchor, seat],
      rug: { x: L + 0.7 + Math.min(1.8, w - 0.9) / 2, z: dz, sx: Math.min(1.8, w - 0.9), sz: Math.min(dl + 0.6, d - 0.5) } } };
  }
  if (space === '廚房') {
    // 一字型：流理台沿左牆，上面是吊櫃，前端放冰箱。不放地毯和窗簾
    const fridge = d >= 2.6, cl = Math.max(1.2, d - 0.1 - (fridge ? 0.78 : 0)), cz = B + 0.05 + cl / 2;
    const anchor = box('counter', L + 0.31, cz, 0.62, cl);
    return { room: { w, d, h }, window, cabinet, layout: { ...empty, sideboard: null, plant: null, rug: null, pendant: { x: Math.min(L + 1.5, R - 0.5), z: 0 }, anchor, noCabinet: true, noCurtain: true,
      fixtures: [anchor, box('upper', L + 0.18, cz, 0.36, cl), ...(fridge ? [box('fridge', L + 0.36, F - 0.41, 0.72, 0.7)] : [])] } };
  }
  if (space === '衛浴') {
    // 乾濕分離：洗手台與馬桶沿左牆，淋浴間在右後角。不放地毯和窗簾
    const vz = B + 0.25 + 0.4, anchor = box('vanity', L + 0.26, vz, 0.52, 0.8), toilet = box('toilet', L + 0.36, Math.min(vz + 0.4 + 0.2 + 0.2, F - 0.25), 0.7, 0.4);
    const ss = Math.min(0.95, w - 0.9, d - 0.3), shower = ss >= 0.75 ? box('shower', R - ss / 2 - 0.02, B + ss / 2 + 0.02, ss, ss) : null;
    return { room: { w, d, h }, window, cabinet, layout: { ...empty, sideboard: null, plant: null, rug: null, pendant: { x: 0, z: 0.1 * d }, anchor, noCabinet: true, noCurtain: true,
      fixtures: [anchor, toilet, ...(shower ? [shower] : [])] } };
  }
  if (space === '臥室') {
    // 床頭靠左牆（和客廳的沙發同一面），衣櫃在後牆左側，窗下是斗櫃。房間短就改單人床；床頭櫃放得下才放。
    const bw = d >= 3 ? 1.5 : 1.05, bl = Math.min(2.0, w - 0.02);
    const bz = Math.min(Math.max(B + cabinet.depth + 0.5 + bw / 2, 0.06 * d), F - bw / 2 - 0.05);
    const bed = { x: L + bl / 2, z: bz, sx: bl, sz: bw };
    const night = (z) => (z - 0.21 >= B + cabinet.depth + 0.03 && z + 0.21 <= F - 0.02 && w >= 2.4 ? { x: L + 0.24, z, sx: 0.42, sz: 0.42 } : null);
    const seat = w >= 4 && d >= 3.4 ? { x: Math.min(L + 3.3, R - 0.75), z: B + 1.1, sx: 0.85, sz: 0.85 } : null;
    return {
      room: { w, d, h }, window, cabinet,
      layout: {
        sofa: null, table: null, lamp: null, sidetable: null,
        bed, nightA: night(bz - bw / 2 - 0.27), nightB: night(bz + bw / 2 + 0.27),
        pendant: { x: bed.x, z: bz },
        rug: { x: L + 0.9 + Math.min(2.0, w - 0.95) / 2, z: Math.min(bz, F - Math.min(bw + 0.9, d - 0.5) / 2 - 0.05), sx: Math.min(2.0, w - 0.95), sz: Math.min(bw + 0.9, d - 0.5) },
        chair: seat, sideboard, plant: plantAt(seat),
      },
    };
  }
  return {
    room: { w, d, h }, window, cabinet,
    layout: {
      bed: null, nightA: null, nightB: null,
      sofa, table, pendant: { x: Math.min(L + 1.65, R - 0.5), z: sofa.z },
      rug: { x: L + 0.8 + Math.min(2.0, w - 0.9) / 2, z: sofa.z, sx: Math.min(2.0, w - 0.9), sz: Math.min(2.6, d - 0.5) },
      chair,
      sideboard,
      lamp: d >= 3.2 ? { x: L + 0.35, z: Math.min(sofa.z + 1.5, F - 0.3) } : null,
      sidetable: d >= 3.6 ? { x: L + 0.3, z: Math.max(sofa.z - 1.5, B + 0.8) } : null,
      plant: plantAt(chair),   // 盆栽放窗邊角落；會和單椅擠在一起就不放（另一個角落是門）
    },
  };
}
