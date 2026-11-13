import { test } from 'node:test';
import assert from 'node:assert/strict';
import { swipeReply, nextQuestion, designNotes, editReply, parseEdit } from '../lib/voice.js';
import { STYLES, emptyScores, applySwipe } from '../lib/taste.js';
import { roomLayout } from '../lib/layout.js';

test('滑卡回話：喜歡會回應風格，滑夠了會邀請看成果', () => {
  let s = emptyScores();
  assert.match(swipeReply({ space: '客廳', scores: s, swiped: 0, liked: 0 }).text, /^挑你喜歡的。$/);
  assert.match(swipeReply({ space: '臥室', scores: s, swiped: 0, liked: 0 }).text, /^圖是客廳的，先挑風格。$/);
  s = applySwipe(s, 'warm', true);
  assert.deepEqual(swipeReply({ space: '客廳', scores: s, swiped: 1, liked: 1, last: ['warm', true] }), { text: '房間換成暖木色、柔和的布面了。', ready: false });
  assert.equal(swipeReply({ space: '客廳', scores: s, swiped: 2, liked: 1, last: ['dark', false] }).text, '這種不要，了解。');
  s = applySwipe(applySwipe(s, 'nordic', true), 'warm', true);
  const done = swipeReply({ space: '客廳', scores: s, swiped: 4, liked: 3, last: ['warm', true] });
  assert.deepEqual(done, { text: '方向有了：溫暖木質。', ready: true });
});

test('第 2 步：一次只問最有用、還沒回答的那一項', () => {
  const c = { space: '臥室' };
  assert.equal(nextQuestion(c).key, 'len');
  Object.assign(c, { len: '4.2', wid: '3.8' });
  assert.match(nextQuestion(c).text, /幾層樓的大樓？這會影響要不要申請裝修許可/);
  Object.assign(c, { floors: '12' }); assert.equal(nextQuestion(c).key, 'partition');
  Object.assign(c, { partition: 'no' }); assert.equal(nextQuestion(c).key, 'sprinkler');
  Object.assign(c, { sprinkler: 'yes' }); assert.equal(nextQuestion(c).key, 'unitFloor');
  Object.assign(c, { unitFloor: '8' }); assert.equal(nextQuestion(c).key, 'height');
  Object.assign(c, { height: '2.7' }); assert.equal(nextQuestion(c).key, 'age');
  Object.assign(c, { ageSet: true }); assert.equal(nextQuestion(c).key, null);
  assert.equal(nextQuestion({ space: '客廳', len: '5', wid: '4', housing: 'house', floors: '3' }).key, 'sprinkler', '透天不問隔間');
});

test('設計說明：數字來自真的配置，放不下的會說', () => {
  const living = designNotes({ space: '客廳' }, STYLES.warm, roomLayout({ w: 5.6, d: 4.7, h: 2.8 }), ['收納']);
  assert.match(living[0], /和茶几之間留 40 公分好伸腳；茶几到對面牆還有 \d+ 公分可以走/);
  assert.match(living[1], /你說在意收納，所以高櫃做在窗戶旁那面牆，寬 175 公分/);
  const tiny = designNotes({ space: '客廳' }, STYLES.warm, roomLayout({ w: 2.4, d: 2.4, h: 2.6 }));
  assert.match(tiny[0], /只放[雙三]人沙發、不放茶几，沙發前留 \d+ 公分走道/);
  const bed = designNotes({ space: '臥室' }, STYLES.muji, roomLayout({ w: 4.2, d: 3.8, h: 2.7, space: '臥室' }));
  assert.match(bed[0], /雙人床；床尾到對面牆還有 220 公分/);
  assert.match(bed[1], /衣櫃前留了 \d+ 公分/);
  assert.match(bed.at(-1), /無印日式/);
});

test('改設計後的回話：講錢，也講法規', () => {
  assert.equal(editReply({ label: '地毯拿掉', on: true, before: { low: 30, high: 44 }, after: { low: 29.4, high: 42.4 }, legalBefore: ['防焰窗簾', '防焰地毯'], legalAfter: ['防焰窗簾'] }),
    '好，地毯拿掉。預估少約 1.1 萬；不用再處理防焰地毯。');
  assert.equal(editReply({ label: '牆換暖白', on: false, before: { low: 30, high: 44 }, after: { low: 30, high: 44 }, legalBefore: [], legalAfter: [] }),
    '好，取消「牆換暖白」。預估金額沒有變，法規上要辦的事不變。');
  assert.match(editReply({ label: '地毯拿掉', on: true, before: { low: 30, high: 44, items: [{ name: '家具軟裝', low: 9.6, high: 17.8 }, { name: '地坪', low: 3, high: 6 }] }, after: { low: 29.4, high: 42.4, items: [{ name: '家具軟裝', low: 9, high: 16 }, { name: '地坪', low: 3, high: 6 }] }, legalBefore: [], legalAfter: [] }),
    /預估少約 1.1 萬（家具軟裝）/, '說出金額變動來自哪個工項');
});

test('用說的改設計：一句話好幾件事，聽不懂的每一段都回報', () => {
  const labels = ['沙發換淺色', '牆換暖白', '地毯拿掉', '地板換深色'];
  assert.deepEqual(parseEdit('沙發換成淺色', labels), { edits: [{ edit: 0, on: true }], style: null, unknown: [] });
  assert.deepEqual(parseEdit('地毯還是要', labels).edits, [{ edit: 2, on: false }]);
  assert.deepEqual(parseEdit('地板想要深一點', labels).edits, [{ edit: 3, on: true }]);
  assert.equal(parseEdit('換成北歐看看', labels).style, 'nordic');
  assert.deepEqual(parseEdit('幫我加一個中島', labels), { edits: [], style: null, unknown: ['幫我加一個中島'] });
  assert.deepEqual(parseEdit('我不要地毯，衣櫃換成白色', ['床頭換淺色', '牆換暖白', '地毯拿掉', '地板換深色']),
    { edits: [{ edit: 2, on: true }], style: null, unknown: ['衣櫃換成白色'] });
  assert.deepEqual(parseEdit('不要地毯然後牆換白', labels).edits, [{ edit: 2, on: true }, { edit: 1, on: true }]);
});
