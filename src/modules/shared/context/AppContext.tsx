// src/modules/shared/context/AppContext.tsx
"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import type { Company } from "./CompanyContext";
import { useCompany } from "./CompanyContext";

// ── Types ──────────────────────────────────────────────────────────────

interface AppContextValue {
  // Auth
  user: ReturnType<typeof useAuth>["user"];
  authLoading: boolean;
  companyLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  isAuthenticated: boolean;

  // Company
  currentCompany: Company | null;
  companies: Company[];
  switchCompany: (company: Company) => void;

  // Toast
  toasts: ReturnType<typeof useToast>["toasts"];
  showToast: ReturnType<typeof useToast>["showToast"];
  hideToast: ReturnType<typeof useToast>["hideToast"];
  clearAll: ReturnType<typeof useToast>["clearAll"];
  success: ReturnType<typeof useToast>["success"];
  error: ReturnType<typeof useToast>["error"];
  warn: ReturnType<typeof useToast>["warn"];
  info: ReturnType<typeof useToast>["info"];
}

// ── Context ────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);
AppContext.displayName = "AppContext";

// ── Provider ───────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, login, logout, authError, isAuthenticated } = useAuth();
  const { currentCompany, companies, loading: companyLoading, switchCompany } = useCompany();
  const { toasts, showToast, hideToast, clearAll, success, error, warn, info } = useToast();

  const value = useMemo<AppContextValue>(
    () => ({
      // Auth
      user,
      authLoading,
      companyLoading,
      login,
      logout,
      authError,
      isAuthenticated,

      // Company
      currentCompany,
      companies,
      switchCompany,

      // Toast
      toasts,
      showToast,
      hideToast,
      clearAll,
      success,
      error,
      warn,
      info,
    }),
    [
      user,
      authLoading,
      companyLoading,
      login,
      logout,
      authError,
      isAuthenticated,
      currentCompany,
      companies,
      switchCompany,
      toasts,
      showToast,
      hideToast,
      clearAll,
      success,
      error,
      warn,
      info,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp doit être utilisé dans un AppProvider");
  return ctx;
}
