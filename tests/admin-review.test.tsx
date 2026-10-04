import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { DemoProvider, useDemo } from "@/context/demo-context";
import { ReviewScreen } from "@/features/admin/review-screen";
function Probe() {
  const { orders } = useDemo();
  return (
    <div data-testid="order-state">
      {orders.find((item) => item.id === "DEMO-002")?.status}
    </div>
  );
}
describe("Admin 審核", () => {
  it("退回說明經驗證，預覽不變更訂單", async () => {
    render(
      <DemoProvider>
        <ReviewScreen id="DEMO-002" />
        <Probe />
      </DemoProvider>,
    );
    await userEvent.selectOptions(
      screen.getByLabelText("審核結果（預覽）"),
      "RETURN",
    );
    await userEvent.click(screen.getByRole("button", { name: "預覽審核結果" }));
    expect(
      await screen.findByText("請填寫退回說明（原型驗證）"),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText("審核說明"),
      "請補充示範附件說明",
    );
    await userEvent.click(screen.getByRole("button", { name: "預覽審核結果" }));
    expect(
      within(screen.getByRole("region", { name: "審核結果預覽" })).getByText(
        "請補充示範附件說明",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("order-state")).toHaveTextContent("SUBMITTED");
    expect(
      screen.queryByRole("link", { name: "編輯草稿" }),
    ).not.toBeInTheDocument();
  });
  it("通過也只預覽", async () => {
    render(
      <DemoProvider>
        <ReviewScreen id="DEMO-002" />
        <Probe />
      </DemoProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "預覽審核結果" }));
    expect(
      await screen.findByRole("region", { name: "審核結果預覽" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("order-state")).toHaveTextContent("SUBMITTED");
  });
  it("已開票無審核表單", () => {
    render(
      <DemoProvider>
        <ReviewScreen id="DEMO-006" />
      </DemoProvider>,
    );
    expect(screen.getByText("此狀態不提供審核預覽")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "預覽審核結果" }),
    ).not.toBeInTheDocument();
  });
});
