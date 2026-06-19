"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";
import {
  Badge, Button, Card, CardTitle, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  SkeletonTable, StatCard, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import type { Inventaire, Produit } from "@/modules/shared/types";
import {
  finishInventory, getCountedProducts, getCurrentInventory, getInventoryDetails,
  getInventoryHistory, getUncountedProducts, recordCount, startInventory,
} from "../services/inventaireService";
import { fetchProduits } from "../services/produitService";

/* ─── SVG Icons ─── */
const ClipboardIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);
const ClockIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const CheckIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const BoxIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const EyeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);

export default function Inventaire() {
  const { currentCompany, success: showSuccess, error: showError, warn: showWarn } = useApp();
  const [mounted, setMounted] = useState(false);

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
  const [searchCount, setSearchCount] = useState('');

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

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

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const handler = (e: Event) => { if (["inventaires", "produits", "mouvements_stock"].includes((e as CustomEvent)?.detail?.table)) loadData(); };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, []);

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

  const filteredUncountedProducts = searchCount.trim()
    ? uncountedProducts.filter((p) =>
        p.nom?.toLowerCase().includes(searchCount.toLowerCase()) ||
        (p as unknown as { reference?: string }).reference?.toLowerCase().includes(searchCount.toLowerCase())
      )
    : uncountedProducts;

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  if (loading) return <SkeletonTable rows={6} />;

  return (
    <div className="pb-8">
      {/* ═══════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════ */}
      <div className="relative mb-6 overflow-hidden rounded-2xl p-5" style={{ ...sectionStyle(0), background: "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(96,165,250,0.03) 100%)", border: "1px solid rgba(139,92,246,0.08)" }}>
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(139,92,246,0.05)" }} />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shrink-0" style={{ border: "2px solid rgba(139,92,246,0.2)", background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))", boxShadow: "0 0 20px rgba(139,92,246,0.06)" }}>
              <Image src="/logo.png" alt="HT-GesCom" width={32} height={32} priority className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>Inventaire</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{currentCompany?.name} · Comptez votre stock physique</p>
            </div>
          </div>
          {!currentInventory && (
            <Button variant="primary" onClick={handleStartInventory} disabled={saving} loading={saving} icon={<PlayIcon />}>Démarrer inventaire</Button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          INVENTAIRE EN COURS
          ═══════════════════════════════════════════════════════ */}
      {currentInventory && (
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ ...sectionStyle(0.1), border: "1px solid rgba(96,165,250,0.15)", background: "rgba(96,165,250,0.03)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(96,165,250,0.08)" }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(96,165,250,0.1)", color: "var(--info)" }}>
                  <ClockIcon />
                </div>
                <div>
                  <CardTitle className="text-sm">Inventaire en cours</CardTitle>
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Débuté le {new Date(currentInventory.date_debut ?? "").toLocaleString("fr-FR")}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={() => setShowCountModal(true)} disabled={uncountedProducts.length === 0} icon={<BoxIcon />}>Compter un produit</Button>
                <Button variant="success" size="sm" onClick={() => setConfirmFinaliser(true)} icon={<CheckIcon />}>Terminer</Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 p-5">
            {[
              { label: "Comptés", value: countedProducts.length, color: "var(--info)", bg: "rgba(96,165,250,0.06)", border: "rgba(96,165,250,0.12)" },
              { label: "Restants", value: uncountedProducts.length, color: "var(--gold)", bg: "rgba(201,169,110,0.06)", border: "rgba(201,169,110,0.12)" },
              { label: "Progression", value: `${progressPercent.toFixed(0)}%`, color: "var(--success)", bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.12)" },
            ].map((s) => (
              <div key={s.label} className="text-center py-3 rounded-xl" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="px-5 pb-5">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg, var(--info), var(--success))" }} />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          PRODUITS À COMPTER
          ═══════════════════════════════════════════════════════ */}
      {currentInventory && uncountedProducts.length > 0 && (
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ ...sectionStyle(0.15), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(201,169,110,0.1)", color: "var(--gold)" }}>
                  <BoxIcon />
                </div>
                <CardTitle className="text-sm">Produits à compter</CardTitle>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(201,169,110,0.08)", color: "var(--gold)" }}>
                {filteredUncountedProducts.length} restant{filteredUncountedProducts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-3">
              <Input
                type="text"
                placeholder="Rechercher par nom ou référence..."
                value={searchCount}
                onChange={(e) => setSearchCount(e.target.value)}
              />
            </div>
          </div>
          <div className="p-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
            {filteredUncountedProducts.map((p) => (
              <button key={p.id} onClick={() => { setSelectedProduct(p); setCountValue(String(p.quantite_stock || "")); setShowCountModal(true); }} className="py-3 px-3 rounded-xl text-left btn-press transition-all duration-150" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                <div className="font-semibold text-xs truncate" style={{ color: "var(--text-primary)" }}>{p.nom}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Stock: {p.quantite_stock} {p.unite || ""}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          HISTORIQUE
          ═══════════════════════════════════════════════════════ */}
      {history.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ ...sectionStyle(0.2), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(139,92,246,0.1)", color: "var(--violet)" }}>
                <ClipboardIcon size={13} />
              </div>
              <CardTitle className="text-sm">Historique des inventaires</CardTitle>
            </div>
          </div>
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
                  <TableCell className="font-semibold text-xs"><span style={{ color: "var(--text-primary)" }}>
                    {h.date_debut ? new Date(h.date_debut).toLocaleDateString("fr-FR") : "—"}
                  </span></TableCell>
                  <TableCell>
                    <Badge variant={h.statut === "termine" ? "success" : "warning"} size="sm">
                      {h.statut === "termine" ? "Terminé" : "En cours"}
                    </Badge>
                  </TableCell>
                  <TableCell align="center">
                    <Button variant="secondary" size="sm" onClick={() => handleViewDetails(h)} icon={<EyeIcon />}>Détails</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAL COMPTAGE
          ═══════════════════════════════════════════════════════ */}
      <Modal open={showCountModal} onClose={() => { setShowCountModal(false); setSelectedProduct(null); setCountValue(""); }}>
        <ModalHeader title={`Compter — ${selectedProduct?.nom || ""}`} onClose={() => setShowCountModal(false)} />
        <ModalBody>
          <div className="p-4 rounded-xl text-center mb-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Stock théorique</div>
            <div className="text-3xl font-extrabold" style={{ color: "var(--info)" }}>
              {selectedProduct?.quantite_stock ?? 0} <span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>{selectedProduct?.unite || ""}</span>
            </div>
          </div>
          <Input type="number" label="Quantité réelle" value={countValue} onChange={(e) => setCountValue(e.target.value)} placeholder={`Quantité en ${selectedProduct?.unite || "pièce"}`} />
          {countValue && (
            <div className="mt-3 p-3 rounded-lg flex justify-between items-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Écart :</span>
              <span className="font-bold text-sm" style={{ color: parseFloat(countValue) !== (selectedProduct?.quantite_stock ?? 0) ? "var(--gold)" : "var(--success)" }}>
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

      {/* ═══════════════════════════════════════════════════════
          MODAL FINALISER
          ═══════════════════════════════════════════════════════ */}
      <Modal open={confirmFinaliser} onClose={() => setConfirmFinaliser(false)}>
        <ModalHeader title="Terminer l'inventaire ?" onClose={() => setConfirmFinaliser(false)} />
        <ModalBody>
          <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
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

      {/* ═══════════════════════════════════════════════════════
          MODAL DÉTAILS
          ═══════════════════════════════════════════════════════ */}
      <Modal open={showDetailsModal} onClose={() => setShowDetailsModal(false)} width={600}>
        <ModalHeader title={`Détails — Inventaire du ${selectedInventory?.date_debut ? new Date(selectedInventory.date_debut).toLocaleDateString("fr-FR") : ""}`} onClose={() => setShowDetailsModal(false)} />
        <ModalBody>
          {detailsLoading ? (
            <div className="text-center p-10" style={{ color: "var(--text-muted)" }}>Chargement...</div>
          ) : !inventoryDetails ? (
            <div className="text-center p-10" style={{ color: "var(--text-muted)" }}>Aucun détail</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Comptés", value: inventoryDetails.stats.total_products, color: "var(--info)", bg: "rgba(96,165,250,0.06)", border: "rgba(96,165,250,0.12)" },
                  { label: "Avec écart", value: inventoryDetails.stats.products_with_difference, color: "var(--gold)", bg: "rgba(201,169,110,0.06)", border: "rgba(201,169,110,0.12)" },
                  { label: "Conformes", value: inventoryDetails.stats.total_products - inventoryDetails.stats.products_with_difference, color: "var(--success)", bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.12)" },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="max-h-[300px] overflow-y-auto rounded-xl" style={{ border: "1px solid var(--border-subtle)" }}>
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
                        <TableCell className="font-semibold text-xs"><span style={{ color: "var(--text-primary)" }}>{d.produit?.nom || "—"}</span></TableCell>
                        <TableCell align="right" className="text-[11px]"><span style={{ color: "var(--text-primary)" }}>{d.quantite_theorique} {d.produit?.unite || ""}</span></TableCell>
                        <TableCell align="right" className="text-[11px]"><span style={{ color: "var(--text-primary)" }}>{d.quantite_reelle} {d.produit?.unite || ""}</span></TableCell>
                        <TableCell align="right" className="text-[11px]"><span style={{ color: (d.ecart ?? 0) > 0 ? "var(--danger)" : (d.ecart ?? 0) < 0 ? "var(--gold)" : "var(--success)", fontWeight: (d.ecart ?? 0) !== 0 ? 600 : 400 }}>{(d.ecart ?? 0) > 0 ? "+" : ""}{d.ecart ?? 0}</span></TableCell>
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
              <div className="mt-3 text-center p-3 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Taux de précision : </span>
                <span className="font-bold text-base" style={{ color: "var(--info)" }}>{inventoryDetails.stats.accuracy_rate}%</span>
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
