"use client";

import { useEffect, useState } from "react";
import { getCurrentCompany, getSupabase } from "@/lib/supabase";
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
  TableHead,
  TableRow,
} from "@/modules/shared/components/ui";
import type { Agent, Company, Livraison } from "@/modules/shared/types";
import { formatAr, TODAY } from "@/modules/shared/utils/constants";
import { getCompanyConfig, openPrintWindow } from "../printStyles";

export default function BonLivraisonPage() {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLivraison, setSelectedLivraison] = useState<Livraison | null>(null);
  const [filters, setFilters] = useState<{ date: string; agent_id: string; statut: string }>({
    date: TODAY(),
    agent_id: "",
    statut: "",
  });

  const [form, setForm] = useState<{
    colis: string;
    client_donneur: string;
    destinataire: string;
    destinataire_telephone: string;
    destinataire_lieu: string;
    agent_id: string;
    montant: number;
    frais: number;
    paiement: string;
    date: string;
    statut: string;
    remarque: string;
  }>({
    colis: "",
    client_donneur: "",
    destinataire: "",
    destinataire_telephone: "",
    destinataire_lieu: "",
    agent_id: "",
    montant: 0,
    frais: 0,
    paiement: "espece",
    date: TODAY(),
    statut: "en_cours",
    remarque: "",
  });

  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      loadData();
    }
  });

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const [livRes, agentsRes] = await Promise.all([
      (async () => {
        let q = getSupabase()
          .from("livraisons")
          .select("*, agents(nom)")
          .eq("company_id", currentCompany.id)
          .order("date", { ascending: false })
          .limit(100);
        if (filters.date) q = q.eq("date", filters.date);
        if (filters.agent_id) q = q.eq("agent_id", filters.agent_id);
        if (filters.statut) q = q.eq("statut", filters.statut);
        const { data, error } = await q;
        return error ? [] : data || [];
      })(),
      getSupabase().from("agents").select("*").eq("company_id", currentCompany.id).order("nom"),
    ]);
    setLivraisons(livRes);
    setAgents(agentsRes.data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setForm({
      colis: "",
      client_donneur: "",
      destinataire: "",
      destinataire_telephone: "",
      destinataire_lieu: "",
      agent_id: "",
      montant: 0,
      frais: 0,
      paiement: "espece",
      date: TODAY(),
      statut: "en_cours",
      remarque: "",
    });
  };

  const handleSave = async () => {
    if (!form.colis || !form.destinataire) return;
    setSaving(true);
    try {
      const agentNom = agents.find((a) => a.id === form.agent_id)?.nom || "";
      const { error } = await getSupabase()
        .from("livraisons")
        .insert({
          company_id: currentCompany?.id,
          colis: form.colis,
          client_donneur: form.client_donneur,
          destinataire: form.destinataire,
          destinataire_telephone: form.destinataire_telephone,
          destinataire_lieu: form.destinataire_lieu,
          agent_id: form.agent_id ? parseInt(form.agent_id, 10) : null,
          agent_nom: agentNom,
          montant: form.montant || 0,
          frais: form.frais || 0,
          paiement: form.paiement,
          date: form.date,
          statut: form.statut,
          remarque: form.remarque,
        });
      if (error) throw error;
      resetForm();
      loadData();
    } catch (err: unknown) {
      alert(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const printBon = (livraison: Livraison) => {
    const config = getCompanyConfig(currentCompany?.slug ?? "");
    const date = new Date(livraison.date).toLocaleDateString("fr-FR");
    const montantTxt = livraison.paiement === "client" ? "CLIENT" : formatAr(livraison.montant);

    const html = `
<div class="no-print">
  <button class="btn-print" onclick="window.print()">IMPRIMER</button>
  <button class="btn-close" onclick="window.close()">FERMER</button>
</div>
<div class="center">
  <div class="bold" style="font-size:16px; letter-spacing:2px;">${config.name.toUpperCase()}</div>
  <div style="font-size:12px; margin-top:4px;">BON DE LIVRAISON</div>
</div>
<hr class="sep">
<div class="row"><span class="label">Date :</span><span class="val">${date}</span></div>
<div class="row"><span class="label">Colis :</span><span class="val">${livraison.colis}</span></div>
<div class="row"><span class="label">Donneur :</span><span class="val">${livraison.client_donneur || "—"}</span></div>
<hr class="sep">
<div class="block">
  <div class="block-title">DESTINATAIRE</div>
  <div class="row"><span class="label">Nom :</span><span class="val">${livraison.destinataire}</span></div>
  ${livraison.destinataire_telephone ? `<div class="row"><span class="label">Tél :</span><span class="val">${livraison.destinataire_telephone}</span></div>` : ""}
  ${livraison.destinataire_lieu ? `<div class="row"><span class="label">Lieu :</span><span class="val">${livraison.destinataire_lieu}</span></div>` : ""}
</div>
<hr class="sep">
<div class="row"><span class="label">Montant :</span><span class="val">${montantTxt}</span></div>
${(livraison.frais || 0) > 0 ? `<div class="row"><span class="label">Frais :</span><span class="val">${formatAr(livraison.frais)}</span></div>` : ""}
<div class="row"><span class="label">Paiement :</span><span class="val">${livraison.paiement === "espece" ? "Espèces" : "Client"}</span></div>
<div class="row"><span class="label">Statut :</span><span class="val">${livraison.statut}</span></div>
${livraison.remarque ? `<div style="margin-top:6px; padding:5px; border:1px solid #000;"><span class="bold">Remarque :</span> ${livraison.remarque}</div>` : ""}
<hr class="sep">
<div class="center" style="font-size:10px; margin-top:8px;">
  <div>Signature donneur :</div>
  <div style="height:24px; border-bottom:1px solid #000; margin:4px 20px;"></div>
</div>
<div class="center" style="font-size:10px; margin-top:12px;">
  <div>Signature livreur :</div>
  <div style="height:24px; border-bottom:1px solid #000; margin:4px 20px;"></div>
</div>
<div class="center" style="margin-top:12px; font-size:11px;">${config.footer}</div>
<div class="no-print">
  <button class="btn-print" onclick="window.print()">IMPRIMER</button>
  <button class="btn-close" onclick="window.close()">FERMER</button>
</div>`;

    openPrintWindow(html, `Bon ${livraison.colis}`);
  };

  const printAgentList = async (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;
    const dayLivraisons = livraisons.filter((l) => l.agent_id === agent.id);
    if (dayLivraisons.length === 0) return;

    const config = getCompanyConfig(currentCompany?.slug ?? "");
    const date = new Date(filters.date).toLocaleDateString("fr-FR");

    // Group by destinataire
    const destsMap: Record<
      string,
      {
        destinataire: string;
        telephone: string;
        lieu: string;
        items: Livraison[];
        totalMontant: number;
        totalFrais: number;
      }
    > = {};
    let grandMontant = 0,
      grandFrais = 0;
    for (const l of dayLivraisons) {
      const dest = l.destinataire || "—";
      const montant = l.paiement === "client" ? 0 : Number(l.montant) || 0;
      const frais = Number(l.frais) || 0;
      grandMontant += montant;
      grandFrais += frais;
      if (!destsMap[dest])
        destsMap[dest] = {
          destinataire: dest,
          telephone: l.destinataire_telephone || "",
          lieu: l.destinataire_lieu || "",
          items: [],
          totalMontant: 0,
          totalFrais: 0,
        };
      destsMap[dest].items.push(l);
      destsMap[dest].totalMontant += montant;
      destsMap[dest].totalFrais += frais;
    }

    let corpsHtml = "";
    let numDest = 1;
    for (const key in destsMap) {
      const d = destsMap[key];
      const totalDest = d.totalMontant + d.totalFrais;
      let itemsHtml = "";
      d.items.forEach((l, i) => {
        const montant = l.paiement === "client" ? 0 : Number(l.montant) || 0;
        const frais = Number(l.frais) || 0;
        itemsHtml += `<div style="margin:4px 0; padding:4px 0; border-bottom:1px dashed #000;">
          <div class="bold" style="font-size:12px;">${i + 1}. ${l.colis || "—"}</div>
          <div class="row"><span class="label">Donneur :</span><span class="val">${l.client_donneur || "—"}</span></div>
          <div class="row"><span class="label">Montant :</span><span class="val">${l.paiement === "client" ? "CLIENT" : formatAr(montant)}</span></div>
          ${frais > 0 ? `<div class="row"><span class="label">Frais :</span><span class="val">${formatAr(frais)}</span></div>` : ""}
          <div class="row"><span class="label">Statut :</span><span class="val">${l.statut || "—"}</span></div>
        </div>`;
      });
      corpsHtml += `<div class="block">
        <div class="block-title">DEST. ${numDest} : ${d.destinataire}</div>
        ${d.telephone ? `<div class="row"><span class="label">Tel :</span><span class="val">${d.telephone}</span></div>` : ""}
        ${d.lieu ? `<div class="row"><span class="label">Lieu :</span><span class="val">${d.lieu}</span></div>` : ""}
        ${itemsHtml}
        <div style="margin-top:4px; padding-top:4px; border-top:1px solid #000;">
          ${d.totalMontant > 0 ? `<div class="row"><span class="label">Montant :</span><span class="val">${formatAr(d.totalMontant)}</span></div>` : ""}
          ${d.totalFrais > 0 ? `<div class="row"><span class="label">Frais :</span><span class="val">${formatAr(d.totalFrais)}</span></div>` : ""}
          <div class="row bold"><span class="label">TOTAL :</span><span class="val">${formatAr(totalDest)}</span></div>
        </div>
      </div>`;
      numDest++;
    }

    const html = `
<div class="no-print">
  <button class="btn-print" onclick="window.print()">IMPRIMER</button>
  <button class="btn-close" onclick="window.close()">FERMER</button>
</div>
<div class="center">
  <div class="bold" style="font-size:14px; letter-spacing:1px;">${config.name.toUpperCase()}</div>
  <div style="font-size:11px;">FEUILLE DE LIVRAISON</div>
</div>
<hr class="sep">
<div class="row"><span class="label">DATE :</span><span class="val">${date}</span></div>
<div class="row"><span class="label">LIVREUR :</span><span class="val">${agent.nom.toUpperCase()}</span></div>
<div class="row"><span class="label">COLIS :</span><span class="val">${dayLivraisons.length}</span></div>
<hr class="sep">
${corpsHtml}
<div class="total-section">
  <div style="font-size:11px; margin-bottom:4px; text-transform:uppercase; letter-spacing:1px;">RECAPITULATIF</div>
  ${grandMontant > 0 ? `<div class="row"><span class="label">Total montant :</span><span class="val">${formatAr(grandMontant)}</span></div>` : ""}
  ${grandFrais > 0 ? `<div class="row"><span class="label">Total frais :</span><span class="val">${formatAr(grandFrais)}</span></div>` : ""}
  <div class="row total-grand"><span class="label">A REMETTRE :</span><span class="val">${formatAr(grandMontant + grandFrais)}</span></div>
</div>
<div class="center" style="font-size:10px; margin-top:6px;">Signature livreur :</div>
<div style="height:28px; border-bottom:1px solid #000; margin:4px 8px;"></div>
<div class="no-print">
  <button class="btn-print" onclick="window.print()">IMPRIMER</button>
  <button class="btn-close" onclick="window.close()">FERMER</button>
</div>`;

    openPrintWindow(html, `Feuille ${agent.nom} ${date}`);
  };

  return (
    <>
      <div className="mb-6">
        <Card className="p-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold">Bons de Livraison</CardTitle>
            <div className="flex flex-wrap gap-3">
              <Input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
                className="w-32"
              />
              <Select
                value={filters.agent_id}
                onChange={(e) => setFilters((f) => ({ ...f, agent_id: e.target.value }))}
                className="w-36"
                options={[
                  { value: "", label: "Tous agents" },
                  ...agents.map((a) => ({ value: a.id, label: a.nom })),
                ]}
              />
              <Select
                value={filters.statut}
                onChange={(e) => setFilters((f) => ({ ...f, statut: e.target.value }))}
                className="w-32"
                options={[
                  { value: "", label: "Tous statuts" },
                  { value: "en_cours", label: "En cours" },
                  { value: "livre", label: "Livré" },
                  { value: "retourne", label: "Retourné" },
                ]}
              />
              <Button onClick={loadData}>Filtrer</Button>
              <Button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                + Nouveau
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Print all for agent */}
      {agents.length > 0 && (
        <div className="mb-4 flex gap-2 flex-wrap">
          <span className="text-sm font-medium self-center">Feuille agent :</span>
          {agents.map((a) => (
            <Button key={a.id} variant="outline" size="sm" onClick={() => printAgentList(a.id)}>
              {a.nom}
            </Button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
        </div>
      ) : livraisons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucune livraison.</div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHead>
              <TableRow>
                <TableCell>Colis</TableCell>
                <TableCell>Donneur</TableCell>
                <TableCell>Destinataire</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell className="text-right">Montant</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {livraisons.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-semibold">{l.colis}</TableCell>
                  <TableCell>{l.client_donneur || "—"}</TableCell>
                  <TableCell>{l.destinataire}</TableCell>
                  <TableCell>{l.agent_nom || "—"}</TableCell>
                  <TableCell className="text-right">
                    {l.paiement === "client" ? "CLIENT" : formatAr(l.montant)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        l.statut === "livre"
                          ? "success"
                          : l.statut === "retourne"
                            ? "danger"
                            : "default"
                      }
                    >
                      {l.statut}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => setSelectedLivraison(l)}>
                        Voir
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => printBon(l)}>
                        Imprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal Nouveau */}
      {showForm && (
        <Modal open={true} onClose={resetForm}>
          <ModalHeader title="Nouveau bon de livraison" onClose={resetForm} />
          <ModalBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Colis *</label>
                <Input
                  value={form.colis}
                  onChange={(e) => setForm((f) => ({ ...f, colis: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Client donneur</label>
                <Input
                  value={form.client_donneur}
                  onChange={(e) => setForm((f) => ({ ...f, client_donneur: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Destinataire *</label>
                <Input
                  value={form.destinataire}
                  onChange={(e) => setForm((f) => ({ ...f, destinataire: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Tél destinataire</label>
                <Input
                  value={form.destinataire_telephone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, destinataire_telephone: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium">Lieu</label>
                <Input
                  value={form.destinataire_lieu}
                  onChange={(e) => setForm((f) => ({ ...f, destinataire_lieu: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Agent</label>
                <Select
                  value={form.agent_id}
                  onChange={(e) => setForm((f) => ({ ...f, agent_id: e.target.value }))}
                  options={[
                    { value: "", label: "—" },
                    ...agents.map((a) => ({ value: a.id, label: a.nom })),
                  ]}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Montant</label>
                <Input
                  type="number"
                  value={String(form.montant)}
                  onChange={(e) => setForm((f) => ({ ...f, montant: Number(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Frais</label>
                <Input
                  type="number"
                  value={String(form.frais)}
                  onChange={(e) => setForm((f) => ({ ...f, frais: Number(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Paiement</label>
                <Select
                  value={form.paiement}
                  onChange={(e) => setForm((f) => ({ ...f, paiement: e.target.value }))}
                  options={[
                    { value: "espece", label: "Espèces" },
                    { value: "client", label: "Client" },
                  ]}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Date</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Statut</label>
                <Select
                  value={form.statut}
                  onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}
                  options={[
                    { value: "en_cours", label: "En cours" },
                    { value: "livre", label: "Livré" },
                    { value: "retourne", label: "Retourné" },
                  ]}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium">Remarque</label>
                <Input
                  value={form.remarque}
                  onChange={(e) => setForm((f) => ({ ...f, remarque: e.target.value }))}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={resetForm} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.colis || !form.destinataire}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Modal Voir */}
      {selectedLivraison && (
        <Modal open={true} onClose={() => setSelectedLivraison(null)}>
          <ModalHeader
            title={`Bon — ${selectedLivraison.colis}`}
            onClose={() => setSelectedLivraison(null)}
          />
          <ModalBody>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Donneur:</span>{" "}
                <span className="font-medium">{selectedLivraison.client_donneur || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>{" "}
                <span className="font-medium">
                  {new Date(selectedLivraison.date).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Destinataire:</span>{" "}
                <span className="font-medium">{selectedLivraison.destinataire}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tél:</span>{" "}
                <span className="font-medium">
                  {selectedLivraison.destinataire_telephone || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Lieu:</span>{" "}
                <span className="font-medium">{selectedLivraison.destinataire_lieu || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Agent:</span>{" "}
                <span className="font-medium">{selectedLivraison.agent_nom || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Montant:</span>{" "}
                <span className="font-medium">
                  {selectedLivraison.paiement === "client"
                    ? "CLIENT"
                    : formatAr(selectedLivraison.montant)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Statut:</span>{" "}
                <Badge variant={selectedLivraison.statut === "livre" ? "success" : "default"}>
                  {selectedLivraison.statut}
                </Badge>
              </div>
            </div>
            {selectedLivraison.remarque && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                <span className="font-medium">Remarque:</span> {selectedLivraison.remarque}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => printBon(selectedLivraison)}>
              Imprimer
            </Button>
            <Button onClick={() => setSelectedLivraison(null)}>Fermer</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}

export const dynamic = "force-dynamic";
