"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { LOGIN_EMAIL, LOGIN_PASSWORD } from "@/modules/shared/utils/constants";

export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";

const EyeOpen = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeClosed = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const MailIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const LockIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  // Vérifier si déjà connecté → rediriger
  useEffect(() => {
    const sb = getSupabase();
    sb.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const userId = data.session.user.id;
        const { data: uc } = await sb
          .from("user_companies")
          .select("company:companies(*)")
          .eq("user_id", userId);
        const list: Array<{ type?: string }> = (uc || [])
          .map((r: { company: { type?: string }[] | { type?: string } }) =>
            Array.isArray(r.company) ? r.company[0] : r.company,
          )
          .filter(Boolean) as Array<{ type?: string }>;
        const first = list[0];
        if (first?.type === "service") {
          router.replace("/livraison/dashboard");
        } else {
          router.replace("/commerce/dashboard");
        }
      }
    });
  }, [router]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email et mot de passe requis");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const sb = getSupabase();
      const { error: authError } = await sb.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const { data: sessionData } = await sb.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (userId) {
        const { data: uc } = await sb
          .from("user_companies")
          .select("company:companies(*)")
          .eq("user_id", userId);
        const list: Array<{ type?: string }> = (uc || [])
          .map((r: { company: { type?: string }[] | { type?: string } }) =>
            Array.isArray(r.company) ? r.company[0] : r.company,
          )
          .filter(Boolean) as Array<{ type?: string }>;
        const first = list[0];
        const dest = first?.type === "service" ? "/livraison/dashboard" : "/commerce/dashboard";
        window.location.replace(dest);
      } else {
        window.location.replace("/commerce/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Identifiants incorrects";
      logger.error("[LOGIN] Error:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8f9fc 0%, #eef0f6 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "var(--font)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "40px 32px",
          boxShadow: "var(--shadow-lg)",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 16px",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid var(--border)",
              background: "var(--card2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img src="/logo.png" alt="HT-GesCom" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}
          >
            HT-GesCom
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
            Aterinay Services · Connexion
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "var(--red-dim)",
              border: "1px solid var(--red-bg)",
              color: "var(--red)",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 16,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              animation: "slideDown 0.25s ease",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text2)",
              display: "block",
              marginBottom: 6,
            }}
          >
            Email
          </label>
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
                display: "flex",
              }}
            >
              <MailIcon />
            </div>
            <input
              style={{
                width: "100%",
                padding: "11px 14px 11px 40px",
                background: "var(--card)",
                border: "1px solid var(--border2)",
                borderRadius: 10,
                color: "var(--text)",
                fontSize: 14,
                fontFamily: "var(--font)",
                outline: "none",
                boxSizing: "border-box",
              }}
              type="email"
              placeholder="admin@aterinay.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text2)",
              display: "block",
              marginBottom: 6,
            }}
          >
            Mot de passe
          </label>
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
                display: "flex",
              }}
            >
              <LockIcon />
            </div>
            <input
              type={showPwd ? "text" : "password"}
              style={{
                width: "100%",
                padding: "11px 44px 11px 40px",
                background: "var(--card)",
                border: "1px solid var(--border2)",
                borderRadius: 10,
                color: "var(--text)",
                fontSize: 14,
                fontFamily: "var(--font)",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: 4,
                display: "flex",
              }}
            >
              {showPwd ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "var(--font)",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "opacity 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  display: "inline-block",
                }}
              />
              Connexion en cours...
            </>
          ) : (
            "Se connecter"
          )}
        </button>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "var(--muted)" }}>
          HT-GesCom v3.0 · © Aterinay Services
        </div>
      </div>
    </div>
  );
}
