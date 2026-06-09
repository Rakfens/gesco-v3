import { useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import {
  Button,
  Card,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import type { Recuperation as RecupType } from "@/modules/shared/types";
import { formatAr, TODAY } from "@/modules/shared/utils/constants";
import {
  addRecuperation,
  deleteRecuperation,
  getRecuperationsByDate,
  updateRecuperation,
} from "../services/recuperationService";

interface RecupParLivreur {
  livreur: string;
  recuperations: RecupType[];
  totalGain: number;
}

export default function Recuperation() {
  const { agents, showToast } = useApp();

  const [recuperations, setRecuperations] = useState<RecupType[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(TODAY());
  const [form, setForm] = useState<{
    livreur_id: string;
    livreur_nom: string;
    client_donneur: string;
    frais_recuperation: number;
  }>({ livreur_id: "", livreur_nom: "", client_donneur: "", frais_recuperation: 1000 });
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ client_donneur: string; frais_recuperation: number }>({
    client_donneur: "",
    frais_recuperation: 0,
  });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecuperations();
  }, []);

  const loadRecuperations = async () => {
    setLoading(true);
    try {
      const data = await getRecuperationsByDate(selectedDate);
      setRecuperations(data || []);
    } catch (error: unknown) {
      logger.error("Erreur chargement récupérations:", error);
      showToast("Erreur lors du chargement des récupérations.", "error"); // Informer l'utilisateur
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.livreur_id || !form.client_donneur) {
      showToast("Livreur et client donneur requis", "error");
      return;
    }
    if (form.frais_recuperation <= 0) {
      // Validation supplémentaire
      showToast("Le frais de récupération doit être supérieur à 0", "error");
      return;
    }

    const agent = agents.find((a) => a.id === form.livreur_id);
    if (!agent) {
      // Vérifier si l'agent existe
      showToast("Livreur invalide", "error");
      return;
    }

    try {
      await addRecuperation({
        date: selectedDate,
        livreur_id: form.livreur_id,
        livreur_nom: agent.nom, // Utiliser le nom de l'objet agent trouvé
        client_donneur: form.client_donneur,
        frais_recuperation: form.frais_recuperation, // Passer directement le nombre
      });
      setForm({ livreur_id: "", livreur_nom: "", client_donneur: "", frais_recuperation: 1000 });
      loadRecuperations(); // Recharger après succès
      showToast("Récupération ajoutée");
    } catch (error: unknown) {
      logger.error("Erreur lors de l'ajout de la récupération:", error);
      showToast("Erreur lors de l'ajout de la récupération.", "error");
    }
  };

  const handleUpdate = async () => {
    if (editId === null) return;
    if (editData.frais_recuperation <= 0) {
      // Validation supplémentaire
      showToast("Le frais de récupération doit être supérieur à 0", "error");
      return;
    }
    try {
      await updateRecuperation(editId, { frais_recuperation: editData.frais_recuperation }); // Passer le nombre directement
      setEditId(null);
      loadRecuperations(); // Recharger après succès
      showToast("Récupération modifiée");
    } catch (error: unknown) {
      logger.error("Erreur lors de la modification de la récupération:", error);
      showToast("Erreur lors de la modification de la récupération.", "error");
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteRecuperation(id);
      loadRecuperations(); // Recharger après succès
      showToast("Récupération supprimée", "warn");
    } catch (error: unknown) {
      logger.error("Erreur lors de la suppression de la récupération:", error);
      showToast("Erreur lors de la suppression de la récupération.", "error");
    }
  };

  // Calcul des totaux
  const totalGains = useMemo(
    () => recuperations.reduce((s, r) => s + (r.frais_recuperation || 0), 0),
    [recuperations],
  );
  const totalRecuperations = recuperations.length;

  // Regroupement par livreur avec memoization
  const recuperationsParLivreur: Record<string, RecupParLivreur> = useMemo(() => {
    return recuperations.reduce(
      (acc, r) => {
        const nom = r.livreur_nom;
        if (!acc[nom]) acc[nom] = { livreur: nom, recuperations: [], totalGain: 0 };
        acc[nom].recuperations.push(r);
        acc[nom].totalGain += r.frais_recuperation || 0;
        return acc;
      },
      {} as Record<string, RecupParLivreur>,
    );
  }, [recuperations]);

  // Options pour le select des agents
  const agentOptions = useMemo(() => agents.map((a) => ({ value: a.id, label: a.nom })), [agents]);

  return (
    <div>
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <ModalHeader title="Supprimer la récupération ?" onClose={() => setConfirmDelete(null)} />
        <ModalBody>
          <p style={{ fontSize: 13, color: "var(--text2)" }}>
            Cette récupération sera supprimée définitivement.
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

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>
          Récupération matinale
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          Frais de récupération par livreur
        </p>
      </div>

      {/* Résumé du jour */}
      <Card style={{ marginBottom: 20, borderColor: "var(--purple)" }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--purple)", fontWeight: 700, marginBottom: 4 }}>
              Récupérations du {selectedDate}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>
              {formatAr(totalGains)}
            </div>
            <div style={{ fontSize: 12, color: "var(--subtle)" }}>
              {totalRecuperations} récupération(s)
            </div>
          </div>
          <div
            style={{
              textAlign: "right",
              fontSize: 12,
              color: "var(--subtle)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div>Frais variable selon distance</div>
            <div>Non inclus dans le salaire mensuel</div>
          </div>
        </div>
      </Card>

      {/* Sélecteur de date */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <Input
            type="date"
            label="Date des récupérations"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ flex: 1 }}
            aria-label="Sélectionnez la date pour voir les récupérations"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={loadRecuperations}
            disabled={loading} // Désactiver pendant le chargement
          >
            {loading ? "Chargement..." : "Actualiser"}
          </Button>
        </div>
      </Card>

      {/* Formulaire d'ajout */}
      <Card style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 12,
          }}
        >
          Ajouter une récupération
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            alignItems: "end",
          }}
        >
          <Select
            label="Livreur"
            value={form.livreur_id}
            onChange={(e) => {
              const id = e.target.value;
              const agent = agents.find((a) => a.id === id);
              setForm({
                ...form,
                livreur_id: id,
                livreur_nom: agent?.nom || "", // Mettre à jour le nom associé
              });
            }}
            options={[{ value: "", label: "-- Choisir --" }, ...agentOptions]}
            aria-label="Sélectionnez le livreur pour la récupération"
          />
          <Input
            label="Client donneur"
            placeholder="Ex: SARL TECH"
            value={form.client_donneur}
            onChange={(e) => setForm({ ...form, client_donneur: e.target.value })}
            aria-label="Entrez le nom du client donneur"
          />
          <Input
            type="number"
            label="Frais de récupération (Ar)"
            placeholder="1000"
            value={String(form.frais_recuperation)}
            onChange={(e) => setForm({ ...form, frais_recuperation: Number(e.target.value) || 0 })}
            aria-label="Entrez le frais de récupération en Ariary"
          />
        </div>
        <Button variant="success" fullWidth onClick={handleAdd} style={{ marginTop: 12 }}>
          Ajouter la récupération
        </Button>
      </Card>

      {/* Indicateur de chargement pour la liste */}
      {loading && (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>Chargement...</div>
      )}

      {/* Liste des récupérations */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 12,
        }}
      >
        Récupérations du {selectedDate}
      </div>

      {!loading && recuperations.length === 0 ? (
        <Card style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
          Aucune récupération enregistrée pour cette date.
        </Card>
      ) : (
        !loading && ( // Ne rendre la liste que si ce n'est pas en chargement
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.values(recuperationsParLivreur).map((rl) => (
              <Card key={rl.livreur} style={{ overflow: "hidden", padding: 0 }}>
                <div
                  style={{
                    background: "var(--blue-dim)",
                    padding: "10px 15px",
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>{rl.livreur}</span>
                  <span style={{ color: "var(--green)", fontWeight: 700 }}>
                    {formatAr(rl.totalGain)}
                  </span>
                </div>
                <div style={{ padding: "10px" }}>
                  {rl.recuperations.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        background: "var(--bg)",
                        borderRadius: 8,
                        padding: "8px 12px",
                        marginBottom: 6,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      {editId === r.id ? (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flex: 1,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <Input
                            value={editData.client_donneur}
                            onChange={(e) =>
                              setEditData({ ...editData, client_donneur: e.target.value })
                            }
                            style={{ minWidth: 150 }}
                            aria-label="Modifier le client donneur"
                          />
                          <Input
                            type="number"
                            placeholder="Frais"
                            value={String(editData.frais_recuperation)}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                frais_recuperation: Number(e.target.value) || 0,
                              })
                            }
                            style={{ width: 150 }}
                            aria-label="Modifier le frais de récupération"
                          />
                          <Button variant="success" size="sm" onClick={handleUpdate}>
                            OK
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setEditId(null)}>
                            Annuler
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{r.client_donneur}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>
                              {formatAr(r.frais_recuperation)}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditId(r.id);
                                setEditData({
                                  client_donneur: r.client_donneur,
                                  frais_recuperation: r.frais_recuperation ?? 0,
                                });
                              }}
                            >
                              Modifier
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setConfirmDelete(r.id)}
                            >
                              Supprimer
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
