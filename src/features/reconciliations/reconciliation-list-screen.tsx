"use client";
import Link from "next/link";
import { ClipboardCheck, ArrowUpRight } from "lucide-react";

import { useDemo } from "@/context/demo-context";
import { PageHeading, PendingNote } from "@/components/ui/primitives";
export function ReconciliationListScreen() {
  const { orders, reconciliations: mockReconciliations } = useDemo();
  return (
    <>
      <PageHeading
        eyebrow="RECONCILIATION"
        title="單票對帳"
        description="核對申報與認可金額，讓每一筆差異都有說明。"
      />
      <PendingNote>
        對帳確認順序及完成條件待確認。本 Demo 使用固定金額示例並保存回覆，不產生
        Invoice。
      </PendingNote>
      <section className="panel">
        <div className="panel-heading">
          <div className="flex items-center gap-3">
            <ClipboardCheck size={21} className="text-brand" />
            <h2>待處理對帳</h2>
          </div>
          <span className="text-muted text-sm">
            {mockReconciliations.length} 筆示範
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">示範對帳列表</caption>
            <thead>
              <tr>
                <th>對帳編號</th>
                <th>原始訂單</th>
                <th>客戶</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {mockReconciliations.map((item) => (
                <tr key={item.id}>
                  <td className="order-id">{item.id}</td>
                  <td>
                    <Link
                      className="text-link"
                      href={`/orders/${item.orderId}`}
                    >
                      {item.orderId}
                    </Link>
                  </td>
                  <td>
                    {orders.find((order) => order.id === item.orderId)
                      ?.customerName || "—"}
                  </td>
                  <td>
                    <span className="status status-submitted">
                      <span />
                      待供應商確認
                    </span>
                  </td>
                  <td>
                    <Link
                      className="text-link"
                      href={`/reconciliations/${item.id}`}
                    >
                      查看對帳
                      <ArrowUpRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>對帳引用原始 Order，不建立另一筆訂單</span>
        </div>
      </section>
    </>
  );
}
