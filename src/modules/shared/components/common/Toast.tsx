// Toast.tsx — Professional toast notifications
import { type ReactNode, useEffect, useState } from "react";

interface ToastData {
  id?: string;
  msg: string;
  type?: "error" | "warn" | "success" | "info";
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onClose?: () => void;
  duration?: number;
}

const ToastIcon = ({ type }: { type?: string }): ReactNode => {
  const icons: Record<string, ReactNode> = {
    error: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    warn: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    success: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    info: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  };
  return icons[type || "success"] || icons.success;
};

export const Toast = ({ toast, onClose, duration = 3500 }: ToastProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast, duration, onClose]);

  if (!toast || !visible) return null;

  const getStyles = (): { bg: string; border: string; color: string; icon: string } => {
    switch (toast.type) {
      case "error":
        return { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", icon: "#dc2626" };
      case "warn":
        return { bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: "#d97706" };
      case "success":
        return { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", icon: "#16a34a" };
      case "info":
        return { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", icon: "#7c3aed" };
      default:
        return { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", icon: "#16a34a" };
    }
  };

  const styles = getStyles();

  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.color,
        boxShadow: "var(--shadow)",
        animation: "slideDown 0.25s ease",
        maxWidth: 420,
      }}
    >
      <span style={{ color: styles.icon, flexShrink: 0, display: "flex" }}>
        <ToastIcon type={toast.type || "success"} />
      </span>
      <span style={{ flex: 1 }}>{toast.msg}</span>
      <button
        onClick={() => {
          setVisible(false);
          if (onClose) onClose();
        }}
        style={{
          background: "none",
          border: "none",
          color: styles.color,
          cursor: "pointer",
          opacity: 0.5,
          padding: "2px",
          display: "flex",
          flexShrink: 0,
          fontSize: 14,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export const useToast = () => {
  const [toast, setToast] = useState<ToastData | null>(null);
  const showToast = (msg: string, type: "error" | "warn" | "success" | "info" = "success") =>
    setToast({ msg, type });
  const hideToast = () => setToast(null);
  return {
    toast,
    showToast,
    hideToast,
    success: (msg: string) => showToast(msg, "success"),
    error: (msg: string) => showToast(msg, "error"),
    warn: (msg: string) => showToast(msg, "warn"),
    info: (msg: string) => showToast(msg, "info"),
  };
};

interface ToastContainerProps {
  toasts: ToastData[];
  onClose?: (id?: string) => void;
}

export const ToastContainer = ({ toasts, onClose }: ToastContainerProps) => {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 64,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 420,
      }}
    >
      {toasts.map((t, i) => (
        <Toast
          key={t.id || i}
          toast={t}
          onClose={() => onClose?.(t.id)}
          duration={t.duration || 3500}
        />
      ))}
    </div>
  );
};
