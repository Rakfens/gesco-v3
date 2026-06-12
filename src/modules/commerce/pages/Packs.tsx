"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button, Card, CardHeader, CardTitle, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  Select, StatCard, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Pack, Produit } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { fetchPacks, fetchPackWithProduits, createPack, updatePack, deletePack } from "@/modules/commerce/services/packService";
import { fetchProduits } from "@/modules/commerce/services/produitService";

/* ─── Colors ─── */
const C = {
  gold: "#c9a96e", goldDim: "rgba(201,169,110,0.1)",
  success: "#34d399", successDim: "rgba(52,211,153,0.1)",
  warning: "#fbbf24", warningDim: "rgba(251,191,36,0.1)",
  danger: "#f87171", dangerDim: "rgba(248,113,113,0.1)",
  violet: "#8b5cf6", violetDim: "rgba(139,92,246,0.1)",
  blue: "#60a5fa", blueDim: "rgba(96,165,250,0.1)",
  orange: "#fb923c", orangeDim: "rgba(251,146,60,0.1)",
  pink: "#f472b6", pinkDim: "rgba(244,114,182,0.1)",
};

const Icon = ({ d, size = 16, color = "currentColor" }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/* ─── Types ─── */
interface PackProduitForm {
  produit_id: string;
  quantite: number;
}

export default function PacksPage() {
  const { currentCompany, success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
  const isMobile = useIsMobile();

  const [packs, setPacks] = useState<Pack[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);
  const [detailPack, setDetailPack] = useState<Pack | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form state
  const [formNom, setFormNom] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrix, setFormPrix] = useState("");
  const [formProduits, setFormProduits] = useState<PackProduitForm[]>([]);

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [p, pr] = await Promise.all([
        fetchPacks(),
        fetchProduits({ isActive: true }),
      ]);
      setPacks(p);
      setProduits(pr);
    } catch (e: unknown) {
      toastError("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentCompany]);

  // Stats
  const stats = useMemo(() => ({
    total: packs.length,
    totalProduits: packs.reduce((s, p) => s + (p.produits?.length || 0), 0),
    valeurTotal: packs.reduce((s, p) => s + (p.prix || 0), 0),
  }), [packs]);

  // Form handlers
  const resetForm = () => {
    setFormNom("");
    setFormDescription("");
    setFormPrix("");
    setFormProduits([]);
    setEditMode(false);
    setSelectedPack(null);
  };

  const openCreateModal = () => {
    resetForm();
    setFormProduits([{ produit_id: "", quantite: 1 }]);
    setShowModal(true);
  };

  const openEditModal = async (pack: Pack) => {
    const packComplet = await fetchPackWithProduits(pack.id);
    if (!packComplet) return;

    setEditMode(true);
    setSelectedPack(pack);
    setFormNom(pack.nom);
    setFormDescription(pack.description || "");
    setFormPrix(String(pack.prix));
    setFormProduits(
      (packComplet.produits || []).map((pp) => ({
        produit_id: String(pp.produit_id),
        quantite: pp.quantite,
      }))
    );
    setShowModal(true);
  };

  const addProduitLine = () => {
    setFormProduits([...formProduits, { produit_id: "", quantite: 1 }]);
  };

  const removeProduitLine = (index: number) => {
    setFormProduits(formProduits.filter((_, i) => i !== index));
  };

  const updateProduitLine = (index: number, field: "produit_id" | "quantite", value: string | number) => {
    setFormProduits(formProduits.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleSubmit = async () => {
    if (!formNom.trim()) { toastWarn("Le nom du pack est requis"); return; }
    if (!formPrix || parseFloat(formPrix) <= 0) { toastWarn("Le prix doit être > 0"); return; }
    if (formProduits.length === 0 || formProduits.some((p) => !p.produit_id)) {
      toastWarn("Ajoutez au moins un produit valide");
      return;
    }

    setSaving(true);
    try {
      const produitsData = formProduits
        .filter((p) => p.produit_id)
        .map((p) => ({ produit_id: p.produit_id, quantite: p.quantite }));

      if (editMode && selectedPack) {
        await updatePack(selectedPack.id, formNom, formDescription, parseFloat(formPrix), produitsData);
        toastSuccess("Pack modifié");
      } else {
        await createPack(formNom, formDescription, parseFloat(formPrix), produitsData);
        toastSuccess("Pack créé");
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    try {
      await deletePack(showDeleteModal);
      toastSuccess("Pack supprimé");
      setShowDeleteModal(null);
      loadData();
    } catch (e: unknown) {
      toastError("Erreur lors de la suppression");
    }
  };

  const openDetailModal = async (packId: string) => {
    setDetailLoading(true);
    setShowDetailModal(packId);
    try {
      const pack = await fetchPackWithProduits(packId);
      setDetailPack(pack);
    } catch {
      toastError("Erreur lors du chargement des détails");
    } finally {
      setDetailLoading(false);
    }
  };

  const produitNom = (id: string) => {
    const p = produits.find((pr) => String(pr.id) === String(id));
    return p?.nom || `Produit #${id}`;
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
        Chargement des packs...
      </div>
    );
  }

  return (
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.pinkDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={18} color={C.pink} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Packs</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>{currentCompany?.name} · {packs.length} pack(s)</p>
          </div>
        </div>
        <Button variant="primary" onClick={openCreateModal}>＋ Nouveau pack</Button>
      </div>

      {/* ══ STATS ══ */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        <StatCard label="Total packs" value={stats.total} color={C.pink} icon={<Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={18} color={C.pink} />} />
        <StatCard label="Total produits" value={stats.totalProduits} color={C.blue} icon={<Icon d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" size={18} color={C.blue} />} />
        <StatCard label="Valeur totale" value={formatAr(stats.valeurTotal)} color={C.gold} icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color={C.gold} />} />
      </div>

      {/* ══ LISTE DES PACKS ══ */}
      {packs.length === 0 ? (
        <Card padding={40}>
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
            Aucun pack créé. Cliquez sur "Nouveau pack" pour commencer.
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {packs.map((pack) => (
            <Card key={pack.id} padding={0} style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: C.pinkDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 20 }}>📦</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{pack.nom}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {pack.produits?.length || 0} produit(s) · {pack.description || "Pas de description"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.gold }}>{formatAr(pack.prix)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button variant="secondary" size="sm" onClick={() => openDetailModal(pack.id)}>👁️ Voir</Button>
                      <Button variant="primary" size="sm" onClick={() => openEditModal(pack)}>✏️</Button>
                      <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(pack.id)}>🗑️</Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ══ MODAL CRÉER/ÉDITER PACK ══ */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} width={isMobile ? 480 : 700}>
        <ModalHeader title={editMode ? "Modifier le pack" : "Nouveau pack"} onClose={() => { setShowModal(false); resetForm(); }} />
        <ModalBody>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <Input label="Nom du pack *" placeholder="Ex: Pack Mahampy" value={formNom} onChange={(e) => setFormNom(e.target.value)} />
            <Input label="Prix (Ar) *" type="number" placeholder="120000" value={formPrix} onChange={(e) => setFormPrix(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Input label="Description" placeholder="Description du pack..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
          </div>

          {/* Liste des produits du pack */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
            Produits du pack ({formProduits.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {formProduits.map((fp, index) => (
              <div key={index} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={fp.produit_id}
                  onChange={(e) => updateProduitLine(index, "produit_id", e.target.value)}
                  style={{
                    flex: 1, padding: "8px 12px", background: "var(--card)", border: "1px solid var(--border)",
                    borderRadius: 8, color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "var(--font)",
                  }}
                >
                  <option value="">-- Choisir un produit --</option>
                  {produits.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom} (Stock: {p.quantite_stock})</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={fp.quantite}
                  onChange={(e) => updateProduitLine(index, "quantite", parseInt(e.target.value) || 1)}
                  style={{ width: 60, padding: "8px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, textAlign: "center", outline: "none" }}
                />
                <button
                  onClick={() => removeProduitLine(index)}
                  style={{ width: 32, height: 32, borderRadius: 8, background: C.dangerDim, border: "1px solid rgba(248,113,113,0.2)", color: C.danger, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >✕</button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={addProduitLine} style={{ marginBottom: 8 }}>
            ＋ Ajouter un produit
          </Button>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={saving}>
            {editMode ? "Modifier" : "Créer"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ══ MODAL DÉTAILS PACK ══ */}
      <Modal open={!!showDetailModal} onClose={() => { setShowDetailModal(null); setDetailPack(null); }} width={isMobile ? 480 : 600}>
        <ModalHeader title={detailPack?.nom || "Détails du pack"} onClose={() => { setShowDetailModal(null); setDetailPack(null); }} />
        <ModalBody>
          {detailLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Chargement...</div>
          ) : detailPack ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{ padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Prix</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.gold }}>{formatAr(detailPack.prix)}</div>
                </div>
                <div style={{ padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Produits</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.blue }}>{detailPack.produits?.length || 0}</div>
                </div>
              </div>
              {detailPack.description && (
                <div style={{ padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Description</div>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>{detailPack.description}</div>
                </div>
              )}
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Produits du pack</div>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Produit</TableHeader>
                    <TableHeader align="center">Qté</TableHeader>
                    <TableHeader align="right">Prix unit.</TableHeader>
                    <TableHeader align="right">Sous-total</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailPack.produits?.map((pp, idx) => {
                    const produit = pp.produit as Produit | undefined;
                    return (
                      <TableRow key={idx}>
                        <TableCell style={{ fontWeight: 600 }}>{produit?.nom || `Produit #${pp.produit_id}`}</TableCell>
                        <TableCell align="center">{pp.quantite}</TableCell>
                        <TableCell align="right">{formatAr(produit?.prix_vente || 0)}</TableCell>
                        <TableCell align="right" style={{ color: C.gold, fontWeight: 600 }}>
                          {formatAr((produit?.prix_vente || 0) * pp.quantite)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Pack introuvable</div>
          )}
        </ModalBody>
      </Modal>

      {/* ══ MODAL SUPPRESSION ══ */}
      <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)}>
        <ModalHeader title="Supprimer le pack ?" onClose={() => setShowDeleteModal(null)} />
        <ModalBody>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center" }}>
            Cette action est irréversible. Le pack sera supprimé définitivement.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteModal(null)}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} loading={saving}>Supprimer</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
