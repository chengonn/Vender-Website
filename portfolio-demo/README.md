# STARLANE 星航供應商平台｜面試展示版

以虛構品牌與假資料呈現供應商、文件審核及帳務協作流程。此作品是協助釐清企業需求的互動原型，使用 AI 協助開發；未正式上線，未宣稱實際營運成效。

## 本版與本機完整版

本資料夾是獨立 Next.js 靜態匯出專案，沒有 API、資料庫、密碼或伺服器端登入。角色切換只展示操作分工，不是安全機制。資料使用 localStorage，同一瀏覽器同一網站來源會保留；其他裝置不共享，清除瀏覽器資料後會消失。不同頁籤最後一次儲存的版本會覆蓋先前版本，不支援多人協作。

原本上層專案的 API、SQLite 與帳號不受本版影響。**只以本資料夾建立面試作品倉庫，勿上傳整個上層專案**。本資料夾未包含公司內部文件、舊 Logo、資料庫或密鑰。

## 展示功能

- Vendor：固定代表 STA1001，建立、編輯草稿，送審及退回後更正。
- Admin：建立假供應商，審核通過、啟用或關閉；不建立真正帳密。
- GSD：核准、退回更正，退回原因必填。
- Accounting：核定金額、填写差異原因、選擇帳期、確認對帳、月結與 CSV 下載。
- 所有人：角色切換、查看示範流程及紀錄、重設示範資料。

未實作正式登入、附件上傳、郵件、稅額計算、Invoice、Debit / Credit Note、24 小時修改申請、月結撤銷及供應商自助帳密管理。表單為精簡的單費用示範；不等同完整業務需求。金額最多八位整數及兩位小數，各幣別獨立加總。對帳完成即鎖定；同公司同月份不能重複結帳，未指定帳期的訂單不自動納入。

## 在現有工作區執行（不需安裝）

在上層 `vendor-portal` 目錄執行：

```powershell
node node_modules/next/dist/bin/next dev portfolio-demo --hostname 127.0.0.1 --port 3200
node node_modules/next/dist/bin/next build portfolio-demo
node node_modules/typescript/bin/tsc --noEmit -p portfolio-demo/tsconfig.json
```

測試在本資料夾執行：

```powershell
node ../node_modules/vitest/vitest.mjs run --config vitest.config.ts
```

建置結果為 `out/`。不要直接雙擊 HTML，請使用靜態 HTTP 伺服器預覽。

已提供不需安裝套件的預覽工具，在上層目錄執行 `node portfolio-demo/scripts/preview.mjs`，開啟 `http://127.0.0.1:3200`。此工具只提供靜態檔案，並非業務後端。

## 獨立使用

只複製本資料夾到新目錄，排除 `.next`、`node_modules`、`out`，安裝 `package.json` 指定的依賴後執行 `npm run dev` 或 `npm run build`。本次沒有安裝依賴，也沒有建立 GitHub 倉庫或發布。

## GitHub Pages 路徑

根網站 `username.github.io` 使用空的 `PAGES_BASE_PATH`。專案網站 `username.github.io/starlane-demo/` 必須在建置前設定：

```powershell
$env:PAGES_BASE_PATH = '/starlane-demo'
npm run build
```

本版所有互動在單一頁面內完成，避免 GitHub Pages 動態路由重新整理 404。部署時僅上傳 `out/` 靜態產物；使用 Pages Actions artifact 或在分支部署根目錄加入 `.nojekyll`，避免 `_next` 被忽略。儲存庫名稱尚未確定，目前產物以根路徑建置，確定名稱後需要重新建置。

## 三分鐘面試腳本

1. 進入 Vendor，展示三筆不同狀態的案例；建立一筆草稿並送審。
2. 切換 GSD，退回剛建立的訂單並填原因；切回 Vendor 修正再送審。
3. GSD 核准，切換 Accounting，在訂單中填核定金額、未結帳帳期及必要差異原因。
4. 進入「對帳與月結」，結清月份、下載 CSV，查看鎖定狀態。
5. 展示 Admin 的供應商建檔；最後使用「重設示範資料」。

建議介紹：「我協助把企業流程整理成需求及角色分工，再使用 AI 輔助開發原型。這個公開展示版使用假資料，讓面試官體驗狀態流程；本機完整版另外展示 API 與資料庫。」
