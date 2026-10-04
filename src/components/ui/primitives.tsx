import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CircleHelp, PackageOpen } from "lucide-react";
import type { ReactNode } from "react";
import { statusLabels } from "@/config/prototype";
import type { OrderStatus } from "@/types/order";
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="text-muted mt-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      <span />
      {statusLabels[status]}
    </span>
  );
}
export function PendingNote({ children }: { children: ReactNode }) {
  return (
    <div className="pending-note">
      <CircleHelp size={18} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
export function EmptyState({
  title = "沒有符合條件的資料",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <PackageOpen size={34} aria-hidden="true" />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function BackLink({
  href,
  children = "返回訂單列表",
}: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <Link href={href} className="back-link">
      <ArrowLeft size={16} aria-hidden="true" />
      {children}
    </Link>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-link">
      {children}
      <ArrowUpRight size={16} aria-hidden="true" />
    </Link>
  );
}
