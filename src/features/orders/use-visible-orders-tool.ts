"use client";
import { useEffect } from "react";
import { z } from "zod";
import type { Order } from "@/types/order";
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};
type ModelDocument = Document & {
  modelContext?: {
    registerTool: (
      tool: Tool,
      options: { signal: AbortSignal },
    ) => void | Promise<void>;
  };
};
// Optional browser capability: reads exactly the current, filtered demo list.
export function useVisibleOrdersTool(orders: Order[]) {
  useEffect(() => {
    const context = (document as ModelDocument).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "inspect_visible_demo_orders",
            description:
              "讀取目前列表篩選後的假訂單，不修改資料，不代表正式帳務或權限。",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input) {
              z.object({}).strict().parse(input);
              return {
                prototype: true,
                orders: orders.map(
                  ({ id, status, customerName, displayAmount }) => ({
                    id,
                    status,
                    customerName,
                    displayAmount,
                  }),
                ),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch((error: unknown) =>
        console.warn("Optional demo tool unavailable", error),
      );
    } catch (error) {
      console.warn("Optional demo tool unavailable", error);
    }
    return () => lifecycle.abort();
  }, [orders]);
}
