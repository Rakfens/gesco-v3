// src/modules/shared/context/CompanyContext.tsx
"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { logger } from "@/lib/logger";
import {
  clearCurrentCompany,
  createClient,
  getCurrentCompany as getStoredCompany,
  setCurrentCompany as setStoredCompany,
} from "@/lib/supabase";
import type { Company } from "@/modules/shared/types";
import { clearAppState, loadSavedCompanyId } from "../hooks/useAppState";

export type { Company };

export interface CompanyContextValue {
  currentCompany: Company | null;
  companies: Company[];
  loading: boolean;
  switchCompany: (company: Company) => void;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);
CompanyContext.displayName = "CompanyContext";

/* ─── Backward compat ─── */
export { setStoredCompany as setCurrentCompany };
export const getCurrentCompany = (): Company | null => (getStoredCompany?.() as Company | null) ?? null;

/* ─── Provider ─── */
export function CompanyProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [currentCompany, _setActive] = useState<Company | null>(null);
  const [companies, setList] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const rtChannels = useRef<RealtimeChannel[]>([]);
  const mounted = useRef(true);

  const supabase = createClient();

  const setupRealtime = useCallback((companyId: string | undefined) => {
    // Cleanup anciens channels
    rtChannels.current.forEach((ch) => {
      try {
        supabase.removeChannel(ch);
      } catch (err) {
        logger.warn("[Company] Erreur removeChannel:", err);
      }
    });
    rtChannels.current = [];

    if (!companyId) return;

    const tables = [
      "livraisons", "agents", "avances", "recuperations",
      "ventes", "achats", "produits",
    ];

    tables.forEach((table) => {
      try {
        const ch = supabase
        .channel(`rt_${table}_${companyId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `company_id=eq.${companyId}` },
          (p: unknown) => {
            window.dispatchEvent(
              new CustomEvent("supabase_realtime", { detail: { table, payload: p } }),
            );
          },
        )
        .subscribe();
        rtChannels.current.push(ch);
      } catch (err) {
        logger.warn(`[Company] Erreur realtime ${table}:`, err);
      }
    });
  }, [supabase]);

  const applyActive = useCallback(
    (list: Company[], preferredId: string | null = null) => {
      const id = preferredId || loadSavedCompanyId();
      const found = id ? list.find((c) => String(c.id) === id) : null;
      const active = found || list[0] || null;
      setStoredCompany(active);
      _setActive(active);
      setupRealtime(active?.id);
      return active;
    },
    [setupRealtime],
  );

  const loadCompanies = useCallback(
    async (userId: string) => {
      if (!userId || !mounted.current) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
        .from("user_companies")
        .select("company:companies(*)")
        .eq("user_id", userId);

        if (!mounted.current) return;
        if (error) throw error;

        const list: Company[] = (data || [])
        .map((r: { company: Company[] | Company }) =>
        Array.isArray(r.company) ? r.company[0] : r.company,
        )
        .filter(Boolean);

        setList(list);
        applyActive(list);
      } catch (err) {
        logger.error("[Company] Erreur chargement sociétés:", err);
        if (mounted.current) {
          setList([]);
          _setActive(null);
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [applyActive, supabase],
  );

  useEffect(() => {
    mounted.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.log("[COMPANY] Auth event:", event, "session:", !!session);
      if (!mounted.current) return;

      if (!session || event === "SIGNED_OUT") {
        clearCurrentCompany();
        clearAppState();
        setList([]);
        _setActive(null);
        setLoading(false);
        rtChannels.current.forEach((ch) => {
          try {
            supabase.removeChannel(ch);
          } catch {
            /* noop */
          }
        });
        rtChannels.current = [];
        return;
      }

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        logger.log("[COMPANY] Loading companies for user:", session.user.id);
        loadCompanies(session.user.id);
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      rtChannels.current.forEach((ch) => {
        try {
          supabase.removeChannel(ch);
        } catch {
          /* noop */
        }
      });
    };
  }, [loadCompanies, supabase]);

  const switchCompany = useCallback(
    (company: Company) => {
      setStoredCompany(company);
      _setActive(company);
      setupRealtime(company?.id);
      try {
        if (company?.id) sessionStorage.setItem("ht_company_id", String(company.id));
      } catch {
        /* noop */
      }
      window.dispatchEvent(new CustomEvent("companyChanged", { detail: company }));
      router.refresh();
    },
    [setupRealtime, router],
  );

  return (
    <CompanyContext.Provider value={{ currentCompany, companies, loading, switchCompany }}>
    {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany doit être dans CompanyProvider");
  return ctx;
}
