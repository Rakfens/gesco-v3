"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentCompany, getSupabase } from "@/lib/supabase";
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
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

interface Category {
  id: string;
  nom: string;
  description?: string;
  company_id: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nom: "", description: "" });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    const company = getCurrentCompany();
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await getSupabase()
        .from("categories")
        .select("*")
        .eq("company_id", company.id)
        .order("nom");
      if (error) throw error;
      setCategories(data || []);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement des catégories";
      setError(msg);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const resetForm = () => {
    setFormData({ nom: "", description: "" });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const company = getCurrentCompany();
    if (!company) return;
    if (!formData.nom) {
      setError("Le nom est requis");
      return;
    }
    try {
      const payload = {
        nom: formData.nom,
        description: formData.description || null,
        company_id: company.id,
      };
      if (isEditing && editingId) {
        const { error } = await getSupabase()
          .from("categories")
          .update(payload)
          .eq("id", editingId)
          .eq("company_id", company.id);
        if (error) throw error;
      } else {
        const { error } = await getSupabase()
          .from("categories")
          .insert(payload);
        if (error) throw error;
      }
      resetForm();
      setShowModal(false);
      fetchCategories();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erreur lors de l'enregistrement";
      setError(msg);
    }
  };

  const handleEdit = (cat: Category) => {
    setFormData({
      nom: cat.nom || "",
      description: cat.description || "",
    });
    setIsEditing(true);
    setEditingId(cat.id);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    try {
      const company = getCurrentCompany();
      if (!company) return;
      const { error } = await getSupabase()
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("company_id", company.id);
      if (error) throw error;
      fetchCategories();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erreur lors de la suppression";
      setError(msg);
    }
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer la catégorie ?"
        message="Cette action est irréversible."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        variant="danger"
      />

      <Card style={{ marginBottom: 20 }}>
        <CardHeader>
          <div>
            <h1
              style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}
            >
              Gestion des Catégories
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--muted)",
                marginTop: 4,
              }}
            >
              {categories.length} catégorie(s)
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            + Nouvelle Catégorie
          </Button>
        </CardHeader>
        {error && (
          <div
            style={{
              background: "var(--danger-light)",
              border: "1px solid var(--danger)",
              color: "var(--danger)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              marginTop: 12,
            }}
          >
            {error}
          </div>
        )}
      </Card>

      <Modal
        open={showModal}
        onClose={() => {
          resetForm();
          setShowModal(false);
        }}
      >
        <ModalHeader
          title={
            isEditing
              ? "Modifier la catégorie"
              : "Nouvelle Catégorie"
          }
          onClose={() => {
            resetForm();
            setShowModal(false);
          }}
        />
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <Input
              label="Nom *"
              value={formData.nom}
              onChange={(e) =>
                setFormData((p) => ({ ...p, nom: e.target.value }))
              }
              required
            />
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  description: e.target.value,
                }))
              }
              placeholder="Optionnel"
            />
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetForm();
                setShowModal(false);
              }}
            >
              Annuler
            </Button>
            <Button type="submit">
              {isEditing ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {loading ? (
        <Card padding={48}>
          <div
            style={{ textAlign: "center", color: "var(--muted)" }}
          >
            Chargement...
          </div>
        </Card>
      ) : categories.length === 0 ? (
        <Card padding={48}>
          <div
            style={{
              textAlign: "center",
              color: "var(--muted)",
            }}
          >
            Aucune catégorie trouvée.
          </div>
        </Card>
      ) : (
        <Card padding={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Nom</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader align="right">
                  Actions
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell style={{ fontWeight: 600 }}>
                    {c.nom}
                  </TableCell>
                  <TableCell>
                    {c.description || "—"}
                  </TableCell>
                  <TableCell align="right">
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEdit(c)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          setConfirmDelete(c.id)
                        }
                      >
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
