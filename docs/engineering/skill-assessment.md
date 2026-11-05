# Victor Skill：整合基線與能力盤點

日期：2026-11-05。來源是上游 repo，不代表本平台已整合完成。

- Repo：[vic4code/interior-design-skill](https://github.com/vic4code/interior-design-skill)
- 本次讀取的 main commit：[`c0b11a68b41a3d147829a82791c9e2025a6c3c00`](https://github.com/vic4code/interior-design-skill/tree/c0b11a68b41a3d147829a82791c9e2025a6c3c00)
- Skill metadata：v0.1.2；main 的輕量 walkthrough 標為 unreleased，不能把 main 全部當作已發行版本。
- 查閱：[核心指令](https://github.com/vic4code/interior-design-skill/blob/c0b11a68b41a3d147829a82791c9e2025a6c3c00/skills/interior-design/SKILL.md)、[Browser review](https://github.com/vic4code/interior-design-skill/blob/c0b11a68b41a3d147829a82791c9e2025a6c3c00/skills/interior-design/references/browser-review.md)、[交接規範](https://github.com/vic4code/interior-design-skill/blob/c0b11a68b41a3d147829a82791c9e2025a6c3c00/skills/interior-design/references/contractor-coordination.md)、[範圍矩陣](https://github.com/vic4code/interior-design-skill/blob/c0b11a68b41a3d147829a82791c9e2025a6c3c00/skills/interior-design/references/delivery-scope.md)。

## 可以借用什麼？

| 觀察 | 對平台的意義 | 證據程度 |
|---|---|---|
| 指令支援從文字需求開始，並區分尺寸來源 | Intake 不必強制每位屋主先有完整圖面 | 讀取上游流程，未做真人生成測試 |
| 五模式 review：配置、3D、效果、可用 MEP、工程圖 | 初版沿用產物與概念，避免重造五套交付流程 | 文件與 demo manifest 可查 |
| 有 GLB、SVG、PDF、CSV、變體與 SHA-256 清單 | 可做 adapter、同版檢視與下載 | 本次 demo 實際產生並檢查 |
| 八張 A3 範例圖與四種風格 | 可用於無私密資料的整合 fixture | 虛構案例，不代表真實住宅完整交付 |
| 交接、詢價、施工發行分級，逐工項保留 held | 可轉成產品狀態、RFI 與交接驗收 | 是流程規範，不是全自動產物功能 |
| `acceptance` 最佳結果為 `ready_for_review` | 平台不能把通過自動檢查顯示成可施工 | 讀取上游範圍說明 |

## 仍需本平台完成

Hosted 身分／分享權限、專案與修訂保存、可取消／失敗的背景任務、skill host 工具串接、受控儲存、Mobile 實測、材料與價格來源、真實專業回饋流程。上游 loopback review server 不等於已具備這些能力。

v0.1.2 的專業交接提升主要是指令與交付要求；demo 不會自動生成全部專案特定交接紀錄，也沒有因此取得互動式機電點位編輯功能。

## 本次驗證

執行 `python3 skills/interior-design/scripts/interior_design.py demo --out <temporary-output> --no-serve`：exit 0，產生 review manifest 與附件。檢查 manifest `schema_version=2.0`、4 個 variants、8 張 sheets、GLB、layout、MEP 註冊及 file hashes。

此命令使用既有內附產物，不呼叫付費影像 API、不啟動 Blender、不驗證新案建模、瀏覽器 GPU、實機手機或施工品質。本次未跑上游完整單元測試、未建置其 frontend，也未把使用者私有住宅資料放進此 repo。

## 整合策略

先固定上游 commit 做相容性基線，透過 adapter 接入既有 review package。上游更新時比對契約與測試；不讓未檢查的最新版自動改變既有交付。若複用程式碼或 assets，保留 MIT 與第三方 notices；本次為視覺提案複用 5 張公開虛構範例 JPEG，保留 MIT license、來源 commit 與 SHA-256；沒有複製生成引擎或 viewer 程式。
