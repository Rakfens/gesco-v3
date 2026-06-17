// src/modules/shared/hooks/useAgents.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent } from "@/modules/shared/types";
import {
  addAgent as addAgentService,
  deleteAgent as deleteAgentService,
  fetchAgents,
  updateAgent as updateAgentService,
} from "@/modules/livraison/services/agentService";
import { useCompany } from "@/modules/shared/context/CompanyContext";

interface UseAgentsReturn {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  addAgent: (nom: string, salaire: number) => Promise<Agent>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  reloadAgents: () => Promise<void>;
}

export function useAgents(): UseAgentsReturn {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentCompany } = useCompany();

  const mounted = useRef(true);

  const loadAgents = useCallback(async () => {
    if (!currentCompany?.id) {
      setAgents([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const data = await fetchAgents(currentCompany.id);
      if (mounted.current) setAgents(data);
    } catch (err: unknown) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Erreur lors du chargement des agents");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [currentCompany?.id]);

  // Load initial + cleanup
  useEffect(() => {
    mounted.current = true;
    loadAgents();
    return () => {
      mounted.current = false;
    };
  }, [loadAgents]);

  // Realtime sync
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.table === "agents") {
        loadAgents();
      }
    };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, [loadAgents]);

  const handleAddAgent = useCallback(
    async (nom: string, salaire: number) => {
      if (!currentCompany?.id) {
        const msg = "Société non sélectionnée";
        setError(msg);
        throw new Error(msg);
      }

      try {
        setError(null);
        const a = await addAgentService(nom, salaire, currentCompany.id);
        setAgents((prev) => [...prev, a]);
        return a;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de l'ajout";
        setError(msg);
        throw err;
      }
    },
    [currentCompany?.id]
  );

  const handleUpdateAgent = useCallback(
    async (id: string, updates: Partial<Agent>) => {
      if (!currentCompany?.id) {
        const msg = "Société non sélectionnée";
        setError(msg);
        throw new Error(msg);
      }

      try {
        setError(null);
        await updateAgentService(id, updates, currentCompany.id);
        setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de la mise à jour";
        setError(msg);
        throw err;
      }
    },
    [currentCompany?.id]
  );

  const handleDeleteAgent = useCallback(
    async (id: string) => {
      if (!currentCompany?.id) {
        const msg = "Société non sélectionnée";
        setError(msg);
        throw new Error(msg);
      }

      try {
        setError(null);
        await deleteAgentService(id, currentCompany.id);
        setAgents((prev) => prev.filter((a) => a.id !== id));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de la suppression";
        setError(msg);
        throw err;
      }
    },
    [currentCompany?.id]
  );

  return {
    agents,
    loading,
    error,
    addAgent: handleAddAgent,
    updateAgent: handleUpdateAgent,
    deleteAgent: handleDeleteAgent,
    reloadAgents: loadAgents,
  };
}
