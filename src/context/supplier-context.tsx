"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useDemo } from "./demo-context";
import { api } from "@/services/api-client";
import type {
  Supplier,
  SupplierInput,
} from "@/features/suppliers/supplier-model";
type Value = {
  suppliers: Supplier[];
  createSupplier: (v: SupplierInput) => Promise<string>;
  reviewSupplier: (
    code: string,
    approved: boolean,
    note: string,
  ) => Promise<void>;
  toggleSupplier: (code: string) => Promise<void>;
};
const Context = createContext<Value | null>(null);
export function SupplierProvider({ children }: { children: ReactNode }) {
  const { suppliers, refresh } = useDemo();
  return (
    <Context.Provider
      value={{
        suppliers,
        createSupplier: async (values) => {
          const { code } = await api<{ code: string }>("suppliers", values);
          await refresh();
          return code;
        },
        reviewSupplier: async (code, approved, note) => {
          await api(`suppliers/${code}/review`, { approved, note });
          await refresh();
        },
        toggleSupplier: async (code) => {
          const current = suppliers.find((s) => s.code === code);
          await api(`suppliers/${code}/status`, {
            enabled: current?.enabled === "啟用" ? "關閉" : "啟用",
          });
          await refresh();
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSuppliers() {
  const c = useContext(Context);
  if (!c) throw new Error("SupplierProvider missing");
  return c;
}
