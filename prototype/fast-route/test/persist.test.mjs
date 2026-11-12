import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serialize, restore, toShare, fromShare } from '../lib/persist.js';
import { emptyScores, applySwipe, STYLES } from '../lib/taste.js';

const blank = () => ({ step: 1, reached: 1, scores: emptyScores(), swiped: 0, liked: 0, docs: [], docError: '', said: '', heard: null,
  cond: { space: '客廳', style: null, ping: '', len: '', wid: '', height: '', age: '新成屋', ageSet: false, floors: '', partition: '' },
  versions: [], v: 0, view: 'A', generated: false, unlocked: false });

test('存了再讀回來，進度都在', () => {
  const S = { ...blank(), step: 4, reached: 4, swiped: 3, liked: 1, scores: applySwipe(emptyScores(), 'nordic', true), said: '長五米六',
    cond: { ...blank().cond, style: 'nordic', len: '5.6', wid: '4.7', ping: '8', floors: '12', partition: 'no' },
    versions: [{ label: '版本 1', look: { ...STYLES.nordic } }, { label: '版本 2', look: { ...STYLES.nordic, rug: null } }], v: 1, view: 'B', unlocked: true,
    docs: [{ name: 'a.pdf', kind: 'plan', url: null }] };
  const back = restore(serialize(S), blank());
  for (const k of ['step', 'reached', 'swiped', 'liked', 'said', 'v', 'view', 'unlocked']) assert.deepEqual(back[k], S[k], k);
  assert.deepEqual(back.cond, S.cond);
  assert.equal(back.versions[1].look.rug, null);
  assert.deepEqual(back.docs, [], '上傳的檔案不還原');
  assert.equal(back.lostDocs, true, '但會記得原本有附檔，好提醒重附');
  assert.equal(back.generated, false);
});

test('沒存過、壞掉或對不上的資料，一律從頭開始', () => {
  const b = blank();
  for (const bad of [null, '', 'not json', '{}', JSON.stringify({ step: 9 }), JSON.stringify({ ...JSON.parse(serialize(blank())), step: 3 }),
    JSON.stringify({ ...JSON.parse(serialize(blank())), scores: { warm: 'x' } }), JSON.stringify({ ...JSON.parse(serialize(blank())), cond: {} })]) {
    assert.equal(restore(bad, b), b, String(bad).slice(0, 30));
  }
  assert.equal(restore(serialize(blank()), b).step, 1);
});

const known = { styles: Object.keys(STYLES), edits: 4, ages: ['新成屋', '中古屋', '老屋'] };

test('分享連結：風格、修改與條件來回一致，不帶解鎖狀態與檔案', () => {
  const S = { ...blank(), unlocked: true, docs: [{ name: 'a.pdf' }],
    cond: { ...blank().cond, style: 'indus', len: '5.6', wid: '4.7', ping: '8', age: '中古屋', ageSet: true, floors: '12', partition: 'no' },
    versions: [{ look: {}, edits: [] }, { look: {}, edits: [2, 0] }], v: 1 };
  const hash = toShare(S);
  assert.match(hash, /^r=[A-Za-z0-9_-]+$/);
  assert.deepEqual(fromShare('#' + hash, known), { style: 'indus', edits: [2, 0],
    cond: { ping: '8', len: '5.6', wid: '4.7', floors: '12', age: '中古屋', ageSet: true, partition: 'no' } });
  assert.ok(!atob(hash.slice(2).replace(/-/g, '+').replace(/_/g, '/')).includes('unlocked'));
});

test('分享連結：亂填或被改過的內容一律不接受', () => {
  const enc = (o) => 'r=' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  for (const bad of ['', '#', '#r=', '#r=%%%', '#x=abc', enc({ s: 'nope', e: [] }), enc({ s: 'warm', e: [9] }), enc({ s: 'warm', e: 'x' }),
    enc({ s: 'warm', e: [], c: { ping: '<script>' } }), enc({ s: 'warm', e: [], c: { age: '豪宅' } }), enc({ s: 'warm', e: [], c: { partition: 'maybe' } })]) {
    assert.equal(fromShare(bad, known), null, bad.slice(0, 24));
  }
  assert.deepEqual(fromShare(enc({ s: 'warm', e: [] }), known), { style: 'warm', edits: [], cond: {} });
});
