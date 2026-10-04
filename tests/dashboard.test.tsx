import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DemoProvider } from "@/context/demo-context";
import { DashboardScreen } from "@/features/dashboard/dashboard-screen";
describe("Supplier Dashboard", () => {
  it("統計對應同一份訂單並提供可繼續操作的連結", () => {
    render(
      <DemoProvider>
        <DashboardScreen />
      </DemoProvider>,
    );
    expect(
      within(screen.getByRole("region", { name: "全部訂單" })).getByText("06"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "繼續編輯" })).toHaveAttribute(
      "href",
      "/orders/DEMO-001/edit",
    );
    expect(screen.getByRole("link", { name: "前往對帳" })).toHaveAttribute(
      "href",
      "/reconciliations/REC-DEMO-001",
    );
  });
  it("只顯示五筆最近訂單，保留全部列表入口", () => {
    render(
      <DemoProvider>
        <DashboardScreen />
      </DemoProvider>,
    );
    expect(screen.getAllByRole("row")).toHaveLength(6);
    expect(screen.getByRole("link", { name: "查看全部" })).toHaveAttribute(
      "href",
      "/orders",
    );
  });
});
