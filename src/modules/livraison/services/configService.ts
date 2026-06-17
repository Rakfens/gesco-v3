// src/modules/livraison/services/configService.ts
import { createClient } from "@/lib/supabase";

/* ─── Helpers ─── */
function getClient() {
  return createClient();
}

function ensureCompanyId(companyId: string | undefined): asserts companyId is string {
  if (!companyId) throw new Error("Aucune société sélectionnée");
}

/* ─── Commission ─── */
export async function fetchCommission(companyId: string): Promise<number> {
  if (!companyId) return 500;

  try {
    const { data, error } = await getClient()
    .from("config")
    .select("valeur")
    .eq("cle", "commission_gerant")
    .eq("company_id", companyId)
    .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Erreur fetch commission: ${error.message}`);
    }
    return data ? Number(data.valeur) : 500;
  } catch {
    return 500;
  }
}

export async function updateCommission(
  newVal: number,
  companyId: string
): Promise<void> {
  ensureCompanyId(companyId);

  const { error } = await getClient()
  .from("config")
  .upsert(
    { cle: "commission_gerant", valeur: String(newVal), company_id: companyId },
          { onConflict: "cle,company_id" }
  );

  if (error) throw new Error(`Erreur mise à jour commission: ${error.message}`);
}

/* ─── Logo ─── */
export async function fetchLogo(companyId: string): Promise<string | null> {
  if (!companyId) return null;

  try {
    const { data, error } = await getClient()
    .from("config")
    .select("valeur")
    .eq("cle", "logo_url")
    .eq("company_id", companyId)
    .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Erreur fetch logo: ${error.message}`);
    }
    return data?.valeur || null;
  } catch {
    return null;
  }
}

export async function updateLogo(url: string, companyId: string): Promise<void> {
  ensureCompanyId(companyId);

  const { error } = await getClient()
  .from("config")
  .upsert(
    { cle: "logo_url", valeur: url, company_id: companyId },
    { onConflict: "cle,company_id" }
  );

  if (error) throw new Error(`Erreur mise à jour logo: ${error.message}`);
}

export async function uploadLogoFile(
  file: File,
  companyId: string,
  slug?: string
): Promise<string> {
  ensureCompanyId(companyId);

  const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
  const allowedExts = ["jpg", "jpeg", "png", "webp", "svg"];
  if (!allowedExts.includes(fileExt)) {
    throw new Error(`Format non supporté. Utilisez: ${allowedExts.join(", ")}`);
  }

  const fileName = `logos/${slug || "default"}/logo_${Date.now()}.${fileExt}`;

  const { error: uploadError } = await getClient()
  .storage
  .from("logos")
  .upload(fileName, file, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) throw new Error(`Erreur upload logo: ${uploadError.message}`);

  const { data: publicUrl } = getClient()
  .storage
  .from("logos")
  .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}

/* ─── Config générique ─── */
export async function fetchAllConfig(companyId: string): Promise<Record<string, string>> {
  if (!companyId) return {};

  try {
    const { data, error } = await getClient()
    .from("config")
    .select("cle, valeur")
    .eq("company_id", companyId);

    if (error) throw new Error(`Erreur fetch config: ${error.message}`);

    const configMap: Record<string, string> = {};
    data?.forEach((item: { cle: string; valeur: string }) => {
      configMap[item.cle] = item.valeur;
    });
    return configMap;
  } catch {
    return {};
  }
}

export async function getConfigValue(
  key: string,
  companyId: string,
  defaultValue: string | null = null
): Promise<string | null> {
  if (!companyId) return defaultValue;

  try {
    const { data, error } = await getClient()
    .from("config")
    .select("valeur")
    .eq("cle", key)
    .eq("company_id", companyId)
    .single();

    if (error && error.code !== "PGRST116") return defaultValue;
    return data?.valeur || defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setConfigValue(
  key: string,
  value: string,
  companyId: string
): Promise<void> {
  ensureCompanyId(companyId);

  const { error } = await getClient()
  .from("config")
  .upsert(
    { cle: key, valeur: value, company_id: companyId },
    { onConflict: "cle,company_id" }
  );

  if (error) throw new Error(`Erreur set config: ${error.message}`);
}
