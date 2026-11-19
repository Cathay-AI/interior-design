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
    await link('毛胚到完成');
    await press('燈光');
    await link('看整戶');
    await press('餐廳');
    await press('平面');
    await page.getByRole('button', {name:'餐廳 4.5 坪', exact:true}).waitFor();
    await press('實景');
    await page.getByText(/餐廳 · 靜謐橡木/).waitFor();
    await link('返回成品');
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
    await link('風水評估');
    await press('客廳動線 · 已選');
    await press('套用 1 項');
    await page.getByRole('heading', {name:'施工圖',exact:true}).waitFor();
    await link('對接團隊');
    await press('只找統包工班');
    await press('模擬送交接包');
    await page.getByText('示意已送件').waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await link('回我的家');
    await page.getByRole('heading', {name:'我的家',exact:true}).waitFor();
    assert.deepEqual(errors, []);
    console.log('Wireframe demo flow passed at ' + viewport.width + 'px');
    await page.close();
  }
} finally {
  await browser.close();
}
