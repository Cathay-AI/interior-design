# 主視覺

由 prototype 的 three.js 客廳直接「拍攝」，不使用 AI 生圖，也不用付費素材。家具是免費授權模型，地板與牆面是 Poly Haven 的實拍材質（出處見 [models/CREDITS.md](../prototype/models/CREDITS.md)；兩張沙發為 CC BY 4.0，公開使用時要保留標註）。每種風格有自己的沙發、茶几、吊燈、植栽與單椅，組合來自 prototype 的元素清單（[catalog.js](../prototype/catalog.js)）。文字放在實心白色面板上（字體為 Manrope＋蘋方／思源黑體），只有開場維持深色。

| 檔案 | 尺寸 | 用途 | 風格／光線 |
|---|---|---|---|
| `opener.jpg` | 1080×1920 | prototype 開場 | 暖調復古／夜晚燈光 |
| `cover.jpg` | 1920×1080 | 產品設計簡報封面 | 日光北歐／黃昏斜陽 |
| `share.jpg` | 1080×1350 | 社群與分享卡 | 無印日式／黃昏斜陽 |
| `style-0.jpg`–`style-13.jpg` | 1600×1200 | 十四種風格代表圖 | 依序：無印日式、日光北歐、暖調復古、工業風、現代簡約、法式古典、輕奢、韓系奶油、中古世紀、侘寂、台式老宅、波希米亞、地中海、沉穩酒店 |
| `looks-atlas.jpg` | 1440 寬 | 風格搭配圖譜：56 組選擇圖與分佈圖 | 各組自己的光線 |

## 重新產生

1. `cd docs/proposal && python3 -m http.server 8765`
2. 在瀏覽器開 `http://localhost:8765/product-design/prototype/keyvisual.html?shot=cover`，把視窗調成表格中的尺寸後截圖。可用的 `shot`：`opener`、`cover`、`share`、`style-0`～`style-13`；加上 `&notext=1` 輸出 App 用的無文字版（`app/`）
3. 圖譜：開 `http://localhost:8765/product-design/prototype/looks.html`，以 1440 寬截整頁；搭配清單在 catalog.js 的 `LOOKS`
4. 鏡位、光線和標題文字都寫在 [keyvisual.html](../prototype/keyvisual.html) 的 `SHOTS`；頁面畫好後會設定 `window.__ready = true`，方便 headless 瀏覽器自動截圖

已知限制：場景是單一客廳格局；部分風格共用同一張曲線沙發（換布料與顏色）。正式行銷素材建議改用實景攝影或授權圖庫。
