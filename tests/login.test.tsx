import { useSuppliers } from "@/context/supplier-context";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { LoginScreen } from "@/features/auth/login-screen";
import { DemoProvider, useDemo } from "@/context/demo-context";
import { push } from "./setup";
function Probe() {
  const { passwordRequests } = useDemo();
  return <div data-testid="requests">{passwordRequests.join(",")}</div>;
}
function mount() {
  render(
    <DemoProvider>
      <LoginScreen />
      <Probe />
    </DemoProvider>,
  );
}
describe("登入原型", () => {
  it("必填驗證、錯誤帳密與供應商登入", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: "登入" }));
    expect(await screen.findByText("請輸入帳號")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("帳號"), "DOL0001");
    await userEvent.type(screen.getByLabelText("密碼", { exact: true }), "bad");
    await userEvent.click(screen.getByRole("button", { name: "登入" }));
    expect(await screen.findByText(/示範帳號或密碼不正確/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    await userEvent.clear(screen.getByLabelText("密碼", { exact: true }));
    await userEvent.type(
      screen.getByLabelText("密碼", { exact: true }),
      "Demo1234!",
    );
    await userEvent.click(screen.getByRole("button", { name: "登入" }));
    expect(await screen.findByText("首次登入，請更換密碼")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    await userEvent.type(
      screen.getByLabelText("新密碼", { exact: true }),
      "Changed123!",
    );
    await userEvent.type(screen.getByLabelText("確認新密碼"), "Changed123!");
    await userEvent.click(
      screen.getByRole("button", { name: "更換密碼並登入" }),
    );
    expect(push).toHaveBeenCalledWith("/dashboard");
  });
  it("Admin 登入與顯示密碼", async () => {
    mount();
    await userEvent.type(screen.getByLabelText("帳號"), "ADMIN-DEMO");
    await userEvent.type(
      screen.getByLabelText("密碼", { exact: true }),
      "Demo1234!",
    );
    expect(screen.getByLabelText("密碼", { exact: true })).toHaveAttribute(
      "type",
      "password",
    );
    await userEvent.click(screen.getByRole("button", { name: "顯示密碼" }));
    expect(screen.getByLabelText("密碼", { exact: true })).toHaveAttribute(
      "type",
      "text",
    );
    await userEvent.click(screen.getByRole("button", { name: "登入" }));
    expect(push).toHaveBeenCalledWith("/admin/orders");
    expect(
      screen.getByAltText("泱宏公司 GRAND OCEAN LOGISTICS"),
    ).toBeInTheDocument();
  });
  it("忘記密碼需帳號且建立單一站內通知", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: "忘記密碼？" }));
    await userEvent.click(
      screen.getByRole("button", { name: "送出忘記密碼申請" }),
    );
    expect(screen.getByTestId("requests")).toBeEmptyDOMElement();
    await userEvent.type(screen.getByLabelText("帳號"), "DOL0001");
    await userEvent.click(
      screen.getByRole("button", { name: "送出忘記密碼申請" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "送出忘記密碼申請" }),
    );
    expect(screen.getByTestId("requests")).toHaveTextContent(/^DOL0001$/);
    expect(push).not.toHaveBeenCalled();
  });
});

function CloseAccount() {
  const { toggleSupplier } = useSuppliers();
  return (
    <button onClick={() => toggleSupplier("DOL0001")}>關閉測試帳號</button>
  );
}
it("關閉的预建帳號不可登入", async () => {
  render(
    <DemoProvider>
      <LoginScreen />
      <CloseAccount />
    </DemoProvider>,
  );
  await userEvent.click(screen.getByText("關閉測試帳號"));
  await userEvent.type(screen.getByLabelText("帳號"), "DOL0001");
  await userEvent.type(
    screen.getByLabelText("密碼", { exact: true }),
    "Demo1234!",
  );
  await userEvent.click(screen.getByRole("button", { name: "登入" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("已關閉");
  expect(push).not.toHaveBeenCalled();
});
