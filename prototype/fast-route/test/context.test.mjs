import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contextScore, pingFromDims, tighten, aboutThisHome, missingForHome, fieldError } from '../lib/context.js';
import { designEstimate } from '../lib/estimate.js';
import { STYLES } from '../lib/taste.js';

test('長寬換算坪數', () => {
  assert.equal(pingFromDims('5.6', '4.7'), 8);
  assert.equal(pingFromDims('5.6', ''), null);
  assert.equal(pingFromDims('abc', '4'), null);
});

test('什麼都沒給是 0；給得越多越高；全給是 1；上傳的圖不計分', () => {
  assert.equal(contextScore({}).score, 0);
  const some = contextScore({ ping: '8', ageSet: true }).score;
  const more = contextScore({ len: '5.6', wid: '4.7', height: '2.8', ageSet: true }).score;
  assert.ok(0 < some && some < more && more < 1);
  const all = { len: '5.6', wid: '4.7', height: '2.8', ageSet: true, floors: '12', partition: 'no', unitFloor: '8', sprinkler: 'no' };
  assert.equal(contextScore({ ...all, sprinkler: '' }).score, 0.9, '撒水頭還沒回答');
  assert.equal(contextScore({ floors: '5', partition: 'no', sprinkler: 'no' }).score, 0.3, '總樓層不到 11 層就不用再問所在樓層');
  assert.equal(contextScore(all).score, 1);
  assert.ok(contextScore({ floors: '12' }).score === 0 && contextScore({ floors: '12', partition: 'yes' }).score > 0, '樓層和隔間都講了才算');
  assert.ok(contextScore({ len: '5', wid: '4' }).score > contextScore({ ping: '6' }).score, '實際長寬比只給坪數更有把握');
  assert.equal(contextScore({ ping: '8' }, { plan: 3, mep: 2 }).score, contextScore({ ping: '8' }).score, '圖還不會被判讀，附了也不會讓估價變準');
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

test('沒有手動填的長寬，就只是範例；上傳平面圖不算，並說得出還缺什麼', () => {
  assert.equal(aboutThisHome({}), false);
  assert.equal(aboutThisHome({ ping: '8', height: '2.8' }), false);
  assert.equal(aboutThisHome({ len: '5.6', wid: '' }), false);
  assert.equal(aboutThisHome({ len: '5.6', wid: '4.7' }), true);
  assert.deepEqual(missingForHome({}), ['長', '寬']);
  assert.deepEqual(missingForHome({ len: '5.6' }), ['寬']);
  assert.deepEqual(missingForHome({ len: '5.6', wid: '4.7' }), []);
});

test('欄位防呆：空白可以，離譜的值說得出原因', () => {
  for (const [k, v] of [['len', ''], ['len', '4.2'], ['ping', '5'], ['height', '2.7'], ['floors', '12'], ['len', '60']]) assert.equal(fieldError(k, v), '', `${k}=${v}`);
  assert.match(fieldError('len', '500'), /最多 60 公尺，請確認單位是公尺/);
  assert.match(fieldError('len', '-3'), /要大於 0/);
  assert.match(fieldError('wid', '0'), /要大於 0/);
  assert.match(fieldError('len', '1.2'), /至少 2 公尺/);
  assert.match(fieldError('height', '270'), /最多 12 公尺/);
  assert.match(fieldError('floors', '3.5'), /整數/);
  assert.match(fieldError('ping', 'abc'), /請填數字/);
});
