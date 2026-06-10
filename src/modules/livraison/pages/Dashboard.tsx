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
  { key: "en_cours", label: "En cours", color: "#fbbf24", activeBg: "rgba(251,191,36,0.15)", icon: "clock" },
  { key: "livre", label: "Livré", color: "#34d399", activeBg: "rgba(52,211,153,0.15)", icon: "check" },
  { key: "retourne", label: "Retourné", color: "#f87171", activeBg: "rgba(248,113,113,0.15)", icon: "rotate-left" },
  { key: "reporte", label: "Reporté", color: "#a78bfa", activeBg: "rgba(167,139,250,0.15)", icon: "xmark" },
];

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
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRemarque = async () => {
    if (!remarque.trim()) return;
    setSaving(true);
    try {
      await onUpdate(livraison.id, { statut: livraison.statut || "retourne", remarque });
      setShowRemarque(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMontant = async () => {
    setSaving(true);
    try {
      await onUpdate(livraison.id, { montant: parseFloat(montant) || 0 });
      setEditingMontant(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
      {/* Boutons de statut */}
      <div style={{ display: "flex", gap: 8 }}>
        {STATUS_OPTIONS.map((opt) => {
          const isActive = livraison.statut === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => handleStatusChange(opt.key)}
              disabled={saving}
              title={opt.label}
              style={{
                width: 46, height: 46, borderRadius: "var(--radius-lg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: isActive ? `2px solid ${opt.color}` : "2px solid var(--border2)",
                background: isActive ? opt.activeBg : "var(--bg-secondary)",
                color: isActive ? opt.color : "var(--text-muted)",
                cursor: saving ? "wait" : "pointer",
                transition: "all var(--transition-fast)",
                boxShadow: isActive ? `0 0 16px ${opt.color}44` : "var(--shadow-xs)",
                opacity: saving ? 0.5 : 1,
                transform: isActive ? "scale(1.08)" : "scale(1)",
              }}
            >
              <StatusIcon name={opt.icon} size={18} color={isActive ? opt.color : "var(--text-muted)"} />
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
          padding: 12,
          border: "1px solid var(--border)",
          animation: "fadeUp 0.2s ease",
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
          }}>
            {livraison.statut === "retourne" ? "⚠️ Motif du retour" : "📅 Motif du report"}
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
            autoFocus
          />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button
              onClick={() => {
                onUpdate(livraison.id, { statut: livraison.statut || "retourne", remarque });
                setShowRemarque(false);
              }}
              disabled={saving || !remarque.trim()}
              style={{
                flex: 1, padding: "8px 14px", borderRadius: "var(--radius-sm)",
                background: remarque.trim() ? "var(--accent)" : "var(--bg-tertiary)",
                color: remarque.trim() ? "#08080c" : "var(--text-faint)",
                border: "none", fontSize: 12, fontWeight: 700,
                cursor: remarque.trim() && !saving ? "pointer" : "not-allowed",
                fontFamily: "var(--font)", transition: "all var(--transition-fast)",
              }}
            >
              {saving ? "..." : "✓ Enregistrer"}
            </button>
            <button
              onClick={() => { setShowRemarque(false); setRemarque(livraison.remarque || ""); }}
              disabled={saving}
              style={{
                padding: "8px 14px", borderRadius: "var(--radius-sm)",
                background: "transparent", color: "var(--text-muted)",
                border: "1px solid var(--border)", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "var(--font)",
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Modification du montant */}
      {editingMontant ? (
        <div style={{
          width: "100%",
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          padding: 12,
          border: "1px solid var(--accent)",
          animation: "fadeUp 0.2s ease",
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "var(--accent)",
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
          }}>
            💰 Modifier le montant
          </div>
          <input
            type="number"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="Montant en Ar"
            style={{
              width: "100%", padding: "8px 10px",
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", color: "var(--text)",
              fontSize: 13, fontFamily: "var(--font)", outline: "none",
              boxSizing: "border-box",
            }}
            autoFocus
          />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button
              onClick={handleSaveMontant}
              disabled={saving}
              style={{
                flex: 1, padding: "8px 14px", borderRadius: "var(--radius-sm)",
                background: "var(--accent)", color: "#08080c",
                border: "none", fontSize: 12, fontWeight: 700,
                cursor: saving ? "wait" : "pointer",
                fontFamily: "var(",
              }}
            >
              {saving ? "..." : "✓ Enregistrer"}
            </button>
            <button
              onClick={() => { setEditingMontant(false); setMontant(String(livraison.montant || "")); }}
              disabled={saving}
              style={{
                padding: "8px 14px", borderRadius: "var(--radius-sm)",
                background: "transparent", color: "var(--text-muted)",
                border: "1px solid var(--border)", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "var(--font)",
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditingMontant(true)}
          style={{
            padding: "4px 10px", borderRadius: "var(--radius-sm)",
            background: "transparent", color: "var(--text-muted)",
            border: "1px solid var(--border)", fontSize: 11, fontWeight: 500,
            cursor: "pointer", fontFamily: "var(--font)",
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          ✏️ Modifier montant
        </button>
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
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth());
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

  // Mois disponibles pour le sélecteur
  const availableMonths = useMemo(() => {
    const months = new Set(safeLivraisons.map((l) => l.date?.slice(0, 7)).filter(Boolean));
    months.add(currentMonth());
    return [...months].sort().reverse() as string[];
  }, [safeLivraisons]);

  // Livraisons du mois sélectionné
  const selectedMonthLivraisons = useMemo(() => {
    return safeLivraisons
      .filter((l) => l.date && l.date.startsWith(selectedMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [safeLivraisons, selectedMonth]);

  const handleStatusUpdate = async (id: string, updates: Record<string, unknown>) => {
    try {
      await onUpdateLivraison(id, updates);
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
  const todayRetournes = todayLivraisons.filter((l) => l.statut === "retourne").length;
  const todayReportes = todayLivraisons.filter((l) => l.statut === "reporte").length;
  const todayMontant = todayLivraisons.reduce((s, l) => s + (Number(l.montant) || 0), 0);
  const monthMontant = selectedMonthLivraisons.reduce((s, l) => s + (Number(l.montant) || 0), 0);

  return (
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both" }}>
      {/* ══ HEADER ══ */}
      <div style={{
        background: "linear-gradient(135deg, rgba(201,169,110,0.08) 0%, rgba(139,92,246,0.05) 100%)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        padding: isMobile ? "20px 16px" : "28px 32px",
        marginBottom: 24,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40, width: 160, height: 160,
          background: "radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "var(--radius-lg)",
              background: "linear-gradient(135deg, #c9a96e, #8b5cf6)",
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
          {/* Quick stats in header */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "Aujourd'hui", value: `${todayLivraisons.length} livraison${todayLivraisons.length !== 1 ? "s" : ""}`, color: "#c9a96e" },
              { label: "Montant du jour", value: formatAr(todayMontant), color: "#34d399" },
              { label: "Taux réussite", value: `${totalLivraisons ? Math.round((totalLivres / totalLivraisons) * 100) : 0}%`, color: "#34d399" },
            ].map((q) => (
              <div key={q.label} style={{
                padding: "8px 14px", borderRadius: "var(--radius-full)",
                background: `${q.color}10`, border: `1px solid ${q.color}25`,
              }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 6 }}>{q.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: q.color }}>{q.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ STATS GRID ══ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
        gap: 14, marginBottom: 24,
      }}>
        <StatCard
          label="Total livraisons"
          value={totalLivraisons}
          color="#c9a96e"
          icon={<Icon d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" size={18} color="#c9a96e" />}
        />
        <StatCard
          label="En cours"
          value={enCours}
          color="#fbbf24"
          icon={<Icon d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2" size={18} color="#fbbf24" />}
        />
        <StatCard
          label="Livrés aujourd'hui"
          value={todayLivres}
          color="#34d399"
          icon={<Icon d="M20 6L9 17l-5-5" size={18} color="#34d399" />}
        />
        <StatCard
          label="Montant du mois"
          value={formatAr(monthMontant)}
          color="#a78bfa"
          icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} color="#a78bfa" />}
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
          {/* Sélecteur de mois */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => {
                const prev = new Date(selectedMonth + "-01");
                prev.setMonth(prev.getMonth() - 1);
                setSelectedMonth(prev.toISOString().slice(0, 7));
                setActiveTab("mois");
              }}
              style={{
                width: 32, height: 32, borderRadius: "var(--radius-md)",
                background: "var(--bg-secondary)", border: "1px solid var(--border)",
                color: "var(--text)", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 16,
              }}
            >
              ‹
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setActiveTab("mois"); }}
              style={{
                padding: "7px 14px", borderRadius: "var(--radius-full)", fontSize: 13, fontWeight: 600,
                border: "1.5px solid var(--accent)", background: "var(--accent-light)",
                color: "var(--accent)", cursor: "pointer", outline: "none",
                fontFamily: "var(--font)", appearance: "none",
                textAlign: "center", minWidth: 140,
              }}
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const next = new Date(selectedMonth + "-01");
                next.setMonth(next.getMonth() + 1);
                const nextStr = next.toISOString().slice(0, 7);
                if (nextStr <= currentMonth()) {
                  setSelectedMonth(nextStr);
                  setActiveTab("mois");
                }
              }}
              disabled={selectedMonth >= currentMonth()}
              style={{
                width: 32, height: 32, borderRadius: "var(--radius-md)",
                background: selectedMonth >= currentMonth() ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: selectedMonth >= currentMonth() ? "var(--text-faint)" : "var(--text)",
                cursor: selectedMonth >= currentMonth() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
              }}
            >
              ›
            </button>
          </div>
        </CardHeader>

        {/* Tabs Jour / Mois */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, padding: "0 20px" }}>
          {(["jour", "mois"] as const).map((tab) => {
            const isActive = activeTab === tab;
            const count = tab === "jour" ? todayLivraisons.length : selectedMonthLivraisons.length;
            const label = tab === "jour" ? `Aujourd'hui (${count})` : `${monthLabel(selectedMonth)} (${count})`;
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

        {/* Contenu */}
        {activeTab === "jour" ? (
          todayLivraisons.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0", fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
              Aucune livraison aujourd'hui.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 20px 20px" }}>
              {todayLivraisons.map((l) => (
                <div key={l.id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                  background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border)", flexWrap: "wrap",
                  transition: "all var(--transition-fast)",
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "var(--radius-md)",
                    background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Icon d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" size={16} color="#c9a96e" />
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{l.colis}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {l.client_donneur || "—"} → {l.destinataire || "—"} {l.agent_nom ? `· ${l.agent_nom}` : ""}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: "#c9a96e",
                    whiteSpace: "nowrap", padding: "4px 10px",
                    background: "rgba(201,169,110,0.08)", borderRadius: "var(--radius-full)",
                  }}>
                    {l.montant ? formatAr(l.montant) : "—"}
                  </div>
                  <StatusButtons livraison={l} onUpdate={handleStatusUpdate} />
                </div>
              ))}
            </div>
          )
        ) : (
          selectedMonthLivraisons.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0", fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
              Aucune livraison en {monthLabel(selectedMonth)}.
            </div>
          ) : (
            <div style={{ padding: "0 20px 20px" }}>
              {/* Stats du mois */}
              <div style={{
                display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
                gap: 10, marginBottom: 16,
              }}>
                {[
                  { label: "Total", value: selectedMonthLivraisons.length, color: "var(--accent)" },
                  { label: "Livrés", value: selectedMonthLivraisons.filter((l) => l.statut === "livre").length, color: "var(--success)" },
                  { label: "En cours", value: selectedMonthLivraisons.filter((l) => l.statut === "en_cours").length, color: "var(--warning)" },
                  { label: "Retournés", value: selectedMonthLivraisons.filter((l) => l.statut === "retourne").length, color: "var(--danger)" },
                ].map((s) => (
                  <div key={s.label} style={{
                    textAlign: "center", padding: "10px 6px",
                    background: "var(--bg-secondary)", borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Liste des livraisons du mois */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedMonthLivraisons.map((l) => (
                  <div key={l.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                    background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--border)", flexWrap: "wrap",
                  }}>
                    {/* Date badge */}
                    <div style={{
                      width: 46, height: 46, borderRadius: "var(--radius-md)",
                      background: "var(--accent-dim)", display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>
                        {l.date.split("-")[2]}
                      </span>
                      <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        {["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"][parseInt(l.date.split("-")[1]) - 1]}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{l.colis}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                        {l.client_donneur || "—"} → {l.destinataire || "—"}
                      </div>
                      {l.agent_nom && (
                        <div style={{ fontSize: 10, color: "var(--accent)", marginTop: 1 }}>🚚 {l.agent_nom}</div>
                      )}
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: "var(--accent)",
                      whiteSpace: "nowrap", padding: "3px 8px",
                      background: "var(--accent-dim)", borderRadius: "var(--radius-full)",
                    }}>
                      {l.montant ? formatAr(l.montant) : "—"}
                    </div>
                    <StatusButtons livraison={l} onUpdate={handleStatusUpdate} />
                  </div>
                ))}
              </div>
            </div>
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
      <div style={{ marginBottom: 28 }}>
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

        {safeAgents.length === 0 ? (
          <Card padding={32}>
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
              Aucun agent enregistré.
            </div>
          </Card>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 14,
          }}>
            {agentStats.map(({ agent, ls, totalFrais, livres, retournes, reportes, taux }) => (
              <Card key={agent.id} padding={0} style={{ overflow: "hidden" }}>
                {/* Header avec gradient */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(201,169,110,0.08) 0%, rgba(139,92,246,0.05) 100%)",
                  padding: "16px 18px",
                  borderBottom: "1px solid var(--border)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 20, color: "#08080c",
                      boxShadow: "0 4px 16px rgba(201,169,110,0.25)",
                      flexShrink: 0,
                    }}>
                      {agent.nom?.charAt(0) || "?"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{agent.nom}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                        {ls.length} livraison{ls.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    {/* Taux badge */}
                    <div style={{
                      padding: "4px 10px", borderRadius: "var(--radius-full)",
                      background: taux >= 70 ? "var(--success-light)" : taux >= 40 ? "var(--warning-light)" : "var(--danger-light)",
                      color: taux >= 70 ? "var(--success)" : taux >= 40 ? "var(--warning)" : "var(--danger)",
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {taux}%
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ padding: "14px 18px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                    {[
                      { label: "Livrés", value: livres, color: "var(--success)", icon: "✓" },
                      { label: "Retournés", value: retournes, color: "var(--danger)", icon: "↩" },
                      { label: "Reportés", value: reportes, color: "var(--accent2)", icon: "⏰" },
                      { label: "Frais", value: formatAr(totalFrais), color: "var(--accent)", icon: "💰" },
                    ].map((item) => (
                      <div key={item.label} style={{
                        textAlign: "center", padding: "10px 4px",
                        background: "var(--bg-secondary)", borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                      }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>{item.icon}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Barre de progression */}
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Taux de réussite</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: taux >= 70 ? "var(--success)" : taux >= 40 ? "var(--warning)" : "var(--danger)" }}>{taux}%</span>
                    </div>
                    <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        width: `${taux}%`, height: "100%",
                        background: taux >= 70 ? "linear-gradient(90deg, #34d399, #10b981)" : taux >= 40 ? "linear-gradient(90deg, #fbbf24, #f59e0b)" : "linear-gradient(90deg, #f87171, #ef4444)",
                        borderRadius: 3, transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
