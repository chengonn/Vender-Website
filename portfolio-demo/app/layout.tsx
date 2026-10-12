import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "星航供應商平台｜互動作品展示",
  description:
    "使用虛構品牌與假資料，體驗供應商送單、GSD 審核、Accounting 對帳及月結流程。",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
