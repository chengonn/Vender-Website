import type {
  Order,
  OrderFormValues,
  OrderStatus,
  Reconciliation,
} from "@/types/order";
export const blankOrder: OrderFormValues = {
  customerName: "",
  supplierName: "示範供應商 A",
  invoiceDate: "",
  fileNumber: "",
  vesselName: "",
  voyageNumber: "",
  mblNumber: "",
  hblNumber: "",
  containerNumber: "",
  containerQuantity: "",
  containerType: "",
  origin: "",
  destination: "",
  country: "",
  note: "",
  charges: [
    {
      name: "",
      quantity: "1",
      unit: "票",
      unitPrice: "",
      currency: "TWD",
      taxType: "TBD",
      note: "",
    },
  ],
};
const rows: [string, OrderStatus, string, string, string][] = [
  ["DEMO-001", "DRAFT", "高雄", "新加坡", "—"],
  ["DEMO-002", "SUBMITTED", "基隆", "橫濱", "TWD 18,600"],
  ["DEMO-003", "UNDER_REVIEW", "高雄", "釜山", "USD 1,280"],
  ["DEMO-004", "LOCKED", "台中", "新加坡", "TWD 24,000"],
  ["DEMO-005", "LOCKED", "基隆", "香港", "TWD 9,800"],
  ["DEMO-006", "INVOICED", "高雄", "橫濱", "USD 860"],
];
export const mockOrders: Order[] = rows.map(
  ([id, status, origin, destination, displayAmount], i) => ({
    ...structuredClone(blankOrder),
    id,
    status,
    companyId: "DEMO-COMPANY-A",
    version: status === "DRAFT" ? 0 : 1,
    customerName: `示範客戶 ${String.fromCharCode(65 + i)}`,
    fileNumber: `FILE-DEMO-0${i + 1}`,
    supplierName: "示範供應商 A",
    invoiceDate: "2026-09-05",
    vesselName: "DEMO VESSEL",
    voyageNumber: "DEMO-26",
    mblNumber: `MBL-DEMO-${i + 1}`,
    hblNumber: `HBL-DEMO-${i + 1}`,
    containerNumber: `CONTAINER-DEMO-${i + 1}`,
    containerQuantity: "1",
    containerType: "待確認",
    origin,
    destination,
    country: "示範地區",
    updatedAt: `2026-09-0${5 - (i % 3)}`,
    displayAmount,
    note: "此筆為展示用物流資料，不代表正式交易。",
    charges: [
      {
        name: "示範運送費",
        quantity: "1",
        unit: "票",
        unitPrice: ["", "18600", "1280", "20000", "9800", "860"][i],
        currency: i === 2 || i === 5 ? "USD" : "TWD",
        taxType: "TBD",
        note: "費用名目與稅額待確認",
      },
      ...(i === 3
        ? [
            {
              name: "示範文件處理費",
              quantity: "1",
              unit: "票",
              unitPrice: "4000",
              currency: "TWD",
              taxType: "TBD",
              note: "展示用費用",
            },
          ]
        : []),
    ],
    attachments: status === "DRAFT" ? [] : ["DEMO-費用說明.pdf"],
    history:
      status === "DRAFT"
        ? ["建立示範草稿"]
        : ["建立示範草稿", "送出示範版本 v1"],
  }),
);
// Display strings are authored fixtures, not financial calculations or tax rules.
export const mockReconciliations: Reconciliation[] = [
  {
    id: "REC-DEMO-001",
    orderId: "DEMO-004",
    status: "WAITING_SUPPLIER_CONFIRMATION",
    lines: [
      {
        name: "示範運送費",
        currency: "TWD",
        claimed: "20,000",
        approved: "20,000",
        difference: "0",
        reason: "—",
      },
      {
        name: "示範文件處理費",
        currency: "TWD",
        claimed: "4,000",
        approved: "3,500",
        difference: "-500",
        reason: "展示差異說明：待核對附件",
      },
    ],
  },
];
