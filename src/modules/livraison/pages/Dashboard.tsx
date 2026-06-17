// src/modules/livraison/pages/Dashboard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { logger } from "@/lib/logger";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  SkeletonGrid,
  StatCard,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Agent, Livraison, Recuperation } from "@/modules/shared/types";
import {
  COMMISSION_DEFAUT,
  currentMonth,
  EXCLUDED_CLIENTS,
  formatAr,
  monthLabel,
  shouldCountGerantCommission,
  TODAY,
} from "@/modules/shared/utils/constants";

const agentMatch = (livraison: Livraison, agent: Agent): boolean => {
  if (livraison.agent_id != null && agent.id != null) {
    return Number(livraison.agent_id) === Number(agent.id);
  }
  return livraison.agent_nom === agent.nom;
};

interface RecupParLivreur {
  livreur: string;
  total: number;
  nb: number;
  details: { client: string; frais: number }[];
}

/* ─── SVG Icon helper ─── */
const Icon = ({ d, size = 18, className = "text-current" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

const StatusIcon = ({ name, size = 14, className = "text-current" }: { name: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {name === "clock" && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
    {name === "check" && <polyline points="20 6 9 17 4 12" />}
    {name === "rotate-left" && <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 10.49-3.74" /></>}
    {name === "xmark" && <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
  </svg>
);

/* ─── Status config ─── */
const STATUS_OPTIONS = [
  { key: "en_cours", label: "En cours", color: "var(--gold)", icon: "clock" },
  { key: "livre", label: "Livré", color: "var(--success)", icon: "check" },
  { key: "retourne", label: "Retourné", color: "var(--danger)", icon: "rotate-left" },
  { key: "reporte", label: "Reporté", color: "var(--violet)", icon: "xmark" },
];

const statusBarColor = (statut?: string) => {
  if (statut === "livre") return "var(--success)";
  if (statut === "retourne") return "var(--danger)";
  if (statut === "reporte") return "var(--violet)";
  return "var(--gold)";
};

const statusBgColor = (statut?: string) => {
  if (statut === "livre") return "rgba(52,211,153,0.08)";
  if (statut === "retourne") return "rgba(248,113,113,0.08)";
  if (statut === "reporte") return "rgba(139,92,246,0.08)";
  return "rgba(201,169,110,0.08)";
};

const statusTextColor = (statut?: string) => {
  if (statut === "livre") return "var(--success)";
  if (statut === "retourne") return "var(--danger)";
  if (statut === "reporte") return "var(--violet)";
  return "var(--gold)";
};

const statusLabel = (statut?: string) => {
  return STATUS_OPTIONS.find((s) => s.key === statut)?.label || "En cours";
};

/* ─── Sparkline mini-chart ─── */
const Sparkline = ({ data, color = "var(--gold)" }: { data: number[]; color?: string }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 60;
  const h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ─── Status Buttons ─── */
function StatusButtons({ livraison, onUpdate }: { livraison: Livraison; onUpdate: (id: string, updates: Record<string, unknown>) => void }) {
  const [showRemarque, setShowRemarque] = useState(false);
  const [remarque, setRemarque] = useState(livraison.remarque || "");
  const [editingMontant, setEditingMontant] = useState(false);
  const [montant, setMontant] = useState(String(livraison.montant || ""));
  const [saving, setSaving] = useState(false);

  const needsRemarque = livraison.statut === "retourne" || livraison.statut === "reporte";

  const handleStatusChange = async (key: string) => {
    setSaving(true);
    try {
      if (key === "retourne" || key === "reporte") {
        setShowRemarque(true);
        await onUpdate(livraison.id, { statut: key, remarque });
      } else {
        setShowRemarque(false);
        await onUpdate(livraison.id, { statut: key });
      }
    } finally { setSaving(false); }
  };

  const handleSaveRemarque = async () => {
    if (!remarque.trim()) return;
    setSaving(true);
    try {
      await onUpdate(livraison.id, { statut: livraison.statut || "retourne", remarque });
      setShowRemarque(false);
    } finally { setSaving(false); }
  };

  const handleSaveMontant = async () => {
    setSaving(true);
    try {
      await onUpdate(livraison.id, { montant: parseFloat(montant) || 0 });
      setEditingMontant(false);
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1.5">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = livraison.statut === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleStatusChange(opt.key)}
              disabled={saving}
              title={opt.label}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border-2 transition-all btn-press"
              style={{
                borderColor: isActive ? opt.color : "var(--border-default)",
                background: isActive ? `${opt.color}15` : "var(--bg-elevated)",
                color: isActive ? opt.color : "var(--text-faint)",
                boxShadow: isActive ? `0 0 14px ${opt.color}30` : "none",
                opacity: saving && !isActive ? 0.5 : 1,
                cursor: saving ? "wait" : "pointer",
                transform: isActive ? "scale(1.1)" : "scale(1)",
              }}
            >
              <StatusIcon name={opt.icon} size={16} />
            </button>
          );
        })}
      </div>
      {(showRemarque || needsRemarque) && (
        <div className="w-full animate-fade-up rounded-xl p-2.5" style={{ border: "1px solid var(--border-default)", background: "var(--bg-elevated)" }}>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            {livraison.statut === "retourne" ? "⚠️ Motif du retour" : "📅 Motif du report"}
          </div>
          <textarea
            value={remarque}
            onChange={(e) => setRemarque(e.target.value)}
            placeholder={livraison.statut === "retourne" ? "Ex: Client injoignable..." : "Ex: Reporté au lendemain..."}
            className="w-full min-h-[50px] resize-y rounded-lg border p-2 text-xs outline-none input-focus"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
            autoFocus
          />
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={handleSaveRemarque}
              disabled={saving || !remarque.trim()}
              className="flex-1 rounded-lg py-1.5 text-[11px] font-bold btn-press transition-colors"
              style={{
                background: remarque.trim() ? "var(--gold)" : "var(--bg-elevated)",
                color: remarque.trim() ? "var(--bg-primary)" : "var(--text-faint)",
                cursor: remarque.trim() ? "pointer" : "not-allowed",
              }}
            >
              {saving ? "..." : "✓ OK"}
            </button>
            <button
              type="button"
              onClick={() => { setShowRemarque(false); setRemarque(livraison.remarque || ""); }}
              disabled={saving}
              className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold btn-press transition-colors"
              style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
      {editingMontant ? (
        <div className="w-full animate-fade-up rounded-xl p-2.5" style={{ border: "1px solid var(--gold)", background: "var(--bg-elevated)" }}>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--gold)" }}>💰 Modifier montant</div>
          <input
            type="number"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="Montant en Ar"
            className="w-full rounded-lg border p-2 text-sm outline-none input-focus"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
            autoFocus
          />
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={handleSaveMontant}
              disabled={saving}
              className="flex-1 rounded-lg py-1.5 text-[11px] font-bold btn-press transition-colors"
              style={{ background: "var(--gold)", color: "var(--bg-primary)", cursor: saving ? "wait" : "pointer" }}
            >
              {saving ? "..." : "✓ OK"}
            </button>
            <button
              type="button"
              onClick={() => { setEditingMontant(false); setMontant(String(livraison.montant || "")); }}
              disabled={saving}
              className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold btn-press transition-colors"
              style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditingMontant(true)}
          className="rounded-md border px-2 py-0.5 text-[10px] font-medium btn-press transition-colors"
          style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}
        >
          ✏️ Montant
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const router = useRouter();
  const { agents = [], livraisons = [], showToast, livraisonCrud } = useApp();
  const { currentCompany } = useCompany();
  const commissionGerant = COMMISSION_DEFAUT;
  const isMobile = useIsMobile();

  const [selectedDate, setSelectedDate] = useState<string>(TODAY());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth());
  const [recuperationsJour, setRecuperationsJour] = useState<Recuperation[]>([]);
  const [loadingRecup, setLoadingRecup] = useState(false);
  const [errorRecup, setErrorRecup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"jour" | "mois">("jour");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];
  const safeAgents = Array.isArray(agents) ? agents : [];

  const { enCours, todayLivraisons, livsGerant, gerantGain, excludedToday } = useMemo(() => {
    const todayLivs = safeLivraisons.filter((l) => l.date === TODAY());
    return {
      enCours: todayLivs.filter((l) => l.statut === "en_cours").length,
      todayLivraisons: todayLivs,
      livsGerant: todayLivs.filter((l) => shouldCountGerantCommission(l)),
      gerantGain: todayLivs.filter((l) => shouldCountGerantCommission(l)).length * commissionGerant,
      excludedToday: todayLivs.filter((l) => EXCLUDED_CLIENTS.includes(l.client_donneur?.toUpperCase() || "") && (Number(l.frais) || 0) > 0),
    };
  }, [safeLivraisons, commissionGerant]);

  const availableMonths = useMemo(() => {
    const months = new Set(safeLivraisons.map((l) => l.date?.slice(0, 7)).filter(Boolean));
    months.add(currentMonth());
    return [...months].sort().reverse() as string[];
  }, [safeLivraisons]);

  const selectedMonthLivraisons = useMemo(() => {
    return safeLivraisons.filter((l) => l.date && l.date.startsWith(selectedMonth)).sort((a, b) => b.date.localeCompare(a.date));
  }, [safeLivraisons, selectedMonth]);

  const handleStatusUpdate = async (id: string, updates: Record<string, unknown>) => {
    try {
      await livraisonCrud.update(id, updates);
      if (updates.statut) {
        const label = STATUS_OPTIONS.find((s) => s.key === updates.statut)?.label || String(updates.statut);
        showToast(updates.remarque ? `${label} — motif enregistré` : `Statut: ${label}`);
      } else if (updates.montant !== undefined) {
        showToast("Montant modifié");
      }
    } catch {
      showToast("Erreur mise à jour", "error");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingRecup(true);
      setErrorRecup(null);
      try {
        const { getRecuperationsByDate: fetchRecup } = await import("../services/recuperationService");
        const { currentCompany } = useCompany();
        const data = await fetchRecup(selectedDate, currentCompany!.id) || [];
        if (!cancelled) setRecuperationsJour(data);
      } catch (e: unknown) {
        if (!cancelled) {
          logger.error("Erreur récupérations:", e);
          setErrorRecup("Erreur lors du chargement.");
        }
      } finally {
        if (!cancelled) setLoadingRecup(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedDate]);

  const { totalRecuperationsJour, nbRecuperationsJour, recuperationsParLivreur } = useMemo(() => {
    const total = recuperationsJour.reduce((s, r) => s + (r.frais_recuperation || 0), 0);
    const parLivreur: Record<string, RecupParLivreur> = recuperationsJour.reduce((acc, r) => {
      const nom = r.livreur_nom;
      if (!acc[nom]) acc[nom] = { livreur: nom, total: 0, nb: 0, details: [] };
      acc[nom].total += r.frais_recuperation ?? 0;
      acc[nom].nb += 1;
      acc[nom].details.push({ client: r.client_donneur, frais: r.frais_recuperation ?? 0 });
      return acc;
    }, {} as Record<string, RecupParLivreur>);
    return { totalRecuperationsJour: total, nbRecuperationsJour: recuperationsJour.length, recuperationsParLivreur: parLivreur };
  }, [recuperationsJour]);

  const agentStats = useMemo(() => {
    return safeAgents.map((a) => {
      const ls = safeLivraisons.filter((l) => agentMatch(l, a));
      return {
        agent: a,
        ls,
        totalFrais: ls.reduce((s, l) => s + (Number(l.frais) || 0), 0),
        livres: ls.filter((l) => l.statut === "livre").length,
        retournes: ls.filter((l) => l.statut === "retourne").length,
        reportes: ls.filter((l) => l.statut === "reporte").length,
        taux: ls.length ? Math.round((ls.filter((l) => l.statut === "livre").length / ls.length) * 100) : 0,
      };
    });
  }, [safeAgents, safeLivraisons]);

  const totalLivraisons = safeLivraisons.length;
  const totalLivres = safeLivraisons.filter((l) => l.statut === "livre").length;
  const todayLivres = todayLivraisons.filter((l) => l.statut === "livre").length;
  const todayMontant = todayLivraisons.reduce((s, l) => s + (Number(l.montant) || 0), 0);
  const monthMontant = selectedMonthLivraisons.reduce((s, l) => s + (Number(l.montant) || 0), 0);
  const monthFrais = selectedMonthLivraisons.reduce((s, l) => s + (Number(l.frais) || 0), 0);
  const tauxReussite = totalLivraisons ? Math.round((totalLivres / totalLivraisons) * 100) : 0;

  /* ─── Sparkline data (last 7 days) ─── */
  const sparklineData = useMemo(() => {
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push(safeLivraisons.filter((l) => l.date === dateStr && l.statut === "livre").length);
    }
    return days;
  }, [safeLivraisons]);

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(16px)",
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
  });

  return (
    <div>
      {/* ═══════════════════════════════════════════════════════
          HEADER HERO
          ═══════════════════════════════════════════════════════ */}
      <div
        className="relative mb-6 overflow-hidden rounded-2xl p-6"
        style={{
          ...sectionStyle(0),
          background: "linear-gradient(135deg, rgba(201,169,110,0.08) 0%, rgba(139,92,246,0.04) 50%, rgba(8,8,12,0.6) 100%)",
          border: "1px solid rgba(201,169,110,0.1)",
        }}
      >
        {/* Decorative blurs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: "rgba(201,169,110,0.06)" }} />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full blur-3xl" style={{ background: "rgba(139,92,246,0.04)" }} />
        {/* Subtle grid pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle, var(--gold) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden shrink-0"
                style={{
                  border: "2px solid rgba(201,169,110,0.25)",
                  background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))",
                  boxShadow: "0 0 30px rgba(201,169,110,0.08)",
                }}
              >
                <Image src="/logo.png" alt="HT-GesCom" width={40} height={40} priority className="object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Tableau de bord
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>{currentCompany?.name || "HT-GesCom"}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(201,169,110,0.1)", color: "var(--gold)" }}>
                    {currentCompany?.type === "service" ? "Service" : "Commerce"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick stats pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Aujourd'hui", value: `${todayLivraisons.length} livraison${todayLivraisons.length !== 1 ? "s" : ""}`, color: "var(--gold)", bg: "rgba(201,169,110,0.08)", border: "rgba(201,169,110,0.12)" },
                { label: "Montant du jour", value: formatAr(todayMontant), color: "var(--success)", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.12)" },
                { label: "Taux réussite", value: `${tauxReussite}%`, color: tauxReussite >= 70 ? "var(--success)" : tauxReussite >= 40 ? "var(--gold)" : "var(--danger)", bg: tauxReussite >= 70 ? "rgba(52,211,153,0.08)" : tauxReussite >= 40 ? "rgba(201,169,110,0.08)" : "rgba(248,113,113,0.08)", border: tauxReussite >= 70 ? "rgba(52,211,153,0.12)" : tauxReussite >= 40 ? "rgba(201,169,110,0.12)" : "rgba(248,113,113,0.12)" },
              ].map((q) => (
                <div key={q.label} className="rounded-full px-3.5 py-2 border" style={{ background: q.bg, borderColor: q.border }}>
                  <span className="mr-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>{q.label}</span>
                  <span className="text-[12px] font-bold" style={{ color: q.color }}>{q.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STAT CARDS
          ═══════════════════════════════════════════════════════ */}
      <div className={`mb-6 grid gap-4 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`} style={sectionStyle(0.1)}>
        <StatCard
          label="Total livraisons"
          value={totalLivraisons}
          color="accent"
          icon={<Icon d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" size={18} />}
          sub={totalLivres > 0 ? `${totalLivres} livrés au total` : undefined}
        />
        <StatCard
          label="En cours"
          value={enCours}
          color="warning"
          icon={<Icon d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2" size={18} />}
          sub={todayLivraisons.length > 0 ? `sur ${todayLivraisons.length} aujourd'hui` : undefined}
        />
        <StatCard
          label="Livrés aujourd'hui"
          value={todayLivres}
          color="success"
          icon={<Icon d="M20 6L9 17l-5-5" size={18} />}
          sub={sparklineData.length >= 2 ? "7 derniers jours" : undefined}
        />
        <StatCard
          label="Montant du mois"
          value={formatAr(monthMontant)}
          color="purple"
          icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} />}
          sub={`${selectedMonthLivraisons.length} livraison${selectedMonthLivraisons.length !== 1 ? "s" : ""}`}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════
          RACCOURCIS
          ═══════════════════════════════════════════════════════ */}
      <div className={`mb-6 grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`} style={sectionStyle(0.2)}>
        {[
          { label: "Nouvelle livraison", icon: "M12 5v14M5 12h14", href: "/livraison/livraisons", color: "var(--gold)", bg: "rgba(201,169,110,0.06)" },
          { label: "Historique", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8", href: "/livraison/historique", color: "var(--violet)", bg: "rgba(139,92,246,0.06)" },
          { label: "Agents", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75", href: "/livraison/agents", color: "var(--success)", bg: "rgba(52,211,153,0.06)" },
          { label: "Récap", icon: "M18 20V10M12 20V4M6 20v-6", href: "/livraison/recap", color: "var(--info)", bg: "rgba(96,165,250,0.06)" },
        ].map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => router.push(r.href)}
            className="group flex items-center gap-3 rounded-xl p-4 text-left btn-press transition-all duration-200"
            style={{
              border: "1px solid var(--border-subtle)",
              background: "var(--box, var(--bg-card))",
              "--box": "var(--bg-card)",
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = r.color;
              (e.currentTarget as HTMLElement).style.background = r.bg;
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${r.color}15`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
              (e.currentTarget as HTMLElement).style.background = "var(--bg-card)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 transition-colors duration-200"
              style={{ background: `${r.color}12`, color: r.color }}
            >
              <Icon d={r.icon} size={18} />
            </div>
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{r.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          LIVRAISONS
          ═══════════════════════════════════════════════════════ */}
      <div className="mb-6" style={sectionStyle(0.3)}><Card>
        <CardHeader className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(201,169,110,0.1)", color: "var(--gold)" }}>
              <Icon d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" size={15} className="text-current" />
            </div>
            <CardTitle className="text-base">Livraisons</CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { const p = new Date(selectedMonth + "-01"); p.setMonth(p.getMonth() - 1); setSelectedMonth(p.toISOString().slice(0, 7)); setActiveTab("mois"); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg btn-press transition-colors"
              style={{ border: "1px solid var(--border-default)", color: "var(--text-primary)", background: "var(--bg-elevated)" }}
            >‹</button>
            <select
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setActiveTab("mois"); }}
              className="min-w-[130px] rounded-full px-3 py-1.5 text-center text-xs font-semibold outline-none"
              style={{ border: "1.5px solid var(--gold)", background: "rgba(201,169,110,0.08)", color: "var(--gold)" }}
            >
              {availableMonths.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <button
              type="button"
              onClick={() => { const n = new Date(selectedMonth + "-01"); n.setMonth(n.getMonth() + 1); const s = n.toISOString().slice(0, 7); if (s <= currentMonth()) { setSelectedMonth(s); setActiveTab("mois"); } }}
              disabled={selectedMonth >= currentMonth()}
              className="flex h-8 w-8 items-center justify-center rounded-lg btn-press transition-colors disabled:cursor-not-allowed"
              style={{ border: "1px solid var(--border-default)", color: selectedMonth >= currentMonth() ? "var(--text-faint)" : "var(--text-primary)", background: "var(--bg-elevated)", opacity: selectedMonth >= currentMonth() ? 0.5 : 1 }}
            >›</button>
          </div>
        </CardHeader>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 px-5">
          {(["jour", "mois"] as const).map((tab) => {
            const isActive = activeTab === tab;
            const count = tab === "jour" ? todayLivraisons.length : selectedMonthLivraisons.length;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="rounded-full px-4 py-1.5 text-[11px] font-semibold btn-press transition-all"
                style={{
                  border: isActive ? "1.5px solid var(--gold)" : "1.5px solid var(--border-default)",
                  background: isActive ? "rgba(201,169,110,0.08)" : "transparent",
                  color: isActive ? "var(--gold)" : "var(--text-muted)",
                  boxShadow: isActive ? "0 0 12px rgba(201,169,110,0.1)" : "none",
                }}
              >
                {tab === "jour" ? `Aujourd'hui (${count})` : `${monthLabel(selectedMonth)} (${count})`}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === "jour" ? (
          todayLivraisons.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-4xl mb-2">📦</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune livraison aujourd'hui.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 px-5 pb-5">
              {todayLivraisons.map((l, idx) => (
                <div
                  key={l.id}
                  className="flex items-center gap-3 rounded-xl p-3.5 transition-all duration-200"
                  style={{
                    ...sectionStyle(0.35 + idx * 0.03),
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-elevated)",
                    borderLeft: `3px solid ${statusBarColor(l.statut)}`,
                  }}
                >
                  {/* Status icon */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: statusBgColor(l.statut), color: statusTextColor(l.statut) }}
                  >
                    <StatusIcon name={STATUS_OPTIONS.find((s) => s.key === l.statut)?.icon || "clock"} size={18} className="text-current" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{l.colis}</span>
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ background: statusBgColor(l.statut), color: statusTextColor(l.statut) }}
                      >
                        {statusLabel(l.statut)}
                      </span>
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {l.client_donneur || "—"} → {l.destinataire || "—"}{l.agent_nom ? ` · ${l.agent_nom}` : ""}
                    </div>
                  </div>

                  {/* Montant */}
                  <div
                    className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold"
                    style={{ background: "rgba(201,169,110,0.08)", color: "var(--gold)" }}
                  >
                    {l.montant ? formatAr(l.montant) : "—"}
                  </div>

                  <StatusButtons livraison={l} onUpdate={handleStatusUpdate} />
                </div>
              ))}
            </div>
          )
        ) : (
          selectedMonthLivraisons.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-4xl mb-2">📦</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune livraison en {monthLabel(selectedMonth)}.</div>
            </div>
          ) : (
            <div className="px-5 pb-5">
              {/* Month summary */}
              <div className={`mb-4 grid gap-2.5 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
                {[
                  { label: "Total", value: selectedMonthLivraisons.length, color: "var(--gold)" },
                  { label: "Livrés", value: selectedMonthLivraisons.filter((l) => l.statut === "livre").length, color: "var(--success)" },
                  { label: "En cours", value: selectedMonthLivraisons.filter((l) => l.statut === "en_cours").length, color: "var(--gold)" },
                  { label: "Frais", value: formatAr(monthFrais), color: "var(--violet)" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl py-2.5 text-center" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
                    <div className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</div>
                    <div className="mt-0.5 text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* List */}
              <div className="flex flex-col gap-2">
                {selectedMonthLivraisons.map((l, idx) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 rounded-xl p-3 transition-all duration-200"
                    style={{
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-elevated)",
                      borderLeft: `3px solid ${statusBarColor(l.statut)}`,
                    }}
                  >
                    {/* Date badge */}
                    <div
                      className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl"
                      style={{ background: statusBgColor(l.statut), color: statusTextColor(l.statut) }}
                    >
                      <span className="text-[14px] font-extrabold leading-none" style={{ color: statusTextColor(l.statut) }}>{l.date.split("-")[2]}</span>
                      <span className="text-[8px] uppercase" style={{ color: "var(--text-muted)" }}>
                        {["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"][parseInt(l.date.split("-")[1]) - 1]}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{l.colis}</span>
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                          style={{ background: statusBgColor(l.statut), color: statusTextColor(l.statut) }}
                        >
                          {statusLabel(l.statut)}
                        </span>
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {l.client_donneur || "—"} → {l.destinataire || "—"}{l.agent_nom ? ` · ${l.agent_nom}` : ""}
                      </div>
                    </div>

                    <div
                      className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{ background: "rgba(201,169,110,0.08)", color: "var(--gold)" }}
                    >
                      {l.montant ? formatAr(l.montant) : "—"}
                    </div>

                    <StatusButtons livraison={l} onUpdate={handleStatusUpdate} />
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </Card></div>

      {/* ═══════════════════════════════════════════════════════
          RÉCUPÉRATIONS + GÉRANT (side by side on desktop)
          ═══════════════════════════════════════════════════════ */}
      <div className={`mb-6 grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`} style={sectionStyle(0.4)}>
        {/* RÉCUPÉRATIONS */}
        <Card>
          <CardHeader className="px-5 pt-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(52,211,153,0.1)", color: "var(--success)" }}>
                <Icon d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9" size={15} className="text-current" />
              </div>
              <div>
                <CardTitle className="text-base">Récupérations matinales</CardTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xl font-extrabold" style={{ color: "var(--success)" }}>{formatAr(totalRecuperationsJour)}</span>
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{nbRecuperationsJour} récup.</span>
                </div>
              </div>
            </div>
            <Input type="date" label="Date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </CardHeader>

          {loadingRecup && <SkeletonGrid cols={1} rows={2} />}
          {errorRecup && (
            <div className="mx-4 mb-4 rounded-xl p-3.5 text-center text-sm" style={{ background: "var(--danger-dim)", color: "var(--danger)" }}>
              {errorRecup}
            </div>
          )}
          {!loadingRecup && !errorRecup && Object.keys(recuperationsParLivreur).length > 0 ? (
            <div className="px-5 pb-5">
              <div className="flex flex-col gap-2.5">
                {Object.values(recuperationsParLivreur).map((rl) => (
                  <div key={rl.livreur} className="rounded-xl p-3.5" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
                    <div className="mb-2 flex justify-between items-center">
                      <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{rl.livreur}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(52,211,153,0.08)", color: "var(--success)" }}>
                        {rl.nb} récup. · {formatAr(rl.total)}
                      </span>
                    </div>
                    {rl.details.map((d, idx) => (
                      <div key={idx} className={`flex justify-between py-1.5 text-[11px] ${idx < rl.details.length - 1 ? "border-b" : ""}`} style={{ borderColor: "var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>{d.client}</span>
                        <span className="font-semibold" style={{ color: "var(--success)" }}>{formatAr(d.frais)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            !loadingRecup && !errorRecup && (
              <div className="py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>Aucune récupération pour cette date.</div>
            )
          )}
        </Card>

        {/* GÉRANT */}
        <div
          className="relative overflow-hidden rounded-2xl p-6"
          style={{
            border: "1px solid rgba(201,169,110,0.15)",
            background: "linear-gradient(135deg, rgba(201,169,110,0.06) 0%, rgba(139,92,246,0.03) 100%)",
          }}
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl" style={{ background: "rgba(201,169,110,0.08)" }} />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full blur-2xl" style={{ background: "rgba(139,92,246,0.05)" }} />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--gold)" }}>
                <Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={14} className="text-current" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--gold)" }}>Gérant — Aujourd'hui</span>
                <CardTitle className="text-base mt-0.5">Commission du jour</CardTitle>
              </div>
            </div>

            <div className="text-4xl font-black tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
              {formatAr(gerantGain)}
            </div>
            <div className="text-[12px] mb-4" style={{ color: "var(--text-muted)" }}>
              {livsGerant.length} livraisons × {formatAr(commissionGerant)}
            </div>

            {excludedToday.length > 0 && (
              <div className="mb-4 flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg" style={{ background: "rgba(201,169,110,0.06)", color: "var(--gold)" }}>
                <span>⚠️</span>
                <span>{excludedToday.length} livraison{excludedToday.length !== 1 ? "s" : ""} exclue{excludedToday.length !== 1 ? "s" : ""}</span>
              </div>
            )}

            <Button variant="primary" onClick={() => router.push("/livraison/gerant")} className="w-full">
              Voir détails →
            </Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          RÉCAP PAR AGENT
          ═══════════════════════════════════════════════════════ */}
      <div className="mb-6" style={sectionStyle(0.5)}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(139,92,246,0.1)", color: "var(--violet)" }}>
              <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" size={15} className="text-current" />
            </div>
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Récap par agent</h2>
          </div>
          <Badge variant="default" size="sm">Tous temps</Badge>
        </div>

        {safeAgents.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun agent enregistré.</div>
          </Card>
        ) : (
          <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-[repeat(auto-fill,minmax(340px,1fr))]"}`}>
            {agentStats.map(({ agent, ls, totalFrais, livres, retournes, reportes, taux }, idx) => (
              <div
                key={agent.id}
                className="rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  ...sectionStyle(0.55 + idx * 0.05),
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-card)",
                }}
              >
                {/* Agent header */}
                <div className="px-4 py-3.5" style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.04) 0%, rgba(139,92,246,0.03) 100%)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-extrabold"
                      style={{
                        background: "linear-gradient(135deg, var(--gold), var(--violet))",
                        color: "var(--bg-primary)",
                        boxShadow: "0 0 20px rgba(201,169,110,0.15)",
                      }}
                    >
                      {agent.nom?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold" style={{ color: "var(--text-primary)" }}>{agent.nom}</div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{ls.length} livraison{ls.length !== 1 ? "s" : ""}</div>
                    </div>
                    <div
                      className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                      style={{
                        background: taux >= 70 ? "rgba(52,211,153,0.08)" : taux >= 40 ? "rgba(201,169,110,0.08)" : "rgba(248,113,113,0.08)",
                        color: taux >= 70 ? "var(--success)" : taux >= 40 ? "var(--gold)" : "var(--danger)",
                      }}
                    >
                      {taux}%
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="p-4">
                  <div className="mb-3 grid grid-cols-4 gap-2">
                    {[
                      { label: "Livrés", value: livres, color: "var(--success)" },
                      { label: "Retournés", value: retournes, color: "var(--danger)" },
                      { label: "Reportés", value: reportes, color: "var(--violet)" },
                      { label: "Frais", value: formatAr(totalFrais), color: "var(--gold)" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg py-2 text-center" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
                        <div className="text-sm font-extrabold leading-none" style={{ color: item.color }}>{item.value}</div>
                        <div className="mt-1 text-[8px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>Taux de réussite</span>
                      <span className="text-[9px] font-bold" style={{ color: taux >= 70 ? "var(--success)" : taux >= 40 ? "var(--gold)" : "var(--danger)" }}>{taux}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-elevated)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${taux}%`,
                          background: taux >= 70
                            ? "linear-gradient(90deg, var(--success), #34d399)"
                            : taux >= 40
                            ? "linear-gradient(90deg, var(--gold), #d4b87a)"
                            : "linear-gradient(90deg, var(--danger), #f87171)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
