"use client";

import { useCompany } from "../../context/CompanyContext";

interface NavItem {
  key: string;
  icon: string;
  label: string;
}

const serviceNavItems: NavItem[] = [
  { key: "dashboard", icon: "📊", label: "Accueil" },
{ key: "livraison", icon: "📦", label: "Livraison" },
{ key: "historique", icon: "📋", label: "Historique" },
{ key: "gerant", icon: "🧑‍💼", label: "Gérant" },
{ key: "recap", icon: "📈", label: "Récap" },
{ key: "agents", icon: "👥", label: "Agents" },
{ key: "recuperation", icon: "📦", label: "Récupération" },
];

const pomanayNavItems: NavItem[] = [
  { key: "dashboard", icon: "📊", label: "Accueil" },
{ key: "ventes", icon: "💰", label: "Ventes" },
{ key: "achats", icon: "📥", label: "Achats" },
{ key: "stock", icon: "📦", label: "Stock" },
{ key: "packs", icon: "🎁", label: "Packs" },
{ key: "inventaire", icon: "📋", label: "Inventaire" },
{ key: "depenses", icon: "💸", label: "Dépenses" },
{ key: "rapports", icon: "📈", label: "Rapports" },
];

const zazatianaNavItems: NavItem[] = [
  { key: "dashboard", icon: "📊", label: "Accueil" },
{ key: "ventes", icon: "💰", label: "Ventes" },
{ key: "achats", icon: "📥", label: "Achats" },
{ key: "stock", icon: "📦", label: "Stock" },
{ key: "packs", icon: "🎁", label: "Packs" },
{ key: "inventaire", icon: "📋", label: "Inventaire" },
{ key: "depenses", icon: "💸", label: "Dépenses" },
{ key: "rapports", icon: "📈", label: "Rapports" },
];

interface SidebarProps {
  page: string;
  onNavigate: (key: string) => void;
  enCours: number;
}

export function Sidebar({ page, onNavigate, enCours }: SidebarProps) {
  const { currentCompany } = useCompany();

  const getNavItems = (): NavItem[] => {
    if (!currentCompany) return [];
    if (currentCompany.type === "service") return serviceNavItems;
    if (currentCompany.slug === "pomanay") return pomanayNavItems;
    if (currentCompany.slug === "zazatiana") return zazatianaNavItems;
    return [];
  };

  const navItems = getNavItems();
  if (!currentCompany || navItems.length === 0) return null;

  const companyLabel =
  currentCompany.type === "service"
  ? "🚚 LIVRAISON"
  : currentCompany.slug === "pomanay"
  ? "📱 BOUTIQUE"
  : "👶 BOUTIQUE";

  return (
    <aside className="sticky top-16 flex h-[calc(100vh-64px)] w-[270px] shrink-0 flex-col overflow-y-auto border-r border-white/[0.06] bg-[#121218]">
    {/* En-tête */}
    <div className="mb-2 border-b border-white/[0.06] px-4 py-3.5">
    <div className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7b]">
    {companyLabel}
    </div>
    <div className="mt-1 text-sm font-bold text-[#f1f5f9]">
    {currentCompany.name}
    </div>
    </div>

    {/* Navigation */}
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
    {navItems.map((item) => {
      const active = page === item.key;
      return (
        <button
        key={item.key}
        type="button"
        onClick={() => onNavigate(item.key)}
        className={`
          flex items-center gap-3 rounded-[10px] border-none px-3.5 py-2.5 text-left text-[13px] transition-all duration-150
          ${active
            ? "bg-[#c9a96e]/10 font-semibold text-[#c9a96e]"
            : "bg-transparent font-normal text-[#a0a0b0] hover:bg-[#141418] hover:text-[#e8e8ec]"
          }
          `}
          >
          <span className="w-6 text-center text-base">{item.icon}</span>
          <span>{item.label}</span>
          {item.key === "historique" && enCours > 0 && (
            <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-black">
            {enCours}
            </span>
          )}
          </button>
      );
    })}
    </nav>

    {/* Footer */}
    <div className="border-t border-white/[0.06] px-4 py-3 text-[10px] text-[#6b6b7b]">
    🔒 Données sécurisées
    </div>
    </aside>
  );
}

export default Sidebar;
