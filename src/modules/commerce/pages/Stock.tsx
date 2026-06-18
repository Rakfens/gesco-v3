"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Badge, Button, Card, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  Select, StatCard, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Produit } from "@/modules/shared/types";
import { UNITES, formatAr } from "@/modules/shared/utils/constants";
import { getSupabase } from "@/lib/supabase";
import { createProduit, deleteProduit, fetchCategories, fetchProduits, updateProduit, updateStock } from "../services/produitService";

/* ─── SVG Icons ─── */
const BoxIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const AlertIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);
const BanIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);
const CashIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
);
const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
);
const InIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
);
const OutIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
);
const HistoryIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /><path d="M3 3v5h5" /></svg>
);
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
);
const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
);

/* ─── Types ─── */
interface Mouvement { id: string; type: string; quantite: number; notes?: string; date_mouvement?: string; }

/* ─── Status config ─── */
const STATUS_CFG = {
  ok: { label: "OK", color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.15)" },
  low: { label: "Bas", color: "#c9a96e", bg: "rgba(201,169,110,0.08)", border: "rgba(201,169,110,0.15)" },
  out: { label: "Rupture", color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.15)" },
};

function getStatus(p: Produit) {
  const isOut = (p.quantite_stock ?? 0) === 0;
  const isLow = !isOut && (p.quantite_stock ?? 0) <= (p.stock_minimum ?? 0);
  return isOut ? STATUS_CFG.out : isLow ? STATUS_CFG.low : STATUS_CFG.ok;
}

/* ─── Card produit (mobile) ─── */
function ProduitCard({ p, onEdit, onMovement, onHistory, onDelete }: {
  p: Produit; onEdit: (p: Produit) => void; onMovement: (p: Produit) => void; onHistory: (p: Produit) => void; onDelete: (p: Produit) => void;
}) {
  const marge = p.prix_vente && p.prix_achat ? (((p.prix_vente - p.prix_achat) / p.prix_achat) * 100).toFixed(0) : null;
  const st = getStatus(p);

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-200" style={{ border: `1px solid ${st.border}`, borderLeft: `3px solid ${st.color}`, background: "var(--bg-card)" }}>
      <div className="p-4">
        <div className="flex justify-between items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>{p.nom}</div>
            {p.reference && <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Réf: {p.reference}</div>}
            {p.categorie && <span className="text-[9px] py-0.5 px-1.5 rounded-full mt-1 inline-block" style={{ background: "rgba(139,92,246,0.08)", color: "var(--violet)" }}>{p.categorie}</span>}
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { l: "ACHAT", v: formatAr(p.prix_achat) },
            { l: "VENTE", v: formatAr(p.prix_vente) },
            { l: "STOCK", v: `${p.quantite_stock} ${p.unite || ""}` },
          ].map((r) => (
            <div key={r.l} className="rounded-lg py-1.5 px-2 text-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <div className="text-[9px] mb-0.5" style={{ color: "var(--text-muted)" }}>{r.l}</div>
              <div className="text-xs font-bold" style={{ color: r.l === "VENTE" ? "var(--success)" : r.l === "ACHAT" ? "var(--warning)" : st.color }}>{r.v}</div>
            </div>
          ))}
        </div>

        {marge !== null && (
          <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Marge :</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: Number(marge) >= 20 ? "rgba(52,211,153,0.08)" : Number(marge) >= 0 ? "rgba(201,169,110,0.08)" : "rgba(248,113,113,0.08)", color: Number(marge) >= 20 ? "var(--success)" : Number(marge) >= 0 ? "var(--warning)" : "var(--danger)" }}>
              {marge}%
            </span>
            {(p.stock_minimum ?? 0) > 0 && <span className="text-[10px] ml-auto" style={{ color: "var(--text-muted)" }}>Min: {p.stock_minimum}</span>}
          </div>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => onEdit(p)} icon={<EditIcon />}>✏️</Button>
          <Button variant="primary" size="sm" onClick={() => onMovement(p)} icon={<InIcon />}>📦</Button>
          <Button variant="ghost" size="sm" onClick={() => onHistory(p)} icon={<HistoryIcon />} style={{ color: "var(--violet)" }}>📋</Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(p)} icon={<TrashIcon />}>🗑️</Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE STOCK
   ═══════════════════════════════════════════════════════════ */
export default function Stock() {
  const { currentCompany, success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
  const isMobile = useIsMobile();
  const router = useRouter();

  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [editMode, setEditMode] = useState(false);

  const [filter, setFilter] = useState("");
  const [categorieFilter, setCategorieFilter] = useState("");

  const [form, setForm] = useState({ nom: "", reference: "", categorie: "", prix_achat: 0, prix_vente: 0, quantite_stock: 0, stock_minimum: 0, unite: "pièce" });
  const [movementForm, setMovementForm] = useState({ type: "entree", quantite: 0, notes: "" });

  const uniteOptions = UNITES;

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [pd, cd] = await Promise.all([fetchProduits(), fetchCategories()]);
      setProduits(pd); setCategories(cd);
    } catch { toastError("Erreur lors du chargement des produits"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (currentCompany) loadData(); }, [currentCompany]);
  useEffect(() => {
    const handler = (e: Event) => { if (["produits", "mouvements_stock"].includes((e as CustomEvent)?.detail?.table)) loadData(); };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, []);

  const loadMouvements = async (produitId: string) => {
    if (!currentCompany) return;
    try {
      const { data, error } = await getSupabase().from("mouvements_stock").select("*, produit:produits(id,nom)").eq("produit_id", produitId).eq("company_id", currentCompany.id).order("date_mouvement", { ascending: false }).limit(50);
      if (error) throw error;
      setMouvements(data || []);
    } catch { toastError("Erreur lors du chargement de l'historique"); }
  };

  const resetForm = () => { setForm({ nom: "", reference: "", categorie: "", prix_achat: 0, prix_vente: 0, quantite_stock: 0, stock_minimum: 0, unite: "pièce" }); setEditMode(false); setSelectedProduit(null); };
  const resetMovForm = () => { setMovementForm({ type: "entree", quantite: 0, notes: "" }); setSelectedProduit(null); };

  const handleSubmit = async () => {
    if (!form.nom.trim()) { toastWarn("Nom du produit requis"); return; }
    setSaving(true);
    try {
      if (editMode && selectedProduit) { await updateProduit(selectedProduit.id, form); toastSuccess("Produit modifié"); }
      else { await createProduit(form); toastSuccess("Produit créé"); }
      setShowModal(false); resetForm(); loadData();
    } catch { toastError("Erreur lors de la sauvegarde"); }
    finally { setSaving(false); }
  };

  const handleMovement = async () => {
    if (!selectedProduit) return;
    if (movementForm.quantite <= 0) { toastWarn("Quantité > 0 requise"); return; }
    const newQty = movementForm.type === "entree" ? (selectedProduit.quantite_stock ?? 0) + movementForm.quantite : (selectedProduit.quantite_stock ?? 0) - movementForm.quantite;
    if (newQty < 0) { toastWarn("Stock insuffisant"); return; }
    setSaving(true);
    try {
      await updateStock(selectedProduit.id, newQty, movementForm.notes || movementForm.type);
      toastSuccess(movementForm.type === "entree" ? `+${movementForm.quantite} ajouté` : `-${movementForm.quantite} sorti`);
      setShowMovementModal(false); resetMovForm(); loadData();
    } catch { toastError("Erreur lors du mouvement"); }
    finally { setSaving(false); }
  };

  const handleDeleteProduit = (produit: Produit) => {
    if ((produit.quantite_stock ?? 0) > 0) { toastWarn(`Impossible : "${produit.nom}" a encore ${produit.quantite_stock} unité(s)`); return; }
    setShowDeleteModal(produit.id);
  };

  const executeDelete = async () => {
    if (!showDeleteModal) return;
    const produit = produits.find((p) => p.id === showDeleteModal);
    if (!produit) return;
    setShowDeleteModal(null);
    try { await deleteProduit(produit.id); toastSuccess(`"${produit.nom}" supprimé`); loadData(); }
    catch { toastError("Erreur lors de la suppression"); }
  };

  const editProduit = (produit: Produit) => {
    setSelectedProduit(produit);
    setForm({ nom: produit.nom, reference: produit.reference || "", categorie: produit.categorie || "", prix_achat: produit.prix_achat ?? 0, prix_vente: produit.prix_vente ?? 0, quantite_stock: produit.quantite_stock ?? 0, stock_minimum: produit.stock_minimum ?? 0, unite: produit.unite ?? "pièce" });
    setEditMode(true); setShowModal(true);
  };

  const handleViewHistory = async (produit: Produit) => { setSelectedProduit(produit); await loadMouvements(produit.id); setShowHistoryModal(true); };

  const filtered = useMemo(() => {
    return produits.filter((p) => {
      if (filter && !p.nom.toLowerCase().includes(filter.toLowerCase()) && !(p.reference || "").toLowerCase().includes(filter.toLowerCase())) return false;
      if (categorieFilter && p.categorie !== categorieFilter) return false;
      return true;
    });
  }, [produits, filter, categorieFilter]);

  const stats = useMemo(() => ({
    total: produits.length,
    low: produits.filter((p) => (p.quantite_stock ?? 0) > 0 && (p.quantite_stock ?? 0) <= (p.stock_minimum ?? 0)).length,
    out: produits.filter((p) => p.quantite_stock === 0).length,
    valeur: produits.reduce((s, p) => s + (Number(p.prix_achat) || 0) * (p.quantite_stock || 0), 0),
  }), [produits]);

  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c, label: c })), [categories]);

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2" style={{ borderColor: "var(--border-default)", borderTopColor: "var(--info)" }} />
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>Chargement du stock...</span>
    </div>
  );

  return (
    <div className="pb-8">
      {/* ═══════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════ */}
      <div className="relative mb-6 overflow-hidden rounded-2xl p-5" style={{ ...sectionStyle(0), background: "linear-gradient(135deg, rgba(96,165,250,0.06) 0%, rgba(139,92,246,0.03) 100%)", border: "1px solid rgba(96,165,250,0.08)" }}>
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(96,165,250,0.05)" }} />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shrink-0" style={{ border: "2px solid rgba(96,165,250,0.2)", background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))", boxShadow: "0 0 20px rgba(96,165,250,0.06)" }}>
              <Image src="/logo.png" alt="HT-GesCom" width={32} height={32} priority className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>Stock</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{currentCompany?.name} · {produits.length} produit{produits.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push("/commerce/rapports")} className="btn-press">← Rapports</Button>
            <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }} className="btn-press shadow-gold" icon={<PlusIcon />}>Nouveau produit</Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STATS
          ═══════════════════════════════════════════════════════ */}
      <div className={`grid gap-3 mb-5 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`} style={sectionStyle(0.1)}>
        <StatCard label="Total produits" value={stats.total} color="info" icon={<BoxIcon size={18} />} />
        <StatCard label="Stock bas" value={stats.low} color="warning" icon={<AlertIcon size={18} />} />
        <StatCard label="Rupture" value={stats.out} color="danger" icon={<BanIcon size={18} />} />
        <StatCard label="Valeur stock" value={formatAr(stats.valeur)} color="accent" icon={<CashIcon size={18} />} />
      </div>

      {/* ═══════════════════════════════════════════════════════
          FILTRES
          ═══════════════════════════════════════════════════════ */}
      <div className="mb-5 rounded-xl p-4" style={{ ...sectionStyle(0.15), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(96,165,250,0.08)", color: "var(--info)" }}>
            <FilterIcon />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Filtres</span>
        </div>
        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-[1fr_auto_auto]"}`}>
          <Input placeholder="Rechercher un produit..." value={filter} onChange={(e) => setFilter(e.target.value)} />
          <Select placeholder="Toutes catégories" value={categorieFilter} onChange={(e) => setCategorieFilter(e.target.value)} options={[{ value: "", label: "Toutes" }, ...categoryOptions]} />
          {(filter || categorieFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilter(""); setCategorieFilter(""); }} className="btn-press h-[38px]">✕ Effacer</Button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          LISTE PRODUITS
          ═══════════════════════════════════════════════════════ */}
      {isMobile ? (
        <div className="flex flex-col gap-3" style={sectionStyle(0.2)}>
          {filtered.length === 0 ? (
            <div className="rounded-2xl py-14 text-center" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
              <div className="text-4xl mb-3">📦</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                {produits.length === 0 ? 'Aucun produit enregistré. Cliquez sur "Nouveau produit" pour commencer.' : "Aucun produit ne correspond à votre recherche."}
              </div>
            </div>
          ) : filtered.map((p, idx) => (
            <div key={p.id} style={{ ...sectionStyle(0.25 + idx * 0.03) }}>
              <ProduitCard p={p} onEdit={editProduit} onMovement={(pr) => { setSelectedProduit(pr); setShowMovementModal(true); }} onHistory={handleViewHistory} onDelete={handleDeleteProduit} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ ...sectionStyle(0.2), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Produit</TableHeader>
                <TableHeader>Catégorie</TableHeader>
                <TableHeader align="right">Prix achat</TableHeader>
                <TableHeader align="right">Prix vente</TableHeader>
                <TableHeader align="right">Stock</TableHeader>
                <TableHeader align="center">Statut</TableHeader>
                <TableHeader align="center">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableEmpty colSpan={7} message={produits.length === 0 ? "Aucun produit enregistré" : "Aucun résultat"} />
              ) : filtered.map((p) => {
                const st = getStatus(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{p.nom}</div>
                      {p.reference && <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Réf: {p.reference}</div>}
                    </TableCell>
                    <TableCell>{p.categorie ? <Badge variant="purple" size="sm">{p.categorie}</Badge> : "—"}</TableCell>
                    <TableCell align="right" className="font-semibold"><span style={{ color: "var(--warning)" }}>{formatAr(p.prix_achat)}</span></TableCell>
                    <TableCell align="right" className="font-semibold"><span style={{ color: "var(--success)" }}>{formatAr(p.prix_vente)}</span></TableCell>
                    <TableCell align="right" className="font-bold"><span style={{ color: st.color }}>{p.quantite_stock} {p.unite || ""}</span></TableCell>
                    <TableCell align="center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex gap-1 justify-center">
                        <Button variant="secondary" size="sm" onClick={() => editProduit(p)} icon={<EditIcon />}>✏️</Button>
                        <Button variant="primary" size="sm" onClick={() => { setSelectedProduit(p); setShowMovementModal(true); }} icon={<InIcon />}>📦</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleViewHistory(p)} icon={<HistoryIcon />} style={{ color: "var(--violet)" }}>📋</Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteProduit(p)} icon={<TrashIcon />}>🗑️</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAL CRÉER/ÉDIT PRODUIT
          ═══════════════════════════════════════════════════════ */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} width={isMobile ? 480 : 600}>
        <ModalHeader title={editMode ? "Modifier le produit" : "Nouveau produit"} onClose={() => { setShowModal(false); resetForm(); }} />
        <ModalBody>
          <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <Input label="Nom du produit *" placeholder="Ex: iPhone 15" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            <Input label="Référence" placeholder="Ex: IP15-128" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            <Input label="Catégorie" placeholder="Ex: Téléphones" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} />
            <Select label="Unité" value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })} options={uniteOptions} />
            <Input type="number" label="Prix d'achat (Ar)" value={String(form.prix_achat)} onChange={(e) => setForm({ ...form, prix_achat: parseFloat(e.target.value) || 0 })} />
            <Input type="number" label="Prix de vente (Ar)" value={String(form.prix_vente)} onChange={(e) => setForm({ ...form, prix_vente: parseFloat(e.target.value) || 0 })} />
            <Input type="number" label="Stock initial" value={String(form.quantite_stock)} onChange={(e) => setForm({ ...form, quantite_stock: parseInt(e.target.value) || 0 })} />
            <Input type="number" label="Stock minimum" value={String(form.stock_minimum)} onChange={(e) => setForm({ ...form, stock_minimum: parseInt(e.target.value) || 0 })} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }} className="btn-press">Annuler</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={saving} className="btn-press shadow-gold">{editMode ? "Modifier" : "Créer"}</Button>
        </ModalFooter>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          MODAL MOUVEMENT STOCK
          ═══════════════════════════════════════════════════════ */}
      <Modal open={showMovementModal} onClose={() => { setShowMovementModal(false); resetMovForm(); }}>
        <ModalHeader title="Mouvement de stock" onClose={() => { setShowMovementModal(false); resetMovForm(); }} />
        <ModalBody>
          {selectedProduit && (
            <>
              <div className="p-3 rounded-xl mb-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{selectedProduit.nom}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>Stock actuel : {selectedProduit.quantite_stock} {selectedProduit.unite || ""}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Type" value={movementForm.type} onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })} options={[{ value: "entree", label: "📥 Entrée" }, { value: "sortie", label: "📤 Sortie" }]} />
                <Input type="number" label="Quantité" value={String(movementForm.quantite)} onChange={(e) => setMovementForm({ ...movementForm, quantite: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="mt-3">
                <Input label="Notes (optionnel)" placeholder="Ex: Inventaire, Casse..." value={movementForm.notes} onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })} />
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowMovementModal(false); resetMovForm(); }} className="btn-press">Annuler</Button>
          <Button variant="primary" onClick={handleMovement} loading={saving} disabled={saving} className="btn-press">Enregistrer</Button>
        </ModalFooter>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          MODAL HISTORIQUE
          ═══════════════════════════════════════════════════════ */}
      <Modal open={showHistoryModal} onClose={() => setShowHistoryModal(false)} width={isMobile ? 480 : 500}>
        <ModalHeader title="Historique des mouvements" onClose={() => setShowHistoryModal(false)} />
        <ModalBody>
          {selectedProduit && (
            <div className="p-3 rounded-xl mb-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{selectedProduit.nom}</div>
            </div>
          )}
          {mouvements.length === 0 ? (
            <div className="text-center p-5 text-sm" style={{ color: "var(--text-muted)" }}>Aucun mouvement</div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-1 rounded-xl p-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              {mouvements.map((m) => (
                <div key={m.id} className="flex justify-between items-center py-2.5 px-3 rounded-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: m.type === "entree" ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)", color: m.type === "entree" ? "var(--success)" : "var(--danger)" }}>
                      {m.type === "entree" ? "ENTRÉE" : "SORTIE"}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>×{m.quantite}</span>
                    {m.notes && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>· {m.notes}</span>}
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{m.date_mouvement ? new Date(m.date_mouvement).toLocaleDateString("fr-FR") : ""}</span>
                </div>
              ))}
            </div>
          )}
        </ModalBody>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          MODAL SUPPRESSION
          ═══════════════════════════════════════════════════════ */}
      <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)}>
        <ModalHeader title="Supprimer le produit ?" onClose={() => setShowDeleteModal(null)} />
        <ModalBody>
          <p className="text-[13px] text-center" style={{ color: "var(--text-secondary)" }}>Cette action est irréversible. Le produit sera supprimé définitivement.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteModal(null)} className="btn-press">Annuler</Button>
          <Button variant="danger" onClick={executeDelete} loading={saving} className="btn-press">Supprimer</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
