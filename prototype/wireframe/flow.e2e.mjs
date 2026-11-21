// End-to-end walk of the Quiet Oak flow, in the order of the design canvas:
//   free   入口（沒想法先逛）→ 解析＋問屋型 → 空間條件 → 推薦風格 → 生成 3D → 你家的樣子 → 這個家
//   paid   解鎖 → 解鎖完成 → 這個家（已解鎖）→ 編輯你的家 → 施工圖 → 交給團隊 → 送出完成
//   add-ons are entered from 這個家 and never change the design by themselves; the free tool is a side door.
// Usage: node flow.e2e.mjs [base URL]. Set WIREFRAME_SCREENSHOTS to a folder to keep a picture of every page.
import { strict as assert } from 'node:assert';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const shots = process.env.WIREFRAME_SCREENSHOTS;
const browser = await chromium.launch();
const failures = [];

for (const viewport of [{width:1440,height:900}, {width:390,height:844}]) {
  const {width} = viewport;
  const mobile = width < 600;
  const context = await browser.newContext({viewport, hasTouch:mobile, reducedMotion:'reduce'});
  context.setDefaultTimeout(8000);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  const main = page.locator('main');
  const title = name => main.getByRole('heading', {level:1, name, exact:typeof name === 'string'}).waitFor({timeout:5000});
  const link = name => main.getByRole('link', {name, exact:typeof name === 'string'});
  const button = name => main.getByRole('button', {name, exact:typeof name === 'string'});
  const route = async () => new URL(page.url()).hash.slice(1).split('?')[0];
  // Checks that hold on every page: no sideways scrolling, and touch targets of at least 44px on a phone.
  const settle = async name => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, name + ' 有水平捲動 ' + overflow + 'px');
    if (mobile) {
      const small = await main.locator('button, a.button, a.addon-card, a.back-link').evaluateAll(nodes => nodes
        .filter(node => node.getClientRects().length)
        .map(node => ({text:node.textContent.trim().slice(0, 12), height:Math.round(node.getBoundingClientRect().height)}))
        .filter(node => node.height < 44));
      assert.equal(JSON.stringify(small), '[]', name + ' 有小於 44px 的觸控目標');
    }
    if (shots) await page.screenshot({path:shots + '/' + name + '-' + width + '.png', fullPage:true});
  };
  const step = async (name, run) => {
    try {
      await run();
      await settle(name);
      console.log(width + ' px：' + name + ' 通過');
    } catch (error) {
      failures.push(width + ' px：' + name + '　' + error.message.split('\n').slice(0, 4).join(' | '));
      if (shots) await page.screenshot({path:shots + '/FAIL-' + name + '-' + width + '.png', fullPage:true}).catch(() => {});
    }
  };

  const upload = name => main.locator('.start-upload input[type=file]').setInputFiles({
    name, mimeType:name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream', buffer:Buffer.from('demo'),
  });
  const rowsChanged = () => main.locator('.edited-rows li').count();

  await step('01 入口', async () => {
    await page.goto(base);
    await page.locator('#entry-title').waitFor();
    await main.getByText('建商平面圖、現場照片、LiDAR 掃描檔都可以').first().waitFor();
    assert.equal(await main.locator('.start-upload input[type=file]').count(), 1, '入口只有一個上傳按鈕');
    const bg = await main.locator('.start-upload').evaluate(node => getComputedStyle(node).backgroundColor);
    assert.equal(bg, 'rgb(31, 29, 26)', '入口上傳按鈕須為墨色 #1F1D1A');
  });

  await step('01b 還沒想法：先逛幾個家', async () => {
    await page.getByRole('link', {name:'還沒想法？先逛幾個家'}).click();
    await title('還沒想法？先逛幾個家，挑有感覺的。');
    assert.deepEqual(await main.locator('.browse-card small').allTextContents(), ['靜謐橡木', '霧灰', '靜謐橡木', '床頭木牆', '橡木書桌櫃']);
    await main.locator('.browse-card').nth(1).click();
    await title('客廳・霧灰');
    await main.getByText('範例的家 · 示意').waitFor();
    await page.goto(base + '#browse');
    await main.locator('.browse-card').nth(3).click();
    await title('主臥・靜謐橡木');
    await page.goto(base + '#browse');
    await link('‹ 回首頁').click();
    await page.locator('#entry-title').waitFor();
  });

  await step('02 解析中＋問屋型', async () => {
    await upload('建商平面圖.pdf');
    await title('正在讀你的平面圖');
    assert.equal(await route(), 'scanning');
    await main.getByText('建商平面圖.pdf').waitFor();
    assert.equal(await main.locator('.scan-step[data-state="已完成"]').count(), 5);
    await main.getByText('只影響報價怎麼算，不答也能繼續。').waitFor();
    await button(/^中古屋/).click();
    assert.equal(await button(/^中古屋/).getAttribute('aria-pressed'), 'true');
    assert.equal(await button(/^新成屋/).getAttribute('aria-pressed'), 'false');
  });

  await step('03 空間條件（讀圖）與拍照引導', async () => {
    await link('看我讀到什麼').click();
    await title('我讀懂的你家');
    await main.getByText('有掃描檔的話會更準。', {exact:false}).waitFor();
    await main.getByText('空間條件 72%').waitFor();
    await button('待補 2').click();
    assert.equal(await main.locator('.detail-rows li').count(), 2);
    await button('全部 6').click();
    assert.equal(await main.locator('.detail-rows li').count(), 6);
    await link('＋ 再拍幾張').click();
    await main.locator('.camera-shell').waitFor();
    await main.locator('.camera-shutter').click();
    await main.locator('.camera-shutter').click();
    await main.getByText('手機往上抬一點，把天花板和樑拍進來。').waitFor();
    await main.getByRole('link', {name:'關閉拍照引導'}).click();
    await title('我讀懂的你家');
  });

  await step('04 推薦風格', async () => {
    await link('對，看推薦的風格').click();
    await title('我先推薦三個方向');
    const options = main.getByRole('group', {name:'風格方向'}).locator('button strong');
    assert.deepEqual(await options.allTextContents(), ['A 靜謐橡木', 'B 霧灰', 'C 墨綠']);
    await button(/^B 霧灰/).click();
    await link('用 B 生成我家的 3D').waitFor();
    await button(/^C 墨綠/).click();
    await link('用 C 生成我家的 3D').waitFor();
    await button(/^A 靜謐橡木/).click();
    await link('用 A 生成我家的 3D').waitFor();
  });

  await step('04b 一句話微調', async () => {
    await link('都不像').click();
    await title('都不像？說一句話，或丟幾張你喜歡的圖。');
    await button('淺色地板').click();
    assert.equal(await button('淺色地板').getAttribute('aria-pressed'), 'true');
    await link('照這樣生成，看實景與報價').waitFor();
    await link('回到三個推薦').click();
    await title('我先推薦三個方向');
  });

  await step('05 生成 3D', async () => {
    await link('用 A 生成我家的 3D').click();
    await title('正在把你家蓋出來');
    assert.equal(await route(), 'generating');
    assert.equal(await main.locator('.scan-step[data-state="已完成"]').count(), 4);
    await main.getByText('不想等可以先離開', {exact:false}).waitFor();
  });

  await step('06 你家的樣子＋報價', async () => {
    await link('看成品與報價').click();
    await title('客廳・靜謐橡木');
    const quote = await main.locator('.price').first().textContent();
    assert.match(quote, /^\d+–\d+ 萬$/);
    assert.notEqual(quote, '26–48 萬', '中古屋的報價要含基礎工程');
    await button('平面').click();
    await main.locator('.room-preview .plan').waitFor();
    await button('實景').click();
    await link('解鎖施工圖').waitFor();
    // Add-ons are entered from 這個家, not from the result page.
    for (const name of ['毛胚到完成', '家具與材質', '看整戶']) assert.equal(await link(name).count(), 0, '成品頁不該有「' + name + '」');
  });

  await step('07 這個家（未解鎖）', async () => {
    await link('進到這個家').click();
    await title('你家・客廳');
    const cards = main.locator('.addon-card');
    assert.deepEqual((await cards.locator('strong').allTextContents()), ['家具與材質', '毛胚到完成', '法規細評', '風水評估', '生活測驗', '解鎖施工圖']);
    const targets = await cards.evaluateAll(nodes => nodes.map(node => new URL(node.href).hash.slice(1).split('?')[0]));
    assert.deepEqual(targets, ['materials', 'compare', 'unlock', 'unlock', 'unlock', 'unlock']);
    if (!mobile) assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 80), '桌機「這個家」要一屏看完');
    assert.equal(await main.getByText('解鎖後', {exact:true}).count(), 3);
    await main.getByText(/^編輯你的家＋施工圖 \d+ 張$/).waitFor();
  });

  await step('加值 家具與材質', async () => {
    await link(/^家具與材質/).click();
    await title('客廳用到的');
    const before = await main.locator('.price').first().textContent();
    await button('換一款：沙發').click();
    assert.notEqual(await main.locator('.price').first().textContent(), before, '換款後報價要更新');
    await button('換一款：沙發').click();
    await link('‹ 回這個家').click();
    await title('你家・客廳');
  });

  await step('加值 毛胚到完成', async () => {
    await link(/^毛胚到完成/).click();
    await title('家一步一步長出來');
    await button('2 地坪與牆面').click();
    assert.equal(await button('2 地坪與牆面').getAttribute('aria-pressed'), 'true');
    await button('5 燈光').click();
    await link('看初步報價').waitFor();
    await link('回這個家', ).click();
    await title('你家・客廳');
  });

  await step('補充 整戶', async () => {
    await link('整戶').click();
    await title('一間一間看，整戶一起算');
    await button('下一間：餐廳').click();
    await button('下一間：廚房').waitFor();
    await button('客廳').click();
    await link('‹ 回這個家').click();
  });

  await step('未解鎖不能直接進付費頁', async () => {
    const id = new URL(page.url()).hash.split('project=')[1];
    for (const name of ['edit', 'own', 'quiz', 'compliance', 'feng', 'drawings', 'team', 'sent', 'notices', 'unlocked']) {
      await page.goto(base + '#' + name + '?project=' + id);
      await title('喜歡的話，把它變成你的');
    }
  });

  await step('08 解鎖', async () => {
    await main.getByText('示意解鎖，不會收費。').waitFor();
    await main.getByText('初步報價不是正式報價；施工圖在現場丈量後定稿。').waitFor();
    await link('先不要').waitFor();
    await button('解鎖').click();
    await title('解鎖了。現在可以把它變成你的。');
    assert.equal(await route(), 'unlocked');
    await link('開始編輯').waitFor();
  });

  await step('09 這個家（已解鎖）', async () => {
    await link('回這個家').click();
    await title('你家・客廳');
    assert.equal(await main.locator('.addon-card').getByText('新開啟', {exact:true}).count(), 3);
    assert.equal(await link(/^解鎖施工圖/).count(), 0);
    await link(/^繼續編輯/).waitFor();
  });

  await step('10 編輯你的家：換、加、拿掉、復原', async () => {
    await link(/^繼續編輯/).click();
    await title('單椅');
    assert.equal(await route(), 'edit');
    const quote = main.getByRole('status', {name:'改完的報價'});
    const before = await quote.textContent();
    assert.equal(await rowsChanged(), 0);
    await button(/^墨綠絨布/).click();
    await main.getByText('單椅換成墨綠休閒椅。').waitFor();
    assert.equal(await rowsChanged(), 1);
    assert.notEqual(await quote.textContent(), before, '換款後報價要變');
    await button('選沙發').click();
    await title('沙發');
    await button(/^霧灰布/).click();
    assert.equal(await rowsChanged(), 2);
    await button('復原：沙發').click();
    assert.equal(await rowsChanged(), 1);
    await button('拿掉', ).click();
    await button('拿掉沙發').click();
    assert.equal(await rowsChanged(), 2);
    const verBeforeUndo = await main.locator('.edit-panel h2 small').textContent();
    await button('復原：沙發').click();
    assert.equal(await rowsChanged(), 1);
    assert.notEqual(await main.locator('.edit-panel h2 small').textContent(), verBeforeUndo, '復原拿掉要進新版');
    await button('換材質').click();
    await main.locator('.swatch-btn').nth(1).click();
    await main.getByText('沙發材質已換成霧灰布。').waitFor();
    await button('復原：沙發').click();
    await main.getByLabel('或說一句話').fill('單椅換磚紅');
    await button('套用這句話').click();
    await main.getByText('單椅換成磚紅休閒椅。').waitFor();
    assert.equal(await rowsChanged(), 0);
    assert.equal(await quote.textContent(), before);
    await main.locator('.add-menu summary').click();
    await button('＋ 落地燈').click();
    assert.equal(await rowsChanged(), 1);
  });

  await step('10b 放你自己的家具（寬深高檢查）', async () => {
    await button('換一款').click();
    await link(/^放你自己的/).click();
    await title('放你自己的家具');
    const fitStatus = main.locator('.own-fit');
    await fitStatus.filter({hasText:/^放得下/}).waitFor();
    await main.getByLabel('寬（公分）').fill('9999');
    await fitStatus.filter({hasText:/超出單件家具輸入上限/}).waitFor();
    assert.equal(await button('放進我家').isDisabled(), true);
    await main.getByLabel('寬（公分）').fill('68');
    await main.getByLabel('高（公分）').fill('300');
    await fitStatus.filter({hasText:/^放不下：高度超過天花板高度/}).waitFor();
    assert.equal(await button('放進我家').isDisabled(), true);
    await main.getByLabel('高（公分）').fill('76');
    await main.getByLabel('深（公分）').fill('250');
    await fitStatus.filter({hasText:/^放不下：走道不足/}).waitFor();
    assert.equal(await button('放進我家').isDisabled(), true);
    await main.getByLabel('深（公分）').fill('350');
    await fitStatus.filter({hasText:/^放不下：深度超過可用進深/}).waitFor();
    assert.equal(await button('放進我家').isDisabled(), true);
    await main.getByLabel('深（公分）').fill('72');
    await fitStatus.filter({hasText:/^放得下/}).waitFor();
    await button('放進我家').click();
    await main.getByText('你的家具放進來了，施工清單會標「屋主自備」。', {exact:false}).waitFor();
    await main.locator('.edited-rows').getByText('你自己的家具').waitFor();
  });

  await step('加值 法規細評：只檢查、不掩蓋待補、採納後回編輯', async () => {
    await link('法規 2 要處理・1 待補').click();
    await title('逐條檢核，附來源');
    await main.getByText('檢核對象：目前的設計', {exact:false}).waitFor();
    assert.ok(await main.locator('.plan-pin').count() >= 3, '平面圖須有法規編號標記');
    await main.getByText('要處理 2・待補 1・沒問題 1').waitFor();
    await button('採納，回編輯套用：不動天花板，減少申請需求').click();
    assert.equal(await route(), 'edit');
    await main.getByText('已採納「不動天花板，減少申請需求」。').waitFor();
    await main.locator('.edited-rows').getByText('不動天花板').waitFor();
    await link('法規 0 要處理・1 待補').click();
    await main.getByLabel('你家在第幾樓？').fill('8');
    await button('儲存樓層並重查').click();
    await main.getByText('要處理 0・待補 0・待覆核 1・沒問題 3').waitFor();
    await link('回編輯').click();
    await link('法規 待覆核 1').waitFor();
  });

  await step('加值 風水評估：採納、不處理、可整個關掉', async () => {
    await link('風水 2 要處理・1 待補').click();
    await title('逐項檢查與建議');
    await main.getByText('檢核對象：目前的設計', {exact:false}).waitFor();
    assert.equal(await main.getByText('是否需要申請', {exact:false}).count(), 0, '風水不該出現法規用語');
    await button('採納，回編輯套用：玄關加屏風櫃').click();
    assert.equal(await route(), 'edit');
    await main.locator('.edited-rows').getByText('玄關加屏風櫃').waitFor();
    await link('風水 1 要處理・1 待補').click();
    await button('不處理：床頭靠窗').click();
    await main.getByText('要處理 0・待補 1・不處理 1・沒問題 2').waitFor();
    await button('改回要處理：床頭靠窗').click();
    await main.getByText('要處理 1・待補 1・沒問題 2').waitFor();
    await button('不處理：床頭靠窗').click();
    await button('納入風水').click();
    await main.getByText('已略過風水，這一版不檢查。').waitFor();
    await link('回編輯').click();
    await link('風水 未納入').click();
    await button('納入風水').click();
    await link('回編輯').click();
    await link('風水 0 要處理・1 待補').waitFor();
  });

  await step('加值 生活測驗：只問生活、不動設計', async () => {
    const rows = await rowsChanged();
    await link('回這個家').click();
    await link(/^生活測驗/).click();
    await title('回到家第一件事？');
    assert.equal(await button('下一關：怎麼煮').isDisabled(), true, '沒選不能到下一關');
    await button(/^東西先放好/).click();
    await main.getByText('記下來了。測驗只問你怎麼生活，不會動你的設計；五關答完再一起帶去編輯。').waitFor();
    await button('下一關：怎麼煮').click();
    await title('平常在家煮飯嗎？');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'layout-question');
    await button(/^天天煮，還會一起煮/).click();
    await button('下一關：怎麼收').click();
    await button(/^都藏起來/).click();
    await button('下一關：怎麼睡').click();
    await button(/^怕光也怕吵/).click();
    await button('下一關：誰會來').click();
    await button(/^以家人為主/).click();
    await link('看測驗結果').click();
    await title('你的居家人格');
    await main.getByRole('heading', {name:'窩居料理派'}).waitFor();
    await main.getByText('測驗完成・5／5 關・格局還沒動').waitFor();
    await button('把偏好帶去編輯').click();
    assert.equal(await route(), 'edit');
    assert.equal(await rowsChanged(), rows, '測驗不該自己改設計');
    await main.getByText('已帶入生活測驗的 5 項偏好。有 2 個可套用的建議', {exact:false}).waitFor();
    await button('＋ 玄關收納櫃（生活測驗）').waitFor();
    await button('＋ 主臥床轉 90 度靠牆（生活測驗）').waitFor();
  });

  await step('12 施工圖與估價明細', async () => {
    await link('改好了，出施工圖').click();
    await title('你家的施工圖包');
    await main.locator('img.drawing').waitFor();
    assert.equal(await main.locator('.review-stages li[aria-current]').textContent(), 'AI 初稿');
    assert.deepEqual(await main.locator('.drawing-controls .rows').first().locator('button').allTextContents(),
      ['A-01 平面配置圖', 'A-02 尺寸平面圖', 'A-03 地坪材料計畫圖']);
    await button('估價明細').click();
    await main.getByRole('heading', {name:'整戶估價明細（示意）'}).waitFor();
    await button('平面 3 張').click();
    await main.getByText('屋主自備家具').waitFor();
    await main.getByText('客廳初步報價（示意）').waitFor();
    await main.getByText('整戶初步報價（示意）').waitFor();
    await link('回編輯').waitFor();
    await button('列印或存成 PDF').waitFor();
  });

  await step('13 交給團隊（最多 3 組，送出後鎖定名單）', async () => {
    await link('交給團隊做出來').click();
    await title('找人把它做出來');
    await main.getByText('最多選 3 組，只有你選的會聯絡你。', {exact:false}).waitFor();
    await main.getByText('已選 0／3 組', {exact:true}).waitFor();
    assert.equal(await button('送出交接包，約現場丈量').isDisabled(), true, '未選團隊不能送出');
    await button(/^示意團隊 B/).click();
    await main.getByText('已選 1／3 組', {exact:true}).waitFor();
  });

  await step('14 送出完成、名單與報價快照鎖定', async () => {
    await button('送出交接包，約現場丈量').click();
    await title('送出了。接下來等團隊回覆。');
    assert.equal(await route(), 'sent');
    const sentCaption = await main.locator('.media .floating').textContent();
    await main.getByText('示意團隊 B 已收到第', {exact:false}).waitFor();
    await main.getByText('示意送件・沒有發送任何資料').waitFor();
    await page.goBack();
    await title('找人把它做出來');
    assert.equal(await button(/^示意團隊 C/).isDisabled(), true, '送出後團隊選項須鎖定');
    const id = new URL(page.url()).hash.split('project=')[1];
    await page.goto(base + '#edit?project=' + id);
    await main.locator('.edit-stage-add').click();
    await button('＋ 地毯').click();
    await page.goto(base + '#sent?project=' + id);
    assert.equal(await main.locator('.media .floating').textContent(), sentCaption, '送件後繼續編輯不可改寫原送出完成頁報價');
    await main.getByText('你之後已編輯到第', {exact:false}).waitFor();
  });

  await step('14b LINE 通知示意', async () => {
    await link('看 LINE 通知長什麼樣').click();
    await title('LINE 通知長這樣');
    assert.equal(await main.locator('.notice-list li').count(), 3);
    await main.getByText('示意團隊 B 想約你丈量').waitFor();
    await button('選時段：本週六 10:00').click();
    await main.getByText('已選 本週六 10:00。這是示意，不會發送預約。').waitFor();
    await link('回送出完成').waitFor();
  });

  await step('03b 空間條件（掃描檔，含導覽跳轉一致）', async () => {
    await page.goto(base + '#entry');
    await page.locator('#entry-title').waitFor();
    await upload('living-room.usdz');
    await title('正在讀你的掃描檔');
    const id = new URL(page.url()).hash.split('project=')[1];
    await page.goto(base + '#read?project=' + id);
    await title('量好的，直接用');
    await main.getByText('living-room.usdz').waitFor();
    await main.getByText('空間條件 96%').waitFor();
    assert.equal(await main.getByText('範例尺寸').count() >= 4, true, '掃描檔須標範例尺寸');
    assert.equal(await main.getByText('實測').count(), 0, '示意版不可標成實測');
    assert.equal(await main.getByLabel('客廳 長（公分）').inputValue(), '562');
    await button('半窗').click();
    assert.equal(await button('半窗').getAttribute('aria-pressed'), 'true');
    await link('對，看推薦的風格').click();
    await title('我先推薦三個方向');
  });

  await step('側門 免費小工具', async () => {
    await page.goto(base + '#tool');
    await title('拍一張空房間，看它裝好的樣子。');
    await main.locator('.picker input[type=file]').setInputFiles({name:'empty-room.jpg', mimeType:'image/jpeg', buffer:Buffer.from('demo')});
    await main.getByText('收到「empty-room.jpg」', {exact:false}).waitFor();
    await main.locator('.media.compare').waitFor();
    await link('想看整個家和報價？上傳平面圖').click();
    await page.locator('#entry-title').waitFor();
  });

  await step('範例的家：等角 3D', async () => {
    await page.goto(base + '#result?project=example');
    await title(/^.+・.+$/);
    await main.getByText('範例的家 · 示意').waitFor();
    await button('等角').click();
    await main.locator('.room-preview.model, .room-preview .model').first().waitFor();
  });

  await step('沒有程式錯誤', async () => {
    assert.deepEqual(errors, []);
  });
  await context.close();
}

await browser.close();
if (failures.length) {
  console.error('\n' + failures.length + ' 項失敗：\n' + failures.join('\n'));
  process.exit(1);
}
console.log('\n全部通過');
