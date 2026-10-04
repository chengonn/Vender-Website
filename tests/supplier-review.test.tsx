import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect } from "vitest";
import { DemoProvider } from "@/context/demo-context";
import { useSuppliers } from "@/context/supplier-context";
import { SupplierReviewScreen } from "@/features/suppliers/supplier-review-screen";
import { initialSuppliers } from "@/features/suppliers/supplier-model";
function Fixture() {
  const { createSupplier } = useSuppliers();
  return (
    <>
      <button onClick={() => createSupplier(initialSuppliers[0])}>
        準備建檔
      </button>
      <SupplierReviewScreen code="DOL0002" />
    </>
  );
}
it("建檔退回必須填理由且不顯示密碼", async () => {
  render(
    <DemoProvider>
      <Fixture />
    </DemoProvider>,
  );
  await userEvent.click(screen.getByText("準備建檔"));
  await userEvent.click(screen.getByRole("button", { name: "退回建檔" }));
  expect(screen.getByRole("alert")).toHaveTextContent("退回時請填寫原因");
  await userEvent.type(
    screen.getByLabelText("審核意見（退回必填）"),
    "補充聯絡資料",
  );
  await userEvent.click(screen.getByRole("button", { name: "退回建檔" }));
  expect(screen.getByRole("status")).toHaveTextContent("退回");
  expect(screen.queryByText("Demo1234!")).not.toBeInTheDocument();
});
it("通過後更新建檔狀態", async () => {
  render(
    <DemoProvider>
      <Fixture />
    </DemoProvider>,
  );
  await userEvent.click(screen.getByText("準備建檔"));
  await userEvent.click(screen.getByRole("button", { name: "通過建檔" }));
  expect(screen.getByRole("status")).toHaveTextContent("通過");
});
