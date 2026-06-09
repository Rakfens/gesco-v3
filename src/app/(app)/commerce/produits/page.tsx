"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentCompany, getSupabase } from "@/lib/supabase";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  ModalBody,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/modules/shared/components/ui";
import type { Company } from "@/modules/shared/types";
import { formatAr, formatNumber } from "@/modules/shared/utils/constants";

interface Produit {
  id: string;
  nom: string;
  categorie?: string;
  prix_achat?: number;
  prix_vente?: number;
  stock?: number;
  unite?: string;
  company_id: string;
}

export default function ProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    categorie: "",
    prix_achat: "",
    prix_vente: "",
    stock: "",
    unite: "piece",
  });

  const fetchProduits = useCallback(async (company?: Company | null) => {
    const target = company ?? currentCompany;
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await getSupabase()
        .from("produits")
        .select("*")
        .eq("company_id", target.id)
        .order("nom");
      if (error) throw error;
      setProduits(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement des produits");
      setProduits([]);
    } finally {
      setLoading(false);
    }
  }, [currentCompany]);

  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      fetchProduits(company);
    }
  }, [fetchProduits]);

  const resetForm = () => {
    setFormData({
      nom: "",
      categorie: "",
      prix_achat: "",
      prix_vente: "",
      stock: "",
      unite: "piece",
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.prix_vente) {
      setError("Nom et prix de vente sont requis");
      return;
    }
    try {
      const payload = {
        nom: formData.nom,
        categorie: formData.categorie || null,
        prix_achat: parseFloat(formData.prix_achat) || 0,
        prix_vente: parseFloat(formData.prix_vente) || 0,
        stock: parseFloat(formData.stock) || 0,
        unite: formData.unite || "piece",
        company_id: currentCompany?.id,
      };
      if (isEditing && editingId) {
        const { error } = await getSupabase()
          .from("produits")
          .update(payload)
          .eq("id", editingId)
          .eq("company_id", currentCompany?.id);
        if (error) throw error;
      } else {
        const { error } = await getSupabase().from("produits").insert(payload);
        if (error) throw error;
      }
      resetForm();
      setShowModal(false);
      fetchProduits();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (produit: Produit) => {
    setFormData({
      nom: produit.nom || "",
      categorie: produit.categorie || "",
      prix_achat: (produit.prix_achat || "").toString(),
      prix_vente: (produit.prix_vente || "").toString(),
      stock: (produit.stock || "").toString(),
      unite: produit.unite || "piece",
    });
    setIsEditing(true);
    setEditingId(produit.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce produit ?")) return;
    try {
      const { error } = await getSupabase()
        .from("produits")
        .delete()
        .eq("id", id)
        .eq("company_id", currentCompany?.id);
      if (error) throw error;
      fetchProduits();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  return (
    <>
      <div className="mb-6">
        <Card className="p-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold">Gestion des Produits</CardTitle>
            <Button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="ml-auto"
            >
              + Nouveau Produit
            </Button>
          </CardHeader>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
              {error}
            </div>
          )}
        </Card>
      </div>

      <Modal open={showModal} onOpenChange={setShowModal}>
        <ModalHeader title={isEditing ? "Modifier le produit" : "Nouveau Produit"} />
        <ModalBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nom *</label>
              <Input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData((p) => ({ ...p, nom: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Catégorie</label>
                <Input
                  type="text"
                  value={formData.categorie}
                  onChange={(e) => setFormData((p) => ({ ...p, categorie: e.target.value }))}
                  placeholder="Ex: Accessoires"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Unité</label>
                <select
                  value={formData.unite}
                  onChange={(e) => setFormData((p) => ({ ...p, unite: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="piece">Pièce</option>
                  <option value="kg">Kg</option>
                  <option value="g">g</option>
                  <option value="l">Litre</option>
                  <option value="m">Mètre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Prix d'achat (MGA)</label>
                <Input
                  type="number"
                  value={formData.prix_achat}
                  onChange={(e) => setFormData((p) => ({ ...p, prix_achat: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Prix de vente (MGA) *</label>
                <Input
                  type="number"
                  value={formData.prix_vente}
                  onChange={(e) => setFormData((p) => ({ ...p, prix_vente: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Stock</label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData((p) => ({ ...p, stock: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setShowModal(false);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">{isEditing ? "Mettre à jour" : "Enregistrer"}</Button>
            </div>
          </form>
        </ModalBody>
      </Modal>

      <div className="mt-6">
        <Card className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
              <p className="mt-2 text-muted-foreground">Chargement des produits...</p>
            </div>
          ) : produits.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun produit trouvé.</p>
            </div>
          ) : (
            <Table className="w-full">
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Catégorie</TableCell>
                  <TableCell className="text-right">Prix achat</TableCell>
                  <TableCell className="text-right">Prix vente</TableCell>
                  <TableCell className="text-right">Stock</TableCell>
                  <TableCell className="text-right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {produits.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nom}</TableCell>
                    <TableCell>{p.categorie || "—"}</TableCell>
                    <TableCell className="text-right">{formatAr(p.prix_achat)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAr(p.prix_vente)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(p.stock)} {p.unite || ""}
                    </TableCell>
                    <TableCell className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(p)}>
                        Modifier
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(p.id)}>
                        Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
