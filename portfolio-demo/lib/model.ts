import { z } from "zod";
export const roles = ["Vendor", "Admin", "GSD", "Accounting"] as const;
export type Role = (typeof roles)[number];
export const statuses = [
  "草稿",
  "待 GSD 審核",
  "退回更正",
  "待 Accounting 對帳",
  "已對帳",
  "已結帳",
] as const;
export type Status = (typeof statuses)[number];
export const orderSchema = z.object({
  route: z.string().trim().min(3, "請填寫起運地與目的地").max(80),
  reference: z.string().trim().min(1, "請填寫提單號碼").max(40),
  item: z.string().trim().min(1, "請填寫費用科目").max(40),
  amount: z
    .string()
    .regex(/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/, "金額須為非負數，最多兩位小數"),
  currency: z.enum(["TWD", "USD"]),
  note: z.string().max(300),
});
export type OrderInput = z.infer<typeof orderSchema>;
export type Order = OrderInput & {
  id: string;
  company: string;
  status: Status;
  history: string[];
  submittedAt?: string;
  approved?: string;
  period?: string;
  differenceReason?: string;
};
export type Supplier = {
  id: string;
  name: string;
  english: string;
  status: "待審核" | "啟用" | "關閉";
};
export type Statement = {
  id: string;
  company: string;
  period: string;
  orderIds: string[];
  totals: { currency: string; amount: string }[];
};
export type Store = {
  version: 1;
  orders: Order[];
  suppliers: Supplier[];
  statements: Statement[];
};
export const KEY = "starlane-portfolio-v1";
export function cents(amount: string) {
  if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(amount))
    throw new Error("金額格式不正確");
  const [whole, part = ""] = amount.split(".");
  return Number(whole) * 100 + Number(part.padEnd(2, "0"));
}
export function money(value: number) {
  return (value / 100).toFixed(2);
}
export function seed(): Store {
  const now = new Date().toISOString();
  const basic = {
    company: "STA1001",
    route: "高雄 → 新加坡",
    reference: "DEMO-BL-001",
    item: "運費",
    amount: "12500.00",
    currency: "TWD" as const,
    note: "純示範資料；不含稅額與正式發票計算。",
    history: ["Vendor 建立示範訂單"],
    submittedAt: now,
  };
  return {
    version: 1,
    suppliers: [
      {
        id: "STA1001",
        name: "星航示範供應商",
        english: "Starlane Demo Supplier",
        status: "啟用",
      },
      {
        id: "CLO2002",
        name: "雲途示範供應商",
        english: "Cloudway Demo Supplier",
        status: "待審核",
      },
    ],
    orders: [
      { ...basic, id: "DEMO-001", status: "待 GSD 審核" },
      {
        ...basic,
        id: "DEMO-002",
        reference: "DEMO-BL-002",
        amount: "8600.00",
        status: "待 Accounting 對帳",
        history: [...basic.history, "GSD 核准文件"],
      },
      {
        ...basic,
        id: "DEMO-003",
        reference: "DEMO-BL-003",
        amount: "3200.00",
        approved: "3200.00",
        period: "2026-08",
        status: "已結帳",
        history: [
          ...basic.history,
          "GSD 核准文件",
          "Accounting 完成對帳與月結",
        ],
      },
    ],
    statements: [
      {
        id: "DEMO-MONTH-001",
        company: "STA1001",
        period: "2026-08",
        orderIds: ["DEMO-003"],
        totals: [{ currency: "TWD", amount: "3200.00" }],
      },
    ],
  };
}
export function restore(raw: string | null): Store {
  if (!raw) return seed();
  const value = JSON.parse(raw) as Store;
  if (
    value.version !== 1 ||
    !Array.isArray(value.orders) ||
    !Array.isArray(value.suppliers) ||
    !Array.isArray(value.statements)
  )
    throw new Error("示範資料格式不相容，請重設資料");
  for (const order of value.orders) {
    orderSchema.parse(order);
    if (
      !statuses.includes(order.status) ||
      !Array.isArray(order.history) ||
      typeof order.id !== "string"
    )
      throw new Error("示範資料損毀，請重設資料");
  }
  return value;
}
export type Action =
  | { type: "save"; values: OrderInput; id?: string }
  | { type: "submit"; id: string }
  | { type: "review"; id: string; approve: boolean; reason: string }
  | {
      type: "reconcile";
      id: string;
      amount: string;
      period: string;
      reason: string;
    }
  | { type: "close"; company: string; period: string }
  | { type: "supplier"; name: string; english: string }
  | { type: "supplierStatus"; id: string; status: Supplier["status"] };
export function transition(source: Store, role: Role, action: Action): Store {
  const s = structuredClone(source);
  const requireRole = (expected: Role) => {
    if (role !== expected) throw new Error(`此操作需要 ${expected} 角色`);
  };
  const record = (o: Order, text: string) =>
    o.history.push(`${new Date().toLocaleString("zh-TW")} · ${role} ${text}`);
  if (action.type === "supplier") {
    requireRole("Admin");
    const prefix = action.english
      .replace(/[^a-z]/gi, "")
      .slice(0, 3)
      .toUpperCase();
    if (prefix.length !== 3 || !action.name.trim())
      throw new Error("請填寫中文名稱與至少三個英文字母");
    let id = "";
    for (let i = 0; i < 10000; i++) {
      const candidate =
        prefix +
        String((Math.floor(Math.random() * 10000) + i) % 10000).padStart(
          4,
          "0",
        );
      if (!s.suppliers.some((v) => v.id === candidate)) {
        id = candidate;
        break;
      }
    }
    if (!id) throw new Error("公司代碼已用完");
    s.suppliers.push({
      id,
      name: action.name.trim(),
      english: action.english.trim(),
      status: "待審核",
    });
    return s;
  }
  if (action.type === "supplierStatus") {
    requireRole("Admin");
    const supplier = s.suppliers.find((v) => v.id === action.id);
    if (!supplier) throw new Error("供應商不存在");
    supplier.status = action.status;
    return s;
  }
  if (action.type === "close") {
    requireRole("Accounting");
    if (
      s.statements.some(
        (v) => v.company === action.company && v.period === action.period,
      )
    )
      throw new Error("此供應商月份已結帳");
    const orders = s.orders.filter(
      (o) => o.company === action.company && o.period === action.period,
    );
    if (!orders.length || orders.some((o) => o.status !== "已對帳"))
      throw new Error("該月已指定帳期的訂單須全部完成對帳");
    const totals: Record<string, number> = {};
    for (const o of orders) {
      totals[o.currency] = (totals[o.currency] || 0) + cents(o.approved!);
      o.status = "已結帳";
      record(o, "完成月結；訂單已鎖定");
    }
    s.statements.unshift({
      id: `MONTH-${crypto.randomUUID()}`,
      company: action.company,
      period: action.period,
      orderIds: orders.map((o) => o.id),
      totals: Object.entries(totals).map(([currency, total]) => ({
        currency,
        amount: money(total),
      })),
    });
    return s;
  }
  if (action.type === "save") {
    requireRole("Vendor");
    if (s.suppliers.find((v) => v.id === "STA1001")?.status !== "啟用")
      throw new Error("示範供應商已關閉");
    const values = orderSchema.parse(action.values);
    if (action.id) {
      const order = s.orders.find(
        (o) => o.id === action.id && o.company === "STA1001",
      );
      if (!order || !["草稿", "退回更正"].includes(order.status))
        throw new Error("此狀態不可修改");
      Object.assign(order, values);
      record(order, "儲存修改");
    } else
      s.orders.unshift({
        ...values,
        id: `DEMO-${crypto.randomUUID().slice(0, 8)}`,
        company: "STA1001",
        status: "草稿",
        history: ["Vendor 建立草稿"],
      });
    return s;
  }
  const o = s.orders.find((o) => o.id === action.id);
  if (!o) throw new Error("訂單不存在");
  if (action.type === "submit") {
    requireRole("Vendor");
    if (
      o.company !== "STA1001" ||
      s.suppliers.find((v) => v.id === o.company)?.status !== "啟用"
    )
      throw new Error("無法操作此供應商的訂單");
    if (!["草稿", "退回更正"].includes(o.status))
      throw new Error("只有草稿或退回訂單可以送審");
    o.status = "待 GSD 審核";
    o.submittedAt = new Date().toISOString();
    record(o, "送出文件審核");
  } else if (action.type === "review") {
    requireRole("GSD");
    if (o.status !== "待 GSD 審核") throw new Error("此訂單不在待審核狀態");
    if (!action.approve && !action.reason.trim())
      throw new Error("退回必須填寫更正原因");
    o.status = action.approve ? "待 Accounting 對帳" : "退回更正";
    record(o, action.approve ? "核准文件" : `退回更正：${action.reason}`);
  } else if (action.type === "reconcile") {
    requireRole("Accounting");
    if (o.status !== "待 Accounting 對帳")
      throw new Error("須先通過 GSD 審核，且不可重複對帳");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(action.period))
      throw new Error("請選擇有效帳期");
    if (
      s.statements.some(
        (v) => v.company === o.company && v.period === action.period,
      )
    )
      throw new Error("該月份已結帳，請選擇其他帳期");
    const approved = cents(action.amount);
    if (approved !== cents(o.amount) && !action.reason.trim())
      throw new Error("有金額差異時，請填寫差異原因");
    o.approved = money(approved);
    o.period = action.period;
    o.differenceReason = action.reason;
    o.status = "已對帳";
    record(
      o,
      `確認對帳 ${o.currency} ${o.approved}／${o.period}${action.reason ? `；差異：${action.reason}` : ""}`,
    );
  }
  return s;
}
