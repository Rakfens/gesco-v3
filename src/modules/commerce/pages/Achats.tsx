// Achats.tsx — Refactored with full design system UI components - Amélioré
import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Achat, Produit } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { createAchat, deleteAchat, fetchAchats, updateAchat } from "../services/achatService";
import { fetchProduits } from "../services/produitService";

export default function Achats() {
  const { currentCompany } = useCompany();
  const { success: toastSuccess, error: toastError, warn: toastWarn } = useApp();

  const [achats, setAchats] = useState<Achat[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedAchat, setSelectedAchat] = useState<Achat | null>(null);
  const [panier, setPanier] = useState<
    Array<{
      produit_id: string;
      nom: string;
      quantite: number;
      prix_unitaire: number;
      sous_total: number;
    }>
  >([]);
  const [searchProduit, setSearchProduit] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const [fournisseursConnus, setFournisseursConnus] = useState<string[]>([]);

  const [form, setForm] = useState<{
    fournisseur_nom: string;
    fournisseur_contact: string;
    tva: number;
    montant_paye: number;
    date_achat: string;
  }>({
    fournisseur_nom: "",
    fournisseur_contact: "",
    tva: 0,
    montant_paye: 0,
    date_achat: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadData();
  });

  useEffect(() => {
    const handler = (e: Event) => {
      if (["achats", "achat_details"].includes((e as CustomEvent).detail?.table)) loadData();
    };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  });

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [achatsData, produitsData] = await Promise.all([fetchAchats(), fetchProduits()]);
      setAchats(achatsData);
      setProduits(produitsData);
      const fournisseurs = [
        ...new Set(achatsData.map((a) => a.fournisseur_nom).filter(Boolean) as string[]),
      ];
      setFournisseursConnus(fournisseurs);
    } catch (error: unknown) {
      logger.error("Erreur lors du chargement des achats/produits:", error);
      toastError("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (produit: Produit) => {
    const existing = panier.find((p) => p.produit_id === produit.id);
    if (existing) {
      setPanier(
        panier.map((p) =>
          p.produit_id === produit.id
            ? { ...p, quantite: p.quantite + 1, sous_total: (p.quantite + 1) * p.prix_unitaire }
            : p,
        ),
      );
    } else {
      setPanier([
        ...panier,
        {
          produit_id: produit.id,
          nom: produit.nom,
          quantite: 1,
          prix_unitaire: produit.prix_achat || 0,
          sous_total: produit.prix_achat || 0,
        },
      ]);
    }
  };

  const updateCartQty = (produitId: string, quantite: number) => {
    if (quantite <= 0) {
      setPanier(panier.filter((p) => p.produit_id !== produitId));
      return;
    }
    setPanier(
      panier.map((p) =>
        p.produit_id === produitId ? { ...p, quantite, sous_total: quantite * p.prix_unitaire } : p,
      ),
    );
  };

  const updateCartPrice = (produitId: string, newPrice: number) => {
    setPanier(
      panier.map((p) =>
        p.produit_id === produitId
          ? { ...p, prix_unitaire: newPrice, sous_total: p.quantite * newPrice }
          : p,
      ),
    );
  };

  const resetForm = () => {
    setEditMode(false);
    setSelectedAchat(null);
    setPanier([]);
    setSearchProduit("");
    setForm({
      fournisseur_nom: "",
      fournisseur_contact: "",
      tva: 0,
      montant_paye: 0,
      date_achat: new Date().toISOString().split("T")[0],
    });
  };

  const handleSubmitAchat = async () => {
    if (panier.length === 0) {
      toastWarn("Ajoutez au moins un produit");
      return;
    }
    if (!form.fournisseur_nom.trim()) {
      toastWarn("Le nom du fournisseur est requis");
      return;
    }
    const details = panier.map((p) => ({
      produit_id: p.produit_id,
      quantite: p.quantite,
      prix_unitaire: p.prix_unitaire,
      sous_total: p.sous_total,
    }));
    const achatData = {
      fournisseur_nom: form.fournisseur_nom,
      fournisseur_contact: form.fournisseur_contact,
      tva: Number(form.tva) || 0,
      montant_paye: Number(form.montant_paye) || 0,
      date_achat: form.date_achat,
    };

    setSaving(true); // Activer l'indicateur de sauvegarde
    try {
      if (editMode && selectedAchat) {
        await updateAchat(selectedAchat.id, achatData, details);
        toastSuccess("Achat modifié avec succès");
      } else {
        await createAchat(achatData, details);
        toastSuccess("Achat enregistré, stock mis à jour");
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err: unknown) {
      logger.error("Erreur lors de la sauvegarde de l'achat:", err);
      toastError(`Erreur : ${err instanceof Error ? err.message : "Impossible d'enregistrer"}`);
    } finally {
      setSaving(false); // Désactiver l'indicateur de sauvegarde
    }
  };

  const handleEditAchat = (achat: Achat) => {
    setEditMode(true);
    setSelectedAchat(achat);
    setForm({
      fournisseur_nom: achat.fournisseur_nom || "",
      fournisseur_contact: achat.fournisseur_contact || "",
      tva: achat.tva || 0,
      montant_paye: achat.montant_paye || 0,
      date_achat: achat.date_achat?.split("T")[0] || new Date().toISOString().split("T")[0],
    });
    if (achat.details) {
      setPanier(
        achat.details.map((d) => ({
          produit_id: d.produit_id ?? "",
          nom: d.produit?.nom ?? "Produit",
          quantite: d.quantite ?? 0,
          prix_unitaire: d.prix_unitaire ?? 0,
          sous_total: d.sous_total ?? 0,
        })),
      );
    }
    setShowModal(true);
  };

  const handleDeleteAchat = (id: string) => {
    setConfirmDelete(id);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteAchat(id);
      toastSuccess("Achat supprimé, stock ajusté");
      loadData();
    } catch (error: unknown) {
      logger.error("Erreur lors de la suppression de l'achat:", error);
      toastError("Erreur lors de la suppression");
    }
  };

  const totalPanier = panier.reduce((s, p) => s + p.sous_total, 0);
  const totalAvecTVA = panier.reduce((s, p) => s + p.sous_total, 0) + (Number(form.tva) || 0);

  const produitsFiltres = useMemo(() => {
    if (!searchProduit) return produits;
    const q = searchProduit.toLowerCase();
    return produits.filter(
      (p) =>
        !searchProduit ||
        p.nom.toLowerCase().includes(q) ||
        (p.reference || "").toLowerCase().includes(q),
    );
  }, [produits, searchProduit]);

  if (loading)
    return (
      <div style={{ color: "var(--muted)", padding: 60, textAlign: "center" }}>
        Chargement des achats...
      </div>
    );

  return (
    <div style={{ padding: "0 0 20px" }}>
      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer cet achat ?"
        message="Cette action est irréversible. Le stock des produits sera ajusté en conséquence."
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Header */}
      <CardHeader style={{ marginBottom: 16 }}>
        <div>
          <CardTitle data-testid="page-title">Achats</CardTitle>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
            {currentCompany?.name} · {achats.length} commande(s)
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Nouvel achat
        </Button>
      </CardHeader>

      {/* Mobile cards / Desktop table */}
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {achats.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: 48 }}>
              Aucun achat
            </div>
          ) : (
            achats.map((a) => {
              const solde = (a.montant_total || 0) - (a.montant_paye || 0);
              return (
                <Card key={a.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{a.numero_commande}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {a.fournisseur_nom} ·{" "}
                        {new Date(a.date_achat ?? "").toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <Badge variant={solde > 0 ? "warning" : "success"} size="sm">
                      {solde > 0 ? "Crédit" : "Soldé"}
                    </Badge>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ background: "var(--bg)", borderRadius: 10, padding: "8px 10px" }}>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--muted)",
                          marginBottom: 3,
                          fontWeight: 600,
                        }}
                      >
                        TOTAL
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        {formatAr(a.montant_total)}
                      </div>
                    </div>
                    <div style={{ background: "var(--bg)", borderRadius: 10, padding: "8px 10px" }}>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--muted)",
                          marginBottom: 3,
                          fontWeight: 600,
                        }}
                      >
                        PAYÉ
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>
                        {formatAr(a.montant_paye)}
                      </div>
                    </div>
                    <div style={{ background: "var(--bg)", borderRadius: 10, padding: "8px 10px" }}>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--muted)",
                          marginBottom: 3,
                          fontWeight: 600,
                        }}
                      >
                        SOLDE
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: solde > 0 ? "var(--orange)" : "var(--green)",
                        }}
                      >
                        {solde > 0 ? formatAr(solde) : "—"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                    <Button variant="secondary" size="sm" onClick={() => handleEditAchat(a)}>
                      Modifier
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteAchat(a.id)}>
                      Supprimer
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
          {achats.length > 0 && (
            <Card
              style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}
            >
              <span style={{ fontWeight: 700, fontSize: 13 }}>TOTAL</span>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ color: "var(--orange)", fontWeight: 800 }}>
                  {formatAr(achats.reduce((s, a) => s + (a.montant_total || 0), 0))}
                </span>
                <span style={{ color: "var(--orange)", fontWeight: 700 }}>
                  Solde:{" "}
                  {formatAr(
                    achats.reduce(
                      (s, a) => s + Math.max(0, (a.montant_total || 0) - (a.montant_paye || 0)),
                      0,
                    ),
                  )}
                </span>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableHeader>Commande</TableHeader>
            <TableHeader>Fournisseur</TableHeader>
            <TableHeader>Date</TableHeader>
            <TableHeader align="right">Montant</TableHeader>
            <TableHeader align="right">Payé</TableHeader>
            <TableHeader align="right">Solde</TableHeader>
            <TableHeader align="center">Actions</TableHeader>
          </TableHead>
          <TableBody>
            {achats.length === 0 ? (
              <TableEmpty colSpan={7} message="Aucun achat" />
            ) : (
              achats.map((a) => {
                const solde = (a.montant_total || 0) - (a.montant_paye || 0);
                return (
                  <TableRow key={a.id}>
                    <TableCell style={{ fontWeight: 600 }}>{a.numero_commande}</TableCell>
                    <TableCell>{a.fournisseur_nom}</TableCell>
                    <TableCell>
                      {new Date(a.date_achat ?? "").toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell align="right" style={{ fontWeight: 600 }}>
                      {formatAr(a.montant_total)}
                    </TableCell>
                    <TableCell align="right">{formatAr(a.montant_paye)}</TableCell>
                    <TableCell
                      align="right"
                      style={{
                        fontWeight: 700,
                        color: solde > 0 ? "var(--orange)" : "var(--green)",
                      }}
                    >
                      {solde > 0 ? formatAr(solde) : "—"}
                    </TableCell>
                    <TableCell align="center">
                      <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                        <Button variant="secondary" size="sm" onClick={() => handleEditAchat(a)}>
                          Modifier
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteAchat(a.id)}>
                          Supprimer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {achats.length > 0 && (
            <TableFooter>
              <td colSpan={3} style={{ padding: "10px 12px", fontWeight: 700 }}>
                TOTAL
              </td>
              <TableCell align="right" style={{ fontWeight: 800, color: "var(--orange)" }}>
                {formatAr(achats.reduce((s, a) => s + (a.montant_total || 0), 0))}
              </TableCell>
              <TableCell align="right" style={{ fontWeight: 700 }}>
                {formatAr(achats.reduce((s, a) => s + (a.montant_paye || 0), 0))}
              </TableCell>
              <TableCell align="right" style={{ fontWeight: 700, color: "var(--orange)" }}>
                {formatAr(
                  achats.reduce(
                    (s, a) => s + Math.max(0, (a.montant_total || 0) - (a.montant_paye || 0)),
                    0,
                  ),
                )}
              </TableCell>
              <td />
            </TableFooter>
          )}
        </Table>
      )}

      {/* Modal Nouvel achat / Modifier */}
      <Modal open={showModal} onClose={() => setShowModal(false)} width={isMobile ? 480 : 960}>
        <ModalHeader
          title={editMode ? "Modifier l'achat" : "Nouvel achat"}
          onClose={() => setShowModal(false)}
        />
        <ModalBody>
          <div
            style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}
          >
            {/* Produits */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--blue)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 10,
                }}
              >
                Produits
              </div>
              <Input
                placeholder="Rechercher un produit..."
                value={searchProduit}
                onChange={(e) => setSearchProduit(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <div
                style={{
                  maxHeight: 340,
                  overflowY: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 6,
                }}
              >
                {produitsFiltres.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      borderRadius: 8,
                      marginBottom: 4,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nom}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        Stock: {p.quantite_stock} · Prix achat: {formatAr(p.prix_achat)}
                      </div>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => addToCart(p)}>
                      +
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Détails */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--orange)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 10,
                }}
              >
                Panier ({panier.length} article{panier.length > 1 ? "s" : ""})
              </div>
              <div
                style={{
                  maxHeight: 200,
                  overflowY: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 6,
                  marginBottom: 14,
                }}
              >
                {panier.length === 0 ? (
                  <div
                    style={{ padding: 24, textAlign: "center", color: "var(--muted", fontSize: 13 }}
                  >
                    Panier vide
                  </div>
                ) : (
                  panier.map((item) => (
                    <div
                      key={item.produit_id}
                      style={{
                        padding: "8px 6px",
                        borderBottom: "1px solid var(--border)",
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{item.nom}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => updateCartQty(item.produit_id, item.quantite - 1)}
                          >
                            −
                          </Button>
                          <span style={{ fontWeight: 700, minWidth: 24, textAlign: "center" }}>
                            {item.quantite}
                          </span>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => updateCartQty(item.produit_id, item.quantite + 1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>Prix:</span>
                          <Input
                            type="number"
                            value={String(item.prix_unitaire)}
                            onChange={(e) =>
                              updateCartPrice(item.produit_id, parseFloat(e.target.value) || 0)
                            }
                            style={
                              { width: 90, padding: "3px 7px", fontSize: 12 } as React.CSSProperties
                            }
                          />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--orange)" }}>
                          {formatAr(item.sous_total)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Fournisseur avec datalist */}
              <Input
                label="Fournisseur"
                required
                list="fournisseurs-list"
                placeholder="Nom du fournisseur"
                value={form.fournisseur_nom}
                onChange={(e) => setForm({ ...form, fournisseur_nom: e.target.value })}
              />
              <datalist id="fournisseurs-list">
                {fournisseursConnus.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>

              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}
              >
                <Input
                  label="Contact"
                  placeholder="Téléphone"
                  value={form.fournisseur_contact}
                  onChange={(e) => setForm({ ...form, fournisseur_contact: e.target.value })}
                />
                <Input
                  label="Date"
                  type="date"
                  value={form.date_achat}
                  onChange={(e) => setForm({ ...form, date_achat: e.target.value })}
                />
              </div>

              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}
              >
                <Input
                  label="TVA (Ar)"
                  type="number"
                  value={String(form.tva)}
                  onChange={(e) => setForm({ ...form, tva: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Montant payé"
                  type="number"
                  value={String(form.montant_paye)}
                  onChange={(e) =>
                    setForm({ ...form, montant_paye: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              {/* Récap */}
              <div
                style={{ background: "var(--bg)", padding: 14, borderRadius: 12, marginTop: 14 }}
              >
                {[
                  { label: "Sous-total", value: formatAr(totalPanier) },
                  { label: "TVA", value: formatAr(Number(form.tva) || 0) },
                  { label: "Total", value: formatAr(totalAvecTVA), bold: true, big: true },
                  { label: "Payé", value: formatAr(form.montant_paye) },
                ].map((r) => (
                  <div
                    key={r.label}
                    style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}
                  >
                    <span style={{ color: "var(--muted)", fontSize: 13 }}>{r.label}</span>
                    <span style={{ fontWeight: r.bold ? 800 : 600, fontSize: r.big ? 16 : 13 }}>
                      {r.value}
                    </span>
                  </div>
                ))}
                {totalAvecTVA - (Number(form.montant_paye) || 0) > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px dashed var(--border2)",
                    }}
                  >
                    <span style={{ color: "var(--orange)", fontWeight: 700 }}>Reste à payer</span>
                    <span style={{ color: "var(--orange)", fontWeight: 800, fontSize: 15 }}>
                      {formatAr(totalAvecTVA - (Number(form.montant_paye) || 0))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Annuler
          </Button>
          <Button variant="warning" onClick={handleSubmitAchat} disabled={saving} loading={saving}>
            {" "}
            {/* Ajout de 'loading={saving}' */}
            {saving ? "Enregistrement..." : editMode ? "Mettre à jour" : "Enregistrer l'achat"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
