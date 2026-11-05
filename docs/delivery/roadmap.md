# Roadmap：以成果收斂產品

日期：2026-11-05。以下為高層規劃，不是工程 sprint 或工期承諾。使用現有 [GitHub Project](https://github.com/orgs/Cathay-AI/projects/1)，每個工作項目先列 Todo，再認領與細拆。

| Milestone | 目標 | 完成證據 | 主要成員 |
|---|---|---|---|
| M0 方向與基準 | 屋主、專業夥伴與部署方向對齊 | 一份案例 brief、分級交接清單、部署與網域選項決策 | 全體；Mika/Victor、Even/Josh、Chris/Even/Victor 各推一條線 |
| M1 輕量線上檢視 | 能透過手機開啟指定方案 | 有權限控制的試點環境，真實 GLB／圖面／下載與裝置測量 | Mika、Chris、Victor |
| M2 方案修改與版本 | 讓屋主完成一次修改並比較 | 至少一種支援修改，重產狀態、失敗保留、同版產物 | Mika、Victor、Chris |
| M3 材料預估與交接 | 專業夥伴知道方案、費用依據與缺口 | 牆地材用量／單價依據、圖面索引、待決事項與交接包 | Even、Josh，Chris 協作 |
| M4 真實使用試點 | 判斷是否值得擴大 | 兩位內部屋主操作紀錄、至少一位專業夥伴回饋、成本與付費意願 | 全體 |
| M5 施工可用性探索 | 選定工項逐步達到可施工的交付要求 | 實測尺寸、選定產品、必要詳圖與工種確認，按範圍記錄發行條件 | Even、Josh、Victor；需專業夥伴加入 |

## 可立即分頭開始的三條線

1. Mika、Victor：準備首個使用者情境與驗收腳本。
2. Even、Josh：訪談專業夥伴，定義「能討論、能詢價、能施工」各缺什麼。
3. Chris、Even、Victor：提出部署、skill 執行與網域選項；初期不先購買。

M1 可先接上游虛構 demo 研究呈現，但真實使用驗收需有 M0 案例。M3 的量價與交接需要專業需求及 M2 同版產物。M5 是依 M4 決定是否投資的探索工作，不因 roadmap 有此欄就承諾全自動施工圖。

## 工作項目與依賴

<!-- tracker-links:start -->
| 工作項目 | 推進主責 | 協作 | Milestone | Blocked by |
|---|---|---|---|---|
| [#2 [G01] 屋主需求與首個真實空間：定義 MVP 驗收案例](https://github.com/Cathay-AI/interior-design/issues/2) | Mika | Victor | [M0](https://github.com/Cathay-AI/interior-design/milestone/1) | 無 |
| [#3 [G02] 專業夥伴需求：定義討論、詢價與施工交接門檻](https://github.com/Cathay-AI/interior-design/issues/3) | Josh | Even、Victor | [M0](https://github.com/Cathay-AI/interior-design/milestone/1) | 無 |
| [#4 [G03] 部署與架構選型：skill host、成本、環境及網域規劃](https://github.com/Cathay-AI/interior-design/issues/4) | Chris | Even、Victor（共同主責） | [M0](https://github.com/Cathay-AI/interior-design/milestone/1) | 無 |
| [#5 [G04] MVP 上線可看：輕量手機 3D、平面與工程圖檢視](https://github.com/Cathay-AI/interior-design/issues/5) | Mika | Chris、Victor | [M1](https://github.com/Cathay-AI/interior-design/milestone/2) | [#2](https://github.com/Cathay-AI/interior-design/issues/2)、[#4](https://github.com/Cathay-AI/interior-design/issues/4) |
| [#6 [G05] MVP 可以改：一次材料修改、重新產出與版本比較](https://github.com/Cathay-AI/interior-design/issues/6) | Victor | Mika、Chris | [M2](https://github.com/Cathay-AI/interior-design/milestone/3) | [#5](https://github.com/Cathay-AI/interior-design/issues/5) |
| [#7 [G06] MVP 可以交接：牆地材預估、同版圖面與待決事項](https://github.com/Cathay-AI/interior-design/issues/7) | Even | Josh、Chris、Victor | [M3](https://github.com/Cathay-AI/interior-design/milestone/4) | [#3](https://github.com/Cathay-AI/interior-design/issues/3)、[#6](https://github.com/Cathay-AI/interior-design/issues/6) |
| [#8 [G07] 真實試點：屋主操作、專業回饋與商業假設收斂](https://github.com/Cathay-AI/interior-design/issues/8) | Victor | Mika、Even、Josh、Chris | [M4](https://github.com/Cathay-AI/interior-design/milestone/5) | [#7](https://github.com/Cathay-AI/interior-design/issues/7) |
| [#9 [G08] 願景驗證：選定工項的施工可用性與責任範圍](https://github.com/Cathay-AI/interior-design/issues/9) | Josh | Even、Victor，需實際專業夥伴 | [M5](https://github.com/Cathay-AI/interior-design/milestone/6) | [#8](https://github.com/Cathay-AI/interior-design/issues/8) |

父項目：[Proposal v0.1 #1](https://github.com/Cathay-AI/interior-design/issues/1)。此表為初始化快照；認領與即時狀態以 GitHub 為準。
<!-- tracker-links:end -->

## 暫不設定

不預填日曆日期、價格、服務供應商或成員投入時數。由主責認領後，依範圍與容量估時。第一版不以 issue 數量或生圖數量作成功指標。
