"use client";

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";
import {
  Badge, Button, Card, CardHeader, CardTitle, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  SkeletonTable, StatCard, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import type { Inventaire, Produit } from "@/modules/shared/types";
import {
  finishInventory, getCountedProducts, getCurrentInventory, getInventoryDetails,
  getInventoryHistory, getUncountedProducts, recordCount, startInventory,
} from "../services/inventaireService";
import { fetchProduits } from "../services/produitService";

const Icon = ({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
  <path d={d} />
  </svg>
);

export default function Inventaire() {
  const { currentCompany, success: showSuccess, error: showError, warn: showWarn } = useApp();
  const [currentInventory, setCurrentInventory] = useState<Inventaire | null>(null);
  const [_products, setProducts] = useState<Produit[]>([]);
  const [countedProducts, setCountedProducts] = useState<Produit[]>([]);
  const [uncountedProducts, setUncountedProducts] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Produit | null>(null);
  const [countValue, setCountValue] = useState("");
  const [history, setHistory] = useState<Inventaire[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<Inventaire | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [inventoryDetails, setInventoryDetails] = useState<{
    stats: { total_products: number; products_with_difference: number; accuracy_rate: number };
    details: Array<{ id?: string; produit?: { nom?: string; unite?: string }; quantite_theorique?: number; quantite_reelle?: number; ecart?: number }>;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [confirmFinaliser, setConfirmFinaliser] = useState(false);

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const handler = (e: Event) => { if (["inventaires", "produits", "mouvements_stock"].includes((e as CustomEvent)?.detail?.table)) loadData(); };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const inventory = await getCurrentInventory();
      setCurrentInventory(inventory);
      const allProducts = await fetchProduits({ isActive: true });
      setProducts(allProducts || []);
      const historyData = await getInventoryHistory();
      setHistory(historyData || []);
      if (inventory?.id) {
        const counted = await getCountedProducts(inventory.id);
        setCountedProducts(counted as unknown as Produit[]);
        const uncounted = await getUncountedProducts(inventory.id);
        setUncountedProducts(uncounted as unknown as Produit[]);
      }
    } catch (e: unknown) { logger.error("Erreur chargement:", e); showError("Erreur chargement"); }
    finally { setLoading(false); }
  };

  const handleStartInventory = async () => {
    setSaving(true);
    try { await startInventory(); await loadData(); showSuccess("Inventaire démarré"); }
    catch (e: unknown) { showError(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  };

  const handleRecordCount = async () => {
    if (!selectedProduct || !countValue || !currentInventory?.id) { showWarn("Veuillez saisir une quantité"); return; }
    setSaving(true);
    try { await recordCount(currentInventory.id, selectedProduct.id, parseFloat(countValue)); setShowCountModal(false); setSelectedProduct(null); setCountValue(""); await loadData(); }
    catch { showError("Erreur enregistrement"); }
    finally { setSaving(false); }
  };

  const executeFinishInventory = async () => {
    setConfirmFinaliser(false);
    if (!currentInventory?.id) return;
    setSaving(true);
    try { await finishInventory(currentInventory.id); await loadData(); showSuccess("Inventaire terminé"); }
    catch { showError("Erreur finalisation"); }
    finally { setSaving(false); }
  };

  const handleViewDetails = async (inventory: Inventaire) => {
    setSelectedInventory(inventory); setDetailsLoading(true); setShowDetailsModal(true);
    try { setInventoryDetails((await getInventoryDetails(inventory.id)) as typeof inventoryDetails); }
    catch { setInventoryDetails(null); }
    finally { setDetailsLoading(false); }
  };

  const totalProductsToCount = uncountedProducts.length + countedProducts.length;
  const progressPercent = totalProductsToCount > 0 ? (countedProducts.length / totalProductsToCount) * 100 : 0;

  if (loading) return <SkeletonTable rows={6} />;

  return (
    <div className="pb-6 transition-all duration-500 ease-out">
    {/* ══ HEADER ══ */}
    <div className="flex items-center justify-between mb-5 flex-wrap gap-2.5">
    <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-[10px] bg-violet-400/10 flex items-center justify-center">
    <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" size={18} className="text-violet-400" />
    </div>
    <div>
    <h1 className="text-[22px] font-extrabold text-white m-0">Inventaire</h1>
    <p className="text-xs text-zinc-500 mt-0.5">{currentCompany?.name} · Comptez votre stock physique</p>
    </div>
    </div>
    {!currentInventory && (
      <Button variant="primary" onClick={handleStartInventory} disabled={saving} loading={saving}>
      Démarrer inventaire
      </Button>
    )}
    </div>

    {/* ══ INVENTAIRE EN COURS ══ */}
    {currentInventory && (
      <Card className="mb-5 border border-blue-400/30 bg-blue-400/[0.05]">
      <CardHeader>
      <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-blue-400/10 flex items-center justify-center">
      <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={14} className="text-blue-400" />
      </div>
      <CardTitle>Inventaire en cours</CardTitle>
      </div>
      <span className="text-[11px] text-zinc-500">
      Débuté le {new Date(currentInventory.date_debut ?? "").toLocaleString("fr-FR")}
      </span>
      </CardHeader>
      <div className="grid grid-cols-3 gap-2.5 mb-4 px-4">
      <div className="text-center bg-[#0a0a0f] rounded-[10px] p-3">
      <div className="text-[22px] font-extrabold text-blue-400">{countedProducts.length}</div>
      <div className="text-[10px] text-zinc-500">Comptés</div>
      </div>
      <div className="text-center bg-[#0a0a0f] rounded-[10px] p-3">
      <div className="text-[22px] font-extrabold text-amber-400">{uncountedProducts.length}</div>
      <div className="text-[10px] text-zinc-500">Restants</div>
      </div>
      <div className="text-center bg-[#0a0a0f] rounded-[10px] p-3">
      <div className="text-[22px] font-extrabold text-emerald-400">{progressPercent.toFixed(0)}%</div>
      <div className="text-[10px] text-zinc-500">Progression</div>
      </div>
      </div>
      {/* Barre de progression */}
      <div className="px-4 pb-4">
      <div className="h-1.5 bg-[#1e1e24] rounded-[3px] overflow-hidden">
      <div className="h-full rounded-[3px] transition-all duration-500 bg-gradient-to-r from-blue-400 to-emerald-400" style={{ width: `${progressPercent}%` }} />
      </div>
      </div>
      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4 flex-wrap">
      <Button variant="primary" size="sm" onClick={() => setShowCountModal(true)} disabled={uncountedProducts.length === 0}>
      📦 Compter un produit
      </Button>
      <Button variant="success" size="sm" onClick={() => setConfirmFinaliser(true)}>
      ✓ Terminer
      </Button>
      </div>
      </Card>
    )}

    {/* ══ PRODUITS À COMPTER ══ */}
    {currentInventory && uncountedProducts.length > 0 && (
      <Card className="mb-5">
      <CardHeader>
      <CardTitle>Produits à compter ({uncountedProducts.length})</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 px-4 pb-4">
      {uncountedProducts.map((p) => (
        <button key={p.id} onClick={() => { setSelectedProduct(p); setCountValue(String(p.quantite_stock || "")); setShowCountModal(true); }}
        className="py-2.5 px-3 rounded-[10px] border border-[#1e1e24] bg-[#0a0a0f] cursor-pointer text-left transition-all duration-150 hover:border-blue-400"
        >
        <div className="font-semibold text-xs text-white truncate">{p.nom}</div>
        <div className="text-[10px] text-zinc-500 mt-0.5">Stock: {p.quantite_stock} {p.unite || ""}</div>
        </button>
      ))}
      </div>
      </Card>
    )}

    {/* ══ HISTORIQUE ══ */}
    {history.length > 0 && (
      <Card>
      <CardHeader>
      <CardTitle>Historique des inventaires</CardTitle>
      </CardHeader>
      <Table>
      <TableHead>
      <TableRow>
      <TableHeader>Date</TableHeader>
      <TableHeader>Statut</TableHeader>
      <TableHeader align="center">Actions</TableHeader>
      </TableRow>
      </TableHead>
      <TableBody>
      {history.map((h) => (
        <TableRow key={h.id}>
        <TableCell className="font-semibold text-xs">
        {h.date_debut ? new Date(h.date_debut).toLocaleDateString("fr-FR") : "—"}
        </TableCell>
        <TableCell>
        <Badge variant={h.statut === "termine" ? "success" : "warning"} size="sm">
        {h.statut === "termine" ? "Terminé" : "En cours"}
        </Badge>
        </TableCell>
        <TableCell align="center">
        <Button variant="secondary" size="sm" onClick={() => handleViewDetails(h)}>Détails</Button>
        </TableCell>
        </TableRow>
      ))}
      </TableBody>
      </Table>
      </Card>
    )}

    {/* ══ MODAL COMPTAGE ══ */}
    <Modal open={showCountModal} onClose={() => { setShowCountModal(false); setSelectedProduct(null); setCountValue(""); }}>
    <ModalHeader title={`Compter — ${selectedProduct?.nom || ""}`} onClose={() => setShowCountModal(false)} />
    <ModalBody>
    <div className="p-3.5 bg-[#0a0a0f] rounded-[10px] text-center mb-4">
    <div className="text-[11px] text-zinc-500">Stock théorique</div>
    <div className="text-[28px] font-extrabold text-blue-400">
    {selectedProduct?.quantite_stock ?? 0} <span className="text-sm font-normal">{selectedProduct?.unite || ""}</span>
    </div>
    </div>
    <Input type="number" label="Quantité réelle" value={countValue} onChange={(e) => setCountValue(e.target.value)} placeholder={`Quantité en ${selectedProduct?.unite || "pièce"}`} />
    {countValue && (
      <div className="mt-3 p-2.5 px-3.5 bg-[#0a0a0f] rounded-lg flex justify-between">
      <span className="text-xs text-zinc-500">Écart :</span>
      <span className={`font-bold text-[13px] ${parseFloat(countValue) !== (selectedProduct?.quantite_stock ?? 0) ? "text-amber-400" : "text-emerald-400"}`}>
      {parseFloat(countValue) > (selectedProduct?.quantite_stock ?? 0) ? "+" : ""}
      {(parseFloat(countValue) || 0) - (selectedProduct?.quantite_stock ?? 0)} {selectedProduct?.unite || ""}
      </span>
      </div>
    )}
    </ModalBody>
    <ModalFooter>
    <Button variant="secondary" onClick={() => setShowCountModal(false)}>Annuler</Button>
    <Button variant="success" onClick={handleRecordCount} disabled={saving} loading={saving}>Enregistrer</Button>
    </ModalFooter>
    </Modal>

    {/* ══ MODAL FINALISER ══ */}
    <Modal open={confirmFinaliser} onClose={() => setConfirmFinaliser(false)}>
    <ModalHeader title="Terminer l'inventaire ?" onClose={() => setConfirmFinaliser(false)} />
    <ModalBody>
    <p className="text-[13px] text-zinc-400 text-center">
    {uncountedProducts.length > 0
      ? `⚠️ ${uncountedProducts.length} produit(s) non compté(s). Voulez-vous terminer quand même ?`
      : "✅ Tous les produits ont été comptés. Confirmer la finalisation ?"}
      </p>
      </ModalBody>
      <ModalFooter>
      <Button variant="secondary" onClick={() => setConfirmFinaliser(false)}>Annuler</Button>
      <Button variant="success" onClick={executeFinishInventory} disabled={saving} loading={saving}>Terminer</Button>
      </ModalFooter>
      </Modal>

      {/* ══ MODAL DÉTAILS ══ */}
      <Modal open={showDetailsModal} onClose={() => setShowDetailsModal(false)} width={600}>
      <ModalHeader title={`Détails — Inventaire du ${selectedInventory?.date_debut ? new Date(selectedInventory.date_debut).toLocaleDateString("fr-FR") : ""}`} onClose={() => setShowDetailsModal(false)} />
      <ModalBody>
      {detailsLoading ? (
        <div className="text-center p-10 text-zinc-500">Chargement...</div>
      ) : !inventoryDetails ? (
        <div className="text-center p-10 text-zinc-500">Aucun détail</div>
      ) : (
        <>
        <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="bg-[#0a0a0f] p-3 rounded-[10px] text-center">
        <div className="text-xl font-extrabold text-blue-400">{inventoryDetails.stats.total_products}</div>
        <div className="text-[10px] text-zinc-500">Comptés</div>
        </div>
        <div className="bg-[#0a0a0f] p-3 rounded-[10px] text-center">
        <div className="text-xl font-extrabold text-amber-400">{inventoryDetails.stats.products_with_difference}</div>
        <div className="text-[10px] text-zinc-500">Avec écart</div>
        </div>
        <div className="bg-[#0a0a0f] p-3 rounded-[10px] text-center">
        <div className="text-xl font-extrabold text-emerald-400">{inventoryDetails.stats.total_products - inventoryDetails.stats.products_with_difference}</div>
        <div className="text-[10px] text-zinc-500">Conformes</div>
        </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto border border-[#1e1e24] rounded-lg">
        <Table>
        <TableHead>
        <TableRow>
        <TableHeader>Produit</TableHeader>
        <TableHeader align="right">Théorique</TableHeader>
        <TableHeader align="right">Réel</TableHeader>
        <TableHeader align="right">Écart</TableHeader>
        <TableHeader align="center">Statut</TableHeader>
        </TableRow>
        </TableHead>
        <TableBody>
        {inventoryDetails.details.map((d) => (
          <TableRow key={d.id}>
          <TableCell className="font-semibold text-xs">{d.produit?.nom || "—"}</TableCell>
          <TableCell align="right" className="text-[11px]">{d.quantite_theorique} {d.produit?.unite || ""}</TableCell>
          <TableCell align="right" className="text-[11px]">{d.quantite_reelle} {d.produit?.unite || ""}</TableCell>
          <TableCell align="right" className={`text-[11px] ${(d.ecart ?? 0) > 0 ? "text-red-400" : (d.ecart ?? 0) < 0 ? "text-amber-400" : "text-emerald-400"} ${(d.ecart ?? 0) !== 0 ? "font-semibold" : "font-normal"}`}>
          {(d.ecart ?? 0) > 0 ? "+" : ""}{d.ecart ?? 0}
          </TableCell>
          <TableCell align="center">
          <Badge variant={(d.ecart ?? 0) === 0 ? "success" : "warning"} size="sm">
          {(d.ecart ?? 0) === 0 ? "OK" : "Écart"}
          </Badge>
          </TableCell>
          </TableRow>
        ))}
        </TableBody>
        </Table>
        </div>
        <div className="mt-3 text-center p-2.5 bg-[#0a0a0f] rounded-lg">
        <span className="text-[11px] text-zinc-500">Taux de précision : </span>
        <span className="font-bold text-base text-blue-400">{inventoryDetails.stats.accuracy_rate}%</span>
        </div>
        </>
      )}
      </ModalBody>
      <ModalFooter>
      <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>Fermer</Button>
      </ModalFooter>
      </Modal>
      </div>
  );
}
