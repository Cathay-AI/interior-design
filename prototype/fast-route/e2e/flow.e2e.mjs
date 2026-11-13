// End-to-end check on desktop (1440×900) and phone (390×844): 你家 → 風格 → 設計 → 花費.
// Covers the single-room path, the whole-home path, a device without WebGL, and a share link.
// Usage: node e2e/flow.e2e.mjs [baseUrl] [screenshotDir]
import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const shots = process.argv[3];
const browser = await chromium.launch();
const errors = [];
// 動態一律直接切換（prefers-reduced-motion），測的是結果不是補間；字體用空的樣式表代替，不依賴外部字體服務
const quiet = { reducedMotion: 'reduce' };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const pin = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50"><rect width="40" height="50" fill="#b9a58c"/></svg>';
async function open(context, label) {
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${label}: ${r.status()} ${r.url()}`); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('https://i.pinimg.com/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: pin }));
  return page;
}
const ready = (page) => page.locator('.scene[data-ready] canvas').waitFor({ timeout: 30000 });
const txt = (l) => l.evaluate((e) => e.textContent);

for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const context = await browser.newContext({ viewport, ...quiet });
  const page = await open(context, name);
  const snap = async (n) => { if (!shots) return; await page.waitForTimeout(450); await page.screenshot({ path: `${shots}/${name}-${n}.png` }); };
  // 驗收：房間（或平面圖）在首屏且佔視窗夠大；這個狀態的主要動作不用捲動就看得到
  const onStage = async (at, action) => {
    await page.evaluate(() => { scrollTo(0, 0); document.querySelector('#app').scrollTop = 0; });
    const m = await page.evaluate((sel) => {
      const r = document.querySelector('.scenewrap').getBoundingClientRect(), a = document.querySelector(sel).getBoundingClientRect();
      const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)), hgt = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      return { share: (w * hgt) / (innerWidth * innerHeight), top: a.top, bottom: a.bottom, vh: innerHeight };
    }, action);
    // 手機滑卡時卡片需要高度，舞台縮到 180px；其餘狀態是 310px
    assert.ok(m.share >= (name !== 'phone' ? 0.35 : at === '2' ? 0.15 : 0.28), `${name} ${at}: the room takes ${Math.round(m.share * 100)}% of the screen`);
    assert.ok(m.top >= 0 && m.bottom <= m.vh, `${name} ${at}: the main action (${action}) is on the first screen`);
  };
  const noOverflow = async (at) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    // 溢出時把超出畫面的元素列出來，不用猜是誰
    const who = overflow <= 1 ? [] : await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 8).map((e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().replace(/\s+/g, '.') : ''}→${Math.round(e.getBoundingClientRect().right)}`));
    assert.ok(overflow <= 1, `${name} ${at}: horizontal overflow ${overflow}px by ${who.join(', ')}`);
  };
  await page.goto(base);
  await page.evaluate(() => localStorage.clear()); await page.reload();   // 從乾淨的狀態開始

  // ① 開場：丟平面圖就開始；房間從第一秒就在舞台上，同一個 canvas 一路用到最後
  await page.getByRole('heading', { name: '把平面圖丟給我' }).waitFor();
  await ready(page);
  await page.evaluate(() => { window.__canvas = document.querySelector('#scene canvas'); });
  assert.match(await page.locator('#pricekind').innerText(), /範例估算/);
  const sample = await page.locator('#teaser').innerText();
  assert.match(sample, /^\d+–\d+ 萬$/);
  assert.match(await page.locator('#dims').innerText(), /範例客廳・約 8 坪\s*5\.6 × 4\.7 公尺/);
  await page.locator('#swatches').getByRole('button', { name: '深色現代' }).click();   // 還沒選空間就能玩：點色票，房間與金額都變
  await page.waitForFunction((t) => document.querySelector('#teaser').textContent !== t, sample);
  await page.locator('#swatches').getByRole('button', { name: '溫暖木質' }).click();
  assert.deepEqual(await page.locator('#steps .t').allTextContents(), ['你家', '風格', '設計', '花費']);
  assert.deepEqual(await page.locator('#where button:not(:disabled)').allTextContents(), ['客廳', '臥室', '廚房', '衛浴', '書房'], 'every space can be picked; nothing is held back');
  if (name === 'desktop') await onStage('1', '#upload');
  await snap('1-intro'); await noOverflow('1');

  // 還沒有平面圖：先挑一個空間。一個畫面只問一件事
  await page.locator('#where').getByRole('button', { name: '客廳' }).click();
  await page.getByRole('heading', { name: '你家客廳大概多大？' }).waitFor();
  assert.match(await page.locator('#score').innerText(), /基本資料完整度 0%/);
  await onStage('1 size', '#generate');
  assert.match(await page.locator('#asking').innerText(), /你家客廳的長和寬大概幾公尺？/);
  assert.ok(!/null|undefined/.test(await page.locator('#app').innerText()), 'nothing prints as null');
  assert.equal(await page.locator('#f-len').count(), 1, 'the answer to the question sits right under it');
  assert.equal(await page.locator('#f-floors').count() + await page.locator('#docFile').count(), 0, 'the full form and uploads are folded away');
  await page.fill('#say', '客廳長五米六、寬四米七，十二層樓的大樓，隔間不動'); await page.press('#say', 'Enter');   // Enter 直接送出
  await page.getByText('聽到：空間 客廳、長 5.6 公尺、寬 4.7 公尺、建物總樓層 12 層、隔間 不動').waitFor();
  await page.locator('#openform').click();
  assert.equal(await page.inputValue('#f-floors'), '12');
  assert.equal(await page.locator('#part-no').getAttribute('aria-pressed'), 'true');
  await page.waitForFunction(() => document.querySelector('#f-ping').value === '8');   // 長×寬 換算坪數
  assert.match(await page.locator('#pingnote').innerText(), /依長 × 寬換算為 8 坪/);
  assert.match(await page.locator('#asking').innerText(), /天花板有撒水頭嗎/, 'the designer moves on to the next unanswered item');
  assert.match(await page.locator('#score').innerText(), /基本資料完整度 60%/);
  await page.locator('#opendocs').click();
  await page.setInputFiles('#docFile', [{ name: '3F 機電圖.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }, { name: '平面圖.png', mimeType: 'image/png', buffer: PNG }, { name: 'model.dwg', mimeType: 'application/acad', buffer: Buffer.from('x') }]);
  await page.getByRole('alert').getByText('只收圖片或 PDF').waitFor();
  assert.equal(await page.locator('.docs li').count(), 2);
  assert.match(await page.locator('#score').innerText(), /基本資料完整度 60%/, 'uploads are reference material: they do not raise the score');
  // 防呆：離譜的尺寸不收，欄位旁說明原因，也不會前進
  await page.fill('#f-len', '500');
  await page.locator('#generate').click();
  await page.locator('#e-len').getByText('長最多 60 公尺，請確認單位是公尺').waitFor();
  assert.equal(await page.locator('#f-len').getAttribute('aria-invalid'), 'true');
  await page.fill('#f-len', '-3'); await page.locator('#f-len').blur();
  await page.locator('#e-len').getByText('長要大於 0').waitFor();
  await page.fill('#f-len', '5.6'); await page.locator('#f-len').blur();
  // 填了尺寸，舞台上的房間和尺寸卡當場變
  await page.waitForFunction(() => document.querySelector('#dims').textContent.includes('5.6 × 4.7') && window.__room.stats().size.w === 5.6);
  await snap('1-size'); await noOverflow('1 size');
  await page.fill('#f-wid', '4.7');
  await page.locator('#generate').click();   // 游標還在欄位裡：按一次就要前進

  // ② 風格：按鈕、鍵盤、拖曳三種方式；卡片是 Pinterest 的圖並附來源
  await page.getByRole('heading', { name: '喜歡這種感覺嗎？' }).waitFor();
  await page.locator('.card').first().waitFor();
  assert.match(await page.locator('#talk').innerText(), /^\s*挑你喜歡的。\s*$/);
  assert.match(await page.locator('.count').innerText(), /1 \/ 18/);
  assert.match(await page.locator('.card img').last().getAttribute('src'), /^https:\/\/i\.pinimg\.com\//);
  assert.match(await page.locator('.card a').last().getAttribute('href'), /^https:\/\/www\.pinterest\.com\//);
  await onStage('2', '.round.like');
  await snap('2-style'); await noOverflow('2');
  assert.match(await page.locator('#skip').innerText(), /跳過，先用預設風格/);
  await page.getByRole('button', { name: '喜歡', exact: true }).click();     // 溫暖木質 ♥
  await page.waitForFunction(() => document.querySelector('.count').textContent.startsWith('2 '));
  await page.keyboard.press('ArrowLeft');                                       // 深色現代 ✕
  await page.waitForFunction(() => document.querySelector('.count').textContent.startsWith('3 '));
  await page.locator('#undo').click();                                          // 撤回
  await page.waitForFunction(() => document.querySelector('.count').textContent.startsWith('2 '));
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => document.querySelector('.count').textContent.startsWith('3 '));
  assert.equal(await page.locator('.card').last().getAttribute('data-style'), 'nordic');
  const box = await page.locator('.card').last().boundingBox();               // 日光北歐：拖曳右滑
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 220, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('.count').textContent.startsWith('4 '));
  assert.match(await page.locator('#likedcount').innerText(), /已喜歡 2 張/);
  assert.match(await page.locator('#talk').innerText(), /房間換成|方向有了/);
  await page.locator('#skip').click();

  // ③ 設計：靜止時不重畫；亮亮一次一句；法規摘要跟設計連動
  await page.getByRole('heading', { name: /^客廳・(溫暖木質|日光北歐)$/ }).waitFor();
  await onStage('3', '#tocost');
  await ready(page);
  assert.equal(await page.evaluate(() => window.__room.stats().ready), true);
  await page.waitForTimeout(1500);
  const idle = await page.evaluate(() => window.__room.stats().frames);
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => window.__room.stats().frames), idle, `${name}: 3D must not render while idle`);
  await page.getByRole('button', { name: '視角 B' }).click();
  await page.waitForTimeout(600);
  assert.match(await page.locator('#designer').innerText(), /^\s*沙發靠牆[^\n]*和茶几之間留 40 公分[^\n]*\s*$/, 'the designer says one sentence');
  assert.equal(await page.locator('#whyso').getAttribute('open'), null, 'the rest is folded under 為什麼這樣配');
  assert.equal(await page.locator('#regsum').innerText().then((t) => t.replace(/\s+/g, ' ')), '這個設計需申請室內裝修許可・另外 3 項要注意・再回答 2 題就能判斷完 看細節');
  await page.locator('#regsum').click();
  await page.locator('#regdetail li', { hasText: '防焰地毯' }).waitFor();
  assert.equal(await page.locator('#regdetail li .state', { hasText: '需辦理' }).count(), 4, 'the permit plus the 3 other items: the headline and the list agree');
  assert.equal(await page.locator('#regdetail details[open]').count(), 0, 'explanations and articles stay folded');
  await page.locator('#regdetail li', { hasText: '撒水頭淨空' }).getByRole('button', { name: '有撒水頭' }).click();   // 當場回答一題
  await page.waitForFunction(() => document.querySelector('#regsum').textContent.includes('另外 4 項要注意・再回答 1 題'));
  await page.fill('#ask-unitFloor', '8'); await page.press('#ask-unitFloor', 'Enter');
  await page.waitForFunction(() => /另外 4 項要注意\s*收起/.test(document.querySelector('#regsum').textContent));
  await snap('3-regs');
  const before = await page.locator('#teaser').innerText();
  await page.getByRole('button', { name: '地毯拿掉' }).click();
  await page.locator('#undoedit').waitFor();
  assert.equal(await page.locator('#regdetail li', { hasText: '防焰地毯' }).count(), 0, 'removing the rug removes its fire-safety item');
  assert.match(await page.locator('#designer').innerText(), /好，地毯拿掉。預估少約 [\d.]+ 萬（家具軟裝）；不用再處理防焰地毯。/);
  await page.locator('#regsum').click();                                       // 收起
  assert.equal(await page.getByRole('button', { name: '地毯拿掉' }).getAttribute('aria-pressed'), 'true', 'an applied edit looks selected');
  assert.notEqual(await page.locator('#teaser').innerText(), before, 'editing the design changes the estimate');
  await page.locator('#undoedit').click();                                     // 復原、再套用
  await page.waitForFunction((t) => document.querySelector('#teaser').textContent === t, before);
  await page.getByRole('button', { name: '地毯拿掉' }).click();
  await page.locator('#undoedit').waitFor();
  assert.deepEqual(await page.evaluate(() => window.__room.stats().size), { w: 5.6, d: 4.7, h: 2.8, clamped: false, space: '客廳' }, '3D room uses the real size');
  await snap('3-design'); await noOverflow('3');
  await page.locator('#tocost').click();

  // ④ 花費：不問預算；屋況會改變金額；圖要付費才清楚
  await page.getByRole('heading', { name: '估價與施工圖初稿' }).waitFor();
  await onStage('4', '#unlockmine');
  assert.equal(await page.getByText('預算').count(), 0, 'never asks for a budget');
  assert.equal(await page.evaluate(() => document.querySelector('#scene canvas') === window.__canvas && document.querySelectorAll('canvas').length), 1, 'the stage canvas was created once and never remounted');
  assert.match(await page.locator('#ping').innerText(), /8 坪・5.6 × 4.7 公尺/);
  assert.match(await page.locator('#know').innerText(), /基本資料完整度 70%，區間已收窄 35%/);
  assert.match(await page.locator('#estkind').innerText(), /範例估算，非正式報價/);   // 屋況還沒選
  assert.match(await page.locator('#stages').innerText(), /1　AI 初稿[\s\S]*現在[\s\S]*2　專業團隊確認[\s\S]*流程確認中[\s\S]*3　施工圖定稿[\s\S]*標準確認中/);
  assert.ok((await page.locator('.sheetbtn').first().innerHTML()).includes('5600'), 'drawings use the real length');
  const regs = page.locator('#regs');
  await page.locator('#regline').click();                                     // 這一頁只留一行摘要，點開才是清單
  assert.match(await txt(regs.locator('li', { hasText: '室內裝修許可' })), /需辦理[\s\S]*施工前要申請[\s\S]*12 層集合住宅[\s\S]*建築法第 77-2 條、建築物室內裝修管理辦法第 3 條[\s\S]*解釋令/);
  assert.match(await txt(regs.locator('li', { hasText: '防焰窗簾' })), /需辦理[\s\S]*消防法第 11 條[\s\S]*門檻明確/);
  assert.equal(await regs.locator('li', { hasText: '防焰地毯' }).count(), 0, 'the rug was removed on the design page, so its item is gone');
  assert.equal(await regs.locator('li', { hasText: '裝修材料耐燃等級' }).count(), 0, '不適用 items are folded away');
  assert.match(await regs.locator('a', { hasText: '消防法第 11 條' }).first().getAttribute('href'), /^https:\/\/law\.moj\.gov\.tw\//);
  assert.ok((await page.locator('.sheetbtn').nth(3).innerHTML()).includes('撒水頭淨空'), 'the elevation marks the sprinkler clearance');
  { const dl = page.waitForEvent('download'); await page.locator('#exportsum').click();   // 把方案帶走
    assert.match(readFileSync(await (await dl).path(), 'utf8'), /回家之前｜客廳設計方案摘要[\s\S]*（調整：地毯拿掉）[\s\S]*5.6 × 4.7 公尺[\s\S]*【預估花費】[\s\S]*這個設計需申請室內裝修許可[\s\S]*還要現場確認[\s\S]*#r=/); }
  const total = await page.locator('#total').innerText();
  await page.getByRole('button', { name: '中古屋' }).click();
  assert.notEqual(await page.locator('#total').innerText(), total);
  assert.match(await page.locator('#estkind').innerText(), /初步估算，非正式報價/);
  await page.locator('.items').getByText('中古屋基礎工程').waitFor();
  assert.equal(await page.locator('.sheetbtn').count(), 6);
  assert.match(await page.locator('.sheetbtn svg').first().evaluate((el) => getComputedStyle(el).filter), /blur/);
  await snap('4-cost'); await noOverflow('4');
  await page.locator('.sheetbtn').first().click();                             // 未解鎖：點圖只會跳付費
  await page.getByRole('heading', { name: '解鎖施工圖初稿' }).waitFor();
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
  await page.locator('#viewer').getByRole('button', { name: '關閉' }).click();

  // 重新整理後進度還在（上傳的檔案除外，並提醒重附）
  await page.reload();
  await page.getByRole('heading', { name: '你家尺寸的施工圖初稿（已解鎖）' }).waitFor();
  assert.match(await page.locator('#ping').innerText(), /8 坪・5.6 × 4.7 公尺/);
  await page.locator('#steps button').nth(0).click();
  await page.locator('#lostdocs').waitFor();
  await page.locator('#openform').click();
  assert.equal(await page.inputValue('#f-floors'), '12');
  if (name === 'phone') {   // 手機：貼底的動作列不會蓋住最後的內容
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const bar = await page.locator('#actions').boundingBox(), last = await page.locator('#app > :last-child').boundingBox();
    assert.ok(bar.y + bar.height <= viewport.height + 1 && last.y + last.height <= bar.y + 1, 'at the end of the page the content sits above the docked action bar');
  }

  // 什麼都沒給的人：圖只是範例，不賣；先請他補尺寸
  await page.getByRole('button', { name: '重新開始' }).click();
  await page.locator('#where').getByRole('button', { name: '客廳' }).click();
  await page.locator('#generate').click();
  await page.locator('#skip').click();
  assert.match(await page.locator('#assume').innerText(), /以 8 坪（預設）、新成屋（預設）估算/);
  await page.locator('#tocost').click();
  await page.getByRole('heading', { name: '施工圖初稿（範例）' }).waitFor();
  assert.match(await page.locator('#assume4').innerText(), /8 坪（預設，你還沒填）、新成屋（預設，你還沒選）/);
  assert.match(await page.locator('#docsnote').innerText(), /這是範例空間的圖[\s\S]*還缺：長、寬/);
  assert.equal(await page.locator('.locked').count(), 0, 'example drawings are not blurred');
  assert.equal(await page.locator('#unlockmine').count(), 0, 'nothing to buy until the drawings are about this home');
  await page.locator('.sheetbtn').first().click();                             // 範例可以直接放大看，但不能下載
  await page.locator('#viewer svg').waitFor();
  assert.match(await page.locator('#viewerNote').innerText(), /範例空間/);
  assert.equal(await page.locator('#viewerDownload').isVisible(), false);
  await page.locator('#viewer').getByRole('button', { name: '關閉' }).click();
  const before9 = await page.locator('#total').innerText();
  await page.getByRole('button', { name: '增加坪數' }).click();                 // 沒填長寬的人仍可以直接調坪數
  assert.match(await page.locator('#ping').innerText(), /^9 坪$/);
  assert.notEqual(await page.locator('#total').innerText(), before9);
  await page.locator('#regline').click();
  assert.equal(await page.locator('#regs #ask-floors').count(), 1, 'the missing answer can be given right there');
  await page.locator('#needhome').click();
  await page.getByRole('heading', { name: '你家客廳大概多大？' }).waitFor();
  await context.close();
}

{ // 整戶：丟平面圖 → 確認房間 → 挑風格 → 一間一間看 → 整戶加總
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...quiet });
  const page = await open(context, 'home');
  await page.goto(base);
  await ready(page);
  await page.setInputFiles('#planFile', { name: '我家平面圖.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('heading', { name: '你家有這些房間，對嗎？' }).waitFor();
  assert.match(await page.locator('#asking').innerText(), /我還不會自動讀平面圖/, 'says plainly that the plan is not read automatically');
  assert.equal(await page.locator('#rooms li').count(), 8);
  assert.equal(await page.locator('#plan [data-room]').count(), 8, 'the stage shows the schematic plan');
  assert.match(await page.locator('#where2').innerText(), /你家・三房兩廳・8 個空間・室內約 \d+ 坪/);
  assert.match(await page.locator('#teaser').innerText(), /^— 萬$/, 'no number before a style is chosen');
  await page.locator('#rooms li', { hasText: '客衛' }).getByRole('checkbox').uncheck();
  await page.locator('#roomsok', { hasText: '對，7 間都做' }).waitFor();
  await page.locator('#rooms li', { hasText: '主臥' }).getByRole('button', { name: '改主臥' }).click();   // 尺寸不對點一下就能改
  await page.locator('#rooms .edit input[aria-label="長（公尺）"]').fill('4.5');
  await page.locator('#rooms .edit').getByRole('button', { name: '完成' }).click();
  await page.locator('#rooms li', { hasText: '主臥' }).getByText('4.5 × 3.9 公尺').waitFor();
  await page.getByRole('button', { name: '中古屋' }).click();
  await page.locator('#roomsok').click();
  await page.getByRole('heading', { name: '喜歡這種感覺嗎？' }).waitFor();
  assert.equal(await page.locator('#plan').isVisible(), true, 'the plan stays on the stage while choosing a style');
  await page.locator('.round.like').click();
  await page.waitForFunction(() => document.querySelector('.count').textContent.startsWith('2 '));
  await page.locator('#skip').click();
  // 一間一間看：房間列、點平面圖換房間、下一間
  await page.getByRole('heading', { name: '客廳・溫暖木質' }).waitFor();
  assert.deepEqual(await page.locator('#roomtabs button').allTextContents(), ['整戶', '客廳', '餐廳', '廚房', '主臥', '次臥 1', '次臥 2', '主衛']);
  assert.equal(await page.locator('#minimap [data-room]').count(), 7);
  await page.waitForFunction(() => window.__room?.stats().size.space === '客廳' && window.__room.stats().size.w === 5.6);
  const living = await page.locator('#teaser').innerText();
  await page.getByRole('button', { name: '地毯拿掉' }).click();
  await page.locator('#nextroom', { hasText: '下一間：餐廳' }).click();
  await page.getByRole('heading', { name: '餐廳・溫暖木質' }).waitFor();                // 每一間都有設計：餐廳是餐桌椅
  await page.waitForFunction(() => window.__room.stats().size.space === '餐廳', null, { timeout: 30000 });
  assert.match(await page.locator('#designer').innerText(), /餐桌放中間，配 4 張椅子/);
  assert.match(await page.locator('#teaser').innerText(), /^\d+–\d+ 萬$/);
  await page.locator('#roomtabs').getByRole('button', { name: '廚房' }).click();
  await page.getByRole('heading', { name: '廚房・溫暖木質' }).waitFor();
  assert.match(await page.locator('#designer').innerText(), /一字型流理台/);
  assert.equal(await page.getByRole('button', { name: '地毯拿掉' }).count(), 0, 'a kitchen has no rug to remove');
  await page.locator('#roomtabs').getByRole('button', { name: '主衛' }).click();
  await page.getByRole('heading', { name: '主衛・溫暖木質' }).waitFor();
  assert.match(await page.locator('#designer').innerText(), /洗手台和馬桶/);
  await page.locator('#roomtabs').getByRole('button', { name: '主臥' }).click();
  await page.getByRole('heading', { name: '主臥・溫暖木質' }).waitFor();
  await page.waitForFunction(() => window.__room.stats().size.space === '臥室' && window.__room.stats().size.w === 4.5, null, { timeout: 30000 });
  assert.match(await page.locator('#designer').innerText(), /床頭靠牆/);
  assert.notEqual(await page.locator('#teaser').innerText(), living);
  await page.locator('#minimap [data-room="r1"]').click();                      // 點小平面圖回客廳；改過的細節還在
  await page.getByRole('heading', { name: '客廳・溫暖木質' }).waitFor();
  assert.equal(await page.getByRole('button', { name: '地毯拿掉' }).getAttribute('aria-pressed'), 'true', 'each room keeps its own edits');
  await page.locator('.styleopt', { hasText: '日光北歐' }).click();             // 換風格：整個家一起換
  await page.getByRole('heading', { name: '客廳・日光北歐' }).waitFor();
  await page.locator('#styleall input').uncheck();                              // 不勾「整個家一起換」：只換這一間
  await page.locator('.styleopt', { hasText: '深色現代' }).click();
  await page.getByRole('heading', { name: '客廳・深色現代' }).waitFor();
  assert.match(await page.locator('#designer').innerText(), /只有客廳換成深色現代/);
  await page.locator('#roomtabs').getByRole('button', { name: '主臥' }).click();
  await page.getByRole('heading', { name: '主臥・日光北歐' }).waitFor();
  await page.locator('#roomtabs').getByRole('button', { name: '整戶' }).click();
  await page.getByRole('heading', { name: '整個家' }).waitFor();
  assert.equal(await page.locator('#plan').isVisible(), true);
  if (shots) { await page.waitForTimeout(450); await page.screenshot({ path: `${shots}/home-3-all.png` }); }
  await page.locator('#tocost').click();
  // 整戶花費：依房間／依工項，取消勾選合計馬上更新
  await page.locator('#byroom').waitFor();
  const sum = async () => (await page.locator('#byroom .amt').allTextContents()).map((t) => t.match(/(\d+)–(\d+)/).slice(1).map(Number)).reduce((a, [lo, hi]) => [a[0] + lo, a[1] + hi], [0, 0]);
  const [lo, hi] = await sum();
  assert.equal((await page.locator('#total').innerText()).replace(/\s+/g, ''), `${lo}–${hi}萬`, 'the total is the sum of the rooms');
  assert.equal(await page.locator('#teaser').innerText(), `${lo}–${hi} 萬`);
  assert.match(await page.locator('#assume4').innerText(), /兩廳・7 個空間[\s\S]*中古屋/);
  assert.equal(await page.locator('#byroom .amt').count(), 7, 'every room being done has a number');
  await page.locator('#byroom li', { hasText: '主臥' }).getByRole('checkbox').uncheck();
  await page.waitForFunction((t) => document.querySelector('#total').textContent.replace(/\s+/g, '') !== t, `${lo}–${hi}萬`);
  assert.ok((await sum())[1] < hi);
  await page.getByRole('button', { name: '依工項' }).click();
  await page.locator('#byitem').getByText('地坪').waitFor();
  if (shots) { await page.waitForTimeout(450); await page.screenshot({ path: `${shots}/home-4-cost.png` }); }
  await page.reload();                                                          // 重新整理：整戶的房間還在
  await page.locator('#byroom').waitFor();
  assert.equal(await page.locator('#byroom li').count(), 8, 'seven rooms plus the one switched off stay listed');
  await context.close();
}

{ // 開不了 3D 的裝置：同一個舞台位置改放 2D 示意圖，並收起沒有作用的視角按鈕
  const context = await browser.newContext({ viewport: { width: 1366, height: 860 }, ...quiet });
  const page = await open(context, 'no-webgl');
  await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...a) { return /webgl/.test(type) ? null : get.call(this, type, ...a); }; });
  await page.goto(base);
  await page.getByText('2D 示意圖（這台裝置無法顯示 3D）').waitFor({ timeout: 30000 });
  await page.locator('#where').getByRole('button', { name: '客廳' }).click();
  await page.locator('#generate').click();
  await page.locator('#skip').click();
  await page.getByRole('heading', { name: '客廳・溫暖木質' }).waitFor();
  assert.equal(await page.getByRole('button', { name: '視角 B' }).isVisible(), false, 'view buttons that do nothing are hidden');
  assert.equal(await page.locator('.scene > svg').count(), 1);
  await page.locator('#tocost').click();
  await page.getByRole('heading', { name: '估價與施工圖初稿' }).waitFor();
  await context.close();
}

{ // 一句話講到主臥就切到臥室；分享連結：別人打開就看到同一個設計與條件
  const context = await browser.newContext({ viewport: { width: 1366, height: 860 }, ...quiet });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await open(context, 'share');
  await page.goto(base);
  await page.locator('#where').getByRole('button', { name: '客廳' }).click();
  await page.fill('#say', '只想裝潢主臥，大概 5 坪，長 4 米 2、寬 3 米 8，天花板 2 米 7，老屋，12 樓高的大樓，不動隔間'); await page.press('#say', 'Enter');
  await page.getByText('聽到：空間 臥室、坪數 5 坪、長 4.2 公尺、寬 3.8 公尺、天花板高 2.7 公尺、建物總樓層 12 層、隔間 不動、屋況 老屋、坪數依長寬換算為 4.8 坪').waitFor();
  await page.getByRole('heading', { name: '你家臥室大概多大？' }).waitFor();
  await page.locator('#generate').click();
  assert.match(await page.locator('#talk').innerText(), /^\s*圖是客廳的，先挑風格。\s*$/);
  await page.locator('.round.like').click();
  await page.waitForFunction(() => document.querySelector('.count').textContent.startsWith('2 '));
  await page.locator('#skip').click();
  await page.getByRole('heading', { name: '臥室・溫暖木質' }).waitFor();
  await page.waitForFunction(() => window.__room?.stats().size.space === '臥室', null, { timeout: 30000 });
  await page.fill('#tell', '幫我加一個中島'); await page.press('#tell', 'Enter');          // 用說的改：聽不懂就照實說
  await page.locator('#designer').getByText('我還不會改').waitFor();
  await page.fill('#tell', '我不要地毯，衣櫃換成白色'); await page.press('#tell', 'Enter');   // 一句兩件事：做得到的做，做不到的說
  await page.locator('#undoedit').waitFor();
  assert.match(await page.locator('#designer').innerText(), /好，地毯拿掉。[\s\S]*「衣櫃換成白色」我還不會改/);
  const price = await page.locator('#teaser').innerText();
  await page.locator('#share').click();
  await page.getByText('已複製連結').waitFor();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(url, /#r=[A-Za-z0-9_-]+$/);
  await page.locator('#tocost').click();
  await page.locator('.items').getByText('衣櫃與斗櫃').waitFor();
  assert.ok((await page.locator('.sheetbtn').first().innerHTML()).includes('雙人床'), 'the plan shows a bed');
  await page.locator('#withfurniture input').uncheck();
  await page.waitForFunction(() => !document.querySelector('.items').textContent.includes('家具軟裝'));
  const other = await open(await browser.newContext({ viewport: { width: 1366, height: 860 }, ...quiet }), 'shared');   // 另一個人、乾淨的瀏覽器
  await other.goto(url);
  await other.getByRole('heading', { name: '臥室・溫暖木質' }).waitFor({ timeout: 30000 });
  assert.equal(await other.locator('#teaser').innerText(), price, 'same design and conditions give the same estimate');
  assert.match(await other.locator('#ctx').innerText(), /4.2 × 3.8 公尺/);
  assert.match(await other.locator('#assume').innerText(), /老屋估算/);
  assert.equal(await other.getByRole('button', { name: '地毯拿掉' }).getAttribute('aria-pressed'), 'true');
  assert.equal(new URL(other.url()).hash, '', 'the hash is consumed so a reload keeps the local copy');
  await context.close();
}
await browser.close();
assert.deepEqual(errors, []);
console.log('e2e ok');
