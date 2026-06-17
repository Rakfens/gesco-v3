// src/modules/livraison/pages/Recap.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { logger } from "@/lib/logger";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SectionHeader,
  Select,
  StatCard,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Agent, Avance, Livraison, Recuperation } from "@/modules/shared/types";
import {
  COMMISSION_DEFAUT,
  currentMonth,
  formatAr,
    monthLabel,
    shouldCountGerantCommission,
    TODAY,
} from "@/modules/shared/utils/constants";
import { getRecuperationsByMonth } from "../services/recuperationService";
import { Icon } from "@/modules/shared/components/ui/Icons";

interface AgentStats extends Agent {
  nbLivs: number;
  nbLivres: number;
  nbRetours: number;
  nbReportes: number;
  totalFrais: number;
  totalAvances: number;
  netSalaire: number;
  avances: Avance[];
  recuperations: Recuperation[];
  totalRecuperations: number;
  nbRecuperations: number;
}

function livsGerant(arr: Livraison[]) {
  return arr.filter((l) => shouldCountGerantCommission(l));
}

export default function Recap() {
  const { livraisons, avances, agents, showToast, avanceCrud } = useApp();
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
      } catch (error: unknown) {
        logger.error("Erreur récupérations:", error);
      } finally {
        setLoadingRecup(false);
      }
    };
    load();
  }, [selectedMonth, currentCompany?.id]);

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
    monthTotalMontant,
    monthTotalFrais,
    monthTotalSalaires,
    monthGerantGain,
    monthTotalRecuperations,
    monthBenefice,
  } = useMemo(() => {
    const monthTotalMontant = monthLivs
    .filter((l) => l.paiement !== "client")
    .reduce((s, l) => s + (Number(l.montant) || 0), 0);
    const monthTotalFrais = monthLivs.reduce((s, l) => s + (Number(l.frais) || 0), 0);
    const monthTotalSalaires = monthStatsByAgent.reduce((s, a) => s + (Number(a.salaire) || 0), 0);
    const monthGerantGain = livsGerant(monthLivs).length * commissionGerant;
    const monthTotalRecuperations = monthStatsByAgent.reduce((s, a) => s + a.totalRecuperations, 0);
    const monthBenefice = monthTotalFrais - monthTotalSalaires - monthGerantGain - monthTotalRecuperations;
    return {
      monthTotalMontant,
      monthTotalFrais,
      monthTotalSalaires,
      monthGerantGain,
      monthTotalRecuperations,
      monthBenefice,
    };
  }, [monthLivs, monthStatsByAgent, commissionGerant]);

  const handleAddAvance = async () => {
    if (!avanceAgentId || !avanceMontant) {
      showToast("Agent et montant requis", "error");
      return;
    }
    const agent = safeAgents.find((a) => a.id === avanceAgentId);
    if (!agent) {
      showToast("Agent invalide", "error");
      return;
    }
    setSaving(true);
    try {
      await avanceCrud.add({
        agent_id: avanceAgentId,
        agent_nom: agent.nom,
        montant: Number(avanceMontant) || 0,
                           motif: avanceMotif,
                           date: TODAY().split("T")[0],
                           mois: currentMonth(),
                           annule: false,
      });
      setAvanceAgentId("");
      setAvanceMontant("");
      setAvanceMotif("");
      showToast("Avance ajoutée");
    } catch (error: unknown) {
      logger.error("Erreur avance:", error);
      showToast("Erreur lors de l'ajout.", "error");
    } finally {
      setSaving(false);
    }
  };

  const executeDeleteAvance = async () => {
    if (!confirmAvance) return;
    const id = confirmAvance;
    setConfirmAvance(null);
    setSaving(true);
    try {
      await avanceCrud.delete(id);
      showToast("Avance supprimée", "warn");
    } catch {
      showToast("Erreur", "error");
    } finally {
      setSaving(false);
    }
  };

  const agentOptions = useMemo(
    () => safeAgents.map((a) => ({ value: a.id, label: a.nom })),
                               [safeAgents]
  );

  const isBeneficePositive = monthBenefice >= 0;

  return (
    <div className="pb-6 animate-fade-up">
    {/* ══ HEADER ══ */}
    <header className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
    <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-amber-400/10">
    <Icon
    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    size={18}
    className="text-amber-400"
    />
    </div>
    <div>
    <h1 className={`font-extrabold m-0 text-[var(--text)] ${isMobile ? "text-xl" : "text-2xl"}`}>
    Récapitulatif
    </h1>
    <p className="text-xs text-[var(--text-muted)] mt-0.5">{currentCompany?.name}</p>
    </div>
    </div>
    <Select
    value={selectedMonth}
    onChange={(e) => setSelectedMonth(e.target.value)}
    options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
    className="min-w-[140px]"
    />
    </header>

    {/* ══ BÉNÉFICE NET ══ */}
    <Card
    className={`mb-5 ${isBeneficePositive ? "border-emerald-400" : "border-red-400"}`}
    >
    <div className="flex items-center justify-between flex-wrap gap-3">
    <div>
    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isBeneficePositive ? "text-emerald-400" : "text-red-400"}`}>
    💰 Bénéfice net — {monthLabel(selectedMonth)}
    </div>
    <div className={`font-black ${isMobile ? "text-[28px]" : "text-4xl"} ${isBeneficePositive ? "text-emerald-400" : "text-red-400"}`}>
    {formatAr(monthBenefice)}
    </div>
    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
    Frais — Salaires — Commission — Récupérations
    </div>
    </div>
    <div className="grid gap-2 grid-cols-2">
    {[
      { label: "Montant colis", value: formatAr(monthTotalMontant), color: "text-emerald-400" },
          { label: "Frais collectés", value: formatAr(monthTotalFrais), color: "text-amber-400" },
          { label: "Salaires", value: formatAr(monthTotalSalaires), color: "text-red-400" },
          { label: "Commission", value: formatAr(monthGerantGain), color: "text-pink-400" },
    ].map((s) => (
      <div
      key={s.label}
      className="text-center px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)]"
      >
      <div className={`text-xs font-bold ${s.color}`}>
      {s.value}
      </div>
      <div className="text-[9px] text-[var(--text-muted)]">{s.label}</div>
      </div>
    ))}
    </div>
    </div>
    </Card>

    {/* ══ COMMISSION GÉRANT ══ */}
    <Card className="mb-5">
    <div className="flex items-center justify-between flex-wrap gap-3">
    <div>
    <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-pink-400">
    👑 Commission gérant — {monthLabel(selectedMonth)}
    </div>
    <div className="text-2xl font-black text-[var(--text)]">
    {formatAr(monthGerantGain)}
    </div>
    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
    {livsGerant(monthLivs).length} livraisons × {formatAr(commissionGerant)}
    </div>
    </div>
    <div className="text-right text-[11px] text-[var(--text-muted)]">
    <div>
    Frais collectés: <b className="text-[var(--accent)]">{formatAr(monthTotalFrais)}</b>
    </div>
    <div>
    Frais nets:{" "}
    <b className={monthTotalFrais - monthGerantGain >= 0 ? "text-emerald-400" : "text-red-400"}>
    {formatAr(monthTotalFrais - monthGerantGain)}
    </b>
    </div>
    </div>
    </div>
    </Card>

    {/* ══ STATS PAR AGENT ══ */}
    <SectionHeader
    title={`Agents — ${monthLabel(selectedMonth)}`}
    subtitle={`${monthStatsByAgent.length} agent(s)`}
    />
    {loadingRecup && (
      <div className="text-center text-[var(--text-muted)] py-2.5 mb-2.5">
      Chargement des récupérations...
      </div>
    )}
    <div className="flex flex-col gap-3 mb-5">
    {monthStatsByAgent.map((a) => (
      <Card key={a.id} className="overflow-hidden">
      {/* Header agent */}
      <div className="px-4 py-3.5 border-b border-[var(--border)] bg-gradient-to-br from-amber-400/5 to-violet-500/5">
      <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-base text-[#08080c] flex-shrink-0 bg-gradient-to-br from-amber-400 to-violet-500 shadow-[0_4px_12px_rgba(201,169,110,0.2)]">
      {a.nom?.charAt(0) || "?"}
      </div>
      <div className="flex-1">
      <div className="font-bold text-sm text-[var(--text)]">{a.nom}</div>
      <div className="flex gap-1.5 flex-wrap">
      <Badge variant="success" size="sm">
      Sal: {formatAr(a.salaire)}
      </Badge>
      {a.totalAvances > 0 && (
        <Badge variant="warning" size="sm">
        Av: {formatAr(a.totalAvances)}
        </Badge>
      )}
      <Badge variant={a.netSalaire >= 0 ? "success" : "danger"} size="sm">
      Net: {formatAr(a.netSalaire)}
      </Badge>
      </div>
      </div>
      </div>
      </div>
      {/* Stats */}
      <div className="px-4 py-3">
      <div className={`grid gap-2 mb-2.5 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
      {[
        { label: "Livraisons", value: a.nbLivs, color: "text-amber-400" },
        { label: "Livrés", value: a.nbLivres, color: "text-emerald-400" },
        { label: "Retournés", value: a.nbRetours, color: "text-red-400" },
        { label: "Frais", value: formatAr(a.totalFrais), color: "text-violet-400" },
      ].map((s) => (
        <div
        key={s.label}
        className="text-center py-2 px-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"
        >
        <div className={`text-sm font-extrabold ${s.color}`}>
        {s.value}
        </div>
        <div className="text-[9px] text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">
        {s.label}
        </div>
        </div>
      ))}
      </div>
      {/* Avances */}
      {a.avances.length > 0 && (
        <div className="mt-2 border-t border-[var(--border)] pt-2">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-amber-400">
        💸 Avances sur salaire
        </div>
        {a.avances.map((av) => (
          <div
          key={av.id}
          className="bg-[var(--bg-secondary)] rounded-lg px-2.5 py-2 mb-1 flex justify-between items-center flex-wrap gap-1.5"
          >
          <div>
          <span className="font-bold text-xs text-amber-400">
          {formatAr(Number(av.montant) || 0)}
          </span>
          {av.motif && (
            <span className="text-[10px] text-[var(--text-muted)] ml-1.5">
            ({av.motif})
            </span>
          )}
          <span className="text-[9px] text-[var(--text-faint)] ml-1.5">
          {av.date}
          </span>
          </div>
          <Button variant="danger" size="sm" onClick={() => setConfirmAvance(av.id)}>
          Supprimer
          </Button>
          </div>
        ))}
        </div>
      )}
      {/* Récupérations */}
      {a.nbRecuperations > 0 && (
        <div className="mt-2 border-t border-[var(--border)] pt-2">
        <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
        🔄 Récupérations ({a.nbRecuperations})
        </span>
        <span className="text-[11px] text-emerald-400">
        {formatAr(a.totalRecuperations)}
        </span>
        </div>
        {a.recuperations.slice(0, 3).map((rec, i) => (
          <div key={i} className="flex justify-between text-[10px] py-0.5">
          <span className="text-[var(--text-secondary)]">
          {rec.date} · {rec.client_donneur}
          </span>
          <span className="font-semibold text-emerald-400">
          {formatAr(rec.frais_recuperation)}
          </span>
          </div>
        ))}
        {a.recuperations.length > 3 && (
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
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
    <Card className="mb-5">
    <div className={`grid gap-2.5 items-end ${isMobile ? "grid-cols-1" : "grid-cols-[1fr_1fr_auto]"}`}>
    <Select
    label="Agent"
    value={avanceAgentId}
    onChange={(e) => setAvanceAgentId(e.target.value)}
    options={[{ value: "", label: "-- Agent --" }, ...agentOptions]}
    />
    <Input
    type="number"
    label="Montant (Ar)"
    placeholder="50000"
    value={avanceMontant}
    onChange={(e) => setAvanceMontant(e.target.value)}
    />
    <Button
    variant="warning"
    onClick={handleAddAvance}
    loading={saving}
    disabled={saving}
    >
    Enregistrer
    </Button>
    </div>
    <div className="mt-2.5">
    <Input
    label="Motif (optionnel)"
    placeholder="Ex: Urgence familiale, Achat matériel..."
    value={avanceMotif}
    onChange={(e) => setAvanceMotif(e.target.value)}
    />
    </div>
    </Card>

    {/* ══ AVANCES ANNULÉES ══ */}
    {safeAvances.filter((a) => a.mois === selectedMonth && a.annule).length > 0 && (
      <div>
      <SectionHeader title="Avances annulées" />
      {safeAvances
        .filter((a) => a.mois === selectedMonth && a.annule)
        .map((av) => (
          <div
          key={av.id}
          className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3.5 py-2 mb-1.5 flex justify-between items-center opacity-60"
          >
          <div>
          <span className="text-[var(--text-muted)] line-through">
          {av.agent_nom} — {formatAr(Number(av.montant) || 0)}
          </span>
          {av.motif && (
            <span className="text-[10px] text-[var(--text-muted)] ml-1.5">
            ({av.motif})
            </span>
          )}
          </div>
          <Button variant="danger" size="sm" onClick={() => setConfirmAvance(av.id)}>
          Définitivement
          </Button>
          </div>
        ))}
        </div>
    )}

    {/* ══ MODAL SUPPRESSION AVANCE ══ */}
    <Modal open={!!confirmAvance} onClose={() => setConfirmAvance(null)}>
    <ModalHeader title="Supprimer l'avance ?" onClose={() => setConfirmAvance(null)} />
    <ModalBody>
    <p className="text-[13px] text-[var(--text-secondary)]">
    Cette action est irréversible.
    </p>
    </ModalBody>
    <ModalFooter>
    <Button variant="secondary" onClick={() => setConfirmAvance(null)}>
    Annuler
    </Button>
    <Button variant="danger" onClick={executeDeleteAvance} loading={saving}>
    Supprimer
    </Button>
    </ModalFooter>
    </Modal>
    </div>
  );
}
