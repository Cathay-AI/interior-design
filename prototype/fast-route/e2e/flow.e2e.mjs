// End-to-end check of the five-screen 快速找風格 flow on desktop and phone widths.
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
  const snap = async (n) => { if (!shots) return; await page.waitForTimeout(450); await page.screenshot({ path: `${shots}/${name}-${n}.png` }); };
  const noOverflow = async (at) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `${name} ${at}: horizontal overflow ${overflow}px`);
  };
  await page.goto(base);
  await page.getByRole('heading', { name: '新提案' }).waitFor();

  // 1 說出想像：沒填不能往下
  assert.equal(await page.getByRole('button', { name: '下一步' }).isDisabled(), true);
  await page.fill('#say', '客廳想要溫暖木質感、多收納，預算大約 50 萬');
  await snap('1-say'); await noOverflow('1');
  await page.getByRole('button', { name: '下一步' }).click();

  // 2 放參考圖
  await page.getByRole('button', { name: '木質沙發' }).click();
  await snap('2-refs'); await noOverflow('2');
  await page.getByRole('button', { name: '下一步' }).click();

  // 3 確認需求：聽懂的列出來，缺的坪數要求補
  assert.match(await page.locator('#row-space').innerText(), /客廳/);
  assert.match(await page.locator('#row-style').innerText(), /溫暖木質/);
  assert.match(await page.locator('#row-budget').innerText(), /約 50 萬/);
  assert.match(await page.locator('#row-ping').innerText(), /請補充/);
  await snap('3-needs');
  await page.locator('#row-ping').click();
  await page.getByRole('button', { name: '8 坪' }).click();
  assert.match(await page.locator('#row-ping').innerText(), /8 坪/);
  await page.locator('#row-age').click();
  await page.getByRole('button', { name: '中古屋' }).click();
  await noOverflow('3');
  await page.getByRole('button', { name: '確認，開始生成' }).click();

  // 4 看 3D 提案
  await page.locator('.scene').waitFor({ timeout: 8000 });
  await page.getByRole('button', { name: '視角 B' }).click();
  await page.getByRole('button', { name: '沙發換淺色' }).click();
  await page.getByRole('button', { name: '版本 2' }).waitFor();
  await snap('4-3d'); await noOverflow('4');
  await page.getByRole('button', { name: '看預算與限制' }).click();

  // 5 預算與限制
  await page.getByText('約 40–72 萬').waitFor();
  await page.getByText('待補資料').first().waitFor();
  await snap('5-budget'); await noOverflow('5');
  await page.getByRole('button', { name: '解鎖更多方案' }).click();
  await page.getByRole('heading', { name: '解鎖更多方案' }).waitFor();
  await page.close();
}
await browser.close();
assert.deepEqual(errors, []);
console.log('e2e ok');
