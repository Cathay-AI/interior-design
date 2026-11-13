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
