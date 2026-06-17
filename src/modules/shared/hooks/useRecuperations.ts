// src/modules/shared/hooks/useRecuperations.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Recuperation } from "@/modules/shared/types";
import {
  addRecuperation as addRecuperationService,
  deleteRecuperation as deleteRecuperationService,
  fetchRecuperations,
  updateRecuperation as updateRecuperationService,
} from "@/modules/livraison/services/recuperationService";
import { useCompany } from "@/modules/shared/context/CompanyContext";

interface UseRecuperationsReturn {
  recuperations: Recuperation[];
  loading: boolean;
  error: string | null;
  addRecuperation: (rec: Partial<Recuperation>) => Promise<Recuperation>;
  updateRecuperation: (id: string, updates: Partial<Recuperation>) => Promise<void>;
  deleteRecuperation: (id: string) => Promise<void>;
  reloadRecuperations: () => Promise<void>;
}

export function useRecuperations(): UseRecuperationsReturn {
  const [recuperations, setRecuperations] = useState<Recuperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentCompany } = useCompany();

  const mounted = useRef(true);

  const loadRecuperations = useCallback(async () => {
    if (!currentCompany?.id) {
      setRecuperations([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const data = await fetchRecuperations(currentCompany.id);
      if (mounted.current) setRecuperations(data);
    } catch (err: unknown) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Erreur lors du chargement des récupérations");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [currentCompany?.id]);

  // Load initial + cleanup
  useEffect(() => {
    mounted.current = true;
    loadRecuperations();
    return () => {
      mounted.current = false;
    };
  }, [loadRecuperations]);

  // Realtime sync
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.table === "recuperations") {
        loadRecuperations();
      }
    };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, [loadRecuperations]);

  const handleAddRecuperation = useCallback(
    async (rec: Partial<Recuperation>) => {
      if (!currentCompany?.id) {
        const msg = "Société non sélectionnée";
        setError(msg);
        throw new Error(msg);
      }

      try {
        setError(null);
        const newRec = await addRecuperationService(rec, currentCompany.id);
        setRecuperations((prev) => [newRec, ...prev]);
        return newRec;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de l'ajout";
        setError(msg);
        throw err;
      }
    },
    [currentCompany?.id]
  );

  const handleUpdateRecuperation = useCallback(
    async (id: string, updates: Partial<Recuperation>) => {
      if (!currentCompany?.id) {
        const msg = "Société non sélectionnée";
        setError(msg);
        throw new Error(msg);
      }

      try {
        setError(null);
        await updateRecuperationService(id, updates, currentCompany.id);
        setRecuperations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } as Recuperation : r))
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de la mise à jour";
        setError(msg);
        throw err;
      }
    },
    [currentCompany?.id]
  );

  const handleDeleteRecuperation = useCallback(
    async (id: string) => {
      if (!currentCompany?.id) {
        const msg = "Société non sélectionnée";
        setError(msg);
        throw new Error(msg);
      }

      try {
        setError(null);
        await deleteRecuperationService(id, currentCompany.id);
        setRecuperations((prev) => prev.filter((r) => r.id !== id));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de la suppression";
        setError(msg);
        throw err;
      }
    },
    [currentCompany?.id]
  );

  return {
    recuperations,
    loading,
    error,
    addRecuperation: handleAddRecuperation,
    updateRecuperation: handleUpdateRecuperation,
    deleteRecuperation: handleDeleteRecuperation,
    reloadRecuperations: loadRecuperations,
  };
}
