// ui/Card.tsx — Carte moderne avec ombres subtiles (100% Tailwind pur)
import type { MouseEventHandler, ReactNode } from "react";

/* ─── Card ─── */
interface CardProps {
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  hover?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
  xl: "p-7",
};

export function Card({
  children,
  padding = "md",
  className = "",
  hover = false,
  onClick,
}: CardProps) {
  const paddingClass =
  typeof padding === "string" ? paddingMap[padding] : "";
  const inlinePadding = typeof padding === "number" ? padding : undefined;

  return (
    <div
    onClick={onClick}
    style={inlinePadding !== undefined ? { padding: inlinePadding } : undefined}
    className={`rounded-2xl border border-white/[0.06] bg-[#121218] shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-200 ease-out ${
      hover
      ? "hover:border-white/[0.12] hover:shadow-[0_4px_16px_rgba(0,0,0,0.5)] cursor-pointer"
      : ""
    } ${onClick ? "cursor-pointer" : ""} ${paddingClass} ${className}`}
    >
    {children}
    </div>
  );
}

/* ─── SectionHeader ─── */
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <div
    className={`mb-5 flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
    <div>
    <h2 className="text-lg font-bold tracking-tight text-gray-100">
    {title}
    </h2>
    {subtitle && (
      <p className="mt-0.5 text-[13px] text-gray-500">{subtitle}</p>
    )}
    </div>
    {action}
    </div>
  );
}

/* ─── CardHeader ─── */
interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div
    className={`mb-3 flex items-center justify-between ${className}`}
    >
    {children}
    </div>
  );
}

/* ─── CardTitle ─── */
interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = "" }: CardTitleProps) {
  return (
    <h3
    className={`text-sm font-bold tracking-tight text-gray-100 ${className}`}
    >
    {children}
    </h3>
  );
}

/* ─── CardContent ─── */
interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

/* ─── CardFooter ─── */
interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div
    className={`mt-3 flex justify-end gap-2 border-t border-white/[0.06] pt-3 ${className}`}
    >
    {children}
    </div>
  );
}

export default Card;
