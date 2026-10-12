import { describe, it, expect } from "vitest";
import {
  seed,
  transition,
  restore,
  cents,
  type OrderInput,
} from "../lib/model";
const values: OrderInput = {
  route: "高雄 → 東京",
  reference: "FAKE-BL",
  item: "運費",
  amount: "0.10",
  currency: "USD",
  note: "",
};
describe("portfolio workflow", () => {
  it("creates, submits, returns, corrects, approves, reconciles and closes a new order", () => {
    let s = transition(seed(), "Vendor", { type: "save", values });
    const id = s.orders[0].id;
    s = transition(s, "Vendor", { type: "submit", id });
    s = transition(s, "GSD", {
      type: "review",
      id,
      approve: false,
      reason: "請核對提單",
    });
    s = transition(s, "Vendor", {
      type: "save",
      id,
      values: { ...values, reference: "CORRECTED" },
    });
    s = transition(s, "Vendor", { type: "submit", id });
    s = transition(s, "GSD", { type: "review", id, approve: true, reason: "" });
    s = transition(s, "Accounting", {
      type: "reconcile",
      id,
      amount: "0.10",
      period: "2026-10",
      reason: "",
    });
    s = transition(s, "Accounting", {
      type: "close",
      company: "STA1001",
      period: "2026-10",
    });
    expect(s.orders[0].status).toBe("已結帳");
    expect(s.statements[0].totals).toEqual([
      { currency: "USD", amount: "0.10" },
    ]);
    expect(s.orders[0].history.length).toBe(8);
    expect(restore(JSON.stringify(s))).toEqual(s);
  });
  it("rejects wrong roles and invalid state transitions without mutating original", () => {
    const s = seed();
    const before = JSON.stringify(s);
    expect(() =>
      transition(s, "Admin", {
        type: "review",
        id: "DEMO-001",
        approve: true,
        reason: "",
      }),
    ).toThrow("GSD");
    expect(() =>
      transition(s, "Accounting", {
        type: "reconcile",
        id: "DEMO-001",
        amount: "1",
        period: "2026-10",
        reason: "",
      }),
    ).toThrow("GSD");
    expect(() =>
      transition(s, "Vendor", { type: "save", id: "DEMO-003", values }),
    ).toThrow("不可修改");
    expect(JSON.stringify(s)).toBe(before);
  });
  it("requires reasons for a return and an amount difference", () => {
    expect(() =>
      transition(seed(), "GSD", {
        type: "review",
        id: "DEMO-001",
        approve: false,
        reason: " ",
      }),
    ).toThrow("原因");
    expect(() =>
      transition(seed(), "Accounting", {
        type: "reconcile",
        id: "DEMO-002",
        amount: "8500",
        period: "2026-10",
        reason: "",
      }),
    ).toThrow("差異");
  });
  it("rejects invalid money and already closed accounting periods", () => {
    expect(() => cents("1.005")).toThrow();
    expect(() => cents("-1")).toThrow();
    expect(cents("0.10") + cents("0.20")).toBe(30);
    expect(() =>
      transition(seed(), "Accounting", {
        type: "reconcile",
        id: "DEMO-002",
        amount: "8600",
        period: "2026-08",
        reason: "",
      }),
    ).toThrow("已結帳");
    expect(() =>
      transition(seed(), "Accounting", {
        type: "close",
        company: "STA1001",
        period: "2026-08",
      }),
    ).toThrow("已結帳");
  });
  it("keeps currencies separate and cannot close twice", () => {
    let s = transition(seed(), "Vendor", { type: "save", values });
    const id = s.orders[0].id;
    s = transition(s, "Vendor", { type: "submit", id });
    s = transition(s, "GSD", { type: "review", id, approve: true, reason: "" });
    for (const [orderId, amount] of [
      [id, "0.10"],
      ["DEMO-002", "8600"],
    ])
      s = transition(s, "Accounting", {
        type: "reconcile",
        id: orderId,
        amount,
        period: "2026-10",
        reason: "",
      });
    s = transition(s, "Accounting", {
      type: "close",
      company: "STA1001",
      period: "2026-10",
    });
    expect(s.statements[0].totals).toHaveLength(2);
    expect(() =>
      transition(s, "Accounting", {
        type: "close",
        company: "STA1001",
        period: "2026-10",
      }),
    ).toThrow();
  });
  it("creates pending suppliers with a generated code and blocks disabled vendor actions", () => {
    let s = transition(seed(), "Admin", {
      type: "supplier",
      name: "假資料供應商",
      english: "Aurora Example",
    });
    expect(s.suppliers.at(-1)?.id).toMatch(/^AUR\d{4}$/);
    expect(s.suppliers.at(-1)?.status).toBe("待審核");
    s = transition(s, "Admin", {
      type: "supplierStatus",
      id: "STA1001",
      status: "關閉",
    });
    expect(() => transition(s, "Vendor", { type: "save", values })).toThrow(
      "關閉",
    );
  });
  it("restores defaults and reports damaged local storage", () => {
    expect(restore(null).orders.map((o) => o.status)).toEqual([
      "待 GSD 審核",
      "待 Accounting 對帳",
      "已結帳",
    ]);
    expect(() => restore("not-json")).toThrow();
    expect(() => restore('{"version":0}')).toThrow();
  });
});
