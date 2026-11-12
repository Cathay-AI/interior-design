import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STYLES, PAIRS, emptyScores, applyChoice, tasteResult, directions, describe, boost } from '../lib/taste.js';

test('看屋：選中的風格加 2 分，不改動原物件', () => {
  const s0 = emptyScores();
  const s1 = applyChoice(s0, ['warm', 'dark'], 'warm');
  assert.equal(s1.warm, 2);
  assert.equal(s0.warm, 0);
});

test('看屋：兩間都不喜歡，兩種風格各扣 1 分', () => {
  const s = applyChoice(emptyScores(), ['warm', 'dark'], null);
  assert.equal(s.warm, -1);
  assert.equal(s.dark, -1);
});

test('看屋：選項不在題目裡就報錯', () => {
  assert.throws(() => applyChoice(emptyScores(), ['warm', 'dark'], 'retro'));
});

test('口味圖譜：一路選溫暖木質與無印日式，落在偏暖、簡約', () => {
  let s = emptyScores();
  for (const pair of PAIRS) s = applyChoice(s, pair, pair.includes('warm') ? 'warm' : pair.includes('muji') ? 'muji' : pair[0]);
  const r = tasteResult(s);
  assert.equal(r.ranked[0], 'warm');
  assert.equal(describe(r), '偏暖、簡約');
});

test('口味圖譜：全部不喜歡時停在中心，不亂猜', () => {
  let s = emptyScores();
  for (const pair of PAIRS) s = applyChoice(s, pair, null);
  const r = tasteResult(s);
  assert.deepEqual([r.x, r.y], [0, 0]);
});

test('佈置：三個方向互不重複，挑戰者離主方向最遠', () => {
  const s = boost(boost(emptyScores(), 'warm', 4), 'muji', 2);
  const dirs = directions(s);
  assert.deepEqual(dirs.map((d) => d.role), ['主方向', '相鄰方向', '挑戰者']);
  assert.equal(new Set(dirs.map((d) => d.key)).size, 3);
  const top = STYLES[dirs[0].key];
  const far = (k) => Math.hypot(STYLES[k].x - top.x, STYLES[k].y - top.y);
  const others = Object.keys(STYLES).filter((k) => k !== dirs[0].key && k !== dirs[1].key);
  assert.equal(far(dirs[2].key), Math.max(...others.map(far)));
});

test('swipes: likes win, dislikes push a style down, no swipes falls back to the first card', async () => {
  const { applySwipe, pickStyle, emptyScores, SWIPE_ORDER } = await import('../lib/taste.js');
  let s = emptyScores();
  assert.equal(pickStyle(s), SWIPE_ORDER[0]);
  s = applySwipe(s, 'warm', false);
  assert.notEqual(pickStyle(s), 'warm');
  s = applySwipe(applySwipe(s, 'dark', false), 'indus', true);
  assert.equal(pickStyle(s), 'indus');
  assert.throws(() => applySwipe(s, 'nope', true));
});

test('滑卡前兩名：兩種各喜歡一些時第二名不會被丟掉；沒表態的不算喜歡', async () => {
  const { topStyles, applySwipe, emptyScores } = await import('../lib/taste.js');
  assert.deepEqual(topStyles(emptyScores()), { first: 'warm', second: null, liked: false });
  let s = applySwipe(applySwipe(applySwipe(emptyScores(), 'muji', true), 'muji', true), 'warm', true);
  assert.deepEqual(topStyles(s), { first: 'muji', second: 'warm', liked: true });
  s = applySwipe(emptyScores(), 'dark', true);
  assert.deepEqual(topStyles(s), { first: 'dark', second: null, liked: true });
});
