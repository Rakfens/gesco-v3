"use client";

import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Badge, Button, Card, CardHeader, CardTitle, ConfirmDialog, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  Select, SkeletonTable, StatCard, StatusBadge, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Pack, Produit, Vente } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { printTicketVente } from "../services/impressionService";
import { fetchProduits } from "../services/produitService";
import { fetchPacks, fetchPackWithProduits, isPackAvailable } from "../services/packService";
import type { VenteDetailItem } from "../services/venteService";
import { createVente, deleteVente, fetchVentes, fetchVenteWithDetails, updateVente } from "../services/venteService";

const Icon = ({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
  <path d={d} />
  </svg>
);

interface PanierItem {
  produit_id: string; nom: string; quantite: number; prix_unitaire: number; sous_total: number; stock_max?: number;
  is_pack?: boolean; pack_id?: string; pack_nom?: string;
}

interface VenteForm {
  client_nom: string; client_telephone: string; type_paiement: string; remise: number; montant_paye: number; date_vente: string;
}

const EMPTY_FORM: VenteForm = { client_nom: "", client_telephone: "", type_paiement: "especes", remise: 0, montant_paye: 0, date_vente: new Date().toISOString().split("T")[0] };
const PAIEMENT_OPTIONS = [{ value: "especes", label: "💵 Espèces" }, { value: "mobile_money", label: "📱 Mobile Money" }, { value: "carte", label: "💳 Carte" }];
type ModalTab = "produits" | "packs";

export default function Ventes() {
  const { currentCompany, success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
  const isMobile = useIsMobile();
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [panier, setPanier] = useState<PanierItem[]>([]);
  const [searchProduit, setSearchProduit] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [printPending, setPrintPending] = useState<string | null>(null);
  const [isAddingPack, setIsAddingPack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<VenteForm>(EMPTY_FORM);
  const [modalTab, setModalTab] = useState<ModalTab>("produits");
  const [packDisponible, setPackDisponible] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [v, p, pk] = await Promise.all([fetchVentes(), fetchProduits({ isActive: true }), fetchPacks()]);
      setVentes(v); setProduits(p); setPacks(pk);
      const dispo: Record<string, boolean> = {};
      for (const pack of pk) { dispo[pack.id] = await isPackAvailable(pack.id); }
      setPackDisponible(dispo);
    } catch (e: unknown) { logger.error("Erreur chargement:", e); toastError("Erreur lors du chargement"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const handler = (e: Event) => { if (["ventes", "vente_details", "produits"].includes((e as CustomEvent)?.detail?.table)) loadData(); };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, []);

  const addToCart = (produit: Produit) => {
    if ((produit.quantite_stock ?? 0) <= 0) { toastWarn(`"${produit.nom}" est en rupture de stock`); return; }
    const existing = panier.find((p) => p.produit_id === produit.id && !p.is_pack);
    if (existing) {
      if (existing.quantite >= (produit.quantite_stock ?? 0) && !editMode) { toastWarn(`Stock insuffisant (${produit.quantite_stock ?? 0})`); return; }
      setPanier(panier.map((p) => p.produit_id === produit.id && !p.is_pack ? { ...p, quantite: p.quantite + 1, sous_total: (p.quantite + 1) * p.prix_unitaire } : p));
    } else {
      setPanier([...panier, { produit_id: produit.id, nom: produit.nom, quantite: 1, prix_unitaire: produit.prix_vente || 0, sous_total: produit.prix_vente || 0, stock_max: produit.quantite_stock }]);
    }
  };

  const addPackToCart = async (pack: Pack) => {
    if (isAddingPack) { toastWarn("Veuillez patienter..."); return; }
    const dejaDansPanier = panier.some((p) => p.is_pack && p.pack_id === String(pack.id) && String(p.produit_id).startsWith("pack_"));
    if (dejaDansPanier) { toastWarn(`Le pack "${pack.nom}" est déjà dans le panier`); return; }
    setIsAddingPack(true);
    try {
      const packComplet = await fetchPackWithProduits(pack.id);
      if (!packComplet?.produits?.length) { toastWarn("Ce pack ne contient aucun produit"); return; }
      const produitsIndividuels: PanierItem[] = [];
      for (const pp of packComplet.produits) {
        const produit = pp.produit as Produit | undefined;
        if (!produit) { toastWarn(`Un produit du pack n'existe plus`); return; }
        if ((produit.quantite_stock ?? 0) < pp.quantite) { toastWarn(`Stock insuffisant pour "${produit.nom}"`); return; }
        produitsIndividuels.push({ produit_id: String(produit.id), nom: produit.nom, quantite: pp.quantite, prix_unitaire: 0, sous_total: 0, stock_max: produit.quantite_stock, is_pack: true, pack_id: String(pack.id), pack_nom: pack.nom });
      }
      const packItem: PanierItem = { produit_id: `pack_${pack.id}`, nom: `📦 ${pack.nom}`, quantite: 1, prix_unitaire: pack.prix, sous_total: pack.prix, is_pack: true, pack_id: String(pack.id), pack_nom: pack.nom };
      setPanier([...panier, packItem, ...produitsIndividuels]);
      toastSuccess(`Pack "${pack.nom}" ajouté`);
    } catch { toastError("Erreur ajout pack"); }
    finally { setIsAddingPack(false); }
  };

  const updateCartQty = (id: string, qty: number) => {
    if (qty <= 0) { setPanier(panier.filter((p) => String(p.produit_id) !== String(id))); return; }
    setPanier(panier.map((p) => String(p.produit_id) === String(id) ? { ...p, quantite: qty, sous_total: qty * p.prix_unitaire } : p));
  };

  const updateCartPrice = (id: string, price: number) => {
    setPanier(panier.map((p) => String(p.produit_id) === String(id) ? { ...p, prix_unitaire: price, sous_total: p.quantite * price } : p));
  };

  const resetForm = () => { setEditMode(false); setSelectedVente(null); setPanier([]); setSearchProduit(""); setForm(EMPTY_FORM); setModalTab("produits"); };

  const handleSubmit = async () => {
    if (isSubmitting) { toastWarn("Veuillez patienter..."); return; }
    if (panier.length === 0) { toastWarn("Ajoutez au moins un produit"); return; }
    setIsSubmitting(true);
    const packLines = panier.filter((p) => p.is_pack && String(p.produit_id).startsWith("pack_"));
    const productLines = panier.filter((p) => !p.is_pack || (p.is_pack && !String(p.produit_id).startsWith("pack_")));
    const details: VenteDetailItem[] = productLines.map((p) => ({ produit_id: p.produit_id, quantite: p.quantite, prix_unitaire: p.prix_unitaire, sous_total: p.sous_total }));
    const totalPack = packLines.reduce((s, p) => s + p.sous_total, 0);
    const totalProduits = productLines.reduce((s, p) => s + p.sous_total, 0);
    const montantTotal = totalPack + totalProduits;
    setSaving(true);
    try {
      if (editMode && selectedVente) {
        await updateVente(selectedVente.id, form, details); toastSuccess("Vente modifiée");
      } else {
        const nv = await createVente({ ...form }, details);
        if (totalPack > 0) {
          const { getSupabase } = await import("@/lib/supabase");
          await getSupabase().from("ventes").update({ montant_total: montantTotal - (Number(form.remise) || 0), reste_a_payer: montantTotal - (Number(form.remise) || 0) - (Number(form.montant_paye) || 0) }).eq("id", nv.id);
        }
        toastSuccess("Vente enregistrée"); if (nv?.id) setPrintPending(nv.id);
      }
      setShowModal(false); resetForm(); loadData();
    } catch (e: unknown) { logger.error("Erreur sauvegarde:", e); toastError(`Erreur : ${e instanceof Error ? e.message : "Impossible"}`); }
    finally { setSaving(false); setIsSubmitting(false); }
  };

  const handleEdit = async (vente: Vente) => {
    setEditMode(true); setSelectedVente(vente);
    setForm({ client_nom: vente.client_nom || "", client_telephone: vente.client_telephone || "", type_paiement: vente.type_paiement || "especes", remise: vente.remise || 0, montant_paye: vente.montant_paye || 0, date_vente: vente.date_vente?.split("T")[0] || new Date().toISOString().split("T")[0] });
    try { const v = await fetchVenteWithDetails(vente.id); if (v?.details) setPanier(v.details.map((d: any) => ({ produit_id: String(d.produit_id ?? ""), nom: String(d.produit?.nom ?? "Produit"), quantite: Number(d.quantite ?? 0), prix_unitaire: Number(d.prix_unitaire ?? 0), sous_total: Number(d.sous_total ?? 0) }))); }
    catch { toastWarn("Impossible de charger les détails"); }
    setShowModal(true);
  };

  const executeDelete = async () => { if (!confirmDelete) return; const id = confirmDelete; setConfirmDelete(null); try { await deleteVente(id); toastSuccess("Vente supprimée"); loadData(); } catch { toastError("Erreur suppression"); } };
  const handlePrint = async (venteId: string) => { try { const v = await fetchVenteWithDetails(venteId); if (v && currentCompany) printTicketVente(v, v.details, currentCompany); else toastWarn("Détails introuvables"); } catch { toastError("Erreur impression"); } };

  const produitsFiltres = useMemo(() => {
    if (!searchProduit) return produits;
    const q = searchProduit.toLowerCase();
    return produits.filter((p) => p.nom.toLowerCase().includes(q) || (p.reference || "").toLowerCase().includes(q));
  }, [produits, searchProduit]);

  const totalPanier = useMemo(() => {
    const packTotal = panier.filter((p) => p.is_pack && p.produit_id.startsWith("pack_")).reduce((s, p) => s + p.sous_total, 0);
    const productTotal = panier.filter((p) => !p.is_pack || (p.is_pack && !p.produit_id.startsWith("pack_"))).reduce((s, p) => s + p.sous_total, 0);
    return packTotal + productTotal;
  }, [panier]);

  const totalFinal = totalPanier - (Number(form.remise) || 0);
  const resteAPayer = totalFinal - (Number(form.montant_paye) || 0);
  const totalGeneral = useMemo(() => ventes.reduce((s, v) => s + (v.montant_total || 0), 0), [ventes]);
  const totalPaye = useMemo(() => ventes.reduce((s, v) => s + (v.montant_paye || 0), 0), [ventes]);
  const totalSolde = useMemo(() => ventes.reduce((s, v) => s + (v.reste_a_payer || 0), 0), [ventes]);

  if (loading) return <SkeletonTable rows={6} />;

  return (
    <div className="pb-6 space-y-6">
    <ConfirmDialog open={!!confirmDelete} title="Supprimer la vente ?" message="Cette action est irréversible. Le stock sera restauré." onConfirm={executeDelete} onCancel={() => setConfirmDelete(null)} variant="danger" />
    <ConfirmDialog open={!!printPending} title="Imprimer le ticket ?" message={`Imprimer le ticket pour ${ventes.find((v) => v.id === printPending)?.client_nom || "ce client"} ?`} confirmLabel="Imprimer" cancelLabel="Non merci" variant="primary" onConfirm={() => { if (printPending) handlePrint(printPending); setPrintPending(null); }} onCancel={() => setPrintPending(null)} />

    {/* Header */}
    <div className="flex items-center justify-between flex-wrap gap-4">
    <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center">
    <Icon d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" size={20} className="text-blue-400" />
    </div>
    <div>
    <h1 className={`font-black text-white ${isMobile ? "text-xl" : "text-2xl"}`}>Ventes</h1>
    <p className="text-xs text-zinc-500">{currentCompany?.name} · {ventes.length} transaction(s)</p>
    </div>
    </div>
    <Button variant="success" onClick={() => { resetForm(); setShowModal(true); }} className="btn-press shadow-lg shadow-emerald-500/20">＋ Nouvelle vente</Button>
    </div>

    {/* Stats */}
    {ventes.length > 0 && (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
      <div className="glass-card-hover p-5">
      <div className="flex items-center gap-2 mb-3">
      <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center"><Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={16} className="text-emerald-400" /></div>
      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total général</span>
      </div>
      <div className="text-xl font-black text-white">{formatAr(totalGeneral)}</div>
      </div>
      <div className="glass-card-hover p-5">
      <div className="flex items-center gap-2 mb-3">
      <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center"><Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={16} className="text-blue-400" /></div>
      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total payé</span>
      </div>
      <div className="text-xl font-black text-white">{formatAr(totalPaye)}</div>
      </div>
      <div className="glass-card-hover p-5">
      <div className="flex items-center gap-2 mb-3">
      <div className="w-8 h-8 rounded-lg bg-orange-400/10 flex items-center justify-center"><Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={16} className="text-orange-400" /></div>
      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Solde restant</span>
      </div>
      <div className="text-xl font-black text-white">{formatAr(totalSolde)}</div>
      </div>
      </div>
    )}

    {/* Liste */}
    {isMobile ? (
      <div className="flex flex-col gap-3 stagger-children">
      {ventes.length === 0 ? (
        <Card className="glass-card p-10 text-center">
        <div className="text-4xl mb-3">🛒</div>
        <p className="text-zinc-500 text-sm">Aucune vente enregistrée.</p>
        </Card>
      ) : ventes.map((v) => {
        const solde = v.reste_a_payer || 0;
        return (
          <Card key={v.id} className="glass-card-hover p-5">
          <div className="flex justify-between items-start mb-3">
          <div>
          <div className="font-bold text-white">{v.numero_facture || "—"}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{v.client_nom || "—"} · {v.date_vente ? new Date(v.date_vente).toLocaleDateString("fr-FR") : "—"}</div>
          </div>
          <StatusBadge status={v.statut ?? "en_attente"} />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
          {[{ l: "TOTAL", v: formatAr(v.montant_total), c: "text-amber-400" }, { l: "PAYÉ", v: formatAr(v.montant_paye), c: "text-emerald-400" }, { l: "SOLDE", v: solde > 0 ? formatAr(solde) : "Payé", c: solde > 0 ? "text-orange-400" : "text-emerald-400" }].map((r) => (
            <div key={r.l} className="bg-[#0a0a0f] rounded-lg py-2 px-2 text-center">
            <div className="text-[9px] text-zinc-500 mb-0.5">{r.l}</div>
            <div className={`text-xs font-bold ${r.c}`}>{r.v}</div>
            </div>
          ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" onClick={() => handlePrint(v.id)}>🖨️</Button>
          <Button variant="primary" size="sm" onClick={() => handleEdit(v)}>✏️</Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(v.id)}>🗑️</Button>
          </div>
          </Card>
        );
      })}
      </div>
    ) : (
      <Card className="overflow-hidden glass-card">
      <Table>
      <TableHead>
      <TableRow className="bg-white/[0.02]">
      <TableHeader className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Facture</TableHeader>
      <TableHeader className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Client</TableHeader>
      <TableHeader className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</TableHeader>
      <TableHeader className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Montant</TableHeader>
      <TableHeader className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Payé</TableHeader>
      <TableHeader className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Solde</TableHeader>
      <TableHeader className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Statut</TableHeader>
      <TableHeader className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Actions</TableHeader>
      </TableRow>
      </TableHead>
      <TableBody className="divide-y divide-white/[0.02]">
      {ventes.length === 0 ? <TableEmpty colSpan={8} message="Aucune vente" /> : ventes.map((v) => {
        const solde = v.reste_a_payer || 0;
        return (
          <TableRow key={v.id} className="table-row-hover group">
          <TableCell className="font-semibold font-mono text-xs text-zinc-300 group-hover:text-white transition-colors">{v.numero_facture || "—"}</TableCell>
          <TableCell className="text-sm text-zinc-300">{v.client_nom || "—"}</TableCell>
          <TableCell className="text-zinc-500 text-xs">{v.date_vente ? new Date(v.date_vente).toLocaleDateString("fr-FR") : "—"}</TableCell>
          <TableCell align="right" className="font-bold text-amber-400">{formatAr(v.montant_total)}</TableCell>
          <TableCell align="right" className="text-emerald-400">{formatAr(v.montant_paye)}</TableCell>
          <TableCell align="right" className={`font-bold ${solde > 0 ? "text-orange-400" : "text-emerald-400"}`}>{solde > 0 ? formatAr(solde) : "Payé"}</TableCell>
          <TableCell align="center"><StatusBadge status={v.statut ?? "en_attente"} /></TableCell>
          <TableCell align="center">
          <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="secondary" size="sm" onClick={() => handlePrint(v.id)}>🖨️</Button>
          <Button variant="primary" size="sm" onClick={() => handleEdit(v)}>✏️</Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(v.id)}>🗑️</Button>
          </div>
          </TableCell>
          </TableRow>
        );
      })}
      </TableBody>
      </Table>
      {ventes.length > 0 && (
        <div className="py-3 px-5 bg-[#0a0a0f] border-t border-white/[0.04] flex justify-between flex-wrap gap-2">
        <span className="font-bold text-xs text-zinc-400">TOTAL GÉNÉRAL</span>
        <div className="flex gap-4">
        <span className="text-emerald-400 font-extrabold">{formatAr(totalGeneral)}</span>
        <span className="text-blue-400 font-bold">Payé: {formatAr(totalPaye)}</span>
        <span className="text-orange-400 font-bold">Solde: {formatAr(totalSolde)}</span>
        </div>
        </div>
      )}
      </Card>
    )}

    {/* Modal */}
    <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} width={isMobile ? 480 : 900}>
    <ModalHeader title={editMode ? "Modifier la vente" : "Nouvelle vente"} onClose={() => { setShowModal(false); resetForm(); }} />
    <ModalBody>
    <div className="flex gap-1 mb-4 bg-[#0a0a0f] rounded-xl p-1">
    <button onClick={() => setModalTab("produits")} className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all ${modalTab === "produits" ? "bg-amber-400 text-gray-950 shadow-lg shadow-amber-400/20" : "text-zinc-500 hover:text-zinc-300"}`}>🛍️ Produits</button>
    <button onClick={() => setModalTab("packs")} className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all ${modalTab === "packs" ? "bg-amber-400 text-gray-950 shadow-lg shadow-amber-400/20" : "text-zinc-500 hover:text-zinc-300"}`}>📦 Packs ({packs.length})</button>
    </div>
    <div className={isMobile ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
    <div>
    {modalTab === "produits" ? (
      <>
      <Input placeholder="Rechercher un produit..." value={searchProduit} onChange={(e) => setSearchProduit(e.target.value)} className="mb-2" />
      <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1">
      {produitsFiltres.map((p) => (
        <button key={p.id} onClick={() => addToCart(p)} disabled={!editMode && (p.quantite_stock ?? 0) <= 0} className={`flex items-center justify-between py-2 px-3 rounded-lg border border-[#1e1e24] bg-[#0a0a0f] text-left text-xs transition-all ${(!editMode && (p.quantite_stock ?? 0) <= 0) ? "opacity-50 cursor-not-allowed" : "hover:border-amber-400/30 hover:bg-white/[0.02] cursor-pointer"}`}>
        <div><div className="font-semibold text-white">{p.nom}</div><div className="text-[10px] text-zinc-500">Stock: {p.quantite_stock} · {formatAr(p.prix_vente)}</div></div>
        <span className="text-base text-emerald-400">＋</span>
        </button>
      ))}
      {produitsFiltres.length === 0 && <div className="text-center text-zinc-500 p-4 text-xs">Aucun produit trouvé</div>}
      </div>
      </>
    ) : (
      <>
      <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">📦 Packs disponibles</div>
      <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1">
      {packs.length === 0 ? <div className="text-center text-zinc-500 p-4 text-xs">Aucun pack créé</div> : packs.map((pack) => {
        const disponible = packDisponible[pack.id] ?? false;
        return (
          <button key={pack.id} onClick={() => !editMode && addPackToCart(pack)} disabled={!editMode && !disponible} className={`flex items-center justify-between py-2.5 px-3 rounded-lg text-left text-xs transition-all ${disponible ? "border border-amber-400/30 bg-amber-400/5" : "border border-[#1e1e24] bg-[#0a0a0f]"} ${!editMode && !disponible ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-white/[0.02]"}`}>
          <div><div className="font-bold text-white">📦 {pack.nom}</div><div className="text-[10px] text-zinc-500">{pack.produits?.length || 0} produit(s) · {disponible ? "✅ Disponible" : "❌ Stock insuffisant"}</div></div>
          <div className="text-right"><div className="font-bold text-amber-400">{formatAr(pack.prix)}</div><div className={`text-sm ${disponible ? "text-emerald-400" : "text-red-400"}`}>＋</div></div>
          </button>
        );
      })}
      </div>
      </>
    )}
    </div>
    <div>
    <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">🛒 Panier ({panier.filter((p) => p.is_pack && p.produit_id.startsWith("pack_")).length} pack(s), {panier.filter((p) => !p.is_pack || (p.is_pack && !p.produit_id.startsWith("pack_"))).length} produit(s))</div>
    <div className="max-h-[200px] overflow-y-auto mb-3 space-y-1">
    {panier.length === 0 ? <div className="text-center text-zinc-500 p-5 text-xs border border-dashed border-[#1e1e24] rounded-lg">Panier vide</div> : panier.map((p) => (
      <div key={`${p.produit_id}_${p.is_pack ? "pack" : "prod"}_${p.pack_nom || ""}`} className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg ${p.is_pack && String(p.produit_id).startsWith("pack_") ? "bg-amber-400/10" : "bg-transparent"} ${p.is_pack && !String(p.produit_id).startsWith("pack_") ? "pl-6" : ""}`}>
      <div className="flex-1 min-w-0">
      <div className={`truncate text-[11px] text-white ${p.is_pack && String(p.produit_id).startsWith("pack_") ? "font-bold" : "font-semibold"}`}>{p.nom}{p.is_pack && !String(p.produit_id).startsWith("pack_") && <span className="text-[9px] text-zinc-500 ml-1">(pack)</span>}</div>
      </div>
      {p.is_pack && String(p.produit_id).startsWith("pack_") ? (
        <>
        <span className="text-[11px] font-bold text-amber-400 min-w-[60px] text-right">{formatAr(p.prix_unitaire)}</span>
        <button onClick={() => { const newPanier = panier.filter((item) => String(item.pack_id) !== String(p.pack_id)); setPanier(newPanier); }} className="w-6 h-6 rounded-md bg-red-400/10 border border-red-400/20 text-red-400 flex items-center justify-center text-xs hover:bg-red-400/20 transition-colors">✕</button>
        </>
      ) : (
        <>
        <input type="number" min={1} value={p.quantite} onChange={(e) => updateCartQty(p.produit_id, parseInt(e.target.value) || 0)} className="w-[50px] py-1 px-1.5 bg-[#111114] border border-[#1e1e24] rounded-md text-white text-[11px] text-center outline-none focus:border-amber-400 input-focus" />
        <input type="number" value={p.prix_unitaire} onChange={(e) => updateCartPrice(p.produit_id, parseFloat(e.target.value) || 0)} className="w-[70px] py-1 px-1.5 bg-[#111114] border border-[#1e1e24] rounded-md text-white text-[11px] text-center outline-none focus:border-amber-400 input-focus" />
        <span className="text-[11px] font-bold text-amber-400 min-w-[60px] text-right">{formatAr(p.sous_total)}</span>
        <button onClick={() => updateCartQty(p.produit_id, 0)} className="w-6 h-6 rounded-md bg-red-400/10 border border-red-400/20 text-red-400 flex items-center justify-center text-xs hover:bg-red-400/20 transition-colors">✕</button>
        </>
      )}
      </div>
    ))}
    </div>
    {panier.length > 0 && (
      <div className="py-2 px-3 bg-[#0a0a0f] rounded-lg mb-3 space-y-1">
      <div className="flex justify-between text-[11px]"><span className="text-zinc-500">Sous-total</span><span className="font-semibold text-white">{formatAr(totalPanier)}</span></div>
      {form.remise > 0 && <div className="flex justify-between text-[11px]"><span className="text-red-400">Remise</span><span className="text-red-400 font-semibold">-{formatAr(form.remise)}</span></div>}
      <div className="flex justify-between text-[13px] pt-1 border-t border-[#1e1e24]"><span className="font-bold text-white">TOTAL</span><span className="font-extrabold text-amber-400 text-base">{formatAr(totalFinal)}</span></div>
      </div>
    )}
    <div className="grid grid-cols-2 gap-2">
    <Input label="Client" placeholder="Nom du client" value={form.client_nom} onChange={(e) => setForm({ ...form, client_nom: e.target.value })} />
    <Input label="Tél" placeholder="034 00 000 00" value={form.client_telephone} onChange={(e) => setForm({ ...form, client_telephone: e.target.value })} />
    <Select label="Paiement" value={form.type_paiement} onChange={(e) => setForm({ ...form, type_paiement: e.target.value })} options={PAIEMENT_OPTIONS} />
    <Input type="date" label="Date" value={form.date_vente} onChange={(e) => setForm({ ...form, date_vente: e.target.value })} />
    <Input type="number" label="Remise (Ar)" value={String(form.remise)} onChange={(e) => setForm({ ...form, remise: parseFloat(e.target.value) || 0 })} />
    <Input type="number" label="Payé (Ar)" value={String(form.montant_paye)} onChange={(e) => setForm({ ...form, montant_paye: parseFloat(e.target.value) || 0 })} />
    </div>
    {resteAPayer > 0 && <div className="mt-2 py-1.5 px-2.5 bg-orange-400/10 rounded-lg text-[11px] text-orange-400 font-semibold">Reste à payer : {formatAr(resteAPayer)}</div>}
    </div>
    </div>
    </ModalBody>
    <ModalFooter>
    <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
    <Button variant="success" onClick={handleSubmit} loading={saving} disabled={saving || panier.length === 0} className="btn-press shadow-lg shadow-emerald-500/20">{editMode ? "Modifier" : "Enregistrer"}</Button>
    </ModalFooter>
    </Modal>
    </div>
  );
}
