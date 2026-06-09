"use client";

import { useEffect, useState } from "react";
import { getCurrentCompany, getSupabase } from "@/lib/supabase";
import {
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
  TableRow,
} from "@/modules/shared/components/ui";
import type { Company, Produit } from "@/modules/shared/types";
import { formatAr, TODAY } from "@/modules/shared/utils/constants";
import { getCompanyConfig, openPrintWindow } from "../printStyles";

interface DevisItem {
  produit_id: string;
  nom: string;
  reference: string;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
}

interface DevisRecord {
  id: string;
  company_id: string;
  client_nom: string;
  client_telephone: string;
  date_devis: string;
  validite_jours: number;
  notes: string;
  total: number;
  items: DevisItem[];
  created_at: string;
  numero_devis?: string;
  montant_total?: number;
  statut?: string;
}

export default function DevisTemplatePage() {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [devisItems, setDevisItems] = useState<DevisItem[]>([]);
  const [searchProduit, setSearchProduit] = useState("");
  const [devisInfo, setDevisInfo] = useState({
    client_nom: "",
    client_telephone: "",
    date_devis: TODAY(),
    validite_jours: 30,
    notes: "",
  });

  const [devisList, setDevisList] = useState<DevisRecord[]>([]);
  const [showHistory, _setShowHistory] = useState(true);

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
    const [produitsRes, devisRes] = await Promise.all([
      getSupabase()
        .from("produits")
        .select("*")
        .eq("company_id", currentCompany!.id)
        .eq("is_active", true)
        .order("nom"),
      getSupabase()
        .from("devis")
        .select("*")
        .eq("company_id", currentCompany!.id)
        .order("date_devis", { ascending: false })
        .limit(50),
    ]);
    if (!produitsRes.error) setProduits(produitsRes.data || []);
    if (!devisRes.error) setDevisList(devisRes.data || []);
    setLoading(false);
  };

  const addToDevis = (produit: Produit) => {
    const existing = devisItems.find((d) => d.produit_id === produit.id);
    if (existing) {
      setDevisItems(
        devisItems.map((d) =>
          d.produit_id === produit.id
            ? { ...d, quantite: d.quantite + 1, sous_total: (d.quantite + 1) * d.prix_unitaire }
            : d,
        ),
      );
    } else {
      setDevisItems([
        ...devisItems,
        {
          produit_id: produit.id,
          nom: produit.nom,
          reference: produit.reference ?? "",
          quantite: 1,
          prix_unitaire: produit.prix_vente || 0,
          sous_total: produit.prix_vente || 0,
        },
      ]);
    }
  };

  const updateQty = (produitId: string, qty: number) => {
    if (qty <= 0) {
      setDevisItems(devisItems.filter((d) => d.produit_id !== produitId));
      return;
    }
    setDevisItems(
      devisItems.map((d) =>
        d.produit_id === produitId ? { ...d, quantite: qty, sous_total: qty * d.prix_unitaire } : d,
      ),
    );
  };

  const updatePrice = (produitId: string, price: number) => {
    setDevisItems(
      devisItems.map((d) =>
        d.produit_id === produitId
          ? { ...d, prix_unitaire: price, sous_total: d.quantite * price }
          : d,
      ),
    );
  };

  const removeItem = (produitId: string) => {
    setDevisItems(devisItems.filter((d) => d.produit_id !== produitId));
  };

  const totalDevis = devisItems.reduce((s, d) => s + d.sous_total, 0);

  const produitsFiltres = produits.filter(
    (p) =>
      !searchProduit ||
      p.nom.toLowerCase().includes(searchProduit.toLowerCase()) ||
      (p.reference || "").toLowerCase().includes(searchProduit.toLowerCase()),
  );

  const generateNumeroDevis = async () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const { data } = await getSupabase()
      .from("devis")
      .select("numero_devis")
      .eq("company_id", currentCompany!.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (!data || data.length === 0) return `DEV-${year}-0001`;
    const match = data[0].numero_devis.match(/\d+$/);
    if (match) return `DEV-${year}-${String(parseInt(match[0], 10) + 1).padStart(4, "0")}`;
    return `DEV-${year}-0001`;
  };

  const handleSaveDevis = async () => {
    if (devisItems.length === 0) return;
    setSaving(true);
    try {
      const numero = await generateNumeroDevis();
      const { data: devis, error } = await getSupabase()
        .from("devis")
        .insert({
          company_id: currentCompany!.id,
          numero_devis: numero,
          client_nom: devisInfo.client_nom,
          client_telephone: devisInfo.client_telephone,
          date_devis: devisInfo.date_devis,
          validite_jours: devisInfo.validite_jours,
          notes: devisInfo.notes,
          montant_total: totalDevis,
          statut: "en_attente",
        })
        .select()
        .single();
      if (error) throw error;
      for (const item of devisItems) {
        await getSupabase().from("devis_details").insert({
          devis_id: devis.id,
          produit_id: item.produit_id,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          sous_total: item.sous_total,
        });
      }
      resetForm();
      loadData();
    } catch (err: unknown) {
      alert(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDevisItems([]);
    setSearchProduit("");
    setShowForm(false);
    setDevisInfo({
      client_nom: "",
      client_telephone: "",
      date_devis: TODAY(),
      validite_jours: 30,
      notes: "",
    });
  };

  const printDevis = async (devis: DevisRecord) => {
    const { data: items } = await getSupabase()
      .from("devis_details")
      .select("*, produit:produits(nom,reference)")
      .eq("devis_id", devis.id);
    const config = getCompanyConfig(currentCompany!.slug as string);
    const date = new Date(devis.date_devis).toLocaleDateString("fr-FR");
    const validite = new Date(
      new Date(devis.date_devis).getTime() + devis.validite_jours * 86400000,
    ).toLocaleDateString("fr-FR");
    const rows = (items || [])
      .map(
        (d) => `
      <tr>
        <td>${d.produit?.nom || "Produit"}</td>
        <td class="text-right">${d.quantite}</td>
        <td class="text-right">${formatAr(d.prix_unitaire)}</td>
        <td class="text-right">${formatAr(d.sous_total)}</td>
      </tr>`,
      )
      .join("");

    const html = `
<div class="no-print">
  <button class="btn-print" onclick="window.print()">IMPRIMER</button>
  <button class="btn-close" onclick="window.close()">FERMER</button>
</div>
<div class="center">
  <div class="bold" style="font-size:16px; letter-spacing:2px;">${config.name.toUpperCase()}</div>
  <div style="font-size:12px; margin-top:4px;">DEVIS</div>
</div>
<hr class="sep">
<div class="row"><span class="label">N° Devis :</span><span class="val">${devis.numero_devis}</span></div>
<div class="row"><span class="label">Date :</span><span class="val">${date}</span></div>
<div class="row"><span class="label">Validité :</span><span class="val">${devis.validite_jours} jours (jusqu'au ${validite})</span></div>
<div class="row"><span class="label">Client :</span><span class="val">${devis.client_nom || "—"}</span></div>
${devis.client_telephone ? `<div class="row"><span class="label">Tél :</span><span class="val">${devis.client_telephone}</span></div>` : ""}
<hr class="sep">
<table>
  <thead><tr><th>Article</th><th class="text-right">Qté</th><th class="text-right">Prix unit.</th><th class="text-right">Total</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<hr class="sep">
<div class="total-section">
  <div class="row total-grand"><span class="label">TOTAL ESTIMÉ :</span><span class="val">${formatAr(devis.montant_total)}</span></div>
</div>
${devis.notes ? `<div style="margin-top:8px; padding:5px; border:1px solid #000;"><span class="bold">Notes :</span> ${devis.notes}</div>` : ""}
<div class="center" style="margin-top:12px; font-size:11px;">${config.footer}</div>
<div class="no-print">
  <button class="btn-print" onclick="window.print()">IMPRIMER</button>
  <button class="btn-close" onclick="window.close()">FERMER</button>
</div>`;

    openPrintWindow(html, `Devis ${devis.numero_devis}`);
  };

  return (
    <>
      <div className="mb-6">
        <Card className="p-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold">Devis</CardTitle>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                + Nouveau devis
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Historique */}
      {showHistory && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Historique des devis</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
            </div>
          ) : devisList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Aucun devis.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHead>
                  <TableRow>
                    <TableCell>N° Devis</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell className="text-right">Montant</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {devisList.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-semibold">{d.numero_devis}</TableCell>
                      <TableCell>{new Date(d.date_devis).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>{d.client_nom || "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAr(d.montant_total)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${d.statut === "accepte" ? "bg-green-100 text-green-700" : d.statut === "refuse" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}
                        >
                          {d.statut === "accepte"
                            ? "Accepté"
                            : d.statut === "refuse"
                              ? "Refusé"
                              : "En attente"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => printDevis(d)}>
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
        </div>
      )}

      {/* Modal Nouveau Devis */}
      {showForm && (
        <Modal open={true} onClose={resetForm}>
          <ModalHeader
            title="Nouveau devis"
            subtitle={`${devisItems.length} article(s) · Total: ${formatAr(totalDevis)}`}
            onClose={resetForm}
          />
          <ModalBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Produits */}
              <div>
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                  Produits
                </div>
                <Input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchProduit}
                  onChange={(e) => setSearchProduit(e.target.value)}
                  className="mb-2"
                />
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {produitsFiltres.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center p-2 rounded-lg text-sm hover:bg-gray-50"
                    >
                      <div>
                        <div className="font-medium">{p.nom}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatAr(p.prix_vente)}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => addToDevis(p)}>
                        +
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Devis items */}
              <div>
                <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">
                  Articles du devis
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 mb-3 space-y-1">
                  {devisItems.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-4">
                      Aucun article
                    </div>
                  ) : (
                    devisItems.map((item) => (
                      <div key={item.produit_id} className="flex items-center gap-2 p-1 text-sm">
                        <span className="flex-1 font-medium truncate">{item.nom}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(item.produit_id, item.quantite - 1)}
                            className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-xs bg-white"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-bold text-xs">{item.quantite}</span>
                          <button
                            onClick={() => updateQty(item.produit_id, item.quantite + 1)}
                            className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-xs bg-white"
                          >
                            +
                          </button>
                        </div>
                        <Input
                          type="number"
                          value={String(item.prix_unitaire)}
                          onChange={(e) =>
                            updatePrice(item.produit_id, parseFloat(e.target.value) || 0)
                          }
                          className="w-20 h-7 text-xs"
                        />
                        <span className="text-xs font-medium w-16 text-right">
                          {formatAr(item.sous_total)}
                        </span>
                        <button
                          onClick={() => removeItem(item.produit_id)}
                          className="text-red-500 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium">Client</label>
                    <Input
                      type="text"
                      value={devisInfo.client_nom}
                      onChange={(e) => setDevisInfo((f) => ({ ...f, client_nom: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Téléphone</label>
                    <Input
                      type="text"
                      value={devisInfo.client_telephone}
                      onChange={(e) =>
                        setDevisInfo((f) => ({ ...f, client_telephone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium">Date</label>
                      <Input
                        type="date"
                        value={devisInfo.date_devis}
                        onChange={(e) =>
                          setDevisInfo((f) => ({ ...f, date_devis: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Validité (jours)</label>
                      <Input
                        type="number"
                        value={String(devisInfo.validite_jours)}
                        onChange={(e) =>
                          setDevisInfo((f) => ({
                            ...f,
                            validite_jours: parseInt(e.target.value, 10) || 30,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Notes</label>
                    <Input
                      type="text"
                      value={devisInfo.notes}
                      onChange={(e) => setDevisInfo((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Notes (optionnel)"
                    />
                  </div>
                </div>

                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex justify-between font-bold text-base">
                    <span>TOTAL ESTIMÉ</span>
                    <span>{formatAr(totalDevis)}</span>
                  </div>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={resetForm} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSaveDevis} disabled={saving || devisItems.length === 0}>
              {saving ? "Enregistrement..." : "Enregistrer le devis"}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}

export const dynamic = "force-dynamic";
