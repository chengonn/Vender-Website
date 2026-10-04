# 視覺樣式調整 · 2026-09-06

依使用者要求，將前端模板調整為接近 smart-operation-digital-dashboard-frontend 的深色介面。只唯讀查看參考專案樣式，未修改其檔案、帶入登入邏輯或連線設定。

## 參考與對應

| 參考來源（src 下）                              | 樣式特徵                                                       | 本次套用                     |
| ----------------------------------------------- | -------------------------------------------------------------- | ---------------------------- |
| styles/Main.css                                 | 黑色外框、#343541 工作區、15px 圓角、Helvetica／中文無襯線字體 | 全站背景、工作區、字體及捲軸 |
| component/Common/NavBar.module.css              | 黑色導覽列、#ACACBE 使用者外框                                 | 頁首與示範視角選單           |
| component/Dashboard/DashBoardSidebar.module.css | 250px 黑色側欄、#ACACBE 選中底色、18px 圓角、1024px 收合       | 側欄、選中項目及窄螢幕導覽   |
| component/UserControl/UserApplyTable.module.css | #444 表頭、灰色交錯列、明確表格邊框                            | 訂單／費用／對帳表格         |
| pages/Home/Home.module.css                      | #ABD6FF 操作按鈕                                               | 主要按鈕與淡藍色操作提示     |
| pages/Login/Login.module.css                    | #1B2735 至 #090A0F 徑向漸層、置中品牌                          | 置中示範登入頁               |

以實際來源 CSS 建立相似視覺語言，不宣稱逐像素複製。保留 Vendor 自己的文字、圖示與頁面內容，未加入參考系統的品牌圖片、星空動畫或帳號登入功能。

修改集中在 src/styles/globals.css 與登入頁呈現；原有訂單、修改申請、對帳和審核操作維持原型範圍。

## 驗證

- Prettier、Next.js 路由型別產生、TypeScript、ESLint 通過。
- 全套 13 個測試檔、33 項測試通過，實際紀錄見 docs/checks.json 的 reference-style。
- Next.js build 成功。
- 本機 /dashboard 回應 HTTP 200，提供本機預覽。
- 未執行真實瀏覽器視覺比對或裝置截圖驗收；不將元件測試視為像素相似度驗證。
- 不安裝新套件、不部署，既有業務 TBD 未改為定案。
