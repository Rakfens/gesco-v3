import { getCurrentCompany, getSupabase } from "@/lib/supabase";
import type { Pack, PackProduit, Produit } from "@/modules/shared/types";

// ── CRUD PACKS ──────────────────────────────────────────────────────────

export const fetchPacks = async (): Promise<Pack[]> => {
  const company = getCurrentCompany();
  if (!company) return [];

  const { data, error } = await getSupabase()
    .from("packs")
    .select("*")
    .eq("company_id", company.id)
    .order("nom");

  if (error) throw error;
  return (data || []) as Pack[];
};

export const fetchPackById = async (id: string): Promise<Pack | null> => {
  const company = getCurrentCompany();
  if (!company) return null;

  const { data, error } = await getSupabase()
    .from("packs")
    .select("*")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data as Pack | null;
};

export const fetchPackWithProduits = async (id: string): Promise<Pack | null> => {
  const company = getCurrentCompany();
  if (!company) return null;

  const { data: pack, error: packError } = await getSupabase()
    .from("packs")
    .select("*")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();

  if (packError) {
    if (packError.code === "PGRST116") return null;
    throw packError;
  }

  const { data: produits, error: produitsError } = await getSupabase()
    .from("pack_produits")
    .select("*, produit:produits(*)")
    .eq("pack_id", id);

  if (produitsError) throw produitsError;

  return { ...pack, produits: produits || [] } as Pack;
};

export const createPack = async (
  nom: string,
  description: string,
  prix: number,
  produits: Array<{ produit_id: string; quantite: number }>,
): Promise<Pack> => {
  const company = getCurrentCompany();
  if (!company) throw new Error("Aucune société sélectionnée");

  const { data: pack, error: packError } = await getSupabase()
    .from("packs")
    .insert([{ nom, description, prix, company_id: company.id }])
    .select()
    .single();

  if (packError) throw packError;

  if (produits.length > 0) {
    const packProduits = produits.map((p) => ({
      pack_id: pack.id,
      produit_id: p.produit_id,
      quantite: p.quantite,
    }));

    const { error: ppError } = await getSupabase()
      .from("pack_produits")
      .insert(packProduits);

    if (ppError) throw ppError;
  }

  return pack as Pack;
};

export const updatePack = async (
  id: string,
  nom: string,
  description: string,
  prix: number,
  produits: Array<{ produit_id: string; quantite: number }>,
): Promise<void> => {
  const company = getCurrentCompany();
  if (!company) throw new Error("Aucune société sélectionnée");

  const { error: packError } = await getSupabase()
    .from("packs")
    .update({ nom, description, prix, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", company.id);

  if (packError) throw packError;

  // Supprimer les anciens produits du pack
  const { error: deleteError } = await getSupabase()
    .from("pack_produits")
    .delete()
    .eq("pack_id", id);

  if (deleteError) throw deleteError;

  // Insérer les nouveaux produits
  if (produits.length > 0) {
    const packProduits = produits.map((p) => ({
      pack_id: id,
      produit_id: p.produit_id,
      quantite: p.quantite,
    }));

    const { error: ppError } = await getSupabase()
      .from("pack_produits")
      .insert(packProduits);

    if (ppError) throw ppError;
  }
};

export const deletePack = async (id: string): Promise<void> => {
  const company = getCurrentCompany();
  if (!company) throw new Error("Aucune société sélectionnée");

  // Supprimer les produits du pack
  const { error: ppError } = await getSupabase()
    .from("pack_produits")
    .delete()
    .eq("pack_id", id);

  if (ppError) throw ppError;

  // Supprimer le pack
  const { error } = await getSupabase()
    .from("packs")
    .delete()
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) throw error;
};

// ── VÉRIFICATION STOCK PACK ────────────────────────────────────────────

export interface PackStockCheck {
  produit_id: string;
  nom: string;
  quantite_necessaire: number;
  quantite_stock: number;
  suffisant: boolean;
}

export const checkPackStock = async (packId: string): Promise<PackStockCheck[]> => {
  const pack = await fetchPackWithProduits(packId);
  if (!pack || !pack.produits) return [];

  const checks: PackStockCheck[] = [];

  for (const pp of pack.produits) {
    const produit = pp.produit as Produit | undefined;
    checks.push({
      produit_id: pp.produit_id,
      nom: produit?.nom || "Produit inconnu",
      quantite_necessaire: pp.quantite,
      quantite_stock: produit?.quantite_stock ?? 0,
      suffisant: (produit?.quantite_stock ?? 0) >= pp.quantite,
    });
  }

  return checks;
};

export const isPackAvailable = async (packId: string): Promise<boolean> => {
  const checks = await checkPackStock(packId);
  return checks.length > 0 && checks.every((c) => c.suffisant);
};
