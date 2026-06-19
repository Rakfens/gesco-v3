// modules/shared/utils/constants.ts
import type { Livraison } from "../types";

// ==================== TYPES ====================
export interface StatutEntry {
  label: string;
  color: string;
  bg: string;
  tailwindColor: string;
  tailwindBg: string;
  tailwindBorder: string;
  icon?: string;
}

export interface StatutVenteEntry {
  label: string;
  color: string;
  bg: string;
  tailwindColor: string;
  tailwindBg: string;
}

export interface PaieModeEntry {
  label: string;
  icon: string;
}

export interface MouvementStockEntry {
  label: string;
  icon: string;
  color: string;
  tailwindColor: string;
}

export interface CompanyModuleConfig {
  name: string;
  icon: string;
  primaryColor: string;
  tailwindColor: string;
  modules: string[];
}

// ==================== FONCTIONS DATE ====================
export const TODAY = (): string => new Date().toISOString().split("T")[0];
export const CURRENT_MONTH = TODAY().slice(0, 7);
export const currentMonth = (): string => TODAY().slice(0, 7);

export const monthLabel = (m: string | undefined | null): string => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  const mois = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
    "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
  ];
  const monthIndex = parseInt(mo, 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return m;
  return `${mois[monthIndex]} ${y}`;
};

// ==================== FORMATAGE ====================
export const formatAr = (n: number | string | null | undefined): string => {
  if (n === null || n === undefined) return "0 Ar";
  const val = typeof n === "number" ? n : parseFloat(n) || 0;
  return `${val.toLocaleString("fr-MG", { maximumFractionDigits: 0 })} Ar`;
};

export const formatNumber = (n: number | string | null | undefined): string => {
  if (n === null || n === undefined) return "0";
  return (typeof n === "number" ? n : parseFloat(n) || 0).toLocaleString();
};

export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("fr-FR");
};

export const formatDateTime = (dateStr: string | undefined | null): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return `${date.toLocaleDateString("fr-FR")} ${date.toLocaleTimeString("fr-FR")}`;
};

// ==================== STATUTS DES LIVRAISONS ====================
export const STATUTS: Record<string, StatutEntry> = {
  en_cours: {
    label: "En cours",
    color: "var(--warning)",
    bg: "rgba(251,191,36,0.15)",
    tailwindColor: "text-amber-400",
    tailwindBg: "bg-amber-400/15",
    tailwindBorder: "border-amber-400",
    icon: "clock",
  },
  livre: {
    label: "Livré",
    color: "var(--success)",
    bg: "rgba(52,211,153,0.15)",
    tailwindColor: "text-emerald-400",
    tailwindBg: "bg-emerald-400/15",
    tailwindBorder: "border-emerald-400",
    icon: "check",
  },
  retourne: {
    label: "Retourné",
    color: "var(--danger)",
    bg: "rgba(248,113,113,0.15)",
    tailwindColor: "text-red-400",
    tailwindBg: "bg-red-400/15",
    tailwindBorder: "border-red-400",
    icon: "rotate-left",
  },
  reporte: {
    label: "Reporté",
    color: "var(--violet)",
    bg: "rgba(167,139,250,0.15)",
    tailwindColor: "text-violet-400",
    tailwindBg: "bg-violet-400/15",
    tailwindBorder: "border-violet-400",
    icon: "calendar-xmark",
  },
};

export const STATUTS_LIST: Array<{ value: string; label: string }> = Object.entries(STATUTS).map(
  ([value, { label }]) => ({ value, label }),
);

// ==================== STATUTS DES VENTES ====================
export const STATUTS_VENTE: Record<string, StatutVenteEntry> = {
  en_attente: {
    label: "En attente",
    color: "var(--warning)",
    bg: "rgba(251,191,36,0.1)",
    tailwindColor: "text-amber-500",
    tailwindBg: "bg-amber-950",
  },
  paye: {
    label: "Payé",
    color: "var(--success)",
    bg: "rgba(52,211,153,0.1)",
    tailwindColor: "text-emerald-400",
    tailwindBg: "bg-emerald-900",
  },
  credit: {
    label: "Crédit",
    color: "var(--violet)",
    bg: "rgba(139,92,246,0.1)",
    tailwindColor: "text-violet-400",
    tailwindBg: "bg-blue-950",
  },
  annule: {
    label: "Annulé",
    color: "var(--danger)",
    bg: "rgba(248,113,113,0.1)",
    tailwindColor: "text-red-400",
    tailwindBg: "bg-red-950",
  },
};

// ==================== STATUTS DES ACHATS ====================
export const STATUTS_ACHAT: Record<string, StatutVenteEntry> = {
  en_attente: {
    label: "En attente",
    color: "var(--warning)",
    bg: "rgba(251,191,36,0.1)",
    tailwindColor: "text-amber-500",
    tailwindBg: "bg-amber-950",
  },
  recu: {
    label: "Reçu",
    color: "var(--success)",
    bg: "rgba(52,211,153,0.1)",
    tailwindColor: "text-emerald-400",
    tailwindBg: "bg-emerald-900",
  },
  paye: {
    label: "Payé",
    color: "var(--violet)",
    bg: "rgba(139,92,246,0.1)",
    tailwindColor: "text-violet-400",
    tailwindBg: "bg-blue-950",
  },
  annule: {
    label: "Annulé",
    color: "var(--danger)",
    bg: "rgba(248,113,113,0.1)",
    tailwindColor: "text-red-400",
    tailwindBg: "bg-red-950",
  },
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
  entree: { label: "Entrée", icon: "📥", color: "#10b981", tailwindColor: "text-emerald-500" },
  sortie: { label: "Sortie", icon: "📤", color: "#ef4444", tailwindColor: "text-red-500" },
  vente: { label: "Vente", icon: "💰", color: "#c9a9f6", tailwindColor: "text-violet-300" },
  achat: { label: "Achat", icon: "🛒", color: "#8b5cf6", tailwindColor: "text-violet-500" },
  inventaire: { label: "Inventaire", icon: "📋", color: "#f59e0b", tailwindColor: "text-amber-500" },
  ajustement: { label: "Ajustement", icon: "⚙️", color: "#6b7280", tailwindColor: "text-gray-500" },
};

// ==================== COULEURS (alias CSS vars) ====================
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
export const EXCLUDED_CLIENTS: string[] = ["POMANAY", "ZAZATIANA"];

export const shouldCountGerantCommission = (livraison: Livraison): boolean => {
  const hasFrais = parseFloat(String(livraison.frais || 0)) > 0;
  if (!hasFrais) return false;
  const clientDonneur = livraison.client_donneur?.toUpperCase() || "";
  return !EXCLUDED_CLIENTS.includes(clientDonneur);
};

export const getExcludedClientsText = (): string => EXCLUDED_CLIENTS.join(", ");

// ==================== CONFIGURATION PAR SOCIÉTÉ ====================
export const COMPANY_CONFIG: Record<string, CompanyModuleConfig> = {
  service: {
    name: "Service de livraison",
    icon: "🚚",
    primaryColor: "#c9a9f6",
    tailwindColor: "text-violet-300",
    modules: ["livraisons", "agents", "avances", "recuperations", "gerant", "historique"],
  },
  pomanay: {
    name: "Boutique accessoires",
    icon: "📱",
    primaryColor: "#10b981",
    tailwindColor: "text-emerald-500",
    modules: ["ventes", "achats", "stock", "inventaire", "depenses", "rapports"],
  },
  zazatiana: {
    name: "Boutique bébé",
    icon: "👶",
    primaryColor: "#ec4899",
    tailwindColor: "text-pink-500",
    modules: ["ventes", "achats", "stock", "inventaire", "rapports"],
  },
};

export const getCompanyConfig = (slug: string): CompanyModuleConfig => {
  if (slug === "pomanay") return COMPANY_CONFIG.pomanay;
  if (slug === "zazatiana") return COMPANY_CONFIG.zazatiana;
  return COMPANY_CONFIG.service;
};

// ==================== CATÉGORIES ====================
export const CATEGORIES_PRODUITS: string[] = [
  "Téléphones", "Accessoires téléphones", "Vêtements bébé", "Jouets bébé",
"Puériculture", "Alimentation bébé", "Autres",
];

export const UNITES: Array<{ value: string; label: string }> = [
  { value: "pièce", label: "Pièce(s)" },
  { value: "kg", label: "Kilogramme(s)" },
  { value: "g", label: "Gramme(s)" },
  { value: "l", label: "Litre(s)" },
  { value: "ml", label: "Millilitre(s)" },
  { value: "m", label: "Mètre(s)" },
  { value: "cm", label: "Centimètre(s)" },
];

export const CATEGORIES_DEPENSES: string[] = [
  "Loyer", "Carburant", "Gouter", "Credit", "Credit",
"Entretien Voitures", "Credit Livreur", "Salaire Livreur",
"Mpanotra", "Parking", "Autres",
];
