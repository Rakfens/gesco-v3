"use client";

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";
import {
  Badge, Button, Card, CardHeader, CardTitle, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  SkeletonTable, StatCard, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import type { Inventaire, Produit } from "@/modules/shared/types";
import {
  finishInventory, getCountedProducts, getCurrentInventory, getInventoryDetails,
  getInventoryHistory, getUncountedProducts, recordCount, startInventory,
} from "../services/inventaireService";
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

export default function Inventaire() {
  const { currentCompany } = useCompany();
  const { success: showSuccess, error: showError, warn: showWarn } = useApp();

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
    <div className="fadeUp" style={{ animation: "fadeUp 0.4s ease both", paddingBottom: 24 }}>

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.violetDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" size={18} color={C.violet} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>Inventaire</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>{currentCompany?.name} · Comptez votre stock physique</p>
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
        <Card style={{ marginBottom: 20, border: `1px solid ${C.blue}30`, background: `${C.blue}05` }}>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: C.blueDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={14} color={C.blue} />
              </div>
              <CardTitle>Inventaire en cours</CardTitle>
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Débuté le {new Date(currentInventory.date_debut ?? "").toLocaleString("fr-FR")}
            </span>
          </CardHeader>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16, padding: "0 18px" }}>
            <div style={{ textAlign: "center", background: "var(--bg-secondary)", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.blue }}>{countedProducts.length}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Comptés</div>
            </div>
            <div style={{ textAlign: "center", background: "var(--bg-secondary)", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.warning }}>{uncountedProducts.length}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Restants</div>
            </div>
            <div style={{ textAlign: "center", background: "var(--bg-secondary)", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.success }}>{progressPercent.toFixed(0)}%</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Progression</div>
            </div>
          </div>
          {/* Barre de progression */}
          <div style={{ padding: "0 18px 16px" }}>
            <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${progressPercent}%`, height: "100%", background: `linear-gradient(90deg, ${C.blue}, ${C.success})`, borderRadius: 3, transition: "width 0.5s ease" }} />
            </div>
          </div>
          {/* Actions */}
          <div style={{ display: "flex", gap: 8, padding: "0 18px 16px", flexWrap: "wrap" }}>
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
        <Card style={{ marginBottom: 20 }}>
          <CardHeader>
            <CardTitle>Produits à compter ({uncountedProducts.length})</CardTitle>
          </CardHeader>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, padding: "0 18px 18px" }}>
            {uncountedProducts.map((p) => (
              <button key={p.id} onClick={() => { setSelectedProduct(p); setCountValue(String(p.quantite_stock || "")); setShowCountModal(true); }}
                style={{
                  padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)",
                  background: "var(--bg-secondary)", cursor: "pointer", textAlign: "left",
                  transition: "all var(--transition-fast)", fontFamily: "var(--font)",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.blue; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
              >
                <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nom}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Stock: {p.quantite_stock} {p.unite || ""}</div>
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
                  <TableCell style={{ fontWeight: 600, fontSize: 12 }}>
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
          <div style={{ padding: "14px", background: "var(--bg-secondary)", borderRadius: 10, marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Stock théorique</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.blue }}>{selectedProduct?.quantite_stock ?? 0} <span style={{ fontSize: 14, fontWeight: 400 }}>{selectedProduct?.unite || ""}</span></div>
          </div>
          <Input type="number" label="Quantité réelle" value={countValue} onChange={(e) => setCountValue(e.target.value)} placeholder={`Quantité en ${selectedProduct?.unite || "pièce"}`} />
          {countValue && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Écart :</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: parseFloat(countValue) !== (selectedProduct?.quantite_stock ?? 0) ? C.warning : C.success }}>
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
          <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center" }}>
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
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Chargement...</div>
          ) : !inventoryDetails ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Aucun détail</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
                <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.blue }}>{inventoryDetails.stats.total_products}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Comptés</div>
                </div>
                <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.warning }}>{inventoryDetails.stats.products_with_difference}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Avec écart</div>
                </div>
                <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.success }}>{inventoryDetails.stats.total_products - inventoryDetails.stats.products_with_difference}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Conformes</div>
                </div>
              </div>
              <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
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
                        <TableCell style={{ fontWeight: 600, fontSize: 12 }}>{d.produit?.nom || "—"}</TableCell>
                        <TableCell align="right" style={{ fontSize: 11 }}>{d.quantite_theorique} {d.produit?.unite || ""}</TableCell>
                        <TableCell align="right" style={{ fontSize: 11 }}>{d.quantite_reelle} {d.produit?.unite || ""}</TableCell>
                        <TableCell align="right" style={{ color: (d.ecart ?? 0) > 0 ? C.danger : (d.ecart ?? 0) < 0 ? C.warning : C.success, fontWeight: (d.ecart ?? 0) !== 0 ? 600 : 400, fontSize: 11 }}>
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
              <div style={{ marginTop: 12, textAlign: "center", padding: 10, background: "var(--bg-secondary)", borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Taux de précision : </span>
                <span style={{ fontWeight: 700, fontSize: 16, color: C.blue }}>{inventoryDetails.stats.accuracy_rate}%</span>
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
