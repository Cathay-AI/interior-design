import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIntake } from '../lib/intake.js';

test('從逐字稿抓出空間、坪數、預算、屋況、地區', () => {
  assert.deepEqual(parseIntake('客廳大約 8 坪，想要多一點收納，預算 50 萬內，中古屋在新北市'),
    { ping: '8', budget: '50', space: '客廳', age: '中古屋', city: '新北市' });
});

test('沒提到的欄位不出現，避免覆蓋使用者已填的值', () => {
  assert.deepEqual(parseIntake('想要溫暖一點'), {});
});

test('小數坪數', () => {
  assert.equal(parseIntake('臥室 4.5坪').ping, '4.5');
});

import { inferStyle } from '../lib/intake.js';

test('從一句話猜風格', () => {
  assert.equal(inferStyle('客廳想要溫暖木質感、多收納'), 'warm');
  assert.equal(inferStyle('想要北歐風，明亮一點'), 'nordic');
  assert.equal(inferStyle('工業風，水泥牆'), 'indus');
});

test('猜不到就回 null，不亂猜', () => {
  assert.equal(inferStyle('預算 50 萬'), null);
});

test('口語數字與單位：八坪、五米六、兩百八十公分', async () => {
  const { normalizeNumbers } = await import('../lib/intake.js');
  assert.equal(normalizeNumbers('八坪'), '8坪');
  assert.equal(normalizeNumbers('二十五坪'), '25坪');
  assert.equal(normalizeNumbers('十二坪'), '12坪');
  assert.equal(normalizeNumbers('長五點六公尺'), '長5.6公尺');
  assert.equal(normalizeNumbers('長5米6'), '長5.6公尺');
  assert.equal(normalizeNumbers('高280公分'), '高2.8公尺');
});

test('一句話講完我家的條件', async () => {
  const { parseHome } = await import('../lib/intake.js');
  assert.deepEqual(parseHome('客廳大概八坪，長五米六、寬四米七，天花板兩米八，中古屋'), { ping: '8', len: '5.6', wid: '4.7', height: '2.8', age: '中古屋' });
  assert.deepEqual(parseHome('5.6 x 4.7 公尺，挑高 3 米的老公寓'), { len: '5.6', wid: '4.7', height: '3', age: '老屋' });
  assert.deepEqual(parseHome('大概 10 坪的新成屋'), { ping: '10', age: '新成屋' });
  assert.deepEqual(parseHome('我想要溫暖一點'), {}, 'nothing recognisable stays empty');
});
