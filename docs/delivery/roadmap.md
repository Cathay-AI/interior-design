# Roadmap v0.2：簡單體驗，分階段驗證

現行方向：語音／文字＋參考圖 → 3D＋粗略報價；進階付費，手機優先且電腦可用。台灣裝修條件是差異化，技術引擎未定。保持高層成果與分工，不預填日期、價格或工時。

| Milestone | 完成證據 |
|---|---|
| [M0 · 產品與來源對齊](https://github.com/Cathay-AI/interior-design/milestone/1) | 簡單旅程、有限估價／檢查集、供應商與部署選項。 |
| [M1 · 語音圖片到 3D](https://github.com/Cathay-AI/interior-design/milestone/2) | 手機與電腦輸入，產生可查看的 3D 視覺方案。 |
| [M2 · 粗報價與台灣條件](https://github.com/Cathay-AI/interior-design/milestone/3) | 有來源的預算區間及空間／法規／消防／機電檢查。 |
| [M3 · 進階解鎖與案例](https://github.com/Cathay-AI/interior-design/milestone/4) | 驗證付費權益與案例發布，無真實案例則空狀態。 |
| [M4 · 跨裝置試點](https://github.com/Cathay-AI/interior-design/milestone/5) | 手機／桌機基本流程、預算理解、sandbox 解鎖與升級意願。 |
| [M5 · 專業服務延伸](https://github.com/Cathay-AI/interior-design/milestone/6) | 依試點證據決定專業深化或工程服務，不作基本體驗前提。 |

## 三條先並行

Mika／Victor 定義使用者旅程；Even／Josh 定義台灣條件與量價來源；Chris／Even／Victor 比較架構、部署、成本與網域。

## 工作項目

| 工作 | 推進主責 | 協作 | Blocked by |
|---|---|---|---|
| [#2 [G01] 屋主旅程：語音／文字＋參考圖到 3D 與預算](https://github.com/Cathay-AI/interior-design/issues/2) | Mika | Victor | 無 |
| [#3 [G02] 台灣條件與估價基準：法規、消防、機電、空間](https://github.com/Cathay-AI/interior-design/issues/3) | Josh | Even、Victor | 無 |
| [#4 [G03] 彈性架構與部署：STT、生成、估價、付費與網域](https://github.com/Cathay-AI/interior-design/issues/4) | Chris | Even、Victor（共同主責） | 無 |
| [#5 [G04] 基本體驗：手機／電腦輸入與 3D 提案](https://github.com/Cathay-AI/interior-design/issues/5) | Mika | Chris、Victor | [#2](https://github.com/Cathay-AI/interior-design/issues/2)、[#4](https://github.com/Cathay-AI/interior-design/issues/4) |
| [#6 [G05] 結果頁：粗略報價與可追溯的台灣限制](https://github.com/Cathay-AI/interior-design/issues/6) | Victor | Even、Josh、Chris | [#5](https://github.com/Cathay-AI/interior-design/issues/5)、[#3](https://github.com/Cathay-AI/interior-design/issues/3) |
| [#7 [G06] 商業 MVP：進階付費解鎖與真實案例入口](https://github.com/Cathay-AI/interior-design/issues/7) | Even | Mika、Chris、Josh、Victor | [#6](https://github.com/Cathay-AI/interior-design/issues/6) |
| [#8 [G07] 跨裝置試點：基本成果、預算理解與升級意願](https://github.com/Cathay-AI/interior-design/issues/8) | Victor | Mika、Even、Josh、Chris | [#7](https://github.com/Cathay-AI/interior-design/issues/7) |
| [#9 [G08] 後續探索：專業深化、工程資料與服務方案](https://github.com/Cathay-AI/interior-design/issues/9) | Josh | Even、Victor，需專業夥伴 | [#8](https://github.com/Cathay-AI/interior-design/issues/8) |

[父提案 #1](https://github.com/Cathay-AI/interior-design/issues/1) · [看板](https://github.com/orgs/Cathay-AI/projects/1/views/4)。表為 v0.2 快照，即時狀態以 GitHub 為準。M5 為選擇性延伸，不阻擋基本 MVP。
