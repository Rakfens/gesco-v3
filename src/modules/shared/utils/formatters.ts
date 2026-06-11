// formatters.ts — Utilitaires de formatage complémentaires
// Note: formatAr, formatDate, formatDateTime, formatNumber sont dans constants.ts

export const formatDateShort = (date: string | number | Date) =>
  new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const formatCurrency = (amount: number, currency = "MGA") =>
  new Intl.NumberFormat("fr-MG", { style: "currency", currency }).format(amount);

export const truncate = (str: string, len = 50) =>
  str.length > len ? `${str.slice(0, len)}…` : str;
