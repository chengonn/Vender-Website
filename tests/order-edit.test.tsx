import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { DemoProvider, useDemo } from "@/context/demo-context";
import { OrderFormScreen } from "@/features/orders/order-form-screen";
import { push } from "./setup";
function Probe() {
  const { orders } = useDemo();
  return <output data-testid="orders">{JSON.stringify(orders)}</output>;
}
describe("編輯訂單", () => {
  it("編輯原始草稿且不建立第二筆訂單", async () => {
    render(
      <DemoProvider>
        <OrderFormScreen id="DEMO-001" />
        <Probe />
      </DemoProvider>,
    );
    expect(screen.getByLabelText("客戶名稱")).toHaveValue("示範客戶 A");
    await userEvent.clear(screen.getByLabelText("客戶名稱"));
    await userEvent.type(screen.getByLabelText("客戶名稱"), "示範新名稱");
    await userEvent.click(screen.getByRole("button", { name: "儲存草稿" }));
    expect(push).toHaveBeenCalledWith("/orders/DEMO-001");
    const orders = JSON.parse(screen.getByTestId("orders").textContent!);
    expect(orders).toHaveLength(6);
    expect(
      orders.find((order: { id: string }) => order.id === "DEMO-001")
        .customerName,
    ).toBe("示範新名稱");
  });
  it("直接打開鎖定訂單編輯路由亦不提供表單", () => {
    render(
      <DemoProvider>
        <OrderFormScreen id="DEMO-002" />
      </DemoProvider>,
    );
    expect(screen.getByText("此訂單目前已鎖定")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "儲存草稿" }),
    ).not.toBeInTheDocument();
  });
  it("未知編號顯示返回入口", () => {
    render(
      <DemoProvider>
        <OrderFormScreen id="MISSING" />
      </DemoProvider>,
    );
    expect(screen.getByText("找不到這筆示範訂單")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回訂單列表" })).toHaveAttribute(
      "href",
      "/orders",
    );
  });
});
