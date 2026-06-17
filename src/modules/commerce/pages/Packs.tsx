"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge, Button, Card, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  StatCard, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Pack, Produit } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { fetchPacks, fetchPackWithProduits, createPack, updatePack, deletePack, checkPackStock, isPackAvailable } from "@/modules/commerce/services/packService";
import { fetchProduits } from "@/modules/commerce/services/produitService";

const Icon = ({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
  <path d={d} />
  </svg>
);

/* ─── Types ─── */
interface PackProduitForm {
  produit_id: string;
  quantite: number;
}

interface PackWithAvailability extends Pack {
  disponible?: boolean;
  valeurAchat?: number;
  marge?: number;
}

export default function PacksPage() {
  const { currentCompany, success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
  const isMobile = useIsMobile();
  const router = useRouter();
  const [packs, setPacks] = useState<PackWithAvailability[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDisponible, setFilterDisponible] = useState<"tous" | "disponible" | "indisponible">("tous");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);
  const [detailPack, setDetailPack] = useState<PackWithAvailability | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailStock, setDetailStock] = useState<Array<{ nom: string; quantite: number; stock: number; suffisant: boolean }>>([]);

  // Form state
  const [formNom, setFormNom] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrix, setFormPrix] = useState("");
  const [formProduits, setFormProduits] = useState<PackProduitForm[]>([]);

  // Rediriger vers le dashboard si société de type service
  useEffect(() => {
    if (currentCompany?.type === "service") {
      router.push("/livraison/dashboard");
    }
  }, [currentCompany, router]);

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [p, pr] = await Promise.all([
        fetchPacks(),
                                        fetchProduits({ isActive: true }),
      ]);
      const packsWithAvailability: PackWithAvailability[] = [];
      for (const pack of p) {
        const packComplet = await fetchPackWithProduits(pack.id);
        const disponible = await isPackAvailable(pack.id);
        let valeurAchat = 0;
        if (packComplet?.produits) {
          for (const pp of packComplet.produits) {
            const produit = pp.produit as Produit | undefined;
            valeurAchat += (produit?.prix_achat || 0) * pp.quantite;
          }
        }
        packsWithAvailability.push({
          ...pack,
          disponible,
          valeurAchat,
          marge: pack.prix - valeurAchat,
          produits: packComplet?.produits,
        });
      }
      setPacks(packsWithAvailability);
      setProduits(pr);
    } catch (e: unknown) {
      toastError("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentCompany]);

  // Filtrage des packs
  const packsFiltres = useMemo(() => {
    let result = packs;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.nom.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q));
    }
    if (filterDisponible === "disponible") {
      result = result.filter((p) => p.disponible);
    } else if (filterDisponible === "indisponible") {
      result = result.filter((p) => !p.disponible);
    }
    return result;
  }, [packs, search, filterDisponible]);

  // Stats
  const stats = useMemo(() => ({
    total: packs.length,
    disponibles: packs.filter((p) => p.disponible).length,
                               indisponibles: packs.filter((p) => !p.disponible).length,
                               valeurTotal: packs.reduce((s, p) => s + (p.prix || 0), 0),
                               valeurAchatTotal: packs.reduce((s, p) => s + (p.valeurAchat || 0), 0),
                               margeTotal: packs.reduce((s, p) => s + (p.marge || 0), 0),
                               totalProduits: packs.reduce((s, p) => s + (p.produits?.length || 0), 0),
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
      if (pack) {
        const stock = await checkPackStock(pack.id);
        setDetailStock(
          stock.map((s) => ({
            nom: s.nom,
            quantite: s.quantite_necessaire,
            stock: s.quantite_stock,
            suffisant: s.suffisant,
          }))
        );
      }
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
      <div className="p-5 text-center text-zinc-500">
      Chargement des packs...
      </div>
    );
  }

  return (
    <div className="pb-6 transition-all duration-500 ease-out">
    {/* ══ HEADER ══ */}
    <div className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
    <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-[10px] bg-pink-400/10 flex items-center justify-center">
    <Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={18} className="text-pink-400" />
    </div>
    <div>
    <h1 className={`font-extrabold m-0 ${isMobile ? "text-xl" : "text-2xl"}`}>Packs</h1>
    <p className="text-xs text-zinc-500 mt-0.5">{currentCompany?.name} · {packs.length} pack(s)</p>
    </div>
    </div>
    <div className="flex gap-2">
    <Button variant="secondary" size="sm" onClick={() => router.push("/commerce/ventes")}>← Ventes</Button>
    <Button variant="primary" onClick={openCreateModal}>＋ Nouveau pack</Button>
    </div>
    </div>

    {/* ══ STATS ══ */}
    <div className={isMobile ? "grid grid-cols-2 gap-2.5 mb-4" : "grid grid-cols-4 gap-2.5 mb-4"}>
    <StatCard label="Total packs" value={stats.total} color="pink" icon={<Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={18} className="text-pink-400" />} />
    <StatCard label="Disponibles" value={stats.disponibles} color="emerald" icon={<Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={18} className="text-emerald-400" />} />
    <StatCard label="Indisponibles" value={stats.indisponibles} color="red" icon={<Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" size={18} className="text-red-400" />} />
    <StatCard label="Marge totale" value={formatAr(stats.margeTotal)} color="amber" icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} className="text-amber-400" />} />
    </div>

    {/* ══ FILTRES ══ */}
    <Card className="mb-4">
    <div className={isMobile ? "grid grid-cols-1 gap-2 items-end" : "grid grid-cols-[1fr_auto_auto] gap-2 items-end"}>
    <Input placeholder="Rechercher un pack..." value={search} onChange={(e) => setSearch(e.target.value)} />
    <div className="flex gap-1">
    {(["tous", "disponible", "indisponible"] as const).map((f) => (
      <button
      key={f}
      onClick={() => setFilterDisponible(f)}
      className={`py-1.5 px-3 rounded-lg border border-[#1e1e24] text-[11px] font-semibold cursor-pointer transition-colors ${filterDisponible === f ? "bg-amber-400 text-gray-950 border-amber-400" : "bg-transparent text-zinc-500 hover:text-zinc-300"}`}
      >
      {f === "tous" ? "Tous" : f === "disponible" ? "✅ Disponibles" : "❌ Indisponibles"}
      </button>
    ))}
    </div>
    </div>
    </Card>

    {/* ══ LISTE DES PACKS ══ */}
    {packsFiltres.length === 0 ? (
      <Card padding={40}>
      <div className="text-center text-zinc-500 text-[13px]">
      <div className="text-[32px] mb-2">📦</div>
      {packs.length === 0 ? "Aucun pack créé. Cliquez sur \"Nouveau pack\" pour commencer." : "Aucun pack ne correspond à votre recherche."}
      </div>
      </Card>
    ) : (
      <div className="flex flex-col gap-3">
      {packsFiltres.map((pack) => (
        <Card key={pack.id} padding={0} className="overflow-hidden">
        <div className="py-4 px-5">
        <div className="flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pack.disponible ? "bg-emerald-400/10" : "bg-red-400/10"}`}>
        <span className="text-[22px]">{pack.disponible ? "📦" : "⚠️"}</span>
        </div>
        <div>
        <div className="flex items-center gap-2">
        <span className="font-bold text-[15px] text-white">{pack.nom}</span>
        <Badge variant={pack.disponible ? "success" : "danger"} size="sm">
        {pack.disponible ? "Disponible" : "Indisponible"}
        </Badge>
        </div>
        <div className="text-[11px] text-zinc-500 mt-0.5">
        {pack.produits?.length || 0} produit(s) · {pack.description || "Pas de description"}
        </div>
        </div>
        </div>
        <div className="flex items-center gap-4">
        <div className="text-right">
        <div className="text-lg font-extrabold text-amber-400">{formatAr(pack.prix)}</div>
        <div className="text-[10px] text-zinc-500">
        Achat: {formatAr(pack.valeurAchat || 0)} · Marge: <span className={(pack.marge || 0) >= 0 ? "text-emerald-400" : "text-red-400"}>{formatAr(pack.marge || 0)}</span>
        </div>
        </div>
        <div className="flex gap-1.5">
        <Button variant="success" size="sm" onClick={() => router.push("/commerce/ventes")}>🛒 Vendre</Button>
        <Button variant="secondary" size="sm" onClick={() => openDetailModal(pack.id)}>👁️</Button>
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
    <div className={isMobile ? "grid grid-cols-1 gap-2.5 mb-4" : "grid grid-cols-2 gap-2.5 mb-4"}>
    <Input label="Nom du pack *" placeholder="Ex: Pack Mahampy" value={formNom} onChange={(e) => setFormNom(e.target.value)} />
    <Input label="Prix de vente (Ar) *" type="number" placeholder="120000" value={formPrix} onChange={(e) => setFormPrix(e.target.value)} />
    </div>
    <div className="mb-4">
    <Input label="Description" placeholder="Description du pack..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
    </div>
    {/* Liste des produits du pack */}
    <div className="text-xs font-bold text-white mb-2">
    Produits du pack ({formProduits.length})
    </div>
    <div className="flex flex-col gap-2 mb-3">
    {formProduits.map((fp, index) => (
      <div key={index} className="flex gap-2 items-center">
      <select
      value={fp.produit_id}
      onChange={(e) => updateProduitLine(index, "produit_id", e.target.value)}
      className="flex-1 py-2 px-3 bg-[#111114] border border-[#1e1e24] rounded-lg text-white text-[13px] outline-none font-sans focus:border-amber-400"
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
      className="w-[60px] py-2 px-2 bg-[#111114] border border-[#1e1e24] rounded-lg text-white text-[13px] text-center outline-none focus:border-amber-400"
      />
      <button
      onClick={() => removeProduitLine(index)}
      className="w-8 h-8 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 cursor-pointer flex items-center justify-center hover:bg-red-400/20 transition-colors"
      >✕</button>
      </div>
    ))}
    </div>
    <Button variant="secondary" size="sm" onClick={addProduitLine} className="mb-2">
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
    <Modal open={!!showDetailModal} onClose={() => { setShowDetailModal(null); setDetailPack(null); setDetailStock([]); }} width={isMobile ? 480 : 600}>
    <ModalHeader title={detailPack?.nom || "Détails du pack"} onClose={() => { setShowDetailModal(null); setDetailPack(null); setDetailStock([]); }} />
    <ModalBody>
    {detailLoading ? (
      <div className="text-center p-10 text-zinc-500">Chargement...</div>
    ) : detailPack ? (
      <>
      {/* Infos générales */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
      <div className="py-2.5 px-3.5 bg-[#0a0a0f] rounded-lg">
      <div className="text-[10px] text-zinc-500 mb-0.5">Prix de vente</div>
      <div className="text-lg font-extrabold text-amber-400">{formatAr(detailPack.prix)}</div>
      </div>
      <div className="py-2.5 px-3.5 bg-[#0a0a0f] rounded-lg">
      <div className="text-[10px] text-zinc-500 mb-0.5">Nombre de produits</div>
      <div className="text-lg font-extrabold text-blue-400">{detailPack.produits?.length || 0}</div>
      </div>
      </div>
      {/* Valeur d'achat et marge */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
      <div className="py-2.5 px-3.5 bg-[#0a0a0f] rounded-lg">
      <div className="text-[10px] text-zinc-500 mb-0.5">Valeur d'achat</div>
      <div className="text-base font-bold text-orange-400">{formatAr(detailPack.valeurAchat || 0)}</div>
      </div>
      <div className="py-2.5 px-3.5 bg-[#0a0a0f] rounded-lg">
      <div className="text-[10px] text-zinc-500 mb-0.5">Marge</div>
      <div className={`text-base font-bold ${(detailPack.marge || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
      {formatAr(detailPack.marge || 0)}
      </div>
      </div>
      </div>
      {detailPack.description && (
        <div className="py-2.5 px-3.5 bg-[#0a0a0f] rounded-lg mb-4">
        <div className="text-[10px] text-zinc-500 mb-0.5">Description</div>
        <div className="text-[13px] text-white">{detailPack.description}</div>
        </div>
      )}
      {/* Disponibilité */}
      <div className={`py-2.5 px-3.5 rounded-lg mb-4 flex items-center gap-2 ${detailPack.disponible ? "bg-emerald-400/10" : "bg-red-400/10"}`}>
      <span className="text-base">{detailPack.disponible ? "✅" : "❌"}</span>
      <span className={`text-[13px] font-semibold ${detailPack.disponible ? "text-emerald-400" : "text-red-400"}`}>
      {detailPack.disponible ? "Pack disponible - Stock suffisant pour tous les produits" : "Pack indisponible - Stock insuffisant pour un ou plusieurs produits"}
      </span>
      </div>
      {/* Produits du pack avec stock */}
      <div className="text-xs font-bold text-white mb-2">Composition du pack</div>
      <Table>
      <TableHead>
      <TableRow>
      <TableHeader>Produit</TableHeader>
      <TableHeader align="center">Qté nécessaire</TableHeader>
      <TableHeader align="right">Stock actuel</TableHeader>
      <TableHeader align="center">Statut</TableHeader>
      </TableRow>
      </TableHead>
      <TableBody>
      {detailStock.map((ds, idx) => (
        <TableRow key={idx}>
        <TableCell className="font-semibold">{ds.nom}</TableCell>
        <TableCell align="center">{ds.quantite}</TableCell>
        <TableCell align="right" className={ds.suffisant ? "text-white" : "text-red-400"}>{ds.stock}</TableCell>
        <TableCell align="center">
        <Badge variant={ds.suffisant ? "success" : "danger"} size="sm">
        {ds.suffisant ? "✅ OK" : "❌ Insuffisant"}
        </Badge>
        </TableCell>
        </TableRow>
      ))}
      </TableBody>
      </Table>
      </>
    ) : (
      <div className="text-center p-10 text-zinc-500">Pack introuvable</div>
    )}
    </ModalBody>
    </Modal>

    {/* ══ MODAL SUPPRESSION ══ */}
    <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)}>
    <ModalHeader title="Supprimer le pack ?" onClose={() => setShowDeleteModal(null)} />
    <ModalBody>
    <p className="text-[13px] text-zinc-400 text-center">
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
