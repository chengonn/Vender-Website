export const orderStatuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "REJECTED",
  "CORRECTION_REQUIRED",
  "LOCKED",
  "UNLOCK_REQUESTED",
  "EDITABLE",
  "RESUBMITTED",
  "RECONCILED",
  "INVOICED",
  "MONTH_CLOSED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export type DemoRole = "SUPPLIER_USER" | "ADMIN" | "GSD" | "ACCOUNTING";
export type Charge = {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  currency: string;
  taxType: string;
  note: string;
};
export type OrderFormValues = {
  customerName: string;
  supplierName: string;
  invoiceDate: string;
  fileNumber: string;
  vesselName: string;
  voyageNumber: string;
  mblNumber: string;
  hblNumber: string;
  containerNumber: string;
  containerQuantity: string;
  containerType: string;
  origin: string;
  destination: string;
  country: string;
  note: string;
  charges: Charge[];
};
export type Order = OrderFormValues & {
  id: string;
  companyId: string;
  status: OrderStatus;
  version: number;
  updatedAt: string;
  displayAmount: string;
  attachments: string[];
  history: string[];
  revision?: number;
  editableUntil?: string;
  approvedVersion?: number;
  submittedAt?: string;
  changeReason?: string;
};
export type Reconciliation = {
  id: string;
  orderId: string;
  status: "WAITING_SUPPLIER_CONFIRMATION" | "DISPUTED";
  lines: {
    name: string;
    currency: string;
    claimed: string;
    approved: string;
    difference: string;
    reason: string;
  }[];
};
