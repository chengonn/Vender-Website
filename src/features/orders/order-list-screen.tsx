"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useDemo } from "@/context/demo-context";
import { statusLabels } from "@/config/prototype";
import { OrderTable } from "@/components/orders/order-table";
import { PageHeading, PendingNote } from "@/components/ui/primitives";
import { useVisibleOrdersTool } from "./use-visible-orders-tool";
export function OrderListScreen({ admin = false }: { admin?: boolean }) {
  const { orders, role } = useDemo();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const filtered = orders.filter(
    (order) =>
      (status === "ALL" || order.status === status) &&
      `${order.id} ${order.customerName} ${order.fileNumber} ${order.origin} ${order.destination}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  useVisibleOrdersTool(filtered);
  return (
    <>
      <PageHeading
        eyebrow={admin ? "REVIEW WORKSPACE" : "ORDER MANAGEMENT"}
        title={
          admin ? (role === "GSD" ? "供應商文件審核" : "帳單查詢") : "我的訂單"
        }
        description={
          admin
            ? "核對供應商申報資料，預覽審核意見。"
            : "集中查看單票資料與處理進度。"
        }
        action={
          !admin && (
            <Link className="button primary" href="/orders/new">
              <Plus size={18} />
              建立示範訂單
            </Link>
          )
        }
      />
      <PendingNote>
        {admin
          ? "GSD 核准、退回或要求更正；核准後交 Accounting 對帳與結帳。"
          : "目前只顯示此登入供應商的資料。"}
      </PendingNote>
      <section className="panel">
        <div className="toolbar">
          <div className="search-input">
            <Search size={17} />
            <label className="sr-only" htmlFor="order-search">
              搜尋訂單
            </label>
            <input
              id="order-search"
              placeholder="搜尋編號、客戶或運送地點"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <label className="sr-only" htmlFor="order-status">
            訂單狀態
          </label>
          <select
            id="order-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">所有狀態</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {(query || status !== "ALL") && (
            <button
              className="text-link"
              onClick={() => {
                setQuery("");
                setStatus("ALL");
              }}
            >
              清除條件
            </button>
          )}
          <span className="text-muted ml-auto text-xs" aria-live="polite">
            共 {filtered.length} 筆
          </span>
        </div>
        <OrderTable orders={filtered} admin={admin} />
        <div className="table-footer">
          <span>全部為展示用資料</span>
          <span>
            共 {filtered.length} / {orders.length} 筆
          </span>
        </div>
      </section>
    </>
  );
}
