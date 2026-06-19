"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { LOGIN_EMAIL, LOGIN_PASSWORD } from "@/modules/shared/utils/constants";

/* ─── Inline SVGs ─── */
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ArrowRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

/* ─── Floating Particles (pure CSS) ─── */
const FloatingParticles = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {Array.from({ length: 20 }).map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full"
        style={{
          width: `${2 + Math.random() * 3}px`,
          height: `${2 + Math.random() * 3}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: i % 3 === 0 ? "#c9a96e" : i % 3 === 1 ? "#8b5cf6" : "#60a5fa",
          opacity: 0.15 + Math.random() * 0.25,
          animation: `float-particle ${8 + Math.random() * 12}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 5}s`,
        }}
      />
    ))}
  </div>
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
      setError(msg);
    } finally { setLoading(false); }
  };

  if (checkingSession) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* ═══════════════════════════════════════════════════════
          LEFT PANEL — Branding (desktop only)
          ═══════════════════════════════════════════════════════ */}
      <div
        className="relative hidden lg:flex lg:w-[48%] flex-col items-center justify-center overflow-hidden px-12"
        style={{
          background: "linear-gradient(160deg, #0a0a10 0%, #0d0b14 30%, #0f0d0a 60%, #08080c 100%)",
        }}
      >
        <FloatingParticles />

        {/* Large radial glow behind logo */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: "600px",
            height: "600px",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -60%)",
            background: "radial-gradient(circle, rgba(201,169,110,0.06) 0%, rgba(139,92,246,0.03) 40%, transparent 70%)",
            animation: "pulse-glow 4s ease-in-out infinite",
          }}
        />

        {/* Vertical gold line accent */}
        <div
          className="absolute left-0 top-[15%] bottom-[15%] w-[2px]"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(201,169,110,0.3), transparent)",
          }}
        />
        <div
          className="absolute right-[8%] top-[10%] bottom-[10%] w-[1px]"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(139,92,246,0.2), transparent)",
          }}
        />

        {/* Logo + Brand */}
        <div
          className={`relative z-10 flex flex-col items-center transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-[0.92]"
          }`}
          style={{ transitionDelay: "0.1s" }}
        >
          {/* Logo container with animated ring */}
          <div className="relative mb-8">
            {/* Animated spinning ring */}
            <div
              className="absolute -inset-4 rounded-full opacity-30"
              style={{
                background: "conic-gradient(from 0deg, transparent, var(--gold), transparent, var(--violet), transparent)",
                animation: "spin 8s linear infinite",
              }}
            />
            {/* Glow */}
            <div
              className="absolute -inset-2 rounded-full blur-xl"
              style={{ background: "rgba(201,169,110,0.12)" }}
            />
            {/* Logo box */}
            <div
              className="relative flex h-[200px] w-[200px] items-center justify-center rounded-3xl overflow-hidden border"
              style={{
                borderColor: "rgba(201,169,110,0.3)",
                background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))",
                boxShadow: "0 0 60px rgba(201,169,110,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <Image
                src="/logo.png"
                alt="HT-GesCom"
                width={150}
                height={150}
                priority
                className="object-contain"
                style={{
                  filter: "drop-shadow(0 0 20px rgba(201,169,110,0.2))",
                }}
              />
            </div>
          </div>

          {/* Brand text */}
          <h1
            className="text-[36px] font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #e4e4e7 0%, var(--gold) 50%, #e4e4e7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            HT-GesCom
          </h1>
          <p
            className="mt-3 text-[14px] tracking-widest uppercase font-medium"
            style={{ color: "var(--text-faint)" }}
          >
            Gestion Commerciale
          </p>

          {/* Divider */}
          <div
            className="mt-6 mb-6 h-[1px] w-[120px]"
            style={{
              background: "linear-gradient(to right, transparent, var(--gold), transparent)",
            }}
          />

          {/* Feature pills */}
          <div className="flex flex-col items-center gap-3">
            {[
              { icon: "📦", text: "Aterinay · Pomanay · Zazatiana" },
              { icon: "🔒", text: "Connexion sécurisée & chiffrée" },
              { icon: "⚡", text: "Temps réel · Stock · Ventes" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 text-[12px] transition-all duration-700"
                style={{
                  color: "var(--text-muted)",
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateX(0)" : "translateX(-20px)",
                  transitionDelay: `${0.4 + i * 0.15}s`,
                }}
              >
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-[10px] flex items-center justify-center gap-1.5" style={{ color: "var(--text-faint)", opacity: 0.5 }}>
            <ShieldIcon />
            Propulsé par ZOO · © 2024-2026
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          RIGHT PANEL — Login Form
          ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24 relative">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute overflow-hidden"
          style={{
            width: "500px",
            height: "500px",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(201,169,110,0.02) 0%, transparent 70%)",
          }}
        />

        {/* Mobile logo (visible only on small screens) */}
        <div
          className={`lg:hidden mb-8 flex flex-col items-center transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          }`}
        >
          <div className="relative mb-4">
            <div
              className="absolute -inset-2 rounded-full blur-xl"
              style={{ background: "rgba(201,169,110,0.12)" }}
            />
            <div
              className="relative flex h-[100px] w-[100px] items-center justify-center rounded-2xl overflow-hidden border"
              style={{
                borderColor: "rgba(201,169,110,0.3)",
                background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))",
                boxShadow: "0 0 30px rgba(201,169,110,0.08)",
              }}
            >
              <Image
                src="/logo.png"
                alt="HT-GesCom"
                width={72}
                height={72}
                priority
                className="object-contain"
                style={{
                  filter: "drop-shadow(0 0 12px rgba(201,169,110,0.2))",
                }}
              />
            </div>
          </div>
          <h1 className="text-[24px] font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
            HT-GesCom
          </h1>
        </div>

        {/* Form card */}
        <div
          className={`relative z-10 w-full max-w-[400px] transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{ transitionDelay: "0.2s" }}
        >
          {/* Header */}
          <div className="mb-8 hidden lg:block">
            <h2 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Connexion
            </h2>
            <p className="mt-1.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
              Accédez à votre espace de gestion
            </p>
          </div>

          <div className="lg:hidden mb-6">
            <h2 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Connexion
            </h2>
            <p className="mt-1.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
              Accédez à votre espace de gestion
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-5 flex items-center gap-2.5 rounded-xl px-4 py-3.5 text-[13px] animate-fade-in"
              style={{
                border: "1px solid var(--danger-dim)",
                background: "var(--danger-dim)",
                color: "var(--danger)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label
                className="mb-2 block text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Adresse email
              </label>
              <div className="relative">
                <div
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                  style={{ color: emailFocused ? "var(--gold)" : "var(--text-faint)" }}
                >
                  <MailIcon />
                </div>
                <input
                  type="email"
                  placeholder="admin@aterinay.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className="w-full rounded-xl border py-3.5 pl-11 pr-3.5 text-sm input-focus"
                  style={{
                    borderColor: emailFocused ? "rgba(201,169,110,0.4)" : "var(--border-default)",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="mb-2 block text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Mot de passe
              </label>
              <div className="relative">
                <div
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                  style={{ color: pwdFocused ? "var(--gold)" : "var(--text-faint)" }}
                >
                  <LockIcon />
                </div>
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPwdFocused(true)}
                  onBlur={() => setPwdFocused(false)}
                  className="w-full rounded-xl border py-3.5 pl-11 pr-12 text-sm input-focus"
                  style={{
                    borderColor: pwdFocused ? "rgba(201,169,110,0.4)" : "var(--border-default)",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 btn-press transition-colors"
                  style={{
                    color: showPwd ? "var(--gold)" : "var(--text-faint)",
                    background: showPwd ? "rgba(201,169,110,0.1)" : "transparent",
                  }}
                >
                  {showPwd ? <EyeOpen /> : <EyeClosed />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer select-none items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRemember(!remember)}
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded btn-press transition-all"
                  style={{
                    border: remember ? "2px solid var(--gold)" : "2px solid var(--text-faint)",
                    background: remember ? "var(--gold)" : "transparent",
                  }}
                >
                  {remember && <CheckIcon />}
                </button>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Se souvenir de moi</span>
              </label>
              <button
                type="button"
                className="text-xs underline underline-offset-2 btn-press transition-colors"
                style={{ color: "var(--gold)" }}
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-press flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-[14px] font-bold tracking-wide transition-all duration-300"
              style={{
                background: loading
                  ? "var(--bg-elevated)"
                  : "linear-gradient(135deg, var(--gold), var(--gold-dark))",
                color: loading ? "var(--text-muted)" : "#08080c",
                boxShadow: loading ? "none" : "0 4px 20px rgba(201,169,110,0.25)",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <>
                  <span
                    className="inline-block h-5 w-5 animate-spin rounded-full border-2"
                    style={{ borderColor: "var(--border-default)", borderTopColor: "var(--gold)" }}
                  />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div
            className="mt-8 pt-5 text-center"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
              HT-GesCom v3.0 · Aterinay Services
            </p>
            <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
              Propulsé par <span style={{ color: "var(--gold)" }}>ZOO</span> · Tous droits réservés
            </p>
          </div>
        </div>
      </div>

      {/* ─── Global keyframes ─── */}
      <style jsx global>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.2; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.5; }
          50% { transform: translateY(-15px) translateX(-8px); opacity: 0.3; }
          75% { transform: translateY(-40px) translateX(5px); opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
