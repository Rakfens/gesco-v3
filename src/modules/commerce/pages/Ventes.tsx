"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Badge, Button, Card, Input, Modal, ModalBody, ModalFooter, ModalHeader, Select, StatCard, StatusBadge,
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Pack, Produit, Vente } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { getSupabase } from "@/lib/supabase";
import { printTicketVente } from "../services/impressionService";
import { fetchProduits } from "../services/produitService";
import { fetchPacks, fetchPackWithProduits, isPackAvailable } from "../services/packService";
import type { VenteDetailItem } from "../services/venteService";
import { createVente, deleteVente, fetchVentes, fetchVenteWithDetails, updateVente } from "../services/venteService";

/* ─── SVG Icon helper ─── */
const Icon = ({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

/* ─── Types ─── */
interface PanierItem {
  produit_id: string; nom: string; quantite: number; prix_unitaire: number; sous_total: number;
  stock_max?: number; is_pack?: boolean; pack_id?: string; pack_nom?: string;
}

interface VenteForm {
  client_nom: string; client_telephone: string; type_paiement: string;
  remise: number; montant_paye: number; date_vente: string;
}

const EMPTY_FORM: VenteForm = {
  client_nom: "", client_telephone: "", type_paiement: "especes", remise: 0, montant_paye: 0,
  date_vente: new Date().toISOString().split("T")[0],
};

const PAIEMENT_OPTIONS = [
  { value: "especes", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "carte", label: "Carte" },
];

type ModalTab = "produits" | "packs";

/* ═══════════════════════════════════════════════════════════
   PAGE VENTES
   ═══════════════════════════════════════════════════════════ */
export default function Ventes() {
  const { currentCompany, success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
  const isMobile = useIsMobile();
  const router = useRouter();

  const [ventes, setVentes] = useState<Vente[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<string | null>(null);

  const [panier, setPanier] = useState<PanierItem[]>([]);
  const [searchProduit, setSearchProduit] = useState("");
  const [isAddingPack, setIsAddingPack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<VenteForm>(EMPTY_FORM);
  const [modalTab, setModalTab] = useState<ModalTab>("produits");
  const [packDisponible, setPackDisponible] = useState<Record<string, boolean>>({});

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [v, p, pk] = await Promise.all([fetchVentes(), fetchProduits({ isActive: true }), fetchPacks()]);
      setVentes(v); setProduits(p); setPacks(pk);
      const dispo: Record<string, boolean> = {};
      for (const pack of pk) { dispo[pack.id] = await isPackAvailable(pack.id); }
      setPackDisponible(dispo);
    } catch { toastError("Erreur lors du chargement"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      if (["ventes", "vente_details", "produits"].includes((e as CustomEvent)?.detail?.table)) { loadData(); }
    };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, []);

  /* ─── Cart logic ─── */
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
        if (!produit) { toastWarn("Un produit du pack n'existe plus"); return; }
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
        await updateVente(selectedVente.id, form, details);
        toastSuccess("Vente modifiée");
      } else {
        const nv = await createVente({ ...form }, details);
        if (totalPack > 0) {
          await getSupabase().from("ventes").update({ montant_total: montantTotal - (Number(form.remise) || 0), reste_a_payer: montantTotal - (Number(form.remise) || 0) - (Number(form.montant_paye) || 0) }).eq("id", nv.id);
        }
        toastSuccess("Vente enregistrée");
        if (nv?.id) setShowPrintModal(nv.id);
      }
      setShowModal(false); resetForm(); loadData();
    } catch (e: unknown) { toastError(`Erreur : ${e instanceof Error ? e.message : "Impossible"}`); }
    finally { setSaving(false); setIsSubmitting(false); }
  };

  const handleEdit = async (vente: Vente) => {
    setEditMode(true); setSelectedVente(vente);
    setForm({ client_nom: vente.client_nom || "", client_telephone: vente.client_telephone || "", type_paiement: vente.type_paiement || "especes", remise: vente.remise || 0, montant_paye: vente.montant_paye || 0, date_vente: vente.date_vente?.split("T")[0] || new Date().toISOString().split("T")[0] });
    try {
      const v = await fetchVenteWithDetails(vente.id);
      if (v?.details) { setPanier(v.details.map((d: any) => ({ produit_id: String(d.produit_id ?? ""), nom: String(d.produit?.nom ?? "Produit"), quantite: Number(d.quantite ?? 0), prix_unitaire: Number(d.prix_unitaire ?? 0), sous_total: Number(d.sous_total ?? 0) }))); }
    } catch { toastWarn("Impossible de charger les détails"); }
    setShowModal(true);
  };

  const executeDelete = async () => {
    if (!showDeleteModal) return;
    const id = showDeleteModal; setShowDeleteModal(null);
    try { await deleteVente(id); toastSuccess("Vente supprimée"); loadData(); }
    catch { toastError("Erreur lors de la suppression"); }
  };

  const handlePrint = async (venteId: string) => {
    try {
      const v = await fetchVenteWithDetails(venteId);
      if (v && currentCompany) { printTicketVente(v, v.details, currentCompany); }
      else { toastWarn("Détails introuvables"); }
    } catch { toastError("Erreur impression"); }
  };

  const produitsFiltres = useMemo(() => {
    if (!searchProduit) return produits;
    const q = searchProduit.toLowerCase();
    return produits.filter((p) => p.nom.toLowerCase().includes(q) || (p.reference || "").toLowerCase().includes(q));
  }, [produits, searchProduit]);

  const totalPanier = useMemo(() => {
    const packTotal = panier.filter((p) => p.is_pack && String(p.produit_id).startsWith("pack_")).reduce((s, p) => s + p.sous_total, 0);
    const productTotal = panier.filter((p) => !p.is_pack || (p.is_pack && !String(p.produit_id).startsWith("pack_"))).reduce((s, p) => s + p.sous_total, 0);
    return packTotal + productTotal;
  }, [panier]);

  const totalFinal = totalPanier - (Number(form.remise) || 0);
  const resteAPayer = totalFinal - (Number(form.montant_paye) || 0);

  const totalGeneral = useMemo(() => ventes.reduce((s, v) => s + (v.montant_total || 0), 0), [ventes]);
  const totalPaye = useMemo(() => ventes.reduce((s, v) => s + (v.montant_paye || 0), 0), [ventes]);
  const totalSolde = useMemo(() => ventes.reduce((s, v) => s + (v.reste_a_payer || 0), 0), [ventes]);

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2" style={{ borderColor: "var(--border-default)", borderTopColor: "var(--info)" }} />
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>Chargement des ventes...</span>
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
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>Ventes</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{currentCompany?.name} · {ventes.length} transaction{ventes.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push("/commerce/rapports")} className="btn-press">← Rapports</Button>
            <Button variant="success" onClick={() => { resetForm(); setShowModal(true); }} className="btn-press shadow-gold">＋ Nouvelle vente</Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STATS
          ═══════════════════════════════════════════════════════ */}
      {ventes.length > 0 && (
        <div className={`grid gap-3 mb-5 ${isMobile ? "grid-cols-2" : "grid-cols-3"}`} style={sectionStyle(0.1)}>
          <StatCard label="Total général" value={formatAr(totalGeneral)} color="accent" icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} />} />
          <StatCard label="Total payé" value={formatAr(totalPaye)} color="success" icon={<Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={18} />} />
          <StatCard label="Solde restant" value={formatAr(totalSolde)} color="warning" icon={<Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={18} />} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          LISTE VENTES
          ═══════════════════════════════════════════════════════ */}
      {isMobile ? (
        <div className="flex flex-col gap-3" style={sectionStyle(0.15)}>
          {ventes.length === 0 ? (
            <div className="rounded-2xl py-14 text-center" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
              <div className="text-4xl mb-3">🛒</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune vente enregistrée.</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>Cliquez sur "Nouvelle vente" pour commencer.</div>
            </div>
          ) : ventes.map((v, idx) => {
            const solde = v.reste_a_payer || 0;
            return (
              <div key={v.id} className="rounded-2xl overflow-hidden transition-all duration-200" style={{ ...sectionStyle(0.2 + idx * 0.03), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{v.numero_facture || "—"}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{v.client_nom || "—"} · {v.date_vente ? new Date(v.date_vente).toLocaleDateString("fr-FR") : "—"}</div>
                    </div>
                    <StatusBadge status={v.statut ?? "en_attente"} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { l: "TOTAL", v: formatAr(v.montant_total) },
                      { l: "PAYÉ", v: formatAr(v.montant_paye) },
                      { l: "SOLDE", v: solde > 0 ? formatAr(solde) : "Payé" },
                    ].map((r) => (
                      <div key={r.l} className="rounded-lg py-2 px-2 text-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                        <div className="text-[9px] mb-0.5" style={{ color: "var(--text-muted)" }}>{r.l}</div>
                        <div className="text-xs font-bold" style={{ color: r.l === "PAYÉ" ? "var(--success)" : r.l === "SOLDE" && solde > 0 ? "var(--warning)" : "var(--text-primary)" }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handlePrint(v.id)} className="btn-press">🖨️ Imprimer</Button>
                    <Button variant="primary" size="sm" onClick={() => handleEdit(v)} className="btn-press">✏️ Modifier</Button>
                    <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(v.id)} className="btn-press">🗑️ Supprimer</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ ...sectionStyle(0.15), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader className="col-md">Facture</TableHeader>
                <TableHeader className="col-lg">Client</TableHeader>
                <TableHeader className="col-sm">Date</TableHeader>
                <TableHeader align="right" className="col-sm">Montant</TableHeader>
                <TableHeader align="right" className="col-sm">Payé</TableHeader>
                <TableHeader align="right" className="col-sm">Solde</TableHeader>
                <TableHeader align="center" className="col-sm">Statut</TableHeader>
                <TableHeader align="center" className="col-lg">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {ventes.length === 0 ? (
                <TableEmpty colSpan={8} message="Aucune vente enregistrée" />
              ) : ventes.map((v) => {
                const solde = v.reste_a_payer || 0;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="col-md font-semibold font-mono text-xs truncate whitespace-nowrap"><span style={{ color: "var(--text-secondary)" }}>{v.numero_facture || "—"}</span></TableCell>
                    <TableCell className="col-lg text-sm truncate whitespace-nowrap"><span style={{ color: "var(--text-secondary)" }}>{v.client_nom || "—"}</span></TableCell>
                    <TableCell className="col-sm text-xs"><span style={{ color: "var(--text-muted)" }}>{v.date_vente ? new Date(v.date_vente).toLocaleDateString("fr-FR") : "—"}</span></TableCell>
                    <TableCell align="right" className="col-sm font-bold"><span style={{ color: "var(--text-primary)" }}>{formatAr(v.montant_total)}</span></TableCell>
                    <TableCell align="right" className="col-sm"><span style={{ color: "var(--success)" }}>{formatAr(v.montant_paye)}</span></TableCell>
                    <TableCell align="right" className="col-sm font-bold"><span style={{ color: solde > 0 ? "var(--warning)" : "var(--success)" }}>{solde > 0 ? formatAr(solde) : "Payé"}</span></TableCell>
                    <TableCell align="center" className="col-sm"><StatusBadge status={v.statut ?? "en_attente"} /></TableCell>
                    <TableCell align="center" className="col-lg">
                      <div className="flex gap-1 justify-center">
                        <Button variant="secondary" size="sm" onClick={() => handlePrint(v.id)} className="btn-press !px-2">🖨️</Button>
                        <Button variant="primary" size="sm" onClick={() => handleEdit(v)} className="btn-press !px-2">✏️</Button>
                        <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(v.id)} className="btn-press !px-2">🗑️</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {ventes.length > 0 && (
            <div className="py-3 px-5 flex justify-between flex-wrap gap-2" style={{ background: "var(--bg-secondary)", borderTop: "1px solid var(--border-subtle)" }}>
              <span className="font-bold text-xs" style={{ color: "var(--text-muted)" }}>TOTAL GÉNÉRAL</span>
              <div className="flex gap-4">
                <span className="font-extrabold" style={{ color: "var(--success)" }}>{formatAr(totalGeneral)}</span>
                <span className="font-bold" style={{ color: "var(--info)" }}>Payé: {formatAr(totalPaye)}</span>
                <span className="font-bold" style={{ color: "var(--warning)" }}>Solde: {formatAr(totalSolde)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAL VENTE (POS)
          ═══════════════════════════════════════════════════════ */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} width={isMobile ? 480 : 900}>
        <ModalHeader title={editMode ? "Modifier la vente" : "Nouvelle vente"} onClose={() => { setShowModal(false); resetForm(); }} />
        <ModalBody>
          {/* Tabs */}
          <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
            <button onClick={() => setModalTab("produits")} className="flex-1 py-2.5 px-4 rounded-lg text-xs font-bold btn-press transition-all" style={{ background: modalTab === "produits" ? "var(--gold)" : "transparent", color: modalTab === "produits" ? "var(--bg-primary)" : "var(--text-muted)" }}>
              🛍️ Produits
            </button>
            <button onClick={() => setModalTab("packs")} className="flex-1 py-2.5 px-4 rounded-lg text-xs font-bold btn-press transition-all" style={{ background: modalTab === "packs" ? "var(--gold)" : "transparent", color: modalTab === "packs" ? "var(--bg-primary)" : "var(--text-muted)" }}>
              📦 Packs ({packs.length})
            </button>
          </div>

          <div className={isMobile ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
            {/* Colonne gauche : Produits / Packs */}
            <div>
              {modalTab === "produits" ? (
                <>
                  <Input placeholder="Rechercher un produit..." value={searchProduit} onChange={(e) => setSearchProduit(e.target.value)} className="mb-2" />
                  <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1 rounded-xl p-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                    {produitsFiltres.map((p) => (
                      <button key={p.id} onClick={() => addToCart(p)} disabled={!editMode && (p.quantite_stock ?? 0) <= 0} className="flex items-center justify-between py-2.5 px-3 rounded-lg text-left text-xs btn-press transition-all" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", opacity: (!editMode && (p.quantite_stock ?? 0) <= 0) ? 0.5 : 1, cursor: (!editMode && (p.quantite_stock ?? 0) <= 0) ? "not-allowed" : "pointer" }}>
                        <div>
                          <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{p.nom}</div>
                          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Stock: {p.quantite_stock} · {formatAr(p.prix_vente)}</div>
                        </div>
                        <span className="text-base" style={{ color: "var(--success)" }}>＋</span>
                      </button>
                    ))}
                    {produitsFiltres.length === 0 && <div className="text-center p-4 text-xs" style={{ color: "var(--text-muted)" }}>Aucun produit trouvé</div>}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>📦 Packs disponibles</div>
                  <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1 rounded-xl p-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                    {packs.length === 0 ? (
                      <div className="text-center p-4 text-xs" style={{ color: "var(--text-muted)" }}>Aucun pack créé</div>
                    ) : packs.map((pack) => {
                      const disponible = packDisponible[pack.id] ?? false;
                      return (
                        <button key={pack.id} onClick={() => !editMode && addPackToCart(pack)} disabled={!editMode && !disponible} className="flex items-center justify-between py-2.5 px-3 rounded-lg text-left text-xs btn-press transition-all" style={{ background: disponible ? "rgba(52,211,153,0.06)" : "var(--bg-card)", border: `1px solid ${disponible ? "rgba(52,211,153,0.15)" : "var(--border-subtle)"}`, opacity: (!editMode && !disponible) ? 0.5 : 1, cursor: (!editMode && !disponible) ? "not-allowed" : "pointer" }}>
                          <div>
                            <div className="font-bold" style={{ color: "var(--text-primary)" }}>📦 {pack.nom}</div>
                            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{pack.produits?.length || 0} produit(s) · {disponible ? "✅ Disponible" : "❌ Stock insuffisant"}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold" style={{ color: "var(--gold)" }}>{formatAr(pack.prix)}</div>
                            <div className="text-sm" style={{ color: disponible ? "var(--success)" : "var(--danger)" }}>＋</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Colonne droite : Panier & Formulaire */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  🛒 Panier ({panier.filter((p) => p.is_pack && String(p.produit_id).startsWith("pack_")).length} pack{panier.filter((p) => p.is_pack && String(p.produit_id).startsWith("pack_")).length !== 1 ? "s" : ""}, {panier.filter((p) => !p.is_pack || (p.is_pack && !String(p.produit_id).startsWith("pack_"))).length} produit{panier.filter((p) => !p.is_pack || (p.is_pack && !String(p.produit_id).startsWith("pack_"))).length !== 1 ? "s" : ""})
                </div>
                {panier.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setPanier([])} className="btn-press text-[10px] !py-1 !px-2" style={{ color: "var(--danger)" }}>
                    <Icon d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" size={12} />
                    Vider le panier
                  </Button>
                )}
              </div>
              <div className="max-h-[200px] overflow-y-auto mb-3 space-y-1 rounded-xl p-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                {panier.length === 0 ? (
                  <div className="text-center p-5 text-xs" style={{ color: "var(--text-muted)" }}>Panier vide</div>
                ) : panier.map((p) => (
                  <div key={`${p.produit_id}_${p.is_pack ? "pack" : "prod"}_${p.pack_nom || ""}`} className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg" style={{ background: p.is_pack && String(p.produit_id).startsWith("pack_") ? "rgba(201,169,110,0.06)" : "var(--bg-card)", border: "1px solid var(--border-subtle)", paddingLeft: p.is_pack && !String(p.produit_id).startsWith("pack_") ? "1.5rem" : "0.5rem" }}>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-[11px]" style={{ color: "var(--text-primary)", fontWeight: p.is_pack && String(p.produit_id).startsWith("pack_") ? 700 : 600 }}>
                        {p.nom}
                        {p.is_pack && !String(p.produit_id).startsWith("pack_") && <span className="text-[9px] ml-1" style={{ color: "var(--text-muted)" }}>(pack)</span>}
                      </div>
                    </div>
                    {p.is_pack && String(p.produit_id).startsWith("pack_") ? (
                      <>
                        <span className="text-[11px] font-bold min-w-[60px] text-right" style={{ color: "var(--gold)" }}>{formatAr(p.prix_unitaire)}</span>
                        <button onClick={() => setPanier(panier.filter((item) => String(item.pack_id) !== String(p.pack_id)))} className="w-6 h-6 rounded-md flex items-center justify-center text-xs btn-press" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)", color: "var(--danger)" }}>✕</button>
                      </>
                    ) : (
                      <>
                        <input type="number" min={1} value={p.quantite} onChange={(e) => updateCartQty(p.produit_id, parseInt(e.target.value) || 0)} className="w-[50px] py-1 px-1.5 rounded-md text-[11px] text-center outline-none" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
                        <input type="number" value={p.prix_unitaire} onChange={(e) => updateCartPrice(p.produit_id, parseFloat(e.target.value) || 0)} className="w-[70px] py-1 px-1.5 rounded-md text-[11px] text-center outline-none" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
                        <span className="text-[11px] font-bold min-w-[60px] text-right" style={{ color: "var(--gold)" }}>{formatAr(p.sous_total)}</span>
                        <button onClick={() => updateCartQty(p.produit_id, 0)} className="w-6 h-6 rounded-md flex items-center justify-center text-xs btn-press" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)", color: "var(--danger)" }}>✕</button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {panier.length > 0 && (
                <div className="py-3 px-3 rounded-xl mb-3 space-y-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "var(--text-muted)" }}>Sous-total</span>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{formatAr(totalPanier)}</span>
                  </div>
                  {form.remise > 0 && (
                    <div className="flex justify-between text-[11px]">
                      <span style={{ color: "var(--danger)" }}>Remise</span>
                      <span className="font-semibold" style={{ color: "var(--danger)" }}>-{formatAr(form.remise)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[13px] pt-1" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <span className="font-bold" style={{ color: "var(--text-primary)" }}>TOTAL</span>
                    <span className="font-extrabold text-base" style={{ color: "var(--gold)" }}>{formatAr(totalFinal)}</span>
                  </div>
                </div>
              )}

              <div className={isMobile ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-2"}>
                <Input label="Client" placeholder="Nom du client" value={form.client_nom} onChange={(e) => setForm({ ...form, client_nom: e.target.value })} />
                <Input label="Tél" placeholder="034 00 000 00" value={form.client_telephone} onChange={(e) => setForm({ ...form, client_telephone: e.target.value })} />
                <Select label="Paiement" value={form.type_paiement} onChange={(e) => setForm({ ...form, type_paiement: e.target.value })} options={PAIEMENT_OPTIONS} />
                <Input type="date" label="Date" value={form.date_vente} onChange={(e) => setForm({ ...form, date_vente: e.target.value })} />
                <Input type="number" label="Remise (Ar)" value={String(form.remise)} onChange={(e) => setForm({ ...form, remise: parseFloat(e.target.value) || 0 })} />
                <Input type="number" label="Payé (Ar)" value={String(form.montant_paye)} onChange={(e) => setForm({ ...form, montant_paye: parseFloat(e.target.value) || 0 })} />
              </div>

              {resteAPayer > 0 && (
                <div className="mt-2 py-2 px-3 rounded-lg text-[11px] font-semibold" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)", color: "var(--warning)" }}>
                  Reste à payer : {formatAr(resteAPayer)}
                </div>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }} className="btn-press">Annuler</Button>
          <Button variant="success" onClick={handleSubmit} loading={saving} disabled={saving || panier.length === 0} className="btn-press shadow-gold">
            {editMode ? "Modifier" : "Enregistrer"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          MODAL SUPPRESSION
          ═══════════════════════════════════════════════════════ */}
      <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)}>
        <ModalHeader title="Supprimer la vente ?" onClose={() => setShowDeleteModal(null)} />
        <ModalBody>
          <p className="text-[13px] text-center" style={{ color: "var(--text-secondary)" }}>Cette action est irréversible. Le stock sera restauré.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteModal(null)} className="btn-press">Annuler</Button>
          <Button variant="danger" onClick={executeDelete} loading={saving} className="btn-press">Supprimer</Button>
        </ModalFooter>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          MODAL IMPRESSION
          ═══════════════════════════════════════════════════════ */}
      <Modal open={!!showPrintModal} onClose={() => setShowPrintModal(null)}>
        <ModalHeader title="Imprimer le ticket ?" onClose={() => setShowPrintModal(null)} />
        <ModalBody>
          <p className="text-[13px] text-center" style={{ color: "var(--text-secondary)" }}>
            Imprimer le ticket pour {ventes.find((v) => v.id === showPrintModal)?.client_nom || "ce client"} ?
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowPrintModal(null)} className="btn-press">Non merci</Button>
          <Button variant="primary" onClick={() => { if (showPrintModal) handlePrint(showPrintModal); setShowPrintModal(null); }} className="btn-press">Imprimer</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
