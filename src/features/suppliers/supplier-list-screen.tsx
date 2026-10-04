"use client";
import { useState } from "react";
import Link from "next/link";
import { useSuppliers } from "@/context/supplier-context";
import { PageHeading } from "@/components/ui/primitives";
export function SupplierListScreen() {
  const { suppliers, toggleSupplier } = useSuppliers();
  const [error, setError] = useState("");
  return (
    <>
      {error && <p role="alert">{error}</p>}
      <PageHeading
        title="供應商管理"
        eyebrow="SUPPLIER MANAGEMENT"
        description="由 Admin 預先建檔，公司代碼即登入帳號。"
        action={
          <Link className="button primary" href="/admin/suppliers/new">
            建檔供應商
          </Link>
        }
      />
      <section className="panel">
        <div className="panel-body">
          <p className="text-muted mb-4">
            假資料原型 · 資料庫持久保存 · 角色權限待定義
          </p>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  {[
                    "公司代碼／帳號",
                    "公司名稱",
                    "角色",
                    "建檔審核",
                    "狀態",
                    "操作",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.code}>
                    <td>{s.code}</td>
                    <td>
                      {s.companyNameC}
                      <br />
                      {s.companyNameE}
                    </td>
                    <td>{s.role}</td>
                    <td>{s.review}</td>
                    <td>{s.enabled}</td>
                    <td>
                      <Link
                        className="button"
                        href={`/admin/suppliers/${s.code}`}
                      >
                        查看／審核 {s.code}
                      </Link>
                      <button
                        className="button"
                        onClick={async () => {
                          try {
                            await toggleSupplier(s.code);
                          } catch (e) {
                            setError(
                              e instanceof Error ? e.message : "操作失敗",
                            );
                          }
                        }}
                      >
                        {s.enabled === "啟用" ? "關閉" : "啟用"} {s.code}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
