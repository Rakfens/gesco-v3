// modules/shared/utils/constants.ts

// ==================== TYPES ====================

export interface StatutEntry {
  label: string;
  color: string;
  bg: string;
}

export interface StatutVenteEntry {
  label: string;
  color: string;
  bg: string;
}

export interface PaieModeEntry {
  label: string;
  icon: string;
}

export interface MouvementStockEntry {
  label: string;
  icon: string;
  color: string;
}

export interface CompanyModuleConfig {
  name: string;
  icon: string;
  primaryColor: string;
  modules: string[];
}

export interface Livraison {
  frais?: string | number;
  client_donneur?: string;
}

// ==================== FONCTIONS DATE ====================
export const TODAY = (): string => new Date().toISOString().split("T")[0];
export const CURRENT_MONTH = (): string => TODAY().slice(0, 7);
export const currentMonth: typeof CURRENT_MONTH = CURRENT_MONTH;

export const monthLabel = (m: string | undefined | null): string => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  const mois = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  return `${mois[parseInt(mo, 10) - 1]} ${y}`;
};

// ==================== FORMATAGE ====================
export const formatAr = (n: number | string | null | undefined): string => {
  if (n === null || n === undefined) return "0 Ar";
  const val = typeof n === "number" ? n : parseFloat(n) || 0;
  return `${val.toLocaleString("fr-MG", { maximumFractionDigits: 0 })} Ar`;
};

// Formater un nombre sans unité
export const formatNumber = (n: number | string | null | undefined): string => {
  if (n === null || n === undefined) return "0";
  return (typeof n === "number" ? n : parseFloat(n) || 0).toLocaleString();
};

// Format date courte
export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR");
};

// Format date et heure
export const formatDateTime = (dateStr: string | undefined | null): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return `${date.toLocaleDateString("fr-FR")} ${date.toLocaleTimeString("fr-FR")}`;
};

// ==================== STATUTS DES LIVRAISONS ====================
export const STATUTS: Record<string, StatutEntry> = {
  en_cours: { label: "En cours", color: "#f59e0b", bg: "#451a03" },
  livre: { label: "Livré", color: "#34d399", bg: "#14532d" },
  retourne: { label: "Retourné", color: "#f87171", bg: "#450a0a" },
  reporte: { label: "Reporté", color: "#a78bfa", bg: "#2e1065" },
  province: { label: "Province", color: "#a78bfa", bg: "#1e3a5f" },
};

// Liste des statuts pour les sélecteurs
export const STATUTS_LIST: Array<{ value: string; label: string }> = Object.entries(STATUTS).map(
  ([value, { label }]) => ({ value, label }),
);

// ==================== STATUTS DES VENTES (Commerce) ====================
export const STATUTS_VENTE: Record<string, StatutVenteEntry> = {
  en_attente: { label: "En attente", color: "#f59e0b", bg: "#451a03" },
  paye: { label: "Payé", color: "#34d399", bg: "#14532d" },
  credit: { label: "Crédit", color: "#a78bfa", bg: "#1e3a5f" },
  annule: { label: "Annulé", color: "#f87171", bg: "#450a0a" },
};

// ==================== STATUTS DES ACHATS (Commerce) ====================
export const STATUTS_ACHAT: Record<string, StatutVenteEntry> = {
  en_attente: { label: "En attente", color: "#f59e0b", bg: "#451a03" },
  recu: { label: "Reçu", color: "#34d399", bg: "#14532d" },
  paye: { label: "Payé", color: "#a78bfa", bg: "#1e3a5f" },
  annule: { label: "Annulé", color: "#f87171", bg: "#450a0a" },
};

// ==================== MODES DE PAIEMENT ====================
export const PAIE_MODES: Record<string, PaieModeEntry> = {
  espece: { label: "Espèces", icon: "💵" },
  mobile_money: { label: "Mobile Money", icon: "📱" },
  client: { label: "Payé au client", icon: "🤝" },
};

export const PAIE_MODES_LIST: Array<{ value: string; label: string; icon: string }> =
  Object.entries(PAIE_MODES).map(([value, { label, icon }]) => ({ value, label, icon }));

// ==================== TYPES DE MOUVEMENTS STOCK ====================
export const TYPES_MOUVEMENT_STOCK: Record<string, MouvementStockEntry> = {
  entree: { label: "Entrée", icon: "📥", color: "#10b981" },
  sortie: { label: "Sortie", icon: "📤", color: "#ef4444" },
  vente: { label: "Vente", icon: "💰", color: "#c9a9f6" },
  achat: { label: "Achat", icon: "🛒", color: "#8b5cf6" },
  inventaire: { label: "Inventaire", icon: "📋", color: "#f59e0b" },
  ajustement: { label: "Ajustement", icon: "⚙️", color: "#6b7280" },
};

// ==================== COULEURS (Thème clair/sombre avec variables CSS) ====================
export const COLORS: Record<string, string> = {
  bg: "var(--bg)",
  card: "var(--card)",
  border: "var(--border)",
  border2: "var(--border2)",
  text: "var(--text)",
  muted: "var(--muted)",
  subtle: "var(--subtle)",
  blue: "var(--blue)",
  green: "var(--green)",
  orange: "var(--orange)",
  yellow: "var(--yellow)",
  red: "var(--red)",
  purple: "var(--purple)",
  teal: "var(--teal)",
  pink: "var(--pink)",
};

// ==================== AUTHENTIFICATION ====================
export const LOGIN_EMAIL = "admin@aterinay.com";
export const LOGIN_PASSWORD = "2462";
export const COMMISSION_DEFAUT = 500;

// ==================== COMMISSION GÉRANT ====================
// Clients exclus de la commission (le gérant ne gagne rien pour ces clients)
export const EXCLUDED_CLIENTS: string[] = ["POMANAY", "ZAZATIANA"];

// Fonction pour déterminer si le gérant doit recevoir une commission
// Le gérant gagne sa commission si :
// 1. Les frais sont payés (frais > 0)
// 2. Le client donneur n'est pas dans la liste des exclus
export const shouldCountGerantCommission = (livraison: Livraison): boolean => {
  // Vérifier si les frais sont payés
  const hasFrais = parseFloat(String(livraison.frais || 0)) > 0;

  if (!hasFrais) {
    return false;
  }

  // Vérifier si le client donneur est exclu
  const clientDonneur = livraison.client_donneur?.toUpperCase() || "";
  const isExcluded = EXCLUDED_CLIENTS.includes(clientDonneur);

  // Si le client est exclus, pas de commission
  if (isExcluded) {
    return false;
  }

  // Sinon, commission accordée
  return true;
};

// ==================== CLIENTS EXCLUS POUR AFFICHAGE ====================
export const getExcludedClientsText = (): string => {
  return EXCLUDED_CLIENTS.join(", ");
};

// ==================== CONFIGURATION PAR SOCIÉTÉ ====================
// Configurations par défaut pour chaque type de société
export const COMPANY_CONFIG: Record<string, CompanyModuleConfig> = {
  service: {
    name: "Service de livraison",
    icon: "🚚",
    primaryColor: "#c9a9f6",
    modules: ["livraisons", "agents", "avances", "recuperations", "gerant", "historique"],
  },
  pomanay: {
    name: "Boutique accessoires",
    icon: "📱",
    primaryColor: "#10b981",
    modules: ["ventes", "achats", "stock", "inventaire", "depenses", "rapports"],
  },
  zazatiana: {
    name: "Boutique bébé",
    icon: "👶",
    primaryColor: "#ec4899",
    modules: ["ventes", "achats", "stock", "inventaire", "rapports"],
  },
};

// Obtenir la configuration d'une société
export const getCompanyConfig = (slug: string): CompanyModuleConfig => {
  if (slug === "pomanay") return COMPANY_CONFIG.pomanay;
  if (slug === "zazatiana") return COMPANY_CONFIG.zazatiana;
  return COMPANY_CONFIG.service;
};

// ==================== CATÉGORIES DE PRODUITS (Commerce) ====================
export const CATEGORIES_PRODUITS: string[] = [
  "Téléphones",
  "Accessoires téléphones",
  "Vêtements bébé",
  "Jouets bébé",
  "Puériculture",
  "Alimentation bébé",
  "Autres",
];

// ==================== UNITÉS DE MESURE ====================
export const UNITES: Array<{ value: string; label: string }> = [
  { value: "pièce", label: "Pièce(s)" },
  { value: "kg", label: "Kilogramme(s)" },
  { value: "g", label: "Gramme(s)" },
  { value: "l", label: "Litre(s)" },
  { value: "ml", label: "Millilitre(s)" },
  { value: "m", label: "Mètre(s)" },
  { value: "cm", label: "Centimètre(s)" },
];

// ==================== CATÉGORIES DE DÉPENSES ====================
export const CATEGORIES_DEPENSES: string[] = [
  "Électricité",
  "Eau",
  "Transport",
  "Fournitures",
  "Communication",
  "Loyer",
  "Marketing",
  "Salaires",
  "Entretien",
  "Impressions",
  "Autres",
];
