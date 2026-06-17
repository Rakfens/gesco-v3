"use client";

import { useEffect, useState, useCallback } from "react";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";
import {
  Card, CardHeader, CardTitle, StatCard, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { SkeletonGrid } from "@/modules/shared/components/ui/Skeleton";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import type { Depense } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { getTotalAchats } from "../services/achatService";
import { fetchProduits, getAlertesStockBas } from "../services/produitService";
import { fetchVentes, getCA, getTopProduits } from "../services/venteService";

const Icon = ({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
  <path d={d} />
  </svg>
);

/* ─── Inline StatCard ─── */
const StatCard2 = ({ label, value, colorClass, sub }: { label: string; value: string | number; colorClass: string; sub?: string }) => (
  <div className={`bg-[#111114] rounded-xl border border-[#1e1e24] py-3.5 px-4 border-l-[3px] ${colorClass}`}>
  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{label}</div>
  <div className="text-xl font-extrabold text-white leading-tight">{value}</div>
  {sub && <div className="text-[10px] text-zinc-500 mt-0.5">{sub}</div>}
  </div>
);

/* ─── BarChart ─── */
const BarChart = ({ data, colorClass = "bg-blue-400" }: { data: Array<{ date: string; total: number }>; colorClass?: string }) => {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex items-end gap-1 h-[120px] overflow-x-auto px-1 pb-1">
    {data.map((item) => {
      const h = Math.max((item.total / maxVal) * 100, 2);
      return (
        <div key={item.date} className="flex flex-col items-center min-w-[36px] shrink-0">
        <div className="text-[9px] text-zinc-500 mb-0.5 font-semibold">{formatAr(item.total).replace(" Ar", "")}</div>
        <div className="w-full bg-[#0a0a0f] rounded-t h-20 flex items-end">
        <div className={`w-full ${colorClass} rounded-t transition-all duration-500`} style={{ height: `${h}%`, minHeight: 2 }} />
        </div>
        <div className="text-[8px] text-zinc-500 mt-0.5 text-center">
        {(() => { const d = new Date(`${item.date}T00:00:00`); return Number.isNaN(d.getTime()) ? item.date : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }); })()}
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

export default function Rapports() {
  const { currentCompany } = useCompany();
  const [period, setPeriod] = useState("mois");
  const [dateDebut, setDateDebut] = useState(PERIOD_OPTIONS[2].getDates().debut);
  const [dateFin, setDateFin] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ ca: 0, totalVentes: 0, totalAchats: 0, marge: 0, txMarge: 0, nbProduits: 0, alertesStock: 0, totalDepenses: 0 });
  const [ventesParJour, setVentesParJour] = useState<Array<{ date: string; total: number }>>([]);
  const [topProduits, setTopProduits] = useState<Array<{ produit_nom?: string; produit?: { nom?: string }; quantite?: number; chiffre?: number }>>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);

  const loadReports = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true); setError(null);
    try {
      const [ca, ventes, achatsTotal, produits, alertes, top] = await Promise.all([
        getCA(dateDebut, dateFin), fetchVentes({ dateDebut, dateFin }), getTotalAchats(dateDebut, dateFin),
                                                                                  fetchProduits(), getAlertesStockBas(), getTopProduits(10, dateDebut, dateFin),
      ]);
      setTopProduits(top || []);
      const byDay = new Map();
      ventes.forEach((v) => { const date = (v.date_vente || "").split("T")[0]; if (date) byDay.set(date, (byDay.get(date) || 0) + (v.montant_total || 0)); });
      setVentesParJour([...byDay.entries()].map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date)));
      let totalDepenses = 0;
      if (currentCompany.slug === "pomanay") {
        const { data: dep } = await getSupabase().from("depenses").select("*").eq("company_id", currentCompany.id).gte("date_depense", dateDebut).lte("date_depense", dateFin).order("date_depense", { ascending: false });
        setDepenses(dep || []);
        totalDepenses = (dep || []).reduce((s, d) => s + (d.montant || 0), 0);
      }
      const achatsNum = Number(achatsTotal) || 0;
      const caNum = Number(ca) || 0;
      const marge = caNum - achatsNum;
      setStats({ ca: caNum, totalVentes: ventes.length, totalAchats: achatsNum, marge, txMarge: caNum > 0 ? parseFloat(((marge / caNum) * 100).toFixed(1)) : 0, nbProduits: produits.length, alertesStock: alertes.length, totalDepenses });
    } catch (e: unknown) { logger.error("Erreur rapports:", e); setError("Erreur lors du chargement des données."); }
    finally { setLoading(false); }
  }, [currentCompany, dateDebut, dateFin]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    const opt = PERIOD_OPTIONS.find((o) => o.value === value);
    if (opt) { setDateDebut(opt.getDates().debut); setDateFin(opt.getDates().fin); }
  };

  if (loading) return <SkeletonGrid cols={4} rows={2} />;

  if (error) return <div className="p-5 text-center text-red-400">{error}</div>;

  return (
    <div className="pb-6 transition-all duration-500 ease-out">
    {/* ══ HEADER ══ */}
    <div className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
    <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-[10px] bg-amber-400/10 flex items-center justify-center">
    <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={18} className="text-amber-400" />
    </div>
    <div>
    <h1 className="text-[22px] font-extrabold text-white m-0">Rapports</h1>
    <p className="text-xs text-zinc-500 mt-0.5">{currentCompany?.name} · Analyse des performances</p>
    </div>
    </div>
    </div>

    {/* ══ PÉRIODE ══ */}
    <Card className="mb-4">
    <div className="flex gap-2 flex-wrap items-center">
    <div className="flex gap-1 bg-[#0a0a0f] rounded-[10px] p-1 border border-[#1e1e24] flex-wrap">
    {PERIOD_OPTIONS.map((opt) => (
      <button key={opt.value} onClick={() => handlePeriodChange(opt.value)}
      className={`py-1.5 px-3.5 border-none rounded-md cursor-pointer text-[11px] font-semibold transition-colors ${period === opt.value ? "bg-amber-400 text-gray-950" : "bg-transparent text-zinc-500 hover:text-zinc-300"}`}>
      {opt.label}
      </button>
    ))}
    </div>
    <div className="flex gap-1.5 items-center flex-wrap">
    <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
    className="py-1.5 px-2.5 rounded-lg border border-[#1e1e24] bg-[#111114] text-white text-xs font-sans outline-none focus:border-amber-400" />
    <span className="text-zinc-500 text-xs">→</span>
    <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)}
    className="py-1.5 px-2.5 rounded-lg border border-[#1e1e24] bg-[#111114] text-white text-xs font-sans outline-none focus:border-amber-400" />
    <button onClick={loadReports} className="py-1.5 px-3 rounded-lg border-none bg-amber-400 text-gray-950 cursor-pointer text-xs font-semibold hover:bg-amber-300 transition-colors">
    Actualiser
    </button>
    </div>
    </div>
    </Card>

    {/* ══ STATS ══ */}
    <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5 mb-4">
    <StatCard2 label="Chiffre d'affaires" value={formatAr(stats.ca)} colorClass="border-emerald-400" />
    <StatCard2 label="Nb ventes" value={stats.totalVentes} colorClass="border-blue-400" />
    <StatCard2 label="Total achats" value={formatAr(stats.totalAchats)} colorClass="border-orange-400" />
    <StatCard2 label="Marge brute" value={formatAr(stats.marge)} colorClass={stats.marge >= 0 ? "border-violet-400" : "border-red-400"} sub={`Taux : ${stats.txMarge}%`} />
    <StatCard2 label="Produits" value={stats.nbProduits} colorClass="border-teal-400" />
    <StatCard2 label="Alertes stock" value={stats.alertesStock} colorClass={stats.alertesStock > 0 ? "border-red-400" : "border-emerald-400"} sub={stats.alertesStock > 0 ? "Stock bas ou rupture" : "Tout est OK"} />
    {currentCompany?.slug === "pomanay" && <StatCard2 label="Dépenses" value={formatAr(stats.totalDepenses)} colorClass="border-pink-400" />}
    </div>

    {/* ══ ÉVOLUTION VENTES ══ */}
    {ventesParJour.length > 0 && (
      <Card className="mb-4">
      <CardHeader>
      <div className="flex items-center gap-2">
      <Icon d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" size={16} className="text-blue-400" />
      <CardTitle>Évolution des ventes</CardTitle>
      </div>
      <span className="text-[11px] text-zinc-500">{ventesParJour.length} jour(s)</span>
      </CardHeader>
      <BarChart data={ventesParJour} colorClass="bg-blue-400" />
      </Card>
    )}

    {/* ══ TOP PRODUITS ══ */}
    {topProduits.length > 0 && (
      <Card className="mb-4">
      <CardHeader>
      <div className="flex items-center gap-2">
      <span className="text-base">🏆</span>
      <CardTitle>Top {topProduits.length} produits</CardTitle>
      </div>
      </CardHeader>
      <Table>
      <TableHead>
      <TableRow>
      <TableHeader>#</TableHeader>
      <TableHeader>Produit</TableHeader>
      <TableHeader align="right">Qté</TableHeader>
      <TableHeader align="right">CA</TableHeader>
      </TableRow>
      </TableHead>
      <TableBody>
      {topProduits.map((p, idx) => (
        <TableRow key={idx}>
        <TableCell className={`font-bold text-[13px] ${idx < 3 ? "text-orange-400" : "text-zinc-500"}`}>{idx + 1}</TableCell>
        <TableCell className="font-semibold text-xs">{p.produit_nom || p.produit?.nom || "—"}</TableCell>
        <TableCell align="right" className="text-xs">{p.quantite}</TableCell>
        <TableCell align="right" className="font-bold text-emerald-400 text-xs">{formatAr(p.chiffre)}</TableCell>
        </TableRow>
      ))}
      </TableBody>
      </Table>
      </Card>
    )}

    {/* ══ DÉPENSES PAR CATÉGORIE ══ */}
    {currentCompany?.slug === "pomanay" && depenses.length > 0 && (
      <Card>
      <CardHeader><CardTitle>Dépenses par catégorie</CardTitle></CardHeader>
      <div className="px-4 pb-4">
      {Object.entries(depenses.reduce((acc: Record<string, number>, d: Depense) => { acc[d.categorie || "Autre"] = (acc[d.categorie || "Autre"] || 0) + (d.montant || 0); return acc; }, {}))
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([cat, total]) => {
        const totalDep = depenses.reduce((s: number, d: Depense) => s + (d.montant || 0), 0);
        const pct = totalDep > 0 ? ((total as number) / totalDep) * 100 : 0;
        return (
          <div key={cat} className="mb-2.5">
          <div className="flex justify-between mb-1 text-xs">
          <span className="font-semibold">{cat}</span>
          <span className="text-zinc-500">{formatAr(total as number)} · {pct.toFixed(1)}%</span>
          </div>
          <div className="bg-[#0a0a0f] h-1.5 rounded-[3px] overflow-hidden">
          <div className="bg-pink-400 h-full rounded-[3px]" style={{ width: `${pct}%` }} />
          </div>
          </div>
        );
      })}
      </div>
      </Card>
    )}
    </div>
  );
}
