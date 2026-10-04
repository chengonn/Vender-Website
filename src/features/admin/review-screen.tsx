"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardCheck } from "lucide-react";
import { useDemo } from "@/context/demo-context";
import { OrderDetail } from "@/components/orders/order-detail";
import { BackLink, EmptyState, PendingNote } from "@/components/ui/primitives";
const schema = z
  .object({
    outcome: z.enum(["APPROVE", "RETURN", "CORRECT"]),
    comment: z.string(),
  })
  .refine(
    (value) => value.outcome === "APPROVE" || value.comment.trim().length > 0,
    { path: ["comment"], message: "退回或要求更正須填寫說明" },
  );
type ReviewValues = z.infer<typeof schema>;
export function ReviewScreen({ id }: { id: string }) {
  const { orders, reviewOrder, role } = useDemo();
  const order = orders.find((item) => item.id === id);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ReviewValues | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReviewValues>({
    resolver: zodResolver(schema),
    defaultValues: { outcome: "APPROVE", comment: "" },
  });
  if (!order)
    return (
      <>
        <BackLink href="/admin/orders" />
        <EmptyState title="找不到這筆示範訂單" />
      </>
    );
  const reviewable =
    role === "GSD" &&
    (["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"].includes(order.status) ||
      (order.status === "LOCKED" && order.approvedVersion !== order.version));
  return (
    <>
      <OrderDetail order={order} admin />
      {error && <p role="alert">{error}</p>}
      {role === "GSD" && order.status === "UNLOCK_REQUESTED" && (
        <section className="panel mt-5">
          <div className="panel-body">
            <h2>修改申請審核</h2>
            <p>{order.changeReason}</p>
            <p>核准後開放 24 小時編輯</p>
            {[true, false].map((approved) => (
              <button
                className="button mt-3"
                key={String(approved)}
                onClick={async () => {
                  try {
                    await reviewOrder(id, approved, "", true);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "審核失敗");
                  }
                }}
              >
                {approved ? "核准修改" : "拒絕修改"}
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="mt-6">
        <PendingNote>
          GSD 負責文件審核；核准後交 Accounting
          對帳。退回或要求更正後由供應商修改重送。Admin 與 Accounting
          在此僅查詢。
        </PendingNote>
        {reviewable ? (
          <form
            className="panel"
            onSubmit={handleSubmit(async (values) => {
              try {
                await reviewOrder(
                  id,
                  values.outcome === "APPROVE",
                  values.comment,
                  false,
                  values.outcome === "CORRECT",
                );
                setPreview(values);
              } catch (e) {
                setError(e instanceof Error ? e.message : "審核失敗");
              }
            })}
            noValidate
          >
            <div className="panel-heading">
              <div className="flex items-center gap-3">
                <ClipboardCheck size={21} className="text-brand" />
                <h2>審核意見</h2>
              </div>
              <span className="text-muted text-xs">內部審核示範</span>
            </div>
            <div className="panel-body">
              <div className="form-grid">
                <div>
                  <label className="mb-2" htmlFor="review-outcome">
                    審核結果
                  </label>
                  <select id="review-outcome" {...register("outcome")}>
                    <option value="APPROVE">核准</option>
                    <option value="RETURN">退回</option>
                    <option value="CORRECT">要求更正</option>
                  </select>
                </div>
                <div className="full-width">
                  <label htmlFor="review-comment">審核說明</label>
                  <textarea
                    id="review-comment"
                    {...register("comment")}
                    aria-invalid={!!errors.comment}
                    aria-describedby={
                      errors.comment ? "review-error" : undefined
                    }
                    placeholder="填寫供應商需要知道的核對結果"
                  />
                  {errors.comment && (
                    <p id="review-error" className="field-error" role="alert">
                      {errors.comment.message}
                    </p>
                  )}
                  <p className="text-muted text-xs mt-2">
                    退回或要求更正時，請指出需處理的資料或附件。
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-5">
                <button
                  className="button primary"
                  type="submit"
                  disabled={isSubmitting}
                >
                  送出審核結果
                </button>
              </div>
            </div>
          </form>
        ) : (
          <section className="panel">
            <EmptyState title="此角色或狀態不提供審核操作">
              <p>請從列表選擇待審核、審核中或重新送出的示範訂單。</p>
            </EmptyState>
          </section>
        )}
        {preview && (
          <section className="panel mt-5" aria-label="已儲存審核結果">
            <div className="panel-body">
              <div className="success-note" role="status">
                審核結果已儲存。
              </div>
              <h2>
                {preview.outcome === "APPROVE"
                  ? "核准"
                  : preview.outcome === "CORRECT"
                    ? "要求更正"
                    : "退回"}
              </h2>
              <p className="mt-3 whitespace-pre-wrap break-words">
                {preview.comment || "沒有補充說明"}
              </p>
              <button
                type="button"
                className="text-link mt-4"
                onClick={() => setPreview(null)}
              >
                收起結果
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
