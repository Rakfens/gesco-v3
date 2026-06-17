// src/modules/livraison/services/avanceService.ts
import { createClient } from "@/lib/supabase";
import type { Avance } from "@/modules/shared/types";

/* ─── Helpers ─── */
function getClient() {
  return createClient();
}

function ensureCompanyId(companyId: string | undefined): asserts companyId is string {
  if (!companyId) throw new Error("Aucune société sélectionnée");
}

/* ─── Fetch ─── */
export async function fetchAvances(companyId: string): Promise<Avance[]> {
  ensureCompanyId(companyId);

  const { data, error } = await getClient()
  .from("avances")
  .select("*")
  .eq("company_id", companyId)
  .order("date", { ascending: false });

  if (error) throw new Error(`Erreur fetch avances: ${error.message}`);
  return (data as Avance[]) || [];
}

/* ─── Create ─── */
export async function addAvance(
  avance: Partial<Avance>,
  companyId: string
): Promise<Avance> {
  ensureCompanyId(companyId);

  if (!avance.agent_id && !avance.agent_nom) {
    throw new Error("Agent requis (agent_id ou agent_nom)");
  }
  if (!avance.montant || avance.montant <= 0) {
    throw new Error("Montant valide requis (> 0)");
  }
  if (!avance.date) {
    throw new Error("Date requise");
  }

  const montant = parseFloat(String(avance.montant));
  if (isNaN(montant)) {
    throw new Error("Montant invalide");
  }

  const { data, error } = await getClient()
  .from("avances")
  .insert([
    {
      agent_id: avance.agent_id,
      agent_nom: avance.agent_nom?.trim() || null,
          montant,
          motif: avance.motif?.trim() || null,
          date: avance.date,
          mois: avance.mois,
          annule: false,
          company_id: companyId,
    },
  ])
  .select()
  .single();

  if (error) throw new Error(`Erreur ajout avance: ${error.message}`);
  if (!data) throw new Error("Aucune donnée retournée après l'insertion");

  return data as Avance;
}

/* ─── Annuler (soft delete) ─── */
export async function annulerAvance(
  id: string,
  companyId: string
): Promise<void> {
  ensureCompanyId(companyId);

  const { error } = await getClient()
  .from("avances")
  .update({ annule: true })
  .eq("id", id)
  .eq("company_id", companyId);

  if (error) throw new Error(`Erreur annulation avance: ${error.message}`);
}

/* ─── Delete (hard delete) ─── */
export async function deleteAvance(
  id: string,
  companyId: string
): Promise<void> {
  ensureCompanyId(companyId);

  const { error } = await getClient()
  .from("avances")
  .delete()
  .eq("id", id)
  .eq("company_id", companyId);

  if (error) throw new Error(`Erreur suppression avance: ${error.message}`);
}
