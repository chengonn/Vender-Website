import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { AccountingScreen } from "@/features/accounting/accounting-screen";
import { mockOrders } from "@/data/mock-orders";
import type { AccountingRecord, MonthlyStatement } from "@/types/accounting";
const mocks = vi.hoisted(() => ({ api: vi.fn(), refresh: vi.fn() }));
vi.mock("@/services/api-client", () => ({ api: mocks.api }));
vi.mock("@/context/demo-context", () => ({
  useDemo: () => ({ ...state, refresh: mocks.refresh }),
}));
let state: {
  role: string;
  orders: typeof mockOrders;
  accountingRecords: AccountingRecord[];
  monthlyStatements: MonthlyStatement[];
};
const record = (): AccountingRecord => ({
  orderId: "DEMO-004",
  companyId: "DOL0001",
  period: "2026-09",
  status: "DRAFT",
  revision: 1,
  orderVersion: 1,
  lines: [
    {
      currency: "TWD",
      claimed: "100.00",
      approved: "99.99",
      reason: "核對差異",
    },
  ],
  note: "Demo",
  updatedBy: "ACCOUNTING-DEMO",
  updatedAt: "2026-09-10T00:00:00.000Z",
});
beforeEach(() => {
  state = {
    role: "ACCOUNTING",
    orders: mockOrders.map((o) => ({
      ...o,
      status: o.id === "DEMO-004" ? "LOCKED" : o.status,
      revision: 4,
      approvedVersion: o.id === "DEMO-004" ? o.version : undefined,
    })),
    accountingRecords: [],
    monthlyStatements: [],
  };
  mocks.api.mockReset().mockResolvedValue({ ok: true });
  mocks.refresh.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());
it("Accounting儲存對帳須填金額並帶入版本", async () => {
  render(<AccountingScreen />);
  await userEvent.click(
    screen.getByRole("button", { name: "填寫對帳 DEMO-004" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "儲存對帳資料" }));
  expect(mocks.api).not.toHaveBeenCalled();
  await userEvent.type(screen.getByLabelText("TWD 申報金額"), "100.00");
  await userEvent.type(screen.getByLabelText("TWD 認可金額"), "99.99");
  await userEvent.type(screen.getByLabelText("TWD 差異處理原因"), "已確認");
  await userEvent.click(screen.getByRole("button", { name: "儲存對帳資料" }));
  await waitFor(() =>
    expect(mocks.api).toHaveBeenCalledWith(
      "accounting/save",
      expect.objectContaining({
        orderId: "DEMO-004",
        orderRevision: 4,
        revision: 0,
        lines: [
          {
            currency: "TWD",
            claimed: "100.00",
            approved: "99.99",
            reason: "已確認",
          },
        ],
      }),
    ),
  );
});
it("確認對帳帶入最新版本，錯誤不顯示成功", async () => {
  state.accountingRecords = [record()];
  mocks.api.mockRejectedValueOnce(new Error("對帳資料已更新"));
  render(<AccountingScreen />);
  await userEvent.click(
    screen.getByRole("button", { name: "確認對帳 DEMO-004" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("對帳資料已更新");
  expect(
    screen.queryByText("對帳已確認，可納入月結。"),
  ).not.toBeInTheDocument();
  expect(mocks.api).toHaveBeenCalledWith("accounting/confirm", {
    orderId: "DEMO-004",
    revision: 1,
    orderRevision: 4,
  });
});
it("尚有差異時禁止結帳", () => {
  state.accountingRecords = [{ ...record(), status: "DISPUTED" }];
  render(<AccountingScreen />);
  expect(
    screen.getByRole("button", { name: "檢視結帳 DOL0001 2026-09" }),
  ).toBeDisabled();
});
it("結帳先顯示明細，再POST快照版本", async () => {
  state.accountingRecords = [{ ...record(), status: "RECONCILED" }];
  render(<AccountingScreen />);
  await userEvent.click(
    screen.getByRole("button", { name: "檢視結帳 DOL0001 2026-09" }),
  );
  expect(mocks.api).not.toHaveBeenCalled();
  expect(screen.getByText(/請核對本次全部帳單/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "確認結帳並鎖定" }));
  expect(await screen.findByRole("status")).toHaveTextContent("月結完成");
  expect(mocks.api).toHaveBeenCalledWith("accounting/close", {
    companyId: "DOL0001",
    period: "2026-09",
    expected: [{ orderId: "DEMO-004", revision: 1 }],
  });
});
it.each(["SUPPLIER_USER", "GSD", "ADMIN"])(
  "%s僅能查閱，沒有帳務寫入按鈕",
  (role) => {
    state.role = role;
    state.accountingRecords = [record()];
    render(<AccountingScreen />);
    expect(
      screen.queryByRole("button", { name: /確認對帳|填寫對帳|檢視結帳/ }),
    ).not.toBeInTheDocument();
  },
);
it("月結單可查看幣別總額與下載CSV", async () => {
  state.monthlyStatements = [
    {
      id: "MONTH-TEST",
      companyId: "DOL0001",
      companyName: "測試公司",
      period: "2026-09",
      records: [{ ...record(), status: "CLOSED" }],
      totals: [{ currency: "TWD", amount: "99.99" }],
      closedBy: "ACCOUNTING-DEMO",
      closedAt: "2026-09-10T00:00:00.000Z",
    },
  ];
  const make = vi.fn(() => "blob:test");
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL: make, revokeObjectURL: vi.fn() }),
  );
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  render(<AccountingScreen />);
  await userEvent.click(screen.getByText(/測試公司 · 2026-09/));
  expect(screen.getByText("TWD 合計：99.99")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "下載月結單 CSV" }));
  expect(make).toHaveBeenCalled();
  expect(click).toHaveBeenCalled();
  click.mockRestore();
});
