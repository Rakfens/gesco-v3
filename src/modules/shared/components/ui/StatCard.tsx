// ui/StatCard.tsx — 100% Tailwind pur
import type { ReactNode } from "react";

interface StatCardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  sub?: string;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  color?: string;
  loading?: boolean;
  className?: string; // ← AJOUTÉ
}

const colorClassesMap: Record<string, {
  iconBg: string;
  iconText: string;
  gradient: string;
}> = {
  blue:     { iconBg: "bg-blue-500/10",     iconText: "text-blue-400",     gradient: "bg-gradient-to-r from-blue-400 to-blue-600" },
  green:    { iconBg: "bg-emerald-500/10",  iconText: "text-emerald-400",  gradient: "bg-gradient-to-r from-emerald-400 to-emerald-600" },
  red:      { iconBg: "bg-red-500/10",      iconText: "text-red-400",      gradient: "bg-gradient-to-r from-red-400 to-red-600" },
  orange:   { iconBg: "bg-amber-500/10",    iconText: "text-amber-400",    gradient: "bg-gradient-to-r from-amber-400 to-amber-600" },
  purple:   { iconBg: "bg-violet-500/10",   iconText: "text-violet-400",   gradient: "bg-gradient-to-r from-violet-400 to-violet-600" },
  cyan:     { iconBg: "bg-sky-500/10",      iconText: "text-sky-400",      gradient: "bg-gradient-to-r from-sky-400 to-sky-500" },
  teal:     { iconBg: "bg-teal-500/10",     iconText: "text-teal-400",     gradient: "bg-gradient-to-r from-teal-400 to-teal-600" },
  accent:   { iconBg: "bg-amber-400/10",    iconText: "text-amber-400",    gradient: "bg-gradient-to-r from-amber-400 to-amber-600" },
  success:  { iconBg: "bg-emerald-500/10",  iconText: "text-emerald-400",  gradient: "bg-gradient-to-r from-emerald-400 to-emerald-600" },
  warning:  { iconBg: "bg-amber-500/10",    iconText: "text-amber-400",    gradient: "bg-gradient-to-r from-amber-400 to-amber-600" },
  danger:   { iconBg: "bg-red-500/10",      iconText: "text-red-400",      gradient: "bg-gradient-to-r from-red-400 to-red-600" },
  info:     { iconBg: "bg-sky-500/10",      iconText: "text-sky-400",      gradient: "bg-gradient-to-r from-sky-400 to-sky-500" },
  accent2:  { iconBg: "bg-violet-500/10",   iconText: "text-violet-400",   gradient: "bg-gradient-to-r from-violet-400 to-violet-600" },
};

function resolveColorClasses(color: string) {
  return colorClassesMap[color] || {
    iconBg: "bg-white/5",
    iconText: "text-gray-400",
    gradient: "bg-gradient-to-r from-gray-400 to-gray-600",
  };
}

export function StatCard({
  title,
  label,
  value,
  subtitle,
  sub,
  icon,
  trend,
  color = "accent",
  loading = false,
  className = "", // ← AJOUTÉ
}: StatCardProps) {
  const c = resolveColorClasses(color);
  const subText = subtitle || sub;
  const displayTitle = title || label;

  if (loading) {
    return (
      <div className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#121218] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.4)] ${className}`}>
      <div className="skeleton mb-3 h-3 w-3/5" />
      <div className="skeleton mb-2 h-7 w-2/5" />
      <div className="skeleton h-2.5 w-4/5" />
      </div>
    );
  }

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#121218] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.12] hover:shadow-[0_4px_16px_rgba(0,0,0,0.5)] ${className}`}>
    {/* Top gradient line */}
    <div className={`absolute left-0 right-0 top-0 h-[3px] ${c.gradient}`} />
    <div className="mb-3.5 flex items-start justify-between">
    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
    {displayTitle}
    </span>
    {icon && (
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg} ${c.iconText}`}>
      {icon}
      </div>
    )}
    </div>
    <div className="text-[28px] font-extrabold leading-tight tracking-tight text-gray-100">
    {value}
    </div>
    {(subText || trend) && (
      <div className="mt-2 flex items-center gap-1.5">
      {trend && (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${trend.value >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
        {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
        </span>
      )}
      {subText && <span className="text-xs text-gray-500">{subText}</span>}
      </div>
    )}
    </div>
  );
}

export default StatCard;
