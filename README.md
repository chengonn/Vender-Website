# Vendor Portal 本機 API Demo

Next.js + React + TypeScript 前端，Next.js Route Handlers 後端，SQLite 檔案資料庫。已串接登入、供應商建檔／審核／啟停、訂單儲存／送出／審核、修改申請與公司帳密管理。只使用假資料，沒有部署。

## 啟動

```powershell
cd C:\vendor\vendor-portal-login\vendor-portal
node scripts/start-demo.mjs
```

開啟 http://127.0.0.1:3100/login 。使用已安裝套件及 Node 24.18+，不需要 Docker。啟動腳本先建置，再只監聽本機3100埠；Ctrl+C停止。若已啟動則直接開啟網址。

## 示範帳號

- 管理者：`ADMIN-DEMO / Demo1234!`
- 供應商A：`DOL0001 / Demo1234!`，直接使用公司提供的密碼登入。
- 供應商B：`SOL0001 / Demo1234!`，初始無訂單，可驗證公司隔離。

業務資料保存在 `data/vendor-demo.sqlite`，重新整理或登出不會清空。請勿輸入真實密碼、供應商或銀行資料。

[完整操作、API POST範例、資料庫結構與Demo假設](docs/local-api-demo.md)

## 驗證

```powershell
node scripts/test-all.mjs
node scripts/typecheck.mjs
node node_modules/eslint/bin/eslint.js .
node node_modules/prettier/bin/prettier.cjs --check .
```

後端測試使用獨立臨時SQLite；不改使用者Demo資料。現行測試為API串接版，歷史記憶體原型測試及先前決策留作參考，不能視為現在的正式規格。

稅額計算、Invoice、真實附件上傳、Email及正式部署未啟用。Demo 對帳、月結鎖定及 CSV 匯出已可操作。本機SQLite JSON模型供Demo，未宣稱已完成正式PostgreSQL架構。

帳密規則已於 2026-09-10 更新：[公司代碼與帳密管理](docs/account-policy.md)。

## GSD 與 Accounting 新流程

- GSD-DEMO／Demo1234!：文件審核、核准、退回、要求更正。
- ACCOUNTING-DEMO／Demo1234!：對帳、處理差異、確認結帳與月結 CSV 下載。
- Admin 保留供應商與帳密管理，不再執行帳單文件審核。

[完整操作與 Demo 假設](docs/gsd-accounting-demo.md)。舊版說明如有衝突，以此新文件為準。
