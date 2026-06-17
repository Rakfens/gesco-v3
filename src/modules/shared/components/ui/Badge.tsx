// ui/Badge.tsx — Badge moderne (100% Tailwind pur)
import type { ReactNode } from "react";

type BadgeVariant = "default" | "primary" | "success" | "danger" | "warning" | "info" | "purple";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

const variantMap: Record<BadgeVariant, { container: string; dot: string }> = {
  default: {
    container: "bg-[#141418] text-[#a0a0b0] border-white/[0.03]",
    dot: "bg-[#6b6b7b]",
  },
  primary: {
    container: "bg-amber-400/10 text-amber-400 border-amber-400/15",
    dot: "bg-amber-400",
  },
  success: {
    container: "bg-emerald-400/10 text-emerald-400 border-emerald-400/15",
    dot: "bg-emerald-400",
  },
  danger: {
    container: "bg-red-400/10 text-red-400 border-red-400/15",
    dot: "bg-red-400",
  },
  warning: {
    container: "bg-yellow-400/10 text-yellow-400 border-yellow-400/15",
    dot: "bg-yellow-400",
  },
  info: {
    container: "bg-sky-300/10 text-sky-300 border-sky-300/15",
    dot: "bg-sky-300",
  },
  purple: {
    container: "bg-violet-500/10 text-violet-500 border-violet-500/15",
    dot: "bg-violet-500",
  },
};

const sizeMap = {
  sm: "px-2 py-[3px] text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
  dot = false,
  className = "",
}: BadgeProps) {
  const v = variantMap[variant];
  const s = sizeMap[size];
  return (
    <span
    className={`inline-flex items-center gap-1.5 rounded-full border font-semibold leading-none ${v.container} ${s} ${className}`}
    >
    {dot && (
      <span className={`h-[5px] w-[5px] shrink-0 rounded-full ${v.dot}`} />
    )}
    {children}
    </span>
  );
}

export type { BadgeVariant };
export default Badge;
