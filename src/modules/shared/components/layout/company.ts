// components/layout/company.ts
import type { Company } from "@/modules/shared/context/CompanyContext";

export interface CompanyMeta {
  label: string;
  /** Classe Tailwind pour la couleur de texte */
  tailwindColor: string;
  /** Classe Tailwind pour le fond */
  tailwindBg: string;
  /** Classe Tailwind pour le fond au hover */
  tailwindBgHover: string;
  /** Initiales affichées dans l'avatar */
  icon: string;
  /** Classe Tailwind pour le gradient ou fond de l'avatar */
  tailwindAvatarBg: string;
}

/**
 * Retourne les métadonnées visuelles d'une société.
 * Toutes les valeurs sont des classes Tailwind utilitaires.
 */
export function getCompanyMeta(c: Company | null): CompanyMeta {
  if (!c) {
    return {
      label: "Gestion",
      tailwindColor: "text-amber-400",
      tailwindBg: "bg-amber-400/5",
      tailwindBgHover: "hover:bg-amber-400/10",
      icon: "HT",
      tailwindAvatarBg: "bg-gradient-to-br from-amber-400 to-amber-600",
    };
  }

  if (c.slug === "pomanay") {
    return {
      label: "Boutique",
      tailwindColor: "text-violet-400",
      tailwindBg: "bg-violet-400/5",
      tailwindBgHover: "hover:bg-violet-400/10",
      icon: "PM",
      tailwindAvatarBg: "bg-gradient-to-br from-violet-400 to-violet-600",
    };
  }

  if (c.slug === "zazatiana") {
    return {
      label: "Bébé",
      tailwindColor: "text-pink-400",
      tailwindBg: "bg-pink-400/5",
      tailwindBgHover: "hover:bg-pink-400/10",
      icon: "ZT",
      tailwindAvatarBg: "bg-gradient-to-br from-pink-400 to-pink-600",
    };
  }

  // Par défaut : Aterinay Service
  return {
    label: "Service",
    tailwindColor: "text-amber-400",
    tailwindBg: "bg-amber-400/5",
    tailwindBgHover: "hover:bg-amber-400/10",
    icon: "AT",
    tailwindAvatarBg: "bg-gradient-to-br from-amber-400 to-amber-600",
  };
}

export function getLogoSrc(c: Company | null): string {
  if (!c) return "/logos/aterinay/logo.png";
  if (c.slug === "pomanay") return "/logos/pomanay/logo.png";
  if (c.slug === "zazatiana") return "/logos/zazatiana/logo.png";
  return "/logos/aterinay/logo.png";
}
