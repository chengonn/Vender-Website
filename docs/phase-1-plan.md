# Phase 1 前端原型執行計畫

使用者已明確要求先建立最初模板，並授權補充尚未討論的前端結構。Phase 0 的五項業務規則仍未定案；本次授權只推進假資料前端原型。

## 開始前公布的頁面清單

| 順序 | 路由                          | 工作                                 |
| ---- | ----------------------------- | ------------------------------------ |
| 1    | `/login`                      | 示範登入入口、兩種視角               |
| 2    | `/dashboard`                  | Supplier Dashboard、統計與待辦       |
| 3    | `/orders`                     | 搜尋、狀態篩選、空資料               |
| 4    | `/orders/new`                 | 建立、費用列、假附件、備註、送出確認 |
| 5    | `/orders/[id]/edit`           | 同一份表單編輯草稿、鎖定提示         |
| 6    | `/orders/[id]`                | 單票、費用、附件名稱、示範版本       |
| 7    | `/orders/[id]/change-request` | 修改原因、送出回饋與未決期限提示     |
| 8    | `/reconciliations`            | 對帳列表                             |
| 9    | `/reconciliations/[id]`       | 申報與認可金額、差異意見預覽         |
| 10   | `/admin/orders`               | 管理端審核列表                       |
| 11   | `/admin/orders/[id]`          | 只讀單票資料與審核意見預覽           |

## 執行順序

1. 重讀來源規格與決策紀錄，唯讀查看參考專案分層。
2. 建立 Next.js、React、TypeScript、Tailwind CSS、React Hook Form、Zod 與測試工具。
3. 先完成共用版型及示範登入，啟動僅監聽 127.0.0.1 的本機預覽。
4. 逐頁實作；每頁完成執行 Prettier、TypeScript、Vitest／Testing Library。
5. 全部完成後執行整體測試、ESLint 與 Next.js build；不部署。
6. 交付啟動說明、檢查紀錄、前端結構決策及保留的業務 TBD。

## 檢查紀錄

`npm run check:page -- PAGE tests/PAGE.test.tsx` 逐項執行格式、型別和指定測試，將實際結束碼附加至 `docs/checks.json`。失敗紀錄保留，修正後重跑，不能改寫為已通過。

以 DOM 元件互動測試檢查操作行為；Next.js build 驗證路由與編譯。這些不等於正式 API 權限、帳務或完整瀏覽器 UAT 驗收。
