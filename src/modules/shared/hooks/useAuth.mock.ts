// src/modules/shared/hooks/useAuthMock.ts
import { useState, useCallback } from "react";

/* ─── Types ─── */
interface User {
  id: string;
  email: string;
}

interface Session {
  user: User;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  isAuthenticated: boolean;
}

/* ─── Mock Auth Hook ─── */
export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>({
    user: { id: "mock-user-id", email: "admin@gesco.com" },
  });
  const [loading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const login = useCallback(async (email: string, _password: string): Promise<void> => {
    // Simuler un délai réseau
    await new Promise((resolve) => setTimeout(resolve, 300));

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setAuthError("Email requis");
      throw new Error("Email requis");
    }

    setSession({
      user: { id: "mock-user-id", email: normalizedEmail || "admin@gesco.com" },
    });
    setAuthError(null);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    setSession(null);
    setAuthError(null);
  }, []);

  return {
    user: session?.user ?? null,
    loading,
    login,
    logout,
    authError,
    isAuthenticated: !!session?.user,
  };
}
