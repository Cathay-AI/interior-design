import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ruleFindings, countByState, STATES } from '../lib/rules.js';

const light = { wall: '#f3ece0' };
const dark = { wall: '#45403a' };

test('每一項都只會是已定義的狀態之一', () => {
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

test('老屋多一項既有管線；新成屋沒有', () => {
  const old = ruleFindings({ space: '客廳', ping: '8', age: '老屋' }, light);
  const fresh = ruleFindings({ space: '客廳', ping: '8', age: '新成屋' }, light);
  assert.equal(old.find((x) => x.title.startsWith('既有管線')).state, 'missing');
  assert.equal(fresh.find((x) => x.title.startsWith('既有管線')), undefined);
});

test('法規提醒：依樓層與是否動隔間，且都附依據', () => {
  const base = { space: '客廳', ping: '8', age: '新成屋' };
  const get = (c, title, docs) => ruleFindings({ ...base, ...c }, { ...light, rug: '#fff', cabinetWood: true }, docs).find((f) => f.title === title);
  // 沒給樓層：一律是待補資料，不猜
  for (const title of ['室內裝修許可', '防焰窗簾與地毯', '撒水頭與火警設備']) assert.equal(get({}, title).state, 'missing', title);
  // 六層以上要申請許可
  assert.equal(get({ floors: '12' }, '室內裝修許可').state, 'action');
  assert.equal(get({ floors: '6', partition: 'no' }, '室內裝修許可').state, 'action');
  // 五層以下看有沒有動隔間
  assert.equal(get({ floors: '5', partition: 'yes' }, '室內裝修許可').state, 'action');
  assert.equal(get({ floors: '5', partition: 'no' }, '室內裝修許可').state, 'na');
  assert.equal(get({ floors: '5' }, '室內裝修許可').state, 'missing');
  // 十一層以上：防焰物品與撒水頭
  assert.equal(get({ floors: '11' }, '防焰窗簾與地毯').state, 'action');
  assert.match(get({ floors: '11' }, '防焰窗簾與地毯').detail, /窗簾與地毯/);
  assert.match(get({ floors: '15' }, '撒水頭與火警設備').detail, /45 公分.*30 公分/);
  assert.equal(get({ floors: '10' }, '防焰窗簾與地毯').state, 'na');
  assert.equal(get({ floors: '10' }, '住宅用火災警報器').state, 'review');
  assert.equal(get({ floors: '11' }, '住宅用火災警報器'), undefined);
  // 每一項法規提醒都有依據，而且沒有任何一項被標成「已檢查」
  const all = ruleFindings({ ...base, floors: '12', partition: 'yes' }, light).filter((f) => f.source);
  assert.ok(all.length >= 5);
  for (const f of all) assert.ok(f.source.length > 3 && f.state !== 'ok', f.title);
});

test('統計各狀態數量', () => {
  assert.deepEqual(countByState([{ state: 'ok' }, { state: 'ok' }, { state: 'na' }]), { ok: 2, na: 1 });
});

test('附了圖面：缺資料變成待判讀，但不會變成已檢查', () => {
  const cond = { space: '客廳', ping: '8', age: '老屋' };
  const design = (docs) => ruleFindings(cond, light, docs).filter((f) => !f.source);   // 設計與現況類（法規提醒另外測）
  const none = design(), both = design({ plan: 1, mep: 2 });
  assert.equal(none.filter((f) => f.state === 'review').length, 0);
  assert.equal(both.find((f) => f.title === '插座與電源').state, 'review');
  assert.equal(both.find((f) => f.title.startsWith('既有管線')).state, 'review');
  assert.equal(both.filter((f) => f.state === 'ok').length, none.filter((f) => f.state === 'ok').length, 'uploading never marks anything as checked');
  assert.equal(ruleFindings(cond, light, { plan: 1 }).find((f) => f.title === '插座與電源').state, 'missing');
});
