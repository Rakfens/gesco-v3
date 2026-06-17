"use client";

import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Card, CardContent, CardHeader, CardTitle, SkeletonGrid, StatCard, StatusBadge,
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Produit, Vente } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { fetchAchats } from "../services/achatService";
import { fetchProduits, getAlertesStockBas, getValeurTotaleStock } from "../services/produitService";
import { fetchVentes } from "../services/venteService";

const Icon = ({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
  <path d={d} />
  </svg>
);

const today = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };

export default function CommerceDashboard() {
  const { currentCompany } = useCompany();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [recentVentes, setRecentVentes] = useState<Vente[]>([]);
  const [alertes, setAlertes] = useState<Produit[]>([]);
  const [stats, setStats] = useState({ ventesJour: 0, ventesMois: 0, caJour: 0, caMois: 0, nbProduits: 0, stockBas: 0, valeurStock: 0, achatsMois: 0, depensesJour: 0, depensesMois: 0 });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!currentCompany) return;
    setLoading(true); setError(null);
    try {
      const t = today(); const fm = firstOfMonth();
      const [toutesVentes, produits, alertesData, valeurStock, achats] = await Promise.all([
        fetchVentes(), fetchProduits(), getAlertesStockBas(), getValeurTotaleStock(), fetchAchats({ dateDebut: fm, dateFin: t }),
      ]);
      const ventesJour = toutesVentes.filter((v) => (v.date_vente || "").split("T")[0] === t);
      const ventesMois = toutesVentes.filter((v) => (v.date_vente || "").split("T")[0] >= fm);
      const caJour = ventesJour.reduce((s, v) => s + (v.montant_total || 0), 0);
      const caMois = ventesMois.reduce((s, v) => s + (v.montant_total || 0), 0);
      const totalAchats = achats.reduce((s, a) => s + (a.montant_total || 0), 0);
      setStats({ ventesJour: ventesJour.length, ventesMois: ventesMois.length, caJour, caMois, nbProduits: produits.length, stockBas: alertesData.length, valeurStock, achatsMois: totalAchats, depensesJour: 0, depensesMois: 0 });
      setRecentVentes(toutesVentes.slice(0, 5)); setAlertes(alertesData.slice(0, 5));
    } catch (err: unknown) { logger.error("Erreur dashboard:", err); setError("Erreur lors du chargement des données."); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (currentCompany) load(); }, [currentCompany]);

  const benefice = useMemo(() => stats.caMois - stats.achatsMois - stats.depensesMois, [stats]);
  const pomanayExtra = currentCompany?.slug === "pomanay";

  if (loading) return <SkeletonGrid cols={isMobile ? 2 : 4} rows={2} />;

  if (error) return <div className="p-5 text-center text-red-400 bg-red-400/10 rounded-xl m-4">{error}</div>;

  return (
    <div className="pb-6 space-y-6">
    {/* ══ HEADER ══ */}
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-blue-500/[0.08] via-violet-500/[0.04] to-transparent p-6 lg:p-8">
    <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-400/[0.08] rounded-full blur-3xl pointer-events-none" />
    <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-violet-500/[0.06] rounded-full blur-3xl pointer-events-none" />
    <div className="relative z-10">
    <div className="flex items-center gap-4 mb-4">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
    <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" size={22} className="text-white" />
    </div>
    <div>
    <h1 className={`font-black tracking-tight text-white ${isMobile ? "text-xl" : "text-3xl"}`}>Tableau de bord</h1>
    <p className="text-sm text-zinc-500 mt-1">{currentCompany?.name || "Commerce"} · {today()}</p>
    </div>
    </div>
    <div className="flex gap-2 flex-wrap">
    {[
      { label: "Ventes aujourd'hui", value: `${stats.ventesJour}`, color: "blue" },
      { label: "CA du jour", value: formatAr(stats.caJour), color: "emerald" },
          { label: "Stock bas", value: `${stats.stockBas} produit${stats.stockBas !== 1 ? "s" : ""}`, color: stats.stockBas > 0 ? "amber" : "emerald" },
    ].map((q) => (
      <div key={q.label} className={`py-1.5 px-3 rounded-full bg-${q.color}-400/10 border border-${q.color}-400/20`}>
      <span className="text-[10px] text-zinc-500 mr-1.5">{q.label}</span>
      <span className={`text-[11px] font-bold text-${q.color}-400`}>{q.value}</span>
      </div>
    ))}
    </div>
    </div>
    </div>

    {/* ══ STATS ══ */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
    {[
      { label: "Ventes du mois", value: stats.ventesMois, color: "blue", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
      { label: "CA du mois", value: formatAr(stats.caMois), color: "emerald", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
          { label: "Produits", value: stats.nbProduits, color: "violet", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
          { label: "Valeur stock", value: formatAr(stats.valeurStock), color: "amber", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" },
    ].map((s) => (
      <div key={s.label} className="glass-card-hover p-5 group">
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-current/5 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: `var(--${s.color})` }} />
      <div className="relative">
      <div className="flex items-center gap-2 mb-3">
      <div className={`w-8 h-8 rounded-lg bg-${s.color}-400/10 flex items-center justify-center text-${s.color}-400`}>
      <Icon d={s.icon} size={16} />
      </div>
      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{s.label}</span>
      </div>
      <div className="text-2xl font-black text-white tracking-tight">{s.value}</div>
      </div>
      </div>
    ))}
    </div>

    {/* ══ BÉNÉFICE NET ══ */}
    {pomanayExtra && (
      <Card className={`animated-border overflow-hidden ${benefice >= 0 ? "border-l-2 border-l-emerald-400" : "border-l-2 border-l-red-400"}`}>
      <div className="p-6 bg-gradient-to-r from-emerald-500/[0.03] to-transparent">
      <div className="flex items-center justify-between flex-wrap gap-4">
      <div>
      <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${benefice >= 0 ? "text-emerald-400" : "text-red-400"}`}>💰 Bénéfice net du mois</div>
      <div className={`text-3xl font-black ${benefice >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatAr(benefice)}</div>
      <div className="text-xs text-zinc-500 mt-1">CA {formatAr(stats.caMois)} — Achats {formatAr(stats.achatsMois)} — Dépenses {formatAr(stats.depensesMois)}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
      <div className="py-2 px-3 bg-[#0a0a0f] rounded-lg text-center">
      <div className="text-sm font-bold text-amber-400">{formatAr(stats.achatsMois)}</div>
      <div className="text-[9px] text-zinc-500">Achats</div>
      </div>
      <div className="py-2 px-3 bg-[#0a0a0f] rounded-lg text-center">
      <div className="text-sm font-bold text-red-400">{formatAr(stats.depensesMois)}</div>
      <div className="text-[9px] text-zinc-500">Dépenses</div>
      </div>
      </div>
      </div>
      </div>
      </Card>
    )}

    {/* ══ ALERTES STOCK BAS ══ */}
    {alertes.length > 0 && (
      <Card className="overflow-hidden border-amber-400/20 bg-amber-400/[0.03]">
      <CardHeader className="py-4 px-5 border-b border-white/[0.04]">
      <div className="flex items-center gap-2">
      <span className="text-lg">⚠️</span>
      <CardTitle className="text-sm font-bold">Stock bas ({alertes.length})</CardTitle>
      </div>
      </CardHeader>
      <CardContent className="p-0">
      {alertes.map((p) => (
        <div key={p.id} className="flex justify-between items-center py-3 px-5 border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
        <div>
        <span className="font-semibold text-sm text-white">{p.nom}</span>
        {p.categorie && <span className="text-[10px] text-zinc-500 ml-2">· {p.categorie}</span>}
        </div>
        <div className="flex gap-3 items-center">
        <span className="text-xs text-amber-400 font-bold">{p.quantite_stock} / min {p.stock_minimum}</span>
        <span className="text-[10px] text-zinc-500">{p.prix_vente != null ? formatAr(p.prix_vente) : ""}</span>
        </div>
        </div>
      ))}
      </CardContent>
      </Card>
    )}

    {/* ══ DERNIÈRES VENTES ══ */}
    <Card className="overflow-hidden glass-card">
    <CardHeader className="py-4 px-5 border-b border-white/[0.04] flex items-center justify-between">
    <div className="flex items-center gap-2">
    <Icon d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" size={16} className="text-blue-400" />
    <CardTitle className="text-sm font-bold">Dernières ventes</CardTitle>
    </div>
    <span className="text-[11px] text-zinc-500">{recentVentes.length} transaction(s)</span>
    </CardHeader>
    {recentVentes.length === 0 ? (
      <div className="text-center text-zinc-500 py-10 text-sm">
      <div className="text-3xl mb-2">🛒</div>
      Aucune vente enregistrée.
      </div>
    ) : (
      <Table>
      <TableHead>
      <TableRow className="bg-white/[0.02]">
      <TableHeader className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Facture</TableHeader>
      <TableHeader className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Client</TableHeader>
      <TableHeader className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</TableHeader>
      <TableHeader className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Montant</TableHeader>
      <TableHeader className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Statut</TableHeader>
      </TableRow>
      </TableHead>
      <TableBody className="divide-y divide-white/[0.02]">
      {recentVentes.map((v) => (
        <TableRow key={v.id} className="table-row-hover group">
        <TableCell className="font-semibold font-mono text-xs text-zinc-300 group-hover:text-white transition-colors">{v.numero_facture || "—"}</TableCell>
        <TableCell className="text-sm text-zinc-300">{v.client_nom || "—"}</TableCell>
        <TableCell className="text-zinc-500 text-xs">{v.date_vente ? new Date(v.date_vente).toLocaleDateString("fr-FR") : "—"}</TableCell>
        <TableCell align="right" className="font-bold text-emerald-400">{formatAr(v.montant_total)}</TableCell>
        <TableCell align="center"><StatusBadge status={v.statut} /></TableCell>
        </TableRow>
      ))}
      </TableBody>
      </Table>
    )}
    </Card>
    </div>
  );
}
