import type { Company, Vente } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import type { VenteDetailItem } from "./venteService";

interface CompanyConfig {
  name: string;
  logo: string;
  defaultLogo: string;
  footer: string;
}

const COMPANY_CONFIG: Record<string, CompanyConfig> = {
  aterinay: {
    name: "Aterinay Service",
    logo: "/logos/aterinay/logo.png",
    defaultLogo: "/logo-aterinay.png",
    footer: "Merci pour votre confiance",
  },
  pomanay: {
    name: "Pomanay",
    logo: "/logos/pomanay/logo.png",
    defaultLogo: "/logo-pomanay.png",
    footer: "Boutique accessoires téléphones - Merci de votre visite",
  },
  zazatiana: {
    name: "Zazatiana",
    logo: "/logos/zazatiana/logo.png",
    defaultLogo: "/logo-zazatiana.png",
    footer: "Boutique articles bébé - Merci de votre visite",
  },
};

export const printTicketVente = (
  vente: Vente,
  details: VenteDetailItem[],
  company: Company,
): void => {
  const config = COMPANY_CONFIG[company.slug ?? ""] || COMPANY_CONFIG.aterinay;
  const logoUrl = config.logo || config.defaultLogo;

  const date = vente.date_vente ? new Date(vente.date_vente).toLocaleString() : "";
  const numeroFacture = vente.numero_facture ?? "—";
  const remise = vente.remise ?? 0;
  const montantTotal = vente.montant_total ?? 0;
  const montantPaye = vente.montant_paye ?? 0;
  const montantHt = vente.montant_ht ?? 0;
  const resteAPayer = vente.reste_a_payer ?? 0;
  const ticketHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket de vente - ${numeroFacture}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 8px; background: white; color: black; }
        .header { text-align: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #000; }
        .logo { width: 50px; height: 50px; object-fit: contain; margin-bottom: 5px; }
        .shop-name { font-size: 16px; font-weight: bold; margin: 5px 0; }
        .shop-type { font-size: 10px; color: #666; }
        .info-line { display: flex; justify-content: space-between; margin: 4px 0; }
        .title { font-weight: bold; text-align: center; margin: 10px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th, td { text-align: left; padding: 4px 2px; border-bottom: 1px dotted #ccc; }
        th { font-weight: bold; border-bottom: 1px solid #000; }
        .text-right { text-align: right; }
        .total-row { font-weight: bold; border-top: 1px solid #000; margin-top: 5px; padding-top: 5px; }
        .footer { text-align: center; margin-top: 15px; padding-top: 8px; border-top: 1px dashed #000; font-size: 10px; }
        .thankyou { font-size: 11px; font-weight: bold; text-align: center; margin: 10px 0; }
        @media print { body { margin: 0; padding: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align:center; padding:8px 0; border-bottom:2px solid #000; margin-bottom:8px;">
        <button onclick="window.print()" style="padding:8px 20px; margin:4px; font-size:12px; background:#000; color:#fff; border:none; cursor:pointer;">IMPRIMER</button>
        <button onclick="window.close()" style="padding:8px 20px; margin:4px; font-size:12px; background:#fff; color:#000; border:2px solid #000; cursor:pointer;">FERMER</button>
      </div>
      <div class="header">
        <img src="${logoUrl}" class="logo" alt="Logo" onerror="this.style.display='none'">
        <div class="shop-name">${config.name}</div>
        <div class="shop-type">${company.type === "service" ? "Service" : "Boutique"}</div>
      </div>
      <div class="info-line"><span>Ticket N°:</span><span>${numeroFacture}</span></div>
      <div class="info-line"><span>Date:</span><span>${date}</span></div>
      <div class="info-line"><span>Client:</span><span>${vente.client_nom || "Client au comptant"}</span></div>
      ${vente.client_telephone ? `<div class="info-line"><span>Tél:</span><span>${vente.client_telephone}</span></div>` : ""}
      <div class="title">DÉTAILS DE LA VENTE</div>
      <table>
        <thead><tr><th>Article</th><th class="text-right">Qté</th><th class="text-right">Prix</th><th class="text-right">Total</th></tr></thead>
        <tbody>
          ${details
            .map(
              (d) => `
            <tr>
              <td>${d.produit?.nom || "Produit"}</td>
              <td class="text-right">${d.quantite}</td>
              <td class="text-right">${formatAr(d.prix_unitaire)}</td>
              <td class="text-right">${formatAr(d.sous_total ?? 0)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      <div class="info-line"><span>SOUS-TOTAL:</span><span>${formatAr(montantHt)}</span></div>
      ${remise > 0 ? `<div class="info-line"><span>REMISE:</span><span>- ${formatAr(remise)}</span></div>` : ""}
      <div class="info-line total-row"><span>TOTAL:</span><span>${formatAr(montantTotal)}</span></div>
      <div class="info-line"><span>Payé:</span><span>${formatAr(montantPaye)}</span></div>
      ${resteAPayer > 0 ? `<div class="info-line"><span>Reste à payer:</span><span>${formatAr(resteAPayer)}</span></div>` : ""}
      <div class="info-line"><span>Paiement:</span><span>${vente.type_paiement === "especes" ? "Espèces" : vente.type_paiement === "mobile_money" ? "Mobile Money" : "Carte"}</span></div>
      <div class="thankyou">Merci de votre visite !</div>
      <div class="footer">${config.footer}<br>${new Date().toLocaleDateString()}</div>
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; margin: 5px;">Imprimer</button>
        <button onclick="window.close()" style="padding: 10px 20px; margin: 5px;">Fermer</button>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(ticketHtml);
    printWindow.document.close();
    printWindow.focus();
  } else {
    alert("Veuillez autoriser les popups pour imprimer");
  }
};

export const printVentesList = (
  ventes: Vente[],
  company: Company,
  dateDebut: string,
  dateFin: string,
): void => {
  const config = COMPANY_CONFIG[company.slug ?? ""] || COMPANY_CONFIG.aterinay;
  const logoUrl = config.logo || config.defaultLogo;
  const totalVentes = ventes.reduce((s: number, v: Vente) => s + (v.montant_total || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Rapport des ventes</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 210mm; margin: 0 auto; padding: 20px; background: white; color: black; }
        .header { text-align: center; margin-bottom: 20px; }
        .logo { width: 60px; height: 60px; object-fit: contain; }
        .shop-name { font-size: 18px; font-weight: bold; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f0f0f0; }
        .text-right { text-align: right; }
        .total { font-weight: bold; margin-top: 10px; text-align: right; }
        .footer { text-align: center; margin-top: 30px; font-size: 10px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align:center; padding:8px 0; border-bottom:2px solid #000; margin-bottom:8px;">
        <button onclick="window.print()" style="padding:8px 20px; margin:4px; font-size:12px; background:#000; color:#fff; border:none; cursor:pointer;">IMPRIMER</button>
        <button onclick="window.close()" style="padding:8px 20px; margin:4px; font-size:12px; background:#fff; color:#000; border:2px solid #000; cursor:pointer;">FERMER</button>
      </div>
      <div class="header">
        <img src="${logoUrl}" class="logo" onerror="this.style.display='none'">
        <div class="shop-name">${config.name}</div>
        <div>Rapport des ventes</div>
        <div>Du ${new Date(dateDebut).toLocaleDateString()} au ${new Date(dateFin).toLocaleDateString()}</div>
      </div>
      <table>
        <thead><tr><th>N° Facture</th><th>Date</th><th>Client</th><th class="text-right">Montant</th><th>Statut</th></tr></thead>
        <tbody>
          ${ventes
            .map(
              (v) => `
            <tr>
              <td>${v.numero_facture ?? "—"}</td>
              <td>${v.date_vente ? new Date(v.date_vente).toLocaleDateString() : "—"}</td>
              <td>${v.client_nom || "-"}</td>
              <td class="text-right">${formatAr(v.montant_total)}</td>
              <td>${"En attente" /* v.statut not in Vente type */}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      <div class="total">TOTAL: ${formatAr(totalVentes)}</div>
      <div class="footer">${config.footer}<br>Généré le ${new Date().toLocaleString()}</div>
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px;">Imprimer</button>
        <button onclick="window.close()" style="padding: 10px 20px;">✕ Fermer</button>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    alert("Veuillez autoriser les popups pour imprimer");
  }
};
