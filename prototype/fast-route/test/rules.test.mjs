import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ruleFindings, countByState, STATES } from '../lib/rules.js';

const light = { wall: '#f3ece0' };
const dark = { wall: '#45403a' };

test('每一項都只會是四種狀態之一', () => {
  for (const f of ruleFindings({ space: '客廳', ping: '8', age: '新成屋' }, light)) assert.ok(f.state in STATES);
});

test('沒有坪數：動線標待補資料，不當成通過', () => {
  const f = ruleFindings({ space: '客廳', ping: '', age: '新成屋' }, light).find((x) => x.title === '動線');
  assert.equal(f.state, 'missing');
});

test('小坪數配深色牆：標成衝突', () => {
  const states = ruleFindings({ space: '臥室', ping: '5', age: '新成屋' }, dark).map((x) => x.state);
  assert.ok(states.includes('conflict'));
});

test('老屋：消防與機電待補資料；新成屋：不適用', () => {
  const old = ruleFindings({ space: '客廳', ping: '8', age: '老屋' }, light);
  const fresh = ruleFindings({ space: '客廳', ping: '8', age: '新成屋' }, light);
  assert.equal(old.find((x) => x.title.startsWith('消防')).state, 'missing');
  assert.equal(fresh.find((x) => x.title.startsWith('消防')).state, 'na');
});

test('統計各狀態數量', () => {
  assert.deepEqual(countByState([{ state: 'ok' }, { state: 'ok' }, { state: 'na' }]), { ok: 2, na: 1 });
});
