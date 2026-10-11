"use client";
import Link from "next/link";
import Image from "next/image";
import { brand } from "@/config/brand";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Files,
  ClipboardCheck,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  ChevronsUpDown,
  FlaskConical,
  ArrowUpRight,
} from "lucide-react";
import { useDemo } from "@/context/demo-context";
import { prototype } from "@/config/prototype";
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, error, reset } = useDemo();
  // Route determines the visible demo workspace, including direct links and refreshes.
  const role = user?.role || "SUPPLIER_USER";
  const [menuOpen, setMenuOpen] = useState(false);
  const links =
    role === "ADMIN"
      ? [
          { href: "/admin/orders", label: "帳單查詢", icon: ClipboardCheck },
          { href: "/admin/suppliers", label: "供應商管理／建檔", icon: Files },
        ]
      : role === "GSD"
        ? [
            {
              href: "/admin/orders",
              label: "供應商文件審核",
              icon: ClipboardCheck,
            },
            { href: "/accounting", label: "對帳與月結查詢", icon: Files },
          ]
        : role === "ACCOUNTING"
          ? [
              {
                href: "/accounting",
                label: "對帳與結帳",
                icon: ClipboardCheck,
              },
              { href: "/admin/orders", label: "帳單文件查詢", icon: Files },
            ]
          : [
              { href: "/dashboard", label: "工作總覽", icon: LayoutDashboard },
              { href: "/orders", label: "我的訂單", icon: Files },
              {
                href: "/accounting",
                label: "對帳與月結查詢",
                icon: ClipboardCheck,
              },
            ];
  if (loading) return <main className="login-page">連線資料庫中…</main>;
  if (!user)
    return (
      <main className="login-page">
        <p>{error || "請先登入"}</p>
        <Link className="button" href="/login">
          前往登入
        </Link>
      </main>
    );
  if (
    (pathname.startsWith("/admin/suppliers") && role !== "ADMIN") ||
    (pathname.startsWith("/admin/orders") && role === "SUPPLIER_USER")
  )
    return (
      <main className="login-page">
        <p>此頁需要 Admin 權限</p>
        <Link href="/dashboard">返回工作總覽</Link>
      </main>
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳至主要內容
      </a>
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <Link
          href={
            role === "ADMIN"
              ? "/admin/suppliers"
              : role === "GSD"
                ? "/admin/orders"
                : role === "ACCOUNTING"
                  ? "/accounting"
                  : "/dashboard"
          }
          className="brand"
        >
          <span className="brand-mark">
            <Image src={brand.logo} alt="" width={38} height={38} unoptimized />
          </span>
          <span>
            {brand.shortName}
            <span className="brand-sub">{brand.portalName}</span>
          </span>
        </Link>
        <div className="workspace-label">WORKSPACE</div>
        <div className="company-card">
          <span className="company-avatar">D</span>
          <div>
            <strong>
              {role !== "SUPPLIER_USER"
                ? role + " 工作台"
                : user.companyId || prototype.company}
            </strong>
            <small>DEMO WORKSPACE</small>
          </div>
          <ChevronsUpDown size={16} />
        </div>
        <div className="workspace-label">
          {role !== "SUPPLIER_USER" ? role + " 工作台" : "供應商工作台"}
        </div>
        <nav aria-label="主要導覽">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              aria-current={
                pathname === href || pathname.startsWith(href + "/")
                  ? "page"
                  : undefined
              }
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="prototype-card">
            <FlaskConical size={20} />
            <strong>一起確認下一步</strong>
            <p>先體驗頁面流程，再逐項確認業務規則。</p>
            <span>PHASE 01 · PROTOTYPE</span>
          </div>
          <button
            className="logout"
            onClick={async () => {
              await reset();
              router.push("/login");
            }}
          >
            <LogOut size={18} />
            登出
          </button>
        </div>
      </aside>
      {menuOpen && (
        <button
          aria-label="關閉導覽遮罩"
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button
              className="icon-button mobile-menu"
              aria-label="切換導覽"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <PanelLeftClose size={20} />
              ) : (
                <PanelLeftOpen size={20} />
              )}
            </button>
            <span className="text-muted">工作空間</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{role !== "SUPPLIER_USER" ? role : "供應商端"}</strong>
          </div>
          <div className="flex items-center gap-3">
            <span className="demo-pill">
              <span />
              示範模式
            </span>
            <span>{user?.username}</span>
            <div className="avatar" aria-hidden="true">
              D
            </div>
          </div>
        </header>
        <div className="prototype-banner">
          <FlaskConical size={15} aria-hidden="true" />
          {prototype.notice}
          <span className="ml-auto hidden sm:inline">
            前端流程展示 <ArrowUpRight size={13} className="inline" />
          </span>
        </div>
        <main id="main-content" className="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>{brand.name} · 虛構品牌 Demo</span>
          <span>初始模板 · 不提供正式帳務作業</span>
        </footer>
      </div>
    </div>
  );
}
