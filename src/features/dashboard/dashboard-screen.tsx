"use client";
import Link from "next/link";
import {
  Plus,
  Files,
  Clock3,
  ClipboardCheck,
  FileEdit,
  ArrowRight,
  CircleHelp,
} from "lucide-react";
import { useDemo } from "@/context/demo-context";
import { OrderTable } from "@/components/orders/order-table";
import { PageHeading, TextLink } from "@/components/ui/primitives";

export function DashboardScreen() {
  const { orders, accountingRecords } = useDemo();
  const drafts = orders.filter((order) => order.status === "DRAFT");
  const waiting = orders.filter((order) =>
    ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"].includes(order.status),
  );
  const stats = [
    {
      label: "全部訂單",
      value: orders.length,
      icon: Files,
      detail: "示範供應商 A 的訂單",
    },
    {
      label: "待完成草稿",
      value: drafts.length,
      icon: FileEdit,
      detail: "繼續填寫並確認內容",
    },
    {
      label: "審核處理中",
      value: waiting.length,
      icon: Clock3,
      detail: "已送出，等待內部審核",
    },
    {
      label: "對帳處理中",
      value: accountingRecords.filter((r) => r.status !== "CLOSED").length,
      icon: ClipboardCheck,
      detail: "檢視公司認可金額",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="SUPPLIER WORKSPACE"
        title="工作總覽"
        description="掌握訂單進度，從今天的待辦開始。"
        action={
          <Link className="button primary" href="/orders/new">
            <Plus size={18} />
            建立示範訂單
          </Link>
        }
      />
      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon, detail }) => (
          <section className="stat-card" key={label} aria-label={label}>
            <div>
              <span>{label}</span>
              <span className="stat-icon">
                <Icon size={18} />
              </span>
            </div>
            <strong>{String(value).padStart(2, "0")}</strong>
            <small>{detail}</small>
          </section>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="section-stack">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>最近的訂單</h2>
                <p>每筆訂單的最新進度</p>
              </div>
              <TextLink href="/orders">查看全部</TextLink>
            </div>
            <OrderTable orders={orders.slice(0, 5)} compact />
            <div className="table-footer">
              <span>
                顯示 {Math.min(orders.length, 5)} / {orders.length} 筆示範資料
              </span>
              <span>更新於本次示範</span>
            </div>
          </section>
          <section className="panel">
            <div className="panel-body flex items-center justify-between gap-5">
              <div>
                <p className="eyebrow">YOUR NEXT STEP</p>
                <h2>準備好下一筆費用申報了嗎？</h2>
                <p className="text-muted mt-2 text-sm">
                  先儲存草稿，資料備齊後再確認送出。
                </p>
              </div>
              <Link className="button" href="/orders/new">
                開始填寫
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        </div>
        <div className="section-stack">
          <section className="panel">
            <div className="panel-heading">
              <h2>待辦事項</h2>
              <span className="demo-pill">
                {drafts.length +
                  accountingRecords.filter((r) => r.status !== "CLOSED")
                    .length}{" "}
                項
              </span>
            </div>
            {drafts.length > 0 && (
              <div className="task-item">
                <span className="task-icon">
                  <FileEdit size={18} />
                </span>
                <div>
                  <h3>完成尚未送出的草稿</h3>
                  <p>{drafts[0].id} 的單票資料尚可編輯。</p>
                  <TextLink href={`/orders/${drafts[0].id}/edit`}>
                    繼續編輯
                  </TextLink>
                </div>
              </div>
            )}
            <div className="task-item">
              <span className="task-icon">
                <ClipboardCheck size={18} />
              </span>
              <div>
                <h3>查看對帳與月結結果</h3>
                <p>查看 Accounting 核對金額，若有疑問請聯絡公司。</p>
                <TextLink href="/accounting">前往對帳</TextLink>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-body">
              <CircleHelp size={21} className="text-brand mb-3" />
              <h3>原型中的待確認事項</h3>
              <p className="text-muted mt-2 text-sm">
                稅額與正式開票規則仍待確認。文件由 GSD 審核，對帳與結帳由
                Accounting 處理。
              </p>
              <p className="text-muted mt-4 text-xs">
                畫面操作不會建立正式帳務。
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
