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
  await page.evaluate(() => localStorage.clear()); await page.reload();   // 從乾淨的狀態開始

  // 1 滑卡：按鈕、鍵盤、拖曳三種方式；卡片是 Pinterest 的圖並附來源
  await page.locator('.card').first().waitFor();
  assert.match(await page.locator('.count').innerText(), /1 \/ 18/);
  assert.match(await page.locator('.card img').last().getAttribute('src'), /^https:\/\/i\.pinimg\.com\//);
  assert.match(await page.locator('.card a').last().getAttribute('href'), /^https:\/\/www\.pinterest\.com\//);
  await snap('1-swipe'); await noOverflow('1');
  assert.match(await page.locator('#skip').innerText(), /跳過選風格/);
  await page.getByRole('button', { name: '喜歡', exact: true }).click();     // 溫暖木質 ♥ …
  await page.waitForFunction(() => document.querySelector('.count').textContent.startsWith('2 '));
  await page.locator('#why').getByRole('button', { name: '採光' }).click();    // 選填：喜歡它的什麼
  await page.locator('#undo').click();                                         // … 撤回
  await page.waitForFunction(() => document.querySelector('.count').textContent.startsWith('1 '));
  assert.equal(await page.locator('#undo').isHidden(), true);
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
  await page.getByRole('button', { name: '夠了，下一步' }).click();

  // 2 我家的條件：都是選填；給得越多掌握度越高
  await page.getByRole('heading', { name: '多告訴我一點你家' }).waitFor();
  assert.match(await page.locator('#score').innerText(), /掌握度 0%/);
  await page.getByRole('button', { name: '先跳過，生成 3D' }).waitFor();
  // 用一句話（語音辨識的結果走同一條路）：聽得出來的欄位自動填好
  assert.match(await page.locator('#taste').innerText(), /你喜歡的是日光北歐。在意的是採光。/);
  assert.match(await page.locator('#docsrole').innerText(), /不會被自動判讀，所以不會改變 3D、圖面或估價金額/);
  await page.fill('#say', '客廳長五米六、寬四米七，十二層樓的大樓，隔間不動'); await page.press('#say', 'Enter');   // Enter 直接送出
  assert.equal(await page.locator('#saysend').isVisible(), true, 'there is also a visible send button');
  await page.getByText('聽到：空間 客廳、長 5.6 公尺、寬 4.7 公尺、建物總樓層 12 層、隔間 不動').waitFor();
  assert.equal(await page.inputValue('#f-floors'), '12');
  assert.equal(await page.locator('#part-no').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.inputValue('#f-len'), '5.6');
  assert.equal(await page.inputValue('#f-wid'), '4.7');
  await page.waitForFunction(() => document.querySelector('#f-ping').value === '8');   // 長×寬 換算坪數
  assert.match(await page.locator('#pingnote').innerText(), /5.6 × 4.7 公尺 ≈ 8 坪/);
  assert.match(await page.locator('#score').innerText(), /掌握度 70%/);
  await page.setInputFiles('#docFile', [
    { name: '3F 機電圖.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') },
    { name: '平面圖.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') },
    { name: 'model.dwg', mimeType: 'application/acad', buffer: Buffer.from('x') },
  ]);
  await page.getByRole('alert').getByText('只收圖片或 PDF').waitFor();
  assert.equal(await page.locator('.docs li').count(), 2);
  assert.equal(await page.locator('.docs li').first().getByRole('button', { name: '機電圖', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#score').innerText(), /掌握度 70%/, 'uploads are reference material: they do not raise the score');
  // 防呆：離譜的尺寸不收，欄位旁說明原因，也不會前進
  await page.fill('#f-len', '500');
  await page.getByRole('button', { name: '生成 3D', exact: true }).click();
  await page.locator('#e-len').getByText('長最多 60 公尺，請確認單位是公尺').waitFor();
  assert.equal(await page.getByRole('heading', { name: '多告訴我一點你家' }).count(), 1, 'a wrong field keeps you on the page');
  assert.equal(await page.locator('#f-len').getAttribute('aria-invalid'), 'true');
  await page.fill('#f-len', '-3'); await page.locator('#f-len').blur();
  await page.locator('#e-len').getByText('長要大於 0').waitFor();
  await snap('2-error');
  await page.fill('#f-len', '5.6');
  await snap('2-context'); await noOverflow('2');
  await page.getByRole('button', { name: '生成 3D', exact: true }).click();   // 游標還在欄位裡：按一次就要前進

  // 3 3D 示意：喜歡的那一種，靜止時不重畫
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
  await page.locator('#undoedit').waitFor();
  assert.equal(await page.getByRole('button', { name: '地毯拿掉' }).getAttribute('aria-pressed'), 'true', 'an applied edit looks selected');
  assert.notEqual(await page.locator('#teaser').innerText(), before, 'editing the design changes the estimate');
  await page.locator('#undoedit').click();                                     // 復原、再套用
  await page.waitForFunction((t) => document.querySelector('#teaser').textContent === t, before);
  assert.equal(await page.getByRole('button', { name: '地毯拿掉' }).getAttribute('aria-pressed'), 'false');
  await page.getByRole('button', { name: '地毯拿掉' }).click();
  await page.locator('#undoedit').waitFor();
  await page.locator('.scene[data-ready] canvas').waitFor({ timeout: 30000 });
  if (name === 'phone') { const b = await page.locator('.cta').boundingBox(); assert.ok(b.y + b.height <= viewport.height && b.y > viewport.height - 120, 'the main button stays docked at the bottom of the phone screen'); }
  assert.match(await page.locator('#ctx').innerText(), /這個房間：5.6 × 4.7 公尺、高 2.8 公尺（8 坪）・掌握度 70%/);
  assert.deepEqual(await page.evaluate(() => window.__room.stats().size), { w: 5.6, d: 4.7, h: 2.8, clamped: false, space: '客廳' }, '3D room uses the real size');
  await snap('3-3d'); await noOverflow('3');
  await page.getByRole('button', { name: '看估價與施工圖' }).click();

  // 4 估價與施工圖：不問預算；坪數、屋況會改變金額；圖要付費才清楚
  await page.getByRole('heading', { name: '估價與施工圖' }).waitFor();
  assert.equal(await page.getByText('預算').count(), 0, 'never asks for a budget');
  assert.match(await page.locator('#ping').innerText(), /8 坪・5.6 × 4.7 公尺/);
  assert.equal(await page.getByRole('button', { name: '增加坪數' }).count(), 0, 'no stepper that would discard the real dimensions');
  assert.match(await page.locator('#know').innerText(), /掌握度 70%，區間已收窄 35%/);
  assert.match(await page.locator('#estkind').innerText(), /範例估算，非正式報價/);   // 屋況還沒選
  assert.match(await page.locator('#stages').innerText(), /1　AI 初稿[\s\S]*現在[\s\S]*2　專業團隊確認[\s\S]*流程確認中[\s\S]*3　施工圖定稿[\s\S]*標準確認中/);
  assert.ok((await page.locator('.sheetbtn').first().innerHTML()).includes('5600'), 'drawings use the real length');
  assert.match(await page.locator('#docsnote').innerText(), /已附 格局／平面圖 1 份、機電圖 1 份/);
  await page.getByRole('heading', { name: '你家尺寸的施工圖初稿' }).waitFor();
  // 法規與施工條件：12 層、不動隔間
  const regs = page.locator('#regs');
  assert.match(await regs.locator('li', { hasText: '室內裝修許可' }).innerText(), /需辦理[\s\S]*12 層集合住宅[\s\S]*依據：建築物室內裝修管理辦法/);
  assert.match(await regs.locator('li', { hasText: '防焰窗簾與地毯' }).innerText(), /需辦理[\s\S]*消防法第 11 條/);
  assert.match(await regs.locator('li', { hasText: '撒水頭與火警設備' }).innerText(), /45 公分/);
  const total = await page.locator('#total').innerText();
  await page.getByRole('button', { name: '中古屋' }).click();
  assert.notEqual(await page.locator('#total').innerText(), total);
  assert.match(await page.locator('#estkind').innerText(), /初步估算，非正式報價/);
  await page.locator('.items').getByText('中古屋基礎工程').waitFor();
  assert.equal(await page.locator('.sheetbtn').count(), 6);
  assert.match(await page.locator('.sheetbtn svg').first().evaluate((el) => getComputedStyle(el).filter), /blur/);
  await snap('4-estimate'); await noOverflow('4');
  await page.locator('.sheetbtn').first().click();                             // 未解鎖：點圖只會跳付費
  await page.getByRole('heading', { name: '解鎖你家尺寸的施工圖初稿' }).waitFor();
  { const b = await page.locator('#unlock').boundingBox();
    assert.ok(Math.abs(b.x + b.width / 2 - viewport.width / 2) < 2 && Math.abs(b.y + b.height / 2 - viewport.height / 2) < 2, 'the dialog is centred'); }
  assert.match(await page.locator('#unlock').innerText(), /不是可以直接施工的圖[\s\S]*流程還在確認中，目前不包含在內/);
  await page.getByRole('button', { name: '模擬付款並解鎖' }).click();
  await page.getByRole('heading', { name: '你家尺寸的施工圖初稿（已解鎖）' }).waitFor();
  assert.equal(await page.locator('.sheetbtn svg').first().evaluate((el) => getComputedStyle(el).filter), 'none');
  await page.locator('.sheetbtn').first().click();
  await page.locator('#viewer svg').waitFor();
  assert.equal(await page.locator('#viewerPrint').isVisible(), true, 'unlocked sheets can be saved as PDF');
  const dl = page.waitForEvent('download');
  await page.locator('#viewerDownload').click();
  assert.match((await dl).suggestedFilename(), /^A-01-floor-plan\.svg$/, 'unlocked sheets can be downloaded');
  await snap('4-unlocked');
  await page.locator('#viewer').getByRole('button', { name: '關閉' }).click();

  // 重新整理後進度還在（上傳的檔案除外，並提醒重附）
  await page.reload();
  await page.getByRole('heading', { name: '你家尺寸的施工圖初稿（已解鎖）' }).waitFor();
  assert.match(await page.locator('#ping').innerText(), /8 坪・5.6 × 4.7 公尺/);
  await page.locator('#steps button').nth(1).click();
  await page.locator('#lostdocs').waitFor();
  assert.equal(await page.inputValue('#f-floors'), '12');
  if (name === 'phone') {   // 手機：底部主要按鈕不會蓋住最後的內容
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const cta = await page.locator('.cta').boundingBox(), drop = await page.locator('#drop').boundingBox();
    assert.ok(drop.y + drop.height <= cta.y, 'at the end of the page the upload area sits above the bottom button');
  }

  // 什麼都沒給的人：圖只是範例，不賣；先請他補尺寸或平面圖
  await page.getByRole('button', { name: '重新開始' }).click();
  await page.locator('#skip').click();
  await page.getByRole('button', { name: '先跳過，生成 3D' }).click();
  assert.match(await page.locator('#assume').innerText(), /以 8 坪（預設）、新成屋（預設）估算/);
  await page.getByRole('button', { name: '看估價與施工圖' }).click();
  await page.getByRole('heading', { name: '施工圖初稿（範例）' }).waitFor();
  assert.equal(await page.getByRole('button', { name: /解鎖/ }).count(), 0, 'nothing to buy without the home');
  assert.match(await page.locator('#estkind').innerText(), /範例估算，非正式報價/);
  assert.match(await page.locator('#assume4').innerText(), /8 坪（預設，你還沒填）、新成屋（預設，你還沒選）/);
  assert.match(await page.locator('#docsnote').innerText(), /還缺：長、寬（手動填寫；上傳的平面圖目前不會被自動判讀）/);
  await page.locator('.sheetbtn').first().click();                             // 點範例就放大看範例，不會被送回表單
  await page.locator('#viewer svg').waitFor();
  assert.match(await page.locator('#viewerNote').innerText(), /範例空間/);
  assert.equal(await page.locator('#viewerDownload').isHidden(), true, 'examples cannot be downloaded');
  await page.locator('#viewer').getByRole('button', { name: '關閉' }).click();
  await page.locator('#makemine').waitFor();
  const before9 = await page.locator('#total').innerText();
  await page.getByRole('button', { name: '增加坪數' }).click();                 // 沒填長寬的人仍可以直接調坪數
  assert.match(await page.locator('#ping').innerText(), /^9 坪$/);
  assert.notEqual(await page.locator('#total').innerText(), before9);
  assert.match(await page.locator('#regs').innerText(), /還不知道建物總樓層/);
  await page.locator('#needhome').click();
  await page.getByRole('heading', { name: '多告訴我一點你家' }).waitFor();
  await page.close();
}
{ // 開不了 3D 的裝置：明講是 2D 示意圖，並收起沒有作用的視角按鈕
  const page = await browser.newPage({ viewport: { width: 1366, height: 860 } });
  await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...a) { return /webgl/.test(type) ? null : get.call(this, type, ...a); }; });
  await page.route('https://i.pinimg.com/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="5"/>' }));
  await page.goto(base);
  await page.locator('#skip').click();
  await page.getByRole('button', { name: '先跳過，生成 3D' }).click();
  await page.getByText('2D 示意圖（這台裝置無法顯示 3D）').waitFor({ timeout: 30000 });
  assert.equal(await page.getByRole('button', { name: '視角 B' }).isVisible(), false, 'view buttons that do nothing are hidden');
  assert.equal(await page.locator('.scene > svg').count(), 1);
  await page.close();
}
{ // 分享連結：別人打開就看到同一個設計與條件
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`share: ${e.message}`));
  await page.route('https://i.pinimg.com/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="5"/>' }));
  await page.goto(base);
  await page.locator('.round.like').click();                                    // 溫暖木質 ♥
  await page.waitForFunction(() => document.querySelector('.count').textContent.startsWith('2 '));
  await page.locator('#skip').click();
  // 空間範圍：一句話講到主臥就切到臥室；3D、估價、圖面都跟著換
  assert.equal(await page.locator('#spaces').getByRole('button', { name: '客廳' }).getAttribute('aria-pressed'), 'true', '客廳 is the default');
  assert.equal(await page.locator('#spaces').getByRole('button', { name: '廚房（之後）' }).isDisabled(), true);
  await page.fill('#say', '只想裝潢主臥，大概 5 坪，長 4 米 2、寬 3 米 8，天花板 2 米 7，老屋，12 樓高的大樓，不動隔間'); await page.press('#say', 'Enter');
  await page.getByText('聽到：空間 臥室、坪數 5 坪、長 4.2 公尺、寬 3.8 公尺、天花板高 2.7 公尺、建物總樓層 12 層、隔間 不動、屋況 老屋、坪數依長寬換算為 4.8 坪').waitFor();
  assert.equal(await page.locator('#spaces').getByRole('button', { name: '臥室' }).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.inputValue('#f-floors'), '12');
  await page.locator('#spacenote').waitFor();
  await page.getByRole('button', { name: '生成 3D', exact: true }).click();
  await page.getByRole('heading', { name: '臥室・溫暖木質' }).waitFor();
  await page.locator('.scene[data-ready] canvas').waitFor({ timeout: 30000 });
  assert.equal(await page.evaluate(() => window.__room.stats().size.space), '臥室');
  await page.getByRole('button', { name: '看估價與施工圖' }).click();
  await page.locator('.items').getByText('衣櫃與斗櫃').waitFor();
  assert.match(await page.locator('.items').innerText(), /床架、床墊、床頭櫃/);
  assert.ok((await page.locator('.sheetbtn').first().innerHTML()).includes('雙人床'), 'the plan shows a bed');
  await page.locator('#withfurniture input').uncheck();
  await page.waitForFunction(() => !document.querySelector('.items').textContent.includes('家具軟裝'));
  await page.locator('#withfurniture input').check();
  await page.locator('#steps button').nth(1).click();
  await page.locator('#spaces').getByRole('button', { name: '客廳' }).click();
  await page.fill('#f-len', '6.2'); await page.locator('#f-len').blur();
  await page.fill('#f-wid', '4.3'); await page.locator('#f-wid').blur();
  await page.getByRole('button', { name: '老屋' }).click();
  await page.getByRole('button', { name: '生成 3D', exact: true }).click();
  await page.getByRole('button', { name: '地毯拿掉' }).click();
  await page.locator('#undoedit').waitFor();
  const price = await page.locator('#teaser').innerText();
  await page.locator('#share').click();
  await page.getByText('已複製連結').waitFor();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(url, /#r=[A-Za-z0-9_-]+$/);
  const other = await (await browser.newContext({ viewport: { width: 1366, height: 860 } })).newPage();   // 另一個人、乾淨的瀏覽器
  await other.goto(url);
  await other.getByRole('heading', { name: '客廳・溫暖木質' }).waitFor({ timeout: 30000 });
  assert.equal(await other.locator('#teaser').innerText(), price, 'same design and conditions give the same estimate');
  assert.match(await other.locator('#ctx').innerText(), /6.2 × 4.3 公尺/);
  assert.match(await other.locator('#assume').innerText(), /老屋估算/);
  assert.equal(await other.getByRole('button', { name: '地毯拿掉' }).getAttribute('aria-pressed'), 'true');
  assert.equal(new URL(other.url()).hash, '', 'the hash is consumed so a reload keeps the local copy');
  await ctx.close();
}
await browser.close();
assert.deepEqual(errors, []);
console.log('e2e ok');
