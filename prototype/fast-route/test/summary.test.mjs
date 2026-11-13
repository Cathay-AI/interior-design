import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summaryText } from '../lib/summary.js';
import { STYLES } from '../lib/taste.js';
import { designEstimate } from '../lib/estimate.js';
import { ruleFindings } from '../lib/rules.js';

test('方案摘要：需求、條件、估價、要辦的事和待確認都在，而且不誇大', () => {
  const cond = { space: '臥室', ping: '4.8', len: '4.2', wid: '3.8', height: '2.7', age: '老屋', ageSet: true, floors: '12', partition: 'no', unitFloor: '', sprinkler: '' };
  const look = { ...STYLES.warm, rug: null }, est = designEstimate(cond, look);
  const t = summaryText({ cond, look, edits: ['地毯拿掉'], size: { w: 4.2, d: 3.8, h: 2.7 }, est, findings: ruleFindings(cond, look), reasons: ['收納'], score: 0.9, link: 'https://example.test/#r=abc', date: '2026-11-13' });
  for (const part of ['回家之前｜臥室設計方案摘要', '風格：溫暖木質（調整：地毯拿掉）', '在意的事：收納', '4.2 × 3.8 公尺、高 2.7 公尺（4.8 坪）', '建物：12 層', '基本資料完整度：90%',
    `【預估花費】${est.low}–${est.high} 萬（初步估算，非正式報價）`, '衣櫃與斗櫃', '這個設計需申請室內裝修許可', '- 防焰窗簾：窗簾選附防焰標示的產品', '還沒辦法判斷的：', '- 撒水頭淨空：抬頭看一下天花板有沒有撒水頭',
    '門窗與柱位的實際位置', '不是合格判定', '打開同一個設計：https://example.test/#r=abc']) assert.ok(t.includes(part), part);
  assert.ok(!t.includes('防焰地毯') && !t.includes('undefined') && !t.includes('null'));
  const bare = summaryText({ cond: { space: '客廳', ping: '', age: '新成屋' }, look: STYLES.nordic, edits: [], size: { w: 5, d: 4.2, h: 2.8 }, est: designEstimate({ space: '客廳', ping: '', age: '新成屋' }, STYLES.nordic), findings: ruleFindings({ space: '客廳', ping: '8', age: '新成屋' }, STYLES.nordic), reasons: [], score: 0, date: '2026-11-13' });
  assert.ok(bare.includes('預設值，還沒填') && bare.includes('範例估算') && !bare.includes('undefined'));
});
