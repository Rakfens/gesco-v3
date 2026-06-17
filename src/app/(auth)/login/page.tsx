"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { LOGIN_EMAIL, LOGIN_PASSWORD } from "@/modules/shared/utils/constants";
import { logger } from "@/lib/logger";

const EyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
  <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosed = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
  <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200">
  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
  <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200">
  <rect x="3" y="11" width="18" height="11" rx="2" />
  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
  <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(LOGIN_EMAIL);
  const [password, setPassword] = useState(LOGIN_PASSWORD);
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);
  const [remember, setRemember] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const sb = getSupabase();
      const { data } = await sb.auth.getSession();
      if (!data.session || cancelled) { setCheckingSession(false); return; }
      const userId = data.session.user.id;
      const { data: uc } = await sb.from("user_companies").select("company:companies(*)").eq("user_id", userId);
      const list = (uc || []).map((r: any) => Array.isArray(r.company) ? r.company[0] : r.company).filter(Boolean) as Array<{ type?: string }>;
      const first = list[0];
      if (!cancelled) router.replace(first?.type === "service" ? "/livraison/dashboard" : "/commerce/dashboard");
    };
      check();
      return () => { cancelled = true; };
  }, [router]);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) { setError("Email et mot de passe requis"); return; }
    setError(""); setLoading(true);
    try {
      const sb = getSupabase();
      const { error: authError } = await sb.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      const { data: sessionData } = await sb.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (userId) {
        const { data: uc } = await sb.from("user_companies").select("company:companies(*)").eq("user_id", userId);
        const list = (uc || []).map((r: any) => Array.isArray(r.company) ? r.company[0] : r.company).filter(Boolean) as Array<{ type?: string }>;
        const first = list[0];
        router.replace(first?.type === "service" ? "/livraison/dashboard" : "/commerce/dashboard");
      } else router.replace("/commerce/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Identifiants incorrects";
      logger.error("[LOGIN] Error:", msg); setError(msg);
    } finally { setLoading(false); }
  };

  if (checkingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#08080c]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#08080c] px-4 py-6 overflow-hidden">
    {/* Background effects */}
    <div className="pointer-events-none fixed inset-0">
    <div className="absolute left-[5%] top-[10%] h-[400px] w-[400px] rounded-full bg-amber-400/[0.03] blur-[100px] animate-pulse" style={{ animationDuration: "4s" }} />
    <div className="absolute bottom-[15%] right-[10%] h-[500px] w-[500px] rounded-full bg-violet-500/[0.03] blur-[100px] animate-pulse" style={{ animationDuration: "6s", animationDelay: "1s" }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-blue-500/[0.02] blur-[120px]" />
    </div>

    <div className={`relative z-10 w-full max-w-[460px] rounded-2xl border border-white/[0.06] bg-[#111114]/80 backdrop-blur-xl p-10 shadow-2xl transition-all duration-700 ${mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-[0.96]"}`}>
    {/* Logo */}
    <div className="mb-10 text-center">
    <div className="mx-auto mb-6 flex h-[100px] w-[100px] items-center justify-center overflow-hidden rounded-2xl border-2 border-amber-400/50 bg-gradient-to-br from-[#16161a] to-[#08080c] shadow-[0_8px_32px_rgba(201,169,110,0.25)]">
    <img src="/logo.png" alt="HT-GesCom" className="h-full w-full object-contain" />
    </div>
    <h1 className="text-[28px] font-extrabold tracking-tight text-white">HT-GesCom</h1>
    <p className="mt-2 text-[13px] text-zinc-500">Aterinay Services · Connexion sécurisée</p>
    </div>

    {/* Error */}
    {error && (
      <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3.5 text-[13px] text-red-400 animate-fade-in">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <span>{error}</span>
      </div>
    )}

    <form onSubmit={handleLogin} className="space-y-5">
    {/* Email */}
    <div>
    <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Adresse email</label>
    <div className="relative">
    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${emailFocused ? "text-amber-400" : "text-zinc-600"}`}>
    <MailIcon />
    </div>
    <input type="email" placeholder="admin@aterinay.com" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
    className="w-full rounded-xl border border-zinc-800 bg-[#0a0a0f] py-3.5 pl-11 pr-3.5 text-sm text-white outline-none transition-all placeholder:text-zinc-700 input-focus" />
    </div>
    <p className="mt-1.5 ml-0.5 text-[11px] text-zinc-600">Entrez votre adresse email professionnelle</p>
    </div>

    {/* Password */}
    <div>
    <label className="mb-2 block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mot de passe</label>
    <div className="relative">
    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${pwdFocused ? "text-amber-400" : "text-zinc-600"}`}>
    <LockIcon />
    </div>
    <input type={showPwd ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setPwdFocused(true)} onBlur={() => setPwdFocused(false)}
    className="w-full rounded-xl border border-zinc-800 bg-[#0a0a0f] py-3.5 pl-11 pr-12 text-sm text-white outline-none transition-all placeholder:text-zinc-700 input-focus" />
    <button type="button" onClick={() => setShowPwd(!showPwd)} className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors ${showPwd ? "bg-amber-400/10 text-amber-400" : "text-zinc-600 hover:text-zinc-400"}`}>
    {showPwd ? <EyeOpen /> : <EyeClosed />}
    </button>
    </div>
    <p className="mt-1.5 ml-0.5 text-[11px] text-zinc-600">8 caractères minimum recommandés</p>
    </div>

    {/* Remember + Forgot */}
    <div className="flex items-center justify-between">
    <label className="flex cursor-pointer select-none items-center gap-2">
    <button type="button" onClick={() => setRemember(!remember)} className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded transition-all ${remember ? "border-2 border-amber-400 bg-amber-400" : "border-2 border-zinc-700"}`}>
    {remember && <CheckIcon />}
    </button>
    <span className="text-xs text-zinc-400">Se souvenir de moi</span>
    </label>
    <button type="button" className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors">Mot de passe oublié ?</button>
    </div>

    {/* Submit */}
    <button type="submit" disabled={loading} className={`btn-press flex w-full items-center justify-center gap-2.5 rounded-xl py-4 text-base font-bold tracking-wide transition-all duration-300 ${loading ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-gradient-to-r from-amber-400 to-amber-500 text-gray-950 shadow-[0_6px_24px_rgba(201,169,110,0.35)] hover:shadow-[0_8px_32px_rgba(201,169,110,0.45)] hover:-translate-y-0.5"}`}>
    {loading ? (
      <>
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-800 border-t-amber-400" />
      Connexion en cours...
      </>
    ) : "Se connecter"}
    </button>
    </form>

    {/* Footer */}
    <div className="mt-8 border-t border-white/[0.04] pt-5 text-center">
    <p className="text-[11px] text-zinc-600">HT-GesCom v3.0 · © 2024-2026 Aterinay Services</p>
    <p className="mt-1 text-[10px] text-zinc-700">Propulsé par <span className="text-amber-400">ZOO</span> · Tous droits réservés</p>
    </div>
    </div>
    </div>
  );
}
