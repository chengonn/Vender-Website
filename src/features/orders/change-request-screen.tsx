"use client";
import { useEffect, useState } from "react";
import { isChangeRequestWithinWindow } from "@/services/mock-order-service";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, CheckCircle2, Clock3 } from "lucide-react";
import { useDemo } from "@/context/demo-context";
import { changeRequestSchema } from "@/schemas/order-schema";
import {
  BackLink,
  EmptyState,
  PageHeading,
  PendingNote,
  StatusBadge,
} from "@/components/ui/primitives";
export function ChangeRequestScreen({ id }: { id: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { orders, requestChange } = useDemo();
  const order = orders.find((item) => item.id === id);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ reason: string }>({
    resolver: zodResolver(changeRequestSchema),
    defaultValues: { reason: "" },
  });
  if (!order)
    return (
      <>
        <BackLink href="/orders" />
        <EmptyState title="找不到這筆示範訂單" />
      </>
    );
  const requestable = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "LOCKED",
    "RESUBMITTED",
  ].includes(order.status);
  return (
    <>
      <BackLink href={`/orders/${id}`}>返回訂單明細</BackLink>
      <PageHeading
        eyebrow="ORDER / CHANGE REQUEST"
        title="申請修改訂單"
        description={`${id} · 說明希望修改的內容與原因`}
        action={<StatusBadge status={order.status} />}
      />
      <PendingNote>
        修改申請暫限帳單送出後 24 小時內（滿 24
        小時截止）。核准角色與核准後可編輯期限待確認。
      </PendingNote>
      {saved || order.status === "UNLOCK_REQUESTED" ? (
        <section className="panel">
          <div className="panel-body">
            <div className="success-note flex items-center gap-3" role="status">
              <CheckCircle2 size={22} />
              {saved ? "示範修改申請已記錄" : "此訂單已有示範修改申請"}
            </div>
            <p className="text-muted text-sm mb-4">
              原訂單仍維持不可編輯；目前沒有核准或期限設定。
            </p>
            <h2 className="mb-2">修改原因</h2>
            <p className="whitespace-pre-wrap break-words mb-6">
              {order.changeReason}
            </p>
            <Link className="button" href={`/orders/${id}`}>
              回到訂單明細
            </Link>
          </div>
        </section>
      ) : !requestable ? (
        <section className="panel">
          <EmptyState title="此狀態不提供修改申請示範">
            <p>草稿可直接編輯；已開票／關帳訂單的更正規則另待確認。</p>
          </EmptyState>
        </section>
      ) : !isChangeRequestWithinWindow(order, now) ? (
        <section className="panel">
          <EmptyState title="無法申請修改">
            <p>已超過送出後 24 小時，或缺少有效送出時間。</p>
          </EmptyState>
        </section>
      ) : (
        <div className="detail-grid">
          <form
            className="panel"
            onSubmit={handleSubmit(async ({ reason }) => {
              try {
                await requestChange(id, reason);
                setSaved(true);
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "無法記錄示範申請",
                );
              }
            })}
            noValidate
          >
            <div className="panel-heading">
              <h2>修改內容與原因</h2>
            </div>
            <div className="panel-body">
              <label htmlFor="change-reason" className="mb-2">
                修改原因 <span className="text-red-700">*</span>
              </label>
              <textarea
                id="change-reason"
                rows={7}
                placeholder="例如：需要補充某項費用的說明，請描述欲修改的欄位。"
                {...register("reason")}
                aria-invalid={!!errors.reason}
                aria-describedby={errors.reason ? "reason-error" : undefined}
              />
              {errors.reason && (
                <p id="reason-error" role="alert" className="field-error">
                  {errors.reason.message}
                </p>
              )}
              {error && (
                <p role="alert" className="field-error">
                  {error}
                </p>
              )}
              <div className="mt-6 flex justify-end">
                <button className="button primary" type="submit">
                  <Send size={16} />
                  送出示範申請
                </button>
              </div>
            </div>
          </form>
          <section className="panel">
            <div className="panel-body">
              <Clock3 size={23} className="text-brand mb-3" />
              <h2>申請後會發生什麼？</h2>
              <p className="text-muted mt-3 text-sm">
                本次示範會記錄修改原因。正式流程須經授權人核准後，才能在指定時間內編輯。
              </p>
              <div className="mt-5 pt-4 border-t border-slate-100 text-sm">
                <p>申請期限：送出後 24 小時內</p>
                <p className="mt-2">核准人：待確認</p>
                <p className="mt-2">可編輯至：待確認</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
