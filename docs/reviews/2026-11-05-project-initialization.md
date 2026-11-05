# 2026-11-05 產品提案與 Project 初始化

## Request / confirmed scope

使用者要求先明確產品定位與 serving platform 方向，將相關文件寫在 docs，呈現生動、可視覺化的 proposal，包含動機、團隊、設計流程、差異化、願景、目標、MVP、高層分工。授權初始化到 Cathay-AI repo 與既有 Project；先維持 high level，再依試點收斂產品。Render 輕量且 mobile friendly。

## Confirmed people

Mika／Victor 可當屋主；Even／Josh 有工班與設計師資源；Chris 有裝修經驗；全員可開發。Victor、Even、Chris 可研究部署、架構與網域。未提供其他成員 GitHub username，也未授權購買。

## Starting snapshot

`Cathay-AI/interior-design` 是無 commit 的空 repo；Project #1 為私人、0 items，有既存 roadmap/backlog views 與 Todo／In progress／Done。只修改此次新建文件與新增工作項目，不改其他 side projects。檢查時 origin/main 不存在，沒有可用 HEAD；以空 Git tree 作此次審查基線，不創造假歷史。

## Decisions / implementation notes

使用 docs 作 proposal 與決策來源；現有 GitHub Project 作協作入口。保持 scope 高層，不建立大量實作 tickets。原生 milestones、sub-issues、blocking relationships 與姓名主責欄協助認領。角色細分是初始建議，不冒充個人已認領。施工交付為漸進驗證目標。

技能：to-spec 做既有對話綜整；to-tickets 的依賴／可驗收成果原則用於高層工作項目；answer-me-with-html 產生單檔視覺 proposal。完成後以 code-review 分開檢查文件標準與需求覆蓋；無 app implementation。

## 2026-11-05 Commands / results

- PASS：`gh project list --owner Cathay-AI --format json`、field／view 查詢；確認既有 Project 與可更新權限。
- PASS：clone 空平台 repo；clone 並讀取上游 skill main `c0b11a68b41a3d147829a82791c9e2025a6c3c00`。
- PASS：上游 `demo --out <temporary-output> --no-serve`，exit 0；範例產物生成，不涉及付費 image API 或 Blender。
- UNVERIFIED：真實住宅生成、上游完整測試、平台程式、手機 WebGL 實機效能、專業／施工品質。
- PASS：`am render` 產生自含 HTML，8 面板、2 flow、2 timeline；STE 0 warnings。保留內容來源與桌機預覽圖。
- PASS：Chrome 桌機截圖；CDP 390px viewport 檢查 `innerWidth=390 / scrollWidth=390`、8 面板。僅文件排版，非實機 3D 驗證。
- PASS：本地相對連結檢查、`git diff --cached --check`；上游 demo manifest 的 105 個附件 SHA-256 全數相符，4 variants／8 sheets。
- PASS：code-review 的 Standards 與 Spec 分別審查，均 0 findings；後續補入 tracker 連結與閱讀方式文件。
- PASS：建立 6 milestones、[父 issue #1](https://github.com/Cathay-AI/interior-design/issues/1) 與 8 個高層子項目（#2–#9），連結原生 sub-issues／blocking relationships。
- PASS：9 issues 全數加入私人 Project #1；沿用 Todo／In progress／Done，新增「推進主責」姓名欄與 [MVP 看板](https://github.com/orgs/Cathay-AI/projects/1/views/4)，按 Status 分欄。
- Connector limitation：GitHub app connector 對此 repo create issue 回 404；改用既有授權的 gh CLI 完成，未要求額外權限。
- Repo commit／push：本節將於發佈後補入結果。

## Open questions

第一案尺寸、專業夥伴意願、主責認領、技術棧／host、網域、費用上限、付費方式、材料來源與施工發行責任。保持 planning，不對未定範圍貼 ready-for-agent。
