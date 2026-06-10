import type React from "react";

interface StatCardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  sub?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  color?: string;
  loading?: boolean;
}

const colorMap: Record<string, { bg: string; text: string; gradient: string }> = {
  blue: { bg: "var(--blue-light)", text: "var(--blue)", gradient: "linear-gradient(135deg, #60a5fa, #3b82f6)" },
  green: { bg: "var(--success-light)", text: "var(--success)", gradient: "linear-gradient(135deg, #34d399, #10b981)" },
  red: { bg: "var(--danger-light)", text: "var(--danger)", gradient: "linear-gradient(135deg, #f87171, #ef4444)" },
  orange: { bg: "var(--warning-light)", text: "var(--warning)", gradient: "linear-gradient(135deg, #fbbf24, #f59e0b)" },
  purple: { bg: "var(--purple-light)", text: "var(--purple)", gradient: "linear-gradient(135deg, #a78bfa, #8b5cf6)" },
  cyan: { bg: "var(--cyan-light)", text: "var(--cyan)", gradient: "linear-gradient(135deg, #7dd3fc, #38bdf8)" },
  teal: { bg: "var(--teal-light)", text: "var(--teal)", gradient: "linear-gradient(135deg, #2dd4bf, #14b8a6)" },
  accent: { bg: "var(--accent-light)", text: "var(--accent)", gradient: "linear-gradient(135deg, #c9a96e, #a68b4b)" },
  success: { bg: "var(--success-light)", text: "var(--success)", gradient: "linear-gradient(135deg, #34d399, #10b981)" },
  warning: { bg: "var(--warning-light)", text: "var(--warning)", gradient: "linear-gradient(135deg, #fbbf24, #f59e0b)" },
  danger: { bg: "var(--danger-light)", text: "var(--danger)", gradient: "linear-gradient(135deg, #f87171, #ef4444)" },
  info: { bg: "var(--info-light)", text: "var(--info)", gradient: "linear-gradient(135deg, #7dd3fc, #38bdf8)" },
  accent2: { bg: "var(--accent2-light)", text: "var(--accent2)", gradient: "linear-gradient(135deg, #a78bfa, #8b5cf6)" },
};

function resolveColor(color: string) {
  if (colorMap[color]) return colorMap[color];
  // Fallback: treat as a CSS color value
  return { bg: `${color}18`, text: color, gradient: color };
}

export const StatCard: React.FC<StatCardProps> = ({
  title, label, value, subtitle, sub, icon, trend, color = "accent", loading = false,
}) => {
  const c = resolveColor(color);
  const subText = subtitle || sub;
  const displayTitle = title || label;

  if (loading) {
    return (
      <div style={{
        background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)",
        padding: 20, boxShadow: "var(--shadow-sm)",
      }}>
        <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 28, width: "40%", marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 10, width: "80%" }} />
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)",
        padding: 20, boxShadow: "var(--shadow-sm)", transition: "all var(--transition)",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
      }}
    >
      {/* Top gradient line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: c.gradient }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          {displayTitle}
        </span>
        {icon && (
          <div style={{
            width: 40, height: 40, borderRadius: "var(--radius-lg)",
            background: c.bg, color: c.text,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {icon}
          </div>
        )}
      </div>

      <div style={{
        fontSize: 28, fontWeight: 800, color: "var(--text)",
        letterSpacing: "-0.02em", lineHeight: 1.1,
      }}>
        {value}
      </div>

      {(subText || trend) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          {trend && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: trend.value >= 0 ? "var(--success)" : "var(--danger)",
              padding: "2px 8px", borderRadius: "var(--radius-full)",
              background: trend.value >= 0 ? "var(--success-light)" : "var(--danger-light)",
            }}>
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          )}
          {subText && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{subText}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
