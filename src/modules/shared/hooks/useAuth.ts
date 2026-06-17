// src/modules/shared/hooks/useAuth.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { clearCurrentCompany } from "@/lib/supabase";

/* ─── Types ─── */
interface SupabaseUser {
  id: string;
  email?: string;
  [key: string]: unknown;
}

interface UseAuthReturn {
  user: SupabaseUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
}

/* ─── Auth Hook ─── */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const mounted = useRef(true);

  // Initial load + realtime auth state
  useEffect(() => {
    mounted.current = true;
    const supabase = createClient();

    // Récupération initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted.current) return;
      setUser((session?.user as unknown as SupabaseUser | null) ?? null);
      setLoading(false);
    });

    // Subscription aux changements d'état
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted.current) return;
      setUser((session?.user as unknown as SupabaseUser | null) ?? null);
      setLoading(false);
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
                                                             password,
    });

    if (error) {
      setAuthError(error.message);
      throw new Error(error.message);
    }
  }, []);

  const logout = useCallback(async () => {
    clearCurrentCompany();
    setUser(null);
    setLoading(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignorer silencieusement — l'utilisateur est déjà considéré comme déconnecté
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    authError,
  };
}
