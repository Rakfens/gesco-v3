"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { logger } from "@/lib/logger";
import {
  Badge, Button, Card, CardTitle, ConfirmDialog, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  Select, SkeletonTable, StatCard, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Achat, Produit } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { createAchat, deleteAchat, fetchAchats, updateAchat } from "../services/achatService";
import { fetchProduits } from "../services/produitService";

/* ─── SVG Icons ─── */
const CartIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);


interface PanierItem {
  produit_id: string; nom: string; quantite: number; prix_unitaire: number; sous_total: number;
}

export default function Achats() {
  const { currentCompany, success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
  const isMobile = useIsMobile();

  const [achats, setAchats] = useState<Achat[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedAchat, setSelectedAchat] = useState<Achat | null>(null);
  const [panier, setPanier] = useState<PanierItem[]>([]);
  const [searchProduit, setSearchProduit] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [fournisseursConnus, setFournisseursConnus] = useState<string[]>([]);
  const [form, setForm] = useState({
    fournisseur_nom: "", fournisseur_contact: "", tva: 0, montant_paye: 0,
    date_achat: new Date().toISOString().split("T")[0],
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [achatsData, produitsData] = await Promise.all([fetchAchats(), fetchProduits()]);
      setAchats(achatsData); setProduits(produitsData);
      const fournisseurs = [...new Set(achatsData.map((a) => a.fournisseur_nom).filter(Boolean) as string[])];
      setFournisseursConnus(fournisseurs);
    } catch (e: unknown) { logger.error("Erreur chargement:", e); toastError("Erreur chargement"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const handler = (e: Event) => { if (["achats", "achat_details"].includes((e as CustomEvent)?.detail?.table)) loadData(); };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, []);

  const addToCart = (produit: Produit) => {
    const existing = panier.find((p) => p.produit_id === produit.id);
    if (existing) {
      setPanier(panier.map((p) => p.produit_id === produit.id ? { ...p, quantite: p.quantite + 1, sous_total: (p.quantite + 1) * p.prix_unitaire } : p));
    } else {
      setPanier([...panier, { produit_id: produit.id, nom: produit.nom, quantite: 1, prix_unitaire: produit.prix_achat || 0, sous_total: produit.prix_achat || 0 }]);
    }
  };

  const updateCartQty = (id: string, qty: number) => {
    if (qty <= 0) { setPanier(panier.filter((p) => p.produit_id !== id)); return; }
    setPanier(panier.map((p) => p.produit_id === id ? { ...p, quantite: qty, sous_total: qty * p.prix_unitaire } : p));
  };

  const updateCartPrice = (id: string, price: number) => {
    setPanier(panier.map((p) => p.produit_id === id ? { ...p, prix_unitaire: price, sous_total: p.quantite * price } : p));
  };

  const resetForm = () => {
    setEditMode(false); setSelectedAchat(null); setPanier([]); setSearchProduit("");
    setForm({ fournisseur_nom: "", fournisseur_contact: "", tva: 0, montant_paye: 0, date_achat: new Date().toISOString().split("T")[0] });
  };

  const handleSubmit = async () => {
    if (panier.length === 0) { toastWarn("Ajoutez au moins un produit"); return; }
    if (!form.fournisseur_nom.trim()) { toastWarn("Fournisseur requis"); return; }
    const details = panier.map((p) => ({ produit_id: p.produit_id, quantite: p.quantite, prix_unitaire: p.prix_unitaire, sous_total: p.sous_total }));
    setSaving(true);
    try {
      if (editMode && selectedAchat) { await updateAchat(selectedAchat.id, form, details); toastSuccess("Achat modifié"); }
      else { await createAchat(form, details); toastSuccess("Achat enregistré, stock mis à jour"); }
      setShowModal(false); resetForm(); loadData();
    } catch (e: unknown) { logger.error("Erreur:", e); toastError(`Erreur : ${e instanceof Error ? e.message : "Impossible"}`); }
    finally { setSaving(false); }
  };

  const handleEditAchat = (achat: Achat) => {
    setEditMode(true); setSelectedAchat(achat);
    setForm({ fournisseur_nom: achat.fournisseur_nom || "", fournisseur_contact: achat.fournisseur_contact || "", tva: achat.tva || 0, montant_paye: achat.montant_paye || 0, date_achat: achat.date_achat?.split("T")[0] || new Date().toISOString().split("T")[0] });
    if (achat.details) setPanier(achat.details.map((d) => ({ produit_id: d.produit_id ?? "", nom: d.produit?.nom ?? "Produit", quantite: d.quantite ?? 0, prix_unitaire: d.prix_unitaire ?? 0, sous_total: d.sous_total ?? 0 })));
    setShowModal(true);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete; setConfirmDelete(null);
    try { await deleteAchat(id); toastSuccess("Achat supprimé, stock ajusté"); loadData(); }
    catch { toastError("Erreur suppression"); }
  };

  const produitsFiltres = useMemo(() => {
    if (!searchProduit) return produits;
    const q = searchProduit.toLowerCase();
    return produits.filter((p) => p.nom.toLowerCase().includes(q) || (p.reference || "").toLowerCase().includes(q));
  }, [produits, searchProduit]);

  const totalPanier = panier.reduce((s, p) => s + p.sous_total, 0);
  const totalAvecTVA = totalPanier + (Number(form.tva) || 0);

  const totalGeneral = useMemo(() => achats.reduce((s, a) => s + (a.montant_total || 0), 0), [achats]);
  const totalPaye = useMemo(() => achats.reduce((s, a) => s + (a.montant_paye || 0), 0), [achats]);
  const totalSolde = useMemo(() => achats.reduce((s, a) => s + Math.max(0, (a.montant_total || 0) - (a.montant_paye || 0)), 0), [achats]);

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  if (loading) return <SkeletonTable rows={6} />;

  return (
    <div className="pb-8">
      {/* ══ MODALS ══ */}
      <ConfirmDialog open={!!confirmDelete} title="Supprimer cet achat ?" message="Cette action est irréversible. Le stock sera ajusté." onConfirm={executeDelete} onCancel={() => setConfirmDelete(null)} variant="danger" />

      {/* ═══════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════ */}
      <div className="relative mb-6 overflow-hidden rounded-2xl p-5" style={{ ...sectionStyle(0), background: "linear-gradient(135deg, rgba(201,169,110,0.06) 0%, rgba(139,92,246,0.03) 100%)", border: "1px solid rgba(201,169,110,0.08)" }}>
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(201,169,110,0.05)" }} />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shrink-0" style={{ border: "2px solid rgba(201,169,110,0.2)", background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))", boxShadow: "0 0 20px rgba(201,169,110,0.06)" }}>
              <Image src="/logo.png" alt="HT-GesCom" width={32} height={32} priority className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>Achats</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{currentCompany?.name} · {achats.length} commande{achats.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }} icon={<PlusIcon />}>Nouvel achat</Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STATS
          ═══════════════════════════════════════════════════════ */}
      {achats.length > 0 && (
        <div className={`grid gap-3 mb-5 ${isMobile ? "grid-cols-2" : "grid-cols-3"}`} style={sectionStyle(0.1)}>
          <StatCard label="Total général" value={formatAr(totalGeneral)} color="accent" icon={<CartIcon size={18} />} />
          <StatCard label="Total payé" value={formatAr(totalPaye)} color="success" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <StatCard label="Solde restant" value={formatAr(totalSolde)} color="danger" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          LISTE DES ACHATS
          ═══════════════════════════════════════════════════════ */}
      {isMobile ? (
        <div className="flex flex-col gap-3" style={sectionStyle(0.15)}>
          {achats.length === 0 ? (
            <div className="rounded-2xl py-14 text-center" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
              <div className="text-4xl mb-3">🛒</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>Aucun achat enregistré.</div>
            </div>
          ) : (
            achats.map((a, idx) => {
              const solde = (a.montant_total || 0) - (a.montant_paye || 0);
              return (
                <div key={a.id} className="rounded-2xl overflow-hidden transition-all duration-200" style={{ ...sectionStyle(0.2 + idx * 0.03), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{a.numero_commande || "—"}</div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{a.fournisseur_nom || "—"} · {a.date_achat ? new Date(a.date_achat).toLocaleDateString("fr-FR") : "—"}</div>
                      </div>
                      <Badge variant={solde > 0 ? "warning" : "success"} size="sm">{solde > 0 ? "Crédit" : "Soldé"}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { l: "TOTAL", v: formatAr(a.montant_total) },
                        { l: "PAYÉ", v: formatAr(a.montant_paye) },
                        { l: "SOLDE", v: solde > 0 ? formatAr(solde) : "Payé" },
                      ].map((r) => (
                        <div key={r.l} className="rounded-lg py-2 px-2 text-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                          <div className="text-[9px] mb-0.5" style={{ color: "var(--text-muted)" }}>{r.l}</div>
                          <div className="text-xs font-bold" style={{ color: r.l === "PAYÉ" ? "var(--success)" : r.l === "SOLDE" && solde > 0 ? "var(--danger)" : "var(--text-primary)" }}>{r.v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleEditAchat(a)}>✏️ Modifier</Button>
                      <Button variant="danger" size="sm" onClick={() => setConfirmDelete(a.id)}>🗑️ Supprimer</Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {achats.length > 0 && (
            <div className="rounded-xl p-3 flex justify-between items-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
              <span className="font-bold text-xs" style={{ color: "var(--text-primary)" }}>TOTAL GÉNÉRAL</span>
              <div className="flex gap-3">
                <span className="font-extrabold text-sm" style={{ color: "var(--gold)" }}>{formatAr(totalGeneral)}</span>
                <span className="font-bold text-xs" style={{ color: "var(--danger)" }}>Solde: {formatAr(totalSolde)}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ ...sectionStyle(0.15), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader className="col-md">Commande</TableHeader>
                <TableHeader className="col-lg">Fournisseur</TableHeader>
                <TableHeader className="col-sm">Date</TableHeader>
                <TableHeader align="right" className="col-sm">Montant</TableHeader>
                <TableHeader align="right" className="col-sm">Payé</TableHeader>
                <TableHeader align="right" className="col-sm">Solde</TableHeader>
                <TableHeader align="center" className="col-sm">Statut</TableHeader>
                <TableHeader align="center" className="col-md">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {achats.length === 0 ? (
                <TableEmpty colSpan={8} message="Aucun achat" />
              ) : achats.map((a) => {
                const solde = (a.montant_total || 0) - (a.montant_paye || 0);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="col-md font-semibold font-mono text-xs truncate whitespace-nowrap"><span style={{ color: "var(--text-primary)" }}>{a.numero_commande || "—"}</span></TableCell>
                    <TableCell className="col-lg truncate whitespace-nowrap"><span style={{ color: "var(--text-primary)" }}>{a.fournisseur_nom || "—"}</span></TableCell>
                    <TableCell className="col-sm text-xs"><span style={{ color: "var(--text-muted)" }}>{a.date_achat ? new Date(a.date_achat).toLocaleDateString("fr-FR") : "—"}</span></TableCell>
                    <TableCell align="right" className="col-sm font-semibold"><span style={{ color: "var(--gold)" }}>{formatAr(a.montant_total)}</span></TableCell>
                    <TableCell align="right" className="col-sm"><span style={{ color: "var(--success)" }}>{formatAr(a.montant_paye)}</span></TableCell>
                    <TableCell align="right" className="col-sm font-semibold"><span style={{ color: solde > 0 ? "var(--danger)" : "var(--success)" }}>{solde > 0 ? formatAr(solde) : "Payé"}</span></TableCell>
                    <TableCell align="center" className="col-sm"><Badge variant={solde > 0 ? "warning" : "success"} size="sm">{solde > 0 ? "Crédit" : "Soldé"}</Badge></TableCell>
                    <TableCell align="center" className="col-md">
                      <div className="flex gap-1 justify-center">
                        <Button variant="secondary" size="sm" onClick={() => handleEditAchat(a)}>✏️</Button>
                        <Button variant="danger" size="sm" onClick={() => setConfirmDelete(a.id)}>🗑️</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {achats.length > 0 && (
            <div className="py-3 px-5 flex justify-between flex-wrap gap-2" style={{ background: "var(--bg-secondary)", borderTop: "2px solid var(--border-active)" }}>
              <span className="font-bold text-xs" style={{ color: "var(--text-primary)" }}>TOTAL GÉNÉRAL</span>
              <div className="flex gap-4">
                <span className="font-extrabold" style={{ color: "var(--gold)" }}>{formatAr(totalGeneral)}</span>
                <span className="font-bold" style={{ color: "var(--success)" }}>Payé: {formatAr(totalPaye)}</span>
                <span className="font-bold" style={{ color: "var(--danger)" }}>Solde: {formatAr(totalSolde)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAL NOUVEL/ÉDITION ACHAT
          ═══════════════════════════════════════════════════════ */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} width={isMobile ? 480 : 900}>
        <ModalHeader title={editMode ? "Modifier l'achat" : "Nouvel achat"} onClose={() => { setShowModal(false); resetForm(); }} />
        <ModalBody>
          <div className={isMobile ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
            {/* Colonne gauche : Produits */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "rgba(201,169,110,0.1)", color: "var(--gold)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Produits</span>
              </div>
              <Input placeholder="Rechercher un produit..." value={searchProduit} onChange={(e) => setSearchProduit(e.target.value)} className="mb-2" />
              <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1 rounded-xl p-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                {produitsFiltres.map((p) => (
                  <button key={p.id} onClick={() => addToCart(p)} className="flex items-center justify-between py-2.5 px-3 rounded-lg text-left text-xs btn-press transition-all" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                    <div>
                      <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{p.nom}</div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Stock: {p.quantite_stock} · {formatAr(p.prix_achat)}</div>
                    </div>
                    <span className="text-base" style={{ color: "var(--success)" }}>＋</span>
                  </button>
                ))}
                {produitsFiltres.length === 0 && <div className="text-center p-4 text-xs" style={{ color: "var(--text-muted)" }}>Aucun produit trouvé</div>}
              </div>
            </div>

            {/* Colonne droite : Panier + Formulaire */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "rgba(201,169,110,0.1)", color: "var(--gold)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Panier ({panier.length})</span>
              </div>
              <div className="max-h-[200px] overflow-y-auto mb-3 rounded-xl p-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                {panier.length === 0 ? (
                  <div className="text-center p-5 text-xs" style={{ color: "var(--text-muted)" }}>Panier vide</div>
                ) : panier.map((p) => (
                  <div key={p.produit_id} className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[11px] truncate" style={{ color: "var(--text-primary)" }}>{p.nom}</div>
                    </div>
                    <input type="number" min={1} value={p.quantite} onChange={(e) => updateCartQty(p.produit_id, parseInt(e.target.value) || 0)} className="w-[50px] py-1 px-1.5 rounded-md text-[11px] text-center outline-none" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
                    <input type="number" value={p.prix_unitaire} onChange={(e) => updateCartPrice(p.produit_id, parseFloat(e.target.value) || 0)} className="w-[70px] py-1 px-1.5 rounded-md text-[11px] text-center outline-none" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
                    <span className="text-[11px] font-bold min-w-[60px] text-right" style={{ color: "var(--gold)" }}>{formatAr(p.sous_total)}</span>
                    <button onClick={() => updateCartQty(p.produit_id, 0)} className="w-6 h-6 rounded-md flex items-center justify-center text-xs btn-press" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)", color: "var(--danger)" }}>✕</button>
                  </div>
                ))}
              </div>

              {/* Totaux */}
              {panier.length > 0 && (
                <div className="py-3 px-3 rounded-xl mb-3 space-y-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "var(--text-muted)" }}>Sous-total</span>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{formatAr(totalPanier)}</span>
                  </div>
                  {form.tva > 0 && (
                    <div className="flex justify-between text-[11px]">
                      <span style={{ color: "var(--text-muted)" }}>TVA</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{formatAr(form.tva)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-1" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <span className="font-bold" style={{ color: "var(--text-primary)" }}>TOTAL</span>
                    <span className="font-extrabold text-base" style={{ color: "var(--gold)" }}>{formatAr(totalAvecTVA)}</span>
                  </div>
                </div>
              )}

              {/* Formulaire */}
              <div className="grid grid-cols-2 gap-2">
                <Input label="Fournisseur *" placeholder="Nom du fournisseur" value={form.fournisseur_nom} onChange={(e) => setForm({ ...form, fournisseur_nom: e.target.value })} list="fournisseurs-list" />
                <datalist id="fournisseurs-list">
                  {fournisseursConnus.map((f) => <option key={f} value={f} />)}
                </datalist>
                <Input label="Contact" placeholder="Tél / Email" value={form.fournisseur_contact} onChange={(e) => setForm({ ...form, fournisseur_contact: e.target.value })} />
                <Input type="date" label="Date" value={form.date_achat} onChange={(e) => setForm({ ...form, date_achat: e.target.value })} />
                <Input type="number" label="TVA (Ar)" value={String(form.tva)} onChange={(e) => setForm({ ...form, tva: parseFloat(e.target.value) || 0 })} />
                <Input type="number" label="Payé (Ar)" value={String(form.montant_paye)} onChange={(e) => setForm({ ...form, montant_paye: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={saving || panier.length === 0}>
            {editMode ? "Modifier" : "Enregistrer"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
