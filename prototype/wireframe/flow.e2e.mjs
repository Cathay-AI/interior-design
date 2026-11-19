import { strict as assert } from 'node:assert';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch();
const projectFailures = [];
const projectOnly = process.argv[3] === '--project-only';
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.addInitScript(() => {
      const projections = new WeakMap();
      window.testRoomProjection = () => projections.get(document.querySelector('.model canvas'));
      const webgl = WebGL2RenderingContext.prototype;
      const uniform = webgl.uniformMatrix4fv;
      webgl.uniformMatrix4fv = function(location, transpose, matrix, ...options) {
        if (matrix[11] === -1) projections.set(this.canvas, matrix[5]);
        return uniform.call(this, location, transpose, matrix, ...options);
      };
    });
    const errors = [];
    const modelRequests = [];
    await page.route('**/room3d.js*', async request => {
      modelRequests.push(request.request().url());
      if (modelRequests.length === 1) await request.fulfill({status:503, body:'暫時無法讀取模組'});
      else await request.continue();
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', result => {
      if (result.status() === 503 && result.url() === modelRequests[0]) return;
      if (result.url().startsWith(base) && result.status() >= 400) errors.push(result.status() + ' ' + result.url());
    });
    const link = async name => {
      const target = page.getByRole('link', {name, exact:true});
      if (name === '我的家' && viewport.width === 390 && !(await target.count())) {
        await page.locator('summary[aria-label="開啟專案選單"]').click();
      }
      await target.click();
    };
    const press = name => page.getByRole('button', { name, exact: true }).click();
    const fit = async () => {
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    };
    const assertPanels = async selector => {
      const grid = page.locator(selector);
      await grid.waitFor({timeout:5000});
      const left = await grid.locator(':scope > :first-child').boundingBox();
      const right = await grid.locator(':scope > :nth-child(2)').boundingBox();
      assert(left && right);
      if (viewport.width === 1440) assert(right.x >= left.x + left.width && right.y === left.y);
      else assert(right.y >= left.y + left.height && right.x === left.x);
    };
    const capture = async (name, fullPage = true) => {
      await fit();
      if (process.env.WIREFRAME_SCREENSHOTS) {
        await page.screenshot({path:process.env.WIREFRAME_SCREENSHOTS + '/' + name + '-' + viewport.width + '.png', fullPage});
      }
    };
    const route = async (target, query) => {
      await page.evaluate(([view, parameters]) => {location.hash = view + '?' + parameters;}, [target, query]);
      await page.waitForURL(url => url.hash === '#' + target + '?' + query);
    };
    const recentHome = name => page.getByRole('region', {name:'最近的家'}).getByRole('article')
      .filter({has:page.getByRole('heading', {name,exact:true})});
    const openHome = name => recentHome(name).getByRole('link', {name:'打開專案'});
    const planFile = name => ({name, mimeType:'application/pdf', buffer:Buffer.from('%PDF-1.4')});
    const expectResume = async (name, hash) => {
      assert.equal(await openHome(name).getAttribute('href'), hash, name + ' 卡片的續作目的頁');
      await openHome(name).click();
      await page.waitForURL(url => url.hash === hash);
    };
    const checkResume = async () => {
      const examples = page.getByRole('region', {name:'最近的家'}).getByRole('heading', {level:3});
      assert.deepEqual(await examples.allTextContents(), ['靜謐橡木','小家庭','三房兩廳','新家平面圖']);
      for (const [name,hash] of [['靜謐橡木','#project?project=oak'],['小家庭','#brief?project=family'],
        ['三房兩廳','#read?project=floorplan'],['新家平面圖','#scanning?project=upload']]) {
        assert.equal(await openHome(name).getAttribute('href'), hash);
      }
      await expectResume('小家庭', '#brief?project=family');
      await page.getByLabel('想要什麼樣的家').fill('小家庭・偏好保留');
      await link('選風格');
      await press('B · 暖調復古');
      await link('確認方向，看成品');
      await page.locator('.result-quote > .price').filter({hasText:'28–51 萬'}).waitFor();
      await link('我的家');
      await recentHome('小家庭').getByText('初步報價', {exact:true}).waitFor();
      await capture('resume-card');
      await expectResume('小家庭', '#result?project=family');
      await page.locator('.result-quote > .price').filter({hasText:'28–51 萬'}).waitFor();
      await capture('resume-result');
      await route('brief', 'project=family');
      assert.equal(await page.getByLabel('想要什麼樣的家').inputValue(), '小家庭・偏好保留');
      await route('brief', 'project=oak');
      assert.equal(await page.getByLabel('想要什麼樣的家').inputValue(), '');
    };
    const checkCancellation = async () => {
      const start = page.getByRole('region', {name:'從哪裡開始'});
      const cancel = async () => {
        await link('取消');
        await link('我的家');
        await page.getByRole('heading', {name:'我的家',exact:true}).waitFor();
      };
      const cancelledFile = '取消的首份.pdf';
      await start.getByLabel('上傳平面圖', {exact:true}).setInputFiles(planFile(cancelledFile));
      await page.getByText(cancelledFile, {exact:true}).waitFor();
      await cancel();
      const home = recentHome('新家 1');
      const status = await home.locator('.badge').textContent();
      const hasCancelledFile = await home.getByText(cancelledFile, {exact:true}).count();
      await capture('cancel-first-card');
      assert.deepEqual([status,hasCancelledFile], ['新建',0], '首次取消後恢復新建且移除未確認檔名');
      await expectResume('新家 1', '#entry?project=demo-1');
      const retry = page.getByLabel('上傳建商平面圖');
      await retry.waitFor({state:'attached'});
      await capture('cancel-first-reopen');
      await retry.setInputFiles(planFile('已確認平面.pdf'));
      await link('查看解析結果');
      await page.getByText('已確認平面.pdf', {exact:true}).waitFor();
      await press('客廳 9 坪');
      await page.getByLabel('長度（公尺）').fill('7');
      await page.getByLabel('寬度（公尺）').fill('3');
      await press('儲存客廳尺寸');
      await page.getByLabel('重選平面圖').setInputFiles(planFile('取消的替換.pdf'));
      await page.getByText('取消的替換.pdf', {exact:true}).waitFor();
      await cancel();
      assert.equal(await home.getByText('取消的替換.pdf', {exact:true}).count(), 0);
      await home.getByText('已確認平面.pdf', {exact:true}).waitFor();
      await home.getByText('待補', {exact:true}).waitFor();
      await capture('cancel-confirmed-card');
      await expectResume('新家 1', '#read?project=demo-1');
      await page.getByText('已確認平面.pdf', {exact:true}).waitFor();
      assert.equal(await page.getByLabel('長度（公尺）').inputValue(), '7');
      assert.equal(await page.getByLabel('寬度（公尺）').inputValue(), '3');
      await capture('cancel-confirmed-reopen');
      await page.evaluate(() => {location.hash = 'scanning?project=demo-1';});
      await page.getByRole('heading', {name:'我讀懂的你家',exact:true}).waitFor();
      await page.waitForURL(url => url.hash === '#read?project=demo-1');
      assert.equal(await page.getByText('取消的替換.pdf', {exact:true}).count(), 0);
    };
    for (const [name,check] of [['近期卡片續作',checkResume],['取消解析',checkCancellation]]) {
      await page.goto(base + '#homes');
      await page.reload();
      await page.getByRole('heading', {name:'我的家',exact:true}).waitFor();
      try {
        await check();
        console.log(viewport.width + ' px：' + name + '通過');
      } catch (error) {
        projectFailures.push(error);
        console.error(viewport.width + ' px：' + name + '失敗', error);
      }
    }
    if (projectOnly) {
      assert.deepEqual(errors, []);
      await page.close();
      continue;
    }
    await page.goto('about:blank');
    await page.goto(base + '#r=c2FtcGxl');
    await page.waitForURL('**/fast-route/**');
    await page.goto(base + '#drawings');
    await page.getByRole('button', {name:'示意解鎖'}).waitFor();
    await page.goto(base);
    const entry = page.getByRole('main');
    const upload = entry.getByText('上傳建商平面圖', {exact:true});
    const uploadBounds = await upload.boundingBox();
    assert(uploadBounds && uploadBounds.y + uploadBounds.height <= viewport.height, 'upload is visible in the first viewport');
    const heroPhoto = entry.getByRole('img', {name:'靜謐橡木客廳示意'});
    const heroSrc = await heroPhoto.getAttribute('src');
    assert(await heroPhoto.evaluate(async img => {
      await img.decode();
      return img.naturalWidth >= 1440;
    }));
    if (viewport.width === 390) {
      assert.equal(await page.getByRole('navigation', {name:'設計階段'}).count(), 0);
      assert.equal(await page.getByText('26–48 萬', {exact:true}).isVisible(), false);
      for (const name of ['現場拍照', '說一句話']) {
        const bounds = await entry.getByRole('link', {name, exact:true}).boundingBox();
        assert(bounds && bounds.y + bounds.height <= viewport.height, name + ' is visible in the first viewport');
      }
    }
    if (viewport.width === 1440) {
      await page.getByLabel('看磚紅單椅').click();
      await page.getByText('布面搭配橡木椅腳').waitFor();
      await page.getByLabel('看磚紅單椅').click();
    }
    await capture('entry', false);
    await link('現場拍照');
    await page.getByLabel('從相簿選或拍攝').waitFor();
    await link('亮亮｜首頁');
    await page.getByLabel('上傳建商平面圖').setInputFiles({
      name:'示意平面圖.pdf', mimeType:'application/pdf', buffer:Buffer.from('%PDF-1.4'),
    });
    await assertPanels('.scan-grid');
    await page.getByRole('group', {name:'平面圖示意'}).getByText('廚房', {exact:true}).waitFor();
    const scanSteps = page.getByRole('list', {name:'解析步驟'});
    assert.equal(await scanSteps.getByRole('listitem').count(), 5);
    await scanSteps.getByText('比對門窗與採光', {exact:true}).waitFor();
    await page.getByText('示意解析，使用範例平面。').waitFor();
    await page.getByText('示意平面圖.pdf', {exact:true}).waitFor();
    await capture('artboard-16-scanning');
    const scanHash = new URL(page.url()).hash.split('?')[1];
    await link('取消');
    await page.getByRole('heading', {name:/把家的想像/}).waitFor();
    assert.equal(new URL(page.url()).hash.split('?')[1], scanHash);
    await page.getByLabel('上傳建商平面圖').setInputFiles({
      name:'示意平面圖.pdf', mimeType:'application/pdf', buffer:Buffer.from('%PDF-1.4'),
    });
    await link('查看解析結果');
    await press('客廳 9 坪');
    assert(await page.getByLabel('長度（公尺）').evaluate(input => document.activeElement === input));
    await page.getByLabel('長度（公尺）').fill('6');
    await page.getByLabel('寬度（公尺）').fill('5');
    await press('儲存客廳尺寸');
    await page.getByRole('button', {name:'客廳 9.1 坪', exact:true}).waitFor();
    await page.getByLabel('重選平面圖').setInputFiles({
      name:'更新的平面圖.pdf', mimeType:'application/pdf', buffer:Buffer.from('%PDF-1.4'),
    });
    await page.getByText('更新的平面圖.pdf', {exact:true}).waitFor();
    await link('查看解析結果');
    await page.getByRole('button', {name:'客廳 9.1 坪', exact:true}).waitFor();
    await capture('conditions');
    await press('待補 2');
    await page.getByText('天花板高度', {exact:true}).waitFor();
    await link('補充偏好');
    await page.getByLabel('想要什麼樣的家').fill('橡木與自然光');
    await link('選風格');
    await press('A · 靜謐橡木');
    await capture('style');
    await link('確認方向，看成品');
    await page.getByText('26–48 萬', {exact:true}).waitFor();
    await page.getByRole('heading', {name:'法規初檢 · 示意'}).waitFor({timeout:2500});
    const title = page.getByRole('heading', {name:'實景＋初步報價',exact:true});
    assert(await title.evaluate(heading => {
      const text = heading.firstChild;
      const range = document.createRange();
      range.setStart(text, text.length - 2);
      range.setEnd(text, text.length);
      return range.getClientRects().length === 1;
    }), '報價 should remain on the same line');
    const sofaSwap = page.getByRole('button', {name:'換一款：沙發', exact:true});
    const chairSwap = page.getByRole('button', {name:'換一款：單椅', exact:true});
    await sofaSwap.waitFor({timeout:2000});
    await chairSwap.waitFor({timeout:2000});
    await capture('living', false);
    const livingPhoto = page.getByRole('img', {name:'客廳 · 完工示意'});
    const expectVariant = async (asset, estimate) => {
      await page.locator('.result-quote > .price').filter({hasText:estimate}).waitFor();
      assert.equal(await livingPhoto.getAttribute('src'), './imagery/' + asset + '.webp');
      await livingPhoto.evaluate(img => img.decode());
    };
    const parsePrice = value => value.match(/\d+/g).map(Number);
    const addPrices = ([a,b], [x,y]) => [a + x, b + y];
    const assertCost = async (name, low, high, evidence) => {
      const details = page.locator('details').filter({has:page.getByText(name, {exact:true})});
      await details.getByText(name, {exact:true}).click();
      const entries = await details.locator('li').evaluateAll(rows => rows.map(row => [
        row.querySelector('span').firstChild.textContent, row.querySelector('strong').textContent,
      ]));
      const costs = Object.fromEntries(entries.map(([label, value]) => [label, parsePrice(value)]));
      assert(entries.length > 3);
      for (const [min, max] of Object.values(costs)) assert(min <= max);
      assert.deepEqual(Object.values(costs).reduce(addPrices, [0,0]), [low,high]);
      if (evidence) await capture(evidence);
      await details.getByText(name, {exact:true}).click();
      return costs;
    };
    const singleDetails = '看單室費用明細';
    const wholeDetails = '看整戶費用明細';
    const assertFurnitureDelta = (before, after, delta) => {
      assert.deepEqual(after, {
        ...before, 家具軟裝:addPrices(before.家具軟裝, delta),
      }, '家具換款只調整家具軟裝，收納櫃、窗簾與其他工項維持原價');
    };
    const checkWhole = async (low, high, evidence) => {
      await link('整戶');
      const quote = page.locator('.card').filter({has:page.getByRole('heading', {name:'整戶初步報價',exact:true})});
      await quote.waitFor();
      const headings = await quote.locator(':scope > .price').allTextContents();
      const rooms = await quote.locator(':scope > .rows .badge').allTextContents();
      assert.equal(rooms.length, 8);
      assert.deepEqual(parsePrice(headings[1]), [low,high]);
      assert.deepEqual(rooms.map(parsePrice).reduce(addPrices, [0,0]), [low,high]);
      assert.deepEqual(parsePrice(rooms[0]), parsePrice(headings[0]));
      const costs = await assertCost(wholeDetails, low, high, evidence);
      await press('餐廳');
      await quote.getByRole('heading', {name:'餐廳初步報價',exact:true}).waitFor();
      assert.deepEqual(await quote.locator(':scope > .price').allTextContents(), ['18–30 萬', headings[1]]);
      await press('客廳');
      await link('返回成品');
      return {costs, rooms};
    };
    await expectVariant('living-4', '26–48 萬');
    const original = await assertCost(singleDetails, 26, 48, 'room-cost');
    assert.deepEqual(original.收納櫃, [5,10]);
    assert.deepEqual(original.窗簾, [2,3]);
    await chairSwap.click();
    await expectVariant('living-chair', '27–49 萬');
    await page.getByText('苔綠休閒椅', {exact:true}).waitFor();
    assertFurnitureDelta(original, await assertCost(singleDetails, 27, 49, 'quote-chair'), [1,1]);
    const chairWhole = await checkWhole(169, 281, 'whole-quote-chair');

    await sofaSwap.click();
    await expectVariant('living-sofa-chair', '28–51 萬');
    await page.getByText('淺灰模組沙發', {exact:true}).waitFor();
    assertFurnitureDelta(original, await assertCost(singleDetails, 28, 51), [2,3]);
    await capture('furniture-variants');
    await page.getByRole('textbox', {name:'就地微調'}).fill('單椅換回磚紅');
    await press('套用微調');
    await expectVariant('living-sofa', '27–50 萬');
    assertFurnitureDelta(original, await assertCost(singleDetails, 27, 50, 'quote-sofa'), [1,2]);
    const sofaWhole = await checkWhole(169, 282, 'whole-quote-sofa');
    await page.getByRole('textbox', {name:'就地微調'}).fill('沙發換成米白');
    await press('套用微調');
    await expectVariant('living-4', '26–48 萬');
    assert.deepEqual(await assertCost(singleDetails, 26, 48), original);
    const originalWhole = await checkWhole(168, 280, 'whole-cost');
    assertFurnitureDelta(originalWhole.costs, chairWhole.costs, [1,1]);
    assertFurnitureDelta(originalWhole.costs, sofaWhole.costs, [1,2]);
    assert.deepEqual(chairWhole.rooms, ['27–49 萬', ...originalWhole.rooms.slice(1)]);
    assert.deepEqual(sofaWhole.rooms, ['27–50 萬', ...originalWhole.rooms.slice(1)]);
    await press('等角');
    await page.getByText('3D 中斷，已顯示實景示意。', {exact:true}).waitFor();
    assert.equal(modelRequests.length, 1);
    const failedRoute = page.url();
    await press('重試 3D');
    const canvas = page.locator('.model[data-ready] canvas');
    await canvas.waitFor();
    assert.equal(modelRequests.length, 2);
    assert.equal(new URL(modelRequests[0]).pathname, new URL(modelRequests[1]).pathname);
    assert.notEqual(modelRequests[0], modelRequests[1]);
    assert.equal(page.url(), failedRoute);
    await capture('module-retry');
    await page.waitForFunction(() => Number.isFinite(window.testRoomProjection()));
    const normalProjection = await page.evaluate(() => window.testRoomProjection());
    const expectZoom = (scale) => page.waitForFunction(([normal,wanted]) =>
      Math.abs(window.testRoomProjection() / normal - wanted) < .015, [normalProjection, scale]);
    const zoomIn = page.getByRole('button', {name:'放大 3D'});
    await zoomIn.click();
    await zoomIn.click();
    await page.getByText('縮放 1.5×', {exact:true}).waitFor();
    await expectZoom(1.5);
    await canvas.evaluate(node => {
      const extension = node.getContext('webgl2')?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('需要 WEBGL_lose_context');
      extension.loseContext();
    });
    await press('重試 3D');
    await canvas.waitFor();
    await page.getByText('縮放 1.5×', {exact:true}).waitFor();
    await expectZoom(1.5);
    assert(await zoomIn.isDisabled());
    await capture('zoom-retry');
    const wholeLink = page.getByRole('link', {name:'整戶', exact:true});
    await wholeLink.scrollIntoViewIfNeeded();
    assert(await wholeLink.evaluate(anchor => {
      const {x,y,width,height} = anchor.getBoundingClientRect();
      return anchor.contains(document.elementFromPoint(x + width / 2, y + height / 2));
    }), '整戶連結須可直接點選，不被解鎖按鈕覆蓋');
    await link('整戶');
    await assertCost(wholeDetails, 168, 280);
    await press('餐廳');
    await page.getByText('縮放 1×', {exact:true}).waitFor();
    await press('客廳');
    await press('實景');
    await link('返回成品');
    const living = await page.getByRole('img', {name:'客廳 · 完工示意'}).getAttribute('src');
    assert.equal(living, heroSrc, '首頁與靜謐橡木成品共用同一客廳主圖');
    await link('毛胚到完成');
    const bare = await page.getByRole('img', {name:'客廳 · 毛胚示意'}).getAttribute('src');
    const stageImages = new Set([bare]);
    for (const stage of ['地坪與牆面','木作與櫃體','家具與軟裝','燈光']) {
      await press(stage);
      const stageImage = page.getByRole('img', {name:'客廳 · ' + stage + '示意', exact:true});
      await stageImage.waitFor();
      assert(await stageImage.evaluate(async img => { await img.decode(); return img.naturalWidth > 0; }));
      stageImages.add(await stageImage.getAttribute('src'));
    }
    assert.equal(stageImages.size, 5);
    await capture('living-comparison');
    const download = page.waitForEvent('download');
    await press('存成對比圖');
    assert.equal((await download).suggestedFilename(), 'renovation-comparison.png');
    await fit();
    await link('看整戶');
    await press('餐廳');
    await press('平面');
    await page.getByRole('button', {name:'餐廳 4.5 坪', exact:true}).waitFor();
    await press('實景');
    await page.getByText(/餐廳 · 靜謐橡木/).waitFor();
    assert.notEqual(await page.getByRole('img', {name:'餐廳 · 完工示意'}).getAttribute('src'), living);
    await page.getByText('餐廳初步報價').waitFor();
    await link('毛胚到完成');
    assert.notEqual(await page.getByRole('img', {name:'餐廳 · 毛胚示意'}).getAttribute('src'), bare);
    await press('家具與軟裝');
    await page.getByRole('img', {name:'餐廳 · 家具與軟裝示意'}).waitFor();
    await page.getByText('18–30 萬', {exact:true}).waitFor();
    await link('看整戶');
    await press('廚房');
    await link('返回成品');
    await page.getByText('28–46 萬', {exact:true}).waitFor({timeout:2500});
    const kitchenCost = await assertCost(singleDetails, 28, 46, 'quote-kitchen-closed');
    const kitchen = page.getByRole('img', {name:'廚房 · 完工示意'});
    const enclosedKitchen = await kitchen.getAttribute('src');
    assert.match(enclosedKitchen, /imagery\/kitchen-4\.webp$/);
    assert(await kitchen.evaluate(async img => {await img.decode(); return img.naturalWidth >= 390;}));
    await capture('kitchen');
    await link('家具與材質');
    await press('確認換款');
    await page.getByText('暖白廚櫃', {exact:true}).waitFor();
    await press('確認換款');
    await link('看更新後報價');
    await link('解鎖精修與施工');
    await press('示意解鎖');
    const drawingParams = new URL(page.url()).hash.split('?')[1];
    const kitchenSheet = async () => {
      await route('drawings', drawingParams);
      return page.getByRole('img', {name:'A-01 平面配置圖 · 示意'}).evaluate(async img => {
        await img.decode();
        return decodeURIComponent(img.src.split(',')[1]);
      });
    };
    const enclosedSheet = await kitchenSheet();
    await route('layout', drawingParams);
    await press('下一關');
    await press('天天煮');
    await page.getByText('示意調整：開放廚房與中島').waitFor();
    for (let i = 0; i < 3; i++) await press('下一關');
    await link('看居家人格');
    await assertPanels('.profile-grid');
    const profilePlan = page.getByRole('group', {name:'平面圖示意'});
    const profileQuote = page.getByRole('status', {name:'整戶估價'});
    assert.equal(await profilePlan.getAttribute('data-open-kitchen'), 'true');
    await profilePlan.getByText('中島', {exact:true}).waitFor();
    await profileQuote.getByText('170–282 萬', {exact:true}).waitFor();
    await page.getByText('廚房 28–46 萬 → 30–48 萬', {exact:true}).waitFor();
    await capture('artboard-09-adjusted');
    await press('原本');
    assert.equal(await profilePlan.getAttribute('data-open-kitchen'), 'false');
    assert.equal(await profilePlan.getByText('中島', {exact:true}).count(), 0);
    await profileQuote.getByText('168–280 萬', {exact:true}).waitFor();
    await capture('artboard-09-original');
    await press('調整後');
    await profileQuote.getByText('170–282 萬', {exact:true}).waitFor();
    await press('套用，看法規細評');
    await page.getByRole('heading', {name:'法規細部評估'}).waitFor();
    await page.getByText('格局變更已重查 · 版本 1').waitFor();
    const permit = page.getByRole('heading', {name:'室內裝修許可'}).locator('..');
    await permit.getByText('要辦理', {exact:true}).waitFor();
    const checkedParams = new URL(page.url()).hash.split('?')[1];
    await route('result', checkedParams);
    await page.getByText('30–48 萬', {exact:true}).waitFor();
    assert.deepEqual(await assertCost(singleDetails, 30, 48, 'quote-kitchen-open'), {
      ...kitchenCost, 廚具:addPrices(kitchenCost.廚具, [2,2]),
    });
    assert.match(await kitchen.getAttribute('src'), /imagery\/open-kitchen-4\.webp$/);
    const openSheet = await kitchenSheet();
    assert.match(openSheet, /開放廚房示意開口/);
    assert.match(openSheet, /中島/);
    assert.doesNotMatch(openSheet, /門（示意）/);
    await capture('A-01-open');
    await route('compliance', checkedParams);
    await fit();
    await page.getByLabel('你家在第幾樓？').fill('12');
    await press('儲存樓層並重查');
    await page.getByText('已補資料・待覆核', {exact:true}).waitFor();
    await route('profile', checkedParams);
    await link('回精修格局');
    await press('偶爾煮');
    for (let i = 0; i < 3; i++) await press('下一關');
    await link('看居家人格');
    assert.equal(await profilePlan.getAttribute('data-open-kitchen'), 'false');
    await profileQuote.getByText('168–280 萬', {exact:true}).waitFor();
    await page.getByText('廚房 28–46 萬 → 28–46 萬', {exact:true}).waitFor();
    await capture('artboard-09-withdrawn');
    await link('看法規細評');
    await page.getByText('格局已變更 · 等待重查').waitFor();
    await press('依新格局重查');
    await page.getByText('格局變更已重查 · 版本 2').waitFor();
    await permit.getByText('符合示例', {exact:true}).waitFor();
    await route('result', checkedParams);
    await page.getByText('28–46 萬', {exact:true}).waitFor({timeout:2500});
    assert.deepEqual(await assertCost(singleDetails, 28, 46), kitchenCost);
    assert.equal(await kitchen.getAttribute('src'), enclosedKitchen);
    assert.equal(await kitchenSheet(), enclosedSheet, '撤回開放廚房應恢復 A-01');
    await route('compliance', checkedParams);
    await link('看風水');
    await press('客廳動線 · 已選');
    await press('套用 1 項');
    await page.getByRole('heading', {name:'施工圖',exact:true}).waitFor();
    await page.getByRole('button', {name:'平面 3 張',exact:true}).waitFor({timeout:2500});
    await page.getByRole('button', {name:'立面 4 張',exact:true}).waitFor();
    await press('水電 3 張');
    await press('M-03 天花板燈具配置圖');
    await page.getByRole('img', {name:'M-03 天花板燈具配置圖 · 示意'}).waitFor();
    await press('M-02 給排水配置圖');
    await page.getByRole('img', {name:'M-02 給排水配置圖 · 示意'}).waitFor();
    await press('M-01 插座與弱電配置圖');
    await fit();
    const svg = page.getByRole('img', {name:'M-01 插座與弱電配置圖 · 示意'});
    await svg.waitFor();
    await capture('drawings');
    const sheet = decodeURIComponent((await svg.getAttribute('src')).split(',')[1]);
    assert(sheet.includes('圖號 M-01') && sheet.includes('插座與弱電配置圖'));
    assert(!sheet.includes('圖號 E-02'));
    await page.emulateMedia({media:'print'});
    assert(await svg.isVisible());
    assert(!(await page.getByRole('heading', {name:'圖面清單 · 10 張'}).isVisible()));
    if (process.env.WIREFRAME_PRINT_PDF && viewport.width === 1440) {
      await page.pdf({path:process.env.WIREFRAME_PRINT_PDF, format:'A4', printBackground:true});
    }
    await page.emulateMedia({media:'screen'});
    await link('對接團隊');
    await press('只找統包工班');
    await press('模擬送交接包');
    await page.getByText('示意已送件').waitFor();
    await fit();
    await link('回我的家');
    await page.getByRole('heading', {name:'我的家',exact:true}).waitFor();
    const recent = page.getByRole('region', {name:'最近的家'});
    const starts = page.getByRole('region', {name:'從哪裡開始'});
    const projectCard = name => recent.getByRole('article').filter({has:page.getByRole('heading',{name,exact:true})});
    const savedProject = projectCard('靜謐橡木');
    const projectLink = name => projectCard(name).getByRole('link',{name:'打開專案'});
    assert.equal(await recent.getByRole('article').count(), 4);
    await savedProject.getByRole('img', {name:'廚房示意預覽'}).waitFor();
    await savedProject.getByText('示意已送件', {exact:true}).waitFor();
    await projectCard('三房兩廳').getByRole('group', {name:'平面圖示意'}).waitFor();
    await projectCard('三房兩廳').getByText('待補', {exact:true}).waitFor();
    await capture('artboard-13-homes');
    const oldParameters = (await projectLink('靜謐橡木').getAttribute('href')).split('?')[1];
    await projectLink('小家庭').click();
    await page.getByLabel('想要什麼樣的家').fill('小家庭・審查示例');
    const familyParameters = new URL(page.url()).hash.split('?')[1];
    await link('我的家');
    await starts.getByRole('button', {name:'說一句話',exact:true}).click();
    assert.equal(await page.getByLabel('想要什麼樣的家').inputValue(),'');
    await page.getByLabel('想要什麼樣的家').fill('新案・白牆');
    await link('選風格');
    await link('確認方向，看成品');
    await page.getByText('26–48 萬', {exact:true}).waitFor();
    await link('解鎖精修與施工');
    await press('示意解鎖');
    const newParameters = new URL(page.url()).hash.split('?')[1];
    await route('team', newParameters);
    await page.getByText('待送件', {exact:true}).waitFor();
    await link('我的家');
    await savedProject.getByRole('link',{name:'打開專案'}).click();
    await page.getByText('示意已送件', {exact:true}).waitFor();
    await route('project', oldParameters);
    await page.getByRole('heading',{name:'這個家'}).waitFor();
    await page.getByText('28–46 萬', {exact:true}).waitFor();
    await route('brief', oldParameters);
    assert.equal(await page.getByLabel('想要什麼樣的家').inputValue(),'橡木與自然光');
    await route('team', oldParameters);
    await page.getByText('示意已送件').waitFor();
    await route('brief', familyParameters);
    assert.equal(await page.getByLabel('想要什麼樣的家').inputValue(),'小家庭・審查示例');
    await route('brief', newParameters);
    assert.equal(await page.getByLabel('想要什麼樣的家').inputValue(),'新案・白牆');
    await link('我的家');
    await starts.getByLabel('上傳平面圖', {exact:true}).setInputFiles({
      name:'新案-平面圖.pdf', mimeType:'application/pdf', buffer:Buffer.from('%PDF-1.4'),
    });
    await page.getByText('新案-平面圖.pdf', {exact:true}).waitFor();
    const uploadParams = new URL(page.url()).hash.split('?')[1];
    await link('查看解析結果');
    await page.getByText('目前來源：平面圖', {exact:true}).waitFor();
    await link('我的家');
    const uploadedCard = projectCard('新家 2');
    await uploadedCard.getByText('待補', {exact:true}).waitFor();
    await uploadedCard.getByText('新案-平面圖.pdf', {exact:true}).waitFor();
    await starts.getByRole('button', {name:'現場拍照',exact:true}).click();
    await page.getByRole('heading', {name:'現場拍照',exact:true}).waitFor();
    const cameraParams = new URL(page.url()).hash.split('?')[1];
    assert.equal(new Set([oldParameters, familyParameters, newParameters, uploadParams, cameraParams]).size, 5);
    const newPhotoFixture = await page.request.get(base + 'imagery/living-4.webp');
    assert(newPhotoFixture.ok());
    await page.getByLabel('從相簿選或拍攝').setInputFiles({
      name:'新案-相簿.webp', mimeType:'image/webp', buffer:await newPhotoFixture.body(),
    });
    await link('拍完了');
    await page.getByText('新案-相簿.webp', {exact:true}).waitFor();
    assert.equal(await page.getByText('新案-平面圖.pdf', {exact:true}).count(), 0);
    await link('我的家');
    const cameraCard = projectCard('新家 3');
    await cameraCard.getByText('解析中', {exact:true}).waitFor();
    await cameraCard.getByText('新案-相簿.webp', {exact:true}).waitFor();
    await projectLink('新家 3').click();
    await page.getByText('新案-相簿.webp', {exact:true}).waitFor();
    await route('read', uploadParams);
    await page.getByText('新案-平面圖.pdf', {exact:true}).waitFor();
    assert.equal(await page.getByText('新案-相簿.webp', {exact:true}).count(), 0);
    await page.goto(base);
    const pdfFile = name => ({name, mimeType:'application/pdf', buffer:Buffer.from('%PDF-1.4')});
    await page.getByLabel('上傳建商平面圖').setInputFiles(pdfFile('原平面圖.pdf'));
    await link('查看解析結果');
    await press('客廳 9 坪');
    await page.getByLabel('長度（公尺）').fill('7');
    await page.getByLabel('寬度（公尺）').fill('3');
    await press('儲存客廳尺寸');
    await page.getByLabel('重選平面圖').setInputFiles(pdfFile('更新平面圖.pdf'));
    await link('查看解析結果');
    await page.getByRole('button', {name:'客廳 6.4 坪', exact:true}).waitFor();
    await link('再拍幾張');
    const photoFixture = await page.request.get(base + 'imagery/living-4.webp');
    assert(photoFixture.ok());
    await page.getByLabel('從相簿選或拍攝').setInputFiles({
      name:'相簿-客廳.webp', mimeType:'image/webp', buffer:await photoFixture.body(),
    });
    await link('拍完了');
    await page.getByText('目前來源：現場照片', {exact:true}).waitFor();
    await page.getByText('相簿-客廳.webp', {exact:true}).waitFor();
    assert.equal(await page.getByText('更新平面圖.pdf', {exact:true}).count(), 0);
    await capture('photo-source');
    await link('查看解析結果');
    await page.getByRole('button', {name:'客廳 6.4 坪', exact:true}).waitFor();
    assert.equal(await page.getByLabel('長度（公尺）').inputValue(), '7');
    assert.equal(await page.getByLabel('寬度（公尺）').inputValue(), '3');
    await link('直接選風格');
    await link('確認方向，看成品');
    await press('等角');
    await canvas.waitFor();
    await page.getByText('7000 × 3000 mm', {exact:true}).waitFor();
    await capture('3d-dimensions');
    await link('解鎖精修與施工');
    await press('示意解鎖');
    await route('drawings', 'project=oak');
    const dimensionSheet = page.getByRole('img', {name:'A-01 平面配置圖 · 示意'});
    const dimSvg = await dimensionSheet.evaluate(async img => {
      await img.decode();
      return decodeURIComponent(img.src.split(',')[1]);
    });
    assert.match(dimSvg, /<text[^>]*>7000<\/text>/);
    assert.match(dimSvg, /<text[^>]*>3000<\/text>/);
    assert.match(dimSvg, /空間尺寸 7000 × 3000 mm/);
    await capture('A-01-dimensions');
    await page.emulateMedia({media:'print'});
    assert(await dimensionSheet.isVisible());
    assert(!(await page.getByRole('heading', {name:'圖面清單 · 10 張'}).isVisible()));
    if (process.env.WIREFRAME_SCREENSHOTS) {
      await page.pdf({path:process.env.WIREFRAME_SCREENSHOTS + '/A-01-dimensions-' + viewport.width + '.pdf',
        format:'A4',printBackground:true});
    }
    await page.emulateMedia({media:'screen'});
    assert.deepEqual(errors, []);
    console.log(viewport.width + ' px：#9／#13／#16、個別換款和微調、PDF 轉照片、503 重試與 WebGL 1.5×、A-01 7000×3000、廚房套用撤回及明細通過');
    await page.close();
  }
  assert.equal(projectFailures.length, 0, '雙尺寸專案續作與取消解析');
} finally {
  await browser.close();
}
