import { changeRequestLimitHours } from "@/config/prototype";
import type { Order, OrderFormValues } from "@/types/order";
export function saveDemoDraft(
  orders: Order[],
  values: OrderFormValues,
  attachments: string[],
  id?: string,
): { orders: Order[]; order: Order } {
  const previous = id ? orders.find((order) => order.id === id) : undefined;
  if (id && !previous) throw new Error("找不到示範訂單");
  if (previous && previous.status !== "DRAFT")
    throw new Error("此示範訂單已鎖定，無法直接編輯");
  const order: Order = {
    ...values,
    id: previous?.id ?? `DEMO-NEW-${crypto.randomUUID().slice(0, 8)}`,
    companyId: "DEMO-COMPANY-A",
    status: "DRAFT",
    version: 0,
    updatedAt: "本次操作",
    displayAmount: "—",
    attachments,
    history: previous?.history ?? ["建立示範草稿"],
  };
  return {
    order,
    orders: previous
      ? orders.map((item) => (item.id === order.id ? order : item))
      : [order, ...orders],
  };
}
export function submitDemoOrder(order: Order): Order {
  if (order.status !== "DRAFT") throw new Error("僅草稿可示範送出");
  return {
    ...order,
    status: "SUBMITTED",
    submittedAt: new Date().toISOString(),
    version: order.version + 1,
    history: [...order.history, "示範送出並鎖定 v1"],
    updatedAt: "本次操作",
  };
}
export function isChangeRequestWithinWindow(
  order: Order,
  now = Date.now(),
): boolean {
  const submitted = Date.parse(order.submittedAt ?? "");
  return (
    Number.isFinite(submitted) &&
    now >= submitted &&
    now < submitted + changeRequestLimitHours * 60 * 60 * 1000
  );
}
export function requestDemoChange(
  order: Order,
  reason: string,
  now = Date.now(),
): Order {
  if (
    !["SUBMITTED", "UNDER_REVIEW", "LOCKED", "RESUBMITTED"].includes(
      order.status,
    )
  )
    throw new Error("此狀態不提供修改申請示範");
  if (!isChangeRequestWithinWindow(order, now))
    throw new Error("已超過送出後 24 小時，或缺少有效送出時間，無法申請修改");
  if (!reason.trim()) throw new Error("請填寫修改原因");
  return {
    ...order,
    status: "UNLOCK_REQUESTED",
    changeReason: reason.trim(),
    history: [...order.history, "提出示範修改申請"],
    updatedAt: "本次操作",
  };
}
