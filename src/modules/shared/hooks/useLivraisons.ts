// src/modules/shared/hooks/useLivraisons.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Livraison } from "@/modules/shared/types";
import {
  addLivraison as addLivraisonService,
  deleteLivraison as deleteLivraisonService,
  fetchLivraisons,
  updateLivraison as updateLivraisonService,
} from "@/modules/livraison/services/livraisonService";
import { useCompany } from "@/modules/shared/context/CompanyContext";

interface UseLivraisonsReturn {
  livraisons: Livraison[];
  loading: boolean;
  error: string | null;
  addLivraison: (livraison: Partial<Livraison>) => Promise<Livraison>;
  updateLivraison: (id: string, updates: Partial<Livraison>) => Promise<void>;
  deleteLivraison: (id: string) => Promise<void>;
  reloadLivraisons: () => Promise<void>;
}

export function useLivraisons(): UseLivraisonsReturn {
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentCompany } = useCompany();

  const mounted = useRef(true);

  const loadLivraisons = useCallback(async () => {
    if (!currentCompany?.id) {
      setLivraisons([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const data = await fetchLivraisons(currentCompany.id);
      if (mounted.current) setLivraisons(data);
    } catch (err: unknown) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Erreur lors du chargement des livraisons");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [currentCompany?.id]);

  // Load initial + cleanup
  useEffect(() => {
    mounted.current = true;
    loadLivraisons();
    return () => {
      mounted.current = false;
    };
  }, [loadLivraisons]);

  // Realtime sync
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.table === "livraisons") {
        loadLivraisons();
      }
    };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, [loadLivraisons]);

  const handleAddLivraison = useCallback(
    async (livraison: Partial<Livraison>) => {
      if (!currentCompany?.id) {
        const msg = "Société non sélectionnée";
        setError(msg);
        throw new Error(msg);
      }

      try {
        setError(null);

        // Normaliser les champs si nécessaire (compatibilité avec l'ancien format)
        const normalized: Partial<Livraison> = {
          ...livraison,
          colis: livraison.colis?.trim(),
                                         client_donneur: livraison.client_donneur?.trim(),
                                         destinataire: livraison.destinataire?.trim(),
                                         destinataire_telephone: livraison.destinataire_telephone?.trim(),
                                         destinataire_lieu: livraison.destinataire_lieu?.trim(),
                                         agent_nom: livraison.agent_nom?.trim(),
                                         remarque: livraison.remarque?.trim() || undefined,
                                         montant: livraison.paiement === "client" ? 0 : livraison.montant,
        };

        const data = await addLivraisonService(normalized, currentCompany.id);
        setLivraisons((prev) => [data, ...prev]);
        return data;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de l'ajout";
        setError(msg);
        throw err;
      }
    },
    [currentCompany?.id]
  );

  const handleUpdateLivraison = useCallback(
    async (id: string, updates: Partial<Livraison>) => {
      if (!currentCompany?.id) {
        const msg = "Société non sélectionnée";
        setError(msg);
        throw new Error(msg);
      }

      try {
        setError(null);
        await updateLivraisonService(id, updates, currentCompany.id);
        setLivraisons((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...updates } as Livraison : l))
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de la mise à jour";
        setError(msg);
        throw err;
      }
    },
    [currentCompany?.id]
  );

  const handleDeleteLivraison = useCallback(
    async (id: string) => {
      if (!currentCompany?.id) {
        const msg = "Société non sélectionnée";
        setError(msg);
        throw new Error(msg);
      }

      try {
        setError(null);
        await deleteLivraisonService(id, currentCompany.id);
        setLivraisons((prev) => prev.filter((l) => l.id !== id));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de la suppression";
        setError(msg);
        throw err;
      }
    },
    [currentCompany?.id]
  );

  return {
    livraisons,
    loading,
    error,
    addLivraison: handleAddLivraison,
    updateLivraison: handleUpdateLivraison,
    deleteLivraison: handleDeleteLivraison,
    reloadLivraisons: loadLivraisons,
  };
}
