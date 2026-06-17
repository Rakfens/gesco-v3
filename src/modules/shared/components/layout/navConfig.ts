// components/layout/navConfig.ts
export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
}

export const NAV_CONFIG = {
  service: [
    { key: "dashboard", label: "Tableau de bord", href: "/livraison/dashboard", icon: "grid" },
    { key: "livraison", label: "Livraison", href: "/livraison/livraisons", icon: "truck" },
    { key: "historique", label: "Historique", href: "/livraison/historique", icon: "clock" },
    { key: "gerant", label: "Gérant", href: "/livraison/gerant", icon: "user" },
    { key: "recap", label: "Récap", href: "/livraison/recap", icon: "chart" },
    { key: "agents", label: "Agents", href: "/livraison/agents", icon: "users" },
    { key: "recuperation", label: "Récupération", href: "/livraison/recuperation", icon: "refresh" },
  ] as NavItem[],
  commerce: [
    { key: "dashboard", label: "Tableau de bord", href: "/commerce/dashboard", icon: "grid" },
    { key: "ventes", label: "Ventes", href: "/commerce/ventes", icon: "cash" },
    { key: "achats", label: "Achats", href: "/commerce/achats", icon: "cart" },
    { key: "stock", label: "Stock", href: "/commerce/stock", icon: "box" },
    { key: "packs", label: "Packs", href: "/commerce/packs", icon: "package" },
    { key: "inventaire", label: "Inventaire", href: "/commerce/inventaire", icon: "list" },
    { key: "depenses", label: "Dépenses", href: "/commerce/depenses", icon: "wallet" },
    { key: "rapports", label: "Rapports", href: "/commerce/rapports", icon: "document" },
  ] as NavItem[],
};
