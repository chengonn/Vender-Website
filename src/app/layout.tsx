import type { Metadata } from "next";
import { DemoProvider } from "@/context/demo-context";
import "@/styles/globals.css";
export const metadata: Metadata = {
  title: { default: "Vendor Portal｜前端原型", template: "%s｜Vendor Portal" },
  description: "供應商訂單與對帳 Phase 1 假資料原型",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
