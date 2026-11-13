import { test } from 'node:test';
import assert from 'node:assert/strict';
import { designEstimate, resolvePing } from '../lib/estimate.js';
import { STYLES } from '../lib/taste.js';

const cond = (o = {}) => ({ space: '客廳', ping: '8', age: '新成屋', ...o });

test('gives a range built from line items, never a single number', () => {
  const e = designEstimate(cond(), STYLES.warm);
  assert.ok(e.low < e.high);
  assert.equal(e.low, Math.round(e.items.reduce((a, i) => a + i.low, 0)));
  assert.equal(e.high, Math.round(e.items.reduce((a, i) => a + i.high, 0)));
  for (const i of e.items) assert.ok(i.basis && i.low <= i.high, i.key);
});

test('missing 坪數 falls back to a per-space default and says so', () => {
  assert.equal(resolvePing({ space: '臥室', ping: '' }), 5);
  const e = designEstimate(cond({ ping: '' }), STYLES.warm);
  assert.equal(e.ping, 8);
  assert.equal(e.assumedPing, true);
  assert.equal(designEstimate(cond(), STYLES.warm).assumedPing, false);
});

test('the design drives the cost: materials and edits change the items', () => {
  const warm = designEstimate(cond(), STYLES.warm), indus = designEstimate(cond(), STYLES.indus);
  const item = (e, k) => e.items.find((i) => i.key === k);
  assert.ok(item(indus, 'floor').high > item(warm, 'floor').high, 'concrete floor costs more than laminate');
  assert.ok(item(indus, 'furniture').low > item(warm, 'furniture').low, 'leather costs more than linen');
  const noRug = designEstimate(cond(), { ...STYLES.warm, rug: null });
  assert.ok(item(noRug, 'furniture').high < item(warm, 'furniture').high);
});

test('older homes add a base-works item; bigger rooms cost more', () => {
  const fresh = designEstimate(cond(), STYLES.warm), old = designEstimate(cond({ age: '老屋' }), STYLES.warm);
  assert.equal(fresh.items.some((i) => i.key === 'base'), false);
  assert.ok(old.items.some((i) => i.key === 'base'));
  assert.ok(old.low > fresh.high);
  assert.ok(designEstimate(cond({ ping: '15' }), STYLES.warm).low > fresh.low);
  assert.throws(() => designEstimate(cond({ age: '？' }), STYLES.warm));
});

test('臥室的工項跟客廳不同；家具可以不計', async () => {
  const { designEstimate } = await import('../lib/estimate.js');
  const { STYLES } = await import('../lib/taste.js');
  const bed = designEstimate({ space: '臥室', ping: '5', age: '新成屋' }, STYLES.warm), living = designEstimate({ space: '客廳', ping: '5', age: '新成屋' }, STYLES.warm);
  assert.equal(bed.items.find((i) => i.key === 'cabinet').name, '衣櫃與斗櫃');
  assert.match(bed.items.find((i) => i.key === 'furniture').basis, /床架、床墊、床頭櫃/);
  assert.match(bed.items.find((i) => i.key === 'curtain').basis, /遮光簾/);
  assert.notEqual(bed.high, living.high);
  const bare = designEstimate({ space: '臥室', ping: '5', age: '新成屋', noFurniture: true }, STYLES.warm);
  assert.equal(bare.items.some((i) => i.key === 'furniture'), false);
  assert.ok(bare.high < bed.high);
});

test('餐廳、書房、廚房、衛浴各有自己的工項', async () => {
  const { designEstimate } = await import('../lib/estimate.js');
  const { STYLES } = await import('../lib/taste.js');
  const names = (space) => designEstimate({ space, ping: '3', age: '新成屋' }, STYLES.warm).items.map((i) => i.name);
  assert.ok(names('廚房').includes('廚具') && names('廚房').includes('給排水與瓦斯') && !names('廚房').includes('家具軟裝') && !names('廚房').includes('窗簾'));
  assert.ok(names('衛浴').includes('衛浴設備') && names('衛浴').includes('防水與給排水') && names('衛浴').includes('浴櫃與鏡櫃') && !names('衛浴').includes('家具軟裝'));
  assert.ok(names('餐廳').includes('餐櫃與備餐櫃') && names('餐廳').includes('家具軟裝'));
  assert.ok(names('書房').includes('書櫃與低櫃'));
  const kitchen = designEstimate({ space: '廚房', ping: '3', age: '新成屋' }, STYLES.warm), noRug = designEstimate({ space: '廚房', ping: '3', age: '新成屋' }, { ...STYLES.warm, rug: null });
  assert.equal(kitchen.high, noRug.high, 'a kitchen has no rug to remove');
  assert.match(kitchen.items.find((i) => i.key === 'floor').basis, /磁磚/);
});
