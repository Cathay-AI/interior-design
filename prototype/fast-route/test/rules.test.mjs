import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ruleFindings, countByState, regSummary, STATES, LAWS, CERTAINTY, CHECKED, lawUrl } from '../lib/rules.js';

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

test('法規提醒：依樓層、所在樓層、撒水頭與是否動隔間，且都附條文', () => {
  const base = { space: '客廳', ping: '8', age: '新成屋' };
  const all = (c, look = {}) => ruleFindings({ ...base, ...c }, { ...light, rug: '#fff', cabinetWood: true, ...look });
  const get = (c, title, look) => all(c, look).find((f) => f.title === title);
  // 沒給樓層：待補資料，並指出回答哪一題
  assert.deepEqual([get({}, '室內裝修許可').state, get({}, '室內裝修許可').ask], ['missing', 'floors']);
  assert.deepEqual([get({}, '防焰窗簾').state, get({}, '撒水頭淨空').ask, get({}, '裝修材料耐燃等級').ask], ['missing', 'sprinkler', 'unitFloor']);
  // 室內裝修許可：六層以上要申請；五層以下看隔間；透天一般不用
  assert.equal(get({ floors: '12' }, '室內裝修許可').state, 'action');
  assert.equal(get({ floors: '6', partition: 'no' }, '室內裝修許可').state, 'action');
  assert.equal(get({ floors: '5', partition: 'yes' }, '室內裝修許可').state, 'action');
  assert.equal(get({ floors: '5', partition: 'no' }, '室內裝修許可').state, 'na');
  assert.equal(get({ floors: '5' }, '室內裝修許可').ask, 'partition');
  assert.equal(get({ housing: 'house' }, '室內裝修許可').state, 'na');
  // 防焰：看總樓層；只列設計裡有的東西
  assert.equal(get({ floors: '11' }, '防焰窗簾').state, 'action');
  assert.equal(get({ floors: '11' }, '防焰地毯').state, 'action');
  assert.equal(get({ floors: '11' }, '防焰地毯', { rug: null }), undefined, '拿掉地毯，地毯那一項就消失');
  assert.equal(get({ floors: '10' }, '防焰窗簾').state, 'na');
  // 耐燃等級：看你家在第幾樓；總樓層不到 11 就不用再問
  assert.equal(get({ floors: '10' }, '裝修材料耐燃等級').state, 'na');
  assert.equal(get({ floors: '12' }, '裝修材料耐燃等級').state, 'missing');
  assert.equal(get({ floors: '12', unitFloor: '3' }, '裝修材料耐燃等級').state, 'na');
  assert.match(get({ floors: '12', unitFloor: '11' }, '裝修材料耐燃等級').detail, /耐燃二級以上/);
  // 撒水頭：回答一題就有結論
  assert.match(get({ floors: '15', sprinkler: 'yes' }, '撒水頭淨空').detail, /45 公分.*30 公分/);
  assert.equal(get({ floors: '15', sprinkler: 'yes' }, '撒水頭淨空').state, 'action');
  assert.equal(get({ floors: '8', sprinkler: 'no' }, '撒水頭淨空').state, 'na');
  assert.equal(get({ floors: '20', sprinkler: 'no' }, '撒水頭淨空').state, 'review', '高層建築物說沒有撒水頭：請專業確認');
  assert.match(get({ floors: '12', unitFloor: '12' }, '撒水頭淨空').detail, /很可能有撒水頭/);
  // 警報器：十一層以上是偵測器，其餘是住宅用火災警報器
  assert.equal(get({ floors: '11' }, '火警偵測器').state, 'action');
  assert.equal(get({ floors: '10' }, '住宅用火災警報器').state, 'action');
  // 沒動隔間：避難與防火區劃直接說沒有動到
  assert.equal(get({ floors: '12', partition: 'no' }, '避難與防火區劃').state, 'na');
  for (const f of all({ floors: '12', partition: 'no', unitFloor: '3', sprinkler: 'no' }).filter((x) => x.source)) assert.notEqual(f.state, 'ok', '法規類不會標成「已檢查」');
  assert.equal(get({ floors: '12', partition: 'yes' }, '避難與防火區劃').state, 'review');
  // 每一項都有條文、修正日期、確定程度
  const legal = all({ floors: '12', partition: 'yes', unitFloor: '12', sprinkler: 'yes' }).filter((f) => f.source);
  assert.ok(legal.length >= 7);
  for (const f of legal) {
    assert.ok(f.certainty in CERTAINTY && f.law.length && f.source.includes('第'), f.title);
    for (const k of f.law) { assert.match(LAWS[k].amended, /^\d{4}-\d\d-\d\d$/); assert.match(lawUrl(k), /^https:\/\/law\.moj\.gov\.tw\/LawClass\/LawSingle\.aspx\?pcode=[A-Z]\d{7}&flno=[\d-]+$/); }
  }
  assert.match(CHECKED, /^\d{4}-\d\d-\d\d$/);
  // 每一項都有一行講完的「要做什麼」，比細節短
  for (const f of legal) assert.ok(f.brief && f.brief.length <= 20 && f.brief.length < f.detail.length, `${f.title}: ${f.brief}`);
  assert.equal(get({ floors: '12' }, '防焰地毯').brief, '地毯選附防焰標示的產品');
  assert.equal(get({ floors: '12' }, '撒水頭淨空').brief, '抬頭看一下天花板有沒有撒水頭');
});

test('3D 頁的一行結論：要不要申請、幾項要注意、還差幾題', () => {
  const base = { space: '臥室', ping: '5', age: '老屋' };
  const sum = (c, look = {}) => regSummary(ruleFindings({ ...base, ...c }, { ...light, rug: '#fff', ...look }));
  assert.equal(sum({}).permit, 'unknown');
  const twelve = sum({ floors: '12', partition: 'no' });
  assert.equal(twelve.text, '這個設計需申請室內裝修許可・另外 3 項要注意・再回答 2 題就能判斷完');   // 防焰窗簾、防焰地毯、偵測器；差所在樓層與撒水頭
  assert.deepEqual(twelve.asks, ['unitFloor', 'sprinkler']);
  assert.equal(sum({ floors: '12', partition: 'no' }, { rug: null }).attention, 2, '拿掉地毯少一項');
  assert.equal(sum({ floors: '12', partition: 'no', unitFloor: '12', sprinkler: 'yes' }).text, '這個設計需申請室內裝修許可・另外 5 項要注意');
  assert.equal(sum({ floors: '4', partition: 'no', sprinkler: 'no' }).text, '這個設計一般不需申請室內裝修許可・另外 1 項要注意');
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
