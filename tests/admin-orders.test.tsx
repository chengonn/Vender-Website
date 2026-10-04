import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { LoginScreen } from "@/features/auth/login-screen";
import { DemoProvider } from "@/context/demo-context";
import { OrderListScreen } from "@/features/orders/order-list-screen";
describe("Admin 審核列表", () => {
  it("同份示範資料可篩選待審核並進入管理端明細", async () => {
    render(
      <DemoProvider>
        <OrderListScreen admin />
      </DemoProvider>,
    );
    await userEvent.selectOptions(
      screen.getByLabelText("訂單狀態"),
      "SUBMITTED",
    );
    expect(screen.getByRole("link", { name: "審核 DEMO-002" })).toHaveAttribute(
      "href",
      "/admin/orders/DEMO-002",
    );
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(
      screen.queryByRole("link", { name: "建立示範訂單" }),
    ).not.toBeInTheDocument();
  });
  it("明示非正式授權", () => {
    render(
      <DemoProvider>
        <OrderListScreen admin />
      </DemoProvider>,
    );
    expect(screen.getByText(/管理端為公開示範視角/)).toBeInTheDocument();
  });
});

it("登入頁申請會顯示於 Admin 後台", async () => {
  render(
    <DemoProvider>
      <LoginScreen />
      <OrderListScreen admin />
    </DemoProvider>,
  );
  await userEvent.type(screen.getByLabelText("帳號"), "DOL0001");
  await userEvent.click(screen.getByRole("button", { name: "忘記密碼？" }));
  await userEvent.click(
    screen.getByRole("button", { name: "送出忘記密碼申請" }),
  );
  expect(
    screen.getByText("DOL0001 — 忘記密碼，待 Admin 另行聯絡（示範）"),
  ).toBeInTheDocument();
});
