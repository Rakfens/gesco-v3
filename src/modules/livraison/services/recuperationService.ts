// src/modules/livraison/services/recuperationService.ts
import { createClient } from "@/lib/supabase";
import type { Recuperation } from "@/modules/shared/types";

/* ─── Helpers ─── */
function getClient() {
  return createClient();
}

function ensureCompanyId(companyId: string | undefined): asserts companyId is string {
  if (!companyId) throw new Error("Aucune société sélectionnée");
}

function buildMonthRange(mois: string): { startDate: string; endDate: string } {
  const [year, month] = mois.split("-");
  const startDate = `${year}-${month}-01`;
  const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
  const endDate = `${year}-${month}-${lastDay}`;
  return { startDate, endDate };
}

function parseFrais(value: unknown): number {
  return parseFloat(String(value)) || 0;
}

/* ─── Fetch all ─── */
export async function fetchRecuperations(companyId: string): Promise<Recuperation[]> {
  if (!companyId) return [];
  try {
    const { data, error } = await getClient()
    .from("recuperations")
    .select("*")
    .eq("company_id", companyId)
    .order("date", { ascending: false });
    if (error) throw new Error(`Erreur fetch récupérations: ${error.message}`);
    return (data as Recuperation[]) || [];
  } catch {
    return [];
  }
}

/* ─── Fetch by date ─── */
export async function getRecuperationsByDate(
  date: string,
  companyId: string
): Promise<Recuperation[]> {
  if (!companyId) return [];
  try {
    const { data, error } = await getClient()
    .from("recuperations")
    .select("*")
    .eq("company_id", companyId)
    .eq("date", date)
    .order("livreur_nom");
    if (error) throw new Error(`Erreur fetch récupérations par date: ${error.message}`);
    return (data as Recuperation[]) || [];
  } catch {
    return [];
  }
}

/* ─── Fetch by month ─── */
export async function getRecuperationsByMonth(
  mois: string,
  companyId: string
): Promise<Recuperation[]> {
  if (!companyId) return [];
  try {
    const { startDate, endDate } = buildMonthRange(mois);
    const { data, error } = await getClient()
    .from("recuperations")
    .select("*")
    .eq("company_id", companyId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
    if (error) throw new Error(`Erreur fetch récupérations par mois: ${error.message}`);
    return (data as Recuperation[]) || [];
  } catch {
    return [];
  }
}

/* ─── Create ─── */
export async function addRecuperation(
  recuperation: Partial<Recuperation>,
  companyId: string
): Promise<Recuperation> {
  ensureCompanyId(companyId);
  if (!recuperation.date) throw new Error("La date est requise");
  if (!recuperation.livreur_nom?.trim()) throw new Error("Le livreur_nom est requis");
  if (!recuperation.client_donneur?.trim()) throw new Error("Le client_donneur est requis");

  const insertData = {
    date: recuperation.date,
    livreur_id: recuperation.livreur_id || null,
    livreur_nom: recuperation.livreur_nom.trim(),
    client_donneur: recuperation.client_donneur.trim(),
    frais_recuperation: parseFrais(recuperation.frais_recuperation) || 1000,
    company_id: companyId,
  };

  const { data, error } = await getClient()
  .from("recuperations")
  .insert([insertData])
  .select()
  .single();

  if (error) throw new Error(`Erreur ajout récupération: ${error.message}`);
  if (!data) throw new Error("Aucune donnée retournée après l'insertion");
  return data as Recuperation;
}

/* ─── Update ─── */
export async function updateRecuperation(
  id: string,
  updates: Partial<Recuperation>,
  companyId: string
): Promise<Recuperation> {
  ensureCompanyId(companyId);

  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );

  const { data, error } = await getClient()
  .from("recuperations")
  .update(cleanUpdates)
  .eq("id", id)
  .eq("company_id", companyId)
  .select()
  .single();

  if (error) throw new Error(`Erreur mise à jour récupération: ${error.message}`);
  if (!data) throw new Error("Aucune donnée retournée après la mise à jour");
  return data as Recuperation;
}

/* ─── Delete ─── */
export async function deleteRecuperation(
  id: string,
  companyId: string
): Promise<void> {
  ensureCompanyId(companyId);

  const { error } = await getClient()
  .from("recuperations")
  .delete()
  .eq("id", id)
  .eq("company_id", companyId);

  if (error) throw new Error(`Erreur suppression récupération: ${error.message}`);
}

/* ─── Fetch by livreur ─── */
export async function getRecuperationsByLivreur(
  livreurId: string,
  companyId: string,
  mois?: string
): Promise<Recuperation[]> {
  if (!companyId || !livreurId) return [];
  try {
    let query = getClient()
    .from("recuperations")
    .select("*")
    .eq("livreur_id", livreurId)
    .eq("company_id", companyId);

    if (mois) {
      const { startDate, endDate } = buildMonthRange(mois);
      query = query.gte("date", startDate).lte("date", endDate);
    }

    const { data, error } = await query.order("date", { ascending: false });
    if (error) throw new Error(`Erreur fetch récupérations par livreur: ${error.message}`);
    return (data as Recuperation[]) || [];
  } catch {
    return [];
  }
}

/* ─── Fetch by livreur nom ─── */
export async function getRecuperationsByLivreurNom(
  livreurNom: string,
  companyId: string,
  mois?: string
): Promise<Recuperation[]> {
  if (!companyId || !livreurNom) return [];
  try {
    let query = getClient()
    .from("recuperations")
    .select("*")
    .eq("livreur_nom", livreurNom)
    .eq("company_id", companyId);

    if (mois) {
      const { startDate, endDate } = buildMonthRange(mois);
      query = query.gte("date", startDate).lte("date", endDate);
    }

    const { data, error } = await query.order("date", { ascending: false });
    if (error) throw new Error(`Erreur fetch récupérations par nom: ${error.message}`);
    return (data as Recuperation[]) || [];
  } catch {
    return [];
  }
}

/* ─── Total by livreur nom ─── */
export async function getTotalRecuperationsByLivreurNom(
  livreurNom: string,
  companyId: string
): Promise<{
  total: number;
  count: number;
  details: Array<{ frais_recuperation: number; date: string; client_donneur: string }>;
}> {
  if (!companyId || !livreurNom) return { total: 0, count: 0, details: [] };
  try {
    const { data, error } = await getClient()
    .from("recuperations")
    .select("frais_recuperation, date, client_donneur")
    .eq("livreur_nom", livreurNom)
    .eq("company_id", companyId)
    .order("date", { ascending: false });

    if (error) throw new Error(`Erreur total récupérations: ${error.message}`);

    const rows = data || [];
    const total = rows.reduce(
      (sum: number, r: { frais_recuperation: unknown }) => sum + parseFrais(r.frais_recuperation),
                              0
    );
    const count = rows.length;

    return {
      total,
      count,
      details: rows as Array<{ frais_recuperation: number; date: string; client_donneur: string }>,
    };
  } catch {
    return { total: 0, count: 0, details: [] };
  }
}

/* ─── Total by livreur id ─── */
export async function getTotalRecuperationsByLivreur(
  livreurId: string,
  companyId: string
): Promise<{ total: number; count: number }> {
  if (!companyId || !livreurId) return { total: 0, count: 0 };
  try {
    const { data, error } = await getClient()
    .from("recuperations")
    .select("frais_recuperation")
    .eq("livreur_id", livreurId)
    .eq("company_id", companyId);

    if (error) throw new Error(`Erreur total récupérations: ${error.message}`);

    const rows = data || [];
    const total = rows.reduce(
      (sum: number, r: { frais_recuperation: unknown }) => sum + parseFrais(r.frais_recuperation),
                              0
    );
    const count = rows.length;

    return { total, count };
  } catch {
    return { total: 0, count: 0 };
  }
}

/* ─── All by livreur nom ─── */
export async function getAllRecuperationsByLivreurNom(
  livreurNom: string,
  companyId: string
): Promise<Recuperation[]> {
  if (!companyId || !livreurNom) return [];
  try {
    const { data, error } = await getClient()
    .from("recuperations")
    .select("*")
    .eq("livreur_nom", livreurNom)
    .eq("company_id", companyId)
    .order("date", { ascending: false });

    if (error) throw new Error(`Erreur fetch all récupérations: ${error.message}`);
    return (data as Recuperation[]) || [];
  } catch {
    return [];
  }
}

/* ─── Stats by month ─── */
export async function getRecuperationsStatsByMonth(
  mois: string,
  companyId: string
): Promise<Record<string, { livreur_nom: string; total: number; count: number; details: Recuperation[] }>> {
  if (!companyId) return {};
  try {
    const { startDate, endDate } = buildMonthRange(mois);
    const { data, error } = await getClient()
    .from("recuperations")
    .select("*")
    .eq("company_id", companyId)
    .gte("date", startDate)
    .lte("date", endDate);

    if (error) throw new Error(`Erreur stats récupérations: ${error.message}`);

    const stats: Record<
    string,
    { livreur_nom: string; total: number; count: number; details: Recuperation[] }
    > = {};

    (data as Recuperation[] || []).forEach((recup) => {
      const nom = recup.livreur_nom;
      if (!stats[nom]) {
        stats[nom] = { livreur_nom: nom, total: 0, count: 0, details: [] };
      }
      stats[nom].total += parseFrais(recup.frais_recuperation);
      stats[nom].count += 1;
      stats[nom].details.push(recup);
    });

    return stats;
  } catch {
    return {};
  }
}
