import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawingSet, roomDims } from '../lib/drawings.js';
import { designEstimate } from '../lib/estimate.js';
import { STYLES } from '../lib/taste.js';

const cond = { space: '客廳', ping: '8', age: '中古屋' };
const set = (look = STYLES.warm, c = cond) => drawingSet(c, look, designEstimate(c, look), '2026-11-12');

test('six sheets, each a labelled SVG with a title block', () => {
  const sheets = set();
  assert.deepEqual(sheets.map((s) => s.no), ['A-01', 'E-01', 'E-02', 'A-02', 'A-03', 'Q-01']);
  for (const s of sheets) {
    assert.match(s.svg, /^<svg[^>]+viewBox="0 0 840 594"/);
    assert.ok(s.svg.includes(s.title) && s.svg.includes('圖號 ' + s.no));
    assert.ok(s.svg.includes('未經專業簽證'), 'every sheet says it is a mock');
    assert.ok(!/NaN|undefined/.test(s.svg), s.no);
  }
});

test('dimensions scale with 坪數 and keep the room area', () => {
  const dm = roomDims(8);
  assert.ok(Math.abs((dm.w / 1000) * (dm.d / 1000) - 8 * 3.3058) < 0.2);
  assert.ok(roomDims(15).w > dm.w);
  assert.ok(set()[0].svg.includes(String(dm.w)));
});

test('sheets follow the design and the estimate', () => {
  assert.ok(set(STYLES.indus)[4].svg.includes('礦物塗料地坪'));
  assert.ok(set(STYLES.warm)[4].svg.includes('超耐磨木地板'));
  const est = designEstimate(cond, STYLES.warm);
  assert.ok(set()[5].svg.includes(`${est.low} – ${est.high}`));
  assert.ok(set(STYLES.warm, { ...cond, space: '<b>' })[0].svg.includes('&lt;b&gt;'), 'text is escaped');
});

test('屋主給了實際長寬高，圖面就標實際尺寸', () => {
  const dm = roomDims(8, { len: '6.2', wid: '4.3', height: '3' });
  assert.deepEqual([dm.w, dm.d, dm.h, dm.measured], [6200, 4300, 3000, true]);
  assert.equal(roomDims(8).measured, false);
  const c = { ...cond, len: '6.2', wid: '4.3', height: '3' };
  const sheets = set(STYLES.warm, c);
  assert.ok(sheets[0].svg.includes('6200') && sheets[0].svg.includes('4300'));
  assert.ok(sheets[3].svg.includes('3000'));
});
