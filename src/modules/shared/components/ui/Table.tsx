// ui/Table.tsx — Tableau professionnel (100% Tailwind pur)
import type { ReactNode } from "react";

/* ─── Table wrapper ─── */
interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-white/[0.06] ${className}`}>
    <table className="w-full border-collapse">{children}</table>
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
    <tr className="bg-gray-950 text-[11px] uppercase tracking-wider text-gray-500">
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
}

export function TableHeader({
  children,
  align = "left",
  className = "",
}: TableHeaderProps) {
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <th className={`whitespace-nowrap px-3.5 py-2.5 font-semibold ${alignClass} ${className}`}>
    {children}
    </th>
  );
}

/* ─── Body ─── */
interface TableBodyProps {
  children: ReactNode;
  className?: string; // ← AJOUTÉ
}

export function TableBody({ children, className = "" }: TableBodyProps) {
  return <tbody className={className}>{children}</tbody>; // ← UTILISÉ
}

/* ─── Row ─── */
interface TableRowProps {
  children: ReactNode;
  className?: string;
}

export function TableRow({ children, className = "" }: TableRowProps) {
  return (
    <tr className={`border-b border-white/[0.06] transition-colors duration-100 hover:bg-white/[0.02] ${className}`}>
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
}

export function TableCell({
  children,
  align = "left",
  colSpan,
  className = "",
}: TableCellProps) {
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <td
    colSpan={colSpan}
    className={`px-3.5 py-2.5 text-[13px] ${alignClass} ${className}`}
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
    className="px-3.5 py-10 text-center text-[13px] text-gray-500"
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
    <tr className="border-t-2 border-white/[0.08] bg-gray-950">
    {children}
    </tr>
    </tfoot>
  );
}
