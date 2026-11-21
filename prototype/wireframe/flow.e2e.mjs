// End-to-end walk of the Quiet Oak flow, in the order of the design canvas:
//   free   入口 → 解析 → 空間條件 → 推薦風格 → 生成 3D → 你家的樣子 → 這個家
//   paid   解鎖 → 解鎖完成 → 這個家（已解鎖）→ 精修格局 → 施工圖 → 交給團隊
//   add-ons are entered from 這個家 and never change the layout by themselves.
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
  const title = name => main.getByRole('heading', {level:1, name, exact:true}).waitFor({timeout:5000});
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

  await step('01 入口', async () => {
    await page.goto(base);
    await page.locator('#entry-title').waitFor();
    await page.getByRole('link', {name:'手邊沒有？先看一個範例的家'}).waitFor();
    assert.equal(await main.locator('.start-upload input[type=file]').count(), 1, '入口只有一個上傳按鈕');
  });

  await step('02 空間解析中', async () => {
    await main.locator('.start-upload input[type=file]').setInputFiles({
      name:'建商平面圖.pdf', mimeType:'application/pdf', buffer:Buffer.from('%PDF-1.4 demo'),
    });
    await title('正在讀你的平面圖');
    assert.equal(await route(), 'scanning');
    await main.getByText('建商平面圖.pdf').waitFor();
    assert.equal(await main.locator('.scan-step[data-state="已完成"]').count(), 5);
  });

  await step('03 空間條件', async () => {
    await link('看我讀到什麼').click();
    await title('我讀懂的你家');
    await main.getByText('空間條件 72%').waitFor();
    await button('待補 2').click();
    assert.equal(await main.locator('.detail-rows li').count(), 2);
    await button('全部 6').click();
    assert.equal(await main.locator('.detail-rows li').count(), 6);
  });

  await step('04 推薦風格', async () => {
    await link('對，看推薦的風格').click();
    await title('我先推薦三個方向');
    const options = main.getByRole('group', {name:'風格方向'}).getByRole('button');
    assert.deepEqual((await options.allTextContents()).map(text => text.slice(0, 6)), ['A 靜謐橡木', 'B 日光米白', 'C 森林木框']);
    await button(/^B 日光米白/).click();
    await link('用 B 生成我家的 3D').waitFor();
    await button(/^A 靜謐橡木/).click();
    await link('用 A 生成我家的 3D').waitFor();
  });

  await step('04b 一句話微調', async () => {
    await link('都不像？說一句話或丟參考圖').click();
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
  });

  await step('06 你家的樣子＋報價', async () => {
    await link('看成品與報價').click();
    await title('客廳・靜謐橡木');
    assert.match(await main.locator('.price').first().textContent(), /^\d+–\d+ 萬$/);
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
    assert.deepEqual((await cards.locator('strong').allTextContents()), ['家具與材質', '毛胚到完成', '法規細評', '風水評估', '生活測驗']);
    const targets = await cards.evaluateAll(nodes => nodes.map(node => new URL(node.href).hash.slice(1).split('?')[0]));
    assert.deepEqual(targets, ['materials', 'compare', 'unlock', 'unlock', 'unlock']);
    assert.equal(await main.getByText('解鎖後', {exact:true}).count(), 3);
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
    await link('‹ 回這個家').click();
    await title('你家・客廳');
  });

  await step('補充 整戶', async () => {
    await link('看整戶').click();
    await title('一間一間看，整戶一起算');
    await button('下一間：餐廳').click();
    await button('下一間：廚房').waitFor();
    await button('客廳').click();
    await link('‹ 回這個家').click();
  });

  await step('未解鎖不能直接進付費頁', async () => {
    const id = new URL(page.url()).hash.split('project=')[1];
    for (const name of ['layout', 'quiz', 'compliance', 'feng', 'drawings', 'team', 'unlocked']) {
      await page.goto(base + '#' + name + '?project=' + id);
      await title('喜歡的話，拿到施工圖');
    }
  });

  await step('08 解鎖', async () => {
    await main.getByText('示意解鎖，不會收費。').waitFor();
    await link('先不要').waitFor();
    await button('解鎖').click();
    await title('解鎖了。現在可以把它做出來。');
    assert.equal(await route(), 'unlocked');
  });

  await step('09 這個家（已解鎖）', async () => {
    await link('回這個家').click();
    await title('你家・客廳');
    assert.equal(await main.locator('.addon-card').getByText('已解鎖', {exact:true}).count(), 3);
    assert.equal(await link('解鎖施工圖').count(), 0);
    await link('繼續精修格局').waitFor();
  });

  await step('10 精修格局：每改一次出新版本', async () => {
    await link('繼續精修格局').click();
    await title('格局方案 v1');
    const total = main.getByRole('status', {name:'整戶估價'});
    const original = await total.textContent();
    await button('＋ 廚房打開，做中島').click();
    await title('格局方案 v2');
    await main.locator('.plan[data-open-kitchen="true"]').waitFor();
    assert.notEqual(await total.textContent(), original, '調整後整戶估算要變');
    await button('原本 v1').click();
    assert.equal(await total.textContent(), original.replace('這一版', '原本'));
    await button('調整後 v2').click();
    await link('法規 2').waitFor();
    await link('風水 2').waitFor();
    await link('生活測驗 未做').waitFor();
  });

  await step('加值 法規細評：只檢查、採納後回精修出新版', async () => {
    await link('法規 2').click();
    await title('逐條檢核，附來源');
    await main.getByText('檢核對象：格局方案 v2').waitFor();
    await main.getByText('要處理 2・待補 1・沒問題 1').waitFor();
    await main.getByLabel('你家在第幾樓？').fill('8');
    await button('儲存樓層並重查').click();
    await main.getByText('要處理 2・待補 0・沒問題 1').waitFor();
    await main.locator('.plan[data-open-kitchen="true"]').waitFor();
    await button('採納，回精修套用：保留這道牆，就不用申請').click();
    await title('格局方案 v3');
    await main.locator('.plan[data-open-kitchen="false"]').waitFor();
    await link('法規 1').waitFor();
  });

  await step('精修格局：說一句話', async () => {
    await main.getByLabel('還想怎麼改？說一句話').fill('廚房打開');
    await button('套用格局調整').click();
    await title('格局方案 v4');
    await main.getByText('已加入「廚房打開，做中島」，這是 v4。').waitFor();
  });

  await step('加值 風水評估：採納、不處理、可整個關掉', async () => {
    await link('風水 2').click();
    await title('逐項檢查與建議');
    await main.getByText('檢核對象：格局方案 v4').waitFor();
    await button('採納，回精修套用：玄關加屏風櫃').click();
    await title('格局方案 v5');
    assert.equal(await main.locator('.change-list li').count(), 2);
    await link('風水 1').click();
    await button('不處理：床頭靠窗').click();
    await main.getByText('要處理 0・待補 1・沒問題 2').waitFor();
    await button('納入風水').click();
    await main.getByText('已略過風水，這一版不檢查。').waitFor();
    await link('回精修格局').click();
    await title('格局方案 v5');
    await link('風水 未納入').click();
    await button('納入風水').click();
    await link('回精修格局').click();
    await link('風水 0').waitFor();
  });

  await step('加值 生活測驗：只問生活、不動格局', async () => {
    await link('生活測驗 未做').click();
    await title('回到家第一件事？');
    await button(/^東西先放好/).click();
    await main.getByText('記下來了。測驗只問你怎麼生活，不會動格局；五關答完再一起交給精修。').waitFor();
    await button('下一關：怎麼煮').click();
    await title('平常在家煮飯嗎？');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'layout-question');
    await button(/^天天煮，還會一起煮/).click();
    await button('下一關：怎麼收').click();
    await button(/^都藏起來/).click();
    await button('下一關：怎麼睡').click();
    await button(/^喜歡自然醒/).click();
    await button('下一關：誰會來').click();
    await button(/^以家人為主/).click();
    await link('看測驗結果').click();
    await title('你的居家人格');
    await main.getByRole('heading', {name:'窩居料理派'}).waitFor();
    await main.getByText('測驗完成・5／5 關・格局還沒動').waitFor();
    await button('把偏好帶去精修').click();
    await title('格局方案 v5');
    await button('＋ 玄關加一整面收納（生活測驗）').waitFor();
    await link('生活測驗 已完成').waitFor();
  });

  await step('11 真實施工圖', async () => {
    await link('這一版定案，出施工圖').click();
    await title('你家的施工圖包');
    await main.locator('img.drawing').waitFor();
    await main.getByText('格局方案 v5', {exact:false}).first().waitFor();
    assert.equal(await main.locator('.review-stages li[aria-current]').textContent(), 'AI 初稿');
    await button('下載 PDF').waitFor();
  });

  await step('12 交給團隊', async () => {
    await link('交給團隊做出來').click();
    await title('找人把它做出來');
    await main.getByText('已選 1 組', {exact:true}).waitFor();
    await button(/^示意團隊 B/).click();
    await main.getByText('已選 2 組', {exact:true}).waitFor();
    await button('送出交接包，約現場丈量').click();
    await main.getByText('示意已送出交接包給 2 組，接下來約現場丈量。').waitFor();
    assert.equal(await main.locator('.review-stages li[aria-current]').textContent(), '2 現場丈量');
  });

  await step('範例的家', async () => {
    await page.goto(base + '#result?project=example');
    await title('客廳・靜謐橡木');
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
