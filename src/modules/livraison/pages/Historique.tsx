// src/modules/livraison/pages/Historique.tsx
"use client";

import { useMemo, useState, useCallback } from "react";
import { logger } from "@/lib/logger";
import { ClientFeedbackModal } from "@/modules/shared/components/Modals/ClientFeedbackModal";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Agent, Livraison } from "@/modules/shared/types";
import { formatAr, PAIE_MODES, STATUTS, TODAY } from "@/modules/shared/utils/constants";
import { printAgentList } from "@/modules/shared/utils/pdfExport";
import { StatusIcon, Icon } from "@/modules/shared/components/ui/Icons";

const STATUS_ICONS = [
  { key: "en_cours", label: "En cours", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/15", icon: "clock" as const },
{ key: "livre", label: "Livré", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/15", icon: "check" as const },
{ key: "retourne", label: "Retourné", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/15", icon: "rotate-left" as const },
{ key: "reporte", label: "Reporté", color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/15", icon: "xmark" as const },
] as const;

const STATUS_OPTIONS = STATUS_ICONS.map(({ key, label }) => ({ value: key, label }));

const agentMatch = (livraison: Livraison, agent: Agent): boolean => {
  if (livraison.agent_id != null && agent.id != null) return Number(livraison.agent_id) === Number(agent.id);
  return livraison.agent_nom === agent.nom;
};

interface ClientStat {
  client: string;
  livs: Livraison[];
  totalMontant: number;
  totalFrais: number;
}

function statusClasses(statut?: string) {
  if (statut === "livre") return { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400" };
  if (statut === "retourne") return { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400" };
  if (statut === "reporte") return { color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400" };
  return { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400" };
}

export default function Historique() {
  const { livraisons = [], agents = [], showToast, livraisonCrud } = useApp();
  const { currentCompany } = useCompany();
  const isMobile = useIsMobile();
  const logoUrl = currentCompany?.logo_url ? String(currentCompany.logo_url) : null;

  const [histDate, setHistDate] = useState<string>(TODAY());
  const [histAgent, setHistAgent] = useState<string>("tous");
  const [histStatut, setHistStatut] = useState<string>("tous");
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Livraison>>({});
  const [fbClient, setFbClient] = useState<string | { client: string; livs: Livraison[] } | null>(null);
  const [fbRecup, setFbRecup] = useState("0");
  const [fbProvince, setFbProvince] = useState("0");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];

  // Filtrer
  const livsFiltered = useMemo(() => {
    return safeLivraisons.filter((l) =>
    l.date === histDate &&
    (histAgent === "tous" || l.agent_nom === histAgent) &&
    (histStatut === "tous" || l.statut === histStatut)
    );
  }, [safeLivraisons, histDate, histAgent, histStatut]);

  // Stats par agent
  const statsByAgent = useMemo(() => {
    const map: Record<string, { agent: string; count: number; frais: number }> = {};
    livsFiltered.forEach((l) => {
      const nom = l.agent_nom || "—";
      if (!map[nom]) map[nom] = { agent: nom, count: 0, frais: 0 };
      map[nom].count++;
      map[nom].frais += Number(l.frais) || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [livsFiltered]);

  // Stats par client
  const statsByClient: ClientStat[] = useMemo(() => {
    const map: Record<string, ClientStat> = {};
    livsFiltered.forEach((l) => {
      const client = l.client_donneur || "—";
      if (!map[client]) map[client] = { client, livs: [], totalMontant: 0, totalFrais: 0 };
      map[client].livs.push(l);
      if (l.paiement !== "client") map[client].totalMontant += Number(l.montant) || 0;
      map[client].totalFrais += Number(l.frais) || 0;
    });
    return Object.values(map).sort((a, b) => b.totalMontant - a.totalMontant);
  }, [livsFiltered]);

  // Stats globales
  const stats = useMemo(() => ({
    total: livsFiltered.length,
    montant: livsFiltered.reduce((s, l) => s + (Number(l.montant) || 0), 0),
                               frais: livsFiltered.reduce((s, l) => s + (Number(l.frais) || 0), 0),
                               livres: livsFiltered.filter((l) => l.statut === "livre").length,
                               enCours: livsFiltered.filter((l) => l.statut === "en_cours").length,
                               retournes: livsFiltered.filter((l) => l.statut === "retourne").length,
  }), [livsFiltered]);

  const handleUpdate = async () => {
    if (!editId) return;
    const montant = editData.paiement === "client" ? 0 : parseFloat(String(editData.montant)) || 0;
    setSaving(true);
    try {
      await livraisonCrud.update(editId, { ...editData, montant, frais: parseFloat(String(editData.frais)) || 0 });
      setEditId(null);
      showToast("Livraison mise à jour");
    } catch {
      showToast("Erreur", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete(null);
    setSaving(true);
    try {
      await livraisonCrud.delete(id);
      showToast("Livraison supprimée", "warn");
    } catch {
      showToast("Erreur", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (l: Livraison) => {
    setEditId(l.id);
    setEditData({ ...l });
  };

  const handleExportCSV = useCallback(() => {
    const bom = "\uFEFF";
    const header = "Date;Colis;Donneur;Destinataire;Agent;Montant;Frais;Statut\n";
    const rows = livsFiltered
    .map((l) => [
      l.date,
      l.colis,
      l.client_donneur,
      l.destinataire,
      l.agent_nom || "",
      l.montant || 0,
      l.frais || 0,
      STATUTS[l.statut || ""]?.label || "",
    ].join(";"))
    .join("\n");
    const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historique_${histDate}.csv`;
    document.body.appendChild(a);
    a.click();
    requestAnimationFrame(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    showToast("Export CSV téléchargé");
  }, [livsFiltered, histDate, showToast]);

  return (
    <div className="pb-6 animate-fade-up">
    {/* ══ HEADER ══ */}
    <header className="mb-5">
    <div className="flex items-center justify-between flex-wrap gap-2.5">
    <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-violet-400/10">
    <Icon
    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    size={18}
    className="text-violet-400"
    />
    </div>
    <div>
    <h1 className={`font-extrabold m-0 text-[var(--text)] ${isMobile ? "text-xl" : "text-2xl"}`}>
    Historique
    </h1>
    <p className="text-xs text-[var(--text-muted)] mt-0.5">{currentCompany?.name}</p>
    </div>
    </div>
    <Button variant="success" size="sm" onClick={handleExportCSV}>
    📥 Exporter CSV
    </Button>
    </div>
    </header>

    {/* ══ STATS ══ */}
    <div className={`grid gap-2.5 mb-4 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
    {[
      { label: "Total", value: stats.total, color: "text-amber-400" },
      { label: "Livrés", value: stats.livres, color: "text-emerald-400" },
      { label: "En cours", value: stats.enCours, color: "text-amber-400" },
      { label: "Montant", value: formatAr(stats.montant), color: "text-violet-400" },
    ].map((s) => (
      <div
      key={s.label}
      className="text-center rounded-xl border border-[var(--border)] p-3 bg-[var(--card)]"
      >
      <div className={`font-extrabold text-xl ${s.color}`}>
      {s.value}
      </div>
      <div className="text-[10px] text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">
      {s.label}
      </div>
      </div>
    ))}
    </div>

    {/* ══ FILTRES ══ */}
    <Card className="mb-4">
    <div className={`grid gap-2.5 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
    <Input
    type="date"
    label="Date"
    value={histDate}
    onChange={(e) => setHistDate(e.target.value)}
    />
    <Select
    label="Agent"
    value={histAgent}
    onChange={(e) => setHistAgent(e.target.value)}
    options={[{ value: "tous", label: "Tous" }, ...agents.map((a) => ({ value: a.nom, label: a.nom }))]}
    />
    <Select
    label="Statut"
    value={histStatut}
    onChange={(e) => setHistStatut(e.target.value)}
    options={[{ value: "tous", label: "Tous" }, ...STATUS_OPTIONS]}
    />
    </div>
    </Card>

    {/* ══ IMPRESSION LISTE LIVREUR ══ */}
    <Card className="mb-4">
    <div className="text-[11px] font-bold uppercase tracking-wider mb-2.5 text-[var(--text-muted)]">
    🖨️ Imprimer liste livreur
    </div>
    <div className="flex flex-wrap gap-1.5">
    {safeLivraisons.length > 0 &&
      agents.map((a) => {
        const lsDate = livsFiltered.filter((l) => agentMatch(l, a));
        const lsEnCours = safeLivraisons.filter((l) => agentMatch(l, a) && l.statut === "en_cours");
        const ls = lsDate.length > 0 ? lsDate : lsEnCours;
        if (ls.length === 0) return null;
        const label =
        lsDate.length > 0
        ? `${a.nom} — ${histDate} (${ls.length})`
        : `${a.nom} — En cours (${ls.length})`;
        return (
          <Button
          key={a.id}
          variant="secondary"
          size="sm"
          onClick={() => printAgentList(a, ls, lsDate.length > 0 ? histDate : "en cours", logoUrl, currentCompany)}
          >
          {label}
          </Button>
        );
      })}
      {agents.every(
        (a) =>
        livsFiltered.filter((l) => agentMatch(l, a)).length === 0 &&
        safeLivraisons.filter((l) => agentMatch(l, a) && l.statut === "en_cours").length === 0
      ) && (
        <span className="text-xs text-[var(--text-muted)]">Aucune livraison pour cette date.</span>
      )}
      </div>
      </Card>

      {/* ══ FRAIS PAR AGENT ══ */}
      {statsByAgent.length > 0 && (
        <Card className="mb-4">
        <div className="text-[11px] font-bold uppercase tracking-wider mb-2.5 text-[var(--text-muted)]">
        💰 Frais par agent
        </div>
        <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
        {statsByAgent.map((s) => (
          <Card key={s.agent} padding="sm" hover>
          <div className="flex justify-between items-center">
          <div>
          <div className="font-bold text-[13px] text-[var(--text)]">{s.agent}</div>
          <div className="text-[11px] text-[var(--text-muted)]">
          {s.count} livraison{s.count !== 1 ? "s" : ""}
          </div>
          </div>
          <div className="text-sm font-bold text-violet-400">
          {formatAr(s.frais)}
          </div>
          </div>
          </Card>
        ))}
        </div>
        </Card>
      )}

      {/* ══ VERSEMENT PAR CLIENT ══ */}
      <ClientFeedbackModal
      fbClient={fbClient}
      setFbClient={setFbClient}
      histDate={histDate}
      fbRecup={fbRecup}
      setFbRecup={setFbRecup}
      fbProvince={fbProvince}
      setFbProvince={setFbProvince}
      livraisons={livsFiltered}
      onClose={() => setFbClient(null)}
      />
      {statsByClient.length > 0 && (
        <Card className="mb-4">
        <div className="text-[11px] font-bold uppercase tracking-wider mb-2.5 text-[var(--text-muted)]">
        💵 Versement par client donneur
        </div>
        <div className="flex flex-col gap-2">
        {statsByClient.map((cl) => (
          <Card key={cl.client} padding="sm">
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
          <div className="font-extrabold text-sm text-[var(--text)]">{cl.client}</div>
          <div className="flex gap-2 items-center">
          <span className="font-bold text-sm text-emerald-400">
          {formatAr(cl.totalMontant)}
          </span>
          <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setFbClient(cl.client);
            setFbRecup("0");
            setFbProvince("0");
          }}
          >
          📄 PDF
          </Button>
          </div>
          </div>
          {cl.livs.map((l) => {
            const sc = statusClasses(l.statut);
            return (
              <div
              key={l.id}
              className="flex items-center gap-2 py-1.5 border-t border-[var(--border)] flex-wrap"
              >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.bg.replace('/10', '')}`} />
              <span className="text-[11px] text-[var(--text)] flex-1 min-w-[100px]">{l.colis}</span>
              <span className="text-[10px] text-[var(--text-muted)]">{l.destinataire}</span>
              <span className={`text-[11px] font-semibold ${sc.color}`}>
              {STATUTS[l.statut || ""]?.label || l.statut}
              </span>
              <span className="text-[11px] font-semibold text-amber-400">
              {l.montant ? formatAr(l.montant) : "—"}
              </span>
              <button
              onClick={() => startEdit(l)}
              className="px-1.5 py-0.5 rounded-md bg-transparent border border-[var(--border)] text-[var(--text-muted)] cursor-pointer text-xs hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors"
              >
              ✏️
              </button>
              <button
              onClick={() => setConfirmDelete(l.id)}
              className="px-1.5 py-0.5 rounded-md cursor-pointer text-xs border bg-red-50 border-red-200/50 text-red-400 hover:bg-red-100 hover:text-red-500 transition-colors"
              >
              🗑
              </button>
              </div>
            );
          })}
          </Card>
        ))}
        </div>
        </Card>
      )}

      {/* ══ LISTE COMPLÈTE ══ */}
      {livsFiltered.length > 0 && (
        <Card>
        <div className="text-[11px] font-bold uppercase tracking-wider mb-2.5 text-[var(--text-muted)]">
        📋 Toutes les livraisons ({livsFiltered.length})
        </div>
        <div className="flex flex-col gap-1.5">
        {livsFiltered.map((l) => {
          const sc = statusClasses(l.statut);
          const statusConfig = STATUS_ICONS.find((s) => s.key === l.statut);
          return (
            <div
            key={l.id}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border)] border-l-[3px] ${sc.border}`}
            >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sc.bg}`}>
            <StatusIcon
            name={statusConfig?.icon || "clock"}
            size={15}
            className={sc.color}
            />
            </div>
            <div className="flex-1 min-w-[100px]">
            <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-xs text-[var(--text)]">{l.colis}</span>
            <span
            className={`text-[8px] font-bold px-1.5 py-px rounded-full uppercase ${sc.bg} ${sc.color}`}
            >
            {STATUTS[l.statut || ""]?.label || l.statut}
            </span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
            {l.client_donneur || "—"} → {l.destinataire || "—"}
            {l.agent_nom ? ` · ${l.agent_nom}` : ""}
            </div>
            </div>
            <div className="text-xs font-bold text-[var(--accent)] whitespace-nowrap">
            {l.montant ? formatAr(l.montant) : "—"}
            </div>
            <button
            onClick={() => startEdit(l)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs cursor-pointer border bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors"
            >
            ✏️
            </button>
            <button
            onClick={() => setConfirmDelete(l.id)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs cursor-pointer border bg-red-50 border-red-200/50 text-red-400 hover:bg-red-100 hover:text-red-500 transition-colors"
            >
            🗑
            </button>
            </div>
          );
        })}
        </div>
        {/* Totaux */}
        <div className="mt-3 px-3.5 py-2.5 rounded-[10px] bg-[var(--bg)] flex justify-between flex-wrap gap-2.5">
        <span className="text-[11px] text-[var(--text-muted)]">Montant total</span>
        <span className="text-sm font-extrabold text-amber-400">
        {formatAr(stats.montant)}
        </span>
        <span className="text-[11px] text-[var(--text-muted)]">Frais total</span>
        <span className="text-sm font-extrabold text-violet-400">
        {formatAr(stats.frais)}
        </span>
        </div>
        </Card>
      )}

      {/* ══ EMPTY STATE ══ */}
      {livsFiltered.length === 0 && (
        <Card className="py-10">
        <div className="text-center text-sm text-[var(--text-muted)]">
        <div className="text-3xl mb-2">📋</div>
        Aucune livraison pour cette date.
        </div>
        </Card>
      )}

      {/* ══ MODAL ÉDITION ══ */}
      <Modal open={!!editId} onClose={() => setEditId(null)}>
      <ModalHeader title="Modifier la livraison" onClose={() => setEditId(null)} />
      <ModalBody>
      <div className={`grid gap-2.5 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
      <Input
      label="Colis"
      value={String(editData.colis ?? "")}
      onChange={(e) => setEditData({ ...editData, colis: e.target.value })}
      />
      <Input
      label="Client donneur"
      value={String(editData.client_donneur ?? "")}
      onChange={(e) => setEditData({ ...editData, client_donneur: e.target.value })}
      />
      <Input
      label="Destinataire"
      value={String(editData.destinataire ?? "")}
      onChange={(e) => setEditData({ ...editData, destinataire: e.target.value })}
      />
      <Input
      label="Lieu"
      value={String(editData.destinataire_lieu ?? "")}
      onChange={(e) => setEditData({ ...editData, destinataire_lieu: e.target.value })}
      />
      <Input
      type="number"
      label="Montant (Ar)"
      value={String(editData.montant ?? "")}
      onChange={(e) => setEditData({ ...editData, montant: Number(e.target.value) })}
      />
      <Input
      type="number"
      label="Frais (Ar)"
      value={String(editData.frais ?? "")}
      onChange={(e) => setEditData({ ...editData, frais: Number(e.target.value) })}
      />
      <Select
      label="Statut"
      value={String(editData.statut ?? "en_cours")}
      onChange={(e) => setEditData({ ...editData, statut: e.target.value })}
      options={STATUS_OPTIONS}
      />
      <Select
      label="Paiement"
      value={String(editData.paiement ?? "espece")}
      onChange={(e) => setEditData({ ...editData, paiement: e.target.value })}
      options={Object.entries(PAIE_MODES).map(([k, v]) => ({ value: k, label: v.label }))}
      />
      </div>
      <div className="mt-2.5">
      <Input
      label="Remarque"
      value={String(editData.remarque ?? "")}
      onChange={(e) => setEditData({ ...editData, remarque: e.target.value })}
      placeholder="Motif du retour, du report..."
      />
      </div>
      </ModalBody>
      <ModalFooter>
      <Button variant="secondary" onClick={() => setEditId(null)}>
      Annuler
      </Button>
      <Button variant="primary" onClick={handleUpdate} loading={saving}>
      Enregistrer
      </Button>
      </ModalFooter>
      </Modal>

      {/* ══ MODAL SUPPRESSION ══ */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
      <ModalHeader title="Supprimer ?" onClose={() => setConfirmDelete(null)} />
      <ModalBody>
      <p className="text-[13px] text-[var(--text-secondary)]">Cette action est irréversible.</p>
      </ModalBody>
      <ModalFooter>
      <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
      Annuler
      </Button>
      <Button
      variant="danger"
      onClick={() => confirmDelete && handleDelete(confirmDelete)}
      loading={saving}
      >
      Supprimer
      </Button>
      </ModalFooter>
      </Modal>
      </div>
  );
}
