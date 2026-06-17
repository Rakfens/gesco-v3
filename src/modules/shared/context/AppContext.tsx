// src/modules/shared/context/AppContext.tsx
"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useAgents } from "../hooks/useAgents";
import { useAuth } from "../hooks/useAuth";
import { useAvances } from "../hooks/useAvances";
import { useCommission } from "../hooks/useCommission";
import { useLivraisons } from "../hooks/useLivraisons";
import { useRecuperations } from "../hooks/useRecuperations";
import { useToast } from "../hooks/useToast";
import type { Agent, Avance, Livraison, Recuperation } from "../types";
import { type Company, useCompany } from "./CompanyContext";

// ── Types ──────────────────────────────────────────────────────────────

type AgentCrud = {
  add: (nom: string, salaire: number) => Promise<Agent>;
  update: (id: string, updates: Partial<Agent>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

type LivraisonCrud = {
  add: (data: Partial<Livraison>) => Promise<Livraison>;
  update: (id: string, updates: Partial<Livraison>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

type AvanceCrud = {
  add: (data: Partial<Avance>) => Promise<Avance>;
  annuler: (id: string) => Promise<void>;
  delete: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

type RecuperationCrud = {
  add: (data: Partial<Recuperation>) => Promise<Recuperation>;
  update: (id: string, updates: Partial<Recuperation>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

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

  // Agents
  agents: Agent[];
  loadingAgents: boolean;
  agentCrud: AgentCrud;

  // Livraisons
  livraisons: Livraison[];
  loadingLivraisons: boolean;
  livraisonCrud: LivraisonCrud;

  // Avances
  avances: Avance[];
  loadingAvances: boolean;
  avanceCrud: AvanceCrud;

  // Recuperations
  recuperations: Recuperation[];
  loadingRecuperations: boolean;
  recuperationCrud: RecuperationCrud;

  // Commission gérant
  commissionGerant: number;
  commissionLoading: boolean;
  commissionError: string | null;
  updateCommission: (val: number) => Promise<void>;

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
  const { agents, loading: loadingAgents, addAgent, updateAgent, deleteAgent, reloadAgents } = useAgents();
  const { livraisons, loading: loadingLivraisons, addLivraison, updateLivraison, deleteLivraison, reloadLivraisons } = useLivraisons();
  const { avances, loading: loadingAvances, addAvance, annulerAvance, deleteAvance, reloadAvances } = useAvances();
  const { recuperations, loading: loadingRecuperations, addRecuperation, updateRecuperation, deleteRecuperation, reloadRecuperations } = useRecuperations();
  const { toasts, showToast, hideToast, clearAll, success, error, warn, info } = useToast();
  const { commissionGerant, loading: commissionLoading, error: commissionError, updateCommission } = useCommission();

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

        // Agents
        agents,
        loadingAgents,
        agentCrud: {
          add: addAgent,
          update: updateAgent,
          delete: deleteAgent,
          reload: reloadAgents,
        },

        // Livraisons
        livraisons,
        loadingLivraisons,
        livraisonCrud: {
          add: addLivraison,
          update: updateLivraison,
          delete: deleteLivraison,
          reload: reloadLivraisons,
        },

        // Avances
        avances,
        loadingAvances,
        avanceCrud: {
          add: addAvance,
          annuler: annulerAvance,
          delete: deleteAvance,
          reload: reloadAvances,
        },

        // Recuperations
        recuperations,
        loadingRecuperations,
        recuperationCrud: {
          add: addRecuperation,
          update: updateRecuperation,
          delete: deleteRecuperation,
          reload: reloadRecuperations,
        },

        // Commission
        commissionGerant,
        commissionLoading,
        commissionError,
        updateCommission,

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
        agents,
        loadingAgents,
        addAgent,
        updateAgent,
        deleteAgent,
        reloadAgents,
        livraisons,
        loadingLivraisons,
        addLivraison,
        updateLivraison,
        deleteLivraison,
        reloadLivraisons,
        avances,
        loadingAvances,
        addAvance,
        annulerAvance,
        deleteAvance,
        reloadAvances,
        recuperations,
        loadingRecuperations,
        addRecuperation,
        updateRecuperation,
        deleteRecuperation,
        reloadRecuperations,
        commissionGerant,
        commissionLoading,
        commissionError,
        updateCommission,
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
