import { logger } from "@/lib/logger";
import { getCurrentCompany, getSupabase } from "@/lib/supabase";
import type { Achat } from "@/modules/shared/types";
import { createMouvementStockManuel as createMouvementStock } from "./stockService";

interface AchatFilters {
  dateDebut?: string;
  dateFin?: string;
  statut?: string;
  fournisseur_nom?: string;
}

interface AchatData {
  numero_commande?: string;
  date_achat?: string;
  fournisseur_nom?: string;
  fournisseur_contact?: string;
  tva?: number;
  montant_paye?: number;
  statut?: string;
  notes?: string;
  created_by?: string;
}

interface AchatDetailItem {
  produit_id: string;
  quantite: number;
  prix_unitaire: number;
  sous_total?: number;
}

interface AchatWithDetails extends Achat {
  details: AchatDetailItem[];
}

export const fetchAchats = async (filters: AchatFilters = {}): Promise<Achat[]> => {
  const company = getCurrentCompany();
  if (!company) return [];

  let query = getSupabase()
    .from("achats")
    .select("*")
    .eq("company_id", company.id)
    .order("date_achat", { ascending: false });

  if (filters.dateDebut) {
    query = query.gte("date_achat", filters.dateDebut);
  }
  if (filters.dateFin) {
    query = query.lte("date_achat", filters.dateFin);
  }
  if (filters.statut) {
    query = query.eq("statut", filters.statut);
  }
  if (filters.fournisseur_nom) {
    query = query.ilike("fournisseur_nom", `%${filters.fournisseur_nom}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Achat[];
};

export const fetchAchatWithDetails = async (id: string): Promise<AchatWithDetails | null> => {
  const company = getCurrentCompany();
  if (!company) return null;

  const { data: achat, error: achatError } = await getSupabase()
    .from("achats")
    .select("*")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();

  if (achatError) throw achatError;

  const { data: details, error: detailsError } = await getSupabase()
    .from("achat_details")
    .select(`
      *,
      produit:produits(id, nom, reference)
    `)
    .eq("achat_id", id);

  if (detailsError) throw detailsError;

  return { ...achat, details: details || [] } as AchatWithDetails;
};

export const createAchat = async (
  achatData: AchatData,
  details: AchatDetailItem[],
): Promise<Achat> => {
  const company = getCurrentCompany();
  if (!company) throw new Error("Aucune société sélectionnée");

  let montantTotal = 0;
  for (const item of details) {
    item.sous_total = item.quantite * item.prix_unitaire;
    montantTotal += item.sous_total;
  }

  const { data: achat, error: achatError } = await getSupabase()
    .from("achats")
    .insert([
      {
        company_id: company.id,
        numero_commande: achatData.numero_commande || (await generateNumeroCommande()),
        date_achat: achatData.date_achat || new Date().toISOString(),
        fournisseur_nom: achatData.fournisseur_nom,
        fournisseur_contact: achatData.fournisseur_contact,
        montant_ht: montantTotal,
        tva: achatData.tva || 0,
        montant_total: montantTotal + (achatData.tva || 0),
        montant_paye: achatData.montant_paye || 0,
        statut: achatData.statut || "en_attente",
        notes: achatData.notes,
        created_by: achatData.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (achatError) throw achatError;

  for (const item of details) {
    const { error: detailError } = await getSupabase()
      .from("achat_details")
      .insert([
        {
          achat_id: achat.id,
          produit_id: item.produit_id,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          sous_total: item.sous_total,
        },
      ]);

    if (detailError) throw detailError;

    await updateStockAfterPurchase(item.produit_id, item.quantite, achat.id);
  }

  return achat as Achat;
};

export const updateAchat = async (
  id: string,
  achatData: AchatData,
  details: AchatDetailItem[],
): Promise<boolean> => {
  const company = getCurrentCompany();
  if (!company) throw new Error("Aucune société sélectionnée");

  const oldAchat = await fetchAchatWithDetails(id);
  if (!oldAchat) throw new Error("Achat non trouvé");

  for (const item of oldAchat.details) {
    await revertStockAfterUpdate(item.produit_id, item.quantite, id);
  }

  const { error: deleteDetailsError } = await getSupabase()
    .from("achat_details")
    .delete()
    .eq("achat_id", id);

  if (deleteDetailsError) throw deleteDetailsError;

  let montantTotal = 0;
  for (const item of details) {
    item.sous_total = item.quantite * item.prix_unitaire;
    montantTotal += item.sous_total;
  }

  const { error: achatError } = await getSupabase()
    .from("achats")
    .update({
      date_achat: achatData.date_achat || new Date().toISOString(),
      fournisseur_nom: achatData.fournisseur_nom,
      fournisseur_contact: achatData.fournisseur_contact,
      montant_ht: montantTotal,
      tva: achatData.tva || 0,
      montant_total: montantTotal + (achatData.tva || 0),
      montant_paye: achatData.montant_paye || 0,
      notes: achatData.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (achatError) throw achatError;

  for (const item of details) {
    const { error: detailError } = await getSupabase()
      .from("achat_details")
      .insert([
        {
          achat_id: id,
          produit_id: item.produit_id,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          sous_total: item.sous_total,
        },
      ]);

    if (detailError) throw detailError;

    await updateStockAfterPurchase(item.produit_id, item.quantite, id);
  }

  return true;
};

export const deleteAchat = async (id: string): Promise<void> => {
  const company = getCurrentCompany();
  if (!company) throw new Error("Aucune société sélectionnée");

  const achat = await fetchAchatWithDetails(id);
  if (!achat) throw new Error("Achat non trouvé");

  for (const item of achat.details) {
    await revertStockAfterUpdate(item.produit_id, item.quantite, id);
  }

  const { error: deleteDetailsError } = await getSupabase()
    .from("achat_details")
    .delete()
    .eq("achat_id", id);

  if (deleteDetailsError) throw deleteDetailsError;

  const { error } = await getSupabase()
    .from("achats")
    .delete()
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) throw error;
};

const updateStockAfterPurchase = async (
  produitId: string,
  quantite: number,
  achatId: string,
): Promise<void> => {
  const company = getCurrentCompany();

  const { data: produit, error: produitError } = await getSupabase()
    .from("produits")
    .select("quantite_stock, prix_achat")
    .eq("id", produitId)
    .eq("company_id", company!.id)
    .single();

  if (produitError) throw produitError;

  const nouvelleQuantite = produit.quantite_stock + quantite;

  await getSupabase()
    .from("produits")
    .update({
      quantite_stock: nouvelleQuantite,
      updated_at: new Date().toISOString(),
    })
    .eq("id", produitId)
    .eq("company_id", company!.id);

  await createMouvementStock({
    produit_id: produitId,
    type: "entree",
    quantite: quantite,
    reference_type: "achat",
    reference_id: achatId,
    notes: `Achat #${achatId}`,
    date_mouvement: new Date().toISOString(),
  });
};

const revertStockAfterUpdate = async (
  produitId: string,
  quantite: number,
  achatId: string,
): Promise<void> => {
  const company = getCurrentCompany();

  const { data: produit, error: produitError } = await getSupabase()
    .from("produits")
    .select("quantite_stock")
    .eq("id", produitId)
    .eq("company_id", company!.id)
    .single();

  if (produitError) throw produitError;

  const nouvelleQuantite = produit.quantite_stock - quantite;

  if (nouvelleQuantite < 0) {
    logger.warn(`Stock potentiellement négatif pour le produit ${produitId}`);
  }

  await getSupabase()
    .from("produits")
    .update({
      quantite_stock: Math.max(0, nouvelleQuantite),
      updated_at: new Date().toISOString(),
    })
    .eq("id", produitId)
    .eq("company_id", company!.id);

  await createMouvementStock({
    produit_id: produitId,
    type: "sortie",
    quantite: quantite,
    reference_type: "annulation_achat",
    reference_id: achatId,
    notes: `Annulation achat #${achatId}`,
    date_mouvement: new Date().toISOString(),
  });
};

const generateNumeroCommande = async (): Promise<string> => {
  const company = getCurrentCompany();
  const { data, error } = await getSupabase()
    .from("achats")
    .select("numero_commande")
    .eq("company_id", company!.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return `CMD-${String(new Date().getFullYear()).slice(-2)}-0001`;
  }

  const lastNum = data[0].numero_commande;
  const match = lastNum.match(/\d+$/);
  if (match) {
    const newNum = String(parseInt(match[0], 10) + 1).padStart(4, "0");
    return lastNum.replace(/\d+$/, newNum);
  }
  return `CMD-${String(new Date().getFullYear()).slice(-2)}-0001`;
};

export const getTotalAchats = async (dateDebut?: string, dateFin?: string): Promise<number> => {
  const company = getCurrentCompany();
  if (!company) return 0;

  let query = getSupabase().from("achats").select("montant_total").eq("company_id", company.id);

  if (dateDebut) query = query.gte("date_achat", dateDebut);
  if (dateFin) query = query.lte("date_achat", dateFin);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).reduce(
    (sum: number, a: { montant_total: number }) => sum + (a.montant_total || 0),
    0,
  );
};
