// End-to-end check of the flow on desktop and phone widths: 靈感牆 → 3D → 估價與施工圖.
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
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${name}: ${r.status()} ${r.url()}`); });
  const snap = async (n) => { if (!shots) return; await page.waitForTimeout(450); await page.screenshot({ path: `${shots}/${name}-${n}.png` }); };
  const noOverflow = async (at) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `${name} ${at}: horizontal overflow ${overflow}px`);
  };
  await page.goto(base);

  // 1 靈感牆：瀑布流，點圖就是喜歡，可取消；喜歡最多的風格決定 3D
  await page.locator('.pin').first().waitFor();
  assert.equal(await page.locator('.pin').count(), 24);
  await page.waitForFunction(() => document.querySelector('.pin img').naturalWidth > 0);
  assert.match(await page.locator('#make').innerText(), /跳過，直接看 3D/);
  const cols = await page.evaluate(() => new Set([...document.querySelectorAll('.pin')].map((p) => Math.round(p.getBoundingClientRect().left))).size);
  assert.ok(name === 'phone' ? cols === 2 : cols >= 4, `${name}: ${cols} columns`);
  await page.locator('.pin[data-style="warm"]').first().click();
  await page.locator('.pin[data-style="nordic"]').nth(0).click();
  await page.locator('.pin[data-style="nordic"]').nth(1).click();
  await page.locator('.pin[data-style="dark"]').first().click();
  await page.locator('.pin[data-style="dark"]').first().click();              // 再點一次取消
  assert.match(await page.locator('.feedbar .count').innerText(), /已喜歡 3 張/);
  const bar = await page.locator('.feedbar').boundingBox();
  assert.ok(bar.x >= 0 && bar.x + bar.width <= viewport.width, `${name}: the bottom bar must stay on screen`);
  await snap('1-feed'); await noOverflow('1');
  await page.getByRole('button', { name: '看我的 3D' }).click();

  // 2 3D 成品：喜歡的那一種，靜止時不重畫
  await page.getByRole('heading', { name: '客廳・日光北歐' }).waitFor();
  await page.locator('.scene canvas').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  const idle = await page.evaluate(() => window.__room.stats().frames);
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => window.__room.stats().frames), idle, `${name}: 3D must not render while idle`);
  await page.getByRole('button', { name: '視角 B' }).click();
  await page.waitForTimeout(900);
  const before = await page.locator('#teaser').innerText();
  await page.getByRole('button', { name: '地毯拿掉' }).click();
  await page.getByRole('button', { name: '版本 2' }).waitFor();
  assert.notEqual(await page.locator('#teaser').innerText(), before, 'editing the design changes the estimate');
  await page.locator('.scene canvas').waitFor();
  await snap('2-3d'); await noOverflow('2');
  await page.getByRole('button', { name: '寫實圖' }).click();
  await page.locator('.scene img.photo').waitFor();
  await page.getByRole('button', { name: '看估價與施工圖' }).click();

  // 3 估價與施工圖：不問預算；坪數、屋況會改變金額；圖要付費才清楚
  await page.getByRole('heading', { name: '估價與施工圖' }).waitFor();
  assert.equal(await page.getByText('預算').count(), 0, 'never asks for a budget');
  assert.match(await page.locator('#ping').innerText(), /8 坪（預設）/);
  const total = await page.locator('#total').innerText();
  await page.getByRole('button', { name: '增加坪數' }).click();
  await page.getByRole('button', { name: '中古屋' }).click();
  assert.match(await page.locator('#ping').innerText(), /^9 坪$/);
  assert.notEqual(await page.locator('#total').innerText(), total);
  await page.locator('.items').getByText('中古屋基礎工程').waitFor();
  assert.equal(await page.locator('.sheetbtn').count(), 6);
  assert.match(await page.locator('.sheetbtn svg').first().evaluate((el) => getComputedStyle(el).filter), /blur/);
  await snap('3-estimate'); await noOverflow('3');
  await page.locator('.sheetbtn').first().click();                             // 未解鎖：點圖只會跳付費
  await page.getByRole('heading', { name: '解鎖施工圖包' }).waitFor();
  await page.getByRole('button', { name: '模擬付款並解鎖' }).click();
  await page.getByRole('heading', { name: '施工圖包（已解鎖）' }).waitFor();
  assert.equal(await page.locator('.sheetbtn svg').first().evaluate((el) => getComputedStyle(el).filter), 'none');
  await page.locator('.sheetbtn').first().click();
  await page.locator('#viewer svg').waitFor();
  await snap('3-unlocked');
  await page.close();
}
await browser.close();
assert.deepEqual(errors, []);
console.log('e2e ok');
