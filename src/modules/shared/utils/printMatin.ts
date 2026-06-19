// printMatin.ts — Liste du matin : impression groupée de tous les agents pour une date
import type { Company, Livraison } from "@/modules/shared/types";
import { formatAr } from "./constants";
import { getStatusCfg, getIconSvg, getCompanyLogo, THERMAL_CSS, openPrintWindow, closePrintWindow } from "./pdfExport";

// ═══════════════════════════════════════════════════════════════════════
// LISTE DU MATIN — Impression groupée de tous les agents pour une date
// ═══════════════════════════════════════════════════════════════════════
export function printMatinList(
  livraisons: Livraison[],
  date: string,
  logoUrlParam: string | null = null,
  company: Company | null = null,
): void {
  const w = openPrintWindow(`Liste du matin - ${date}`);
  if (!w) return;

  const logoUrl = getCompanyLogo(logoUrlParam, company);
  const companyName = company?.name || "Aterinay Services";

  const agentMap: Record<string, { agent: string; items: Livraison[]; totalFrais: number; totalMontant: number }> = {};
  let grandFrais = 0;
  let grandMontant = 0;

  for (const l of livraisons) {
    const agentName = l.agent_nom || "Non assigné";
    const frais = parseFloat(String(l.frais || 0));
    const montant = l.paiement === "client" ? 0 : parseFloat(String(l.montant || 0));
    grandFrais += frais;
    grandMontant += montant;

    if (!agentMap[agentName]) {
      agentMap[agentName] = { agent: agentName, items: [], totalFrais: 0, totalMontant: 0 };
    }
    agentMap[agentName].items.push(l);
    agentMap[agentName].totalFrais += frais;
    agentMap[agentName].totalMontant += montant;
  }

  const agents = Object.values(agentMap).sort((a, b) => a.agent.localeCompare(b.agent));

  let corpsHtml = "";
  agents.forEach((a) => {
    const destsMap: Record<string, { destinataire: string; telephone: string; lieu: string; items: Livraison[]; totalFrais: number; totalMontant: number }> = {};
    for (const l of a.items) {
      const dest = l.destinataire || "—";
      if (!destsMap[dest]) {
        destsMap[dest] = { destinataire: dest, telephone: l.destinataire_telephone || "", lieu: l.destinataire_lieu || "", items: [], totalFrais: 0, totalMontant: 0 };
      }
      destsMap[dest].items.push(l);
      destsMap[dest].totalFrais += parseFloat(String(l.frais || 0));
      destsMap[dest].totalMontant += l.paiement === "client" ? 0 : parseFloat(String(l.montant || 0));
    }

    let destsHtml = "";
    let numDest = 1;
    for (const key of Object.keys(destsMap)) {
      const d = destsMap[key];
      let itemsHtml = "";
      d.items.forEach((l, i) => {
        const montant = l.paiement === "client" ? 0 : parseFloat(String(l.montant || 0));
        const frais = parseFloat(String(l.frais || 0));
        const sc = getStatusCfg(l.statut);
        const iconSvg = getIconSvg(sc.icon, sc.color);
        itemsHtml += `
          <div class="livraison-item">
            <div class="bold" style="font-size:11px;">${i + 1}. ${l.colis || "—"}</div>
            <div class="row"><span class="label">Donneur :</span><span class="val">${l.client_donneur || "—"}</span></div>
            <div class="row"><span class="label">Montant :</span><span class="val">${l.paiement === "client" ? "CLIENT" : formatAr(montant)}</span></div>
            ${frais > 0 ? `<div class="row"><span class="label">Frais   :</span><span class="val">${formatAr(frais)}</span></div>` : ""}
            <div class="row"><span class="label">Statut  :</span><span class="val" style="color:${sc.color};">${iconSvg} ${sc.label}</span></div>
          </div>`;
      });

      destsHtml += `
        <div class="block">
          <div class="block-title">DEST. ${numDest} : ${d.destinataire}</div>
          ${d.telephone ? `<div class="row"><span class="label">Tel  :</span><span class="val">${d.telephone}</span></div>` : ""}
          ${d.lieu ? `<div class="row"><span class="label">Lieu :</span><span class="val">${d.lieu}</span></div>` : ""}
          ${itemsHtml}
          <div style="margin-top:4px; padding-top:4px; border-top:1px solid #000;">
            <div class="row bold"><span class="label">TOTAL   :</span><span class="val">${formatAr(d.totalMontant + d.totalFrais)}</span></div>
          </div>
        </div>`;
      numDest++;
    }

    corpsHtml += `
      <div style="margin-top:10px; page-break-inside:avoid;">
        <div class="block-title" style="font-size:13px;">AGENT : ${a.agent.toUpperCase()}</div>
        <div class="row"><span class="label">Colis   :</span><span class="val">${a.items.length}</span></div>
        <div class="row"><span class="label">Frais   :</span><span class="val">${formatAr(a.totalFrais)}</span></div>
        <div class="row"><span class="label">Montant :</span><span class="val">${formatAr(a.totalMontant)}</span></div>
        <hr class="sep">
        ${destsHtml}
      </div>`;
  });

  const dateFormatted = new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  w.document.write(`<!DOCTYPE html>
  <html><head><meta charset="UTF-8"><title>Liste du matin - ${companyName} - ${date}</title>
  <style>body { width:80mm; } ${THERMAL_CSS}</style>
  </head><body>
  <div class="no-print" style="text-align:center; padding:8px 0; border-bottom:2px solid #000; margin-bottom:8px;">
    <button class="btn-print" onclick="window.print()">IMPRIMER</button>
    <button class="btn-close" onclick="window.close()">FERMER</button>
  </div>
  <div class="center">
    <img src="${logoUrl}" class="logo" onerror="this.style.display='none'">
    <div class="bold" style="font-size:14px; letter-spacing:1px;">${companyName.toUpperCase()}</div>
    <div style="font-size:11px;">LISTE DU MATIN</div>
  </div>
  <hr class="sep">
  <div class="row"><span class="label">DATE    :</span><span class="val">${dateFormatted}</span></div>
  <div class="row"><span class="label">COLIS   :</span><span class="val">${livraisons.length}</span></div>
  <div class="row"><span class="label">AGENTS  :</span><span class="val">${agents.length}</span></div>
  <hr class="sep">
  ${corpsHtml}
  <div class="total-section">
    <div style="font-size:11px; margin-bottom:4px; text-transform:uppercase; letter-spacing:1px;">RECAPITULATIF GENERAL</div>
    <div class="row"><span class="label">Total frais   :</span><span class="val">${formatAr(grandFrais)}</span></div>
    <div class="row"><span class="label">Total montant :</span><span class="val">${formatAr(grandMontant)}</span></div>
    <div class="row total-grand"><span class="label">A REMETTRE    :</span><span class="val">${formatAr(grandMontant + grandFrais)}</span></div>
  </div>
  <div class="sep2">- - - - - - - - - - - - - -</div>
  <div class="center" style="font-size:9px; margin-top:6px;">Merci pour votre travail</div>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">IMPRIMER</button>
    <button class="btn-close" onclick="window.close()">FERMER</button>
  </div>
  </body></html>`);

  closePrintWindow(w);
  setTimeout(() => w.print(), 400);
}
