import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { ReconciliationDetailScreen } from "@/features/reconciliations/reconciliation-detail-screen";
import { mockReconciliations } from "@/data/mock-orders";
describe("對帳明細", () => {
  it("差異需填原因，預覽不改變對帳狀態", async () => {
    render(<ReconciliationDetailScreen id="REC-DEMO-001" />);
    expect(screen.getByText("-500")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "預覽對帳意見" }));
    expect(await screen.findByText("提出差異時請填寫原因")).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText("差異原因／補充說明"),
      "請核對示範文件處理費",
    );
    await userEvent.click(screen.getByRole("button", { name: "預覽對帳意見" }));
    expect(
      within(screen.getByRole("region", { name: "對帳意見預覽" })).getByText(
        "請核對示範文件處理費",
      ),
    ).toBeInTheDocument();
    expect(mockReconciliations[0].status).toBe("WAITING_SUPPLIER_CONFIRMATION");
    await userEvent.click(screen.getByRole("button", { name: "清除預覽" }));
    expect(
      screen.queryByRole("region", { name: "對帳意見預覽" }),
    ).not.toBeInTheDocument();
  });
  it("同意僅預覽，不開立 Invoice", async () => {
    render(<ReconciliationDetailScreen id="REC-DEMO-001" />);
    await userEvent.selectOptions(screen.getByLabelText("核對結果"), "AGREE");
    await userEvent.click(screen.getByRole("button", { name: "預覽對帳意見" }));
    expect(
      await screen.findByRole("heading", { name: "同意內容（預覽）" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Invoice/ }),
    ).not.toBeInTheDocument();
  });
  it("錯誤 id 有返回路徑", () => {
    render(<ReconciliationDetailScreen id="missing" />);
    expect(screen.getByText("找不到這筆示範對帳")).toBeInTheDocument();
  });
});
