// src/modules/shared/hooks/useCommission.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCommission,
  updateCommission as updateCommissionService,
} from "@/modules/livraison/services/configService";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { COMMISSION_DEFAUT } from "@/modules/shared/utils/constants";

interface UseCommissionReturn {
  commissionGerant: number;
  loading: boolean;
  error: string | null;
  updateCommission: (val: number) => Promise<void>;
}

export function useCommission(): UseCommissionReturn {
  const [commissionGerant, setCommissionGerant] = useState<number>(COMMISSION_DEFAUT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentCompany } = useCompany();

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const load = async () => {
      if (!currentCompany?.id) {
        setCommissionGerant(COMMISSION_DEFAUT);
        setLoading(false);
        return;
      }

      try {
        setError(null);
        setLoading(true);
        const val = await fetchCommission(currentCompany.id);
        if (mounted.current) setCommissionGerant(val ?? COMMISSION_DEFAUT);
      } catch (err: unknown) {
        if (mounted.current) {
          setError(err instanceof Error ? err.message : "Erreur lors du chargement");
          setCommissionGerant(COMMISSION_DEFAUT);
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    };

    load();

    return () => {
      mounted.current = false;
    };
  }, [currentCompany?.id]);

  const updateCommission = useCallback(
    async (val: number) => {
      if (!currentCompany?.id) {
        const msg = "Société non sélectionnée";
        setError(msg);
        throw new Error(msg);
      }

      if (val < 0) {
        const msg = "La commission ne peut pas être négative";
        setError(msg);
        throw new Error(msg);
      }

      try {
        setError(null);
        await updateCommissionService(val, currentCompany.id);
        setCommissionGerant(val);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur lors de la mise à jour";
        setError(msg);
        throw err;
      }
    },
    [currentCompany?.id]
  );

  return { commissionGerant, loading, error, updateCommission };
}
