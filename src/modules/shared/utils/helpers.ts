// helpers.ts — ⚠️ DEPRECATED : Utiliser Tailwind à la place
// Ce fichier est conservé pour compatibilité avec d'anciens composants.
// Tout nouveau code doit utiliser les classes Tailwind directement.

import type { CSSProperties } from "react";

// ==================== FORMULAIRES (legacy) ====================
export const inp = (): CSSProperties => ({
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--border2)",
                                         background: "rgba(255,255,255,0.04)",
                                         color: "var(--text)",
                                         fontSize: 14,
                                         fontFamily: "var(--font)",
                                         outline: "none",
                                         width: "100%",
                                         boxSizing: "border-box" as const,
                                         transition: "border-color 0.2s ease, box-shadow 0.2s ease",
});

export const inpSm = (): CSSProperties => ({ ...inp(), fontSize: 13, padding: "9px 12px", borderRadius: 10 });
export const inpLg = (): CSSProperties => ({ ...inp(), fontSize: 15, padding: "14px 16px" });
export const inpError = (): CSSProperties => ({
  ...inp(),
                                              borderColor: "var(--red)",
                                              boxShadow: "0 0 0 2px rgba(248,113,113,0.18)",
});
export const inpSuccess = (): CSSProperties => ({
  ...inp(),
                                                borderColor: "var(--green)",
                                                boxShadow: "0 0 0 2px rgba(52,211,153,0.18)",
});

// ==================== BOUTONS (legacy) ====================
export const btn = (c1: string, c2?: string): CSSProperties => ({
  padding: "11px 18px",
  background: c2 ? `linear-gradient(135deg, ${c1}, ${c2})` : c1,
                                                                color: "#fff",
                                                                border: "none",
                                                                borderRadius: 11,
                                                                fontWeight: 700,
                                                                fontFamily: "var(--font)",
                                                                fontSize: 13,
                                                                cursor: "pointer",
                                                                letterSpacing: "-0.01em",
                                                                transition: "opacity 0.15s ease, transform 0.15s ease",
});

export const btnSm = (c1: string, c2?: string): CSSProperties => ({ ...btn(c1, c2), padding: "7px 13px", fontSize: 12, borderRadius: 9 });
export const btnLg = (c1: string, c2?: string): CSSProperties => ({ ...btn(c1, c2), padding: "14px 24px", fontSize: 15, borderRadius: 13 });
export const btnOutline = (color: string): CSSProperties => ({
  padding: "10px 16px",
  background: `${color}14`,
  color,
  border: `1px solid ${color}30`,
  borderRadius: 11,
  fontWeight: 600,
  fontFamily: "var(--font)",
                                                             fontSize: 13,
                                                             cursor: "pointer",
                                                             transition: "all 0.18s ease",
});
export const btnGhost = (): CSSProperties => ({
  padding: "9px 14px",
  background: "transparent",
  color: "var(--text2)",
                                              border: "1px solid var(--border2)",
                                              borderRadius: 10,
                                              fontWeight: 600,
                                              fontFamily: "var(--font)",
                                              fontSize: 13,
                                              cursor: "pointer",
                                              transition: "all 0.18s ease",
});
export const btnDanger = (): CSSProperties => ({
  ...btn("var(--red)", "var(--red2)"),
                                               boxShadow: "0 4px 16px rgba(248,113,113,0.25)",
});

// ==================== LABELS (legacy) ====================
export const lbl = (): CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  color: "var(--muted)",
                                         letterSpacing: "0.06em",
                                         textTransform: "uppercase" as const,
                                         display: "block",
                                         marginBottom: 7,
});

// ==================== CARDS (legacy) ====================
export const card = (extra: CSSProperties = {}): CSSProperties => ({
  background: "var(--card)",
                                                                   border: "1px solid var(--border2)",
                                                                   borderRadius: 16,
                                                                   padding: 18,
                                                                   ...extra,
});

export const statCard = (color: string): CSSProperties => ({
  background: `linear-gradient(135deg, ${color}12 0%, ${color}06 100%)`,
                                                           border: `1px solid ${color}20`,
                                                           borderRadius: 18,
                                                           padding: 18,
});

// ==================== SECTIONS (legacy) ====================
export const section = (): CSSProperties => ({ marginBottom: 20 });
export const sectionHeader = (): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
});

// ==================== TAG / CHIP (legacy) ====================
export const tag = (bg: string, color = "#fff"): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 9px",
  background: bg,
  color,
  borderRadius: 100,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.05em",
});

// ==================== BADGE (legacy) ====================
export const badge = (variant = "default"): CSSProperties => {
  const variants: Record<string, CSSProperties> = {
    default: { background: "var(--bg2)", color: "var(--text2)", border: "1px solid var(--border)" },
      primary: { background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid transparent" },
      success: { background: "var(--green-dim)", color: "var(--green)", border: "1px solid transparent" },
      danger: { background: "var(--red-dim)", color: "var(--red)", border: "1px solid transparent" },
      warning: { background: "var(--orange-dim)", color: "var(--orange)", border: "1px solid transparent" },
      info: { background: "var(--blue-dim)", color: "var(--blue)", border: "1px solid transparent" },
      purple: { background: "var(--purple-dim)", color: "var(--purple)", border: "1px solid transparent" },
  };
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 10px",
    borderRadius: 100,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
    ...(variants[variant] || variants.default),
  };
};

// ==================== MODAL STYLES (legacy) ====================
export const modalStyles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    zIndex: 200,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    animation: "fadeIn 0.2s ease",
  },
  sheet: {
    background: "var(--card)",
    border: "1px solid var(--border2)",
    borderRadius: "24px 24px 0 0",
    width: "100%",
    maxWidth: 500,
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
    animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",
    boxShadow: "0 -12px 48px rgba(0,0,0,0.5)",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "0 20px",
    WebkitOverflowScrolling: "touch",
  },
  footer: {
    flexShrink: 0,
    padding: "12px 20px",
    paddingBottom: "max(16px, env(safe-area-inset-bottom))",
    borderTop: "1px solid var(--border)",
    background: "var(--card)",
    display: "flex",
    gap: 10,
  },
  handle: {
    width: 36,
    height: 4,
    background: "var(--border2)",
    borderRadius: 4,
    margin: "12px auto 16px",
    flexShrink: 0,
  },
  header: {
    padding: "0 20px 12px",
    flexShrink: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: "var(--text)",
    marginBottom: 4,
    letterSpacing: "-0.02em",
  },
  box: {
    background: "var(--card)",
    border: "1px solid var(--border2)",
    borderRadius: "24px 24px 0 0",
    padding: "20px 20px",
    paddingBottom: "max(24px, env(safe-area-inset-bottom))",
    width: "100%",
    maxWidth: 480,
    maxHeight: "85vh",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",
    boxShadow: "0 -12px 48px rgba(0,0,0,0.5)",
  },
  fullscreen: {
    background: "var(--card)",
    border: "none",
    borderRadius: 0,
    padding: "max(20px, env(safe-area-inset-top)) 16px 0",
    width: "100%",
    height: "100%",
    maxHeight: "100%",
    display: "flex",
    flexDirection: "column",
    animation: "slideUp 0.25s ease",
  },
};
