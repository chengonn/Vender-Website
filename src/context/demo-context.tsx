"use client";
import type { AccountingRecord, MonthlyStatement } from "@/types/accounting";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "@/services/api-client";
import type {
  DemoRole,
  Order,
  OrderFormValues,
  Reconciliation,
} from "@/types/order";
import type { Supplier } from "@/features/suppliers/supplier-model";
import { SupplierProvider } from "./supplier-context";
export type ApiState = {
  user: { username: string; role: DemoRole; companyId: string | null };
  orders: Order[];
  suppliers: Supplier[];
  passwordRequests: string[];
  reconciliations: Reconciliation[];
  accountingRecords: AccountingRecord[];
  monthlyStatements: MonthlyStatement[];
};
type Value = {
  user: ApiState["user"] | null;
  role: DemoRole;
  loading: boolean;
  error: string;
  orders: Order[];
  suppliers: Supplier[];
  reconciliations: Reconciliation[];
  accountingRecords: AccountingRecord[];
  monthlyStatements: MonthlyStatement[];
  passwordRequests: string[];
  refresh: () => Promise<void>;
  reset: () => Promise<void>;
  saveDraft: (
    values: OrderFormValues,
    attachments: string[],
    id?: string,
    submit?: boolean,
  ) => Promise<Order>;
  requestChange: (id: string, reason: string) => Promise<void>;
  reviewOrder: (
    id: string,
    approved: boolean,
    reason: string,
    change?: boolean,
    correction?: boolean,
  ) => Promise<void>;
};
const Context = createContext<Value | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ApiState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const data = await api<ApiState>("state");
    setState(data);
    setError("");
  }, []);
  useEffect(() => {
    let active = true;
    api<ApiState>("state")
      .then((data) => {
        if (active) setState(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const value: Value = {
    user: state?.user || null,
    role: state?.user.role || "SUPPLIER_USER",
    loading,
    error,
    orders: state?.orders || [],
    suppliers: state?.suppliers || [],
    passwordRequests: state?.passwordRequests || [],
    reconciliations: state?.reconciliations || [],
    accountingRecords: state?.accountingRecords || [],
    monthlyStatements: state?.monthlyStatements || [],
    refresh,
    reset: async () => {
      await api("auth/logout", {});
      setState(null);
    },
    saveDraft: async (values, attachments, id, submit = false) => {
      const revision = state?.orders.find((o) => o.id === id)?.revision;
      const order = await api<Order>("orders/save", {
        values,
        attachments,
        id,
        submit,
        revision,
      });
      await refresh();
      return order;
    },
    requestChange: async (id, reason) => {
      await api(`orders/${id}/change-request`, {
        reason,
        revision: state?.orders.find((o) => o.id === id)?.revision,
      });
      await refresh();
    },
    reviewOrder: async (
      id,
      approved,
      reason,
      change = false,
      correction = false,
    ) => {
      await api(`orders/${id}/${change ? "decide-change" : "review"}`, {
        approved,
        correction,
        reason,
        revision: state?.orders.find((o) => o.id === id)?.revision,
      });
      await refresh();
    },
  };
  return (
    <Context.Provider value={value}>
      <SupplierProvider>{children}</SupplierProvider>
    </Context.Provider>
  );
}
export function useDemo() {
  const c = useContext(Context);
  if (!c) throw new Error("DemoProvider missing");
  return c;
}
