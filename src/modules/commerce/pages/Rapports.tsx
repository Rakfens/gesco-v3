"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Button, Card, CardTitle, StatCard,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Depense } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { getSupabase } from "@/lib/supabase";
import { getTotalAchats } from "../services/achatService";
import { fetchProduits, getAlertesStockBas } from "../services/produitService";
import { fetchVentes, getCA, getTopProduits } from "../services/venteService";

/* ─── SVG Icon helper ─── */
const Icon = ({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

/* ─── Sparkline SVG (mini courbe de tendance) ─── */
const Sparkline = ({ data, color = "var(--info)", width = 80, height = 28 }: { data: number[]; color?: string; width?: number; height?: number }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
};

/* ─── Donut Chart SVG ─── */
const DonutChart = ({ segments }: { segments: Array<{ pct: number; color: string }> }) => {
  const size = 80;
  const strokeW = 12;
  const r = (size - strokeW) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={strokeW} />
      {segments.map((seg, i) => {
        const dash = (seg.pct / 100) * circumference;
        const el = (
          <circle
            key={i}
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
};

/* ─── BarChart premium ─── */
const BarChart = ({ data }: { data: Array<{ date: string; total: number }> }) => {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex items-end gap-1.5 h-[140px] overflow-x-auto px-1 pb-1 pt-2">
      {data.map((item) => {
        const h = Math.max((item.total / maxVal) * 100, 4);
        return (
          <div key={item.date} className="flex flex-col items-center min-w-[40px] shrink-0 group">
            <div className="text-[9px] font-bold mb-1 transition-colors" style={{ color: "var(--text-muted)" }}>
              {formatAr(item.total).replace(" Ar", "")}
            </div>
            <div className="w-full h-[80px] flex items-end rounded-lg overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div
                className="w-full rounded-t-md transition-all duration-500 group-hover:opacity-90"
                style={{
                  height: `${h}%`, minHeight: 3,
                  background: "linear-gradient(180deg, rgba(96,165,250,0.9) 0%, rgba(96,165,250,0.4) 100%)",
                  boxShadow: "0 -4px 12px rgba(96,165,250,0.15)",
                }}
              />
            </div>
            <div className="text-[8px] mt-1 text-center font-medium" style={{ color: "var(--text-faint)" }}>
              {(() => {
                const d = new Date(`${item.date}T00:00:00`);
                return Number.isNaN(d.getTime()) ? item.date : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PERIOD_OPTIONS = [
  { value: "aujourdhui", label: "Aujourd'hui", getDates: () => { const d = new Date().toISOString().split("T")[0]; return { debut: d, fin: d }; } },
  { value: "semaine", label: "Semaine", getDates: () => { const t = new Date(); const diff = t.getDay() === 0 ? 6 : t.getDay() - 1; const f = new Date(t); f.setDate(t.getDate() - diff); return { debut: f.toISOString().split("T")[0], fin: t.toISOString().split("T")[0] }; } },
  { value: "mois", label: "Ce mois", getDates: () => ({ debut: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0], fin: new Date().toISOString().split("T")[0] }) },
  { value: "trimestre", label: "Trimestre", getDates: () => { const n = new Date(); const q = Math.floor(n.getMonth() / 3); return { debut: new Date(n.getFullYear(), q * 3, 1).toISOString().split("T")[0], fin: n.toISOString().split("T")[0] }; } },
  { value: "annee", label: "Année", getDates: () => ({ debut: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0], fin: new Date().toISOString().split("T")[0] }) },
];

const CAT_COLORS: Record<string, string> = {
  "Électricité": "var(--gold)", "Eau": "var(--info)", "Transport": "var(--gold)",
  "Fournitures": "var(--violet)", "Communication": "var(--info)", "Loyer": "var(--danger)",
  "Marketing": "var(--violet)", "Salaires": "var(--success)", "Entretien": "var(--gold)",
  "Impressions": "var(--gold)", "Autres": "var(--warning)",
};

const MEDAL_COLORS = ["var(--gold)", "var(--text-secondary)", "var(--gold-dark)"];

/* ─── Comparaison N-1 ─── */
function getPrevPeriod(debut: string, fin: string): { debut: string; fin: string } {
  const d = new Date(debut);
  const f = new Date(fin);
  const diffDays = Math.round((f.getTime() - d.getTime()) / 86400000);
  const prevF = new Date(d);
  prevF.setDate(prevF.getDate() - 1);
  const prevD = new Date(prevF);
  prevD.setDate(prevD.getDate() - diffDays);
  return { debut: prevD.toISOString().split("T")[0], fin: prevF.toISOString().split("T")[0] };
}

function pctChange(curr: number, prev: number): { value: string; positive: boolean } {
  if (prev === 0) return { value: curr > 0 ? "+∞" : "0%", positive: curr >= 0 };
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  return { value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

/* ═══════════════════════════════════════════════════════════
   PAGE RAPPORTS — Noir & Or Premium v2
   ═══════════════════════════════════════════════════════════ */
export default function Rapports() {
  const { currentCompany } = useCompany();
  const { error: toastError } = useApp();
  const isMobile = useIsMobile();
  const router = useRouter();

  const [period, setPeriod] = useState("mois");
  const [dateDebut, setDateDebut] = useState(PERIOD_OPTIONS[2].getDates().debut);
  const [dateFin, setDateFin] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [stats, setStats] = useState({
    ca: 0, totalVentes: 0, totalAchats: 0, marge: 0, txMarge: 0,
    nbProduits: 0, alertesStock: 0, totalDepenses: 0,
  });
  const [prevStats, setPrevStats] = useState({
    ca: 0, totalVentes: 0, totalAchats: 0, marge: 0, totalDepenses: 0,
  });
  const [ventesParJour, setVentesParJour] = useState<Array<{ date: string; total: number }>>([]);
  const [topProduits, setTopProduits] = useState<Array<{ produit_nom?: string; produit?: { nom?: string }; quantite?: number; chiffre?: number }>>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [bestDay, setBestDay] = useState<{ date: string; total: number } | null>(null);
  const [worstDay, setWorstDay] = useState<{ date: string; total: number } | null>(null);
  const [avgDay, setAvgDay] = useState(0);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const loadReports = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const prev = getPrevPeriod(dateDebut, dateFin);

      // Charger période actuelle ET précédente en parallèle
      const [ca, ventes, achatsTotal, produits, alertes, top, prevCa, prevVentes, prevAchats] = await Promise.all([
        getCA(dateDebut, dateFin),
        fetchVentes({ dateDebut, dateFin }),
        getTotalAchats(dateDebut, dateFin),
        fetchProduits(),
        getAlertesStockBas(),
        getTopProduits(10, dateDebut, dateFin),
        getCA(prev.debut, prev.fin),
        fetchVentes({ dateDebut: prev.debut, dateFin: prev.fin }),
        getTotalAchats(prev.debut, prev.fin),
      ]);

      setTopProduits(top || []);

      // Ventes par jour + best/worst/avg
      const byDay = new Map<string, number>();
      ventes.forEach((v) => {
        const date = (v.date_vente || "").split("T")[0];
        if (date) byDay.set(date, (byDay.get(date) || 0) + (v.montant_total || 0));
      });
      const sortedDays = [...byDay.entries()].map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date));
      setVentesParJour(sortedDays);

      if (sortedDays.length > 0) {
        const best = sortedDays.reduce((a, b) => a.total >= b.total ? a : b);
        const worst = sortedDays.reduce((a, b) => a.total <= b.total ? a : b);
        setBestDay(best);
        setWorstDay(worst);
        const uniqueDays = sortedDays.length;
        setAvgDay(uniqueDays > 0 ? ca / uniqueDays : 0);
      } else {
        setBestDay(null); setWorstDay(null); setAvgDay(0);
      }

      // Dépenses
      let totalDepenses = 0;
      let prevDepenses = 0;
      if (currentCompany.slug === "pomanay") {
        const [{ data: dep }, { data: prevDep }] = await Promise.all([
          getSupabase().from("depenses").select("*").eq("company_id", currentCompany.id)
            .gte("date_depense", dateDebut).lte("date_depense", dateFin).order("date_depense", { ascending: false }),
          getSupabase().from("depenses").select("*").eq("company_id", currentCompany.id)
            .gte("date_depense", prev.debut).lte("date_depense", prev.fin),
        ]);
        setDepenses(dep || []);
        totalDepenses = (dep || []).reduce((s, d) => s + (d.montant || 0), 0);
        prevDepenses = (prevDep || []).reduce((s, d) => s + (d.montant || 0), 0);
      }

      const achatsNum = Number(achatsTotal) || 0;
      const caNum = Number(ca) || 0;
      const marge = caNum - achatsNum;
      const prevAchatsNum = Number(prevAchats) || 0;
      const prevCaNum = Number(prevCa) || 0;

      setStats({
        ca: caNum, totalVentes: ventes.length, totalAchats: achatsNum, marge,
        txMarge: caNum > 0 ? parseFloat(((marge / caNum) * 100).toFixed(1)) : 0,
        nbProduits: produits.length, alertesStock: alertes.length, totalDepenses,
      });
      setPrevStats({
        ca: prevCaNum, totalVentes: prevVentes.length, totalAchats: prevAchatsNum,
        marge: prevCaNum - prevAchatsNum, totalDepenses: prevDepenses,
      });
    } catch { toastError("Erreur lors du chargement des données."); }
    finally { setLoading(false); }
  }, [currentCompany, dateDebut, dateFin, toastError]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    const opt = PERIOD_OPTIONS.find((o) => o.value === value);
    if (opt) { const dates = opt.getDates(); setDateDebut(dates.debut); setDateFin(dates.fin); }
  };

  const depensesParCategorie = useMemo(() => {
    if (!depenses.length) return [];
    const acc: Record<string, number> = {};
    depenses.forEach((d) => { const cat = d.categorie || "Autre"; acc[cat] = (acc[cat] || 0) + (d.montant || 0); });
    const total = Object.values(acc).reduce((s, v) => s + v, 0);
    return Object.entries(acc)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, totalCat]) => ({ cat, total: totalCat, pct: total > 0 ? ((totalCat / total) * 100) : 0 }));
  }, [depenses]);

  // Sparkline data (CA sur les 7 derniers jours de la période)
  const sparkData = useMemo(() => ventesParJour.map((d) => d.total), [ventesParJour]);

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  /* ─── Loading ─── */
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2" style={{ borderColor: "var(--border-default)", borderTopColor: "var(--info)" }} />
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>Chargement des rapports...</span>
    </div>
  );

  // Comparaison helpers
  const caChange = pctChange(stats.ca, prevStats.ca);
  const margeChange = pctChange(stats.marge, prevStats.marge);
  const ventesChange = pctChange(stats.totalVentes, prevStats.totalVentes);
  const depChange = pctChange(stats.totalDepenses, prevStats.totalDepenses);
  const resultNet = stats.marge - stats.totalDepenses;
  const prevResultNet = prevStats.marge - prevStats.totalDepenses;
  const resultChange = pctChange(resultNet, prevResultNet);

  return (
    <div className="pb-8">

      {/* ═══════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════ */}
      <div className="relative mb-6 overflow-hidden rounded-2xl p-5 sm:p-6" style={{
        ...sectionStyle(0),
        background: "linear-gradient(135deg, rgba(96,165,250,0.08) 0%, rgba(139,92,246,0.04) 50%, rgba(201,169,110,0.03) 100%)",
        border: "1px solid rgba(96,165,250,0.12)",
      }}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: "rgba(96,165,250,0.06)" }} />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full blur-3xl" style={{ background: "rgba(139,92,246,0.04)" }} />

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shrink-0" style={{
              border: "2px solid rgba(96,165,250,0.2)",
              background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))",
              boxShadow: "0 0 24px rgba(96,165,250,0.08)",
            }}>
              <Image src="/logo.png" alt="HT-GesCom" width={32} height={32} priority className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>Rapports</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {currentCompany?.name} · {dateDebut} → {dateFin}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push("/commerce/dashboard")} className="btn-press">← Dashboard</Button>
            <Button variant="primary" size="sm" onClick={loadReports} className="btn-press" style={{ boxShadow: "0 0 20px rgba(201,169,110,0.15)" }}>↻ Actualiser</Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          PÉRIODE
          ═══════════════════════════════════════════════════════ */}
      <div className="mb-5 rounded-2xl p-4" style={{
        ...sectionStyle(0.05),
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-card)",
      }}>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex gap-1 p-1 rounded-xl flex-wrap" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            {PERIOD_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => handlePeriodChange(opt.value)}
                className="py-2 px-4 rounded-lg text-[11px] font-bold btn-press transition-all"
                style={{
                  background: period === opt.value ? "var(--gold)" : "transparent",
                  color: period === opt.value ? "var(--bg-primary)" : "var(--text-muted)",
                  boxShadow: period === opt.value ? "0 0 12px rgba(201,169,110,0.2)" : "none",
                }}
              >{opt.label}</button>
            ))}
          </div>
          <div className="flex gap-2 items-center flex-wrap ml-auto">
            <input type="date" value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); setPeriod(""); }}
              className="py-2 px-3 rounded-lg text-xs font-medium outline-none input-focus"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
            <span className="text-xs font-bold" style={{ color: "var(--text-faint)" }}>→</span>
            <input type="date" value={dateFin} onChange={(e) => { setDateFin(e.target.value); setPeriod(""); }}
              className="py-2 px-3 rounded-lg text-xs font-medium outline-none input-focus"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          RÉSUMÉ EXÉCUTIF (3 indicateurs clés)
          ═══════════════════════════════════════════════════════ */}
      {(bestDay || worstDay) && (
        <div className={`grid gap-3 mb-5 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`} style={sectionStyle(0.08)}>
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: "rgba(52,211,153,0.1)", color: "var(--success)" }}>
              <Icon d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Meilleur jour</div>
              <div className="text-sm font-extrabold" style={{ color: "var(--success)" }}>
                {bestDay ? `${new Date(bestDay.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${formatAr(bestDay.total)}` : "—"}
              </div>
            </div>
          </div>
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: "rgba(248,113,113,0.1)", color: "var(--danger)" }}>
              <Icon d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Pire jour</div>
              <div className="text-sm font-extrabold" style={{ color: "var(--danger)" }}>
                {worstDay ? `${new Date(worstDay.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${formatAr(worstDay.total)}` : "—"}
              </div>
            </div>
          </div>
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: "rgba(201,169,110,0.1)", color: "var(--gold)" }}>
              <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Moyenne / jour</div>
              <div className="text-sm font-extrabold" style={{ color: "var(--gold)" }}>{formatAr(Math.round(avgDay))}</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          STATS — 8 cartes avec comparaison N-1
          ═══════════════════════════════════════════════════════ */}
      <div className={`grid gap-3 mb-5 ${isMobile ? "grid-cols-2" : "grid-cols-[repeat(auto-fit,minmax(180px,1fr))]"}`} style={sectionStyle(0.1)}>
        <StatCard
          label="Chiffre d'affaires" value={formatAr(stats.ca)} color="success"
          icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} />}
          sub={caChange.value !== "0%" ? `${caChange.positive ? "↑" : "↓"} ${caChange.value} vs N-1` : undefined}
        />
        <StatCard
          label="Nb ventes" value={stats.totalVentes} color="info"
          icon={<Icon d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" size={18} />}
          sub={ventesChange.value !== "0%" ? `${ventesChange.positive ? "↑" : "↓"} ${ventesChange.value} vs N-1` : undefined}
        />
        <StatCard
          label="Total achats" value={formatAr(stats.totalAchats)} color="warning"
          icon={<Icon d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" size={18} />}
        />
        <StatCard
          label="Marge brute" value={formatAr(stats.marge)}
          color={stats.marge >= 0 ? "accent" : "danger"}
          sub={`Taux : ${stats.txMarge}%`}
          icon={<Icon d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" size={18} />}
        />
        <StatCard
          label="Résultat net" value={formatAr(resultNet)}
          color={resultNet >= 0 ? "success" : "danger"}
          sub={resultChange.value !== "0%" ? `${resultChange.positive ? "↑" : "↓"} ${resultChange.value} vs N-1` : "Marge − Dépenses"}
          icon={<Icon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" size={18} />}
        />
        <StatCard label="Produits" value={stats.nbProduits} color="info"
          icon={<Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={18} />}
        />
        <StatCard
          label="Alertes stock" value={stats.alertesStock}
          color={stats.alertesStock > 0 ? "danger" : "success"}
          sub={stats.alertesStock > 0 ? "Stock bas ou rupture" : "Tout est OK"}
          icon={<Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" size={18} />}
        />
        {currentCompany?.slug === "pomanay" && (
          <StatCard
            label="Dépenses" value={formatAr(stats.totalDepenses)} color="danger"
            icon={<Icon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" size={18} />}
            sub={depChange.value !== "0%" ? `${depChange.positive ? "↑" : "↓"} ${depChange.value} vs N-1` : undefined}
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          ÉVOLUTION VENTES + SPARKLINE
          ═══════════════════════════════════════════════════════ */}
      {ventesParJour.length > 0 && (
        <div className="mb-5 rounded-2xl overflow-hidden" style={{
          ...sectionStyle(0.15),
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-card)",
        }}>
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(96,165,250,0.1)", color: "var(--info)" }}>
                <Icon d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" size={14} />
              </div>
              <CardTitle className="text-sm">Évolution des ventes</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {sparkData.length >= 2 && <Sparkline data={sparkData} color="var(--info)" width={60} height={24} />}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(96,165,250,0.08)", color: "var(--info)" }}>
                {ventesParJour.length} jour{ventesParJour.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="px-4 py-4">
            <BarChart data={ventesParJour} />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TOP PRODUITS + DÉPENSES (côte à côte desktop)
          ═══════════════════════════════════════════════════════ */}
      <div className={`grid gap-5 mb-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>

        {/* Top Produits */}
        {topProduits.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{
            ...sectionStyle(0.2),
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-card)",
          }}>
            <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(201,169,110,0.1)", color: "var(--gold)" }}>
                <span className="text-sm">🏆</span>
              </div>
              <CardTitle className="text-sm">Top {topProduits.length} produits</CardTitle>
            </div>
            {isMobile ? (
              <div className="p-3 flex flex-col gap-2">
                {topProduits.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-extrabold shrink-0" style={{
                      background: idx < 3 ? `${MEDAL_COLORS[idx]}15` : "var(--bg-card)",
                      color: idx < 3 ? MEDAL_COLORS[idx] : "var(--text-muted)",
                      border: idx < 3 ? `1px solid ${MEDAL_COLORS[idx]}30` : "1px solid var(--border-subtle)",
                    }}>{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{p.produit_nom || p.produit?.nom || "—"}</div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Qté: {p.quantite}</div>
                    </div>
                    <div className="text-xs font-bold" style={{ color: "var(--success)" }}>{formatAr(p.chiffre)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader className="w-12">#</TableHeader>
                    <TableHeader>Produit</TableHeader>
                    <TableHeader align="right">Qté</TableHeader>
                    <TableHeader align="right">CA</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topProduits.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold" style={{
                          background: idx < 3 ? `${MEDAL_COLORS[idx]}15` : "var(--bg-elevated)",
                          color: idx < 3 ? MEDAL_COLORS[idx] : "var(--text-muted)",
                          border: idx < 3 ? `1px solid ${MEDAL_COLORS[idx]}30` : "1px solid var(--border-subtle)",
                        }}>{idx + 1}</div>
                      </TableCell>
                      <TableCell className="font-semibold text-xs"><span style={{ color: "var(--text-primary)" }}>{p.produit_nom || p.produit?.nom || "—"}</span></TableCell>
                      <TableCell align="right" className="text-xs font-semibold"><span style={{ color: "var(--text-secondary)" }}>{p.quantite}</span></TableCell>
                      <TableCell align="right" className="font-bold text-xs"><span style={{ color: "var(--success)" }}>{formatAr(p.chiffre)}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Dépenses par catégorie avec Donut */}
        {currentCompany?.slug === "pomanay" && depensesParCategorie.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{
            ...sectionStyle(0.2),
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-card)",
          }}>
            <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(248,113,113,0.1)", color: "var(--danger)" }}>
                <Icon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" size={14} />
              </div>
              <CardTitle className="text-sm">Dépenses par catégorie</CardTitle>
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(248,113,113,0.08)", color: "var(--danger)" }}>
                {formatAr(stats.totalDepenses)}
              </span>
            </div>
            <div className="p-5">
              {/* Donut + légende */}
              <div className="flex items-center gap-5 mb-4">
                <DonutChart segments={depensesParCategorie.map((d) => ({ pct: d.pct, color: CAT_COLORS[d.cat] || "var(--gold)" }))} />
                <div className="flex-1 space-y-1.5">
                  {depensesParCategorie.slice(0, 4).map((d) => (
                    <div key={d.cat} className="flex items-center gap-2 text-[10px]">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: CAT_COLORS[d.cat] || "var(--gold)" }} />
                      <span className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{d.cat}</span>
                      <span className="ml-auto font-bold shrink-0" style={{ color: "var(--text-muted)" }}>{d.pct.toFixed(0)}%</span>
                    </div>
                  ))}
                  {depensesParCategorie.length > 4 && (
                    <div className="text-[10px]" style={{ color: "var(--text-faint)" }}>+{depensesParCategorie.length - 4} autres</div>
                  )}
                </div>
              </div>
              {/* Barres détaillées */}
              {depensesParCategorie.map(({ cat, total, pct }, idx) => {
                const color = CAT_COLORS[cat] || "var(--gold)";
                return (
                  <div key={cat} className="mb-2.5 last:mb-0">
                    <div className="flex justify-between mb-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}40` }} />
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{cat}</span>
                      </div>
                      <span className="font-semibold" style={{ color: "var(--text-muted)" }}>{formatAr(total)} · {pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                        boxShadow: `0 0 8px ${color}30`,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          RENTABILITÉ — Bloc synthétique
          ═══════════════════════════════════════════════════════ */}
      <div className="rounded-2xl overflow-hidden" style={{
        ...sectionStyle(0.25),
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-card)",
      }}>
        <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(201,169,110,0.1)", color: "var(--gold)" }}>
            <Icon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" size={14} />
          </div>
          <CardTitle className="text-sm">Synthèse de rentabilité</CardTitle>
        </div>
        <div className={`p-5 ${isMobile ? "grid grid-cols-1 gap-4" : "grid grid-cols-4 gap-5"}`}>
          {/* CA */}
          <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Chiffre d'affaires</div>
            <div className="text-lg font-extrabold" style={{ color: "var(--success)" }}>{formatAr(stats.ca)}</div>
            {caChange.value !== "0%" && (
              <div className={`text-[10px] font-bold mt-1 ${caChange.positive ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                {caChange.positive ? "↑" : "↓"} {caChange.value} vs période précédente
              </div>
            )}
          </div>
          {/* Achats */}
          <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Coût des achats</div>
            <div className="text-lg font-extrabold" style={{ color: "var(--warning)" }}>{formatAr(stats.totalAchats)}</div>
            <div className="text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>{stats.txMarge}% de marge</div>
          </div>
          {/* Dépenses */}
          <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Dépenses</div>
            <div className="text-lg font-extrabold" style={{ color: "var(--danger)" }}>{formatAr(stats.totalDepenses)}</div>
            {depChange.value !== "0%" && (
              <div className={`text-[10px] font-bold mt-1 ${depChange.positive ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                {depChange.positive ? "↑" : "↓"} {depChange.value} vs période précédente
              </div>
            )}
          </div>
          {/* Résultat net */}
          <div className="rounded-xl p-4" style={{
            background: resultNet >= 0 ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.06)",
            border: `1px solid ${resultNet >= 0 ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)"}`,
          }}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Résultat net</div>
            <div className="text-lg font-extrabold" style={{ color: resultNet >= 0 ? "var(--success)" : "var(--danger)" }}>{formatAr(resultNet)}</div>
            {resultChange.value !== "0%" && (
              <div className={`text-[10px] font-bold mt-1 ${resultChange.positive ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                {resultChange.positive ? "↑" : "↓"} {resultChange.value} vs période précédente
              </div>
            )}
          </div>
        </div>
        {/* Barre de progression rentabilité */}
        {stats.ca > 0 && (
          <div className="px-5 pb-5">
            <div className="flex gap-1 h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div className="rounded-l-full transition-all duration-700" style={{
                width: `${Math.min((stats.totalAchats / stats.ca) * 100, 100)}%`,
                background: "linear-gradient(90deg, var(--warning), var(--warning))",
              }} />
              <div className="transition-all duration-700" style={{
                width: `${Math.min((stats.totalDepenses / stats.ca) * 100, 100 - (stats.totalAchats / stats.ca) * 100)}%`,
                background: "linear-gradient(90deg, var(--danger), var(--danger))",
              }} />
              <div className="rounded-r-full transition-all duration-700" style={{
                width: `${Math.max((resultNet / stats.ca) * 100, 0)}%`,
                background: "linear-gradient(90deg, var(--success), var(--success))",
              }} />
            </div>
            <div className="flex justify-between mt-2 text-[9px] font-semibold">
              <span style={{ color: "var(--warning)" }}>Achats {((stats.totalAchats / stats.ca) * 100).toFixed(0)}%</span>
              <span style={{ color: "var(--danger)" }}>Dépenses {((stats.totalDepenses / stats.ca) * 100).toFixed(0)}%</span>
              <span style={{ color: "var(--success)" }}>Résultat {((resultNet / stats.ca) * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
