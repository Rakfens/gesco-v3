// Toast.tsx — Professional toast notifications (dark theme, 100% Tailwind pur)
import { type ReactNode, useCallback, useEffect, useState } from "react";

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

const variantMap: Record<string, { container: string; icon: string }> = {
  error: {
    container: "bg-red-500/10 border-red-500/20 text-red-400",
    icon: "text-red-400",
  },
  warn: {
    container: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    icon: "text-amber-400",
  },
  success: {
    container: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    icon: "text-emerald-400",
  },
  info: {
    container: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    icon: "text-blue-400",
  },
};

function ToastIcon({ type }: { type?: string }) {
  const className = "h-4 w-4";
  switch (type) {
    case "error":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case "warn":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "info":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
    case "success":
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
  }
}

export function Toast({ toast, onClose, duration = 3500 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast, duration, onClose]);

  if (!toast || !visible) return null;

  const variant = variantMap[toast.type || "success"];

  return (
    <div
    className={`flex max-w-[420px] items-center gap-2.5 rounded-[10px] border px-4 py-3 text-[13px] font-medium shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-fade-up ${variant.container}`}
    >
    <span className={`flex shrink-0 ${variant.icon}`}>
    <ToastIcon type={toast.type || "success"} />
    </span>
    <span className="flex-1">{toast.msg}</span>
    <button
    type="button"
    onClick={() => {
      setVisible(false);
      onClose?.();
    }}
    className={`flex shrink-0 p-0.5 opacity-50 transition-opacity hover:opacity-100 ${variant.icon}`}
    >
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
    </button>
    </div>
  );
}

/* ─── Hook (retourne un tableau pour AppContext) ─── */
let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback(
    (msg: string, type: "error" | "warn" | "success" | "info" = "success", duration?: number): number => {
      const id = String(++toastIdCounter);
      setToasts((prev) => [...prev, { id, msg, type, duration }]);
      return toastIdCounter;
    },
    [],
  );

  const hideToast = useCallback((id?: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => setToasts([]), []);

  return {
    toasts,
    toast: toasts[0] || null,
    showToast,
    hideToast,
    clearAll,
    success: (msg: string) => showToast(msg, "success"),
    error: (msg: string) => showToast(msg, "error"),
    warn: (msg: string) => showToast(msg, "warn"),
    info: (msg: string) => showToast(msg, "info"),
  };
}

interface ToastContainerProps {
  toasts: ToastData[];
  onClose?: (id?: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-16 z-[9999] flex max-w-[420px] flex-col gap-2">
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
}

export default Toast;
