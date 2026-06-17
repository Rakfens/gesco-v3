// src/modules/livraison/pages/Recuperation.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
import type { Recuperation as RecupType } from "@/modules/shared/types";
import { formatAr, TODAY } from "@/modules/shared/utils/constants";
import {
  addRecuperation,
  deleteRecuperation,
  getRecuperationsByDate,
  updateRecuperation,
} from "../services/recuperationService";
import { Icon } from "@/modules/shared/components/ui/Icons";

interface RecupParLivreur {
  livreur: string;
  recuperations: RecupType[];
  totalGain: number;
}

export default function Recuperation() {
  const { agents, showToast } = useApp();
  const isMobile = useIsMobile();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  const [recuperations, setRecuperations] = useState<RecupType[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(TODAY());
  const [form, setForm] = useState({
    livreur_id: "",
    livreur_nom: "",
    client_donneur: "",
    frais_recuperation: 1000,
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ client_donneur: "", frais_recuperation: 0 });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const safeAgents = Array.isArray(agents) ? agents : [];

  const loadRecuperations = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await getRecuperationsByDate(selectedDate, companyId);
      setRecuperations(data || []);
    } catch (error: unknown) {
      logger.error("Erreur chargement:", error);
      showToast("Erreur lors du chargement.", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, companyId, showToast]);

  useEffect(() => {
    loadRecuperations();
  }, [loadRecuperations]);

  // Regrouper par livreur
  const recuperationsParLivreur = useMemo(() => {
    return recuperations.reduce((acc, r) => {
      const nom = r.livreur_nom;
      if (!acc[nom]) acc[nom] = { livreur: nom, recuperations: [], totalGain: 0 };
      acc[nom].recuperations.push(r);
      acc[nom].totalGain += r.frais_recuperation || 0;
      return acc;
    }, {} as Record<string, RecupParLivreur>);
  }, [recuperations]);

  const totalGains = recuperations.reduce((s, r) => s + (r.frais_recuperation || 0), 0);
  const totalRecuperations = recuperations.length;

  const handleAdd = async () => {
    if (!companyId) {
      showToast("Aucune société sélectionnée", "error");
      return;
    }
    if (!form.livreur_id || !form.client_donneur) {
      showToast("Livreur et client requis", "error");
      return;
    }
    if (form.frais_recuperation <= 0) {
      showToast("Le frais doit être > 0", "error");
      return;
    }
    const agent = safeAgents.find((a) => a.id === form.livreur_id);
    if (!agent) {
      showToast("Livreur invalide", "error");
      return;
    }
    setSaving(true);
    try {
      await addRecuperation(
        {
          date: selectedDate,
          livreur_id: form.livreur_id,
          livreur_nom: agent.nom,
          client_donneur: form.client_donneur,
          frais_recuperation: form.frais_recuperation,
        },
        companyId
      );
      setForm({
        livreur_id: "",
        livreur_nom: "",
        client_donneur: "",
        frais_recuperation: 1000,
      });
      await loadRecuperations();
      showToast("Récupération ajoutée");
    } catch (error: unknown) {
      logger.error("Erreur ajout:", error);
      showToast("Erreur lors de l'ajout.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!companyId) {
      showToast("Aucune société sélectionnée", "error");
      return;
    }
    if (editId === null) return;
    if (editData.frais_recuperation <= 0) {
      showToast("Le frais doit être > 0", "error");
      return;
    }
    setSaving(true);
    try {
      await updateRecuperation(
        editId,
        { frais_recuperation: editData.frais_recuperation },
        companyId
      );
      setEditId(null);
      await loadRecuperations();
      showToast("Récupération modifiée");
    } catch (error: unknown) {
      logger.error("Erreur modif:", error);
      showToast("Erreur lors de la modification.", "error");
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!companyId) {
      showToast("Aucune société sélectionnée", "error");
      return;
    }
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    setSaving(true);
    try {
      await deleteRecuperation(id, companyId);
      await loadRecuperations();
      showToast("Récupération supprimée", "warn");
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

  return (
    <div className="pb-6 animate-fade-up">
    {/* ══ HEADER ══ */}
    <header className="mb-5">
    <div className="flex items-center gap-2.5 mb-1">
    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-teal-400/10">
    <Icon
    d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9"
    size={18}
    className="text-teal-400"
    />
    </div>
    <div>
    <h1 className={`font-extrabold m-0 text-[var(--text)] ${isMobile ? "text-xl" : "text-2xl"}`}>
    Récupération matinale
    </h1>
    <p className="text-xs text-[var(--text-muted)] mt-0.5">
    Frais de récupération par livreur
    </p>
    </div>
    </div>
    </header>

    {/* ══ STATS ══ */}
    <div className={`grid gap-2.5 mb-4 ${isMobile ? "grid-cols-2" : "grid-cols-3"}`}>
    <StatCard
    label="Total du jour"
    value={formatAr(totalGains)}
    className="text-teal-400"
    icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} className="text-teal-400" />}
    />
    <StatCard
    label="Récupérations"
    value={totalRecuperations}
    className="text-amber-400"
    icon={<Icon d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9" size={18} className="text-amber-400" />}
    />
    <StatCard
    label="Livreurs actifs"
    value={Object.keys(recuperationsParLivreur).length}
    className="text-violet-400"
    icon={<Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" size={18} className="text-violet-400" />}
    />
    </div>

    {/* ══ SÉLECTEUR DATE ══ */}
    <Card className="mb-4">
    <div className="flex gap-2.5 items-end flex-wrap">
    <Input
    type="date"
    label="Date"
    value={selectedDate}
    onChange={(e) => setSelectedDate(e.target.value)}
    className="max-w-[200px]"
    />
    <Button
    variant="secondary"
    size="sm"
    onClick={loadRecuperations}
    loading={loading}
    disabled={loading}
    >
    Actualiser
    </Button>
    </div>
    </Card>

    {/* ══ FORMULAIRE AJOUT ══ */}
    <Card className="mb-4">
    <CardHeader>
    <CardTitle>Ajouter une récupération</CardTitle>
    </CardHeader>
    <div className={`grid gap-2.5 items-end ${isMobile ? "grid-cols-1" : "grid-cols-[1fr_1fr_1fr_auto]"}`}>
    <Select
    label="Livreur"
    value={form.livreur_id}
    onChange={(e) => {
      const id = e.target.value;
      const agent = safeAgents.find((a) => a.id === id);
      setForm({ ...form, livreur_id: id, livreur_nom: agent?.nom || "" });
    }}
    options={[{ value: "", label: "-- Choisir --" }, ...agentOptions]}
    />
    <Input
    label="Client donneur"
    placeholder="Ex: SARL TECH"
    value={form.client_donneur}
    onChange={(e) => setForm({ ...form, client_donneur: e.target.value })}
    />
    <Input
    type="number"
    label="Frais (Ar)"
    placeholder="1000"
    value={String(form.frais_recuperation)}
    onChange={(e) => setForm({ ...form, frais_recuperation: Number(e.target.value) || 0 })}
    />
    <Button variant="success" onClick={handleAdd} loading={saving} disabled={saving}>
    Ajouter
    </Button>
    </div>
    </Card>

    {/* ══ LISTE PAR LIVREUR ══ */}
    {loading ? (
      <div className="text-center text-[var(--text-muted)] py-5">Chargement...</div>
    ) : Object.keys(recuperationsParLivreur).length === 0 ? (
      <Card className="py-10">
      <div className="text-center text-sm text-[var(--text-muted)]">
      <div className="text-3xl mb-2">🔄</div>
      Aucune récupération pour cette date.
      </div>
      </Card>
    ) : (
      <div className="flex flex-col gap-3">
      {Object.values(recuperationsParLivreur)
        .sort((a, b) => b.totalGain - a.totalGain)
        .map((rl) => (
          <Card key={rl.livreur} className="overflow-hidden">
          {/* Header livreur */}
          <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center justify-between bg-gradient-to-br from-teal-400/5 to-amber-400/5">
          <div className="flex items-center gap-2.5">
          <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center font-extrabold text-base text-[#08080c] flex-shrink-0 bg-gradient-to-br from-teal-400 to-amber-400 shadow-[0_4px_12px_rgba(45,212,191,0.2)]">
          {rl.livreur.charAt(0)}
          </div>
          <div>
          <div className="font-bold text-sm text-[var(--text)]">{rl.livreur}</div>
          <div className="text-[11px] text-[var(--text-muted)]">
          {rl.recuperations.length} récupération
          {rl.recuperations.length !== 1 ? "s" : ""}
          </div>
          </div>
          </div>
          <div className="text-base font-extrabold text-teal-400">
          {formatAr(rl.totalGain)}
          </div>
          </div>
          {/* Détails */}
          <div className="px-4 py-2.5">
          {rl.recuperations.map((r) => (
            <div
            key={r.id}
            className="flex items-center gap-2.5 py-2 border-b border-[var(--border)] last:border-b-0"
            >
            <div className="flex-1">
            <div className="font-semibold text-xs text-[var(--text)]">
            {r.client_donneur}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">{r.date}</div>
            </div>
            <div className="text-[13px] font-bold text-emerald-400">
            {formatAr(r.frais_recuperation)}
            </div>
            <button
            onClick={() => {
              setEditId(r.id);
              setEditData({
                client_donneur: r.client_donneur,
                frais_recuperation: r.frais_recuperation ?? 0,
              });
            }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs cursor-pointer border bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors"
            >
            ✏️
            </button>
            <button
            onClick={() => setConfirmDelete(r.id)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs cursor-pointer border bg-red-50 border-red-200/50 text-red-400 hover:bg-red-100 hover:text-red-500 transition-colors"
            >
            🗑
            </button>
            </div>
          ))}
          </div>
          </Card>
        ))}
        </div>
    )}

    {/* ══ MODAL ÉDITION ══ */}
    <Modal open={!!editId} onClose={() => setEditId(null)}>
    <ModalHeader title="Modifier la récupération" onClose={() => setEditId(null)} />
    <ModalBody>
    <div className="grid gap-2.5">
    <Input
    label="Client donneur"
    value={editData.client_donneur}
    onChange={(e) => setEditData({ ...editData, client_donneur: e.target.value })}
    />
    <Input
    type="number"
    label="Frais (Ar)"
    value={String(editData.frais_recuperation)}
    onChange={(e) =>
      setEditData({ ...editData, frais_recuperation: Number(e.target.value) || 0 })
    }
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
    <p className="text-[13px] text-[var(--text-secondary)]">
    Cette récupération sera supprimée définitivement.
    </p>
    </ModalBody>
    <ModalFooter>
    <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
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
