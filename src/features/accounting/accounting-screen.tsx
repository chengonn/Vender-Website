"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDemo } from "@/context/demo-context";
import { api } from "@/services/api-client";
import { accountingSchema } from "@/schemas/accounting-schema";
import type { Order } from "@/types/order";
import type { AccountingRecord, MonthlyStatement } from "@/types/accounting";
import { PageHeading, EmptyState } from "@/components/ui/primitives";
const labels = {
  DRAFT: "對帳草稿",
  DISPUTED: "差異待處理",
  RECONCILED: "已完成對帳",
  CLOSED: "已結帳",
};
function exportStatement(statement: MonthlyStatement) {
  const cell = (v: string) =>
    '"' + (/^[=+\-@\t\r]/.test(v) ? "'" : "") + v.replaceAll('"', '""') + '"';
  const rows = [
    ["Demo 月結單", statement.id],
    ["供應商", statement.companyName],
    ["月份", statement.period],
    ["結帳人", statement.closedBy],
    ["帳單", "幣別", "申報金額", "認可金額", "差異處理說明"],
  ];
  for (const r of statement.records)
    for (const l of r.lines)
      rows.push([r.orderId, l.currency, l.claimed, l.approved, l.reason]);
  for (const t of statement.totals)
    rows.push(["合計", t.currency, "", t.amount, ""]);
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + rows.map((r) => r.map(cell).join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = statement.id + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function AccountingForm({
  order,
  existing,
  onDone,
}: {
  order: Order;
  existing?: AccountingRecord;
  onDone: () => void;
}) {
  const { refresh } = useDemo();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof accountingSchema>>({
    resolver: zodResolver(accountingSchema),
    defaultValues: {
      period: existing?.period || new Date().toISOString().slice(0, 7),
      lines: [...new Set(order.charges.map((c) => c.currency))].map(
        (currency) =>
          existing?.lines.find((l) => l.currency === currency) || {
            currency,
            claimed: "",
            approved: "",
            reason: "",
          },
      ),
      note: existing?.note || "",
    },
  });
  const currencies = [...new Set(order.charges.map((c) => c.currency))];
  return (
    <form
      className="panel mt-5"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setError("");
        try {
          await api("accounting/save", {
            ...values,
            orderId: order.id,
            orderRevision: order.revision,
            revision: existing?.revision || 0,
          });
          await refresh();
          onDone();
        } catch (e) {
          setError(e instanceof Error ? e.message : "儲存失敗");
        }
      })}
    >
      <div className="panel-body">
        <h2>對帳資料 · {order.id}</h2>
        <p className="text-muted">
          依供應商文件按幣別填入金額。稅額不自動計算；有差異需記錄處理原因，才可確認對帳。
        </p>
        <label htmlFor="accounting-period">結帳月份</label>
        <input id="accounting-period" type="month" {...register("period")} />
        {errors.period && <p role="alert">{errors.period.message}</p>}
        {currencies.map((currency, i) => (
          <fieldset className="mt-5" key={currency}>
            <legend>{currency}</legend>
            <input type="hidden" {...register(`lines.${i}.currency`)} />
            <div className="form-grid">
              <div>
                <label htmlFor={`claimed-${i}`}>{currency} 申報金額</label>
                <input
                  id={`claimed-${i}`}
                  inputMode="decimal"
                  {...register(`lines.${i}.claimed`)}
                />
                {errors.lines?.[i]?.claimed && (
                  <p role="alert">{errors.lines[i]?.claimed?.message}</p>
                )}
              </div>
              <div>
                <label htmlFor={`approved-${i}`}>{currency} 認可金額</label>
                <input
                  id={`approved-${i}`}
                  inputMode="decimal"
                  {...register(`lines.${i}.approved`)}
                />
                {errors.lines?.[i]?.approved && (
                  <p role="alert">{errors.lines[i]?.approved?.message}</p>
                )}
              </div>
              <div className="full-width">
                <label htmlFor={`reason-${i}`}>{currency} 差異處理原因</label>
                <textarea
                  id={`reason-${i}`}
                  {...register(`lines.${i}.reason`)}
                />
              </div>
            </div>
          </fieldset>
        ))}
        <label className="mt-5" htmlFor="accounting-note">
          對帳備註
        </label>
        <textarea id="accounting-note" {...register("note")} />
        {error && <p role="alert">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button className="button primary" disabled={isSubmitting}>
            儲存對帳資料
          </button>
          <button
            className="button"
            type="button"
            disabled={isSubmitting}
            onClick={onDone}
          >
            取消
          </button>
        </div>
      </div>
    </form>
  );
}
export function AccountingScreen() {
  const { role, orders, accountingRecords, monthlyStatements, refresh } =
    useDemo();
  const [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [closing, setClosing] = useState("");
  const editable = role === "ACCOUNTING";
  const eligible = orders.filter(
    (o) => o.status === "LOCKED" && o.approvedVersion === o.version,
  );
  const selectedOrder = eligible.find((o) => o.id === selected);
  const groups = [
    ...new Set(
      accountingRecords
        .filter((r) => r.status !== "CLOSED")
        .map((r) => r.companyId + "|" + r.period),
    ),
  ];
  async function confirm(record: AccountingRecord) {
    setBusy(true);
    setError("");
    try {
      await api("accounting/confirm", {
        orderId: record.orderId,
        revision: record.revision,
        orderRevision: orders.find((o) => o.id === record.orderId)?.revision,
      });
      await refresh();
      setMessage("對帳已確認，可納入月結。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "確認失敗");
    } finally {
      setBusy(false);
    }
  }
  async function close(group: string) {
    setBusy(true);
    setError("");
    try {
      const [companyId, period] = group.split("|");
      await api("accounting/close", {
        companyId,
        period,
        expected: accountingRecords
          .filter((r) => r.companyId === companyId && r.period === period)
          .map((r) => ({ orderId: r.orderId, revision: r.revision })),
      });
      await refresh();
      setClosing("");
      setMessage("月結完成，月結單與原帳單已鎖定。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "結帳失敗");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title={editable ? "Accounting 對帳與結帳" : "對帳與月結查詢"}
        eyebrow="ACCOUNTING"
        description="GSD 核准文件後進行對帳；同一供應商、同一月份完成對帳後結帳。"
      />
      <p className="text-muted mb-5">
        僅限 Demo 假資料，不自動計稅、不產生正式
        Invoice、不寄送郵件。不同幣別分開加總。
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {editable && (
        <section className="panel">
          <div className="panel-body">
            <h2>GSD 已核准／待對帳</h2>
            {eligible.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>帳單</th>
                      <th>供應商</th>
                      <th>版本</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligible.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link
                            className="text-link"
                            href={`/admin/orders/${o.id}`}
                          >
                            {o.id}
                          </Link>
                        </td>
                        <td>{o.supplierName}</td>
                        <td>v{o.version}</td>
                        <td>
                          <button
                            className="button"
                            onClick={() => {
                              setSelected(o.id);
                              setMessage("");
                            }}
                          >
                            填寫對帳 {o.id}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>目前沒有待對帳帳單。請先由 GSD 核准文件。</p>
            )}
          </div>
        </section>
      )}
      {selectedOrder && editable && (
        <AccountingForm
          key={
            selectedOrder.id +
            "-" +
            (accountingRecords.find((r) => r.orderId === selectedOrder.id)
              ?.revision || 0)
          }
          order={selectedOrder}
          existing={accountingRecords.find(
            (r) => r.orderId === selectedOrder.id,
          )}
          onDone={() => setSelected("")}
        />
      )}
      <section className="panel mt-5">
        <div className="panel-body">
          <h2>對帳紀錄</h2>
          {!accountingRecords.length ? (
            <EmptyState title="尚無對帳資料" />
          ) : (
            accountingRecords.map((r) => (
              <article className="mt-5" key={r.orderId}>
                <h3>
                  {r.orderId} · {r.companyId} · {r.period} · {labels[r.status]}
                </h3>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>幣別</th>
                        <th>申報金額</th>
                        <th>認可金額</th>
                        <th>差異處理原因</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.lines.map((l) => (
                        <tr key={l.currency}>
                          <td>{l.currency}</td>
                          <td>{l.claimed}</td>
                          <td>{l.approved}</td>
                          <td>{l.reason || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>{r.note}</p>
                <p className="text-muted">
                  更新：{r.updatedBy} · {r.updatedAt}
                </p>
                {editable && ["DRAFT", "DISPUTED"].includes(r.status) && (
                  <button
                    className="button mt-3"
                    disabled={busy}
                    onClick={() => void confirm(r)}
                  >
                    確認對帳 {r.orderId}
                  </button>
                )}
              </article>
            ))
          )}
        </div>
      </section>
      {editable && (
        <section className="panel mt-5">
          <div className="panel-body">
            <h2>月結作業</h2>
            {groups.length ? (
              groups.map((group) => {
                const records = accountingRecords.filter(
                  (r) => r.companyId + "|" + r.period === group,
                );
                const ready = records.every((r) => r.status === "RECONCILED");
                return (
                  <article key={group} className="mt-5">
                    <h3>
                      {group.replace("|", " · ")} · {records.length} 筆
                    </h3>
                    <p>
                      {ready
                        ? "所有對帳已確認"
                        : "尚有未完成對帳資料，不能結帳"}
                    </p>
                    {closing === group ? (
                      <div>
                        <p>
                          請核對本次全部帳單：
                          {records.map((r) => r.orderId).join("、")}
                          。結帳後不可直接修改。
                        </p>
                        <div className="table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>帳單</th>
                                <th>幣別</th>
                                <th>本次認可金額</th>
                              </tr>
                            </thead>
                            <tbody>
                              {records.flatMap((r) =>
                                r.lines.map((l) => (
                                  <tr key={r.orderId + l.currency}>
                                    <td>{r.orderId}</td>
                                    <td>{l.currency}</td>
                                    <td>{l.approved}</td>
                                  </tr>
                                )),
                              )}
                            </tbody>
                          </table>
                        </div>
                        <button
                          className="button primary"
                          disabled={busy}
                          onClick={() => void close(group)}
                        >
                          確認結帳並鎖定
                        </button>
                        <button
                          className="button"
                          disabled={busy}
                          onClick={() => setClosing("")}
                        >
                          取消結帳
                        </button>
                      </div>
                    ) : (
                      <button
                        className="button"
                        disabled={!ready || busy}
                        onClick={() => setClosing(group)}
                      >
                        檢視結帳 {group.replace("|", " ")}
                      </button>
                    )}
                  </article>
                );
              })
            ) : (
              <p>沒有待結帳月份。</p>
            )}
          </div>
        </section>
      )}
      <section className="panel mt-5">
        <div className="panel-body">
          <h2>已結帳月結單</h2>
          {monthlyStatements.length ? (
            monthlyStatements.map((s) => (
              <details className="mt-5" key={s.id}>
                <summary>
                  {s.companyName} · {s.period} · {s.id}
                </summary>
                <p>
                  結帳人：{s.closedBy} · {s.closedAt}
                </p>
                {s.totals.map((t) => (
                  <p key={t.currency}>
                    {t.currency} 合計：{t.amount}
                  </p>
                ))}
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>帳單</th>
                        <th>幣別</th>
                        <th>認可金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.records.flatMap((r) =>
                        r.lines.map((l) => (
                          <tr key={r.orderId + l.currency}>
                            <td>{r.orderId}</td>
                            <td>{l.currency}</td>
                            <td>{l.approved}</td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
                <button className="button" onClick={() => exportStatement(s)}>
                  下載月結單 CSV
                </button>
              </details>
            ))
          ) : (
            <p>尚無已結帳月結單。</p>
          )}
        </div>
      </section>
    </>
  );
}
