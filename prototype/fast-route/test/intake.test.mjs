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
