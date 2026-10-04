"use client";
import { api } from "@/services/api-client";
import { useDemo } from "@/context/demo-context";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare, CheckCircle2 } from "lucide-react";

import {
  BackLink,
  EmptyState,
  PageHeading,
  PendingNote,
} from "@/components/ui/primitives";
const schema = z
  .object({ response: z.enum(["AGREE", "DISPUTE"]), reason: z.string() })
  .refine(
    (value) => value.response !== "DISPUTE" || value.reason.trim().length > 0,
    { message: "提出差異時請填寫原因", path: ["reason"] },
  );
type ResponseValues = z.infer<typeof schema>;
export function ReconciliationDetailScreen({ id }: { id: string }) {
  const { reconciliations: mockReconciliations, refresh } = useDemo();
  const [error, setError] = useState("");
  const reconciliation = mockReconciliations.find((item) => item.id === id);
  const [preview, setPreview] = useState<ResponseValues | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResponseValues>({
    resolver: zodResolver(schema),
    defaultValues: { response: "DISPUTE", reason: "" },
  });
  if (!reconciliation)
    return (
      <>
        {error && <p role="alert">{error}</p>}
        <BackLink href="/reconciliations">返回對帳列表</BackLink>
        <EmptyState title="找不到這筆示範對帳" />
      </>
    );
  return (
    <>
      {error && <p role="alert">{error}</p>}
      <BackLink href="/reconciliations">返回對帳列表</BackLink>
      <PageHeading
        eyebrow="RECONCILIATION / DETAIL"
        title={reconciliation.id}
        description="逐筆核對申報內容與公司認可金額。"
        action={
          <span className="status status-submitted">
            <span />
            待供應商確認
          </span>
        }
      />
      <PendingNote>
        金額為固定展示字串，未計算稅額。確認順序、最終簽核與差額處理待定，本頁保存回覆紀錄，不產生正式
        Invoice。
      </PendingNote>
      <div className="detail-grid">
        <div className="section-stack">
          <section className="panel">
            <div className="panel-heading">
              <h2>費用核對</h2>
              <Link
                className="text-link"
                href={`/orders/${reconciliation.orderId}`}
              >
                原始訂單 {reconciliation.orderId}
              </Link>
            </div>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">申報與認可金額比較</caption>
                <thead>
                  <tr>
                    <th>費用名稱</th>
                    <th>幣別</th>
                    <th>申報金額</th>
                    <th>認可金額</th>
                    <th>差異</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliation.lines.map((line) => (
                    <tr key={line.name}>
                      <td>
                        {line.name}
                        <p className="cell-sub">{line.reason}</p>
                      </td>
                      <td>{line.currency}</td>
                      <td className="tabular-nums">{line.claimed}</td>
                      <td className="tabular-nums">{line.approved}</td>
                      <td
                        className={
                          line.difference === "0"
                            ? "text-muted"
                            : "text-amber-700"
                        }
                      >
                        {line.difference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              固定金額示例 · 不跨幣別加總 · 稅額待確認
            </div>
          </section>
          <form
            className="panel"
            onSubmit={handleSubmit(async (values) => {
              try {
                await api(`reconciliations/${id}`, values);
                await refresh();
                setPreview(values);
              } catch (e) {
                setError(e instanceof Error ? e.message : "無法儲存");
              }
            })}
            noValidate
          >
            <div className="panel-heading">
              <h2>供應商意見</h2>
              <MessageSquare size={19} className="text-muted" />
            </div>
            <div className="panel-body">
              <label htmlFor="reconciliation-response" className="mb-2">
                核對結果
              </label>
              <select id="reconciliation-response" {...register("response")}>
                <option value="DISPUTE">提出差異說明</option>
                <option value="AGREE">同意內容（預覽）</option>
              </select>
              <label htmlFor="reconciliation-reason" className="mt-5 mb-2">
                差異原因／補充說明
              </label>
              <textarea
                id="reconciliation-reason"
                {...register("reason")}
                aria-invalid={!!errors.reason}
                aria-describedby={
                  errors.reason ? "reconciliation-error" : undefined
                }
                placeholder="請說明需要再核對的項目"
              />
              {errors.reason && (
                <p
                  id="reconciliation-error"
                  role="alert"
                  className="field-error"
                >
                  {errors.reason.message}
                </p>
              )}
              <button className="button primary mt-5" type="submit">
                預覽對帳意見
              </button>
            </div>
          </form>
          {preview && (
            <section className="panel" aria-label="對帳意見預覽">
              <div className="panel-body">
                <div className="success-note" role="status">
                  意見預覽已更新，尚未完成正式對帳。
                </div>
                <h2>
                  {preview.response === "AGREE"
                    ? "同意內容（預覽）"
                    : "提出差異說明（預覽）"}
                </h2>
                <p className="mt-3 whitespace-pre-wrap break-words">
                  {preview.reason || "沒有補充說明"}
                </p>
                <button
                  className="text-link mt-4"
                  onClick={() => setPreview(null)}
                >
                  清除預覽
                </button>
              </div>
            </section>
          )}
        </div>
        <section className="panel">
          <div className="panel-body">
            <CheckCircle2 size={24} className="text-brand mb-3" />
            <h2>確認狀態</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-muted">供應商</dt>
                <dd>等待確認（示範）</dd>
              </div>
              <div>
                <dt className="text-muted">GSD／Admin</dt>
                <dd>簽核順序待確認</dd>
              </div>
              <div>
                <dt className="text-muted">Invoice</dt>
                <dd>本階段不產生</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </>
  );
}
