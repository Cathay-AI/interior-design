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
/** Sizes the 3D room accepts (metres). Wide on purpose: small rooms drop furniture that does not fit, big rooms just gain floor. */
export const LIMITS = { w: [2.4, 20], d: [2.4, 20], h: [2.2, 6] };

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
 */
export function roomLayout({ w, d, h }) {
  const L = -w / 2, R = w / 2, B = -d / 2, F = d / 2;
  const cabinet = { x0: L, x1: L + Math.min(1.75, w * 0.36), depth: 0.42 };
  const x1 = R - 0.45, x0 = Math.max(cabinet.x1 + 0.3, x1 - Math.min(6, 2.4 * Math.max(1, w / ROOM.w)));
  const window = { x0, x1, y0: 0.45, y1: Math.min(2.55 + (h - ROOM.h) * 0.8, h - 0.25) };
  const sofaLen = Math.min(2.3, d - 0.9);                 // two-seater when the room is short
  const sz = d >= 3.4 ? 0.06 * d : 0.15;                  // seating group sits a little forward of centre
  const sofa = { x: L + 0.48, z: Math.min(sz, F - sofaLen / 2 - 0.1), sx: 0.96, sz: sofaLen };
  const table = w >= 2.8 ? { x: L + 1.65, z: sofa.z, sx: 0.62, sz: Math.min(1.05, sofaLen - 0.4) } : null;
  const chairX = Math.min(L + 3.35, R - 0.75);
  return {
    room: { w, d, h }, window, cabinet,
    layout: {
      sofa, table, pendant: { x: Math.min(L + 1.65, R - 0.5), z: sofa.z },
      rug: { x: L + 0.8 + Math.min(2.0, w - 0.9) / 2, z: sofa.z, sx: Math.min(2.0, w - 0.9), sz: Math.min(2.6, d - 0.5) },
      chair: w >= 3.6 && d >= 3 ? { x: chairX, z: Math.max(sofa.z - 0.8, B + 0.95), sx: 0.85, sz: 0.85 } : null,
      sideboard: x1 - x0 >= 1.8 ? { x: (x0 + x1) / 2, z: B + 0.2, sx: 1.6, sz: 0.4 } : null,
      lamp: d >= 3.2 ? { x: L + 0.35, z: Math.min(sofa.z + 1.5, F - 0.3) } : null,
      sidetable: d >= 3.6 ? { x: L + 0.3, z: Math.max(sofa.z - 1.5, B + 0.8) } : null,
      plant: w >= 3.2 ? { x: R - 0.4, z: B + 0.55 } : null,
    },
  };
}
