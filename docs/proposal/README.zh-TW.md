# 原生 HTML 產品簡報

[English](README.md) · 繁體中文

**[開啟 HTML 簡報](https://cathay-ai.github.io/interior-design-proposal/?v=native)** · [PDF 原稿對照](assets/original-proposal.pdf)

原稿 29 頁以可選取的 HTML 文字、CSS 排版和 SVG 圖形重建，依原稿保留章節、順序、暖米色／棕黑／橘色、字體層級、手機故事板、圖表與表格。第 16 頁是新增的風格定案候選流程總覽，不屬於原稿，全簡報共 30 頁。主簡報沒有整頁圖片、canvas 截圖、PDF 嵌入或 iframe。

- `index.html`：30 頁內容、表格與原生圖形。
- `native/style.css`：桌機簡報版面與手機重排。
- `native/deck.js`：翻頁、跳章、鍵盤／滑動、閱讀模式、字級與列印。
- `product-design/`：風格定案的 21 頁產品設計簡報（故事闖關、16 型人格、家人共測、模擬軟裝商場、語音助理、決策模型與技術評估），為尚未驗證的候選設計。
- `assets/original-proposal.pdf`：未修改的原稿，只供對照／下載。

手機上的故事板、泳道與大型表格可在區塊內橫向捲動；一般文字會重排。閱讀模式可連續瀏覽全部頁面。原稿缺失的數值不另補造，圖示佔位文字改為真正 SVG 圖示。

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory docs/proposal
```

[公開簡報原始碼](https://github.com/Cathay-AI/interior-design-proposal)；內部產品文件維持私人。
