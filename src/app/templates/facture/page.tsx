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
import type { Company, Vente, VenteDetail } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import { getCompanyConfig, openPrintWindow } from "../printStyles";

export default function FactureTemplatePage() {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [details, setDetails] = useState<VenteDetail[]>([]);
  const [filters, setFilters] = useState({ dateDebut: "", dateFin: "", statut: "", search: "" });

  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      loadVentes();
    }
  }, []);

  const loadVentes = async () => {
    if (!currentCompany) return;
    setLoading(true);
    let q = getSupabase()
      .from("ventes")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("date_vente", { ascending: false })
      .limit(50);
    if (filters.dateDebut) q = q.gte("date_vente", filters.dateDebut);
    if (filters.dateFin) q = q.lte("date_vente", filters.dateFin);
    if (filters.statut) q = q.eq("statut", filters.statut);
    if (filters.search)
      q = q.or(`client_nom.ilike.%${filters.search}%,numero_facture.ilike.%${filters.search}%`);
    const { data, error } = await q;
    if (!error) setVentes(data || []);
    setLoading(false);
  };

  const loadDetails = async (venteId: string) => {
    const { data } = await getSupabase()
      .from("vente_details")
      .select("*, produit:produits(nom,reference,prix_vente)")
      .eq("vente_id", venteId);
    return data || [];
  };

  const handlePreview = async (vente: Vente) => {
    setSelectedVente(vente);
    const d = await loadDetails(vente.id);
    setDetails(d);
  };

  const handlePrint = async (vente: Vente) => {
    const d = await loadDetails(vente.id);
    printFacture(vente, d, currentCompany);
  };

  const printFacture = (
    vente: Vente,
    details: Record<string, unknown>[],
    company: Company | null,
  ) => {
    const config = getCompanyConfig(company?.slug ?? "");
    const date = new Date(vente.date_vente ?? "").toLocaleDateString("fr-FR");
    const rows = details
      .map(
        (d: Record<string, unknown>) => `
      <tr>
        <td>${(d.produit as Record<string, unknown>)?.nom || "Produit"}</td>
        <td class="text-right">${String(d.quantite)}</td>
        <td class="text-right">${formatAr(Number(d.prix_unitaire) || 0)}</td>
        <td class="text-right">${formatAr(Number(d.sous_total) || 0)}</td>
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
  <div style="font-size:11px;">FACTURE</div>
</div>
<hr class="sep">
<div class="row"><span class="label">N° Facture :</span><span class="val">${vente.numero_facture}</span></div>
<div class="row"><span class="label">Date :</span><span class="val">${date}</span></div>
<div class="row"><span class="label">Client :</span><span class="val">${vente.client_nom || "—"}</span></div>
${vente.client_telephone ? `<div class="row"><span class="label">Tél :</span><span class="val">${vente.client_telephone}</span></div>` : ""}
<hr class="sep">
<table>
  <thead><tr><th>Article</th><th class="text-right">Qté</th><th class="text-right">Prix</th><th class="text-right">Total</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<hr class="sep">
<div class="total-section">
  <div class="row"><span class="label">Total HT :</span><span class="val">${formatAr(vente.montant_ht)}</span></div>
  ${(vente.remise || 0) > 0 ? `<div class="row"><span class="label">Remise :</span><span class="val">-${formatAr(vente.remise)}</span></div>` : ""}
  <div class="row total-grand"><span class="label">TOTAL :</span><span class="val">${formatAr(vente.montant_total ?? 0)}</span></div>
  <div class="row"><span class="label">Payé :</span><span class="val">${formatAr(vente.montant_paye)}</span></div>
  ${(vente.reste_a_payer || 0) > 0 ? `<div class="row"><span class="label">Reste :</span><span class="val">${formatAr(vente.reste_a_payer)}</span></div>` : ""}
  <div class="row"><span class="label">Paiement :</span><span class="val">${vente.type_paiement === "especes" ? "Espèces" : vente.type_paiement === "mobile_money" ? "Mobile Money" : "Carte"}</span></div>
</div>
<div class="center" style="margin-top:12px; font-size:11px;">${config.footer}</div>
<div class="no-print">
  <button class="btn-print" onclick="window.print()">IMPRIMER</button>
  <button class="btn-close" onclick="window.close()">FERMER</button>
</div>`;

    openPrintWindow(html, `Facture ${vente.numero_facture}`);
  };

  return (
    <>
      <div className="mb-6">
        <Card className="p-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold">Factures</CardTitle>
            <div className="flex flex-wrap gap-3">
              <Input
                type="date"
                value={filters.dateDebut}
                onChange={(e) => setFilters((f) => ({ ...f, dateDebut: e.target.value }))}
                className="w-32"
              />
              <Input
                type="date"
                value={filters.dateFin}
                onChange={(e) => setFilters((f) => ({ ...f, dateFin: e.target.value }))}
                className="w-32"
              />
              <Select
                value={filters.statut}
                onChange={(e) => setFilters((f) => ({ ...f, statut: e.target.value }))}
                className="w-36"
                options={[
                  { value: "", label: "Tous statuts" },
                  { value: "paye", label: "Payé" },
                  { value: "credit", label: "Crédit" },
                  { value: "en_attente", label: "En attente" },
                ]}
              />
              <Input
                type="text"
                placeholder="Client ou facture..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="w-44"
              />
              <Button onClick={loadVentes}>Filtrer</Button>
            </div>
          </CardHeader>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
        </div>
      ) : ventes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucune vente trouvée.</div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHead>
              <TableRow>
                <TableCell>Facture</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Client</TableCell>
                <TableCell className="text-right">Total</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ventes.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-semibold">{v.numero_facture}</TableCell>
                  <TableCell>{new Date(v.date_vente ?? "").toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>{v.client_nom || "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAr(v.montant_total)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        v.statut === "paye"
                          ? "success"
                          : v.statut === "credit"
                            ? "warning"
                            : "default"
                      }
                    >
                      {v.statut === "paye"
                        ? "Payé"
                        : v.statut === "credit"
                          ? "Crédit"
                          : "En attente"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handlePreview(v)}>
                        Aperçu
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePrint(v)}>
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

      {/* Modal Aperçu */}
      {selectedVente && (
        <Modal
          open={true}
          onClose={() => {
            setSelectedVente(null);
            setDetails([]);
          }}
        >
          <ModalHeader
            title={`Facture ${selectedVente.numero_facture}`}
            onClose={() => {
              setSelectedVente(null);
              setDetails([]);
            }}
          />
          <ModalBody>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Client:</span>{" "}
                  <span className="font-medium">{selectedVente.client_nom || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  <span className="font-medium">
                    {new Date(selectedVente!.date_vente as string).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tél:</span>{" "}
                  <span className="font-medium">{selectedVente.client_telephone || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Paiement:</span>{" "}
                  <span className="font-medium">{selectedVente.type_paiement}</span>
                </div>
              </div>
              <Table className="text-sm">
                <TableHead>
                  <TableRow>
                    <TableCell>Article</TableCell>
                    <TableCell className="text-right">Qté</TableCell>
                    <TableCell className="text-right">Prix</TableCell>
                    <TableCell className="text-right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {details.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{d.produit?.nom || "Produit"}</TableCell>
                      <TableCell className="text-right">{String(d.quantite)}</TableCell>
                      <TableCell className="text-right">
                        {formatAr(Number(d.prix_unitaire) || 0)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAr(Number(d.sous_total) || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total HT</span>
                  <span>{formatAr(selectedVente.montant_ht)}</span>
                </div>
                {(selectedVente.remise || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Remise</span>
                    <span>-{formatAr(selectedVente.remise)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>TOTAL</span>
                  <span>{formatAr(selectedVente.montant_total)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Payé</span>
                  <span>{formatAr(selectedVente.montant_paye)}</span>
                </div>
                {(selectedVente.reste_a_payer || 0) > 0 && (
                  <div className="flex justify-between text-orange-500 font-bold">
                    <span>Reste</span>
                    <span>{formatAr(selectedVente.reste_a_payer)}</span>
                  </div>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => handlePrint(selectedVente)}>
              Imprimer
            </Button>
            <Button
              onClick={() => {
                setSelectedVente(null);
                setDetails([]);
              }}
            >
              Fermer
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}

export const dynamic = "force-dynamic";
