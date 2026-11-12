// End-to-end check of the flow on desktop and phone widths: 滑卡 → 我家的條件 → 3D → 估價與施工圖.
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
  // the wall hot-links Pinterest's image host; serve a stand-in so the test does not depend on it
  await page.route('https://i.pinimg.com/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50"><rect width="40" height="50" fill="#b9a58c"/></svg>' }));
  const snap = async (n) => { if (!shots) return; await page.waitForTimeout(450); await page.screenshot({ path: `${shots}/${name}-${n}.png` }); };
  const noOverflow = async (at) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `${name} ${at}: horizontal overflow ${overflow}px`);
  };
  await page.goto(base);

  // 1 滑卡：按鈕、鍵盤、拖曳三種方式；卡片是 Pinterest 的圖並附來源
  await page.locator('.card').first().waitFor();
  assert.match(await page.locator('.count').innerText(), /1 \/ 18/);
  assert.match(await page.locator('.card img').last().getAttribute('src'), /^https:\/\/i\.pinimg\.com\//);
  assert.match(await page.locator('.card a').last().getAttribute('href'), /^https:\/\/www\.pinterest\.com\//);
  await snap('1-swipe'); await noOverflow('1');
  await page.getByRole('button', { name: '不喜歡', exact: true }).click();   // 溫暖木質 ✕
  await page.waitForFunction(() => document.querySelector('.count').textContent.startsWith('2 '));
  await page.keyboard.press('ArrowLeft');                                      // 深色現代 ✕
  await page.waitForFunction(() => document.querySelector('.count').textContent.startsWith('3 '));
  assert.equal(await page.locator('.card').last().getAttribute('data-style'), 'nordic');
  const box = await page.locator('.card').last().boundingBox();               // 日光北歐：拖曳右滑
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 220, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('.count').textContent.startsWith('4 '));
  await page.getByRole('button', { name: '夠了，直接看 3D' }).click();

  // 2 我家的條件：都是選填；給得越多掌握度越高
  await page.getByRole('heading', { name: '多告訴我一點你家' }).waitFor();
  assert.match(await page.locator('#score').innerText(), /掌握度 0%/);
  await page.getByRole('button', { name: '先跳過，生成 3D' }).waitFor();
  await page.fill('#f-len', '5.6'); await page.locator('#f-len').blur();
  await page.fill('#f-wid', '4.7'); await page.locator('#f-wid').blur();
  await page.waitForFunction(() => document.querySelector('#f-ping').value === '8');   // 長×寬 換算坪數
  assert.match(await page.locator('#score').innerText(), /掌握度 30%/);
  await page.setInputFiles('#docFile', [
    { name: '3F 機電圖.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') },
    { name: '平面圖.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') },
    { name: 'model.dwg', mimeType: 'application/acad', buffer: Buffer.from('x') },
  ]);
  await page.getByRole('alert').getByText('只收圖片或 PDF').waitFor();
  assert.equal(await page.locator('.docs li').count(), 2);
  assert.equal(await page.locator('.docs li').first().getByRole('button', { name: '機電圖', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#score').innerText(), /掌握度 80%/);
  await snap('2-context'); await noOverflow('2');
  await page.getByRole('button', { name: '生成 3D', exact: true }).click();

  // 3 3D 成品：喜歡的那一種，靜止時不重畫
  await page.getByRole('heading', { name: '客廳・日光北歐' }).waitFor();
  await page.locator('.scene[data-ready] canvas').waitFor({ timeout: 30000 }); // furniture models and materials are in
  assert.equal(await page.evaluate(() => window.__room.stats().ready), true);
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
  await page.locator('.scene[data-ready] canvas').waitFor({ timeout: 30000 });
  assert.match(await page.locator('#ctx').innerText(), /掌握度 80%・8 坪・5.6×4.7 公尺/);
  await snap('3-3d'); await noOverflow('3');
  await page.getByRole('button', { name: '看估價與施工圖' }).click();

  // 4 估價與施工圖：不問預算；坪數、屋況會改變金額；圖要付費才清楚
  await page.getByRole('heading', { name: '估價與施工圖' }).waitFor();
  assert.equal(await page.getByText('預算').count(), 0, 'never asks for a budget');
  assert.match(await page.locator('#ping').innerText(), /^8 坪$/);
  assert.match(await page.locator('#know').innerText(), /掌握度 80%，區間已收窄 40%/);
  assert.ok((await page.locator('.sheetbtn').first().innerHTML()).includes('5600'), 'drawings use the real length');
  assert.match(await page.locator('#docsnote').innerText(), /已附 格局／平面圖 1 份、機電圖 1 份/);
  const total = await page.locator('#total').innerText();
  await page.getByRole('button', { name: '增加坪數' }).click();
  await page.getByRole('button', { name: '中古屋' }).click();
  assert.match(await page.locator('#ping').innerText(), /^9 坪$/);
  assert.notEqual(await page.locator('#total').innerText(), total);
  await page.locator('.items').getByText('中古屋基礎工程').waitFor();
  assert.equal(await page.locator('.sheetbtn').count(), 6);
  assert.match(await page.locator('.sheetbtn svg').first().evaluate((el) => getComputedStyle(el).filter), /blur/);
  await snap('4-estimate'); await noOverflow('4');
  await page.locator('.sheetbtn').first().click();                             // 未解鎖：點圖只會跳付費
  await page.getByRole('heading', { name: '解鎖施工圖包' }).waitFor();
  await page.getByRole('button', { name: '模擬付款並解鎖' }).click();
  await page.getByRole('heading', { name: '施工圖包（已解鎖）' }).waitFor();
  assert.equal(await page.locator('.sheetbtn svg').first().evaluate((el) => getComputedStyle(el).filter), 'none');
  await page.locator('.sheetbtn').first().click();
  await page.locator('#viewer svg').waitFor();
  await snap('4-unlocked');
  await page.close();
}
await browser.close();
assert.deepEqual(errors, []);
console.log('e2e ok');
