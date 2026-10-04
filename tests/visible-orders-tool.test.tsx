import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useVisibleOrdersTool } from "@/features/orders/use-visible-orders-tool";
import { mockOrders } from "@/data/mock-orders";
describe("可選 WebMCP 清單讀取介面（模擬 registry）", () => {
  it("只讀取傳入的可見資料，拒絕多餘參數且卸載時解除註冊", () => {
    const registerTool = vi.fn();
    Object.defineProperty(document, "modelContext", {
      value: { registerTool },
      configurable: true,
    });
    try {
      const { unmount } = renderHook(() =>
        useVisibleOrdersTool([mockOrders[0]]),
      );
      const [tool, options] = registerTool.mock.calls[0];
      expect(tool.name).toBe("inspect_visible_demo_orders");
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.execute({}).orders).toHaveLength(1);
      expect(() => tool.execute({ unexpected: true })).toThrow();
      unmount();
      expect(options.signal.aborted).toBe(true);
    } finally {
      Reflect.deleteProperty(document, "modelContext");
    }
  });
  it("不支援此 API 的瀏覽器亦能正常運作", () => {
    const { unmount } = renderHook(() => useVisibleOrdersTool(mockOrders));
    expect(unmount).not.toThrow();
  });
});
