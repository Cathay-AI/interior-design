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
