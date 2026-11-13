// End-to-end check of the flow on desktop and phone widths: 滑卡 → 我家的條件 → 3D → 估價與施工圖.
// Usage: node e2e/flow.e2e.mjs [baseUrl] [screenshotDir]
import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const shots = process.argv[3];
const browser = await chromium.launch();
const errors = [];
// 動態一律直接切換（prefers-reduced-motion），測的是結果不是補間；字體用空的樣式表代替，不依賴外部字體服務
const quiet = { reducedMotion: 'reduce' };
const stub = (page) => page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.fulfill({ contentType: 'text/css', body: '' }));
for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport, ...quiet });
  await stub(page);
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${name}: ${r.status()} ${r.url()}`); });
  // the wall hot-links Pinterest's image host; serve a stand-in so the test does not depend on it
  await page.route('https://i.pinimg.com/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50"><rect width="40" height="50" fill="#b9a58c"/></svg>' }));
  const snap = async (n) => { if (!shots) return; await page.waitForTimeout(450); await page.screenshot({ path: `${shots}/${name}-${n}.png` }); };
  // 驗收：房間在首屏且至少佔視窗 35%；這個狀態的主要動作不用捲動就看得到
  const onStage = async (at, action) => {
    await page.evaluate(() => { scrollTo(0, 0); document.querySelector('#app').scrollTop = 0; });
    const m = await page.evaluate((sel) => {
      const r = document.querySelector('#scene').getBoundingClientRect(), a = document.querySelector(sel).getBoundingClientRect();
      const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)), hgt = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      return { share: (w * hgt) / (innerWidth * innerHeight), top: a.top, bottom: a.bottom, vh: innerHeight };
    }, action);
    assert.ok(m.share >= 0.35, `${name} ${at}: the room takes ${Math.round(m.share * 100)}% of the screen`);
    assert.ok(m.top >= 0 && m.bottom <= m.vh, `${name} ${at}: the main action (${action}) is on the first screen`);
  };
  const noOverflow = async (at) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `${name} ${at}: horizontal overflow ${overflow}px`);
  };
  await page.goto(base);
  await page.evaluate(() => localStorage.clear()); await page.reload();   // 從乾淨的狀態開始

  // 開場：一句承諾、成果預覽、設計師先問想弄哪裡（只多一次點擊）
  await page.getByRole('heading', { name: '滑幾張圖，我幫你設計你家' }).waitFor();
  assert.match(await page.locator('#greeting').innerText(), /我來幫你設計你家。想先弄哪裡？/);
  // 房間從第一秒就在舞台上：同一個 canvas 一路用到最後一步
  await page.locator('.scene[data-ready] canvas').waitFor({ timeout: 30000 });
  await page.evaluate(() => { window.__canvas = document.querySelector('#scene canvas'); });
  assert.match(await page.locator('#pricekind').innerText(), /範例/);
  const sample = await page.locator('#teaser').innerText();
  assert.match(sample, /^\d+–\d+ 萬$/);
  assert.deepEqual(await page.locator('#dims .dim').allInnerTexts().then((a) => a.map((t) => t.split('\n')[0])), ['5610', '4710', '2800'], 'dimension lines in millimetres');
  await page.locator('#swatches').getByRole('button', { name: '深色現代' }).click();   // 還沒選空間就能玩：點色票，房間與金額都變
  await page.waitForFunction((t) => document.querySelector('#teaser').textContent !== t, sample);
  await page.locator('#swatches').getByRole('button', { name: '溫暖木質' }).click();
  await onStage('0', '#where .tile');
  await snap('0-intro'); await noOverflow('0');
  await page.locator('#where').getByRole('button', { name: '客廳' }).click();
  // 1 滑卡：按鈕、鍵盤、拖曳三種方式；卡片是 Pinterest 的圖並附來源
  await page.locator('.card').first().waitFor();
  assert.match(await page.locator('#talk').innerText(), /好，客廳。挑喜歡的，接著看你家尺寸的 3D 和預算。不用滑完。/);
  assert.match(await page.locator('.count').innerText(), /1 \/ 18/);
  assert.match(await page.locator('.card img').last().getAttribute('src'), /^https:\/\/i\.pinimg\.com\//);
  assert.match(await page.locator('.card a').last().getAttribute('href'), /^https:\/\/www\.pinterest\.com\//);
  await onStage('1', '.round.like');
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
  assert.match(await page.locator('#talk').innerText(), /收到，你家客廳會偏|我知道你的方向了/);
  await page.locator('#seeit:visible, #skip:visible').first().click();   // 設計師問了，回答的按鈕就在那句話旁邊

  // 2 我家的條件：都是選填；給得越多基本資料完整度越高
  await page.getByRole('heading', { name: '多告訴我一點你家' }).waitFor();
  assert.match(await page.locator('#score').innerText(), /基本資料完整度 0%/);
  await onStage('2', '#generate');
  assert.match(await page.locator('#asking').innerText(), /你家客廳的長和寬大概幾公尺？/);   // 設計師先問最有用的那一項
  await page.locator('#generate').waitFor();
  // 用一句話（語音辨識的結果走同一條路）：聽得出來的欄位自動填好
  // 開頭只有一句問題、答案欄位和一句話輸入；完整欄位與參考圖收著
  assert.ok(!/null|undefined/.test(await page.locator('#app').innerText()), 'nothing prints as null');
  assert.equal(await page.locator('#f-len').count(), 1, 'the answer to the question sits right under it');
  assert.equal(await page.locator('#f-floors').count() + await page.locator('#docFile').count() + await page.locator('#taste').count() + await page.locator('#spaces').count(), 0, 'the form, uploads and repeated style/space pickers are not shown up front');
  await page.fill('#say', '客廳長五米六、寬四米七，十二層樓的大樓，隔間不動'); await page.press('#say', 'Enter');   // Enter 直接送出
  assert.equal(await page.locator('#saysend').isVisible(), true, 'there is also a visible send button');
  await page.getByText('聽到：空間 客廳、長 5.6 公尺、寬 4.7 公尺、建物總樓層 12 層、隔間 不動').waitFor();
  await page.locator('#openform').click();                                     // 想自己填的人再打開
  assert.equal(await page.inputValue('#f-floors'), '12');
  assert.equal(await page.locator('#part-no').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.inputValue('#f-len'), '5.6');
  assert.equal(await page.inputValue('#f-wid'), '4.7');
  await page.waitForFunction(() => document.querySelector('#f-ping').value === '8');   // 長×寬 換算坪數
  assert.match(await page.locator('#pingnote').innerText(), /依長 × 寬換算為 8 坪/);
  assert.match(await page.locator('#asking').innerText(), /天花板有撒水頭嗎/, 'the designer moves on to the next unanswered item');
  assert.match(await page.locator('#score').innerText(), /基本資料完整度 60%/);
  await page.locator('#opendocs').click();
  assert.match(await page.locator('#docsrole').innerText(), /不會被自動判讀，不會改變 3D 或金額/);
  await page.setInputFiles('#docFile', [
    { name: '3F 機電圖.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') },
    { name: '平面圖.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') },
    { name: 'model.dwg', mimeType: 'application/acad', buffer: Buffer.from('x') },
  ]);
  await page.getByRole('alert').getByText('只收圖片或 PDF').waitFor();
  assert.equal(await page.locator('.docs li').count(), 2);
  assert.equal(await page.locator('.docs li').first().getByRole('button', { name: '機電圖', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#score').innerText(), /基本資料完整度 60%/, 'uploads are reference material: they do not raise the score');
  // 防呆：離譜的尺寸不收，欄位旁說明原因，也不會前進
  await page.fill('#f-len', '500');
  await page.locator('#generate').click();
  await page.locator('#e-len').getByText('長最多 60 公尺，請確認單位是公尺').waitFor();
  assert.equal(await page.getByRole('heading', { name: '多告訴我一點你家' }).count(), 1, 'a wrong field keeps you on the page');
  assert.equal(await page.locator('#f-len').getAttribute('aria-invalid'), 'true');
  await page.fill('#f-len', '-3'); await page.locator('#f-len').blur();
  await page.locator('#e-len').getByText('長要大於 0').waitFor();
  await snap('2-error');
  await page.fill('#f-len', '5.6'); await page.locator('#f-len').blur();
  // 填了尺寸，舞台上的房間和尺寸線當場變
  await page.waitForFunction(() => document.querySelector('#dims').textContent.includes('5600') && window.__room.stats().size.w === 5.6);
  await snap('2-context'); await noOverflow('2');
  await page.fill('#f-wid', '4.7');
  await page.locator('#generate').click();   // 游標還在欄位裡：按一次就要前進

  // 3 3D 示意：喜歡的那一種，靜止時不重畫
  await page.getByRole('heading', { name: '客廳・日光北歐' }).waitFor();
  await onStage('3', '#tocost');
  await page.locator('.scene[data-ready] canvas').waitFor({ timeout: 30000 }); // furniture models and materials are in
  assert.equal(await page.evaluate(() => window.__room.stats().ready), true);
  await page.waitForTimeout(1500);
  const idle = await page.evaluate(() => window.__room.stats().frames);
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => window.__room.stats().frames), idle, `${name}: 3D must not render while idle`);
  await page.getByRole('button', { name: '視角 B' }).click();
  await page.waitForTimeout(900);
  // 設計師解釋這個配置是怎麼決定的
  assert.match(await page.locator('#designer').innerText(), /^\s*沙發靠牆[^\n]*和茶几之間留 40 公分[^\n]*\s*$/, 'the designer says one sentence');
  assert.equal(await page.locator('#whyso').getAttribute('open'), null, 'the rest is folded under 為什麼這樣配');
  assert.match(await page.locator('#whyso').evaluate((d) => d.textContent), /高櫃做在窗戶旁那面牆/);
  // 法規評估就在金額旁邊：一行結論，點開看細節；跟設計連動
  assert.equal(await page.locator('#regsum').innerText().then((t) => t.replace(/\s+/g, ' ')), '這個設計需申請室內裝修許可・另外 3 項要注意・再回答 2 題就能判斷完 看細節');
  await page.locator('#regsum').click();
  await page.locator('#regdetail li', { hasText: '防焰地毯' }).waitFor();
  assert.equal(await page.locator('#regdetail li .state', { hasText: '需辦理' }).count(), 4, 'the permit plus the 3 other items: the headline and the list agree');
  assert.match(await page.locator('#regdetail li', { hasText: '防焰地毯' }).locator('.brief').innerText(), /^地毯選附防焰標示的產品$/);
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
  assert.match(await page.locator('#designer').innerText(), /好，地毯拿掉。預估少約 [\d.]+ 萬（家具軟裝）；不用再處理防焰地毯。/, 'the designer reports the cost and regulatory effect of the change');
  await page.waitForFunction(() => document.querySelector('#regsum').textContent.includes('另外 3 項要注意'));
  await page.locator('#regsum').click();                                       // 收起
  assert.equal(await page.getByRole('button', { name: '地毯拿掉' }).getAttribute('aria-pressed'), 'true', 'an applied edit looks selected');
  assert.notEqual(await page.locator('#teaser').innerText(), before, 'editing the design changes the estimate');
  await page.locator('#undoedit').click();                                     // 復原、再套用
  await page.waitForFunction((t) => document.querySelector('#teaser').textContent === t, before);
  assert.equal(await page.getByRole('button', { name: '地毯拿掉' }).getAttribute('aria-pressed'), 'false');
  await page.getByRole('button', { name: '地毯拿掉' }).click();
  await page.locator('#undoedit').waitFor();
  await page.locator('.scene[data-ready] canvas').waitFor({ timeout: 30000 });
  if (name === 'phone') { const b = await page.locator('.cta').boundingBox(); assert.ok(b.y + b.height <= viewport.height && b.y > viewport.height - 120, 'the main button stays docked at the bottom of the phone screen'); }
  assert.match(await page.locator('#ctx').innerText(), /這個房間：5.6 × 4.7 公尺、高 2.8 公尺（8 坪）。門窗、柱位待現場確認。/);
  assert.deepEqual(await page.evaluate(() => window.__room.stats().size), { w: 5.6, d: 4.7, h: 2.8, clamped: false, space: '客廳' }, '3D room uses the real size');
  await snap('3-3d'); await noOverflow('3');
  await page.locator('#tocost').click();

  // 4 估價與施工圖：不問預算；坪數、屋況會改變金額；圖要付費才清楚
  await page.getByRole('heading', { name: '估價與施工圖' }).waitFor();
  assert.equal(await page.getByText('預算').count(), 0, 'never asks for a budget');
  assert.equal(await page.evaluate(() => document.querySelector('#scene canvas') === window.__canvas && document.querySelectorAll('canvas').length), 1, 'the stage canvas was created once and never remounted');
  assert.match(await page.locator('#ping').innerText(), /8 坪・5.6 × 4.7 公尺/);
  assert.equal(await page.getByRole('button', { name: '增加坪數' }).count(), 0, 'no stepper that would discard the real dimensions');
  assert.match(await page.locator('#know').innerText(), /基本資料完整度 70%，區間已收窄 35%/);
  assert.match(await page.locator('#estkind').innerText(), /範例估算，非正式報價/);   // 屋況還沒選
  assert.match(await page.locator('#stages').innerText(), /1　AI 初稿[\s\S]*現在[\s\S]*2　專業團隊確認[\s\S]*流程確認中[\s\S]*3　施工圖定稿[\s\S]*標準確認中/);
  assert.ok((await page.locator('.sheetbtn').first().innerHTML()).includes('5600'), 'drawings use the real length');
  assert.match(await page.locator('#docsnote').innerText(), /已附 格局／平面圖 1 份、機電圖 1 份/);
  await page.getByRole('heading', { name: '你家尺寸的施工圖初稿' }).waitFor();
  // 法規與施工條件：12 層、不動隔間
  const regs = page.locator('#regs');
  await page.locator('#regline').click();                                     // 這一頁只留一行摘要，點開才是清單
  const txt = (l) => l.evaluate((e) => e.textContent);
  assert.match(await txt(regs.locator('li', { hasText: '室內裝修許可' })), /需辦理[\s\S]*施工前要申請[\s\S]*12 層集合住宅[\s\S]*建築法第 77-2 條、建築物室內裝修管理辦法第 3 條[\s\S]*解釋令/);
  assert.match(await txt(regs.locator('li', { hasText: '防焰窗簾' })), /需辦理[\s\S]*消防法第 11 條[\s\S]*門檻明確/);
  assert.equal(await regs.locator('li', { hasText: '防焰地毯' }).count(), 0, 'the rug was removed on the 3D page, so its item is gone');
  assert.match(await txt(regs.locator('li', { hasText: '撒水頭淨空' })), /45 公分/);
  assert.equal(await regs.locator('li', { hasText: '裝修材料耐燃等級' }).count(), 0, '不適用 items are folded away');
  await page.locator('#regsmore').click();
  await regs.locator('li', { hasText: '裝修材料耐燃等級' }).waitFor();
  assert.match(await regs.locator('a', { hasText: '消防法第 11 條' }).first().getAttribute('href'), /^https:\/\/law\.moj\.gov\.tw\//);
  assert.ok((await page.locator('.sheetbtn').nth(3).innerHTML()).includes('撒水頭淨空'), 'the elevation marks the sprinkler clearance');
  { const dl = page.waitForEvent('download'); await page.locator('#exportsum').click();   // 下一步：把方案帶走
    const file = await (await dl).path(), text = (await import('node:fs')).readFileSync(file, 'utf8');
    assert.match(text, /回家之前｜客廳設計方案摘要[\s\S]*風格：日光北歐（調整：地毯拿掉）[\s\S]*5.6 × 4.7 公尺[\s\S]*【預估花費】[\s\S]*這個設計需申請室內裝修許可[\s\S]*還要現場確認[\s\S]*#r=/); }
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
  await page.locator('#openform').click();
  assert.equal(await page.inputValue('#f-floors'), '12');
  await page.locator('#opendocs').click();
  if (name === 'phone') {   // 手機：底部主要按鈕不會蓋住最後的內容
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const cta = await page.locator('.cta').boundingBox(), drop = await page.locator('#drop').boundingBox();
    assert.ok(drop.y + drop.height <= cta.y, 'at the end of the page the upload area sits above the bottom button');
  }

  // 什麼都沒給的人：圖只是範例，不賣；先請他補尺寸或平面圖
  await page.getByRole('button', { name: '重新開始' }).click();
  await page.locator('#where').getByRole('button', { name: '客廳' }).click();
  await page.locator('#skip').click();
  await page.locator('#generate').click();
  assert.match(await page.locator('#assume').innerText(), /以 8 坪（預設）、新成屋（預設）估算/);
  await page.locator('#tocost').click();
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
  assert.match(await page.locator('#regline').innerText(), /要不要申請室內裝修許可，還差一個答案/);
  await page.locator('#regline').click();
  assert.equal(await page.locator('#regs #ask-floors').count(), 1, 'the missing answer can be given right there');
  await page.locator('#needhome').click();
  await page.getByRole('heading', { name: '多告訴我一點你家' }).waitFor();
  await page.close();
}
{ // 開不了 3D 的裝置：明講是 2D 示意圖，並收起沒有作用的視角按鈕
  const page = await browser.newPage({ viewport: { width: 1366, height: 860 }, ...quiet });
  await stub(page);
  await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...a) { return /webgl/.test(type) ? null : get.call(this, type, ...a); }; });
  await page.route('https://i.pinimg.com/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="5"/>' }));
  await page.goto(base);
  await page.locator('#where').getByRole('button', { name: '客廳' }).click();
  await page.locator('#skip').click();
  await page.locator('#generate').click();
  await page.getByText('2D 示意圖（這台裝置無法顯示 3D）').waitFor({ timeout: 30000 });
  assert.equal(await page.getByRole('button', { name: '視角 B' }).isVisible(), false, 'view buttons that do nothing are hidden');
  assert.equal(await page.locator('.scene > svg').count(), 1);
  await page.close();
}
{ // 分享連結：別人打開就看到同一個設計與條件
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 }, ...quiet });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  await stub(page);
  page.on('pageerror', (e) => errors.push(`share: ${e.message}`));
  await page.route('https://i.pinimg.com/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="5"/>' }));
  await page.goto(base);
  await page.locator('#where').getByRole('button', { name: '客廳' }).click();
  await page.locator('.round.like').click();                                    // 溫暖木質 ♥
  await page.waitForFunction(() => document.querySelector('.count').textContent.startsWith('2 '));
  await page.locator('#skip').click();
  // 空間範圍：一句話講到主臥就切到臥室；3D、估價、圖面都跟著換
  await page.fill('#say', '只想裝潢主臥，大概 5 坪，長 4 米 2、寬 3 米 8，天花板 2 米 7，老屋，12 樓高的大樓，不動隔間'); await page.press('#say', 'Enter');
  await page.getByText('聽到：空間 臥室、坪數 5 坪、長 4.2 公尺、寬 3.8 公尺、天花板高 2.7 公尺、建物總樓層 12 層、隔間 不動、屋況 老屋、坪數依長寬換算為 4.8 坪').waitFor();
  await page.locator('#openform').click();
  assert.equal(await page.inputValue('#f-floors'), '12');
  assert.equal((await page.locator('#generate').innerText()).trim(), '生成臥室的 3D', 'the button names the room before generating');
  await page.locator('#generate').click();
  await page.getByRole('heading', { name: '臥室・溫暖木質' }).waitFor();
  await page.locator('.scene[data-ready] canvas').waitFor({ timeout: 30000 });
  assert.equal(await page.evaluate(() => window.__room.stats().size.space), '臥室');
  await page.locator('#tocost').click();
  await page.locator('.items').getByText('衣櫃與斗櫃').waitFor();
  assert.match(await page.locator('.items').innerText(), /床架、床墊、床頭櫃/);
  assert.ok((await page.locator('.sheetbtn').first().innerHTML()).includes('雙人床'), 'the plan shows a bed');
  await page.locator('#withfurniture input').uncheck();
  await page.waitForFunction(() => !document.querySelector('.items').textContent.includes('家具軟裝'));
  await page.locator('#withfurniture input').check();
  await page.locator('#steps button').nth(1).click();
  await page.fill('#say', '改做客廳'); await page.press('#say', 'Enter');
  await page.getByText('聽到：空間 客廳').waitFor();
  await page.fill('#f-len', '6.2'); await page.locator('#f-len').blur();
  await page.fill('#f-wid', '4.3'); await page.locator('#f-wid').blur();
  await page.getByRole('button', { name: '老屋' }).click();
  await page.locator('#generate').click();
  await page.fill('#tell', '幫我加一個中島'); await page.press('#tell', 'Enter');          // 用說的改：聽不懂就照實說
  await page.locator('#designer').getByText('我還不會改').waitFor();
  await page.fill('#tell', '我不要地毯，高櫃換成白色'); await page.press('#tell', 'Enter');   // 一句兩件事：做得到的做，做不到的說
  await page.locator('#undoedit').waitFor();
  assert.match(await page.locator('#designer').innerText(), /好，地毯拿掉。[\s\S]*「高櫃換成白色」我還不會改/);
  assert.equal(await page.getByRole('button', { name: '地毯拿掉' }).getAttribute('aria-pressed'), 'true');
  const price = await page.locator('#teaser').innerText();
  await page.locator('#share').click();
  await page.getByText('已複製連結').waitFor();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(url, /#r=[A-Za-z0-9_-]+$/);
  const other = await (await browser.newContext({ viewport: { width: 1366, height: 860 }, ...quiet })).newPage();
  await stub(other);   // 另一個人、乾淨的瀏覽器
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
