"use client";

import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Badge, Button, Card, CardHeader, CardTitle, ConfirmDialog, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  Select, SkeletonTable, StatCard, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Achat, Produit } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { createAchat, deleteAchat, fetchAchats, updateAchat } from "../services/achatService";
import { fetchProduits } from "../services/produitService";

const Icon = ({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
  <path d={d} />
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
    fournisseur_nom: "", fournisseur_contact: "", tva: 0, montant_paye: 0, date_achat: new Date().toISOString().split("T")[0],
  });

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

  const resetForm = () => { setEditMode(false); setSelectedAchat(null); setPanier([]); setSearchProduit(""); setForm({ fournisseur_nom: "", fournisseur_contact: "", tva: 0, montant_paye: 0, date_achat: new Date().toISOString().split("T")[0] }); };

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

  if (loading) return <SkeletonTable rows={6} />;

  return (
    <div className="pb-6 transition-all duration-500 ease-out">
    {/* ══ MODALS ══ */}
    <ConfirmDialog open={!!confirmDelete} title="Supprimer cet achat ?" message="Cette action est irréversible. Le stock sera ajusté." onConfirm={executeDelete} onCancel={() => setConfirmDelete(null)} variant="danger" />

    {/* ══ HEADER ══ */}
    <div className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
    <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-[10px] bg-orange-400/10 flex items-center justify-center">
    <Icon d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" size={18} className="text-orange-400" />
    </div>
    <div>
    <h1 className={`font-extrabold m-0 ${isMobile ? "text-xl" : "text-2xl"}`}>Achats</h1>
    <p className="text-xs text-zinc-500 mt-0.5">{currentCompany?.name} · {achats.length} commande(s)</p>
    </div>
    </div>
    <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }}>＋ Nouvel achat</Button>
    </div>

    {/* ══ STATS ══ */}
    {achats.length > 0 && (
      <div className={isMobile ? "grid grid-cols-2 gap-2.5 mb-4" : "grid grid-cols-3 gap-2.5 mb-4"}>
      <StatCard label="Total général" value={formatAr(totalGeneral)} color="orange" icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} className="text-orange-400" />} />
      <StatCard label="Total payé" value={formatAr(totalPaye)} color="emerald" icon={<Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={18} className="text-emerald-400" />} />
      <StatCard label="Solde restant" value={formatAr(totalSolde)} color="red" icon={<Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={18} className="text-red-400" />} />
      </div>
    )}

    {/* ══ LISTE DES ACHATS ══ */}
    {isMobile ? (
      <div className="flex flex-col gap-2.5">
      {achats.length === 0 ? (
        <Card padding={40}>
        <div className="text-center text-zinc-500 text-[13px]">
        <div className="text-[32px] mb-2">🛒</div>
        Aucun achat enregistré.
        </div>
        </Card>
      ) : (
        achats.map((a) => {
          const solde = (a.montant_total || 0) - (a.montant_paye || 0);
          return (
            <Card key={a.id} padding={14}>
            <div className="flex items-center justify-between mb-2">
            <div>
            <div className="font-bold text-[13px] text-white">{a.numero_commande || "—"}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{a.fournisseur_nom || "—"} · {a.date_achat ? new Date(a.date_achat).toLocaleDateString("fr-FR") : "—"}</div>
            </div>
            <Badge variant={solde > 0 ? "warning" : "success"} size="sm">{solde > 0 ? "Crédit" : "Soldé"}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
            {[
              { l: "TOTAL", v: formatAr(a.montant_total), color: "text-orange-400" },
                  { l: "PAYÉ", v: formatAr(a.montant_paye), color: "text-emerald-400" },
                  { l: "SOLDE", v: solde > 0 ? formatAr(solde) : "Payé", color: solde > 0 ? "text-red-400" : "text-emerald-400" },
            ].map((r) => (
              <div key={r.l} className="bg-[#0a0a0f] rounded-lg py-1.5 px-2 text-center">
              <div className="text-[9px] text-zinc-500 mb-0.5">{r.l}</div>
              <div className={`text-xs font-bold ${r.color}`}>{r.v}</div>
              </div>
            ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => handleEditAchat(a)}>✏️ Modifier</Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(a.id)}>🗑️ Supprimer</Button>
            </div>
            </Card>
          );
        })
      )}
      {achats.length > 0 && (
        <Card padding={12}>
        <div className="flex justify-between items-center">
        <span className="font-bold text-xs">TOTAL GÉNÉRAL</span>
        <div className="flex gap-3">
        <span className="text-orange-400 font-extrabold text-[13px]">{formatAr(totalGeneral)}</span>
        <span className="text-red-400 font-bold text-xs">Solde: {formatAr(totalSolde)}</span>
        </div>
        </div>
        </Card>
      )}
      </div>
    ) : (
      <Card padding={0} className="overflow-hidden">
      <Table>
      <TableHead>
      <TableRow>
      <TableHeader>Commande</TableHeader>
      <TableHeader>Fournisseur</TableHeader>
      <TableHeader>Date</TableHeader>
      <TableHeader align="right">Montant</TableHeader>
      <TableHeader align="right">Payé</TableHeader>
      <TableHeader align="right">Solde</TableHeader>
      <TableHeader align="center">Statut</TableHeader>
      <TableHeader align="center">Actions</TableHeader>
      </TableRow>
      </TableHead>
      <TableBody>
      {achats.length === 0 ? (
        <TableEmpty colSpan={8} message="Aucun achat" />
      ) : (
        achats.map((a) => {
          const solde = (a.montant_total || 0) - (a.montant_paye || 0);
          return (
            <TableRow key={a.id}>
            <TableCell className="font-semibold font-mono text-xs">{a.numero_commande || "—"}</TableCell>
            <TableCell>{a.fournisseur_nom || "—"}</TableCell>
            <TableCell className="text-zinc-500 text-[11px]">{a.date_achat ? new Date(a.date_achat).toLocaleDateString("fr-FR") : "—"}</TableCell>
            <TableCell align="right" className="font-semibold text-orange-400">{formatAr(a.montant_total)}</TableCell>
            <TableCell align="right" className="text-emerald-400">{formatAr(a.montant_paye)}</TableCell>
            <TableCell align="right" className={`font-semibold ${solde > 0 ? "text-red-400" : "text-emerald-400"}`}>{solde > 0 ? formatAr(solde) : "Payé"}</TableCell>
            <TableCell align="center"><Badge variant={solde > 0 ? "warning" : "success"} size="sm">{solde > 0 ? "Crédit" : "Soldé"}</Badge></TableCell>
            <TableCell align="center">
            <div className="flex gap-1 justify-center">
            <Button variant="secondary" size="sm" onClick={() => handleEditAchat(a)}>✏️</Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(a.id)}>🗑️</Button>
            </div>
            </TableCell>
            </TableRow>
          );
        })
      )}
      </TableBody>
      </Table>
      {achats.length > 0 && (
        <div className="py-3 px-4 bg-[#111114] border-t-2 border-[#1e1e24] flex justify-between flex-wrap gap-2">
        <span className="font-bold text-xs">TOTAL GÉNÉRAL</span>
        <div className="flex gap-4">
        <span className="text-orange-400 font-extrabold">{formatAr(totalGeneral)}</span>
        <span className="text-emerald-400 font-bold">Payé: {formatAr(totalPaye)}</span>
        <span className="text-red-400 font-bold">Solde: {formatAr(totalSolde)}</span>
        </div>
        </div>
      )}
      </Card>
    )}

    {/* ══ MODAL NOUVEL/ÉDITION ACHAT ══ */}
    <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} width={isMobile ? 480 : 900}>
    <ModalHeader title={editMode ? "Modifier l'achat" : "Nouvel achat"} onClose={() => { setShowModal(false); resetForm(); }} />
    <ModalBody>
    <div className={isMobile ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
    {/* Colonne gauche : Produits */}
    <div>
    <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">🛍️ Produits</div>
    <div className="mb-2">
    <Input placeholder="Rechercher un produit..." value={searchProduit} onChange={(e) => setSearchProduit(e.target.value)} />
    </div>
    <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1">
    {produitsFiltres.map((p) => (
      <button key={p.id} onClick={() => addToCart(p)}
      className="flex items-center justify-between py-2 px-2.5 rounded-lg border border-[#1e1e24] bg-[#0a0a0f] cursor-pointer text-left text-xs transition-colors hover:bg-[#16161a]">
      <div>
      <div className="font-semibold text-white">{p.nom}</div>
      <div className="text-[10px] text-zinc-500">Stock: {p.quantite_stock} · {formatAr(p.prix_achat)}</div>
      </div>
      <span className="text-base text-emerald-400">＋</span>
      </button>
    ))}
    {produitsFiltres.length === 0 && <div className="text-center text-zinc-500 p-4 text-xs">Aucun produit trouvé</div>}
    </div>
    </div>

    {/* Colonne droite : Panier + Formulaire */}
    <div>
    <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">🛒 Panier ({panier.length})</div>
    <div className="max-h-[200px] overflow-y-auto mb-3">
    {panier.length === 0 ? (
      <div className="text-center text-zinc-500 p-5 text-xs border border-dashed border-[#1e1e24] rounded-lg">Panier vide</div>
    ) : (
      panier.map((p) => (
        <div key={p.produit_id} className="flex items-center gap-1.5 py-1.5 border-b border-[#1e1e24]">
        <div className="flex-1 min-w-0">
        <div className="font-semibold text-[11px] text-white truncate">{p.nom}</div>
        </div>
        <input type="number" min={1} value={p.quantite} onChange={(e) => updateCartQty(p.produit_id, parseInt(e.target.value) || 0)}
        className="w-[50px] py-[3px] px-1.5 bg-[#111114] border border-[#1e1e24] rounded-md text-white text-[11px] text-center outline-none focus:border-amber-400" />
        <input type="number" value={p.prix_unitaire} onChange={(e) => updateCartPrice(p.produit_id, parseFloat(e.target.value) || 0)}
        className="w-[70px] py-[3px] px-1.5 bg-[#111114] border border-[#1e1e24] rounded-md text-white text-[11px] text-center outline-none focus:border-amber-400" />
        <span className="text-[11px] font-bold text-amber-400 min-w-[60px] text-right">{formatAr(p.sous_total)}</span>
        <button onClick={() => updateCartQty(p.produit_id, 0)} className="w-6 h-6 rounded-md bg-red-400/10 border border-red-400/20 text-red-400 cursor-pointer flex items-center justify-center text-xs hover:bg-red-400/20">✕</button>
        </div>
      ))
    )}
    </div>

    {/* Totaux */}
    {panier.length > 0 && (
      <div className="py-2 px-2.5 bg-[#0a0a0f] rounded-lg mb-3">
      <div className="flex justify-between text-[11px]">
      <span className="text-zinc-500">Sous-total</span>
      <span className="font-semibold">{formatAr(totalPanier)}</span>
      </div>
      {form.tva > 0 && (
        <div className="flex justify-between text-[11px] mt-0.5">
        <span className="text-zinc-500">TVA</span>
        <span className="font-semibold">{formatAr(form.tva)}</span>
        </div>
      )}
      <div className="flex justify-between text-[13px] mt-1 pt-1 border-t border-[#1e1e24]">
      <span className="font-bold">TOTAL</span>
      <span className="font-extrabold text-orange-400 text-base">{formatAr(totalAvecTVA)}</span>
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
