// src/modules/livraison/services/agentService.ts
import { createClient } from "@/lib/supabase";
import type { Agent } from "@/modules/shared/types";

/* ─── Helpers ─── */
function getClient() {
  return createClient();
}

function ensureCompanyId(companyId: string | undefined): asserts companyId is string {
  if (!companyId) throw new Error("Société non sélectionnée");
}

/* ─── Fetch ─── */
export async function fetchAgents(companyId: string): Promise<Agent[]> {
  if (!companyId) return [];

  const { data, error } = await getClient()
  .from("agents")
  .select("*")
  .eq("company_id", companyId)
  .order("nom");

  if (error) throw new Error(`Erreur fetch agents: ${error.message}`);
  return (data as Agent[]) || [];
}

/* ─── Create ─── */
export async function addAgent(
  nom: string,
  salaire: string | number,
  companyId: string
): Promise<Agent> {
  ensureCompanyId(companyId);

  const parsedSalaire = parseFloat(String(salaire));
  if (isNaN(parsedSalaire) || parsedSalaire < 0) {
    throw new Error("Le salaire doit être un nombre positif");
  }

  const { data, error } = await getClient()
  .from("agents")
  .insert([{ nom: nom.trim(), salaire: parsedSalaire, company_id: companyId }])
  .select()
  .single();

  if (error) throw new Error(`Erreur ajout agent: ${error.message}`);
  if (!data) throw new Error("Aucune donnée retournée après l'insertion");

  return data as Agent;
}

/* ─── Update ─── */
export async function updateAgent(
  id: string,
  updates: Partial<Agent>,
  companyId: string
): Promise<void> {
  ensureCompanyId(companyId);

  // Nettoyer les updates pour éviter d'envoyer des champs undefined
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );

  const { error } = await getClient()
  .from("agents")
  .update(cleanUpdates)
  .eq("id", id)
  .eq("company_id", companyId);

  if (error) throw new Error(`Erreur mise à jour agent: ${error.message}`);
}

/* ─── Delete ─── */
export async function deleteAgent(id: string, companyId: string): Promise<void> {
  ensureCompanyId(companyId);

  const { error } = await getClient()
  .from("agents")
  .delete()
  .eq("id", id)
  .eq("company_id", companyId);

  if (error) throw new Error(`Erreur suppression agent: ${error.message}`);
}
