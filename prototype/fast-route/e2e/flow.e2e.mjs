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
  // 用一句話（語音辨識的結果走同一條路）：聽得出來的欄位自動填好
  assert.match(await page.locator('#taste').innerText(), /你喜歡的是日光北歐/);
  await page.fill('#say', '客廳長五米六、寬四米七，十二層樓的大樓，隔間不動'); await page.locator('#say').blur();
  await page.getByText('聽到：長 5.6 公尺、寬 4.7 公尺、建物總樓層 12 層、隔間 不動').waitFor();
  assert.equal(await page.inputValue('#f-floors'), '12');
  assert.equal(await page.locator('#part-no').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.inputValue('#f-len'), '5.6');
  assert.equal(await page.inputValue('#f-wid'), '4.7');
  await page.waitForFunction(() => document.querySelector('#f-ping').value === '8');   // 長×寬 換算坪數
  assert.match(await page.locator('#score').innerText(), /掌握度 40%/);
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
  assert.match(await page.locator('#ctx').innerText(), /這個房間：5.6 × 4.7 公尺、高 2.8 公尺（8 坪）・掌握度 80%/);
  assert.deepEqual(await page.evaluate(() => window.__room.stats().size), { w: 5.6, d: 4.7, h: 2.8, clamped: false }, '3D room uses the real size');
  await snap('3-3d'); await noOverflow('3');
  await page.getByRole('button', { name: '看估價與施工圖' }).click();

  // 4 估價與施工圖：不問預算；坪數、屋況會改變金額；圖要付費才清楚
  await page.getByRole('heading', { name: '估價與施工圖' }).waitFor();
  assert.equal(await page.getByText('預算').count(), 0, 'never asks for a budget');
  assert.match(await page.locator('#ping').innerText(), /^8 坪$/);
  assert.match(await page.locator('#know').innerText(), /掌握度 80%，區間已收窄 40%/);
  assert.ok((await page.locator('.sheetbtn').first().innerHTML()).includes('5600'), 'drawings use the real length');
  assert.match(await page.locator('#docsnote').innerText(), /已附 格局／平面圖 1 份、機電圖 1 份/);
  await page.getByRole('heading', { name: '你家尺寸的施工圖草稿' }).waitFor();
  // 法規與施工條件：12 層、不動隔間
  const regs = page.locator('#regs');
  assert.match(await regs.locator('li', { hasText: '室內裝修許可' }).innerText(), /需辦理[\s\S]*12 層集合住宅[\s\S]*依據：建築物室內裝修管理辦法/);
  assert.match(await regs.locator('li', { hasText: '防焰窗簾與地毯' }).innerText(), /需辦理[\s\S]*消防法第 11 條/);
  assert.match(await regs.locator('li', { hasText: '撒水頭與火警設備' }).innerText(), /45 公分/);
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
  await page.getByRole('heading', { name: '解鎖你家尺寸的施工圖草稿' }).waitFor();
  await page.getByRole('button', { name: '模擬付款並解鎖' }).click();
  await page.getByRole('heading', { name: '你家尺寸的施工圖草稿（已解鎖）' }).waitFor();
  assert.equal(await page.locator('.sheetbtn svg').first().evaluate((el) => getComputedStyle(el).filter), 'none');
  await page.locator('.sheetbtn').first().click();
  await page.locator('#viewer svg').waitFor();
  await snap('4-unlocked');
  await page.locator('#viewer').getByRole('button', { name: '關閉' }).click();

  // 什麼都沒給的人：圖只是範例，不賣；先請他補尺寸或平面圖
  await page.getByRole('button', { name: '重新開始' }).click();
  await page.locator('#skip').click();
  await page.getByRole('button', { name: '先跳過，生成 3D' }).click();
  assert.match(await page.locator('#assume').innerText(), /以 8 坪（預設）、新成屋（預設）估算/);
  await page.getByRole('button', { name: '看估價與施工圖' }).click();
  await page.getByRole('heading', { name: '施工圖範例' }).waitFor();
  assert.equal(await page.getByRole('button', { name: /解鎖/ }).count(), 0, 'nothing to buy without the home');
  assert.match(await page.locator('#regs').innerText(), /還不知道建物總樓層/);
  await page.locator('#needhome').click();
  await page.getByRole('heading', { name: '多告訴我一點你家' }).waitFor();
  await page.close();
}
await browser.close();
assert.deepEqual(errors, []);
console.log('e2e ok');
