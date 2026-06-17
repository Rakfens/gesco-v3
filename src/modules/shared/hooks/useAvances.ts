// src/modules/shared/hooks/useAvances.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Avance } from "@/modules/shared/types";
import {
  addAvance as addAvanceService,
  annulerAvance as annulerAvanceService,
  deleteAvance as deleteAvanceService,
  fetchAvances,
} from "@/modules/livraison/services/avanceService";
import { useCompany } from "@/modules/shared/context/CompanyContext";

interface UseAvancesReturn {
  avances: Avance[];
  loading: boolean;
  error: string | null;
  addAvance: (avance: Partial<Avance>) => Promise<Avance>;
  annulerAvance: (id: string) => Promise<void>;
  deleteAvance: (id: string) => Promise<void>;
  reloadAvances: () => Promise<void>;
}

export function useAvances(): UseAvancesReturn {
  const [avances, setAvances] = useState<Avance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentCompany } = useCompany();

  const mounted = useRef(true);

  const loadAvances = useCallback(async () => {
    if (!currentCompany?.id) {
      setAvances([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const data = await fetchAvances(currentCompany.id);
      if (mounted.current) setAvances(data);
    } catch (err: unknown) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Erreur lors du chargement des avances");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [currentCompany?.id]);

  // Load initial + cleanup
  useEffect(() => {
    mounted.current = true;
    loadAvances();
    return () => {
      mounted.current = false;
    };
  }, [loadAvances]);

  // Realtime sync
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.table === "avances") {
        loadAvances();
      }
    };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, [loadAvances]);

  const handleAddAvance = useCallback(
    async (avance: Partial<Avance>) => {
      if (!currentCompany?.id) {
        const msg = "Société non sélectionnée";
        setError(msg);
        throw new Error(msg);
      }

      try {
        setError(null);
        const newAvance = await addAvanceService(avance, currentCompany.id);
        setAvances((prev) => [newAvance, ...prev]);
        return newAvance;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de l'ajout";
        setError(msg);
        throw err;
      }
    },
    [currentCompany?.id]
  );

  const handleAnnulerAvance = useCallback(
    async (id: string) => {
      if (!currentCompany?.id) {
        const msg = "Société non sélectionnée";
        setError(msg);
        throw new Error(msg);
      }

      try {
        setError(null);
        await annulerAvanceService(id, currentCompany.id);
        setAvances((prev) =>
        prev.map((a) => (a.id === id ? { ...a, annule: true } as Avance : a))
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de l'annulation";
        setError(msg);
        throw err;
      }
    },
    [currentCompany?.id]
  );

  const handleDeleteAvance = useCallback(
    async (id: string) => {
      if (!currentCompany?.id) {
        const msg = "Société non sélectionnée";
        setError(msg);
        throw new Error(msg);
      }

      try {
        setError(null);
        await deleteAvanceService(id, currentCompany.id);
        setAvances((prev) => prev.filter((a) => a.id !== id));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de la suppression";
        setError(msg);
        throw err;
      }
    },
    [currentCompany?.id]
  );

  return {
    avances,
    loading,
    error,
    addAvance: handleAddAvance,
    annulerAvance: handleAnnulerAvance,
    deleteAvance: handleDeleteAvance,
    reloadAvances: loadAvances,
  };
}
