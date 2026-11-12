import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawingSet, roomDims, downlights } from '../lib/drawings.js';
import { roomSize } from '../lib/layout.js';
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
    assert.ok(s.svg.includes('草稿・待設計師與施工團隊覆核'), 'every sheet says it is a draft awaiting professional review');
    assert.ok(!/NaN|undefined/.test(s.svg), s.no);
    assert.match(s.file, /^[A-Z]-\d\d-[a-z-]+\.svg$/, 'download name is plain ASCII');
  }
});

test('只有坪數時：尺寸依坪數換算，面積對得上', () => {
  const dm = roomDims(roomSize({}, 8));
  assert.ok(Math.abs((dm.w / 1000) * (dm.d / 1000) - 8 * 3.3058) < 0.3);
  assert.ok(roomDims(roomSize({}, 15)).w > dm.w);
  assert.ok(set()[0].svg.includes(String(dm.w)));
});

test('sheets follow the design and the estimate', () => {
  assert.ok(set(STYLES.indus)[4].svg.includes('礦物塗料地坪'));
  assert.ok(set(STYLES.warm)[4].svg.includes('超耐磨木地板'));
  const est = designEstimate(cond, STYLES.warm);
  assert.ok(set()[5].svg.includes(`${est.low} – ${est.high}`));
  assert.ok(set(STYLES.warm, { ...cond, space: '<b>' })[0].svg.includes('&lt;b&gt;'), 'text is escaped');
});

test('屋主給了實際長寬高：圖面跟著重新配置，不是同一張範本換數字', () => {
  const c = { ...cond, len: '6.2', wid: '4.3', height: '3' };
  const sheets = set(STYLES.warm, c), base = set();
  assert.ok(sheets[0].svg.includes('6200') && sheets[0].svg.includes('4300'));
  assert.ok(sheets[3].svg.includes('3000'));
  assert.notEqual(sheets[0].svg.replace(/\d+/g, ''), base[0].svg.replace(/\d+/g, ''), 'geometry differs, not only the numbers');
});

test('圖面比例是業界標準比例，大房子自動換小比例；燈數跟著面積', () => {
  const scale = (c) => Number(set(STYLES.warm, c)[0].svg.match(/比例 1 : (\d+)/)[1]);
  const std = [20, 25, 30, 40, 50, 60, 75, 100, 150, 200, 250, 300, 400, 500];
  const small = scale(cond), big = scale({ ...cond, len: '20', wid: '16.5' });
  assert.ok(std.includes(small) && std.includes(big) && big > small);
  assert.equal(downlights({ w: 5, d: 4.2 }).length, 4);
  assert.ok(downlights({ w: 20, d: 16.5 }).length > 30);
  for (const [x, z] of downlights({ w: 3, d: 2.4 })) assert.ok(Math.abs(x) < 1.5 && Math.abs(z) < 1.2);
});

test('從 2 公尺的小房間到百坪都畫得出來', () => {
  for (const c of [{ len: '2', wid: '2', height: '2.2' }, { len: '3', wid: '2.6' }, { len: '20', wid: '16.5', height: '3.6' }, { len: '60', wid: '60' }]) {
    for (const s of set(STYLES.indus, { ...cond, ...c })) assert.ok(!/NaN|undefined|null/.test(s.svg), `${s.no} at ${JSON.stringify(c)}`);
  }
});
