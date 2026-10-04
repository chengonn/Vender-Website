import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { DemoProvider } from "@/context/demo-context";
import { OrderListScreen } from "@/features/orders/order-list-screen";
describe("訂單列表", () => {
  it("搜尋與狀態共同篩選，清除可恢復列表", async () => {
    render(
      <DemoProvider>
        <OrderListScreen />
      </DemoProvider>,
    );
    await userEvent.type(screen.getByLabelText("搜尋訂單"), "高雄");
    expect(screen.getAllByRole("row")).toHaveLength(4);
    await userEvent.selectOptions(screen.getByLabelText("訂單狀態"), "DRAFT");
    expect(screen.getByText("DEMO-001")).toBeInTheDocument();
    expect(screen.queryByText("DEMO-003")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "清除條件" }));
    expect(screen.getAllByRole("row")).toHaveLength(7);
  });
  it("找不到資料顯示空狀態", async () => {
    render(
      <DemoProvider>
        <OrderListScreen />
      </DemoProvider>,
    );
    await userEvent.type(screen.getByLabelText("搜尋訂單"), "does-not-exist");
    expect(screen.getByText("沒有符合條件的資料")).toBeInTheDocument();
  });
});
