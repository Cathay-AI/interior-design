# 視覺化提案的來源與閱讀方式

- `proposal.html`：自含 CSS、SVG 與操作腳本的單檔提案，可下載後直接用瀏覽器開啟，不需啟動平台。
- `proposal-preview.png`：桌機版實際瀏覽器截圖，供 GitHub 直接預覽。
- `proposal.am.md`：可編輯的內容來源，含 flow／timeline 等元件語法；不是產品程式。

以 `answer-me-with-html` 0.4.7 的 CLI 產生，8 個面板。重新產生時，由 repo 根目錄執行：

```sh
node "$ANSWER_HTML_SKILL_DIR/scripts/am.mjs" render docs/visual/proposal.am.md -o docs/visual/proposal.html --no-open --mode light
```

`ANSWER_HTML_SKILL_DIR` 請指向本機已安裝的技能目錄；renderer 不被複製進此 repo。產物更新後需重新截圖並檢查桌機／手機排版。完整動機與來源見 [proposal](../README.md)。

初版已檢查桌機畫面與 390px 手機 viewport；手機按面板逐段閱讀，較寬的圖可在面板內橫向捲動。這是文件的排版檢查，不能替代產品 3D 的實機測試。
