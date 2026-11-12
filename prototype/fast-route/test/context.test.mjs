import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contextScore, pingFromDims, tighten } from '../lib/context.js';
import { designEstimate } from '../lib/estimate.js';
import { STYLES } from '../lib/taste.js';

test('長寬換算坪數', () => {
  assert.equal(pingFromDims('5.6', '4.7'), 8);
  assert.equal(pingFromDims('5.6', ''), null);
  assert.equal(pingFromDims('abc', '4'), null);
});

test('什麼都沒給是 0；給得越多越高；全給是 1', () => {
  assert.equal(contextScore({}).score, 0);
  const some = contextScore({ ping: '8', ageSet: true }).score;
  const more = contextScore({ len: '5.6', wid: '4.7', height: '2.8', ageSet: true }, { plan: 1 }).score;
  assert.ok(0 < some && some < more && more < 1);
  assert.equal(contextScore({ len: '5.6', wid: '4.7', height: '2.8', ageSet: true }, { plan: 1, mep: 1 }).score, 1);
  assert.ok(contextScore({ len: '5', wid: '4' }).score > contextScore({ ping: '6' }).score, '實際長寬比只給坪數更有把握');
});

test('掌握度越高估價區間越窄，中點不動，0 分時不變', () => {
  const est = designEstimate({ space: '客廳', ping: '8', age: '中古屋' }, STYLES.warm);
  assert.deepEqual([tighten(est, 0).low, tighten(est, 0).high], [est.low, est.high]);
  const half = tighten(est, 0.5), full = tighten(est, 1);
  assert.ok(full.high - full.low < half.high - half.low && half.high - half.low < est.high - est.low);
  assert.ok(Math.abs((full.low + full.high) - (est.low + est.high)) <= 2, 'midpoint stays');
  assert.equal(full.narrowed, 0.5);
  for (const i of full.items) assert.ok(i.low <= i.high);
});
