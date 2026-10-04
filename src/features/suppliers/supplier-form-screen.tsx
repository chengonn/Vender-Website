"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSuppliers } from "@/context/supplier-context";
import {
  blankSupplier,
  supplierFields,
  supplierSchema,
  companyPrefix,
  type SupplierInput,
} from "./supplier-model";
import { BackLink, PageHeading } from "@/components/ui/primitives";
export function SupplierFormScreen() {
  const { createSupplier } = useSuppliers();
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: blankSupplier,
  });
  const name = useWatch({ control, name: "companyNameE" });
  const code =
    companyPrefix(name || "").length === 3
      ? `${companyPrefix(name)}＊＊＊＊（儲存時產生四位數字亂碼）`
      : "請輸入至少三個英文字母";
  return (
    <>
      <BackLink href="/admin/suppliers" />
      <PageHeading
        title="建檔供應商"
        eyebrow="NEW SUPPLIER"
        description="填寫假資料，POST 寫入資料庫後進入建檔審核。"
      />
      {saved ? (
        <section className="panel">
          <div className="panel-body">
            <p role="status">已建立 {saved}，待審核通過後才可登入。</p>
            <Link className="button primary" href={`/admin/suppliers/${saved}`}>
              前往建檔審核
            </Link>
          </div>
        </section>
      ) : (
        <form
          className="panel"
          noValidate
          onSubmit={handleSubmit(async (values) => {
            try {
              setSaved(await createSupplier(values));
            } catch (e) {
              setError(e instanceof Error ? e.message : "無法建檔");
            }
          })}
        >
          <div className="panel-body">
            <h2>公司與聯絡資料</h2>
            <p className="text-muted mb-4">
              公司英文名稱前三個英文字母大寫＋四位數字亂碼，例如
              GRA4827；儲存時產生不重複代碼。
            </p>
            <label htmlFor="supplier-code">
              公司代碼／登入帳號（系統生成）
            </label>
            <input id="supplier-code" value={code} readOnly />
            <div className="supplier-form-grid mt-5">
              {Object.entries(supplierFields).map(([key, label]) => (
                <div key={key}>
                  {key === "accountName" && <h2 className="mb-3">匯款資料</h2>}
                  {key === "billingContact" && (
                    <h2 className="mb-3">帳務聯絡資料</h2>
                  )}
                  <label htmlFor={key}>
                    {label}
                    {["companyNameC", "companyNameE", "country"].includes(key)
                      ? " *"
                      : ""}
                  </label>
                  <input
                    id={key}
                    {...register(key as keyof SupplierInput)}
                    placeholder={
                      key === "country" ? "例如 TW、JP、US" : undefined
                    }
                    aria-invalid={!!errors[key as keyof SupplierInput]}
                    aria-describedby={
                      errors[key as keyof SupplierInput]
                        ? `${key}-error`
                        : undefined
                    }
                  />
                  {errors[key as keyof SupplierInput] && (
                    <p id={`${key}-error`} role="alert" className="field-error">
                      {errors[key as keyof SupplierInput]?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <h2 className="mt-6">帳密管理</h2>
            <p className="text-muted">
              帳號與密碼由公司提供。使用者不可自行更改密碼；忘記密碼或人員異動請聯絡公司。
            </p>
            <div className="supplier-form-grid mt-5">
              <div>
                <label htmlFor="initial-password">
                  管理者設定初始密碼（僅示範）
                </label>
                <input
                  id="initial-password"
                  type="password"
                  autoComplete="new-password"
                  {...register("password")}
                />
                {errors.password && (
                  <p role="alert">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="supplier-role">角色（權限待定義）</label>
                <select id="supplier-role" {...register("role")}>
                  {["Vendor"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="supplier-enabled">狀態</label>
                <select id="supplier-enabled" {...register("enabled")}>
                  <option>啟用</option>
                  <option>關閉</option>
                </select>
              </div>
            </div>
            {error && <p role="alert">{error}</p>}
            <button
              className="button primary mt-6"
              type="submit"
              disabled={isSubmitting}
            >
              送出建檔審核
            </button>
          </div>
        </form>
      )}
    </>
  );
}
