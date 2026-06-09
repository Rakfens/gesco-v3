// Inventaire.tsx — Refactorisé avec design system professionnel - Amélioré
import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import type { Inventaire, Produit } from "@/modules/shared/types";
import {
  finishInventory,
  getCountedProducts,
  getCurrentInventory,
  getInventoryDetails,
  getInventoryHistory,
  getUncountedProducts,
  recordCount,
  startInventory,
} from "../services/inventaireService";
import { fetchProduits } from "../services/produitService";

export default function Inventaire() {
  const { currentCompany } = useCompany();
  const { success: showSuccess, error: showError, warn: showWarn } = useApp();

  const [currentInventory, setCurrentInventory] = useState<Inventaire | null>(null);
  const [_products, setProducts] = useState<Produit[]>([]);
  const [countedProducts, setCountedProducts] = useState<Produit[]>([]);
  const [uncountedProducts, setUncountedProducts] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // Pour la sauvegarde d'un comptage
  const [showCountModal, setShowCountModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Produit | null>(null);
  const [countValue, setCountValue] = useState<string>("");
  const [history, setHistory] = useState<Inventaire[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<Inventaire | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [inventoryDetails, setInventoryDetails] = useState<{
    stats: { total_products: number; products_with_difference: number; accuracy_rate: number };
    details: Array<{
      id?: string;
      produit?: { nom?: string; unite?: string };
      quantite_theorique?: number;
      quantite_reelle?: number;
      ecart?: number;
    }>;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [confirmFinaliser, setConfirmFinaliser] = useState(false);

  useEffect(() => {
    loadData();
  });

  // --- AJOUT DE LA GESTION REALTIME ---
  useEffect(() => {
    const handler = (e: Event) => {
      const table = (e as CustomEvent).detail?.table;
      if (["inventaires", "produits", "mouvements_stock"].includes(table)) {
        // Recharger les données pertinentes
        // Si l'inventaire en cours est affecté, rechargez-le
        // Sinon, rechargez l'historique ou les produits si nécessaire
        loadData();
      }
    };
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
    } catch (error: unknown) {
      logger.error("Erreur lors du chargement des données d'inventaire:", error);
      showError("Erreur chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleStartInventory = async () => {
    try {
      setSaving(true); // Activer l'indicateur de sauvegarde
      await startInventory();
      await loadData();
      showSuccess("Inventaire démarré");
    } catch (e: unknown) {
      logger.error("Erreur lors du démarrage de l'inventaire:", e);
      showError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false); // Désactiver l'indicateur de sauvegarde
    }
  };

  const handleRecordCount = async () => {
    if (!selectedProduct || !countValue || !currentInventory?.id) {
      showWarn("Veuillez saisir une quantité");
      return;
    }
    setSaving(true); // Activer l'indicateur de sauvegarde
    try {
      await recordCount(currentInventory.id, selectedProduct.id, parseFloat(countValue));
      setShowCountModal(false);
      setSelectedProduct(null);
      setCountValue("");
      await loadData();
    } catch (error: unknown) {
      logger.error("Erreur lors de l'enregistrement du comptage:", error);
      showError("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    } // Désactiver l'indicateur de sauvegarde
  };

  const executeFinishInventory = async () => {
    setConfirmFinaliser(false);
    if (!currentInventory?.id) return;
    setSaving(true); // Activer l'indicateur de sauvegarde
    try {
      await finishInventory(currentInventory.id);
      await loadData();
      showSuccess("Inventaire terminé");
    } catch (error: unknown) {
      logger.error("Erreur lors de la finalisation de l'inventaire:", error);
      showError("Erreur finalisation");
    } finally {
      setSaving(false);
    } // Désactiver l'indicateur de sauvegarde
  };

  const handleViewDetails = async (inventory: Inventaire) => {
    setSelectedInventory(inventory);
    setDetailsLoading(true);
    setShowDetailsModal(true);
    try {
      setInventoryDetails((await getInventoryDetails(inventory.id)) as typeof inventoryDetails);
    } catch (error: unknown) {
      logger.error("Erreur lors du chargement des détails de l'inventaire:", error);
      setInventoryDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const totalProductsToCount = uncountedProducts.length + countedProducts.length;
  const progressPercent =
    totalProductsToCount > 0 ? (countedProducts.length / totalProductsToCount) * 100 : 0;

  if (loading)
    return (
      <div style={{ color: "var(--muted)", padding: 50, textAlign: "center" }}>Chargement...</div>
    );

  return (
    <div style={{ padding: "0 0 24px" }}>
      {/* Confirm delete dialog - Si implémenté ailleurs */}
      {/* <ConfirmDialog
      open={!!confirmDelete}
      title="Supprimer le produit ?"
      message="Ce produit sera supprimé définitivement."
      onConfirm={executeDelete}
      onCancel={() => setConfirmDelete(null)}
      variant="danger"
      /> */}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}
            data-testid="page-title"
          >
            Inventaire
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
            {currentCompany?.name} · Comptez votre stock physique
          </p>
        </div>
        {!currentInventory && (
          <Button onClick={handleStartInventory} disabled={saving}>
            Demarrer inventaire
          </Button>
        )}
      </div>

      {/* Count Modal */}
      <Modal
        open={showCountModal}
        onClose={() => {
          setShowCountModal(false);
          setSelectedProduct(null);
          setCountValue("");
        }}
      >
        <ModalHeader
          title={`Compter - ${selectedProduct?.nom || ""}`}
          onClose={() => setShowCountModal(false)}
        />
        <ModalBody>
          <div
            style={{
              background: "var(--bg)",
              padding: 14,
              borderRadius: 10,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Stock theorique</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>
              {selectedProduct?.quantite_stock ?? 0}{" "}
              <span style={{ fontSize: 14 }}>{selectedProduct?.unite}</span>
            </div>
          </div>
          <Input
            type="number"
            label="Quantite reelle"
            value={countValue}
            onChange={(e) => setCountValue(e.target.value)}
            placeholder={`Quantite en ${selectedProduct?.unite || ""}`}
          />
          {countValue && (
            <div
              style={{
                background: "var(--bg)",
                padding: 12,
                borderRadius: 10,
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Ecart:</span>
              <span
                style={{
                  fontWeight: 700,
                  color:
                    parseFloat(countValue) !== (selectedProduct?.quantite_stock ?? 0)
                      ? "var(--orange)"
                      : "var(--green)",
                }}
              >
                {parseFloat(countValue) > (selectedProduct?.quantite_stock ?? 0) ? "+" : ""}
                {(parseFloat(countValue) || 0) - (selectedProduct?.quantite_stock ?? 0)}{" "}
                {selectedProduct?.unite}
              </span>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowCountModal(false)}>
            Annuler
          </Button>
          <Button variant="success" onClick={handleRecordCount} disabled={saving} loading={saving}>
            {" "}
            {/* Ajout de 'loading={saving}' */}
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm Finish Modal */}
      <Modal open={confirmFinaliser} onClose={() => setConfirmFinaliser(false)}>
        <ModalHeader title="Terminer l'inventaire ?" onClose={() => setConfirmFinaliser(false)} />
        <ModalBody>
          <p style={{ fontSize: 13, color: "var(--text2)", textAlign: "center" }}>
            {uncountedProducts.length > 0
              ? "Certains produits n'ont pas encore ete comptes. Voulez-vous terminer quand meme ?"
              : "Tous les produits ont ete comptes. Confirmer la finalisation ?"}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setConfirmFinaliser(false)}>
            Annuler
          </Button>
          <Button
            variant="success"
            onClick={executeFinishInventory}
            disabled={saving}
            loading={saving}
          >
            {" "}
            {/* Ajout de 'loading={saving}' */}
            {saving ? "Finalisation..." : "Terminer"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Details Modal */}
      <Modal open={showDetailsModal} onClose={() => setShowDetailsModal(false)}>
        <ModalHeader
          title={
            "Details - Inventaire du " +
            (selectedInventory?.date_debut
              ? new Date(selectedInventory.date_debut ?? "").toLocaleDateString()
              : "")
          }
          onClose={() => setShowDetailsModal(false)}
        />
        <ModalBody>
          {detailsLoading ? (
            <div style={{ textAlign: "center", padding: 40 }}>Chargement des détails...</div>
          ) : !inventoryDetails ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
              Aucun detail disponible
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: "var(--bg)",
                    padding: 12,
                    borderRadius: 10,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--blue)" }}>
                    {inventoryDetails.stats.total_products}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Comptes</div>
                </div>
                <div
                  style={{
                    background: "var(--bg)",
                    padding: 12,
                    borderRadius: 10,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--orange)" }}>
                    {inventoryDetails.stats.products_with_difference}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Avec ecart</div>
                </div>
                <div
                  style={{
                    background: "var(--bg)",
                    padding: 12,
                    borderRadius: 10,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)" }}>
                    {inventoryDetails.stats.total_products -
                      inventoryDetails.stats.products_with_difference}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Conformes</div>
                </div>
              </div>
              <div
                style={{
                  maxHeight: 350,
                  overflowY: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              >
                <Table>
                  <TableHead>
                    <TableHeader>Produit</TableHeader>
                    <TableHeader align="right">Theorique</TableHeader>
                    <TableHeader align="right">Reel</TableHeader>
                    <TableHeader align="right">Ecart</TableHeader>
                    <TableHeader align="center">Statut</TableHeader>
                  </TableHead>
                  <TableBody>
                    {inventoryDetails.details.map((detail) => (
                      <TableRow key={detail.id}>
                        <TableCell style={{ fontWeight: 600 }}>
                          {detail.produit?.nom || "Produit"}
                        </TableCell>
                        <TableCell align="right">
                          {detail.quantite_theorique} {detail.produit?.unite}
                        </TableCell>
                        <TableCell align="right">
                          {detail.quantite_reelle} {detail.produit?.unite}
                        </TableCell>
                        <TableCell
                          align="right"
                          style={{
                            color:
                              (detail.ecart ?? 0) > 0
                                ? "var(--red)"
                                : (detail.ecart ?? 0) < 0
                                  ? "var(--orange)"
                                  : "var(--green)",
                            fontWeight: (detail.ecart ?? 0) !== 0 ? 600 : 400,
                          }}
                        >
                          {(detail.ecart ?? 0) > 0 ? "+" : ""}
                          {detail.ecart ?? 0}
                        </TableCell>
                        <TableCell align="center">
                          <Badge variant={(detail.ecart ?? 0) === 0 ? "success" : "warning"}>
                            {(detail.ecart ?? 0) === 0 ? "OK" : "Ecart"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div
                style={{
                  marginTop: 14,
                  textAlign: "center",
                  padding: 12,
                  background: "var(--bg)",
                  borderRadius: 10,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Taux de precision: </span>
                <span style={{ fontWeight: 700, fontSize: 16, color: "var(--blue)" }}>
                  {inventoryDetails.stats.accuracy_rate}pct
                </span>
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Current Inventory */}
      {currentInventory ? (
        <Card style={{ marginBottom: 20 }}>
          <CardHeader>
            <CardTitle>Inventaire en cours</CardTitle>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Demarre le {new Date(currentInventory.date_debut ?? "").toLocaleString()}
            </span>
          </CardHeader>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              marginBottom: 16,
              padding: "0 18px",
            }}
          >
            <div
              style={{
                textAlign: "center",
                background: "var(--bg)",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--blue)" }}>
                {countedProducts.length}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Comptes</div>
            </div>
            <div
              style={{
                textAlign: "center",
                background: "var(--bg)",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--orange)" }}>
                {uncountedProducts.length}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Restants</div>
            </div>
            <div
              style={{
                textAlign: "center",
                background: "var(--bg)",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)" }}>
                {totalProductsToCount}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Total</div>
            </div>
          </div>
          <div style={{ padding: "0 18px", marginBottom: 16 }}>
            <div
              style={{ background: "var(--bg)", height: 6, borderRadius: 3, overflow: "hidden" }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  background: "var(--green)",
                  height: "100%",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ textAlign: "center", marginTop: 4, fontSize: 11, color: "var(--muted)" }}>
              {Math.round(progressPercent)}pct complete
            </div>
          </div>

          {/* Products to count */}
          <div style={{ padding: "0 18px", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
              Produits a compter ({uncountedProducts.length})
            </h3>
            {uncountedProducts.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 32,
                  background: "var(--bg)",
                  borderRadius: 10,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>OK</div>
                <p style={{ color: "var(--green)", fontWeight: 600 }}>
                  Tous les produits ont ete comptes !
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8, maxHeight: 350, overflowY: "auto" }}>
                {uncountedProducts.map((product) => (
                  <div
                    key={product.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 12,
                      background: "var(--bg)",
                      borderRadius: 10,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{product.nom}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        Stock theorique: {product.quantite_stock} {product.unite}
                      </div>
                    </div>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowCountModal(true);
                      }}
                      disabled={saving}
                    >
                      {" "}
                      {/* Désactiver le bouton si une action est en cours */}
                      Compter
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: "0 18px 18px", display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="success"
              onClick={() => setConfirmFinaliser(true)}
              disabled={saving || uncountedProducts.length > 0}
            >
              {" "}
              {/* Désactiver si une action est en cours ou s'il reste des produits */}
              Terminer l'inventaire
            </Button>
          </div>
        </Card>
      ) : (
        <Card style={{ textAlign: "center", padding: 40, marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>stock</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Aucun inventaire en cours
          </h3>
          <p style={{ color: "var(--muted)", marginBottom: 20 }}>
            Demarrez un nouvel inventaire pour verifier votre stock
          </p>
          <Button onClick={handleStartInventory} disabled={saving}>
            {" "}
            {/* Désactiver le bouton si une action est en cours */}
            Demarrer un inventaire
          </Button>
        </Card>
      )}

      {/* History */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
        Historique des inventaires
      </h2>
      {history.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "var(--muted)" }}>Aucun inventaire termine</p>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {history.map((inv) => (
            <div
              key={inv.id}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  Inventaire du {new Date(inv.date_debut ?? "").toLocaleDateString()}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Termine le {inv.date_fin ? new Date(inv.date_fin).toLocaleString() : "—"}
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => handleViewDetails(inv)}>
                Voir details
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
