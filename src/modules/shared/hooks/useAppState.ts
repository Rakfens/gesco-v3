// src/modules/shared/hooks/useAppState.ts
"use client";

// useAppState.ts — persiste page ET société active dans sessionStorage
// sessionStorage survit à la réduction iOS Safari (contrairement à la mémoire React)

const PAGE_KEY = "ht_page";
const COMPANY_KEY = "ht_company_id";

/* ─── Save ─── */
export function saveAppState(page: string, companyId: string): void {
  try {
    if (page?.trim()) sessionStorage.setItem(PAGE_KEY, page.trim());
    if (companyId?.trim()) sessionStorage.setItem(COMPANY_KEY, companyId.trim());
  } catch {
    // sessionStorage indisponible (mode privé, quota dépassé, etc.)
  }
}

/* ─── Load ─── */
export function loadSavedPage(): string {
  try {
    return sessionStorage.getItem(PAGE_KEY)?.trim() || "dashboard";
  } catch {
    return "dashboard";
  }
}

export function loadSavedCompanyId(): string | null {
  try {
    const id = sessionStorage.getItem(COMPANY_KEY)?.trim();
    return id || null;
  } catch {
    return null;
  }
}

/* ─── Clear ─── */
export function clearAppState(): void {
  try {
    sessionStorage.removeItem(PAGE_KEY);
    sessionStorage.removeItem(COMPANY_KEY);
  } catch {
    // Ignorer silencieusement
  }
}

/* ─── Hook React (optionnel) ─── */
import { useState, useEffect, useCallback } from "react";

interface AppState {
  page: string;
  companyId: string | null;
}

export function useAppState(): {
  state: AppState;
  saveState: (page: string, companyId: string) => void;
  clearState: () => void;
} {
  const [state, setState] = useState<AppState>(() => ({
    page: loadSavedPage(),
                                                       companyId: loadSavedCompanyId(),
  }));

  const saveState = useCallback((page: string, companyId: string) => {
    saveAppState(page, companyId);
    setState({ page, companyId });
  }, []);

  const clearState = useCallback(() => {
    clearAppState();
    setState({ page: "dashboard", companyId: null });
  }, []);

  // Sync cross-tab (optionnel)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === PAGE_KEY) {
        setState((prev) => ({ ...prev, page: e.newValue || "dashboard" }));
      }
      if (e.key === COMPANY_KEY) {
        setState((prev) => ({ ...prev, companyId: e.newValue || null }));
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { state, saveState, clearState };
}
