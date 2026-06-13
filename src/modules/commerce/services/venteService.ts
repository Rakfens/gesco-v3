import { logger } from "@/lib/logger";
import { getCurrentCompany, getSupabase } from "@/lib/supabase";
import type { Vente } from "@/modules/shared/types";
import { cache } from "@/modules/shared/utils/cache";
import { createMouvementStockManuel as createMouvementStock } from "./stockService";

interface VenteFilters {
  dateDebut?: string;
  dateFin?: string;
  statut?: string;
  client_nom?: string;
}

interface VenteData {
  date_vente?: string;
  client_nom?: string;
  client_telephone?: string;
  client_email?: string;
  remise?: number;
  montant_paye?: number;
  type_paiement?: string;
  notes?: string;
}

export interface VenteDetailItem {
  produit_id: string;
  quantite: number;
  prix_unitaire: number;
  remise_ligne?: number;
  sous_total?: number;
  produit?: { id?: string; nom?: string; reference?: string; prix_vente?: number };
}

interface VenteWithDetails extends Vente {
  details: VenteDetailItem[];
}

export const fetchVentes = async (filters: VenteFilters = {}): Promise<Vente[]> => {
  const company = getCurrentCompany();
  if (!company) return [];

  const cacheKey = `ventes_${company.id}_${JSON.stringify(filters)}`;

  return cache.get(
    cacheKey,
    async () => {
      let query = getSupabase()
        .from("ventes")
        .select("*")
        .eq("company_id", company.id)
        .order("date_vente", { ascending: false });

      if (filters.dateDebut) {
        query = query.gte("date_vente", filters.dateDebut);
      }
      if (filters.dateFin) {
        query = query.lte("date_vente", filters.dateFin);
      }
      if (filters.statut) {
        query = query.eq("statut", filters.statut);
      }
      if (filters.client_nom) {
        query = query.ilike("client_nom", `%${filters.client_nom}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    60000,
  ) as Promise<Vente[]>;
};

export const fetchVenteWithDetails = async (id: string): Promise<VenteWithDetails | null> => {
  const company = getCurrentCompany();
  if (!company) return null;

  const cacheKey = `vente_details_${company.id}_${id}`;

  return cache.get(
    cacheKey,
    async () => {
      const { data: vente, error: venteError } = await getSupabase()
        .from("ventes")
        .select("*")
        .eq("id", id)
        .eq("company_id", company.id)
        .single();

      if (venteError) throw venteError;

      const { data: details, error: detailsError } = await getSupabase()
        .from("vente_details")
        .select(`
        *,
        produit:produits(id, nom, reference, prix_vente)
      `)
        .eq("vente_id", id);

      if (detailsError) throw detailsError;

      return { ...vente, details: details || [] };
    },
    300000,
  ) as Promise<VenteWithDetails | null>;
};

export const createVente = async (
  venteData: VenteData,
  details: VenteDetailItem[],
  packIds: string[] = [],
): Promise<Vente> => {
  const company = getCurrentCompany();
  if (!company) throw new Error("Aucune société sélectionnée");

  let montantTotal = 0;
  for (const item of details) {
    item.sous_total = item.quantite * item.prix_unitaire;
    montantTotal += item.sous_total;
  }

  const remise = venteData.remise || 0;
  const montantFinal = montantTotal - remise;
  const resteAPayer = montantFinal - (venteData.montant_paye || 0);

  const numeroFacture = await generateNumeroFacture();

  // Vérifier le stock pour TOUS les produits (y compris les produits de pack à prix 0)
  for (const item of details) {
    if (item.quantite <= 0) continue;
    
    const { data: produit, error: produitError } = await getSupabase()
      .from("produits")
      .select("id, nom, quantite_stock")
      .eq("id", item.produit_id)
      .eq("company_id", company.id)
      .single();

    if (produitError) throw new Error(`Produit ${item.produit_id} non trouvé`);

    const stockDisponible = produit.quantite_stock ?? 0;
    if (stockDisponible < item.quantite) {
      throw new Error(`Stock insuffisant pour "${produit.nom}" (disponible: ${stockDisponible}, demandé: ${item.quantite})`);
    }
  }

  const { data: vente, error: venteError } = await getSupabase()
    .from("ventes")
    .insert([
      {
        company_id: company.id,
        numero_facture: numeroFacture,
        date_vente: venteData.date_vente || new Date().toISOString(),
        client_nom: venteData.client_nom,
        client_telephone: venteData.client_telephone,
        client_email: venteData.client_email,
        montant_ht: montantTotal,
        remise: remise,
        montant_total: montantFinal,
        montant_paye: venteData.montant_paye || 0,
        reste_a_payer: resteAPayer,
        statut:
          resteAPayer === 0 ? "paye" : (venteData.montant_paye ?? 0) > 0 ? "credit" : "en_attente",
        type_paiement: venteData.type_paiement,
        notes: venteData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (venteError) throw venteError;

  for (const item of details) {
    const { error: detailError } = await getSupabase()
      .from("vente_details")
      .insert([
        {
          vente_id: vente.id,
          produit_id: item.produit_id,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          remise_ligne: item.remise_ligne || 0,
          sous_total: item.sous_total,
        },
      ]);

    if (detailError) throw detailError;

    await updateStockAfterSale(item.produit_id, item.quantite, vente.id);
  }

  cache.invalidate(`ventes_${company.id}`);
  cache.invalidate(`ca_${company.id}`);

  return vente as Vente;
};

export const updateVente = async (
  id: string,
  venteData: VenteData,
  details: VenteDetailItem[],
): Promise<boolean> => {
  const company = getCurrentCompany();
  if (!company) throw new Error("Aucune société sélectionnée");

  const oldVente = await fetchVenteWithDetails(id);
  if (!oldVente) throw new Error("Vente non trouvée");

  for (const item of oldVente.details) {
    await restoreStockAfterUpdate(item.produit_id, item.quantite, id);
  }

  const { error: deleteDetailsError } = await getSupabase()
    .from("vente_details")
    .delete()
    .eq("vente_id", id);

  if (deleteDetailsError) throw deleteDetailsError;

  let montantTotal = 0;
  for (const item of details) {
    item.sous_total = item.quantite * item.prix_unitaire;
    montantTotal += item.sous_total;
  }

  const remise = venteData.remise || 0;
  const montantFinal = montantTotal - remise;
  const resteAPayer = montantFinal - (venteData.montant_paye || 0);

  const { error: venteError } = await getSupabase()
    .from("ventes")
    .update({
      date_vente: venteData.date_vente || new Date().toISOString(),
      client_nom: venteData.client_nom,
      client_telephone: venteData.client_telephone,
      client_email: venteData.client_email,
      montant_ht: montantTotal,
      remise: remise,
      montant_total: montantFinal,
      montant_paye: venteData.montant_paye || 0,
      reste_a_payer: resteAPayer,
      statut:
        resteAPayer === 0 ? "paye" : (venteData.montant_paye ?? 0) > 0 ? "credit" : "en_attente",
      type_paiement: venteData.type_paiement,
      notes: venteData.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (venteError) throw venteError;

  for (const item of details) {
    const { error: detailError } = await getSupabase()
      .from("vente_details")
      .insert([
        {
          vente_id: id,
          produit_id: item.produit_id,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          remise_ligne: item.remise_ligne || 0,
          sous_total: item.sous_total,
        },
      ]);

    if (detailError) throw detailError;

    await updateStockAfterSale(item.produit_id, item.quantite, id);
  }

  cache.invalidate(`ventes_${company.id}`);
  cache.invalidate(`vente_details_${company.id}_${id}`);
  cache.invalidate(`ca_${company.id}`);

  return true;
};

export const deleteVente = async (id: string): Promise<void> => {
  const company = getCurrentCompany();
  if (!company) throw new Error("Aucune société sélectionnée");

  const vente = await fetchVenteWithDetails(id);
  if (!vente) throw new Error("Vente non trouvée");

  for (const item of vente.details) {
    await restoreStockAfterUpdate(String(item.produit_id), Number(item.quantite) || 1, id);
  }

  const { error: deleteDetailsError } = await getSupabase()
    .from("vente_details")
    .delete()
    .eq("vente_id", id);

  if (deleteDetailsError) throw deleteDetailsError;

  const { error } = await getSupabase()
    .from("ventes")
    .delete()
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) throw error;

  cache.invalidate(`ventes_${company.id}`);
  cache.invalidate(`ca_${company.id}`);
};

const updateStockAfterSale = async (
  produitId: string,
  quantite: number,
  venteId: string,
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
    logger.warn(`Stock négatif détecté pour ${produitId}: ${produit.quantite_stock} - ${quantite} = ${nouvelleQuantite}. Mise à 0.`);
    // Mettre le stock à 0 au lieu de le laisser négatif
    await getSupabase()
      .from("produits")
      .update({
        quantite_stock: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", produitId)
      .eq("company_id", company!.id);
  } else {
    await getSupabase()
      .from("produits")
      .update({
        quantite_stock: nouvelleQuantite,
        updated_at: new Date().toISOString(),
      })
      .eq("id", produitId)
      .eq("company_id", company!.id);
  }

  await createMouvementStock({
    produit_id: produitId,
    type: "sortie",
    quantite: quantite,
    reference_type: "vente",
    reference_id: venteId,
    notes: `Vente #${venteId}`,
    date_mouvement: new Date().toISOString(),
  });
};

const restoreStockAfterUpdate = async (
  produitId: string,
  quantite: number,
  venteId: string,
): Promise<void> => {
  const company = getCurrentCompany();

  const { data: produit, error: produitError } = await getSupabase()
    .from("produits")
    .select("quantite_stock")
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
    reference_type: "annulation_vente",
    reference_id: venteId,
    notes: `Annulation vente #${venteId}`,
    date_mouvement: new Date().toISOString(),
  });
};

const generateNumeroFacture = async (): Promise<string> => {
  const company = getCurrentCompany();
  const { data, error } = await getSupabase()
    .from("ventes")
    .select("numero_facture")
    .eq("company_id", company!.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    const year = new Date().getFullYear().toString().slice(-2);
    return `FACT-${year}-0001`;
  }

  const lastNum = data[0].numero_facture;
  const match = lastNum.match(/\d+$/);
  if (match) {
    const newNum = String(parseInt(match[0], 10) + 1).padStart(4, "0");
    const year = new Date().getFullYear().toString().slice(-2);
    return `FACT-${year}-${newNum}`;
  }

  const year = new Date().getFullYear().toString().slice(-2);
  return `FACT-${year}-0001`;
};

export const getCA = async (dateDebut?: string, dateFin?: string): Promise<number> => {
  const company = getCurrentCompany();
  if (!company) return 0;

  const cacheKey = `ca_${company.id}_${dateDebut}_${dateFin}`;

  return cache.get(
    cacheKey,
    async () => {
      let query = getSupabase()
        .from("ventes")
        .select("montant_total")
        .eq("company_id", company.id)
        .eq("statut", "paye");

      if (dateDebut) query = query.gte("date_vente", dateDebut);
      if (dateFin) query = query.lte("date_vente", dateFin);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).reduce(
        (sum: number, v: { montant_total: number }) => sum + (v.montant_total || 0),
        0,
      );
    },
    300000,
  ) as Promise<number>;
};

export const getTopProduits = async (
  limit: number = 10,
  dateDebut?: string,
  dateFin?: string,
): Promise<Record<string, unknown>[]> => {
  const company = getCurrentCompany();
  if (!company) return [];

  const cacheKey = `top_produits_${company.id}_${dateDebut}_${dateFin}_${limit}`;

  return cache.get(
    cacheKey,
    async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split("T")[0];

        const startDate = dateDebut || firstDayOfMonth;
        const endDate = dateFin || today;

        const { data, error } = await getSupabase().rpc("get_top_produits", {
          p_company_id: company.id,
          p_date_debut: startDate,
          p_date_fin: endDate,
          p_limit: limit,
        });

        if (error) throw error;
        return data || [];
      } catch (error: unknown) {
        logger.error("Erreur getTopProduits:", error);
        return [];
      }
    },
    300000,
  ) as Promise<Record<string, unknown>[]>;
};

export const getVentesByDay = async (date: string): Promise<Vente[]> => {
  const company = getCurrentCompany();
  if (!company) return [];

  const cacheKey = `ventes_day_${company.id}_${date}`;

  return cache.get(
    cacheKey,
    async () => {
      const { data, error } = await getSupabase()
        .from("ventes")
        .select("*")
        .eq("company_id", company.id)
        .eq("date_vente", date)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    60000,
  ) as Promise<Vente[]>;
};

export const getVentesByMonth = async (annee: number, mois: number): Promise<Vente[]> => {
  const company = getCurrentCompany();
  if (!company) return [];

  const cacheKey = `ventes_month_${company.id}_${annee}_${mois}`;

  return cache.get(
    cacheKey,
    async () => {
      const dateDebut = `${annee}-${String(mois).padStart(2, "0")}-01`;
      const dateFin = `${annee}-${String(mois).padStart(2, "0")}-31`;

      const { data, error } = await getSupabase()
        .from("ventes")
        .select("*")
        .eq("company_id", company.id)
        .gte("date_vente", dateDebut)
        .lte("date_vente", dateFin)
        .order("date_vente", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    300000,
  ) as Promise<Vente[]>;
};

export const getVentesStats = async (): Promise<{
  paye: number;
  credit: number;
  en_attente: number;
  annule: number;
}> => {
  const company = getCurrentCompany();
  if (!company) return { paye: 0, credit: 0, en_attente: 0, annule: 0 };

  const cacheKey = `ventes_stats_${company.id}`;

  return cache.get(
    cacheKey,
    async () => {
      const { data, error } = await getSupabase()
        .from("ventes")
        .select("statut")
        .eq("company_id", company.id);

      if (error) throw error;

      const stats = {
        paye: 0,
        credit: 0,
        en_attente: 0,
        annule: 0,
      };

      (data || []).forEach((v: { statut: string }) => {
        if (stats[v.statut as keyof typeof stats] !== undefined)
          stats[v.statut as keyof typeof stats]++;
      });

      return stats;
    },
    300000,
  ) as Promise<{ paye: number; credit: number; en_attente: number; annule: number }>;
};
