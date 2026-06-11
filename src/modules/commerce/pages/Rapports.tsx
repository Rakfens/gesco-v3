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

/* ─── Colors ─── */
const C = {
  gold: "#c9a96e", goldDim: "rgba(201,169,110,0.1)", success: "#34d399", warning: "#fbbf24", danger: "#f87171",
  violet: "#8b5cf6", blue: "#60a5fa", orange: "#fb923c", pink: "#f472b6", teal: "#2dd4bf",
};

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/* ─── Inline StatCard ─── */
const StatCard2 = ({ label, value, color: c, sub }: { label: string; value: string | number; color: string; sub?: string }) => (
  <div style={{ background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", padding: "14px 16px", borderLeft: `3px solid ${c}` }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
  </div>
);

/* ─── BarChart ─── */
const BarChart = ({ data, color = C.blue }: { data: Array<{ date: string; total: number }>; color?: string }) => {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, overflowX: "auto", padding: "0 4px 4px" }}>
      {data.map((item) => {
        const h = Math.max((item.total / maxVal) * 100, 2);
        return (
          <div key={item.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 36, flex: "0 0 auto" }}>
            <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 3, fontWeight: 600 }}>{formatAr(item.total).replace(" Ar", "")}</div>
            <div style={{ width: "100%", background: "var(--bg-secondary)", borderRadius: "4px 4px 0 0", height: 80, display: "flex", alignItems: "flex-end" }}>
              <div style={{ width: "100%", height: `${h}%`, background: color, borderRadius: "4px 4px 0 0", transition: "height 0.4s ease", minHeight: 2 }} />
            </div>
            <div style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 3, textAlign: "center" }}>
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
  if (error) return <div style={{ padding: 20, textAlign: "center", color: C.danger }}>{error}</div>;

  return (
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.goldDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={18} color={C.gold} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>Rapports</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>{currentCompany?.name} · Analyse des performances</p>
          </div>
        </div>
      </div>

      {/* ══ PÉRIODE ══ */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4, background: "var(--bg-secondary)", borderRadius: 10, padding: 4, border: "1px solid var(--border)", flexWrap: "wrap" }}>
            {PERIOD_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => handlePeriodChange(opt.value)}
                style={{ padding: "6px 14px", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "var(--font)", background: period === opt.value ? C.gold : "transparent", color: period === opt.value ? "#08080c" : "var(--text-muted)" }}>
                {opt.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 12, fontFamily: "var(--font)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>→</span>
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 12, fontFamily: "var(--font)" }} />
            <button onClick={loadReports} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: C.gold, color: "#08080c", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "var(--font)" }}>
              Actualiser
            </button>
          </div>
        </div>
      </Card>

      {/* ══ STATS ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
        <StatCard2 label="Chiffre d'affaires" value={formatAr(stats.ca)} color={C.success} />
        <StatCard2 label="Nb ventes" value={stats.totalVentes} color={C.blue} />
        <StatCard2 label="Total achats" value={formatAr(stats.totalAchats)} color={C.orange} />
        <StatCard2 label="Marge brute" value={formatAr(stats.marge)} color={stats.marge >= 0 ? C.violet : C.danger} sub={`Taux : ${stats.txMarge}%`} />
        <StatCard2 label="Produits" value={stats.nbProduits} color={C.teal} />
        <StatCard2 label="Alertes stock" value={stats.alertesStock} color={stats.alertesStock > 0 ? C.danger : C.success} sub={stats.alertesStock > 0 ? "Stock bas ou rupture" : "Tout est OK"} />
        {currentCompany?.slug === "pomanay" && <StatCard2 label="Dépenses" value={formatAr(stats.totalDepenses)} color={C.pink} />}
      </div>

      {/* ══ ÉVOLUTION VENTES ══ */}
      {ventesParJour.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" size={16} color={C.blue} />
              <CardTitle>Évolution des ventes</CardTitle>
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{ventesParJour.length} jour(s)</span>
          </CardHeader>
          <BarChart data={ventesParJour} color={C.blue} />
        </Card>
      )}

      {/* ══ TOP PRODUITS ══ */}
      {topProduits.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🏆</span>
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
                  <TableCell style={{ fontWeight: 700, color: idx < 3 ? C.orange : "var(--text-muted)", fontSize: 13 }}>{idx + 1}</TableCell>
                  <TableCell style={{ fontWeight: 600, fontSize: 12 }}>{p.produit_nom || p.produit?.nom || "—"}</TableCell>
                  <TableCell align="right" style={{ fontSize: 12 }}>{p.quantite}</TableCell>
                  <TableCell align="right" style={{ fontWeight: 700, color: C.success, fontSize: 12 }}>{formatAr(p.chiffre)}</TableCell>
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
          <div style={{ padding: "0 18px 18px" }}>
            {Object.entries(depenses.reduce((acc: Record<string, number>, d: Depense) => { acc[d.categorie || "Autre"] = (acc[d.categorie || "Autre"] || 0) + (d.montant || 0); return acc; }, {}))
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([cat, total]) => {
                const totalDep = depenses.reduce((s: number, d: Depense) => s + (d.montant || 0), 0);
                const pct = totalDep > 0 ? ((total as number) / totalDep) * 100 : 0;
                return (
                  <div key={cat} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                      <span style={{ fontWeight: 600 }}>{cat}</span>
                      <span style={{ color: "var(--text-muted)" }}>{formatAr(total as number)} · {pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ background: "var(--bg-secondary)", height: 6, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, background: C.pink, height: "100%", borderRadius: 3 }} />
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
