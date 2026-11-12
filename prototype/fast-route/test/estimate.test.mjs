import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimate, budgetFit } from '../lib/estimate.js';

test('粗略報價：坪數 × 屋況單價區間', () => {
  assert.deepEqual(estimate({ ping: '8', age: '中古屋' }), { low: 40, high: 72, ping: 8, unitLow: 5, unitHigh: 9 });
});

test('粗略報價：沒有坪數就不估，回傳 null', () => {
  assert.equal(estimate({ ping: '', age: '新成屋' }), null);
  assert.equal(estimate({ ping: '0', age: '新成屋' }), null);
});

test('粗略報價：未知屋況直接報錯，不用預設值掩蓋', () => {
  assert.throws(() => estimate({ ping: 8, age: '透天' }));
});

test('預算比對：區間全在、部分在、超出、未提供', () => {
  const r = { low: 40, high: 72 };
  assert.equal(budgetFit(r, '80'), 'within');
  assert.equal(budgetFit(r, '50'), 'partly');
  assert.equal(budgetFit(r, '30'), 'over');
  assert.equal(budgetFit(r, ''), 'none');
  assert.equal(budgetFit(null, '50'), 'none');
});
