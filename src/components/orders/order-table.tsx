import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { Order } from "@/types/order";
import { EmptyState, StatusBadge } from "@/components/ui/primitives";
export function OrderTable({
  orders,
  admin = false,
  compact = false,
}: {
  orders: Order[];
  admin?: boolean;
  compact?: boolean;
}) {
  if (!orders.length)
    return (
      <EmptyState>
        <p>試試其他關鍵字或狀態。</p>
      </EmptyState>
    );
  return (
    <div className="table-scroll">
      <table>
        <caption className="sr-only">
          {admin ? "待審核訂單資料" : "示範訂單資料"}
        </caption>
        <thead>
          <tr>
            <th>訂單編號 / 客戶</th>
            <th>運送區間</th>
            {!compact && <th>申報金額（固定示例）</th>}
            <th>狀態</th>
            {!compact && <th>更新日期</th>}
            <th>
              <span className="sr-only">操作</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <Link
                  className="order-id"
                  href={`${admin ? "/admin" : ""}/orders/${order.id}`}
                >
                  {order.id}
                </Link>
                <p className="cell-sub">{order.customerName || "未填寫客戶"}</p>
              </td>
              <td>
                <div className="route-cell">
                  {order.origin || "待填"}
                  <ArrowRight size={13} />
                  {order.destination || "待填"}
                </div>
              </td>
              {!compact && (
                <td className="whitespace-nowrap tabular-nums">
                  {order.displayAmount}
                </td>
              )}
              <td>
                <StatusBadge status={order.status} />
              </td>
              {!compact && (
                <td className="text-muted whitespace-nowrap text-xs">
                  {order.updatedAt}
                </td>
              )}
              <td>
                <Link
                  className="icon-button"
                  href={`${admin ? "/admin" : ""}/orders/${order.id}`}
                  aria-label={`${admin ? "審核" : "查看"} ${order.id}`}
                >
                  <ChevronRight size={17} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
