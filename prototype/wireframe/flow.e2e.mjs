import { strict as assert } from 'node:assert';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch();
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', result => {
      if (result.url().startsWith(base) && result.status() >= 400) errors.push(result.status() + ' ' + result.url());
    });
    const link = name => page.getByRole('link', { name, exact: true }).click();
    const press = name => page.getByRole('button', { name, exact: true }).click();
    const fit = async () => {
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    };
    const route = async (target, query) => {
      await page.evaluate(([view, parameters]) => {location.hash = view + '?' + parameters;}, [target, query]);
      await page.waitForURL(url => url.hash === '#' + target + '?' + query);
    };
    await page.goto(base + '#r=c2FtcGxl');
    await page.waitForURL('**/fast-route/**');
    await page.goto(base + '#drawings');
    await page.getByRole('button', {name:'示意解鎖'}).waitFor();
    await page.goto(base);
    await page.getByLabel('上傳建商平面圖').setInputFiles({
      name:'示意平面圖.pdf', mimeType:'application/pdf', buffer:Buffer.from('%PDF-1.4'),
    });
    await link('查看解析結果');
    await press('待補 2');
    await page.getByText('天花板高度', {exact:true}).waitFor();
    await link('補充偏好');
    await page.getByLabel('想要什麼樣的家').fill('橡木與自然光');
    await link('選風格');
    await press('A · 靜謐橡木');
    await link('確認方向，看成品');
    await page.getByText('26–48 萬', {exact:true}).waitFor();
    await page.getByRole('heading', {name:'法規初檢 · 示意'}).waitFor({timeout:2500});
    const living = await page.getByRole('img', {name:'客廳 · 完工示意'}).getAttribute('src');
    await link('毛胚到完成');
    const bare = await page.getByRole('img', {name:'客廳 · 毛胚示意'}).getAttribute('src');
    const stageImages = new Set([bare]);
    for (const stage of ['地坪與牆面','木作與櫃體','家具與軟裝','燈光']) {
      await press(stage);
      const stageImage = page.getByRole('img', {name:'客廳 · ' + stage + '示意', exact:true});
      await stageImage.waitFor();
      assert(await stageImage.evaluate(img => img.complete && img.naturalWidth > 0));
      stageImages.add(await stageImage.getAttribute('src'));
    }
    assert.equal(stageImages.size, 5);
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
    await link('返回成品');
    await page.getByText('18–30 萬', {exact:true}).waitFor();
    await link('家具與材質');
    await press('確認換款');
    await link('看更新後報價');
    await link('解鎖下一步');
    await press('示意解鎖');
    await press('下一關');
    await press('天天煮');
    await page.getByText('示意調整：開放廚房與中島').waitFor();
    for (let i = 0; i < 3; i++) await press('下一關');
    await link('看居家人格');
    await press('套用，看法規細評');
    await page.getByRole('heading', {name:'法規細部評估'}).waitFor();
    await page.getByText('格局變更已重查 · 版本 1').waitFor();
    const permit = page.getByRole('heading', {name:'室內裝修許可'}).locator('..');
    await permit.getByText('要辦理', {exact:true}).waitFor();
    await fit();
    await page.getByLabel('你家在第幾樓？').fill('12');
    await press('儲存樓層並重查');
    await page.getByText('已補資料・待覆核', {exact:true}).waitFor();
    await link('回精修格局');
    await press('偶爾煮');
    for (let i = 0; i < 3; i++) await press('下一關');
    await link('看居家人格');
    await link('看法規細評');
    await page.getByText('格局已變更 · 等待重查').waitFor();
    await press('依新格局重查');
    await page.getByText('格局變更已重查 · 版本 2').waitFor();
    await permit.getByText('符合示例', {exact:true}).waitFor();
    await link('看風水');
    await press('客廳動線 · 已選');
    await press('套用 1 項');
    await page.getByRole('heading', {name:'施工圖',exact:true}).waitFor();
    await press('水電 2 張');
    await press('M-02 給排水配置圖');
    await page.getByRole('img', {name:'M-02 給排水配置圖 · 示意'}).waitFor();
    await press('M-01 插座與弱電配置圖');
    await fit();
    const svg = page.getByRole('img', {name:'M-01 插座與弱電配置圖 · 示意'});
    await svg.waitFor();
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
    const savedProject = page.getByRole('heading',{name:'靜謐橡木',exact:true}).locator('..');
    const projectLink = name => page.getByRole('heading',{name,exact:true}).locator('..')
      .getByRole('link',{name:'打開專案'});
    const oldParameters = (await projectLink('靜謐橡木').getAttribute('href')).split('?')[1];
    await projectLink('小家庭').click();
    await page.getByLabel('想要什麼樣的家').fill('小家庭・審查示例');
    const familyParameters = new URL(page.url()).hash.split('?')[1];
    await link('我的家');
    await press('新建專案');
    await link('說一句話');
    assert.equal(await page.getByLabel('想要什麼樣的家').inputValue(),'');
    await page.getByLabel('想要什麼樣的家').fill('新案・白牆');
    await link('選風格');
    await link('確認方向，看成品');
    await page.getByText('26–48 萬', {exact:true}).waitFor();
    await link('解鎖下一步');
    await press('示意解鎖');
    const newParameters = new URL(page.url()).hash.split('?')[1];
    await route('team', newParameters);
    await page.getByText('待送件', {exact:true}).waitFor();
    await link('我的家');
    await savedProject.getByRole('link',{name:'打開專案'}).click();
    await page.getByRole('heading',{name:'這個家'}).waitFor();
    await page.getByText('18–30 萬', {exact:true}).waitFor();
    await route('brief', oldParameters);
    assert.equal(await page.getByLabel('想要什麼樣的家').inputValue(),'橡木與自然光');
    await route('team', oldParameters);
    await page.getByText('示意已送件').waitFor();
    await route('brief', familyParameters);
    assert.equal(await page.getByLabel('想要什麼樣的家').inputValue(),'小家庭・審查示例');
    await route('brief', newParameters);
    assert.equal(await page.getByLabel('想要什麼樣的家').inputValue(),'新案・白牆');
    await fit();
    assert.deepEqual(errors, []);
    console.log(viewport.width + ' px：法規初檢與重查、分房五階段、跨案隔離、M-01 預覽與列印均通過');
    await page.close();
  }
} finally {
  await browser.close();
}
