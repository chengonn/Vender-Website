import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DemoProvider } from "@/context/demo-context";
import { OrderDetailScreen } from "@/features/orders/order-detail-screen";
describe("訂單明細", () => {
  it("草稿有編輯入口、單票與費用", () => {
    render(
      <DemoProvider>
        <OrderDetailScreen id="DEMO-001" />
      </DemoProvider>,
    );
    expect(screen.getByRole("link", { name: "編輯草稿" })).toHaveAttribute(
      "href",
      "/orders/DEMO-001/edit",
    );
    expect(
      screen.getByRole("table", { name: "訂單費用明細" }),
    ).toBeInTheDocument();
  });
  it("鎖定資料只能導向修改申請", () => {
    render(
      <DemoProvider>
        <OrderDetailScreen id="DEMO-002" />
      </DemoProvider>,
    );
    expect(
      screen.queryByRole("link", { name: "編輯草稿" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "申請修改" })).toHaveAttribute(
      "href",
      "/orders/DEMO-002/change-request",
    );
  });
  it("已開票不提供原單修改入口", () => {
    render(
      <DemoProvider>
        <OrderDetailScreen id="DEMO-006" />
      </DemoProvider>,
    );
    expect(
      screen.queryByRole("link", { name: "申請修改" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "編輯草稿" }),
    ).not.toBeInTheDocument();
  });
  it("未知編號顯示空狀態", () => {
    render(
      <DemoProvider>
        <OrderDetailScreen id="missing" />
      </DemoProvider>,
    );
    expect(screen.getByText("找不到這筆示範訂單")).toBeInTheDocument();
  });
});
