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
import type { Produit, Vente } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { printTicketVente } from "../services/impressionService";
import { fetchProduits } from "../services/produitService";
import type { VenteDetailItem } from "../services/venteService";
import { createVente, deleteVente, fetchVentes, fetchVenteWithDetails, updateVente } from "../services/venteService";

/* ─── Colors ─── */
const C = {
  gold: "#c9a96e", goldDim: "rgba(201,169,110,0.1)",
  success: "#34d399", successDim: "rgba(52,211,153,0.1)",
  warning: "#fbbf24", warningDim: "rgba(251,191,36,0.1)",
  danger: "#f87171", dangerDim: "rgba(248,113,113,0.1)",
  violet: "#8b5cf6", violetDim: "rgba(139,92,246,0.1)",
  blue: "#60a5fa", blueDim: "rgba(96,165,250,0.1)",
  orange: "#fb923c", orangeDim: "rgba(251,146,60,0.1)",
};

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/* ─── Types ─── */
interface PanierItem {
  produit_id: string; nom: string; quantite: number; prix_unitaire: number; sous_total: number; stock_max?: number;
}

interface VenteForm {
  client_nom: string; client_telephone: string; type_paiement: string; remise: number; montant_paye: number; date_vente: string;
}

const EMPTY_FORM: VenteForm = {
  client_nom: "", client_telephone: "", type_paiement: "especes", remise: 0, montant_paye: 0, date_vente: new Date().toISOString().split("T")[0],
};

const PAIEMENT_OPTIONS = [
  { value: "especes", label: "💵 Espèces" },
  { value: "mobile_money", label: "📱 Mobile Money" },
  { value: "carte", label: "💳 Carte" },
];

export default function Ventes() {
  const { currentCompany } = useApp();
  const { success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
  const isMobile = useIsMobile();

  const [ventes, setVentes] = useState<Vente[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [panier, setPanier] = useState<PanierItem[]>([]);
  const [searchProduit, setSearchProduit] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [printPending, setPrintPending] = useState<string | null>(null);
  const [form, setForm] = useState<VenteForm>(EMPTY_FORM);

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [v, p] = await Promise.all([fetchVentes(), fetchProduits({ isActive: true })]);
      setVentes(v); setProduits(p);
    } catch (e: unknown) { logger.error("Erreur chargement:", e); toastError("Erreur lors du chargement"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const handler = (e: Event) => { if (["ventes", "vente_details"].includes((e as CustomEvent)?.detail?.table)) loadData(); };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, []);

  const addToCart = (produit: Produit) => {
    if ((produit.quantite_stock ?? 0) <= 0) { toastWarn(`"${produit.nom}" est en rupture de stock`); return; }
    const existing = panier.find((p) => p.produit_id === produit.id);
    if (existing) {
      if (existing.quantite >= (produit.quantite_stock ?? 0) && !editMode) { toastWarn(`Stock insuffisant (${produit.quantite_stock ?? 0})`); return; }
      setPanier(panier.map((p) => p.produit_id === produit.id ? { ...p, quantite: p.quantite + 1, sous_total: (p.quantite + 1) * p.prix_unitaire } : p));
    } else {
      setPanier([...panier, { produit_id: produit.id, nom: produit.nom, quantite: 1, prix_unitaire: produit.prix_vente || 0, sous_total: produit.prix_vente || 0, stock_max: produit.quantite_stock }]);
    }
  };

  const updateCartQty = (id: string, qty: number) => {
    if (qty <= 0) { setPanier(panier.filter((p) => p.produit_id !== id)); return; }
    setPanier(panier.map((p) => p.produit_id === id ? { ...p, quantite: qty, sous_total: qty * p.prix_unitaire } : p));
  };

  const updateCartPrice = (id: string, price: number) => {
    setPanier(panier.map((p) => p.produit_id === id ? { ...p, prix_unitaire: price, sous_total: p.quantite * price } : p));
  };

  const resetForm = () => { setEditMode(false); setSelectedVente(null); setPanier([]); setSearchProduit(""); setForm(EMPTY_FORM); };

  const handleSubmit = async () => {
    if (panier.length === 0) { toastWarn("Ajoutez au moins un produit"); return; }
    const details = panier.map((p) => ({ produit_id: p.produit_id, quantite: p.quantite, prix_unitaire: p.prix_unitaire, sous_total: p.sous_total }));
    setSaving(true);
    try {
      if (editMode && selectedVente) { await updateVente(selectedVente.id, form, details); toastSuccess("Vente modifiée"); }
      else { const nv = await createVente(form, details); toastSuccess("Vente enregistrée"); if (nv?.id) setPrintPending(nv.id); }
      setShowModal(false); resetForm(); loadData();
    } catch (e: unknown) { logger.error("Erreur sauvegarde:", e); toastError(`Erreur : ${e instanceof Error ? e.message : "Impossible"}`); }
    finally { setSaving(false); }
  };

  const handleEdit = async (vente: Vente) => {
    setEditMode(true); setSelectedVente(vente);
    setForm({ client_nom: vente.client_nom || "", client_telephone: vente.client_telephone || "", type_paiement: vente.type_paiement || "especes", remise: vente.remise || 0, montant_paye: vente.montant_paye || 0, date_vente: vente.date_vente?.split("T")[0] || new Date().toISOString().split("T")[0] });
    try {
      const v = await fetchVenteWithDetails(vente.id);
      if (v?.details) setPanier(v.details.map((d: VenteDetailItem) => ({ produit_id: String(d.produit_id ?? ""), nom: String(d.produit?.nom ?? "Produit"), quantite: Number(d.quantite ?? 0), prix_unitaire: Number(d.prix_unitaire ?? 0), sous_total: Number(d.sous_total ?? 0) })));
    } catch { toastWarn("Impossible de charger les détails"); }
    setShowModal(true);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete; setConfirmDelete(null);
    try { await deleteVente(id); toastSuccess("Vente supprimée, stock restauré"); loadData(); }
    catch { toastError("Erreur lors de la suppression"); }
  };

  const handlePrint = async (venteId: string) => {
    try { const v = await fetchVenteWithDetails(venteId); if (v && currentCompany) printTicketVente(v, v.details, currentCompany); else toastWarn("Détails introuvables"); }
    catch { toastError("Erreur impression"); }
  };

  const produitsFiltres = useMemo(() => {
    if (!searchProduit) return produits;
    const q = searchProduit.toLowerCase();
    return produits.filter((p) => p.nom.toLowerCase().includes(q) || (p.reference || "").toLowerCase().includes(q));
  }, [produits, searchProduit]);

  const totalPanier = panier.reduce((s, p) => s + p.sous_total, 0);
  const totalFinal = totalPanier - (Number(form.remise) || 0);
  const resteAPayer = totalFinal - (Number(form.montant_paye) || 0);

  const totalGeneral = useMemo(() => ventes.reduce((s, v) => s + (v.montant_total || 0), 0), [ventes]);
  const totalPaye = useMemo(() => ventes.reduce((s, v) => s + (v.montant_paye || 0), 0), [ventes]);
  const totalSolde = useMemo(() => ventes.reduce((s, v) => s + (v.reste_a_payer || 0), 0), [ventes]);

  if (loading) return <SkeletonTable rows={6} />;

  return (
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ MODALS ══ */}
      <ConfirmDialog open={!!confirmDelete} title="Supprimer la vente ?" message="Cette action est irréversible. Le stock sera restauré." onConfirm={executeDelete} onCancel={() => setConfirmDelete(null)} variant="danger" />
      <ConfirmDialog open={!!printPending} title="Imprimer le ticket ?" message={`Voulez-vous imprimer le ticket pour ${ventes.find((v) => v.id === printPending)?.client_nom || "ce client"} ?`} confirmLabel="Imprimer" cancelLabel="Non merci" variant="primary" onConfirm={() => { if (printPending) handlePrint(printPending); setPrintPending(null); }} onCancel={() => setPrintPending(null)} />

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.blueDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" size={18} color={C.blue} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Ventes</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>{currentCompany?.name} · {ventes.length} transaction(s)</p>
          </div>
        </div>
        <Button variant="success" onClick={() => { resetForm(); setShowModal(true); }}>＋ Nouvelle vente</Button>
      </div>

      {/* ══ STATS ══ */}
      {ventes.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
          <StatCard label="Total général" value={formatAr(totalGeneral)} color={C.success} icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color={C.success} />} />
          <StatCard label="Total payé" value={formatAr(totalPaye)} color={C.blue} icon={<Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color={C.blue} />} />
          <StatCard label="Solde restant" value={formatAr(totalSolde)} color={C.orange} icon={<Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color={C.orange} />} />
        </div>
      )}

      {/* ══ LISTE DES VENTES ══ */}
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ventes.length === 0 ? (
            <Card padding={40}>
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
                Aucune vente enregistrée.
              </div>
            </Card>
          ) : (
            ventes.map((v) => {
              const solde = v.reste_a_payer || 0;
              return (
                <Card key={v.id} padding={14}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{v.numero_facture || "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{v.client_nom || "—"} · {new Date(v.date_vente ?? "").toLocaleDateString("fr-FR")}</div>
                    </div>
                    <StatusBadge status={v.statut ?? "en_attente"} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
                    {[
                      { l: "TOTAL", v: formatAr(v.montant_total), c: C.gold },
                      { l: "PAYÉ", v: formatAr(v.montant_paye), c: C.success },
                      { l: "SOLDE", v: solde > 0 ? formatAr(solde) : "Payé", c: solde > 0 ? C.orange : C.success },
                    ].map((r) => (
                      <div key={r.l} style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 2 }}>{r.l}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: r.c }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                    <Button variant="secondary" size="sm" onClick={() => handlePrint(v.id)}>🖨️ Impr.</Button>
                    <Button variant="primary" size="sm" onClick={() => handleEdit(v)}>✏️ Modif.</Button>
                    <Button variant="danger" size="sm" onClick={() => setConfirmDelete(v.id)}>🗑️ Suppr.</Button>
                  </div>
                </Card>
              );
            })
          )}
          {ventes.length > 0 && (
            <Card padding={12}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 12 }}>TOTAL GÉNÉRAL</span>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ color: C.success, fontWeight: 800, fontSize: 13 }}>{formatAr(totalGeneral)}</span>
                  <span style={{ color: C.orange, fontWeight: 700, fontSize: 12 }}>Solde: {formatAr(totalSolde)}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card padding={0} style={{ overflow: "hidden" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Facture</TableHeader>
                <TableHeader>Client</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader align="right">Montant</TableHeader>
                <TableHeader align="right">Payé</TableHeader>
                <TableHeader align="right">Solde</TableHeader>
                <TableHeader align="center">Statut</TableHeader>
                <TableHeader align="center">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {ventes.length === 0 ? (
                <TableEmpty colSpan={8} message="Aucune vente" />
              ) : (
                ventes.map((v) => {
                  const solde = v.reste_a_payer || 0;
                  return (
                    <TableRow key={v.id}>
                      <TableCell style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: 12 }}>{v.numero_facture || "—"}</TableCell>
                      <TableCell>{v.client_nom || "—"}</TableCell>
                      <TableCell style={{ color: "var(--text-muted)", fontSize: 11 }}>{new Date(v.date_vente ?? "").toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell align="right" style={{ fontWeight: 600, color: C.gold }}>{formatAr(v.montant_total)}</TableCell>
                      <TableCell align="right" style={{ color: C.success }}>{formatAr(v.montant_paye)}</TableCell>
                      <TableCell align="right" style={{ color: solde > 0 ? C.orange : C.success, fontWeight: 600 }}>{solde > 0 ? formatAr(solde) : "Payé"}</TableCell>
                      <TableCell align="center"><StatusBadge status={v.statut ?? "en_attente"} /></TableCell>
                      <TableCell align="center">
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          <Button variant="secondary" size="sm" onClick={() => handlePrint(v.id)}>🖨️</Button>
                          <Button variant="primary" size="sm" onClick={() => handleEdit(v)}>✏️</Button>
                          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(v.id)}>🗑️</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {ventes.length > 0 && (
            <div style={{ padding: "12px 16px", background: "var(--bg)", borderTop: "2px solid var(--border)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>TOTAL GÉNÉRAL</span>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ color: C.success, fontWeight: 800 }}>{formatAr(totalGeneral)}</span>
                <span style={{ color: C.blue, fontWeight: 700 }}>Payé: {formatAr(totalPaye)}</span>
                <span style={{ color: C.orange, fontWeight: 700 }}>Solde: {formatAr(totalSolde)}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ══ MODAL NOUVELLE/ÉDITION VENTE ══ */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} width={isMobile ? 480 : 900}>
        <ModalHeader title={editMode ? "Modifier la vente" : "Nouvelle vente"} onClose={() => { setShowModal(false); resetForm(); }} />
        <ModalBody>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
            {/* Colonne gauche : Produits */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                🛍️ Produits
              </div>
              <Input placeholder="Rechercher un produit..." value={searchProduit} onChange={(e) => setSearchProduit(e.target.value)} style={{ marginBottom: 8 }} />
              <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {produitsFiltres.map((p) => (
                  <button key={p.id} onClick={() => addToCart(p)} disabled={!editMode && (p.quantite_stock ?? 0) <= 0}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px",
                      borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)",
                      cursor: (p.quantite_stock ?? 0) <= 0 && !editMode ? "not-allowed" : "pointer",
                      opacity: (p.quantite_stock ?? 0) <= 0 && !editMode ? 0.5 : 1,
                      textAlign: "left", fontFamily: "var(--font)", fontSize: 12,
                    }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{p.nom}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Stock: {p.quantite_stock} · {formatAr(p.prix_vente)}</div>
                    </div>
                    <span style={{ fontSize: 16, color: C.success }}>＋</span>
                  </button>
                ))}
                {produitsFiltres.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 16, fontSize: 12 }}>Aucun produit trouvé</div>
                )}
              </div>
            </div>

            {/* Colonne droite : Panier + Formulaire */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                🛒 Panier ({panier.length})
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                {panier.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 20, fontSize: 12, border: "1px dashed var(--border)", borderRadius: 8 }}>
                    Panier vide
                  </div>
                ) : (
                  panier.map((p) => (
                    <div key={p.produit_id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 11, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nom}</div>
                      </div>
                      <input type="number" min={1} value={p.quantite} onChange={(e) => updateCartQty(p.produit_id, parseInt(e.target.value) || 0)}
                        style={{ width: 50, padding: "3px 6px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 11, textAlign: "center", outline: "none" }} />
                      <input type="number" value={p.prix_unitaire} onChange={(e) => updateCartPrice(p.produit_id, parseFloat(e.target.value) || 0)}
                        style={{ width: 70, padding: "3px 6px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 11, textAlign: "center", outline: "none" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, minWidth: 60, textAlign: "right" }}>{formatAr(p.sous_total)}</span>
                      <button onClick={() => updateCartQty(p.produit_id, 0)} style={{ width: 24, height: 24, borderRadius: 6, background: C.dangerDim, border: "1px solid rgba(248,113,113,0.2)", color: C.danger, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✕</button>
                    </div>
                  ))
                )}
              </div>

              {/* Totaux panier */}
              {panier.length > 0 && (
                <div style={{ padding: "8px 10px", background: "var(--bg)", borderRadius: 8, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--text-muted)" }}>Sous-total</span>
                    <span style={{ fontWeight: 600 }}>{formatAr(totalPanier)}</span>
                  </div>
                  {form.remise > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 2 }}>
                      <span style={{ color: C.danger }}>Remise</span>
                      <span style={{ color: C.danger, fontWeight: 600 }}>-{formatAr(form.remise)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4, paddingTop: 4, borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontWeight: 700 }}>TOTAL</span>
                    <span style={{ fontWeight: 800, color: C.gold, fontSize: 16 }}>{formatAr(totalFinal)}</span>
                  </div>
                </div>
              )}

              {/* Formulaire */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Input label="Client" placeholder="Nom du client" value={form.client_nom} onChange={(e) => setForm({ ...form, client_nom: e.target.value })} />
                <Input label="Tél" placeholder="034 00 000 00" value={form.client_telephone} onChange={(e) => setForm({ ...form, client_telephone: e.target.value })} />
                <Select label="Paiement" value={form.type_paiement} onChange={(e) => setForm({ ...form, type_paiement: e.target.value })} options={PAIEMENT_OPTIONS} />
                <Input type="date" label="Date" value={form.date_vente} onChange={(e) => setForm({ ...form, date_vente: e.target.value })} />
                <Input type="number" label="Remise (Ar)" value={String(form.remise)} onChange={(e) => setForm({ ...form, remise: parseFloat(e.target.value) || 0 })} />
                <Input type="number" label="Payé (Ar)" value={String(form.montant_paye)} onChange={(e) => setForm({ ...form, montant_paye: parseFloat(e.target.value) || 0 })} />
              </div>
              {resteAPayer > 0 && (
                <div style={{ marginTop: 6, padding: "6px 10px", background: C.orangeDim, borderRadius: 8, fontSize: 11, color: C.orange, fontWeight: 600 }}>
                  Reste à payer : {formatAr(resteAPayer)}
                </div>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
          <Button variant="success" onClick={handleSubmit} loading={saving} disabled={saving || panier.length === 0}>
            {editMode ? "Modifier" : "Enregistrer"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
