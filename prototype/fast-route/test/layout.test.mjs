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
  const huge = roomSize({ len: '20', wid: '1', height: '9' }, 8);
  assert.deepEqual([huge.w, huge.d, huge.h, huge.clamped], [LIMITS.w[1], LIMITS.d[0], LIMITS.h[1], true]);
});

test('furniture stays inside the walls at every size the 3D allows', () => {
  for (const w of [LIMITS.w[0], 5, LIMITS.w[1]]) for (const d of [LIMITS.d[0], 4.2, LIMITS.d[1]]) for (const h of LIMITS.h) {
    const { layout, window, cabinet } = roomLayout({ w, d, h }), at = `${w}x${d}x${h}`;
    for (const [name, o] of Object.entries(layout)) {
      const hx = (o.sx ?? 0.3) / 2, hz = (o.sz ?? 0.3) / 2;
      assert.ok(o.x - hx >= -w / 2 - 0.01 && o.x + hx <= w / 2 + 0.01, `${name} x at ${at}`);
      assert.ok(o.z - hz >= -d / 2 - 0.01 && o.z + hz <= d / 2 + 0.01, `${name} z at ${at}`);
    }
    assert.ok(window.x0 >= cabinet.x1 + 0.3 && window.x1 - window.x0 >= 0.9 && window.x1 < w / 2, `window at ${at}`);
    assert.ok(window.y1 < h && window.y1 > window.y0 + 1, `window height at ${at}`);
    assert.ok(layout.chair.x - 0.43 > layout.table.x + 0.31, `chair clears the table at ${at}`);
  }
});
