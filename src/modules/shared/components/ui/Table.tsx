// src/modules/shared/components/ui/Table.tsx
import type { ReactNode } from "react";

/* ─── Table wrapper ─── */
interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-[var(--border-subtle)] ${className}`}>
    <table className="w-full border-collapse table-fixed">{children}</table>
    </div>
  );
}

/* ─── Head ─── */
interface TableHeadProps {
  children: ReactNode;
  className?: string;
}

export function TableHead({ children, className = "" }: TableHeadProps) {
  return (
    <thead className={className}>
    <tr className="bg-[var(--bg-secondary)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
    {children}
    </tr>
    </thead>
  );
}

/* ─── Header cell ─── */
interface TableHeaderProps {
  children: ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  colClassName?: string;
}

export function TableHeader({
  children,
  align = "left",
  className = "",
  colClassName = "",
}: TableHeaderProps) {
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <th className={`whitespace-nowrap overflow-hidden text-ellipsis px-3.5 py-2.5 font-semibold ${alignClass} ${colClassName} ${className}`}>
    {children}
    </th>
  );
}

/* ─── Body ─── */
interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

export function TableBody({ children, className = "" }: TableBodyProps) {
  return <tbody className={className}>{children}</tbody>;
}

/* ─── Row ─── */
interface TableRowProps {
  children: ReactNode;
  className?: string;
}

export function TableRow({ children, className = "" }: TableRowProps) {
  return (
    <tr className={`border-b border-[var(--border-default)] transition-colors duration-150 hover:bg-[var(--bg-card-hover)] ${className}`}>
    {children}
    </tr>
  );
}

/* ─── Cell ─── */
interface TableCellProps {
  children: ReactNode;
  align?: "left" | "center" | "right";
  colSpan?: number;
  className?: string;
  colClassName?: string;
}

export function TableCell({
  children,
  align = "left",
  colSpan,
  className = "",
  colClassName = "",
}: TableCellProps) {
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <td
    colSpan={colSpan}
    className={`overflow-hidden text-ellipsis px-3.5 py-2.5 text-[13px] text-[var(--text-primary)] ${alignClass} ${colClassName} ${className}`}
    >
    {children}
    </td>
  );
}

/* ─── Empty state ─── */
interface TableEmptyProps {
  colSpan?: number;
  message?: string;
}

export function TableEmpty({ colSpan = 6, message = "Aucune donnée" }: TableEmptyProps) {
  return (
    <tr>
    <td
    colSpan={colSpan}
    className="px-3.5 py-10 text-center text-[13px] text-[var(--text-muted)]"
    >
    {message}
    </td>
    </tr>
  );
}

/* ─── Footer ─── */
interface TableFooterProps {
  children: ReactNode;
  className?: string;
}

export function TableFooter({ children, className = "" }: TableFooterProps) {
  return (
    <tfoot className={className}>
    <tr className="border-t-2 border-[var(--border-active)] bg-[var(--bg-secondary)]">
    {children}
    </tr>
    </tfoot>
  );
}
