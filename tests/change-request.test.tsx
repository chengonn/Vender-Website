import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { DemoProvider, useDemo } from "@/context/demo-context";
import { ChangeRequestScreen } from "@/features/orders/change-request-screen";
function Probe() {
  const { orders } = useDemo();
  return (
    <output data-testid="order">
      {JSON.stringify(orders.find((order) => order.id === "DEMO-002"))}
    </output>
  );
}
describe("修改申請", () => {
  it("拒絕空白原因，填寫後記錄但不自動解鎖", async () => {
    render(
      <DemoProvider>
        <ChangeRequestScreen id="DEMO-002" />
        <Probe />
      </DemoProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "送出示範申請" }));
    expect(await screen.findByText("請填寫修改原因")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/修改原因/), "補充示範費用說明");
    await userEvent.click(screen.getByRole("button", { name: "送出示範申請" }));
    expect(await screen.findByText("示範修改申請已記錄")).toHaveAttribute(
      "role",
      "status",
    );
    const order = JSON.parse(screen.getByTestId("order").textContent!);
    expect(order.status).toBe("UNLOCK_REQUESTED");
    expect(order.editableUntil).toBeUndefined();
    expect(order.changeReason).toBe("補充示範費用說明");
    expect(
      screen.queryByRole("button", { name: "送出示範申請" }),
    ).not.toBeInTheDocument();
  });
  it("已開票不接受原單修改申請", () => {
    render(
      <DemoProvider>
        <ChangeRequestScreen id="DEMO-006" />
      </DemoProvider>,
    );
    expect(screen.getByText("此狀態不提供修改申請示範")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
it("超過 24 小時不顯示申請表單", () => {
  render(
    <DemoProvider>
      <ChangeRequestScreen id="DEMO-005" />
    </DemoProvider>,
  );
  expect(screen.getByText("無法申請修改")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "送出示範申請" }),
  ).not.toBeInTheDocument();
});
