"use client";

import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Badge, Button, Card, CardHeader, CardTitle, Input, Modal, ModalBody, ModalFooter, ModalHeader, SectionHeader, Select, StatCard,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Agent, Avance, Livraison, Recuperation } from "@/modules/shared/types";
import {
  COMMISSION_DEFAUT, currentMonth, formatAr, monthLabel, shouldCountGerantCommission, TODAY,
} from "@/modules/shared/utils/constants";
import { getRecuperationsByMonth } from "../services/recuperationService";

/* ─── Colors ─── */
const C = {
  gold: "#c9a96e", goldDim: "rgba(201,169,110,0.1)",
  success: "#34d399", successDim: "rgba(52,211,153,0.1)",
  warning: "#fbbf24", warningDim: "rgba(251,191,36,0.1)",
  danger: "#f87171", dangerDim: "rgba(248,113,113,0.1)",
  violet: "#8b5cf6", violetDim: "rgba(139,92,246,0.1)",
  pink: "#f472b6", pinkDim: "rgba(244,114,182,0.1)",
};

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

interface AgentStats extends Agent {
  nbLivs: number; nbLivres: number; nbRetours: number; nbReportes: number;
  totalFrais: number; totalAvances: number; netSalaire: number;
  avances: Avance[]; recuperations: Recuperation[]; totalRecuperations: number; nbRecuperations: number;
}

export default function Recap() {
  const { livraisons, avances, agents, showToast, addAvance: onAddAvance, deleteAvance: onDeleteAvance } = useApp();
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

  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];
  const safeAvances = Array.isArray(avances) ? avances : [];
  const safeAgents = Array.isArray(agents) ? agents : [];

  const months = useMemo(() => {
    const s = new Set(safeLivraisons.map((l) => l.date?.slice(0, 7)).filter(Boolean));
    s.add(currentMonth());
    return [...s].sort().reverse() as string[];
  }, [safeLivraisons]);

  const { monthLivs, monthAvances } = useMemo(() => {
    return {
      monthLivs: safeLivraisons.filter((l) => l.date?.startsWith(selectedMonth)),
      monthAvances: safeAvances.filter((a) => a.mois === selectedMonth && !a.annule),
    };
  }, [safeLivraisons, safeAvances, selectedMonth]);

  useEffect(() => {
    const load = async () => {
      setLoadingRecup(true);
      try {
        if (!currentCompany?.id) return;
        const data = await getRecuperationsByMonth(selectedMonth, currentCompany.id);
        setRecuperationsMois(data || []);
      } catch (error: unknown) { logger.error("Erreur récupérations:", error); }
      finally { setLoadingRecup(false); }
    };
    load();
  }, [selectedMonth, currentCompany?.id, showToast]);

  const livsGerant = (arr: Livraison[]) => arr.filter((l) => shouldCountGerantCommission(l));

  const monthStatsByAgent: AgentStats[] = useMemo(() => {
    return safeAgents.map((ag) => {
      const ls = monthLivs.filter((l) => l.agent_id === ag.id || l.agent_nom === ag.nom);
      const av = monthAvances.filter((a) => a.agent_id === ag.id);
      const recups = recuperationsMois.filter((r) => r.livreur_nom === ag.nom);
      const totalRecups = recups.reduce((s, r) => s + (r.frais_recuperation || 0), 0);
      return {
        ...ag,
        nbLivs: ls.length,
        nbLivres: ls.filter((l) => l.statut === "livre").length,
        nbRetours: ls.filter((l) => l.statut === "retourne").length,
        nbReportes: ls.filter((l) => l.statut === "reporte").length,
        totalFrais: ls.reduce((s, l) => s + (Number(l.frais) || 0), 0),
        totalAvances: av.reduce((s, a) => s + (Number(a.montant) || 0), 0),
        netSalaire: Number(ag.salaire) || 0 - av.reduce((s, a) => s + (Number(a.montant) || 0), 0),
        avances: av,
        recuperations: recups,
        totalRecuperations: totalRecups,
        nbRecuperations: recups.length,
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
  }, [monthLivs, monthStatsByAgent, livsGerant]);

  const handleAddAvance = async () => {
    if (!avanceAgentId || !avanceMontant) { showToast("Agent et montant requis", "error"); return; }
    const agent = safeAgents.find((a) => a.id === avanceAgentId);
    if (!agent) { showToast("Agent invalide", "error"); return; }
    setSaving(true);
    try {
      await onAddAvance({
        agent_id: avanceAgentId, agent_nom: agent.nom,
        montant: Number(avanceMontant) || 0, motif: avanceMotif,
        date: TODAY().split("T")[0], mois: currentMonth(), annule: false,
      });
      setAvanceAgentId(""); setAvanceMontant(""); setAvanceMotif("");
      showToast("Avance ajoutée");
    } catch (error: unknown) { logger.error("Erreur avance:", error); showToast("Erreur lors de l'ajout.", "error"); }
    finally { setSaving(false); }
  };

  const executeDeleteAvance = async () => {
    if (!confirmAvance) return;
    const id = confirmAvance;
    setConfirmAvance(null);
    setSaving(true);
    try { await onDeleteAvance(id); showToast("Avance supprimée", "warn"); }
    catch { showToast("Erreur", "error"); }
    finally { setSaving(false); }
  };

  const agentOptions = useMemo(() => safeAgents.map((a) => ({ value: a.id, label: a.nom })), [safeAgents]);

  return (
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.goldDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={18} color={C.gold} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Récapitulatif</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>{currentCompany?.name}</p>
          </div>
        </div>
        <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
          options={months.map((m) => ({ value: m, label: monthLabel(m) }))} style={{ minWidth: 140 }} />
      </div>

      {/* ══ BÉNÉFICE NET ══ */}
      <Card style={{ marginBottom: 20, borderColor: monthBenefice >= 0 ? C.success : C.danger }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: monthBenefice >= 0 ? C.success : C.danger, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              💰 Bénéfice net — {monthLabel(selectedMonth)}
            </div>
            <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: 900, color: monthBenefice >= 0 ? C.success : C.danger }}>
              {formatAr(monthBenefice)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Frais — Salaires — Commission — Récupérations
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {[
              { label: "Montant colis", value: formatAr(monthTotalMontant), color: C.success },
              { label: "Frais collectés", value: formatAr(monthTotalFrais), color: C.gold },
              { label: "Salaires", value: formatAr(monthTotalSalaires), color: C.danger },
              { label: "Commission", value: formatAr(monthGerantGain), color: C.pink },
            ].map((s) => (
              <div key={s.label} style={{ padding: "6px 10px", background: "var(--bg-secondary)", borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ══ COMMISSION GÉRANT ══ */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.pink, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              👑 Commission gérant — {monthLabel(selectedMonth)}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>{formatAr(monthGerantGain)}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {livsGerant(monthLivs).length} livraisons × {formatAr(commissionGerant)}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-muted)" }}>
            <div>Frais collectés: <b style={{ color: C.violet }}>{formatAr(monthTotalFrais)}</b></div>
            <div>Frais nets: <b style={{ color: monthTotalFrais - monthGerantGain >= 0 ? C.success : C.danger }}>{formatAr(monthTotalFrais - monthGerantGain)}</b></div>
          </div>
        </div>
      </Card>

      {/* ══ STATS PAR AGENT ══ */}
      <SectionHeader title={`Agents — ${monthLabel(selectedMonth)}`} subtitle={`${monthStatsByAgent.length} agent(s)`} />

      {loadingRecup && (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 10, marginBottom: 10 }}>
          Chargement des récupérations...
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {monthStatsByAgent.map((a) => (
          <Card key={a.id} padding={0} style={{ overflow: "hidden" }}>
            {/* Header agent */}
            <div style={{
              background: "linear-gradient(135deg, rgba(201,169,110,0.06) 0%, rgba(139,92,246,0.04) 100%)",
              padding: "14px 16px", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "linear-gradient(135deg, #c9a96e, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 16, color: "#08080c",
                  boxShadow: "0 4px 12px rgba(201,169,110,0.2)", flexShrink: 0,
                }}>
                  {a.nom?.charAt(0) || "?"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{a.nom}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Badge variant="success" size="sm">Sal: {formatAr(a.salaire)}</Badge>
                    {a.totalAvances > 0 && <Badge variant="warning" size="sm">Av: {formatAr(a.totalAvances)}</Badge>}
                    <Badge variant={a.netSalaire >= 0 ? "success" : "danger"} size="sm">Net: {formatAr(a.netSalaire)}</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ padding: "12px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
                {[
                  { label: "Livraisons", value: a.nbLivs, color: C.gold },
                  { label: "Livrés", value: a.nbLivres, color: C.success },
                  { label: "Retournés", value: a.nbRetours, color: C.danger },
                  { label: "Frais", value: formatAr(a.totalFrais), color: C.violet },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center", padding: "8px 4px", background: "var(--bg-secondary)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Avances */}
              {a.avances.length > 0 && (
                <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.warning, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    💸 Avances sur salaire
                  </div>
                  {a.avances.map((av) => (
                    <div key={av.id} style={{
                      background: "var(--bg-secondary)", borderRadius: 8, padding: "8px 10px",
                      marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6,
                    }}>
                      <div>
                        <span style={{ color: C.warning, fontWeight: 700, fontSize: 12 }}>{formatAr(Number(av.montant) || 0)}</span>
                        {av.motif && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>({av.motif})</span>}
                        <span style={{ fontSize: 9, color: "var(--text-faint)", marginLeft: 6 }}>{av.date}</span>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => setConfirmAvance(av.id)}>Supprimer</Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Récupérations */}
              {a.nbRecuperations > 0 && (
                <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.success, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>🔄 Récupérations ({a.nbRecuperations})</span>
                    <span style={{ fontSize: 11, color: C.success }}>{formatAr(a.totalRecuperations)}</span>
                  </div>
                  {a.recuperations.slice(0, 3).map((rec, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, padding: "2px 0" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{rec.date} · {rec.client_donneur}</span>
                      <span style={{ color: C.success, fontWeight: 600 }}>{formatAr(rec.frais_recuperation)}</span>
                    </div>
                  ))}
                  {a.recuperations.length > 3 && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      +{a.recuperations.length - 3} autre(s)...
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* ══ AJOUTER AVANCE ══ */}
      <SectionHeader title="Ajouter une avance" />
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <Select label="Agent" value={avanceAgentId} onChange={(e) => setAvanceAgentId(e.target.value)}
            options={[{ value: "", label: "-- Agent --" }, ...agentOptions]} />
          <Input type="number" label="Montant (Ar)" placeholder="50000" value={avanceMontant} onChange={(e) => setAvanceMontant(e.target.value)} />
          <Button variant="warning" onClick={handleAddAvance} loading={saving} disabled={saving}>Enregistrer</Button>
        </div>
        <div style={{ marginTop: 10 }}>
          <Input label="Motif (optionnel)" placeholder="Ex: Urgence familiale, Achat matériel..." value={avanceMotif} onChange={(e) => setAvanceMotif(e.target.value)} />
        </div>
      </Card>

      {/* ══ AVANCES ANNULÉES ══ */}
      {safeAvances.filter((a) => a.mois === selectedMonth && a.annule).length > 0 && (
        <div>
          <SectionHeader title="Avances annulées" />
          {safeAvances.filter((a) => a.mois === selectedMonth && a.annule).map((av) => (
            <div key={av.id} style={{
              background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8,
              padding: "8px 14px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6,
            }}>
              <div>
                <span style={{ color: "var(--text-muted)", textDecoration: "line-through" }}>{av.agent_nom} — {formatAr(Number(av.montant) || 0)}</span>
                {av.motif && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>({av.motif})</span>}
              </div>
              <Button variant="danger" size="sm" onClick={() => setConfirmAvance(av.id)}>Définitivement</Button>
            </div>
          ))}
        </div>
      )}

      {/* ══ MODAL SUPPRESSION AVANCE ══ */}
      <Modal open={!!confirmAvance} onClose={() => setConfirmAvance(null)}>
        <ModalHeader title="Supprimer l'avance ?" onClose={() => setConfirmAvance(null)} />
        <ModalBody><p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Cette action est irréversible.</p></ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setConfirmAvance(null)}>Annuler</Button>
          <Button variant="danger" onClick={executeDeleteAvance} loading={saving}>Supprimer</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
