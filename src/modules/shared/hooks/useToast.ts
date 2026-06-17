// src/modules/shared/hooks/useToast.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Types ─── */
export type ToastType = "success" | "error" | "warn" | "info";

interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

interface UseToastReturn {
  toasts: Toast[];
  showToast: (msg: string, type?: ToastType, duration?: number) => number;
  hideToast: (id: number) => void;
  clearAll: () => void;
  success: (msg: string) => number;
  error: (msg: string) => number;
  warn: (msg: string) => number;
  info: (msg: string) => number;
}

/* ─── ID generator (module-level, pas global) ─── */
let toastId = 0;

/* ─── Hook ─── */
export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Cleanup tous les timeouts au unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current.clear();
    };
  }, []);

  const showToast = useCallback(
    (msg: string, type: ToastType = "success", duration = 3000) => {
      const id = ++toastId;
      const newToast: Toast = { id, msg, type };

      setToasts((prev) => {
        // Limiter à 5 toasts simultanés
        const next = [...prev, newToast];
        if (next.length > 5) {
          const removed = next.shift();
          if (removed) {
            // Nettoyer le timeout du toast supprimé
            // (on ne peut pas le retrouver facilement, mais il expirera tout seul)
          }
        }
        return next;
      });

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timeoutsRef.current.delete(timer);
      }, duration);

      timeoutsRef.current.add(timer);
      return id;
    },
    []
  );

  const hideToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.clear();
    setToasts([]);
  }, []);

  const success = useCallback((msg: string) => showToast(msg, "success"), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, "error"), [showToast]);
  const warn = useCallback((msg: string) => showToast(msg, "warn"), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, "info"), [showToast]);

  return {
    toasts,
    showToast,
    hideToast,
    clearAll,
    success,
    error,
    warn,
    info,
  };
}
