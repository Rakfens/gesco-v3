// src/modules/livraison/pages/Agents.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  StatCard,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Agent, Recuperation } from "@/modules/shared/types";
import { currentMonth, formatAr, monthLabel } from "@/modules/shared/utils/constants";
import {
  getRecuperationsByLivreurNom,
  getTotalRecuperationsByLivreurNom,
} from "../services/recuperationService";
import { Icon } from "@/modules/shared/components/ui/Icons";

interface RecupMois {
  total: number;
  count: number;
  details: Recuperation[];
}

interface RecupCumul {
  total: number;
  count: number;
}

export default function Agents() {
  const { agents, loadingAgents, agentCrud, showToast } = useApp();
  const { currentCompany } = useCompany();
  const isMobile = useIsMobile();

  const [newNom, setNewNom] = useState("");
  const [newSalaire, setNewSalaire] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ nom: string; salaire: string }>({ nom: "", salaire: "" });
  const [month, setMonth] = useState(currentMonth());
  const [recupsMois, setRecupsMois] = useState<Record<string, RecupMois>>({});
  const [recupsCumul, setRecupsCumul] = useState<Record<string, RecupCumul>>({});
  const [loading, setLoading] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const safeAgents = Array.isArray(agents) ? agents : [];

  const loadRecuperations = useCallback(async () => {
    if (!safeAgents.length || !currentCompany?.id) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        safeAgents.map(async (agent) => {
          const [dataMois, { total: totalCumul, count: countCumul }] = await Promise.all([
            getRecuperationsByLivreurNom(agent.nom, currentCompany.id, month),
                                                                                         getTotalRecuperationsByLivreurNom(agent.nom, currentCompany.id),
          ]);
          return {
            id: agent.id,
            mois: {
              total: dataMois.reduce((s: number, r: Recuperation) => s + (r.frais_recuperation || 0), 0),
                       count: dataMois.length,
                       details: dataMois,
            },
            cumul: { total: totalCumul, count: countCumul },
          };
        })
      );
      const moisMap: Record<string, RecupMois> = {};
      const cumulMap: Record<string, RecupCumul> = {};
      results.forEach((r) => {
        moisMap[r.id] = r.mois;
        cumulMap[r.id] = r.cumul;
      });
      setRecupsMois(moisMap);
      setRecupsCumul(cumulMap);
    } catch (error: unknown) {
      logger.error("Erreur récupérations:", error);
    } finally {
      setLoading(false);
    }
  }, [safeAgents, month, currentCompany?.id]);

  useEffect(() => {
    loadRecuperations();
  }, [loadRecuperations]);

  const uniqueMonths = useMemo(() => {
    const s = new Set<string>();
    s.add(currentMonth());
    return [...s].sort().reverse();
  }, []);

  const handleAdd = async () => {
    if (!newNom.trim() || !newSalaire) {
      showToast("Nom et salaire requis", "error");
      return;
    }
    const salaireNum = parseFloat(newSalaire);
    if (isNaN(salaireNum) || salaireNum < 0) {
      showToast("Salaire invalide", "error");
      return;
    }
    setSaving(true);
    try {
      await agentCrud.add(newNom.trim(), salaireNum);
      setNewNom("");
      setNewSalaire("");
      showToast("Agent ajouté");
    } catch (err: unknown) {
      logger.error("Erreur ajout:", err);
      showToast(err instanceof Error ? err.message : "Erreur lors de l'ajout.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId || !editData.nom || !editData.salaire) return;
    const salaireNum = parseFloat(editData.salaire);
    if (isNaN(salaireNum) || salaireNum < 0) {
      showToast("Salaire invalide", "error");
      return;
    }
    setSaving(true);
    try {
      await agentCrud.update(editId, { nom: editData.nom.trim(), salaire: salaireNum });
      setEditId(null);
      setEditData({ nom: "", salaire: "" });
      showToast("Agent modifié");
    } catch (err: unknown) {
      logger.error("Erreur modif:", err);
      showToast(err instanceof Error ? err.message : "Erreur lors de la modification.", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (agent: Agent) => {
    setEditId(agent.id);
    setEditData({ nom: agent.nom, salaire: String(agent.salaire ?? 0) });
  };

  const executeDelete = async () => {
    if (!confirmDel) return;
    const { id } = confirmDel;
    setConfirmDel(null);
    setSaving(true);
    try {
      await agentCrud.delete(id);
      showToast("Agent supprimé", "warn");
    } catch (err: unknown) {
      logger.error("Erreur suppression:", err);
      showToast(err instanceof Error ? err.message : "Erreur lors de la suppression.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const totalSalaire = safeAgents.reduce((s, a) => s + (Number(a.salaire) || 0), 0);
  const totalRecupMois = Object.values(recupsMois).reduce((s, r) => s + r.total, 0);

  return (
    <div className="pb-6 animate-fade-up">
    {/* ══ HEADER ══ */}
    <header className="mb-5">
    <div className="flex items-center gap-2.5 mb-1">
    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-emerald-50">
    <Icon
    d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"
    size={18}
    className="text-emerald-500"
    />
    </div>
    <div>
    <h1 className={`font-extrabold m-0 text-[var(--text)] ${isMobile ? "text-xl" : "text-2xl"}`}>
    Agents
    </h1>
    <p className="text-xs text-[var(--text-muted)] mt-0.5">
    {safeAgents.length} agent(s) enregistré(s)
    </p>
    </div>
    </div>
    </header>

    {/* ══ STATS ══ */}
    <div className={`grid gap-2.5 mb-4 ${isMobile ? "grid-cols-2" : "grid-cols-3"}`}>
    <StatCard
    label="Total agents"
    value={safeAgents.length}
    className="text-emerald-500"
    icon={<Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" size={18} className="text-emerald-500" />}
    />
    <StatCard
    label="Salaires mensuels"
    value={formatAr(totalSalaire)}
    className="text-amber-600"
    icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} className="text-amber-600" />}
    />
    <StatCard
    label="Récup. du mois"
    value={formatAr(totalRecupMois)}
    className="text-violet-500"
    icon={<Icon d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9" size={18} className="text-violet-500" />}
    />
    </div>

    {/* ══ FORMULAIRE AJOUT ══ */}
    <Card className="mb-4">
    <CardHeader>
    <CardTitle>Ajouter un agent</CardTitle>
    </CardHeader>
    <div className={`grid gap-2.5 items-end ${isMobile ? "grid-cols-1" : "grid-cols-[1fr_1fr_auto]"}`}>
    <Input placeholder="Nom complet" value={newNom} onChange={(e) => setNewNom(e.target.value)} />
    <Input type="number" placeholder="Salaire (Ar)" value={newSalaire} onChange={(e) => setNewSalaire(e.target.value)} />
    <Button variant="primary" onClick={handleAdd} loading={saving} disabled={saving}>
    Ajouter
    </Button>
    </div>
    </Card>

    {/* ══ SÉLECTEUR MOIS ══ */}
    <div className="flex items-center gap-2 mb-4">
    <Select
    value={month}
    onChange={(e) => setMonth(e.target.value)}
    options={uniqueMonths.map((m) => ({ value: m, label: monthLabel(m) }))}
    className="max-w-[180px]"
    />
    <Button variant="secondary" size="sm" onClick={loadRecuperations} loading={loading} disabled={loading}>
    Actualiser
    </Button>
    </div>

    {/* ══ LISTE DES AGENTS ══ */}
    {safeAgents.length === 0 ? (
      <Card className="py-10">
      <div className="text-center text-sm text-[var(--text-muted)]">
      <div className="text-3xl mb-2">👥</div>
      Aucun agent enregistré.
      </div>
      </Card>
    ) : (
      <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-[repeat(auto-fill,minmax(380px,1fr))]"}`}>
      {safeAgents.map((a) => {
        const rm = recupsMois[a.id] || { total: 0, count: 0, details: [] };
        const rc = recupsCumul[a.id] || { total: 0, count: 0 };
        const isEditing = editId === a.id;

        return (
          <Card key={a.id} className="overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-[var(--border)] bg-gradient-to-br from-emerald-50/60 to-amber-50/40">
          <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-lg text-[#08080c] flex-shrink-0 bg-gradient-to-br from-emerald-400 to-amber-500 shadow-[0_4px_12px_rgba(52,211,153,0.2)]">
          {a.nom?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
          <div className="font-bold text-[15px] text-[var(--text)]">{a.nom}</div>
          <div className="text-[11px] text-[var(--text-muted)]">{formatAr(a.salaire)} / mois</div>
          </div>
          <div className="flex gap-1">
          <button
          onClick={() => startEdit(a)}
          title="Modifier"
          className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[13px] cursor-pointer border bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors"
          >
          ✏️
          </button>
          <button
          onClick={() => setConfirmDel({ id: a.id, name: a.nom })}
          title="Supprimer"
          className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[13px] cursor-pointer border bg-red-50 border-red-200/50 text-red-400 hover:bg-red-100 hover:text-red-500 transition-colors"
          >
          🗑
          </button>
          </div>
          </div>
          </div>

          {/* Edition inline */}
          {isEditing && (
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] animate-fade-up">
            <div className={`grid gap-2 mb-2 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <Input value={editData.nom} onChange={(e) => setEditData({ ...editData, nom: e.target.value })} placeholder="Nom" />
            <Input type="number" value={editData.salaire} onChange={(e) => setEditData({ ...editData, salaire: e.target.value })} placeholder="Salaire" />
            </div>
            <div className="flex gap-1.5">
            <Button variant="success" size="sm" onClick={handleUpdate} loading={saving} className="flex-1">
            Sauver
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditId(null)}>
            Annuler
            </Button>
            </div>
            </div>
          )}

          {/* Récupérations du mois */}
          <div className="px-4 py-3">
          <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
          📅 {monthLabel(month)}
          </span>
          <div className="flex gap-2">
          <span className="text-[11px] text-[var(--text-muted)]">{rm.count} récup.</span>
          <span className="text-xs font-bold text-emerald-500">
          {formatAr(rm.total)}
          </span>
          </div>
          </div>

          {rm.details.length > 0 && (
            <div className="border-t border-[var(--border)] pt-1.5 mb-2">
            {rm.details.map((r, i) => (
              <div key={i} className="flex justify-between py-[3px] text-[10px]">
              <span className="text-[var(--text-secondary)]">
              {r.date} · {r.client_donneur}
              </span>
              <span className="font-semibold text-emerald-500">
              {formatAr(r.frais_recuperation)}
              </span>
              </div>
            ))}
            </div>
          )}

          {/* Cumul total */}
          <div className="flex justify-between items-center px-2.5 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
          💰 Cumul total
          </span>
          <div className="flex gap-2">
          <span className="text-[11px] text-[var(--text-muted)]">{rc.count} récup.</span>
          <span className="text-xs font-bold text-amber-600">
          {formatAr(rc.total)}
          </span>
          </div>
          </div>
          </div>
          </Card>
        );
      })}
      </div>
    )}

    {/* ══ MODAL SUPPRESSION ══ */}
    <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)}>
    <ModalHeader title="Supprimer l'agent ?" onClose={() => setConfirmDel(null)} />
    <ModalBody>
    <p className="text-[13px] text-[var(--text-secondary)]">
    {confirmDel?.name} et toutes ses données seront supprimés définitivement.
    </p>
    </ModalBody>
    <ModalFooter>
    <Button variant="secondary" onClick={() => setConfirmDel(null)}>
    Annuler
    </Button>
    <Button variant="danger" onClick={executeDelete} loading={saving}>
    Supprimer
    </Button>
    </ModalFooter>
    </Modal>
    </div>
  );
}
