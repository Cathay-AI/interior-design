import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRenderScheduler } from '../lib/render-scheduler.js';

function harness() {
  const frames = [], timers = [], log = [];
  const s = createRenderScheduler({
    draw: () => log.push('draw'), onInteraction: (m) => log.push(m ? 'cheap' : 'detail'),
    requestFrame: (f) => frames.push(f), cancelFrame: () => { frames.length = 0; },
    setTimer: (f) => timers.push(f), clearTimer: () => { timers.length = 0; },
  });
  const runFrames = () => frames.splice(0).forEach((f) => f());
  const runTimers = () => timers.splice(0).forEach((f) => f());
  return { s, log, runFrames, runTimers, frames };
}

test('多次 request 在同一個 frame 只畫一次', () => {
  const { s, log, runFrames } = harness();
  s.request(); s.request(); s.request();
  runFrames();
  assert.deepEqual(log, ['draw']);
});

test('沒有人要求就不畫（沒有動畫迴圈）', () => {
  const { log, runFrames, frames } = harness();
  runFrames();
  assert.equal(frames.length, 0);
  assert.deepEqual(log, []);
});

test('拖曳時降為省電模式，停手後才恢復細節', () => {
  const { s, log, runFrames, runTimers } = harness();
  s.start(); s.start(); runFrames();
  assert.deepEqual(log, ['cheap', 'draw']);
  s.end(); runTimers(); runFrames();
  assert.deepEqual(log, ['cheap', 'draw', 'detail', 'draw']);
});

test('停手後又立刻拖曳，不會中途恢復細節', () => {
  const { s, log, runFrames, runTimers } = harness();
  s.start(); s.end(); s.start(); runTimers(); runFrames();
  assert.deepEqual(log, ['cheap', 'draw']);
});
