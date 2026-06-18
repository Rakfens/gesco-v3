// src/modules/livraison/pages/LivraisonsPage.tsx
"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Card, Input, Select } from "@/modules/shared/components/ui";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useApp } from "@/modules/shared/context/AppContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Livraison } from "@/modules/shared/types";
import { LivraisonForm } from "../components/LivraisonForm";
import { TODAY, formatAr, STATUTS, PAIE_MODES } from "@/modules/shared/utils/constants";
import { StatusIcon, Icon } from "@/modules/shared/components/ui/Icons";

/* ─── Status config ─── */
const STATUS_OPTIONS = [
  { key: "en_cours", label: "En cours", icon: "clock" as const, color: "var(--gold)", bg: "rgba(201,169,110,0.08)", hover: "hover:border-[var(--gold)]/40" },
  { key: "livre", label: "Livré", icon: "check" as const, color: "var(--success)", bg: "rgba(52,211,153,0.08)", hover: "hover:border-[var(--success)]/40" },
  { key: "retourne", label: "Retourné", icon: "rotate-left" as const, color: "var(--danger)", bg: "rgba(248,113,113,0.08)", hover: "hover:border-[var(--danger)]/40" },
  { key: "reporte", label: "Reporté", icon: "xmark" as const, color: "var(--violet)", bg: "rgba(139,92,246,0.08)", hover: "hover:border-[var(--violet)]/40" },
] as const;

type SortKey = "date" | "montant" | "statut";

function getStatusConfig(statut?: string) {
  return STATUS_OPTIONS.find((s) => s.key === statut) || STATUS_OPTIONS[0];
}

/* ─── SVG Icons ─── */
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);
const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);
const TruckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3" />
    <rect x="9" y="11" width="14" height="10" rx="2" />
    <circle cx="12" cy="21" r="1.5" fill="currentColor" /><circle cx="20" cy="21" r="1.5" fill="currentColor" />
  </svg>
);

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
  const [mounted, setMounted] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
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
      if (prev === key) { setSortDir((d) => (d === "asc" ? "desc" : "asc")); return prev; }
      setSortDir("desc"); return key;
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
    requestAnimationFrame(() => { document.body.removeChild(a); URL.revokeObjectURL(url); });
    showToast("Export CSV téléchargé");
  }, [sorted, filterDate, showToast]);

  const handleStatusUpdate = useCallback(async (id: string, statut: string, remarque?: string) => {
    setSaving(true);
    try {
      await livraisonCrud.update(id, { statut, ...(remarque !== undefined ? { remarque } : {}) });
      if (mountedRef.current) showToast(`Statut: ${STATUTS[statut]?.label || statut}`);
    } catch (err) {
      if (mountedRef.current) showToast(err instanceof Error ? err.message : "Erreur", "error");
    } finally { if (mountedRef.current) setSaving(false); }
  }, [livraisonCrud, showToast]);

  const handleEditMontant = useCallback(async (id: string) => {
    if (!editMontant) return;
    setSaving(true);
    try {
      await livraisonCrud.update(id, { montant: parseFloat(editMontant) || 0 });
      if (mountedRef.current) { showToast("Montant modifié"); setEditingId(null); setEditMontant(""); }
    } catch (err) {
      if (mountedRef.current) showToast(err instanceof Error ? err.message : "Erreur", "error");
    } finally { if (mountedRef.current) setSaving(false); }
  }, [editMontant, livraisonCrud, showToast]);

  const handleDelete = useCallback(async (id: string) => {
    if (deleteConfirmId !== id) { setDeleteConfirmId(id); return; }
    setSaving(true);
    try {
      await livraisonCrud.delete(id);
      if (mountedRef.current) { showToast("Livraison supprimée", "warn"); setDeleteConfirmId(null); }
    } catch (err) {
      if (mountedRef.current) showToast(err instanceof Error ? err.message : "Erreur", "error");
    } finally { if (mountedRef.current) setSaving(false); }
  }, [deleteConfirmId, livraisonCrud, showToast]);

  const startEdit = useCallback((l: Livraison) => { setEditingId(l.id); setEditMontant(String(l.montant || "")); }, []);
  const cancelEdit = useCallback(() => { setEditingId(null); setEditMontant(""); }, []);

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  if (loadingLivraisons) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2" style={{ borderColor: "var(--border-default)", borderTopColor: "var(--gold)" }} />
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>Chargement des livraisons...</span>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* ═══════════════════════════════════════════════════════
          HEADER HERO
          ═══════════════════════════════════════════════════════ */}
      <div
        className="relative mb-6 overflow-hidden rounded-2xl p-5"
        style={{
          ...sectionStyle(0),
          background: "linear-gradient(135deg, rgba(201,169,110,0.06) 0%, rgba(139,92,246,0.03) 100%)",
          border: "1px solid rgba(201,169,110,0.08)",
        }}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(201,169,110,0.05)" }} />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shrink-0"
              style={{
                border: "2px solid rgba(201,169,110,0.2)",
                background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))",
                boxShadow: "0 0 20px rgba(201,169,110,0.06)",
              }}
            >
              <Image src="/logo.png" alt="HT-GesCom" width={32} height={32} priority className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Livraisons
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {currentCompany?.name} · {filtered.length} livraison{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: "Total", value: stats.total, color: "var(--gold)" },
              { label: "Livrés", value: stats.livres, color: "var(--success)" },
              { label: "Taux", value: `${stats.tauxLivraison}%`, color: stats.tauxLivraison >= 70 ? "var(--success)" : stats.tauxLivraison >= 40 ? "var(--gold)" : "var(--danger)" },
            ].map((pill) => (
              <div key={pill.label} className="rounded-full px-3 py-1.5 border" style={{ background: `${pill.color}08`, borderColor: `${pill.color}15` }}>
                <span className="mr-1 text-[10px]" style={{ color: "var(--text-muted)" }}>{pill.label}</span>
                <span className="text-[11px] font-bold" style={{ color: pill.color }}>{pill.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STATS RAPIDES
          ═══════════════════════════════════════════════════════ */}
      <div className={`grid gap-3 mb-5 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`} style={sectionStyle(0.1)}>
        {[
          { label: "Total", value: stats.total, color: "var(--gold)", icon: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" },
          { label: "Livrés", value: stats.livres, color: "var(--success)", icon: "M20 6L9 17l-5-5" },
          { label: "En cours", value: stats.enCours, color: "var(--warning)", icon: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2" },
          { label: "Montant", value: formatAr(stats.montant), color: "var(--violet)", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-3.5 transition-all duration-200 hover:-translate-y-0.5"
            style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${s.color}10`, color: s.color }}>
                <Icon d={s.icon} size={13} className="text-current" />
              </div>
            </div>
            <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          BOUTON NOUVELLE LIVRAISON
          ═══════════════════════════════════════════════════════ */}
      <button
        onClick={() => setShowForm((p) => !p)}
        className="w-full py-3.5 rounded-xl mb-5 text-sm font-bold flex items-center justify-center gap-2.5 btn-press transition-all duration-300"
        style={{
          background: showForm ? "var(--bg-card)" : "linear-gradient(135deg, var(--gold), var(--gold-dark))",
          color: showForm ? "var(--text-primary)" : "var(--bg-primary)",
          border: showForm ? "1px solid var(--border-default)" : "1px solid transparent",
          boxShadow: showForm ? "none" : "0 4px 16px rgba(201,169,110,0.2)",
        }}
      >
        {showForm ? <><XIcon /> Fermer</> : <><PlusIcon /> Nouvelle livraison</>}
      </button>

      {/* ═══════════════════════════════════════════════════════
          FORMULAIRE
          ═══════════════════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════════════════
          FILTRES
          ═══════════════════════════════════════════════════════ */}
      <div className="mb-5 rounded-xl p-4" style={{ ...sectionStyle(0.2), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(201,169,110,0.08)", color: "var(--gold)" }}>
            <FilterIcon />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Filtres</span>
        </div>
        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-4"}`}>
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
          <div className="relative">
            <Input label="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Colis, client, destinataire..." />
          </div>
        </div>

        {/* Status quick-filter chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <button
            onClick={() => setFilterStatut("tous")}
            className="rounded-full px-3 py-1 text-[10px] font-semibold btn-press transition-all"
            style={{
              border: filterStatut === "tous" ? "1.5px solid var(--gold)" : "1px solid var(--border-default)",
              background: filterStatut === "tous" ? "rgba(201,169,110,0.08)" : "transparent",
              color: filterStatut === "tous" ? "var(--gold)" : "var(--text-muted)",
            }}
          >
            Tous ({filtered.length})
          </button>
          {STATUS_OPTIONS.map((opt) => {
            const count = filtered.filter((l) => l.statut === opt.key).length;
            return (
              <button
                key={opt.key}
                onClick={() => setFilterStatut(opt.key)}
                className="rounded-full px-3 py-1 text-[10px] font-semibold btn-press transition-all"
                style={{
                  border: filterStatut === opt.key ? `1.5px solid ${opt.color}` : "1px solid var(--border-default)",
                  background: filterStatut === opt.key ? opt.bg : "transparent",
                  color: filterStatut === opt.key ? opt.color : "var(--text-muted)",
                }}
              >
                {opt.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          LISTE DES LIVRAISONS
          ═══════════════════════════════════════════════════════ */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl py-12 text-center" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <div className="text-4xl mb-3">📦</div>
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            {safeLivraisons.length === 0 ? "Aucune livraison enregistrée." : "Aucun résultat pour ces filtres."}
          </div>
        </div>
      ) : (
        <>
          {/* Actions bar */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2" style={sectionStyle(0.25)}>
            <div className="flex gap-1.5">
              {([
                { key: "date" as SortKey, label: "Date", icon: "M8 2v14M2 6h4M2 10h4M2 14h4" },
                { key: "montant" as SortKey, label: "Montant", icon: "M12 1v22" },
                { key: "statut" as SortKey, label: "Statut", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
              ]).map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleSort(s.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold btn-press transition-all"
                  style={{
                    border: sortBy === s.key ? "1.5px solid var(--gold)" : "1px solid var(--border-default)",
                    background: sortBy === s.key ? "rgba(201,169,110,0.08)" : "transparent",
                    color: sortBy === s.key ? "var(--gold)" : "var(--text-muted)",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={s.icon} />
                  </svg>
                  {s.label}
                  {sortBy === s.key && (
                    <span className="text-[9px]">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold btn-press transition-colors"
              style={{ border: "1px solid var(--border-default)", color: "var(--text-muted)" }}
            >
              <DownloadIcon />
              Exporter CSV
            </button>
          </div>

          {/* Liste */}
          <div className="flex flex-col gap-3">
            {sorted.map((l, idx) => {
              const isEditing = editingId === l.id;
              const config = getStatusConfig(l.statut);
              const paiementLabel = PAIE_MODES[l.paiement || ""]?.label || l.paiement || "—";

              return (
                <div
                  key={l.id}
                  className="rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    ...sectionStyle(0.3 + idx * 0.02),
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-card)",
                    borderLeft: `3px solid ${config.color}`,
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div className={isMobile ? "p-3.5" : "px-4 py-3.5"}>
                    {/* Main row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Status icon */}
                      <div
                        className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-xl"
                        style={{ background: config.bg, color: config.color }}
                      >
                        <StatusIcon name={config.icon} size={18} className="text-current" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-[140px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{l.colis}</span>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: config.bg, color: config.color }}
                          >
                            {STATUTS[l.statut || ""]?.label || l.statut || "—"}
                          </span>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-full"
                            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
                          >
                            {paiementLabel}
                          </span>
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {l.client_donneur || "—"} → {l.destinataire || "—"}
                          {l.agent_nom && <span style={{ color: "var(--gold)" }}> · <TruckIcon /> {l.agent_nom}</span>}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>
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
                              className="w-[90px] px-2 py-1.5 rounded-lg text-xs outline-none input-focus"
                              style={{ background: "var(--bg-card)", border: "1px solid var(--gold)", color: "var(--text-primary)" }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditMontant(l.id)}
                              disabled={saving}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold btn-press"
                              style={{ background: "var(--gold)", color: "var(--bg-primary)", cursor: saving ? "wait" : "pointer" }}
                            >✓</button>
                            <button
                              onClick={cancelEdit}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] btn-press"
                              style={{ border: "1px solid var(--border-default)", color: "var(--text-muted)" }}
                            >✕</button>
                          </div>
                        ) : (
                          <>
                            <div className="font-bold text-sm" style={{ color: "var(--gold)" }}>
                              {l.montant ? formatAr(l.montant) : "—"}
                            </div>
                            {l.frais ? <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Frais: {formatAr(l.frais)}</div> : null}
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => startEdit(l)}
                          title="Modifier le montant"
                          className="w-8 h-8 rounded-lg flex items-center justify-center btn-press transition-colors"
                          style={{ border: "1px solid var(--border-default)", background: "var(--bg-secondary)", color: "var(--text-muted)" }}
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDelete(l.id)}
                          title={deleteConfirmId === l.id ? "Confirmer la suppression" : "Supprimer"}
                          className="w-8 h-8 rounded-lg flex items-center justify-center btn-press transition-all"
                          style={{
                            border: deleteConfirmId === l.id ? "1px solid var(--danger)" : "1px solid rgba(248,113,113,0.15)",
                            background: deleteConfirmId === l.id ? "var(--danger)" : "rgba(248,113,113,0.04)",
                            color: deleteConfirmId === l.id ? "white" : "var(--danger)",
                          }}
                        >
                          {deleteConfirmId === l.id ? "⚠" : <TrashIcon />}
                        </button>
                      </div>
                    </div>

                    {/* Remarque */}
                    {l.remarque && (
                      <div
                        className="mt-2.5 px-3 py-2 rounded-lg text-[11px]"
                        style={{ borderLeft: `2px solid ${config.color}`, background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                      >
                        📝 {l.remarque}
                      </div>
                    )}

                    {/* Status buttons */}
                    <div className="flex gap-1.5 mt-3 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      {STATUS_OPTIONS.map((opt) => {
                        const isActive = l.statut === opt.key;
                        return (
                          <button
                            key={opt.key}
                            onClick={() => !isActive && handleStatusUpdate(l.id, opt.key)}
                            disabled={saving || isActive}
                            className="flex-1 py-1.5 px-1 rounded-lg text-[10px] flex items-center justify-center gap-1.5 btn-press transition-all"
                            style={{
                              border: isActive ? `2px solid ${opt.color}` : "1px solid var(--border-default)",
                              background: isActive ? opt.bg : "transparent",
                              color: isActive ? opt.color : "var(--text-muted)",
                              fontWeight: isActive ? 700 : 400,
                              opacity: isActive ? 1 : 0.6,
                              cursor: isActive ? "default" : saving ? "wait" : "pointer",
                            }}
                          >
                            <StatusIcon name={opt.icon} size={12} className={isActive ? "text-current" : ""} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══════════════════════════════════════════════════════
              TOTAUX FOOTER
              ═══════════════════════════════════════════════════════ */}
          <div
            className="mt-5 rounded-xl p-4"
            style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex gap-5 flex-wrap">
                <div>
                  <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Montant total</span>
                  <div className="font-extrabold text-lg" style={{ color: "var(--gold)" }}>{formatAr(stats.montant)}</div>
                </div>
                <div>
                  <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Frais total</span>
                  <div className="font-extrabold text-lg" style={{ color: "var(--violet)" }}>{formatAr(stats.frais)}</div>
                </div>
                <div>
                  <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Livrés / Total</span>
                  <div className="font-extrabold text-lg" style={{ color: "var(--success)" }}>
                    {stats.livres} / {stats.total}
                    <span className="text-xs font-normal ml-1.5" style={{ color: "var(--text-muted)" }}>({stats.tauxLivraison}%)</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="min-w-[120px]">
                  <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Taux de réussite</span>
                  <div className="h-2.5 overflow-hidden rounded-full mt-1.5" style={{ background: "var(--bg-elevated)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${stats.tauxLivraison}%`,
                        background: stats.tauxLivraison >= 70
                          ? "linear-gradient(90deg, var(--success), #34d399)"
                          : stats.tauxLivraison >= 40
                          ? "linear-gradient(90deg, var(--gold), #d4b87a)"
                          : "linear-gradient(90deg, var(--danger), #f87171)",
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
