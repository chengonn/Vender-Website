import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { DemoProvider } from "@/context/demo-context";
import "@/styles/globals.css";
export const metadata: Metadata = {
  title: {
    default: `${brand.portalName}｜Demo`,
    template: `%s｜${brand.portalName}`,
  },
  description:
    "星航示範物流：供應商訂單、審核與對帳的面試展示專案，使用虛構品牌與假資料。",
  icons: { icon: brand.logo },
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
