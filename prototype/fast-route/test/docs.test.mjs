import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessKind, rejectReason, summarize, MAX_FILES, MAX_MB } from '../lib/docs.js';

test('guesses the kind from the file name, with a sensible fallback', () => {
  assert.equal(guessKind('3F 機電圖.pdf', 'application/pdf'), 'mep');
  assert.equal(guessKind('水電配置.jpg', 'image/jpeg'), 'mep');
  assert.equal(guessKind('A棟 平面圖.png', 'image/png'), 'plan');
  assert.equal(guessKind('Floor-Plan.PDF', 'application/pdf'), 'plan');
  assert.equal(guessKind('scan001.pdf', 'application/pdf'), 'plan');
  assert.equal(guessKind('IMG_2041.jpg', 'image/jpeg'), 'photo');
});

test('only images and PDFs, within the size and count limits', () => {
  const f = (o = {}) => ({ name: 'a.pdf', type: 'application/pdf', size: 1024, ...o });
  assert.equal(rejectReason(f(), 0), null);
  assert.equal(rejectReason(f({ type: 'image/heic' }), 0), null);
  assert.match(rejectReason(f({ name: 'a.dwg', type: 'application/acad' }), 0), /只收圖片或 PDF/);
  assert.match(rejectReason(f({ size: (MAX_MB + 1) * 1024 * 1024 }), 0), /超過/);
  assert.match(rejectReason(f(), MAX_FILES), /最多/);
});

test('summary counts each kind and reads naturally', () => {
  const s = summarize([{ kind: 'plan' }, { kind: 'mep' }, { kind: 'mep' }]);
  assert.deepEqual([s.plan, s.mep, s.photo, s.total], [1, 2, 0, 3]);
  assert.equal(s.text, '格局／平面圖 1 份、機電圖 2 份');
  assert.equal(summarize([]).text, '');
});
