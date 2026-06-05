// @ts-nocheck
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client cannot be created on the server side');
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables');
    }
    _supabase = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'ht_gescom_auth',
        storage: window.localStorage,
      },
      realtime: {
        params: { eventsPerSecond: 5 },
      },
    });
  }
  return _supabase;
}

// Lazy proxy — ne crée le client qu'au premier accès (côté navigateur uniquement)
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient];
  },
  set(_target, prop, value) {
    (getSupabase() as any)[prop] = value;
    return true;
  },
});

// ── Company helpers ──────────────────────────────────────────────────
let _company = null;

export const setCurrentCompany = (c) => { _company = c; };
export const getCurrentCompany = () => _company;
export const clearCurrentCompany = () => { _company = null; };

/**
 * Charge le company depuis la table `companies` via `user_companies`.
 * Stocke le résultat en mémoire pour éviter les appels répétés.
 * L'UI (sélecteur dans le layout) appelera setCurrentCompany() pour changer.
 */
export async function loadCurrentCompany() {
  if (_company) return _company;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1) Chercher via user_companies → companies
  const { data: uc } = await supabase
    .from('user_companies')
    .select('company_id, company:companies(*)')
    .eq('user_id', user.id)
    .order('id', { ascending: true });

  if (uc && uc.length > 0) {
    const first = uc[0];
    _company = first.company || (first.company_id ? { id: first.company_id } : null);
  }

  // 2) Fallback : première company dans la table (si pas de user_companies)
  if (!_company) {
    const { data: first } = await supabase
      .from('companies')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)
      .single();
    _company = first || null;
  }

  return _company;
}

/**
 * Charge TOUTES les sociétés accessibles à l'utilisateur
 */
export async function loadUserCompanies() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: uc } = await supabase
    .from('user_companies')
    .select('company_id, company:companies(*)')
    .eq('user_id', user.id)
    .order('id', { ascending: true });

  return (uc || []).map(r => r.company).filter(Boolean);
}
