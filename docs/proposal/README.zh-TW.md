# 原生 HTML 產品簡報

[English](README.md) · 繁體中文

**[開啟 HTML 簡報](https://cathay-ai.github.io/interior-design-proposal/?v=native)** · [PDF 原稿對照](assets/original-proposal.pdf)

29 頁以可選取的 HTML 文字、CSS 排版和 SVG 圖形重建，依原稿保留章節、順序、暖米色／棕黑／橘色、字體層級、手機故事板、圖表與表格。主簡報沒有整頁圖片、canvas 截圖、PDF 嵌入或 iframe。

- `index.html`：29 頁內容、表格與原生圖形。
- `native/style.css`：桌機簡報版面與手機重排。
- `native/deck.js`：翻頁、跳章、鍵盤／滑動、閱讀模式、字級與列印。
- `assets/original-proposal.pdf`：未修改的原稿，只供對照／下載。

手機上的故事板、泳道與大型表格可在區塊內橫向捲動；一般文字會重排。閱讀模式可連續瀏覽全部頁面。原稿缺失的數值不另補造，圖示佔位文字改為真正 SVG 圖示。

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory docs/proposal
```

[公開簡報原始碼](https://github.com/Cathay-AI/interior-design-proposal)；內部產品文件維持私人。

## 簡報 v3 與「快速找風格」原型

- `deck-v3/index.html`：34 頁 HTML 簡報（背景、市場、需求、產品體驗、競品、定位、執行：分工、Timeline、合作提案）。方向鍵／滑動翻頁、章節跳轉、`N` 備註、`F` 全螢幕、可列印 PDF。
- `../../prototype/fast-route/`：快速找風格路線的 RWD 原型（三路線入口、口味圖譜、佈置、確認需求、結果頁 3D、粗略報價、規則檢查、版本）。詳見該資料夾 README。
- 透過 `vercel.json` + `scripts/build-site.sh` 一起部署（只發布 site、prototype、deck-v3）。
