// printAgent.ts — Ticket livreur : liste des livraisons par destinataire
import type { Company, Livraison } from "@/modules/shared/types";
import { formatAr } from "./constants";
import { getStatusCfg, getIconSvg, getCompanyLogo, THERMAL_CSS, openPrintWindow, closePrintWindow } from "./pdfExport";

interface Agent {
  nom?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// TICKET LIVREUR — Liste des livraisons par destinataire
// ═══════════════════════════════════════════════════════════════════════
export function printAgentList(
  agent: Agent,
  livraisons: Livraison[],
  date: string,
  logoUrlParam: string | null = null,
  company: Company | null = null,
): void {
  const w = openPrintWindow(`Livraison - ${agent.nom || "—"} - ${date}`);
  if (!w) return;

  const logoUrl = getCompanyLogo(logoUrlParam, company);
  const companyName = company?.name || "Aterinay Services";

  const destsMap: Record<string, { destinataire: string; telephone: string; lieu: string; items: Livraison[]; totalMontant: number; totalFrais: number }> = {};
  let grandMontant = 0;
  let grandFrais = 0;

  for (const l of livraisons) {
    const dest = l.destinataire || "—";
    const montant = l.paiement === "client" ? 0 : parseFloat(String(l.montant || 0));
    const frais = parseFloat(String(l.frais || 0));
    grandMontant += montant;
    grandFrais += frais;

    if (!destsMap[dest]) {
      destsMap[dest] = { destinataire: dest, telephone: l.destinataire_telephone || "", lieu: l.destinataire_lieu || "", items: [], totalMontant: 0, totalFrais: 0 };
    }
    destsMap[dest].items.push(l);
    destsMap[dest].totalMontant += montant;
    destsMap[dest].totalFrais += frais;
  }

  let corpsHtml = "";
  let numDest = 1;

  for (const key of Object.keys(destsMap)) {
    const d = destsMap[key];
    const totalDest = d.totalMontant + d.totalFrais;

    let itemsHtml = "";
    d.items.forEach((l: Livraison, i: number) => {
      const montant = l.paiement === "client" ? 0 : parseFloat(String(l.montant || 0));
      const frais = parseFloat(String(l.frais || 0));
      const montantTxt = l.paiement === "client" ? "CLIENT" : formatAr(montant);
      const sc = getStatusCfg(l.statut);
      const iconSvg = getIconSvg(sc.icon, sc.color);

      itemsHtml += `
      <div class="livraison-item">
        <div class="bold" style="font-size:12px;">${i + 1}. ${l.colis || "—"}</div>
        <div class="row"><span class="label">Donneur :</span><span class="val">${l.client_donneur || "—"}</span></div>
        <div class="row"><span class="label">Montant :</span><span class="val">${montantTxt}</span></div>
        ${frais > 0 ? `<div class="row"><span class="label">Frais   :</span><span class="val">${formatAr(frais)}</span></div>` : ""}
        <div class="row">
          <span class="label">Statut  :</span>
          <span class="val" style="color:${sc.color};">${iconSvg} ${sc.label}</span>
        </div>
      </div>`;
    });

    corpsHtml += `
    <div class="block">
      <div class="block-title">DEST. ${numDest} : ${d.destinataire}</div>
      ${d.telephone ? `<div class="row"><span class="label">Tel  :</span><span class="val">${d.telephone}</span></div>` : ""}
      ${d.lieu ? `<div class="row"><span class="label">Lieu :</span><span class="val">${d.lieu}</span></div>` : ""}
      ${itemsHtml}
      <div style="margin-top:4px; padding-top:4px; border-top:1px solid #000;">
        ${d.totalMontant > 0 ? `<div class="row"><span class="label">Montant :</span><span class="val">${formatAr(d.totalMontant)}</span></div>` : ""}
        ${d.totalFrais > 0 ? `<div class="row"><span class="label">Frais   :</span><span class="val">${formatAr(d.totalFrais)}</span></div>` : ""}
        <div class="row bold"><span class="label">TOTAL   :</span><span class="val">${formatAr(totalDest)}</span></div>
      </div>
    </div>`;
    numDest++;
  }

  const agentNom = agent.nom || "—";

  w.document.write(`<!DOCTYPE html>
  <html><head><meta charset="UTF-8"><title>${companyName} - ${agentNom} - ${date}</title>
  <style>body { width:80mm; } ${THERMAL_CSS}</style>
  </head><body>
  <div class="no-print" style="text-align:center; padding:8px 0; border-bottom:2px solid #000; margin-bottom:8px;">
    <button class="btn-print" onclick="window.print()">IMPRIMER</button>
    <button class="btn-close" onclick="window.close()">FERMER</button>
  </div>
  <div class="center">
    <img src="${logoUrl}" class="logo" onerror="this.style.display='none'">
    <div class="bold" style="font-size:14px; letter-spacing:1px;">${companyName.toUpperCase()}</div>
    <div style="font-size:11px;">FEUILLE DE LIVRAISON</div>
  </div>
  <hr class="sep">
  <div class="row"><span class="label">DATE    :</span><span class="val">${date}</span></div>
  <div class="row"><span class="label">LIVREUR :</span><span class="val">${agentNom.toUpperCase()}</span></div>
  <div class="row"><span class="label">COLIS   :</span><span class="val">${livraisons.length}</span></div>
  <hr class="sep">
  ${corpsHtml}
  <div class="total-section">
    <div style="font-size:11px; margin-bottom:4px; text-transform:uppercase; letter-spacing:1px;">RECAPITULATIF</div>
    ${grandMontant > 0 ? `<div class="row"><span class="label">Total montant :</span><span class="val">${formatAr(grandMontant)}</span></div>` : ""}
    ${grandFrais > 0 ? `<div class="row"><span class="label">Total frais   :</span><span class="val">${formatAr(grandFrais)}</span></div>` : ""}
    <div class="row total-grand"><span class="label">A REMETTRE    :</span><span class="val">${formatAr(grandMontant + grandFrais)}</span></div>
  </div>
  <div class="sep2">- - - - - - - - - - - - - -</div>
  <div class="center" style="font-size:10px;">Signature livreur :</div>
  <div style="height:28px; border-bottom:1px solid #000; margin:4px 8px;"></div>
  <div class="center" style="font-size:9px; margin-top:6px;">Merci pour votre travail</div>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">IMPRIMER</button>
    <button class="btn-close" onclick="window.close()">FERMER</button>
  </div>
  </body></html>`);

  closePrintWindow(w);
  setTimeout(() => w.print(), 400);
}
