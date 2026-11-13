import { test } from 'node:test';
import assert from 'node:assert/strict';
import { templateRooms, kindOf, homeTitle, planSVG, homeEstimate, roomPing } from '../lib/home.js';
import { designEstimate } from '../lib/estimate.js';
import { STYLES } from '../lib/taste.js';

test('房間種類：每一種空間都有配置；認不出名字的用書房的配置', () => {
  assert.deepEqual(['客廳', '主臥', '次臥 2', '小孩房', '餐廳', '廚房', '主衛', '客用廁所', '書房', '儲藏室'].map(kindOf), ['客廳', '臥室', '臥室', '臥室', '餐廳', '廚房', '衛浴', '衛浴', '書房', '書房']);
});

test('三房兩廳範本：標題、示意平面圖', () => {
  const rooms = templateRooms();
  assert.equal(rooms.length, 8);
  assert.match(homeTitle(rooms), /^三房兩廳・8 個空間・室內約 \d+ 坪$/);
  rooms[4].on = false;
  assert.match(homeTitle(rooms), /^兩房兩廳・7 個空間/);
  const svg = planSVG(rooms, 'r1');
  assert.equal((svg.match(/data-room=/g) ?? []).length, 7, 'only the rooms being done are drawn');
  assert.ok(svg.includes('data-room="r1"') && !svg.includes('data-room="r5"') && svg.includes('不是實際格局'));
  assert.equal((planSVG([], null).match(/data-room=/g) ?? []).length, 0);
});

test('整戶估價：勾選的房間加總；做不出設計的不算進合計並回報幾間', () => {
  const rooms = templateRooms();
  const one = (r) => designEstimate({ space: kindOf(r.name), ping: String(roomPing(r)), age: '新成屋' }, STYLES.warm);
  const all = homeEstimate(rooms, one);
  assert.equal(all.rows.length, 8);
  assert.equal(all.open, 0, 'every room has a design and a number');
  for (const x of all.rows) assert.ok(x.est.low > 0 && x.est.high > x.est.low, x.name);
  const sum = all.rows.filter((x) => x.est).reduce((a, x) => a + x.est.high, 0);
  assert.equal(all.high, Math.round(sum));
  rooms[3].on = false;                       // 主臥先不做
  const less = homeEstimate(rooms, one);
  assert.ok(less.high < all.high && less.rows.length === 7);
  assert.ok(all.items.find((i) => i.name === '地坪').high > one(rooms[0]).items.find((i) => i.name === '地坪').high, '依工項是各房間加總');
});
