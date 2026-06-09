// Depenses.tsx — Refactorisé avec design system professionnel - Amélioré
import { useCallback, useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";
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
  Select,
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
import type { Depense } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";

const _CATEGORIES_DEFAULT = [
  "Électricité",
  "Eau",
  "Transport",
  "Fournitures",
  "Communication",
  "Loyer",
  "Marketing",
  "Salaires",
  "Entretien",
  "Impressions",
  "Autres",
];

export default function Depenses() {
  const { currentCompany } = useCompany();
  const { success: showSuccess, error: showError, warn: showWarn } = useApp();

  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // Pour les actions de sauvegarde (create/update)
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Depense | null>(null);
  const [filterCat, setFilterCat] = useState<string>("");
  const [filterDebut, setFilterDebut] = useState<string>("");
  const [filterFin, setFilterFin] = useState<string>("");
  const [stats, setStats] = useState<{
    totalJour: number;
    totalSemaine: number;
    totalMois: number;
    totalAnnee: number;
  }>({ totalJour: 0, totalSemaine: 0, totalMois: 0, totalAnnee: 0 });

  const [form, setForm] = useState<{
    categorie: string;
    description: string;
    montant: number;
    date_depense: string;
  }>({
    categorie: "",
    description: "",
    montant: 0,
    date_depense: new Date().toISOString().split("T")[0],
  });

  // --- AJOUT DE LA GESTION REALTIME ---
  useEffect(() => {
    const handler = (e: Event) => {
      const table = (e as CustomEvent).detail?.table;
      if (table === "depenses") {
        // Ecouter les changements sur la table 'depenses'
        loadDepenses();
      }
    };
    window.addEventListener("supabase_realtime", handler);
    return () => window.removeEventListener("supabase_realtime", handler);
  }, []);

  const loadDepenses = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      let q = getSupabase()
        .from("depenses")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("date_depense", { ascending: false });
      if (filterCat) q = q.eq("categorie", filterCat);
      if (filterDebut) q = q.gte("date_depense", filterDebut);
      if (filterFin) q = q.lte("date_depense", filterFin);
      const { data, error } = await q;
      if (error) throw error;
      const list = data || [];
      setDepenses(list);
      calcStats(list);
    } catch (error: unknown) {
      logger.error("Erreur chargement des dépenses:", error);
      showError("Erreur chargement des dépenses");
    } finally {
      setLoading(false);
    }
  }, [currentCompany, filterCat, filterDebut, filterFin, showError]);

  useEffect(() => {
    loadDepenses();
  }, []);

  const calcStats = (list: Depense[]) => {
    const t = new Date().toISOString().split("T")[0];
    const dow = new Date().getDay();
    const diff = dow === 0 ? 6 : dow - 1;
    const sw = new Date();
    sw.setDate(sw.getDate() - diff);
    const swStr = sw.toISOString().split("T")[0];
    const sm = new Date();
    sm.setDate(1);
    const smStr = sm.toISOString().split("T")[0];
    const sy = new Date();
    sy.setMonth(0);
    sy.setDate(1);
    const syStr = sy.toISOString().split("T")[0];
    const sum = (arr: Depense[]) => arr.reduce((s: number, d: Depense) => s + (d.montant || 0), 0);
    const d = (date: string) => (date || "").split("T")[0];
    setStats({
      totalJour: sum(list.filter((x: Depense) => d(x.date_depense || x.date || "") === t)),
      totalSemaine: sum(list.filter((x: Depense) => d(x.date_depense || x.date || "") >= swStr)),
      totalMois: sum(list.filter((x: Depense) => d(x.date_depense || x.date || "") >= smStr)),
      totalAnnee: sum(list.filter((x: Depense) => d(x.date_depense || x.date || "") >= syStr)),
    });
  };

  const handleSubmit = async () => {
    if (!form.categorie) {
      showWarn("Catégorie requise");
      return;
    }
    if (!form.description) {
      showWarn("Description requise");
      return;
    }
    if (form.montant <= 0) {
      showWarn("Montant doit être > 0");
      return;
    }
    setSaving(true); // Activer l'indicateur de sauvegarde
    try {
      const { error } = await getSupabase()
        .from("depenses")
        .insert([
          {
            company_id: currentCompany!.id,
            categorie: form.categorie,
            description: form.description,
            montant: form.montant,
            date_depense: form.date_depense,
            created_at: new Date().toISOString(),
          },
        ]);
      if (error) throw error;
      showSuccess("Dépense enregistrée");
      setShowModal(false);
      setForm({
        categorie: "",
        description: "",
        montant: 0,
        date_depense: new Date().toISOString().split("T")[0],
      });
      loadDepenses();
      window.dispatchEvent(new CustomEvent("refreshDashboard"));
    } catch (error: unknown) {
      logger.error("Erreur lors de l'enregistrement de la dépense:", error);
      showError("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    } // Désactiver l'indicateur de sauvegarde
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setConfirmDelete(null);
    try {
      const { error } = await getSupabase()
        .from("depenses")
        .delete()
        .eq("id", id)
        .eq("company_id", currentCompany!.id);
      if (error) throw error;
      showSuccess("Dépense supprimée");
      loadDepenses();
      window.dispatchEvent(new CustomEvent("refreshDashboard"));
    } catch (error: unknown) {
      logger.error("Erreur suppression de la dépense:", error);
      showError("Erreur suppression");
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
  };

  const categories = [...new Set(depenses.map((d) => d.categorie).filter((c): c is string => !!c))];
  const totalDepenses = depenses.reduce((s, d) => s + (d.montant || 0), 0);
  const byCategorie = depenses.reduce((acc: Record<string, number>, d) => {
    const k = d.categorie || "Autre";
    acc[k] = (acc[k] || 0) + d.montant;
    return acc;
  }, {});

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  return (
    <div style={{ padding: "0 0 24px" }}>
      {/* Confirm Modal */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <ModalHeader title="Supprimer la dépense ?" onClose={() => setConfirmDelete(null)} />
        <ModalBody>
          <p style={{ fontSize: 13, color: "var(--text2)", textAlign: "center" }}>
            "{confirmDelete?.description}" · {formatAr(confirmDelete?.montant || 0)}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={executeDelete}>
            Supprimer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <ModalHeader title="Nouvelle dépense" onClose={() => setShowModal(false)} />
        <ModalBody>
          <div style={{ display: "grid", gap: 12 }}>
            <Input
              label="Catégorie *"
              value={form.categorie}
              onChange={handleChange("categorie")}
              placeholder="Ex: Électricité, Transport..."
            />
            <Input
              label="Description *"
              value={form.description}
              onChange={handleChange("description")}
              placeholder="Description détaillée..."
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input
                label="Montant (Ar) *"
                type="number"
                value={String(form.montant || "")}
                onChange={(e) => setForm({ ...form, montant: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Date"
                type="date"
                value={form.date_depense}
                onChange={handleChange("date_depense")}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleSubmit} disabled={saving} loading={saving}>
            {" "}
            {/* Ajout de 'loading={saving}' */}
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </ModalFooter>
      </Modal>

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
            Dépenses
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
            {currentCompany?.name} · {depenses.length} enregistrement(s)
          </p>
        </div>
        <Button variant="danger" onClick={() => setShowModal(true)}>
          + Nouvelle dépense
        </Button>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Aujourd'hui", value: stats.totalJour, color: "var(--red)" },
          { label: "Semaine", value: stats.totalSemaine, color: "var(--orange)" },
          { label: "Mois", value: stats.totalMois, color: "var(--red)" },
          { label: "Année", value: stats.totalAnnee, color: "var(--purple)" },
          { label: "Total", value: totalDepenses, color: "var(--pink)" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{formatAr(s.value)}</div>
          </div>
        ))}
      </div>

      {/* Répartition par catégorie */}
      {Object.keys(byCategorie).length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <CardHeader>
            <CardTitle>Répartition par catégorie</CardTitle>
          </CardHeader>
          {Object.entries(byCategorie)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([cat, total]) => {
              const pct =
                totalDepenses > 0 ? (((total as number) / totalDepenses) * 100).toFixed(1) : 0;
              return (
                <div key={cat} style={{ marginBottom: 12, padding: "0 18px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{cat}</span>
                    <span style={{ color: "var(--muted)" }}>
                      {formatAr(total as number)} · {pct}%
                    </span>
                  </div>
                  <div
                    style={{
                      background: "var(--bg)",
                      height: 6,
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        background: "var(--red)",
                        height: "100%",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </Card>
      )}

      {/* Filtres */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          options={[
            { value: "", label: "Toutes catégories" },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
          style={{ minWidth: 150 }}
        />
        <Input type="date" value={filterDebut} onChange={(e) => setFilterDebut(e.target.value)} />
        <span style={{ alignSelf: "center", color: "var(--muted)", fontSize: 13 }}>→</span>
        <Input type="date" value={filterFin} onChange={(e) => setFilterFin(e.target.value)} />
        {(filterCat || filterDebut || filterFin) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setFilterCat("");
              setFilterDebut("");
              setFilterFin("");
            }}
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: 40, fontSize: 14 }}>
          Chargement...
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableHeader>Date</TableHeader>
            <TableHeader>Catégorie</TableHeader>
            <TableHeader>Description</TableHeader>
            <TableHeader align="right">Montant</TableHeader>
            <TableHeader align="center">Action</TableHeader>
          </TableHead>
          <TableBody>
            {depenses.length === 0 && (
              <TableEmpty colSpan={5} message="Aucune dépense enregistrée" />
            )}
            {depenses.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{formatDate(d.date_depense || d.date || "")}</TableCell>
                <TableCell>
                  <Badge variant="info">{d.categorie}</Badge>
                </TableCell>
                <TableCell>{d.description}</TableCell>
                <TableCell align="right" style={{ fontWeight: 700, color: "var(--orange)" }}>
                  {formatAr(d.montant)}
                </TableCell>
                <TableCell align="center">
                  <Button variant="danger" size="sm" onClick={() => setConfirmDelete(d)}>
                    Supprimer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {depenses.length > 0 && (
            <TableFooter>
              <td colSpan={3} style={{ padding: "10px 12px", fontWeight: 700 }}>
                TOTAL
              </td>
              <TableCell align="right" style={{ color: "var(--red)" }}>
                {formatAr(totalDepenses)}
              </TableCell>
              <td />
            </TableFooter>
          )}
        </Table>
      )}
    </div>
  );
}
