// src/modules/commerce/pages/Dashboard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { logger } from "@/lib/logger";
import {
  Card, CardContent, CardHeader, CardTitle, Icon, SkeletonGrid, StatCard, StatusBadge,
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { getSupabase } from "@/lib/supabase";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Produit, Vente } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { fetchAchats } from "../services/achatService";
import { fetchProduits, getAlertesStockBas, getValeurTotaleStock } from "../services/produitService";
import { fetchVentes } from "../services/venteService";

const today = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };

/* ─── Color mapping ─── */
const colorMap: Record<string, { text: string; bg: string; border: string; gradient: string }> = {
  blue: { text: "text-[var(--info)]", bg: "bg-[var(--info)]/10", border: "border-[var(--info)]/20", gradient: "from-[var(--info)]" },
  emerald: { text: "text-[var(--success)]", bg: "bg-[var(--success)]/10", border: "border-[var(--success)]/20", gradient: "from-[var(--success)]" },
  violet: { text: "text-[var(--violet)]", bg: "bg-[var(--violet)]/10", border: "border-[var(--violet)]/20", gradient: "from-[var(--violet)]" },
  amber: { text: "text-[var(--gold)]", bg: "bg-[var(--gold)]/10", border: "border-[var(--gold)]/20", gradient: "from-[var(--gold)]" },
  red: { text: "text-[var(--danger)]", bg: "bg-[var(--danger)]/10", border: "border-[var(--danger)]/20", gradient: "from-[var(--danger)]" },
};

export default function CommerceDashboard() {
  const { currentCompany } = useCompany();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [recentVentes, setRecentVentes] = useState<Vente[]>([]);
  const [alertes, setAlertes] = useState<Produit[]>([]);
  const [stats, setStats] = useState({
    ventesJour: 0, ventesMois: 0, caJour: 0, caMois: 0,
    nbProduits: 0, stockBas: 0, valeurStock: 0, achatsMois: 0,
    depensesJour: 0, depensesMois: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const load = async () => {
    if (!currentCompany) return;
    setLoading(true); setError(null);
    try {
      const t = today(); const fm = firstOfMonth();
      const [toutesVentes, produits, alertesData, valeurStock, achats, depenses] = await Promise.all([
        fetchVentes(), fetchProduits(), getAlertesStockBas(), getValeurTotaleStock(), fetchAchats({ dateDebut: fm, dateFin: t }),
        getSupabase().from('depenses').select('*').eq('company_id', currentCompany.id).gte('date_depense', fm).lte('date_depense', t),
      ]);
      const ventesJour = toutesVentes.filter((v) => (v.date_vente || "").split("T")[0] === t);
      const ventesMois = toutesVentes.filter((v) => (v.date_vente || "").split("T")[0] >= fm);
      const caJour = ventesJour.reduce((s, v) => s + (v.montant_total || 0), 0);
      const caMois = ventesMois.reduce((s, v) => s + (v.montant_total || 0), 0);
      const totalAchats = achats.reduce((s, a) => s + (a.montant_total || 0), 0);
      const depensesData = depenses.data || [];
      const depensesJour = depensesData.filter((d: { date_depense?: string }) => (d.date_depense || '').split('T')[0] === t).reduce((s: number, d: { montant?: number }) => s + (d.montant || 0), 0);
      const depensesMois = depensesData.reduce((s: number, d: { montant?: number }) => s + (d.montant || 0), 0);
      setStats({ ventesJour: ventesJour.length, ventesMois: ventesMois.length, caJour, caMois, nbProduits: produits.length, stockBas: alertesData.length, valeurStock, achatsMois: totalAchats, depensesJour, depensesMois });
      setRecentVentes(toutesVentes.slice(0, 5)); setAlertes(alertesData.slice(0, 5));
    } catch (err: unknown) { logger.error("Erreur dashboard:", err); setError("Erreur lors du chargement des données."); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (currentCompany) load(); }, [currentCompany]);

  const benefice = useMemo(() => stats.caMois - stats.achatsMois - stats.depensesMois, [stats]);
  const pomanayExtra = currentCompany?.slug === "pomanay";
  const isBeneficePositive = benefice >= 0;

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  if (loading) return <SkeletonGrid cols={isMobile ? 2 : 4} rows={2} />;
  if (error) return (
    <div className="p-5 text-center rounded-2xl m-4" style={{ color: "var(--danger)", background: "var(--danger-dim)", border: "1px solid var(--danger)/20" }}>
      {error}
    </div>
  );

  return (
    <div className="pb-8">
      {/* ═══════════════════════════════════════════════════════
          HEADER HERO
          ═══════════════════════════════════════════════════════ */}
      <div
        className="relative mb-6 overflow-hidden rounded-2xl p-5 lg:p-6"
        style={{
          ...sectionStyle(0),
          background: "linear-gradient(135deg, rgba(96,165,250,0.06) 0%, rgba(139,92,246,0.03) 50%, rgba(201,169,110,0.02) 100%)",
          border: "1px solid rgba(96,165,250,0.08)",
        }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: "rgba(96,165,250,0.06)" }} />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full blur-3xl" style={{ background: "rgba(139,92,246,0.04)" }} />
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shrink-0"
                style={{
                  border: "2px solid rgba(96,165,250,0.2)",
                  background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))",
                  boxShadow: "0 0 20px rgba(96,165,250,0.08)",
                }}
              >
                <Image src="/logo.png" alt="HT-GesCom" width={32} height={32} priority className="object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Tableau de bord
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{currentCompany?.name || "Commerce"}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(96,165,250,0.08)", color: "var(--info)" }}>
                    {currentCompany?.type === "commerce" ? "Commerce" : "Boutique"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Ventes auj.", value: `${stats.ventesJour}`, color: "blue" },
                { label: "CA du jour", value: formatAr(stats.caJour), color: "emerald" },
                { label: "Stock bas", value: `${stats.stockBas}`, color: stats.stockBas > 0 ? "amber" : "emerald" },
              ].map((q) => {
                const c = colorMap[q.color];
                return (
                  <div key={q.label} className="rounded-full px-3 py-1.5 border" style={{ background: c.bg, borderColor: c.border }}>
                    <span className="mr-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>{q.label}</span>
                    <span className="text-[11px] font-bold" style={{ color: c.text }}>{q.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STATS
          ═══════════════════════════════════════════════════════ */}
      <div className={`grid gap-3 mb-6 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`} style={sectionStyle(0.1)}>
        <StatCard label="Ventes du mois" value={stats.ventesMois} color="blue" icon={<Icon d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" size={18} />} />
        <StatCard label="CA du mois" value={formatAr(stats.caMois)} color="success" icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} />} />
        <StatCard label="Produits" value={stats.nbProduits} color="purple" icon={<Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={18} />} />
        <StatCard label="Valeur stock" value={formatAr(stats.valeurStock)} color="accent" icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} />} />
      </div>

      {/* ═══════════════════════════════════════════════════════
          BÉNÉFICE NET (Pomanay)
          ═══════════════════════════════════════════════════════ */}
      {pomanayExtra && (
        <div
          className="relative mb-6 overflow-hidden rounded-2xl p-6"
          style={{
            ...sectionStyle(0.15),
            border: `1px solid ${isBeneficePositive ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)"}`,
            background: isBeneficePositive
              ? "linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(52,211,153,0.02) 100%)"
              : "linear-gradient(135deg, rgba(248,113,113,0.06) 0%, rgba(248,113,113,0.02) 100%)",
          }}
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl" style={{ background: isBeneficePositive ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.06)" }} />
          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: isBeneficePositive ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", color: isBeneficePositive ? "var(--success)" : "var(--danger)" }}
                  >
                    {isBeneficePositive ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isBeneficePositive ? "var(--success)" : "var(--danger)" }}>
                    Bénéfice net du mois
                  </span>
                </div>
                <div className={`font-black ${isMobile ? "text-[28px]" : "text-4xl"}`} style={{ color: isBeneficePositive ? "var(--success)" : "var(--danger)" }}>
                  {formatAr(benefice)}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  CA {formatAr(stats.caMois)} − Achats {formatAr(stats.achatsMois)} − Dépenses {formatAr(stats.depensesMois)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Achats", value: formatAr(stats.achatsMois), color: "var(--gold)", bg: "rgba(201,169,110,0.06)", border: "rgba(201,169,110,0.12)" },
                  { label: "Dépenses", value: formatAr(stats.depensesMois), color: "var(--danger)", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.12)" },
                ].map((p) => (
                  <div key={p.label} className="py-2.5 px-3 rounded-xl text-center" style={{ background: p.bg, border: `1px solid ${p.border}` }}>
                    <div className="text-sm font-bold" style={{ color: p.color }}>{p.value}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{p.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ALERTES STOCK BAS
          ═══════════════════════════════════════════════════════ */}
      {alertes.length > 0 && (
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ ...sectionStyle(0.2), border: "1px solid rgba(201,169,110,0.12)", background: "rgba(201,169,110,0.02)" }}>
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(201,169,110,0.08)", background: "rgba(201,169,110,0.03)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(201,169,110,0.1)", color: "var(--gold)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <CardTitle className="text-sm">Stock bas</CardTitle>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(201,169,110,0.08)", color: "var(--gold)" }}>
                {alertes.length} produit{alertes.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(201,169,110,0.06)" }}>
            {alertes.map((p) => (
              <div key={p.id} className="flex justify-between items-center px-5 py-3 transition-colors duration-150" style={{ borderColor: "rgba(201,169,110,0.06)" }}>
                <div>
                  <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{p.nom}</span>
                  {p.categorie && <span className="text-[10px] ml-2" style={{ color: "var(--text-muted)" }}>· {p.categorie}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(201,169,110,0.08)", color: "var(--gold)" }}>
                    {p.quantite_stock} / min {p.stock_minimum}
                  </span>
                  {p.prix_vente != null && (
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{formatAr(p.prix_vente)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          DERNIÈRES VENTES
          ═══════════════════════════════════════════════════════ */}
      <div className="rounded-2xl overflow-hidden" style={{ ...sectionStyle(0.25), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
        <div className="px-5 py-3.5" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(96,165,250,0.1)", color: "var(--info)" }}>
                <Icon d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" size={14} className="text-current" />
              </div>
              <CardTitle className="text-sm">Dernières ventes</CardTitle>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(96,165,250,0.08)", color: "var(--info)" }}>
              {recentVentes.length} transaction{recentVentes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {recentVentes.length === 0 ? (
          <div className="py-14 text-center">
            <div className="text-4xl mb-3">🛒</div>
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune vente enregistrée.</div>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Facture</TableHeader>
                <TableHeader>Client</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader align="right">Montant</TableHeader>
                <TableHeader align="center">Statut</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentVentes.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-semibold font-mono text-xs"><span style={{ color: "var(--text-secondary)" }}>{v.numero_facture || "—"}</span></TableCell>
                  <TableCell className="text-sm"><span style={{ color: "var(--text-secondary)" }}>{v.client_nom || "—"}</span></TableCell>
                  <TableCell className="text-xs"><span style={{ color: "var(--text-muted)" }}>{v.date_vente ? new Date(v.date_vente).toLocaleDateString("fr-FR") : "—"}</span></TableCell>
                  <TableCell align="right" className="font-bold"><span style={{ color: "var(--success)" }}>{formatAr(v.montant_total)}</span></TableCell>
                  <TableCell align="center"><StatusBadge status={v.statut} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
