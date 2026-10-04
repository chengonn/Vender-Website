# 前端結構與原型決策

## 參考方式

已唯讀檢視 `C:\Users\cheng\OneDrive\桌面\smart-operation-digital-dashboard-frontend` 的 package.json、src 分層與 DashboardSidebar 元件。參考專案使用 Create React App、React Router、MUI；本專案依使用者要求使用 Next.js 與 Tailwind，不搬入原專案的 API、帳號、商業資料或認證內容。

| 參考專案            | 本模板                            | 原因                                                    |
| ------------------- | --------------------------------- | ------------------------------------------------------- |
| `src/pages`、路由檔 | `src/app`                         | App Router 路由入口及共用 layout                        |
| `src/component`     | `src/components`                  | 共用版型、UI 與訂單表格；統一複數命名                   |
| 頁面內部邏輯        | `src/features`                    | 依 auth、dashboard、orders、reconciliations、admin 分組 |
| `src/context`       | `src/context`                     | React Context 共用本次示範狀態                          |
| `src/data`          | `src/data`                        | 手工編寫的假訂單與對帳顯示資料                          |
| `src/services`      | `src/services`                    | 明確命名 mock service；之後替換為 API adapter           |
| `src/config`        | `src/config`                      | 示範公司、頁面狀態標籤等顯示設定                        |
| `src/styles`        | `src/styles`                      | Tailwind 與共用視覺樣式                                 |
| 型別分散            | `src/types`                       | 前端資料型別集中，不宣稱是正式 API contract             |
| 未明定              | `src/schemas`                     | Zod 輸入格式驗證，與業務 TBD 分開                       |
| 既有測試方式        | `tests`、`scripts/check-page.mjs` | 元件行為測試及逐頁檢查                                  |

`hooks`、`utils` 不先放空目錄；目前 useDemo 與 Provider 緊密相關而同檔維護，之後有共用需求再抽取。現階段是單一前端專案，未建立 apps/api、資料庫或 monorepo 工具。Phase 2 若採規格 monorepo，可將此前端移入 apps/web，保留上述 src 分層。

## 本次補充的前端決策

| ID  | 決策                                                                                      | 性質                     |
| --- | ----------------------------------------------------------------------------------------- | ------------------------ |
| F01 | 繁體中文介面，黑色側欄、深灰工作區、灰紫選中項目與淡藍主按鈕（2026-09-06 依參考專案更新） | 可替換的視覺基線         |
| F02 | `(workspace)` route group 共用側欄、頁首與原型提示                                        | 前端結構                 |
| F03 | 僅 Supplier／Admin 示範視角；切換入口公開，不驗證身分、不代表授權                         | 展示操作                 |
| F04 | 單一 Context 保存假訂單；重新整理或離開示範後重設；不使用儲存服務                         | 展示生命週期             |
| F05 | `DEMO-*` 假編號；草稿、示範送出 v1 與鎖定僅為前端展示                                     | 非正式編號或狀態機       |
| F06 | 建立／編輯共用 React Hook Form 與 Zod；目前僅格式驗證、備註最多 1000 字                   | 必填清單未定，未私自新增 |
| F07 | 金額以字串保存；列表金額及對帳差異均為人工設定示例。表單不計稅額、不跨幣別加總            | 未制定計算或取整規則     |
| F08 | 附件按鈕只新增假檔名，不存取本機文件內容、不上傳檔案                                      | 附件操作示意             |
| F09 | 已送出訂單的編輯路由顯示鎖定；修改申請可展示收件，但不核准或產生期限                      | Q06–09、Q23 未定         |
| F10 | 審核與對帳頁可預覽意見，不完成正式核准、對帳或開票                                        | Q13–16、Q23–25 未定      |
| F11 | 未知訂單顯示清楚的空資料與返回入口；手機可切換側欄，表格水平捲動                          | 前端基本行為             |
| F12 | 本機 Next.js 程序只監聽 127.0.0.1；無正式登入、後端 API、資料庫或部署                     | 本次範圍                 |

保留 Phase 0 所有 Q01–Q27／C01–C12，不因模板中呈現某個欄位或按鈕而視為業務定案。正式附件、帳號、權限與資料隔離仍須另期完成。

## 技術參考

- [Next.js 官方安裝與 App Router 文件](https://nextjs.org/docs/app/getting-started/installation)
- [Tailwind CSS 官方 Next.js 設定](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- 已閱讀安裝版本內附的 layouts-and-pages、server-and-client-components、dynamic-routes 指南。

依使用者指定，使用真正 Next.js，而非 Sites 的 Vinext／Vite starter。此為本機交付，不註冊或部署 Sites。
