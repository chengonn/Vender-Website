import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { DemoProvider, useDemo } from "@/context/demo-context";
import { OrderFormScreen } from "@/features/orders/order-form-screen";
import { push } from "./setup";
function Probe() {
  const { orders } = useDemo();
  return <output data-testid="orders">{JSON.stringify(orders)}</output>;
}
function setup() {
  render(
    <DemoProvider>
      <OrderFormScreen />
      <Probe />
    </DemoProvider>,
  );
}
describe("建立訂單", () => {
  it("可新增移除費用與示範附件，儲存尚未填完的草稿", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "新增費用" }));
    expect(screen.getByLabelText("費用名稱 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "移除費用 2" }));
    expect(screen.queryByLabelText("費用名稱 2")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "加入示範附件" }));
    await userEvent.click(screen.getByRole("button", { name: "儲存草稿" }));
    expect(push).toHaveBeenCalledWith(
      expect.stringMatching(/^\/orders\/DEMO-NEW-/),
    );
    const orders = JSON.parse(screen.getByTestId("orders").textContent!);
    expect(orders[0].status).toBe("DRAFT");
    expect(orders[0].attachments).toHaveLength(1);
  });
  it("取消確認不新增訂單，確認後僅新增一筆鎖定示範版本", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "預覽送出" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "返回編輯",
      }),
    );
    expect(push).not.toHaveBeenCalled();
    expect(JSON.parse(screen.getByTestId("orders").textContent!)).toHaveLength(
      6,
    );
    await userEvent.click(screen.getByRole("button", { name: "預覽送出" }));
    await userEvent.click(screen.getByRole("button", { name: "確認示範送出" }));
    const orders = JSON.parse(screen.getByTestId("orders").textContent!);
    expect(orders).toHaveLength(7);
    expect(orders[0]).toMatchObject({ status: "SUBMITTED", version: 1 });
  });
  it("Zod 拒絕超過 1000 字備註與非數值單價", async () => {
    setup();
    fireEvent.change(screen.getByLabelText("訂單備註（最多 1000 字）"), {
      target: { value: "字".repeat(1001) },
    });
    await userEvent.type(screen.getByLabelText("單價 1"), "abc");
    await userEvent.click(screen.getByRole("button", { name: "預覽送出" }));
    expect(await screen.findByText("備註最多 1000 字")).toBeInTheDocument();
    expect(screen.getByText("請填寫有效數字")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
