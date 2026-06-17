// src/modules/livraison/pages/LivraisonsPage.tsx
"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Card, Input, Select } from "@/modules/shared/components/ui";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useApp } from "@/modules/shared/context/AppContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Livraison } from "@/modules/shared/types";
import { LivraisonForm } from "../components/LivraisonForm";
import { TODAY, formatAr, STATUTS, PAIE_MODES } from "@/modules/shared/utils/constants";
import { StatusIcon, Icon } from "@/modules/shared/components/ui/Icons";

const STATUS_OPTIONS = [
  { key: "en_cours", label: "En cours", icon: "clock" as const, bg: "bg-amber-500/10", text: "text-amber-400", border: "border-l-amber-400", hover: "hover:border-amber-400/50" },
{ key: "livre", label: "Livré", icon: "check" as const, bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-l-emerald-400", hover: "hover:border-emerald-400/50" },
{ key: "retourne", label: "Retourné", icon: "rotate-left" as const, bg: "bg-red-500/10", text: "text-red-400", border: "border-l-red-400", hover: "hover:border-red-400/50" },
{ key: "reporte", label: "Reporté", icon: "xmark" as const, bg: "bg-violet-500/10", text: "text-violet-400", border: "border-l-violet-400", hover: "hover:border-violet-400/50" },
] as const;

type SortKey = "date" | "montant" | "statut";

function getStatusConfig(statut?: string) {
  return STATUS_OPTIONS.find((s) => s.key === statut) || STATUS_OPTIONS[0];
}

export default function LivraisonsPage() {
  const { currentCompany } = useCompany();
  const { livraisons = [], loadingLivraisons, livraisonCrud, agents = [], showToast } = useApp();
  const isMobile = useIsMobile();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterAgent, setFilterAgent] = useState("tous");
  const [filterDate, setFilterDate] = useState(TODAY());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMontant, setEditMontant] = useState("");
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];

  const suggestions = useMemo(() => ({
    colisList: [...new Set(safeLivraisons.map((l) => l.colis).filter((c): c is string => !!c))],
                                     clients: [...new Set(safeLivraisons.map((l) => l.client_donneur).filter((c): c is string => !!c))],
                                     lieux: [...new Set(safeLivraisons.map((l) => l.destinataire_lieu).filter((c): c is string => !!c))],
  }), [safeLivraisons]);

  const filtered = useMemo(() => {
    let result = safeLivraisons;
    if (filterDate) result = result.filter((l) => l.date === filterDate);
    if (filterStatut !== "tous") result = result.filter((l) => l.statut === filterStatut);
    if (filterAgent !== "tous") result = result.filter((l) => l.agent_nom === filterAgent || l.agent_id === filterAgent);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
      l.colis?.toLowerCase().includes(q) ||
      l.client_donneur?.toLowerCase().includes(q) ||
      l.destinataire?.toLowerCase().includes(q) ||
      l.agent_nom?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [safeLivraisons, filterDate, filterStatut, filterAgent, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date") cmp = a.date.localeCompare(b.date);
      else if (sortBy === "montant") cmp = (Number(a.montant) || 0) - (Number(b.montant) || 0);
      else if (sortBy === "statut") cmp = (a.statut || "").localeCompare(b.statut || "");
      return sortDir === "desc" ? -cmp : cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const stats = useMemo(() => {
    const livres = filtered.filter((l) => l.statut === "livre").length;
    return {
      total: filtered.length,
      livres,
      enCours: filtered.filter((l) => l.statut === "en_cours").length,
                        retournes: filtered.filter((l) => l.statut === "retourne").length,
                        reportes: filtered.filter((l) => l.statut === "reporte").length,
                        montant: filtered.reduce((s, l) => s + (Number(l.montant) || 0), 0),
                        frais: filtered.reduce((s, l) => s + (Number(l.frais) || 0), 0),
                        tauxLivraison: filtered.length > 0 ? Math.round((livres / filtered.length) * 100) : 0,
    };
  }, [filtered]);

  const handleSort = useCallback((key: SortKey) => {
    setSortBy((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("desc");
      return key;
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = ["Date", "Colis", "Donneur", "Destinataire", "Agent", "Montant", "Frais", "Statut", "Paiement"];
    const rows = sorted.map((l) => [
      l.date, l.colis, l.client_donneur, l.destinataire, l.agent_nom || "",
      l.montant || 0, l.frais || 0, STATUTS[l.statut || ""]?.label || l.statut || "",
      PAIE_MODES[l.paiement || ""]?.label || l.paiement || "",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `livraisons_${filterDate || "export"}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    requestAnimationFrame(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    showToast("Export CSV téléchargé");
  }, [sorted, filterDate, showToast]);

  const handleStatusUpdate = useCallback(async (id: string, statut: string, remarque?: string) => {
    setSaving(true);
    try {
      await livraisonCrud.update(id, { statut, ...(remarque !== undefined ? { remarque } : {}) });
      if (mountedRef.current) showToast(`Statut: ${STATUTS[statut]?.label || statut}`);
    } catch (err) {
      if (mountedRef.current) showToast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [livraisonCrud, showToast]);

  const handleEditMontant = useCallback(async (id: string) => {
    if (!editMontant) return;
    setSaving(true);
    try {
      await livraisonCrud.update(id, { montant: parseFloat(editMontant) || 0 });
      if (mountedRef.current) {
        showToast("Montant modifié");
        setEditingId(null);
        setEditMontant("");
      }
    } catch (err) {
      if (mountedRef.current) showToast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [editMontant, livraisonCrud, showToast]);

  const handleDelete = useCallback(async (id: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      return;
    }
    setSaving(true);
    try {
      await livraisonCrud.delete(id);
      if (mountedRef.current) {
        showToast("Livraison supprimée", "warn");
        setDeleteConfirmId(null);
      }
    } catch (err) {
      if (mountedRef.current) showToast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [deleteConfirmId, livraisonCrud, showToast]);

  const startEdit = useCallback((l: Livraison) => {
    setEditingId(l.id);
    setEditMontant(String(l.montant || ""));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditMontant("");
  }, []);

  if (loadingLivraisons) {
    return (
      <div className="py-12 text-center text-[var(--text-muted)] animate-pulse">
      Chargement des livraisons...
      </div>
    );
  }

  return (
    <div className="pb-6 animate-fade-up">
    {/* ══ HEADER ══ */}
    <header className="mb-5">
    <div className="flex items-center gap-2.5 mb-1">
    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-amber-400/10">
    <Icon d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" size={18} className="text-amber-400" />
    </div>
    <div>
    <h1 className={`font-extrabold m-0 text-[var(--text)] ${isMobile ? "text-xl" : "text-2xl"}`}>
    Livraisons
    </h1>
    <p className="text-xs text-[var(--text-muted)] mt-0.5">
    {currentCompany?.name} · {filtered.length} livraison{filtered.length !== 1 ? "s" : ""}
    </p>
    </div>
    </div>
    </header>

    {/* ══ STATS RAPIDES ══ */}
    <div className={`grid gap-2.5 mb-4 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
    {[
      { label: "Total", value: stats.total, color: "text-amber-400" },
      { label: "Livrés", value: stats.livres, color: "text-emerald-400" },
      { label: "En cours", value: stats.enCours, color: "text-amber-400" },
      { label: "Montant", value: formatAr(stats.montant), color: "text-violet-400" },
    ].map((s) => (
      <div key={s.label} className="text-center rounded-xl border border-[var(--border)] p-3 bg-[var(--card)]">
      <div className={`font-extrabold text-xl ${s.color}`}>{s.value}</div>
      <div className="text-[10px] text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">{s.label}</div>
      </div>
    ))}
    </div>

    {/* ══ BOUTON NOUVELLE LIVRAISON ══ */}
    <button
    onClick={() => setShowForm((p) => !p)}
    className={`w-full py-3.5 rounded-xl mb-4 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all font-[var(--font)] ${showForm ? "bg-[var(--bg-secondary)] text-[var(--text)] border border-[var(--border)]" : "bg-gradient-to-br from-amber-400 to-amber-600 text-[#08080c] border-none"}`}
    >
    {showForm ? "✕ Fermer" : "＋ Nouvelle livraison"}
    </button>

    {/* ══ FORMULAIRE ══ */}
    {showForm && (
      <div className="mb-5 animate-fade-up">
      <LivraisonForm
      agents={agents}
      onAddLivraison={async (data) => {
        try {
          await livraisonCrud.add(data);
          showToast("Livraison enregistrée");
          setShowForm(false);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
          showToast(msg, "error");
        }
      }}
      showToast={showToast}
      suggestions={suggestions}
      />
      </div>
    )}

    {/* ══ FILTRES ══ */}
    <Card className="mb-4">
    <div className={`grid gap-2.5 ${isMobile ? "grid-cols-1" : "grid-cols-4"}`}>
    <Input type="date" label="Date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
    <Select
    label="Statut"
    value={filterStatut}
    onChange={(e) => setFilterStatut(e.target.value)}
    options={[{ value: "tous", label: "Tous les statuts" }, ...STATUS_OPTIONS.map((s) => ({ value: s.key, label: s.label }))]}
    />
    <Select
    label="Agent"
    value={filterAgent}
    onChange={(e) => setFilterAgent(e.target.value)}
    options={[{ value: "tous", label: "Tous les agents" }, ...agents.map((a) => ({ value: a.nom, label: a.nom }))]}
    />
    <Input label="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Colis, client, destinataire..." />
    </div>
    </Card>

    {/* ══ LISTE DES LIVRAISONS ══ */}
    {filtered.length === 0 ? (
      <Card className="py-10">
      <div className="text-center text-sm text-[var(--text-muted)]">
      <div className="text-3xl mb-2">📦</div>
      {safeLivraisons.length === 0 ? "Aucune livraison enregistrée." : "Aucun résultat pour ces filtres."}
      </div>
      </Card>
    ) : (
      <>
      {/* Actions bar */}
      <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
      <div className="flex gap-1.5">
      {[
        { key: "date" as SortKey, label: "📅 Date" },
        { key: "montant" as SortKey, label: "💰 Montant" },
        { key: "statut" as SortKey, label: "📊 Statut" },
      ].map((s) => (
        <button
        key={s.key}
        onClick={() => handleSort(s.key)}
        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all font-[var(--font)] ${sortBy === s.key ? "border-[1.5px] border-amber-400 bg-amber-400/10 text-amber-400" : "border border-[var(--border)] bg-transparent text-[var(--text-muted)]"}`}
        >
        {s.label} {sortBy === s.key && (sortDir === "asc" ? "↑" : "↓")}
        </button>
      ))}
      </div>
      <button
      onClick={handleExportCSV}
      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-[var(--border)] bg-transparent text-[var(--text-muted)] font-[var(--font)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors"
      >
      📥 Exporter CSV
      </button>
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-2.5">
      {sorted.map((l) => {
        const isEditing = editingId === l.id;
        const config = getStatusConfig(l.statut);
        const paiementLabel = PAIE_MODES[l.paiement || ""]?.label || l.paiement || "—";
        const paiementIcon = l.paiement === "espece" ? "💵" : l.paiement === "mobile_money" ? "📱" : l.paiement === "client" ? "🤝" : "💵";

        return (
          <Card key={l.id} className={`overflow-hidden border-l-4 ${config.border}`}>
          <div className={isMobile ? "p-3" : "px-4 py-3.5"}>
          {/* Ligne principale */}
          <div className="flex items-center gap-3 flex-wrap">
          {/* Icône statut */}
          <div className={`flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-[10px] ${config.bg}`}>
          <StatusIcon name={config.icon} size={18} className={config.text} />
          </div>
          {/* Infos */}
          <div className="flex-1 min-w-[140px]">
          <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-sm text-[var(--text)]">{l.colis}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${config.bg} ${config.text}`}>
          {STATUTS[l.statut || ""]?.label || l.statut || "—"}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
          {paiementIcon} {paiementLabel}
          </span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
          {l.client_donneur || "—"} → {l.destinataire || "—"}
          {l.agent_nom && <span className="text-[var(--accent)]"> · 🚚 {l.agent_nom}</span>}
          </div>
          <div className="text-[10px] text-[var(--text-faint)] mt-0.5">
          {l.date} {l.destinataire_lieu && `· 📍 ${l.destinataire_lieu}`}
          </div>
          </div>
          {/* Montant */}
          <div className="text-right">
          {isEditing ? (
            <div className="flex items-center gap-1.5">
            <input
            type="number"
            value={editMontant}
            onChange={(e) => setEditMontant(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEditMontant(l.id);
              if (e.key === "Escape") cancelEdit();
            }}
            className="w-[90px] px-2 py-1.5 rounded-lg text-xs outline-none bg-[var(--card)] border border-[var(--accent)] text-[var(--text)] font-[var(--font)]"
            autoFocus
            />
            <button
            onClick={() => handleEditMontant(l.id)}
            disabled={saving}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border-none bg-amber-400 text-[#08080c] hover:bg-amber-500 transition-colors"
            >
            ✓
            </button>
            <button
            onClick={cancelEdit}
            className="px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer border border-[var(--border)] bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors"
            >
            ✕
            </button>
            </div>
          ) : (
            <>
            <div className="font-bold text-sm text-amber-400">
            {l.montant ? formatAr(l.montant) : "—"}
            </div>
            {l.frais ? <div className="text-[10px] text-[var(--text-muted)]">Frais: {formatAr(l.frais)}</div> : null}
            </>
          )}
          </div>
          {/* Actions */}
          <div className="flex gap-1.5">
          <button
          onClick={() => startEdit(l)}
          title="Modifier le montant"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer border bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors"
          >
          ✏️
          </button>
          <button
          onClick={() => handleDelete(l.id)}
          title={deleteConfirmId === l.id ? "Confirmer la suppression" : "Supprimer"}
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer border transition-all ${deleteConfirmId === l.id ? "bg-red-400 border-red-400 text-white" : "bg-red-50 border-red-200/50 text-red-400 hover:bg-red-100 hover:text-red-500"}`}
          >
          {deleteConfirmId === l.id ? "⚠️" : "🗑"}
          </button>
          </div>
          </div>
          {/* Remarque */}
          {l.remarque && (
            <div className="mt-2 px-2.5 py-1.5 rounded-lg text-[11px] text-[var(--text-secondary)] border-l-2 border-amber-400 bg-[var(--bg)]">
            📝 {l.remarque}
            </div>
          )}
          {/* Boutons de changement de statut */}
          <div className="flex gap-1.5 mt-2.5 pt-2.5 border-t border-[var(--border)]">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = l.statut === opt.key;
            return (
              <button
              key={opt.key}
              onClick={() => !isActive && handleStatusUpdate(l.id, opt.key)}
              disabled={saving || isActive}
              className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all font-[var(--font)] ${isActive ? `border-2 ${opt.border.replace('border-l-', 'border-')} ${opt.bg} ${opt.text} font-bold opacity-100 cursor-default` : `border border-[var(--border)] bg-transparent text-[var(--text-muted)] opacity-70 hover:opacity-100 cursor-pointer ${opt.hover}`}`}
              >
              <StatusIcon name={opt.icon} size={12} className={isActive ? opt.text : "text-[var(--text-muted)]"} />
              {opt.label}
              </button>
            );
          })}
          </div>
          </div>
          </Card>
        );
      })}
      </div>

      {/* Totaux en bas */}
      <Card className="mt-4 px-4 py-3.5">
      <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex gap-4 flex-wrap">
      <div>
      <span className="text-[10px] text-[var(--text-muted)] block">Montant total</span>
      <div className="font-extrabold text-lg text-amber-400">{formatAr(stats.montant)}</div>
      </div>
      <div>
      <span className="text-[10px] text-[var(--text-muted)] block">Frais total</span>
      <div className="font-extrabold text-lg text-violet-400">{formatAr(stats.frais)}</div>
      </div>
      <div>
      <span className="text-[10px] text-[var(--text-muted)] block">Livrés / Total</span>
      <div className="font-extrabold text-lg text-emerald-400">
      {stats.livres} / {stats.total}
      <span className="text-xs font-normal ml-1 text-[var(--text-muted)]">({stats.tauxLivraison}%)</span>
      </div>
      </div>
      </div>
      <div className="text-[11px] text-[var(--text-muted)]">
      {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
      </div>
      </div>
      </Card>
      </>
    )}
    </div>
  );
}
