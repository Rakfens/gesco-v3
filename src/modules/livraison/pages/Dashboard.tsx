import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Badge, Button, Card, CardHeader, CardTitle, Input,
  SkeletonGrid, StatCard, StatusBadge,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Agent, Livraison, Recuperation } from "@/modules/shared/types";
import {
  COMMISSION_DEFAUT, currentMonth, EXCLUDED_CLIENTS,
  formatAr, monthLabel, shouldCountGerantCommission, TODAY,
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

/* ─── Status Icon ─── */
const StatusIcon = ({ name, size = 14, color = "currentColor" }: { name: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {name === "clock" && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
    {name === "check" && <polyline points="20 6 9 17 4 12" />}
    {name === "rotate-left" && <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 10.49-3.74" /></>}
    {name === "xmark" && <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
  </svg>
);

const STATUS_OPTIONS = [
  { key: "en_cours", label: "En cours", color: "var(--warning-dark)", bg: "var(--warning-light)", activeBg: "rgba(253,235,113,0.25)", icon: "clock" },
  { key: "livre", label: "Livré", color: "var(--success-dark)", bg: "var(--success-light)", activeBg: "rgba(85,239,196,0.25)", icon: "check" },
  { key: "retourne", label: "Retourné", color: "var(--danger-dark)", bg: "var(--danger-light)", activeBg: "rgba(255,107,107,0.25)", icon: "rotate-left" },
  { key: "reporte", label: "Reporté", color: "var(--accent2-hover)", bg: "var(--accent2-light)", activeBg: "rgba(232,160,144,0.25)", icon: "xmark" },
];

function StatusButtons({ livraison, onUpdate }: { livraison: Livraison; onUpdate: (id: string, statut: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {STATUS_OPTIONS.map((opt) => {
        const isActive = livraison.statut === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onUpdate(livraison.id, opt.key)}
            title={opt.label}
            style={{
              width: 34, height: 34, borderRadius: "var(--radius-md)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: isActive ? `1.5px solid ${opt.color}` : "1.5px solid var(--border)",
              background: isActive ? opt.activeBg : "var(--card)",
              color: isActive ? opt.color : "var(--text-muted)",
              cursor: "pointer", transition: "all var(--transition-fast)",
              boxShadow: isActive ? `0 0 12px ${opt.color}33` : "none",
            }}
          >
            <StatusIcon name={opt.icon} size={14} color={isActive ? opt.color : "var(--text-muted)"} />
          </button>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { agents = [], livraisons = [], showToast, updateLivraison: onUpdateLivraison } = useApp();
  const { currentCompany } = useCompany();
  const commissionGerant = COMMISSION_DEFAUT;
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<string>(TODAY());
  const [recuperationsJour, setRecuperationsJour] = useState<Recuperation[]>([]);
  const [loadingRecup, setLoadingRecup] = useState(false);
  const [errorRecup, setErrorRecup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"jour" | "mois">("jour");

  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];
  const safeAgents = Array.isArray(agents) ? agents : [];

  const {
    enCours, todayLivraisons, livsGerant, gerantGain, excludedToday,
  } = useMemo(() => {
    const todayLivs = safeLivraisons.filter((l) => l.date === TODAY());
    const enCours = todayLivs.filter((l) => l.statut === "en_cours").length;
    const livsGerant = todayLivs.filter((l) => shouldCountGerantCommission(l));
    const gerantGain = livsGerant.length * commissionGerant;
    const excludedToday = todayLivs.filter(
      (l) => EXCLUDED_CLIENTS.includes(l.client_donneur?.toUpperCase() || "")
        && (Number(l.frais) || 0) > 0,
    );
    return { enCours, todayLivraisons: todayLivs, livsGerant, gerantGain, excludedToday };
  }, [safeLivraisons]);

  const monthLivraisons = useMemo(() => {
    const fm = currentMonth();
    return safeLivraisons.filter((l) => l.date && l.date.startsWith(fm));
  }, [safeLivraisons]);

  const handleStatusUpdate = async (id: string, statut: string) => {
    try {
      await onUpdateLivraison(id, { statut });
      showToast(`Statut: ${STATUS_OPTIONS.find((s) => s.key === statut)?.label || statut}`);
    } catch {
      showToast("Erreur mise à jour", "error");
    }
  };

  useEffect(() => {
    const loadRecuperations = async () => {
      setLoadingRecup(true); setErrorRecup(null);
      try {
        const { getRecuperationsByDate: fetchRecup } = await import("../services/recuperationService");
        const data = await fetchRecup(selectedDate);
        setRecuperationsJour(data || []);
      } catch (error: unknown) {
        logger.error("Erreur récupérations:", error);
        setErrorRecup("Erreur lors du chargement.");
      } finally { setLoadingRecup(false); }
    };
    loadRecuperations();
  }, [selectedDate]);

  const {
    totalRecuperationsJour, nbRecuperationsJour, recuperationsParLivreur,
  } = useMemo(() => {
    const total = recuperationsJour.reduce((s, r) => s + (r.frais_recuperation || 0), 0);
    const nb = recuperationsJour.length;
    const parLivreur: Record<string, RecupParLivreur> = recuperationsJour.reduce((acc, r) => {
      const nom = r.livreur_nom;
      if (!acc[nom]) acc[nom] = { livreur: nom, total: 0, nb: 0, details: [] };
      acc[nom].total += r.frais_recuperation ?? 0;
      acc[nom].nb += 1;
      acc[nom].details.push({ client: r.client_donneur, frais: r.frais_recuperation ?? 0 });
      return acc;
    }, {} as Record<string, RecupParLivreur>);
    return { totalRecuperationsJour: total, nbRecuperationsJour: nb, recuperationsParLivreur: parLivreur };
  }, [recuperationsJour]);

  const agentStats = useMemo(() => {
    return safeAgents.map((a) => {
      const ls = safeLivraisons.filter((l) => agentMatch(l, a));
      const totalFrais = ls.reduce((s, l) => s + (Number(l.frais) || 0), 0);
      const livres = ls.filter((l) => l.statut === "livre").length;
      const retournes = ls.filter((l) => l.statut === "retourne").length;
      const reportes = ls.filter((l) => l.statut === "reporte").length;
      return { agent: a, ls, totalFrais, livres, retournes, reportes, taux: ls.length ? Math.round((livres / ls.length) * 100) : 0 };
    });
  }, [safeAgents, safeLivraisons]);

  const totalLivraisons = safeLivraisons.length;
  const totalLivres = safeLivraisons.filter((l) => l.statut === "livre").length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
          Tableau de bord
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
          {currentCompany?.name || "HT-GesCom"} · Aperçu de l'activité · {TODAY()}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        <StatCard label="Total livraisons" value={totalLivraisons} color="var(--cyan-dark)" />
        <StatCard label="En cours" value={enCours} color="var(--warning-dark)" />
        <StatCard label="Livrés aujourd'hui" value={todayLivraisons.filter((l) => l.statut === "livre").length} color="var(--success-dark)" />
        <StatCard label="Taux réussite" value={`${totalLivraisons ? Math.round((totalLivres / totalLivraisons) * 100) : 0}%`} color="var(--success-dark)" />
      </div>

      {/* ══ LIVRAISONS PAR JOUR / PAR MOIS ══ */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader>
          <div>
            <CardTitle>Livraisons</CardTitle>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setActiveTab("jour")}
              style={{
                padding: "6px 16px", borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 600,
                border: activeTab === "jour" ? "1.5px solid var(--cyan)" : "1.5px solid var(--border)",
                background: activeTab === "jour" ? "var(--cyan-light)" : "transparent",
                color: activeTab === "jour" ? "var(--cyan-dark)" : "var(--text-muted)",
                cursor: "pointer", transition: "all var(--transition-fast)",
              }}
            >
              Aujourd'hui ({todayLivraisons.length})
            </button>
            <button
              onClick={() => setActiveTab("mois")}
              style={{
                padding: "6px 16px", borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 600,
                border: activeTab === "mois" ? "1.5px solid var(--rose-dark)" : "1.5px solid var(--border)",
                background: activeTab === "mois" ? "var(--rose-light)" : "transparent",
                color: activeTab === "mois" ? "var(--rose-deep)" : "var(--text-muted)",
                cursor: "pointer", transition: "all var(--transition-fast)",
              }}
            >
              Ce mois ({monthLivraisons.length})
            </button>
          </div>
        </CardHeader>

        {activeTab === "jour" ? (
          todayLivraisons.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0", fontSize: 13 }}>
              Aucune livraison aujourd'hui.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todayLivraisons.map((l) => (
                <div key={l.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  background: "var(--bg-secondary)", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)", flexWrap: "wrap",
                }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{l.colis}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {l.client_donneur || "—"} → {l.destinataire || "—"} {l.agent_nom ? `· ${l.agent_nom}` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {l.montant ? formatAr(l.montant) : ""}
                  </div>
                  <StatusButtons livraison={l} onUpdate={handleStatusUpdate} />
                </div>
              ))}
            </div>
          )
        ) : (
          monthLivraisons.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0", fontSize: 13 }}>
              Aucune livraison ce mois-ci.
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Colis</TableHeader>
                  <TableHeader>Donneur</TableHeader>
                  <TableHeader>Destinataire</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader align="right">Montant</TableHeader>
                  <TableHeader align="center">Statut</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthLivraisons.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell style={{ fontWeight: 600 }}>{l.colis}</TableCell>
                    <TableCell>{l.client_donneur || "—"}</TableCell>
                    <TableCell>{l.destinataire}</TableCell>
                    <TableCell style={{ color: "var(--text-muted)", fontSize: 12 }}>{l.date}</TableCell>
                    <TableCell align="right" style={{ color: "var(--cyan-dark)", fontWeight: 600 }}>{l.montant ? formatAr(l.montant) : "—"}</TableCell>
                    <TableCell align="center">
                      <StatusButtons livraison={l} onUpdate={handleStatusUpdate} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}
      </Card>

      {/* Récupérations */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader>
          <div>
            <CardTitle>Récupérations matinales</CardTitle>
            <div style={{ fontSize: 30, fontWeight: 800, color: "var(--cyan)", marginTop: 4 }}>
              {formatAr(totalRecuperationsJour)}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {nbRecuperationsJour} récupération(s)
            </div>
          </div>
          <Input type="date" label="Date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </CardHeader>

        {loadingRecup && <SkeletonGrid cols={isMobile ? 1 : 2} rows={2} />}
        {errorRecup && <div style={{ padding: 16, color: "var(--danger)", textAlign: "center" }}>{errorRecup}</div>}

        {!loadingRecup && !errorRecup && Object.keys(recuperationsParLivreur).length > 0 ? (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 14 }}>
              {Object.values(recuperationsParLivreur).map((rl) => (
                <div key={rl.livreur} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", padding: 16, border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{rl.livreur}</span>
                    <span style={{ color: "var(--cyan)", fontWeight: 700, fontSize: 13 }}>{rl.nb} récup. · {formatAr(rl.total)}</span>
                  </div>
                  {rl.details.map((d, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: idx < rl.details.length - 1 ? "1px solid var(--border)" : "none", fontSize: 12 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{d.client}</span>
                      <span style={{ color: "var(--success)", fontWeight: 600 }}>{formatAr(d.frais)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          !loadingRecup && !errorRecup && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0", fontSize: 13 }}>
              Aucune récupération pour cette date.
            </div>
          )
        )}
      </Card>

      {/* Commission gérant */}
      <div style={{
        background: "linear-gradient(135deg, rgba(127,232,254,0.08), rgba(232,160,144,0.08))",
        border: "1px solid rgba(127,232,254,0.15)", borderRadius: "var(--radius-lg)",
        padding: "24px 28px", marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Gérant — Aujourd'hui
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "var(--text)" }}>{formatAr(gerantGain)}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {livsGerant.length} livraisons × {formatAr(commissionGerant)}
          </div>
          {excludedToday.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--warning-dark)", marginTop: 4 }}>{excludedToday.length} livraison(s) exclue(s)</div>
          )}
        </div>
        <Button variant="primary" onClick={() => {}}>Voir détails →</Button>
      </div>

      {/* Récap par agent */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Récap par agent</h2>
        <Badge variant="default" size="sm">Tous temps</Badge>
      </div>

      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {safeAgents.length === 0 ? (
            <Card padding={24}>
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Aucun agent enregistré.</div>
            </Card>
          ) : (
            agentStats.map(({ agent, ls, totalFrais, livres, retournes, reportes, taux }) => (
              <Card key={agent.id} padding={16}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, var(--cyan), var(--rose))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>
                    {agent.nom?.charAt(0) || "?"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{agent.nom}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{ls.length} livraisons</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                  {[
                    { label: "Livrés", value: livres, color: "var(--success)" },
                    { label: "Retournés", value: retournes, color: "var(--danger)" },
                    { label: "Reportés", value: reportes, color: "var(--accent2)" },
                    { label: "Frais", value: formatAr(totalFrais), color: "var(--cyan)" },
                  ].map((item) => (
                    <div key={item.label} style={{ textAlign: "center", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "10px 4px" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${taux}%`, height: "100%", background: taux >= 70 ? "var(--success)" : taux >= 40 ? "var(--warning)" : "var(--danger)", borderRadius: 2 }} />
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Agent</TableHeader>
              <TableHeader align="center">Total</TableHeader>
              <TableHeader align="center">Livrés</TableHeader>
              <TableHeader align="center">Retournés</TableHeader>
              <TableHeader align="center">Reportés</TableHeader>
              <TableHeader align="right">Frais</TableHeader>
              <TableHeader align="center">Taux</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {agentStats.map(({ agent, ls, totalFrais, livres, retournes, reportes, taux }) => (
              <TableRow key={agent.id}>
                <TableCell style={{ fontWeight: 600 }}>{agent.nom}</TableCell>
                <TableCell align="center" style={{ fontWeight: 700 }}>{ls.length}</TableCell>
                <TableCell align="center"><Badge variant="success" size="sm">{livres}</Badge></TableCell>
                <TableCell align="center"><Badge variant="danger" size="sm">{retournes}</Badge></TableCell>
                <TableCell align="center"><Badge variant="purple" size="sm">{reportes}</Badge></TableCell>
                <TableCell align="right" style={{ color: "var(--cyan)", fontWeight: 600 }}>{formatAr(totalFrais)}</TableCell>
                <TableCell align="center">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                    <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${taux}%`, height: "100%", background: taux >= 70 ? "var(--success)" : taux >= 40 ? "var(--warning)" : "var(--danger)" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{taux}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
