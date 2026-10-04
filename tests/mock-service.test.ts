import { describe, it, expect } from "vitest";
import { blankOrder, mockOrders } from "@/data/mock-orders";
import {
  saveDemoDraft,
  submitDemoOrder,
  requestDemoChange,
} from "@/services/mock-order-service";
describe("Mock service 資料一致性", () => {
  it("不覆寫已鎖定原單，不接受重複送出", () => {
    expect(() => saveDemoDraft(mockOrders, blankOrder, [], "DEMO-002")).toThrow(
      "已鎖定",
    );
    expect(() => submitDemoOrder(mockOrders[1])).toThrow("僅草稿");
  });
  it("不接受不存在的草稿 id，也不修改來源 fixtures", () => {
    expect(() => saveDemoDraft(mockOrders, blankOrder, [], "missing")).toThrow(
      "找不到",
    );
    const result = saveDemoDraft(mockOrders, blankOrder, []);
    expect(result.orders.length).toBe(7);
    expect(mockOrders.length).toBe(6);
  });
  it("申請原因空白或已開票時拒絕", () => {
    expect(() =>
      requestDemoChange(
        { ...mockOrders[1], submittedAt: new Date().toISOString() },
        "  ",
      ),
    ).toThrow("修改原因");
    expect(() => requestDemoChange(mockOrders[5], "更正")).toThrow("不提供");
  });
  it("送出保留原 id 及草稿紀錄", () => {
    const submitted = submitDemoOrder(mockOrders[0]);
    expect(submitted.id).toBe(mockOrders[0].id);
    expect(submitted.version).toBe(1);
    expect(submitted.history[0]).toBe("建立示範草稿");
    expect(mockOrders[0].status).toBe("DRAFT");
  });
});
it("修改申請 24 小時邊界與缺失時間", () => {
  const start = Date.parse("2026-09-07T00:00:00Z");
  const order = {
    ...mockOrders[1],
    submittedAt: new Date(start).toISOString(),
  };
  expect(requestDemoChange(order, "更正", start + 86400000 - 1).status).toBe(
    "UNLOCK_REQUESTED",
  );
  expect(() => requestDemoChange(order, "更正", start + 86400000)).toThrow(
    "24 小時",
  );
  expect(() => requestDemoChange(order, "更正", start - 1)).toThrow("24 小時");
  expect(() =>
    requestDemoChange({ ...order, submittedAt: undefined }, "更正", start),
  ).toThrow("24 小時");
});
