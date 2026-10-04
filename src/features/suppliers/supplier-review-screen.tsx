"use client";
import { SupplierCredentials } from "./supplier-credentials";
import { useState } from "react";
import { useSuppliers } from "@/context/supplier-context";
import { supplierFields } from "./supplier-model";
import { BackLink, PageHeading, EmptyState } from "@/components/ui/primitives";
export function SupplierReviewScreen({ code }: { code: string }) {
  const { suppliers, reviewSupplier } = useSuppliers();
  const supplier = suppliers.find((s) => s.code === code);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  if (!supplier) return <EmptyState title="找不到供應商" />;
  return (
    <>
      <BackLink href="/admin/suppliers" />
      <PageHeading
        title="供應商建檔審核"
        eyebrow={code}
        description="建檔資料審核與帳單審核分開處理；目前為示範操作。"
      />
      <section className="panel">
        <div className="panel-body">
          <p role="status">建檔狀態：{supplier.review}</p>
          <dl className="supplier-form-grid mt-5">
            {Object.entries(supplierFields).map(([key, label]) => (
              <div key={key}>
                <dt className="text-muted">{label}</dt>
                <dd className="break-words">
                  {supplier[key as keyof typeof supplier] || "—"}
                </dd>
              </div>
            ))}
          </dl>
          <h2 className="mt-6">帳號設定</h2>
          <p>
            帳號：{supplier.code} · 角色：{supplier.role}（權限待定義） ·{" "}
            {supplier.enabled}
          </p>
          <SupplierCredentials key={code} code={code} />
          {supplier.review === "待審核" ? (
            <>
              <label className="mt-5" htmlFor="review-note">
                審核意見（退回必填）
              </label>
              <textarea
                id="review-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              {error && <p role="alert">{error}</p>}
              <div className="flex gap-3 mt-5">
                <button
                  className="button primary"
                  onClick={async () => {
                    try {
                      await reviewSupplier(code, true, note);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "審核失敗");
                    }
                  }}
                >
                  通過建檔
                </button>
                <button
                  className="button"
                  onClick={async () => {
                    try {
                      await reviewSupplier(code, false, note);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "無法退回");
                    }
                  }}
                >
                  退回建檔
                </button>
              </div>
            </>
          ) : (
            <p className="mt-5">審核意見：{supplier.reviewNote || "—"}</p>
          )}
        </div>
      </section>
    </>
  );
}
