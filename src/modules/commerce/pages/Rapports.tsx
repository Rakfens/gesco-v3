// Rapports.tsx — Refactorisé avec design system professionnel - Amélioré
import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";
import {
  Card,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui";
import { SkeletonGrid } from "@/modules/shared/components/ui/Skeleton"; // Supposons un composant SkeletonGrid
import { useCompany } from "@/modules/shared/context/CompanyContext";
import type { Depense } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { getTotalAchats } from "../services/achatService";
import { fetchProduits, getAlertesStockBas } from "../services/produitService";
import { fetchVentes, getCA, getTopProduits } from "../services/venteService";

// Composant StatCard externe ou défini ici
const StatCard = ({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) => (
  <div
    style={{
      background: "var(--card)",
      borderRadius: 12,
      border: "1px solid var(--border)",
      padding: "14px 16px",
      borderLeft: `3px solid ${color}`,
    }}
  >
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--muted)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
  </div>
);

// Composant BarChart externe ou défini ici
const BarChart = ({
  data,
  color = "var(--blue)",
}: {
  data: Array<{ date: string; total: number }>;
  color?: string;
}) => {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d: { date: string; total: number }) => d.total), 1);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        height: 120,
        overflowX: "auto",
        padding: "0 4px 4px",
      }}
    >
      {data.map((item: { date: string; total: number }) => {
        const h = Math.max((item.total / maxVal) * 100, 2);
        return (
          <div
            key={item.date}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 44,
              flex: "0 0 auto",
            }}
          >
            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>
              {formatAr(item.total).replace(" Ar", "")}
            </div>
            <div
              style={{
                width: "100%",
                background: "var(--bg)",
                borderRadius: "4px 4px 0 0",
                height: 84,
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${h}%`,
                  background: color,
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.4s ease",
                  minHeight: 3,
                }}
              />
            </div>
            <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 4, textAlign: "center" }}>
              {new Date(`${item.date}T00:00:00`).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PERIOD_OPTIONS = [
  {
    value: "aujourdhui",
    label: "Aujourd'hui",
    getDates: () => {
      const d = new Date().toISOString().split("T")[0];
      return { debut: d, fin: d };
    },
  },
  {
    value: "semaine",
    label: "Semaine",
    getDates: () => {
      const today = new Date();
      const day = today.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const first = new Date(today);
      first.setDate(today.getDate() - diff);
      return { debut: first.toISOString().split("T")[0], fin: today.toISOString().split("T")[0] };
    },
  },
  {
    value: "mois",
    label: "Ce mois",
    getDates: () => ({
      debut: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split("T")[0],
      fin: new Date().toISOString().split("T")[0],
    }),
  },
  {
    value: "trimestre",
    label: "Trimestre",
    getDates: () => {
      const now = new Date();
      const q = Math.floor(now.getMonth() / 3);
      return {
        debut: new Date(now.getFullYear(), q * 3, 1).toISOString().split("T")[0],
        fin: now.toISOString().split("T")[0],
      };
    },
  },
  {
    value: "annee",
    label: "Année",
    getDates: () => ({
      debut: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
      fin: new Date().toISOString().split("T")[0],
    }),
  },
];

export default function Rapports() {
  const { currentCompany } = useCompany();
  const [period, setPeriod] = useState<string>("mois");
  const [dateDebut, setDateDebut] = useState<string>(PERIOD_OPTIONS[2].getDates().debut); // 'mois'
  const [dateFin, setDateFin] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // État pour l'erreur
  const [stats, setStats] = useState<{
    ca: number;
    totalVentes: number;
    totalAchats: number;
    marge: number;
    txMarge: number | string;
    nbProduits: number;
    alertesStock: number;
    totalDepenses: number;
  }>({
    ca: 0,
    totalVentes: 0,
    totalAchats: 0,
    marge: 0,
    txMarge: 0,
    nbProduits: 0,
    alertesStock: 0,
    totalDepenses: 0,
  });
  const [ventesParJour, setVentesParJour] = useState<Array<{ date: string; total: number }>>([]);
  const [topProduits, setTopProduits] = useState<
    Array<{ produit_nom?: string; produit?: { nom?: string }; quantite?: number; chiffre?: number }>
  >([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);

  useEffect(() => {
    if (currentCompany) loadReports();
  }, [currentCompany]);

  const loadReports = async () => {
    if (!currentCompany) return;
    setLoading(true);
    setError(null); // Réinitialiser l'erreur
    try {
      const [ca, ventes, achatsTotal, produits, alertes, top] = await Promise.all([
        getCA(dateDebut, dateFin),
        fetchVentes({ dateDebut, dateFin }),
        getTotalAchats(dateDebut, dateFin),
        fetchProduits(),
        getAlertesStockBas(),
        getTopProduits(10, dateDebut, dateFin),
      ]);
      setTopProduits(top || []);
      const byDay = new Map();
      ventes.forEach((v) => {
        const date = (v.date_vente || "").split("T")[0];
        if (date) byDay.set(date, (byDay.get(date) || 0) + (v.montant_total || 0));
      });
      setVentesParJour(
        [...byDay.entries()]
          .map(([date, total]) => ({ date, total }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      );
      let totalDepenses = 0;
      if (currentCompany.slug === "pomanay") {
        const { data: dep } = await getSupabase()
          .from("depenses")
          .select("*")
          .eq("company_id", currentCompany.id)
          .gte("date_depense", dateDebut)
          .lte("date_depense", dateFin)
          .order("date_depense", { ascending: false });
        setDepenses(dep || []);
        totalDepenses = (dep || []).reduce((s, d) => s + (d.montant || 0), 0);
      }
      const achatsNum = Number(achatsTotal) || 0;
      const caNum = Number(ca) || 0;
      const marge = caNum - achatsNum;
      setStats({
        ca: caNum,
        totalVentes: ventes.length,
        totalAchats: achatsNum,
        marge,
        txMarge: caNum > 0 ? ((marge / caNum) * 100).toFixed(1) : 0,
        nbProduits: produits.length,
        alertesStock: alertes.length,
        totalDepenses,
      });
    } catch (error: unknown) {
      logger.error("Erreur lors du chargement des rapports:", error);
      setError("Erreur lors du chargement des données de rapport.");
      // Optionnel: utiliser un service de toast global si disponible
      // if (showToast) showToast("Erreur lors du chargement des rapports.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    const opt = PERIOD_OPTIONS.find((o) => o.value === value);
    if (!opt) return;
    const dates = opt.getDates();
    setDateDebut(dates.debut);
    setDateFin(dates.fin);
  };

  const margeSub = `Taux : ${stats.txMarge}pct`;
  const alertesSub = stats.alertesStock > 0 ? "Stock bas ou rupture" : "Tout est OK";

  if (loading) {
    return (
      <div style={{ padding: "0 0 24px" }}>
        <SkeletonGrid cols={6} rows={2} /> {/* Afficher un skeleton pendant le chargement */}
      </div>
    );
  }

  if (error) {
    // Afficher l'erreur si présente
    return <div style={{ padding: 20, textAlign: "center", color: "var(--red)" }}>{error}</div>;
  }

  return (
    <div style={{ padding: "0 0 24px" }}>
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}
          data-testid="page-title"
        >
          Rapports
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          {currentCompany?.name} · Analyse des performances
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--card)",
            borderRadius: 10,
            padding: 4,
            border: "1px solid var(--border)",
            flexWrap: "wrap",
          }}
        >
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handlePeriodChange(opt.value)}
              style={{
                padding: "6px 14px",
                border: "none",
                borderRadius: 7,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--font)",
                background: period === opt.value ? "var(--accent)" : "transparent",
                color: period === opt.value ? "#fff" : "var(--text2)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border2)",
              background: "var(--card)",
              color: "var(--text)",
              fontSize: 13,
            }}
          />
          <span style={{ color: "var(--muted)" }}>vers</span>
          <input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border2)",
              background: "var(--card)",
              color: "var(--text)",
              fontSize: 13,
            }}
          />
          <button
            onClick={loadReports}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Actualiser
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <StatCard label="Chiffre d'affaires" value={formatAr(stats.ca)} color="var(--green)" />
        <StatCard label="Nb ventes" value={stats.totalVentes} color="var(--blue)" />
        <StatCard label="Total achats" value={formatAr(stats.totalAchats)} color="var(--orange)" />
        <StatCard
          label="Marge brute"
          value={formatAr(stats.marge)}
          color={stats.marge >= 0 ? "var(--purple)" : "var(--red)"}
          sub={margeSub}
        />
        <StatCard label="Produits" value={stats.nbProduits} color="var(--teal)" />
        <StatCard
          label="Alertes stock"
          value={stats.alertesStock}
          color={stats.alertesStock > 0 ? "var(--red)" : "var(--green)"}
          sub={alertesSub}
        />
        {currentCompany?.slug === "pomanay" && (
          <StatCard label="Dépenses" value={formatAr(stats.totalDepenses)} color="var(--pink)" />
        )}
      </div>

      {ventesParJour.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader>
            <CardTitle>Évolution des ventes</CardTitle>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {ventesParJour.length} jour(s)
            </span>
          </CardHeader>
          <BarChart data={ventesParJour} color="var(--blue)" />
        </Card>
      )}

      {topProduits.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader>
            <CardTitle>Top 10 produits</CardTitle>
          </CardHeader>
          <Table>
            <TableHead>
              <TableHeader>#</TableHeader>
              <TableHeader>Produit</TableHeader>
              <TableHeader align="right">Qté</TableHeader>
              <TableHeader align="right">CA</TableHeader>
            </TableHead>
            <TableBody>
              {topProduits.map((p, idx) => (
                <TableRow key={idx}>
                  <TableCell
                    style={{ fontWeight: 700, color: idx < 3 ? "var(--orange)" : "var(--muted)" }}
                  >
                    {idx + 1}
                  </TableCell>
                  <TableCell style={{ fontWeight: 600 }}>
                    {p.produit_nom || p.produit?.nom || "—"}
                  </TableCell>
                  <TableCell align="right">{p.quantite}</TableCell>
                  <TableCell align="right" style={{ fontWeight: 700, color: "var(--green)" }}>
                    {formatAr(p.chiffre)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {currentCompany?.slug === "pomanay" && depenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dépenses par catégorie</CardTitle>
          </CardHeader>
          <div style={{ padding: "0 18px 18px" }}>
            {Object.entries(
              depenses.reduce((acc: Record<string, number>, d: Depense) => {
                acc[d.categorie || "Autre"] = (acc[d.categorie || "Autre"] || 0) + (d.montant || 0);
                return acc;
              }, {}),
            )
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([cat, total]) => {
                const totalDep = depenses.reduce(
                  (s: number, d: Depense) => s + (d.montant || 0),
                  0,
                );
                const pct = totalDep > 0 ? ((total as number) / totalDep) * 100 : 0;
                return (
                  <div key={cat} style={{ marginBottom: 12 }}>
                    <div
                      style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{cat}</span>
                      <span style={{ fontSize: 13, color: "var(--text2)" }}>
                        {formatAr(total)} · {pct.toFixed(1)}pct
                      </span>
                    </div>
                    <div
                      style={{
                        background: "var(--bg)",
                        height: 6,
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          background: "var(--pink)",
                          height: "100%",
                          borderRadius: 3,
                        }}
                      />
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
