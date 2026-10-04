"use client";
import { useDemo } from "@/context/demo-context";
import Link from "next/link";
import { Pencil, MessageSquare, Paperclip, LockKeyhole } from "lucide-react";
import type { Order } from "@/types/order";
import {
  BackLink,
  PageHeading,
  PendingNote,
  StatusBadge,
} from "@/components/ui/primitives";
export function OrderDetail({
  order,
  admin = false,
}: {
  order: Order;
  admin?: boolean;
}) {
  const { role } = useDemo();
  const canEdit = role === "SUPPLIER_USER";
  const editable = [
    "DRAFT",
    "REJECTED",
    "CORRECTION_REQUIRED",
    "EDITABLE",
  ].includes(order.status);
  const requestable = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "LOCKED",
    "RESUBMITTED",
  ].includes(order.status);
  const fields = [
    ["客戶名稱", order.customerName],
    ["供應商", order.supplierName],
    ["File No.", order.fileNumber],
    ["Invoice 日期", order.invoiceDate],
    ["起運地", order.origin],
    ["目的地", order.destination],
    ["船名／航次", `${order.vesselName} / ${order.voyageNumber}`],
    ["MBL", order.mblNumber],
    ["HBL", order.hblNumber],
    ["櫃號（示意）", order.containerNumber],
    [
      "櫃數／櫃型（待確認）",
      `${order.containerQuantity || "—"} / ${order.containerType || "—"}`,
    ],
    ["國家／地區", order.country],
  ];
  return (
    <>
      <BackLink href={admin ? "/admin/orders" : "/orders"} />
      <PageHeading
        eyebrow={admin ? "ORDER REVIEW / DETAIL" : "ORDER / DETAIL"}
        title={order.id}
        description={`${order.supplierName} · 示範版本 v${order.version}`}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            {canEdit && !admin && editable && (
              <Link
                className="button primary"
                href={`/orders/${order.id}/edit`}
              >
                <Pencil size={16} />
                編輯訂單
              </Link>
            )}
            {canEdit && !admin && requestable && (
              <Link
                className="button"
                href={`/orders/${order.id}/change-request`}
              >
                <MessageSquare size={16} />
                申請修改
              </Link>
            )}
          </div>
        }
      />
      {!editable && (
        <PendingNote>
          <LockKeyhole size={15} className="inline mr-1" />
          此示範訂單已鎖定。
          {order.status === "INVOICED" || order.status === "MONTH_CLOSED"
            ? "開票或關帳後不直接修改原單，更正規則待確認。"
            : "申請期限為首次送出後 24 小時，核准後另開放 24 小時。"}
        </PendingNote>
      )}
      <div className="detail-grid">
        <div className="section-stack">
          <section className="panel">
            <div className="panel-heading">
              <h2>單票資料</h2>
              <span className="text-muted text-xs">
                {order.fileNumber || "File No. 待填"}
              </span>
            </div>
            <div className="panel-body">
              <dl className="detail-fields">
                {fields.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "尚未填寫"}</dd>
                  </div>
                ))}
              </dl>
              {order.note && (
                <div className="border-t border-slate-100 pt-5 mt-6">
                  <p className="text-muted text-xs mb-2">訂單備註</p>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {order.note}
                  </p>
                </div>
              )}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>費用明細</h2>
              <span className="text-muted text-xs">
                {order.charges.length} 筆
              </span>
            </div>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">訂單費用明細</caption>
                <thead>
                  <tr>
                    <th>費用名稱</th>
                    <th>數量／單位</th>
                    <th>單價</th>
                    <th>幣別</th>
                    <th>稅額</th>
                  </tr>
                </thead>
                <tbody>
                  {order.charges.map((line, index) => (
                    <tr key={index}>
                      <td>
                        {line.name || "待填寫"}
                        {line.note && <p className="cell-sub">{line.note}</p>}
                      </td>
                      <td>
                        {line.quantity || "—"} / {line.unit || "—"}
                      </td>
                      <td>{line.unitPrice || "—"}</td>
                      <td>{line.currency}</td>
                      <td className="text-muted">待確認</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>稅額、精度及合計規則未實作</span>
              <span>合計：—</span>
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>示範附件</h2>
              <span className="text-muted text-xs">僅顯示名稱，無實際檔案</span>
            </div>
            <div className="panel-body">
              {order.attachments.length ? (
                <ul className="space-y-3">
                  {order.attachments.map((name) => (
                    <li key={name} className="flex items-center gap-2 text-sm">
                      <Paperclip size={16} className="text-muted" />
                      {name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted text-sm">尚無示範附件</p>
              )}
            </div>
          </section>
        </div>
        <div className="section-stack">
          <section className="panel">
            <div className="panel-heading">
              <h2>處理歷程</h2>
            </div>
            <ol className="timeline">
              {order.history.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
            <div className="table-footer">示範紀錄，不是正式 Audit Log</div>
          </section>
          {order.changeReason && (
            <section className="panel">
              <div className="panel-heading">
                <h2>修改申請</h2>
              </div>
              <div className="panel-body">
                <p className="text-sm whitespace-pre-wrap break-words">
                  {order.changeReason}
                </p>
                <p className="text-muted mt-3 text-xs">
                  已記錄於本次示範，未設定可編輯期限。
                </p>
              </div>
            </section>
          )}
          <section className="panel">
            <div className="panel-body">
              <h3>帳務資訊</h3>
              <p className="text-muted mt-2 text-sm">
                正式 Invoice、下載／列印與更正流程將於規則確認後另期建立。
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
