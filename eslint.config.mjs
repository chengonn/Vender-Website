import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "next-env.d.ts",
    "portfolio-demo/.next/**",
    "portfolio-demo/out/**",
    "portfolio-demo/next-env.d.ts",
  ]),
]);
