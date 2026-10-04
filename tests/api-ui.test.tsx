import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { DemoProvider } from "@/context/demo-context";
import { LoginScreen } from "@/features/auth/login-screen";
import { SupplierFormScreen } from "@/features/suppliers/supplier-form-screen";
import { SupplierListScreen } from "@/features/suppliers/supplier-list-screen";
import { SupplierReviewScreen } from "@/features/suppliers/supplier-review-screen";
import { OrderFormScreen } from "@/features/orders/order-form-screen";
import { ChangeRequestScreen } from "@/features/orders/change-request-screen";
import { ReviewScreen } from "@/features/admin/review-screen";
import { mockOrders } from "@/data/mock-orders";
import { initialSuppliers } from "@/features/suppliers/supplier-model";
import { push } from "./setup";
const initialState = () => ({
  user: { username: "ADMIN-DEMO", role: "ADMIN", companyId: null },
  suppliers: structuredClone(initialSuppliers),
  orders: mockOrders.map((o) => ({
    ...o,
    revision: 1,
    submittedAt: new Date().toISOString(),
  })),
  reconciliations: [],
  passwordRequests: [],
});
let state = initialState();
let requests: { path: string; body: Record<string, unknown> }[] = [];
let rejectSave = false;
beforeEach(() => {
  state = initialState();
  requests = [];
  rejectSave = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options: RequestInit = {}) => {
      const path = url.replace("/api/v1/", "");
      const body = options.body ? JSON.parse(String(options.body)) : {};
      requests.push({ path, body });
      let data: unknown = { ok: true };
      const status = 200;
      if (path === "state") data = state;
      if (path.endsWith("/password/reveal"))
        data = { password: "Company5678!" };
      if (path === "auth/login")
        data = {
          role: body.username === "ADMIN-DEMO" ? "ADMIN" : "SUPPLIER_USER",
          mustChangePassword: false,
        };
      if (path === "suppliers") {
        data = { code: "TVD0001" };
      }
      if (path.endsWith("/status")) {
        state.suppliers[0].enabled = "關閉";
      }
      if (path.endsWith("/review") && path.startsWith("suppliers/")) {
        state.suppliers[0].review = "通過";
      }
      if (path === "orders/save") {
        if (rejectSave)
          return {
            ok: false,
            status: 422,
            json: async () => ({ error: "請填寫 File No." }),
          };
        data = { ...mockOrders[0], id: "SAVED-API" };
      }
      if (path.endsWith("/change-request")) {
        state.orders[1].status = "UNLOCK_REQUESTED";
        state.orders[1].changeReason = body.reason;
      }
      if (path.endsWith("/review") && path.startsWith("orders/")) {
        state.orders[1].status = "LOCKED";
      }
      return {
        ok: status < 400,
        status,
        json: async () => ({ data: structuredClone(data) }),
      };
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());
it("登入直接導頁，沒有忘記或更改密碼操作", async () => {
  render(
    <DemoProvider>
      <LoginScreen />
    </DemoProvider>,
  );
  expect(
    screen.queryByRole("button", { name: /忘記密碼/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/使用人員異動/)).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText("帳號"), "DOL0001");
  await userEvent.type(
    screen.getByLabelText("密碼", { exact: true }),
    "Demo1234!",
  );
  await userEvent.click(screen.getByRole("button", { name: "登入" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  expect(
    requests.some(
      (r) =>
        r.path === "auth/change-password" || r.path === "auth/password-help",
    ),
  ).toBe(false);
});
it("建檔表單等待POST才顯示生成帳號", async () => {
  render(
    <DemoProvider>
      <SupplierFormScreen />
    </DemoProvider>,
  );
  await userEvent.type(screen.getByLabelText("公司名稱(C) *"), "測試公司");
  await userEvent.type(
    screen.getByLabelText("公司名稱(E) *"),
    "Test Vendor Demo",
  );
  await userEvent.type(screen.getByLabelText("國家代碼 *"), "TW");
  await userEvent.type(
    screen.getByLabelText("管理者設定初始密碼（僅示範）"),
    "Demo1234!",
  );
  await userEvent.click(screen.getByRole("button", { name: "送出建檔審核" }));
  expect(await screen.findByRole("status")).toHaveTextContent("TVD0001");
  expect(
    requests.some(
      (r) => r.path === "suppliers" && r.body.companyNameC === "測試公司",
    ),
  ).toBe(true);
});
it("列表關閉帳號後重新取得API資料", async () => {
  render(
    <DemoProvider>
      <SupplierListScreen />
    </DemoProvider>,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "關閉 DOL0001" }),
  );
  expect(
    await screen.findByRole("button", { name: "啟用 DOL0001" }),
  ).toBeInTheDocument();
});
it("建檔審核寫入API並更新畫面", async () => {
  state.suppliers[0].review = "待審核";
  render(
    <DemoProvider>
      <SupplierReviewScreen code="DOL0001" />
    </DemoProvider>,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "通過建檔" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("通過"),
  );
});
it("訂單儲存API錯誤留在表單，成功才導向明細", async () => {
  rejectSave = true;
  render(
    <DemoProvider>
      <OrderFormScreen />
    </DemoProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: /儲存草稿/ }));
  expect(await screen.findByText("請填寫 File No.")).toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
  rejectSave = false;
  await userEvent.click(screen.getByRole("button", { name: /儲存草稿/ }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/orders/SAVED-API"));
});
it("修改申請將原因與revision送入API", async () => {
  render(
    <DemoProvider>
      <ChangeRequestScreen id="DEMO-002" />
    </DemoProvider>,
  );
  await userEvent.type(await screen.findByLabelText(/修改原因/), "補充資料");
  await userEvent.click(screen.getByRole("button", { name: "送出示範申請" }));
  expect(await screen.findByText("示範修改申請已記錄")).toBeInTheDocument();
  expect(
    requests.some(
      (r) =>
        r.path === "orders/DEMO-002/change-request" && r.body.revision === 1,
    ),
  ).toBe(true);
});
it("GSD帳單審核由預覽改成真正POST", async () => {
  state.user.role = "GSD";
  render(
    <DemoProvider>
      <ReviewScreen id="DEMO-002" />
    </DemoProvider>,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "送出審核結果" }),
  );
  expect(await screen.findByText("審核結果已儲存。")).toBeInTheDocument();
  expect(
    requests.some(
      (r) => r.path === "orders/DEMO-002/review" && r.body.approved === true,
    ),
  ).toBe(true);
});

it("Admin再次驗證後查看及隱藏密碼，設定新密碼會POST", async () => {
  render(
    <DemoProvider>
      <SupplierReviewScreen code="DOL0001" />
    </DemoProvider>,
  );
  const reveal = await screen.findByRole("button", { name: "查看現行密碼" });
  expect(reveal).toBeDisabled();
  await userEvent.type(screen.getByLabelText("Admin 密碼驗證"), "Demo1234!");
  await userEvent.click(reveal);
  expect(await screen.findByLabelText("現行密碼")).toHaveTextContent(
    "Company5678!",
  );
  expect(screen.getByLabelText("Admin 密碼驗證")).toHaveValue("");
  await userEvent.click(screen.getByRole("button", { name: "隱藏現行密碼" }));
  expect(screen.queryByLabelText("現行密碼")).not.toBeInTheDocument();
  await userEvent.type(screen.getByLabelText("Admin 密碼驗證"), "Demo1234!");
  await userEvent.type(
    screen.getByLabelText("公司設定新密碼"),
    "NewCompany789!",
  );
  await userEvent.click(screen.getByRole("button", { name: "設定供應商密碼" }));
  expect(await screen.findByText(/公司已更新密碼/)).toBeInTheDocument();
  expect(
    requests.some(
      (r) =>
        r.path === "suppliers/DOL0001/password/set" &&
        r.body.newPassword === "NewCompany789!",
    ),
  ).toBe(true);
});

it("GSD要求更正送入API，Admin只能查閱", async () => {
  state.user.role = "GSD";
  render(
    <DemoProvider>
      <ReviewScreen id="DEMO-002" />
    </DemoProvider>,
  );
  await userEvent.selectOptions(
    await screen.findByLabelText("審核結果"),
    "CORRECT",
  );
  await userEvent.type(screen.getByLabelText("審核說明"), "請補文件");
  await userEvent.click(screen.getByRole("button", { name: "送出審核結果" }));
  expect(await screen.findByText("審核結果已儲存。")).toBeInTheDocument();
  expect(
    requests.some(
      (r) =>
        r.path === "orders/DEMO-002/review" &&
        r.body.correction === true &&
        r.body.approved === false,
    ),
  ).toBe(true);
});
it("Admin不能看到GSD審核按鈕", async () => {
  render(
    <DemoProvider>
      <ReviewScreen id="DEMO-002" />
    </DemoProvider>,
  );
  await screen.findByText("此角色或狀態不提供審核操作");
  expect(
    screen.queryByRole("button", { name: "送出審核結果" }),
  ).not.toBeInTheDocument();
});
