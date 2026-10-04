import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect } from "vitest";
import { DemoProvider } from "@/context/demo-context";
import { SupplierListScreen } from "@/features/suppliers/supplier-list-screen";
it("預建帳號可檢視及切換啟用狀態", async () => {
  render(
    <DemoProvider>
      <SupplierListScreen />
    </DemoProvider>,
  );
  expect(
    screen.getByRole("link", { name: "查看／審核 DOL0001" }),
  ).toHaveAttribute("href", "/admin/suppliers/DOL0001");
  await userEvent.click(screen.getByRole("button", { name: "關閉 DOL0001" }));
  expect(
    screen.getByRole("button", { name: "啟用 DOL0001" }),
  ).toBeInTheDocument();
});
