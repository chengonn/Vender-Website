import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect } from "vitest";
import { DemoProvider } from "@/context/demo-context";
import { SupplierFormScreen } from "@/features/suppliers/supplier-form-screen";
it("建檔必填驗證，生成公司代碼且送出待審核", async () => {
  render(
    <DemoProvider>
      <SupplierFormScreen />
    </DemoProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "送出建檔審核" }));
  expect(await screen.findByText("請填寫中文公司名稱")).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText("公司名稱(C) *"), "測試公司");
  await userEvent.type(
    screen.getByLabelText("公司名稱(E) *"),
    "GRAND OCEAN LOGISTICS",
  );
  await userEvent.type(screen.getByLabelText("國家代碼 *"), "TW");
  await userEvent.type(
    screen.getByLabelText("管理者設定初始密碼（僅示範）"),
    "Demo1234!",
  );
  expect(screen.getByLabelText("公司代碼／登入帳號（系統生成）")).toHaveValue(
    "GOL0001",
  );
  await userEvent.click(screen.getByRole("button", { name: "送出建檔審核" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "已建立 GOL0001，待審核通過後才可登入。",
  );
});
