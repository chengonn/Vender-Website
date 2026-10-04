# GSD 文件審核與 Accounting 帳務 Demo

更新：2026-09-10。只在本機使用假資料，未部署。此文件取代舊 Demo 的「Admin 帳單審核」及「尚無 Accounting 月結」描述。

## 示範帳號與職責

| 帳號            | 初始示範密碼       | 可操作                                                 |
| --------------- | ------------------ | ------------------------------------------------------ |
| ADMIN-DEMO      | Demo1234!          | 供應商建檔／審核、帳密、啟停；帳单只查詢               |
| GSD-DEMO        | Demo1234!          | 供應商文件核准、退回、要求更正、修改申請審核           |
| ACCOUNTING-DEMO | Demo1234!          | 對帳紀錄、差異处理、確認對帳、確認結帳、月結單查閱下載 |
| 既有供應商帳號  | 公司提供的現行密碼 | 自家公司帳單提交、修正重送及帳務查詢                   |

內部三角色暫可查閱全部帳單／帳務；只有 Admin 可讀完整供應商建檔及管理密碼。Vendor 僅可讀自家公司資料。CS 權限尚未實作。所有寫入權限由後端驗證，不依賴隱藏按鈕。

## 操作路徑

1. Vendor 提交帳單與假附件檔名。
2. 使用 GSD-DEMO 登入，進入供應商文件審核。選擇核准、退回或要求更正；後兩者必須填說明。核准記錄對應的帳單版本。
3. 退回／要求更正後，Vendor 編輯並重新送審，保留原送出版本。
4. 使用 ACCOUNTING-DEMO 登入，進入對帳與結帳。從 GSD 已核准清單點選「填寫對帳」。
5. 指定結帳月份，按帳單幣別分別輸入申報金額、認可金額及差異原因。儲存後再次確認對帳，帳單變為已對帳。
6. 月結作業依供應商＋月份分組。檢视全部帳單與認可金額，再點「確認結帳並鎖定」。
7. 已結帳月結單可展開查看，下載 CSV；供應商可查阅自己公司的對帳結果與月結單。

## Demo 假設

- GSD 核准是文件審核，不等於對帳或結帳。Accounting 必須對目前已核准版本作業；版本變更後舊對帳不能確認。
- 舊版只有 LOCKED 狀態、没有 GSD 核准版本的帳單，須由 GSD 再次核准。保留既有資料，不自動視為 GSD 已核准。
- 24小時修改申請維持首次送出起算，改由 GSD 核准；核准後另開24小時。已對帳／結帳資料不允許直接修改；沖銷、重開或結帳後更正另待確認。
- 每張帳單一份對帳記錄，按每個幣別一筆彙總。Accounting 依文件手動填金額，不自動乘單價、計稅或判斷含稅／未稅；統一最多2位小數，非負數。幣別集合必須與帳單相符。
- 金額差異未填處理原因时为差異待處理，不能確認。Demo 中 Accounting 填入原因即代表已釐清，不強制另外取得供應商線上簽認。
- 月份由 Accounting 指定，不自動由 Invoice 日期判斷。每家公司每月份只能結帳一次；該月份所有已建立對帳資料都須完成確認。尚未分配至月份的帳單不會自動納入。
- 認可金額以整數分運算、按幣別加總，不換匯；不同幣別不混加。小數規則是 Demo 假設，不是正式幣別精度規則。
- 結帳確認採資料版本校驗及資料庫交易，清單變更須重看；產生不可變月結快照、鎖定對帳與帳單，防止重複結帳。
- 文件仍僅假附件名稱，未新增真實文件上傳／下載或內容解析。CSV 是 Demo 月結資料匯出，不是正式 Invoice。
- 本次没有郵件串接、人工寄送確認、月結通知或正式稅額規則；這些不會被標為已完成。

## API 與資料庫

- GET /api/v1/state 新增 accountingRecords、monthlyStatements，Vendor 依 company_code 過濾。
- POST /api/v1/orders/:id/review：GSD 專用，approved、correction、reason、revision。退回與要求更正分別寫入 REJECTED／CORRECTION_REQUIRED。
- POST /api/v1/orders/:id/decide-change：GSD 專用，維持限時修改規則。
- POST /api/v1/accounting/save：Accounting 專用，orderId、orderRevision、revision、period、lines[{currency,claimed,approved,reason}]、note。
- POST /api/v1/accounting/confirm：Accounting 專用，orderId、orderRevision、revision。
- POST /api/v1/accounting/close：Accounting 專用，companyId、period、expected[{orderId,revision}]。

Migration 3 擴充 users.role（ADMIN／SUPPLIER_USER／GSD／ACCOUNTING），保留舊帳號、密碼、Session及外鍵關聯，新增兩個內部假帳號。新增 accounting_records（order_id 主鍵、公司、月份、狀態、revision、JSON）及 monthly_statements（id 主鍵、公司＋月份唯一、JSON 快照）。業務寫入與稽核紀錄同交易保存；結帳紀錄保留操作者及時間。

舊 /reconciliations 路徑轉至新帳務頁；舊假對帳資料保留，沒有自動轉成已確認帳務。

## 驗收

測試涵蓋角色隔離、GSD要求更正及重送、未核准不能對帳、金額／幣別驗證、差異必填、過期版本、只看自家公司、重複結帳、結帳後修改禁止、按幣別精確加總、重啟資料保存、UI僅讀角色與CSV下載。每個主要頁面另執行格式、型別及頁面測試；結果記錄在 docs/checks.json。

## 已保留試用資料

流程展示假供應商：WOR1484，示範密碼 Demo1234!。已保留「待GSD審核範例」「待Accounting對帳範例」及「已結帳範例」三筆；已結帳範例月份為2026-08、TWD 99.99。可登入 GSD-DEMO／ACCOUNTING-DEMO 操作另兩筆待辦；若使用月份2026-09，不會與已結帳範例月份衝突。

前端25項與後端32項測試通過，API完整流程與資料庫外鍵／完整性檢查通過。瀏覽器已驗證角色登入、Accounting表單及月結單展開內容，並檢視桌面深色版面。備份位於 data/before-gsd-accounting-20260910.sqlite。
