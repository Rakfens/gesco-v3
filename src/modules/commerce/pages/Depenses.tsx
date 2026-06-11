"use client";

import { useCallback, useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";
import {
  Badge, Button, Card, CardHeader, CardTitle, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  Select, StatCard, Table, TableBody, TableCell, TableEmpty, TableFooter, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Depense } from "@/modules/shared/types";
import { CATEGORIES_DEPENSES, formatAr } from "@/modules/shared/utils/constants";

/* ─── Colors ─── */
const C = {
  gold: "#c9a96e", goldDim: "rgba(201,169,110,0.1)",
  success: "#34d399", successDim: "rgba(52,211,193,0.1)",
  warning: "#fbbf24", warningDim: "rgba(251,191,36,0.1)",
  danger: "#f87171", dangerDim: "rgba(248,113,113,0.1)",
  violet: "#8b5cf6", violetDim: "rgba(139,92,246,0.1)",
  blue: "#60a5fa", blueDim: "rgba(96,165,250,0.1)",
  orange: "#fb923c", orangeDim: "rgba(251,146,60,0.1)",
  pink: "#f472b6", pinkDim: "rgba(244,114,182,0.1)",
  red: "#ef4444", redDim: "rgba(239,68,68,0.1)",
};

const CAT_COLORS: Record<string, string> = {
  "Électricité": C.warning, "Eau": C.blue, "Transport": C.gold, "Fournitures": C.violet,
  "Communication": C.blue, "Loyer": C.pink, "Marketing": C.violet, "Salaires": C.success,
  "Entretien": C.gold, "Impressions": C.gold, "Autres": C.orange,
};

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function Depenses() {
  const { currentCompany, success: showSuccess, error: showError, warn: showWarn } = useApp();
  const isMobile = useIsMobile();

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

  return (
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ MODALS ══ */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <ModalHeader title="Supprimer la dépense ?" onClose={() => setConfirmDelete(null)} />
        <ModalBody>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <Select label="Catégorie *" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}
              options={[{ value: "", label: "-- Choisir --" }, ...CATEGORIES_DEPENSES.map((c) => ({ value: c, label: c }))]} />
            <Input type="date" label="Date" value={form.date_depense} onChange={(e) => setForm({ ...form, date_depense: e.target.value })} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Input label="Description *" placeholder="Ex: Facture électricité Janvier..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Input type="number" label="Montant (Ar) *" value={String(form.montant || "")} onChange={(e) => setForm({ ...form, montant: parseFloat(e.target.value) || 0 })} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
          <Button variant="danger" onClick={handleSubmit} disabled={saving} loading={saving}>Enregistrer</Button>
        </ModalFooter>
      </Modal>

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.redDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" size={18} color={C.red} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Dépenses</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>{currentCompany?.name} · {depenses.length} enregistrement(s)</p>
          </div>
        </div>
        <Button variant="danger" onClick={() => setShowModal(true)}>＋ Nouvelle dépense</Button>
      </div>

      {/* ══ STATS ══ */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
        <StatCard label="Aujourd'hui" value={formatAr(stats.totalJour)} color={C.red} icon={<Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" size={16} color={C.red} />} />
        <StatCard label="Semaine" value={formatAr(stats.totalSemaine)} color={C.orange} icon={<Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={16} color={C.orange} />} />
        <StatCard label="Mois" value={formatAr(stats.totalMois)} color={C.pink} icon={<Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" size={16} color={C.pink} />} />
        <StatCard label="Année" value={formatAr(stats.totalAnnee)} color={C.violet} icon={<Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={16} color={C.violet} />} />
        <StatCard label="Total" value={formatAr(totalDepenses)} color={C.gold} icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={16} color={C.gold} />} />
      </div>

      {/* ══ RÉPARTITION PAR CATÉGORIE ══ */}
      {Object.keys(byCategorie).length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader><CardTitle>Répartition par catégorie</CardTitle></CardHeader>
          <div style={{ padding: "0 18px 18px" }}>
            {Object.entries(byCategorie).sort(([, a], [, b]) => (b as number) - (a as number)).map(([cat, total]) => {
              const pct = totalDepenses > 0 ? (((total as number) / totalDepenses) * 100).toFixed(1) : 0;
              const color = CAT_COLORS[cat] || C.gold;
              return (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{cat}</span>
                    <span style={{ color: "var(--text-muted)" }}>{formatAr(total as number)} · {pct}%</span>
                  </div>
                  <div style={{ background: "var(--bg-secondary)", height: 6, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 3, transition: "width 0.5s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ══ FILTRES ══ */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "auto auto auto 1fr auto", gap: 8, alignItems: "end" }}>
          <Select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
            options={[{ value: "", label: "Toutes catégories" }, ...categories.map((c) => ({ value: c, label: c }))]} />
          <Input type="date" label="Du" value={filterDebut} onChange={(e) => setFilterDebut(e.target.value)} />
          <Input type="date" label="Au" value={filterFin} onChange={(e) => setFilterFin(e.target.value)} />
          <div />
          {(filterCat || filterDebut || filterFin) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterCat(""); setFilterDebut(""); setFilterFin(""); }}>✕ Effacer</Button>
          )}
        </div>
      </Card>

      {/* ══ TABLE ══ */}
      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>Chargement...</div>
      ) : (
        <Card padding={0} style={{ overflow: "hidden" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Date</TableHeader>
                <TableHeader>Catégorie</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader align="right">Montant</TableHeader>
                <TableHeader align="center">Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {depenses.length === 0 ? (
                <TableEmpty colSpan={5} message="Aucune dépense enregistrée" />
              ) : (
                depenses.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(d.date_depense || d.date || "")}</TableCell>
                    <TableCell>
                      <Badge variant="info" size="sm">{d.categorie}</Badge>
                    </TableCell>
                    <TableCell style={{ fontSize: 12 }}>{d.description}</TableCell>
                    <TableCell align="right" style={{ fontWeight: 700, color: C.red, fontSize: 13 }}>{formatAr(d.montant)}</TableCell>
                    <TableCell align="center">
                      <Button variant="danger" size="sm" onClick={() => setConfirmDelete(d)}>🗑️</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {depenses.length > 0 && (
              <TableFooter>
                <TableCell colSpan={3} style={{ fontWeight: 700 }}>TOTAL</TableCell>
                <TableCell align="right" style={{ fontWeight: 800, color: C.red }}>{formatAr(totalDepenses)}</TableCell>
                <td />
              </TableFooter>
            )}
          </Table>
        </Card>
      )}
    </div>
  );
}
