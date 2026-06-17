// src/modules/livraison/services/livraisonService.ts
import { createClient } from "@/lib/supabase";
import type { Livraison } from "@/modules/shared/types";

/* ─── Helpers ─── */
function getClient() {
  return createClient();
}

function ensureCompanyId(companyId: string | undefined): asserts companyId is string {
  if (!companyId) throw new Error("Société non sélectionnée");
}

function validateLivraison(livraison: Partial<Livraison>): void {
  if (!livraison.colis?.trim()) throw new Error("Le colis est requis");
  if (!livraison.client_donneur?.trim()) throw new Error("Le client donneur est requis");
  if (!livraison.destinataire?.trim()) throw new Error("Le destinataire est requis");
  if (!livraison.agent_id && !livraison.agent_nom?.trim()) {
    throw new Error("Le livreur est requis");
  }
  if (!livraison.date) throw new Error("La date est requise");
}

function sanitizeLivraison(livraison: Partial<Livraison>, companyId: string) {
  return {
    colis: livraison.colis!.trim(),
    client_donneur: livraison.client_donneur!.trim(),
    destinataire: livraison.destinataire!.trim(),
    destinataire_telephone: livraison.destinataire_telephone?.trim() || "",
    destinataire_lieu: livraison.destinataire_lieu?.trim() || "",
    agent_id: livraison.agent_id ? parseInt(String(livraison.agent_id), 10) : null,
    agent_nom: livraison.agent_nom?.trim() || null,
    montant: parseFloat(String(livraison.montant || 0)),
    frais: parseFloat(String(livraison.frais || 0)),
    paiement: livraison.paiement || "espece",
    date: livraison.date,
    statut: livraison.statut || "en_cours",
    remarque: livraison.remarque?.trim() || null,
    company_id: companyId,
    created_at: new Date().toISOString(),
  };
}

/* ─── Fetch all ─── */
export async function fetchLivraisons(companyId: string): Promise<Livraison[]> {
  if (!companyId) return [];

  const { data, error } = await getClient()
  .from("livraisons")
  .select("*")
  .eq("company_id", companyId)
  .order("date", { ascending: false });

  if (error) throw new Error(`Erreur fetch livraisons: ${error.message}`);
  return (data as Livraison[]) || [];
}

/* ─── Create ─── */
export async function addLivraison(
  livraison: Partial<Livraison>,
  companyId: string
): Promise<Livraison> {
  ensureCompanyId(companyId);
  validateLivraison(livraison);

  const payload = sanitizeLivraison(livraison, companyId);

  const { data, error } = await getClient()
  .from("livraisons")
  .insert([payload])
  .select()
  .single();

  if (error) throw new Error(`Erreur ajout livraison: ${error.message}`);
  if (!data) throw new Error("Aucune donnée retournée après l'insertion");

  return data as Livraison;
}

/* ─── Update ─── */
export async function updateLivraison(
  id: string,
  updates: Partial<Livraison>,
  companyId: string
): Promise<void> {
  ensureCompanyId(companyId);

  // Nettoyer les updates pour éviter d'envoyer des champs undefined
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );

  const { error } = await getClient()
  .from("livraisons")
  .update({
    ...cleanUpdates,
    updated_at: new Date().toISOString(),
  })
  .eq("id", id)
  .eq("company_id", companyId);

  if (error) throw new Error(`Erreur mise à jour livraison: ${error.message}`);
}

/* ─── Delete ─── */
export async function deleteLivraison(id: string, companyId: string): Promise<void> {
  ensureCompanyId(companyId);

  const { error } = await getClient()
  .from("livraisons")
  .delete()
  .eq("id", id)
  .eq("company_id", companyId);

  if (error) throw new Error(`Erreur suppression livraison: ${error.message}`);
}

/* ─── Fetch by statut ─── */
export async function fetchLivraisonsByStatut(
  statut: string,
  companyId: string
): Promise<Livraison[]> {
  if (!companyId) return [];

  const { data, error } = await getClient()
  .from("livraisons")
  .select("*")
  .eq("company_id", companyId)
  .eq("statut", statut)
  .order("date", { ascending: false });

  if (error) throw new Error(`Erreur fetch livraisons par statut: ${error.message}`);
  return (data as Livraison[]) || [];
}

/* ─── Fetch by agent ─── */
export async function fetchLivraisonsByAgent(
  agentId: string,
  companyId: string
): Promise<Livraison[]> {
  if (!companyId) return [];

  const { data, error } = await getClient()
  .from("livraisons")
  .select("*")
  .eq("company_id", companyId)
  .eq("agent_id", agentId)
  .order("date", { ascending: false });

  if (error) throw new Error(`Erreur fetch livraisons par agent: ${error.message}`);
  return (data as Livraison[]) || [];
}

/* ─── Fetch by date ─── */
export async function fetchLivraisonsByDate(
  date: string,
  companyId: string
): Promise<Livraison[]> {
  if (!companyId) return [];

  const { data, error } = await getClient()
  .from("livraisons")
  .select("*")
  .eq("company_id", companyId)
  .eq("date", date)
  .order("created_at", { ascending: false });

  if (error) throw new Error(`Erreur fetch livraisons par date: ${error.message}`);
  return (data as Livraison[]) || [];
}
