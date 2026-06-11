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

interface PanierItem {
  produit_id: string; nom: string; quantite: number; prix_unitaire: number; sous_total: number;
}

export default function Achats() {
  const { currentCompany } = useApp();
  const { success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
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
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ MODALS ══ */}
      <ConfirmDialog open={!!confirmDelete} title="Supprimer cet achat ?" message="Cette action est irréversible. Le stock sera ajusté." onConfirm={executeDelete} onCancel={() => setConfirmDelete(null)} variant="danger" />

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.orangeDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" size={18} color={C.orange} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Achats</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>{currentCompany?.name} · {achats.length} commande(s)</p>
          </div>
        </div>
        <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }}>＋ Nouvel achat</Button>
      </div>

      {/* ══ STATS ══ */}
      {achats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
          <StatCard label="Total général" value={formatAr(totalGeneral)} color={C.orange} icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color={C.orange} />} />
          <StatCard label="Total payé" value={formatAr(totalPaye)} color={C.success} icon={<Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color={C.success} />} />
          <StatCard label="Solde restant" value={formatAr(totalSolde)} color={C.danger} icon={<Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color={C.danger} />} />
        </div>
      )}

      {/* ══ LISTE DES ACHATS ══ */}
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {achats.length === 0 ? (
            <Card padding={40}>
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
                Aucun achat enregistré.
              </div>
            </Card>
          ) : (
            achats.map((a) => {
              const solde = (a.montant_total || 0) - (a.montant_paye || 0);
              return (
                <Card key={a.id} padding={14}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{a.numero_commande || "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{a.fournisseur_nom || "—"} · {new Date(a.date_achat ?? "").toLocaleDateString("fr-FR")}</div>
                    </div>
                    <Badge variant={solde > 0 ? "warning" : "success"} size="sm">{solde > 0 ? "Crédit" : "Soldé"}</Badge>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
                    {[
                      { l: "TOTAL", v: formatAr(a.montant_total), c: C.orange },
                      { l: "PAYÉ", v: formatAr(a.montant_paye), c: C.success },
                      { l: "SOLDE", v: solde > 0 ? formatAr(solde) : "Payé", c: solde > 0 ? C.danger : C.success },
                    ].map((r) => (
                      <div key={r.l} style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 2 }}>{r.l}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: r.c }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <Button variant="secondary" size="sm" onClick={() => handleEditAchat(a)}>✏️ Modifier</Button>
                    <Button variant="danger" size="sm" onClick={() => setConfirmDelete(a.id)}>🗑️ Supprimer</Button>
                  </div>
                </Card>
              );
            })
          )}
          {achats.length > 0 && (
            <Card padding={12}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 12 }}>TOTAL GÉNÉRAL</span>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ color: C.orange, fontWeight: 800, fontSize: 13 }}>{formatAr(totalGeneral)}</span>
                  <span style={{ color: C.danger, fontWeight: 700, fontSize: 12 }}>Solde: {formatAr(totalSolde)}</span>
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
                      <TableCell style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: 12 }}>{a.numero_commande || "—"}</TableCell>
                      <TableCell>{a.fournisseur_nom || "—"}</TableCell>
                      <TableCell style={{ color: "var(--text-muted)", fontSize: 11 }}>{new Date(a.date_achat ?? "").toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell align="right" style={{ fontWeight: 600, color: C.orange }}>{formatAr(a.montant_total)}</TableCell>
                      <TableCell align="right" style={{ color: C.success }}>{formatAr(a.montant_paye)}</TableCell>
                      <TableCell align="right" style={{ color: solde > 0 ? C.danger : C.success, fontWeight: 600 }}>{solde > 0 ? formatAr(solde) : "Payé"}</TableCell>
                      <TableCell align="center"><Badge variant={solde > 0 ? "warning" : "success"} size="sm">{solde > 0 ? "Crédit" : "Soldé"}</Badge></TableCell>
                      <TableCell align="center">
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
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
            <div style={{ padding: "12px 16px", background: "var(--bg)", borderTop: "2px solid var(--border)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>TOTAL GÉNÉRAL</span>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ color: C.orange, fontWeight: 800 }}>{formatAr(totalGeneral)}</span>
                <span style={{ color: C.success, fontWeight: 700 }}>Payé: {formatAr(totalPaye)}</span>
                <span style={{ color: C.danger, fontWeight: 700 }}>Solde: {formatAr(totalSolde)}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ══ MODAL NOUVEL/ÉDITION ACHAT ══ */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} width={isMobile ? 480 : 900}>
        <ModalHeader title={editMode ? "Modifier l'achat" : "Nouvel achat"} onClose={() => { setShowModal(false); resetForm(); }} />
        <ModalBody>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
            {/* Colonne gauche : Produits */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>🛍️ Produits</div>
              <Input placeholder="Rechercher un produit..." value={searchProduit} onChange={(e) => setSearchProduit(e.target.value)} style={{ marginBottom: 8 }} />
              <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {produitsFiltres.map((p) => (
                  <button key={p.id} onClick={() => addToCart(p)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font)", fontSize: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{p.nom}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Stock: {p.quantite_stock} · {formatAr(p.prix_achat)}</div>
                    </div>
                    <span style={{ fontSize: 16, color: C.success }}>＋</span>
                  </button>
                ))}
                {produitsFiltres.length === 0 && <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 16, fontSize: 12 }}>Aucun produit trouvé</div>}
              </div>
            </div>

            {/* Colonne droite : Panier + Formulaire */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>🛒 Panier ({panier.length})</div>
              <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                {panier.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 20, fontSize: 12, border: "1px dashed var(--border)", borderRadius: 8 }}>Panier vide</div>
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

              {/* Totaux */}
              {panier.length > 0 && (
                <div style={{ padding: "8px 10px", background: "var(--bg)", borderRadius: 8, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--text-muted)" }}>Sous-total</span>
                    <span style={{ fontWeight: 600 }}>{formatAr(totalPanier)}</span>
                  </div>
                  {form.tva > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 2 }}>
                      <span style={{ color: "var(--text-muted)" }}>TVA</span>
                      <span style={{ fontWeight: 600 }}>{formatAr(form.tva)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4, paddingTop: 4, borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontWeight: 700 }}>TOTAL</span>
                    <span style={{ fontWeight: 800, color: C.orange, fontSize: 16 }}>{formatAr(totalAvecTVA)}</span>
                  </div>
                </div>
              )}

              {/* Formulaire */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
