# 公司代碼與帳密管理（2026-09-10）

本文件取代舊版文件中的流水號、首次強制改密碼、忘記密碼申請與不顯示現行密碼規則。僅限本機假資料 Demo，沒有寄信或部署。

## 已確認

- 新建公司代碼：英文名稱前三個英文字母大寫＋4位數字亂碼，例如 GRAND OCEAN LOGISTICS → GRA4827。
- User ID 即公司代碼，User ID／密碼由公司提供；使用者不能自行變更密碼、提出忘記密碼申請，也不要求首次登入改密碼。
- 忘記密碼或人員異動時聯絡公司；Admin 可以查看目前有效密碼或設定新密碼。
- GSD 取代 OP，GSD 稽核包含核准、退回、要求更正。稽核對象及其他角色範圍仍待確認；本次沒有開放新的內部角色權限。

## 操作

Admin 登入 → 供應商管理 → 查看／審核 → 公司帳密管理。輸入 Admin 自己的密碼後，選擇查看現行密碼；顯示30秒後隱藏，也可手動隱藏，失去視窗焦點時隱藏。

設定新密碼需要再次輸入 Admin 密碼，新密碼8–128碼。設定後撤銷此供應商所有登入 Session，舊密碼失效，公司需另行交付新密碼。系統不自動寄信。

## 實作假設與遷移

- 移除非英文字元後取前三字母；不足三字母提示補齊。亂碼範圍0000–9999，保留前導零。
- 產生代碼時在 SQLite 寫入交易內排除已用代碼，再用 Node crypto.randomInt 隨機挑選；同字首10000組用盡時拒絕建立。
- 保留既有公司／帳號代碼及所有訂單關聯；新規則只套用新建帳號，既有示範帳號 DOL0001／SOL0001 仍可使用。
- Migration 2 增加 users.password_ciphertext 並取消所有 must_change。既有雜湊無法還原，不擅自重設；只有雜湊驗證符合已知 Demo1234! 的假帳號才補入相同密碼的加密副本。其他舊帳號維持登入能力，查看時提示由公司重新設定。
- 舊 password_requests 表保留歷史資料，但畫面移除且 API 不再接受申請。

## 密碼儲存及 API

保留 scrypt 雜湊供登入驗證，另存 AES-256-GCM 密文，隨機 IV 並以 username 作驗證附加資料。一般 state/list 不回傳有效密碼、密文或雜湊。查閱採獨立 POST、Admin 權限及每次重新驗證，回應 Cache-Control: no-store；操作與失敗驗證記入 audit_logs，不記密碼。重新驗證15分鐘內5次錯誤後暫停。

- POST /api/v1/suppliers/:code/password/reveal：{adminPassword} → {data:{password}}
- POST /api/v1/suppliers/:code/password/set：{adminPassword,newPassword} → {data:{ok:true}}
- POST /api/v1/auth/password-help、auth/change-password：410，請聯絡公司。

加密金鑰預設由本機產生，位於 `.secrets/password-vault.key`，不在 public 或 Git 中；可用 DEMO_VAULT_KEY_PATH 指定獨立位置。此檔案應與 data/vendor-demo.sqlite 配套備份並限制作業系統存取；遺失金鑰便無法查看既有加密密碼。Windows 的實際保護依資料夾 ACL，本 Demo 未自動配置企業金鑰管理服務。持有資料庫及金鑰的人可解密，因此仍只放假資料。

## 驗收項目

登入不出現自助密碼按鈕且不強制更改；新建公司代碼符合字母與亂碼規則；一般列表不洩漏密碼；匿名／Vendor 無法查看或設定；錯誤 Admin 密碼被拒絕；公司設定後撤销舊 Session；重啟仍可解密；舊雜湊無法還原時明確提示。

## 本次檢查結果

前端15項、後端23項測試通過；格式、型別、ESLint與Next建置通過。實際HTTP完成新公司GRA4095建檔／審核／直接登入、Admin查看現行密碼、權限阻擋及停用自助端點。詳細結果見 account-policy-check.json。

更新前資料庫已備份於 data/before-account-policy-20260910.sqlite。既有DOL0001已不是初始示範密碼且無可解密副本，原密碼保持不變；Admin若需查看，須先透過公司設定新密碼。新建GRA4095為本次保留的假資料測試帳號。
