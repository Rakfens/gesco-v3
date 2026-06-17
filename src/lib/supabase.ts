// src/lib/supabase.ts
import {
  createBrowserClient,
  createServerClient as createSupabaseServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import type { Company } from "@/modules/shared/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

/* ─── Client navigateur (composants client, hooks) ─── */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "ht_gescom_auth",
    },
    realtime: {
      params: { eventsPerSecond: 5 },
    },
  });
}

/* ─── Client serveur (Server Components, API routes) ─── */
export async function createServerClient() {
  const { cookies } = await import("next/headers");
  const cookieStore = cookies();

  return createSupabaseServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components ne peuvent pas set cookies
        }
      },
    },
  });
}

/* ─── Company helpers (sessionStorage — navigateur uniquement) ─── */
export function setCurrentCompany(c: Company | null): void {
  if (typeof window === "undefined") return;
  try {
    if (c) {
      sessionStorage.setItem("ht_company_id", c.id);
      if (c.slug) sessionStorage.setItem("ht_company_slug", c.slug);
    } else {
      clearCurrentCompany();
    }
  } catch {
    // sessionStorage indisponible
  }
}

export function getCurrentCompany(): Company | null {
  if (typeof window === "undefined") return null;
  try {
    const id = sessionStorage.getItem("ht_company_id");
    if (!id) return null;
    return { id } as Company;
  } catch {
    return null;
  }
}

export function clearCurrentCompany(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("ht_company_id");
    sessionStorage.removeItem("ht_company_slug");
  } catch {
    // Ignorer
  }
}

/* ─── Backward compatibility (deprecated) ─── */
/** @deprecated Use createClient() instead */
export function getSupabase() {
  return createClient();
}
