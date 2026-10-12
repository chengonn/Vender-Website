import type { NextConfig } from "next";
const basePath = process.env.PAGES_BASE_PATH || "";
if (basePath && !/^\/[a-zA-Z0-9._-]+$/.test(basePath)) {
  throw new Error("PAGES_BASE_PATH must be empty or /repository-name");
}
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  poweredByHeader: false,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};
export default config;
