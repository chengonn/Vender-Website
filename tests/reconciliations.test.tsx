import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DemoProvider } from "@/context/demo-context";
import { ReconciliationListScreen } from "@/features/reconciliations/reconciliation-list-screen";
describe("對帳列表", () => {
  it("引用既有訂單且連結到同一筆對帳", () => {
    render(
      <DemoProvider>
        <ReconciliationListScreen />
      </DemoProvider>,
    );
    expect(screen.getByRole("link", { name: "DEMO-004" })).toHaveAttribute(
      "href",
      "/orders/DEMO-004",
    );
    expect(screen.getByRole("link", { name: "查看對帳" })).toHaveAttribute(
      "href",
      "/reconciliations/REC-DEMO-001",
    );
    expect(screen.getByText("示範客戶 D")).toBeInTheDocument();
  });
});
