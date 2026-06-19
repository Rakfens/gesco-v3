"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Badge, Button, Card, CardTitle, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  Select, StatCard, Table, TableBody, TableCell, TableEmpty, TableFooter, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Depense } from "@/modules/shared/types";
import { CATEGORIES_DEPENSES, formatAr } from "@/modules/shared/utils/constants";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";

/* ─── SVG Icons ─── */
const Icon = ({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
);
const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
);

/* ─── Category colors ─── */
const CAT_COLORS: Record<string, string> = {
  "Électricité": "var(--gold)", "Eau": "var(--info)", "Transport": "var(--gold)",
  "Fournitures": "var(--violet)", "Communication": "var(--info)", "Loyer": "var(--danger)",
  "Marketing": "var(--violet)", "Salaires": "var(--success)", "Entretien": "var(--gold)",
  "Impressions": "var(--gold)", "Autres": "var(--warning)",
};

/* ═══════════════════════════════════════════════════════════
   PAGE DEPENSES — Noir & Or Premium
   ═══════════════════════════════════════════════════════════ */
export default function Depenses() {
  const { currentCompany, success: showSuccess, error: showError, warn: showWarn } = useApp();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Depense | null>(null);
  const [filterCat, setFilterCat] = useState("");
  const [filterDebut, setFilterDebut] = useState("");
  const [filterFin, setFilterFin] = useState("");
  const [form, setForm] = useState({ categorie: "", description: "", montant: 0, date_depense: new Date().toISOString().split("T")[0] });
  const [stats, setStats] = useState({ totalJour: 0, totalSemaine: 0, totalMois: 0, totalAnnee: 0 });

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const loadDepenses = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      let q = getSupabase().from("depenses").select("*").eq("company_id", currentCompany.id).order("date_depense", { ascending: false });
      if (filterCat) q = q.eq("categorie", filterCat);
      if (filterDebut) q = q.gte("date_depense", filterDebut);
      if (filterFin) q = q.lte("date_depense", filterFin);
      const { data, error } = await q;
      if (error) throw error;
      const list = data || [];
      setDepenses(list);
      calcStats(list);
    } catch (e: unknown) { logger.error("Erreur chargement:", e); showError("Erreur chargement"); }
    finally { setLoading(false); }
  }, [currentCompany, filterCat, filterDebut, filterFin]);

  useEffect(() => { loadDepenses(); }, []);
  useEffect(() => {
    const handler = (e: Event) => { if ((e as CustomEvent)?.detail?.table === "depenses") loadDepenses(); };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, []);

  const calcStats = (list: Depense[]) => {
    const t = new Date().toISOString().split("T")[0];
    const dow = new Date().getDay();
    const diff = dow === 0 ? 6 : dow - 1;
    const sw = new Date(); sw.setDate(sw.getDate() - diff);
    const sm = new Date(); sm.setDate(1);
    const sy = new Date(); sy.setMonth(0); sy.setDate(1);
    const sum = (arr: Depense[]) => arr.reduce((s: number, d: Depense) => s + (d.montant || 0), 0);
    const d = (date: string) => (date || "").split("T")[0];
    setStats({
      totalJour: sum(list.filter((x: Depense) => d(x.date_depense || x.date || "") === t)),
      totalSemaine: sum(list.filter((x: Depense) => d(x.date_depense || x.date || "") >= sw.toISOString().split("T")[0])),
      totalMois: sum(list.filter((x: Depense) => d(x.date_depense || x.date || "") >= sm.toISOString().split("T")[0])),
      totalAnnee: sum(list.filter((x: Depense) => d(x.date_depense || x.date || "") >= sy.toISOString().split("T")[0])),
    });
  };

  const handleSubmit = async () => {
    if (!form.categorie) { showWarn("Catégorie requise"); return; }
    if (!form.description) { showWarn("Description requise"); return; }
    if (form.montant <= 0) { showWarn("Montant doit être > 0"); return; }
    setSaving(true);
    try {
      const { error } = await getSupabase().from("depenses").insert([{ company_id: currentCompany!.id, categorie: form.categorie, description: form.description, montant: form.montant, date_depense: form.date_depense, created_at: new Date().toISOString() }]);
      if (error) throw error;
      showSuccess("Dépense enregistrée");
      setShowModal(false);
      setForm({ categorie: "", description: "", montant: 0, date_depense: new Date().toISOString().split("T")[0] });
      loadDepenses();
      window.dispatchEvent(new CustomEvent("refreshDashboard"));
    } catch (e: unknown) { logger.error("Erreur:", e); showError("Erreur enregistrement"); }
    finally { setSaving(false); }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id; setConfirmDelete(null);
    try {
      const { error } = await getSupabase().from("depenses").delete().eq("id", id).eq("company_id", currentCompany!.id);
      if (error) throw error;
      showSuccess("Dépense supprimée"); loadDepenses();
      window.dispatchEvent(new CustomEvent("refreshDashboard"));
    } catch { showError("Erreur suppression"); }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
  };

  const categories = [...new Set(depenses.map((d) => d.categorie).filter((c): c is string => !!c))];
  const totalDepenses = depenses.reduce((s, d) => s + (d.montant || 0), 0);
  const byCategorie = depenses.reduce((acc: Record<string, number>, d) => { const k = d.categorie || "Autre"; acc[k] = (acc[k] || 0) + d.montant; return acc; }, {});

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  /* ─── Loading ─── */
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2" style={{ borderColor: "var(--border-default)", borderTopColor: "var(--danger)" }} />
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>Chargement des dépenses...</span>
    </div>
  );

  return (
    <div className="pb-8">

      {/* ══ MODALS ══ */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <ModalHeader title="Supprimer la dépense ?" onClose={() => setConfirmDelete(null)} />
        <ModalBody>
          <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
            "{confirmDelete?.description}" · {formatAr(confirmDelete?.montant || 0)}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Annuler</Button>
          <Button variant="danger" onClick={executeDelete}>Supprimer</Button>
        </ModalFooter>
      </Modal>

      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <ModalHeader title="Nouvelle dépense" onClose={() => setShowModal(false)} />
        <ModalBody>
          <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <Select label="Catégorie *" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} options={[{ value: "", label: "-- Choisir --" }, ...CATEGORIES_DEPENSES.map((c) => ({ value: c, label: c }))]} />
            <Input type="date" label="Date" value={form.date_depense} onChange={(e) => setForm({ ...form, date_depense: e.target.value })} />
          </div>
          <div className="mt-3">
            <Input label="Description *" placeholder="Ex: Facture électricité Janvier..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="mt-3">
            <Input type="number" label="Montant (Ar) *" value={String(form.montant || "")} onChange={(e) => setForm({ ...form, montant: parseFloat(e.target.value) || 0 })} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
          <Button variant="danger" onClick={handleSubmit} disabled={saving} loading={saving} icon={<PlusIcon />}>Enregistrer</Button>
        </ModalFooter>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          HEADER — Hero rouge danger
          ═══════════════════════════════════════════════════════ */}
      <div className="relative mb-6 overflow-hidden rounded-2xl p-5 sm:p-6" style={{
        ...sectionStyle(0),
        background: "linear-gradient(135deg, rgba(248,113,113,0.08) 0%, rgba(201,169,110,0.04) 50%, rgba(139,92,246,0.03) 100%)",
        border: "1px solid rgba(248,113,113,0.12)",
      }}>
        {/* Glow decorations */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: "rgba(248,113,113,0.06)" }} />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full blur-3xl" style={{ background: "rgba(139,92,246,0.04)" }} />

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shrink-0" style={{
              border: "2px solid rgba(248,113,113,0.2)",
              background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))",
              boxShadow: "0 0 24px rgba(248,113,113,0.08)",
            }}>
              <Image src="/logo.png" alt="HT-GesCom" width={32} height={32} priority className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>Dépenses</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {currentCompany?.name} · {depenses.length} enregistrement{depenses.length !== 1 ? "s" : ""} · Total {formatAr(totalDepenses)}
              </p>
            </div>
          </div>
          <Button variant="danger" onClick={() => setShowModal(true)} icon={<PlusIcon />} className="btn-press" style={{ boxShadow: "0 0 20px rgba(248,113,113,0.15)" }}>
            Nouvelle dépense
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STATS — 5 cartes avec icônes SVG
          ═══════════════════════════════════════════════════════ */}
      <div className={`grid gap-3 mb-5 ${isMobile ? "grid-cols-2" : "grid-cols-5"}`} style={sectionStyle(0.1)}>
        <StatCard label="Aujourd'hui" value={formatAr(stats.totalJour)} color="danger" icon={<Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" size={18} />} />
        <StatCard label="Semaine" value={formatAr(stats.totalSemaine)} color="warning" icon={<Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={18} />} />
        <StatCard label="Mois" value={formatAr(stats.totalMois)} color="accent" icon={<Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" size={18} />} />
        <StatCard label="Année" value={formatAr(stats.totalAnnee)} color="purple" icon={<Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={18} />} />
        <StatCard label="Total général" value={formatAr(totalDepenses)} color="danger" icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} />} />
      </div>

      {/* ═══════════════════════════════════════════════════════
          RÉPARTITION PAR CATÉGORIE — Barres premium
          ═══════════════════════════════════════════════════════ */}
      {Object.keys(byCategorie).length > 0 && (
        <div className="mb-5 rounded-2xl overflow-hidden" style={{
          ...sectionStyle(0.15),
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-card)",
        }}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(139,92,246,0.1)", color: "var(--violet)" }}>
              <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={14} />
            </div>
            <CardTitle className="text-sm">Répartition par catégorie</CardTitle>
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.08)", color: "var(--violet)" }}>
              {Object.keys(byCategorie).length} catégories
            </span>
          </div>
          <div className="p-5">
            {Object.entries(byCategorie).sort(([, a], [, b]) => (b as number) - (a as number)).map(([cat, total], idx) => {
              const pct = totalDepenses > 0 ? (((total as number) / totalDepenses) * 100).toFixed(1) : 0;
              const color = CAT_COLORS[cat] || "var(--gold)";
              return (
                <div key={cat} className="mb-3 last:mb-0" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="flex justify-between mb-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}40` }} />
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{cat}</span>
                    </div>
                    <span className="font-semibold" style={{ color: "var(--text-muted)" }}>{formatAr(total as number)} · {pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                    <div className="h-full rounded-full transition-all duration-700 ease-out" style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                      boxShadow: `0 0 10px ${color}30`,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          FILTRES
          ═══════════════════════════════════════════════════════ */}
      <div className="mb-5 rounded-2xl p-4" style={{
        ...sectionStyle(0.2),
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-card)",
      }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(248,113,113,0.08)", color: "var(--danger)" }}>
            <FilterIcon />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Filtres</span>
          {(filterCat || filterDebut || filterFin) && (
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(248,113,113,0.08)", color: "var(--danger)" }}>
              Filtré
            </span>
          )}
        </div>
        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-[auto_auto_auto_1fr_auto]"} items-end`}>
          <Select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} options={[{ value: "", label: "Toutes catégories" }, ...categories.map((c) => ({ value: c, label: c }))]} />
          <Input type="date" label="Du" value={filterDebut} onChange={(e) => setFilterDebut(e.target.value)} />
          <Input type="date" label="Au" value={filterFin} onChange={(e) => setFilterFin(e.target.value)} />
          <div />
          {(filterCat || filterDebut || filterFin) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterCat(""); setFilterDebut(""); setFilterFin(""); }} className="h-[38px] btn-press">✕ Effacer</Button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TABLE — Design premium avec footer total
          ═══════════════════════════════════════════════════════ */}
      {isMobile ? (
        /* ── Mobile: Cards ── */
        <div className="flex flex-col gap-3" style={sectionStyle(0.25)}>
          {depenses.length === 0 ? (
            <div className="rounded-2xl py-14 text-center" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
              <div className="text-4xl mb-3">💰</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune dépense enregistrée.</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>Cliquez sur "Nouvelle dépense" pour commencer.</div>
            </div>
          ) : depenses.map((d, idx) => {
            const color = CAT_COLORS[d.categorie || ""] || "var(--gold)";
            return (
              <div key={d.id} className="rounded-2xl overflow-hidden transition-all duration-200" style={{
                ...sectionStyle(0.25 + idx * 0.03),
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-card)",
              }}>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}40` }} />
                        <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{d.categorie}</span>
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{d.description}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>{formatDate(d.date_depense || d.date || "")}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold" style={{ color: "var(--danger)" }}>{formatAr(d.montant)}</div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="danger" size="sm" onClick={() => setConfirmDelete(d)} icon={<TrashIcon />} className="btn-press">Supprimer</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Desktop: Table ── */
        <div className="rounded-2xl overflow-hidden" style={{
          ...sectionStyle(0.25),
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-card)",
        }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader className="col-sm">Date</TableHeader>
                <TableHeader className="col-lg">Catégorie</TableHeader>
                <TableHeader className="col-md">Description</TableHeader>
                <TableHeader className="col-sm" align="right">Montant (Ar)</TableHeader>
                <TableHeader className="col-xs" align="center">Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {depenses.length === 0 ? (
                <TableEmpty colSpan={5} message="Aucune dépense enregistrée" />
              ) : depenses.map((d) => {
                const color = CAT_COLORS[d.categorie || ""] || "var(--gold)";
                return (
                  <TableRow key={d.id}>
                    <TableCell className="col-sm text-xs truncate whitespace-nowrap">
                      <span style={{ color: "var(--text-muted)" }}>{formatDate(d.date_depense || d.date || "")}</span>
                    </TableCell>
                    <TableCell className="col-lg truncate whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}40` }} />
                        <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{d.categorie}</span>
                      </div>
                    </TableCell>
                    <TableCell className="col-md text-xs truncate whitespace-nowrap">
                      <span style={{ color: "var(--text-primary)" }}>{d.description}</span>
                    </TableCell>
                    <TableCell className="col-sm font-bold text-sm truncate whitespace-nowrap" align="right">
                      <span style={{ color: "var(--danger)" }}>{formatAr(d.montant)}</span>
                    </TableCell>
                    <TableCell className="col-xs" align="center">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(d)}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg transition-colors duration-150 hover:bg-[rgba(248,113,113,0.12)]"
                        style={{ color: "var(--danger)" }}
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            {depenses.length > 0 && (
              <TableFooter>
                <TableCell className="col-sm">{''}</TableCell>
                <TableCell className="col-lg">{''}</TableCell>
                <TableCell className="col-md font-bold">
                  <span style={{ color: "var(--text-primary)" }}>TOTAL GÉNÉRAL</span>
                </TableCell>
                <TableCell className="col-sm font-extrabold text-base" align="right">
                  <span style={{ color: "var(--danger)" }}>{formatAr(totalDepenses)}</span>
                </TableCell>
                <TableCell className="col-xs">{''}</TableCell>
              </TableFooter>
            )}
          </Table>
        </div>
      )}
    </div>
  );
}
