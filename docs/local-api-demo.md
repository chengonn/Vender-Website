> 2026-09-10 更新：GSD／Accounting 審核、對帳與結帳已實作。以下較早流程中的 Admin 帳單審核與尚無月結說明已被取代；現行規則請見 [gsd-accounting-demo.md](gsd-accounting-demo.md)。

# 本機 API Demo（2026-09-10 更新）

本次依使用者授權將未定規則以 Demo 假設補足，直接修改 `C:\vendor\vendor-portal-login\vendor-portal`。本版本只在本機運行，不部署上架。

## 啟動

在專案資料夾執行（需要 Node.js 24.18 或目前較新相容版本；現有套件已齊備）：

```powershell
cd C:\vendor\vendor-portal-login\vendor-portal
node scripts/start-demo.mjs
```

此指令先建置，再只綁定 `127.0.0.1:3100`。網址為 http://127.0.0.1:3100/login 。視窗保持開啟，Ctrl+C 結束服務。若埠被占用，先關閉上一個 Demo，或 `$env:PORT="3101"` 後啟動。不要同時對同一 `.next` 目錄執行 build 與 dev。

已啟動的服務不需要再次開啟。開發時可用 `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100`。

## 示範登入

| 帳號       | 初始密碼  | 用途                                     |
| ---------- | --------- | ---------------------------------------- |
| ADMIN-DEMO | Demo1234! | Admin，管理供應商、帳單及修改申請        |
| DOL0001    | Demo1234! | 供應商 A，不要求改密碼，有六筆初始假訂單 |
| SOL0001    | Demo1234! | 供應商 B，供資料隔離驗證，初始沒有訂單   |

初始資料只在首次建立資料庫時寫入。帳密由公司管理，重開程式不會重設。請勿輸入真實密碼、供應商個資或銀行資料。

## 已串接流程

1. Admin 登入 → 供應商管理／建檔 → POST 保存 → 進入建檔審核通過。
2. 登出，使用新公司代碼及初始密碼登入 → 供應商自己的工作台。
3. 建立訂單 → 保存草稿／確認送出 → DB 保存；重新整理仍存在。後端自動採登入公司的歸屬及供應商名稱。
4. 已送出訂單在首次送出後 24 小時內申請修改 → Admin 訂單明細核准 → 可編輯 24 小時 → 重送建立新版本。
5. Admin 帳單審核：通過後 LOCKED，退回後 REJECTED 可修正。審核記錄持久化。
6. Admin 在供應商明細再次驗證密碼後，可查看或設定現行密碼；供應商忘記密碼或人員異動需聯絡公司。
7. 固定示例對帳的同意／差異回覆可保存，但不作正式確認／開票。

## Demo 假設

- Admin 具有此 Demo 全部公司範圍；Vendor 只讀寫自己公司。Accounting／CS／GSD 尚不開放登入或建檔授權。
- 供應商建檔一公司一主帳號；帳號即公司代碼。英文前三個字母大寫＋四位數字亂碼，在 DB 交易中排除已用代碼後隨機選取；禁止供應商表單建立 Admin。
- 建檔須先通過審核且啟用才能登入；公司關閉時撤銷該公司 Session。Demo 單帳號公司尚未拆分公司與個人啟停 UI。
- 24 小時從首次送出起算，滿 24 小時拒絕；修改核准後另開放 24 小時。重送不重新起算申請期限。
- 過期以每次已登入 API 請求進行鎖定整理，不需要常駐排程；恢復最後送出版，捨棄未重送工作稿，保留版本與稽核。即使 UI 未更新，POST 也拒絕逾期修改。
- REJECTED 可直接修正，不需另申請。INVOICED／MONTH_CLOSED 不可直接改單。
- 送出最低要求為客戶名稱、File No. 與一筆費用；其餘沿用原型格式驗證，不表示正式業務必填已定案。
- 稅額、幣別合計、Invoice、月結、良美整合與真實附件上傳未啟用。附件目前只保存假檔名，費用數值保留字串不作正式計算。
- Node scrypt 用於登入驗證，另以 AES-256-GCM 保存可還原的密碼供 Admin 查看，詳見 account-policy.md。初始密碼至少8碼最多128碼，Session 8小時；HttpOnly/SameSite=Strict Cookie。本機 HTTP 不設 Secure，這不是可直接部署的安全設定。
- 同源 POST 需要正確 Origin；Host只接受loopback。登入同帳號15分鐘最多10次失敗。Admin 再次驗證五次失敗後限制15分鐘。
- SQL使用參數、外鍵、交易；Order revision防止過期覆寫，送出版本不覆寫。不提供跨請求Idempotency-Key或大規模分頁。

## 資料庫

預設檔案 `data/vendor-demo.sqlite`，由首次 API 請求自動建立。`DEMO_DB_PATH` 可指定另一個絕對路徑（主要用於測試）。資料檔、WAL/SHM不加入Git。密碼不存明文，Session只存token hash。公司／銀行欄位在此**假資料專用**Demo profile JSON中，尚無正式銀行欄位加密。

| 表                    | 用途                                                                    |
| --------------------- | ----------------------------------------------------------------------- |
| migrations            | 初始化版本記錄，避免重新seed                                            |
| companies             | 公司代碼PK、profile JSON、審核與啟用狀態                                |
| users                 | username PK、company FK、角色、密碼雜湊、加密密碼、停用的首次改密碼旗標 |
| sessions              | token hash PK、username FK、到期時間                                    |
| orders                | id PK、company FK、revision、當前Order JSON                             |
| order_versions        | order_id + version複合PK、不可變送出JSON                                |
| modification_requests | Order／公司FK、理由、狀態、原狀態、期限                                 |
| password_requests     | 歷史申請保留；不再接受新申請                                            |
| reconciliations       | 對帳id、company FK、示例金額與保存的回覆                                |
| audit_logs            | 操作者、動作、資源、時間；不保存密碼/token                              |
| login_attempts        | 登入失敗計數與限流期限                                                  |

SQLite 使用 WAL、foreign_keys、busy_timeout。DDL 與初始化在 `src/server/database.ts`；這是小型本機 Demo 的 JSON 混合模型，**不是之前後端交接文件的完整 PostgreSQL 正規化方案**。多使用者正式環境仍需依交接規格拆費用、银行、權限、稽核快照、正式Migration等。

停機備份：先停止 Demo 再複製整個 `data` 資料夾；不要只複製运行中單一 sqlite 主檔而遗漏 WAL。重置時先備份並另指定一個新 `DEMO_DB_PATH`；本次不自動刪除現有資料。

## API

Prefix `/api/v1`；GET 回 `{data:...}`；POST傳JSON。所有資料API需Session，只有health/login/logout例外；兩個自助密碼端點均回410。錯誤回 `{error:"說明"}` 與對應HTTP狀態。

| 方法 | 路徑                             | 內容                                           |
| ---- | -------------------------------- | ---------------------------------------------- |
| GET  | /health                          | SQLite連線健康狀態                             |
| POST | /auth/login                      | username,password                              |
| POST | /auth/logout                     | 空物件                                         |
| POST | /auth/change-password            | 已停用，回410                                  |
| POST | /auth/password-help              | 已停用，回410                                  |
| POST | /suppliers/:code/password/reveal | Admin限定；adminPassword                       |
| POST | /suppliers/:code/password/set    | Admin限定；adminPassword,newPassword           |
| GET  | /state                           | 權限範圍內公司／訂單／對帳／通知；沒有密碼hash |
| POST | /suppliers                       | 既有SupplierInput（只允許Vendor）              |
| POST | /suppliers/:code/review          | approved,note                                  |
| POST | /suppliers/:code/status          | enabled：啟用／關閉                            |
| POST | /orders/save                     | values,attachments,id?,revision?,submit        |
| POST | /orders/:id/change-request       | reason,revision                                |
| POST | /orders/:id/review               | approved,reason,revision（Admin）              |
| POST | /orders/:id/decide-change        | approved,revision（Admin）                     |
| POST | /reconciliations/:id             | response：AGREE／DISPUTE、reason               |

PowerShell POST範例（只使用Demo帳密，不輸出Cookie）：

```powershell
$base = 'http://127.0.0.1:3100'
$headers = @{ Origin = $base }
$loginBody = @{ username='ADMIN-DEMO'; password='Demo1234!' } | ConvertTo-Json
Invoke-RestMethod "$base/api/v1/auth/login" -Method Post -ContentType 'application/json' -Headers $headers -Body $loginBody -SessionVariable demoSession
Invoke-RestMethod "$base/api/v1/state" -WebSession $demoSession
```

Postman同樣加 `Origin: http://127.0.0.1:3100`，登入後保留cookie；更換port時Origin同步更新。

## 檢查與維護

```powershell
node scripts/test-all.mjs
node scripts/typecheck.mjs
node node_modules/eslint/bin/eslint.js .
node node_modules/prettier/bin/prettier.cjs --check .
```

目前前端API測試在 `tests/api-ui.test.tsx`，後端真SQLite測試在 `tests/backend.test.ts`。原記憶體原型頁面測試保留供歷史參考，已不在本版預設測試清單；原mock-service與編碼測試仍執行。`docs/pre-api-backup/frontend-source.zip` 保存修改前src/tests。不能把舊版43項原型測試當成本版API已通過的證據。

技術依據：[Node SQLite](https://nodejs.org/api/sqlite.html)、[Node Crypto](https://nodejs.org/api/crypto.html)。本次未安裝新套件，使用已安裝Node內建SQLite與scrypt。

## 本次驗證結果（2026-09-09）

- 前端API串接與保留的純邏輯測試：14項通過。
- 後端Request handler + 獨立真SQLite整合測試：18項通過；含公司隔離、權限、密碼雜湊／首次更換、Session撤銷、POST建檔、版本／revision、24小時截止、過期恢復、資料庫重開持久化及Origin／Host差異回歸。
- 格式、型別、ESLint與Next.js建置完成。API串接頁面檢查記錄在 checks.json。
- 真實HTTP驗證見 api-http-check.json：POST登入→建檔HSS0001→審核→GET讀回→登出後401。此筆「HTTP串接測試公司」留在Demo作範例，帳密初始為HSS0001 / Demo1234!，首次仍須更換。
- 瀏覽器已驗證Admin登入、供應商管理頁及重新整理後資料仍在，並檢視桌面排版；未進行全瀏覽器／手機完整回歸。
- 實際資料库結構可看 demo-database-schema.sql（僅DDL，無資料），一致性檢查見 demo-database-check.json。

最新帳密規則、金鑰與資料遷移說明見 [account-policy.md](account-policy.md)。下方或歷史測試筆數不代表本次檢查結果。
