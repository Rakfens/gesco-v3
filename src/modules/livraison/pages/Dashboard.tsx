import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

/* ─── SVG Icons ─── */
const Icon = ({ d, size = 18, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const StatusIcon = ({ name, size = 14, color = "currentColor" }: { name: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {name === "clock" && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
    {name === "check" && <polyline points="20 6 9 17 4 12" />}
    {name === "rotate-left" && <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 10.49-3.74" /></>}
    {name === "xmark" && <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
  </svg>
);

const STATUS_OPTIONS = [
  { key: "en_cours", label: "En cours", color: "var(--warning)", bg: "var(--warning-light)", activeBg: "rgba(251,191,36,0.2)", icon: "clock" },
  { key: "livre", label: "Livré", color: "var(--success)", bg: "var(--success-light)", activeBg: "rgba(52,211,153,0.2)", icon: "check" },
  { key: "retourne", label: "Retourné", color: "var(--danger)", bg: "var(--danger-light)", activeBg: "rgba(248,113,113,0.2)", icon: "rotate-left" },
  { key: "reporte", label: "Reporté", color: "var(--accent2)", bg: "var(--accent2-light)", activeBg: "rgba(139,92,246,0.2)", icon: "xmark" },
];

function StatusButtons({ livraison, onUpdate }: { livraison: Livraison; onUpdate: (id: string, statut: string, remarque?: string) => void }) {
  const [showRemarque, setShowRemarque] = useState(false);
  const [remarque, setRemarque] = useState(livraison.remarque || "");
  const needsRemarque = livraison.statut === "retourne" || livraison.statut === "reporte";

  const handleClick = (key: string) => {
    if (key === "retourne" || key === "reporte") {
      setShowRemarque(true);
      onUpdate(livraison.id, key, remarque);
    } else {
      setShowRemarque(false);
      onUpdate(livraison.id, key);
    }
  };

  const handleRemarqueSubmit = () => {
    if (needsRemarque && remarque.trim()) {
      onUpdate(livraison.id, livraison.statut || "retourne", remarque);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {STATUS_OPTIONS.map((opt) => {
          const isActive = livraison.statut === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => handleClick(opt.key)}
              title={opt.label}
              style={{
                width: 36, height: 36, borderRadius: "var(--radius-md)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: isActive ? `1.5px solid ${opt.color}` : "1.5px solid var(--border)",
                background: isActive ? opt.activeBg : "var(--card)",
                color: isActive ? opt.color : "var(--text-muted)",
                cursor: "pointer", transition: "all var(--transition-fast)",
                boxShadow: isActive ? `0 0 12px ${opt.color}33` : "none",
              }}
            >
              <StatusIcon name={opt.icon} size={15} color={isActive ? opt.color : "var(--text-muted)"} />
            </button>
          );
        })}
      </div>

      {/* Champ remarque pour Retourné / Reporté */}
      {(showRemarque || needsRemarque) && (
        <div style={{
          width: "100%",
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          padding: 10,
          border: "1px solid var(--border)",
          animation: "fadeUp 0.2s ease",
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
          }}>
            {livraison.statut === "retourne" ? "Motif du retour" : "Motif du report"}
          </div>
          <textarea
            value={remarque}
            onChange={(e) => setRemarque(e.target.value)}
            placeholder={livraison.statut === "retourne" ? "Ex: Client injoignable, Adresse incorrecte..." : "Ex: Reporté au lendemain, Véhicule en panne..."}
            style={{
              width: "100%", minHeight: 60, padding: "8px 10px",
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", color: "var(--text)",
              fontSize: 12, fontFamily: "var(--font)", outline: "none",
              resize: "vertical", boxSizing: "border-box",
            }}
            onBlur={handleRemarqueSubmit}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button
              onClick={() => {
                onUpdate(livraison.id, livraison.statut || "retourne", remarque);
                setShowRemarque(false);
              }}
              style={{
                flex: 1, padding: "6px 12px", borderRadius: "var(--radius-sm)",
                background: "var(--accent)", color: "#08080c",
                border: "none", fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "var(--font)",
              }}
            >
              Enregistrer
            </button>
            <button
              onClick={() => setShowRemarque(false)}
              style={{
                padding: "6px 12px", borderRadius: "var(--radius-sm)",
                background: "transparent", color: "var(--text-muted)",
                border: "1px solid var(--border)", fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "var(--font)",
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard ─── */
export default function Dashboard() {
  const router = useRouter();
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

  const handleStatusUpdate = async (id: string, statut: string, remarque?: string) => {
    try {
      const updates: Record<string, unknown> = { statut };
      if (remarque !== undefined) updates.remarque = remarque;
      await onUpdateLivraison(id, updates);
      const label = STATUS_OPTIONS.find((s) => s.key === statut)?.label || statut;
      showToast(remarque ? `${label} — motif enregistré` : `Statut: ${label}`);
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
  const todayLivres = todayLivraisons.filter((l) => l.statut === "livre").length;

  return (
    <div>
      {/* ══ HEADER ══ */}
      <div style={{
        background: "linear-gradient(135deg, rgba(201,169,110,0.08) 0%, rgba(139,92,246,0.05) 100%)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        padding: isMobile ? "20px 16px" : "28px 32px",
        marginBottom: 28,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative glow */}
        <div style={{
          position: "absolute", top: -40, right: -40, width: 160, height: 160,
          background: "radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "var(--radius-lg)",
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 20px rgba(201,169,110,0.2)",
            }}>
              <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" size={22} color="#08080c" />
            </div>
            <div>
              <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", margin: 0 }}>
                Tableau de bord
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
                {currentCompany?.name || "HT-GesCom"} · {TODAY()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ STATS GRID ══ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
        gap: 14, marginBottom: 28,
      }}>
        <StatCard
          label="Total livraisons"
          value={totalLivraisons}
          color="var(--accent)"
          icon={<Icon d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" size={18} color="var(--accent)" />}
        />
        <StatCard
          label="En cours"
          value={enCours}
          color="var(--warning)"
          icon={<Icon d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2" size={18} color="var(--warning)" />}
        />
        <StatCard
          label="Livrés aujourd'hui"
          value={todayLivres}
          color="var(--success)"
          icon={<Icon d="M20 6L9 17l-5-5" size={18} color="var(--success)" />}
        />
        <StatCard
          label="Taux réussite"
          value={`${totalLivraisons ? Math.round((totalLivres / totalLivraisons) * 100) : 0}%`}
          color="var(--success)"
          icon={<Icon d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" size={18} color="var(--success)" />}
        />
      </div>

      {/* ══ LIVRAISONS ══ */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "var(--radius-md)",
              background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" size={15} color="var(--accent)" />
            </div>
            <CardTitle>Livraisons</CardTitle>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["jour", "mois"] as const).map((tab) => {
              const isActive = activeTab === tab;
              const count = tab === "jour" ? todayLivraisons.length : monthLivraisons.length;
              const label = tab === "jour" ? `Aujourd'hui (${count})` : `Ce mois (${count})`;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "7px 18px", borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 600,
                    border: isActive ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                    background: isActive ? "var(--accent-light)" : "transparent",
                    color: isActive ? "var(--accent)" : "var(--text-muted)",
                    cursor: "pointer", transition: "all var(--transition-fast)",
                    boxShadow: isActive ? "0 0 12px rgba(201,169,110,0.15)" : "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </CardHeader>

        {activeTab === "jour" ? (
          todayLivraisons.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0", fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
              Aucune livraison aujourd'hui.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {todayLivraisons.map((l) => (
                <div key={l.id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                  background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border)", flexWrap: "wrap",
                  transition: "all var(--transition-fast)",
                }}>
                  {/* Colis icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "var(--radius-md)",
                    background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Icon d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" size={16} color="var(--accent)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{l.colis}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {l.client_donneur || "—"} → {l.destinataire || "—"} {l.agent_nom ? `· ${l.agent_nom}` : ""}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: "var(--accent)",
                    whiteSpace: "nowrap", padding: "4px 10px",
                    background: "var(--accent-dim)", borderRadius: "var(--radius-full)",
                  }}>
                    {l.montant ? formatAr(l.montant) : "—"}
                  </div>
                  <StatusButtons livraison={l} onUpdate={handleStatusUpdate} />
                </div>
              ))}
            </div>
          )
        ) : (
          monthLivraisons.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0", fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
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
                    <TableCell align="right" style={{ color: "var(--accent)", fontWeight: 600 }}>{l.montant ? formatAr(l.montant) : "—"}</TableCell>
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

      {/* ══ RÉCUPÉRATIONS ══ */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "var(--radius-md)",
              background: "var(--success-light)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9" size={15} color="var(--success)" />
            </div>
            <div>
              <CardTitle>Récupérations matinales</CardTitle>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--success)", marginTop: 2 }}>
                {formatAr(totalRecuperationsJour)}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {nbRecuperationsJour} récupération(s)
              </div>
            </div>
          </div>
          <Input type="date" label="Date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </CardHeader>

        {loadingRecup && <SkeletonGrid cols={isMobile ? 1 : 2} rows={2} />}
        {errorRecup && (
          <div style={{ padding: 16, color: "var(--danger)", textAlign: "center", background: "var(--danger-light)", borderRadius: "var(--radius-md)", margin: "0 16px 16px" }}>
            {errorRecup}
          </div>
        )}

        {!loadingRecup && !errorRecup && Object.keys(recuperationsParLivreur).length > 0 ? (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 14 }}>
              {Object.values(recuperationsParLivreur).map((rl) => (
                <div key={rl.livreur} style={{
                  background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", padding: 16,
                  border: "1px solid var(--border)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{rl.livreur}</span>
                    <span style={{ color: "var(--success)", fontWeight: 700, fontSize: 13 }}>{rl.nb} récup. · {formatAr(rl.total)}</span>
                  </div>
                  {rl.details.map((d, idx) => (
                    <div key={idx} style={{
                      display: "flex", justifyContent: "space-between", padding: "6px 0",
                      borderBottom: idx < rl.details.length - 1 ? "1px solid var(--border)" : "none", fontSize: 12,
                    }}>
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
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0", fontSize: 13 }}>
              Aucune récupération pour cette date.
            </div>
          )
        )}
      </Card>

      {/* ══ COMMISSION GÉRANT ══ */}
      <div style={{
        background: "linear-gradient(135deg, rgba(201,169,110,0.06) 0%, rgba(139,92,246,0.04) 100%)",
        border: "1px solid rgba(201,169,110,0.12)", borderRadius: "var(--radius-xl)",
        padding: isMobile ? "20px" : "24px 28px", marginBottom: 28,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -30, right: -30, width: 120, height: 120,
          background: "radial-gradient(circle, rgba(201,169,110,0.1) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "var(--radius-sm)",
              background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={14} color="#08080c" />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Gérant — Aujourd'hui
            </span>
          </div>
          <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.02em" }}>
            {formatAr(gerantGain)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {livsGerant.length} livraisons × {formatAr(commissionGerant)}
          </div>
          {excludedToday.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--warning)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" size={12} color="var(--warning)" />
              {excludedToday.length} livraison(s) exclue(s)
            </div>
          )}
        </div>
        <Button variant="primary" onClick={() => router.push("/livraison/gerant")} style={{ position: "relative", zIndex: 1 }}>
          Voir détails →
        </Button>
      </div>

      {/* ══ RÉCAP PAR AGENT ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "var(--radius-md)",
            background: "var(--accent2-light)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" size={15} color="var(--accent2)" />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Récap par agent</h2>
        </div>
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
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 18, color: "#08080c",
                    boxShadow: "0 4px 12px rgba(201,169,110,0.2)",
                  }}>
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
                    { label: "Frais", value: formatAr(totalFrais), color: "var(--accent)" },
                  ].map((item) => (
                    <div key={item.label} style={{
                      textAlign: "center", background: "var(--bg-secondary)",
                      borderRadius: "var(--radius-md)", padding: "10px 4px",
                    }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    width: `${taux}%`, height: "100%",
                    background: taux >= 70 ? "var(--success)" : taux >= 40 ? "var(--warning)" : "var(--danger)",
                    borderRadius: 2, transition: "width 0.5s ease",
                  }} />
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textAlign: "right" }}>{taux}% réussite</div>
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
                <TableCell>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 14, color: "#08080c", flexShrink: 0,
                    }}>
                      {agent.nom?.charAt(0) || "?"}
                    </div>
                    <span style={{ fontWeight: 600 }}>{agent.nom}</span>
                  </div>
                </TableCell>
                <TableCell align="center" style={{ fontWeight: 700 }}>{ls.length}</TableCell>
                <TableCell align="center"><Badge variant="success" size="sm">{livres}</Badge></TableCell>
                <TableCell align="center"><Badge variant="danger" size="sm">{retournes}</Badge></TableCell>
                <TableCell align="center"><Badge variant="purple" size="sm">{reportes}</Badge></TableCell>
                <TableCell align="right" style={{ color: "var(--accent)", fontWeight: 600 }}>{formatAr(totalFrais)}</TableCell>
                <TableCell align="center">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                    <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        width: `${taux}%`, height: "100%",
                        background: taux >= 70 ? "var(--success)" : taux >= 40 ? "var(--warning)" : "var(--danger)",
                        borderRadius: 2, transition: "width 0.5s ease",
                      }} />
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
