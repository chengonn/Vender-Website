import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: [
      "tests/api-ui.test.tsx",
      "tests/accounting-ui.test.tsx",
      "tests/mock-service.test.ts",
      "tests/supplier-model.test.ts",
    ],
    environment: "jsdom",
    setupFiles: ["./tests/setup.tsx"],
    globals: true,
    css: false,
  },
});
