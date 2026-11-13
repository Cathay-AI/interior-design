import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROOM, WINDOW, CABINET, LAYOUT, LIMITS, roomSize, roomLayout } from '../lib/layout.js';

const near = (a, b) => Math.abs(a - b) < 0.011;

test('the default room size reproduces the default layout', () => {
  const l = roomLayout(ROOM);
  for (const k of ['x0', 'x1', 'y0', 'y1']) assert.ok(near(l.window[k], WINDOW[k]), 'window ' + k);
  for (const k of ['x0', 'x1', 'depth']) assert.ok(near(l.cabinet[k], CABINET[k]), 'cabinet ' + k);
  for (const [name, o] of Object.entries(LAYOUT)) for (const [k, v] of Object.entries(o)) assert.ok(near(l.layout[name][k], v), `${name}.${k}: ${l.layout[name][k]} vs ${v}`);
});

test('room size: real dimensions win, 坪數 scales the default shape, limits are reported', () => {
  assert.deepEqual(roomSize({ len: '6.2', wid: '4.3', height: '3' }, 8), { w: 6.2, d: 4.3, h: 3, clamped: false });
  const byPing = roomSize({}, 8);
  assert.ok(Math.abs(byPing.w * byPing.d - 8 * 3.3058) < 0.1 && near(byPing.w / byPing.d, ROOM.w / ROOM.d) && byPing.h === ROOM.h);
  assert.ok(roomSize({}, 15).w > byPing.w);
  const odd = roomSize({ len: '200', wid: '1', height: '30' }, 8);
  assert.deepEqual([odd.w, odd.d, odd.h, odd.clamped], [LIMITS.w[1], LIMITS.d[0], LIMITS.h[1], true]);
  assert.equal(roomSize({ len: '22', wid: '15', height: '4.5' }, 100).clamped, false, 'a 100 坪 home is drawn as it is');
  const hundred = roomSize({}, 100);
  assert.ok(!hundred.clamped && Math.abs(hundred.w * hundred.d - 100 * 3.3058) < 1, '100 坪 by 坪數 alone is not clamped either');
});

test('furniture stays inside the walls from a tiny room to a hall; what does not fit is left out', () => {
  const steps = (lo, hi) => [lo, 2.4, 2.8, 3.2, 3.6, 4.2, 5, 8, 18, hi];
  for (const w of steps(...LIMITS.w)) for (const d of steps(...LIMITS.d)) for (const h of LIMITS.h) {
    const { layout, window, cabinet } = roomLayout({ w, d, h }), at = `${w}x${d}x${h}`;
    for (const [name, o] of Object.entries(layout)) {
      if (!o) continue;
      const hx = (o.sx ?? 0.3) / 2, hz = (o.sz ?? 0.3) / 2;
      assert.ok(o.x - hx >= -w / 2 - 0.01 && o.x + hx <= w / 2 + 0.01, `${name} x at ${at}`);
      assert.ok(o.z - hz >= -d / 2 - 0.01 && o.z + hz <= d / 2 + 0.01, `${name} z at ${at}`);
    }
    assert.ok(layout.sofa && layout.rug && layout.pendant, `always a sofa at ${at}`);
    assert.ok(layout.sofa.sz >= 1.5, `sofa is at least a two-seater at ${at}`);
    assert.ok(window.x0 >= cabinet.x1 + 0.29 && window.x1 - window.x0 >= 0.5 && window.x1 < w / 2, `window at ${at}`);
    assert.ok(window.y1 < h && window.y1 > window.y0 + 1, `window height at ${at}`);
    if (layout.chair && layout.plant) assert.ok(Math.hypot(layout.plant.x - layout.chair.x, layout.plant.z - layout.chair.z) >= 1.2, `plant clears the armchair at ${at}`);
    if (layout.chair && layout.table) assert.ok(layout.chair.x - 0.43 > layout.table.x + 0.3, `chair clears the table at ${at}`);
  }
  const tiny = roomLayout({ w: 2, d: 2, h: 2.2 }).layout;
  assert.deepEqual([tiny.table, tiny.chair, tiny.sideboard, tiny.plant, tiny.sidetable], [null, null, null, null, null]);
});

test('臥室：一定有床，家具都在牆內、不互相重疊；放不下的不放', () => {
  const steps = [2, 2.4, 2.8, 3.2, 3.6, 4.2, 5, 8, 18, 60];
  const hit = (a, b) => Math.abs(a.x - b.x) < (a.sx + b.sx) / 2 - 0.01 && Math.abs(a.z - b.z) < (a.sz + b.sz) / 2 - 0.01;
  for (const w of steps) for (const d of steps) {
    const { layout, cabinet } = roomLayout({ w, d, h: 2.8, space: '臥室' }), at = `${w}x${d}`;
    assert.ok(layout.bed && !layout.sofa && !layout.table, `a bed instead of a sofa at ${at}`);
    for (const [name, o] of Object.entries(layout)) {
      if (!o) continue;
      const hx = (o.sx ?? 0.3) / 2, hz = (o.sz ?? 0.3) / 2;
      assert.ok(o.x - hx >= -w / 2 - 0.01 && o.x + hx <= w / 2 + 0.01, `${name} x at ${at}`);
      assert.ok(o.z - hz >= -d / 2 - 0.01 && o.z + hz <= d / 2 + 0.01, `${name} z at ${at}`);
    }
    assert.ok(layout.bed.z - layout.bed.sz / 2 >= -d / 2 + cabinet.depth - 0.01, `bed clears the wardrobe at ${at}`);
    const solid = ['bed', 'nightA', 'nightB', 'chair', 'sideboard'].filter((k) => layout[k]);
    for (const a of solid) for (const b of solid) if (a < b) assert.ok(!hit(layout[a], layout[b]), `${a} and ${b} overlap at ${at}`);
  }
  assert.equal(roomLayout({ w: 2.6, d: 2.6, h: 2.6, space: '臥室' }).layout.bed.sz, 1.05, 'a short room gets a single bed');
  assert.equal(roomLayout({ w: 4.2, d: 3.8, h: 2.7, space: '臥室' }).layout.bed.sz, 1.5);
});

test('餐廳、書房、廚房、衛浴：都有主要家具，全部在牆內，主要的幾件不互相重疊', () => {
  const steps = [2, 2.4, 2.8, 3.4, 4.2, 6, 12];
  const hit = (a, b) => Math.abs(a.x - b.x) < (a.sx + b.sx) / 2 - 0.01 && Math.abs(a.z - b.z) < (a.sz + b.sz) / 2 - 0.01;
  const main = { 餐廳: 'dtable', 書房: 'desk', 廚房: 'counter', 衛浴: 'vanity' };
  for (const [space, type] of Object.entries(main)) for (const w of steps) for (const d of steps) {
    const { layout } = roomLayout({ w, d, h: 2.8, space }), at = `${space} ${w}x${d}`;
    assert.equal(layout.anchor.t, type, at);
    assert.ok(!layout.sofa && !layout.bed && layout.pendant, at);
    for (const f of layout.fixtures) {
      assert.ok(f.x - f.sx / 2 >= -w / 2 - 0.01 && f.x + f.sx / 2 <= w / 2 + 0.01, `${f.t} x at ${at}`);
      assert.ok(f.z - f.sz / 2 >= -d / 2 - 0.01 && f.z + f.sz / 2 <= d / 2 + 0.01, `${f.t} z at ${at}`);
    }
    const solid = layout.fixtures.filter((f) => f.t !== 'upper' && f.t !== 'dchair');
    for (const a of solid) for (const b of solid) if (a !== b) assert.ok(!hit(a, b), `${a.t} and ${b.t} overlap at ${at}`);
    if (space === '廚房' || space === '衛浴') assert.ok(layout.noCabinet && layout.rug === null, `${at}: no storage wall, no rug`);
  }
  assert.equal(roomLayout({ w: 3.4, d: 3, h: 2.8, space: '餐廳' }).layout.fixtures.filter((f) => f.t === 'dchair').length, 4);
  assert.ok(roomLayout({ w: 2.4, d: 2, h: 2.6, space: '衛浴' }).layout.fixtures.some((f) => f.t === 'shower'));
});
