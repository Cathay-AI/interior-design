// End-to-end check of the 快速找風格 route on desktop and phone widths.
// Usage: node e2e/flow.e2e.mjs [baseUrl] [screenshotDir]
import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const shots = process.argv[3];
const browser = await chromium.launch();
const errors = [];
for (const [name, viewport] of [['desktop', { width: 1366, height: 860 }], ['phone', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('dialog', (d) => d.accept());
  const snap = async (n) => shots && page.screenshot({ path: `${shots}/${name}-${n}.png`, fullPage: true });
  await page.goto(base);
  await page.getByRole('heading', { name: '三條路線，都走得到定案' }).waitFor();
  await snap('0-entry');
  await page.locator('.routeBtn.primary').click();
  for (let i = 0; i < 5; i++) await page.locator('.option').first().click();
  await page.getByRole('heading', { name: '你的居家口味' }).waitFor();
  await snap('1-taste');
  await page.getByRole('button', { name: '對，就是這樣' }).click();
  await page.locator('.sw').nth(1).click();
  await snap('2-layout');
  await page.getByRole('button', { name: '就是這個，產生定案卡' }).click();
  await page.getByText('風格定案卡').waitFor();
  await snap('3-final');
  await page.getByRole('button', { name: '確認，進入 3D' }).click();
  await page.fill('#say', '客廳大約 8 坪，想要多一點收納，預算 50 萬內，中古屋在新北市');
  await page.getByRole('button', { name: '整理需求' }).click();
  assert.equal(await page.inputValue('#pg'), '8');
  assert.equal(await page.inputValue('#ct'), '新北市');
  await page.getByRole('button', { name: '確認，開始生成' }).click();
  await page.getByText('約 40–72 萬').waitFor({ timeout: 8000 });
  await snap('4-result');
  await page.getByRole('button', { name: '沙發換淺色' }).click();
  await page.getByRole('button', { name: '版本 2' }).waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `${name}: horizontal overflow ${overflow}px`);
  await page.close();
}
await browser.close();
assert.deepEqual(errors, []);
console.log('e2e ok');
