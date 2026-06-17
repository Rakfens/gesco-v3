import { logger } from "@/lib/logger";

export function exportToCSV(
  data: Record<string, unknown>[],
  headers: string[],
  filename: string,
  options: { separator?: string; encoding?: string; includeHeaders?: boolean } = {},
): void {
  if (!data?.length) {
    logger.warn("Aucune donnée à exporter");
    return;
  }

  const { separator = ",", encoding = "\uFEFF", includeHeaders = true } = options;
  const rows: string[] = [];

  if (includeHeaders) {
    rows.push(headers.map((h) => formatCSVCell(h)).join(separator));
  }

  data.forEach((row) => {
    const csvRow = headers.map((header) => {
      let value = row[header];
      if (typeof value === "object" && value !== null) {
        value =
        (value as Record<string, unknown>).label ||
        (value as Record<string, unknown>).name ||
        JSON.stringify(value);
      }
      return formatCSVCell(value);
    });
    rows.push(csvRow.join(separator));
  });

  const csvContent = encoding + rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const formatCSVCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  let stringValue = String(value);
  stringValue = stringValue.replace(/"/g, '""');
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    stringValue = `"${stringValue}"`;
  }
  return stringValue;
};

// ── Helpers d'export ───────────────────────────────────────────────────

const makeFilename = (prefix: string, companyName: string): string =>
`${prefix}_${companyName}_${new Date().toISOString().split("T")[0]}`;

export const exportLivraisonsToCSV = (
  livraisons: Record<string, unknown>[],
  companyName = "aterinay",
): void => {
  exportToCSV(
    livraisons,
    [
      "id", "colis", "client_donneur", "destinataire",
      "destinataire_telephone", "agent_nom", "montant", "frais",
      "paiement", "date", "statut",
    ],
    makeFilename("livraisons", companyName),
  );
};

export const exportAgentsToCSV = (
  agents: Record<string, unknown>[],
  companyName = "aterinay",
): void => {
  exportToCSV(agents, ["id", "nom", "salaire", "created_at"], makeFilename("agents", companyName));
};

export const exportAvancesToCSV = (
  avances: Record<string, unknown>[],
  companyName = "aterinay",
): void => {
  exportToCSV(
    avances,
    ["id", "agent_nom", "montant", "motif", "date", "mois", "annule"],
    makeFilename("avances", companyName),
  );
};

export const exportRecuperationsToCSV = (
  recuperations: Record<string, unknown>[],
  companyName = "aterinay",
): void => {
  exportToCSV(
    recuperations,
    ["id", "date", "livreur_nom", "client_donneur", "frais_recuperation"],
    makeFilename("recuperations", companyName),
  );
};

export const exportProduitsToCSV = (
  produits: Record<string, unknown>[],
  companyName = "commerce",
): void => {
  exportToCSV(
    produits,
    [
      "id", "nom", "reference", "categorie", "prix_achat",
      "prix_vente", "quantite_stock", "stock_minimum", "unite",
    ],
    makeFilename("produits", companyName),
  );
};

export const exportVentesToCSV = (
  ventes: Record<string, unknown>[],
  companyName = "commerce",
): void => {
  exportToCSV(
    ventes,
    [
      "numero_facture", "client_nom", "client_telephone",
      "date_vente", "montant_total", "remise", "montant_paye",
      "reste_a_payer", "statut", "type_paiement",
    ],
    makeFilename("ventes", companyName),
  );
};

export const exportAchatsToCSV = (
  achats: Record<string, unknown>[],
  companyName = "commerce",
): void => {
  exportToCSV(
    achats,
    [
      "numero_commande", "fournisseur_nom", "fournisseur_contact",
      "date_achat", "montant_total", "montant_paye", "statut",
    ],
    makeFilename("achats", companyName),
  );
};

export const exportDepensesToCSV = (
  depenses: Record<string, unknown>[],
  companyName = "pomanay",
): void => {
  exportToCSV(
    depenses,
    ["date", "categorie", "description", "montant"],
    makeFilename("depenses", companyName),
  );
};

export const exportStockToCSV = (
  produits: Record<string, unknown>[],
  companyName = "commerce",
): void => {
  const data = produits.map((p) => ({
    ...p,
    valeur_stock: (Number(p.quantite_stock) || 0) * (Number(p.prix_achat) || 0),
  }));
  exportToCSV(
    data,
    [
      "nom", "reference", "categorie", "prix_achat", "prix_vente",
      "quantite_stock", "stock_minimum", "valeur_stock", "unite",
    ],
    makeFilename("stock", companyName),
  );
};
