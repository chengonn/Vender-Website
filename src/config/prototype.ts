export const changeRequestLimitHours = 24;
export const prototype = {
  name: "Vendor Portal",
  company: "示範供應商 A",
  companyId: "DEMO-COMPANY-A",
  notice: "本機 API Demo · 僅限假資料 · SQLite 持久保存",
} as const;
export const statusLabels = {
  DRAFT: "草稿",
  SUBMITTED: "待審核",
  UNDER_REVIEW: "審核中",
  CORRECTION_REQUIRED: "要求更正",
  REJECTED: "退回修正",
  LOCKED: "已鎖定",
  UNLOCK_REQUESTED: "修改申請中",
  EDITABLE: "開放修改",
  RESUBMITTED: "重新送出",
  RECONCILED: "已對帳",
  INVOICED: "已開票",
  MONTH_CLOSED: "已關帳",
  CANCELLED: "已取消",
} as const;
