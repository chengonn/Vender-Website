export type AccountingLine = {
  currency: string;
  claimed: string;
  approved: string;
  reason: string;
};
export type AccountingRecord = {
  orderId: string;
  companyId: string;
  period: string;
  status: "DRAFT" | "DISPUTED" | "RECONCILED" | "CLOSED";
  revision: number;
  orderVersion: number;
  lines: AccountingLine[];
  note: string;
  updatedBy: string;
  updatedAt: string;
  statementId?: string;
};
export type MonthlyStatement = {
  id: string;
  companyId: string;
  companyName: string;
  period: string;
  records: AccountingRecord[];
  totals: { currency: string; amount: string }[];
  closedBy: string;
  closedAt: string;
};
