// ui/StatCard.tsx — Carte de statistique moderne
import type React from "react";

interface StatCardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  sub?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  color?: "blue" | "green" | "red" | "orange" | "purple" | "cyan" | "teal" | string;
  loading?: boolean;
}

const colorMap = {
  blue: {
    bg: "var(--accent-light)",
    text: "var(--accent)",
    gradient: "linear-gradient(135deg, #c9a9f6, #7c3aed)",
  },
  green: {
    bg: "var(--success-light)",
    text: "var(--success)",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
  },
  red: {
    bg: "var(--danger-light)",
    text: "var(--danger)",
    gradient: "linear-gradient(135deg, #ef4444, #dc2626)",
  },
  orange: {
    bg: "var(--warning-light)",
    text: "var(--warning)",
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
  },
  purple: {
    bg: "var(--purple-light)",
    text: "var(--purple)",
    gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
  },
  cyan: {
    bg: "var(--info-light)",
    text: "var(--info)",
    gradient: "linear-gradient(135deg, #06b6d4, #0891b2)",
  },
  teal: {
    bg: "var(--info-light)",
    text: "#0d9488",
    gradient: "linear-gradient(135deg, #14b8a6, #0d9488)",
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  label,
  value,
  subtitle,
  sub,
  icon,
  trend,
  color = "blue",
  loading = false,
}) => {
  const c = colorMap[color as keyof typeof colorMap] || colorMap.blue;
  const subText = subtitle || sub;
  const displayTitle = title || label;

  if (loading) {
    return (
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 20,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 28, width: "40%", marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 10, width: "80%" }} />
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
        boxShadow: "var(--shadow-sm)",
        transition: "all var(--transition)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* Accent line at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: c.gradient,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {displayTitle}
        </span>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: c.bg,
              color: c.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: "var(--text)",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>

      {(subtitle || trend) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          {trend && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: trend.value >= 0 ? "var(--success)" : "var(--danger)",
                padding: "1px 6px",
                borderRadius: "var(--radius-full)",
                background: trend.value >= 0 ? "var(--success-light)" : "var(--danger-light)",
              }}
            >
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
