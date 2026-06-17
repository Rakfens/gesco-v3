"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Produit } from "@/modules/shared/types";
import { UNITES } from "@/modules/shared/utils/constants";
import { formatAr } from "@/modules/shared/utils/constants";
import { getSupabase } from "@/lib/supabase";
import {
  createProduit,
  deleteProduit,
  fetchCategories,
  fetchProduits,
  updateProduit,
  updateStock,
} from "../services/produitService";

const Icon = ({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
  <path d={d} />
  </svg>
);

/* ─── Types ─── */
interface Mouvement {
  id: string;
  type: string;
  quantite: number;
  notes?: string;
  date_mouvement?: string;
}

/* ─── Card produit (mobile) ─── */
function ProduitCard({
  p,
  onEdit,
  onMovement,
  onHistory,
  onDelete,
}: {
  p: Produit;
  onEdit: (p: Produit) => void;
  onMovement: (p: Produit) => void;
  onHistory: (p: Produit) => void;
  onDelete: (p: Produit) => void;
}) {
  const marge = p.prix_vente && p.prix_achat ? (((p.prix_vente - p.prix_achat) / p.prix_achat) * 100).toFixed(0) : null;
  const isOut = (p.quantite_stock ?? 0) === 0;
  const isLow = !isOut && (p.quantite_stock ?? 0) <= (p.stock_minimum ?? 0);
  const statusVariant = isOut ? ("danger" as const) : isLow ? ("warning" as const) : ("success" as const);
  const statusLabel = isOut ? "Rupture" : isLow ? "Stock bas" : "OK";
  const stockColor = isOut ? "text-destructive" : isLow ? "text-warning" : "text-foreground";
  const borderColor = isOut ? "border-destructive" : isLow ? "border-warning" : "border-success";

  return (
    <Card className={`overflow-hidden border-l-[4px] ${borderColor} glass-card`}>
    <div className="p-4">
    <div className="flex justify-between items-start gap-2 mb-3">
    <div className="flex-1 min-w-0">
    <div className="font-bold text-sm text-foreground truncate">{p.nom}</div>
    {p.reference && <div className="text-[10px] text-muted-foreground mt-0.5">Réf: {p.reference}</div>}
    {p.categorie && (
      <span className="text-[9px] py-px px-1.5 rounded-full bg-violet/10 text-violet mt-1 inline-block">
      {p.categorie}
      </span>
    )}
    </div>
    <Badge variant={statusVariant} size="sm" className={isOut ? "glow-danger" : isLow ? "glow-warning" : "glow-success"}>
    {statusLabel}
    </Badge>
    </div>

    <div className="grid grid-cols-3 gap-2 mb-3">
    {[
      { l: "ACHAT", v: formatAr(p.prix_achat), color: "text-warning" },
          { l: "VENTE", v: formatAr(p.prix_vente), color: "text-success" },
          { l: "STOCK", v: `${p.quantite_stock} ${p.unite || ""}`, color: stockColor },
    ].map((r) => (
      <div key={r.l} className="bg-background rounded-lg py-1.5 px-2 text-center">
      <div className="text-[9px] text-muted-foreground mb-0.5">{r.l}</div>
      <div className={`text-xs font-bold ${r.color}`}>{r.v}</div>
      </div>
    ))}
    </div>

    {marge !== null && (
      <div className="flex items-center gap-1.5 mb-3">
      <span className="text-[10px] text-muted-foreground">Marge :</span>
      <Badge variant={Number(marge) >= 20 ? "success" : Number(marge) >= 0 ? "warning" : "danger"} size="sm">
      {marge}%
      </Badge>
      {(p.stock_minimum ?? 0) > 0 && (
        <span className="text-[10px] text-muted-foreground ml-auto">Min: {p.stock_minimum}</span>
      )}
      </div>
    )}

    <div className="grid grid-cols-4 gap-1.5">
    <Button variant="secondary" size="sm" onClick={() => onEdit(p)} className="btn-press">✏️</Button>
    <Button variant="primary" size="sm" onClick={() => onMovement(p)} className="btn-press">📦</Button>
    <Button variant="ghost" size="sm" onClick={() => onHistory(p)} className="text-violet hover:text-violet/80 btn-press">📋</Button>
    <Button variant="danger" size="sm" onClick={() => onDelete(p)} className="btn-press">🗑️</Button>
    </div>
    </div>
    </Card>
  );
}

export default function Stock() {
  const { currentCompany, success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
  const isMobile = useIsMobile();
  const router = useRouter();

  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [editMode, setEditMode] = useState(false);

  const [filter, setFilter] = useState("");
  const [categorieFilter, setCategorieFilter] = useState("");

  const [form, setForm] = useState({
    nom: "",
    reference: "",
    categorie: "",
    prix_achat: 0,
    prix_vente: 0,
    quantite_stock: 0,
    stock_minimum: 0,
    unite: "pièce",
  });

  const [movementForm, setMovementForm] = useState({ type: "entree", quantite: 0, notes: "" });

  const uniteOptions = useMemo(() => UNITES.map((u) => ({ value: u, label: u })), []);

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [pd, cd] = await Promise.all([fetchProduits(), fetchCategories()]);
      setProduits(pd);
      setCategories(cd);
    } catch {
      toastError("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany]);

    useEffect(() => {
      const handler = (e: Event) => {
        if (["produits", "mouvements_stock"].includes((e as CustomEvent)?.detail?.table)) {
          loadData();
        }
      };
      window.addEventListener("supabase_realtime", handler);
      return () => window.removeEventListener("supabase_realtime", handler);
    }, []);

    const loadMouvements = async (produitId: string) => {
      if (!currentCompany) return;
      try {
        const { data, error } = await getSupabase()
        .from("mouvements_stock")
        .select("*, produit:produits(id,nom)")
        .eq("produit_id", produitId)
        .eq("company_id", currentCompany.id)
        .order("date_mouvement", { ascending: false })
        .limit(50);
        if (error) throw error;
        setMouvements(data || []);
      } catch {
        toastError("Erreur lors du chargement de l'historique");
      }
    };

    const resetForm = () => {
      setForm({ nom: "", reference: "", categorie: "", prix_achat: 0, prix_vente: 0, quantite_stock: 0, stock_minimum: 0, unite: "pièce" });
      setEditMode(false);
      setSelectedProduit(null);
    };

    const resetMovForm = () => {
      setMovementForm({ type: "entree", quantite: 0, notes: "" });
      setSelectedProduit(null);
    };

    const handleSubmit = async () => {
      if (!form.nom.trim()) {
        toastWarn("Nom du produit requis");
        return;
      }
      setSaving(true);
      try {
        if (editMode && selectedProduit) {
          await updateProduit(selectedProduit.id, form);
          toastSuccess("Produit modifié");
        } else {
          await createProduit(form);
          toastSuccess("Produit créé");
        }
        setShowModal(false);
        resetForm();
        loadData();
      } catch {
        toastError("Erreur lors de la sauvegarde");
      } finally {
        setSaving(false);
      }
    };

    const handleMovement = async () => {
      if (!selectedProduit) return;
      if (movementForm.quantite <= 0) {
        toastWarn("Quantité > 0 requise");
        return;
      }
      const newQty =
      movementForm.type === "entree"
      ? (selectedProduit.quantite_stock ?? 0) + movementForm.quantite
      : (selectedProduit.quantite_stock ?? 0) - movementForm.quantite;
      if (newQty < 0) {
        toastWarn("Stock insuffisant");
        return;
      }
      setSaving(true);
      try {
        await updateStock(selectedProduit.id, newQty, movementForm.notes || movementForm.type);
        toastSuccess(movementForm.type === "entree" ? `+${movementForm.quantite} ajouté` : `-${movementForm.quantite} sorti`);
        setShowMovementModal(false);
        resetMovForm();
        loadData();
      } catch {
        toastError("Erreur lors du mouvement");
      } finally {
        setSaving(false);
      }
    };

    const handleDeleteProduit = (produit: Produit) => {
      if ((produit.quantite_stock ?? 0) > 0) {
        toastWarn(`Impossible : "${produit.nom}" a encore ${produit.quantite_stock} unité(s)`);
        return;
      }
      setShowDeleteModal(produit.id);
    };

    const executeDelete = async () => {
      if (!showDeleteModal) return;
      const produit = produits.find((p) => p.id === showDeleteModal);
      if (!produit) return;
      setShowDeleteModal(null);
      try {
        await deleteProduit(produit.id);
        toastSuccess(`"${produit.nom}" supprimé`);
        loadData();
      } catch {
        toastError("Erreur lors de la suppression");
      }
    };

    const editProduit = (produit: Produit) => {
      setSelectedProduit(produit);
      setForm({
        nom: produit.nom,
        reference: produit.reference || "",
        categorie: produit.categorie || "",
        prix_achat: produit.prix_achat ?? 0,
        prix_vente: produit.prix_vente ?? 0,
        quantite_stock: produit.quantite_stock ?? 0,
        stock_minimum: produit.stock_minimum ?? 0,
        unite: produit.unite ?? "pièce",
      });
      setEditMode(true);
      setShowModal(true);
    };

    const handleViewHistory = async (produit: Produit) => {
      setSelectedProduit(produit);
      await loadMouvements(produit.id);
      setShowHistoryModal(true);
    };

    const filtered = useMemo(() => {
      return produits.filter((p) => {
        if (filter && !p.nom.toLowerCase().includes(filter.toLowerCase()) && !(p.reference || "").toLowerCase().includes(filter.toLowerCase())) {
          return false;
        }
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

    if (loading) {
      return (
        <div className="p-5 text-center text-muted-foreground animate-fade-in">
        Chargement du stock...
        </div>
      );
    }

    return (
      <div className="pb-6 transition-all duration-500 ease-out">
      {/* ══ HEADER ══ */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
      <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-info/10 flex items-center justify-center">
      <Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={18} className="text-info" />
      </div>
      <div>
      <h1 className={`font-extrabold m-0 text-foreground ${isMobile ? "text-xl" : "text-2xl"}`}>
      Stock
      </h1>
      <p className="text-xs text-muted-foreground mt-0.5">
      {currentCompany?.name} · {produits.length} produit(s)
      </p>
      </div>
      </div>
      <div className="flex gap-2">
      <Button variant="secondary" size="sm" onClick={() => router.push("/commerce/rapports")} className="btn-press">
      ← Rapports
      </Button>
      <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }} className="btn-press shadow-gold">
      ＋ Nouveau produit
      </Button>
      </div>
      </div>

      {/* ══ STATS ══ */}
      <div className={isMobile ? "grid grid-cols-2 gap-2.5 mb-4 stagger-children" : "grid grid-cols-4 gap-2.5 mb-4 stagger-children"}>
      <StatCard
      label="Total produits"
      value={stats.total}
      color="info"
      icon={<Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={18} />}
      />
      <StatCard
      label="Stock bas"
      value={stats.low}
      color="warning"
      icon={<Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" size={18} />}
      />
      <StatCard
      label="Rupture"
      value={stats.out}
      color="danger"
      icon={<Icon d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" size={18} />}
      />
      <StatCard
      label="Valeur stock"
      value={formatAr(stats.valeur)}
      color="accent"
      icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} />}
      />
      </div>

      {/* ══ FILTRES ══ */}
      <Card className="glass-card mb-4">
      <div className={isMobile ? "grid grid-cols-1 gap-2 items-end" : "grid grid-cols-[1fr_auto_auto] gap-2 items-end"}>
      <Input placeholder="Rechercher un produit..." value={filter} onChange={(e) => setFilter(e.target.value)} className="input-focus" />
      <Select
      placeholder="Toutes catégories"
      value={categorieFilter}
      onChange={(e) => setCategorieFilter(e.target.value)}
      options={[{ value: "", label: "Toutes" }, ...categoryOptions]}
      />
      {(filter || categorieFilter) && (
        <Button variant="ghost" size="sm" onClick={() => { setFilter(""); setCategorieFilter(""); }} className="btn-press">
        ✕ Effacer
        </Button>
      )}
      </div>
      </Card>

      {/* ══ LISTE ══ */}
      {isMobile ? (
        <div className="flex flex-col gap-3 stagger-children">
        {filtered.length === 0 ? (
          <Card padding={40} className="glass-card">
          <div className="text-center text-muted-foreground text-[13px]">
          <div className="text-[32px] mb-2">📦</div>
          {produits.length === 0 ? 'Aucun produit enregistré. Cliquez sur "Nouveau produit" pour commencer.' : "Aucun produit ne correspond à votre recherche."}
          </div>
          </Card>
        ) : (
          filtered.map((p) => (
            <ProduitCard
            key={p.id}
            p={p}
            onEdit={editProduit}
            onMovement={(pr) => { setSelectedProduit(pr); setShowMovementModal(true); }}
            onHistory={handleViewHistory}
            onDelete={handleDeleteProduit}
            />
          ))
        )}
        </div>
      ) : (
        <Card padding={0} className="overflow-hidden glass-card">
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
        ) : (
          filtered.map((p) => {
            const isOut = (p.quantite_stock ?? 0) === 0;
            const isLow = !isOut && (p.quantite_stock ?? 0) <= (p.stock_minimum ?? 0);
            return (
              <TableRow key={p.id} className="table-row-hover">
              <TableCell>
              <div className="font-semibold text-sm text-foreground">{p.nom}</div>
              {p.reference && <div className="text-[10px] text-muted-foreground">Réf: {p.reference}</div>}
              </TableCell>
              <TableCell>
              {p.categorie ? <Badge variant="purple" size="sm">{p.categorie}</Badge> : "—"}
              </TableCell>
              <TableCell align="right" className="text-warning font-semibold">
              {formatAr(p.prix_achat)}
              </TableCell>
              <TableCell align="right" className="text-success font-semibold">
              {formatAr(p.prix_vente)}
              </TableCell>
              <TableCell align="right" className={`font-bold ${isOut ? "text-destructive" : isLow ? "text-warning" : "text-foreground"}`}>
              {p.quantite_stock} {p.unite || ""}
              </TableCell>
              <TableCell align="center">
              <Badge variant={isOut ? "danger" : isLow ? "warning" : "success"} size="sm" className={isOut ? "glow-danger" : isLow ? "glow-warning" : "glow-success"}>
              {isOut ? "Rupture" : isLow ? "Bas" : "OK"}
              </Badge>
              </TableCell>
              <TableCell align="center">
              <div className="flex gap-1 justify-center">
              <Button variant="secondary" size="sm" onClick={() => editProduit(p)} className="btn-press">✏️</Button>
              <Button variant="primary" size="sm" onClick={() => { setSelectedProduit(p); setShowMovementModal(true); }} className="btn-press">📦</Button>
              <Button variant="ghost" size="sm" onClick={() => handleViewHistory(p)} className="text-violet btn-press">📋</Button>
              <Button variant="danger" size="sm" onClick={() => handleDeleteProduit(p)} className="btn-press">🗑️</Button>
              </div>
              </TableCell>
              </TableRow>
            );
          })
        )}
        </TableBody>
        </Table>
        </Card>
      )}

      {/* ══ MODAL CRÉER/ÉDITER PRODUIT ══ */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} width={isMobile ? 480 : 600}>
      <ModalHeader title={editMode ? "Modifier le produit" : "Nouveau produit"} onClose={() => { setShowModal(false); resetForm(); }} />
      <ModalBody>
      <div className={isMobile ? "grid grid-cols-1 gap-2.5 mb-4" : "grid grid-cols-2 gap-2.5 mb-4"}>
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
      <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={saving} className="btn-press shadow-gold">
      {editMode ? "Modifier" : "Créer"}
      </Button>
      </ModalFooter>
      </Modal>

      {/* ══ MODAL MOUVEMENT STOCK ══ */}
      <Modal open={showMovementModal} onClose={() => { setShowMovementModal(false); resetMovForm(); }}>
      <ModalHeader title="Mouvement de stock" onClose={() => { setShowMovementModal(false); resetMovForm(); }} />
      <ModalBody>
      {selectedProduit && (
        <>
        <div className="p-3 bg-background rounded-lg mb-3">
        <div className="font-bold text-sm text-foreground">{selectedProduit.nom}</div>
        <div className="text-xs text-muted-foreground">
        Stock actuel : {selectedProduit.quantite_stock} {selectedProduit.unite || ""}
        </div>
        </div>
        <div className={isMobile ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-2"}>
        <Select
        label="Type"
        value={movementForm.type}
        onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })}
        options={[{ value: "entree", label: "📥 Entrée" }, { value: "sortie", label: "📤 Sortie" }]}
        />
        <Input type="number" label="Quantité" value={String(movementForm.quantite)} onChange={(e) => setMovementForm({ ...movementForm, quantite: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="mt-2">
        <Input label="Notes (optionnel)" placeholder="Ex: Inventaire, Casse..." value={movementForm.notes} onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })} />
        </div>
        </>
      )}
      </ModalBody>
      <ModalFooter>
      <Button variant="secondary" onClick={() => { setShowMovementModal(false); resetMovForm(); }} className="btn-press">Annuler</Button>
      <Button variant="primary" onClick={handleMovement} loading={saving} disabled={saving} className="btn-press">
      Enregistrer
      </Button>
      </ModalFooter>
      </Modal>

      {/* ══ MODAL HISTORIQUE ══ */}
      <Modal open={showHistoryModal} onClose={() => setShowHistoryModal(false)} width={isMobile ? 480 : 500}>
      <ModalHeader title="Historique des mouvements" onClose={() => setShowHistoryModal(false)} />
      <ModalBody>
      {selectedProduit && (
        <div className="p-2 bg-background rounded-lg mb-3">
        <div className="font-bold text-sm text-foreground">{selectedProduit.nom}</div>
        </div>
      )}
      {mouvements.length === 0 ? (
        <div className="text-center text-muted-foreground p-5 text-[13px]">Aucun mouvement</div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto space-y-1">
        {mouvements.map((m) => (
          <div key={m.id} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-background transition-colors">
          <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold py-px px-1.5 rounded-full ${m.type === "entree" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
          {m.type === "entree" ? "ENTRÉE" : "SORTIE"}
          </span>
          <span className="text-xs font-semibold text-foreground">×{m.quantite}</span>
          {m.notes && <span className="text-[10px] text-muted-foreground">· {m.notes}</span>}
          </div>
          <span className="text-[10px] text-muted-foreground">
          {m.date_mouvement ? new Date(m.date_mouvement).toLocaleDateString("fr-FR") : ""}
          </span>
          </div>
        ))}
        </div>
      )}
      </ModalBody>
      </Modal>

      {/* ══ MODAL SUPPRESSION ══ */}
      <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)}>
      <ModalHeader title="Supprimer le produit ?" onClose={() => setShowDeleteModal(null)} />
      <ModalBody>
      <p className="text-[13px] text-muted-foreground text-center">
      Cette action est irréversible. Le produit sera supprimé définitivement.
      </p>
      </ModalBody>
      <ModalFooter>
      <Button variant="secondary" onClick={() => setShowDeleteModal(null)} className="btn-press">Annuler</Button>
      <Button variant="danger" onClick={executeDelete} loading={saving} className="btn-press">Supprimer</Button>
      </ModalFooter>
      </Modal>
      </div>
    );
}
