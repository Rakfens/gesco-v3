// src/modules/livraison/pages/Recap.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { logger } from "@/lib/logger";
import {
  Badge, Button, Input, Modal, ModalBody, ModalFooter, ModalHeader, Select,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Agent, Avance, Livraison, Recuperation } from "@/modules/shared/types";
import {
  COMMISSION_DEFAUT, currentMonth, formatAr, monthLabel, shouldCountGerantCommission, TODAY,
} from "@/modules/shared/utils/constants";
import { getRecuperationsByMonth } from "../services/recuperationService";
import { StatusIcon } from "@/modules/shared/components/ui/Icons";

interface AgentStats extends Agent {
  nbLivs: number;
  nbLivres: number;
  nbRetours: number;
  nbReportes: number;
  totalFrais: number;
  totalAvances: number;
  netSalaire: number;
  avances: Avance[];
  recuperations: Recuperation[];
  totalRecuperations: number;
  nbRecuperations: number;
}

function livsGerant(arr: Livraison[]) {
  return arr.filter((l) => shouldCountGerantCommission(l));
}

/* ─── Status config ─── */
const STATUS_CFG = [
  { key: "livre", label: "Livrés", color: "#34d399", bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.15)", icon: "check" },
  { key: "retourne", label: "Retournés", color: "#f87171", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.15)", icon: "rotate-left" },
  { key: "reporte", label: "Reportés", color: "#8b5cf6", bg: "rgba(139,92,246,0.06)", border: "rgba(139,92,246,0.15)", icon: "xmark" },
  { key: "en_cours", label: "En cours", color: "#c9a96e", bg: "rgba(201,169,110,0.06)", border: "rgba(201,169,110,0.15)", icon: "clock" },
] as const;

/* ─── SVG Icons ─── */
const ChartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const TrendUpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);
const TrendDownIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" />
  </svg>
);
const CrownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
  </svg>
);
const WalletIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);
const RefreshIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 10.49-3.74" />
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default function Recap() {
  const { livraisons, avances, agents, showToast, avanceCrud } = useApp();
  const { currentCompany } = useCompany();
  const commissionGerant = COMMISSION_DEFAUT;
  const isMobile = useIsMobile();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [avanceAgentId, setAvanceAgentId] = useState("");
  const [avanceMontant, setAvanceMontant] = useState("");
  const [avanceMotif, setAvanceMotif] = useState("");
  const [recuperationsMois, setRecuperationsMois] = useState<Recuperation[]>([]);
  const [loadingRecup, setLoadingRecup] = useState(false);
  const [confirmAvance, setConfirmAvance] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];
  const safeAvances = Array.isArray(avances) ? avances : [];
  const safeAgents = Array.isArray(agents) ? agents : [];

  const months = useMemo(() => {
    const s = new Set(safeLivraisons.map((l) => l.date?.slice(0, 7)).filter(Boolean));
    s.add(currentMonth());
    return [...s].sort().reverse() as string[];
  }, [safeLivraisons]);

  const { monthLivs, monthAvances } = useMemo(() => ({
    monthLivs: safeLivraisons.filter((l) => l.date?.startsWith(selectedMonth)),
    monthAvances: safeAvances.filter((a) => a.mois === selectedMonth && !a.annule),
  }), [safeLivraisons, safeAvances, selectedMonth]);

  useEffect(() => {
    const load = async () => {
      setLoadingRecup(true);
      try {
        if (!currentCompany?.id) return;
        const data = await getRecuperationsByMonth(selectedMonth, currentCompany.id);
        setRecuperationsMois(data || []);
      } catch (error: unknown) {
        logger.error("Erreur récupérations:", error);
      } finally { setLoadingRecup(false); }
    };
    load();
  }, [selectedMonth, currentCompany?.id]);

  const monthStatsByAgent: AgentStats[] = useMemo(() => {
    return safeAgents.map((ag) => {
      const ls = monthLivs.filter((l) => l.agent_id === ag.id || l.agent_nom === ag.nom);
      const av = monthAvances.filter((a) => a.agent_id === ag.id);
      const recups = recuperationsMois.filter((r) => r.livreur_nom === ag.nom);
      const totalRecups = recups.reduce((s, r) => s + (r.frais_recuperation || 0), 0);
      return {
        ...ag, nbLivs: ls.length,
        nbLivres: ls.filter((l) => l.statut === "livre").length,
        nbRetours: ls.filter((l) => l.statut === "retourne").length,
        nbReportes: ls.filter((l) => l.statut === "reporte").length,
        totalFrais: ls.reduce((s, l) => s + (Number(l.frais) || 0), 0),
        totalAvances: av.reduce((s, a) => s + (Number(a.montant) || 0), 0),
        netSalaire: Number(ag.salaire) || 0 - av.reduce((s, a) => s + (Number(a.montant) || 0), 0),
        avances: av, recuperations: recups, totalRecuperations: totalRecups, nbRecuperations: recups.length,
      };
    });
  }, [safeAgents, monthLivs, monthAvances, recuperationsMois]);

  const {
    monthTotalMontant, monthTotalFrais, monthTotalSalaires, monthGerantGain, monthTotalRecuperations, monthBenefice,
  } = useMemo(() => {
    const monthTotalMontant = monthLivs.filter((l) => l.paiement !== "client").reduce((s, l) => s + (Number(l.montant) || 0), 0);
    const monthTotalFrais = monthLivs.reduce((s, l) => s + (Number(l.frais) || 0), 0);
    const monthTotalSalaires = monthStatsByAgent.reduce((s, a) => s + (Number(a.salaire) || 0), 0);
    const monthGerantGain = livsGerant(monthLivs).length * commissionGerant;
    const monthTotalRecuperations = monthStatsByAgent.reduce((s, a) => s + a.totalRecuperations, 0);
    const monthBenefice = monthTotalFrais - monthTotalSalaires - monthGerantGain - monthTotalRecuperations;
    return { monthTotalMontant, monthTotalFrais, monthTotalSalaires, monthGerantGain, monthTotalRecuperations, monthBenefice };
  }, [monthLivs, monthStatsByAgent, commissionGerant]);

  const handleAddAvance = async () => {
    if (!avanceAgentId || !avanceMontant) { showToast("Agent et montant requis", "error"); return; }
    const agent = safeAgents.find((a) => a.id === avanceAgentId);
    if (!agent) { showToast("Agent invalide", "error"); return; }
    setSaving(true);
    try {
      await avanceCrud.add({ agent_id: avanceAgentId, agent_nom: agent.nom, montant: Number(avanceMontant) || 0, motif: avanceMotif, date: TODAY().split("T")[0], mois: currentMonth(), annule: false });
      setAvanceAgentId(""); setAvanceMontant(""); setAvanceMotif("");
      showToast("Avance ajoutée");
    } catch (error: unknown) {
      logger.error("Erreur avance:", error); showToast("Erreur lors de l'ajout.", "error");
    } finally { setSaving(false); }
  };

  const executeDeleteAvance = async () => {
    if (!confirmAvance) return;
    const id = confirmAvance; setConfirmAvance(null); setSaving(true);
    try { await avanceCrud.delete(id); showToast("Avance supprimée", "warn"); }
    catch { showToast("Erreur", "error"); }
    finally { setSaving(false); }
  };

  const agentOptions = useMemo(() => safeAgents.map((a) => ({ value: a.id, label: a.nom })), [safeAgents]);
  const isBeneficePositive = monthBenefice >= 0;

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  return (
    <div className="pb-8">
      {/* ═══════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════ */}
      <div
        className="relative mb-6 overflow-hidden rounded-2xl p-5"
        style={{
          ...sectionStyle(0),
          background: "linear-gradient(135deg, rgba(201,169,110,0.06) 0%, rgba(139,92,246,0.03) 100%)",
          border: "1px solid rgba(201,169,110,0.08)",
        }}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(201,169,110,0.05)" }} />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shrink-0"
              style={{
                border: "2px solid rgba(201,169,110,0.2)",
                background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))",
                boxShadow: "0 0 20px rgba(201,169,110,0.06)",
              }}
            >
              <Image src="/logo.png" alt="HT-GesCom" width={32} height={32} priority className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Récapitulatif
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {currentCompany?.name} · {monthLabel(selectedMonth)}
              </p>
            </div>
          </div>
          <Select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
            className="min-w-[150px]"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          BÉNÉFICE NET — HERO CARD
          ═══════════════════════════════════════════════════════ */}
      <div
        className="relative mb-6 overflow-hidden rounded-2xl p-6"
        style={{
          ...sectionStyle(0.1),
          border: `1px solid ${isBeneficePositive ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)"}`,
          background: isBeneficePositive
            ? "linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(52,211,153,0.02) 100%)"
            : "linear-gradient(135deg, rgba(248,113,113,0.06) 0%, rgba(248,113,113,0.02) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: isBeneficePositive ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.06)" }} />
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: isBeneficePositive ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", color: isBeneficePositive ? "var(--success)" : "var(--danger)" }}
                >
                  {isBeneficePositive ? <TrendUpIcon /> : <TrendDownIcon />}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isBeneficePositive ? "var(--success)" : "var(--danger)" }}>
                  Bénéfice net — {monthLabel(selectedMonth)}
                </span>
              </div>
              <div className={`font-black ${isMobile ? "text-[28px]" : "text-4xl"}`} style={{ color: isBeneficePositive ? "var(--success)" : "var(--danger)" }}>
                {formatAr(monthBenefice)}
              </div>
              <div className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                Frais collectés − Salaires − Commission gérant − Récupérations
              </div>
            </div>

            {/* Breakdown pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Frais", value: formatAr(monthTotalFrais), color: "var(--gold)", bg: "rgba(201,169,110,0.06)", border: "rgba(201,169,110,0.12)" },
                { label: "Salaires", value: formatAr(monthTotalSalaires), color: "var(--danger)", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.12)" },
                { label: "Commission", value: formatAr(monthGerantGain), color: "var(--violet)", bg: "rgba(139,92,246,0.06)", border: "rgba(139,92,246,0.12)" },
                { label: "Récup.", value: formatAr(monthTotalRecuperations), color: "var(--info)", bg: "rgba(96,165,250,0.06)", border: "rgba(96,165,250,0.12)" },
              ].map((p) => (
                <div key={p.label} className="rounded-xl px-3 py-2 text-center" style={{ background: p.bg, border: `1px solid ${p.border}` }}>
                  <div className="text-xs font-bold" style={{ color: p.color }}>{p.value}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{p.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          COMMISSION GÉRANT
          ═══════════════════════════════════════════════════════ */}
      <div className="mb-6 rounded-2xl p-5" style={{ ...sectionStyle(0.15), border: "1px solid rgba(201,169,110,0.1)", background: "linear-gradient(135deg, rgba(201,169,110,0.03) 0%, rgba(139,92,246,0.02) 100%)" }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(201,169,110,0.1)", color: "var(--gold)" }}>
              <CrownIcon />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
                Commission gérant
              </div>
              <div className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{formatAr(monthGerantGain)}</div>
              <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {livsGerant(monthLivs).length} livraisons × {formatAr(commissionGerant)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Frais collectés : <span className="font-bold" style={{ color: "var(--gold)" }}>{formatAr(monthTotalFrais)}</span>
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              Frais nets : <span className="font-bold" style={{ color: monthTotalFrais - monthGerantGain >= 0 ? "var(--success)" : "var(--danger)" }}>
                {formatAr(monthTotalFrais - monthGerantGain)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STATS PAR AGENT
          ═══════════════════════════════════════════════════════ */}
      <div className="mb-4 flex items-center justify-between" style={sectionStyle(0.2)}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(139,92,246,0.08)", color: "var(--violet)" }}>
            <ChartIcon />
          </div>
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Agents</h2>
        </div>
        <Badge variant="default" size="sm">{monthStatsByAgent.length} agent{monthStatsByAgent.length !== 1 ? "s" : ""}</Badge>
      </div>

      {loadingRecup && (
        <div className="flex items-center justify-center gap-2 py-3 mb-3 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <div className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: "var(--border-default)", borderTopColor: "var(--gold)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Chargement des récupérations...</span>
        </div>
      )}

      <div className="flex flex-col gap-4 mb-6">
        {monthStatsByAgent.map((a, idx) => {
          const tauxReussite = a.nbLivs > 0 ? Math.round((a.nbLivres / a.nbLivs) * 100) : 0;

          return (
            <div
              key={a.id}
              className="rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                ...sectionStyle(0.25 + idx * 0.04),
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-card)",
              }}
            >
              {/* Agent header */}
              <div className="px-4 py-3.5" style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.04) 0%, rgba(139,92,246,0.02) 100%)", borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full text-base font-extrabold shrink-0"
                    style={{
                      background: "linear-gradient(135deg, var(--gold), var(--violet))",
                      color: "var(--bg-primary)",
                      boxShadow: "0 0 12px rgba(201,169,110,0.12)",
                    }}
                  >
                    {a.nom?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{a.nom}</div>
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      <Badge variant="success" size="sm">Sal: {formatAr(a.salaire)}</Badge>
                      {a.totalAvances > 0 && <Badge variant="warning" size="sm">Av: {formatAr(a.totalAvances)}</Badge>}
                      <Badge variant={a.netSalaire >= 0 ? "success" : "danger"} size="sm">Net: {formatAr(a.netSalaire)}</Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Réussite</div>
                    <div className="text-lg font-black" style={{ color: tauxReussite >= 70 ? "var(--success)" : tauxReussite >= 40 ? "var(--gold)" : "var(--danger)" }}>
                      {tauxReussite}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="px-4 py-3">
                <div className={`grid gap-2 mb-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
                  {STATUS_CFG.map((s) => {
                    const count = s.key === "livre" ? a.nbLivres : s.key === "retourne" ? a.nbRetours : s.key === "reporte" ? a.nbReportes : a.nbLivs - a.nbLivres - a.nbRetours - a.nbReportes;
                    return (
                      <div key={s.key} className="text-center py-2 px-1 rounded-xl" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <div style={{ color: s.color }}><StatusIcon name={s.icon} size={11} className="text-current" /></div>
                        </div>
                        <div className="text-sm font-extrabold" style={{ color: s.color }}>{count}</div>
                        <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-elevated)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${tauxReussite}%`,
                        background: tauxReussite >= 70
                          ? "linear-gradient(90deg, var(--success), #34d399)"
                          : tauxReussite >= 40
                          ? "linear-gradient(90deg, var(--gold), #d4b87a)"
                          : "linear-gradient(90deg, var(--danger), #f87171)",
                      }}
                    />
                  </div>
                </div>

                {/* Frais */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-2" style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.08)" }}>
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>Frais collectés</span>
                  <span className="text-sm font-bold" style={{ color: "var(--violet)" }}>{formatAr(a.totalFrais)}</span>
                </div>

                {/* Avances */}
                {a.avances.length > 0 && (
                  <div className="mt-2 rounded-xl p-3" style={{ background: "rgba(201,169,110,0.03)", border: "1px solid rgba(201,169,110,0.08)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "rgba(201,169,110,0.1)", color: "var(--gold)" }}>
                        <WalletIcon />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
                        Avances sur salaire ({a.avances.length})
                      </span>
                    </div>
                    {a.avances.map((av) => (
                      <div key={av.id} className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: "rgba(201,169,110,0.06)" }}>
                        <div>
                          <span className="font-bold text-xs" style={{ color: "var(--gold)" }}>{formatAr(Number(av.montant) || 0)}</span>
                          {av.motif && <span className="text-[10px] ml-1.5" style={{ color: "var(--text-muted)" }}>({av.motif})</span>}
                          <span className="text-[9px] ml-1.5" style={{ color: "var(--text-faint)" }}>{av.date}</span>
                        </div>
                        <Button variant="danger" size="sm" onClick={() => setConfirmAvance(av.id)}>Supprimer</Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Récupérations */}
                {a.nbRecuperations > 0 && (
                  <div className="mt-2 rounded-xl p-3" style={{ background: "rgba(52,211,153,0.03)", border: "1px solid rgba(52,211,153,0.08)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "rgba(52,211,153,0.1)", color: "var(--success)" }}>
                          <RefreshIcon />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--success)" }}>
                          Récupérations ({a.nbRecuperations})
                        </span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: "var(--success)" }}>{formatAr(a.totalRecuperations)}</span>
                    </div>
                    {a.recuperations.slice(0, 3).map((rec, i) => (
                      <div key={i} className="flex justify-between text-[10px] py-1 border-b" style={{ borderColor: "rgba(52,211,153,0.06)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>{rec.date} · {rec.client_donneur}</span>
                        <span className="font-semibold" style={{ color: "var(--success)" }}>{formatAr(rec.frais_recuperation)}</span>
                      </div>
                    ))}
                    {a.recuperations.length > 3 && (
                      <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>+{a.recuperations.length - 3} autre(s)...</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════
          AJOUTER AVANCE
          ═══════════════════════════════════════════════════════ */}
      <div className="mb-4 flex items-center gap-2.5" style={sectionStyle(0.3)}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(251,191,36,0.08)", color: "var(--warning)" }}>
          <PlusIcon />
        </div>
        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Ajouter une avance</h2>
      </div>

      <div className="mb-6 rounded-2xl p-4" style={{ ...sectionStyle(0.35), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
        <div className={`grid gap-3 items-end ${isMobile ? "grid-cols-1" : "grid-cols-[1fr_1fr_auto]"}`}>
          <Select label="Agent" value={avanceAgentId} onChange={(e) => setAvanceAgentId(e.target.value)} options={[{ value: "", label: "-- Agent --" }, ...agentOptions]} />
          <Input type="number" label="Montant (Ar)" placeholder="50000" value={avanceMontant} onChange={(e) => setAvanceMontant(e.target.value)} />
          <Button variant="warning" onClick={handleAddAvance} loading={saving} disabled={saving} icon={<PlusIcon />}>
            Enregistrer
          </Button>
        </div>
        <div className="mt-3">
          <Input label="Motif (optionnel)" placeholder="Ex: Urgence familiale, Achat matériel..." value={avanceMotif} onChange={(e) => setAvanceMotif(e.target.value)} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          AVANCES ANNULÉES
          ═══════════════════════════════════════════════════════ */}
      {safeAvances.filter((a) => a.mois === selectedMonth && a.annule).length > 0 && (
        <div style={sectionStyle(0.4)}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(248,113,113,0.08)", color: "var(--danger)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </div>
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Avances annulées</h2>
          </div>
          {safeAvances.filter((a) => a.mois === selectedMonth && a.annule).map((av) => (
            <div key={av.id} className="flex justify-between items-center px-4 py-2.5 mb-2 rounded-xl opacity-60" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
              <div>
                <span className="line-through" style={{ color: "var(--text-muted)" }}>{av.agent_nom} — {formatAr(Number(av.montant) || 0)}</span>
                {av.motif && <span className="text-[10px] ml-1.5" style={{ color: "var(--text-muted)" }}>({av.motif})</span>}
              </div>
              <Button variant="danger" size="sm" onClick={() => setConfirmAvance(av.id)}>Définitivement</Button>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAL SUPPRESSION AVANCE
          ═══════════════════════════════════════════════════════ */}
      <Modal open={!!confirmAvance} onClose={() => setConfirmAvance(null)}>
        <ModalHeader title="Supprimer l'avance ?" onClose={() => setConfirmAvance(null)} />
        <ModalBody>
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Cette action est irréversible.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setConfirmAvance(null)}>Annuler</Button>
          <Button variant="danger" onClick={executeDeleteAvance} loading={saving}>Supprimer</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
